/**
 * PyMO Web - 脚本解析器
 * 负责解析和执行 PyMO 脚本
 */

class ScriptParser {
    constructor(engine) {
        this.engine = engine;
        
        // 当前脚本状态
        this.scriptName = '';
        this.lines = [];
        this.currentLine = 0;
        this.labels = {};  // 标签索引 { labelName: lineIndex }
        
        // 调用栈（用于 #call/#ret）
        this.callStack = [];
        
        // 运行状态
        this.running = false;
        this.waiting = false;
    }

    /**
     * 加载脚本
     * @param {string} scriptName - 脚本名称（不含扩展名）
     */
    async loadScript(scriptName) {
        // 确保 scriptName 是字符串类型（配置可能解析为数字）
        this.scriptName = String(scriptName);
        
        // 从游戏数据加载脚本
        const scriptPath = `script/${this.scriptName}.txt`;
        let scriptData;
        
        try {
            scriptData = this.engine.gameData.Zip[scriptPath]?.compressed_data;
            if (!scriptData) {
                // 尝试大写
                scriptData = this.engine.gameData.Zip[`script/${this.scriptName.toUpperCase()}.txt`]?.compressed_data;
            }
            // 如果还是找不到，尝试补零（如 "1" -> "01"）
            if (!scriptData && /^\d+$/.test(this.scriptName)) {
                const paddedName = this.scriptName.padStart(2, '0');
                scriptData = this.engine.gameData.Zip[`script/${paddedName}.txt`]?.compressed_data;
                if (scriptData) {
                    this.scriptName = paddedName;
                }
            }
        } catch (e) {
            console.error(`Failed to load script: ${this.scriptName}`, e);
            return false;
        }

        if (!scriptData) {
            console.error(`Script not found: ${this.scriptName}`);
            return false;
        }

        const text = new TextDecoder('utf-8').decode(scriptData);
        this.lines = text.split('\n');
        this.currentLine = 0;
        
        // 预处理：建立标签索引
        this._buildLabelIndex();
        
        // 清理缓存等
        this.engine.clearCache();
        
        return true;
    }

    /**
     * 建立标签索引
     * @private
     */
    _buildLabelIndex() {
        this.labels = {};
        for (let i = 0; i < this.lines.length; i++) {
            const line = this.lines[i].trim();
            if (line.startsWith('#label ')) {
                const labelName = line.substring(7).trim();
                this.labels[labelName] = i;
            }
        }
    }

    /**
     * 跳转到标签
     * @param {string} labelName - 标签名
     * @returns {boolean} 是否成功
     */
    gotoLabel(labelName) {
        // 先从当前位置往下找
        for (let i = this.currentLine; i < this.lines.length; i++) {
            const line = this.lines[i].trim();
            if (line === `#label ${labelName}`) {
                this.currentLine = i + 1;
                console.log(`[Script] gotoLabel: ${labelName}, new line: ${this.currentLine}, total lines: ${this.lines.length}`);
                return true;
            }
        }
        
        // 再从头找到当前位置
        for (let i = 0; i < this.currentLine; i++) {
            const line = this.lines[i].trim();
            if (line === `#label ${labelName}`) {
                this.currentLine = i + 1;
                console.log(`[Script] gotoLabel: ${labelName}, new line: ${this.currentLine}, total lines: ${this.lines.length}`);
                return true;
            }
        }
        
        // 使用预建立的索引
        if (this.labels[labelName] !== undefined) {
            this.currentLine = this.labels[labelName] + 1;
            console.log(`[Script] gotoLabel: ${labelName}, new line: ${this.currentLine}, total lines: ${this.lines.length}`);
            return true;
        }
        
        console.error(`Label not found: ${labelName}`);
        return false;
    }

    /**
     * 解析命令行
     * @param {string} line - 命令行
     * @returns {{command: string, args: string[]}|null}
     */
    parseLine(line) {
        const trimmed = line.trim();
        
        // 空行或注释
        if (!trimmed || !trimmed.startsWith('#')) {
            return null;
        }

        // 找到命令名
        const spaceIndex = trimmed.indexOf(' ');
        if (spaceIndex === -1) {
            // 无参数命令
            return { command: trimmed, args: [] };
        }

        const command = trimmed.substring(0, spaceIndex);
        const argsStr = trimmed.substring(spaceIndex + 1);
        
        // 解析参数
        const args = this._parseArgs(argsStr);
        
        return { command, args };
    }

