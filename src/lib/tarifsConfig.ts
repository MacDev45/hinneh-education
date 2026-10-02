/**
 * tarifsConfig.ts
 * Module centralise de gestion et personnalisation des Tarifs Officiels Especes
 * et des Frais Divers (Cours d'anglais, Cours d'informatique, etc.) par ecole.
 */

import { findSchoolCluster } from "./grilleTarifaire";

export interface OfficialCashTariffs {
  // College 1er Cycle
  college_1er_cycle_bcd: number; // 5eme B, C & D et 4eme B, C & D (defaut: 27 000 F CFA)
  college_1er_cycle_general: number; // De 6eme a 4eme (defaut: 20 000 F CFA)
  college_1er_cycle_3eme: number; // 3eme (defaut: 25 000 F CFA)

  // College 2nd Cycle (Lycee)
  college_2nd_cycle_2nde_1ere: number; // 2nd & 1ere (defaut: 20 000 F CFA)
  college_2nd_cycle_tle: number; // Tle (Terminale) (defaut: 25 000 F CFA)

  // Maternelle & Primaire
  maternelle: number; // Maternelle (defaut: 25 000 F CFA)
  primaire: number; // Primaire (defaut: 35 000 F CFA)
}

export const DEFAULT_OFFICIAL_CASH_TARIFFS: OfficialCashTariffs = {
  college_1er_cycle_bcd: 27000,
  college_1er_cycle_general: 20000,
  college_1er_cycle_3eme: 25000,
  college_2nd_cycle_2nde_1ere: 20000,
  college_2nd_cycle_tle: 25000,
  maternelle: 25000,
  primaire: 35000,
};

/**
 * Résout le tarif mensuel officiel d'un service (cantine ou transport) selon l'établissement,
 * son code, son identifiant ou sa ville.
 * - Korhogo, Bouaké, Daloa : Cantine = 10 000 FCFA/mois, Transport (Car) = 15 000 FCFA/mois
 * - Abidjan, Yamoussoukro, Défaut : Cantine = 15 000 FCFA/mois, Transport (Car) = 18 000 FCFA/mois
 */
