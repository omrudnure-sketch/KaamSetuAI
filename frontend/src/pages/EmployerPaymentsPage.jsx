import React, { useState, useEffect } from 'react';
import { getEmployerPayments, recordPayment } from '../services/paymentService.js';
import { getEmployerProjects } from '../services/projectService.js';

const EmployerPaymentsPage = () => {
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
      setPayments(payRes.data || []);
      setProjects(projRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (projId) => {
    setSelectedProjectId(projId);
    const proj = projects.find((p) => p._id === projId);
    if (proj && proj.workers) {
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

  const totalPaid = payments.filter((p) => p.status === 'recorded').reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employer Payments Ledger</h1>
          <p className="text-gray-600 text-sm mt-1">Record, track, and manage worker payments across your projects</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-lg text-sm shadow-sm transition-colors"
        >
          + Record New Payment
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Recorded Payments</span>
              <p className="text-2xl font-extrabold text-indigo-600 mt-2">₹{totalPaid.toLocaleString()}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Transactions</span>
              <p className="text-2xl font-extrabold text-gray-900 mt-2">{payments.length}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Projects</span>
              <p className="text-2xl font-extrabold text-blue-600 mt-2">{projects.length}</p>
            </div>
          </div>

          {/* Payments Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Payment Timeline</h2>
            </div>
            {payments.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No payment records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase border-b">
                    <tr>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Project</th>
                      <th className="px-6 py-3">Worker</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Method</th>
                      <th className="px-6 py-3">Amount</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payments.map((p) => (
                      <tr key={p._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          {new Date(p.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-800">
                          {p.projectId?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {p.workerId?.name || 'Worker'}
                        </td>
                        <td className="px-6 py-4 capitalize">{p.type}</td>
                        <td className="px-6 py-4 uppercase font-semibold text-xs text-gray-500">{p.method}</td>
                        <td className="px-6 py-4 font-bold text-gray-900">₹{p.amount?.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                            p.status === 'recorded' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Record Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Record Worker Payment</h2>

            <form onSubmit={handlePreSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Select Project</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => handleProjectSelect(e.target.value)}
                  className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500"
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
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Select Worker</label>
                  <select
                    value={formData.projectWorkerId}
                    onChange={(e) => setFormData({ ...formData, projectWorkerId: e.target.value })}
                    className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500"
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
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Payment Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border rounded-lg p-2.5 text-sm"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="milestone">Milestone</option>
                    <option value="final">Final</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="e.g. 850"
                    className="w-full border rounded-lg p-2.5 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Payment Method</label>
                  <select
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                    className="w-full border rounded-lg p-2.5 text-sm"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                    className="w-full border rounded-lg p-2.5 text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Reference No. (Optional)</label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="Txn / Receipt ID"
                  className="w-full border rounded-lg p-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional payment description"
                  className="w-full border rounded-lg p-2.5 text-sm h-20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Payment Entry</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to record a payment of <strong className="text-gray-900">₹{formData.amount}</strong> via <strong className="uppercase">{formData.method}</strong>? This action will update the project payment ledger.
            </p>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => setConfirmModal(false)}
                className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Go Back
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={submitting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
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
