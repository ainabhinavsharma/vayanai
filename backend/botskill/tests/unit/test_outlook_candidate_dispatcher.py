"""Unit tests for BOTSKILL Outlook Candidate Dispatcher."""

import sys
import unittest
from pathlib import Path

# Add botskill src to path
SRC_DIR = Path(__file__).resolve().parents[2] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from botskill.mail_providers.candidate_dispatcher import (
    OutlookCandidateDispatcher,
    DEFAULT_SENDER_ACCOUNT,
    DEFAULT_DELAY_MIN,
    DEFAULT_DELAY_MAX,
)


class TestOutlookCandidateDispatcher(unittest.TestCase):
    def setUp(self):
        self.dispatcher = OutlookCandidateDispatcher(sender_email="manpreet@vayanai.in.net")

    def test_dispatcher_initialization(self):
        self.assertEqual(self.dispatcher.sender_email, "manpreet@vayanai.in.net")
        self.assertEqual(self.dispatcher.base_url, "https://vayanai.in.net")
        self.assertTrue(Path(self.dispatcher.db_path).exists())
        self.assertEqual(DEFAULT_DELAY_MIN, 55.0)
        self.assertEqual(DEFAULT_DELAY_MAX, 90.0)

    def test_queue_statistics(self):
        stats = self.dispatcher.get_queue_statistics()
        self.assertIn("total_applicants", stats)
        self.assertIn("sent_count", stats)
        self.assertIn("pending_count", stats)
        self.assertGreaterEqual(stats["total_applicants"], 374)

    def test_payload_builder(self):
        sample = {
            "id": "app-test-101",
            "user_name": "Rohan Gupta",
            "user_email": "rohan.test@example.com",
            "track_name": "Artificial Intelligence & Operations",
            "college_name": "Indian Institute of Technology",
            "magic_token": "deadbeef1234567890abcdef",
            "batch_start_date": "Monday, 2 November 2026",
        }
        subject, html_body, text_body = self.dispatcher.build_invite_payload(sample)

        self.assertIn("Next Step: Virtual Assessment & Cohort Community", subject)
        self.assertIn("Artificial Intelligence & Operations", subject)

        self.assertIn("Rohan Gupta", text_body)
        self.assertIn("https://vayanai.in.net/intern/assessment?token=deadbeef1234567890abcdef", text_body)
        self.assertIn("https://chat.whatsapp.com/GQDe0hBYEWZ1k7ZKKeVXoi", text_body)
        self.assertIn("UDYAM-UP-29-0109046", text_body)

        self.assertIn("Rohan Gupta", html_body)
        self.assertIn("Launch Virtual Assessment", html_body)
        self.assertIn("https://vayanai.in.net/intern/assessment?token=deadbeef1234567890abcdef", html_body)
        self.assertIn("https://chat.whatsapp.com/GQDe0hBYEWZ1k7ZKKeVXoi", html_body)
        self.assertIn("manpreet@vayanai.in.net", html_body)

    @unittest.skipUnless(sys.platform == "win32", "Requires Windows OS")
    def test_connect_outlook_and_find_manpreet_account(self):
        account = self.dispatcher.connect_outlook()
        self.assertIsNotNone(account)
        disp = str(getattr(account, "DisplayName", ""))
        smtp = str(getattr(account, "SmtpAddress", ""))
        self.assertTrue("vayanai.in.net" in disp.lower() or "vayanai.in.net" in smtp.lower())


if __name__ == "__main__":
    unittest.main()
