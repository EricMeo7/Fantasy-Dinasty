
import { AlertTriangle, Beaker } from 'lucide-react';

export default function Footer() {
    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-t border-slate-800 py-3 px-6 flex justify-between items-center text-[10px] text-slate-500 font-mono uppercase tracking-widest">
            <div className="flex items-center gap-2">
                <Beaker size={12} className="text-emerald-500" />
                <span>Fantasy Dinasty <span className="text-emerald-400 font-bold">BETA</span> v0.1.1.45</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 hidden sm:flex">
                <AlertTriangle size={12} />
                <span>Work in Progress</span>
            </div>
        </div>
    );
}
