@echo off
setlocal enableextensions
rem ============================================================
rem  Frontend Learning Lab (Vue 3 / CSS / JavaScript) launcher
rem  Starts the Vite dev server and opens the browser.
rem  To stop it: press Ctrl+C in this window, or just close it.
rem
rem  Portable: resolves the project directory from this script's own
rem  location, so it works from any clone path and on any machine.
rem ============================================================

rem --- Resolve the project directory from this script's own path ---
rem Handle a UNC path (\\server\share\...) by mapping a temporary drive letter.
set "PROJECT=%~dp0"
if "%PROJECT:~0,1%"=="\" (
  set "UNC=%PROJECT%"
  for /f "delims=" %%i in ('powershell -NoProfile -Command "(New-Object -ComObject WScript.Network).MapNetworkDrive('Z:', (Split-Path -Qualifier '%UNC%'), $false)" 2^>nul') do rem
  set "PROJECT=Z:\%~nx0"
  for %%i in ("%PROJECT%") do set "PROJECT=%%~dpi"
)
if "%PROJECT:~-1%"=="\" set "PROJECT=%PROJECT:~0,-1%"
cd /d "%PROJECT%" 2>nul
if errorlevel 1 (
  echo.
  echo [ERROR] Could not enter the project directory:
  echo   %PROJECT%
  echo.
  pause
  exit /b 1
)

rem --- Port comes from vite.config.ts; 5199 is the pinned dev port ---
set "APP_PORT=5199"
set "APP_URL=http://localhost:%APP_PORT%"

echo === MARK-A: ??????, PROJECT=%PROJECT% ===
if not exist "%PROJECT%\package.json" (
  echo.
  echo [ERROR] package.json not found in:
  echo   %PROJECT%
  echo.
  echo This launcher must sit in the project root ^(next to package.json^).
  echo.
  pause
  exit /b 1
)

echo === MARK-B: package.json ????? ===
if not exist "%PROJECT%\node_modules" (
  echo.
  echo [INFO] node_modules is missing. Install dependencies first:
  echo   cd /d "%PROJECT%"
  echo   pnpm install
  echo.
  pause
  exit /b 1
)

rem --- If the port is already serving, just open the browser ---
rem PowerShell's TcpClient gives a sub-second check (Test-NetConnection takes seconds).
powershell -NoProfile -Command "try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1', %APP_PORT%); $c.Close() } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 (
  echo The dev server already answers on %APP_URL% ? opening the browser with this instance.
  start "" "%APP_URL%"
  timeout /t 2 /nobreak >nul
  exit /b 0
)

rem --- Locate a package manager: pnpm on PATH -> pnpm user install -> npx ---
set "PNPM="
where pnpm.cmd >nul 2>&1 && set "PNPM=pnpm"
if not defined PNPM if exist "%APPDATA%\npm\pnpm.cmd" set "PNPM=%APPDATA%\npm\pnpm.cmd"

title Frontend Learning Lab
echo Starting the dev server in:
echo   %PROJECT%
echo ^(Keep this window open. Close it or press Ctrl+C to stop the server.^)
echo.

rem Open the browser once the server has had time to boot.
start "" /b cmd /c "timeout /t 6 /nobreak >nul & start %APP_URL%"

if defined PNPM (
  call %PNPM% dev
) else (
  echo [INFO] pnpm not found on PATH - falling back to "npx vite".
  call npx --yes vite
)

rem Keep the window open if the server exited unexpectedly, so the error stays visible.
if errorlevel 1 (
  echo.
  echo [INFO] the dev server exited with code %errorlevel%. The last lines above are usually the reason.
  pause
)

endlocal
