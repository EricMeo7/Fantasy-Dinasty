import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, DollarSign, Trophy, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function LandingPage() {
    const { t, i18n } = useTranslation();

    return (
        <>
            <Helmet>
                <title>{t('landing.seo_title')}</title>
                <meta name="description" content={t('landing.seo_description')} />

                {/* SEO Branding */}
                <meta property="og:site_name" content="Fantasy Dynasty NBA" />
                <meta property="og:title" content={t('landing.seo_title')} />
                <meta property="og:description" content={t('landing.seo_description')} />
                <meta property="og:image" content="https://fantasy-dinasty.pages.dev/assets/screenshots/dashboard-en.png" />
                <meta property="og:image" content="https://fantasy-dinasty.pages.dev/assets/screenshots/roster-en.png" />
                <meta property="og:image" content="https://fantasy-dinasty.pages.dev/assets/screenshots/market-en.png" />
                <meta property="og:image" content="https://fantasy-dinasty.pages.dev/assets/screenshots/matchup-en.png" />
                <meta property="og:image" content="https://fantasy-dinasty.pages.dev/assets/screenshots/auction-en.png" />
                <meta property="og:image" content="https://fantasy-dinasty.pages.dev/assets/screenshots/commissioner-en.png" />
                <meta property="og:image" content="https://fantasy-dinasty.pages.dev/assets/screenshots/salary-cap-en.png" />
                <meta property="og:image" content="https://fantasy-dinasty.pages.dev/assets/screenshots/standings-en.png" />
                <meta property="og:url" content="https://fantasy-dinasty.pages.dev/" />
                <meta property="og:type" content="website" />

                {/* Favicons */}
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <link rel="icon" href="/logo.png" type="image/png" sizes="192x192" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

                {/* Structured Data (WebSite) */}
                <script type="application/ld+json">
                    {`
                    {
                        "@context": "https://schema.org",
                        "@type": "WebSite",
                        "name": "Fantasy Dynasty NBA",
                        "alternateName": "Fantasy Dynasty NBA Hub",
                        "url": "https://fantasy-dinasty.pages.dev/",
                        "potentialAction": {
                            "@type": "SearchAction",
                            "target": "https://fantasy-dinasty.pages.dev/search?q={search_term_string}",
                            "query-input": "required name=search_term_string"
                        }
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
                            Fantasy <span className="text-emerald-400">Dynasty NBA</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <LanguageSwitcher />

                        {/* Links */}
                        <Link
                            to="/rules"
                            className="hidden md:block text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-emerald-400 transition-colors mr-2"
                        >
                            {t('footer.links.rules')}
                        </Link>

                        {/* Login Button */}
                        <Link
                            to="/login"
                            className="px-6 py-2.5 rounded-full bg-slate-900 border border-slate-700 text-xs font-bold uppercase tracking-widest hover:border-emerald-500/50 hover:bg-slate-800 transition-all flex items-center gap-2 group"
                        >
                            {t('login.signin')}
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

                    <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto mb-20">
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

                {/* Problem vs Solution Section */}
                <section className="relative z-10 w-full bg-slate-950 py-24 border-y border-white/5">
                    <div className="max-w-4xl mx-auto px-6 text-center">
                        <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-8 italic">
                            {t('landing.problem_title')}
                        </h2>
                        <p className="text-xl text-slate-400 leading-relaxed mb-12">
                            {t('landing.problem_desc')}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-slate-900/50 border border-slate-800 text-emerald-400 font-bold text-sm uppercase italic">
                                    <ArrowRight size={16} />
                                    {t(`landing.problem_item_${i}`)}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features Breakdown */}
                <section id="features" className="relative z-10 w-full space-y-32 py-32">
                    {[
                        { key: 'dashboard', icon: Trophy, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                        { key: 'salary_cap', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                        { key: 'auction', icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                        { key: 'roster', icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                        { key: 'matchup', icon: Trophy, color: 'text-rose-400', bg: 'bg-rose-500/10' },
                        { key: 'market', icon: DollarSign, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                        { key: 'standings', icon: Trophy, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                        { key: 'commissioner', icon: ArrowRight, color: 'text-slate-400', bg: 'bg-slate-500/10' }
                    ].map((feature, index) => {
                        // Determine language suffix for image file
                        // i18next usually stores language as 'en', 'en-US', 'it', 'it-IT', etc.
                        // We'll normalize to just 'en' or 'it'.
                        const currentLang = i18n.language.startsWith('it') ? 'it' : 'en';

                        return (
                            <div key={feature.key} className={`max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                                <div className={`${index % 2 === 1 ? 'md:order-2' : ''} space-y-6`}>
                                    <div className={`w-16 h-16 ${feature.bg} rounded-2xl flex items-center justify-center ${feature.color}`}>
                                        <feature.icon size={32} />
                                    </div>
                                    <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">
                                        {t(`landing.features.${feature.key}.title`)}
                                    </h3>
                                    <p className="text-slate-400 text-lg leading-relaxed">
                                        {t(`landing.features.${feature.key}.desc`)}
                                    </p>
                                </div>
                                <div className={`${index % 2 === 1 ? 'md:order-1' : ''} rounded-3xl bg-slate-900 border border-slate-800 aspect-video shadow-2xl relative overflow-hidden group flex items-center justify-center`}>
                                    {/* Blurred Background Layer */}
                                    <div className="absolute inset-0 overflow-hidden">
                                        <img
                                            src={`/assets/screenshots/${feature.key.replace('_', '-')}-${currentLang}.png`}
                                            alt=""
                                            className="w-full h-full object-cover blur-2xl opacity-40 scale-110 saturate-150"
                                            aria-hidden="true"
                                        />
                                    </div>

                                    {/* Main Image Layer */}
                                    <img
                                        src={`/assets/screenshots/${feature.key.replace('_', '-')}-${currentLang}.png`}
                                        alt={t(`landing.features.${feature.key}.title`)}
                                        className="relative z-10 h-[90%] w-auto object-contain rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border border-white/10 group-hover:scale-105 transition-transform duration-700"
                                        onError={(e) => {
                                            e.currentTarget.src = `https://placehold.co/1024x1024/1e293b/475569?text=${feature.key.toUpperCase()}`;
                                        }}
                                    />

                                    {/* Subtle Overlay/Sheen on Hover */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 to-transparent pointer-events-none z-20"></div>
                                </div>
                            </div>
                        );
                    })}
                </section>

                {/* FAQ Section */}
                <section className="relative z-10 w-full bg-slate-900/30 py-24 border-t border-white/5">
                    <div className="max-w-4xl mx-auto px-6">
                        <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter text-center mb-16 italic">
                            {t('landing.faq_title')}
                        </h2>
                        <div className="grid grid-cols-1 gap-8">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="p-8 rounded-3xl bg-slate-950/50 border border-slate-800">
                                    <h4 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                                        <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                                        {t(`landing.faq_q${i}`)}
                                    </h4>
                                    <p className="text-slate-400 leading-relaxed pl-4 border-l border-slate-800">
                                        {t(`landing.faq_a${i}`)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="relative z-10 w-full">
                    <div className="max-w-7xl mx-auto px-6 py-24">
                        <div className="mt-24 max-w-4xl mx-auto text-center space-y-8">
                            <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter italic">
                                {t('landing.footer_headline')} <span className="text-emerald-400">{t('landing.footer_accent')}</span> {t('landing.footer_suffix')}
                            </h2>
                            <p className="text-slate-400 text-lg leading-relaxed">
                                {t('landing.footer_text')}
                            </p>
                        </div>
                    </div>
                </section>

            </div>
        </>
    );
}
