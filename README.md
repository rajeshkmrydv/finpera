# FinPera - Personal Finance Tracker

A modern, client-side personal finance tracker built with React 19. Track your net worth across asset classes — stocks, mutual funds, crypto, gold, silver, and more — with live market prices and clean visual dashboards.

## Features

- **Portfolio Dashboard** — Gradient hero cards showing net worth, total assets, and liabilities at a glance. Donut chart for asset breakdown, horizontal bar chart for value by category, and a portfolio allocation bar.
- **Multi-Asset Tracking** — Supports Equity, Mutual Funds, Crypto, Commodities (Gold 22K, Silver), Fixed Income, NPS, PPF, and PF.
- **Live Market Prices**
  - **Stocks, ETFs, Mutual Funds** — via Yahoo Finance API (auto-search by name/symbol)
  - **Cryptocurrency** — via Yahoo Finance (BTC-INR, ETH-INR, etc.)
  - **Gold 22K & Silver** — via [GoldPriceZ API](https://goldpricez.com/about/api) (live per-gram rates for India)
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

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/rajeshkmrydv/finpera.git
cd finpera
npm install
```

### Configuration

Create a `.env` file for live gold/silver prices:

```bash
cp .env.example .env
```

Get a free API key from [GoldPriceZ](https://goldpricez.com/key/registration) and add it:

```
VITE_GOLDPRICEZ_API_KEY=your_api_key_here
```

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
│   ├── AssetSearch.jsx      # Yahoo Finance search autocomplete
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
│   └── priceService.js      # Yahoo Finance + GoldPriceZ API integration
├── index.css                # Global styles, gradients, glassmorphism
├── App.jsx                  # Router setup
└── main.jsx                 # Entry point
```

## API Integrations

### Yahoo Finance (via Vite proxy)
- **Search**: `/v1/finance/search` — find stocks, MFs, ETFs, crypto by name
- **Quote**: `/v8/finance/chart/{symbol}` — fetch current market price
- Proxied through Vite dev server to avoid CORS

### GoldPriceZ (via Vite proxy)
- **Endpoint**: `/api/rates/currency/INR/measure/gram/metal/all`
- Returns 24K gold and silver prices per gram in INR
- App calculates 22K price: `24K price x (22/24)`
- Free tier: 30-60 requests/hour (cached for 5 minutes)

## Screenshots

### Dashboard
Gradient hero cards for net worth, assets, liabilities. Donut chart, bar chart, allocation bar, and top holdings table.

### Assets
Searchable, filterable asset library with badge-coded types. Add/edit modal with live price auto-fill.

### Commodities
Select Gold 22K or Silver from dropdown — live price per gram auto-fetched from GoldPriceZ. Just enter grams.

## License

MIT
