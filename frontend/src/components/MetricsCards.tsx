import React from 'react';
import { TrendingUp, Target, AlertTriangle, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

interface Metrics {
  peakPressure: number;
  contactArea: number;
  riskScore: number;
  avgOnContact: number;
}

interface MetricsCardsProps {
  metrics: Metrics;
  detailed?: boolean;
}

export function MetricsCards({ metrics, detailed = false }: MetricsCardsProps) {
  const getRiskColor = (score: number) => {
    if (score <= 3) return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-600' };
    if (score <= 6) return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: 'text-yellow-600' };
    return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-600' };
  };

  const riskColors = getRiskColor(metrics.riskScore);

  return (
    <div className="space-y-4">
      {/* Peak Pressure */}
      <motion.div 
        className="bg-white rounded-xl shadow-lg border border-slate-200 p-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-1">Peak Pressure Index</p>
            <p className="text-3xl font-bold text-slate-900">{metrics.peakPressure.toFixed(1)}</p>
            <p className="text-xs text-slate-500 mt-1">mmHg</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        {detailed && (
          <div className="pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-600">
              {/* <strong>Location:</strong> Heel region (right)<br/>
              <strong>Duration:</strong> 45 minutes */}
            </p>
          </div>
        )}
      </motion.div>

      {/* Contact Area */}
      <motion.div 
        className="bg-white rounded-xl shadow-lg border border-slate-200 p-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-1">Contact Area</p>
            <p className="text-3xl font-bold text-slate-900">{metrics.contactArea.toFixed(1)}%</p>
            <p className="text-xs text-slate-500 mt-1">of sensor mat</p>
          </div>
          <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Target className="w-6 h-6 text-emerald-600" />
          </div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <motion.div 
            className="bg-emerald-500 h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${metrics.contactArea}%` }}
            transition={{ duration: 0.6, delay: 0.2 }}
          />
        </div>
        {detailed && (
          <div className="pt-3 border-t border-slate-100 mt-3">
            <p className="text-xs text-slate-600">
              <strong>Target:</strong> {'>'} 55% for optimal distribution
            </p>
          </div>
        )}
      </motion.div>

      {/* Risk Score */}
      <motion.div 
        className={`rounded-xl shadow-lg border-2 ${riskColors.border} ${riskColors.bg} p-5`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className={`text-sm font-medium ${riskColors.text} mb-1`}>Risk Score</p>
            <p className={`text-3xl font-bold ${riskColors.text}`}>{metrics.riskScore.toFixed(1)}</p>
            <p className={`text-xs ${riskColors.text} opacity-75 mt-1`}>out of 10</p>
          </div>
          <div className={`w-12 h-12 ${riskColors.bg} border-2 ${riskColors.border} rounded-lg flex items-center justify-center`}>
            <AlertTriangle className={`w-6 h-6 ${riskColors.icon}`} />
          </div>
        </div>
        
        {/* Risk Gauge */}
        <div className="relative">
          <div className="w-full bg-white/50 rounded-full h-3 overflow-hidden">
            <motion.div 
              className={`h-full rounded-full ${
                metrics.riskScore <= 3 ? 'bg-green-500' :
                metrics.riskScore <= 6 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${(metrics.riskScore / 10) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
          </div>
        </div>
        
        {detailed && (
          <div className="pt-3 border-t border-current opacity-20 mt-3">
            <p className={`text-xs ${riskColors.text}`}>
              <strong>Status:</strong>{" "}
{metrics.riskScore <= 3
  ? "Low risk - Continue monitoring"
  : metrics.riskScore <= 5
  ? "Caution - Reposition and monitor closely"
  : metrics.riskScore <= 7
  ? "Moderate - Review positioning"
  : "Elevated - Immediate attention recommended"}
            </p>
          </div>
        )}
      </motion.div>

      {/* Additional Metric - Average Pressure */}
      {detailed && (
        <motion.div 
          className="bg-white rounded-xl shadow-lg border border-slate-200 p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Average Pressure</p>
              <p className="text-3xl font-bold text-slate-900">{metrics.avgOnContact}</p>
              <p className="text-xs text-slate-500 mt-1">mmHg</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
