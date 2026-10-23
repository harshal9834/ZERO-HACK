import { GoogleGenAI } from '@google/genai';
import { PolicyStore } from './db.js';
import { getMockQuote, renderMockPageHtml } from './mockInsurer.js';
import * as rules from './rules.js';
import { ParsedQuoteValues } from './rules.js';
import { 
  Policy, 
  Action, 
  Quote, 
  VerificationResult, 
  RenewalAlert, 
  DetailedComparison, 
  AgentToolDeclaration,
  TraceStep 
} from './types.js';

let genAIClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

export function isGeminiEnabled(): boolean {
  return getGeminiClient() !== null;
}

/**
 * 10 Controlled Agent Tools
 */
export const AGENT_TOOLS: AgentToolDeclaration[] = [
  {
    name: 'get_policy_details',
    description: 'Retrieve insurance policy record, baseline sum insured, expiry, and NCB history.',
    category: 'deterministic',
    parameters: { policyId: 'number' },
  },
  {
    name: 'validate_policy',
    description: 'Validate policy format, ID uniqueness, expiry format, coverage and benefit constraints.',
    category: 'deterministic',
    parameters: { policyId: 'number' },
  },
  {
    name: 'calculate_expiry_status',
    description: 'Calculate days remaining until expiry, identify lapse risk or alert requirements.',
    category: 'deterministic',
    parameters: { policyId: 'number', today: 'ISO date string' },
  },
  {
    name: 'generate_renewal_alert',
    description: 'Generate and record urgent warning or 30-day renewal notification without duplicates.',
    category: 'deterministic',
    parameters: { policyId: 'number', daysRemaining: 'number' },
  },
  {
    name: 'request_human_approval',
    description: 'Create a human approval gate requiring explicit authorization prior to scraping external insurer quotes.',
    category: 'action_gate',
    parameters: { policyId: 'number', destinationUrl: 'string' },
  },
  {
    name: 'fetch_mock_renewal_quote',
    description: 'Fetch renewal quote page from mock insurer portal and extract HTML elements.',
    category: 'io_scraper',
    parameters: { url: 'string' },
  },
  {
    name: 'compare_policy_coverage',
    description: 'Run deterministic comparison rules to flag REDUCED_COVERAGE, NCB_MISSING, or NEEDS_REVIEW.',
    category: 'deterministic',
    parameters: { policyId: 'number', quote: 'object' },
  },
  {
    name: 'execute_approved_action',
    description: 'Execute an approved tool call, preventing duplicate runs and verifying authorization.',
    category: 'action_gate',
    parameters: { actionId: 'number', approver: 'string' },
  },
  {
    name: 'verify_policy_result',
    description: 'Independently re-fetch live portal state and verify stored quote accuracy.',
    category: 'io_scraper',
    parameters: { actionId: 'number' },
  },
  {
    name: 'save_audit_record',
    description: 'Record immutable timestamped trace event with step name, tool call, and evidence.',
    category: 'deterministic',
    parameters: { policyId: 'number', step: 'string', detail: 'string' },
  },
];

// Helper: parse numbers from text
function extractNumber(text: string | null | undefined): number | null {
  if (!text) return null;
  const match = text.match(/\d[\d,]*/);
  if (!match) return null;
  const cleaned = match[0].replace(/,/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? null : parsed;
}

export function parseQuoteHtml(html: string): { values: ParsedQuoteValues; textContent: string } {
  const getElementText = (id: string): string => {
    const regex = new RegExp(`id=["']${id}["'][^>]*>([^<]*)<`, 'i');
    const m = html.match(regex);
    return m ? m[1].trim() : '';
  };

  const coverText = getElementText('cover');
  const premiumText = getElementText('premium');
  const ncbText = getElementText('ncb');

  const cover = extractNumber(coverText);
  const premium = extractNumber(premiumText);
  const ncb = ncbText && ncbText !== '-' && !/none/i.test(ncbText) ? extractNumber(ncbText) : null;
  const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  return {
    values: { cover, premium, ncb },
    textContent: plainText,
  };
}

export function fetchPage(url: string): string {
  const parts = url.split('/');
  const policyNo = parts[parts.length - 1];
  const quote = getMockQuote(policyNo);
  if (!quote) {
    throw new Error(`Insurer quote page not found for policy ${policyNo}`);
  }
  return renderMockPageHtml(policyNo, quote);
}

function withTimeout<T>(promise: Promise<T>, ms: number = 1200): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini call timed out after ${ms}ms`)), ms)
    ),
  ]);
}

async function geminiExtract(text: string): Promise<ParsedQuoteValues | null> {
  const client = getGeminiClient();
  if (!client) return null;

  try {
    const prompt =
      'Return ONLY JSON with integer keys cover, premium, ncb (null if absent) from this insurance quote page text:\n' +
      text;

    const res = await withTimeout(
      client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      }),
      1200
    );

    const outputText = res.text?.trim() || '';
    const cleaned = outputText.replace(/```(?:json)?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      cover: typeof parsed.cover === 'number' ? parsed.cover : null,
      premium: typeof parsed.premium === 'number' ? parsed.premium : null,
      ncb: typeof parsed.ncb === 'number' ? parsed.ncb : null,
    };
  } catch {
    return null;
  }
}

