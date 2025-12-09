/**
 * PyMO Web - 游戏引擎主类
 * 协调各个模块，管理游戏生命周期
 */

class PyMOEngine {
    constructor() {
        // 游戏数据
        this.gameName = '';
        this.gameData = null;
        
        // 模块实例
        this.config = new ConfigManager();
        this.variables = new VariableSystem();
        this.graphics = new GraphicsSystem(this);
        this.audio = new AudioSystem(this);
        this.scriptParser = new ScriptParser(this);
        this.selection = new SelectionSystem(this);
        this.saveSystem = new SaveSystem(this);
        this.menu = null;      // 延迟初始化
        this.gallery = null;   // 延迟初始化
        
        // UI 模块引用
        this.ui = {
            showSelection: (choices, hint) => this.selection.showSelection(choices, hint),
            showTextSelection: (...args) => this.selection.showTextSelection(...args),
            showVarSelection: (...args) => this.selection.showVarSelection(...args),
            showAlbum: (name) => this._showAlbum(name),
            showMusicGallery: () => this._showMusicGallery(),
            showConfig: () => this._showConfig()
        };
        
        // PAK 文件索引
        this.pakFiles = {
            bg: null,
            chara: null,
            se: null,
            voice: null
        };
        
        // 当前存档状态
        this.save = {
            title: '',
            bg: '',
            bgpercentorig: [0, 0],
            chara: {},
            name: '',
            message: ''
        };
        
        // 全局数据
        this.globalData = {
            unlockedCG: [],
            selectedChoices: {}
        };
        
        // 运行状态
        this.running = false;
        this.waitingForKey = false;
        this.keyResolver = null;
        
        // 绑定事件
        this._bindEvents();
    }

    /**
     * 初始化引擎
     * @param {string} gameName - 游戏名称
     * @param {HTMLCanvasElement} canvasElement - Canvas 元素
     */
    async init(gameName, canvasElement) {
        this.gameName = gameName;
        
        console.log(`Loading game: ${gameName}`);
        
        // 加载游戏数据
        this.gameData = await ZipStore.loadZip(gameName);
        
        if (!this.gameData) {
            throw new Error(`Failed to load game: ${gameName}`);
        }
        
        // 解析配置
        const configText = new TextDecoder('utf-8').decode(
            this.gameData.Zip['gameconfig.txt']?.compressed_data
        );
        this.config.parse(configText);
        
        // 设置画布大小
        const imageSize = this.config.get('imagesize');
        canvasElement.width = imageSize[0];
        canvasElement.height = imageSize[1];
        
        // 初始化图形系统
        await this.graphics.init(canvasElement);
        
        // Canvas尺寸设置后，更新缩放（确保旋转时正确显示）
        if (window.updateCanvasScale) {
            window.updateCanvasScale();
            // 延迟再次更新，确保在iPhone上正确显示
            setTimeout(() => {
                if (window.updateCanvasScale) {
                    window.updateCanvasScale();
                }
            }, 100);
        }
        
        // 初始化音频
        this.audio.loadVolumeFromConfig();
        
        // 初始化存档系统
        await this.saveSystem.init();
        await this.saveSystem.loadGlobal();
        
        // 加载 PAK 文件索引
        await this._loadPakFiles();
        
        // 初始化 UI 模块（如果存在）
        if (typeof MenuSystem !== 'undefined') {
            this.menu = new MenuSystem(this);
        }
        if (typeof GallerySystem !== 'undefined') {
            this.gallery = new GallerySystem(this);
        }
        
        // 预加载 CG 列表（用于解锁判断）
        await this._loadCGList();
        
        console.log('Engine initialized');
    }

    /**
     * 开始游戏
     */
    async start() {
        this.running = true;
        
        // 显示 Logo
        await this._showLogos();
        
        // 加载起始脚本
        const startScript = this.config.get('startscript');
        await this.scriptParser.loadScript(startScript);
        
        // 运行脚本
        await this.scriptParser.run();
    }

