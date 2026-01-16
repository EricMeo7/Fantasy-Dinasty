import { createContext, useContext, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';

type ModalType = 'alert' | 'confirm' | 'success' | 'error';

interface ModalOptions {
  title?: string;
  message: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
}

interface ModalContextType {
  showAlert: (options: ModalOptions | string) => Promise<void>;
  showConfirm: (options: ModalOptions | string) => Promise<boolean>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error('useModal must be used within a ModalProvider');
  return context;
};

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ModalOptions>({ message: '' });
  const [resolveCallback, setResolveCallback] = useState<(value: any) => void>(() => { });

  const openModal = (opts: ModalOptions | string, type: ModalType = 'alert'): Promise<any> => {
    const finalOptions = typeof opts === 'string' ? { message: opts, type } : { ...opts, type: opts.type || type };
    setOptions(finalOptions);
    setIsOpen(true);

    return new Promise((resolve) => {
      setResolveCallback(() => resolve);
    });
  };

  const showAlert = (opts: ModalOptions | string) => openModal(opts, 'alert');
  const showConfirm = (opts: ModalOptions | string) => openModal(opts, 'confirm');

  const handleClose = (result: boolean) => {
    setIsOpen(false);
    // Piccolo delay per permettere l'animazione di chiusura se volessi aggiungerla, qui chiude subito
    resolveCallback(result);
  };

  const getIcon = () => {
    switch (options.type) {
      case 'confirm': return <HelpCircle className="text-blue-400" size={32} />;
      case 'error': return <AlertCircle className="text-red-500" size={32} />;
      case 'success': return <CheckCircle2 className="text-emerald-500" size={32} />;
      default: return <AlertCircle className="text-slate-400" size={32} />;
    }
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-white/10">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="bg-slate-800 p-3 rounded-xl shrink-0 border border-slate-700 shadow-inner">
                  {getIcon()}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">
                    {options.title || (options.type === 'confirm' ? 'Conferma' : options.type === 'error' ? 'Errore' : options.type === 'success' ? 'Successo' : 'Avviso')}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{options.message}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/50 p-4 border-t border-slate-800 flex justify-end gap-3">
              {options.type === 'confirm' ? (
                <>
                  <button
                    onClick={() => handleClose(false)}
                    className="px-4 py-2 rounded-lg text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  >
                    {options.cancelText || 'Annulla'}
                  </button>
                  <button
                    onClick={() => handleClose(true)}
                    className="px-6 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition transform active:scale-95"
                  >
                    {options.confirmText || 'Conferma'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleClose(true)}
                  className="w-full sm:w-auto px-6 py-2 rounded-lg text-sm font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};