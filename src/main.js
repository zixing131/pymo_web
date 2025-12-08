/**
 * PyMO Web - 主入口文件
 * 初始化并启动游戏引擎
 */

// 全局引擎实例
let engine = null;

// 屏幕旋转设置
let screenRotation = {
    enabled: false,
    direction: 'left',  // 'left' 或 'right'，左转或右转 90 度
    isKaiOS: false
};

/**
 * 从 URL 获取游戏名称
 */
function getGameNameFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('game') || urlParams.get('g');
}

/**
 * 初始化游戏
 */
async function initGame() {
    const gameName = getGameNameFromURL();
    
    if (!gameName) {
        showError('未指定游戏名称。请使用 ?game=游戏名 参数。');
        return;
    }
    
    // 显示加载状态
    showLoading(`正在加载游戏: ${gameName}`);
    
    try {
        // 获取 canvas 元素
        const canvas = document.getElementById('game-canvas');
        if (!canvas) {
            throw new Error('Canvas element not found');
        }
        
        // 创建引擎实例
        engine = new PyMOEngine();
        
        // 初始化引擎
        await engine.init(gameName, canvas);
        
        // 隐藏加载状态
        hideLoading();
        
        // 更新标题
        document.title = engine.config.get('gametitle') || gameName;
        
        // 启动游戏
        await engine.start();
        
    } catch (error) {
        console.error('Game initialization failed:', error);
        showError(`游戏加载失败: ${error.message}`);
    }
}

/**
 * 显示加载状态
 */
function showLoading(message) {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.textContent = message;
        loadingEl.style.display = 'flex';
    }
}

/**
 * 隐藏加载状态
 */
function hideLoading() {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
}

/**
 * 显示错误信息
 */
function showError(message) {
    hideLoading();
    const errorEl = document.getElementById('error');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    } else {
        alert(message);
    }
}

/**
 * 检测是否为 KaiOS 或小屏幕竖屏设备
 */
function detectKaiOS() {
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const isPortrait = screenHeight > screenWidth;
    const isSmallScreen = Math.min(screenWidth, screenHeight) <= 320;
    
    // 检测 KaiOS
    const isKaiOS = /KAIOS/i.test(navigator.userAgent) || 
                   (isSmallScreen && isPortrait && screenWidth === 240 && screenHeight === 320);
    
    console.log(`Screen: ${screenWidth}x${screenHeight}, Portrait: ${isPortrait}, KaiOS: ${isKaiOS}`);
    
    return {
        isKaiOS,
        isSmallScreen,
        isPortrait,
        screenWidth,
        screenHeight
    };
}

/**
 * 设置画布缩放和旋转
 */
function setupCanvasScaling() {
    const canvas = document.getElementById('game-canvas');
    const container = document.getElementById('game-container');
    
    if (!canvas || !container) return;
    
    const deviceInfo = detectKaiOS();
    
    // 从 localStorage 读取旋转设置
    const savedRotation = localStorage.getItem('pymo_rotation');
    if (savedRotation) {
        try {
            const parsed = JSON.parse(savedRotation);
            screenRotation.enabled = parsed.enabled;
            screenRotation.direction = parsed.direction || 'left';
        } catch (e) {}
    }
    
    // 如果是 KaiOS 设备且没有手动设置，自动启用旋转
    if (deviceInfo.isKaiOS && savedRotation === null) {
        screenRotation.enabled = true;
        screenRotation.isKaiOS = true;
    }
    
    function updateScale() {
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        let canvasWidth = canvas.width;
        let canvasHeight = canvas.height;
        
        // 检测是否为小屏幕设备
        const isSmallScreen = Math.min(containerWidth, containerHeight) <= 320;
        
        // 如果启用旋转，交换宽高计算
        let effectiveContainerWidth = containerWidth;
        let effectiveContainerHeight = containerHeight;
        
        if (screenRotation.enabled) {
            // 旋转后，画布的宽对应容器的高，画布的高对应容器的宽
            effectiveContainerWidth = containerHeight;
            effectiveContainerHeight = containerWidth;
        }
        
        const scaleX = effectiveContainerWidth / canvasWidth;
        const scaleY = effectiveContainerHeight / canvasHeight;
        
        // 小屏幕设备使用 cover 模式（填满屏幕），大屏幕使用 contain 模式（完整显示）
        const scale = isSmallScreen 
            ? Math.max(scaleX, scaleY)  // 小屏幕填满
            : Math.min(scaleX, scaleY); // 大屏幕完整显示
        
        // 构建变换
        let transform = '';
        
        if (screenRotation.enabled) {
            const rotation = screenRotation.direction === 'left' ? -90 : 90;
            transform = `rotate(${rotation}deg) scale(${scale})`;
        } else {
            transform = `scale(${scale})`;
        }
        
        canvas.style.transform = transform;
        canvas.style.transformOrigin = 'center center';
        
        // 小屏幕隐藏溢出
        if (isSmallScreen) {
            container.style.overflow = 'hidden';
        }
    }
    
    window.addEventListener('resize', updateScale);
    updateScale();
    
    // 返回更新函数，供设置改变时调用
    return updateScale;
}

