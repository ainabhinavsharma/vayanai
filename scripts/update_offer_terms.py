import os

filepath = os.path.join(os.path.dirname(__file__), '..', 'components', 'intern', 'OfficialOfferLetter.tsx')
with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

# Replace Table row
old_table_row = '''            <tr style={{ borderBottom: '1px solid #e2e8e5' }}>
              <td style={{ padding: '8px 14px', fontWeight: 600, color: '#4a5550', background: '#fafbfa' }}>Institutional Incubation Fee</td>
              <td style={{ padding: '8px 14px', color: '#0e1611' }}><strong>₹0 (Fully Sponsored)</strong> &bull; Sponsored by VAYANAI & DBERT Council</td>
            </tr>'''

new_table_row = '''            <tr style={{ borderBottom: '1px solid #e2e8e5' }}>
              <td style={{ padding: '8px 14px', fontWeight: 600, color: '#4a5550', background: '#fafbfa' }}>Refundable Security Deposit</td>
              <td style={{ padding: '8px 14px', color: '#0e1611' }}><strong>₹499 (100% Refundable)</strong> &bull; Refundable upon 90-day milestone completion / minimum commitment</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8e5' }}>
              <td style={{ padding: '8px 14px', fontWeight: 600, color: '#4a5550', background: '#fafbfa' }}>Institutional Incubation Fee</td>
              <td style={{ padding: '8px 14px', color: '#0e1611' }}><strong>₹0 (Fully Sponsored)</strong> &bull; Sponsored by VAYANAI & DBERT Council</td>
            </tr>'''

c = c.replace(old_table_row.replace('\r\n', '\n'), new_table_row)
c = c.replace(old_table_row, new_table_row)

# Replace Section 5 Header
c = c.replace(
    '5. ACADEMIC ENROLLMENT & INSTITUTIONAL ALLOCATION',
    '5. REFUNDABLE SECURITY DEPOSIT & INSTITUTIONAL ALLOCATION'
)

old_sec_5_text = '''        <p style={{ margin: '0 0 12px' }}>
          Confirming an intern into this pathway commits dedicated mentor time, industrial tools, live datasets, and incubation resources from the point of appointment forward. VAYANAI and the DBERT Technical Council sponsor all training, development resources, and cloud tool licenses at zero tuition cost to the candidate.
        </p>'''

new_sec_5_text = '''        <p style={{ margin: '0 0 12px' }}>
          Confirming an intern into this pathway commits dedicated mentor time, industrial tools, live datasets, and incubation resources from the point of appointment forward. To reserve your seat and mentor allocation, a nominal Refundable Security Deposit of ₹499 is placed upon offer acceptance. This ₹499 deposit is 100% refundable upon completing your 3-month internship tenure or upon meeting the 45-day minimum commitment milestone. VAYANAI and the DBERT Technical Council sponsor all training, development resources, and cloud tool licenses at zero tuition cost to the candidate.
        </p>'''

c = c.replace(old_sec_5_text.replace('\r\n', '\n'), new_sec_5_text)
c = c.replace(old_sec_5_text, new_sec_5_text)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print("[OK] OfficialOfferLetter.tsx updated with refundable deposit terms!")
