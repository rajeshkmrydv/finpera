import React, { useMemo, memo } from 'react';
import { useFinpera } from '../context/FinperaContext';
import { UNIT_BASED_TYPES, ASSET_TYPES } from '../utils/dummyData';
import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { BarChart3, TrendingUp, Activity, PieChart as PieChartIcon } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#14b8a6', '#f97316', '#ec4899', '#06b6d4', '#64748b'];

const formatCurrency = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

const formatCompact = (val) => {
  if (val >= 10000000) return `${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `${(val / 100000).toFixed(2)} L`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)} K`;
  return val.toFixed(0);
};

const formatDateLabel = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const MultiLineTooltip = memo(({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', padding: '0.75rem 1rem', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
      <p style={{ fontSize: '0.75rem', fontWeight: 500, marginBottom: '6px', color: 'var(--text-tertiary)' }}>{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{entry.name}:</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
});

const PieTooltip = memo(({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', padding: '0.75rem 1rem', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
      <p style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '2px', color: 'var(--text-primary)' }}>{payload[0].name}</p>
      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(payload[0].value)}</p>
    </div>
  );
});

const BarTooltip = memo(({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', padding: '0.75rem 1rem', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
      <p style={{ fontSize: '0.75rem', fontWeight: 500, marginBottom: '6px', color: 'var(--text-tertiary)' }}>{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color || entry.fill, flexShrink: 0 }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{entry.name}:</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(Math.abs(entry.value))}</span>
        </div>
      ))}
    </div>
  );
});

