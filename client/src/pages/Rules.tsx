import { Book, Trophy, Sparkles, Shield, DollarSign, Users, Calendar, RefreshCcw, ChartBar } from 'lucide-react';
import SEO from '../components/SEO/SEO';
import { useTranslation, Trans } from 'react-i18next';

const RuleCard = ({ icon, title, children, color }: any) => (
    <div className={`bg-slate-900/50 border border-slate-800 rounded-3xl p-6 hover:border-${color}-500/50 transition-all duration-300 group`}>
        <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 rounded-2xl bg-${color}-500/10 text-${color}-400 group-hover:scale-110 transition-transform duration-300`}>
                {icon}
            </div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wide">{title}</h3>
        </div>
        {children}
    </div>
);

const Rules = () => {
    const { t } = useTranslation();

    return (
        <>
            <SEO
                title={t('rules.page_title')}
                description={t('rules.page_description')}
                url="https://fantasy-dinasty.pages.dev/rules"
            />
            <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">

                {/* HEADER */}
                <div className="text-center space-y-4 mb-12">
                    <div className="inline-flex flex-col md:flex-row items-center gap-2 bg-blue-600/10 text-blue-400 px-4 py-3 md:py-1.5 rounded-3xl md:rounded-full border border-blue-500/20 shadow-[0_0_20px_rgba(37,99,235,0.2)]">
                        <div className="flex items-center gap-2">
                            <Book size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{t('rules.handbook_label')}</span>
                        </div>
                    </div>

                    <h1 className="text-3xl md:text-6xl font-black text-white italic tracking-tighter uppercase leading-none break-words px-2">
                        {t('rules.title_main')} <span className="text-blue-500 block md:inline">{t('rules.title_highlight')}</span>
                    </h1>
                    <p className="text-slate-400 font-medium max-w-2xl mx-auto text-sm md:text-base leading-relaxed px-4">
                        <Trans i18nKey="rules.intro" components={{ 1: <strong className="text-white" /> }} />
                    </p>
                </div>

                {/* SECTIONS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* 1. PER INIZIARE */}
                    <RuleCard
                        icon={<Sparkles size={24} className="text-amber-400" />}
                        title={t('rules.card_1_title')}
                        color="amber"
                    >
                        <ul className="space-y-3 text-slate-400 text-sm">
                            <li className="flex gap-3">
                                <span className="h-1.5 w-1.5 bg-amber-500 rounded-full mt-2 shrink-0"></span>
                                <span><Trans i18nKey="rules.card_1_p1" components={{ 0: <strong /> }} /></span>
                            </li>
                            <li className="flex gap-3">
                                <span className="h-1.5 w-1.5 bg-amber-500 rounded-full mt-2 shrink-0"></span>
                                <span><Trans i18nKey="rules.card_1_p2" components={{ 0: <strong /> }} /></span>
                            </li>
                            <li className="flex gap-3">
                                <span className="h-1.5 w-1.5 bg-amber-500 rounded-full mt-2 shrink-0"></span>
                                <span><Trans i18nKey="rules.card_1_p3" components={{ 0: <strong /> }} /></span>
                            </li>
                        </ul>
                    </RuleCard>

                    {/* 2. LEGA E SQUADRE */}
                    <RuleCard
                        icon={<Trophy size={24} className="text-purple-400" />}
                        title={t('rules.card_2_title')}
                        color="purple"
                    >
                        <ul className="space-y-3 text-slate-400 text-sm">
                            <li className="flex gap-3">
                                <span className="h-1.5 w-1.5 bg-purple-500 rounded-full mt-2 shrink-0"></span>
                                <span><Trans i18nKey="rules.card_2_p1" components={{ 0: <strong /> }} /></span>
                            </li>
                            <li className="flex gap-3">
                                <span className="h-1.5 w-1.5 bg-purple-500 rounded-full mt-2 shrink-0"></span>
                                <span><Trans i18nKey="rules.card_2_p2" components={{ 0: <strong /> }} /></span>
                            </li>
                            <li className="flex gap-3">
                                <span className="h-1.5 w-1.5 bg-purple-500 rounded-full mt-2 shrink-0"></span>
                                <span><Trans i18nKey="rules.card_2_p3" components={{ 0: <strong /> }} /></span>
                            </li>
                        </ul>
                    </RuleCard>

                    {/* 3. MERCATO */}
                    <RuleCard
                        icon={<DollarSign size={24} className="text-emerald-400" />}
                        title={t('rules.card_3_title')}
                        color="emerald"
                    >
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-2">{t('rules.card_3_sub1')}</h4>
                                <p className="text-slate-400 text-xs leading-relaxed">
                                    {t('rules.card_3_txt1')}
                                </p>
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-2">{t('rules.card_3_sub2')}</h4>
                                <p className="text-slate-400 text-xs leading-relaxed">
                                    {t('rules.card_3_txt2')}
                                </p>
                            </div>
                        </div>
                    </RuleCard>

                    {/* 4. GESTIONE ROSA */}
                    <RuleCard
                        icon={<Users size={24} className="text-blue-400" />}
                        title={t('rules.card_4_title')}
                        color="blue"
                    >
                        <ul className="space-y-3 text-slate-400 text-sm">
                            <li className="flex gap-3">
                                <span className="h-1.5 w-1.5 bg-blue-500 rounded-full mt-2 shrink-0"></span>
                                <span><Trans i18nKey="rules.card_4_p1" components={{ 0: <strong /> }} /></span>
                            </li>
                            <li className="flex gap-3">
                                <span className="h-1.5 w-1.5 bg-blue-500 rounded-full mt-2 shrink-0"></span>
                                <span><Trans i18nKey="rules.card_4_p2" components={{ 0: <strong /> }} /></span>
                            </li>
                            <li className="flex gap-3">
                                <span className="h-1.5 w-1.5 bg-blue-500 rounded-full mt-2 shrink-0"></span>
                                <span><Trans i18nKey="rules.card_4_p3" components={{ 0: <strong /> }} /></span>
                            </li>
                        </ul>
                    </RuleCard>

                    {/* 5. CALENDARIO E PUNTEGGI */}
                    <RuleCard
                        icon={<Calendar size={24} className="text-pink-400" />}
                        title={t('rules.card_5_title')}
                        color="pink"
                    >
                        <ul className="space-y-3 text-slate-400 text-sm">
                            <li className="flex gap-3">
                                <span className="h-1.5 w-1.5 bg-pink-500 rounded-full mt-2 shrink-0"></span>
                                <span><Trans i18nKey="rules.card_5_p1" components={{ 0: <strong /> }} /></span>
                            </li>
                            <li className="flex gap-3">
                                <span className="h-1.5 w-1.5 bg-pink-500 rounded-full mt-2 shrink-0"></span>
                                <span><Trans i18nKey="rules.card_5_p2" components={{ 0: <strong /> }} /></span>
                            </li>
                            <li className="flex gap-3">
                                <span className="h-1.5 w-1.5 bg-pink-500 rounded-full mt-2 shrink-0"></span>
                                <span><Trans i18nKey="rules.card_5_p3" components={{ 0: <strong /> }} /></span>
                            </li>
                        </ul>
                    </RuleCard>

                    {/* 6. SCAMBI */}
                    <RuleCard
                        icon={<RefreshCcw size={24} className="text-cyan-400" />}
                        title={t('rules.card_6_title')}
                        color="cyan"
                    >
                        <ul className="space-y-3 text-slate-400 text-sm">
                            <li className="flex gap-3">
                                <span className="h-1.5 w-1.5 bg-cyan-500 rounded-full mt-2 shrink-0"></span>
                                <span><Trans i18nKey="rules.card_6_p1" components={{ 0: <strong /> }} /></span>
                            </li>
                            <li className="flex gap-3">
                                <span className="h-1.5 w-1.5 bg-cyan-500 rounded-full mt-2 shrink-0"></span>
                                <span><Trans i18nKey="rules.card_6_p2" components={{ 0: <strong /> }} /></span>
                            </li>
                            <li className="flex gap-3">
                                <span className="h-1.5 w-1.5 bg-cyan-500 rounded-full mt-2 shrink-0"></span>
                                <span><Trans i18nKey="rules.card_6_p3" components={{ 0: <strong /> }} /></span>
                            </li>
                        </ul>
                    </RuleCard>

                    {/* 7. SCORING SYSTEM */}
                    <RuleCard
                        icon={<ChartBar size={24} className="text-orange-400" />}
                        title={t('rules.card_7_title')}
                        color="orange"
                    >
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5">
                                <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">{t('rules.pts')}</div>
                                <div className="text-white font-bold text-lg">+1.0</div>
                            </div>
                            <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5">
                                <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">{t('rules.reb')}</div>
                                <div className="text-white font-bold text-lg">+1.2</div>
                            </div>
                            <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5">
                                <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">{t('rules.ast')}</div>
                                <div className="text-white font-bold text-lg">+1.5</div>
                            </div>
                            <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5">
                                <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">{t('rules.stl')}</div>
                                <div className="text-white font-bold text-lg">+3.0</div>
                            </div>
                            <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5">
                                <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">{t('rules.blk')}</div>
                                <div className="text-white font-bold text-lg">+3.0</div>
                            </div>
                            <div className="bg-slate-950/50 p-3 rounded-xl border border-red-500/10">
                                <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">{t('rules.tov')}</div>
                                <div className="text-red-400 font-bold text-lg">-1.0</div>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/5">
                            <h4 className="text-orange-400 font-bold text-xs uppercase tracking-wider mb-2">{t('rules.mechanics_title')}</h4>
                            <p className="text-slate-400 text-xs leading-relaxed">
                                <Trans i18nKey="rules.mechanics_desc" components={{ 0: <strong className="text-white" /> }} />
                            </p>
                        </div>
                    </RuleCard>

                </div>

                {/* BETA WARNING */}
                <div className="mt-12 bg-slate-900/50 border border-slate-800 rounded-3xl p-8 text-center max-w-2xl mx-auto">
                    <Shield size={32} className="text-slate-600 mx-auto mb-4" />
                    <h3 className="text-white font-black uppercase tracking-widest mb-2">{t('rules.tech_note')}</h3>
                    <h1 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter uppercase leading-none">
                        {t('rules.title_main')} <span className="text-blue-500">{t('rules.title_highlight')}</span>
                    </h1>
                    <p className="text-slate-400 font-medium max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
                        <Trans i18nKey="rules.intro" components={{ 1: <strong className="text-white" /> }} />
                    </p>
                </div>

                {/* SECTIONS GRID */}
            </div>
        </>
    );
};

export default Rules;
