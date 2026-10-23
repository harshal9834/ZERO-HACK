import React, { useState } from 'react';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Download, 
  FileCode, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle,
  RotateCw,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { TestCaseResult } from '../types.js';

interface TestSuiteViewProps {
  testResults: TestCaseResult[] | null;
  isRunning: boolean;
  onRunTests: () => void;
  onInspectPolicy: (policyNo: string) => void;
}

export const TestSuiteView: React.FC<TestSuiteViewProps> = ({
  testResults,
  isRunning,
  onRunTests,
  onInspectPolicy,
}) => {
  const [expandedTc, setExpandedTc] = useState<string | null>(null);

  const downloadJsonEvidence = () => {
    if (!testResults) return;
    const blob = new Blob([JSON.stringify(testResults, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test_evidence.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const allPassed = testResults && testResults.length > 0 && testResults.every((t) => t.passed);

  return (
    <div className="space-y-6">
      {/* Banner Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Official Test Suite Runner</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                4 Official Test Cases (TC1 – TC4)
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Automated execution mirroring <code className="text-indigo-300 bg-slate-950 px-1 py-0.5 rounded text-xs">tests_runner.py</code>. 
              Tests run in a sandboxed, isolated test store and evaluate deterministic decision rules, human approval gate simulation, and verification audit trails.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {testResults && (
              <button
                onClick={downloadJsonEvidence}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export test_evidence.json</span>
              </button>
            )}

            <button
              onClick={onRunTests}
              disabled={isRunning}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Executing Sandboxed Suite...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Run All Test Cases</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Suite Status Summary */}
        {testResults && (
          <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  allPassed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {allPassed ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {allPassed ? 'All 4 Test Cases Passed 100%' : 'Some Test Cases Failed'}
                </p>
                <p className="text-xs text-slate-400">
                  {testResults.filter((t) => t.passed).length} of {testResults.length} test assertions verified against expected outcomes.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span>Artifact Output:</span>
              <code className="text-emerald-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                test_evidence.json ready
              </code>
            </div>
          </div>
        )}
      </div>

      {/* Test Cases Table / Cards */}
      <div className="space-y-4">
        {(!testResults || testResults.length === 0) && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
            <FileCode className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-200">No Test Results Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-5">
              Click &quot;Run All Test Cases&quot; to execute TC1 through TC4. The suite will test policy expiry detection, sum insured reduction, missing NCB, and lapsed policy handling.
            </p>
            <button
              onClick={onRunTests}
              disabled={isRunning}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Run Sandboxed Tests Now</span>
            </button>
          </div>
        )}

        {testResults?.map((tc) => {
          const isExpanded = expandedTc === tc.id;
          return (
            <div
              key={tc.id}
              className={`bg-slate-900 border rounded-2xl overflow-hidden transition shadow-sm ${
                tc.passed ? 'border-slate-800 hover:border-slate-700' : 'border-rose-900/60'
              }`}
            >
              {/* Header row */}
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      tc.passed
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {tc.id}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-white">{tc.scenario}</h4>
                      <code className="text-xs bg-slate-950 text-indigo-300 px-1.5 py-0.5 rounded border border-slate-800">
                        {tc.input.policy}
                      </code>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Baseline: Cover ₹{tc.input.last_year_cover.toLocaleString()} &bull; NCB {tc.input.last_year_ncb}% &bull; Expiry {tc.input.expiry}
                    </p>
                    {tc.flags && tc.flags.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {tc.flags.map((f) => (
                          <span
                            key={f}
                            className={`px-2 py-0.2 rounded text-[10px] font-mono font-semibold ${
                              f === 'REDUCED_COVERAGE'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : f === 'NCB_MISSING'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : f === 'NEEDS_REVIEW'
                                ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            {f}
                          </span>
                        ))}
                        {tc.alert_generated && (
                          <span className="px-2 py-0.2 rounded text-[10px] font-mono font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                            CALENDAR_ALERT_GENERATED
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto">
                  {/* Status Assertion */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Expected:</span>
                    <span className="font-mono font-semibold px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                      {tc.expected}
                    </span>
                    <span className="text-slate-500">&rarr;</span>
                    <span className="text-slate-400">Actual:</span>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded border ${
                        tc.passed
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-700/60'
                          : 'bg-rose-950/60 text-rose-400 border-rose-700/60'
                      }`}
                    >
                      {tc.actual}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      tc.passed
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {tc.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {tc.passed ? 'PASS' : 'FAIL'}
                  </span>

                  <button
                    onClick={() => setExpandedTc(isExpanded ? null : tc.id)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 transition cursor-pointer"
                    title="Toggle details"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Collapsible Details */}
              {isExpanded && (
                <div className="border-t border-slate-800 p-5 bg-slate-950/70 space-y-4 text-xs">
                  {/* Quote & Verify summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-900 rounded-xl p-3.5 border border-slate-800 space-y-2">
                      <span className="font-semibold text-slate-200 block text-xs">Fetched Renewal Quote:</span>
                      {tc.quote ? (
                        <div className="space-y-1 font-mono text-[11px] text-slate-300">
                          <div>Cover: <strong className="text-white">₹{tc.quote.cover?.toLocaleString() ?? 'null'}</strong></div>
                          <div>Premium: <strong className="text-white">₹{tc.quote.premium?.toLocaleString() ?? 'null'}</strong></div>
                          <div>NCB: <strong className="text-white">{tc.quote.ncb !== null ? `${tc.quote.ncb}%` : 'null'}</strong></div>
                          <div>Extractor: <span className="text-indigo-400">{tc.quote.extractor}</span></div>
                          <div className="text-slate-400 font-sans mt-2 italic bg-slate-950 p-2 rounded border border-slate-800">
                            &ldquo;{tc.quote.summary}&rdquo;
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-500 italic">No quote fetched (policy expired/lapsed).</p>
                      )}
                    </div>

                    <div className="bg-slate-900 rounded-xl p-3.5 border border-slate-800 space-y-2">
                      <span className="font-semibold text-slate-200 block text-xs">Independent Verification Check:</span>
                      {tc.verify ? (
                        <div className="space-y-2 font-mono text-[11px] text-slate-300">
                          <div className="flex items-center gap-2">
                            <span>Quote matches live mock page:</span>
                            <span className={tc.verify.quote_matches_page ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                              {tc.verify.quote_matches_page ? 'True (Match)' : 'False (Discrepancy)'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>Cover vs previous year:</span>
                            <span className={tc.verify.cover_vs_last_year === 'unchanged' ? 'text-emerald-400' : 'text-amber-400 font-bold'}>
                              {tc.verify.cover_vs_last_year}
                            </span>
                          </div>
                          <button
                            onClick={() => onInspectPolicy(tc.input.policy)}
                            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-sans mt-2 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>View in Mock Insurer Portal</span>
                          </button>
                        </div>
                      ) : (
                        <p className="text-slate-500 italic">Verification skipped for lapsed policy.</p>
                      )}
                    </div>
                  </div>

                  {/* Evidence Trace Log */}
                  <div className="bg-slate-900 rounded-xl p-3.5 border border-slate-800 space-y-2">
                    <span className="font-semibold text-slate-200 block text-xs">Step-by-Step Audit Evidence Trace:</span>
                    <div className="font-mono text-[11px] space-y-1 max-h-48 overflow-y-auto pr-2">
                      {tc.evidence.map((line, idx) => (
                        <div key={idx} className="text-slate-300 flex items-start gap-2">
                          <span className="text-slate-600 select-none">{idx + 1}.</span>
                          <span>{line}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
