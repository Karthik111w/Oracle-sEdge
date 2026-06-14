const BASE_URL = 'https://oracle-sedge-1.onrender.com';

export async function getStockAnalysis(ticker) {
  const res = await fetch(`${BASE_URL}/api/stock/${ticker}/analysis`);
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    const msg = errBody?.detail || errBody?.error || res.statusText || 'Analysis failed';
    throw new Error(msg);
  }
  return res.json();
}

export async function getAIReport(ticker) {
  const apiKey = localStorage.getItem('gemini_api_key');
  const model = localStorage.getItem('gemini_model') || 'gemini-2.5-flash';
  const headers = {};
  if (apiKey) headers['X-Gemini-API-Key'] = apiKey;
  headers['X-Gemini-Model'] = model;
  const res = await fetch(`${BASE_URL}/api/stock/${ticker}/ai-report`, { headers });
  if (!res.ok) throw new Error(`AI report failed: ${res.statusText}`);
  return res.json();
}

export async function getPriceHistory(ticker, period = '5y') {
  const res = await fetch(`${BASE_URL}/api/stock/${ticker}/price-history?period=${period}`);
  if (!res.ok) throw new Error(`Price history failed: ${res.statusText}`);
  return res.json();
}

export async function optimizePortfolio(holdings, cashAvailable = 0, useRecommendations = false, accountValue = 0) {
  const res = await fetch(`${BASE_URL}/api/portfolio/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      holdings,
      cash_available: Number(cashAvailable) || 0,
      account_value: Number(accountValue) || 0,
      use_recommendations: useRecommendations,
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
  const res = await fetch(`${BASE_URL}/api/portfolio/parse-bulk`, {
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

export async function getMarketConditions() {
  const res = await fetch(`${BASE_URL}/api/portfolio/market-conditions`);
  if (!res.ok) throw new Error(`Market conditions failed: ${res.statusText}`);
  return res.json();
}
