const TROY_OUNCE_GRAMS = 31.1034768;
const CRYPTO = [{ symbol: 'BTC-INR', name: 'Bitcoin', code: 'BTC' }, { symbol: 'ETH-INR', name: 'Ethereum', code: 'ETH' }];
export class MarketError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}
export function normalizeQuote(price, previousClose = null, source, updatedAt = null) {
  price = Number(price);
  if (!Number.isFinite(price) || price <= 0) throw new MarketError('Provider returned an invalid price.');
  previousClose = previousClose == null ? null : Number(previousClose);
  if (!Number.isFinite(previousClose) || previousClose <= 0) previousClose = null;
  const change = previousClose === null ? null : price - previousClose;
  return { price, previousClose, change, changePercent: change === null ? null : change / previousClose * 100, source, updatedAt };
}
export function parseNAV(text) {
  return text.split(/\r?\n/).flatMap(line => {
    const columns = line.split(';');
    const [code, isin1, isin2, scheme] = columns;
    const nav = columns.at(-2), date = columns.at(-1);
    const name = columns.length >= 8 ? [scheme, columns[4], columns[5]].filter(Boolean).join(' - ') : scheme;
    if (!/^\d+$/.test(code) || !name || !(Number(nav) > 0)) return [];
    return [{ symbol: `AMFI:${code}`, name: name.trim(), price: Number(nav), updatedAt: date, exchange: 'AMFI', quoteType: 'MUTUALFUND', isin1, isin2 }];
  });
}
const words = text => String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
export function resolveFund(funds, symbol, name) {
  if (symbol.startsWith('AMFI:')) return funds.find(f => f.symbol === symbol);
  // Legacy Yahoo fund IDs cannot safely identify a scheme. Require one unambiguous name match.
  const key = words(name).join(' ');
  const matches = key ? funds.filter(f => words(f.name).join(' ') === key) : [];
  return matches.length === 1 ? matches[0] : undefined;
}
export function createMarketData({ token = '', fetchImpl = fetch, now = Date.now } = {}) {
  const cache = new Map();
  async function cached(key, ttl, loader) {
    const hit = cache.get(key);
    if (hit && hit.until > now()) return hit.promise;
    if (cache.size > 1000) cache.clear();
    const promise = Promise.resolve().then(loader);
    cache.set(key, { until: now() + ttl, promise });
    try { return await promise; } catch (error) { cache.delete(key); throw error; }
  }
  async function request(url, authenticated = false, text = false) {
    if (authenticated && !token) throw new MarketError('Upstox is not configured. Set UPSTOX_ACCESS_TOKEN on the server.', 503);
    let res;
    try {
      res = await fetchImpl(url, { headers: { Accept: text ? 'text/plain' : 'application/json', ...(authenticated ? { Authorization: `Bearer ${token}` } : {}) }, signal: AbortSignal.timeout(15000) });
    } catch { throw new MarketError('Price provider is unavailable. Please try again.'); }
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) throw new MarketError('Upstox access was rejected. Check or renew the server token.', 503);
      if (res.status === 429) throw new MarketError('Provider rate limit reached. Please try again shortly.', 429);
      throw new MarketError('Price provider could not complete this request.');
    }
    return text ? res.text() : res.json();
  }
  const funds = () => cached('amfi', 60 * 60 * 1000, async () => parseNAV(await request('https://www.amfiindia.com/spages/NAVAll.txt', false, true)));
  async function stocks(query) {
    return cached(`search:${query}`, 60 * 1000, async () => {
      const params = new URLSearchParams({ query, exchanges: 'NSE,BSE', segments: 'EQ', records: '30' });
      const body = await request(`https://api.upstox.com/v2/instruments/search?${params}`, true);
      if (body.status !== 'success' || !Array.isArray(body.data)) throw new MarketError('Upstox returned an invalid search response.');
      return body.data.filter(i => ['NSE_EQ', 'BSE_EQ'].includes(i.segment)).map(i => ({ symbol: i.instrument_key, name: i.name, exchange: i.exchange, tradingSymbol: i.trading_symbol, quoteType: 'EQUITY' }));
    });
  }
  async function search(query, type) {
    if (query.length < 2) return [];
    if (type === 'Crypto') return CRYPTO.filter(i => words(`${i.name} ${i.code}`).join(' ').includes(query.toLowerCase())).map(i => ({ ...i, exchange: 'Gold-API.com', quoteType: 'CRYPTOCURRENCY' }));
    if (type === 'Mutual Fund') {
      const terms = words(query);
      return (await funds()).filter(f => terms.every(t => words(f.name).join(' ').includes(t))).slice(0, 20).map(({ symbol, name, exchange, quoteType }) => ({ symbol, name, exchange, quoteType }));
    }
    return stocks(query);
  }
  async function quote(symbol, type = '', name = '') {
    const crypto = CRYPTO.find(i => i.symbol === symbol || i.code === symbol);
    if (['GOLD22K', 'SILVER_GRAM'].includes(symbol) || crypto) {
      const code = crypto?.code || (symbol === 'GOLD22K' ? 'XAU' : 'XAG');
      const body = await cached(`metal:${code}`, 30000, () => request(`https://api.gold-api.com/price/${code}/INR`));
      const conversion = crypto ? 1 : (symbol === 'GOLD22K' ? 22 / 24 : 1) / TROY_OUNCE_GRAMS;
      return normalizeQuote(Number(body.price) * conversion, null, 'Gold-API.com', body.updatedAt || null);
    }
    if (type === 'Mutual Fund' || symbol.startsWith('AMFI:') || /^0P/.test(symbol)) {
      const fund = resolveFund(await funds(), symbol, name);
      if (!fund) throw new MarketError('This fund needs to be linked to an AMFI scheme. Edit the asset and select its exact plan from search.', 422);
      return normalizeQuote(fund.price, null, 'AMFI (published NAV)', fund.updatedAt);
    }
    let key = symbol;
    if (!/^(NSE_EQ|BSE_EQ)\|[A-Z0-9]+$/.test(key)) {
      const exchange = symbol.endsWith('.BO') ? 'BSE' : 'NSE';
      const ticker = symbol.replace(/\.(NS|BO)$/, '');
      const matches = (await stocks(ticker)).filter(i => i.exchange === exchange && i.tradingSymbol?.toUpperCase() === ticker.toUpperCase());
      if (matches.length !== 1) throw new MarketError('Stock symbol could not be resolved safely. Edit the asset and select its current listing from search.', 422);
      key = matches[0].symbol;
    }
    return cached(`quote:${key}`, 10000, async () => {
      const body = await request(`https://api.upstox.com/v2/market-quote/quotes?${new URLSearchParams({ instrument_key: key })}`, true);
      const item = Object.values(body.data || {}).find(q => q.instrument_token === key);
      if (body.status !== 'success' || !item) throw new MarketError('No quote is available for this instrument.', 404);
      return normalizeQuote(item.last_price, item.ohlc?.close, 'Upstox', item.timestamp || null);
    });
  }
  return { search, quote };
}
export function createMarketHandler(options) {
  const market = createMarketData(options);
  return async function marketHandler(req, res, next = () => { res.writeHead(404); res.end(); }) {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/market/')) return next();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET') { res.writeHead(405, { Allow: 'GET' }); return res.end(JSON.stringify({ error: 'Method not allowed.' })); }
    try {
      const type = (url.searchParams.get('type') || '').slice(0, 30);
      if (url.pathname === '/api/market/search') {
        const query = (url.searchParams.get('q') || '').trim();
        if (query.length > 50) throw new MarketError('Search must be 50 characters or fewer.', 400);
        res.end(JSON.stringify(await market.search(query, type)));
      } else if (url.pathname === '/api/market/quote') {
        const symbol = url.searchParams.get('symbol') || '';
        if (!symbol || symbol.length > 100) throw new MarketError('A valid symbol is required.', 400);
        res.end(JSON.stringify(await market.quote(symbol, type, (url.searchParams.get('name') || '').slice(0, 250))));
      } else { res.writeHead(404); res.end(JSON.stringify({ error: 'Unknown market endpoint.' })); }
    } catch (error) {
      res.writeHead(error instanceof MarketError ? error.status : 502);
      res.end(JSON.stringify({ error: error instanceof MarketError ? error.message : 'Market data is temporarily unavailable.' }));
    }
  };
}
