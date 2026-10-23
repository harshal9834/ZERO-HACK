import os, sqlite3
from datetime import date, timedelta
PATH = os.getenv("DB_PATH", "tracker.db")
SCHEMA = """
CREATE TABLE IF NOT EXISTS policies(id INTEGER PRIMARY KEY, holder TEXT, kind TEXT, insurer TEXT, policy_no TEXT UNIQUE,
  expiry TEXT, last_cover INTEGER, last_ncb INTEGER, status TEXT DEFAULT 'new');
CREATE TABLE IF NOT EXISTS actions(id INTEGER PRIMARY KEY, policy_id INTEGER, url TEXT, state TEXT, created TEXT, approved TEXT, quote_id INTEGER);
CREATE TABLE IF NOT EXISTS quotes(id INTEGER PRIMARY KEY, policy_id INTEGER, url TEXT, fetched TEXT, cover INTEGER, premium INTEGER,
  ncb INTEGER, extractor TEXT, summary TEXT);
CREATE TABLE IF NOT EXISTS trace(id INTEGER PRIMARY KEY, policy_id INTEGER, ts TEXT, step TEXT, detail TEXT);
"""
# (holder, kind, insurer, policy_no, days_to_expiry, last_year_cover, last_year_ncb%)  -- synthetic data
SEED = [("Sharma family", "Car", "Acme Motor", "KA01AB1234", 30, 500000, 20),     # TC1 expiring in 30 days
        ("Sharma family", "Health", "Shield Health", "HLTH-7788", 45, 500000, 0),  # TC2 cover reduced
        ("Sharma family", "Car", "Acme Motor", "MH14EF9012", 60, 600000, 25),      # TC3 NCB missing
        ("Sharma family", "Bike", "Acme Motor", "DL3CGH3456", -10, 80000, 50)]     # TC4 expired

def connect(path=None):
    c = sqlite3.connect(path or PATH); c.row_factory = sqlite3.Row; c.executescript(SCHEMA); return c

def seed(c, today=None):
    today = today or date.today()
    for h, k, i, n, d, cov, ncb in SEED:
        c.execute("INSERT OR IGNORE INTO policies(holder,kind,insurer,policy_no,expiry,last_cover,last_ncb) VALUES(?,?,?,?,?,?,?)",
                  (h, k, i, n, (today + timedelta(days=d)).isoformat(), cov, ncb))
    c.commit()
