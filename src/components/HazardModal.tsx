import React, { useState, useEffect } from 'react';
import { RoadHazard, HazardType, LateralPosition, Severity } from '../types';
import { getCardinalDirection, getCardinalDirectionShort } from '../services/geoService';
import {
  AlertTriangle,
  Compass,
  ArrowRight,
  RotateCw,
  Check,
  X,
  MapPin,
  CircleAlert,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface HazardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (hazard: RoadHazard) => void;
  initialHazard: Partial<RoadHazard> | null;
  isEditing?: boolean;
}

const HAZARD_TYPES: { id: HazardType; label: string; icon: string; desc: string }[] = [
  { id: 'pothole', label: 'Kátyú', icon: '🕳️', desc: 'Aszfalt hiány, lyuk a burkolatban' },
  { id: 'manhole', label: 'Csatornafedél', icon: '🔘', desc: 'Kiálló vagy besüllyedt fedlap / víznyelő' },
  { id: 'rutting', label: 'Nyomvályú / Bordás', icon: '〰️', desc: 'Mélységi bordásodás a keréknyomban' },
  { id: 'crack', label: 'Repedés', icon: '⚡', desc: 'Hosszanti vagy keresztirányú burkolathiba' },
  { id: 'subsidence', label: 'Útsüllyedés', icon: '📉', desc: 'Alapzat megsüllyedése, padkaleszakadás' },
  { id: 'debris', label: 'Akadály / Törmelék', icon: '⚠️', desc: 'Kő, gumiabroncs darab, tárgy az úton' },
  { id: 'speedbump', label: 'Fekvőrendőr', icon: '🚧', desc: 'Szabálytalan, sérült vagy lekopott egyenetlenség' },
  { id: 'other', label: 'Egyéb úthiba', icon: '❓', desc: 'Egyéb veszélyforrás' },
];

