import os
from datetime import date
from flask import Flask, redirect, render_template, url_for
from dotenv import load_dotenv
import agent, db, tests_runner
from mock_insurer import bp
load_dotenv()
app = Flask(__name__); app.register_blueprint(bp)

@app.route("/")
def index():
    c = db.connect(); db.seed(c); data = []
    for p in c.execute("SELECT * FROM policies ORDER BY expiry").fetchall():
        q = c.execute("SELECT * FROM quotes WHERE policy_id=? ORDER BY id DESC LIMIT 1", (p["id"],)).fetchone()
        a = c.execute("SELECT * FROM actions WHERE policy_id=? ORDER BY id DESC LIMIT 1", (p["id"],)).fetchone()
        tr = c.execute("SELECT * FROM trace WHERE policy_id=? ORDER BY id", (p["id"],)).fetchall()
        data.append(dict(p=p, days=(date.fromisoformat(p["expiry"]) - date.today()).days, q=q, a=a, trace=tr))
    return render_template("index.html", data=data, gemini=bool(os.getenv("GEMINI_API_KEY")))

@app.post("/propose_all")
def propose_all():
    c = db.connect()
    for p in c.execute("SELECT id FROM policies").fetchall(): agent.propose(c, p["id"], date.today())
    return redirect(url_for("index"))

@app.post("/approve/<int:aid>")
def approve(aid):
    agent.approve(db.connect(), aid, date.today()); return redirect(url_for("index"))

@app.post("/reject/<int:aid>")
def reject(aid):
    c = db.connect(); c.execute("UPDATE actions SET state='rejected' WHERE id=? AND state='pending'", (aid,)); c.commit()
    return redirect(url_for("index"))

@app.route("/tests")
def tests():
    return render_template("tests.html", results=tests_runner.run_all())

if __name__ == "__main__":
    app.run(debug=False, port=5000)
