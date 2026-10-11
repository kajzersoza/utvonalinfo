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
  // Online / Firebase fields
  isOnline?: boolean;
  isPublic?: boolean;
  userId?: string;
  userEmail?: string;
  status?: 'active' | 'verified' | 'resolved';
  verifiedByAdmin?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type HazardFilterMode = 'all_online' | 'my_hazards' | 'local_only' | 'combined';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAdmin: boolean;
  photoURL?: string | null;
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
  showCrossings: boolean; // Gyalogátkelőhelyek mutatása
  announceCrossings: boolean; // Gyalogátkelőhelyek bemondása
  showRailways: boolean; // Vasúti átjárók mutatása
  announceRailways: boolean; // Vasúti átjárók bemondása
  showTrafficSignals: boolean; // Jelzőlámpák mutatása
  announceTrafficSignals: boolean; // Jelzőlámpák bemondása
  showTrafficSigns: boolean; // Közlekedési táblák mutatása
  announceTrafficSigns: boolean; // Közlekedési táblák bemondása
}

export interface SoundAlertOptions {
  enabled: boolean; // Rövid hangjelzések (chimes / pittyegés)
  volume: number; // 0 - 1
  playSeverityChimes: boolean; // Fokozatonkénti hangjelzések (1: enyhe, 2: közepes, 3: súlyos, 4: kritikus)
  playTypeChimes: boolean; // Eltérő hangszín a hibatípus szerint (kátyú, vasút, fekvőrendőr stb.)
  soundStyle: 'digital' | 'chime' | 'beep' | 'radar';
  alertMode: 'both' | 'sound_only' | 'voice_only'; // Hangjelzés + Beszéd, Csak hangjelzés, Csak beszéd
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
  soundAlerts: SoundAlertOptions;
  highAccuracyGPS: boolean;
  showCompassWidget: boolean;
  osmFeatures: OSMFeatureVisibility;
}
