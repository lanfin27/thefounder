@echo off
echo ========================================
echo Starting Redis for TheFounder scraping system...
echo ========================================
echo.

REM Check if WSL is available
wsl --status >nul 2>&1
if %errorlevel% equ 0 (
    echo WSL detected. Starting Redis in WSL...
    wsl -e sudo service redis-server start
    echo.
    echo Testing Redis connection...
    wsl -e redis-cli ping
    if %errorlevel% equ 0 (
        echo.
        echo ✅ Redis started successfully in WSL!
        echo    Host: localhost
        echo    Port: 6379
        echo.
        echo Test connection with: npm run test:redis
    ) else (
        echo.
        echo ❌ Failed to start Redis in WSL
        echo    Try: wsl -e sudo apt update ^&^& sudo apt install redis-server
    )
) else (
    echo WSL not available. Alternative options:
    echo.
    echo 1. Install WSL:
    echo    Run PowerShell as Administrator:
    echo    wsl --install
    echo.
    echo 2. Install Memurai (Redis for Windows):
    echo    Download from: https://www.memurai.com/get-memurai
    echo.
    echo 3. Use Redis Cloud (Free tier):
    echo    Sign up at: https://redis.com/try-free/
    echo    Update REDIS_URL in .env.local
)

echo.
echo ========================================
pause