    /**
     * 显示 Logo
     * @private
     */
    async _showLogos() {
        // Logo 1
        try {
            await this.graphics.showBackground('logo1', 'BG_ALPHA', 300);
            await this.sleep(1000);
        } catch (e) {
            console.warn('Logo1 not found');
        }
        
        // Logo 2
        try {
            await this.graphics.showBackground('logo2', 'BG_ALPHA', 300);
            await this.sleep(1000);
        } catch (e) {
            console.warn('Logo2 not found');
        }
    }

    /**
     * 加载 PAK 文件索引
     * @private
     */
    async _loadPakFiles() {
        const pakTypes = ['bg', 'chara', 'se', 'voice'];
        
        for (const type of pakTypes) {
            try {
                const pakPath = `${type}/${type}.pak`;
                const pakData = this.gameData.Zip[pakPath]?.compressed_data;
                
                if (pakData) {
                    const reader = new BinReader(pakData);
                    const fileCount = reader.readInt();
                    const index = {};
                    
                    for (let i = 0; i < fileCount; i++) {
                        const nameBytes = reader.read(32);
                        const rawName = this._removeNullEnd(nameBytes);
                        const offset = reader.readInt();
                        const length = reader.readInt();
                        index[rawName.toUpperCase()] = [offset, length];
                    }
                    
                    this.pakFiles[type] = { reader, index };
                    console.log(`Loaded ${type}.pak with ${fileCount} files`);
                }
            } catch (e) {
                console.warn(`Failed to load ${type}.pak`, e);
            }
        }
    }

    /**
     * 移除字符串末尾的 null 字符
     * @private
     */
    _removeNullEnd(data) {
        let index = data.length;
        for (let i = 0; i < data.length; i++) {
            if (data[i] === 0) {
                index = i;
                break;
            }
        }
        const trimmed = data.slice(0, index);
        return new TextDecoder('gbk').decode(trimmed).trim();
    }

