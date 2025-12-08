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
echo [1/3] Installing dependencies...
call npm install --save-dev @babel/cli @babel/core @babel/preset-env

REM 创建输出目录
if not exist "dist-kaios" mkdir dist-kaios
if not exist "dist-kaios\core" mkdir dist-kaios\core
if not exist "dist-kaios\graphics" mkdir dist-kaios\graphics
if not exist "dist-kaios\audio" mkdir dist-kaios\audio
if not exist "dist-kaios\ui" mkdir dist-kaios\ui
if not exist "dist-kaios\utils" mkdir dist-kaios\utils
if not exist "dist-kaios\js" mkdir dist-kaios\js

REM 转译 JS 文件
echo [2/3] Transpiling JavaScript for Firefox 48...
call npx babel src --out-dir dist-kaios --presets=@babel/preset-env --config-file ./babel.kaios.json

REM 复制静态文件
echo [3/3] Copying static files...
copy src\*.html dist-kaios\ >nul 2>&1
copy src\*.css dist-kaios\ >nul 2>&1
copy src\*.min.js dist-kaios\ >nul 2>&1

echo.
echo === Build Complete! ===
echo Output: dist-kaios/
echo.
pause

