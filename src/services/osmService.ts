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
  { id: 'osm-f-10', type: 'traffic_sign', name: 'Sebességkorlátozás 70 km/h', latitude: 47.4680, longitude: 19.0100, description: 'Megengedett legnagyobb sebesség 70 tábla', speedLimit: 70 },
  { id: 'osm-f-11', type: 'traffic_sign', name: 'Sebességkorlátozás 50 km/h', latitude: 47.4960, longitude: 19.0405, description: 'Lakott terület sebességkorlátozás 50 tábla', speedLimit: 50 },
  { id: 'osm-f-12', type: 'traffic_sign', name: 'Autópálya kezdete (130 km/h)', latitude: 47.4610, longitude: 18.9900, description: 'M7 autópálya matrica ellenőrzés', speedLimit: 130 },
  { id: 'osm-f-13', type: 'traffic_sign', name: 'Elsőbbségadás kötelező', latitude: 47.5040, longitude: 19.0390, description: 'Mackósajt tábla csomópontban' },
  { id: 'osm-f-14', type: 'traffic_sign', name: 'Sebességkorlátozás 90 km/h', latitude: 47.1940, longitude: 18.3500, description: 'Főúti sebességkorlátozás 90 tábla', speedLimit: 90 },

  // Településhatár jelző táblák (Town boundary / City limit signs - Lakott terület kezdete és vége táblák)
  // Route 1 (Budapest Budaörsi út -> M7)
  { id: 'osm-f-15-end', type: 'city_limit', name: 'Budapest lakott terület vége tábla', latitude: 47.4620, longitude: 18.9950, cityLimitName: 'Budapest', cityLimitType: 'end', speedLimit: 90, description: 'Budapest lakott terület vége (KRESZ áthúzott tábla)' },
  { id: 'osm-f-16', type: 'city_limit', name: 'Budaörs városhatár tábla', latitude: 47.4585, longitude: 18.9810, cityLimitName: 'Budaörs', cityLimitType: 'start', speedLimit: 50, description: 'Budaörs lakott terület kezdete (50 km/h)' },
  { id: 'osm-f-16-end', type: 'city_limit', name: 'Budaörs lakott terület vége tábla', latitude: 47.4520, longitude: 18.9600, cityLimitName: 'Budaörs', cityLimitType: 'end', speedLimit: 110, description: 'Budaörs lakott terület vége' },

  // Route 2 (Budapest Belváros)
  { id: 'osm-f-18', type: 'city_limit', name: 'Budapest városhatár tábla', latitude: 47.4910, longitude: 19.0415, cityLimitName: 'Budapest', cityLimitType: 'start', speedLimit: 50, description: 'Budapest lakott terület kezdete (50 km/h)' },

  // Route 3 (8-as főút Várpalota)
  { id: 'osm-f-17', type: 'city_limit', name: 'Várpalota városhatár tábla', latitude: 47.1910, longitude: 18.2800, cityLimitName: 'Várpalota', cityLimitType: 'start', speedLimit: 50, description: 'Várpalota lakott terület kezdete (50 km/h)' },
  { id: 'osm-f-17-end', type: 'city_limit', name: 'Várpalota lakott terület vége tábla', latitude: 47.1865, longitude: 18.2200, cityLimitName: 'Várpalota', cityLimitType: 'end', speedLimit: 90, description: 'Várpalota lakott terület vége' },
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

// -------------------------------------------------------------
// Real Online OSM Features Fetching via Overpass API
// (Crossings, Railways, Traffic Signals, Traffic Signs)
// -------------------------------------------------------------
let lastOverpassQueryLat = 0;
let lastOverpassQueryLon = 0;
let lastOverpassQueryTime = 0;
const cachedOnlineFeatures: OSMFeature[] = [...SAMPLE_OSM_FEATURES];

