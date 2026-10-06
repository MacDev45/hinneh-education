/**
 * grilleTarifaire.ts
 *
 * Source unique des tranches d'échéancier côté frontend.
 *
 * Deux sources réelles, dans cet ordre :
 *   1. la Grille Tarifaire Officielle — table `api_grilletarifaire` exposée par
 *      GET /api/echeanciers/hinneh-presets, éditable depuis l'espace Échéancier ;
 *   2. les Frais d'Écolage de l'Économat (`economat_frais_ecolage`), qui sont
 *      eux-mêmes synchronisés depuis cette grille.
 *
 * Aucun barème n'est codé en dur ici : si aucune des deux sources ne couvre la
 * classe de l'élève, la résolution renvoie une liste vide et l'appelant doit
 * afficher « grille non configurée » plutôt qu'un montant inventé.
 */

import apiClient from "@/lib/apiClient";
import defaultPresetsData from "./defaultGrillePresets.json";

export interface GrilleTranche {
  libelle: string;
  montant: number;
  date?: string;
}

export interface GrillePreset {
  id: string;
  label: string;
  cycle: string;
  niveaux: string[];
  statut_affectation?: string;
  ecole_id?: number | string;
  ET_CODEETABLISSEMENT?: string;
  ville?: string;
  total?: number;
  tranches: GrilleTranche[];
}

export type TrancheSource = "grille" | "ecolage" | "aucune";

