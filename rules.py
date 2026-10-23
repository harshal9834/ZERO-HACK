"""Deterministic decision rules (no LLM): same input -> same output."""
from datetime import date

def expiry_status(expiry, today):
    d = (date.fromisoformat(expiry) - today).days
    return ("lapsed" if d < 0 else "alert" if d <= 30 else "ok"), d

def compare(p, q):
    if q["cover"] is None:
        return "uncertain", ["cover amount missing in quote - cannot compare"]
    r = []
    if q["cover"] < p["last_cover"]:
        r.append(f"cover reduced {p['last_cover']:,} -> {q['cover']:,}")
    if p["last_ncb"] and (q["ncb"] is None or q["ncb"] < p["last_ncb"]):
        r.append(f"no-claim bonus missing/reduced (last year {p['last_ncb']}%, quote {q['ncb'] if q['ncb'] is not None else 'none'})")
    return ("flagged" if r else "ok"), r

def decide(p, q, today):
    s, d = expiry_status(p["expiry"], today)
    if s == "lapsed":
        return "lapsed", [f"expired {-d} day(s) ago"]
    note = [f"expires in {d} day(s)"]
    if q is None:
        return s, (note if s == "alert" else [])
    c, r = compare(p, q)
    if c != "ok":
        return c, r
    return s, (note if s == "alert" else ["cover details unchanged"])
