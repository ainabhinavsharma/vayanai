@echo off
cd /d "%~dp0"
title VayanAI WhatsApp - Account 1 (ODD)
color 0a
echo ========================================================================
echo   VAYANAI WHATSAPP WORKER - ACCOUNT 1 (ODD CANDIDATES - GREEN)
echo ========================================================================
python -u scripts\send_vayanai_whatsapp.py --worker account1
echo.
echo ========================================================================
echo   Account 1 worker finished or paused.
echo ========================================================================
pause