    /**
     * 解析参数字符串
     * @private
     */
    _parseArgs(argsStr) {
        return argsStr.split(',').map(arg => arg.trim());
    }

    /**
     * 执行单条命令
     * @param {string} command - 命令名
     * @param {string[]} args - 参数数组
     */
    async executeCommand(command, args) {
        // 映射命令到处理函数
        const handlers = {
            // 对话文字
            '#say': () => this.cmd_say(args),
            '#text': () => this.cmd_text(args),
            '#text_off': () => this.cmd_text_off(),
            '#waitkey': () => this.cmd_waitkey(),
            '#title': () => this.cmd_title(args),
            '#title_dsp': () => this.cmd_title_dsp(),
            
            // 背景
            '#bg': () => this.cmd_bg(args),
            '#scroll': () => this.cmd_scroll(args),
            
            // 立绘
            '#chara': () => this.cmd_chara(args),
            '#chara_cls': () => this.cmd_chara_cls(args),
            '#chara_pos': () => this.cmd_chara_pos(args),
            '#chara_y': () => this.cmd_chara_y(args),
            '#chara_scroll': () => this.cmd_chara_scroll(args),
            '#chara_quake': () => this.cmd_chara_quake(args),
            '#chara_down': () => this.cmd_chara_down(args),
            '#chara_up': () => this.cmd_chara_up(args),
            '#chara_anime': () => this.cmd_chara_anime(args),
            
            // 特效
            '#flash': () => this.cmd_flash(args),
            '#quake': () => this.cmd_quake(),
            '#fade_out': () => this.cmd_fade_out(args),
            '#fade_in': () => this.cmd_fade_in(args),
            
            // 变量
            '#set': () => this.cmd_set(args),
            '#add': () => this.cmd_add(args),
            '#sub': () => this.cmd_sub(args),
            '#rand': () => this.cmd_rand(args),
            
            // 跳转
            '#label': () => {},  // 标签不执行操作
            '#goto': () => this.cmd_goto(args),
            '#if': () => this.cmd_if(args),
            '#change': () => this.cmd_change(args),
            '#call': () => this.cmd_call(args),
            '#ret': () => this.cmd_ret(),
            
            // 选择
            '#sel': () => this.cmd_sel(args),
            '#select_text': () => this.cmd_select_text(args),
            '#select_var': () => this.cmd_select_var(args),
            '#select_img': () => this.cmd_select_img(args),
            '#select_imgs': () => this.cmd_select_imgs(args),
            
            // 等待
            '#wait': () => this.cmd_wait(args),
            '#wait_se': () => this.cmd_wait_se(),
            '#waittime': () => this.cmd_waittime(args),
            
            // 音频
            '#bgm': () => this.cmd_bgm(args),
            '#bgm_stop': () => this.cmd_bgm_stop(),
            '#se': () => this.cmd_se(args),
            '#se_stop': () => this.cmd_se_stop(),
            '#vo': () => this.cmd_vo(args),
            
            // 系统
            '#load': () => this.cmd_load(args),
            '#album': () => this.cmd_album(args),
            '#music': () => this.cmd_music(),
            '#date': () => this.cmd_date(args),
            '#config': () => this.cmd_config(),
            '#textbox': () => this.cmd_textbox(args),
            '#movie': () => this.cmd_movie(args),
            '#anime_on': () => this.cmd_anime_on(args),
            '#anime_off': () => this.cmd_anime_off(args)
        };

        const handler = handlers[command];
        if (handler) {
            await handler();
        } else {
            console.warn(`Unknown command: ${command}`, args);
        }
    }

    /**
     * 运行脚本主循环
     */
    async run() {
        this.running = true;
        
        while (this.running && this.currentLine < this.lines.length) {
            // 等待引擎恢复运行（菜单关闭后）
            await this._waitForResume();
            
            const line = this.lines[this.currentLine];
            const parsed = this.parseLine(line);
            
            this.currentLine++;
            
            if (parsed) {
                try {
                    await this.executeCommand(parsed.command, parsed.args);
                } catch (e) {
                    console.error(`Error at line ${this.currentLine}: ${line}`, e);
                }
            }
        }
        
        // 脚本执行完毕
        if (this.currentLine >= this.lines.length) {
            console.log('Script ended');
            // 如果有调用栈，返回
            if (this.callStack.length > 0) {
                this.cmd_ret();
                await this.run();
            } else {
                // 脚本真正结束，通知引擎
                this.engine.onScriptEnd();
            }
        }
    }
    
