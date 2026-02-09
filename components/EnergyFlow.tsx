import React from 'react';
import { Sun, Home, Zap } from 'lucide-react';
import { COLORS } from '../constants';

interface EnergyFlowProps {
  pv: number;
  load: number;
  grid: number; // Positive = Import, Negative = Export
}

export const EnergyFlow: React.FC<EnergyFlowProps> = ({ pv, load, grid }) => {
  // Calculate flow components
  const p_import = Math.max(0, grid);
  const p_export = Math.max(0, -grid);
  const p_self = Math.max(0, pv - p_export);

  // Helper to calculate animation duration based on power
  // Formula: duration = k / sqrt(power)
  // Higher power -> Faster animation -> Lower duration
  const getDuration = (power: number) => {
    if (power <= 0.05) return 0;
    // Base speed factor (adjust 1.5 for overall speed)
    // Sqrt makes the speed difference less extreme between low/high power
    const d = 1.5 / Math.sqrt(Math.max(0.1, power));
    // Clamp duration between 0.4s (fastest) and 3.0s (slowest)
    return Math.max(0.4, Math.min(3.0, d));
  };

  const durSelf = getDuration(p_self);
  const durExport = getDuration(p_export);
  const durImport = getDuration(p_import);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm h-full flex flex-col">
      <h3 className="text-slate-800 dark:text-slate-200 font-semibold mb-4 text-center">
        Energetski Tok
      </h3>
      
      <div className="relative flex-1 min-h-[300px] w-full select-none overflow-hidden">
        {/* Dynamic Keyframes for Flow Animation */}
        <style>
          {`
            @keyframes flow-dashed {
              to {
                stroke-dashoffset: -24;
              }
            }
          `}
        </style>
        
        {/* SVG Visualization Layer */}
        {/* viewBox 0 0 400 320 defines the coordinate system */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 320" preserveAspectRatio="xMidYMid meet">
          
          {/* PATHS */}
          
          {/* Path 1: Solar (Top) -> Home (Bottom Left) 
              Represents: Self Consumption
          */}
          <path 
            d="M 200 80 L 100 240" 
            fill="none"
            stroke={p_self > 0.05 ? COLORS.SELF : 'currentColor'} 
            strokeOpacity={p_self > 0.05 ? 1 : 0.1}
            strokeWidth={p_self > 0.05 ? 3 : 2}
            strokeDasharray="12 12"
            strokeLinecap="round"
            className={p_self <= 0.05 ? "text-slate-300 dark:text-slate-700" : ""}
            style={{ 
              animation: p_self > 0.05 ? `flow-dashed ${durSelf}s linear infinite` : 'none',
            }}
          />

          {/* Path 2: Solar (Top) -> Grid (Bottom Right)
              Represents: Export
          */}
          <path 
            d="M 200 80 L 300 240" 
            fill="none"
            stroke={p_export > 0.05 ? COLORS.EXPORT : 'currentColor'} 
            strokeOpacity={p_export > 0.05 ? 1 : 0.1}
            strokeWidth={p_export > 0.05 ? 3 : 2}
            strokeDasharray="12 12"
            strokeLinecap="round"
            className={p_export <= 0.05 ? "text-slate-300 dark:text-slate-700" : ""}
            style={{ 
              animation: p_export > 0.05 ? `flow-dashed ${durExport}s linear infinite` : 'none',
            }}
          />

          {/* Path 3: Grid (Bottom Right) -> Home (Bottom Left)
              Represents: Import
              Direction Right to Left matches standard flow of Import
          */}
          <path 
            d="M 300 240 L 100 240" 
            fill="none"
            stroke={p_import > 0.05 ? COLORS.IMPORT : 'currentColor'} 
            strokeOpacity={p_import > 0.05 ? 1 : 0.1}
            strokeWidth={p_import > 0.05 ? 3 : 2}
            strokeDasharray="12 12"
            strokeLinecap="round"
            className={p_import <= 0.05 ? "text-slate-300 dark:text-slate-700" : ""}
            style={{ 
              animation: p_import > 0.05 ? `flow-dashed ${durImport}s linear infinite` : 'none',
            }}
          />

        </svg>

        {/* NODES LAYER (HTML over SVG) */}
        
        {/* Solar Node (Top Center) */}
        <div className="absolute top-[40px] left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className={`
              w-16 h-16 rounded-full border-4 flex items-center justify-center shadow-xl z-10 transition-colors duration-500
              ${pv > 0.05 
                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700' 
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}
            `}>
                <Sun className={`${pv > 0.05 ? "text-amber-500 animate-pulse" : "text-slate-400"}`} size={32} />
            </div>
            <div className="mt-2 text-center bg-white/90 dark:bg-slate-900/90 backdrop-blur px-3 py-1 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Proizvodnja</p>
                <p className={`text-lg font-bold ${pv > 0.05 ? 'text-amber-500' : 'text-slate-400'}`}>
                  {pv.toFixed(2)} <span className="text-xs">kW</span>
                </p>
            </div>
        </div>

        {/* Home Node (Bottom Left) */}
        <div className="absolute bottom-[40px] left-[25%] -translate-x-1/2 flex flex-col items-center">
             <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 border-4 border-blue-200 dark:border-blue-800 flex items-center justify-center shadow-xl z-10">
                <Home className="text-blue-500" size={32} />
            </div>
             <div className="mt-2 text-center bg-white/90 dark:bg-slate-900/90 backdrop-blur px-3 py-1 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Potrošnja</p>
                <p className="text-lg font-bold text-blue-500">
                  {load.toFixed(2)} <span className="text-xs">kW</span>
                </p>
            </div>
        </div>

        {/* Grid Node (Bottom Right) */}
        <div className="absolute bottom-[40px] right-[25%] translate-x-1/2 flex flex-col items-center">
             <div className={`
               w-16 h-16 rounded-full border-4 flex items-center justify-center shadow-xl z-10 transition-colors duration-500
               ${grid > 0.05 
                 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' // Import
                 : grid < -0.05 
                   ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' // Export
                   : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'} // Idle
             `}>
                <Zap 
                  className={`
                    ${grid > 0.05 ? "text-red-500" : (grid < -0.05 ? "text-orange-500" : "text-slate-400")}
                  `} 
                  size={32} 
                />
            </div>
             <div className="mt-2 text-center bg-white/90 dark:bg-slate-900/90 backdrop-blur px-3 py-1 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mreža</p>
                <p className={`text-lg font-bold ${grid > 0.05 ? "text-red-500" : (grid < -0.05 ? "text-orange-500" : "text-slate-500")}`}>
                    {Math.abs(grid).toFixed(2)} <span className="text-xs">kW</span>
                </p>
            </div>
        </div>

      </div>
    </div>
  );
};