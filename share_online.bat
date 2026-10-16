@echo off
title DuoTrack - Online Share & Sync Server
cd /d "%~dp0"

echo ========================================================
echo        DuoTrack - Starting Online Sync Server
echo ========================================================
echo.

start "" /b python server.py
timeout /t 2 >nul

echo Starting secure public Cloudflare tunnel...
echo.
uvx pycloudflared tunnel --url http://localhost:8000
pause
