import React, { useState } from 'react';
import { X, ShieldPlus, Check, Sparkles } from 'lucide-react';

interface AddPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export const AddPolicyModal: React.FC<AddPolicyModalProps> = ({
  isOpen,
  onClose,
  onAdded,
}) => {
  const [holder, setHolder] = useState('Sharma family');
  const [kind, setKind] = useState('Car');
  const [insurer, setInsurer] = useState('Acme Motor');
  const [policyNo, setPolicyNo] = useState('');
  const [daysToExpiry, setDaysToExpiry] = useState<number>(30);
  const [lastCover, setLastCover] = useState<number>(500000);
  const [lastNcb, setLastNcb] = useState<number>(20);

  // Mock Quote options
  const [mockCover, setMockCover] = useState<number>(500000);
  const [mockPremium, setMockPremium] = useState<number>(12000);
  const [mockNcb, setMockNcb] = useState<string>('20%');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyNo.trim()) {
      setError('Policy number is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Calculate expiry date from daysToExpiry
    const d = new Date();
    d.setDate(d.getDate() + Number(daysToExpiry));
    const expiry = d.toISOString().split('T')[0];

    try {
      const res = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holder,
          kind,
          insurer,
          policy_no: policyNo.trim().toUpperCase(),
          expiry,
          last_cover: Number(lastCover),
          last_ncb: Number(lastNcb),
          mock_cover: Number(mockCover),
          mock_premium: Number(mockPremium),
          mock_ncb: mockNcb.trim() !== '' ? mockNcb : null,
        }),
      });

      if (res.ok) {
        onAdded();
        onClose();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to add policy');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <ShieldPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Add Policy to Tracker</h3>
            <p className="text-xs text-slate-400">Configure household policy and synthetic renewal offer</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Policy Number *</label>
              <input
                type="text"
                value={policyNo}
                onChange={(e) => setPolicyNo(e.target.value)}
                placeholder="e.g. MH02CD5678"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono uppercase"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Policy Type</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                <option value="Car">Car</option>
                <option value="Health">Health</option>
                <option value="Bike">Bike / Two-Wheeler</option>
                <option value="Home">Home</option>
                <option value="Life">Life</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Insurer Name</label>
              <input
                type="text"
                value={insurer}
                onChange={(e) => setInsurer(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Household / Holder</label>
              <input
                type="text"
                value={holder}
                onChange={(e) => setHolder(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Days to Expiry</label>
              <input
                type="number"
                value={daysToExpiry}
                onChange={(e) => setDaysToExpiry(Number(e.target.value))}
                placeholder="30 (<=30 = alert, <0 = lapsed)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                required
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">Negative number = expired</span>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Last Year NCB (%)</label>
              <input
                type="number"
                value={lastNcb}
                onChange={(e) => setLastNcb(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-slate-400 font-medium mb-1">Last Year Sum Insured (₹)</label>
              <input
                type="number"
                value={lastCover}
                onChange={(e) => setLastCover(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                required
              />
            </div>
          </div>

          {/* Mock quote offer section */}
          <div className="pt-3 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Synthetic Insurer Renewal Offer
            </h4>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-500 text-[11px] mb-1">Offered Cover (₹)</label>
                <input
                  type="number"
                  value={mockCover}
                  onChange={(e) => setMockCover(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-[11px] mb-1">Premium (₹)</label>
                <input
                  type="number"
                  value={mockPremium}
                  onChange={(e) => setMockPremium(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-[11px] mb-1">NCB Offered</label>
                <input
                  type="text"
                  value={mockNcb}
                  onChange={(e) => setMockNcb(e.target.value)}
                  placeholder="20% or blank"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Adding...' : 'Add Policy'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
