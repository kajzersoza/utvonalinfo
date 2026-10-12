import React from 'react';
import { RoadInfo, GPSState, RoadHazard, AppSettings, OSMFeature } from '../types';
import { getCardinalDirectionShort } from '../services/geoService';
import { getHazardNameHungarian } from '../services/speechService';
import {
  AlertOctagon,
  Compass,
  Gauge,
  ArrowUp,
} from 'lucide-react';

interface CockpitViewProps {
  roadInfo: RoadInfo;
  gps: GPSState;
  settings: AppSettings;
  approachingHazards: { hazard: RoadHazard; distance: number }[];
  nearbyOsmFeatures?: { feature: OSMFeature; distance: number }[];
  onTriggerRecordHazard: () => void;
  onTriggerAddSign: () => void;
  onOpenSettings: () => void;
}

export const CockpitView: React.FC<CockpitViewProps> = ({
  roadInfo,
  gps,
  settings,
  approachingHazards,
  nearbyOsmFeatures = [],
  onTriggerRecordHazard,
  onTriggerAddSign,
}) => {
  const { displayOptions, theme } = settings;
  const isDark = theme === 'dark';

  const isHighway = roadInfo.roadNumber.toUpperCase().startsWith('M');
  const activeWarning = approachingHazards.length > 0 ? approachingHazards[0] : null;

  // Total directional lanes in the driver's travel direction
  const directionalLanes = Math.max(1, roadInfo.lanes || 1);

  // If a hazard is approaching, determine which lane index it falls on (1-indexed)
  const targetHazardLane = activeWarning
    ? Math.min(
        directionalLanes,
        Math.max(
          1,
          activeWarning.hazard.laneNumber ||
            (activeWarning.hazard.lateralPosition === 'left'
              ? 1
              : activeWarning.hazard.lateralPosition === 'right'
              ? directionalLanes
              : Math.ceil(directionalLanes / 2))
        )
      )
    : null;

  // -------------------------------------------------------------
  // Speed limit & City Limit (Várostábla) calculations
  // -------------------------------------------------------------
  const approachingSpeedSign = nearbyOsmFeatures.find(
    (f) =>
      (f.feature.type === 'traffic_sign' && f.feature.speedLimit) ||
      (f.feature.type === 'city_limit' && f.feature.speedLimit)
  );

  const approachingCityLimit = nearbyOsmFeatures.find(
    (f) => f.feature.type === 'city_limit'
  );

  // Active speed limit: from approaching sign, or OSM roadInfo maxspeed, or standard Hungarian defaults
  const activeSpeedLimit =
    approachingSpeedSign?.feature.speedLimit ||
    roadInfo.maxspeed ||
    (isHighway ? 130 : roadInfo.city ? 50 : 90);

  const isSpeedExceeded = gps.speed > activeSpeedLimit + 3;

  // -------------------------------------------------------------
  // Single place for road number:
  // "az út számát csak egy helyen jelezd, az utca helyén ha nincs utca"
  // -------------------------------------------------------------
  const rawStreet = (roadInfo.roadName || '').trim();
  const rawRoadNumber = (roadInfo.roadNumber || '').trim();

  const isGenericOrHighway =
    !rawStreet ||
    rawStreet === 'Jelenlegi útszakasz keresése...' ||
    rawStreet === 'Névtelen út' ||
    rawStreet === 'Névtelen út / Nyomvonal' ||
    rawStreet.toLowerCase() === rawRoadNumber.toLowerCase() ||
    (rawRoadNumber &&
      rawStreet.toLowerCase().includes(rawRoadNumber.toLowerCase()) &&
      (rawStreet.toLowerCase().includes('autópálya') || rawStreet.toLowerCase().includes('főút')));

  const showRoadNumWhenNoStreet = displayOptions.showRoadNumberWhenNoStreet !== false;

  let streetRowTitle = '';
  if (!isGenericOrHighway) {
    streetRowTitle = rawStreet;
  } else if (showRoadNumWhenNoStreet && rawRoadNumber) {
    streetRowTitle =
      rawStreet.length > 0 &&
      rawStreet !== 'Névtelen út' &&
      rawStreet !== 'Jelenlegi útszakasz keresése...'
        ? rawStreet
        : isHighway
        ? `${rawRoadNumber} Autópálya`
        : `${rawRoadNumber}. számú főút`;
  } else if (rawStreet) {
    streetRowTitle = rawStreet;
  } else {
    streetRowTitle = 'Országút / Jelenlegi útszakasz';
  }

  return (
    <div className="flex flex-col h-full w-full justify-between gap-3 sm:gap-4 p-2 sm:p-4 select-none">
      {/* 1. Top Driver Info Board: 3 ROWS (1: Postcode above, 2: City / KRESZ sign, 3: Street/Road number below) */}
      {/* Strict fixed height with enlarged typography for mobile and desktop as requested */}
      <div
        className={`rounded-3xl px-3 sm:px-5 py-2 sm:py-2.5 border shadow-xl backdrop-blur-md transition-colors h-32 sm:h-36 max-h-32 sm:max-h-36 shrink-0 flex items-center justify-between gap-2.5 sm:gap-3 overflow-hidden ${
          isDark
            ? 'bg-zinc-900/90 border-zinc-800 text-white'
            : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Left: 3-Row Layout (Postcode -> City/KRESZ sign -> Street/Road) */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5 overflow-hidden">
          {/* 1. SOR: Irányítószám (Postcode) felül - MOBILON IS NAGYOBB BETŰKKEL */}
          <div className="flex items-center text-sm sm:text-base md:text-lg font-mono font-bold tracking-wider text-amber-500/95 dark:text-amber-400 leading-none overflow-hidden shrink-0">
            {displayOptions.showPostcode !== false && roadInfo.postcode ? (
              <span className="truncate flex items-center gap-1.5">
                <span className="text-sm sm:text-base">📮</span>
                <span className="tracking-widest font-black text-sm sm:text-base md:text-lg">{roadInfo.postcode}</span>
              </span>
            ) : (
              <span className="text-xs sm:text-sm text-zinc-400 font-mono tracking-wider uppercase font-semibold">
                GPS ÚTINFO
              </span>
            )}
          </div>

          {/* 2. SOR: Település neve - KRESZ tábla ha van az OSM-ben, sima szöveg ha nincs - MOBILON IS NAGYOBB BETŰKKEL */}
          {displayOptions.showCity && (
            <div className="flex items-center overflow-hidden my-0.5 shrink-0">
              {displayOptions.showCityLimitSign !== false &&
              (approachingCityLimit || roadInfo.isCityLimit) ? (
                /* Magyar KRESZ Helységnévtábla: fehér alapon fekete keret, fekete vastag betűk */
                <div
                  className="inline-flex items-center px-3 py-1 rounded-[4px] bg-white border-2 sm:border-[2.5px] border-black text-black shadow-md shrink-0 max-w-full"
                  title="KRESZ Helységnévtábla (Lakott terület - Megengedett legnagyobb sebesség: 50 km/h)"
                >
                  <span className="font-black text-base sm:text-lg md:text-xl lg:text-2xl tracking-wider uppercase font-sans text-black leading-none truncate">
                    {approachingCityLimit?.feature.cityLimitName ||
                      roadInfo.cityLimitName ||
                      roadInfo.city ||
                      'TELEPÜLÉS'}
                  </span>
                </div>
              ) : (
                /* Sima településnév kiírás ha nincs tábla az OSM-ben */
                <span className="text-2xl sm:text-3xl md:text-4xl font-black text-amber-400 tracking-tight leading-none truncate">
                  {roadInfo.city || 'Helymeghatározás...'}
                </span>
              )}
            </div>
          )}

          {/* 3. SOR: Alatta az utca ill. út száma - MOBILON IS NAGYOBB BETŰKKEL */}
          {displayOptions.showStreet && (
            <div className="flex items-baseline gap-2 overflow-hidden shrink-0">
              <h1 className="font-extrabold text-base sm:text-lg md:text-xl lg:text-2xl tracking-tight leading-snug truncate">
                {streetRowTitle}
              </h1>
              {roadInfo.houseNumber && !isGenericOrHighway && (
                <span className="text-base sm:text-lg md:text-xl font-black text-cyan-400 shrink-0">
                  {roadInfo.houseNumber}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Speed limit sign placed on the right side of the city card */}
        {displayOptions.showSpeedLimit !== false && (
          <div className="shrink-0 flex items-center justify-end pl-2">
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white border-4 sm:border-[5px] border-red-600 flex flex-col items-center justify-center shadow-lg relative select-none transition-transform ${
                isSpeedExceeded ? 'ring-4 ring-red-500/80 scale-105 animate-pulse' : ''
              }`}
              title={`Sebességkorlátozás: ${activeSpeedLimit} km/h${isSpeedExceeded ? ' - Sebességtúllépés!' : ''}`}
            >
              <span className="text-black font-black text-2xl sm:text-3xl font-mono leading-none tracking-tight">
                {activeSpeedLimit}
              </span>
              <span className="text-[9px] sm:text-[10px] font-black text-zinc-600 leading-none -mt-0.5">
                km/h
              </span>

              {/* Distance badge if approaching an ahead speed sign */}
              {approachingSpeedSign && (
                <span className="absolute -bottom-2 bg-red-600 text-white font-mono text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-md leading-none">
                  {Math.round(approachingSpeedSign.distance)}m
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. Permanent Fixed-Height HUD Strip for OSM Features (Zero layout shift / h-12 sm:h-14) */}
      <div className="w-full h-12 sm:h-14 max-h-12 sm:max-h-14 flex items-center justify-between gap-2 shrink-0 overflow-hidden">
        <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full h-full">
          {[
            {
              id: 'crossing',
              icon: '🚶',
              label: 'Gyalogátkelőhely',
              isEnabled: settings.osmFeatures.showCrossings,
              match: settings.osmFeatures.showCrossings
                ? nearbyOsmFeatures.find((f) => f.feature.type === 'crossing')
                : undefined,
              activeColor: 'bg-blue-600/35 border-blue-400 text-blue-300 ring-2 ring-blue-500/50',
              badgeColor: 'bg-blue-600 text-white',
            },
            {
              id: 'traffic_signals',
              icon: '🚦',
              label: 'Jelzőlámpa',
              isEnabled: settings.osmFeatures.showTrafficSignals,
              match: settings.osmFeatures.showTrafficSignals
                ? nearbyOsmFeatures.find((f) => f.feature.type === 'traffic_signals')
                : undefined,
              activeColor: 'bg-emerald-600/35 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/50',
              badgeColor: 'bg-emerald-600 text-white',
            },
            {
              id: 'railway',
              icon: '🚂',
              label: 'Vasúti átjáró',
              isEnabled: settings.osmFeatures.showRailways,
              match: settings.osmFeatures.showRailways
                ? nearbyOsmFeatures.find((f) => f.feature.type === 'railway')
                : undefined,
              activeColor: 'bg-amber-600/35 border-amber-400 text-amber-300 ring-2 ring-amber-500/50',
              badgeColor: 'bg-amber-500 text-black',
            },
            {
              id: 'traffic_sign',
              icon: approachingCityLimit ? '🏙️' : '🛑',
              label: approachingCityLimit ? 'Településhatár tábla' : 'Közlekedési tábla',
              isEnabled:
                settings.osmFeatures.showTrafficSigns || settings.osmFeatures.showCityLimits !== false,
              match:
                (settings.osmFeatures.showTrafficSigns
                  ? nearbyOsmFeatures.find((f) => f.feature.type === 'traffic_sign')
                  : undefined) ||
                (settings.osmFeatures.showCityLimits !== false
                  ? nearbyOsmFeatures.find((f) => f.feature.type === 'city_limit')
                  : undefined),
              activeColor: 'bg-red-600/35 border-red-400 text-red-300 ring-2 ring-red-500/50',
              badgeColor: 'bg-red-600 text-white',
            },
          ].map((item) => {
            const isActive = !!item.match;
            const dist = item.match ? Math.round(item.match.distance) : null;
            return (
              <div
                key={item.id}
                className={`h-full rounded-2xl border flex items-center justify-center transition-all duration-200 relative select-none ${
                  !item.isEnabled
                    ? 'opacity-15 border-zinc-800 grayscale cursor-not-allowed'
                    : isActive
                    ? `${item.activeColor} shadow-md shadow-black/30 scale-102 animate-pulse`
                    : isDark
                    ? 'bg-zinc-900/40 border-zinc-800/60 opacity-35 grayscale'
                    : 'bg-zinc-200/50 border-zinc-300/60 opacity-40 grayscale'
                }`}
                title={item.isEnabled ? item.label : `${item.label} (Kikapcsolva)`}
              >
                <span className="text-2xl sm:text-3xl leading-none">
                  {item.icon}
                </span>

                {/* Distance Badge if approaching */}
                {isActive && dist !== null && (
                  <span
                    className={`absolute -bottom-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-black font-mono shadow-sm leading-none ${item.badgeColor}`}
                  >
                    {dist}m
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Lane Information Display (Sáv Információ) with STRICT FIXED HEIGHT (h-[160px] sm:h-[175px]) */}
      {displayOptions.showLaneInfo && (
        <div
          className={`rounded-3xl p-3 sm:p-4 border shadow-xl flex flex-col justify-center transition-colors h-[160px] sm:h-[175px] max-h-[160px] sm:max-h-[175px] shrink-0 overflow-hidden ${
            activeWarning
              ? 'bg-zinc-950 border-red-500/80 ring-2 ring-red-500/30'
              : isDark
              ? 'bg-zinc-900/80 border-zinc-800 text-white'
              : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          {/* ASPHALT ROAD & LANE DISPLAY */}
          <div className="bg-zinc-950 p-2 sm:p-3 rounded-2xl border-2 border-zinc-800 flex flex-col justify-center h-full relative overflow-hidden">
            {/* Outer road edge markings */}
            <div className="absolute top-1 left-2 right-2 h-0.5 bg-zinc-600" />
            <div className="absolute bottom-1 left-2 right-2 h-0.5 bg-zinc-600" />

            {/* Lane Columns */}
            <div className="grid grid-flow-col auto-cols-fr gap-2 sm:gap-3 relative z-10 py-0.5 h-full items-center">
              {Array.from({ length: directionalLanes }, (_, idx) => {
                const laneNumber = idx + 1;
                const isAffectedLane = activeWarning && targetHazardLane === laneNumber;

                if (isAffectedLane) {
                  const hazard = activeWarning.hazard;
                  const hazardHungarian = getHazardNameHungarian(hazard.hazardType).toUpperCase();
                  const lateralText =
                    hazard.lateralPosition === 'left'
                      ? '◀ BAL SZÉL'
                      : hazard.lateralPosition === 'right'
                      ? 'JOBB SZÉL ▶'
                      : '⏺ KÖZÉPEN';

                  return (
                    <div
                      key={laneNumber}
                      className="h-full rounded-2xl border-2 border-red-400 bg-gradient-to-b from-red-600 via-rose-700 to-red-900 text-white shadow-2xl shadow-red-600/50 flex flex-col items-center justify-between p-1.5 sm:p-2 animate-pulse overflow-hidden"
                    >
                      <div className="w-full flex items-center justify-between text-[11px] font-black border-b border-white/20 pb-0.5">
                        <span className="bg-black/40 px-1.5 py-0.5 rounded">{laneNumber}. SÁV</span>
                        <span className="bg-yellow-300 text-black px-1.5 py-0.5 rounded text-[10px] font-black">
                          {Math.round(activeWarning.distance)} m
                        </span>
                      </div>

                      <div className="text-center my-0.5">
                        <div className="text-xl sm:text-2xl leading-none">
                          {hazard.hazardType === 'pothole'
                            ? '🕳️'
                            : hazard.hazardType === 'manhole'
                            ? '🔘'
                            : hazard.hazardType === 'rutting'
                            ? '〰️'
                            : hazard.hazardType === 'crack'
                            ? '⚡'
                            : '⚠️'}
                        </div>
                        <div className="font-black text-[11px] sm:text-xs tracking-wide leading-tight truncate">
                          {hazardHungarian}
                        </div>
                      </div>

                      <div className="w-full text-center bg-black/50 py-0.5 px-1 rounded-lg text-[10px] font-black text-yellow-300 tracking-wider">
                        {lateralText}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={laneNumber}
                    className={`h-full rounded-2xl border-2 flex flex-col items-center justify-between p-1.5 sm:p-2 transition-all overflow-hidden ${
                      activeWarning
                        ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400'
                        : 'border-dashed border-zinc-700 bg-zinc-900/50 text-zinc-300'
                    }`}
                  >
                    <div className="w-full flex items-center justify-between text-[11px] font-mono font-bold text-zinc-400">
                      <span>{laneNumber}. sáv</span>
                      {activeWarning && (
                        <span className="text-[10px] text-emerald-400 font-bold">✓ Szabad</span>
                      )}
                    </div>

                    <div className="flex flex-col items-center my-auto">
                      <ArrowUp className="w-5 h-5 stroke-[3] text-white opacity-80" />
                    </div>

                    <div className="text-[10px] text-zinc-500 font-medium">
                      {laneNumber === 1
                        ? 'Belső'
                        : laneNumber === directionalLanes
                        ? 'Külső'
                        : 'Középső'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Edge labels */}
            <div className="flex justify-between text-[9px] text-zinc-500 font-mono px-2">
              <span>◀ Bal padka</span>
              <span>Jobb padka ▶</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Speed & Heading HUD with STRICT FIXED HEIGHT (h-28 sm:h-32) */}
      <div className="grid grid-cols-2 gap-3 shrink-0">
        {/* Speedometer */}
        {displayOptions.showSpeed && (
          <div
            className={`rounded-3xl p-4 border shadow-xl flex flex-col items-center justify-center text-center h-28 sm:h-32 max-h-28 sm:max-h-32 shrink-0 overflow-hidden ${
              isDark
                ? 'bg-zinc-900/80 border-zinc-800 text-white'
                : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1 mb-0.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              Sebesség
            </div>
            <div className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-cyan-400">
              {Math.round(gps.speed || 0)}
            </div>
            <div className="text-[11px] font-bold text-zinc-400">km/h</div>
          </div>
        )}

        {/* Compass & Direction */}
        {displayOptions.showHeading && (
          <div
            className={`rounded-3xl p-4 border shadow-xl flex flex-col items-center justify-center text-center h-28 sm:h-32 max-h-28 sm:max-h-32 shrink-0 overflow-hidden ${
              isDark
                ? 'bg-zinc-900/80 border-zinc-800 text-white'
                : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1 mb-0.5">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              Irány
            </div>
            <div className="text-2xl sm:text-4xl font-black font-mono tracking-tight text-amber-400">
              {Math.round(gps.heading || 0)}°
            </div>
            <div className="text-xs font-bold text-zinc-300">
              {getCardinalDirectionShort(gps.heading || 0)}
            </div>
          </div>
        )}
      </div>

      {/* 5. Driver Quick-Record Buttons: Split into 2 parts (Left: Úthiba, Right: Tábla) with STRICT FIXED HEIGHT (h-16 sm:h-20) */}
      <div className="pt-0.5 shrink-0 h-16 sm:h-20 max-h-16 sm:max-h-20 grid grid-cols-2 gap-2 sm:gap-3">
        {/* Left: Original Hazard Recording */}
        <button
          type="button"
          onClick={onTriggerRecordHazard}
          className="h-full rounded-2xl sm:rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black shadow-xl shadow-red-600/30 border-2 border-white/30 flex items-center justify-center gap-1.5 sm:gap-3 transition-transform active:scale-97 cursor-pointer px-2 sm:px-3 overflow-hidden"
          title="Úthiba rögzítése (Kátyú, csatornafedél, úthiba)"
        >
          <AlertOctagon className="w-5 h-5 sm:w-8 sm:h-8 text-white animate-bounce shrink-0" />
          <div className="flex flex-col items-start leading-tight text-left min-w-0">
            <span className="tracking-tight drop-shadow-md text-xs sm:text-base md:text-lg font-black truncate w-full">
              ÚTHIBA RÖGZÍTÉS
            </span>
            <span className="text-[10px] sm:text-xs opacity-85 font-medium hidden sm:inline">
              Kátyú, hiba
            </span>
          </div>
        </button>

        {/* Right: Traffic Signs Recording (Speed limit / End, City limit start / end) */}
        <button
          type="button"
          onClick={onTriggerAddSign}
          className="h-full rounded-2xl sm:rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-black shadow-xl shadow-indigo-600/30 border-2 border-white/30 flex items-center justify-center gap-1.5 sm:gap-3 transition-transform active:scale-97 cursor-pointer px-2 sm:px-3 overflow-hidden"
          title="Táblák hozzáadása (Sebességkorlátozó, vége, település kezdete/vége)"
        >
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white border-2 sm:border-3 border-red-600 flex items-center justify-center font-black text-red-600 text-[10px] sm:text-xs shadow-sm shrink-0">
            50
          </div>
          <div className="flex flex-col items-start leading-tight text-left min-w-0">
            <span className="tracking-tight drop-shadow-md text-xs sm:text-base md:text-lg font-black truncate w-full">
              TÁBLA RÖGZÍTÉS
            </span>
            <span className="text-[10px] sm:text-xs opacity-85 font-medium hidden sm:inline">
              Sebesség, Város
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};
