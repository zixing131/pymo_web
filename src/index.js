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

    // ==================== 游戏操作 ====================

    function myopengame(gamename) {
        // 使用新版游戏页面
        // 注意：gamename 可能带有 .zip 后缀，保持原样传递
        const href = 'game_new.html?game=' + encodeURIComponent(gamename);
        window.location.href = href;
    }

    function opengame() {
        let gamename = null;
        
        // 优先级：selectedGame > nowfocus > .game-card.focus
        if (selectedGame) {
            gamename = selectedGame.name;
        } else if (nowfocus && nowfocus.dataset.gamename) {
            gamename = nowfocus.dataset.gamename;
        } else {
            // 检查焦点系统的 focus 类
            const focusedCard = document.querySelector('.game-card.focus');
            if (focusedCard && focusedCard.dataset.gamename) {
                gamename = focusedCard.dataset.gamename;
            }
        }
        
        if (!gamename) {
            showDialog("提示", "请先选择一个游戏！");
            return;
        }
        
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
                        const gameconfig = res.Zip['gameconfig.txt'];
                        const configText = new TextDecoder('utf-8').decode(gameconfig.compressed_data);
                        const config = processGameconfig(configText);
                        
                        let gametitle = config["gametitle"] || res.ZipName;
                        gametitle = gametitle.replace(/\\n/g, '<br>');
                        
                        // 获取图标
                        let iconUrl = '';
                        const iconfile = res.Zip["icon.png"];
                        if (iconfile) {
                            const blob = new Blob([iconfile.compressed_data], { type: "image/png" });
                            iconUrl = URL.createObjectURL(blob);
                        }
                        
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
    
    // 安装 ZIP 文件
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
        
        const updateProgress = (progress) => {
            const el = applist.querySelector('.loading-progress');
            if (el) el.textContent = progress;
        };
        
        try {
            updateStatus(`正在解析 ${file.name}...`);
            updateProgress('');
            
            if (typeof JSZip === 'undefined') {
                throw new Error('JSZip 库未加载');
            }
            
            updateProgress('解压中...');
            const zip = await JSZip.loadAsync(file, {
                onProgress: (metadata) => {
                    updateProgress(`${metadata.percent.toFixed(0)}%`);
                }
            });
            
            updateStatus('正在处理文件...');
            updateProgress('');
            
            const fileNames = Object.keys(zip.files);
            
            // 找到 gameconfig.txt 所在目录作为根目录
            let rootPrefix = '';
            for (const filename of fileNames) {
                const lowerName = filename.toLowerCase();
                if (lowerName.endsWith('gameconfig.txt')) {
                    // 获取 gameconfig.txt 所在的目录
                    const lastSlash = filename.lastIndexOf('/');
                    if (lastSlash > 0) {
                        rootPrefix = filename.substring(0, lastSlash + 1);
                        console.log(`检测到游戏根目录: ${rootPrefix}`);
                    }
                    break;
                }
            }
            
            const directory = {};
            let processed = 0;
            
            for (const filename of fileNames) {
                const zipEntry = zip.files[filename];
                if (!zipEntry.dir) {
                    try {
                        // 去掉根目录前缀
                        let targetName = filename;
                        if (rootPrefix && filename.startsWith(rootPrefix)) {
                            targetName = filename.substring(rootPrefix.length);
                        }
                        
                        // 跳过根目录外的文件
                        if (rootPrefix && !filename.startsWith(rootPrefix)) {
                            continue;
                        }
                        
                        // 跳过空文件名
                        if (!targetName) continue;
                        
                        const data = await zipEntry.async('uint8array');
                        directory[targetName] = {
                            compression_method: 0,
                            compressed_data: data,
                            uncompressed_len: data.length
                        };
                    } catch (err) {
                        console.warn(`跳过文件: ${filename}`, err);
                    }
                }
                processed++;
                if (processed % 50 === 0) {
                    updateProgress(`${processed}/${fileNames.length} 文件`);
                    await new Promise(r => setTimeout(r, 0));
                }
            }
            
            if (Object.keys(directory).length === 0) {
                throw new Error('ZIP 文件中没有可读取的文件');
            }
            
            // 检查是否包含 gameconfig.txt
            if (!directory['gameconfig.txt']) {
                throw new Error('未找到 gameconfig.txt，请确认是有效的 PyMO 游戏包');
            }
            
            updateStatus('正在保存到数据库...');
            updateProgress('');
            
            await installGameWithParsedData(file.name, directory);
            
            showDialog("提示", file.name + " 安装成功！");
            refreshGameList();
            
        } catch (err) {
            console.error('Install error:', err);
            applist.innerHTML = originalContent;
            
            // 检查是否是加密文件
            if (err.message && err.message.includes('Encrypted')) {
                showDialog("提示", 
                    "此 ZIP 文件已加密，无法直接安装。\n\n" +
                    "请先用解压软件（如 7-Zip、WinRAR）解压，\n" +
                    "然后重新打包为无密码的 ZIP 文件再上传。"
                );
                return;
            }
            
            showDialog("提示", file.name + " 安装失败！\n" + (err.message || err));
        }
    }
    
    // 使用已解析的数据安装游戏
    async function installGameWithParsedData(zipName, directory) {
        // 打开数据库
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
                    Zip: directory
                });
                
                putRequest.onerror = () => reject(putRequest.error);
                transaction.oncomplete = () => resolve();
            };
        });
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
        const menuitems = document.getElementById("menuitems");
        if (menuitems) {
            const menus = mainmenulist.map((item, index) => 
                `<div class="menuitem" focusable data-index="${index}">
                    <span class="menuitem-icon">${item[0]}</span>
                    <span class="menuitem-text">${item[1]}</span>
                </div>`
            );
            menuitems.innerHTML = menus.join('');
            
            // 添加鼠标点击事件
            menuitems.querySelectorAll('.menuitem').forEach((menuItem, index) => {
                menuItem.addEventListener('click', () => {
                    closeMenu();
                    mainmenulist[index][2]();
                });
            });
        }
    }

    function showMenu() {
        loadMenu();
        disableAppList();
        const menu = document.getElementById("menu");
        menu.style.display = "flex";
        saveMenuName();
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
        if (typeof focusable !== 'undefined') {
            focusable.scrollEl = menuitems;
        }
        
        const firstItem = document.querySelector('.menuitem');
        if (firstItem && typeof focusable !== 'undefined') {
            focusable.requestFocus(firstItem);
        }
    }

    function closeMenu() {
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
        keyNameStack.left.push(document.getElementById("softkeyleft").innerText);
        keyNameStack.center.push(document.getElementById("softkeycenter").innerText);
        keyNameStack.right.push(document.getElementById("softkeyright").innerText);
    }

    function restoreMenuName() {
        const left = keyNameStack.left.pop();
        if (left !== undefined) {
            setLeftKeyName(left);
            setCenterKeyName(keyNameStack.center.pop());
            setRightKeyName(keyNameStack.right.pop());
        }
    }

    // ==================== 软键事件 ====================

    function softleft() {
        const alertDialog = document.getElementById("alertDialog");
        if (alertDialog.style.display !== "none") {
            if (confirmCallback) {
                confirmCallback();
            }
            closeDialog();
            return;
        }
        
        const menu = document.getElementById("menu");
        if (menu.style.display === "flex") {
            const fc = document.querySelector(".menuitem.focus");
            if (fc) {
                const index = parseInt(fc.dataset.index);
                if (!isNaN(index) && mainmenulist[index]) {
                    closeMenu();
                    mainmenulist[index][2]();
                    return;
                }
            }
            closeMenu();
        } else {
            showMenu();
        }
    }

    function softcenter() {
        const alertDialog = document.getElementById("alertDialog");
        if (alertDialog.style.display !== "none") {
            if (confirmCallback) {
                confirmCallback();
            }
            closeDialog();
            return;
        }
        
        // Enter 键启动游戏
        if (nowfocus || document.querySelector(".game-card.focus")) {
            opengame();
        }
    }

    function softright() {
        const alertDialog = document.getElementById("alertDialog");
        if (alertDialog.style.display !== "none") {
            closeDialog();
            return;
        }
        
        const menu = document.getElementById("menu");
        if (menu.style.display === "flex") {
            closeMenu();
        } else {
            exit();
        }
    }

    // ==================== 键盘事件 ====================

    function handleKeydown(e) {
        switch (e.key) {
            case 'Enter':
                softcenter();
                break;
            case 'Escape':
            case 'Backspace':
                const menu = document.getElementById("menu");
                const alertDialog = document.getElementById("alertDialog");
                if (menu.style.display === "flex" || alertDialog.style.display !== "none") {
                    softright();
                    e.preventDefault();
                }
                break;
            case 'Q':
            case 'SoftLeft':
                softleft();
                e.preventDefault();
                break;
            case 'E':
            case 'SoftRight':
                softright();
                e.preventDefault();
                break;
        }
    }

    // ==================== 初始化 ====================

    window.addEventListener("load", () => {
        document.getElementById("gameFileupload").addEventListener("change", onUploadFile);
        
        // 按钮事件
        document.getElementById("btn-install")?.addEventListener("click", installgame);
        document.getElementById("btn-refresh")?.addEventListener("click", refreshGameList);
        
        // 软键点击
        document.getElementById('softkeyleft').onclick = softleft;
        document.getElementById('softkeyright').onclick = softright;
        document.getElementById('softkeycenter').onclick = softcenter;
        
        // 对话框按钮
        document.getElementById('alert-confirm')?.addEventListener('click', () => {
            if (confirmCallback) {
                confirmCallback();
            }
            closeDialog();
        });
        document.getElementById('alert-cancel')?.addEventListener('click', closeDialog);
        
        // 键盘事件
        window.addEventListener('keydown', handleKeydown);
        
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