    /**
     * 等待引擎恢复运行
     * @private
     */
    async _waitForResume() {
        while (!this.engine.running) {
            await new Promise(resolve => setTimeout(resolve, 100));
            // 如果脚本被停止，退出等待
            if (!this.running) break;
        }
    }

    /**
     * 停止脚本执行
     */
    stop() {
        this.running = false;
    }

    // ==================== 命令实现 ====================

    // --- 对话文字 ---
    
    async cmd_say(args) {
        let name = null;
        let content = '';
        
        if (args.length === 1) {
            content = args[0];
        } else {
            name = args[0];
            content = args.slice(1).join(',');
        }
        
        await this.engine.graphics.showMessage(content, name);
    }

    async cmd_text(args) {
        const content = args[0];
        const x1 = parseFloat(args[1]) || 0;
        const y1 = parseFloat(args[2]) || 0;
        const x2 = parseFloat(args[3]) || 100;
        const y2 = parseFloat(args[4]) || 100;
        const color = args[5] || '#ffffff';
        const size = parseInt(args[6]) || 16;
        const showImmediately = parseInt(args[7]) || 0;
        
        await this.engine.graphics.showText(content, x1, y1, x2, y2, color, size, showImmediately);
    }

    cmd_text_off() {
        this.engine.graphics.clearText();
    }

    async cmd_waitkey() {
        await this.engine.waitForKey(5000);
    }

    cmd_title(args) {
        this.engine.save.title = args[0] || '';
    }

    async cmd_title_dsp() {
        await this.engine.graphics.showTitle(this.engine.save.title);
    }

    // --- 背景 ---
    
    async cmd_bg(args) {
        const filename = args[0];
        const transition = args[1] || 'BG_ALPHA';
        const speed = args[2] || '300';
        const x = parseFloat(args[3]) || 0;
        const y = parseFloat(args[4]) || 0;
        
        await this.engine.graphics.showBackground(filename, transition, speed, x, y);
        
        // 检查是否是 CG（多种方式判断）
        const cgPrefix = this.engine.config.get('cgprefix');
        // 1. 文件名以 cgprefix 开头
        if (cgPrefix && filename.toUpperCase().startsWith(cgPrefix.toUpperCase())) {
            this.engine.unlockCG(filename);
        }
        // 2. 文件名在 CG 列表中
        else if (this.engine.cgList && this.engine.cgList.includes(filename)) {
            this.engine.unlockCG(filename);
        }
        
        // 清除立绘
        this.engine.graphics.clearAllCharacters();
    }

    async cmd_scroll(args) {
        const filename = args[0];
        const startX = parseFloat(args[1]) || 0;
        const startY = parseFloat(args[2]) || 0;
        const endX = parseFloat(args[3]) || 0;
        const endY = parseFloat(args[4]) || 0;
        const time = parseInt(args[5]) || 1000;
        
        await this.engine.graphics.scrollBackground(filename, startX, startY, endX, endY, time);
    }

    // --- 立绘 ---
    
    async cmd_chara(args) {
        // #chara charaID,filename,position,layer[,...],time
        const time = parseInt(args[args.length - 1]) || 300;
        
        for (let i = 0; i < args.length - 1; i += 4) {
            const charaId = args[i];
            const filename = args[i + 1];
            const position = parseFloat(args[i + 2]) || 50;
            const layer = parseInt(args[i + 3]) || 0;
            
            if (filename.toUpperCase() === 'NULL') {
                this.engine.graphics.hideCharacter(charaId);
            } else {
                await this.engine.graphics.showCharacter(charaId, filename, position, layer);
            }
        }
        
        await this.engine.graphics.displayCharacters(time);
    }

