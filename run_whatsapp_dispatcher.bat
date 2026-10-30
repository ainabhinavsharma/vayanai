@echo off
setlocal enabledelayedexpansion

title VayanAI Candidate Dispatcher - Dual WhatsApp Engine
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
echo   [1] PREVIEW QUEUE (Dry Run)       : Inspect 46+46 Split and Sample Message
echo   [2] RE-SEED QUEUE FROM DATABASE   : Pull Fresh 92 Newest Applications
echo   [3] SEND TEST MESSAGE             : Send 1 Sample Message to Your Own Phone
echo   [4] VERIFY & LAUNCH DUAL DISPATCH : Pre-flight Check Sessions & Start Both
echo   [5] RUN ACCOUNT 1 ONLY (ODD)      : Dispatch 46 Candidates from Account 1
echo   [6] RUN ACCOUNT 2 ONLY (EVEN)     : Dispatch 46 Candidates from Account 2
echo   [7] RESET FAILED TO PENDING       : Retry Failed Deliveries
echo   [0] EXIT
echo.
echo ========================================================================
set /p choice="Enter your choice (0-7): "

if "%choice%"=="1" (
    cls
    python scripts\send_vayanai_whatsapp.py --dry-run
    pause
    goto MENU
)

if "%choice%"=="2" (
    cls
    echo [ACTION] Re-seeding queue from database with newest applications...
    python scripts\send_vayanai_whatsapp.py --init-db --reseed
    pause
    goto MENU
)

if "%choice%"=="3" (
    cls
    echo Enter your personal WhatsApp number (e.g. 9876543210 or 919876543210):
    set /p test_phone="Phone: "
    if not "!test_phone!"=="" (
        python scripts\send_vayanai_whatsapp.py --test-to !test_phone! --account 1
    ) else (
        echo [ERROR] No phone number provided.
    )
    pause
    goto MENU
)

if "%choice%"=="4" (
    cls
    echo [ACTION] Starting Pre-Flight Verification and Dual Launch...
    python scripts\verify_and_launch_whatsapp.py
    pause
    goto MENU
)

if "%choice%"=="5" (
    cls
    echo [ACTION] Starting Account 1 (Odd) worker in current window...
    python scripts\send_vayanai_whatsapp.py --worker account1
    pause
    goto MENU
)

if "%choice%"=="6" (
    cls
    echo [ACTION] Starting Account 2 (Even) worker in current window...
    python scripts\send_vayanai_whatsapp.py --worker account2
    pause
    goto MENU
)

if "%choice%"=="7" (
    cls
    echo [ACTION] Resetting FAILED candidates back to PENDING...
    python scripts\send_vayanai_whatsapp.py --reset-failed
    pause
    goto MENU
)

if "%choice%"=="0" (
    echo Exiting VayanAI WhatsApp Dispatcher.
    exit /b 0
)

echo Invalid choice. Please try again.
pause
goto MENU
