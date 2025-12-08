/**
 * PyMO Web - 图形系统
 * 管理背景、立绘、特效等图形渲染
 */

class GraphicsSystem {
    constructor(engine) {
        this.engine = engine;
        
        // 画布引用（稍后初始化）
        this.canvas = null;
        this.ctx = null;
        this.screenSize = [320, 240];
        this.bgSize = [320, 240];
        
        // 图层
        this.finalImg = null;      // 最终渲染图像
        this.bgImg = null;         // 背景图像
        this.charaImg = null;      // 立绘合成图像
        this.oldImg = null;        // 用于特效的旧图像
        this.tempImg = null;       // 临时图像
        
        // 当前背景
        this.currentBg = null;
        this.bgOrigin = [0, 0];
        
        // 立绘管理
        this.characters = {};      // { id: { img, mask, origin, visible, layer, ... } }
        this.charaOn = false;
        
        // 对话框
        this.messageBox = null;
        this.messageBoxMask = null;
        this.nameBox = null;
        this.nameBoxMask = null;
        this.messageCursor = null;
        this.messageCursorMask = null;
        
        // 状态
        this.inFadeOut = false;
        this.fadeOutColor = [0, 0, 0];
        
        // 文本显示
        this.textLayers = [];      // 通过 #text 显示的文字
    }

    /**
     * 初始化图形系统
     */
    async init(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        
        const config = this.engine.config;
        this.screenSize = [canvasElement.width, canvasElement.height];
        this.bgSize = config.get('imagesize') || [320, 240];
        
        // 初始化图层
        this.finalImg = new PyMOImage(this.screenSize[0], this.screenSize[1]);
        this.bgImg = new PyMOImage(this.screenSize[0], this.screenSize[1]);
        this.charaImg = new PyMOImage(this.screenSize[0], this.screenSize[1]);
        this.oldImg = new PyMOImage(this.screenSize[0], this.screenSize[1]);
        this.tempImg = new PyMOImage(this.screenSize[0], this.screenSize[1]);
        
        // 加载系统图片
        await this.loadSystemImages();
    }

    /**
     * 加载系统图片
     */
    async loadSystemImages() {
        const config = this.engine.config;
        const fontSize = config.get('fontsize');
        
        // 对话框
        this.messageBox = await this.loadImage('system/message.png', this.screenSize[0]);
        this.messageBoxMask = await this.loadImage('system/message_mask.png', this.screenSize[0]);
        
        // 名字框
        this.nameBox = await this.loadImage('system/name.png', null, fontSize + 12);
        this.nameBoxMask = await this.loadImage('system/name_mask.png', null, fontSize + 12);
        
        // 光标
        this.messageCursor = await this.loadImage('system/message_cursor.png', null, fontSize);
        this.messageCursorMask = await this.loadImage('system/message_cursor_mask.png', null, fontSize);
    }

    /**
     * 加载图像
     * @param {string} path - 图像路径
     * @param {number} width - 目标宽度（可选）
     * @param {number} height - 目标高度（可选）
     */
    async loadImage(path, width = null, height = null) {
        try {
            let data = this.engine.gameData.Zip[path]?.compressed_data;
            if (!data) {
                data = this.engine.gameData.Zip[path.toUpperCase()]?.compressed_data;
            }
            if (!data) {
                console.warn(`Image not found: ${path}`);
                return null;
            }
            
            const img = new PyMOImage(1, 1);
            await img.load(data);
            
            // 调整大小
            if (width !== null || height !== null) {
                let newWidth = width;
                let newHeight = height;
                
                if (width && !height) {
                    newHeight = Math.floor(width * img.height / img.width);
                } else if (!width && height) {
                    newWidth = Math.floor(height * img.width / img.height);
                }
                
                if (newWidth && newHeight) {
                    img.resize(newWidth, newHeight);
                }
            }
            
            return img;
        } catch (e) {
            console.error(`Failed to load image: ${path}`, e);
            return null;
        }
    }

