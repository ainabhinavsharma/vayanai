"""BOTSKILL — Windows Outlook COM / MAPI Email Connector.

Provides direct local integration with Microsoft Outlook Desktop using pywin32.
Enforces safe draft staging and progressive autonomy.
"""

from __future__ import annotations

import logging
import re
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from botskill.core.interfaces import EmailProvider
from botskill.core.models import (
    AutonomyLevel,
    DraftReply,
    EmailMessage,
    MessageState,
    generate_idempotency_key,
)

logger = logging.getLogger("botskill.mail_providers.outlook_mapi")


class OutlookMAPIAdapter:
    """Native Windows Outlook COM MAPI Adapter."""

    def __init__(self, autonomy_level: AutonomyLevel = AutonomyLevel.DRAFT_ONLY):
        self.autonomy_level = autonomy_level
        self._outlook = None
        self._namespace = None

    def _ensure_connected(self) -> Any:
        """Lazy-initialize Windows COM Outlook session."""
        if sys.platform != "win32":
            raise RuntimeError("OutlookMAPIAdapter is supported only on Windows OS.")

        if self._outlook is None:
            import win32com.client
            self._outlook = win32com.client.Dispatch("Outlook.Application")
            self._namespace = self._outlook.GetNamespace("MAPI")
        return self._namespace

    def test_connection(self) -> Dict[str, Any]:
        """Probe local Outlook MAPI connectivity and list available accounts."""
        try:
            ns = self._ensure_connected()
            accounts = []
            if hasattr(ns, "Accounts"):
                for acc in ns.Accounts:
                    accounts.append(str(acc.DisplayName))
            return {
                "status": "READY",
                "connector": "Windows COM MAPI",
                "accounts_count": len(accounts),
                "accounts": accounts,
                "autonomy_level": self.autonomy_level.value,
            }
        except Exception as ex:
            logger.error("Outlook MAPI connection probe failed: %s", ex)
            return {
                "status": "UNAVAILABLE",
                "connector": "Windows COM MAPI",
                "error": str(ex),
                "autonomy_level": self.autonomy_level.value,
            }

    def discover_all_outlook_accounts(self, domain_filter: str = "vayanai.in.net") -> List[Dict[str, str]]:
        """Auto-discover local Outlook accounts strictly matching project domain vayanai.in.net."""
        if sys.platform != "win32":
            return []
        try:
            ns = self._ensure_connected()
            discovered_map: Dict[str, str] = {}
            email_pattern = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
            target_domain = (domain_filter or "vayanai.in.net").lower().strip("@")

            # 1. Inspect Accounts collection
            if hasattr(ns, "Accounts"):
                for acc in ns.Accounts:
                    smtp = str(getattr(acc, "SmtpAddress", "")).strip().lower()
                    disp = str(getattr(acc, "DisplayName", "")).strip()
                    m_smtp = email_pattern.search(smtp)
                    m_disp = email_pattern.search(disp)
                    candidate = None
                    if m_smtp and m_smtp.group(0).lower().endswith(f"@{target_domain}"):
                        candidate = m_smtp.group(0).lower()
                    elif m_disp and m_disp.group(0).lower().endswith(f"@{target_domain}"):
                        candidate = m_disp.group(0).lower()

                    if candidate:
                        discovered_map[candidate] = disp or candidate

            # 2. Inspect Stores collection
            if hasattr(ns, "Stores"):
                for st in ns.Stores:
                    st_name = str(getattr(st, "DisplayName", "")).strip()
                    m_st = email_pattern.search(st_name)
                    if m_st:
                        candidate = m_st.group(0).lower()
                        if candidate.endswith(f"@{target_domain}") and candidate not in discovered_map:
                            discovered_map[candidate] = st_name

            # 3. Inspect Root Folders
            if hasattr(ns, "Folders"):
                for folder in ns.Folders:
                    fname = str(getattr(folder, "Name", "")).strip()
                    m_f = email_pattern.search(fname)
                    if m_f:
                        candidate = m_f.group(0).lower()
                        if candidate.endswith(f"@{target_domain}") and candidate not in discovered_map:
                            discovered_map[candidate] = fname

            results = []
            for email, disp in discovered_map.items():
                results.append({
                    "email": email,
                    "display_name": disp,
                    "domain": target_domain,
                })
            return results
        except Exception as ex:
            logger.debug("Outlook account discovery note: %s", ex)
            return []

    def discover_domain_accounts(self, domain: Optional[str] = "vayanai.in.net") -> List[str]:
        """Auto-discover local Outlook accounts strictly matching project domain."""
        target = domain or "vayanai.in.net"
        all_accs = self.discover_all_outlook_accounts(target)
        return [a["email"] for a in all_accs]

    def _get_folder_for_account(self, ns, account_id: str, target_name: str):
        """Locates the store-specific folder for an account or falls back to default MAPI folder."""
        target_name_lower = target_name.lower()
        if hasattr(ns, "Folders"):
            for folder in ns.Folders:
                if account_id.lower() in folder.Name.lower():
                    for sub in folder.Folders:
                        if sub.Name.lower() == target_name_lower:
                            return sub
        # Fallback to default
        if target_name_lower == "inbox":
            return ns.GetDefaultFolder(6)
        elif target_name_lower == "drafts":
            return ns.GetDefaultFolder(16)
        return None

    def list_new_messages(self, account_id: str, limit: int = 20) -> List[EmailMessage]:
        """Retrieve recent unread messages from Outlook Inbox for the given account."""
        ns = self._ensure_connected()
        messages = []

        try:
            inbox = self._get_folder_for_account(ns, account_id, "inbox")
            if not inbox:
                return []
            items = inbox.Items
            items.Sort("[ReceivedTime]", True)

            count = 0
            for item in items:
                if count >= limit:
                    break
                # Only process unread mail items
                if getattr(item, "UnRead", False):
                    subject = str(getattr(item, "Subject", ""))
                    body = str(getattr(item, "Body", ""))
                    html = str(getattr(item, "HTMLBody", ""))
                    sender = str(getattr(item, "SenderEmailAddress", "unknown@sender.com"))
                    entry_id = str(getattr(item, "EntryID", f"msg_outlook_{count}"))
                    conv_id = str(getattr(item, "ConversationID", entry_id))
                    recv_time = getattr(item, "ReceivedTime", None)
                    if recv_time:
                        received_at = recv_time.strftime("%Y-%m-%dT%H:%M:%SZ")
                    else:
                        received_at = datetime.now(timezone.utc).isoformat()

                    idemp_key = generate_idempotency_key(account_id, entry_id, conv_id)
                    recipients = [account_id]

                    msg = EmailMessage(
                        message_id=entry_id,
                        provider_id="outlook_com_mapi",
                        thread_id=conv_id,
                        account_id=account_id,
                        sender=sender,
                        recipients=recipients,
                        subject=subject,
                        body_text=body,
                        body_html=html,
                        received_at=received_at,
                        state=MessageState.DISCOVERED,
                        idempotency_key=idemp_key,
                    )
                    messages.append(msg)
                    count += 1
        except Exception as e:
            logger.error("Failed to list messages from Outlook inbox for %s: %s", account_id, e)

        return messages

    @staticmethod
    def clean_inbound_text(text: str) -> str:
        """Strip preceding quoted threads to isolate candidate or client reply."""
        patterns = [
            r"-----Original Message-----",
            r"From:\s+.*",
            r"Sent:\s+.*",
            r"________________________________",
        ]
        clean_text = text
        for p in patterns:
            parts = re.split(p, clean_text, flags=re.IGNORECASE)
            if parts:
                clean_text = parts[0]
        return clean_text.strip()

    clean_quoted_history = clean_inbound_text

    def create_draft(self, draft: DraftReply) -> bool:
        """Stage an email as a draft in Outlook Drafts folder. Strict no-send invariant."""
        try:
            ns = self._ensure_connected()
            drafts_folder = self._get_folder_for_account(ns, draft.account_id, "drafts")
            if not drafts_folder:
                drafts_folder = ns.GetDefaultFolder(16)  # olFolderDrafts

            mail_item = self._outlook.CreateItem(0)  # 0 = olMailItem
            mail_item.Subject = draft.subject
            mail_item.Body = draft.body_text
            if draft.body_html:
                mail_item.HTMLBody = draft.body_html

            # Set recipient if in-reply-to exists
            if hasattr(draft, "recipient") and draft.recipient:
                mail_item.To = draft.recipient

            # Save draft strictly - NEVER call .Send()
            mail_item.Save()
            mail_item.Move(drafts_folder)
            logger.info("Successfully staged draft '%s' to Outlook folder without sending.", draft.draft_id)
            return True
        except Exception as e:
            logger.error("Failed to stage draft in Outlook: %s", e)
            return False

    def send_reply(self, draft: DraftReply, idempotency_key: str) -> bool:
        """Physical .Send() barrier: strictly blocked in DRAFT_ONLY mode."""
        if self.autonomy_level == AutonomyLevel.DRAFT_ONLY:
            msg = "PHYSICAL SEND BLOCKED: Autonomy level is strictly LEVEL_1_DRAFT_ONLY. Human Outlook authorization required."
            logger.warning(msg)
            raise PermissionError(msg)

        if not draft.is_approved:
            msg = "SEND REJECTED: Draft has not received human supervisor approval."
            logger.warning(msg)
            raise PermissionError(msg)

        raise NotImplementedError("Live unattended auto-send requires LEVEL_3_LIMITED_AUTO license.")
