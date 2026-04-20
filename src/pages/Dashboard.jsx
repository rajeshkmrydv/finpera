import React, { useMemo, useState, useCallback, memo } from 'react';
import { useFinpera } from '../context/FinperaContext';
import { UNIT_BASED_TYPES } from '../utils/dummyData';
import { formatCurrency, formatCompact, formatCurrencyDecimal, formatNumber } from '../utils/financeCalculations';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { TrendingUp, Wallet, CreditCard, Activity, RefreshCw, Loader, X, ArrowUpRight, ArrowDownRight, Scale, ShieldCheck, Heart, PiggyBank, Target, BarChart3, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#14b8a6', '#f97316', '#ec4899', '#06b6d4', '#64748b'];

const formatLac = (val) => {
  if (val >= 10000000) return `${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `${(val / 100000).toFixed(2)} L`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)} K`;
  return `${val}`;
};

const ChartTooltip = memo(({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', padding: '0.75rem 1rem', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
      <p style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '2px', color: 'var(--text-primary)' }}>{payload[0].name || payload[0].payload?.name}</p>
      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(payload[0].value)}</p>
    </div>
  );
});

const SCORE_COLORS = { high: '#10b981', medium: '#f59e0b', low: '#ef4444' };
const getScoreColor = (score) => score >= 70 ? SCORE_COLORS.high : score >= 40 ? SCORE_COLORS.medium : SCORE_COLORS.low;
const getScoreLabel = (score) => score >= 70 ? 'Healthy' : score >= 40 ? 'Needs Attention' : 'Critical';

const COMPONENT_META = {
  emergencyFund: { icon: PiggyBank, label: 'Emergency Fund' },
  debtRatio: { icon: CreditCard, label: 'Debt Ratio' },
  diversification: { icon: BarChart3, label: 'Diversification' },
  insurance: { icon: ShieldCheck, label: 'Insurance' },
  savingsRate: { icon: Wallet, label: 'Savings Rate' },
  goalProgress: { icon: Target, label: 'Goal Progress' },
};

