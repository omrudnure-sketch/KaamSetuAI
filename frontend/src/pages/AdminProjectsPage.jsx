import React, { useState, useEffect } from 'react';
import { authApiClient } from '../services/authApi.js';

export const AdminProjectsPage = () => {
  const [delayed, setDelayed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDelayed = async () => {
      try {
        const res = await authApiClient.get('/admin/projects/delayed');
        if (res?.data?.data) setDelayed(res.data.data);
      } catch (err) {
        console.error('Failed to fetch delayed projects', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDelayed();
  }, []);

  return (
    <div className="w-full space-y-space-md py-2">
      <div className="flex items-center justify-between">
        <h1 className="font-headline-sm text-xl font-bold text-on-surface">Project Governance</h1>
        <span className="font-label-sm text-xs text-error font-bold">{delayed.length} Delayed Projects</span>
      </div>

      <div className="space-y-3">
        <div className="font-label-md text-xs font-bold text-on-surface-variant uppercase tracking-wider">
          Delayed Projects Detection Engine
        </div>

        {loading ? (
          <div className="text-center text-xs text-on-surface-variant py-8 animate-pulse">Scanning delayed projects...</div>
        ) : delayed.length === 0 ? (
          <div className="text-center text-xs text-on-surface-variant py-8">No delayed projects detected on site.</div>
        ) : (
          delayed.map((p) => (
            <div
              key={p._id}
              className="p-space-md rounded-xl bg-surface-container-lowest border border-error/30 shadow-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-headline-sm text-sm font-bold text-on-surface">{p.title}</span>
                <span className="px-2 py-0.5 rounded bg-error-container text-on-error-container font-bold text-[10px] uppercase">
                  Delayed
                </span>
              </div>
              <div className="font-body-sm text-xs text-on-surface-variant">
                Employer: {p.employerId?.name || 'N/A'} • Expected End:{' '}
                {p.expectedEndDate ? new Date(p.expectedEndDate).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
