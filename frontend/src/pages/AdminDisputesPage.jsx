import React, { useState, useEffect } from 'react';
import { getAllDisputes, resolveDispute } from '../services/adminService.js';
import { getDisputeSummary } from '../services/aiService.js';
import { AiSummaryCard } from '../components/AiSummaryCard.jsx';
import { Sparkles } from 'lucide-react';

export const AdminDisputesPage = () => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [resolutionText, setResolutionText] = useState('');
  const [activeSummaryId, setActiveSummaryId] = useState(null);
  const [summaryData, setSummaryData] = useState({});
  const [loadingSummary, setLoadingSummary] = useState(false);

  const handleToggleSummary = async (id) => {
    if (activeSummaryId === id) {
      setActiveSummaryId(null);
      return;
    }
    setActiveSummaryId(id);
    if (!summaryData[id]) {
      try {
        setLoadingSummary(true);
        const res = await getDisputeSummary(id);
        if (res?.data) setSummaryData((prev) => ({ ...prev, [id]: res.data }));
      } catch (err) {
        console.warn('Failed to fetch dispute summary', err);
      } finally {
        setLoadingSummary(false);
      }
    }
  };

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const res = await getAllDisputes();
      if (res?.data?.disputes) setDisputes(res.data.disputes);
    } catch (err) {
      console.error('Failed to fetch disputes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const handleResolve = async (id) => {
    if (!resolutionText.trim()) return;
    try {
      await resolveDispute(id, { resolution: resolutionText, status: 'resolved' });
      setResolutionText('');
      setSelectedId(null);
      fetchDisputes();
    } catch (err) {
      alert('Failed to resolve dispute');
    }
  };

  return (
    <div className="w-full space-y-space-md py-2">
      <h1 className="font-headline-sm text-xl font-bold text-on-surface">Formal Dispute Resolution</h1>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center text-xs text-on-surface-variant py-8 animate-pulse">Loading disputes...</div>
        ) : disputes.length === 0 ? (
          <div className="text-center text-xs text-on-surface-variant py-8">No formal project disputes found.</div>
        ) : (
          disputes.map((d) => (
            <div
              key={d._id}
              className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-label-md text-xs font-bold text-error uppercase">
                  Type: {d.type} {d.amount ? `• Amount: ₹${d.amount}` : ''}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    d.status === 'resolved'
                      ? 'bg-tertiary-container text-on-tertiary-container'
                      : 'bg-error-container text-on-error-container'
                  }`}
                >
                  {d.status}
                </span>
              </div>

              <div className="font-body-md text-xs text-on-surface">{d.description}</div>

              <div className="font-body-sm text-[11px] text-on-surface-variant flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-surface-container-high/60">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>Initiator: <strong>{d.initiatedBy?.name || 'Unknown'}</strong></span>
                  <span>•</span>
                  <span>Against: <strong>{d.againstUserId?.name || 'Unknown'}</strong></span>
                  <span>•</span>
                  <span>Project: <strong>{d.projectId?.title || d.projectId?.name || 'Project'}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSummary(d._id)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[11px] font-bold border border-cyan-500/20 transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>{activeSummaryId === d._id ? 'Hide AI Summary' : 'AI Summary'}</span>
                </button>
              </div>

              {activeSummaryId === d._id && (
                <div className="pt-2">
                  <AiSummaryCard
                    summaryData={summaryData[d._id]}
                    loading={loadingSummary && !summaryData[d._id]}
                    onRefresh={() => handleToggleSummary(d._id)}
                    lang="en"
                    type="dispute"
                  />
                </div>
              )}

              {d.resolution && (
                <div className="p-2 rounded-lg bg-surface-container-low text-xs text-tertiary-container font-medium">
                  Final Decision: {d.resolution}
                </div>
              )}

              {d.status !== 'resolved' && (
                <div>
                  {selectedId === d._id ? (
                    <div className="space-y-2 mt-2 pt-2 border-t border-surface-container-high">
                      <textarea
                        rows="2"
                        value={resolutionText}
                        onChange={(e) => setResolutionText(e.target.value)}
                        placeholder="Enter binding dispute resolution decision..."
                        className="w-full rounded-xl bg-surface-container-low p-2 text-xs border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleResolve(d._id)}
                          className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold"
                        >
                          Issue Resolution
                        </button>
                        <button
                          onClick={() => setSelectedId(null)}
                          className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedId(d._id)}
                      className="px-3 py-1.5 rounded-lg bg-error text-on-error text-xs font-bold mt-1"
                    >
                      Resolve Dispute
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
