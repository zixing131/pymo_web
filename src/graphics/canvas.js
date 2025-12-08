/**
 * PyMO Web - Canvas 封装
 * 提供图像绘制的基础功能
 */

class PyMOCanvas {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.width = canvasElement.width;
        this.height = canvasElement.height;
        
        // 是否旋转屏幕（横屏模式）
        this.isRotated = false;
        this.rotationApplied = false;
    }

    /**
     * 设置旋转模式
     */
    setRotation(rotate) {
        this.isRotated = rotate;
        if (rotate && !this.rotationApplied) {
            this.ctx.translate(this.height, 0);
            this.ctx.rotate(90 * Math.PI / 180);
            this.rotationApplied = true;
        }
    }

    /**
     * 清空画布
     * @param {string|number[]} color - 颜色
     */
    clear(color = [0, 0, 0]) {
        const colorStr = Array.isArray(color) ? 
            `rgb(${color[0]}, ${color[1]}, ${color[2]})` : color;
        
        this.ctx.fillStyle = colorStr;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    /**
     * 绘制图像
     * @param {PyMOImage} image - 图像对象
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     */
    drawImage(image, x = 0, y = 0) {
        if (image && image.canvas) {
            this.ctx.drawImage(image.canvas, x, y);
        }
    }

    /**
     * 绘制带遮罩的图像
     * @param {PyMOImage} image - 图像
     * @param {PyMOImage} mask - 遮罩
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     */
    drawImageWithMask(image, mask, x = 0, y = 0) {
        if (!image || !image.canvas) return;
        
        if (!mask || !mask.canvas) {
            this.drawImage(image, x, y);
            return;
        }

        // 创建临时画布合成图像和遮罩
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = image.width;
        tempCanvas.height = image.height;
        const tempCtx = tempCanvas.getContext('2d');

        // 绘制原图
        tempCtx.drawImage(image.canvas, 0, 0);

        // 获取像素数据
        const imgData = tempCtx.getImageData(0, 0, image.width, image.height);
        const maskCtx = mask.canvas.getContext('2d');
        const maskData = maskCtx.getImageData(0, 0, mask.width, mask.height);

        // 应用遮罩到 alpha 通道
        for (let i = 0; i < imgData.data.length; i += 4) {
            imgData.data[i + 3] = maskData.data[i]; // 使用遮罩的 R 通道作为 alpha
        }

        tempCtx.putImageData(imgData, 0, 0);
        this.ctx.drawImage(tempCanvas, x, y);
    }

    /**
     * 绘制文本
     * @param {string} text - 文本内容
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {Object} options - 选项
     */
    drawText(text, x, y, options = {}) {
        const {
            color = '#ffffff',
            fontSize = 16,
            fontFamily = 'sans-serif'
        } = options;

        this.ctx.font = `${fontSize}px ${fontFamily}`;
        this.ctx.fillStyle = color;
        this.ctx.fillText(text, x, y);
    }

    /**
     * 测量文本宽度
     */
    measureText(text, fontSize = 16) {
        this.ctx.font = `${fontSize}px sans-serif`;
        return this.ctx.measureText(text);
    }

    /**
     * 绘制矩形
     */
    fillRect(x, y, width, height, color) {
        const colorStr = Array.isArray(color) ? 
            `rgb(${color[0]}, ${color[1]}, ${color[2]})` : color;
        
        this.ctx.fillStyle = colorStr;
        this.ctx.fillRect(x, y, width, height);
    }

    /**
     * 设置全局透明度
     */
    setAlpha(alpha) {
        this.ctx.globalAlpha = alpha;
    }

    /**
     * 重置全局透明度
     */
    resetAlpha() {
        this.ctx.globalAlpha = 1.0;
    }

    /**
     * 保存状态
     */
    save() {
        this.ctx.save();
    }

    /**
     * 恢复状态
     */
    restore() {
        this.ctx.restore();
    }

    /**
     * 获取画布数据 URL
     */
    toDataURL(type = 'image/png') {
        return this.canvas.toDataURL(type);
    }
}

