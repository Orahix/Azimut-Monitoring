import React, { useState, useEffect, useMemo } from 'react';
import { Project, MonthlyCalculation, CalculationResult, InvestmentAnalysis, TariffRates } from '../types';
import { apiService } from '../services/apiService';
import { calculateAnnual, calculateInvestmentAnalysis, formatCurrency, DEFAULT_RATES } from '../services/calculatorService';
import { MonthlyBillView } from './MonthlyBillView';
import { RoiDashboard } from './RoiDashboard';
import { TariffEditor } from './TariffEditor';
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
import {
    TrendingUp,
    Sun,
    Zap,
    ArrowRight,
    ChevronRight,
    Calculator,
    X,
    Globe,
    DollarSign,
    PieChart,
    Table as TableIcon,
    Settings
} from 'lucide-react';

interface ProjectSavingsTabProps {
    project: Project;
    theme: 'light' | 'dark';
}

export const ProjectSavingsTab: React.FC<ProjectSavingsTabProps> = ({ project, theme }) => {
    const [loading, setLoading] = useState(true);
    const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
    const [baselineResult, setBaselineResult] = useState<CalculationResult | null>(null);
    const [roiAnalysis, setRoiAnalysis] = useState<InvestmentAnalysis | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<MonthlyCalculation | null>(null);
    const [activeSubTab, setActiveSubTab] = useState<'overview' | 'roi' | 'table'>('overview');

    // Custom Rates state
    const [rates, setRates] = useState<TariffRates>(DEFAULT_RATES);
    const [isTariffEditorOpen, setIsTariffEditorOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const stats = await apiService.getRollingYearStats(project.id, project.isDemo);

                if (stats && stats.length > 0) {
                    const inputs = stats.map((s, i) => ({
                        id: i,
                        monthName: s.label, // These are now already Jan, Feb, etc. from rolling stats
                        year: s.year || 2026,
                        vt: s.consumptionVT,
                        nt: s.consumptionNT,
                        maxPower: s.maxPower || 0,
                        solarProduction: s.generation,
                        // Sync with physical flows
                        importVT: (s as any).importVT !== undefined ? (s as any).importVT : (s.import * 0.7), // Fallback to 70/30 if not explicit
                        importNT: (s as any).importNT !== undefined ? (s as any).importNT : (s.import * 0.3),
                        export: s.export,
                        selfConsumption: s.selfConsumption,
                        reactiveImportVT: 0,
                        reactiveImportNT: 0,
                        reactiveExportVT: 0,
                        reactiveExportNT: 0
                    }));

                    const res = calculateAnnual(inputs, rates, project.installedPowerKw, 70);
                    setCalculationResult(res);

                    const baselineInputs = inputs.map(i => ({ ...i, solarProduction: 0, importVT: i.vt, importNT: i.nt, export: 0, selfConsumption: 0 }));
                    const baselineRes = calculateAnnual(baselineInputs, rates, project.installedPowerKw, 0);
                    setBaselineResult(baselineRes);

                    // Use investment cost from rates
                    const roi = calculateInvestmentAnalysis(
                        res,
                        inputs,
                        rates,
                        project.installedPowerKw,
                        rates.investmentCost
                    );
                    setRoiAnalysis(roi);
                }
            } catch (err) {
                console.error("Error loading savings data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [project.id, project.isDemo, project.installedPowerKw, rates]);

    const annualSavings = useMemo(() => {
        if (!calculationResult || !baselineResult) return 0;
        return baselineResult.totalAnnualBill - calculationResult.totalAnnualBill;
    }, [calculationResult, baselineResult]);

    const co2Reduced = useMemo(() => {
        if (!calculationResult) return 0;
        return Math.round(calculationResult.totalSolarProduced * 0.7);
    }, [calculationResult]);

    const chartData = useMemo(() => {
        if (!calculationResult || !baselineResult) return [];
        return calculationResult.monthlyBreakdown.map((m, i) => ({
            name: m.monthName,
            "Sa Solarom": Math.round(m.totalBill),
            "Bez Solara": Math.round(baselineResult.monthlyBreakdown[i].totalBill),
        }));
    }, [calculationResult, baselineResult]);

    if (loading && !calculationResult) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium">Vršenje proračuna...</p>
            </div>
        );
    }

    if (!calculationResult) return null;

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">

            {/* Tab & Utility Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
                    <button
                        onClick={() => setActiveSubTab('overview')}
                        className={`flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeSubTab === 'overview' ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <PieChart size={18} /> Pregled
                    </button>
                    <button
                        onClick={() => setActiveSubTab('roi')}
                        className={`flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeSubTab === 'roi' ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <TrendingUp size={18} /> ROI Analiza
                    </button>
                    <button
                        onClick={() => setActiveSubTab('table')}
                        className={`flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeSubTab === 'table' ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <TableIcon size={18} /> Tabelarni Prikaz
                    </button>
                </div>

                <button
                    onClick={() => setIsTariffEditorOpen(true)}
                    className="flex items-center gap-2 px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-tight hover:opacity-90 active:scale-95 transition-all shadow-lg"
                >
                    <Settings size={16} /> Izmeni Cene
                </button>
            </div>

            {activeSubTab === 'overview' && (
                <div className="space-y-6">
                    {/* Top Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-2xl text-white shadow-xl shadow-amber-500/20">
                            <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Godišnja Ušteda</p>
                            <p className="text-3xl font-black tracking-tighter">{formatCurrency(annualSavings)}</p>
                            <div className="mt-4 bg-white/20 rounded-lg p-2 text-[10px] font-bold">
                                Smanjenje računa za {(annualSavings / (baselineResult?.totalAnnualBill || 1) * 100).toFixed(0)}%
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600"><DollarSign size={20} /></div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Solar Kredit</span>
                            </div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{formatCurrency(calculationResult.totalCreditUsed)}</p>
                            <p className="text-[10px] text-slate-400 mt-1 italic">Vrednost predate energije</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600"><Globe size={20} /></div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">CO₂ Redukcija</span>
                            </div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{co2Reduced.toLocaleString()} <span className="text-sm font-normal text-slate-400">kg</span></p>
                            <p className="text-[10px] text-slate-400 mt-1 italic">Godišnje sakupljeno</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600"><Zap size={20} /></div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">ROI Period</span>
                            </div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{roiAnalysis?.paybackPeriod.toFixed(1)} <span className="text-sm font-normal text-slate-400">god</span></p>
                            <p className="text-[10px] text-slate-400 mt-1 italic">Isplaćivanje investicije</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-8">Račun: Sa vs Bez Solara</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                                        <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} stroke={theme === 'dark' ? '#475569' : '#94a3b8'} />
                                        <YAxis fontSize={10} tickLine={false} axisLine={false} unit=" RSD" stroke={theme === 'dark' ? '#475569' : '#94a3b8'} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff' }}
                                        />
                                        <Bar dataKey="Bez Solara" fill={theme === 'dark' ? '#334155' : '#e2e8f0'} radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="Sa Solarom" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6">Mesečni Obračuni</h3>
                            <div className="space-y-2 max-h-[310px] overflow-y-auto pr-2 custom-scrollbar">
                                {calculationResult.monthlyBreakdown.map((m, i) => {
                                    const baseline = baselineResult!.monthlyBreakdown[i];
                                    return (
                                        <button
                                            key={m.monthId}
                                            onClick={() => setSelectedMonth(m)}
                                            className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 hover:bg-amber-50 dark:hover:bg-amber-900/10 rounded-xl transition-all group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-[10px] font-black flex items-center justify-center border border-slate-200 dark:border-slate-700 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                                    {m.monthName.substring(0, 3)}
                                                </div>
                                                <span className="font-bold text-slate-700 dark:text-slate-300">{m.monthName}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(m.totalBill)}</div>
                                                <div className="text-[10px] font-bold text-green-500 uppercase">Ušteda: {formatCurrency(baseline.totalBill - m.totalBill)}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeSubTab === 'roi' && roiAnalysis && (
                <RoiDashboard analysis={roiAnalysis} theme={theme} />
            )}

            {activeSubTab === 'table' && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in duration-500">
                    <div className="p-8 border-b dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">Godišnja Rekapitulacija</h3>
                        <p className="text-sm text-slate-500 mt-1 font-medium">Finansijski prikaz po mesecima na osnovu unetih cena</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[11px] border-collapse min-w-[1000px]">
                            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-400 font-black uppercase">
                                <tr>
                                    <th className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-900 px-6 py-4 text-left border-r dark:border-slate-700 w-48">Opis Stavke</th>
                                    {calculationResult.monthlyBreakdown.map(m => <th key={m.monthId} className="px-3 py-4 text-right">{m.monthName.substring(0, 3)}</th>)}
                                    <th className="sticky right-0 z-10 bg-slate-100 dark:bg-slate-800 px-6 py-4 text-right text-slate-700 dark:text-white border-l dark:border-slate-700">UKUPNO</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-400">
                                <DetailedRow label="Energija (Prodaja+Prenos)" data={calculationResult.monthlyBreakdown.map(m => m.energyTotal + m.accessTotal)} />
                                <DetailedRow label="Naknade i Takse" data={calculationResult.monthlyBreakdown.map(m => m.feesTotal)} />
                                <DetailedRow label="Porezi i Akcize" data={calculationResult.monthlyBreakdown.map(m => m.exciseAmount + m.vatAmount)} />
                                <tr className="bg-emerald-500/10 dark:bg-emerald-500/5 font-bold text-emerald-600 dark:text-emerald-400">
                                    <td className="sticky left-0 bg-emerald-50 dark:bg-slate-900 px-6 py-4 text-left border-r dark:border-slate-700">SOLAR KREDIT (-)</td>
                                    {calculationResult.monthlyBreakdown.map(m => <td key={m.monthId} className="px-3 py-4 text-right">-{formatCurrency(m.solarCreditGenerated)}</td>)}
                                    <td className="sticky right-0 bg-emerald-100 dark:bg-emerald-900/50 px-6 py-4 text-right border-l dark:border-slate-700">-{formatCurrency(calculationResult.totalSolarCreditGenerated)}</td>
                                </tr>
                                <tr className="bg-slate-900 text-white font-black">
                                    <td className="sticky left-0 bg-slate-900 px-6 py-5 text-left border-r border-slate-700">UKUPNO ZA UPLATU</td>
                                    {calculationResult.monthlyBreakdown.map(m => <td key={m.monthId} className="px-3 py-5 text-right font-mono tracking-tighter">{formatCurrency(m.totalBill)}</td>)}
                                    <td className="sticky right-0 bg-amber-500 px-6 py-5 text-right border-l border-amber-400 text-sm shadow-[-10px_0_20px_rgba(0,0,0,0.3)]">{formatCurrency(calculationResult.totalAnnualBill)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Bill View Modal */}
            {selectedMonth && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={() => setSelectedMonth(null)}></div>
                    <div className="relative z-10 w-full max-w-4xl max-h-screen overflow-hidden">
                        <button
                            onClick={() => setSelectedMonth(null)}
                            className="absolute right-6 top-6 p-2 bg-white dark:bg-slate-800 rounded-full shadow-2xl z-20 hover:scale-110 transition-all text-slate-500"
                        >
                            <X size={24} />
                        </button>
                        <MonthlyBillView
                            data={selectedMonth}
                            approvedPower={project.installedPowerKw}
                            onClose={() => setSelectedMonth(null)}
                            rates={rates}
                        />
                    </div>
                </div>
            )}

            {/* Tariff Editor Modal */}
            {isTariffEditorOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={() => setIsTariffEditorOpen(false)}></div>
                    <div className="relative z-10 w-full max-w-3xl overflow-hidden">
                        <TariffEditor
                            initialRates={rates}
                            onSave={(newRates) => {
                                setRates(newRates);
                                setIsTariffEditorOpen(false);
                            }}
                            onClose={() => setIsTariffEditorOpen(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

const DetailedRow = ({ label, data }: { label: string, data: number[] }) => (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
        <td className="sticky left-0 bg-white dark:bg-slate-900 px-6 py-4 text-left font-bold border-r dark:border-slate-700 text-slate-800 dark:text-slate-200">{label}</td>
        {data.map((val, i) => <td key={i} className="px-3 py-4 text-right font-mono">{formatCurrency(val)}</td>)}
        <td className="sticky right-0 bg-slate-50 dark:bg-slate-800/80 px-6 py-4 text-right font-black border-l dark:border-slate-700">{formatCurrency(data.reduce((a, b) => a + b, 0))}</td>
    </tr>
);
