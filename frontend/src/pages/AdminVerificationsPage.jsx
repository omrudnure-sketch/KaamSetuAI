import React, { useState, useEffect } from 'react';
import { authApiClient } from '../services/authApi.js';

export const AdminVerificationsPage = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await authApiClient.get('/admin/verifications?status=pending');
      if (res?.data?.data?.records) setQueue(res.data.data.records);
    } catch (err) {
      console.error('Failed to fetch verification queue', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleReview = async (id, status) => {
    try {
      await authApiClient.patch(`/admin/verifications/${id}/review`, { status });
      fetchQueue();
    } catch (err) {
      alert('Failed to review record');
    }
  };

  return (
    <div className="w-full space-y-space-md py-2">
      <h1 className="font-headline-sm text-xl font-bold text-on-surface">Verification Center</h1>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center text-xs text-on-surface-variant py-8 animate-pulse">Loading verification queue...</div>
        ) : queue.length === 0 ? (
          <div className="text-center text-xs text-on-surface-variant py-8">No pending verifications.</div>
        ) : (
          queue.map((q) => (
            <div
              key={q._id}
              className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex items-center justify-between gap-3"
            >
              <div>
                <div className="font-label-md text-sm font-bold text-on-surface">
                  {q.userId?.name || 'User'} ({q.userId?.role || 'worker'})
                </div>
                <div className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                  Type: {q.verificationType} • Phone: {q.userId?.phone}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReview(q._id, 'verified')}
                  className="px-3 py-1.5 rounded-lg bg-tertiary text-on-tertiary font-label-sm text-xs font-bold"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReview(q._id, 'rejected')}
                  className="px-3 py-1.5 rounded-lg bg-error text-on-error font-label-sm text-xs font-bold"
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
