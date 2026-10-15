import React from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { formatCurrency, formatCurrencyDecimal } from '../utils/financeCalculations';

export function DailyChangeBadge({
  changePercent,
  change,
  valueChange,
  size = 'sm',
  showPriceChange = false,
  showValueChange = false,
  className = '',
}) {
  if (changePercent == null && change == null && valueChange == null) {
    return <span className={`text-muted text-xs ${className}`}>—</span>;
  }

  const delta = valueChange ?? change ?? 0;
  const up = delta > 0;
  const down = delta < 0;
  const flat = !up && !down;
  const color = flat ? 'var(--text-tertiary)' : up ? 'var(--success)' : 'var(--danger)';
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const pct = changePercent != null ? Math.abs(changePercent).toFixed(2) : null;
  const sign = up ? '+' : down ? '−' : '';

  const fontSize = size === 'lg' ? '0.95rem' : '0.78rem';

  return (
    <span
      className={`daily-change-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.2rem',
        fontSize,
        fontWeight: 600,
        color,
        whiteSpace: 'nowrap',
      }}
      title="Change vs previous close (daily)"
    >
      <Icon size={size === 'lg' ? 16 : 13} strokeWidth={2.5} />
      {pct != null && <span>{sign}{pct}%</span>}
      {showPriceChange && change != null && (
        <span className="text-muted" style={{ fontWeight: 500, fontSize: '0.72rem' }}>
          ({sign}{formatCurrencyDecimal(Math.abs(change))})
        </span>
      )}
      {showValueChange && valueChange != null && (
        <span style={{ fontWeight: 600 }}>
          {sign}{formatCurrency(Math.abs(valueChange))}
        </span>
      )}
    </span>
  );
}

export default DailyChangeBadge;
