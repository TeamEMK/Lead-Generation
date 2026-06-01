@echo off
setlocal

set ROOT=%~dp0

echo Starting backend...
start "LeadGen Backend" cmd /k "cd /d %ROOT%backend && npm run dev"

echo Starting frontend...
start "LeadGen Frontend" cmd /k "cd /d %ROOT%frontend && npm run dev"

echo.
echo Backend  -^> http://localhost:5001
echo Frontend -^> http://localhost:3000
echo Close the terminal windows to stop.
