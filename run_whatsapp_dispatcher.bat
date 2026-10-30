@echo off
cd /d "%~dp0"

:MENU
cls
echo ========================================================================
echo        VAYANAI CANDIDATE WHATSAPP DISPATCHER (DUAL ACCOUNT ENGINE)
echo ========================================================================
echo   Current Campaign : Newest Applications to Oldest (46 per Account)
echo   Pacing Schedule  : Continuous 18s-35s randomized human breaks
echo   Portal Link      : https://vayanai.onrender.com/enroll
echo   Group Link       : https://chat.whatsapp.com/Kn6o6hMoFfc7rIVx0wgZt3
echo ========================================================================
echo.
echo   [1] LAUNCH DUAL WORKERS (PARALLEL)   : Start Sending Current Queue
echo   [2] LOAD NEXT BATCH OF REMAINING     : Queue Next 92 Remaining (Newest First)
echo   [3] LOAD NEXT BATCH AND LAUNCH       : One-Click Load Remaining and Start Both
echo   [4] PREVIEW CURRENT QUEUE (Dry Run)  : Inspect 46+46 Split and Sample Message
echo   [5] PROGRESS AND CAMPAIGN STATUS     : See Total Sent vs Remaining Pool
echo   [6] SEND TEST MESSAGE                : Send 1 Sample Message to Your Own Phone
echo   [7] RUN ACCOUNT 1 ONLY (ODD)         : Dispatch 46 Candidates from Account 1
echo   [8] RUN ACCOUNT 2 ONLY (EVEN)        : Dispatch 46 Candidates from Account 2
echo   [9] RESET FAILED TO PENDING          : Retry Failed Deliveries
echo   [P] VERIFY PAYMENTS AND UTRS         : Review Candidate UTRs and Approve
echo   [0] EXIT
echo.
echo ========================================================================
set choice=
set /p choice=Enter your choice (0-9 or P): 

if /i "%choice%"=="P" goto OPTIONP
if "%choice%"=="1" goto OPTION1
if "%choice%"=="2" goto OPTION2
if "%choice%"=="3" goto OPTION3
if "%choice%"=="4" goto OPTION4
if "%choice%"=="5" goto OPTION5
if "%choice%"=="6" goto OPTION6
if "%choice%"=="7" goto OPTION7
if "%choice%"=="8" goto OPTION8
if "%choice%"=="9" goto OPTION9
if "%choice%"=="0" goto OPTION0

echo.
echo Invalid choice "%choice%". Please enter a number from 0 to 9.
echo.
pause
goto MENU

:OPTION1
cls
echo ========================================================================
echo   [ACTION] Launching Account 1 and Account 2 in parallel windows...
echo ========================================================================
start "" "%~dp0run_worker_acc1.bat"
start "" "%~dp0run_worker_acc2.bat"
echo.
echo   [OK] Both worker windows have been started!
echo   - Window 1 (Green) : Account 1 (46 Odd candidates)
echo   - Window 2 (Yellow): Account 2 (46 Even candidates)
echo.
pause
goto MENU

:OPTION2
cls
echo ========================================================================
echo   [ACTION] Loading Next Batch of Remaining Candidates (Newest First)...
echo ========================================================================
python scripts\send_vayanai_whatsapp.py --next-batch
echo.
pause
goto MENU

:OPTION3
cls
echo ========================================================================
echo   [ACTION] Loading Next Batch and Launching Dual Workers...
echo ========================================================================
python scripts\send_vayanai_whatsapp.py --next-batch
echo.
echo   [ACTION] Starting Account 1 and Account 2 workers in parallel...
start "" "%~dp0run_worker_acc1.bat"
start "" "%~dp0run_worker_acc2.bat"
echo.
echo   [OK] Both worker windows have been started!
echo.
pause
goto MENU

:OPTION4
cls
python scripts\send_vayanai_whatsapp.py --dry-run
echo.
pause
goto MENU

:OPTION5
cls
python scripts\send_vayanai_whatsapp.py --status
echo.
pause
goto MENU

:OPTION6
cls
set test_phone=
set /p test_phone=Enter personal WhatsApp number (e.g. 9876543210): 
if "%test_phone%"=="" (
    echo [ERROR] No phone number provided.
) else (
    python scripts\send_vayanai_whatsapp.py --test-to %test_phone% --account 1
)
echo.
pause
goto MENU

:OPTION7
cls
call "%~dp0run_worker_acc1.bat"
goto MENU

:OPTION8
cls
call "%~dp0run_worker_acc2.bat"
goto MENU

:OPTION9
cls
echo [ACTION] Resetting FAILED candidates back to PENDING...
python scripts\send_vayanai_whatsapp.py --reset-failed
echo.
pause
goto MENU

:OPTIONP
cls
python scripts\check_payments.py --list
echo.
echo Options:
echo   [1] Approve a Candidate by Email or UTR
echo   [0] Return to Menu
echo.
set p_choice=
set /p p_choice=Enter choice (0 or 1): 
if "%p_choice%"=="1" (
    set p_id=
    set /p p_id=Enter Candidate Email or UTR to Approve: 
    if not "%p_id%"=="" python scripts\check_payments.py --approve %p_id%
)
echo.
pause
goto MENU

:OPTION0
echo Exiting VayanAI WhatsApp Dispatcher.
exit /b 0
