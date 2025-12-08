@echo off
echo === PyMO Web KaiOS Build ===
echo.

REM 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found! Please install Node.js first.
    pause
    exit /b 1
)

REM 安装依赖
echo [1/4] Installing dependencies...
call npm install --save-dev @babel/cli @babel/core @babel/preset-env >nul 2>&1

REM 清理并创建输出目录
echo [2/4] Creating directories...
if exist "dist-kaios" rmdir /s /q dist-kaios
mkdir dist-kaios
mkdir dist-kaios\core
mkdir dist-kaios\graphics
mkdir dist-kaios\audio
mkdir dist-kaios\ui
mkdir dist-kaios\utils
mkdir dist-kaios\js
mkdir dist-kaios\icons
mkdir dist-kaios\pymo

REM 转译 JS 文件
echo [3/4] Transpiling JavaScript for Firefox 48...
call npx babel src --out-dir dist-kaios --config-file ./babel.kaios.json --ignore "src/game.js","src/*.min.js"

REM 复制静态文件
echo [4/4] Copying static files...
copy src\*.html dist-kaios\ >nul 2>&1
copy src\*.css dist-kaios\ >nul 2>&1
copy src\jszip.min.js dist-kaios\ >nul 2>&1
copy src\regenerator-runtime.min.js dist-kaios\ >nul 2>&1
copy src\manifest.webapp dist-kaios\ >nul 2>&1

REM 复制子目录中的静态文件
if exist "src\icons" xcopy src\icons\*.png dist-kaios\icons\ /Y >nul 2>&1
if exist "src\pymo" xcopy src\pymo\*.* dist-kaios\pymo\ /Y >nul 2>&1

echo.
echo === Build Complete! ===
echo Output: dist-kaios/
echo.
pause

