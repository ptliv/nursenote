@echo off
chcp 65001 >nul
title NurseNote Dev Server

cd /d "%~dp0"

echo NurseNote 개발 서버를 시작합니다...
echo 브라우저에서 http://localhost:3000 으로 접속하세요.
echo.
echo 종료하려면 이 창을 닫거나 Ctrl+C 를 누르세요.
echo.

npm run dev

pause