    /**
     * 从 PAK 文件加载资源
     */
    async loadFromPak(filename, pakType) {
        const pakInfo = this.engine.pakFiles[pakType];
        if (!pakInfo || !pakInfo.index[filename.toUpperCase()]) {
            return null;
        }
        
        const [offset, length] = pakInfo.index[filename.toUpperCase()];
        const data = pakInfo.reader.readAt(offset, length);
        
        const img = new PyMOImage(1, 1);
        await img.load(data);
        return img;
    }

    /**
     * 更新屏幕显示
     */
    updateScreen() {
        if (this.inFadeOut) return;
        
        this.ctx.drawImage(this.finalImg.canvas, 0, 0);
    }

    // ==================== 背景操作 ====================

    /**
     * 加载背景
     */
    async loadBackground(filename, percentOrig = [0, 0]) {
        const format = this.engine.config.get('bgformat');
        const fullPath = `bg/${filename}${format}`;
        
        // 尝试从 PAK 加载
        let bgImg = await this.loadFromPak(filename, 'bg');
        
        // 或直接加载
        if (!bgImg) {
            bgImg = await this.loadImage(fullPath);
        }
        
        if (!bgImg) {
            console.error(`Failed to load background: ${filename}`);
            return;
        }
        
        this.currentBg = bgImg;
        this.engine.save.bg = filename;
        this.engine.save.bgpercentorig = percentOrig;
        
        // 计算显示位置
        if (percentOrig[0] !== 0 || percentOrig[1] !== 0) {
            this.bgOrigin = [
                -Math.floor(percentOrig[0] * bgImg.width / 100),
                -Math.floor(percentOrig[1] * bgImg.height / 100)
            ];
        } else {
            this.bgOrigin = [
                Math.floor((this.screenSize[0] - bgImg.width) / 2),
                Math.floor((this.screenSize[1] - bgImg.height) / 2)
            ];
        }
    }

    /**
     * 显示背景
     */
    async showBackground(filename, transition = 'BG_ALPHA', speed = '300', x = 0, y = 0) {
        await this.loadBackground(filename, [x, y]);
        
        const length = this._parseSpeed(speed);
        
        // 渲染背景到临时图像
        const newImg = new PyMOImage(this.screenSize[0], this.screenSize[1]);
        newImg.clear([0, 0, 0]);
        if (this.currentBg) {
            newImg.blit(this.currentBg, this.bgOrigin);
        }
        
        // 应用过渡效果
        if (transition === 'BG_NOFADE' || this.inFadeOut) {
            this.finalImg.blit(newImg);
            if (!this.inFadeOut) this.updateScreen();
        } else if (transition === 'BG_ALPHA') {
            await this._alphaTransition(length, newImg);
        } else if (transition === 'BG_FADE') {
            await this._fadeTransition(length);
            this.finalImg.blit(newImg);
            if (!this.inFadeOut) this.updateScreen();
            await this._fadeInTransition(length);
        } else {
            // 自定义遮罩
            await this._alphaTransition(length, newImg);
        }
        
        // 更新背景图层
        this.bgImg.blit(this.finalImg);
        this.charaOn = false;
    }

    /**
     * 滚动背景
     */
    async scrollBackground(filename, startX, startY, endX, endY, time) {
        await this.loadBackground(filename, [0, 0]);
        
        if (!this.currentBg) return;
        
        const duration = time / 1000;
        const startPos = [
            Math.floor(startX * this.currentBg.width / 100),
            Math.floor(startY * this.currentBg.height / 100)
        ];
        const endPos = [
            Math.floor(endX * this.currentBg.width / 100),
            Math.floor(endY * this.currentBg.height / 100)
        ];
        
        const startTime = performance.now() / 1000;
        let currentTime = startTime;
        
        while (currentTime - startTime < duration) {
            const progress = (currentTime - startTime) / duration;
            const x = startPos[0] + (endPos[0] - startPos[0]) * progress;
            const y = startPos[1] + (endPos[1] - startPos[1]) * progress;
            
            this.finalImg.clear([0, 0, 0]);
            this.finalImg.blit(this.currentBg, [-x, -y]);
            this.updateScreen();
            
            await this.engine.sleep(16);
            currentTime = performance.now() / 1000;
        }
        
        // 最终位置
        this.finalImg.clear([0, 0, 0]);
        this.finalImg.blit(this.currentBg, [-endPos[0], -endPos[1]]);
        this.updateScreen();
        
        this.bgImg.blit(this.finalImg);
        this.engine.save.bgpercentorig = [endX, endY];
    }

