import React from 'react';
import { AlertTriangle, Info, AlertCircle, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface Alert {
  id: string;
  type: 'warning' | 'info' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
}

interface SmartAlertProps {
  alert: Alert;
}

export function SmartAlert({ alert }: SmartAlertProps) {
  const [dismissed, setDismissed] = React.useState(false);

  const alertStyles = {
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      icon: 'text-yellow-600',
      IconComponent: AlertTriangle
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      icon: 'text-blue-600',
      IconComponent: Info
    },
    critical: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      icon: 'text-red-600',
      IconComponent: AlertCircle
    }
  };

  const style = alertStyles[alert.type];
  const Icon = style.IconComponent;

  if (dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className={`${style.bg} border-2 ${style.border} rounded-xl p-4 shadow-lg`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 ${style.bg} rounded-lg`}>
          <Icon className={`w-5 h-5 ${style.icon}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between mb-1">
            <h4 className="font-semibold text-slate-900">{alert.title}</h4>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 hover:bg-slate-200/50 rounded transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          <p className="text-sm text-slate-700 mb-2">{alert.message}</p>
          <p className="text-xs text-slate-500">
            {alert.timestamp.toLocaleTimeString()} - AI-powered Smart Alert
          </p>
        </div>
      </div>
    </motion.div>
  );
}