export interface EcheancierResolution {
  /** Origine réelle des tranches, pour pouvoir l'afficher au guichet. */
  source: TrancheSource;
  /** Libellé du modèle tarifaire retenu ("" si aucune source ne couvre la classe). */
  label: string;
  tranches: GrilleTranche[];
}

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* Constantes et Clusters des Établissements Réels (Côte d'Ivoire)    */
/* ------------------------------------------------------------------ */

export interface SchoolCluster {
  canonicalId: number;
  allIds: number[];
  canonicalCode: string;
  allCodes: string[];
  city: string;
  name: string;
}

export const SCHOOL_CLUSTERS: Record<string, SchoolCluster> = {
  abidjan: {
    canonicalId: 1,
    allIds: [1, 4, 5, 6, 7],
    canonicalCode: "057955",
    allCodes: ["057955", "0579558", "FHA-01", "ECOLE_TEST_A", "FHA-TEST-1783608727", "FHA-TEST-1783894452", "FHA-TEST-1783894553"],
    city: "Abidjan",
    name: "Fondation Hinneh Abidjan",
  },
  bouake: {
    canonicalId: 16,
    allIds: [16, 2],
    canonicalCode: "09786",
    allCodes: ["09786", "9786", "IEF-02"],
    city: "Bouaké",
    name: "Institut El Fath Bouaké",
  },
  yamoussoukro: {
    canonicalId: 13,
    allIds: [13, 14, 15, 3, 8],
    canonicalCode: "058128",
    allCodes: ["058128", "LIY-03", "ECOLE_TEST_B"],
    city: "Yamoussoukro",
    name: "Lycée Islamique Yamoussoukro",
  },
  daloa: {
    canonicalId: 20,
    allIds: [19, 20, 21, 13],
    canonicalCode: "058131",
    allCodes: ["058131", "HIN-DLO-01"],
    city: "Daloa",
    name: "Collège Moderne Hînneh Daloa",
  },
  korhogo: {
    canonicalId: 22,
    allIds: [22, 23, 24, 9, 3],
    canonicalCode: "240477",
    allCodes: ["240477", "2404777"],
    city: "Korhogo",
    name: "Groupe Scolaire Confessionnel Islamique Hinneh de Korhogo",
  },
};

export function findSchoolCluster(schoolId?: number | string | null, schoolCode?: string | null, city?: string | null): SchoolCluster | null {
  const sid = schoolId !== undefined && schoolId !== null && String(schoolId) !== "" ? Number(schoolId) : null;
  const scode = schoolCode ? String(schoolCode).trim().toUpperCase() : null;
  const scity = city ? stripAccents(String(city)).trim().toLowerCase() : null;

  for (const cluster of Object.values(SCHOOL_CLUSTERS)) {
    if (sid !== null && !isNaN(sid) && cluster.allIds.includes(sid)) {
      return cluster;
    }
    if (scode && cluster.allCodes.some((c) => c.toUpperCase() === scode)) {
      return cluster;
    }
    if (scity && stripAccents(cluster.city).trim().toLowerCase() === scity) {
      return cluster;
    }
  }
  return null;
}

const PRESETS_STORAGE_PREFIX = "hinneh_grille_presets_v2";
const ECOLAGE_STORAGE_PREFIX = "economat_frais_ecolage_v2";
export const GRILLE_UPDATED_EVENT = "hinneh:grille-tarifaire-updated";

/**
 * Chaque grille tarifaire est liée à une école précise. Le code établissement ne
 * suffit pas à la désigner : maternelle, primaire et collège d'un même campus
 * partagent le même code. On indexe donc le cache sur l'identifiant numérique de
 * l'école (IDETABLISSEMENT) et on ne retombe sur le code que lorsqu'aucun
 * identifiant n'est connu — auquel cas la grille couvre tout le campus.
 */
export function currentSchoolScopeKey(): string {
  if (typeof localStorage === "undefined") return "global";
  const readable = (key: string) => {
    const value = localStorage.getItem(key);
    return value && value !== "undefined" && value !== "null" ? value : null;
  };
  const ecoleId = readable("user_ecole_id") || readable("ecole_id");
  if (ecoleId) return `ecole-${ecoleId}`;
  const code =
    readable("user_ecole_code") ||
    readable("code_etablissement") ||
    readable("selected_school_code");
  if (code) return `code-${code}`;
  return "global";
}

/**
 * Clé de cache d'une école désignée explicitement (écran Échéancier, qui peut
 * consulter la grille d'une autre école que celle de l'utilisateur connecté).
 * L'identifiant prime : le code seul ne distingue pas les cycles d'un campus.
 */
export function scopeKeyForSchool(
  ecoleId?: number | string | null,
  code?: string | null,
): string {
  if (ecoleId !== undefined && ecoleId !== null && String(ecoleId) !== "") {
    return `ecole-${ecoleId}`;
  }
  if (code) return `code-${code}`;
  return "global";
}

const storageKeyFor = (scopeKey: string) => `${PRESETS_STORAGE_PREFIX}__${scopeKey}`;
const ecolageKeyFor = (scopeKey: string) => `${ECOLAGE_STORAGE_PREFIX}__${scopeKey}`;

/* ------------------------------------------------------------------ */
/* Normalisation des libellés de classe et de niveau                   */
/* ------------------------------------------------------------------ */

// Écrit via RegExp() : la classe de caractères combinants n'est pas lisible en littéral.
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

const stripAccents = (value: string): string =>
  value.normalize("NFD").replace(COMBINING_MARKS, "");

/** "5è C" -> "5E C", "1ère A" -> "1ERE A", "Collège 2nd cycle" -> "COLLEGE 2ND CYCLE" */
const canon = (value: unknown): string =>
  stripAccents(String(value ?? ""))
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

export type CycleKey = "maternelle" | "primaire" | "college" | "lycee" | "inconnu";

export interface NiveauKey {
  cycle: CycleKey;
  /** Code canonique du niveau : MPS, MMS, MGS, CP1..CM2, 6EME..3EME, 2NDE, 1ERE, TLE. */
  niveau: string;
  /** Série éventuelle (A, B, C, D) portée par la classe ou par le libellé du modèle. */
  serie: string;
}

const CYCLE_OF_NIVEAU: Record<string, CycleKey> = {
  MPS: "maternelle",
  MMS: "maternelle",
  MGS: "maternelle",
  CP1: "primaire",
  CP2: "primaire",
  CE1: "primaire",
  CE2: "primaire",
  CM1: "primaire",
  CM2: "primaire",
  "6EME": "college",
  "5EME": "college",
  "4EME": "college",
  "3EME": "college",
  "2NDE": "lycee",
  "1ERE": "lycee",
  TLE: "lycee",
};

const NIVEAU_EN_TOUTES_LETTRES: Array<[RegExp, string]> = [
  [/SIXIEME/, "6EME"],
  [/CINQUIEME/, "5EME"],
  [/QUATRIEME/, "4EME"],
  [/TROISIEME/, "3EME"],
  [/SECONDE/, "2NDE"],
  [/PREMIERE/, "1ERE"],
  [/TERMINALE|TERM/, "TLE"],
  [/PETITE SECTION/, "MPS"],
  [/MOYENNE SECTION/, "MMS"],
  [/GRANDE SECTION/, "MGS"],
];

/**
 * Traduit un libellé de classe ("6ème A", "CP1", "Tle D", "5è C", "MGS") en clé
 * exploitable. Sert aussi bien pour l'élève que pour les niveaux déclarés par un
 * modèle tarifaire, afin que les deux soient comparés sur la même base.
 */
export function parseNiveau(raw: unknown): NiveauKey {
  const text = canon(raw);
  if (!text) return { cycle: "inconnu", niveau: "", serie: "" };

  const tokens = text.split(" ").filter(Boolean);
  const compact = text.replace(/\s+/g, "");

  let serie = "";
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    if (/^[ABCD]$/.test(tokens[i])) {
      serie = tokens[i];
      break;
    }
  }

  const build = (niveau: string): NiveauKey => ({
    cycle: CYCLE_OF_NIVEAU[niveau] || "inconnu",
    niveau,
    serie,
  });

  // 1. Niveaux écrits en toutes lettres
  for (const [pattern, niveau] of NIVEAU_EN_TOUTES_LETTRES) {
    if (pattern.test(text)) return build(niveau);
  }

  // 2. Maternelle
  if (compact.includes("MPS") || compact.includes("PETITESECTION")) return build("MPS");
  if (compact.includes("MMS") || compact.includes("MOYENNESECTION")) return build("MMS");
  if (compact.includes("MGS") || compact.includes("GRANDESECTION")) return build("MGS");

  // 3. Primaire
  if (compact.includes("CP1")) return build("CP1");
  if (compact.includes("CP2")) return build("CP2");
  if (compact.includes("CE1")) return build("CE1");
  if (compact.includes("CE2")) return build("CE2");
  if (compact.includes("CM1")) return build("CM1");
  if (compact.includes("CM2")) return build("CM2");

  // 4. Secondaire
  if (compact.includes("6E") || compact.includes("6EME")) return build("6EME");
  if (compact.includes("5E") || compact.includes("5EME")) return build("5EME");
  if (compact.includes("4E") || compact.includes("4EME")) return build("4EME");
  if (compact.includes("3E") || compact.includes("3EME")) return build("3EME");
  if (compact.includes("2ND") || compact.includes("2NDE")) return build("2NDE");
  if (compact.includes("1ER") || compact.includes("1ERE")) return build("1ERE");
  if (compact.includes("TLE") || compact.includes("TERM")) return build("TLE");

  return { cycle: "inconnu", niveau: "", serie };
}