export function getOfficialServiceTarif(
  serviceType: "cantine" | "transport",
  schoolCodeOrId?: string | number | null,
  ville?: string | null,
  schoolName?: string | null
): number {
  const v = (ville || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const sc = String(schoolCodeOrId || "").toUpperCase().trim();
  const sn = (schoolName || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const cluster = findSchoolCluster(schoolCodeOrId, schoolCodeOrId ? String(schoolCodeOrId) : null, ville);
  const clusterCity = (cluster?.city || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const isKorhogo =
    clusterCity === "KORHOGO" ||
    v.includes("KORHOGO") ||
    sc.includes("240477") ||
    sc === "9" ||
    sc === "22" ||
    sc === "23" ||
    sc === "24" ||
    sn.includes("KORHOGO");

  const isBouake =
    clusterCity === "BOUAKE" ||
    v.includes("BOUAKE") ||
    sc.includes("09786") ||
    sc.includes("9786") ||
    sc.includes("IEF") ||
    sc === "2" ||
    sc === "16" ||
    sn.includes("BOUAKE");

  const isDaloa =
    clusterCity === "DALOA" ||
    v.includes("DALOA") ||
    sc.includes("058131") ||
    sc.includes("DLO") ||
    sc === "13" ||
    sc === "19" ||
    sc === "20" ||
    sc === "21" ||
    sn.includes("DALOA");

  const isYamoussoukro =
    clusterCity === "YAMOUSSOUKRO" ||
    v.includes("YAMOUSSOUKRO") ||
    sc.includes("058128") ||
    sc.includes("LIY") ||
    sc === "3" ||
    sc === "8" ||
    sc === "14" ||
    sc === "15" ||
    sn.includes("YAMOUSSOUKRO");

  if (serviceType === "cantine") {
    if (isKorhogo || isBouake || isDaloa) return 10000;
    return 15000; // Abidjan, Yamoussoukro, défaut
  }

  if (serviceType === "transport") {
    if (isKorhogo || isBouake || isDaloa) return 15000;
    return 18000; // Abidjan, Yamoussoukro, défaut
  }

  return 15000;
}

export interface FraisDiversItem {
  id: string;
  code: string; // e.g. 'tenue_college_m', 'tenue_college_s', 'tenue_primaire_m', 'tenue_primaire_s', etc.
  categorie?: 'tenue' | 'achat_divers' | 'cours' | 'activite' | 'autre';
  genre?: 'M' | 'S' | 'tous'; // M = Masculin (Garçon), S = Féminin (Fille), tous = Mixte
  cycle?: 'Maternelle' | 'Primaire' | 'Collège' | 'Collège 2nd cycle' | 'tous' | string;
  niveau?: string; // e.g. '6ème', '3ème', '2nde', 'Terminale', 'tous', etc.
  libelle: string; // e.g. "Tenue Collège (Polo + Pantalon) — Genre M"
  montant: number; // e.g. 15000, 10000, 5000
  description?: string;
  periodicite?: "unique" | "mensuel" | "trimestriel" | "annuel";
  cycleOrLevel?: string;
  actif: boolean;
}

export const DEFAULT_FRAIS_DIVERS: FraisDiversItem[] = [
  // ─── COLLÈGE (1ER CYCLE — 6e, 5e, 4e, 3e) ───
  {
    id: "fd-tenue-college-m",
    code: "tenue_college_m",
    categorie: "tenue",
    cycle: "Collège",
    genre: "M",
    libelle: "Tenue Complète Collège (Polo + Pantalon) — Genre M",
    montant: 15000,
    description: "Uniforme officiel Collège pour garçon (6e à 3e)",
    periodicite: "unique",
    actif: true,
  },
  {
    id: "fd-tenue-college-s",
    code: "tenue_college_s",
    categorie: "tenue",
    cycle: "Collège",
    genre: "S",
    libelle: "Tenue Complète Collège (Polo + Jupe) — Genre S",
    montant: 15000,
    description: "Uniforme officiel Collège pour fille (6e à 3e)",
    periodicite: "unique",
    actif: true,
  },
  {
    id: "fd-tenue-eps-college-m",
    code: "tenue_eps_college_m",
    categorie: "tenue",
    cycle: "Collège",
    genre: "M",
    libelle: "Tenue EPS & Sport Collège — Genre M",
    montant: 7000,
    description: "T-shirt et short EPS Collège pour garçon",
    periodicite: "unique",
    actif: true,
  },
  {
    id: "fd-tenue-eps-college-s",
    code: "tenue_eps_college_s",
    categorie: "tenue",
    cycle: "Collège",
    genre: "S",
    libelle: "Tenue EPS & Sport Collège — Genre S",
    montant: 7000,
    description: "T-shirt et bas de sport EPS Collège pour fille",
    periodicite: "unique",
    actif: true,
  },

  // ─── LYCÉE (2ND CYCLE — 2nde, 1ère, Tle) ───
  {
    id: "fd-tenue-lycee-m",
    code: "tenue_lycee_m",
    categorie: "tenue",
    cycle: "Collège 2nd cycle",
    genre: "M",
    libelle: "Tenue Complète Lycée (Polo + Pantalon) — Genre M",
    montant: 17000,
    description: "Uniforme officiel Lycée / 2nd Cycle pour garçon (2nde, 1ère, Tle)",
    periodicite: "unique",
    actif: true,
  },
  {
    id: "fd-tenue-lycee-s",
    code: "tenue_lycee_s",
    categorie: "tenue",
    cycle: "Collège 2nd cycle",
    genre: "S",
    libelle: "Tenue Complète Lycée (Polo + Jupe) — Genre S",
    montant: 17000,
    description: "Uniforme officiel Lycée / 2nd Cycle pour fille (2nde, 1ère, Tle)",
    periodicite: "unique",
    actif: true,
  },
  {
    id: "fd-tenue-eps-lycee-m",
    code: "tenue_eps_lycee_m",
    categorie: "tenue",
    cycle: "Collège 2nd cycle",
    genre: "M",
    libelle: "Tenue EPS & Sport Lycée — Genre M",
    montant: 7000,
    description: "T-shirt et short EPS Lycée pour garçon",
    periodicite: "unique",
    actif: true,
  },
  {
    id: "fd-tenue-eps-lycee-s",
    code: "tenue_eps_lycee_s",
    categorie: "tenue",
    cycle: "Collège 2nd cycle",
    genre: "S",
    libelle: "Tenue EPS & Sport Lycée — Genre S",
    montant: 7000,
    description: "T-shirt et bas de sport EPS Lycée pour fille",
    periodicite: "unique",
    actif: true,
  },

  // ─── PRIMAIRE (CP1, CP2, CE1, CE2, CM1, CM2) ───
  {
    id: "fd-tenue-primaire-m",
    code: "tenue_primaire_m",
    categorie: "tenue",
    cycle: "Primaire",
    genre: "M",
    libelle: "Tenue Complète Primaire (Polo + Bermuda/Pantalon) — Genre M",
    montant: 13000,
    description: "Uniforme officiel Primaire pour garçon (CP1 à CM2)",
    periodicite: "unique",
    actif: true,
  },
  {
    id: "fd-tenue-primaire-s",
    code: "tenue_primaire_s",
    categorie: "tenue",
    cycle: "Primaire",
    genre: "S",
    libelle: "Tenue Complète Primaire (Polo + Jupe/Robe) — Genre S",
    montant: 13000,
    description: "Uniforme officiel Primaire pour fille (CP1 à CM2)",
    periodicite: "unique",
    actif: true,
  },
  {
    id: "fd-tenue-eps-primaire-m",
    code: "tenue_eps_primaire_m",
    categorie: "tenue",
    cycle: "Primaire",
    genre: "M",
    libelle: "Tenue EPS Primaire — Genre M",
    montant: 6000,
    description: "Tenue de sport Primaire pour garçon",
    periodicite: "unique",
    actif: true,
  },
  {
    id: "fd-tenue-eps-primaire-s",
    code: "tenue_eps_primaire_s",
    categorie: "tenue",
    cycle: "Primaire",
    genre: "S",
    libelle: "Tenue EPS Primaire — Genre S",
    montant: 6000,
    description: "Tenue de sport Primaire pour fille",
    periodicite: "unique",
    actif: true,
  },

  // ─── MATERNELLE (PETITE, MOYENNE, GRANDE SECTION) ───
  {
    id: "fd-tenue-maternelle-m",
    code: "tenue_maternelle_m",
    categorie: "tenue",
    cycle: "Maternelle",
    genre: "M",
    libelle: "Tablier / Tenue Maternelle — Genre M",
    montant: 12000,
    description: "Tablier et ensemble Maternelle pour garçon",
    periodicite: "unique",
    actif: true,
  },
  {
    id: "fd-tenue-maternelle-s",
    code: "tenue_maternelle_s",
    categorie: "tenue",
    cycle: "Maternelle",
    genre: "S",
    libelle: "Tablier / Tenue Maternelle — Genre S",
    montant: 12000,
    description: "Tablier et ensemble Maternelle pour fille",
    periodicite: "unique",
    actif: true,
  },

  // ─── TRICOTS & POLOS SUPPLÉMENTAIRES (TOUS CYCLES) ───
  {
    id: "fd-polo-sup-m",
    code: "polo_m",
    categorie: "tenue",
    cycle: "tous",
    genre: "M",
    libelle: "Tricot / Polo Supplémentaire — Genre M",
    montant: 5000,
    description: "Polo supplémentaire aux couleurs de l'école pour garçon",
    periodicite: "unique",
    actif: true,
  },
  {
    id: "fd-polo-sup-s",
    code: "polo_s",
    categorie: "tenue",
    cycle: "tous",
    genre: "S",
    libelle: "Tricot / Polo Supplémentaire — Genre S",
    montant: 5000,
    description: "Polo supplémentaire aux couleurs de l'école pour fille",
    periodicite: "unique",
    actif: true,
  },

  // ─── ACHATS DIVERS & FOURNITURES ───
  {
    id: "fd-kit-fournitures",
    code: "achat_divers",
    categorie: "achat_divers",
    libelle: "Kit Fournitures & Cahiers / Macaron",
    montant: 5000,
    description: "Paquet de cahiers de devoirs, macarons et protège-documents",
    periodicite: "unique",
    actif: true,
  },
  {
    id: "fd-carnet-badge",
    code: "achat_divers",
    categorie: "achat_divers",
    libelle: "Carnet de Correspondance & Badge",
    montant: 3000,
    description: "Badge d'accès sécurisé et carnet de liaison officiel",
    periodicite: "unique",
    actif: true,
  },
  {
    id: "fd-livres-annales",
    code: "achat_divers",
    categorie: "achat_divers",
    libelle: "Achats Livres, Fascicules & Annales",
    montant: 10000,
    description: "Manuels scolaires, annales d'examen et fascicules de cours",
    periodicite: "unique",
    actif: true,
  },

  // ─── COURS & ACTIVITÉS ───
  {
    id: "fd-anglais",
    code: "cours_anglais",
    categorie: "cours",
    libelle: "Cours d'Anglais",
    montant: 10000,
    description: "Formation et renforcement linguistique en anglais",
    periodicite: "mensuel",
    actif: true,
  },
  {
    id: "fd-informatique",
    code: "cours_informatique",
    categorie: "cours",
    libelle: "Cours d'Informatique / TICE",
    montant: 15000,
    description: "Initiation et perfectionnement en informatique et bureautique",
    periodicite: "mensuel",
    actif: true,
  },
  {
    id: "fd-soutien",
    code: "cours_soutien",
    categorie: "cours",
    libelle: "Cours de Soutien & Renforcement",
    montant: 10000,
    description: "Séances de soutien scolaire et préparation aux examens",
    periodicite: "mensuel",
    actif: true,
  },
  {
    id: "fd-periscolaire",
    code: "activite_periscolaire",
    categorie: "activite",
    libelle: "Activités Périscolaires & Clubs",
    montant: 5000,
    description: "Clubs scientifiques, artistiques et sportifs",
    periodicite: "unique",
    actif: true,
  },
];

/**
 * Parse un tarif numerique en preservant les valeurs a 0 F CFA
 */
export function parseTariff(value: any, defaultValue: number): number {
  if (value === undefined || value === null || value === "") return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Normalise un nom de ville pour le stockage
 */
export function normalizeCityKey(ville?: string): string {
  if (!ville) return "";
  return ville
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "_");
}

/**
 * Genere la liste des cles de stockage a rechercher par ordre de priorite
 */
function getLookupKeys(baseKey: string, schoolCodeOrId?: string | number, ville?: string): string[] {
  const keys: string[] = [];

  const sc = schoolCodeOrId !== undefined && schoolCodeOrId !== null ? String(schoolCodeOrId).trim() : "";
  const v = ville ? normalizeCityKey(ville) : "";

  // Résolution automatique par Cluster d'Établissement
  const cluster = findSchoolCluster(schoolCodeOrId, typeof schoolCodeOrId === "string" ? schoolCodeOrId : null, ville);
  if (cluster) {
    keys.push(`${baseKey}_code_${cluster.canonicalCode.toUpperCase()}`);
    keys.push(`${baseKey}_id_${cluster.canonicalId}`);
    keys.push(`${baseKey}_ville_${normalizeCityKey(cluster.city)}`);
    for (const cCode of cluster.allCodes) {
      keys.push(`${baseKey}_code_${cCode.toUpperCase()}`);
      keys.push(`${baseKey}_${cCode}`);
    }
    for (const cId of cluster.allIds) {
      keys.push(`${baseKey}_id_${cId}`);
    }
  }

  if (sc && sc !== "all" && sc !== "default") {
    // 1. Cle explicite par code ecole
    keys.push(`${baseKey}_code_${sc.toUpperCase()}`);
    // 2. Cle explicite par ID ecole
    keys.push(`${baseKey}_id_${sc}`);
    // 3. Cle combinee ville + ecole
    if (v) {
      keys.push(`${baseKey}_${v}_${sc}`);
    }
    // 4. Cle simple code
    keys.push(`${baseKey}_${sc}`);
  }

  // 5. Cle par ville
  if (v && v !== "all") {
    keys.push(`${baseKey}_ville_${v}`);
  }

  // 6. Si pas de parametre explicite, regarder dans le localStorage de l'utilisateur connecte
  if (typeof localStorage !== "undefined") {
    const selCode =
      localStorage.getItem("selected_school_code") ||
      localStorage.getItem("user_ecole_code") ||
      localStorage.getItem("code_etablissement");
    const selId = localStorage.getItem("user_ecole_id");
    const selVille = localStorage.getItem("user_ville");

    if (selCode && !keys.includes(`${baseKey}_code_${selCode.toUpperCase()}`)) {
      keys.push(`${baseKey}_code_${selCode.toUpperCase()}`);
      keys.push(`${baseKey}_${selCode}`);
    }
    if (selId && !keys.includes(`${baseKey}_id_${selId}`)) {
      keys.push(`${baseKey}_id_${selId}`);
    }
    if (selVille) {
      const normSelVille = normalizeCityKey(selVille);
      if (normSelVille && !keys.includes(`${baseKey}_ville_${normSelVille}`)) {
        keys.push(`${baseKey}_ville_${normSelVille}`);
      }
    }
  }

  // 7. Cles globales par defaut
  keys.push(`${baseKey}_default`);
  keys.push(baseKey);

  // Dédupliquer tout en préservant l'ordre
  return Array.from(new Set(keys));
}

/**
 * Retourne la cle d'enregistrement principale pour un etablissement / ville
 */
function getPrimarySaveKeys(baseKey: string, schoolCodeOrId?: string | number, ville?: string): string[] {
  const keys: string[] = [];
  const sc = schoolCodeOrId !== undefined && schoolCodeOrId !== null ? String(schoolCodeOrId).trim() : "";
  const v = ville ? normalizeCityKey(ville) : "";

  if (sc && sc !== "all" && sc !== "default") {
    keys.push(`${baseKey}_code_${sc.toUpperCase()}`);
    keys.push(`${baseKey}_id_${sc}`);
    keys.push(`${baseKey}_${sc}`);
    if (v) {
      keys.push(`${baseKey}_${v}_${sc}`);
    }
  } else if (v && v !== "all") {
    keys.push(`${baseKey}_ville_${v}`);
  } else {
    keys.push(baseKey);
  }

  return keys;
}

/**
 * Cle de stockage legacy avec prise en compte du code etablissement
 */
function getStorageKey(baseKey: string, schoolCode?: string): string {
  const keys = getLookupKeys(baseKey, schoolCode);
  return keys[0] || `${baseKey}_default`;
}

/**
 * Recupere les tarifs officiels especes configures pour l'ecole et la ville
 */
export function getOfficialCashTariffs(schoolCodeOrId?: string | number, ville?: string): OfficialCashTariffs {
  if (typeof localStorage === "undefined") {
    return { ...DEFAULT_OFFICIAL_CASH_TARIFFS };
  }

  try {
    const candidateKeys = getLookupKeys("school_official_cash_tariffs", schoolCodeOrId, ville);
    for (const key of candidateKeys) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          college_1er_cycle_bcd: parseTariff(parsed.college_1er_cycle_bcd, DEFAULT_OFFICIAL_CASH_TARIFFS.college_1er_cycle_bcd),
          college_1er_cycle_general: parseTariff(parsed.college_1er_cycle_general, DEFAULT_OFFICIAL_CASH_TARIFFS.college_1er_cycle_general),
          college_1er_cycle_3eme: parseTariff(parsed.college_1er_cycle_3eme, DEFAULT_OFFICIAL_CASH_TARIFFS.college_1er_cycle_3eme),
          college_2nd_cycle_2nde_1ere: parseTariff(parsed.college_2nd_cycle_2nde_1ere, DEFAULT_OFFICIAL_CASH_TARIFFS.college_2nd_cycle_2nde_1ere),
          college_2nd_cycle_tle: parseTariff(parsed.college_2nd_cycle_tle, DEFAULT_OFFICIAL_CASH_TARIFFS.college_2nd_cycle_tle),
          maternelle: parseTariff(parsed.maternelle, DEFAULT_OFFICIAL_CASH_TARIFFS.maternelle),
          primaire: parseTariff(parsed.primaire, DEFAULT_OFFICIAL_CASH_TARIFFS.primaire),
        };
      }
    }
  } catch (e) {
    console.error("Erreur lors de la lecture des tarifs officiels especes :", e);
  }

  return { ...DEFAULT_OFFICIAL_CASH_TARIFFS };
}

