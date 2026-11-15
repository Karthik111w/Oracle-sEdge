import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMotionValue, useMotionValueEvent, useReducedMotion, useSpring } from 'motion/react';
import { RotateCcw } from 'lucide-react';
import { fairValuePerShare, marginOfSafety, MIN_RATE_SPREAD } from './dcfMath';
import { cashStreamNoun, marginText } from '../../lib/verdict';
import { finite, money, signedPct, toneOf } from './format';

const SPREAD_PTS = MIN_RATE_SPREAD * 100;
const round1 = (v) => Math.round(v * 10) / 10;

// A number that springs to its new value instead of snapping. Unknown values show "n/a".
function SpringNumber({ value, format, className }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  // The text node is written by the spring below; React must never re-render it.
  const [initial] = useState(() => (finite(value) ? format(value) : 'n/a'));
  const mv = useMotionValue(finite(value) ? value : 0);
  const spring = useSpring(mv, { stiffness: 120, damping: 20, mass: 0.9 });
  useMotionValueEvent(spring, 'change', (v) => {
    if (ref.current && finite(value)) ref.current.textContent = format(v);
  });
  useEffect(() => {
    if (!finite(value)) return;
    if (reduce) {
      spring.jump(value);
      if (ref.current) ref.current.textContent = format(value);
    } else {
      mv.set(value);
    }
    // format is recreated by callers each render; the value is what matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce]);
  return (
    <span ref={ref} className={className}>
      {initial}
    </span>
  );
}

// A brass-filled range input with a tick where the model's own value sits.
function Slider({ id, label, hint, value, min, max, base, onChange }) {
  const shown = Math.min(max, Math.max(min, value));
  const span = max - min || 1;
  const fill = ((shown - min) / span) * 100;
  const tick = Math.min(1, Math.max(0, (base - min) / span));
  const atBase = Math.abs(value - base) < 0.05;
  return (
    <div className="an-slider">
      <div className="an-slider-top">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id} className="mono an-slider-out">{value.toFixed(1)}%</output>
      </div>
      <div className="an-range-wrap" style={{ '--fill': `${fill}%`, '--tick': tick }}>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={0.1}
          value={shown}
          aria-valuetext={`${value.toFixed(1)} percent`}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className={`an-range-tick${atBase ? ' is-here' : ''}${tick < 0.14 ? ' is-start' : tick > 0.86 ? ' is-end' : ''}`} aria-hidden="true">
          <span className="an-range-tick-label mono">model {base.toFixed(1)}%</span>
        </span>
      </div>
      <p className="an-slider-hint">{hint}</p>
    </div>
  );
}

// Re-runs the backend's projection in the browser. Starts from the model's own inputs.
const DcfCalculator = ({ dcf, price }) => {
  const init = useMemo(
    () => ({ growth: dcf.growth_rate * 100, discount: dcf.discount_rate * 100, terminal: dcf.terminal_rate * 100 }),
    [dcf.growth_rate, dcf.discount_rate, dcf.terminal_rate]
  );
  const [v, setV] = useState(init);
  useEffect(() => setV(init), [init]);

  const years = dcf.years;
  const noun = cashStreamNoun(dcf.valuation_model);
  const inputs = { base: dcf.base_value, years, shares: dcf.shares };
  const fair = fairValuePerShare({ ...inputs, growth: v.growth / 100, discount: v.discount / 100, terminal: v.terminal / 100 });
  const model = fairValuePerShare({ ...inputs, growth: init.growth / 100, discount: init.discount / 100, terminal: init.terminal / 100 });
  const mos = marginOfSafety(fair, price);
  const changed = Math.abs(v.growth - init.growth) > 1e-9 || Math.abs(v.discount - init.discount) > 1e-9 || Math.abs(v.terminal - init.terminal) > 1e-9;
  const diff = finite(fair) && finite(model) && model > 0 ? ((fair - model) / model) * 100 : null;

  // The discount rate must stay SPREAD_PTS above terminal growth; moving one pushes the other.
  const setGrowth = (g) => setV((s) => ({ ...s, growth: g }));
  const setDiscount = (d) => setV((s) => ({ ...s, discount: d }));
  const setTerminal = (t) => setV((s) => ({ ...s, terminal: t, discount: Math.max(s.discount, round1(t + SPREAD_PTS)) }));

  const discountMin = round1(Math.max(SPREAD_PTS, v.terminal + SPREAD_PTS));
  // Margin-of-safety meter: the bar grows out from the centre line, right when positive.
  const meter = finite(mos) ? Math.min(1, Math.abs(mos) / 100) : 0;
  const tone = toneOf(mos);

  return (
    <section className="panel an-calc" aria-labelledby="an-calc-title">
      <header className="panel-head">
        <div>
          <p className="eyebrow an-calc-eyebrow">Try it</p>
          <h3 id="an-calc-title" className="an-h3">Your assumptions</h3>
          <p className="panel-note">
            Change the three inputs and the fair value updates. Growth fades evenly from the starting rate to the terminal rate over {years} years. The discount rate stays at least {SPREAD_PTS} points above terminal growth.
          </p>
        </div>
        <button type="button" className="btn-quiet an-reset" onClick={() => setV(init)} disabled={!changed}>
          <RotateCcw size={14} aria-hidden="true" /> Reset
        </button>
      </header>

      <div className="an-calc-out" aria-live="polite">
        <p className="an-kicker">Fair value per share</p>
        <p className="mono an-calc-fair">
          <SpringNumber value={fair} format={money} />
        </p>
        <div className={`an-mos tone-${tone}`}>
          <div className="an-mos-head">
            <span className="an-kicker">Margin of safety</span>
            <span className="mono an-mos-val">{marginText(mos)}</span>
          </div>
          <div className="an-mos-meter" aria-hidden="true">
            <span className="an-mos-zero" />
            <span className={`an-mos-fill is-${mos !== null && mos < 0 ? 'neg' : 'pos'}`} style={{ transform: `scaleX(${meter})` }} />
          </div>
          <p className="an-mos-note">{finite(mos) ? (mos >= 0 ? `Price is ${money(price)}, below this fair value.` : `Price is ${money(price)}, above this fair value.`) : 'No margin of safety can be worked out from these inputs.'}</p>
        </div>
        <dl className="an-facts an-facts--stack">
          <div>
            <dt>Price</dt>
            <dd className="mono">{money(price)}</dd>
          </div>
          <div>
            <dt>Model fair value</dt>
            <dd className="mono">
              {money(model)}
              {changed && finite(diff) && <span className="muted"> ({signedPct(diff)} here)</span>}
            </dd>
          </div>
        </dl>
      </div>

      <div className="an-sliders">
        <Slider id="an-g" label="Starting growth" hint={`Yearly growth in ${noun} for year 1.`} value={v.growth} min={-10} max={40} base={init.growth} onChange={setGrowth} />
        <Slider id="an-d" label="Discount rate" hint="The return you require. Higher lowers today's value." value={v.discount} min={discountMin} max={Math.max(15, discountMin)} base={init.discount} onChange={setDiscount} />
        <Slider id="an-t" label="Terminal growth" hint="Growth after the projection, forever." value={v.terminal} min={0} max={5} base={init.terminal} onChange={setTerminal} />
      </div>
    </section>
  );
};

export default DcfCalculator;
