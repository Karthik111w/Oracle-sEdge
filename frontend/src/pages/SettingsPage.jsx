import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, CheckCircle, ExternalLink, Trash2 } from 'lucide-react';

const SettingsPage = () => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
      setHasKey(true);
    }
    const storedModel = localStorage.getItem('gemini_model');
    if (storedModel) {
      setGeminiModel(storedModel);
    }
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
      setHasKey(true);
      showToast('API key saved successfully');
    }
  };

  const handleClear = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    setHasKey(false);
    showToast('API key cleared');
  };

  const handleModelChange = (e) => {
    const newModel = e.target.value;
    setGeminiModel(newModel);
    localStorage.setItem('gemini_model', newModel);
    showToast(`Gemini model switched to ${newModel.split('-').slice(1).join('-')}`);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Key size={32} color="var(--color-primary)" />
        Settings
      </h1>

      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ margin: '0 0 0.5rem 0' }}>Google Gemini API Key</h2>
            <p style={{ color: 'var(--color-text-muted)', margin: 0, maxWidth: '600px', lineHeight: '1.5' }}>
              The AI Stock Report feature uses Google's Gemini 1.5 model to generate Warren Buffett-style analysis. 
              You need a free API key to use this feature.
            </p>
            <a 
              href="https://aistudio.google.com" 
              target="_blank" 
              rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', marginTop: '0.5rem', textDecoration: 'none' }}
            >
              Get your free API key at Google AI Studio <ExternalLink size={14} />
            </a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '999px' }}>
            <div style={{ 
              width: '10px', 
              height: '10px', 
              borderRadius: '50%', 
              background: hasKey ? 'var(--color-success)' : 'var(--color-text-muted)',
              boxShadow: hasKey ? '0 0 10px var(--color-success)' : 'none'
            }}></div>
            <span style={{ fontSize: '0.9rem', color: hasKey ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
              {hasKey ? 'Configured' : 'Not Configured'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>API Key</label>
          <div style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              style={{
                flex: 1,
                padding: '0.75rem 3rem 0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                background: 'rgba(0,0,0,0.2)',
                color: 'var(--color-text)',
                fontFamily: 'monospace',
                fontSize: '1rem'
              }}
            />
            <button 
              type="button"
              onClick={() => setShowKey(!showKey)}
              style={{
                position: 'absolute',
                right: '11rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer'
              }}
            >
              {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            <button className="btn" onClick={handleSave} disabled={!apiKey.trim()} style={{ minWidth: '100px' }}>
              Save
            </button>
            <button 
              onClick={handleClear} 
              disabled={!hasKey}
              style={{
                background: 'transparent',
                border: '1px solid var(--color-danger)',
                color: 'var(--color-danger)',
                borderRadius: '8px',
                padding: '0 1rem',
                cursor: hasKey ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: hasKey ? 1 : 0.5
              }}
            >
              <Trash2 size={18} /> Clear
            </button>
          </div>
        </div>

        {toast && (
          <div style={{ 
            marginTop: '1.5rem', 
            padding: '1rem', 
            background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${toast.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}`,
            borderRadius: '8px',
            color: toast.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            animation: 'fadeIn 0.3s'
          }}>
            <CheckCircle size={20} />
            {toast.message}
          </div>
        )}

        <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: '0 0 0.5rem 0' }}>Gemini Model Selection</h2>
            <p style={{ color: 'var(--color-text-muted)', margin: 0, maxWidth: '600px', lineHeight: '1.5' }}>
              Choose your preferred Gemini model for AI Stock Reports. Higher-end models provide more detailed analysis.
            </p>
          </div>
          <select
            value={geminiModel}
            onChange={handleModelChange}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'rgba(0,0,0,0.2)',
              color: 'var(--color-text)',
              fontSize: '1rem',
              cursor: 'pointer',
              maxWidth: '400px'
            }}
          >
            <option value="gemini-2.5-flash">Gemini 2.5 Flash (Default - Best Balance)</option>
            <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fully Supported)</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro (Higher Quality)</option>
            <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast & Widely Supported)</option>
          </select>
          <p style={{ 
            fontSize: '0.85rem', 
            color: 'var(--color-text-muted)', 
            maxWidth: '600px',
            lineHeight: '1.5',
            marginTop: '0.5rem'
          }}>
            💡 <strong>Tip:</strong> Gemini 2.5 Flash offers the best balance of speed and quality. If it is unavailable for your key, the app will automatically fall back to Gemini 1.5 Flash.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
