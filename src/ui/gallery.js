/**
 * PyMO Web - 鉴赏系统
 * CG 鉴赏和音乐鉴赏
 */

class GallerySystem {
    constructor(engine) {
        this.engine = engine;
        this.overlay = null;
        this.currentIndex = 0;
        this.selectables = [];
        this.selectedIndex = 0;
        this.keyHandler = null;
    }

    /**
     * 显示 CG 鉴赏
     * @param {string} listName - CG 列表文件名
     */
    async showAlbum(listName = 'album_list') {
        const engine = this.engine;
        const cgList = await this._loadCGList(listName);
        
        if (!cgList || cgList.length === 0) {
            console.warn('No CG list found');
            return;
        }
        
        this._createOverlay();
        this.selectables = [];
        this.selectedIndex = 0;
        
        const panel = document.createElement('div');
        panel.className = 'gallery-panel';
        panel.innerHTML = `
            <div class="gallery-title">CG 鉴赏</div>
            <div class="gallery-grid"></div>
            <button class="menu-item gallery-back">返回</button>
        `;
        
        const grid = panel.querySelector('.gallery-grid');
        
        console.log('Unlocked CGs:', engine.globalData.unlockedCG);
        console.log('CG list:', cgList);
        
        // 打印调试信息
        if (engine.pakFiles.bg?.index) {
            console.log('bg.pak files:', Object.keys(engine.pakFiles.bg.index).slice(0, 30));
        } else {
            console.log('No bg.pak loaded');
        }
        
        // 打印 ZIP 中的 bg/ 目录文件
        const bgFiles = Object.keys(engine.gameData.Zip).filter(k => k.toLowerCase().startsWith('bg/'));
        console.log('ZIP bg/ files:', bgFiles.slice(0, 30));
        
        for (let i = 0; i < cgList.length; i++) {
            const cg = cgList[i];
            // 检查是否解锁（大小写不敏感）
            const isUnlocked = engine.globalData.unlockedCG.some(
                unlocked => unlocked.toLowerCase() === cg.toLowerCase()
            );
            
            const item = document.createElement('div');
            item.className = `gallery-item ${isUnlocked ? 'unlocked' : 'locked'}`;
            item.dataset.index = i;
            item.dataset.cg = cg;
            item.dataset.unlocked = isUnlocked ? '1' : '0';
            
            if (isUnlocked) {
                // 加载缩略图
                try {
                    const thumbImg = await this._loadCGImage(cg);
                    console.log(`CG ${cg} loaded:`, thumbImg ? `${thumbImg.width}x${thumbImg.height}` : 'null');
                    if (thumbImg && thumbImg.canvas && thumbImg.width > 0 && thumbImg.height > 0) {
                        const canvas = document.createElement('canvas');
                        // 根据屏幕大小调整缩略图尺寸
                        const thumbWidth = window.innerWidth > 400 ? 160 : 80;
                        const thumbHeight = window.innerWidth > 400 ? 120 : 60;
                        canvas.width = thumbWidth;
                        canvas.height = thumbHeight;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(thumbImg.canvas, 0, 0, thumbImg.width, thumbImg.height, 0, 0, thumbWidth, thumbHeight);
                        item.innerHTML = `<img src="${canvas.toDataURL()}" alt="${cg}">`;
                    } else {
                        console.warn(`CG ${cg} load failed or invalid`);
                        item.innerHTML = `<div class="gallery-thumb-placeholder">${i + 1}</div>`;
                    }
                } catch (e) {
                    console.error(`CG ${cg} load error:`, e);
                    item.innerHTML = `<div class="gallery-thumb-placeholder">${i + 1}</div>`;
                }
                
                item.addEventListener('click', () => {
                    this._showFullCG(cg);
                });
            } else {
                item.innerHTML = `<div class="gallery-thumb-locked">?</div>`;
            }
            
            grid.appendChild(item);
            this.selectables.push(item);
        }
        
        // 返回按钮
        const backBtn = panel.querySelector('.gallery-back');
        backBtn.addEventListener('click', () => {
            this.close();
        });
        this.selectables.push(backBtn);
        
        this.overlay.innerHTML = '';
        this.overlay.appendChild(panel);
        this.overlay.style.display = 'flex';
        
        // 设置初始选中
        this._updateSelection();
        
        // 添加键盘支持
        this._setupKeyboard('album', cgList);
    }