/**
 * Enregistre les tarifs officiels especes pour l'ecole et la ville
 */
export function saveOfficialCashTariffs(
  tariffs: Partial<OfficialCashTariffs>,
  schoolCodeOrId?: string | number,
  ville?: string,
): OfficialCashTariffs {
  const current = getOfficialCashTariffs(schoolCodeOrId, ville);
  const updated: OfficialCashTariffs = {
    ...current,
    ...tariffs,
  };

  if (typeof localStorage !== "undefined") {
    try {
      const saveKeys = getPrimarySaveKeys("school_official_cash_tariffs", schoolCodeOrId, ville);
      const jsonStr = JSON.stringify(updated);
      for (const k of saveKeys) {
        localStorage.setItem(k, jsonStr);
      }
      // Conserver aussi pour compatibilite
      if (!schoolCodeOrId && !ville) {
        localStorage.setItem("school_official_cash_tariffs", jsonStr);
      }
      window.dispatchEvent(
        new CustomEvent("school_tariffs_updated", {
          detail: { tariffs: updated, schoolCode: schoolCodeOrId, ville },
        }),
      );
    } catch (e) {
      console.error("Erreur lors de l'enregistrement des tarifs officiels especes :", e);
    }
  }

  return updated;
}

/**
 * Recupere la liste des frais divers configures pour l'ecole et la ville
 */
