import React, { useState, useEffect } from 'react';
import { getAuditLogs } from '../services/adminService.js';

export const AdminAuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await getAuditLogs();
        if (res?.data?.logs) setLogs(res.data.logs);
      } catch (err) {
        console.error('Failed to fetch audit logs', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="w-full space-y-space-md py-2">
      <h1 className="font-headline-sm text-xl font-bold text-on-surface">Platform Audit Logs</h1>

      <div className="space-y-2">
        {loading ? (
          <div className="text-center text-xs text-on-surface-variant py-8 animate-pulse">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center text-xs text-on-surface-variant py-8">No audit logs recorded yet.</div>
        ) : (
          logs.map((log) => (
            <div
              key={log._id}
              className="p-space-sm rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex items-center justify-between gap-3 text-xs"
            >
              <div>
                <div className="font-bold text-primary">{log.action}</div>
                <div className="text-on-surface-variant text-[11px] mt-0.5">
                  Target: {log.targetType} ({log.targetId || 'N/A'}) • Admin: {log.adminId?.name || 'System'}
                </div>
              </div>
              <div className="text-[10px] text-on-surface-variant text-right font-mono">
                {new Date(log.createdAt).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
