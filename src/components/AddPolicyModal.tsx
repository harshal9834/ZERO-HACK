import React, { useState } from 'react';
import { X, ShieldPlus, Check, Sparkles, Calendar, AlertCircle } from 'lucide-react';

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

  // Store days as string so users can type negative numbers (e.g. -1, -10) without browser swallowing '-'
  const [daysToExpiry, setDaysToExpiry] = useState<string>('30');
  const [lastCover, setLastCover] = useState<string>('500000');
  const [lastNcb, setLastNcb] = useState<string>('20');

  // Mock Quote options
  const [mockCover, setMockCover] = useState<string>('500000');
  const [mockPremium, setMockPremium] = useState<string>('12000');
  const [mockNcb, setMockNcb] = useState<string>('20%');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle typing in days to expiry (allows empty, single "-", or positive/negative integers)
  const handleDaysChange = (val: string) => {
    const trimmed = val.trim();
    if (trimmed === '' || trimmed === '-' || /^-?\d+$/.test(trimmed)) {
      setDaysToExpiry(trimmed);
    }
  };

  // Live calculation for preview
  const parsedDays = parseInt(daysToExpiry, 10);
  const isValidDays = !isNaN(parsedDays) && daysToExpiry !== '-';
  let liveExpiryDate = '';
  let liveExpiryLabel = '';
  if (isValidDays) {
    const d = new Date();
    d.setDate(d.getDate() + parsedDays);
    liveExpiryDate = d.toISOString().split('T')[0];
    if (parsedDays < 0) {
      liveExpiryLabel = `Lapsed ${Math.abs(parsedDays)} days ago (TC4 Expired)`;
    } else if (parsedDays === 0) {
      liveExpiryLabel = 'Expires today';
    } else if (parsedDays <= 30) {
      liveExpiryLabel = `${parsedDays} days remaining (TC1 Alert window)`;
    } else {
      liveExpiryLabel = `${parsedDays} days remaining`;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyNo.trim()) {
      setError('Policy number is required');
      return;
    }

    if (!isValidDays) {
      setError('Please enter a valid number of days to expiry (e.g. 30 or -10)');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Calculate expiry date from daysToExpiry
    const d = new Date();
    d.setDate(d.getDate() + parsedDays);
    const expiry = d.toISOString().split('T')[0];

    // Safely format mock NCB: empty string or whitespace becomes null
    const cleanMockNcb = mockNcb.trim();
    const payloadNcb = cleanMockNcb !== '' && cleanMockNcb.toLowerCase() !== 'null' && cleanMockNcb.toLowerCase() !== 'none'
      ? (cleanMockNcb.endsWith('%') ? cleanMockNcb : `${cleanMockNcb}%`)
      : null;

    try {
      const res = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holder: holder.trim(),
          kind,
          insurer: insurer.trim(),
          policy_no: policyNo.trim().toUpperCase(),
          expiry,
          last_cover: Number(lastCover) || 500000,
          last_ncb: lastNcb.trim() !== '' ? Number(lastNcb) : 0,
          mock_cover: mockCover.trim() !== '' ? Number(mockCover) : Number(lastCover),
          mock_premium: mockPremium.trim() !== '' ? Number(mockPremium) : 12000,
          mock_ncb: payloadNcb,
        }),
      });

      if (res.ok) {
        onAdded();
        onClose();
      } else {
        let errMessage = 'Failed to add policy';
        try {
          const errData = await res.json();
          errMessage = errData.error || errMessage;
        } catch {
          const rawText = await res.text();
          errMessage = rawText || errMessage;
        }
        setError(errMessage);
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
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
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
              <span className="text-[10px] text-slate-500 mt-0.5 block">Submitting existing number updates the policy</span>
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

            {/* Days to Expiry with negative support & presets */}
            <div className="col-span-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  Days to Expiry (Negative = Expired / Lapsed)
                </label>
                {isValidDays && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                      parsedDays < 0
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : parsedDays <= 30
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {liveExpiryDate} &bull; {liveExpiryLabel}
                  </span>
                )}
              </div>
              <input
                type="text"
                inputMode="text"
                value={daysToExpiry}
                onChange={(e) => handleDaysChange(e.target.value)}
                placeholder="e.g. 30 or -1 or -10"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono text-sm"
                required
              />
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] text-slate-500 mr-1">Quick presets:</span>
                <button
                  type="button"
                  onClick={() => setDaysToExpiry('30')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 transition cursor-pointer"
                >
                  30d (TC1 Alert)
                </button>
                <button
                  type="button"
                  onClick={() => setDaysToExpiry('45')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 transition cursor-pointer"
                >
                  45d (TC2)
                </button>
                <button
                  type="button"
                  onClick={() => setDaysToExpiry('60')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 transition cursor-pointer"
                >
                  60d (TC3)
                </button>
                <button
                  type="button"
                  onClick={() => setDaysToExpiry('-1')}
                  className="px-2 py-0.5 rounded bg-rose-900/40 hover:bg-rose-900/60 text-[10px] text-rose-300 border border-rose-800/40 transition cursor-pointer"
                >
                  -1d (Expired yesterday)
                </button>
                <button
                  type="button"
                  onClick={() => setDaysToExpiry('-10')}
                  className="px-2 py-0.5 rounded bg-rose-900/40 hover:bg-rose-900/60 text-[10px] text-rose-300 border border-rose-800/40 transition cursor-pointer"
                >
                  -10d (TC4 Lapsed)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Last Year NCB (%)</label>
              <input
                type="text"
                inputMode="numeric"
                value={lastNcb}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  if (val === '' || /^\d+$/.test(val)) setLastNcb(val);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Last Year Sum Insured (₹)</label>
              <input
                type="text"
                inputMode="numeric"
                value={lastCover}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  if (val === '' || /^\d+$/.test(val)) setLastCover(val);
                }}
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
                  type="text"
                  inputMode="numeric"
                  value={mockCover}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    if (val === '' || /^\d+$/.test(val)) setMockCover(val);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-[11px] mb-1">Premium (₹)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={mockPremium}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    if (val === '' || /^\d+$/.test(val)) setMockPremium(val);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-[11px] mb-1">NCB Offered</label>
                <input
                  type="text"
                  value={mockNcb}
                  onChange={(e) => setMockNcb(e.target.value)}
                  placeholder="20% or leave blank"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] text-slate-500">NCB shortcuts:</span>
              <button
                type="button"
                onClick={() => setMockNcb('')}
                className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] transition cursor-pointer"
              >
                Leave Blank (TC3 Missing)
              </button>
              <button
                type="button"
                onClick={() => setMockNcb('0%')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition cursor-pointer"
              >
                0%
              </button>
              <button
                type="button"
                onClick={() => setMockNcb('20%')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition cursor-pointer"
              >
                20%
              </button>
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
              <span>{isSubmitting ? 'Saving...' : 'Save Policy'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

