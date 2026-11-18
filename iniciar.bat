@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Vila's Motor - Iniciando...
cd /d "%~dp0"

REM ==========================================================================
REM  Vila's Motor - Control de Mantenciones
REM  Doble clic para: instalar lo necesario (solo la primera vez), levantar
REM  Django (API) y Vite (pagina web) en segundo plano y abrir el navegador.
REM  Para apagar los servidores: detener.bat
REM ==========================================================================

set "URL=http://localhost:5173"
set "LOGS=%~dp0logs"
if not exist "%LOGS%" mkdir "%LOGS%"

echo.
echo  ===============================================
echo    VILA'S MOTOR  -  Control de Mantenciones
echo  ===============================================
echo.

REM ---------- Ya esta corriendo? Solo se abre el navegador ----------
call :puerto_ocupado 5173
if !errorlevel! == 0 (
    call :puerto_ocupado 8000
    if !errorlevel! == 0 (
        echo  El sistema ya estaba iniciado. Abriendo el navegador...
        start "" "%URL%"
        timeout /t 3 >nul
        exit /b 0
    )
)

REM ---------- 1. Python 3.12 o superior ----------
echo  [1/5] Buscando Python...
set "PY="
py -3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)" >nul 2>&1 && set "PY=py -3"
if not defined PY (
    python -c "import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)" >nul 2>&1 && set "PY=python"
)
if not defined PY (
    echo.
    echo  No se encontro Python 3.12 o superior.
    call :ofrecer_instalacion "Python.Python.3.13" "Python" "https://www.python.org/downloads/"
    exit /b 1
)
echo        OK

REM ---------- 2. Node.js 20 o superior ----------
echo  [2/5] Buscando Node.js...
node -e "process.exit(+process.versions.node.split('.')[0] >= 20 ? 0 : 1)" >nul 2>&1
if errorlevel 1 (
    echo.
    echo  No se encontro Node.js 20 o superior.
    call :ofrecer_instalacion "OpenJS.NodeJS.LTS" "Node.js" "https://nodejs.org/"
    exit /b 1
)
echo        OK

REM ---------- 3. Backend: entorno virtual, dependencias y base de datos ----------
echo  [3/5] Preparando el servidor (Django)...
if not exist "backend\.venv\Scripts\python.exe" (
    echo        Creando entorno virtual - solo la primera vez...
    %PY% -m venv "backend\.venv"
    if errorlevel 1 goto :error
)
set "VPY=%~dp0backend\.venv\Scripts\python.exe"

if not exist "backend\.venv\.instalado" (
    echo        Instalando dependencias de Python - solo la primera vez, requiere internet...
    "%VPY%" -m pip install --disable-pip-version-check -q -r "backend\requirements.txt" > "%LOGS%\pip.log" 2>&1
    if errorlevel 1 (
        echo        Fallo la instalacion. Detalle en logs\pip.log
        goto :error
    )
    echo ok> "backend\.venv\.instalado"
)

pushd backend
"%VPY%" manage.py migrate --noinput > "%LOGS%\migrate.log" 2>&1
if errorlevel 1 (
    popd
    echo        Fallo la base de datos. Detalle en logs\migrate.log
    goto :error
)
REM Carga los datos de la flota solo si la base esta vacia
"%VPY%" manage.py cargar_datos > "%LOGS%\datos.log" 2>&1
popd
echo        OK

REM ---------- 4. Frontend: dependencias ----------
echo  [4/5] Preparando la pagina web (React)...
if not exist "frontend\node_modules" (
    echo        Instalando dependencias de Node - solo la primera vez, requiere internet...
    pushd frontend
    call npm install --no-audit --no-fund > "%LOGS%\npm.log" 2>&1
    set "NPM_ERR=!errorlevel!"
    popd
    if not "!NPM_ERR!" == "0" (
        echo        Fallo la instalacion. Detalle en logs\npm.log
        goto :error
    )
)
echo        OK

REM ---------- 5. Levantar ambos servidores ocultos (sin ventanas de consola) ----------
echo  [5/5] Iniciando servidores...
call :puerto_ocupado 8000
if errorlevel 1 (
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "Start-Process -FilePath '%VPY%' -ArgumentList 'manage.py','runserver','127.0.0.1:8000','--noreload' -WorkingDirectory '%~dp0backend' -WindowStyle Hidden -RedirectStandardOutput '%LOGS%\django.log' -RedirectStandardError '%LOGS%\django-errores.log'"
)
call :puerto_ocupado 5173
if errorlevel 1 (
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','npm run dev -- --port 5173 --strictPort' -WorkingDirectory '%~dp0frontend' -WindowStyle Hidden -RedirectStandardOutput '%LOGS%\vite.log' -RedirectStandardError '%LOGS%\vite-errores.log'"
)

REM Espera hasta 90 s a que ambos respondan
set /a ESPERA=0
:esperar
timeout /t 1 >nul
set /a ESPERA+=1
call :puerto_ocupado 8000
set "OK_DJANGO=!errorlevel!"
call :puerto_ocupado 5173
set "OK_VITE=!errorlevel!"
if "!OK_DJANGO!!OK_VITE!" == "00" goto :listo
if !ESPERA! geq 90 (
    echo        Los servidores no respondieron a tiempo. Revisa la carpeta logs.
    goto :error
)
goto :esperar

:listo
echo        OK
echo.
echo  Listo! Abriendo %URL% en el navegador...
echo  Para apagar el sistema, ejecuta detener.bat
start "" "%URL%"
timeout /t 5 >nul
exit /b 0


REM ==========================================================================
REM  Subrutinas
REM ==========================================================================

REM Devuelve errorlevel 0 si hay algo escuchando en el puerto %1
:puerto_ocupado
netstat -ano | findstr /r /c:":%~1 .*LISTENING" >nul 2>&1
exit /b %errorlevel%

REM Ofrece instalar con winget: %1 = id winget, %2 = nombre, %3 = pagina de descarga
:ofrecer_instalacion
where winget >nul 2>&1
if errorlevel 1 (
    echo  Instala %~2 desde %~3 y vuelve a ejecutar iniciar.bat
    start "" "%~3"
    pause
    exit /b 1
)
choice /c SN /m " Quieres instalar %~2 ahora"
if errorlevel 2 (
    echo  Instala %~2 desde %~3 y vuelve a ejecutar iniciar.bat
    pause
    exit /b 1
)
winget install -e --id %~1 --accept-package-agreements --accept-source-agreements
echo.
echo  %~2 instalado. Cierra esta ventana y vuelve a ejecutar iniciar.bat
pause
exit /b 1

:error
echo.
echo  No se pudo iniciar el sistema. Revisa los archivos de la carpeta logs.
pause
exit /b 1
