import React, { useEffect, useMemo, useState } from 'react';
import { Header } from './Header';
import { HeatmapGrid } from './HeatmapGrid';
import { MetricsCards } from './MetricsCards';
import { TimelineScrubber } from './TimelineScrubber';
import { SmartAlert } from './SmartAlert';
import { TrendGraphs } from './TrendGraphs';
import { ComparisonModule } from './ComparisonModule';
import { CommentThread } from './CommentThread';
import { ReportsDownload } from './ReportsDownload';
import { usePressureData } from './usePressureData';
import { computeMetricsFromFrame } from "./metrics";
import { logHighRiskAlert } from "./metrics";
import { Activity, FileText } from 'lucide-react';

interface PatientViewProps {
  user: {
    id: string;
    name: string;
    role: string;
  };
  onLogout: () => void;
}

export function PatientView({ user, onLogout }: PatientViewProps) {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h'>('1h');
  const [scrubberPosition, setScrubberPosition] = useState(100);
  const [showAlert, setShowAlert] = useState(false);
  const [alertText, setAlertText] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports'>('dashboard');

  const { currentData, historicalData, alerts } = usePressureData(timeRange, scrubberPosition, user.id);

  const metrics = useMemo(() => {
    return computeMetricsFromFrame(currentData, { units: "raw" });
  }, [currentData]);

  useEffect(() => {
    if (metrics.riskScore >= 7) {
      setAlertText(`High pressure alert for ${user.name}: Risk score ${metrics.riskScore.toFixed(1)}`);
      setShowAlert(true);
      logHighRiskAlert(user.id, metrics.riskScore);
    }
  }, [metrics.riskScore, user.id, user.name]);

  return (
    <div className="min-h-screen pb-8">
      <Header user={user} role="patient" onLogout={onLogout} />
      
      <div className="max-w-7xl mx-auto px-6 pt-24">
        <div className="mb-6 bg-white rounded-xl shadow-md border border-slate-200 p-2 flex gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-5 h-5" />
            Live Dashboard
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'reports'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-5 h-5" />
            Reports & Download
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <>
            {showAlert && (
              <div
                role="alert"
                className="fixed top-4 left-4 z-50 w-[380px] rounded-lg border-2 border-red-950 p-4 text-white shadow-2xl"
                style={{ backgroundColor: '#dc2626', opacity: 1 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-white">High Pressure Alert</p>
                    <p className="mt-1 text-sm text-white">{alertText}</p>
                  </div>
                  <button
                    onClick={() => setShowAlert(false)}
                    className="rounded bg-red-950 px-2 py-1 text-sm font-bold text-white hover:bg-red-900"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {alerts.length > 0 && (
              <div className="mb-6 space-y-3">
                {alerts.map((alert, idx) => (
                  <SmartAlert key={idx} alert={alert} />
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold text-slate-900 mb-1">Live Pressure Map</h2>
                    <p className="text-sm text-slate-600">Real-time pressure distribution across your sensor mat</p>
                  </div>
                  <HeatmapGrid data={currentData} size={32} />
                </div>
              </div>

              <div className="lg:col-span-1">
                <MetricsCards metrics={metrics} detailed />
              </div>
            </div>

            <div className="mb-6">
              <TimelineScrubber
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
                position={scrubberPosition}
                onPositionChange={setScrubberPosition}
              />
            </div>

            <div className="mb-6">
              <ComparisonModule patientId={user.id} />
            </div>

            <div className="mb-6">
              <TrendGraphs historicalData={historicalData} />
            </div>

            <div className="mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-lg">💡</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Your Health Summary</h3>
                    <p className="text-slate-700 leading-relaxed mb-3">
                      Your current pressure readings show <strong>{metrics.riskScore <= 3 ? 'excellent' : metrics.riskScore <= 6 ? 'good' : 'elevated'}</strong> distribution patterns. 
                      {metrics.peakPressure > 180 
                        ? " We've detected higher pressure in some areas. Try adjusting your position or take a short break to walk around."
                        : " Your pressure levels are well-distributed, which is great for preventing discomfort."}
                    </p>
                    <p className="text-slate-700 leading-relaxed">
                      <strong>Recommendation:</strong> {metrics.contactArea > 60 
                        ? "Your contact area is good. Keep maintaining regular position changes every 30-60 minutes."
                        : "Consider adjusting your seating to increase contact area for better weight distribution."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <CommentThread 
              patientId={user.id} 
              currentUserRole="patient" 
            />
          </>
        )}

        {activeTab === 'reports' && (
          <div className="mb-6">
            <ReportsDownload patientId={user.id} patientName={user.name} />
          </div>
        )}
      </div>
    </div>
  );
}