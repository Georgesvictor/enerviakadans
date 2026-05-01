-- 0002: Per-ingreep besparingsdata
--   Voegt kolommen toe aan besparing_simulaties voor gedetailleerde breakdown
--   per renovatie-ingreep (dak, gevel, ramen, WP, PV, batterij, enz.).

ALTER TABLE besparing_simulaties
  ADD COLUMN IF NOT EXISTS ingrepen_jsonb        JSONB,
  ADD COLUMN IF NOT EXISTS maandelijks_gas_euro  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS maandelijks_elek_euro NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS maandelijks_totaal_euro NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS co2_reductie_kg_jaar  NUMERIC(10,0),
  ADD COLUMN IF NOT EXISTS epc_kwh_m2_voor       NUMERIC(5,0),
  ADD COLUMN IF NOT EXISTS epc_kwh_m2_na         NUMERIC(5,0),
  ADD COLUMN IF NOT EXISTS epc_label_verwacht    TEXT;

COMMENT ON COLUMN besparing_simulaties.ingrepen_jsonb IS
  'Array van IngreepBesparing objecten met per-ingreep: omschrijving, investering, premie, besparing, EPC-impact, ROI';
