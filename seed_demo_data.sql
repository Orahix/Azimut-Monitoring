-- ============================================
-- DEMO DATA SEED SCRIPT FOR 50 kW PV SYSTEM
-- Typical Meteorological Year (TMY) Profile for Serbia
-- Project UUID: 85165a95-5765-4d08-9b77-2396bf09f35a
-- Date Range: Feb 2025 - Aug 2026 (18 months)
-- Target: ~55,000 kWh/year production
-- ============================================

-- Clear existing data for this project
DELETE FROM hourly_stats WHERE project_id = '85165a95-5765-4d08-9b77-2396bf09f35a';
DELETE FROM power_readings WHERE project_id = '85165a95-5765-4d08-9b77-2396bf09f35a';

-- ================================================
-- PART 1: HOURLY STATS with TMY Solar Profile
-- ================================================
DO $$
DECLARE
  project_uuid UUID := '85165a95-5765-4d08-9b77-2396bf09f35a';
  capacity_kw NUMERIC := 50;
  start_date TIMESTAMP := '2025-02-09 00:00:00';
  end_date TIMESTAMP := '2026-08-09 23:00:00';
  current_ts TIMESTAMP;
  hour_of_day INT;
  month_of_year INT;
  day_of_year INT;
  
  -- TMY monthly kWh/kWp values for Serbia (50 kWp system)
  -- Total: ~1100 kWh/kWp/year = 55,000 kWh for 50 kW system
  monthly_kwh_per_kwp NUMERIC[] := ARRAY[45, 60, 100, 130, 160, 175, 180, 160, 120, 80, 50, 40];
  
  -- Sunrise/Sunset hours per month (approximate for Serbia ~44°N)
  sunrise_hour NUMERIC[] := ARRAY[7.5, 7.0, 6.25, 5.5, 5.0, 4.75, 5.0, 5.5, 6.25, 7.0, 7.5, 7.75];
  sunset_hour NUMERIC[] := ARRAY[16.5, 17.25, 18.0, 19.0, 19.75, 20.25, 20.0, 19.25, 18.25, 17.25, 16.5, 16.25];
  
  sr NUMERIC;  -- sunrise
  ss NUMERIC;  -- sunset
  daylight_hours NUMERIC;
  hour_decimal NUMERIC;
  daily_target_kwh NUMERIC;
  hourly_peak_kw NUMERIC;
  solar_angle NUMERIC;
  cloud_factor NUMERIC;
  gen NUMERIC;
  cons NUMERIC;
  total_hours INT;
  i INT;
BEGIN
  total_hours := EXTRACT(EPOCH FROM (end_date - start_date)) / 3600;
  
  FOR i IN 0..total_hours LOOP
    current_ts := start_date + (i || ' hours')::INTERVAL;
    hour_of_day := EXTRACT(HOUR FROM current_ts);
    month_of_year := EXTRACT(MONTH FROM current_ts);
    day_of_year := EXTRACT(DOY FROM current_ts);
    
    -- Get sunrise/sunset for this month
    sr := sunrise_hour[month_of_year];
    ss := sunset_hour[month_of_year];
    daylight_hours := ss - sr;
    hour_decimal := hour_of_day + 0.5; -- middle of hour
    
    -- Calculate daily target kWh based on monthly yield
    -- monthly_kwh_per_kwp / days_in_month * capacity
    daily_target_kwh := (monthly_kwh_per_kwp[month_of_year] / 30.0) * capacity_kw;
    
    -- Peak power needed to achieve daily target with Gaussian curve
    -- Integral of Gaussian over daylight ≈ peak * daylight * 0.4
    hourly_peak_kw := daily_target_kwh / (daylight_hours * 0.4);
    
    -- Deterministic cloud factor: ±15% variation per day
    cloud_factor := 0.85 + 0.30 * (0.5 + 0.5 * SIN(day_of_year * 0.5));
    
    -- Solar generation using Gaussian bell curve
    IF hour_decimal >= sr AND hour_decimal <= ss THEN
      -- Normalized position in day (0 at sunrise, 1 at sunset)
      -- Peak at solar noon (midpoint between sr and ss)
      solar_angle := (hour_decimal - (sr + ss) / 2) / (daylight_hours / 2);
      -- Gaussian profile: e^(-x^2 * 3) gives nice bell curve
      gen := hourly_peak_kw * EXP(-POWER(solar_angle, 2) * 3) * cloud_factor;
      -- Ensure non-negative
      gen := GREATEST(0, gen);
    ELSE
      gen := 0;
    END IF;
    
    -- Industrial consumption profile (~113,000 kWh/year = ~12.9 kWh avg/hour)
    IF hour_of_day >= 8 AND hour_of_day <= 17 THEN
      -- Work hours: ~22 kW average
      cons := 22 + 3 * SIN(day_of_year * 0.3 + hour_of_day * 0.5);
    ELSIF hour_of_day >= 17 AND hour_of_day <= 22 THEN
      -- Evening: ~10 kW
      cons := 10 + 2 * SIN(day_of_year * 0.2 + hour_of_day * 0.3);
    ELSE
      -- Night: ~5 kW standby
      cons := 5 + 1 * SIN(day_of_year * 0.1);
    END IF;
    
    INSERT INTO hourly_stats (project_id, start_time, avg_active_power, max_active_power, total_energy_produced, total_energy_consumed)
    VALUES (project_uuid, current_ts, gen, gen * 1.1, gen, cons);
  END LOOP;
  
  RAISE NOTICE 'Inserted % hours of hourly_stats data with TMY profile', total_hours;
