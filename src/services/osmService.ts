import { RoadInfo } from '../types';

interface NominatimResponse {
  address?: {
    road?: string;
    pedestrian?: string;
    highway?: string;
    footway?: string;
    path?: string;
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    city_district?: string;
    municipality?: string;
    county?: string;
    postcode?: string;
    country?: string;
    ref?: string;
    neighbourhood?: string;
  };
  extratags?: {
    ref?: string;
    lanes?: string;
    maxspeed?: string;
    highway?: string;
    oneway?: string;
  };
  display_name?: string;
}

// In-memory cache for reverse geocode coordinates
interface CacheEntry {
  lat: number;
  lon: number;
  info: RoadInfo;
  timestamp: number;
}

const cache: CacheEntry[] = [];
let lastFetchTime = 0;
const MIN_FETCH_INTERVAL_MS = 1500; // Throttle to be friendly to OSM Nominatim API

// Calculate distance in meters between two lat/lon coordinates
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Extract Hungarian road reference or number if available (e.g., M0, M1, M7, 1-es főút, 8, 8102)
function extractRoadNumber(data: NominatimResponse, streetName: string): string {
  // Check direct ref from extratags or address
  const directRef = data.extratags?.ref || data.address?.ref;
  if (directRef && directRef.trim()) {
    return directRef.trim();
  }

  // Check if street name has road number pattern like "M1", "M7", "8-as főút", "8101", "3. számú főút"
  const motorWayMatch = streetName.match(/\b(M\d{1,2}|M\d{1,2}[a-z]?)\b/i);
  if (motorWayMatch) return motorWayMatch[1].toUpperCase();

  const hungarianRoadMatch = streetName.match(/\b(\d{1,4})[.-]?(es|as|os|ös)?\s*(főút|út|számú út)?\b/i);
  if (hungarianRoadMatch && parseInt(hungarianRoadMatch[1], 10) < 9000) {
    return hungarianRoadMatch[1] + (hungarianRoadMatch[1].length <= 2 ? '-es út' : '');
  }

  // Default from highway type
  const highway = data.extratags?.highway || data.address?.highway;
  if (highway === 'motorway') return 'Autópálya';
  if (highway === 'trunk') return 'Gyorsforgalmi';

  return '';
}

// Estimate lanes strictly in the driver's direction of travel (adott menetirány szerinti sávok)
function estimateDirectionalLanes(data: NominatimResponse): number {
  const extratags = (data.extratags || {}) as Record<string, string | undefined>;
  if (extratags['lanes:forward']) {
    const forward = parseInt(extratags['lanes:forward'] || '', 10);
    if (!isNaN(forward) && forward > 0) return forward;
  }

  const highway = extratags.highway || data.address?.highway;
  const isOneway =
    extratags.oneway === 'yes' ||
    extratags.oneway === '1' ||
    highway === 'motorway' ||
    highway === 'motorway_link';

  if (extratags.lanes) {
    const total = parseInt(extratags.lanes, 10);
    if (!isNaN(total) && total > 0) {
      if (isOneway) return total;
      return Math.max(1, Math.round(total / 2));
    }
  }

  if (highway === 'motorway') return 3;
  if (highway === 'trunk') return isOneway ? 2 : 1;
  if (highway === 'primary' || highway === 'secondary') return isOneway ? 2 : 1;
  return 1;
}

export async function fetchOSMRoadInfo(lat: number, lon: number): Promise<RoadInfo> {
  // 1. Check cache for points within 25 meters
  const cached = cache.find((c) => calculateDistanceMeters(c.lat, c.lon, lat, lon) < 25);
  if (cached && Date.now() - cached.timestamp < 60000) {
    return { ...cached.info, source: 'cache' };
  }

  // 2. Throttle checks
  const now = Date.now();
  if (now - lastFetchTime < MIN_FETCH_INTERVAL_MS && cached) {
    return cached.info;
  }
  lastFetchTime = now;

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat.toFixed(6)}&lon=${lon.toFixed(6)}&zoom=18&addressdetails=1&extratags=1`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'UtInfoRoadHazardRecorder/1.0',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OSM HTTP ${response.status}`);
    }

    const data: NominatimResponse = await response.json();
    const address = data.address || {};

    const roadName =
      address.road ||
      address.pedestrian ||
      address.highway ||
      address.footway ||
      address.path ||
      'Névtelen út / Nyomvonal';

    const city =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.city_district ||
      address.suburb ||
      'Ismeretlen település';

    const postcode = address.postcode || '';
    const roadNumber = extractRoadNumber(data, roadName);
    const lanes = estimateDirectionalLanes(data);
    const maxspeed = data.extratags?.maxspeed ? parseInt(data.extratags.maxspeed, 10) : undefined;

    const roadInfo: RoadInfo = {
      roadNumber,
      roadName,
      city,
      postcode,
      suburb: address.suburb || address.city_district,
      lanes,
      maxspeed: isNaN(maxspeed as number) ? undefined : maxspeed,
      source: 'osm',
      fullDisplayName: data.display_name,
    };

    // Cache the result (keep cache size <= 50)
    if (cache.length > 50) cache.shift();
    cache.push({ lat, lon, info: roadInfo, timestamp: now });

    return roadInfo;
  } catch {
    // If request fails or offline, return best effort or last cached
    if (cached) return cached.info;

    return {
      roadNumber: '',
      roadName: 'Jelenlegi útszakasz',
      city: 'GPS pozíció alapján',
      postcode: '',
      lanes: 2,
      source: 'osm',
    };
  }
}
