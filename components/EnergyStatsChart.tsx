
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { EnergySeriesPoint } from '../types';
import { COLORS } from '../constants';

interface EnergyStatsChartProps {
  data: EnergySeriesPoint[];
  theme: 'light' | 'dark';
  selectedMetric?: string; // 'ALL', 'generation', 'consumption', 'selfConsumption', 'export', 'import'
  unit?: string; // 'kW' or 'kWh'
}

export const EnergyStatsChart: React.FC<EnergyStatsChartProps> = ({
  data,
  theme,
  selectedMetric = 'ALL',
  unit = 'kWh'
}) => {
  // Theme-dependent colors
  const gridColor = theme === 'dark' ? COLORS.GRID : '#e2e8f0';
  const axisColor = theme === 'dark' ? COLORS.TEXT : '#64748b';

  // Tooltip styling variables
  const tooltipBg = theme === 'dark' ? '#0f172a' : '#ffffff';
  const tooltipBorder = theme === 'dark' ? '#334155' : '#cbd5e1';
  const labelColor = theme === 'dark' ? '#cbd5e1' : '#1e293b';
  const valueColor = theme === 'dark' ? '#ffffff' : '#0f172a';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="p-3 rounded-lg shadow-xl z-50 border"
          style={{ backgroundColor: tooltipBg, borderColor: tooltipBorder }}
        >
          <p className="mb-2 font-semibold text-sm" style={{ color: labelColor }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm mb-1">
              <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: entry.fill }}></div>
              <span style={{ color: labelColor }}>{entry.name}:</span>
              <span className="font-bold font-mono" style={{ color: valueColor }}>
                {Number(entry.value).toFixed(2)} {unit}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const showAll = selectedMetric === 'ALL';

  return (
    <div className="w-full h-full min-h-[350px] bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-lg flex flex-col transition-colors duration-300">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="label"
              stroke={axisColor}
              tick={{ fontSize: 12, fill: axisColor }}
              interval="preserveStartEnd"
            />
            <YAxis
              type="number"
              stroke={axisColor}
              tick={{ fontSize: 12 }}
              unit={` ${unit}`}
            />
            <Tooltip
              cursor={{ fill: theme === 'dark' ? '#334155' : '#f1f5f9', opacity: 0.4 }}
              content={<CustomTooltip />}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />

            {(showAll || selectedMetric === 'generation') && (
              <Bar
                dataKey="generation"
                name="Proizvodnja"
                fill={COLORS.PV}
                radius={[4, 4, 0, 0]}
                animationDuration={500}
              />
            )}
            {(showAll || selectedMetric === 'consumption') && (
              <Bar
                dataKey="consumption"
                name="Potrošnja"
                fill={COLORS.LOAD}
                radius={[4, 4, 0, 0]}
                animationDuration={500}
              />
            )}
            {(showAll || selectedMetric === 'selfConsumption') && (
              <Bar
                dataKey="selfConsumption"
                name="Samopotrošnja"
                fill={COLORS.SELF}
                radius={[4, 4, 0, 0]}
                animationDuration={500}
              />
            )}
            {(showAll || selectedMetric === 'export') && (
              <Bar
                dataKey="export"
                name="Predato"
                fill={COLORS.EXPORT}
                radius={[4, 4, 0, 0]}
                animationDuration={500}
              />
            )}
            {(showAll || selectedMetric === 'import') && (
              <Bar
                dataKey="import"
                name="Preuzeto"
                fill={COLORS.IMPORT}
                radius={[4, 4, 0, 0]}
                animationDuration={500}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
