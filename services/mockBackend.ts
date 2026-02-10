
import { SolarReading, DailyEnergyStats, Project, User, ProjectStatus, ProjectFormData, EnergySeriesPoint } from '../types';
import { UPDATE_INTERVAL_MS } from '../constants';

/**
 * MOCK BACKEND SERVICE
 * 
 * Now supports:
 * 1. Multi-project simulation
 * 2. User authentication simulation
 * 3. Admin vs Client data access
 */

type Listener = (data: SolarReading) => void;

class MockBackendService {
  private listeners: Map<string, Listener[]> = new Map(); // Map<ProjectId, Listeners[]>
  private intervalId: number | null = null;

  // --- MOCK DATABASE ---

  private users: User[] = [
    {
      id: 'u1',
      username: 'Admin User',
      email: 'admin@solar.com',
      role: 'ADMIN'
    },
    {
      id: 'u2',
      username: 'Marko Marković',
      email: 'client@solar.com',
      role: 'CLIENT',
      assignedProjectIds: ['p1']
    },
    {
      id: 'u3',
      username: 'Jovan Petrović',
      email: 'client2@solar.com',
      role: 'CLIENT',
      assignedProjectIds: ['p2']
    }
  ];

  private projects: Project[] = [
    {
      id: 'p1',
      name: 'Domaćinstvo - Novi Sad',
      location: 'Novi Sad, SRB',
      latitude: 45.2671,
      longitude: 19.8335,
      installedPowerKw: 10,
      status: 'ONLINE',
      currentPowerKw: 0,
      todayEnergyKwh: 0,
      todaySelfConsumptionKwh: 0,
      todayExportKwh: 0,
      todayImportKwh: 0,
    },
    {
      id: 'p2',
      name: 'Vikendica - Fruška Gora',
      location: 'Vrdnik, SRB',
      latitude: 45.1232,
      longitude: 19.7915,
      installedPowerKw: 5,
      status: 'WARNING', // Simulating a warning
      currentPowerKw: 0,
      todayEnergyKwh: 0,
      todaySelfConsumptionKwh: 0,
      todayExportKwh: 0,
      todayImportKwh: 0,
    },
    {
      id: 'p3',
      name: 'Hala 1 - Industrijska Zona',
      location: 'Beograd, SRB',
      latitude: 44.7866,
      longitude: 20.4489,
      installedPowerKw: 50,
      status: 'ONLINE',
      currentPowerKw: 0,
      todayEnergyKwh: 0,
      todaySelfConsumptionKwh: 0,
      todayExportKwh: 0,
      todayImportKwh: 0,
    },
    {
      id: 'p4',
      name: 'Garaža - Centar',
      location: 'Niš, SRB',
      latitude: 43.3209,
      longitude: 21.8958,
      installedPowerKw: 3.5,
      status: 'OFFLINE', // Simulating offline
      currentPowerKw: 0,
      todayEnergyKwh: 0,
      todaySelfConsumptionKwh: 0,
      todayExportKwh: 0,
      todayImportKwh: 0,
    }
  ];

  // In-memory storage for readings per project
  private projectReadings: Map<string, SolarReading[]> = new Map();

  // Store past days for history filtering
  private mockHistory: DailyEnergyStats[] = [];

  constructor() {
    this.generateMockHistory();
    this.startSimulation();
  }

  // --- AUTHENTICATION ---

