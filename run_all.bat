@echo off
setlocal enabledelayedexpansion

title Vayanai + BOTSKILL Unified Stack Launcher
echo =========================================================================
echo              Vayanai Travel Network + BOTSKILL AI Engine
echo =========================================================================
echo  [Active Mailbox Domain]   @vayanai.in.net (Windows Outlook COM MAPI)
echo  [Enforced Policies]       24h Partner SLA + 72h Cancellation Notice
echo  [Safety Boundary]         DRAFT_ONLY Safe Barrier (Physical .Send Blocked)
echo =========================================================================

echo [1/2] Launching BOTSKILL AI Backend on http://127.0.0.1:8765 in background window...
start "BOTSKILL Backend" cmd /c "%~dp0run_botskill.bat"

echo [2/2] Launching Next.js Web Frontend on http://localhost:3000...
cd /d "%~dp0"
call npm run dev

endlocal
