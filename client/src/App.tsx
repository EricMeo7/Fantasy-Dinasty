import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import SetupProfile from './pages/SetupProfile';
import Market from './pages/Market';
import Roster from './pages/Roster';
import League from './pages/League';
import LeagueSelection from './pages/LeagueSelection';
import Matches from './pages/Matches';
import LiveDraft from './pages/LiveDraft';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LeagueRosters from './pages/LeagueRosters';
import Trades from './pages/Trades';
import Matchup from './pages/Matchup';
import Commissioner from './pages/Commissioner';


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
  const noNavbarRoutes = ['/login', '/leagues', '/', '/forgot-password', '/reset-password'];
  const shouldHideNavbar = noNavbarRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans">
      {/* Mostra la Navbar solo se non siamo in una rotta "protetta" */}
      {!shouldHideNavbar && <Navbar />}

      <div className={!shouldHideNavbar ? "pt-0 pb-20" : "pb-12"}>
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
          {/* Redirect di default */}
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
      <Footer />
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