/**
 * 切换屏幕旋转
 */
function toggleScreenRotation() {
    screenRotation.enabled = !screenRotation.enabled;
    saveRotationSettings();
    
    // 重新计算缩放
    if (window.updateCanvasScale) {
        window.updateCanvasScale();
    }
    
    return screenRotation.enabled;
}

/**
 * 设置旋转方向
 * @param {string} direction - 'left' 或 'right'
 */
function setRotationDirection(direction) {
    if (direction === 'left' || direction === 'right') {
        screenRotation.direction = direction;
        saveRotationSettings();
        
        if (window.updateCanvasScale) {
            window.updateCanvasScale();
        }
    }
}

/**
 * 保存旋转设置
 */
function saveRotationSettings() {
    localStorage.setItem('pymo_rotation', JSON.stringify({
        enabled: screenRotation.enabled,
        direction: screenRotation.direction
    }));
}

/**
 * 映射按键（根据屏幕旋转调整方向键）
 * 全局函数，供其他模块调用
 */
window.mapKeyForRotation = function(key) {
    if (!screenRotation.enabled) return key;
    
    // 旋转后的方向键映射
    const keyMap = screenRotation.direction === 'left' ? {
        // 左转 90 度：上→右，右→下，下→左，左→上
        'ArrowUp': 'ArrowRight',
        'ArrowRight': 'ArrowDown',
        'ArrowDown': 'ArrowLeft',
        'ArrowLeft': 'ArrowUp',
        '2': '6',  // T9: 上→右
        '6': '8',  // T9: 右→下
        '8': '4',  // T9: 下→左
        '4': '2'   // T9: 左→上
    } : {
        // 右转 90 度：上→左，左→下，下→右，右→上
        'ArrowUp': 'ArrowLeft',
        'ArrowLeft': 'ArrowDown',
        'ArrowDown': 'ArrowRight',
        'ArrowRight': 'ArrowUp',
        '2': '4',  // T9: 上→左
        '4': '8',  // T9: 左→下
        '8': '6',  // T9: 下→右
        '6': '2'   // T9: 右→上
    };
    
    return keyMap[key] || key;
};

// 本地引用
const mapKeyForRotation = window.mapKeyForRotation;

/**
 * 设置键盘控制
 */
function setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
        // 如果 CG 查看器打开，不处理（让 CG 查看器自己处理）
        if (document.querySelector('.cg-viewer')) {
            return;
        }
        
        console.log('[Main] Key event:', e.key, 'menu open:', engine?.menu?.isOpen, 'selection active:', engine?.selection?.isActive);
        
        // 如果菜单打开，优先处理菜单操作
        if (engine && engine.menu && engine.menu.isOpen) {
            handleMenuKeyboard(e);
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        
        // 菜单开关键在任何情况下都应该生效
        if (e.key === '0' || e.key === '*' || e.key === 'Escape' || e.key === 'SoftLeft' || e.key === '#' || e.key === 'SoftRight') {
            handleMenuToggle(e);
            return;
        }
        
        // 如果选择系统激活，不处理其他按键（选择系统有自己的键盘处理）
        if (engine && engine.selection && engine.selection.isActive) {
            return;
        }
        
        // 处理游戏画面的按键
        handleGameKeyboard(e);
    }, true);  // 使用捕获阶段，优先处理
}

/**
 * 处理菜单开关
 */
function handleMenuToggle(e) {
    if (!engine || !engine.menu) return;
    
    switch (e.key) {
        case '0':
        case '*':
        case 'Escape':
        case 'SoftLeft':
        case 'SoftRight':
        case '#':
            engine.menu.toggle();
            e.preventDefault();
            e.stopPropagation();
            break;
    }
}

/**
 * 处理游戏画面键盘操作
 */
