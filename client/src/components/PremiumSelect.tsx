import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Option {
    value: string;
    label: string | React.ReactNode;
}

interface PremiumSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    label?: string;
    className?: string;
    icon?: React.ReactNode;
}

export const PremiumSelect: React.FC<PremiumSelectProps> = ({
    value,
    onChange,
    options,
    placeholder = "Select...",
    label,
    className,
    icon
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={cn("flex flex-col gap-2 w-full", className)} ref={containerRef}>
            {label && (
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">
                    {label}
                </label>
            )}
            <div className="relative group">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "w-full flex items-center justify-between gap-3 bg-slate-900 border border-white/10 rounded-2xl px-5 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800 group-hover:border-blue-500/50 focus:outline-none focus:border-blue-500 shadow-2xl",
                        isOpen && "border-blue-500 ring-4 ring-blue-500/10"
                    )}
                >
                    <div className="flex items-center gap-3 overflow-hidden">
                        {icon && <span className="text-slate-400 group-hover:text-blue-400 transition-colors shrink-0">{icon}</span>}
                        <span className="truncate">
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                    </div>
                    <ChevronDown
                        size={16}
                        className={cn(
                            "text-slate-400 transition-transform duration-300 shrink-0",
                            isOpen && "rotate-180 text-blue-400"
                        )}
                    />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-[#1a2235] border border-white/20 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="max-h-60 overflow-y-auto premium-scrollbar">
                            {options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-between px-5 py-3 text-sm font-semibold transition-colors hover:bg-white/10",
                                        option.value === value ? "text-blue-400 bg-blue-500/10" : "text-slate-100 hover:text-white"
                                    )}
                                >
                                    <span className="truncate">{option.label}</span>
                                    {option.value === value && <Check size={14} className="shrink-0 text-blue-400" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
