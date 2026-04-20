import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useFinpera } from '../context/FinperaContext';
import { Link } from 'react-router-dom';
import { MessageSquare, Send, Plus, Trash2, Bot, User, Sparkles, Settings, Loader } from 'lucide-react';

const formatCurrency = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

const QUICK_SUGGESTIONS = [
  'How is my portfolio?',
  'Can I afford a house?',
  'Tax saving tips',
  'Am I saving enough?',
  'Debt payoff strategy',
];

function renderMarkdown(text) {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  html = html.replace(/```([\s\S]*?)```/g, (_, code) =>
    `<pre style="background:var(--bg-tertiary);padding:0.75rem 1rem;border-radius:8px;overflow-x:auto;margin:0.5rem 0;font-size:0.85rem;line-height:1.5"><code>${code.trim()}</code></pre>`
  );
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\n/g, '<br/>');
  return html;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) return 'Today';
  if (diff < 172800000) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const TypingIndicator = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 14px' }}>
    {[0, 1, 2].map(i => (
      <span key={i} style={{
        width: 7, height: 7, borderRadius: '50%', background: 'var(--text-tertiary)',
        animation: `typingDot 1.4s ease-in-out ${i * 0.2}s infinite`,
      }} />
    ))}
    <style>{`@keyframes typingDot { 0%,60%,100% { opacity:0.3; transform:scale(0.8); } 30% { opacity:1; transform:scale(1); } }`}</style>
  </div>
);

