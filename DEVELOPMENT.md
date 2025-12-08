# PyMO Web 开发文档

## 项目概述

PyMO Web 是 PyMO（Python Memories Off）AVG 游戏引擎的 Web 版本实现。基于 JavaScript 和 HTML5 Canvas，可以在浏览器中运行 PyMO 格式的视觉小说游戏。

## 目录结构

```
pymo_web/
├── src/
│   ├── index.html          # 游戏列表页面
│   ├── index.js            # 游戏列表逻辑
│   ├── index.css           # 游戏列表样式
│   ├── game_new.html       # 游戏运行页面 (重构后)
│   ├── game_new.css        # 游戏运行样式 (重构后)
│   ├── main.js             # 主入口文件
│   │
│   ├── core/               # 核心模块
│   │   ├── engine.js       # 游戏引擎主类
│   │   ├── config.js       # 配置管理
│   │   ├── script.js       # 脚本解析器
│   │   ├── variable.js     # 变量系统
│   │   └── save.js         # 存档系统
│   │
│   ├── graphics/           # 图形模块
│   │   ├── canvas.js       # Canvas 封装 + PyMOImage 类
│   │   └── graphics.js     # 图形系统（背景、立绘、特效）
│   │
│   ├── audio/              # 音频模块
│   │   └── audio.js        # 音频管理器（BGM/SE/Voice）
│   │
│   ├── ui/                 # UI 模块
│   │   ├── menu.js         # 菜单系统
│   │   ├── selection.js    # 选择支系统
│   │   └── gallery.js      # 鉴赏系统（CG/音乐）
│   │
│   ├── utils/              # 工具模块
│   │   └── common.js       # 通用工具（BinReader、ZipStore等）
│   │
│   ├── game.js             # 原版代码（保留兼容）
│   └── pymo/               # PyMO 资源
│       ├── stringres.txt   # 字符串资源
│       └── ...
│
├── gamepackage/            # 游戏包目录
├── 教程/                   # PyMO 教程文档
└── DEVELOPMENT.md          # 本文档
```

## 架构设计

### 核心类

```
┌─────────────────────────────────────────────────────────┐
│                      PyMOEngine                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐   │
│  │ Config  │ │ Script  │ │Variable │ │    Save     │   │
│  │ Manager │ │ Parser  │ │ System  │ │   System    │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Graphics System                     │   │
│  │  ┌────────┐ ┌──────────┐ ┌─────────┐ ┌───────┐ │   │
│  │  │ Canvas │ │Background│ │Character│ │Effects│ │   │
│  │  └────────┘ └──────────┘ └─────────┘ └───────┘ │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │               Audio System                       │   │
│  │  ┌─────┐ ┌────────┐ ┌───────┐                   │   │
│  │  │ BGM │ │   SE   │ │ Voice │                   │   │
│  │  └─────┘ └────────┘ └───────┘                   │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │                 UI System                        │   │
│  │  ┌──────┐ ┌──────────┐ ┌─────────┐              │   │
│  │  │ Menu │ │Selection │ │ Gallery │              │   │
│  │  └──────┘ └──────────┘ └─────────┘              │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 模块职责

| 模块 | 职责 |
|------|------|
| **PyMOEngine** | 游戏引擎主控制器，协调各模块 |
| **ConfigManager** | 解析和管理 gameconfig.txt |
| **ScriptParser** | 解析和执行脚本指令 |
| **VariableSystem** | 管理游戏变量（普通变量和全局变量） |
| **SaveSystem** | 存档、读档、自动存档 |
| **GraphicsSystem** | 图形渲染，Canvas 管理 |
| **AudioSystem** | 音频播放管理 |
| **UISystem** | 用户界面，菜单，选择支 |

## 脚本指令实现状态

### 对话文字显示指令

| 指令 | 状态 | 说明 |
|------|------|------|
| `#say` | ✅ 已实现 | 人物对话显示 |
| `#text` | ✅ 已实现 | 任意位置文字显示 |
| `#text_off` | ✅ 已实现 | 清除文字 |
| `#waitkey` | ✅ 已实现 | 等待按键 |
| `#title` | ✅ 已实现 | 设置章节标题 |
| `#title_dsp` | ✅ 已实现 | 显示章节标题 |

### 图像相关操作指令

