import React from 'react';
import { Activity, Users, AlertCircle, TrendingUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function SystemStats() {
  const usageData = [
    { date: 'Mon', active: 45, alerts: 12 },
    { date: 'Tue', active: 52, alerts: 8 },
    { date: 'Wed', active: 48, alerts: 15 },
    { date: 'Thu', active: 61, alerts: 10 },
    { date: 'Fri', active: 55, alerts: 7 },
    { date: 'Sat', active: 38, alerts: 5 },
    { date: 'Sun', active: 42, alerts: 9 }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-600 mb-1">Total Users</p>
          <p className="text-3xl font-bold text-slate-900">247</p>
          <p className="text-xs text-green-600 mt-1">↑ 12% from last month</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-600 mb-1">Active Today</p>
          <p className="text-3xl font-bold text-slate-900">189</p>
          <p className="text-xs text-slate-500 mt-1">76% of total users</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-600 mb-1">Alerts (24h)</p>
          <p className="text-3xl font-bold text-slate-900">23</p>
          <p className="text-xs text-green-600 mt-1">↓ 8% from yesterday</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-600 mb-1">Avg Response Time</p>
          <p className="text-3xl font-bold text-slate-900">4.2h</p>
          <p className="text-xs text-slate-500 mt-1">Clinician response time</p>
        </div>
      </div>

      {/* Usage Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Daily Active Users</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
              <Line type="monotone" dataKey="active" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Alert Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="alerts" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">System Health</h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">API Response Time</span>
              <span className="text-sm font-semibold text-slate-900">98ms avg</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div className="bg-green-500 h-full rounded-full" style={{ width: '92%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Database Performance</span>
              <span className="text-sm font-semibold text-slate-900">Optimal</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div className="bg-green-500 h-full rounded-full" style={{ width: '95%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Sensor Connectivity</span>
              <span className="text-sm font-semibold text-slate-900">99.2% uptime</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div className="bg-green-500 h-full rounded-full" style={{ width: '99%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
