import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const AppLayout = () => {
  return (
    <div className="app-container">
      <div className="floating-orbs" aria-hidden="true">
        <span className="floating-orb orb-1" />
        <span className="floating-orb orb-2" />
        <span className="floating-orb orb-3" />
      </div>
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
