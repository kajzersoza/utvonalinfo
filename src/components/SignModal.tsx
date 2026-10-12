import React, { useState, useEffect } from 'react';
import { OSMFeature, TrafficSignCategory, RoadInfo, GPSState } from '../types';
import {
  X,
  Check,
  MapPin,
  Trash2,
  Gauge,
  Building2,
  Ban,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface SignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSign: (sign: OSMFeature) => void;
  onDeleteSign?: (id: string) => void;
  userSigns: OSMFeature[];
  gps: GPSState;
  roadInfo: RoadInfo;
}

const SPEED_PRESETS = [30, 40, 50, 60, 70, 80, 90, 100, 110, 130];
const SPEED_END_PRESETS = [30, 50, 60, 70, 80, 90];

export const SignModal: React.FC<SignModalProps> = ({
  isOpen,
  onClose,
  onSaveSign,
  onDeleteSign,
  userSigns,
  gps,
  roadInfo,
}) => {
  const [activeTab, setActiveTab] = useState<TrafficSignCategory>('speed_limit');
  const [modalView, setModalView] = useState<'create' | 'list'>('create');

  // Speed Limit state
  const [speedLimitVal, setSpeedLimitVal] = useState<number>(50);
  const [customSpeed, setCustomSpeed] = useState<string>('50');

  // Speed Limit End state
  const [endSpeedType, setEndSpeedType] = useState<'general' | 'specific'>('general');
  const [endSpeedVal, setEndSpeedVal] = useState<number>(50);

  // City Limit Start state
  const [cityNameStart, setCityNameStart] = useState<string>('');
  const [citySpeedLimit, setCitySpeedLimit] = useState<number>(50);

  // City Limit End state
  const [cityNameEnd, setCityNameEnd] = useState<string>('');
  const [afterCitySpeedLimit, setAfterCitySpeedLimit] = useState<number>(90);

  // Description / Note
  const [description, setDescription] = useState<string>('');

  // Prefill city name when modal opens
  useEffect(() => {
    if (isOpen) {
      const detectedCity = (roadInfo.city || '').replace(/.*district\s*/i, '').trim();
      const fallbackCity = detectedCity || 'Budapest';
      setCityNameStart(fallbackCity);
      setCityNameEnd(fallbackCity);
      setDescription('');
      setModalView('create');
    }
  }, [isOpen, roadInfo.city]);

  if (!isOpen) return null;

  const handleSave = () => {
    const timestamp = Date.now();
    const id = `user-sign-${timestamp}-${Math.random().toString(36).substring(2, 7)}`;

    let sign: OSMFeature;

    if (activeTab === 'speed_limit') {
      const speed = parseInt(customSpeed, 10) || speedLimitVal || 50;
      sign = {
        id,
        type: 'traffic_sign',
        signCategory: 'speed_limit',
        name: `Sebességkorlátozás ${speed} km/h`,
        latitude: gps.latitude,
        longitude: gps.longitude,
        speedLimit: speed,
        isEnd: false,
        userAdded: true,
        roadName: roadInfo.roadName,
        roadNumber: roadInfo.roadNumber,
        timestamp,
        description: description.trim() || `Sebességkorlátozás ${speed} km/h tábla`,
      };
    } else if (activeTab === 'speed_limit_end') {
      const isGeneral = endSpeedType === 'general';
      sign = {
        id,
        type: 'traffic_sign',
        signCategory: 'speed_limit_end',
        name: isGeneral
          ? 'Sebességkorlátozás vége (Feloldó tábla)'
          : `Sebességkorlátozás vége (${endSpeedVal} km/h)`,
        latitude: gps.latitude,
        longitude: gps.longitude,
        speedLimit: isGeneral ? undefined : endSpeedVal,
        isEnd: true,
        userAdded: true,
        roadName: roadInfo.roadName,
        roadNumber: roadInfo.roadNumber,
        timestamp,
        description: description.trim() || (isGeneral ? 'Minden korlátozás vége tábla' : `${endSpeedVal} km/h korlátozás vége tábla`),
      };
    } else if (activeTab === 'city_limit_start') {
      const cleanCity = cityNameStart.trim() || 'Település';
      sign = {
        id,
        type: 'city_limit',
        signCategory: 'city_limit_start',
        name: `${cleanCity} lakott terület kezdete`,
        cityLimitName: cleanCity,
        latitude: gps.latitude,
        longitude: gps.longitude,
        speedLimit: citySpeedLimit,
        isEnd: false,
        userAdded: true,
        roadName: roadInfo.roadName,
        roadNumber: roadInfo.roadNumber,
        timestamp,
        description: description.trim() || `${cleanCity} várostábla (${citySpeedLimit} km/h)`,
      };
    } else {
      // city_limit_end
      const cleanCity = cityNameEnd.trim() || 'Település';
      sign = {
        id,
        type: 'city_limit',
        signCategory: 'city_limit_end',
        name: `${cleanCity} lakott terület vége`,
        cityLimitName: cleanCity,
        latitude: gps.latitude,
        longitude: gps.longitude,
        speedLimit: afterCitySpeedLimit,
        isEnd: true,
        userAdded: true,
        roadName: roadInfo.roadName,
        roadNumber: roadInfo.roadNumber,
        timestamp,
        description: description.trim() || `${cleanCity} vége várostábla (${afterCitySpeedLimit} km/h)`,
      };
    }

    onSaveSign(sign);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-700/80 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-white">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-xl">
              🛑
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
                Közlekedési Tábla Rögzítése
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span className="truncate max-w-[280px] sm:max-w-[360px]">
                  {roadInfo.roadName || 'Jelenlegi pozíció'} {roadInfo.roadNumber ? `(${roadInfo.roadNumber})` : ''} • {roadInfo.city || ''}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle (Create vs List) */}
            <button
              type="button"
              onClick={() => setModalView(modalView === 'create' ? 'list' : 'create')}
              className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-zinc-300 transition-colors"
            >
              {modalView === 'create' ? `Saját táblák (${userSigns.length})` : '➕ Új tábla'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              title="Bezárás"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {modalView === 'list' ? (
          /* List of User Signs View */
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-300">
                Eddig rögzített saját tábláid ({userSigns.length} db)
              </h3>
            </div>

            {userSigns.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 flex flex-col items-center gap-3">
                <div className="text-4xl">🚏</div>
                <p className="text-sm">Még nem rögzítettél egyéni táblát.</p>
                <button
                  type="button"
                  onClick={() => setModalView('create')}
                  className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  ➕ Tábla rögzítése most
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {userSigns.map((sign) => {
                  const isSpeed = sign.signCategory === 'speed_limit' || (!sign.signCategory && sign.type === 'traffic_sign' && !sign.isEnd);
                  const isEnd = sign.isEnd || sign.signCategory === 'speed_limit_end' || sign.signCategory === 'city_limit_end';
                  const isCity = sign.type === 'city_limit' || sign.signCategory === 'city_limit_start' || sign.signCategory === 'city_limit_end';

                  return (
                    <div
                      key={sign.id}
                      className="p-3.5 bg-zinc-800/60 border border-zinc-700/60 rounded-2xl flex items-center justify-between gap-3 hover:border-zinc-600 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Mini Visual Badge */}
                        {isCity ? (
                          <div className={`px-2.5 py-1 rounded bg-white text-black font-black text-xs uppercase tracking-wider border-2 ${isEnd ? 'border-red-600 line-through text-zinc-600' : 'border-black'}`}>
                            {sign.cityLimitName || 'Város'}
                          </div>
                        ) : isSpeed && !isEnd ? (
                          <div className="w-9 h-9 rounded-full bg-white text-black border-3 border-red-600 flex items-center justify-center font-black text-xs shadow-sm shrink-0">
                            {sign.speedLimit || '50'}
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-white text-zinc-700 border-2 border-zinc-500 flex items-center justify-center font-black text-xs shadow-sm shrink-0 relative overflow-hidden">
                            <span className="line-through">{sign.speedLimit || '⚡'}</span>
                            <div className="absolute inset-0 border-t-2 border-zinc-700 rotate-45 top-1/2"></div>
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="font-bold text-sm text-zinc-100 truncate">
                            {sign.name}
                          </div>
                          <div className="text-xs text-zinc-400 font-mono flex items-center gap-2 truncate">
                            <span>{sign.roadName || 'Helyszín'}</span>
                            {sign.speedLimit && (
                              <span className="text-amber-400 font-bold">
                                {sign.speedLimit} km/h
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {onDeleteSign && (
                        <button
                          type="button"
                          onClick={() => onDeleteSign(sign.id)}
                          className="p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                          title="Tábla törlése"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Sign Creation View */
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Category Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 bg-zinc-950/70 border border-zinc-800 rounded-2xl">
              {/* 1. Sebességkorlátozó */}
              <button
                type="button"
                onClick={() => setActiveTab('speed_limit')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 text-center ${
                  activeTab === 'speed_limit'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-white text-red-600 border border-red-600 flex items-center justify-center text-[9px] font-black">
                  50
                </div>
                <span>Sebességkorlát</span>
              </button>

              {/* 2. Sebességkorlátozás vége */}
              <button
                type="button"
                onClick={() => setActiveTab('speed_limit_end')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 text-center ${
                  activeTab === 'speed_limit_end'
                    ? 'bg-zinc-200 text-zinc-900 shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-white text-zinc-800 border border-zinc-500 flex items-center justify-center text-[9px] font-black line-through">
                  50
                </div>
                <span>Korlátozás vége</span>
              </button>

              {/* 3. Település kezdete */}
              <button
                type="button"
                onClick={() => setActiveTab('city_limit_start')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 text-center ${
                  activeTab === 'city_limit_start'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Település kezdete</span>
              </button>

              {/* 4. Település vége */}
              <button
                type="button"
                onClick={() => setActiveTab('city_limit_end')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 text-center ${
                  activeTab === 'city_limit_end'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <div className="relative">
                  <Building2 className="w-4 h-4 text-white" />
                  <div className="absolute inset-0 border-t-2 border-red-500 rotate-45 top-1/2"></div>
                </div>
                <span>Település vége</span>
              </button>
            </div>

            {/* TAB CONTENT 1: Sebességkorlátozó tábla */}
            {activeTab === 'speed_limit' && (
              <div className="space-y-4 animate-fade-in">
                {/* Visual Live Sign Preview */}
                <div className="flex flex-col items-center justify-center py-4 bg-zinc-950/40 rounded-2xl border border-zinc-800">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white border-8 border-red-600 flex items-center justify-center shadow-xl shadow-red-600/20 transform transition-transform duration-200 hover:scale-105 select-none">
                    <span className="text-3xl sm:text-4xl font-black text-black font-mono tracking-tighter">
                      {parseInt(customSpeed, 10) || speedLimitVal}
                    </span>
                  </div>
                  <span className="mt-2 text-xs font-bold text-zinc-400">
                    Megengedett legnagyobb sebesség: {parseInt(customSpeed, 10) || speedLimitVal} km/h
                  </span>
                </div>

                {/* Preset Speed Buttons */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-2">
                    Gyakori sebességértékek (km/h):
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {SPEED_PRESETS.map((val) => {
                      const isSelected = (parseInt(customSpeed, 10) || speedLimitVal) === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            setSpeedLimitVal(val);
                            setCustomSpeed(val.toString());
                          }}
                          className={`py-2 rounded-xl font-mono font-black text-sm transition-all border ${
                            isSelected
                              ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/30 scale-102'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                          }`}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom speed input */}
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-zinc-400 shrink-0">
                    Egyedi érték:
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="150"
                    step="5"
                    value={customSpeed}
                    onChange={(e) => {
                      setCustomSpeed(e.target.value);
                      const parsed = parseInt(e.target.value, 10);
                      if (!isNaN(parsed)) setSpeedLimitVal(parsed);
                    }}
                    className="w-28 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-xl font-mono text-center font-bold text-white focus:outline-none focus:border-red-500"
                    placeholder="pl. 45"
                  />
                  <span className="text-xs text-zinc-400 font-bold">km/h</span>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: Sebességkorlátozás vége */}
            {activeTab === 'speed_limit_end' && (
              <div className="space-y-4 animate-fade-in">
                {/* Visual Live Sign Preview */}
                <div className="flex flex-col items-center justify-center py-4 bg-zinc-950/40 rounded-2xl border border-zinc-800">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white border-4 border-zinc-500 flex items-center justify-center shadow-xl relative overflow-hidden select-none">
                    {endSpeedType === 'general' ? (
                      /* 5 diagonal parallel lines across the white sign */
                      <div className="w-full h-full relative flex items-center justify-center">
                        <div className="w-1.5 h-36 bg-zinc-800 -rotate-45 absolute -translate-x-4"></div>
                        <div className="w-1.5 h-36 bg-zinc-800 -rotate-45 absolute -translate-x-2"></div>
                        <div className="w-1.5 h-36 bg-zinc-800 -rotate-45 absolute"></div>
                        <div className="w-1.5 h-36 bg-zinc-800 -rotate-45 absolute translate-x-2"></div>
                        <div className="w-1.5 h-36 bg-zinc-800 -rotate-45 absolute translate-x-4"></div>
                      </div>
                    ) : (
                      /* Specific speed crossed out */
                      <div className="w-full h-full relative flex items-center justify-center">
                        <span className="text-3xl sm:text-4xl font-black text-zinc-600 font-mono tracking-tighter">
                          {endSpeedVal}
                        </span>
                        <div className="w-1.5 h-36 bg-zinc-800 -rotate-45 absolute"></div>
                        <div className="w-1.5 h-36 bg-zinc-800 -rotate-45 absolute -translate-x-2"></div>
                        <div className="w-1.5 h-36 bg-zinc-800 -rotate-45 absolute translate-x-2"></div>
                      </div>
                    )}
                  </div>
                  <span className="mt-2 text-xs font-bold text-zinc-400">
                    {endSpeedType === 'general'
                      ? 'Minden sebességkorlátozás vége (Feloldó tábla)'
                      : `${endSpeedVal} km/h sebességkorlátozás vége`}
                  </span>
                </div>

                {/* Sub-type selection */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEndSpeedType('general')}
                    className={`p-3 rounded-2xl text-left border transition-all ${
                      endSpeedType === 'general'
                        ? 'bg-zinc-800 border-zinc-300 text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-sm">Általános feloldó tábla</div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      Minden korábbi korlátozás vége
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEndSpeedType('specific')}
                    className={`p-3 rounded-2xl text-left border transition-all ${
                      endSpeedType === 'specific'
                        ? 'bg-zinc-800 border-zinc-300 text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-sm">Konkrét sebesség vége</div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      Adott sebességkorlát feloldása
                    </div>
                  </button>
                </div>

                {endSpeedType === 'specific' && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-2">
                      Melyik korlátozás ér véget:
                    </label>
                    <div className="grid grid-cols-6 gap-2">
                      {SPEED_END_PRESETS.map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setEndSpeedVal(val)}
                          className={`py-2 rounded-xl font-mono font-black text-sm border transition-all ${
                            endSpeedVal === val
                              ? 'bg-zinc-200 text-zinc-900 border-white'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 3: Település kezdete */}
            {activeTab === 'city_limit_start' && (
              <div className="space-y-4 animate-fade-in">
                {/* Visual Live Sign Preview: Hungarian Town Sign */}
                <div className="flex flex-col items-center justify-center py-4 bg-zinc-950/40 rounded-2xl border border-zinc-800">
                  <div className="px-6 py-3 bg-white border-4 border-black rounded-lg shadow-xl text-black font-black text-xl sm:text-2xl tracking-wider uppercase font-sans select-none max-w-full truncate">
                    {cityNameStart.trim() || 'BUDAPEST'}
                  </div>
                  <span className="mt-2 text-xs font-bold text-emerald-400">
                    Lakott terület kezdete • Megengedett sebesség: {citySpeedLimit} km/h
                  </span>
                </div>

                {/* Settlement Name Input */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">
                    Település neve (táblán szereplő felirat):
                  </label>
                  <input
                    type="text"
                    value={cityNameStart}
                    onChange={(e) => setCityNameStart(e.target.value)}
                    placeholder="pl. Budapest, Budaörs, Érd"
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-2xl font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Built-up speed limit */}
                <div className="flex items-center justify-between p-3 bg-zinc-950/60 rounded-2xl border border-zinc-800">
                  <div>
                    <div className="text-xs font-bold text-zinc-300">
                      Lakott területi alapértelmezett sebesség
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      KRESZ szerint 50 km/h személygépkocsival
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[40, 50, 60, 70].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => setCitySpeedLimit(spd)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                          citySpeedLimit === spd
                            ? 'bg-emerald-600 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {spd}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: Település vége */}
            {activeTab === 'city_limit_end' && (
              <div className="space-y-4 animate-fade-in">
                {/* Visual Live Sign Preview: Hungarian Town End Sign (Red slash) */}
                <div className="flex flex-col items-center justify-center py-4 bg-zinc-950/40 rounded-2xl border border-zinc-800">
                  <div className="relative px-6 py-3 bg-white border-4 border-black rounded-lg shadow-xl text-black font-black text-xl sm:text-2xl tracking-wider uppercase font-sans select-none overflow-hidden max-w-full">
                    <span className="truncate block">
                      {cityNameEnd.trim() || 'BUDAPEST'}
                    </span>
                    {/* Diagonal red strike-through bar */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-[120%] h-2.5 bg-red-600 -rotate-15"></div>
                    </div>
                  </div>
                  <span className="mt-2 text-xs font-bold text-amber-400">
                    Lakott terület vége • Megengedett sebesség: {afterCitySpeedLimit} km/h
                  </span>
                </div>

                {/* Settlement Name Input */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">
                    Település neve (amely véget ér):
                  </label>
                  <input
                    type="text"
                    value={cityNameEnd}
                    onChange={(e) => setCityNameEnd(e.target.value)}
                    placeholder="pl. Budapest, Budaörs"
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-2xl font-bold text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Post-town speed limit */}
                <div className="flex items-center justify-between p-3 bg-zinc-950/60 rounded-2xl border border-zinc-800">
                  <div>
                    <div className="text-xs font-bold text-zinc-300">
                      Településen kívüli sebességhatár
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      Országúton 90 km/h, autóúton 110 km/h
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[70, 90, 100, 110].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => setAfterCitySpeedLimit(spd)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                          afterCitySpeedLimit === spd
                            ? 'bg-amber-600 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {spd}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Common Notes / Description */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-1">
                Megjegyzés (opcionális):
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="pl. Útfelújítás miatt ideiglenes tábla, sárga alappal"
                className="w-full px-3.5 py-2 bg-zinc-800/80 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="p-4 sm:p-5 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 sm:px-5 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
          >
            Mégse
          </button>

          {modalView === 'create' && (
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 max-w-xs py-3 px-5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-sm sm:text-base shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-transform active:scale-97 cursor-pointer"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>TÁBLA RÖGZÍTÉSE</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
