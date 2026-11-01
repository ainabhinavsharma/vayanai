import sqlite3

conn = sqlite3.connect("data/vayanai.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()

all_apps = c.execute("SELECT id, user_name, user_email, phone FROM intern_applications").fetchall()
matching = []
for r in all_apps:
    ph = "".join(ch for ch in (r["phone"] or "") if ch.isdigit())
    if "7990" in ph or "611904" in ph or "061190" in ph or "11904" in ph:
        matching.append((r["id"], r["user_name"], r["user_email"], r["phone"]))

print("Digit match for 7990611904 in intern_applications:", matching)

# Also check users
all_users = c.execute("SELECT id, name, email, phone FROM users").fetchall()
matching_u = []
for r in all_users:
    ph = "".join(ch for ch in (r["phone"] or "") if ch.isdigit())
    if "7990" in ph or "611904" in ph or "061190" in ph or "11904" in ph:
        matching_u.append((r["id"], r["name"], r["email"], r["phone"]))
print("Digit match in users:", matching_u)

conn.close()
