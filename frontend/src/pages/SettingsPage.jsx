import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, ExternalLink, Download, Upload } from 'lucide-react';
import SegmentedControl from '../components/SegmentedControl';
import { LENSES } from '../components/home/lenses';
import { cleanTicker, readJson, usePrefs, writeJson } from '../lib/storage';
import { useTheme } from '../theme';
import '../styles/shell.css';
import '../styles/shell-fx.css';
import { Reveal } from '../components/fx';

const APPEARANCE_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const HORIZON_OPTIONS = [
  { value: 'long', label: 'Long term' },
  { value: 'short', label: 'Short term' },
];

const MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (default, best balance)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (slower, more detail)' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite (fastest)' },
];

// Keys that hold the user's own data. The Gemini key and the theme are managed in their own panels
// and are never part of an export.
const WATCHLIST_KEY = 'watchlist_tickers';
const PREFS_KEY = 'oe_prefs';
const RECENT_KEY = 'recently_viewed';
const PORTFOLIO_KEYS = ['portfolio_holdings', 'portfolio_cash', 'portfolio_account_value'];
const EXPORT_APP = 'oracles-edge';
const MAX_HOLDINGS = 50;

const finiteOr = (v, fallback) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : fallback);

function buildExport() {
  const holdings = readJson('portfolio_holdings', []);
  return {
    app: EXPORT_APP,
    version: 1,
    exported_at: new Date().toISOString(),
    watchlist: readJson(WATCHLIST_KEY, []),
    portfolio: {
      holdings: Array.isArray(holdings) ? holdings : [],
      cash: readJson('portfolio_cash', 0),
      account_value: readJson('portfolio_account_value', 0),
    },
    preferences: readJson(PREFS_KEY, {}),
  };
}

// Returns { error } or { watchlist, holdings, cash, accountValue, prefs } with only valid entries kept.
function parseImport(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: 'That file is not valid JSON.' };
  }
  if (!data || typeof data !== 'object' || data.app !== EXPORT_APP) {
    return { error: "That file was not exported from Oracle's Edge." };
  }
  const out = {};
  if (Array.isArray(data.watchlist)) {
    out.watchlist = [...new Set(data.watchlist.filter((t) => typeof t === 'string').map(cleanTicker).filter((t) => /^[A-Z0-9^=.-]{1,12}$/.test(t)))].slice(0, 200);
  }
  const p = data.portfolio;
  if (p && typeof p === 'object') {
    if (Array.isArray(p.holdings)) {
      out.holdings = p.holdings
        .filter((h) => h && typeof h.ticker === 'string' && Number.isFinite(Number(h.shares)))
        .map((h) => ({ ticker: cleanTicker(h.ticker), shares: Number(h.shares) }))
        .filter((h) => h.ticker && h.shares >= 0)
        .slice(0, MAX_HOLDINGS);
      out.holdingsTrimmed = p.holdings.length > MAX_HOLDINGS ? p.holdings.length : 0;
    }
    if (p.cash !== undefined) out.cash = Math.max(0, finiteOr(p.cash, 0));
    if (p.account_value !== undefined) out.accountValue = Math.max(0, finiteOr(p.account_value, 0));
  }
  const pr = data.preferences;
  if (pr && typeof pr === 'object') {
    const prefs = {};
    if (LENSES.some((l) => l.value === pr.investor)) prefs.investor = pr.investor;
    if (pr.horizon === 'long' || pr.horizon === 'short') prefs.horizon = pr.horizon;
    if (Object.keys(prefs).length) out.prefs = prefs;
  }
  if (!Object.keys(out).length) return { error: 'Nothing in that file could be imported.' };
  return out;
}

