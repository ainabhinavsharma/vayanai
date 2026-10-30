#!/usr/bin/env python3
"""
Verification test suite for Python CGI hardening & parity (Milestone M2).
Executes cpanel_deploy/cgi-bin/app.cgi under genuine CGI process environments.
"""

import os
import sys
import json
import subprocess
import sqlite3

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CGI_PATH = os.path.join(ROOT_DIR, "cpanel_deploy", "cgi-bin", "app.cgi")
ROOT_CGI_PATH = os.path.join(ROOT_DIR, "cgi-bin", "app.cgi")

def run_cgi(env_overrides=None, stdin_data=b""):
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    if env_overrides:
        env.update(env_overrides)

    p = subprocess.Popen(
        [sys.executable, CGI_PATH],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=ROOT_DIR,
        env=env
    )
    stdout, stderr = p.communicate(input=stdin_data)
    
    # Parse CGI response
    headers = {}
    body = b""
    status = 200
    
    lines = stdout.split(b"\r\n\r\n", 1)
    if len(lines) == 1:
        lines = stdout.split(b"\n\n", 1)
    
    if len(lines) == 2:
        header_text = lines[0].decode("utf-8", errors="ignore")
        body = lines[1]
        for hline in header_text.splitlines():
            if ":" in hline:
                k, v = hline.split(":", 1)
                headers[k.strip().lower()] = v.strip()
            elif hline.startswith("Status:"):
                try:
                    status = int(hline.split()[1])
                except Exception:
                    pass
    else:
        body = stdout

    if "status" in headers:
        try:
            status = int(headers["status"].split()[0])
        except Exception:
            pass

    return status, headers, body, stderr.decode("utf-8", errors="ignore")


def test_1_scrub_credentials():
    print("[TEST 1] Verifying no hardcoded passwords in CONFIG or CGI files...")
    for path in (CGI_PATH, ROOT_CGI_PATH):
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        assert "Gannu@12223" not in content, f"Hardcoded password found in {path}"
        assert 'CONFIG = {' in content
        assert 'os.environ.get("SMTP_PASS"' in content
        assert 'os.environ.get("ADMIN_DEFAULT_PASSWORD"' in content
    print("  -> Passed: No plaintext secrets in app.cgi or mirror.")


def test_2_wal_mode():
    print("[TEST 2] Verifying WAL mode and busy_timeout pragmas in app.cgi...")
    with open(CGI_PATH, "r", encoding="utf-8") as f:
        content = f.read()
    assert "PRAGMA journal_mode = WAL" in content
    assert "PRAGMA busy_timeout = 10000" in content
    print("  -> Passed: WAL mode and 10000ms busy timeout present.")


def test_3_path_traversal():
    print("[TEST 3] Verifying arbitrary file read / path traversal protection...")
    # Attempt to read package.json via path traversal
    status, headers, body, _ = run_cgi({
        "REQUEST_METHOD": "GET",
        "REQUEST_URI": "/_next/../package.json",
        "PATH_INFO": "/_next/../package.json"
    })
    # Should not serve package.json
    assert b"\"name\": \"vayanai\"" not in body
    assert status in (403, 404)

    # Attempt to read fonts with traversal
    status, headers, body, _ = run_cgi({
        "REQUEST_METHOD": "GET",
        "REQUEST_URI": "/fonts/../../package.json",
        "PATH_INFO": "/fonts/../../package.json"
    })
    assert b"\"name\": \"vayanai\"" not in body
    print("  -> Passed: Path traversal blocked successfully.")


def test_4_idor_intern_me():
    print("[TEST 4] Verifying IDOR protection in /api/v1/intern/me...")
    # Unauthenticated request
    status, headers, body, _ = run_cgi({
        "REQUEST_METHOD": "GET",
        "REQUEST_URI": "/api/v1/intern/me?email=sneha.selected@example.com",
        "PATH_INFO": "/api/v1/intern/me",
        "QUERY_STRING": "email=sneha.selected@example.com"
    })
    assert status == 401, f"Expected 401, got {status}"
    resp = json.loads(body.decode("utf-8"))
    assert resp["success"] is False
    print("  -> Passed: Unauthenticated IDOR query rejected with 401.")