async function geminiSummary(prompt: string): Promise<string | null> {
  const client = getGeminiClient();
  if (!client) return null;

  try {
    const res = await withTimeout(
      client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      }),
      1200
    );
    return res.text?.trim() || null;
  } catch {
    return null;
  }
}

// ==========================================
// 10 Controlled Tools Implementations
// ==========================================

export function tool_get_policy_details(store: PolicyStore, policyId: number): Policy {
  const p = store.getPolicy(policyId);
  if (!p) throw new Error(`Policy ${policyId} not found`);
  return p;
}

export function tool_validate_policy(store: PolicyStore, policyId: number): { valid: boolean; errors: string[]; warnings: string[] } {
  const p = tool_get_policy_details(store, policyId);
  const validation = rules.validatePolicyRecord(p);
  store.updatePolicy(policyId, { validation });
  store.log(
    policyId,
    'VALIDATE',
    `Policy validation: ${validation.valid ? 'PASSED' : 'FAILED with errors: ' + validation.errors.join(', ')}`,
    'validate_policy',
    validation
  );
  return validation;
}

export function tool_calculate_expiry_status(store: PolicyStore, policyId: number, today: Date = new Date()): { status: string; days: number; isExactly30Days: boolean } {
  const p = tool_get_policy_details(store, policyId);
  const result = rules.expiryStatus(p.expiry, today);
  store.log(
    policyId,
    'PLAN',
    `${p.policy_no} expires ${p.expiry} (${result.days} days) -> ${result.status}; compare renewal with last year's cover`,
    'calculate_expiry_status',
    result
  );
  store.updatePolicyStatus(policyId, result.status);
  return result;
}

export function tool_generate_renewal_alert(store: PolicyStore, policyId: number, today: Date = new Date()): RenewalAlert | null {
  const p = tool_get_policy_details(store, policyId);
  const { status, days, isExactly30Days } = rules.expiryStatus(p.expiry, today);

  if (status === 'lapsed') {
    return store.addAlert({
      policy_id: policyId,
      policy_no: p.policy_no,
      expiry_date: p.expiry,
      days_remaining: days,
      severity: 'urgent',
      message: `URGENT WARNING: Policy ${p.policy_no} has EXPIRED (${-days} days ago). Coverage lapsed. Immediate renewal action required!`,
    });
  }

  if (status === 'alert') {
    return store.addAlert({
      policy_id: policyId,
      policy_no: p.policy_no,
      expiry_date: p.expiry,
      days_remaining: days,
      severity: isExactly30Days ? 'urgent' : 'warning',
      message: isExactly30Days
        ? `RENEWAL ALERT: Policy ${p.policy_no} (${p.kind}) expires in exactly 30 days on ${p.expiry}. Compare renewal quote before expiry.`
        : `Policy ${p.policy_no} expires in ${days} days (${p.expiry}). Renewal attention required.`,
    });
  }

  return null;
}

export function tool_request_human_approval(
  store: PolicyStore,
  policyId: number,
  destinationUrl: string,
  actionType: 'FETCH_RENEWAL_QUOTE' | 'APPLY_RENEWAL' | 'VERIFY_QUOTE' = 'FETCH_RENEWAL_QUOTE'
): Action {
  const existing = store.findActiveAction(policyId);
  if (existing) {
    return existing;
  }
  const action = store.addAction(policyId, destinationUrl, actionType, 'pending');
  store.log(
    policyId,
    'APPROVAL',
    `Waiting for human approval to fetch renewal quote from ${destinationUrl}`,
    'request_human_approval',
    { actionId: action.id, destinationUrl }
  );
  return action;
}

