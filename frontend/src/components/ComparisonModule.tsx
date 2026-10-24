import React, { useEffect, useState } from 'react';
import { HeatmapGrid } from './HeatmapGrid';
import { ArrowRight, Calendar } from 'lucide-react';
import api from '../api';

interface ComparisonResponse {
  has_data: boolean;
  period: string;
  upload_id: number | null;
  frame_index: number | null;
  total_frames: number;
  frame: number[][] | null;
  recorded_at: string | null;
}

interface ComparisonModuleProps {
  patientId?: string | number | null;
}

export function ComparisonModule({ patientId }: ComparisonModuleProps = {}) {
  const [comparisonType, setComparisonType] = useState<'hour' | 'day'>('hour');
  const [referenceData, setReferenceData] = useState<ComparisonResponse | null>(null);
  const [currentData, setCurrentData] = useState<ComparisonResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const effectivePatientId = patientId !== '' && patientId != null ? patientId : null;
    if (!effectivePatientId) {
      setReferenceData(null);
      setCurrentData(null);
      setLoading(false);
      return;
    }

    const fetchComparison = async () => {
      setLoading(true);
      try {
        const referencePeriod = comparisonType === 'hour' ? 'last_hour' : 'yesterday';
        const currentPeriod = comparisonType === 'hour' ? 'this_hour' : 'today';

        const [referenceRes, currentRes] = await Promise.all([
          api.get('/api/pressure/comparison-heatmap/', {
            params: { period: referencePeriod, patient: effectivePatientId },
          }),
          api.get('/api/pressure/comparison-heatmap/', {
            params: { period: currentPeriod, patient: effectivePatientId },
          }),
        ]);

        setReferenceData(referenceRes.data);
        setCurrentData(currentRes.data);
      } catch (error) {
        console.error('Failed to fetch comparison heatmaps', error);
        setReferenceData(null);
        setCurrentData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [comparisonType, patientId]);

  const calculateChange = (current: number[][], comparison: number[][]) => {
    let currentSum = 0, comparisonSum = 0, count = 0;

    current.forEach((row, i) => {
      row.forEach((cell, j) => {
        if (cell > 10) {
          currentSum += cell;
          comparisonSum += comparison[i][j];
          count++;
        }
      });
    });

    if (count === 0) {
      return { avgChange: 0, percentChange: '0.0' };
    }

    const currentAvg = currentSum / count;
    const comparisonAvg = comparisonSum / count;

    if (comparisonAvg === 0) {
      return { avgChange: currentAvg, percentChange: '0.0' };
    }

    const percentChange = ((currentAvg - comparisonAvg) / comparisonAvg) * 100;

    return {
      avgChange: currentAvg - comparisonAvg,
      percentChange: percentChange.toFixed(1),
    };
  };

  const changes =
    referenceData?.has_data && currentData?.has_data && referenceData.frame && currentData.frame
      ? calculateChange(currentData.frame, referenceData.frame)
      : null;

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900">Comparison View</h3>
        <p className="text-sm text-slate-500 mt-2">Loading comparison data...</p>
      </div>
    );
  }

  const referenceLabel = comparisonType === 'hour' ? 'Last Hour' : 'Yesterday';
  const currentLabel = comparisonType === 'hour' ? 'This Hour' : 'Today';

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 relative">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900">Comparison View</h3>
        </div>

        <div className="flex gap-2 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setComparisonType('hour')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              comparisonType === 'hour'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            This Hour vs. Last Hour
          </button>
          <button
            onClick={() => setComparisonType('day')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              comparisonType === 'day'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Today vs. Yesterday
          </button>
        </div>
      </div>

      {!referenceData?.has_data && !currentData?.has_data ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
          No comparison data available for these periods.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <div className="mb-3">
                <p className="text-sm font-medium text-slate-700">{referenceLabel}</p>
                <p className="text-xs text-slate-500">
                  {referenceData?.has_data ? 'Reference period' : 'No data'}
                </p>
              </div>
              {referenceData?.has_data && referenceData.frame ? (
                <HeatmapGrid data={referenceData.frame} size={32} />
              ) : (
                <div className="h-[320px] rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-sm text-slate-400">
                  No data
                </div>
              )}
            </div>

            <div className="hidden md:flex items-center justify-center absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="bg-white rounded-full p-3 shadow-lg border-2 border-blue-600">
                <ArrowRight className="w-6 h-6 text-blue-600" />
              </div>
            </div>

            <div>
              <div className="mb-3">
                <p className="text-sm font-medium text-slate-700">{currentLabel}</p>
                <p className="text-xs text-slate-500">
                  {currentData?.has_data ? 'Current period' : 'No data'}
                </p>
              </div>
              {currentData?.has_data && currentData.frame ? (
                <HeatmapGrid data={currentData.frame} size={32} />
              ) : (
                <div className="h-[320px] rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-sm text-slate-400">
                  No data
                </div>
              )}
            </div>
          </div>

          {changes && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Change in Average Pressure</p>
                  <p className="text-xs text-slate-600">
                    Comparing {comparisonType === 'hour' ? 'this hour to last hour' : 'today to yesterday'}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-2xl font-bold ${
                      parseFloat(changes.percentChange) > 0 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {parseFloat(changes.percentChange) > 0 ? '+' : ''}
                    {changes.percentChange}%
                  </p>
                  <p className="text-xs text-slate-600">
                    {changes.avgChange > 0 ? '+' : ''}
                    {changes.avgChange.toFixed(1)} mmHg
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