  public async login(email: string, password: string): Promise<User> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const user = this.users.find(u => u.email === email);
        // In a real app, check password hash. Here we just check existence.
        // Mock password for everyone is 'password'
        if (user && password === 'password') {
          resolve(user);
        } else {
          reject(new Error('Invalid credentials'));
        }
      }, 800); // Fake network delay
    });
  }

  public getProjects(user: User): Project[] {
    if (user.role === 'ADMIN') {
      return this.projects;
    }
    if (user.assignedProjectIds) {
      return this.projects.filter(p => user.assignedProjectIds?.includes(p.id));
    }
    return [];
  }

  public getProjectById(id: string): Project | undefined {
    return this.projects.find(p => p.id === id);
  }

  // --- PROJECT MANAGEMENT ---

  public createProject(data: ProjectFormData): Project {
    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      ...data,
      currentPowerKw: 0,
      todayEnergyKwh: 0,
      todaySelfConsumptionKwh: 0,
      todayExportKwh: 0,
      todayImportKwh: 0,
    };
    this.projects.push(newProject);
    return newProject;
  }

  public updateProject(id: string, data: ProjectFormData): Project | null {
    const index = this.projects.findIndex(p => p.id === id);
    if (index === -1) return null;

    const updatedProject = {
      ...this.projects[index],
      ...data
    };
    this.projects[index] = updatedProject;
    return updatedProject;
  }

  // --- HISTORY GENERATION ---
  private generateMockHistory() {
    const today = new Date();
    // Generate 365 days of history
    for (let i = 365; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Seasonal variation (sinusoidal over 365 days)
      const dayOfYear = i;
      const seasonFactor = 0.5 + 0.5 * Math.sin((2 * Math.PI * (365 - dayOfYear)) / 365);

      const gen = (20 + Math.random() * 15) * seasonFactor; // Less generation in winter
      const load = 15 + Math.random() * 10;
      const self = Math.min(gen, load) * (0.6 + Math.random() * 0.3);

      this.mockHistory.push({
        date: dateStr,
        totalGeneration: gen,
        totalConsumption: load,
        totalSelfConsumption: self,
        totalExport: Math.max(0, gen - self),
        totalImport: Math.max(0, load - self),
      });
    }
  }

  // --- REAL-TIME SIMULATION ---

  public subscribe(projectId: string, listener: Listener) {
    if (!this.listeners.has(projectId)) {
      this.listeners.set(projectId, []);
    }
    this.listeners.get(projectId)?.push(listener);
    return () => {
      const projListeners = this.listeners.get(projectId);
      if (projListeners) {
        this.listeners.set(projectId, projListeners.filter(l => l !== listener));
      }
    };
  }

  private calculateSolarAndLoad(date: Date, installedPower: number, offsetSeed: number): { P_pv: number, P_load: number } {
    const hour = date.getHours() + date.getMinutes() / 60;

    // Solar Simulation
    let pv_potential = 0;
    if (hour > 6 && hour < 20) {
      pv_potential = Math.sin(((hour - 6) / 14) * Math.PI) * installedPower;
    }
    // Use offsetSeed to make different projects look different
    const noise = (Math.sin(date.getTime() + offsetSeed) + 1) / 2;
    const cloudCover = Math.random() > 0.9 ? 0.2 : 1; // Occasional cloud
    const pv = Math.max(0, pv_potential * (0.7 + noise * 0.3) * cloudCover);

    // Load simulation
    const baseLoad = installedPower * 0.1; // Assume base load scales with size
    const spike = (Math.cos(date.getTime() / 10000 + offsetSeed) + 1) > 1.5 ? Math.random() * (installedPower * 0.3) : 0;
    const load = baseLoad + spike;

    return { P_pv: pv, P_load: load };
  }

  private startSimulation() {
    if (this.intervalId) return;
    this.tick();
    this.intervalId = window.setInterval(() => {
      this.tick();
    }, UPDATE_INTERVAL_MS);
  }

  private tick() {
    const now = new Date();
    const timestamp = now.toISOString();
    const timeDeltaHours = UPDATE_INTERVAL_MS / 1000 / 3600;

    // Iterate over all projects and simulate data
    this.projects.forEach((project, index) => {
      // Skip offline projects for generation, but still might have load
      if (project.status === 'OFFLINE') {
        project.currentPowerKw = 0;
        return;
      }

      const seed = index * 1000;
      const { P_pv, P_load } = this.calculateSolarAndLoad(now, project.installedPowerKw, seed);

      // P_self = min(P_pv, P_load)
      const P_self = Math.min(P_pv, P_load);
      const P_export = Math.max(P_pv - P_load, 0);
      const P_import = Math.max(P_load - P_pv, 0);
      // Reactive: simulate ~30-50% of active import as reactive consumption
      const Q_load = P_import > 0 ? +(P_import * (0.3 + Math.random() * 0.2)).toFixed(3) : 0;

      const reading: SolarReading = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: timestamp,
        P_pv,
        P_load,
        P_self,
        P_export,
        P_import,
        Q_load,
        Q_import: Q_load, // Solar produces no reactive, so consumption = import
      };

      // Update Project State (for Admin Dashboard)
      project.currentPowerKw = P_pv;
      project.todayEnergyKwh += P_pv * timeDeltaHours;
      project.todaySelfConsumptionKwh += P_self * timeDeltaHours;
      project.todayExportKwh += P_export * timeDeltaHours;
      project.todayImportKwh += P_import * timeDeltaHours;

      // Store in memory
      if (!this.projectReadings.has(project.id)) {
        this.projectReadings.set(project.id, []);
      }
      const history = this.projectReadings.get(project.id)!;
      history.push(reading);
      if (history.length > 120) history.shift();

      // Broadcast to subscribers of this specific project
      const projectListeners = this.listeners.get(project.id);
      if (projectListeners) {
        projectListeners.forEach(l => l(reading));
      }
    });
  }

  // --- API ENDPOINTS ---

  public getProjectHistory(projectId: string) {
    return [...(this.projectReadings.get(projectId) || [])];
  }

  public getDailyStats(projectId: string) {
    const p = this.projects.find(proj => proj.id === projectId);
    if (!p) return null;
    return {
      date: new Date().toISOString().split('T')[0],
      totalGeneration: p.todayEnergyKwh,
      totalConsumption: p.todayEnergyKwh * 0.8, // Mock logic approximation
      totalSelfConsumption: p.todaySelfConsumptionKwh,
      totalExport: p.todayExportKwh,
      totalImport: p.todayImportKwh,
    };
  }

  public getStatsByDateRange(projectId: string, startDate: string, endDate: string): DailyEnergyStats {
    const project = this.getProjectById(projectId);
    const scale = project ? project.installedPowerKw / 10 : 1;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check if today is included in range
    const todayStr = new Date().toISOString().split('T')[0];
    let includeToday = false;
    if (startDate <= todayStr && endDate >= todayStr) {
      includeToday = true;
    }

    const filtered = this.mockHistory.filter(stat => {
      const d = new Date(stat.date);
      return d >= start && d <= end;
    });

    const aggregated: DailyEnergyStats = {
      date: `${startDate} - ${endDate}`,
      totalGeneration: 0,
      totalConsumption: 0,
      totalSelfConsumption: 0,
      totalExport: 0,
      totalImport: 0
    };

    filtered.forEach(day => {
      aggregated.totalGeneration += day.totalGeneration * scale;
      aggregated.totalConsumption += day.totalConsumption * scale;
      aggregated.totalSelfConsumption += day.totalSelfConsumption * scale;
      aggregated.totalExport += day.totalExport * scale;
      aggregated.totalImport += day.totalImport * scale;
    });

    // Add Today's Live Stats if included
    if (includeToday && project) {
      aggregated.totalGeneration += project.todayEnergyKwh;
      aggregated.totalConsumption += project.todayEnergyKwh * 0.8; // Mock assumption
      aggregated.totalSelfConsumption += project.todaySelfConsumptionKwh;
      aggregated.totalExport += project.todayExportKwh;
      aggregated.totalImport += project.todayImportKwh;
    }

    return aggregated;
  }

  public getDetailedReadings(projectId: string, startDate: string, endDate: string): SolarReading[] {
    const project = this.getProjectById(projectId);
    const installedPower = project ? project.installedPowerKw : 5;

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59`);
    const results: SolarReading[] = [];

    let currentTime = start.getTime();
    const endTime = end.getTime();

    while (currentTime <= endTime) {
      const dateObj = new Date(currentTime);
      const { P_pv, P_load } = this.calculateSolarAndLoad(dateObj, installedPower, 0);

      const P_self = Math.min(P_pv, P_load);
      const P_export = Math.max(P_pv - P_load, 0);
      const P_import = Math.max(P_load - P_pv, 0);

      results.push({
        id: Math.random().toString(36),
        timestamp: dateObj.toISOString(),
        P_pv, P_load, P_self, P_export, P_import,
        Q_load: 0,
        Q_import: 0
      });

      currentTime += 300000; // 5 min resolution for CSV export to save memory in demo
    }

    return results;
  }

  // --- NEW: TIME SERIES DATA FOR CHARTS ---

  public getEnergySeries(projectId: string, range: 'day' | 'week' | 'month' | 'year'): EnergySeriesPoint[] {
    const project = this.getProjectById(projectId);
    const scale = project ? project.installedPowerKw / 10 : 1;
    const series: EnergySeriesPoint[] = [];
    const now = new Date();

    if (range === 'day') {
      // Generate 24 hours of data for "Today"
      // Since we don't have stored hourly history in this mock, we simulate a curve
      for (let h = 0; h < 24; h++) {
        const date = new Date();
        date.setHours(h, 0, 0, 0);

        // Simulate Bell curve for PV
        let gen = 0;
        if (h > 5 && h < 20) {
          gen = Math.sin(((h - 5) / 15) * Math.PI) * (project?.installedPowerKw || 10) * 0.8;
          // Random noise
          gen = gen * (0.8 + Math.random() * 0.4);
        }

        const load = (project?.installedPowerKw || 10) * 0.2 + (Math.random() * 2);
        const self = Math.min(gen, load);

        series.push({
          label: `${h}:00`,
          timestamp: date.toISOString(),
          generation: Math.max(0, gen),
          consumption: load,
          selfConsumption: self,
          export: Math.max(0, gen - self),
          import: Math.max(0, load - self)
        });
      }
    }
    else if (range === 'week') {
      // Last 7 days from mockHistory
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const stats = this.mockHistory.filter(d => d.date >= startDate && d.date <= endDate);

      stats.forEach(s => {
        series.push({
          label: new Date(s.date).toLocaleDateString('sr-RS', { weekday: 'short' }),
          timestamp: s.date,
          generation: s.totalGeneration * scale,
          consumption: s.totalConsumption * scale,
          selfConsumption: s.totalSelfConsumption * scale,
          export: s.totalExport * scale,
          import: s.totalImport * scale
        });
      });
    }
    else if (range === 'month') {
      // Last 30 days
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const stats = this.mockHistory.filter(d => d.date >= startDate && d.date <= endDate);

      stats.forEach(s => {
        series.push({
          label: new Date(s.date).getDate().toString(),
          timestamp: s.date,
          generation: s.totalGeneration * scale,
          consumption: s.totalConsumption * scale,
          selfConsumption: s.totalSelfConsumption * scale,
          export: s.totalExport * scale,
          import: s.totalImport * scale
        });
      });
    }
    else if (range === 'year') {
      // Aggregate by month (last 12 months)
      const months: { [key: string]: EnergySeriesPoint } = {};

      // Init last 12 months
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        months[key] = {
          label: d.toLocaleDateString('sr-RS', { month: 'short' }),
          timestamp: d.toISOString(),
          generation: 0, consumption: 0, selfConsumption: 0, export: 0, import: 0
        };
      }

      this.mockHistory.forEach(day => {
        const d = new Date(day.date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (months[key]) {
          months[key].generation += day.totalGeneration * scale;
          months[key].consumption += day.totalConsumption * scale;
          months[key].selfConsumption += day.totalSelfConsumption * scale;
          months[key].export += day.totalExport * scale;
          months[key].import += day.totalImport * scale;
        }
      });

      series.push(...Object.values(months));
    }

    return series;
  }

  // --- NEW: Custom History Range Series for History Tab ---
  public getHistorySeries(projectId: string, startDate: string, endDate: string): EnergySeriesPoint[] {
    const project = this.getProjectById(projectId);
    const scale = project ? project.installedPowerKw / 10 : 1;
    const series: EnergySeriesPoint[] = [];

    const start = new Date(startDate);
    const end = new Date(endDate);

    const filtered = this.mockHistory.filter(d => {
      const date = new Date(d.date);
      return date >= start && date <= end;
    });

    // Sort by date ascending
    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    filtered.forEach(s => {
      series.push({
        label: s.date, // YYYY-MM-DD
        timestamp: s.date,
        generation: s.totalGeneration * scale,
        consumption: s.totalConsumption * scale,
        selfConsumption: s.totalSelfConsumption * scale,
        export: s.totalExport * scale,
        import: s.totalImport * scale
      });
    });

    return series;
  }
}

export const backendService = new MockBackendService();
