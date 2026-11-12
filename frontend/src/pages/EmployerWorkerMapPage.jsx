import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import L from 'leaflet';
import { authApiClient } from '../services/authApi.js';
import { LocationAccessBar } from '../components/LocationAccessBar.jsx';
import { getSessionLocation } from '../services/locationService.js';
import {
  Map as MapIcon,
  List,
  Search,
  ShieldCheck,
  DollarSign,
  Briefcase,
  Users,
  Sparkles,
  MapPin,
  Clock,
  Send,
  Building,
} from 'lucide-react';

export const EmployerWorkerMapPage = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [skill, setSkill] = useState('');
  const [city, setCity] = useState('');
  const [availability, setAvailability] = useState('available');
  const [minExperience, setMinExperience] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [rating, setRating] = useState('');

  // Location search state & reverse geocoded display
  const [activeLocation, setActiveLocation] = useState(() => getSessionLocation());
  const employerMarkerRef = useRef(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  const handleLocationAcquired = (locData) => {
    setActiveLocation(locData);
    if (locData?.city) {
      setCity(locData.city);
    }
    if (mapInstanceRef.current && locData?.lat && locData?.lng) {
      mapInstanceRef.current.setView([locData.lat, locData.lng], 12);

      if (employerMarkerRef.current) {
        mapInstanceRef.current.removeLayer(employerMarkerRef.current);
      }

      const employerIcon = L.divIcon({
        className: 'custom-employer-marker',
        html: `
          <div style="background-color: #d97706; color: white; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 12px rgba(217,119,6,0.9); display: flex; align-items: center; justify-content: center; font-size: 12px;">
            🏢
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      employerMarkerRef.current = L.marker([locData.lat, locData.lng], { icon: employerIcon })
        .bindPopup(`<b>🏢 Your Employer Location</b><br/><span>${locData.shortLabel || ''}</span><br/><span style="font-size:10px; color:#6b7280;">${locData.formattedCoords || ''}</span>`)
        .addTo(mapInstanceRef.current);
    }
  };

  const handleLocationCleared = () => {
    setActiveLocation(null);
    setCity('');
    if (employerMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(employerMarkerRef.current);
      employerMarkerRef.current = null;
    }
  };

  const fetchWorkers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        ...(skill ? { skill } : {}),
        ...(city ? { city } : {}),
        ...(availability ? { availability } : {}),
        ...(minExperience ? { minExperience } : {}),
        ...(verificationStatus ? { verificationStatus } : {}),
        ...(rating ? { rating } : {}),
      };

      const res = await authApiClient.get('/workers/map', { params });
      setWorkers(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error('Failed to load worker map data:', err);
      setError('Unable to fetch worker discovery data. Switched to list view.');
      setViewMode('list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (viewMode !== 'map' || !mapContainerRef.current) return;

    try {
      if (!mapInstanceRef.current) {
        // Default center: Pune [lat: 18.5204, lng: 73.8567]
        const map = L.map(mapContainerRef.current, {
          center: [18.5204, 73.8567],
          zoom: 12,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        const markersLayer = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
        markersLayerRef.current = markersLayer;
      }

      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers();
      }

      const validPoints = [];

      workers.forEach((w) => {
        const coords = w?.location?.coordinates;
        if (coords && coords.length >= 2 && !(coords[0] === 0 && coords[1] === 0)) {
          const lng = coords[0];
          const lat = coords[1];

          const isVerified = w?.verificationStatus === 'verified';
          const badgeColor = isVerified ? '#059669' : '#0284c7';
          const primarySkillName = w?.primarySkill || 'Worker';
          const displayName = w?.fullName || w?.name || 'Worker';
          const cityDisplay = (typeof w?.location === 'object' ? w?.location?.city : w?.location) || 'Area';
          const areaDisplay = typeof w?.location === 'object' && w?.location?.area ? `(${w.location.area})` : '';

          const customIcon = L.divIcon({
            className: 'custom-worker-marker',
            html: `
              <div style="background-color: ${badgeColor}; color: white; padding: 4px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
                <span>👷</span>
                <span>${primarySkillName}</span>
              </div>
            `,
            iconSize: [80, 24],
            iconAnchor: [40, 24],
          });

          const marker = L.marker([lat, lng], { icon: customIcon });

          const popupContent = `
            <div style="font-family: inherit; font-size: 12px; min-width: 190px; padding: 4px; color: #1e293b;">
              <div style="font-weight: 800; font-size: 13px; color: #0284c7; margin-bottom: 2px;">${displayName}</div>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">
                ${primarySkillName.toUpperCase()} • ${w?.experienceYears ?? 0} yrs exp ${isVerified ? '• <span style="color:#059669; font-weight:bold;">Verified ✓</span>' : ''}
              </div>
              <div style="color: #334155; margin-bottom: 2px;"><strong>Daily Wage:</strong> ₹${w?.dailyWage || 'Negotiable'}</div>
              <div style="color: #334155; margin-bottom: 2px;"><strong>Status:</strong> <span style="text-transform: capitalize; color: #059669; font-weight: bold;">${w?.availability || 'Available'}</span></div>
              <div style="color: #334155; margin-bottom: 4px;"><strong>Location:</strong> ${cityDisplay} ${areaDisplay}</div>
              <div style="font-size: 10px; color: #94a3b8; margin-bottom: 6px;">(Approximate area location for privacy)</div>
              <button id="invite-worker-${w._id}" style="width: 100%; padding: 6px; background-color: #0284c7; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
                Invite to Job
              </button>
            </div>
          `;

          marker.bindPopup(popupContent);
          marker.on('popupopen', () => {
            const btn = document.getElementById(`invite-worker-${w._id}`);
            if (btn) {
              btn.onclick = () => navigate(`/employer/invitations?workerId=${w._id}`);
            }
          });

          markersLayerRef.current.addLayer(marker);
          validPoints.push([lat, lng]);
        }
      });

      if (validPoints.length > 0 && mapInstanceRef.current) {
        const bounds = L.latLngBounds(validPoints);
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    } catch (err) {
      console.error('Error rendering worker Leaflet map:', err);
      setError('Map tile error. Switched to list view.');
      setViewMode('list');
    }
  }, [workers, viewMode, navigate]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header Banner */}
      <div className="ks-glass-card p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-primary/10 via-sky-500/10 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="ks-badge-cyan">
                <Sparkles className="w-3.5 h-3.5" /> Geospatial Discovery
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-7 h-7 text-primary dark:text-sky-400" />
              <span>Geographic Worker Discovery</span>
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
              Locate nearby available masons, carpenters, electricians, plumbers, and technicians on an interactive map
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="inline-flex rounded-xl p-1 bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-xs self-start sm:self-auto">
            <button
              onClick={() => setViewMode('map')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                viewMode === 'map'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              <span>Map View</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                viewMode === 'list'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
              <span>List View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="ks-glass-card p-4 sm:p-5 space-y-4">
        {/* Location Access & Taken Location Display */}
        <LocationAccessBar
          activeLocation={activeLocation}
          onLocationAcquired={handleLocationAcquired}
          onLocationCleared={handleLocationCleared}
          role="employer"
          customButtonLabel="Center Map on My Location"
          showRadius={false}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2 text-xs">
          <input
            type="text"
            placeholder="Skill (e.g. Mason)..."
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            className="ks-input text-xs"
          />

          <input
            type="text"
            placeholder="City or Area (e.g. Pune)..."
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="ks-input text-xs"
          />

          <select
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            className="ks-input text-xs font-semibold"
          >
            <option value="">All Availability</option>
            <option value="available">Available Now</option>
            <option value="busy">Busy on Project</option>
            <option value="unavailable">Unavailable</option>
          </select>

          <select
            value={verificationStatus}
            onChange={(e) => setVerificationStatus(e.target.value)}
            className="ks-input text-xs font-semibold"
          >
            <option value="">All Verification</option>
            <option value="verified">Verified Only ✓</option>
            <option value="pending">Pending Verification</option>
          </select>

          <input
            type="number"
            placeholder="Min Exp (Years)..."
            value={minExperience}
            onChange={(e) => setMinExperience(e.target.value)}
            className="ks-input text-xs"
          />

          <button
            onClick={fetchWorkers}
            className="ks-btn-primary text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Privacy Notice Pill */}
      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 px-2">
        <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        <span>Worker privacy protected: Locations are generalized to neighborhood/city bounds, keeping personal residences private.</span>
      </div>

      {/* Content Rendering */}
      {loading ? (
        <div className="p-16 text-center ks-glass-card flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Searching eligible workers nearby...</span>
        </div>
      ) : (
        <>
          {viewMode === 'map' ? (
            <div className="space-y-4">
              <div className="w-full h-[520px] rounded-2xl overflow-hidden ks-glass-card p-1 shadow-xl relative z-0">
                <div ref={mapContainerRef} className="w-full h-full rounded-xl" />
              </div>

              {/* Bottom Cards */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Discovered Workers ({workers.length})
                </div>
                {workers.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 ks-glass-card">
                    No matching workers found in this area. Try adjusting your skill or city filters.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {workers.map((w) => {
                      const skillStr = w?.primarySkill || 'Worker';
                      const expStr = w?.experienceYears ?? 0;
                      const nameStr = w?.fullName || w?.name || 'Worker';
                      return (
                        <div
                          key={w._id}
                          className="p-4 rounded-xl ks-glass-card hover:border-primary/40 dark:hover:border-sky-500/40 space-y-2.5 transition-all"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="font-bold text-xs text-slate-900 dark:text-white">{nameStr}</span>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
                                {skillStr} • {expStr} yrs exp
                              </div>
                            </div>
                            {w?.verificationStatus === 'verified' && (
                              <span className="ks-badge-emerald text-[10px]">
                                Verified ✓
                              </span>
                            )}
                          </div>

                          <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200/80 dark:border-white/10">
                            <span className="font-mono font-bold text-emerald-500 dark:text-emerald-400">₹{w?.dailyWage || '0'}/day</span>
                            <button
                              onClick={() => navigate(`/employer/invitations?workerId=${w._id}`)}
                              className="ks-btn-primary px-3 py-1 font-bold text-[11px]"
                            >
                              Invite
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* List View */
            <div className="space-y-3">
              {workers.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500 ks-glass-card">
                  No matching workers found. Try expanding your search criteria.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {workers.map((w) => {
                    const skillStr = w?.primarySkill || 'Worker';
                    const expStr = w?.experienceYears ?? 0;
                    const nameStr = w?.fullName || w?.name || 'Worker';
                    const cityStr = (typeof w?.location === 'object' ? w?.location?.city : w?.location) || 'City';
                    const areaStr = typeof w?.location === 'object' && w?.location?.area ? `(${w.location.area})` : '';
                    return (
                      <div
                        key={w._id}
                        className="p-4 rounded-xl ks-glass-card hover:border-primary/40 dark:hover:border-sky-500/40 space-y-3 transition-all"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">{nameStr}</h3>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {cityStr} {areaStr}
                            </div>
                          </div>
                          {w?.verificationStatus === 'verified' && (
                            <span className="ks-badge-emerald text-[10px]">
                              Verified ✓
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5 text-[11px]">
                          <span className="ks-badge-cyan text-[10px] uppercase font-bold">
                            {skillStr}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-semibold text-[10px]">
                            {expStr} Years Exp
                          </span>
                          <span className="ks-badge-emerald text-[10px] capitalize">
                            {w?.availability || 'Available'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-white/10 text-xs">
                          <span className="font-mono font-bold text-emerald-500 dark:text-emerald-400">₹{w?.dailyWage || '0'}/day</span>
                          <button
                            onClick={() => navigate(`/employer/invitations?workerId=${w._id}`)}
                            className="ks-btn-primary px-3 py-1.5 font-bold"
                          >
                            Send Invitation
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EmployerWorkerMapPage;
