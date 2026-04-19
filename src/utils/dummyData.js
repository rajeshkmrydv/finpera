import { v4 as uuidv4 } from 'uuid';

export const UNIT_BASED_TYPES = ['Equity', 'Mutual Fund', 'Crypto', 'Commodity'];

export const ASSET_TYPES = ['Equity', 'Mutual Fund', 'Crypto', 'Fixed Income', 'NPS', 'PPF', 'PF', 'Commodity'];

export const initialAssets = [
  { id: uuidv4(), type: 'Equity', name: 'Tata Motors Ltd', symbol: 'TATAMOTORS.NS', qty: 100, currentPrice: 2500, value: 250000, category: 'Stock' },
  { id: uuidv4(), type: 'Equity', name: 'Nippon India ETF Nifty BeES', symbol: 'NIFTYBEES.NS', qty: 600, currentPrice: 250, value: 150000, category: 'ETF' },
  { id: uuidv4(), type: 'Mutual Fund', name: 'Parag Parikh Flexi Cap Fund - Direct Plan', symbol: '0P0001BAQ0.BO', qty: 4000, currentPrice: 75, value: 300000, category: 'MF' },
  { id: uuidv4(), type: 'Fixed Income', name: 'SBI Fixed Deposit', value: 100000, category: 'FD' },
  { id: uuidv4(), type: 'NPS', name: 'NPS Tier 1 - Aggressive', value: 180000, category: 'NPS' },
  { id: uuidv4(), type: 'PPF', name: 'PPF - SBI Account', value: 250000, category: 'PPF' },
  { id: uuidv4(), type: 'PF', name: 'EPF - Current Employer', value: 420000, category: 'PF' },
  { id: uuidv4(), type: 'Crypto', name: 'Bitcoin', symbol: 'BTC-INR', qty: 0.05, currentPrice: 7200000, value: 360000, category: 'Crypto' },
  { id: uuidv4(), type: 'Crypto', name: 'Ethereum', symbol: 'ETH-INR', qty: 1.5, currentPrice: 145000, value: 217500, category: 'Crypto' },
  { id: uuidv4(), type: 'Commodity', name: 'Gold 22K', symbol: 'GOLD22K', qty: 10, currentPrice: 13159, value: 131590, category: 'Gold' },
  { id: uuidv4(), type: 'Commodity', name: 'Silver', symbol: 'SILVER_GRAM', qty: 500, currentPrice: 240, value: 120000, category: 'Silver' },
];

export const initialLiabilities = [
  { id: uuidv4(), name: 'Home Loan (SBI)', totalAmount: 2500000, remainingAmount: 2000000, emi: 22000, interestRate: 8.5 },
  { id: uuidv4(), name: 'Car Loan (HDFC)', totalAmount: 800000, remainingAmount: 350000, emi: 15000, interestRate: 9.0 },
];
