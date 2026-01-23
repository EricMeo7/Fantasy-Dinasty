import { X, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel,
    cancelLabel,
    variant = 'info'
}: ConfirmationModalProps) {
    const { t } = useTranslation();

    if (!isOpen) return null;

    const variantStyles = {
        danger: 'bg-red-600 hover:bg-red-500 shadow-[0_0_30px_rgba(220,38,38,0.3)]',
        warning: 'bg-amber-600 hover:bg-amber-500 shadow-[0_0_30px_rgba(217,119,6,0.3)]',
        info: 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.3)]'
    };

    const variantBorders = {
        danger: 'border-red-500/30',
        warning: 'border-amber-500/30',
        info: 'border-blue-500/30'
    };

    const variantIcons = {
        danger: 'text-red-400',
        warning: 'text-amber-400',
        info: 'text-blue-400'
    };

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-md bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                {/* Decoration */}
                <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-20 ${variant === 'danger' ? 'bg-red-600' : variant === 'warning' ? 'bg-amber-600' : 'bg-blue-600'}`} />

                <div className="relative z-10 p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div className={`p-4 rounded-2xl bg-white/5 border ${variantBorders[variant]} shadow-inner`}>
                            <AlertCircle className={variantIcons[variant]} size={32} />
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-3 leading-none break-words">
                        {title}
                    </h3>

                    <p className="text-slate-400 font-medium leading-relaxed mb-10">
                        {message}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={onClose}
                            className="flex-1 px-8 py-4 bg-slate-800/50 hover:bg-slate-800 border border-white/5 text-slate-300 font-black uppercase italic tracking-widest text-[10px] rounded-2xl transition-all active:scale-95"
                        >
                            {cancelLabel || t('common.cancel')}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`flex-1 px-8 py-4 ${variantStyles[variant]} text-white font-black uppercase italic tracking-widest text-[10px] rounded-2xl transition-all active:scale-95 border border-white/10`}
                        >
                            {confirmLabel || t('common.confirm')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
