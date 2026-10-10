import React, { useState, useEffect } from 'react';
import { getMyComplaints, createComplaint, cancelComplaint } from '../services/complaintService.js';
import { getEmployerProjects } from '../services/projectService.js';
import { AlertOctagon, PlusCircle, XCircle } from 'lucide-react';

export const EmployerComplaintsPage = () => {
  const [complaints, setComplaints] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    targetUserId: '',
    projectId: '',
    category: 'worker_issue',
    priority: 'medium',
    description: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [compRes, projRes] = await Promise.all([
        getMyComplaints(),
        getEmployerProjects(),
      ]);
      setComplaints(compRes.data || []);
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
      setFormData((prev) => ({ ...prev, targetUserId: firstWrk }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.targetUserId || !formData.description) {
      alert('Please select a project with assigned workers and enter a description.');
      return;
    }

    try {
      await createComplaint(formData);
      setShowModal(false);
      setFormData({ targetUserId: '', projectId: '', category: 'worker_issue', priority: 'medium', description: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit complaint');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this complaint?')) return;
    try {
      await cancelComplaint(id);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel complaint');
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employer Issues & Complaints</h1>
          <p className="text-gray-600 text-sm mt-1">Report worker misconduct, attendance defaults, or project safety issues</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
        >
          <PlusCircle className="w-4 h-4" /> Report Issue
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="font-bold text-gray-900 text-sm">Complaint Records ({complaints.length})</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">Loading complaints...</div>
        ) : complaints.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center space-y-2">
            <AlertOctagon className="w-10 h-10 text-gray-300" />
            <p className="text-sm font-medium">No complaints filed.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {complaints.map((c) => (
              <div key={c._id} className="p-5 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm capitalize">{c.category} Issue</span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                      c.priority === 'critical' || c.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {c.priority}
                    </span>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold capitalize ${
                    c.status === 'new' ? 'bg-blue-100 text-blue-800' :
                    c.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {c.status}
                  </span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">{c.description}</p>
                <div className="flex justify-between items-center text-[10px] text-gray-400 pt-1">
                  <span>Filed: {new Date(c.createdAt).toLocaleDateString()}</span>
                  {c.status === 'new' && (
                    <button onClick={() => handleCancel(c._id)} className="text-red-600 font-semibold hover:underline flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Cancel Complaint
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
            <h3 className="text-lg font-bold text-gray-900">File a Worker Issue Complaint</h3>
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
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border rounded-lg p-2.5 text-sm"
                  >
                    <option value="worker_issue">Worker Issue</option>
                    <option value="attendance">Attendance Default</option>
                    <option value="misconduct">Misconduct</option>
                    <option value="safety">Safety Default</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full border rounded-lg p-2.5 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Description</label>
                <textarea
                  rows="4"
                  placeholder="Describe worker misconduct or issue..."
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
                <button type="submit" className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg text-sm">
                  Submit Complaint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployerComplaintsPage;
