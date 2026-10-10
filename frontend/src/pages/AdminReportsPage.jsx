import React, { useState, useEffect, useCallback } from 'react';
import { authApiClient } from '../services/authApi.js';

export const AdminReportsPage = () => {
  const [reportType, setReportType] = useState('workers');
  const [dateRange, setDateRange] = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [city, setCity] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);

  const reportCategories = [
    { value: 'workers', label: 'Workers Registry' },
    { value: 'employers', label: 'Employers Registry' },
    { value: 'jobs', label: 'Jobs & Requirements' },
    { value: 'applications', label: 'Job Applications' },
    { value: 'agreements', label: 'Hiring Agreements' },
    { value: 'projects', label: 'Projects & Engagements' },
    { value: 'attendance', label: 'Attendance Records' },
    { value: 'payments', label: 'Payment Ledger' },
    { value: 'reviews', label: 'Reviews & Ratings' },
    { value: 'complaints', label: 'Complaints Queue' },
    { value: 'disputes', label: 'Disputes & Claims' },
    { value: 'skills', label: 'Skill Demand & Shortage' },
    { value: 'locations', label: 'Geographic Supply & Demand' },
  ];

  const fetchReportPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit,
        dateRange,
        ...(dateRange === 'custom' && customStart ? { startDate: customStart } : {}),
        ...(dateRange === 'custom' && customEnd ? { endDate: customEnd } : {}),
        ...(search ? { search } : {}),
        ...(status ? { status } : {}),
        ...(city ? { city } : {}),
      };

      const res = await authApiClient.get(`/admin/reports/${reportType}`, { params });
      setReportData(res.data?.data || null);
    } catch (err) {
      console.error('Failed to fetch report preview:', err);
      setError('Failed to fetch report data. Check filters and try again.');
    } finally {
      setLoading(false);
    }
  }, [reportType, page, limit, dateRange, customStart, customEnd, search, status, city]);

  useEffect(() => {
    fetchReportPreview();
  }, [fetchReportPreview]);

  // Reset page to 1 when filters change
  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const handleDownloadCSV = async () => {
    setDownloading(true);
    try {
      const params = {
        format: 'csv',
        dateRange,
        ...(dateRange === 'custom' && customStart ? { startDate: customStart } : {}),
        ...(dateRange === 'custom' && customEnd ? { endDate: customEnd } : {}),
        ...(search ? { search } : {}),
        ...(status ? { status } : {}),
        ...(city ? { city } : {}),
      };

      const response = await authApiClient.get(`/admin/reports/${reportType}`, {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `kaamsetu_${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download CSV report:', err);
      alert('Failed to generate CSV export. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="w-full space-y-6 py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-outline-variant/30">
        <div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">Platform Reports & Data Export</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Query across 13 business datasets with backend pagination, formula-injection protection, and instant CSV generation.
          </p>
        </div>

        <button
          onClick={handleDownloadCSV}
          disabled={downloading || loading}
          className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:opacity-95 active:scale-95 transition-all self-start md:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">file_download</span>
          <span>{downloading ? 'Exporting CSV...' : 'Export Filtered CSV'}</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Category Dropdown */}
          <div>
            <label className="font-bold text-on-surface block mb-1">Dataset Category</label>
            <select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl bg-surface-container-low p-2.5 border border-outline-variant/30 font-semibold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {reportCategories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Selector */}
          <div>
            <label className="font-bold text-on-surface block mb-1">Time Period</label>
            <select
              value={dateRange}
              onChange={handleFilterChange(setDateRange)}
              className="w-full rounded-xl bg-surface-container-low p-2.5 border border-outline-variant/30 font-semibold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="year">This Year</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="font-bold text-on-surface block mb-1">Search Keywords</label>
            <input
              type="text"
              placeholder="Search name, skill, title..."
              value={search}
              onChange={handleFilterChange(setSearch)}
              className="w-full rounded-xl bg-surface-container-low p-2.5 border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            />
          </div>

          {/* City / Location Filter */}
          <div>
            <label className="font-bold text-on-surface block mb-1">City Filter</label>
            <input
              type="text"
              placeholder="Filter by city (e.g. Pune)..."
              value={city}
              onChange={handleFilterChange(setCity)}
              className="w-full rounded-xl bg-surface-container-low p-2.5 border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            />
          </div>
        </div>

        {/* Custom Range Picker row if selected */}
        {dateRange === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-outline-variant/20 text-xs">
            <label className="font-bold text-on-surface">From:</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-lg bg-surface-container-low p-2 border border-outline-variant/30 text-on-surface"
            />
            <label className="font-bold text-on-surface ml-2">To:</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg bg-surface-container-low p-2 border border-outline-variant/30 text-on-surface"
            />
            <button
              onClick={fetchReportPreview}
              className="px-3 py-1.5 bg-primary text-on-primary font-bold rounded-lg text-xs"
            >
              Apply Filter
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-error/10 border border-error/30 text-error rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Live Data Preview Table */}
      <div className="p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-4">
        <div className="flex items-center justify-between text-xs">
          <div className="font-bold uppercase tracking-wider text-on-surface flex items-center gap-2">
            <span>Report Preview</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
              {reportData?.totalRecords ?? 0} Records
            </span>
          </div>
          <div className="text-on-surface-variant text-[11px]">
            Page <strong>{reportData?.page || 1}</strong> of <strong>{reportData?.totalPages || 1}</strong>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-on-surface-variant flex flex-col items-center justify-center gap-3">
            <div className="w-7 h-7 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Fetching backend report data...</span>
          </div>
        ) : !reportData?.data || reportData.data.length === 0 ? (
          <div className="p-12 text-center text-xs text-on-surface-variant bg-surface-container-low rounded-xl">
            No records found matching the specified report criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-outline-variant/20 text-on-surface-variant font-bold">
                  {reportData.headers?.map((h, i) => (
                    <th key={i} className="py-2.5 px-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 font-medium">
                {reportData.data.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-surface-container-low/40">
                    {reportData.headers?.map((h, hIdx) => (
                      <td key={hIdx} className="py-2.5 px-3 whitespace-nowrap text-on-surface">
                        {row[h] !== undefined && row[h] !== null ? String(row[h]) : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {reportData && reportData.totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-outline-variant/20 text-xs">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-outline-variant/30 font-semibold disabled:opacity-40 hover:bg-surface-container-low transition-all"
            >
              Previous
            </button>
            <span className="font-semibold text-on-surface-variant">
              Page {reportData.page} of {reportData.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(reportData.totalPages, p + 1))}
              disabled={page >= reportData.totalPages}
              className="px-3 py-1.5 rounded-lg border border-outline-variant/30 font-semibold disabled:opacity-40 hover:bg-surface-container-low transition-all"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReportsPage;
