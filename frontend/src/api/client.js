// In local Vite dev, requests should go through the Vite proxy at /api.
// In production, set VITE_API_BASE to your live Render backend URL.
const BASE_URL = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');
const withBase = (path) => (BASE_URL ? `${BASE_URL}${path}` : path);

export async function getStockAnalysis(ticker, investor = 'buffett', horizon = 'long') {
  const cleanTicker = (ticker || '').trim().toUpperCase().replace('.', '-');
  const res = await fetch(withBase(`/api/stock/${cleanTicker}/analysis?investor=${encodeURIComponent(investor)}&horizon=${encodeURIComponent(horizon)}`));
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    const msg = errBody?.detail || errBody?.error || res.statusText || 'Analysis failed';
    throw new Error(msg);
  }
  return res.json();
}

export async function getAIReport(ticker, investor = 'buffett', horizon = 'long') {
  const apiKey = localStorage.getItem('gemini_api_key');
  const model = localStorage.getItem('gemini_model') || 'gemini-2.5-flash';
  const headers = {};
  if (apiKey) headers['X-Gemini-API-Key'] = apiKey;
  headers['X-Gemini-Model'] = model;
  const res = await fetch(withBase(`/api/stock/${ticker}/ai-report?investor=${encodeURIComponent(investor)}&horizon=${encodeURIComponent(horizon)}`), { headers });
  if (!res.ok) throw new Error(`AI report failed: ${res.statusText}`);
  return res.json();
}

export async function getPriceHistory(ticker, period = '5y') {
  const res = await fetch(withBase(`/api/stock/${ticker}/price-history?period=${period}`));
  if (!res.ok) throw new Error(`Price history failed: ${res.statusText}`);
  return res.json();
}

export async function optimizePortfolio(holdings, cashAvailable = 0, useRecommendations = false, accountValue = 0, investor = 'buffett', horizon = 'long') {
  const res = await fetch(withBase('/api/portfolio/optimize'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      holdings,
      cash_available: Number(cashAvailable) || 0,
      account_value: Number(accountValue) || 0,
      use_recommendations: useRecommendations,
      investor,
      horizon,
    }),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    const message = errorBody?.detail || res.statusText || 'Unknown error';
    throw new Error(`Optimization failed: ${message}`);
  }
  return res.json();
}

export async function parseBulkHoldings(rawText) {
  const res = await fetch(withBase('/api/portfolio/parse-bulk'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw_text: rawText }),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    const message = errorBody?.detail || res.statusText || 'Bulk parse failed';
    throw new Error(message);
  }
  return res.json();
}

export async function getMarketConditions(investor = 'buffett', horizon = 'long') {
  const res = await fetch(withBase(`/api/portfolio/market-conditions?investor=${encodeURIComponent(investor)}&horizon=${encodeURIComponent(horizon)}`));
  if (!res.ok) throw new Error(`Market conditions failed: ${res.statusText}`);
  return res.json();
}