const isAffecte = (rawStatut: unknown): boolean => {
  const text = canon(rawStatut);
  if (!text) return true; // Par défaut : statut standard
  if (text.includes("NON AFFECT") || text === "NAFF" || text.includes("NAFF")) return false;
  if (text.includes("AFFECT") || text === "AFF") return true;
  return true;
};

/**
 * Distingue statut officiel déclaré ("AFF" / "NAFF") et déduction par libellé.
 * Important : l'ordre des tests compte, car « NON AFFECTÉ » contient aussi
 * « AFFECTÉ » : les libellés officiels contiennent les deux mots.
 */
function presetStatut(preset: GrillePreset): "AFF" | "NAFF" | "TOUS" {
  const declared = canon(preset.statut_affectation);
  if (declared === "NAFF") return "NAFF";
  if (declared === "AFF") return "AFF";
  if (declared === "TOUS") return "TOUS";

  const text = canon(`${preset.label} ${preset.cycle}`);
  if (text.includes("NON AFFECT")) return "NAFF";
  if (text.includes("AFFECT")) return "AFF";
  return "TOUS";
}

function cycleMatches(rawCycle: unknown, cycle: CycleKey): boolean {
  const text = canon(rawCycle);
  if (!text) return false;
  const isSecondCycle = text.includes("2ND") || text.includes("2E CYCLE") || text.includes("LYCEE");
  switch (cycle) {
    case "maternelle":
      return text.includes("MATERNELLE");
    case "primaire":
      return text.includes("PRIMAIRE");
    case "college":
      return text.includes("COLLEGE") && !isSecondCycle;
    case "lycee":
      return text.includes("LYCEE") || isSecondCycle;
    default:
      return false;
  }
}

/* ------------------------------------------------------------------ */
/* Cache de la Grille Tarifaire Officielle                             */
/* ------------------------------------------------------------------ */

// Cache mémoire indexé par école : passer d'un cycle à l'autre ne doit jamais
// réutiliser la grille de l'école précédente.
const presetsCache = new Map<string, GrillePreset[]>();
const inFlight = new Map<string, Promise<GrillePreset[]>>();