export async function fetchNearbyOSMFeatures(
  lat: number,
  lon: number,
  force: boolean = false
): Promise<OSMFeature[]> {
  const now = Date.now();
  const dist = calculateDistanceMeters(lastOverpassQueryLat, lastOverpassQueryLon, lat, lon);

  // If queried recently and user moved less than 160 meters, return cached features
  if (!force && dist < 160 && now - lastOverpassQueryTime < 14000 && cachedOnlineFeatures.length > 0) {
    return cachedOnlineFeatures;
  }

  // Throttle to respect public OSM Overpass servers
  if (!force && now - lastOverpassQueryTime < 7000) {
    return cachedOnlineFeatures;
  }

  lastOverpassQueryLat = lat;
  lastOverpassQueryLon = lon;
  lastOverpassQueryTime = now;

  const query = `[out:json][timeout:6];(node["highway"="crossing"](around:500,${lat.toFixed(5)},${lon.toFixed(5)});way["highway"="crossing"](around:500,${lat.toFixed(5)},${lon.toFixed(5)});node["railway"~"^(level_crossing|crossing)$"](around:550,${lat.toFixed(5)},${lon.toFixed(5)});node["highway"="traffic_signals"](around:500,${lat.toFixed(5)},${lon.toFixed(5)});node["traffic_sign"](around:500,${lat.toFixed(5)},${lon.toFixed(5)});node["highway"~"^(speed_camera|stop|give_way)$"](around:500,${lat.toFixed(5)},${lon.toFixed(5)});node["place"~"^(city|town|village|suburb)$"](around:600,${lat.toFixed(5)},${lon.toFixed(5)}););out center 45;`;

  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5500);

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!resp.ok) continue;

      const data = await resp.json();
      if (!data.elements || !Array.isArray(data.elements)) continue;

      const results: OSMFeature[] = [];
      for (const el of data.elements) {
        const itemLat = el.lat ?? el.center?.lat;
        const itemLon = el.lon ?? el.center?.lon;
        if (!itemLat || !itemLon) continue;

        const tags = el.tags || {};
        let type: OSMFeature['type'] | null = null;
        let name = '';
        let desc = '';
        let speedLimit: number | undefined;

        let cityLimitType: 'start' | 'end' | undefined;

        if (tags.highway === 'crossing') {
          type = 'crossing';
          name = tags.crossing === 'zebra' ? 'Zebra gyalogátkelőhely' : (tags.name || 'Gyalogátkelőhely');
          desc = tags.flashing_lights === 'yes' ? 'Sárga villogó fénnyel jelzett átkelő' : 'Kijelölt gyalogos átkelőhely';
        } else if (tags.railway === 'level_crossing' || tags.railway === 'crossing') {
          type = 'railway';
          name = tags.name || 'Vasúti átjáró';
          desc = tags['crossing:barrier'] ? 'Sorompóval védett vasúti átjáró' : 'Vasúti fénysorompós átjáró';
        } else if (tags.highway === 'traffic_signals') {
          type = 'traffic_signals';
          name = tags.name || 'Forgalmi jelzőlámpa';
          desc = 'Közúti csomóponti jelzőlámpa';
        } else if (tags.place && ['city', 'town', 'village', 'suburb', 'hamlet'].includes(tags.place)) {
          type = 'city_limit';
          cityLimitType = 'start';
          const cityName = tags.name || tags['name:hu'] || tags.city || 'Település';
          name = `${cityName} városhatár (Településtábla)`;
          desc = `${cityName} lakott terület kezdete (50 km/h)`;
          speedLimit = 50;
        } else if (tags.traffic_sign || tags.highway === 'speed_camera' || tags.highway === 'stop' || tags.highway === 'give_way') {
          // Check if this sign is a city limit sign (Lakott terület kezdete vagy vége)
          const signStr = String(tags.traffic_sign || '').toLowerCase();
          if (
            signStr.includes('city_limit') ||
            signStr.includes('hu:c-01') ||
            signStr.includes('hu:c-001') ||
            signStr.includes('hu:c-02') ||
            signStr.includes('hu:c-002') ||
            signStr.includes('village_limit')
          ) {
            type = 'city_limit';
            const isEnd =
              signStr.includes('hu:c-02') ||
              signStr.includes('hu:c-002') ||
              signStr.includes('end') ||
              signStr.includes('exit') ||
              signStr.includes('vege');
            cityLimitType = isEnd ? 'end' : 'start';
            const cityName = tags.name || tags.city || tags['name:hu'] || 'Település';
            name = isEnd ? `${cityName} lakott terület vége tábla` : `${cityName} városhatár tábla`;
            desc = isEnd ? `${cityName} lakott terület vége` : `${cityName} lakott terület kezdete (50 km/h)`;
            speedLimit = isEnd ? 90 : 50;
          } else {
            type = 'traffic_sign';
            if (tags.highway === 'speed_camera') {
              name = 'Sebességmérő kamera (Traffipax)';
              desc = 'Automata sebességellenőrzés';
            } else if (tags.highway === 'stop') {
              name = 'ÁLLJ! Elsőbbségadás kötelező (STOP tábla)';
              desc = 'Közlekedési Stop tábla';
            } else if (tags.highway === 'give_way') {
              name = 'Elsőbbségadás kötelező tábla';
              desc = 'Mackósajt elsőbbségadás tábla';
            } else {
              name = `Közlekedési tábla (${tags.traffic_sign})`;
              desc = 'Közúti jelzőtábla';
            }

            if (tags.maxspeed) {
              speedLimit = parseInt(tags.maxspeed, 10);
            } else {
              const matchedSpeed = signStr.match(/\b(30|40|50|60|70|80|90|100|110|120|130)\b/);
              if (matchedSpeed) {
                speedLimit = parseInt(matchedSpeed[1], 10);
              }
            }

            if (speedLimit && !isNaN(speedLimit)) {
              name = `Sebességkorlátozás: ${speedLimit} km/h`;
              desc = `Megengedett legnagyobb sebesség: ${speedLimit} km/h`;
            }
          }
        }

        if (type) {
          results.push({
            id: `osm-${el.type || 'node'}-${el.id}`,
            type,
            name,
            latitude: itemLat,
            longitude: itemLon,
            description: desc,
            speedLimit,
            cityLimitName: type === 'city_limit' ? (tags.name || tags.city) : undefined,
            cityLimitType,
          });
        }
      }

      if (results.length > 0) {
        // Merge into cached features, preserving already loaded
        const map = new Map(cachedOnlineFeatures.map((f) => [f.id, f]));
        for (const item of results) {
          map.set(item.id, item);
        }
        cachedOnlineFeatures.length = 0;
        cachedOnlineFeatures.push(...Array.from(map.values()));
        return cachedOnlineFeatures;
      }
    } catch {
      // Ignore network timeout, try next or return existing
    }
  }

  return cachedOnlineFeatures;
}

