import { GPSState } from '../types';
import { calculateDistanceMeters } from './osmService';

export interface RoutePoint {
  lat: number;
  lon: number;
  heading: number;
  speed: number; // km/h
  roadName: string;
  roadNumber: string;
  city: string;
  postcode: string;
  lanes: number; // Menetirány szerinti sávok száma
}

// Preset Route 1: Budapest Budaörsi út -> M7 Autópálya (3-4 sáv menetirány szerint)
export const SIMULATED_ROUTE_M7: RoutePoint[] = [
  { lat: 47.4762, lon: 19.0285, heading: 238, speed: 52, roadName: 'Budaörsi út', roadNumber: '7', city: 'Budapest XI. kerület', postcode: '1118', lanes: 3 },
  { lat: 47.4725, lon: 19.0205, heading: 242, speed: 60, roadName: 'Budaörsi út', roadNumber: '7', city: 'Budapest XI. kerület', postcode: '1118', lanes: 3 },
  { lat: 47.4695, lon: 19.0142, heading: 245, speed: 65, roadName: 'Budaörsi út (M1-M7 közös szakasz)', roadNumber: 'M1 / M7', city: 'Budapest XI. kerület', postcode: '1118', lanes: 4 },
  { lat: 47.4645, lon: 19.0012, heading: 248, speed: 78, roadName: 'Budaörsi út kivezető', roadNumber: 'M7', city: 'Budapest XI. kerület', postcode: '1118', lanes: 3 },
  { lat: 47.4582, lon: 18.9814, heading: 250, speed: 92, roadName: 'M7 Autópálya', roadNumber: 'M7', city: 'Budaörs', postcode: '2040', lanes: 3 },
  { lat: 47.4532, lon: 18.9645, heading: 248, speed: 105, roadName: 'M7 Autópálya', roadNumber: 'M7', city: 'Budaörs', postcode: '2040', lanes: 3 },
  { lat: 47.4489, lon: 18.9482, heading: 248, speed: 118, roadName: 'M7 Autópálya', roadNumber: 'M7', city: 'Törökbálint', postcode: '2045', lanes: 3 },
  { lat: 47.4421, lon: 18.9255, heading: 245, speed: 125, roadName: 'M7 Autópálya', roadNumber: 'M7', city: 'Érd', postcode: '2030', lanes: 3 },
  { lat: 47.4325, lon: 18.8920, heading: 242, speed: 128, roadName: 'M7 Autópálya', roadNumber: 'M7', city: 'Érd', postcode: '2030', lanes: 3 },
  { lat: 47.4180, lon: 18.8450, heading: 235, speed: 130, roadName: 'M7 Autópálya', roadNumber: 'M7', city: 'Tárnok', postcode: '2461', lanes: 3 },
];

// Preset Route 2: Budapest Belváros (Fő utca / Duna-part) - 1 sáv menetirány szerint!
export const SIMULATED_ROUTE_CITY: RoutePoint[] = [
  { lat: 47.4920, lon: 19.0410, heading: 5, speed: 35, roadName: 'Apród utca', roadNumber: '', city: 'Budapest I. kerület', postcode: '1013', lanes: 1 },
  { lat: 47.4950, lon: 19.0408, heading: 10, speed: 42, roadName: 'Fő utca', roadNumber: '', city: 'Budapest I. kerület', postcode: '1011', lanes: 1 },
  { lat: 47.4979, lon: 19.0402, heading: 18, speed: 38, roadName: 'Fő utca', roadNumber: '', city: 'Budapest I. kerület', postcode: '1011', lanes: 1 },
  { lat: 47.5020, lon: 19.0392, heading: 22, speed: 45, roadName: 'Fő utca (Batthyány tér)', roadNumber: '', city: 'Budapest I. kerület', postcode: '1011', lanes: 1 },
  { lat: 47.5080, lon: 19.0380, heading: 15, speed: 48, roadName: 'Bem rakpart', roadNumber: '', city: 'Budapest II. kerület', postcode: '1027', lanes: 1 },
  { lat: 47.5140, lon: 19.0370, heading: 8, speed: 50, roadName: 'Árpád fejedelem útja', roadNumber: '', city: 'Budapest II. kerület', postcode: '1023', lanes: 2 },
];

