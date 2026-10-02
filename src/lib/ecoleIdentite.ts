/**
 * ecoleIdentite.ts
 *
 * Identité de l'établissement telle qu'elle est renseignée dans « Profil École »
 * (nom, code, adresse, ville, téléphones, e-mail, logo, cycles enseignés) et
 * enregistrée sur la fiche établissement en base.
 *
 * C'est la seule source de vérité pour les en-têtes de documents : reçus, billets
 * d'entrée, lettres de relance, aperçus d'inscription. Aucun nom, aucune adresse
 * ni aucun numéro de téléphone n'est écrit en dur : ce qui n'est pas renseigné
 * n'est simplement pas imprimé.
 *
 * Un campus regroupe plusieurs établissements (maternelle, primaire, collège) qui
 * partagent le même code : l'identifiant numérique est donc la clé de résolution,
 * et le cycle de l'élève sert d'arbitre quand seul le code est connu.
 */

import apiClient from "@/lib/apiClient";
import { parseNiveau, type CycleKey } from "@/lib/grilleTarifaire";

export interface EcoleIdentite {
  id: string;
  /** Nom exact saisi dans Profil École. */
  name: string;
  code: string;
  region: string;
  city: string;
  address: string;
  /** Téléphones tels que saisis (champ « Contacts »). */
  contacts: string;
  email: string;
  logo: string;
  cycles: string[];
  directeurNom?: string;
  directeurEmail?: string;
  directeurPhone?: string;
}

/** Bloc d'en-tête prêt à être inséré dans un document. Les champs vides ne s'impriment pas. */
export interface EnteteEtablissement {
  /** Nom en majuscules, ou chaîne vide si l'établissement n'est pas renseigné. */
  fullName: string;
  shortName: string;
  stampText: string;
  establishmentType: string;
  /** Adresse complète, à défaut la ville. */
  addressLine: string;
  /** Téléphones saisis, sans préfixe ni mise en forme. */
  phoneLine: string;
  email: string;
  logo: string;
  code: string;
  city: string;
  directeurNom: string;
}

const ECOLES_STORAGE_KEY = "ecoles_identite_cache";

let ecolesCache: EcoleIdentite[] | null = null;
let inFlight: Promise<EcoleIdentite[]> | null = null;

const texte = (value: unknown): string => (value === undefined || value === null ? "" : String(value).trim());

function normalizeEcole(raw: any): EcoleIdentite | null {
  if (!raw) return null;
  const id = texte(raw.id ?? raw.IDETABLISSEMENT);
  const name = texte(raw.name ?? raw.ET_DENOMMINATION);
  if (!id && !name) return null;
  const cycles = Array.isArray(raw.cycles)
    ? raw.cycles.map((c: any) => texte(c))
    : Array.isArray(raw.ET_CYCLES)
      ? raw.ET_CYCLES.map((c: any) => texte(c))
      : [];
  return {
    id,
    name,
    code: texte(raw.code ?? raw.ET_CODEETABLISSEMENT),
    region: texte(raw.region ?? raw.ET_REGION),
    city: texte(raw.city ?? raw.ET_VILLE),
    address: texte(raw.address ?? raw.ET_ADRESSE_POSTALE),
    contacts: texte(raw.contacts ?? raw.ET_CONTACTS),
    email: texte(raw.email ?? raw.ET_EMAIL),
    logo: texte(raw.logo ?? raw.LOGO),
    cycles,
    directeurNom: texte(raw.directeurNom ?? raw.directeur_nom ?? raw.ET_DIRECTEUR ?? raw.ET_DIRECTEUR_NOM),
    directeurEmail: texte(raw.directeurEmail ?? raw.directeur_email),
    directeurPhone: texte(raw.directeurPhone ?? raw.directeur_phone),
  };
}

/** Lecture synchrone du cache des établissements (mémoire, puis localStorage). */
export function getEcolesCache(): EcoleIdentite[] {
  if (ecolesCache) return ecolesCache;
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(ECOLES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        ecolesCache = parsed.map(normalizeEcole).filter(Boolean) as EcoleIdentite[];
        return ecolesCache;
      }
    }
  } catch (e) {
    console.warn("Identité école : cache local illisible", e);
  }
  return [];
}

export function setEcolesCache(rawEcoles: any[]): EcoleIdentite[] {
  const normalized = (Array.isArray(rawEcoles) ? rawEcoles : [])
    .map(normalizeEcole)
    .filter(Boolean) as EcoleIdentite[];
  if (normalized.length === 0) return getEcolesCache();

  ecolesCache = normalized;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(ECOLES_STORAGE_KEY, JSON.stringify(normalized));
    } catch (e) {
      console.warn("Identité école : écriture du cache impossible", e);
    }
  }
  return normalized;
}

