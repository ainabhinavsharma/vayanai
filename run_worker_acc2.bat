@echo off
cd /d "%~dp0"
title VayanAI WhatsApp - Account 2 (EVEN)
color 0e
echo ========================================================================
echo   VAYANAI WHATSAPP WORKER - ACCOUNT 2 (EVEN CANDIDATES - YELLOW)
echo ========================================================================
python -u scripts\send_vayanai_whatsapp.py --worker account2
echo.
echo ========================================================================
echo   Account 2 worker finished or paused.
echo ========================================================================
pause
