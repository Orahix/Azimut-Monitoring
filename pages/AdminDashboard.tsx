
import React, { useEffect, useState, useRef } from 'react';
import { apiService } from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import { Project, ProjectFormData, ProjectStatus } from '../types';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectsMap } from '../components/ProjectsMap';
import { Search, Filter, Zap, Sun, BatteryCharging, Plus, X, LayoutGrid, Map as MapIcon, MapPin, Loader2 } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  // View Mode State
  const [viewMode, setViewMode] = useState<'GRID' | 'MAP'>('GRID');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    location: '',
    latitude: 44.0,
    longitude: 21.0,
    installedPowerKw: 0,
    status: 'ONLINE',
    isDemo: false
  });

  // Address Autocomplete State
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const searchTimeoutRef = useRef<any>(null);

  const fetchProjects = async () => {
    const data = await apiService.getProjects();

    // For Admin Dashboard, we want basic stats. 
    // In a real app, this would be a specialized View or aggregation query.
    const projectsWithStats = await Promise.all(data.map(async (p) => {
      const stats = await apiService.getDailyStats(p.id, p.isDemo);
      const history = await apiService.getHistory(p.id, p.isDemo);
      const latest = history.length > 0 ? history[history.length - 1] : null;

      return {
        ...p,
        currentPowerKw: latest?.P_pv || 0,
        todayEnergyKwh: stats.totalGeneration,
        todaySelfConsumptionKwh: stats.totalSelfConsumption,
        todayExportKwh: stats.totalExport,
        todayImportKwh: stats.totalImport
      };
    }));

    setProjects(projectsWithStats);
  };

  useEffect(() => {
    if (user) {
      fetchProjects();
      // Poll for dashboard updates every 10s
      const interval = setInterval(fetchProjects, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'ALL' || p.status === filter;
    return matchesSearch && matchesFilter;
  });

  // GLOBAL KPIs
  const totalPower = projects.reduce((acc, p) => acc + p.installedPowerKw, 0);
  const currentGen = projects.reduce((acc, p) => acc + p.currentPowerKw, 0);
  const todayEnergy = projects.reduce((acc, p) => acc + p.todayEnergyKwh, 0);
  const totalSelf = projects.reduce((acc, p) => acc + p.todaySelfConsumptionKwh, 0);
  const avgSelfConsumption = todayEnergy > 0 ? Math.round((totalSelf / todayEnergy) * 100) : 0;

  // --- HANDLERS ---

  const handleOpenAddModal = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      location: '',
      latitude: 44.7866, // Default Belgrade
      longitude: 20.4489,
      installedPowerKw: 5,
      status: 'ONLINE',
      isDemo: false
    });
    setAddressSuggestions([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      location: project.location,
      latitude: project.latitude,
      longitude: project.longitude,
      installedPowerKw: project.installedPowerKw,
      status: project.status,
      isDemo: project.isDemo
    });
    setAddressSuggestions([]);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingProject) {
      await apiService.updateProject(editingProject.id, formData);
    } else {
      await apiService.createProject(formData);
    }

    fetchProjects();
    setIsModalOpen(false);
  };

  // --- ADDRESS AUTOCOMPLETE LOGIC ---

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, location: value });

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Debounce search to avoid spamming the API
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearchingAddress(true);
      try {
        // Use OpenStreetMap Nominatim API
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=5`
        );
        const data = await response.json();
        setAddressSuggestions(data);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Error fetching address:", error);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 500);
  };

  const handleSelectAddress = (address: any) => {
    setFormData(prev => ({
      ...prev,
      location: address.display_name,
      latitude: parseFloat(address.lat),
      longitude: parseFloat(address.lon)
    }));
    setShowSuggestions(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col h-full">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Upravljanje Projektima</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm md:text-base">Pregled svih solarnih elektrana u mreži</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-lg shadow-lg shadow-amber-500/20 font-medium transition-all transform active:scale-95"
        >
          <Plus size={20} />
          <span className="md:inline">Dodaj Projekat</span>
        </button>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-1.5 md:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600"><Zap size={18} /></div>
            <span className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400">Instalirana Snaga</span>
          </div>
          <p className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white">{totalPower} kWp</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-1.5 md:p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600"><Sun size={18} /></div>
            <span className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400">Trenutna Proizvodnja</span>
          </div>
          <p className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white">{currentGen.toFixed(2)} kW</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-1.5 md:p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600"><BatteryCharging size={18} /></div>
            <span className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400">Danas Proizvedeno</span>
          </div>
          <p className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white">{todayEnergy.toFixed(1)} kWh</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-1.5 md:p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600"><Filter size={18} /></div>
            <span className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400">Prosek Samopotrošnje</span>
          </div>
          <p className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white">{avgSelfConsumption}%</p>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex gap-4 w-full lg:w-auto">
          {/* View Toggles */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shrink-0">
            <button
              onClick={() => setViewMode('GRID')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'GRID'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              <LayoutGrid size={18} />
              <span className="hidden sm:inline">Mreža</span>
            </button>
            <button
              onClick={() => setViewMode('MAP')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'MAP'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              <MapIcon size={18} />
              <span className="hidden sm:inline">Mapa</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Pretraži..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
            />
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
          {['ALL', 'ONLINE', 'WARNING', 'OFFLINE', 'DEMO'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${filter === status
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                }`}
            >
              {status === 'ALL' ? 'Svi' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'GRID' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={handleOpenEditModal}
            />
          ))}

          {filteredProjects.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500">
              Nema pronađenih projekata za zadate kriterijume.
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-[400px] md:min-h-[500px] w-full bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative z-0">
          {/* Map Component */}
          <ProjectsMap projects={filteredProjects} />
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-10 rounded-t-2xl">
              <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">
                {editingProject ? 'Izmeni Projekat' : 'Dodaj Novi Projekat'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Korisnika (Kome se dodeljuje)</label>
                <input
                  type="email"
                  value={formData.clientEmail || ''}
                  onChange={e => setFormData({ ...formData, clientEmail: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none dark:text-white"
                  placeholder="klijent@example.com"
                />
                <p className="text-xs text-slate-400 mt-1">Ostavite prazno ako želite da dodelite sebi (Admin).</p>
              </div>

              {/* Demo Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isDemo"
                  checked={formData.isDemo}
                  onChange={e => setFormData({ ...formData, isDemo: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="isDemo" className="text-sm font-medium text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                  Kreiraj kao Demo Projekat (Generisani podaci)
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Naziv Projekta</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none dark:text-white"
                  placeholder="npr. Domaćinstvo Petrović"
                />
              </div>

              {/* LOCATION FIELD WITH AUTOCOMPLETE */}
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Lokacija (Pretraga Adresa)</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={handleLocationChange}
                    onFocus={() => { if (addressSuggestions.length > 0) setShowSuggestions(true); }}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none dark:text-white pr-10"
                    placeholder="Ukucajte adresu..."
                  />
                  {isSearchingAddress && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="animate-spin text-slate-400" size={16} />
                    </div>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && addressSuggestions.length > 0 && (
                  <ul className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {addressSuggestions.map((item: any, idx) => (
                      <li
                        key={idx}
                        onClick={() => handleSelectAddress(item)}
                        className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-sm text-slate-700 dark:text-slate-200 flex items-start gap-2 border-b border-slate-100 dark:border-slate-700 last:border-0"
                      >
                        <MapPin size={14} className="mt-0.5 shrink-0 text-amber-500" />
                        <span>{item.display_name}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {/* Overlay to close suggestions on click away */}
                {showSuggestions && (
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowSuggestions(false)}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Latituda</label>
                  <input
                    type="number"
                    required
                    step="0.0001"
                    value={formData.latitude}
                    onChange={e => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Longituda</label>
                  <input
                    type="number"
                    required
                    step="0.0001"
                    value={formData.longitude}
                    onChange={e => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Instalisana Snaga (kWp)</label>
                <input
                  type="number"
                  required
                  step="0.1"
                  min="0"
                  value={formData.installedPowerKw}
                  onChange={e => setFormData({ ...formData, installedPowerKw: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none dark:text-white"
                >
                  <option value="ONLINE">ONLINE (Aktivan)</option>
                  <option value="WARNING">WARNING (Upozorenje)</option>
                  <option value="OFFLINE">OFFLINE (Isključen)</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3 pb-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/20"
                >
                  {editingProject ? 'Sačuvaj' : 'Kreiraj'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
