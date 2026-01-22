import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = 'warning'
}: ConfirmationModalProps) {

    const getColors = () => {
        switch (variant) {
            case 'danger': return { icon: 'text-red-500', bg: 'bg-red-500', border: 'border-red-500' };
            case 'info': return { icon: 'text-blue-500', bg: 'bg-blue-500', border: 'border-blue-500' };
            default: return { icon: 'text-yellow-500', bg: 'bg-yellow-500', border: 'border-yellow-500' };
        }
    };

    const colors = getColors();

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-3xl bg-slate-900 border border-white/10 p-6 text-left align-middle shadow-xl transition-all relative">
                                {/* Gradient Background */}
                                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                                <div className="relative z-10 flex flex-col items-center text-center">
                                    <div className={`p-4 rounded-full bg-slate-800 border ${colors.border}/30 mb-4`}>
                                        <AlertTriangle size={32} className={colors.icon} />
                                    </div>

                                    <Dialog.Title
                                        as="h3"
                                        className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2"
                                    >
                                        {title}
                                    </Dialog.Title>

                                    <div className="mt-2">
                                        <p className="text-slate-400 font-medium">
                                            {message}
                                        </p>
                                    </div>

                                    <div className="mt-8 flex gap-4 w-full">
                                        <button
                                            type="button"
                                            className="flex-1 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-widest text-xs transition-colors"
                                            onClick={onClose}
                                        >
                                            {cancelText}
                                        </button>
                                        <button
                                            type="button"
                                            className={`flex-1 px-6 py-3 rounded-xl ${colors.bg} hover:brightness-110 text-black font-black uppercase tracking-widest text-xs transition-transform transform active:scale-95`}
                                            onClick={() => {
                                                onConfirm();
                                                onClose();
                                            }}
                                        >
                                            {confirmText}
                                        </button>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
