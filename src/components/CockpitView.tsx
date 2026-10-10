import React from 'react';
import { RoadInfo, GPSState, RoadHazard, AppSettings } from '../types';
import { getCardinalDirectionShort } from '../services/geoService';
import { getHazardNameHungarian } from '../services/speechService';
import {
  AlertOctagon,
  Volume2,
  VolumeX,
  Compass,
  Gauge,
  ArrowUp,
  SlidersHorizontal,
} from 'lucide-react';

interface CockpitViewProps {
  roadInfo: RoadInfo;
  gps: GPSState;
  settings: AppSettings;
  approachingHazards: { hazard: RoadHazard; distance: number }[];
  onTriggerRecordHazard: () => void;
  onToggleVoice: () => void;
  onOpenSettings: () => void;
  onUpdateWarningDistance: (meters: number) => void;
}

const DISTANCE_PRESETS = [100, 200, 300, 500, 1000];

export const CockpitView: React.FC<CockpitViewProps> = ({
  roadInfo,
  gps,
  settings,
  approachingHazards,
  onTriggerRecordHazard,
  onToggleVoice,
  onOpenSettings,
  onUpdateWarningDistance,
}) => {
  const { displayOptions, voiceOptions, theme } = settings;
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
        {/* Top Header Row: Road Number Badge, Warning Distance Selector & Voice Toggle */}
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          {/* Road number badge */}
          <div className="flex items-center gap-2">
            {displayOptions.showRoadNumber && roadInfo.roadNumber && (
              <div
                className={`px-3 py-1 rounded-xl font-black text-sm sm:text-base tracking-wider shadow-md ${
                  isHighway
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                    : 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                }`}
              >
                {roadInfo.roadNumber}
              </div>
            )}

            {/* Quick Warning Distance Selector: "lehessen kiválasztani hogy mennyi távolságra előre figyelmeztessen" */}
            <div className="flex items-center gap-1 bg-zinc-950/70 border border-zinc-700/80 p-1 rounded-xl text-[11px] font-bold">
              <span className="text-zinc-400 px-1.5 hidden sm:inline">Előrejelzés:</span>
              {DISTANCE_PRESETS.map((meters) => (
                <button
                  key={meters}
                  type="button"
                  onClick={() => onUpdateWarningDistance(meters)}
                  className={`px-2 py-0.5 rounded-lg transition-all ${
                    voiceOptions.hazardWarningDistanceMeters === meters
                      ? 'bg-red-600 text-white shadow-sm font-black'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                  title={`Figyelmeztetés ${meters} méterrel a hiba előtt`}
                >
                  {meters}m
                </button>
              ))}
            </div>
          </div>

          {/* Quick Voice Audio Toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleVoice}
              className={`p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-bold ${
                voiceOptions.enabled
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-750'
              }`}
              title={voiceOptions.enabled ? 'Hangos bemondás aktív' : 'Hang némítva'}
            >
              {voiceOptions.enabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">Hangos</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-zinc-400" />
                  <span className="hidden sm:inline">Néma</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* POSTAL CODE AND CITY IN ONE LINE, NO POSITION ICON, LARGER FONT (User Request) */}
        {displayOptions.showCity && (
          <div className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-amber-400 leading-tight">
            {roadInfo.postcode ? `${roadInfo.postcode} ` : ''}
            {roadInfo.city || 'Helymeghatározás...'}
          </div>
        )}

        {/* Street Name (Big prominent Driver typography) */}
        {displayOptions.showStreet && (
          <div className="mt-1">
            <h1 className="font-extrabold text-xl sm:text-2xl md:text-3xl tracking-tight leading-tight line-clamp-2">
              {roadInfo.roadName || 'Jelenlegi útszakasz keresése...'}
            </h1>
          </div>
        )}
      </div>

      {/* 2. Lane Information Display (Sáv Információ) & Cockpit Warning Graphic */}
      {/* User Request: "a figyelmeztetés maga a sáv legyen és abban jelenjen meg a hiba típusa és pozíciója" */}
      {displayOptions.showLaneInfo && (
        <div
          className={`rounded-3xl p-4 sm:p-5 border shadow-xl flex flex-col justify-between transition-colors ${
            activeWarning
              ? 'bg-zinc-950 border-red-500/80 ring-2 ring-red-500/30'
              : isDark
              ? 'bg-zinc-900/80 border-zinc-800 text-white'
              : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          {/* Header of Lane block */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider uppercase text-zinc-400">
                Sáv Információ (Menetirány szerint)
              </span>
              {activeWarning && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-red-600 text-white animate-pulse">
                  VESZÉLY A SÁVODBAN!
                </span>
              )}
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-600/20 text-blue-400 border border-blue-500/30">
              {directionalLanes} Menetirányú Sáv
            </span>
          </div>

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
