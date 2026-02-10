export const APP_NAME = "Azimut Monitoring";

// Chart Colors
export const COLORS = {
  PV: "#FBBF24",      // Amber-400
  LOAD: "#60A5FA",    // Blue-400
  SELF: "#4ADE80",    // Green-400
  EXPORT: "#FB923C",  // Orange-400
  IMPORT: "#F87171",  // Red-400
  GRID: "#334155",    // Slate-700 (Grid lines)
  TEXT: "#94a3b8",    // Slate-400
  Q_LOAD: "#A78BFA",  // Violet-400 (Reactive Consumption)
  Q_IMPORT: "#F472B6",// Pink-400 (Reactive Import)
};

// Update Interval in milliseconds (matches the Raspberry Pi send rate)
export const UPDATE_INTERVAL_MS = 3000;

// How many data points to keep in the real-time chart history (approx 10 mins)
// 10 mins * 60 sec / 5 sec = 120 points
export const CHART_HISTORY_LENGTH = 120;

// Server Configuration
export const DEFAULT_API_URL = "http://localhost:3001";
export const WS_URL = "ws://localhost:3001";