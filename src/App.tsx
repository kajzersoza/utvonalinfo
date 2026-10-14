import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  RoadHazard,
  RoadInfo,
  GPSState,
  AppSettings,
  OSMFeature,
  OSMFeatureVisibility,
  UserProfile,
  HazardFilterMode,
} from './types';
import {
  loadSettings,
  saveSettings,
  loadHazards,
  saveHazards,
  getPrivateHazardNotes,
  savePrivateHazardNote,
  deletePrivateHazardNote,
  loadUserSigns,
  saveUserSigns,
  deleteUserSign,
} from './services/storageService';
import {
  fetchOSMRoadInfo,
  calculateDistanceMeters,
  SAMPLE_OSM_FEATURES,
  fetchNearbyOSMFeatures,
} from './services/osmService';
import { speechService } from './services/speechService';
import { audioAlertService } from './services/audioAlertService';
import {
  SIMULATED_ROUTE_M7,
  SIMULATED_ROUTE_CITY,
  SIMULATED_ROUTE_HIGHWAY8,
  calculateBearing,
  isHazardAheadInDirection,
  isFeatureAheadInDirection,
} from './services/geoService';
import {
  subscribeToAuth,
  subscribeToCloudHazards,
  saveHazardToCloud,
  deleteHazardFromCloud,
  updateHazardInCloud,
  logoutUser,
  testConnection,
} from './services/firebase';

import { Header } from './components/Header';
import { CockpitView } from './components/CockpitView';
import { MapView } from './components/MapView';
import { HazardList } from './components/HazardList';
import { HazardModal } from './components/HazardModal';
import { SettingsModal } from './components/SettingsModal';
import { SimulatorControls } from './components/SimulatorControls';
import { AuthModal } from './components/AuthModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { SignModal } from './components/SignModal';

