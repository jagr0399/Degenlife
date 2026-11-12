@echo off
rem Plays Degen Life in your browser (needs Node.js: https://nodejs.org).
cd /d "%~dp0"
start "" http://localhost:8080
node tools\serve.js
