import React from 'react';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';

interface TimelineScrubberProps {
  timeRange: '1h' | '6h' | '24h';
  onTimeRangeChange: (range: '1h' | '6h' | '24h') => void;
  position: number;
  onPositionChange: (position: number) => void;
}

export function TimelineScrubber({ 
  timeRange, 
  onTimeRangeChange, 
  position, 
  onPositionChange 
}: TimelineScrubberProps) {
  const formatTime = (pos: number): string => {
    const ranges = {
      '1h': 60,
      '6h': 360,
      '24h': 1440
    };
    
    const totalMinutes = ranges[timeRange];
    const minutesAgo = Math.round((100 - pos) / 100 * totalMinutes);
    
    if (minutesAgo === 0) return 'Now';
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    
    const hours = Math.floor(minutesAgo / 60);
    const mins = minutesAgo % 60;
    return mins > 0 ? `${hours}h ${mins}m ago` : `${hours}h ago`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900">Timeline Explorer</h3>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex gap-2 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => onTimeRangeChange('1h')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              timeRange === '1h'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1 Hour
          </button>
          <button
            onClick={() => onTimeRangeChange('6h')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              timeRange === '6h'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            6 Hours
          </button>
          <button
            onClick={() => onTimeRangeChange('24h')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              timeRange === '24h'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            24 Hours
          </button>
        </div>
      </div>

      {/* Scrubber Controls */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onPositionChange(Math.max(0, position - 5))}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={position === 0}
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          
          <div className="flex-1">
            <input
              type="range"
              min="0"
              max="100"
              value={position}
              onChange={(e) => onPositionChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${position}%, #e2e8f0 ${position}%, #e2e8f0 100%)`
              }}
            />
          </div>
          
          <button
            onClick={() => onPositionChange(Math.min(100, position + 5))}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={position === 100}
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">
            {timeRange === '1h' ? '1 hour ago' : timeRange === '6h' ? '6 hours ago' : '24 hours ago'}
          </span>
          <span className="font-medium text-blue-600">{formatTime(position)}</span>
          <span className="text-slate-600">Now</span>
        </div>
      </div>

      {/* Timeline Markers */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span>Normal readings</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            <span>Elevated pressure</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
            <span>Alert triggered</span>
          </div>
        </div>
      </div>
    </div>
  );
}
