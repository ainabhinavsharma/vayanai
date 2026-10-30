@echo off
cd /d "%~dp0"

:MENU
cls
echo ========================================================================
echo        VAYANAI CANDIDATE WHATSAPP DISPATCHER (DUAL ACCOUNT ENGINE)
echo ========================================================================
echo   Target Audience : 92 Newest Registered Candidates (46 per Account)
echo   Pacing Schedule : Continuous 18s-35s randomized human breaks
echo   Portal Link     : https://vayanai.onrender.com/enroll
echo   Group Link      : https://chat.whatsapp.com/Kn6o6hMoFfc7rIVx0wgZt3
echo ========================================================================
echo.
echo   [1] PREVIEW QUEUE (Dry Run)          : Inspect 46+46 Split and Sample Message
echo   [2] RE-SEED QUEUE FROM DATABASE      : Pull Fresh 92 Newest Applications
echo   [3] SEND TEST MESSAGE                : Send 1 Sample Message to Your Own Phone
echo   [4] LAUNCH DUAL WORKERS (PARALLEL)   : Start Both Account 1 and Account 2
echo   [5] RUN ACCOUNT 1 ONLY (ODD)         : Dispatch 46 Candidates from Account 1
echo   [6] RUN ACCOUNT 2 ONLY (EVEN)        : Dispatch 46 Candidates from Account 2
echo   [7] RESET FAILED TO PENDING          : Retry Failed Deliveries
echo   [0] EXIT
echo.
echo ========================================================================
set choice=
set /p choice=Enter your choice (0-7): 

if "%choice%"=="1" goto OPTION1
if "%choice%"=="2" goto OPTION2
if "%choice%"=="3" goto OPTION3
if "%choice%"=="4" goto OPTION4
if "%choice%"=="5" goto OPTION5
if "%choice%"=="6" goto OPTION6
if "%choice%"=="7" goto OPTION7
if "%choice%"=="0" goto OPTION0

echo.
echo Invalid choice "%choice%". Please enter a number from 0 to 7.
echo.
pause
goto MENU

:OPTION1
cls
python scripts\send_vayanai_whatsapp.py --dry-run
echo.
pause
goto MENU

:OPTION2
cls
echo [ACTION] Re-seeding queue from database with newest applications...
python scripts\send_vayanai_whatsapp.py --init-db --reseed
echo.
pause
goto MENU

:OPTION3
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

:OPTION4
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

:OPTION5
cls
call "%~dp0run_worker_acc1.bat"
goto MENU

:OPTION6
cls
call "%~dp0run_worker_acc2.bat"
goto MENU

:OPTION7
cls
echo [ACTION] Resetting FAILED candidates back to PENDING...
python scripts\send_vayanai_whatsapp.py --reset-failed
echo.
pause
goto MENU

:OPTION0
echo Exiting VayanAI WhatsApp Dispatcher.
exit /b 0