    // ==================== 立绘操作 ====================

    /**
     * 加载立绘
     */
    async loadCharacter(charaId, filename) {
        const format = this.engine.config.get('charaformat');
        const maskFormat = this.engine.config.get('charamaskformat');
        
        // 加载立绘图像
        let charaImg = await this.loadFromPak(filename, 'chara');
        if (!charaImg) {
            charaImg = await this.loadImage(`chara/${filename}${format}`);
        }
        
        // 加载遮罩
        let charaMask = await this.loadFromPak(`${filename}_mask`, 'chara');
        if (!charaMask) {
            charaMask = await this.loadImage(`chara/${filename}_mask${maskFormat}`);
        }
        
        if (!charaImg) {
            console.error(`Failed to load character: ${filename}`);
            return null;
        }
        
        return { img: charaImg, mask: charaMask };
    }

    /**
     * 显示立绘
     */
    async showCharacter(charaId, filename, position, layer = 0) {
        const loaded = await this.loadCharacter(charaId, filename);
        if (!loaded) return;
        
        const { img, mask } = loaded;
        
        // 计算位置（position 是中心点的 X 百分比）
        const centerX = Math.floor(position * this.bgSize[0] / 100);
        const origin = this._bgToScreen([
            centerX - img.width / 2,
            this.bgSize[1] - img.height
        ]);
        
        this.characters[charaId] = {
            img,
            mask,
            filename,
            origin,
            centerX,
            y: this.bgSize[1] - img.height,
            layer,
            visible: true
        };
        
        // 更新存档数据
        if (!this.engine.save.chara) this.engine.save.chara = {};
        this.engine.save.chara[charaId] = {
            filename,
            chara_center: centerX,
            chara_y: this.bgSize[1] - img.height,
            chara_visible: true,
            layer
        };
    }

    /**
     * 使用 Y 坐标显示立绘
     */
    async showCharacterY(charaId, filename, x, y, layer, mode = 5) {
        const loaded = await this.loadCharacter(charaId, filename);
        if (!loaded) return;
        
        const { img, mask } = loaded;
        const pos = this._calculateCharaPosition(img, x, y, mode);
        
        this.characters[charaId] = {
            img,
            mask,
            filename,
            origin: pos.origin,
            centerX: pos.centerX,
            y: pos.y,
            layer,
            visible: true
        };
        
        if (!this.engine.save.chara) this.engine.save.chara = {};
        this.engine.save.chara[charaId] = {
            filename,
            chara_center: pos.centerX,
            chara_y: pos.y,
            chara_visible: true,
            layer
        };
    }

    /**
     * 计算立绘位置
     * @private
     */
    _calculateCharaPosition(img, x, y, mode) {
        const screenX = x * this.screenSize[0] / 100;
        const screenY = y * this.screenSize[1] / 100;
        const imgW = img.width;
        const imgH = img.height;
        
        let originX, originY, centerX, charaY;
        
        switch (mode) {
            case 0: // 左上
                originX = screenX;
                originY = screenY;
                centerX = screenX + imgW / 2;
                charaY = screenY;
                break;
            case 1: // 上中
                originX = screenX - imgW / 2;
                originY = screenY;
                centerX = screenX;
                charaY = screenY;
                break;
            case 2: // 右上
                originX = this.screenSize[0] - screenX - imgW;
                originY = screenY;
                centerX = this.screenSize[0] - screenX - imgW / 2;
                charaY = screenY;
                break;
            case 3: // 中中
                originX = screenX - imgW / 2;
                originY = screenY - imgH / 2;
                centerX = screenX;
                charaY = screenY - imgH / 2;
                break;
            case 4: // 左下
                originX = screenX;
                originY = this.screenSize[1] - screenY - imgH;
                centerX = screenX + imgW / 2;
                charaY = this.bgSize[1] - imgH - screenY;
                break;
            case 5: // 下中（默认）
                originX = screenX - imgW / 2;
                originY = this.screenSize[1] - screenY - imgH;
                centerX = screenX;
                charaY = this.bgSize[1] - imgH - screenY;
                break;
            case 6: // 右下
                originX = this.screenSize[0] - screenX - imgW;
                originY = this.screenSize[1] - screenY - imgH;
                centerX = this.screenSize[0] - screenX - imgW / 2;
                charaY = this.bgSize[1] - imgH - screenY;
                break;
            default:
                originX = screenX - imgW / 2;
                originY = this.screenSize[1] - imgH;
                centerX = screenX;
                charaY = this.bgSize[1] - imgH;
        }
        
        return {
            origin: [originX, originY],
            centerX,
            y: charaY
        };
    }

