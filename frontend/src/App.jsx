import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useLenis } from 'lenis/react';
import './styles/shell-fx.css';
import { ThemeProvider } from './theme';
import Navbar from './components/Navbar';
import SmoothScroll from './components/SmoothScroll';
import Spotlight from './components/fx/Spotlight';
import LoadingSpinner from './components/LoadingSpinner';
import CommandPalette from './components/CommandPalette';

const HomePage = lazy(() => import('./pages/HomePage'));
const StockAnalysisPage = lazy(() => import('./pages/StockAnalysisPage'));
const PortfolioPage = lazy(() => import('./pages/PortfolioPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const WatchlistPage = lazy(() => import('./pages/WatchlistPage'));
const ComparePage = lazy(() => import('./pages/ComparePage'));
const ScreenerPage = lazy(() => import('./pages/ScreenerPage'));
const ErrorPage = lazy(() => import('./pages/ErrorPage'));

// Thin brass line that sweeps across the top of the viewport on each route change.
function RouteSweep() {
  const { pathname } = useLocation();
  const first = useRef(true);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setRun((n) => n + 1);
  }, [pathname]);

  if (!run) return null;
  return (
    <motion.div
      key={run}
      className="sh-sweep"
      aria-hidden="true"
      initial={{ scaleX: 0, opacity: 1, transformOrigin: '0% 50%' }}
      animate={{ scaleX: [0, 0.7, 1], opacity: [1, 1, 0] }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], times: [0, 0.55, 1] }}
    />
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const lenis = useLenis();

  const scrollTop = () => {
    if (lenis) lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {/* Opacity only: a transform here would break position: sticky and GSAP pinning below. */}
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onAnimationStart={scrollTop}
      >
        <Suspense fallback={<LoadingSpinner />}>
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/stock/:ticker" element={<StockAnalysisPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/screener" element={<ScreenerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<ErrorPage title="Page not found" message="The page you requested does not exist. Try searching for a valid stock ticker." />} />
        </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <SmoothScroll />
          <Spotlight />
          <a href="#main" className="skip-link">Skip to content</a>
          <Navbar />
          <RouteSweep />
          <CommandPalette />
          <main id="main" className="main-content" tabIndex={-1}>
            <AnimatedRoutes />
          </main>
        </BrowserRouter>
      </MotionConfig>
    </ThemeProvider>
  );
}

export default App;