| 指令 | 状态 | 说明 |
|------|------|------|
| `#chara` | ✅ 已实现 | 显示立绘 |
| `#chara_cls` | ✅ 已实现 | 清除立绘 |
| `#chara_pos` | ✅ 已实现 | 更改立绘位置 |
| `#chara_y` | ✅ 已实现 | 指定坐标显示立绘 |
| `#chara_scroll` | ✅ 已实现 | 立绘滑动淡入 |
| `#chara_quake` | ✅ 已实现 | 立绘左右振动 |
| `#chara_down` | ✅ 已实现 | 立绘下沉 |
| `#chara_up` | ✅ 已实现 | 立绘上跳 |
| `#chara_anime` | ✅ 已实现 | 自定义立绘震动 |
| `#bg` | ✅ 已实现 | 加载背景 |
| `#scroll` | ✅ 已实现 | 滚动图片 |
| `#flash` | ✅ 已实现 | 屏幕闪光 |
| `#quake` | ✅ 已实现 | 画面振动 |
| `#fade_out` | ✅ 已实现 | 屏幕淡出 |
| `#fade_in` | ✅ 已实现 | 屏幕淡入 |
| `#movie` | ❌ 未实现 | 播放视频 |
| `#textbox` | ✅ 已实现 | 更换对话框 |
| `#anime_on` | ✅ 已实现 | 显示逐帧动画 |
| `#anime_off` | ✅ 已实现 | 停止动画 |

### 变量、选择、跳转类指令

| 指令 | 状态 | 说明 |
|------|------|------|
| `#set` | ✅ 已实现 | 变量赋值 |
| `#add` | ✅ 已实现 | 变量加法 |
| `#sub` | ✅ 已实现 | 变量减法 |
| `#rand` | ✅ 已实现 | 随机数 |
| `#label` | ✅ 已实现 | 行标签 |
| `#goto` | ✅ 已实现 | 跳转 |
| `#if...goto` | ✅ 已实现 | 条件跳转 |
| `#change` | ✅ 已实现 | 脚本跳转 |
| `#call` | ✅ 已实现 | 带返回的脚本跳转 |
| `#ret` | ✅ 已实现 | 返回 |
| `#sel` | ✅ 已实现 | 选择支 |
| `#select_text` | ✅ 已实现 | 文字选择菜单 |
| `#select_var` | ✅ 已实现 | 变量控制选择 |
| `#select_img` | 🚧 部分实现 | 图形选择菜单 |
| `#select_imgs` | 🚧 部分实现 | 多图片选择 |
| `#wait` | ✅ 已实现 | 等待指定时间 |
| `#wait_se` | ✅ 已实现 | 等待音效结束 |

### 声音类指令

| 指令 | 状态 | 说明 |
|------|------|------|
| `#bgm` | ✅ 已实现 | 播放背景音乐 |
| `#bgm_stop` | ✅ 已实现 | 停止背景音乐 |
| `#se` | ✅ 已实现 | 播放音效 |
| `#se_stop` | ✅ 已实现 | 停止音效 |
| `#vo` | ✅ 已实现 | 播放语音 |

### 系统类指令

| 指令 | 状态 | 说明 |
|------|------|------|
| `#load` | ✅ 已实现 | 读档界面 |
| `#album` | ✅ 已实现 | CG鉴赏 |
| `#music` | ✅ 已实现 | 音乐鉴赏 |
| `#date` | ✅ 已实现 | 显示日期 |
| `#config` | ✅ 已实现 | 设置界面 |

## 数据结构

### 游戏配置 (gameconfig)

```javascript
{
    gametitle: "游戏标题",
    platform: "pygame",          // 运行平台
    engineversion: "1.2",        // 引擎版本
    scripttype: "pymo",          // 脚本类型
    bgformat: ".jpg",            // 背景图格式
    charaformat: ".png",         // 立绘格式
    charamaskformat: ".png",     // 立绘遮罩格式
    bgmformat: ".mp3",           // BGM格式
    seformat: ".wav",            // 音效格式
    voiceformat: ".mp3",         // 语音格式
    font: -1,                    // 字体
    fontsize: 26,                // 字号
    fontaa: 1,                   // 字体平滑
    imagesize: [540, 360],       // 背景图尺寸
    startscript: "start",        // 起始脚本
    nameboxorig: [0, 7],         // 名字框位置
    cgprefix: "EV_",             // CG前缀
    textcolor: "#ffffff",        // 文字颜色
    msgtb: [4, 0],               // 文字上下边距
    msglr: [12, 12],             // 文字左右边距
    namealign: "middle"          // 名字对齐
}
```

### 存档数据结构

```javascript
{
    // 当前状态
    scriptName: "start",         // 当前脚本
    lineNum: 0,                  // 当前行号
    title: "序章",               // 章节标题
    
    // 背景
    bg: "BG001_H",               // 当前背景
    bgpercentorig: [0, 0],       // 背景偏移
    
    // 立绘
    chara: {
        "0": {
            filename: "AY04BA",
            chara_center: 160,
            chara_y: 0,
            chara_visible: true,
            layer: 1
        }
    },
    
    // 变量
    variables: {
        "F01": 1,
        "FSEL": 0
    },
    
    // 对话
    name: "彩花",
    message: "早上好！",
    
    // 时间戳
    saveTime: "2024-01-01 12:00:00"
}
```

### 全局存档 (global.sav)

