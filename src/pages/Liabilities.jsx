import React, { useState } from 'react';
import { useFinpera } from '../context/FinperaContext';
import { Plus, Trash2, Pencil, X } from 'lucide-react';

const Liabilities = () => {
  const { liabilities, addLiability, updateLiability, deleteLiability, totalLiabilitiesValue, totalMonthlyEMI } = useFinpera();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', totalAmount: '', remainingAmount: '', emi: '', interestRate: '' });

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ name: '', totalAmount: '', remainingAmount: '', emi: '', interestRate: '' });
    setShowModal(true);
  };

  const openEditModal = (loan) => {
    setEditingId(loan.id);
    setFormData({
      name: loan.name,
      totalAmount: String(loan.totalAmount),
      remainingAmount: String(loan.remainingAmount),
      emi: String(loan.emi),
      interestRate: String(loan.interestRate)
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      totalAmount: Number(formData.totalAmount),
      remainingAmount: Number(formData.remainingAmount),
      emi: Number(formData.emi),
      interestRate: Number(formData.interestRate)
    };

    if (editingId) {
      updateLiability(editingId, payload);
    } else {
      addLiability(payload);
    }
    setShowModal(false);
    setFormData({ name: '', totalAmount: '', remainingAmount: '', emi: '', interestRate: '' });
    setEditingId(null);
  };

  const paidPercent = (loan) => {
    if (!loan.totalAmount) return 0;
    return Math.round(((loan.totalAmount - loan.remainingAmount) / loan.totalAmount) * 100);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Liabilities & Loans</h1>
          <p>Track your active loans, EMIs, and repayment progress.</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={18} /> Add Liability
        </button>
      </div>

      {/* Summary Cards */}
      {liabilities.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="glass-panel stat-card accent-red animate-slideUp stagger-1" style={{ padding: '1.25rem' }}>
            <p className="text-sm text-muted mb-1">Outstanding Debt</p>
            <p className="stat-value" style={{ fontSize: '1.4rem', color: 'var(--danger)' }}>{formatCurrency(totalLiabilitiesValue)}</p>
          </div>
          <div className="glass-panel stat-card accent-indigo animate-slideUp stagger-2" style={{ padding: '1.25rem' }}>
            <p className="text-sm text-muted mb-1">Monthly EMI</p>
            <p className="stat-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(totalMonthlyEMI)}</p>
          </div>
          <div className="glass-panel stat-card accent-green animate-slideUp stagger-3" style={{ padding: '1.25rem' }}>
            <p className="text-sm text-muted mb-1">Active Loans</p>
            <p className="stat-value" style={{ fontSize: '1.4rem' }}>{liabilities.length}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass-panel no-hover animate-slideUp">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Loan Description</th>
                <th className="text-right">Total Amount</th>
                <th className="text-right">Remaining</th>
                <th className="text-right">Monthly EMI</th>
                <th className="text-right">Interest</th>
                <th style={{ width: '100px' }}>Progress</th>
                <th className="text-right" style={{ width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {liabilities.map(loan => (
                <tr key={loan.id}>
                  <td className="font-medium text-strong">{loan.name}</td>
                  <td className="text-right text-muted">{formatCurrency(loan.totalAmount)}</td>
                  <td className="text-right font-medium" style={{ color: 'var(--danger)' }}>{formatCurrency(loan.remainingAmount)}</td>
                  <td className="text-right text-strong">{formatCurrency(loan.emi)}</td>
                  <td className="text-right text-muted">{loan.interestRate}%</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div style={{ flex: 1, height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${paidPercent(loan)}%`, height: '100%', background: 'var(--success)', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                      </div>
                      <span className="text-xs text-muted" style={{ minWidth: '32px' }}>{paidPercent(loan)}%</span>
                    </div>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      <button className="btn-ghost btn-icon" onClick={() => openEditModal(loan)} title="Edit">
                        <Pencil size={15} style={{ color: 'var(--accent-primary)' }} />
                      </button>
                      <button className="btn-ghost btn-icon" onClick={() => deleteLiability(loan.id)} title="Delete">
                        <Trash2 size={15} style={{ color: 'var(--danger)' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {liabilities.length === 0 && (
                <tr>
                  <td colSpan="7">
                    <div className="empty-state">
                      <div className="empty-state-icon" style={{ background: 'var(--success-light)' }}>
                        <span style={{ fontSize: '1.5rem' }}>&#10003;</span>
                      </div>
                      <p className="text-muted font-medium">No active loans. You are debt free!</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Loan' : 'Add Liability / Loan'}</h2>
              <button className="btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Loan Name / Description</label>
                <input className="form-control" type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Bajaj Auto Loan" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Total Loan Amount</label>
                  <input className="form-control" type="number" required value={formData.totalAmount} onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })} placeholder="1000000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Remaining Amount</label>
                  <input className="form-control" type="number" required value={formData.remainingAmount} onChange={(e) => setFormData({ ...formData, remainingAmount: e.target.value })} placeholder="800000" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Monthly EMI</label>
                  <input className="form-control" type="number" required value={formData.emi} onChange={(e) => setFormData({ ...formData, emi: e.target.value })} placeholder="15000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Interest Rate (% p.a.)</label>
                  <input className="form-control" type="number" step="0.1" required value={formData.interestRate} onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })} placeholder="9.5" />
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Update Loan' : 'Save Loan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Liabilities;
