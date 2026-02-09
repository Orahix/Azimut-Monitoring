import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Project } from '../types';
import L from 'leaflet';
import { BatteryCharging, Sun, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

// Fix for Leaflet default icons in React
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface ProjectsMapProps {
  projects: Project[];
}

export const ProjectsMap: React.FC<ProjectsMapProps> = ({ projects }) => {
  // Center map on Serbia approximately
  const defaultCenter: [number, number] = [44.2, 20.9];
  
  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm z-0 relative">
      <MapContainer 
        center={defaultCenter} 
        zoom={7} 
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {projects.map(project => (
          <Marker 
            key={project.id} 
            position={[project.latitude, project.longitude]}
            icon={icon}
          >
            <Popup className="project-popup">
              <div className="p-1 min-w-[200px]">
                <h3 className="font-bold text-slate-900 text-lg border-b pb-1 mb-2">{project.name}</h3>
                
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 flex items-center gap-1"><Zap size={14}/> Snaga:</span>
                    <span className="font-bold text-amber-600">{project.currentPowerKw.toFixed(2)} kW</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 flex items-center gap-1"><Sun size={14}/> Danas:</span>
                    <span className="font-bold text-slate-700">{project.todayEnergyKwh.toFixed(1)} kWh</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 flex items-center gap-1"><BatteryCharging size={14}/> Potrošnja:</span>
                    <span className="font-bold text-blue-600">{(project.todayEnergyKwh * 0.8).toFixed(1)} kWh</span>
                  </div>
                </div>

                <div className={`text-xs font-bold px-2 py-1 rounded inline-block mb-3 ${
                  project.status === 'ONLINE' ? 'bg-green-100 text-green-700' :
                  project.status === 'WARNING' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {project.status}
                </div>

                <Link 
                  to={`/plant/${project.id}`}
                  className="block w-full text-center bg-amber-500 hover:bg-amber-600 text-white font-bold py-1.5 rounded transition-colors text-sm"
                >
                  Otvori Detalje
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};