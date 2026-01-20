import { Coffee, ExternalLink, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function DonationBanner() {
    const { t } = useTranslation();

    return (
        <div className="relative overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>

            <div className="relative bg-slate-900/40 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl overflow-hidden">
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 -m-8 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -m-8 w-24 h-24 bg-indigo-500/10 rounded-full blur-3xl"></div>

                <div className="flex flex-col lg:flex-row items-center gap-8 relative z-10">
                    <div className="flex-shrink-0 relative">
                        <div className="p-5 bg-blue-600/20 rounded-2xl border border-blue-500/30 shadow-[0_0_30px_rgba(37,99,235,0.2)]">
                            <Coffee size={40} className="text-blue-400" />
                        </div>
                        <div className="absolute -top-2 -right-2">
                            <span className="flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 text-center lg:text-left">
                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-3 flex items-center justify-center lg:justify-start gap-3">
                            {t('donation.title')}
                            <Heart size={20} className="text-red-500 fill-red-500 animate-pulse" />
                        </h3>
                        <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-2xl font-medium">
                            {t('donation.description')}
                        </p>
                    </div>

                    <div className="flex-shrink-0 w-full lg:w-auto">
                        <a
                            href="https://ko-fi.com/fantasydynasty"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full lg:w-auto inline-flex items-center justify-center gap-3 px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase italic tracking-widest text-sm rounded-2xl transition-all shadow-[0_10px_30px_rgba(37,99,235,0.3)] hover:shadow-[0_15px_40px_rgba(37,99,235,0.4)] active:scale-95 group/btn border border-blue-400/30"
                        >
                            {t('donation.cta')}
                            <ExternalLink size={16} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
