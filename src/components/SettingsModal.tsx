import React, { useState, useEffect } from 'react';
import { AppSettings, RoadHazard } from '../types';
import { speechService } from '../services/speechService';
import { audioAlertService } from '../services/audioAlertService';
import { exportHazardsJSON, importHazardsJSON } from '../services/storageService';
import {
  X,
  Volume2,
  Sliders,
  Sun,
  Moon,
  Download,
  Upload,
  Eye,
  Play,
  Bell,
  MapPin,
  RefreshCw,
  Compass,
  Navigation,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  hazards: RoadHazard[];
  onImportHazards: (hazards: RoadHazard[]) => void;
  onRefreshOnlineOsm?: () => void;
  isRefreshingOsm?: boolean;
  osmFeatureCount?: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  hazards,
  onImportHazards,
  onRefreshOnlineOsm,
  isRefreshingOsm = false,
  osmFeatureCount = 0,
}) => {
  const [activeTab, setActiveTab] = useState<'sound' | 'osm' | 'voice' | 'display' | 'data'>('sound');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setVoices(speechService.getAvailableVoices());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestSpeech = () => {
    const testText = speechService.buildRoadAnnouncementText(
      {
        roadName: 'Budaörsi út',
        roadNumber: 'M7',
        city: 'Budapest XI. kerület',
        postcode: '1118',
        lanes: 3,
        source: 'simulated',
      },
      settings.voiceOptions
    );
    speechService.speak(
      testText || 'Teszt beszédhang: ÚtInfó felolvasás sikeresen működik.',
      settings.voiceOptions
    );
  };

  const handleExport = () => {
    const json = exportHazardsJSON(hazards);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `utinfo-uth 정k-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = importHazardsJSON(content);
      if (parsed) {
        onImportHazards(parsed);
        setImportStatus(`Sikeres importálás: ${parsed.length} úthiba betöltve.`);
      } else {
        setImportStatus('Hiba az importálás során: Érvénytelen JSON formátum.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-3xl shadow-2xl text-white overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-black">Beállítások</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/60 p-2 gap-1 overflow-x-auto shrink-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('sound')}
            className={`px-3 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'sound'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Bell className="w-4 h-4 text-amber-300" />
            Hangjelzések (1, 2, 3...)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('osm')}
            className={`px-3 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'osm'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <MapPin className="w-4 h-4 text-cyan-300" />
            OSM Elemek & Bemondás
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`px-3 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'voice'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Volume2 className="w-4 h-4 text-emerald-300" />
            Beszédhang (TTS)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('display')}
            className={`px-3 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'display'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Eye className="w-4 h-4" />
            Kijelző
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('data')}
            className={`px-3 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'data'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Download className="w-4 h-4" />
            Mentés
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-zinc-200">
          {/* TAB 1: ACOUSTIC SOUND ALERTS (1, 2, 3, 4 CHIMES BY SEVERITY & TYPE) */}
          {activeTab === 'sound' && (
            <div className="space-y-5">
              {/* Sound Alerts Main Switch */}
              <div className="bg-zinc-800/80 p-4 rounded-2xl flex items-center justify-between border border-zinc-700">
                <div>
                  <div className="font-bold text-base text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-amber-400" />
                    <span>Akusztikus Rövid Hangjelzések (Pittyegés)</span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    Rövid, jól hallható jelzőhangok a veszélyesség fokára és hibatípusokra
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.soundAlerts.enabled}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      soundAlerts: { ...settings.soundAlerts, enabled: e.target.checked },
                    })
                  }
                  className="w-6 h-6 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              {/* Alert Mode Toggle: Both vs Sound Only vs Voice Only */}
              <div className="bg-zinc-800/60 p-4 rounded-2xl border border-zinc-700 space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                  Jelzési Mód Vezetés Közben:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        ...settings,
                        soundAlerts: { ...settings.soundAlerts, alertMode: 'both' },
                      })
                    }
                    className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      (settings.soundAlerts.alertMode ?? 'both') === 'both'
                        ? 'bg-amber-600 text-white border-amber-500 shadow-md ring-2 ring-amber-500/30'
                        : 'bg-zinc-900/70 text-zinc-300 border-zinc-750 hover:bg-zinc-800'
                    }`}
                  >
                    <span>🔊</span>
                    <span>Hang + Beszéd (Együtt)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        ...settings,
                        soundAlerts: { ...settings.soundAlerts, alertMode: 'sound_only' },
                      })
                    }
                    className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      settings.soundAlerts.alertMode === 'sound_only'
                        ? 'bg-amber-600 text-white border-amber-500 shadow-md ring-2 ring-amber-500/30'
                        : 'bg-zinc-900/70 text-zinc-300 border-zinc-750 hover:bg-zinc-800'
                    }`}
                  >
                    <span>🔔</span>
                    <span>Csak rövid hangjelzés</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        ...settings,
                        soundAlerts: { ...settings.soundAlerts, alertMode: 'voice_only' },
                      })
                    }
                    className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      settings.soundAlerts.alertMode === 'voice_only'
                        ? 'bg-amber-600 text-white border-amber-500 shadow-md ring-2 ring-amber-500/30'
                        : 'bg-zinc-900/70 text-zinc-300 border-zinc-750 hover:bg-zinc-800'
                    }`}
                  >
                    <span>🗣️</span>
                    <span>Csak felolvasás (TTS)</span>
                  </button>
                </div>
              </div>

              {/* Volume Slider */}
              <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/70 space-y-2">
                <div className="flex justify-between text-xs font-semibold text-zinc-300">
                  <span>Hangjelzések Hagyereje</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {Math.round((settings.soundAlerts.volume ?? 0.8) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={settings.soundAlerts.volume ?? 0.8}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      soundAlerts: {
                        ...settings.soundAlerts,
                        volume: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Sound Style Picker */}
              <div className="bg-zinc-800/40 p-3.5 rounded-2xl border border-zinc-700/60 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-zinc-300">Hangszín és Stílus</div>
                  <div className="text-[11px] text-zinc-400">Akusztikus szignál karaktere</div>
                </div>
                <div className="flex gap-1.5">
                  {(['digital', 'chime', 'beep', 'radar'] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() =>
                        onUpdateSettings({
                          ...settings,
                          soundAlerts: { ...settings.soundAlerts, soundStyle: style },
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                        (settings.soundAlerts.soundStyle || 'digital') === style
                          ? 'bg-amber-600 text-white'
                          : 'bg-zinc-900 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {style === 'digital' ? 'Digitális' : style === 'chime' ? 'Harang' : style === 'beep' ? 'Csipogás' : 'Radar'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity Chimes (1, 2, 3, 4 jelzés) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                      Veszélyességi Fokozatonkénti Hangjelzések (1, 2, 3, 4):
                    </label>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      1, 2, 3 és 4 pittyenés a hiba súlyosságától és a veszély fokától függően
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.soundAlerts.playSeverityChimes}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        soundAlerts: {
                          ...settings.soundAlerts,
                          playSeverityChimes: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                  />
                </div>

                {/* Level 1: Low */}
                <div className="p-3.5 bg-zinc-800/40 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-black text-sm flex items-center justify-center border border-emerald-500/40">
                      1
                    </span>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-emerald-300">
                        1. fokozat (Enyhe) — 1 lágy jelzés
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Egyszeri lágy harmonikus pittyenés kisebb repedéseknél vagy egyenetlenségnél
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => audioAlertService.playSeverityChime('low', settings.soundAlerts)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-colors cursor-pointer shrink-0"
                  >
                    <Play className="w-3 h-3" />
                    Próba (1)
                  </button>
                </div>

                {/* Level 2: Medium */}
                <div className="p-3.5 bg-zinc-800/40 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 font-black text-sm flex items-center justify-center border border-amber-500/40">
                      2
                    </span>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-amber-300">
                        2. fokozat (Közepes) — 2 határozott jelzés
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Kettős figyelmeztető pittyegés közepes mélységű úthibánál
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => audioAlertService.playSeverityChime('medium', settings.soundAlerts)}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-colors cursor-pointer shrink-0"
                  >
                    <Play className="w-3 h-3" />
                    Próba (2)
                  </button>
                </div>

                {/* Level 3: High */}
                <div className="p-3.5 bg-zinc-800/40 border border-orange-500/30 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 font-black text-sm flex items-center justify-center border border-orange-500/40">
                      3
                    </span>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-orange-300">
                        3. fokozat (Súlyos) — 3 figyelmeztető sípolás
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Hármas gyors sürgősségi csipogás mély kátyúnál vagy nyomvályúnál
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => audioAlertService.playSeverityChime('high', settings.soundAlerts)}
                    className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-colors cursor-pointer shrink-0"
                  >
                    <Play className="w-3 h-3" />
                    Próba (3)
                  </button>
                </div>

                {/* Level 4: Critical */}
                <div className="p-3.5 bg-zinc-800/40 border border-rose-500/40 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 font-black text-sm flex items-center justify-center border border-rose-500/40">
                      4
                    </span>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-rose-300">
                        4. fokozat (Kritikus) — 4 gyors vészjelzés
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Négyes azonnali szirénázó figyelmeztetés keréktörési vagy borulási veszélykor
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => audioAlertService.playSeverityChime('critical', settings.soundAlerts)}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-colors cursor-pointer shrink-0"
                  >
                    <Play className="w-3 h-3" />
                    Próba (4)
                  </button>
                </div>
              </div>

              {/* Distinctive Type Chimes for Road Hazards */}
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                      Egyedi Hangjelzések Úthiba Típusok Szerint:
                    </label>
                    <p className="text-[11px] text-zinc-400">
                      Különböző hangszínek és frekvenciák az egyes hibák felismeréséhez
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.soundAlerts.playTypeChimes}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        soundAlerts: {
                          ...settings.soundAlerts,
                          playTypeChimes: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => audioAlertService.playTypeChime('pothole', settings.soundAlerts)}
                    className="p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-750 border border-zinc-700 hover:border-amber-500/50 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">🕳️</span>
                      <Play className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-400" />
                    </div>
                    <div className="text-xs font-bold text-white mt-1">Kátyú</div>
                    <div className="text-[10px] text-zinc-400">Mély döccenés</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => audioAlertService.playTypeChime('manhole', settings.soundAlerts)}
                    className="p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-750 border border-zinc-700 hover:border-amber-500/50 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">🔘</span>
                      <Play className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-400" />
                    </div>
                    <div className="text-xs font-bold text-white mt-1">Csatornafedél</div>
                    <div className="text-[10px] text-zinc-400">Fémes csengettyű</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => audioAlertService.playTypeChime('rutting', settings.soundAlerts)}
                    className="p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-750 border border-zinc-700 hover:border-amber-500/50 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">〰️</span>
                      <Play className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-400" />
                    </div>
                    <div className="text-xs font-bold text-white mt-1">Nyomvályú</div>
                    <div className="text-[10px] text-zinc-400">Hullámzó hang</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => audioAlertService.playTypeChime('crack', settings.soundAlerts)}
                    className="p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-750 border border-zinc-700 hover:border-amber-500/50 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">⚡</span>
                      <Play className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-400" />
                    </div>
                    <div className="text-xs font-bold text-white mt-1">Repedés</div>
                    <div className="text-[10px] text-zinc-400">Éles kattanás</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => audioAlertService.playTypeChime('subsidence', settings.soundAlerts)}
                    className="p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-750 border border-zinc-700 hover:border-amber-500/50 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">📉</span>
                      <Play className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-400" />
                    </div>
                    <div className="text-xs font-bold text-white mt-1">Süllyedés</div>
                    <div className="text-[10px] text-zinc-400">Csúszó mély hang</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => audioAlertService.playTypeChime('speedbump', settings.soundAlerts)}
                    className="p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-750 border border-zinc-700 hover:border-amber-500/50 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">🚧</span>
                      <Play className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-400" />
                    </div>
                    <div className="text-xs font-bold text-white mt-1">Fekvőrendőr</div>
                    <div className="text-[10px] text-zinc-400">Lassítási görbe</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => audioAlertService.playTypeChime('debris', settings.soundAlerts)}
                    className="p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-750 border border-zinc-700 hover:border-amber-500/50 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">⚠️</span>
                      <Play className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-400" />
                    </div>
                    <div className="text-xs font-bold text-white mt-1">Akadály / Kő</div>
                    <div className="text-[10px] text-zinc-400">Kettős vészjelzés</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => audioAlertService.playTypeChime('other', settings.soundAlerts)}
                    className="p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-750 border border-zinc-700 hover:border-amber-500/50 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">❓</span>
                      <Play className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-400" />
                    </div>
                    <div className="text-xs font-bold text-white mt-1">Egyéb hiba</div>
                    <div className="text-[10px] text-zinc-400">Figyelmeztetés</div>
                  </button>
                </div>
              </div>

              {/* Distinctive Type Chimes for OSM Features */}
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <label className="text-xs font-bold text-cyan-300 uppercase tracking-wider block">
                  Közlekedési & OSM Elemek Hangjelzései:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => audioAlertService.playTypeChime('railway', settings.soundAlerts)}
                    className="p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-750 border border-zinc-700 hover:border-cyan-500/50 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">🚂</span>
                      <Play className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div className="text-xs font-bold text-white mt-1">Vasúti átjáró</div>
                    <div className="text-[10px] text-zinc-400">Fénysorompó csengő</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => audioAlertService.playTypeChime('crossing', settings.soundAlerts)}
                    className="p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-750 border border-zinc-700 hover:border-cyan-500/50 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">🚶</span>
                      <Play className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div className="text-xs font-bold text-white mt-1">Gyalogátkelő</div>
                    <div className="text-[10px] text-zinc-400">Lágy kéthangos</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => audioAlertService.playTypeChime('traffic_signals', settings.soundAlerts)}
                    className="p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-750 border border-zinc-700 hover:border-cyan-500/50 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">🚦</span>
                      <Play className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div className="text-xs font-bold text-white mt-1">Jelzőlámpa</div>
                    <div className="text-[10px] text-zinc-400">Figyelmeztető szignál</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => audioAlertService.playTypeChime('traffic_sign', settings.soundAlerts)}
                    className="p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-750 border border-zinc-700 hover:border-cyan-500/50 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">🛑</span>
                      <Play className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div className="text-xs font-bold text-white mt-1">Közúti tábla</div>
                    <div className="text-[10px] text-zinc-400">Tiszta pittyenés</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ONLINE OSM FEATURES & ANNOUNCE TOGGLES */}
          {activeTab === 'osm' && (
            <div className="space-y-5">
              {/* Overpass Live Sync Card */}
              <div className="bg-gradient-to-r from-blue-900/40 via-cyan-900/30 to-zinc-900 p-4 rounded-2xl border border-blue-500/40 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-cyan-400" />
                    <span className="font-black text-sm text-white">Valós Online OpenStreetMap (OSM) Adatbázis</span>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold">
                      {osmFeatureCount} elem betöltve
                    </span>
                  </div>
                  {onRefreshOnlineOsm && (
                    <button
                      type="button"
                      disabled={isRefreshingOsm}
                      onClick={onRefreshOnlineOsm}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingOsm ? 'animate-spin' : ''}`} />
                      <span>{isRefreshingOsm ? 'Letöltés...' : 'Online Lekérés Most'}</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Az alkalmazás vezetés közben a valós OpenStreetMap (Overpass API) szerverről tölti le az online adatokat (akárcsak az utcaneveket): vasúti átjárókat, gyalogátkelőket, jelzőlámpákat és táblákat.
                  Az alábbiakban egyenként bejelölheted, hogy mely elemeket <strong className="text-blue-300">mutassa a képernyőn/térképen</strong>, és melyeket <strong className="text-emerald-300">mondja be hanggal közeledéskor</strong>!
                </p>
              </div>

              {/* Alert Distance & Approach-Only Direction Rule Card */}
              <div className="bg-zinc-800/80 p-4 rounded-2xl border border-zinc-700/80 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-xs text-zinc-200 uppercase tracking-wider">
                      Beállított Jelzési Távolság (OSM & Úthibák):
                    </span>
                  </div>
                  <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
                    {settings.voiceOptions.hazardWarningDistanceMeters || 200} méter
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {[100, 150, 200, 300, 500, 1000].map((meters) => (
                    <button
                      key={meters}
                      type="button"
                      onClick={() =>
                        onUpdateSettings({
                          ...settings,
                          voiceOptions: {
                            ...settings.voiceOptions,
                            hazardWarningDistanceMeters: meters,
                          },
                        })
                      }
                      className={`flex-1 min-w-[54px] py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        (settings.voiceOptions.hazardWarningDistanceMeters || 200) === meters
                          ? 'bg-amber-600 text-white border-amber-500 font-black shadow-md shadow-amber-600/30'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      {meters}m
                    </button>
                  ))}
                </div>

                <div className="p-2.5 bg-zinc-900/80 rounded-xl border border-zinc-800 flex items-start gap-2">
                  <span className="text-base leading-none">🧭</span>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    <strong className="text-amber-300">Közeledési szabály:</strong> A vasúti átjárókra, gyalogátkelőkre, jelzőlámpákra és táblákra pontosan a fenti távolság vonatkozik. A rendszer <strong className="text-emerald-400">kizárólag közeledéskor jelez</strong> (szélvédő előtt haladva); távolodáskor vagy az elemen való áthaladás után azonnal elhallgat!
                  </p>
                </div>
              </div>

              {/* Individual Feature Settings: SHOW vs ANNOUNCE */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                  Elemek egyenkénti beállítása (Megjelenítés & Hangos bemondás):
                </label>

                {/* 1. Crossings (Zebra) */}
                <div className="p-4 bg-zinc-800/60 border border-zinc-700/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">🚶</span>
                      <div>
                        <div className="font-bold text-sm text-white">Gyalogátkelőhelyek (Zebra)</div>
                        <div className="text-[11px] text-zinc-400">Kijelölt gyalogos átkelők és sárga villogós átkelőhelyek</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => audioAlertService.playTypeChime('crossing', settings.soundAlerts)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-cyan-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Hangminta lejátszása"
                    >
                      <Play className="w-3 h-3" />
                      <span>Hang</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-700/60">
                    <label className="flex items-center justify-between p-2.5 bg-zinc-900/60 rounded-xl cursor-pointer hover:bg-zinc-900 border border-zinc-800">
                      <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        Mutassa a térképen / HUD-on
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.osmFeatures.showCrossings}
                        onChange={(e) =>
                          onUpdateSettings({
                            ...settings,
                            osmFeatures: { ...settings.osmFeatures, showCrossings: e.target.checked },
                          })
                        }
                        className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 bg-zinc-900/60 rounded-xl cursor-pointer hover:bg-zinc-900 border border-zinc-800">
                      <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                        Mondja be hangosan közeledéskor
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.osmFeatures.announceCrossings}
                        onChange={(e) =>
                          onUpdateSettings({
                            ...settings,
                            osmFeatures: { ...settings.osmFeatures, announceCrossings: e.target.checked },
                          })
                        }
                        className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* 2. Railways (Level Crossings) */}
                <div className="p-4 bg-zinc-800/60 border border-zinc-700/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">🚂</span>
                      <div>
                        <div className="font-bold text-sm text-white">Vasúti Átjárók (Fénysorompók, Sorompók)</div>
                        <div className="text-[11px] text-zinc-400">Szintbeli vasúti kereszteződések és átjárók</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => audioAlertService.playTypeChime('railway', settings.soundAlerts)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-cyan-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Hangminta lejátszása"
                    >
                      <Play className="w-3 h-3" />
                      <span>Hang</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-700/60">
                    <label className="flex items-center justify-between p-2.5 bg-zinc-900/60 rounded-xl cursor-pointer hover:bg-zinc-900 border border-zinc-800">
                      <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        Mutassa a térképen / HUD-on
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.osmFeatures.showRailways}
                        onChange={(e) =>
                          onUpdateSettings({
                            ...settings,
                            osmFeatures: { ...settings.osmFeatures, showRailways: e.target.checked },
                          })
                        }
                        className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 bg-zinc-900/60 rounded-xl cursor-pointer hover:bg-zinc-900 border border-zinc-800">
                      <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                        Mondja be hangosan közeledéskor
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.osmFeatures.announceRailways}
                        onChange={(e) =>
                          onUpdateSettings({
                            ...settings,
                            osmFeatures: { ...settings.osmFeatures, announceRailways: e.target.checked },
                          })
                        }
                        className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* 3. Traffic Signals */}
                <div className="p-4 bg-zinc-800/60 border border-zinc-700/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">🚦</span>
                      <div>
                        <div className="font-bold text-sm text-white">Forgalmi Jelzőlámpák</div>
                        <div className="text-[11px] text-zinc-400">Közúti forgalomirányító jelzőlámpák és csomópontok</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => audioAlertService.playTypeChime('traffic_signals', settings.soundAlerts)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-cyan-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Hangminta lejátszása"
                    >
                      <Play className="w-3 h-3" />
                      <span>Hang</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-700/60">
                    <label className="flex items-center justify-between p-2.5 bg-zinc-900/60 rounded-xl cursor-pointer hover:bg-zinc-900 border border-zinc-800">
                      <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        Mutassa a térképen / HUD-on
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.osmFeatures.showTrafficSignals}
                        onChange={(e) =>
                          onUpdateSettings({
                            ...settings,
                            osmFeatures: { ...settings.osmFeatures, showTrafficSignals: e.target.checked },
                          })
                        }
                        className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 bg-zinc-900/60 rounded-xl cursor-pointer hover:bg-zinc-900 border border-zinc-800">
                      <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                        Mondja be hangosan közeledéskor
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.osmFeatures.announceTrafficSignals}
                        onChange={(e) =>
                          onUpdateSettings({
                            ...settings,
                            osmFeatures: { ...settings.osmFeatures, announceTrafficSignals: e.target.checked },
                          })
                        }
                        className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* 4. Traffic Signs */}
                <div className="p-4 bg-zinc-800/60 border border-zinc-700/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">🛑</span>
                      <div>
                        <div className="font-bold text-sm text-white">Közlekedési Táblák (Sebességkorlátozás, Elsőbbség)</div>
                        <div className="text-[11px] text-zinc-400">Megengedett sebesség és veszélyt jelző táblák</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => audioAlertService.playTypeChime('traffic_sign', settings.soundAlerts)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-cyan-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Hangminta lejátszása"
                    >
                      <Play className="w-3 h-3" />
                      <span>Hang</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-700/60">
                    <label className="flex items-center justify-between p-2.5 bg-zinc-900/60 rounded-xl cursor-pointer hover:bg-zinc-900 border border-zinc-800">
                      <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        Mutassa a térképen / HUD-on
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.osmFeatures.showTrafficSigns}
                        onChange={(e) =>
                          onUpdateSettings({
                            ...settings,
                            osmFeatures: { ...settings.osmFeatures, showTrafficSigns: e.target.checked },
                          })
                        }
                        className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 bg-zinc-900/60 rounded-xl cursor-pointer hover:bg-zinc-900 border border-zinc-800">
                      <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                        Mondja be hangosan közeledéskor
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.osmFeatures.announceTrafficSigns}
                        onChange={(e) =>
                          onUpdateSettings({
                            ...settings,
                            osmFeatures: { ...settings.osmFeatures, announceTrafficSigns: e.target.checked },
                          })
                        }
                        className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* 5. City Limits (Településhatár / Várostábla) */}
                <div className="p-4 bg-zinc-800/60 border border-zinc-700/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">🏙️</span>
                      <div>
                        <div className="font-bold text-sm text-white">Településhatár Táblák (Várostábla)</div>
                        <div className="text-[11px] text-zinc-400">Lakott terület kezdete és vége jelzőtáblák (50 km/h)</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => audioAlertService.playTypeChime('city_limit', settings.soundAlerts)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-cyan-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Hangminta lejátszása"
                    >
                      <Play className="w-3 h-3" />
                      <span>Hang</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-700/60">
                    <label className="flex items-center justify-between p-2.5 bg-zinc-900/60 rounded-xl cursor-pointer hover:bg-zinc-900 border border-zinc-800">
                      <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        Mutassa a térképen / HUD-on
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.osmFeatures.showCityLimits !== false}
                        onChange={(e) =>
                          onUpdateSettings({
                            ...settings,
                            osmFeatures: { ...settings.osmFeatures, showCityLimits: e.target.checked },
                          })
                        }
                        className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 bg-zinc-900/60 rounded-xl cursor-pointer hover:bg-zinc-900 border border-zinc-800">
                      <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                        Mondja be hangosan közeledéskor
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.osmFeatures.announceCityLimits !== false}
                        onChange={(e) =>
                          onUpdateSettings({
                            ...settings,
                            osmFeatures: { ...settings.osmFeatures, announceCityLimits: e.target.checked },
                          })
                        }
                        className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VOICE CONFIGURATION (TTS) */}
          {activeTab === 'voice' && (
            <div className="space-y-5">
              {/* Voice Enable Toggle */}
              <div className="bg-zinc-800/80 p-4 rounded-2xl flex items-center justify-between border border-zinc-700">
                <div>
                  <div className="font-bold text-base text-white">Hangos felolvasás (Beszéd)</div>
                  <div className="text-xs text-zinc-400">
                    Útadatok és úthiba figyelmeztetések bemondása
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.voiceOptions.enabled}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      voiceOptions: { ...settings.voiceOptions, enabled: e.target.checked },
                    })
                  }
                  className="w-6 h-6 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              {/* What to announce */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                  Mit mondjon be a hangos beszéd:
                </label>

                {/* Announce City */}
                <label className="flex items-center justify-between p-3.5 bg-zinc-800/40 border border-zinc-700/60 rounded-xl cursor-pointer hover:bg-zinc-800">
                  <span className="font-semibold text-sm">Település (Város / Kerület)</span>
                  <input
                    type="checkbox"
                    checked={settings.voiceOptions.announceCity}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        voiceOptions: { ...settings.voiceOptions, announceCity: e.target.checked },
                      })
                    }
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </label>

                {/* Announce Street */}
                <label className="flex items-center justify-between p-3.5 bg-zinc-800/40 border border-zinc-700/60 rounded-xl cursor-pointer hover:bg-zinc-800">
                  <span className="font-semibold text-sm">+ Utca / Út neve</span>
                  <input
                    type="checkbox"
                    checked={settings.voiceOptions.announceStreet}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        voiceOptions: { ...settings.voiceOptions, announceStreet: e.target.checked },
                      })
                    }
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </label>

                {/* Announce Road Number */}
                <label className="flex items-center justify-between p-3.5 bg-zinc-800/40 border border-zinc-700/60 rounded-xl cursor-pointer hover:bg-zinc-800">
                  <span className="font-semibold text-sm">+ Út száma (pl. M7, 8-as főút)</span>
                  <input
                    type="checkbox"
                    checked={settings.voiceOptions.announceRoadNumber}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        voiceOptions: { ...settings.voiceOptions, announceRoadNumber: e.target.checked },
                      })
                    }
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </label>

                {/* Announce Lane info */}
                <label className="flex items-center justify-between p-3.5 bg-zinc-800/40 border border-zinc-700/60 rounded-xl cursor-pointer hover:bg-zinc-800">
                  <span className="font-semibold text-sm">+ Sáv információ (pl. 3 sávos út)</span>
                  <input
                    type="checkbox"
                    checked={settings.voiceOptions.announceLaneInfo}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        voiceOptions: { ...settings.voiceOptions, announceLaneInfo: e.target.checked },
                      })
                    }
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </label>

                {/* Announce Approaching Hazards */}
                <label className="flex items-center justify-between p-3.5 bg-red-950/20 border border-red-800/40 rounded-xl cursor-pointer hover:bg-red-950/40">
                  <div>
                    <span className="font-semibold text-sm text-red-300">
                      Közelgő úthibák figyelmeztetése
                    </span>
                    <div className="text-[11px] text-zinc-400">
                      Figyelmeztet a haladási irányodban fekvő rögzített hibákra
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.voiceOptions.announceApproachingHazards}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        voiceOptions: {
                          ...settings.voiceOptions,
                          announceApproachingHazards: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5 accent-red-600 rounded cursor-pointer"
                  />
                </label>

                {/* Warning Distance Preset Selector */}
                {settings.voiceOptions.announceApproachingHazards && (
                  <div className="bg-zinc-800/60 p-3 rounded-xl border border-zinc-700/60 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-zinc-300">Előrejelzési Távolság a hiba előtt:</span>
                      <span className="font-mono text-red-400 font-bold">
                        {settings.voiceOptions.hazardWarningDistanceMeters} méter
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[100, 200, 300, 500, 1000].map((meters) => (
                        <button
                          key={meters}
                          type="button"
                          onClick={() =>
                            onUpdateSettings({
                              ...settings,
                              voiceOptions: {
                                ...settings.voiceOptions,
                                hazardWarningDistanceMeters: meters,
                              },
                            })
                          }
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                            settings.voiceOptions.hazardWarningDistanceMeters === meters
                              ? 'bg-red-600 text-white border-red-500 font-black'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
                          }`}
                        >
                          {meters}m
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Voice Speed Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-zinc-300">
                  <span>Beszéd Sebessége</span>
                  <span>{settings.voiceOptions.rate.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.4"
                  step="0.05"
                  value={settings.voiceOptions.rate}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      voiceOptions: { ...settings.voiceOptions, rate: parseFloat(e.target.value) },
                    })
                  }
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              {/* Voice Selector */}
              {voices.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 block">
                    Választott beszédhang
                  </label>
                  <select
                    value={settings.voiceOptions.selectedVoiceURI || ''}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        voiceOptions: { ...settings.voiceOptions, selectedVoiceURI: e.target.value },
                      })
                    }
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value="">Alapértelmezett (Magyar hu-HU ajánlott)</option>
                    {voices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Test Speech Button */}
              <button
                type="button"
                onClick={handleTestSpeech}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 text-blue-400 transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4" />
                Beszéd Tesztelése Most
              </button>
            </div>
          )}

          {/* TAB 4: DISPLAY OPTIONS */}
          {activeTab === 'display' && (
            <div className="space-y-5">
              {/* Theme Toggle */}
              <div className="bg-zinc-800/80 p-4 rounded-2xl flex items-center justify-between border border-zinc-700">
                <div>
                  <div className="font-bold text-base text-white">Megjelenési Téma</div>
                  <div className="text-xs text-zinc-400">
                    Világos nappali vs. sötét éjszakai műszerfal
                  </div>
                </div>
                <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-700">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, theme: 'light' })}
                    className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                      settings.theme === 'light'
                        ? 'bg-amber-500 text-black'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    Világos
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, theme: 'dark' })}
                    className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                      settings.theme === 'dark'
                        ? 'bg-blue-600 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    Sötét
                  </button>
                </div>
              </div>

              {/* What to show on Cockpit Display */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                  Mit mutasson a műszerfal kijelzőn:
                </label>

                {/* Show City */}
                <label className="flex items-center justify-between p-3.5 bg-zinc-800/40 border border-zinc-700/60 rounded-xl cursor-pointer hover:bg-zinc-800">
                  <span className="font-semibold text-sm">Település (Város / Kerület)</span>
                  <input
                    type="checkbox"
                    checked={settings.displayOptions.showCity}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        displayOptions: { ...settings.displayOptions, showCity: e.target.checked },
                      })
                    }
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </label>

                {/* Show Street */}
                <label className="flex items-center justify-between p-3.5 bg-zinc-800/40 border border-zinc-700/60 rounded-xl cursor-pointer hover:bg-zinc-800">
                  <span className="font-semibold text-sm">+ Utca / Út neve</span>
                  <input
                    type="checkbox"
                    checked={settings.displayOptions.showStreet}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        displayOptions: { ...settings.displayOptions, showStreet: e.target.checked },
                      })
                    }
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </label>

                {/* Show Road Number when no street */}
                <label className="flex items-center justify-between p-3.5 bg-zinc-800/40 border border-zinc-700/60 rounded-xl cursor-pointer hover:bg-zinc-800">
                  <div className="pr-3">
                    <span className="font-semibold text-sm block">Út száma az utca helyén (ha nincs külön utcanév)</span>
                    <span className="text-xs text-zinc-400 block mt-0.5">
                      Csak egyetlen helyen jelenik meg az út száma; ha nincs utcanév, akkor az utca sorában jelzi (pl. M7 Autópálya, 8-as főút).
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.displayOptions.showRoadNumberWhenNoStreet !== false}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        displayOptions: {
                          ...settings.displayOptions,
                          showRoadNumberWhenNoStreet: e.target.checked,
                          showRoadNumber: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer shrink-0"
                  />
                </label>

                {/* Show Speed Limit Sign */}
                <label className="flex items-center justify-between p-3.5 bg-zinc-800/40 border border-zinc-700/60 rounded-xl cursor-pointer hover:bg-zinc-800">
                  <div className="pr-3">
                    <span className="font-semibold text-sm block">Sebességkorlátozás tábla (a város kártyán jobbra)</span>
                    <span className="text-xs text-zinc-400 block mt-0.5">
                      Megjeleníti a megengedett legnagyobb sebesség (50, 70, 90, 130 km/h) kerek piros szegélyes tábláját a város kártya jobb szélén.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.displayOptions.showSpeedLimit !== false}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        displayOptions: {
                          ...settings.displayOptions,
                          showSpeedLimit: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer shrink-0"
                  />
                </label>

                {/* Show City Limit (Várostábla) Sign */}
                <label className="flex items-center justify-between p-3.5 bg-zinc-800/40 border border-zinc-700/60 rounded-xl cursor-pointer hover:bg-zinc-800">
                  <div className="pr-3">
                    <span className="font-semibold text-sm block">Településhatár tábla (Várostábla) jelvény</span>
                    <span className="text-xs text-zinc-400 block mt-0.5">
                      Fehér helységnévtábla jelvény megjelenítése lakott területre való behajtáskor (pl. [ BUDAÖRS ]).
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.displayOptions.showCityLimitSign !== false}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        displayOptions: {
                          ...settings.displayOptions,
                          showCityLimitSign: e.target.checked,
                        },
                      })
                    }
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer shrink-0"
                  />
                </label>

                {/* Show Postcode */}
                <label className="flex items-center justify-between p-3.5 bg-zinc-800/40 border border-zinc-700/60 rounded-xl cursor-pointer hover:bg-zinc-800">
                  <span className="font-semibold text-sm">+ Irányítószám</span>
                  <input
                    type="checkbox"
                    checked={settings.displayOptions.showPostcode}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        displayOptions: { ...settings.displayOptions, showPostcode: e.target.checked },
                      })
                    }
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </label>

                {/* Show Lane Info */}
                <label className="flex items-center justify-between p-3.5 bg-zinc-800/40 border border-zinc-700/60 rounded-xl cursor-pointer hover:bg-zinc-800">
                  <span className="font-semibold text-sm">+ Sáv Információ sávrajzzal</span>
                  <input
                    type="checkbox"
                    checked={settings.displayOptions.showLaneInfo}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        displayOptions: { ...settings.displayOptions, showLaneInfo: e.target.checked },
                      })
                    }
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </label>

                {/* Show Speed */}
                <label className="flex items-center justify-between p-3.5 bg-zinc-800/40 border border-zinc-700/60 rounded-xl cursor-pointer hover:bg-zinc-800">
                  <span className="font-semibold text-sm">Sebességmérő (km/h)</span>
                  <input
                    type="checkbox"
                    checked={settings.displayOptions.showSpeed}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        displayOptions: { ...settings.displayOptions, showSpeed: e.target.checked },
                      })
                    }
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </label>

                {/* Show Heading */}
                <label className="flex items-center justify-between p-3.5 bg-zinc-800/40 border border-zinc-700/60 rounded-xl cursor-pointer hover:bg-zinc-800">
                  <span className="font-semibold text-sm">Iránytű & Haladási fok</span>
                  <input
                    type="checkbox"
                    checked={settings.displayOptions.showHeading}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        displayOptions: { ...settings.displayOptions, showHeading: e.target.checked },
                      })
                    }
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 5: DATA IMPORT/EXPORT */}
          {activeTab === 'data' && (
            <div className="space-y-4">
              <div className="bg-zinc-800/80 p-4 rounded-2xl border border-zinc-700">
                <h4 className="font-bold text-sm text-white mb-1">Rögzített Úthibák Exportálása</h4>
                <p className="text-xs text-zinc-400 mb-3">
                  Töltsd le az összes mentett úthibát ({hazards.length} db) biztonsági mentésként vagy megosztáshoz JSON formátumban.
                </p>
                <button
                  type="button"
                  onClick={handleExport}
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  JSON Fájl Letöltése
                </button>
              </div>

              <div className="bg-zinc-800/80 p-4 rounded-2xl border border-zinc-700">
                <h4 className="font-bold text-sm text-white mb-1">Úthibák Betöltése / Importálás</h4>
                <p className="text-xs text-zinc-400 mb-3">
                  Tölts be egy korábban exportált JSON fájlt úthiba listával.
                </p>
                <label className="cursor-pointer inline-flex items-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-colors">
                  <Upload className="w-4 h-4" />
                  JSON Fájl Kiválasztása
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>
                {importStatus && (
                  <div className="mt-2 text-xs text-emerald-400 font-semibold">{importStatus}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer"
          >
            Kész
          </button>
        </div>
      </div>
    </div>
  );
};
