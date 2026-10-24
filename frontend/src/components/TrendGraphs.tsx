import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

interface HistoricalDataPoint {
  timestamp: Date;
  peakPressure: number;
  contactArea: number;
  riskScore: number;
}

interface TrendGraphsProps {
  historicalData: HistoricalDataPoint[];
  detailed?: boolean;
}

export function TrendGraphs({ historicalData, detailed = false }: TrendGraphsProps) {
  if (historicalData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 text-center py-12">
        <p className="text-slate-500">No data available for selected time range</p>
      </div>
    );
  }

  // Reference time = first point (t=0)
  const t0 = historicalData[0].timestamp;
  const totalDuration = (historicalData[historicalData.length - 1].timestamp.getTime() - t0.getTime()) / 1000;

  const chartData = historicalData.map((point, index) => {
    const seconds = (point.timestamp.getTime() - t0.getTime()) / 1000;
    return {
      seconds,
      'Peak Pressure': Math.round(point.peakPressure),
      'Contact Area': Math.round(point.contactArea),
      'Risk Score': Number(point.riskScore),
    };
  });

  const formatSeconds = (value: number) => {
    const s = Math.round(value);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return ss === 0 ? `${m}m` : `${m}m ${ss}s`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900">Trend Analysis</h3>
        </div>
        <div className="text-sm text-slate-500">
          {formatSeconds(totalDuration)} total duration
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Pressure Trend */}
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-3">Peak Pressure (raw values)</h4>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="seconds"
                type="number"
                tickFormatter={formatSeconds}
                ticks={[0, 30, 60, 120, 180, 240, 300]} // 0s, 30s, 1m, 2m, 3m, 4m, 5m
                tick={{ fontSize: 11, fill: '#64748b' }}
                domain={['dataMin', 'dataMax']}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                label={{
                  value: 'mmHg',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 11, fill: '#64748b' },
                }}
              />
              <Tooltip
                labelFormatter={(value) => formatSeconds(Number(value))}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Line
                type="monotone"
                dataKey="Peak Pressure"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Contact Area Trend */}
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-3">Contact Area (%)</h4>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="seconds"
                type="number"
                tickFormatter={formatSeconds}
                ticks={[0, 30, 60, 120, 180, 240, 300]}
                tick={{ fontSize: 11, fill: '#64748b' }}
                domain={['dataMin', 'dataMax']}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                label={{
                  value: '%',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 11, fill: '#64748b' },
                }}
              />
              <Tooltip
                labelFormatter={(value) => formatSeconds(Number(value))}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Line
                type="monotone"
                dataKey="Contact Area"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Score - Full Width */}
        {detailed && (
          <div className="lg:col-span-2">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Risk Score</h4>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="seconds"
                  type="number"
                  tickFormatter={formatSeconds}
                  ticks={[0, 30, 60, 120, 180, 240, 300]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  domain={['dataMin', 'dataMax']}
                />
                <YAxis
                  domain={[0, 10]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  label={{
                    value: 'Risk Score',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 11, fill: '#64748b' },
                  }}
                />
                <Tooltip
                  labelFormatter={(value) => formatSeconds(Number(value))}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="Risk Score"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