```javascript
{
    // 以 S 开头的全局变量
    variables: {
        "S01": 1,
        "S02": 0
    },
    
    // 已解锁的 CG
    unlockedCG: ["EV_001", "EV_002"],
    
    // 已选择过的选项（用于变灰）
    selectedChoices: {
        "script1_line100": [0, 2]
    }
}
```

## 坐标系统

PyMO 使用**百分比坐标系统**：

- 坐标范围：0-100（代表屏幕宽/高的百分比）
- 原点：左上角 (0, 0)
- X轴：向右为正
- Y轴：向下为正

```
(0,0) ────────────────────── (100,0)
  │                              │
  │                              │
  │          (50,50)             │
  │             ●                │
  │                              │
  │                              │
(0,100) ─────────────────── (100,100)
```

### 立绘坐标模式 (coord_mode)

| mode | X坐标含义 | Y坐标含义 |
|------|-----------|-----------|
| 0 | 立绘左沿距屏幕左沿 | 立绘上沿距屏幕上沿 |
| 1 | 立绘中点距屏幕左沿 | 立绘上沿距屏幕上沿 |
| 2 | 立绘右沿距屏幕右沿 | 立绘上沿距屏幕上沿 |
| 3 | 立绘中点距屏幕左沿 | 立绘中点距屏幕上沿 |
| 4 | 立绘左沿距屏幕左沿 | 立绘下沿距屏幕下沿 |
| 5 | 立绘中点距屏幕左沿 | 立绘下沿距屏幕下沿 |
| 6 | 立绘右沿距屏幕右沿 | 立绘下沿距屏幕下沿 |

## 资源文件格式

### PAK 文件格式

```
┌─────────────────────────────────┐
│ File Count (4 bytes, int32)     │
├─────────────────────────────────┤
│ File Entry 1                    │
│   ├─ Filename (32 bytes, GBK)   │
│   ├─ Offset (4 bytes, int32)    │
│   └─ Length (4 bytes, int32)    │
├─────────────────────────────────┤
│ File Entry 2                    │
│   └─ ...                        │
├─────────────────────────────────┤
│ File Data 1                     │
├─────────────────────────────────┤
│ File Data 2                     │
│   └─ ...                        │
└─────────────────────────────────┘
```

### 脚本文件格式

- 编码：UTF-8
- 每行一条指令
- 指令以 `#` 开头
- 注释以 `;` 开头（或任何非 `#` 开头的行）
- 参数以半角逗号 `,` 分隔

## 开发指南

### 添加新指令

1. 在 `ScriptParser` 中添加指令处理函数
2. 在 `executeCommand()` 中注册指令
3. 更新本文档的实现状态

```javascript
// 示例：添加 #mycommand 指令
class ScriptParser {
    async cmd_mycommand(args) {
        // 实现指令逻辑
        const param1 = args[0];
        const param2 = parseInt(args[1]) || 0;
        // ...
    }
    
    async executeCommand(command, args) {
        // ...
        if (command === '#mycommand') {
            return await this.cmd_mycommand(args);
        }
        // ...
    }
}
```

### 调试

在浏览器控制台中：

```javascript
// 查看当前游戏状态
console.log(engine.save);

// 查看变量
console.log(engine.variables);

// 手动执行指令
engine.scriptParser.executeCommand('#bg', ['BG001_H']);
```

## 性能优化

### 图片缓存策略

- 使用 LRU 缓存，限制最大缓存数量
- 预加载下一场景的资源
- 及时释放不再使用的资源

### Canvas 优化

- 使用离屏 Canvas 进行复杂绘制
- 减少不必要的重绘
- 使用 requestAnimationFrame

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 0.1.0 | - | 初始版本，基础功能 |
| 0.2.0 | 2024-12 | 重构代码架构，模块化 |

### v0.2.0 重构内容

- **模块化架构**: 将 `game.js` 拆分为多个独立模块
  - `core/`: 核心引擎、配置、脚本解析、变量、存档
  - `graphics/`: Canvas 封装、图形渲染
  - `audio/`: 音频播放管理
  - `ui/`: 菜单、选择支、鉴赏系统
  - `utils/`: 通用工具函数

- **新增功能**:
  - 完整的变量系统（普通变量、全局变量、系统变量）
  - 标签跳转和条件跳转
  - 脚本调用栈（#call/#ret）
  - 选择支系统
  - 音频系统（BGM/SE/语音）
  - 存档/读档系统（IndexedDB）
  - 游戏菜单
  - CG 和音乐鉴赏

- **待完善**:
  - 图片选择菜单（#select_img/#select_imgs）
  - 视频播放（#movie）
  - 逐帧动画的完整实现
  - 内存优化和资源缓存

## 参考资料

- [PyMO 教程](./教程/PYMO教程.md)
- [原版 PyMO Python 代码](../pymo/pc/main.py)