export function getFraisDiversList(schoolCodeOrId?: string | number, ville?: string): FraisDiversItem[] {
  if (typeof localStorage === "undefined") {
    return [...DEFAULT_FRAIS_DIVERS];
  }

  try {
    const candidateKeys = getLookupKeys("school_frais_divers", schoolCodeOrId, ville);
    for (const key of candidateKeys) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Enrich items with category & genre if missing
          const enriched: FraisDiversItem[] = parsed.map((item) => {
            let cat = item.categorie;
            const code = (item.code || "").toLowerCase();
            const lib = (item.libelle || "").toLowerCase();
            if (!cat) {
              if (
                code.includes("tenue") ||
                code.includes("polo") ||
                code.includes("uniforme") ||
                lib.includes("tenue") ||
                lib.includes("uniforme")
              ) {
                cat = "tenue";
              } else if (
                code.includes("achat") ||
                code.includes("fourniture") ||
                code.includes("livre") ||
                code.includes("cahier") ||
                lib.includes("fourniture") ||
                lib.includes("kit") ||
                lib.includes("achat")
              ) {
                cat = "achat_divers";
              } else if (
                code.includes("anglais") ||
                code.includes("informatique") ||
                code.includes("soutien") ||
                lib.includes("cours")
              ) {
                cat = "cours";
              } else if (code.includes("activite") || code.includes("sport") || code.includes("club")) {
                cat = "activite";
              } else {
                cat = "autre";
              }
            }

            let genre = item.genre;
            if (!genre && cat === "tenue") {
              if (
                code.endsWith("_m") ||
                lib.includes("garçon") ||
                lib.includes("garcon") ||
                lib.includes("pantalon") ||
                lib.includes("genre m")
              ) {
                genre = "M";
              } else if (
                code.endsWith("_s") ||
                code.endsWith("_f") ||
                lib.includes("fille") ||
                lib.includes("jupe") ||
                lib.includes("robe") ||
                lib.includes("genre s") ||
                lib.includes("genre f")
              ) {
                genre = "S";
              } else {
                genre = "tous";
              }
            }

            let cycle = item.cycle;
            if (!cycle && cat === "tenue") {
              if (
                code.includes("lycee") ||
                lib.includes("lycée") ||
                lib.includes("lycee") ||
                lib.includes("2nd cycle") ||
                lib.includes("2nde") ||
                lib.includes("1ère") ||
                lib.includes("terminale")
              ) {
                cycle = "Collège 2nd cycle";
              } else if (
                code.includes("college") ||
                lib.includes("collège") ||
                lib.includes("college") ||
                lib.includes("6e") ||
                lib.includes("3e")
              ) {
                cycle = "Collège";
              } else if (code.includes("primaire") || lib.includes("primaire") || lib.includes("cp") || lib.includes("cm")) {
                cycle = "Primaire";
              } else if (
                code.includes("maternelle") ||
                lib.includes("maternelle") ||
                lib.includes("tablier") ||
                lib.includes("section")
              ) {
                cycle = "Maternelle";
              } else {
                cycle = "tous";
              }
            }

            return {
              ...item,
              categorie: cat,
              genre: genre || "tous",
              cycle: cycle || "tous",
              niveau: item.niveau || "tous",
            };
          });

          // Ensure default level & gender tenues and achats are available
          const hasCollege = enriched.some((x) => x.categorie === "tenue" && x.cycle === "Collège");
          const hasLycee = enriched.some(
            (x) => x.categorie === "tenue" && (x.cycle === "Collège 2nd cycle" || x.cycle === "Lycée"),
          );
          const hasPrimaire = enriched.some((x) => x.categorie === "tenue" && x.cycle === "Primaire");
          const hasMaternelle = enriched.some((x) => x.categorie === "tenue" && x.cycle === "Maternelle");
          const hasAchat = enriched.some((x) => x.categorie === "achat_divers" || x.code?.includes("achat"));

          let merged = [...enriched];
          if (!hasCollege || !hasLycee || !hasPrimaire || !hasMaternelle) {
            const missingDefaults = DEFAULT_FRAIS_DIVERS.filter(
              (def) => def.categorie === "tenue" && !merged.some((m) => m.id === def.id || m.code === def.code),
            );
            merged = [...missingDefaults, ...merged];
          }
          if (!hasAchat) {
            merged = [...DEFAULT_FRAIS_DIVERS.filter((x) => x.categorie === "achat_divers"), ...merged];
          }

          return merged;
        }
      }
    }
  } catch (e) {
    console.error("Erreur lors de la lecture des frais divers :", e);
  }

  return [...DEFAULT_FRAIS_DIVERS];
}