const SEVERITIES: { id: Severity; label: string; color: string; badgeClass: string }[] = [
  { id: 'low', label: 'Könnyű', color: 'emerald', badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { id: 'medium', label: 'Közepes', color: 'amber', badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { id: 'high', label: 'Súlyos', color: 'orange', badgeClass: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { id: 'critical', label: 'Kritikus (Veszélyes)', color: 'red', badgeClass: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

const QUICK_TAGS = [
  'Mély keréktörő',
  'Éles peremű',
  'Esőben nem látható',
  'Megdobja a kormányt',
  'Kikerülhetetlen',
  'Belső íven van',
];

export const HazardModal: React.FC<HazardModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialHazard,
  isEditing = false,
}) => {
  const [hazardType, setHazardType] = useState<HazardType>('pothole');
  const [laneCount, setLaneCount] = useState<number>(2);
  const [lateralPosition, setLateralPosition] = useState<LateralPosition>('right');
  const [laneNumber, setLaneNumber] = useState<number>(2);
  const [severity, setSeverity] = useState<Severity>('medium');
  const [heading, setHeading] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [roadName, setRoadName] = useState<string>('');
  const [roadNumber, setRoadNumber] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [postcode, setPostcode] = useState<string>('');
  const [lat, setLat] = useState<number>(47.4979);
  const [lon, setLon] = useState<number>(19.0402);
  const [speed, setSpeed] = useState<number>(0);

  useEffect(() => {
    if (initialHazard) {
      setHazardType(initialHazard.hazardType || 'pothole');
      setLaneCount(initialHazard.laneCount || 2);
      setLateralPosition(initialHazard.lateralPosition || 'right');
      setLaneNumber(initialHazard.laneNumber || 2);
      setSeverity(initialHazard.severity || 'medium');
      setHeading(Math.round(initialHazard.heading ?? 0));
      setNotes(initialHazard.notes || '');
      setRoadName(initialHazard.roadName || '');
      setRoadNumber(initialHazard.roadNumber || '');
      setCity(initialHazard.city || '');
      setPostcode(initialHazard.postcode || '');
      setLat(initialHazard.latitude ?? 47.4979);
      setLon(initialHazard.longitude ?? 19.0402);
      setSpeed(Math.round(initialHazard.speed ?? 0));
    }
  }, [initialHazard, isOpen]);

  if (!isOpen) return null;

  const handleInvertDirection = () => {
    setHeading((prev) => (prev + 180) % 360);
  };

  const handleQuickTagClick = (tag: string) => {
    setNotes((prev) => {
      if (!prev) return tag;
      if (prev.includes(tag)) return prev;
      return `${prev}, ${tag}`;
    });
  };

  const handleSave = () => {
    const finalHazard: RoadHazard = {
      id: initialHazard?.id || `hazard-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: initialHazard?.timestamp || Date.now(),
      latitude: lat,
      longitude: lon,
      heading: (heading % 360 + 360) % 360,
      speed,
      accuracy: initialHazard?.accuracy || 5,
      roadNumber: roadNumber.trim(),
      roadName: roadName.trim() || 'Névtelen útszakasz',
      city: city.trim() || 'Helyszín',
      postcode: postcode.trim(),
      laneCount: Math.max(1, laneCount),
      lateralPosition,
      laneNumber: Math.min(laneNumber, laneCount),
      hazardType,
      severity,
      notes: notes.trim(),
    };

    onSave(finalHazard);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-3xl shadow-2xl text-white overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header with High-Contrast Status */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 px-6 py-4 flex items-center justify-between text-white shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black/25 rounded-2xl backdrop-blur-sm">
              <AlertTriangle className="w-7 h-7 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                {isEditing ? 'Úthiba Szerkesztése' : 'Úthiba Rögzítése'}
              </h2>
              <p className="text-xs sm:text-sm text-white/90 font-medium">
                GPS pozíció rögzítve • {lat.toFixed(5)}, {lon.toFixed(5)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-black/20 rounded-full transition-colors"
            title="Bezárás"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-zinc-100 flex-1">
          {/* Location Summary Strip */}
          <div className="bg-zinc-800/90 border border-zinc-700/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  {roadNumber && (
                    <span className="px-2 py-0.5 text-xs font-black bg-blue-600 text-white rounded">
                      {roadNumber}
                    </span>
                  )}
                  <span className="font-bold text-base text-zinc-100">
                    {roadName || 'Jelenlegi útszakasz'}
                  </span>
                </div>
                <div className="text-xs text-zinc-400">
                  {city} {postcode ? `(${postcode})` : ''}
                </div>
              </div>
            </div>

            {/* Direction Pill (Crucial requirement: defect is direction specific!) */}
            <div className="bg-zinc-950/80 border border-zinc-700 px-3 py-1.5 rounded-xl flex items-center gap-2 text-amber-400 font-mono text-sm font-bold">
              <Compass className="w-4 h-4 text-amber-400" />
              <span>{heading}°</span>
              <span className="text-xs text-zinc-300">({getCardinalDirectionShort(heading)})</span>
            </div>
          </div>

          {/* 1. Hazard Type Picker */}
          <div>
            <label className="block text-sm font-bold text-zinc-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <CircleAlert className="w-4 h-4 text-red-400" />
              Úthiba Fajtája
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {HAZARD_TYPES.map((t) => {
                const isSelected = hazardType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setHazardType(t.id)}
                    className={`p-3 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-red-500/20 border-red-500 text-white ring-2 ring-red-500/40'
                        : 'bg-zinc-800/60 border-zinc-700/70 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <div className="text-2xl mb-1">{t.icon}</div>
                    <div className="font-bold text-sm leading-snug">{t.label}</div>
                    <div className="text-[11px] text-zinc-400 mt-1 line-clamp-1">{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Lateral Position (Bal, Közép, Jobb) - User specifically requested! */}
          <div className="bg-zinc-800/40 border border-zinc-700/70 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Pozíció a sávban / Úttesten
              </label>
              <span className="text-xs text-zinc-400">
                Kiválasztva: {lateralPosition === 'left' ? 'Bal oldal' : lateralPosition === 'center' ? 'Közép' : 'Jobb oldal'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setLateralPosition('left')}
                className={`py-3.5 px-3 rounded-2xl border text-center font-bold text-sm sm:text-base transition-all flex flex-col items-center gap-1 ${
                  lateralPosition === 'left'
                    ? 'bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-600/30'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-750'
                }`}
              >
                <div className="text-xl">⬅️</div>
                <span>BAL OLDAL</span>
                <span className="text-[10px] font-normal opacity-80">Bal padka felé</span>
              </button>

              <button
                type="button"
                onClick={() => setLateralPosition('center')}
                className={`py-3.5 px-3 rounded-2xl border text-center font-bold text-sm sm:text-base transition-all flex flex-col items-center gap-1 ${
                  lateralPosition === 'center'
                    ? 'bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-600/30'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-750'
                }`}
              >
                <div className="text-xl">⏺️</div>
                <span>KÖZÉP</span>
                <span className="text-[10px] font-normal opacity-80">Sáv közepén</span>
              </button>

              <button
                type="button"
                onClick={() => setLateralPosition('right')}
                className={`py-3.5 px-3 rounded-2xl border text-center font-bold text-sm sm:text-base transition-all flex flex-col items-center gap-1 ${
                  lateralPosition === 'right'
                    ? 'bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-600/30'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-750'
                }`}
              >
                <div className="text-xl">➡️</div>
                <span>JOBB OLDAL</span>
                <span className="text-[10px] font-normal opacity-80">Jobb szél / padka</span>
              </button>
            </div>
          </div>

          {/* 3. Lanes count & Target Lane */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Number of lanes in current direction */}
            <div className="bg-zinc-800/40 border border-zinc-700/70 p-4 rounded-2xl">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 block">
                Menetirány szerinti sávok száma
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => {
                      setLaneCount(count);
                      if (laneNumber > count) setLaneNumber(count);
                    }}
                    className={`flex-1 py-2.5 rounded-xl font-black text-sm border transition-all ${
                      laneCount === count
                        ? 'bg-amber-500 text-black border-amber-400 font-extrabold'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Which lane index in this direction */}
            <div className="bg-zinc-800/40 border border-zinc-700/70 p-4 rounded-2xl">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 block">
                Érintett sáv a menetirányodban
              </label>
              <div className="flex items-center gap-2">
                {Array.from({ length: laneCount }, (_, i) => i + 1).map((laneIdx) => (
                  <button
                    key={laneIdx}
                    type="button"
                    onClick={() => setLaneNumber(laneIdx)}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm border transition-all ${
                      laneNumber === laneIdx
                        ? 'bg-blue-600 text-white border-blue-400'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                    }`}
                  >
                    {laneIdx}. sáv
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Direction (Heading) - STRICT REQUIREMENT: defect applies only to this direction! */}
          <div className="bg-zinc-800/50 border border-zinc-700/80 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <Compass className="w-4 h-4 text-amber-400" />
                  Érvényes Haladási Irány
                </label>
                <p className="text-xs text-zinc-400">
                  Az úthiba csak ebben az irányban haladva jelent veszélyt!
                </p>
              </div>

              <button
                type="button"
                onClick={handleInvertDirection}
                className="px-3 py-1.5 text-xs font-bold bg-zinc-750 hover:bg-zinc-700 border border-zinc-600 rounded-xl flex items-center gap-1.5 text-amber-300 transition-colors"
                title="Ellentétes irányba fordítás (180 fok)"
              >
                <RotateCw className="w-3.5 h-3.5" />
                180° Fordítás
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 shrink-0 rounded-full border-2 border-amber-400/60 bg-zinc-950 flex items-center justify-center shadow-inner">
                {/* Arrow rotating to current heading */}
                <div
                  className="w-10 h-10 flex items-center justify-center transition-transform duration-200"
                  style={{ transform: `rotate(${heading}deg)` }}
                >
                  <ArrowRight className="w-6 h-6 text-amber-400 stroke-[3]" />
                </div>
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="flex justify-between text-xs font-mono font-bold text-zinc-300">
                  <span>{heading}° fok</span>
                  <span className="text-amber-400">{getCardinalDirection(heading)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="359"
                  value={heading}
                  onChange={(e) => setHeading(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer h-2 bg-zinc-700 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-zinc-400 font-bold">
                  <span>É (0°)</span>
                  <span>K (90°)</span>
                  <span>D (180°)</span>
                  <span>NY (270°)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Severity Picker */}
          <div>
            <label className="block text-sm font-bold text-zinc-300 uppercase tracking-wider mb-2.5">
              Veszélyességi Fokozat (Súlyosság)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SEVERITIES.map((s) => {
                const isSelected = severity === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSeverity(s.id)}
                    className={`py-3 px-2 rounded-xl text-center font-bold text-xs sm:text-sm border transition-all ${
                      isSelected
                        ? `${s.badgeClass} ring-2 ring-white/20 font-black`
                        : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Quick Tags & Notes */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-zinc-300 uppercase tracking-wider">
              Megjegyzés / Részletek (Opcionális)
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleQuickTagClick(tag)}
                  className="text-xs px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="pl. Mély kátyú közvetlenül a felfestés mellett, sötétben nehezen látható..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Editable Road Details */}
          <details className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-3 text-xs">
            <summary className="font-bold text-zinc-300 cursor-pointer hover:text-white flex items-center justify-between">
              <span>Helyszíni adatok finomhangolása (Utca, Útszám, Település)</span>
              <ChevronRight className="w-4 h-4" />
            </summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-zinc-700/50">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Út neve / Utca</label>
                <input
                  type="text"
                  value={roadName}
                  onChange={(e) => setRoadName(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Út száma (pl. M7, 8, 6101)</label>
                <input
                  type="text"
                  value={roadNumber}
                  onChange={(e) => setRoadNumber(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Település</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Irányítószám</label>
                <input
                  type="text"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-sm text-white"
                />
              </div>
            </div>
          </details>
        </div>

        {/* Footer Actions with Big Buttons */}
        <div className="bg-zinc-950 p-4 sm:p-5 border-t border-zinc-800 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-sm sm:text-base transition-colors"
          >
            Mégse
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-[2] py-3.5 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-base sm:text-lg shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-transform active:scale-98"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            {isEditing ? 'Módosítások Mentése' : 'Úthiba Rögzítése'}
          </button>
        </div>
      </div>
    </div>
  );
};
