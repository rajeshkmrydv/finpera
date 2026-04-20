import React, { useState, useMemo } from 'react';
import { useFinpera } from '../context/FinperaContext';
import { Plus, Trash2, X, AlertTriangle, ArrowUpDown, TrendingUp, TrendingDown, Filter } from 'lucide-react';

const TRANSACTION_TYPES = ['buy', 'sell', 'sip', 'dividend', 'interest', 'emi_payment', 'other'];

const TYPE_LABELS = {
  buy: 'Buy',
  sell: 'Sell',
  sip: 'SIP',
  dividend: 'Dividend',
  interest: 'Interest',
  emi_payment: 'EMI Payment',
  other: 'Other',
};

const TYPE_BADGE_CLASS = {
  buy: 'badge-info',
  sell: 'badge-danger',
  sip: 'badge-purple',
  dividend: 'badge-success',
  interest: 'badge-success',
  emi_payment: 'badge-warning',
  other: 'badge-info',
};

const INFLOW_TYPES = new Set(['sell', 'dividend', 'interest']);

const formatCurrency = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const emptyForm = { date: '', type: 'buy', name: '', amount: '', qty: '', price: '', category: '', notes: '' };

const Transactions = () => {
  const { transactions, addTransaction, deleteTransaction, assets } = useFinpera();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [filterType, setFilterType] = useState('All');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filteredTransactions = useMemo(() => {
    const filtered = filterType === 'All'
      ? [...transactions]
      : transactions.filter(t => t.type === filterType);
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, filterType]);

  const { totalInvested, totalWithdrawn } = useMemo(() => {
    let invested = 0;
    let withdrawn = 0;
    transactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'buy' || t.type === 'sip') invested += amt;
      if (t.type === 'sell') withdrawn += amt;
    });
    return { totalInvested: invested, totalWithdrawn: withdrawn };
  }, [transactions]);

  const netFlow = totalInvested - totalWithdrawn;

  const openAddModal = () => {
    setFormData({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      date: formData.date,
      type: formData.type,
      name: formData.name,
      amount: Number(formData.amount),
      category: formData.category || '',
      notes: formData.notes || '',
    };
    if (formData.qty) payload.qty = Number(formData.qty);
    if (formData.price) payload.price = Number(formData.price);
    addTransaction(payload);
    setShowModal(false);
  };

  const handleDeleteConfirm = () => {
    if (confirmDelete) {
      deleteTransaction(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  const isInflow = (type) => INFLOW_TYPES.has(type);

  return (
    <div>
      <div className="flex justify-between items-center mb-6" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Transactions</h1>
          <p>Track all your financial activities.</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={18} /> Add Transaction
        </button>
      </div>

      {transactions.length > 0 && (
        <div className="grid-stats mb-6">
          <div className="glass-panel stat-card accent-green animate-slideUp stagger-1" style={{ padding: '1.25rem' }}>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} style={{ color: 'var(--success)' }} />
              <p className="text-sm text-muted">Total Invested</p>
            </div>
            <p className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(totalInvested)}</p>
          </div>
          <div className="glass-panel stat-card accent-red animate-slideUp stagger-2" style={{ padding: '1.25rem' }}>
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown size={16} style={{ color: 'var(--danger)' }} />
              <p className="text-sm text-muted">Total Withdrawn</p>
            </div>
            <p className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(totalWithdrawn)}</p>
          </div>
          <div className="glass-panel stat-card accent-indigo animate-slideUp stagger-3" style={{ padding: '1.25rem' }}>
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpDown size={16} style={{ color: 'var(--accent-primary)' }} />
              <p className="text-sm text-muted">Net Flow</p>
            </div>
            <p className="stat-value" style={{ fontSize: '1.4rem', color: netFlow >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {formatCurrency(Math.abs(netFlow))}
              <span className="text-xs text-muted" style={{ marginLeft: '0.3rem' }}>
                {netFlow >= 0 ? 'invested' : 'withdrawn'}
              </span>
            </p>
          </div>
        </div>
      )}

      <div className="glass-panel no-hover mb-4" style={{ padding: '0.75rem 1rem' }}>
        <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
          <div className="flex items-center gap-2">
            <Filter size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            <span className="text-sm text-muted">Filter:</span>
          </div>
          <div className="flex gap-1 flex-wrap">
            {['All', ...TRANSACTION_TYPES].map(type => (
              <button
                key={type}
                className={`btn btn-sm ${filterType === type ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilterType(type)}
                style={filterType === type ? {} : { background: 'transparent', border: 'none' }}
              >
                {type === 'All' ? 'All' : TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-panel no-hover animate-slideUp">
        {filteredTransactions.length > 0 && (
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-muted">
              {filteredTransactions.length} transaction{filteredTransactions.length > 1 ? 's' : ''}
            </p>
          </div>
        )}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Name</th>
                <th className="text-right">Amount</th>
                <th>Category</th>
                <th className="text-right" style={{ width: '80px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(t => (
                <tr key={t.id}>
                  <td className="text-muted text-sm">{formatDate(t.date)}</td>
                  <td>
                    <span className={`badge ${TYPE_BADGE_CLASS[t.type] || 'badge-info'}`}>
                      {TYPE_LABELS[t.type] || t.type}
                    </span>
                  </td>
                  <td>
                    <span className="font-medium text-strong">{t.name}</span>
                    {t.notes && (
                      <span className="text-xs text-muted" style={{ display: 'block', marginTop: '1px' }}>
                        {t.notes}
                      </span>
                    )}
                  </td>
                  <td className="text-right font-medium" style={{ color: isInflow(t.type) ? 'var(--success)' : 'var(--danger)' }}>
                    {isInflow(t.type) ? '+' : '-'}{formatCurrency(Math.abs(t.amount))}
                  </td>
                  <td className="text-muted">{t.category || <span>&mdash;</span>}</td>
                  <td className="text-right">
                    <button
                      className="btn-ghost btn-icon"
                      onClick={() => setConfirmDelete(t)}
                      title="Delete"
                      aria-label={`Delete ${t.name}`}
                    >
                      <Trash2 size={15} style={{ color: 'var(--danger)' }} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan="6">
                    <div className="empty-state">
                      <div className="empty-state-icon"><Filter size={24} /></div>
                      <p className="text-muted">
                        {transactions.length === 0
                          ? "No transactions yet. Click 'Add Transaction' to start tracking."
                          : 'No transactions match the selected filter.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirmDelete && (
        <div className="confirm-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <AlertTriangle size={22} style={{ color: 'var(--danger)' }} />
            </div>
            <h3 style={{ marginBottom: '0.5rem' }}>Delete Transaction?</h3>
            <p className="text-sm text-muted" style={{ marginBottom: '1.5rem' }}>
              <strong>{confirmDelete.name}</strong> ({formatCurrency(Math.abs(confirmDelete.amount))}) will be permanently removed.
            </p>
            <div className="flex gap-2 justify-center">
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeleteConfirm} style={{ fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Transaction</h2>
              <button className="btn-ghost btn-icon" onClick={() => setShowModal(false)} aria-label="Close modal">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    className="form-control"
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select
                    className="form-control"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    {TRANSACTION_TYPES.map(t => (
                      <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  className="form-control"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. HDFC Nifty 50 Index Fund"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Amount (INR)</label>
                  <input
                    className="form-control"
                    type="number"
                    step="any"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="e.g. 10000"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input
                    className="form-control"
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Mutual Fund, Stock"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Quantity <span className="text-xs text-muted">(optional)</span></label>
                  <input
                    className="form-control"
                    type="number"
                    step="any"
                    value={formData.qty}
                    onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                    placeholder="e.g. 100"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Price <span className="text-xs text-muted">(optional)</span></label>
                  <input
                    className="form-control"
                    type="number"
                    step="any"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="e.g. 250.50"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes <span className="text-xs text-muted">(optional)</span></label>
                <input
                  className="form-control"
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional details"
                />
              </div>

              <div className="flex gap-2 justify-end mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Transaction</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
