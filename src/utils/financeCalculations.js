import { UNIT_BASED_TYPES } from './dummyData';

export const getAssetValue = (asset) => {
  if (UNIT_BASED_TYPES.includes(asset.type) && asset.qty && asset.currentPrice) {
    return asset.qty * asset.currentPrice;
  }
  return Number(asset.value || 0);
};

export const formatCurrency = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

export const formatCurrencyDecimal = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

export const formatCompact = (val) => {
  if (val >= 10000000) return `${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `${(val / 100000).toFixed(2)} L`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)} K`;
  return val.toFixed(0);
};

export const formatNumber = (val) => new Intl.NumberFormat('en-IN').format(val);

/* ── SIP & Compound Interest ── */

export function futureSIP(monthly, years, annualRate) {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return monthly * n;
  return monthly * (((1 + r) ** n - 1) / r) * (1 + r);
}

export function futureStepUpSIP(monthly, years, annualRate, stepUpPct = 10) {
  let total = 0;
  let current = monthly;
  const monthlyRate = annualRate / 100 / 12;
  for (let y = 0; y < years; y++) {
    for (let m = 0; m < 12; m++) {
      const monthsLeft = (years - y) * 12 - m;
      total += current * (1 + monthlyRate) ** monthsLeft;
    }
    current *= 1 + stepUpPct / 100;
  }
  return total;
}

export function lumpSumFV(principal, years, annualRate) {
  return principal * (1 + annualRate / 100) ** years;
}

export function requiredMonthlySIP(target, years, annualRate) {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return target / n;
  return target / ((((1 + r) ** n - 1) / r) * (1 + r));
}

/* ── XIRR (Newton-Raphson) ── */

export function xirr(cashflows) {
  if (!cashflows || cashflows.length < 2) return null;
  const sorted = [...cashflows].sort((a, b) => new Date(a.date) - new Date(b.date));
  const d0 = new Date(sorted[0].date);

  const f = (rate) => sorted.reduce((s, cf) => {
    const days = (new Date(cf.date) - d0) / 86400000;
    return s + cf.amount / (1 + rate) ** (days / 365);
  }, 0);

  const df = (rate) => sorted.reduce((s, cf) => {
    const days = (new Date(cf.date) - d0) / 86400000;
    const t = days / 365;
    return s - t * cf.amount / (1 + rate) ** (t + 1);
  }, 0);

  let guess = 0.1;
  for (let i = 0; i < 100; i++) {
    const fVal = f(guess);
    const dfVal = df(guess);
    if (Math.abs(dfVal) < 1e-10) break;
    const next = guess - fVal / dfVal;
    if (Math.abs(next - guess) < 1e-7) return next;
    guess = next;
  }
  return guess;
}

/* ── Tax Calculations (India FY 2025-26) ── */

const OLD_SLABS = [
  { upto: 250000, rate: 0 },
  { upto: 500000, rate: 5 },
  { upto: 1000000, rate: 20 },
  { upto: Infinity, rate: 30 },
];

const NEW_SLABS = [
  { upto: 300000, rate: 0 },
  { upto: 700000, rate: 5 },
  { upto: 1000000, rate: 10 },
  { upto: 1200000, rate: 15 },
  { upto: 1500000, rate: 20 },
  { upto: Infinity, rate: 30 },
];

function computeTaxOnSlabs(income, slabs) {
  let tax = 0;
  let prev = 0;
  for (const slab of slabs) {
    if (income <= prev) break;
    const chunk = Math.min(income, slab.upto) - prev;
    tax += chunk * slab.rate / 100;
    prev = slab.upto;
  }
  return tax;
}

