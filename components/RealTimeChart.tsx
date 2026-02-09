import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { SolarReading } from '../types';
import { COLORS } from '../constants';
import { RefreshCcw } from 'lucide-react';

interface RealTimeChartProps {
  data: SolarReading[];
  selectedMetric: string; // 'ALL' | 'P_pv' | 'P_load' | etc.
  onReset: () => void;
  theme: 'light' | 'dark';
}

export const RealTimeChart: React.FC<RealTimeChartProps> = ({ data, selectedMetric, onReset, theme }) => {
  
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getChartTitle = () => {
    switch (selectedMetric) {
      case 'P_pv': return 'Proizvodnja (PV)';
      case 'P_load': return 'Ukupna potrošnja';
      case 'P_self': return 'Samopotrošnja';
      case 'P_export': return 'Predato u mrežu';
      case 'P_import': return 'Preuzeto iz mreže';
      default: return 'Tok snage u realnom vremenu';
    }
  };

  const showPv = selectedMetric === 'ALL' || selectedMetric === 'P_pv';
  const showLoad = selectedMetric === 'ALL' || selectedMetric === 'P_load';
  const showSelf = selectedMetric === 'ALL' || selectedMetric === 'P_self';
  const showExport = selectedMetric === 'P_export';
  const showImport = selectedMetric === 'P_import';

  // Theme-dependent colors
  const gridColor = theme === 'dark' ? COLORS.GRID : '#e2e8f0'; // slate-200 for light
  const axisColor = theme === 'dark' ? COLORS.TEXT : '#64748b'; // slate-500 for light
  const tooltipBg = theme === 'dark' ? '#0f172a' : '#ffffff';
  const tooltipBorder = theme === 'dark' ? '#334155' : '#cbd5e1';
  const tooltipText = theme === 'dark' ? '#e2e8f0' : '#1e293b';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div 
          className="p-3 rounded shadow-xl z-50 border"
          style={{ backgroundColor: tooltipBg, borderColor: tooltipBorder }}
        >
          <p className="mb-2 font-mono" style={{ color: tooltipText }}>{formatTime(label)}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1 text-sm">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <span className="capitalize" style={{ color: axisColor }}>{entry.name}:</span>
              <span className="font-bold" style={{ color: tooltipText }}>{entry.value.toFixed(2)} kW</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full min-h-[350px] bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-lg flex flex-col transition-colors duration-300">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h3 className="text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-2">
          <span className={`w-2 h-6 rounded-sm ${selectedMetric === 'ALL' ? 'bg-blue-500' : 'bg-amber-500'}`}></span>
          {getChartTitle()} <span className="text-slate-500 font-normal text-sm">(kW)</span>
        </h3>
        
        {selectedMetric !== 'ALL' && (
          <button 
            onClick={onReset}
            className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs rounded transition-colors border border-slate-200 dark:border-slate-600"
          >
            <RefreshCcw size={12} />
            Prikaži sve
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.PV} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.PV} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.LOAD} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.LOAD} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorSelf" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.SELF} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.SELF} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExport" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.EXPORT} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.EXPORT} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorImport" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.IMPORT} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.IMPORT} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={formatTime} 
              stroke={axisColor} 
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
              minTickGap={30}
            />
            <YAxis stroke={axisColor} tick={{ fontSize: 12 }} unit=" kW" />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            
            {showPv && (
              <Area 
                type="monotone" 
                dataKey="P_pv" 
                name="Proizvodnja (PV)" 
                stroke={COLORS.PV} 
                fillOpacity={1} 
                fill="url(#colorPv)" 
                strokeWidth={2}
                animationDuration={500}
              />
            )}
            {showLoad && (
              <Area 
                type="monotone" 
                dataKey="P_load" 
                name="Potrošnja" 
                stroke={COLORS.LOAD} 
                fillOpacity={1} 
                fill="url(#colorLoad)" 
                strokeWidth={2}
                animationDuration={500}
              />
            )}
            {showSelf && (
              <Area 
                type="monotone" 
                dataKey="P_self" 
                name="Samopotrošnja" 
                stroke={COLORS.SELF} 
                fillOpacity={1} 
                fill="url(#colorSelf)" 
                strokeWidth={2} 
                strokeDasharray={selectedMetric === 'ALL' ? "5 5" : ""}
                animationDuration={500}
              />
            )}
            {showExport && (
              <Area 
                type="monotone" 
                dataKey="P_export" 
                name="Predato u mrežu" 
                stroke={COLORS.EXPORT} 
                fillOpacity={1} 
                fill="url(#colorExport)" 
                strokeWidth={2}
                animationDuration={500}
              />
            )}
            {showImport && (
              <Area 
                type="monotone" 
                dataKey="P_import" 
                name="Preuzeto iz mreže" 
                stroke={COLORS.IMPORT} 
                fillOpacity={1} 
                fill="url(#colorImport)" 
                strokeWidth={2}
                animationDuration={500}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};