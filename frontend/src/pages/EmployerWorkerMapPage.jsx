import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { authApiClient } from '../services/authApi.js';

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

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

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
      setWorkers(res.data?.data || []);
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
        const coords = w.location?.coordinates;
        if (coords && coords.length >= 2 && !(coords[0] === 0 && coords[1] === 0)) {
          const lng = coords[0];
          const lat = coords[1];

          // Leaflet icon with worker role & verification indicator
          const isVerified = w.verificationStatus === 'verified';
          const badgeColor = isVerified ? '#059669' : '#00236f';

          const customIcon = L.divIcon({
            className: 'custom-worker-marker',
            html: `
              <div style="background-color: ${badgeColor}; color: white; padding: 4px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
                <span>👷</span>
                <span>${w.primarySkill}</span>
              </div>
            `,
            iconSize: [80, 24],
            iconAnchor: [40, 24],
          });

          const marker = L.marker([lat, lng], { icon: customIcon });

          const popupContent = `
            <div style="font-family: inherit; font-size: 12px; min-width: 190px; padding: 4px;">
              <div style="font-weight: 800; font-size: 13px; color: #00236f; margin-bottom: 2px;">${w.fullName}</div>
              <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">
                ${w.primarySkill.toUpperCase()} • ${w.experienceYears} yrs exp ${isVerified ? '• <span style="color:#059669; font-weight:bold;">Verified ✓</span>' : ''}
              </div>
              <div style="color: #374151; margin-bottom: 2px;"><strong>Daily Wage:</strong> ₹${w.dailyWage || 'Negotiable'}</div>
              <div style="color: #374151; margin-bottom: 2px;"><strong>Status:</strong> <span style="text-transform: capitalize; color: #059669; font-weight: bold;">${w.availability}</span></div>
              <div style="color: #374151; margin-bottom: 4px;"><strong>Location:</strong> ${w.location.city} ${w.location.area ? '(' + w.location.area + ')' : ''}</div>
              <div style="font-size: 10px; color: #9ca3af; margin-bottom: 6px;">(Approximate area location for privacy)</div>
              <button id="invite-worker-${w._id}" style="width: 100%; padding: 6px; background-color: #00236f; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
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
    <div className="w-full space-y-4 py-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-outline-variant/30">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">Geographic Worker Discovery</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Discover verified daily wage workers, masons, carpenters, and technicians nearby.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="inline-flex rounded-lg bg-surface-container-low p-1 border border-outline-variant/30 text-xs self-start sm:self-auto">
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1 rounded-md font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'map' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">map</span>
            <span>Map View</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded-md font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'list' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">list</span>
            <span>List View</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3.5 bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-xs space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2 text-xs">
          <input
            type="text"
            placeholder="Skill (e.g. Mason)..."
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            className="p-2 rounded-lg bg-surface-container-low border border-outline-variant/30 font-medium text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          />

          <input
            type="text"
            placeholder="City or Area (e.g. Pune)..."
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="p-2 rounded-lg bg-surface-container-low border border-outline-variant/30 font-medium text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          />

          <select
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            className="p-2 rounded-lg bg-surface-container-low border border-outline-variant/30 font-semibold text-on-surface focus:outline-none"
          >
            <option value="">All Availability</option>
            <option value="available">Available Now</option>
            <option value="busy">Busy on Project</option>
            <option value="unavailable">Unavailable</option>
          </select>

          <select
            value={verificationStatus}
            onChange={(e) => setVerificationStatus(e.target.value)}
            className="p-2 rounded-lg bg-surface-container-low border border-outline-variant/30 font-semibold text-on-surface focus:outline-none"
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
            className="p-2 rounded-lg bg-surface-container-low border border-outline-variant/30 font-medium text-on-surface focus:outline-none"
          />

          <button
            onClick={fetchWorkers}
            className="px-4 py-2 bg-primary text-on-primary font-bold rounded-lg text-xs hover:opacity-90 active:scale-95 transition-all"
          >
            Find Workers
          </button>
        </div>
      </div>

      {/* Privacy Notice Pill */}
      <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant/80 px-2">
        <span className="material-symbols-outlined text-[14px] text-primary">security</span>
        <span>Worker privacy protected: Locations are shown at neighborhood/city precision, not private doorsteps.</span>
      </div>

      {/* Content Rendering */}
      {loading ? (
        <div className="p-16 text-center text-xs text-on-surface-variant flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Searching eligible workers nearby...</span>
        </div>
      ) : (
        <>
          {viewMode === 'map' ? (
            <div className="space-y-4">
              <div className="w-full h-[520px] rounded-xl overflow-hidden border border-outline-variant/30 shadow-xs relative z-0">
                <div ref={mapContainerRef} className="w-full h-full" />
              </div>

              {/* Bottom Cards */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-on-surface">
                  Discovered Workers ({workers.length})
                </div>
                {workers.length === 0 ? (
                  <div className="p-8 text-center text-xs text-on-surface-variant bg-surface-container-low rounded-xl">
                    No matching workers found in this area. Try adjusting your skill or city filters.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {workers.map((w) => (
                      <div
                        key={w._id}
                        className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-2 hover:border-primary/40 transition-all"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-xs text-on-surface">{w.fullName}</span>
                            <div className="text-[10px] text-on-surface-variant font-semibold">
                              {w.primarySkill.toUpperCase()} • {w.experienceYears} yrs exp
                            </div>
                          </div>
                          {w.verificationStatus === 'verified' && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                              Verified ✓
                            </span>
                          )}
                        </div>

                        <div className="flex justify-between items-center text-xs pt-1 border-t border-outline-variant/10">
                          <span className="font-mono font-bold text-primary">₹{w.dailyWage}/day</span>
                          <button
                            onClick={() => navigate(`/employer/invitations?workerId=${w._id}`)}
                            className="px-2.5 py-1 bg-primary text-on-primary rounded-md font-bold text-[11px] hover:opacity-90 active:scale-95 transition-all"
                          >
                            Invite
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* List View */
            <div className="space-y-3">
              {workers.length === 0 ? (
                <div className="p-12 text-center text-xs text-on-surface-variant bg-surface-container-low rounded-xl">
                  No matching workers found. Try expanding your search criteria.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {workers.map((w) => (
                    <div
                      key={w._id}
                      className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-3 hover:border-primary/40 transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-sm text-on-surface">{w.fullName}</h3>
                          <div className="text-xs text-on-surface-variant mt-0.5">
                            {w.location.city} {w.location.area ? `(${w.location.area})` : ''}
                          </div>
                        </div>
                        {w.verificationStatus === 'verified' && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            Verified ✓
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold uppercase">
                          {w.primarySkill}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-surface-container-low font-semibold text-on-surface-variant">
                          {w.experienceYears} Years Exp
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-surface-container-low font-semibold text-emerald-700 capitalize">
                          {w.availability}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-outline-variant/10 text-xs">
                        <span className="font-mono font-bold text-on-surface">₹{w.dailyWage}/day</span>
                        <button
                          onClick={() => navigate(`/employer/invitations?workerId=${w._id}`)}
                          className="px-3 py-1.5 bg-primary text-on-primary rounded-lg font-bold hover:opacity-90 active:scale-95 transition-all"
                        >
                          Send Invitation
                        </button>
                      </div>
                    </div>
                  ))}
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
