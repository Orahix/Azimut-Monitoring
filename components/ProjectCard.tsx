import React from 'react';
import { Project } from '../types';
import { MapPin, BatteryCharging, AlertCircle, CheckCircle, Power, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onEdit }) => {
  // Helper to calculate self-consumption %
  const scPercent = project.todayEnergyKwh > 0 
    ? Math.round((project.todaySelfConsumptionKwh / project.todayEnergyKwh) * 100) 
    : 0;

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'ONLINE': return 'text-green-500 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30';
      case 'WARNING': return 'text-amber-500 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/30';
      case 'OFFLINE': return 'text-red-500 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30';
      default: return 'text-slate-500';
    }
  };

  // Fake sparkline data based on current power
  const sparkData = [
    { v: 0 }, { v: project.currentPowerKw * 0.2 }, { v: project.currentPowerKw * 0.5 }, 
    { v: project.currentPowerKw * 0.8 }, { v: project.currentPowerKw }, { v: project.currentPowerKw * 0.9 }
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col relative group">
      
      {/* Edit Button - Absolute Position */}
      {onEdit && (
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit(project);
          }}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white dark:bg-slate-700 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 border border-slate-200 dark:border-slate-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          title="Izmeni Projekat"
        >
          <Pencil size={14} />
        </button>
      )}

      <div className="p-5 flex-1">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg truncate pr-8" title={project.name}>
              {project.name}
            </h3>
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs mt-1">
              <MapPin size={12} />
              {project.location}
            </div>
          </div>
          <div className={`px-2 py-1 rounded text-xs font-bold border flex items-center gap-1 ${getStatusColor(project.status)}`}>
            {project.status === 'ONLINE' && <CheckCircle size={10} />}
            {project.status === 'WARNING' && <AlertCircle size={10} />}
            {project.status === 'OFFLINE' && <Power size={10} />}
            {project.status}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Snaga (Trenutno)</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900 dark:text-white">{project.currentPowerKw.toFixed(2)}</span>
              <span className="text-xs text-slate-500">kW</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Danas (Energija)</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900 dark:text-white">{project.todayEnergyKwh.toFixed(1)}</span>
              <span className="text-xs text-slate-500">kWh</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
           <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <BatteryCharging size={12} className="text-green-500" />
                Samopotrošnja
              </span>
              <span className="text-sm font-bold text-green-600 dark:text-green-400">{scPercent}%</span>
           </div>
           <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
             <div 
                className="bg-green-500 h-full rounded-full" 
                style={{ width: `${scPercent}%` }}
             ></div>
           </div>
        </div>
      </div>

      {/* Sparkline Area */}
      <div className="h-12 w-full opacity-50">
         <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData}>
              <Area type="monotone" dataKey="v" stroke="#f59e0b" fill="#f59e0b" strokeWidth={2} />
            </AreaChart>
         </ResponsiveContainer>
      </div>

      <Link 
        to={`/plant/${project.id}`}
        className="block w-full py-3 text-center text-sm font-medium text-amber-600 dark:text-amber-400 bg-slate-50 dark:bg-slate-800/50 hover:bg-amber-50 dark:hover:bg-amber-900/20 border-t border-slate-200 dark:border-slate-700 transition-colors rounded-b-xl"
      >
        Otvori Detalje &rarr;
      </Link>
    </div>
  );
};