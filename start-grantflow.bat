@echo off
title GrantFlow Launcher
color 0A

echo.
echo  ============================================
echo        GRANTFLOW - Starting Services
echo  ============================================
echo.

:: Start Backend
echo [1/3] Starting Backend Server...
start "GrantFlow Backend" cmd /k "G: && cd G:\Apps\grantflow-local\backend && echo Starting GrantFlow Backend... && node server.js"

:: Wait for backend to initialize
timeout /t 3 /nobreak > nul

:: Start Frontend
echo [2/3] Starting Frontend Dev Server...
start "GrantFlow Frontend" cmd /k "G: && cd G:\Apps\grantflow-local\frontend && echo Starting GrantFlow Frontend... && npm run dev"

:: Wait for frontend to initialize
timeout /t 3 /nobreak > nul

:: Start Cloudflare Tunnel
echo [3/3] Starting Cloudflare Tunnel...
start "Cloudflare Tunnel" cmd /k "echo Starting Cloudflare Tunnel... && cloudflared tunnel run grantflow"

echo.
echo  ============================================
echo        GRANTFLOW IS NOW RUNNING!
echo  ============================================
echo.
echo  Local Access:
echo    http://localhost:5173/grantflow/
echo.
echo  Public Access:
echo    https://app.axiombiolabs.org/grantflow/
echo.
echo  Keep all 3 terminal windows open!
echo  ============================================
echo.
echo Press any key to close this launcher window...
pause > nul
