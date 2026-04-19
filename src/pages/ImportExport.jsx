import React, { useState, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import {
  UploadCloud, FileSpreadsheet, PenLine, Plus,
  CheckCircle, AlertTriangle, ArrowRight, X, Download, Loader,
  HardDriveDownload, FileDown, Wallet, CreditCard
} from 'lucide-react';
import { useFinpera } from '../context/FinperaContext';
import { UNIT_BASED_TYPES, ASSET_TYPES } from '../utils/dummyData';
import AssetSearch from '../components/AssetSearch';

const isUnitBased = (type) => UNIT_BASED_TYPES.includes(type);

const emptyRow = () => ({ name: '', type: 'Equity', qty: '', currentPrice: '', value: '', category: '', symbol: '' });

const ImportExport = () => {
  const { importTransactions, assets, liabilities, getAssetValue } = useFinpera();
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('csv');
  const [mode, setMode] = useState('import'); // 'import' | 'export'
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const [dragging, setDragging] = useState(false);

  const [parsedRows, setParsedRows] = useState([]);
  const [step, setStep] = useState('upload');

  const [manualRows, setManualRows] = useState([emptyRow(), emptyRow(), emptyRow()]);

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const normalizeType = (typeRaw) => {
    const t = String(typeRaw).toLowerCase();
    if (t.includes('eq') || t.includes('stock') || t.includes('etf')) return 'Equity';
    if (t.includes('mf') || t.includes('mutual')) return 'Mutual Fund';
    if (t === 'nps') return 'NPS';
    if (t === 'ppf') return 'PPF';
    if (t === 'pf' || t === 'epf') return 'PF';
    if (t.includes('crypto') || t.includes('bitcoin') || t.includes('btc') || t.includes('ethereum') || t.includes('eth')) return 'Crypto';
    if (t.includes('gold') || t.includes('silver')) return 'Commodity';
    if (t.includes('fd') || t.includes('fixed')) return 'Fixed Income';
    return 'Equity';
  };

  const processCSV = (data) => {
    const imported = [];
    data.forEach(row => {
      const name = row['Name'] || row['Instrument'] || row['Fund Name'] || row['Stock'] || row['name'] || '';
      const typeStr = row['Type'] || row['Asset Class'] || row['type'] || 'Equity';
      const catStr = row['Category'] || row['category'] || '';
      const type = normalizeType(typeStr);
      const symbolStr = row['Symbol'] || row['symbol'] || row['Ticker'] || '';

      const qtyStr = row['Qty'] || row['Quantity'] || row['Units'] || row['qty'] || '';
      const priceStr = row['Current Price'] || row['Price'] || row['NAV'] || row['LTP'] || row['price'] || '';
      const valueStr = row['Value'] || row['Current Value'] || row['Amount'] || row['value'] || '';

      const qty = qtyStr ? parseFloat(String(qtyStr).replace(/,/g, '')) : null;
      const currentPrice = priceStr ? parseFloat(String(priceStr).replace(/,/g, '').replace(/₹/g, '')) : null;

      if (name && isUnitBased(type) && qty && currentPrice) {
        imported.push({ name, type, category: catStr || 'Imported', qty, currentPrice, value: qty * currentPrice, symbol: symbolStr || null });
      } else if (name && valueStr) {
        const cleanValue = String(valueStr).replace(/,/g, '').replace(/₹/g, '').trim();
        const numValue = parseFloat(cleanValue);
        if (!isNaN(numValue)) {
          const entry = { name, type, category: catStr || 'Imported', value: numValue, symbol: symbolStr || null };
          if (isUnitBased(type) && qty) {
            entry.qty = qty;
            entry.currentPrice = numValue / qty;
          }
          imported.push(entry);
        }
      }
    });
    return imported;
  };

  const handleFileParse = useCallback((file) => {
    if (!file || !file.name.endsWith('.csv')) {
      setStatus({ state: 'error', message: 'Please upload a valid CSV file.' });
      return;
    }
    setStatus({ state: 'loading', message: 'Parsing CSV file...' });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const data = processCSV(results.data);
          if (data.length === 0) {
            setStatus({ state: 'error', message: 'No valid assets found. Check CSV format.' });
            return;
          }
          setParsedRows(data);
          setStep('preview');
          setStatus({ state: 'idle', message: '' });
        } catch {
          setStatus({ state: 'error', message: 'Failed to process the CSV file format.' });
        }
      },
      error: (error) => {
        setStatus({ state: 'error', message: `Parse error: ${error.message}` });
      }
    });
  }, []);

  const handleFileUpload = (e) => {
    handleFileParse(e.target.files[0]);
    e.target.value = '';
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFileParse(e.dataTransfer.files[0]);
  }, [handleFileParse]);

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  const updateParsedRow = (idx, field, val) => {
    setParsedRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const updated = { ...r, [field]: val };
      if (isUnitBased(updated.type) && (field === 'qty' || field === 'currentPrice' || field === 'type')) {
        const q = Number(updated.qty) || 0;
        const p = Number(updated.currentPrice) || 0;
        updated.value = q * p;
      }
      if (field === 'type' && !isUnitBased(val)) {
        updated.qty = null;
        updated.currentPrice = null;
      }
      return updated;
    }));
  };

  const removeParsedRow = (idx) => setParsedRows(prev => prev.filter((_, i) => i !== idx));

  const getRowValue = (row) => {
    if (isUnitBased(row.type) && row.qty && row.currentPrice) {
      return Number(row.qty) * Number(row.currentPrice);
    }
    return Number(row.value) || 0;
  };

  const isRowValid = (row) => row.name && row.name.trim() && getRowValue(row) > 0;

  const confirmImport = (rows) => {
    const valid = rows.filter(isRowValid).map(r => {
      const entry = { name: r.name, type: r.type, category: r.category || r.type, value: getRowValue(r), symbol: r.symbol || null };
      if (isUnitBased(r.type) && r.qty && r.currentPrice) {
        entry.qty = Number(r.qty);
        entry.currentPrice = Number(r.currentPrice);
      }
      return entry;
    });
    if (valid.length === 0) {
      setStatus({ state: 'error', message: 'No valid rows to import.' });
      return;
    }
    importTransactions(valid);
    setStatus({ state: 'success', message: `Successfully imported ${valid.length} investment${valid.length > 1 ? 's' : ''}!` });
    setStep('done');
    setParsedRows([]);
    setManualRows([emptyRow(), emptyRow(), emptyRow()]);
  };

  const handleManualSearchSelect = (idx, result) => {
    setManualRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      return {
        ...r,
        name: result.name || r.name,
        symbol: result.symbol || '',
        currentPrice: result.currentPrice != null ? String(result.currentPrice) : r.currentPrice,
      };
    }));
  };

  const updateManualRow = (idx, field, val) => {
    setManualRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const updated = { ...r, [field]: val };
      if (isUnitBased(updated.type) && (field === 'qty' || field === 'currentPrice')) {
        const q = Number(updated.qty) || 0;
        const p = Number(updated.currentPrice) || 0;
        updated.value = q * p > 0 ? String(q * p) : '';
      }
      if (field === 'type' && !isUnitBased(val)) {
        updated.qty = '';
        updated.currentPrice = '';
        updated.symbol = '';
      }
      if (field === 'type' && isUnitBased(val)) {
        updated.value = '';
      }
      return updated;
    }));
  };

  const addManualRow = () => setManualRows(prev => [...prev, emptyRow()]);

  const removeManualRow = (idx) => {
    if (manualRows.length <= 1) return;
    setManualRows(prev => prev.filter((_, i) => i !== idx));
  };

  const handleManualImport = () => {
    const rows = manualRows.map(r => ({
      ...r,
      qty: r.qty ? Number(r.qty) : null,
      currentPrice: r.currentPrice ? Number(r.currentPrice) : null,
      value: getRowValue({ ...r, qty: r.qty ? Number(r.qty) : null, currentPrice: r.currentPrice ? Number(r.currentPrice) : null, value: Number(r.value) || 0 }),
    }));
    confirmImport(rows);
  };

  const resetFlow = () => {
    setStep('upload');
    setParsedRows([]);
    setStatus({ state: 'idle', message: '' });
  };

  const downloadSampleCSV = () => {
    const csv = 'Name,Type,Category,Symbol,Qty,Current Price,Value\nReliance Industries,Equity,Stock,RELIANCE.NS,50,2800,140000\nHDFC Small Cap,Mutual Fund,MF,,2000,75,150000\nBitcoin,Crypto,Crypto,BTC-INR,0.05,7200000,360000\nEthereum,Crypto,Crypto,ETH-INR,1.5,145000,217500\nGold 22K,Commodity,Gold,GOLD22K,10,6800,68000\nSilver,Commodity,Silver,SILVER_GRAM,500,95,47500\nSBI FD,Fixed Income,FD,,,,500000\nNPS Tier 1,NPS,NPS,,,,180000\nPPF - SBI,PPF,PPF,,,,250000\nEPF Balance,PF,PF,,,,420000';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_investments.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrencyPlain = (val) => Number(val || 0).toFixed(2);

  const downloadFile = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAssets = () => {
    const headers = ['Name', 'Type', 'Category', 'Symbol', 'Qty', 'Current Price', 'Total Value'];
    const rows = assets.map(a => [
      a.name,
      a.type,
      a.category || '',
      a.symbol || '',
      a.qty != null ? a.qty : '',
      a.currentPrice != null ? formatCurrencyPlain(a.currentPrice) : '',
      formatCurrencyPlain(getAssetValue(a)),
    ]);
    const csv = [headers, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(csv, `finpera_assets_${date}.csv`);
  };

  const exportLiabilities = () => {
    const headers = ['Loan Name', 'Total Amount', 'Remaining Amount', 'Monthly EMI', 'Interest Rate (%)'];
    const rows = liabilities.map(l => [
      l.name,
      formatCurrencyPlain(l.totalAmount),
      formatCurrencyPlain(l.remainingAmount),
      formatCurrencyPlain(l.emi),
      l.interestRate,
    ]);
    const csv = [headers, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(csv, `finpera_liabilities_${date}.csv`);
  };

  const exportAll = () => {
    exportAssets();
    setTimeout(() => exportLiabilities(), 300);
  };

  const totalAssetsExport = assets.reduce((s, a) => s + getAssetValue(a), 0);
  const totalLiabilitiesExport = liabilities.reduce((s, l) => s + Number(l.remainingAmount || 0), 0);

  const renderCsvEditRow = (row, idx) => {
    const ub = isUnitBased(row.type);
    return (
      <tr key={idx}>
        <td><span className="row-number">{idx + 1}</span></td>
        <td>
          <input className="inline-input" value={row.name} onChange={(e) => updateParsedRow(idx, 'name', e.target.value)} placeholder="Asset name" />
        </td>
        <td>
          <select className="inline-select" value={row.type} onChange={(e) => updateParsedRow(idx, 'type', e.target.value)}>
            {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </td>
        <td>
          {ub ? (
            <input className="inline-input" type="number" step="any" value={row.qty || ''} onChange={(e) => updateParsedRow(idx, 'qty', e.target.value)} placeholder="Qty" style={{ textAlign: 'right' }} />
          ) : (
            <span className="text-muted text-center" style={{ display: 'block' }}>&mdash;</span>
          )}
        </td>
        <td>
          {ub ? (
            <input className="inline-input" type="number" step="any" value={row.currentPrice || ''} onChange={(e) => updateParsedRow(idx, 'currentPrice', e.target.value)} placeholder="Price" style={{ textAlign: 'right' }} />
          ) : (
            <span className="text-muted text-center" style={{ display: 'block' }}>&mdash;</span>
          )}
        </td>
        <td>
          {ub ? (
            <span className="text-strong font-medium text-sm" style={{ display: 'block', textAlign: 'right', padding: '0.5rem 0.6rem' }}>
              {getRowValue(row) > 0 ? formatCurrency(getRowValue(row)) : '—'}
            </span>
          ) : (
            <input className="inline-input" type="number" step="any" value={row.value || ''} onChange={(e) => updateParsedRow(idx, 'value', e.target.value)} placeholder="Value" style={{ textAlign: 'right' }} />
          )}
        </td>
        <td>
          <button className="btn-ghost btn-icon" onClick={() => removeParsedRow(idx)} title="Remove">
            <X size={16} style={{ color: 'var(--danger)' }} />
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div style={{ maxWidth: '1060px', margin: '0 auto' }}>
      <div className="page-header">
        <h1>Import & Export</h1>
        <p>Import holdings or export your portfolio data as CSV backup.</p>
      </div>

      {/* Top-level mode tabs */}
      <div className="tabs mb-6">
        <button className={`tab ${mode === 'import' ? 'active' : ''}`} onClick={() => { setMode('import'); resetFlow(); }}>
          <UploadCloud size={18} /> Import
        </button>
        <button className={`tab ${mode === 'export' ? 'active' : ''}`} onClick={() => setMode('export')}>
          <HardDriveDownload size={18} /> Export / Backup
        </button>
      </div>

      {status.state !== 'idle' && status.state !== 'loading' && (
        <div className={`status-message ${status.state} mb-4`}>
          {status.state === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{status.message}</span>
          <button className="btn-ghost btn-sm ml-auto" onClick={() => setStatus({ state: 'idle', message: '' })}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── EXPORT MODE ── */}
      {mode === 'export' && (
        <div className="animate-slideUp">
          <div className="grid-2col" style={{ marginBottom: '1rem' }}>
            {/* Assets Export Card */}
            <div className="glass-panel no-hover">
              <div className="flex items-center gap-3 mb-4">
                <div className="stat-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className="font-bold">Assets</h3>
                  <p className="text-sm text-muted">{assets.length} record{assets.length !== 1 ? 's' : ''} · {formatCurrency(totalAssetsExport)}</p>
                </div>
              </div>
              <p className="text-sm text-muted mb-4">
                Exports all investments with name, type, category, symbol, qty, price, and total value.
              </p>
              <button className="btn btn-primary w-full" onClick={exportAssets} disabled={assets.length === 0}>
                <FileDown size={16} /> Download Assets CSV
              </button>
            </div>

            {/* Liabilities Export Card */}
            <div className="glass-panel no-hover">
              <div className="flex items-center gap-3 mb-4">
                <div className="stat-icon" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="font-bold">Liabilities</h3>
                  <p className="text-sm text-muted">{liabilities.length} loan{liabilities.length !== 1 ? 's' : ''} · {formatCurrency(totalLiabilitiesExport)}</p>
                </div>
              </div>
              <p className="text-sm text-muted mb-4">
                Exports all loans with name, total amount, remaining, EMI, and interest rate.
              </p>
              <button className="btn btn-primary w-full" onClick={exportLiabilities} disabled={liabilities.length === 0}>
                <FileDown size={16} /> Download Liabilities CSV
              </button>
            </div>
          </div>

          {/* Export All */}
          <div className="glass-panel no-hover">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold">Full Backup</h3>
                <p className="text-sm text-muted">Download both assets and liabilities as separate CSV files.</p>
              </div>
              <button className="btn btn-success" onClick={exportAll} disabled={assets.length === 0 && liabilities.length === 0}>
                <Download size={16} /> Export All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── IMPORT MODE ── */}
      {mode === 'import' && step !== 'preview' && (
        <div className="tabs">
          <button className={`tab ${activeTab === 'csv' ? 'active' : ''}`} onClick={() => { setActiveTab('csv'); resetFlow(); }}>
            <FileSpreadsheet size={18} /> CSV Upload
          </button>
          <button className={`tab ${activeTab === 'manual' ? 'active' : ''}`} onClick={() => { setActiveTab('manual'); resetFlow(); }}>
            <PenLine size={18} /> Manual Entry
          </button>
        </div>
      )}

      {/* CSV Upload */}
      {mode === 'import' && activeTab === 'csv' && step === 'upload' && (
        <div className="animate-slideUp">
          <div className="glass-panel no-hover">
            <div
              className={`drop-zone ${dragging ? 'dragging' : ''}`}
              onClick={() => fileInputRef.current.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="drop-zone-icon">
                {status.state === 'loading'
                  ? <Loader size={28} style={{ animation: 'pulse 1s ease infinite' }} />
                  : <UploadCloud size={28} />}
              </div>
              <h3 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>
                {status.state === 'loading' ? 'Processing...' : 'Drop your CSV file here'}
              </h3>
              <p className="text-muted text-sm" style={{ maxWidth: '400px', margin: '0 auto 1.25rem' }}>
                or click to browse. Supports Zerodha, Upstox, CAMS formats with Qty and Price columns.
              </p>
              <div className="flex justify-center gap-3">
                <span className="chip"><FileSpreadsheet size={14} /> .csv</span>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileUpload} />
            <div className="divider" />
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted">Need a template to get started?</p>
              <button className="btn btn-secondary btn-sm" onClick={downloadSampleCSV}>
                <Download size={14} /> Download Sample
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Preview */}
      {step === 'preview' && parsedRows.length > 0 && (
        <div className="animate-slideUp">
          <div className="glass-panel no-hover">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold">Review & Edit Before Import</h3>
                <p className="text-sm text-muted">{parsedRows.length} record{parsedRows.length > 1 ? 's' : ''} found.</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={resetFlow}><X size={14} /> Cancel</button>
            </div>
            <div className="step-indicator">
              <div className="step-dot done" />
              <div className="step-dot active" />
              <div className="step-dot" />
            </div>
            <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="editable-table">
                <thead>
                  <tr>
                    <th style={{ width: '36px' }}>#</th>
                    <th>Name</th>
                    <th style={{ width: '140px' }}>Type</th>
                    <th style={{ width: '90px' }} className="text-right">Qty</th>
                    <th style={{ width: '105px' }} className="text-right">Price</th>
                    <th style={{ width: '120px' }} className="text-right">Total Value</th>
                    <th style={{ width: '42px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, idx) => renderCsvEditRow(row, idx))}
                </tbody>
              </table>
            </div>
            <div className="divider" />
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted">{parsedRows.filter(isRowValid).length} valid of {parsedRows.length} rows</p>
              <div className="flex gap-2">
                <button className="btn btn-secondary" onClick={resetFlow}>Back</button>
                <button className="btn btn-success" onClick={() => confirmImport(parsedRows)}>
                  <CheckCircle size={16} /> Import {parsedRows.filter(isRowValid).length} Records
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Done */}
      {step === 'done' && (
        <div className="animate-slideUp">
          <div className="glass-panel no-hover" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'var(--success)' }}>
              <CheckCircle size={32} />
            </div>
            <h3 className="font-bold mb-2">Import Complete</h3>
            <p className="text-muted mb-6">Your investments have been added to your portfolio.</p>
            <div className="flex justify-center gap-3">
              <button className="btn btn-secondary" onClick={resetFlow}>Import More</button>
              <a href="/assets" className="btn btn-primary"><ArrowRight size={16} /> View Assets</a>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry */}
      {mode === 'import' && activeTab === 'manual' && step !== 'preview' && step !== 'done' && (
        <div className="animate-slideUp">
          <div className="glass-panel no-hover">
            <div className="mb-4">
              <h3 className="font-bold">Add Investments Manually</h3>
              <p className="text-sm text-muted">Search for a stock/MF to auto-fill prices, or enter everything manually.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {manualRows.map((row, idx) => {
                const ub = isUnitBased(row.type);
                return (
                  <div key={idx} style={{ background: 'var(--bg-primary)', borderRadius: 'var(--border-radius-md)', padding: '1rem', border: '1px solid var(--border-color)', position: 'relative' }}>
                    <div className="flex justify-between items-center mb-3">
                      <span className="badge badge-neutral">#{idx + 1}</span>
                      {manualRows.length > 1 && (
                        <button className="btn-ghost btn-icon" onClick={() => removeManualRow(idx)} title="Remove">
                          <X size={15} style={{ color: 'var(--danger)' }} />
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <label className="form-label">Type</label>
                        <select className="form-control" value={row.type} onChange={(e) => updateManualRow(idx, 'type', e.target.value)} style={{ padding: '0.55rem 0.75rem' }}>
                          {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="form-label">Category</label>
                        <input className="form-control" value={row.category || ''} onChange={(e) => updateManualRow(idx, 'category', e.target.value)} placeholder="e.g. Stock" style={{ padding: '0.55rem 0.75rem' }} />
                      </div>
                    </div>

                    {ub ? (
                      <>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label">{row.type === 'Mutual Fund' ? 'Search Mutual Fund' : row.type === 'Crypto' ? 'Search Cryptocurrency' : row.type === 'Commodity' ? 'Search Commodity' : 'Search Stock / ETF'}</label>
                          <AssetSearch
                            type={row.type}
                            value={row.name}
                            onSelect={(result) => handleManualSearchSelect(idx, result)}
                          />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                          <div>
                            <label className="form-label">{row.type === 'Commodity' ? 'Weight (g)' : 'Qty / Units'}</label>
                            <input className="form-control" type="number" step="any" value={row.qty || ''} onChange={(e) => updateManualRow(idx, 'qty', e.target.value)} placeholder={row.type === 'Commodity' ? '10' : '100'} style={{ padding: '0.55rem 0.75rem' }} />
                          </div>
                          <div>
                            <label className="form-label">
                              {row.type === 'Mutual Fund' ? 'NAV' : row.type === 'Commodity' ? 'Price/g' : 'Price'}
                              {row.currentPrice && row.symbol && (
                                <span style={{ color: 'var(--success)', fontWeight: 400 }}> (live)</span>
                              )}
                            </label>
                            <input className="form-control" type="number" step="any" value={row.currentPrice || ''} onChange={(e) => updateManualRow(idx, 'currentPrice', e.target.value)} placeholder="Auto / manual" style={{ padding: '0.55rem 0.75rem' }} />
                          </div>
                          <div>
                            <label className="form-label">Total Value</label>
                            <div className="form-control" style={{ background: 'var(--bg-tertiary)', padding: '0.55rem 0.75rem', fontWeight: 600, color: getRowValue(row) > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                              {getRowValue(row) > 0 ? formatCurrency(getRowValue(row)) : '—'}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label className="form-label">Asset Name</label>
                          <input className="form-control" value={row.name} onChange={(e) => updateManualRow(idx, 'name', e.target.value)} placeholder="e.g. SBI Fixed Deposit" style={{ padding: '0.55rem 0.75rem' }} />
                        </div>
                        <div>
                          <label className="form-label">Total Value (INR)</label>
                          <input className="form-control" type="number" step="any" value={row.value || ''} onChange={(e) => updateManualRow(idx, 'value', e.target.value)} placeholder="100000" style={{ padding: '0.55rem 0.75rem' }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-3">
              <button className="btn btn-secondary btn-sm" onClick={addManualRow}>
                <Plus size={14} /> Add Another
              </button>
            </div>

            <div className="divider" />

            <div className="flex justify-between items-center">
              <p className="text-sm text-muted">
                {manualRows.filter(r => r.name && r.name.trim() && getRowValue({ ...r, qty: r.qty ? Number(r.qty) : null, currentPrice: r.currentPrice ? Number(r.currentPrice) : null, value: Number(r.value) || 0 }) > 0).length} valid of {manualRows.length} entries
              </p>
              <button className="btn btn-success" onClick={handleManualImport}>
                <CheckCircle size={16} /> Import All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportExport;
