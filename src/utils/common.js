/**
 * PyMO Web - 通用工具函数
 */

/**
 * 二进制数据读取器
 */
class BinReader {
    constructor(data) {
        if (data instanceof ArrayBuffer) {
            this.data = new Uint8Array(data);
        } else if (data instanceof Uint8Array) {
            this.data = data;
        } else {
            throw new Error('Invalid data type for BinReader');
        }
        this.cursor = 0;
    }

    /**
     * 读取指定字节数
     */
    read(num) {
        const result = this.data.slice(this.cursor, this.cursor + num);
        this.cursor += num;
        return result;
    }

    /**
     * 读取 32 位整数（小端序）
     */
    readInt() {
        const bytes = this.read(4);
        return bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24);
    }

    /**
     * 读取 16 位整数（小端序）
     */
    readShort() {
        const bytes = this.read(2);
        return bytes[0] | (bytes[1] << 8);
    }

    /**
     * 读取单个字节
     */
    readByte() {
        return this.read(1)[0];
    }

    /**
     * 从指定位置读取
     */
    readAt(offset, length) {
        return this.data.slice(offset, offset + length);
    }

    /**
     * 移动光标
     */
    seek(position) {
        this.cursor = position;
    }

    /**
     * 获取当前位置
     */
    tell() {
        return this.cursor;
    }

    /**
     * 检查是否到达末尾
     */
    eof() {
        return this.cursor >= this.data.length;
    }
}

/**
 * ZIP 文件存储管理
 * 注意：这个是简化版，实际游戏数据存储在 IndexedDB 中（由 fs.js 的 ZipStore 管理）
 * 这里我们直接使用全局的 ZipStore（来自 fs.js）
 */

// 如果全局 ZipStore 不存在（新版页面没有引入 fs.js），则创建一个兼容版本
if (typeof ZipStore === 'undefined') {
    var ZipStore = {
        DATABASE: 'ZipStore',
        VERSION: 2,
        OBJECT_STORE: 'files_v2',
        KEY_PATH: 'ZipName',
        database: null,
        cache: {},

        /**
         * 打开数据库
         */
        async openDatabase() {
            if (this.database) return this.database;

            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.DATABASE, this.VERSION);
                
                request.onerror = () => {
                    console.error('Error opening database:', request.error);
                    reject(request.error);
                };

                request.onupgradeneeded = (event) => {
                    const db = request.result;
                    if (event.oldVersion < 1) {
                        db.createObjectStore('files', { keyPath: this.KEY_PATH });
                    }
                    if (event.oldVersion < 2) {
                        if (db.objectStoreNames.contains('files')) {
                            db.deleteObjectStore('files');
                        }
                        db.createObjectStore(this.OBJECT_STORE, { keyPath: this.KEY_PATH });
                    }
                };

                request.onsuccess = () => {
                    this.database = request.result;
                    resolve(this.database);
                };
            });
        },

        /**
         * 加载游戏数据
         */
        async loadZip(gameName) {
            // 检查缓存
            if (this.cache[gameName]) {
                return this.cache[gameName];
            }

            try {
                const db = await this.openDatabase();
                
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction(this.OBJECT_STORE, 'readonly');
                    const objectStore = transaction.objectStore(this.OBJECT_STORE);
                    const request = objectStore.get(gameName);

                    request.onerror = () => {
                        console.error('Error loading game:', request.error);
                        reject(request.error);
                    };

                    transaction.oncomplete = () => {
                        if (request.result) {
                            this.cache[gameName] = request.result;
                            resolve(request.result);
                        } else {
                            console.error('Game not found in database:', gameName);
                            resolve(null);
                        }
                    };
                });
            } catch (e) {
                console.error('Failed to load game:', e);
                return null;
            }
        },

        /**
         * 获取所有游戏
         */
        async getAll() {
            try {
                const db = await this.openDatabase();
                
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction(this.OBJECT_STORE, 'readonly');
                    const objectStore = transaction.objectStore(this.OBJECT_STORE);
                    const request = objectStore.getAll();

                    request.onerror = () => reject(request.error);
                    transaction.oncomplete = () => resolve(request.result || []);
                });
            } catch (e) {
                console.error('Failed to get all games:', e);
                return [];
            }
        },

        /**
         * 安装游戏
         */
        async installGame(zipName, zipData) {
            try {
                const db = await this.openDatabase();
                const zip = new ZipFile(zipData, true);

                return new Promise((resolve, reject) => {
                    const transaction = db.transaction(this.OBJECT_STORE, 'readwrite');
                    const objectStore = transaction.objectStore(this.OBJECT_STORE);
                    const request = objectStore.put({ 
                        ZipName: zipName, 
                        Zip: zip.directory 
                    });

                    request.onerror = () => reject(request.error);
                    transaction.oncomplete = () => {
                        this.cache[zipName] = { ZipName: zipName, Zip: zip.directory };
                        resolve();
                    };
                });
            } catch (e) {
                console.error('Failed to install game:', e);
                throw e;
            }
        },

        /**
         * 删除游戏
         */
        async deleteZip(zipName) {
            try {
                const db = await this.openDatabase();
                
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction(this.OBJECT_STORE, 'readwrite');
                    const objectStore = transaction.objectStore(this.OBJECT_STORE);
                    const request = objectStore.delete(zipName);

                    request.onerror = () => reject(request.error);
                    transaction.oncomplete = () => {
                        delete this.cache[zipName];
                        resolve();
                    };
                });
            } catch (e) {
                console.error('Failed to delete game:', e);
                throw e;
            }
        },

        /**
         * 清除缓存
         */
        clearCache(gameName = null) {
            if (gameName) {
                delete this.cache[gameName];
            } else {
                this.cache = {};
            }
        }
    };
}

/**
 * 文本编码转换
 */
const TextCodec = {
    /**
     * GBK 解码（使用 TextDecoder）
     */
    decodeGBK(data) {
        try {
            const decoder = new TextDecoder('gbk');
            return decoder.decode(data);
        } catch (e) {
            // 回退到 UTF-8
            return new TextDecoder('utf-8').decode(data);
        }
    },

    /**
     * UTF-8 解码
     */
    decodeUTF8(data) {
        return new TextDecoder('utf-8').decode(data);
    },

    /**
     * 移除字符串末尾的空字符
     */
    trimNull(str) {
        const nullIndex = str.indexOf('\0');
        return nullIndex >= 0 ? str.substring(0, nullIndex) : str;
    }
};

/**
 * 游戏列表获取
 */
async function getGameList() {
    try {
        const response = await fetch('../gamepackage/');
        const html = await response.text();
        
        const games = [];
        const regex = /href="([^"]+\.zip)"/gi;
        let match;
        
        while ((match = regex.exec(html)) !== null) {
            const filename = match[1];
            const gameName = filename.replace('.zip', '');
            games.push(gameName);
        }
        
        return games;
    } catch (e) {
        console.error('Failed to get game list:', e);
        return [];
    }
}

/**
 * 动画帧请求包装
 */
function requestFrame() {
    return new Promise(resolve => requestAnimationFrame(resolve));
}

/**
 * 延时函数
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 线性插值
 */
function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * 限制值在范围内
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * 深拷贝对象
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * 格式化日期时间
 */
function formatDateTime(date) {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hour}:${minute}`;
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        BinReader,
        ZipStore,
        TextCodec,
        getGameList,
        requestFrame,
        delay,
        lerp,
        clamp,
        deepClone,
        formatDateTime
    };
}

