@echo off
REM ============================================================================
REM  deploy-admin.cmd -- Learne2i admin SPA auto-deploy script
REM
REM  Triggered by the GitHub webhook (separately from the main app), this:
REM    1. Pulls the latest admin code from GitHub
REM    2. Runs `npm install` to refresh dependencies
REM    3. Runs `npm run build` to produce a fresh dist/ folder
REM    4. Restarts the admin's IIS app pool
REM
REM  Note: the admin has TWO webhooks. Configure one pointing to this
REM  script's webhook (port 9001 typically) and one for the main app
REM  on port 9000. Or run them on the same port and the listener routes
REM  based on the payload's repo_full_name field.
REM ============================================================================

setlocal EnableDelayedExpansion

set LOG_DIR=%~dp0logs
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
set LOG_FILE=%LOG_DIR%\deploy-admin.log
set TS=
for /f "tokens=*" %%a in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss'"') do set TS=%%a
echo [%TS%] ===== deploy-admin.cmd STARTED ===== >> "%LOG_FILE%"

set APP_DIR=C:\apps\learne2i-admin
set APP_POOL=Learne2iAdminAppPool

echo [%TS%]   APP_DIR = %APP_DIR% >> "%LOG_FILE%"

REM ---- Stop the admin app pool so the dist/ files can be replaced ----
echo [%TS%] [1/4] Stopping IIS app pool "%APP_POOL%"... >> "%LOG_FILE%"
%SystemRoot%\System32\inetsrv\appcmd stop apppool /apppool.name:"%APP_POOL%" >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    echo [%TS%]   WARNING: appcmd stop returned %errorlevel% -- pool may already be stopped, continuing. >> "%LOG_FILE%"
)

REM ---- Pull latest code ----
echo [%TS%] [2/4] Pulling latest code from GitHub... >> "%LOG_FILE%"
cd /d "%APP_DIR%"
git fetch origin master >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    echo [%TS%]   FATAL: git fetch failed. >> "%LOG_FILE%"
    exit /b 1
)
git reset --hard origin/master >> "%LOG_FILE%" 2>&1
git log -1 --oneline >> "%LOG_FILE%" 2>&1

REM ---- Install deps + build ----
echo [%TS%] [3/4] Running npm install + npm run build... >> "%LOG_FILE%"
call npm ci --no-audit --no-fund >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    echo [%TS%]   FATAL: npm ci failed. >> "%LOG_FILE%"
    %SystemRoot%\System32\inetsrv\appcmd start apppool /apppool.name:"%APP_POOL%" >> "%LOG_FILE%" 2>&1
    exit /b 1
)
call npm run build >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    echo [%TS%]   FATAL: npm run build failed. >> "%LOG_FILE%"
    %SystemRoot%\System32\inetsrv\appcmd start apppool /apppool.name:"%APP_POOL%" >> "%LOG_FILE%" 2>&1
    exit /b 1
)

if not exist "%APP_DIR%\dist\index.html" (
    echo [%TS%]   FATAL: dist\index.html not found after build. >> "%LOG_FILE%"
    exit /b 1
)
echo [%TS%]   Build OK - dist\index.html found >> "%LOG_FILE%"

REM ---- Restart the admin app pool ----
echo [%TS%] [4/4] Starting IIS app pool "%APP_POOL%"... >> "%LOG_FILE%"
%SystemRoot%\System32\inetsrv\appcmd start apppool /apppool.name:"%APP_POOL%" >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    echo [%TS%]   FATAL: appcmd start failed. >> "%LOG_FILE%"
    exit /b 1
)

set TS2=
for /f "tokens=*" %%a in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss'"') do set TS2=%%a
echo [%TS2%] ===== deploy-admin.cmd COMPLETED OK ===== >> "%LOG_FILE%"
echo.
echo Admin deploy complete. Check %LOG_FILE% for details.

endlocal
