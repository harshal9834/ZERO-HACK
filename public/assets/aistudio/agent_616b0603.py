"""Agent loop: PLAN -> (human APPROVAL) -> TOOL CALL (fetch) -> OBSERVE (extract) -> DECIDE -> VERIFY.
Gemini (if GEMINI_API_KEY set) extracts quote fields + writes the summary; rules.py makes every decision."""
import json, os, re
from datetime import datetime
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import rules
load_dotenv()
BASE = os.getenv("BASE_URL", "http://127.0.0.1:5000")
now = lambda: datetime.now().isoformat(timespec="seconds")

def log(c, pid, step, detail):
    c.execute("INSERT INTO trace(policy_id,ts,step,detail) VALUES(?,?,?,?)", (pid, now(), step, detail)); c.commit()

def fetch_page(path):
    try:
        return requests.get(BASE + path, timeout=4).text
    except requests.RequestException:  # app not running (e.g. test runner): use the mock insurer in-process
        from flask import Flask
        from mock_insurer import bp
        a = Flask("mock"); a.register_blueprint(bp)
        return a.test_client().get(path).get_data(as_text=True)

def num(t):
    m = re.search(r"\d[\d,]*", t or "")
    return int(m.group().replace(",", "")) if m else None

def parse(html):
    s = BeautifulSoup(html, "html.parser")
    g = lambda i: s.find(id=i).get_text(strip=True) if s.find(id=i) else ""
    return {"cover": num(g("cover")), "premium": num(g("premium")), "ncb": num(g("ncb"))}, s.get_text(" ", strip=True)

def gemini(prompt):
    key = os.getenv("GEMINI_API_KEY")
    if not key: return None
    try:
        from google import genai
        r = genai.Client(api_key=key).models.generate_content(model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"), contents=prompt)
        return r.text.strip()
    except Exception:
        return None

def gemini_extract(text):
    t = gemini("Return ONLY JSON with integer keys cover, premium, ncb (null if absent) from this insurance quote page text:\n" + text)
    try: return json.loads(re.sub(r"```(?:json)?", "", t).strip()) if t else None
    except Exception: return None

def propose(c, pid, today):
    p = c.execute("SELECT * FROM policies WHERE id=?", (pid,)).fetchone()
    st, d = rules.expiry_status(p["expiry"], today)
    log(c, pid, "PLAN", f"{p['policy_no']} expires {p['expiry']} ({d} days) -> {st}; compare renewal with last year's cover")
    c.execute("UPDATE policies SET status=? WHERE id=?", (st, pid))
    if st == "lapsed":
        log(c, pid, "DECIDE", "policy expired -> marked lapsed; no quote fetched"); c.commit(); return None
    ex = c.execute("SELECT id FROM actions WHERE policy_id=? AND state IN ('pending','approved','done')", (pid,)).fetchone()
    if ex: return ex["id"]
    url = f"/insurer/{p['policy_no']}"
    aid = c.execute("INSERT INTO actions(policy_id,url,state,created) VALUES(?,?,'pending',?)", (pid, url, now())).lastrowid
    log(c, pid, "APPROVAL", f"waiting for human approval to fetch renewal quote from {url}"); c.commit(); return aid

def approve(c, aid, today):
    if c.execute("UPDATE actions SET state='approved',approved=? WHERE id=? AND state='pending'", (now(), aid)).rowcount != 1:
        return "ignored: already handled (no duplicate execution)"
    c.commit()
    a = c.execute("SELECT * FROM actions WHERE id=?", (aid,)).fetchone()
    p = c.execute("SELECT * FROM policies WHERE id=?", (a["policy_id"],)).fetchone()
    log(c, p["id"], "APPROVED", f"human approved fetch of {a['url']}")
    try:
        vals, text = parse(fetch_page(a["url"]))
        log(c, p["id"], "TOOL CALL", f"GET {a['url']} -> cover={vals['cover']} premium={vals['premium']} ncb={vals['ncb']}")
    except Exception as e:
        c.execute("UPDATE actions SET state='failed' WHERE id=?", (aid,)); log(c, p["id"], "FAILED", str(e)); c.commit(); return "failed"
    g = gemini_extract(text)
    if isinstance(g, dict) and all(g.get(k) == vals[k] for k in vals): ext = "Gemini extraction (cross-checked with parser: match)"
    elif isinstance(g, dict): ext = f"parser (Gemini differed: {g})"
    else: ext = "parser (Gemini not used)"
    dec, reasons = rules.decide(p, vals, today)
    fallback = f"{dec.upper()}: " + "; ".join(reasons)
    summ = gemini(f"In 2 short sentences, explain this renewal check to a household. Decision: {dec}. Reasons: {reasons}. Last year cover {p['last_cover']}, quote {vals}.") or fallback
    qid = c.execute("INSERT INTO quotes(policy_id,url,fetched,cover,premium,ncb,extractor,summary) VALUES(?,?,?,?,?,?,?,?)",
                    (p["id"], a["url"], now(), vals["cover"], vals["premium"], vals["ncb"], ext, summ)).lastrowid
    c.execute("UPDATE actions SET state='done',quote_id=? WHERE id=?", (qid, aid))
    c.execute("UPDATE policies SET status=? WHERE id=?", (dec, p["id"]))
    log(c, p["id"], "DECIDE", f"{dec} - {'; '.join(reasons)} [{ext}]"); c.commit()
    verify(c, aid); return "done"

def verify(c, aid):
    """Separate check: re-read the page, confirm stored quote matches it and see if cover is unchanged vs last year."""
    a = c.execute("SELECT * FROM actions WHERE id=?", (aid,)).fetchone()
    p = c.execute("SELECT * FROM policies WHERE id=?", (a["policy_id"],)).fetchone()
    q = c.execute("SELECT * FROM quotes WHERE id=?", (a["quote_id"],)).fetchone()
    seen, _ = parse(fetch_page(a["url"]))
    same = all(seen[k] == q[k] for k in seen)
    cover = "unchanged" if seen["cover"] == p["last_cover"] else f"CHANGED ({p['last_cover']} -> {seen['cover']})"
    log(c, p["id"], "VERIFY", f"stored quote matches live page: {same}; cover vs last year: {cover}")
    return {"quote_matches_page": same, "cover_vs_last_year": cover}