    /**
     * 隐藏立绘
     */
    hideCharacter(charaId) {
        if (this.characters[charaId]) {
            this.characters[charaId].visible = false;
        }
        if (this.engine.save.chara && this.engine.save.chara[charaId]) {
            this.engine.save.chara[charaId].chara_visible = false;
        }
    }

    /**
     * 清除所有立绘
     */
    clearAllCharacters() {
        for (const id in this.characters) {
            this.characters[id].visible = false;
        }
        this.characters = {};
        this.engine.save.chara = {};
        this.charaOn = false;
    }

    /**
     * 设置立绘位置
     */
    setCharacterPosition(charaId, x, y, mode = 5) {
        const chara = this.characters[charaId];
        if (!chara) return;
        
        const pos = this._calculateCharaPosition(chara.img, x, y, mode);
        chara.origin = pos.origin;
        chara.centerX = pos.centerX;
        chara.y = pos.y;
        
        if (this.engine.save.chara && this.engine.save.chara[charaId]) {
            this.engine.save.chara[charaId].chara_center = pos.centerX;
            this.engine.save.chara[charaId].chara_y = pos.y;
        }
    }

    /**
     * 显示立绘（应用过渡效果）
     */
    async displayCharacters(time = 300) {
        // 保存旧图像
        this.oldImg.blit(this.finalImg);
        
        // 绘制背景
        this._drawBackground();
        
        // 按图层顺序绘制立绘
        const sortedIds = Object.keys(this.characters)
            .filter(id => this.characters[id].visible)
            .sort((a, b) => (this.characters[a].layer || 0) - (this.characters[b].layer || 0));
        
        for (const id of sortedIds) {
            const chara = this.characters[id];
            if (chara.mask) {
                this.finalImg.blit(chara.img, chara.origin, [0, 0], chara.mask);
            } else {
                this.finalImg.blit(chara.img, chara.origin);
            }
            this.charaOn = true;
        }
        
        // 保存立绘图层
        this.charaImg.blit(this.finalImg);
        
        // 应用过渡
        if (!this.inFadeOut && time > 0) {
            const newImg = this.finalImg.clone();
            this.finalImg.blit(this.oldImg);
            await this._alphaTransition(time, newImg);
        } else {
            this.updateScreen();
        }
    }

    /**
     * 立绘滚动
     */
    async scrollCharacter(charaId, filename, startX, startY, endX, endY, beginAlpha, layer, mode, time) {
        await this.showCharacterY(charaId, filename, startX, startY, layer, mode);
        
        const chara = this.characters[charaId];
        if (!chara) return;
        
        const duration = time / 1000;
        const startPos = [...chara.origin];
        const endPos = this._calculateCharaPosition(chara.img, endX, endY, mode).origin;
        
        const startTime = performance.now() / 1000;
        let currentTime = startTime;
        
        while (currentTime - startTime < duration) {
            const progress = (currentTime - startTime) / duration;
            chara.origin = [
                startPos[0] + (endPos[0] - startPos[0]) * progress,
                startPos[1] + (endPos[1] - startPos[1]) * progress
            ];
            
            await this.displayCharacters(0);
            await this.engine.sleep(16);
            currentTime = performance.now() / 1000;
        }
        
        chara.origin = endPos;
        await this.displayCharacters(0);
    }

