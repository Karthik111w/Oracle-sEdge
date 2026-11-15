import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowDownRight, ArrowUpRight, Check, GitCompareArrows, Link2, Star } from 'lucide-react';
import { CountUp } from '../fx';
import { displayName, formatMoney } from '../home/LensVerdictCard';
import { marginText, verdictLabel } from '../../lib/verdict';
import VerdictOrb from './VerdictOrb';
import { vClass, vStyle } from './verdictColor';
import { finite, toneOf } from './format';

const ease = [0.16, 1, 0.3, 1];
const rise = (i) => ({ initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, ease, delay: 0.05 + i * 0.08 } });

// Wordmark, live price and actions on the left; the verdict, as a gauge, on the right.
const AnalysisHeader = ({ data, isEtf, hasDcf, watching, onToggleWatch, copied, onCopy, lensLabel }) => {
  const sd = data.stock_data;
  const change = sd.daily_change_pct;
  const hasChange = finite(change);
  const margin = data.margin;
  const mos = finite(margin?.margin_pct) ? margin.margin_pct : null;
  const fair = hasDcf ? (margin?.intrinsic_value ?? data.dcf?.intrinsic_value) : null;
  const price = margin?.current_price ?? sd.current_price;
  const score = data.scorecard?.total_score;
  const classification = data.classification;
  const where = [sd.sector, sd.industry].filter((x) => x && x !== 'Unknown').join(', ');
  const Arrow = change >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <header className="an-hero">
      <div className="an-id">
        <motion.p className="eyebrow an-id-eyebrow" {...rise(0)}>
          {isEtf ? 'Fund analysis' : 'Stock analysis'}
        </motion.p>
        <h1 className="an-h1">
          <motion.span className={`display an-word${sd.ticker.length > 4 ? ' is-long' : ''}`} {...rise(1)}>
            {sd.ticker}
          </motion.span>
          <motion.span className="an-company" {...rise(2)}>{displayName(sd.company_name)}</motion.span>
        </h1>
        <motion.div className="an-quote" {...rise(3)}>
          <span className="mono an-quote-price">
            <CountUp value={sd.current_price} format={formatMoney} duration={1.2} />
          </span>
          {hasChange && (
            <span className={`mono an-quote-change tone-${toneOf(change)}`}>
              <Arrow size={18} aria-hidden="true" />
              {change >= 0 ? '+' : ''}
              {change.toFixed(2)}% today
            </span>
          )}
        </motion.div>
        {where && <motion.p className="an-where muted" {...rise(4)}>{where}</motion.p>}
        <motion.div className="an-actions" {...rise(5)}>
          <button type="button" className={`an-pill${watching ? ' is-on' : ''}`} aria-pressed={watching} onClick={onToggleWatch}>
            <Star size={14} aria-hidden="true" fill={watching ? 'currentColor' : 'none'} /> {watching ? 'Watching' : 'Watch'}
          </button>
          <Link to={`/compare?tickers=${encodeURIComponent(sd.ticker)}`} className="an-pill">
            <GitCompareArrows size={14} aria-hidden="true" /> Compare
          </Link>
          <button type="button" className="an-pill" onClick={onCopy}>
            {copied ? <Check size={14} aria-hidden="true" /> : <Link2 size={14} aria-hidden="true" />} {copied ? 'Copied' : 'Copy link'}
          </button>
          <span className="sr-only" role="status">{copied ? 'Link copied to the clipboard' : ''}</span>
        </motion.div>
      </div>

      <motion.section className={`an-stage fx-spot ${vClass(classification)}`} style={vStyle(classification)} aria-label={`Verdict, ${lensLabel} lens`} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, ease, delay: 0.15 }}>
        <p className="an-kicker an-stage-kicker">{isEtf ? 'Fund' : `Verdict, ${lensLabel} lens`}</p>
        <VerdictOrb score={score} classification={classification} etf={isEtf} />
        <p className="display an-stage-word">{isEtf ? 'Not scored' : verdictLabel(data)}</p>
        {!isEtf && data.scorecard?.grade && <p className="mono an-stage-grade">Grade {data.scorecard.grade}</p>}
        {!isEtf && (
          <dl className="an-figures">
            <div>
              <dt>Fair value</dt>
              <dd className="mono">{finite(fair) ? <CountUp value={fair} format={formatMoney} /> : 'n/a'}</dd>
            </div>
            <div>
              <dt>Price</dt>
              <dd className="mono">{finite(price) ? <CountUp value={price} format={formatMoney} /> : 'n/a'}</dd>
            </div>
            <div>
              <dt>Margin of safety</dt>
              <dd className={`mono tone-${toneOf(mos)}`}>{mos === null ? 'n/a' : <CountUp value={mos} format={marginText} />}</dd>
            </div>
          </dl>
        )}
      </motion.section>
    </header>
  );
};

export default AnalysisHeader;
