// client/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import ClientsPage from './pages/ClientsPage.jsx';
import ClientDetailPage from './pages/ClientDetailPage.jsx';
import SiteDetailPage from './pages/SiteDetailPage.jsx';
import SuppliersPage from './pages/SuppliersPage.jsx';
import PartsPage from './pages/PartsPage.jsx';
import AssetsPage from './pages/AssetsPage.jsx';
import LoginPage from './pages/LoginPage.jsx';

import './styles.css';

function AppShell({ children }) {
  return (
    <>
      <div style={{background:'#111', color:'#eee', padding:'10px 16px'}}>
        <b style={{marginRight: 20}}>Asset DB</b>
        <a href="/clients" style={{color:'#ddd', marginRight:12}}>Clients</a>
        {/* Removed Locations link */}
        <a href="/assets" style={{color:'#ddd', marginRight:12}}>Assets</a>
        <a href="/parts" style={{color:'#ddd', marginRight:12}}>Parts</a>
        <a href="/suppliers" style={{color:'#ddd', marginRight:12}}>Suppliers</a>
        <a href="/login" style={{color:'#ddd', float:'right'}}>Login</a>
      </div>
      <div style={{padding:'16px'}}>{children}</div>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/clients" replace />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/:clientId" element={<ClientDetailPage />} />
          <Route path="/clients/:clientId/sites/:siteId" element={<SiteDetailPage />} />

          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/parts" element={<PartsPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* old /locations route removed */}
          <Route path="*" element={<div>Not found</div>} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