END $$;

-- ================================================
-- PART 2: POWER READINGS (Last 24 hours, 1-min intervals)
-- ================================================
DO $$
DECLARE
  project_uuid UUID := '85165a95-5765-4d08-9b77-2396bf09f35a';
  current_ts TIMESTAMP;
  hour_of_day INT;
  minute_of_hour INT;
  month_of_year INT;
  day_of_year INT;
  monthly_kwh_per_kwp NUMERIC[] := ARRAY[45, 60, 100, 130, 160, 175, 180, 160, 120, 80, 50, 40];
  sunrise_hour NUMERIC[] := ARRAY[7.5, 7.0, 6.25, 5.5, 5.0, 4.75, 5.0, 5.5, 6.25, 7.0, 7.5, 7.75];
  sunset_hour NUMERIC[] := ARRAY[16.5, 17.25, 18.0, 19.0, 19.75, 20.25, 20.0, 19.25, 18.25, 17.25, 16.5, 16.25];
  capacity_kw NUMERIC := 50;
  sr NUMERIC;
  ss NUMERIC;
  daylight_hours NUMERIC;
  hour_decimal NUMERIC;
  daily_target_kwh NUMERIC;
  hourly_peak_kw NUMERIC;
  solar_angle NUMERIC;
  cloud_factor NUMERIC;
  gen NUMERIC;
  cons NUMERIC;
  cumulative_export NUMERIC := 0;
  cumulative_import NUMERIC := 0;
BEGIN
  FOR i IN 0..1439 LOOP
    current_ts := NOW() - INTERVAL '24 hours' + (i || ' minutes')::INTERVAL;
    hour_of_day := EXTRACT(HOUR FROM current_ts);
    minute_of_hour := EXTRACT(MINUTE FROM current_ts);
    month_of_year := EXTRACT(MONTH FROM current_ts);
    day_of_year := EXTRACT(DOY FROM current_ts);
    
    sr := sunrise_hour[month_of_year];
    ss := sunset_hour[month_of_year];
    daylight_hours := ss - sr;
    hour_decimal := hour_of_day + minute_of_hour / 60.0;
    
    daily_target_kwh := (monthly_kwh_per_kwp[month_of_year] / 30.0) * capacity_kw;
    hourly_peak_kw := daily_target_kwh / (daylight_hours * 0.4);
    cloud_factor := 0.85 + 0.30 * (0.5 + 0.5 * SIN(day_of_year * 0.5));
    
    IF hour_decimal >= sr AND hour_decimal <= ss THEN
      solar_angle := (hour_decimal - (sr + ss) / 2) / (daylight_hours / 2);
      gen := hourly_peak_kw * EXP(-POWER(solar_angle, 2) * 3) * cloud_factor;
      gen := GREATEST(0, gen);
    ELSE
      gen := 0;
    END IF;
    
    IF hour_of_day >= 8 AND hour_of_day <= 17 THEN
      cons := 22 + 3 * SIN(i * 0.1);
    ELSIF hour_of_day >= 17 AND hour_of_day <= 22 THEN
      cons := 10 + 2 * SIN(i * 0.05);
    ELSE
      cons := 5 + 1 * SIN(i * 0.02);
    END IF;
    
    IF gen > cons THEN
      cumulative_export := cumulative_export + (gen - cons) / 60.0;
    ELSE
      cumulative_import := cumulative_import + (cons - gen) / 60.0;
    END IF;
    
    INSERT INTO power_readings (
      project_id, recorded_at, 
      active_power_total, 
      total_energy_export, total_energy_import
    )
    VALUES (
      project_uuid, current_ts,
      gen * 1000,
      cumulative_export,
      cumulative_import
    );
  END LOOP;
  
  RAISE NOTICE 'Inserted 1440 power_readings for last 24 hours';
END $$;

-- ================================================
-- VERIFICATION
-- ================================================
SELECT 'hourly_stats' as table_name,
  COUNT(*) as total_rows,
  MIN(start_time) as first_record,
  MAX(start_time) as last_record,
  ROUND(SUM(total_energy_produced)::numeric, 0) as total_production_kwh,
  ROUND(SUM(total_energy_consumed)::numeric, 0) as total_consumption_kwh
FROM hourly_stats 
WHERE project_id = '85165a95-5765-4d08-9b77-2396bf09f35a'

UNION ALL

SELECT 'power_readings' as table_name,
  COUNT(*) as total_rows,
  MIN(recorded_at) as first_record,
  MAX(recorded_at) as last_record,
  ROUND(MAX(total_energy_export)::numeric, 1) as cumulative_export,
  ROUND(MAX(total_energy_import)::numeric, 1) as cumulative_import
FROM power_readings 
WHERE project_id = '85165a95-5765-4d08-9b77-2396bf09f35a';

-- Monthly breakdown verification
SELECT 
  TO_CHAR(start_time, 'YYYY-MM') as month,
  ROUND(SUM(total_energy_produced)::numeric, 0) as production_kwh,
  ROUND(SUM(total_energy_consumed)::numeric, 0) as consumption_kwh
FROM hourly_stats 
WHERE project_id = '85165a95-5765-4d08-9b77-2396bf09f35a'
GROUP BY TO_CHAR(start_time, 'YYYY-MM')
ORDER BY month;
