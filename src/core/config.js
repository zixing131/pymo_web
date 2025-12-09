/**
 * PyMO Web - 配置管理器
 * 负责解析和管理 gameconfig.txt
 */

class ConfigManager {
    constructor() {
        // 默认配置
        this.defaults = {
            gametitle: 'PyMO Game',
            platform: 'pygame',
            engineversion: '1.2',
            scripttype: 'pymo',
            bgformat: '.jpg',
            charaformat: '.png',
            charamaskformat: '.png',
            bgmformat: '.mp3',
            seformat: '.wav',
            voiceformat: '.mp3',
            font: -1,
            fontsize: 16,
            fontaa: 1,
            hint: 1,
            prefetching: 1,
            grayselected: 1,
            playvideo: 1,
            textspeed: 3,
            bgmvolume: 5,
            vovolume: 5,
            imagesize: [320, 240],
            startscript: 'start',
            nameboxorig: [0, 7],
            cgprefix: 'EV_',
            textcolor: '#ffffff',
            msgtb: [4, 0],
            msglr: [12, 12],
            namealign: 'middle',
            anime: 1
        };
        
        this.config = { ...this.defaults };
    }

    /**
     * 从文本解析配置
     * @param {string} text - gameconfig.txt 的内容
     * @returns {Object} 配置对象
     */
    parse(text) {
        const lines = text.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(';')) continue;
            
            const parts = trimmed.split(',');
            if (parts.length < 2) continue;
            
            const key = parts[0].trim();
            const values = parts.slice(1).map(v => v.trim());
            
            this.config[key] = this._parseValue(key, values);
        }
        
        return this.config;
    }

    /**
     * 解析配置值
     * @private
     */
    _parseValue(key, values) {
        // 数组类型的配置项
        const arrayKeys = ['imagesize', 'nameboxorig', 'msgtb', 'msglr', 'textcolor'];
        
        if (arrayKeys.includes(key)) {
            if (key === 'textcolor') {
                return values[0];
            }
            return values.map(v => {
                const num = parseInt(v);
                return isNaN(num) ? v : num;
            });
        }
        
        // 字符串类型的配置项（保持原样，不转换为数字）
        const stringKeys = ['startscript', 'gametitle', 'scripttype', 'platform', 
                           'bgformat', 'charaformat', 'charamaskformat', 'bgmformat', 
                           'seformat', 'voiceformat', 'cgprefix', 'textcolor'];
        
        if (stringKeys.includes(key)) {
            return values[0];
        }
        
        // 单值：尝试解析为数字，如果失败则保持字符串
        const value = values[0];
        const num = parseInt(value);
        return isNaN(num) ? value : num;
    }

    /**
     * 获取配置项
     * @param {string} key - 配置项名称
     * @returns {*} 配置值
     */
    get(key) {
        return this.config[key] ?? this.defaults[key];
    }

    /**
     * 设置配置项
     * @param {string} key - 配置项名称
     * @param {*} value - 配置值
     */
    set(key, value) {
        this.config[key] = value;
    }

    /**
     * 获取所有配置
     * @returns {Object} 完整配置对象
     */
    getAll() {
        return { ...this.config };
    }

    /**
     * 解析颜色字符串为 RGB 数组
     * @param {string} colorStr - 颜色字符串，如 "#ffffff" 或 "WHITE"
     * @returns {number[]} RGB 数组 [r, g, b]
     */
    static parseColor(colorStr) {
        const colorMap = {
            'RED': [255, 0, 0],
            'GREEN': [0, 255, 0],
            'BLUE': [0, 0, 255],
            'WHITE': [255, 255, 255],
            'BLACK': [0, 0, 0],
            'YELLOW': [255, 255, 0]
        };

        if (colorMap[colorStr.toUpperCase()]) {
            return colorMap[colorStr.toUpperCase()];
        }

        if (colorStr.startsWith('#')) {
            const hex = colorStr.slice(1);
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            return [r, g, b];
        }

        return [255, 255, 255];
    }

    /**
     * RGB 数组转十六进制颜色字符串
     * @param {number[]} rgb - RGB 数组
     * @returns {string} 十六进制颜色字符串
     */
    static rgbToHex(rgb) {
        return '#' + rgb.map(c => c.toString(16).padStart(2, '0')).join('');
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigManager;
}

