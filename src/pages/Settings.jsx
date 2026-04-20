import React, { useState, useRef, useCallback } from 'react';
import { useFinpera } from '../context/FinperaContext';
import {
  Settings as SettingsIcon, User, Shield, Bot, Database,
  Download, Upload, Trash2, Eye, EyeOff, AlertTriangle,
  CheckCircle, Key,
} from 'lucide-react';

const RISK_PROFILES = [
  { value: 'conservative', label: 'Conservative', desc: 'Prefer stability. 70% debt, 20% equity, 10% gold' },
  { value: 'moderate', label: 'Moderate', desc: 'Balanced growth. 50% equity, 30% debt, 20% alternatives' },
  { value: 'aggressive', label: 'Aggressive', desc: 'Maximum growth. 70% equity, 20% alternatives, 10% debt' },
];

const AI_PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'openai', label: 'OpenAI (GPT)' },
];

const Settings = () => {
  const { settings, updateSettings } = useFinpera();
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState(null);
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileInputRef = useRef(null);

  const flash = useCallback((msg, type = 'success') => {
    setStatusMsg({ msg, type });
    setTimeout(() => setStatusMsg(null), 3000);
  }, []);

  const handleFieldBlur = (field, value) => {
    updateSettings({ [field]: value });
    flash('Settings saved');
  };

  const handleSelectChange = (field, value) => {
    updateSettings({ [field]: value });
    flash('Settings saved');
  };

  const testConnection = async () => {
    if (!settings.aiApiKey) {
      setTestStatus({ ok: false, msg: 'Please enter an API key first.' });
      return;
    }
    setTesting(true);
    setTestStatus(null);
    try {
      if (settings.aiProvider === 'anthropic') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': settings.aiApiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 16,
            messages: [{ role: 'user', content: 'Say "ok"' }],
          }),
        });
        setTestStatus(res.ok
          ? { ok: true, msg: 'Connection successful!' }
          : { ok: false, msg: `Error ${res.status}: ${(await res.json())?.error?.message || 'Request failed'}` });
      } else {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.aiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 16,
            messages: [{ role: 'user', content: 'Say "ok"' }],
          }),
        });
        setTestStatus(res.ok
          ? { ok: true, msg: 'Connection successful!' }
          : { ok: false, msg: `Error ${res.status}: ${(await res.json())?.error?.message || 'Request failed'}` });
      }
    } catch (err) {
      setTestStatus({ ok: false, msg: `Network error: ${err.message}` });
    } finally {
      setTesting(false);
    }
  };

  const clearAllData = () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('finpera_'));
    keys.forEach(k => localStorage.removeItem(k));
    setConfirmClear(false);
    flash('All data cleared. Reload to reset.', 'success');
    setTimeout(() => window.location.reload(), 1200);
  };

  const exportData = () => {
    const data = {};
    Object.keys(localStorage)
      .filter(k => k.startsWith('finpera_'))
      .forEach(k => {
        try { data[k] = JSON.parse(localStorage.getItem(k)); }
        catch { data[k] = localStorage.getItem(k); }
      });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finpera-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash('Data exported successfully');
  };

  const importData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const keys = Object.keys(data).filter(k => k.startsWith('finpera_'));
        if (keys.length === 0) {
          flash('Invalid backup file — no finpera data found.', 'error');
          return;
        }
        keys.forEach(k => localStorage.setItem(k, JSON.stringify(data[k])));
        flash('Data imported. Reloading…', 'success');
        setTimeout(() => window.location.reload(), 1200);
      } catch {
        flash('Failed to parse file. Ensure it is a valid JSON backup.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="animate-slideUp">
      <div className="page-header mb-6">
        <div>
          <h1 className="flex items-center gap-2">
            <SettingsIcon size={28} />
            Settings
          </h1>
          <p className="text-muted">Configure your profile and preferences.</p>
        </div>
      </div>

      {statusMsg && (
        <div className={`status-message mb-4 flex items-center gap-2 ${statusMsg.type === 'error' ? 'badge-danger' : 'badge-success'}`}>
          {statusMsg.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
          {statusMsg.msg}
        </div>
      )}

      {/* Personal Profile */}
      <div className="glass-panel mb-6 animate-slideUp stagger-1">
        <h2 className="flex items-center gap-2 font-bold mb-4">
          <User size={20} /> Personal Profile
        </h2>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              className="form-control"
              type="text"
              defaultValue={settings.name}
              placeholder="Your name"
              onBlur={(e) => handleFieldBlur('name', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Age</label>
            <input
              className="form-control"
              type="number"
              defaultValue={settings.age || ''}
              placeholder="e.g. 30"
              min={0}
              onBlur={(e) => handleFieldBlur('age', Number(e.target.value))}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Monthly Income</label>
            <input
              className="form-control"
              type="number"
              defaultValue={settings.monthlyIncome || ''}
              placeholder="e.g. 100000"
              min={0}
              onBlur={(e) => handleFieldBlur('monthlyIncome', Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Number of Dependents</label>
            <input
              className="form-control"
              type="number"
              defaultValue={settings.dependents || ''}
              placeholder="e.g. 2"
              min={0}
              onBlur={(e) => handleFieldBlur('dependents', Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Risk Profile */}
      <div className="glass-panel mb-6 animate-slideUp stagger-2">
        <h2 className="flex items-center gap-2 font-bold mb-4">
          <Shield size={20} /> Risk Profile Assessment
        </h2>
        <div className="flex gap-3" style={{ flexDirection: 'column' }}>
          {RISK_PROFILES.map(({ value, label, desc }) => (
            <label
              key={value}
              className={`glass-panel flex items-center gap-3`}
              style={{
                cursor: 'pointer',
                padding: '1rem 1.25rem',
                border: settings.riskProfile === value
                  ? '2px solid var(--primary)'
                  : '2px solid transparent',
                transition: 'border-color 0.2s',
              }}
            >
              <input
                type="radio"
                name="riskProfile"
                value={value}
                checked={settings.riskProfile === value}
                onChange={() => handleSelectChange('riskProfile', value)}
                style={{ accentColor: 'var(--primary)', width: 18, height: 18 }}
              />
              <div>
                <span className="font-medium">{label}</span>
                <p className="text-sm text-muted" style={{ margin: '0.15rem 0 0' }}>{desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* AI Configuration */}
      <div className="glass-panel mb-6 animate-slideUp stagger-3">
        <h2 className="flex items-center gap-2 font-bold mb-4">
          <Bot size={20} /> AI Configuration
        </h2>

        <div className="form-group mb-4">
          <label className="form-label">AI Provider</label>
          <div className="flex gap-2">
            {AI_PROVIDERS.map(({ value, label }) => (
              <button
                key={value}
                className={`btn ${settings.aiProvider === value ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => handleSelectChange('aiProvider', value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group mb-4">
          <label className="form-label flex items-center gap-2">
            <Key size={14} /> API Key
          </label>
          <div className="flex gap-2 items-center">
            <input
              className="form-control"
              type={showApiKey ? 'text' : 'password'}
              defaultValue={settings.aiApiKey}
              placeholder={`Enter your ${settings.aiProvider === 'anthropic' ? 'Anthropic' : 'OpenAI'} API key`}
              onBlur={(e) => handleFieldBlur('aiApiKey', e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowApiKey(v => !v)}
              title={showApiKey ? 'Hide key' : 'Show key'}
            >
              {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <button
            className="btn btn-secondary btn-sm"
            onClick={testConnection}
            disabled={testing}
          >
            {testing ? 'Testing…' : 'Test Connection'}
          </button>
          {testStatus && (
            <span className={`flex items-center gap-1 text-sm ${testStatus.ok ? 'badge-success' : 'badge-danger'}`}
              style={{ padding: '0.25rem 0.75rem', borderRadius: '6px' }}>
              {testStatus.ok ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
              {testStatus.msg}
            </span>
          )}
        </div>

        <p className="text-xs text-muted">
          Your API key is stored locally in your browser. It is never sent to our servers.
        </p>
      </div>

      {/* Data Management */}
      <div className="glass-panel mb-6 animate-slideUp stagger-4">
        <h2 className="flex items-center gap-2 font-bold mb-4">
          <Database size={20} /> Data Management
        </h2>

        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-secondary flex items-center gap-2" onClick={exportData}>
            <Download size={16} /> Export All Data
          </button>

          <button className="btn btn-secondary flex items-center gap-2" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} /> Import Data
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={importData}
            style={{ display: 'none' }}
          />

          <button className="btn btn-danger flex items-center gap-2" onClick={() => setConfirmClear(true)}>
            <Trash2 size={16} /> Clear All Data
          </button>
        </div>
      </div>

      {confirmClear && (
        <div className="confirm-overlay" onClick={() => setConfirmClear(false)}>
          <div className="confirm-dialog animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={22} style={{ color: 'var(--danger)' }} />
              <h3 className="font-bold">Clear All Data?</h3>
            </div>
            <p className="text-sm text-muted mb-4">
              This will permanently delete all your FinPera data including assets, liabilities, goals, budgets, and settings. This action cannot be undone.
            </p>
            <div className="flex justify-between gap-2">
              <button className="btn btn-secondary" onClick={() => setConfirmClear(false)}>Cancel</button>
              <button className="btn btn-danger flex items-center gap-2" onClick={clearAllData}>
                <Trash2 size={14} /> Yes, Clear Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