    /**
     * 立绘震动
     */
    async shakeCharacters(charaIds, offsets, cycle = 100) {
        const delay = cycle / 1000;
        const originalOrigins = {};
        
        for (const id of charaIds) {
            if (this.characters[id]) {
                originalOrigins[id] = [...this.characters[id].origin];
            }
        }
        
        for (const offset of offsets) {
            const realOffset = [
                Math.floor(offset[0] * this.screenSize[0] / 540),
                Math.floor(offset[1] * this.screenSize[1] / 360)
            ];
            
            for (const id of charaIds) {
                if (this.characters[id] && originalOrigins[id]) {
                    this.characters[id].origin = [
                        originalOrigins[id][0] + realOffset[0],
                        originalOrigins[id][1] + realOffset[1]
                    ];
                }
            }
            
            await this.displayCharacters(0);
            await this.engine.sleep(delay * 1000);
        }
        
        // 恢复原位置
        for (const id of charaIds) {
            if (this.characters[id] && originalOrigins[id]) {
                this.characters[id].origin = originalOrigins[id];
            }
        }
        await this.displayCharacters(0);
    }

    // ==================== 特效 ====================

    /**
     * 闪光
     */
    async flash(colorStr, time) {
        if (this.inFadeOut) return;
        
        const color = ConfigManager.parseColor(colorStr);
        
        this.tempImg.blit(this.finalImg);
        this.finalImg.clear(color);
        this.updateScreen();
        
        if (time > 0) {
            await this.engine.sleep(time);
        }
        
        this.finalImg.blit(this.tempImg);
        this.updateScreen();
    }

    /**
     * 画面震动
     */
    async quake() {
        if (this.inFadeOut) return;
        
        const offsets = [[-1,-2],[4,3],[6,-4],[5,3],[2,-1],[0,0]];
        const delay = 60;
        
        this.oldImg.blit(this.finalImg);
        
        for (const offset of offsets) {
            this.tempImg.clear([0, 0, 0]);
            this.tempImg.blit(this.oldImg, offset);
            this.finalImg.blit(this.tempImg);
            this.updateScreen();
            await this.engine.sleep(delay);
        }
    }

    /**
     * 淡出
     */
    async fadeOut(colorStr, time) {
        const color = ConfigManager.parseColor(colorStr);
        this.fadeOutColor = color;
        
        this.tempImg.clear(color);
        this.oldImg.blit(this.finalImg);
        
        await this._alphaTransition(time, this.tempImg);
        this.inFadeOut = true;
    }

    /**
     * 淡入
     */
    async fadeIn(time) {
        this.inFadeOut = false;
        this.tempImg.clear(this.fadeOutColor);
        this.finalImg.blit(this.tempImg);
        
        await this._alphaTransition(time, this.oldImg);
    }

    // ==================== 对话框 ====================

    /**
     * 显示消息
     */
    async showMessage(content, name = null) {
        const config = this.engine.config;
        const fontSize = config.get('fontsize');
        const textColor = config.get('textcolor');
        const msgtb = config.get('msgtb');
        const msglr = config.get('msglr');
        
        // 准备背景
        this._drawCharacters();
        
        // 绘制对话框
        if (this.messageBox) {
            const msgY = this.screenSize[1] - this.messageBox.height;
            this.finalImg.blit(this.messageBox, [0, msgY], [0, 0], this.messageBoxMask);
        }
        
        // 绘制名字框
        if (name) {
            const nameBoxOrig = config.get('nameboxorig');
            const nameY = this.screenSize[1] - (this.messageBox?.height || 0) - 
                         nameBoxOrig[1] - (this.nameBox?.height || 0);
            
            if (this.nameBox) {
                this.finalImg.blit(this.nameBox, [nameBoxOrig[0], nameY], [0, 0], this.nameBoxMask);
            }
            
            // 绘制名字文本
            const nameAlign = config.get('namealign');
            const nameWidth = this.ctx.measureText(name).width;
            let nameX = nameBoxOrig[0];
            
            if (nameAlign === 'middle') {
                nameX += ((this.nameBox?.width || 100) - nameWidth) / 2;
            } else if (nameAlign === 'right') {
                nameX += (this.nameBox?.width || 100) - nameWidth - fontSize / 2;
            } else {
                nameX += fontSize / 2;
            }
            
            this._drawText(name, nameX, nameY + fontSize + 4, textColor, fontSize);
        }
        
        this.updateScreen();
        
        // 保存到存档
        this.engine.save.name = name || '';
        this.engine.save.message = content;
        
        // 逐字显示文本
        const textTop = this.screenSize[1] - (this.messageBox?.height || 80) + msgtb[0];
        const textBottom = this.screenSize[1] - msgtb[1];
        const textLeft = msglr[0];
        const textRight = this.screenSize[0] - msglr[1];
        
        await this._drawTextOneByOne(content, textLeft, textTop, textRight, textBottom, textColor, fontSize, name);
        
        // 显示光标并等待
        await this._showCursor(textRight - fontSize, textBottom - fontSize);
    }

