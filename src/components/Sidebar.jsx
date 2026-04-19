import React, { useState, useCallback, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, PieChart, CreditCard, ArrowLeftRight, Menu, X } from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { to: '/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/assets', icon: PieChart, label: 'Assets' },
  { to: '/liabilities', icon: CreditCard, label: 'Liabilities' },
  { to: '/import', icon: ArrowLeftRight, label: 'Import / Export' },
];

const Sidebar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const toggle = useCallback(() => setMobileOpen(v => !v), []);

  return (
    <>
      {/* Mobile top bar */}
      <div className="mobile-header">
        <div className="logo-mobile">
          <div className="logo-mobile-icon">FP</div>
          <span>FinPera</span>
        </div>
        <button className="hamburger-btn" onClick={toggle} aria-label="Toggle menu">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Overlay */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'open' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-icon">FP</div>
          <div>
            <h2>FinPera</h2>
            <p className="sidebar-tagline">Finance Assistant</p>
          </div>
        </div>

        <nav className="sidebar-nav" role="navigation" aria-label="Main navigation">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
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
