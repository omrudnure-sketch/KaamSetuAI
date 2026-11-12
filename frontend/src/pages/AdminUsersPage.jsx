import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  getUsersList,
  updateUserStatus,
  getWorkerDirectory,
  getWorkerDetails,
  getEmployerDirectory,
  getEmployerDetails,
} from '../services/adminService.js';
import {
  Users,
  Briefcase,
  Building,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Star,
  FileText,
  AlertTriangle,
  X,
  ChevronRight,
  TrendingUp,
  Award,
  Eye,
  RefreshCw,
} from 'lucide-react';

export const AdminUsersPage = () => {
  const location = useLocation();

  // Determine initial active tab based on route
  const getInitialTab = () => {
    if (location.pathname.includes('/workers')) return 'workers';
    if (location.pathname.includes('/employers')) return 'employers';
    return 'workers'; // default to rich Worker Directory
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Data lists
  const [workersList, setWorkersList] = useState([]);
  const [employersList, setEmployersList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  // Selected Worker / Employer Detail Drawer state
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [workerDetail, setWorkerDetail] = useState(null);
  const [workerDetailLoading, setWorkerDetailLoading] = useState(false);

  const [selectedEmployerId, setSelectedEmployerId] = useState(null);
  const [employerDetail, setEmployerDetail] = useState(null);
  const [employerDetailLoading, setEmployerDetailLoading] = useState(false);

  // Detail Drawer active sub-tab
  const [detailSubTab, setDetailSubTab] = useState('profile'); // 'profile' | 'history' | 'activity'

  // Fetch directory based on active tab
  const fetchDirectory = async () => {
    setLoading(true);
    try {
      if (activeTab === 'workers') {
        const res = await getWorkerDirectory({
          search,
          city: cityFilter,
          availability: statusFilter,
          verificationStatus: verificationFilter,
          limit: 50,
        });
        if (res?.data?.workers) {
          setWorkersList(res.data.workers);
          setTotalCount(res.data.total);
        }
      } else if (activeTab === 'employers') {
        const res = await getEmployerDirectory({
          search,
          city: cityFilter,
          verificationStatus: verificationFilter,
          limit: 50,
        });
        if (res?.data?.employers) {
          setEmployersList(res.data.employers);
          setTotalCount(res.data.total);
        }
      } else {
        const res = await getUsersList({
          search,
          status: statusFilter,
          limit: 50,
        });
        if (res?.data?.users) {
          setUsersList(res.data.users);
          setTotalCount(res.data.total);
        }
      }
    } catch (err) {
      console.error('Failed to fetch directory', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory();
  }, [activeTab, search, cityFilter, statusFilter, verificationFilter]);

  // Open Worker Detail Drawer
  const handleOpenWorker = async (workerId) => {
    setSelectedWorkerId(workerId);
    setWorkerDetailLoading(true);
    setDetailSubTab('profile');
    try {
      const res = await getWorkerDetails(workerId);
      if (res?.data) {
        setWorkerDetail(res.data);
      }
    } catch (err) {
      console.error('Failed to load worker details', err);
    } finally {
      setWorkerDetailLoading(false);
    }
  };

  // Open Employer Detail Drawer
  const handleOpenEmployer = async (employerId) => {
    setSelectedEmployerId(employerId);
    setEmployerDetailLoading(true);
    setDetailSubTab('profile');
    try {
      const res = await getEmployerDetails(employerId);
      if (res?.data) {
        setEmployerDetail(res.data);
      }
    } catch (err) {
      console.error('Failed to load employer details', err);
    } finally {
      setEmployerDetailLoading(false);
    }
  };

  // Toggle user account status
  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'blocked' ? 'active' : 'blocked';
    try {
      await updateUserStatus(user.id || user._id, {
        status: newStatus,
        reason: 'Administrative compliance toggle',
      });
      fetchDirectory();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  return (
    <div className="w-full space-y-5 py-3">
      {/* ==============================================================
          HEADER: Title, Tab Navigation
          ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary dark:text-sky-400 border border-primary/20">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Platform Directory & Work Lifecycle Monitor
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete administration over verified workers, employers, credentials, work history, active attendance, and project assignments.
          </p>
        </div>

        {/* Directory Mode Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('workers')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'workers'
                ? 'bg-white dark:bg-slate-700 text-primary dark:text-sky-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Worker Directory</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('employers')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'employers'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Employer Directory</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>All Accounts</span>
          </button>
        </div>
      </div>

      {/* ==============================================================
          SEARCH & FILTER TOOLBAR
          ============================================================== */}
      <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeTab === 'workers'
                ? 'Search worker name, skills, phone, ID...'
                : activeTab === 'employers'
                ? 'Search company name, contact, phone...'
                : 'Search name, phone, email...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <input
          type="text"
          placeholder="Filter city/district..."
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="w-36 py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {activeTab === 'workers' ? (
            <>
              <option value="">All Availability</option>
              <option value="available">Available for Work</option>
              <option value="busy">Hired / Busy</option>
              <option value="unavailable">Unavailable</option>
            </>
          ) : (
            <>
              <option value="">All Account Statuses</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked / Suspended</option>
            </>
          )}
        </select>

        <select
          value={verificationFilter}
          onChange={(e) => setVerificationFilter(e.target.value)}
          className="py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All Verifications</option>
          <option value="verified">Verified Official</option>
          <option value="unverified">Unverified</option>
          <option value="pending">Pending Queue</option>
        </select>

        <span className="text-[11px] font-bold text-slate-400 ml-auto">
          {totalCount} Total Listed
        </span>
      </div>

      {/* ==============================================================
          TAB 1: WORKER DIRECTORY
          ============================================================== */}
      {activeTab === 'workers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-16 text-center text-xs text-slate-400 animate-pulse">
              Loading worker directory...
            </div>
          ) : workersList.length === 0 ? (
            <div className="col-span-full py-16 text-center text-xs text-slate-400">
              No workers match the current search & filters.
            </div>
          ) : (
            workersList.map((w) => (
              <div
                key={w.id}
                className="rounded-2xl p-4 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-cyan-500/40 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  {/* Top: Avatar, Name, Verification, Availability */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-11 h-11 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-black text-sm flex items-center justify-center border border-cyan-500/20 shrink-0">
                        {w.photo ? (
                          <img
                            src={w.photo}
                            alt=""
                            className="w-full h-full rounded-xl object-cover"
                          />
                        ) : (
                          w.fullName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                          {w.fullName}
                        </h3>
                        <p className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
                          {w.primarySkill}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                        w.availability === 'available'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                      }`}
                    >
                      {w.availability}
                    </span>
                  </div>

                  {/* Skills tags */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    {w.skills.slice(0, 3).map((sk, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold"
                      >
                        {sk}
                      </span>
                    ))}
                    {w.skills.length > 3 && (
                      <span className="text-[10px] text-slate-400 font-bold">
                        +{w.skills.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Meta Details */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{w.city}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {w.dailyWage} ₹/day
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{w.experienceYears} yrs exp</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="font-mono truncate">{w.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID: #{w.id.slice(0, 8)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenWorker(w.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-bold text-xs transition-colors"
                  >
                    <span>Inspect Profile</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ==============================================================
          TAB 2: EMPLOYER DIRECTORY
          ============================================================== */}
      {activeTab === 'employers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-16 text-center text-xs text-slate-400 animate-pulse">
              Loading employer directory...
            </div>
          ) : employersList.length === 0 ? (
            <div className="col-span-full py-16 text-center text-xs text-slate-400">
              No employers match the current search & filters.
            </div>
          ) : (
            employersList.map((e) => (
              <div
                key={e.id}
                className="rounded-2xl p-4 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-indigo-500/40 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center border border-indigo-500/20 shrink-0">
                        {e.logo ? (
                          <img
                            src={e.logo}
                            alt=""
                            className="w-full h-full rounded-xl object-cover"
                          />
                        ) : (
                          e.companyName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                          {e.companyName}
                        </h3>
                        <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                          {e.businessType}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                        e.verificationStatus === 'verified'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      }`}
                    >
                      {e.verificationStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{e.city}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{e.industry}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="font-mono truncate">{e.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <span className="truncate">{e.email || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID: #{e.id.slice(0, 8)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenEmployer(e.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs transition-colors"
                  >
                    <span>Inspect Profile</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ==============================================================
          TAB 3: ALL USER ACCOUNTS (Governance Table)
          ============================================================== */}
      {activeTab === 'users' && (
        <div className="rounded-2xl p-4 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
              <tr>
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Contact</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Created</th>
                <th className="py-2.5 px-3 text-right">Governance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 animate-pulse">
                    Loading accounts...
                  </td>
                </tr>
              ) : usersList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No users found matching query.
                  </td>
                </tr>
              ) : (
                usersList.map((u) => (
                  <tr key={u.id || u._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                      {u.name}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                      {u.phone || u.email || 'N/A'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                          u.status === 'blocked'
                            ? 'bg-rose-500/15 text-rose-600'
                            : 'bg-emerald-500/15 text-emerald-600'
                        }`}
                      >
                        {u.status || 'active'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                          u.status === 'blocked'
                            ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20'
                        }`}
                      >
                        {u.status === 'blocked' ? 'Unblock' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ==============================================================
          WORKER DETAIL MODAL / DRAWER
          ============================================================== */}
      {selectedWorkerId && (
        <div className="fixed inset-0 z-[1200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 font-black text-sm flex items-center justify-center border border-cyan-500/20">
                  {workerDetail?.worker?.fullName?.charAt(0) || 'W'}
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {workerDetail?.worker?.fullName || 'Worker Profile'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    ID: #{selectedWorkerId} • Role: Verified Labour
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedWorkerId(null);
                  setWorkerDetail(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-tab Navigation */}
            <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-100 dark:border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDetailSubTab('profile')}
                className={`pb-2.5 px-2 border-b-2 transition-all ${
                  detailSubTab === 'profile'
                    ? 'border-primary text-primary dark:text-sky-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Profile & Verification
              </button>
              <button
                type="button"
                onClick={() => setDetailSubTab('activity')}
                className={`pb-2.5 px-2 border-b-2 transition-all ${
                  detailSubTab === 'activity'
                    ? 'border-primary text-primary dark:text-sky-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Current Activity & Today
              </button>
              <button
                type="button"
                onClick={() => setDetailSubTab('history')}
                className={`pb-2.5 px-2 border-b-2 transition-all ${
                  detailSubTab === 'history'
                    ? 'border-primary text-primary dark:text-sky-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Work History & Lifecycle
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {workerDetailLoading ? (
                <div className="py-20 text-center text-xs text-slate-400 animate-pulse">
                  Loading deep work history...
                </div>
              ) : !workerDetail ? (
                <div className="py-20 text-center text-xs text-slate-400">
                  Profile information unavailable.
                </div>
              ) : (
                <>
                  {/* TAB: PROFILE & VERIFICATION */}
                  {detailSubTab === 'profile' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Primary Skill</span>
                          <div className="font-extrabold text-slate-900 dark:text-white mt-0.5">{workerDetail.worker.primarySkill}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Daily Wage</span>
                          <div className="font-extrabold text-emerald-600 font-mono mt-0.5">{workerDetail.worker.dailyWage} ₹/day</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Experience</span>
                          <div className="font-extrabold text-slate-900 dark:text-white mt-0.5">{workerDetail.worker.experienceYears} Years</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Availability</span>
                          <div className="font-extrabold text-cyan-600 uppercase mt-0.5">{workerDetail.worker.availability}</div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                        <h4 className="text-xs font-bold uppercase text-slate-400">Contact & Address</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <div><strong>Phone:</strong> {workerDetail.worker.phone || 'N/A'}</div>
                          <div><strong>Email:</strong> {workerDetail.worker.email || 'N/A'}</div>
                          <div><strong>City:</strong> {workerDetail.worker.city}</div>
                          <div className="sm:col-span-3"><strong>Full Address:</strong> {workerDetail.worker.address || 'Standard area'}</div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                        <h4 className="text-xs font-bold uppercase text-slate-400">Skills & Trade Capabilities</h4>
                        <div className="flex flex-wrap gap-2">
                          {workerDetail.worker.skills.map((s, idx) => (
                            <span key={idx} className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-slate-200">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB: CURRENT ACTIVITY */}
                  {detailSubTab === 'activity' && (
                    <div className="space-y-4">
                      {workerDetail.currentActivity.hasActiveProject ? (
                        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-extrabold text-cyan-800 dark:text-cyan-300">
                              Active Project: {workerDetail.currentActivity.activeProject.title}
                            </h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-500/20 text-cyan-700">
                              {workerDetail.currentActivity.activeProject.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><strong>Employer:</strong> {workerDetail.currentActivity.activeProject.employerName}</div>
                            <div><strong>Site:</strong> {workerDetail.currentActivity.activeProject.location}</div>
                            <div><strong>Start:</strong> {new Date(workerDetail.currentActivity.activeProject.startDate).toLocaleDateString()}</div>
                            <div><strong>Progress:</strong> {workerDetail.currentActivity.activeProject.progress}%</div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                          Worker is not currently deployed on an active ongoing site.
                        </div>
                      )}

                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                        <h4 className="text-xs font-bold uppercase text-slate-400">Attendance Today</h4>
                        <div className="text-xs flex items-center justify-between">
                          <span>Status: <strong>{workerDetail.currentActivity.attendanceToday.status}</strong></span>
                          <span>Logged Check-in: <strong>{workerDetail.currentActivity.attendanceToday.checkIn || 'None'}</strong></span>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                        <h4 className="text-xs font-bold uppercase text-slate-400">Payment Status</h4>
                        <p className="text-xs font-bold text-emerald-600">
                          {workerDetail.currentActivity.paymentStatus}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* TAB: WORK HISTORY & LIFECYCLE */}
                  {detailSubTab === 'history' && (
                    <div className="space-y-4">
                      {/* Stats grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Applications</span>
                          <div className="text-lg font-black text-slate-900 dark:text-white">{workerDetail.workHistory.stats.totalApplications}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Agreements</span>
                          <div className="text-lg font-black text-emerald-600">{workerDetail.workHistory.stats.totalAgreements}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Attendance Days</span>
                          <div className="text-lg font-black text-cyan-600">{workerDetail.workHistory.stats.totalAttendanceDays}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Paid Settlements</span>
                          <div className="text-lg font-black text-purple-600">{workerDetail.workHistory.stats.totalPaymentsReceived} ₹</div>
                        </div>
                      </div>

                      {/* Recent Agreements & Projects */}
                      <div>
                        <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Projects & Agreements</h4>
                        <div className="space-y-2">
                          {workerDetail.workHistory.projects.length === 0 ? (
                            <p className="text-xs text-slate-400">No project assignments on record.</p>
                          ) : (
                            workerDetail.workHistory.projects.map((pr, idx) => (
                              <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs flex items-center justify-between">
                                <div>
                                  <span className="font-bold">{pr.name || pr.title}</span>
                                  <span className="text-[10px] text-slate-400 ml-2">Employer: {pr.employerId?.name}</span>
                                </div>
                                <span className="font-mono uppercase font-bold text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700">
                                  {pr.status}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          EMPLOYER DETAIL MODAL / DRAWER
          ============================================================== */}
      {selectedEmployerId && (
        <div className="fixed inset-0 z-[1200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 font-black text-sm flex items-center justify-center border border-indigo-500/20">
                  {employerDetail?.employer?.companyName?.charAt(0) || 'E'}
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {employerDetail?.employer?.companyName || 'Employer Profile'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    ID: #{selectedEmployerId} • Business Account
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedEmployerId(null);
                  setEmployerDetail(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {employerDetailLoading ? (
                <div className="py-20 text-center text-xs text-slate-400 animate-pulse">
                  Loading employer hiring history...
                </div>
              ) : !employerDetail ? (
                <div className="py-20 text-center text-xs text-slate-400">
                  Profile information unavailable.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Employer Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Jobs Posted</span>
                      <div className="text-lg font-black text-slate-900 dark:text-white">{employerDetail.hiringHistory.stats.totalJobsPosted}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Active Jobs</span>
                      <div className="text-lg font-black text-blue-600">{employerDetail.hiringHistory.stats.activeJobs}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Workers Hired</span>
                      <div className="text-lg font-black text-emerald-600">{employerDetail.hiringHistory.stats.totalWorkersHired}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Active Sites</span>
                      <div className="text-lg font-black text-purple-600">{employerDetail.hiringHistory.stats.activeProjects}</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                    <h4 className="text-xs font-bold uppercase text-slate-400">Company & Contact Info</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div><strong>Contact Person:</strong> {employerDetail.employer.contactPerson}</div>
                      <div><strong>Phone:</strong> {employerDetail.employer.phone || 'N/A'}</div>
                      <div><strong>Email:</strong> {employerDetail.employer.email || 'N/A'}</div>
                      <div><strong>Industry:</strong> {employerDetail.employer.industry}</div>
                      <div><strong>City:</strong> {employerDetail.employer.city}</div>
                      <div><strong>GSTIN / Tax:</strong> {employerDetail.employer.gstin || 'Unspecified'}</div>
                    </div>
                  </div>

                  {/* Active Projects List */}
                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Live Site Projects</h4>
                    <div className="space-y-2">
                      {employerDetail.currentActivity.activeProjects.length === 0 ? (
                        <p className="text-xs text-slate-400">No active ongoing projects on site.</p>
                      ) : (
                        employerDetail.currentActivity.activeProjects.map((p, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">{p.title}</div>
                              <div className="text-[10px] text-slate-400">{p.city} • Progress: {p.progress}%</div>
                            </div>
                            <span className="px-2 py-0.5 rounded font-bold text-[10px] uppercase bg-purple-500/10 text-purple-600">
                              {p.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