def test_5_certificate_routes_order():
    print("[TEST 5] Verifying certificate routes: apply and issue not intercepted by certificates/<cert_id>...")
    
    # 5a: /api/v1/certificates/apply (POST) with empty body should return 400 validation error, NOT 404 "Certificate not found"
    status, headers, body, _ = run_cgi({
        "REQUEST_METHOD": "POST",
        "REQUEST_URI": "/api/v1/certificates/apply",
        "PATH_INFO": "/api/v1/certificates/apply",
        "CONTENT_LENGTH": "2",
        "CONTENT_TYPE": "application/json"
    }, stdin_data=b"{}")
    assert status == 400, f"Expected 400 for empty apply, got {status}"
    resp = json.loads(body.decode("utf-8"))
    assert "required fields" in resp.get("error", "").lower(), f"Unexpected error: {resp}"
    print("  -> Passed: /certificates/apply routed correctly to POST apply handler.")

    # 5b: /api/v1/certificates/issue (POST) with empty body should check auth -> 401 or 400, NOT 404
    status, headers, body, _ = run_cgi({
        "REQUEST_METHOD": "POST",
        "REQUEST_URI": "/api/v1/certificates/issue",
        "PATH_INFO": "/api/v1/certificates/issue",
        "CONTENT_LENGTH": "2",
        "CONTENT_TYPE": "application/json"
    }, stdin_data=b"{}")
    assert status == 401, f"Expected 401 for unauthenticated issue, got {status}"
    print("  -> Passed: /certificates/issue correctly protected with auth.")

    # 5c: /api/v1/certificates/CERT-VAY-2026-SO-001 (GET) should route to cert lookup
    status, headers, body, _ = run_cgi({
        "REQUEST_METHOD": "GET",
        "REQUEST_URI": "/api/v1/certificates/CERT-VAY-2026-SO-001",
        "PATH_INFO": "/api/v1/certificates/CERT-VAY-2026-SO-001"
    })
    assert status == 200, f"Expected 200 for CERT-VAY-2026-SO-001, got {status}"
    resp = json.loads(body.decode("utf-8"))
    assert resp["success"] is True
    assert "certificate" in resp["data"]
    assert "qrDataUrl" in resp["data"]
    print("  -> Passed: /certificates/<cert_id> correctly returns certificate data with qrDataUrl.")


def test_6_cron_secret_and_admin_guards():
    print("[TEST 6] Verifying admin guards and X-Cron-Secret authorization...")
    
    # 6a: /api/v1/portal/admin/interns/dispatch without auth -> 401
    status, headers, body, _ = run_cgi({
        "REQUEST_METHOD": "POST",
        "REQUEST_URI": "/api/v1/portal/admin/interns/dispatch",
        "PATH_INFO": "/api/v1/portal/admin/interns/dispatch",
        "CONTENT_LENGTH": "2",
        "CONTENT_TYPE": "application/json"
    }, stdin_data=b"{}")
    assert status == 401, f"Expected 401 without auth, got {status}"

    # 6b: /api/v1/portal/admin/interns/dispatch with valid X-Cron-Secret
    cron_secret = "test-cron-secret-12345"
    payload = json.dumps({"action": "bulk_approve_and_offer"}).encode("utf-8")
    status, headers, body, _ = run_cgi({
        "REQUEST_METHOD": "POST",
        "REQUEST_URI": "/api/v1/portal/admin/interns/dispatch",
        "PATH_INFO": "/api/v1/portal/admin/interns/dispatch",
        "HTTP_X_CRON_SECRET": cron_secret,
        "CRON_SECRET": cron_secret,
        "CONTENT_LENGTH": str(len(payload)),
        "CONTENT_TYPE": "application/json"
    }, stdin_data=payload)
    assert status == 200, f"Expected 200 with cron secret, got {status}"
    resp = json.loads(body.decode("utf-8"))
    assert resp["success"] is True
    assert "Bulk approved" in resp["data"]["message"]
    print("  -> Passed: X-Cron-Secret authorized and bulk_approve_and_offer executed.")


def test_7_error_sanitization():
    print("[TEST 7] Verifying error response sanitization (no stack trace leak)...")
    # Dispatch with invalid action
    cron_secret = "test-cron-secret-12345"
    payload = json.dumps({"action": "invalid_unknown_action"}).encode("utf-8")
    status, headers, body, _ = run_cgi({
        "REQUEST_METHOD": "POST",
        "REQUEST_URI": "/api/v1/portal/admin/interns/dispatch",
        "PATH_INFO": "/api/v1/portal/admin/interns/dispatch",
        "HTTP_X_CRON_SECRET": cron_secret,
        "CRON_SECRET": cron_secret,
        "CONTENT_LENGTH": str(len(payload)),
        "CONTENT_TYPE": "application/json"
    }, stdin_data=payload)
    assert status == 400
    assert b"Traceback" not in body

    # Test top-level gateway error in app.cgi code inspection
    with open(CGI_PATH, "r", encoding="utf-8") as f:
        content = f.read()
    assert "<h1>Gateway Error</h1>" not in content, "Raw gateway error template leaked in app.cgi"
    assert 'output_json({"error": "Internal server error"}, 500)' in content
    print("  -> Passed: No Python tracebacks or raw gateway errors exposed.")


def test_8_cookie_security_attributes():
    print("[TEST 8] Verifying cookie security attributes (HttpOnly; SameSite=Strict; Secure)...")
    with open(CGI_PATH, "r", encoding="utf-8") as f:
        content = f.read()
    assert "HttpOnly; SameSite=Strict; Secure" in content
    print("  -> Passed: Secure cookie attributes verified.")


def main():
    print("=" * 65)
    print(" RUNNING PYTHON CGI HARDENING & PARITY VERIFICATION SUITE")
    print("=" * 65)
    test_1_scrub_credentials()
    test_2_wal_mode()
    test_3_path_traversal()
    test_4_idor_intern_me()
    test_5_certificate_routes_order()
    test_6_cron_secret_and_admin_guards()
    test_7_error_sanitization()
    test_8_cookie_security_attributes()
    print("=" * 65)
    print(" ALL 8 CGI HARDENING & PARITY TESTS PASSED SUCCESSFULLY!")
    print("=" * 65)


if __name__ == "__main__":
    main()
