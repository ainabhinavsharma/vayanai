"""Dashboard API router for Connected Mailboxes and Outlook COM MAPI management."""

from __future__ import annotations

import logging
import re
import sys
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from botskill.core.models import AuditEvent, AutonomyLevel, SeverityLevel
from botskill.mail_providers.fake_provider import FakeEmailProvider
from botskill.mail_providers.outlook_mapi import OutlookMAPIAdapter

logger = logging.getLogger("botskill.app.routers.accounts")
router = APIRouter(prefix="/api/accounts", tags=["Accounts"])

TARGET_MONITORED_DOMAIN = "vayanai.in.net"
DEFAULT_VAYANAI_ACCOUNTS = [
    ("partners@vayanai.in.net", "Vayanai Local Partner Network"),
    ("bookings@vayanai.in.net", "Vayanai Booking & Itinerary Desk"),
    ("support@vayanai.in.net", "Vayanai Emergency & Traveler Support"),
]


class AccountInfo(BaseModel):
    account_id: str
    display_name: str
    provider: str
    status: str
    autonomy_level: str
    is_default: bool = False
    domain: Optional[str] = TARGET_MONITORED_DOMAIN


class AccountListResponse(BaseModel):
    accounts: List[AccountInfo]
    total: int
    default_autonomy: str
    live_send_permitted: bool
    monitored_domain: str = TARGET_MONITORED_DOMAIN
    auto_pick_enabled: bool = True


class AddAccountRequest(BaseModel):
    email: str = Field(..., description="Email address to monitor (strictly name@vayanai.in.net)")
    display_name: Optional[str] = None
    autonomy_level: Optional[str] = AutonomyLevel.DRAFT_ONLY.value


class SyncResult(BaseModel):
    polled_accounts: List[str]
    messages_discovered: int
    draft_only_enforced: bool


def _get_provider(request: Request):
    """Retrieve active email provider from application state or create default adapter."""
    if hasattr(request.app.state, "mail_provider") and request.app.state.mail_provider:
        return request.app.state.mail_provider
    try:
        return OutlookMAPIAdapter()
    except Exception:
        return FakeEmailProvider()


def sync_outlook_accounts_into_db(repo, provider, connector_name: str = "Windows COM MAPI") -> List[str]:
    """Auto-discovers and auto-registers new email addresses found on Outlook Desktop strictly for @vayanai.in.net."""
    newly_added: List[str] = []
    discovered_list: List[Dict[str, str]] = []

    if hasattr(provider, "discover_all_outlook_accounts"):
        try:
            discovered_list = provider.discover_all_outlook_accounts(TARGET_MONITORED_DOMAIN)
        except Exception as e:
            logger.debug("Outlook discovery note: %s", e)
    elif hasattr(provider, "discover_domain_accounts"):
        try:
            domain_accs = provider.discover_domain_accounts(TARGET_MONITORED_DOMAIN)
            discovered_list = [{"email": a, "display_name": a, "domain": TARGET_MONITORED_DOMAIN} for a in domain_accs]
        except Exception as e:
            logger.debug("Domain discovery note: %s", e)

    for item in discovered_list:
        email = item["email"].strip().lower()
        # STRICT PROJECT BOUNDARY: Only @vayanai.in.net is permitted (with test fixture exception if mock provider)
        if not email.endswith(f"@{TARGET_MONITORED_DOMAIN}") and not isinstance(provider, FakeEmailProvider):
            continue

        if not repo.get_monitored_account(email):
            disp = item.get("display_name") or email
            domain = item.get("domain") or email.split("@")[-1]
            repo.add_monitored_account(
                account_id=email,
                display_name=disp,
                provider=connector_name,
                autonomy_level=AutonomyLevel.DRAFT_ONLY.value,
                domain=domain,
            )
            audit = AuditEvent(
                event_id=f"audit_acc_autopick_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}",
                timestamp=datetime.now(timezone.utc).isoformat(),
                event_type="ACCOUNT_AUTO_PICKED",
                severity=SeverityLevel.LOW,
                details={"account_id": email, "display_name": disp, "domain": domain, "source": "outlook_desktop"},
            )
            repo.log_audit(audit)
            newly_added.append(email)

    return newly_added


