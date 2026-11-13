import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  getAdminGeoEntities,
  getAdminGeoGaps,
} from '../services/adminService.js';
import {
  MapPin,
  Users,
  Briefcase,
  Building,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Eye,
  MapPinOff,
  TrendingUp,
  Layers,
  ChevronRight,
  ExternalLink,
  Info,
} from 'lucide-react';

// Marker type styling dictionary
const MARKER_CONFIG = {
  available_worker: {
    label: 'Available Worker',
    color: '#06b6d4', // Cyan
    borderColor: '#0891b2',
    icon: 'user-check',
  },
  busy_worker: {
    label: 'Hired / Busy Worker',
    color: '#64748b', // Slate
    borderColor: '#475569',
    icon: 'clock',
  },
  employer: {
    label: 'Employer',
    color: '#6366f1', // Indigo
    borderColor: '#4f46e5',
    icon: 'building',
  },
  active_job: {
    label: 'Active Job',
    color: '#3b82f6', // Blue
    borderColor: '#2563eb',
    icon: 'briefcase',
  },
  unfilled_job: {
    label: 'Unfilled Job (Urgent)',
    color: '#f97316', // Orange
    borderColor: '#ea580c',
    icon: 'alert',
  },
  ongoing_project: {
    label: 'Ongoing Project',
    color: '#a855f7', // Purple
    borderColor: '#9333ea',
    icon: 'hard-hat',
  },
  completed_project: {
    label: 'Completed Project',
    color: '#10b981', // Emerald
    borderColor: '#059669',
    icon: 'check',
  },
};