function normalizePreset(raw: any): GrillePreset | null {
  if (!raw) return null;
  const tranches: GrilleTranche[] = (Array.isArray(raw.tranches) ? raw.tranches : [])
    .map((t: any) => ({
      libelle: String(t?.libelle || t?.nom || "Versement"),
      montant: Number(t?.montant ?? t?.amount ?? 0) || 0,
      date: t?.date || t?.dateEcheance || undefined,
    }))
    .filter((t: GrilleTranche) => t.montant > 0);

  if (tranches.length === 0) return null;

  const niveaux = Array.isArray(raw.niveaux)
    ? raw.niveaux.map((n: any) => String(n))
    : typeof raw.niveaux === "string" && raw.niveaux
      ? String(raw.niveaux).split(/[,;]/)
      : [];

  return {
    id: String(raw.id ?? raw.preset_id ?? ""),
    label: String(raw.label ?? raw.libelle ?? ""),
    cycle: String(raw.cycle ?? ""),
    niveaux,
    statut_affectation: raw.statut_affectation ?? raw.statut_orientation ?? undefined,
    ecole_id: raw.ecole_id ?? undefined,
    ET_CODEETABLISSEMENT: raw.ET_CODEETABLISSEMENT ?? undefined,
    ville: raw.ville ?? undefined,
    total: Number(raw.total ?? 0) || tranches.reduce((sum, t) => sum + t.montant, 0),
    tranches,
  };
}


export const BUILTIN_DEFAULT_PRESETS: GrillePreset[] = (
  Array.isArray(defaultPresetsData) ? defaultPresetsData : []
)
  .map(normalizePreset)
  .filter(Boolean) as GrillePreset[];

/**
 * Lecture synchrone de la grille de l'école courante : cache mémoire, puis localStorage,
 * avec repli sur la grille tarifaire officielle intégrée (filtrée par école ou ville).
 */
export function getGrillePresets(scopeKey: string = currentSchoolScopeKey()): GrillePreset[] {
  const memoire = presetsCache.get(scopeKey);
  if (memoire && memoire.length > 0) return memoire;
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(storageKeyFor(scopeKey));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed.map(normalizePreset).filter(Boolean) as GrillePreset[];
          if (normalized.length > 0) {
            presetsCache.set(scopeKey, normalized);
            return normalized;
          }
        }
      }
    } catch (e) {
      console.warn("Grille tarifaire : cache local illisible", e);
    }
  }

  // Filtrage par portée école ou ville dans le catalogue officiel complet
  if (scopeKey && scopeKey !== "global") {
    let cluster: SchoolCluster | null = null;
    if (scopeKey.startsWith("ecole-")) {
      const ecoleId = scopeKey.replace("ecole-", "").trim();
      cluster = findSchoolCluster(ecoleId);
      const filtered = BUILTIN_DEFAULT_PRESETS.filter(
        (p) =>
          (p.ecole_id !== undefined && String(p.ecole_id).trim() === ecoleId) ||
          (cluster && cluster.allIds.includes(Number(p.ecole_id)))
      );
      if (filtered.length > 0) return filtered;
    }
    if (scopeKey.startsWith("code-")) {
      const code = scopeKey.replace("code-", "").trim().toUpperCase();
      cluster = findSchoolCluster(null, code);
      const filtered = BUILTIN_DEFAULT_PRESETS.filter(
        (p) =>
          (p.ET_CODEETABLISSEMENT && p.ET_CODEETABLISSEMENT.trim().toUpperCase() === code) ||
          (cluster && cluster.allCodes.some((c) => c.toUpperCase() === (p.ET_CODEETABLISSEMENT || "").trim().toUpperCase()))
      );
      if (filtered.length > 0) return filtered;
    }
    if (scopeKey.startsWith("ville-")) {
      const villeNorm = scopeKey.replace("ville-", "").trim().toLowerCase();
      cluster = findSchoolCluster(null, null, villeNorm);
      const filtered = BUILTIN_DEFAULT_PRESETS.filter(
        (p) =>
          (p.ville && stripAccents(p.ville).trim().toLowerCase() === stripAccents(villeNorm)) ||
          (cluster && stripAccents(cluster.city).trim().toLowerCase() === stripAccents(villeNorm))
      );
      if (filtered.length > 0) return filtered;
    }
  }

  return BUILTIN_DEFAULT_PRESETS;
}