export function calculateOldRegimeTax(grossIncome, deductions = {}) {
  const s80C = Math.min(
    (deductions.epf || 0) + (deductions.ppf || 0) + (deductions.elss || 0) +
    (deductions.nps80C || 0) + (deductions.lic || 0) + (deductions.others80C || 0),
    150000
  );
  const s80CCD = Math.min(deductions.nps_extra || 0, 50000);
  const s80D = Math.min(deductions.healthSelf || 0, 25000) + Math.min(deductions.healthParents || 0, 50000);
  const hra = calculateHRAExemption(deductions);
  const homeLoanInterest = Math.min(deductions.homeLoanInterest || 0, 200000);
  const standardDeduction = 50000;

  const totalDeductions = s80C + s80CCD + s80D + hra + homeLoanInterest + standardDeduction;
  const taxable = Math.max(0, grossIncome - totalDeductions);
  const tax = computeTaxOnSlabs(taxable, OLD_SLABS);
  const cess = tax * 0.04;

  return {
    grossIncome, totalDeductions, taxable, tax, cess, totalTax: tax + cess,
    breakdown: { s80C, s80CCD, s80D, hra, homeLoanInterest, standardDeduction },
  };
}

export function calculateNewRegimeTax(grossIncome) {
  const standardDeduction = 75000;
  const taxable = Math.max(0, grossIncome - standardDeduction);
  const tax = computeTaxOnSlabs(taxable, NEW_SLABS);
  const cess = tax * 0.04;
  const rebate = taxable <= 700000 ? tax : 0;

  return {
    grossIncome, totalDeductions: standardDeduction, taxable,
    tax: tax - rebate, cess: (tax - rebate) * 0.04,
    totalTax: (tax - rebate) + (tax - rebate) * 0.04,
    breakdown: { standardDeduction, rebate },
  };
}

function calculateHRAExemption(d) {
  if (!d.basicSalary || !d.hraReceived || !d.rentPaid) return 0;
  const metro = d.isMetro !== false;
  const a = d.hraReceived;
  const b = d.rentPaid - 0.1 * d.basicSalary;
  const c = (metro ? 0.5 : 0.4) * d.basicSalary;
  return Math.max(0, Math.min(a, b, c));
}

export function calculateLTCG(sellPrice, buyPrice, qty) {
  const totalGain = (sellPrice - buyPrice) * qty;
  const exempt = 125000;
  const taxable = Math.max(0, totalGain - exempt);
  return { totalGain, exempt: Math.min(totalGain, exempt), taxable, tax: taxable * 0.125 };
}

export function calculateSTCG(sellPrice, buyPrice, qty) {
  const totalGain = (sellPrice - buyPrice) * qty;
  return { totalGain, tax: Math.max(0, totalGain) * 0.20 };
}

/* ── Financial Health Score ── */

