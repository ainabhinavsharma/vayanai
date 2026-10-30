#!/usr/bin/env python3
"""
Vayanai Candidate Dispatcher CLI — Microsoft Outlook Local Automation
---------------------------------------------------------------------
Dispatches Stage 2 Virtual Assessment invitations strictly through local
Windows Outlook Desktop using account: manpreet@vayanai.in.net

Continuous Human Pacing:
  - Randomized pauses of 55s to 90s between every single email.
  - No artificial 60/hr block: dispatches non-stop until all applicants are invited.
  - Real-time Google Sheet synchronization pulls newly submitted applicants.

Usage Examples:
  # Check applicant queue counts and sync latest Google Sheet:
  python scripts/dispatch_candidates_outlook.py --stats

  # Stage 1 sample draft into Outlook Drafts (zero risk, inspect in Outlook):
  python scripts/dispatch_candidates_outlook.py --draft

  # Send 1 test invitation to your personal inbox:
  python scripts/dispatch_candidates_outlook.py --test-to your_email@gmail.com

  # Dispatch a batch of 10 applicants with 55s-90s safety pauses:
  python scripts/dispatch_candidates_outlook.py --batch 10

  # Run continuous background pacing loop (55-90s jitter, non-stop till complete):
  python scripts/dispatch_candidates_outlook.py --continuous
"""

import sys
import os
import time
import random
import argparse
from pathlib import Path

# Add backend/botskill/src to Python path so botskill modules resolve cleanly
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent
BOTSKILL_SRC = PROJECT_ROOT / "backend" / "botskill" / "src"
if str(BOTSKILL_SRC) not in sys.path:
    sys.path.insert(0, str(BOTSKILL_SRC))

try:
    from botskill.mail_providers.candidate_dispatcher import (
        OutlookCandidateDispatcher,
        DEFAULT_SENDER_ACCOUNT,
        DEFAULT_DELAY_MIN,
        DEFAULT_DELAY_MAX,
    )
except ImportError as err:
    print(f"[ERROR] Failed to import botskill dispatcher: {err}")
    print(f"Checked path: {BOTSKILL_SRC}")
    sys.exit(1)


def print_banner():
    print("=" * 72)
    print("     VAYANAI CANDIDATE EMAIL DISPATCHER (LOCAL OUTLOOK ENGINE)")
    print(f"  Sender Account   : {DEFAULT_SENDER_ACCOUNT}")
    print(f"  Pacing Schedule  : Continuous {int(DEFAULT_DELAY_MIN)}s - {int(DEFAULT_DELAY_MAX)}s randomized human breaks")
    print("  Design Direction : Text-forward minimalist (primary inbox deliverability)")
    print("  WhatsApp Group   : https://chat.whatsapp.com/GQDe0hBYEWZ1k7ZKKeVXoi")
    print("=" * 72)


