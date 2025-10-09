@echo off
echo Starting Merkle Trade Proxy Server...
echo.

cd /d "%~dp0..\server"

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing proxy server dependencies...
    npm install
    echo.
)

REM Start the proxy server
echo Starting proxy server on http://localhost:3001
echo Press Ctrl+C to stop the server
echo.

npm start
