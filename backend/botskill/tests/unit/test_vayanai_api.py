"""Integration tests for Vayanai API Endpoints (Planning, Chat, Partner Inquiries, Status)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from botskill.app.auth import SessionManager
from botskill.app.server import create_app
from botskill.storage.database import DatabaseManager


@pytest.fixture
def app_and_client(tmp_path):
    db_path = str(tmp_path / "vayanai_api_test.db")
    db_mgr = DatabaseManager(db_path)
    session_mgr = SessionManager()
    app = create_app(db_manager=db_mgr, session_manager=session_mgr)
    client = TestClient(app)
    return app, client, session_mgr, db_mgr


def test_vayanai_status_endpoint(app_and_client):
    """Verify /api/vayanai/status returns healthy runtime details."""
    _, client, _, _ = app_and_client
    res = client.get("/api/vayanai/status")
    assert res.status_code == 200
    data = res.json()
    assert data["service"] == "BOTSKILL Vayanai Intelligence Engine"
    assert "meghalaya" in data["activeRoutes"]
    assert data["draftOnlyEnforced"] is True


def test_vayanai_plan_endpoint(app_and_client):
    """Verify /api/vayanai/plan endpoint generates structured itinerary and citations."""
    _, client, session_mgr, _ = app_and_client
    payload = {
        "prompt": "5 days peaceful break in green hills for senior parents",
        "party": "Family with elders",
        "accessibility": ["step-free"],
        "interests": ["Nature", "Quiet"],
    }
    headers = {"X-CSRF-Token": session_mgr.csrf_token}
    res = client.post("/api/vayanai/plan", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "matched"
    assert data["selectedRouteKey"] == "meghalaya"
    assert len(data["rankedCandidates"]) > 0
    assert len(data["sourceProvenance"]["citations"]) > 0


def test_vayanai_chat_endpoint(app_and_client):
    """Verify /api/vayanai/chat endpoint returns grounded responses."""
    _, client, session_mgr, _ = app_and_client
    payload = {
        "message": "Can we arrange organic local food for lunch and dinner?",
        "routeKey": "meghalaya",
    }
    headers = {"X-CSRF-Token": session_mgr.csrf_token}
    res = client.post("/api/vayanai/chat", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["suggestedAction"] == "add_food_day"
    assert len(data["citations"]) > 0


def test_partner_inquiry_draft_staging_invariant(app_and_client):
    """Verify partner inquiry generates a draft in review queue under DRAFT_ONLY without live sending."""
    _, client, session_mgr, db_mgr = app_and_client
    payload = {
        "travelerName": "Aarav Sharma",
        "travelerEmail": "aarav.sharma@example.com",
        "partnerId": "partner-sohra",
        "partnerName": "Sohra Indigenous Stays Collective",
        "routeKey": "meghalaya",
        "dates": "Oct 15 - Oct 20",
        "partySize": 3,
        "mobilityNotes": "Need step-free ground floor cottage with vehicle access",
        "message": "Travelling with elderly mother, please confirm step-free cottage.",
    }
    headers = {"X-CSRF-Token": session_mgr.csrf_token}
    res = client.post("/api/vayanai/inquire", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["status"] == "STAGED_FOR_SUPERVISION"

    # Verify message is persisted in SQLite
    repo = db_mgr.get_repository()
    msg_id = data["inquiryId"]
    stored_msg = repo.get_message(msg_id)
    assert stored_msg is not None
    assert stored_msg.sender == "aarav.sharma@example.com"

    # Verify draft is in drafts repository
    draft_id = data["draftId"]
    stored_draft = repo.get_draft(draft_id)
    assert stored_draft is not None
    assert "Sohra Indigenous Stays Collective" in stored_draft.subject
    assert stored_draft.is_approved is False
    assert stored_draft.staged_to_provider is False
    assert len(stored_draft.citations) > 0

    # Verify audit event is logged
    with db_mgr.transaction() as cur:
        cur.execute("SELECT * FROM audit_events WHERE message_id = ?;", (msg_id,))
        row = cur.fetchone()
        assert row is not None
        assert row["event_type"] == "PARTNER_INQUIRY_STAGED"