export const AdminMapPage = () => {
  const [markersData, setMarkersData] = useState([]);
  const [unlocatedData, setUnlocatedData] = useState([]);
  const [counts, setCounts] = useState({});
  const [supplyDemandRows, setSupplyDemandRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [typeFilters, setTypeFilters] = useState({
    available_worker: true,
    busy_worker: true,
    employer: true,
    active_job: true,
    unfilled_job: true,
    ongoing_project: true,
    completed_project: true,
  });

  // UI tabs & states
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'unlocated' | 'matrix'
  const [unlocatedSearch, setUnlocatedSearch] = useState('');
  const [selectedEntity, setSelectedEntity] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  // Deep sanitization helper to strip any MongoDB-style operator objects ($ifNull, etc.)
  const deepSanitize = (val) => {
    if (val === null || val === undefined) return val;
    if (typeof val === 'number' || typeof val === 'boolean') return val;
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return val.map(deepSanitize);
    if (typeof val === 'object') {
      if (val.$ifNull) {
        return Array.isArray(val.$ifNull) ? String(val.$ifNull[1] || 'Unspecified') : 'Unspecified';
      }
      const clean = {};
      for (const [k, v] of Object.entries(val)) {
        if (k.startsWith('$')) continue;
        clean[k] = deepSanitize(v);
      }
      return clean;
    }
    return String(val);
  };

  // Safe formatting helpers to prevent any React child object crashes
  const safeNumber = (val, fallback = 0) => {
    if (typeof val === 'number' && !isNaN(val)) return val;
    if (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val))) return Number(val);
    return fallback;
  };

  const safeText = (val, fallback = 'Unspecified') => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val.trim() || fallback;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (typeof val === 'object') {
      if (val.$ifNull) {
        const sub = Array.isArray(val.$ifNull) ? val.$ifNull[1] : val.$ifNull;
        return safeText(sub, fallback);
      }
      const candidate = val.name || val.title || val.city || val.label || val.value;
      if (candidate !== undefined && candidate !== null && typeof candidate !== 'object' && candidate !== val) {
        return safeText(candidate, fallback);
      }
      return fallback;
    }
    return String(val);
  };

  // Fetch geographic intelligence from backend
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resEntities, resGaps] = await Promise.all([
        getAdminGeoEntities().catch((err) => {
          console.error('Failed to fetch geo entities', err);
          return { data: { markers: [], unlocated: [], counts: {}, supplyDemandSummary: [] } };
        }),
        getAdminGeoGaps().catch((err) => {
          console.error('Failed to fetch geo gaps', err);
          return { data: [] };
        }),
      ]);

      const entityData = deepSanitize(resEntities.data || {});
      const rawGaps = deepSanitize(resGaps.data || []);

      setMarkersData(Array.isArray(entityData.markers) ? entityData.markers : []);
      setUnlocatedData(Array.isArray(entityData.unlocated) ? entityData.unlocated : []);
      setCounts(entityData.counts || {});

      // Use backend supply demand summary, with fallback to resGaps
      if (Array.isArray(entityData.supplyDemandSummary) && entityData.supplyDemandSummary.length > 0) {
        setSupplyDemandRows(entityData.supplyDemandSummary);
      } else if (Array.isArray(rawGaps)) {
        setSupplyDemandRows(rawGaps);
      }
    } catch (err) {
      console.error('Error in AdminMapPage data fetch:', err);
      setError('Failed to fetch geographic supply and demand data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter markers based on search and type checkboxes
  const filteredMarkers = useMemo(() => {
    return markersData.filter((m) => {
      // Type checkbox filter
      if (!typeFilters[m.markerType]) return false;

      // Type dropdown filter
      if (selectedType !== 'all') {
        if (selectedType === 'workers' && m.entityType !== 'worker') return false;
        if (selectedType === 'employers' && m.entityType !== 'employer') return false;
        if (selectedType === 'jobs' && m.entityType !== 'job') return false;
        if (selectedType === 'projects' && m.entityType !== 'project') return false;
        if (selectedType === 'unfilled' && m.markerType !== 'unfilled_job') return false;
      }

      // City filter
      if (selectedCity && !m.city.toLowerCase().includes(selectedCity.toLowerCase())) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (m.name || '').toLowerCase().includes(q);
        const matchTitle = (m.title || '').toLowerCase().includes(q);
        const matchCity = (m.city || '').toLowerCase().includes(q);
        const matchSkill = (m.skill || '').toLowerCase().includes(q);
        const matchPhone = (m.phone || '').includes(q);
        if (!matchName && !matchTitle && !matchCity && !matchSkill && !matchPhone) {
          return false;
        }
      }

      return true;
    });
  }, [markersData, typeFilters, selectedType, selectedCity, searchQuery]);

  // Filter unlocated records
  const filteredUnlocated = useMemo(() => {
    return unlocatedData.filter((u) => {
      if (selectedCity && !u.city.toLowerCase().includes(selectedCity.toLowerCase())) {
        return false;
      }
      if (unlocatedSearch.trim()) {
        const q = unlocatedSearch.toLowerCase().trim();
        return (
          (u.name || '').toLowerCase().includes(q) ||
          (u.title || '').toLowerCase().includes(q) ||
          (u.city || '').toLowerCase().includes(q) ||
          (u.phone || '').includes(q)
        );
      }
      return true;
    });
  }, [unlocatedData, selectedCity, unlocatedSearch]);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    try {
      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [18.5204, 73.8567], // Pune centroid
          zoom: 11,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 18,
        }).addTo(map);

        const markersGroup = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
        markersLayerRef.current = markersGroup;
      }

      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers();
      }

      const validLatLngs = [];

      // Group nearby markers with slight jitter if exact overlapping coordinates exist
      const coordCounts = {};

      filteredMarkers.forEach((m) => {
        if (!Array.isArray(m.coordinates) || m.coordinates.length < 2) return;
        const [rawLng, rawLat] = m.coordinates;
        if (!rawLng || !rawLat) return;

        const key = `${rawLat.toFixed(4)},${rawLng.toFixed(4)}`;
        const count = coordCounts[key] || 0;
        coordCounts[key] = count + 1;

        // Apply slight offset for overlapping points (spiral/jitter) so all remain distinct and clickable
        let lat = rawLat;
        let lng = rawLng;
        if (count > 0) {
          const angle = count * (Math.PI / 3);
          const offset = 0.003 * Math.ceil(count / 6);
          lat += Math.sin(angle) * offset;
          lng += Math.cos(angle) * offset;
        }

        const cfg = MARKER_CONFIG[m.markerType] || MARKER_CONFIG.available_worker;

        const circleMarker = L.circleMarker([lat, lng], {
          radius: m.markerType === 'unfilled_job' ? 12 : 9,
          color: cfg.borderColor,
          fillColor: cfg.color,
          fillOpacity: 0.85,
          weight: 2,
        });

        const popupContent = `
          <div style="font-family: inherit; font-size: 12px; padding: 6px; min-width: 200px; color: #0f172a;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
              <span style="font-weight: 800; font-size: 13px; color: #0f172a;">${m.name}</span>
              <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; background: ${cfg.color}20; color: ${cfg.borderColor};">
                ${cfg.label}
              </span>
            </div>
            ${m.skill ? `<div style="font-size: 11px; color: #475569; margin-bottom: 2px;"><strong>Skill:</strong> ${m.skill}</div>` : ''}
            ${m.companyName ? `<div style="font-size: 11px; color: #475569; margin-bottom: 2px;"><strong>Company:</strong> ${m.companyName}</div>` : ''}
            ${m.dailyWage ? `<div style="font-size: 11px; color: #059669; font-weight: bold; margin-bottom: 2px;"><strong>Daily Wage:</strong> ${m.dailyWage} INR</div>` : ''}
            ${m.wageAmount ? `<div style="font-size: 11px; color: #059669; font-weight: bold; margin-bottom: 2px;"><strong>Job Wage:</strong> ${m.wageAmount} INR</div>` : ''}
            <div style="font-size: 11px; color: #475569; margin-bottom: 2px;"><strong>City:</strong> ${m.city}</div>
            ${m.phone ? `<div style="font-size: 11px; color: #2563eb; margin-top: 4px;">📞 ${m.phone}</div>` : ''}
            <div style="font-size: 10px; color: #94a3b8; margin-top: 6px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
              GPS: [${rawLat.toFixed(4)}, ${rawLng.toFixed(4)}]
            </div>
          </div>
        `;

        circleMarker.bindPopup(popupContent);
        markersLayerRef.current.addLayer(circleMarker);
        validLatLngs.push([lat, lng]);
      });

      if (validLatLngs.length > 0 && mapInstanceRef.current) {
        const bounds = L.latLngBounds(validLatLngs);
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    } catch (err) {
      console.error('Error rendering Leaflet map markers:', err);
    }
  }, [filteredMarkers]);

  // Clean up Leaflet on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const toggleFilter = (typeKey) => {
    setTypeFilters((prev) => ({ ...prev, [typeKey]: !prev[typeKey] }));
  };

  return (
    <div className="w-full space-y-5 py-3">
      {/* ==============================================================
          HEADER: Title, Quick Stats, Refresh
          ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <MapPin className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Geographic Intelligence & Demand-Supply Mapping
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time geospatial monitor displaying verified workers, employers, active jobs, site projects, and regional shortages.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
            <span>Refresh Map</span>
          </button>
        </div>
      </div>

      {/* ==============================================================
          KPI CARDS: Markers summary
          ============================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Available</span>
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
          </div>
          <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
            {safeNumber(counts.availableWorkers, markersData.filter((m) => m.markerType === 'available_worker').length)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Ready for work</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Hired / Busy</span>
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-600 dark:text-slate-300 mt-1">
            {safeNumber(counts.busyWorkers, markersData.filter((m) => m.markerType === 'busy_worker').length)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">On active gigs</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Employers</span>
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {safeNumber(counts.employers, markersData.filter((m) => m.markerType === 'employer').length)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Registered hubs</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Jobs</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {safeNumber(counts.activeJobs, markersData.filter((m) => m.markerType === 'active_job').length)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Open postings</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Unfilled Jobs</span>
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
          </div>
          <div className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-1">
            {safeNumber(counts.unfilledJobs, markersData.filter((m) => m.markerType === 'unfilled_job').length)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Need workers</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ongoing Projects</span>
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {safeNumber(counts.ongoingProjects, markersData.filter((m) => m.markerType === 'ongoing_project').length)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Live work sites</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Unlocated</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {safeNumber(unlocatedData.length, 0)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Missing GPS</div>
        </div>
      </div>

      {/* ==============================================================
          FILTER & VIEW TOGGLE BAR
          ============================================================== */}
      <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Inputs */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, phone, skill, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <input
              type="text"
              placeholder="Filter by city..."
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-36 py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
            />

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Entity Types</option>
              <option value="workers">Workers Only</option>
              <option value="employers">Employers Only</option>
              <option value="jobs">Jobs Only</option>
              <option value="projects">Projects Only</option>
              <option value="unfilled">Unfilled Jobs Only</option>
            </select>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'map'
                  ? 'bg-white dark:bg-slate-700 text-primary dark:text-sky-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Interactive Map ({filteredMarkers.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('unlocated')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'unlocated'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <MapPinOff className="w-3.5 h-3.5" />
              <span>Unlocated Records ({filteredUnlocated.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'matrix'
                  ? 'bg-white dark:bg-slate-700 text-primary dark:text-sky-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Supply & Demand Matrix</span>
            </button>
          </div>
        </div>

        {/* Marker Layer Visibility Toggles */}
        {activeTab === 'map' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
              Marker Layers:
            </span>
            {Object.entries(MARKER_CONFIG).map(([key, cfg]) => {
              const active = typeFilters[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleFilter(key)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                    active
                      ? 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 shadow-2xs'
                      : 'opacity-40 border-transparent bg-slate-100/50 dark:bg-slate-800/40 text-slate-400 line-through'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: cfg.color }}
                  />
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ==============================================================
          TAB 1: INTERACTIVE MAP VIEW
          ============================================================== */}
      {activeTab === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Main Leaflet Map Viewport */}
          <div className="lg:col-span-3 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative min-h-[520px]">
            <div ref={mapContainerRef} className="w-full h-full min-h-[520px] z-0" />

            {/* Over-map Info Pill */}
            <div className="absolute top-3 right-3 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-md flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{filteredMarkers.length} Live Mapped Entities</span>
            </div>
          </div>

          {/* Side Entity Quick Feed / Details */}
          <div className="rounded-2xl p-4 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Visible Entities
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  Click to Center
                </span>
              </div>

              <div className="space-y-2 mt-3 max-h-[460px] overflow-y-auto pr-1">
                {filteredMarkers.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400">
                    No entities match the active filters.
                  </div>
                ) : (
                  filteredMarkers.slice(0, 20).map((m) => {
                    const cfg = MARKER_CONFIG[m.markerType] || MARKER_CONFIG.available_worker;
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          if (mapInstanceRef.current && m.coordinates) {
                            mapInstanceRef.current.setView(
                              [m.coordinates[1], m.coordinates[0]],
                              14,
                              { animate: true }
                            );
                          }
                        }}
                        className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:border-primary/40 transition-all cursor-pointer space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[130px]">
                            {safeText(m.name, 'Unnamed')}
                          </span>
                          <span
                            className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: `${cfg.color}20`,
                              color: cfg.borderColor,
                            }}
                          >
                            {safeText(cfg.label, '').split(' ')[0]}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                          <span>{safeText(m.skill || m.companyName || m.city, 'General')}</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            {m.dailyWage ? `${m.dailyWage} ₹` : m.wageAmount ? `${m.wageAmount} ₹` : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
              Clustered markers are automatically offset to prevent overlapping occlusion.
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          TAB 2: UNLOCATED RECORDS LIST (Never invent fake coordinates)
          ============================================================== */}
      {activeTab === 'unlocated' && (
        <div className="rounded-2xl p-5 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <MapPinOff className="w-4 h-4 text-amber-500" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Unlocated Platform Records ({filteredUnlocated.length})
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Records registered without valid GPS coordinates. Per platform protocol, these are isolated here rather than placed at arbitrary map coordinates.
              </p>
            </div>

            <input
              type="text"
              placeholder="Search unlocated records..."
              value={unlocatedSearch}
              onChange={(e) => setUnlocatedSearch(e.target.value)}
              className="py-1.5 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-64"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                <tr>
                  <th className="py-2.5 px-3">Entity Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">City / Area</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3">Diagnostic Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredUnlocated.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No unlocated records found.
                    </td>
                  </tr>
                ) : (
                  filteredUnlocated.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                        {safeText(u.name, 'Unnamed')}
                      </td>
                      <td className="py-2.5 px-3 uppercase text-[10px] font-extrabold text-slate-500">
                        {safeText(u.entityType, 'Entity')}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                        {safeText(u.city, 'Unspecified')}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {safeText(u.phone, 'N/A')}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          {safeText(u.reason, 'Missing GPS coordinates')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==============================================================
          TAB 3: SUPPLY & DEMAND MATRIX
          ============================================================== */}
      {activeTab === 'matrix' && (
        <div className="rounded-2xl p-5 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Regional Supply & Demand Gap Matrix
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Formula: Gap = max(0, Open Jobs - Available Verified Workers). High gaps highlight locations requiring worker acquisition.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                <tr>
                  <th className="py-2.5 px-3">Location / City</th>
                  <th className="py-2.5 px-3">Available Workers</th>
                  <th className="py-2.5 px-3">Total Workers</th>
                  <th className="py-2.5 px-3">Open Jobs Demand</th>
                  <th className="py-2.5 px-3">Ongoing Projects</th>
                  <th className="py-2.5 px-3">Demand Gap</th>
                  <th className="py-2.5 px-3">Supply Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {supplyDemandRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No supply-demand aggregations available.
                    </td>
                  </tr>
                ) : (
                  supplyDemandRows.map((row, idx) => {
                    const cityName = safeText(row.city || row._id);
                    const avail = safeNumber(row.availableWorkers, 0);
                    const totalW = safeNumber(row.totalWorkers, avail);
                    const openJ = safeNumber(row.openJobs, 0);
                    const onProj = safeNumber(row.ongoingProjects, 0);
                    const gap = safeNumber(row.gap, Math.max(0, openJ - avail));
                    const rawAlert = row.status || (gap >= 3 ? 'Critical Shortage' : gap > 0 ? 'Moderate Shortage' : 'Balanced');
                    const alert = safeText(rawAlert, 'Balanced');

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                          {cityName}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {avail}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {totalW}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                          {openJ}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-purple-600 dark:text-purple-400 font-bold">
                          {onProj}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-black">
                          {gap > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400">+{gap}</span>
                          ) : (
                            <span className="text-emerald-600">0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border ${
                              String(alert).includes('Critical')
                                ? 'bg-rose-500/15 text-rose-600 border-rose-500/30'
                                : String(alert).includes('Moderate')
                                ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                            }`}
                          >
                            {alert}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMapPage;
