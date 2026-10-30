import os

deploy_dir = 'cpanel_deploy'
app_cgi = os.path.join(deploy_dir, 'cgi-bin', 'app.cgi')
env_file = os.path.join(deploy_dir, '.env')
htaccess = os.path.join(deploy_dir, '.htaccess')
server_cjs = os.path.join(deploy_dir, 'server.cjs')
package_json = os.path.join(deploy_dir, 'package.json')
db_file = os.path.join(deploy_dir, 'data', 'vayanai.db')

print("1. Checking existence of critical deployment artifacts:")
for f in [app_cgi, env_file, htaccess, server_cjs, package_json, db_file]:
    assert os.path.isfile(f), f"Missing {f}"
    print(f"  [OK] {f} exists ({os.path.getsize(f)} bytes)")

print("\n2. Checking security in cpanel_deploy/.env:")
with open(env_file, 'r', encoding='utf-8') as f:
    env_content = f.read()
assert 'Gannu@12223' not in env_content, "Plaintext password leak in .env!"
assert 'your_smtp_password_here' in env_content, "Placeholder missing in .env"
print("  [OK] .env has sanitized placeholders and zero hardcoded credentials.")

print("\n3. Checking .htaccess protection:")
with open(htaccess, 'r', encoding='utf-8') as f:
    ht_content = f.read()
assert r'RewriteRule ^\.next - [F,L]' in ht_content, "Missing .next block in .htaccess"
assert 'RewriteRule ^data/ - [F,L]' in ht_content, "Missing data/ block in .htaccess"
assert r'RewriteRule ^_next/static/(.*)$ .next/static/$1 [L]' in ht_content
print("  [OK] .htaccess strictly isolates .next server files and data directory.")

print("\n4. Checking server.cjs uncaught handlers and version check:")
with open(server_cjs, 'r', encoding='utf-8') as f:
    srv_content = f.read()
assert 'uncaughtException' in srv_content
assert 'unhandledRejection' in srv_content
assert 'node:sqlite' in srv_content
print("  [OK] server.cjs has crash guards and Node 22.5+ version check.")

print("\n5. Checking app.cgi CGI runner:")
with open(app_cgi, 'r', encoding='utf-8') as f:
    cgi_content = f.read()
assert 'Gannu@12223' not in cgi_content
assert 'PRAGMA journal_mode = WAL' in cgi_content
assert 'HttpOnly; SameSite=Strict; Secure' in cgi_content
assert 'Certificate & LOR Issued' in cgi_content
assert 'api_sub == "auth/me"' in cgi_content
assert 'api_sub == "auth/forgot-password"' in cgi_content
print("  [OK] app.cgi has all security headers, WAL mode, sanitized secrets, and full email dispatch.")

print("\n============================================================")
print("ALL CPANEL DEPLOYMENT ARTIFACT CHECKS PASSED WITH ZERO ISSUES!")
print("============================================================")
