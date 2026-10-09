/**
 * Types for Road Hazard, OpenStreetMap Road Data and Cockpit state
 */

export type HazardType =
  | 'pothole' // Kátyú
  | 'manhole' // Csatornafedél (kiállás / besüllyedés)
  | 'rutting' // Nyomvályú / Bordásodás
  | 'crack' // Repedés
  | 'subsidence' // Úttestsüllyedés / letörés
  | 'debris' // Akadály / Törmelék
  | 'speedbump' // Fekvőrendőr / egyenetlenség
  | 'other'; // Egyéb úthiba

export type LateralPosition = 'left' | 'center' | 'right';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface RoadHazard {
  id: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  heading: number; // 0-359 fok, az úthiba iránya (csak ebben az irányban haladva érvényes)
  speed: number; // km/h a rögzítéskor
  accuracy: number; // méterben
  roadNumber: string; // pl. "M7", "8", "6101"
  roadName: string; // pl. "Budaörsi út"
  city: string; // pl. "Budapest XI. kerület"
  postcode: string; // pl. "1118"
  laneCount: number; // Sávok száma (1-6)
  lateralPosition: LateralPosition; // 'left' (bal) | 'center' (közép) | 'right' (jobb)
  laneNumber: number; // Melyik sávban van (1 = legbelső/legszélső, standard 1-től)
  hazardType: HazardType;
  severity: Severity;
  notes?: string;
  resolved?: boolean;
}

export interface GPSState {
  latitude: number;
  longitude: number;
  heading: number; // 0 - 359 fok
  speed: number; // km/h
  accuracy: number; // méterben
  timestamp: number;
  status: 'locating' | 'active' | 'error' | 'simulated';
  errorMessage?: string;
}

export interface RoadInfo {
  roadNumber: string; // pl. "M7", "8", "1"
  roadName: string; // pl. "Budaörsi út", "Fő utca"
  city: string; // pl. "Budapest", "Budaörs"
  postcode: string; // pl. "1118"
  suburb?: string;
  lanes: number; // Becsült vagy OSM adatból kinyert sávszám
  maxspeed?: number; // Sebességkorlátozás ha elérhető
  source: 'osm' | 'cache' | 'simulated';
  fullDisplayName?: string;
}

export interface DisplayOptions {
  showCity: boolean;
  showStreet: boolean;
  showRoadNumber: boolean;
  showPostcode: boolean;
  showLaneInfo: boolean;
  showSpeed: boolean;
  showHeading: boolean;
  showCoordinates: boolean;
}

export interface VoiceOptions {
  enabled: boolean;
  volume: number; // 0 - 1
  rate: number; // 0.8 - 1.5
  pitch: number; // 0.8 - 1.2
  announceCity: boolean;
  announceStreet: boolean;
  announceRoadNumber: boolean;
  announceLaneInfo: boolean;
  announceApproachingHazards: boolean;
  hazardWarningDistanceMeters: number; // pl. 200m
  selectedVoiceURI?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  displayOptions: DisplayOptions;
  voiceOptions: VoiceOptions;
  highAccuracyGPS: boolean;
  showCompassWidget: boolean;
}
