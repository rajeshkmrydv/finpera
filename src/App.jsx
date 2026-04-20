import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { FinperaProvider } from './context/FinperaContext';
import AppLayout from './components/AppLayout';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Assets = lazy(() => import('./pages/Assets'));
const Liabilities = lazy(() => import('./pages/Liabilities'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Budget = lazy(() => import('./pages/Budget'));
const Goals = lazy(() => import('./pages/Goals'));
const TaxPlanner = lazy(() => import('./pages/TaxPlanner'));
const Insurance = lazy(() => import('./pages/Insurance'));
const AIAdvisor = lazy(() => import('./pages/AIAdvisor'));
const Reports = lazy(() => import('./pages/Reports'));
const ImportExport = lazy(() => import('./pages/ImportExport'));
const Settings = lazy(() => import('./pages/Settings'));

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
    <div style={{ width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
  </div>
);

function App() {
  return (
    <FinperaProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="assets" element={<Assets />} />
              <Route path="liabilities" element={<Liabilities />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="budget" element={<Budget />} />
              <Route path="goals" element={<Goals />} />
              <Route path="tax" element={<TaxPlanner />} />
              <Route path="insurance" element={<Insurance />} />
              <Route path="advisor" element={<AIAdvisor />} />
              <Route path="reports" element={<Reports />} />
              <Route path="import" element={<ImportExport />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </FinperaProvider>
  );
}

export default App;
