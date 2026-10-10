import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ExternalLink } from 'lucide-react';
import SegmentedControl from '../components/SegmentedControl';
import { useTheme } from '../theme';

const APPEARANCE_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (default, best balance)' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (slower, more detail)' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (fast)' },
];

const SettingsPage = () => {
  const { preference, setPreference } = useTheme();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    try {
      const storedKey = localStorage.getItem('gemini_api_key');
      if (storedKey) {
        setApiKey(storedKey);
        setHasKey(true);
      }
      const storedModel = localStorage.getItem('gemini_model');
      if (storedModel) setGeminiModel(storedModel);
    } catch {
      // storage unavailable: settings can't persist in this browser
    }
  }, []);

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

  return (
    <div className="page page--narrow">
      <header className="page-head">
        <h1>Settings</h1>
        <p className="page-sub">Stored only in this browser.</p>
      </header>

      <section className="panel" aria-labelledby="key-title">
        <header className="panel-head">
          <div>
            <h2 id="key-title">Gemini API key</h2>
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
      </section>

      <section className="panel" aria-labelledby="appearance-title">
        <header className="panel-head">
          <div>
            <h2 id="appearance-title">Appearance</h2>
            <p className="panel-note">System follows your device's light or dark setting.</p>
          </div>
        </header>
        <SegmentedControl id="appearance" options={APPEARANCE_OPTIONS} value={preference} onChange={setPreference} />
      </section>

      <p className="settings-flash" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
};

export default SettingsPage;
