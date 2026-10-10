/**
 * receiptPrinter.ts
 * Module d'impression des reçus de paiement 1-à-1 avec le modèle officiel Hînneh Éducation (Double Coupon)
 */

import { generateQRCodeDataURI } from '@/lib/qrHelper';
import { resolveSchoolNameForStudent } from '@/lib/certificatePrinter';

export interface ReceiptData {
  receiptNumber: string;
  amount: number;
  type: string;
  mode: string;
  status?: string;
  date: Date | string;
  date_acquittement?: Date | string;
  transactionNumber?: string;
  paymentId?: string | number;
  studentName: string;
  studentMatricule?: string;
  studentClass: string;
  studentPhoto?: string;
  schoolName?: string;
  /** Identifiant de l'établissement de l'élève : sert à retrouver sa fiche Profil École. */
  schoolId?: string | number;
  /** Code établissement — partagé entre les cycles d'un campus, donc simple appoint. */
  schoolCode?: string;
  codeEtablissement?: string;
  schoolCity?: string;
  city?: string;
  totalVersedToDate?: number;
  soldeToDate?: number;
  arrieresAnterieurs?: number;
  caissierName?: string;
  imprimeParName?: string;
  statutOrientation?: string;
  typeInscription?: string;
  priseEnCharge?: boolean;
  serviceCantine?: boolean;
  serviceTransport?: boolean;
  serviceExamen?: boolean;
  cantineMensuelTarif?: number;
  transportMensuelTarif?: number;
  tarifOfficielEspeces?: number | string;
  echeances?: Array<{
    rubric: string;
    amount: number;
    paid: number;
    rest: number;
    /** Service optionnel porté par la tranche, tel qu'enregistré en base
     *  (api_echeancier.service_type) : 'scolarite' | 'cantine' | 'transport' | 'examen'.
     *  Fait foi sur le libellé pour classer et afficher la ligne. */
    service_type?: string;
    mode?: string;
    /** Statut brut de la tranche (api_echeancier.statut), ex: 'paye' | 'desabonne'. */
    statut?: string;
    /** Vrai si le service a été désabonné pour cette tranche. Une tranche désabonnée jamais
     *  payée est retirée du reçu ; une tranche désabonnée mais déjà réglée garde son montant
     *  réel et affiche juste une mention de contexte. */
    is_desabonne?: boolean;
  }>;
  versementDetails?: Array<{ rubric: string; amount: number }>;
  /** Origine réelle des lignes de scolarité imprimées, telle que renvoyée par l'API :
   *  'echeancier_eleve' (tranches enregistrées pour l'élève — une grille modifiée depuis
   *  n'est répercutée qu'après réalignement), 'grille_tarifaire' (grille configurée par
   *  l'établissement) ou 'bareme_officiel' (aucune grille ne couvre cette classe).
   *  Affichée sur le reçu pour qu'un écart avec la grille soit diagnosticable au guichet. */
  sourceScolarite?: "echeancier_eleve" | "grille_tarifaire" | "aucune_grille";
  /** Libellé du modèle tarifaire retenu, affiché à côté de l'origine. */
  grilleLabel?: string;
}

import { getOfficialCashTariffForClassConfigured, getModeleSeptembre, normalizeCityKey, getOfficialServiceTarif } from '@/lib/tarifsConfig';
import { resolveEcheancierForStudent, parseNiveau, type TrancheSource } from '@/lib/grilleTarifaire';

export function getOfficialCashTariffForClass(
  studentClass: string,
  schoolCodeOrId?: string | number,
  ville?: string,
): { label: string; amount: number; formatted: string } {
  return getOfficialCashTariffForClassConfigured(studentClass, schoolCodeOrId, ville);
}

function matchNameOrMatricule(queryName?: string, queryMat?: string, targetName?: string, targetMat?: string): boolean {
  const qMat = (queryMat || "").trim().toUpperCase();
  const tMat = (targetMat || "").trim().toUpperCase();
  if (qMat && tMat && qMat !== "N/A" && tMat !== "N/A") {
    if (qMat === tMat || qMat.includes(tMat) || tMat.includes(qMat)) return true;
  }
  const qName = (queryName || "").trim().toUpperCase();
  const tName = (targetName || "").trim().toUpperCase();
  if (!qName || !tName) return false;
  if (qName === tName || qName.includes(tName) || tName.includes(qName)) return true;

  const qTokens = qName.split(/\s+/).filter(Boolean);
  const tTokens = tName.split(/\s+/).filter(Boolean);
  if (qTokens.length === 0 || tTokens.length === 0) return false;

  const allQInT = qTokens.every((q) => tTokens.some((t) => t.includes(q) || q.includes(t)));
  const allTInQ = tTokens.every((t) => qTokens.some((q) => q.includes(t) || t.includes(q)));
  return allQInT || allTInQ;
}

export function getStudentServiceAttribution(name?: string, matricule?: string): {
  cantine: boolean;
  transport: boolean;
  transportTarif?: number;
  cantineTarif?: number;
  transportZoneName?: string;
} {
  let isCantine = false;
  let isTransport = false;

  if (typeof localStorage === "undefined") return { cantine: false, transport: false };

  // 1. Check student_service_attributions (Primary source set by Économat)
  try {
    const raw = localStorage.getItem("student_service_attributions");
    if (raw) {
      const map = JSON.parse(raw);
      const keys = Object.keys(map);
      for (const k of keys) {
        const entry = map[k];
        const entryName = entry?.studentName || k;
        const entryMat = entry?.studentMatricule || k;
        if (
          matchNameOrMatricule(name, matricule, entryName, entryMat) ||
          k.trim().toUpperCase() === (matricule || "").trim().toUpperCase() ||
          k.trim().toUpperCase() === (name || "").trim().toUpperCase() ||
          (matricule && k.trim().toUpperCase().includes(matricule.trim().toUpperCase())) ||
          (name && k.trim().toUpperCase().includes(name.trim().toUpperCase()))
        ) {
          // Respecter explicitement les valeurs booléennes enregistrées (y compris false)
          return {
            cantine: Boolean(entry?.cantine),
            transport: Boolean(entry?.transport),
            transportTarif: entry?.transportTarif ? Number(entry.transportTarif) : undefined,
            cantineTarif: entry?.cantineTarif ? Number(entry.cantineTarif) : undefined,
            transportZoneName: entry?.transportZoneName,
          };
        }
      }
    }
  } catch (e) {
    console.error("Error reading student_service_attributions:", e);
  }

  // 2. Check cached students list
  try {
    const rawStuds = localStorage.getItem("students") || localStorage.getItem("hinneh_students_cache");
    if (rawStuds) {
      const list = JSON.parse(rawStuds);
      if (Array.isArray(list)) {
        const found = list.find((item: any) => {
          const sName = `${item.nom || item.lastName || ""} ${item.prenom || item.firstName || ""}`.trim();
          const sMat = item.matricule || item.studentMatricule;
          return matchNameOrMatricule(name, matricule, sName, sMat);
        });
        if (found) {
          return {
            cantine: Boolean(found.cantine || found.serviceCantine || found.service_cantine || found.is_cantine),
            transport: Boolean(found.transport || found.serviceTransport || found.service_transport || found.is_transport),
            transportTarif: Number(found.tarif_transport || found.montant_transport || found.transport_tarif || found.zone_tarif || 0) > 0
              ? Number(found.tarif_transport || found.montant_transport || found.transport_tarif || found.zone_tarif)
              : undefined,
            cantineTarif: Number(found.tarif_cantine || found.montant_cantine || 0) > 0
              ? Number(found.tarif_cantine || found.montant_cantine)
              : undefined,
          };
        }
      }
    }
  } catch (e) {}

  return { cantine: isCantine, transport: isTransport };
}

export function numberToFrenchWords(n: number): string {
  if (!n || n === 0) return "ZÉRO";
  const units = [
    "",
    "UN",
    "DEUX",
    "TROIS",
    "QUATRE",
    "CINQ",
    "SIX",
    "SEPT",
    "HUIT",
    "NEUF",
  ];
  const teens = [
    "DIX",
    "ONZE",
    "DOUZE",
    "TREIZE",
    "QUATORZE",
    "QUINZE",
    "SEIZE",
    "DIX-SEPT",
    "DIX-HUIT",
    "DIX-NEUF",
  ];
  const tens = [
    "",
    "DIX",
    "VINGT",
    "TRENTE",
    "QUARANTE",
    "CINQUANTE",
    "SOIXANTE",
    "SOIXANTE-DIX",
    "QUATRE-VINGTS",
    "QUATRE-VINGT-DIX",
  ];

  function convertGroup(num: number): string {
    let res = "";
    const h = Math.floor(num / 100);
    const r = num % 100;
    if (h > 0) {
      if (h === 1) res += "CENT ";
      else res += units[h] + " CENTS ";
    }
    if (r > 0) {
      if (r < 10) res += units[r];
      else if (r < 20) res += teens[r - 10];
      else {
        const t = Math.floor(r / 10);
        const u = r % 10;
        if (t === 7) {
          res += "SOIXANTE-" + teens[u];
        } else if (t === 9) {
          res += "QUATRE-VINGT-" + teens[u];
        } else {
          res += tens[t] + (u === 1 ? " ET UN" : u > 0 ? "-" + units[u] : "");
        }
      }
    }
    return res.trim();
  }

  const absN = Math.abs(Math.floor(n));
  if (absN >= 1000000) {
    const m = Math.floor(absN / 1000000);
    const rem = absN % 1000000;
    return `${convertGroup(m)} MILLION${m > 1 ? "S" : ""} ${numberToFrenchWords(rem)}`.trim();
  }
  if (absN >= 1000) {
    const k = Math.floor(absN / 1000);
    const rem = absN % 1000;
    const kStr = k === 1 ? "MILLE" : `${convertGroup(k)} MILLE`;
    return `${kStr} ${rem > 0 ? convertGroup(rem) : ""}`.trim();
  }
  return convertGroup(absN);
}

export interface EcheancierEleveResolu {
  /** "grille" = Grille Tarifaire Officielle, "ecolage" = Frais d'Écolage Économat. */
  source: TrancheSource;
  /** Libellé du modèle tarifaire appliqué, à afficher au guichet. */
  label: string;
  echeances: Array<{ rubric: string; amount: number; paid: number; rest: number }>;
}

/**
 * Échéancier théorique d'un élève, construit exclusivement à partir des tarifs
 * réels de l'établissement (Grille Tarifaire Officielle, puis Frais d'Écolage de
 * l'Économat). Aucun barème n'est codé en dur : si la classe n'est couverte par
 * aucune des deux sources, la liste renvoyée est vide et l'appelant doit le dire
 * à l'utilisateur plutôt que d'afficher un montant inventé.
 *
 * `totalVersed` est ventilé sur les tranches dans l'ordre pour déduire ce qui est
 * payé et ce qui reste dû.
 */
export function resolveEcheancierEleve(
  studentClass: string,
  statutOrientation: string = "AFF",
  typeInscription: string = "inscription",
  priseEnCharge: boolean = false,
  totalVersed: number = 0,
  schoolId?: string | number,
  schoolCode?: string,
  city?: string,
): EcheancierEleveResolu {
  const parsedNiv = parseNiveau(studentClass);
  const isMatOrPrim = parsedNiv.cycle === "maternelle" || parsedNiv.cycle === "primaire";
  const effectiveStatut = isMatOrPrim ? "TOUS" : statutOrientation;

  const { source, label, tranches } = resolveEcheancierForStudent({
    className: studentClass,
    statutOrientation: effectiveStatut,
    typeInscription,
    priseEnCharge,
    schoolId,
    schoolCode,
    city,
  });

  let remaining = totalVersed;
  const echeances = tranches.map((t) => {
    let paid = 0;
    if (remaining >= t.montant) {
      paid = t.montant;
      remaining -= t.montant;
    } else if (remaining > 0) {
      paid = remaining;
      remaining = 0;
    }
    return {
      rubric: t.libelle,
      amount: t.montant,
      paid,
      rest: Math.max(0, t.montant - paid),
    };
  });

  return { source, label, echeances };
}

