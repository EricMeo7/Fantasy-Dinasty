
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../services/firebase';
import { Lock, ArrowRight, Loader2, Sparkles, ShieldCheck, AlertTriangle } from 'lucide-react';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [oobCode] = useState(searchParams.get('oobCode'));

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const [verifiedEmail, setVerifiedEmail] = useState('');
    const [isVerifying, setIsVerifying] = useState(true);

    useEffect(() => {
        if (!oobCode) {
            setStatus('error');
            setErrorMsg('Invalid or missing security token.');
            setIsVerifying(false);
            return;
        }

        // VERIFY CODE ON MOUNT
        verifyPasswordResetCode(auth, oobCode)
            .then((email) => {
                setVerifiedEmail(email);
                setIsVerifying(false);
            })
            .catch((error) => {
                console.error("Verification failed:", error);
                setStatus('error');
                setErrorMsg('This link has expired or has already been used.');
                setIsVerifying(false);
            });
    }, [oobCode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setErrorMsg('Credentials do not match.');
            return;
        }
        if (newPassword.length < 6) {
            setErrorMsg('Credential security too low (min 6 chars).');
            return;
        }

        setStatus('loading');
        setErrorMsg('');

        try {
            if (!oobCode) throw new Error("Missing code");

            await confirmPasswordReset(auth, oobCode, newPassword);
            setStatus('success');

            // Redirect dopo 3 secondi
            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (error: any) {
            console.error(error);
            setStatus('error');
            if (error.code === 'auth/invalid-action-code') {
                setErrorMsg('Security token expired or already used.');
            } else if (error.code === 'auth/weak-password') {
                setErrorMsg('Credential security too low.');
            } else {
                setErrorMsg('Transmission failed. Retry.');
            }
        }
    };

    if (status === 'success') {
        return (
            <div className="flex min-h-screen items-center justify-center p-6 bg-slate-950 relative overflow-hidden font-sans">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]"></div>
                    <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[120px]"></div>
                </div>

                <div className="relative w-full max-w-xl text-center">
                    <div className="bg-slate-900/40 backdrop-blur-3xl p-14 rounded-[4rem] border border-white/5 shadow-[0_50px_100px_rgba(0,0,0,0.6)] animate-in zoom-in duration-500">
                        <div className="inline-flex items-center justify-center w-24 h-24 bg-emerald-500/10 rounded-full mb-8 border border-emerald-500/20 animate-bounce">
                            <ShieldCheck size={40} className="text-emerald-400" />
                        </div>
                        <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-4">Access Restored</h2>
                        <p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-8">
                            Your secure credentials have been updated successfully.
                        </p>
                        <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
                            Redirecting to Access Point...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-6 pt-[calc(1.5rem+var(--sat))] md:p-6 bg-slate-950 relative overflow-hidden font-sans">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[120px]"></div>
            </div>

            <div className="relative w-full max-w-xl">
                {/* BRAND SECTION */}
                <div className="mb-12 text-center">
                    <div className="inline-flex items-center gap-2 bg-slate-900 px-6 py-2 rounded-full border border-white/5 mb-6 shadow-2xl animate-in slide-in-from-top duration-700">
                        <Sparkles size={14} className="text-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Security Protocol</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter uppercase leading-none">
                        NEW <span className="text-blue-500">CREDENTIALS</span>
                    </h1>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-3xl p-10 md:p-14 rounded-[4rem] border border-white/5 shadow-[0_50px_100px_rgba(0,0,0,0.6)] animate-in zoom-in duration-500">

                    <div className="mb-10">
                        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">
                            Secure Override
                        </h2>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2 px-1">
                            Establish new access parameters
                        </p>
                    </div>

                    {/* SHOW LOADING DURING VERIFICATION */}
                    {isVerifying && (
                        <div className="flex flex-col items-center justify-center py-10">
                            <Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Verifying Security Token...</p>
                        </div>
                    )}

                    {/* ERROR STATE */}
                    {!isVerifying && status === 'error' && (
                        <div className="mb-8 p-6 bg-red-500/5 rounded-2xl border border-red-500/20 animate-in shake duration-500">
                            <div className="flex flex-col items-center gap-4 text-center">
                                <div className="p-3 bg-red-500/10 rounded-full">
                                    <AlertTriangle size={32} className="text-red-500" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold uppercase tracking-widest text-sm mb-1">Access Denied</h3>
                                    <p className="text-slate-400 text-xs font-medium">{errorMsg}</p>
                                </div>
                                <button onClick={() => navigate('/login')} className="mt-2 text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-white transition-colors">
                                    Return to Access Point
                                </button>
                            </div>
                        </div>
                    )}

                    {/* FORM - ONLY SHOW IF VERIFIED AND NOT ERROR */}
                    {!isVerifying && status !== 'error' && (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="text-center mb-6">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 py-1 px-3 rounded-full inline-block">
                                    Identity Verified: {verifiedEmail}
                                </p>
                            </div>

                            <div>
                                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 ml-4 mb-2 block">New Secure Token (Password)</label>
                                <div className="relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-blue-500 transition-colors">
                                        <Lock size={20} />
                                    </div>
                                    <input
                                        id="new-password"
                                        type="password"
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-5 pl-14 text-white font-black italic tracking-tight focus:border-blue-500/50 outline-none transition-all placeholder-slate-800 shadow-inner"
                                        placeholder="••••••••••••"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 ml-4 mb-2 block">Verify Token</label>
                                <div className="relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-blue-500 transition-colors">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <input
                                        id="confirm-password"
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-5 pl-14 text-white font-black italic tracking-tight focus:border-blue-500/50 outline-none transition-all placeholder-slate-800 shadow-inner"
                                        placeholder="••••••••••••"
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={status === 'loading' || !oobCode}
                                    className="w-full rounded-2xl bg-blue-600 hover:bg-blue-550 border-t border-white/10 py-5 font-black text-white italic uppercase tracking-tighter text-xl shadow-[0_20px_40px_rgba(37,99,235,0.3)] transform transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center gap-3"
                                >
                                    {status === 'loading' ? <Loader2 className="animate-spin" size={24} /> : 'Update Credentials'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* REMOVE BOTTOM LINK IF ERROR (Already shown in error block) */}
                    {!isVerifying && status !== 'error' && !oobCode && (
                        <div className="mt-8 text-center">
                            <button onClick={() => navigate('/login')} className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-white transition-colors">
                                Return to Access Point
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
