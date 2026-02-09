import React, { useState, useMemo, useEffect } from 'react';
import {
    Calculator,
    TrendingUp,
    Zap,
    Sun,
    DollarSign,
    Info,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    LayoutGrid
} from 'lucide-react';
import {
    DEFAULT_RATES,
    MONTH_NAMES,
    calculateAnnual,
    formatCurrency
} from '../services/calculatorService';
import { apiService } from '../services/apiService';
import { MonthlyInput, Project } from '../types';
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

export const SavingsCalculator: React.FC = () => {
    // Initial monthly inputs (all zeros)
    const initialInputs: MonthlyInput[] = MONTH_NAMES.map((name, index) => ({
        id: index,
        monthName: name,
        vt: 0,
        nt: 0,
        maxPower: 0,
        solarProduction: 0
    }));

    // State
    const [inputs, setInputs] = useState<MonthlyInput[]>(initialInputs);
    const [approvedPower, setApprovedPower] = useState<number>(10);
    const [solarSelfConsumption, setSolarSelfConsumption] = useState<number>(70);
    const [isRatesOpen, setIsRatesOpen] = useState(false);

    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Fetch Projects for selection
    useEffect(() => {
        apiService.getProjects().then(setProjects);
    }, []);

    // Handler to load project data
    const loadProjectData = async (projectId: string) => {
        if (!projectId) return;
        setIsLoadingData(true);
        try {
            const proj = projects.find(p => p.id === projectId);
            if (proj) {
                setApprovedPower(proj.installedPowerKw);
            }

            // Fetch stats for current year (2025 or whatever is default)
            const currentYear = new Date().getFullYear();
            const stats = await apiService.getYearlyStats(projectId, currentYear, proj?.isDemo);

            if (stats && stats.length > 0) {
                setInputs(prev => prev.map((item, idx) => {
                    const monthStat = stats[idx];
                    return {
                        ...item,
                        vt: monthStat ? Math.round(monthStat.consumption) : 0,
                        nt: 0, // In current system we don't differentiate VT/NT in stats yet
                        solarProduction: monthStat ? Math.round(monthStat.generation) : 0
                    };
                }));
            }
        } catch (err) {
            console.error("Error loading project data for calculator:", err);
        } finally {
            setIsLoadingData(false);
        }
    };

    // Derive Results
    const result = useMemo(() => {
        return calculateAnnual(inputs, DEFAULT_RATES, approvedPower, solarSelfConsumption);
    }, [inputs, approvedPower, solarSelfConsumption]);

    // Baseline Calculation (Without Solar)
    const baselineResult = useMemo(() => {
        const noSolarInputs = inputs.map(i => ({ ...i, solarProduction: 0 }));
        return calculateAnnual(noSolarInputs, DEFAULT_RATES, approvedPower, 0);
    }, [inputs, approvedPower]);

    const annualSavings = baselineResult.totalAnnualBill - result.totalAnnualBill;

    // Handlers
    const handleInputChange = (id: number, field: keyof MonthlyInput, value: string) => {
        const numValue = value === '' ? 0 : parseFloat(value);
        setInputs(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: numValue } : item
        ));
    };

    const fillAverage = () => {
        const avgVT = prompt("Unesite prosečnu mesečnu potrošnju u VT (kWh):", "500");
        const avgNT = prompt("Unesite prosečnu mesečnu potrošnju u NT (kWh):", "300");
        const avgGen = prompt("Unesite prosečnu mesečnu solarnu proizvodnju (kWh):", "400");

        if (avgVT !== null || avgNT !== null || avgGen !== null) {
            setInputs(prev => prev.map(item => ({
                ...item,
                vt: avgVT ? parseFloat(avgVT) : item.vt,
                nt: avgNT ? parseFloat(avgNT) : item.nt,
                solarProduction: avgGen ? parseFloat(avgGen) : item.solarProduction
            })));
        }
    };

    // Chart Data
    const chartData = result.monthlyBreakdown.map((m, idx) => {
        const baselineMonth = baselineResult.monthlyBreakdown[idx];
        return {
            name: m.monthName.substring(0, 3),
            "Sa Solarom": Math.round(m.totalBill),
            "Bez Solara": Math.round(baselineMonth.totalBill),
            "Ušteda": Math.round(baselineMonth.totalBill - m.totalBill)
        };
    });

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-6 bg-slate-50 dark:bg-slate-900/50 min-h-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Calculator className="text-amber-500" size={32} />
                        Kalkulator Uštede
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Analiza energetskih i finansijskih benefita solarne elektrane
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <LayoutGrid className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
                        >
                            <option value="">Izaberi projekat za uvoz podataka...</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={() => loadProjectData(selectedProjectId)}
                        disabled={!selectedProjectId || isLoadingData}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white rounded-lg font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-95 text-sm whitespace-nowrap"
                    >
                        {isLoadingData ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        Uvezi Podatke
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600"><TrendingUp size={20} /></div>
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Godišnja Ušteda</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(annualSavings)} RSD</p>
                    <p className="text-xs text-green-500 mt-1 font-medium italic">Smanjenje računa od {(annualSavings / (baselineResult.totalAnnualBill || 1) * 100).toFixed(1)}%</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600"><Sun size={20} /></div>
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Ukupna Proizvodnja</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{result.totalSolarProduced.toLocaleString()} kWh</p>
                    <p className="text-xs text-slate-400 mt-1">Solar doprinosi sa {(result.totalSolarProduced / (result.totalConsumptionVT + result.totalConsumptionNT || 1) * 100).toFixed(0)}% potrebama</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600"><Zap size={20} /></div>
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Prosečan Račun</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(result.averageMonthlyBill)} RSD</p>
                    <p className="text-xs text-slate-400 mt-1">Bio bi {formatCurrency(baselineResult.averageMonthlyBill)} bez solara</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600"><DollarSign size={20} /></div>
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Iskorišćen Kredit</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(result.totalCreditUsed)} RSD</p>
                    <p className="text-xs text-slate-400 mt-1">Od predatih {result.totalSolarExported.toFixed(0)} kWh u mrežu</p>
                </div>
            </div>

            {/* Main Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: Inputs & Rates */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Info size={18} className="text-amber-500" />
                            Podešavanja Sistema
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Odobrena Snaga (kW)</label>
                                <input
                                    type="number"
                                    value={approvedPower}
                                    onChange={e => setApprovedPower(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Sopstvena Potrošnja (%)</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min="0" max="100" step="5"
                                        value={solarSelfConsumption}
                                        onChange={e => setSolarSelfConsumption(parseInt(e.target.value))}
                                        className="flex-1 accent-amber-500"
                                    />
                                    <span className="text-sm font-bold text-amber-500 min-w-[40px] text-right">{solarSelfConsumption}%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden text-sm">
                        <button
                            onClick={() => setIsRatesOpen(!isRatesOpen)}
                            className="w-full p-4 flex justify-between items-center font-bold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
                        >
                            <span>Pregled Tarifa (RSD)</span>
                            {isRatesOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>

                        {isRatesOpen && (
                            <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-700 space-y-2">
                                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-700/50">
                                    <span className="text-slate-500">Energija (VT/NT)</span>
                                    <span className="font-medium dark:text-slate-200">{DEFAULT_RATES.activeEnergyVT.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-700/50">
                                    <span className="text-slate-500">Prenos (VT)</span>
                                    <span className="font-medium dark:text-slate-200">{DEFAULT_RATES.distributionVT.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-700/50">
                                    <span className="text-slate-500">Prenos (NT)</span>
                                    <span className="font-medium dark:text-slate-200">{DEFAULT_RATES.distributionNT.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-700/50">
                                    <span className="text-slate-500">Naknada OIE</span>
                                    <span className="font-medium dark:text-slate-200">{DEFAULT_RATES.feeOIE.toFixed(3)}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-700/50">
                                    <span className="text-slate-500">Akciza / PDV</span>
                                    <span className="font-medium dark:text-slate-200">{DEFAULT_RATES.exciseTaxPercent}% / {DEFAULT_RATES.vatPercent}%</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 text-center">
                        <button
                            onClick={fillAverage}
                            className="text-amber-500 hover:text-amber-600 text-xs font-bold uppercase tracking-wider"
                        >
                            Resetuj i Popuni Ručno
                        </button>
                    </div>
                </div>

                {/* Right: Input Table & Visualization */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-6">Poređenje Mesečnih Računa</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} unit=" RSD" />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend verticalAlign="top" align="right" height={36} />
                                    <Bar dataKey="Bez Solara" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Sa Solarom" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                        <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Mesec</th>
                                        <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Potrošnja (kWh)</th>
                                        <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-amber-600">Solar Proizv. (kWh)</th>
                                        <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Račun (RSD)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {inputs.map((row, idx) => (
                                        <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors group">
                                            <td className="p-3 text-sm font-medium text-slate-900 dark:text-slate-100">{row.monthName}</td>
                                            <td className="p-3">
                                                <input
                                                    type="number"
                                                    value={row.vt || ''}
                                                    onChange={e => handleInputChange(row.id, 'vt', e.target.value)}
                                                    className="w-full max-w-[100px] bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-amber-500 group-hover:bg-white dark:group-hover:bg-slate-900"
                                                />
                                            </td>
                                            <td className="p-3">
                                                <input
                                                    type="number"
                                                    value={row.solarProduction || ''}
                                                    onChange={e => handleInputChange(row.id, 'solarProduction', e.target.value)}
                                                    className="w-full max-w-[100px] bg-amber-50/30 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-amber-500 group-hover:bg-white dark:group-hover:bg-slate-900 text-amber-600 font-medium"
                                                />
                                            </td>
                                            <td className="p-3 text-right text-sm font-bold text-slate-700 dark:text-slate-300">
                                                {Math.round(result.monthlyBreakdown[idx].totalBill).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-50/50 dark:bg-slate-900/80 font-bold">
                                        <td className="p-3 text-sm">UKUPNO</td>
                                        <td className="p-3 text-sm text-slate-500">{inputs.reduce((s, i) => s + i.vt, 0).toLocaleString()}</td>
                                        <td className="p-3 text-sm text-amber-500">{result.totalSolarProduced.toLocaleString()}</td>
                                        <td className="p-3 text-right text-amber-600">{Math.round(result.totalAnnualBill).toLocaleString()} <span className="text-[10px] uppercase font-normal">RSD</span></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