export function buildRealEcheancesForStudent(
  studentClass: string,
  statutOrientation: string = "AFF",
  typeInscription: string = "inscription",
  priseEnCharge: boolean = false,
  totalVersed: number = 0,
  schoolId?: string | number,
  schoolCode?: string,
  city?: string,
): Array<{ rubric: string; amount: number; paid: number; rest: number }> {
  const parsedNiv = parseNiveau(studentClass);
  const isMatOrPrim = parsedNiv.cycle === "maternelle" || parsedNiv.cycle === "primaire";
  const effectiveStatut = isMatOrPrim ? "TOUS" : statutOrientation;

  return resolveEcheancierEleve(
    studentClass,
    effectiveStatut,
    typeInscription,
    priseEnCharge,
    totalVersed,
    schoolId,
    schoolCode,
    city,
  ).echeances;
}

/** Generate a receipt number if none exists */
export function generateReceiptNumber(paymentId: string | number): string {
  return `RC-${String(paymentId).padStart(5, "0")}`;
}

export function getStudentPhotoUrl(photoCandidate?: string): string {
  if (!photoCandidate || typeof photoCandidate !== "string") return "";
  const trimmed = photoCandidate.trim();
  if (
    !trimmed ||
    trimmed === "null" ||
    trimmed === "undefined" ||
    trimmed.includes("placeholder")
  ) {
    return "";
  }
  if (
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }
  return `data:image/jpeg;base64,${trimmed}`;
}

export type ServiceCategory = "ecolage" | "kits_achats" | "frais_divers" | "cantine" | "transport" | "examen" | "autres";

/**
 * Classe une tranche d'échéancier dans l'une des rubriques du reçu.
 * Le service_type venu de la base (api_echeancier.service_type) fait foi ; le libellé
 * n'est utilisé qu'en repli, pour les tranches construites côté client (barème générique)
 * ou remontées par d'anciens écrans qui ne transmettent pas ce champ.
 */
export function getServiceCategory(rubric?: string, serviceType?: string): ServiceCategory {
  const st = (serviceType || "").trim().toLowerCase();
  if (st === "cantine") return "cantine";
  if (st === "transport") return "transport";
  if (st === "examen") return "examen";
  if (
    st === "kits_achats" ||
    st === "uniforme" ||
    st === "kit" ||
    st === "kits" ||
    st === "tenue" ||
    st === "fourniture" ||
    st === "fournitures" ||
    st === "achat_divers" ||
    st === "achats_divers" ||
    st.startsWith("tenue") ||
    st.startsWith("polo") ||
    st.startsWith("kit")
  ) {
    return "kits_achats";
  }
  if (
    st === "frais_divers" ||
    st === "cours_anglais" ||
    st === "cours_informatique" ||
    st.startsWith("cours_") ||
    st.startsWith("fd-")
  ) {
    return "frais_divers";
  }
  if (
    st === "arriere" ||
    st === "scolarite" ||
    st === "ecolage" ||
    st === "inscription" ||
    st === "reinscription" ||
    st === "frais_annexe" ||
    st === "frais_inscription"
  ) {
    return "ecolage";
  }

  const u = (rubric || "").toUpperCase();
  if (u.includes("CANT")) return "cantine";
  if (u.includes("TRANS") || u.includes("CAR")) return "transport";
  if (u.includes("EXAMEN") || u.includes("BEPC") || u.includes("CEPE") || u.includes("BAC")) return "examen";
  if (
    u.includes("KIT") ||
    u.includes("TENUE") ||
    u.includes("UNIFORME") ||
    u.includes("POLO") ||
    u.includes("FOURNITURE") ||
    u.includes("ACHAT") ||
    u.includes("LIVRE") ||
    u.includes("CAHIER") ||
    u.includes("RAME") ||
    u.includes("EFFET")
  ) {
    return "kits_achats";
  }
  if (
    u.includes("ANGLAIS") ||
    u.includes("INFORMATIQUE") ||
    u.includes("TICE") ||
    u.includes("DIVERS") ||
    u.includes("SOUTIEN")
  ) {
    return "frais_divers";
  }

  return "ecolage";
}