def main():
    parser = argparse.ArgumentParser(description="Vayanai Local Outlook Candidate Dispatcher")
    parser.add_argument("--stats", action="store_true", help="Display applicant queue counts and hourly usage")
    parser.add_argument("--draft", action="store_true", help="Stage 1 sample draft into Outlook Drafts (no email sent)")
    parser.add_argument("--test-to", type=str, help="Send 1 test invitation to the specified recipient email")
    parser.add_argument("--batch", type=int, default=0, help="Dispatch next N candidates (e.g. --batch 10)")
    parser.add_argument("--continuous", action="store_true", help="Run continuous background pacing loop (55-90s breaks)")
    parser.add_argument("--account", default=DEFAULT_SENDER_ACCOUNT, help=f"Sender account in Outlook (default: {DEFAULT_SENDER_ACCOUNT})")
    parser.add_argument("--delay-min", type=float, default=DEFAULT_DELAY_MIN, help=f"Minimum safety pause in seconds (default: {DEFAULT_DELAY_MIN})")
    parser.add_argument("--delay-max", type=float, default=DEFAULT_DELAY_MAX, help=f"Maximum safety pause in seconds (default: {DEFAULT_DELAY_MAX})")

    args = parser.parse_args()

    print_banner()

    dispatcher = OutlookCandidateDispatcher(sender_email=args.account)

    try:
        dispatcher.connect_outlook()
        print(f"[OK] Connected to local Windows Outlook as: {dispatcher.sender_email}\n")
    except Exception as ex:
        print(f"[ERROR] Outlook connection failed: {ex}")
        sys.exit(1)

    # Always check Google Sheet for new submissions at startup
    print("[GOOGLE SYNC] Checking Google Sheet for newly submitted applicants...")
    new_ingested = dispatcher.sync_google_form_submissions()
    if new_ingested > 0:
        print(f"  -> Ingested {new_ingested} newly registered applicant(s) from Google Sheet into queue!\n")
    else:
        print("  -> Google Sheet is up-to-date (no new registrations pending).\n")

    # 1. Queue Statistics
    stats = dispatcher.get_queue_statistics()
    print("Applicant Queue Status:")
    print(f"  * Total Google Form Applicants : {stats['total_applicants']}")
    print(f"  * Previously Invited           : {stats['sent_count']}")
    print(f"  * Pending Invitations Awaiting : {stats['pending_count']}")
    print(f"  * Dispatched in Last 1 Hour    : {stats['sent_last_hour']} (telemetry)\n")

    if args.stats and not (args.draft or args.test_to or args.batch or args.continuous):
        return

    # 2. Stage Draft Mode (Safe Preview)
    if args.draft:
        pending = dispatcher.get_pending_applicants(limit=1)
        sample_cand = pending[0] if pending else {
            "id": "app-sample-preview",
            "user_name": "Applicant Preview",
            "user_email": "candidate.preview@example.com",
            "college_name": "Delhi Technological University",
            "track_name": "Artificial Intelligence & Operations",
            "magic_token": "sample-magic-token-preview-2026",
            "batch_start_date": "Monday, 2 November 2026",
        }
        print("[STAGE DRAFT] Creating sample email in your Outlook Drafts folder...")
        draft_to = dispatcher.stage_draft(sample_cand)
        print(f"[SUCCESS] Sample draft created for: {draft_to}")
        print("-> Open Windows Outlook -> click 'Drafts' folder to review subject, formatting, and links!\n")
        return

    # 3. Single Test Send Mode
    if args.test_to:
        test_email = args.test_to.strip()
        print(f"[TEST SEND] Dispatching test invitation to your address: {test_email}...")
        sample_cand = {
            "id": "app-test-verification",
            "user_name": "Integrity Test Reviewer",
            "user_email": test_email,
            "college_name": "National Institute of Technology",
            "track_name": "Artificial Intelligence & Operations",
            "magic_token": "test-candidate-token-2026",
            "batch_start_date": "Monday, 2 November 2026",
        }
        dispatcher.send_single_invite(sample_cand, recipient_override=test_email, mark_db=False)
        print(f"[SUCCESS] Test email dispatched via Outlook to: {test_email}!")
        print("-> Check your inbox (and spam folder) to verify formatting and click the assessment link.\n")
        return

    # 4. Batch Dispatch Mode
    if args.batch > 0:
        print(f"[BATCH DISPATCH] Starting controlled batch of {args.batch} candidates ({args.delay_min:.0f}s-{args.delay_max:.0f}s breaks)...")
        res = dispatcher.dispatch_batch(batch_size=args.batch, delay_min=args.delay_min, delay_max=args.delay_max)
        if res.get("success"):
            print(f"\n[BATCH COMPLETE] Successfully dispatched {res['dispatched']} invitations!")
            print(f"Remaining pending candidates in queue: {res['remaining_pending']}\n")
        else:
            print(f"\n[NOTICE] {res.get('error')}\n")
        return

    # 5. Continuous Autonomous Daemon Mode (Non-stop till all emails are sent)
    if args.continuous:
        print(f"[DAEMON MODE] Starting continuous dispatch loop (pauses: {args.delay_min:.0f}s - {args.delay_max:.0f}s)...")
        print("Hourly quota blocks are disabled. Dispatch will run continuously until all applicants are invited.")
        print("Press Ctrl+C at any time to pause safely.\n")

        send_count = 0
        try:
            while True:
                # Periodic Google Sheet sync every 10 dispatched emails
                if send_count > 0 and send_count % 10 == 0:
                    print(f"[{time.strftime('%X')}] [GOOGLE SYNC] Checking Google Form for newly submitted applicants...")
                    newly_added = dispatcher.sync_google_form_submissions()
                    if newly_added > 0:
                        print(f"  -> Ingested {newly_added} new applicant(s) into queue!")
                    else:
                        print("  -> Google Form queue up-to-date.")

                candidates = dispatcher.get_pending_applicants(limit=1)
                if not candidates:
                    # Queue is 0, check Google Form one more time before entering polling wait
                    print(f"[{time.strftime('%X')}] Queue is empty. Checking Google Form for latest entries...")
                    newly_added = dispatcher.sync_google_form_submissions()
                    if newly_added > 0:
                        print(f"  -> Found {newly_added} new submission(s)! Continuing dispatch loop.")
                        continue
                    else:
                        print(f"[{time.strftime('%X')}] [DONE] All applicants in database and Google Form have been invited!")
                        print("Polling Google Form every 90 seconds for incoming registrations (Press Ctrl+C to stop)...")
                        time.sleep(90)
                        continue

                cand = candidates[0]
                print(f"[{time.strftime('%X')}] Sending to: {cand['user_name']} <{cand['user_email']}>...")
                dispatcher.send_single_invite(cand, mark_db=True)
                send_count += 1

                out_items = dispatcher.get_outbox_count()
                if out_items == 0:
                    print("  [OK] Outbox cleared: message transmitted to mail server.")
                else:
                    print(f"  [INFO] Outlook Outbox currently holds {out_items} item(s); waiting for transport...")
                    dispatcher.wait_for_outbox_drain(timeout_sec=20)

                # Fetch updated pending count
                remaining_pending = dispatcher.get_queue_statistics()["pending_count"]

                # Randomized break between 55 to 90 seconds
                pause_sec = int(random.uniform(args.delay_min, args.delay_max))
                print(f"  [PAUSE] Resting for {pause_sec}s (Random break: {args.delay_min:.0f}s-{args.delay_max:.0f}s | Pending in queue: {remaining_pending})...")
                for remaining in range(pause_sec, 0, -5):
                    print(f"    ... {remaining}s remaining before next applicant", end="\r", flush=True)
                    time.sleep(min(5, remaining))
                print("    ... ready for next send!                             \n")

        except KeyboardInterrupt:
            print("\n[PAUSED] Dispatcher stopped by user. Progress has been saved safely in the database.")
            return

    # If no flags passed, show help
    print("No action specified. Run with --draft, --test-to <EMAIL>, --batch <N>, or --continuous.")
    print("Or run 'run_outlook_dispatcher.bat' for interactive menu.")


if __name__ == "__main__":
    main()