const Dashboard = () => {
  const { netWorth, totalAssetsValue, totalLiabilitiesValue, assets, liabilities, totalMonthlyEMI, getAssetValue, refreshPrices, refreshing, lastRefreshed, healthScore } = useFinpera();
  const [refreshResult, setRefreshResult] = useState(null);

  const isUnitBased = (type) => UNIT_BASED_TYPES.includes(type);

  const assetAllocation = useMemo(() => {
    return assets.reduce((acc, asset) => {
      const val = getAssetValue(asset);
      const existing = acc.find(a => a.name === asset.type);
      if (existing) existing.value += val;
      else acc.push({ name: asset.type, value: val });
      return acc;
    }, []).sort((a, b) => b.value - a.value);
  }, [assets, getAssetValue]);

  const topAssets = useMemo(() => {
    return [...assets].sort((a, b) => getAssetValue(b) - getAssetValue(a)).slice(0, 5);
  }, [assets, getAssetValue]);

  const allocationBarData = useMemo(() => {
    const total = assetAllocation.reduce((s, a) => s + a.value, 0);
    if (total === 0) return [];
    return assetAllocation.map((a, i) => ({ ...a, pct: (a.value / total * 100), color: COLORS[i % COLORS.length] }));
  }, [assetAllocation]);

  const handleRefresh = useCallback(async () => {
    setRefreshResult(null);
    const result = await refreshPrices();
    setRefreshResult(result);
    setTimeout(() => setRefreshResult(null), 5000);
  }, [refreshPrices]);

  const refreshableCount = assets.filter(a => UNIT_BASED_TYPES.includes(a.type) && a.symbol).length;
  const assetRatio = totalAssetsValue + totalLiabilitiesValue > 0 ? (totalAssetsValue / (totalAssetsValue + totalLiabilitiesValue)) * 100 : 100;

  const renderCenterLabel = (props) => {
    const vb = props?.viewBox;
    if (!vb || vb.cx == null) return null;
    const { cx, cy } = vb;
    const totalVal = assetAllocation.reduce((s, a) => s + a.value, 0);
    return (
      <g>
        <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--text-tertiary)" fontSize="12" fontWeight="500">Total</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fill="var(--text-primary)" fontSize="18" fontWeight="700" letterSpacing="-0.03em">
          {formatCompact(totalVal)}
        </text>
      </g>
    );
  };

  const scoreColor = getScoreColor(healthScore.overall);

  return (
    <div>
      <div className="flex justify-between items-center mb-6" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Financial Overview</h1>
          <p>Your portfolio at a glance</p>
        </div>
        <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
          {lastRefreshed && (
            <span className="text-xs text-muted">
              Updated {new Date(lastRefreshed).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          )}
          {refreshableCount > 0 && (
            <button className="btn btn-secondary" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={16} />}
              {refreshing ? 'Updating...' : 'Refresh'}
            </button>
          )}
        </div>
      </div>

      {refreshResult && (
        <div className={`status-message ${refreshResult.failed > 0 && refreshResult.updated === 0 ? 'error' : 'success'} mb-4`}>
          <span>
            {refreshResult.updated > 0 && `Updated ${refreshResult.updated} price${refreshResult.updated > 1 ? 's' : ''}.`}
            {refreshResult.failed > 0 && ` ${refreshResult.failed} failed.`}
          </span>
          <button className="btn-ghost btn-sm ml-auto" onClick={() => setRefreshResult(null)} aria-label="Dismiss"><X size={14} /></button>
        </div>
      )}

      {/* Hero Cards */}
      <div className="grid-hero mb-6">
        <div className="gradient-card grd-indigo animate-slideUp stagger-1">
          <div className="flex justify-between items-start">
            <div>
              <p className="card-label">Net Worth</p>
              <p className="card-value lg">{formatCurrency(netWorth)}</p>
              <div className="card-sub" style={{ marginTop: '0.75rem' }}>
                <div className="flex gap-3 items-center" style={{ flexWrap: 'wrap' }}>
                  <span className="flex items-center gap-1"><ArrowUpRight size={14} /> {formatCompact(totalAssetsValue)} assets</span>
                  <span className="flex items-center gap-1"><ArrowDownRight size={14} /> {formatCompact(totalLiabilitiesValue)} debt</span>
                </div>
              </div>
            </div>
            <div className="card-icon"><TrendingUp size={22} /></div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', background: 'rgba(255,255,255,0.15)' }}>
              <div style={{ width: `${assetRatio}%`, background: 'rgba(255,255,255,0.7)', borderRadius: '3px', transition: 'width 0.6s ease' }} />
            </div>
            <div className="flex justify-between" style={{ marginTop: '4px', fontSize: '0.7rem', opacity: 0.6 }}>
              <span>Assets</span><span>Liabilities</span>
            </div>
          </div>
        </div>

        <div className="gradient-card grd-emerald animate-slideUp stagger-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="card-label">Total Assets</p>
              <p className="card-value">{formatCurrency(totalAssetsValue)}</p>
              <p className="card-sub">{assets.length} investment{assets.length !== 1 ? 's' : ''} tracked</p>
            </div>
            <div className="card-icon"><Wallet size={22} /></div>
          </div>
        </div>

        <div className="gradient-card grd-rose animate-slideUp stagger-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="card-label">Total Liabilities</p>
              <p className="card-value">{formatCurrency(totalLiabilitiesValue)}</p>
              {totalMonthlyEMI > 0 ? (
                <p className="card-sub">{formatCurrency(totalMonthlyEMI)}/mo EMI</p>
              ) : (
                <p className="card-sub">{liabilities.length} active loan{liabilities.length !== 1 ? 's' : ''}</p>
              )}
            </div>
            <div className="card-icon"><CreditCard size={22} /></div>
          </div>
        </div>
      </div>

      {/* Financial Health Score */}
      <div className="glass-panel no-hover animate-slideUp stagger-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Zap size={20} style={{ color: scoreColor }} /> Financial Health Score
            </h3>
            <p className="text-xs text-muted">A comprehensive view of your financial wellness</p>
          </div>
          <div className="flex items-center gap-3">
            <div style={{ position: 'relative', width: '64px', height: '64px' }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="16" fill="none" stroke="var(--bg-tertiary)" strokeWidth="3" />
                <circle cx="18" cy="18" r="16" fill="none" stroke={scoreColor} strokeWidth="3"
                  strokeDasharray={`${healthScore.overall} ${100 - healthScore.overall}`}
                  strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: scoreColor }}>{healthScore.overall}</span>
              </div>
            </div>
            <span className="badge" style={{ background: `${scoreColor}18`, color: scoreColor }}>{getScoreLabel(healthScore.overall)}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
          {Object.entries(healthScore.components).map(([key, comp]) => {
            const meta = COMPONENT_META[key];
            if (!meta) return null;
            const Icon = meta.icon;
            const barColor = comp.score >= 7 ? '#10b981' : comp.score >= 4 ? '#f59e0b' : '#ef4444';
            return (
              <div key={key} style={{ padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} style={{ color: barColor, flexShrink: 0 }} />
                  <span className="text-xs font-medium truncate">{meta.label}</span>
                  <span className="text-xs font-bold ml-auto" style={{ color: barColor }}>{comp.score}/10</span>
                </div>
                <div style={{ height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${comp.score * 10}%`, height: '100%', background: barColor, borderRadius: '2px', transition: 'width 0.5s ease' }} />
                </div>
                <p className="text-xs text-muted" style={{ marginTop: '4px', lineHeight: 1.3 }}>{comp.tip}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Allocation Bar */}
      {allocationBarData.length > 0 && (
        <div className="glass-panel no-hover animate-slideUp mb-4" style={{ padding: '1.25rem 1.5rem', animationDelay: '0.3s' }}>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>Portfolio Allocation</h3>
            <Link to="/assets" className="text-xs" style={{ color: 'var(--accent-primary)' }}>View details</Link>
          </div>
          <div className="alloc-bar">
            {allocationBarData.map((seg, i) => (
              <div key={i} className="alloc-bar-segment" style={{ width: `${seg.pct}%`, background: seg.color }} title={`${seg.name}: ${seg.pct.toFixed(1)}%`} />
            ))}
          </div>
          <div className="flex flex-wrap gap-4 mt-3">
            {allocationBarData.map(seg => (
              <div key={seg.name} className="flex items-center gap-2">
                <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: seg.color, flexShrink: 0 }} />
                <span className="text-xs text-muted">{seg.name}</span>
                <span className="text-xs font-medium">{seg.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid-2col mb-4">
        <div className="glass-panel no-hover animate-slideUp" style={{ animationDelay: '0.35s' }}>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold">Asset Breakdown</h3>
            <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.06)', color: 'var(--accent-primary)', width: '36px', height: '36px' }}>
              <Activity size={18} />
            </div>
          </div>
          {assetAllocation.length > 0 ? (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={assetAllocation} cx="50%" cy="50%" innerRadius={72} outerRadius={105} paddingAngle={3} dataKey="value" stroke="none" animationDuration={800} animationBegin={200} label={renderCenterLabel} labelLine={false}>
                    {assetAllocation.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state" style={{ height: 280 }}>
              <div className="empty-state-icon"><Activity size={24} /></div>
              <p className="text-muted text-sm">Add assets to see breakdown.</p>
            </div>
          )}
        </div>

        <div className="glass-panel no-hover animate-slideUp" style={{ animationDelay: '0.4s' }}>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold">Value by Category</h3>
            <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.06)', color: 'var(--success)', width: '36px', height: '36px' }}>
              <Scale size={18} />
            </div>
          </div>
          {assetAllocation.length > 0 ? (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={assetAllocation} layout="vertical" margin={{ top: 5, right: 60, left: 5, bottom: 5 }} barSize={16}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={85} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,0.04)' }} />
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#a78bfa" />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="value" fill="url(#barGrad)" radius={[0, 8, 8, 0]} animationDuration={800}
                    label={({ x, y, width, value, height }) => (
                      <text x={x + width + 6} y={y + height / 2} dy={4} fontSize={11} fontWeight={600} fill="var(--text-secondary)">{formatLac(value)}</text>
                    )}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state" style={{ height: 280 }}>
              <div className="empty-state-icon"><Scale size={24} /></div>
              <p className="text-muted text-sm">No categories to display.</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Holdings */}
      <div className="glass-panel no-hover animate-slideUp" style={{ animationDelay: '0.45s' }}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold">Top Holdings</h3>
          <Link to="/assets" className="btn btn-secondary btn-sm">View all</Link>
        </div>
        {topAssets.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Value</th>
                  <th style={{ width: '100px' }}>Share</th>
                </tr>
              </thead>
              <tbody>
                {topAssets.map((asset, idx) => {
                  const ub = isUnitBased(asset.type);
                  const val = getAssetValue(asset);
                  const share = totalAssetsValue > 0 ? (val / totalAssetsValue * 100) : 0;
                  return (
                    <tr key={asset.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="row-number" style={{ background: `${COLORS[idx % COLORS.length]}15`, color: COLORS[idx % COLORS.length] }}>{idx + 1}</span>
                          <div>
                            <span className="font-medium text-strong">{asset.name}</span>
                            {asset.symbol && <span className="text-xs text-muted" style={{ display: 'block', marginTop: '1px' }}>{asset.symbol}</span>}
                          </div>
                        </div>
                      </td>
                      <td><span className="chip">{asset.type}</span></td>
                      <td className="text-right">{ub && asset.qty ? formatNumber(asset.qty) : <span className="text-muted">&mdash;</span>}</td>
                      <td className="text-right">{ub && asset.currentPrice ? formatCurrencyDecimal(asset.currentPrice) : <span className="text-muted">&mdash;</span>}</td>
                      <td className="text-right text-strong font-medium">{formatCurrency(val)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div style={{ flex: 1, height: '5px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${share}%`, height: '100%', background: COLORS[idx % COLORS.length], borderRadius: '3px', transition: 'width 0.5s ease' }} />
                          </div>
                          <span className="text-xs text-muted" style={{ minWidth: '36px', textAlign: 'right' }}>{share.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{ height: 200 }}>
            <div className="empty-state-icon"><Wallet size={24} /></div>
            <p className="text-muted text-sm">No assets recorded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
