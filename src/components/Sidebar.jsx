import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, PieChart, CreditCard, ArrowLeftRight } from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { to: '/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/assets', icon: PieChart, label: 'Assets' },
  { to: '/liabilities', icon: CreditCard, label: 'Liabilities' },
  { to: '/import', icon: ArrowLeftRight, label: 'Import / Export' },
];

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-icon">FP</div>
        <div>
          <h2>FinPera</h2>
          <p className="sidebar-tagline">Finance Assistant</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Icon size={19} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <p>Personal Finance Tracker</p>
      </div>
    </aside>
  );
};

export default Sidebar;
