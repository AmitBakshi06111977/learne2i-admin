@echo off
setlocal
set "APP_PORT=5181"
set "API_PORT=5180"

cd /d "%~dp0"

echo.
echo  ==========================================================
echo   Learne2i Admin Portal  (Vite + React + TS)
echo  ==========================================================
echo.
echo  Admin port : %APP_PORT%
echo  Backend    : http://localhost:%API_PORT%  (must already be running)
echo.  CWD        : %CD%
echo.
echo  Default login : admin@learne2i.co.in / change-me-immediately
echo. ==========================================================
echo.

REM [1/5] Check Node.js
echo [1/5] Checking Node.js...
where node >nul 2>nul
if errorlevel 1 goto fail_node
for /f "tokens=1" %%v in ('node -v') do echo     found Node %%v.

REM [2/5] Check the .NET backend is up
echo.
echo [2/5] Checking that the Learne2i backend is running on :%API_PORT%...
powershell -NoProfile -Command "$h = Invoke-WebRequest -Uri 'http://localhost:%API_PORT%/api/health' -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue; if ($h -and $h.StatusCode -eq 200) { exit 0 } else { exit 1 }" >nul 2>nul
if errorlevel 1 (
  echo     X  Backend is not reachable on http://localhost:%API_PORT%.
  echo.
  echo        Start the main project first by double-clicking
  echo        "Run-Learne2i.cmd" in the Learne2i-SmartSolve folder.
  echo        Then re-run this file.
  pause
  exit /b 1
)
echo     backend is reachable.

REM [3/5] Install npm deps if needed
echo.
echo [3/5] Checking npm dependencies...
if not exist "node_modules" (
  echo     node_modules not found - running npm install.  This takes about 30 seconds on first run.
  call npm install --no-audit --no-fund
  if errorlevel 1 goto fail_install
) else (
  if not exist "node_modules/.bin/vite.cmd" (
    echo     node_modules incomplete - running npm install.  About 30 seconds.
    call npm install --no-audit --no-fund
    if errorlevel 1 goto fail_install
  ) else (
    echo     node_modules present and vite shim found, skipping install.
  )
)

REM [4/5] Skip production build
echo.
echo [4/5] Skipping production build (dev mode is enough).

REM [5/5] Start the dev server
echo.
echo [5/5] Starting Vite dev server on :%APP_PORT%...
echo.
echo  ==========================================================
echo   Browser will open at http://localhost:%APP_PORT%/login
echo   Default login: admin@learne2i.co.in / change-me-immediately
echo   Press Ctrl+C in this window to stop the server.
echo  ==========================================================
echo.

REM Wait ~3s for Vite to be ready, then open the browser.
ping -n 4 127.0.0.1 >nul 2>nul
start "" "http://localhost:%APP_PORT%/login"

REM Run vite (blocks). Capture exit code so the window stays open on crash.
call npm run dev
set "NPM_EXIT=%errorlevel%"
echo.
echo. ==========================================================
echo   Vite exited with code %NPM_EXIT%.
echo   Press any key to close this window.
echo. ==========================================================
pause >nul
goto :eof

:fail_node
echo.
echo  X  Node.js was not found. Install Node 18+ from
echo     https://nodejs.org/  then re-run this file.
pause
exit /b 1

:fail_install
echo.
echo  X  npm install failed. Check the error above.
pause
exit /b 1
