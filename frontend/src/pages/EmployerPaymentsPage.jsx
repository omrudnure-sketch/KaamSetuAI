import React, { useState, useEffect } from 'react';
import { getEmployerPayments, recordPayment } from '../services/paymentService.js';
import { getEmployerProjects } from '../services/projectService.js';
import {
  CreditCard,
  Plus,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building2,
  Users,
  Sparkles,
  DollarSign,
  FileText,
  X,
  Clock,
} from 'lucide-react';

export const EmployerPaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedProjectWorkers, setSelectedProjectWorkers] = useState([]);
  const [formData, setFormData] = useState({
    projectWorkerId: '',
    type: 'daily',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    method: 'cash',
    reference: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [payRes, projRes] = await Promise.all([
        getEmployerPayments(),
        getEmployerProjects(),
      ]);
      setPayments(Array.isArray(payRes?.data) ? payRes.data : []);
      setProjects(Array.isArray(projRes?.data) ? projRes.data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (projId) => {
    setSelectedProjectId(projId);
    const proj = projects.find((p) => p._id === projId);
    if (proj && Array.isArray(proj.workers)) {
      setSelectedProjectWorkers(proj.workers);
      if (proj.workers.length > 0) {
        setFormData((prev) => ({ ...prev, projectWorkerId: proj.workers[0]._id }));
      }
    } else {
      setSelectedProjectWorkers([]);
      setFormData((prev) => ({ ...prev, projectWorkerId: '' }));
    }
  };

  const handlePreSubmit = (e) => {
    e.preventDefault();
    if (!selectedProjectId || !formData.projectWorkerId || !formData.amount || formData.amount <= 0) {
      alert('Please fill out all required payment details correctly.');
      return;
    }
    setConfirmModal(true);
  };

  const handleRecordPayment = async () => {
    try {
      setSubmitting(true);
      await recordPayment(selectedProjectId, {
        ...formData,
        amount: parseFloat(formData.amount),
      });
      setConfirmModal(false);
      setShowModal(false);
      setFormData({
        projectWorkerId: '',
        type: 'daily',
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        method: 'cash',
        reference: '',
        notes: '',
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPaid = payments
    .filter((p) => (p.status || '').toLowerCase() === 'recorded')
    .reduce((acc, p) => acc + (p.amount || 0), 0);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="ks-glass-card p-6 sm:p-8 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-primary/10 via-sky-500/10 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="ks-badge-cyan">
              <Sparkles className="w-3.5 h-3.5" /> Project Finance & Payroll
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-primary dark:text-sky-400" />
            <span>Employer Payments Ledger</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
            Record, track, and manage worker wages, milestone disbursements, and ledger statements across all active sites
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="ks-btn-primary text-xs px-5 py-2.5 font-bold flex items-center gap-2 self-start md:self-auto relative z-10 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Payment</span>
        </button>
      </div>

      {error && (
        <div className="p-4 ks-glass-card border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="w-full p-16 text-center ks-glass-card">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Loading payments ledger...</p>
        </div>
      ) : (
        <>
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="ks-glass-card p-5 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Recorded Disbursed
              </span>
              <p className="text-2xl font-black text-emerald-500 dark:text-emerald-400">
                ₹{totalPaid.toLocaleString()}
              </p>
            </div>
            <div className="ks-glass-card p-5 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Transactions
              </span>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {payments.length}
              </p>
            </div>
            <div className="ks-glass-card p-5 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Active Projects
              </span>
              <p className="text-2xl font-black text-primary dark:text-sky-400">
                {projects.length}
              </p>
            </div>
          </div>

          {/* Payments Table */}
          <div className="ks-glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200/80 dark:border-white/10 flex justify-between items-center">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary dark:text-sky-400" />
                <span>Payment Timeline</span>
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {payments.length} Records
              </span>
            </div>

            {payments.length === 0 ? (
              <div className="p-12 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 space-y-3">
                <CreditCard className="w-10 h-10 mx-auto text-slate-400 opacity-60" />
                <p>No payment records found yet. Record daily or milestone wage payments to populate the ledger.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-100/50 dark:bg-white/5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200/80 dark:border-white/10">
                    <tr>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Project</th>
                      <th className="px-5 py-3.5">Worker</th>
                      <th className="px-5 py-3.5">Type</th>
                      <th className="px-5 py-3.5">Method</th>
                      <th className="px-5 py-3.5">Amount</th>
                      <th className="px-5 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:border-white/5">
                    {payments.map((p) => {
                      const dateStr = p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : '';
                      const statusStr = p.status || 'recorded';
                      return (
                        <tr key={p._id} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                          <td className="px-5 py-3.5 whitespace-nowrap font-medium text-slate-900 dark:text-white">
                            {dateStr}
                          </td>
                          <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                            {p.projectId?.name || 'Project'}
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-primary dark:text-sky-400">
                            {p.workerId?.name || 'Worker'}
                          </td>
                          <td className="px-5 py-3.5 capitalize text-slate-600 dark:text-slate-400">{p.type || 'daily'}</td>
                          <td className="px-5 py-3.5 uppercase font-bold text-[11px] text-slate-500 dark:text-slate-400">
                            {p.method || 'cash'}
                          </td>
                          <td className="px-5 py-3.5 font-black text-emerald-500 dark:text-emerald-400">
                            ₹{(p.amount || 0).toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize border ${
                                statusStr.toLowerCase() === 'recorded'
                                  ? 'ks-badge-emerald'
                                  : 'ks-badge-amber'
                              }`}
                            >
                              {statusStr}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Record Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="ks-glass-card border-white/20 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary dark:text-sky-400" />
                <span>Record Worker Payment</span>
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePreSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Select Project</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => handleProjectSelect(e.target.value)}
                  className="ks-input text-xs"
                  required
                >
                  <option value="">-- Choose Project --</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProjectId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Select Worker</label>
                  <select
                    value={formData.projectWorkerId}
                    onChange={(e) => setFormData({ ...formData, projectWorkerId: e.target.value })}
                    className="ks-input text-xs"
                    required
                  >
                    <option value="">-- Choose Worker --</option>
                    {selectedProjectWorkers.map((pw) => (
                      <option key={pw._id} value={pw._id}>
                        {pw.workerId?.name || 'Worker'} (Agreed: ₹{pw.agreedWage}/day)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Payment Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="ks-input text-xs"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="milestone">Milestone</option>
                    <option value="final">Final</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="e.g. 850"
                    className="ks-input text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Payment Method</label>
                  <select
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                    className="ks-input text-xs"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Payment Date</label>
                  <input
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                    className="ks-input text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Reference No. (Optional)</label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="Txn / Receipt ID"
                  className="ks-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional payment description or advance deduction details..."
                  className="ks-input text-xs h-20"
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
                  Proceed to Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="ks-glass-card border-white/20 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Payment Entry</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to record a payment of <strong className="text-slate-900 dark:text-white">₹{formData.amount}</strong> via <strong className="uppercase">{formData.method}</strong>? This action will permanently update the project payment ledger.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200/80 dark:border-white/10">
              <button
                onClick={() => setConfirmModal(false)}
                className="ks-btn-outline text-xs px-4 py-2 font-semibold"
              >
                Go Back
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={submitting}
                className="ks-btn-primary text-xs px-5 py-2 font-bold disabled:opacity-50"
              >
                {submitting ? 'Recording...' : 'Confirm & Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployerPaymentsPage;
