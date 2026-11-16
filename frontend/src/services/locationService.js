/* global AbortController */
/**
 * KaamSetu AI — Location & Geocoding Service
 * Provides geolocation acquisition, reverse-geocoding, coordinate formatting,
 * nearest-city offline matching, and session persistence for Workers & Employers.
 */

// Offline reference coordinates for major cities across Maharashtra and India
export const KNOWN_REGIONS = [
  { city: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  { city: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.8777 },
  { city: 'Navi Mumbai', state: 'Maharashtra', lat: 19.033, lng: 73.0297 },
  { city: 'Thane', state: 'Maharashtra', lat: 19.2183, lng: 72.9781 },
  { city: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lng: 79.0882 },
  { city: 'Nashik', state: 'Maharashtra', lat: 19.9975, lng: 73.7898 },
  { city: 'Kolhapur', state: 'Maharashtra', lat: 16.705, lng: 74.2433 },
  { city: 'Chhatrapati Sambhajinagar', state: 'Maharashtra', lat: 19.8762, lng: 75.3433 },
  { city: 'Solapur', state: 'Maharashtra', lat: 17.6599, lng: 75.9064 },
  { city: 'Amravati', state: 'Maharashtra', lat: 20.9374, lng: 77.7796 },
  { city: 'Sangli', state: 'Maharashtra', lat: 16.8524, lng: 74.5815 },
  { city: 'Nanded', state: 'Maharashtra', lat: 19.1383, lng: 77.321 },
  { city: 'Jalgaon', state: 'Maharashtra', lat: 21.0077, lng: 75.5626 },
  { city: 'Akola', state: 'Maharashtra', lat: 20.7002, lng: 77.0082 },
  { city: 'Latur', state: 'Maharashtra', lat: 18.4088, lng: 76.5604 },
  { city: 'Dhule', state: 'Maharashtra', lat: 20.9042, lng: 74.7749 },
  { city: 'Ahmednagar', state: 'Maharashtra', lat: 19.0948, lng: 74.748 },
  { city: 'Satara', state: 'Maharashtra', lat: 17.6805, lng: 73.999 },
  { city: 'Ratnagiri', state: 'Maharashtra', lat: 16.9902, lng: 73.312 },
  { city: 'Delhi', state: 'Delhi', lat: 28.6139, lng: 77.209 },
  { city: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { city: 'Hyderabad', state: 'Telangana', lat: 17.385, lng: 78.4867 },
];

/**
 * Calculates Haversine distance in kilometers between two lat/lng pairs
 */
export const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

/**
 * Formats coordinates into standard human-readable format
 * Example: "18.5204° N, 73.8567° E"
 */
export const formatCoordinates = (lat, lng, decimals = 4) => {
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (isNaN(numLat) || isNaN(numLng)) return '';

  const latDir = numLat >= 0 ? 'N' : 'S';
  const lngDir = numLng >= 0 ? 'E' : 'W';

  return `${Math.abs(numLat).toFixed(decimals)}° ${latDir}, ${Math.abs(numLng).toFixed(decimals)}° ${lngDir}`;
};

/**
 * Finds the closest known city from offline pre-configured database
 */
export const findNearestKnownCity = (lat, lng) => {
  let closest = KNOWN_REGIONS[0];
  let minDistance = Infinity;

  for (const item of KNOWN_REGIONS) {
    const dist = haversineDistanceKm(lat, lng, item.lat, item.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = item;
    }
  }

  return {
    ...closest,
    distanceKm: minDistance,
  };
};

// In-memory geocode cache to prevent redundant network requests (keyed by lat,lng rounded to 4 decimals ~11m)
const geocodeCache = new Map();
let latestGeocodeRequestId = 0;

/**
 * Reverse geocodes latitude & longitude into human-readable area, city, and state
 * Uses OpenStreetMap Nominatim with street/building precision (zoom=18)
 * Guaranteed: NEVER alters the original GPS coordinates, even on network failures
 */
export const reverseGeocode = async (lat, lng, correlationId = null) => {
  const numLat = Number(lat);
  const numLng = Number(lng);
  const coordsFormatted = formatCoordinates(numLat, numLng, 4);

  if (isNaN(numLat) || isNaN(numLng) || numLat < -90 || numLat > 90 || numLng < -180 || numLng > 180) {
    throw new Error(`Invalid coordinates for reverse geocoding: lat=${lat}, lng=${lng}`);
  }

  const requestId = ++latestGeocodeRequestId;
  const cacheKey = `${numLat.toFixed(4)},${numLng.toFixed(4)}`;

  if (geocodeCache.has(cacheKey)) {
    const cached = geocodeCache.get(cacheKey);
    return {
      ...cached,
      lat: numLat,
      lng: numLng,
      formattedCoords: coordsFormatted,
      fromCache: true,
    };
  }

  if (correlationId) {
    console.info(`[KaamSetu Location][${correlationId}] Reverse geocoding coords:`, { lat: numLat, lng: numLng });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    // Request building and street level precision with zoom=18
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${numLat}&lon=${numLng}&zoom=18&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'KaamSetuAI-App/1.0 (contact: support@kaamsetu.ai)',
        },
      }
    );
    clearTimeout(timeoutId);

    // Prevent stale responses from overwriting newer user location requests
    if (requestId !== latestGeocodeRequestId) {
      console.warn(`[KaamSetu Location] Discarded stale geocode response #${requestId} (latest is #${latestGeocodeRequestId})`);
      return null;
    }

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};

      // Rich Indian address hierarchy resolution
      const road = addr.road || addr.street || addr.pedestrian || addr.footway || '';
      const area =
        addr.suburb ||
        addr.neighbourhood ||
        addr.residential ||
        addr.quarter ||
        addr.hamlet ||
        addr.village ||
        addr.colony ||
        addr.sector ||
        addr.subdistrict ||
        '';

      const city =
        addr.city ||
        addr.town ||
        addr.municipality ||
        addr.village ||
        addr.city_district ||
        addr.county ||
        addr.state_district ||
        '';

      const state = addr.state || 'Maharashtra';
      const postcode = addr.postcode || '';

      // Build structured, accurate display label (e.g., "Atigre, Kolhapur, Maharashtra" or "Paud Road, Kothrud, Pune")
      const labelParts = [];
      if (road && road !== area) labelParts.push(road);
      if (area) labelParts.push(area);
      if (city && city !== area && !labelParts.includes(city)) labelParts.push(city);
      if (state && !labelParts.includes(state)) labelParts.push(state);

      const resolvedCity = city || area || 'Local Area';
      const shortLabel = labelParts.length > 0 ? labelParts.join(', ') : resolvedCity;

      const result = {
        lat: numLat,
        lng: numLng,
        city: resolvedCity,
        area: area || road || '',
        state,
        postcode,
        shortLabel,
        fullAddress: data.display_name || shortLabel,
        formattedCoords: coordsFormatted,
        source: 'nominatim',
        accuracyEstimated: 'street_level',
      };

      geocodeCache.set(cacheKey, result);
      return result;
    }
  } catch (err) {
    console.warn('[KaamSetu Location] Reverse geocoding network notice:', err.message);
  }

  // Graceful offline fallback: preserve EXACT coordinates, estimate city label from nearest region
  const nearest = findNearestKnownCity(numLat, numLng);
  return {
    lat: numLat, // ORIGINAL GPS COORDINATES PRESERVED
    lng: numLng, // ORIGINAL GPS COORDINATES PRESERVED
    city: nearest.city,
    area: nearest.distanceKm < 15 ? 'Local Vicinity' : '',
    state: nearest.state,
    shortLabel: `${nearest.city}, ${nearest.state}`,
    fullAddress: `${nearest.city}, ${nearest.state}`,
    formattedCoords: coordsFormatted,
    source: 'offline_fallback',
    accuracyEstimated: 'approximate_city',
  };
};