    /**
     * 逐字显示文本
     * @private
     */
    async _drawTextOneByOne(text, left, top, right, bottom, color, fontSize, name) {
        const config = this.engine.config;
        const speedConfig = [100, 70, 40, 20, 0, 0];
        const speed = speedConfig[config.get('textspeed')] || 0;
        
        let x = left;
        let y = top;
        let i = 0;
        
        while (i < text.length) {
            // 检查换行符
            if (i < text.length - 1 && text.substring(i, i + 2) === '\\n') {
                x = left;
                y += fontSize + 2;
                i += 2;
                continue;
            }
            
            const char = text[i];
            const charWidth = this.ctx.measureText(char).width || fontSize;
            
            // 自动换行
            if (x + charWidth > right) {
                x = left;
                y += fontSize + 2;
            }
            
            // 换页检测
            if (y + fontSize > bottom) {
                // 显示光标等待
                await this._showCursor(x, y);
                
                // 清除并重新绘制对话框
                this._drawCharacters();
                if (this.messageBox) {
                    const msgY = this.screenSize[1] - this.messageBox.height;
                    this.finalImg.blit(this.messageBox, [0, msgY], [0, 0], this.messageBoxMask);
                }
                if (name && this.nameBox) {
                    const nameBoxOrig = config.get('nameboxorig');
                    const nameY = this.screenSize[1] - (this.messageBox?.height || 0) - 
                                 nameBoxOrig[1] - (this.nameBox?.height || 0);
                    this.finalImg.blit(this.nameBox, [nameBoxOrig[0], nameY], [0, 0], this.nameBoxMask);
                    
                    const nameAlign = config.get('namealign');
                    const nameWidth = this.ctx.measureText(name).width;
                    let nameX = nameBoxOrig[0];
                    if (nameAlign === 'middle') {
                        nameX += ((this.nameBox?.width || 100) - nameWidth) / 2;
                    }
                    this._drawText(name, nameX, nameY + fontSize + 4, config.get('textcolor'), fontSize);
                }
                
                x = left;
                y = top;
            }
            
            this._drawText(char, x, y + fontSize, color, fontSize);
            this.updateScreen();
            
            x += charWidth;
            i++;
            
            if (speed > 0) {
                await this.engine.sleep(speed);
            }
        }
    }

    /**
     * 显示光标
     * @private
     */
    async _showCursor(x, y) {
        if (!this.messageCursor) {
            await this.engine.waitForKey();
            return;
        }
        
        const spaces = [0, 1, 3, 5, 6, 5, 3, 1];
        let spaceIdx = 0;
        
        // 保存光标位置的背景
        const backImg = new PyMOImage(this.messageCursor.width, this.messageCursor.height + 6);
        backImg.blit(this.finalImg, [0, 0], [x, y]);
        
        // 绘制初始光标
        this.finalImg.blit(this.messageCursor, [x, y], [0, 0], this.messageCursorMask);
        this.updateScreen();
        
        // 动画循环等待按键
        const waitPromise = this.engine.waitForKey();
        
        while (true) {
            const raceResult = await Promise.race([
                waitPromise,
                this.engine.sleep(100).then(() => 'timeout')
            ]);
            
            if (raceResult !== 'timeout') break;
            
            // 更新光标动画
            spaceIdx = (spaceIdx + 1) % spaces.length;
            this.finalImg.blit(backImg, [x, y]);
            this.finalImg.blit(this.messageCursor, [x, y + spaces[spaceIdx]], [0, 0], this.messageCursorMask);
            this.updateScreen();
        }
        
        // 恢复
        this.finalImg.blit(backImg, [x, y]);
        this.updateScreen();
    }

