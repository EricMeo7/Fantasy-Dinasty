import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Footer component
export default function Footer() {
    const { t } = useTranslation();

    return (
        <footer className="w-full border-t border-white/5 bg-slate-950/80 backdrop-blur-xl py-10 relative z-10">
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
                    {/* Copyright & Entity */}
                    <div className="flex flex-col items-center md:items-start gap-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                            © 2026 FANTASY BASKETBALL SYNDROME
                        </p>
                        <p className="text-xs font-medium text-slate-400">
                            {t('footer.built_for')} <span className="text-emerald-400 font-bold italic">Fantasy Dynasty NBA</span> {t('footer.managers')}
                        </p>
                    </div>

                    {/* Links */}
                    <div className="flex items-center gap-6">
                        <Link
                            to="/rules"
                            className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-emerald-400 transition-colors"
                        >
                            {t('footer.links.rules')}
                        </Link>
                        <Link
                            to="/contact"
                            className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-emerald-400 transition-colors"
                        >
                            {t('footer.links.contact')}
                        </Link>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-col items-center md:items-end gap-2">
                        <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                                {t('login.beta_version')} v0.1.1.45
                            </span>
                        </div>
                        <p className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.2em]">
                            Global Operations Established
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
