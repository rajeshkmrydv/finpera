import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, RefreshCw, Loader, Sparkles } from 'lucide-react';

const FloatingActions = ({ onRefresh, refreshing, showRefresh }) => (
  <div className="floating-actions" role="group" aria-label="Quick actions">
    <div className="floating-actions-label">
      <Sparkles size={12} />
      Quick
    </div>
    {showRefresh && (
      <button
        type="button"
        className="floating-action-btn"
        onClick={onRefresh}
        disabled={refreshing}
        title="Refresh prices"
        aria-label="Refresh prices"
      >
        {refreshing ? <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={20} />}
      </button>
    )}
    <Link to="/advisor" className="floating-action-btn floating-action-primary" title="AI Advisor" aria-label="Open AI Advisor">
      <MessageSquare size={20} />
    </Link>
  </div>
);

export default FloatingActions;
