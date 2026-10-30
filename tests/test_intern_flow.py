import os, sys, subprocess, json

def run_cgi(path_info, method='GET', body=None, cookie=''):
    env = os.environ.copy()
    env['REQUEST_METHOD'] = method
    if '?' in path_info:
        p, q = path_info.split('?', 1)
        env['PATH_INFO'] = p
        env['QUERY_STRING'] = q
        env['REQUEST_URI'] = path_info
    else:
        env['PATH_INFO'] = path_info
        env['QUERY_STRING'] = ''
        env['REQUEST_URI'] = path_info
    env['SERVER_NAME'] = 'vayanai.in.net'
    env['SERVER_PORT'] = '443'
    env['HTTPS'] = 'on'
    if cookie:
        env['HTTP_COOKIE'] = cookie
    body_bytes = json.dumps(body).encode('utf-8') if body else b''
    env['CONTENT_LENGTH'] = str(len(body_bytes))
    env['CONTENT_TYPE'] = 'application/json'

    proc = subprocess.Popen([sys.executable, 'cgi-bin/app.cgi'], env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = proc.communicate(input=body_bytes)
    output = stdout.decode('utf-8', errors='ignore')
    
    parts = output.split('\n')
    header_lines = []
    body_lines = []
    in_body = False
    for line in parts:
        if not in_body and line.strip() == '':
            in_body = True
            continue
        if in_body:
            body_lines.append(line)
        else:
            header_lines.append(line.strip())
            
    resp_body = '\n'.join(body_lines).strip()
    return header_lines, resp_body

print('=== TEST 1: Intern Candidate Signup ===')
test_email = f'priya.verified.{os.getpid()}@example.com'
headers, body = run_cgi('/api/v1/auth/signup', 'POST', {
    'name': 'Priya Verified',
    'email': test_email,
    'password': 'password123',
    'role': 'intern',
    'phone': '+91 9876543210',
    'college': 'IIT Guwahati',
    'track': 'Data Analyst'
})
signup_res = json.loads(body)
print('Signup Success:', signup_res.get('success'), 'User:', signup_res.get('user', {}).get('email'))
token = signup_res.get('data', {}).get('magicToken')
print('Magic Token:', token)

print('\n=== TEST 2: Virtual Assessment Fetch Questions ===')
_, a_body = run_cgi(f'/api/v1/intern/assessment?token={token}', 'GET')
a_res = json.loads(a_body)
print('Assessment Candidate:', a_res.get('data', {}).get('candidate', {}).get('name'), 'Questions Count:', len(a_res.get('data', {}).get('questions', [])))

print('\n=== TEST 3: Submit Virtual Assessment (Score 100/100 -> Auto Selection) ===')
optimal_answers = {
    'q-data-missing': 'opt-data-1-optimal',
    'q-data-sql': 'opt-data-2-optimal',
    'q-data-outlier': 'opt-data-3-optimal',
    'q-data-privacy': 'opt-data-4-optimal',
    'q-data-ethics': 'opt-data-5-optimal'
}
_, sub_body = run_cgi('/api/v1/intern/assessment', 'POST', {
    'token': token,
    'answers': optimal_answers,
    'telemetry': {'totalDurationSeconds': 180, 'proctoringMode': 'Standard'}
})
sub_res = json.loads(sub_body)
print('Assessment Score:', sub_res.get('data', {}).get('score'), 'Selected:', sub_res.get('data', {}).get('selected'))

print('\n=== TEST 4: Fetch Offer Letter ===')
_, off_body = run_cgi(f'/api/v1/intern/offer?token={token}', 'GET')
off_res = json.loads(off_body)
candidate = off_res.get('data', {}).get('candidate', {})
print('Offer Letter ID:', candidate.get('offerLetterId'), 'Candidate Status:', candidate.get('status'))

print('\n=== TEST 5: Digital Acceptance of Offer ===')
_, sig_body = run_cgi('/api/v1/intern/offer', 'POST', {
    'token': token,
    'action': 'accept_signature',
    'signatureName': 'Priya Verified'
})
sig_res = json.loads(sig_body)
print('Signed Success:', sig_res.get('success'), 'Status:', sig_res.get('data', {}).get('application', {}).get('status'))

print('\n=== TEST 6: Student Verification & Slot Confirmation ===')
test_utr = '629104882190'
_, dep_body = run_cgi('/api/v1/intern/offer', 'POST', {
    'token': token,
    'action': 'pay_deposit',
    'utrNumber': test_utr
})
dep_res = json.loads(dep_body)
app_after_dep = dep_res.get('data', {}).get('application', {})
print('Payment Status:', dep_res.get('data', {}).get('payment', {}).get('status'), 'Application Status:', app_after_dep.get('status'), 'Receipt:', app_after_dep.get('deposit_receipt'))

print('\n=== TEST 7: Check Certificates While Under Verification (Locked) ===')
_, cert_body = run_cgi(f'/api/v1/certificates/my?email={test_email}', 'GET')
cert_res = json.loads(cert_body)
print('Certificates Locked:', cert_res.get('data', {}).get('isLocked'), 'Days Remaining:', cert_res.get('data', {}).get('daysRemaining'))

print('\n=== TEST 8: Admin Portal Verification & Enrollment ===')
admin_headers, admin_body = run_cgi('/api/v1/auth/signin', 'POST', {'email': 'admin@vayanai.in', 'password': 'AdminSecure123!'})
admin_cookie = ''
for line in admin_headers:
    if line.startswith('Set-Cookie:') and 'vayanai_session=' in line:
        admin_cookie = line.split('Set-Cookie:')[1].split(';')[0].strip()

cand_id = app_after_dep.get('id')
_, ver_body = run_cgi('/api/v1/portal/admin/interns/verify-deposit', 'POST', {'candidateId': cand_id, 'action': 'approve'}, cookie=admin_cookie)
ver_res = json.loads(ver_body)
print('Admin Verification Result:', ver_res.get('data', {}).get('message'))

# Verify status in DB is now enrolled
_, off_post_admin = run_cgi(f'/api/v1/intern/offer?token={token}', 'GET')
print('Status after Admin Verification:', json.loads(off_post_admin).get('data', {}).get('candidate', {}).get('status'))

print('\n=== TEST 9: Admin Clears 3-Month Completion (Unlocks Certificate) ===')
_, clear_body = run_cgi('/api/v1/portal/admin/interns/clear-completion', 'POST', {'candidateId': cand_id}, cookie=admin_cookie)
clear_res = json.loads(clear_body)
print('Admin Clearance Result:', clear_res.get('data', {}).get('message'))

_, cert2_body = run_cgi(f'/api/v1/certificates/my?email={test_email}', 'GET')
cert2_res = json.loads(cert2_body)
certs = cert2_res.get('data', {}).get('certificates', [])
print('Certificates Unlocked! Count:', len(certs))
if certs:
    c = certs[0]
    cert_id = c.get('certificate_id')
    print('  -> Certificate ID:', cert_id)
    print('  -> Intern Name:', c.get('intern_name'))
    print('  -> Domain:', c.get('domain'))
    print('  -> Issuing Authority:', c.get('issuing_authority'))
    print('  -> QR Verification URL:', c.get('qr_payload_url'))

    # Verify public verification endpoint
    _, verify_pub_body = run_cgi(f'/api/v1/certificates/verify?id={cert_id}', 'GET')
    pub_res = json.loads(verify_pub_body)
    print('Public Verification Endpoint Check:', pub_res.get('success'), 'Verified Status:', pub_res.get('data', {}).get('certificate', {}).get('status'))