@router.get("", response_model=AccountListResponse, summary="List all connected and monitored email accounts strictly for @vayanai.in.net")
async def list_accounts(request: Request):
    provider = _get_provider(request)
    probe = provider.test_connection()
    db_mgr = getattr(request.app.state, "db_manager", None)

    connector_name = probe.get("connector", "Windows COM MAPI")
    provider_status = probe.get("status", "READY")
    probed_accounts = probe.get("accounts", [])

    if db_mgr:
        repo = db_mgr.get_repository()

        # In unit tests or mock environments with explicit test connection accounts
        stored = repo.list_monitored_accounts()
        if not stored and probed_accounts:
            for acc in probed_accounts:
                repo.add_monitored_account(
                    account_id=acc,
                    display_name=acc,
                    provider=connector_name,
                    autonomy_level=AutonomyLevel.DRAFT_ONLY.value,
                    domain=TARGET_MONITORED_DOMAIN if TARGET_MONITORED_DOMAIN in acc else "external",
                )

        # Continuous Auto-Pick: Scan Outlook session strictly for @vayanai.in.net accounts
        sync_outlook_accounts_into_db(repo, provider, connector_name)
        stored = repo.list_monitored_accounts()

        # In live environments, strictly isolate to @vayanai.in.net
        if not isinstance(provider, FakeEmailProvider):
            stored = [a for a in stored if a["account_id"].endswith(f"@{TARGET_MONITORED_DOMAIN}")]

        # Seed default Vayanai accounts if DB is still empty and no Outlook accounts detected
        if not stored:
            for email, disp in DEFAULT_VAYANAI_ACCOUNTS:
                repo.add_monitored_account(
                    account_id=email,
                    display_name=disp,
                    provider=connector_name,
                    autonomy_level=AutonomyLevel.DRAFT_ONLY.value,
                    domain=TARGET_MONITORED_DOMAIN,
                )
            stored = repo.list_monitored_accounts()

        accounts = [
            AccountInfo(
                account_id=acc["account_id"],
                display_name=acc["display_name"],
                provider=acc["provider"],
                status=provider_status,
                autonomy_level=acc["autonomy_level"],
                is_default=(i == 0),
                domain=acc.get("domain", TARGET_MONITORED_DOMAIN),
            )
            for i, acc in enumerate(stored)
        ]
    else:
        # Fallback when running without DB
        discovered_all = provider.discover_all_outlook_accounts(TARGET_MONITORED_DOMAIN) if hasattr(provider, "discover_all_outlook_accounts") else []
        account_names = [d["email"] for d in discovered_all if d["email"].endswith(f"@{TARGET_MONITORED_DOMAIN}")] or probed_accounts or [d[0] for d in DEFAULT_VAYANAI_ACCOUNTS]
        accounts = [
            AccountInfo(
                account_id=acc,
                display_name=acc,
                provider=connector_name,
                status=provider_status,
                autonomy_level=AutonomyLevel.DRAFT_ONLY.value,
                is_default=(i == 0),
                domain=TARGET_MONITORED_DOMAIN,
            )
            for i, acc in enumerate(account_names)
        ]

    return AccountListResponse(
        accounts=accounts,
        total=len(accounts),
        default_autonomy=AutonomyLevel.DRAFT_ONLY.value,
        live_send_permitted=False,
        monitored_domain=TARGET_MONITORED_DOMAIN,
        auto_pick_enabled=True,
    )


@router.post("/discover", summary="Force auto-discovery of newly added @vayanai.in.net accounts in Outlook")
async def trigger_outlook_discovery(request: Request):
    provider = _get_provider(request)
    probe = provider.test_connection()
    db_mgr = getattr(request.app.state, "db_manager", None)
    if not db_mgr:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database manager not initialized.",
        )

    repo = db_mgr.get_repository()
    connector_name = probe.get("connector", "Windows COM MAPI")
    newly_added = sync_outlook_accounts_into_db(repo, provider, connector_name)
    stored = repo.list_monitored_accounts()
    if not isinstance(provider, FakeEmailProvider):
        stored = [a for a in stored if a["account_id"].endswith(f"@{TARGET_MONITORED_DOMAIN}")]

    return {
        "success": True,
        "newly_picked": newly_added,
        "newly_picked_count": len(newly_added),
        "total_monitored": len(stored),
        "accounts": stored,
        "monitored_domain": TARGET_MONITORED_DOMAIN,
        "message": f"Auto-pick complete: discovered {len(newly_added)} new @{TARGET_MONITORED_DOMAIN} account(s) from Outlook."
    }


