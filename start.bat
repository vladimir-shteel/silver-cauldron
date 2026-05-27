@echo off
title Cauldron VTT

echo Starting Cauldron VTT...
echo.

start "WebSocket (port 8081)" cmd /k "node websocket-server.js"
start "PHP Server  (port 8080)" cmd /k "php -S localhost:8080 -t public"

echo WebSocket server: ws://localhost:8081/websocket
echo PHP web server:   http://localhost:8080
echo.
echo Both servers are running in separate windows.
echo Close those windows to stop the servers.
pause