/**
 * Acquires user's current GPS position using browser Geolocation API
 * Configured with enableHighAccuracy: true, maximumAge: 0, and timeout: 20000
 * Captures: latitude, longitude, accuracy (meters), and timestamp
 */
export const getCurrentPositionWithAddress = (options = {}) => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      const err = new Error('Geolocation is not supported by your browser or environment.');
      err.code = 0;
      return reject(err);
    }

    const correlationId = `loc-${Date.now()}-${Math.round(Math.random() * 1000)}`;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude);
        const lng = Number(pos.coords.longitude);
        const accuracy = Math.round(pos.coords.accuracy || 0);
        const timestamp = pos.timestamp || Date.now();

        // Evaluate location precision
        const isCoarse = accuracy > 500; // >500m indicates cellular/ISP IP approximation
        const accuracyRating = accuracy <= 20 ? 'high' : accuracy <= 150 ? 'medium' : 'low';

        console.info(`[KaamSetu GPS][${correlationId}] Real-time position acquired:`, {
          lat,
          lng,
          accuracyMeters: accuracy,
          accuracyRating,
          timestamp,
        });

        try {
          const geocoded = await reverseGeocode(lat, lng, correlationId);
          const fullResult = {
            ...(geocoded || {}),
            lat, // STRICTLY preserve original GPS coordinates
            lng, // STRICTLY preserve original GPS coordinates
            formattedCoords: formatCoordinates(lat, lng),
            accuracy,
            accuracyRating,
            isCoarse,
            timestamp,
            correlationId,
          };
          saveSessionLocation(fullResult);
          resolve(fullResult);
        } catch (geoErr) {
          const basic = {
            lat,
            lng,
            city: 'Detected Location',
            area: '',
            state: 'Maharashtra',
            shortLabel: 'Detected Location',
            formattedCoords: formatCoordinates(lat, lng),
            accuracy,
            accuracyRating,
            isCoarse,
            timestamp,
            correlationId,
          };
          saveSessionLocation(basic);
          resolve(basic);
        }
      },
      (err) => {
        let userMessage = 'Unable to acquire location.';
        if (err.code === 1) {
          userMessage = 'Location permission was denied. Please allow location access in your browser or select your city manually.';
        } else if (err.code === 2) {
          userMessage = 'GPS position unavailable. Please ensure device location services are turned on.';
        } else if (err.code === 3) {
          userMessage = 'Location request timed out. Please click retry to obtain a fresh GPS fix.';
        }
        const error = new Error(userMessage);
        error.code = err.code;
        error.original = err;
        console.warn(`[KaamSetu GPS][${correlationId}] Acquisition error:`, err.message);
        reject(error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0, // Force fresh hardware GPS lock (no stale cache)
        timeout: 20000, // 20s allowance for satellite lock
        ...options,
      }
    );
  });
};

/**
 * Session storage helpers to avoid repeating GPS prompts unnecessarily
 */
const SESSION_STORAGE_KEY = 'kaamsetu_active_location';

export const saveSessionLocation = (locationData) => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(locationData));
    }
  } catch (e) {
    // Session storage safe ignore
  }
};

export const getSessionLocation = () => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (e) {
    // Session storage safe ignore
  }
  return null;
};

export const clearSessionLocation = () => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch (e) {
    // Session storage safe ignore
  }
};