/**
 * PyMO 图像类
 * 封装 Canvas 作为图像对象
 */
class PyMOImage {
    constructor(width, height) {
        this.width = parseInt(width) || 1;
        this.height = parseInt(height) || 1;
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext('2d');
    }

    /**
     * 从图像数据加载
     * @param {ArrayBuffer|Uint8Array} data - 图像数据
     * @returns {Promise}
     */
    async load(data) {
        return new Promise((resolve, reject) => {
            try {
                const blob = new Blob([data], { type: 'image/png' });
                const url = URL.createObjectURL(blob);
                const img = new Image();
                
                img.onload = () => {
                    this.canvas.width = img.width;
                    this.canvas.height = img.height;
                    this.width = img.width;
                    this.height = img.height;
                    this.ctx.drawImage(img, 0, 0);
                    URL.revokeObjectURL(url);
                    resolve(this);
                };
                
                img.onerror = () => {
                    URL.revokeObjectURL(url);
                    reject(new Error('Failed to load image'));
                };
                
                img.src = url;
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * 清空图像
     * @param {number[]} color - RGB颜色数组
     */
    clear(color = [0, 0, 0]) {
        this.ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    /**
     * 绘制另一个图像到此图像
     * @param {PyMOImage} otherImg - 源图像
     * @param {number[]} target - 目标位置 [x, y]
     * @param {number[]} source - 源位置 [x, y]（默认 [0, 0]）
     * @param {PyMOImage} mask - 遮罩图像（可选）
     */
    blit(otherImg, target = [0, 0], source = [0, 0], mask = null) {
        if (!otherImg || !otherImg.canvas) return;
        
        const tx = parseInt(target[0]) || 0;
        const ty = parseInt(target[1]) || 0;
        const sx = parseInt(source[0]) || 0;
        const sy = parseInt(source[1]) || 0;

        if (mask && mask.canvas) {
            // 带遮罩绘制
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = otherImg.width;
            tempCanvas.height = otherImg.height;
            const tempCtx = tempCanvas.getContext('2d');

            tempCtx.drawImage(otherImg.canvas, 0, 0);

            const imgData = tempCtx.getImageData(0, 0, otherImg.width, otherImg.height);
            const maskData = mask.ctx.getImageData(0, 0, mask.width, mask.height);

            for (let i = 0; i < imgData.data.length; i += 4) {
                imgData.data[i + 3] = maskData.data[i]; // R通道作为alpha
            }

            tempCtx.putImageData(imgData, 0, 0);
            this.ctx.drawImage(tempCanvas, sx, sy, otherImg.width, otherImg.height, 
                              tx, ty, otherImg.width, otherImg.height);
        } else {
            // 普通绘制
            this.ctx.drawImage(otherImg.canvas, sx, sy, otherImg.width, otherImg.height,
                              tx, ty, otherImg.width, otherImg.height);
        }
    }

    /**
     * 绘制文本
     */
    text(pos, text, fill, fontSize) {
        const color = Array.isArray(fill) ? 
            `rgb(${fill[0]}, ${fill[1]}, ${fill[2]})` : fill;
        
        this.ctx.font = `${fontSize}px sans-serif`;
        this.ctx.fillStyle = color;
        this.ctx.fillText(text, pos[0], pos[1]);
    }

    /**
     * 调整大小
     */
    resize(width, height) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.width;
        tempCanvas.height = this.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(this.canvas, 0, 0);

        this.width = parseInt(width);
        this.height = parseInt(height);
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        this.ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height,
                          0, 0, this.width, this.height);
    }

    /**
     * 获取尺寸
     */
    size() {
        return [this.width, this.height];
    }

    /**
     * 复制图像
     */
    clone() {
        const img = new PyMOImage(this.width, this.height);
        img.ctx.drawImage(this.canvas, 0, 0);
        return img;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PyMOCanvas, PyMOImage };
}