export default function App() {
  // 1. Persistent Local Settings & Local Hazards & Signs
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [localHazards, setLocalHazards] = useState<RoadHazard[]>(() => loadHazards());
  const [osmFeatures, setOsmFeatures] = useState<OSMFeature[]>(SAMPLE_OSM_FEATURES);
  const [userSigns, setUserSigns] = useState<OSMFeature[]>(() => loadUserSigns());

  // Combined OSM Features + User-Recorded Traffic Signs
  const allOsmFeatures = useMemo(() => {
    return [...userSigns, ...osmFeatures];
  }, [userSigns, osmFeatures]);

  // 2. Firebase Cloud State & User Profile
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [cloudHazards, setCloudHazards] = useState<RoadHazard[]>([]);
  const [filterMode, setFilterMode] = useState<HazardFilterMode>('all_online');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Toast helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // 3. Navigation State - Mobil nézetben a műszerfal a kezdő képernyő
  const [activeTab, setActiveTab] = useState<'split' | 'cockpit' | 'map' | 'list'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return 'cockpit';
    }
    return 'split';
  });

  // 4. Cockpit & GPS State
  const [gps, setGps] = useState<GPSState>({
    latitude: 47.4762,
    longitude: 19.0285,
    heading: 238,
    speed: 52,
    accuracy: 4,
    timestamp: Date.now(),
    status: 'locating',
  });

  const [roadInfo, setRoadInfo] = useState<RoadInfo>({
    roadNumber: '7',
    roadName: 'Budaörsi út',
    houseNumber: '112.',
    city: 'Budapest XI. kerület',
    postcode: '1118',
    lanes: 3,
    source: 'simulated',
  });

  const prevRoadInfoRef = useRef<RoadInfo | null>(null);

  // 5. Modals State
  const [isHazardModalOpen, setIsHazardModalOpen] = useState(false);
  const [modalInitialHazard, setModalInitialHazard] = useState<Partial<RoadHazard> | null>(null);
  const [isEditingHazard, setIsEditingHazard] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);

  // 6. Simulator State
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPlayingSimulation, setIsPlayingSimulation] = useState(false);
  const [activeRouteKey, setActiveRouteKey] = useState<string>('m7');
  const [simStepIndex, setSimStepIndex] = useState(0);
  const [simSpeedMultiplier, setSimSpeedMultiplier] = useState(1);

  // Save settings when changed
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Save local hazards when changed
  useEffect(() => {
    saveHazards(localHazards);
  }, [localHazards]);

  // Boot Test Connection to Firestore
  useEffect(() => {
    testConnection();
  }, []);

  // Subscribe to Firebase Auth
  useEffect(() => {
    const unsub = subscribeToAuth((userProfile) => {
      setCurrentUser(userProfile);
      if (userProfile) {
        showToast(`Üdvözlünk, ${userProfile.displayName || userProfile.email}!`);
      }
    });
    return () => unsub();
  }, [showToast]);

  // Subscribe to Cloud Firestore Road Hazards
  useEffect(() => {
    const unsub = subscribeToCloudHazards(
      (hazards) => {
        setCloudHazards(hazards);
      },
      (err) => {
        console.warn('Hiba az online úthibák szinkronizálásakor:', err);
      }
    );
    return () => unsub();
  }, []);

  // Compute Active Displayed Hazards based on filterMode
  const activeHazards = useMemo(() => {
    const privateNotes = getPrivateHazardNotes();
    const enrichWithPrivateNotes = (list: RoadHazard[]): RoadHazard[] => {
      return list.map((h) => {
        if (privateNotes[h.id]) {
          return { ...h, notes: privateNotes[h.id] };
        }
        return h;
      });
    };

    if (filterMode === 'all_online') {
      return enrichWithPrivateNotes(cloudHazards);
    }
    if (filterMode === 'my_hazards') {
      if (!currentUser) return [];
      return enrichWithPrivateNotes(cloudHazards.filter((h) => h.userId === currentUser.uid));
    }
    if (filterMode === 'local_only') {
      return enrichWithPrivateNotes(localHazards);
    }
    // Combined mode: Merge cloud + local without duplicates
    const map = new Map<string, RoadHazard>();
    for (const h of cloudHazards) {
      map.set(h.id, h);
    }
    for (const h of localHazards) {
      if (!map.has(h.id)) {
        map.set(h.id, h);
      }
    }
    return enrichWithPrivateNotes(Array.from(map.values()));
  }, [filterMode, cloudHazards, localHazards, currentUser]);

  // -------------------------------------------------------------
  // Online OSM Features Live Downloader (Overpass API)
  // -------------------------------------------------------------
  const [isRefreshingOsm, setIsRefreshingOsm] = useState(false);
  const lastOsmFetchCoordsRef = useRef<{ lat: number; lon: number } | null>(null);
  const lastOsmFetchTimeRef = useRef<number>(0);

  const fetchOnlineOsm = useCallback(
    async (lat: number, lon: number, force: boolean = false) => {
      const now = Date.now();
      // Throttle if moved less than 130m and within 18s unless force is true
      if (!force && lastOsmFetchCoordsRef.current) {
        const dist = calculateDistanceMeters(
          lastOsmFetchCoordsRef.current.lat,
          lastOsmFetchCoordsRef.current.lon,
          lat,
          lon
        );
        if (dist < 130 && now - lastOsmFetchTimeRef.current < 18000) {
          return;
        }
      }

      try {
        setIsRefreshingOsm(true);
        const onlineFeatures = await fetchNearbyOSMFeatures(lat, lon, force);
        if (onlineFeatures && onlineFeatures.length > 0) {
          setOsmFeatures(onlineFeatures);
          lastOsmFetchCoordsRef.current = { lat, lon };
          lastOsmFetchTimeRef.current = Date.now();
        }
      } catch {
        // Fallback to cached features
      } finally {
        setIsRefreshingOsm(false);
      }
    },
    []
  );

  // Initial fetch on app launch
  useEffect(() => {
    fetchOnlineOsm(gps.latitude, gps.longitude);
  }, [fetchOnlineOsm]);

  // -------------------------------------------------------------
  // Proximity & Direction Hazard Warning Check (Sound + Voice)
  // -------------------------------------------------------------
  const [approachingHazards, setApproachingHazards] = useState<{
    hazard: RoadHazard;
    distance: number;
  }[]>([]);

  const checkApproachingHazards = useCallback(
    (currentLat: number, currentLon: number, currentHeading: number) => {
      const maxDistance = settings.voiceOptions.hazardWarningDistanceMeters || 200;
      const matches: { hazard: RoadHazard; distance: number }[] = [];

      for (const h of activeHazards) {
        // STRICT CHECK: strictly matching direction of travel, in front of vehicle (előrejelezve), and once passed: NO alert!
        const { isAhead, distance } = isHazardAheadInDirection(
          currentLat,
          currentLon,
          currentHeading,
          h.latitude,
          h.longitude,
          h.heading,
          maxDistance
        );

        if (isAhead) {
          matches.push({ hazard: h, distance });

          // 1. Play synthesized short acoustic alert (severity 1, 2, 3, 4 chimes & hazard specific sound)
          audioAlertService.triggerHazardAudio(h, settings.soundAlerts);

          // 2. Announce voice alert
          speechService.announceHazardAlert(
            h,
            distance,
            settings.voiceOptions,
            settings.soundAlerts.alertMode
          );
        }
      }

      matches.sort((a, b) => a.distance - b.distance);
      setApproachingHazards(matches);
    },
    [activeHazards, settings.voiceOptions, settings.soundAlerts]
  );

  // -------------------------------------------------------------
  // Proximity OSM Features Check (Crossing, Railway, Signals, Signs)
  // Strictly applies configured hazardWarningDistanceMeters and only alerts when approaching!
  // -------------------------------------------------------------
  const prevOsmDistancesRef = useRef<Map<string, number>>(new Map());

  const checkApproachingOsmFeatures = useCallback(
    (currentLat: number, currentLon: number, currentHeading: number) => {
      // 1. Applies user's configured warning distance (beállított jelzési távolság)
      const maxDistance = settings.voiceOptions.hazardWarningDistanceMeters || 200;

      for (const f of allOsmFeatures) {
        // 2. STRICTLY check approaching in driver's forward travel direction (windshield forward cone)
        // Returns isAhead = true only if ahead in front of vehicle (<= 65 deg relative angle) and distance >= 5m
        const { isAhead, distance } = isFeatureAheadInDirection(
          currentLat,
          currentLon,
          currentHeading,
          f.latitude,
          f.longitude,
          maxDistance
        );

        const prevDist = prevOsmDistancesRef.current.get(f.id);
        prevOsmDistancesRef.current.set(f.id, distance);

        // If not ahead (e.g. passed, behind vehicle) -> DO NOT ALERT!
        if (!isAhead) {
          continue;
        }

        // 3. STRICTLY alert only when approaching (közeledéskor)!
        // If distance is increasing (távolodás: current distance grew by more than 3m), DO NOT ALERT!
        if (prevDist !== undefined && distance > prevDist + 3) {
          continue;
        }

        // Check if this type has audio or voice enabled
        const shouldPlayAudio =
          settings.soundAlerts.enabled &&
          settings.soundAlerts.alertMode !== 'voice_only' &&
          ((f.type === 'crossing' && settings.osmFeatures.announceCrossings) ||
            (f.type === 'railway' && settings.osmFeatures.announceRailways) ||
            (f.type === 'traffic_signals' && settings.osmFeatures.announceTrafficSignals) ||
            (f.type === 'traffic_sign' && settings.osmFeatures.announceTrafficSigns) ||
            (f.type === 'city_limit' && settings.osmFeatures.announceCityLimits !== false));

        if (shouldPlayAudio) {
          audioAlertService.triggerFeatureAudio(f.type, settings.soundAlerts, f.id);
        }

        speechService.announceOSMFeatureAlert(
          f,
          distance,
          settings.voiceOptions,
          settings.osmFeatures,
          settings.soundAlerts.alertMode
        );
      }
    },
    [allOsmFeatures, settings.voiceOptions, settings.soundAlerts, settings.osmFeatures]
  );

  // -------------------------------------------------------------
  // Nearby Approaching OSM Road Features (HUD Strip in Cockpit)
  // Strictly applies configured warning distance and only includes approaching features!
  // -------------------------------------------------------------
  const nearbyOsmFeatures = useMemo(() => {
    const maxWarningDist = settings.voiceOptions.hazardWarningDistanceMeters || 200;
    return allOsmFeatures
      .map((f) => {
        const { isAhead, distance } = isFeatureAheadInDirection(
          gps.latitude,
          gps.longitude,
          gps.heading,
          f.latitude,
          f.longitude,
          maxWarningDist
        );
        return {
          feature: f,
          distance,
          isAhead,
        };
      })
      .filter(({ isAhead }) => isAhead)
      .sort((a, b) => a.distance - b.distance);
  }, [allOsmFeatures, gps.latitude, gps.longitude, gps.heading, settings.voiceOptions.hazardWarningDistanceMeters]);

  // -------------------------------------------------------------
  // Real GPS Geolocation Watcher
  // -------------------------------------------------------------
  const lastRealCoordsRef = useRef<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (isSimulating) return;

    if (!('geolocation' in navigator)) {
      setGps((prev) => ({ ...prev, status: 'error', errorMessage: 'GPS nem támogatott' }));
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, speed, heading, accuracy } = pos.coords;
        let finalHeading = heading ?? 0;

        // Fallback: calculate heading from previous location vector if speed > 3 km/h
        if ((heading === null || isNaN(heading)) && lastRealCoordsRef.current) {
          const dist = calculateDistanceMeters(
            lastRealCoordsRef.current.lat,
            lastRealCoordsRef.current.lon,
            latitude,
            longitude
          );
          if (dist > 5) {
            finalHeading = calculateBearing(
              lastRealCoordsRef.current.lat,
              lastRealCoordsRef.current.lon,
              latitude,
              longitude
            );
          }
        }
        lastRealCoordsRef.current = { lat: latitude, lon: longitude };

        const speedKmh = speed ? Math.max(0, speed * 3.6) : 0;

        setGps({
          latitude,
          longitude,
          heading: finalHeading,
          speed: speedKmh,
          accuracy,
          timestamp: pos.timestamp,
          status: 'active',
        });

        // Check approaching hazards (Sound chimes & Speech)
        checkApproachingHazards(latitude, longitude, finalHeading);

        // Check approaching OSM features (Crossings, railways, signals, signs - strictly heading & approaching only)
        checkApproachingOsmFeatures(latitude, longitude, finalHeading);

        // Automatically fetch nearby online OSM features in background
        fetchOnlineOsm(latitude, longitude);

        // Fetch OpenStreetMap reverse geocoded data
        try {
          const osm = await fetchOSMRoadInfo(latitude, longitude);
          setRoadInfo(osm);

          // Trigger speech announcement if configured
          speechService.announceRoadUpdate(
            prevRoadInfoRef.current,
            osm,
            settings.voiceOptions
          );
          prevRoadInfoRef.current = osm;
        } catch {
          // Ignore transient network errors
        }
      },
      () => {
        setGps((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: 'GPS hozzáférés megtagadva vagy nem elérhető',
        }));
      },
      {
        enableHighAccuracy: settings.highAccuracyGPS,
        timeout: 15000,
        maximumAge: 3000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [
    isSimulating,
    settings.highAccuracyGPS,
    settings.voiceOptions,
    checkApproachingHazards,
    checkApproachingOsmFeatures,
    fetchOnlineOsm,
  ]);

  // -------------------------------------------------------------
  // GPS Drive Simulation Timer
  // -------------------------------------------------------------
  const getSelectedRoute = useCallback(() => {
    switch (activeRouteKey) {
      case 'city':
        return SIMULATED_ROUTE_CITY;
      case 'route8':
        return SIMULATED_ROUTE_HIGHWAY8;
      default:
        return SIMULATED_ROUTE_M7;
    }
  }, [activeRouteKey]);

  const advanceSimulationStep = useCallback(() => {
    const route = getSelectedRoute();
    setSimStepIndex((prevIdx) => {
      const nextIdx = (prevIdx + 1) % route.length;
      const pt = route[nextIdx];

      setGps({
        latitude: pt.lat,
        longitude: pt.lon,
        heading: pt.heading,
        speed: pt.speed,
        accuracy: 3,
        timestamp: Date.now(),
        status: 'simulated',
      });

      setRoadInfo({
        roadNumber: pt.roadNumber,
        roadName: pt.roadName,
        houseNumber: pt.houseNumber,
        city: pt.city,
        postcode: pt.postcode,
        lanes: pt.lanes,
        source: 'simulated',
      });

      checkApproachingHazards(pt.lat, pt.lon, pt.heading);
      checkApproachingOsmFeatures(pt.lat, pt.lon, pt.heading);
      fetchOnlineOsm(pt.lat, pt.lon);
      return nextIdx;
    });
  }, [getSelectedRoute, checkApproachingHazards, checkApproachingOsmFeatures, fetchOnlineOsm]);

  // Simulation Interval Loop
  useEffect(() => {
    if (!isSimulating || !isPlayingSimulation) return;

    const intervalMs = Math.max(300, 1000 / simSpeedMultiplier);
    const intervalId = setInterval(advanceSimulationStep, intervalMs);

    return () => clearInterval(intervalId);
  }, [isSimulating, isPlayingSimulation, simSpeedMultiplier, advanceSimulationStep]);

  const handleStartSimulation = useCallback(() => {
    setIsSimulating(true);
    setIsPlayingSimulation(true);
    setSimStepIndex(0);
    const route = getSelectedRoute();
    if (route.length > 0) {
      const pt = route[0];
      setGps({
        latitude: pt.lat,
        longitude: pt.lon,
        heading: pt.heading,
        speed: pt.speed,
        accuracy: 3,
        timestamp: Date.now(),
        status: 'simulated',
      });
      setRoadInfo({
        roadNumber: pt.roadNumber,
        roadName: pt.roadName,
        houseNumber: pt.houseNumber,
        city: pt.city,
        postcode: pt.postcode,
        lanes: pt.lanes,
        source: 'simulated',
      });
      checkApproachingHazards(pt.lat, pt.lon, pt.heading);
      checkApproachingOsmFeatures(pt.lat, pt.lon, pt.heading);
      fetchOnlineOsm(pt.lat, pt.lon);
    }
  }, [getSelectedRoute, checkApproachingHazards, checkApproachingOsmFeatures, fetchOnlineOsm]);

  const handleStopSimulation = useCallback(() => {
    setIsSimulating(false);
    setIsPlayingSimulation(false);
  }, []);

  // -------------------------------------------------------------
  // User Actions: Record, Edit, Delete, Sync Hazards
  // -------------------------------------------------------------
  const handleTriggerRecordHazard = () => {
    const snapshot: Partial<RoadHazard> = {
      latitude: gps.latitude,
      longitude: gps.longitude,
      heading: gps.heading,
      speed: gps.speed,
      accuracy: gps.accuracy,
      roadNumber: roadInfo.roadNumber,
      roadName: roadInfo.roadName,
      city: roadInfo.city,
      postcode: roadInfo.postcode,
      laneCount: roadInfo.lanes || 2,
      lateralPosition: 'right',
      laneNumber: roadInfo.lanes || 2,
      hazardType: 'pothole',
      severity: 'medium',
      timestamp: Date.now(),
      isOnline: Boolean(currentUser),
    };

    setModalInitialHazard(snapshot);
    setIsEditingHazard(false);
    setIsHazardModalOpen(true);
  };

  const handleTriggerAddSign = useCallback(() => {
    setIsSignModalOpen(true);
  }, []);

  const handleSaveSign = useCallback(
    (newSign: OSMFeature) => {
      setUserSigns((prev) => {
        const next = [newSign, ...prev];
        saveUserSigns(next);
        return next;
      });
      audioAlertService.playTypeChime(newSign.type, settings.soundAlerts);
      showToast(`🛑 ${newSign.name} sikeresen rögzítve!`);
    },
    [settings.soundAlerts, showToast]
  );

  const handleDeleteSign = useCallback(
    (signId: string) => {
      deleteUserSign(signId);
      setUserSigns((prev) => prev.filter((s) => s.id !== signId));
      showToast('🗑️ Tábla törölve.');
    },
    [showToast]
  );

  const handleAddSignAtLocation = useCallback((_lat: number, _lon: number) => {
    setIsSignModalOpen(true);
  }, []);

  const handleAddHazardAtLocation = useCallback(
    async (lat: number, lon: number, heading: number) => {
      let rName = roadInfo.roadName || 'Kijelölt útszakasz';
      let rNum = roadInfo.roadNumber || '';
      let rCity = roadInfo.city || 'Térképről rögzítve';
      let rPostcode = roadInfo.postcode || '';
      let rLanes = roadInfo.lanes || 2;

      try {
        const osm = await fetchOSMRoadInfo(lat, lon);
        if (osm.roadName) rName = osm.roadName;
        if (osm.roadNumber) rNum = osm.roadNumber;
        if (osm.city) rCity = osm.city;
        if (osm.postcode) rPostcode = osm.postcode;
        if (osm.lanes) rLanes = osm.lanes;
      } catch {
        // Fallback
      }

      const snapshot: Partial<RoadHazard> = {
        latitude: lat,
        longitude: lon,
        heading: heading || 0,
        speed: 0,
        accuracy: 5,
        roadNumber: rNum,
        roadName: rName,
        city: rCity,
        postcode: rPostcode,
        laneCount: rLanes,
        lateralPosition: 'center',
        laneNumber: 1,
        hazardType: 'pothole',
        severity: 'medium',
        timestamp: Date.now(),
        isOnline: Boolean(currentUser),
      };

      setModalInitialHazard(snapshot);
      setIsEditingHazard(false);
      setIsHazardModalOpen(true);
    },
    [roadInfo, currentUser]
  );

  const handleEditHazard = useCallback((hazard: RoadHazard) => {
    setModalInitialHazard(hazard);
    setIsEditingHazard(true);
    setIsHazardModalOpen(true);
  }, []);

  const handleDeleteHazard = useCallback(
    async (id: string) => {
      // Check if it's in cloud
      const inCloud = cloudHazards.some((h) => h.id === id);
      if (inCloud) {
        try {
          await deleteHazardFromCloud(id);
          showToast('🗑️ Úthiba törölve a felhőből.');
        } catch {
          showToast('Hiba a felhőbeli törlés során.');
        }
      }
      // Also clean up local notes and hazards
      deletePrivateHazardNote(id);
      setLocalHazards((prev) => prev.filter((h) => h.id !== id));
    },
    [cloudHazards, showToast]
  );

  const handleUpdateHazardPosition = useCallback(
    async (id: string, lat: number, lon: number) => {
      const inCloud = cloudHazards.some((h) => h.id === id);
      if (inCloud) {
        try {
          await updateHazardInCloud(id, { latitude: lat, longitude: lon });
        } catch {
          // Fallback
        }
      }
      setLocalHazards((prev) =>
        prev.map((h) => (h.id === id ? { ...h, latitude: lat, longitude: lon } : h))
      );
    },
    [cloudHazards]
  );

  const handleUpdateHazardHeading = useCallback(
    async (id: string, heading: number) => {
      const normalized = (heading % 360 + 360) % 360;
      const inCloud = cloudHazards.some((h) => h.id === id);
      if (inCloud) {
        try {
          await updateHazardInCloud(id, { heading: normalized });
        } catch {
          // Fallback
        }
      }
      setLocalHazards((prev) =>
        prev.map((h) => (h.id === id ? { ...h, heading: normalized } : h))
      );
    },
    [cloudHazards]
  );

  const handleSaveHazard = useCallback(
    async (savedHazard: RoadHazard, saveToCloud: boolean) => {
      // Megjegyzés kezelése: csak offline, a saját fiókban tárolódik!
      if (savedHazard.notes && savedHazard.notes.trim()) {
        savePrivateHazardNote(savedHazard.id, savedHazard.notes.trim());
      } else {
        deletePrivateHazardNote(savedHazard.id);
      }

      // 1. MINDIG azonnal elmentjük helyileg az eszközön, hogy soha semmilyen adat ne vesszen el!
      setLocalHazards((prev) => {
        const idx = prev.findIndex((h) => h.id === savedHazard.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = savedHazard;
          return next;
        }
        return [savedHazard, ...prev];
      });

      // 2. Ha felhőbe töltést kért a felhasználó:
      if (saveToCloud) {
        if (!currentUser) {
          // Ha nincs bejelentkezve, értesítjük és megnyitjuk az Auth modált, de az adat MÁR BIZTONSÁGBAN VAN helyben!
          setIsAuthModalOpen(true);
          showToast('💾 Úthiba elmentve ezen az eszközön! Jelentkezz be a felhőbe való online megosztáshoz.');
          return;
        }

        try {
          await saveHazardToCloud(savedHazard, currentUser);
          setLocalHazards((prev) => {
            const idx = prev.findIndex((h) => h.id === savedHazard.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = { ...savedHazard, isOnline: true };
              return next;
            }
            return [{ ...savedHazard, isOnline: true }, ...prev];
          });
          showToast('☁️ Úthiba sikeresen feltöltve a felhőbe!');
        } catch (e) {
          console.warn('Hiba a felhőbe töltéskor:', e);
          showToast('⚠️ Hiba a felhőbe küldéskor, de a készüléken biztonságosan elmentve!');
        }
      } else {
        showToast('💾 Úthiba elmentve ezen az eszközön.');
      }
    },
    [currentUser, showToast]
  );

  // Sync local hazards to cloud
  const handleSyncLocalToCloud = useCallback(async () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      showToast('Kérlek jelentkezz be a helyi hibák feltöltéséhez!');
      return;
    }

    if (localHazards.length === 0) {
      showToast('Nincsenek helyi adatok a feltöltéshez.');
      return;
    }

    let successCount = 0;
    for (const h of localHazards) {
      try {
        await saveHazardToCloud(h, currentUser);
        successCount++;
      } catch {
        // Ignore single failures
      }
    }

    setLocalHazards([]);
    showToast(`☁️ ${successCount} helyi úthiba sikeresen feltöltve a felhőbe!`);
  }, [currentUser, localHazards, showToast]);

  const handleToggleOsmFeatureVisibility = useCallback((key: keyof OSMFeatureVisibility) => {
    setSettings((prev) => ({
      ...prev,
      osmFeatures: {
        ...prev.osmFeatures,
        [key]: !prev.osmFeatures[key],
      },
    }));
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    showToast('Kijelentkezve.');
  };

  const isDark = settings.theme === 'dark';

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 select-none ${
        isDark ? 'bg-zinc-950 text-white' : 'bg-zinc-50 text-zinc-900'
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs sm:text-sm font-black animate-in fade-in slide-in-from-top-2 border border-blue-400">
          {toastMessage}
        </div>
      )}

      {/* 1. Header Navigation Bar */}
      <Header
        settings={settings}
        gps={gps}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleTheme={() =>
          setSettings((prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }))
        }
        onToggleVoice={() =>
          setSettings((prev) => ({
            ...prev,
            voiceOptions: { ...prev.voiceOptions, enabled: !prev.voiceOptions.enabled },
          }))
        }
        hazardCount={activeHazards.length}
        user={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenAdmin={() => setIsAdminPanelOpen(true)}
        filterMode={filterMode}
        onChangeFilterMode={setFilterMode}
        simulatorControls={
          <SimulatorControls
            isSimulating={isSimulating}
            isPlaying={isPlayingSimulation}
            activeRouteName={activeRouteKey}
            speedMultiplier={simSpeedMultiplier}
            onTogglePlay={() => setIsPlayingSimulation(!isPlayingSimulation)}
            onNextStep={advanceSimulationStep}
            onChangeSpeedMultiplier={setSimSpeedMultiplier}
            onSelectRoute={(routeKey) => {
              setActiveRouteKey(routeKey);
              setSimStepIndex(0);
            }}
            onStartSimulation={handleStartSimulation}
            onStopSimulation={handleStopSimulation}
          />
        }
      />

      {/* 2. Main Content Area */}
      <main className="flex-1 flex flex-col p-2 sm:p-4 max-w-7xl w-full mx-auto overflow-hidden">
        {/* DESKTOP SPLIT VIEW: Cockpit on one side, Map on other side */}
        {activeTab === 'split' && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-[600px]">
            {/* Cockpit HUD View */}
            <div className="lg:col-span-5 flex flex-col h-full overflow-y-auto">
              <CockpitView
                roadInfo={roadInfo}
                gps={gps}
                settings={settings}
                approachingHazards={approachingHazards}
                nearbyOsmFeatures={nearbyOsmFeatures}
                onTriggerRecordHazard={handleTriggerRecordHazard}
                onTriggerAddSign={handleTriggerAddSign}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            </div>

            {/* Interactive OpenStreetMap on Desktop */}
            <div className="lg:col-span-7 h-full min-h-[550px] flex flex-col">
              <MapView
                key="split-map"
                gps={gps}
                hazards={activeHazards}
                osmFeatures={allOsmFeatures}
                osmFeatureVisibility={settings.osmFeatures}
                onToggleOsmFeatureVisibility={handleToggleOsmFeatureVisibility}
                onAddHazardAtLocation={handleAddHazardAtLocation}
                onAddSignAtLocation={handleAddSignAtLocation}
                onSaveHazard={(h) => handleSaveHazard(h, Boolean(currentUser))}
                onEditHazard={handleEditHazard}
                onDeleteHazard={handleDeleteHazard}
                onDeleteOsmFeature={handleDeleteSign}
                onUpdateHazardPosition={handleUpdateHazardPosition}
                onUpdateHazardHeading={handleUpdateHazardHeading}
                theme={settings.theme}
              />
            </div>
          </div>
        )}

        {/* FULL COCKPIT VIEW */}
        {activeTab === 'cockpit' && (
          <div className="flex-1 max-w-3xl w-full mx-auto flex flex-col h-full">
            <CockpitView
              roadInfo={roadInfo}
              gps={gps}
              settings={settings}
              approachingHazards={approachingHazards}
              nearbyOsmFeatures={nearbyOsmFeatures}
              onTriggerRecordHazard={handleTriggerRecordHazard}
              onTriggerAddSign={handleTriggerAddSign}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          </div>
        )}

        {/* FULL MAP VIEW */}
        {activeTab === 'map' && (
          <div className="flex-1 w-full h-[calc(100vh-140px)] min-h-[550px] flex flex-col">
            <MapView
              key="full-map"
              gps={gps}
              hazards={activeHazards}
              osmFeatures={allOsmFeatures}
              osmFeatureVisibility={settings.osmFeatures}
              onToggleOsmFeatureVisibility={handleToggleOsmFeatureVisibility}
              onAddHazardAtLocation={handleAddHazardAtLocation}
              onAddSignAtLocation={handleAddSignAtLocation}
              onSaveHazard={(h) => handleSaveHazard(h, Boolean(currentUser))}
              onEditHazard={handleEditHazard}
              onDeleteHazard={handleDeleteHazard}
              onDeleteOsmFeature={handleDeleteSign}
              onUpdateHazardPosition={handleUpdateHazardPosition}
              onUpdateHazardHeading={handleUpdateHazardHeading}
              theme={settings.theme}
            />
          </div>
        )}

        {/* HAZARDS LIST VIEW */}
        {activeTab === 'list' && (
          <div className="flex-1 max-w-4xl w-full mx-auto h-full">
            <HazardList
              hazards={activeHazards}
              onEdit={handleEditHazard}
              onDelete={handleDeleteHazard}
              settings={settings}
              user={currentUser}
              filterMode={filterMode}
              onChangeFilterMode={setFilterMode}
              onSyncLocalToCloud={handleSyncLocalToCloud}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              localCount={localHazards.length}
            />
          </div>
        )}
      </main>

      {/* 3. Mobile Bottom Navigation Bar */}
      <nav
        className={`lg:hidden border-t px-2 py-2 flex items-center justify-around select-none shrink-0 ${
          isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'
        }`}
      >
        <button
          type="button"
          onClick={() => setActiveTab('cockpit')}
          className={`flex-1 py-2 flex flex-col items-center gap-1 rounded-2xl text-xs font-black transition-colors ${
            activeTab === 'cockpit' || activeTab === 'split'
              ? 'text-red-500'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <span className="text-xl">🚘</span>
          <span>Műszerfal</span>
        </button>

        <button
          type="button"
          onClick={handleTriggerRecordHazard}
          className="p-3 -mt-6 bg-gradient-to-r from-red-600 to-rose-600 rounded-full shadow-lg shadow-red-600/40 text-white flex items-center justify-center border-2 border-white animate-pulse"
          title="Úthiba rögzítése"
        >
          <span className="text-xl">⚠️</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('map')}
          className={`flex-1 py-2 flex flex-col items-center gap-1 rounded-2xl text-xs font-black transition-colors ${
            activeTab === 'map' ? 'text-blue-500' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <span className="text-xl">🗺️</span>
          <span>Térkép</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-2 flex flex-col items-center gap-1 rounded-2xl text-xs font-black transition-colors ${
            activeTab === 'list' ? 'text-amber-500' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <span className="text-xl">📋</span>
          <span>Hibák ({activeHazards.length})</span>
        </button>
      </nav>

      {/* 4. Hazard Recording / Editing Modal */}
      <HazardModal
        isOpen={isHazardModalOpen}
        onClose={() => setIsHazardModalOpen(false)}
        onSave={handleSaveHazard}
        onDelete={handleDeleteHazard}
        initialHazard={modalInitialHazard}
        isEditing={isEditingHazard}
        user={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* 5. Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        hazards={activeHazards}
        onImportHazards={(newHazards) => setLocalHazards(newHazards)}
        onRefreshOnlineOsm={async () => {
          showToast('Valós online OSM adatok lekérése a körzetből...');
          await fetchOnlineOsm(gps.latitude, gps.longitude, true);
          showToast(`✅ OSM adatok frissítve (${osmFeatures.length} valós elem a körzetben)!`);
        }}
        isRefreshingOsm={isRefreshingOsm}
        osmFeatureCount={osmFeatures.length}
      />

      {/* 6. Auth Modal (Registration & Login with Email / Google) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        isDark={isDark}
      />

      {/* 7. Admin Panel Modal (Moderation, Verification, Global Hazard Control) */}
      <AdminPanelModal
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        isDark={isDark}
        user={currentUser}
        hazards={cloudHazards}
        onSelectHazard={(hazard) => {
          setGps((prev) => ({
            ...prev,
            latitude: hazard.latitude,
            longitude: hazard.longitude,
            heading: hazard.heading,
          }));
          setActiveTab('map');
        }}
      />

      {/* 8. Traffic Sign Recording Modal */}
      <SignModal
        isOpen={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        onSaveSign={handleSaveSign}
        onDeleteSign={handleDeleteSign}
        userSigns={userSigns}
        gps={gps}
        roadInfo={roadInfo}
      />
    </div>
  );
}
