/**
 * PyMO Web - 音频系统
 * 管理背景音乐、音效、语音的播放
 */

class AudioSystem {
    constructor(engine) {
        this.engine = engine;
        
        // 音频元素
        this.bgmAudio = null;
        this.seAudio = null;
        this.voiceAudio = null;
        
        // 音量设置
        this.bgmVolume = 0.5;
        this.seVolume = 0.5;
        this.voiceVolume = 0.5;
        
        // 当前播放状态
        this.currentBgm = '';
        this.currentSe = '';
        this.currentVoice = '';
        this.bgmLoop = true;
        this.seLoop = false;
        
        // 初始化音频元素
        this._initAudioElements();
    }

    /**
     * 初始化音频元素
     * @private
     */
    _initAudioElements() {
        this.bgmAudio = new Audio();
        this.bgmAudio.volume = this.bgmVolume;
        
        this.seAudio = new Audio();
        this.seAudio.volume = this.seVolume;
        
        this.voiceAudio = new Audio();
        this.voiceAudio.volume = this.voiceVolume;
        
        // BGM 循环处理
        this.bgmAudio.addEventListener('ended', () => {
            if (this.bgmLoop) {
                this.bgmAudio.currentTime = 0;
                this.bgmAudio.play().catch(() => {});
            }
        });
        
        // SE 循环处理
        this.seAudio.addEventListener('ended', () => {
            if (this.seLoop) {
                this.seAudio.currentTime = 0;
                this.seAudio.play().catch(() => {});
            }
        });
    }

    /**
     * 设置音量
     * @param {string} type - 'bgm', 'se', 或 'voice'
     * @param {number} volume - 音量 0-10
     */
    setVolume(type, volume) {
        const normalizedVolume = Math.max(0, Math.min(1, volume / 10));
        
        switch (type) {
            case 'bgm':
                this.bgmVolume = normalizedVolume;
                if (this.bgmAudio) this.bgmAudio.volume = normalizedVolume;
                break;
            case 'se':
                this.seVolume = normalizedVolume;
                if (this.seAudio) this.seAudio.volume = normalizedVolume;
                break;
            case 'voice':
                this.voiceVolume = normalizedVolume;
                if (this.voiceAudio) this.voiceAudio.volume = normalizedVolume;
                break;
        }
    }

    /**
     * 加载音频文件
     * @private
     */
    async _loadAudio(filename, folder, format) {
        try {
            // 尝试从 PAK 加载
            const pakInfo = this.engine.pakFiles[folder];
            if (pakInfo && pakInfo.index[filename.toUpperCase()]) {
                const [offset, length] = pakInfo.index[filename.toUpperCase()];
                const data = pakInfo.reader.readAt(offset, length);
                const blob = new Blob([data], { type: 'audio/mpeg' });
                return URL.createObjectURL(blob);
            }
            
            // 从 ZIP 直接加载
            const path = `${folder}/${filename}${format}`;
            const fileData = this.engine.gameData.Zip[path]?.compressed_data;
            
            if (!fileData) {
                console.warn(`Audio not found: ${path}`);
                return null;
            }
            
            const blob = new Blob([fileData], { type: 'audio/mpeg' });
            return URL.createObjectURL(blob);
        } catch (e) {
            console.error(`Failed to load audio: ${filename}`, e);
            return null;
        }
    }

    // ==================== BGM ====================

    /**
     * 播放背景音乐
     * @param {string} filename - 文件名（不含扩展名）
     * @param {boolean} loop - 是否循环
     */
    async playBGM(filename, loop = true) {
        // 如果正在播放相同的 BGM，不重新加载
        if (this.currentBgm === filename && !this.bgmAudio.paused) {
            return;
        }
        
        this.stopBGM();
        
        const format = this.engine.config.get('bgmformat') || '.mp3';
        const url = await this._loadAudio(filename, 'bgm', format);
        
        if (!url) return;
        
        this.currentBgm = filename;
        this.bgmLoop = loop;
        this.bgmAudio.src = url;
        this.bgmAudio.loop = loop;
        
        try {
            await this.bgmAudio.play();
        } catch (e) {
            console.warn('BGM play failed (user interaction required):', e);
        }
        
        // 保存到存档
        this.engine.save.bgm = filename;
        this.engine.save.bgmLoop = loop;
    }

