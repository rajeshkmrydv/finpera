import test from 'node:test';
import assert from 'node:assert/strict';
import { createMarketData, normalizeQuote, parseNAV, resolveFund } from '../server/marketData.js';
const reply = body => ({ ok: true, json: async () => body });
test('Upstox maps legacy tickers, computes previous-close change and caches quotes', async () => {
 const calls=[];
 const market=createMarketData({token:'test-secret',fetchImpl:async(url,options)=>{
  calls.push(url);assert.equal(options.headers.Authorization,'Bearer test-secret');
  return reply(url.includes('/search?')?{status:'success',data:[{instrument_key:'NSE_EQ|TEST',segment:'NSE_EQ',exchange:'NSE',trading_symbol:'TEST',name:'Test Ltd'}]}:{status:'success',data:{'NSE_EQ:TEST':{instrument_token:'NSE_EQ|TEST',last_price:120,ohlc:{close:100}}}});
 }});
 const q=await market.quote('TEST.NS');assert.equal(q.price,120);assert.equal(q.changePercent,20);
 await market.quote('TEST.NS');assert.equal(calls.length,2);
});
test('metals convert troy ounces and purity, crypto stays per coin; credentials never go to Gold API',async()=>{
 let calls=0;
 const market=createMarketData({token:'test-secret',fetchImpl:async(url,opts)=>{assert.equal(opts.headers.Authorization,undefined);assert.match(url,/\/INR$/);calls++;return reply({price:31103.4768,updatedAt:'2026-11-04T12:00:00Z'});}});
 const gold=await market.quote('GOLD22K');assert.ok(Math.abs(gold.price-1000*22/24)<1e-8);assert.equal(gold.change,null);
 assert.ok(Math.abs((await market.quote('SILVER_GRAM')).price-1000)<1e-8);
 assert.equal((await market.quote('BTC-INR')).price,31103.4768);
 await market.quote('GOLD22K');assert.equal(calls,3);
});
test('AMFI parses valid NAVs and refuses ambiguous legacy identifiers',()=>{
 const funds=parseNAV('Scheme Code;ISIN Div Payout/ ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date\n123;A;B;Example Direct Growth;100.5;04-Nov-2026\n124;A;B;Example Direct IDCW;90;04-Nov-2026\n125;;;Bad Scheme;N.A.;04-Nov-2026');
 assert.equal(funds.length,2);assert.equal(resolveFund(funds,'AMFI:123').price,100.5);
 assert.equal(resolveFund(funds,'0POLD.BO','Example'),undefined);
 assert.equal(resolveFund(funds,'0POLD.BO','Example Direct Growth').symbol,'AMFI:123');
});
test('invalid prices, missing credentials and rate limits are handled explicitly',async()=>{
 assert.throws(()=>normalizeQuote(0,null,'test'));
 const noToken=createMarketData({fetchImpl:()=>{throw Error('should not call');}});
 await assert.rejects(noToken.search('TEST','Equity'),/not configured/);
 const limited=createMarketData({token:'secret',fetchImpl:async()=>({ok:false,status:429})});
 await assert.rejects(limited.search('TEST','Equity'),/rate limit/);
});
test('concurrent requests share one provider request',async()=>{
 let calls=0;const market=createMarketData({fetchImpl:async()=>{calls++;return reply({price:100});}});
 await Promise.all([market.quote('GOLD22K'),market.quote('GOLD22K')]);assert.equal(calls,1);
});

test('AMFI supports the current separate plan and option columns',()=>{
 const funds=parseNAV('135762;ISIN;-;Example Fund;Direct Plan;Growth Option;30.0483;04-Nov-2026');
 assert.equal(funds.length,1);assert.equal(funds[0].price,30.0483);
 assert.equal(funds[0].name,'Example Fund - Direct Plan - Growth Option');
});
