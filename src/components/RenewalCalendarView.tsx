import React from 'react';
import { 
  Calendar, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  ShieldAlert, 
  ArrowRight, 
  X,
  ExternalLink,
  Bot
} from 'lucide-react';
import { PolicyData, RenewalAlert } from '../types.js';

interface RenewalCalendarViewProps {
  policies: PolicyData[];
  alerts: RenewalAlert[];
  onDismissAlert: (id: number) => void;
  onSelectPolicy: (policyNo: string) => void;
  onOpenAgent: (policyId: number) => void;
}

export const RenewalCalendarView: React.FC<RenewalCalendarViewProps> = ({
  policies,
  alerts,
  onDismissAlert,
  onSelectPolicy,
  onOpenAgent,
}) => {
  const activeAlerts = alerts.filter((a) => !a.dismissed);

  // Group policies by expiry bracket:
  // - Lapsed (< 0 days)
  // - Due in <= 30 days
  // - Due in 31 - 60 days
  // - Later (> 60 days)
  const lapsedPolicies = policies.filter((p) => p.days < 0);
  const due30Policies = policies.filter((p) => p.days >= 0 && p.days <= 30);
  const due60Policies = policies.filter((p) => p.days > 30 && p.days <= 60);
  const laterPolicies = policies.filter((p) => p.days > 60);

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-bold text-white tracking-tight">Policy Renewal Calendar & Alerts</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Automated Planning
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Deterministic calendar calculating remaining coverage duration. Policies expiring in exactly 30 days trigger renewal alerts; expired unrenewed policies are flagged with urgent warnings.
            </p>
          </div>
          <div className="text-xs text-slate-400">
            Active Alerts: <strong className="text-rose-400 font-bold">{activeAlerts.length}</strong>
          </div>
        </div>

        {/* Active Alerts Strip */}
        {activeAlerts.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-800 space-y-2.5">
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider block">
              System Renewal Notifications
            </span>
            <div className="space-y-2">
              {activeAlerts.map((alt) => (
                <div
                  key={alt.id}
                  className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
                    alt.severity === 'urgent'
                      ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                      : 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <ShieldAlert
                      className={`w-5 h-5 shrink-0 mt-0.5 ${
                        alt.severity === 'urgent' ? 'text-rose-400' : 'text-amber-400'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white font-mono">{alt.policy_no}</span>
                        <span className="text-[11px] px-2 py-0.2 rounded-full font-semibold uppercase bg-slate-900/60 border border-slate-800 text-slate-300">
                          {alt.severity}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Expires: {alt.expiry_date} ({alt.days_remaining}d)
                        </span>
                      </div>
                      <p className="text-xs mt-1 leading-relaxed">{alt.message}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onSelectPolicy(alt.policy_no)}
                      className="text-xs font-medium text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                    >
                      View Policy
                    </button>
                    <button
                      onClick={() => onDismissAlert(alt.id)}
                      className="p-1 text-slate-400 hover:text-white rounded-lg bg-slate-800/60 transition cursor-pointer"
                      title="Dismiss alert"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Calendar Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Bucket 1: Lapsed */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Expired / Lapsed
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                {lapsedPolicies.length}
              </span>
            </div>
            <div className="mt-3 space-y-2.5">
              {lapsedPolicies.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">No lapsed policies.</p>
              ) : (
                lapsedPolicies.map((p) => (
                  <div key={p.policy.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white font-mono">{p.policy.policy_no}</span>
                      <span className="text-rose-400 font-semibold">{p.days}d ago</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">{p.policy.insurer} &bull; {p.policy.kind}</p>
                    <div className="pt-1.5 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Expired: {p.policy.expiry}</span>
                      <button
                        onClick={() => onOpenAgent(p.policy.id)}
                        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                      >
                        <Bot className="w-3 h-3" /> Agent
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bucket 2: 30 Days Alert */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Due within 30 Days
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                {due30Policies.length}
              </span>
            </div>
            <div className="mt-3 space-y-2.5">
              {due30Policies.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">None due in 30 days.</p>
              ) : (
                due30Policies.map((p) => (
                  <div key={p.policy.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white font-mono">{p.policy.policy_no}</span>
                      <span className="text-amber-400 font-semibold">{p.days}d left</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">{p.policy.insurer} &bull; {p.policy.kind}</p>
                    <div className="pt-1.5 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">₹{p.policy.last_cover.toLocaleString()}</span>
                      <button
                        onClick={() => onOpenAgent(p.policy.id)}
                        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                      >
                        <Bot className="w-3 h-3" /> Agent
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bucket 3: 31-60 Days */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Due in 31–60 Days
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300">
                {due60Policies.length}
              </span>
            </div>
            <div className="mt-3 space-y-2.5">
              {due60Policies.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">None due in 31-60 days.</p>
              ) : (
                due60Policies.map((p) => (
                  <div key={p.policy.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white font-mono">{p.policy.policy_no}</span>
                      <span className="text-sky-400 font-semibold">{p.days}d left</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">{p.policy.insurer} &bull; {p.policy.kind}</p>
                    <div className="pt-1.5 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">₹{p.policy.last_cover.toLocaleString()}</span>
                      <button
                        onClick={() => onOpenAgent(p.policy.id)}
                        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                      >
                        <Bot className="w-3 h-3" /> Agent
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bucket 4: Later */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Active &gt;60 Days
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                {laterPolicies.length}
              </span>
            </div>
            <div className="mt-3 space-y-2.5">
              {laterPolicies.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">No later policies.</p>
              ) : (
                laterPolicies.map((p) => (
                  <div key={p.policy.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white font-mono">{p.policy.policy_no}</span>
                      <span className="text-emerald-400 font-semibold">{p.days}d left</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">{p.policy.insurer} &bull; {p.policy.kind}</p>
                    <div className="pt-1.5 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Expires: {p.policy.expiry}</span>
                      <button
                        onClick={() => onOpenAgent(p.policy.id)}
                        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                      >
                        <Bot className="w-3 h-3" /> Agent
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
