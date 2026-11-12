@echo off
rem Runs the Node tests (needs Node.js 20+).
cd /d "%~dp0.."
node --test --test-reporter=dot "tests/*.test.js"
