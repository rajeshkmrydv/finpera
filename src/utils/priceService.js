const INDIAN_EXCHANGES = ['NSI', 'NSE', 'BSE', 'BOM'];

let goldPriceCache = { data: null, ts: 0 };
const CACHE_TTL = 5 * 60 * 1000;

async function fetchGoldPriceZ() {
  if (goldPriceCache.data && Date.now() - goldPriceCache.ts < CACHE_TTL) {
    return goldPriceCache.data;
  }
  try {
    const res = await fetch('/api/goldpricez/api/rates/currency/INR/measure/gram/metal/all');
    if (!res.ok) return null;
    const data = await res.json();
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    if (parsed.error || parsed.status === false) return null;
    goldPriceCache = { data: parsed, ts: Date.now() };
    return parsed;
  } catch {
    return null;
  }
}

async function getGoldPrice22K() {
  const data = await fetchGoldPriceZ();
  if (!data) return null;
  const price24k = parseFloat(data.gram_in_inr);
  if (isNaN(price24k)) return null;
  return Math.round(price24k * (22 / 24) * 100) / 100;
}

async function getSilverPricePerGram() {
  const data = await fetchGoldPriceZ();
  if (!data) return null;
  const price = parseFloat(data.silver_gram_in_inr);
  if (isNaN(price)) return null;
  return Math.round(price * 100) / 100;
}

export async function searchAssets(query, type) {
  if (!query || query.length < 2) return [];
  try {
    const searchQuery = type === 'Crypto' ? `${query} INR` : query;
    const url = `/api/yahoo-search/v1/finance/search?q=${encodeURIComponent(searchQuery)}&quotesCount=12&newsCount=0&listsCount=0`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Yahoo search failed');
    const data = await res.json();

    return (data.quotes || [])
      .filter(q => {
        if (type === 'Crypto') {
          return q.quoteType === 'CRYPTOCURRENCY' && (q.symbol || '').endsWith('-INR');
        }
        if (type === 'Commodity') {
          return (q.symbol || '').endsWith('INR=X') || q.quoteType === 'FUTURE' || q.quoteType === 'COMMODITY';
        }
        const isIndian = INDIAN_EXCHANGES.includes(q.exchange) || INDIAN_EXCHANGES.includes(q.exchDisp);
        if (!isIndian) return false;
        if (type === 'Mutual Fund') return q.quoteType === 'MUTUALFUND';
        return q.quoteType === 'EQUITY' || q.quoteType === 'ETF';
      })
      .map(q => ({
        symbol: q.symbol,
        name: (q.longname || q.shortname || q.symbol).replace(/ INR$/i, ''),
        exchange: q.exchDisp || q.exchange,
        quoteType: q.quoteType,
      }));
  } catch {
    return [];
  }
}

export async function getPrice(symbol) {
  const quote = await getYahooQuoteDetails(symbol);
  return quote?.price ?? null;
}

function loadCommoditySnapshots() {
  try {
    const raw = localStorage.getItem('finpera_commodity_daily_snapshots');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCommoditySnapshots(snapshots) {
  localStorage.setItem('finpera_commodity_daily_snapshots', JSON.stringify(snapshots));
}

function getCommodityDailyChange(symbol, currentPrice) {
  if (currentPrice == null || currentPrice <= 0) {
    return { price: currentPrice, previousClose: null, change: null, changePercent: null };
  }

  const today = new Date().toISOString().slice(0, 10);
  const snapshots = loadCommoditySnapshots();
  const snap = snapshots[symbol];
  let previousClose = null;

  if (snap?.date === today) {
    previousClose = snap.previousClose ?? null;
    snapshots[symbol] = { ...snap, close: currentPrice };
  } else if (snap?.close != null) {
    previousClose = snap.close;
    snapshots[symbol] = { date: today, close: currentPrice, previousClose: snap.close };
  } else {
    snapshots[symbol] = { date: today, close: currentPrice, previousClose: null };
  }

  saveCommoditySnapshots(snapshots);

  if (previousClose == null || previousClose === 0) {
    return { price: currentPrice, previousClose: null, change: null, changePercent: null };
  }

  const change = currentPrice - previousClose;
  const changePercent = (change / previousClose) * 100;
  return { price: currentPrice, previousClose, change, changePercent };
}

async function getYahooQuoteDetails(symbol) {
  if (!symbol) return null;
  try {
    const url = `/api/yahoo-quote/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Yahoo quote failed');
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const price = meta.regularMarketPrice ?? null;
    const previousClose =
      meta.chartPreviousClose ??
      meta.previousClose ??
      meta.regularMarketPreviousClose ??
      null;

    let change = meta.regularMarketChange;
    let changePercent = meta.regularMarketChangePercent;

    if ((change == null || changePercent == null) && price != null && previousClose != null) {
      change = price - previousClose;
      changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;
    }

    return { price, previousClose, change, changePercent };
  } catch {
    return null;
  }
}

/** Current price + daily change vs previous close (Yahoo or commodity snapshot). */
export async function fetchAssetQuoteWithDailyChange(asset) {
  if (!asset?.symbol) return null;

  if (asset.symbol === 'GOLD22K') {
    const price = await getGoldPrice22K();
    return price != null ? getCommodityDailyChange(asset.symbol, price) : null;
  }
  if (asset.symbol === 'SILVER_GRAM') {
    const price = await getSilverPricePerGram();
    return price != null ? getCommodityDailyChange(asset.symbol, price) : null;
  }

  return getYahooQuoteDetails(asset.symbol);
}

export async function fetchCurrentPrice(asset) {
  const quote = await fetchAssetQuoteWithDailyChange(asset);
  return quote?.price ?? null;
}
