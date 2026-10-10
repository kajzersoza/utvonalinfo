import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  RoadHazard,
  RoadInfo,
  GPSState,
  AppSettings,
  OSMFeature,
  OSMFeatureVisibility,
} from './types';
import {
  loadSettings,
  saveSettings,
  loadHazards,
  saveHazards,
} from './services/storageService';
import { fetchOSMRoadInfo, calculateDistanceMeters, SAMPLE_OSM_FEATURES } from './services/osmService';
import { speechService } from './services/speechService';
import {
  SIMULATED_ROUTE_M7,
  SIMULATED_ROUTE_CITY,
  SIMULATED_ROUTE_HIGHWAY8,
  calculateBearing,
  isHazardAheadInDirection,
} from './services/geoService';

import { Header } from './components/Header';
import { CockpitView } from './components/CockpitView';
import { MapView } from './components/MapView';
import { HazardList } from './components/HazardList';
import { HazardModal } from './components/HazardModal';
import { SettingsModal } from './components/SettingsModal';
import { SimulatorControls } from './components/SimulatorControls';

export default function App() {
  // 1. Persistent State
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [hazards, setHazards] = useState<RoadHazard[]>(() => loadHazards());
  const [osmFeatures, setOsmFeatures] = useState<OSMFeature[]>(SAMPLE_OSM_FEATURES);

  // 2. Navigation State
  const [activeTab, setActiveTab] = useState<'split' | 'cockpit' | 'map' | 'list'>('split');

  // 3. Cockpit & GPS State
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

  // 4. Modals State
  const [isHazardModalOpen, setIsHazardModalOpen] = useState(false);
  const [modalInitialHazard, setModalInitialHazard] = useState<Partial<RoadHazard> | null>(null);
  const [isEditingHazard, setIsEditingHazard] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 5. Simulator State
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPlayingSimulation, setIsPlayingSimulation] = useState(false);
  const [activeRouteKey, setActiveRouteKey] = useState<string>('m7');
  const [simStepIndex, setSimStepIndex] = useState(0);
  const [simSpeedMultiplier, setSimSpeedMultiplier] = useState(1);

  // Save settings when changed
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Save hazards when changed
  useEffect(() => {
    saveHazards(hazards);
  }, [hazards]);

  // -------------------------------------------------------------
  // Proximity & Direction Hazard Warning Check
  // -------------------------------------------------------------
  const [approachingHazards, setApproachingHazards] = useState<{
    hazard: RoadHazard;
    distance: number;
  }[]>([]);

  const checkApproachingHazards = useCallback(
    (currentLat: number, currentLon: number, currentHeading: number) => {
      const maxDistance = settings.voiceOptions.hazardWarningDistanceMeters || 200;
      const matches: { hazard: RoadHazard; distance: number }[] = [];

      for (const h of hazards) {
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
          // Announce voice alert
          speechService.announceHazardAlert(h, distance, settings.voiceOptions);
        }
      }

      matches.sort((a, b) => a.distance - b.distance);
      setApproachingHazards(matches);
    },
    [hazards, settings.voiceOptions]
  );

  // -------------------------------------------------------------
  // Nearby OSM Road Features (Crossing, Traffic Signals, Railway, Signs)
  // -------------------------------------------------------------
  const nearbyOsmFeatures = useMemo(() => {
    return osmFeatures
      .map((f) => ({
        feature: f,
        distance: calculateDistanceMeters(gps.latitude, gps.longitude, f.latitude, f.longitude),
      }))
      .filter(({ distance }) => distance <= 350)
      .sort((a, b) => a.distance - b.distance);
  }, [osmFeatures, gps.latitude, gps.longitude]);

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

        // Check approaching hazards
        checkApproachingHazards(latitude, longitude, finalHeading);

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
  }, [isSimulating, settings.highAccuracyGPS, settings.voiceOptions, checkApproachingHazards]);

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

      const simulatedRoad: RoadInfo = {
        roadNumber: pt.roadNumber,
        roadName: pt.roadName,
        houseNumber: pt.houseNumber,
        city: pt.city,
        postcode: pt.postcode,
        lanes: pt.lanes,
        source: 'simulated',
      };
      setRoadInfo(simulatedRoad);

      speechService.announceRoadUpdate(
        prevRoadInfoRef.current,
        simulatedRoad,
        settings.voiceOptions
      );
      prevRoadInfoRef.current = simulatedRoad;

      checkApproachingHazards(pt.lat, pt.lon, pt.heading);
      return nextIdx;
    });
  }, [getSelectedRoute, settings.voiceOptions, checkApproachingHazards]);

  useEffect(() => {
    if (!isSimulating || !isPlayingSimulation) return;

    const intervalMs = Math.max(800, 3200 / simSpeedMultiplier);
    const timer = setInterval(() => {
      advanceSimulationStep();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isSimulating, isPlayingSimulation, simSpeedMultiplier, advanceSimulationStep]);

  // Start Simulation
  const handleStartSimulation = () => {
    setIsSimulating(true);
    setIsPlayingSimulation(true);
    setSimStepIndex(0);
    const route = getSelectedRoute();
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
  };

  const handleStopSimulation = () => {
    setIsSimulating(false);
    setIsPlayingSimulation(false);
    setGps((prev) => ({ ...prev, status: 'locating' }));
  };

  // -------------------------------------------------------------
  // Quick Record Hazard Handler ("ÚTHIBA RÖGZÍTÉSE" button)
  // -------------------------------------------------------------
  const handleTriggerRecordHazard = () => {
    // Capture snapshot of exact current state
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
      lateralPosition: 'right', // default to right lane/edge
      laneNumber: roadInfo.lanes || 2,
      hazardType: 'pothole',
      severity: 'medium',
      timestamp: Date.now(),
    };

    setModalInitialHazard(snapshot);
    setIsEditingHazard(false);
    setIsHazardModalOpen(true);
  };

  // Add Hazard from Map Click with async OSM reverse geocoding
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
        // Fallback to current roadInfo
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
      };

      setModalInitialHazard(snapshot);
      setIsEditingHazard(false);
      setIsHazardModalOpen(true);
    },
    [roadInfo]
  );

  // Edit Existing Hazard
  const handleEditHazard = useCallback((hazard: RoadHazard) => {
    setModalInitialHazard(hazard);
    setIsEditingHazard(true);
    setIsHazardModalOpen(true);
  }, []);

  // Delete Hazard
  const handleDeleteHazard = useCallback((id: string) => {
    setHazards((prev) => prev.filter((h) => h.id !== id));
  }, []);

  // Update Hazard Position (Drag-and-Drop on Map)
  const handleUpdateHazardPosition = useCallback((id: string, lat: number, lon: number) => {
    setHazards((prev) =>
      prev.map((h) => (h.id === id ? { ...h, latitude: lat, longitude: lon } : h))
    );
  }, []);

  // Update Hazard Heading (Rotation on Map)
  const handleUpdateHazardHeading = useCallback((id: string, heading: number) => {
    setHazards((prev) =>
      prev.map((h) => (h.id === id ? { ...h, heading: (heading % 360 + 360) % 360 } : h))
    );
  }, []);

  // Toggle OSM Feature Visibility
  const handleToggleOsmFeatureVisibility = useCallback((key: keyof OSMFeatureVisibility) => {
    setSettings((prev) => ({
      ...prev,
      osmFeatures: {
        ...prev.osmFeatures,
        [key]: !prev.osmFeatures[key],
      },
    }));
  }, []);

  // Save (Create or Update) Hazard
  const handleSaveHazard = useCallback((savedHazard: RoadHazard) => {
    setHazards((prev) => {
      const existingIdx = prev.findIndex((h) => h.id === savedHazard.id);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = savedHazard;
        return next;
      } else {
        return [savedHazard, ...prev];
      }
    });

    // Provide friendly audio feedback
    if (settings.voiceOptions.enabled) {
      speechService.speak(
        `${savedHazard.hazardType} sikeresen rögzítve a ${savedHazard.roadName} szakaszon.`,
        settings.voiceOptions
      );
    }
  }, [settings.voiceOptions]);

  const handleToggleVoice = () => {
    setSettings((prev) => ({
      ...prev,
      voiceOptions: {
        ...prev.voiceOptions,
        enabled: !prev.voiceOptions.enabled,
      },
    }));
  };

  const handleToggleTheme = () => {
    setSettings((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  };

  const isDark = settings.theme === 'dark';

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors font-sans ${
        isDark ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-900'
      }`}
    >
      {/* 1. Header Bar with Sound icon right next to theme toggle */}
      <Header
        settings={settings}
        gps={gps}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleTheme={handleToggleTheme}
        onToggleVoice={handleToggleVoice}
        hazardCount={hazards.length}
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
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            </div>

            {/* Interactive OpenStreetMap on Desktop */}
            <div className="lg:col-span-7 h-full min-h-[550px] flex flex-col">
              <MapView
                key="split-map"
                gps={gps}
                hazards={hazards}
                osmFeatures={osmFeatures}
                osmFeatureVisibility={settings.osmFeatures}
                onToggleOsmFeatureVisibility={handleToggleOsmFeatureVisibility}
                onAddHazardAtLocation={handleAddHazardAtLocation}
                onSaveHazard={handleSaveHazard}
                onEditHazard={handleEditHazard}
                onDeleteHazard={handleDeleteHazard}
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
              hazards={hazards}
              osmFeatures={osmFeatures}
              osmFeatureVisibility={settings.osmFeatures}
              onToggleOsmFeatureVisibility={handleToggleOsmFeatureVisibility}
              onAddHazardAtLocation={handleAddHazardAtLocation}
              onSaveHazard={handleSaveHazard}
              onEditHazard={handleEditHazard}
              onDeleteHazard={handleDeleteHazard}
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
              hazards={hazards}
              onEdit={handleEditHazard}
              onDelete={handleDeleteHazard}
              settings={settings}
            />
          </div>
        )}
      </main>

      {/* 3. Mobile Bottom Navigation Bar (Driver-friendly high contrast) */}
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
          <span>Hibák ({hazards.length})</span>
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
      />

      {/* 5. Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        hazards={hazards}
        onImportHazards={(newHazards) => setHazards(newHazards)}
      />
    </div>
  );
}
