/**
 * PyMO Web - 存档系统
 * 管理游戏存档、读档、自动存档
 */

class SaveSystem {
    constructor(engine) {
        this.engine = engine;
        this.maxSlots = 100;
        this.autoSaveSlot = 0;
        
        // 存档数据库名称
        this.dbName = 'PyMOSaves';
        this.dbVersion = 1;
        this.db = null;
    }

    /**
     * 初始化存档系统
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('Failed to open save database');
                reject(request.error);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 创建存档存储
                if (!db.objectStoreNames.contains('saves')) {
                    db.createObjectStore('saves', { keyPath: 'id' });
                }
                
                // 创建全局数据存储
                if (!db.objectStoreNames.contains('global')) {
                    db.createObjectStore('global', { keyPath: 'gameName' });
                }
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
        });
    }

    /**
     * 获取存档 ID
     * @private
     */
    _getSaveId(gameName, slotIndex) {
        return `${gameName}_${slotIndex}`;
    }

    /**
     * 保存游戏
     * @param {number} slotIndex - 存档槽位（0 为自动存档）
     */
    async save(slotIndex) {
        const gameName = this.engine.gameName;
        const saveId = this._getSaveId(gameName, slotIndex);
        
        // 收集存档数据
        const saveData = {
            id: saveId,
            gameName,
            slotIndex,
            saveTime: new Date().toISOString(),
            
            // 脚本状态
            scriptName: this.engine.scriptParser.scriptName,
            lineNum: this.engine.scriptParser.currentLine,
            title: this.engine.save.title || '',
            
            // 背景
            bg: this.engine.save.bg,
            bgpercentorig: this.engine.save.bgpercentorig,
            
            // 立绘
            chara: JSON.parse(JSON.stringify(this.engine.save.chara || {})),
            
            // 变量
            variables: this.engine.variables.getSaveData(),
            
            // 对话
            name: this.engine.save.name,
            message: this.engine.save.message,
            
            // 音频
            audio: this.engine.audio.getSaveData(),
            
            // 截图（缩略图）
            thumbnail: this._captureThumbnail()
        };
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['saves'], 'readwrite');
            const store = transaction.objectStore('saves');
            
            const request = store.put(saveData);
            
            request.onsuccess = () => {
                console.log(`Game saved to slot ${slotIndex}`);
                resolve(true);
            };
            
