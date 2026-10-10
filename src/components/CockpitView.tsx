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
  onOpenSettings: () => void;
}

export const CockpitView: React.FC<CockpitViewProps> = ({
  roadInfo,
  gps,
  settings,
  approachingHazards,
  nearbyOsmFeatures = [],
  onTriggerRecordHazard,
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

  return (
    <div className="flex flex-col h-full w-full justify-between gap-3 sm:gap-4 p-2 sm:p-4 select-none">
      {/* 1. Top Driver Info Board: Postal code + City in ONE LINE without position icon & larger font */}
      <div
        className={`rounded-3xl p-4 sm:p-6 border shadow-xl backdrop-blur-md transition-colors ${
          isDark
            ? 'bg-zinc-900/90 border-zinc-800 text-white'
            : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Top Badges Row: Road number badge if present */}
        {displayOptions.showRoadNumber && roadInfo.roadNumber && (
          <div className="mb-2">
            <span
              className={`px-3.5 py-1 rounded-xl font-black text-sm sm:text-base tracking-wider shadow-md inline-block ${
                isHighway
                  ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                  : 'bg-emerald-600 text-white ring-2 ring-emerald-400'
              }`}
            >
              {roadInfo.roadNumber}
            </span>
          </div>
        )}

        {/* POSTAL CODE AND CITY IN ONE LINE, NO POSITION ICON, LARGER FONT (User Request) */}
        {displayOptions.showCity && (
          <div className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-amber-400 leading-tight">
            {roadInfo.postcode ? `${roadInfo.postcode} ` : ''}
            {roadInfo.city || 'Helymeghatározás...'}
          </div>
        )}

        {/* Street Name + House Number (menetirány szerinti házszám) */}
        {displayOptions.showStreet && (
          <div className="mt-1 flex items-baseline gap-2 flex-wrap">
            <h1 className="font-extrabold text-xl sm:text-2xl md:text-3xl tracking-tight leading-tight">
              {roadInfo.roadName || 'Jelenlegi útszakasz keresése...'}
            </h1>
            {roadInfo.houseNumber && (
              <span className="text-xl sm:text-2xl md:text-3xl font-black text-cyan-400">
                {roadInfo.houseNumber}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2. Permanent Fixed-Height HUD Strip for OSM Features (Zero layout shift / Sávinfo nem ugrál) */}
      <div className="w-full h-12 sm:h-14 flex items-center justify-between gap-2 shrink-0">
        <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full h-full">
          {[
            {
              id: 'crossing',
              icon: '🚶',
              label: 'Gyalogátkelőhely',
              match: nearbyOsmFeatures.find((f) => f.feature.type === 'crossing'),
              activeColor: 'bg-blue-600/35 border-blue-400 text-blue-300 ring-2 ring-blue-500/50',
              badgeColor: 'bg-blue-600 text-white',
            },
            {
              id: 'traffic_signals',
              icon: '🚦',
              label: 'Jelzőlámpa',
              match: nearbyOsmFeatures.find((f) => f.feature.type === 'traffic_signals'),
              activeColor: 'bg-emerald-600/35 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/50',
              badgeColor: 'bg-emerald-600 text-white',
            },
            {
              id: 'railway',
              icon: '🚂',
              label: 'Vasúti átjáró',
              match: nearbyOsmFeatures.find((f) => f.feature.type === 'railway'),
              activeColor: 'bg-amber-600/35 border-amber-400 text-amber-300 ring-2 ring-amber-500/50',
              badgeColor: 'bg-amber-500 text-black',
            },
            {
              id: 'traffic_sign',
              icon: '🛑',
              label: 'Közlekedési tábla',
              match: nearbyOsmFeatures.find((f) => f.feature.type === 'traffic_sign'),
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
                  isActive
                    ? `${item.activeColor} shadow-md shadow-black/30 scale-102 animate-pulse`
                    : isDark
                    ? 'bg-zinc-900/40 border-zinc-800/60 opacity-30 grayscale'
                    : 'bg-zinc-200/50 border-zinc-300/60 opacity-35 grayscale'
                }`}
                title={item.label}
              >
                {/* Bigger Icon as requested */}
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

      {/* 2. Lane Information Display (Sáv Információ) & Cockpit Warning Graphic */}
      {/* User Request: the redundant text row is completely removed; the lane itself is the warning! */}
      {displayOptions.showLaneInfo && (
        <div
          className={`rounded-3xl p-3 sm:p-4 border shadow-xl flex flex-col justify-center transition-colors ${
            activeWarning
              ? 'bg-zinc-950 border-red-500/80 ring-2 ring-red-500/30'
              : isDark
              ? 'bg-zinc-900/80 border-zinc-800 text-white'
              : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          {/* ASPHALT ROAD & LANE DISPLAY WHERE THE LANE ITSELF IS THE WARNING */}
          <div className="bg-zinc-950 p-2.5 sm:p-4 rounded-2xl border-2 border-zinc-800 flex flex-col justify-center min-h-[140px] sm:min-h-[155px] relative overflow-hidden">
            {/* Outer road edge markings */}
            <div className="absolute top-1 left-2 right-2 h-0.5 bg-zinc-600" />
            <div className="absolute bottom-1 left-2 right-2 h-0.5 bg-zinc-600" />

            {/* Lane Columns */}
            <div className="grid grid-flow-col auto-cols-fr gap-2 sm:gap-3 relative z-10 py-1">
              {Array.from({ length: directionalLanes }, (_, idx) => {
                const laneNumber = idx + 1;
                const isAffectedLane = activeWarning && targetHazardLane === laneNumber;

                if (isAffectedLane) {
                  // THIS LANE IS THE HAZARD WARNING ITSELF!
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
                      className="min-h-[115px] sm:min-h-[125px] rounded-2xl border-2 border-red-400 bg-gradient-to-b from-red-600 via-rose-700 to-red-900 text-white shadow-2xl shadow-red-600/50 flex flex-col items-center justify-between p-2 animate-pulse"
                    >
                      {/* Lane Number & Alert Icon */}
                      <div className="w-full flex items-center justify-between text-[11px] font-black border-b border-white/20 pb-1">
                        <span className="bg-black/40 px-1.5 py-0.5 rounded">{laneNumber}. SÁV</span>
                        <span className="bg-yellow-300 text-black px-1.5 py-0.5 rounded text-[10px] font-black">
                          {Math.round(activeWarning.distance)} m
                        </span>
                      </div>

                      {/* Hazard Type & Emoji in lane */}
                      <div className="text-center my-1">
                        <div className="text-2xl sm:text-3xl leading-none mb-1">
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
                        <div className="font-black text-xs sm:text-sm tracking-wide leading-tight">
                          {hazardHungarian}
                        </div>
                      </div>

                      {/* Lateral Position inside this lane */}
                      <div className="w-full text-center bg-black/50 py-0.5 px-1 rounded-lg text-[10px] sm:text-[11px] font-black text-yellow-300 tracking-wider">
                        {lateralText}
                      </div>
                    </div>
                  );
                }

                // Normal / Safe Lane
                return (
                  <div
                    key={laneNumber}
                    className={`min-h-[115px] sm:min-h-[125px] rounded-2xl border-2 flex flex-col items-center justify-between p-2 transition-all ${
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
                      <ArrowUp className="w-6 h-6 stroke-[3] text-white opacity-80" />
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
            <div className="mt-1 flex justify-between text-[10px] text-zinc-500 font-mono px-2">
              <span>◀ Bal padka</span>
              <span>Jobb padka ▶</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Speed & Heading HUD */}
      <div className="grid grid-cols-2 gap-3">
        {/* Speedometer */}
        {displayOptions.showSpeed && (
          <div
            className={`rounded-3xl p-4 border shadow-xl flex flex-col items-center justify-center text-center ${
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
            className={`rounded-3xl p-4 border shadow-xl flex flex-col items-center justify-center text-center ${
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

      {/* 4. Giant Driver Quick-Record Button: "ÚTHIBA RÖGZÍTÉSE" */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onTriggerRecordHazard}
          className="w-full py-5 sm:py-7 px-6 rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-2xl sm:text-3xl md:text-4xl shadow-2xl shadow-red-600/40 border-2 border-white/30 flex items-center justify-center gap-3 sm:gap-4 transition-transform active:scale-97 cursor-pointer"
        >
          <AlertOctagon className="w-8 h-8 sm:w-10 sm:h-10 text-white animate-bounce shrink-0" />
          <span className="tracking-tight text-center drop-shadow-md">
            ÚTHIBA RÖGZÍTÉSE
          </span>
        </button>
      </div>
    </div>
  );
};
