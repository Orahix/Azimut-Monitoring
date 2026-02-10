import React, { useState, useMemo, useRef } from 'react';
import { MonthlyCalculation, TariffRates } from '../types';
import { formatCurrency, DEFAULT_RATES, calculateRow } from '../services/calculatorService';
import { Sun, CloudOff, FileText, Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface MonthlyBillViewProps {
    data: MonthlyCalculation;
    approvedPower: number;
    onClose?: () => void;
    rates?: TariffRates;
}

export const MonthlyBillView: React.FC<MonthlyBillViewProps> = ({ data, approvedPower, onClose, rates = DEFAULT_RATES }) => {
    const [isSolarEnabled, setIsSolarEnabled] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const billRef = useRef<HTMLDivElement>(null);

    const handleDownloadPdf = async () => {
        if (!billRef.current) return;
        setIsGenerating(true);

        try {
            const element = billRef.current;
            // Temporarily remove max-height and overflow to capture full content
            const originalStyle = element.style.cssText;
            const contentDiv = element.querySelector('.bill-content') as HTMLElement;
            const originalContentStyle = contentDiv?.style.cssText;

            if (contentDiv) {
                contentDiv.style.maxHeight = 'none';
                contentDiv.style.overflow = 'visible';
            }

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            if (contentDiv) {
                contentDiv.style.cssText = originalContentStyle;
            }

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Racun_Azimut_${data.monthName}_2025.pdf`);
        } catch (error) {
            console.error('PDF Generation error:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    // Calculate BOTH states upfront for the comparison cards
    const saSolarom = data;

    // Create virtual input for "Bez Solara" matching this month
    const bezSolara = useMemo(() => {
        return calculateRow({
            id: data.monthId,
            monthName: data.monthName,
            vt: data.grossVT,
            nt: data.grossNT,
            maxPower: data.maxPower,
            solarProduction: 0,
            importVT: data.grossVT,
            importNT: data.grossNT,
            reactiveImportVT: data.reactiveConsumptionVT || 0,
            reactiveImportNT: data.reactiveConsumptionNT || 0,
            export: 0,
            reactiveExportVT: 0,
            reactiveExportNT: 0,
            selfConsumption: 0
        }, rates, approvedPower, 0, 0);
    }, [data, rates, approvedPower]);

    const activeData = isSolarEnabled ? saSolarom : bezSolara;

    return (
        <div ref={billRef} className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-w-4xl w-full mx-auto animate-in fade-in zoom-in duration-300">

            {/* Header & Main Comparison */}
            <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-amber-500 rounded-2xl text-white shadow-xl shadow-amber-500/20">
                            <FileText size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Detaljni Obračun</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">{data.monthName} 2026</p>
                        </div>
                    </div>

                    <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm self-center md:self-auto">
                        <button
                            onClick={() => setIsSolarEnabled(false)}
                            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-black uppercase transition-all ${!isSolarEnabled ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <CloudOff size={14} /> Bez Solara
                        </button>
                        <button
                            onClick={() => setIsSolarEnabled(true)}
                            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-black uppercase transition-all ${isSolarEnabled ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Sun size={14} /> Sa Solarom
                        </button>
                    </div>
                </div>

                {/* The Comparison Cards - ALWAYS STATIC */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Račun BEZ Solara</p>
                        <p className="text-3xl font-mono font-black text-slate-400 line-through opacity-50">{formatCurrency(bezSolara.totalBill)}</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-amber-500 text-white flex flex-col items-center justify-center text-center shadow-xl shadow-amber-500/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-1.5 bg-white/20 font-black text-[8px] uppercase px-3 rounded-bl-xl backdrop-blur-sm">UKUPNO ZA UPLATU</div>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">PROJEKTOVANI RAČUN</p>
                        <p className="text-3xl font-mono font-black">{formatCurrency(saSolarom.totalBill)}</p>
                    </div>
                </div>
            </div>

            <div className="bill-content p-8 space-y-8 overflow-y-auto max-h-[60vh] custom-scrollbar">
                {/* Section: Energija za obračun (New) */}
                <section className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                        <div className="w-1 h-3 bg-blue-500 rounded-full"></div>
                        Energija za obračun
                    </h4>
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Preuzeta Energija</p>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Aktivna VT:</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{Math.round(activeData.grossVT).toLocaleString()} kWh</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Aktivna NT:</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{Math.round(activeData.grossNT).toLocaleString()} kWh</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Reaktivna VT:</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{Math.round(activeData.reactiveConsumptionVT || 0).toLocaleString()} kVArh</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Reaktivna NT:</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{Math.round(activeData.reactiveConsumptionNT || 0).toLocaleString()} kVArh</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Isporučena Energija / Ostalo</p>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Aktivna Isporučena:</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-500">{Math.round(activeData.solarExported).toLocaleString()} kWh</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Stanje Maksigrafa:</span>
                                    <span className="font-bold text-amber-600 dark:text-amber-500">{activeData.maxPower.toFixed(2)} kW</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 2: Detailed Math Breakdown */}
                <section className="space-y-6">
                    <BillSection title="1. Potrošnja, Mreža i Isporučena Energija (RSD)">
                        <BillRow label="Aktivna energija (VT)" qty={activeData.netVT} price={rates.activeEnergyVT} total={activeData.energyCostVT} />
                        <BillRow label="Aktivna energija (NT)" qty={activeData.grossNT} price={rates.activeEnergyNT} total={activeData.energyCostNT} />
                        {isSolarEnabled && activeData.recognizedExportKwh > 0 && (
                            <BillRow
                                label="Isporučena energija (VT)"
                                qty={activeData.recognizedExportKwh}
                                price={rates.activeEnergyVT * 0.9}
                                total={-activeData.solarCreditVT}
                                isNegative
                            />
                        )}
                        <BillRow label="Odobrena snaga" qty={approvedPower} price={rates.approvedPowerPrice} total={activeData.powerCost} />
                        <BillRow label="Viša dnevna tarifa za aktivnu energiju" qty={activeData.netVT} price={rates.distributionVT} total={activeData.distCostVT} />
                        <BillRow label="Niža dnevna tarifa za aktivnu energiju" qty={activeData.grossNT} price={rates.distributionNT} total={activeData.distCostNT} />
                    </BillSection>

                    <BillSection title="2. Reaktivna Energija i Maksigraf">
                        <BillRow label="Reaktivna energija" qty={(activeData.reactiveConsumptionVT || 0) + (activeData.reactiveConsumptionNT || 0)} price={rates.reactiveEnergyPrice} total={activeData.reactiveCost} />
                        {(activeData.excessReactiveCost || 0) > 0 && (
                            <BillRow label="Prekomerna reaktivna energija" qty={(activeData.excessReactiveVT || 0) + (activeData.excessReactiveNT || 0)} price={rates.excessReactiveEnergyPrice} total={activeData.excessReactiveCost} />
                        )}
                        {(activeData.maxigrafCost || 0) > 0 && (
                            <BillRow label="Prekomerna snaga (Maksigraf)" qty={activeData.maxigrafSurplus} price={rates.maxigrafSurplusPrice} total={activeData.maxigrafCost} />
                        )}
                    </BillSection>

                    <BillSection title="3. Naknade i Takse">
                        <BillRow label="Naknada za OIE" qty={activeData.netVT + activeData.grossNT} price={rates.feeOIE} total={activeData.feeOIECost} />
                        <BillRow label="Unapređenje En. Efikasnosti" qty={activeData.netVT + activeData.grossNT} price={rates.feeEfficiency} total={activeData.feeEffCost} />
                        {rates.tvFee > 0 && <BillRow label="Taksa za RTS" qty={1} price={rates.tvFee} total={rates.tvFee} />}
                    </BillSection>

                    <BillSection title="4. Državne Obaveze">
                        <BillRow label="Osnovica za Akcizu" total={activeData.energyTotal + activeData.accessTotal + activeData.feesTotal} isTotalSmall />
                        <BillRow label="Iznos Akcize (7.5%)" total={activeData.exciseAmount} />
                        <BillRow label="Osnovica za PDV" total={activeData.vatBase} isTotalSmall />
                        <BillRow label="Porez na dodatu vrednost (20%)" total={activeData.vatAmount} />
                    </BillSection>

                    {isSolarEnabled && activeData.solarCreditGenerated > 0 && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30 p-6 rounded-2xl flex justify-between items-center text-emerald-700 dark:text-emerald-400">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest">Umanjenje za Isporučenu Energiju</p>
                                <p className="font-bold">Finansijski Solar Kredit</p>
                            </div>
                            <p className="text-2xl font-mono font-black">-{formatCurrency(activeData.solarCreditGenerated)}</p>
                        </div>
                    )}

                    <div className="p-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl flex justify-between items-center shadow-2xl">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Ukupo za uplatu</p>
                            <p className="text-xs font-bold">{activeData.monthName} / 2026</p>
                        </div>
                        <div className="text-right">
                            <p className="text-4xl font-black tracking-tighter">{formatCurrency(activeData.totalBill)}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Valuta: RSD</p>
                        </div>
                    </div>
                </section>
            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                {onClose && (
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        Zatvori
                    </button>
                )}
                <button
                    onClick={handleDownloadPdf}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-black uppercase tracking-tight hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                    {isGenerating ? 'Generisanje...' : 'Preuzmi PDF'}
                </button>
            </div>
        </div>
    );
};

const BillSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="space-y-3">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
            <div className="w-1 h-3 bg-amber-500 rounded-full"></div>
            {title}
        </h4>
        <div className="space-y-1">
            {children}
        </div>
    </div>
);

const BillRow = ({ label, qty, price, total, isTotalSmall, isNegative }: { label: string, qty?: number, price?: number, total: number, isTotalSmall?: boolean, isNegative?: boolean }) => (
    <div className="flex justify-between items-center py-1 group">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-amber-500 transition-colors">{label}</span>
        <div className="flex items-center gap-4">
            {qty !== undefined && price !== undefined && (
                <span className="text-[10px] text-slate-400 font-mono italic">{Math.round(qty).toLocaleString()} x {price.toFixed(2)}</span>
            )}
            <span className={`${isTotalSmall ? 'text-xs text-slate-500 font-bold' : 'text-sm font-black ' + (isNegative ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-200')} font-mono`}>
                {isNegative ? '-' : ''}{formatCurrency(Math.abs(total))}
            </span>
        </div>
    </div>
);
