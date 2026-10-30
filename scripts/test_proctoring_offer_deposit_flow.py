import requests
import json
import time

BASE_URL = "http://localhost:3000"

def run_tests():
    print("==================================================")
    print("TESTING FULL PROCTORING, REVIEW & DEPOSIT FLOW")
    print("==================================================")
    session = requests.Session()

    # 1. Sign in as Admin
    print("\n--- 1. ADMIN AUTHENTICATION ---")
    res = session.post(f"{BASE_URL}/api/v1/auth/signin", json={
        "email": "admin@vayanai.in",
        "password": "AdminPass123!"
    })
    assert res.status_code == 200, f"Admin signin failed: {res.text}"
    admin_data = res.json()
    assert admin_data.get("success") is True
    print("[OK] Admin successfully signed in")

    # 2. Check Candidate Maya Kulkarni in interview_completed stage
    print("\n--- 2. INSPECT INTERVIEW_COMPLETED CANDIDATE ---")
    res = session.get(f"{BASE_URL}/api/v1/portal/admin/interns?status=interview_completed")
    assert res.status_code == 200
    candidates = res.json().get("data", {}).get("candidates", [])
    maya = next((c for c in candidates if c.get("userEmail") == "maya.interviewed@example.com"), None)
    
    # If maya already approved from previous partial run, find or reset
    if not maya:
        all_res = session.get(f"{BASE_URL}/api/v1/portal/admin/interns")
        all_cands = all_res.json().get("data", {}).get("candidates", [])
        maya = next((c for c in all_cands if c.get("userEmail") == "maya.interviewed@example.com"), None)

    assert maya is not None, "Maya Kulkarni not found"
    print(f"[OK] Candidate Maya Kulkarni found: Status={maya['status']}, Score={maya.get('interviewScore')}")

    # 3. Admin Approves Maya's Assessment & Dispatches Offer (if not already selected)
    print("\n--- 3. ADMIN APPROVES SELECTION & SENDS OFFER ---")
    if maya.get("status") == "interview_completed":
        res = session.post(f"{BASE_URL}/api/v1/portal/admin/interns/approve-assessment", json={
            "applicationId": maya["id"],
            "action": "approve"
        })
        assert res.status_code == 200, f"Approve assessment failed: {res.text}"
        approve_data = res.json()
        assert approve_data.get("success") is True
        app_updated = approve_data.get("data", {}).get("application", {})
        assert app_updated.get("status") == "selected"
        offer_letter_id = approve_data.get("data", {}).get("offerLetterId")
        assert offer_letter_id is not None
        print(f"[OK] Maya Kulkarni approved! Status={app_updated['status']}, OfferID={offer_letter_id}")
    else:
        print(f"[OK] Maya already selected! Status={maya['status']}")

    # 4. Sign in as Maya Kulkarni to check candidate portal & offer
    print("\n--- 4. CANDIDATE SIGNS IN & REVIEWS OFFER ---")
    maya_session = requests.Session()
    res = maya_session.post(f"{BASE_URL}/api/v1/auth/signin", json={
        "email": "maya.interviewed@example.com",
        "password": "InternPass123!"
    })
    assert res.status_code == 200, f"Maya signin failed: {res.text}"
    print("[OK] Maya signed in to Candidate Portal")

    # Fetch Maya's application via /api/v1/intern/me
    res = maya_session.get(f"{BASE_URL}/api/v1/intern/me")
    assert res.status_code == 200
    me_app = res.json().get("data", {}).get("application", {})
    token = me_app.get("magicToken")
    print(f"[OK] Candidate Portal reflects status={me_app.get('status')}, MagicToken={token}")

    # 5. Access Offer Letter via token
    print("\n--- 5. ACCESS & DIGITALLY SIGN OFFER LETTER ---")
    res = maya_session.get(f"{BASE_URL}/api/v1/intern/offer?token={token}")
    assert res.status_code == 200
    offer_data = res.json().get("data", {}).get("candidate", {})
    assert offer_data.get("name") == "Maya Kulkarni"
    print(f"[OK] Offer Letter loaded: Candidate={offer_data['name']}, OfferRef={offer_data['offerLetterId']}")

    # Step 1: Sign digitally
    res = maya_session.post(f"{BASE_URL}/api/v1/intern/offer", json={
        "token": token,
        "action": "accept_signature",
        "signatureName": "Maya Kulkarni"
    })
    assert res.status_code == 200
    print("[OK] Offer digitally signed by Maya Kulkarni")

    # 6. Step 2: Submit INR 499 Refundable Security Deposit Proof (UTR)
    print("\n--- 6. SUBMIT INR 499 REFUNDABLE SECURITY DEPOSIT PROOF ---")
    utr_test = f"UPI-499-{int(time.time())}"
    res = maya_session.post(f"{BASE_URL}/api/v1/intern/offer", json={
        "token": token,
        "action": "pay_deposit",
        "paymentMethod": "upi_qr",
        "utrNumber": utr_test
    })
    assert res.status_code == 200
    deposit_resp = res.json()
    assert deposit_resp.get("success") is True
    updated_app = deposit_resp.get("data", {}).get("application", {})
    assert updated_app.get("status") == "deposit_pending_verification"
    print(f"[OK] INR 499 Deposit proof submitted: UTR={utr_test}, Status={updated_app['status']}")

    # 7. Admin Verifies INR 499 Deposit & Admits Candidate
    print("\n--- 7. ADMIN VERIFIES INR 499 DEPOSIT & ENROLLS CANDIDATE ---")
    res = session.post(f"{BASE_URL}/api/v1/portal/admin/interns/verify-deposit", json={
        "candidateId": maya["id"],
        "action": "approve"
    })
    assert res.status_code == 200, f"Verify deposit failed: {res.text}"
    print(f"[OK] Admin approved deposit for {maya['userEmail']}! Seat unlocked.")

    # 8. Verify Maya is now fully enrolled and active
    print("\n--- 8. VERIFY ENROLLED STATUS & WORKSPACE ACTIVATION ---")
    res = maya_session.get(f"{BASE_URL}/api/v1/intern/me")
    assert res.status_code == 200
    final_app = res.json().get("data", {}).get("application", {})
    assert final_app.get("status") == "enrolled"
    print(f"[OK] Final verification: Status={final_app['status']}, Workspace & PDF Download UNLOCKED!")

    print("\n==================================================")
    print("ALL 8 VERIFICATION GATES PASSED PERFECTLY [OK]")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
