import { createContext, useContext, useState, type ReactNode } from 'react';
import ConfirmationModal from '../components/ConfirmationModal';

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
    // Resolve AFTER closing state is set
    setTimeout(() => resolveCallback(result), 10);
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      <ConfirmationModal
        isOpen={isOpen}
        onClose={() => handleClose(false)}
        onConfirm={() => handleClose(true)}
        title={options.title || 'Conferma'}
        message={options.message}
        confirmLabel={options.confirmText}
        cancelLabel={options.cancelText}
        variant={options.type === 'error' ? 'danger' : options.type === 'confirm' ? 'info' : 'warning'}
      />
    </ModalContext.Provider>
  );
};