    // ==================== 工具方法 ====================

    /**
     * 绘制背景
     * @private
     */
    _drawBackground() {
        if (this.charaOn) {
            this.finalImg.blit(this.charaImg);
        } else {
            this.finalImg.blit(this.bgImg);
        }
    }

    /**
     * 绘制立绘
     * @private
     */
    _drawCharacters() {
        if (this.charaOn) {
            this.finalImg.blit(this.charaImg);
        } else {
            this.finalImg.blit(this.bgImg);
        }
    }

    /**
     * 绘制文本
     * @private
     */
    _drawText(text, x, y, color, fontSize) {
        this.ctx.font = `${fontSize}px sans-serif`;
        this.ctx.fillStyle = color;
        this.ctx.fillText(text, x, y);
        
        // 同时绘制到 finalImg
        this.finalImg.text([x, y], text, ConfigManager.parseColor(color), fontSize);
    }

    /**
     * 背景坐标转屏幕坐标
     * @private
     */
    _bgToScreen(pos) {
        const offsetX = (this.screenSize[0] - this.bgSize[0]) / 2;
        const offsetY = (this.screenSize[1] - this.bgSize[1]) / 2;
        return [pos[0] + offsetX, pos[1] + offsetY];
    }

    /**
     * 解析速度参数
     * @private
     */
    _parseSpeed(speed) {
        if (typeof speed === 'number') return speed;
        
        const speedMap = {
            'BG_VERYFAST': 10,
            'BG_FAST': 150,
            'BG_NORMAL': 250,
            'BG_SLOW': 500
        };
        
        return speedMap[speed] || parseInt(speed) || 250;
    }

    /**
     * Alpha 过渡效果
     * @private
     */
    async _alphaTransition(duration, newImg) {
        if (duration < 20 || this.inFadeOut) {
            this.finalImg.blit(newImg);
            if (!this.inFadeOut) this.updateScreen();
            return;
        }
        
        const oldImg = this.finalImg.clone();
        const startTime = performance.now();
        const durationMs = duration;
        
        while (true) {
            const elapsed = performance.now() - startTime;
            if (elapsed >= durationMs) break;
            
            const alpha = elapsed / durationMs;
            
            // 混合图像
            this.finalImg.blit(oldImg);
            this.ctx.globalAlpha = alpha;
            this.ctx.drawImage(newImg.canvas, 0, 0);
            this.ctx.globalAlpha = 1.0;
            
            await this.engine.sleep(16);
        }
        
        this.finalImg.blit(newImg);
        this.updateScreen();
    }

    /**
     * Fade 过渡效果
     * @private
     */
    async _fadeTransition(duration) {
        await this._alphaTransition(duration, this.tempImg);
    }

    /**
     * Fade In 过渡效果
     * @private
     */
    async _fadeInTransition(duration) {
        const targetImg = this.finalImg.clone();
        this.finalImg.clear(this.fadeOutColor);
        await this._alphaTransition(duration, targetImg);
    }

    /**
     * 清除文本
     */
    clearText() {
        this.textLayers = [];
        this._drawCharacters();
        this.updateScreen();
    }

    /**
     * 设置对话框
     */
    async setTextbox(messagebox, namebox) {
        this.messageBox = await this.loadImage(`system/${messagebox}.png`, this.screenSize[0]);
        this.messageBoxMask = await this.loadImage(`system/${messagebox}_mask.png`, this.screenSize[0]);
        
        const fontSize = this.engine.config.get('fontsize');
        this.nameBox = await this.loadImage(`system/${namebox}.png`, null, fontSize + 12);
        this.nameBoxMask = await this.loadImage(`system/${namebox}_mask.png`, null, fontSize + 12);
    }