            request.onerror = () => {
                console.error('Failed to save game');
                reject(request.error);
            };
        });
    }

    /**
     * 读取存档
     * @param {number} slotIndex - 存档槽位
     */
    async load(slotIndex) {
        const gameName = this.engine.gameName;
        const saveId = this._getSaveId(gameName, slotIndex);
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['saves'], 'readonly');
            const store = transaction.objectStore('saves');
            
            const request = store.get(saveId);
            
            request.onsuccess = async () => {
                const saveData = request.result;
                
                if (!saveData) {
                    resolve(false);
                    return;
                }
                
                try {
                    // 恢复状态
                    await this._restoreState(saveData);
                    resolve(true);
                } catch (e) {
                    console.error('Failed to restore save', e);
                    reject(e);
                }
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * 恢复游戏状态
     * @private
     */
    async _restoreState(saveData) {
        const engine = this.engine;
        
        // 恢复变量
        engine.variables.loadSaveData(saveData.variables);
        
        // 恢复存档数据
        engine.save = {
            title: saveData.title,
            bg: saveData.bg,
            bgpercentorig: saveData.bgpercentorig,
            chara: saveData.chara,
            name: saveData.name,
            message: saveData.message
        };
        
        // 加载脚本
        await engine.scriptParser.loadScript(saveData.scriptName);
        engine.scriptParser.currentLine = saveData.lineNum;
        
        // 恢复图形
        if (saveData.bg) {
            await engine.graphics.loadBackground(saveData.bg, saveData.bgpercentorig || [0, 0]);
            engine.graphics.bgImg.blit(engine.graphics.currentBg, engine.graphics.bgOrigin);
            engine.graphics.finalImg.blit(engine.graphics.bgImg);
        }
        
        // 恢复立绘
        if (saveData.chara) {
            for (const id in saveData.chara) {
                const charaData = saveData.chara[id];
                if (charaData.chara_visible) {
                    await engine.graphics.loadCharacter(id, charaData.filename);
                    // 恢复位置等信息...
                }
            }
            await engine.graphics.displayCharacters(0);
        }
        
        // 恢复音频
        await engine.audio.loadSaveData(saveData.audio);
        
        engine.graphics.updateScreen();
    }

    /**
     * 获取存档列表
     */
    async getSaveList() {
        const gameName = this.engine.gameName;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['saves'], 'readonly');
            const store = transaction.objectStore('saves');
            
            const request = store.getAll();
            
            request.onsuccess = () => {
                const allSaves = request.result || [];
                const gameSaves = allSaves
                    .filter(s => s.gameName === gameName)
                    .sort((a, b) => a.slotIndex - b.slotIndex);
                resolve(gameSaves);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * 删除存档
     */
    async deleteSave(slotIndex) {
        const gameName = this.engine.gameName;
        const saveId = this._getSaveId(gameName, slotIndex);
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['saves'], 'readwrite');
            const store = transaction.objectStore('saves');
            
            const request = store.delete(saveId);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 自动存档
     */
    async autoSave() {
        return this.save(this.autoSaveSlot);
    }

    /**
     * 检查存档是否存在
     */
    async hasSave(slotIndex) {
        const gameName = this.engine.gameName;
        const saveId = this._getSaveId(gameName, slotIndex);
        
        return new Promise((resolve) => {
            const transaction = this.db.transaction(['saves'], 'readonly');
            const store = transaction.objectStore('saves');
            
            const request = store.get(saveId);
            request.onsuccess = () => resolve(!!request.result);
            request.onerror = () => resolve(false);
        });
    }

    /**
     * 捕获缩略图
     * @private
     */
    _captureThumbnail() {
        try {
            const canvas = this.engine.graphics.canvas;
            
            // 创建缩略图
            const thumbWidth = 120;
            const thumbHeight = 90;
            const thumbCanvas = document.createElement('canvas');
            thumbCanvas.width = thumbWidth;
            thumbCanvas.height = thumbHeight;
            const ctx = thumbCanvas.getContext('2d');
            
            ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height,
                         0, 0, thumbWidth, thumbHeight);
            
            return thumbCanvas.toDataURL('image/jpeg', 0.7);
        } catch (e) {
            console.warn('Failed to capture thumbnail', e);
            return null;
        }
    }

    // ==================== 全局数据 ====================

    /**
     * 保存全局数据（全局变量、CG 解锁等）
     */
    async saveGlobal() {
        const gameName = this.engine.gameName;
        
        const globalData = {
            gameName,
            variables: this.engine.variables.getGlobalData(),
            unlockedCG: this.engine.globalData.unlockedCG || [],
            selectedChoices: this.engine.globalData.selectedChoices || {}
        };
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['global'], 'readwrite');
            const store = transaction.objectStore('global');
            
            const request = store.put(globalData);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 加载全局数据
     */
    async loadGlobal() {
        const gameName = this.engine.gameName;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['global'], 'readonly');
            const store = transaction.objectStore('global');
            
            const request = store.get(gameName);
            
            request.onsuccess = () => {
                const data = request.result;
                
                if (data) {
                    this.engine.variables.loadGlobalData(data.variables || {});
                    this.engine.globalData.unlockedCG = data.unlockedCG || [];
                    this.engine.globalData.selectedChoices = data.selectedChoices || {};
                }
                
                resolve(data);
            };
            
            request.onerror = () => reject(request.error);
        });
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SaveSystem;
}

