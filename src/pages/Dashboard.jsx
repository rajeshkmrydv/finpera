import React, { useMemo, useState, useCallback, memo } from 'react';
import { useFinpera } from '../context/FinperaContext';
import { UNIT_BASED_TYPES } from '../utils/dummyData';
import { formatCurrency, formatCompact, formatCurrencyDecimal, formatNumber } from '../utils/financeCalculations';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { TrendingUp, Wallet, CreditCard, Activity, X, ArrowUpRight, ArrowDownRight, Scale, PiggyBank, Target, BarChart3, Zap, ShieldCheck, PieChart as PieIcon, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import ExpandablePanel from '../components/ExpandablePanel';
import FloatingActions from '../components/FloatingActions';
import DailyChangeBadge from '../components/DailyChange';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#8b5cf6', '#06b6d4', '#f97316', '#64748b'];

const formatLac = (val) => {
  if (val >= 10000000) return `${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `${(val / 100000).toFixed(2)} L`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)} K`;
  return `${val}`;
};

const ChartTooltip = memo(({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', padding: '0.75rem 1rem', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
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

const ScoreRing = ({ score, color, size = 52 }) => (
  <div className="health-score-ring" style={{ width: size, height: size }}>
    <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
      <circle cx="18" cy="18" r="16" fill="none" stroke="var(--bg-tertiary)" strokeWidth="3" />
      <circle cx="18" cy="18" r="16" fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={`${score} ${100 - score}`}
        strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
    </svg>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: size > 52 ? '1rem' : '0.85rem', fontWeight: 700, color }}>{score}</span>
    </div>
  </div>
);

const Dashboard = () => {
  const { netWorth, totalAssetsValue, totalLiabilitiesValue, assets, liabilities, totalMonthlyEMI, getAssetValue, getAssetDailyChange, totalDailyValueChange, refreshPrices, refreshing, lastRefreshed, healthScore } = useFinpera();
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
  const scoreColor = getScoreColor(healthScore.overall);

  /** Sorted movers: assets with live daily-change data, ranked by |valueChange| desc */
  const movers = useMemo(() => {
    return assets
      .map(a => ({ asset: a, dc: getAssetDailyChange(a) }))
      .filter(({ dc }) => dc && dc.changePercent != null)
      .sort((a, b) => Math.abs(b.dc.valueChange) - Math.abs(a.dc.valueChange));
  }, [assets, getAssetDailyChange]);

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

  return (
    <div className="dashboard-page">
      <div className="flex justify-between items-center mb-5" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Financial Overview</h1>
          <p>Your portfolio at a glance</p>
        </div>
        {lastRefreshed && (
          <span className="text-xs text-muted" style={{ background: 'rgba(255,255,255,0.7)', padding: '0.35rem 0.75rem', borderRadius: '999px', border: '1px solid var(--border-color)' }}>
            Updated {new Date(lastRefreshed).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        )}
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

      {/* Hero Cards — always visible, floating animation */}
      <div className="grid-hero mb-5">
        <div className="gradient-card grd-indigo floating-card animate-slideUp stagger-1">
          <div className="flex justify-between items-start">
            <div>
              <p className="card-label">Net Worth</p>
              <p className="card-value lg">{formatCurrency(netWorth)}</p>
              <div className="card-sub" style={{ marginTop: '0.75rem' }}>
                <div className="flex gap-3 items-center" style={{ flexWrap: 'wrap' }}>
                  <span className="flex items-center gap-1"><ArrowUpRight size={14} /> {formatCompact(totalAssetsValue)}</span>
                  <span className="flex items-center gap-1"><ArrowDownRight size={14} /> {formatCompact(totalLiabilitiesValue)}</span>
                </div>
                {totalDailyValueChange !== 0 && (
                  <div style={{ marginTop: '0.4rem' }}>
                    <DailyChangeBadge
                      valueChange={totalDailyValueChange}
                      changePercent={totalAssetsValue > 0 ? (totalDailyValueChange / (totalAssetsValue - totalDailyValueChange)) * 100 : null}
                      showValueChange
                      size="sm"
                      className=""
                    />
                    <span style={{ fontSize: '0.72rem', opacity: 0.7, marginLeft: '0.35rem' }}>today</span>
                  </div>
                )}
              </div>
            </div>
            <div className="card-icon"><TrendingUp size={22} /></div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', background: 'rgba(255,255,255,0.15)' }}>
              <div style={{ width: `${assetRatio}%`, background: 'rgba(255,255,255,0.85)', borderRadius: '3px', transition: 'width 0.6s ease' }} />
            </div>
          </div>
        </div>

        <div className="gradient-card grd-emerald floating-card animate-slideUp stagger-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="card-label">Total Assets</p>
              <p className="card-value">{formatCurrency(totalAssetsValue)}</p>
              <p className="card-sub">{assets.length} investment{assets.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="card-icon"><Wallet size={22} /></div>
          </div>
        </div>

        <div className="gradient-card grd-rose floating-card animate-slideUp stagger-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="card-label">Total Liabilities</p>
              <p className="card-value">{formatCurrency(totalLiabilitiesValue)}</p>
              {totalMonthlyEMI > 0 ? (
                <p className="card-sub">{formatCurrency(totalMonthlyEMI)}/mo EMI</p>
              ) : (
                <p className="card-sub">{liabilities.length} loan{liabilities.length !== 1 ? 's' : ''}</p>
              )}
            </div>
            <div className="card-icon"><CreditCard size={22} /></div>
          </div>
        </div>
      </div>

      {/* Health Score — collapsed by default, expand for details */}
      <ExpandablePanel
        className="mb-4 animate-slideUp stagger-4"
        title="Financial Health Score"
        subtitle={`${getScoreLabel(healthScore.overall)} · tap to see breakdown`}
        icon={Zap}
        iconColor={scoreColor}
        accent={`linear-gradient(90deg, ${scoreColor}, transparent)`}
        defaultOpen={false}
        badge={
          <div className="flex items-center gap-2">
            <ScoreRing score={healthScore.overall} color={scoreColor} />
            <span className="health-chip" style={{ background: `${scoreColor}18`, color: scoreColor }}>{getScoreLabel(healthScore.overall)}</span>
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.65rem', paddingTop: '0.5rem' }}>
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
              </div>
            );
          })}
        </div>
      </ExpandablePanel>

      {/* Today's Movers */}
      {movers.length > 0 && (
        <ExpandablePanel
          className="mb-4 animate-slideUp"
          title="Today's Movers"
          subtitle={`${movers.length} asset${movers.length > 1 ? 's' : ''} with live daily data`}
          icon={movers.some(m => m.dc.valueChange > 0) ? TrendingUp : TrendingDown}
          iconColor={totalDailyValueChange >= 0 ? '#10b981' : '#ef4444'}
          accent={`linear-gradient(90deg, ${totalDailyValueChange >= 0 ? '#10b981' : '#ef4444'}, transparent)`}
          defaultOpen={true}
          badge={
            <DailyChangeBadge
              valueChange={totalDailyValueChange}
              changePercent={totalAssetsValue > 0 ? (totalDailyValueChange / Math.max(totalAssetsValue - totalDailyValueChange, 1)) * 100 : null}
              showValueChange
              size="sm"
            />
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '0.25rem' }}>
            {movers.map(({ asset, dc }, idx) => {
              const isUp = dc.valueChange >= 0;
              const color = isUp ? 'var(--success)' : 'var(--danger)';
              const maxAbs = Math.abs(movers[0]?.dc?.valueChange ?? 1);
              const barWidth = maxAbs > 0 ? Math.abs(dc.valueChange) / maxAbs * 100 : 0;
              return (
                <div key={asset.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.6rem 0.75rem',
                  background: `${color}08`,
                  borderRadius: 'var(--border-radius-sm)',
                  border: `1px solid ${color}20`,
                  transition: 'background 0.2s',
                }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: `${color}18`, color, fontSize: '0.7rem',
                    fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>{idx + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{asset.name}</span>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{asset.type}</span>
                    </div>
                    <div style={{ marginTop: '0.3rem', height: '3px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${barWidth}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                  <DailyChangeBadge
                    changePercent={dc.changePercent}
                    change={dc.change}
                    valueChange={dc.valueChange}
                    showValueChange
                    size="sm"
                  />
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted" style={{ marginTop: '0.75rem' }}>
            Based on previous close. Refresh prices for real-time data.
          </p>
        </ExpandablePanel>
      )}

      {/* Portfolio Allocation — collapsed, expand for legend */}
      {allocationBarData.length > 0 && (
        <ExpandablePanel
          className="mb-4 animate-slideUp"
          title="Portfolio Allocation"
          subtitle={`${allocationBarData.length} asset classes`}
          icon={PieIcon}
          iconColor="#6366f1"
          accent="linear-gradient(90deg, #6366f1, #ec4899)"
          defaultOpen={false}
          badge={
            <div className="alloc-bar" style={{ width: '120px', height: '8px' }}>
              {allocationBarData.map((seg, i) => (
                <div key={i} className="alloc-bar-segment" style={{ width: `${seg.pct}%`, background: seg.color }} />
              ))}
            </div>
          }
        >
          <div className="alloc-bar mb-3" style={{ height: '12px' }}>
            {allocationBarData.map((seg, i) => (
              <div key={i} className="alloc-bar-segment" style={{ width: `${seg.pct}%`, background: seg.color }} title={`${seg.name}: ${seg.pct.toFixed(1)}%`} />
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            {allocationBarData.map(seg => (
              <div key={seg.name} className="flex items-center gap-2" style={{ background: 'var(--bg-primary)', padding: '0.35rem 0.65rem', borderRadius: '999px', border: '1px solid var(--border-color)' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
                <span className="text-xs">{seg.name}</span>
                <span className="text-xs font-bold" style={{ color: seg.color }}>{seg.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Link to="/assets" className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>View all assets →</Link>
          </div>
        </ExpandablePanel>
      )}

      {/* Charts — expandable analytics section */}
      <ExpandablePanel
        className="mb-4 animate-slideUp"
        title="Analytics"
        subtitle="Asset breakdown & value by category"
        icon={Activity}
        iconColor="#10b981"
        accent="linear-gradient(90deg, #10b981, #06b6d4)"
        defaultOpen={true}
      >
        <div className="grid-2col" style={{ gap: '1rem', paddingTop: '0.5rem' }}>
          <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--border-radius-md)', padding: '1rem', border: '1px solid var(--border-color)' }}>
            <h4 className="text-sm font-bold mb-2">Asset Breakdown</h4>
            {assetAllocation.length > 0 ? (
              <div style={{ width: '100%', height: 240 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={assetAllocation} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none" animationDuration={800} label={renderCenterLabel} labelLine={false}>
                      {assetAllocation.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty-state" style={{ height: 200, padding: '1.5rem' }}>
                <p className="text-muted text-sm">Add assets to see breakdown.</p>
              </div>
            )}
          </div>

          <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--border-radius-md)', padding: '1rem', border: '1px solid var(--border-color)' }}>
            <h4 className="text-sm font-bold mb-2">Value by Category</h4>
            {assetAllocation.length > 0 ? (
              <div style={{ width: '100%', height: 240 }}>
                <ResponsiveContainer>
                  <BarChart data={assetAllocation} layout="vertical" margin={{ top: 5, right: 55, left: 5, bottom: 5 }} barSize={14}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,0.04)' }} />
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                    <Bar dataKey="value" fill="url(#barGrad)" radius={[0, 6, 6, 0]} animationDuration={800}
                      label={({ x, y, width, value, height }) => (
                        <text x={x + width + 4} y={y + height / 2} dy={4} fontSize={10} fontWeight={600} fill="var(--text-secondary)">{formatLac(value)}</text>
                      )}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty-state" style={{ height: 200, padding: '1.5rem' }}>
                <p className="text-muted text-sm">No categories to display.</p>
              </div>
            )}
          </div>
        </div>
      </ExpandablePanel>

      {/* Top Holdings — compact preview, expand for full table */}
      <ExpandablePanel
        className="animate-slideUp"
        title="Top Holdings"
        subtitle={topAssets.length > 0 ? `${topAssets.length} largest positions` : 'No assets yet'}
        icon={Scale}
        iconColor="#8b5cf6"
        accent="linear-gradient(90deg, #8b5cf6, #6366f1)"
        defaultOpen={false}
        badge={
          topAssets.length > 0 ? (
            <span className="text-xs font-bold" style={{ color: 'var(--accent-primary)' }}>{formatCompact(getAssetValue(topAssets[0]))}</span>
          ) : null
        }
      >
        {topAssets.length > 0 ? (
          <>
            {/* Compact preview always visible when expanded */}
            <div className="mb-3">
              {topAssets.slice(0, 3).map((asset, idx) => {
                const val = getAssetValue(asset);
                const share = totalAssetsValue > 0 ? (val / totalAssetsValue * 100) : 0;
                return (
                  <div key={asset.id} className="holding-row-compact">
                    <span className="row-number" style={{ background: `${COLORS[idx % COLORS.length]}18`, color: COLORS[idx % COLORS.length], width: 24, height: 24, fontSize: '0.68rem' }}>{idx + 1}</span>
                    <div className="flex-1 truncate">
                      <span className="text-sm font-medium">{asset.name}</span>
                      <span className="text-xs text-muted" style={{ marginLeft: '0.5rem' }}>{asset.type}</span>
                    </div>
                    <span className="text-sm font-bold">{formatCompact(val)}</span>
                    <span className="text-xs" style={{ color: COLORS[idx % COLORS.length], minWidth: '40px', textAlign: 'right' }}>{share.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Today's Δ</th>
                    <th className="text-right">Value</th>
                    <th style={{ width: '90px' }}>Share</th>
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
                            <span className="font-medium text-strong">{asset.name}</span>
                          </div>
                        </td>
                        <td><span className="chip">{asset.type}</span></td>
                        <td className="text-right">{ub && asset.qty ? formatNumber(asset.qty) : <span className="text-muted">&mdash;</span>}</td>
                        <td className="text-right">{ub && asset.currentPrice ? formatCurrencyDecimal(asset.currentPrice) : <span className="text-muted">&mdash;</span>}</td>
                        <td className="text-right">
                          {(() => {
                            if (!ub || !asset.symbol) return <span className="text-muted">&mdash;</span>;
                            const dc = getAssetDailyChange(asset);
                            return dc ? (
                              <DailyChangeBadge
                                changePercent={dc.changePercent}
                                valueChange={dc.valueChange}
                                showValueChange
                                size="sm"
                              />
                            ) : <span className="text-muted text-xs">—</span>;
                          })()}
                        </td>
                        <td className="text-right text-strong font-medium">{formatCurrency(val)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div style={{ flex: 1, height: '4px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${share}%`, height: '100%', background: COLORS[idx % COLORS.length], borderRadius: '3px' }} />
                            </div>
                            <span className="text-xs text-muted">{share.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3">
              <Link to="/assets" className="btn btn-secondary btn-sm">View all assets</Link>
            </div>
          </>
        ) : (
          <div className="empty-state" style={{ height: 120, padding: '1rem' }}>
            <p className="text-muted text-sm">No assets recorded yet.</p>
          </div>
        )}
      </ExpandablePanel>

      <FloatingActions
        onRefresh={handleRefresh}
        refreshing={refreshing}
        showRefresh={refreshableCount > 0}
      />
    </div>
  );
};

export default Dashboard;
