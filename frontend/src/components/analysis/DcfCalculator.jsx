import React, { useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { fairValuePerShare, marginOfSafety, MIN_RATE_SPREAD } from './dcfMath';
import { finite, money, signedPct, toneOf } from './format';

const SPREAD_PTS = MIN_RATE_SPREAD * 100;
const round1 = (v) => Math.round(v * 10) / 10;

function Slider({ id, label, hint, value, min, max, onChange }) {
  return (
    <div className="an-slider">
      <div className="an-slider-top">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id} className="mono an-slider-out">{value.toFixed(1)}%</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={0.1}
        value={Math.min(max, Math.max(min, value))}
        aria-valuetext={`${value.toFixed(1)} percent`}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <p className="an-slider-hint">{hint}</p>
    </div>
  );
}

// Re-runs the backend's cash flow projection in the browser. Starts from the model's own inputs.
const DcfCalculator = ({ dcf, price }) => {
  const init = useMemo(
    () => ({ growth: dcf.growth_rate * 100, discount: dcf.discount_rate * 100, terminal: dcf.terminal_rate * 100 }),
    [dcf.growth_rate, dcf.discount_rate, dcf.terminal_rate]
  );
  const [v, setV] = useState(init);
  useEffect(() => setV(init), [init]);

  const years = dcf.years;
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

  return (
    <section className="panel an-calc" aria-labelledby="an-calc-title">
      <header className="panel-head">
        <div>
          <h3 id="an-calc-title" className="an-h3">Your assumptions</h3>
          <p className="panel-note">
            Change the three inputs and the fair value updates. Growth fades evenly from the starting rate to the terminal rate over {years} years. The discount rate stays at least {SPREAD_PTS} points above terminal growth.
          </p>
        </div>
        <button type="button" className="btn-quiet an-reset" onClick={() => setV(init)} disabled={!changed}>
          <RotateCcw size={14} aria-hidden="true" /> Reset
        </button>
      </header>

      <div className="an-calc-grid">
        <div className="an-sliders">
          <Slider id="an-g" label="Starting growth" hint="Yearly growth in free cash flow for year 1." value={v.growth} min={-10} max={40} onChange={setGrowth} />
          <Slider id="an-d" label="Discount rate" hint="The return you require. Higher lowers today's value." value={v.discount} min={discountMin} max={Math.max(15, discountMin)} onChange={setDiscount} />
          <Slider id="an-t" label="Terminal growth" hint="Growth after the projection, forever." value={v.terminal} min={0} max={5} onChange={setTerminal} />
        </div>

        <div className="an-calc-out" aria-live="polite">
          <p className="an-kicker">Fair value per share</p>
          <p className="mono an-calc-fair">{money(fair)}</p>
          <dl className="an-facts an-facts--stack">
            <div>
              <dt>Price</dt>
              <dd className="mono">{money(price)}</dd>
            </div>
            <div>
              <dt>Margin of safety</dt>
              <dd className={`mono tone-${toneOf(mos)}`}>{signedPct(mos)}</dd>
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
      </div>
    </section>
  );
};

export default DcfCalculator;
