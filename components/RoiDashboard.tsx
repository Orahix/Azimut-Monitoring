import React from 'react';
import { InvestmentAnalysis } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface RoiDashboardProps {
    analysis: InvestmentAnalysis;
    theme: 'light' | 'dark';
}

export const RoiDashboard: React.FC<RoiDashboardProps> = ({ analysis, theme }) => {
    const chartData = analysis.cashFlows.map(cf => ({
        year: cf.year === 0 ? 'Danas' : `${cf.year}. god`,
        cumulative: Math.round(cf.cumulativeCashFlow),
        flow: Math.round(cf.netCashFlow),
        zero: 0
    }));

    const formatMoney = (val: number) =>
        new Intl.NumberFormat('sr-RS', {
            style: 'currency',
            currency: 'RSD',
            maximumFractionDigits: 0,
            notation: "compact",
            compactDisplay: "short"
        }).format(val);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Financial KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm">
                    <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Period Otplate</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-emerald-500">
                            {analysis.paybackPeriod > 0 ? analysis.paybackPeriod.toFixed(1) : '> 20'}
                        </span>
                        <span className="text-emerald-500 font-bold text-sm">godina</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium italic">Tačka u kojoj se investicija u potpunosti isplati</p>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm">
                    <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">ROI (Ukupan Povrat)</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-blue-500">
                            {analysis.roi.toFixed(1)}%
                        </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium italic">Projektovana dobit u periodu od 20 godina</p>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm">
                    <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">IRR (Interna Stopa)</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-purple-500">
                            {analysis.irr.toFixed(1)}%
                        </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium italic">Godišnja stopa prinosa na uloženi kapital</p>
                </div>
            </div>

            {/* Cash Flow Chart */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-[450px]">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-8">Tok Novca (Kumulativni Profit)</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="year"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            stroke={theme === 'dark' ? '#475569' : '#94a3b8'}
                            dy={10}
                        />
                        <YAxis
                            tickFormatter={(val) => formatMoney(val)}
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            stroke={theme === 'dark' ? '#475569' : '#94a3b8'}
                        />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                        <Tooltip
                            formatter={(value: number) => new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'RSD', maximumFractionDigits: 0 }).format(value)}
                            contentStyle={{
                                borderRadius: '16px',
                                border: 'none',
                                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                                color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                            }}
                        />
                        <ReferenceLine y={0} stroke={theme === 'dark' ? '#334155' : '#cbd5e1'} strokeDasharray="5 5" />
                        <Area
                            type="monotone"
                            dataKey="cumulative"
                            stroke="#10b981"
                            strokeWidth={4}
                            fillOpacity={1}
                            fill="url(#colorCumulative)"
                            name="Kumulativna Dobit"
                            animationBegin={300}
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Cash Flow Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Projekcija po Godinama</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-bold border-b dark:border-slate-700">
                                <th className="px-6 py-4 text-left uppercase">Godina</th>
                                <th className="px-6 py-4 uppercase">Ušteda (Energija)</th>
                                <th className="px-6 py-4 uppercase">Troškovi (Održavanje)</th>
                                <th className="px-6 py-4 uppercase">Neto Godišnje</th>
                                <th className="px-6 py-4 bg-slate-100 dark:bg-slate-800 font-black uppercase text-slate-900 dark:text-white">Kumulativno</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {analysis.cashFlows.map((cf) => (
                                <tr key={cf.year} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${cf.year === 0 ? 'bg-red-50/20 dark:bg-red-900/10' : ''}`}>
                                    <td className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-300">
                                        {cf.year === 0 ? 'Početna Investicija' : `${cf.year}. Godina`}
                                    </td>
                                    <td className="px-6 py-4 font-mono font-medium text-emerald-600 dark:text-emerald-400">
                                        {cf.year > 0 ? '+' : ''}{new Intl.NumberFormat('sr-RS').format(Math.round(cf.energySavings))}
                                    </td>
                                    <td className="px-6 py-4 font-mono font-medium text-red-500">
                                        {cf.maintenanceCost > 0 ? '-' : ''}{new Intl.NumberFormat('sr-RS').format(Math.round(cf.maintenanceCost))}
                                    </td>
                                    <td className="px-6 py-4 font-mono font-black text-slate-900 dark:text-white">
                                        {new Intl.NumberFormat('sr-RS').format(Math.round(cf.netCashFlow))}
                                    </td>
                                    <td className={`px-6 py-4 font-mono font-black bg-slate-50/50 dark:bg-slate-800/50 ${cf.cumulativeCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                        {new Intl.NumberFormat('sr-RS').format(Math.round(cf.cumulativeCashFlow))}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
