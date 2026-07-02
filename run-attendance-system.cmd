@echo off
setlocal

set "PROJECT_DIR=%~dp0"
set "NGINX_DIR=C:\nginx"
set "MONGO_SERVICE=Truong-IT"

title Attendance Management System Launcher

net session >nul 2>&1
if not "%errorlevel%"=="0" (
  echo Requesting Administrator permission...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo ============================================
echo Attendance Management System
echo ============================================
echo.

echo [1/4] Checking MongoDB service...
sc query "%MONGO_SERVICE%" >nul 2>&1
if errorlevel 1 (
  echo MongoDB service "%MONGO_SERVICE%" was not found.
  echo Please start MongoDB manually, then run this file again.
) else (
  sc query "%MONGO_SERVICE%" | find /I "RUNNING" >nul
  if errorlevel 1 (
    echo Starting MongoDB service "%MONGO_SERVICE%"...
    net start "%MONGO_SERVICE%"
  ) else (
    echo MongoDB service "%MONGO_SERVICE%" is already running.
  )
)

echo.
echo [2/4] Checking Nginx...
if not exist "%NGINX_DIR%\nginx.exe" (
  echo Nginx was not found at "%NGINX_DIR%\nginx.exe".
) else (
  tasklist /FI "IMAGENAME eq nginx.exe" | find /I "nginx.exe" >nul
  if errorlevel 1 (
    echo Starting Nginx...
    start "Nginx" /D "%NGINX_DIR%" "%NGINX_DIR%\nginx.exe"
  ) else (
    echo Nginx is already running.
    echo Trying to reload Nginx config...
    pushd "%NGINX_DIR%"
    nginx.exe -s reload
    popd
  )
)

echo.
echo [3/4] Starting backend API...
cd /d "%PROJECT_DIR%"
netstat -ano | findstr /R /C:":5000 .*LISTENING" >nul
if errorlevel 1 (
  start "Attendance Backend API - localhost:5000" cmd /k ""cd /d "%PROJECT_DIR%" && npm run server""
) else (
  echo Backend port 5000 is already running.
)

echo.
echo [4/4] Opening application...
timeout /t 2 /nobreak >nul
start "" "http://localhost/login"

echo.
echo Done.
echo Frontend: http://localhost/login
echo Backend:  http://localhost:5000
echo.
pause
