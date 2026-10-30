import re
import os

offer_file = os.path.join(os.path.dirname(__file__), '..', 'app', 'intern', 'offer', 'page.tsx')
with open(offer_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update handlePayDeposit
old_handle_pay = '''  const handlePayDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrInput.trim()) {
      showToast('Please enter your Student Roll Number or Enrollment ID.');
      return;
    }
    setProcessingPayment(true);
    try {
      const res = await fetch('/api/v1/intern/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'pay_deposit',
          paymentMethod: 'student_verification',
          utrNumber: utrInput.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setCandidate((prev) =>
          prev
            ? {
                ...prev,
                status: 'deposit_pending_verification',
                depositReceipt: data.data.payment?.receiptNumber || `VP-VER-2026-${Math.floor(1000 + Math.random() * 9000)}`,
                depositPaidAt: new Date().toISOString()
              }
            : null
        );
        showToast('⏳ Enrollment Verification Submitted! Admissions Council review is in progress.');
      } else {
        showToast(data.error?.message || 'Deposit verification failed.');
      }
    } catch (err: any) {
      showToast(`Payment error: ${err.message}`);
    } finally {
      setProcessingPayment(false);
    }
  };'''

new_handle_pay = '''  const handlePayDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrInput.trim() || utrInput.trim().length < 6) {
      showToast('Please enter your 12-digit UPI UTR Number or Transaction Reference.');
      return;
    }
    setProcessingPayment(true);
    try {
      const res = await fetch('/api/v1/intern/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'pay_deposit',
          paymentMethod: 'upi_qr',
          utrNumber: utrInput.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setCandidate((prev) =>
          prev
            ? {
                ...prev,
                status: 'deposit_pending_verification',
                depositReceipt: data.data.payment?.receiptNumber || `VP-VER-2026-${Math.floor(1000 + Math.random() * 9000)}`,
                depositPaidAt: new Date().toISOString()
              }
            : null
        );
        showToast('⏳ ₹499 Deposit Proof Submitted! Admissions Council verification in progress.');
      } else {
        showToast(data.error?.message || 'Deposit submission failed.');
      }
    } catch (err: any) {
      showToast(`Payment error: ${err.message}`);
    } finally {
      setProcessingPayment(false);
    }
  };'''

content = content.replace(old_handle_pay.replace('\r\n', '\n'), new_handle_pay)
content = content.replace(old_handle_pay, new_handle_pay)

# 2. Update Top Banner Download lock caption
content = content.replace(
    'title="Download unlocked after completing Step 1 Digital Acceptance"',
    'title="Download unlocked after ₹499 Refundable Security Deposit is verified by Admin"'
)
content = content.replace(
    'Requires Step 1 Digital Signature',
    'Requires Verified ₹499 Deposit'
)

# 3. Update Step 2 Card
old_step_2_start = '{/* Step 2: Student Verification & Batch Slot Confirmation */}'
old_step_2_end = '      </div>\n    </div>\n  );\n}'

new_step_2_jsx = '''{/* Step 2: Refundable Security Deposit & Batch Slot Confirmation */}
        <div style={{ background: '#131c16', border: isEnrolled ? '1px solid rgba(76, 175, 80, 0.5)' : isSigned ? '1px solid rgba(232, 163, 76, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ background: isEnrolled ? '#4caf50' : '#e8a34c', color: '#0d1410', fontWeight: 800, fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>
              STEP 2
            </span>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#fff8ee' }}>Refundable Security Deposit (₹499)</h3>
          </div>

          {isEnrolled ? (
            <div style={{ background: 'rgba(76, 175, 80, 0.1)', border: '1px solid rgba(76, 175, 80, 0.4)', borderRadius: '8px', padding: '16px', marginTop: '14px' }}>
              <div style={{ fontSize: '13px', color: '#4caf50', fontWeight: 700 }}>
                🎉 Cohort Slot Confirmed & ₹499 Deposit Verified!
              </div>
              <div style={{ fontSize: '11px', color: '#c9d6ce', marginTop: '6px', lineHeight: 1.6 }}>
                Verification ID: <code style={{ color: '#e8a34c' }}>{candidate.depositReceipt}</code><br />
                Security Deposit: <strong style={{ color: '#4caf50' }}>₹499 Verified (100% Refundable at Day 90)</strong><br />
                Institution: <strong>{candidate.college || 'Verified University'}</strong><br />
                Status: <strong style={{ color: '#4caf50' }}>Admitted & Ready for Monday 2 Nov 2026</strong>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed rgba(255,255,255,0.1)', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="button button-gold"
                  onClick={() => window.print()}
                  style={{ fontSize: '11px', minHeight: '34px', padding: '0 14px' }}
                >
                  📥 Download Official Signed PDF ↗
                </button>
                <Link
                  href="/portal"
                  style={{ display: 'inline-flex', alignItems: 'center', background: '#e8a34c', color: '#0d1410', fontWeight: 700, fontSize: '11px', padding: '8px 14px', borderRadius: '4px', textDecoration: 'none' }}
                >
                  💼 Open Intern Workspace &rarr;
                </Link>
                <a
                  href="https://chat.whatsapp.com"
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', background: '#25d366', color: '#0d1410', fontWeight: 700, fontSize: '11px', padding: '8px 14px', borderRadius: '4px', textDecoration: 'none' }}
                >
                  💬 Join Cohort WhatsApp Hub &rarr;
                </a>
              </div>
            </div>
          ) : isPendingVerification ? (
            <div style={{ background: 'rgba(232, 163, 76, 0.08)', border: '1px solid rgba(232, 163, 76, 0.4)', borderRadius: '8px', padding: '18px', marginTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>⏳</span>
                <div style={{ fontSize: '14px', color: '#e8a34c', fontWeight: 700 }}>
                  ₹499 Deposit Verification Underway
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#c9d6ce', lineHeight: 1.6, margin: '0 0 12px' }}>
                Your digitally signed offer letter and ₹499 security deposit proof have been submitted. The Admissions Council is verifying your transaction reference with bank settlement logs.
              </p>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '6px', fontSize: '11px', color: '#889990', marginBottom: '14px' }}>
                <div><strong>Deposit Reference:</strong> {candidate.depositReceipt || 'Queued'}</div>
                <div><strong>Official Signed PDF:</strong> Unlocks immediately upon Admin verification</div>
                <div><strong>Estimated Approval Window:</strong> Within 2 to 4 business hours</div>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Link
                  href="/portal"
                  className="button button-gold"
                  style={{ fontSize: '11px', minHeight: '34px', padding: '0 14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  Go to Candidate Portal &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePayDeposit} style={{ marginTop: '14px' }}>
              <p style={{ fontSize: '12px', color: '#c9d6ce', lineHeight: 1.5, margin: '0 0 14px' }}>
                To secure your seat and allocate mentor bandwidth for Batch 2 Nov 2026, place the nominal <strong>₹499 Refundable Security Deposit</strong> (100% refundable upon 90-day milestone completion):
              </p>

              {/* QR Code & UPI Container */}
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(232, 163, 76, 0.3)', borderRadius: '8px', padding: '14px', marginBottom: '14px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center', background: '#fff', padding: '6px', borderRadius: '6px', display: 'inline-block' }}>
                  <img
                    src="/qrcode.jpeg"
                    alt="Vayanai ICICI UPI QR"
                    style={{ width: '130px', height: '130px', objectFit: 'contain', display: 'block' }}
                    onError={(e: any) => {
                      e.currentTarget.src = upiQrUrl;
                    }}
                  />
                  <div style={{ color: '#0d1410', fontSize: '9px', fontWeight: 800, marginTop: '2px' }}>SCAN VIA ANY UPI APP</div>
                </div>

                <div style={{ flex: 1, minWidth: '180px' }}>
                  <div style={{ fontSize: '11px', color: '#889990' }}>Amount:</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#e8a34c', margin: '2px 0 6px' }}>₹499.00</div>
                  <div style={{ fontSize: '10px', color: '#4caf50', fontWeight: 600, marginBottom: '8px' }}>✓ 100% Refundable at Day 90</div>

                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <code style={{ color: '#fff8ee' }}>vayanai@icici</code>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="button button-outline"
                      style={{ fontSize: '9px', minHeight: '22px', padding: '0 6px' }}
                    >
                      {copiedUpi ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <a
                      href={upiPayload}
                      style={{ fontSize: '10px', color: '#e8a34c', textDecoration: 'underline' }}
                    >
                      📱 Click to Pay via Mobile UPI App &rarr;
                    </a>
                  </div>
                </div>
              </div>

              {/* UTR Input Field */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#c9d6ce', marginBottom: '6px', fontWeight: 600 }}>
                  Enter 12-Digit UPI Transaction Reference / UTR Number:
                </label>
                <input
                  type="text"
                  placeholder="e.g. 439281902847 or Ref No."
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value)}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '9px 12px', color: '#f4ede0', fontSize: '12px', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '10px 12px', fontSize: '11px', color: '#889990', marginBottom: '16px', lineHeight: 1.4 }}>
                🛡️ <strong>Deposit Verification:</strong> Submitting your 12-digit UTR notifies the accounts team to verify against ICICI bank settlement logs. Once confirmed, your official signed PDF download unlocks immediately.
              </div>

              <button
                type="submit"
                disabled={processingPayment || !isSigned}
                className="button button-gold"
                style={{ width: '100%', minHeight: '38px', fontSize: '12px', background: isSigned ? '#e8a34c' : '#333', opacity: isSigned ? 1 : 0.5, cursor: isSigned ? 'pointer' : 'not-allowed' }}
              >
                {processingPayment ? 'Submitting Details...' : isSigned ? '✓ Submit ₹499 Deposit Proof (UTR)' : 'Complete Step 1 Digital Signature First'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}'''

# Replace from step 2 start to end of component
pos = content.find(old_step_2_start)
if pos != -1:
    content = content[:pos] + new_step_2_jsx + '\n\nexport default function InternOfferPage() {\n  return (\n    <div style={{ minHeight: \'100vh\', background: \'#0d1410\', padding: \'20px 0\' }}>\n      <Suspense fallback={<div style={{ color: \'#fff\', textAlign: \'center\', padding: \'60px\' }}>Loading offer letter...</div>}>\n        <OfferContent />\n      </Suspense>\n    </div>\n  );\n}'

with open(offer_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("[OK] app/intern/offer/page.tsx updated successfully!")
