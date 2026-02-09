import React, { useState } from 'react';
import { TariffRates } from '../types';
import { DEFAULT_RATES } from '../services/calculatorService';
import { X, Save, RefreshCw } from 'lucide-react';

interface TariffEditorProps {
    initialRates: TariffRates;
    onSave: (newRates: TariffRates) => void;
    onClose: () => void;
}

export const TariffEditor: React.FC<TariffEditorProps> = ({ initialRates, onSave, onClose }) => {
    const [rates, setRates] = useState<TariffRates>(initialRates);

    const handleChange = (key: keyof TariffRates, value: string) => {
        setRates(prev => ({
            ...prev,
            [key]: parseFloat(value) || 0
        }));
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-700 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Cenovnik i Tarife</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Podešavanje parametara za obračun</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                    <X size={24} className="text-slate-400" />
                </button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
                {/* Group 0: Investment */}
                <section className="space-y-4">
                    <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1 h-3 bg-emerald-500 rounded-full"></div>
                        0. Investicija i Povrat
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField
                            label="Ukupna Investicija (RSD)"
                            value={rates.investmentCost}
                            onChange={v => handleChange('investmentCost', v)}
                        />
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/20 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium italic">
                            Ova vrednost se direktno koristi za obračun Perioda Otplate, ROI i IRR metrika u dashboard-u štednje.
                        </div>
                    </div>
                </section>

                {/* Group 1: Supply */}
                <section className="space-y-4">
                    <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1 h-3 bg-blue-500 rounded-full"></div>
                        1. Električna Energija (Snabdevanje)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField
                            label="Aktivna Energija VT (RSD/kWh)"
                            value={rates.activeEnergyVT}
                            onChange={v => handleChange('activeEnergyVT', v)}
                        />
                        <InputField
                            label="Aktivna Energija NT (RSD/kWh)"
                            value={rates.activeEnergyNT}
                            onChange={v => handleChange('activeEnergyNT', v)}
                        />
                    </div>
                </section>

                {/* Group 2: Distribution */}
                <section className="space-y-4">
                    <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1 h-3 bg-indigo-500 rounded-full"></div>
                        2. Pristup Sistemu (Distribucija)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField
                            label="Odobrena Snaga (RSD/kW)"
                            value={rates.approvedPowerPrice}
                            onChange={v => handleChange('approvedPowerPrice', v)}
                        />
                        <InputField
                            label="Prenosna Mreža VT (RSD/kWh)"
                            value={rates.distributionVT}
                            onChange={v => handleChange('distributionVT', v)}
                        />
                        <InputField
                            label="Prenosna Mreža NT (RSD/kWh)"
                            value={rates.distributionNT}
                            onChange={v => handleChange('distributionNT', v)}
                        />
                        <InputField
                            label="Reaktivna Energija (RSD/kVArh)"
                            value={rates.reactiveEnergy}
                            onChange={v => handleChange('reactiveEnergy', v)}
                        />
                    </div>
                </section>

                {/* Group 3: Fees */}
                <section className="space-y-4">
                    <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1 h-3 bg-amber-500 rounded-full"></div>
                        3. Naknade i Takse
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField
                            label="OIE Naknada (RSD/kWh)"
                            value={rates.feeOIE}
                            onChange={v => handleChange('feeOIE', v)}
                        />
                        <InputField
                            label="En. Efikasnost (RSD/kWh)"
                            value={rates.feeEfficiency}
                            onChange={v => handleChange('feeEfficiency', v)}
                        />
                        <InputField
                            label="Taksa za RTS (RSD)"
                            value={rates.tvFee}
                            onChange={v => handleChange('tvFee', v)}
                        />
                    </div>
                </section>

                {/* Group 4: Taxes */}
                <section className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1 h-3 bg-slate-800 dark:bg-white rounded-full"></div>
                        4. Porezi i Akcize (%)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField
                            label="Akciza (%)"
                            value={rates.exciseTaxPercent}
                            onChange={v => handleChange('exciseTaxPercent', v)}
                        />
                        <InputField
                            label="PDV (%)"
                            value={rates.vatPercent}
                            onChange={v => handleChange('vatPercent', v)}
                        />
                    </div>
                </section>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-700 flex justify-between items-center">
                <button
                    onClick={() => setRates(DEFAULT_RATES)}
                    className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs font-bold uppercase transition-colors"
                >
                    <RefreshCw size={14} /> Resetuj na podrazumevano
                </button>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        Odustani
                    </button>
                    <button
                        onClick={() => onSave(rates)}
                        className="flex items-center gap-2 px-8 py-2 bg-amber-500 text-white rounded-xl text-sm font-black uppercase tracking-tight shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"
                    >
                        <Save size={18} /> Sačuvaj Cene
                    </button>
                </div>
            </div>
        </div>
    );
};

const InputField = ({ label, value, onChange }: { label: string, value: number, onChange: (v: string) => void }) => (
    <div className="space-y-1.5">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
        <input
            type="number"
            step="0.0001"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-slate-900 dark:text-white focus:border-amber-500 dark:focus:border-amber-500 outline-none transition-all"
        />
    </div>
);
