import os

filepath = os.path.join(os.path.dirname(__file__), '..', 'scripts', 'seed_demo_accounts.py')
with open(filepath, 'r', encoding='utf-8') as f:
    c = f.read()

target = '    print("\\nSeeding Intern Applications Across All 6 Stages...")'

replacement = '''    demo_emails = [a["user_email"].lower() for a in applications_data]
    cur.execute(f"DELETE FROM intern_applications WHERE LOWER(user_email) IN ({','.join(['?']*len(demo_emails))})", demo_emails)
    cur.execute(f"DELETE FROM payments WHERE LOWER(user_email) IN ({','.join(['?']*len(demo_emails))})", demo_emails)

    print("\\nSeeding Intern Applications Across All 6 Stages...")'''

c = c.replace(target, replacement)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(c)

print("[OK] seed_demo_accounts.py updated to clean up stale demo applications!")