    /**
     * 加载 CG 列表
     * @private
     */
    async _loadCGList() {
        this.cgList = [];
        
        try {
            // 尝试多个路径
            const paths = [
                'script/album_list.txt',
                'system/album_list.txt',
                'album_list.txt'
            ];
            
            let data = null;
            for (const path of paths) {
                data = this.gameData.Zip[path]?.compressed_data;
                if (data) break;
            }
            
            if (!data) {
                console.log('No album_list.txt found');
                return;
            }
            
            const text = new TextDecoder('utf-8').decode(data);
            const lines = text.split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith(';'));
            
            // 解析 album_list 格式：页数,图片数,解锁状态,图片1,图片2,...
            for (const line of lines) {
                const parts = line.split(',');
                if (parts.length >= 4) {
                    for (let i = 3; i < parts.length; i++) {
                        const cgNum = parts[i].trim();
                        if (cgNum && !this.cgList.includes(cgNum)) {
                            this.cgList.push(cgNum);
                        }
                    }
                }
            }
            
            console.log('Loaded CG list for unlock checking:', this.cgList.length, 'items');
        } catch (e) {
            console.warn('Failed to load CG list', e);
        }
    }

    /**
     * 绑定事件
     * @private
     */
    _bindEvents() {
        document.addEventListener('keydown', (e) => {
            if (this.waitingForKey && this.keyResolver) {
                this.waitingForKey = false;
                this.keyResolver();
                this.keyResolver = null;
            }
        });
        
        // 触摸/点击事件
        document.addEventListener('click', () => {
            if (this.waitingForKey && this.keyResolver) {
                this.waitingForKey = false;
                this.keyResolver();
                this.keyResolver = null;
            }
        });
    }

    /**
     * 等待按键
     * @param {number} timeout - 超时时间（毫秒）
     */
    async waitForKey(timeout = 0) {
        this.waitingForKey = true;
        
        return new Promise((resolve) => {
            this.keyResolver = resolve;
            
            if (timeout > 0) {
                setTimeout(() => {
                    if (this.waitingForKey) {
                        this.waitingForKey = false;
                        this.keyResolver = null;
                        resolve();
                    }
                }, timeout);
            }
        });
    }

    /**
     * 延时
     * @param {number} ms - 毫秒
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 清理缓存
     */
    clearCache() {
        // 清理立绘缓存等
        this.graphics.characters = {};
    }

    /**
     * 解锁 CG
     */
    unlockCG(filename) {
        if (!this.globalData.unlockedCG.includes(filename)) {
            this.globalData.unlockedCG.push(filename);
            this.saveSystem.saveGlobal();
        }
    }

    /**
     * 显示读档界面
     */
    async showLoadScreen(saveNum = null) {
        if (saveNum !== null) {
            // 直接读取指定存档
            const success = await this.saveSystem.load(saveNum);
            if (success) {
                // 继续执行脚本
                await this.scriptParser.run();
            }
        } else {
            // 显示读档界面
            if (this.menu) {
                return new Promise((resolve) => {
                    this.menu.showSavePanel('load', (loaded) => {
                        // 无论是否加载成功，都要 resolve
                        // 如果加载成功，菜单会处理后续逻辑
                        // 如果取消，继续执行脚本
                        resolve(loaded);
                    });
                });
            } else {
                console.warn('Menu system not initialized');
            }
        }
    }

    /**
     * 播放视频
     * @param {string} filename - 视频文件名
     */
    async playMovie(filename) {
        const canvas = this.graphics.canvas;
        const container = canvas.parentElement;
        
        // 创建视频元素
        const video = document.createElement('video');
        video.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #000;
            z-index: 100;
            object-fit: contain;
        `;
        video.playsInline = true;
        video.autoplay = true;
        
        // 加载视频文件
        try {
            const videoData = await ZipStore.getFile(this.gameName, `movie/${filename}`);
            if (!videoData) {
                // 尝试其他路径
                const altData = await ZipStore.getFile(this.gameName, filename);
                if (!altData) {
                    console.warn('Movie not found:', filename);
                    return;
                }
            }
            
            // 确定 MIME 类型
            let mimeType = 'video/mp4';
            const ext = filename.split('.').pop().toLowerCase();
            if (ext === 'webm') mimeType = 'video/webm';
            else if (ext === 'ogv' || ext === 'ogg') mimeType = 'video/ogg';
            else if (ext === 'avi') mimeType = 'video/avi';
            
            const blob = new Blob([videoData.compressed_data || videoData], { type: mimeType });
            video.src = URL.createObjectURL(blob);
        } catch (e) {
            console.error('Failed to load movie:', filename, e);
            return;
        }
        
        container.appendChild(video);
        
        // 等待视频播放完成
        return new Promise((resolve) => {
            // 点击跳过
            const skipHandler = () => {
                video.pause();
                cleanup();
                resolve();
            };
            
            video.addEventListener('click', skipHandler);
            document.addEventListener('keydown', skipHandler, { once: true });
            
            // 播放结束
            video.addEventListener('ended', () => {
                cleanup();
                resolve();
            });
            
            // 播放错误
            video.addEventListener('error', (e) => {
                console.error('Video playback error:', e);
                cleanup();
                resolve();
            });
            
            const cleanup = () => {
                video.removeEventListener('click', skipHandler);
                if (video.parentElement) {
                    video.parentElement.removeChild(video);
                }
                URL.revokeObjectURL(video.src);
            };
            
            // 开始播放
            video.play().catch(e => {
                console.warn('Video autoplay blocked:', e);
                // 显示点击播放提示
                const playHint = document.createElement('div');
                playHint.textContent = '点击播放视频';
                playHint.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    color: #fff;
                    font-size: 18px;
                    z-index: 101;
                    cursor: pointer;
                    background: rgba(0,0,0,0.5);
                    padding: 16px 32px;
                    border-radius: 8px;
                `;
                container.appendChild(playHint);
                
                playHint.onclick = () => {
                    playHint.remove();
                    video.play();
                };
            });
        });
    }

    // ==================== UI 方法 ====================

    async _showAlbum(listName) {
        if (this.gallery) {
            await this.gallery.showAlbum(listName);
        } else {
            console.warn('Gallery system not initialized');
        }
    }

    async _showMusicGallery() {
        if (this.gallery) {
            await this.gallery.showMusicGallery();
        } else {
            console.warn('Gallery system not initialized');
        }
    }

    async _showConfig() {
        if (this.menu) {
            this.menu.showConfigPanel();
        } else {
            console.warn('Menu system not initialized');
        }
    }

    /**
     * 打开菜单
     */
    openMenu() {
        if (this.menu) {
            this.menu.showMainMenu();
        }
    }

    /**
     * 脚本结束回调
     */
    onScriptEnd() {
        console.log('Game script ended');
        
        // 停止 BGM
        this.audio.stopBGM();
        
        // 显示结束提示
        this._showEndScreen();
    }

    /**
     * 显示结束画面
     * @private
     */
    _showEndScreen() {
        const container = document.getElementById('game-container');
        
        const endScreen = document.createElement('div');
        endScreen.className = 'end-screen';
        endScreen.innerHTML = `
            <div class="end-content">
                <div class="end-title">游戏结束</div>
                <div class="end-message">感谢您的游玩！</div>
                <div class="end-buttons">
                    <button class="end-btn" data-action="title">返回标题</button>
                    <button class="end-btn" data-action="home">返回主页</button>
                </div>
            </div>
        `;
        
        // 返回标题（重新开始游戏）
        endScreen.querySelector('[data-action="title"]').addEventListener('click', () => {
            endScreen.remove();
            this.restart();
        });
        
        // 返回主页
        endScreen.querySelector('[data-action="home"]').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        // 键盘支持
        let selectedBtn = 0;
        const buttons = endScreen.querySelectorAll('.end-btn');
        buttons[0].classList.add('selected');
        
        const keyHandler = (e) => {
            e.stopImmediatePropagation();
            const key = window.mapKeyForRotation ? window.mapKeyForRotation(e.key) : e.key;
            
            switch (key) {
                case 'ArrowUp':
                case 'ArrowLeft':
                case '2':
                case '4':
                    selectedBtn = 0;
                    buttons.forEach((b, i) => b.classList.toggle('selected', i === selectedBtn));
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                case 'ArrowRight':
                case '8':
                case '6':
                    selectedBtn = 1;
                    buttons.forEach((b, i) => b.classList.toggle('selected', i === selectedBtn));
                    e.preventDefault();
                    break;
                case 'Enter':
                case '5':
                case ' ':
                    document.removeEventListener('keydown', keyHandler, true);
                    buttons[selectedBtn].click();
                    e.preventDefault();
                    break;
            }
        };
        
        document.addEventListener('keydown', keyHandler, true);
        
        container.appendChild(endScreen);
    }

    /**
     * 重新开始游戏
     */
    async restart() {
        // 清除变量
        this.variables.clearVariables();
        
        // 重新加载起始脚本
        const startScript = this.config.get('startscript') || 'start';
        await this.scriptParser.loadScript(startScript);
        this.running = true;
        await this.scriptParser.run();
    }

    // ==================== 生命周期 ====================

    /**
     * 暂停游戏
     */
    pause() {
        this.running = false;
        this.audio.pauseBGM();
    }

    /**
     * 恢复游戏
     */
    resume() {
        this.running = true;
        this.audio.resumeBGM();
    }

    /**
     * 销毁引擎
     */
    destroy() {
        this.running = false;
        this.audio.destroy();
        this.gameData = null;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PyMOEngine;
}

