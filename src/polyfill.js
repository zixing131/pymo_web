/**
 * Polyfills for Firefox 48 / KaiOS compatibility
 */

// String.prototype.padStart (Firefox 48+, 边界情况)
if (!String.prototype.padStart) {
    String.prototype.padStart = function(targetLength, padString) {
        targetLength = targetLength >> 0;
        padString = String(padString !== undefined ? padString : ' ');
        if (this.length >= targetLength) {
            return String(this);
        }
        targetLength = targetLength - this.length;
        if (targetLength > padString.length) {
            padString += padString.repeat(targetLength / padString.length);
        }
        return padString.slice(0, targetLength) + String(this);
    };
}

// String.prototype.padEnd
if (!String.prototype.padEnd) {
    String.prototype.padEnd = function(targetLength, padString) {
        targetLength = targetLength >> 0;
        padString = String(padString !== undefined ? padString : ' ');
        if (this.length >= targetLength) {
            return String(this);
        }
        targetLength = targetLength - this.length;
        if (targetLength > padString.length) {
            padString += padString.repeat(targetLength / padString.length);
        }
        return String(this) + padString.slice(0, targetLength);
    };
}

// String.prototype.repeat
if (!String.prototype.repeat) {
    String.prototype.repeat = function(count) {
        if (this == null) throw new TypeError('can\'t convert ' + this + ' to object');
        var str = '' + this;
        count = +count;
        if (count < 0) throw new RangeError('repeat count must be non-negative');
        if (count === Infinity) throw new RangeError('repeat count must be less than infinity');
        count = Math.floor(count);
        if (str.length === 0 || count === 0) return '';
        var result = '';
        while (count > 0) {
            if (count & 1) result += str;
            count >>= 1;
            str += str;
        }
        return result;
    };
}

// Array.prototype.includes (Firefox 43+, 应该支持)
if (!Array.prototype.includes) {
    Array.prototype.includes = function(searchElement, fromIndex) {
        if (this == null) throw new TypeError('"this" is null or not defined');
        var o = Object(this);
        var len = o.length >>> 0;
        if (len === 0) return false;
        var n = fromIndex | 0;
        var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
        while (k < len) {
            if (o[k] === searchElement) return true;
            k++;
        }
        return false;
    };
}

// Object.entries (Firefox 47+, 应该支持)
if (!Object.entries) {
    Object.entries = function(obj) {
        var ownProps = Object.keys(obj);
        var i = ownProps.length;
        var resArray = new Array(i);
        while (i--) {
            resArray[i] = [ownProps[i], obj[ownProps[i]]];
        }
        return resArray;
    };
}

// Object.values (Firefox 47+, 应该支持)
if (!Object.values) {
    Object.values = function(obj) {
        var vals = [];
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                vals.push(obj[key]);
            }
        }
        return vals;
    };
}

// Array.from (Firefox 32+, 应该支持)
if (!Array.from) {
    Array.from = function(arrayLike, mapFn, thisArg) {
        var arr = [];
        var len = arrayLike.length;
        for (var i = 0; i < len; i++) {
            if (mapFn) {
                arr.push(mapFn.call(thisArg, arrayLike[i], i));
            } else {
                arr.push(arrayLike[i]);
            }
        }
        return arr;
    };
}

// Promise.finally (Firefox 58+, 不支持)
if (typeof Promise !== 'undefined' && !Promise.prototype.finally) {
    Promise.prototype.finally = function(callback) {
        var P = this.constructor;
        return this.then(
            function(value) {
                return P.resolve(callback()).then(function() { return value; });
            },
            function(reason) {
                return P.resolve(callback()).then(function() { throw reason; });
            }
        );
    };
}

// URLSearchParams polyfill (Firefox 48 不支持)
if (typeof URLSearchParams === 'undefined') {
    function URLSearchParams(search) {
        this.params = {};
        if (search) {
            if (typeof search === 'string') {
                // 如果是字符串，去掉开头的 ?
                if (search.charAt(0) === '?') {
                    search = search.substring(1);
                }
                // 解析参数
                var pairs = search.split('&');
                for (var i = 0; i < pairs.length; i++) {
                    var pair = pairs[i].split('=');
                    if (pair.length === 2) {
                        var key = decodeURIComponent(pair[0]);
                        var value = decodeURIComponent(pair[1]);
                        if (this.params[key]) {
                            // 如果已存在，转换为数组
                            if (!Array.isArray(this.params[key])) {
                                this.params[key] = [this.params[key]];
                            }
                            this.params[key].push(value);
                        } else {
                            this.params[key] = value;
                        }
                    }
                }
            } else if (search.forEach) {
                // 如果是迭代器
                var self = this;
                search.forEach(function(value, key) {
                    self.set(key, value);
                });
            }
        }
    }
    
    URLSearchParams.prototype.get = function(name) {
        var value = this.params[name];
        if (Array.isArray(value)) {
            return value[0];
        }
        return value || null;
    };
    
    URLSearchParams.prototype.getAll = function(name) {
        var value = this.params[name];
        if (Array.isArray(value)) {
            return value;
        }
        return value ? [value] : [];
    };
    
    URLSearchParams.prototype.set = function(name, value) {
        this.params[name] = value;
    };
    
    URLSearchParams.prototype.has = function(name) {
        return name in this.params;
    };
    
    URLSearchParams.prototype.delete = function(name) {
        delete this.params[name];
    };
    
    URLSearchParams.prototype.toString = function() {
        var pairs = [];
        for (var key in this.params) {
            if (this.params.hasOwnProperty(key)) {
                var value = this.params[key];
                if (Array.isArray(value)) {
                    for (var i = 0; i < value.length; i++) {
                        pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(value[i]));
                    }
                } else {
                    pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
                }
            }
        }
        return pairs.join('&');
    };
    
    window.URLSearchParams = URLSearchParams;
}

console.log('Polyfills loaded for Firefox 48 / KaiOS');

