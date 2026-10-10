import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronRight, Activity, Sparkles } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import { useTheme } from '../theme';

// three.js is heavy; keep it out of the main bundle and load it after first paint.
const HeroScene = lazy(() => import('../components/HeroScene'));

const MotionLink = motion.create(Link);

const ease = [0.22, 1, 0.36, 1];

const heroStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};

const gridStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardIn = {
  hidden: { opacity: 0, y: 28, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease } },
};

const cardHover = { y: -6, transition: { type: 'spring', stiffness: 300, damping: 22 } };

const LEGENDS = ['Buffett', 'Munger', 'Graham', 'Lynch', "O'Neil", 'Soros'];

function sparklinePath(points, width = 200, height = 40, pad = 4) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  return points
    .map((p, i) => {
      const x = i * step;
      const y = height - pad - ((p - min) / span) * (height - pad * 2);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function Sparkline({ id, points, positive = true }) {
  const line = sparklinePath(points);
  const area = `${line} L 200 40 L 0 40 Z`;
  const color = positive ? 'var(--color-success)' : 'var(--color-danger)';
  return (
    <svg className="spark" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={area}
        fill={`url(#spark-${id})`}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.5 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: 'easeInOut', delay: 0.2 }}
      />
    </svg>
  );
}

const HomePage = () => {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();

  const popularPicks = [
    { ticker: 'AAPL', name: 'Apple Inc.', change: '+12.4%', points: [10, 15, 12, 18, 22, 28, 35, 32, 40] },
    { ticker: 'BRK-B', name: 'Berkshire Hathaway', change: '+8.7%', points: [20, 22, 25, 23, 28, 30, 32, 34, 38] },
    { ticker: 'MSFT', name: 'Microsoft Corp.', change: '+15.2%', points: [15, 18, 22, 28, 25, 32, 38, 42, 50] }
  ];

  const [recentlyViewed, setRecentlyViewed] = useState([]);

  const marketSnapshot = [
    { name: 'S&P 500', value: '5,241.53', change: '+1.23%', positive: true },
    { name: 'NASDAQ', value: '16,733.62', change: '+1.58%', positive: true },
    { name: 'DOW JONES', value: '39,872.99', change: '+0.98%', positive: true },
    { name: 'VIX', value: '12.45', change: '-2.35%', positive: false }
  ];

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('recently_viewed') || '[]');
      if (saved && saved.length > 0) {
        setRecentlyViewed(saved);
      } else {
        setRecentlyViewed([
          { ticker: 'AAPL', name: 'Apple Inc.', price: '$192.65', change: '+12.4%', changeVal: 12.4 },
          { ticker: 'MSFT', name: 'Microsoft Corp.', price: '$415.32', change: '+15.2%', changeVal: 15.2 },
          { ticker: 'VOO', name: 'Vanguard S&P 500 ETF', price: '$498.71', change: '+6.3%', changeVal: 6.3 }
        ]);
      }
    } catch {
      setRecentlyViewed([]);
    }
  }, []);

  return (
    <div className="home">
      {/* Hero: 3D growth field behind the headline */}
      <section className="home-hero">
        <div className="home-hero-scene" aria-hidden="true">
          <Suspense fallback={null}>
            <HeroScene theme={theme} animate={!reduceMotion} />
          </Suspense>
        </div>

        <motion.div className="home-hero-content" variants={heroStagger} initial="hidden" animate="visible">
          <motion.div variants={fadeUp} className="home-eyebrow">
            <Sparkles size={14} /> Value investing, quantified
          </motion.div>

          <motion.h1 variants={fadeUp} className="home-title">
            Investment analysis
            <br />
            <span className="home-title-accent">through the eyes of legends</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="home-subtitle">
            Make smarter decisions with legendary investment principles, advanced DCF models, and AI-powered insights.
          </motion.p>

          <motion.div variants={fadeUp} className="home-search">
            <SearchBar placeholder="Search any stock ticker…" />
          </motion.div>

          <motion.div variants={fadeUp} className="home-legends">
            <span className="home-legends-label">Lenses</span>
            {LEGENDS.map((name) => (
              <span key={name} className="home-legend-chip">{name}</span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <div className="home-body">
        {/* Popular Analysis */}
        <section>
          <div className="home-section-head">
            <h3>Popular Analysis</h3>
            <Link to="/compare" className="home-section-link">
              View all <ChevronRight size={14} />
            </Link>
          </div>

          <motion.div
            className="home-picks"
            variants={gridStagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            {popularPicks.map((pick) => (
              <MotionLink
                key={pick.ticker}
                to={`/stock/${pick.ticker}`}
                className="card home-pick"
                variants={cardIn}
                whileHover={cardHover}
                whileTap={{ scale: 0.98 }}
              >
                <div className="home-pick-head">
                  <div>
                    <div className="home-pick-ticker">{pick.ticker}</div>
                    <div className="home-pick-name">{pick.name}</div>
                  </div>
                  <span className="home-change-pill">{pick.change}</span>
                </div>
                <Sparkline id={pick.ticker} points={pick.points} />
              </MotionLink>
            ))}
          </motion.div>
        </section>

        {/* Recently Viewed vs Market Snapshot */}
        <motion.div
          className="home-split"
          variants={gridStagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.div className="card home-panel" variants={cardIn}>
            <div className="home-section-head">
              <h3>Recently Viewed</h3>
              <Link to="/watchlist" className="home-section-link">View all</Link>
            </div>

            <div className="home-rows">
              {recentlyViewed.map((item) => {
                const isNeg = item.change?.startsWith('-') || item.changeVal < 0;
                return (
                  <MotionLink
                    key={item.ticker}
                    to={`/stock/${item.ticker}`}
                    className="home-row"
                    whileHover={{ x: 4 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  >
                    <div className="home-row-left">
                      <div className="home-row-avatar">{item.ticker[0]}</div>
                      <div className="home-row-text">
                        <div className="home-row-ticker">{item.ticker}</div>
                        <div className="home-row-name">{item.name}</div>
                      </div>
                    </div>
                    <div className="home-row-right">
                      <span className="home-row-price">{item.price}</span>
                      <span className={isNeg ? 'is-neg' : 'is-pos'}>{item.change}</span>
                      <ChevronRight size={14} className="home-row-chevron" />
                    </div>
                  </MotionLink>
                );
              })}
            </div>
          </motion.div>

          <motion.div className="card home-panel" variants={cardIn}>
            <div className="home-section-head">
              <h3 className="home-snapshot-title">
                <Activity size={16} /> Market Snapshot
              </h3>
              <span className="home-muted">As of 10:30 AM ET</span>
            </div>

            <div className="home-snapshot-grid">
              {marketSnapshot.map((m) => (
                <div key={m.name} className="home-stat">
                  <div className="home-stat-label">{m.name}</div>
                  <div className="home-stat-value">{m.value}</div>
                  <div className={m.positive ? 'is-pos' : 'is-neg'}>{m.change}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default HomePage;