export function calculateHealthScore({ assets, liabilities, settings, goals, insurance, budget }) {
  const totalAssets = assets.reduce((s, a) => s + getAssetValue(a), 0);
  const totalDebt = liabilities.reduce((s, l) => s + Number(l.remainingAmount || 0), 0);
  const totalEMI = liabilities.reduce((s, l) => s + Number(l.emi || 0), 0);
  const monthlyIncome = Number(settings?.monthlyIncome) || 0;

  const components = {};

  // 1. Emergency Fund (liquid assets >= 6 months expenses)
  const liquidTypes = ['Fixed Income', 'PPF'];
  const liquidAssets = assets.filter(a => liquidTypes.includes(a.type)).reduce((s, a) => s + getAssetValue(a), 0);
  const monthlyExpense = monthlyIncome > 0 ? monthlyIncome * 0.6 : 50000;
  const emergencyMonths = monthlyExpense > 0 ? liquidAssets / monthlyExpense : 0;
  components.emergencyFund = { score: Math.min(10, Math.round(emergencyMonths / 6 * 10)), months: emergencyMonths.toFixed(1), tip: emergencyMonths < 6 ? `Build ${(6 - emergencyMonths).toFixed(1)} more months of emergency reserves` : 'Healthy emergency buffer' };

  // 2. Debt-to-Income
  const dti = monthlyIncome > 0 ? (totalEMI / monthlyIncome) * 100 : (totalDebt > 0 ? 0 : 10);
  const dtiScore = dti === 0 ? 10 : dti <= 20 ? 9 : dti <= 30 ? 7 : dti <= 40 ? 5 : dti <= 50 ? 3 : 1;
  components.debtRatio = { score: typeof dtiScore === 'number' ? dtiScore : 5, pct: dti.toFixed(0), tip: dti > 40 ? 'Debt-to-income is high — prioritize repayment' : 'Debt levels are manageable' };

  // 3. Diversification
  const typeCounts = {};
  assets.forEach(a => { typeCounts[a.type] = (typeCounts[a.type] || 0) + getAssetValue(a); });
  const typeValues = Object.values(typeCounts);
  const maxConc = typeValues.length > 0 ? Math.max(...typeValues) / totalAssets * 100 : 100;
  const diversScore = typeValues.length >= 5 && maxConc < 40 ? 10 : typeValues.length >= 4 && maxConc < 50 ? 8 : typeValues.length >= 3 ? 6 : typeValues.length >= 2 ? 4 : 2;
  components.diversification = { score: totalAssets > 0 ? diversScore : 0, types: typeValues.length, maxConc: maxConc.toFixed(0), tip: maxConc > 50 ? `${maxConc.toFixed(0)}% concentrated in one class — diversify` : 'Good diversification across classes' };

  // 4. Insurance adequacy
  const termCover = (insurance || []).filter(i => i.type === 'term').reduce((s, i) => s + Number(i.coverAmount || 0), 0);
  const healthCover = (insurance || []).filter(i => i.type === 'health').reduce((s, i) => s + Number(i.coverAmount || 0), 0);
  const idealTerm = monthlyIncome > 0 ? monthlyIncome * 12 * 10 : 10000000;
  const termRatio = idealTerm > 0 ? termCover / idealTerm : 0;
  const healthAdequate = healthCover >= 500000;
  const insScore = Math.min(10, Math.round((termRatio * 6) + (healthAdequate ? 4 : healthCover > 0 ? 2 : 0)));
  components.insurance = { score: insScore, termCover, healthCover, tip: termRatio < 0.5 ? 'Term life cover is inadequate — consider increasing' : healthCover < 500000 ? 'Health cover below ₹5L — consider top-up' : 'Insurance coverage is adequate' };

  // 5. Savings Rate
  const budgetExpenses = (budget?.expenses || []).reduce((s, e) => s + Number(e.amount || 0), 0);
  const savingsRate = monthlyIncome > 0 && budgetExpenses > 0 ? ((monthlyIncome - budgetExpenses / Math.max(1, Math.ceil((Date.now() - new Date(new Date().getFullYear(), 0, 1)) / (30 * 86400000)))) / monthlyIncome * 100) : (monthlyIncome > 0 ? 50 : 0);
  const savScore = savingsRate >= 30 ? 10 : savingsRate >= 20 ? 8 : savingsRate >= 10 ? 5 : savingsRate > 0 ? 3 : 0;
  components.savingsRate = { score: savScore, pct: Math.max(0, savingsRate).toFixed(0), tip: savingsRate < 20 ? 'Aim to save at least 20% of income' : 'Healthy savings rate' };

  // 6. Goal Progress
  const goalCount = (goals || []).length;
  let goalScore = 0;
  if (goalCount > 0) {
    const progresses = goals.map(g => {
      const current = Number(g.currentAmount || 0);
      const target = Number(g.targetAmount || 1);
      return Math.min(1, current / target);
    });
    const avgProgress = progresses.reduce((s, p) => s + p, 0) / goalCount;
    goalScore = Math.round(avgProgress * 10);
  } else {
    goalScore = 3;
  }
  components.goalProgress = { score: goalScore, count: goalCount, tip: goalCount === 0 ? 'Set financial goals to track progress' : 'On track with financial goals' };

  const overall = Math.round(
    Object.values(components).reduce((s, c) => s + c.score, 0) / Object.keys(components).length * 10
  );

  return { overall: Math.min(100, overall), components };
}
