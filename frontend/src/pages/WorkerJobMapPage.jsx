import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { authApiClient } from '../services/authApi.js';

// Multilingual text dictionary for English, Marathi, and Hindi
const translations = {
  en: {
    title: 'Explore Jobs on Map',
    subtitle: 'Find daily and contract work nearby using interactive map discovery',
    searchPlaceholder: 'Search by city or area (e.g. Pune, Kothrud)...',
    allSkills: 'All Skills',
    allDurations: 'All Durations',
    minWageLabel: 'Min Wage',
    filterAction: 'Apply Filters',
    resetFilters: 'Reset',
    viewModeMap: 'Map View',
    viewModeList: 'List View',
    loading: 'Loading available jobs...',
    noJobs: 'No open jobs found in this area. Try adjusting your filters.',
    workersNeeded: 'Workers Needed',
    wage: 'Wage',
    duration: 'Duration',
    viewDetails: 'View Details & Apply',
    listFallbackNotice: 'Displaying available jobs in list format for quick access.',
    mapError: 'Map tile service unavailable. Switched to list view fallback.',
  },
  mr: {
    title: 'नकाशावर कामे शोधा',
    subtitle: 'परिसरातील रोजंदारी व कंत्राटी कामे परस्पर नकाशावर शोधा',
    searchPlaceholder: 'शहर किंवा परिसर शोधा (उदा. पुणे, कोथरूड)...',
    allSkills: 'सर्व कौशल्ये',
    allDurations: 'सर्व कालावधी',
    minWageLabel: 'किमान मजुरी',
    filterAction: 'फिल्टर लावा',
    resetFilters: 'रीसेट',
    viewModeMap: 'नकाशा दृश्य',
    viewModeList: 'यादी दृश्य',
    loading: 'कामे लोड होत आहेत...',
    noJobs: 'या भागात सध्या कोणतेही काम उपलब्ध नाही. कृपया इतर पर्याय निवडा.',
    workersNeeded: 'कामगारांची संख्या',
    wage: 'मजुरी',
    duration: 'कालावधी',
    viewDetails: 'तपशील पहा आणि अर्ज करा',
    listFallbackNotice: 'सुलभ प्रवेशासाठी उपलब्ध कामांची यादी दाखवली आहे.',
    mapError: 'नकाशा लोड झाला नाही. यादी दृश्य सुरू केले आहे.',
  },
  hi: {
    title: 'मानचित्र पर काम खोजें',
    subtitle: 'अपने नजदीकी क्षेत्र में दैनिक और अनुबंध कार्य खोजें',
    searchPlaceholder: 'शहर या क्षेत्र खोजें (उदा. पुणे, हड़पसर)...',
    allSkills: 'सभी कौशल',
    allDurations: 'सभी अवधियां',
    minWageLabel: 'न्यूनतम मजदूरी',
    filterAction: 'फ़िल्टर लागू करें',
    resetFilters: 'रीसेट',
    viewModeMap: 'मानचित्र दृश्य',
    viewModeList: 'सूची दृश्य',
    loading: 'उपलब्ध काम लोड हो रहे हैं...',
    noJobs: 'इस क्षेत्र में कोई काम उपलब्ध नहीं है। कृपया फ़िल्टर बदलें।',
    workersNeeded: 'आवश्यक मजदूर',
    wage: 'मजदूरी',
    duration: 'अवधि',
    viewDetails: 'विवरण देखें और आवेदन करें',
    listFallbackNotice: 'त्वरित पहुंच के लिए उपलब्ध कार्यों की सूची दिखाई गई है।',
    mapError: 'मानचित्र लोड नहीं हो सका। सूची दृश्य प्रदर्शित किया गया है।',
  },
};

