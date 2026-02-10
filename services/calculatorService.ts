import { TariffRates, MonthlyInput, MonthlyCalculation, CalculationResult, InvestmentAnalysis, CashFlowYear } from '../types';

// Average Monthly Production Yield (kWh per 1 kWp installed) for Serbia
export const BASE_YIELD = [
    55, 75, 115, 145, 175, 195, 210, 190, 140, 95, 60, 45
];

export const calculateRow = (
    input: MonthlyInput,
    rates: TariffRates,
    approvedPower: number,
    prevSurplus: number,
    selfConsumptionPercent: number
): MonthlyCalculation => {
    const solarProduced = input.solarProduction;

    // Use monitored flows if available, otherwise estimate
    const preuzetaVT = input.importVT !== undefined ? input.importVT : Math.max(0, input.vt - (solarProduced * selfConsumptionPercent / 100));
    const preuzetaNT = input.importNT !== undefined ? input.importNT : input.nt;
    const solarExported = input.export !== undefined ? input.export : Math.max(0, solarProduced - (solarProduced * selfConsumptionPercent / 100));
    const solarDirectUsed = input.selfConsumption !== undefined ? input.selfConsumption : Math.min(solarProduced, input.vt);

    // KWh Bank Logic
    const totalExportAvailable = solarExported + prevSurplus;

    // Rule: We can only "offset" or "sell back" up to what we took from grid this month (VT only)
    const recognizedExportKwh = Math.min(totalExportAvailable, preuzetaVT);
    const surplusKwhRemaining = totalExportAvailable - recognizedExportKwh;

    // Final Net for Billing
    const netVT = Math.max(0, preuzetaVT - recognizedExportKwh);
    const netNT = preuzetaNT;

    // Energy Supply Cost
    const energyCostVT = preuzetaVT * rates.activeEnergyVT;
    const energyCostNT = preuzetaNT * rates.activeEnergyNT;
    const energyTotal = energyCostVT + energyCostNT;

    // The Solar Credit (Finance) - 90% of VT price for the recognized KWh
    const solarCreditGenerated = recognizedExportKwh * (rates.activeEnergyVT * 0.9);

    // --- NEW: Reactive Energy Calculation ---
    // limit for reactive energy is 0.32868 * active energy (for cos(phi)=0.95)
    const reactiveLimitVT = preuzetaVT * 0.32868;
    const reactiveLimitNT = preuzetaNT * 0.32868;

    const reactiveImportVT = input.reactiveImportVT || 0;
    const reactiveImportNT = input.reactiveImportNT || 0;

    const excessReactiveVT = Math.max(0, reactiveImportVT - reactiveLimitVT);
    const excessReactiveNT = Math.max(0, reactiveImportNT - reactiveLimitNT);

    const reactiveCost = (reactiveImportVT + reactiveImportNT) * rates.reactiveEnergyPrice;
    const excessReactiveCost = (excessReactiveVT + excessReactiveNT) * rates.excessReactiveEnergyPrice;

    // --- NEW: Maxigraf Calculation ---
    const maxPowerReading = input.maxPower || 0;
    const maxigrafSurplus = Math.max(0, maxPowerReading - approvedPower);
    const maxigrafCost = maxigrafSurplus * rates.maxigrafSurplusPrice;

    const powerCost = approvedPower * rates.approvedPowerPrice;
    const distCostVT = netVT * rates.distributionVT;
    const distCostNT = netNT * rates.distributionNT;
    const accessTotal = powerCost + distCostVT + distCostNT;

    const totalKwhForFees = netVT + netNT;
    const feeOIECost = totalKwhForFees * rates.feeOIE;
    const feeEffCost = totalKwhForFees * rates.feeEfficiency;
    const feesTotal = feeOIECost + feeEffCost + (rates.tvFee || 0);

    const subtotal = energyTotal + accessTotal + feesTotal + reactiveCost + excessReactiveCost + maxigrafCost;
    const exciseAmount = (energyTotal + accessTotal + feesTotal) * (rates.exciseTaxPercent / 100);
    const vatBase = subtotal + exciseAmount;
    const vatAmount = vatBase * (rates.vatPercent / 100);
    const totalBillBeforeCredit = vatBase + vatAmount;

    const totalBill = Math.max(0, totalBillBeforeCredit - solarCreditGenerated);

    return {
        monthId: input.id,
        monthName: input.monthName,
        maxPower: input.maxPower,
        grossVT: input.vt,
        grossNT: input.nt,
        solarProduced,
        solarDirectUsed,
        solarExported,
        surplusKwhCarriedOver: prevSurplus,
        totalExportAvailable,
        recognizedExportKwh,
        surplusKwhRemaining,
        solarCreditGenerated,
        netVT,
        energyCostVT,
        energyCostNT,
        energyTotal,
        powerCost,
        distCostVT,
        distCostNT,
        accessTotal,
        feeOIECost,
        feeEffCost,
        feesTotal,
        subtotal,
        exciseBase: subtotal,
        exciseAmount,
        vatBase,
        vatAmount,
        totalBillBeforeCredit,
        totalBill,
        reactiveConsumptionVT: reactiveImportVT,
        reactiveConsumptionNT: reactiveImportNT,
        excessReactiveVT,
        excessReactiveNT,
        reactiveCost,
        excessReactiveCost,
        maxigrafSurplus,
        maxigrafCost
    };
};

