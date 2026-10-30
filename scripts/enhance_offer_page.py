import os

filepath = os.path.join(os.path.dirname(__file__), '..', 'app', 'intern', 'offer', 'page.tsx')
with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Add showUtrForm state
c = c.replace(
    "const [toastMessage, setToastMessage] = useState<string | null>(null);",
    "const [toastMessage, setToastMessage] = useState<string | null>(null);\n  const [showUtrForm, setShowUtrForm] = useState(false);"
)

# 2. Update isPendingVerification condition
c = c.replace(
    ") : isPendingVerification ? (",
    ") : (isPendingVerification && !showUtrForm) ? ("
)

# 3. Add Re-submit button in pending box
c = c.replace(
    '''              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Link
                  href="/portal"
                  className="button button-gold"
                  style={{ fontSize: '11px', minHeight: '34px', padding: '0 14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  Go to Candidate Portal &rarr;
                </Link>
              </div>''',
    '''              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Link
                  href="/portal"
                  className="button button-gold"
                  style={{ fontSize: '11px', minHeight: '34px', padding: '0 14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  Go to Candidate Portal &rarr;
                </Link>
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => setShowUtrForm(true)}
                  style={{ fontSize: '11px', minHeight: '34px', padding: '0 14px' }}
                >
                  ✏️ View QR Code / Re-submit UTR
                </button>
              </div>'''
)

# 4. In form, add Back button if isPendingVerification
c = c.replace(
    '''            <form onSubmit={handlePayDeposit} style={{ marginTop: '14px' }}>
              <p style={{ fontSize: '12px', color: '#c9d6ce', lineHeight: 1.5, margin: '0 0 14px' }}>''',
    '''            <form onSubmit={handlePayDeposit} style={{ marginTop: '14px' }}>
              {isPendingVerification && (
                <div style={{ marginBottom: '12px' }}>
                  <button
                    type="button"
                    className="button button-outline"
                    onClick={() => setShowUtrForm(false)}
                    style={{ fontSize: '11px', minHeight: '28px', padding: '0 12px' }}
                  >
                    &larr; Back to Verification Status
                  </button>
                </div>
              )}
              <p style={{ fontSize: '12px', color: '#c9d6ce', lineHeight: 1.5, margin: '0 0 14px' }}>'''
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print("[OK] app/intern/offer/page.tsx updated with showUtrForm toggle!")