    async cmd_chara_cls(args) {
        const charaId = args[0];
        const time = parseInt(args[1]) || 300;
        
        if (charaId === 'a') {
            this.engine.graphics.clearAllCharacters();
        } else {
            this.engine.graphics.hideCharacter(charaId);
        }
        
        await this.engine.graphics.displayCharacters(time);
    }

    async cmd_chara_pos(args) {
        const charaId = args[0];
        const x = parseFloat(args[1]) || 0;
        const y = parseFloat(args[2]) || 0;
        const mode = parseInt(args[3]) || 5;
        
        this.engine.graphics.setCharacterPosition(charaId, x, y, mode);
        await this.engine.graphics.displayCharacters(0);
    }

    async cmd_chara_y(args) {
        // #chara_y mode,charaID,filename,x,y,layer[,...],time
        const mode = parseInt(args[0]) || 5;
        const time = parseInt(args[args.length - 1]) || 300;
        
        for (let i = 1; i < args.length - 1; i += 5) {
            const charaId = args[i];
            const filename = args[i + 1];
            const x = parseFloat(args[i + 2]) || 0;
            const y = parseFloat(args[i + 3]) || 0;
            const layer = parseInt(args[i + 4]) || 0;
            
            if (filename.toUpperCase() === 'NULL') {
                this.engine.graphics.hideCharacter(charaId);
            } else {
                await this.engine.graphics.showCharacterY(charaId, filename, x, y, layer, mode);
            }
        }
        
        await this.engine.graphics.displayCharacters(time);
    }

    async cmd_chara_scroll(args) {
        // 两种格式
        if (args.length >= 10) {
            // #chara_scroll mode,charaID,filename,startx,starty,endx,endy,beginalpha,layer,time
            const mode = parseInt(args[0]) || 5;
            const charaId = args[1];
            const filename = args[2];
            const startX = parseFloat(args[3]) || 0;
            const startY = parseFloat(args[4]) || 0;
            const endX = parseFloat(args[5]) || 0;
            const endY = parseFloat(args[6]) || 0;
            const beginAlpha = parseInt(args[7]) || 0;
            const layer = parseInt(args[8]) || 0;
            const time = parseInt(args[9]) || 400;
            
            await this.engine.graphics.scrollCharacter(charaId, filename, startX, startY, endX, endY, beginAlpha, layer, mode, time);
        } else {
            // #chara_scroll mode,charaID,endx,endy,time
            const mode = parseInt(args[0]) || 5;
            const charaId = args[1];
            const endX = parseFloat(args[2]) || 0;
            const endY = parseFloat(args[3]) || 0;
            const time = parseInt(args[4]) || 400;
            
            await this.engine.graphics.scrollCharacterTo(charaId, endX, endY, mode, time);
        }
    }

    async cmd_chara_quake(args) {
        const charaIds = args;
        const offsets = [[-10,3],[10,3],[-6,2],[5,2],[-4,1],[3,0],[-1,0],[0,0]];
        await this.engine.graphics.shakeCharacters(charaIds, offsets);
    }

    async cmd_chara_down(args) {
        const charaIds = args;
        const offsets = [[0,7],[0,16],[0,12],[0,16],[0,7],[0,0]];
        await this.engine.graphics.shakeCharacters(charaIds, offsets);
    }

    async cmd_chara_up(args) {
        const charaIds = args;
        const offsets = [[0,-16],[0,0],[0,-6],[0,0]];
        await this.engine.graphics.shakeCharacters(charaIds, offsets);
    }

    async cmd_chara_anime(args) {
        const charaId = args[0];
        const period = parseInt(args[1]) || 100;
        const loopNum = parseInt(args[2]) || 1;
        
        const offsets = [];
        for (let i = 3; i < args.length; i += 2) {
            offsets.push([parseFloat(args[i]) || 0, parseFloat(args[i + 1]) || 0]);
        }
        
        await this.engine.graphics.animateCharacter(charaId, offsets, period, loopNum);
    }

    // --- 特效 ---
    
    async cmd_flash(args) {
        const color = args[0] || '#ffffff';
        const time = parseInt(args[1]) || 0;
        await this.engine.graphics.flash(color, time);
    }

    async cmd_quake() {
        await this.engine.graphics.quake();
    }

    async cmd_fade_out(args) {
        const color = args[0] || '#000000';
        const time = parseInt(args[1]) || 1000;
        await this.engine.graphics.fadeOut(color, time);
    }