const Reports = () => {
  const {
    netWorthHistory, assets, getAssetValue, liabilities,
    totalAssetsValue, totalLiabilitiesValue, netWorth,
    transactions, healthScore,
  } = useFinpera();

  const trendData = useMemo(() => {
    return netWorthHistory.map((entry) => ({
      ...entry,
      label: formatDateLabel(entry.date),
    }));
  }, [netWorthHistory]);

  const assetAllocation = useMemo(() => {
    return assets.reduce((acc, asset) => {
      const val = getAssetValue(asset);
      const existing = acc.find(a => a.name === asset.type);
      if (existing) existing.value += val;
      else acc.push({ name: asset.type, value: val });
      return acc;
    }, []).sort((a, b) => b.value - a.value);
  }, [assets, getAssetValue]);

  const allocationTotal = useMemo(() => assetAllocation.reduce((s, a) => s + a.value, 0), [assetAllocation]);

  const allocationComparison = useMemo(() => {
    if (assetAllocation.length === 0) return [];
    const idealPct = 100 / assetAllocation.length;
    return assetAllocation.map((a) => ({
      name: a.name,
      current: allocationTotal > 0 ? (a.value / allocationTotal) * 100 : 0,
      ideal: idealPct,
    }));
  }, [assetAllocation, allocationTotal]);

  const monthlyFlow = useMemo(() => {
    if (transactions.length === 0) return [];
    const grouped = {};
    transactions.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[key]) grouped[key] = { month: key, invested: 0, income: 0 };
      const amt = Math.abs(Number(t.amount) || 0);
      if (t.type === 'buy' || t.type === 'sip') {
        grouped[key].invested += amt;
      } else if (t.type === 'dividend' || t.type === 'interest') {
        grouped[key].income += amt;
      }
    });
    return Object.values(grouped)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => ({
        ...m,
        label: new Date(m.month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      }));
  }, [transactions]);

  const compositionTable = useMemo(() => {
    const typeMap = {};
    assets.forEach((asset) => {
      const val = getAssetValue(asset);
      if (!typeMap[asset.type]) typeMap[asset.type] = { type: asset.type, count: 0, value: 0 };
      typeMap[asset.type].count += 1;
      typeMap[asset.type].value += val;
    });
    return Object.values(typeMap)
      .sort((a, b) => b.value - a.value)
      .map((row) => ({
        ...row,
        pct: totalAssetsValue > 0 ? (row.value / totalAssetsValue) * 100 : 0,
      }));
  }, [assets, getAssetValue, totalAssetsValue]);

  const renderPieCenterLabel = (props) => {
    const vb = props?.viewBox;
    if (!vb || vb.cx == null) return null;
    const { cx, cy } = vb;
    return (
      <g>
        <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--text-tertiary)" fontSize="12" fontWeight="500">Total</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fill="var(--text-primary)" fontSize="18" fontWeight="700" letterSpacing="-0.03em">
          {formatCompact(allocationTotal)}
        </text>
      </g>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header mb-6">
        <h1>Financial Reports</h1>
        <p>Visualize your financial journey over time.</p>
      </div>

      {/* Net Worth Trend */}
      <div className="glass-panel no-hover animate-slideUp mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.06)', color: 'var(--accent-primary)', width: '36px', height: '36px' }}>
              <TrendingUp size={18} />
            </div>
            <h3 className="text-lg font-bold">Net Worth Trend</h3>
          </div>
        </div>
        {trendData.length >= 2 ? (
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <AreaChart data={trendData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradAssets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradLiabilities" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradNetWorth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} width={55} />
                <Tooltip content={<MultiLineTooltip />} />
                <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8}
                  formatter={(value) => <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{value}</span>} />
                <Area type="monotone" dataKey="totalAssets" name="Total Assets" stroke="#10b981" strokeWidth={2} fill="url(#gradAssets)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="totalLiabilities" name="Total Liabilities" stroke="#ef4444" strokeWidth={2} fill="url(#gradLiabilities)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="netWorth" name="Net Worth" stroke="#6366f1" strokeWidth={2.5} fill="url(#gradNetWorth)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="empty-state" style={{ height: 280 }}>
            <div className="empty-state-icon"><TrendingUp size={24} /></div>
            <p className="text-muted text-sm">Not enough history yet — data accumulates daily.</p>
          </div>
        )}
      </div>

      {/* Pie Chart + Allocation Comparison */}
      <div className="grid-2col mb-6">
        {/* Asset Allocation Pie */}
        <div className="glass-panel no-hover animate-slideUp" style={{ animationDelay: '0.1s' }}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.06)', color: '#8b5cf6', width: '36px', height: '36px' }}>
                <PieChartIcon size={18} />
              </div>
              <h3 className="text-lg font-bold">Asset Allocation</h3>
            </div>
          </div>
          {assetAllocation.length > 0 ? (
            <>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={assetAllocation}
                      cx="50%" cy="50%"
                      innerRadius={68} outerRadius={100}
                      paddingAngle={3} dataKey="value"
                      stroke="none"
                      animationDuration={800} animationBegin={200}
                      label={renderPieCenterLabel}
                      labelLine={false}
                    >
                      {assetAllocation.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3" style={{ marginTop: '0.5rem' }}>
                {assetAllocation.map((a, i) => (
                  <div key={a.name} className="flex items-center gap-2">
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <span className="text-xs text-muted">{a.name}</span>
                    <span className="text-xs font-medium">{allocationTotal > 0 ? ((a.value / allocationTotal) * 100).toFixed(1) : 0}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ height: 280 }}>
              <div className="empty-state-icon"><PieChartIcon size={24} /></div>
              <p className="text-muted text-sm">Add assets to see allocation.</p>
            </div>
          )}
        </div>

        {/* Allocation vs Ideal */}
        <div className="glass-panel no-hover animate-slideUp" style={{ animationDelay: '0.15s' }}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.06)', color: 'var(--success)', width: '36px', height: '36px' }}>
                <Activity size={18} />
              </div>
              <h3 className="text-lg font-bold">Allocation vs Equal-Weight</h3>
            </div>
          </div>
          {allocationComparison.length > 0 ? (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={allocationComparison} layout="vertical" margin={{ top: 5, right: 30, left: 5, bottom: 5 }} barGap={2} barSize={12}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} domain={[0, 'auto']}
                    tickFormatter={(v) => `${v.toFixed(0)}%`} />
                  <YAxis dataKey="name" type="category" width={85} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value) => `${value.toFixed(1)}%`}
                    contentStyle={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                    cursor={{ fill: 'rgba(99,102,241,0.04)' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8}
                    formatter={(value) => <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{value}</span>} />
                  <Bar dataKey="current" name="Current" fill="#6366f1" radius={[0, 6, 6, 0]} animationDuration={800} />
                  <Bar dataKey="ideal" name="Equal-Weight" fill="#e2e8f0" radius={[0, 6, 6, 0]} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state" style={{ height: 300 }}>
              <div className="empty-state-icon"><Activity size={24} /></div>
              <p className="text-muted text-sm">No allocation data to compare.</p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Transaction Flow */}
      <div className="glass-panel no-hover animate-slideUp mb-6" style={{ animationDelay: '0.2s' }}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.06)', color: '#f59e0b', width: '36px', height: '36px' }}>
              <BarChart3 size={18} />
            </div>
            <h3 className="text-lg font-bold">Monthly Transaction Flow</h3>
          </div>
        </div>
        {monthlyFlow.length > 0 ? (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={monthlyFlow} margin={{ top: 10, right: 20, left: 10, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} width={55} />
                <Tooltip content={<BarTooltip />} />
                <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8}
                  formatter={(value) => <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{value}</span>} />
                <Bar dataKey="invested" name="Invested (Buy + SIP)" fill="#6366f1" radius={[4, 4, 0, 0]} animationDuration={800} />
                <Bar dataKey="income" name="Income (Dividend + Interest)" fill="#10b981" radius={[4, 4, 0, 0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="empty-state" style={{ height: 280 }}>
            <div className="empty-state-icon"><BarChart3 size={24} /></div>
            <p className="text-muted text-sm">Add transactions to see monthly flow.</p>
          </div>
        )}
      </div>

      {/* Portfolio Composition Table */}
      <div className="glass-panel no-hover animate-slideUp" style={{ animationDelay: '0.25s' }}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Portfolio Composition</h3>
          {compositionTable.length > 0 && (
            <span className="text-sm text-muted">{assets.length} asset{assets.length !== 1 ? 's' : ''} across {compositionTable.length} type{compositionTable.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        {compositionTable.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset Type</th>
                  <th className="text-right">Count</th>
                  <th className="text-right">Total Value</th>
                  <th className="text-right">Share</th>
                  <th style={{ width: '140px' }}>Distribution</th>
                </tr>
              </thead>
              <tbody>
                {compositionTable.map((row, idx) => (
                  <tr key={row.type}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[idx % COLORS.length], flexShrink: 0 }} />
                        <span className="font-medium text-strong">{row.type}</span>
                      </div>
                    </td>
                    <td className="text-right">{row.count}</td>
                    <td className="text-right text-strong font-medium">{formatCurrency(row.value)}</td>
                    <td className="text-right">
                      <span className="badge">{row.pct.toFixed(1)}%</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div style={{ flex: 1, height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${row.pct}%`, height: '100%', background: COLORS[idx % COLORS.length], borderRadius: 3, transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{ height: 200 }}>
            <div className="empty-state-icon"><PieChartIcon size={24} /></div>
            <p className="text-muted text-sm">No assets to display.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