export function tool_fetch_mock_renewal_quote(url: string): { values: ParsedQuoteValues; textContent: string; rawHtml: string } {
  const html = fetchPage(url);
  const parsed = parseQuoteHtml(html);
  return {
    values: parsed.values,
    textContent: parsed.textContent,
    rawHtml: html,
  };
}

export function tool_compare_policy_coverage(policy: Policy, quote: ParsedQuoteValues, today: Date = new Date()): DetailedComparison {
  return rules.decide(policy, quote, today);
}

export async function tool_execute_approved_action(
  store: PolicyStore,
  actionId: number,
  approver: string = 'Human User',
  today: Date = new Date(),
  skipAi: boolean = false
): Promise<'done' | 'failed' | 'ignored'> {
  const action = store.getAction(actionId);
  if (!action || action.state !== 'pending') {
    return 'ignored';
  }

  const nowIso = new Date().toISOString().replace(/\.\d+Z$/, '');
  store.updateAction(actionId, {
    state: 'approved',
    approved: nowIso,
    approver,
  });

  const p = store.getPolicy(action.policy_id)!;
  store.log(p.id, 'APPROVED', `Action approved by ${approver}: GET ${action.url}`, 'execute_approved_action');

  let fetchedData: { values: ParsedQuoteValues; textContent: string; rawHtml: string };
  try {
    fetchedData = tool_fetch_mock_renewal_quote(action.url);
    const v = fetchedData.values;
    store.log(
      p.id,
      'TOOL CALL',
      `GET ${action.url} -> cover=${v.cover} premium=${v.premium} ncb=${v.ncb}`,
      'fetch_mock_renewal_quote',
      { url: action.url, values: v }
    );
  } catch (err: any) {
    store.updateAction(actionId, { state: 'failed' });
    store.log(p.id, 'FAILED', err?.message || String(err), 'fetch_mock_renewal_quote');
    return 'failed';
  }

  const vals = fetchedData.values;
  const geminiResult = skipAi ? null : await geminiExtract(fetchedData.textContent);

  let extractorInfo = 'parser (Gemini not used)';
  if (geminiResult) {
    const match =
      geminiResult.cover === vals.cover &&
      geminiResult.premium === vals.premium &&
      geminiResult.ncb === vals.ncb;
    if (match) {
      extractorInfo = 'Gemini extraction (cross-checked with parser: match)';
    } else {
      extractorInfo = `parser (Gemini differed: ${JSON.stringify(geminiResult)})`;
    }
  }

  const comparison = tool_compare_policy_coverage(p, vals, today);
  const fallbackSummary = `${comparison.decision.toUpperCase()}: ${comparison.reasons.join('; ')}`;

  const prompt = `In 2 short sentences, explain this renewal check to a household. Decision: ${comparison.decision}. Reasons: ${comparison.reasons.join(
    ', '
  )}. Last year cover ${p.last_cover}, quote ${JSON.stringify(vals)}.`;

  const aiSummary = skipAi ? null : await geminiSummary(prompt);
  const summary = aiSummary || fallbackSummary;

  const quote = store.addQuote({
    policy_id: p.id,
    url: action.url,
    fetched: nowIso,
    cover: vals.cover,
    premium: vals.premium,
    ncb: vals.ncb,
    extractor: extractorInfo,
    summary,
    evidence_snippet: comparison.supporting_evidence,
  });

  store.updateAction(actionId, {
    state: 'done',
    quote_id: quote.id,
  });
  store.updatePolicyStatus(p.id, comparison.decision);
  store.log(
    p.id,
    'DECIDE',
    `${comparison.decision} - ${comparison.reasons.join('; ')} [${extractorInfo}]`,
    'compare_policy_coverage',
    comparison
  );

  // Automatically trigger verification
  tool_verify_policy_result(store, actionId);

  return 'done';
}

