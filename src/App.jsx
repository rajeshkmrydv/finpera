import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { FinperaProvider } from './context/FinperaContext';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import Liabilities from './pages/Liabilities';
import ImportExport from './pages/ImportExport';

function App() {
  return (
    <FinperaProvider>
      <Router>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="assets" element={<Assets />} />
            <Route path="liabilities" element={<Liabilities />} />
            <Route path="import" element={<ImportExport />} />
          </Route>
        </Routes>
      </Router>
    </FinperaProvider>
  );
}

export default App;
