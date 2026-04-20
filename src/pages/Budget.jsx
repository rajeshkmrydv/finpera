import React, { useState, useMemo } from 'react';
import { useFinpera } from '../context/FinperaContext';
import { Plus, Trash2, Pencil, X, AlertTriangle, Receipt, Wallet, DollarSign, PiggyBank, TrendingDown } from 'lucide-react';

const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

const isCurrentMonth = (date) => {
  const d = new Date(date);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

const Budget = () => {
  const { budget, updateBudget, addExpense, deleteExpense, addBudgetCategory, deleteBudgetCategory, updateBudgetCategory } = useFinpera();

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmDeleteExpense, setConfirmDeleteExpense] = useState(null);
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeValue, setIncomeValue] = useState('');

  const [categoryForm, setCategoryForm] = useState({ name: '', allocated: '' });
  const [expenseForm, setExpenseForm] = useState({ categoryId: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] });

  const categories = budget?.categories || [];
  const expenses = budget?.expenses || [];
  const monthlyIncome = budget?.monthlyIncome || 0;

  const currentMonthExpenses = useMemo(() => expenses.filter(e => isCurrentMonth(e.date)), [expenses]);

  const totalBudgeted = useMemo(() => categories.reduce((sum, c) => sum + (c.allocated || 0), 0), [categories]);
  const totalSpent = useMemo(() => currentMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0), [currentMonthExpenses]);
  const netSavings = monthlyIncome - totalBudgeted;
  const budgetRemaining = totalBudgeted - totalSpent;

  const spentByCategory = useMemo(() => {
    const map = {};
    currentMonthExpenses.forEach(e => {
      map[e.categoryId] = (map[e.categoryId] || 0) + e.amount;
    });
    return map;
  }, [currentMonthExpenses]);

  const sortedExpenses = useMemo(() => [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)), [expenses]);

  const getCategoryName = (id) => categories.find(c => c.id === id)?.name || 'Unknown';

  // Income editing
  const startEditingIncome = () => {
    setIncomeValue(String(monthlyIncome));
    setEditingIncome(true);
  };

  const saveIncome = () => {
    const val = Number(incomeValue);
    if (val >= 0) updateBudget({ monthlyIncome: val });
    setEditingIncome(false);
  };

  const handleIncomeKeyDown = (e) => {
    if (e.key === 'Enter') saveIncome();
    if (e.key === 'Escape') setEditingIncome(false);
  };

  // Category modal
  const openAddCategory = () => {
    setEditingCategoryId(null);
    setCategoryForm({ name: '', allocated: '' });
    setShowCategoryModal(true);
  };

  const openEditCategory = (cat) => {
    setEditingCategoryId(cat.id);
    setCategoryForm({ name: cat.name, allocated: String(cat.allocated) });
    setShowCategoryModal(true);
  };

  const handleCategorySubmit = (e) => {
    e.preventDefault();
    const payload = { name: categoryForm.name, allocated: Number(categoryForm.allocated) };
    if (editingCategoryId) {
      updateBudgetCategory(editingCategoryId, payload);
    } else {
      addBudgetCategory(payload);
    }
    setShowCategoryModal(false);
    setEditingCategoryId(null);
  };

  // Expense modal
  const openAddExpense = () => {
    setExpenseForm({ categoryId: categories[0]?.id || '', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
    setShowExpenseModal(true);
  };

  const handleExpenseSubmit = (e) => {
    e.preventDefault();
    addExpense({
      categoryId: expenseForm.categoryId,
      amount: Number(expenseForm.amount),
      description: expenseForm.description,
      date: expenseForm.date,
    });
    setShowExpenseModal(false);
  };

  // Delete handlers
  const handleDeleteCategory = () => {
    if (confirmDelete) {
      deleteBudgetCategory(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  const handleDeleteExpense = () => {
    if (confirmDeleteExpense) {
      deleteExpense(confirmDeleteExpense.id);
      setConfirmDeleteExpense(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Budget Tracker</h1>
          <p>Track your monthly income and spending.</p>
        </div>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={openAddExpense} disabled={categories.length === 0}>
            <Receipt size={16} /> Add Expense
          </button>
          <button className="btn btn-primary" onClick={openAddCategory}>
            <Plus size={18} /> Add Category
          </button>
        </div>
      </div>

      {/* Monthly Income */}
      <div className="glass-panel no-hover mb-6 animate-slideUp" style={{ padding: '1rem 1.25rem' }}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Wallet size={20} style={{ color: 'var(--success)' }} />
            </div>
            <div>
              <p className="text-sm text-muted">Monthly Income</p>
              {editingIncome ? (
                <input
                  className="form-control"
                  type="number"
                  value={incomeValue}
                  onChange={(e) => setIncomeValue(e.target.value)}
                  onBlur={saveIncome}
                  onKeyDown={handleIncomeKeyDown}
                  autoFocus
                  style={{ maxWidth: '200px', fontSize: '1.1rem', fontWeight: 600, padding: '0.3rem 0.5rem' }}
                />
              ) : (
                <p className="font-bold" style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                  {formatCurrency(monthlyIncome)}
                </p>
              )}
            </div>
          </div>
          {!editingIncome && (
            <button className="btn-ghost btn-icon" onClick={startEditingIncome} title="Edit income" aria-label="Edit monthly income">
              <Pencil size={16} style={{ color: 'var(--accent-primary)' }} />
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="gradient-card grd-emerald animate-slideUp stagger-1">
          <div className="flex justify-between items-start">
            <div>
              <p className="card-label">Monthly Income</p>
              <p className="card-value">{formatCurrency(monthlyIncome)}</p>
              <p className="card-sub">{categories.length} budget categor{categories.length !== 1 ? 'ies' : 'y'}</p>
            </div>
            <div className="card-icon"><DollarSign size={22} /></div>
          </div>
        </div>

        <div className="gradient-card grd-rose animate-slideUp stagger-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="card-label">Total Expenses (Budgeted)</p>
              <p className="card-value">{formatCurrency(totalBudgeted)}</p>
              <p className="card-sub">
                {monthlyIncome > 0
                  ? `${Math.round((totalBudgeted / monthlyIncome) * 100)}% of income`
                  : 'Set income to see ratio'}
              </p>
            </div>
            <div className="card-icon"><TrendingDown size={22} /></div>
          </div>
        </div>

        <div className="gradient-card grd-indigo animate-slideUp stagger-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="card-label">Net Savings</p>
              <p className="card-value">{formatCurrency(netSavings)}</p>
              <p className="card-sub">
                {netSavings > 0
                  ? `${Math.round((netSavings / Math.max(monthlyIncome, 1)) * 100)}% savings rate`
                  : netSavings === 0 ? 'No surplus' : 'Over-allocated!'}
              </p>
            </div>
            <div className="card-icon"><PiggyBank size={22} /></div>
          </div>
        </div>

        <div className="gradient-card grd-blue animate-slideUp stagger-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="card-label">Spent this Month</p>
              <p className="card-value">{formatCurrency(totalSpent)}</p>
              <p className="card-sub">
                {totalBudgeted > 0
                  ? `${formatCurrency(budgetRemaining)} of budget left`
                  : `${currentMonthExpenses.length} expense${currentMonthExpenses.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="card-icon"><Wallet size={22} /></div>
          </div>
        </div>
      </div>

      {/* Income → Expense → Savings flow bar */}
      {monthlyIncome > 0 && totalBudgeted > 0 && (
        <div className="glass-panel no-hover mb-6 animate-slideUp" style={{ padding: '1rem 1.5rem' }}>
          <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Monthly Flow</p>
          <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', background: 'var(--bg-tertiary)' }}>
            <div style={{ width: `${Math.min((totalBudgeted / monthlyIncome) * 100, 100)}%`, background: 'linear-gradient(90deg, #e11d48, #f43f5e)', transition: 'width 0.5s ease' }} title={`Expenses: ${formatCurrency(totalBudgeted)}`} />
            {netSavings > 0 && (
              <div style={{ width: `${(netSavings / monthlyIncome) * 100}%`, background: 'linear-gradient(90deg, #059669, #34d399)', transition: 'width 0.5s ease' }} title={`Savings: ${formatCurrency(netSavings)}`} />
            )}
          </div>
          <div className="flex justify-between mt-2">
            <div className="flex items-center gap-2">
              <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#f43f5e' }} />
              <span className="text-xs text-muted">Expenses {Math.round((totalBudgeted / monthlyIncome) * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#34d399' }} />
              <span className="text-xs text-muted">Savings {netSavings > 0 ? Math.round((netSavings / monthlyIncome) * 100) : 0}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Spending Breakdown */}
      {categories.length > 0 && (
        <div className="glass-panel no-hover animate-slideUp mb-6" style={{ padding: '1.25rem 1.5rem' }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>Spending Breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {categories.map(cat => {
              const spent = spentByCategory[cat.id] || 0;
              const pct = cat.allocated > 0 ? Math.min((spent / cat.allocated) * 100, 100) : 0;
              const overBudget = spent > cat.allocated;
              return (
                <div key={cat.id}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{cat.name}</span>
                    <span className="text-xs text-muted">
                      {formatCurrency(spent)} / {formatCurrency(cat.allocated)}
                      {overBudget && <span className="text-danger" style={{ marginLeft: '0.25rem', fontWeight: 600 }}>Over!</span>}
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${cat.allocated > 0 ? Math.min((spent / cat.allocated) * 100, 100) : 0}%`,
                      height: '100%',
                      background: overBudget ? 'var(--danger)' : pct > 75 ? 'var(--warning, #f59e0b)' : 'var(--success)',
                      borderRadius: '4px',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Budget Categories */}
      <div className="glass-panel no-hover animate-slideUp mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold">Budget Categories</h3>
          <button className="btn btn-primary btn-sm" onClick={openAddCategory}>
            <Plus size={14} /> Add
          </button>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th className="text-right">Allocated</th>
                <th className="text-right">Spent</th>
                <th style={{ width: '140px' }}>Progress</th>
                <th className="text-right" style={{ width: '90px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => {
                const spent = spentByCategory[cat.id] || 0;
                const pct = cat.allocated > 0 ? Math.round((spent / cat.allocated) * 100) : 0;
                const overBudget = spent > cat.allocated;
                return (
                  <tr key={cat.id}>
                    <td className="font-medium text-strong">{cat.name}</td>
                    <td className="text-right">{formatCurrency(cat.allocated)}</td>
                    <td className="text-right" style={{ color: overBudget ? 'var(--danger)' : undefined, fontWeight: overBudget ? 600 : undefined }}>
                      {formatCurrency(spent)}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div style={{ flex: 1, height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min(pct, 100)}%`,
                            height: '100%',
                            background: overBudget ? 'var(--danger)' : pct > 75 ? 'var(--warning, #f59e0b)' : 'var(--success)',
                            borderRadius: '3px',
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                        <span className="text-xs text-muted" style={{ minWidth: '36px', textAlign: 'right' }}>{pct}%</span>
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button className="btn-ghost btn-icon" onClick={() => openEditCategory(cat)} title="Edit" aria-label={`Edit ${cat.name}`}>
                          <Pencil size={15} style={{ color: 'var(--accent-primary)' }} />
                        </button>
                        <button className="btn-ghost btn-icon" onClick={() => setConfirmDelete(cat)} title="Delete" aria-label={`Delete ${cat.name}`}>
                          <Trash2 size={15} style={{ color: 'var(--danger)' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {categories.length === 0 && (
                <tr>
                  <td colSpan="5">
                    <div className="empty-state">
                      <div className="empty-state-icon"><PiggyBank size={24} /></div>
                      <p className="text-muted">No budget categories yet. Click &lsquo;Add Category&rsquo; to get started.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Expenses */}
      <div className="glass-panel no-hover animate-slideUp">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold">Recent Expenses</h3>
          <button className="btn btn-primary btn-sm" onClick={openAddExpense} disabled={categories.length === 0}>
            <Plus size={14} /> Add Expense
          </button>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th className="text-right">Amount</th>
                <th className="text-right" style={{ width: '60px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedExpenses.map(exp => (
                <tr key={exp.id}>
                  <td className="text-muted text-sm">
                    {new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td><span className="badge">{getCategoryName(exp.categoryId)}</span></td>
                  <td className="font-medium text-strong">{exp.description || <span className="text-muted">&mdash;</span>}</td>
                  <td className="text-right text-strong font-medium">{formatCurrency(exp.amount)}</td>
                  <td className="text-right">
                    <button className="btn-ghost btn-icon" onClick={() => setConfirmDeleteExpense(exp)} title="Delete" aria-label="Delete expense">
                      <Trash2 size={15} style={{ color: 'var(--danger)' }} />
                    </button>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan="5">
                    <div className="empty-state">
                      <div className="empty-state-icon"><Receipt size={24} /></div>
                      <p className="text-muted">
                        {categories.length === 0
                          ? 'Add a budget category first, then start logging expenses.'
                          : 'No expenses recorded yet. Click \'Add Expense\' to start tracking.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Category Confirm */}
      {confirmDelete && (
        <div className="confirm-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <AlertTriangle size={22} style={{ color: 'var(--danger)' }} />
            </div>
            <h3 style={{ marginBottom: '0.5rem' }}>Delete Category?</h3>
            <p className="text-sm text-muted" style={{ marginBottom: '1.5rem' }}>
              <strong>{confirmDelete.name}</strong> ({formatCurrency(confirmDelete.allocated)} budgeted) will be permanently removed.
            </p>
            <div className="flex gap-2 justify-center">
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeleteCategory} style={{ fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Expense Confirm */}
      {confirmDeleteExpense && (
        <div className="confirm-overlay" onClick={() => setConfirmDeleteExpense(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <AlertTriangle size={22} style={{ color: 'var(--danger)' }} />
            </div>
            <h3 style={{ marginBottom: '0.5rem' }}>Delete Expense?</h3>
            <p className="text-sm text-muted" style={{ marginBottom: '1.5rem' }}>
              {formatCurrency(confirmDeleteExpense.amount)} for &ldquo;{confirmDeleteExpense.description || 'Untitled'}&rdquo; will be permanently removed.
            </p>
            <div className="flex gap-2 justify-center">
              <button className="btn btn-secondary" onClick={() => setConfirmDeleteExpense(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeleteExpense} style={{ fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCategoryId ? 'Edit Category' : 'Add Budget Category'}</h2>
              <button className="btn-ghost btn-icon" onClick={() => setShowCategoryModal(false)} aria-label="Close modal">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCategorySubmit}>
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input
                  className="form-control"
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="e.g. Groceries, Rent, Transport"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Monthly Allocation (INR)</label>
                <input
                  className="form-control"
                  type="number"
                  required
                  min="0"
                  value={categoryForm.allocated}
                  onChange={(e) => setCategoryForm({ ...categoryForm, allocated: e.target.value })}
                  placeholder="e.g. 10000"
                />
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCategoryModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingCategoryId ? 'Update Category' : 'Save Category'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="modal-overlay" onClick={() => setShowExpenseModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Expense</h2>
              <button className="btn-ghost btn-icon" onClick={() => setShowExpenseModal(false)} aria-label="Close modal">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleExpenseSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-control"
                    required
                    value={expenseForm.categoryId}
                    onChange={(e) => setExpenseForm({ ...expenseForm, categoryId: e.target.value })}
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (INR)</label>
                  <input
                    className="form-control"
                    type="number"
                    required
                    min="1"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    placeholder="e.g. 500"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  className="form-control"
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="e.g. Weekly vegetables"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  className="form-control"
                  type="date"
                  required
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                />
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setShowExpenseModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budget;
