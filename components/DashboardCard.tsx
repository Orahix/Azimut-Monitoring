import React from 'react';

interface DashboardCardProps {
  title: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  colorClass: string;
  subValue?: string;
  timestamp?: string;
  onClick?: () => void;
  isActive?: boolean;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  unit,
  icon,
  colorClass,
  subValue,
  timestamp,
  onClick,
  isActive = false
}) => {
  const baseBorderColor = 'border-slate-200 dark:border-slate-700';
  const hoverBg = 'hover:bg-slate-50 dark:hover:bg-slate-750';

  // Extract the color name (e.g., 'amber') from 'text-amber-400'
  const colorName = colorClass.split('-')[1];

  const activeClasses = isActive
    ? `border-${colorName}-500 ring-1 ring-${colorName}-500 bg-${colorName}-50 dark:bg-slate-700/50`
    : `${baseBorderColor} ${hoverBg} bg-white dark:bg-slate-800`;

  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <div
      onClick={onClick}
      className={`
        rounded-xl p-6 border shadow-sm dark:shadow-lg flex items-center justify-between 
        transition-all duration-200 cursor-pointer hover:scale-[1.02] select-none
        ${activeClasses}
      `}
    >
      <div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">{title}</p>
        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-bold ${colorClass}`}>
            {value.toFixed(2)}
          </span>
          <span className="text-slate-600 dark:text-slate-500 font-medium text-sm">{unit}</span>
        </div>
        {subValue && (
          <p className="text-xs text-slate-500 mt-2">{subValue}</p>
        )}
        {formattedTime && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 font-mono tracking-wide flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
            {formattedTime}
          </p>
        )}
      </div>
      <div className={`p-3 rounded-full bg-opacity-10 ${colorClass.replace('text-', 'bg-')}`}>
        {icon}
      </div>
    </div>
  );
};