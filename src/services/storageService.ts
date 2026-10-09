import { AppSettings, RoadHazard } from '../types';

const HAZARDS_STORAGE_KEY = 'utinfo_road_hazards_v1';
const SETTINGS_STORAGE_KEY = 'utinfo_settings_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark', // Driver dark mode default (easier on eyes)
  highAccuracyGPS: true,
  showCompassWidget: true,
  displayOptions: {
    showCity: true,
    showStreet: true,
    showRoadNumber: true,
    showPostcode: true,
    showLaneInfo: true,
    showSpeed: true,
    showHeading: true,
    showCoordinates: false,
  },
  voiceOptions: {
    enabled: true,
    volume: 1.0,
    rate: 1.05,
    pitch: 1.0,
    announceCity: true,
    announceStreet: true,
    announceRoadNumber: true,
    announceLaneInfo: false,
    announceApproachingHazards: true,
    hazardWarningDistanceMeters: 250,
  },
};

// Initial realistic Hungarian road hazards for instant testability
const INITIAL_HAZARDS: RoadHazard[] = [
  {
    id: 'hz-sample-1',
    timestamp: Date.now() - 1000 * 60 * 15,
    latitude: 47.4695,
    longitude: 19.0142,
    heading: 245, // WSW irány (kifelé a városból)
    speed: 62,
    accuracy: 4,
    roadNumber: '7',
    roadName: 'Budaörsi út',
    city: 'Budapest XI. kerület',
    postcode: '1118',
    laneCount: 3,
    lateralPosition: 'right',
    laneNumber: 3,
    hazardType: 'pothole',
    severity: 'high',
    notes: 'Mély kátyú az aszfalton a külső sávban, közvetlenül a buszmegálló után.',
  },
  {
    id: 'hz-sample-2',
    timestamp: Date.now() - 1000 * 60 * 45,
    latitude: 47.4582,
    longitude: 18.9814,
    heading: 250,
    speed: 85,
    accuracy: 3,
    roadNumber: 'M7',
    roadName: 'M7 Autópálya kivezető',
    city: 'Budaörs',
    postcode: '2040',
    laneCount: 3,
    lateralPosition: 'center',
    laneNumber: 2,
    hazardType: 'manhole',
    severity: 'medium',
    notes: 'Besüllyedt vízelvezető rács a középső sáv nyomvonalában.',
  },
  {
    id: 'hz-sample-3',
    timestamp: Date.now() - 1000 * 60 * 90,
    latitude: 47.4489,
    longitude: 18.9482,
    heading: 248,
    speed: 110,
    accuracy: 5,
    roadNumber: 'M7',
    roadName: 'M7 Autópálya',
    city: 'Törökbálint',
    postcode: '2045',
    laneCount: 3,
    lateralPosition: 'left',
    laneNumber: 1,
    hazardType: 'rutting',
    severity: 'high',
    notes: 'Kifejezett nyomvályú és bordásodás a belső sávban esős időben vízállás veszéllyel.',
  },
  {
    id: 'hz-sample-4',
    timestamp: Date.now() - 1000 * 60 * 180,
    latitude: 47.4979,
    longitude: 19.0402,
    heading: 18, // Északi irány
    speed: 38,
    accuracy: 6,
    roadNumber: '',
    roadName: 'Fő utca',
    city: 'Budapest I. kerület',
    postcode: '1011',
    laneCount: 2,
    lateralPosition: 'right',
    laneNumber: 2,
    hazardType: 'manhole',
    severity: 'critical',
    notes: 'Kiálló csatornafedél perem, keréktörés veszély!',
  },
];

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      displayOptions: { ...DEFAULT_SETTINGS.displayOptions, ...(parsed.displayOptions || {}) },
      voiceOptions: { ...DEFAULT_SETTINGS.voiceOptions, ...(parsed.voiceOptions || {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings to localStorage', e);
  }
}

export function loadHazards(): RoadHazard[] {
  try {
    const raw = localStorage.getItem(HAZARDS_STORAGE_KEY);
    if (!raw) {
      saveHazards(INITIAL_HAZARDS);
      return INITIAL_HAZARDS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_HAZARDS;
  } catch {
    return INITIAL_HAZARDS;
  }
}

export function saveHazards(hazards: RoadHazard[]) {
  try {
    localStorage.setItem(HAZARDS_STORAGE_KEY, JSON.stringify(hazards));
  } catch (e) {
    console.error('Failed to save hazards', e);
  }
}

export function exportHazardsJSON(hazards: RoadHazard[]): string {
  return JSON.stringify(hazards, null, 2);
}

export function importHazardsJSON(jsonString: string): RoadHazard[] | null {
  try {
    const data = JSON.parse(jsonString);
    if (Array.isArray(data)) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}
