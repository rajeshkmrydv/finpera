import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { initialAssets, initialLiabilities, UNIT_BASED_TYPES } from '../utils/dummyData';
import { fetchCurrentPrice } from '../utils/priceService';
import { getAssetValue, calculateHealthScore } from '../utils/financeCalculations';

const FinperaContext = createContext();
export const useFinpera = () => useContext(FinperaContext);
export { getAssetValue };

function loadJSON(key, fallback) {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; }
  catch { return fallback; }
}
function saveJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

const DEFAULT_SETTINGS = {
  aiApiKey: '', aiProvider: 'anthropic',
  riskProfile: '', currency: 'INR',
  monthlyIncome: 0, age: 0, dependents: 0, name: '',
};

const DEFAULT_TAX = {
  regime: 'old', financialYear: '2025-26', annualIncome: 0,
  epf: 0, ppf: 0, elss: 0, nps80C: 0, lic: 0, others80C: 0,
  nps_extra: 0, healthSelf: 0, healthParents: 0,
  basicSalary: 0, hraReceived: 0, rentPaid: 0, isMetro: true,
  homeLoanInterest: 0,
};

const DEFAULT_BUDGET = { monthlyIncome: 0, categories: [], expenses: [] };

export const FinperaProvider = ({ children }) => {
  const [assets, setAssets] = useState(() => loadJSON('finpera_assets', initialAssets));
  const [liabilities, setLiabilities] = useState(() => loadJSON('finpera_liabilities', initialLiabilities));
  const [transactions, setTransactions] = useState(() => loadJSON('finpera_transactions', []));
  const [budget, setBudget] = useState(() => loadJSON('finpera_budget', DEFAULT_BUDGET));
  const [goals, setGoals] = useState(() => loadJSON('finpera_goals', []));
  const [taxProfile, setTaxProfile] = useState(() => loadJSON('finpera_tax', DEFAULT_TAX));
  const [insurance, setInsurance] = useState(() => loadJSON('finpera_insurance', []));
  const [netWorthHistory, setNetWorthHistory] = useState(() => loadJSON('finpera_nw_history', []));
  const [settings, setSettings] = useState(() => loadJSON('finpera_settings', DEFAULT_SETTINGS));
  const [aiConversations, setAIConversations] = useState(() => loadJSON('finpera_ai_chats', []));

  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(() => localStorage.getItem('finpera_last_refreshed') || null);

  useEffect(() => { saveJSON('finpera_assets', assets); }, [assets]);
  useEffect(() => { saveJSON('finpera_liabilities', liabilities); }, [liabilities]);
  useEffect(() => { saveJSON('finpera_transactions', transactions); }, [transactions]);
  useEffect(() => { saveJSON('finpera_budget', budget); }, [budget]);
  useEffect(() => { saveJSON('finpera_goals', goals); }, [goals]);
  useEffect(() => { saveJSON('finpera_tax', taxProfile); }, [taxProfile]);
  useEffect(() => { saveJSON('finpera_insurance', insurance); }, [insurance]);
  useEffect(() => { saveJSON('finpera_nw_history', netWorthHistory); }, [netWorthHistory]);
  useEffect(() => { saveJSON('finpera_settings', settings); }, [settings]);
  useEffect(() => { saveJSON('finpera_ai_chats', aiConversations); }, [aiConversations]);

  /* ── Assets ── */
  const addAsset = (asset) => setAssets(prev => [...prev, { ...asset, id: crypto.randomUUID() }]);
  const updateAsset = (id, updated) => setAssets(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a));
  const deleteAsset = (id) => setAssets(prev => prev.filter(a => a.id !== id));

  /* ── Liabilities ── */
  const addLiability = (l) => setLiabilities(prev => [...prev, { ...l, id: crypto.randomUUID() }]);
  const updateLiability = (id, u) => setLiabilities(prev => prev.map(l => l.id === id ? { ...l, ...u } : l));
  const deleteLiability = (id) => setLiabilities(prev => prev.filter(l => l.id !== id));

  /* ── Transactions ── */
  const addTransaction = (t) => setTransactions(prev => [{ ...t, id: crypto.randomUUID(), date: t.date || new Date().toISOString().slice(0, 10) }, ...prev]);
  const deleteTransaction = (id) => setTransactions(prev => prev.filter(t => t.id !== id));

  /* ── Budget ── */
  const updateBudget = (updates) => setBudget(prev => ({ ...prev, ...updates }));
  const addExpense = (exp) => setBudget(prev => ({
    ...prev,
    expenses: [{ ...exp, id: crypto.randomUUID(), date: exp.date || new Date().toISOString().slice(0, 10) }, ...prev.expenses],
  }));
  const deleteExpense = (id) => setBudget(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== id) }));
  const addBudgetCategory = (cat) => setBudget(prev => ({
    ...prev, categories: [...prev.categories, { ...cat, id: crypto.randomUUID() }],
  }));
  const deleteBudgetCategory = (id) => setBudget(prev => ({
    ...prev, categories: prev.categories.filter(c => c.id !== id),
  }));
  const updateBudgetCategory = (id, u) => setBudget(prev => ({
    ...prev, categories: prev.categories.map(c => c.id === id ? { ...c, ...u } : c),
  }));

  /* ── Goals ── */
  const addGoal = (g) => setGoals(prev => [...prev, { ...g, id: crypto.randomUUID() }]);
  const updateGoal = (id, u) => setGoals(prev => prev.map(g => g.id === id ? { ...g, ...u } : g));
  const deleteGoal = (id) => setGoals(prev => prev.filter(g => g.id !== id));

  /* ── Tax ── */
  const updateTaxProfile = (updates) => setTaxProfile(prev => ({ ...prev, ...updates }));

  /* ── Insurance ── */
  const addInsurance = (i) => setInsurance(prev => [...prev, { ...i, id: crypto.randomUUID() }]);
  const updateInsurance = (id, u) => setInsurance(prev => prev.map(i => i.id === id ? { ...i, ...u } : i));
  const deleteInsurance = (id) => setInsurance(prev => prev.filter(i => i.id !== id));

  /* ── Settings ── */
  const updateSettings = (updates) => setSettings(prev => ({ ...prev, ...updates }));

  /* ── AI Conversations ── */
  const addAIConversation = (conv) => setAIConversations(prev => [{ ...conv, id: conv.id || crypto.randomUUID(), createdAt: conv.createdAt || new Date().toISOString() }, ...prev]);
  const updateAIConversation = (id, u) => setAIConversations(prev => prev.map(c => c.id === id ? { ...c, ...u } : c));
  const deleteAIConversation = (id) => setAIConversations(prev => prev.filter(c => c.id !== id));

  /* ── Import ── */
  const importTransactions = (newAssets) => {
    setAssets(prev => [...prev, ...newAssets.map(a => ({ ...a, id: crypto.randomUUID() }))]);
  };

  /* ── Refresh Prices ── */
  const refreshPrices = useCallback(async () => {
    const refreshable = assets.filter(a => UNIT_BASED_TYPES.includes(a.type) && a.symbol);
    if (refreshable.length === 0) return { updated: 0, failed: 0 };
    setRefreshing(true);
    let updated = 0, failed = 0;
    const updatedAssets = [...assets];
    for (const asset of refreshable) {
      try {
        const price = await fetchCurrentPrice(asset);
        if (price && price > 0) {
          const idx = updatedAssets.findIndex(a => a.id === asset.id);
          if (idx !== -1) {
            updatedAssets[idx] = { ...updatedAssets[idx], currentPrice: price, value: updatedAssets[idx].qty * price };
            updated++;
          }
        } else failed++;
      } catch { failed++; }
    }
    setAssets(updatedAssets);
    const now = new Date().toISOString();
    setLastRefreshed(now);
    localStorage.setItem('finpera_last_refreshed', now);
    setRefreshing(false);
    return { updated, failed };
  }, [assets]);

  /* ── Net Worth Snapshot (auto daily) ── */
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const lastEntry = netWorthHistory[netWorthHistory.length - 1];
    if (!lastEntry || lastEntry.date !== today) {
      const totalA = assets.reduce((s, a) => s + getAssetValue(a), 0);
      const totalL = liabilities.reduce((s, l) => s + Number(l.remainingAmount || 0), 0);
      if (totalA > 0 || totalL > 0) {
        setNetWorthHistory(prev => [...prev, { date: today, totalAssets: totalA, totalLiabilities: totalL, netWorth: totalA - totalL }]);
      }
    }
  }, [assets, liabilities]);

  /* ── Computed values ── */
  const totalAssetsValue = assets.reduce((s, a) => s + getAssetValue(a), 0);
  const totalLiabilitiesValue = liabilities.reduce((s, l) => s + Number(l.remainingAmount || 0), 0);
  const totalMonthlyEMI = liabilities.reduce((s, l) => s + Number(l.emi || 0), 0);
  const netWorth = totalAssetsValue - totalLiabilitiesValue;

  const healthScore = calculateHealthScore({ assets, liabilities, settings, goals, insurance, budget });

  return (
    <FinperaContext.Provider value={{
      assets, addAsset, updateAsset, deleteAsset,
      liabilities, addLiability, updateLiability, deleteLiability,
      transactions, addTransaction, deleteTransaction,
      budget, updateBudget, addExpense, deleteExpense, addBudgetCategory, deleteBudgetCategory, updateBudgetCategory,
      goals, addGoal, updateGoal, deleteGoal,
      taxProfile, updateTaxProfile,
      insurance, addInsurance, updateInsurance, deleteInsurance,
      netWorthHistory,
      settings, updateSettings,
      aiConversations, addAIConversation, updateAIConversation, deleteAIConversation,
      importTransactions, getAssetValue, refreshPrices, refreshing, lastRefreshed,
      totalAssetsValue, totalLiabilitiesValue, netWorth, totalMonthlyEMI,
      healthScore,
    }}>
      {children}
    </FinperaContext.Provider>
  );
};
