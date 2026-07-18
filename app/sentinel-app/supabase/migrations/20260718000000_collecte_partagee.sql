-- ============================================================
-- SENTINEL — Cache partagé de la collecte RSS (web)
--
-- Objectif : réduire la charge sur le petit pool de services CORS
-- partagés (allorigins, codetabs, rss2json...) à l'échelle de millions
-- de connexions. Le garde-fou "collecte récente" (sentinel_lastCollectTs,
-- localStorage) empêche déjà UN navigateur de relancer sa propre
-- collecte trop souvent — mais il ne peut rien pour un visiteur
-- DIFFÉRENT (nouvel appareil, cache navigateur vidé) : sans cache
-- partagé, ce nouvel appareil relance quand même sa propre collecte
-- complète (~500 sources) dès sa première visite.
--
-- Avec cette table : le premier navigateur à collecter dans une fenêtre
-- de fraîcheur publie son résultat ici (best-effort, jamais bloquant).
-- Tout visiteur suivant — n'importe quel appareil — lit ce résultat au
-- lieu de relancer sa propre collecte, tant qu'il reste frais. Une seule
-- ligne vivante (id fixe 'global') : simple UPSERT à chaque écriture,
-- pas de croissance illimitée de la table.
--
-- Les articles proviennent de flux RSS déjà publics — aucune donnée
-- personnelle ou sensible n'y transite.
--
-- Appliquer via `npx supabase db push` (app/sentinel-app/) ou copier-coller
-- dans l'éditeur SQL du projet Supabase, à la suite de 20260712010000.
-- ============================================================

CREATE TABLE collecte_partagee (
  id          TEXT PRIMARY KEY,
  articles    JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE collecte_partagee ENABLE ROW LEVEL SECURITY;

-- Lecture et écriture ouvertes à anon : mêmes compromis d'exposition que
-- connexions_log (voir 20260712010000) — l'app n'a pas de session
-- Supabase réelle (authentification locale, voir doLogin()), et le
-- contenu ici est déjà public (actualités RSS), pas de PII.
CREATE POLICY "collecte_partagee_select" ON collecte_partagee
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "collecte_partagee_insert" ON collecte_partagee
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "collecte_partagee_update" ON collecte_partagee
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
