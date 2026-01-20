import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

import { useMyTeamInfo } from '../features/team/api/useMyTeamInfo';

export default function Contact() {
    const { t } = useTranslation();
    const { data: myTeam } = useMyTeamInfo();
    const [formData, setFormData] = useState({
        name: '',
        type: 'Bug', // Default
        message: ''
    });
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

    const backLink = myTeam ? '/dashboard' : '/';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.message.trim()) {
            toast.error(t('contact.error_required', 'Il messaggio è obbligatorio.'));
            return;
        }

        setStatus('sending');

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error('Errore durante l\'invio');
            }

            setStatus('success');
            setFormData({ name: '', type: 'Bug', message: '' });
            toast.success(t('contact.success_desc', 'Messaggio inviato con successo!'));
        } catch (error) {
            console.error(error);
            setStatus('error');
            toast.error(t('contact.error_generic', 'Si è verificato un errore. Riprova più tardi.'));
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            {/* Header / Nav */}
            <div className="flex items-center justify-between mb-8">
                <Link to={backLink} className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium">
                    ← {t('footer.back_to_home', 'Back to Home')}
                </Link>
                <LanguageSwitcher />
            </div>

            <h1 className="text-3xl font-bold text-white mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
                {t('contact.title', 'Contattaci / Segnala Bug')}
            </h1>

            <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                {status === 'success' ? (
                    <div className="text-center py-12">
                        <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">{t('contact.success_title', 'Grazie!')}</h2>
                        <p className="text-slate-300">{t('contact.success_desc', 'Il tuo messaggio è stato inviato correttamente.')}</p>
                        <button
                            onClick={() => setStatus('idle')}
                            className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
                        >
                            {t('contact.send_another', 'Invia un altro messaggio')}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                                {t('contact.name_label', 'Nome (Opzionale)')}
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                                placeholder={t('contact.name_placeholder', 'Il tuo nome')}
                            />
                        </div>

                        <div>
                            <label htmlFor="type" className="block text-sm font-medium text-slate-300 mb-2">
                                {t('contact.type_label', 'Tipo di Segnalazione')}
                            </label>
                            <div className="relative">
                                <select
                                    id="type"
                                    name="type"
                                    value={formData.type}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="Bug">{t('contact.types.bug', '🪲 Bug')}</option>
                                    <option value="Consiglio">{t('contact.types.suggestion', '💡 Consiglio')}</option>
                                    <option value="Altro">{t('contact.types.other', '💬 Altro')}</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="message" className="block text-sm font-medium text-slate-300 mb-2">
                                {t('contact.message_label', 'Messaggio')} <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                id="message"
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                rows={5}
                                required
                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600 resize-none"
                                placeholder={t('contact.message_placeholder', 'Descrivi il problema o la tua idea...')}
                            />
                        </div>

                        {status === 'error' && (
                            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-4 rounded-xl border border-red-400/20">
                                <AlertCircle size={20} />
                                <p>{t('contact.error_generic', "Si è verificato un errore durante l'invio. Riprova.")}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={status === 'sending'}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-500/20"
                        >
                            {status === 'sending' ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    {t('contact.sending', 'Invio in corso...')}
                                </>
                            ) : (
                                <>
                                    <Send size={20} />
                                    {t('contact.send_btn', 'Invia Segnalazione')}
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
