-- Execute UMA VEZ, depois de instalar chatwoot_relatorios_core.sql
CREATE SCHEMA IF NOT EXISTS core;
CREATE TABLE IF NOT EXISTS core.chatwoot_ingested_events (
  event_key text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('created','resolved')),
  payload_event text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