const SettingsPage = () => {
  const { preference, setPreference } = useTheme();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [status, setStatus] = useState(null);
  const [prefs, setPrefs] = usePrefs();
  const [confirmClear, setConfirmClear] = useState(false);
  const [dataMsg, setDataMsg] = useState(null);
  const fileRef = useRef(null);
  const clearBtnRef = useRef(null);
  const restoreClearFocus = useRef(false);

  useEffect(() => {
    try {
      const storedKey = localStorage.getItem('gemini_api_key');
      if (storedKey) {
        setApiKey(storedKey);
        setHasKey(true);
      }
      const storedModel = localStorage.getItem('gemini_model');
      if (storedModel) {
        if (MODELS.some((m) => m.value === storedModel)) setGeminiModel(storedModel);
        else localStorage.setItem('gemini_model', MODELS[0].value);
      }
    } catch {
      // storage unavailable: settings can't persist in this browser
    }
  }, []);

  useEffect(() => {
    if (!confirmClear && restoreClearFocus.current) {
      restoreClearFocus.current = false;
      clearBtnRef.current?.focus();
    }
  }, [confirmClear]);

  const flash = (message) => {
    setStatus(message);
    setTimeout(() => setStatus(null), 3000);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    localStorage.setItem('gemini_api_key', apiKey.trim());
    setHasKey(true);
    flash('API key saved.');
  };

  const handleClear = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    setHasKey(false);
    flash('API key removed.');
  };

  const handleModelChange = (e) => {
    setGeminiModel(e.target.value);
    localStorage.setItem('gemini_model', e.target.value);
    flash('Model updated.');
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(buildExport(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oracles-edge-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDataMsg({ tone: 'ok', text: 'Exported your watchlist, portfolio holdings and defaults.' });
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const parsed = parseImport(await file.text());
    if (parsed.error) {
      setDataMsg({ tone: 'error', text: parsed.error });
      return;
    }
    const parts = [];
    if (parsed.watchlist) {
      writeJson(WATCHLIST_KEY, parsed.watchlist);
      parts.push(`${parsed.watchlist.length} watchlist ${parsed.watchlist.length === 1 ? 'ticker' : 'tickers'}`);
    }
    try {
      if (parsed.holdings) {
        localStorage.setItem('portfolio_holdings', JSON.stringify(parsed.holdings));
        parts.push(`${parsed.holdings.length} ${parsed.holdings.length === 1 ? 'holding' : 'holdings'}${parsed.holdingsTrimmed ? ` (limited to the first ${MAX_HOLDINGS} of ${parsed.holdingsTrimmed} rows)` : ''}`);
      }
      if (parsed.cash !== undefined) localStorage.setItem('portfolio_cash', String(parsed.cash));
      if (parsed.accountValue !== undefined) localStorage.setItem('portfolio_account_value', String(parsed.accountValue));
    } catch {
      // storage unavailable
    }
    if (parsed.prefs) {
      setPrefs(parsed.prefs);
      parts.push('default lens and horizon');
    }
    setDataMsg({ tone: 'ok', text: `Imported ${parts.join(', ') || 'portfolio cash and account value'}.` });
  };

  const handleClearData = () => {
    writeJson(WATCHLIST_KEY, []);
    writeJson(RECENT_KEY, []);
    writeJson(PREFS_KEY, { investor: 'buffett', horizon: 'long' });
    try {
      PORTFOLIO_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch {
      // storage unavailable
    }
    restoreClearFocus.current = true;
    setConfirmClear(false);
    setDataMsg({ tone: 'ok', text: 'Saved data cleared. Your API key and appearance setting were kept.' });
  };

  return (
    <div className="page page--narrow">
      <header className="page-head">
        <p className="eyebrow">Settings</p>
        <h1>Your <em>preferences</em></h1>
        <p className="page-sub">Stored only in this browser.</p>
      </header>

      <Reveal as="section" className="panel sh-glass" delay={0.0} y={18} aria-labelledby="key-title">
        <header className="panel-head">
          <div>
            <p className="eyebrow">01</p>
            <h2 id="key-title" className="display">Gemini API key</h2>
            <p className="panel-note">
              Powers the metric explanations and the investor memo on each analysis. The key is sent with those requests only.
            </p>
          </div>
          <span className={`settings-status${hasKey ? ' tone-pos' : ' muted'}`}>{hasKey ? 'Saved' : 'Not set'}</span>
        </header>

        <form className="settings-key" onSubmit={handleSave}>
          <label className="field settings-key-field">
            <span className="field-label">API key</span>
            <span className="settings-key-input">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your key"
                autoComplete="off"
                spellCheck="false"
              />
              <button type="button" className="settings-eye" onClick={() => setShowKey((v) => !v)} aria-label={showKey ? 'Hide API key' : 'Show API key'}>
                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          <div className="settings-key-actions">
            <button type="submit" className="btn-solid" disabled={!apiKey.trim()}>
              Save
            </button>
            {hasKey && (
              <button type="button" className="btn-quiet settings-remove" onClick={handleClear}>
                Remove
              </button>
            )}
          </div>
        </form>

        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="settings-link">
          Get a free key from Google AI Studio <ExternalLink size={14} aria-hidden="true" />
        </a>

        <label className="field settings-model">
          <span className="field-label">Model</span>
          <select value={geminiModel} onChange={handleModelChange}>
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <span className="panel-note">If the chosen model isn't available for your key, Gemini 2.5 Flash is used instead.</span>
        </label>
      </Reveal>

      <Reveal as="section" className="panel sh-glass" delay={0.06} y={18} aria-labelledby="defaults-title">
        <header className="panel-head">
          <div>
            <p className="eyebrow">02</p>
            <h2 id="defaults-title" className="display">Defaults</h2>
            <p className="panel-note">The lens and horizon used when a page opens, such as the home screener preview.</p>
          </div>
        </header>
        <div className="sh-defaults">
          <label className="field">
            <span className="field-label">Investor lens</span>
            <select value={prefs.investor} onChange={(e) => setPrefs({ investor: e.target.value })}>
              {LENSES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          <SegmentedControl id="default-horizon" label="Horizon" options={HORIZON_OPTIONS} value={prefs.horizon} onChange={(horizon) => setPrefs({ horizon })} />
        </div>
      </Reveal>

      <Reveal as="section" className="panel sh-glass" delay={0.12} y={18} aria-labelledby="appearance-title">
        <header className="panel-head">
          <div>
            <p className="eyebrow">03</p>
            <h2 id="appearance-title" className="display">Appearance</h2>
            <p className="panel-note">System follows your device's light or dark setting.</p>
          </div>
        </header>
        <SegmentedControl id="appearance" options={APPEARANCE_OPTIONS} value={preference} onChange={setPreference} />
      </Reveal>

 <Reveal as="section" className="panel sh-glass" delay={0.18} y={18} aria-labelledby="data-title">
        <header className="panel-head">
          <div>
            <p className="eyebrow">04</p>
            <h2 id="data-title" className="display">Your data</h2>
            <p className="panel-note">
              Your watchlist, portfolio holdings and defaults live in this browser only. Export them to move to another browser. The export never includes your API key.
            </p>
          </div>
        </header>
        <div className="sh-data-actions">
          <button type="button" className="btn-quiet" onClick={handleExport}>
            <Download size={15} aria-hidden="true" /> Export JSON
          </button>
          <button type="button" className="btn-quiet" onClick={() => fileRef.current?.click()}>
            <Upload size={15} aria-hidden="true" /> Import JSON
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="sh-file" onChange={handleImport} aria-label="Import data file" tabIndex={-1} />
        </div>
        <div className="sh-clear">
          {confirmClear ? (
            <div className="sh-confirm" role="group" aria-label="Confirm clearing saved data">
              <p className="panel-text">Remove your watchlist, recently viewed list, portfolio holdings and defaults from this browser?</p>
              <div className="sh-data-actions">
                <button type="button" className="btn-solid sh-danger" onClick={handleClearData} autoFocus>
                  Yes, clear saved data
                </button>
                <button type="button" className="btn-quiet" onClick={() => { restoreClearFocus.current = true; setConfirmClear(false); }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button type="button" ref={clearBtnRef} className="btn-quiet settings-remove" onClick={() => setConfirmClear(true)}>
              Clear saved data
            </button>
          )}
        </div>
        <p className={`sh-data-msg${dataMsg?.tone === 'error' ? ' is-error' : ''}`} role="status" aria-live="polite">
          {dataMsg?.text}
        </p>
      </Reveal>

      <p className="settings-flash" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
};

export default SettingsPage;
