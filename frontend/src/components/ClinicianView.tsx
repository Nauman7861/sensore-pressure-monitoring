import React, { useEffect, useMemo, useState } from 'react';
import { Header } from './Header';
import { HeatmapGrid } from './HeatmapGrid';
import { MetricsCards } from './MetricsCards';
import { TimelineScrubber } from './TimelineScrubber';
import { TrendGraphs } from './TrendGraphs';
import { ClinicianComparison } from './ClinicianComparison';
import { PatientSelector } from './PatientSelector';
import { CommentThread } from './CommentThread';
import { ReportsDownload } from './ReportsDownload';
import { useClinicianPressureData } from './useClinicianPressureData';
import { computeMetricsFromFrame, logHighRiskAlert } from './metrics';
import api from '../api';
import { patientAlerts } from './metrics';
import { Users, ArrowLeft, Activity, FileText } from 'lucide-react';

interface Patient {
  id: number;
  name: string;
  is_active: boolean;
  lastUpload?: string;
}

interface ClinicianViewProps {
  user: {
    id: string;
    name: string;
    role: string;
  };
  onLogout: () => void;
  showBackButton?: boolean;
  onBack?: () => void;
}

export function ClinicianView({ user, onLogout, showBackButton, onBack }: ClinicianViewProps) {
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h'>('6h');
  const [scrubberPosition, setScrubberPosition] = useState(100);
  const [showAlert, setShowAlert] = useState(false);
  const [alertText, setAlertText] = useState('');
  const [viewMode, setViewMode] = useState<'clinician' | 'patient'>('clinician');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports'>('dashboard');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await api.get('/api/clinician/patients/');

      const mapped = response.data.map((p: any) => ({
        id: Number(p.id),
        name: `${p.first_name} ${p.last_name}`,
        is_active: true,
        lastUpload: p.last_upload,
      }));

      setPatients(mapped);

      if (mapped.length > 0 && selectedPatient === null) {
        setSelectedPatient(mapped[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    }
  };

  const {
    currentData,
    historicalData,
    alerts,
    loading,
  } = useClinicianPressureData(selectedPatient, timeRange, scrubberPosition);

  const metrics = useMemo(() => {
    return computeMetricsFromFrame(currentData, { units: 'raw' });
  }, [currentData]);

  const selectedPatientData = patients.find((p) => p.id === selectedPatient);

  useEffect(() => {
    if (selectedPatient && metrics.riskScore >= 7) {
      setAlertText(
        `Clinician alert: Patient ${selectedPatientData?.name || selectedPatient} has risk score ${metrics.riskScore.toFixed(1)}`
      );
      setShowAlert(true);
      logHighRiskAlert(`pt${selectedPatient}`, metrics.riskScore);
    }
  }, [metrics.riskScore, selectedPatient, selectedPatientData?.name]);

  if (viewMode === 'patient') {
    return (
      <>
        <div className="fixed top-20 right-6 z-30 bg-white rounded-lg shadow-lg border border-slate-200 p-2">
          <button
            onClick={() => setViewMode('clinician')}
            className="w-full px-3 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Clinician View
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      <Header user={user} role="clinician" onLogout={onLogout} />

      <div className="fixed top-20 right-6 z-30 bg-white rounded-lg shadow-lg border border-slate-200 p-2">
        {showBackButton && onBack ? (
          <button
            onClick={onBack}
            className="w-full px-3 py-2 rounded-md text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin View
          </button>
        ) : (
          <>
            <div className="text-xs font-medium text-slate-600 mb-2 px-2">View As:</div>
            <button
              onClick={() => setViewMode('patient')}
              className="w-full px-3 py-2 rounded-md text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" />
              Patient View
            </button>
          </>
        )}
      </div>

      <div className="max-w-[1600px] mx-auto px-6 pt-24">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex-1">
            <PatientSelector
              patients={patients}
              selectedPatient={selectedPatient}
              onSelectPatient={(patientId) => {
                setSelectedPatient(patientId);
                setScrubberPosition(100);
              }}
              onRefresh={fetchPatients}
            />
          </div>
        </div>

        <div className="mb-6 bg-white rounded-xl shadow-md border border-slate-200 p-2 flex gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-5 h-5" />
            Clinical Dashboard
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'reports'
                ? 'bg-emerald-600 text-black shadow-md'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-5 h-5" />
            Patient Reports
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
              <div className="xl:col-span-2 space-y-6">
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold text-slate-900 mb-1">
                      Pressure Distribution Analysis
                    </h2>
                    <p className="text-sm text-slate-600">
                      Current sensor readings - Patient:{' '}
                      {selectedPatientData?.name || 'Select patient'}
                    </p>
                  </div>

                  {!selectedPatient ? (
                    <div className="h-[420px] flex items-center justify-center text-slate-500">
                      Select a patient to view heatmap and pressure history
                    </div>
                  ) : loading ? (
                    <div className="h-[420px] flex items-center justify-center text-slate-500">
                      Loading patient data...
                    </div>
                  ) : (
                    <HeatmapGrid data={currentData} size={32} showGrid />
                  )}
                </div>

                <TimelineScrubber
                  timeRange={timeRange}
                  onTimeRangeChange={setTimeRange}
                  position={scrubberPosition}
                  onPositionChange={setScrubberPosition}
                />

                <ClinicianComparison patientId={selectedPatient} />
              </div>

              <div className="xl:col-span-1 space-y-6">
                <MetricsCards metrics={metrics} detailed />
              </div>
            </div>

            {selectedPatient && (
              <TrendGraphs
                historicalData={historicalData}
                detailed
              />
            )}

            {selectedPatient && (
              <CommentThread
                patientId={String(selectedPatient)}
                clinicianId={user.id}
                currentUserRole="clinician"
              />
            )}
          </>
        )}

        {activeTab === 'reports' && (
          <ReportsDownload patientId={selectedPatient ? String(selectedPatient) : ''} patientName={selectedPatientData?.name} />
        )}
      </div>
    </div>
  );
}
