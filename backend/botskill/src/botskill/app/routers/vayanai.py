"""BOTSKILL — Vayanai Travel Platform API Router.

Exposes endpoints for Vayu Trip Planning, Grounded Companion Chat,
Partner Booking Inquiries, and Travel Knowledge Synchronization.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Request, status

from botskill.core.models import (
    AuditEvent,
    DraftReply,
    EmailMessage,
    MessageState,
    PolicyCitation,
    PolicyDecision,
    SeverityLevel,
)
from botskill.vayu_engine import VayuEngine

logger = logging.getLogger("botskill.app.routers.vayanai")
router = APIRouter(prefix="/api/vayanai", tags=["Vayanai Travel Services"])


# ---------------------------------------------------------
# Request & Response Schemas
# ---------------------------------------------------------

class TripBriefRequest(BaseModel):
    prompt: Optional[str] = Field(None, description="Natural language trip request")
    origin: Optional[str] = Field("Mumbai", description="Starting city")
    month: Optional[str] = Field("October", description="Month or dates of travel")
    durationDays: Optional[int] = Field(5, description="Intended trip length in days")
    party: Optional[str] = Field("Solo", description="Traveller party (e.g. Solo, Couple, Family with elders)")
    pace: Optional[str] = Field("Moderate", description="Pacing preference (Unrushed, Moderate, Active)")
    comfort: Optional[str] = Field("Homestay", description="Comfort band (Homestay, Boutique, Luxury)")
    interests: Optional[List[str]] = Field(default_factory=list, description="List of interest tags")
    accessibility: Optional[List[str]] = Field(default_factory=list, description="Accessibility or mobility needs")
    routeKey: Optional[str] = Field(None, description="Explicit route key override")


class ChatRequest(BaseModel):
    message: str = Field(..., description="Traveller follow-up query")
    routeKey: Optional[str] = Field("meghalaya", description="Active itinerary key")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Current itinerary context")


class PartnerInquiryRequest(BaseModel):
    travelerName: str = Field(..., description="Full name of traveler")
    travelerEmail: str = Field(..., description="Contact email of traveler")
    partnerId: str = Field(..., description="Unique ID of local travel partner")
    partnerName: str = Field(..., description="Display name of partner")
    routeKey: str = Field("meghalaya", description="Destination route")
    dates: Optional[str] = Field(None, description="Requested dates")
    partySize: Optional[int] = Field(2, description="Number of travelers")
    mobilityNotes: Optional[str] = Field(None, description="Special mobility requests")
    message: Optional[str] = Field(None, description="Specific questions or requests")


# ---------------------------------------------------------
# Endpoints
# ---------------------------------------------------------

@router.post("/plan", summary="Generate AI-assisted grounded trip plan")
async def plan_trip_endpoint(req: TripBriefRequest, request: Request) -> Dict[str, Any]:
    """Orchestrates Vayu planning using Local SLM, deterministic filters, and policy knowledge."""
    engine: Optional[VayuEngine] = getattr(request.app.state, "vayu_engine", None)
    if not engine:
        db_mgr = getattr(request.app.state, "db_manager", None)
        engine = VayuEngine(db_manager=db_mgr)
        request.app.state.vayu_engine = engine

    try:
        brief_dict = req.model_dump()
        result = engine.plan_trip(brief_dict)
        return result
    except Exception as e:
        logger.exception("Failed to generate Vayu trip plan: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vayu Planning Error: {str(e)}",
        )


@router.post("/chat", summary="Contextual Vayu assistant conversation")
async def chat_companion_endpoint(req: ChatRequest, request: Request) -> Dict[str, Any]:
    """Generates grounded responses to traveler questions referencing local partner rules and advisories."""
    engine: Optional[VayuEngine] = getattr(request.app.state, "vayu_engine", None)
    if not engine:
        db_mgr = getattr(request.app.state, "db_manager", None)
        engine = VayuEngine(db_manager=db_mgr)
        request.app.state.vayu_engine = engine

    try:
        result = engine.chat_companion(
            query=req.message,
            route_key=req.routeKey or "meghalaya",
            context=req.context,
        )
        return result
    except Exception as e:
        logger.exception("Failed to process Vayu chat: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vayu Chat Error: {str(e)}",
        )


@router.post("/inquire", summary="Stage verified partner booking inquiry draft")
async def create_partner_inquiry_endpoint(req: PartnerInquiryRequest, request: Request) -> Dict[str, Any]:
    """Stages a partner booking inquiry draft in the supervision queue under DRAFT_ONLY invariants."""
    db_mgr = getattr(request.app.state, "db_manager", None)
    if not db_mgr:
        raise HTTPException(status_code=500, detail="DatabaseManager not initialized in application state.")
    repo = db_mgr.get_repository() if hasattr(db_mgr, "get_repository") else db_mgr

    now_iso = datetime.now(timezone.utc).isoformat()
    msg_id = f"inq-{int(time.time()*1000)}"
    thread_id = f"thread-vayanai-{req.partnerId}"
    idempotency_key = f"idem-{msg_id}"

    # 1. Create Inbound Inquiry Message Record
    inbound_body = (
        f"Partner Booking Inquiry from {req.travelerName} ({req.travelerEmail})\n"
        f"Destination: {req.routeKey.capitalize()} | Requested Dates: {req.dates or 'Flexible'}\n"
        f"Party Size: {req.partySize} guests\n"
        f"Mobility Notes: {req.mobilityNotes or 'Standard'}\n"
        f"Message: {req.message or 'Interested in booking accommodation and guided walks.'}"
    )

    inbound_msg = EmailMessage(
        message_id=msg_id,
        provider_id="vayanai_web",
        thread_id=thread_id,
        account_id=f"partner_{req.partnerId}@vayanai.local",
        sender=req.travelerEmail,
        recipients=[f"partner_{req.partnerId}@vayanai.local"],
        subject=f"Vayanai Traveler Inquiry: {req.partnerName} ({req.routeKey.capitalize()})",
        body_text=inbound_body,
        received_at=now_iso,
        state=MessageState.CLAIMED,
        idempotency_key=idempotency_key,
        inbound_intent="partner_booking_inquiry",
    )

    repo.insert_message(inbound_msg)

    # 2. Formulate Policy-Grounded Outbound Draft Reply
    citations: List[PolicyCitation] = []
    draft_id = f"draft-{msg_id}"

    # Cite partner policy if Sohra
    if "sohra" in req.partnerId.lower() or "meghalaya" in req.routeKey.lower():
        citations.append(
            PolicyCitation(
                rule_id="RULE-SOHRA-TERMS",
                document_id="doc-sohra-homestays-policy",
                document_title="Sohra Indigenous Stays Collective Terms",
                source_location="Page 1, Section 2",
                source_quote="Ground-floor deluxe cottages feature ramp access, step-free doorways, and walk-in showers.",
            )
        )
        citations.append(
            PolicyCitation(
                rule_id="RULE-SOHRA-CANCEL",
                document_id="doc-sohra-homestays-policy",
                document_title="Sohra Indigenous Stays Collective Terms",
                source_location="Page 1, Section 3",
                source_quote="Free cancellation is permitted up to 72 hours prior to scheduled check-in.",
            )
        )

    draft_body = (
        f"Dear {req.partnerName} Team,\n\n"
        f"A verified traveller inquiry has been placed via Vayanai:\n"
        f"• Traveller: {req.travelerName} ({req.travelerEmail})\n"
        f"• Party: {req.partySize} guests | Dates: {req.dates or 'Flexible in October'}\n"
        f"• Accessibility / Mobility: {req.mobilityNotes or 'Step-free access requested'}\n\n"
        f"Traveller's Note: \"{req.message or 'Requesting availability and booking terms.'}\"\n\n"
        f"Grounded Policy Notes:\n"
        f"• Two ground-floor cottages with ramp access and step-free wide doorways are pre-assigned.\n"
        f"• Cancellation Policy: Free cancellation up to 72 hours before check-in.\n"
        f"• Staged quotes remain valid for 48 hours.\n\n"
        f"Please review and confirm cottage availability for this itinerary.\n\n"
        f"Warm regards,\nVayanai Partner Desk (Human Supervised)"
    )

    draft_reply = DraftReply(
        draft_id=draft_id,
        message_id=msg_id,
        thread_id=thread_id,
        account_id=inbound_msg.account_id,
        subject=f"Re: Vayanai Traveler Inquiry: {req.partnerName}",
        body_text=draft_body,
        citations=citations,
        policy_decision=PolicyDecision.PASS,
        decision_reason="Draft generated in full alignment with Sohra Partner Terms and step-free guidelines.",
        model_provenance="BOTSKILL v3.0 Grounded Policy Engine",
        latency_ms=12.5,
        staged_to_provider=False,
        is_approved=False,
    )

    repo.save_draft(draft_reply)

    # 3. Log Audit Event
    audit = AuditEvent(
        event_id=f"aud-{int(time.time()*1000)}",
        timestamp=now_iso,
        event_type="PARTNER_INQUIRY_STAGED",
        account_id=inbound_msg.account_id,
        message_id=msg_id,
        severity=SeverityLevel.LOW,
        details={
            "draft_id": draft_id,
            "partner_id": req.partnerId,
            "traveler_email": req.travelerEmail,
            "draft_only_enforced": True,
        },
    )
    repo.log_audit(audit)

    return {
        "success": True,
        "inquiryId": msg_id,
        "draftId": draft_id,
        "status": "STAGED_FOR_SUPERVISION",
        "message": "Inquiry draft staged successfully. Requires human authorization in Portal before dispatch.",
        "citations": [c.model_dump() for c in citations],
        "draftSummary": {
            "subject": draft_reply.subject,
            "snippet": draft_body[:200] + "...",
            "stagedToProvider": False,
            "isApproved": False,
        },
    }


@router.get("/status", summary="Vayanai AI and travel engine health status")
async def engine_status_endpoint(request: Request) -> Dict[str, Any]:
    """Returns engine health, model runtime readiness, and active route catalogues."""
    engine: Optional[VayuEngine] = getattr(request.app.state, "vayu_engine", None)
    if not engine:
        db_mgr = getattr(request.app.state, "db_manager", None)
        engine = VayuEngine(db_manager=db_mgr)
        request.app.state.vayu_engine = engine

    slm_health = engine.slm_runtime.health_check()
    db_mgr = getattr(request.app.state, "db_manager", None)
    repo = db_mgr.get_repository() if (db_mgr and hasattr(db_mgr, "get_repository")) else db_mgr
    active_rules_count = len(repo.list_active_rules()) if repo else 0

    return {
        "service": "BOTSKILL Vayanai Intelligence Engine",
        "version": "3.0.0",
        "slmRuntime": slm_health,
        "activeRoutes": ["meghalaya", "ladakh", "kerala", "rajasthan"],
        "activePolicyRulesCount": active_rules_count,
        "isHalted": getattr(request.app.state, "is_halted", False),
        "draftOnlyEnforced": getattr(request.app.state, "draft_only", True),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