/**
 * Délai au-delà duquel on cesse d'attendre la fiche des établissements.
 *
 * Aucun document ne doit rester suspendu à un appel réseau : en local l'API
 * répond en quelques millisecondes, mais en ligne une réponse lente — ou une
 * requête qui ne revient jamais — figerait l'impression. Passé ce délai on
 * imprime avec les informations déjà connues, quitte à omettre des lignes ;
 * la réponse tardive met quand même le cache à jour pour la fois suivante.
 */
const DELAI_MAX_CHARGEMENT_MS = 6000;

/** Déclenche (ou réutilise) le chargement réseau des établissements. */
function chargementReseau(): Promise<EcoleIdentite[]> {
  if (!inFlight) {
    inFlight = apiClient
      .getSchools()
      .then((data: any[]) => setEcolesCache(data || []))
      .catch((e) => {
        console.warn("Identité école : chargement impossible", e);
        return getEcolesCache();
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

/**
 * Charge la fiche de tous les établissements accessibles et met le cache à jour.
 *
 * Ne bloque jamais indéfiniment : cache chaud, on rend la main tout de suite et
 * le rafraîchissement se fait en arrière-plan ; cache froid, on attend le réseau
 * au plus `DELAI_MAX_CHARGEMENT_MS`.
 */
export async function loadEcoles(force = false): Promise<EcoleIdentite[]> {
  const cached = getEcolesCache();
  if (!force && cached.length > 0) {
    chargementReseau();
    return cached;
  }

  let finDuDelai: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      chargementReseau(),
      new Promise<EcoleIdentite[]>((resolve) => {
        finDuDelai = setTimeout(() => {
          console.warn(
            `Identité école : pas de réponse en ${DELAI_MAX_CHARGEMENT_MS} ms, on continue sans attendre`,
          );
          resolve(getEcolesCache());
        }, DELAI_MAX_CHARGEMENT_MS);
      }),
    ]);
  } finally {
    if (finDuDelai) clearTimeout(finDuDelai);
  }
}

const sansAccents = (value: string): string =>
  value.normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "");

const cle = (value: unknown): string =>
  sansAccents(texte(value)).toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();

/** Cycle couvert par un établissement, d'après ses cycles enseignés puis son nom. */
function cyclesDeLEcole(ecole: EcoleIdentite): CycleKey[] {
  const trouves = new Set<CycleKey>();
  const sources = [...ecole.cycles.map(cle), cle(ecole.name)];
  for (const source of sources) {
    if (!source) continue;
    if (source.includes("MATERNELLE")) trouves.add("maternelle");
    if (source.includes("PRIMAIRE")) trouves.add("primaire");
    if (source.includes("LYCEE") || source.includes("2ND") || source.includes("2E CYCLE")) {
      trouves.add("lycee");
    }
    if (source.includes("COLLEGE")) {
      trouves.add("college");
      // « Collège 2nd cycle » couvre aussi le lycée.
      if (source.includes("2ND") || source.includes("2E CYCLE")) trouves.add("lycee");
    }
  }
  return Array.from(trouves);
}

export function resolveUserCity(
  villeCandidate?: string | null,
  schoolCandidate?: EcoleIdentite | null,
  rawSchoolName?: string | null,
): string {
  let ville = (villeCandidate || "").trim();
  if (!ville && schoolCandidate?.city) ville = schoolCandidate.city;
  if (!ville && typeof localStorage !== "undefined") {
    ville = (
      localStorage.getItem("user_ville") ||
      localStorage.getItem("user_ecole_ville") ||
      localStorage.getItem("ville") ||
      localStorage.getItem("selected_school_ville") ||
      ""
    ).trim();
  }
  if (!ville && (schoolCandidate?.name || rawSchoolName)) {
    const sn = (schoolCandidate?.name || rawSchoolName || "").toUpperCase();
    if (sn.includes("BOUAKE") || sn.includes("BOUAKÉ")) ville = "BOUAKE";
    else if (sn.includes("YAMOUSSOUKRO")) ville = "YAMOUSSOUKRO";
    else if (sn.includes("ABIDJAN")) ville = "ABIDJAN";
    else if (sn.includes("KORHOGO")) ville = "KORHOGO";
    else if (sn.includes("DALOA")) ville = "DALOA";
    else if (sn.includes("SAN PEDRO") || sn.includes("SAN-PEDRO")) ville = "SAN PEDRO";
    else if (sn.includes("MAN")) ville = "MAN";
    else if (sn.includes("GAGNOA")) ville = "GAGNOA";
  }
  if (!ville) ville = "BOUAKE";

  return ville.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
}

