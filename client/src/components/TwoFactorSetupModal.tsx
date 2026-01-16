import { useState } from 'react';
import { X, ShieldCheck, Lock, CheckCircle2, Loader2 } from 'lucide-react';
import api from '../services/api';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function TwoFactorSetupModal({ isOpen, onClose }: Props) {
    const [step, setStep] = useState<'idle' | 'setup' | 'success'>('idle');
    const [qrCode, setQrCode] = useState<string>('');
    const [manualKey, setManualKey] = useState<string>('');
    const [verifyCode, setVerifyCode] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const startSetup = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await api.post('/twofactor/setup');
            setQrCode(data.qrCodeImage);
            setManualKey(data.sharedKey);
            setStep('setup');
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to start setup.");
        } finally {
            setLoading(false);
        }
    };

    const confirmSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await api.post('/twofactor/enable', { code: verifyCode });
            setStep('success');
        } catch (err: any) {
            setError(err.response?.data?.message || "Code verification failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ShieldCheck className="text-blue-500" />
                        Setup Two-Factor Auth
                    </h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition"><X /></button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {step === 'idle' && (
                        <div className="text-center space-y-6">
                            <div className="bg-blue-500/10 p-6 rounded-full w-fit mx-auto border border-blue-500/20">
                                <Lock size={48} className="text-blue-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-2">Secure Your Dynasty</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Enable 2-Step Verification to protect your account from unauthorized access. You'll need an Authenticator app (Google Auth, Authy, etc.).
                                </p>
                            </div>
                            <button
                                onClick={startSetup}
                                disabled={loading}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                                Start Setup
                            </button>
                        </div>
                    )}

                    {step === 'setup' && (
                        <div className="space-y-4">
                            <div className="bg-white p-3 rounded-xl mx-auto w-fit">
                                <img src={qrCode} alt="2FA QR Code" className="w-40 h-40" />
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Manual Entry Key</p>
                                <code className="bg-slate-950 px-3 py-1 rounded text-blue-400 font-mono text-sm border border-slate-800 selection:bg-blue-500/30">{manualKey}</code>
                            </div>

                            <form onSubmit={confirmSetup} className="space-y-4 pt-4 border-t border-slate-800">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Enter 6-digit Code</label>
                                    <input
                                        type="text"
                                        value={verifyCode}
                                        onChange={(e) => setVerifyCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                        placeholder="000 000"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl py-4 text-center text-2xl font-mono text-white tracking-[0.5em] focus:border-blue-500 focus:outline-none placeholder-slate-800 transition"
                                        autoFocus
                                    />
                                </div>

                                {error && (
                                    <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-center animate-in shake">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={verifyCode.length !== 6 || loading}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : "Verify & Enable"}
                                </button>
                            </form>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center space-y-6 py-6">
                            <div className="bg-emerald-500/10 p-6 rounded-full w-fit mx-auto border border-emerald-500/20 animate-in zoom-in">
                                <CheckCircle2 size={48} className="text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">2FA Enabled!</h3>
                                <p className="text-slate-400 text-sm">
                                    Your account is now protected. You will be asked for a code next time you login.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