export const WorkerJobMapPage = () => {
  const navigate = useNavigate();
  const [lang, setLang] = useState('en');
  const t = translations[lang] || translations.en;

  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [city, setCity] = useState('');
  const [skill, setSkill] = useState('');
  const [minWage, setMinWage] = useState('');
  const [durationType, setDurationType] = useState('');

  // Location search states
  const [coords, setCoords] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [distance, setDistance] = useState(25); // km

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const userCircleRef = useRef(null);
  const userMarkerRef = useRef(null);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError(
        lang === 'mr'
          ? 'आपला ब्राउझर भौगोलिक स्थान समर्थन करत नाही.'
          : lang === 'hi'
          ? 'आपका ब्राउज़र जियोलोकेशन का समर्थन नहीं करता।'
          : 'Geolocation is not supported by your browser.'
      );
      return;
    }
    setGeoLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCoords(userCoords);
        setGeoLoading(false);

        // Center map on user location
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([userCoords.lat, userCoords.lng], 12);
        }
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === 1) {
          setGeoError(
            lang === 'mr'
              ? 'स्थान परवानगी नाकारली. आपण शहरानुसार शोधू शकता.'
              : lang === 'hi'
              ? 'स्थान अनुमति अस्वीकृत। आप शहर द्वारा खोज सकते हैं।'
              : 'Location permission denied. You can search by city or area below.'
          );
        } else {
          setGeoError(
            lang === 'mr'
              ? 'स्थान मिळवण्यात अडचण आली.'
              : lang === 'hi'
              ? 'स्थान प्राप्त करने में असमर्थ।'
              : 'Unable to acquire location.'
          );
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleClearLocation = () => {
    setCoords(null);
    setGeoError('');
    if (userCircleRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(userCircleRef.current);
      userCircleRef.current = null;
    }
    if (userMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
  };

  // Fetch jobs from backend
  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        ...(city ? { city } : {}),
        ...(skill ? { skill } : {}),
        ...(minWage ? { minWage } : {}),
        ...(durationType ? { durationType } : {}),
        ...(coords ? { lat: coords.lat, lng: coords.lng, distance } : {}),
      };

      const res = await authApiClient.get('/jobs/map', { params });
      const jobList = res.data?.data || [];
      setJobs(jobList);
    } catch (err) {
      console.error('Failed to load map jobs:', err);
      setError(t.mapError);
      setViewMode('list'); // Fallback to list view if API fails
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [coords, distance]);

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

      // Clear existing markers
      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers();
      }

      // Add markers for jobs with valid coordinates
      const validPoints = [];

      jobs.forEach((job) => {
        const coords = job.location?.coordinates;
        if (coords && coords.length >= 2 && !(coords[0] === 0 && coords[1] === 0)) {
          const lng = coords[0];
          const lat = coords[1];

          // Leaflet uses [latitude, longitude] order
          const customIcon = L.divIcon({
            className: 'custom-job-marker',
            html: `
              <div style="background-color: #00236f; color: white; padding: 4px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
                <span>🛠</span>
                <span>₹${job.wageAmount}</span>
              </div>
            `,
            iconSize: [60, 24],
            iconAnchor: [30, 24],
          });

          const marker = L.marker([lat, lng], { icon: customIcon });

          const popupContent = `
            <div style="font-family: inherit; font-size: 12px; min-width: 180px; padding: 4px;">
              <div style="font-weight: 800; font-size: 13px; color: #00236f; margin-bottom: 4px;">${job.title}</div>
              <div style="color: #4b5563; margin-bottom: 2px;"><strong>Skill:</strong> ${job.skillRequired}</div>
              <div style="color: #4b5563; margin-bottom: 2px;"><strong>Wage:</strong> ₹${job.wageAmount} (${job.wageType})</div>
              <div style="color: #4b5563; margin-bottom: 4px;"><strong>Location:</strong> ${job.location.city} ${job.location.area ? '• ' + job.location.area : ''}</div>
              <button id="view-job-${job._id}" style="width: 100%; margin-top: 6px; padding: 6px; background-color: #00236f; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
                ${t.viewDetails}
              </button>
            </div>
          `;

          marker.bindPopup(popupContent);
          marker.on('popupopen', () => {
            const btn = document.getElementById(`view-job-${job._id}`);
            if (btn) {
              btn.onclick = () => navigate(`/worker/jobs/${job._id}`);
            }
          });

          markersLayerRef.current.addLayer(marker);
          validPoints.push([lat, lng]);
        }
      });

      // Add user location marker & radius circle if coords available
      if (coords && mapInstanceRef.current) {
        if (userCircleRef.current) {
          mapInstanceRef.current.removeLayer(userCircleRef.current);
        }
        if (userMarkerRef.current) {
          mapInstanceRef.current.removeLayer(userMarkerRef.current);
        }

        userCircleRef.current = L.circle([coords.lat, coords.lng], {
          radius: distance * 1000,
          color: '#0284c7',
          fillColor: '#38bdf8',
          fillOpacity: 0.15,
        }).addTo(mapInstanceRef.current);

        const userPinIcon = L.divIcon({
          className: 'custom-user-marker',
          html: `
            <div style="background-color: #0284c7; color: white; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(2,132,199,0.8); display: flex; align-items: center; justify-content: center;">
            </div>
          `,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });

        userMarkerRef.current = L.marker([coords.lat, coords.lng], { icon: userPinIcon })
          .bindPopup('<b>Your Search Location</b>')
          .addTo(mapInstanceRef.current);

        validPoints.push([coords.lat, coords.lng]);
      }

      // Fit map bounds if markers exist
      if (validPoints.length > 0 && mapInstanceRef.current) {
        const bounds = L.latLngBounds(validPoints);
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    } catch (err) {
      console.error('Error rendering Leaflet map:', err);
      setError(t.mapError);
      setViewMode('list');
    }

    return () => {
      // In StrictMode or navigation, map cleanup
    };
  }, [jobs, viewMode, t, navigate]);

  // Clean map instance on component unmount
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
      {/* Top Header with Multilingual Language Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-outline-variant/30">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">{t.title}</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Language Selector */}
          <div className="inline-flex rounded-lg bg-surface-container-low p-1 border border-outline-variant/30 text-xs">
            <button
              onClick={() => setLang('en')}
              className={`px-2 py-1 rounded-md font-bold transition-all ${
                lang === 'en' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('mr')}
              className={`px-2 py-1 rounded-md font-bold transition-all ${
                lang === 'mr' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
            >
              मराठी
            </button>
            <button
              onClick={() => setLang('hi')}
              className={`px-2 py-1 rounded-md font-bold transition-all ${
                lang === 'hi' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
            >
              हिंदी
            </button>
          </div>

          {/* List / Map Toggle */}
          <div className="inline-flex rounded-lg bg-surface-container-low p-1 border border-outline-variant/30 text-xs">
            <button
              onClick={() => setViewMode('map')}
              className={`px-2.5 py-1 rounded-md font-bold flex items-center gap-1 transition-all ${
                viewMode === 'map' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">map</span>
              <span className="hidden sm:inline">{t.viewModeMap}</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 rounded-md font-bold flex items-center gap-1 transition-all ${
                viewMode === 'list' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">list</span>
              <span className="hidden sm:inline">{t.viewModeList}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-xs space-y-3">
        {/* Geolocation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-surface-container-low rounded-lg text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={geoLoading}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all text-xs shadow-2xs ${
                coords ? 'bg-emerald-600 text-white' : 'bg-primary text-white hover:opacity-90'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">my_location</span>
              <span>
                {geoLoading
                  ? 'Detecting GPS...'
                  : coords
                  ? 'My Location Active ✓'
                  : lang === 'mr'
                  ? 'माझे स्थान वापरा'
                  : lang === 'hi'
                  ? 'मेरा स्थान उपयोग करें'
                  : 'Use My Location'}
              </span>
            </button>

            {coords && (
              <button
                type="button"
                onClick={handleClearLocation}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold underline"
              >
                Clear
              </button>
            )}
          </div>

          {coords ? (
            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
              <span className="font-semibold text-[11px]">Radius:</span>
              {[10, 25, 50, 100].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDistance(d)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all ${
                    distance === d
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface-container-lowest text-on-surface border-outline-variant/40'
                  }`}
                >
                  {d} km
                </button>
              ))}
            </div>
          ) : (
            <span className="text-[11px] text-on-surface-variant">
              {geoError || (lang === 'mr' ? 'नकाशावर जवळची कामे शोधण्यासाठी स्थान वापरा' : lang === 'hi' ? 'मानचित्र पर नजदीकी काम खोजने के लिए स्थान का उपयोग करें' : 'Use location to discover jobs nearest to you on map')}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="p-2 rounded-lg bg-surface-container-low border border-outline-variant/30 font-medium text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          />

          <input
            type="text"
            placeholder="Skill (e.g. Mason, Plumber, Painter)..."
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            className="p-2 rounded-lg bg-surface-container-low border border-outline-variant/30 font-medium text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          />

          <select
            value={durationType}
            onChange={(e) => setDurationType(e.target.value)}
            className="p-2 rounded-lg bg-surface-container-low border border-outline-variant/30 font-semibold text-on-surface focus:outline-none"
          >
            <option value="">{t.allDurations}</option>
            <option value="single_day">Single Day</option>
            <option value="fixed_duration">Fixed Duration</option>
            <option value="until_completion">Until Completion</option>
          </select>

          <div className="flex gap-2">
            <input
              type="number"
              placeholder={t.minWageLabel}
              value={minWage}
              onChange={(e) => setMinWage(e.target.value)}
              className="w-1/2 p-2 rounded-lg bg-surface-container-low border border-outline-variant/30 font-medium text-on-surface focus:outline-none"
            />
            <button
              onClick={fetchJobs}
              className="w-1/2 px-3 py-2 bg-primary text-on-primary font-bold rounded-lg text-xs hover:opacity-90 active:scale-95 transition-all"
            >
              {t.filterAction}
            </button>
          </div>
        </div>
      </div>

      {/* Map or List View Container */}
      {loading ? (
        <div className="p-16 text-center text-xs text-on-surface-variant flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span>{t.loading}</span>
        </div>
      ) : (
        <>
          {viewMode === 'map' ? (
            <div className="space-y-4">
              {/* Leaflet Map Box */}
              <div className="w-full h-[520px] rounded-xl overflow-hidden border border-outline-variant/30 shadow-xs relative z-0">
                <div ref={mapContainerRef} className="w-full h-full" />
              </div>

              {/* Sidebar / Bottom Cards of Available Jobs */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-on-surface">
                  Nearby Open Jobs ({jobs.length})
                </div>
                {jobs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-on-surface-variant bg-surface-container-low rounded-xl">
                    {t.noJobs}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {jobs.map((job) => (
                      <div
                        key={job._id}
                        onClick={() => navigate(`/worker/jobs/${job._id}`)}
                        className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary/50 cursor-pointer shadow-xs transition-all space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-xs text-on-surface line-clamp-1">{job.title}</span>
                          <span className="text-xs font-black text-primary font-mono whitespace-nowrap ml-2">
                            ₹{job.wageAmount}
                          </span>
                        </div>
                        <div className="text-[11px] text-on-surface-variant flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-surface-container-low font-bold uppercase text-[10px]">
                            {job.skillRequired}
                          </span>
                          <span>• {job.location.city}</span>
                          {job.distanceKm !== null && job.distanceKm !== undefined && (
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              ~{job.distanceKm} km
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* List View Fallback */
            <div className="space-y-3">
              <div className="p-3 bg-surface-container-low rounded-xl text-xs text-on-surface-variant flex items-center justify-between">
                <span>{t.listFallbackNotice}</span>
                <span className="font-bold text-primary">{jobs.length} open jobs</span>
              </div>

              {jobs.length === 0 ? (
                <div className="p-12 text-center text-xs text-on-surface-variant bg-surface-container-low rounded-xl">
                  {t.noJobs}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {jobs.map((job) => (
                    <div
                      key={job._id}
                      className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs space-y-3 hover:border-primary/40 transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-sm text-on-surface">{job.title}</h3>
                          <div className="text-xs text-on-surface-variant mt-0.5">
                            {job.employer?.name} • {job.location.city} {job.location.area ? `(${job.location.area})` : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-primary font-mono">₹{job.wageAmount}</span>
                          <span className="block text-[10px] text-on-surface-variant capitalize">{job.wageType}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold uppercase">
                          {job.skillRequired}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-surface-container-low font-semibold text-on-surface-variant capitalize">
                          {job.durationType.replace('_', ' ')}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-surface-container-low font-semibold text-on-surface-variant">
                          {job.workersRequired} workers needed
                        </span>
                        {job.distanceKm !== null && job.distanceKm !== undefined && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200">
                            ~{job.distanceKm} km away
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => navigate(`/worker/jobs/${job._id}`)}
                        className="w-full py-2 bg-primary text-on-primary rounded-lg text-xs font-bold hover:opacity-90 active:scale-95 transition-all text-center"
                      >
                        {t.viewDetails}
                      </button>
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

export default WorkerJobMapPage;
