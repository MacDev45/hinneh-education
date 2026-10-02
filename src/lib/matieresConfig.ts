/**
 * matieresConfig.ts
 *
 * Paramétrage des matières et de leurs coefficients par niveau et par série
 * (Série A, Série C, Série D, filière Arabe, Autre). Chaque matière est en
 * outre rattachée à un groupe pédagogique (Littéraire, Scientifique, Arabe,
 * Autre) utilisé pour les totaux par groupe des bulletins.
 *
 * Suit la même philosophie que grilleTarifaire.ts : rien n'est codé en dur
 * dans les écrans qui consomment ce module — un barème par défaut est fourni
 * ici pour amorcer l'application, mais tout est ensuite personnalisable et
 * persisté par établissement depuis Paramètres > Matières & Coefficients.
 */

import { parseNiveau, scopeKeyForSchool, currentSchoolScopeKey } from "@/lib/grilleTarifaire";

export type GroupeMatiere = "litteraire" | "scientifique" | "arabe" | "autre";

export interface GroupeMatiereInfo {
  id: GroupeMatiere;
  libelle: string;
  /** Classe Tailwind (badge) utilisée dans les écrans de paramétrage. */
  classeBadge: string;
}

export const GROUPES_MATIERES: GroupeMatiereInfo[] = [
  { id: "litteraire", libelle: "Littéraire", classeBadge: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" },
  { id: "scientifique", libelle: "Scientifique", classeBadge: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" },
  { id: "arabe", libelle: "Arabe / Confessionnel", classeBadge: "bg-gray-100 text-gray-700 dark:bg-gray-950/60 dark:text-gray-300" },
  { id: "autre", libelle: "Autre", classeBadge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
];

export function libelleGroupeMatiere(groupe: GroupeMatiere): string {
  return GROUPES_MATIERES.find((g) => g.id === groupe)?.libelle || "Autre";
}

/**
 * "COMMUN" : niveau sans filière (Maternelle â†’ Seconde). "AUTRE" : série
 * lycée choisie mais non A / C / D / Arabe (filières techniques, B, etc., ou
 * série non précisée dans le libellé de la classe).
 */
export type SerieCode = "COMMUN" | "A" | "C" | "D" | "ARABE" | "AUTRE";

export interface SerieInfo {
  id: SerieCode;
  libelle: string;
  description: string;
}

export const SERIES: SerieInfo[] = [
  { id: "COMMUN", libelle: "Tronc commun", description: "Maternelle, Primaire et Collège : pas de filière (ou tronc commun)." },
  { id: "A", libelle: "Série A — Littéraire", description: "Lettres, Français, Langues et Philosophie dominantes." },
  { id: "C", libelle: "Série C — Scientifique (Maths-Physique)", description: "Mathématiques et Sciences Physiques dominantes." },
  { id: "D", libelle: "Série D — Scientifique (Maths-Bio)", description: "Mathématiques et Sciences de la Vie et de la Terre dominantes." },
  { id: "ARABE", libelle: "Filière Arabe / Confessionnelle", description: "Programme arabo-islamique (Arabe, Éducation Islamique, Coran)." },
  { id: "AUTRE", libelle: "Autre série", description: "Séries techniques (B, E, F, G…) ou filière non précisée." },
];

export function libelleSerie(serie: SerieCode): string {
  return SERIES.find((s) => s.id === serie)?.libelle || serie;
}

/** Niveaux (codes canoniques de parseNiveau) où le choix d'une série s'applique. */
export const NIVEAUX_AVEC_SERIE = new Set(["2NDE", "1ERE", "TLE"]);

export function niveauSupporteSerie(niveauCode: string): boolean {
  return NIVEAUX_AVEC_SERIE.has(niveauCode);
}

export interface MatiereCoefficient {
  id: string;
  matiere: string;
  groupe: GroupeMatiere;
  coefficient: number;
  ordre: number;
  actif: boolean;
}

/* ------------------------------------------------------------------ */
/* Normalisation des niveaux et des noms de matières                   */
/* ------------------------------------------------------------------ */

const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

function normaliserTexte(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toUpperCase()
    .trim();
}

/** Convertit un libellé de niveau ("Terminale", "1ère", "CM2"…) en code canonique. */
export function normaliserNiveauCode(niveauLabel: string): string {
  return parseNiveau(niveauLabel).niveau;
}

/** Clé stable pour comparer deux noms de matière indépendamment des accents/casse. */
function cleMatiere(nom: string): string {
  return normaliserTexte(nom).replace(/[^A-Z0-9]+/g, " ").trim();
}

/**
 * Déduit le niveau et la série d'une classe à partir de son nom ("Tle C1",
 * "1ère D", "6ème A", "Terminale Arabe"…) ou de son champ niveau. Retombe sur
 * "AUTRE" quand le niveau porte une série (1ère/Tle) mais qu'aucune lettre
 * n'est reconnaissable dans le libellé — la filière existe forcément à ce
 * niveau, elle n'est simplement pas explicite dans le nom de classe.
 */
export function resolveNiveauSerieFromClasse(
  classe: string | { name?: string; niveau?: string; nom?: string } | null | undefined,
): { niveauCode: string; serie: SerieCode } {
  const text =
    typeof classe === "string" ? classe : classe?.name || classe?.niveau || classe?.nom || "";
  const parsed = parseNiveau(text);
  const niveauCode = parsed.niveau || "";
  if (!niveauCode) return { niveauCode: "", serie: "COMMUN" };
  if (!niveauSupporteSerie(niveauCode)) return { niveauCode, serie: "COMMUN" };

  const canon = normaliserTexte(text);
  if (/ARABE|CORAN/.test(canon)) return { niveauCode, serie: "ARABE" };

  // parseNiveau ne reconnaît qu'une lettre isolée (" C") ; on tolère aussi les
  // sections numérotées d'une même série ("C1", "C2", "D3"…).
  const tokens = canon.split(/\s+/).filter(Boolean);
  const serieToken = parsed.serie || tokens.find((t) => /^[ACD]\d{0,2}$/.test(t))?.[0];
  if (serieToken === "A" || serieToken === "C" || serieToken === "D") return { niveauCode, serie: serieToken };
  return { niveauCode, serie: "AUTRE" };
}

/* ------------------------------------------------------------------ */
/* Barèmes par défaut                                                  */
/* ------------------------------------------------------------------ */

let seq = 0;
function item(matiere: string, groupe: GroupeMatiere, coefficient: number): MatiereCoefficient {
  seq += 1;
  return { id: `def-${seq}`, matiere, groupe, coefficient, ordre: seq, actif: true };
}

const MATERNELLE: MatiereCoefficient[] = [
  item("Langage et Expression Orale", "litteraire", 2),
  item("Graphisme et Écriture", "litteraire", 2),
  item("Éveil et Découverte du Monde", "scientifique", 2),
  item("Activités Pré-Mathématiques", "scientifique", 2),
  item("Éducation Islamique / Arabe Initiation", "arabe", 1),
  item("Activités Manuelles et Artistiques", "autre", 1),
  item("Motricité / EPS", "autre", 1),
];

const PRIMAIRE: MatiereCoefficient[] = [
  item("Français / Lecture-Écriture", "litteraire", 4),
  item("Expression Écrite", "litteraire", 2),
  item("Histoire-Géographie / EDHC", "litteraire", 2),
  item("Anglais Initiation", "litteraire", 1),
  item("Mathématiques", "scientifique", 4),
  item("Sciences d'Observation", "scientifique", 2),
  item("Arabe", "arabe", 2),
  item("Éducation Islamique", "arabe", 1),
  item("Coran / Tajwid", "arabe", 2),
  item("EPS", "autre", 1),
  item("Éducation Artistique", "autre", 1),
];

const COLLEGE: MatiereCoefficient[] = [
  item("Français", "litteraire", 4),
  item("Anglais", "litteraire", 3),
  item("Histoire-Géographie", "litteraire", 2),
  item("EDHC", "litteraire", 1),
  item("Mathématiques", "scientifique", 4),
  item("Physique-Chimie", "scientifique", 2),
  item("SVT", "scientifique", 2),
  item("Arabe", "arabe", 2),
  item("Éducation Islamique", "arabe", 1),
  item("Coran / Tajwid", "arabe", 2),
  item("EPS", "autre", 1),
  item("Informatique / TICE", "autre", 1),
];

const LYCEE_COMMUN: MatiereCoefficient[] = [
  item("Français", "litteraire", 4),
  item("Anglais", "litteraire", 3),
  item("Histoire-Géographie", "litteraire", 3),
  item("EDHC", "litteraire", 1),
  item("Mathématiques", "scientifique", 4),
  item("Physique-Chimie", "scientifique", 3),
  item("SVT", "scientifique", 3),
  item("Arabe", "arabe", 2),
  item("Éducation Islamique", "arabe", 1),
  item("Coran / Tajwid", "arabe", 2),
  item("EPS", "autre", 1),
];

const LYCEE_SERIE_A: MatiereCoefficient[] = [
  item("Philosophie", "litteraire", 4),
  item("Français", "litteraire", 4),
  item("Histoire-Géographie", "litteraire", 4),
  item("Anglais", "litteraire", 4),
  item("Langue Vivante 2", "litteraire", 3),
  item("Mathématiques", "scientifique", 2),
  item("Physique-Chimie", "scientifique", 2),
  item("SVT", "scientifique", 2),
  item("EDHC", "autre", 1),
  item("EPS", "autre", 1),
];

const LYCEE_SERIE_C: MatiereCoefficient[] = [
  item("Mathématiques", "scientifique", 6),
  item("Physique-Chimie", "scientifique", 6),
  item("SVT", "scientifique", 3),
  item("Philosophie", "litteraire", 2),
  item("Français", "litteraire", 2),
  item("Anglais", "litteraire", 2),
  item("Histoire-Géographie", "litteraire", 2),
  item("EDHC", "autre", 1),
  item("EPS", "autre", 1),
];

const LYCEE_SERIE_D: MatiereCoefficient[] = [
  item("Mathématiques", "scientifique", 4),
  item("SVT", "scientifique", 4),
  item("Physique-Chimie", "scientifique", 4),
  item("Philosophie", "litteraire", 2),
  item("Français", "litteraire", 2),
  item("Anglais", "litteraire", 2),
  item("Histoire-Géographie", "litteraire", 2),
  item("EDHC", "autre", 1),
  item("EPS", "autre", 1),
];

const LYCEE_SERIE_ARABE: MatiereCoefficient[] = [
  item("Arabe (Langue)", "arabe", 5),
  item("Éducation Islamique / Charia", "arabe", 4),
  item("Coran / Tajwid", "arabe", 4),
  item("Français", "litteraire", 3),
  item("Mathématiques", "scientifique", 2),
  item("Histoire-Géographie", "litteraire", 2),
  item("Anglais", "litteraire", 2),
  item("EPS", "autre", 1),
];

const SECONDE_SERIE_A: MatiereCoefficient[] = [
  item("Français", "litteraire", 5),
  item("Anglais", "litteraire", 4),
  item("Histoire-Géographie", "litteraire", 3),
  item("Mathématiques", "scientifique", 3),
  item("Langue Vivante 2", "litteraire", 3),
  item("Physique-Chimie", "scientifique", 2),
  item("SVT", "scientifique", 2),
  item("EDHC", "autre", 1),
  item("EPS", "autre", 1),
];

const SECONDE_SERIE_C: MatiereCoefficient[] = [
  item("Mathématiques", "scientifique", 5),
  item("Physique-Chimie", "scientifique", 4),
  item("SVT", "scientifique", 3),
  item("Français", "litteraire", 3),
  item("Anglais", "litteraire", 2),
  item("Histoire-Géographie", "litteraire", 2),
  item("EDHC", "autre", 1),
  item("EPS", "autre", 1),
];

const LYCEE_SERIE_AUTRE: MatiereCoefficient[] = [
  item("Français", "litteraire", 3),
  item("Mathématiques", "scientifique", 3),
  item("Anglais", "litteraire", 2),
  item("Histoire-Géographie", "litteraire", 2),
  item("Physique-Chimie", "scientifique", 2),
  item("SVT", "scientifique", 2),
  item("Arabe", "arabe", 2),
  item("EPS", "autre", 1),
];

const NIVEAUX_MATERNELLE = new Set(["MPS", "MMS", "MGS"]);
const NIVEAUX_PRIMAIRE = new Set(["CP1", "CP2", "CE1", "CE2", "CM1", "CM2"]);
const NIVEAUX_COLLEGE = new Set(["6EME", "5EME", "4EME", "3EME"]);

function defautsPour(niveauCode: string, serie: SerieCode): MatiereCoefficient[] {
  if (NIVEAUX_MATERNELLE.has(niveauCode)) return MATERNELLE;
  if (NIVEAUX_PRIMAIRE.has(niveauCode)) return PRIMAIRE;
  if (NIVEAUX_COLLEGE.has(niveauCode)) return COLLEGE;
  if (niveauCode === "2NDE") {
    if (serie === "A") return SECONDE_SERIE_A;
    if (serie === "C") return SECONDE_SERIE_C;
    if (serie === "D") return LYCEE_SERIE_D;
    if (serie === "ARABE") return LYCEE_SERIE_ARABE;
    if (serie === "AUTRE") return LYCEE_SERIE_AUTRE;
    return LYCEE_COMMUN;
  }
  if (niveauSupporteSerie(niveauCode)) {
    if (serie === "A") return LYCEE_SERIE_A;
    if (serie === "C") return LYCEE_SERIE_C;
    if (serie === "D") return LYCEE_SERIE_D;
    if (serie === "ARABE") return LYCEE_SERIE_ARABE;
    return LYCEE_SERIE_AUTRE;
  }
  return COLLEGE;
}

/** Copie profonde avec de nouveaux identifiants, pour ne jamais partager les objets par défaut. */
function cloneDefauts(source: MatiereCoefficient[]): MatiereCoefficient[] {
  return source.map((m, idx) => ({ ...m, id: `${m.id}-${idx}` }));
}

export function getDefaultMatieres(niveauLabelOrCode: string, serie: SerieCode = "COMMUN"): MatiereCoefficient[] {
  const niveauCode = normaliserNiveauCode(niveauLabelOrCode) || niveauLabelOrCode;
  return cloneDefauts(defautsPour(niveauCode, serie));
}

/* ------------------------------------------------------------------ */
/* Persistance (localStorage, portée par établissement)                */
/* ------------------------------------------------------------------ */

const STORAGE_PREFIX = "matieres_coefficients";
export const MATIERES_UPDATED_EVENT = "matieres_coefficients_updated";

function storageKey(scopeKey: string, niveauCode: string, serie: SerieCode): string {
  return `${STORAGE_PREFIX}__${scopeKey}__${niveauCode || "INCONNU"}__${serie}`;
}

function resolveScopeKey(ecoleId?: number | string | null, code?: string | null): string {
  return ecoleId !== undefined || code !== undefined
    ? scopeKeyForSchool(ecoleId ?? null, code ?? null)
    : currentSchoolScopeKey();
}

/**
 * Retourne la liste des matières et coefficients configurés pour un niveau et
 * une série donnés. Si rien n'a encore été personnalisé pour cet
 * établissement, le barème par défaut est renvoyé (mais pas enregistré :
 * l'écran de paramétrage doit explicitement enregistrer pour le figer).
 */
export function getMatieresConfig(
  niveauLabelOrCode: string,
  serie: SerieCode = "COMMUN",
  ecoleId?: number | string | null,
  code?: string | null,
): MatiereCoefficient[] {
  const niveauCode = normaliserNiveauCode(niveauLabelOrCode) || niveauLabelOrCode;
  if (typeof localStorage === "undefined") return getDefaultMatieres(niveauCode, serie);

  try {
    const scopeKey = resolveScopeKey(ecoleId, code);
    const raw = localStorage.getItem(storageKey(scopeKey, niveauCode, serie));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Erreur lors de la lecture du paramétrage des matières :", e);
  }
  return getDefaultMatieres(niveauCode, serie);
}

export function saveMatieresConfig(
  niveauLabelOrCode: string,
  serie: SerieCode,
  items: MatiereCoefficient[],
  ecoleId?: number | string | null,
  code?: string | null,
): MatiereCoefficient[] {
  const niveauCode = normaliserNiveauCode(niveauLabelOrCode) || niveauLabelOrCode;
  if (typeof localStorage !== "undefined") {
    try {
      const scopeKey = resolveScopeKey(ecoleId, code);
      localStorage.setItem(storageKey(scopeKey, niveauCode, serie), JSON.stringify(items));
      window.dispatchEvent(
        new CustomEvent(MATIERES_UPDATED_EVENT, { detail: { niveauCode, serie, items, ecoleId, code } }),
      );
    } catch (e) {
      console.error("Erreur lors de l'enregistrement du paramétrage des matières :", e);
    }
  }
  return items;
}

export function resetMatieresConfig(
  niveauLabelOrCode: string,
  serie: SerieCode,
  ecoleId?: number | string | null,
  code?: string | null,
): MatiereCoefficient[] {
  const niveauCode = normaliserNiveauCode(niveauLabelOrCode) || niveauLabelOrCode;
  if (typeof localStorage !== "undefined") {
    try {
      const scopeKey = resolveScopeKey(ecoleId, code);
      localStorage.removeItem(storageKey(scopeKey, niveauCode, serie));
      window.dispatchEvent(
        new CustomEvent(MATIERES_UPDATED_EVENT, { detail: { niveauCode, serie, reset: true, ecoleId, code } }),
      );
    } catch (e) {
      console.error("Erreur lors de la réinitialisation du paramétrage des matières :", e);
    }
  }
  return getDefaultMatieres(niveauCode, serie);
}

/* ------------------------------------------------------------------ */
/* Consommation côté calcul des moyennes / bulletins                   */
/* ------------------------------------------------------------------ */

/**
 * Recherche une matière (par nom, insensible aux accents/casse) dans une
 * liste déjà chargée en mémoire — à utiliser quand plusieurs matières d'un
 * même niveau/série doivent être résolues d'affilée (boucle sur des
 * évaluations), pour ne lire le localStorage qu'une seule fois via
 * `getMatieresConfig` en amont.
 */
export function trouverMatiereDansListe(
  liste: MatiereCoefficient[],
  matiereName: string,
): MatiereCoefficient | undefined {
  const cible = cleMatiere(matiereName);
  if (!cible) return undefined;
  return liste.find((m) => cleMatiere(m.matiere) === cible);
}

/**
 * Coefficient configuré pour une matière donnée à un niveau/série donnés.
 * Retourne `undefined` si le niveau n'a pas encore été paramétré ou si la
 * matière n'y figure pas (ou y est désactivée) — à l'appelant de retomber
 * sur son propre défaut plutôt que d'inventer une valeur ici.
 */
export function getCoefficientMatiere(
  matiereName: string,
  niveauLabelOrCode: string,
  serie: SerieCode = "COMMUN",
  ecoleId?: number | string | null,
  code?: string | null,
): number | undefined {
  const liste = getMatieresConfig(niveauLabelOrCode, serie, ecoleId, code);
  const found = trouverMatiereDansListe(liste, matiereName);
  return found?.actif ? found.coefficient : undefined;
}

export function getGroupeMatiereConfigure(
  matiereName: string,
  niveauLabelOrCode: string,
  serie: SerieCode = "COMMUN",
  ecoleId?: number | string | null,
  code?: string | null,
): GroupeMatiere | undefined {
  const liste = getMatieresConfig(niveauLabelOrCode, serie, ecoleId, code);
  return trouverMatiereDansListe(liste, matiereName)?.groupe;
}

/**
 * Recalcule la moyenne générale pondérée et le détail par matière selon le barème
 * et les coefficients réels d'une classe / série cible.
 */
export function recalculateWeightedAverage(
  evaluations: Array<{ matiere: string; note: number; coefficient?: number }>,
  targetNiveau: string,
  targetSerie: SerieCode = "COMMUN",
  ecoleId?: number | string | null,
  code?: string | null,
) {
  const configMatieres = getMatieresConfig(targetNiveau, targetSerie, ecoleId, code);

  const subjectGroups: Record<string, { notes: number[]; coeff: number }> = {};
  evaluations.forEach((ev) => {
    const rawMatiere = ev.matiere || "Matière";
    if (!subjectGroups[rawMatiere]) {
      const conf = trouverMatiereDansListe(configMatieres, rawMatiere);
      subjectGroups[rawMatiere] = {
        notes: [],
        coeff: conf && conf.actif ? conf.coefficient : (ev.coefficient || 1),
      };
    }
    subjectGroups[rawMatiere].notes.push(Number(ev.note || 0));
  });

  let totalPoints = 0;
  let totalCoeffs = 0;
  const subjectsBreakdown: Array<{
    matiere: string;
    noteMoyenne: number;
    coefficient: number;
    points: number;
  }> = [];

  Object.entries(subjectGroups).forEach(([matiere, data]) => {
    const sumNotes = data.notes.reduce((a, b) => a + b, 0);
    const avgNote = data.notes.length > 0 ? sumNotes / data.notes.length : 0;
    const roundedAvg = Math.round(avgNote * 100) / 100;
    const points = Math.round(roundedAvg * data.coeff * 100) / 100;
    totalPoints += points;
    totalCoeffs += data.coeff;
    subjectsBreakdown.push({
      matiere,
      noteMoyenne: roundedAvg,
      coefficient: data.coeff,
      points,
    });
  });

  const generalAverage = totalCoeffs > 0 ? Math.round((totalPoints / totalCoeffs) * 100) / 100 : 0;

  return {
    moyenne: generalAverage,
    totalPoints: Math.round(totalPoints * 100) / 100,
    totalCoeffs,
    subjects: subjectsBreakdown,
  };
}

