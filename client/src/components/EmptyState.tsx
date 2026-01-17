import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Ghost } from 'lucide-react';
// useTranslation import removed due to being unused

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon: Icon = Ghost,
    title,
    description,
    action
}) => {
    // const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-slate-800 shadow-inner">
                <Icon size={40} className="text-slate-700" />
            </div>
            <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-2">{title}</h3>
            {description && <p className="text-slate-500 text-sm max-w-xs mb-8">{description}</p>}
            {action && (
                <button
                    onClick={action.onClick}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs tracking-[0.2em] rounded-xl transition shadow-lg shadow-blue-500/20 active:scale-95"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
};