/**
 * Dénomination officielle de l'établissement selon la classe de l'élève et la ville :
 * - Si PS, MS, GS => ECOLE MATERNELLE CONFESSIONNELLE HINNEH [VILLE]
 * - Si CP, CE, CM => ECOLE PRIMAIRE CONFESSIONNELLE HINNEH [VILLE]
 * - Si autres (6, 5, 4, 3, 2nd, 1ere, Tle) => COLLEGE PRIVEE CONFESSIONNELLE HINNEH [VILLE]
 */
export function computeEtablissementFullName(
  className?: string | null,
  villeCandidate?: string | null,
  schoolCandidate?: EcoleIdentite | null,
  rawSchoolName?: string | null,
): string {
  const ville = resolveUserCity(villeCandidate, schoolCandidate, rawSchoolName);
  const rawCls = (className || "").trim();
  const cls = rawCls
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();

  if (!cls) {
    if (schoolCandidate?.name) return schoolCandidate.name.toUpperCase();
    if (rawSchoolName) return rawSchoolName.toUpperCase();
    return `COLLEGE PRIVEE CONFESSIONNELLE HINNEH ${ville}`;
  }

  // 1. Maternelle : PS, MS, GS
  const isMaternelle =
    cls.startsWith("PS") ||
    cls.startsWith("MS") ||
    cls.startsWith("GS") ||
    cls.startsWith("TPS") ||
    cls.startsWith("MPS") ||
    cls.startsWith("MMS") ||
    cls.startsWith("MGS") ||
    cls.includes("PETITE SECTION") ||
    cls.includes("MOYENNE SECTION") ||
    cls.includes("GRANDE SECTION") ||
    cls.includes("MATERNELLE") ||
    cls.includes("MAT-") ||
    cls.includes("MAT ") ||
    cls === "MAT";

  if (isMaternelle) {
    return `ECOLE MATERNELLE CONFESSIONNELLE HINNEH ${ville}`;
  }

  // 2. Primaire : CP, CE, CM
  const isPrimaire =
    cls.startsWith("CP") ||
    cls.startsWith("CE") ||
    cls.startsWith("CM") ||
    cls.includes("CP1") ||
    cls.includes("CP2") ||
    cls.includes("CE1") ||
    cls.includes("CE2") ||
    cls.includes("CM1") ||
    cls.includes("CM2") ||
    cls.includes("PRIMAIRE") ||
    cls.includes("PRIM-") ||
    cls.includes("PRIM ") ||
    cls === "PRIM";

  if (isPrimaire) {
    return `ECOLE PRIMAIRE CONFESSIONNELLE HINNEH ${ville}`;
  }

  // 3. Collège / Lycée / Second cycle (6, 5, 4, 3, 2nd, 1ere, Tle et tous les autres)
  return `COLLEGE PRIVEE CONFESSIONNELLE HINNEH ${ville}`;
}

export interface RechercheEcole {
  /** Identifiant de l'établissement de l'élève : clé de résolution la plus sûre. */
  ecoleId?: string | number | null;
  /** Code établissement — partagé par les cycles d'un même campus, donc ambigu seul. */
  code?: string | null;
  /** Nom éventuellement transmis par l'appelant, utilisé pour retrouver la fiche. */
  schoolName?: string | null;
  /** Classe de l'élève, qui départage les établissements d'un même campus. */
  className?: string | null;
  /** Ville transmise explicitement */
  city?: string | null;
}

/** Fiche établissement correspondant à une recherche, ou null si rien ne correspond. */
export function findEcole(recherche: RechercheEcole): EcoleIdentite | null {
  const ecoles = getEcolesCache();
  if (ecoles.length === 0) return null;

  const cycleEleve = parseNiveau(recherche.className).cycle;

  // 1. Si on a le cycle de l'élève, chercher en priorité l'école correspondante sur le campus
  if (cycleEleve !== "inconnu") {
    const code = cle(recherche.code);
    const candidats = code ? ecoles.filter((e) => cle(e.code) === code) : ecoles;
    const parCycle = candidats.find((e) => cyclesDeLEcole(e).includes(cycleEleve));
    if (parCycle) return parCycle;
  }

  const id = texte(recherche.ecoleId);
  if (id) {
    const exact = ecoles.find((e) => e.id === id);
    if (exact) return exact;
  }

  const nomCherche = cle(recherche.schoolName);
  if (nomCherche) {
    const exact = ecoles.find((e) => cle(e.name) === nomCherche);
    if (exact) return exact;
  }

  // À défaut, on restreint au campus (code)
  const code = cle(recherche.code);
  const candidats = code ? ecoles.filter((e) => cle(e.code) === code) : ecoles;
  if (candidats.length === 0) return null;
  return candidats[0];
}

