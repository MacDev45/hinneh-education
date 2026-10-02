/**
 * supervisorStats.ts
 *
 * Agrégations du tableau de bord Superviseur, calculées exclusivement à partir
 * des données enregistrées en base : la fiche élève (scolarité due, total déposé)
 * et le journal des paiements (montant, type, date).
 *
 * Aucun montant n'est inventé. Un chiffre absent vaut zéro et se voit comme tel
 * sur le graphique : c'est préférable à une valeur de repli qui donnerait
 * l'illusion d'un recouvrement inexistant. De même, aucun mois à venir n'est
 * projeté — la courbe s'arrête au mois en cours.
 *
 * Répartition des sources, chaque graphique lisant celle qui porte réellement
 * la dimension dont il a besoin :
 *   - montants par élève et par niveau  → fiche élève (AU_SCOLARITE, AU_TOTALDEPOT),
 *     champs tenus à jour par le backend à chaque encaissement ;
 *   - ventilation par rubrique et évolution mensuelle → journal des paiements,
 *     seul à porter le type et la date de chaque opération.
 */

export interface PaiementBrut {
  montant?: number | string | null;
  type?: string | null;
  date?: string | null;
  date_paiement?: string | null;
  eleve_id?: number | string | null;
  statut?: string | null;
}

export interface EleveBrut {
  id?: number | string | null;
  AU_SCOLARITE?: number | string | null;
  scolariteDue?: number | string | null;
  scolarite?: number | string | null;
  montant_scolarite?: number | string | null;
  frais_scolarite?: number | string | null;
  montant_total?: number | string | null;
  montant_annuel?: number | string | null;
  totalDu?: number | string | null;
  total_du?: number | string | null;
  AU_TOTALDEPOT?: number | string | null;
  totalPaye?: number | string | null;
  total_paye?: number | string | null;
  montant_versement?: number | string | null;
}

const nombre = (valeur: unknown): number => {
  const n = Number(valeur);
  return Number.isFinite(n) ? n : 0;
};

/** Scolarité annuelle due par l'élève, telle qu'enregistrée sur sa fiche, sa classe ou son niveau. */
export const scolariteDue = (eleve?: any | null, classesList?: any[]): number => {
  if (!eleve) return 0;
  const directVal =
    eleve.AU_SCOLARITE ??
    eleve.scolariteDue ??
    eleve.scolarite ??
    eleve.montant_scolarite ??
    eleve.frais_scolarite ??
    eleve.montant_total ??
    eleve.montant_annuel ??
    eleve.totalDu ??
    eleve.total_du;
  const n = nombre(directVal);
  if (n > 0) return n;

  // Si non défini directement sur l'élève, chercher le montant sur sa classe
  if (classesList && Array.isArray(classesList) && (eleve.classe_id || eleve.className || eleve.CE_LIBELLE)) {
    const cl = classesList.find(
      (c) =>
        (eleve.classe_id && String(c.id) === String(eleve.classe_id)) ||
        (eleve.className && (c.nom === eleve.className || c.CE_LIBELLE === eleve.className))
    );
    if (cl) {
      const clTarif =
        cl.scolarite ??
        cl.frais_scolarite ??
        cl.montant_scolarite ??
        (Number(cl.frais_inscription || 0) + Number(cl.frais_scolarite || 0));
      const clNom = nombre(clTarif);
      if (clNom > 0) return clNom;
    }
  }

  // Aucun montant par niveau n'est supposé ici : un tarif inventé se propagerait dans les
  // statistiques de recouvrement et ferait apparaître des impayés qui n'existent pas.
  // Le dépôt déjà encaissé est le seul minimum certain ; à défaut, la scolarité due est
  // inconnue et vaut 0 tant que la classe ou l'élève ne porte pas de montant réel.
  const dep = nombre(eleve.AU_TOTALDEPOT ?? eleve.montant_versement);
  if (dep > 0) return dep;

  return 0;
};

/** Total déjà versé par l'élève, calculé d'après les paiements réels validés ou sa fiche. */
export const totalVerse = (eleve?: EleveBrut | null, paymentsList?: PaiementBrut[]): number => {
  if (!eleve) return 0;
  let fromPayments = 0;
  if (paymentsList && Array.isArray(paymentsList) && eleve.id) {
    const studentPayments = paymentsList.filter(
      (p) => String(p.eleve_id) === String(eleve.id) && paiementRetenu(p)
    );
    fromPayments = studentPayments.reduce((sum, p) => sum + nombre(p.montant), 0);
  }
  const fromDirect = nombre(eleve.AU_TOTALDEPOT ?? eleve.totalPaye ?? eleve.total_paye ?? eleve.montant_versement);
  return Math.max(fromPayments, fromDirect);
};

/** Un paiement annulé ne compte dans aucun agrégat. */
export const paiementRetenu = (p: PaiementBrut): boolean =>
  String(p?.statut || "").toLowerCase() !== "annule";

// ─── Ventilation par rubrique ────────────────────────────────────────────────

export interface Rubrique {
  name: string;
  value: number;
  color: string;
}

