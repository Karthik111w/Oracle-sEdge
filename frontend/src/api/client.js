// In local Vite dev, requests should go through the Vite proxy at /api.
// In production, set VITE_API_BASE to your live Render backend URL.
const BASE_URL = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');
const withBase = (path) => (BASE_URL ? `${BASE_URL}${path}` : path);

export async function getStockAnalysis(ticker, investor = 'buffett', horizon = 'long') {
  const cleanTicker = (ticker || '').trim().toUpperCase().replace('.', '-');
  const res = await fetch(withBase(`/api/stock/${cleanTicker}/analysis?investor=${encodeURIComponent(investor)}&horizon=${encodeURIComponent(horizon)}`));
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errorMessage(errBody, res.statusText || 'Analysis failed'));
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

export async function getMetricExplanations(ticker, investor = 'buffett', horizon = 'long') {
  const apiKey = localStorage.getItem('gemini_api_key');
  const model = localStorage.getItem('gemini_model') || 'gemini-2.5-flash';
  const headers = { 'X-Gemini-Model': model };
  if (apiKey) headers['X-Gemini-API-Key'] = apiKey;
  const res = await fetch(withBase(`/api/stock/${ticker}/metric-explanations?investor=${encodeURIComponent(investor)}&horizon=${encodeURIComponent(horizon)}`), { headers });
  if (!res.ok) throw new Error(`Explanations failed: ${res.statusText}`);
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
    throw new Error(errorMessage(errorBody, res.statusText || 'Optimization failed'));
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
    throw new Error(errorMessage(errorBody, res.statusText || 'Bulk parse failed'));
  }
  return res.json();
}

export async function getMarketConditions(investor = 'buffett', horizon = 'long') {
  const res = await fetch(withBase(`/api/portfolio/market-conditions?investor=${encodeURIComponent(investor)}&horizon=${encodeURIComponent(horizon)}`));
  if (!res.ok) throw new Error(`Market conditions failed: ${res.statusText}`);
  return res.json();
}

// FastAPI sends `detail` as a string for our own errors and as a list of
// { loc, msg } objects for request validation failures.
export function errorMessage(body, fallback) {
  const detail = body?.detail ?? body?.error;
  if (typeof detail === 'string' && detail) return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail
      .slice(0, 3)
      .map((d) => {
        const loc = Array.isArray(d?.loc) ? d.loc : [];
        const row = loc[1] === 'holdings' && Number.isInteger(loc[2]) ? `Row ${loc[2] + 1}: ` : '';
        return `${row}${d?.msg || 'invalid value'}`;
      })
      .join(' ');
  }
  return fallback;
}

async function getJson(path, fallbackMessage) {
  const res = await fetch(withBase(path));
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(errorMessage(body, `${fallbackMessage}: ${res.statusText}`));
  }
  return res.json();
}

const cleanTicker = (ticker) => (ticker || '').trim().toUpperCase().replace('.', '-');

// [{ symbol, name, exchange, type, sector }]
export async function searchTickers(query) {
  const q = (query || '').trim();
  if (!q) return [];
  const data = await getJson(`/api/stock/search?q=${encodeURIComponent(q)}`, 'Search failed');
  return data.results || [];
}

// Every investor lens for one ticker: { ticker, horizon, lenses: [...], consensus: {...} }
export function getLensSummary(ticker, horizon = 'long') {
  return getJson(`/api/stock/${cleanTicker(ticker)}/lenses?horizon=${encodeURIComponent(horizon)}`, 'Lens summary failed');
}

// { status: 'warming' | 'ready', progress: { done, total }, updated_at, rows: [...] }
export function getScreener(investor = 'buffett', horizon = 'long') {
  return getJson(`/api/screener?investor=${encodeURIComponent(investor)}&horizon=${encodeURIComponent(horizon)}`, 'Screener failed');
}

// { indices: [{ symbol, name, price, change_pct, spark: [...] }], updated_at }
export function getMarketOverview() {
  return getJson('/api/market/overview', 'Market overview failed');
}

// Positions, sector allocation, correlation, 1y performance vs SPY and warnings for a set of holdings.
export async function analyzePortfolio(holdings, investor = 'buffett', horizon = 'long') {
  const res = await fetch(withBase('/api/portfolio/analyze'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ holdings, investor, horizon }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(errorMessage(body, res.statusText || 'Portfolio analysis failed'));
  }
  return res.json();
}
