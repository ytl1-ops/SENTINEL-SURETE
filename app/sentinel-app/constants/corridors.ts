// CORRIDOR DE RÉFÉRENCE — corridors logistiques/transfrontaliers surveillés,
// regroupés par zone géographique (mêmes zones que ZONES_GEO côté web).
// Chaque corridor liste ses villes-étapes ; le pays de chaque étape sert à
// rattacher les faits du flux (Article.country) à cette étape.

export type ZoneKey =
  | 'sahel' | 'golfe_guinee' | 'ao_cotiere' | 'afrique_centrale'
  | 'corne_afrique' | 'grands_lacs' | 'afrique_australe' | 'afrique_nord';

export const ZONES_GEO: Record<ZoneKey, { nom: string }> = {
  sahel:            { nom: 'Sahel' },
  golfe_guinee:     { nom: 'Golfe de Guinée' },
  ao_cotiere:       { nom: "Afrique de l'Ouest côtière" },
  afrique_centrale: { nom: 'Afrique centrale' },
  corne_afrique:    { nom: "Corne de l'Afrique" },
  grands_lacs:      { nom: 'Grands Lacs' },
  afrique_australe: { nom: 'Afrique australe' },
  afrique_nord:     { nom: 'Afrique du Nord' },
};

export type CorridorVille = { nom: string; pays: string };
export type Corridor = { id: string; nom: string; zone: ZoneKey; villes: CorridorVille[] };

