import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface HeatmapGridProps {
  data: number[][];
  size: number;
  showGrid?: boolean;
}




export function HeatmapGrid({ data, size, showGrid = false }: HeatmapGridProps) {
  // Color interpolation for heatmap (Blue -> Cyan -> Green -> Yellow -> Red)

  const getColor = (value: number): string => {
   

    if (value === 0) return 'rgb(240, 244, 248)';
    // Normalize value to 0-1 range (assuming max pressure of 250 mmHg)
    const normalized = Math.min(value / 250, 1);
    
    if (normalized < 0.2) {
      // Blue to Cyan
      const t = normalized / 0.2;
      return `rgb(${Math.round(59 + (34 - 59) * t)}, ${Math.round(130 + (211 - 130) * t)}, ${Math.round(246 + (238 - 246) * t)})`;
    } else if (normalized < 0.4) {
      // Cyan to Green
      const t = (normalized - 0.2) / 0.2;
      return `rgb(${Math.round(34 + (16 - 34) * t)}, ${Math.round(211 + (185 - 211) * t)}, ${Math.round(238 + (129 - 238) * t)})`;
    } else if (normalized < 0.6) {
      // Green to Yellow
      const t = (normalized - 0.4) / 0.2;
      return `rgb(${Math.round(16 + (234 - 16) * t)}, ${Math.round(185 + (179 - 185) * t)}, ${Math.round(129 + (8 - 129) * t)})`;
    } else if (normalized < 0.8) {
      // Yellow to Orange
      const t = (normalized - 0.6) / 0.2;
      return `rgb(${Math.round(234 + (249 - 234) * t)}, ${Math.round(179 + (115 - 179) * t)}, ${Math.round(8 + (22 - 8) * t)})`;
    } else {
      // Orange to Red
      const t = (normalized - 0.8) / 0.2;
      return `rgb(${Math.round(249 + (220 - 249) * t)}, ${Math.round(115 + (38 - 115) * t)}, ${Math.round(22 + (38 - 22) * t)})`;
    }
  };

  const cellSize = useMemo(() => {
    return Math.floor(500 / size);
  }, [size]);

  

  return (
    <div className="flex flex-col items-center">
      {/* Heatmap Grid */}
      <div 
        className="relative bg-slate-100 rounded-lg overflow-hidden shadow-inner"
        style={{ 
          width: `${size * cellSize}px`, 
          height: `${size * cellSize}px`,
          border: '2px solid #cbd5e1'
        }}
      >
        {data.map((row, rowIndex) => (
          <div key={rowIndex} className="flex">
            {row.map((value, colIndex) => (
              <motion.div
                key={`${rowIndex}-${colIndex}`}
                className={showGrid ? 'border border-slate-200/30' : ''}
                style={{
                  width: `${cellSize}px`,
                  height: `${cellSize}px`,
                  backgroundColor: getColor(value)
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 w-full max-w-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-600">Pressure Scale (raw Units)</span>
        </div>
        <div className="relative h-8 rounded-lg overflow-hidden shadow-sm" style={{
          background: 'linear-gradient(to right, rgb(59, 130, 246), rgb(34, 211, 238), rgb(16, 185, 129), rgb(234, 179, 8), rgb(249, 115, 22), rgb(220, 38, 38))'
        }}>
          <div className="absolute inset-0 flex items-center justify-between px-2 text-xs font-semibold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
            <span>0</span>
            <span>50</span>
            <span>100</span>
            <span>150</span>
            <span>200</span>
            <span>250+</span>
          </div>
        </div>
      </div>
    </div>
  );
}
