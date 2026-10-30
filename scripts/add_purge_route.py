route_code = '''        # PORTAL: PURGE DEMO & RETAIN GOOGLE FORM ONLY
        if api_sub == "portal/admin/interns/purge-demo" and method == "POST":
            if not check_admin_or_cron():
                output_json({"success": False, "error": "Unauthorized: Invalid or missing cron secret or admin session credentials."}, 401)
                return

            sheet_url = normalize_google_sheet_csv_url(body_json.get("sheetUrl"))
            req = urllib.request.Request(sheet_url, headers={"User-Agent": "Mozilla/5.0 VayanaiCleaner/1.0"})
            try:
                with urllib.request.urlopen(req, timeout=20) as resp:
                    csv_text = resp.read().decode("utf-8", errors="ignore")

                reader = list(csv.DictReader(io.StringIO(csv_text)))
                sheet_candidates = {}
                for r in reader:
                    em = (r.get("Email Address") or r.get("email") or "").strip().lower()
                    nm = (r.get("Name") or r.get("Full Name") or r.get("name") or "").strip()
                    if not em or not nm:
                        continue
                    sheet_candidates[em] = {
                        "name": nm,
                        "email": em,
                        "track": (r.get("Select Internship") or r.get("Track") or "Sustainable Regional Operations & Growth").strip(),
                        "college": (r.get("College Name") or r.get("College") or "Verified University").strip(),
                        "phone": (r.get("WhatsApp number ") or r.get("WhatsApp number") or r.get("Phone") or "").strip(),
                        "cv_url": (r.get("Please Upload Your CV") or r.get("CV") or r.get("Resume") or "").strip(),
                        "applied_at": r.get("Timestamp") or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                    }

                valid_emails = list(sheet_candidates.keys())
                conn = get_db()
                try:
                    conn.execute("PRAGMA foreign_keys = OFF;")
                    placeholders = ",".join(["?"] * len(valid_emails))
                    
                    # Delete demo applications
                    del_apps = conn.execute(f"DELETE FROM intern_applications WHERE LOWER(user_email) NOT IN ({placeholders})", valid_emails).rowcount
                    # Delete demo intern users
                    del_users = conn.execute(f"DELETE FROM users WHERE role = 'intern' AND LOWER(email) NOT IN ({placeholders})", valid_emails).rowcount
                    # Delete demo certificates
                    del_certs = conn.execute(f"DELETE FROM certificates WHERE LOWER(intern_email) NOT IN ({placeholders})", valid_emails).rowcount
                    # Delete demo payments
                    del_pmts = conn.execute(f"DELETE FROM payments WHERE LOWER(user_email) NOT IN ({placeholders})", valid_emails).rowcount
                    # Delete orphaned sessions
                    conn.execute("DELETE FROM sessions WHERE user_id NOT IN (SELECT id FROM users)")

                    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                    inserted_new = 0
                    for em, cand in sheet_candidates.items():
                        u_row = conn.execute("SELECT id FROM users WHERE LOWER(email) = ?", (em,)).fetchone()
                        if not u_row:
                            uid = f"usr-{int(time.time()*1000)}-{secrets.token_hex(3)}"
                            conn.execute("INSERT INTO users (id, email, password_hash, salt, name, role, phone, verification_status, created_at, updated_at) VALUES (?, ?, 'N/A', 'N/A', ?, 'intern', ?, 'pending', ?, ?)",
                                         (uid, em, cand["name"], cand["phone"] or None, now_iso, now_iso))
                        else:
                            uid = u_row[0]

                        app_row = conn.execute("SELECT id FROM intern_applications WHERE LOWER(user_email) = ?", (em,)).fetchone()
                        if not app_row:
                            cid = f"app-{int(time.time()*1000)}-{secrets.token_hex(3)}"
                            mtok = secrets.token_hex(24)
                            conn.execute("""
                                INSERT INTO intern_applications (
                                    id, user_id, user_name, user_email, phone, college_name, track_name,
                                    cv_url, status, magic_token, batch_start_date, applied_at, updated_at
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'applied', ?, '2026-11-02', ?, ?)
                            """, (cid, uid, cand["name"], em, cand["phone"] or None, cand["college"], cand["track"], cand["cv_url"] or None, mtok, cand["applied_at"], now_iso))
                            inserted_new += 1

                    conn.commit()
                    cursor = conn.cursor()
                    cursor.execute("SELECT COUNT(*) FROM intern_applications")
                    total_apps = cursor.fetchone()[0]
                    cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'intern'")
                    total_intern_users = cursor.fetchone()[0]
                    cursor.execute("PRAGMA wal_checkpoint(TRUNCATE);")
                    conn.commit()

                    output_json({
                        "success": True,
                        "data": {
                            "message": f"Purged {del_apps} demo applications and {del_users} demo accounts. Database now contains strictly {total_apps} genuine Google Form applicants.",
                            "deletedApplications": del_apps,
                            "deletedInternUsers": del_users,
                            "deletedCertificates": del_certs,
                            "deletedPayments": del_pmts,
                            "totalGoogleFormApplicants": total_apps,
                            "totalInternUsers": total_intern_users
                        }
                    })
                    return
                finally:
                    conn.close()

            except Exception as e:
                output_json({"success": False, "error": f"Purge error: {str(e)}"}, 500)
                return

'''

for filepath in ['cpanel_deploy/cgi-bin/app.cgi', 'cgi-bin/app.cgi']:
    with open(filepath, 'r', encoding='utf-8') as f:
        s = f.read()

    target = '        # PORTAL: SYNC GOOGLE SHEET'
    if target in s and 'portal/admin/interns/purge-demo' not in s:
        s = s.replace(target, route_code + target, 1)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(s)
        print(f'ADDED_PURGE_ROUTE_TO_{filepath}')
    else:
        print(f'ROUTE_ALREADY_EXISTS_OR_TARGET_NOT_FOUND_{filepath}')
