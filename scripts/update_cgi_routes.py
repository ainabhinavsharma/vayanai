import os

cgi_path = os.path.join(os.path.dirname(__file__), '..', 'cgi-bin', 'app.cgi')
with open(cgi_path, 'r', encoding='utf-8') as f:
    code = f.read()

target = '        # PORTAL: ADMIN CLEAR 3-MONTH COMPLETION'

new_handler = '''        # PORTAL: ADMIN APPROVE ASSESSMENT & SEND OFFER
        if api_sub == "portal/admin/interns/approve-assessment" and method == "POST":
            user = require_role(["admin", "staff"])
            if not user:
                return
            cand_id = body_json.get("applicationId") or body_json.get("id")
            action = body_json.get("action", "approve")
            if not cand_id:
                output_json({"success": False, "error": "applicationId is required"}, 400)
                return

            conn = get_db()
            app = conn.execute("SELECT * FROM intern_applications WHERE id = ?", (cand_id,)).fetchone()
            if not app:
                conn.close()
                output_json({"success": False, "error": "Application not found"}, 404)
                return

            now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            if action == "reject":
                reason = body_json.get("rejectionReason", "Assessment evaluated and rejected by Admissions Council.")
                conn.execute("UPDATE intern_applications SET status = 'rejected', feedback_note = ?, updated_at = ? WHERE id = ?",
                             (reason, now, cand_id))
                conn.commit()
                conn.close()
                output_json({"success": True, "message": "Assessment rejected."})
                return

            # Approve selection and generate offer
            import random
            track_code = "DA"
            t_lower = (app["track_name"] or "").lower()
            if "ai" in t_lower or "machine" in t_lower:
                track_code = "AI"
            elif "python" in t_lower:
                track_code = "PA"
            elif "stack" in t_lower:
                track_code = "FS"
            elif "operation" in t_lower or "growth" in t_lower:
                track_code = "OPS"

            offer_code = app["offer_letter_id"] or f"VY-2026-{track_code}-{random.randint(1000, 9999)}"
            conn.execute("""
                UPDATE intern_applications
                SET status = 'selected', offer_letter_id = ?, offer_sent_at = ?, updated_at = ?
                WHERE id = ?
            """, (offer_code, now, now, cand_id))
            conn.commit()

            base_url = CONFIG.get("NEXT_PUBLIC_APP_URL", "https://vayanai.in.net")
            offer_link = f"{base_url}/intern/offer?token={app['magic_token'] or cand_id}"
            subject = f"Congratulations! Offer Letter for Vayanai Internship ({app['track_name']})"
            html_msg = f"""
            <div style="font-family:sans-serif;background:#0d1410;color:#f4ede0;padding:24px;">
              <div style="max-width:600px;margin:0 auto;background:#131c16;padding:32px;border:1px solid #e8a34c;border-radius:12px;">
                <h2 style="color:#e8a34c;">Congratulations on your Selection!</h2>
                <p>Dear {app['user_name']},</p>
                <p>We are pleased to offer you an internship in the <strong>{app['track_name']}</strong> cohort starting Monday, 2 November 2026.</p>
                <p><strong>Offer Reference:</strong> {offer_code}</p>
                <div style="text-align:center;margin:24px 0;">
                  <a href="{offer_link}" style="background:#e8a34c;color:#0d1410;padding:12px 24px;border-radius:6px;font-weight:bold;text-decoration:none;">View & Sign Official Offer Letter &rarr;</a>
                </div>
              </div>
            </div>
            """
            send_smtp_email(app["user_email"], subject, html_msg)
            updated = conn.execute("SELECT * FROM intern_applications WHERE id = ?", (cand_id,)).fetchone()
            conn.close()

            output_json({
                "success": True,
                "message": f"Selection approved and offer {offer_code} dispatched to {app['user_email']}.",
                "data": {"application": dict(updated), "offerLetterId": offer_code}
            })
            return

        # PORTAL: ADMIN CLEAR 3-MONTH COMPLETION'''

code = code.replace(target, new_handler)

with open(cgi_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("[OK] cgi-bin/app.cgi updated with approve-assessment endpoint!")
