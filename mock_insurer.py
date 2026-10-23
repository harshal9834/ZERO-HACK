from flask import Blueprint, abort, render_template_string
bp = Blueprint("insurer", __name__)
# policy_no -> (insurer, product, sum insured, premium, NCB text or None)  -- synthetic mock insurer data
QUOTES = {"KA01AB1234": ("Acme Motor", "Comprehensive car cover", 500000, 11200, "20%"),
          "HLTH-7788": ("Shield Health", "Family floater health plan", 300000, 18400, "0%"),
          "MH14EF9012": ("Acme Motor", "Comprehensive car cover", 600000, 13900, None),
          "DL3CGH3456": ("Acme Motor", "Two-wheeler cover", 80000, 2100, "50%")}
PAGE = """<html><body style="font-family:sans-serif"><h2>{{i}} - Renewal Quote (MOCK)</h2>
<p>Policy <b>{{no}}</b> - {{prod}}</p>
<p>Sum insured: <span id="cover">Rs {{'{:,}'.format(cov)}}</span></p>
<p>Renewal premium: <span id="premium">Rs {{'{:,}'.format(prem)}}</span></p>
<p>No-claim bonus: <span id="ncb">{{ncb or '-'}}</span></p>
<p>Quote valid for 15 days. Synthetic page for demo only.</p></body></html>"""

@bp.route("/insurer/<no>")
def page(no):
    if no not in QUOTES: abort(404)
    i, prod, cov, prem, ncb = QUOTES[no]
    return render_template_string(PAGE, i=i, no=no, prod=prod, cov=cov, prem=prem, ncb=ncb)
