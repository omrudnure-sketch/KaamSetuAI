import React, { useState, useEffect } from 'react';
import {
  getProjectMonitoringList,
  getProjectMonitoringDetails,
} from '../services/adminService.js';
import {
  Briefcase,
  Building,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  DollarSign,
  ChevronRight,
  X,
  Search,
  Filter,
  RefreshCw,
  FileText,
  Camera,
  MessageSquare,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const AdminProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    delayedProjects: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('');
  const [delayedOnly, setDelayedOnly] = useState(false);

  // Selected Project Detail Drawer
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projectDetails, setProjectDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await getProjectMonitoringList({
        search,
        status: statusFilter,
        city: cityFilter,
        delayedOnly,
        limit: 50,
      });
      if (res?.data?.projects) {
        setProjects(res.data.projects);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (err) {
      console.error('Failed to load project monitoring list', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [search, statusFilter, cityFilter, delayedOnly]);

  const handleOpenProject = async (id) => {
    setSelectedProjectId(id);
    setDetailsLoading(true);
    try {
      const res = await getProjectMonitoringDetails(id);
      if (res?.data) {
        setProjectDetails(res.data);
      }
    } catch (err) {
      console.error('Failed to load project details', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-5 py-3">
      {/* ==============================================================
          HEADER: Title, Quick Actions
          ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Briefcase className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Platform Project & Contract Monitoring
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete lifecycle inspection from job posting to hiring, daily attendance, milestone progress, delay tracking, and settlements.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchProjects}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all shadow-xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ==============================================================
          KPI CARDS: Active, Completed, Delayed
          ============================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <span>Total Projects</span>
            <Briefcase className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {summary.totalProjects || projects.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Recorded contracts</div>
        </div>

        <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <span>Active Ongoing</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {summary.activeProjects}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Under execution</div>
        </div>

        <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <span>Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {summary.completedProjects}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Fully finished</div>
        </div>

        <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <span>Delayed Projects</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {summary.delayedProjects}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Past deadline</div>
        </div>
      </div>

      {/* ==============================================================
          FILTER TOOLBAR
          ============================================================== */}
      <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search job title, employer, worker, city, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">All Statuses</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="created">Created / Pending Start</option>
          <option value="delayed">Delayed Only</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <input
          type="text"
          placeholder="Filter city..."
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="w-32 py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
        />

        <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={delayedOnly}
            onChange={(e) => setDelayedOnly(e.target.checked)}
            className="rounded text-rose-600 focus:ring-0"
          />
          <span>Delayed Only</span>
        </label>
      </div>

      {/* ==============================================================
          PROJECTS MONITORING TABLE
          ============================================================== */}
      <div className="rounded-2xl p-4 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
            <tr>
              <th className="py-2.5 px-3">Project / Job</th>
              <th className="py-2.5 px-3">Employer</th>
              <th className="py-2.5 px-3">Assigned Worker(s)</th>
              <th className="py-2.5 px-3">Site Location</th>
              <th className="py-2.5 px-3">Timeline</th>
              <th className="py-2.5 px-3">Progress</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400 animate-pulse">
                  Scanning platform projects...
                </td>
              </tr>
            ) : projects.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  No projects match criteria.
                </td>
              </tr>
            ) : (
              projects.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900 dark:text-white">{p.title}</div>
                    <div className="text-[10px] text-slate-400 font-mono">#{p.id.slice(0, 8)}</div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-800 dark:text-slate-200">{p.employer.name}</div>
                    <div className="text-[10px] text-slate-400">{p.employer.phone || 'N/A'}</div>
                  </td>

                  <td className="py-3 px-3">
                    {p.assignedWorkers.length === 0 ? (
                      <span className="text-slate-400">General Labour</span>
                    ) : (
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {p.assignedWorkers[0].name}
                        </div>
                        {p.assignedWorkers.length > 1 && (
                          <div className="text-[10px] text-cyan-600 font-bold">
                            +{p.assignedWorkers.length - 1} more workers
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-3">
                    <div className="text-slate-700 dark:text-slate-300">{p.location.city}</div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{p.location.address || 'Standard site'}</div>
                  </td>

                  <td className="py-3 px-3 font-mono text-[11px]">
                    <div>Start: {p.startDate ? new Date(p.startDate).toLocaleDateString() : 'N/A'}</div>
                    <div className={p.isDelayed ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                      End: {p.expectedEndDate ? new Date(p.expectedEndDate).toLocaleDateString() : 'N/A'}
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="w-24 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          p.status === 'completed'
                            ? 'bg-emerald-500'
                            : p.isDelayed
                            ? 'bg-rose-500'
                            : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, p.progressPercentage))}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 mt-1 inline-block">
                      {p.progressPercentage}%
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <div className="flex flex-col gap-1 items-start">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                          p.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : p.status === 'in_progress'
                            ? 'bg-purple-500/10 text-purple-600 border-purple-500/20'
                            : 'bg-slate-500/10 text-slate-600 border-slate-500/20'
                        }`}
                      >
                        {p.status}
                      </span>
                      {p.isDelayed && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-rose-500/15 text-rose-600 border border-rose-500/30">
                          {p.daysDelayed}d Delayed
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenProject(p.id)}
                      className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold text-xs transition-colors inline-flex items-center gap-1"
                    >
                      <span>Lifecycle</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ==============================================================
          PROJECT LIFECYCLE & DETAIL MODAL
          ============================================================== */}
      {selectedProjectId && (
        <div className="fixed inset-0 z-[1200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[92vh] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 font-black text-sm flex items-center justify-center border border-purple-500/20">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {projectDetails?.project?.title || 'Project Monitoring Lifecycle'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    ID: #{selectedProjectId} • Employer: {projectDetails?.project?.employer?.name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedProjectId(null);
                  setProjectDetails(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1">
              {detailsLoading ? (
                <div className="py-20 text-center text-xs text-slate-400 animate-pulse">
                  Loading complete lifecycle & attendance tracking...
                </div>
              ) : !projectDetails ? (
                <div className="py-20 text-center text-xs text-slate-400">
                  Project details unavailable.
                </div>
              ) : (
                <>
                  {/* Quick Overview Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Agreed Wage</span>
                      <div className="font-extrabold text-emerald-600 font-mono mt-0.5">{projectDetails.project.agreedWage} ₹/day</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Progress</span>
                      <div className="font-extrabold text-purple-600 font-mono mt-0.5">{projectDetails.project.progressPercentage}%</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Attendance Logged</span>
                      <div className="font-extrabold text-slate-900 dark:text-white mt-0.5">{projectDetails.attendanceRecords.total} Days</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Status</span>
                      <div className="font-extrabold uppercase text-slate-900 dark:text-white mt-0.5">{projectDetails.project.status}</div>
                    </div>
                  </div>

                  {/* 10-Step Lifecycle Visual Progression */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      End-to-End Project Execution Lifecycle
                    </h3>

                    <div className="space-y-2">
                      {projectDetails.lifecycle.map((step) => (
                        <div
                          key={step.step}
                          className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                            step.completed
                              ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-800 dark:text-slate-200'
                              : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/50 dark:border-slate-700/40 text-slate-400 opacity-60'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              step.completed
                                ? 'bg-emerald-500 text-white shadow-xs'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                            }`}
                          >
                            {step.completed ? '✓' : step.step}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold">{step.title}</span>
                              {step.timestamp && (
                                <span className="text-[10px] font-mono text-slate-400">
                                  {new Date(step.timestamp).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {step.details}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Daily Progress Reports Feed */}
                  <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Daily Progress Submissions ({projectDetails.progressReports.total})
                    </h3>

                    {projectDetails.progressReports.reports.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Progress not reported yet by assigned workers.</p>
                    ) : (
                      <div className="space-y-2">
                        {projectDetails.progressReports.reports.map((rep, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1">
                            <div className="flex items-center justify-between font-bold">
                              <span>{rep.date || 'Site Day'}</span>
                              <span className="text-purple-600">{rep.hoursSpent || 8} hrs logged</span>
                            </div>
                            <div><strong>Work Completed:</strong> {rep.workCompleted || 'Daily milestones executed'}</div>
                            {rep.workRemaining && <div><strong>Work Remaining:</strong> {rep.workRemaining}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProjectsPage;
