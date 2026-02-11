
/**
 * Represents a single data point from the smart meter/inverter.
 * Corresponds to the CSV row structure.
 */
export interface SolarReading {
  id: string;
  timestamp: string; // ISO 8601
  P_pv: number;      // Solar generation (kW)
  P_load: number;    // House consumption (kW)
  P_self: number;    // Self-consumption (kW)
  P_export: number;  // Export to grid (kW)
  P_import: number;  // Import from grid (kW)
  Q_load: number;    // Reactive consumption (kVAr)
  Q_import: number;  // Reactive import from grid (kVAr)
}

/**
 * Represents aggregated daily energy stats.
 */
export interface DailyEnergyStats {
  date: string;
  totalGeneration: number; // kWh
  totalConsumption: number; // kWh
  totalSelfConsumption: number; // kWh
  totalExport: number; // kWh
  totalImport: number; // kWh
}

/**
 * Represents a single point in a time-series energy chart (e.g., 1 hour, 1 day, or 1 month)
 */
export interface EnergySeriesPoint {
  label: string;      // Time label (e.g., "10:00", "Mon", "Jan")
  timestamp: string;  // ISO string for sorting/reference
  generation: number;
  consumption: number;
  consumptionVT: number; // New: Higher tariff
  consumptionNT: number; // New: Lower tariff
  selfConsumption: number;
  export: number;
  import: number;
  importVT: number; // New: Grid import during High Tariff
  importNT: number; // New: Grid import during Low Tariff
  maxPower?: number; // New: Peak power recorded in period
  year?: number;      // New: Year for historical data
}

export enum ViewMode {
  REALTIME = 'REALTIME',
  HISTORY = 'HISTORY',
  SAVINGS = 'SAVINGS',
  SETTINGS = 'SETTINGS',
}

// Simulation configuration types
export interface SystemConfig {
  simulationSpeed: number; // ms between ticks (default 5000)
  maxPvPower: number; // kW
  baseLoad: number; // kW
}

// --- NEW TYPES FOR MULTI-ACCOUNT ---

export type UserRole = 'admin' | 'client';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  assignedProjectIds?: string[]; // If client, which projects can they see
}

export type ProjectStatus = 'ONLINE' | 'OFFLINE' | 'WARNING' | 'DEMO';

export interface Project {
  id: string;
  name: string;
  location: string;
  latitude: number;  // New
  longitude: number; // New
  installedPowerKw: number;
  status: ProjectStatus;
  isDemo: boolean; // New

  // Real-time snapshot for the admin dashboard card
  currentPowerKw: number;
  todayEnergyKwh: number;
  todaySelfConsumptionKwh: number;
  todayExportKwh: number;
  todayImportKwh: number;
}

export interface ProjectFormData {
  name: string;
  clientEmail?: string; // New field for assigning project
  location: string;
  latitude: number;  // New
  longitude: number; // New
  installedPowerKw: number;
  status: ProjectStatus;
  isDemo?: boolean; // New
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

// --- CALCULATOR TYPES ---

export enum TariffType {
  COMMERCIAL = 'Komercijalni',
  INDUSTRIAL = 'Industrijski'
}

export interface TariffRates {
  activeEnergyVT: number;
  activeEnergyNT: number;
  approvedPowerPrice: number;
  distributionVT: number;
  distributionNT: number;
  feeOIE: number;
  feeEfficiency: number;
  exciseTaxPercent: number;
  vatPercent: number;
  reactiveEnergy: number;
  reactiveEnergyPrice: number; // New: 1.13 rsd/kVArh
  excessReactiveEnergyPrice: number; // New: 2.261 rsd/kVArh
  maxigrafSurplusPrice: number; // New: 694.504 rsd/kW
  tvFee: number;
  investmentCost: number; // New: To control ROI/IRR
}

export interface MonthlyInput {
  id: number;
  monthName: string;
  year: number;        // New: Support historical years
  vt: number;
  nt: number;
  maxPower: number;
  solarProduction: number;
  // New Physical Flow Data
  importVT: number;
  importNT: number;
  reactiveImportVT: number;  // New
  reactiveImportNT: number;  // New
  export: number;
  reactiveExportVT: number;  // New
  reactiveExportNT: number;  // New
  selfConsumption: number;
}

export interface MonthlyCalculation {
  monthId: number;
  monthName: string;
  year: number;        // New: Track actual year for the bill
  maxPower: number;
  grossVT: number;
  grossNT: number;
  solarProduced: number;
  solarDirectUsed: number;
  solarExported: number;
  surplusKwhCarriedOver: number;
  totalExportAvailable: number;
  recognizedExportKwh: number;
  surplusKwhRemaining: number;
  solarCreditGenerated: number;
  solarCreditVT: number;  // New
  solarCreditNT: number;  // New
  netVT: number;
  energyCostVT: number;
  energyCostNT: number;
  energyTotal: number;
  powerCost: number;
  distCostVT: number;
  distCostNT: number;
  accessTotal: number;
  feeOIECost: number;
  feeEffCost: number;
  feesTotal: number;
  subtotal: number;
  exciseBase: number;
  exciseAmount: number;
  vatBase: number;
  vatAmount: number;
  totalBillBeforeCredit: number;
  totalBill: number;
  // Reactive & Maxigraf detailed breakdown
  reactiveConsumptionVT: number;
  reactiveConsumptionNT: number;
  excessReactiveVT: number;
  excessReactiveNT: number;
  reactiveCost: number;
  excessReactiveCost: number;
  maxigrafSurplus: number;
  maxigrafCost: number;
  excessActivePower: number;   // New: Alias/Specific field for "Prekomerna aktivna snaga"
  excessReactivePower: number; // New: Value for "Prekomerna reaktivna snaga"
  solarExportVT: number;       // New: Quantity for "Isporučena energija VT"
  solarExportNT: number;       // New: Quantity for "Isporučena energija NT"
}

export interface CalculationResult {
  monthlyBreakdown: MonthlyCalculation[];
  totalAnnualBill: number;
  totalConsumptionVT: number;
  totalConsumptionNT: number;
  totalSolarProduced: number;
  totalSolarExported: number;
  totalSolarCreditGenerated: number;
  totalCreditUsed: number;
  averageMonthlyBill: number;
}

export interface CashFlowYear {
  year: number;
  energySavings: number;
  maintenanceCost: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
}

export interface InvestmentAnalysis {
  years: number;
  totalInvestment: number;
  paybackPeriod: number;
  roi: number;
  irr: number;
  totalSavings: number;
  cashFlows: CashFlowYear[];
}


