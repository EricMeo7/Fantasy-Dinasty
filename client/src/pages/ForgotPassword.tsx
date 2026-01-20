
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';
import { Mail, ArrowRight, Loader2, Sparkles, ArrowLeft } from 'lucide-react';
import SEO from '../components/SEO/SEO';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');

        try {
            // Determine the URL dynamically:
            // window.location.origin will be correct
            const origin = window.location.origin;
            // In Dev, it will be http://localhost:5173
            const redirectUrl = `${origin}/reset-password`;

            await sendPasswordResetEmail(auth, email, {
                url: redirectUrl,
                handleCodeInApp: true,
            });

            setStatus('success');
        } catch (error: any) {
            console.error("Firebase Password Reset Error:", error);
            // Always show success to prevent email enumeration, unless it's a critical config error
            setStatus('success');
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-6 pt-[calc(1.5rem+var(--sat))] md:p-6 bg-slate-950 relative overflow-hidden font-sans">
            <SEO title="Recupero Password" description="Recupera la tua password di accesso." />
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
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Security Protocol</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter uppercase leading-none">
                        ACCOUNT <span className="text-blue-500">RECOVERY</span>
                    </h1>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-3xl p-10 md:p-14 rounded-[4rem] border border-white/5 shadow-[0_50px_100px_rgba(0,0,0,0.6)] animate-in zoom-in duration-500">

                    {status === 'success' ? (
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/10 rounded-full mb-6 border border-green-500/20">
                                <Sparkles size={32} className="text-green-400" />
                            </div>
                            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Transmission Sent</h2>
                            <p className="text-slate-400 font-bold uppercase tracking-wider text-xs leading-relaxed mb-8">
                                If the clearance level for <span className="text-white">{email}</span> is valid, recovery vectors have been dispatched to your inbox.
                            </p>
                            <Link to="/login" className="inline-flex items-center gap-2 text-blue-400 hover:text-white font-black uppercase tracking-widest text-xs transition-colors">
                                <ArrowLeft size={16} /> Return to Access Point
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="mb-10">
                                <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">
                                    Lost Access?
                                </h2>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2 px-1">
                                    Initiate recovery sequence
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 ml-4 mb-2 block">Management ID (Email)</label>
                                    <div className="relative group">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-blue-500 transition-colors">
                                            <Mail size={20} />
                                        </div>
                                        <input
                                            id="email"
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-5 pl-14 text-white font-black italic tracking-tight focus:border-blue-500/50 outline-none transition-all placeholder-slate-800 shadow-inner"
                                            placeholder="gm@example.com"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className="w-full rounded-2xl bg-blue-600 hover:bg-blue-550 border-t border-white/10 py-5 font-black text-white italic uppercase tracking-tighter text-xl shadow-[0_20px_40px_rgba(37,99,235,0.3)] transform transition-all active:scale-95 disabled:opacity-30 disabled:scale-100 flex items-center justify-center gap-3"
                                >
                                    {status === 'loading' ? <Loader2 className="animate-spin" size={24} /> : 'Send Instructions'}
                                    {status !== 'loading' && <ArrowRight size={22} />}
                                </button>
                            </form>

                            <div className="mt-8 text-center">
                                <Link to="/login" className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-white transition-colors">
                                    Cancel Sequence
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
