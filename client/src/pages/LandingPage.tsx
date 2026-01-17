import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, DollarSign, Trophy, TrendingUp, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function LandingPage() {
    const { t } = useTranslation();

    return (
        <>
            <Helmet>
                <title>{t('landing.seo_title')}</title>
                <meta
                    name="description"
                    content={t('landing.seo_description')}
                />
                <link rel="icon" href="/favicon.ico" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                <script type="application/ld+json">
                    {`
                    {
                        "@context": "https://schema.org",
                        "@type": "WebSite",
                        "name": "Legacy",
                        "alternateName": "Fantasy Dynasty NBA Hub",
                        "url": "https://fantasy-dynasty.pages.dev/"
                    }
                `}
                </script>
            </Helmet>

            <div className="min-h-screen bg-slate-950 font-sans text-slate-200 selection:bg-emerald-500/30 overflow-x-hidden">

                {/* Abstract Background Elements */}
                <div className="fixed inset-0 pointer-events-none">
                    <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
                </div>

                {/* Navigation / Header */}
                <header className="relative z-50 w-full px-6 py-6 md:px-12 flex justify-between items-center max-w-7xl mx-auto">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-tr from-emerald-400 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Trophy size={18} className="text-white" />
                        </div>
                        <span className="text-lg font-black tracking-tighter text-white uppercase italic">
                            Legacy <span className="text-emerald-400">Hub</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <LanguageSwitcher />

                        {/* Login Button */}
                        <Link
                            to="/login"
                            className="px-6 py-2.5 rounded-full bg-slate-900 border border-slate-700 text-xs font-bold uppercase tracking-widest hover:border-emerald-500/50 hover:bg-slate-800 transition-all flex items-center gap-2 group"
                        >
                            Login
                            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </header>

                {/* Hero Section */}
                <main className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-12 pb-24 md:pt-24 md:pb-32 flex flex-col items-center text-center">

                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-8 animate-fade-in-up">
                        {t('landing.hero_badge')}
                    </div>

                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[0.9] tracking-tighter uppercase mb-8 max-w-5xl drop-shadow-2xl">
                        {t('landing.hero_title_prefix')} <span className="text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-cyan-400">{t('landing.hero_title_accent')}</span> {t('landing.hero_title_suffix')}
                    </h1>

                    <h2 className="text-xl md:text-2xl text-slate-400 font-medium max-w-3xl leading-relaxed mb-12">
                        {t('landing.hero_subtitle')}
                    </h2>

                    <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                        <Link
                            to="/login"
                            className="w-full md:w-auto px-10 py-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white font-black italic uppercase tracking-wider text-lg shadow-[0_20px_50px_-12px_rgba(16,185,129,0.5)] transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3"
                        >
                            {t('landing.cta_launch')}
                            <ArrowRight size={20} />
                        </Link>
                        <a
                            href="#features"
                            className="w-full md:w-auto px-10 py-5 rounded-2xl bg-slate-900/50 border border-slate-700 text-slate-300 font-bold uppercase tracking-wider text-sm hover:bg-slate-800 transition-colors"
                        >
                            {t('landing.cta_learn_more')}
                        </a>
                    </div>

                </main>

                {/* Features / Content for SEO */}
                <section id="features" className="relative z-10 w-full bg-slate-900/50 border-y border-white/5 backdrop-blur-sm">
                    <div className="max-w-7xl mx-auto px-6 py-24">

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

                            {/* Feature 1 */}
                            <div className="space-y-4 p-6 rounded-3xl bg-slate-950/50 border border-slate-800/50 hover:border-emerald-500/30 transition-colors">
                                <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 mb-2">
                                    <DollarSign size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-white uppercase italic tracking-tight">{t('landing.feature_1_title')}</h3>
                                <p className="text-slate-400 leading-relaxed text-sm">
                                    {t('landing.feature_1_desc')}
                                </p>
                            </div>

                            {/* Feature 2 */}
                            <div className="space-y-4 p-6 rounded-3xl bg-slate-950/50 border border-slate-800/50 hover:border-blue-500/30 transition-colors">
                                <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mb-2">
                                    <TrendingUp size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-white uppercase italic tracking-tight">{t('landing.feature_2_title')}</h3>
                                <p className="text-slate-400 leading-relaxed text-sm">
                                    {t('landing.feature_2_desc')}
                                </p>
                            </div>

                            {/* Feature 3 */}
                            <div className="space-y-4 p-6 rounded-3xl bg-slate-950/50 border border-slate-800/50 hover:border-purple-500/30 transition-colors">
                                <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 mb-2">
                                    <Users size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-white uppercase italic tracking-tight">{t('landing.feature_3_title')}</h3>
                                <p className="text-slate-400 leading-relaxed text-sm">
                                    {t('landing.feature_3_desc')}
                                </p>
                            </div>
                        </div>

                        <div className="mt-24 max-w-4xl mx-auto text-center space-y-8">
                            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter">
                                {t('landing.footer_headline')} <span className="text-emerald-400">{t('landing.footer_accent')}</span> {t('landing.footer_suffix')}
                            </h2>
                            <p className="text-slate-400 text-lg leading-relaxed">
                                {t('landing.footer_text')}
                            </p>
                        </div>

                    </div>
                </section>

                {/* Footer */}
                <footer className="w-full py-12 border-t border-slate-800 bg-slate-950 relative z-10 text-center">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">
                        © {new Date().getFullYear()} {t('landing.copyright')}
                    </p>
                </footer>

            </div>
        </>
    );
}
