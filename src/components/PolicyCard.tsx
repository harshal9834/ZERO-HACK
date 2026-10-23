import React, { useState } from 'react';
import { 
  Car, 
  Heart, 
  Bike, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  RotateCw, 
  Check, 
  FileText,
  Sparkles
} from 'lucide-react';
import { PolicyData } from '../types.js';

interface PolicyCardProps {
  data: PolicyData;
  onPropose: (policyId: number) => void;
  onApprove: (actionId: number) => void;
  onReject: (actionId: number) => void;
  onVerify: (actionId: number) => void;
  onInspectMock: (policyNo: string) => void;
  onViewTrace: (policyId: number) => void;
  isProcessing: boolean;
}

export const PolicyCard: React.FC<PolicyCardProps> = ({
  data,
  onPropose,
  onApprove,
  onReject,
  onVerify,
  onInspectMock,
  onViewTrace,
  isProcessing,
}) => {
  const { policy, days, quote, action, trace } = data;
  const [showTraces, setShowTraces] = useState(false);

  const getKindIcon = (kind: string) => {
    switch (kind.toLowerCase()) {
      case 'car':
        return <Car className="w-4 h-4 text-sky-400" />;
      case 'health':
        return <Heart className="w-4 h-4 text-rose-400" />;
      case 'bike':
      case 'two-wheeler':
        return <Bike className="w-4 h-4 text-emerald-400" />;
      default:
        return <Shield className="w-4 h-4 text-indigo-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'flagged':
        return (
          <div className="flex flex-col items-end gap-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <AlertTriangle className="w-3.5 h-3.5" />
              Flagged Discrepancy
            </span>
            {coverDifference !== null && coverDifference < 0 && (
              <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800/60">
                REDUCED_COVERAGE
              </span>
            )}
            {isNcbReducedOrMissing && (
              <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800/60">
                NCB_MISSING
              </span>
            )}
          </div>
        );
      case 'alert':
        return (
          <div className="flex flex-col items-end gap-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Clock className="w-3.5 h-3.5" />
              Alert ({days}d left)
            </span>
            {days === 30 && (
              <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800/60">
                RENEWAL_ALERT
              </span>
            )}
          </div>
        );
      case 'lapsed':
        return (
          <div className="flex flex-col items-end gap-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-700/60">
              <XCircle className="w-3.5 h-3.5" />
              LAPSED (Expired)
            </span>
          </div>
        );
      case 'ok':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Cover OK
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            New / Unchecked
          </span>
        );
    }
  };

  const coverDifference = quote?.cover !== null && quote?.cover !== undefined
    ? quote.cover - policy.last_cover
    : null;

  const isNcbReducedOrMissing =
    policy.last_ncb > 0 && (quote?.ncb === null || quote?.ncb === undefined || quote.ncb < policy.last_ncb);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:border-slate-700 transition flex flex-col justify-between">
      {/* Top Header Card */}
      <div className="p-5 border-b border-slate-800/80 bg-slate-900/60">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700/60">
              {getKindIcon(policy.kind)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white tracking-tight">{policy.policy_no}</span>
                <span className="text-xs text-slate-400 font-normal">({policy.kind})</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {policy.insurer} &bull; <span className="text-slate-300">{policy.holder}</span>
              </p>
            </div>
          </div>
          <div>{getStatusBadge(policy.status)}</div>
        </div>

        {/* Expiry Pill */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/40">
          <span>Expires: <strong className="text-slate-200">{policy.expiry}</strong></span>
          <span className={days < 0 ? 'text-rose-400 font-semibold' : days <= 30 ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
            {days < 0 ? `Expired ${-days} days ago` : `${days} days remaining`}
          </span>
        </div>
      </div>

      {/* Middle Body: Baseline vs Renewal Comparison */}
      <div className="p-5 space-y-4">
        {/* Baseline Strip */}
        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 text-xs">
          <div className="text-slate-400 font-medium mb-1.5 flex items-center justify-between">
            <span>Previous Policy Baseline:</span>
            <span className="text-[11px] text-slate-500">Last Year</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500 block text-[11px]">Sum Insured (Cover)</span>
              <span className="font-semibold text-slate-200 text-sm">₹{policy.last_cover.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">No-Claim Bonus</span>
              <span className="font-semibold text-slate-200 text-sm">{policy.last_ncb}%</span>
            </div>
          </div>
        </div>

        {/* Renewal Quote Section */}
        {quote ? (
          <div className="bg-slate-950/90 rounded-xl p-3.5 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                Renewal Quote Received
              </span>
              <span className="text-[11px] text-slate-500">{quote.fetched.split('T')[0]}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">New Cover</span>
                <span className="font-bold text-white text-sm">
                  {quote.cover ? `₹${quote.cover.toLocaleString()}` : 'Missing'}
                </span>
                {coverDifference !== null && coverDifference < 0 && (
                  <span className="block text-[10px] text-rose-400 font-medium mt-0.5">
                    Reduced by ₹{(-coverDifference).toLocaleString()}!
                  </span>
                )}
                {coverDifference === 0 && (
                  <span className="block text-[10px] text-emerald-400 font-medium mt-0.5">
                    Unchanged
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Renewal Premium</span>
                <span className="font-bold text-white text-sm">
                  {quote.premium ? `₹${quote.premium.toLocaleString()}` : 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">NCB Offered</span>
                <span className="font-bold text-white text-sm">
                  {quote.ncb !== null ? `${quote.ncb}%` : 'Missing / 0%'}
                </span>
                {isNcbReducedOrMissing && (
                  <span className="block text-[10px] text-rose-400 font-medium mt-0.5">
                    Lost {policy.last_ncb}% NCB!
                  </span>
                )}
              </div>
            </div>

            {/* Extractor info & Verification tag */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="truncate pr-2">
                Extractor: <strong className="text-indigo-300 font-normal">{quote.extractor}</strong>
              </span>
              <span className="shrink-0 flex items-center gap-1 font-mono font-semibold">
                Status:
                <span className={`px-2 py-0.5 rounded text-[10px] ${
                  action?.verification_status === 'VERIFIED'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                    : action?.verification_status === 'FAILED'
                    ? 'bg-rose-950 text-rose-300 border border-rose-700/60'
                    : 'bg-amber-950 text-amber-300 border border-amber-700/60'
                }`}>
                  {action?.verification_status || 'VERIFIED'}
                </span>
              </span>
            </div>

            {/* AI Summary / Household explanation */}
            <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-semibold text-slate-200 block text-[11px]">Household Summary:</span>
                {quote.summary}
              </div>
            </div>

            {action?.approver && (
              <div className="text-[10px] font-mono text-slate-500 pt-1 flex items-center justify-between">
                <span>Authorized by: <strong className="text-slate-400">{action.approver}</strong></span>
                <span>Timestamp: {action.approved?.replace('T', ' ')}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-950/40 rounded-xl p-4 border border-dashed border-slate-800 text-center">
            {policy.status === 'lapsed' ? (
              <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-3 text-left space-y-1">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>URGENT WARNING: Policy Lapsed</span>
                </div>
                <p className="text-xs text-rose-200/90 leading-relaxed">
                  Policy expired {Math.abs(days)} days ago. Deterministic agent safety rule automatically prohibited scraping quotes for expired unrenewed coverage.
                </p>
              </div>
            ) : action?.state === 'pending' ? (
              <p className="text-xs text-slate-400">
                Plan ready. Waiting for human authorization to fetch quote.
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                No quote fetched yet. Run agent plan to inspect renewal.
              </p>
            )}
          </div>
        )}

        {/* Human-in-the-Loop Approval Action Box */}
        {action?.state === 'pending' && (
          <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-3.5 space-y-2.5 shadow-md">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              Human Approval Gate Required
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              Agent requests approval to scrape renewal quote from <code className="bg-amber-950 px-1 py-0.5 rounded text-[11px] text-amber-300">{action.url}</code>.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onApprove(action.id)}
                disabled={isProcessing}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve & Fetch Quote</span>
              </button>
              <button
                onClick={() => onReject(action.id)}
                disabled={isProcessing}
                className="py-2 px-3 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        )}

        {/* Status is New -> Button to propose */}
        {policy.status === 'new' && !action && (
          <button
            onClick={() => onPropose(policy.id)}
            disabled={isProcessing}
            className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Propose Renewal Plan</span>
          </button>
        )}
      </div>

      {/* Footer Tools & Traces Accordion */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/40 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          {action?.state === 'done' && (
            <button
              onClick={() => onVerify(action.id)}
              disabled={isProcessing}
              title="Perform independent live verification check"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            >
              <RotateCw className="w-3 h-3 text-indigo-400" />
              <span>Verify</span>
            </button>
          )}

          <button
            onClick={() => onInspectMock(policy.policy_no)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
          >
            <ExternalLink className="w-3 h-3 text-slate-400" />
            <span>Mock Portal</span>
          </button>
        </div>

        <button
          onClick={() => setShowTraces(!showTraces)}
          className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 transition cursor-pointer text-xs"
        >
          <span>Audit Trace ({trace.length})</span>
          {showTraces ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expandable Trace Strip */}
      {showTraces && (
        <div className="bg-slate-950 p-4 border-t border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-300 text-xs">Event Audit Trail:</span>
            <button
              onClick={() => onViewTrace(policy.id)}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 transition"
            >
              Open Full Trace View &rarr;
            </button>
          </div>
          {trace.length === 0 ? (
            <p className="text-slate-500 italic">No events logged yet.</p>
          ) : (
            <div className="space-y-1.5 font-mono text-[11px]">
              {trace.map((t) => (
                <div key={t.id} className="flex items-start gap-2 text-slate-400">
                  <span className="text-slate-600 shrink-0">{t.ts.split('T')[1]}</span>
                  <span
                    className={`font-semibold shrink-0 ${
                      t.step === 'PLAN'
                        ? 'text-sky-400'
                        : t.step === 'APPROVAL'
                        ? 'text-amber-400'
                        : t.step === 'APPROVED'
                        ? 'text-emerald-400'
                        : t.step === 'TOOL CALL'
                        ? 'text-purple-400'
                        : t.step === 'DECIDE'
                        ? 'text-indigo-400'
                        : t.step === 'VERIFY'
                        ? 'text-teal-400'
                        : 'text-rose-400'
                    }`}
                  >
                    [{t.step}]
                  </span>
                  <span className="text-slate-300 break-all">{t.detail}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
