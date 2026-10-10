import React, { useState, useEffect } from 'react';
import { getMyDisputes, createDispute, cancelDispute } from '../services/disputeService.js';
import { getEmployerProjects } from '../services/projectService.js';
import { Scale, PlusCircle, XCircle } from 'lucide-react';

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
      setDisputes(dispRes.data || []);
      setProjects(projRes.data || []);
    } catch (_e) {
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (pId) => {
    setFormData((prev) => ({ ...prev, projectId: pId }));
    const projRecord = projects.find((p) => p._id === pId);
    if (projRecord && projRecord.workers && projRecord.workers.length > 0) {
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
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employer Project Disputes</h1>
          <p className="text-gray-600 text-sm mt-1">Initiate and track project disputes regarding work quality, attendance defaults, or contract terms</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
        >
          <PlusCircle className="w-4 h-4" /> Initiate Dispute
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="font-bold text-gray-900 text-sm">Dispute Case Ledger ({disputes.length})</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">Loading disputes...</div>
        ) : disputes.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center space-y-2">
            <Scale className="w-10 h-10 text-gray-300" />
            <p className="text-sm font-medium">No active disputes.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {disputes.map((d) => (
              <div key={d._id} className="p-5 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">
                      {d.projectId?.name || 'Project'} — <span className="capitalize">{d.type} Dispute</span>
                    </span>
                    {d.amount > 0 && (
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Disputed Amount: ₹{d.amount}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold capitalize ${
                    d.status === 'open' ? 'bg-amber-100 text-amber-800' :
                    d.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {d.status}
                  </span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">{d.description}</p>
                <div className="flex justify-between items-center text-[10px] text-gray-400 pt-1">
                  <span>Initiated: {new Date(d.createdAt).toLocaleDateString()}</span>
                  {d.status === 'open' && (
                    <button onClick={() => handleCancel(d._id)} className="text-red-600 font-semibold hover:underline flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Cancel Dispute
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Initiate Project Dispute</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Select Project</label>
                <select
                  value={formData.projectId}
                  onChange={(e) => handleProjectSelect(e.target.value)}
                  className="w-full border rounded-lg p-2.5 text-sm"
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
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Dispute Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border rounded-lg p-2.5 text-sm"
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
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Disputed Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 1000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full border rounded-lg p-2.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Dispute Description</label>
                <textarea
                  rows="4"
                  placeholder="Explain dispute details..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded-lg p-2.5 text-sm"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-amber-600 text-white font-semibold rounded-lg text-sm">
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
