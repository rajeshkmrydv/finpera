import React, { useState, useMemo } from 'react';
import { useFinpera } from '../context/FinperaContext';
import { Plus, Trash2, Pencil, X, AlertTriangle, Shield, ShieldCheck, ShieldAlert, Heart, Car, FileText, Wallet } from 'lucide-react';

const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

const TYPE_META = {
  term:    { label: 'Term Life', badge: 'badge-info',    icon: Shield },
  health:  { label: 'Health',    badge: 'badge-success',  icon: Heart },
  vehicle: { label: 'Vehicle',   badge: 'badge-warning',  icon: Car },
  other:   { label: 'Other',     badge: 'badge-purple',   icon: FileText },
};

const EMPTY_FORM = {
  type: 'term', provider: '', policyNumber: '', coverAmount: '',
  annualPremium: '', startDate: '', endDate: '', insuredMembers: '',
};

const Insurance = () => {
  const {
    insurance, addInsurance, updateInsurance, deleteInsurance,
    settings, totalLiabilitiesValue, totalAssetsValue,
  } = useFinpera();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const openAddModal = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  const openEditModal = (policy) => {
    setEditingId(policy.id);
    setFormData({
      type: policy.type,
      provider: policy.provider,
      policyNumber: policy.policyNumber,
      coverAmount: String(policy.coverAmount),
      annualPremium: String(policy.annualPremium),
      startDate: policy.startDate,
      endDate: policy.endDate,
      insuredMembers: policy.insuredMembers || '',
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      type: formData.type,
      provider: formData.provider,
      policyNumber: formData.policyNumber,
      coverAmount: Number(formData.coverAmount),
      annualPremium: Number(formData.annualPremium),
      startDate: formData.startDate,
      endDate: formData.endDate,
      insuredMembers: formData.insuredMembers,
    };

    if (editingId) {
      updateInsurance(editingId, payload);
    } else {
      addInsurance(payload);
    }
    setShowModal(false);
    setEditingId(null);
  };

  const handleDeleteConfirm = () => {
    if (confirmDelete) {
      deleteInsurance(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  const set = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  // ── Derived data ──

  const totalPremium = useMemo(() => insurance.reduce((s, p) => s + p.annualPremium, 0), [insurance]);
  const termCover = useMemo(() => insurance.filter((p) => p.type === 'term').reduce((s, p) => s + p.coverAmount, 0), [insurance]);
  const healthCover = useMemo(() => insurance.filter((p) => p.type === 'health').reduce((s, p) => s + p.coverAmount, 0), [insurance]);

  const annualIncome = (settings?.monthlyIncome || 0) * 12;
  const dependents = settings?.dependents || 0;
  const hasIncome = annualIncome > 0;

  // ── Gap analysis ──

  const termRecommended = annualIncome * 10;
  const termGapValue = Math.max(0, termRecommended - termCover);
  const termPct = termRecommended > 0 ? Math.min(100, Math.round((termCover / termRecommended) * 100)) : 0;
  const termStatus = termPct >= 80 ? 'adequate' : termPct >= 40 ? 'attention' : 'critical';

  const healthRecommended = dependents > 0 ? 1000000 : 500000;
  const healthGapValue = Math.max(0, healthRecommended - healthCover);
  const healthPct = Math.min(100, Math.round((healthCover / healthRecommended) * 100));
  const healthStatus = healthPct >= 80 ? 'adequate' : healthPct >= 40 ? 'attention' : 'critical';

  const premiumPct = annualIncome > 0 ? ((totalPremium / annualIncome) * 100).toFixed(1) : '—';

  const statusColor = (s) =>
    s === 'adequate' ? 'var(--success)' : s === 'attention' ? 'var(--warning)' : 'var(--danger)';
  const statusBadge = (s) =>
    s === 'adequate' ? 'badge-success' : s === 'attention' ? 'badge-warning' : 'badge-danger';
  const statusLabel = (s) =>
    s === 'adequate' ? 'Adequate' : s === 'attention' ? 'Needs Attention' : 'Critical Gap';

  const formatValidity = (start, end) => {
    const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}`;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Insurance Manager</h1>
          <p>Track policies and identify coverage gaps.</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={18} /> Add Policy
        </button>
      </div>

      {/* Income notice */}
      {!hasIncome && (
        <div className="glass-panel no-hover mb-4 animate-slideUp" style={{ padding: '0.85rem 1.15rem', borderLeft: '3px solid var(--warning)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <AlertTriangle size={18} style={{ color: 'var(--warning)', flexShrink: 0 }} />
          <p className="text-sm" style={{ margin: 0 }}>
            <span className="font-medium">Monthly income is ₹0.</span>{' '}
            <span className="text-muted">Update your Settings for accurate gap analysis.</span>
          </p>
        </div>
      )}

      {/* Summary Cards */}
      {insurance.length > 0 && (
        <div className="grid-stats mb-6">
          <div className="gradient-card grd-indigo animate-slideUp stagger-1">
            <div className="card-icon"><Shield size={20} /></div>
            <p className="card-label">Total Policies</p>
            <p className="card-value">{insurance.length}</p>
          </div>
          <div className="gradient-card grd-rose animate-slideUp stagger-2">
            <div className="card-icon"><Wallet size={20} /></div>
            <p className="card-label">Annual Premium</p>
            <p className="card-value">{formatCurrency(totalPremium)}</p>
            {hasIncome && <p className="card-sub">{premiumPct}% of income</p>}
          </div>
          <div className="gradient-card grd-blue animate-slideUp stagger-3">
            <div className="card-icon"><ShieldCheck size={20} /></div>
            <p className="card-label">Term Cover</p>
            <p className="card-value">{formatCurrency(termCover)}</p>
          </div>
          <div className="gradient-card grd-emerald animate-slideUp stagger-3">
            <div className="card-icon"><Heart size={20} /></div>
            <p className="card-label">Health Cover</p>
            <p className="card-value">{formatCurrency(healthCover)}</p>
          </div>
        </div>
      )}

      {/* Gap Analysis */}
      {insurance.length > 0 && hasIncome && (
        <div className="glass-panel no-hover mb-6 animate-slideUp">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert size={20} style={{ color: 'var(--accent-primary)' }} />
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Coverage Gap Analysis</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {/* Term Life Gap */}
            <div className="glass-panel" style={{ padding: '1rem 1.15rem' }}>
              <div className="flex justify-between items-center mb-3">
                <span className="font-medium">Term Life Cover</span>
                <span className={`badge ${statusBadge(termStatus)}`}>{statusLabel(termStatus)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted">Current</span>
                <span className="font-medium">{formatCurrency(termCover)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted">Recommended (10× annual income)</span>
                <span className="font-medium">{formatCurrency(termRecommended)}</span>
              </div>
              <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                <div style={{ width: `${termPct}%`, height: '100%', background: statusColor(termStatus), borderRadius: '4px', transition: 'width 0.6s ease' }} />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">{termPct}% covered</span>
                {termGapValue > 0 && <span style={{ color: 'var(--danger)' }}>Gap: {formatCurrency(termGapValue)}</span>}
              </div>
            </div>

            {/* Health Gap */}
            <div className="glass-panel" style={{ padding: '1rem 1.15rem' }}>
              <div className="flex justify-between items-center mb-3">
                <span className="font-medium">Health Cover</span>
                <span className={`badge ${statusBadge(healthStatus)}`}>{statusLabel(healthStatus)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted">Current</span>
                <span className="font-medium">{formatCurrency(healthCover)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted">Recommended ({dependents > 0 ? 'family ₹10L' : 'individual ₹5L'})</span>
                <span className="font-medium">{formatCurrency(healthRecommended)}</span>
              </div>
              <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                <div style={{ width: `${healthPct}%`, height: '100%', background: statusColor(healthStatus), borderRadius: '4px', transition: 'width 0.6s ease' }} />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">{healthPct}% covered</span>
                {healthGapValue > 0 && <span style={{ color: 'var(--danger)' }}>Gap: {formatCurrency(healthGapValue)}</span>}
              </div>
            </div>

            {/* Premium-to-Income */}
            <div className="glass-panel" style={{ padding: '1rem 1.15rem' }}>
              <div className="flex justify-between items-center mb-3">
                <span className="font-medium">Premium vs Income</span>
                <span className={`badge ${Number(premiumPct) <= 5 ? 'badge-success' : Number(premiumPct) <= 10 ? 'badge-warning' : 'badge-danger'}`}>
                  {Number(premiumPct) <= 5 ? 'Healthy' : Number(premiumPct) <= 10 ? 'Moderate' : 'High'}
                </span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted">Annual Premium</span>
                <span className="font-medium">{formatCurrency(totalPremium)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted">Annual Income</span>
                <span className="font-medium">{formatCurrency(annualIncome)}</span>
              </div>
              <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                <div style={{ width: `${Math.min(100, Number(premiumPct) * 5)}%`, height: '100%', background: Number(premiumPct) <= 5 ? 'var(--success)' : Number(premiumPct) <= 10 ? 'var(--warning)' : 'var(--danger)', borderRadius: '4px', transition: 'width 0.6s ease' }} />
              </div>
              <p className="text-xs text-muted" style={{ margin: 0 }}>{premiumPct}% of annual income — ideal range is 3–5%</p>
            </div>
          </div>
        </div>
      )}

      {/* Policies Table */}
      <div className="glass-panel no-hover animate-slideUp">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Provider</th>
                <th className="text-right">Cover Amount</th>
                <th className="text-right">Premium/yr</th>
                <th>Validity Period</th>
                <th className="text-right" style={{ width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {insurance.map((policy) => {
                const meta = TYPE_META[policy.type] || TYPE_META.other;
                return (
                  <tr key={policy.id}>
                    <td><span className={`badge ${meta.badge}`}>{meta.label}</span></td>
                    <td>
                      <span className="font-medium text-strong">{policy.provider}</span>
                      {policy.policyNumber && (
                        <span className="text-xs text-muted" style={{ display: 'block', marginTop: '1px' }}>
                          #{policy.policyNumber}
                        </span>
                      )}
                    </td>
                    <td className="text-right text-strong font-medium">{formatCurrency(policy.coverAmount)}</td>
                    <td className="text-right text-muted">{formatCurrency(policy.annualPremium)}</td>
                    <td className="text-sm text-muted">{formatValidity(policy.startDate, policy.endDate)}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button className="btn-ghost btn-icon" onClick={() => openEditModal(policy)} title="Edit" aria-label={`Edit ${policy.provider} policy`}>
                          <Pencil size={15} style={{ color: 'var(--accent-primary)' }} />
                        </button>
                        <button className="btn-ghost btn-icon" onClick={() => setConfirmDelete(policy)} title="Delete" aria-label={`Delete ${policy.provider} policy`}>
                          <Trash2 size={15} style={{ color: 'var(--danger)' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {insurance.length === 0 && (
                <tr>
                  <td colSpan="6">
                    <div className="empty-state">
                      <div className="empty-state-icon"><Shield size={24} /></div>
                      <p className="text-muted font-medium">No insurance policies yet. Click "Add Policy" to get started.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="confirm-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <AlertTriangle size={22} style={{ color: 'var(--danger)' }} />
            </div>
            <h3 style={{ marginBottom: '0.5rem' }}>Delete Policy?</h3>
            <p className="text-sm text-muted" style={{ marginBottom: '1.5rem' }}>
              <strong>{confirmDelete.provider}</strong> ({TYPE_META[confirmDelete.type]?.label || confirmDelete.type} — {formatCurrency(confirmDelete.coverAmount)}) will be permanently removed.
            </p>
            <div className="flex gap-2 justify-center">
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeleteConfirm} style={{ fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Policy' : 'Add Insurance Policy'}</h2>
              <button className="btn-ghost btn-icon" onClick={() => setShowModal(false)} aria-label="Close modal">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Policy Type</label>
                  <select className="form-control" value={formData.type} onChange={(e) => set('type', e.target.value)}>
                    {Object.entries(TYPE_META).map(([key, m]) => (
                      <option key={key} value={key}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Provider / Insurer</label>
                  <input className="form-control" type="text" required value={formData.provider} onChange={(e) => set('provider', e.target.value)} placeholder="e.g. HDFC Life" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Policy Number</label>
                <input className="form-control" type="text" value={formData.policyNumber} onChange={(e) => set('policyNumber', e.target.value)} placeholder="e.g. POL-123456" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Cover Amount (₹)</label>
                  <input className="form-control" type="number" required value={formData.coverAmount} onChange={(e) => set('coverAmount', e.target.value)} placeholder="5000000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Annual Premium (₹)</label>
                  <input className="form-control" type="number" required value={formData.annualPremium} onChange={(e) => set('annualPremium', e.target.value)} placeholder="12000" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input className="form-control" type="date" required value={formData.startDate} onChange={(e) => set('startDate', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input className="form-control" type="date" required value={formData.endDate} onChange={(e) => set('endDate', e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Insured Members</label>
                <input className="form-control" type="text" value={formData.insuredMembers} onChange={(e) => set('insuredMembers', e.target.value)} placeholder="e.g. Self, Spouse, Children" />
              </div>

              <div className="flex gap-2 justify-end mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Update Policy' : 'Save Policy'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Insurance;
