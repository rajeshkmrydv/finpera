import React, { useState, useMemo, useCallback } from 'react';
import { useFinpera } from '../context/FinperaContext';
import { UNIT_BASED_TYPES, ASSET_TYPES } from '../utils/dummyData';
import { fetchCurrentPrice } from '../utils/priceService';
import AssetSearch from '../components/AssetSearch';
import DailyChangeBadge from '../components/DailyChange';
import { Plus, Trash2, Pencil, X, Search, Filter, RefreshCw, Loader, AlertTriangle } from 'lucide-react';

const COMMODITY_PRESETS = [
  { label: 'Gold 22K', symbol: 'GOLD22K', category: 'Gold' },
  { label: 'Silver', symbol: 'SILVER_GRAM', category: 'Silver' },
];

const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
const formatPrice = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
const formatQty = (val) => new Intl.NumberFormat('en-IN').format(val);

const Assets = () => {
  const { assets, addAsset, updateAsset, deleteAsset, getAssetValue, getAssetDailyChange, refreshPrices, refreshing, lastRefreshed } = useFinpera();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', type: 'Equity', qty: '', currentPrice: '', value: '', category: '', symbol: '' });
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [refreshResult, setRefreshResult] = useState(null);
  const [fetchingCommodityPrice, setFetchingCommodityPrice] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const isUnitBased = (type) => UNIT_BASED_TYPES.includes(type);

  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      const matchesSearch = !search || a.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === 'All' || a.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [assets, search, filterType]);

  const totalFiltered = filteredAssets.reduce((sum, a) => sum + getAssetValue(a), 0);

  const fetchCommodityLivePrice = useCallback(async (symbol) => {
    if (!symbol) return;
    setFetchingCommodityPrice(true);
    try {
      const price = await fetchCurrentPrice({ symbol });
      if (price && price > 0) {
        setFormData(prev => ({ ...prev, currentPrice: String(price) }));
      }
    } catch { /* ignore */ }
    setFetchingCommodityPrice(false);
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ name: '', type: 'Equity', qty: '', currentPrice: '', value: '', category: '', symbol: '' });
    setShowModal(true);
  };

  const openEditModal = (asset) => {
    setEditingId(asset.id);
    setFormData({
      name: asset.name,
      type: asset.type,
      qty: asset.qty != null ? String(asset.qty) : '',
      currentPrice: asset.currentPrice != null ? String(asset.currentPrice) : '',
      value: String(getAssetValue(asset)),
      category: asset.category || '',
      symbol: asset.symbol || '',
    });
    setShowModal(true);
  };

  const handleSearchSelect = (result) => {
    setFormData(prev => ({
      ...prev,
      name: result.name || prev.name,
      symbol: result.symbol || '',
      currentPrice: result.currentPrice != null ? String(result.currentPrice) : prev.currentPrice,
    }));
  };

  const handleCommoditySelect = (presetSymbol) => {
    const preset = COMMODITY_PRESETS.find(p => p.symbol === presetSymbol);
    if (!preset) return;
    setFormData(prev => ({
      ...prev,
      name: preset.label,
      symbol: preset.symbol,
      category: preset.category,
      currentPrice: '',
    }));
    fetchCommodityLivePrice(preset.symbol);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const unitBased = isUnitBased(formData.type);
    const payload = {
      name: formData.name,
      type: formData.type,
      category: formData.category || formData.type,
      symbol: formData.symbol || null,
    };

    if (unitBased) {
      payload.qty = Number(formData.qty);
      payload.currentPrice = Number(formData.currentPrice);
      payload.value = payload.qty * payload.currentPrice;
    } else {
      payload.qty = null;
      payload.currentPrice = null;
      payload.value = Number(formData.value);
    }

    if (editingId) {
      updateAsset(editingId, payload);
    } else {
      addAsset(payload);
    }
    setShowModal(false);
    setEditingId(null);
  };

  const computedModalValue = isUnitBased(formData.type) && formData.qty && formData.currentPrice
    ? Number(formData.qty) * Number(formData.currentPrice)
    : 0;

  const handleRefresh = useCallback(async () => {
    setRefreshResult(null);
    const result = await refreshPrices();
    setRefreshResult(result);
    setTimeout(() => setRefreshResult(null), 5000);
  }, [refreshPrices]);

  const handleDeleteConfirm = () => {
    if (confirmDelete) {
      deleteAsset(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  const typeCounts = useMemo(() => {
    const counts = { All: assets.length };
    assets.forEach(a => { counts[a.type] = (counts[a.type] || 0) + 1; });
    return counts;
  }, [assets]);

  const getBadgeClass = (type) => {
    switch (type) {
      case 'Equity': return 'badge-info';
      case 'Mutual Fund': return 'badge-success';
      case 'Fixed Income': return 'badge-warning';
      case 'NPS': return 'badge-purple';
      case 'PPF': return 'badge-teal';
      case 'PF': return 'badge-orange';
      case 'Crypto': return 'badge-cyan';
      case 'Commodity': return 'badge-neutral';
      default: return 'badge-info';
    }
  };

  const refreshableCount = assets.filter(a => UNIT_BASED_TYPES.includes(a.type) && a.symbol).length;
  const isCommodity = formData.type === 'Commodity';

  return (
    <div>
      <div className="flex justify-between items-center mb-6" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Assets Library</h1>
          <p>Manage all your investments across asset classes.</p>
        </div>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          {refreshableCount > 0 && (
            <button className="btn btn-secondary" onClick={handleRefresh} disabled={refreshing} title="Refresh all live prices">
              {refreshing ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={16} />}
              {refreshing ? 'Refreshing...' : 'Refresh Prices'}
            </button>
          )}
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={18} /> Add Asset
          </button>
        </div>
      </div>

      {refreshResult && (
        <div className={`status-message ${refreshResult.failed > 0 && refreshResult.updated === 0 ? 'error' : 'success'} mb-4`}>
          <span>
            {refreshResult.updated > 0 && `Updated ${refreshResult.updated} price${refreshResult.updated > 1 ? 's' : ''}.`}
            {refreshResult.failed > 0 && ` ${refreshResult.failed} failed to fetch.`}
          </span>
          <button className="btn-ghost btn-sm ml-auto" onClick={() => setRefreshResult(null)} aria-label="Dismiss"><X size={14} /></button>
        </div>
      )}

      {lastRefreshed && (
        <p className="text-xs text-muted mb-3" style={{ textAlign: 'right' }}>
          Last refreshed: {new Date(lastRefreshed).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      )}

      {/* Filters */}
      <div className="glass-panel no-hover mb-4" style={{ padding: '0.75rem 1rem' }}>
        <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
          <div className="flex items-center gap-2 flex-1" style={{ minWidth: '180px', maxWidth: '320px' }}>
            <Search size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            <input
              className="form-control"
              style={{ border: 'none', background: 'transparent', padding: '0.4rem 0', boxShadow: 'none' }}
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search assets"
            />
          </div>
          <div className="flex gap-1 flex-wrap ml-auto">
            {['All', ...ASSET_TYPES].map(type => (
              <button
                key={type}
                className={`btn btn-sm ${filterType === type ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilterType(type)}
                style={filterType === type ? {} : { background: 'transparent', border: 'none' }}
              >
                {type} {typeCounts[type] ? `(${typeCounts[type]})` : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel no-hover animate-slideUp">
        {filteredAssets.length > 0 && (
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-muted">{filteredAssets.length} asset{filteredAssets.length > 1 ? 's' : ''}</p>
            <p className="text-sm font-medium">Total: {formatCurrency(totalFiltered)}</p>
          </div>
        )}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Asset Name</th>
                <th>Type</th>
                <th>Category</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Current Price</th>
                <th className="text-right">Daily Change</th>
                <th className="text-right">Total Value</th>
                <th className="text-right" style={{ width: '90px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map(asset => {
                const ub = isUnitBased(asset.type);
                const hasLiveLink = !!asset.symbol;
                return (
                  <tr key={asset.id}>
                    <td>
                      <span className="font-medium text-strong">{asset.name}</span>
                      {hasLiveLink && asset.type !== 'Commodity' && (
                        <span className="text-xs text-muted" style={{ display: 'block', marginTop: '1px' }}>
                          {asset.symbol}
                        </span>
                      )}
                    </td>
                    <td><span className={`badge ${getBadgeClass(asset.type)}`}>{asset.type}</span></td>
                    <td className="text-muted">{asset.category}</td>
                    <td className="text-right">
                      {ub && asset.qty != null
                        ? <>{formatQty(asset.qty)}{asset.type === 'Commodity' ? <span className="text-xs text-muted"> g</span> : null}</>
                        : <span className="text-muted">&mdash;</span>}
                    </td>
                    <td className="text-right">
                      {ub && asset.currentPrice != null
                        ? <>{formatPrice(asset.currentPrice)}{asset.type === 'Commodity' ? <span className="text-xs text-muted">/g</span> : null}</>
                        : <span className="text-muted">&mdash;</span>}
                    </td>
                    <td className="text-right">
                      {(() => {
                        if (!ub || !asset.symbol) return <span className="text-muted">&mdash;</span>;
                        if (refreshing) return <Loader size={13} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-tertiary)' }} />;
                        const dc = getAssetDailyChange(asset);
                        return dc ? (
                          <DailyChangeBadge
                            changePercent={dc.changePercent}
                            change={dc.change}
                            valueChange={dc.valueChange}
                            showValueChange
                            size="sm"
                          />
                        ) : (
                          <span className="text-muted text-xs">—</span>
                        );
                      })()}
                    </td>
                    <td className="text-right text-strong font-medium">{formatCurrency(getAssetValue(asset))}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button className="btn-ghost btn-icon" onClick={() => openEditModal(asset)} title="Edit" aria-label={`Edit ${asset.name}`}>
                          <Pencil size={15} style={{ color: 'var(--accent-primary)' }} />
                        </button>
                        <button className="btn-ghost btn-icon" onClick={() => setConfirmDelete(asset)} title="Delete" aria-label={`Delete ${asset.name}`}>
                          <Trash2 size={15} style={{ color: 'var(--danger)' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredAssets.length === 0 && (
                <tr>
                  <td colSpan="8">
                    <div className="empty-state">
                      <div className="empty-state-icon"><Filter size={24} /></div>
                      <p className="text-muted">
                        {assets.length === 0 ? "No assets yet. Click 'Add Asset' to start." : 'No assets match your filters.'}
                      </p>
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
            <h3 style={{ marginBottom: '0.5rem' }}>Delete Asset?</h3>
            <p className="text-sm text-muted" style={{ marginBottom: '1.5rem' }}>
              <strong>{confirmDelete.name}</strong> ({formatCurrency(getAssetValue(confirmDelete))}) will be permanently removed.
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
              <h2>{editingId ? 'Edit Asset' : 'Add New Asset'}</h2>
              <button className="btn-ghost btn-icon" onClick={() => setShowModal(false)} aria-label="Close modal">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Asset Type</label>
                <select className="form-control" value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value, symbol: '', name: '', currentPrice: '', category: '' })}>
                  {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {isCommodity ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Select Commodity</label>
                    <select
                      className="form-control"
                      value={formData.symbol}
                      onChange={(e) => handleCommoditySelect(e.target.value)}
                    >
                      <option value="">-- Choose --</option>
                      {COMMODITY_PRESETS.map(p => (
                        <option key={p.symbol} value={p.symbol}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Weight (grams)</label>
                      <input className="form-control" type="number" step="any" required value={formData.qty}
                        onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                        placeholder="e.g. 10" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Price / gram (INR)
                        {fetchingCommodityPrice && (
                          <span style={{ color: 'var(--info)', fontWeight: 400, marginLeft: '0.3rem' }}>
                            <Loader size={12} style={{ display: 'inline', animation: 'spin 1s linear infinite', verticalAlign: 'middle' }} /> fetching...
                          </span>
                        )}
                        {!fetchingCommodityPrice && formData.currentPrice && formData.symbol && (
                          <span style={{ color: 'var(--success)', fontWeight: 400, marginLeft: '0.3rem' }}>(live)</span>
                        )}
                      </label>
                      <input className="form-control" type="number" step="any" required value={formData.currentPrice}
                        readOnly={fetchingCommodityPrice}
                        onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
                        placeholder={fetchingCommodityPrice ? 'Fetching live price...' : 'Auto-filled from GoldPriceZ'} />
                    </div>
                  </div>

                  {computedModalValue > 0 && (
                    <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-md)', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted">Total Value</span>
                        <span className="font-bold text-lg">{formatCurrency(computedModalValue)}</span>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
                    Live price via GoldPriceZ. You can override the price manually if needed.
                  </p>
                </>
              ) : isUnitBased(formData.type) ? (
                <>
                  <div className="form-group">
                    <label className="form-label">
                      {formData.type === 'Mutual Fund' ? 'Search Mutual Fund' : formData.type === 'Crypto' ? 'Search Cryptocurrency' : 'Search Stock / ETF'}
                    </label>
                    <AssetSearch
                      type={formData.type}
                      value={formData.name}
                      onSelect={handleSearchSelect}
                    />
                    <p className="text-xs text-muted mt-1">
                      Search to auto-fill current price, or type a name manually.
                    </p>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input className="form-control" type="text" value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder={formData.type === 'Mutual Fund' ? 'e.g. MF, ELSS' : formData.type === 'Crypto' ? 'e.g. BTC, ETH' : 'e.g. Stock, ETF'} />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Quantity / Units</label>
                      <input className="form-control" type="number" step="any" required value={formData.qty}
                        onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                        placeholder="e.g. 100" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        {formData.type === 'Mutual Fund' ? 'NAV (INR)' : formData.type === 'Crypto' ? 'Price (INR)' : 'Current Price (INR)'}
                        {formData.currentPrice && formData.symbol && (
                          <span style={{ color: 'var(--success)', fontWeight: 400, marginLeft: '0.3rem' }}>(live)</span>
                        )}
                      </label>
                      <input className="form-control" type="number" step="any" required value={formData.currentPrice}
                        onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
                        placeholder="Auto-filled or enter manually" />
                    </div>
                  </div>

                  {computedModalValue > 0 && (
                    <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-md)', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted">Total Value</span>
                        <span className="font-bold text-lg">{formatCurrency(computedModalValue)}</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">Asset Name</label>
                    <input className="form-control" type="text" required value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. SBI Fixed Deposit" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input className="form-control" type="text" value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g. FD, Gold" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Value (INR)</label>
                    <input className="form-control" type="number" step="any" required value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      placeholder="e.g. 100000" />
                  </div>
                </>
              )}

              <div className="flex gap-2 justify-end mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Update Asset' : 'Save Asset'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assets;
