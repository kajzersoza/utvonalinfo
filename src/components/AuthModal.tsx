import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  UserCheck,
  LogIn,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ArrowRight,
  Copy,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  resetPassword,
} from '../services/firebase';
import firebaseConfig from '../../firebase-applet-config.json';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  isDark,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedHost, setCopiedHost] = useState(false);
  const [showDomainGuide, setShowDomainGuide] = useState(false);

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const firebaseSettingsUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;

  const copyHostToClipboard = () => {
    if (currentHost && navigator.clipboard) {
      navigator.clipboard.writeText(currentHost);
      setCopiedHost(true);
      setTimeout(() => setCopiedHost(false), 2500);
    }
  };

  const handleAuthError = (err: unknown) => {
    const raw = err instanceof Error ? err.message : String(err);
    if (raw.includes('unauthorized-domain')) {
      setShowDomainGuide(true);
      return 'A Google bejelentkezéshez ezt a webcímet (domaint) engedélyezni kell a Firebase Konzolban. Lásd a lenti lépéseket, vagy használd a közvetlen Email + Jelszó regisztrációt!';
    }
    if (raw.includes('auth/invalid-email')) {
      return 'Érvénytelen formátumú email cím!';
    }
    if (raw.includes('auth/user-not-found') || raw.includes('auth/wrong-password') || raw.includes('auth/invalid-credential')) {
      return 'Hibás email cím vagy jelszó!';
    }
    if (raw.includes('auth/email-already-in-use')) {
      return 'Ez az email cím már regisztrálva van! Jelentkezz be!';
    }
    if (raw.includes('auth/weak-password')) {
      return 'A jelszónak legalább 6 karakter hosszúnak kell lennie!';
    }
    if (raw.includes('auth/popup-closed-by-user')) {
      return 'A bejelentkező ablak be lett zárva.';
    }
    return `Hiba történt: ${raw}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim()) {
      setErrorMsg('Add meg az email címedet!');
      return;
    }

    if (mode === 'forgot') {
      try {
        setLoading(true);
        await resetPassword(email.trim());
        setSuccessMsg('Jelszó-visszaállító link kiküldve a megadott címre!');
      } catch (err) {
        setErrorMsg(handleAuthError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      setErrorMsg('Add meg a jelszavad!');
      return;
    }

    if (mode === 'register') {
      if (password.length < 6) {
        setErrorMsg('A jelszónak legalább 6 karakter hosszúnak kell lennie!');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('A két jelszó nem egyezik!');
        return;
      }
    }

    try {
      setLoading(true);
      if (mode === 'register') {
        await registerWithEmail(email.trim(), password);
        setSuccessMsg('Sikeres regisztráció és belépés!');
      } else {
        await loginWithEmail(email.trim(), password);
        setSuccessMsg('Sikeres bejelentkezés!');
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setErrorMsg(handleAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      setLoading(true);
      await loginWithGoogle();
      setSuccessMsg('Sikeres Google bejelentkezés!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setErrorMsg(handleAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
          isDark
            ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
            : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-zinc-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                {mode === 'login'
                  ? 'Bejelentkezés'
                  : mode === 'register'
                  ? 'Fiók Létrehozása'
                  : 'Elfelejtett Jelszó'}
              </h2>
              <p className="text-xs text-zinc-400">
                {mode === 'login'
                  ? 'Lépj be az online felhő adatokhoz és szinkronhoz'
                  : mode === 'register'
                  ? 'Regisztrálj ingyenes felhő tárhellyel'
                  : 'Kérj jelszó-visszaállítást emailben'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 p-2 mx-6 mt-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-xl transition-all flex items-center justify-center gap-2 ${
                mode === 'login'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Bejelentkezés
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-xl transition-all flex items-center justify-center gap-2 ${
                mode === 'register'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Regisztráció
            </button>
          </div>
        )}

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Email field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400">Email Cím</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pelda@domain.hu"
                className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-sm outline-none transition-all ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-800 text-white focus:border-blue-500'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-blue-500'
                }`}
              />
            </div>
          </div>

          {/* Password fields */}
          {mode !== 'forgot' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-400">Jelszó</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMsg(null);
                    }}
                    className="text-[11px] text-blue-400 hover:underline"
                  >
                    Elfelejtett jelszó?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Legalább 6 karakter"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-sm outline-none transition-all ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-800 text-white focus:border-blue-500'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-blue-500'
                  }`}
                />
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400">Jelszó megerősítése</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Jelszó ismétlése"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-sm outline-none transition-all ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-800 text-white focus:border-blue-500'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-blue-500'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl font-black text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? (
              <span className="animate-pulse">Feldolgozás...</span>
            ) : mode === 'login' ? (
              <>
                <span>Belépés a Fiókba</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : mode === 'register' ? (
              <>
                <span>Regisztráció és Kezdés</span>
                <CheckCircle2 className="w-4 h-4" />
              </>
            ) : (
              <span>Visszaállító link küldése</span>
            )}
          </button>

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className="w-full py-2 text-xs font-bold text-zinc-400 hover:text-white"
            >
              Vissza a bejelentkezéshez
            </button>
          )}

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-zinc-500">
              <span className={`px-2 ${isDark ? 'bg-zinc-950' : 'bg-white'}`}>Vagy Google belépés</span>
            </div>
          </div>

          {/* Google Sign-in */}
          <div>
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleLogin}
              className={`w-full py-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-3 transition-colors cursor-pointer ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-800 hover:bg-zinc-200'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Bejelentkezés Google Fiókkal</span>
            </button>
            <p className="text-[10px] text-zinc-500 text-center mt-2 leading-tight">
              Tipp: Bármilyen domainről az <span className="text-zinc-300 font-semibold">Email és Jelszó</span> regisztráció/belépés közvetlenül, azonnal működik!
            </p>

            {/* Toggle domain guide */}
            <div className="text-center mt-1">
              <button
                type="button"
                onClick={() => setShowDomainGuide(!showDomainGuide)}
                className="text-[11px] text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1 font-semibold cursor-pointer"
              >
                <HelpCircle className="w-3 h-3" />
                {showDomainGuide ? 'Útmutató elrejtése' : 'Hogyan engedélyezhetem a Google belépést a Firebase-ben?'}
              </button>
            </div>

            {/* Step-by-step domain authorization box */}
            {showDomainGuide && (
              <div className="mt-3 p-3.5 rounded-2xl bg-zinc-900 border border-zinc-700/80 text-xs space-y-2.5 animate-in fade-in duration-200">
                <div className="font-bold text-amber-400 flex items-center justify-between">
                  <span>Google Belépés Engedélyezése:</span>
                  <a
                    href={firebaseSettingsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded-lg flex items-center gap-1 font-bold no-underline"
                  >
                    <span>Firebase Megnyitása</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="space-y-1 text-zinc-300 text-[11px] leading-relaxed">
                  <p>1. Nyisd meg a Firebase Konzolban az <strong>Authentication → Settings</strong> menüt.</p>
                  <p>2. Görgess le az <strong>Authorized domains (Engedélyezett domainek)</strong> részhez, és kattints az <em>Add domain</em> gombra.</p>
                  <p>3. Másold ki és illeszd be ezt a címet:</p>
                </div>

                {/* Copy domain box */}
                <div className="flex items-center gap-2 bg-black/50 p-2 rounded-xl border border-zinc-800 font-mono text-[11px]">
                  <span className="flex-1 truncate text-zinc-200">{currentHost || 'Aktuális domain'}</span>
                  <button
                    type="button"
                    onClick={copyHostToClipboard}
                    className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-sans text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedHost ? <span className="text-emerald-400">Másolva!</span> : <span>Másolás</span>}
                  </button>
                </div>

                <p className="text-[10px] text-zinc-400 italic">
                  Megjegyzés: A mentés után a Google bejelentkezés azonnal működni fog erről a címről is.
                </p>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
