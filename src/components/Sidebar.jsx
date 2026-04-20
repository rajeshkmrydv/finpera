import React, { useState, useCallback, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home, PieChart, CreditCard, ArrowLeftRight, Menu, X,
  ArrowUpDown, Receipt, Target, Calculator, Shield,
  BarChart3, MessageSquare, Settings,
} from 'lucide-react';
import './Sidebar.css';

const navSections = [
  {
    label: null,
    items: [
      { to: '/dashboard', icon: Home, label: 'Dashboard' },
    ],
  },
  {
    label: 'Portfolio',
    items: [
      { to: '/assets', icon: PieChart, label: 'Assets' },
      { to: '/liabilities', icon: CreditCard, label: 'Liabilities' },
      { to: '/transactions', icon: ArrowUpDown, label: 'Transactions' },
    ],
  },
  {
    label: 'Planning',
    items: [
      { to: '/budget', icon: Receipt, label: 'Budget' },
      { to: '/goals', icon: Target, label: 'Goals' },
      { to: '/tax', icon: Calculator, label: 'Tax Planner' },
      { to: '/insurance', icon: Shield, label: 'Insurance' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/advisor', icon: MessageSquare, label: 'AI Advisor' },
      { to: '/reports', icon: BarChart3, label: 'Reports' },
    ],
  },
  {
    label: null,
    items: [
      { to: '/import', icon: ArrowLeftRight, label: 'Import / Export' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

const Sidebar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const toggle = useCallback(() => setMobileOpen(v => !v), []);

  return (
    <>
      <div className="mobile-header">
        <div className="logo-mobile">
          <div className="logo-mobile-icon">FP</div>
          <span>FinPera</span>
        </div>
        <button className="hamburger-btn" onClick={toggle} aria-label="Toggle menu">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <div className={`sidebar-overlay ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(false)} aria-hidden="true" />

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-icon">FP</div>
          <div>
            <h2>FinPera</h2>
            <p className="sidebar-tagline">Finance Assistant</p>
          </div>
        </div>

        <nav className="sidebar-nav" role="navigation" aria-label="Main navigation">
          {navSections.map((section, si) => (
            <div key={si} className="nav-section">
              {section.label && <p className="nav-section-label">{section.label}</p>}
              {section.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p>Personal Finance Tracker</p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
