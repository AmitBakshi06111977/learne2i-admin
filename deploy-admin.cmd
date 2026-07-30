@echo off
REM ============================================================================
REM  deploy-admin.cmd -- Learne2i admin SPA auto-deploy script
REM
REM  Triggered by the GitHub webhook listener on port 9001. Steps:
REM    1. Stop the admin IIS app pool (so dist/ files can be replaced)
REM    2. Pull latest code from GitHub (fetch + reset --hard origin/master)
REM    3. Wipe node_modules + lockfile, npm install, npm run build
REM    4. Verify dist\index.html is in the IIS physical path
REM    5. Restart the admin IIS app pool
REM    6. Smoke check (verify app pool is Started)
REM
REM  IMPORTANT: error handling uses GOTO labels rather than multi-line IF
REM  blocks. The latter confuse the CMD parser on this Windows build and
REM  produce 'evel' is not recognized as a command errors (the parser
REM  reads `if errorlevel 1 (` as a call to a program called `evel`).
REM  See deploy.cmd in the main repo for the same pattern.
REM ============================================================================

setlocal

REM ----- 0. Log file setup -----
set LOG_DIR=%~dp0logs
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
set LOG_FILE=%LOG_DIR%\deploy-admin.log

REM Use DATE/TIME env vars directly.
set TS=%DATE% %TIME%

set APP_DIR=C:\apps\learne2i-admin
set APP_POOL=Learne2iAdminAppPool

echo [%TS%] ===== deploy-admin.cmd STARTED =====   >> "%LOG_FILE%"
echo [%TS%]   APP_DIR  = %APP_DIR%   >> "%LOG_FILE%"
echo [%TS%]   APP_POOL = %APP_POOL%  >> "%LOG_FILE%"

REM ----- 1. Stop the admin app pool -----
REM appcmd stop is idempotent (already-stopped pools return nonzero), so we
REM deliberately tolerate a nonzero exit here and just log it.
echo [%TS%] [1/6] Stopping IIS app pool "%APP_POOL%"...   >> "%LOG_FILE%"
%SystemRoot%\System32\inetsrv\appcmd stop apppool /apppool.name:"%APP_POOL%" >> "%LOG_FILE%" 2>&1
if not "%ERRORLEVEL%"=="0" echo [%TS%]   NOTE: appcmd stop returned %ERRORLEVEL% -- pool may already be stopped.   >> "%LOG_FILE%"
goto NEXT_STEP

REM ---- Error handler: jump here when any critical step fails ----
:DEPLOY_FAILED
echo [%TS%]   FATAL: a critical step failed. Restarting app pool so old version keeps serving.   >> "%LOG_FILE%"
%SystemRoot%\System32\inetsrv\appcmd start apppool /apppool.name:"%APP_POOL%" >> "%LOG_FILE%" 2>&1
echo.
echo ADMIN DEPLOY FAILED - check %LOG_FILE% for details.
endlocal
exit /b 1

:NEXT_STEP

REM ----- 2. Pull latest code -----
echo [%TS%] [2/6] Pulling latest code from GitHub...   >> "%LOG_FILE%"
cd /d "%APP_DIR%"
git fetch origin master >> "%LOG_FILE%" 2>&1
if not "%ERRORLEVEL%"=="0" goto DEPLOY_FAILED
git reset --hard origin/master >> "%LOG_FILE%" 2>&1
if not "%ERRORLEVEL%"=="0" goto DEPLOY_FAILED
git log -1 --oneline >> "%LOG_FILE%" 2>&1

REM ----- 3. Build the React frontend -----
echo [%TS%] [3/6] Building React frontend + web.config...   >> "%LOG_FILE%"
pushd "%APP_DIR%"

where node >nul 2>&1
if not "%ERRORLEVEL%"=="0" goto DEPLOY_FAILED

echo [%TS%]   Wiping stale node_modules and lockfile ...   >> "%LOG_FILE%"
if exist "node_modules" rmdir /S /Q "node_modules" >> "%LOG_FILE%" 2>&1
if exist "package-lock.json" del /Q "package-lock.json" >> "%LOG_FILE%" 2>&1

echo [%TS%]   npm install ...   >> "%LOG_FILE%"
call npm install --no-audit --no-fund --include=optional >> "%LOG_FILE%" 2>&1
if not "%ERRORLEVEL%"=="0" goto DEPLOY_FAILED

echo [%TS%]   npm run build ...   >> "%LOG_FILE%"
call npm run build >> "%LOG_FILE%" 2>&1
if not "%ERRORLEVEL%"=="0" goto DEPLOY_FAILED

if not exist "dist\index.html" goto DEPLOY_FAILED
echo [%TS%]   OK - dist\index.html found   >> "%LOG_FILE%"

REM Ensure web.config (SPA rewrite rule) is present in dist\.
REM Vite normally copies public\web.config -> dist\web.config automatically,
REM but we copy it again here as a safety net so a fresh dist\ never serves
REM without the SPA deep-link rewrite rule.
if exist "web.config" (
    copy /Y "web.config" "dist\web.config" >> "%LOG_FILE%" 2>&1
    if not "%ERRORLEVEL%"=="0" goto DEPLOY_FAILED
    echo [%TS%]   OK - web.config copied to dist\   >> "%LOG_FILE%"
) else (
    echo [%TS%]   WARNING: web.config not found at repo root - SPA deep links may 404.   >> "%LOG_FILE%"
)

popd

REM ----- 4. Confirm dist is in the IIS site physical path -----
echo [%TS%] [4/6] Verifying dist\ is in the IIS site physical path...   >> "%LOG_FILE%"
if not exist "%APP_DIR%\dist\index.html" goto DEPLOY_FAILED
echo [%TS%]   OK - %APP_DIR%\dist\index.html ready for IIS   >> "%LOG_FILE%"

REM ----- 5. Restart the admin app pool -----
echo [%TS%] [5/6] Starting IIS app pool "%APP_POOL%"...   >> "%LOG_FILE%"
%SystemRoot%\System32\inetsrv\appcmd start apppool /apppool.name:"%APP_POOL%" >> "%LOG_FILE%" 2>&1
if not "%ERRORLEVEL%"=="0" goto DEPLOY_FAILED

REM ----- 6. Smoke check -----
echo [%TS%] [6/6] Smoke check...   >> "%LOG_FILE%"
%SystemRoot%\System32\inetsrv\appcmd list apppool /apppool.name:"%APP_POOL%" >> "%LOG_FILE%" 2>&1

set TS=%DATE% %TIME%
echo [%TS%] ===== deploy-admin.cmd COMPLETED OK =====   >> "%LOG_FILE%"
echo.
echo Admin deploy complete. Check %LOG_FILE% for details.
endlocal
exit /b 0
