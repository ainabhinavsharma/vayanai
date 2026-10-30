import os

filepath = os.path.join(os.path.dirname(__file__), '..', 'components', 'portal', 'AdminInternSupervision.tsx')
with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Add handleApproveAssessment right before handleSendOffer
target_before = '  const handleSendOffer = async (candidateId: string, name: string) => {'
new_fn = '''  const handleApproveAssessment = async (candidateId: string, name: string) => {
    const confirmApprove = confirm(`Approve selection for ${name} and dispatch official Selection Offer Email with offer letter access?`);
    if (!confirmApprove) return;

    try {
      const res = await fetch('/api/v1/portal/admin/interns/approve-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: candidateId, action: 'approve' })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ Selection approved! Offer letter dispatched to ${name}.`);
        await fetchCandidates();
      } else {
        showToast(data.error?.message || data.error || 'Approval failed.');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleSendOffer = async (candidateId: string, name: string) => {'''

c = c.replace(target_before, new_fn)

# Replace the table action buttons for interview_completed / selected
old_table_btn = '''                        {(cand.status === 'interview_completed' || cand.status === 'selected') && (
                          <button
                            type="button"
                            className="button button-gold"
                            onClick={() => handleSendOffer(cand.id, cand.userName)}
                            style={{ fontSize: '10px', minHeight: '28px', padding: '0 10px', background: '#4caf50', borderColor: '#4caf50', color: '#fff' }}
                          >
                            📜 Send Offer
                          </button>
                        )}'''

new_table_btn = '''                        {cand.status === 'interview_completed' && (
                          <button
                            type="button"
                            className="button button-gold"
                            onClick={() => handleApproveAssessment(cand.id, cand.userName)}
                            style={{ fontSize: '10px', minHeight: '28px', padding: '0 10px', background: '#4caf50', borderColor: '#4caf50', color: '#fff' }}
                            title="Approve virtual interview assessment and dispatch official offer email"
                          >
                            ✓ Approve Selection & Send Offer Email
                          </button>
                        )}

                        {cand.status === 'selected' && (
                          <button
                            type="button"
                            className="button button-gold"
                            onClick={() => handleSendOffer(cand.id, cand.userName)}
                            style={{ fontSize: '10px', minHeight: '28px', padding: '0 10px', background: '#4caf50', borderColor: '#4caf50', color: '#fff' }}
                            title="Re-send formal offer letter email"
                          >
                            📜 Re-Send Offer
                          </button>
                        )}'''

c = c.replace(old_table_btn.replace('\r\n', '\n'), new_table_btn)
c = c.replace(old_table_btn, new_table_btn)

# Update verify deposit button label
old_deposit_btn = '✓ Approve & Confirm Seat'
new_deposit_btn = '✓ Verify ₹499 Deposit & Unlock Seat'
c = c.replace(old_deposit_btn, new_deposit_btn)

# Update modal button
old_modal_btn = '''              <button
                type="button"
                className="button button-gold"
                onClick={() => {
                  handleSendOffer(selectedCandidate.id, selectedCandidate.userName);
                  setSelectedCandidate(null);
                }}
                style={{ fontSize: '11px', background: '#4caf50', borderColor: '#4caf50', color: '#fff' }}
              >
                Approve & Issue Offer Letter
              </button>'''

new_modal_btn = '''              {selectedCandidate.status === 'interview_completed' ? (
                <button
                  type="button"
                  className="button button-gold"
                  onClick={() => {
                    handleApproveAssessment(selectedCandidate.id, selectedCandidate.userName);
                    setSelectedCandidate(null);
                  }}
                  style={{ fontSize: '11px', background: '#4caf50', borderColor: '#4caf50', color: '#fff' }}
                >
                  ✓ Approve Selection & Send Offer Email
                </button>
              ) : (
                <button
                  type="button"
                  className="button button-gold"
                  onClick={() => {
                    handleSendOffer(selectedCandidate.id, selectedCandidate.userName);
                    setSelectedCandidate(null);
                  }}
                  style={{ fontSize: '11px', background: '#4caf50', borderColor: '#4caf50', color: '#fff' }}
                >
                  Approve & Issue Offer Letter
                </button>
              )}'''

c = c.replace(old_modal_btn.replace('\r\n', '\n'), new_modal_btn)
c = c.replace(old_modal_btn, new_modal_btn)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print("[OK] AdminInternSupervision.tsx updated!")