export const calculateAnnual = (
    inputs: MonthlyInput[],
    rates: TariffRates = DEFAULT_RATES,
    approvedPower: number,
    selfConsumptionPercent: number
): CalculationResult => {
    const details: MonthlyCalculation[] = [];
    let surplus = 0;

    inputs.forEach((input, index) => {
        // Reset surplus in April (Month Index 3) per Serbian "Prosumer" rules
        if (index === 3) surplus = 0;

        const row = calculateRow(input, rates, approvedPower, surplus, selfConsumptionPercent);
        details.push(row);
        surplus = row.surplusKwhRemaining;
    });

    const totalAnnualBill = details.reduce((sum, d) => sum + d.totalBill, 0);
    const totalConsumptionVT = details.reduce((sum, d) => sum + d.grossVT, 0);
    const totalConsumptionNT = details.reduce((sum, d) => sum + d.grossNT, 0);
    const totalSolarProduced = details.reduce((sum, d) => sum + d.solarProduced, 0);
    const totalSolarExported = details.reduce((sum, d) => sum + d.solarExported, 0);
    const totalSolarCreditGenerated = details.reduce((sum, d) => sum + d.solarCreditGenerated, 0);
    const totalCreditUsed = details.reduce((sum, d) => sum + d.solarCreditGenerated, 0); // Simplified

    return {
        monthlyBreakdown: details,
        totalAnnualBill,
        totalConsumptionVT,
        totalConsumptionNT,
        totalSolarProduced,
        totalSolarExported,
        totalSolarCreditGenerated,
        totalCreditUsed,
        averageMonthlyBill: totalAnnualBill / details.length
    };
};

export const calculateInvestmentAnalysis = (
    annualResult: CalculationResult,
    originalInputs: MonthlyInput[],
    rates: TariffRates,
    approvedPower: number,
    investmentCost: number,
    inflationRatePercent: number = 3,
    years: number = 20
): InvestmentAnalysis => {
    const baselineInputs = originalInputs.map(i => ({
        ...i,
        solarProduction: 0,
        importVT: i.vt,
        importNT: i.nt,
        export: 0,
        selfConsumption: 0
    }));
    const baselineResult = calculateAnnual(baselineInputs, rates, approvedPower, 0);
    const baselineAnnualBill = baselineResult.totalAnnualBill;

    const year1Savings = baselineAnnualBill - annualResult.totalAnnualBill;

    const cashFlows: CashFlowYear[] = [];
    let cumulative = -investmentCost;
    let paybackPeriod = 0;
    let paybackFound = false;
    let totalSavings = 0;

    cashFlows.push({
        year: 0,
        energySavings: 0,
        maintenanceCost: 0,
        netCashFlow: -investmentCost,
        cumulativeCashFlow: cumulative
    });

    const inflationRate = 1 + (inflationRatePercent / 100);

    for (let y = 1; y <= years; y++) {
        const currentYearSavings = year1Savings * Math.pow(inflationRate, y - 1);
        const maintenance = y > 2 ? investmentCost * 0.005 : 0;
        const netFlow = currentYearSavings - maintenance;
        cumulative += netFlow;
        totalSavings += netFlow;

        if (!paybackFound && cumulative >= 0) {
            const prevCumulative = cashFlows[y - 1].cumulativeCashFlow;
            const fraction = Math.abs(prevCumulative) / netFlow;
            paybackPeriod = (y - 1) + fraction;
            paybackFound = true;
        }

        cashFlows.push({
            year: y,
            energySavings: currentYearSavings,
            maintenanceCost: maintenance,
            netCashFlow: netFlow,
            cumulativeCashFlow: cumulative
        });
    }

    const totalReturned = cashFlows.reduce((sum, cf) => (cf.year > 0 ? sum + cf.netCashFlow : sum), 0);
    const roi = ((totalReturned - investmentCost) / investmentCost) * 100;
    const irr = calculateIRR(cashFlows.map(cf => cf.netCashFlow));

    return {
        years,
        totalInvestment: investmentCost,
        paybackPeriod: paybackFound ? paybackPeriod : 0,
        roi,
        irr: irr * 100,
        totalSavings: totalReturned,
        cashFlows
    };
};

function calculateIRR(values: number[], guess: number = 0.1): number {
    const maxIterations = 1000;
    const precision = 1e-7;
    for (let i = 0; i < maxIterations; i++) {
        let npv = 0;
        let dNpv = 0;
        for (let j = 0; j < values.length; j++) {
            npv += values[j] / Math.pow(1 + guess, j);
            dNpv -= (j * values[j]) / Math.pow(1 + guess, j + 1);
        }
        const newGuess = guess - npv / dNpv;
        if (Math.abs(newGuess - guess) < precision) return newGuess;
        guess = newGuess;
    }
    return guess;
}

export const DEFAULT_RATES: TariffRates = {
    activeEnergyVT: 12.56,
    activeEnergyNT: 4.84,
    approvedPowerPrice: 65.43,
    distributionVT: 3.42,
    distributionNT: 1.12,
    feeOIE: 0.801,
    feeEfficiency: 0.015,
    exciseTaxPercent: 7.5,
    vatPercent: 20,
    reactiveEnergy: 0.528,
    reactiveEnergyPrice: 1.13,
    excessReactiveEnergyPrice: 2.261,
    maxigrafSurplusPrice: 694.504,
    tvFee: 0,
    investmentCost: 4000000
};

export const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('sr-RS', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(val) + ' RSD';
};

export const MONTH_NAMES = [
    "Januar", "Februar", "Mart", "April", "Maj", "Jun",
    "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar"
];

