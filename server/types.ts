export type PolicyStatus = 'new' | 'ok' | 'alert' | 'flagged' | 'lapsed';
export type ActionState = 'pending' | 'approved' | 'rejected' | 'done' | 'failed';
export type TraceStep = 
  | 'PLAN' 
  | 'APPROVAL' 
  | 'APPROVED' 
  | 'TOOL CALL' 
  | 'DECIDE' 
  | 'VERIFY' 
  | 'FAILED' 
  | 'REJECTED'
  | 'VALIDATE'
  | 'ALERT';

export type ComparisonFlag = 'REDUCED_COVERAGE' | 'NCB_MISSING' | 'NEEDS_REVIEW' | 'PREMIUM_INCREASED' | 'PREMIUM_DECREASED' | 'OK';
export type VerificationStatus = 'VERIFIED' | 'FAILED' | 'PENDING';

export interface PolicyValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface Policy {
  id: number;
  holder: string;
  kind: string; // Car, Health, Bike, etc.
  insurer: string;
  policy_no: string;
  expiry: string; // ISO date 'YYYY-MM-DD'
  last_cover: number;
  last_ncb: number; // percentage, e.g. 20
  last_premium?: number;
  deductible?: number;
  add_ons?: string[];
  status: PolicyStatus;
  validation?: PolicyValidation;
}

export interface Action {
  id: number;
  policy_id: number;
  action_type: 'FETCH_RENEWAL_QUOTE' | 'APPLY_RENEWAL' | 'VERIFY_QUOTE';
  url: string;
  state: ActionState;
  created: string;
  approved?: string | null;
  approver?: string | null; // e.g. 'Human User'
  quote_id?: number | null;
  rejection_reason?: string | null;
  verification_status?: VerificationStatus;
}

export interface Quote {
  id: number;
  policy_id: number;
  url: string;
  fetched: string;
  cover: number | null;
  premium: number | null;
  ncb: number | null;
  add_ons?: string[];
  deductible?: number | null;
  extractor: string;
  summary: string;
  evidence_snippet?: string;
  raw_html_hash?: string;
}

export interface Trace {
  id: number;
  policy_id: number;
  ts: string;
  step: TraceStep;
  tool?: string;
  detail: string;
  evidence?: any;
}

export interface RenewalAlert {
  id: number;
  policy_id: number;
  policy_no: string;
  expiry_date: string;
  days_remaining: number;
  severity: 'urgent' | 'warning' | 'info';
  message: string;
  created_at: string;
  dismissed: boolean;
}

export interface DetailedComparison {
  decision: PolicyStatus;
  flags: ComparisonFlag[];
  reasons: string[];
  old_value: {
    cover: number;
    ncb: number;
    premium?: number;
  };
  new_value: {
    cover: number | null;
    ncb: number | null;
    premium: number | null;
  };
  explanation: string;
  supporting_evidence: string;
}

export interface VerificationResult {
  status: VerificationStatus;
  quote_matches_page: boolean;
  cover_vs_last_year: string;
  observed_details: {
    cover: number | null;
    premium: number | null;
    ncb: number | null;
  };
  evidence: string;
}

export interface TestCaseResult {
  id: string;
  scenario: string;
  input: {
    policy: string;
    expiry: string;
    last_year_cover: number;
    last_year_ncb: number;
  };
  expected: string;
  actual: string;
  passed: boolean;
  flags?: ComparisonFlag[];
  alert_generated?: boolean;
  quote: Quote | null;
  verify: VerificationResult | null;
  evidence: string[];
}

export interface MockInsurerQuote {
  insurer: string;
  product: string;
  cover: number;
  premium: number;
  ncb: string | null; // e.g. "20%" or null
  deductible?: number;
  add_ons?: string[];
}

export interface AgentToolDeclaration {
  name: string;
  description: string;
  category: 'deterministic' | 'hybrid_llm' | 'io_scraper' | 'action_gate';
  parameters: Record<string, string>;
}
