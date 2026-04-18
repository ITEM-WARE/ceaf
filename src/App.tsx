/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { ProfileForm } from './pages/ProfileForm';
import { ProfileList } from './pages/ProfileList';
import { ProfileDetail } from './pages/ProfileDetail';
import { Settings } from './pages/Settings';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Login } from './pages/Login';

function AppContent() {
  const { role } = useAuth();

  if (!role) {
    return <Login />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="create" element={role === 'admin' ? <ProfileForm /> : <Navigate to="/" />} />
          <Route path="edit/:id" element={role === 'admin' ? <ProfileForm /> : <Navigate to="/" />} />
          <Route path="profiles" element={<ProfileList />} />
          <Route path="profiles/:id" element={<ProfileDetail />} />
          <Route path="settings" element={role === 'admin' ? <Settings /> : <Navigate to="/" />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
