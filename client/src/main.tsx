import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
import './i18n';
import App from './App.tsx';
import { ModalProvider } from './context/ModalContext';

// Crea il client React Query
const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <ModalProvider>
          <App />
        </ModalProvider>
      </HelmetProvider>
    </QueryClientProvider>
  </StrictMode>,
);