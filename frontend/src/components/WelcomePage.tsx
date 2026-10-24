import React, { useState } from 'react';
import { Activity, Heart, Brain, ChevronRight, User, Lock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api'; 
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants';
import { useNavigate, Link } from 'react-router-dom';

interface WelcomePageProps {
  onLoginSuccess?: (userData: any) => void;
}

export function WelcomePage({ onLoginSuccess }: WelcomePageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRole) {
      setError('Please select a role before signing in.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Payload matches Django custom user (email as username)
      const payload = { 
        email: email, 
        password: password, 
        role: selectedRole
      };
      
      const res = await api.post('/api/token', payload); 

      // Store tokens
      localStorage.setItem(ACCESS_TOKEN, res.data.access);
      localStorage.setItem(REFRESH_TOKEN, res.data.refresh);
      
      // Update global state
      if (onLoginSuccess && res.data.user) {
        onLoginSuccess(res.data.user);
      }
      
      // Role-based routing
      const userRole = (res.data.user?.role || selectedRole).toLowerCase();
      const roleDashboards: Record<string, string> = {
        patient: '/patient-dashboard',
        clinician: '/clinician-dashboard', 
        admin: '/admin-dashboard'
      };
      
      navigate(roleDashboards[userRole] || '/dashboard');
      
    } catch (error: any) {
      console.error('Login error:', error);
      const backendError = error.response?.data;
      let errorMsg = 'Login failed. Please check your credentials.';
      
      if (backendError?.detail) {
        errorMsg = backendError.detail;
      } else if (backendError?.non_field_errors) {
        errorMsg = backendError.non_field_errors[0];
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
        <div className="max-w-6xl w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Activity className="w-9 h-9 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Graphene Trace</h1>
                  <p className="text-blue-300 text-sm">Sensore™ Platform</p>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                  Next-Generation<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                    Pressure Monitoring
                  </span>
                </h2>
                <p className="text-xl text-slate-300 leading-relaxed">
                  Advanced e-textile sensor technology for real-time ulcer prevention and patient care.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Heart className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Real-Time Monitoring</h3>
                    <p className="text-sm text-slate-400">32×32 pressure mapping matrix</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Brain className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">AI-Powered Analytics</h3>
                    <p className="text-sm text-slate-400">Smart Alerts and predictive risk assessment</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Form */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-2xl shadow-2xl p-8 lg:p-10"
            >
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back</h3>
                <p className="text-slate-600">Sign in to access your Sensore dashboard</p>
              </div>

              {/* Role Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-3">Select Your Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {['patient', 'clinician', 'admin'].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSelectedRole(role)}
                      disabled={loading}
                      className={`px-3 py-3 rounded-lg font-medium text-sm transition-all capitalize ${
                        selectedRole === role
                          ? 'bg-blue-600 text-white shadow-lg scale-105'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                  <div className="relative">
                    <User className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      disabled={loading}
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      disabled={loading}
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      disabled={loading}
                    />
                    <span className="text-sm text-slate-600">Remember me</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Signing In...</>
                  ) : (
                    <>Sign In <ChevronRight className="w-5 h-5" /></>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
