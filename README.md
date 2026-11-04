# FinPera - Personal Finance Tracker

A modern, client-side personal finance tracker built with React 19. Track your net worth across asset classes — stocks, mutual funds, crypto, gold, silver, and more — with live market prices and clean visual dashboards.

## Features

- **Portfolio Dashboard** — Gradient hero cards showing net worth, total assets, and liabilities at a glance. Donut chart for asset breakdown, horizontal bar chart for value by category, and a portfolio allocation bar.
- **Multi-Asset Tracking** — Supports Equity, Mutual Funds, Crypto, Commodities (Gold 22K, Silver), Fixed Income, NPS, PPF, and PF.
- **Live Market Prices**
  - **Stocks and ETFs** — via Upstox (search by name/symbol)
  - **Cryptocurrency** — Bitcoin and Ethereum via Gold-API.com
  - **Gold 22K & Silver** — via [Gold-API.com](https://gold-api.com) (spot INR valuations per gram)
- **Mutual Funds** — Published NAV from AMFI, with exact plan selection.
- **Unit-Based Tracking** — Enter quantity (shares, units, grams) and current price is auto-fetched. Total value = qty x price.
- **Liabilities Management** — Track loans with total amount, remaining balance, EMI, interest rate, and repayment progress bars.
- **CSV Import / Export** — Import holdings from CSV (supports Zerodha, Upstox, CAMS formats). Export portfolio as CSV backup.
- **Manual Entry** — Add investments manually with inline search and auto-fill.
- **Offline-First** — All data stored in `localStorage`. No backend required.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Build Tool | Vite 8 |
| Routing | React Router v7 |
| Charts | Recharts |
| Icons | Lucide React |
| CSV Parsing | Papa Parse |
| State | React Context + localStorage |
| Styling | Custom CSS with gradients, glassmorphism, animations |

## Getting Started

### Prerequisites

- Node.js 22.12+
- npm

### Installation

```bash
git clone https://github.com/rajeshkmrydv/finpera.git
cd finpera
npm install
```

### Configuration

Create a `.env` file for the server-side Upstox token:

```bash
cp .env.example .env
```

Generate a free Analytics Token in [Upstox Developer Apps](https://account.upstox.com/developer/apps), then set it locally:

```text
UPSTOX_ACCESS_TOKEN=your_upstox_analytics_token_here
```

Keep `.env` ignored by Git. Gold-API.com and AMFI require no API key.

### Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── AppLayout.jsx        # Main layout wrapper
│   ├── AssetSearch.jsx      # Provider-backed search autocomplete
│   ├── Sidebar.jsx          # Dark gradient navigation sidebar
│   └── Sidebar.css
├── context/
│   └── FinperaContext.jsx   # Global state (assets, liabilities, refresh)
├── pages/
│   ├── Dashboard.jsx        # Portfolio overview with charts
│   ├── Assets.jsx           # Asset management with CRUD
│   ├── Liabilities.jsx      # Loan tracking with progress
│   └── ImportExport.jsx     # CSV import/export + manual entry
├── utils/
│   ├── dummyData.js         # Sample data + asset type constants
│   └── priceService.js      # Client for the server market-data API
├── index.css                # Global styles, gradients, glassmorphism
├── App.jsx                  # Router setup
└── main.jsx                 # Entry point
```

## API Integrations

The app uses the same `/api/market/search` and `/api/market/quote` routes in development, preview, and production. Credentials are read only by the Node server, never bundled into React.

- **Stocks and ETFs:** Upstox instrument search and full market quotes. Existing `.NS` / `.BO` symbols resolve by exact exchange and ticker; new selections store the Upstox instrument key. Quotes are request-driven snapshots, cached for 10 seconds, not continuous streaming.
- **Gold 22K and silver:** Gold-API.com spot prices in INR per troy ounce, converted with 31.1034768 grams per troy ounce; 22K gold uses a 22/24 purity factor. Cached for 30 seconds. These exclude jewellery premiums, making charges and taxes. No synthetic previous-close changes are shown.
- **Crypto:** Bitcoin and Ethereum via Gold-API.com, preserving existing BTC-INR / ETH-INR holdings. Other cryptocurrencies remain manually priced.
- **Mutual funds:** AMFI's latest published NAV. Search and select the exact scheme, plan and option. Old Yahoo identifiers that cannot be matched uniquely require re-selection; stored prices remain untouched on failure. NAV data is cached for one hour.
- Failed provider calls keep the last stored holding price. Refresh feedback explains the first failure.

## Production / Railway

Use Node 22.12+ (or a newer supported LTS release).

1. Connect this GitHub repository to a Railway service.
2. Set build command to `npm run build` and start command to `npm start`.
3. Add `UPSTOX_ACCESS_TOKEN` as a Railway service variable. Do not use a `VITE_` prefix.
4. Generate a public domain. The server listens on `0.0.0.0` and Railway's `PORT` automatically, serves `dist`, and handles SPA routes and market API requests.

Run `npm run test:market` to verify provider normalization, caching, error handling and NAV parsing. Locally, `npm run dev` still starts Vite with the same backend market-data handler.

Data remains in browser localStorage. Export it from Settings on the old origin and import it on the deployed domain to migrate existing records.

## Screenshots

### Dashboard
Gradient hero cards for net worth, assets, liabilities. Donut chart, bar chart, allocation bar, and top holdings table.

### Assets
Searchable, filterable asset library with badge-coded types. Add/edit modal with live price auto-fill.

### Commodities
Select Gold 22K or Silver from dropdown — spot valuation per gram auto-fetched from Gold-API.com. Just enter grams.

## License

MIT
