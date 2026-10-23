import { Policy, Action, Quote, Trace, ActionState, PolicyStatus, TraceStep, RenewalAlert, PolicyValidation } from './types.js';

export class PolicyStore {
  private policies: Policy[] = [];
  private actions: Action[] = [];
  private quotes: Quote[] = [];
  private trace: Trace[] = [];
  private alerts: RenewalAlert[] = [];
  
  private nextPolicyId = 1;
  private nextActionId = 1;
  private nextQuoteId = 1;
  private nextTraceId = 1;
  private nextAlertId = 1;

  constructor(today?: Date) {
    this.seed(today);
  }

  public seed(customToday?: Date) {
    this.policies = [];
    this.actions = [];
    this.quotes = [];
    this.trace = [];
    this.alerts = [];
    this.nextPolicyId = 1;
    this.nextActionId = 1;
    this.nextQuoteId = 1;
    this.nextTraceId = 1;
    this.nextAlertId = 1;

    const baseToday = customToday || new Date();

    const addDays = (d: number): string => {
      const date = new Date(baseToday);
      date.setDate(date.getDate() + d);
      return date.toISOString().split('T')[0];
    };

    const seeds = [
      {
        holder: 'Sharma family',
        kind: 'Car',
        insurer: 'Acme Motor',
        policy_no: 'KA01AB1234',
        days: 30,
        last_cover: 500000,
        last_ncb: 20,
        last_premium: 11000,
      },
      {
        holder: 'Sharma family',
        kind: 'Health',
        insurer: 'Shield Health',
        policy_no: 'HLTH-7788',
        days: 45,
        last_cover: 500000,
        last_ncb: 0,
        last_premium: 18000,
      },
      {
        holder: 'Sharma family',
        kind: 'Car',
        insurer: 'Acme Motor',
        policy_no: 'MH14EF9012',
        days: 60,
        last_cover: 600000,
        last_ncb: 25,
        last_premium: 13500,
      },
      {
        holder: 'Sharma family',
        kind: 'Bike',
        insurer: 'Acme Motor',
        policy_no: 'DL3CGH3456',
        days: -10,
        last_cover: 80000,
        last_ncb: 50,
        last_premium: 2000,
      },
    ];

    for (const s of seeds) {
      this.policies.push({
        id: this.nextPolicyId++,
        holder: s.holder,
        kind: s.kind,
        insurer: s.insurer,
        policy_no: s.policy_no,
        expiry: addDays(s.days),
        last_cover: s.last_cover,
        last_ncb: s.last_ncb,
        last_premium: s.last_premium,
        status: 'new',
        validation: { valid: true, errors: [], warnings: [] },
      });
    }
  }

  public getPolicies(): Policy[] {
    return [...this.policies].sort((a, b) => a.expiry.localeCompare(b.expiry));
  }

  public getPolicy(id: number): Policy | undefined {
    return this.policies.find((p) => p.id === id);
  }

  public getPolicyByNo(no: string): Policy | undefined {
    if (!no) return undefined;
    const clean = no.trim().toUpperCase();
    return this.policies.find((p) => p.policy_no.trim().toUpperCase() === clean);
  }

  public upsertPolicy(p: Omit<Policy, 'id' | 'status'>): { policy: Policy; isNew: boolean } {
    const cleanNo = p.policy_no.trim().toUpperCase();
    const existing = this.getPolicyByNo(cleanNo);
    if (existing) {
      existing.holder = p.holder || existing.holder;
      existing.kind = p.kind || existing.kind;
      existing.insurer = p.insurer || existing.insurer;
      existing.expiry = p.expiry;
      existing.last_cover = p.last_cover;
      existing.last_ncb = p.last_ncb;
      if (p.last_premium !== undefined) existing.last_premium = p.last_premium;
      return { policy: existing, isNew: false };
    }

    const newPolicy: Policy = {
      ...p,
      policy_no: cleanNo,
      id: this.nextPolicyId++,
      status: 'new',
    };
    this.policies.push(newPolicy);
    return { policy: newPolicy, isNew: true };
  }

