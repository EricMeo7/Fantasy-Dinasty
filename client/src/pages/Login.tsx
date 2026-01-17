
import { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Loader2, Sparkles, ShieldCheck, Mail, Lock, ArrowRight } from 'lucide-react';
import SEO from '../components/SEO/SEO';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Login() {
  const { t } = useTranslation();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gmName, setGmName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (showTwoFactor) {
        // 2FA LOGIN
        const response = await api.post('/auth/login-2fa', { email, code: twoFactorCode, rememberMe });
        const { token, email: userEmail } = response.data;

        localStorage.setItem('token', token);
        localStorage.setItem('userEmail', userEmail);
        localStorage.removeItem('selectedLeagueId');
        localStorage.removeItem('isAdmin');

        navigate('/leagues');
      } else if (isRegistering) {
        // REGISTER
        await api.post('/auth/register', { email, password, generalManagerName: gmName });
        alert(t('common.success'));
        setIsRegistering(false);
      } else {
        // STANDARD LOGIN (Via Firebase)
        // 1. Authenticate with Firebase first
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await userCredential.user.getIdToken();

        // 2. Exchange token with Backend
        const response = await api.post('/auth/firebase', { token: idToken });

        if (response.data.requiresTwoFactor || response.data.RequiresTwoFactor) {
          setShowTwoFactor(true);
          setLoading(false);
          return;
        }

        const { token, email: userEmail } = response.data;

        localStorage.setItem('token', token);
        localStorage.setItem('userEmail', userEmail);
        localStorage.removeItem('selectedLeagueId');
        localStorage.removeItem('isAdmin');

        navigate('/leagues');
      }
    } catch (err: any) {
      console.error("Errore Auth (Stack):", err.stack);
      console.error("Errore Auth (Message):", err.message);
      if (err.response) {
        console.error("Errore Auth (Status):", err.response.status);
        console.error("Errore Auth (Data):", JSON.stringify(err.response.data));
      } else if (err.request) {
        console.error("Errore Auth (Request): No response received", err.request);
      } else {
        console.error("Errore Auth (Generic):", JSON.stringify(err));
      }

      const msg = err.response?.data?.message || err.response?.data || t('common.error');
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      // Don't stop loading if we switched to 2FA mode (it just rendered new inputs, no async wait there)
      // But actually we do want to stop loading spinner.
      setLoading(false);
    }
  };

  // JSON-LD per Organizzazione/Lega
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FantasySportsLeague",
    "name": "Fantasy Dynasty NBA",
    "url": "https://fantasy-dinasty.pages.dev",
    "description": "La lega Fantasy NBA Dynasty più competitiva d'Italia. Gestisci il tuo team, scambia giocatori e vinci il titolo.",
    "sport": "Basketball",
    "memberOf": {
      "@type": "SportsOrganization",
      "name": "NBA"
    }
  };

  return (
    <>
      <SEO
        title={t('login.title')}
        description="Accedi alla tua dashboard Fantasy Dynasty NBA. Gestisci roster, lineup e trade."
        structuredData={structuredData}
      />
      <main className="min-h-screen bg-slate-950 flex flex-col items-center relative overflow-hidden font-sans text-slate-200 selection:bg-emerald-500/30">

        {/* Top Bar */}
        <div className="w-full max-w-7xl px-4 pt-6 flex justify-end relative z-50">
          <LanguageSwitcher />
        </div>

        {/* Background Gradients */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/10 rounded-full blur-[120px] animate-pulse-slow"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse-slow delay-1000"></div>
        </div>

        {/* --- HERO SECTION (Login + Title) --- */}
        <div className="w-full max-w-7xl px-4 py-12 lg:py-20 relative z-10 grid grid-cols-1 lg:grid-cols-2 lg:items-start gap-8 lg:gap-16">

          {/* 1. Badge & Title (Mobile: First) */}
          <div className="space-y-6 text-center lg:text-left lg:col-start-1 lg:row-start-1">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/50 border border-slate-700/50 backdrop-blur-md animate-fade-in-up">
              <Sparkles size={14} className="text-amber-400" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">{t('login.beta_version')} 0.1.1.45</span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-black text-white leading-[0.9] tracking-tighter uppercase drop-shadow-2xl animate-fade-in-up delay-100">
              Fantasy <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-cyan-400">Dynasty NBA</span>
            </h1>
          </div>

          {/* 2. Login Card (Mobile: Second - Immediately after Title) */}
          <div className="w-full max-w-md mx-auto lg:mx-0 lg:w-[480px] lg:col-start-2 lg:row-span-3 lg:row-start-1 self-start">
            <div className="bg-slate-900/60 backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden group">
              {/* Card Glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] -mr-32 -mt-32 group-hover:bg-emerald-500/30 transition-all duration-1000"></div>

              <div className="relative z-10 mb-8">
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                  {isRegistering ? t('login.initialize_scout') : (showTwoFactor ? t('login.two_factor_verify') : t('login.secure_entry'))}
                </h2>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                  {isRegistering ? t('login.create_credential') : (showTwoFactor ? t('login.enter_code') : t('login.enter_credentials'))}
                </p>
              </div>

              {error && (
                <div className="mb-6 rounded-xl bg-red-500/10 p-3 text-[11px] font-bold uppercase tracking-wide text-red-500 border border-red-500/20 flex items-center gap-3 animate-in shake">
                  <ShieldCheck size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* --- LOGIN FORM LOGIC START --- */}
              <button
                type="button"
                onClick={async () => {
                  setError('');
                  setLoading(true);
                  try {
                    // 1. Firebase Google Sign-In
                    const result = await signInWithPopup(auth, googleProvider);
                    const idToken = await result.user.getIdToken();

                    // 2. Send token to Backend to get App JWT
                    // Use a specific Firebase auth endpoint or adapt existing one
                    const response = await api.post('/auth/firebase', { token: idToken });

                    if (response.data.requiresTwoFactor || response.data.RequiresTwoFactor) {
                      setShowTwoFactor(true);
                      if (response.data.email) setEmail(response.data.email);
                      else if (response.data.Email) setEmail(response.data.Email);
                      setLoading(false);
                      return;
                    }

                    const { token, email: userEmail } = response.data;

                    // 3. Store App JWT as usual
                    localStorage.setItem('token', token);
                    localStorage.setItem('userEmail', userEmail);
                    localStorage.removeItem('selectedLeagueId');
                    localStorage.removeItem('isAdmin');

                    navigate('/leagues');
                  } catch (err: any) {
                    console.error('Firebase Login Error:', err);
                    setError(err.message || 'Google Sign-In Failed');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="w-full rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 py-3.5 font-black italic uppercase tracking-tighter text-base shadow-lg transition-all flex items-center justify-center gap-3 mb-6 active:scale-95"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                {t('login.google_signin')}
              </button>

              <div className="relative flex py-4 items-center">
                <div className="flex-grow border-t border-slate-700/50"></div>
                <span className="flex-shrink-0 mx-4 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{t('login.or_classic')}</span>
                <div className="flex-grow border-t border-slate-700/50"></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  {showTwoFactor ? (
                    <div className="space-y-4 animate-in slide-in-from-right duration-300">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t('login.authenticator_code')}</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors">
                          <ShieldCheck size={18} />
                        </div>
                        <input
                          type="text"
                          placeholder="000 000"
                          className="w-full rounded-xl bg-slate-950/50 border border-slate-700/50 p-4 pl-12 text-white font-mono text-xl font-bold tracking-[0.5em] focus:border-emerald-500/50 outline-none transition-all placeholder-slate-800 shadow-inner text-center"
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                          required
                          autoFocus
                        />
                      </div>
                      <div className="flex items-center gap-3 px-1">
                        <input
                          type="checkbox"
                          id="rememberMe"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20"
                        />
                        <label htmlFor="rememberMe" className="text-xs text-slate-400 font-bold uppercase tracking-wide cursor-pointer select-none">{t('login.remember_30_days')}</label>
                      </div>
                    </div>
                  ) : (
                    <>
                      {isRegistering && (
                        <div className="space-y-2 animate-in slide-in-from-left duration-300 mb-4">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t('login.gm_name')}</label>
                          <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors">
                              <Sparkles size={18} />
                            </div>
                            <input
                              type="text"
                              placeholder={t('login.gm_placeholder')}
                              className="w-full rounded-xl bg-slate-950/50 border border-slate-700/50 p-4 pl-12 text-white font-bold italic tracking-tight focus:border-emerald-500/50 outline-none transition-all placeholder-slate-700 shadow-inner"
                              value={gmName}
                              onChange={(e) => setGmName(e.target.value)}
                              required={isRegistering}
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Email</label>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors">
                            <Mail size={18} />
                          </div>
                          <input
                            type="email"
                            placeholder={t('login.email_placeholder')}
                            className="w-full rounded-xl bg-slate-950/50 border border-slate-700/50 p-4 pl-12 text-white font-bold italic tracking-tight focus:border-emerald-500/50 outline-none transition-all placeholder-slate-700 shadow-inner"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1 pt-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Password</label>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors">
                            <Lock size={18} />
                          </div>
                          <input
                            type="password"
                            placeholder={t('login.password_placeholder')}
                            className="w-full rounded-xl bg-slate-950/50 border border-slate-700/50 p-4 pl-12 text-white font-bold italic tracking-tight focus:border-emerald-500/50 outline-none transition-all placeholder-slate-700 shadow-inner"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                          />
                        </div>
                        <div className="text-right pt-1">
                          <button
                            type="button"
                            onClick={() => navigate('/forgot-password')}
                            className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-emerald-400 transition-colors"
                          >
                            {t('login.forgot_password')}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-t border-white/10 py-4 font-black text-white italic uppercase tracking-tighter text-lg shadow-[0_10px_30px_-10px_rgba(79,70,229,0.5)] transform transition-all active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (isRegistering ? t('login.establish_credential') : (showTwoFactor ? t('login.verify') : t('login.access_arena')))}
                    {!loading && <ArrowRight size={20} />}
                  </button>
                </div>
              </form>
              {/* --- LOGIN FORM LOGIC END --- */}

              <div className="mt-8 text-center">
                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">
                  {isRegistering ? t('login.already_part') : t('login.new_to_competition')}
                  <button
                    onClick={() => {
                      setIsRegistering(!isRegistering);
                      setError('');
                    }}
                    className="ml-2 font-black text-emerald-400 hover:text-emerald-300 transition-colors underline decoration-2 decoration-emerald-500/30 underline-offset-4"
                  >
                    {isRegistering ? t('login.signin').toUpperCase() : t('login.create_account')}
                  </button>
                </p>
              </div>

            </div>
          </div>

          {/* 3. Description & Features (Mobile: Third) */}
          <div className="space-y-8 text-center lg:text-left lg:col-start-1 lg:row-start-2">
            <p className="text-lg lg:text-xl text-slate-400 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed animate-fade-in-up delay-200">
              {t('login.build_legacy')}
            </p>

            {/* Features Grid (Mini) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12 animate-fade-in-up delay-300">
              <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/5 backdrop-blur-sm hover:border-emerald-500/30 transition-colors">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-3 text-emerald-400">
                  <Lock size={20} />
                </div>
                <h3 className="font-bold text-white uppercase text-sm">{t('login.feature_1_title')}</h3>
              </div>
              <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/5 backdrop-blur-sm hover:border-blue-500/30 transition-colors">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-3 text-blue-400">
                  <Sparkles size={20} />
                </div>
                <h3 className="font-bold text-white uppercase text-sm">{t('login.feature_2_title')}</h3>
              </div>
              <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/5 backdrop-blur-sm hover:border-purple-500/30 transition-colors">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mb-3 text-purple-400">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="font-bold text-white uppercase text-sm">{t('login.feature_3_title')}</h3>
              </div>
            </div>
          </div>

        </div>

        {/* --- FOOTER SECTION --- */}
        <div className="w-full border-t border-slate-800 bg-slate-950 z-10 mt-auto">
          <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              <img src="/logo.png" className="w-8 h-8" alt="Logo" />
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Fantasy Dynasty NBA</span>
            </div>
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">
              {t('login.footer_copyright')}
            </div>
          </div>
        </div>

      </main>
    </>
  );
}
