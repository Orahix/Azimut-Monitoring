import React, { useState, useEffect } from 'react';
import { Project, EnergySeriesPoint, TariffRates, MonthlyCalculation } from '../types';
import { apiService } from '../services/apiService';
import { calculateRow, formatCurrency, DEFAULT_RATES } from '../services/calculatorService';
import { Receipt, TrendingUp, Clock, Info, ShieldCheck, RefreshCw } from 'lucide-react';

interface LiveBillCardProps {
    project: Project;
    rates?: TariffRates;
}

export const LiveBillCard: React.FC<LiveBillCardProps> = ({ project, rates = DEFAULT_RATES }) => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [liveData, setLiveData] = useState<EnergySeriesPoint | null>(null);
    const [bill, setBill] = useState<MonthlyCalculation | null>(null);
    const [totalSavings, setTotalSavings] = useState<number>(0);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    const fetchLiveData = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        try {
            const stats = await apiService.getCurrentMonthStats(project.id, project.isDemo);
            if (stats) {
                setLiveData(stats);
                setLastRefresh(new Date());

                // 1. Calculate REAL bill with Solar
                const currentCalc = calculateRow({
                    id: new Date().getMonth(),
                    monthName: new Date().toLocaleString('sr-RS', { month: 'long' }),
                    vt: stats.consumptionVT,
                    nt: stats.consumptionNT,
                    maxPower: 0,
                    solarProduction: stats.generation,
                    importVT: stats.importVT,
                    importNT: stats.importNT,
                    export: stats.export,
                    selfConsumption: stats.selfConsumption
                }, rates, project.installedPowerKw, 0, 70);

                // 2. Calculate BASELINE bill (if there were no solar panels)
                const baselineCalc = calculateRow({
                    id: new Date().getMonth(),
                    monthName: new Date().toLocaleString('sr-RS', { month: 'long' }),
                    vt: stats.consumptionVT,
                    nt: stats.consumptionNT,
                    maxPower: 0,
                    solarProduction: 0,
                    importVT: stats.consumptionVT,
                    importNT: stats.consumptionNT,
                    export: 0,
                    selfConsumption: 0
                }, rates, project.installedPowerKw, 0, 0);

                setBill(currentCalc);
                setTotalSavings(baselineCalc.totalBill - currentCalc.totalBill);
            }
        } catch (err) {
            console.error("Error fetching live bill:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchLiveData();
        const interval = setInterval(() => fetchLiveData(), 3600000);
        return () => clearInterval(interval);
    }, [project.id, project.isDemo, rates]);

    if (loading || !bill) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm animate-pulse">
                <div className="h-4 w-24 bg-slate-100 dark:bg-slate-700 rounded mb-4"></div>
                <div className="h-8 w-40 bg-slate-100 dark:bg-slate-700 rounded mb-2"></div>
                <div className="h-3 w-32 bg-slate-100 dark:bg-slate-700 rounded"></div>
            </div>
        );
    }

    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const dayOfMonth = new Date().getDate();
    const progressPercent = Math.round((dayOfMonth / daysInMonth) * 100);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden group hover:border-amber-500/50 transition-all duration-500">
            <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-500 rounded-xl text-white shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
                            <Receipt size={20} />
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Trenutni Račun</h3>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                                <Clock size={10} /> Osveženo u {formatTime(lastRefresh)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchLiveData(true)}
                            disabled={refreshing}
                            className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-amber-500 hover:border-amber-500/50 transition-all disabled:opacity-50"
                            title="Osveži podatke"
                        >
                            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                        </button>
                        <div className="bg-slate-50 dark:bg-slate-900/50 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700 flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">Live</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-1 mb-8">
                    <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                        {formatCurrency(bill.totalBill)}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                        Procena troškova do današnjeg dana
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                            <span>Progres meseca</span>
                            <span>{dayOfMonth}. {bill.monthName}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${progressPercent}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight mb-1">Mrežni Troškovi</p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatCurrency(bill.accessTotal + bill.feesTotal)}</p>
                        </div>
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/20">
                            <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-tight mb-1">Solar Ušteda</p>
                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(totalSavings)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <ShieldCheck size={14} className="text-amber-500" />
                <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 italic">
                    Obuhvata PDV, Akcizu i sve fiksne naknade.
                </p>
            </div>
        </div>
    );
};
