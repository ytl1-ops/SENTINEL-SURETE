-- ============================================================
-- Porte l'essai gratuit de 24h (1 jour) a 72h (3 jours).
-- Migration separee (plutot que modifier 20260629000000_initial_schema.sql)
-- pour rester applicable meme si le schema initial a deja ete pousse.
-- ============================================================
UPDATE plans SET duration_days = 3 WHERE slug = 'trial';
