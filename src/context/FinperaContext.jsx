import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { initialAssets, initialLiabilities, UNIT_BASED_TYPES } from '../utils/dummyData';
import { fetchCurrentPrice } from '../utils/priceService';

const FinperaContext = createContext();

export const useFinpera = () => useContext(FinperaContext);

const getAssetValue = (asset) => {
  if (UNIT_BASED_TYPES.includes(asset.type) && asset.qty && asset.currentPrice) {
    return asset.qty * asset.currentPrice;
  }
  return Number(asset.value || 0);
};

export const FinperaProvider = ({ children }) => {
  const [assets, setAssets] = useState(() => {
    const saved = localStorage.getItem('finpera_assets');
    return saved ? JSON.parse(saved) : initialAssets;
  });

  const [liabilities, setLiabilities] = useState(() => {
    const saved = localStorage.getItem('finpera_liabilities');
    return saved ? JSON.parse(saved) : initialLiabilities;
  });

  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(() => {
    return localStorage.getItem('finpera_last_refreshed') || null;
  });

  useEffect(() => {
    localStorage.setItem('finpera_assets', JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem('finpera_liabilities', JSON.stringify(liabilities));
  }, [liabilities]);

  const addAsset = (asset) => setAssets(prev => [...prev, { ...asset, id: crypto.randomUUID() }]);
  const updateAsset = (id, updated) => setAssets(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a));
  const deleteAsset = (id) => setAssets(prev => prev.filter(a => a.id !== id));

  const addLiability = (liability) => setLiabilities(prev => [...prev, { ...liability, id: crypto.randomUUID() }]);
  const updateLiability = (id, updated) => setLiabilities(prev => prev.map(l => l.id === id ? { ...l, ...updated } : l));
  const deleteLiability = (id) => setLiabilities(prev => prev.filter(l => l.id !== id));

  const importTransactions = (newAssets) => {
    setAssets(prev => [...prev, ...newAssets.map(a => ({ ...a, id: crypto.randomUUID() }))]);
  };

  const refreshPrices = useCallback(async () => {
    const refreshable = assets.filter(a =>
      UNIT_BASED_TYPES.includes(a.type) && a.symbol
    );
    if (refreshable.length === 0) return { updated: 0, failed: 0 };

    setRefreshing(true);
    let updated = 0;
    let failed = 0;

    const updatedAssets = [...assets];

    for (const asset of refreshable) {
      try {
        const price = await fetchCurrentPrice(asset);
        if (price && price > 0) {
          const idx = updatedAssets.findIndex(a => a.id === asset.id);
          if (idx !== -1) {
            updatedAssets[idx] = {
              ...updatedAssets[idx],
              currentPrice: price,
              value: updatedAssets[idx].qty * price,
            };
            updated++;
          }
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    setAssets(updatedAssets);
    const now = new Date().toISOString();
    setLastRefreshed(now);
    localStorage.setItem('finpera_last_refreshed', now);
    setRefreshing(false);

    return { updated, failed };
  }, [assets]);

  const totalAssetsValue = assets.reduce((sum, a) => sum + getAssetValue(a), 0);
  const totalLiabilitiesValue = liabilities.reduce((sum, l) => sum + Number(l.remainingAmount || 0), 0);
  const totalMonthlyEMI = liabilities.reduce((sum, l) => sum + Number(l.emi || 0), 0);
  const netWorth = totalAssetsValue - totalLiabilitiesValue;

  return (
    <FinperaContext.Provider value={{
      assets, addAsset, updateAsset, deleteAsset,
      liabilities, addLiability, updateLiability, deleteLiability,
      importTransactions, getAssetValue,
      refreshPrices, refreshing, lastRefreshed,
      totalAssetsValue, totalLiabilitiesValue, netWorth, totalMonthlyEMI
    }}>
      {children}
    </FinperaContext.Provider>
  );
};