// Preset Route 3: 8-as Főút (Veszprém felé) - 1 sáv menetirány szerint!
export const SIMULATED_ROUTE_HIGHWAY8: RoutePoint[] = [
  { lat: 47.1950, lon: 18.3650, heading: 265, speed: 85, roadName: '8-as számú főút', roadNumber: '8', city: 'Székesfehérvár', postcode: '8000', lanes: 1 },
  { lat: 47.1920, lon: 18.3150, heading: 260, speed: 90, roadName: '8-as számú főút', roadNumber: '8', city: 'Csór', postcode: '8041', lanes: 1 },
  { lat: 47.1890, lon: 18.2600, heading: 258, speed: 92, roadName: '8-as számú főút', roadNumber: '8', city: 'Várpalota', postcode: '8100', lanes: 1 },
  { lat: 47.1850, lon: 18.1900, heading: 255, speed: 95, roadName: '8-as számú főút elkerülő', roadNumber: '8', city: 'Várpalota', postcode: '8100', lanes: 1 },
  { lat: 47.1750, lon: 18.0900, heading: 252, speed: 90, roadName: '8-as számú főút', roadNumber: '8', city: 'Öskü', postcode: '8191', lanes: 1 },
];

export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  return (Math.round((theta * 180) / Math.PI) + 360) % 360;
}

/**
 * Checks if hazard is STRICTLY:
 * 1. Matching driver's travel direction
 * 2. Physically AHEAD in front of the vehicle
 * 3. Within warning distance
 * If vehicle has passed it (behind), returns false.
 */
export function isHazardAheadInDirection(
  carLat: number,
  carLon: number,
  carHeading: number,
  hazardLat: number,
  hazardLon: number,
  hazardHeading: number,
  maxDistanceMeters: number
): { isAhead: boolean; distance: number } {
  const distance = calculateDistanceMeters(carLat, carLon, hazardLat, hazardLon);
  if (distance > maxDistanceMeters) {
    return { isAhead: false, distance };
  }

  // Already passed if practically at location
  if (distance < 5) {
    return { isAhead: false, distance };
  }

  // 1. Directional alignment (must match travel direction within 55 degrees)
  const headingDiff = Math.abs((carHeading - hazardHeading + 180 + 360) % 360 - 180);
  if (headingDiff > 55) {
    return { isAhead: false, distance };
  }

  // 2. Forward view cone (must be in front of the car)
  const bearingToHazard = calculateBearing(carLat, carLon, hazardLat, hazardLon);
  const relativeAngle = Math.abs((carHeading - bearingToHazard + 180 + 360) % 360 - 180);

  // If angle is <= 65 degrees, it's ahead in the driver's windshield view
  // If > 75 degrees, it is behind the vehicle (already passed!)
  if (relativeAngle <= 65) {
    return { isAhead: true, distance };
  }

  return { isAhead: false, distance };
}

export function getCardinalDirection(heading: number): string {
  const normalized = (heading % 360 + 360) % 360;
  const directions = [
    'É (Észak)',
    'ÉK (Északkelet)',
    'K (Kelet)',
    'DK (Délkelet)',
    'D (Dél)',
    'DNY (Délnyugat)',
    'NY (Nyugat)',
    'ÉNY (Északnyugat)',
  ];
  const index = Math.round(normalized / 45) % 8;
  return directions[index];
}

export function getCardinalDirectionShort(heading: number): string {
  const normalized = (heading % 360 + 360) % 360;
  const directions = ['É', 'ÉK', 'K', 'DK', 'D', 'DNY', 'NY', 'ÉNY'];
  const index = Math.round(normalized / 45) % 8;
  return directions[index];
}
