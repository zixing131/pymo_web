/**
 * PyMO Web - 菜单系统
 * 管理游戏菜单、存档界面、设置界面
 */

class MenuSystem {
    constructor(engine) {
        this.engine = engine;
        this.isOpen = false;
        this.currentPanel = null;
        this.overlay = null;
        this.selectedIndex = 0;
        this.selectableItems = [];
        this.panelStack = [];  // 用于返回上一级
    }

    /**
     * 创建菜单覆盖层
     * @private
     */
    _createOverlay() {
        if (this.overlay) return this.overlay;
        
        this.overlay = document.createElement('div');
        this.overlay.className = 'menu-overlay';
        this.overlay.style.display = 'none';
        
        // 应用屏幕旋转
        this._applyRotation();
        
        // 点击空白处返回或关闭
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.goBack();
            }
        });
        
        document.getElementById('game-container').appendChild(this.overlay);
        return this.overlay;
    }

    /**
     * 应用屏幕旋转
     * @private
     */
    _applyRotation() {
        if (!this.overlay) return;
        
        // 移除旧的旋转类
        this.overlay.classList.remove('rotated-left', 'rotated-right');
        
        // 检查全局旋转设置
        if (typeof screenRotation !== 'undefined' && screenRotation.enabled) {
            if (screenRotation.direction === 'left') {
                this.overlay.classList.add('rotated-left');
            } else {
                this.overlay.classList.add('rotated-right');
            }
        }
    }

    /**
     * 设置可选择项
     * @private
     */
    _setSelectableItems(items) {
        this.selectableItems = Array.from(items);
        this.selectedIndex = 0;
        
        this.selectableItems.forEach((item, index) => {
            item.addEventListener('mouseenter', () => {
                this.selectedIndex = index;
                this._updateSelection();
            });
        });
        
        this._updateSelection();
    }

    /**
     * 更新选中状态
     * @private
     */
    _updateSelection() {
        this.selectableItems.forEach((item, index) => {
            if (index === this.selectedIndex) {
                item.classList.add('selected');
                // 确保选中项可见
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    /**
     * 向上选择
     */
    selectUp() {
        if (this.selectableItems.length === 0) return;
        this.selectedIndex = (this.selectedIndex - 1 + this.selectableItems.length) % this.selectableItems.length;
        this._updateSelection();
    }

    /**
     * 向下选择
     */
    selectDown() {
        if (this.selectableItems.length === 0) return;
        this.selectedIndex = (this.selectedIndex + 1) % this.selectableItems.length;
        this._updateSelection();
    }

    /**
     * 向左（用于滑块等）
     */
    selectLeft() {
        const item = this.selectableItems[this.selectedIndex];
        if (item && item.tagName === 'INPUT' && item.type === 'range') {
            item.value = Math.max(parseInt(item.min), parseInt(item.value) - 1);
            item.dispatchEvent(new Event('change'));
        }
    }

    /**
     * 向右（用于滑块等）
     */
    selectRight() {
        const item = this.selectableItems[this.selectedIndex];
        if (item && item.tagName === 'INPUT' && item.type === 'range') {
            item.value = Math.min(parseInt(item.max), parseInt(item.value) + 1);
            item.dispatchEvent(new Event('change'));
        }
    }

    /**
     * 确认选择
     */
    confirmSelection() {
        if (this.selectableItems.length === 0) return;
        const selectedItem = this.selectableItems[this.selectedIndex];
        if (selectedItem) {
            selectedItem.click();
        }
    }

    /**
     * 返回上一级
     */
    goBack() {
        if (this.panelStack.length > 0) {
            const prevPanel = this.panelStack.pop();
            prevPanel();
        } else {
            this.close();
        }
    }

    /**
     * 显示主菜单
     */
    showMainMenu() {
        this._createOverlay();
        this.isOpen = true;
        this.panelStack = [];  // 清空返回栈
        
        const menuPanel = document.createElement('div');
        menuPanel.className = 'menu-panel';
        menuPanel.innerHTML = `
            <button class="menu-item" data-action="save">保存游戏</button>
            <button class="menu-item" data-action="load">读取游戏</button>
            <button class="menu-item" data-action="config">游戏设置</button>
            <button class="menu-item" data-action="title">返回标题</button>
            <button class="menu-item" data-action="close">继续游戏</button>
        `;
        
        const buttons = menuPanel.querySelectorAll('.menu-item');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                this._handleMenuAction(btn.dataset.action);
            });
        });
        
        this.overlay.innerHTML = '';
        this.overlay.appendChild(menuPanel);
        this.overlay.style.display = 'flex';
        this.currentPanel = 'main';
        
        this._setSelectableItems(buttons);
        
        // 暂停游戏
        this.engine.pause();
    }

    /**
     * 处理菜单动作
     * @private
     */
    _handleMenuAction(action) {
        switch (action) {
            case 'save':
                this.panelStack.push(() => this.showMainMenu());
                this.showSavePanel('save');
                break;
            case 'load':
                this.panelStack.push(() => this.showMainMenu());
                this.showSavePanel('load');
                break;
            case 'config':
                this.panelStack.push(() => this.showMainMenu());
                this.showConfigPanel();
                break;
            case 'title':
                this.close();
                // TODO: 返回标题画面
                window.location.href = 'index.html';
                break;
            case 'close':
            case 'back':
                this.goBack();
                break;
        }
    }

    /**
     * 显示存档/读档面板
     * @param {string} mode - 'save' 或 'load'
     * @param {Function} onComplete - 完成回调（用于脚本调用）
     */
    async showSavePanel(mode = 'save', onComplete = null) {
        // 如果是从脚本调用，确保菜单显示
        if (onComplete && !this.isOpen) {
            this._createOverlay();
            this.overlay.style.display = 'flex';
            this.isOpen = true;
        }
        
        // 保存回调函数
        this._loadCallback = onComplete;
        
        const saves = await this.engine.saveSystem.getSaveList();
        
        const panel = document.createElement('div');
        panel.className = 'save-modal';
        panel.innerHTML = `
            <div class="save-modal-title">${mode === 'save' ? '保存游戏' : '读取游戏'}</div>
            <div class="save-slots"></div>
            <button class="menu-item back-btn" data-action="back">返回</button>
        `;
        
        const slotsContainer = panel.querySelector('.save-slots');
        const selectables = [];
        
        // 创建存档槽
        for (let i = 1; i <= 20; i++) {
            const saveData = saves.find(s => s.slotIndex === i);
            const slot = document.createElement('div');
            slot.className = 'save-slot';
            slot.dataset.slot = i;
            slot.tabIndex = 0;
            
            if (saveData) {
                slot.innerHTML = `
                    <img class="save-slot-thumb" src="${saveData.thumbnail || ''}" alt="">
                    <div class="save-slot-info">
                        <div>存档 ${i}</div>
                        <div>${saveData.title || '无标题'}</div>
                        <div>${this._formatDateTime(saveData.saveTime)}</div>
                    </div>
                `;
            } else {
                slot.innerHTML = `
                    <div class="save-slot-thumb"></div>
                    <div class="save-slot-info save-slot-empty">存档 ${i} - 空</div>
                `;
            }
            
            slot.addEventListener('click', () => {
                this._handleSlotClick(i, mode);
            });
            
            slotsContainer.appendChild(slot);
            selectables.push(slot);
        }
        
        // 返回按钮
        const backBtn = panel.querySelector('.back-btn');
        backBtn.addEventListener('click', () => {
            // 如果是从脚本调用且用户取消，通知回调
            if (this._loadCallback) {
                this._loadCallback(false);
                this._loadCallback = null;
            }
            this.goBack();
        });
        selectables.push(backBtn);
        
        this.overlay.innerHTML = '';
        this.overlay.appendChild(panel);
        this.currentPanel = mode;
        
        this._setSelectableItems(selectables);
    }

    /**
     * 格式化日期时间
     * @private
     */
    _formatDateTime(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            return `${d.getFullYear()}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
        } catch (e) {
            return dateStr;
        }
    }

    /**
     * 处理存档槽点击
     * @private
     */
    async _handleSlotClick(slotIndex, mode) {
        if (mode === 'save') {
            await this.engine.saveSystem.save(slotIndex);
            this._showToast(`已保存到存档 ${slotIndex}`);
            this.showSavePanel('save');
        } else {
            const hasSave = await this.engine.saveSystem.hasSave(slotIndex);
            if (hasSave) {
                // 关闭菜单
                this.close();
                
                // 如果有回调（从脚本调用），通知成功
                if (this._loadCallback) {
                    const callback = this._loadCallback;
                    this._loadCallback = null;
                    callback(true);
                }
                
                // 读取存档并继续
                await this.engine.saveSystem.load(slotIndex);
                await this.engine.scriptParser.run();
            } else {
                this._showToast('该存档为空');
            }
        }
    }

    /**
     * 显示提示消息
     * @private
     */
    _showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'menu-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 2000;
            font-size: 14px;
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 2000);
    }

    /**
     * 显示设置面板
     */
    showConfigPanel() {
        const config = this.engine.config;
        
        // 获取当前屏幕旋转设置
        const rotation = typeof screenRotation !== 'undefined' ? screenRotation : { enabled: false, direction: 'left' };
        
        const panel = document.createElement('div');
        panel.className = 'save-modal';
        panel.innerHTML = `
            <div class="save-modal-title">游戏设置</div>
            <div class="config-items">
                <div class="config-item">
                    <label>文字速度</label>
                    <input type="range" min="0" max="5" value="${config.get('textspeed')}" data-config="textspeed" tabindex="0">
                    <span class="config-value">${config.get('textspeed')}</span>
                </div>
                <div class="config-item">
                    <label>BGM 音量</label>
                    <input type="range" min="0" max="10" value="${config.get('bgmvolume')}" data-config="bgmvolume" tabindex="0">
                    <span class="config-value">${config.get('bgmvolume')}</span>
                </div>
                <div class="config-item">
                    <label>语音音量</label>
                    <input type="range" min="0" max="10" value="${config.get('vovolume')}" data-config="vovolume" tabindex="0">
                    <span class="config-value">${config.get('vovolume')}</span>
                </div>
                <div class="config-divider"></div>
                <div class="config-item">
                    <label>屏幕旋转</label>
                    <button class="config-toggle" id="rotation-toggle" tabindex="0">${rotation.enabled ? '开启' : '关闭'}</button>
                </div>
                <div class="config-item">
                    <label>旋转方向</label>
                    <button class="config-toggle" id="rotation-direction" tabindex="0">${rotation.direction === 'left' ? '左转' : '右转'}</button>
                </div>
            </div>
            <button class="menu-item back-btn" data-action="back">返回</button>
        `;
        
        const selectables = [];
        
        // 绑定配置变更事件
        panel.querySelectorAll('input[data-config]').forEach(input => {
            const valueSpan = input.nextElementSibling;
            
            input.addEventListener('input', () => {
                valueSpan.textContent = input.value;
            });
            
            input.addEventListener('change', () => {
                const configKey = input.dataset.config;
                const value = parseInt(input.value);
                config.set(configKey, value);
                
                // 应用设置
                if (configKey === 'bgmvolume') {
                    this.engine.audio.setVolume('bgm', value);
                } else if (configKey === 'vovolume') {
                    this.engine.audio.setVolume('voice', value);
                }
            });
            
            selectables.push(input);
        });
        
        // 屏幕旋转开关
        const rotationToggle = panel.querySelector('#rotation-toggle');
        rotationToggle.addEventListener('click', () => {
            if (typeof toggleScreenRotation === 'function') {
                const enabled = toggleScreenRotation();
                rotationToggle.textContent = enabled ? '开启' : '关闭';
            }
        });
        selectables.push(rotationToggle);
        
        // 旋转方向
        const rotationDirection = panel.querySelector('#rotation-direction');
        rotationDirection.addEventListener('click', () => {
            if (typeof screenRotation !== 'undefined' && typeof setRotationDirection === 'function') {
                const newDirection = screenRotation.direction === 'left' ? 'right' : 'left';
                setRotationDirection(newDirection);
                rotationDirection.textContent = newDirection === 'left' ? '左转' : '右转';
            }
        });
        selectables.push(rotationDirection);
        
        // 返回按钮
        const backBtn = panel.querySelector('.back-btn');
        backBtn.addEventListener('click', () => {
            this.goBack();
        });
        selectables.push(backBtn);
        
        this.overlay.innerHTML = '';
        this.overlay.appendChild(panel);
        this.currentPanel = 'config';
        
        this._setSelectableItems(selectables);
    }

    /**
     * 关闭菜单
     */
    close() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        this.panelStack = [];
        this.selectableItems = [];
        
        // 如果有读档回调未处理，通知取消
        if (this._loadCallback) {
            const callback = this._loadCallback;
            this._loadCallback = null;
            callback(false);
        }
        
        if (this.overlay) {
            this.overlay.style.display = 'none';
            this.overlay.innerHTML = '';
        }
        this.currentPanel = null;
        
        // 恢复游戏
        this.engine.resume();
    }

    /**
     * 切换菜单显示
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.showMainMenu();
        }
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MenuSystem;
}
