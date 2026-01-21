import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight, Sparkles, Users, X } from 'lucide-react';
import { useProposeTrade } from '../api/useProposeTrade';
import { useModal } from '../../../context/ModalContext';
import { useErrorTranslation } from '../../../hooks/useErrorTranslation';
import { PremiumSelect } from '../../../components/PremiumSelect';
import { PlayerRow } from './PlayerRow';
import { StickyTradeBar } from './StickyTradeBar';

interface PlayerDetails {
    id: number;
    externalId: number;
    firstName: string;
    lastName: string;
    position: string;
    nbaTeam: string;
    avgPoints: number;
    fantasyPoints: number;
    salaryYear1: number;
    salaryYear2: number;
    salaryYear3: number;
    injuryStatus?: string;
    injuryBodyPart?: string;
}

interface TeamRoster {
    id: number;
    userId: string;
    teamName: string;
    ownerName: string;
    players: PlayerDetails[];
}

interface TradeOffer {
    fromUserId: string;
    toUserId: string;
    playerId: number;
    salary: number;
    playerName: string;
}

interface TradeBuilderProps {
    teams: TeamRoster[];
    myTeamId?: string;
    onSuccess: () => void;
}

export const TradeBuilder: React.FC<TradeBuilderProps> = ({ teams, myTeamId, onSuccess }) => {
    const { t } = useTranslation();
    const [selectedOffers, setSelectedOffers] = useState<TradeOffer[]>([]);
    const [targetTeamIds, setTargetTeamIds] = useState<string[]>([]);
    const { mutate: propose, isPending } = useProposeTrade();
    const { showAlert, showConfirm } = useModal();
    const { translateError } = useErrorTranslation();

    const myRoster = teams.find(t => {
        const teamId = t.userId || String(t.id);
        return teamId === myTeamId || t.id?.toString() === myTeamId;
    }) || teams[0];

    const otherTeams = teams.filter(t => {
        const teamId = t.userId || String(t.id);
        const myTeamUserId = myRoster?.userId || String(myRoster?.id);
        return teamId !== myTeamUserId && t.id !== myRoster?.id;
    });
    const targetRosters = teams.filter(t => targetTeamIds.includes(t.userId || String(t.id)));

    const handleSelectTarget = (id: string) => {
        if (!id) return;
        if (!targetTeamIds.includes(id)) {
            setTargetTeamIds([...targetTeamIds, id]);
        }
    };

    const removeTarget = (id: string) => {
        setTargetTeamIds(targetTeamIds.filter(tid => tid !== id));
    };

    const togglePlayerSelection = (player: PlayerDetails, fromTeamId: string) => {
        const isAlreadySelected = selectedOffers.some(o => o.playerId === player.id);

        if (isAlreadySelected) {
            // Remove from selection
            setSelectedOffers(selectedOffers.filter(o => o.playerId !== player.id));
        } else {
            // Add to selection - we'll assign destination later or use first available
            const toTeamId = fromTeamId === (myRoster.userId || String(myRoster.id))
                ? (targetTeamIds[0] || '')
                : (myRoster.userId || String(myRoster.id));

            if (!toTeamId) {
                showAlert({ title: t('common.error'), message: t('trades.add_partner_error'), type: 'error' });
                return;
            }

            setSelectedOffers([...selectedOffers, {
                fromUserId: fromTeamId,
                toUserId: toTeamId,
                playerId: player.id,
                salary: player.salaryYear1,
                playerName: `${player.firstName} ${player.lastName}`
            }]);
        }
    };

    const calculateTotalSalary = (userId: string, direction: 'outgoing' | 'incoming') => {
        if (!userId) return 0;
        const offers = direction === 'outgoing'
            ? selectedOffers.filter(o => o.fromUserId === userId)
            : selectedOffers.filter(o => o.toUserId === userId);
        return offers.reduce((sum, o) => sum + o.salary, 0);
    };

    const handlePropose = async () => {
        if (selectedOffers.length === 0) return;

        const confirm = await showConfirm({
            title: t('trades.start_negotiation'),
            message: t('trades.negotiation_confirm_msg'),
            confirmText: t('trades.propose'),
            type: 'confirm'
        });

        if (!confirm) return;

        propose({
            offers: selectedOffers.map(o => ({
                fromUserId: o.fromUserId,
                toUserId: o.toUserId,
                playerId: o.playerId
            }))
        }, {
            onSuccess: () => {
                showAlert({ title: t('common.success'), message: t('success.trade_proposed'), type: 'success' });
                setSelectedOffers([]);
                onSuccess();
            },
            onError: (e: any) => {
                const code = e.response?.data?.message || e.response?.data || 'UNKNOWN_ERROR';
                showAlert({
                    title: t('common.error'),
                    message: t('error.trade_proposal_failed') + ":\n" + translateError(code),
                    type: 'error'
                });
            }
        });
    };

    const myTeamUserId = myRoster.userId || String(myRoster.id);
    const totalOutgoing = calculateTotalSalary(myTeamUserId, 'outgoing');
    const totalIncoming = calculateTotalSalary(myTeamUserId, 'incoming');

    return (
        <div className="flex flex-col gap-6 pb-32">
            {/* Target Selection Header */}
            <div className="bg-slate-900/40 backdrop-blur-3xl p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-3 bg-blue-600/10 rounded-xl border border-blue-500/20 text-blue-500">
                        <ArrowLeftRight size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">{t('trades.negotiate_deal')}</h2>
                        <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider mt-0.5">{t('trades.add_partners_hint')}</p>
                    </div>
                </div>

                <div className="w-full md:w-96">
                    <PremiumSelect
                        value=""
                        onChange={handleSelectTarget}
                        options={otherTeams
                            .filter(t => !targetTeamIds.includes(t.userId || String(t.id)))
                            .map(t => ({
                                value: t.userId || String(t.id),
                                label: t.teamName.toUpperCase()
                            }))}
                        placeholder={t('trades.add_team_placeholder')}
                        icon={<Sparkles size={16} />}
                    />
                </div>
            </div>

            {/* Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* My Team Column */}
                {myRoster && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between px-2 pb-3 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                                <div>
                                    <h3 className="text-base font-bold text-white">{myRoster.teamName}</h3>
                                    <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-wider">{t('trades.sending_label')}</p>
                                </div>
                            </div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                {t('trades.units_count', { count: myRoster.players.length })}
                            </div>
                        </div>

                        {/* Column Headers */}
                        <div className="flex items-center gap-3 px-4 py-2 text-[9px] font-bold text-slate-600 uppercase tracking-wider border-b border-white/5 bg-slate-950/40">
                            <div className="h-8 w-8 shrink-0"></div> {/* Avatar space */}
                            <div className="flex-1">{t('trades.header_player')}</div>
                            <div className="shrink-0 w-[40px] text-center">{t('trades.header_pos')}</div>
                            <div className="shrink-0 w-[45px] text-right">{t('trades.header_fp')}</div>
                            <div className="shrink-0 flex items-center gap-1 text-right">
                                <span className="text-white">Y1</span>
                                <span className="text-slate-700">/</span>
                                <span className="text-slate-400">Y2</span>
                                <span className="text-slate-700">/</span>
                                <span className="text-slate-500">Y3</span>
                            </div>
                            <div className="h-5 w-5 shrink-0"></div> {/* Checkbox space */}
                        </div>

                        <div className="space-y-2">
                            {myRoster.players.map((player) => (
                                <PlayerRow
                                    key={player.id}
                                    player={player}
                                    isSelected={selectedOffers.some(o => o.playerId === player.id)}
                                    onSelect={() => togglePlayerSelection(player, myRoster.userId || String(myRoster.id))}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Target Teams Column(s) */}
                <div className="flex flex-col gap-6">
                    {targetRosters.length === 0 ? (
                        <div className="h-[400px] border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center p-10 text-center bg-slate-900/10">
                            <Users size={40} className="text-slate-800 mb-6" />
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 leading-relaxed max-w-[250px]">
                                {t('trades.no_partners_placeholder')}
                            </p>
                        </div>
                    ) : (
                        targetRosters.map((team) => (
                            <div key={team.userId || team.id} className="flex flex-col gap-4">
                                <div className="flex items-center justify-between px-2 pb-3 border-b border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
                                        <div>
                                            <h3 className="text-base font-bold text-white">{team.teamName}</h3>
                                            <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-wider">{t('trades.receiving_label')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            {t('trades.units_count', { count: team.players.length })}
                                        </div>
                                        <button
                                            onClick={() => removeTarget(team.userId || String(team.id))}
                                            className="text-slate-600 hover:text-red-500 transition-colors p-1"
                                            title={t('trades.remove_team')}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Column Headers */}
                                <div className="flex items-center gap-3 px-4 py-2 text-[9px] font-bold text-slate-600 uppercase tracking-wider border-b border-white/5 bg-slate-950/40">
                                    <div className="h-8 w-8 shrink-0"></div> {/* Avatar space */}
                                    <div className="flex-1">{t('trades.header_player')}</div>
                                    <div className="shrink-0 w-[40px] text-center">{t('trades.header_pos')}</div>
                                    <div className="shrink-0 w-[45px] text-right">{t('trades.header_fp')}</div>
                                    <div className="shrink-0 flex items-center gap-1 text-right">
                                        <span className="text-white">Y1</span>
                                        <span className="text-slate-700">/</span>
                                        <span className="text-slate-400">Y2</span>
                                        <span className="text-slate-700">/</span>
                                        <span className="text-slate-500">Y3</span>
                                    </div>
                                    <div className="h-5 w-5 shrink-0"></div> {/* Checkbox space */}
                                </div>

                                <div className="space-y-2">
                                    {team.players.map((player) => (
                                        <PlayerRow
                                            key={player.id}
                                            player={player}
                                            isSelected={selectedOffers.some(o => o.playerId === player.id)}
                                            onSelect={() => togglePlayerSelection(player, team.userId || String(team.id))}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Sticky Trade Bar */}
            <StickyTradeBar
                totalOutgoing={totalOutgoing}
                totalIncoming={totalIncoming}
                onPropose={handlePropose}
                isPending={isPending}
                isDisabled={selectedOffers.length === 0}
                myTeamName={myRoster?.teamName || ''}
                targetTeamNames={targetRosters.map(t => t.teamName)}
            />
        </div>
    );
};