/** Ligne d'arriérés des années antérieures (code ARRIERE de l'ancien logiciel). */
export function isArriereEcheance(e: { rubric?: string; service_type?: string }): boolean {
  if ((e.service_type || "").trim().toLowerCase() === "arriere") return true;
  const u = (e.rubric || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return u.includes("ARRIERE");
}

export function generateReceiptHTML(data: ReceiptData): string {
  // Helper pour verifier si deux rubriques font reference au même mois
  const hasMatchingMonth = (s1: string, s2: string): boolean => {
    const months = [
      { name: "SEPTEMBRE", short: "SEPT" },
      { name: "OCTOBRE", short: "OCT" },
      { name: "NOVEMBRE", short: "NOV" },
      { name: "DECEMBRE", short: "DEC" },
      { name: "DÉCEMBRE", short: "DEC" },
      { name: "JANVIER", short: "JAN" },
      { name: "FEVRIER", short: "FEV" },
      { name: "FÉVRIER", short: "FEV" },
      { name: "MARS", short: "MARS" },
      { name: "AVRIL", short: "AVR" },
      { name: "MAI", short: "MAI" },
      { name: "JUIN", short: "JUIN" },
    ];
    const u1 = s1.toUpperCase();
    const u2 = s2.toUpperCase();
    for (const m of months) {
      if ((u1.includes(m.name) || u1.includes(m.short)) && (u2.includes(m.name) || u2.includes(m.short))) {
        return true;
      }
    }
    return false;
  };

  // Helper pour verifier si deux rubriques font reference au même mois ou la même tranche
  const isSameTrancheOrMonth = (k1: string, k2: string): boolean => {
    const u1 = k1.toUpperCase().trim();
    const u2 = k2.toUpperCase().trim();
    if (u1 === u2) return true;

    if (u1.includes("CANT") && u2.includes("CANT")) return hasMatchingMonth(u1, u2);
    if ((u1.includes("TRANS") || u1.includes("CAR")) && (u2.includes("TRANS") || u2.includes("CAR"))) return hasMatchingMonth(u1, u2);

    const tranchePatterns = [
      { keys: ["INSCRIPTION", "ANNEXE", "1ER V", "1ER VERS"] },
      { keys: ["1V", "SEPT"] },
      { keys: ["2È", "2EME", "2V", "OCT"] },
      { keys: ["3È", "3EME", "3V", "NOV"] },
      { keys: ["4È", "4EME", "4V", "DEC"] },
      { keys: ["5È", "5EME", "5V", "JAN"] },
      { keys: ["6È", "6EME", "6V", "FEV"] },
      { keys: ["7È", "7EME", "7V", "MARS"] },
      { keys: ["8È", "8EME", "8V", "AVR"] },
      { keys: ["9È", "9EME", "9V", "MAI"] },
    ];

    for (const pat of tranchePatterns) {
      const match1 = pat.keys.some((k) => u1.includes(k));
      const match2 = pat.keys.some((k) => u2.includes(k));
      if (match1 && match2) return true;
    }

    return false;
  };

  const parseDateSafe = (val: any): Date => {
    if (!val) return new Date();
    if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val;
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (/^\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
        const todayStr = new Date().toISOString().split("T")[0];
        const combined = new Date(`${todayStr}T${trimmed}Z`);
        if (!isNaN(combined.getTime())) return combined;
      }
      if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}/.test(trimmed)) {
        const iso = trimmed.replace(" ", "T") + "Z";
        const d = new Date(iso);
        if (!isNaN(d.getTime())) return d;
      }
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  };

  let dObj = parseDateSafe(data.date);

  // Formatage officiel de l'heure et date au fuseau de Côte d'Ivoire (Africa/Abidjan = GMT+0)
  const formatAbidjanDateTime = (d: Date) => {
    try {
      const parts = new Intl.DateTimeFormat("fr-CA", {
        timeZone: "Africa/Abidjan",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).formatToParts(d);
      const getP = (type: string) => parts.find((p) => p.type === type)?.value || "00";
      return `${getP("year")}-${getP("month")}-${getP("day")} ${getP("hour")}:${getP("minute")}:${getP("second")} GMT`;
    } catch {
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")} GMT`;
    }
  };

  const formatAbidjanDate = (d: Date) => {
    try {
      const parts = new Intl.DateTimeFormat("fr-CA", {
        timeZone: "Africa/Abidjan",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(d);
      const getP = (type: string) => parts.find((p) => p.type === type)?.value || "00";
      return `${getP("year")}-${getP("month")}-${getP("day")}`;
    } catch {
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    }
  };

  const formatAbidjanPrintDate = (d: Date) => {
    try {
      const parts = new Intl.DateTimeFormat("fr-FR", {
        timeZone: "Africa/Abidjan",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(d);
      const getP = (type: string) => parts.find((p) => p.type === type)?.value || "00";
      return `${getP("day")}/${getP("month")}/${getP("year")} à ${getP("hour")}:${getP("minute")} GMT`;
    } catch {
      return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()} à ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} GMT`;
    }
  };

  const dateFormattedStr = formatAbidjanDateTime(dObj);
  let dAcqObj = data.date_acquittement ? parseDateSafe(data.date_acquittement) : dObj;
  const dateAcquittementFormattedStr = formatAbidjanDate(dAcqObj);
  const now = new Date();
  const printDateStr = formatAbidjanPrintDate(now);
  let transactionAmount = Number(data.amount) || 0;
  if (data.versementDetails && data.versementDetails.length > 0) {
    const vSum = data.versementDetails.reduce((acc, v) => acc + Number(v.amount || 0), 0);
    if (vSum > 0 && (vSum !== transactionAmount || transactionAmount === Number(data.totalVersedToDate))) {
      transactionAmount = vSum;
    }
  }

  let amountWords = numberToFrenchWords(transactionAmount);
  
  // Total versé spécifiquement pour la scolarité (excluant Cantine, Transport, et Frais d'Examen)
  const tuitionPaidFromEcheances = (data.echeances || []).reduce((acc, e) => {
    if (getServiceCategory(e.rubric, e.service_type) === "ecolage") {
      return acc + Number(e.paid || 0);
    }
    return acc;
  }, 0);

  // Identité imprimée = fiche « Profil École » de l'établissement de l'élève.
  const resolvedSchool = resolveSchoolNameForStudent(
    data.schoolName,
    data.studentClass,
    data.schoolId,
    data.schoolCode,
    data.schoolCity || data.city,
  );
  const effectiveCity = data.schoolCity || data.city || resolvedSchool.city || "";
  const effectiveSchoolCode = data.codeEtablissement || data.schoolCode || resolvedSchool.code || "";
  const effectiveSchoolId = data.schoolId || (resolvedSchool as any).id || "";

  let initialTotalTuitionVersed = Number((data as any).totalVersedTuition || 0);
  if (!initialTotalTuitionVersed) {
    if (data.echeances && data.echeances.length > 0 && tuitionPaidFromEcheances > 0) {
      initialTotalTuitionVersed = tuitionPaidFromEcheances;
    } else {
      const pType = (data.type || "").toLowerCase();
      if (pType.includes("cant") || pType.includes("trans") || pType.includes("car") || pType.includes("exam")) {
        initialTotalTuitionVersed = Math.max(0, Number(data.totalVersedToDate || 0) - transactionAmount);
      } else {
        initialTotalTuitionVersed = Number(data.totalVersedToDate || transactionAmount);
      }
    }
  }

  const tuitionEcheances = buildRealEcheancesForStudent(
    data.studentClass || "",
    data.statutOrientation || "AFF",
    data.typeInscription || "inscription",
    Boolean(data.priseEnCharge),
    initialTotalTuitionVersed,
    effectiveSchoolId,
    effectiveSchoolCode,
    effectiveCity,
  );

  // Master map for deduplicated & merged student echeances
  const echeanceMap = new Map<string, { rubric: string; amount: number; paid: number; rest: number; service_type?: string; mode?: string }>();
  const hasRealEcheances = Boolean(data.echeances && data.echeances.length > 0);

  // Décomposition des échéances transmises par catégorie depuis la base de données
  const passedEcheances = data.echeances || [];
  const passedScolarite = passedEcheances.filter((e) => getServiceCategory(e.rubric, e.service_type) === "ecolage");
  const passedKitsAchats = passedEcheances.filter((e) => getServiceCategory(e.rubric, e.service_type) === "kits_achats");
  const passedFraisDivers = passedEcheances.filter((e) => getServiceCategory(e.rubric, e.service_type) === "frais_divers");
  const passedCantine = passedEcheances.filter((e) => getServiceCategory(e.rubric, e.service_type) === "cantine");
  const passedTransport = passedEcheances.filter((e) => getServiceCategory(e.rubric, e.service_type) === "transport");
  const passedExamen = passedEcheances.filter((e) => getServiceCategory(e.rubric, e.service_type) === "examen");
  const passedAutres = passedEcheances.filter(
    (e) => !["ecolage", "kits_achats", "frais_divers", "cantine", "transport", "examen"].includes(getServiceCategory(e.rubric, e.service_type))
  );

  const savedAttribution = getStudentServiceAttribution(data.studentName, data.studentMatricule);
  // RÈGLE STRICTE : Un élève non abonné (sans paiement) ne doit jamais avoir d'échéancier cantine/transport
  const isCantineActive = Boolean(
    data.serviceCantine === true ||
    (data.serviceCantine !== false && savedAttribution.cantine) ||
    (data.type || "").toUpperCase().includes("CANT")
  );
  const cantineHasPayments = passedCantine.some((e) => Number(e.paid || 0) > 0);
  const shouldDisplayCantine = isCantineActive || cantineHasPayments;

  const isTransportActive = Boolean(
    data.serviceTransport === true ||
    (data.serviceTransport !== false && savedAttribution.transport) ||
    (data.type || "").toUpperCase().includes("TRANS") ||
    (data.type || "").toUpperCase().includes("CAR")
  );
  const transportHasPayments = passedTransport.some((e) => Number(e.paid || 0) > 0);
  const shouldDisplayTransport = isTransportActive || transportHasPayments;

  const shouldDisplayExamen = Boolean(
    data.serviceExamen ||
    passedExamen.length > 0 ||
    (data.type || "").toUpperCase().includes("EXAM")
  );

  // 1. Échéances Scolarité / Inscription : échéancier réel de l'élève ou grille tarifaire officielle
  if (passedScolarite.length > 0) {
    passedScolarite.forEach((e, idx) => {
      const key = `${(e.rubric || "Scolarite").toUpperCase().trim()}__SCOL__${idx}`;
      const amountVal = Number(e.amount || 0);
      const paidVal = Number(e.paid || 0);
      const restVal = e.rest !== undefined ? Number(e.rest) : Math.max(0, amountVal - paidVal);
      echeanceMap.set(key, {
        rubric: e.rubric,
        amount: amountVal,
        paid: paidVal,
        rest: restVal,
        service_type: e.service_type || "scolarite",
        mode: (e as any).mode,
        date_paye: (e as any).date_paye,
        date_echeance: (e as any).date_echeance,
        statut: (e as any).statut,
        ordreEcheancier: idx,
      } as any);
    });
  } else {
    tuitionEcheances.forEach((t) => {
      const key = t.rubric.toUpperCase().trim();
      echeanceMap.set(key, { ...t });
    });
  }

  // 2. Échéances Cantine : réelles de la base de données ou échéancier mensuel officiel 9 mois
  const officialMonthlyCantine = getOfficialServiceTarif(
    "cantine",
    effectiveSchoolCode || effectiveSchoolId || data.schoolId || data.schoolCode || data.codeEtablissement,
    effectiveCity || data.schoolCity || data.city,
    data.schoolName || resolvedSchool.name
  );

  const explicitCantineTarif =
    (data.cantineMensuelTarif && Number(data.cantineMensuelTarif) > 0)
      ? Number(data.cantineMensuelTarif)
      : (savedAttribution.cantineTarif && Number(savedAttribution.cantineTarif) > 0)
      ? Number(savedAttribution.cantineTarif)
      : undefined;

  const maxPaidCantine = passedCantine.reduce((max, e) => Math.max(max, Number(e.paid || 0)), 0);
  const maxPrevuCantine = passedCantine.reduce((max, e) => Math.max(max, Number(e.amount || 0)), 0);

  let detectedCantineFromPmt: number | undefined = undefined;
  if ((data.type || "").toLowerCase().includes("cant") || (data.type || "").toLowerCase().includes("reglement")) {
    const amt = Number(data.amount || 0);
    if (amt > 0) {
      if (amt <= 40000) detectedCantineFromPmt = amt;
      else if (amt % 3 === 0 && amt / 3 <= 40000) detectedCantineFromPmt = amt / 3;
      else if (amt % 9 === 0 && amt / 9 <= 40000) detectedCantineFromPmt = amt / 9;
    }
  }

  const highestPaidOrCurrentCantine = Math.max(maxPaidCantine, detectedCantineFromPmt || 0);

  const effectiveMonthlyCantine =
    (highestPaidOrCurrentCantine > 0 ? highestPaidOrCurrentCantine : undefined) ||
    explicitCantineTarif ||
    (maxPrevuCantine > 0 ? maxPrevuCantine : undefined) ||
    (officialMonthlyCantine > 0 ? officialMonthlyCantine : 15000);

  const officialMonthlyTransport = getOfficialServiceTarif(
    "transport",
    effectiveSchoolCode || effectiveSchoolId || data.schoolId || data.schoolCode || data.codeEtablissement,
    effectiveCity || data.schoolCity || data.city,
    data.schoolName || resolvedSchool.name
  );

  const explicitTransportTarif =
    (data.transportMensuelTarif && Number(data.transportMensuelTarif) > 0)
      ? Number(data.transportMensuelTarif)
      : (savedAttribution.transportTarif && Number(savedAttribution.transportTarif) > 0)
      ? Number(savedAttribution.transportTarif)
      : undefined;

  const maxPaidTransport = passedTransport.reduce((max, e) => Math.max(max, Number(e.paid || 0)), 0);
  const maxPrevuTransport = passedTransport.reduce((max, e) => Math.max(max, Number(e.amount || 0)), 0);

  let detectedTransportFromPmt: number | undefined = undefined;
  if ((data.type || "").toLowerCase().includes("trans") || (data.type || "").toLowerCase().includes("car") || (data.type || "").toLowerCase().includes("reglement")) {
    const amt = Number(data.amount || 0);
    if (amt > 0) {
      if (amt <= 40000) detectedTransportFromPmt = amt;
      else if (amt % 3 === 0 && amt / 3 <= 40000) detectedTransportFromPmt = amt / 3;
      else if (amt % 9 === 0 && amt / 9 <= 40000) detectedTransportFromPmt = amt / 9;
    }
  }

  const highestPaidOrCurrentTransport = Math.max(maxPaidTransport, detectedTransportFromPmt || 0);

  const effectiveMonthlyTransport =
    (highestPaidOrCurrentTransport > 0 ? highestPaidOrCurrentTransport : undefined) ||
    explicitTransportTarif ||
    (maxPrevuTransport > 0 ? maxPrevuTransport : undefined) ||
    (officialMonthlyTransport > 0 ? officialMonthlyTransport : 18000);

  const hasMonthlyCantineFromDb = passedCantine.length >= 7 && passedCantine.some(e => (e.rubric || "").toLowerCase().includes("sept") || (e.rubric || "").toLowerCase().includes("oct"));

  if (hasMonthlyCantineFromDb) {
    passedCantine.forEach((e, idx) => {
      const key = `${(e.rubric || "Cantine").toUpperCase().trim()}__CANT__${idx}`;
      const isDesab = (e as any).statut === "desabonne" || (e as any).is_desabonne;
      const paidVal = Number(e.paid || 0);
      let amountVal = isDesab ? 0 : Math.max(paidVal, effectiveMonthlyCantine);
      const restVal = isDesab || (e as any).statut === "paye" || (paidVal >= amountVal && amountVal > 0) ? 0 : Math.max(0, amountVal - paidVal);
      echeanceMap.set(key, {
        rubric: e.rubric || `Cantine Scolaire`,
        amount: amountVal,
        paid: paidVal,
        rest: restVal,
        service_type: "cantine",
        mode: (e as any).mode,
        date_paye: (e as any).date_paye,
        date_echeance: (e as any).date_echeance,
        statut: isDesab ? "desabonne" : (paidVal >= amountVal && amountVal > 0 ? "paye" : (e as any).statut),
        is_desabonne: isDesab,
        ordreEcheancier: 100 + idx,
      } as any);
    });
  } else if (shouldDisplayCantine) {
    let cantinePaidTotal = passedCantine.reduce((acc, e) => acc + Number(e.paid || 0), 0);
    if (data.versementDetails && data.versementDetails.length > 0) {
      const vCant = data.versementDetails
        .filter(v => (v.rubric || "").toUpperCase().includes("CANT"))
        .reduce((acc, v) => acc + Number(v.amount || 0), 0);
      if (vCant > cantinePaidTotal) cantinePaidTotal = vCant;
    }
    if (cantinePaidTotal === 0 && (data.type || "").toUpperCase().includes("CANT")) {
      cantinePaidTotal = transactionAmount;
    }

    if (isCantineActive) {
      const monthlyCantine = effectiveMonthlyCantine;

      let remCantine = cantinePaidTotal;
      const cantineSchedule = [
        { name: "Septembre", year: 2026, date: "05/09/2026", order: 101 },
        { name: "Octobre", year: 2026, date: "05/10/2026", order: 102 },
        { name: "Novembre", year: 2026, date: "05/11/2026", order: 103 },
        { name: "Décembre", year: 2026, date: "05/12/2026", order: 104 },
        { name: "Janvier", year: 2027, date: "05/01/2027", order: 105 },
        { name: "Février", year: 2027, date: "05/02/2027", order: 106 },
        { name: "Mars", year: 2027, date: "05/03/2027", order: 107 },
        { name: "Avril", year: 2027, date: "05/04/2027", order: 108 },
        { name: "Mai", year: 2027, date: "05/05/2027", order: 109 },
      ];
      cantineSchedule.forEach((m) => {
        const p = Math.min(monthlyCantine, remCantine);
        remCantine = Math.max(0, remCantine - p);
        const r = Math.max(0, monthlyCantine - p);
        const key = `CANTINE_${m.name.toUpperCase()}_${m.year}`;
        echeanceMap.set(key, {
          rubric: `Cantine — ${m.name} ${m.year}`,
          amount: monthlyCantine,
          paid: p,
          rest: r,
          service_type: "cantine",
          mode: p > 0 ? (data.mode || "especes") : undefined,
          date_echeance: m.date,
          date_paye: p > 0 ? data.date : undefined,
          statut: p >= monthlyCantine ? "paye" : p > 0 ? "partiel" : "non_paye",
          ordreEcheancier: m.order,
        } as any);
      });
    } else if (cantinePaidTotal > 0) {
      echeanceMap.set("CANTINE_SOLDE_PAID", {
        rubric: "Cantine Scolaire",
        amount: cantinePaidTotal,
        paid: cantinePaidTotal,
        rest: 0,
        service_type: "cantine",
        mode: data.mode || "especes",
        date_paye: data.date,
        statut: "paye",
        ordreEcheancier: 100,
      } as any);
    }
  }

  // 3. Échéances Transport : réelles de la base de données ou échéancier mensuel officiel 9 mois
  const hasMonthlyTransportFromDb = passedTransport.length >= 7 && passedTransport.some(e => (e.rubric || "").toLowerCase().includes("sept") || (e.rubric || "").toLowerCase().includes("oct"));

  if (hasMonthlyTransportFromDb) {
    passedTransport.forEach((e, idx) => {
      const key = `${(e.rubric || "Transport").toUpperCase().trim()}__TRANS__${idx}`;
      const isDesab = (e as any).statut === "desabonne" || (e as any).is_desabonne;
      const paidVal = Number(e.paid || 0);
      let amountVal = isDesab ? 0 : Math.max(paidVal, effectiveMonthlyTransport);
      const restVal = isDesab || (e as any).statut === "paye" || (paidVal >= amountVal && amountVal > 0) ? 0 : Math.max(0, amountVal - paidVal);
      echeanceMap.set(key, {
        rubric: e.rubric || `Transport Scolaire`,
        amount: amountVal,
        paid: paidVal,
        rest: restVal,
        service_type: "transport",
        mode: (e as any).mode,
        date_paye: (e as any).date_paye,
        date_echeance: (e as any).date_echeance,
        statut: isDesab ? "desabonne" : (paidVal >= amountVal && amountVal > 0 ? "paye" : (e as any).statut),
        is_desabonne: isDesab,
        ordreEcheancier: 200 + idx,
      } as any);
    });
  } else if (shouldDisplayTransport) {
    let transportPaidTotal = passedTransport.reduce((acc, e) => acc + Number(e.paid || 0), 0);
    if (data.versementDetails && data.versementDetails.length > 0) {
      const vTrans = data.versementDetails
        .filter(v => (v.rubric || "").toUpperCase().includes("TRANS") || (v.rubric || "").toUpperCase().includes("CAR"))
        .reduce((acc, v) => acc + Number(v.amount || 0), 0);
      if (vTrans > transportPaidTotal) transportPaidTotal = vTrans;
    }
    if (transportPaidTotal === 0 && ((data.type || "").toUpperCase().includes("TRANS") || (data.type || "").toUpperCase().includes("CAR"))) {
      transportPaidTotal = transactionAmount;
    }

    if (isTransportActive) {
      const monthlyTransport = effectiveMonthlyTransport;

      let remTransport = transportPaidTotal;
      const transportSchedule = [
        { name: "Septembre", year: 2026, date: "05/09/2026", order: 201 },
        { name: "Octobre", year: 2026, date: "05/10/2026", order: 202 },
        { name: "Novembre", year: 2026, date: "05/11/2026", order: 203 },
        { name: "Décembre", year: 2026, date: "05/12/2026", order: 204 },
        { name: "Janvier", year: 2027, date: "05/01/2027", order: 205 },
        { name: "Février", year: 2027, date: "05/02/2027", order: 206 },
        { name: "Mars", year: 2027, date: "05/03/2027", order: 207 },
        { name: "Avril", year: 2027, date: "05/04/2027", order: 208 },
        { name: "Mai", year: 2027, date: "05/05/2027", order: 209 },
      ];
      transportSchedule.forEach((m) => {
        const p = Math.min(monthlyTransport, remTransport);
        remTransport = Math.max(0, remTransport - p);
        const r = Math.max(0, monthlyTransport - p);
        const key = `TRANSPORT_${m.name.toUpperCase()}_${m.year}`;
        echeanceMap.set(key, {
          rubric: `Transport (Car) — ${m.name} ${m.year}`,
          amount: monthlyTransport,
          paid: p,
          rest: r,
          service_type: "transport",
          mode: p > 0 ? (data.mode || "especes") : undefined,
          date_echeance: m.date,
          date_paye: p > 0 ? data.date : undefined,
          statut: p >= monthlyTransport ? "paye" : p > 0 ? "partiel" : "non_paye",
          ordreEcheancier: m.order,
        } as any);
      });
    } else if (transportPaidTotal > 0) {
      echeanceMap.set("TRANSPORT_SOLDE_PAID", {
        rubric: "Transport Scolaire",
        amount: transportPaidTotal,
        paid: transportPaidTotal,
        rest: 0,
        service_type: "transport",
        mode: data.mode || "especes",
        date_paye: data.date,
        statut: "paye",
        ordreEcheancier: 200,
      } as any);
    }
  }

  // 4. Échéances Examen
  passedExamen.forEach((e, idx) => {
    const key = `${(e.rubric || "Examen").toUpperCase().trim()}__EXAM__${idx}`;
    const amountVal = Number(e.amount || 0);
    const paidVal = Number(e.paid || 0);
    const restVal = e.rest !== undefined ? Number(e.rest) : Math.max(0, amountVal - paidVal);
    echeanceMap.set(key, {
      rubric: e.rubric || "Droit & Frais d'Examen Officiel",
      amount: amountVal,
      paid: paidVal,
      rest: restVal,
      service_type: "examen",
      mode: (e as any).mode,
      ordreEcheancier: 300 + idx,
    });
  });

  // 5. Achats de Kits, Tenues & Fournitures
  passedKitsAchats.forEach((e, idx) => {
    const amountVal = Number(e.amount || 0);
    const paidVal = Number(e.paid || 0);
    const restVal = e.rest !== undefined ? Number(e.rest) : Math.max(0, amountVal - paidVal);
    const normRubric = e.rubric.toUpperCase().trim();

    // Éviter les doublons si un kit identique a déjà été inséré
    const alreadyExists = Array.from(echeanceMap.values()).some(
      (item) =>
        getServiceCategory(item.rubric, item.service_type) === "kits_achats" &&
        item.paid === paidVal &&
        item.amount === amountVal &&
        paidVal > 0 &&
        ((item as any).mode === (e as any).mode || !((e as any).mode) || !((item as any).mode))
    );
    if (alreadyExists) return;

    const key = `${normRubric}__KIT__${idx}`;
    echeanceMap.set(key, {
      rubric: e.rubric,
      amount: amountVal,
      paid: paidVal,
      rest: restVal,
      service_type: "kits_achats",
      mode: (e as any).mode,
      date_paye: (e as any).date_paye,
    } as any);
  });

  // 6. Frais Divers & Cours
  passedFraisDivers.forEach((e, idx) => {
    const amountVal = Number(e.amount || 0);
    const paidVal = Number(e.paid || 0);
    const restVal = e.rest !== undefined ? Number(e.rest) : Math.max(0, amountVal - paidVal);
    const normRubric = e.rubric.toUpperCase().trim();

    const alreadyExists = Array.from(echeanceMap.values()).some(
      (item) =>
        getServiceCategory(item.rubric, item.service_type) === "frais_divers" &&
        item.paid === paidVal &&
        item.amount === amountVal &&
        paidVal > 0 &&
        item.rubric.toUpperCase().trim() === normRubric
    );
    if (alreadyExists) return;

    const key = `${normRubric}__DIVERS__${idx}`;
    echeanceMap.set(key, {
      rubric: e.rubric,
      amount: amountVal,
      paid: paidVal,
      rest: restVal,
      service_type: "frais_divers",
      mode: (e as any).mode,
      date_paye: (e as any).date_paye,
    } as any);
  });

  // 7. Autres tranches transmises
  passedAutres.forEach((e, idx) => {
    const key = `${e.rubric.toUpperCase().trim()}__AUTRES__${idx}`;
    const amountVal = Number(e.amount || 0);
    const paidVal = Number(e.paid || 0);
    const restVal = e.rest !== undefined ? Number(e.rest) : Math.max(0, amountVal - paidVal);
    echeanceMap.set(key, {
      rubric: e.rubric,
      amount: amountVal,
      paid: paidVal,
      rest: restVal,
      service_type: e.service_type || "autres",
      mode: (e as any).mode,
      date_paye: (e as any).date_paye,
    } as any);
  });

  // 8. Intégration systématique des achats de kits/tenues/frais divers depuis les versements
  if (data.versementDetails && data.versementDetails.length > 0) {
    data.versementDetails.forEach((v, idx) => {
      const vRubric = (v.rubric || "").toUpperCase().trim();
      const vAmt = Number(v.amount || 0);
      if (vAmt <= 0) return;

      const cat = getServiceCategory(v.rubric);
      const isKit = cat === "kits_achats";
      const isDivers = cat === "frais_divers";

      if (isKit || isDivers) {
        const key = `${vRubric}__VD__${idx}`;
        const alreadyExists = Array.from(echeanceMap.values()).some((item) => {
          const itemCat = getServiceCategory(item.rubric, item.service_type);
          const isSameCat = (isKit && itemCat === "kits_achats") || (isDivers && itemCat === "frais_divers");
          return (
            (item.rubric.toUpperCase().trim() === vRubric && item.paid === vAmt) ||
            (isSameCat && item.paid === vAmt)
          );
        });
        if (!alreadyExists) {
          echeanceMap.set(key, {
            rubric: v.rubric,
            amount: vAmt,
            paid: vAmt,
            rest: 0,
            service_type: isKit ? "kits_achats" : "frais_divers",
            mode: (v as any).mode || data.mode || "especes",
            date_paye: data.date,
          } as any);
        }
      }
    });
  }

  // Tri chronologique des échéances (Arriérés -> Inscription/Annexes -> Mois par mois SEPT à MAI)
  const getCategoryOrder = (rubricName: string): number => {
    const r = rubricName
      .toUpperCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .trim();
    if (r.includes("ANNEXE")) return 10;
    if (r.includes("SCOLARIT") && !/\d\s*(ER|È|E)?(ME)?\s*VERS/.test(r)) return 15;
    if (r.includes("INSCRIPTION") || r.includes("DROITS")) return 20;

    if (r.includes("1ER V") || r.includes("1ER VERS") || r.includes("1V") || r.includes("SEPT") || r.includes("TRANCH 1") || r.includes("TRANCHE 1")) return 30;
    if (r.includes("2È") || r.includes("2EME") || r.includes("2V") || r.includes("OCT") || r.includes("TRANCH 2") || r.includes("TRANCHE 2")) return 40;
    if (r.includes("3È") || r.includes("3EME") || r.includes("3V") || r.includes("NOV") || r.includes("TRANCH 3") || r.includes("TRANCHE 3")) return 50;
    if (r.includes("4È") || r.includes("4EME") || r.includes("4V") || r.includes("DEC")) return 60;
    if (r.includes("5È") || r.includes("5EME") || r.includes("5V") || r.includes("JAN")) return 70;
    if (r.includes("6È") || r.includes("6EME") || r.includes("6V") || r.includes("FEV")) return 80;
    if (r.includes("7È") || r.includes("7EME") || r.includes("7V") || r.includes("MARS")) return 90;
    if (r.includes("8È") || r.includes("8EME") || r.includes("8V") || r.includes("AVR")) return 95;
    if (r.includes("9È") || r.includes("9EME") || r.includes("9V") || r.includes("MAI") || r.includes("SOLDE")) return 100;

    if (r.includes("KIT") || r.includes("TENUE") || r.includes("UNIFORME") || r.includes("POLO") || r.includes("FOURNITURE") || r.includes("ACHAT")) return 110;
    if (r.includes("ANGLAIS") || r.includes("INFORMATIQUE") || r.includes("DIVERS")) return 120;
    if (r.includes("CANT")) return 130;
    if (r.includes("TRANS") || r.includes("CAR")) return 140;
    if (r.includes("EXAMEN") || r.includes("BEPC") || r.includes("CEPE") || r.includes("BAC")) return 145;

    return 150;
  };

  // Application dynamique des déductions d'échéances basées sur les versements du jour (versementDetails)
  if (!hasRealEcheances && data.versementDetails && data.versementDetails.length > 0) {
    data.versementDetails.forEach((v) => {
      const vRubric = (v.rubric || "").toUpperCase().trim();
      const vAmt = Number(v.amount || 0);
      if (vAmt <= 0) return;

      // Traitement Kits / Tenues / Achats / Divers : enregistrement direct en ligne réglée
      if (
        vRubric.includes("KIT") ||
        vRubric.includes("TENUE") ||
        vRubric.includes("UNIFORME") ||
        vRubric.includes("POLO") ||
        vRubric.includes("FOURNITURE") ||
        vRubric.includes("ACHAT") ||
        vRubric.includes("ANGLAIS") ||
        vRubric.includes("INFORMATIQUE") ||
        vRubric.includes("DIVERS")
      ) {
        const isKit =
          vRubric.includes("KIT") ||
          vRubric.includes("TENUE") ||
          vRubric.includes("UNIFORME") ||
          vRubric.includes("POLO") ||
          vRubric.includes("FOURNITURE") ||
          vRubric.includes("ACHAT");
        echeanceMap.set(vRubric, {
          rubric: v.rubric,
          amount: vAmt,
          paid: vAmt,
          rest: 0,
          service_type: isKit ? "kits_achats" : "frais_divers",
          mode: (v as any).mode || data.mode || "especes",
        });
        return;
      }

      // Traitement Cantine : déduction progressive STRICTEMENT chronologique sur les tranches Cantine impayées
      if (vRubric.includes("CANT")) {
        const cantineKeys = Array.from(echeanceMap.keys())
          .filter(k => k.includes("CANT"))
          .sort((a, b) => getCategoryOrder(a) - getCategoryOrder(b));
        let remaining = vAmt;
        for (const k of cantineKeys) {
          if (remaining <= 0) break;
          const item = echeanceMap.get(k)!;
          if (item.rest > 0) {
            const deduct = Math.min(item.rest, remaining);
            const newPaid = item.paid + deduct;
            const newRest = Math.max(0, item.amount - newPaid);
            const itemMode = item.paid > 0 ? (item.mode || "especes") : (data.mode || "especes");
            echeanceMap.set(k, { ...item, paid: newPaid, rest: newRest, mode: itemMode });
            remaining -= deduct;
          }
        }
        if (remaining > 0 && cantineKeys.length === 0) {
          echeanceMap.set(vRubric, { rubric: v.rubric, amount: vAmt, paid: vAmt, rest: 0, mode: data.mode || "especes" });
        }
        return;
      }

      // Traitement Transport : déduction progressive STRICTEMENT chronologique sur les tranches Transport impayées
      if (vRubric.includes("TRANS") || vRubric.includes("CAR")) {
        const transportKeys = Array.from(echeanceMap.keys())
          .filter(k => k.includes("TRANS") || k.includes("CAR"))
          .sort((a, b) => getCategoryOrder(a) - getCategoryOrder(b));
        let remaining = vAmt;
        for (const k of transportKeys) {
          if (remaining <= 0) break;
          const item = echeanceMap.get(k)!;
          if (item.rest > 0) {
            const deduct = Math.min(item.rest, remaining);
            const newPaid = item.paid + deduct;
            const newRest = Math.max(0, item.amount - newPaid);
            const itemMode = item.paid > 0 ? (item.mode || "especes") : (data.mode || "especes");
            echeanceMap.set(k, { ...item, paid: newPaid, rest: newRest, mode: itemMode });
            remaining -= deduct;
          }
        }
        if (remaining > 0 && transportKeys.length === 0) {
          echeanceMap.set(vRubric, { rubric: v.rubric, amount: vAmt, paid: vAmt, rest: 0, mode: data.mode || "especes" });
        }
        return;
      }

      // Traitement Scolarité / Général : déduction progressive STRICTEMENT chronologique
      let remaining = vAmt;
      const unpaidKeys = Array.from(echeanceMap.keys())
        .filter(k => !k.includes("CANT") && !k.includes("TRANS") && !k.includes("CAR"))
        .sort((a, b) => getCategoryOrder(a) - getCategoryOrder(b));

      for (const k of unpaidKeys) {
        if (remaining <= 0) break;
        const item = echeanceMap.get(k)!;
        if (item.rest > 0) {
          const deduct = Math.min(item.rest, remaining);
          const newPaid = item.paid + deduct;
          const newRest = Math.max(0, item.amount - newPaid);
          const itemMode = item.paid > 0 ? (item.mode || "especes") : (data.mode || "especes");
          echeanceMap.set(k, { ...item, paid: newPaid, rest: newRest, mode: itemMode });
          remaining -= deduct;
        }
      }

      if (remaining > 0 && unpaidKeys.length === 0) {
        echeanceMap.set(vRubric, { rubric: v.rubric, amount: vAmt, paid: vAmt, rest: 0, mode: data.mode || "especes" });
      }
    });
  }

  // Formatage de la rubrique avec le mode de versement (Espèces, Coris Bank, Mobile Money, etc.)
  const formatRubricWithMode = (rubric: string, modeStr?: string, paidAmount: number = 0, isCurrentTransaction: boolean = false): string => {
    if (!rubric) return "";
    let clean = rubric.trim();

    if (clean.includes("(ESPÈCES") || clean.includes("(CORIS") || clean.includes("(MOBILE") || clean.includes("(CHÈQUE") || clean.includes("(VIREMENT")) {
      return clean;
    }

    if (paidAmount <= 0) return clean;

    const effectiveMode = modeStr || (isCurrentTransaction ? data.mode : "especes");
    const m = (effectiveMode || "especes").toLowerCase();
    let tag = "ESPÈCES";
    if (m.includes("coris")) tag = "CORIS BANK";
    else if (m.includes("mtn")) tag = "MTN MONEY";
    else if (m.includes("orange")) tag = "ORANGE MONEY";
    else if (m.includes("moov")) tag = "MOOV MONEY";
    else if (m.includes("wave")) tag = "WAVE";
    else if (m.includes("mobile")) tag = "MOBILE MONEY";
    else if (m.includes("cheque") || m.includes("chèque")) tag = "CHÈQUE BANCAIRE";
    else if (m.includes("virement") || m.includes("banque")) tag = "VIREMENT BANCAIRE";
    else if (m.includes("espece") || m.includes("comptant") || m.includes("caisse")) tag = "ESPÈCES";
    else tag = (effectiveMode || "ESPÈCES").toUpperCase();

    return `${clean} (${tag})`;
  };

  // Tri des échéances. Les tranches issues de l'échéancier réel de l'élève conservent
  // l'ordre que l'établissement leur a donné (l'API les sert par date d'échéance) : les
  // reclasser d'après leurs libellés ferait remonter un « 2ème vers. 05 nov. » avant un
  // « 2ème vers. 05 oct. » et donnerait un reçu qui ne ressemble plus à l'échéancier.
  // Les lignes reconstruites (cantine, transport, kits…) gardent l'ordre par rubrique.
  let realEcheances = Array.from(echeanceMap.values()).sort((a, b) => {
    const ordreA = (a as any).ordreEcheancier;
    const ordreB = (b as any).ordreEcheancier;
    if (ordreA !== undefined && ordreB !== undefined) return ordreA - ordreB;
    if (ordreA !== undefined) return -1;
    if (ordreB !== undefined) return 1;
    return getCategoryOrder(a.rubric) - getCategoryOrder(b.rubric);
  });

  // Les tranches officielles de l'échéancier sont conservées intégralement et fidèlement telles quelles.

  const isGlobalRecap =
    (data.receiptNumber || "").startsWith("RECAP-PAY-") ||
    data.type === "Recu global recapitulatif" ||
    (data.type || "").toLowerCase().includes("recap") ||
    (data.type || "").toLowerCase().includes("global");

  // Calculate sum from versementDetails if available
  let vSum = 0;
  if (data.versementDetails && data.versementDetails.length > 0) {
    vSum = data.versementDetails.reduce((acc, v) => acc + Number(v.amount || 0), 0);
  }

  const rawSumPaidFromEcheances = realEcheances.reduce(
    (acc, e) => acc + Number(e.paid || 0),
    0
  );

  let targetTotalPaid = Number(data.totalVersedToDate || 0);
  if (isGlobalRecap) {
    if (vSum > 0) targetTotalPaid = vSum;
    else if (rawSumPaidFromEcheances > 0) targetTotalPaid = rawSumPaidFromEcheances;
    else if (Number(data.amount) > 0) targetTotalPaid = Number(data.amount);
  } else {
    if (vSum > 0) targetTotalPaid = Math.max(vSum, Number(data.amount || 0));
    else if (Number(data.amount) > 0) targetTotalPaid = Number(data.amount);
    else if (rawSumPaidFromEcheances > 0) targetTotalPaid = rawSumPaidFromEcheances;
  }

  // Ré-attribution du montant total aux échéances UNIQUEMENT quand aucune échéance réelle
  // n'a été transmise (cas du barème générique de secours). Quand de vraies échéances
  // élève sont fournies, leurs montants payés/restants par tranche sont déjà exacts
  // (source : api_echeancier) et ne doivent jamais être réécrits — sinon un paiement fait
  // d'avance sur une tranche ultérieure peut apparaître à tort sur une tranche antérieure.
  if (!hasRealEcheances && targetTotalPaid > 0 && rawSumPaidFromEcheances !== targetTotalPaid) {
    let remainingPaidAlloc = targetTotalPaid;
    realEcheances.forEach((e) => {
      const p = Math.min(e.amount, remainingPaidAlloc);
      remainingPaidAlloc = Math.max(0, remainingPaidAlloc - p);
      e.paid = p;
      e.rest = Math.max(0, e.amount - p);
    });
  }

  realEcheances.forEach((e) => {
    e.amount = Number(e.amount || 0);
    e.paid = Math.min(e.amount, Math.max(0, Number(e.paid || 0)));
    e.rest = Math.max(0, e.amount - e.paid);
  });

  const finalSumPaid = realEcheances.reduce((acc, e) => acc + Number(e.paid || 0), 0);
  
  // Sum rest for ALL active student échéances (Scolarité + options souscrites : Cantine, Transport, Examen)
  const activeEcheancesForSolde = realEcheances.filter((e) => {
    const u = (e.rubric || "").toUpperCase();
    if (u.includes("APE") || u.includes("DROITS BAC") || u.includes("COTISATION APE")) return false;
    // Le reste des arriérés est déjà porté par « Arriérés années antérieures ».
    if (isArriereEcheance(e)) return false;
    const isDesab = (e as any).statut === "desabonne" || (e as any).is_desabonne || (e as any).isDesabonne;
    if (isDesab) return false;
    if ((e.amount || 0) <= 0 && (e.paid || 0) <= 0) return false;
    if ((e.paid || 0) > 0) return true;
    const category = getServiceCategory(e.rubric, e.service_type);
    if (category === "cantine") return shouldDisplayCantine && isCantineActive;
    if (category === "transport") return shouldDisplayTransport && isTransportActive;
    if (category === "examen") return shouldDisplayExamen;
    return true;
  });

  const cumulativeSumRest = activeEcheancesForSolde.reduce((acc, e) => {
    return acc + Number(e.rest || 0);
  }, 0);

  transactionAmount = isGlobalRecap ? finalSumPaid : (Number(data.amount) > 0 ? Number(data.amount) : (vSum > 0 ? vSum : finalSumPaid));
  amountWords = numberToFrenchWords(transactionAmount);

  // Total versé à ce jour = somme exacte de la colonne Payé du tableau d'échéances
  const totalVersed = isGlobalRecap
    ? transactionAmount
    : (finalSumPaid > 0
        ? finalSumPaid
        : Math.max(Number(data.totalVersedToDate || 0), transactionAmount));

  // Solde à ce jour = Reste à payer CUMULÉ sur les frais de scolarité ET les options souscrites
  const solde = cumulativeSumRest;

  const connectedUser = (typeof localStorage !== "undefined")
    ? (localStorage.getItem("user_full_name") || `${localStorage.getItem("user_nom") || ""} ${localStorage.getItem("user_prenom") || ""}`.trim() || localStorage.getItem("username"))
    : "";

  const rawEmetteur = data.caissierName;
  const emetteur = (rawEmetteur && rawEmetteur !== "yahkouyate" && rawEmetteur !== "Non renseigné" && rawEmetteur !== "undefined")
    ? rawEmetteur
    : (connectedUser || "Agent Caisse");

  const imprimePar = data.imprimeParName || connectedUser || emetteur;

  const modeLabels: Record<string, string> = {
    especes: "ESPÈCES",
    mobile_money: "MOBILE MONEY",
    wave: "MOBILE MONEY (WAVE)",
    mobile_money_wave: "MOBILE MONEY (WAVE)",
    mtn_money: "MOBILE MONEY (MTN MONEY)",
    mobile_money_mtn: "MOBILE MONEY (MTN MONEY)",
    mtn: "MOBILE MONEY (MTN MONEY)",
    orange_money: "MOBILE MONEY (ORANGE MONEY)",
    mobile_money_orange: "MOBILE MONEY (ORANGE MONEY)",
    orange: "MOBILE MONEY (ORANGE MONEY)",
    moov_money: "MOBILE MONEY (MOOV MONEY)",
    mobile_money_moov: "MOBILE MONEY (MOOV MONEY)",
    moov: "MOBILE MONEY (MOOV MONEY)",
    cheque: "CHÈQUE BANCAIRE",
    virement: "VIREMENT BANCAIRE",
    coris_bank: "DÉPÔT / VIREMENT CORIS BANK",
    coris: "DÉPÔT / VIREMENT CORIS BANK",
    banque: "BANQUE / CORIS BANK",
  };
  const rawModeLower = (data.mode || "especes").toLowerCase();
  const displayMode = modeLabels[rawModeLower] || (
    rawModeLower.includes("coris")
      ? "DÉPÔT / VIREMENT CORIS BANK"
      : rawModeLower.includes("mtn")
      ? "MOBILE MONEY (MTN MONEY)"
      : rawModeLower.includes("orange")
      ? "MOBILE MONEY (ORANGE MONEY)"
      : rawModeLower.includes("moov")
      ? "MOBILE MONEY (MOOV MONEY)"
      : rawModeLower.includes("wave")
      ? "MOBILE MONEY (WAVE)"
      : (data.mode ? data.mode.toUpperCase() : "ESPÈCES")
  );

  const defaultEcheances = realEcheances;

  const paidEcheances = realEcheances
    .filter((e) => Number(e.paid || 0) > 0)
    .map((e) => ({
      rubric: e.rubric,
      amount: e.paid,
      mode: (e as any).mode || displayMode,
    }));

  let defaultVersements = isGlobalRecap
    ? (paidEcheances.length > 0 ? paidEcheances : [{ rubric: "Total Versé à ce jour", amount: transactionAmount, mode: displayMode }])
    : (data.versementDetails && data.versementDetails.length > 0
        ? data.versementDetails
        : (data.amount && Number(data.amount) > 0
            ? [{ rubric: data.type ? `Versement — ${data.type.charAt(0).toUpperCase() + data.type.slice(1)}` : "Versement du jour", amount: Number(data.amount), mode: displayMode }]
            : paidEcheances));

  // Scindage automatique des versements par service (Scolarité, Cantine, Transport, Kits...)
  // lorsqu'un versement global ou unique couvre plusieurs prestations
  const isGenericSingleVersement =
    defaultVersements.length <= 1 &&
    paidEcheances.length > 1 &&
    (
      isGlobalRecap ||
      !data.versementDetails ||
      data.versementDetails.length === 0 ||
      defaultVersements.length === 0 ||
      (defaultVersements[0]?.rubric && (
        defaultVersements[0].rubric.includes("Scolarité") ||
        defaultVersements[0].rubric.includes("Versement") ||
        defaultVersements[0].rubric.includes("Forfait") ||
        defaultVersements[0].rubric.includes("Global") ||
        defaultVersements[0].rubric.includes("Tout Inclus") ||
        Number(defaultVersements[0].amount || 0) >= finalSumPaid
      ))
    );

  if (isGenericSingleVersement && paidEcheances.length > 0) {
    defaultVersements = paidEcheances;
  }

  if (defaultVersements.length === 0) {
    const tLower = (data.type || "").toLowerCase();
    let defaultLabel = "Frais de Scolarité";
    if (tLower.includes("anglais")) defaultLabel = "Frais Divers — Cours d'Anglais";
    else if (tLower.includes("informatique") || tLower.includes("tice")) defaultLabel = "Frais Divers — Cours d'Informatique";
    else if (tLower.includes("tenue") || tLower.includes("uniforme") || tLower.includes("polo")) defaultLabel = "Achats Tenues & Uniformes";
    else if (tLower.includes("achat") || tLower.includes("fourniture") || tLower.includes("livre") || tLower.includes("cahier") || tLower.includes("kit")) defaultLabel = "Achats Divers & Fournitures";
    else if (tLower.includes("divers") || tLower.includes("soutien")) defaultLabel = "Frais Divers & Activités";
    else if (tLower.includes("cant")) defaultLabel = "Frais de Cantine";
    else if (tLower.includes("trans") || tLower.includes("car")) defaultLabel = "Frais de Transport / Car";
    else if (tLower.includes("inscrip")) defaultLabel = "Frais d'Inscription";
    else if (tLower.includes("pack") || tLower.includes("forfait") || tLower.includes("compris")) defaultLabel = "Forfait Global (Scolarité + Cantine + Transport)";
    else if (tLower.includes("exam") || tLower.includes("bepc") || tLower.includes("bac") || tLower.includes("cepe")) defaultLabel = "Frais d'Examen Officiel";
    
    defaultVersements = [{ rubric: defaultLabel, amount: transactionAmount, mode: displayMode }];
  }

  const qrDataText = `https://hinneh-education.ci/verify?matricule=${encodeURIComponent(data.studentMatricule || "N/A")}&eleve=${encodeURIComponent(data.studentName)}&classe=${encodeURIComponent(data.studentClass)}&solde_restant=${solde}_FCFA&recu=${encodeURIComponent(data.receiptNumber)}${data.paymentId ? `&id_paiement=${data.paymentId}` : ""}`;
  const qrCodeUrl = generateQRCodeDataURI(qrDataText, 200);

  const currentRubrics = (data.versementDetails || []).map(v => (v.rubric || "").toUpperCase().trim());

  // ─── DÉPARTAGE PAR SERVICE (Scolarité, Cantine, Transport, Kits, Examen, Divers) ───
  const scolariteEcheances = defaultEcheances.filter(e => getServiceCategory(e.rubric, e.service_type) === "ecolage");
  const scolariteHorsArriere = scolariteEcheances.filter(e => !isArriereEcheance(e));
  const arriereEcheances = scolariteEcheances.filter(e => isArriereEcheance(e));
  const arrierePaid = arriereEcheances.reduce((acc, e) => acc + Number(e.paid || 0), 0);
  const cantineEcheances = defaultEcheances.filter(e => getServiceCategory(e.rubric, e.service_type) === "cantine");
  const transportEcheances = defaultEcheances.filter(e => getServiceCategory(e.rubric, e.service_type) === "transport");
  const kitsEcheances = defaultEcheances.filter(e => getServiceCategory(e.rubric, e.service_type) === "kits_achats");
  const examenEcheances = defaultEcheances.filter(e => getServiceCategory(e.rubric, e.service_type) === "examen");
  const diversEcheances = defaultEcheances.filter(e => {
    const cat = getServiceCategory(e.rubric, e.service_type);
    return cat === "frais_divers" || cat === "autres";
  });

  const scolPaid = scolariteHorsArriere.reduce((acc, e) => acc + Number(e.paid || 0), 0);
  const scolRest = scolariteHorsArriere.reduce((acc, e) => acc + Number(e.rest || 0), 0);

  const cantinePaid = cantineEcheances.reduce((acc, e) => acc + Number(e.paid || 0), 0);
  const cantineRest = cantineEcheances.reduce((acc, e) => acc + Number(e.rest || 0), 0);

  const transportPaid = transportEcheances.reduce((acc, e) => acc + Number(e.paid || 0), 0);
  const transportRest = transportEcheances.reduce((acc, e) => acc + Number(e.rest || 0), 0);

  const kitsPaid = kitsEcheances.reduce((acc, e) => acc + Number(e.paid || 0), 0);
  const kitsRest = kitsEcheances.reduce((acc, e) => acc + Number(e.rest || 0), 0);

  const examenPaid = examenEcheances.reduce((acc, e) => acc + Number(e.paid || 0), 0);
  const examenRest = examenEcheances.reduce((acc, e) => acc + Number(e.rest || 0), 0);

  const diversPaid = diversEcheances.reduce((acc, e) => acc + Number(e.paid || 0), 0);
  const diversRest = diversEcheances.reduce((acc, e) => acc + Number(e.rest || 0), 0);

  const renderSingleRow = (e: any) => {
    let cleanRubric = String(e.rubric || "").trim();

    const isDesab = (e as any).statut === "desabonne" || (e as any).is_desabonne || (e as any).isDesabonne;
    // Un mois désabonné jamais réglé ne doit plus apparaître sur le reçu (filtré en amont par
    // renderServiceSection) : ce garde-fou évite qu'il ne s'affiche quand même en grisé/tirets.
    if (isDesab && (e.paid || 0) <= 0) {
      return "";
    }

    const eKey = e.rubric.toUpperCase().trim();
    const isCurrentTxItem = currentRubrics.some(r => r === eKey || r.includes(eKey) || eKey.includes(r));
    const rubricWithMode = formatRubricWithMode(cleanRubric, (e as any).mode, e.paid, isCurrentTxItem);

    let pmtDateStr = "-";
    if ((e.paid || 0) > 0) {
      const rawDate = (e as any).date_paye || (e as any).date_acquittement || (e as any).date || data.date;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          const day = String(d.getDate()).padStart(2, "0");
          const month = String(d.getMonth() + 1).padStart(2, "0");
          pmtDateStr = `${day}/${month}/${d.getFullYear()}`;
        } else if (typeof rawDate === "string") {
          const parts = rawDate.split("T")[0].split("-");
          if (parts.length === 3) {
            pmtDateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
          } else {
            pmtDateStr = rawDate;
          }
        }
      }
    }

    // Mois désabonné mais réellement réglé avant la résiliation : on garde le montant payé
    // (jamais de tirets), avec une simple mention de contexte à côté de la rubrique.
    const amt = Number(e.amount || 0);
    const pd = Math.min(amt, Math.max(0, Number(e.paid || 0)));
    const rst = isDesab ? 0 : Math.max(0, amt - pd);
    const rubricDisplay = isDesab
      ? `${rubricWithMode} <span style="font-size: 7px; color: #dc2626; font-style: italic; font-weight: 700;">(Désabonné)</span>`
      : rubricWithMode;

    return `
      <tr>
        <td>${rubricDisplay}</td>
        <td class="text-center" style="font-size: 7px; color: #334155; white-space: nowrap;">${pmtDateStr}</td>
        <td class="text-right">${(isDesab ? pd : amt).toLocaleString("fr-FR")}</td>
        <td class="text-right">${pd.toLocaleString("fr-FR")}</td>
        <td class="text-right">${rst.toLocaleString("fr-FR")}</td>
      </tr>
    `;
  };

  const renderServiceSection = (title: string, bgColor: string, items: typeof defaultEcheances) => {
    const validItems = items.filter(e => {
      const u = (e.rubric || "").toUpperCase();
      if (u.includes("APE") || u.includes("DROITS BAC") || u.includes("COTISATION APE")) return false;
      const isDesab = (e as any).statut === "desabonne" || (e as any).is_desabonne || (e as any).isDesabonne;
      // Un mois désabonné jamais payé ne doit plus figurer du tout sur le reçu : on ne liste
      // que les mois réellement réglés (désabonnés ou non).
      if (isDesab && (e.paid || 0) <= 0) return false;
      if ((e.amount || 0) <= 0 && (e.paid || 0) <= 0 && !isDesab) return false;
      return true;
    });

    if (validItems.length === 0) return "";

    return `
      <tr class="service-header-row">
        <th colspan="5" style="background:${bgColor}; color:#ffffff; font-size:7.5px; font-weight:bold; text-align:left; padding:2px 4px; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #0f172a;">
          ${title}
        </th>
      </tr>
      ${validItems.map(renderSingleRow).join("")}
    `;
  };

  // Origine du barème appliqué à la scolarité, imprimée dans l'en-tête de la rubrique :
  // sans elle, un écart entre le reçu et la grille saisie ne peut pas être diagnostiqué
  // au guichet — on ne sait pas s'il faut corriger la grille ou réaligner l'élève.
  const libellesSourceScolarite: Record<string, string> = {
    echeancier_eleve: "Échéancier de l'élève",
    grille_tarifaire: "Grille tarifaire de l'école",
    aucune_grille: "Aucune grille tarifaire configurée",
  };
  const sourceScolariteTexte = data.sourceScolarite
    ? libellesSourceScolarite[data.sourceScolarite] || data.sourceScolarite
    : "";
  const titreScolarite = sourceScolariteTexte
    ? `FRAIS ÉCOLAGE & INSCRIPTION <span style="font-weight:normal; text-transform:none; opacity:0.85;">— source : ${sourceScolariteTexte}</span>`
    : "FRAIS ÉCOLAGE & INSCRIPTION";

  const renderEcheancesRows = () => {
    let html = "";
    // 1. Frais Écolage & Scolarité
    const htmlScolarite = renderServiceSection(titreScolarite, "#1e3a5f", scolariteEcheances);
    if (htmlScolarite) {
      html += htmlScolarite;
    } else if (data.sourceScolarite === "aucune_grille") {
      // Aucun montant n'est inventé : on l'écrit noir sur blanc plutôt que de laisser la
      // rubrique disparaître, ce qui laisserait croire que l'élève ne doit rien.
      html += `
        <tr class="service-header-row">
          <th colspan="5" style="background:#1e3a5f; color:#ffffff; font-size:7.5px; font-weight:bold; text-align:left; padding:2px 4px; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #0f172a;">
            FRAIS ÉCOLAGE &amp; INSCRIPTION
          </th>
        </tr>
        <tr>
          <td colspan="5" style="font-size:7px; font-style:italic; color:#b91c1c; padding:3px 4px;">
            Aucune grille tarifaire n'est configurée pour cette classe : aucun montant de scolarité ne peut être établi.
          </td>
        </tr>
      `;
    }

    // 2. Cantine Scolaire (si souscrit ou payé)
    if (shouldDisplayCantine || cantinePaid > 0) {
      html += renderServiceSection("CANTINE SCOLAIRE", "#0f766e", cantineEcheances);
    }

    // 3. Transport Scolaire (si souscrit ou payé)
    if (shouldDisplayTransport || transportPaid > 0) {
      html += renderServiceSection("TRANSPORT SCOLAIRE", "#0369a1", transportEcheances);
    }

    // 4. Kits & Tenues Scolaires
    if (kitsEcheances.length > 0 || kitsPaid > 0) {
      html += renderServiceSection("KITS & TENUES SCOLAIRES", "#475569", kitsEcheances);
    }

    // 5. Droits d'Examen & Frais Divers
    const examAndDivers = [...examenEcheances, ...diversEcheances];
    if (examAndDivers.length > 0 || shouldDisplayExamen || examenPaid > 0 || diversPaid > 0) {
      html += renderServiceSection("FRAIS D'EXAMEN & DIVERS", "#6b21a8", examAndDivers);
    }

    return html;
  };

  const renderVersementsRows = () =>
    defaultVersements
      .map((v) => {
        const cleanRubric = String(v.rubric || "").trim();
        const rubricWithMode = formatRubricWithMode(cleanRubric, (v as any).mode || data.mode, v.amount);
        return `
    <tr>
      <td class="border-td">${rubricWithMode}</td>
      <td class="border-td text-right font-bold">${Number(v.amount || 0).toLocaleString("fr-FR")}</td>
    </tr>
  `;
      })
      .join("");

  const photoSrc = getStudentPhotoUrl(data.studentPhoto);

  const attrByName = getStudentServiceAttribution(data.studentName);
  const attrByMat = getStudentServiceAttribution(data.studentMatricule);
  const hasCantine = Boolean(
    data.serviceCantine === true ||
    (data.serviceCantine !== false && (attrByName.cantine || attrByMat.cantine)) ||
    defaultVersements.some((v) => (v.rubric || "").toUpperCase().includes("CANT") && (v.amount || 0) > 0) ||
    data.type === "cantine"
  );
  const hasTransport = Boolean(
    data.serviceTransport === true ||
    (data.serviceTransport !== false && (attrByName.transport || attrByMat.transport)) ||
    defaultVersements.some((v) => ((v.rubric || "").toUpperCase().includes("TRANS") || (v.rubric || "").toUpperCase().includes("CAR")) && (v.amount || 0) > 0) ||
    data.type === "transport"
  );

  const serviceBadges: string[] = [];
  if (hasCantine) serviceBadges.push("🍽️ Cantine Scolaire");
  if (hasTransport) serviceBadges.push("🚌 Transport (Car)");

  const servicesInfoHtml = serviceBadges.length > 0
    ? `<div class="services-header-phone" style="font-size: 8.5px; font-weight: bold; color: #1e1b4b; margin-top: 2px; letter-spacing: -0.1px;">Service(s) Attribué(s) : ${serviceBadges.join(" &bull; ")}</div>`
    : "";

  const officialTarifObj = getOfficialCashTariffForClass(
    data.studentClass || "",
    effectiveSchoolCode || effectiveSchoolId,
    effectiveCity,
  );
  const officialTarifStr = data.tarifOfficielEspeces
    ? (typeof data.tarifOfficielEspeces === "number" ? `${data.tarifOfficielEspeces.toLocaleString("fr-FR")} F CFA` : String(data.tarifOfficielEspeces))
    : officialTarifObj.label;

  const renderCouponHTML = () => `
    <div class="coupon">
      <!-- TOP HEADER -->
      <div class="coupon-header">
        <div class="header-left">
          <div class="brand-row">
            <img src="https://hinneh-education.ci/images/hinneh_logo_20260507_234919.png" class="logo" alt="Logo Hinneh" />
            <div>
              <div class="republique">RÉPUBLIQUE DE CÔTE D'IVOIRE</div>
              <div class="ministere">MINISTÈRE DE L'ÉDUCATION NATIONALE, DE L'ALPHABÉTISATION ET DE L'ENSEIGNEMENT TECHNIQUE</div>
            </div>
          </div>
          <div class="college-name">${resolvedSchool.fullName}</div>
          ${resolvedSchool.addressLine ? `<div class="adresse">${resolvedSchool.addressLine}</div>` : ""}
          ${resolvedSchool.phoneLine ? `<div class="contacts-phone">📞 Tél: ${resolvedSchool.phoneLine}</div>` : ""}
          ${servicesInfoHtml}

                    <!-- RECU DETAILS METADATA — départagé par service -->
          <div class="recu-details">
            <p><strong>Reçu de Paiement N° :</strong> <span class="font-bold">${data.receiptNumber}</span></p>
            ${data.paymentId ? `<p><strong>ID Paiement :</strong> <span style="font-weight:700; font-size:10pt; color:#1e3a5f; letter-spacing:0.5px; background:#eef3fa; padding:1px 6px; border-radius:3px;">#${data.paymentId}</span></p>` : ""}
            <p><strong>Date :</strong> ${dateFormattedStr}</p>
            <p><strong>Date d'acquittement :</strong> ${dateAcquittementFormattedStr}</p>
            <p><strong>Classe :</strong> <span class="font-bold">${data.studentClass}</span></p>
            <p><strong>Élève :</strong> <span class="font-bold uppercase text-indigo-950">${data.studentName}</span></p>
            <p><strong>Montant Versé :</strong> <span class="font-bold">${transactionAmount.toLocaleString("fr-FR")} ${amountWords} FCFA</span></p>
            <p><strong>Mode de Règlement :</strong> <span class="font-bold">${displayMode}</span></p>
            ${(data.transactionNumber && data.transactionNumber !== "N/A" && data.transactionNumber.trim() !== "") ? `<p><strong>N° Transaction / Réf. Opérateur :</strong> <span class="font-bold font-mono" style="color: #0f2b5c; font-size: 8pt; background: #eef3fa; padding: 1px 5px; border-radius: 3px; border: 1px solid #cbd5e1;">${data.transactionNumber}</span></p>` : ""}

            <!-- DÉPARTAGE PAR SERVICE DES VERSEMENTS & RESTES -->
            <div style="margin-top: 3px; padding-top: 3px; border-top: 1px dashed #cbd5e1; font-size: 8px; line-height: 1.25;">
              <p><strong>• Scolarité :</strong> Versé: <span class="font-bold">${scolPaid.toLocaleString("fr-FR")}</span> | Reste: <span style="color:#dc2626; font-weight:bold;">${scolRest.toLocaleString("fr-FR")}</span></p>
              ${arrierePaid > 0 ? `<p><strong>• Arriérés réglés :</strong> Versé: <span class="font-bold">${arrierePaid.toLocaleString("fr-FR")}</span></p>` : ''}
              ${(shouldDisplayCantine || cantinePaid > 0) ? `<p><strong>• Cantine ${!isCantineActive && cantinePaid > 0 ? '<span style="font-size:7px; color:#dc2626; font-style:italic; font-weight:bold;">(Désabonné)</span>' : ''} :</strong> Versé: <span class="font-bold">${cantinePaid.toLocaleString("fr-FR")}</span> | Reste: <span style="color:#dc2626; font-weight:bold;">${cantineRest.toLocaleString("fr-FR")}</span></p>` : ''}
              ${(shouldDisplayTransport || transportPaid > 0) ? `<p><strong>• Transport ${!isTransportActive && transportPaid > 0 ? '<span style="font-size:7px; color:#dc2626; font-style:italic; font-weight:bold;">(Désabonné)</span>' : ''} :</strong> Versé: <span class="font-bold">${transportPaid.toLocaleString("fr-FR")}</span> | Reste: <span style="color:#dc2626; font-weight:bold;">${transportRest.toLocaleString("fr-FR")}</span></p>` : ''}
              ${kitsPaid > 0 ? `<p><strong>• Kits & Tenues :</strong> Versé: <span class="font-bold">${kitsPaid.toLocaleString("fr-FR")}</span></p>` : ''}
              ${(examenPaid > 0 || shouldDisplayExamen) ? `<p><strong>• Droit d'Examen :</strong> Versé: <span class="font-bold">${examenPaid.toLocaleString("fr-FR")}</span> | Reste: <span style="color:#dc2626; font-weight:bold;">${examenRest.toLocaleString("fr-FR")}</span></p>` : ''}
              ${diversPaid > 0 ? `<p><strong>• Frais Divers :</strong> Versé: <span class="font-bold">${diversPaid.toLocaleString("fr-FR")}</span></p>` : ''}

              <div style="margin-top: 2px; padding-top: 2px; border-top: 1px solid #94a3b8;">
                <p><strong>Cumul Total Versé :</strong> <span class="font-bold">${totalVersed.toLocaleString("fr-FR")} FCFA</span></p>
                <p class="solde-line"><strong>Reste Global à ce jour :</strong> <span class="solde-val">${solde.toLocaleString("fr-FR")} FCFA</span></p>
                ${Number(data.arrieresAnterieurs) > 0 ? `<p class="solde-line"><strong>Arriérés années antérieures :</strong> <span class="solde-val">${Number(data.arrieresAnterieurs).toLocaleString("fr-FR")}</span></p>
                <p><strong>Total restant à recouvrer :</strong> <span class="font-bold">${(solde + Number(data.arrieresAnterieurs)).toLocaleString("fr-FR")}</span></p>` : ""}
              </div>
            </div>
          </div>

          <!-- TABLEAU DES VERSEMENTS DU JOUR -->
          <table class="versements-table">
            <thead>
              <tr>
                <th class="border-th">Rubrique</th>
                <th class="border-th text-right" style="width: 35%;">Montant</th>
              </tr>
            </thead>
            <tbody>
              ${renderVersementsRows()}
            </tbody>
          </table>
        </div>

        <div class="header-center">
          ${photoSrc ? `<img src="${photoSrc}" class="student-photo" alt="Photo élève" />` : '<div class="student-photo-placeholder"><span>PHOTO</span></div>'}
          <div class="qr-box">
            <img src="${qrCodeUrl}" alt="QR Code ${data.studentMatricule || ""}" width="62" height="62" style="display: block; width: 62px; height: 62px; object-fit: contain; margin-top: 2px; border: none; padding: 0;" />
          </div>
        </div>

        <div class="header-right">
          <div class="echeances-title">Échéances</div>
          <table class="echeances-table">
            <thead>
              <tr>
                <th>Rubrique</th>
                <th class="text-center">Date</th>
                <th class="text-right">Montant</th>
                <th class="text-right">Payé</th>
                <th class="text-right">Reste</th>
              </tr>
            </thead>
            <tbody>
              ${renderEcheancesRows()}
            </tbody>
          </table>
        </div>
      </div>

      <!-- FOOTER & SIGNATURES -->
      <div class="coupon-footer">
        <div class="footer-left">
          <p><strong>${
            (typeof localStorage !== "undefined" && localStorage.getItem("user_role")) 
              ? (localStorage.getItem("user_role")?.charAt(0).toUpperCase() + localStorage.getItem("user_role")?.slice(1)) 
              : "Caissier(e)"
          } :</strong> ${emetteur}</p>
          <p><strong>Imprimé par :</strong> ${imprimePar}</p>
          <p class="leconome">L'ÉCONOME</p>
          <p>Imprimé le : ${printDateStr}</p>
          <p class="mention-legale">Toute scolarité entamée est due et aucune somme versée n'est remboursable</p>
        </div>
        <div class="footer-right">
          <p class="sig-title">Signature et Cachet</p>
          <div class="stamp-space"></div>
        </div>
      </div>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Reçu de Paiement - ${data.receiptNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    @page {
      size: A4 portrait;
      margin: 3mm 4mm;
    }

    html, body {
      height: auto !important;
      overflow: visible !important;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #fff;
      color: #0f172a;
      font-size: 11px;
      line-height: 1.2;
      width: 198mm;
      margin: 0 auto;
    }

    .action-bar {
      max-width: 100%;
      margin: 6px auto;
      text-align: center;
    }

    .btn-print {
      background: #1e3a8a;
      color: #fff;
      border: none;
      padding: 8px 20px;
      font-size: 13px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
    }

    .page-container {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 2mm;
      padding: 1mm;
      box-sizing: border-box;
    }

    .coupon {
      border: 1.5px dashed #475569;
      border-radius: 5px;
      padding: 6px 10px;
      background: #ffffff;
      position: relative;
      box-sizing: border-box;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .coupon-separator {
      text-align: center;
      font-size: 7.5px;
      font-weight: bold;
      color: #475569;
      margin: 1mm 0;
      border-top: 1px dashed #94a3b8;
      padding-top: 1px;
    }

    .coupon-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
      border-bottom: 1.5px solid #0f172a;
      padding-bottom: 4px;
      margin-bottom: 4px;
    }

    /* La colonne de gauche accueille aussi le bloc de détails du reçu et le tableau des
       versements du jour, qui occupent l'espace resté libre sous les services attribués. */
    .header-left { flex: 1.2; min-width: 0; }
    .brand-row { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
    .logo { height: 36px; width: auto; object-fit: contain; }
    .republique { font-size: 8.5px; font-weight: bold; color: #1e3a8a; }
    .ministere { font-size: 7.5px; font-weight: 600; color: #475569; }
    .college-name { font-size: 13.5px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-top: 1px; }
    .adresse { font-size: 9.5px; color: #334155; font-weight: 600; }
    .contacts-phone { font-size: 10px; color: #1e3a8a; font-weight: bold; margin-top: 1px; }

    .header-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    .student-photo {
      width: 46px;
      height: 54px;
      object-fit: cover;
      border-radius: 4px;
      border: 1.5px solid #0f172a;
      background: #ffffff;
      display: block;
    }
    .student-photo-placeholder {
      width: 46px;
      height: 54px;
      border-radius: 4px;
      border: 1.5px dashed #475569;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8.5px;
      font-weight: 900;
      color: #334155;
      letter-spacing: 0.5px;
    }
    .echeances-table th {
      border: 1px solid #0f172a;
      padding: 1px 2px;
      background: #f1f5f9;
      font-weight: bold;
      vertical-align: middle;
      text-align: center;
      font-size: 7.5px;
    }
    .echeances-table td {
      border: 1px solid #0f172a;
      padding: 1px 2px;
      vertical-align: middle;
      font-size: 7.5px;
      line-height: 1.1;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }

    /* RECU DETAILS — placé dans la colonne de gauche, sous les services attribués */
    .recu-details {
      margin-top: 4px;
      margin-bottom: 3px;
      padding-top: 3px;
      border-top: 1px solid #cbd5e1;
      font-size: 8.5px;
      line-height: 1.2;
    }
    .recu-details p { margin-bottom: 1px; }
    .font-bold { font-weight: bold; }
    .solde-line { font-size: 9px; }
    .solde-val { font-weight: 900; color: #dc2626; }

    /* VERSEMENTS TABLE */
    .versements-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 3px;
      font-size: 8px;
      border: 1px solid #0f172a;
    }
    .border-th {
      border: 1px solid #0f172a;
      background: #f1f5f9;
      padding: 1px 4px;
      font-weight: bold;
      text-align: left;
    }
    .border-td {
      border: 1px solid #0f172a;
      padding: 1px 4px;
    }

    /* FOOTER */
    .coupon-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 7.5px;
      margin-top: 2px;
    }
    .footer-left { width: 68%; line-height: 1.2; }
    .leconome { font-weight: 900; font-size: 8.5px; margin: 1px 0; }
    .ref-line  { color: #475569; font-size: 7px; }
    .mention-legale {
      font-size: 6.5px;
      font-style: italic;
      color: #334155;
      margin-top: 1px;
      font-weight: bold;
    }
    .footer-right { width: 28%; text-align: right; }
    .sig-title { font-weight: bold; font-size: 8px; margin-bottom: 2px; }
    .stamp-space {
      height: 28px;
      display: flex;
      justify-content: flex-end;
      align-items: center;
    }

    @media print {
      html, body {
        height: auto !important;
        overflow: visible !important;
      }
      body { background: #fff; padding: 0; margin: 0; }
      .action-bar { display: none !important; }
      .page-container {
        border: none;
        padding: 0;
        gap: 2mm;
      }
      .coupon {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="action-bar">
    <span>🖨️ Reçu de Paiement Officiel (${resolvedSchool.fullName || 'Établissement Hînneh'})</span>
    <button class="btn-print" onclick="window.print()">Imprimer le Reçu</button>
  </div>

  <div class="page-container">
    ${renderCouponHTML()}

    <div class="coupon-separator">
      <span>✂ Partie à découper — Exemplaire Caisse / École ✂</span>
    </div>

    ${renderCouponHTML()}
  </div>

  <script>
    (function() {
      var printed = false;
      function triggerPrint() {
        if (printed) return;
        printed = true;
        window.print();
      }
      if (document.readyState === 'complete') {
        setTimeout(triggerPrint, 600);
      } else {
        window.addEventListener('load', function() { setTimeout(triggerPrint, 600); });
        setTimeout(triggerPrint, 1200);
      }
    })();
  </script>
</body>
</html>`;
}

export function printReceipt(data: ReceiptData, targetWindow?: Window | null): void {
  const html = generateReceiptHTML(data);

  let printWindow: Window | null = targetWindow || null;
  if (!printWindow || printWindow.closed) {
    try {
      printWindow = window.open("", "_blank", "width=950,height=950");
    } catch (e) {
      printWindow = null;
    }
  }

  if (printWindow && !printWindow.closed) {
    try {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        try {
          if (printWindow && !printWindow.closed) {
            printWindow.print();
          }
        } catch (err) {
          console.error("Erreur declenchement printWindow.print():", err);
        }
      }, 400);
      return;
    } catch (e) {
      console.error("Erreur écriture window print:", e);
    }
  }

  // Fallback 1: Hidden iframe avec srcdoc (fonctionne dans tous les navigateurs sans popup)
  try {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.opacity = "0.01";
    iframe.style.border = "0";
    iframe.srcdoc = html;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error("Iframe print error:", e);
        } finally {
          setTimeout(() => {
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
          }, 3000);
        }
      }, 500);
    };
  } catch (e) {
    console.error("Fallback iframe error:", e);
  }
}

export async function downloadReceiptPDF(data: ReceiptData): Promise<void> {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = "794px";
  iframe.style.height = "1123px";
  iframe.style.border = "none";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  try {
    const html2pdfModule = await import("html2pdf.js");
    const html2pdf = html2pdfModule.default || html2pdfModule;
    const htmlStr = generateReceiptHTML(data);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error("Impossible d'accéder au document de l'iframe");
    }

    iframeDoc.open();
    iframeDoc.write(htmlStr);
    iframeDoc.close();

    const actionBar = iframeDoc.querySelector(".action-bar") as HTMLElement;
    if (actionBar) actionBar.style.display = "none";

    await new Promise((resolve) => setTimeout(resolve, 300));

    const elementToRender = iframeDoc.querySelector(".receipt-card") || iframeDoc.body;

    const opt = {
      margin: [2, 2, 2, 2],
      filename: `Recu_Paiement_${data.receiptNumber || 'Hinneh'}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff", windowWidth: 794 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };

    await html2pdf().set(opt).from(elementToRender).save();
  } catch (err) {
    console.error("Erreur lors du téléchargement du PDF de reçu :", err);
    printReceipt(data);
  } finally {
    if (iframe.parentNode) {
      document.body.removeChild(iframe);
    }
  }
}
