import React, { useState } from 'react';
import { AppSettings, GPSState, UserProfile, HazardFilterMode } from '../types';
import {
  Sun,
  Moon,
  Sliders,
  Map as MapIcon,
  LayoutDashboard,
  List,
  Menu,
  X,
  Navigation,
  Split,
  Volume2,
  VolumeX,
  LogIn,
  LogOut,
  ShieldAlert,
  User,
  Globe,
  HardDrive,
  Users,
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
  // Firebase Auth & Cloud Filter
  user: UserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenAdmin: () => void;
  filterMode: HazardFilterMode;
  onChangeFilterMode: (mode: HazardFilterMode) => void;
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
  user,
  onOpenAuth,
  onLogout,
  onOpenAdmin,
  filterMode,
  onChangeFilterMode,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const isDark = settings.theme === 'dark';

  return (
    <header
      className={`border-b transition-colors px-3 sm:px-6 py-2.5 select-none ${
        isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
      }`}
    >
      <div className="flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Left: Brand & Live GPS Indicator */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 flex items-center justify-center text-white shadow-md sm:shadow-lg shadow-red-500/20 shrink-0">
            <Navigation className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-black text-base sm:text-xl tracking-tight leading-none">ÚtInfó</span>
              <span className="text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-600 text-white uppercase tracking-wider">
                OSM
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs mt-0.5">
              {/* GPS status badge */}
              <span className="flex items-center gap-1 font-semibold text-[10px] sm:text-[11px]">
                <span
                  className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                    gps.status === 'simulated'
                      ? 'bg-amber-400 animate-pulse'
                      : gps.status === 'active'
                      ? 'bg-emerald-500'
                      : 'bg-yellow-500 animate-ping'
                  }`}
                />
                <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
                  {gps.status === 'simulated'
                    ? 'Szimuláció'
                    : gps.status === 'active'
                    ? 'GPS Aktív'
                    : 'Keresés...'}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Center: Navigation Tabs & Online/Saját Filter Switcher */}
        <div className="hidden xl:flex items-center gap-2">
          {/* Main Views */}
          <div className="flex items-center bg-zinc-900/60 p-1 rounded-2xl border border-zinc-800">
            <button
              type="button"
              onClick={() => onChangeTab('split')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                activeTab === 'split'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Split className="w-3.5 h-3.5" />
              Műszerfal + Térkép
            </button>

            <button
              type="button"
              onClick={() => onChangeTab('cockpit')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                activeTab === 'cockpit'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Műszerfal
            </button>

            <button
              type="button"
              onClick={() => onChangeTab('map')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                activeTab === 'map'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              Térkép
            </button>

            <button
              type="button"
              onClick={() => onChangeTab('list')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                activeTab === 'list'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Úthibák ({hazardCount})
            </button>
          </div>

          {/* Online vs Saját Filter Pills */}
          <div className="flex items-center bg-zinc-900/60 p-1 rounded-2xl border border-zinc-800 text-[11px]">
            <button
              type="button"
              onClick={() => onChangeFilterMode('all_online')}
              className={`px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                filterMode === 'all_online'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Minden online közösségi úthiba megjelenítése"
            >
              <Globe className="w-3 h-3 text-emerald-300" />
              Online Adatok
            </button>

            <button
              type="button"
              onClick={() => onChangeFilterMode('my_hazards')}
              className={`px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                filterMode === 'my_hazards'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Csak a saját bejelentéseim megjelenítése"
            >
              <User className="w-3 h-3 text-blue-300" />
              Saját Adatok
            </button>

            <button
              type="button"
              onClick={() => onChangeFilterMode('combined')}
              className={`px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                filterMode === 'combined'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Összes adat (online + helyi + saját)"
            >
              <Users className="w-3 h-3 text-amber-300" />
              Mind
            </button>
          </div>
        </div>

        {/* Right: Auth, Theme, Voice, Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Simulator controls */}
          <div className="hidden lg:block">{simulatorControls}</div>

          {/* Sound / Voice toggle (Desktop only, mobile has it in drawer) */}
          <button
            type="button"
            onClick={onToggleVoice}
            className={`hidden sm:flex p-2 sm:p-2.5 rounded-2xl border transition-colors shrink-0 ${
              settings.voiceOptions.enabled
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                : isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                : 'bg-zinc-100 border-zinc-200 text-zinc-400 hover:text-zinc-700'
            }`}
            title={
              settings.voiceOptions.enabled
                ? 'Hangos bemondás aktív'
                : 'Hang némítva'
            }
          >
            {settings.voiceOptions.enabled ? (
              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400" />
            )}
          </button>

          {/* Theme switch */}
          <button
            type="button"
            onClick={onToggleTheme}
            className={`p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl border transition-colors shrink-0 ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 text-amber-400 hover:bg-zinc-800'
                : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200'
            }`}
            title={isDark ? 'Váltás világos témára' : 'Váltás sötét témára'}
          >
            {isDark ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          {/* Settings button (Desktop only, mobile has it in drawer) */}
          <button
            type="button"
            onClick={onOpenSettings}
            className={`hidden sm:flex p-2 sm:p-2.5 rounded-2xl border transition-colors shrink-0 ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200'
            }`}
            title="Beállítások"
          >
            <Sliders className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* User Account / Admin Button */}
          <div className="relative shrink-0">
            {user ? (
              <div className="flex items-center gap-1 sm:gap-1.5">
                {user.isAdmin && (
                  <button
                    type="button"
                    onClick={onOpenAdmin}
                    className="px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl border border-amber-500/40 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-black text-xs flex items-center gap-1 shadow-md shadow-amber-500/10 cursor-pointer shrink-0"
                    title="Adminisztrátori moderációs felület megnyitása"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
                    <span className="hidden sm:inline">Admin Pult</span>
                    <span className="sm:hidden text-[11px]">Admin</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className={`p-1.5 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl border flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    user.isAdmin
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-200'
                      : isDark
                      ? 'bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800'
                      : 'bg-zinc-100 border-zinc-200 text-zinc-800 hover:bg-zinc-200'
                  }`}
                >
                  <div className="w-6 h-6 rounded-lg sm:rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center uppercase shrink-0">
                    {user.email ? user.email.slice(0, 1) : 'U'}
                  </div>
                  <span className="hidden md:inline text-xs font-bold max-w-[120px] truncate">
                    {user.email?.split('@')[0]}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div
                    className={`absolute right-0 top-full mt-2 w-56 rounded-2xl border shadow-2xl p-2 z-50 text-xs ${
                      isDark
                        ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
                        : 'bg-white border-zinc-200 text-zinc-900'
                    }`}
                  >
                    <div className="p-2 border-b border-zinc-800/60 mb-1">
                      <div className="font-bold truncate">{user.email}</div>
                      <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                        {user.isAdmin ? (
                          <span className="text-amber-400 font-bold">Rendszergazda (Admin)</span>
                        ) : (
                          <span>Közösségi Felhasználó</span>
                        )}
                      </div>
                    </div>

                    {user.isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenAdmin();
                        }}
                        className="w-full text-left p-2 rounded-xl text-amber-300 hover:bg-amber-500/20 font-bold flex items-center gap-2"
                      >
                        <ShieldAlert className="w-4 h-4 text-amber-400" />
                        Adminisztrációs Pult
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onChangeFilterMode('my_hazards');
                        onChangeTab('list');
                      }}
                      className="w-full text-left p-2 rounded-xl text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
                    >
                      <User className="w-4 h-4 text-blue-400" />
                      Saját Bejelentéseim
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left p-2 rounded-xl text-rose-400 hover:bg-rose-500/20 font-bold flex items-center gap-2 mt-1 border-t border-zinc-800/60 pt-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Kijelentkezés
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer shrink-0"
              >
                <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden sm:inline">Belépés / Regisztráció</span>
                <span className="sm:hidden text-xs">Belépés</span>
              </button>
            )}
          </div>

          {/* Mobile Hamburger menu */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl border border-zinc-800 text-zinc-300 xl:hidden shrink-0"
            title="Menü"
          >
            {mobileMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden mt-3 pt-3 border-t border-zinc-800 space-y-3">
          <div className="lg:hidden">{simulatorControls}</div>

          {/* Online vs Saját filter for mobile */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                onChangeFilterMode('all_online');
                setMobileMenuOpen(false);
              }}
              className={`p-2 rounded-xl text-center flex items-center justify-center gap-1.5 ${
                filterMode === 'all_online' ? 'bg-emerald-600 text-white' : 'text-zinc-400'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Online
            </button>
            <button
              type="button"
              onClick={() => {
                onChangeFilterMode('my_hazards');
                setMobileMenuOpen(false);
              }}
              className={`p-2 rounded-xl text-center flex items-center justify-center gap-1.5 ${
                filterMode === 'my_hazards' ? 'bg-blue-600 text-white' : 'text-zinc-400'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Saját
            </button>
            <button
              type="button"
              onClick={() => {
                onChangeFilterMode('combined');
                setMobileMenuOpen(false);
              }}
              className={`p-2 rounded-xl text-center flex items-center justify-center gap-1.5 ${
                filterMode === 'combined' ? 'bg-amber-600 text-white' : 'text-zinc-400'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Mind
            </button>
          </div>

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
                onChangeTab('map');
                setMobileMenuOpen(false);
              }}
              className={`p-3 rounded-2xl font-bold text-xs flex flex-col items-center gap-1.5 border ${
                activeTab === 'map'
                  ? 'bg-blue-600 text-white border-blue-400'
                  : 'bg-zinc-900 text-zinc-300 border-zinc-800'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              Térkép
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
          </div>

          {/* Quick Voice & Settings for mobile */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/60">
            <button
              type="button"
              onClick={onToggleVoice}
              className={`p-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border ${
                settings.voiceOptions.enabled
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800'
              }`}
            >
              {settings.voiceOptions.enabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>Hang: BE</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-zinc-400" />
                  <span>Hang: KI</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenSettings();
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border bg-zinc-900 text-zinc-300 border-zinc-800"
            >
              <Sliders className="w-4 h-4" />
              <span>Beállítások</span>
            </button>
          </div>

          {user?.isAdmin && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAdmin();
              }}
              className="w-full py-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-xs flex items-center justify-center gap-2"
            >
              <ShieldAlert className="w-4 h-4" />
              Adminisztrációs Pult Megnyitása
            </button>
          )}
        </div>
      )}
    </header>
  );
};
