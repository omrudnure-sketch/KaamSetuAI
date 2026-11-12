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

/**
 * Reverse geocodes latitude & longitude into human-readable area, city, and state
 * Uses OpenStreetMap Nominatim with offline fallback
 */
export const reverseGeocode = async (lat, lng) => {
  const numLat = Number(lat);
  const numLng = Number(lng);
  const coordsFormatted = formatCoordinates(numLat, numLng, 4);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${numLat}&lon=${numLng}&zoom=14&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'KaamSetuAI-App',
        },
      }
    );
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};

      const area =
        addr.suburb ||
        addr.neighbourhood ||
        addr.residential ||
        addr.quarter ||
        addr.road ||
        '';

      const city =
        addr.city ||
        addr.town ||
        addr.municipality ||
        addr.village ||
        addr.county ||
        addr.state_district ||
        '';

      const state = addr.state || 'Maharashtra';
      const postcode = addr.postcode || '';

      // Build compact display label (e.g., "Kothrud, Pune, Maharashtra")
      const labelParts = [];
      if (area) labelParts.push(area);
      if (city && city !== area) labelParts.push(city);
      if (state && !labelParts.includes(state)) labelParts.push(state);

      const shortLabel = labelParts.length > 0 ? labelParts.join(', ') : city || 'Current Location';

      return {
        lat: numLat,
        lng: numLng,
        city: city || 'Pune',
        area: area || '',
        state,
        postcode,
        shortLabel,
        fullAddress: data.display_name || shortLabel,
        formattedCoords: coordsFormatted,
        source: 'nominatim',
      };
    }
  } catch (err) {
    // Non-blocking fallback to offline nearest known city
    console.warn('[KaamSetu Location] Reverse geocoding network notice, using nearest city match:', err.message);
  }

  // Fallback to nearest known reference city
  const nearest = findNearestKnownCity(numLat, numLng);
  return {
    lat: numLat,
    lng: numLng,
    city: nearest.city,
    area: nearest.distanceKm < 15 ? 'Local Vicinity' : '',
    state: nearest.state,
    shortLabel: `${nearest.city}, ${nearest.state}`,
    fullAddress: `${nearest.city}, ${nearest.state}`,
    formattedCoords: coordsFormatted,
    source: 'offline_fallback',
  };
};

/**
 * Acquires user's current GPS position using browser Geolocation API
 * and reverse-geocodes it into place names and coordinates.
 */
export const getCurrentPositionWithAddress = (options = {}) => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      return reject(new Error('Geolocation is not supported by your browser.'));
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 0);

        try {
          const geocoded = await reverseGeocode(lat, lng);
          const fullResult = {
            ...geocoded,
            accuracy,
            timestamp: pos.timestamp || Date.now(),
          };
          saveSessionLocation(fullResult);
          resolve(fullResult);
        } catch (geoErr) {
          const basic = {
            lat,
            lng,
            city: 'Current Location',
            area: '',
            state: 'Maharashtra',
            shortLabel: 'Current Location',
            formattedCoords: formatCoordinates(lat, lng),
            accuracy,
            timestamp: Date.now(),
          };
          saveSessionLocation(basic);
          resolve(basic);
        }
      },
      (err) => {
        reject(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
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
