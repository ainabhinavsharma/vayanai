import sqlite3

conn = sqlite3.connect("data/vayanai.db")
c = conn.cursor()
tables = [t[0] for t in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
for t in tables:
    count = c.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
    print(f"Table: {t:<28} | Rows: {count}")
conn.close()
