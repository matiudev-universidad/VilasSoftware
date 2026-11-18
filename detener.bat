@echo off
setlocal EnableExtensions
title Vila's Motor - Deteniendo...

REM Apaga los servidores que dejo corriendo iniciar.bat (Django :8000 y Vite :5173)
echo.
echo  Deteniendo Vila's Motor...
for %%P in (8000 5173) do (
    for /f "tokens=5" %%I in ('netstat -ano ^| findstr /r /c:":%%P .*LISTENING"') do (
        taskkill /PID %%I /T /F >nul 2>&1
    )
)
echo  Listo. Los servidores se detuvieron.
timeout /t 3 >nul
