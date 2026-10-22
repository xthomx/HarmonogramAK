@echo off
cd /d "%~dp0"
call PRZYGOTUJ.bat
if errorlevel 1 goto fail
.venv\Scripts\python.exe -m unittest discover -s tests -v
if errorlevel 1 goto fail
.venv\Scripts\python.exe -m PyInstaller --noconfirm --clean --onedir --windowed --name PlanZespolu --add-data "ui;ui" --collect-all webview main.py
if errorlevel 1 goto fail
 echo Gotowe: dist\PlanZespolu\PlanZespolu.exe
 echo Przenos CALY folder dist\PlanZespolu, nie sam plik EXE.
 explorer "dist\PlanZespolu"
 pause
 exit /b 0
:fail
 echo Budowanie nie powiodlo sie. Przekaz tresc bledu.
 pause
 exit /b 1