export function tool_verify_policy_result(store: PolicyStore, actionId: number): VerificationResult | null {
  const action = store.getAction(actionId);
  if (!action || !action.quote_id) return null;

  const p = store.getPolicy(action.policy_id);
  const q = store.getQuote(action.quote_id);
  if (!p || !q) return null;

  const html = fetchPage(action.url);
  const seen = parseQuoteHtml(html).values;

  const same = seen.cover === q.cover && seen.premium === q.premium && seen.ncb === q.ncb;
  const coverChange =
    seen.cover === p.last_cover ? 'unchanged' : `CHANGED (${p.last_cover} -> ${seen.cover})`;

  const status = same ? 'VERIFIED' : 'FAILED';
  store.updateAction(actionId, { verification_status: status });

  const result: VerificationResult = {
    status,
    quote_matches_page: same,
    cover_vs_last_year: coverChange,
    observed_details: seen,
    evidence: `Live portal state re-read: Cover=₹${seen.cover?.toLocaleString()}, Premium=₹${seen.premium?.toLocaleString()}, NCB=${seen.ncb}%. Verified against stored quote #${q.id}.`,
  };

  store.log(
    p.id,
    'VERIFY',
    `stored quote matches live page: ${same ? 'True' : 'False'}; cover vs last year: ${coverChange}`,
    'verify_policy_result',
    result
  );

  return result;
}

export function tool_save_audit_record(
  store: PolicyStore,
  policyId: number,
  step: TraceStep,
  detail: string,
  tool?: string,
  evidence?: any
) {
  return store.log(policyId, step, detail, tool, evidence);
}

// ==========================================
// Master Autonomous Workflow Engine
// ==========================================

export async function runAutonomousWorkflow(
  store: PolicyStore,
  policyId?: number,
  options: { autoApproveSimulation?: boolean; today?: Date; skipAi?: boolean } = {}
) {
  const today = options.today || new Date();
  const policiesToRun = policyId 
    ? [store.getPolicy(policyId)].filter(Boolean) as Policy[]
    : store.getPolicies();

  const results = [];

  for (const policy of policiesToRun) {
    // Step 1: Validate
    const validation = tool_validate_policy(store, policy.id);
    if (!validation.valid) {
      results.push({ policyId: policy.id, stage: 'VALIDATE_FAILED', errors: validation.errors });
      continue;
    }

    // Step 2: Calculate Expiry & Alert
    const expiry = tool_calculate_expiry_status(store, policy.id, today);
    tool_generate_renewal_alert(store, policy.id, today);

    if (expiry.status === 'lapsed') {
      tool_save_audit_record(store, policy.id, 'DECIDE', 'policy expired -> marked lapsed; no quote fetched', 'calculate_expiry_status');
      results.push({ policyId: policy.id, stage: 'LAPSED' });
      continue;
    }

    // Step 3: Plan & Request Human Approval
    const url = `/insurer/${policy.policy_no}`;
    const action = tool_request_human_approval(store, policy.id, url);

    // Step 4: If auto-approval simulation requested (for automated runs/tests)
    if (options.autoApproveSimulation && action.state === 'pending') {
      const execResult = await tool_execute_approved_action(store, action.id, 'Simulated Approver', today, options.skipAi ?? true);
      const verifyResult = tool_verify_policy_result(store, action.id);
      results.push({ policyId: policy.id, stage: 'COMPLETED', execResult, verifyResult });
    } else {
      results.push({ policyId: policy.id, stage: 'AWAITING_APPROVAL', actionId: action.id });
    }
  }

  return results;
}

// Backward-compatible wrappers for existing calls
export function propose(store: PolicyStore, policyId: number, today: Date = new Date()): number | null {
  tool_validate_policy(store, policyId);
  const expiry = tool_calculate_expiry_status(store, policyId, today);
  tool_generate_renewal_alert(store, policyId, today);

  if (expiry.status === 'lapsed') {
    tool_save_audit_record(store, policyId, 'DECIDE', 'policy expired -> marked lapsed; no quote fetched');
    return null;
  }

  const p = store.getPolicy(policyId)!;
  const action = tool_request_human_approval(store, policyId, `/insurer/${p.policy_no}`);
  return action.id;
}

export async function approve(
  store: PolicyStore,
  actionId: number,
  today: Date = new Date(),
  skipAi: boolean = false
): Promise<'done' | 'failed' | 'ignored'> {
  return tool_execute_approved_action(store, actionId, 'Human User', today, skipAi);
}

export function reject(store: PolicyStore, actionId: number): boolean {
  const action = store.getAction(actionId);
  if (!action || action.state !== 'pending') return false;

  store.updateAction(actionId, { state: 'rejected', rejection_reason: 'Rejected by user in UI' });
  store.log(action.policy_id, 'REJECTED', `Human rejected fetch of renewal quote from ${action.url}`, 'request_human_approval');
  return true;
}

export function verify(store: PolicyStore, actionId: number): VerificationResult | null {
  return tool_verify_policy_result(store, actionId);
}
