/**
 * PyMO Web - 游戏列表页面逻辑
 */

try {
    // 主菜单列表 [图标, 名称, 回调]
    const mainmenulist = [
        ["▶️", "启动游戏", opengame],
        ["🔄", "刷新列表", refreshGameList],
        ["📦", "安装游戏", installgame],
        ["🗑️", "删除游戏", deletegame],
        ["ℹ️", "关于", about],
        ["🚪", "退出", exit],
    ];

    let nowfocus = undefined;
    let selectedGame = null;
    let uiActionStamp = 0;

    // 同一次点击会被 onclick、捕获监听和焦点系统各触发一次，这里只认第一次
    function beginUiAction() {
        const now = Date.now();
        if (now - uiActionStamp < 50) return false;
        uiActionStamp = now;
        return true;
    }

    // ==================== 游戏操作 ====================

    function myopengame(gamename) {
        // 使用新版游戏页面
        // 注意：gamename 可能带有 .zip 后缀，保持原样传递
        
        // 备用方案：使用 sessionStorage 存储游戏名称（防止 URL 参数丢失）
        try {
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem('pymo_game_name', gamename);
            }
        } catch (err) {
            console.warn('[myopengame] Cannot use sessionStorage:', err);
        }
        
        // 主要方案：通过 URL 参数传递
        const href = 'game_new.html?game=' + encodeURIComponent(gamename);
        window.location.href = href;
    }

    function opengame() {
        let gamename = null;
        
        // 优先级：selectedGame > nowfocus > .game-card.focus > [focused] > 第一个游戏（保底）
        if (selectedGame) {
            gamename = selectedGame.name;
            console.log('[opengame] Using selectedGame:', gamename);
        } else if (nowfocus && nowfocus.dataset.gamename) {
            gamename = nowfocus.dataset.gamename;
            console.log('[opengame] Using nowfocus:', gamename, nowfocus);
        } else {
            // 检查焦点系统的 focus 类
            let focusedCard = document.querySelector('.game-card.focus');
            if (!focusedCard) {
                // 检查 focusable-core 使用的 [focused] 属性
                focusedCard = document.querySelector('.game-card[focused]');
            }
            if (focusedCard && focusedCard.dataset.gamename) {
                gamename = focusedCard.dataset.gamename;
                console.log('[opengame] Using focusedCard:', gamename, focusedCard);
            }
        }
        
        // 保底：如果还是没有游戏名，尝试获取第一个游戏卡片
        if (!gamename) {
            const firstCard = document.querySelector('.game-card[data-gamename]');
            if (firstCard && firstCard.dataset.gamename) {
                gamename = firstCard.dataset.gamename;
                console.log('[opengame] Using first card as fallback:', gamename, firstCard);
                
                // 同时尝试聚焦到第一个卡片
                if (typeof focusable !== 'undefined') {
                    focusable.requestFocus(firstCard);
                }
            }
        }
        
        if (!gamename) {
            console.warn('[opengame] No game found!', {
                selectedGame,
                nowfocus,
                focusedCard: document.querySelector('.game-card.focus'),
                focusedAttr: document.querySelector('.game-card[focused]'),
                allGameCards: document.querySelectorAll('.game-card').length
            });
            showDialog("提示", "没有找到可用的游戏！");
            return;
        }
        
        console.log('[opengame] Starting game:', gamename);
        myopengame(gamename);
    }

    function installgame() {
        document.getElementById("gameFileupload").click();
        closeMenu();
    }

    function deletegame() {
        let gamename = null;
        
        if (selectedGame) {
            gamename = selectedGame.name;
        } else if (nowfocus) {
            gamename = nowfocus.dataset.gamename;
        } else {
            // 尝试获取当前聚焦的游戏卡片
            const focusedCard = document.querySelector('.game-card.focus');
            if (focusedCard) {
                gamename = focusedCard.dataset.gamename;
            }
        }
        
        if (!gamename) {
            showDialog("提示", "请先选择一个游戏！");
            return;
        }
        
        // 关闭菜单后再弹出确认框
        closeMenu();
        
        setTimeout(() => {
            showConfirm("确认删除", `确定要删除「${gamename}」吗？`, () => {
                ZipStore.deleteZip(gamename).then(
                    () => {
                        showDialog("提示", gamename + " 删除成功！");
				refreshGameList();
		},  
                    (err) => {
                        showDialog("提示", gamename + " 删除失败！");
                    }
                );
            });
        }, 100);
    }

    // ==================== 游戏列表 ====================

    function processGameconfig(res) {
        const resp = res.split('\n');
        const config = {};
        for (const line of resp) {
            const parts = line.split(',');
            if (parts.length >= 2) {
                config[parts[0].trim()] = parts.slice(1).join(',').trim();
            }
        }
        return config;
    }

    function refreshGameList() {
        const applist = document.getElementById('applist');
        const emptyState = document.getElementById('empty-state');
        
        // 显示加载状态
        applist.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <span>加载中...</span>
            </div>
        `;
        emptyState.style.display = 'none';
        
        ZipStore.getAll().then(
            (files) => {
                if (files.length === 0) {
                    applist.innerHTML = '';
                    emptyState.style.display = 'block';
                    return;
                }
                
                const cards = [];
                
                for (const res of files) {
                    try {
                        let gametitle = res.ZipName;
                        let iconUrl = '';

                        if (res.preview) {
                            gametitle = res.preview.title || gametitle;
                            if (res.preview.icon) {
                                iconUrl = URL.createObjectURL(new Blob([res.preview.icon], { type: "image/png" }));
                            }
                        } else if (res.Zip && res.Zip['gameconfig.txt']) {
                            const gameconfig = res.Zip['gameconfig.txt'];
                            const configText = new TextDecoder('utf-8').decode(gameconfig.compressed_data);
                            const config = processGameconfig(configText);
                            gametitle = config["gametitle"] || res.ZipName;
                            const iconfile = res.Zip["icon.png"];
                            if (iconfile) {
                                iconUrl = URL.createObjectURL(new Blob([iconfile.compressed_data], { type: "image/png" }));
                            }
                        }
                        gametitle = String(gametitle).replace(/\\n/g, '<br>');
                        
                        cards.push(`
                            <div class="game-card" focusable data-gamename="${res.ZipName}" onclick="handleGameClick(this)">
                                <div class="game-card-inner">
                                    <img class="game-icon" src="${iconUrl}" alt="" onerror="this.style.display='none'">
                                    <div class="game-info">
                                        <div class="game-title">${gametitle}</div>
                                        <div class="game-name">${res.ZipName}</div>
                                    </div>
                                </div>
                            </div>
                        `);
                    } catch (err) {
                        console.error('Error loading game:', res.ZipName, err);
                        cards.push(`
                            <div class="game-card" focusable data-gamename="${res.ZipName}" data-error="true">
                                <div class="game-card-inner">
                                    <div class="game-icon"></div>
                                    <div class="game-info">
                                        <div class="game-title">${res.ZipName}</div>
                                        <div class="game-error">⚠ 文件损坏</div>
                                    </div>
                                </div>
                            </div>
                        `);
                    }
                }
                
                applist.innerHTML = cards.join('');
                emptyState.style.display = 'none';
                
                // 添加右键菜单
                setupContextMenu();
                
                // 自动聚焦第一个游戏卡片（KaiOS 兼容）
                setTimeout(() => {
                    const firstCard = document.querySelector('.game-card[focusable]');
                    if (firstCard && typeof focusable !== 'undefined') {
                        console.log('[refreshGameList] Auto-focusing first game card:', firstCard.dataset.gamename);
                        focusable.requestFocus(firstCard);
                    }
                }, 100);
            },
            (err) => {
                console.error('Failed to load games:', err);
                applist.innerHTML = '';
                emptyState.style.display = 'block';
            }
        );
    }

    // 处理游戏卡片点击
    window.handleGameClick = function(card) {
        const gamename = card.dataset.gamename;
        if (card.dataset.error === 'true') {
            showDialog("提示", "游戏文件损坏，无法启动！");
        return;
    }
        myopengame(gamename);
    };

    // ==================== 文件上传 ====================

    async function onUploadFile(e) {
        const files = e.target.files;
        if (files.length === 0) return;
        
        const file = files[0];
        if (!file.name.toLowerCase().endsWith('.zip')) {
            showDialog("提示", "只能上传 .zip 格式的游戏包！");
            e.target.value = null;
        return;
        }
        
        // 开始安装
        await installZipFile(file);
        e.target.value = null;
    }
    
    async function saveGameRecord(zipName, zipBlob, preview) {
        const DATABASE = 'ZipStore';
        const VERSION = 2;
        const OBJECT_STORE = 'files_v2';

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DATABASE, VERSION);
            request.onerror = () => reject(request.error);
            request.onupgradeneeded = (event) => {
                const db = request.result;
                if (event.oldVersion < 1) {
                    db.createObjectStore('files', { keyPath: 'ZipName' });
                }
                if (event.oldVersion < 2) {
                    if (db.objectStoreNames.contains('files')) {
                        db.deleteObjectStore('files');
                    }
                    db.createObjectStore(OBJECT_STORE, { keyPath: 'ZipName' });
                }
            };
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(OBJECT_STORE, 'readwrite');
                const objectStore = transaction.objectStore(OBJECT_STORE);
                const putRequest = objectStore.put({
                    ZipName: zipName,
                    zipBlob: zipBlob,
                    preview: preview
                });
                putRequest.onerror = () => reject(putRequest.error);
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            };
        });
    }

    // 安装 ZIP 文件。大包只存原始文件，启动时再按需解开。
    async function installZipFile(file) {
        const applist = document.getElementById('applist');
        const originalContent = applist.innerHTML;
        const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
        
        applist.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <span class="loading-status">正在读取 ${file.name}...</span>
                <span class="loading-size">(${fileSizeMB} MB)</span>
                <span class="loading-progress"></span>
            </div>
        `;
        
        const updateStatus = (status) => {
            const el = applist.querySelector('.loading-status');
            if (el) el.textContent = status;
        };

        try {
            updateStatus(`正在检查 ${file.name}...`);
            const entries = await inspectZipBlob(file);
            const rooted = zipGameRoot(entries);
            if (!rooted.config) {
                throw new Error('未找到 gameconfig.txt，请确认是有效的 PyMO 游戏包');
            }

            updateStatus('正在读取游戏信息...');
            const configBytes = await extractZipEntry(file, rooted.config);
            const config = processGameconfig(new TextDecoder('utf-8').decode(configBytes));
            let iconBytes = null;
            const iconEntry = entries.find((entry) => {
                if (entry.dir || zipIsJunk(entry.name)) return false;
                const name = rooted.root && entry.name.indexOf(rooted.root) === 0
                    ? entry.name.slice(rooted.root.length)
                    : entry.name;
                return name.toLowerCase() === 'icon.png';
            });
            if (iconEntry) {
                try {
                    iconBytes = await extractZipEntry(file, iconEntry);
                } catch (err) {
                    console.warn('图标读取失败', err);
                }
            }

            updateStatus('正在保存到数据库...');
            await saveGameRecord(file.name, file, {
                title: config.gametitle || file.name,
                icon: iconBytes
            });

            showDialog("提示", file.name + " 安装成功！");
            refreshGameList();
        } catch (err) {
            console.error('Install error:', err);
            applist.innerHTML = originalContent;
            showDialog("提示", file.name + " 安装失败！\n" + (err.message || err));
        }
    }

    // ==================== 右键菜单 ====================

    function setupContextMenu() {
        const menu = document.getElementById('context-menu');
        
        document.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                selectedGame = {
                    name: card.dataset.gamename,
                    element: card
                };
                
                menu.style.display = 'block';
                menu.style.left = e.pageX + 'px';
                menu.style.top = e.pageY + 'px';
            });
        });
        
        // 点击其他地方关闭菜单
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target)) {
                menu.style.display = 'none';
                selectedGame = null;
            }
        });
        
        // 菜单项点击
        menu.querySelectorAll('.context-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                menu.style.display = 'none';
                
                if (action === 'play') {
                    opengame();
                } else if (action === 'delete') {
                    deletegame();
                }
                
                selectedGame = null;
            });
        });
    }

    // ==================== 菜单和对话框 ====================

    function loadMenu() {
        try {
            const menuitems = document.getElementById("menuitems");
            if (!menuitems) {
                console.error('[loadMenu] menuitems element not found');
        return;
    }
		
            if (!mainmenulist || !Array.isArray(mainmenulist)) {
                console.error('[loadMenu] mainmenulist is not defined or not an array');
        return;
    }
            
            const menus = mainmenulist.map((item, index) => {
                if (!item || !Array.isArray(item) || item.length < 3) {
                    console.warn(`[loadMenu] Invalid menu item at index ${index}:`, item);
                    return '';
                }
                return `<div class="menuitem" focusable data-index="${index}">
                    <span class="menuitem-icon">${item[0] || ''}</span>
                    <span class="menuitem-text">${item[1] || ''}</span>
                </div>`;
            }).filter(html => html !== '');
            
            menuitems.innerHTML = menus.join('');
            
            // 添加点击和触摸事件（KaiOS 兼容）
            menuitems.querySelectorAll('.menuitem').forEach((menuItem, index) => {
                const handleMenuClick = function(e) {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    if (!beginUiAction()) return false;
                    try {
                        closeMenu();
                        if (mainmenulist[index] && typeof mainmenulist[index][2] === 'function') {
                            mainmenulist[index][2]();
                        }
                    } catch (err) {
                        console.error('[loadMenu] Error executing menu item callback:', err);
                    }
                    return false;
                };

                menuItem.addEventListener('click', handleMenuClick);
                menuItem.addEventListener('mouseenter', function() {
                    menuitems.querySelectorAll('.menuitem').forEach((el) => {
                        el.classList.remove('focus');
                        el.removeAttribute('focused');
                    });
                    menuItem.classList.add('focus');
                    menuItem.setAttribute('focused', '');
                });
            });
        } catch (err) {
            console.error('[loadMenu] Error loading menu:', err);
        }
    }

    function showMenu() {
        try {
            loadMenu();
            disableAppList();
            
            const menu = document.getElementById("menu");
            if (!menu) {
                console.error('[showMenu] menu element not found');
                return;
            }
            
            menu.style.display = "flex";
            
            try {
                saveMenuName();
            } catch (err) {
                console.warn('[showMenu] Error saving menu name:', err);
            }
            
            setLeftKeyName("选择");
            setCenterKeyName("");
            setRightKeyName("返回");
            
            // 点击遮罩关闭菜单
            menu.onclick = function(e) {
                if (e.target === menu) {
                    closeMenu();
                }
            };
            
            // 设置滚动容器为菜单内容区域
            const menuitems = document.getElementById("menuitems");
            if (typeof focusable !== 'undefined' && focusable) {
                try {
                    if (menuitems) {
                        focusable.scrollEl = menuitems;
                    }
                } catch (err) {
                    console.warn('[showMenu] Error setting scrollEl:', err);
                }
            }
            
            // 延迟聚焦，确保 DOM 已更新
            setTimeout(() => {
                try {
                    const firstItem = document.querySelector('.menuitem');
                    if (firstItem) {
                        if (typeof focusable !== 'undefined' && focusable && typeof focusable.requestFocus === 'function') {
                            focusable.requestFocus(firstItem);
                        } else {
                            // 如果 focusable 不可用，手动设置焦点
                            firstItem.setAttribute('focused', '');
                            firstItem.classList.add('focus');
                            // 手动滚动到第一个项目
                            if (menuitems) {
                                menuitems.scrollTop = 0;
                            }
                        }
                    }
                } catch (err) {
                    console.warn('[showMenu] Error focusing first menu item:', err);
                }
            }, 50);
            
            // 添加手动滚动处理（KaiOS 兼容）
            setupMenuScrollHandler();
        } catch (err) {
            console.error('[showMenu] Error showing menu:', err);
            // 确保菜单至少能显示
            const menu = document.getElementById("menu");
            if (menu) {
                menu.style.display = "flex";
            }
        }
    }

    let menuScrollHandler = null;
    
    function setupMenuScrollHandler() {
        // 移除旧的处理器
        if (menuScrollHandler) {
            document.removeEventListener('onFocus', menuScrollHandler);
            document.removeEventListener('keydown', menuScrollHandler);
        }
        
        // 创建新的处理器
        menuScrollHandler = function(e) {
            try {
                const menu = document.getElementById("menu");
                if (!menu || menu.style.display !== "flex") {
                    return;
                }
                
                const menuitems = document.getElementById("menuitems");
                if (!menuitems) return;
                
                // 处理焦点变化事件
                if (e.type === 'onFocus' && e.detail && e.detail.el) {
                    const focusedItem = e.detail.el;
                    if (focusedItem && focusedItem.classList.contains('menuitem')) {
                        scrollMenuItemIntoView(focusedItem, menuitems);
                    }
                }
                
                // 处理键盘事件（手动滚动）
                if (e.type === 'keydown') {
                    const key = e.key || e.keyCode;
                    if (key === 'ArrowDown' || key === 40 || key === 'ArrowUp' || key === 38) {
                        setTimeout(() => {
                            const focusedItem = document.querySelector('.menuitem.focus') || 
                                              document.querySelector('.menuitem[focused]');
                            if (focusedItem) {
                                scrollMenuItemIntoView(focusedItem, menuitems);
                            }
                        }, 10);
                    }
                }
            } catch (err) {
                console.warn('[setupMenuScrollHandler] Error:', err);
            }
        };
        
        // 监听焦点变化
        document.addEventListener('onFocus', menuScrollHandler, true);
        // 监听键盘事件
        document.addEventListener('keydown', menuScrollHandler, true);
    }
    
    function scrollMenuItemIntoView(item, container) {
        try {
            if (!item || !container) return;
            
            const itemRect = item.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const scrollTop = container.scrollTop || 0;
            
            // 计算项目相对于容器的位置
            const itemTop = itemRect.top - containerRect.top + scrollTop;
            const itemBottom = itemTop + itemRect.height;
            const containerHeight = containerRect.height;
            const currentScrollTop = scrollTop;
            
            // 如果项目在可视区域上方，向上滚动
            if (itemTop < currentScrollTop) {
                container.scrollTop = itemTop - 10;
            }
            // 如果项目在可视区域下方，向下滚动
            else if (itemBottom > currentScrollTop + containerHeight) {
                container.scrollTop = itemBottom - containerHeight + 10;
            }
        } catch (err) {
            console.warn('[scrollMenuItemIntoView] Error:', err);
        }
    }
    
    function closeMenu() {
        // 移除菜单滚动处理器
        if (menuScrollHandler) {
            document.removeEventListener('onFocus', menuScrollHandler);
            document.removeEventListener('keydown', menuScrollHandler);
            menuScrollHandler = null;
        }
        
        const menu = document.getElementById("menu");
        menu.style.display = "none";
        menu.onclick = null;
        restoreMenuName();
        
        // 恢复默认滚动（整个页面）
        if (typeof focusable !== 'undefined') {
            focusable.scrollEl = null;
        }
        
        enableApplist();
    }

    let dialogCallback = null;
    let confirmCallback = null;

    function showDialog(title, content, callback) {
        const alertheader = document.getElementById("alertheader");
        const alerttext = document.getElementById("alerttext");
        alertheader.innerText = title;
    alerttext.innerText = content;
        
        document.getElementById("alertDialog").style.display = "flex";
        document.getElementById("alert-cancel").style.display = "none";
        
        dialogCallback = callback || closeDialog;
    }

    function showConfirm(title, content, onConfirm, onCancel) {
        const alertheader = document.getElementById("alertheader");
        const alerttext = document.getElementById("alerttext");
        alertheader.innerText = title;
        alerttext.innerText = content;
        
        document.getElementById("alertDialog").style.display = "flex";
        document.getElementById("alert-cancel").style.display = "";
        
        confirmCallback = onConfirm;
        dialogCallback = onCancel || closeDialog;
    }

    function closeDialog() {
        document.getElementById("alertDialog").style.display = "none";
        dialogCallback = null;
        confirmCallback = null;
    }

    function about() {
        showDialog("关于 PyMO Web", 
            "PyMO Web 是一个基于 JavaScript 的 PyMO 视觉小说引擎实现。\n\n" +
            "支持在浏览器中运行 PyMO 格式的游戏。\n\n" +
            "Made by zixing"
        );
    }

    function exit() {
        showConfirm("确认退出", "是否确认退出？", () => {
            window.close();
        });
    }

    // ==================== 焦点管理 ====================

    function disableAppList() {
        const applist = document.getElementById('applist');
        nowfocus = applist.querySelector(".focus");
        
        applist.querySelectorAll(".game-card").forEach(card => {
            card.removeAttribute("focusable");
        });
    }

    function enableApplist() {
        const applist = document.getElementById('applist');
        applist.querySelectorAll(".game-card").forEach(card => {
            card.setAttribute("focusable", "");
        });
        
        if (nowfocus && typeof focusable !== 'undefined') {
            focusable.requestFocus(nowfocus);
        }
    }

    // ==================== 软键管理 ====================

    const keyNameStack = { left: [], center: [], right: [] };

    function setLeftKeyName(name) {
        const el = document.getElementById("softkeyleft");
        if (el) el.innerText = name;
    }

    function setCenterKeyName(name) {
        const el = document.getElementById("softkeycenter");
        if (el) el.innerText = name;
    }

    function setRightKeyName(name) {
        const el = document.getElementById("softkeyright");
        if (el) el.innerText = name;
    }

    function saveMenuName() {
        try {
            const leftEl = document.getElementById("softkeyleft");
            const centerEl = document.getElementById("softkeycenter");
            const rightEl = document.getElementById("softkeyright");
            
            if (leftEl) {
                keyNameStack.left.push(leftEl.innerText || leftEl.textContent || '');
            }
            if (centerEl) {
                keyNameStack.center.push(centerEl.innerText || centerEl.textContent || '');
            }
            if (rightEl) {
                keyNameStack.right.push(rightEl.innerText || rightEl.textContent || '');
            }
        } catch (err) {
            console.warn('[saveMenuName] Error saving menu name:', err);
        }
    }

    function restoreMenuName() {
        try {
            const left = keyNameStack.left.pop();
            if (left !== undefined) {
                setLeftKeyName(left);
                const center = keyNameStack.center.pop();
                const right = keyNameStack.right.pop();
                if (center !== undefined) {
                    setCenterKeyName(center);
                }
                if (right !== undefined) {
                    setRightKeyName(right);
                }
            }
        } catch (err) {
            console.warn('[restoreMenuName] Error restoring menu name:', err);
        }
    }

    // ==================== 软键事件 ====================

    function softleft() {
        if (!beginUiAction()) return;
        try {
            // 优先检查对话框
            const alertDialog = document.getElementById("alertDialog");
            if (alertDialog && alertDialog.style.display !== "none") {
                // 在对话框显示时，左键应该是取消（KaiOS 习惯）
                closeDialog();
                return;
            }
            
            // 然后检查菜单
            const menu = document.getElementById("menu");
            if (menu && menu.style.display === "flex") {
                // 查找当前聚焦的菜单项
                const fc = document.querySelector(".menuitem.focus") || 
                          document.querySelector(".menuitem[focused]");
                if (fc) {
                    const index = parseInt(fc.dataset.index);
                    if (!isNaN(index) && mainmenulist && mainmenulist[index]) {
                        // 直接触发菜单项的点击事件
                        try {
                            if (fc.onclick) {
                                fc.onclick();
                            } else {
                                // 如果没有 onclick，直接调用回调
                                closeMenu();
                                const callback = mainmenulist[index][2];
                                if (callback && typeof callback === 'function') {
                                    callback();
                                } else {
                                    console.error(`[softleft] Invalid callback for menu item ${index}`);
                                }
                            }
                        } catch (err) {
                            console.error('[softleft] Error executing menu item:', err);
                            // 如果出错，至少关闭菜单
                            closeMenu();
                        }
                        return;
                    }
                }
                // 如果没有聚焦项，关闭菜单
                closeMenu();
            } else {
                // 菜单未打开，打开菜单
                showMenu();
            }
        } catch (err) {
            console.error('[softleft] Error:', err);
        }
    }

    function softcenter() {
        if (!beginUiAction()) return;
        const alertDialog = document.getElementById("alertDialog");
        if (alertDialog.style.display !== "none") {
            // 在对话框显示时，中键（OK）应该是确认
            if (confirmCallback) {
                confirmCallback();
            }
            closeDialog();
            return;
        }
        
        // Enter 键启动游戏
        console.log('[softcenter] Checking game selection:', {
            selectedGame,
            nowfocus,
            nowfocusDataset: nowfocus?.dataset,
            focusClass: document.querySelector(".game-card.focus"),
            focusedAttr: document.querySelector(".game-card[focused]"),
            allGameCards: document.querySelectorAll('.game-card').length
        });
        
        // 优先级：selectedGame > nowfocus > .game-card.focus > [focused]
        if (selectedGame || nowfocus || document.querySelector(".game-card.focus") || document.querySelector(".game-card[focused]")) {
            opengame();
        } else {
            console.warn('[softcenter] No game selected or focused!');
            showDialog("提示", "请先用方向键选择一个游戏，然后按 OK 键启动！");
        }
    }

    function softright() {
        if (!beginUiAction()) return;
        try {
            // 优先检查对话框
            const alertDialog = document.getElementById("alertDialog");
            if (alertDialog && alertDialog.style.display !== "none") {
                // 在对话框显示时，右键应该是确认（KaiOS 习惯）
                if (confirmCallback) {
                    confirmCallback();
                }
                closeDialog();
                return;
            }
            
            // 然后检查菜单
            const menu = document.getElementById("menu");
            if (menu && menu.style.display === "flex") {
                closeMenu();
                return;
            }
            
            // 最后才是退出
            exit();
        } catch (err) {
            console.error('[softright] Error:', err);
        }
    }

    // ==================== 键盘事件 ====================

    function handleKeydown(e) {
        // 在 KaiOS 上，软键可能使用不同的键码
        const key = e.key || e.keyCode;
        
        // 如果菜单打开，处理菜单内的键盘操作
        const menu = document.getElementById("menu");
        if (menu && menu.style.display === "flex") {
            // 优先处理关闭菜单的按键
            if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'E' || e.key === 'e' || 
                e.key === 'SoftRight' || e.keyCode === 27 || e.keyCode === 8 || e.keyCode === 114) {
                e.preventDefault();
                e.stopPropagation();
                closeMenu();
                return false;
            }
            
            const focusedItem = document.querySelector('.menuitem.focus') || 
                              document.querySelector('.menuitem[focused]');
            
            if (focusedItem) {
                switch (e.key) {
                    case 'Enter':
                    case 13: // Enter keyCode
                    case ' ': // 空格键
                    case 32: // 空格 keyCode
                        // 触发菜单项点击
                        e.preventDefault();
                        e.stopPropagation();
                        focusedItem.click();
                        return false;
                    case 'ArrowDown':
                    case 40: // Down arrow keyCode
                        // 手动导航到下一个菜单项（如果 focusable 不工作）
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                            const allItems = Array.from(document.querySelectorAll('.menuitem'));
                            const currentIndex = allItems.indexOf(focusedItem);
                            if (currentIndex >= 0 && currentIndex < allItems.length - 1) {
                                const nextItem = allItems[currentIndex + 1];
                                if (nextItem) {
                                    // 移除旧焦点
                                    focusedItem.classList.remove('focus');
                                    focusedItem.removeAttribute('focused');
                                    // 设置新焦点
                                    nextItem.classList.add('focus');
                                    nextItem.setAttribute('focused', '');
                                    // 滚动到新项目
                                    const menuitems = document.getElementById("menuitems");
                                    if (menuitems) {
                                        scrollMenuItemIntoView(nextItem, menuitems);
                                    }
                                }
                            }
                        } catch (err) {
                            console.warn('[handleKeydown] Error navigating menu:', err);
                        }
                        return false;
                    case 'ArrowUp':
                    case 38: // Up arrow keyCode
                        // 手动导航到上一个菜单项
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                            const allItems = Array.from(document.querySelectorAll('.menuitem'));
                            const currentIndex = allItems.indexOf(focusedItem);
                            if (currentIndex > 0) {
                                const prevItem = allItems[currentIndex - 1];
                                if (prevItem) {
                                    // 移除旧焦点
                                    focusedItem.classList.remove('focus');
                                    focusedItem.removeAttribute('focused');
                                    // 设置新焦点
                                    prevItem.classList.add('focus');
                                    prevItem.setAttribute('focused', '');
                                    // 滚动到新项目
                                    const menuitems = document.getElementById("menuitems");
                                    if (menuitems) {
                                        scrollMenuItemIntoView(prevItem, menuitems);
                                    }
                                }
                            }
                        } catch (err) {
                            console.warn('[handleKeydown] Error navigating menu:', err);
                        }
                        return false;
                }
            }
        }
        
        switch (e.key) {
            case 'Enter':
            case 13: // Enter keyCode
                softcenter();
                break;
            case 'Escape':
        case 'Backspace':
            case 27: // Escape keyCode
            case 8: // Backspace keyCode
                const menu = document.getElementById("menu");
                const alertDialog = document.getElementById("alertDialog");
                if (alertDialog.style.display !== "none") {
                    closeDialog();
                    e.preventDefault();
                } else if (menu.style.display === "flex") {
                    closeMenu();
                    e.preventDefault();
                }
            break;
        case 'Q':
            case 'q':
            case '*':
        case 'SoftLeft':
            case 113: // F2 (通常映射为 SoftLeft)
            case 106: // * 键的 keyCode
                softleft();
                e.preventDefault();
                e.stopPropagation();
                return false;
        case 'E':
            case 'e':
        case 'SoftRight':
            case 114: // F3 (通常映射为 SoftRight)
                softright();
                e.preventDefault();
                e.stopPropagation();
                return false;
        }
    }

    // ==================== 初始化 ====================

    window.addEventListener("load", () => {
        document.getElementById("gameFileupload").addEventListener("change", onUploadFile);
        
        // 按钮事件
        document.getElementById("btn-install")?.addEventListener("click", installgame);
        document.getElementById("btn-refresh")?.addEventListener("click", refreshGameList);
        
        // 软键点击（KaiOS 兼容）
        const softkeyleft = document.getElementById('softkeyleft');
        const softkeyright = document.getElementById('softkeyright');
        const softkeycenter = document.getElementById('softkeycenter');
        
        if (softkeyleft) softkeyleft.addEventListener('click', softleft);
        if (softkeyright) softkeyright.addEventListener('click', softright);
        if (softkeycenter) softkeycenter.addEventListener('click', softcenter);
        
        // 对话框按钮
        document.getElementById('alert-confirm')?.addEventListener('click', () => {
            if (confirmCallback) {
                confirmCallback();
            }
            closeDialog();
        });
        document.getElementById('alert-cancel')?.addEventListener('click', closeDialog);
        
        // 键盘事件（KaiOS 兼容）
        window.addEventListener('keydown', handleKeydown, true); // 捕获阶段，确保优先处理
        document.addEventListener('keydown', handleKeydown, true); // 文档级别
        
        // 焦点变化时自动滚动
        document.addEventListener('onFocus', (e) => {
            if (e.detail && e.detail.el) {
                const el = e.detail.el;
                
                // 检查是否在菜单中
                const menuContainer = document.getElementById('menuitems');
                if (menuContainer && menuContainer.contains(el)) {
                    // 菜单项滚动
                    const containerRect = menuContainer.getBoundingClientRect();
                    const elRect = el.getBoundingClientRect();
                    
                    if (elRect.top < containerRect.top) {
                        menuContainer.scrollTop -= (containerRect.top - elRect.top + 10);
                    } else if (elRect.bottom > containerRect.bottom) {
                        menuContainer.scrollTop += (elRect.bottom - containerRect.bottom + 10);
                    }
                } else {
                    // 游戏列表和其他元素 - 滚动整个页面
                    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    
                    // 同时确保容器也滚动
                    const container = document.querySelector('.container');
                    if (container) {
                        const containerRect = container.getBoundingClientRect();
                        const elRect = el.getBoundingClientRect();
                        
                        // 考虑软键栏高度
                        const softkeysHeight = 40;
                        
                        if (elRect.bottom > window.innerHeight - softkeysHeight) {
                            window.scrollBy(0, elRect.bottom - window.innerHeight + softkeysHeight + 10);
                        } else if (elRect.top < 0) {
                            window.scrollBy(0, elRect.top - 10);
                        }
                    }
                }
            }
        });
        
        // 加载游戏列表
        refreshGameList();
    });

    // 兼容旧版 main 函数
    if (typeof main === 'function') {
        // main();
    }

} catch (err) {
    console.error('Index page error:', err);
}
