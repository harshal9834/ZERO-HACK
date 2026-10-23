"""Runs the 4 official test cases on a fresh temp DB and saves test_evidence.json. (Approval click is simulated here; in the UI a human clicks.)"""
import json, os, tempfile
from datetime import date
import agent, db
CASES = [("TC1", "Policy expiring in 30 days", "KA01AB1234", "alert"),
         ("TC2", "Cover reduced in quote", "HLTH-7788", "flagged"),
         ("TC3", "No-claim bonus missing", "MH14EF9012", "flagged"),
         ("TC4", "Expired policy", "DL3CGH3456", "lapsed")]

def run_all(today=None):
    today = today or date.today()
    path = tempfile.mktemp(suffix=".db"); c = db.connect(path); db.seed(c, today); out = []
    for tc, scen, no, exp in CASES:
        p = c.execute("SELECT * FROM policies WHERE policy_no=?", (no,)).fetchone()
        aid = agent.propose(c, p["id"], today); ver = None
        if aid:
            agent.approve(c, aid, today)
            ver = agent.verify(c, aid)
        p2 = c.execute("SELECT * FROM policies WHERE id=?", (p["id"],)).fetchone()
        q = c.execute("SELECT * FROM quotes WHERE policy_id=? ORDER BY id DESC LIMIT 1", (p["id"],)).fetchone()
        ev = [f"{t['ts']} {t['step']}: {t['detail']}" for t in c.execute("SELECT * FROM trace WHERE policy_id=? ORDER BY id", (p["id"],))]
        out.append(dict(id=tc, scenario=scen, input=dict(policy=no, expiry=p["expiry"], last_year_cover=p["last_cover"], last_year_ncb=p["last_ncb"]),
                        expected=exp, actual=p2["status"], passed=p2["status"] == exp, quote=dict(q) if q else None, verify=ver, evidence=ev))
    c.close(); os.remove(path)
    json.dump(out, open("test_evidence.json", "w"), indent=1, default=str)
    return out

if __name__ == "__main__":
    for r in run_all(): print(r["id"], r["scenario"], "| expected:", r["expected"], "| actual:", r["actual"], "| PASS" if r["passed"] else "| FAIL")
