# Policy Renewal Tracker (hackathon demo)
Agent: PLAN -> human APPROVAL -> fetch quote -> extract (Gemini + parser cross-check) -> DECIDE (deterministic rules) -> separate VERIFY.
All data is synthetic; the insurer pages are mocks served by this app. No OTP/CAPTCHA involved.

## Run
    pip install -r requirements.txt
    cp .env.example .env      # optional: paste GEMINI_API_KEY (works without it, rules only)
    python app.py             # open http://127.0.0.1:5000
    python tests_runner.py    # prints TC1-TC4 and writes test_evidence.json

Decisions (alert / flagged / lapsed) are rule-based so results are repeatable; Gemini only extracts fields and writes summaries,
and its extraction is cross-checked against an HTML parser (mismatch -> parser wins and is logged).
