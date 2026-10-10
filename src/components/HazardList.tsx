import React, { useState } from 'react';
import { RoadHazard, AppSettings } from '../types';
import { getCardinalDirectionShort } from '../services/geoService';
import { speechService } from '../services/speechService';
import {
  Search,
  Volume2,
  Edit2,
  Trash2,
  Compass,
  Layers,
  MapPin,
  Calendar,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react';

interface HazardListProps {
  hazards: RoadHazard[];
  onEdit: (hazard: RoadHazard) => void;
  onDelete: (id: string) => void;
  settings: AppSettings;
}

const HAZARD_LABELS: Record<string, { label: string; icon: string }> = {
  pothole: { label: 'Kátyú', icon: '🕳️' },
  manhole: { label: 'Csatornafedél', icon: '🔘' },
  rutting: { label: 'Nyomvályú / Bordás', icon: '〰️' },
  crack: { label: 'Repedés', icon: '⚡' },
  subsidence: { label: 'Útsüllyedés', icon: '📉' },
  debris: { label: 'Akadály / Törmelék', icon: '⚠️' },
  speedbump: { label: 'Fekvőrendőr', icon: '🚧' },
  other: { label: 'Egyéb úthiba', icon: '❓' },
};

function getHazardEmoji(type: string): string {
  return HAZARD_LABELS[type]?.icon || '⚠️';
}

function getHazardLabel(type: string): string {
  return HAZARD_LABELS[type]?.label || type;
}

export const HazardList: React.FC<HazardListProps> = ({
  hazards,
  onEdit,
  onDelete,
  settings,
}) => {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const isDark = settings.theme === 'dark';

  const filteredHazards = hazards.filter((h) => {
    const q = (search || '').toLowerCase().trim();
    const rName = (h.roadName || '').toLowerCase();
    const rCity = (h.city || '').toLowerCase();
    const rNum = (h.roadNumber || '').toLowerCase();
    const rNotes = (h.notes || '').toLowerCase();

    const matchesSearch =
      !q ||
      rName.includes(q) ||
      rCity.includes(q) ||
      rNum.includes(q) ||
      rNotes.includes(q);

    const matchesType = selectedType === 'all' || h.hazardType === selectedType;

    return matchesSearch && matchesType;
  });

  const handleSpeak = (hazard: RoadHazard) => {
    speechService.announceHazardAlert(hazard, 200, settings.voiceOptions);
  };

  const handleConfirmDelete = (id: string) => {
    onDelete(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="flex flex-col h-full w-full p-3 sm:p-5 space-y-4">
      {/* Search & Filter Header */}
      <div
        className={`rounded-3xl p-4 border shadow-lg flex flex-col sm:flex-row gap-3 items-center justify-between ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
        }`}
      >
        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Keresés út, utca, város szerint..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-sm focus:outline-none ${
              isDark
                ? 'bg-zinc-800 border-zinc-700 text-white focus:border-red-500'
                : 'bg-zinc-100 border-zinc-300 text-zinc-900 focus:border-red-500'
            }`}
          />
        </div>

        {/* Hazard type filter tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              selectedType === 'all'
                ? 'bg-red-600 text-white shadow'
                : isDark
                ? 'bg-zinc-800 text-zinc-400 hover:text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            Összes ({hazards.length})
          </button>
          {Object.entries(HAZARD_LABELS).map(([tId, info]) => {
            const count = hazards.filter((h) => h.hazardType === tId).length;
            if (count === 0 && selectedType !== tId) return null;
            return (
              <button
                key={tId}
                type="button"
                onClick={() => setSelectedType(tId)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  selectedType === tId
                    ? 'bg-red-600 text-white shadow'
                    : isDark
                    ? 'bg-zinc-800 text-zinc-400 hover:text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                <span>{info.icon}</span>
                <span>{info.label}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hazard Cards List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {filteredHazards.length === 0 ? (
          <div
            className={`rounded-3xl p-12 text-center border ${
              isDark ? 'bg-zinc-900/50 border-zinc-800 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-600'
            }`}
          >
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-40 text-amber-500" />
            <h3 className="font-bold text-lg mb-1 text-white">Nincs megjeleníthető úthiba</h3>
            <p className="text-sm">
              {search ? 'Nem található a keresésnek megfelelő rögzített adat.' : 'Még nem rögzítettél úthibát. Kattints a térképre vagy nyomd meg a piros gombot!'}
            </p>
          </div>
        ) : (
          filteredHazards.map((hazard) => {
            const cardinal = getCardinalDirectionShort(hazard.heading || 0);
            const lateralHungarian =
              hazard.lateralPosition === 'left'
                ? 'Bal oldal'
                : hazard.lateralPosition === 'right'
                ? 'Jobb oldal'
                : 'Közép';

            const isDeleting = confirmDeleteId === hazard.id;

            return (
              <div
                key={hazard.id}
                className={`rounded-3xl p-4 sm:p-5 border shadow-md transition-all hover:border-zinc-500 ${
                  isDark
                    ? 'bg-zinc-900/90 border-zinc-800 text-white'
                    : 'bg-white border-zinc-200 text-zinc-900'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  {/* Location & Title */}
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl text-2xl shrink-0">
                      {getHazardEmoji(hazard.hazardType)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {hazard.roadNumber && (
                          <span className="px-2 py-0.5 rounded text-xs font-black bg-blue-600 text-white">
                            {hazard.roadNumber}
                          </span>
                        )}
                        <h4 className="font-bold text-base sm:text-lg">
                          {hazard.roadName || 'Névtelen útszakasz'}
                        </h4>
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {getHazardLabel(hazard.hazardType)}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {hazard.severity}
                        </span>
                      </div>

                      <div className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-red-500" />
                        <span>
                          {hazard.city || 'Helyszín'} {hazard.postcode ? `(${hazard.postcode})` : ''}
                        </span>
                        <span>•</span>
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{new Date(hazard.timestamp).toLocaleTimeString('hu-HU')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Edit, Delete, Read aloud */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleSpeak(hazard)}
                      className="p-2.5 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 transition-colors"
                      title="Felolvasás tesztelése"
                    >
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(hazard)}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Szerkesztés
                    </button>

                    {/* Inline Delete Confirmation without iframe-blocked window.confirm */}
                    {isDeleting ? (
                      <div className="flex items-center gap-1 bg-red-950/80 border border-red-500/60 p-1 rounded-xl">
                        <span className="text-[11px] font-bold text-red-300 px-1">Törlöd?</span>
                        <button
                          type="button"
                          onClick={() => handleConfirmDelete(hazard.id)}
                          className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-0.5"
                          title="Törlés megerősítése"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          Igen
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg transition-colors"
                          title="Mégse"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(hazard.id)}
                        className="p-2.5 rounded-xl text-red-400 hover:bg-red-500/10 hover:border-red-500/30 border border-transparent transition-colors"
                        title="Törlés"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Details Bar: Sávok, Pozíció, Irány */}
                <div
                  className={`mt-3 pt-3 border-t grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-medium ${
                    isDark ? 'border-zinc-800 text-zinc-300' : 'border-zinc-100 text-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>
                      {hazard.laneCount} sáv ({hazard.laneNumber}. sáv)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-amber-400">Elhelyezkedés:</span>
                    <span>{lateralHungarian}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-amber-400" />
                    <span>
                      Irány: {hazard.heading}° ({cardinal})
                    </span>
                  </div>

                  <div className="text-zinc-500 font-mono text-[11px] truncate">
                    GPS: {hazard.latitude.toFixed(4)}, {hazard.longitude.toFixed(4)}
                  </div>
                </div>

                {/* Notes banner */}
                {hazard.notes && (
                  <div className="mt-2.5 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
                    "{hazard.notes}"
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