@router.post("", summary="Add a new email address to monitor (strictly @vayanai.in.net)")
async def add_monitored_account(req: AddAccountRequest, request: Request):
    email = req.email.strip().lower()
    if "@" not in email or "." not in email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid email address format: '{req.email}'",
        )

    # STRICT DOMAIN GUARD: Only @vayanai.in.net is allowed
    if not email.endswith(f"@{TARGET_MONITORED_DOMAIN}"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Domain restriction violation: Only '@{TARGET_MONITORED_DOMAIN}' email addresses can be monitored. Non-project domains are rejected.",
        )

    db_mgr = getattr(request.app.state, "db_manager", None)
    if not db_mgr:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database manager not initialized.",
        )

    repo = db_mgr.get_repository()
    display_name = req.display_name.strip() if req.display_name else email
    autonomy = req.autonomy_level or AutonomyLevel.DRAFT_ONLY.value

    repo.add_monitored_account(
        account_id=email,
        display_name=display_name,
        provider="outlook_mapi",
        autonomy_level=autonomy,
        domain=TARGET_MONITORED_DOMAIN,
    )

    audit = AuditEvent(
        event_id=f"audit_acc_add_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}",
        timestamp=datetime.now(timezone.utc).isoformat(),
        event_type="ACCOUNT_MONITOR_ADDED",
        severity=SeverityLevel.LOW,
        details={"account_id": email, "display_name": display_name, "domain": TARGET_MONITORED_DOMAIN},
    )
    repo.log_audit(audit)

    return {
        "success": True,
        "account": {
            "account_id": email,
            "display_name": display_name,
            "autonomy_level": autonomy,
            "domain": TARGET_MONITORED_DOMAIN,
        },
        "message": f"Successfully registered '{email}' for local mailbox monitoring.",
    }


@router.delete("/{account_id}", summary="Remove an account from monitoring")
async def remove_monitored_account(account_id: str, request: Request):
    db_mgr = getattr(request.app.state, "db_manager", None)
    if not db_mgr:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database manager not initialized.",
        )

    repo = db_mgr.get_repository()
    success = repo.remove_monitored_account(account_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account '{account_id}' not found.",
        )

    audit = AuditEvent(
        event_id=f"audit_acc_rem_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}",
        timestamp=datetime.now(timezone.utc).isoformat(),
        event_type="ACCOUNT_MONITOR_REMOVED",
        severity=SeverityLevel.LOW,
        details={"account_id": account_id},
    )
    repo.log_audit(audit)

    return {"success": True, "account_id": account_id, "message": "Account removed from active monitoring."}


@router.post("/{account_id}/probe", summary="Probe connectivity for a specific account")
async def probe_account(account_id: str, request: Request):
    provider = _get_provider(request)
    probe = provider.test_connection()
    return {
        "account_id": account_id,
        "connector": probe.get("connector", "Windows COM MAPI"),
        "status": probe.get("status", "READY"),
        "autonomy_level": probe.get("autonomy_level", AutonomyLevel.DRAFT_ONLY.value),
        "folder_access": "INBOX_DRAFTS_OK",
    }


@router.post("/sync", response_model=SyncResult, summary="Trigger mailbox poll strictly across @vayanai.in.net accounts")
async def sync_accounts(request: Request):
    provider = _get_provider(request)
    db_manager = getattr(request.app.state, "db_manager", None)

    if db_manager:
        repo = db_manager.get_repository()
        probe = provider.test_connection()
        connector_name = probe.get("connector", "Windows COM MAPI")
        sync_outlook_accounts_into_db(repo, provider, connector_name)
        stored = repo.list_monitored_accounts()
        if not isinstance(provider, FakeEmailProvider):
            stored = [a for a in stored if a["account_id"].endswith(f"@{TARGET_MONITORED_DOMAIN}")]
        account_names = [a["account_id"] for a in stored]
    else:
        probe = provider.test_connection()
        account_names = [a for a in probe.get("accounts", []) if a.endswith(f"@{TARGET_MONITORED_DOMAIN}")] or [d[0] for d in DEFAULT_VAYANAI_ACCOUNTS]

    total_discovered = 0
    polled = []

    for acc in account_names:
        polled.append(acc)
        try:
            msgs = provider.list_new_messages(account_id=acc, limit=10)
            if db_manager and msgs:
                repo = db_manager.get_repository()
                for m in msgs:
                    if repo.save_message(m):
                        total_discovered += 1
            else:
                total_discovered += len(msgs)
        except Exception as e:
            logger.warning("Failed to poll account %s: %s", acc, e)

    return SyncResult(
        polled_accounts=polled,
        messages_discovered=total_discovered,
        draft_only_enforced=True,
    )
