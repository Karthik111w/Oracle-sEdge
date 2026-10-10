import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { ThemeProvider } from './theme';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import StockAnalysisPage from './pages/StockAnalysisPage';
import PortfolioPage from './pages/PortfolioPage';
import SettingsPage from './pages/SettingsPage';
import WatchlistPage from './pages/WatchlistPage';
import ComparePage from './pages/ComparePage';
import ErrorPage from './pages/ErrorPage';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        onAnimationStart={() => window.scrollTo(0, 0)}
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
          <Navbar />
          <main className="main-content">
            <AnimatedRoutes />
          </main>
        </BrowserRouter>
      </MotionConfig>
    </ThemeProvider>
  );
}

export default App;
