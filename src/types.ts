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
  kind: string;
  insurer: string;
  policy_no: string;
  expiry: string;
  last_cover: number;
  last_ncb: number;
  last_premium?: number;
  status: PolicyStatus;
  validation?: PolicyValidation;
}

export interface Action {
  id: number;
  policy_id: number;
  action_type?: string;
  url: string;
  state: ActionState;
  created: string;
  approved?: string | null;
  approver?: string | null;
  quote_id?: number | null;
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
  extractor: string;
  summary: string;
  evidence_snippet?: string;
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

export interface PolicyData {
  policy: Policy;
  days: number;
  quote: Quote | null;
  action: Action | null;
  trace: Trace[];
  alerts?: RenewalAlert[];
}

export interface VerificationResult {
  status?: VerificationStatus;
  quote_matches_page: boolean;
  cover_vs_last_year: string;
  observed_details?: {
    cover: number | null;
    premium: number | null;
    ncb: number | null;
  };
  evidence?: string;
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
  ncb: string | null;
}

export interface AgentToolDeclaration {
  name: string;
  description: string;
  category: 'deterministic' | 'hybrid_llm' | 'io_scraper' | 'action_gate';
  parameters: Record<string, string>;
}
