# Oracle's Edge

Score any stock through six investing lenses (Buffett, Munger, Graham, Lynch, O'Neil, Soros), see a model fair value and margin of safety, screen a large-cap universe, compare companies, and analyze or rebalance a portfolio.

Not financial advice. Data comes from Yahoo Finance and can be delayed or incomplete.

## What's in it

| Page | What it does |
| --- | --- |
| Home | A real-time 3D lens array (each ring coloured by that lens's verdict) travelled by scroll, live verdicts, index strip, margin-of-safety ranking, top screener ideas |
| Stock analysis (`/stock/:ticker`) | Verdict, price chart against fair value, key statistics, all six lenses, scorecard and trend, DCF calculator with your own assumptions, sensitivity table, reverse DCF, financial charts, risk flags, AI memo |
| Screener (`/screener`) | About 70 large caps scored per lens, as a sortable table or an interactive score-versus-margin map, with filters and CSV export |
| Compare (`/compare`) | Two to four tickers side by side, scorecard radar, rebased price chart |
| Watchlist (`/watchlist`) | Saved tickers scored through any lens |
| Portfolio (`/portfolio`) | Positions, sector allocation, correlation, one-year performance against SPY, and a Sharpe-ratio optimizer |
| Settings | Gemini key and model, default lens and horizon, theme, export and import of saved data |

Press `Ctrl K` (or `⌘K`) anywhere to search tickers.

## Frontend structure

- `src/styles/theme.css` holds the design tokens (ink and paper themes, brass accent, Instrument Serif display face); page styles live beside it in `src/styles/`.
- `src/components/three/` is the WebGL layer (react-three-fiber). It is lazy-loaded and skipped when WebGL is unavailable or the visitor prefers reduced motion, in which case static rings are shown.
- `src/components/fx/` is the interaction kit: scroll reveals, split headings, magnetic controls, tilt cards, count-up numbers and the pointer-following light on panels.
- Verdict colours are the same everywhere: Buy green, Watchlist brass, Hold steel, Avoid red (`ringColor` in `components/three/stage.js`).

## Run it locally

Backend (Python 3.11+):

```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

Frontend (Node 20+):

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` to the backend on port 8000.

`python start.py` builds the frontend and serves everything from the backend on one port.

### Configuration

| Variable | Where | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | backend | Shared key for the AI memo and metric explanations. Optional: visitors can add their own key in Settings. |
| `AI_PER_CLIENT_PER_HOUR`, `AI_SITE_PER_DAY` | backend | Limits on the shared key (defaults 20 and 400). |
| `VITE_API_BASE` | frontend build | Backend URL when the frontend is hosted separately. |

## Tests

```bash
python -m pytest backend/tests -q
```

The tests use synthetic data and make no network calls.

## API

| Endpoint | Returns |
| --- | --- |
| `GET /api/stock/search?q=` | Ticker suggestions |
| `GET /api/stock/{ticker}/analysis?investor=&horizon=` | Stock data, scorecard, valuation, margin of safety, risk flags, verdict |
| `GET /api/stock/{ticker}/lenses?horizon=` | All six lens verdicts and a consensus line |
| `GET /api/stock/{ticker}/price-history?period=` | Price history (`1mo` to `max`) |
| `GET /api/stock/{ticker}/ai-report`, `/metric-explanations` | Gemini-written memo and metric readings |
| `GET /api/screener?investor=&horizon=` | Scored universe; warms in the background on first use |
| `GET /api/market/overview` | Index levels with sparklines |
| `POST /api/portfolio/analyze` | Positions, allocation, correlation, performance, warnings |
| `POST /api/portfolio/optimize` | Three rebalancing strategies |

## How the numbers are made

- **Scorecard.** Eight fundamentals (earnings consistency, ROIC, FCF growth, profit margin, ROE, debt to equity, interest coverage, revenue growth), weighted per investor and adjusted for the company's sector. See `backend/services/scorecard.py` and `investor_sector_weights.py`.
- **Fair value.** A discounted cash flow model by default; earnings-based for financials, dividend discount for utilities, dividends paid for REITs. Growth is measured per share, fades to a terminal rate, and is floored and capped per sector. See `backend/services/dcf.py`.
- **Verdict.** Score, margin of safety and risk flags combine into Buy, Watchlist, Hold or Avoid. See `backend/services/classifier.py`.

The model is deliberately conservative, so high-growth companies often show a price well above fair value. The calculator on the analysis page lets you test your own growth and discount assumptions.

## Deploy

`render.yaml` deploys the backend to Render. `frontend/vercel.json` serves the frontend on Vercel; set `VITE_API_BASE` to the backend URL.
