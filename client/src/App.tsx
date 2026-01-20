import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, Suspense, lazy } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

// Lazy Load Pages for Performance (Code Splitting)
const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const SetupProfile = lazy(() => import('./pages/SetupProfile'));
const Market = lazy(() => import('./pages/Market'));
const Roster = lazy(() => import('./pages/Roster'));
const League = lazy(() => import('./pages/League'));
const LeagueSelection = lazy(() => import('./pages/LeagueSelection'));
const Matches = lazy(() => import('./pages/Matches'));
const LiveDraft = lazy(() => import('./pages/LiveDraft'));
const LeagueRosters = lazy(() => import('./pages/LeagueRosters'));
const Trades = lazy(() => import('./pages/Trades'));
const Matchup = lazy(() => import('./pages/Matchup'));
const Commissioner = lazy(() => import('./pages/Commissioner'));
const Rules = lazy(() => import('./pages/Rules'));
const PlayerPool = lazy(() => import('./pages/PlayerPool'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Contact = lazy(() => import('./pages/Contact'));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-900">
    <Loader2 className="animate-spin text-blue-500" size={48} />
  </div>
);


// Componente Wrapper per gestire la logica della Navbar
function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // 1. Handle Hardware Back Button
      const backListener = CapacitorApp.addListener('backButton', () => {
        // Exit app on root pages, otherwise go back
        if (['/login', '/leagues', '/', '/dashboard'].includes(location.pathname)) {
          CapacitorApp.exitApp();
        } else {
          navigate(-1);
        }
      });

      // 2. Configure Status Bar to match theme
      const setupStatusBar = async () => {
        try {
          await StatusBar.setStyle({ style: Style.Dark });
          if (Capacitor.getPlatform() === 'android') {
            await StatusBar.setBackgroundColor({ color: '#0f172a' }); // bg-slate-900
          }
        } catch (e) {
          console.warn('StatusBar not supported', e);
        }
      };
      setupStatusBar();

      return () => {
        backListener.then(h => h.remove());
      };
    }
  }, [location.pathname, navigate]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Definiamo le rotte dove NON vogliamo vedere la Navbar
  const noNavbarRoutes = ['/login', '/leagues', '/', '/forgot-password', '/reset-password', '/rules', '/contact'];
  const shouldHideNavbar = noNavbarRoutes.includes(location.pathname);

  // Definiamo le rotte dove NON vogliamo vedere il Footer globale (es. Login ha già il suo footer)
  const noFooterRoutes = ['/login', '/forgot-password', '/reset-password', '/setup-profile'];
  const shouldHideFooter = noFooterRoutes.includes(location.pathname);

  // KO-FI WIDGET HANDLING
  // The widget is injected via index.html and is global. We need to hide it on pages where it obstructs UI (e.g. Trades)
  useEffect(() => {
    const kofiWidget = document.getElementById('kofi-widget-overlay-container');
    if (kofiWidget) {
      // Routes where the widget should be HIDDEN
      const hideWidgetRoutes = ['/trades', '/draft', '/live-draft'];

      if (hideWidgetRoutes.some(route => location.pathname.includes(route))) {
        kofiWidget.style.display = 'none';
      } else {
        kofiWidget.style.display = 'block';
      }
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans">
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'bg-slate-800 text-white border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl',
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#fff',
            borderRadius: '1rem',
          },
        }}
      />
      {/* Mostra la Navbar solo se non siamo in una rotta "protetta" */}
      {!shouldHideNavbar && <Navbar />}

      <div className={!shouldHideNavbar ? "pt-0 pb-20" : "pb-12"}>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Rotte Pubbliche o di Accesso */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Pagina di Selezione Lega (Rimuove la Navbar per forzare la scelta) */}
            <Route path="/leagues" element={<LeagueSelection />} />

            {/* Setup Profilo */}
            <Route path="/setup-profile" element={<SetupProfile />} />

            {/* Rotte di Gioco (Richiedono League ID selezionato) */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/market" element={<Market />} />
            <Route path="/roster" element={<Roster />} />
            <Route path="/lineup" element={<Navigate to="/matchup" replace />} />
            <Route path="/league" element={<League />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/matchup" element={<Matchup />} />
            <Route path="/matchup/:matchId" element={<Matchup />} />
            <Route path="/live-draft" element={<LiveDraft />} />
            <Route path="/league-rosters" element={<LeagueRosters />} />
            <Route path="/trades" element={<Trades />} />
            <Route path="/commissioner" element={<Commissioner />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/pool" element={<PlayerPool />} />
            {/* Dashboard Landing Page (Public) */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </Suspense>
      </div>
      {!shouldHideFooter && <Footer />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;