    async cmd_fade_in(args) {
        const time = parseInt(args[0]) || 1000;
        await this.engine.graphics.fadeIn(time);
    }

    // --- 变量 ---
    
    cmd_set(args) {
        const name = args[0];
        const value = args[1];
        this.engine.variables.set(name, value);
    }

    cmd_add(args) {
        const name = args[0];
        const value = args[1];
        this.engine.variables.add(name, value);
    }

    cmd_sub(args) {
        const name = args[0];
        const value = args[1];
        this.engine.variables.sub(name, value);
    }

    cmd_rand(args) {
        const name = args[0];
        const min = parseInt(args[1]) || 0;
        const max = parseInt(args[2]) || 1;
        this.engine.variables.rand(name, min, max);
    }

    // --- 跳转 ---
    
    cmd_goto(args) {
        const labelName = args[0];
        console.log('[Script] #goto:', labelName);
        this.gotoLabel(labelName);
    }

    cmd_if(args) {
        // #if condition,goto labelName
        const fullExpr = args.join(',');
        const gotoIndex = fullExpr.toLowerCase().indexOf(',goto ');
        
        if (gotoIndex === -1) {
            console.error('Invalid #if syntax:', args);
            return;
        }
        
        const condition = fullExpr.substring(0, gotoIndex).trim();
        const labelName = fullExpr.substring(gotoIndex + 6).trim();
        
        const conditionResult = this.engine.variables.evaluate(condition);
        console.log('[Script] #if condition:', condition, 'result:', conditionResult, 'FSEL:', this.engine.variables.get('FSEL'));
        
        if (conditionResult) {
            console.log('[Script] #if goto:', labelName);
            this.gotoLabel(labelName);
        }
    }

    async cmd_change(args) {
        const scriptName = args[0];
        await this.loadScript(scriptName);
    }

    async cmd_call(args) {
        const scriptName = args[0];
        
        // 保存当前状态到调用栈
        this.callStack.push({
            scriptName: this.scriptName,
            lines: this.lines,
            currentLine: this.currentLine,
            labels: this.labels
        });
        
        await this.loadScript(scriptName);
    }

    cmd_ret() {
        if (this.callStack.length === 0) {
            console.warn('#ret without #call');
            this.running = false;
            return;
        }
        
        const state = this.callStack.pop();
        this.scriptName = state.scriptName;
        this.lines = state.lines;
        this.currentLine = state.currentLine;
        this.labels = state.labels;
    }

    // --- 选择 ---
    
    async cmd_sel(args) {
        const choiceNum = parseInt(args[0]) || 0;
        const hintPic = args[1] || null;
        
        // 读取接下来的 choiceNum 行作为选项
        const choices = [];
        for (let i = 0; i < choiceNum; i++) {
            if (this.currentLine < this.lines.length) {
                choices.push(this.lines[this.currentLine].trim());
                this.currentLine++;
            }
        }
        
        const result = await this.engine.ui.showSelection(choices, hintPic);
        this.engine.variables.set('FSEL', result);
    }

    async cmd_select_text(args) {
        const choiceNum = parseInt(args[0]) || 0;
        const choices = args.slice(1, 1 + choiceNum);
        const x1 = parseFloat(args[1 + choiceNum]) || 0;
        const y1 = parseFloat(args[2 + choiceNum]) || 0;
        const x2 = parseFloat(args[3 + choiceNum]) || 100;
        const y2 = parseFloat(args[4 + choiceNum]) || 100;
        const color = args[5 + choiceNum] || '#ffffff';
        const initPos = parseInt(args[6 + choiceNum]) || 0;
        
        console.log('[Script] #select_text:', { choiceNum, choices, x1, y1, x2, y2, color, initPos });
        
        const result = await this.engine.ui.showTextSelection(choices, x1, y1, x2, y2, color, initPos);
        console.log('[Script] #select_text result:', result);
        this.engine.variables.set('FSEL', result);
        console.log('[Script] FSEL set to:', this.engine.variables.get('FSEL'));
    }

