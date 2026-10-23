import { MockInsurerQuote } from './types.js';

// Default mock insurer database mapping policy_no -> details
export const MOCK_QUOTES: Record<string, MockInsurerQuote> = {
  'KA01AB1234': {
    insurer: 'Acme Motor',
    product: 'Comprehensive car cover',
    cover: 500000,
    premium: 11200,
    ncb: '20%',
  },
  'HLTH-7788': {
    insurer: 'Shield Health',
    product: 'Family floater health plan',
    cover: 300000, // Reduced from 500,000!
    premium: 18400,
    ncb: '0%',
  },
  'MH14EF9012': {
    insurer: 'Acme Motor',
    product: 'Comprehensive car cover',
    cover: 600000,
    premium: 13900,
    ncb: null, // Missing NCB! Last year had 25%
  },
  'DL3CGH3456': {
    insurer: 'Acme Motor',
    product: 'Two-wheeler cover',
    cover: 80000,
    premium: 2100,
    ncb: '50%',
  },
};

export function getMockQuote(policyNo: string): MockInsurerQuote | null {
  return MOCK_QUOTES[policyNo] || null;
}

export function setMockQuote(policyNo: string, quote: MockInsurerQuote): void {
  MOCK_QUOTES[policyNo] = quote;
}

export function renderMockPageHtml(policyNo: string, quote: MockInsurerQuote): string {
  const formattedCover = quote.cover.toLocaleString();
  const formattedPremium = quote.premium.toLocaleString();
  const ncbText = quote.ncb || '-';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${quote.insurer} - Renewal Portal (Mock)</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 32px 24px;
      background: #f8fafc;
      color: #0f172a;
    }
    .container {
      max-width: 640px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      padding: 28px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      background: #e0f2fe;
      color: #0369a1;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    }
    h2 {
      margin: 0 0 8px 0;
      font-size: 22px;
      color: #1e293b;
    }
    .subtitle {
      color: #64748b;
      font-size: 14px;
      margin-bottom: 24px;
    }
    .quote-box {
      border-top: 1px solid #f1f5f9;
      border-bottom: 1px solid #f1f5f9;
      padding: 16px 0;
      margin: 20px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
    }
    .row-label {
      color: #475569;
      font-size: 14px;
    }
    .row-value {
      font-weight: 600;
      font-size: 16px;
      color: #0f172a;
    }
    .disclaimer {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">Official Renewal Offer (Synthetic Mock)</span>
    <h2>${quote.insurer} - Renewal Quote</h2>
    <p class="subtitle">Policy <b>${policyNo}</b> &bull; ${quote.product}</p>

    <div class="quote-box">
      <div class="row">
        <span class="row-label">Sum Insured (Cover)</span>
        <span class="row-value" id="cover">Rs ${formattedCover}</span>
      </div>
      <div class="row">
        <span class="row-label">Renewal Premium</span>
        <span class="row-value" id="premium">Rs ${formattedPremium}</span>
      </div>
      <div class="row">
        <span class="row-label">No-Claim Bonus (NCB)</span>
        <span class="row-value" id="ncb">${ncbText}</span>
      </div>
    </div>

    <p class="disclaimer">Quote valid for 15 days. Synthetic mock endpoint for hackathon demo and automated verification testing.</p>
  </div>
</body>
</html>`;
}
