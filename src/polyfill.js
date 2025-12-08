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

console.log('Polyfills loaded for Firefox 48 / KaiOS');

