interface NominatimResponse {
  address?: {
    road?: string;
    house_number?: string;
    housenumber?: string;
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

import { RoadInfo, OSMFeature } from '../types';

export const SAMPLE_OSM_FEATURES: OSMFeature[] = [
  // Gyalogátkelőhelyek (Crossings)
  { id: 'osm-f-1', type: 'crossing', name: 'Zebra gyalogátkelőhely', latitude: 47.4750, longitude: 19.0260, description: 'Felfestett gyalogátkelő sárga villogóval' },
  { id: 'osm-f-2', type: 'crossing', name: 'Gyalogos átkelő', latitude: 47.4710, longitude: 19.0170, description: 'Gyalogos átkelőhely megállónál' },
  { id: 'osm-f-3', type: 'crossing', name: 'Zebra gyalogátkelő', latitude: 47.4955, longitude: 19.0407, description: 'Gyalogátkelőhely Fő utcán' },
  { id: 'osm-f-4', type: 'crossing', name: 'Batthyány téri zebra', latitude: 47.5015, longitude: 19.0395, description: 'Frekventált gyalogátkelőhely' },

  // Jelzőlámpák (Traffic signals)
  { id: 'osm-f-5', type: 'traffic_signals', name: 'Forgalmi jelzőlámpa', latitude: 47.4735, longitude: 19.0225, description: 'Budaörsi út csomóponti jelzőlámpa' },
  { id: 'osm-f-6', type: 'traffic_signals', name: 'Sasadi út jelzőlámpa', latitude: 47.4660, longitude: 19.0050, description: 'Torkolati jelzőlámpa kanyarodó sávval' },
  { id: 'osm-f-7', type: 'traffic_signals', name: 'Belvárosi jelzőlámpa', latitude: 47.4930, longitude: 19.0409, description: 'Gyalogos- és járműirányító lámpa' },

  // Vasúti átjárók (Railway level crossings)
  { id: 'osm-f-8', type: 'railway', name: 'Vasúti átjáró fénysorompóval', latitude: 47.4410, longitude: 18.9220, description: 'Vasúti szintbeli kereszteződés sorompóval' },
  { id: 'osm-f-9', type: 'railway', name: 'Iparvágány vasúti átkelő', latitude: 47.1910, longitude: 18.2550, description: 'Vasúti szintbeli átjáró Várpalota' },

  // Közlekedési táblák (Traffic signs)
  { id: 'osm-f-10', type: 'traffic_sign', name: 'Sebességkorlátozás 70 km/h', latitude: 47.4680, longitude: 19.0100, description: 'Megengedett legnagyobb sebesség 70', speedLimit: 70 },
  { id: 'osm-f-11', type: 'traffic_sign', name: 'Sebességkorlátozás 50 km/h', latitude: 47.4960, longitude: 19.0405, description: 'Lakott terület sebességkorlátozás 50', speedLimit: 50 },
  { id: 'osm-f-12', type: 'traffic_sign', name: 'Autópálya kezdete (130 km/h)', latitude: 47.4610, longitude: 18.9900, description: 'M7 autópálya matrica ellenőrzés', speedLimit: 130 },
  { id: 'osm-f-13', type: 'traffic_sign', name: 'Elsőbbségadás kötelező', latitude: 47.5040, longitude: 19.0390, description: 'Mackósajt tábla csomópontban' },
];

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
    const houseNumber = address.house_number || address.housenumber || '';
    const roadNumber = extractRoadNumber(data, roadName);
    const lanes = estimateDirectionalLanes(data);
    const maxspeed = data.extratags?.maxspeed ? parseInt(data.extratags.maxspeed, 10) : undefined;

    const roadInfo: RoadInfo = {
      roadNumber,
      roadName,
      houseNumber: houseNumber ? `${houseNumber}.` : undefined,
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