    async cmd_select_var(args) {
        const choiceNum = parseInt(args[0]) || 0;
        const items = [];
        
        for (let i = 0; i < choiceNum; i++) {
            const text = args[1 + i * 2];
            const varName = args[2 + i * 2];
            items.push({ text, varName });
        }
        
        const baseIdx = 1 + choiceNum * 2;
        const x1 = parseFloat(args[baseIdx]) || 0;
        const y1 = parseFloat(args[baseIdx + 1]) || 0;
        const x2 = parseFloat(args[baseIdx + 2]) || 100;
        const y2 = parseFloat(args[baseIdx + 3]) || 100;
        const color = args[baseIdx + 4] || '#ffffff';
        const initPos = parseInt(args[baseIdx + 5]) || 0;
        
        const result = await this.engine.ui.showVarSelection(items, x1, y1, x2, y2, color, initPos);
        this.engine.variables.set('FSEL', result);
    }

    async cmd_select_img(args) {
        // TODO: 实现图片选择
        console.warn('cmd_select_img not fully implemented');
    }

    async cmd_select_imgs(args) {
        // TODO: 实现多图片选择
        console.warn('cmd_select_imgs not fully implemented');
    }

    // --- 等待 ---
    
    async cmd_wait(args) {
        const time = parseInt(args[0]) || 0;
        await this.engine.sleep(time);
    }

    async cmd_wait_se() {
        await this.engine.audio.waitForSE();
    }

    async cmd_waittime(args) {
        const time = parseInt(args[0]) || 0;
        await this.engine.sleep(time);
    }

    // --- 音频 ---
    
    cmd_bgm(args) {
        const filename = args[0];
        const isLoop = args[1] !== '0';
        this.engine.audio.playBGM(filename, isLoop);
    }

    cmd_bgm_stop() {
        this.engine.audio.stopBGM();
    }

    cmd_se(args) {
        const filename = args[0];
        const isLoop = args[1] === '1';
        this.engine.audio.playSE(filename, isLoop);
    }

    cmd_se_stop() {
        this.engine.audio.stopSE();
    }

    cmd_vo(args) {
        const filename = args[0];
        this.engine.audio.playVoice(filename);
    }

    // --- 系统 ---
    
    async cmd_load(args) {
        const saveNum = args[0] !== undefined ? parseInt(args[0]) : null;
        await this.engine.showLoadScreen(saveNum);
    }

    async cmd_album(args) {
        const listName = args[0] || 'album_list';
        await this.engine.ui.showAlbum(listName);
    }

    async cmd_music() {
        await this.engine.ui.showMusicGallery();
    }

    async cmd_date(args) {
        const bgFile = args[0];
        const x = parseFloat(args[1]) || 0;
        const y = parseFloat(args[2]) || 0;
        const color = args[3] || '#000000';
        
        const month = this.engine.variables.get('FMONTH');
        const date = this.engine.variables.get('FDATE');
        
        await this.engine.graphics.showDate(bgFile, x, y, color, month, date);
    }

    async cmd_config() {
        await this.engine.ui.showConfig();
    }

    cmd_textbox(args) {
        const messagebox = args[0] || 'message';
        const namebox = args[1] || 'name';
        this.engine.graphics.setTextbox(messagebox, namebox);
    }

    async cmd_movie(args) {
        const filename = args[0];
        await this.engine.playMovie(filename);
    }

    async cmd_anime_on(args) {
        const num = parseInt(args[0]) || 1;
        const filename = args[1];
        const x = parseFloat(args[2]) || 0;
        const y = parseFloat(args[3]) || 0;
        const interval = parseInt(args[4]) || 200;
        const isLoop = args[5] === '1';
        
        await this.engine.graphics.startAnimation(filename, num, x, y, interval, isLoop);
    }

    cmd_anime_off(args) {
        const filename = args[0] || 'all';
        this.engine.graphics.stopAnimation(filename);
    }

    /**
     * 获取当前执行状态（用于存档）
     */
    getState() {
        return {
            scriptName: this.scriptName,
            lineNum: this.currentLine,
            callStack: this.callStack.map(s => ({
                scriptName: s.scriptName,
                currentLine: s.currentLine
            }))
        };
    }

    /**
     * 恢复执行状态（用于读档）
     */
    async setState(state) {
        await this.loadScript(state.scriptName);
        this.currentLine = state.lineNum;
        // TODO: 恢复调用栈
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScriptParser;
}

