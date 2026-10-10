import React, { useState, useEffect } from 'react';
import { getUsersList, updateUserStatus } from '../services/adminService.js';

export const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsersList({ search, role, status });
      if (res?.data?.users) setUsers(res.data.users);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, role, status]);

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'blocked' ? 'active' : 'blocked';
    try {
      await updateUserStatus(user._id, { status: newStatus, reason: 'Admin governance toggle' });
      fetchUsers();
    } catch (err) {
      alert('Failed to update user status');
    }
  };

  return (
    <div className="w-full space-y-space-md py-2">
      <div className="flex items-center justify-between">
        <h1 className="font-headline-sm text-xl font-bold text-on-surface">User Governance</h1>
        <span className="font-label-sm text-xs text-on-surface-variant">{users.length} Users Listed</span>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          type="text"
          placeholder="Search name, phone, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl bg-surface-container-lowest p-2.5 text-xs border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-xl bg-surface-container-lowest p-2.5 text-xs border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All Roles</option>
          <option value="worker">Worker</option>
          <option value="employer">Employer</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl bg-surface-container-lowest p-2.5 text-xs border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {/* Users List */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center text-xs text-on-surface-variant py-8 animate-pulse">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="text-center text-xs text-on-surface-variant py-8">No matching users found.</div>
        ) : (
          users.map((u) => (
            <div
              key={u._id}
              className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-label-md text-sm font-bold text-on-surface truncate">{u.name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-surface-container text-primary">
                    {u.role}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      u.status === 'blocked'
                        ? 'bg-error-container text-on-error-container'
                        : 'bg-tertiary-container text-on-tertiary-container'
                    }`}
                  >
                    {u.status || 'active'}
                  </span>
                </div>
                <div className="font-body-sm text-xs text-on-surface-variant mt-0.5 truncate">
                  Phone: {u.phone} • Email: {u.email || 'N/A'}
                </div>
              </div>

              <button
                onClick={() => handleToggleStatus(u)}
                className={`px-3 py-1.5 rounded-lg font-label-sm text-xs font-bold transition-all ${
                  u.status === 'blocked'
                    ? 'bg-tertiary text-on-tertiary hover:bg-tertiary-container'
                    : 'bg-error text-on-error hover:bg-error-container'
                }`}
              >
                {u.status === 'blocked' ? 'Unblock User' : 'Block User'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
