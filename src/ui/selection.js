/**
 * PyMO Web - 选择系统
 * 处理选择支、菜单选择等
 */

class SelectionSystem {
    constructor(engine) {
        this.engine = engine;
        this.currentSelection = 0;
        this.choices = [];
        this.isActive = false;
        this.keyHandler = null;
    }

    /**
     * 显示选择支（#sel）
     * @param {string[]} choices - 选项文本数组
     * @param {string} hintPic - 提示图片（可选）
     * @returns {Promise<number>} 选择的索引
     */
    async showSelection(choices, hintPic = null) {
        this.choices = choices;
        this.currentSelection = 0;
        this.isActive = true;
        
        const config = this.engine.config;
        const graphics = this.engine.graphics;
        
        // 加载选项框图片
        const optionImg = await graphics.loadImage('system/option.png');
        const optionMask = await graphics.loadImage('system/option_mask.png');
        const highlightImg = await graphics.loadImage('system/sel_highlight.png');
        const highlightMask = await graphics.loadImage('system/sel_highlight_mask.png');
        
        // 加载提示图片
        let hintImg = null;
        let hintMask = null;
        if (hintPic) {
            hintImg = await graphics.loadImage(`system/${hintPic}.png`);
            hintMask = await graphics.loadImage(`system/${hintPic}_mask.png`);
        }
        
        // 计算选项位置
        const screenW = graphics.screenSize[0];
        const screenH = graphics.screenSize[1];
        const optionW = optionImg ? optionImg.width : 260;
        const optionH = optionImg ? optionImg.height : 40;
        const spacing = 10;
        const totalHeight = choices.length * optionH + (choices.length - 1) * spacing;
        const startY = (screenH - totalHeight) / 2;
        const startX = (screenW - optionW) / 2;
        
        // 渲染函数
        const render = () => {
            // 绘制背景
            graphics._drawCharacters();
            
            // 绘制选项
            for (let i = 0; i < choices.length; i++) {
                const y = startY + i * (optionH + spacing);
                
                // 选项背景
                if (optionImg) {
                    graphics.finalImg.blit(optionImg, [startX, y], [0, 0], optionMask);
                }
                
                // 高亮
                if (i === this.currentSelection && highlightImg) {
                    graphics.finalImg.blit(highlightImg, [startX, y], [0, 0], highlightMask);
                }
                
                // 文字
                const fontSize = config.get('fontsize');
                const text = choices[i];
                const textWidth = graphics.ctx.measureText(text).width || text.length * fontSize;
                const textX = startX + (optionW - textWidth) / 2;
                const textY = y + (optionH + fontSize) / 2 - 4;
                
                // 已选择过的选项变灰
                const isSelected = this._isChoiceSelected(i);
                const textColor = isSelected ? '#888888' : '#ffffff';
                graphics._drawText(text, textX, textY, textColor, fontSize);
            }
            
            // 绘制提示图片
            if (hintImg && this.currentSelection < choices.length) {
                const hintX = startX + optionW + 10;
                const hintY = startY + this.currentSelection * (optionH + spacing);
                graphics.finalImg.blit(hintImg, [hintX, hintY], [0, 0], hintMask);
            }
            
            graphics.updateScreen();
        };
        
        render();
        
        // 保存选项区域信息供点击检测
        this._optionAreas = choices.map((_, i) => ({
            x: startX,
            y: startY + i * (optionH + spacing),
            width: optionW,
            height: optionH,
            index: i
        }));
        
        // 等待用户选择
        return new Promise((resolve) => {
            // 键盘事件
            this.keyHandler = (e) => {
                // 阻止事件传播到其他处理器
                e.stopImmediatePropagation();
                
                // 使用按键映射（处理屏幕旋转）
                const key = typeof mapKeyForRotation === 'function' 
                    ? mapKeyForRotation(e.key) 
                    : (window.mapKeyForRotation ? window.mapKeyForRotation(e.key) : e.key);
                
                switch (key) {
                    // T9 键盘和方向键支持
                    case 'ArrowUp':
                    case '2':
                        this.currentSelection = (this.currentSelection - 1 + choices.length) % choices.length;
                        render();
                        e.preventDefault();
                        break;
                    case 'ArrowDown':
                    case '8':
                        this.currentSelection = (this.currentSelection + 1) % choices.length;
                        render();
                        e.preventDefault();
                        break;
                    case 'Enter':
                    case '5':
                    case ' ':
                    case 'SoftLeft':
                        console.log('[Selection] showSelection confirmed:', this.currentSelection);
                        this._cleanup();
                        this._recordSelection();
                        resolve(this.currentSelection);
                        e.preventDefault();
                        break;
                }
            };
            
            // 鼠标/触摸点击事件
            this.clickHandler = (e) => {
                const canvas = this.engine.graphics.canvas;
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                
                const x = (e.clientX - rect.left) * scaleX;
                const y = (e.clientY - rect.top) * scaleY;
                
                // 检测点击了哪个选项
                for (const area of this._optionAreas) {
                    if (x >= area.x && x <= area.x + area.width &&
                        y >= area.y && y <= area.y + area.height) {
                        console.log('[Selection] showSelection clicked:', area.index);
                        this.currentSelection = area.index;
                        this._cleanup();
                        this._recordSelection();
                        resolve(this.currentSelection);
                        return;
                    }
                }
            };
            
            console.log('[Selection] showSelection active, choices:', choices);
            document.addEventListener('keydown', this.keyHandler, true);  // 使用捕获阶段
            this.engine.graphics.canvas.addEventListener('click', this.clickHandler);
        });
    }

