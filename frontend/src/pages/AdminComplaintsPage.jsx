import React, { useState, useEffect } from 'react';
import { getAllComplaints, resolveComplaint } from '../services/adminService.js';
import { getComplaintSummary } from '../services/aiService.js';
import { AiSummaryCard } from '../components/AiSummaryCard.jsx';
import { Sparkles } from 'lucide-react';

export const AdminComplaintsPage = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [resolutionText, setResolutionText] = useState('');
  const [activeSummaryId, setActiveSummaryId] = useState(null);
  const [summaryData, setSummaryData] = useState({});
  const [loadingSummary, setLoadingSummary] = useState(false);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await getAllComplaints();
      if (res?.data?.complaints) setComplaints(res.data.complaints);
    } catch (err) {
      console.error('Failed to fetch complaints', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleToggleSummary = async (id) => {
    if (activeSummaryId === id) {
      setActiveSummaryId(null);
      return;
    }
    setActiveSummaryId(id);
    if (!summaryData[id]) {
      try {
        setLoadingSummary(true);
        const res = await getComplaintSummary(id);
        if (res?.data) setSummaryData((prev) => ({ ...prev, [id]: res.data }));
      } catch (err) {
        console.warn('Failed to fetch complaint summary', err);
      } finally {
        setLoadingSummary(false);
      }
    }
  };

  const handleResolve = async (id) => {
    if (!resolutionText.trim()) return;
    try {
      await resolveComplaint(id, { resolution: resolutionText, status: 'resolved' });
      setResolutionText('');
      setSelectedId(null);
      fetchComplaints();
    } catch (err) {
      alert('Failed to resolve complaint');
    }
  };

  return (
    <div className="w-full space-y-space-md py-2">
      <h1 className="font-headline-sm text-xl font-bold text-on-surface">Complaint Governance</h1>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center text-xs text-on-surface-variant py-8 animate-pulse">Loading complaints...</div>
        ) : complaints.length === 0 ? (
          <div className="text-center text-xs text-on-surface-variant py-8">No complaints logged.</div>
        ) : (
          complaints.map((c) => (
            <div
              key={c._id}
              className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-label-md text-xs font-bold text-primary uppercase">
                  Category: {c.category} • Priority: {c.priority}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    c.status === 'resolved'
                      ? 'bg-tertiary-container text-on-tertiary-container'
                      : 'bg-secondary-container text-on-secondary-container'
                  }`}
                >
                  {c.status}
                </span>
              </div>

              <div className="font-body-md text-xs text-on-surface">{c.description}</div>

              <div className="font-body-sm text-[11px] text-on-surface-variant flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-surface-container-high/60">
                <div className="flex items-center gap-2">
                  <span>Reporter: <strong>{c.reporterId?.name || 'Unknown'}</strong></span>
                  <span>•</span>
                  <span>Target: <strong>{c.targetUserId?.name || 'N/A'}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSummary(c._id)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[11px] font-bold border border-cyan-500/20 transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>{activeSummaryId === c._id ? 'Hide AI Summary' : 'AI Summary'}</span>
                </button>
              </div>

              {activeSummaryId === c._id && (
                <div className="pt-2">
                  <AiSummaryCard
                    summaryData={summaryData[c._id]}
                    loading={loadingSummary && !summaryData[c._id]}
                    onRefresh={() => handleToggleSummary(c._id)}
                    lang="en"
                    type="complaint"
                  />
                </div>
              )}

              {c.resolution && (
                <div className="p-2 rounded-lg bg-surface-container-low text-xs text-tertiary-container font-medium">
                  Resolution: {c.resolution}
                </div>
              )}

              {c.status !== 'resolved' && (
                <div>
                  {selectedId === c._id ? (
                    <div className="space-y-2 mt-2 pt-2 border-t border-surface-container-high">
                      <textarea
                        rows="2"
                        value={resolutionText}
                        onChange={(e) => setResolutionText(e.target.value)}
                        placeholder="Enter admin resolution notes..."
                        className="w-full rounded-xl bg-surface-container-low p-2 text-xs border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleResolve(c._id)}
                          className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold"
                        >
                          Submit Resolution
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
                      onClick={() => setSelectedId(c._id)}
                      className="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary-container text-xs font-bold mt-1"
                    >
                      Resolve Complaint
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
