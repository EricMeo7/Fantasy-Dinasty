import React from 'react';
import { Book, Trophy, Shield, Users, DollarSign, Calendar, RefreshCcw, Sparkles } from 'lucide-react';

const Rules = () => {
    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">

            {/* HEADER */}
            <div className="text-center space-y-4 mb-12">
                <div className="inline-flex items-center gap-2 bg-blue-600/10 text-blue-400 px-4 py-1.5 rounded-full border border-blue-500/20 shadow-[0_0_20px_rgba(37,99,235,0.2)]">
                    <Book size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Official Handbook</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter uppercase leading-none">
                    LEAGUE <span className="text-blue-500">RULES</span>
                </h1>
                <p className="text-slate-400 font-medium max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
                    Benvenuto in <strong className="text-white">Fantasy Dynasty NBA</strong>. Questa guida ti aiuterà a padroneggiare le meccaniche di gioco, dal draft alla gestione della dinastia.
                </p>
            </div>

            {/* SECTIONS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* 1. PER INIZIARE */}
                <RuleCard
                    icon={<Sparkles size={24} className="text-amber-400" />}
                    title="1. Per Iniziare"
                    color="amber"
                >
                    <ul className="space-y-3 text-slate-400 text-sm">
                        <li className="flex gap-3">
                            <span className="h-1.5 w-1.5 bg-amber-500 rounded-full mt-2 shrink-0"></span>
                            <span><strong>Registrazione:</strong> Crea il tuo account impostando un nome GM univoco.</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="h-1.5 w-1.5 bg-amber-500 rounded-full mt-2 shrink-0"></span>
                            <span><strong>Sicurezza:</strong> Se abilitata, usa la 2FA per proteggere la tua franchigia.</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="h-1.5 w-1.5 bg-amber-500 rounded-full mt-2 shrink-0"></span>
                            <span><strong>Dashboard:</strong> Il tuo centro di comando per infortuni, punteggi live e notifiche di mercato.</span>
                        </li>
                    </ul>
                </RuleCard>

                {/* 2. LEGA E SQUADRE */}
                <RuleCard
                    icon={<Trophy size={24} className="text-purple-400" />}
                    title="2. La Lega"
                    color="purple"
                >
                    <ul className="space-y-3 text-slate-400 text-sm">
                        <li className="flex gap-3">
                            <span className="h-1.5 w-1.5 bg-purple-500 rounded-full mt-2 shrink-0"></span>
                            <span><strong>Partecipazione:</strong> Unisciti a una lega esistente o creane una nuova come Commissario.</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="h-1.5 w-1.5 bg-purple-500 rounded-full mt-2 shrink-0"></span>
                            <span><strong>Commissario:</strong> Ha poteri speciali per gestire calendario, utenti e reset della lega.</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="h-1.5 w-1.5 bg-purple-500 rounded-full mt-2 shrink-0"></span>
                            <span><strong>Ecosistema:</strong> Ogni lega è chiusa e compete autonomamente per il titolo.</span>
                        </li>
                    </ul>
                </RuleCard>

                {/* 3. MERCATO */}
                <RuleCard
                    icon={<DollarSign size={24} className="text-emerald-400" />}
                    title="3. Mercato"
                    color="emerald"
                >
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-2">Asta Live (Draft)</h4>
                            <p className="text-slate-400 text-xs leading-relaxed">
                                Tutti i manager si riuniscono per chiamare i giocatori. Parte un timer e chi offre di più vince, scalando il budget (Salary Cap).
                            </p>
                        </div>
                        <div>
                            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-2">Free Agency</h4>
                            <p className="text-slate-400 text-xs leading-relaxed">
                                Durante la stagione, cerca giocatori liberi nel database NBA e avvia aste (24h). Definisci la durata del contratto per la tua strategia Dynasty.
                            </p>
                        </div>
                    </div>
                </RuleCard>

                {/* 4. GESTIONE ROSA */}
                <RuleCard
                    icon={<Users size={24} className="text-blue-400" />}
                    title="4. Gestione Rosa"
                    color="blue"
                >
                    <ul className="space-y-3 text-slate-400 text-sm">
                        <li className="flex gap-3">
                            <span className="h-1.5 w-1.5 bg-blue-500 rounded-full mt-2 shrink-0"></span>
                            <span><strong>Lineup:</strong> Schiera i titolari prima dell'inizio delle partite reali.</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="h-1.5 w-1.5 bg-blue-500 rounded-full mt-2 shrink-0"></span>
                            <span><strong>Lock:</strong> La formazione si blocca all'inizio della prima partita della giornata.</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="h-1.5 w-1.5 bg-blue-500 rounded-full mt-2 shrink-0"></span>
                            <span><strong>Infortuni:</strong> Monitora gli stati (GTD, OUT) e sposta i giocatori in panchina o in IR.</span>
                        </li>
                    </ul>
                </RuleCard>

                {/* 5. CALENDARIO E PUNTEGGI */}
                <RuleCard
                    icon={<Calendar size={24} className="text-pink-400" />}
                    title="5. Partite"
                    color="pink"
                >
                    <ul className="space-y-3 text-slate-400 text-sm">
                        <li className="flex gap-3">
                            <span className="h-1.5 w-1.5 bg-pink-500 rounded-full mt-2 shrink-0"></span>
                            <span><strong>Scontri Diretti:</strong> Sfide settimanali Head-to-Head contro altri manager.</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="h-1.5 w-1.5 bg-pink-500 rounded-full mt-2 shrink-0"></span>
                            <span><strong>Punti Fantasy:</strong> Basati sulle stats reali (Punti, Assist, Rimbalzi, Stoppate, Rubate).</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="h-1.5 w-1.5 bg-pink-500 rounded-full mt-2 shrink-0"></span>
                            <span><strong>Playoff:</strong> Le migliori squadre accedono alla fase finale per il titolo.</span>
                        </li>
                    </ul>
                </RuleCard>

                {/* 6. SCAMBI */}
                <RuleCard
                    icon={<RefreshCcw size={24} className="text-cyan-400" />}
                    title="6. Trade Center"
                    color="cyan"
                >
                    <ul className="space-y-3 text-slate-400 text-sm">
                        <li className="flex gap-3">
                            <span className="h-1.5 w-1.5 bg-cyan-500 rounded-full mt-2 shrink-0"></span>
                            <span><strong>Proposta:</strong> Seleziona asset (giocatori/scelte) da scambiare.</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="h-1.5 w-1.5 bg-cyan-500 rounded-full mt-2 shrink-0"></span>
                            <span><strong>Negoziazione:</strong> La controparte può accettare, rifiutare o rilanciare.</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="h-1.5 w-1.5 bg-cyan-500 rounded-full mt-2 shrink-0"></span>
                            <span><strong>Approvazione:</strong> Lo scambio è immediato (o soggetto a veto a seconda delle regole).</span>
                        </li>
                    </ul>
                </RuleCard>

            </div>

            {/* BETA WARNING */}
            <div className="mt-12 bg-slate-900/50 border border-slate-800 rounded-3xl p-8 text-center max-w-2xl mx-auto">
                <Shield size={32} className="text-slate-600 mx-auto mb-4" />
                <h3 className="text-white font-black uppercase tracking-widest mb-2">Technical Note</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                    Il sito è in versione <strong>BETA</strong>. I punteggi si aggiornano live durante le partite NBA (potrebbero esserci leggeri delay). Puoi installare il sito come App (PWA) per la migliore esperienza mobile.
                </p>
            </div>

        </div>
    );
};

function RuleCard({ icon, title, children, color }: { icon: any, title: string, children: React.ReactNode, color: string }) {
    // Dynamic color classes map could be improved, simplifying with inline style for glows or a stricter map
    const borderColor = {
        amber: 'group-hover:border-amber-500/50',
        purple: 'group-hover:border-purple-500/50',
        emerald: 'group-hover:border-emerald-500/50',
        blue: 'group-hover:border-blue-500/50',
        pink: 'group-hover:border-pink-500/50',
        cyan: 'group-hover:border-cyan-500/50',
    }[color] || 'group-hover:border-blue-500/50';

    return (
        <div className={`group relative bg-slate-900/50 backdrop-blur-sm border border-white/5 rounded-[2rem] p-6 hover:bg-slate-900 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${borderColor}`}>
            <div className="flex items-center gap-4 mb-6">
                <div className={`p-3 rounded-2xl bg-slate-950 border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                    {icon}
                </div>
                <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">{title}</h2>
            </div>
            {children}
        </div>
    )
}

export default Rules;
