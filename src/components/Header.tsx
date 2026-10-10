import React, { useState } from 'react';
import { AppSettings, GPSState } from '../types';
import {
  Sun,
  Moon,
  Sliders,
  Radio,
  Map as MapIcon,
  LayoutDashboard,
  List,
  Menu,
  X,
  Navigation,
  Car,
  Split,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface HeaderProps {
  settings: AppSettings;
  gps: GPSState;
  activeTab: 'split' | 'cockpit' | 'map' | 'list';
  onChangeTab: (tab: 'split' | 'cockpit' | 'map' | 'list') => void;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
  onToggleVoice: () => void;
  hazardCount: number;
  simulatorControls: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  gps,
  activeTab,
  onChangeTab,
  onOpenSettings,
  onToggleTheme,
  onToggleVoice,
  hazardCount,
  simulatorControls,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isDark = settings.theme === 'dark';

  return (
    <header
      className={`border-b transition-colors px-3 sm:px-6 py-3 select-none ${
        isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Brand & Live GPS Indicator */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
            <Navigation className="w-5 h-5 fill-white" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg sm:text-xl tracking-tight">ÚtInfó</span>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-600 text-white uppercase tracking-wider">
                OSM
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {/* GPS status badge */}
              <span className="flex items-center gap-1 font-semibold text-[11px]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    gps.status === 'simulated'
                      ? 'bg-amber-400 animate-pulse'
                      : gps.status === 'active'
                      ? 'bg-emerald-500'
                      : 'bg-yellow-500 animate-ping'
                  }`}
                />
                <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
                  {gps.status === 'simulated'
                    ? 'Szimulált Útvonal'
                    : gps.status === 'active'
                    ? 'GPS Aktív'
                    : 'GPS Keresés...'}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Center: Desktop Navigation Tabs */}
        <div className="hidden lg:flex items-center bg-zinc-900/60 p-1.5 rounded-2xl border border-zinc-800">
          <button
            type="button"
            onClick={() => onChangeTab('split')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
              activeTab === 'split'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Split className="w-4 h-4" />
            Műszerfal + Térkép
          </button>

          <button
            type="button"
            onClick={() => onChangeTab('cockpit')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
              activeTab === 'cockpit'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Műszerfal
          </button>

          <button
            type="button"
            onClick={() => onChangeTab('map')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
              activeTab === 'map'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            Térkép Szerkesztő
          </button>

          <button
            type="button"
            onClick={() => onChangeTab('list')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
              activeTab === 'list'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <List className="w-4 h-4" />
            Úthibák ({hazardCount})
          </button>
        </div>

        {/* Right Action Icons & Simulator */}
        <div className="flex items-center gap-2">
          {/* Simulator controls */}
          <div className="hidden sm:block">{simulatorControls}</div>

          {/* Sound / Voice toggle right next to theme toggle */}
          <button
            type="button"
            onClick={onToggleVoice}
            className={`p-2.5 rounded-2xl border transition-colors ${
              settings.voiceOptions.enabled
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                : isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                : 'bg-zinc-100 border-zinc-200 text-zinc-400 hover:text-zinc-700'
            }`}
            title={
              settings.voiceOptions.enabled
                ? 'Hangos bemondás aktív (Kattints a némításhoz)'
                : 'Hang némítva (Kattints a bekapcsoláshoz)'
            }
          >
            {settings.voiceOptions.enabled ? (
              <Volume2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <VolumeX className="w-5 h-5 text-zinc-400" />
            )}
          </button>

          {/* Theme switch */}
          <button
            type="button"
            onClick={onToggleTheme}
            className={`p-2.5 rounded-2xl border transition-colors ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 text-amber-400 hover:bg-zinc-800'
                : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200'
            }`}
            title={isDark ? 'Váltás világos témára' : 'Váltás sötét témára'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Settings button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className={`p-2.5 rounded-2xl border transition-colors ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200'
            }`}
            title="Beállítások"
          >
            <Sliders className="w-5 h-5" />
          </button>

          {/* Mobile Hamburger menu */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-2xl border border-zinc-800 text-zinc-300 lg:hidden"
            title="Menü"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-3 pt-3 border-t border-zinc-800 space-y-3">
          <div className="sm:hidden">{simulatorControls}</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                onChangeTab('cockpit');
                setMobileMenuOpen(false);
              }}
              className={`p-3 rounded-2xl font-bold text-xs flex flex-col items-center gap-1.5 border ${
                activeTab === 'cockpit'
                  ? 'bg-blue-600 text-white border-blue-400'
                  : 'bg-zinc-900 text-zinc-300 border-zinc-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Műszerfal
            </button>

            <button
              type="button"
              onClick={() => {
                onChangeTab('list');
                setMobileMenuOpen(false);
              }}
              className={`p-3 rounded-2xl font-bold text-xs flex flex-col items-center gap-1.5 border ${
                activeTab === 'list'
                  ? 'bg-blue-600 text-white border-blue-400'
                  : 'bg-zinc-900 text-zinc-300 border-zinc-800'
              }`}
            >
              <List className="w-4 h-4" />
              Úthibák ({hazardCount})
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenSettings();
                setMobileMenuOpen(false);
              }}
              className="p-3 rounded-2xl font-bold text-xs flex flex-col items-center gap-1.5 border bg-zinc-900 text-zinc-300 border-zinc-800"
            >
              <Sliders className="w-4 h-4" />
              Beállítások
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
