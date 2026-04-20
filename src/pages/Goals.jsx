import React, { useState, useMemo } from 'react';
import { useFinpera } from '../context/FinperaContext';
import { futureSIP, futureStepUpSIP, requiredMonthlySIP, lumpSumFV, formatCurrency, formatCompact } from '../utils/financeCalculations';
import { Plus, Trash2, Pencil, X, AlertTriangle, Target, Calculator, TrendingUp, Calendar, Zap } from 'lucide-react';

const PRIORITY_CONFIG = {
  high: { label: 'High', badge: 'badge-danger' },
  medium: { label: 'Medium', badge: 'badge-warning' },
  low: { label: 'Low', badge: 'badge-success' },
};

const emptyForm = {
  name: '', targetAmount: '', targetDate: '', currentAmount: '',
  monthlySIP: '', expectedReturn: '12', priority: 'medium',
};

const Goals = () => {
  const { goals, addGoal, updateGoal, deleteGoal } = useFinpera();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [sipCalc, setSipCalc] = useState({
    monthly: '', years: '', rate: '12', stepUp: '10',
  });

  const yearsRemaining = (targetDate) => {
    const now = new Date();
    const target = new Date(targetDate);
    const diff = (target - now) / (365.25 * 24 * 60 * 60 * 1000);
    return Math.max(0, diff);
  };

  const goalMetrics = useMemo(() => {
    return goals.map(g => {
      const years = yearsRemaining(g.targetDate);
      const current = Number(g.currentAmount || 0);
      const target = Number(g.targetAmount || 0);
      const sip = Number(g.monthlySIP || 0);
      const rate = Number(g.expectedReturn || 12);

      const lumpFV = current > 0 ? lumpSumFV(current, years, rate) : 0;
      const sipFV = sip > 0 ? futureSIP(sip, years, rate) : 0;
      const projected = lumpFV + sipFV;
      const gap = target - projected;
      const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

      return { ...g, years, projected, gap, progress, lumpFV, sipFV };
    });
  }, [goals]);

  const sipResults = useMemo(() => {
    const m = Number(sipCalc.monthly);
    const y = Number(sipCalc.years);
    const r = Number(sipCalc.rate);
    const s = Number(sipCalc.stepUp);
    if (!m || !y || !r) return null;

    const withoutStepUp = futureSIP(m, y, r);
    const withStepUp = s > 0 ? futureStepUpSIP(m, y, r, s) : withoutStepUp;
    const totalInvested = m * y * 12;

    let totalInvestedStepUp = 0;
    let current = m;
    for (let i = 0; i < y; i++) {
      totalInvestedStepUp += current * 12;
      current *= (1 + s / 100);
    }

    return {
      withoutStepUp,
      withStepUp,
      totalInvested,
      totalInvestedStepUp,
      returnsWithout: withoutStepUp - totalInvested,
      returnsWith: withStepUp - totalInvestedStepUp,
    };
  }, [sipCalc]);

  const openAddModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (goal) => {
    setEditingId(goal.id);
    setFormData({
      name: goal.name,
      targetAmount: String(goal.targetAmount),
      targetDate: goal.targetDate,
      currentAmount: String(goal.currentAmount || ''),
      monthlySIP: String(goal.monthlySIP || ''),
      expectedReturn: String(goal.expectedReturn || 12),
      priority: goal.priority || 'medium',
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      targetAmount: Number(formData.targetAmount),
      targetDate: formData.targetDate,
      currentAmount: Number(formData.currentAmount || 0),
      monthlySIP: Number(formData.monthlySIP || 0),
      expectedReturn: Number(formData.expectedReturn || 12),
      priority: formData.priority,
    };

    if (editingId) {
      updateGoal(editingId, payload);
    } else {
      addGoal(payload);
    }
    setShowModal(false);
    setEditingId(null);
  };

  const handleDeleteConfirm = () => {
    if (confirmDelete) {
      deleteGoal(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  const summaryStats = useMemo(() => {
    if (!goals.length) return null;
    const totalTarget = goals.reduce((s, g) => s + Number(g.targetAmount || 0), 0);
    const totalCurrent = goals.reduce((s, g) => s + Number(g.currentAmount || 0), 0);
    const totalSIP = goals.reduce((s, g) => s + Number(g.monthlySIP || 0), 0);
    return { totalTarget, totalCurrent, totalSIP };
  }, [goals]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Financial Goals</h1>
          <p>Plan and track your goals with SIP projections.</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={18} /> Add Goal
        </button>
      </div>

      {/* Summary Stats */}
      {summaryStats && (
        <div className="grid-stats mb-6">
          <div className="glass-panel stat-card accent-indigo animate-slideUp stagger-1" style={{ padding: '1.25rem' }}>
            <p className="text-sm text-muted mb-1">Total Target</p>
            <p className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(summaryStats.totalTarget)}</p>
          </div>
          <div className="glass-panel stat-card accent-green animate-slideUp stagger-2" style={{ padding: '1.25rem' }}>
            <p className="text-sm text-muted mb-1">Current Progress</p>
            <p className="stat-value" style={{ fontSize: '1.4rem', color: 'var(--success)' }}>{formatCurrency(summaryStats.totalCurrent)}</p>
          </div>
          <div className="glass-panel stat-card accent-blue animate-slideUp stagger-3" style={{ padding: '1.25rem' }}>
            <p className="text-sm text-muted mb-1">Monthly SIPs</p>
            <p className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(summaryStats.totalSIP)}</p>
          </div>
        </div>
      )}

      {/* Goal Cards */}
      {goals.length > 0 ? (
        <div className="grid-2col mb-6" style={{ gap: '1.25rem' }}>
          {goalMetrics.map((goal, idx) => {
            const pri = PRIORITY_CONFIG[goal.priority] || PRIORITY_CONFIG.medium;
            const onTrack = goal.gap <= 0;
            return (
              <div key={goal.id} className="glass-panel animate-slideUp" style={{ padding: '1.5rem', animationDelay: `${idx * 60}ms` }}>
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Target size={18} style={{ color: 'var(--accent-primary)' }} />
                    </div>
                    <div>
                      <h3 className="font-bold" style={{ fontSize: '1.05rem', margin: 0 }}>{goal.name}</h3>
                      <span className={`badge ${pri.badge}`} style={{ fontSize: '0.65rem', marginTop: '2px' }}>{pri.label}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="btn-ghost btn-icon" onClick={() => openEditModal(goal)} title="Edit" aria-label={`Edit ${goal.name}`}>
                      <Pencil size={15} style={{ color: 'var(--accent-primary)' }} />
                    </button>
                    <button className="btn-ghost btn-icon" onClick={() => setConfirmDelete(goal)} title="Delete" aria-label={`Delete ${goal.name}`}>
                      <Trash2 size={15} style={{ color: 'var(--danger)' }} />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted">Progress</span>
                    <span className="text-xs font-medium">{goal.progress}%</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${goal.progress}%`,
                      height: '100%',
                      background: goal.progress >= 75 ? 'var(--success)' : goal.progress >= 40 ? 'var(--warning)' : 'var(--accent-primary)',
                      borderRadius: '4px',
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>

                {/* Details Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <p className="text-xs text-muted" style={{ marginBottom: '2px' }}>Target Amount</p>
                    <p className="font-medium text-strong" style={{ fontSize: '0.95rem' }}>{formatCurrency(goal.targetAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted" style={{ marginBottom: '2px' }}>
                      <Calendar size={11} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                      Target Date
                    </p>
                    <p className="font-medium" style={{ fontSize: '0.95rem' }}>
                      {new Date(goal.targetDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      <span className="text-xs text-muted" style={{ marginLeft: '4px' }}>({goal.years.toFixed(1)}y)</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted" style={{ marginBottom: '2px' }}>Current Amount</p>
                    <p className="font-medium" style={{ fontSize: '0.95rem' }}>{formatCurrency(goal.currentAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted" style={{ marginBottom: '2px' }}>Monthly SIP</p>
                    <p className="font-medium" style={{ fontSize: '0.95rem' }}>{formatCurrency(goal.monthlySIP)}</p>
                  </div>
                </div>

                <div className="divider" />

                {/* Projection */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <div>
                    <p className="text-xs text-muted" style={{ marginBottom: '2px' }}>
                      <TrendingUp size={11} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                      Projected Value
                    </p>
                    <p className="font-bold" style={{ fontSize: '1rem', color: 'var(--accent-primary)' }}>
                      {formatCompact(goal.projected)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted" style={{ marginBottom: '2px' }}>
                      {onTrack ? 'Surplus' : 'Gap'}
                    </p>
                    <p className={`font-bold ${onTrack ? 'text-success' : 'text-danger'}`} style={{ fontSize: '1rem' }}>
                      {onTrack ? '+' : '-'}{formatCompact(Math.abs(goal.gap))}
                    </p>
                    {!onTrack && goal.years > 0 && (
                      <p className="text-xs text-muted" style={{ marginTop: '2px' }}>
                        Need {formatCurrency(requiredMonthlySIP(goal.gap, goal.years, goal.expectedReturn))}/mo more
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-panel no-hover animate-slideUp mb-6">
          <div className="empty-state">
            <div className="empty-state-icon">
              <Target size={28} />
            </div>
            <p className="text-muted font-medium" style={{ marginBottom: '0.5rem' }}>No financial goals yet</p>
            <p className="text-sm text-muted">Click "Add Goal" to start planning for your future.</p>
          </div>
        </div>
      )}

      {/* SIP Calculator */}
      <div className="glass-panel no-hover animate-slideUp" style={{ padding: '1.5rem' }}>
        <div className="flex items-center gap-2 mb-4">
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calculator size={18} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div>
            <h2 className="font-bold" style={{ margin: 0, fontSize: '1.15rem' }}>SIP Calculator</h2>
            <p className="text-xs text-muted">Compare regular SIP vs step-up SIP returns</p>
          </div>
        </div>

        <div className="form-row" style={{ marginBottom: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Monthly SIP (₹)</label>
            <input
              className="form-control"
              type="number"
              placeholder="e.g. 10000"
              value={sipCalc.monthly}
              onChange={(e) => setSipCalc({ ...sipCalc, monthly: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Duration (years)</label>
            <input
              className="form-control"
              type="number"
              placeholder="e.g. 10"
              value={sipCalc.years}
              onChange={(e) => setSipCalc({ ...sipCalc, years: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Expected Return (%)</label>
            <input
              className="form-control"
              type="number"
              step="0.1"
              value={sipCalc.rate}
              onChange={(e) => setSipCalc({ ...sipCalc, rate: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              <Zap size={12} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
              Annual Step-up (%)
            </label>
            <input
              className="form-control"
              type="number"
              step="1"
              value={sipCalc.stepUp}
              onChange={(e) => setSipCalc({ ...sipCalc, stepUp: e.target.value })}
            />
          </div>
        </div>

        {sipResults && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            {/* Without Step-up */}
            <div className="gradient-card" style={{ padding: '1.25rem', borderRadius: 'var(--border-radius-lg)' }}>
              <p className="text-sm font-medium mb-4" style={{ opacity: 0.9 }}>Regular SIP</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <p className="text-xs" style={{ opacity: 0.7, marginBottom: '2px' }}>Future Value</p>
                  <p className="font-bold" style={{ fontSize: '1.3rem' }}>{formatCompact(sipResults.withoutStepUp)}</p>
                </div>
                <div className="flex gap-3">
                  <div style={{ flex: 1 }}>
                    <p className="text-xs" style={{ opacity: 0.7, marginBottom: '2px' }}>Invested</p>
                    <p className="font-medium">{formatCompact(sipResults.totalInvested)}</p>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p className="text-xs" style={{ opacity: 0.7, marginBottom: '2px' }}>Returns</p>
                    <p className="font-medium" style={{ color: 'var(--success)' }}>{formatCompact(sipResults.returnsWithout)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* With Step-up */}
            <div className="gradient-card" style={{ padding: '1.25rem', borderRadius: 'var(--border-radius-lg)', background: 'linear-gradient(135deg, var(--accent-secondary) 0%, var(--accent-primary) 100%)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Zap size={14} />
                <p className="text-sm font-medium" style={{ opacity: 0.9 }}>Step-up SIP</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <p className="text-xs" style={{ opacity: 0.7, marginBottom: '2px' }}>Future Value</p>
                  <p className="font-bold" style={{ fontSize: '1.3rem' }}>{formatCompact(sipResults.withStepUp)}</p>
                </div>
                <div className="flex gap-3">
                  <div style={{ flex: 1 }}>
                    <p className="text-xs" style={{ opacity: 0.7, marginBottom: '2px' }}>Invested</p>
                    <p className="font-medium">{formatCompact(sipResults.totalInvestedStepUp)}</p>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p className="text-xs" style={{ opacity: 0.7, marginBottom: '2px' }}>Returns</p>
                    <p className="font-medium" style={{ color: 'var(--success)' }}>{formatCompact(sipResults.returnsWith)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step-up Advantage */}
            {sipResults.withStepUp > sipResults.withoutStepUp && (
              <div className="glass-panel no-hover" style={{ gridColumn: '1 / -1', padding: '0.875rem 1.25rem', background: 'var(--success-light)' }}>
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
                  <p className="text-sm">
                    <span className="font-bold text-success">{formatCompact(sipResults.withStepUp - sipResults.withoutStepUp)}</span>
                    <span className="text-muted"> extra with {sipCalc.stepUp}% annual step-up — that's </span>
                    <span className="font-medium">{((sipResults.withStepUp / sipResults.withoutStepUp - 1) * 100).toFixed(0)}% more</span>
                    <span className="text-muted"> corpus</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {!sipResults && (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <p className="text-sm text-muted">Enter SIP amount, duration, and return rate to see projections.</p>
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="confirm-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <AlertTriangle size={22} style={{ color: 'var(--danger)' }} />
            </div>
            <h3 style={{ marginBottom: '0.5rem' }}>Delete Goal?</h3>
            <p className="text-sm text-muted" style={{ marginBottom: '1.5rem' }}>
              <strong>{confirmDelete.name}</strong> ({formatCurrency(confirmDelete.targetAmount)} target) will be permanently removed.
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
              <h2>{editingId ? 'Edit Goal' : 'Add Financial Goal'}</h2>
              <button className="btn-ghost btn-icon" onClick={() => setShowModal(false)} aria-label="Close modal">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Goal Name</label>
                <input
                  className="form-control" type="text" required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Child's Education, House Down Payment"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Target Amount (₹)</label>
                  <input
                    className="form-control" type="number" required
                    value={formData.targetAmount}
                    onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                    placeholder="e.g. 5000000"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Target Date</label>
                  <input
                    className="form-control" type="date" required
                    value={formData.targetDate}
                    onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Current Amount (₹)</label>
                  <input
                    className="form-control" type="number"
                    value={formData.currentAmount}
                    onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly SIP (₹)</label>
                  <input
                    className="form-control" type="number"
                    value={formData.monthlySIP}
                    onChange={(e) => setFormData({ ...formData, monthlySIP: e.target.value })}
                    placeholder="e.g. 10000"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Expected Return (% p.a.)</label>
                  <input
                    className="form-control" type="number" step="0.1"
                    value={formData.expectedReturn}
                    onChange={(e) => setFormData({ ...formData, expectedReturn: e.target.value })}
                    placeholder="12"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-control"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              {/* Live preview in modal */}
              {formData.targetAmount && formData.targetDate && (
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-md)', padding: '0.75rem 1rem', marginBottom: '0.5rem' }}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted">Required Monthly SIP</span>
                    <span className="font-bold text-strong">
                      {(() => {
                        const y = yearsRemaining(formData.targetDate);
                        const target = Number(formData.targetAmount) - lumpSumFV(Number(formData.currentAmount || 0), y, Number(formData.expectedReturn || 12));
                        if (y <= 0 || target <= 0) return 'Target met';
                        return formatCurrency(requiredMonthlySIP(target, y, Number(formData.expectedReturn || 12)));
                      })()}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Update Goal' : 'Save Goal'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;
