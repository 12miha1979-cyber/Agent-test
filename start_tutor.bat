@echo off
rem Starts the copy of the AI tutor that lives in THIS folder (wherever the .bat is),
rem so its documents always come from this folder's server\data\tutor.db.
cd /d "%~dp0"

if not exist "%~dp0server\package.json" (
  echo ERROR: put start_tutor.bat into the project folder that contains "server" and "client".
  pause
  exit /b 1
)

if not exist "%~dp0server\.env" (
  echo ERROR: server\.env not found. Create it with your AITUNNEL_API_KEY first.
  pause
  exit /b 1
)

echo Starting AI Tutor from:
echo   %~dp0
echo.
echo Make sure VPN is turned ON before continuing!
pause

if not exist "%~dp0server\node_modules" (
  echo Installing server packages, please wait...
  pushd "%~dp0server" && call npm install && popd
)
if not exist "%~dp0client\node_modules" (
  echo Installing client packages, please wait...
  pushd "%~dp0client" && call npm install && popd
)

rem The site's port comes from client\.env.local (VITE_PORT), default 5173,
rem so two tutors can run side by side.
set "CLIENT_PORT=5173"
if exist "%~dp0client\.env.local" (
  for /f "usebackq tokens=1,* delims==" %%A in ("%~dp0client\.env.local") do (
    if /i "%%A"=="VITE_PORT" set "CLIENT_PORT=%%B"
  )
)

start "AI Tutor %CLIENT_PORT% - server (do not close)" /d "%~dp0server" cmd /k npm start
start "AI Tutor %CLIENT_PORT% - client (do not close)" /d "%~dp0client" cmd /k npm run dev

echo.
echo Server and client are starting in separate windows. Do not close them.
echo The browser will open in a few seconds: http://localhost:%CLIENT_PORT%/
timeout /t 6 /nobreak >nul
start "" http://localhost:%CLIENT_PORT%/
