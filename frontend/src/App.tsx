import { WelcomePage } from './components/WelcomePage';
import { BrowserRouter, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import { PatientView } from './components/PatientView';
import { ClinicianView } from './components/ClinicianView';
import { AdminView } from './components/AdminView';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useState } from 'react';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import PressureUpload from "./components/PressureUpload";
import { jwtDecode } from 'jwt-decode';
import { ACCESS_TOKEN, REFRESH_TOKEN } from './constants';
import api from './api';

function AppContent() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const token = localStorage.getItem(ACCESS_TOKEN);
      if (token) {
        const decoded: any = jwtDecode(token);
        if (decoded.exp * 1000 > Date.now()) {
          const fullName = [decoded.first_name, decoded.last_name].filter(Boolean).join(' ') || decoded.username || '';
          return {
            id: String(decoded.user_id ?? decoded.id ?? ''),
            email: decoded.email ?? '',
            name: fullName,
            role: (decoded.role ?? 'patient') as 'patient' | 'clinician' | 'admin',
          };
        }
      }
    } catch {}
    return { id: '', email: '', name: '', role: 'patient' as 'patient' | 'clinician' | 'admin' };
  });

  const handleLoginSuccess = (userData: any) => {
    const fullName = userData.name || [userData.first_name, userData.last_name].filter(Boolean).join(' ') || userData.username || '';
    setCurrentUser({
      id: String(userData.id ?? ''),
      email: userData.email ?? '',
      name: fullName,
      role: (userData.role ?? 'patient') as 'patient' | 'clinician' | 'admin',
    });
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    // Revoke the refresh token on the server so it cannot be reused after logout
    const refresh = localStorage.getItem(REFRESH_TOKEN);
    if (refresh) {
      try {
        await api.post('/api/logout/', { refresh });
      } catch {
        // Still log out locally if the server call fails
      }
    }
    localStorage.clear();
    setIsLoggedIn(false);
    setCurrentUser({ id: '', email: '', name: '', role: 'patient' });
    navigate('/login');
  };
  


  return (
    <Routes>
      <Route path="/logout" element={<Navigate to="/login" />} />
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route path="/login" element={<WelcomePage onLoginSuccess={handleLoginSuccess} />} />
      <Route
    path="/reset-password/:uid/:token"
    element={<ResetPassword />}
    />

      <Route
        path="/patient-dashboard"
        element={
          <ProtectedRoute>
            <PatientView user={currentUser} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin-dashboard"
        element={
          <ProtectedRoute>
            <AdminView user={currentUser} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clinician-dashboard"
        element={
          <ProtectedRoute>
            <ClinicianView user={currentUser} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
    
    <Route
    path="/upload-csv"
    element={
      <ProtectedRoute>
        <PressureUpload />
      </ProtectedRoute>
    }
  />

    </Routes>
  );
}
// useEffect(() => {
  //   setCurrentUser(prev => ({ ...prev, role: currentRole }));
  // }, [currentRole]);

  // const handleLogin = (role: UserRole, credentials: { email: string; password: string }) => {
  //   // Simulate login - in production, this would authenticate with a backend
  //   setCurrentRole(role);
    
  //   // Set user based on role
  //   const users = {
  //     patient: { id: 'user-001', name: 'Michael Nketia', role: 'patient' as UserRole },
  //     clinician: { id: 'user-002', name: 'Dr. Anderson', role: 'clinician' as UserRole },
  //     admin: { id: 'user-003', name: 'Admin User', role: 'admin' as UserRole }
  //   };
    
  //   setCurrentUser(users[role]);
  //   setIsLoggedIn(true);
  // };

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}