/**
 * Enregistre la liste des frais divers pour l'ecole et la ville
 */
export function saveFraisDiversList(
  items: FraisDiversItem[],
  schoolCodeOrId?: string | number,
  ville?: string,
): FraisDiversItem[] {
  if (typeof localStorage !== "undefined") {
    try {
      const saveKeys = getPrimarySaveKeys("school_frais_divers", schoolCodeOrId, ville);
      const jsonStr = JSON.stringify(items);
      for (const k of saveKeys) {
        localStorage.setItem(k, jsonStr);
      }
      if (!schoolCodeOrId && !ville) {
        localStorage.setItem("school_frais_divers", jsonStr);
      }
      window.dispatchEvent(
        new CustomEvent("school_frais_divers_updated", {
          detail: { items, schoolCode: schoolCodeOrId, ville },
        }),
      );
    } catch (e) {
      console.error("Erreur lors de l'enregistrement des frais divers :", e);
    }
  }

  return items;
}

/* ------------------------------------------------------------------ */
/* Modele d'encaissement de la rentree (septembre)                     */
/* ------------------------------------------------------------------ */

/**
 * Toutes les ecoles n'encaissent pas la meme chose a la rentree :
 *
 *  - "inscription_plus_scolarite" : septembre porte les frais d'inscription ET une
 *    premiere tranche de scolarite ("Frais de Scolarite. 05 sept.") — modele
 *    historique d'Abidjan / Bouake ;
 *  - "inscription_seule" : l'eleve ne regle que les frais d'inscription a la rentree,
 *    la scolarite ne commence qu'au 2eme versement — modele de Korhogo.
 *
 * Le recu s'appuie sur ce reglage : dans le second cas il n'imprime que la ligne
 * « Frais d'Inscription » et n'exige jamais de tranche de scolarite en septembre.
 */
