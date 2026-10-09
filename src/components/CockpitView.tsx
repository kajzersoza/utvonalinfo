import React from 'react';
import { RoadInfo, GPSState, RoadHazard, AppSettings } from '../types';
import { getCardinalDirection, getCardinalDirectionShort } from '../services/geoService';
import {
  AlertOctagon,
  Volume2,
  VolumeX,
  Compass,
  Gauge,
  MapPin,
  ShieldAlert,
  ArrowUp,
  RotateCcw,
} from 'lucide-react';

interface CockpitViewProps {
  roadInfo: RoadInfo;
  gps: GPSState;
  settings: AppSettings;
  approachingHazards: { hazard: RoadHazard; distance: number }[];
  onTriggerRecordHazard: () => void;
  onToggleVoice: () => void;
  onOpenSettings: () => void;
}

export const CockpitView: React.FC<CockpitViewProps> = ({
  roadInfo,
  gps,
  settings,
  approachingHazards,
  onTriggerRecordHazard,
  onToggleVoice,
}) => {
  const { displayOptions, voiceOptions, theme } = settings;
  const isDark = theme === 'dark';

  // Road number badge style (Hungarian highway vs main road badge style)
  const isHighway = roadInfo.roadNumber.toUpperCase().startsWith('M');

  return (
    <div className="flex flex-col h-full w-full justify-between gap-4 p-3 sm:p-5 select-none">
      {/* 1. Approaching Hazard Alert Bar (High Priority Driver Warning) */}
      {approachingHazards.length > 0 && (
        <div className="animate-pulse bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white p-3.5 sm:p-4 rounded-3xl shadow-xl flex items-center justify-between gap-3 border-2 border-white/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-black/30 rounded-2xl">
              <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8 text-yellow-300" />
            </div>
            <div>
              <div className="font-black text-sm sm:text-base tracking-wide flex items-center gap-2">
                <span>VIGYÁZAT! ÚTHIBA KÖZELBEN</span>
                <span className="px-2 py-0.5 bg-black/40 text-yellow-300 rounded-lg text-xs font-mono">
                  {Math.round(approachingHazards[0].distance)} méter
                </span>
              </div>
              <div className="text-xs sm:text-sm font-semibold opacity-95">
                {approachingHazards[0].hazard.hazardType.toUpperCase()} a{' '}
                <span className="underline decoration-yellow-300 decoration-2">
                  {approachingHazards[0].hazard.lateralPosition === 'left'
                    ? 'BAL oldalon'
                    : approachingHazards[0].hazard.lateralPosition === 'right'
                    ? 'JOBB oldalon'
                    : 'KÖZÉPEN'}
                </span>
                {approachingHazards[0].hazard.notes && ` • "${approachingHazards[0].hazard.notes}"`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Top Driver Info Board (Location, Street, Road Number, Postcode) */}
      <div
        className={`rounded-3xl p-5 sm:p-7 border shadow-xl backdrop-blur-md transition-colors ${
          isDark
            ? 'bg-zinc-900/90 border-zinc-800 text-white'
            : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Top Badges: Road Number + Postal Code */}
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <div className="flex items-center gap-2">
            {displayOptions.showRoadNumber && roadInfo.roadNumber && (
              <div
                className={`px-3.5 py-1.5 rounded-xl font-black text-sm sm:text-base tracking-wider shadow-md ${
                  isHighway
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                    : 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                }`}
              >
                {roadInfo.roadNumber}
              </div>
            )}

            {displayOptions.showPostcode && roadInfo.postcode && (
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                  isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                {roadInfo.postcode}
              </span>
            )}
          </div>

          {/* Quick Audio Mute / Unmute Button */}
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

        {/* Street Name (Big prominent Driver typography) */}
        {displayOptions.showStreet && (
          <div className="mt-1">
            <h1
              className="font-black text-2xl sm:text-4xl md:text-5xl tracking-tight leading-tight line-clamp-2"
              style={{ letterSpacing: '-0.02em' }}
            >
              {roadInfo.roadName || 'Jelenlegi útvonal keresése...'}
            </h1>
          </div>
        )}

        {/* Settlement / City */}
        {displayOptions.showCity && (
          <div className="flex items-center gap-2 mt-2 text-sm sm:text-lg font-bold text-zinc-400">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 shrink-0" />
            <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
              {roadInfo.city || 'Helymeghatározás folyamatban...'}
            </span>
          </div>
        )}
      </div>

      {/* 3. Lane Information Display (Sáv Infó) & Speed / Compass Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
        {/* Visual Lane Graphic (Sávok száma és felosztása) */}
        {displayOptions.showLaneInfo && (
          <div
            className={`md:col-span-7 rounded-3xl p-4 sm:p-5 border shadow-xl flex flex-col justify-between ${
              isDark
                ? 'bg-zinc-900/80 border-zinc-800 text-white'
                : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black tracking-wider uppercase text-zinc-400">
                Sáv Információ
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {roadInfo.lanes || 2} Forgalmi Sáv
              </span>
            </div>

            {/* Asphalt Lane Rendering with road lines */}
            <div className="bg-zinc-950 p-3 sm:p-4 rounded-2xl border-2 border-zinc-800 flex flex-col justify-center min-h-[90px] relative overflow-hidden">
              {/* Outer asphalt edge lines */}
              <div className="absolute top-1 left-2 right-2 h-0.5 bg-zinc-600" />
              <div className="absolute bottom-1 left-2 right-2 h-0.5 bg-zinc-600" />

              {/* Lane Columns */}
              <div className="grid grid-flow-col auto-cols-fr gap-2 relative z-10 py-1">
                {Array.from({ length: roadInfo.lanes || 2 }, (_, idx) => {
                  const laneNumber = idx + 1;
                  const isCenterLane = laneNumber === Math.ceil((roadInfo.lanes || 2) / 2);
                  return (
                    <div
                      key={laneNumber}
                      className={`h-16 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                        isCenterLane
                          ? 'border-cyan-500/80 bg-cyan-950/40 text-cyan-300 shadow-md shadow-cyan-900/20'
                          : 'border-dashed border-zinc-700 bg-zinc-900/50 text-zinc-400'
                      }`}
                    >
                      <ArrowUp className="w-5 h-5 text-white stroke-[3] mb-0.5" />
                      <span className="text-[11px] font-mono font-black">
                        {laneNumber}. sáv
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Dashed white road markings between lanes */}
              <div className="mt-1 flex justify-between text-[10px] text-zinc-500 font-mono px-2">
                <span>◀ Bal padka</span>
                <span>Jobb padka ▶</span>
              </div>
            </div>
          </div>
        )}

        {/* Speed & Heading Cockpit Meters */}
        <div
          className={`${
            displayOptions.showLaneInfo ? 'md:col-span-5' : 'md:col-span-12'
          } grid grid-cols-2 gap-3`}
        >
          {/* Speedometer */}
          {displayOptions.showSpeed && (
            <div
              className={`rounded-3xl p-4 border shadow-xl flex flex-col items-center justify-center text-center ${
                isDark
                  ? 'bg-zinc-900/80 border-zinc-800 text-white'
                  : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                Sebesség
              </div>
              <div className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-cyan-400">
                {Math.round(gps.speed || 0)}
              </div>
              <div className="text-xs font-bold text-zinc-400 mt-0.5">km/h</div>
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
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                Irány
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-400 flex items-center gap-1">
                <span>{Math.round(gps.heading || 0)}°</span>
              </div>
              <div className="text-xs font-bold text-zinc-300 mt-0.5">
                {getCardinalDirectionShort(gps.heading || 0)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Giant "ÚTHIBA RÖGZÍTÉSE" Button (Quick Action Driver Interface) */}
      {/* Designed specifically for drivers: oversized, high-contrast, instant feedback */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onTriggerRecordHazard}
          className="w-full py-6 sm:py-8 px-6 rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-2xl sm:text-3xl md:text-4xl shadow-2xl shadow-red-600/40 border-2 border-white/30 flex items-center justify-center gap-4 transition-transform active:scale-97 cursor-pointer"
        >
          <AlertOctagon className="w-9 h-9 sm:w-11 sm:h-11 text-white animate-bounce shrink-0" />
          <span className="tracking-tight text-center drop-shadow-md">
            ÚTHIBA RÖGZÍTÉSE
          </span>
        </button>
        <p className="text-center text-xs sm:text-sm text-zinc-400 font-medium mt-2">
          Megnyomáskor azonnal menti a pontos GPS koordinátát és haladási irányt
        </p>
      </div>
    </div>
  );
};
