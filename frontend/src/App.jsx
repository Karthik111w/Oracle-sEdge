import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useLenis } from 'lenis/react';
import { ThemeProvider } from './theme';
import Navbar from './components/Navbar';
import SmoothScroll from './components/SmoothScroll';
import HomePage from './pages/HomePage';
import StockAnalysisPage from './pages/StockAnalysisPage';
import PortfolioPage from './pages/PortfolioPage';
import SettingsPage from './pages/SettingsPage';
import WatchlistPage from './pages/WatchlistPage';
import ComparePage from './pages/ComparePage';
import ErrorPage from './pages/ErrorPage';

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
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/stock/:ticker" element={<StockAnalysisPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<ErrorPage title="Page not found" message="The page you requested does not exist. Try searching for a valid stock ticker." />} />
        </Routes>
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
          <a href="#main" className="skip-link">Skip to content</a>
          <Navbar />
          <main id="main" className="main-content" tabIndex={-1}>
            <AnimatedRoutes />
          </main>
        </BrowserRouter>
      </MotionConfig>
    </ThemeProvider>
  );
}

export default App;
