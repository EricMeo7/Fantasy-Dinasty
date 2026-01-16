import { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ShieldCheck, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { useTranslation } from 'react-i18next';

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

  return (
    <div className="flex min-h-screen items-center justify-center p-6 pt-[calc(1.5rem+var(--sat))] md:p-6 bg-slate-950 relative overflow-hidden font-sans">

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-purple-600/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative w-full max-w-xl">

        {/* BRAND SECTION */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 bg-slate-900 px-6 py-2 rounded-full border border-white/5 mb-6 shadow-2xl animate-in slide-in-from-top duration-700">
            <Sparkles size={14} className="text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Next-Gen Fantasy Architecture</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-white italic tracking-tighter uppercase leading-none">
            FANTASY <span className="text-blue-500">DYNASTY</span>
          </h1>
          <p className="text-slate-600 font-bold uppercase tracking-[0.4em] text-xs mt-4 italic">Establish your legacy</p>

          <div className="mt-8 flex justify-center">
            <div className="bg-amber-500/10 border border-amber-500/20 px-8 py-3 rounded-xl flex items-center gap-3 animate-pulse">
              <Sparkles size={16} className="text-amber-500" />
              <span className="text-sm font-black text-amber-500 uppercase tracking-[0.3em]">Beta Version 0.1.1.45</span>
              <Sparkles size={16} className="text-amber-500" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-3xl p-10 md:p-14 rounded-[4rem] border border-white/5 shadow-[0_50px_100px_rgba(0,0,0,0.6)] animate-in zoom-in duration-500">

          <div className="mb-10">
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">
              {isRegistering ? 'Initialize Scout' : (showTwoFactor ? 'Two-Factor Verify' : 'Secure Entry')}
            </h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2 px-1">
              {isRegistering ? 'Create your management credential' : (showTwoFactor ? 'Enter code from authenticator app' : 'Enter your credentials to access the hub')}
            </p>
          </div>

          {error && (
            <div className="mb-8 rounded-2xl bg-red-500/5 p-4 text-[10px] font-black uppercase tracking-widest text-red-500 border border-red-500/20 flex items-center gap-4 animate-in shake duration-500">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <ShieldCheck size={18} />
              </div>
              <div>{error}</div>
            </div>
          )
          }

          {/* GOOGLE LOGIN BUTTON */}
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
            className="w-full rounded-2xl bg-white text-slate-900 border border-slate-200 py-4 font-black italic uppercase tracking-tighter text-lg shadow-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-3 mb-6"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
            Sign in with Google
          </button>

          <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink-0 mx-4 text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">Or classic credentials</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              {showTwoFactor ? (
                <div className="space-y-4 animate-in slide-in-from-right duration-500">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 ml-4">Authenticator Code</label>
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-blue-500 transition-colors">
                      <ShieldCheck size={20} />
                    </div>
                    <input
                      type="text"
                      placeholder="000 000"
                      className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-5 pl-14 text-white font-mono text-xl font-bold tracking-[0.3em] focus:border-blue-500/50 outline-none transition-all placeholder-slate-800 shadow-inner text-center"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center gap-3 px-2">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded-md border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500/20"
                    />
                    <label htmlFor="rememberMe" className="text-xs text-slate-500 font-bold uppercase tracking-wide cursor-pointer select-none">Remember for 30 days</label>
                  </div>
                </div>
              ) : (
                <>
                  {isRegistering && (
                    <div className="space-y-2 animate-in slide-in-from-left duration-500 mb-4">
                      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 ml-4">General Manager Name</label>
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-blue-500 transition-colors">
                          <Sparkles size={20} />
                        </div>
                        <input
                          type="text"
                          placeholder="e.g. The Zen Master"
                          className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-5 pl-14 text-white font-black italic tracking-tight focus:border-blue-500/50 outline-none transition-all placeholder-slate-800 shadow-inner"
                          value={gmName}
                          onChange={(e) => setGmName(e.target.value)}
                          required={isRegistering}
                        />
                      </div>
                    </div>
                  )}

                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 ml-4">Management ID (Email)</label>
                  <div className="relative group mb-6">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-blue-500 transition-colors">
                      <Mail size={20} />
                    </div>
                    <input
                      type="email"
                      placeholder="gm@scofieldmambas.com"
                      className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-5 pl-14 text-white font-black italic tracking-tight focus:border-blue-500/50 outline-none transition-all placeholder-slate-800 shadow-inner"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 ml-4">Secure Access Token (Password)</label>
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-blue-500 transition-colors">
                      <Lock size={20} />
                    </div>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-5 pl-14 text-white font-black italic tracking-tight focus:border-blue-500/50 outline-none transition-all placeholder-slate-800 shadow-inner"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-blue-500 transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="mt-8">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-blue-600 hover:bg-blue-550 border-t border-white/10 py-5 font-black text-white italic uppercase tracking-tighter text-xl shadow-[0_20px_40px_rgba(37,99,235,0.3)] transform transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center gap-3"
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : (isRegistering ? 'Establish Credential' : (showTwoFactor ? 'Verify' : 'Access Arena'))}
                {!loading && <ArrowRight size={22} />}
              </button>
            </div>
          </form>


          <div className="mt-12 text-center">
            <div className="h-px w-full bg-slate-800 mb-8"></div>
            <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">
              {isRegistering ? 'Already part of the dynasty?' : 'New to the competition?'}
              <button
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError('');
                }}
                className="ml-3 font-black text-blue-500 hover:text-white transition-colors"
              >
                {isRegistering ? 'SIGN IN' : 'CREATE ACCOUNT'}
              </button>
            </p>
          </div>
        </div>

        <div className="mt-12 text-center text-[10px] font-black text-slate-800 uppercase tracking-[0.4em] italic">
          © 2025 Fantasy Basketball Syndicate
        </div>
      </div>
    </div>
  );
}