    /**
     * 显示文本选择菜单（#select_text）
     */
    async showTextSelection(choices, x1, y1, x2, y2, color, initPos = 0) {
        this.choices = choices;
        this.currentSelection = initPos;
        this.isActive = true;
        
        const config = this.engine.config;
        const graphics = this.engine.graphics;
        const screenW = graphics.screenSize[0];
        const screenH = graphics.screenSize[1];
        
        // 计算区域
        const left = x1 * screenW / 100;
        const top = y1 * screenH / 100;
        const right = x2 * screenW / 100;
        const bottom = y2 * screenH / 100;
        const width = right - left;
        const height = bottom - top;
        
        // 计算选项布局
        const fontSize = config.get('fontsize');
        const lineHeight = fontSize + 8;
        const totalHeight = choices.length * lineHeight;
        const startY = top + (height - totalHeight) / 2;
        
        const render = () => {
            graphics.finalImg.blit(graphics.charaOn ? graphics.charaImg : graphics.bgImg);
            
            for (let i = 0; i < choices.length; i++) {
                const text = choices[i];
                const textWidth = graphics.ctx.measureText(text).width || text.length * fontSize;
                const textX = left + (width - textWidth) / 2;
                const textY = startY + i * lineHeight + fontSize;
                
                const textColor = i === this.currentSelection ? '#ffff00' : color;
                graphics._drawText(text, textX, textY, textColor, fontSize);
            }
            
            graphics.updateScreen();
        };
        
        render();
        
        // 保存选项区域信息
        this._optionAreas = choices.map((text, i) => {
            const textWidth = graphics.ctx.measureText(text).width || text.length * fontSize;
            const textX = left + (width - textWidth) / 2;
            return {
                x: left,
                y: startY + i * lineHeight,
                width: width,
                height: lineHeight,
                index: i
            };
        });
        
        return new Promise((resolve) => {
            this.keyHandler = (e) => {
                // 阻止事件传播到其他处理器
                e.stopImmediatePropagation();
                
                // 使用按键映射（处理屏幕旋转）
                const key = typeof mapKeyForRotation === 'function' 
                    ? mapKeyForRotation(e.key) 
                    : (window.mapKeyForRotation ? window.mapKeyForRotation(e.key) : e.key);
                
                switch (key) {
                    case 'ArrowUp':
                    case '2':
                        this.currentSelection = (this.currentSelection - 1 + choices.length) % choices.length;
                        render();
                        e.preventDefault();
                        break;
                    case 'ArrowDown':
                    case '8':
                        this.currentSelection = (this.currentSelection + 1) % choices.length;
                        render();
                        e.preventDefault();
                        break;
                    case 'Enter':
                    case '5':
                    case ' ':
                    case 'SoftLeft':
                        console.log('[Selection] Confirmed:', this.currentSelection, choices[this.currentSelection]);
                        this._cleanup();
                        resolve(this.currentSelection);
                        e.preventDefault();
                        break;
                    default:
                        // 其他按键不处理，但记录日志
                        console.log('[Selection] Key pressed:', e.key, '-> mapped:', key);
                        break;
                }
            };
            
            // 鼠标/触摸点击事件
            this.clickHandler = (e) => {
                const canvas = this.engine.graphics.canvas;
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                
                const x = (e.clientX - rect.left) * scaleX;
                const y = (e.clientY - rect.top) * scaleY;
                
                console.log('[Selection] Click at:', x, y);
                
                for (const area of this._optionAreas) {
                    if (x >= area.x && x <= area.x + area.width &&
                        y >= area.y && y <= area.y + area.height) {
                        console.log('[Selection] Clicked option:', area.index, choices[area.index]);
                        this.currentSelection = area.index;
                        this._cleanup();
                        resolve(this.currentSelection);
                        return;
                    }
                }
            };
            
            console.log('[Selection] showTextSelection active, choices:', choices);
            document.addEventListener('keydown', this.keyHandler, true);  // 使用捕获阶段
            this.engine.graphics.canvas.addEventListener('click', this.clickHandler);
        });
    }

