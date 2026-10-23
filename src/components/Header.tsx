import React from 'react';
import { Shield, Sparkles, RefreshCw, PlusCircle, CheckCircle2, AlertTriangle, AlertCircle, Clock, Bot, Calendar } from 'lucide-react';
import { PolicyData, RenewalAlert } from '../types.js';

interface HeaderProps {
  policies: PolicyData[];
  alerts?: RenewalAlert[];
  geminiActive: boolean;
  onProposeAll: () => void;
  onResetData: () => void;
  onOpenAddModal: () => void;
  isLoading: boolean;
  activeTab: 'dashboard' | 'agent' | 'calendar' | 'tests' | 'traces' | 'mock';
  setActiveTab: (tab: 'dashboard' | 'agent' | 'calendar' | 'tests' | 'traces' | 'mock') => void;
}

export const Header: React.FC<HeaderProps> = ({
  policies,
  alerts = [],
  geminiActive,
  onProposeAll,
  onResetData,
  onOpenAddModal,
  isLoading,
  activeTab,
  setActiveTab,
}) => {
  const pendingApprovals = policies.filter((p) => p.action?.state === 'pending').length;
  const flaggedCount = policies.filter((p) => p.policy.status === 'flagged').length;
  const alertCount = policies.filter((p) => p.policy.status === 'alert').length;
  const lapsedCount = policies.filter((p) => p.policy.status === 'lapsed').length;

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Policy Renewal Tracker & Agent Audit
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                  Human-in-the-Loop Agent
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Deterministic Decision Engine &bull; Gemini 3.8 Flash Extraction &bull; Scraper Cross-Check &bull; Independent Verification
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                geminiActive
                  ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-700/60 text-amber-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{geminiActive ? 'Gemini 3.8 Flash Active' : 'Deterministic Parser Active'}</span>
            </div>

            <button
              onClick={onProposeAll}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Propose All</span>
            </button>

            <button
              onClick={onOpenAddModal}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Policy</span>
            </button>

            <button
              onClick={onResetData}
              disabled={isLoading}
              title="Reset synthetic data to default Sharma family policies (TC1-TC4)"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Tracked</p>
              <p className="text-xl font-bold text-white mt-0.5">{policies.length}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-300">
              <Shield className="w-4 h-4" />
            </div>
          </div>

          <div
            className={`rounded-xl p-3 border flex items-center justify-between ${
              pendingApprovals > 0
                ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                : 'bg-slate-800/60 border-slate-800 text-slate-300'
            }`}
          >
            <div>
              <p className="text-xs text-amber-400 font-medium">Pending Approvals</p>
              <p className="text-xl font-bold text-white mt-0.5">{pendingApprovals}</p>
            </div>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                pendingApprovals > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-400'
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div
            className={`rounded-xl p-3 border flex items-center justify-between ${
              flaggedCount > 0
                ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                : 'bg-slate-800/60 border-slate-800 text-slate-300'
            }`}
          >
            <div>
              <p className="text-xs text-rose-400 font-medium">Flagged Discrepancies</p>
              <p className="text-xl font-bold text-white mt-0.5">{flaggedCount}</p>
            </div>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                flaggedCount > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-700/50 text-slate-400'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Alerts & Lapsed</p>
              <p className="text-xl font-bold text-white mt-0.5">
                {alertCount} <span className="text-xs text-slate-400 font-normal">/ {lapsedCount} lapsed</span>
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-300">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 mt-6 border-b border-slate-800" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Renewal Dashboard</span>
            {pendingApprovals > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-xs bg-amber-500/30 text-amber-300 font-bold">
                {pendingApprovals}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('agent')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'agent'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Autonomous Agent Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'calendar'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Renewal Calendar & Alerts</span>
            {alerts && alerts.filter(a => !a.dismissed).length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs bg-rose-500/30 text-rose-300 font-bold">
                {alerts.filter(a => !a.dismissed).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'tests'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Official Test Suite (TC1–TC4)</span>
          </button>

          <button
            onClick={() => setActiveTab('traces')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'traces'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Agent Audit Logs</span>
          </button>

          <button
            onClick={() => setActiveTab('mock')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'mock'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Mock Insurer Portal</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
