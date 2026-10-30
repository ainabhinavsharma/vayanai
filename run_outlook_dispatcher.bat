@echo off
setlocal enabledelayedexpansion

title Vayanai Candidate Dispatcher - Windows Outlook Engine
:MENU
cls
echo ========================================================================
echo        VAYANAI CANDIDATE EMAIL DISPATCHER (LOCAL OUTLOOK ENGINE)
echo ========================================================================
echo   Sender Account  : manpreet@vayanai.in.net (Local Windows Outlook Desktop)
echo   Delivery Pacing : Continuous 55s-90s human breaks (No hourly blocks)
echo ========================================================================
echo.
echo   [1] QUEUE STATUS     : Check Total, Pending and Dispatched Counts (Syncs Google Form)
echo   [2] STAGE DRAFT      : Create 1 Sample Email in Outlook Drafts (Zero Risk)
echo   [3] SEND TEST EMAIL  : Dispatch 1 Sample Email to Your Personal Address
echo   [4] DISPATCH 10      : Send Next 10 Applicants (55s-90s breaks)
echo   [5] DISPATCH 25      : Send Next 25 Applicants (55s-90s breaks)
echo   [6] RUN DAEMON       : Continuous Dispatch (55-90s breaks non-stop till all sent)
echo   [7] SYNC WITH CPANEL : Push Invites to Live & Pull Candidate Test Scores
echo   [0] EXIT
echo.
echo ========================================================================
set /p choice="Enter your choice (0-7): "

if "%choice%"=="1" (
    cls
    python scripts\dispatch_candidates_outlook.py --stats
    pause
    goto MENU
)

if "%choice%"=="2" (
    cls
    echo [ACTION] Staging 1 candidate invitation in your Outlook Drafts...
    python scripts\dispatch_candidates_outlook.py --draft
    pause
    goto MENU
)

if "%choice%"=="3" (
    cls
    echo Enter your personal email address to receive the test invitation:
    set /p test_email="Email: "
    if not "!test_email!"=="" (
        python scripts\dispatch_candidates_outlook.py --test-to !test_email!
    ) else (
        echo [ERROR] No email provided.
    )
    pause
    goto MENU
)

if "%choice%"=="4" (
    cls
    echo [ACTION] Launching controlled batch of 10 candidate invitations...
    python scripts\dispatch_candidates_outlook.py --batch 10
    pause
    goto MENU
)

if "%choice%"=="5" (
    cls
    echo [ACTION] Launching controlled batch of 25 candidate invitations...
    python scripts\dispatch_candidates_outlook.py --batch 25
    pause
    goto MENU
)

if "%choice%"=="6" (
    cls
    echo [ACTION] Starting continuous daemon pacing loop...
    python scripts\dispatch_candidates_outlook.py --continuous
    pause
    goto MENU
)

if "%choice%"=="7" (
    cls
    echo [ACTION] Synchronizing Local Database with cPanel Server...
    python scripts\sync_db_with_cpanel.py
    pause
    goto MENU
)

if "%choice%"=="0" (
    echo Exiting Vayanai Dispatcher.
    exit /b 0
)

echo Invalid choice. Please try again.
pause
goto MENU
