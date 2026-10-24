import React, { useEffect, useState } from 'react';
import {
  Download,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../api';

interface SessionData {
  date: string;
  avgPressure: number;
  peakPressure: number;
  alerts: number;
  status: 'Stable' | 'At Risk' | 'Critical';
  deterioration?: boolean;
}

interface ReportsDownloadProps {
  patientName?: string;
  patientId?: string;
}

function deriveStatus(riskScore: number): 'Stable' | 'At Risk' | 'Critical' {
  if (riskScore >= 7) return 'Critical';
  if (riskScore >= 4) return 'At Risk';
  return 'Stable';
}

function formatWindowDate(ts: string): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function rawToMmHg(raw: number): number {
  const RAW_MAX = 1024;
  const MMHG_MAX = 200;
  return Math.max(0, Math.min(MMHG_MAX, (Number(raw || 0) / RAW_MAX) * MMHG_MAX));
}

export function ReportsDownload({
  patientName = 'Patient',
  patientId
}: ReportsDownloadProps) {
  const [autoReportEnabled, setAutoReportEnabled] = useState(false);
  const [windowData, setWindowData] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!patientId) return;

    let cancelled = false;
    setLoadingData(true);

    api.get('/api/pressure/windows/', {
      params: { patient_id: patientId, range: '24h' },
    })
      .then((res) => {
        if (!cancelled) {
          setWindowData(Array.isArray(res.data) ? res.data : []);
        }
      })
      .catch((err) => console.error('Failed to load report data:', err))
      .finally(() => {
        if (!cancelled) setLoadingData(false);
      });

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const latestWindow = windowData.length > 0 ? windowData[windowData.length - 1] : null;

  const currentSession = {
    patientName,
    sessionDate: latestWindow ? formatWindowDate(latestWindow.timestamp) : '—',
    avgPressure: latestWindow
      ? Number(
          rawToMmHg(
            windowData.reduce((sum: number, w: any) => sum + Number(w.ppi_raw ?? 0), 0) /
              windowData.length
          ).toFixed(1)
        )
      : 0,
    peakPressure: latestWindow
      ? Number(
          rawToMmHg(
            Math.max(...windowData.map((w: any) => Number(w.ppi_raw ?? 0)))
          ).toFixed(1)
        )
      : 0,
    alerts: windowData.filter((w: any) => Number(w.risk_score ?? 0) >= 4).length,
    status: latestWindow
      ? deriveStatus(Number(latestWindow.risk_score ?? 0))
      : ('Stable' as const),
  };

  const byDay: Record<string, any[]> = {};
  windowData.forEach((w: any) => {
    const day = w.timestamp ? new Date(w.timestamp).toDateString() : 'Unknown';
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(w);
  });

  const previousSessions: SessionData[] = Object.entries(byDay)
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .slice(0, 5)
    .map(([, windows]) => {
      const peakRaw = Math.max(...windows.map((w: any) => Number(w.ppi_raw ?? 0)));
      const avgRaw =
        windows.reduce((sum: number, w: any) => sum + Number(w.ppi_raw ?? 0), 0) /
        windows.length;

      const peak = Number(rawToMmHg(peakRaw).toFixed(1));
      const avg = Number(rawToMmHg(avgRaw).toFixed(1));
      const alertCount = windows.filter((w: any) => Number(w.risk_score ?? 0) >= 4).length;
      const status = deriveStatus(
        Math.max(...windows.map((w: any) => Number(w.risk_score ?? 0)))
      );

      return {
        date: formatWindowDate(windows[windows.length - 1].timestamp),
        avgPressure: avg,
        peakPressure: peak,
        alerts: alertCount,
        status,
        deterioration: status === 'Critical',
      };
    });

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    let currentY = 20;

    doc.setFontSize(18);
    doc.text('Reports & Analytics', 14, currentY);
    currentY += 6;

    doc.setFontSize(12);
    doc.text('Session reports and pressure monitoring history', 14, currentY);
    currentY += 14;

    doc.setFontSize(14);
    doc.text('Report Summary', 14, currentY);
    currentY += 6;

    doc.setFontSize(12);
    doc.text(`Patient Name: ${currentSession.patientName}`, 14, currentY);
    currentY += 6;
    doc.text(`Session Date: ${currentSession.sessionDate}`, 14, currentY);
    currentY += 6;
    doc.text(`Average Pressure: ${currentSession.avgPressure} mmHg`, 14, currentY);
    currentY += 6;
    doc.text(`Peak Pressure: ${currentSession.peakPressure} mmHg`, 14, currentY);
    currentY += 6;
    doc.text(`Flagged Alerts: ${currentSession.alerts}`, 14, currentY);
    currentY += 6;
    doc.text(`Overall Status: ${currentSession.status}`, 14, currentY);
    currentY += 14;

    doc.setFontSize(14);
    doc.text('Session Comparison', 14, currentY);
    currentY += 6;

    doc.setFontSize(12);
    doc.text('(Current vs Previous Sessions)', 14, currentY);
    currentY += 6;

    autoTable(doc, {
      head: [['Session Date', 'Avg (mmHg)', 'Peak (mmHg)', 'Alerts', 'Status', 'Trend']],
      body: previousSessions.map((session, index) => [
        index === 0 ? `CURRENT\n${session.date}` : session.date,
        session.avgPressure,
        session.peakPressure,
        session.alerts,
        session.status,
        session.deterioration
          ? 'Deterioration'
          : index > 0 && previousSessions[index - 1].avgPressure < session.avgPressure
          ? 'Increased'
          : index > 0
          ? 'Decreased'
          : '—',
      ]),
      startY: currentY,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fontSize: 8, fontStyle: 'bold', fillColor: [71, 85, 105] },
      columnStyles: {
        0: { cellWidth: 46 },
        1: { cellWidth: 26, halign: 'right' },
        2: { cellWidth: 26, halign: 'right' },
        3: { cellWidth: 16, halign: 'center' },
        4: { cellWidth: 24, halign: 'center' },
        5: { cellWidth: 28, halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.column.index === 4 && data.section === 'body') {
          const val = String(data.cell.raw);
          if (val === 'Critical') data.cell.styles.textColor = [220, 38, 38];
          else if (val === 'At Risk') data.cell.styles.textColor = [161, 98, 7];
          else if (val === 'Stable') data.cell.styles.textColor = [22, 163, 74];
        }

        if (data.column.index === 5 && data.section === 'body') {
          const val = String(data.cell.raw);
          if (val === 'Deterioration') data.cell.styles.textColor = [220, 38, 38];
          else if (val === 'Increased') data.cell.styles.textColor = [161, 98, 7];
          else if (val === 'Decreased') data.cell.styles.textColor = [22, 163, 74];
        }

        if (data.row.index === 0 && data.section === 'body') {
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    doc.text('Legend:', 14, currentY);
    currentY += 6;
    doc.text('Deterioration Detected: Marked in trend column', 14, currentY);
    currentY += 6;
    doc.text('Pressure Increased: Higher than previous session', 14, currentY);
    currentY += 6;
    doc.text('Pressure Decreased: Lower than previous session', 14, currentY);
    currentY += 14;

    doc.setFontSize(14);
    doc.text('Your Summary (Plain English)', 14, currentY);
    currentY += 8;

    doc.setFontSize(11);

    const summaryText1 = `Your pressure readings today placed you in the "${currentSession.status}" category. This reflects the overall pattern of your recent session and indicates whether continued monitoring or intervention may be needed.`;
    const splitText1 = doc.splitTextToSize(summaryText1, 180);
    doc.text(splitText1, 14, currentY);
    currentY += splitText1.length * 6;

    const summaryText2 = `There were ${currentSession.alerts} flagged pressure events during this reporting period, and the highest recorded pressure reached ${currentSession.peakPressure} mmHg. This suggests periods of increased loading that may require repositioning or pressure relief.`;
    const splitText2 = doc.splitTextToSize(summaryText2, 180);
    doc.text(splitText2, 14, currentY);
    currentY += splitText2.length * 6;

    const summaryText3 = `The report also compares the current session with recent previous sessions to help identify whether the patient’s condition appears stable, improving, or worsening over time.`;
    const splitText3 = doc.splitTextToSize(summaryText3, 180);
    doc.text(splitText3, 14, currentY);
    currentY += splitText3.length * 6;

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    const recommendationText =
      'Recommendation: Continue regular repositioning and monitor repeated high-pressure events closely.';
    const splitText4 = doc.splitTextToSize(recommendationText, 180);
    doc.text(splitText4, 14, currentY);

    doc.save(
      `Patient_Report_${currentSession.patientName.replace(/\s+/g, '_')}_${new Date()
        .toISOString()
        .split('T')[0]}.pdf`
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Stable':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'At Risk':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Stable':
        return <CheckCircle className="w-4 h-4" />;
      case 'At Risk':
        return <AlertTriangle className="w-4 h-4" />;
      case 'Critical':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reports & Analytics</h2>
          <p className="text-sm text-slate-600 mt-1">Session reports and pressure monitoring history</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
            <Clock className="w-4 h-4 text-slate-600" />
            <label className="text-sm font-medium text-slate-700 cursor-pointer select-none">
              Auto-Report
            </label>
            <button
              onClick={() => setAutoReportEnabled(!autoReportEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoReportEnabled ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoReportEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium shadow-lg transition-all transform hover:scale-105 text-white"
            style={{ backgroundColor: '#1d4ed8' }}
          >
            <Download className="w-5 h-5" />
            Download PDF Report
          </button>
        </div>
      </div>

      {loadingData && (
        <div className="text-sm text-slate-500 text-center py-4">Loading report data…</div>
      )}

      {!loadingData && patientId && windowData.length === 0 && (
        <div className="text-sm text-slate-500 text-center py-4">
          No session data found for this patient yet.
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">Report Summary</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-1 md:col-span-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Patient Name</p>
                <p className="text-xl font-bold text-slate-900">{currentSession.patientName}</p>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-600" />
                <div className="text-right">
                  <p className="text-sm text-slate-600">Session Date</p>
                  <p className="text-sm font-semibold text-slate-900">{currentSession.sessionDate}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-2">
              Average Pressure
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-blue-600">{currentSession.avgPressure}</p>
              <span className="text-sm text-slate-600">mmHg</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-2">
              Peak Pressure
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-red-600">{currentSession.peakPressure}</p>
              <span className="text-sm text-slate-600">mmHg</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-2">
              Flagged Alerts
            </p>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-orange-500" />
              <p className="text-3xl font-bold text-slate-900">{currentSession.alerts}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Overall Status</p>
            <span
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(
                currentSession.status
              )}`}
            >
              {getStatusIcon(currentSession.status)}
              {currentSession.status}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          <h3 className="text-lg font-semibold text-slate-900">Session Comparison</h3>
          <span className="text-xs text-slate-500 ml-2">(Current vs Previous Sessions)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Session Date</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">
                  Avg Pressure (mmHg)
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">
                  Peak Pressure (mmHg)
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Alerts</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Trend</th>
              </tr>
            </thead>
            <tbody>
              {previousSessions.map((session, index) => (
                <tr
                  key={index}
                  className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${
                    session.deterioration ? 'bg-red-50/50 hover:bg-red-50' : ''
                  }`}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      {index === 0 && (
                        <span className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded">
                          CURRENT
                        </span>
                      )}
                      <span className="text-sm font-medium text-slate-900">{session.date}</span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="text-sm font-semibold text-slate-900">{session.avgPressure}</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="text-sm font-semibold text-slate-900">{session.peakPressure}</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                        session.alerts > 2 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {session.alerts}
                    </span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                        session.status
                      )}`}
                    >
                      {getStatusIcon(session.status)}
                      {session.status}
                    </span>
                  </td>
                  <td className="text-center py-4 px-4">
                    {session.deterioration ? (
                      <div className="flex items-center justify-center gap-1 text-red-600">
                        <TrendingDown className="w-5 h-5" />
                        <span className="text-xs font-semibold">Deterioration</span>
                      </div>
                    ) : index > 0 && previousSessions[index - 1].avgPressure < session.avgPressure ? (
                      <div className="flex items-center justify-center gap-1 text-red-500">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                    ) : index > 0 ? (
                      <div className="flex items-center justify-center gap-1 text-green-600">
                        <TrendingDown className="w-4 h-4" />
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-6 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
            <span>Deterioration Detected</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-red-500" />
            <span>Pressure Increased</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-green-600" />
            <span>Pressure Decreased</span>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl shadow-md border-2 border-blue-200 p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-blue-900 mb-3">Your Summary (Plain English)</h4>
            <div className="space-y-2 text-slate-700 leading-relaxed">
              <p>
                Your pressure readings today placed you in the <strong>{currentSession.status}</strong>{' '}
                category. This means your recent session should be reviewed in line with your current risk
                level.
              </p>
              <p>
                There were <strong>{currentSession.alerts} flagged pressure events</strong> during this
                reporting period, and the highest recorded pressure reached{' '}
                <strong>{currentSession.peakPressure} mmHg</strong>.
              </p>
              <p>
                Comparing this session with previous sessions helps identify whether pressure patterns are
                remaining stable or showing signs of deterioration over time.
              </p>
              <p className="text-sm text-blue-800 font-medium mt-3">
                💡 <strong>Recommendation:</strong> Try to shift weight regularly and continue pressure
                relief strategies where needed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}