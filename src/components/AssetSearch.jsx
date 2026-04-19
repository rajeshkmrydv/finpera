import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader, X, Globe } from 'lucide-react';
import { searchAssets, getPrice } from '../utils/priceService';

const AssetSearch = ({ type, value, onSelect, disabled }) => {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  const isMF = type === 'Mutual Fund';

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const doSearch = useCallback(async (q) => {
    if (!q || q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await searchAssets(q, type);
      setResults(data);
      setOpen(data.length > 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [type]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 350);
  };

  const handleSelect = async (item) => {
    setOpen(false);
    setQuery(item.name);

    setFetchingPrice(true);
    let price = null;
    try {
      price = await getPrice(item.symbol);
    } catch { /* fallback to manual */ }
    setFetchingPrice(false);

    onSelect({
      name: item.name,
      symbol: item.symbol,
      currentPrice: price,
      exchange: item.exchange,
    });
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
    onSelect({ name: '', symbol: undefined, currentPrice: null });
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          className="form-control"
          style={{ paddingLeft: '2.25rem', paddingRight: query ? '2.25rem' : '1rem' }}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={isMF ? 'Search mutual fund name...' : 'Search stock / ETF name...'}
          disabled={disabled}
        />
        <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', display: 'flex' }}>
          {loading || fetchingPrice
            ? <Loader size={16} style={{ animation: 'pulse 1s ease infinite' }} />
            : <Search size={16} />}
        </div>
        {query && (
          <button
            type="button"
            onClick={handleClear}
            style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: '4px' }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {fetchingPrice && (
        <p className="text-xs mt-1" style={{ color: 'var(--accent-primary)' }}>
          Fetching live price...
        </p>
      )}

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
          background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius-md)', boxShadow: 'var(--shadow-lg)',
          zIndex: 50, maxHeight: '260px', overflowY: 'auto',
          animation: 'slideDown 0.15s ease',
        }}>
          {results.map((item, idx) => (
            <button
              key={item.symbol || idx}
              type="button"
              onClick={() => handleSelect(item)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                width: '100%', padding: '0.65rem 0.85rem', border: 'none',
                background: 'transparent', cursor: 'pointer', textAlign: 'left',
                fontFamily: 'inherit', fontSize: '0.88rem',
                borderBottom: idx < results.length - 1 ? '1px solid var(--border-color)' : 'none',
                transition: 'background 0.1s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Globe size={14} style={{ color: 'var(--text-tertiary)', marginTop: '3px', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 500, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: 0 }}>
                  {item.symbol} · {item.exchange}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && !loading && results.length === 0 && query.length >= 2 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
          background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius-md)', boxShadow: 'var(--shadow-lg)',
          zIndex: 50, padding: '1rem', textAlign: 'center',
        }}>
          <p className="text-sm text-muted">No results found. You can type the name manually.</p>
        </div>
      )}
    </div>
  );
};

export default AssetSearch;
