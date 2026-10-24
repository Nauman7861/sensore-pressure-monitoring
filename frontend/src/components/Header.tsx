import React, { useState } from 'react';
import { Activity, Bell, User, LogOut } from 'lucide-react';

interface HeaderProps {
  user: {
    id: string;
    name: string;
    role: string;
  };
  role: 'patient' | 'clinician' | 'admin';
  onLogout?: () => void;
}

export function Header({ user, role, onLogout }: HeaderProps) {
  const [showRoleTooltip, setShowRoleTooltip] = useState(false);

  const roleColors = {
    patient: 'from-blue-600 to-blue-700',
    clinician: 'from-emerald-600 to-emerald-700',
    admin: 'from-purple-600 to-purple-700'
  };

  const getPatientData = () => ({
    riskScore: 6.8,
    status: 'Moderate Risk',
    lastSession: 'Today, 2:30 PM',
    totalSessions: 24,
    currentPressure: '42 mmHg',
    activeSensor: 'S-2847'
  });

  const getClinicianData = () => ({
    patientsAssigned: 12,
    highRiskPatients: 3,
    pendingAlerts: 5,
    todayAssessments: 8,
    department: 'Care',
    activeSince: 'Apr 2024'
  });

  return (
    <header className={`fixed top-0 left-0 right-0 z-40 bg-gradient-to-r ${roleColors[role]} shadow-lg`}>
      <div className="max-w-[1600px] mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Graphene Trace</h1>
              <p className="text-xs text-white/80">Sensore™ Pressure Monitoring System</p>
            </div>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-white/10 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-white" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div 
              className={`relative flex items-center gap-3 bg-white/10 rounded-lg px-4 py-2 backdrop-blur-sm transition-all ${role !== 'admin' ? 'cursor-pointer hover:bg-white/20' : ''}`}
              onMouseEnter={() => role !== 'admin' && setShowRoleTooltip(true)}
              onMouseLeave={() => role !== 'admin' && setShowRoleTooltip(false)}
            >
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-slate-700" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-white/70 capitalize">{role}</p>
              </div>
              
              {/* Hover Tooltip - Only for Patient and Clinician */}
              {showRoleTooltip && role !== 'admin' && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200 z-50 overflow-hidden">
                  {/* Header */}
                  <div className={`bg-gradient-to-r ${roleColors[role]} p-4`}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                        <User className={`w-6 h-6 ${role === 'patient' ? 'text-blue-600' : 'text-emerald-600'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white capitalize">{role} Account</p>
                        <p className="text-xs text-white/80">{user.name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Patient Data */}
                  {role === 'patient' && (
                    <div className="p-4">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Current Status</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                          <span className="text-xs text-slate-600">Risk Score</span>
                          <span className="text-sm font-bold text-blue-700">{getPatientData().riskScore}/10</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                          <span className="text-xs text-slate-600">Status</span>
                          <span className="text-xs font-semibold text-orange-600 px-2 py-1 bg-orange-100 rounded-full">{getPatientData().status}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                          <span className="text-xs text-slate-600">Last Session</span>
                          <span className="text-xs font-semibold text-slate-900">{getPatientData().lastSession}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                          <span className="text-xs text-slate-600">Total Sessions</span>
                          <span className="text-xs font-semibold text-slate-900">{getPatientData().totalSessions}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                          <span className="text-xs text-slate-600">Current Pressure</span>
                          <span className="text-sm font-bold text-blue-700">{getPatientData().currentPressure}</span>
                        </div>
                        <div className="p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                          <span className="text-xs text-slate-600 block mb-1">Active Sensor</span>
                          <span className="text-xs font-semibold text-blue-900">{getPatientData().activeSensor}</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">User ID:</span>
                          <span className="font-mono text-slate-700">{user.id}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Clinician Data */}
                  {role === 'clinician' && (
                    <div className="p-4">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Dashboard Overview</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
                          <span className="text-xs text-slate-600">Patients Assigned</span>
                          <span className="text-sm font-bold text-emerald-700">{getClinicianData().patientsAssigned}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-200">
                          <span className="text-xs text-slate-600">High Risk Patients</span>
                          <span className="text-sm font-bold text-red-700">{getClinicianData().highRiskPatients}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                          <span className="text-xs text-slate-600">Pending Alerts</span>
                          <span className="text-xs font-semibold text-orange-600 px-2 py-1 bg-orange-200 rounded-full">{getClinicianData().pendingAlerts}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                          <span className="text-xs text-slate-600">Today's Assessments</span>
                          <span className="text-xs font-semibold text-slate-900">{getClinicianData().todayAssessments}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
                          <span className="text-xs text-slate-600">Department</span>
                          <span className="text-xs font-semibold text-emerald-700">{getClinicianData().department}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                          <span className="text-xs text-slate-600">Active Since</span>
                          <span className="text-xs font-semibold text-slate-900">{getClinicianData().activeSince}</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Clinician ID:</span>
                          <span className="font-mono text-slate-700">{user.id}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm"
                title="Logout"
              >
                <LogOut className="w-5 h-5 text-white" />
                <span className="text-sm font-medium text-white">Logout</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