    // ==================== 帧动画系统 ====================

    /**
     * 初始化动画系统
     */
    _initAnimationSystem() {
        if (!this.animations) {
            this.animations = new Map();  // 存储所有活动的动画
            this.animationFrameId = null;
            this._animationLoop = this._animationLoop.bind(this);
        }
    }

    /**
     * 启动帧动画
     * @param {string} filename - 动画文件名（不含后缀和数字）
     * @param {number} frameCount - 帧数
     * @param {number} x - X 坐标百分比
     * @param {number} y - Y 坐标百分比
     * @param {number} interval - 帧间隔（毫秒）
     * @param {boolean} loop - 是否循环
     */
    async startAnimation(filename, frameCount, x, y, interval, loop) {
        this._initAnimationSystem();
        
        // 加载所有帧
        const frames = [];
        for (let i = 1; i <= frameCount; i++) {
            const frameName = `${filename}${i.toString().padStart(2, '0')}`;
            try {
                const img = await this.loadImage(`chara/${frameName}.png`);
                if (img) frames.push(img);
            } catch (e) {
                console.warn(`Failed to load animation frame: ${frameName}`);
            }
        }
        
        if (frames.length === 0) {
            console.warn(`No animation frames loaded for: ${filename}`);
            return;
        }
        
        // 计算位置
        const posX = (x / 100) * this.screenSize[0];
        const posY = (y / 100) * this.screenSize[1];
        
        // 创建动画对象
        const animation = {
            filename,
            frames,
            currentFrame: 0,
            x: posX,
            y: posY,
            interval,
            loop,
            lastUpdate: performance.now(),
            finished: false
        };
        
        this.animations.set(filename, animation);
        
        // 启动动画循环
        if (!this.animationFrameId) {
            this.animationFrameId = requestAnimationFrame(this._animationLoop);
        }
    }

    /**
     * 停止帧动画
     * @param {string} filename - 动画文件名，或 'all' 停止所有
     */
    stopAnimation(filename) {
        this._initAnimationSystem();
        
        if (filename === 'all') {
            this.animations.clear();
        } else {
            this.animations.delete(filename);
        }
        
        // 如果没有动画了，停止循环
        if (this.animations.size === 0 && this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // 重绘
        this._drawCharacters();
        this.updateScreen();
    }

    /**
     * 动画循环
     * @private
     */
    _animationLoop() {
        const now = performance.now();
        let needsRedraw = false;
        
        for (const [key, anim] of this.animations) {
            if (anim.finished) continue;
            
            const elapsed = now - anim.lastUpdate;
            if (elapsed >= anim.interval) {
                anim.currentFrame++;
                anim.lastUpdate = now;
                needsRedraw = true;
                
                if (anim.currentFrame >= anim.frames.length) {
                    if (anim.loop) {
                        anim.currentFrame = 0;
                    } else {
                        anim.finished = true;
                    }
                }
            }
        }
        
        // 清理已完成的非循环动画
        for (const [key, anim] of this.animations) {
            if (anim.finished) {
                this.animations.delete(key);
            }
        }
        
        if (needsRedraw) {
            this._drawCharacters();
            this._drawAnimations();
            this.updateScreen();
        }
        
        // 继续循环
        if (this.animations.size > 0) {
            this.animationFrameId = requestAnimationFrame(this._animationLoop);
        } else {
            this.animationFrameId = null;
        }
    }

    /**
     * 绘制所有动画
     * @private
     */
    _drawAnimations() {
        if (!this.animations || this.animations.size === 0) return;
        
        for (const [key, anim] of this.animations) {
            if (anim.finished || anim.currentFrame >= anim.frames.length) continue;
            
            const frame = anim.frames[anim.currentFrame];
            if (frame && frame.canvas) {
                // 绘制到最终图像
                this.finalImg.ctx.drawImage(frame.canvas, anim.x, anim.y);
            }
        }
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GraphicsSystem;
}