/** Regroupe les types de paiement de la base en rubriques lisibles. */
export function rubriqueDuPaiement(type: unknown): string {
  const t = String(type || "").toLowerCase();
  if (!t) return "Autres";
  if (t.includes("cant")) return "Cantine";
  if (t.includes("transp") || t === "car") return "Transport";
  if (t.includes("examen")) return "Examen";
  if (t.includes("inscription") || t.includes("frais_annexe")) return "Inscription";
  if (t.includes("scolarite") || t.includes("scolarité")) return "Scolarité";
  if (
    t.includes("uniforme") ||
    t.includes("tenue") ||
    t.includes("polo") ||
    t.includes("kit") ||
    t.includes("fourniture")
  ) {
    return "Kits & Tenues";
  }
  if (t.includes("cours_") || t.includes("anglais") || t.includes("informatique")) {
    return "Cours d'appoint";
  }
  return "Frais divers";
}

const COULEURS_RUBRIQUES: Record<string, string> = {
  "Scolarité": "#6366f1",
  Inscription: "#8b5cf6",
  Cantine: "#0284c7",
  Transport: "#10b981",
  Examen: "#f59e0b",
  "Kits & Tenues": "#ec4899",
  "Cours d'appoint": "#14b8a6",
  "Frais divers": "#64748b",
  Autres: "#94a3b8",
};

/**
 * Ventilation des encaissements par rubrique, d'après le type réel des paiements.
 * Seules les rubriques effectivement encaissées apparaissent : pas de part à zéro
 * affichée pour un service que l'établissement ne facture pas.
 */
export function ventilationParRubrique(paiements: PaiementBrut[]): Rubrique[] {
  const totaux = new Map<string, number>();
  for (const p of paiements || []) {
    if (!paiementRetenu(p)) continue;
    const montant = nombre(p.montant);
    if (montant <= 0) continue;
    const rubrique = rubriqueDuPaiement(p.type);
    totaux.set(rubrique, (totaux.get(rubrique) || 0) + montant);
  }
  return Array.from(totaux.entries())
    .map(([name, value]) => ({ name, value, color: COULEURS_RUBRIQUES[name] || COULEURS_RUBRIQUES.Autres }))
    .sort((a, b) => b.value - a.value);
}

// ─── Évolution mensuelle ─────────────────────────────────────────────────────

/** Mois de l'année scolaire, de septembre à mai, dans l'ordre du calendrier. */
const MOIS_ANNEE_SCOLAIRE: { libelle: string; mois: number; anneeSuivante: boolean }[] = [
  { libelle: "Septembre", mois: 9, anneeSuivante: false },
  { libelle: "Octobre", mois: 10, anneeSuivante: false },
  { libelle: "Novembre", mois: 11, anneeSuivante: false },
  { libelle: "Décembre", mois: 12, anneeSuivante: false },
  { libelle: "Janvier", mois: 1, anneeSuivante: true },
  { libelle: "Février", mois: 2, anneeSuivante: true },
  { libelle: "Mars", mois: 3, anneeSuivante: true },
  { libelle: "Avril", mois: 4, anneeSuivante: true },
  { libelle: "Mai", mois: 5, anneeSuivante: true },
];

/** Année de départ de l'année scolaire en cours (septembre fait basculer). */
export function anneeScolaireDeDepart(aujourdHui: Date = new Date()): number {
  return aujourdHui.getMonth() + 1 >= 9 ? aujourdHui.getFullYear() : aujourdHui.getFullYear() - 1;
}

export interface PointMensuel {
  mois: string;
  "Recouvrement Cumulé": number | null;
  "Impayés Reste": number | null;
}

/**
 * Recouvrement cumulé mois par mois, à partir des dates réelles des paiements.
 *
 * Les mois postérieurs au mois en cours valent `null` : la courbe s'y interrompt
 * au lieu d'extrapoler un encaissement qui n'a pas eu lieu.
 */
export function recouvrementMensuel(
  paiements: PaiementBrut[],
  totalDu: number,
  aujourdHui: Date = new Date(),
): PointMensuel[] {
  const debut = anneeScolaireDeDepart(aujourdHui);

  const parMois = new Map<string, number>();
  for (const p of paiements || []) {
    if (!paiementRetenu(p)) continue;
    const montant = nombre(p.montant);
    if (montant <= 0) continue;
    const brut = p.date || p.date_paiement;
    if (!brut) continue;
    const d = new Date(brut);
    if (Number.isNaN(d.getTime())) continue;
    const cle = `${d.getFullYear()}-${d.getMonth() + 1}`;
    parMois.set(cle, (parMois.get(cle) || 0) + montant);
  }

  let cumul = 0;
  return MOIS_ANNEE_SCOLAIRE.map(({ libelle, mois, anneeSuivante }) => {
    const annee = anneeSuivante ? debut + 1 : debut;
    cumul += parMois.get(`${annee}-${mois}`) || 0;

    // Le mois n'est pas encore commencé : on ne trace rien plutôt que d'inventer.
    const finDuMois = new Date(annee, mois, 0);
    if (finDuMois.getTime() > aujourdHui.getTime() && !memeMois(annee, mois, aujourdHui)) {
      return { mois: libelle, "Recouvrement Cumulé": null, "Impayés Reste": null };
    }

    return {
      mois: libelle,
      "Recouvrement Cumulé": cumul,
      "Impayés Reste": Math.max(0, totalDu - cumul),
    };
  });
}

function memeMois(annee: number, mois: number, reference: Date): boolean {
  return reference.getFullYear() === annee && reference.getMonth() + 1 === mois;
}