export type ModeleSeptembre = "inscription_seule" | "inscription_plus_scolarite";

export const DEFAULT_MODELE_SEPTEMBRE: ModeleSeptembre = "inscription_plus_scolarite";

const MODELE_SEPTEMBRE_STORAGE_KEY = "school_modele_septembre";

/**
 * Modele applique aux etablissements d'une ville tant qu'aucun reglage explicite
 * n'a ete enregistre pour eux depuis l'espace Parametres.
 */
const MODELE_SEPTEMBRE_PAR_VILLE: Record<string, ModeleSeptembre> = {};

function parseModeleSeptembre(value: unknown): ModeleSeptembre | null {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "inscription_seule" || v === "inscription_plus_scolarite") return v;
  return null;
}

/**
 * Modele d'encaissement de septembre configure pour l'ecole et la ville.
 * Priorite : reglage enregistre (code ecole > id > ville) puis modele connu de la ville.
 */
export function getModeleSeptembre(
  schoolCodeOrId?: string | number,
  ville?: string,
): ModeleSeptembre {
  if (typeof localStorage === "undefined") return DEFAULT_MODELE_SEPTEMBRE;

  try {
    const candidateKeys = getLookupKeys(MODELE_SEPTEMBRE_STORAGE_KEY, schoolCodeOrId, ville);
    for (const key of candidateKeys) {
      const parsed = parseModeleSeptembre(localStorage.getItem(key));
      if (parsed) return parsed;
    }

    // Aucun reglage enregistre : repli sur le modele connu de la ville de l'eleve,
    // puis sur celle de l'utilisateur connecte.
    const villeCandidates = [
      ville,
      localStorage.getItem("user_ville"),
      localStorage.getItem("selected_school_ville"),
    ];
    for (const candidate of villeCandidates) {
      const norm = normalizeCityKey(candidate || undefined);
      if (norm && MODELE_SEPTEMBRE_PAR_VILLE[norm]) return MODELE_SEPTEMBRE_PAR_VILLE[norm];
    }
  } catch (e) {
    console.error("Erreur lors de la lecture du modele de septembre :", e);
  }

  return DEFAULT_MODELE_SEPTEMBRE;
}

