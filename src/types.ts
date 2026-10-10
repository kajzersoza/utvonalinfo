/**
 * Types for Road Hazard, OpenStreetMap Road Data, OSM Features and Cockpit state
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
  laneCount: number; // Menetirány szerinti sávok száma (1-6)
  lateralPosition: LateralPosition; // 'left' (bal) | 'center' (közép) | 'right' (jobb)
  laneNumber: number; // Melyik sávban van a menetirányban (1 = legbelső)
  hazardType: HazardType;
  severity: Severity;
  notes?: string;
  resolved?: boolean;
}

export type OSMFeatureType = 'crossing' | 'railway' | 'traffic_signals' | 'traffic_sign';

export interface OSMFeature {
  id: string;
  type: OSMFeatureType;
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  speedLimit?: number;
}

export interface OSMFeatureVisibility {
  showCrossings: boolean; // Gyalogátkelőhelyek
  showRailways: boolean; // Vasúti átjárók
  showTrafficSignals: boolean; // Jelzőlámpák
  showTrafficSigns: boolean; // Közlekedési táblák
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
  houseNumber?: string; // Házszám menetirány szerint pl. "42.", "12-14"
  city: string; // pl. "Budapest", "Budaörs"
  postcode: string; // pl. "1118"
  suburb?: string;
  lanes: number; // Becsült vagy OSM adatból kinyert menetirányú sávszám
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
  showHouseNumber: boolean;
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
  osmFeatures: OSMFeatureVisibility;
}