function handleGameKeyboard(e) {
    if (!engine) return;
    
    switch (e.key) {
        // 数字键 5 / Enter / 空格 - 确认/下一步
        case '5':
        case 'Enter':
        case ' ':
            triggerConfirm();
            e.preventDefault();
            break;
        
        // 数字键 7 / F5 - 快速保存
        case '7':
        case 'F5':
            quickSave();
            e.preventDefault();
            break;
        
        // 数字键 9 / F7 - 快速读取
        case '9':
        case 'F7':
            quickLoad();
            e.preventDefault();
            break;
        
        // 数字键 1 - 自动模式（TODO）
        case '1':
            // toggleAutoMode();
            break;
        
        // 数字键 3 - 跳过模式（TODO）
        case '3':
            // toggleSkipMode();
            break;
    }
}

/**
 * 触发确认/下一步
 */
function triggerConfirm() {
    if (!engine) return;
    
    // 如果在等待按键
    if (engine.waitingForKey && engine.keyResolver) {
        engine.waitingForKey = false;
        engine.keyResolver();
        engine.keyResolver = null;
    }
}

/**
 * 快速保存
 */
function quickSave() {
    if (!engine || !engine.saveSystem) return;
    
    engine.saveSystem.save(1).then(() => {
        showQuickToast('已快速保存');
    }).catch(err => {
        showQuickToast('保存失败');
    });
}

/**
 * 快速读取
 */
function quickLoad() {
    if (!engine || !engine.saveSystem) return;
    
    engine.saveSystem.hasSave(1).then(hasSave => {
        if (hasSave) {
            engine.saveSystem.load(1).then(() => {
                showQuickToast('已快速读取');
            });
        } else {
            showQuickToast('没有快速存档');
        }
    });
}

/**
 * 显示快速提示
 */
function showQuickToast(message) {
    // 移除已存在的 toast
    const existingToast = document.querySelector('.quick-toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'quick-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: #fff;
        padding: 8px 20px;
        border-radius: 20px;
        z-index: 999;
        font-size: 13px;
        pointer-events: none;
        animation: toastFadeIn 0.2s ease;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 1500);
}

/**
 * 处理菜单键盘操作
 */
function handleMenuKeyboard(e) {
    if (!engine || !engine.menu) return;
    
    // 映射按键（处理屏幕旋转）
    const key = mapKeyForRotation(e.key);
    console.log('[Menu] Key pressed:', e.key, '-> mapped:', key, 'items:', engine.menu.selectableItems.length);
    
    switch (key) {
        // 返回/关闭菜单
        case 'Escape':
        case 'SoftRight':
        case 'Backspace':
        case '#':
            engine.menu.goBack();
            e.preventDefault();
            break;
        
        // 0 键 / * 键 - 关闭菜单（与打开菜单相同的键）
        case '0':
        case '*':
        case 'SoftLeft':
            // 如果在主菜单，直接关闭；否则返回上一级
            if (engine.menu.currentPanel === 'main') {
                engine.menu.close();
            } else {
                engine.menu.goBack();
            }
            e.preventDefault();
            break;
        
        // 向上选择
        case 'ArrowUp':
        case '2':
            engine.menu.selectUp();
            e.preventDefault();
            break;
        
        // 向下选择
        case 'ArrowDown':
        case '8':
            engine.menu.selectDown();
            e.preventDefault();
            break;
        
        // 向左（调整滑块）
        case 'ArrowLeft':
        case '4':
            engine.menu.selectLeft();
            e.preventDefault();
            break;
        
        // 向右（调整滑块）
        case 'ArrowRight':
        case '6':
            engine.menu.selectRight();
            e.preventDefault();
            break;
        
        // 确认选择
        case 'Enter':
        case '5':
            engine.menu.confirmSelection();
            e.preventDefault();
            break;
    }
}

/**
 * 设置控制按钮事件
 */
function setupControlButtons() {
    const btnMenu = document.getElementById('btn-menu');
    const btnFullscreen = document.getElementById('btn-fullscreen');
    
    if (btnMenu) {
        btnMenu.addEventListener('click', () => {
            if (engine && engine.menu) {
                engine.menu.toggle();
            }
        });
    }
    
    if (btnFullscreen) {
        btnFullscreen.addEventListener('click', toggleFullscreen);
    }
}

/**
 * 设置全屏
 */
function toggleFullscreen() {
    const container = document.getElementById('game-container');
    if (!container) return;
    
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        container.requestFullscreen().catch(err => {
            console.warn('Fullscreen request failed:', err);
        });
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.updateCanvasScale = setupCanvasScaling();
    setupKeyboardControls();
    setupControlButtons();
    initGame();
});

// 页面关闭前保存全局数据
window.addEventListener('beforeunload', () => {
    if (engine && engine.saveSystem) {
        engine.saveSystem.saveGlobal();
    }
});