export const CORRIDORS_PAR_ZONE: Record<ZoneKey, Corridor[]> = {
  sahel: [
    { id: 'abj-ouaga', nom: 'Abidjan – Ouagadougou', zone: 'sahel', villes: [
      { nom: 'Abidjan', pays: 'CI' }, { nom: 'Ouangolodougou', pays: 'CI' }, { nom: 'Ouagadougou', pays: 'BF' },
    ] },
    { id: 'dkr-bko', nom: 'Dakar – Bamako', zone: 'sahel', villes: [
      { nom: 'Dakar', pays: 'SN' }, { nom: 'Tambacounda', pays: 'SN' }, { nom: 'Kayes', pays: 'ML' }, { nom: 'Bamako', pays: 'ML' },
    ] },
    { id: 'lom-ouaga-niam', nom: 'Lomé – Ouagadougou – Niamey', zone: 'sahel', villes: [
      { nom: 'Lomé', pays: 'TG' }, { nom: 'Ouagadougou', pays: 'BF' }, { nom: 'Niamey', pays: 'NE' },
    ] },
  ],
  golfe_guinee: [
    { id: 'tema-ouaga', nom: 'Tema – Ouagadougou', zone: 'golfe_guinee', villes: [
      { nom: 'Tema', pays: 'GH' }, { nom: 'Kumasi', pays: 'GH' }, { nom: 'Bobo-Dioulasso', pays: 'BF' }, { nom: 'Ouagadougou', pays: 'BF' },
    ] },
    { id: 'cot-niam', nom: 'Cotonou – Niamey', zone: 'golfe_guinee', villes: [
      { nom: 'Cotonou', pays: 'BJ' }, { nom: 'Parakou', pays: 'BJ' }, { nom: 'Niamey', pays: 'NE' },
    ] },
    { id: 'lag-abj', nom: 'Lagos – Abidjan (côtier)', zone: 'golfe_guinee', villes: [
      { nom: 'Lagos', pays: 'NG' }, { nom: 'Cotonou', pays: 'BJ' }, { nom: 'Lomé', pays: 'TG' }, { nom: 'Accra', pays: 'GH' }, { nom: 'Abidjan', pays: 'CI' },
    ] },
  ],
  ao_cotiere: [
    { id: 'dkr-conakry', nom: 'Dakar – Bissau – Conakry', zone: 'ao_cotiere', villes: [
      { nom: 'Dakar', pays: 'SN' }, { nom: 'Bissau', pays: 'GW' }, { nom: 'Conakry', pays: 'GN' },
    ] },
    { id: 'conakry-monrovia', nom: 'Conakry – Freetown – Monrovia', zone: 'ao_cotiere', villes: [
      { nom: 'Conakry', pays: 'GN' }, { nom: 'Freetown', pays: 'SL' }, { nom: 'Monrovia', pays: 'LR' },
    ] },
  ],
  afrique_centrale: [
    { id: 'douala-ndj', nom: "Douala – N'Djaména", zone: 'afrique_centrale', villes: [
      { nom: 'Douala', pays: 'CM' }, { nom: 'Ngaoundéré', pays: 'CM' }, { nom: "N'Djaména", pays: 'TD' },
    ] },
    { id: 'pnr-brz-bgi', nom: 'Pointe-Noire – Brazzaville – Bangui', zone: 'afrique_centrale', villes: [
      { nom: 'Pointe-Noire', pays: 'CG' }, { nom: 'Brazzaville', pays: 'CG' }, { nom: 'Bangui', pays: 'CF' },
    ] },
  ],
  corne_afrique: [
    { id: 'dji-addis', nom: 'Djibouti – Addis-Abeba', zone: 'corne_afrique', villes: [
      { nom: 'Djibouti', pays: 'DJ' }, { nom: 'Dire Dawa', pays: 'ET' }, { nom: 'Addis-Abeba', pays: 'ET' },
    ] },
    { id: 'mombasa-nairobi-kampala', nom: 'Corridor Nord : Mombasa – Nairobi – Kampala', zone: 'corne_afrique', villes: [
      { nom: 'Mombasa', pays: 'KE' }, { nom: 'Nairobi', pays: 'KE' }, { nom: 'Kampala', pays: 'UG' },
    ] },
  ],
  grands_lacs: [
    { id: 'kampala-kigali-buja', nom: 'Kampala – Kigali – Bujumbura', zone: 'grands_lacs', villes: [
      { nom: 'Kampala', pays: 'UG' }, { nom: 'Kigali', pays: 'RW' }, { nom: 'Bujumbura', pays: 'BI' },
    ] },
    { id: 'dar-kigali', nom: 'Dar es-Salaam – Kigali', zone: 'grands_lacs', villes: [
      { nom: 'Dar es-Salaam', pays: 'TZ' }, { nom: 'Kigoma', pays: 'TZ' }, { nom: 'Kigali', pays: 'RW' },
    ] },
  ],
  afrique_australe: [
    { id: 'beira', nom: 'Corridor de Beira', zone: 'afrique_australe', villes: [
      { nom: 'Beira', pays: 'MZ' }, { nom: 'Harare', pays: 'ZW' }, { nom: 'Lusaka', pays: 'ZM' },
    ] },
    { id: 'walvis-bay', nom: 'Corridor de Walvis Bay', zone: 'afrique_australe', villes: [
      { nom: 'Walvis Bay', pays: 'NA' }, { nom: 'Gaborone', pays: 'BW' }, { nom: 'Johannesburg', pays: 'ZA' },
    ] },
  ],
  afrique_nord: [
    { id: 'trans-maghreb', nom: 'Corridor Trans-Maghrébin', zone: 'afrique_nord', villes: [
      { nom: 'Casablanca', pays: 'MA' }, { nom: 'Alger', pays: 'DZ' }, { nom: 'Tunis', pays: 'TN' }, { nom: 'Tripoli', pays: 'LY' },
    ] },
    { id: 'rabat-nouakchott', nom: 'Rabat – Nouakchott', zone: 'afrique_nord', villes: [
      { nom: 'Rabat', pays: 'MA' }, { nom: 'Dakhla', pays: 'MA' }, { nom: 'Nouakchott', pays: 'MR' },
    ] },
  ],
};

export const SCOPES_FENETRE = [
  { key: '24h', label: '24 h', heures: 24 },
  { key: '72h', label: '72 h', heures: 72 },
  { key: '7j', label: '7 jours', heures: 24 * 7 },
  { key: '30j', label: '30 jours', heures: 24 * 30 },
] as const;