/**
 * Enregistre le modele d'encaissement de septembre pour l'ecole et la ville
 */
export function saveModeleSeptembre(
  modele: ModeleSeptembre,
  schoolCodeOrId?: string | number,
  ville?: string,
): ModeleSeptembre {
  if (typeof localStorage !== "undefined") {
    try {
      const saveKeys = getPrimarySaveKeys(MODELE_SEPTEMBRE_STORAGE_KEY, schoolCodeOrId, ville);
      for (const k of saveKeys) {
        localStorage.setItem(k, modele);
      }
      if (!schoolCodeOrId && !ville) {
        localStorage.setItem(MODELE_SEPTEMBRE_STORAGE_KEY, modele);
      }
      window.dispatchEvent(
        new CustomEvent("school_modele_septembre_updated", {
          detail: { modele, schoolCode: schoolCodeOrId, ville },
        }),
      );
    } catch (e) {
      console.error("Erreur lors de l'enregistrement du modele de septembre :", e);
    }
  }

  return modele;
}

/**
 * Calcule le montant des frais annexes especes selon le cycle, le niveau, l'ecole et la ville
 */
export function getOfficialFraisAnnexeTarifConfigured(
  cycle: string,
  niveau: string,
  schoolCodeOrId?: string | number,
  ville?: string,
): number {
  const tarifs = getOfficialCashTariffs(schoolCodeOrId, ville);
  const niveauStr = niveau || "";
  const niveauLower = niveauStr.toLocaleLowerCase().trim();
  const cycleLower = (cycle || "").toLocaleLowerCase().trim();

  if (
    cycleLower.includes("collège 1er cycle") ||
    cycleLower.includes("college 1er cycle") ||
    cycleLower.includes("1er cycle") ||
    cycleLower === "collège" ||
    cycleLower === "college"
  ) {
    const isBCD = [
      "5eme b",
      "5ème b",
      "5eme c",
      "5ème c",
      "5eme d",
      "5ème d",
      "4eme b",
      "4ème b",
      "4eme c",
      "4ème c",
      "4eme d",
      "4ème d",
      "5è b",
      "5è c",
      "5è d",
      "4è b",
      "4è c",
      "4è d",
    ].some((k) => niveauLower.includes(k));

    if (isBCD) return parseTariff(tarifs.college_1er_cycle_bcd, 27000);
    if (niveauLower.includes("3ème") || niveauLower.includes("3eme") || niveauLower === "3") {
      return parseTariff(tarifs.college_1er_cycle_3eme, 25000);
    }
    return parseTariff(tarifs.college_1er_cycle_general, 20000);
  }

  if (
    cycleLower.includes("collège 2nd cycle") ||
    cycleLower.includes("college 2nd cycle") ||
    cycleLower.includes("2nd") ||
    cycleLower.includes("2e cycle") ||
    cycleLower.includes("lycée") ||
    cycleLower.includes("lycee")
  ) {
    if (niveauLower.includes("tle") || niveauLower.includes("term") || niveauLower.includes("terminale")) {
      return parseTariff(tarifs.college_2nd_cycle_tle, 25000);
    }
    return parseTariff(tarifs.college_2nd_cycle_2nde_1ere, 20000);
  }

  if (cycleLower.includes("primaire")) {
    return parseTariff(tarifs.primaire, 35000);
  }

  if (cycleLower.includes("maternelle")) {
    return parseTariff(tarifs.maternelle, 25000);
  }

  // Detection d'apres le niveau seul si le cycle n'est pas explicite
  if (
    niveauLower.includes("mps") ||
    niveauLower.includes("mms") ||
    niveauLower.includes("mgs") ||
    niveauLower.includes("mat") ||
    niveauLower.includes("ps") ||
    niveauLower.includes("ms") ||
    niveauLower.includes("gs")
  ) {
    return parseTariff(tarifs.maternelle, 25000);
  }

  if (
    niveauLower.includes("cp") ||
    niveauLower.includes("ce") ||
    niveauLower.includes("cm") ||
    niveauLower.includes("prim")
  ) {
    return parseTariff(tarifs.primaire, 35000);
  }

  return parseTariff(tarifs.college_1er_cycle_general, 20000);
}

