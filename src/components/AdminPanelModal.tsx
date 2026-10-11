import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Check,
  Search,
  Filter,
  User,
  Clock,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { RoadHazard, UserProfile } from '../types';
import {
  verifyHazardInCloud,
  resolveHazardInCloud,
  deleteHazardFromCloud,
} from '../services/firebase';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  user: UserProfile | null;
  hazards: RoadHazard[];
  onSelectHazard?: (hazard: RoadHazard) => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  isDark,
  user,
  hazards,
  onSelectHazard,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'verified' | 'resolved'>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const onlineHazards = hazards.filter((h) => h.isOnline !== false);

  const filtered = onlineHazards.filter((h) => {
    // Search by road, city, or reporter
    const matchesSearch =
      !searchTerm ||
      h.roadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.roadNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (h.userEmail && h.userEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (h.notes && h.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    // Status filter
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'verified'
        ? h.verifiedByAdmin
        : statusFilter === 'resolved'
        ? h.resolved
        : !h.verifiedByAdmin && !h.resolved;

    // Severity filter
    const matchesSeverity = severityFilter === 'all' || h.severity === severityFilter;

    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const countTotal = onlineHazards.length;
  const countVerified = onlineHazards.filter((h) => h.verifiedByAdmin).length;
  const countResolved = onlineHazards.filter((h) => h.resolved).length;
  const countPending = onlineHazards.filter((h) => !h.verifiedByAdmin && !h.resolved).length;

  const handleVerify = async (hazard: RoadHazard) => {
    setProcessingId(hazard.id);
    setActionMessage(null);
    try {
      await verifyHazardInCloud(hazard.id, !hazard.verifiedByAdmin);
      setActionMessage(
        hazard.verifiedByAdmin
          ? 'Admin jóváhagyás visszavonva.'
          : 'Úthiba sikeresen jóváhagyva és hitelesítve!'
      );
    } catch (e) {
      setActionMessage('Hiba történt a művelet során.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleResolve = async (hazard: RoadHazard) => {
    setProcessingId(hazard.id);
    setActionMessage(null);
    try {
      await resolveHazardInCloud(hazard.id, !hazard.resolved);
      setActionMessage(hazard.resolved ? 'Úthiba újra aktív státuszba helyezve.' : 'Úthiba megjelölve javítottként!');
    } catch (e) {
      setActionMessage('Hiba történt a művelet során.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (hazard: RoadHazard) => {
    if (!window.confirm(`Biztosan törölni szeretnéd a(z) "${hazard.roadName}" úthibát a felhőből?`)) {
      return;
    }
    setProcessingId(hazard.id);
    setActionMessage(null);
    try {
      await deleteHazardFromCloud(hazard.id);
      setActionMessage('Úthiba véglegesen törölve a felhő adatbázisból.');
    } catch (e) {
      setActionMessage('Hiba a törlés során.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-4xl max-h-[90vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
          isDark
            ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
            : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">Adminisztrációs & Moderációs Pult</h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Kiemelt Jogok
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Bejelentett úthibák jóváhagyása, állapotkezelése és felhő moderációja
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-2xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin info bar */}
        <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-300 font-medium">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Aktív Adminisztrátor: <strong>{user?.email || 'azqmodel@gmail.com'}</strong>
            </span>
          </div>
          {actionMessage && (
            <span className="text-emerald-400 font-bold animate-pulse">{actionMessage}</span>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-6 border-b border-zinc-800/60 bg-zinc-900/30">
          <div className="p-3.5 rounded-2xl border border-zinc-800 bg-zinc-900/50">
            <span className="text-xs font-bold text-zinc-400">Összes Online Úthiba</span>
            <div className="text-2xl font-black text-white mt-1">{countTotal}</div>
          </div>
          <div className="p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5">
            <span className="text-xs font-bold text-amber-400">Ellenőrzésre Vár</span>
            <div className="text-2xl font-black text-amber-400 mt-1">{countPending}</div>
          </div>
          <div className="p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
            <span className="text-xs font-bold text-emerald-400">Hitelesítve (Admin)</span>
            <div className="text-2xl font-black text-emerald-400 mt-1">{countVerified}</div>
          </div>
          <div className="p-3.5 rounded-2xl border border-blue-500/20 bg-blue-500/5">
            <span className="text-xs font-bold text-blue-400">Kijavítva</span>
            <div className="text-2xl font-black text-blue-400 mt-1">{countResolved}</div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 sm:p-6 border-b border-zinc-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Keresés út, település vagy bejelentő email alapján..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-zinc-800 bg-zinc-900/70 text-xs text-white placeholder-zinc-500 outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2.5 rounded-2xl border border-zinc-800 bg-zinc-900/70 text-xs font-bold text-zinc-300 outline-none"
            >
              <option value="all">Minden státusz</option>
              <option value="active">Ellenőrzésre vár</option>
              <option value="verified">Admin által hitelesített</option>
              <option value="resolved">Kijavított</option>
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2.5 rounded-2xl border border-zinc-800 bg-zinc-900/70 text-xs font-bold text-zinc-300 outline-none"
            >
              <option value="all">Minden súlyosság</option>
              <option value="critical">Kritikus</option>
              <option value="high">Súlyos</option>
              <option value="medium">Közepes</option>
              <option value="low">Enyhe</option>
            </select>
          </div>
        </div>

        {/* Hazards List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 text-xs space-y-2">
              <CheckCircle className="w-8 h-8 mx-auto text-zinc-600" />
              <p>Nincs a szűrésnek megfelelő felhő úthiba.</p>
            </div>
          ) : (
            filtered.map((hazard) => {
              const isBusy = processingId === hazard.id;

              return (
                <div
                  key={hazard.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    hazard.resolved
                      ? 'border-zinc-800/60 bg-zinc-900/30 opacity-70'
                      : hazard.verifiedByAdmin
                      ? 'border-emerald-500/30 bg-emerald-950/10'
                      : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                  }`}
                >
                  {/* Left hazard details */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-sm text-white">
                        {hazard.roadNumber ? `${hazard.roadNumber} - ` : ''}
                        {hazard.roadName}
                      </span>

                      {/* Verification badge */}
                      {hazard.verifiedByAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <ShieldCheck className="w-3 h-3" />
                          Hitelesítve
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Clock className="w-3 h-3" />
                          Megerősítésre vár
                        </span>
                      )}

                      {/* Resolved badge */}
                      {hazard.resolved && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          Kijavítva
                        </span>
                      )}

                      {/* Severity badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          hazard.severity === 'critical'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : hazard.severity === 'high'
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : hazard.severity === 'medium'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-zinc-700/30 text-zinc-400'
                        }`}
                      >
                        {hazard.severity}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                        {hazard.city || 'Ismeretlen helyszín'} ({hazard.latitude.toFixed(4)}, {hazard.longitude.toFixed(4)})
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-zinc-500" />
                        Bejelentő: <strong className="text-zinc-300">{hazard.userEmail || 'Anonim'}</strong>
                      </span>
                      <span>
                        Dátum: {new Date(hazard.timestamp).toLocaleString('hu-HU')}
                      </span>
                    </div>

                    {hazard.notes && (
                      <p className="text-xs text-zinc-300 bg-black/30 p-2 rounded-xl border border-zinc-800/60 font-mono">
                        Megjegyzés: {hazard.notes}
                      </p>
                    )}
                  </div>

                  {/* Admin Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800">
                    {/* View on map */}
                    {onSelectHazard && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectHazard(hazard);
                          onClose();
                        }}
                        className="px-3 py-2 rounded-xl border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                        title="Megtekintés a térképen"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}

                    {/* Verify button */}
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleVerify(hazard)}
                      className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                        hazard.verifiedByAdmin
                          ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          : 'bg-emerald-600 text-white shadow-md hover:bg-emerald-500'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      {hazard.verifiedByAdmin ? 'Hitelesítés törlése' : 'Jóváhagyás'}
                    </button>

                    {/* Resolve button */}
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleResolve(hazard)}
                      className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                        hazard.resolved
                          ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          : 'bg-blue-600 text-white shadow-md hover:bg-blue-500'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      {hazard.resolved ? 'Újranyitás' : 'Javítva'}
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleDelete(hazard)}
                      className="p-2 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                      title="Végleges törlés a felhőből"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
