import { SolarReading, DailyEnergyStats, Project, ProjectFormData, EnergySeriesPoint } from '../types';
import { supabase } from './supabase';

class ApiService {

  // --- Realtime ---

  public subscribe(projectId: string, listener: (data: SolarReading) => void, isDemo: boolean = false) {
    if (isDemo) {
      const interval = setInterval(() => {
        const now = new Date();
        const hour = now.getHours();
        const isDay = hour > 6 && hour < 19;
        let gen = 0;
        if (isDay) {
          const peak = 13;
          const dist = Math.abs(hour - peak);
          gen = Math.max(0, 10 - dist * 1.5) + (Math.random() * 0.5);
        }

        const load = 0.5 + Math.random() * 2;
        const self = Math.min(gen, load);
        const exp = Math.max(0, gen - self);
        const imp = Math.max(0, load - self);

        listener({
          id: 'demo-' + now.getTime(),
          timestamp: now.toISOString(),
          P_pv: gen,
          P_load: load,
          P_self: self,
          P_export: exp,
          P_import: imp
        });
      }, 5000);

      return () => clearInterval(interval);
    }

    const channel = supabase
      .channel(`realtime:project:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'power_readings',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const row = payload.new;
          listener({
            id: row.id.toString(),
            timestamp: row.recorded_at,
            P_pv: row.active_power_total || 0,
            P_load: 0,
            P_self: 0,
            P_export: row.total_energy_export || 0,
            P_import: row.total_energy_import || 0
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // --- Helper ---
  private async queryWithTimeout<T>(promise: Promise<T> | any, timeoutMs: number = 8000): Promise<T | null> {
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error("Query timeout")), timeoutMs)
    );
    try {
      return await Promise.race([Promise.resolve(promise), timeoutPromise]) as T;
    } catch (err) {
      console.error("ApiService Query Error/Timeout:", err);
      return null;
    }
  }

  // --- Projects ---

  public async getProjects(): Promise<Project[]> {
    const res = await this.queryWithTimeout<any>(supabase.from('projects').select('*'));
    if (!res || res.error) return [];

    return res.data.map((p: any) => ({
      id: p.id,
      name: p.name,
      location: p.location || '',
      latitude: p.latitude ? parseFloat(p.latitude) : 0,
      longitude: p.longitude ? parseFloat(p.longitude) : 0,
      installedPowerKw: p.installed_capacity_kw || 0,
      status: p.is_demo ? 'DEMO' : 'ONLINE',
      isDemo: p.is_demo || false,
      currentPowerKw: 0,
      todayEnergyKwh: 0,
      todaySelfConsumptionKwh: 0,
      todayExportKwh: 0,
      todayImportKwh: 0
    }));
  }

  public async getProjectById(id: string): Promise<Project | null> {
    const res = await this.queryWithTimeout<any>(supabase.from('projects').select('*').eq('id', id).single());
    if (!res || res.error || !res.data) return null;
    const data = res.data;
    return {
      id: data.id,
      name: data.name,
      location: data.location || '',
      latitude: data.latitude ? parseFloat(data.latitude) : 0,
      longitude: data.longitude ? parseFloat(data.longitude) : 0,
      installedPowerKw: data.installed_capacity_kw || 0,
      status: data.is_demo ? 'DEMO' : 'ONLINE',
      isDemo: data.is_demo || false,
      currentPowerKw: 0,
      todayEnergyKwh: 0,
      todaySelfConsumptionKwh: 0,
      todayExportKwh: 0,
      todayImportKwh: 0
    };
  }

  public async createProject(formData: ProjectFormData): Promise<Project | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    let ownerId = user.id;
    if (formData.clientEmail) {
      const profile = await this.queryWithTimeout<any>(supabase.from('profiles').select('id').eq('email', formData.clientEmail).single());
      if (profile && profile.data) ownerId = profile.data.id;
    }

    const res = await this.queryWithTimeout<any>(supabase.from('projects').insert({
      user_id: ownerId,
      name: formData.name,
      location: formData.location,
      latitude: formData.latitude,
      longitude: formData.longitude,
      installed_capacity_kw: formData.installedPowerKw,
      is_demo: formData.isDemo || false
    }).select().single());

    if (!res || res.error) return null;
    return this.getProjectById(res.data.id);
  }

  public async updateProject(id: string, formData: ProjectFormData): Promise<Project | null> {
    const res = await this.queryWithTimeout<any>(supabase.from('projects').update({
      name: formData.name,
      location: formData.location,
      latitude: formData.latitude,
      longitude: formData.longitude,
      installed_capacity_kw: formData.installedPowerKw
    }).eq('id', id).select().single());

    if (!res || res.error) return null;
    return this.getProjectById(res.data.id);
  }

  // --- Data & History ---

  public async getHistory(projectId: string, isDemo: boolean = false): Promise<SolarReading[]> {
    if (isDemo) {
      const data: SolarReading[] = [];
      const now = Date.now();
      for (let i = 20; i >= 0; i--) {
        const t = now - (i * 5 * 60 * 1000);
        const hour = new Date(t).getHours();
        let gen = 0;
        if (hour > 6 && hour < 19) gen = Math.max(0, 10 - Math.abs(hour - 13) * 1.5) + Math.random();
        const load = 1.5 + Math.random() * 2.5;
        const self = Math.min(gen, load);
        data.push({
          id: 'demo-hist-' + i,
          timestamp: new Date(t).toISOString(),
          P_pv: gen,
          P_load: load,
          P_self: self,
          P_export: Math.max(0, gen - self),
          P_import: Math.max(0, load - self)
        });
      }
      return data;
    }

    const res = await this.queryWithTimeout<any>(supabase
      .from('power_readings')
      .select('*')
      .eq('project_id', projectId)
      .order('recorded_at', { ascending: true })
      .limit(100));

    if (!res || res.error || !res.data) return [];
    return res.data.map((row: any) => ({
      id: row.id.toString(),
      timestamp: row.recorded_at,
      P_pv: row.active_power_total || 0,
      P_load: 0,
      P_self: 0,
      P_export: row.total_energy_export || 0,
      P_import: row.total_energy_import || 0
    }));
  }

  public async getDailyStats(projectId: string, isDemo: boolean = false): Promise<DailyEnergyStats> {
    if (isDemo) {
      return {
        date: new Date().toISOString().split('T')[0],
        totalGeneration: 245.5,
        totalConsumption: 182.2,
        totalSelfConsumption: 128.5,
        totalExport: 117.0,
        totalImport: 53.7
      };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const res = await this.queryWithTimeout<any>(supabase
      .from('hourly_stats')
      .select('*')
      .eq('project_id', projectId)
      .gte('start_time', todayStart.toISOString()));

    if (!res || res.error || !res.data || res.data.length === 0) {
      return {
        date: new Date().toISOString().split('T')[0],
        totalGeneration: 0,
        totalConsumption: 0,
        totalSelfConsumption: 0,
        totalExport: 0,
        totalImport: 0
      };
    }

    const totals = res.data.reduce((acc: any, row: any) => {
      const g = row.total_energy_produced || 0;
      const c = row.total_energy_consumed || 0;
      acc.gen += g;
      acc.cons += c;
      return acc;
    }, { gen: 0, cons: 0 });

    const self = Math.min(totals.gen, totals.cons);

    return {
      date: new Date().toISOString().split('T')[0],
      totalGeneration: totals.gen,
      totalConsumption: totals.cons,
      totalSelfConsumption: self,
      totalExport: Math.max(0, totals.gen - self),
      totalImport: Math.max(0, totals.cons - self)
    };
  }

  public async getCurrentMonthStats(projectId: string, isDemo: boolean = false): Promise<EnergySeriesPoint> {
    if (isDemo) {
      const now = new Date();
      const daysPassed = now.getDate();
      // Refined monthly profile: avg 180kwh/day generation for summer
      const baseYield = [55, 75, 115, 145, 175, 195, 210, 190, 140, 95, 60, 45];
      const dailyYield = baseYield[now.getMonth()] / 30;
      const capacity = 50;

      const gen = daysPassed * capacity * dailyYield * (0.9 + Math.random() * 0.2);
      const cons = daysPassed * 160 * (0.9 + Math.random() * 0.2); // steady industrial load
      const vt = cons * 0.75; // More load during day for industrial
      const nt = cons * 0.25;
      const self = Math.min(gen, vt);

      return {
        label: now.toLocaleString('sr-RS', { month: 'long' }),
        timestamp: now.toISOString(),
        generation: gen,
        consumption: cons,
        consumptionVT: vt,
        consumptionNT: nt,
        selfConsumption: self,
        export: Math.max(0, gen - self),
        import: (vt - self) + nt,
        importVT: Math.max(0, vt - self),
        importNT: nt
      } as any;
    }

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const res = await this.queryWithTimeout<any>(supabase
      .from('hourly_stats')
      .select('*')
      .eq('project_id', projectId)
      .gte('start_time', startOfMonth));

    const defaultResp: any = {
      label: new Date().toLocaleString('sr-RS', { month: 'long' }),
      timestamp: new Date().toISOString(),
      generation: 0, consumption: 0, consumptionVT: 0, consumptionNT: 0,
      selfConsumption: 0, export: 0, import: 0, importVT: 0, importNT: 0
    };

    if (!res || res.error || !res.data) return defaultResp;

    const totals = res.data.reduce((acc: any, row: any) => {
      const hour = new Date(row.start_time).getHours();
      const g = row.total_energy_produced || 0;
      const c = row.total_energy_consumed || 0;
      acc.gen += g;
      acc.cons += c;
      if (hour >= 7 && hour < 23) {
        acc.vt += c;
        const s = Math.min(g, c);
        acc.self += s;
        acc.ivt += Math.max(0, c - s);
        acc.exp += Math.max(0, g - s);
      } else {
        acc.nt += c;
        acc.int += c;
        acc.exp += g;
      }
      return acc;
    }, { gen: 0, cons: 0, vt: 0, nt: 0, self: 0, ivt: 0, int: 0, exp: 0 });

    return {
      ...defaultResp,
      generation: totals.gen,
      consumption: totals.cons,
      consumptionVT: totals.vt,
      consumptionNT: totals.nt,
      selfConsumption: totals.self,
      export: totals.exp,
      import: totals.ivt + totals.int,
      importVT: totals.ivt,
      importNT: totals.int
    };
  }

  public async getStatsByDateRange(projectId: string, startDate: string, endDate: string, isDemo: boolean = false): Promise<DailyEnergyStats> {
    if (isDemo) {
      return {
        date: startDate,
        totalGeneration: 650, totalConsumption: 420, totalSelfConsumption: 310, totalExport: 340, totalImport: 110
      };
    }
    const res = await this.queryWithTimeout<any>(supabase
      .from('hourly_stats')
      .select('*')
      .eq('project_id', projectId)
      .gte('start_time', new Date(startDate).toISOString())
      .lte('start_time', new Date(endDate).toISOString()));

    if (!res || res.error || !res.data) return { date: startDate, totalGeneration: 0, totalConsumption: 0, totalSelfConsumption: 0, totalExport: 0, totalImport: 0 };

    const totals = res.data.reduce((acc: any, row: any) => ({
      g: acc.g + (row.total_energy_produced || 0),
      c: acc.c + (row.total_energy_consumed || 0)
    }), { g: 0, c: 0 });

    const s = Math.min(totals.g, totals.c);
    return {
      date: startDate,
      totalGeneration: totals.g, totalConsumption: totals.c, totalSelfConsumption: s,
      totalExport: Math.max(0, totals.g - s), totalImport: Math.max(0, totals.c - s)
    };
  }

  public async getDetailedReadings(projectId: string, startDate: string, endDate: string, isDemo: boolean = false): Promise<SolarReading[]> {
    if (isDemo) return [];
    const res = await this.queryWithTimeout<any>(supabase
      .from('power_readings')
      .select('*')
      .eq('project_id', projectId)
      .gte('recorded_at', new Date(startDate).toISOString())
      .lte('recorded_at', new Date(endDate).toISOString())
      .order('recorded_at', { ascending: true }));

    if (!res || res.error || !res.data) return [];
    return res.data.map((row: any) => ({
      id: row.id.toString(),
      timestamp: row.recorded_at,
      P_pv: row.active_power_total || 0,
      P_load: 0, P_self: 0,
      P_export: row.total_energy_export || 0,
      P_import: row.total_energy_import || 0
    }));
  }

  public async getEnergySeries(projectId: string, range: 'day' | 'week' | 'month' | 'year', isDemo: boolean = false): Promise<EnergySeriesPoint[]> {
    if (isDemo) {
      const series: EnergySeriesPoint[] = [];
      const now = new Date();
      const count = range === 'day' ? 24 : range === 'week' ? 7 : range === 'month' ? 30 : 12;
      const baseYield = [55, 75, 115, 145, 175, 195, 210, 190, 140, 95, 60, 45];
      const capacity = 50;

      for (let i = 0; i < count; i++) {
        let gen = 0;
        let cons = 0;
        let label = i.toString();
        let timestamp = new Date().toISOString();

        if (range === 'day') {
          const hour = i;
          label = `${hour}:00`;
          if (hour > 6 && hour < 19) {
            const intensity = Math.max(0, 1 - Math.pow((hour - 13) / 6, 2));
            const monthYield = baseYield[now.getMonth()] / 30;
            gen = capacity * (monthYield / 8) * intensity * (0.8 + Math.random() * 0.4);
          }
          const isWorkHour = hour >= 8 && hour <= 17;
          cons = (isWorkHour ? 15 : 4) + Math.random() * 3;
        } else {
          const monthIdx = range === 'year' ? i : now.getMonth();
          const monthlyGen = capacity * baseYield[monthIdx] * (0.9 + Math.random() * 0.2);
          const monthlyCons = 4500 * (0.9 + Math.random() * 0.2);

          if (range === 'year') {
            gen = monthlyGen;
            cons = monthlyCons;
            label = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Avg", "Sep", "Okt", "Nov", "Dec"][i];
          } else {
            gen = monthlyGen / 30;
            cons = monthlyCons / 30;
            label = `Dan ${i + 1}`;
          }
        }

        const vt = cons * 0.7;
        const nt = cons * 0.3;
        const self = Math.min(gen, vt);
        const exp = Math.max(0, gen - self);
        const ivt = Math.max(0, vt - self);

        series.push({
          label,
          timestamp,
          generation: gen,
          consumption: cons,
          consumptionVT: vt,
          consumptionNT: nt,
          selfConsumption: self,
          export: exp,
          import: ivt + nt,
          importVT: ivt,
          importNT: nt
        });
      }
      return series;
    }

    let start = new Date();
    if (range === 'day') start.setHours(0, 0, 0, 0);
    else if (range === 'week') start.setDate(start.getDate() - 7);
    else if (range === 'month') start.setDate(start.getDate() - 30);
    else start = new Date(start.getFullYear(), 0, 1);

    const res = await this.queryWithTimeout<any>(supabase
      .from('hourly_stats')
      .select('*')
      .eq('project_id', projectId)
      .gte('start_time', start.toISOString())
      .order('start_time', { ascending: true }));

    if (!res || res.error || !res.data) return [];

    // Aggregate data based on range
    if (range === 'day') {
      // Hourly data - no aggregation needed
      return res.data.map((row: any) => {
        const g = row.total_energy_produced || 0;
        const c = row.total_energy_consumed || 0;
        const h = new Date(row.start_time).getHours();
        const vt = (h >= 7 && h < 23) ? c : 0;
        const nt = (h < 7 || h >= 23) ? c : 0;
        const self = Math.min(g, vt);
        return {
          label: h + ':00',
          timestamp: row.start_time,
          generation: g, consumption: c, consumptionVT: vt, consumptionNT: nt,
          selfConsumption: self, export: Math.max(0, g - self), import: Math.max(0, c - self),
          importVT: Math.max(0, vt - self), importNT: nt
        };
      });
    } else if (range === 'week' || range === 'month') {
      // Aggregate by day
      const dailyMap: { [key: string]: { g: number, c: number, vt: number, nt: number, date: Date } } = {};
      res.data.forEach((row: any) => {
        const d = new Date(row.start_time);
        const key = d.toISOString().split('T')[0];
        const h = d.getHours();
        const g = row.total_energy_produced || 0;
        const c = row.total_energy_consumed || 0;
        if (!dailyMap[key]) dailyMap[key] = { g: 0, c: 0, vt: 0, nt: 0, date: d };
        dailyMap[key].g += g;
        dailyMap[key].c += c;
        if (h >= 7 && h < 23) dailyMap[key].vt += c;
        else dailyMap[key].nt += c;
      });
      return Object.entries(dailyMap).map(([key, v]) => {
        const self = Math.min(v.g, v.vt);
        return {
          label: v.date.toLocaleDateString('sr-RS', { day: 'numeric', month: 'short' }),
          timestamp: v.date.toISOString(),
          generation: v.g, consumption: v.c, consumptionVT: v.vt, consumptionNT: v.nt,
          selfConsumption: self, export: Math.max(0, v.g - self),
          import: Math.max(0, v.vt - self) + v.nt, importVT: Math.max(0, v.vt - self), importNT: v.nt
        };
      });
    } else {
      // Year - aggregate by month
      const monthlyMap: { [key: number]: { g: number, c: number, vt: number, nt: number } } = {};
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Avg", "Sep", "Okt", "Nov", "Dec"];
      res.data.forEach((row: any) => {
        const d = new Date(row.start_time);
        const m = d.getMonth();
        const h = d.getHours();
        const g = row.total_energy_produced || 0;
        const c = row.total_energy_consumed || 0;
        if (!monthlyMap[m]) monthlyMap[m] = { g: 0, c: 0, vt: 0, nt: 0 };
        monthlyMap[m].g += g;
        monthlyMap[m].c += c;
        if (h >= 7 && h < 23) monthlyMap[m].vt += c;
        else monthlyMap[m].nt += c;
      });
      return Object.entries(monthlyMap).map(([m, v]) => {
        const mi = parseInt(m);
        const self = Math.min(v.g, v.vt);
        return {
          label: monthNames[mi],
          timestamp: new Date(new Date().getFullYear(), mi, 1).toISOString(),
          generation: v.g, consumption: v.c, consumptionVT: v.vt, consumptionNT: v.nt,
          selfConsumption: self, export: Math.max(0, v.g - self),
          import: Math.max(0, v.vt - self) + v.nt, importVT: Math.max(0, v.vt - self), importNT: v.nt
        };
      });
    }
  }

  public async getHistorySeries(projectId: string, startDate: string, endDate: string, isDemo: boolean = false): Promise<EnergySeriesPoint[]> {
    if (isDemo) {
      // Mock history based on profile
      const series: EnergySeriesPoint[] = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      const baseYield = [55, 75, 115, 145, 175, 195, 210, 190, 140, 95, 60, 45];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const monthIdx = d.getMonth();
        const gen = (50 * baseYield[monthIdx] / 30) * (0.8 + Math.random() * 0.4);
        const cons = (4500 / 30) * (0.9 + Math.random() * 0.2);
        const vt = cons * 0.7;
        const self = Math.min(gen, vt);
        series.push({
          label: d.toLocaleDateString('sr-RS', { day: 'numeric', month: 'short' }),
          timestamp: d.toISOString(),
          generation: gen, consumption: cons, consumptionVT: vt, consumptionNT: cons * 0.3,
          selfConsumption: self, export: Math.max(0, gen - self), import: (vt - self) + (cons * 0.3),
          importVT: Math.max(0, vt - self),
          importNT: cons * 0.3
        });
      }
      return series;
    }
    const res = await this.queryWithTimeout<any>(supabase
      .from('hourly_stats')
      .select('*')
      .eq('project_id', projectId)
      .gte('start_time', new Date(startDate).toISOString())
      .lte('start_time', new Date(endDate).toISOString())
      .order('start_time', { ascending: true }));

    if (!res || res.error || !res.data) return [];
    return res.data.map((row: any) => {
      const g = row.total_energy_produced || 0;
      const c = row.total_energy_consumed || 0;
      const h = new Date(row.start_time).getHours();
      const vt = (h >= 7 && h < 23) ? c : 0;
      const nt = (h < 7 || h >= 23) ? c : 0;
      const s = Math.min(g, vt);
      return {
        label: new Date(row.start_time).toLocaleDateString(),
        timestamp: row.start_time,
        generation: g, consumption: c, consumptionVT: vt, consumptionNT: nt,
        selfConsumption: s, export: Math.max(0, g - s), import: (vt - s) + nt,
        importVT: Math.max(0, vt - s),
        importNT: nt
      };
    });
  }

  public async getYearlyStats(projectId: string, year: number, isDemo: boolean = false): Promise<EnergySeriesPoint[]> {
    if (isDemo) {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Avg", "Sep", "Okt", "Nov", "Dec"];
      const baseYield = [55, 75, 115, 145, 175, 195, 210, 190, 140, 95, 60, 45];
      return monthNames.map((name, i) => {
        const gen = 50 * baseYield[i] * (0.95 + Math.random() * 0.1);
        const cons = 4500 * (0.95 + Math.random() * 0.1);
        const vt = cons * 0.7;
        const self = Math.min(gen, vt);
        return {
          label: name, timestamp: new Date(year, i, 1).toISOString(),
          generation: gen, consumption: cons, consumptionVT: vt, consumptionNT: cons * 0.3,
          selfConsumption: self, export: Math.max(0, gen - self),
          import: (vt - self) + (cons * 0.3), importVT: Math.max(0, vt - self), importNT: cons * 0.3
        } as any;
      });
    }

    const res = await this.queryWithTimeout<any>(supabase
      .from('hourly_stats')
      .select('*')
      .eq('project_id', projectId)
      .gte('start_time', new Date(year, 0, 1).toISOString())
      .lte('start_time', new Date(year, 11, 31, 23, 59, 59).toISOString())
      .order('start_time', { ascending: true }));

    if (!res || res.error || !res.data) return [];

    const months = new Array(12).fill(0).map((_, i) => ({
      label: i.toString(), g: 0, c: 0, vt: 0, nt: 0
    }));

    res.data.forEach((row: any) => {
      const d = new Date(row.start_time);
      const m = d.getMonth();
      const h = d.getHours();
      const g = row.total_energy_produced || 0;
      const c = row.total_energy_consumed || 0;
      months[m].g += g;
      months[m].c += c;
      if (h >= 7 && h < 23) months[m].vt += c;
      else months[m].nt += c;
    });

    return months.map((m, i) => {
      const self = Math.min(m.g, m.vt);
      return {
        label: i.toString(), timestamp: new Date(year, i, 1).toISOString(),
        generation: m.g, consumption: m.c, consumptionVT: m.vt, consumptionNT: m.nt,
        selfConsumption: self, export: Math.max(0, m.g - self),
        import: (m.vt - self) + m.nt, importVT: Math.max(0, m.vt - self), importNT: m.nt
      } as any;
    });
  }
}

export const apiService = new ApiService();
