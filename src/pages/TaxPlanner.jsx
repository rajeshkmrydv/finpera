import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useFinpera } from '../context/FinperaContext';
import {
  calculateOldRegimeTax,
  calculateNewRegimeTax,
  calculateLTCG,
  calculateSTCG,
  formatCurrency,
} from '../utils/financeCalculations';
import {
  Calculator,
  IndianRupee,
  TrendingDown,
  TrendingUp,
  Shield,
  Landmark,
  Building2,
  Heart,
  Home,
} from 'lucide-react';

const SECTION_80C_LIMIT = 150000;
const SECTION_80CCD_LIMIT = 50000;
const SECTION_80D_SELF_LIMIT = 25000;
const SECTION_80D_PARENTS_LIMIT = 50000;
const HOME_LOAN_LIMIT = 200000;

const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

const ProgressBar = ({ value, max, color = 'var(--accent-primary)' }) => {
  const pct = max > 0 ? clamp((value / max) * 100, 0, 100) : 0;
  const isOver = value > max;
  return (
    <div style={{ height: '6px', borderRadius: '3px', background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
      <div
        style={{
          width: `${Math.min(pct, 100)}%`,
          height: '100%',
          borderRadius: '3px',
          background: isOver ? 'var(--danger)' : color,
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  );
};

const NumericInput = ({ label, value, onChange, max, prefix = '₹', suffix, disabled, placeholder }) => (
  <div className="form-group">
    {label && <label className="form-label">{label}</label>}
    <div style={{ position: 'relative' }}>
      {prefix && (
        <span
          className="text-muted text-sm"
          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        >
          {prefix}
        </span>
      )}
      <input
        className="form-control"
        type="number"
        min="0"
        max={max}
        step="1000"
        value={value || ''}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        disabled={disabled}
        placeholder={placeholder || '0'}
        style={{ paddingLeft: prefix ? '28px' : undefined, paddingRight: suffix ? '40px' : undefined }}
      />
      {suffix && (
        <span
          className="text-muted text-xs"
          style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        >
          {suffix}
        </span>
      )}
    </div>
  </div>
);

const TaxPlanner = () => {
  const { taxProfile, updateTaxProfile, assets, getAssetValue } = useFinpera();
  const [activeRegime, setActiveRegime] = useState(taxProfile.regime || 'old');
  const debounceTimers = useRef({});

  const [cgInputs, setCgInputs] = useState({
    buyPrice: '',
    sellPrice: '',
    qty: '',
    holdingType: 'ltcg',
  });

  const debouncedUpdate = useCallback((field, value) => {
    if (debounceTimers.current[field]) clearTimeout(debounceTimers.current[field]);
    debounceTimers.current[field] = setTimeout(() => {
      updateTaxProfile({ [field]: value });
    }, 400);
  }, [updateTaxProfile]);

  const handleFieldChange = useCallback((field, value) => {
    updateTaxProfile({ [field]: value });
    debouncedUpdate(field, value);
  }, [updateTaxProfile, debouncedUpdate]);

  const handleRegimeToggle = useCallback((regime) => {
    setActiveRegime(regime);
    updateTaxProfile({ regime });
  }, [updateTaxProfile]);

  const total80C = useMemo(() =>
    (taxProfile.epf || 0) +
    (taxProfile.ppf || 0) +
    (taxProfile.elss || 0) +
    (taxProfile.nps80C || 0) +
    (taxProfile.lic || 0) +
    (taxProfile.others80C || 0),
    [taxProfile.epf, taxProfile.ppf, taxProfile.elss, taxProfile.nps80C, taxProfile.lic, taxProfile.others80C]
  );

  const remaining80C = Math.max(0, SECTION_80C_LIMIT - total80C);

  const oldResult = useMemo(() =>
    calculateOldRegimeTax(taxProfile.annualIncome || 0, taxProfile),
    [taxProfile]
  );

  const newResult = useMemo(() =>
    calculateNewRegimeTax(taxProfile.annualIncome || 0),
    [taxProfile.annualIncome]
  );

  const savings = Math.abs(oldResult.totalTax - newResult.totalTax);
  const betterRegime = oldResult.totalTax <= newResult.totalTax ? 'old' : 'new';

  const activeResult = activeRegime === 'old' ? oldResult : newResult;

  const cgResult = useMemo(() => {
    const buy = Number(cgInputs.buyPrice) || 0;
    const sell = Number(cgInputs.sellPrice) || 0;
    const qty = Number(cgInputs.qty) || 0;
    if (!buy || !sell || !qty) return null;
    return cgInputs.holdingType === 'ltcg'
      ? { ...calculateLTCG(sell, buy, qty), type: 'LTCG' }
      : { ...calculateSTCG(sell, buy, qty), type: 'STCG' };
  }, [cgInputs]);

  const autoFillFromPortfolio = useCallback(() => {
    const ppfAssets = assets.filter(a => a.type === 'PPF');
    const npsAssets = assets.filter(a => a.type === 'NPS');
    const pfAssets = assets.filter(a => a.type === 'PF');
    const elssAssets = assets.filter(a =>
      a.type === 'Mutual Fund' && (a.category === 'ELSS' || a.name?.toLowerCase().includes('elss') || a.name?.toLowerCase().includes('tax'))
    );

    const ppfTotal = ppfAssets.reduce((s, a) => s + getAssetValue(a), 0);
    const npsTotal = npsAssets.reduce((s, a) => s + getAssetValue(a), 0);
    const pfTotal = pfAssets.reduce((s, a) => s + getAssetValue(a), 0);
    const elssTotal = elssAssets.reduce((s, a) => s + getAssetValue(a), 0);

    const updates = {};
    if (ppfTotal > 0) updates.ppf = Math.round(ppfTotal * 0.1);
    if (npsTotal > 0) {
      updates.nps80C = Math.round(npsTotal * 0.1);
      updates.nps_extra = Math.round(npsTotal * 0.05);
    }
    if (pfTotal > 0) updates.epf = Math.round(pfTotal * 0.1);
    if (elssTotal > 0) updates.elss = Math.round(elssTotal);

    if (Object.keys(updates).length > 0) updateTaxProfile(updates);
  }, [assets, getAssetValue, updateTaxProfile]);

  const hasRelevantAssets = useMemo(() =>
    assets.some(a =>
      ['PPF', 'NPS', 'PF'].includes(a.type) ||
      (a.type === 'Mutual Fund' && (a.category === 'ELSS' || a.name?.toLowerCase().includes('elss')))
    ),
    [assets]
  );

  return (
    <div>
      {/* Page Header */}
      <div className="page-header mb-6">
        <h1>Tax Planner</h1>
        <p>Optimize your tax liability under Old and New regimes.</p>
      </div>

      {/* Regime Toggle */}
      <div className="tabs mb-6 animate-slideUp stagger-1">
        <button
          className={`tab ${activeRegime === 'old' ? 'active' : ''}`}
          onClick={() => handleRegimeToggle('old')}
        >
          <Landmark size={16} />
          Old Regime
        </button>
        <button
          className={`tab ${activeRegime === 'new' ? 'active' : ''}`}
          onClick={() => handleRegimeToggle('new')}
        >
          <Shield size={16} />
          New Regime
        </button>
      </div>

      {/* Income Section */}
      <div className="glass-panel mb-6 animate-slideUp stagger-2">
        <div className="flex items-center gap-2 mb-4">
          <IndianRupee size={18} style={{ color: 'var(--accent-primary)' }} />
          <h3 className="font-bold">Gross Annual Income</h3>
        </div>
        <div style={{ maxWidth: '400px' }}>
          <NumericInput
            label="Annual Income (CTC / Gross)"
            value={taxProfile.annualIncome}
            onChange={(v) => handleFieldChange('annualIncome', v)}
            placeholder="e.g. 1200000"
          />
        </div>
      </div>

      {/* Deductions — Old Regime Only */}
      {activeRegime === 'old' && (
        <div className="animate-slideUp" style={{ animationDelay: '0.15s' }}>
          {/* Section 80C */}
          <div className="glass-panel mb-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Shield size={18} style={{ color: '#6366f1' }} />
                <div>
                  <h3 className="font-bold">Section 80C</h3>
                  <span className="text-xs text-muted">Max deduction: ₹1,50,000</span>
                </div>
              </div>
              {hasRelevantAssets && (
                <button className="btn btn-secondary btn-sm" onClick={autoFillFromPortfolio}>
                  Auto-fill from portfolio
                </button>
              )}
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">
                  Used: {formatCurrency(Math.min(total80C, SECTION_80C_LIMIT))}
                </span>
                <span className={`text-sm font-medium ${remaining80C === 0 ? 'text-success' : 'text-muted'}`}>
                  Remaining: {formatCurrency(remaining80C)}
                </span>
              </div>
              <ProgressBar value={total80C} max={SECTION_80C_LIMIT} color="#6366f1" />
            </div>

            <div className="divider" />

            <div className="form-row">
              <NumericInput
                label="EPF (Employee PF)"
                value={taxProfile.epf}
                onChange={(v) => handleFieldChange('epf', v)}
              />
              <NumericInput
                label="PPF"
                value={taxProfile.ppf}
                onChange={(v) => handleFieldChange('ppf', v)}
              />
            </div>
            <div className="form-row">
              <NumericInput
                label="ELSS / Tax Saver MF"
                value={taxProfile.elss}
                onChange={(v) => handleFieldChange('elss', v)}
              />
              <NumericInput
                label="NPS (80C)"
                value={taxProfile.nps80C}
                onChange={(v) => handleFieldChange('nps80C', v)}
              />
            </div>
            <div className="form-row">
              <NumericInput
                label="LIC Premium"
                value={taxProfile.lic}
                onChange={(v) => handleFieldChange('lic', v)}
              />
              <NumericInput
                label="Others (Tuition, NSC, etc.)"
                value={taxProfile.others80C}
                onChange={(v) => handleFieldChange('others80C', v)}
              />
            </div>

            {total80C > SECTION_80C_LIMIT && (
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-danger">Exceeded by {formatCurrency(total80C - SECTION_80C_LIMIT)}</span>
                <span className="text-xs text-muted">Only ₹1.5L will be considered</span>
              </div>
            )}
          </div>

          {/* Section 80CCD(1B) */}
          <div className="glass-panel mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Landmark size={18} style={{ color: '#10b981' }} />
              <div>
                <h3 className="font-bold">Section 80CCD(1B) — Additional NPS</h3>
                <span className="text-xs text-muted">Max deduction: ₹50,000</span>
              </div>
            </div>
            <div className="mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">
                  Used: {formatCurrency(Math.min(taxProfile.nps_extra || 0, SECTION_80CCD_LIMIT))}
                </span>
                <span className="text-sm text-muted">
                  Remaining: {formatCurrency(Math.max(0, SECTION_80CCD_LIMIT - (taxProfile.nps_extra || 0)))}
                </span>
              </div>
              <ProgressBar value={taxProfile.nps_extra || 0} max={SECTION_80CCD_LIMIT} color="#10b981" />
            </div>
            <div style={{ maxWidth: '400px' }}>
              <NumericInput
                label="Additional NPS Contribution"
                value={taxProfile.nps_extra}
                onChange={(v) => handleFieldChange('nps_extra', v)}
              />
            </div>
          </div>

          {/* Section 80D */}
          <div className="glass-panel mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Heart size={18} style={{ color: '#ec4899' }} />
              <div>
                <h3 className="font-bold">Section 80D — Health Insurance</h3>
                <span className="text-xs text-muted">Self: max ₹25K • Parents: max ₹50K</span>
              </div>
            </div>
            <div className="form-row">
              <div>
                <NumericInput
                  label="Self & Family Premium"
                  value={taxProfile.healthSelf}
                  onChange={(v) => handleFieldChange('healthSelf', v)}
                />
                <div className="flex justify-between items-center mt-1 mb-2">
                  <span className="text-xs text-muted">
                    {formatCurrency(Math.min(taxProfile.healthSelf || 0, SECTION_80D_SELF_LIMIT))} / {formatCurrency(SECTION_80D_SELF_LIMIT)}
                  </span>
                </div>
                <ProgressBar value={taxProfile.healthSelf || 0} max={SECTION_80D_SELF_LIMIT} color="#ec4899" />
              </div>
              <div>
                <NumericInput
                  label="Parents Premium"
                  value={taxProfile.healthParents}
                  onChange={(v) => handleFieldChange('healthParents', v)}
                />
                <div className="flex justify-between items-center mt-1 mb-2">
                  <span className="text-xs text-muted">
                    {formatCurrency(Math.min(taxProfile.healthParents || 0, SECTION_80D_PARENTS_LIMIT))} / {formatCurrency(SECTION_80D_PARENTS_LIMIT)}
                  </span>
                </div>
                <ProgressBar value={taxProfile.healthParents || 0} max={SECTION_80D_PARENTS_LIMIT} color="#ec4899" />
              </div>
            </div>
          </div>

          {/* HRA Exemption */}
          <div className="glass-panel mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={18} style={{ color: '#f59e0b' }} />
              <div>
                <h3 className="font-bold">HRA Exemption</h3>
                <span className="text-xs text-muted">Based on salary, rent & city type</span>
              </div>
            </div>
            <div className="form-row">
              <NumericInput
                label="Basic Salary (Annual)"
                value={taxProfile.basicSalary}
                onChange={(v) => handleFieldChange('basicSalary', v)}
              />
              <NumericInput
                label="HRA Received (Annual)"
                value={taxProfile.hraReceived}
                onChange={(v) => handleFieldChange('hraReceived', v)}
              />
            </div>
            <div className="form-row">
              <NumericInput
                label="Rent Paid (Annual)"
                value={taxProfile.rentPaid}
                onChange={(v) => handleFieldChange('rentPaid', v)}
              />
              <div className="form-group">
                <label className="form-label">City Type</label>
                <div className="flex gap-2" style={{ marginTop: '0.4rem' }}>
                  <button
                    className={`btn btn-sm ${taxProfile.isMetro ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleFieldChange('isMetro', true)}
                  >
                    Metro
                  </button>
                  <button
                    className={`btn btn-sm ${!taxProfile.isMetro ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleFieldChange('isMetro', false)}
                  >
                    Non-Metro
                  </button>
                </div>
              </div>
            </div>
            {oldResult.breakdown.hra > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-success">HRA Exempt: {formatCurrency(oldResult.breakdown.hra)}</span>
              </div>
            )}
          </div>

          {/* Home Loan Interest */}
          <div className="glass-panel mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Home size={18} style={{ color: '#14b8a6' }} />
              <div>
                <h3 className="font-bold">Home Loan Interest — Section 24</h3>
                <span className="text-xs text-muted">Max deduction: ₹2,00,000</span>
              </div>
            </div>
            <div className="mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">
                  Used: {formatCurrency(Math.min(taxProfile.homeLoanInterest || 0, HOME_LOAN_LIMIT))}
                </span>
                <span className="text-sm text-muted">
                  Remaining: {formatCurrency(Math.max(0, HOME_LOAN_LIMIT - (taxProfile.homeLoanInterest || 0)))}
                </span>
              </div>
              <ProgressBar value={taxProfile.homeLoanInterest || 0} max={HOME_LOAN_LIMIT} color="#14b8a6" />
            </div>
            <div style={{ maxWidth: '400px' }}>
              <NumericInput
                label="Annual Interest Paid"
                value={taxProfile.homeLoanInterest}
                onChange={(v) => handleFieldChange('homeLoanInterest', v)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tax Computation Summary */}
      <div className="gradient-card grd-indigo mb-6 animate-slideUp" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center gap-2 mb-4">
          <Calculator size={20} />
          <h3 className="font-bold" style={{ fontSize: '1.1rem' }}>
            Tax Computation — {activeRegime === 'old' ? 'Old' : 'New'} Regime
          </h3>
        </div>
        <div className="grid-stats" style={{ '--cols': 3 }}>
          <div>
            <p className="card-label">Gross Income</p>
            <p className="card-value">{formatCurrency(activeResult.grossIncome)}</p>
          </div>
          <div>
            <p className="card-label">Total Deductions</p>
            <p className="card-value">{formatCurrency(activeResult.totalDeductions)}</p>
          </div>
          <div>
            <p className="card-label">Taxable Income</p>
            <p className="card-value">{formatCurrency(activeResult.taxable)}</p>
          </div>
        </div>
        <div className="divider" style={{ borderColor: 'rgba(255,255,255,0.15)', margin: '1rem 0' }} />
        <div className="grid-stats" style={{ '--cols': 3 }}>
          <div>
            <p className="card-label">Income Tax</p>
            <p className="card-value">{formatCurrency(activeResult.tax)}</p>
          </div>
          <div>
            <p className="card-label">Cess (4%)</p>
            <p className="card-value">{formatCurrency(activeResult.cess)}</p>
          </div>
          <div>
            <p className="card-label">Total Tax Payable</p>
            <p className="card-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(activeResult.totalTax)}</p>
          </div>
        </div>
      </div>

      {/* Regime Comparison */}
      <div className="glass-panel mb-6 animate-slideUp" style={{ animationDelay: '0.25s' }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown size={18} style={{ color: 'var(--accent-primary)' }} />
          <h3 className="font-bold">Regime Comparison</h3>
        </div>
        <div className="grid-2col">
          <div
            className="glass-panel"
            style={{
              border: betterRegime === 'old' ? '2px solid var(--success)' : '1px solid var(--border-primary)',
              position: 'relative',
            }}
          >
            {betterRegime === 'old' && (
              <span className="badge badge-success" style={{ position: 'absolute', top: '12px', right: '12px' }}>
                Better
              </span>
            )}
            <div className="flex items-center gap-2 mb-3">
              <Landmark size={16} style={{ color: '#6366f1' }} />
              <h4 className="font-bold">Old Regime</h4>
            </div>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div className="flex justify-between">
                <span className="text-sm text-muted">Gross Income</span>
                <span className="text-sm font-medium">{formatCurrency(oldResult.grossIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted">Deductions</span>
                <span className="text-sm font-medium text-success">-{formatCurrency(oldResult.totalDeductions)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted">Taxable Income</span>
                <span className="text-sm font-medium">{formatCurrency(oldResult.taxable)}</span>
              </div>
              <div className="divider" />
              <div className="flex justify-between">
                <span className="text-sm font-bold">Total Tax</span>
                <span className="font-bold" style={{ fontSize: '1.1rem' }}>{formatCurrency(oldResult.totalTax)}</span>
              </div>
            </div>
          </div>

          <div
            className="glass-panel"
            style={{
              border: betterRegime === 'new' ? '2px solid var(--success)' : '1px solid var(--border-primary)',
              position: 'relative',
            }}
          >
            {betterRegime === 'new' && (
              <span className="badge badge-success" style={{ position: 'absolute', top: '12px', right: '12px' }}>
                Better
              </span>
            )}
            <div className="flex items-center gap-2 mb-3">
              <Shield size={16} style={{ color: '#10b981' }} />
              <h4 className="font-bold">New Regime</h4>
            </div>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div className="flex justify-between">
                <span className="text-sm text-muted">Gross Income</span>
                <span className="text-sm font-medium">{formatCurrency(newResult.grossIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted">Std. Deduction</span>
                <span className="text-sm font-medium text-success">-{formatCurrency(newResult.totalDeductions)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted">Taxable Income</span>
                <span className="text-sm font-medium">{formatCurrency(newResult.taxable)}</span>
              </div>
              <div className="divider" />
              <div className="flex justify-between">
                <span className="text-sm font-bold">Total Tax</span>
                <span className="font-bold" style={{ fontSize: '1.1rem' }}>{formatCurrency(newResult.totalTax)}</span>
              </div>
            </div>
          </div>
        </div>

        {(taxProfile.annualIncome || 0) > 0 && savings > 0 && (
          <div
            className="flex items-center justify-between gap-3 mt-4"
            style={{
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--border-radius-md)',
              padding: '0.85rem 1.25rem',
            }}
          >
            <div className="flex items-center gap-2">
              <TrendingUp size={18} style={{ color: 'var(--success)' }} />
              <span className="font-medium">
                You save {formatCurrency(savings)} with the{' '}
                <span className="text-strong">{betterRegime === 'old' ? 'Old' : 'New'} Regime</span>
              </span>
            </div>
            <span className="badge badge-success">Recommended</span>
          </div>
        )}
      </div>

      {/* Capital Gains Calculator */}
      <div className="glass-panel animate-slideUp" style={{ animationDelay: '0.3s' }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} style={{ color: '#f59e0b' }} />
          <h3 className="font-bold">Capital Gains Calculator</h3>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            className={`btn btn-sm ${cgInputs.holdingType === 'ltcg' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setCgInputs(p => ({ ...p, holdingType: 'ltcg' }))}
          >
            LTCG (12+ months)
          </button>
          <button
            className={`btn btn-sm ${cgInputs.holdingType === 'stcg' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setCgInputs(p => ({ ...p, holdingType: 'stcg' }))}
          >
            STCG (&lt;12 months)
          </button>
        </div>

        <div className="form-row">
          <NumericInput
            label="Buy Price (per unit)"
            value={cgInputs.buyPrice}
            onChange={(v) => setCgInputs(p => ({ ...p, buyPrice: v }))}
          />
          <NumericInput
            label="Sell Price (per unit)"
            value={cgInputs.sellPrice}
            onChange={(v) => setCgInputs(p => ({ ...p, sellPrice: v }))}
          />
          <div className="form-group">
            <label className="form-label">Quantity</label>
            <input
              className="form-control"
              type="number"
              min="0"
              step="1"
              value={cgInputs.qty || ''}
              onChange={(e) => setCgInputs(p => ({ ...p, qty: Number(e.target.value) || 0 }))}
              placeholder="e.g. 100"
            />
          </div>
        </div>

        {cgResult && (
          <div
            className="mt-4"
            style={{
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--border-radius-md)',
              padding: '1rem 1.25rem',
            }}
          >
            <div className="grid-stats" style={{ '--cols': cgResult.type === 'LTCG' ? 4 : 3 }}>
              <div>
                <p className="text-xs text-muted">Total Gain</p>
                <p className={`font-bold ${cgResult.totalGain >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatCurrency(cgResult.totalGain)}
                </p>
              </div>
              {cgResult.type === 'LTCG' && (
                <div>
                  <p className="text-xs text-muted">Exempt (₹1.25L)</p>
                  <p className="font-bold text-success">{formatCurrency(cgResult.exempt)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted">Taxable Gain</p>
                <p className="font-bold">{formatCurrency(cgResult.taxable ?? Math.max(0, cgResult.totalGain))}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Tax ({cgResult.type === 'LTCG' ? '12.5%' : '20%'})</p>
                <p className="font-bold text-danger">{formatCurrency(cgResult.tax)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaxPlanner;