    /**
     * 显示变量控制选择（#select_var）
     */
    async showVarSelection(items, x1, y1, x2, y2, color, initPos = 0) {
        const visibleItems = [];
        const originalIndices = [];
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            let isVisible = true;
            
            if (item.varName !== '1' && item.varName !== 1) {
                if (item.varName === '0' || item.varName === 0) {
                    isVisible = false;
                } else {
                    const value = this.engine.variables.get(item.varName);
                    isVisible = value !== 0;
                }
            }
            
            if (isVisible) {
                visibleItems.push(item.text);
                originalIndices.push(i);
            }
        }
        
        if (visibleItems.length === 0) {
            return 0;
        }
        
        const selectedIndex = await this.showTextSelection(visibleItems, x1, y1, x2, y2, color, 
            Math.min(initPos, visibleItems.length - 1));
        
        return originalIndices[selectedIndex];
    }

    /**
     * 清理事件监听
     * @private
     */
    _cleanup() {
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler, true);  // 移除捕获阶段监听器
            this.keyHandler = null;
        }
        if (this.clickHandler && this.engine.graphics.canvas) {
            this.engine.graphics.canvas.removeEventListener('click', this.clickHandler);
            this.clickHandler = null;
        }
        this._optionAreas = null;
        this.isActive = false;
    }

    /**
     * 记录选择（用于已选项变灰）
     * @private
     */
    _recordSelection() {
        const graySelected = this.engine.config.get('grayselected');
        if (!graySelected) return;
        
        const key = `${this.engine.scriptParser.scriptName}_${this.engine.scriptParser.currentLine}`;
        
        if (!this.engine.globalData.selectedChoices) {
            this.engine.globalData.selectedChoices = {};
        }
        
        if (!this.engine.globalData.selectedChoices[key]) {
            this.engine.globalData.selectedChoices[key] = [];
        }
        
        if (!this.engine.globalData.selectedChoices[key].includes(this.currentSelection)) {
            this.engine.globalData.selectedChoices[key].push(this.currentSelection);
        }
    }

    /**
     * 检查选项是否已选择过
     * @private
     */
    _isChoiceSelected(choiceIndex) {
        const graySelected = this.engine.config.get('grayselected');
        if (!graySelected) return false;
        
        const key = `${this.engine.scriptParser.scriptName}_${this.engine.scriptParser.currentLine}`;
        const selected = this.engine.globalData.selectedChoices?.[key];
        return selected && selected.includes(choiceIndex);
    }

    /**
     * 检查选项是否已选择过（公开方法）
     */
    isChoiceSelected(choiceIndex) {
        return this._isChoiceSelected(choiceIndex);
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SelectionSystem;
}
