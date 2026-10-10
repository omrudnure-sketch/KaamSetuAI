import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { authApiClient } from '../services/authApi.js';

export const AdminMapPage = () => {
  const [geoGaps, setGeoGaps] = useState([]);
  const [geoSupply, setGeoSupply] = useState([]);
  const [geoDemand, setGeoDemand] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [filterAlertOnly, setFilterAlertOnly] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const circleMarkersLayerRef = useRef(null);

  // City coordinate registry for Maharashtra & regional hubs
  const cityCoordinates = {
    pune: [18.5204, 73.8567],
    mumbai: [19.076, 72.8777],
    nagpur: [21.1458, 79.0882],
    nashik: [19.9975, 73.7898],
    aurangabad: [19.8762, 75.3433],
    solapur: [17.6599, 75.9064],
    kolhapur: [16.705, 74.2433],
    thane: [19.2183, 72.9781],
    unspecified: [18.5204, 73.8567],
  };

  const fetchGeoAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resGaps, resSupply, resDemand] = await Promise.all([
        authApiClient.get('/admin/analytics/geo-gaps'),
        authApiClient.get('/admin/analytics/geo-supply'),
        authApiClient.get('/admin/analytics/geo-demand'),
      ]);

      setGeoGaps(resGaps.data?.data || []);
      setGeoSupply(resSupply.data?.data || []);
      setGeoDemand(resDemand.data?.data || []);
    } catch (err) {
      console.error('Failed to load admin geographic analytics:', err);
      setError('Failed to fetch geographic analytics data from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGeoAnalytics();
  }, []);

  // Filtered rows for the required table: Location | Skill | Open jobs | Available workers | Gap
  const filteredGaps = geoGaps.filter((row) => {
    if (selectedCity && !row.city.toLowerCase().includes(selectedCity.toLowerCase())) return false;
    if (selectedSkill && !row.skill.toLowerCase().includes(selectedSkill.toLowerCase())) return false;
    if (filterAlertOnly && row.gap <= 0) return false;
    return true;
  });

  // Aggregate metrics
  const totalOpenDemand = geoDemand.reduce((acc, d) => acc + (d.openJobs || 0), 0);
  const totalAvailableWorkers = geoSupply.reduce((acc, s) => acc + (s.availableWorkers || 0), 0);
  const totalGapShortage = geoGaps.reduce((acc, g) => acc + (g.gap || 0), 0);
  const criticalAreasCount = geoGaps.filter((g) => g.gap >= 3).length;

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

        const circleLayer = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
        circleMarkersLayerRef.current = circleLayer;
      }

      if (circleMarkersLayerRef.current) {
        circleMarkersLayerRef.current.clearLayers();
      }

      // Group gaps by city to render bubble markers
      const citySummary = {};
      filteredGaps.forEach((g) => {
        const cityKey = g.city.toLowerCase().trim();
        if (!citySummary[cityKey]) {
          citySummary[cityKey] = {
            city: g.city,
            totalOpenJobs: 0,
            totalAvailable: 0,
            totalGap: 0,
            skills: [],
          };
        }
        citySummary[cityKey].totalOpenJobs += g.openJobs;
        citySummary[cityKey].totalAvailable += g.availableWorkers;
        citySummary[cityKey].totalGap += g.gap;
        citySummary[cityKey].skills.push(`${g.skill} (+${g.gap})`);
      });

      const validLatLngs = [];

      Object.entries(citySummary).forEach(([cityKey, info]) => {
        const coords = cityCoordinates[cityKey] || cityCoordinates.unspecified;
        const [lat, lng] = coords;

        // Radius proportional to demand & gap
        const radius = Math.max(14, Math.min(36, 12 + info.totalOpenJobs * 3));
        const color = info.totalGap > 0 ? '#dc2626' : '#059669'; // Red for shortage, Green for balanced

        const circleMarker = L.circleMarker([lat, lng], {
          radius,
          color,
          fillColor: color,
          fillOpacity: 0.5,
          weight: 2,
        });

        const popup = `
          <div style="font-family: inherit; font-size: 12px; padding: 4px; min-width: 170px;">
            <div style="font-weight: 800; font-size: 13px; color: #00236f; margin-bottom: 4px;">${info.city}</div>
            <div><strong>Open Job Demand:</strong> ${info.totalOpenJobs}</div>
            <div><strong>Available Workers:</strong> ${info.totalAvailable}</div>
            <div style="color: ${info.totalGap > 0 ? '#dc2626' : '#059669'}; font-weight: bold; margin-top: 2px;">
              <strong>Supply Gap:</strong> ${info.totalGap > 0 ? '+' + info.totalGap + ' Shortage' : 'Adequate'}
            </div>
            <div style="font-size: 10px; color: #6b7280; margin-top: 4px;">Top Skills: ${info.skills.slice(0, 3).join(', ')}</div>
          </div>
        `;

        circleMarker.bindPopup(popup);
        circleMarkersLayerRef.current.addLayer(circleMarker);
        validLatLngs.push([lat, lng]);
      });

      if (validLatLngs.length > 0 && mapInstanceRef.current) {
        const bounds = L.latLngBounds(validLatLngs);
        mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
      }
    } catch (err) {
      console.error('Error rendering admin Leaflet map:', err);
    }
  }, [filteredGaps]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full space-y-6 py-4">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-outline-variant/30">
        <div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">Geographic Demand & Supply Analytics</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Aggregate spatial analytics mapping open job demand against verified available worker supply.
          </p>
        </div>

        <button
          onClick={fetchGeoAnalytics}
          className="px-3.5 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold border border-outline-variant/30 flex items-center gap-2 self-start md:self-auto transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          <span>Refresh Data</span>
        </button>
      </div>

      {/* KPI Cards Alongside Map */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
          <div className="text-[11px] font-bold uppercase text-on-surface-variant">Open Job Demand</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{totalOpenDemand}</div>
          <div className="text-[10px] text-on-surface-variant mt-0.5">Active hiring requirements</div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
          <div className="text-[11px] font-bold uppercase text-on-surface-variant">Available Supply</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{totalAvailableWorkers}</div>
          <div className="text-[10px] text-on-surface-variant mt-0.5">Workers ready for assignment</div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
          <div className="text-[11px] font-bold uppercase text-on-surface-variant">Platform Gap Shortage</div>
          <div className="text-2xl font-black text-error mt-1">{totalGapShortage}</div>
          <div className="text-[10px] text-on-surface-variant mt-0.5">Unfilled regional demand</div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
          <div className="text-[11px] font-bold uppercase text-on-surface-variant">Critical Shortage Areas</div>
          <div className="text-2xl font-black text-primary mt-1">{criticalAreasCount}</div>
          <div className="text-[10px] text-on-surface-variant mt-0.5">Locations with gap &ge; 3</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <input
          type="text"
          placeholder="Filter by city..."
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="p-2 rounded-lg bg-surface-container-low border border-outline-variant/30 font-medium text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
        />

        <input
          type="text"
          placeholder="Filter by skill..."
          value={selectedSkill}
          onChange={(e) => setSelectedSkill(e.target.value)}
          className="p-2 rounded-lg bg-surface-container-low border border-outline-variant/30 font-medium text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
        />

        <label className="flex items-center gap-2 cursor-pointer font-bold text-on-surface">
          <input
            type="checkbox"
            checked={filterAlertOnly}
            onChange={(e) => setFilterAlertOnly(e.target.checked)}
            className="rounded text-primary focus:ring-0"
          />
          <span>Show Shortages Only (Gap &gt; 0)</span>
        </label>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-error/10 border border-error/30 text-error rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Map and Table Side-by-Side on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map Container */}
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold uppercase tracking-wider text-on-surface">Regional Demand Heatmap</span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 font-bold text-error">
                <span className="w-2.5 h-2.5 rounded-full bg-error" /> Shortage
              </span>
              <span className="flex items-center gap-1 font-bold text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Balanced
              </span>
            </div>
          </div>

          <div className="w-full h-[460px] rounded-xl overflow-hidden border border-outline-variant/20 relative z-0">
            <div ref={mapContainerRef} className="w-full h-full" />
          </div>
        </div>

        {/* Required Aggregate Table: Location | Skill | Open jobs | Available workers | Gap */}
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs pb-1 border-b border-outline-variant/20">
              <span className="font-bold uppercase tracking-wider text-on-surface">
                Demand & Supply Matrix ({filteredGaps.length})
              </span>
              <span className="text-[10px] text-on-surface-variant">
                Formula: Gap = max(0, Open Jobs - Available)
              </span>
            </div>

            <div className="overflow-x-auto max-h-[440px] overflow-y-auto mt-2">
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 bg-surface-container-lowest border-b border-outline-variant/20 text-on-surface-variant font-bold">
                  <tr>
                    <th className="py-2 px-2">Location</th>
                    <th className="py-2 px-2">Skill</th>
                    <th className="py-2 px-2">Open jobs</th>
                    <th className="py-2 px-2">Available workers</th>
                    <th className="py-2 px-2">Gap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 font-medium">
                  {filteredGaps.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                        No location records match the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredGaps.map((row, idx) => (
                      <tr key={idx} className="hover:bg-surface-container-low/40">
                        <td className="py-2 px-2 font-bold text-on-surface">{row.city}</td>
                        <td className="py-2 px-2 uppercase font-semibold text-on-surface-variant">{row.skill}</td>
                        <td className="py-2 px-2 font-mono font-bold text-amber-600">{row.openJobs}</td>
                        <td className="py-2 px-2 font-mono font-bold text-emerald-600">{row.availableWorkers}</td>
                        <td className="py-2 px-2">
                          <span
                            className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs ${
                              row.gap > 0 ? 'bg-error/15 text-error' : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {row.gap > 0 ? `+${row.gap}` : '0 (Balanced)'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-2 text-[10px] text-on-surface-variant border-t border-outline-variant/20">
            <strong>Aggregate rule:</strong> Supply considers only registered workers currently marked as "available".
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMapPage;
