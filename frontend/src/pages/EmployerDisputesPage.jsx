import React, { useState, useEffect } from 'react';
import { getMyDisputes, createDispute, cancelDispute } from '../services/disputeService.js';
import { getEmployerProjects } from '../services/projectService.js';
import {
  Scale,
  PlusCircle,
  XCircle,
  Sparkles,
  Clock,
  AlertCircle,
  X,
  Gavel,
} from 'lucide-react';

export const EmployerDisputesPage = () => {
  const [disputes, setDisputes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    projectId: '',
    againstUserId: '',
    type: 'work_quality',
    amount: '',
    description: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dispRes, projRes] = await Promise.all([
        getMyDisputes(),
        getEmployerProjects(),
      ]);
      setDisputes(Array.isArray(dispRes?.data) ? dispRes.data : []);
      setProjects(Array.isArray(projRes?.data) ? projRes.data : []);
    } catch (_e) {
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (pId) => {
    setFormData((prev) => ({ ...prev, projectId: pId }));
    const projRecord = projects.find((p) => p._id === pId);
    if (projRecord && Array.isArray(projRecord.workers) && projRecord.workers.length > 0) {
      const firstWrk = projRecord.workers[0].workerId?._id || projRecord.workers[0].workerId;
      setFormData((prev) => ({ ...prev, againstUserId: firstWrk }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.projectId || !formData.againstUserId || !formData.description) {
      alert('Please select a project with assigned workers and enter dispute details.');
      return;
    }

    try {
      await createDispute({
        ...formData,
        amount: formData.amount ? Number(formData.amount) : 0,
      });
      setShowModal(false);
      setFormData({ projectId: '', againstUserId: '', type: 'work_quality', amount: '', description: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to file dispute');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this dispute?')) return;
    try {
      await cancelDispute(id);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel dispute');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="ks-glass-card p-6 sm:p-8 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-primary/10 via-sky-500/10 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="ks-badge-cyan">
              <Sparkles className="w-3.5 h-3.5" /> Formal Mediation
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Gavel className="w-7 h-7 text-primary dark:text-sky-400" />
            <span>Employer Project Disputes</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
            Initiate and resolve formal disputes regarding work quality, site completion milestones, or contract payment terms
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="ks-btn-primary text-xs px-5 py-2.5 font-bold flex items-center gap-2 self-start sm:self-auto relative z-10 shadow-xs"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Initiate Dispute</span>
        </button>
      </div>

      <div className="ks-glass-card overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 dark:border-white/10 flex justify-between items-center">
          <h2 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
            Dispute Case Ledger ({disputes.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 animate-pulse">Loading disputes...</div>
        ) : disputes.length === 0 ? (
          <div className="p-16 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center space-y-2">
            <Scale className="w-10 h-10 text-slate-400 opacity-60" />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">No active disputes.</p>
            <p className="text-xs">Formal arbitration filings and status updates will be displayed here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200/80 dark:border-white/5">
            {disputes.map((d) => (
              <div key={d._id} className="p-5 space-y-2.5">
                <div className="flex justify-between items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      {d.projectId?.name || 'Project'} — <span className="capitalize">{d.type?.replace(/_/g, ' ')} Dispute</span>
                    </span>
                    {d.amount > 0 && (
                      <span className="ks-badge-amber text-xs font-bold">
                        Disputed Amount: ₹{d.amount}
                      </span>
                    )}
                  </div>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold capitalize border ${
                    d.status === 'resolved' ? 'ks-badge-emerald' : 'ks-badge-amber'
                  }`}>
                    {d.status || 'open'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{d.description}</p>
                <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Initiated: {new Date(d.createdAt).toLocaleDateString()}</span>
                  </span>
                  {d.status === 'open' && (
                    <button
                      onClick={() => handleCancel(d._id)}
                      className="text-rose-500 font-bold hover:underline flex items-center gap-1"
                    >
                      <XCircle className="w-3 h-3" />
                      <span>Cancel Dispute</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="ks-glass-card border-white/20 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Gavel className="w-5 h-5 text-amber-500" />
                <span>Initiate Project Dispute</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Select Project</label>
                <select
                  value={formData.projectId}
                  onChange={(e) => handleProjectSelect(e.target.value)}
                  className="ks-input text-xs"
                  required
                >
                  <option value="">-- Select Project --</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Dispute Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="ks-input text-xs"
                  >
                    <option value="work_quality">Work Quality</option>
                    <option value="attendance">Attendance Default</option>
                    <option value="project_completion">Project Completion</option>
                    <option value="contract_terms">Contract Terms</option>
                    <option value="payment">Payment</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Disputed Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 1000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="ks-input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Dispute Description</label>
                <textarea
                  rows="4"
                  placeholder="Explain dispute background, facts, and proposed resolution..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="ks-input text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200/80 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="ks-btn-outline text-xs px-4 py-2 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ks-btn-primary text-xs px-5 py-2 font-bold shadow-xs"
                >
                  File Dispute
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployerDisputesPage;
