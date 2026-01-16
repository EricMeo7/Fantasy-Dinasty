import AdminPanel from '../components/AdminPanel';
import { Shield, Sparkles } from 'lucide-react';
import SEO from '../components/SEO/SEO';

export default function Commissioner() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20 relative overflow-hidden">
            <SEO title="Commissioner" description="Zona amministratore per la gestione della lega" />
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-600/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-blue-600/10 rounded-full blur-[100px]"></div>
            </div>

            <main className="container mx-auto p-6 md:p-12 max-w-6xl relative z-10">
                <div className="mb-12 mt-4 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="p-5 bg-slate-900 border border-red-500/20 rounded-3xl shadow-2xl text-red-500 relative flex items-center justify-center">
                            <Shield size={48} className="relative z-10" />
                            <div className="absolute inset-0 bg-red-500/5 blur-xl rounded-full"></div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-2 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full w-fit">
                                <Sparkles size={12} className="text-red-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Authority Level: Admin</span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase italic leading-none">
                                Commissioner <span className="text-red-500">Zone</span>
                            </h2>
                            <p className="text-slate-500 mt-2 font-bold uppercase tracking-widest text-xs">Advanced league configuration & management hub</p>
                        </div>
                    </div>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                    <AdminPanel />
                </div>
            </main>
        </div>
    );
}
