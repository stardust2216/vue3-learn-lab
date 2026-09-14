@echo off
rem ============================================================
rem  Frontend Learning Lab (Vue 3 / CSS / JavaScript) launcher
rem  Starts the Vite dev server and opens the browser.
rem  To stop it: press Ctrl+C in this window, or just close it.
rem ============================================================

set "PROJECT=E:\DeepSeekHarnessData\DrillWeb"
set "PNPM=C:\Users\20618\AppData\Roaming\npm\pnpm.cmd"
set "APP_URL=http://localhost:5199"

if not exist "%PROJECT%\package.json" (
  echo.
  echo [ERROR] Project not found:
  echo   %PROJECT%
  echo.
  pause
  exit /b 1
)

if not exist "%PROJECT%\node_modules" (
  echo.
  echo [INFO] node_modules is missing. Run "pnpm install" in:
  echo   %PROJECT%
  echo.
  pause
  exit /b 1
)

title Frontend Learning Lab
cd /d "%PROJECT%"

echo Starting the dev server ...
echo (Keep this window open. Close it or press Ctrl+C to stop the server.)
echo.

start "" /b cmd /c "timeout /t 6 /nobreak >nul & start %APP_URL%"

if exist "%PNPM%" (
  call "%PNPM%" dev
) else (
  echo [INFO] pnpm.cmd not found, falling back to npx vite
  call npx vite
)

rem If it exits unexpectedly, keep the window so the error stays visible.
if errorlevel 1 (
  echo.
  echo [INFO] the dev server exited with code %errorlevel%. The last lines above are usually the reason.
  pause
)
