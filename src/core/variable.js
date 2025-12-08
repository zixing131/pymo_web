/**
 * PyMO Web - 变量系统
 * 管理游戏变量（普通变量和全局变量）
 */

class VariableSystem {
    constructor() {
        // 普通变量（会随存档保存/读取）
        this.variables = {};
        
        // 全局变量（以 S 开头，不受读档影响）
        this.globalVariables = {};
        
        // 系统变量
        this.systemVariables = {
            FSEL: 0,      // 选择结果
            FMONTH: 1,    // 游戏月份
            FDATE: 1      // 游戏日期
        };
    }

    /**
     * 判断是否为全局变量
     * @param {string} name - 变量名
     * @returns {boolean}
     */
    isGlobal(name) {
        return name.startsWith('S') && name.length > 1 && /^S\d/.test(name);
    }

    /**
     * 判断是否为系统变量
     * @param {string} name - 变量名
     * @returns {boolean}
     */
    isSystem(name) {
        return name in this.systemVariables;
    }

    /**
     * 获取变量值
     * @param {string} name - 变量名
     * @returns {number} 变量值，未定义返回 0
     */
    get(name) {
        if (this.isSystem(name)) {
            return this.systemVariables[name];
        }
        if (this.isGlobal(name)) {
            return this.globalVariables[name] ?? 0;
        }
        return this.variables[name] ?? 0;
    }

    /**
     * 设置变量值
     * @param {string} name - 变量名
     * @param {number|string} value - 变量值（可以是数字或另一个变量名）
     */
    set(name, value) {
        // 如果 value 是变量名，获取其值
        const actualValue = this._resolveValue(value);
        
        if (this.isSystem(name)) {
            this.systemVariables[name] = actualValue;
        } else if (this.isGlobal(name)) {
            this.globalVariables[name] = actualValue;
        } else {
            this.variables[name] = actualValue;
        }
    }

    /**
     * 变量加法
     * @param {string} name - 变量名
     * @param {number|string} value - 要加的值
     */
    add(name, value) {
        const currentValue = this.get(name);
        const addValue = this._resolveValue(value);
        
        if (addValue === null) return; // 如果是未定义的变量，不执行
        
        this.set(name, currentValue + addValue);
    }

    /**
     * 变量减法
     * @param {string} name - 变量名
     * @param {number|string} value - 要减的值
     */
    sub(name, value) {
        const currentValue = this.get(name);
        const subValue = this._resolveValue(value);
        
        if (subValue === null) return;
        
        this.set(name, currentValue - subValue);
    }

    /**
     * 生成随机数
     * @param {string} name - 变量名
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     */
    rand(name, min, max) {
        const value = Math.floor(Math.random() * (max - min + 1)) + min;
        this.set(name, value);
    }

    /**
     * 解析值（可能是数字或变量名）
     * @private
     * @param {number|string} value
     * @returns {number|null}
     */
    _resolveValue(value) {
        if (typeof value === 'number') {
            return value;
        }
        
        const num = parseInt(value);
        if (!isNaN(num)) {
            return num;
        }
        
        // 是变量名
        if (this._isDefined(value)) {
            return this.get(value);
        }
        
        return null;
    }

    /**
     * 检查变量是否已定义
     * @private
     */
    _isDefined(name) {
        if (this.isSystem(name)) {
            return true;
        }
        if (this.isGlobal(name)) {
            return name in this.globalVariables;
        }
        return name in this.variables;
    }

    /**
     * 条件比较
     * @param {string} condition - 条件表达式，如 "F11=0", "F11>=S1"
     * @returns {boolean} 条件是否成立
     */
    evaluate(condition) {
        // 支持的操作符：=, >, <, >=, <=, !=
        const operators = ['>=', '<=', '!=', '=', '>', '<'];
        
        for (const op of operators) {
            const index = condition.indexOf(op);
            if (index === -1) continue;
            
            const left = condition.substring(0, index).trim();
            const right = condition.substring(index + op.length).trim();
            
            const leftValue = this._resolveValue(left);
            const rightValue = this._resolveValue(right);
            
            // 如果右操作数是未定义的变量，返回 false
            if (rightValue === null) {
                return false;
            }
            
            // 如果左操作数是未定义的变量，当作 0
            const lv = leftValue ?? 0;
            
            switch (op) {
                case '=':  return lv === rightValue;
                case '!=': return lv !== rightValue;
                case '>':  return lv > rightValue;
                case '<':  return lv < rightValue;
                case '>=': return lv >= rightValue;
                case '<=': return lv <= rightValue;
            }
        }
        
        return false;
    }

    /**
     * 获取普通变量的存档数据
     * @returns {Object}
     */
    getSaveData() {
        return {
            variables: { ...this.variables },
            systemVariables: { ...this.systemVariables }
        };
    }

    /**
     * 从存档恢复普通变量
     * @param {Object} data
     */
    loadSaveData(data) {
        if (data.variables) {
            this.variables = { ...data.variables };
        }
        if (data.systemVariables) {
            Object.assign(this.systemVariables, data.systemVariables);
        }
    }

    /**
     * 获取全局变量的存档数据
     * @returns {Object}
     */
    getGlobalData() {
        return { ...this.globalVariables };
    }

    /**
     * 加载全局变量
     * @param {Object} data
     */
    loadGlobalData(data) {
        this.globalVariables = { ...data };
    }

    /**
     * 清除普通变量（开始新游戏时调用）
     */
    clearVariables() {
        this.variables = {};
        this.systemVariables = {
            FSEL: 0,
            FMONTH: 1,
            FDATE: 1
        };
    }

    /**
     * 清除所有变量（调试用）
     */
    clearAll() {
        this.variables = {};
        this.globalVariables = {};
        this.systemVariables = {
            FSEL: 0,
            FMONTH: 1,
            FDATE: 1
        };
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VariableSystem;
}