  public addPolicy(p: Omit<Policy, 'id' | 'status'>): Policy {
    return this.upsertPolicy(p).policy;
  }

  public updatePolicy(id: number, updates: Partial<Policy>): void {
    const p = this.getPolicy(id);
    if (p) {
      Object.assign(p, updates);
    }
  }

  public updatePolicyStatus(id: number, status: PolicyStatus): void {
    const p = this.getPolicy(id);
    if (p) {
      p.status = status;
    }
  }

  public getActions(): Action[] {
    return [...this.actions];
  }

  public getAction(id: number): Action | undefined {
    return this.actions.find((a) => a.id === id);
  }

  public getLatestActionForPolicy(policyId: number): Action | undefined {
    const list = this.actions.filter((a) => a.policy_id === policyId);
    return list.length > 0 ? list[list.length - 1] : undefined;
  }

  public findActiveAction(policyId: number): Action | undefined {
    return this.actions.find(
      (a) => a.policy_id === policyId && ['pending', 'approved', 'done'].includes(a.state)
    );
  }

  public addAction(
    policyId: number, 
    url: string, 
    actionType: 'FETCH_RENEWAL_QUOTE' | 'APPLY_RENEWAL' | 'VERIFY_QUOTE' = 'FETCH_RENEWAL_QUOTE',
    state: ActionState = 'pending'
  ): Action {
    const action: Action = {
      id: this.nextActionId++,
      policy_id: policyId,
      action_type: actionType,
      url,
      state,
      created: new Date().toISOString(),
      approved: null,
      approver: null,
      quote_id: null,
      verification_status: 'PENDING',
    };
    this.actions.push(action);
    return action;
  }

  public updateAction(id: number, updates: Partial<Action>): Action | undefined {
    const a = this.getAction(id);
    if (a) {
      Object.assign(a, updates);
    }
    return a;
  }

  public getQuotes(): Quote[] {
    return [...this.quotes];
  }

  public getQuote(id: number): Quote | undefined {
    return this.quotes.find((q) => q.id === id);
  }

  public getLatestQuoteForPolicy(policyId: number): Quote | undefined {
    const list = this.quotes.filter((q) => q.policy_id === policyId);
    return list.length > 0 ? list[list.length - 1] : undefined;
  }

  public addQuote(quote: Omit<Quote, 'id'>): Quote {
    const newQuote: Quote = {
      ...quote,
      id: this.nextQuoteId++,
    };
    this.quotes.push(newQuote);
    return newQuote;
  }

  public getTraces(): Trace[] {
    return [...this.trace];
  }

  public getTracesForPolicy(policyId: number): Trace[] {
    return this.trace.filter((t) => t.policy_id === policyId).sort((a, b) => a.id - b.id);
  }

  public log(policyId: number, step: TraceStep, detail: string, tool?: string, evidence?: any): Trace {
    const entry: Trace = {
      id: this.nextTraceId++,
      policy_id: policyId,
      ts: new Date().toISOString().replace(/\.\d+Z$/, ''),
      step,
      tool,
      detail,
      evidence,
    };
    this.trace.push(entry);
    return entry;
  }

  // Renewal Alerts Store
  public getAlerts(): RenewalAlert[] {
    return [...this.alerts].sort((a, b) => a.days_remaining - b.days_remaining);
  }

  public addAlert(alertData: Omit<RenewalAlert, 'id' | 'created_at' | 'dismissed'>): RenewalAlert | null {
    // Prevent duplicate active alerts for the same policy and day
    const existing = this.alerts.find(
      (a) => a.policy_id === alertData.policy_id && a.days_remaining === alertData.days_remaining && !a.dismissed
    );
    if (existing) {
      return existing;
    }

    const alert: RenewalAlert = {
      ...alertData,
      id: this.nextAlertId++,
      created_at: new Date().toISOString().replace(/\.\d+Z$/, ''),
      dismissed: false,
    };
    this.alerts.push(alert);
    return alert;
  }

  public dismissAlert(alertId: number): boolean {
    const a = this.alerts.find((item) => item.id === alertId);
    if (a) {
      a.dismissed = true;
      return true;
    }
    return false;
  }
}

export const db = new PolicyStore();
