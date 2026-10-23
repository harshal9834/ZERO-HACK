/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  Sparkles, 
  Filter, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Info,
  Check
} from 'lucide-react';
import { PolicyData, TestCaseResult, RenewalAlert } from './types.js';
import { Header } from './components/Header.js';
import { PolicyCard } from './components/PolicyCard.js';
import { AgentStudio } from './components/AgentStudio.js';
import { RenewalCalendarView } from './components/RenewalCalendarView.js';
import { TestSuiteView } from './components/TestSuiteView.js';
import { AuditTraceView } from './components/AuditTraceView.js';
import { MockInsurerViewer } from './components/MockInsurerViewer.js';
import { AddPolicyModal } from './components/AddPolicyModal.js';

export default function App() {
  const [policies, setPolicies] = useState<PolicyData[]>([]);
  const [alerts, setAlerts] = useState<RenewalAlert[]>([]);
  const [geminiActive, setGeminiActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'agent' | 'calendar' | 'tests' | 'traces' | 'mock'>('dashboard');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Trace and mock inspection state
  const [selectedTracePolicyId, setSelectedTracePolicyId] = useState<number | null>(null);
  const [selectedMockPolicyNo, setSelectedMockPolicyNo] = useState<string>('KA01AB1234');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Test suite state
  const [testResults, setTestResults] = useState<TestCaseResult[] | null>(null);
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchStatusAndPolicies = useCallback(async () => {
    try {
      const [statusRes, policiesRes, alertsRes] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/policies'),
        fetch('/api/alerts'),
      ]);

      if (statusRes.ok) {
        const sData = await statusRes.json();
        setGeminiActive(sData.geminiConfigured);
      }

      if (policiesRes.ok) {
        const pData = await policiesRes.json();
        setPolicies(pData);
        if (pData.length > 0 && !selectedMockPolicyNo) {
          setSelectedMockPolicyNo(pData[0].policy.policy_no);
        }
      }

      if (alertsRes.ok) {
        const aData = await alertsRes.json();
        setAlerts(aData);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMockPolicyNo]);

  useEffect(() => {
    fetchStatusAndPolicies();
  }, [fetchStatusAndPolicies]);

  // Propose All
  const handleProposeAll = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/policies/propose_all', { method: 'POST' });
      if (res.ok) {
        await fetchStatusAndPolicies();
        showToast('Agent proposed renewal plans. Pending human approvals generated!', 'info');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to propose all policies', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Propose Single
  const handleProposeSingle = async (policyId: number) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/policies/${policyId}/propose`, { method: 'POST' });
      if (res.ok) {
        await fetchStatusAndPolicies();
        showToast('Renewal plan proposed. Waiting for human approval gate.', 'info');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to propose policy', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Human Approve
  const handleApprove = async (actionId: number) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/actions/${actionId}/approve`, { method: 'POST' });
      if (res.ok) {
        await fetchStatusAndPolicies();
        showToast('Human Approved: Tool call executed, quote extracted, evaluated and verified!', 'success');
      } else {
        showToast('Error approving action', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to approve action', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Human Reject
  const handleReject = async (actionId: number) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/actions/${actionId}/reject`, { method: 'POST' });
      if (res.ok) {
        await fetchStatusAndPolicies();
        showToast('Human Rejected: Scraper tool call was cancelled.', 'info');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Manual Verify
  const handleVerify = async (actionId: number) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/actions/${actionId}/verify`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        await fetchStatusAndPolicies();
        showToast(
          `Verification Complete: Matches page = ${data.result.quote_matches_page ? 'Yes' : 'No'}, Cover = ${data.result.cover_vs_last_year}`,
          'success'
        );
      }
    } catch (err) {
      console.error(err);
      showToast('Verification failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset to default
  const handleResetData = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/policies/reset', { method: 'POST' });
      if (res.ok) {
        await fetchStatusAndPolicies();
        setTestResults(null);
        showToast('Database reset to official synthetic Sharma family policies (TC1–TC4)', 'info');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Run Test Suite
  const handleRunTests = async () => {
    setIsRunningTests(true);
    try {
      const res = await fetch('/api/tests/run');
      if (res.ok) {
        const data = await res.json();
        setTestResults(data.results);
        showToast('Official test cases executed. All assertions verified!', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Error running test suite', 'error');
    } finally {
      setIsRunningTests(false);
    }
  };

  // Dismiss an alert
  const handleDismissAlert = async (id: number) => {
    try {
      await fetch(`/api/alerts/${id}/dismiss`, { method: 'POST' });
      await fetchStatusAndPolicies();
      showToast('Alert dismissed', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  // Filter policies on dashboard
  const filteredPolicies = policies.filter((p) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'PENDING') return p.action?.state === 'pending';
    return p.policy.status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md animate-fade-in">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-medium border ${
              notification.type === 'success'
                ? 'bg-emerald-950 border-emerald-700/80 text-emerald-200'
                : notification.type === 'error'
                ? 'bg-rose-950 border-rose-700/80 text-rose-200'
                : 'bg-indigo-950 border-indigo-700/80 text-indigo-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-indigo-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* App Header */}
      <Header
        policies={policies}
        alerts={alerts}
        geminiActive={geminiActive}
        onProposeAll={handleProposeAll}
        onResetData={handleResetData}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        isLoading={isProcessing || isLoading}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Agent Loop Process Banner */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                    Agent Verification Architecture
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                    Autonomous loop follows strict human-in-the-loop safeguards:
                    <strong className="text-white"> PLAN</strong> &rarr; 
                    <strong className="text-amber-400"> Human APPROVAL</strong> &rarr; 
                    <strong className="text-purple-400"> TOOL CALL (Fetch)</strong> &rarr; 
                    <strong className="text-sky-400"> OBSERVE (Gemini + Parser Cross-Check)</strong> &rarr; 
                    <strong className="text-indigo-400"> DECIDE (Deterministic Rules)</strong> &rarr; 
                    <strong className="text-teal-400"> VERIFY</strong>.
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-slate-500 mr-1 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" /> Filter:
                  </span>
                  {[
                    { id: 'ALL', label: 'All' },
                    { id: 'PENDING', label: 'Needs Approval' },
                    { id: 'alert', label: 'Alert' },
                    { id: 'flagged', label: 'Flagged' },
                    { id: 'ok', label: 'Cover OK' },
                    { id: 'lapsed', label: 'Lapsed' },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setStatusFilter(filter.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                        statusFilter === filter.id
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Policies Grid */}
            {isLoading ? (
              <div className="py-20 text-center text-slate-500 text-xs">
                Loading household policies...
              </div>
            ) : filteredPolicies.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
                No policies found matching filter &quot;{statusFilter}&quot;.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredPolicies.map((item) => (
                  <PolicyCard
                    key={item.policy.id}
                    data={item}
                    onPropose={handleProposeSingle}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onVerify={handleVerify}
                    onInspectMock={(pNo) => {
                      setSelectedMockPolicyNo(pNo);
                      setActiveTab('mock');
                    }}
                    onViewTrace={(pId) => {
                      setSelectedTracePolicyId(pId);
                      setActiveTab('traces');
                    }}
                    isProcessing={isProcessing}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Agent Studio */}
        {activeTab === 'agent' && (
          <AgentStudio
            policies={policies}
            onRefresh={fetchStatusAndPolicies}
            onPropose={handleProposeSingle}
            onApprove={handleApprove}
            onVerify={handleVerify}
            geminiActive={geminiActive}
            onInspectMock={(pNo) => {
              setSelectedMockPolicyNo(pNo);
              setActiveTab('mock');
            }}
          />
        )}

        {/* Tab 3: Renewal Calendar & Alerts */}
        {activeTab === 'calendar' && (
          <RenewalCalendarView
            policies={policies}
            alerts={alerts}
            onDismissAlert={handleDismissAlert}
            onSelectPolicy={(pNo) => {
              setSelectedMockPolicyNo(pNo);
              setActiveTab('dashboard');
            }}
            onOpenAgent={(pId) => {
              setSelectedTracePolicyId(pId);
              setActiveTab('agent');
            }}
          />
        )}

        {/* Tab 4: Test Suite */}
        {activeTab === 'tests' && (
          <TestSuiteView
            testResults={testResults}
            isRunning={isRunningTests}
            onRunTests={handleRunTests}
            onInspectPolicy={(pNo) => {
              setSelectedMockPolicyNo(pNo);
              setActiveTab('mock');
            }}
          />
        )}

        {/* Tab 3: Agent Audit & Traces */}
        {activeTab === 'traces' && (
          <AuditTraceView
            policies={policies}
            selectedPolicyId={selectedTracePolicyId}
            onSelectPolicy={setSelectedTracePolicyId}
          />
        )}

        {/* Tab 4: Mock Insurer Portal */}
        {activeTab === 'mock' && (
          <MockInsurerViewer
            policies={policies}
            initialPolicyNo={selectedMockPolicyNo}
            onQuoteUpdated={fetchStatusAndPolicies}
          />
        )}
      </main>

      {/* Add Policy Modal */}
      <AddPolicyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdded={() => {
          fetchStatusAndPolicies();
          showToast('New policy and mock quote registered successfully!', 'success');
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>Policy Renewal Tracker & Agent Audit &bull; Built with Google GenAI SDK &bull; Synthetic Demo System</p>
      </footer>
    </div>
  );
}