    /**
     * 加载 CG 列表
     * @private
     */
    async _loadCGList(listName) {
        try {
            // 尝试多个路径
            const paths = [
                `script/${listName}.txt`,
                `system/${listName}.txt`,
                `${listName}.txt`
            ];
            
            let data = null;
            for (const path of paths) {
                data = this.engine.gameData.Zip[path]?.compressed_data;
                if (data) break;
            }
            
            if (!data) {
                console.warn('CG list not found in paths:', paths);
                return [];
            }
            
            const text = new TextDecoder('utf-8').decode(data);
            const lines = text.split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith(';'));
            
            // 解析 album_list 格式：页数,图片数,解锁状态,图片1,图片2,...
            const cgList = [];
            for (const line of lines) {
                const parts = line.split(',');
                if (parts.length >= 4) {
                    // 从第4个参数开始是图片编号
                    for (let i = 3; i < parts.length; i++) {
                        const cgNum = parts[i].trim();
                        if (cgNum && !cgList.includes(cgNum)) {
                            cgList.push(cgNum);
                        }
                    }
                }
            }
            
            console.log('Loaded CG list:', cgList);
            return cgList;
        } catch (e) {
            console.error('Failed to load CG list', e);
            return [];
        }
    }

    /**
     * 加载 CG 图片（尝试多种路径和格式）
     * @private
     */
    async _loadCGImage(cgName) {
        const engine = this.engine;
        const defaultFormat = engine.config.get('bgformat') || '.jpg';
        const formats = [defaultFormat, '.jpg', '.png', '.bmp', '.jpeg'];
        
        // 去重并过滤
        const uniqueFormats = [...new Set(formats.filter(f => f))];
        
        // 1. 尝试从 PAK 加载（不带扩展名）
        try {
            const pakImg = await engine.graphics.loadFromPak(cgName, 'bg');
            if (pakImg) {
                console.log(`Loaded CG ${cgName} from PAK (no ext)`);
                return pakImg;
            }
        } catch (e) {
            // 忽略
        }
        
        // 2. 尝试从 PAK 加载（带扩展名）
        for (const fmt of uniqueFormats) {
            try {
                const pakImg = await engine.graphics.loadFromPak(cgName + fmt, 'bg');
                if (pakImg) {
                    console.log(`Loaded CG ${cgName}${fmt} from PAK`);
                    return pakImg;
                }
            } catch (e) {
                // 忽略
            }
        }
        
        // 3. 尝试直接从 ZIP 加载（带扩展名，bg/ 前缀）
        for (const fmt of uniqueFormats) {
            const path = `bg/${cgName}${fmt}`;
            let img = await engine.graphics.loadImage(path);
            if (img) {
                console.log(`Loaded CG ${path} from ZIP`);
                return img;
            }
        }
        
        // 4. 尝试不带 bg/ 前缀
        for (const fmt of uniqueFormats) {
            const path = `${cgName}${fmt}`;
            let img = await engine.graphics.loadImage(path);
            if (img) {
                console.log(`Loaded CG ${path} from ZIP (no bg/)`);
                return img;
            }
        }
        
        // 5. 如果 cgName 已经包含扩展名，直接尝试
        if (cgName.includes('.')) {
            let img = await engine.graphics.loadImage(`bg/${cgName}`);
            if (img) return img;
            img = await engine.graphics.loadImage(cgName);
            if (img) return img;
        }
        
        console.warn(`CG ${cgName} not found in any location`);
        return null;
    }

    /**
     * 显示完整 CG
     * @private
     */
    async _showFullCG(cgName) {
        // 暂时移除 gallery 的键盘处理，避免冲突
        this._removeKeyboard();
        
        const viewer = document.createElement('div');
        viewer.className = 'cg-viewer';
        
        try {
            const img = await this._loadCGImage(cgName);
            if (img) {
                viewer.innerHTML = `
                    <img src="${img.canvas.toDataURL()}" alt="${cgName}">
                    <button class="cg-viewer-close">×</button>
                `;
            } else {
                viewer.innerHTML = `<div class="cg-viewer-error">无法加载 CG: ${cgName}</div>`;
            }
        } catch (e) {
            viewer.innerHTML = `<div class="cg-viewer-error">无法加载 CG: ${e.message}</div>`;
        }
        
        const closeViewer = () => {
            viewer.remove();
            document.removeEventListener('keydown', closeHandler, true);
            // 恢复 gallery 的键盘处理
            this._setupKeyboard('album', this.engine.cgList || []);
        };
        
        viewer.querySelector('.cg-viewer-close')?.addEventListener('click', closeViewer);
        
        viewer.addEventListener('click', (e) => {
            if (e.target === viewer || e.target.tagName === 'IMG') {
                closeViewer();
            }
        });
        
        // 添加键盘支持（按任意键关闭）
        const closeHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeViewer();
        };
        document.addEventListener('keydown', closeHandler, true);
        
        document.body.appendChild(viewer);
    }

    /**
     * 显示音乐鉴赏
     */
    async showMusicGallery() {
        const engine = this.engine;
        const musicList = await this._loadMusicList();
        
        if (!musicList || musicList.length === 0) {
            console.warn('No music list found');
            return;
        }
        
        this._createOverlay();
        
        const panel = document.createElement('div');
        panel.className = 'gallery-panel music-gallery';
        panel.innerHTML = `
            <div class="gallery-title">音乐鉴赏</div>
            <div class="music-list"></div>
            <div class="music-controls">
                <button class="music-btn" data-action="prev">◀</button>
                <button class="music-btn" data-action="play">▶</button>
                <button class="music-btn" data-action="next">▶▶</button>
            </div>
            <button class="menu-item gallery-back">返回</button>
        `;
        
        const list = panel.querySelector('.music-list');
        
        musicList.forEach((music, i) => {
            const item = document.createElement('div');
            item.className = 'music-item';
            item.dataset.index = i;
            item.innerHTML = `
                <span class="music-number">${String(i + 1).padStart(2, '0')}</span>
                <span class="music-name">${music.name || music.file}</span>
            `;
            
            item.addEventListener('click', () => {
                this._playMusic(music, i);
                list.querySelectorAll('.music-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
            });
            
            list.appendChild(item);
        });
        
        // 控制按钮
        panel.querySelector('[data-action="play"]').addEventListener('click', () => {
            const audio = engine.audio.bgmAudio;
            if (audio.paused) {
                audio.play();
            } else {
                audio.pause();
            }
        });
        
        panel.querySelector('[data-action="prev"]').addEventListener('click', () => {
            this.currentIndex = (this.currentIndex - 1 + musicList.length) % musicList.length;
            this._playMusic(musicList[this.currentIndex], this.currentIndex);
        });
        
        panel.querySelector('[data-action="next"]').addEventListener('click', () => {
            this.currentIndex = (this.currentIndex + 1) % musicList.length;
            this._playMusic(musicList[this.currentIndex], this.currentIndex);
        });
        
        panel.querySelector('.gallery-back').addEventListener('click', () => {
            engine.audio.stopBGM();
            this.close();
        });
        
        this.overlay.innerHTML = '';
        this.overlay.appendChild(panel);
        this.overlay.style.display = 'flex';
    }

    /**
     * 加载音乐列表
     * @private
     */
    async _loadMusicList() {
        try {
            const path = 'system/music_list.txt';
            const data = this.engine.gameData.Zip[path]?.compressed_data;
            
            if (!data) return [];
            
            const text = new TextDecoder('utf-8').decode(data);
            const lines = text.split('\n').filter(line => line.trim() && !line.startsWith(';'));
            
            return lines.map(line => {
                const parts = line.split(',');
                return {
                    file: parts[0]?.trim(),
                    name: parts[1]?.trim() || parts[0]?.trim()
                };
            });
        } catch (e) {
            console.error('Failed to load music list', e);
            return [];
        }
    }

    /**
     * 播放音乐
     * @private
     */
    _playMusic(music, index) {
        this.currentIndex = index;
        this.engine.audio.playBGM(music.file, false);
    }

    /**
     * 创建覆盖层
     * @private
     */
    _createOverlay() {
        if (this.overlay) return;
        
        this.overlay = document.createElement('div');
        this.overlay.className = 'menu-overlay';
        this.overlay.style.display = 'none';
        
        // 应用屏幕旋转
        this._applyRotation();
        
        document.getElementById('game-container').appendChild(this.overlay);
    }

    /**
     * 应用屏幕旋转
     * @private
     */
    _applyRotation() {
        if (!this.overlay) return;
        
        this.overlay.classList.remove('rotated-left', 'rotated-right');
        
        if (typeof screenRotation !== 'undefined' && screenRotation.enabled) {
            if (screenRotation.direction === 'left') {
                this.overlay.classList.add('rotated-left');
            } else {
                this.overlay.classList.add('rotated-right');
            }
        }
    }

    /**
     * 关闭鉴赏界面
     */
    close() {
        this._removeKeyboard();
        if (this.overlay) {
            this.overlay.style.display = 'none';
            this.overlay.innerHTML = '';
        }
        this.selectables = [];
        this.selectedIndex = 0;
    }

    /**
     * 设置键盘处理
     * @private
     */
    _setupKeyboard(mode, list) {
        this._removeKeyboard();
        
        this.keyHandler = (e) => {
            e.stopImmediatePropagation();
            
            // 使用按键映射（处理屏幕旋转）
            const key = window.mapKeyForRotation ? window.mapKeyForRotation(e.key) : e.key;
            
            // 根据屏幕宽度动态计算列数
            let cols = 1;
            if (mode === 'album') {
                // 小屏幕 2 列，中屏幕 3 列，大屏幕 4 列
                if (window.innerWidth <= 250) {
                    cols = 2;
                } else if (window.innerWidth <= 400) {
                    cols = 3;
                } else {
                    cols = 4;
                }
            }
            
            switch (key) {
                case 'ArrowUp':
                case '2':
                    this.selectedIndex = Math.max(0, this.selectedIndex - cols);
                    this._updateSelection();
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                case '8':
                    this.selectedIndex = Math.min(this.selectables.length - 1, this.selectedIndex + cols);
                    this._updateSelection();
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                case '4':
                    if (this.selectedIndex > 0) {
                        this.selectedIndex--;
                        this._updateSelection();
                    }
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                case '6':
                    if (this.selectedIndex < this.selectables.length - 1) {
                        this.selectedIndex++;
                        this._updateSelection();
                    }
                    e.preventDefault();
                    break;
                case 'Enter':
                case '5':
                case ' ':
                case 'SoftLeft':
                    this._confirmSelection(mode, list);
                    e.preventDefault();
                    break;
                case 'Escape':
                case 'Backspace':
                case '0':
                case '#':
                    this.close();
                    e.preventDefault();
                    break;
            }
        };
        
        document.addEventListener('keydown', this.keyHandler, true);
    }

    /**
     * 移除键盘处理
     * @private
     */
    _removeKeyboard() {
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler, true);
            this.keyHandler = null;
        }
    }

    /**
     * 更新选中状态
     * @private
     */
    _updateSelection() {
        this.selectables.forEach((el, i) => {
            if (i === this.selectedIndex) {
                el.classList.add('selected');
                el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                el.classList.remove('selected');
            }
        });
    }

    /**
     * 确认选择
     * @private
     */
    _confirmSelection(mode, list) {
        const selected = this.selectables[this.selectedIndex];
        if (!selected) return;
        
        if (selected.classList.contains('gallery-back')) {
            // 返回按钮
            if (mode === 'music') {
                this.engine.audio.stopBGM();
            }
            this.close();
        } else if (mode === 'album') {
            // CG 鉴赏
            if (selected.dataset.unlocked === '1') {
                this._showFullCG(selected.dataset.cg);
            }
        } else if (mode === 'music') {
            // 音乐鉴赏
            const index = parseInt(selected.dataset.index);
            if (!isNaN(index) && list[index]) {
                this._playMusic(list[index], index);
                this.overlay.querySelectorAll('.music-item').forEach(el => el.classList.remove('active'));
                selected.classList.add('active');
            }
        }
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GallerySystem;
}