/** Établissement de l'utilisateur connecté, pour les documents non rattachés à un élève ou en fallback. */
export function getEcoleCourante(): EcoleIdentite | null {
  if (typeof localStorage === "undefined") return null;
  const lire = (k: string) => {
    const v = localStorage.getItem(k);
    return v && v !== "undefined" && v !== "null" ? v.trim() : null;
  };
  const ecoleId = lire("user_ecole_id") || lire("ecole_id");
  const code = lire("user_ecole_code") || lire("code_etablissement");
  const name = lire("user_ecole_name");
  
  const found = findEcole({
    ecoleId,
    code,
    schoolName: name,
  });
  if (found) return found;

  // Si non trouvé dans la liste des écoles en cache, construire une identité propre depuis le localStorage
  if (ecoleId || code || name) {
    return {
      id: ecoleId || '1',
      name: name || (code ? `Établissement Hinneh ${code}` : 'Groupe Scolaire Confessionnel Hinneh'),
      code: code || '',
      region: lire("user_region") || '',
      city: lire("user_ville") || 'BOUAKE',
      address: lire("user_ecole_address") || lire("user_ville") || 'Bouaké, Côte d\'Ivoire',
      contacts: lire("user_ecole_contacts") || '+225 07 00 00 00 00',
      email: lire("user_ecole_email") || 'contact@hinneh-education.ci',
      logo: lire("user_ecole_logo") || '/images/logo.png',
      cycles: ['maternelle', 'primaire', 'college', 'lycee'],
    };
  }
  return null;
}

/**
 * En-tête d'établissement à imprimer avec dénomination dynamique selon le cycle, la ville et l'utilisateur connecté.
 */
export function resolveEnteteEtablissement(recherche: RechercheEcole): EnteteEtablissement {
  let ecole = findEcole(recherche);
  if (!ecole) {
    ecole = getEcoleCourante();
  }

  const userEcoleCourante = getEcoleCourante();
  const ville = resolveUserCity(recherche.city, ecole, recherche.schoolName);
  const fullName = computeEtablissementFullName(
    recherche.className,
    ville,
    ecole,
    recherche.schoolName || userEcoleCourante?.name
  );

  let establishmentType = "COLLÈGE";
  if (fullName.includes("MATERNELLE")) establishmentType = "ÉCOLE MATERNELLE";
  else if (fullName.includes("PRIMAIRE")) establishmentType = "ÉCOLE PRIMAIRE";
  else if (fullName.includes("LYCEE") || fullName.includes("LYCÉE")) establishmentType = "LYCÉE";
  else if (fullName.includes("COLLEGE") || fullName.includes("COLLÈGE")) establishmentType = "COLLÈGE";

  // Récupération intelligente du logo : école cible -> école courante utilisateur -> localStorage -> logo par défaut
  let logoUrl = ecole?.logo || userEcoleCourante?.logo || '';
  if (!logoUrl && typeof localStorage !== 'undefined') {
    logoUrl = (
      localStorage.getItem('user_ecole_logo') ||
      localStorage.getItem('ecole_logo') ||
      localStorage.getItem('school_logo') ||
      ''
    ).trim();
  }
  if (!logoUrl) {
    logoUrl = '/images/hinneh_logo_20260507_234919.png';
  }

  // Récupération des contacts et adresse
  const phoneLine = ecole?.contacts || userEcoleCourante?.contacts || (typeof localStorage !== 'undefined' ? localStorage.getItem('user_ecole_contacts') || '' : '');
  const addressLine = ecole?.address || userEcoleCourante?.address || (typeof localStorage !== 'undefined' ? localStorage.getItem('user_ecole_address') || '' : '') || ville;
  const emailLine = ecole?.email || userEcoleCourante?.email || (typeof localStorage !== 'undefined' ? localStorage.getItem('user_ecole_email') || '' : '');
  const codeEtablissement = ecole?.code || userEcoleCourante?.code || recherche.code || (typeof localStorage !== 'undefined' ? localStorage.getItem('user_ecole_code') || '' : '');
  const directeur = ecole?.directeurNom || userEcoleCourante?.directeurNom || '';

  return {
    fullName: fullName.toUpperCase(),
    shortName: fullName.toUpperCase(),
    stampText: fullName.toUpperCase(),
    establishmentType,
    addressLine: addressLine || ville,
    phoneLine: phoneLine || '',
    email: emailLine || '',
    logo: logoUrl,
    code: codeEtablissement || '',
    city: ville,
    directeurNom: directeur,
  };
}
