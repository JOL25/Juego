@echo off
setlocal
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" "%~dp0jugar.html"
  exit /b 0
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" "%~dp0jugar.html"
  exit /b 0
)
echo No se encontro Microsoft Edge. Abre jugar.html desde tu navegador con Ctrl+O.
pause
