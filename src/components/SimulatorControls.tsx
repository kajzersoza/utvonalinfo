import React from 'react';
import { Play, Pause, FastForward, SkipForward, PowerOff, Car } from 'lucide-react';

interface SimulatorControlsProps {
  isSimulating: boolean;
  isPlaying: boolean;
  activeRouteName: string;
  speedMultiplier: number;
  onTogglePlay: () => void;
  onNextStep: () => void;
  onChangeSpeedMultiplier: (mult: number) => void;
  onSelectRoute: (routeName: string) => void;
  onStopSimulation: () => void;
  onStartSimulation: () => void;
}

export const SimulatorControls: React.FC<SimulatorControlsProps> = ({
  isSimulating,
  isPlaying,
  activeRouteName,
  speedMultiplier,
  onTogglePlay,
  onNextStep,
  onChangeSpeedMultiplier,
  onSelectRoute,
  onStopSimulation,
  onStartSimulation,
}) => {
  if (!isSimulating) {
    return (
      <button
        type="button"
        onClick={onStartSimulation}
        className="px-3.5 py-2 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
        title="Teszt vezetés indítása valósághű magyar útvonalon"
      >
        <Car className="w-4 h-4 text-amber-400" />
        <span className="hidden sm:inline">GPS Teszt Szimulátor</span>
        <span className="sm:hidden">Teszt</span>
      </button>
    );
  }

  return (
    <div className="bg-zinc-950/95 border border-amber-500/40 rounded-2xl p-2.5 shadow-2xl flex flex-wrap items-center gap-2 text-white">
      {/* Route Selector */}
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-amber-400 font-bold flex items-center gap-1">
          <Car className="w-3.5 h-3.5" />
          Útvonal:
        </span>
        <select
          value={activeRouteName}
          onChange={(e) => onSelectRoute(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
        >
          <option value="m7">M7 Autópálya (Budapest kivezető)</option>
          <option value="city">Budapest Belváros (Fő utca)</option>
          <option value="route8">8-as Főút (Veszprém felé)</option>
        </select>
      </div>

      {/* Play / Pause */}
      <button
        type="button"
        onClick={onTogglePlay}
        className="p-1.5 rounded-lg bg-amber-500 text-black hover:bg-amber-400 transition-colors"
        title={isPlaying ? 'Szüneteltetés' : 'Lejátszás'}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-black" />}
      </button>

      {/* Step */}
      <button
        type="button"
        onClick={onNextStep}
        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
        title="Következő pontra lépés"
      >
        <SkipForward className="w-4 h-4" />
      </button>

      {/* Speed multiplier */}
      <div className="flex items-center gap-1 text-[11px] font-bold">
        {[1, 2, 4].map((mult) => (
          <button
            key={mult}
            type="button"
            onClick={() => onChangeSpeedMultiplier(mult)}
            className={`px-2 py-0.5 rounded-md border transition-colors ${
              speedMultiplier === mult
                ? 'bg-amber-500 text-black border-amber-400'
                : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white'
            }`}
          >
            {mult}x
          </button>
        ))}
      </div>

      {/* Stop Simulator / Return to Real GPS */}
      <button
        type="button"
        onClick={onStopSimulation}
        className="px-2 py-1 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 text-xs font-bold flex items-center gap-1 transition-colors"
        title="Visszatérés a valós GPS-hez"
      >
        <PowerOff className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Kilépés</span>
      </button>
    </div>
  );
};
