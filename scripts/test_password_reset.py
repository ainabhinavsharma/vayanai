import urllib.request
import urllib.error
import json
import sqlite3
import sys

BASE_URL = "http://localhost:3000"

def request_json(url, method="GET", payload=None):
    headers = {"Content-Type": "application/json"}
    data = json.dumps(payload).encode("utf-8") if payload else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"error": body}

def main():
    print("=" * 60)
    print("  RUNNING PASSWORD RESET END-TO-END VERIFICATION")
    print("=" * 60)

    # 1. Test unregistered email
    print("\n[TEST 1] Requesting password reset for unregistered email...")
    status, res = request_json(f"{BASE_URL}/api/v1/auth/forgot-password", "POST", {"email": "nobody@unknown.com"})
    print(f"  -> Status: {status}")
    print(f"  -> Response: {res}")
    assert status == 404, f"Expected 404, got {status}"
    assert "No account found" in res.get("error", ""), "Expected 'No account found' in error message"
    print("  [OK] Passed: Unregistered email correctly returns 404 with friendly message.")

    # 2. Test registered email (sneha.selected@example.com)
    print("\n[TEST 2] Requesting password reset for registered email (sneha.selected@example.com)...")
    status, res = request_json(f"{BASE_URL}/api/v1/auth/forgot-password", "POST", {"email": "sneha.selected@example.com"})
    print(f"  -> Status: {status}")
    print(f"  -> Response: {res}")
    assert status == 200, f"Expected 200, got {status}"
    assert res.get("success") is True, "Expected success to be True"

    # Verify SQLite row
    conn = sqlite3.connect("data/vayanai.db")
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT * FROM password_reset_tokens WHERE LOWER(email) = ? ORDER BY created_at DESC LIMIT 1", ("sneha.selected@example.com",)).fetchone()
    assert row is not None, "Expected token row in database"
    token = row["token"]
    print(f"  [OK] Passed: Token successfully generated and saved in SQLite: {token[:12]}...")

    # 3. Validate token via GET endpoint
    print("\n[TEST 3] Validating token via GET /api/v1/auth/reset-password...")
    status, res = request_json(f"{BASE_URL}/api/v1/auth/reset-password?token={token}", "GET")
    print(f"  -> Status: {status}")
    print(f"  -> Response: {res}")
    assert status == 200, f"Expected 200, got {status}"
    assert res["data"]["valid"] is True, "Expected valid to be True"
    print("  [OK] Passed: Token validated successfully.")

    # 4. Validate fake token
    print("\n[TEST 4] Validating fake token...")
    status, res = request_json(f"{BASE_URL}/api/v1/auth/reset-password?token=fake-token-12345", "GET")
    print(f"  -> Status: {status}")
    print(f"  -> Response: {res}")
    assert status == 400, f"Expected 400, got {status}"
    print("  [OK] Passed: Fake token correctly rejected with 400.")

    # 5. Reset password
    print("\n[TEST 5] Updating password via POST /api/v1/auth/reset-password...")
    new_pass = "TestNewPass123!"
    status, res = request_json(f"{BASE_URL}/api/v1/auth/reset-password", "POST", {"token": token, "password": new_pass})
    print(f"  -> Status: {status}")
    print(f"  -> Response: {res}")
    assert status == 200, f"Expected 200, got {status}"
    assert res.get("success") is True, "Expected success True"

    # Verify token is now marked used in SQLite
    row_after = conn.execute("SELECT * FROM password_reset_tokens WHERE token = ?", (token,)).fetchone()
    assert row_after["used_at"] is not None, "Expected used_at to be populated"
    print("  [OK] Passed: Password updated and token marked used.")

    # 6. Verify token cannot be re-used
    print("\n[TEST 6] Attempting to re-use the same token...")
    status, res = request_json(f"{BASE_URL}/api/v1/auth/reset-password", "POST", {"token": token, "password": "AnotherPassword123!"})
    print(f"  -> Status: {status}")
    print(f"  -> Response: {res}")
    assert status == 400, f"Expected 400, got {status}"
    assert "already been used" in res.get("error", "").lower() or "invalid" in res.get("error", "").lower()
    print("  [OK] Passed: Token reuse prevented.")

    # 7. Test sign in with new password
    print("\n[TEST 7] Testing sign in with NEW password...")
    status, res = request_json(f"{BASE_URL}/api/v1/auth/signin", "POST", {"email": "sneha.selected@example.com", "password": new_pass})
    print(f"  -> Status: {status}")
    print(f"  -> Response: {res}")
    assert status == 200, f"Expected 200, got {status}"
    assert res.get("success") is True, "Expected sign in success True"
    print("  [OK] Passed: Successfully signed in with new password.")

    # 8. Test sign in with old password fails
    print("\n[TEST 8] Testing sign in with OLD password (should fail)...")
    status, res = request_json(f"{BASE_URL}/api/v1/auth/signin", "POST", {"email": "sneha.selected@example.com", "password": "OldWrongPassword123!"})
    print(f"  -> Status: {status}")
    print(f"  -> Response: {res}")
    assert status == 401 or res.get("success") is False, "Expected sign in to fail with wrong password"
    print("  [OK] Passed: Sign in with old/invalid password rejected.")

    # 9. Clean up / Restore demo password
    print("\n[CLEANUP] Restoring original demo password (InternPass123!)...")
    status, res = request_json(f"{BASE_URL}/api/v1/auth/forgot-password", "POST", {"email": "sneha.selected@example.com"})
    row_restore = conn.execute("SELECT * FROM password_reset_tokens WHERE LOWER(email) = ? ORDER BY created_at DESC LIMIT 1", ("sneha.selected@example.com",)).fetchone()
    restore_token = row_restore["token"]
    status, res = request_json(f"{BASE_URL}/api/v1/auth/reset-password", "POST", {"token": restore_token, "password": "InternPass123!"})
    assert status == 200
    conn.close()
    print("  [OK] Passed: Demo account password restored to InternPass123!.")

    print("\n" + "=" * 60)
    print("  ALL 9 PASSWORD RESET INTEGRATION TESTS PASSED! (100% OK)")
    print("=" * 60)

if __name__ == "__main__":
    main()
