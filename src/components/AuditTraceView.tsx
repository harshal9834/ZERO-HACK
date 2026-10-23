import React, { useState } from 'react';
import { 
  Clock, 
  Filter, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Bot, 
  UserCheck, 
  CheckCheck,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { PolicyData, TraceStep } from '../types.js';

interface AuditTraceViewProps {
  policies: PolicyData[];
  selectedPolicyId: number | null;
  onSelectPolicy: (id: number | null) => void;
}

export const AuditTraceView: React.FC<AuditTraceViewProps> = ({
  policies,
  selectedPolicyId,
  onSelectPolicy,
}) => {
  const [stepFilter, setStepFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Collect all traces flattened with policy context
  const allTraces = policies.flatMap((p) =>
    p.trace.map((t) => ({
      ...t,
      policyNo: p.policy.policy_no,
      policyHolder: p.policy.holder,
      policyKind: p.policy.kind,
    }))
  ).sort((a, b) => b.id - a.id); // newest first

  const filteredTraces = allTraces.filter((t) => {
    if (selectedPolicyId !== null && t.policy_id !== selectedPolicyId) {
      return false;
    }
    if (stepFilter !== 'ALL' && t.step !== stepFilter) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        t.detail.toLowerCase().includes(q) ||
        t.policyNo.toLowerCase().includes(q) ||
        t.step.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStepIcon = (step: TraceStep) => {
    switch (step) {
      case 'PLAN':
        return <Bot className="w-4 h-4 text-sky-400" />;
      case 'APPROVAL':
        return <UserCheck className="w-4 h-4 text-amber-400" />;
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'TOOL CALL':
        return <FileText className="w-4 h-4 text-purple-400" />;
      case 'DECIDE':
        return <ShieldAlert className="w-4 h-4 text-indigo-400" />;
      case 'VERIFY':
        return <CheckCheck className="w-4 h-4 text-teal-400" />;
      case 'FAILED':
      case 'REJECTED':
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
    }
  };

  const getStepBadgeColor = (step: TraceStep) => {
    switch (step) {
      case 'PLAN':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'APPROVAL':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'APPROVED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'TOOL CALL':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'DECIDE':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'VERIFY':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case 'FAILED':
      case 'REJECTED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" />
              Agent Audit & Decision Trace
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Every decision, scraper tool invocation, human approval, and independent verification event is recorded with immutable audit timestamps.
            </p>
          </div>
          <div className="text-xs text-slate-400">
            Total Logged Events: <strong className="text-white">{allTraces.length}</strong>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800">
          {/* Policy filter */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Filter by Policy:</label>
            <select
              value={selectedPolicyId ?? ''}
              onChange={(e) => onSelectPolicy(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Policies ({policies.length})</option>
              {policies.map((p) => (
                <option key={p.policy.id} value={p.policy.id}>
                  {p.policy.policy_no} - {p.policy.kind} ({p.policy.status})
                </option>
              ))}
            </select>
          </div>

          {/* Step filter */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Filter by Step:</label>
            <select
              value={stepFilter}
              onChange={(e) => setStepFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Steps (PLAN, APPROVAL, TOOL CALL...)</option>
              <option value="PLAN">PLAN</option>
              <option value="APPROVAL">APPROVAL (Human Gate)</option>
              <option value="APPROVED">APPROVED</option>
              <option value="TOOL CALL">TOOL CALL (Scraper)</option>
              <option value="DECIDE">DECIDE (Rules Engine)</option>
              <option value="VERIFY">VERIFY (Independent Check)</option>
              <option value="FAILED">FAILED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          {/* Text Search */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Search Keywords:</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search trace details, policy number..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Trace Timeline List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {filteredTraces.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No trace events match your filter criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredTraces.map((item) => (
              <div key={item.id} className="p-4 sm:p-5 hover:bg-slate-800/30 transition flex items-start gap-4">
                <div className="mt-1 w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                  {getStepIcon(item.step)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border font-mono ${getStepBadgeColor(
                          item.step
                        )}`}
                      >
                        {item.step}
                      </span>
                      <code className="text-xs bg-slate-950 text-slate-300 px-2 py-0.5 rounded border border-slate-800 font-mono">
                        {item.policyNo}
                      </code>
                      <span className="text-xs text-slate-400 hidden sm:inline">
                        &bull; {item.policyKind} ({item.policyHolder})
                      </span>
                    </div>

                    <span className="text-xs font-mono text-slate-500">
                      {item.ts.replace('T', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 font-mono bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/60 break-all leading-relaxed mt-1.5">
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
