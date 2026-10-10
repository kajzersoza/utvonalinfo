import React, { useState, useEffect } from 'react';
import { AppSettings, RoadHazard } from '../types';
import { speechService } from '../services/speechService';
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
  Check,
  Play,
  RotateCcw,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  hazards: RoadHazard[];
  onImportHazards: (hazards: RoadHazard[]) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  hazards,
  onImportHazards,
}) => {
  const [activeTab, setActiveTab] = useState<'display' | 'voice' | 'data'>('voice');
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
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-700 rounded-3xl shadow-2xl text-white overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-black">Beállítások</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/60 p-2 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'voice'
                ? 'bg-blue-600 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            Hangos Beszéd (TTS)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('display')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'display'
                ? 'bg-blue-600 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Eye className="w-4 h-4" />
            Kijelző & Megjelenítés
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('data')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'data'
                ? 'bg-blue-600 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Download className="w-4 h-4" />
            Adatmentés
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-zinc-200">
          {/* TAB 1: VOICE CONFIGURATION */}
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

              {/* What to announce (Specific user prompt requirement!) */}
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
                    className="w-5 h-5 accent-blue-600 rounded"
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
                    className="w-5 h-5 accent-blue-600 rounded"
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
                    className="w-5 h-5 accent-blue-600 rounded"
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
                    className="w-5 h-5 accent-blue-600 rounded"
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
                    className="w-5 h-5 accent-red-600 rounded"
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
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
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
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 text-blue-400 transition-colors"
              >
                <Play className="w-4 h-4" />
                Beszéd Tesztelése Most
              </button>
            </div>
          )}

          {/* TAB 2: DISPLAY OPTIONS */}
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
                    className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold ${
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
                    className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold ${
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

              {/* What to show on Cockpit Display (User specific requirement!) */}
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
                    className="w-5 h-5 accent-blue-600 rounded"
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
                    className="w-5 h-5 accent-blue-600 rounded"
                  />
                </label>

                {/* Show Road Number */}
                <label className="flex items-center justify-between p-3.5 bg-zinc-800/40 border border-zinc-700/60 rounded-xl cursor-pointer hover:bg-zinc-800">
                  <span className="font-semibold text-sm">+ Út száma (pl. M7 jelvény)</span>
                  <input
                    type="checkbox"
                    checked={settings.displayOptions.showRoadNumber}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        displayOptions: { ...settings.displayOptions, showRoadNumber: e.target.checked },
                      })
                    }
                    className="w-5 h-5 accent-blue-600 rounded"
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
                    className="w-5 h-5 accent-blue-600 rounded"
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
                    className="w-5 h-5 accent-blue-600 rounded"
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
                    className="w-5 h-5 accent-blue-600 rounded"
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
                    className="w-5 h-5 accent-blue-600 rounded"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: DATA IMPORT/EXPORT */}
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
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors"
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
            className="py-2.5 px-6 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm rounded-xl transition-colors"
          >
            Kész
          </button>
        </div>
      </div>
    </div>
  );
};