const AIAdvisor = () => {
  const {
    settings, aiConversations, addAIConversation, updateAIConversation, deleteAIConversation,
    assets, liabilities, getAssetValue,
    totalAssetsValue, totalLiabilitiesValue, netWorth, totalMonthlyEMI,
    goals, budget, insurance, healthScore,
  } = useFinpera();

  const [activeConvId, setActiveConvId] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [localMessages, setLocalMessages] = useState([]);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const activeConv = useMemo(
    () => aiConversations.find(c => c.id === activeConvId) || null,
    [aiConversations, activeConvId]
  );

  const messages = activeConv?.messages || localMessages;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, loading]);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading, activeConvId]);

  useEffect(() => {
    if (!activeConvId && localMessages.length === 0) return;
    if (activeConvId) setLocalMessages([]);
  }, [activeConvId]);

  const buildFinancialSummary = useCallback(() => {
    const assetsByType = assets.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + getAssetValue(a);
      return acc;
    }, {});

    const assetBreakdown = Object.entries(assetsByType)
      .map(([type, val]) => `  ${type}: ${formatCurrency(val)}`)
      .join('\n');

    const liabilitySummary = liabilities
      .map(l => `  ${l.name}: ${formatCurrency(l.remainingAmount || 0)} (EMI: ${formatCurrency(l.emi || 0)})`)
      .join('\n');

    const goalsSummary = goals.length > 0
      ? goals.map(g => `  ${g.name}: Target ${formatCurrency(g.targetAmount || 0)}, Current ${formatCurrency(g.currentAmount || 0)}, By ${g.targetDate || 'N/A'}`).join('\n')
      : '  No goals set';

    const insuranceList = insurance.length > 0
      ? insurance.map(i => `  ${i.type}: ${i.provider || 'N/A'}, Cover ${formatCurrency(i.coverAmount || 0)}`).join('\n')
      : '  No insurance configured';

    const budgetIncome = budget?.monthlyIncome || settings?.monthlyIncome || 0;
    const totalBudgeted = (budget?.categories || []).reduce((s, c) => s + Number(c.allocated || 0), 0);

    return [
      `Name: ${settings.name || 'User'}, Age: ${settings.age || 'Not set'}, Dependents: ${settings.dependents || 0}`,
      `Risk Profile: ${settings.riskProfile || 'Not set'}`,
      `Monthly Income: ${formatCurrency(budgetIncome)}`,
      `Net Worth: ${formatCurrency(netWorth)}`,
      `Total Assets: ${formatCurrency(totalAssetsValue)}`,
      `Assets by type:\n${assetBreakdown || '  None'}`,
      `Total Liabilities: ${formatCurrency(totalLiabilitiesValue)}`,
      liabilities.length > 0 ? `Loans:\n${liabilitySummary}` : 'No loans',
      `Monthly EMI: ${formatCurrency(totalMonthlyEMI)}`,
      `Financial Health Score: ${healthScore?.overall ?? 'N/A'}/100`,
      `Goals:\n${goalsSummary}`,
      `Insurance:\n${insuranceList}`,
      `Monthly Budget: ${formatCurrency(totalBudgeted)} allocated across ${(budget?.categories || []).length} categories`,
    ].join('\n');
  }, [assets, liabilities, getAssetValue, goals, budget, insurance, settings, netWorth, totalAssetsValue, totalLiabilitiesValue, totalMonthlyEMI, healthScore]);

  const sendMessage = useCallback(async (text) => {
    const content = text.trim();
    if (!content || loading) return;

    const userMsg = { role: 'user', content, timestamp: new Date().toISOString() };
    let convId = activeConvId;
    let currentMsgs;

    if (!convId) {
      const title = content.length > 40 ? content.slice(0, 40) + '...' : content;
      const newId = crypto.randomUUID();
      addAIConversation({ id: newId, title, messages: [userMsg] });
      setActiveConvId(newId);
      convId = newId;
      currentMsgs = [userMsg];
      setLocalMessages([userMsg]);
    } else {
      currentMsgs = [...messages, userMsg];
      updateAIConversation(convId, { messages: currentMsgs });
    }

    setInputValue('');
    setLoading(true);

    const summary = buildFinancialSummary();
    const systemPrompt = `You are FinPera AI, a personal finance advisor for Indian users. You speak plainly, avoid jargon, and give honest, actionable guidance. Never recommend specific stocks or funds by name — focus on strategy and principles. Here is the user's financial snapshot:\n\n${summary}`;

    const apiMessages = currentMsgs.map(m => ({ role: m.role, content: m.content }));

    try {
      let response;
      if (settings.aiProvider === 'openai') {
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.aiApiKey}` },
          body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'system', content: systemPrompt }, ...apiMessages] }),
        });
      } else {
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': settings.aiApiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1024, system: systemPrompt, messages: apiMessages }),
        });
      }

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        throw new Error(`API error (${response.status}): ${errBody.slice(0, 200) || response.statusText}`);
      }

      const data = await response.json();
      const assistantContent = settings.aiProvider === 'openai'
        ? (data.choices?.[0]?.message?.content || 'No response received.')
        : (data.content?.[0]?.text || 'No response received.');

      const assistantMsg = { role: 'assistant', content: assistantContent, timestamp: new Date().toISOString() };
      updateAIConversation(convId, { messages: [...currentMsgs, assistantMsg] });
      setLocalMessages([]);
    } catch (err) {
      const errorMsg = { role: 'assistant', content: `**Error:** ${err.message || 'Failed to get a response. Check your API key in Settings.'}`, timestamp: new Date().toISOString() };
      updateAIConversation(convId, { messages: [...currentMsgs, errorMsg] });
      setLocalMessages([]);
    } finally {
      setLoading(false);
    }
  }, [loading, activeConvId, messages, settings, addAIConversation, updateAIConversation, buildFinancialSummary]);

  const handleSubmit = (e) => { e.preventDefault(); sendMessage(inputValue); };
  const handleNewChat = () => { setActiveConvId(null); setInputValue(''); setLocalMessages([]); };

  const handleDeleteConv = (e, id) => {
    e.stopPropagation();
    deleteAIConversation(id);
    if (activeConvId === id) { setActiveConvId(null); setLocalMessages([]); }
  };

  const apiKeyConfigured = settings.aiApiKey?.trim().length > 0;

  if (!apiKeyConfigured) {
    return (
      <div className="animate-slideUp">
        <div className="page-header" style={{ marginBottom: '2rem' }}>
          <h1 className="flex items-center gap-2"><Sparkles size={28} /> AI Financial Advisor</h1>
          <p>Get personalized advice based on your complete financial picture.</p>
        </div>
        <div className="glass-panel" style={{ maxWidth: 560, margin: '3rem auto', textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <Settings size={28} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <h2 className="font-bold" style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>API Key Required</h2>
          <p className="text-muted" style={{ marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Configure your Anthropic (Claude) or OpenAI API key in Settings to start chatting.
          </p>
          <Link to="/settings" className="btn btn-primary" style={{ gap: 8 }}><Settings size={16} /> Go to Settings</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 6rem)' }}>
      <div className="flex justify-between items-center" style={{ marginBottom: '0.75rem', flexShrink: 0 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="flex items-center gap-2"><Sparkles size={24} /> AI Financial Advisor</h1>
          <p>Get personalized advice based on your complete financial picture.</p>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 0, minHeight: 0, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
        {/* Chat History Sidebar */}
        <div style={{
          width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column',
          borderRight: '1px solid var(--border-color)', background: 'rgba(241,245,249,0.5)',
        }}>
          <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
            <button className="btn btn-primary btn-sm w-full" onClick={handleNewChat} style={{ gap: 6 }}>
              <Plus size={15} /> New Chat
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {aiConversations.length === 0 && (
              <p className="text-muted text-xs" style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>No conversations yet</p>
            )}
            {aiConversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                style={{
                  padding: '0.55rem 0.6rem', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                  background: activeConvId === conv.id ? 'var(--bg-secondary)' : 'transparent',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4,
                  transition: 'background 0.15s',
                  boxShadow: activeConvId === conv.id ? 'var(--shadow-sm)' : 'none',
                }}
              >
                <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                  <div className="text-sm font-medium truncate">{conv.title || 'Untitled'}</div>
                  <div className="text-xs text-muted" style={{ marginTop: 2 }}>{formatDate(conv.createdAt)}</div>
                </div>
                <button className="btn-icon btn-ghost" onClick={(e) => handleDeleteConv(e, conv.id)} title="Delete" style={{ flexShrink: 0, padding: 3, opacity: 0.4 }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Chat header */}
          <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <MessageSquare size={16} style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-sm font-medium truncate" style={{ flex: 1 }}>
              {activeConv?.title || 'New Conversation'}
            </span>
            <span className="badge badge-info text-xs">{settings.aiProvider === 'openai' ? 'GPT-4o' : 'Claude'}</span>
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {messages.length === 0 && !loading && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, opacity: 0.6 }}>
                <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={30} style={{ color: 'var(--accent-primary)' }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p className="font-medium" style={{ marginBottom: 4 }}>How can I help with your finances?</p>
                  <p className="text-sm text-muted">I have access to your full portfolio, goals, budget, and tax data.</p>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%', display: 'flex', gap: 10,
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: msg.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {msg.role === 'user'
                    ? <User size={14} style={{ color: 'white' }} />
                    : <Bot size={14} style={{ color: 'var(--accent-primary)' }} />}
                </div>
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-primary)',
                  color: msg.role === 'user' ? 'white' : 'inherit',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)',
                  lineHeight: 1.65, fontSize: '0.9rem', wordBreak: 'break-word',
                }}>
                  {msg.role === 'user' ? msg.content : <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ alignSelf: 'flex-start', maxWidth: '80%', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={14} style={{ color: 'var(--accent-primary)' }} />
                </div>
                <div style={{ borderRadius: '16px 16px 16px 4px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick suggestions */}
          {messages.length === 0 && !loading && (
            <div style={{ padding: '0 1.25rem 0.5rem', display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', flexShrink: 0 }}>
              {QUICK_SUGGESTIONS.map(s => (
                <button key={s} className="btn btn-secondary btn-sm" onClick={() => sendMessage(s)} disabled={loading}
                  style={{ borderRadius: 20, fontSize: '0.78rem', gap: 4 }}>
                  <Sparkles size={11} /> {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <input ref={inputRef} type="text" className="form-control"
              placeholder={loading ? 'Waiting for response...' : 'Ask about your finances...'}
              value={inputValue} onChange={e => setInputValue(e.target.value)}
              disabled={loading} style={{ flex: 1, borderRadius: 12, padding: '0.65rem 1rem' }} />
            <button type="submit" className="btn btn-primary" disabled={loading || !inputValue.trim()}
              style={{ borderRadius: 12, padding: '0.65rem 0.85rem', flexShrink: 0 }}>
              {loading ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AIAdvisor;