/**
 * Retourne le libelle et le montant officiel especes pour une classe, une ecole et une ville donnee
 */
export function getOfficialCashTariffForClassConfigured(
  studentClass: string,
  schoolCodeOrId?: string | number,
  ville?: string,
): { label: string; amount: number; formatted: string } {
  const tarifs = getOfficialCashTariffs(schoolCodeOrId, ville);
  const cls = (studentClass || "").toLowerCase().trim();

  // College 2nd cycle (Lycee)
  if (cls.includes("tle") || cls.includes("term") || cls.includes("terminale")) {
    const amt = parseTariff(tarifs.college_2nd_cycle_tle, 25000);
    return {
      label: `${amt.toLocaleString("fr-FR")} F CFA (Tle Terminale)`,
      amount: amt,
      formatted: `${amt.toLocaleString("fr-FR")} F CFA`,
    };
  }
  if (
    cls.includes("2nd") ||
    cls.includes("2e") ||
    cls.includes("seconde") ||
    cls.includes("1ere") ||
    cls.includes("1ère") ||
    cls.includes("1er") ||
    cls.includes("1e") ||
    cls.includes("premiere") ||
    cls.includes("première")
  ) {
    const amt = parseTariff(tarifs.college_2nd_cycle_2nde_1ere, 20000);
    return {
      label: `${amt.toLocaleString("fr-FR")} F CFA (2nd & 1ère)`,
      amount: amt,
      formatted: `${amt.toLocaleString("fr-FR")} F CFA`,
    };
  }

  // College 1er cycle
  if (cls.includes("3ème") || cls.includes("3eme") || cls.includes("3e") || cls === "3") {
    const amt = parseTariff(tarifs.college_1er_cycle_3eme, 25000);
    return {
      label: `${amt.toLocaleString("fr-FR")} F CFA (3ème)`,
      amount: amt,
      formatted: `${amt.toLocaleString("fr-FR")} F CFA`,
    };
  }
  if (
    cls.includes("5eme b") ||
    cls.includes("5ème b") ||
    cls.includes("5eme c") ||
    cls.includes("5ème c") ||
    cls.includes("5eme d") ||
    cls.includes("5ème d") ||
    cls.includes("4eme b") ||
    cls.includes("4ème b") ||
    cls.includes("4eme c") ||
    cls.includes("4ème c") ||
    cls.includes("4eme d") ||
    cls.includes("4ème d") ||
    cls.includes("5è b") ||
    cls.includes("5è c") ||
    cls.includes("5è d") ||
    cls.includes("4è b") ||
    cls.includes("4è c") ||
    cls.includes("4è d")
  ) {
    const amt = parseTariff(tarifs.college_1er_cycle_bcd, 27000);
    return {
      label: `${amt.toLocaleString("fr-FR")} F CFA (5ème/4ème B, C, D)`,
      amount: amt,
      formatted: `${amt.toLocaleString("fr-FR")} F CFA`,
    };
  }
  if (
    cls.includes("6") ||
    cls.includes("5") ||
    cls.includes("4") ||
    cls.includes("collè") ||
    cls.includes("colle")
  ) {
    const amt = parseTariff(tarifs.college_1er_cycle_general, 20000);
    return {
      label: `${amt.toLocaleString("fr-FR")} F CFA (6ème à 4ème)`,
      amount: amt,
      formatted: `${amt.toLocaleString("fr-FR")} F CFA`,
    };
  }

  // Primaire & Maternelle
  if (
    cls.includes("mat") ||
    cls.includes("ps") ||
    cls.includes("ms") ||
    cls.includes("gs") ||
    cls.includes("tps")
  ) {
    const amt = parseTariff(tarifs.maternelle, 25000);
    return {
      label: `${amt.toLocaleString("fr-FR")} F CFA (Maternelle)`,
      amount: amt,
      formatted: `${amt.toLocaleString("fr-FR")} F CFA`,
    };
  }
  if (cls.includes("cp") || cls.includes("ce") || cls.includes("cm") || cls.includes("prim")) {
    const amt = parseTariff(tarifs.primaire, 35000);
    return {
      label: `${amt.toLocaleString("fr-FR")} F CFA (Primaire)`,
      amount: amt,
      formatted: `${amt.toLocaleString("fr-FR")} F CFA`,
    };
  }

  const amt = parseTariff(tarifs.college_1er_cycle_general, 20000);
  return {
    label: `${amt.toLocaleString("fr-FR")} F CFA`,
    amount: amt,
    formatted: `${amt.toLocaleString("fr-FR")} F CFA`,
  };
}
