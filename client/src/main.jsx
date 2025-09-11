import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';

import ClientsPage from './pages/ClientsPage.jsx';
import ClientDetailPage from './pages/ClientDetailPage.jsx';
import LocationsPage from './pages/LocationsPage.jsx';

import AssetsPage from './pages/AssetsPage.jsx';
import AssetDetailPage from './pages/AssetDetailPage.jsx';

import PartsPage from './pages/PartsPage.jsx';
import PartDetailPage from './pages/PartDetailPage.jsx';

import SuppliersPage from './pages/SuppliersPage.jsx';
import SupplierDetailPage from './pages/SupplierDetailPage.jsx';

import JobsPage from './pages/JobsPage.jsx';
import JobDetailPage from './pages/JobDetailPage.jsx';

import LoginPage from './pages/LoginPage.jsx';

import './styles.css';
import { AuthProvider, useAuth } from './AuthContext.jsx';

function RoleBadge(){
  const { user, isAdmin, logout } = useAuth();
  return (
    <div style={{display:'flex',gap:8,alignItems:'center'}}>
      <span>{user ? (isAdmin ? 'Admin' : 'User') : 'Guest'}</span>
      {user && <button onClick={logout}>Logout</button>}
    </div>
  );
}

function Layout() {
  return (
    <div className="app">
      <header className="header">
        <h1>Asset DB</h1>
        <nav>
          <NavLink to="/" end>Clients</NavLink>
          <NavLink to="/locations">Locations</NavLink>
          <NavLink to="/assets">Assets</NavLink>
          <NavLink to="/parts">Parts</NavLink>
          <NavLink to="/suppliers">Suppliers</NavLink>
          <NavLink to="/jobs">Jobs</NavLink>
          <NavLink to="/login">Login</NavLink>
        </nav>
        <RoleBadge />
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<ClientsPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />

          <Route path="/locations" element={<LocationsPage />} />

          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/assets/:id" element={<AssetDetailPage />} />

          <Route path="/parts" element={<PartsPage />} />
          <Route path="/parts/:id" element={<PartDetailPage />} />

          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/suppliers/:id" element={<SupplierDetailPage />} />

          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />

          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <Layout />
    </AuthProvider>
  </BrowserRouter>
);
