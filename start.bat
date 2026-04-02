@echo off
echo ============================================
echo   Real-time QA Dashboard - Starting...
echo ============================================

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed.
    echo Please download it from https://nodejs.org
    pause
    exit /b 1
)

if not exist "backend\.env" (
    echo Copying .env.example to backend\.env ...
    copy ".env.example" "backend\.env" >nul
)

echo.
echo [1/2] Installing backend dependencies...
cd backend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Backend npm install failed.
    pause
    exit /b 1
)
cd ..

echo.
echo [2/2] Installing frontend dependencies...
cd frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Frontend npm install failed.
    pause
    exit /b 1
)
cd ..

echo.
echo Starting backend on port 3001...
start "QA Dashboard - Backend" cmd /k "cd backend && node server.js"

echo Starting frontend on port 5173...
start "QA Dashboard - Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Waiting for servers to start...
timeout /t 4 /nobreak >nul

echo Opening browser...
start http://localhost:5173

echo.
echo ============================================
echo   Dashboard running at http://localhost:5173
echo   Backend API at    http://localhost:3001
echo ============================================
pause
