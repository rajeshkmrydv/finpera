async function marketRequest(path, params) {
  const response = await fetch(`/api/market/${path}?${new URLSearchParams(params)}`);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Market data is unavailable.');
  return body;
}
export async function searchAssets(query, type) {
  if (!query || query.length < 2) return [];
  return marketRequest('search', { q: query, type });
}
export async function getPrice(symbol, type = '') {
  const quote = await marketRequest('quote', { symbol, type });
  return quote.price;
}
export async function fetchAssetQuoteWithDailyChange(asset) {
  if (!asset?.symbol) return null;
  return marketRequest('quote', { symbol: asset.symbol, type: asset.type || '', name: asset.name || '' });
}
export async function fetchCurrentPrice(asset) {
  const quote = await fetchAssetQuoteWithDailyChange(asset);
  return quote?.price ?? null;
}
