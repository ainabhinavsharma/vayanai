import requests
import json

BASE_URL = "http://localhost:3000"

def test_applicant_submission():
    print("Testing Vikram Applicant Interview Submission with Anti-Cheat Telemetry...")
    session = requests.Session()

    # 1. Sign in as Vikram (applied stage)
    res = session.post(f"{BASE_URL}/api/v1/auth/signin", json={
        "email": "vikram.applicant@example.com",
        "password": "InternPass123!"
    })
    assert res.status_code == 200, f"Signin failed: {res.text}"
    print("[OK] Vikram signed in")

    # 2. Check current status
    res = session.get(f"{BASE_URL}/api/v1/intern/me")
    assert res.status_code == 200
    app = res.json()["data"]["application"]
    print(f"[OK] Candidate initial status is {app['status']}")
    magic_token = app.get("magicToken")
    assert magic_token, "Expected valid magicToken for applicant"

    # 3. Submit interview assessment with anti-cheat telemetry
    print(f"[...] Submitting assessment with magicToken={magic_token}...")
    submit_res = session.post(
        f"{BASE_URL}/api/v1/intern/assessment?token={magic_token}",
        json={
            "token": magic_token,
            "answers": {
                "q-pacing-1": "pacing-opt-b",
                "q-partner-1": "partner-opt-a",
                "q-altitude-1": "altitude-opt-c",
                "q-community-1": "community-opt-b",
                "q-ops-1": "ops-opt-a"
            },
            "telemetry": {
                "tabSwitchCount": 2,
                "copyPasteAttempts": 1,
                "fullscreenExits": 0,
                "totalDurationSeconds": 240,
                "webcamVerified": True,
                "integrityScore": "FLAGGED_MODERATE",
                "flags": ["2 tab switch(es) detected", "1 clipboard copy/paste attempt(s) blocked"]
            }
        }
    )
    assert submit_res.status_code == 200, f"Submission failed: {submit_res.text}"
    print("[OK] Assessment submitted successfully")

    # 4. Verify candidate status is interview_completed (NOT selected!)
    res = session.get(f"{BASE_URL}/api/v1/intern/me")
    assert res.status_code == 200
    app = res.json()["data"]["application"]
    assert app["status"] == "interview_completed", f"Expected interview_completed, got {app['status']}"
    assert app["interviewScore"] is not None, f"Expected numeric score, got {app.get('interviewScore')}"
    tel = app.get("proctoringTelemetry", {})
    assert tel.get("tabSwitchCount") == 2, f"Expected 2 tab switches, got {tel.get('tabSwitchCount')}"
    assert tel.get("copyPasteAttempts") == 1, f"Expected 1 copy attempt, got {tel.get('copyPasteAttempts')}"
    print(f"[OK] Verification complete: Candidate status={app['status']}")
    print(f"     Score={app['interviewScore']}, TabSwitches={tel.get('tabSwitchCount')}, Integrity={tel.get('integrityScore')}")
    print("\nALL APPLICANT SUBMISSION CHECKS PASSED [OK]")

if __name__ == "__main__":
    test_applicant_submission()
