@echo off
rem Builds the Windows app into "Degen Life App\Degen Life.exe".
rem Needs Node.js (https://nodejs.org). First time: run "npm install" in this folder (downloads Electron + electron-builder).
cd /d "%~dp0"
set CSC_IDENTITY_AUTO_DISCOVERY=false
tasklist /FI "IMAGENAME eq Degen Life.exe" 2>nul | find /i "Degen Life.exe" >nul && (echo Close Degen Life first, then run this again. & pause & exit /b 1)
if not exist node_modules\electron-builder (echo Run "npm install" in the app folder first. & pause & exit /b 1)
if exist bundled rmdir /s /q bundled
mkdir bundled
copy /y "..\index.html" bundled\ >nul
for %%d in (core game chart world apps ui vendor assets mods) do if exist "..\%%d" xcopy /e /i /y /q "..\%%d" "bundled\%%d" >nul
node node_modules\electron-builder\cli.js --win dir --x64 || (echo BUILD FAILED & pause & exit /b 1)
robocopy "release\win-unpacked" "..\Degen Life App" /MIR /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (echo COPY FAILED: is Degen Life still open? & pause & exit /b 1)
echo Done: "Degen Life App\Degen Life.exe" is ready.
if not "%1"=="/nopause" pause
