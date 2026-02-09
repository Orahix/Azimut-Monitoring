import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import { SolarReading, DailyEnergyStats, ViewMode, Project, EnergySeriesPoint } from '../types';
import { RealTimeChart } from '../components/RealTimeChart';
import { DashboardCard } from '../components/DashboardCard';
import { EnergyStatsChart } from '../components/EnergyStatsChart';
import { EnergyFlow } from '../components/EnergyFlow';
import { CHART_HISTORY_LENGTH, COLORS } from '../constants';
import { Sun, Zap, ArrowUpRight, ArrowDownLeft, BatteryCharging, History as HistoryIcon, Calendar, Download, FileText, CalendarRange, CalendarDays, Filter, BarChart as BarChartIcon, BadgePercent } from 'lucide-react';
import { ProjectSavingsTab } from '../components/ProjectSavingsTab';
import { LiveBillCard } from '../components/LiveBillCard';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const PlantDashboard: React.FC<{ theme: 'light' | 'dark' }> = ({ theme }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.REALTIME);
  const [project, setProject] = useState<Project | null>(null);
  const [realtimeData, setRealtimeData] = useState<SolarReading[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyEnergyStats | null>(null);
  const [selectedChartMetric, setSelectedChartMetric] = useState<string>('ALL');

  // Balance Chart Filters State
  type BalanceRange = 'day' | 'week' | 'month' | 'year';
  const [balanceRange, setBalanceRange] = useState<BalanceRange>('day');
  const [balanceSeries, setBalanceSeries] = useState<EnergySeriesPoint[]>([]);
  const [balanceMetric, setBalanceMetric] = useState<string>('ALL');

  // History Page State
  const todayStr = new Date().toISOString().split('T')[0];
  const lastWeekStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [filterType, setFilterType] = useState<'custom' | 'month'>('custom');
  const [startDate, setStartDate] = useState<string>(lastWeekStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const [historyStats, setHistoryStats] = useState<DailyEnergyStats | null>(null);
  const [historySeries, setHistorySeries] = useState<EnergySeriesPoint[]>([]);

  // Protect Route
  useEffect(() => {
    if (!user) return;
    // If client, check if they own this project
    if (user.role?.toLowerCase() === 'client' && !user.assignedProjectIds?.includes(id || '')) {
      navigate('/'); // Redirect to their allowed home
    }
  }, [user, id, navigate]);

  // Load Initial Data & Subscribe
  useEffect(() => {
    if (!id) return;

    // Async loader function
    const loadData = async () => {
      try {
        const [p, history, stats] = await Promise.all([
          apiService.getProjectById(id),
          apiService.getHistory(id), // Initial call might not know isDemo yet, handled below
          apiService.getDailyStats(id)
        ]);

        if (p) {
          console.log("PlantDashboard: Loaded project", p);
          setProject(p);
          // Re-fetch with demo flag if needed
          if (p.isDemo) {
            console.log("PlantDashboard: Project is DEMO, fetching mock data...");
            const [h, s] = await Promise.all([
              apiService.getHistory(id, true),
              apiService.getDailyStats(id, true)
            ]);
            setRealtimeData(h);
            setDailyStats(s);
          } else {
            setRealtimeData(history);
            setDailyStats(stats);
          }
        } else {
          // Fallback
          setRealtimeData(history);
          setDailyStats(stats);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      }
    };

    loadData();

    // Subscribe to Real-time is tricky. We need 'project' to know if it is demo.
    // But 'project' isn't set yet.
    // However, loadData sets project.
    // Let's rely on 'project' state for subscription.
  }, [id]);

  useEffect(() => {
    if (!id || !project) return;

    const unsubscribe = apiService.subscribe(id, (newData) => {
      setRealtimeData(prev => {
        const updated = [...prev, newData];
        return updated.length > CHART_HISTORY_LENGTH
          ? updated.slice(updated.length - CHART_HISTORY_LENGTH)
          : updated;
      });
      // Also update daily stats when new reading comes in
      apiService.getDailyStats(id, project.isDemo).then(stats => {
        setDailyStats(stats);
      });
    }, project.isDemo);

    return () => {
      unsubscribe();
    }
  }, [id, project]); // Re-subscribe if project loads (to get isDemo)

  // Fetch Balance Chart Data when range changes
  useEffect(() => {
    if (!id) return;

    const fetchBalanceData = async () => {
      if (!project) return;
      const series = await apiService.getEnergySeries(id, balanceRange, project.isDemo);
      setBalanceSeries(series);
    };

    fetchBalanceData();
  }, [id, balanceRange, project]);

  // Handle Month Selection Logic (History Page)
  useEffect(() => {
    if (filterType === 'month') {
      const [year, month] = selectedMonth.split('-').map(Number);
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);

      const fmt = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      setStartDate(fmt(firstDay));
      setEndDate(fmt(lastDay));
    }
  }, [selectedMonth, filterType]);

  // Load Historical Range Data (History Page)
  useEffect(() => {
    if (viewMode === ViewMode.HISTORY && id && project) {
      apiService.getStatsByDateRange(id, startDate, endDate, project.isDemo).then(setHistoryStats);
      apiService.getHistorySeries(id, startDate, endDate, project.isDemo).then(setHistorySeries);
    }
  }, [startDate, endDate, viewMode, id, project]);

  const latest = useMemo(() => {
    return realtimeData.length > 0
      ? realtimeData[realtimeData.length - 1]
      : { P_pv: 0, P_load: 0, P_self: 0, P_export: 0, P_import: 0 };
  }, [realtimeData]);

  // Filter realtime data to last 1 hour for chart display
  const realtimeDisplayData = useMemo(() => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return realtimeData.filter(r => new Date(r.timestamp).getTime() > oneHourAgo);
  }, [realtimeData]);

  const selfConsumptionRate = latest.P_pv > 0
    ? Math.min((latest.P_self / latest.P_pv) * 100, 100)
    : 0;

  // Prepare Summary Chart Data
  const summaryChartData = useMemo(() => {
    if (!historyStats) return [];
    return [
      { name: 'Proizvodnja', value: historyStats.totalGeneration, color: COLORS.PV },
      { name: 'Potrošnja', value: historyStats.totalConsumption, color: COLORS.LOAD },
      { name: 'Export', value: historyStats.totalExport, color: COLORS.EXPORT },
      { name: 'Import', value: historyStats.totalImport, color: COLORS.IMPORT },
    ];
  }, [historyStats]);

  const handleExportCSV = async () => {
    if (!id || !project) return;
    const data = await apiService.getDetailedReadings(id, startDate, endDate, project.isDemo);
    const headers = ["Timestamp", "Production", "Consumption", "Self-Consumption", "Export", "Import"];
    const csvRows = [
      headers.join(","),
      ...data.map(row => [row.timestamp, row.P_pv, row.P_load, row.P_self, row.P_export, row.P_import].join(","))
    ];
    const blob = new Blob([csvRows.join("\n")], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `solar_${id}_${startDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generatePDF = (stats: DailyEnergyStats | null, title: string, subtitle: string) => {
    if (!stats || !project) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxTextWidth = pageWidth - 28; // 14px margin on each side

    doc.setFontSize(20);
    doc.setTextColor(245, 158, 11);
    doc.text("Azimut Monitoring", 14, 20);

    doc.setFontSize(12);
    doc.setTextColor(80);
    doc.text(`Projekat: ${project.name}`, 14, 30);

    // Handle long address text with proper wrapping
    const locationText = `Lokacija: ${project.location || 'N/A'}`;
    const locationLines = doc.splitTextToSize(locationText, maxTextWidth);
    doc.text(locationLines, 14, 36);

    // Calculate next Y position based on number of location lines
    const lineHeight = 6;
    let currentY = 36 + (locationLines.length * lineHeight);

    doc.text(`Izvestaj: ${title}`, 14, currentY);
    currentY += lineHeight;
    doc.text(`Period: ${subtitle}`, 14, currentY);
    currentY += lineHeight + 4;

    const tableData = [
      ['Ukupno Proizvedeno', `${stats.totalGeneration.toFixed(2)} kWh`],
      ['Ukupno Potroseno', `${stats.totalConsumption.toFixed(2)} kWh`],
      ['Samopotrosnja', `${stats.totalSelfConsumption.toFixed(2)} kWh`],
      ['Predato u mrezu (Export)', `${stats.totalExport.toFixed(2)} kWh`],
      ['Preuzeto iz mreze (Import)', `${stats.totalImport.toFixed(2)} kWh`],
    ];
    autoTable(doc, {
      startY: currentY,
      head: [['Parametar', 'Vrednost']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] },
    });
    doc.setFontSize(10);
    doc.text(`Generisano: ${new Date().toLocaleString('sr-RS')}`, 14, doc.internal.pageSize.height - 10);
    doc.save(`Azimut_Monitoring_${title.replace(/\s/g, '_')}.pdf`);
  };

  const axisColor = theme === 'dark' ? '#94a3b8' : '#64748b';
  const gridColor = theme === 'dark' ? '#334155' : '#e2e8f0';

  if (!project) return <div className="p-10 text-center">Učitavanje...</div>;

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50 dark:bg-slate-900/50 relative">
      {/* Hero Section */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 md:p-6 lg:px-8 sticky top-0 z-10 lg:static">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white truncate max-w-[250px] md:max-w-none uppercase tracking-tight">{project.name}</h2>
              {project.isDemo ? (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                  <Zap size={10} className="fill-current" />
                  Simulator Aktivan
                </div>
              ) : (
                <span className={`px-2 py-0.5 rounded text-xs font-bold border shrink-0 ${project.status === 'ONLINE' ? 'text-green-600 border-green-200 bg-green-50' : 'text-amber-600 border-amber-200 bg-amber-50'
                  }`}>{project.status}</span>
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">{project.location} • {project.installedPowerKw} kWp Sistem</p>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start md:self-center w-full md:w-auto">
            <button
              onClick={() => setViewMode(ViewMode.REALTIME)}
              className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === ViewMode.REALTIME ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Real-time
            </button>
            <button
              onClick={() => setViewMode(ViewMode.HISTORY)}
              className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === ViewMode.HISTORY ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Istorija
            </button>
            <button
              onClick={() => setViewMode(ViewMode.SAVINGS)}
              className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === ViewMode.SAVINGS ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Štednja
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex-1">
        {viewMode === ViewMode.REALTIME && (
          <div className="flex flex-col gap-6">

            <div className="flex justify-end">
              <button
                onClick={() => generatePDF(dailyStats, 'Dnevni Izveštaj', todayStr)}
                className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              >
                <FileText size={16} /> <span className="hidden sm:inline">Preuzmi</span> Dnevni PDF
              </button>
            </div>

            {/* KPI GRID - OPTIMIZED FOR MOBILE */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              <DashboardCard
                title="Proizvodnja"
                value={latest.P_pv}
                unit="kW"
                colorClass="text-amber-500 dark:text-amber-400"
                icon={<Sun size={24} />}
                onClick={() => setSelectedChartMetric(selectedChartMetric === 'P_pv' ? 'ALL' : 'P_pv')}
                isActive={selectedChartMetric === 'P_pv'}
              />
              <DashboardCard
                title="Potrošnja"
                value={latest.P_load}
                unit="kW"
                colorClass="text-blue-500 dark:text-blue-400"
                icon={<Zap size={24} />}
                onClick={() => setSelectedChartMetric(selectedChartMetric === 'P_load' ? 'ALL' : 'P_load')}
                isActive={selectedChartMetric === 'P_load'}
              />
              <DashboardCard
                title="Samopotrošnja"
                value={latest.P_self}
                unit="kW"
                colorClass="text-green-500 dark:text-green-400"
                subValue={`${selfConsumptionRate.toFixed(0)}%`}
                icon={<BatteryCharging size={24} />}
                onClick={() => setSelectedChartMetric(selectedChartMetric === 'P_self' ? 'ALL' : 'P_self')}
                isActive={selectedChartMetric === 'P_self'}
              />
              <DashboardCard
                title="Export"
                value={latest.P_export}
                unit="kW"
                colorClass="text-orange-500 dark:text-orange-400"
                icon={<ArrowUpRight size={24} />}
                onClick={() => setSelectedChartMetric(selectedChartMetric === 'P_export' ? 'ALL' : 'P_export')}
                isActive={selectedChartMetric === 'P_export'}
              />
              <DashboardCard
                title="Import"
                value={latest.P_import}
                unit="kW"
                colorClass="text-red-500 dark:text-red-400"
                icon={<ArrowDownLeft size={24} />}
                onClick={() => setSelectedChartMetric(selectedChartMetric === 'P_import' ? 'ALL' : 'P_import')}
                isActive={selectedChartMetric === 'P_import'}
              />
            </div>

            {/* LIVE BILLING & STATUS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-1">
                <LiveBillCard project={project} />
              </div>
              <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white flex flex-col justify-center relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Sun size={120} />
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl font-black uppercase tracking-tight mb-2">Sistem je Operativan</h3>
                  <p className="text-slate-400 text-sm max-w-md font-medium">Vaša solarna elektrana radi optimalno. Trenutna ušteda u ovom mesecu je obračunata na osnovu realnih mrežnih parametara i vaše potrošnje.</p>
                  <button
                    onClick={() => setViewMode(ViewMode.SAVINGS)}
                    className="mt-6 px-6 py-2 bg-amber-500 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-amber-500/20"
                  >
                    Prikaži detaljnu štednju
                  </button>
                </div>
              </div>
            </div>

            {/* UPPER ROW: Real Time Chart + Energy Flow */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 h-[350px] md:h-[400px]">
                <RealTimeChart
                  data={realtimeDisplayData}
                  selectedMetric={selectedChartMetric}
                  onReset={() => setSelectedChartMetric('ALL')}
                  theme={theme}
                />
              </div>
              <div className="h-[300px] md:h-[400px]">
                <EnergyFlow pv={latest.P_pv} load={latest.P_load} grid={latest.P_import - latest.P_export} />
              </div>
            </div>

            {/* LOWER ROW: Energy Balance Chart (Diagram) */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">

              {/* CHART HEADER & FILTERS */}
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-4 shrink-0 gap-4">
                <h3 className="text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-2">
                  <span className="w-2 h-6 bg-green-500 rounded-sm"></span>
                  Energetski Bilans
                </h3>

                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                  {/* Metric Selector */}
                  <div className="relative w-full sm:w-auto">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Filter size={16} />
                    </div>
                    <select
                      value={balanceMetric}
                      onChange={(e) => setBalanceMetric(e.target.value)}
                      className="w-full sm:w-auto pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="ALL">Svi parametri</option>
                      <option value="generation">Proizvodnja</option>
                      <option value="consumption">Potrošnja</option>
                      <option value="selfConsumption">Samopotrošnja</option>
                      <option value="export">Predato (Export)</option>
                      <option value="import">Preuzeto (Import)</option>
                    </select>
                  </div>

                  {/* Time Range Selector */}
                  <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
                    {[
                      { id: 'day', label: 'Danas' },
                      { id: 'week', label: '7 Dana' },
                      { id: 'month', label: '30 Dana' },
                      { id: 'year', label: '1 Godina' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setBalanceRange(opt.id as BalanceRange)}
                        className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${balanceRange === opt.id
                          ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* FIXED HEIGHT CONTAINER TO ENSURE VISIBILITY */}
              <div className="w-full h-[400px] mt-2">
                {balanceSeries.length > 0 ? (
                  <EnergyStatsChart
                    data={balanceSeries}
                    theme={theme}
                    selectedMetric={balanceMetric}
                    unit={balanceRange === 'day' ? 'kW' : 'kWh'}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500">Učitavanje podataka...</div>
                )}
              </div>
            </div>

          </div>
        )}

        {viewMode === ViewMode.HISTORY && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 flex flex-col xl:flex-row justify-between items-start gap-4">
              <div className="flex-1 w-full">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="text-amber-500" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Filter Istorije</h3>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Filter Type Toggle */}
                  <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg w-fit">
                    <button
                      onClick={() => setFilterType('custom')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filterType === 'custom' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                      <CalendarRange size={16} /> Prilagođeno
                    </button>
                    <button
                      onClick={() => setFilterType('month')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filterType === 'month' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                      <CalendarDays size={16} /> Mesečno
                    </button>
                  </div>

                  {/* Inputs */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    {filterType === 'custom' ? (
                      <>
                        <div className="w-full sm:w-auto">
                          <label className="block text-xs text-slate-500 mb-1">Datum Od</label>
                          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm dark:text-white focus:outline-none focus:border-amber-500" />
                        </div>
                        <div className="w-full sm:w-auto">
                          <label className="block text-xs text-slate-500 mb-1">Datum Do</label>
                          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm dark:text-white focus:outline-none focus:border-amber-500" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full sm:w-auto">
                        <label className="block text-xs text-slate-500 mb-1">Izaberi Mesec</label>
                        <input
                          type="month"
                          value={selectedMonth}
                          onChange={e => setSelectedMonth(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm dark:text-white focus:outline-none focus:border-amber-500 min-w-[200px]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto self-end mt-4 xl:mt-0">
                <button
                  onClick={() => generatePDF(historyStats, 'Istorijski Izveštaj', `${startDate} - ${endDate}`)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded shadow-sm transition-colors"
                >
                  <FileText size={18} /> Export PDF
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 px-4 py-2 rounded border border-slate-300 dark:border-slate-600 transition-colors"
                >
                  <Download size={18} /> Export CSV
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-6">
                <Sun className="text-amber-500" />
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Proizvodnja po danima (kWh)</h3>
              </div>
              <div className="h-[350px]">
                {historySeries.length > 0 ? (
                  <EnergyStatsChart
                    data={historySeries}
                    theme={theme}
                    selectedMetric="generation"
                    unit="kWh"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500">Nema podataka za izabrani period.</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* TOTALS TEXT CARD */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 h-full">
                <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Ukupno za period</h3>
                {historyStats && (
                  <div className="space-y-4">
                    <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded">
                      <span className="text-slate-500">Ukupno Proizvedeno</span>
                      <span className="font-bold text-amber-500">{historyStats.totalGeneration.toFixed(1)} kWh</span>
                    </div>
                    <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded">
                      <span className="text-slate-500">Ukupno Potrošeno</span>
                      <span className="font-bold text-blue-500">{historyStats.totalConsumption.toFixed(1)} kWh</span>
                    </div>
                    <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded">
                      <span className="text-slate-500">Predato u mrežu</span>
                      <span className="font-bold text-orange-500">{historyStats.totalExport.toFixed(1)} kWh</span>
                    </div>
                    <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded">
                      <span className="text-slate-500">Preuzeto iz mreže</span>
                      <span className="font-bold text-red-500">{historyStats.totalImport.toFixed(1)} kWh</span>
                    </div>
                  </div>
                )}
              </div>

              {/* TOTALS CHART CARD */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <BarChartIcon className="text-indigo-500" size={20} />
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">Grafički Prikaz</h3>
                </div>
                <div className="flex-1 w-full min-h-[250px]">
                  {historyStats ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summaryChartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                        <XAxis
                          dataKey="name"
                          stroke={axisColor}
                          tick={{ fontSize: 12, fill: axisColor }}
                          interval={0}
                        />
                        <YAxis stroke={axisColor} tick={{ fontSize: 12 }} unit=" kWh" />
                        <Tooltip
                          cursor={{ fill: theme === 'dark' ? '#334155' : '#f1f5f9' }}
                          contentStyle={{
                            backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                            borderColor: theme === 'dark' ? '#334155' : '#cbd5e1',
                            borderRadius: '0.5rem',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                          }}
                          itemStyle={{
                            color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
                            fontWeight: 600
                          }}
                          formatter={(value: number) => [`${value.toFixed(2)} kWh`]}
                          labelStyle={{ display: 'none' }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {summaryChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500">Nema podataka.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === ViewMode.SAVINGS && project && (
          <ProjectSavingsTab project={project} theme={theme} />
        )}
      </div>
    </div>
  );
};