/**
 * Alimente le cache de l'école courante depuis une liste déjà récupérée (espace
 * Échéancier, Économat, processus d'inscription...).
 */
export function setGrillePresets(
  rawPresets: any[],
  scopeKey: string = currentSchoolScopeKey(),
): GrillePreset[] {
  const normalized = (Array.isArray(rawPresets) ? rawPresets : [])
    .map(normalizePreset)
    .filter(Boolean) as GrillePreset[];

  presetsCache.set(scopeKey, normalized);
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(storageKeyFor(scopeKey), JSON.stringify(normalized));
    } catch (e) {
      console.warn("Grille tarifaire : écriture du cache impossible", e);
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(GRILLE_UPDATED_EVENT, { detail: { scopeKey, presets: normalized } }),
    );
  }
  return normalized;
}

/**
 * Charge la grille de l'école courante depuis l'API. Les appels concurrents pour
 * la même école partagent la même requête ; en cas d'échec réseau on conserve le
 * cache déjà connu. La portée école est transmise par les en-têtes X-School-Id /
 * X-School-Code posés par l'intercepteur d'apiClient.
 */
export async function loadGrillePresets(force = false): Promise<GrillePreset[]> {
  const scopeKey = currentSchoolScopeKey();

  const fetchPresets = (repli: GrillePreset[]) => {
    const requete = apiClient
      .getHinnehOfficialPresets()
      .then((data) => setGrillePresets(data || [], scopeKey))
      .catch((e) => {
        console.warn("Grille tarifaire : chargement API impossible", e);
        return repli;
      })
      .finally(() => {
        inFlight.delete(scopeKey);
      });
    inFlight.set(scopeKey, requete);
    return requete;
  };

  const cached = getGrillePresets(scopeKey);
  if (!force && cached.length > 0) {
    // Rafraîchissement silencieux en arrière-plan, sans faire attendre l'appelant.
    if (!inFlight.has(scopeKey)) fetchPresets(cached);
    return cached;
  }

  return inFlight.get(scopeKey) || fetchPresets(cached);
}

/* ------------------------------------------------------------------ */
/* Frais d'Écolage configurés par l'Économat                           */
/* ------------------------------------------------------------------ */

interface FraisEcolageEntry {
  libelle?: string;
  level?: string;
  statutOrientation?: string;
  actif?: boolean;
  tranches?: Array<{ libelle?: string; montant?: number; dateEcheance?: string }>;
}

/**
 * Frais d'Écolage configurés pour l'école courante. Comme la grille dont ils sont
 * issus, ils sont propres à une école : la clé de stockage est donc scopée. On
 * relit l'ancienne clé globale en repli pour ne pas perdre les configurations
 * enregistrées avant cette séparation.
 */
export function readFraisEcolageConfig(
  scopeKey: string = currentSchoolScopeKey(),
): FraisEcolageEntry[] {
  if (typeof localStorage === "undefined") return [];
  const keysToTry = scopeKey && scopeKey !== "global" ? [ecolageKeyFor(scopeKey)] : [ecolageKeyFor(scopeKey), ECOLAGE_STORAGE_PREFIX];
  for (const key of keysToTry) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      console.warn("Frais d'écolage : configuration locale illisible", e);
    }
  }
  return [];
}

/** Enregistre les Frais d'Écolage de l'école courante. */
export function writeFraisEcolageConfig(
  entries: FraisEcolageEntry[],
  scopeKey: string = currentSchoolScopeKey(),
): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(ecolageKeyFor(scopeKey), JSON.stringify(entries));
  } catch (e) {
    console.warn("Frais d'écolage : écriture impossible", e);
  }
}

/**
 * Score d'un palier de frais d'écolage pour un élève. Le champ `level` de
 * l'Économat est tantôt un niveau précis ("CM2"), tantôt un cycle
 * ("Collège (6è-3è)", "Collège 2nd cycle (Affectés)"), tantôt "Tous Niveaux".
 */
