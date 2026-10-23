import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ExternalLink, 
  Code2, 
  Save, 
  RotateCcw, 
  Check, 
  AlertCircle,
  Eye,
  Edit3
} from 'lucide-react';
import { PolicyData, MockInsurerQuote } from '../types.js';

interface MockInsurerViewerProps {
  policies: PolicyData[];
  initialPolicyNo?: string;
  onQuoteUpdated: () => void;
}

export const MockInsurerViewer: React.FC<MockInsurerViewerProps> = ({
  policies,
  initialPolicyNo,
  onQuoteUpdated,
}) => {
  const [selectedPolicyNo, setSelectedPolicyNo] = useState<string>(
    initialPolicyNo || (policies[0]?.policy.policy_no ?? 'KA01AB1234')
  );
  const [mockQuote, setMockQuote] = useState<MockInsurerQuote | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'html' | 'edit'>('preview');
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Edit form state
  const [editCover, setEditCover] = useState<number>(500000);
  const [editPremium, setEditPremium] = useState<number>(11200);
  const [editNcb, setEditNcb] = useState<string>('20%');
  const [editInsurer, setEditInsurer] = useState<string>('Acme Motor');
  const [editProduct, setEditProduct] = useState<string>('Comprehensive car cover');

  useEffect(() => {
    if (initialPolicyNo) {
      setSelectedPolicyNo(initialPolicyNo);
    }
  }, [initialPolicyNo]);

  useEffect(() => {
    if (selectedPolicyNo) {
      fetchMockData(selectedPolicyNo);
    }
  }, [selectedPolicyNo]);

  const fetchMockData = async (no: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/mock/${no}`);
      if (res.ok) {
        const data = await res.json();
        setMockQuote(data);
        setEditCover(data.cover);
        setEditPremium(data.premium);
        setEditNcb(data.ncb || '');
        setEditInsurer(data.insurer);
        setEditProduct(data.product);
      } else {
        setMockQuote(null);
      }
    } catch (err) {
      console.error('Error fetching mock quote:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMockQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/mock/${selectedPolicyNo}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insurer: editInsurer,
          product: editProduct,
          cover: editCover,
          premium: editPremium,
          ncb: editNcb.trim() !== '' ? editNcb : null,
        }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
        await fetchMockData(selectedPolicyNo);
        onQuoteUpdated();
      }
    } catch (err) {
      console.error('Failed to update mock quote:', err);
    }
  };

  const currentPolicy = policies.find((p) => p.policy.policy_no === selectedPolicyNo);

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              Mock Insurer Portal Sandbox
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Simulates live insurer portals (<code className="text-indigo-300 bg-slate-950 px-1 py-0.5 rounded text-xs">/insurer/:policy_no</code>) with strict schema IDs (<code className="text-slate-300 bg-slate-950 px-1 rounded text-xs">&lt;span id=&quot;cover&quot;&gt;</code>, <code className="text-slate-300 bg-slate-950 px-1 rounded text-xs">&lt;span id=&quot;premium&quot;&gt;</code>, <code className="text-slate-300 bg-slate-950 px-1 rounded text-xs">&lt;span id=&quot;ncb&quot;&gt;</code>) scraped by the agent.
            </p>
          </div>

          {/* Policy selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-400 shrink-0">Select Policy:</label>
            <select
              value={selectedPolicyNo}
              onChange={(e) => setSelectedPolicyNo(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              {policies.map((p) => (
                <option key={p.policy.id} value={p.policy.policy_no}>
                  {p.policy.policy_no} - {p.policy.kind} ({p.policy.insurer})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-800">
          <button
            onClick={() => setViewMode('preview')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              viewMode === 'preview'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Interactive Portal View</span>
          </button>

          <button
            onClick={() => setViewMode('edit')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              viewMode === 'edit'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Tweak Offer Values (Sandbox)</span>
          </button>

          <button
            onClick={() => setViewMode('html')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              viewMode === 'html'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Raw HTML Scraper Target</span>
          </button>
        </div>
      </div>

      {/* Main Sandbox Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {viewMode === 'preview' && (
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between text-xs text-slate-400">
              <span>Endpoint: <code className="text-indigo-300 bg-slate-950 px-2 py-1 rounded">GET /insurer/{selectedPolicyNo}</code></span>
              <a
                href={`/insurer/${selectedPolicyNo}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
              >
                <span>Open Raw in New Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Embedded Live Mock Portal Iframe */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-white shadow-inner h-[400px]">
              <iframe
                src={`/insurer/${selectedPolicyNo}`}
                title="Mock Insurer Portal"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        )}

        {viewMode === 'edit' && (
          <form onSubmit={handleSaveMockQuote} className="p-6 space-y-4 max-w-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Simulate Renewal Offer Discrepancy</h3>
              {saveSuccess && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                  <Check className="w-4 h-4" /> Saved & Updated Live
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400">
              Modifying these values will change what the agent extracts when scraping <code className="text-slate-300">/insurer/{selectedPolicyNo}</code>.
              Try lowering the Sum Insured to trigger TC2 (flagged cover reduction) or removing NCB to trigger TC3!
            </p>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Insurer Name</label>
                <input
                  type="text"
                  value={editInsurer}
                  onChange={(e) => setEditInsurer(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Product Name</label>
                <input
                  type="text"
                  value={editProduct}
                  onChange={(e) => setEditProduct(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Sum Insured (Cover ₹)</label>
                <input
                  type="number"
                  value={editCover}
                  onChange={(e) => setEditCover(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  required
                />
                {currentPolicy && (
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Last year baseline: ₹{currentPolicy.policy.last_cover.toLocaleString()}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Renewal Premium (₹)</label>
                <input
                  type="number"
                  value={editPremium}
                  onChange={(e) => setEditPremium(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 mb-1 font-medium">
                  No-Claim Bonus (NCB) (e.g. &quot;20%&quot;, &quot;0%&quot;, or leave blank for missing)
                </label>
                <input
                  type="text"
                  value={editNcb}
                  onChange={(e) => setEditNcb(e.target.value)}
                  placeholder="e.g. 20% or leave blank"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
                {currentPolicy && (
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Last year baseline: {currentPolicy.policy.last_ncb}%
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Mock Offer</span>
              </button>
            </div>
          </form>
        )}

        {viewMode === 'html' && (
          <div className="p-6">
            <span className="text-xs text-slate-400 block mb-2 font-mono">
              HTML template containing DOM elements parsed by agent:
            </span>
            <pre className="bg-slate-950 text-slate-300 p-4 rounded-xl border border-slate-800 font-mono text-xs overflow-x-auto leading-relaxed">
{mockQuote
  ? `<html>
  <body style="font-family:sans-serif">
    <h2>${mockQuote.insurer} - Renewal Quote (MOCK)</h2>
    <p>Policy <b>${selectedPolicyNo}</b> - ${mockQuote.product}</p>
    <p>Sum insured: <span id="cover">Rs ${mockQuote.cover.toLocaleString()}</span></p>
    <p>Renewal premium: <span id="premium">Rs ${mockQuote.premium.toLocaleString()}</span></p>
    <p>No-claim bonus: <span id="ncb">${mockQuote.ncb || '-'}</span></p>
    <p>Quote valid for 15 days. Synthetic page for demo only.</p>
  </body>
</html>`
  : 'Loading...'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