    /**
     * 停止背景音乐
     */
    stopBGM() {
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio.currentTime = 0;
            
            // 释放 URL
            if (this.bgmAudio.src.startsWith('blob:')) {
                URL.revokeObjectURL(this.bgmAudio.src);
            }
        }
        this.currentBgm = '';
        this.engine.save.bgm = '';
    }

    /**
     * 暂停 BGM
     */
    pauseBGM() {
        if (this.bgmAudio && !this.bgmAudio.paused) {
            this.bgmAudio.pause();
        }
    }

    /**
     * 恢复 BGM
     */
    resumeBGM() {
        if (this.bgmAudio && this.bgmAudio.paused && this.currentBgm) {
            this.bgmAudio.play().catch(() => {});
        }
    }

    // ==================== SE ====================

    /**
     * 播放音效
     * @param {string} filename - 文件名（不含扩展名）
     * @param {boolean} loop - 是否循环
     */
    async playSE(filename, loop = false) {
        this.stopSE();
        
        const format = this.engine.config.get('seformat') || '.wav';
        const url = await this._loadAudio(filename, 'se', format);
        
        if (!url) return;
        
        this.currentSe = filename;
        this.seLoop = loop;
        this.seAudio.src = url;
        
        try {
            await this.seAudio.play();
        } catch (e) {
            console.warn('SE play failed:', e);
        }
    }

    /**
     * 停止音效
     */
    stopSE() {
        if (this.seAudio) {
            this.seAudio.pause();
            this.seAudio.currentTime = 0;
            
            if (this.seAudio.src.startsWith('blob:')) {
                URL.revokeObjectURL(this.seAudio.src);
            }
        }
        this.currentSe = '';
        this.seLoop = false;
    }

    /**
     * 等待音效播放完毕
     */
    async waitForSE() {
        if (!this.seAudio || this.seAudio.paused || this.seLoop) {
            return;
        }
        
        return new Promise((resolve) => {
            const checkEnded = () => {
                if (this.seAudio.paused || this.seAudio.ended) {
                    resolve();
                } else {
                    setTimeout(checkEnded, 100);
                }
            };
            
            // 也允许按键跳过
            const keyHandler = () => {
                document.removeEventListener('keydown', keyHandler);
                resolve();
            };
            document.addEventListener('keydown', keyHandler);
            
            checkEnded();
        });
    }

    // ==================== Voice ====================

    /**
     * 播放语音
     * @param {string} filename - 文件名（不含扩展名）
     */
    async playVoice(filename) {
        this.stopVoice();
        
        const format = this.engine.config.get('voiceformat') || '.mp3';
        const url = await this._loadAudio(filename, 'voice', format);
        
        if (!url) return;
        
        this.currentVoice = filename;
        this.voiceAudio.src = url;
        
        try {
            await this.voiceAudio.play();
        } catch (e) {
            console.warn('Voice play failed:', e);
        }
    }

    /**
     * 停止语音
     */
    stopVoice() {
        if (this.voiceAudio) {
            this.voiceAudio.pause();
            this.voiceAudio.currentTime = 0;
            
            if (this.voiceAudio.src.startsWith('blob:')) {
                URL.revokeObjectURL(this.voiceAudio.src);
            }
        }
        this.currentVoice = '';
    }

    /**
     * 语音是否正在播放
     */
    isVoicePlaying() {
        return this.voiceAudio && !this.voiceAudio.paused && !this.voiceAudio.ended;
    }

    // ==================== 状态管理 ====================

    /**
     * 停止所有音频
     */
    stopAll() {
        this.stopBGM();
        this.stopSE();
        this.stopVoice();
    }

    /**
     * 从配置恢复音量
     */
    loadVolumeFromConfig() {
        const config = this.engine.config;
        this.setVolume('bgm', config.get('bgmvolume'));
        this.setVolume('voice', config.get('vovolume'));
        this.setVolume('se', config.get('bgmvolume')); // SE 使用和 BGM 相同的音量
    }

    /**
     * 获取存档数据
     */
    getSaveData() {
        return {
            bgm: this.currentBgm,
            bgmLoop: this.bgmLoop,
            bgmPosition: this.bgmAudio ? this.bgmAudio.currentTime : 0
        };
    }

    /**
     * 从存档恢复
     */
    async loadSaveData(data) {
        if (data.bgm) {
            await this.playBGM(data.bgm, data.bgmLoop !== false);
            if (data.bgmPosition && this.bgmAudio) {
                this.bgmAudio.currentTime = data.bgmPosition;
            }
        }
    }

    /**
     * 销毁
     */
    destroy() {
        this.stopAll();
        this.bgmAudio = null;
        this.seAudio = null;
        this.voiceAudio = null;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioSystem;
}