function scoreFraisEcolage(
  entry: FraisEcolageEntry,
  eleve: NiveauKey,
  wantAff: boolean,
  strictSerie: boolean,
): number {
  if (entry.actif === false) return -1;
  if (!entry.tranches || entry.tranches.length === 0) return -1;

  const levelText = canon(entry.level);
  let score = -1;

  const niveauxDeclares = String(entry.level || "")
    .split(/[,;/&]/)
    .map((part) => parseNiveau(part))
    .filter((n) => n.niveau);

  const niveauMatch = niveauxDeclares.find((n) => n.niveau === eleve.niveau);
  if (niveauMatch) {
    if (strictSerie && niveauMatch.serie && eleve.serie && niveauMatch.serie !== eleve.serie) {
      return -1;
    }
    score = niveauMatch.serie && niveauMatch.serie === eleve.serie ? 12 : 10;
  } else if (cycleMatches(entry.level, eleve.cycle)) {
    score = 5;
  } else if (levelText.includes("TOUS")) {
    score = 1;
  } else {
    return -1;
  }

  const isMatOrPrim = eleve.cycle === "maternelle" || eleve.cycle === "primaire";
  if (isMatOrPrim) {
    score += 4;
  } else {
    const statut = canon(entry.statutOrientation);
    if (!statut || statut.includes("TOUS")) {
      score += 1;
    } else if (isAffecte(entry.statutOrientation) === wantAff) {
      score += 4;
    } else {
      return -1;
    }
  }

  return score;
}

/* ------------------------------------------------------------------ */
/* Résolution des tranches d'un élève                                  */
/* ------------------------------------------------------------------ */

export interface ResolveEcheancierOptions {
  className: string;
  statutOrientation?: string;
  typeInscription?: string;
  priseEnCharge?: boolean;
  schoolId?: string | number;
  schoolCode?: string;
  city?: string;
}

function scorePreset(
  preset: GrillePreset,
  eleve: NiveauKey,
  wantAff: boolean,
  wantReinscription: boolean,
  strictSerie: boolean,
): number {
  const niveauxDeclares = preset.niveaux.map(parseNiveau).filter((n) => n.niveau);
  let score = -1;

  // Un modèle peut déclarer plusieurs fois le même niveau avec des séries
  // différentes ("5è C", "5è D") : on retient d'abord celle de l'élève.
  const niveauxDuNiveau = niveauxDeclares.filter((n) => n.niveau === eleve.niveau);
  const niveauMatch =
    niveauxDuNiveau.find((n) => n.serie && n.serie === eleve.serie) ||
    niveauxDuNiveau.find((n) => !n.serie) ||
    niveauxDuNiveau[0];

  if (niveauMatch) {
    score = 10;
    if (niveauMatch.serie && eleve.serie) {
      if (niveauMatch.serie === eleve.serie) {
        score += 5;
      } else if (strictSerie) {
        // Un modèle "5è C & 5è D" ne sert pas de base à un 5è A tant qu'un
        // modèle mieux adapté peut encore être trouvé.
        return -1;
      }
    } else if (!niveauMatch.serie) {
      score += 2;
    }
  } else if (niveauxDeclares.length === 0 && cycleMatches(preset.cycle, eleve.cycle)) {
    score = 4;
  } else {
    return -1;
  }

  const isMatOrPrim = eleve.cycle === "maternelle" || eleve.cycle === "primaire";
  if (isMatOrPrim) {
    score += 6;
  } else {
    const statut = presetStatut(preset);
    if (statut === "TOUS") {
      score += 2;
    } else if ((statut === "AFF") === wantAff) {
      score += 6;
    } else {
      return -1;
    }
  }

  // "RÉINSCRIPTION" contient "INSCRIPTION" : le test doit être explicite.
  const identite = canon(`${preset.id} ${preset.label}`);
  const estReinscription = identite.includes("REINSCRIPTION");
  if (wantReinscription === estReinscription) score += 3;

  return score;
}

/**
 * Modèle tarifaire officiel le plus adapté à un élève, ou null.
 * `strictSerie` : refuser un modèle réservé à d'autres séries (5è C/D pour un 5è A).
 */
