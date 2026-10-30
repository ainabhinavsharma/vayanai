@echo off
setlocal enabledelayedexpansion

title BOTSKILL V3 - Vayanai Intelligence Engine
echo =========================================================================
echo               BOTSKILL v3.0 - Vayanai Intelligence Engine
echo =========================================================================
echo  [Monitored Domain]        @vayanai.in.net (Local Outlook COM MAPI)
echo  [Active Operational SLA]  24-Hour Partner Response SLA
echo  [Cancellation Guardrail]  72-Hour Cancellation Notice Protocol
echo  [Transmission Barrier]    DRAFT_ONLY Active (Safe Local Staging)
echo =========================================================================
echo [1/3] Verifying Python runtime...
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python was not found in PATH. Please install Python 3.10+ and re-run.
    pause
    exit /b 1
)

echo [2/3] Setting PYTHONPATH to backend/botskill/src...
set "PROJECT_ROOT=%~dp0backend\botskill"
set "PYTHONPATH=%PROJECT_ROOT%\src;%PYTHONPATH%"

echo [3/3] Starting BOTSKILL FastAPI Loopback Service on 127.0.0.1:8765...
cd /d "%PROJECT_ROOT%"
python -m botskill.main --host 127.0.0.1 --port 8765 --no-browser

if %ERRORLEVEL% neq 0 (
    echo [ERROR] BOTSKILL service exited with error code %ERRORLEVEL%.
    pause
    exit /b %ERRORLEVEL%
)

endlocal
