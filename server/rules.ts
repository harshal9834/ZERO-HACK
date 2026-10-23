import { Policy, PolicyStatus, ComparisonFlag, DetailedComparison } from './types.js';

export interface ParsedQuoteValues {
  cover: number | null;
  premium: number | null;
  ncb: number | null;
  deductible?: number | null;
  add_ons?: string[];
}

/**
 * Validates a policy record for completeness and format
 */
export function validatePolicyRecord(policy: Policy): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!policy.policy_no || policy.policy_no.trim() === '') {
    errors.push('Missing unique Policy Number');
  }
  if (!policy.expiry || isNaN(Date.parse(policy.expiry))) {
    errors.push('Invalid or missing expiry date format');
  }
  if (!policy.kind || !['car', 'health', 'bike', 'home', 'life', 'two-wheeler'].includes(policy.kind.toLowerCase())) {
    warnings.push(`Unrecognized insurance type: ${policy.kind}`);
  }
  if (typeof policy.last_cover !== 'number' || policy.last_cover <= 0) {
    errors.push('Sum insured baseline must be a positive number');
  }
  if (typeof policy.last_ncb !== 'number' || policy.last_ncb < 0 || policy.last_ncb > 100) {
    errors.push('Last year NCB must be between 0% and 100%');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Calculates days to expiry and expiry status.
 * status: "lapsed" if d < 0 else "alert" if d <= 30 else "ok"
 */
export function expiryStatus(expiryDateStr: string, today: Date = new Date()): { status: PolicyStatus; days: number; isExactly30Days: boolean } {
  const expiry = new Date(expiryDateStr);
  const dToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dExpiry = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  
  const diffTime = dExpiry.getTime() - dToday.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  let status: PolicyStatus = 'ok';
  if (diffDays < 0) {
    status = 'lapsed';
  } else if (diffDays <= 30) {
    status = 'alert';
  }

  return { 
    status, 
    days: diffDays,
    isExactly30Days: diffDays === 30,
  };
}

/**
 * Compares current quote values against previous policy details with deterministic rule flags
 */
export function compare(
  policy: Policy, 
  quote: ParsedQuoteValues
): { 
  decision: 'flagged' | 'uncertain' | 'ok'; 
  flags: ComparisonFlag[]; 
  reasons: string[];
} {
  const flags: ComparisonFlag[] = [];
  const reasons: string[] = [];

  if (quote.cover === null || quote.cover === undefined) {
    flags.push('NEEDS_REVIEW');
    return {
      decision: 'uncertain',
      flags,
      reasons: ['Cover amount missing in quote - cannot evaluate protection equivalence'],
    };
  }

  // Rule 1: REDUCED_COVERAGE
  if (quote.cover < policy.last_cover) {
    flags.push('REDUCED_COVERAGE');
    const reduction = policy.last_cover - quote.cover;
    const pct = Math.round((reduction / policy.last_cover) * 100);
    reasons.push(
      `Cover reduced from ₹${policy.last_cover.toLocaleString()} to ₹${quote.cover.toLocaleString()} (-₹${reduction.toLocaleString()} / -${pct}%)`
    );
  }

  // Rule 2: NCB_MISSING
  if (policy.last_ncb && policy.last_ncb > 0 && (quote.ncb === null || quote.ncb < policy.last_ncb)) {
    flags.push('NCB_MISSING');
    const quoteNcbStr = quote.ncb !== null && quote.ncb !== undefined ? `${quote.ncb}%` : 'missing';
    reasons.push(
      `No-claim bonus missing/reduced (last year was ${policy.last_ncb}%, renewal quote shows ${quoteNcbStr})`
    );
  }

  // Rule 3: Premium Comparison (Note: lower premium is not automatically better)
  if (policy.last_premium && quote.premium) {
    if (quote.premium > policy.last_premium) {
      flags.push('PREMIUM_INCREASED');
      reasons.push(`Renewal premium increased from ₹${policy.last_premium.toLocaleString()} to ₹${quote.premium.toLocaleString()}`);
    } else if (quote.premium < policy.last_premium) {
      flags.push('PREMIUM_DECREASED');
      reasons.push(`Renewal premium decreased (Note: ensure lower price is not due to reduced coverage)`);
    }
  }

  if (flags.includes('REDUCED_COVERAGE') || flags.includes('NCB_MISSING')) {
    return {
      decision: 'flagged',
      flags,
      reasons,
    };
  }

  if (flags.includes('NEEDS_REVIEW')) {
    return {
      decision: 'uncertain',
      flags,
      reasons,
    };
  }

  return {
    decision: 'ok',
    flags: ['OK'],
    reasons,
  };
}

/**
 * Master decision function producing full detailed comparison record
 */
export function decide(
  policy: Policy,
  quote: ParsedQuoteValues | null,
  today: Date = new Date()
): DetailedComparison {
  const { status: s, days: d, isExactly30Days } = expiryStatus(policy.expiry, today);

  if (s === 'lapsed') {
    return {
      decision: 'lapsed',
      flags: ['NEEDS_REVIEW'],
      reasons: [`Expired ${-d} day(s) ago — unrenewed and lapsed`],
      old_value: { cover: policy.last_cover, ncb: policy.last_ncb, premium: policy.last_premium },
      new_value: { cover: null, ncb: null, premium: null },
      explanation: `URGENT WARNING: Policy ${policy.policy_no} expired ${-d} days ago. Marked LAPSED by agent; no renewal quote can be fetched.`,
      supporting_evidence: `Expiry: ${policy.expiry}, Current Check Date: ${today.toISOString().split('T')[0]}, Diff: ${d} days`,
    };
  }

  const baseNote = isExactly30Days 
    ? [`Expires in exactly 30 days — renewal alert required`] 
    : [`Expires in ${d} day(s)`];

  if (!quote) {
    return {
      decision: s,
      flags: s === 'alert' ? ['OK'] : ['OK'],
      reasons: s === 'alert' ? baseNote : [],
      old_value: { cover: policy.last_cover, ncb: policy.last_ncb, premium: policy.last_premium },
      new_value: { cover: null, ncb: null, premium: null },
      explanation: s === 'alert' ? `Renewal Alert: Policy expires in ${d} days.` : 'Policy active.',
      supporting_evidence: `Expiry: ${policy.expiry}, Calculated Days: ${d}`,
    };
  }

  const comparison = compare(policy, quote);
  const decisionStatus: PolicyStatus = comparison.decision === 'flagged' ? 'flagged' : s;

  let explanation = '';
  if (comparison.flags.includes('REDUCED_COVERAGE')) {
    explanation = `FLAGGED (REDUCED_COVERAGE): Sum insured dropped from ₹${policy.last_cover.toLocaleString()} to ₹${(quote.cover || 0).toLocaleString()}. Coverage is inadequate.`;
  } else if (comparison.flags.includes('NCB_MISSING')) {
    explanation = `FLAGGED (NCB_MISSING): Policyholder had ${policy.last_ncb}% NCB last year, but renewal quote shows ${quote.ncb ?? 'none'}. Needs review.`;
  } else if (s === 'alert') {
    explanation = `ALERT: Policy is expiring soon (${d} days remaining). Renewal offer verified.`;
  } else {
    explanation = `COVER OK: Renewal terms are equivalent to baseline.`;
  }

  return {
    decision: decisionStatus,
    flags: comparison.flags,
    reasons: [...comparison.reasons, ...(s === 'alert' ? baseNote : [])],
    old_value: {
      cover: policy.last_cover,
      ncb: policy.last_ncb,
      premium: policy.last_premium || 10000,
    },
    new_value: {
      cover: quote.cover,
      ncb: quote.ncb,
      premium: quote.premium,
    },
    explanation,
    supporting_evidence: `Quote fetched from live mock portal. Parser/Extractor observed: Cover=₹${quote.cover?.toLocaleString()}, Premium=₹${quote.premium?.toLocaleString()}, NCB=${quote.ncb}%`,
  };
}