export function findGrillePresetForStudent(
  options: ResolveEcheancierOptions,
  strictSerie = true,
): GrillePreset | null {
  const cluster = findSchoolCluster(options.schoolId, options.schoolCode, options.city);
  let presets: GrillePreset[] = [];

  if (cluster) {
    presets = getGrillePresets(`ecole-${cluster.canonicalId}`);
    if (presets.length === 0) {
      presets = getGrillePresets(`code-${cluster.canonicalCode}`);
    }
    if (presets.length === 0) {
      presets = getGrillePresets(`ville-${cluster.city.toLowerCase().trim()}`);
    }
  }

  if (presets.length === 0) {
    const scopeKey = scopeKeyForSchool(options.schoolId, options.schoolCode);
    presets = getGrillePresets(scopeKey);
    if (presets.length === 0 && scopeKey !== "global") {
      if (options.schoolCode) {
        presets = getGrillePresets(`code-${options.schoolCode}`);
      }
      if (presets.length === 0 && options.city) {
        presets = getGrillePresets(`ville-${options.city.toLowerCase().trim()}`);
      }
      if (presets.length === 0) {
        presets = getGrillePresets("global");
      }
      if (presets.length === 0) {
        presets = getGrillePresets();
      }
    }
  }
  if (presets.length === 0) return null;

  const eleve = parseNiveau(options.className);
  if (!eleve.niveau) return null;

  const wantAff = isAffecte(options.statutOrientation);
  const wantReinscription = canon(options.typeInscription).includes("REINSCRIPTION");

  // Un élève pris en charge suit son propre modèle s'il en existe un dans la grille.
  if (options.priseEnCharge) {
    const pec = presets.find((p) => {
      const identite = canon(`${p.id} ${p.label}`);
      return identite.includes("PEC") || identite.includes("PRISE EN CHARGE");
    });
    if (pec) return pec;
  }

  let best: GrillePreset | null = null;
  let bestScore = 0;
  for (const preset of presets) {
    const score = scorePreset(preset, eleve, wantAff, wantReinscription, strictSerie);
    // ">" et non ">=" : à score égal on garde l'ordre de la grille (ordre de la base).
    if (score > bestScore) {
      bestScore = score;
      best = preset;
    }
  }

  return best;
}

function findFraisEcolageForStudent(
  eleve: NiveauKey,
  wantAff: boolean,
  strictSerie: boolean,
  schoolId?: string | number,
  schoolCode?: string,
  city?: string,
): EcheancierResolution | null {
  const scopeKey = scopeKeyForSchool(schoolId, schoolCode);
  let entries = readFraisEcolageConfig(scopeKey);
  if (entries.length === 0 && scopeKey !== "global") {
    if (schoolCode) entries = readFraisEcolageConfig(`code-${schoolCode}`);
    if (entries.length === 0 && city) entries = readFraisEcolageConfig(`ville-${city.toLowerCase().trim()}`);
    if (entries.length === 0) entries = readFraisEcolageConfig("global");
    if (entries.length === 0) entries = readFraisEcolageConfig();
  }

  let best: FraisEcolageEntry | null = null;
  let bestScore = 0;
  for (const entry of entries) {
    const score = scoreFraisEcolage(entry, eleve, wantAff, strictSerie);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  if (!best) return null;

  const tranches = (best.tranches || [])
    .map((t, idx) => ({
      libelle: String(t.libelle || `Versement ${idx + 1}`),
      montant: Number(t.montant) || 0,
      date: t.dateEcheance || undefined,
    }))
    .filter((t) => t.montant > 0);

  if (tranches.length === 0) return null;
  return { source: "ecolage", label: String(best.libelle || "Frais d'écolage"), tranches };
}

/**
 * Tranches réelles d'un élève : grille officielle d'abord, frais d'écolage de
 * l'Économat ensuite. Renvoie une liste vide si aucune source ne le couvre.
 *
 * Deux passes : la première exige que la série de la classe corresponde, la
 * seconde relâche cette exigence pour qu'un 1ère B ne se retrouve pas sans tarif
 * quand la grille ne détaille que les séries A, C et D. Dans les deux cas les
 * montants viennent de l'école, jamais d'un barème codé en dur.
 */
export function resolveEcheancierForStudent(
  options: ResolveEcheancierOptions,
): EcheancierResolution {
  const eleve = parseNiveau(options.className);
  if (!eleve.niveau) return { source: "aucune", label: "", tranches: [] };

  const wantAff = isAffecte(options.statutOrientation);

  for (const strictSerie of [true, false]) {
    const preset = findGrillePresetForStudent(options, strictSerie);
    if (preset) {
      return { source: "grille", label: preset.label, tranches: preset.tranches };
    }
    const ecolage = findFraisEcolageForStudent(
      eleve,
      wantAff,
      strictSerie,
      options.schoolId,
      options.schoolCode,
      options.city,
    );
    if (ecolage) return ecolage;
  }

  return { source: "aucune", label: "", tranches: [] };
}
