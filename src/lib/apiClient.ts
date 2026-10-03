import axios from "axios";
import type {
  School,
  Student,
  Staff,
  Payment,
  Evaluation,
  ClassRoom,
  Attendance,
  Seance,
  Pointage,
} from "@/lib/index";
import { filterSchoolsByUserCity } from "@/lib/utils";

// Référentiel des années scolaires : une seule est active à la fois.
export interface AnneeScolaire {
  id: number;
  libelle: string;      // 'AAAA-AAAA', ex. '2026-2027'
  date_debut: string;
  date_fin: string;
  active: boolean;
  date_creation: string;
}

// Décompte des places de rendez-vous d'une journée, créneau par créneau.
export interface RendezVousCreneau {
  heure: string; // 'HH:MM'
  capacite: number; // sous-quota du créneau
  occupees: number;
  restantes: number; // déjà plafonné par les places restantes de la journée
  complet: boolean;
}

export interface RendezVousDisponibilites {
  date: string;
  libelle_date: string; // ex. 'samedi 5 septembre'
  ecole_id: number | null;
  capacite_jour: number;
  capacite_creneau: number;
  places_occupees: number;
  places_restantes: number;
  complet: boolean;
  creneaux: RendezVousCreneau[];
}

// Une journée d'accueil ouverte, telle que proposée dans la liste déroulante.
export interface RendezVousJournee {
  date: string;      // 'AAAA-MM-JJ'
  libelle: string;   // 'samedi 5 septembre'
  places_restantes: number;
  complet: boolean;
}

export type TypeDemarche = "inscription" | "reinscription";

export interface RendezVousCycleNiveaux {
  cycle: string;      // ex. 'Primaire'
  niveaux: string[];
}

// Tout ce dont le formulaire public a besoin pour se construire.
export interface RendezVousOptions {
  journees: RendezVousJournee[];
  creneaux: string[];
  capacite_jour: number;
  capacite_creneau: number;
  /** Par démarche, pour la validation. */
  niveaux: Record<TypeDemarche, string[]>;
  /** Regroupés par cycle, pour l'affichage de la liste déroulante. */
  niveaux_par_cycle: RendezVousCycleNiveaux[];
  types_demarche: TypeDemarche[];
}

// Axios instance with base URL set to the Vite proxy endpoint
const api = axios.create({
  baseURL: "",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT token and School Scope to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach School Scope headers
    let schoolCode =
      localStorage.getItem("user_ecole_code") ||
      localStorage.getItem("code_etablissement") ||
      localStorage.getItem("selected_school_code");
    let schoolId =
      localStorage.getItem("user_ecole_id") ||
      localStorage.getItem("ecole_id");

    if (!schoolCode || !schoolId) {
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const userObj = JSON.parse(userStr);
          schoolCode =
            schoolCode ||
            userObj.code_etablissement ||
            userObj.ecole_code ||
            userObj.ET_CODEETABLISSEMENT;
          schoolId = schoolId || userObj.ecole_id || userObj.IDETABLISSEMENT;
        }
      } catch (e) {
        // ignore parse error
      }
    }

    if (config.headers) {
      if (schoolCode && schoolCode !== "undefined" && schoolCode !== "null") {
        config.headers["X-School-Code"] = schoolCode;
      }
      if (schoolId && schoolId !== "undefined" && schoolId !== "null") {
        config.headers["X-School-Id"] = String(schoolId);
      }
    }

    // Inject ecole_id / code_etablissement for school-scoped GET endpoints
    const ecoleScopedEndpoints = [
      "/api/students/",
      "/api/classes/",
      "/api/salles/",
      "/api/staff/",
      "/api/finances/payments",
      "/api/finances/stats",
      "/api/evaluations",
      "/api/attendance",
      "/api/bulletins",
      "/api/seances",
      "/api/transport/",
      "/api/echeancier/",
      "/api/caisse/",
      "/api/stocks/",
      "/api/taches/",
      "/api/courriers/",
      "/api/archives/",
      "/api/bibliotheque/",
    ];
    if (config.method?.toLowerCase() === "get") {
      const url = config.url || "";
      const isScoped = ecoleScopedEndpoints.some((prefix) =>
        url.startsWith(prefix),
      );
      if (isScoped) {
        const params: any = { ...config.params };
        if (schoolId && schoolId !== "undefined" && schoolId !== "null" && params.ecole_id === undefined) {
          params.ecole_id = Number(schoolId);
        }
        if (schoolCode && schoolCode !== "undefined" && schoolCode !== "null" && params.code_etablissement === undefined) {
          params.code_etablissement = schoolCode;
        }
        config.params = params;
      }
    }

    // Clean query parameters of any NaN, null, or undefined values
    if (config.params) {
      const clean: any = {};
      for (const [key, value] of Object.entries(config.params)) {
        if (
          value !== undefined &&
          value !== null &&
          (typeof value !== "number" || !isNaN(value)) &&
          value !== "NaN" &&
          value !== ""
        ) {
          clean[key] = value;
        }
      }
      config.params = clean;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor: handle 401 (invalid/expired token) and format 422 error details
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token invalid or expired — clear storage but don't redirect automatically
      // so the user sees the error in the form toast
      const token = localStorage.getItem("auth_token");
      if (
        token &&
        (token.startsWith("mock_token_") || token.startsWith("dev_token_"))
      ) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_role");
        localStorage.removeItem("username");
        window.location.href = "/";
      }
    }

    // Format FastAPI 422 validation errors array/object to clean string
    if (error.response?.data) {
      const data = error.response.data;
      if (data.detail) {
        if (Array.isArray(data.detail)) {
          data.detail = data.detail
            .map((e: any) => {
              const locStr = e.loc ? e.loc.join(".") : "";
              return `${locStr ? locStr + ": " : ""}${e.msg || JSON.stringify(e)}`;
            })
            .join(", ");
        } else if (typeof data.detail === "object") {
          data.detail = JSON.stringify(data.detail);
        }
      }
    }

    return Promise.reject(error);
  },
);

// Helper to convert DB date strings to JS Date objects safely
const parseDate = (d: any): Date => {
  if (!d) return new Date();
  return new Date(d);
};

// ─── TRANSLATION MAPPERS (DB -> FRONTEND) ────────────────────────────────────

export const mapSchool = (dbSchool: any): School => {
  const idVal =
    dbSchool.id !== undefined ? dbSchool.id : dbSchool.IDETABLISSEMENT;
  const classCountVal =
    dbSchool.class_count !== undefined
      ? dbSchool.class_count
      : dbSchool.ET_NOMBRECLASSES;
  const staffCountVal =
    dbSchool.staff_count !== undefined
      ? dbSchool.staff_count
      : dbSchool.ET_NOMBREPERSONNEL;
  const perfScoreVal =
    dbSchool.performance_score !== undefined
      ? dbSchool.performance_score
      : dbSchool.ET_SCOREPERFORMANCE;
  const tauxPresVal =
    dbSchool.taux_presence !== undefined
      ? dbSchool.taux_presence
      : dbSchool.ET_TAUXPRESENCE;
  const tauxRecVal =
    dbSchool.taux_recouvrement !== undefined
      ? dbSchool.taux_recouvrement
      : dbSchool.ET_TAUXRECOUVREMENT;

  return {
    id: idVal !== undefined && idVal !== null ? String(idVal) : "",
    name: dbSchool.name || dbSchool.ET_DENOMMINATION || "",
    code: dbSchool.code || dbSchool.ET_CODEETABLISSEMENT || "",
    region: dbSchool.region || dbSchool.ET_REGION || "",
    city: dbSchool.city || dbSchool.ET_VILLE || "",
    address: dbSchool.address || dbSchool.ET_ADRESSE_POSTALE || "",
    cycles: dbSchool.cycles || dbSchool.ET_CYCLES || [],
    status: dbSchool.status || dbSchool.ET_STATUT || "actif",
    effectif: dbSchool.effectif || dbSchool.ET_EFFECTIF_CLASSE || 0,
    classCount: classCountVal || 0,
    staffCount: staffCountVal || 0,
    performanceScore: perfScoreVal || 0,
    tauxPresence: tauxPresVal || 0,
    tauxRecouvrement: tauxRecVal || 0,
    logo: dbSchool.logo || dbSchool.LOGO || undefined,
    email: dbSchool.email || dbSchool.ET_EMAIL || undefined,
    contacts: dbSchool.contacts || dbSchool.ET_CONTACTS || undefined,
    createdAt: parseDate(dbSchool.created_at || dbSchool.ET_DATECREATION),
  };
};

export const mapStudent = (dbStudent: any): Student => {
  const classNameVal =
    dbStudent.className ||
    dbStudent.classe_name ||
    dbStudent.classe_nom ||
    dbStudent.classeNom ||
    (typeof dbStudent.classe === "string" ? dbStudent.classe : dbStudent.classe?.name || dbStudent.classe?.libelle || dbStudent.classe?.CE_LIBELLE) ||
    dbStudent.CE_LIBELLE ||
    dbStudent.level ||
    dbStudent.niveau ||
    dbStudent.niveau_nom ||
    dbStudent.niveauNom ||
    dbStudent.AU_NIVEAU ||
    dbStudent.ET_NIVEAU ||
    dbStudent.AU_CLASSEPRECEDENTE ||
    "";
  const resolvedPhoto =
    dbStudent.photo ||
    dbStudent.photo_url ||
    dbStudent.photoUrl ||
    dbStudent.AU_PHOTO ||
    dbStudent.picture ||
    dbStudent.avatar ||
    undefined;

  const mapped: any = {
    id: String(dbStudent.id),
    matricule: dbStudent.matricule || "",
    firstName: dbStudent.prenom || dbStudent.firstName || "",
    lastName: dbStudent.nom || dbStudent.lastName || "",
    nom: dbStudent.nom || dbStudent.lastName || "",
    prenom: dbStudent.prenom || dbStudent.firstName || "",
    dateOfBirth: parseDate(dbStudent.date_naissance),
    gender: dbStudent.genre || "M",
    genre: dbStudent.genre || "M",
    schoolId: String(dbStudent.ecole_id),
    ecole_id: dbStudent.ecole_id !== undefined && dbStudent.ecole_id !== null ? Number(dbStudent.ecole_id) : null,
    classId: dbStudent.classe_id ? String(dbStudent.classe_id) : "",
    classe_id: dbStudent.classe_id !== undefined && dbStudent.classe_id !== null ? Number(dbStudent.classe_id) : null,
    className: classNameVal,
    classe_nom: classNameVal,
    level: classNameVal,
    status: dbStudent.statut || "actif",
    photo: resolvedPhoto,
    photoUrl: resolvedPhoto,
    photo_url: resolvedPhoto,
    parentIds: dbStudent.AU_E_MAIL ? [dbStudent.AU_E_MAIL] : [],
    solde: parseFloat(dbStudent.solde || "0"),
    moyenne: dbStudent.moyenne || 0,
    rank: dbStudent.rang || undefined,
    healthNotes: dbStudent.notes_sante || undefined,
    createdAt: parseDate(dbStudent.date_creation),
    dateNaissance: dbStudent.date_naissance || "",
    date_naissance: dbStudent.date_naissance || "",
    AU_DATE_NAISSANCE: dbStudent.AU_DATE_NAISSANCE || dbStudent.date_naissance || "",
    notesSante: dbStudent.notes_sante || "",
    parentEmail: dbStudent.AU_E_MAIL || "",
    parentPhone: dbStudent.AU_TUTEURLEGALCONTACTS || dbStudent.AU_CONTACTS || dbStudent.parentPhone || "",
    parentName: dbStudent.AU_TUTEURLEGAL || dbStudent.parentName || "",
    AU_TUTEURLEGALCONTACTS: dbStudent.AU_TUTEURLEGALCONTACTS || dbStudent.AU_CONTACTS || dbStudent.AU_PERECONTACTS || dbStudent.AU_MERECONTACTS || "",
    AU_CONTACTS: dbStudent.AU_CONTACTS || "",
    AU_TELEPHONE: dbStudent.AU_TELEPHONE || dbStudent.telephone || "",
    AU_TUTEURLEGAL: dbStudent.AU_TUTEURLEGAL || "",
    AU_PERENOMPRENOMS: dbStudent.AU_PERENOMPRENOMS || "",
    AU_PERECONTACTS: dbStudent.AU_PERECONTACTS || "",
    AU_MERENOMPRENOMS: dbStudent.AU_MERENOMPRENOMS || "",
    AU_MERECONTACTS: dbStudent.AU_MERECONTACTS || "",
    AU_PERSONNEACONTACTERURGENCE: dbStudent.AU_PERSONNEACONTACTERURGENCE || "",
    AU_CONTACTURGENCES: dbStudent.AU_CONTACTURGENCES || "",
    redoublant: dbStudent.redoublant || "NON",
    statutAffecte:
      dbStudent.statutAffecte ||
      dbStudent.statut_orientation ||
      dbStudent.AU_STATUT ||
      "",
    statutOrientation:
      dbStudent.statutOrientation ||
      dbStudent.statut_orientation ||
      dbStudent.statutAffecte ||
      "",
    priseEnCharge: Boolean(dbStudent.priseEnCharge),
    originePriseEnCharge: dbStudent.originePriseEnCharge || "",
    matriculeNational: dbStudent.matriculeNational || dbStudent.matricule_national || dbStudent.AU_MATRICULENATIONAL || "",
    matricule_national: dbStudent.matriculeNational || dbStudent.matricule_national || dbStudent.AU_MATRICULENATIONAL || "",
    MA_LV2: dbStudent.MA_LV2 || "",
    AU_LANGUEVIVANTE2: dbStudent.AU_LANGUEVIVANTE2 || "",
    codeEtablissement:
      dbStudent.code_etablissement ||
      dbStudent.codeEtablissement ||
      dbStudent.ET_CODEETABLISSEMENT ||
      "",
    code_etablissement:
      dbStudent.code_etablissement ||
      dbStudent.codeEtablissement ||
      dbStudent.ET_CODEETABLISSEMENT ||
      "",
    ET_CODEETABLISSEMENT:
      dbStudent.code_etablissement ||
      dbStudent.codeEtablissement ||
      dbStudent.ET_CODEETABLISSEMENT ||
      "",

    // ✅ MAPPER LES CHAMPS DU PROCESSUS D'INSCRIPTION (11 ÉTAPES)
    step_1_validated: Boolean(dbStudent.step_1_validated),
    step_2_validated: Boolean(dbStudent.step_2_validated),
    step_3_validated: Boolean(dbStudent.step_3_validated),
    step_4_validated: Boolean(dbStudent.step_4_validated),
    step_5_validated: Boolean(dbStudent.step_5_validated),
    step_6_validated: Boolean(dbStudent.step_6_validated),
    step_7_validated: Boolean(dbStudent.step_7_validated),
    step_8_validated: Boolean(dbStudent.step_8_validated),
    step_9_validated: Boolean(dbStudent.step_9_validated),
    step_10_validated: Boolean(dbStudent.step_10_validated),
    step_11_validated: Boolean(dbStudent.step_11_validated),

    // ✅ MAPPER LES AUTRES CHAMPS D'INSCRIPTION
    type_inscription: dbStudent.type_inscription || "inscription",
    qualite_eleve: dbStudent.qualite_eleve || "Non Redoublant(e)",
    statut_orientation:
      dbStudent.statut_orientation ||
      (/CP|CE|CM|MAT|MPS|MMS|MGS|PRIM|SECTION/i.test(
        String(
          dbStudent.className ||
            dbStudent.classeNom ||
            dbStudent.AU_CLASSEPRECEDENTE ||
            dbStudent.niveau ||
            "",
        ),
      )
        ? "Non-Affecté"
        : "Affecté par l'État"),
    prise_en_charge: Boolean(dbStudent.prise_en_charge),
    origine_prise_en_charge: dbStudent.origine_prise_en_charge || "",
    service_transport: Boolean(dbStudent.service_transport),
    service_cantine: Boolean(dbStudent.service_cantine),

    // Étape 2
    tenue_validee: Boolean(dbStudent.tenue_validee),

    // Étape 3
    kit_depose: Boolean(dbStudent.kit_depose),
    kit_rame_papier: Boolean(dbStudent.kit_rame_papier),
    kit_papier_hygienique: Boolean(dbStudent.kit_papier_hygienique),
    kit_marqueurs_tableau: Boolean(dbStudent.kit_marqueurs_tableau),

    // Étape 4 - Santé
    groupe_sanguin: dbStudent.groupe_sanguin || "A+",
    rhesus: dbStudent.rhesus || "+",
    allergies_alimentaires: dbStudent.allergies_alimentaires || "",
    allergies_medicamenteuses: dbStudent.allergies_medicamenteuses || "",
    etat_vaccinal: dbStudent.etat_vaccinal || "À jour",
    has_asthme: Boolean(dbStudent.has_asthme),
    asthme_traitement: dbStudent.asthme_traitement || "",
    has_drepanocytose: Boolean(dbStudent.has_drepanocytose),
    drepanocytose_traitement: dbStudent.drepanocytose_traitement || "",
    has_epilepsie: Boolean(dbStudent.has_epilepsie),
    epilepsie_traitement: dbStudent.epilepsie_traitement || "",
    handicap_precision: dbStudent.handicap_precision || "",
    autres_pathologies: dbStudent.autres_pathologies || "",
    autres_traitement: dbStudent.autres_traitement || "",
    dispense_sportive: Boolean(dbStudent.dispense_sportive),
    dispense_precision: dbStudent.dispense_precision || "",
    medecin1_contact: dbStudent.medecin1_contact || "",
    medecin2_contact: dbStudent.medecin2_contact || "",
    nom_assurance: dbStudent.nom_assurance || "",

    // Étape 5
    data_saisie_logiciel: Boolean(dbStudent.data_saisie_logiciel),

    // Étape 7
    montant_versement: parseFloat(dbStudent.montant_versement || "0"),
    mode_reglement: dbStudent.mode_reglement || "especes",
    numero_transaction: dbStudent.numero_transaction || "",

    // Étape 8
    fiche_imprimee: Boolean(dbStudent.fiche_imprimee),

    // Étape 9
    effets_remis: Boolean(dbStudent.effets_remis),

    // Étape 10
    billet_retire: Boolean(dbStudent.billet_retire),
    billet_number: dbStudent.billet_number || "",

    // Étape 11
    dossier_archive: Boolean(dbStudent.dossier_archive),

    // Régime, Lieu d'habitation et Informations financières
    regime: dbStudent.regime || "Non-boursier",
    AU_COMMUNE: dbStudent.AU_COMMUNE || "",
    AU_QUARTIER: dbStudent.AU_QUARTIER || "",
    AU_ADRESSE_GEO: dbStudent.AU_ADRESSE_GEO || "",
    AU_ADRESSE_POSTALE: dbStudent.AU_ADRESSE_POSTALE || "",
    lieu_habitation: `${dbStudent.AU_COMMUNE || ""} ${dbStudent.AU_QUARTIER || ""} ${dbStudent.AU_ADRESSE_GEO || ""}`.trim() || dbStudent.AU_ADRESSE_POSTALE || "Non renseigné",
    AU_MONTANTARRIERE: parseFloat(dbStudent.AU_MONTANTARRIERE || "0"),
    AU_SCOLARITE: parseFloat(dbStudent.AU_SCOLARITE || "0"),
    AU_TOTALDEPOT: parseFloat(dbStudent.AU_TOTALDEPOT || "0"),
    AU_SOLDECOMPTE: parseFloat(dbStudent.AU_SOLDECOMPTE || "0"),
  };

  // Auto-parse JSON in notes_sante for health module
  if (dbStudent.notes_sante) {
    try {
      const parsedHealth = JSON.parse(dbStudent.notes_sante);
      if (typeof parsedHealth === "object" && parsedHealth !== null) {
        Object.assign(mapped, {
          groupeSanguin:
            parsedHealth.groupeSanguin || dbStudent.groupe_sanguin || "A+",
          groupe_sanguin:
            parsedHealth.groupeSanguin || dbStudent.groupe_sanguin || "A+",
          rhesus: parsedHealth.rhesus || dbStudent.rhesus || "+",
          allergiesAlimentaires: parsedHealth.allergiesAlimentaires || "",
          allergies_alimentaires: parsedHealth.allergiesAlimentaires || "",
          allergiesMedicamenteuses: parsedHealth.allergiesMedicamenteuses || "",
          allergies_medicamenteuses:
            parsedHealth.allergiesMedicamenteuses || "",
          etatVaccinal: parsedHealth.etatVaccinal || "À jour",
          etat_vaccinal: parsedHealth.etatVaccinal || "À jour",
          hasAsthme: Boolean(parsedHealth.hasAsthme),
          has_asthme: Boolean(parsedHealth.hasAsthme),
          asthmeTraitement: parsedHealth.asthmeTraitement || "",
          asthme_traitement: parsedHealth.asthmeTraitement || "",
          hasDrepanocytose: Boolean(parsedHealth.hasDrepanocytose),
          has_drepanocytose: Boolean(parsedHealth.hasDrepanocytose),
          drepanocytoseTraitement: parsedHealth.drepanocytoseTraitement || "",
          drepanocytose_traitement: parsedHealth.drepanocytoseTraitement || "",
          hasEpilepsie: Boolean(parsedHealth.hasEpilepsie),
          has_epilepsie: Boolean(parsedHealth.hasEpilepsie),
          epilepsieTraitement: parsedHealth.epilepsieTraitement || "",
          epilepsie_traitement: parsedHealth.epilepsieTraitement || "",
          hasHandicap: Boolean(
            parsedHealth.hasHandicap || dbStudent.AU_HANDICAP,
          ),
          has_handicap: Boolean(
            parsedHealth.hasHandicap || dbStudent.AU_HANDICAP,
          ),
          handicapPrecision:
            parsedHealth.handicapPrecision || dbStudent.AU_AUTRESHANDICAP || "",
          handicap_precision:
            parsedHealth.handicapPrecision || dbStudent.AU_AUTRESHANDICAP || "",
          autresPathologies: parsedHealth.autresPathologies || "",
          autres_pathologies: parsedHealth.autresPathologies || "",
          autresTraitement: parsedHealth.autresTraitement || "",
          autres_traitement: parsedHealth.autresTraitement || "",
          dispenseSportive: Boolean(parsedHealth.dispenseSportive),
          dispense_sportive: Boolean(parsedHealth.dispenseSportive),
          dispensePrecision: parsedHealth.dispensePrecision || "",
          dispense_precision: parsedHealth.dispensePrecision || "",
          medecin1Contact: parsedHealth.medecin1Contact || "",
          medecin1_contact: parsedHealth.medecin1Contact || "",
          medecin2Contact: parsedHealth.medecin2Contact || "",
          medecin2_contact: parsedHealth.medecin2Contact || "",
          nomAssurance: parsedHealth.nomAssurance || "",
          nom_assurance: parsedHealth.nomAssurance || "",
        });
      }
    } catch (e) {
      // Plain text health note
    }
  }

  return mapped;
};

export const mapStaff = (dbStaff: any): Staff => {
  return {
    id: String(dbStaff.id),
    firstName: dbStaff.prenom || "",
    lastName: dbStaff.nom || "",
    email: dbStaff.email || "",
    phone: dbStaff.telephone || "",
    fonction: dbStaff.fonction || "enseignant",
    schoolId: dbStaff.ecole_id ? String(dbStaff.ecole_id) : "",
    code_etablissement: dbStaff.ET_CODEETABLISSEMENT || dbStaff.code_etablissement || "",
    ET_CODEETABLISSEMENT: dbStaff.ET_CODEETABLISSEMENT || dbStaff.code_etablissement || "",
    status: dbStaff.statut || "actif",
    chargeHoraire: dbStaff.charge_horaire || 0,
    photo: dbStaff.photo || undefined,
    evaluationScore: dbStaff.score_evaluation || undefined,
    disponibilites: dbStaff.disponibilites || null,
    ecolesAutorisees: dbStaff.ecoles_autorisees || [],
    createdAt: parseDate(dbStaff.date_creation),
  };
};

export const mapPayment = (dbPayment: any): Payment => {
  const pDate = parseDate(dbPayment.date);

  // Construct fallback receiptNumber in standard REC-YYYYMMDD-ID format if missing in DB
  let receiptNumber = dbPayment.numero_recu;
  if (!receiptNumber) {
    const yyyy = pDate.getFullYear();
    const mm = String(pDate.getMonth() + 1).padStart(2, "0");
    const dd = String(pDate.getDate()).padStart(2, "0");
    receiptNumber = `REC-${yyyy}${mm}${dd}-${dbPayment.id}`;
  }

  const parsedAmount = parseFloat(dbPayment.montant || "0");
  const pStatus = dbPayment.statut || "paye";

  return {
    id: String(dbPayment.id),
    studentId: String(dbPayment.eleve_id),
    amount: parsedAmount,
    montant: parsedAmount,
    type: dbPayment.type || "scolarite",
    mode: dbPayment.mode || "mobile_money",
    status: pStatus,
    statut: pStatus,
    date: pDate,
    date_acquittement: dbPayment.date_acquittement
      ? parseDate(dbPayment.date_acquittement)
      : (pStatus === "paye" || pStatus === "payé" ? pDate : undefined),
    dueDate: dbPayment.date_echeance
      ? parseDate(dbPayment.date_echeance)
      : undefined,
    receiptNumber: receiptNumber,
    transactionNumber: dbPayment.numero_transaction || undefined,
    observation: dbPayment.numero_transaction || dbPayment.numero_recu || "",
    createdAt: parseDate(dbPayment.date_creation || dbPayment.date),
    ecole_id: dbPayment.ecole_id ? Number(dbPayment.ecole_id) : undefined,
    schoolId: dbPayment.ecole_id ? String(dbPayment.ecole_id) : (dbPayment.ET_CODEETABLISSEMENT || undefined),
    ET_CODEETABLISSEMENT: dbPayment.ET_CODEETABLISSEMENT || undefined,
  };
};

export const mapEvaluation = (dbEval: any): Evaluation => {
  return {
    id: String(dbEval.id),
    studentId: String(dbEval.eleve_id),
    classId: String(dbEval.classe_id),
    subject: dbEval.matiere || "",
    type: dbEval.type || "devoir",
    trimester: (dbEval.trimestre || 1) as 1 | 2 | 3,
    note: dbEval.note || 0,
    coefficient: dbEval.coefficient || 1,
    date: parseDate(dbEval.date),
    appreciation: dbEval.appreciation || undefined,
    createdAt: parseDate(dbEval.date_creation),
    devoir_numero: dbEval.devoir_numero || undefined,
    date_recuperation: dbEval.date_recuperation
      ? parseDate(dbEval.date_recuperation)
      : undefined,
    date_correction: dbEval.date_correction
      ? parseDate(dbEval.date_correction)
      : undefined,
    date_remise: dbEval.date_remise ? parseDate(dbEval.date_remise) : undefined,
    valide: dbEval.valide || false,
    autorisation_modification: dbEval.autorisation_modification || false,
    justification_modification: dbEval.justification_modification || undefined,
  };
};

export const mapClass = (dbClass: any): ClassRoom => {
  const libelle = dbClass.CE_LIBELLE || dbClass.name || "";
  // Derive cycle label from CY_LIBELLECYCLE or ET_CYCLE, but NOT blindly default to "primaire".
  // Keep the raw cycle_id and niveau_id so the UI can filter by ID reliably.
  const cycleLabel: string = dbClass.CY_LIBELLECYCLE || dbClass.ET_CYCLE || dbClass.cycle || "";
  const ecoleId = dbClass.ecole_id ?? dbClass.schoolId ?? null;
  return {
    id: String(dbClass.id),
    name: libelle,
    CE_LIBELLE: libelle,
    niveau:
      dbClass.CE_LIBELLENIVEAU || dbClass.NI_CODENIVEAU || dbClass.niveau || "",
    cycle: cycleLabel as "maternelle" | "primaire" | "college" | "lycee",
    // Expose raw IDs so cycle/niveau filters can work correctly even when labels are missing
    cycle_id: dbClass.cycle_id ?? null,
    niveau_id: dbClass.niveau_id ?? null,
    ecole_id: ecoleId ? Number(ecoleId) : null,
    ET_CODEETABLISSEMENT: dbClass.ET_CODEETABLISSEMENT || "",
    schoolId: ecoleId ? String(ecoleId) : "",
    teacherId: dbClass.enseignant_id ? String(dbClass.enseignant_id) : "",
    studentCount: dbClass.CE_EFFECTIF || dbClass.studentCount || 0,
    capacity: dbClass.capacite || 50,
    createdAt: parseDate(dbClass.date_creation),
  } as any;
};

export const mapAttendance = (dbAttendance: any): Attendance => {
  return {
    id: String(dbAttendance.id),
    studentId: String(dbAttendance.eleve_id),
    classId: String(dbAttendance.classe_id),
    date: parseDate(dbAttendance.date),
    status: dbAttendance.statut || "present",
    justification: dbAttendance.justification || undefined,
    createdAt: parseDate(dbAttendance.date_creation),
    heure: dbAttendance.heure || undefined,
    locked: dbAttendance.locked || false,
  };
};

// ─── PAYLOAD NORMALIZERS (FRONTEND -> DB) ────────────────────────────────────

const normalizeStaffPayload = (payload: any): any => {
  const result: any = { ...payload };
  if (payload.firstName !== undefined && result.prenom === undefined)
    result.prenom = payload.firstName;
  if (payload.lastName !== undefined && result.nom === undefined)
    result.nom = payload.lastName;
  if (payload.phone !== undefined && result.telephone === undefined)
    result.telephone = payload.phone;
  if (payload.schoolId !== undefined && result.ecole_id === undefined)
    result.ecole_id = Number(payload.schoolId) || null;
  if (
    payload.chargeHoraire !== undefined &&
    result.charge_horaire === undefined
  )
    result.charge_horaire = Number(payload.chargeHoraire);
  if (payload.status !== undefined && result.statut === undefined)
    result.statut = payload.status;
  // Delete camelCase keys that have been mapped
  delete result.firstName;
  delete result.lastName;
  delete result.phone;
  delete result.schoolId;
  delete result.chargeHoraire;
  delete result.status;
  return result;
};

const normalizeSallePayload = (payload: any): any => {
  const result: any = { ...payload };
  if (payload.nom !== undefined && result.libelle === undefined)
    result.libelle = payload.nom;
  if (payload.nom !== undefined && result.code === undefined)
    result.code = payload.nom;
  if (payload.type !== undefined && result.type_salle === undefined)
    result.type_salle = payload.type;
  if (payload.statut !== undefined && result.disponible === undefined)
    result.disponible = payload.statut === "disponible";
  if (payload.equipements !== undefined && result.description === undefined)
    result.description = payload.equipements;
  if (payload.capacite !== undefined)
    result.capacite = Number(payload.capacite);
  if (payload.etage !== undefined) result.etage = Number(payload.etage) || 0;
  if (payload.ecole_id !== undefined)
    result.ecole_id = Number(payload.ecole_id) || null;
  // Delete frontend keys
  delete result.nom;
  delete result.statut;
  delete result.equipements;
  return result;
};

const normalizeAttendancePayload = (payload: any): any => {
  const result: any = { ...payload };
  if (payload.studentId !== undefined && result.eleve_id === undefined)
    result.eleve_id = Number(payload.studentId);
  if (payload.classId !== undefined && result.classe_id === undefined)
    result.classe_id = Number(payload.classId);
  if (payload.classeId !== undefined && result.classe_id === undefined)
    result.classe_id = Number(payload.classeId);
  if (payload.status !== undefined && result.statut === undefined)
    result.statut = payload.status;
  if (payload.subject !== undefined && result.heure === undefined)
    result.heure = payload.subject;
  delete result.studentId;
  delete result.classId;
  delete result.classeId;
  delete result.status;
  delete result.subject;
  return result;
};

// ─── CLIENT-SIDE IN-MEMORY CACHE & REQUEST DEDUPLICATION ────────────────────

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // in milliseconds
}

const memoryCache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();

function buildCacheKey(keyPrefix: string, params?: any): string {
  if (!params) return keyPrefix;
  try {
    const sorted = Object.keys(params)
      .sort()
      .reduce((acc: any, k) => {
        if (params[k] !== undefined && params[k] !== null && params[k] !== "") {
          acc[k] = params[k];
        }
        return acc;
      }, {});
    return `${keyPrefix}:${JSON.stringify(sorted)}`;
  } catch {
    return `${keyPrefix}:${JSON.stringify(params)}`;
  }
}

/**
 * Cache avec TTL, SWR (Stale-While-Revalidate) et déduplication des requêtes concurrentes.
 */
async function cachedRequest<T>(
  keyPrefix: string,
  params: any,
  ttlMs: number,
  fetchFn: () => Promise<T>,
  options?: { bypassCache?: boolean }
): Promise<T> {
  const cacheKey = buildCacheKey(keyPrefix, params);
  const now = Date.now();
  const cached = memoryCache.get(cacheKey);

  // Donnée valide en mémoire -> retour immédiat (0 ms)
  if (!options?.bypassCache && cached) {
    const isExpired = now - cached.timestamp > cached.ttl;
    if (!isExpired) {
      return cached.data;
    }
    // Si expiré mais dans la fenêtre SWR (5x TTL) -> renvoyer l'ancienne donnée immédiatement et actualiser en arrière-plan
    if (now - cached.timestamp < cached.ttl * 5) {
      if (!inFlightRequests.has(cacheKey)) {
        const backgroundPromise = fetchFn()
          .then((fresh) => {
            memoryCache.set(cacheKey, { data: fresh, timestamp: Date.now(), ttl: ttlMs });
            inFlightRequests.delete(cacheKey);
            return fresh;
          })
          .catch((err) => {
            console.warn(`[apiClient] Background revalidation failed for ${cacheKey}:`, err);
            inFlightRequests.delete(cacheKey);
          });
        inFlightRequests.set(cacheKey, backgroundPromise);
      }
      return cached.data;
    }
  }

  // Déduplication des requêtes en cours de vol
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const requestPromise = fetchFn()
    .then((data) => {
      memoryCache.set(cacheKey, { data, timestamp: Date.now(), ttl: ttlMs });
      inFlightRequests.delete(cacheKey);
      return data;
    })
    .catch((err) => {
      inFlightRequests.delete(cacheKey);
      throw err;
    });

  inFlightRequests.set(cacheKey, requestPromise);
  return requestPromise;
}

export function invalidateCache(...patterns: string[]): void {
  for (const key of memoryCache.keys()) {
    if (patterns.some((pat) => key.startsWith(pat) || key.includes(pat))) {
      memoryCache.delete(key);
    }
  }
}

export function clearCache(): void {
  memoryCache.clear();
}

// ─── API ENDPOINTS ───────────────────────────────────────────────────────────

export const apiClient = {
  // Authentication
  /**
   * Réinitialisation en libre-service. Vérification à deux facteurs côté
   * serveur : l'identifiant et le téléphone doivent désigner la même personne,
   * dont le dossier doit être validé par les ressources humaines.
   */
  async motDePasseOublie(payload: { identifiant: string; telephone: string }): Promise<{
    username: string;
    nouveau_mot_de_passe: string;
    message: string;
  }> {
    const response = await api.post("/api/auth/mot-de-passe-oublie", payload);
    return response.data;
  },
  async changerMotDePasse(payload: {
    username: string;
    ancien_mot_de_passe: string;
    nouveau_mot_de_passe: string;
  }): Promise<{ username: string; message: string }> {
    const response = await api.post("/api/auth/changer-mot-de-passe", payload);
    return response.data;
  },
  async login(payload: any) {
    const response = await api.post("/api/auth/login", payload);
    const data = response.data;
    if (data) {
      if (data.code_etablissement || data.ecole_code) {
        const code = data.code_etablissement || data.ecole_code;
        localStorage.setItem("user_ecole_code", code);
        localStorage.setItem("code_etablissement", code);
      }
      if (data.ecole_id !== undefined && data.ecole_id !== null) {
        localStorage.setItem("user_ecole_id", String(data.ecole_id));
        localStorage.setItem("ecole_id", String(data.ecole_id));
      }
    }
    return data; // returns token schema { access_token, token_type, role, username, code_etablissement, ecole_id }
  },

  // Schools
  async getSchools(params?: {
    ville?: string;
    ecole_id?: number;
    all?: boolean;
  }): Promise<School[]> {
    return cachedRequest("schools", params, 300_000, async () => {
      const queryParams: any = {};
      if (params?.all || params?.all === undefined) {
        // By default or when all: true, request all_schools to avoid scope blockage
        queryParams.all_schools = params?.all !== false;
      }
      if (params?.ville) {
        queryParams.ville = params.ville;
      }
      if (params?.ecole_id) {
        queryParams.ecole_id = params.ecole_id;
      }

      const response = await api.get("/api/schools/", { params: queryParams });
      const dataList = Array.isArray(response.data) ? response.data : [];
      const mapped = dataList.map(mapSchool).sort((a: any, b: any) =>
        (a.name || "").localeCompare(b.name || "", "fr", { sensitivity: "base" })
      );
      
      // If specific city is requested via params, filter client-side as well
      if (params?.ville && params.ville !== 'all') {
        return mapped.filter(s => (s.city || '').toLowerCase().trim() === params.ville!.toLowerCase().trim());
      }
      return mapped;
    });
  },
  async getAllSchools(): Promise<School[]> {
    return this.getSchools({ all: true });
  },
  async getSchool(id: string | number): Promise<School> {
    return cachedRequest(`school:${id}`, null, 300_000, async () => {
      const response = await api.get(`/api/schools/${id}`);
      return mapSchool(response.data);
    });
  },

  // Students
  async getStudents(params?: {
    ecole_id?: number;
    classe_id?: number;
  }): Promise<Student[]> {
    return cachedRequest("students", params, 60_000, async () => {
      const response = await api.get("/api/students/", { params });
      const dataList = Array.isArray(response.data) ? response.data : [];
      return dataList.map(mapStudent).sort((a: any, b: any) => {
        const nomA = a.lastName || a.nom || "";
        const nomB = b.lastName || b.nom || "";
        const prenomA = a.firstName || a.prenom || "";
        const prenomB = b.firstName || b.prenom || "";
        const cmpNom = nomA.localeCompare(nomB, "fr", { sensitivity: "base" });
        if (cmpNom !== 0) return cmpNom;
        return prenomA.localeCompare(prenomB, "fr", { sensitivity: "base" });
      });
    });
  },
  /**
   * Liste allégée : identité, classe, contact parent et cumul versé uniquement.
   * À préférer sur les écrans qui affichent des tableaux d'élèves — la réponse
   * complète transporte 143 colonnes par élève, photos base64 comprises.
   */
  async getStudentsLight(params?: {
    ecole_id?: number;
    classe_id?: number;
  }): Promise<Student[]> {
    return cachedRequest("students_light", params, 60_000, async () => {
      const response = await api.get("/api/students/light", { params });
      const dataList = Array.isArray(response.data) ? response.data : [];
      return dataList.map(mapStudent).sort((a: any, b: any) => {
        const nomA = a.lastName || a.nom || "";
        const nomB = b.lastName || b.nom || "";
        const prenomA = a.firstName || a.prenom || "";
        const prenomB = b.firstName || b.prenom || "";
        const cmpNom = nomA.localeCompare(nomB, "fr", { sensitivity: "base" });
        if (cmpNom !== 0) return cmpNom;
        return prenomA.localeCompare(prenomB, "fr", { sensitivity: "base" });
      });
    });
  },
  async getStudent(id: string | number): Promise<Student> {
    return cachedRequest(`student:${id}`, null, 60_000, async () => {
      const response = await api.get(`/api/students/${id}`);
      return mapStudent(response.data);
    });
  },
  async verifyStudent(
    matricule: string,
    dateNaissance: string,
  ): Promise<Student> {
    const response = await api.post("/api/students/verify-identification", {
      matricule,
      date_naissance: dateNaissance,
    });
    return mapStudent(response.data);
  },

  // Staff / Personnel
  async getStaff(params?: { ecole_id?: number }): Promise<Staff[]> {
    return cachedRequest("staff", params, 120_000, async () => {
      const response = await api.get("/api/staff/", { params });
      const dataList = Array.isArray(response.data) ? response.data : [];
      return dataList.map(mapStaff).sort((a: any, b: any) => {
        const nomA = a.lastName || a.nom || "";
        const nomB = b.lastName || b.nom || "";
        const prenomA = a.firstName || a.prenom || "";
        const prenomB = b.firstName || b.prenom || "";
        const cmpNom = nomA.localeCompare(nomB, "fr", { sensitivity: "base" });
        if (cmpNom !== 0) return cmpNom;
        return prenomA.localeCompare(prenomB, "fr", { sensitivity: "base" });
      });
    });
  },

  // Payments / Finances
  async getPayments(params?: { eleve_id?: number | string; limit?: number; skip?: number; statut?: string }): Promise<Payment[]> {
    return cachedRequest("payments", params, 45_000, async () => {
      const response = await api.get("/api/finances/payments", { params });
      const dataList = Array.isArray(response.data) ? response.data : [];
      return dataList.map(mapPayment);
    });
  },
  async updatePayment(paymentId: number | string, data: any): Promise<Payment> {
    const response = await api.put(`/api/finances/payments/${paymentId}`, data);
    invalidateCache("payments", "finance_stats", "recouvrement", "echeancier", "caisse");
    return mapPayment(response.data);
  },
  async cancelPaymentOld(paymentId: number | string, motifAnnulation: string): Promise<Payment> {
    const response = await api.post(`/api/finances/payments/${paymentId}/cancel`, {
      motif_annulation: motifAnnulation
    });
    invalidateCache("payments", "finance_stats", "recouvrement", "echeancier", "caisse");
    return mapPayment(response.data);
  },
  async getFinanceStats() {
    return cachedRequest("finance_stats", null, 45_000, async () => {
      const response = await api.get("/api/finances/stats");
      return response.data; // { paye, en_attente, annule, total_recouvrement }
    });
  },
  async getRecouvrement(params?: { annee?: number; mois?: number }) {
    return cachedRequest("recouvrement", params, 45_000, async () => {
      const response = await api.get("/api/finances/recouvrement", { params });
      return response.data as {
        taux_global: number;
        par_eleve: any[];
        par_classe: any[];
        par_niveau: any[];
      };
    });
  },

  // Evaluations / Grades
  async getEvaluations(params?: {
    classe_id?: number;
    eleve_id?: number;
    devoir_numero?: string;
  }): Promise<Evaluation[]> {
    return cachedRequest("evaluations", params, 45_000, async () => {
      const response = await api.get("/api/evaluations", { params });
      const dataList = Array.isArray(response.data) ? response.data : [];
      return dataList.map(mapEvaluation);
    });
  },
  async createEvaluation(payload: any): Promise<Evaluation> {
    const response = await api.post("/api/evaluations", payload);
    invalidateCache("evaluations");
    return mapEvaluation(response.data);
  },
  async updateEvaluation(
    id: string | number,
    payload: any,
  ): Promise<Evaluation> {
    const response = await api.put(`/api/evaluations/${id}`, payload);
    invalidateCache("evaluations");
    return mapEvaluation(response.data);
  },
  async saveEvaluationsBulk(payload: {
    classe_id: number;
    matiere: string;
    trimestre: number;
    type: string;
    devoir_numero?: string;
    coefficient: number;
    date: string;
    date_recuperation?: string | null;
    date_correction?: string | null;
    date_remise?: string | null;
    valide?: boolean;
    notes: Array<{
      eleve_id: number;
      note: number;
      appreciation?: string;
      eval_id?: number | string;
      justification_modification?: string;
      autorisation_modification?: boolean;
    }>;
  }): Promise<any> {
    const response = await api.post("/api/evaluations/bulk", payload);
    invalidateCache("evaluations");
    return response.data;
  },

  // Classes & Cycles & Levels
  async getClasses(params?: { ecole_id?: number }): Promise<ClassRoom[]> {
    return cachedRequest("classes", params, 180_000, async () => {
      const response = await api.get("/api/classes/", { params });
      const dataList = Array.isArray(response.data) ? response.data : [];
      return dataList.map(mapClass).sort((a: any, b: any) =>
        (a.name || a.CE_LIBELLE || "").localeCompare(b.name || b.CE_LIBELLE || "", "fr", { numeric: true, sensitivity: "base" })
      );
    });
  },
  async getClass(id: string | number): Promise<ClassRoom> {
    return cachedRequest(`class:${id}`, null, 180_000, async () => {
      const response = await api.get(`/api/classes/${id}`);
      return mapClass(response.data);
    });
  },
  async getCycles() {
    return cachedRequest("cycles", null, 300_000, async () => {
      const response = await api.get("/api/classes/cycles");
      return response.data;
    });
  },
  async getLevels() {
    return cachedRequest("levels", null, 300_000, async () => {
      const response = await api.get("/api/classes/levels");
      return response.data;
    });
  },
  async createClass(payload: any): Promise<ClassRoom> {
    const response = await api.post("/api/classes/", payload);
    invalidateCache("classes", "class:");
    return mapClass(response.data);
  },
  async updateClass(id: string | number, payload: any): Promise<ClassRoom> {
    const response = await api.put(`/api/classes/${id}`, payload);
    invalidateCache("classes", "class:");
    return mapClass(response.data);
  },
  async deleteClass(id: string | number): Promise<void> {
    await api.delete(`/api/classes/${id}`);
    invalidateCache("classes", "class:");
  },
  async createLevel(payload: any): Promise<any> {
    const response = await api.post("/api/classes/levels", payload);
    invalidateCache("levels");
    return response.data;
  },
  async updateLevel(id: string | number, payload: any): Promise<any> {
    const response = await api.put(`/api/classes/levels/${id}`, payload);
    invalidateCache("levels");
    return response.data;
  },
  async deleteLevel(id: string | number): Promise<void> {
    await api.delete(`/api/classes/levels/${id}`);
    invalidateCache("levels");
  },

  // Attendance
  async getAttendance(params?: {
    classe_id?: number;
    eleve_id?: number;
    date?: string;
  }): Promise<Attendance[]> {
    return cachedRequest("attendance", params, 30_000, async () => {
      const response = await api.get("/api/attendance", { params });
      return response.data.map(mapAttendance);
    });
  },
  async createAttendance(payload: any): Promise<Attendance> {
    const response = await api.post(
      "/api/attendance",
      normalizeAttendancePayload(payload),
    );
    invalidateCache("attendance");
    return mapAttendance(response.data);
  },
  async updateAttendance(
    id: string | number,
    payload: any,
  ): Promise<Attendance> {
    const response = await api.put(
      `/api/attendance/${id}`,
      normalizeAttendancePayload(payload),
    );
    invalidateCache("attendance");
    return mapAttendance(response.data);
  },

  // Create Parent Account (triggered after student creation)
  async createParentAccount(payload: {
    eleve_id: number | string;
    email: string;
    phone?: string;
    password?: string;
  }): Promise<any> {
    const response = await api.post("/api/parents/account", payload);
    return response.data;
  },

  // Create / Update Students
  async createStudent(payload: any): Promise<Student> {
    const response = await api.post("/api/students/", payload);
    invalidateCache("student", "students", "students_light", "recouvrement", "finance_stats", "classes");
    return mapStudent(response.data);
  },
  async updateStudent(id: string | number, payload: any): Promise<Student> {
    const response = await api.put(`/api/students/${id}`, payload);
    invalidateCache("student", "students", "students_light", "recouvrement", "finance_stats");
    return mapStudent(response.data);
  },
  async patchStudent(id: string | number, payload: any): Promise<Student> {
    const response = await api.patch(`/api/students/${id}`, payload);
    invalidateCache("student", "students", "students_light", "recouvrement", "finance_stats");
    return mapStudent(response.data);
  },
  async deleteStudent(id: string | number): Promise<void> {
    await api.delete(`/api/students/${id}`);
    invalidateCache("student", "students", "students_light", "recouvrement", "finance_stats", "classes");
  },
  async withdrawStudent(
    studentId: string | number,
    payload: {
      motif: string;
      date_retrait?: string;
      commentaire?: string;
      etablissement_accueil?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/api/students/${studentId}/retrait`, payload);
    invalidateCache("student", "students", "students_light", "recouvrement", "finance_stats", "classes");
    return response.data;
  },
  async withdrawStudentsBulk(payload: {
    student_ids: (number | string)[];
    motif: string;
    date_retrait?: string;
    etablissement_accueil?: string;
    commentaire?: string;
  }): Promise<{ success: boolean; removed_count: number; message: string; errors?: string[] }> {
    const response = await api.post("/api/students/retrait-bulk", payload);
    invalidateCache("student", "students", "students_light", "recouvrement", "finance_stats", "classes");
    return response.data;
  },
  async getStudentWithdrawalHistory(params?: {
    ecole_id?: number | string;
    code_etablissement?: string;
    search?: string;
  }): Promise<any[]> {
    const response = await api.get("/api/students/historique-retraits", { params });
    return response.data;
  },
  async restoreWithdrawnStudent(historyId: number | string): Promise<{ success: boolean; message: string; student_id: number }> {
    const response = await api.post(`/api/students/historique-retraits/${historyId}/restaurer`);
    invalidateCache("student", "students", "students_light", "recouvrement", "finance_stats", "classes");
    return response.data;
  },
  async transferStudents(payload: {
    student_ids: (number | string)[];
    target_class_id: number | string;
    source_class_id?: number | string;
    motif?: string;
    realign_echeancier?: boolean;
    dispatch_evaluations?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    transferred_count: number;
    target_class: { id: number; nom: string; cycle?: string };
    transferred_students: any[];
  }> {
    const response = await api.post("/api/students/transfer", payload);
    invalidateCache("student", "students", "students_light", "classes", "finance_stats", "recouvrement");
    return response.data;
  },

  async simulateTransfer(payload: {
    student_id: number | string;
    target_class_id: number | string;
  }): Promise<{
    success: boolean;
    student: any;
    old_class: any;
    target_class: any;
    old_moyenne: number;
    new_moyenne: number;
    difference: number;
    total_old_points: number;
    total_old_coefficients: number;
    total_new_points: number;
    total_new_coefficients: number;
    evaluations_count: number;
    subjects: Array<{
      matiere: string;
      note_moyenne: number;
      old_coeff: number;
      new_coeff: number;
      old_points: number;
      new_points: number;
      difference_points: number;
      nb_evaluations: number;
    }>;
  }> {
    const response = await api.post("/api/students/transfer/simulate", payload);
    return response.data;
  },

  // Inscription Dossier (PATCH endpoint for saving inscription process data)
  async patch(endpoint: string, payload: any): Promise<any> {
    const cleanUrl = endpoint.startsWith("/api") ? endpoint : `/api${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
    const response = await api.patch(cleanUrl, payload);
    invalidateCache("student", "students", "students_light");
    return response.data;
  },

  // Create School
  async createSchool(payload: any): Promise<School> {
    const response = await api.post("/api/schools/", payload);
    invalidateCache("schools", "school:");
    return mapSchool(response.data);
  },
  async updateSchool(id: string | number, payload: any): Promise<School> {
    const response = await api.put(`/api/schools/${id}`, payload);
    invalidateCache("schools", "school:");
    return mapSchool(response.data);
  },
  async deleteSchool(id: string | number): Promise<void> {
    await api.delete(`/api/schools/${id}`);
    invalidateCache("schools", "school:");
  },

  // Create Payment
  async createPayment(payload: any): Promise<Payment> {
    const response = await api.post("/api/finances/payments", payload);
    invalidateCache("payments", "finance_stats", "recouvrement", "echeancier", "caisse");
    return mapPayment(response.data);
  },

  // Cancel Payment Legacy
  async cancelPaymentLegacy(id: string | number, motif?: string): Promise<Payment> {
    const response = await api.patch(`/api/finances/payments/${id}`, {
      statut: "annule",
      motif_annulation: motif || "",
    });
    invalidateCache("payments", "finance_stats", "recouvrement", "echeancier", "caisse");
    return mapPayment(response.data);
  },

  // Create Staff / User
  async createStaff(payload: any): Promise<Staff> {
    const response = await api.post(
      "/api/staff/",
      normalizeStaffPayload(payload),
    );
    invalidateCache("staff");
    return mapStaff(response.data);
  },
  async updateStaff(id: string | number, payload: any): Promise<Staff> {
    const cleanId = String(id).replace(/^:/, '');
    const response = await api.put(
      `/api/staff/${cleanId}`,
      normalizeStaffPayload(payload),
    );
    invalidateCache("staff");
    return mapStaff(response.data);
  },
  async deleteStaff(id: string | number): Promise<void> {
    const cleanId = String(id).replace(/^:/, '');
    await api.delete(`/api/staff/${cleanId}`);
    invalidateCache("staff");
  },

  // Bulletins
  async getBulletins(params?: { classe_id?: number }) {
    const response = await api.get("/api/bulletins", { params });
    return response.data;
  },
  async generateBulletin(params: { classe_id: number; trimestre: number }) {
    const response = await api.post("/api/bulletins/generate", null, {
      params,
    });
    return response.data;
  },

  // Reports
  async getRapportRentree(schoolId: string | number, anneeScolaire: string) {
    const response = await api.get(`/api/schools/${schoolId}/rapport-rentree`, {
      params: { annee_scolaire: anneeScolaire },
    });
    return response.data;
  },
  async saveRapportRentree(schoolId: string | number, payload: any) {
    const response = await api.post(
      `/api/schools/${schoolId}/rapport-rentree`,
      payload,
    );
    return response.data;
  },
  async getRapportTrimestriel(
    schoolId: string | number,
    trimestre: number,
    anneeScolaire: string,
  ) {
    const response = await api.get(
      `/api/schools/${schoolId}/rapport-trimestriel`,
      {
        params: { trimestre, annee_scolaire: anneeScolaire },
      },
    );
    return response.data;
  },
  async saveRapportTrimestriel(schoolId: string | number, payload: any) {
    const response = await api.post(
      `/api/schools/${schoolId}/rapport-trimestriel`,
      payload,
    );
    return response.data;
  },

  // Subjects
  async getSubjects(): Promise<any[]> {
    const response = await api.get("/api/classes/subjects");
    const list = Array.isArray(response.data) ? response.data : [];
    return list.sort((a: any, b: any) =>
      (a.nom || a.libelle || a.name || "").localeCompare(b.nom || b.libelle || b.name || "", "fr", { sensitivity: "base" })
    );
  },
  async createSubject(payload: any): Promise<any> {
    const response = await api.post("/api/classes/subjects", payload);
    return response.data;
  },

  // Attributions
  async getAttributions(params?: {
    classe_id?: number;
    enseignant_id?: number;
  }): Promise<any[]> {
    const response = await api.get("/api/classes/attributions", { params });
    return response.data;
  },
  async createAttribution(payload: any): Promise<any> {
    const response = await api.post("/api/classes/attributions", payload);
    return response.data;
  },
  async updateAttribution(id: number | string, payload: any): Promise<any> {
    const response = await api.put(`/api/classes/attributions/${id}`, payload);
    return response.data;
  },
  async assignTeacherToSlot(payload: { attribution_id: number; enseignant_id?: number | null }): Promise<any> {
    const response = await api.post("/api/classes/attributions/assign-teacher", payload);
    return response.data;
  },
  async generateClassScheduleTemplate(payload: { classe_id: number; salle?: string; replace_existing?: boolean; annee_scolaire?: string }): Promise<any> {
    const response = await api.post("/api/classes/generate-schedule-template", payload);
    return response.data;
  },
  async getClassProgrammeCoherence(classeId: number | string): Promise<any> {
    const response = await api.get(`/api/classes/${classeId}/programme-coherence`);
    return response.data;
  },
  async realignSchoolSchedules(payload?: any): Promise<any> {
    const response = await api.post("/api/echeanciers/realign-school-schedules", payload || {});
    return response.data;
  },
  async deleteAttribution(id: number | string): Promise<any> {
    const response = await api.delete(`/api/classes/attributions/${id}`);
    return response.data;
  },

  // Student CSV Import
  async importStudentsCsv(file: File): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/api/students/import", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    invalidateCache("student", "students", "students_light", "recouvrement", "finance_stats", "classes");
    return response.data;
  },

  // Staff CSV Import
  async importStaffCsv(file: File): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/api/staff/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    invalidateCache("staff");
    return response.data;
  },

  // Classes CSV Import
  async importClassesCsv(file: File): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/api/classes/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    invalidateCache("classes", "class:");
    return response.data;
  },

  // Impayés CSV/Excel Import
  async importImpayesCsv(file: File, anneeScolaire?: string): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(
      "/api/echeanciers/import-impayes",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        params: anneeScolaire ? { annee_scolaire: anneeScolaire } : undefined,
      },
    );
    invalidateCache("echeancier", "recouvrement", "finance_stats");
    return response.data;
  },

  // Salles CSV Import
  async importSallesCsv(file: File): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/api/salles/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    invalidateCache("salles");
    return response.data;
  },

  // Salles
  async getSalles(ecoleId?: number | string): Promise<any[]> {
    const params = ecoleId !== undefined ? { ecole_id: ecoleId } : {};
    return cachedRequest("salles", params, 180_000, async () => {
      const response = await api.get("/api/salles/", { params });
      const list = Array.isArray(response.data) ? response.data : [];
      return list.sort((a: any, b: any) =>
        (a.libelle || a.nom || a.name || "").localeCompare(b.libelle || b.nom || b.name || "", "fr", { numeric: true, sensitivity: "base" })
      );
    });
  },
  async createSalle(payload: any): Promise<any> {
    const response = await api.post(
      "/api/salles/",
      normalizeSallePayload(payload),
    );
    invalidateCache("salles");
    return response.data;
  },
  async updateSalle(salleId: number | string, payload: any): Promise<any> {
    const cleanId = String(salleId).replace(/^:/, "");
    const response = await api.put(
      `/api/salles/${cleanId}`,
      normalizeSallePayload(payload),
    );
    invalidateCache("salles");
    return response.data;
  },
  async deleteSalle(salleId: number | string): Promise<any> {
    const cleanId = String(salleId).replace(/^:/, "");
    const response = await api.delete(`/api/salles/${cleanId}`);
    invalidateCache("salles");
    return response.data;
  },

  // Courriers
  async getCourriers(): Promise<any[]> {
    const response = await api.get("/api/courriers/");
    return response.data;
  },
  async createCourrier(payload: any): Promise<any> {
    const response = await api.post("/api/courriers/", payload);
    return response.data;
  },

  // Stocks
  async getStocks(): Promise<any[]> {
    const response = await api.get("/api/stocks/");
    return response.data;
  },
  async createStock(payload: any): Promise<any> {
    const response = await api.post("/api/stocks/", payload);
    return response.data;
  },

  // Taches
  async getTaches(): Promise<any[]> {
    const response = await api.get("/api/taches/");
    return response.data;
  },
  async createTache(payload: any): Promise<any> {
    const response = await api.post("/api/taches/", payload);
    return response.data;
  },
  async updateTacheStatus(
    tacheId: number | string,
    status: string,
  ): Promise<any> {
    const response = await api.put(`/api/taches/${tacheId}/status`, null, {
      params: { status },
    });
    return response.data;
  },

  // Archives
  async getArchives(): Promise<any[]> {
    const response = await api.get("/api/archives/");
    return response.data;
  },
  async createArchive(payload: any): Promise<any> {
    const response = await api.post("/api/archives/", payload);
    return response.data;
  },

  // ─── School Assets (logos, signatures, cachets) ───────────────────────────
  async getSchoolAssets(): Promise<{
    logos: any[];
    signatures: any[];
    cachets: any[];
  }> {
    const response = await api.get("/api/uploads/school/assets");
    return response.data;
  },

  async uploadSchoolAsset(
    type: "logo" | "signature" | "cachet",
    file: File,
  ): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(`/api/uploads/school/${type}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  async deleteSchoolAsset(
    type: "logo" | "signature" | "cachet",
    filename: string,
  ): Promise<void> {
    await api.delete(`/api/uploads/school/${type}/${filename}`);
  },

  // ─── Dossiers Personnel (workflow de validation RH) ───────────────────────
  async getStaffPending(): Promise<Staff[]> {
    const response = await api.get("/api/staff/", {
      params: { statut: "en_attente" },
    });
    const dataList = Array.isArray(response.data) ? response.data : [];
    return dataList.map(mapStaff);
  },

  async validerStaff(id: string | number): Promise<Staff> {
    const cleanId = String(id).replace(/^:/, '');
    const response = await api.patch(`/api/staff/${cleanId}/valider`);
    invalidateCache("staff");
    return mapStaff(response.data);
  },

  async rejeterStaff(id: string | number): Promise<void> {
    const cleanId = String(id).replace(/^:/, '');
    await api.patch(`/api/staff/${cleanId}/rejeter`);
    invalidateCache("staff");
  },

  // Seances / Cahier de texte
  async getSeances(params?: {
    classe_id?: number;
    enseignant_id?: number;
    matiere_id?: number;
  }): Promise<Seance[]> {
    const response = await api.get("/api/seances", { params });
    const dataList = Array.isArray(response.data) ? response.data : [];
    return dataList.map((s: any) => ({
      ...s,
      date: parseDate(s.date),
    }));
  },
  async createSeance(payload: any): Promise<Seance> {
    const response = await api.post("/api/seances", payload);
    return {
      ...response.data,
      date: parseDate(response.data.date),
    };
  },

  // Pointages
  async getPointages(params?: {
    personnel_id?: number;
    date?: string;
  }): Promise<Pointage[]> {
    const response = await api.get("/api/pointages", { params });
    const dataList = Array.isArray(response.data) ? response.data : [];
    return dataList.map((p: any) => ({
      ...p,
      date: parseDate(p.date),
    }));
  },
  async clockInOut(payload: any): Promise<Pointage> {
    const response = await api.post("/api/pointages", payload);
    return {
      ...response.data,
      date: parseDate(response.data.date),
    };
  },

  // Transport - Cars
  async getCars(): Promise<any[]> {
    const response = await api.get("/api/transport/cars");
    return response.data;
  },
  async createCar(payload: any): Promise<any> {
    const response = await api.post("/api/transport/cars", payload);
    return response.data;
  },
  async updateCar(id: string | number, payload: any): Promise<any> {
    const response = await api.put(`/api/transport/cars/${id}`, payload);
    return response.data;
  },
  async deleteCar(id: string | number): Promise<void> {
    await api.delete(`/api/transport/cars/${id}`);
  },

  // Transport - Trajets
  async getTrajets(): Promise<any[]> {
    const response = await api.get("/api/transport/trajets");
    return response.data;
  },
  async createTrajet(payload: any): Promise<any> {
    const response = await api.post("/api/transport/trajets", payload);
    return response.data;
  },
  async updateTrajet(id: string | number, payload: any): Promise<any> {
    const response = await api.put(`/api/transport/trajets/${id}`, payload);
    return response.data;
  },
  async deleteTrajet(id: string | number): Promise<void> {
    await api.delete(`/api/transport/trajets/${id}`);
  },

  // Transport - Affectations
  async getAffectations(): Promise<any[]> {
    const response = await api.get("/api/transport/affectations");
    return response.data;
  },
  async createAffectation(payload: any): Promise<any> {
    const response = await api.post("/api/transport/affectations", payload);
    return response.data;
  },
  async deleteAffectation(eleveId: string | number): Promise<void> {
    await api.delete(`/api/transport/affectations/${eleveId}`);
  },

  // Transport - Pointages
  async getPointagesBus(): Promise<any[]> {
    const response = await api.get("/api/transport/pointages");
    return response.data;
  },
  async createPointageBus(payload: any): Promise<any> {
    const response = await api.post("/api/transport/pointages", payload);
    return response.data;
  },
  // Tarifs Cantine & Car
  async getTarifs(): Promise<any> {
    const response = await api.get("/api/transport/tarifs");
    return response.data;
  },
  async updateTarifs(payload: any): Promise<any> {
    const response = await api.put("/api/transport/tarifs", payload);
    return response.data;
  },
  async getTarifsDB(serviceType?: string): Promise<any[]> {
    const response = await api.get("/api/transport/tarifs-db", { params: { service_type: serviceType } });
    return response.data;
  },
  async createTarifDB(payload: any): Promise<any> {
    const response = await api.post("/api/transport/tarifs-db", payload);
    return response.data;
  },
  async updateTarifDB(id: number, payload: any): Promise<any> {
    const response = await api.put(`/api/transport/tarifs-db/${id}`, payload);
    return response.data;
  },
  async deleteTarifDB(id: number): Promise<any> {
    const response = await api.delete(`/api/transport/tarifs-db/${id}`);
    return response.data;
  },
  async importAffectations(file: File): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/api/transport/import", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Transport - Chauffeurs & Conducteurs
  async getChauffeurs(): Promise<any[]> {
    const response = await api.get("/api/transport/chauffeurs");
    return response.data;
  },
  async createChauffeur(payload: any): Promise<any> {
    const response = await api.post("/api/transport/chauffeurs", payload);
    return response.data;
  },
  async updateChauffeur(id: number | string, payload: any): Promise<any> {
    const response = await api.put(`/api/transport/chauffeurs/${id}`, payload);
    return response.data;
  },
  async deleteChauffeur(id: number | string): Promise<void> {
    await api.delete(`/api/transport/chauffeurs/${id}`);
  },
  async assignCar(carId: number | string, payload: { chauffeur_id?: number; chauffeur_nom?: string; chauffeur_tel?: string; ligne_id?: number; ligne_nom?: string }): Promise<any> {
    const response = await api.put(`/api/transport/cars/${carId}/assign`, null, { params: payload });
    return response.data;
  },
  async createTransportLigne(payload: { nom: string; kilometrage_moyen?: string; vehicule_id?: number; quartiers?: any[] }): Promise<any> {
    const response = await api.post("/api/transport/lignes", payload);
    return response.data;
  },
  async deleteTransportLigne(zoneId: number | string): Promise<any> {
    const response = await api.delete(`/api/transport/lignes/${zoneId}`);
    return response.data;
  },

  // Transport - Tarification par Ligne & Zone
  async getTransportZones(): Promise<any> {
    const response = await api.get("/api/transport/zones");
    return response.data;
  },
  async payTransportLine(payload: {
    eleve_id: number;
    zone_id: number;
    quartier_nom: string;
    tarif: number;
    mois: string;
    mode_paiement?: string;
    numero_transaction?: string;
    observation?: string;
    caissier_nom?: string;
    annee_scolaire?: string;
    date_operation?: string;
  }): Promise<any> {
    const finalPayload = {
      ...payload,
      date_operation: payload.date_operation || new Date().toISOString(),
    };
    const response = await api.post("/api/transport/pay-line", finalPayload);
    return response.data;
  },

  // Échéancier de paiement
  async getEcheanciers(params?: {
    eleve_id?: number;
    ecole_id?: number;
    classe_id?: number;
    annee_scolaire?: string;
    ville?: string;
  }): Promise<any[]> {
    const response = await api.get("/api/echeanciers/", { params });
    return response.data;
  },
  async getImpayesTable(params?: { annee_scolaire?: string; auto_sync?: boolean }): Promise<any[]> {
    const response = await api.get("/api/echeanciers/impayes", { params });
    return response.data;
  },
  async syncImpayesTable(annee_scolaire: string = "2025-2026"): Promise<any> {
    const response = await api.post("/api/echeanciers/impayes-sync", null, { params: { annee_scolaire } });
    return response.data;
  },
  async getStudentEcheancierSummary(studentId: number | string): Promise<any> {
    const response = await api.get(`/api/echeanciers/student/${studentId}`);
    return response.data;
  },
  async createEcheance(payload: any): Promise<any> {
    const response = await api.post("/api/echeanciers/", payload);
    return response.data;
  },
  async generateServiceTranches(payload: {
    eleve_id: number;
    service_type: "cantine" | "transport" | "examen";
    montant_mensuel: number;
    annee_scolaire?: string;
    libelle?: string;
  }): Promise<any> {
    const response = await api.post(
      "/api/echeanciers/generate-service-tranches",
      payload,
    );
    return response.data;
  },
  async removeServiceTranches(payload: {
    eleve_id: number;
    service_type: "cantine" | "transport" | "examen" | "all";
    annee_scolaire?: string;
  }): Promise<any> {
    const response = await api.post(
      "/api/echeanciers/remove-service-tranches",
      payload,
    );
    return response.data;
  },
  async generateEcheancierTemplate(payload: {
    eleve_id?: number;
    classe_id?: number;
    niveau?: string;
    montant_total: number;
    nb_tranches?: number;
    date_debut?: string;
    annee_scolaire?: string;
  }): Promise<any> {
    const response = await api.post(
      "/api/echeanciers/generate-template",
      payload,
    );
    return response.data;
  },
  async updateEcheance(id: number | string, payload: any): Promise<any> {
    const response = await api.put(`/api/echeanciers/${id}`, payload);
    return response.data;
  },
  async payEcheance(
    id: number | string,
    params: { montant: number; mode?: string; numero_transaction?: string },
  ): Promise<any> {
    const response = await api.post(`/api/echeanciers/${id}/pay`, null, {
      params,
    });
    return response.data;
  },
  async getHinnehOfficialPresets(params?: {
    ecole_id?: number | string;
    code_etablissement?: string;
    annee_scolaire?: string;
    type_service?: string;
    ville?: string;
  }): Promise<any[]> {
    const response = await api.get("/api/echeanciers/hinneh-presets", { params });
    return response.data;
  },
  async updateHinnehOfficialPreset(
    id: string,
    payload: {
      label: string;
      type_service?: string;
      cycle?: string;
      niveaux?: string[];
      statut_affectation?: string;
      zone_trajet?: string;
      periodicite?: string;
      tranches: Array<{ libelle: string; montant: number; date: string }>;
      annee_scolaire?: string;
      ecole_id?: number | string;
      code_etablissement?: string;
      ville?: string;
    },
  ): Promise<any> {
    const response = await api.put(
      `/api/echeanciers/hinneh-presets/${id}`,
      payload,
    );
    return response.data;
  },
  async deleteHinnehOfficialPreset(
    id: string,
    params?: {
      ecole_id?: number | string;
      code_etablissement?: string;
      annee_scolaire?: string;
      ville?: string;
    },
  ): Promise<any> {
    const response = await api.delete(`/api/echeanciers/hinneh-presets/${id}`, {
      params,
    });
    return response.data;
  },
  async getGrillesTarifaires(params?: {
    type_service?: "scolarite" | "transport" | "cantine";
    ecole_id?: number | string;
    code_etablissement?: string;
    ville?: string;
    annee_scolaire?: string;
  }): Promise<any[]> {
    const response = await api.get("/api/echeanciers/grilles", { params });
    return response.data;
  },
  async saveGrilleTarifaire(id: string, payload: any): Promise<any> {
    const response = await api.put(`/api/echeanciers/grilles/${id}`, payload);
    return response.data;
  },
  async deleteGrilleTarifaire(id: string, params?: any): Promise<any> {
    const response = await api.delete(`/api/echeanciers/grilles/${id}`, { params });
    return response.data;
  },
  async applyHinnehPreset(payload: {
    preset_id: string;
    eleve_id?: number;
    classe_id?: number;
    niveau?: string;
    annee_scolaire?: string;
  }): Promise<any> {
    const response = await api.post(
      "/api/echeanciers/apply-hinneh-preset",
      payload,
    );
    return response.data;
  },
  async generateStudentScolariteAuto(
    studentId: number | string,
    forceRealign = false,
  ): Promise<any> {
    const response = await api.post(
      `/api/echeanciers/generate-student-scolarite-auto/${studentId}`,
      null,
      { params: { force_realign: forceRealign } },
    );
    return response.data;
  },
  async deleteEcheance(id: number | string): Promise<any> {
    const response = await api.delete(`/api/echeanciers/${id}`);
    return response.data;
  },
  async purgeUnpaidEcheanciers(params?: { ecole_id?: number; code_etablissement?: string; annee_scolaire?: string }): Promise<any> {
    const response = await api.post("/api/echeanciers/purge-unpaid-echeanciers", null, { params });
    return response.data;
  },

  // Module Gestion de paiements Via Bank
  async getBankConfig(): Promise<any> {
    const response = await api.get("/api/bank/config");
    return response.data;
  },
  async updateBankConfig(payload: Record<string, any>): Promise<any> {
    const response = await api.put("/api/bank/config", payload);
    return response.data;
  },
  async testBankConnection(): Promise<any> {
    const response = await api.post("/api/bank/config/test");
    return response.data;
  },
  async getBankTransactions(params?: {
    statut?: string;
    rapproche?: boolean;
    eleve_id?: number;
    search?: string;
    date_debut?: string;
    date_fin?: string;
    limit?: number;
  }): Promise<any[]> {
    const response = await api.get("/api/bank/transactions", { params });
    return response.data;
  },
  async getBankStats(): Promise<any> {
    const response = await api.get("/api/bank/stats");
    return response.data;
  },
  async getBankSchedulerState(): Promise<any> {
    const response = await api.get("/api/bank/scheduler");
    return response.data;
  },
  async getBankSuiviEcheancier(params?: {
    statut_paiement?: "all" | "solde" | "partiel" | "impaye" | "en_retard";
    classe_id?: number;
    ecole_id?: number;
    search?: string;
    annee_scolaire?: string;
  }): Promise<any> {
    const response = await api.get("/api/bank/suivi-echeancier", { params });
    return response.data;
  },
  async syncBankTransactions(params?: {
    date_debut?: string;
    date_fin?: string;
  }): Promise<any> {
    const response = await api.post("/api/bank/sync", null, { params });
    return response.data;
  },
  async createBankTransaction(payload: {
    reference_externe: string;
    montant: number;
    matricule_eleve?: string;
    eleve_id?: number;
    statut?: string;
    canal?: string;
    motif?: string;
    payeur_nom?: string;
    payeur_telephone?: string;
    date_transaction?: string;
    annee_scolaire?: string;
  }): Promise<any> {
    const response = await api.post("/api/bank/transactions", payload);
    return response.data;
  },
  async initiateBankPayment(payload: {
    eleve_id: number;
    montant: number;
    motif?: string;
    canal?: string;
    payeur_nom?: string;
    payeur_telephone?: string;
    annee_scolaire?: string;
  }): Promise<any> {
    const response = await api.post("/api/bank/payments/initiate", payload);
    return response.data;
  },
  async refreshBankTransaction(id: number | string): Promise<any> {
    const response = await api.post(`/api/bank/transactions/${id}/refresh`);
    return response.data;
  },
  async linkBankTransactionToStudent(
    id: number | string,
    eleveId: number | string,
  ): Promise<any> {
    const response = await api.post(
      `/api/bank/transactions/${id}/link/${eleveId}`,
    );
    return response.data;
  },
  async reconcileBankTransaction(
    id: number | string,
    payload?: { eleve_id?: number; echeance_ids?: number[] },
  ): Promise<any> {
    const response = await api.post(
      `/api/bank/transactions/${id}/reconcile`,
      payload || {},
    );
    return response.data;
  },
  async reconcileAllBankTransactions(): Promise<any> {
    const response = await api.post("/api/bank/reconcile-auto");
    return response.data;
  },
  async deleteBankTransaction(id: number | string): Promise<any> {
    const response = await api.delete(`/api/bank/transactions/${id}`);
    return response.data;
  },

  // Caisse Module API
  async processCaisseEncaissement(payload: {
    eleve_id: number;
    motif: string;
    echeance_ids?: number[];
    montant: number;
    mode?: string;
    numero_transaction?: string;
    observation?: string;
    caissier_nom?: string;
    annee_scolaire?: string;
    date_operation?: string;
  }): Promise<any> {
    const finalPayload = {
      ...payload,
      date_operation: payload.date_operation || new Date().toISOString(),
    };
    const response = await api.post("/api/caisse/encaissement", finalPayload);
    invalidateCache("payments", "finance_stats", "recouvrement", "echeancier", "caisse");
    return response.data;
  },
  async getJournalCaisse(params?: {
    date_journal?: string;
    date_debut?: string;
    date_fin?: string;
    motif?: string;
    mode?: string;
    statut?: string;
    classe_id?: string | number;
    search?: string;
    all_dates?: boolean;
  }): Promise<any> {
    const response = await api.get("/api/caisse/journal", { params });
    return response.data;
  },
  async checkQuittusEligibility(studentId: number | string): Promise<any> {
    const response = await api.get(`/api/caisse/quittus-check/${studentId}`);
    return response.data;
  },
  async payCanteen(payload: {
    eleve_id: number;
    periode_type?: string;
    trimestre?: string;
    mois?: string;
    tarif: number;
    mode_paiement: string;
    numero_transaction?: string;
    observation?: string;
    date_operation?: string;
  }): Promise<any> {
    const finalPayload = {
      ...payload,
      date_operation: payload.date_operation || new Date().toISOString(),
    };
    const response = await api.post("/api/transport/pay-canteen", finalPayload);
    invalidateCache("payments", "finance_stats", "recouvrement", "echeancier", "caisse");
    return response.data;
  },
  async cancelPayment(id: number | string, motif_annulation: string, user_profil: string = "directeur"): Promise<any> {
    const response = await api.put(`/api/caisse/paiements/${id}/annuler`, {
      motif_annulation,
      annule_par: localStorage.getItem("username") || "Directeur",
      user_profil: user_profil || localStorage.getItem("user_role") || "directeur"
    });
    invalidateCache("payments", "finance_stats", "recouvrement", "echeancier", "caisse");
    return response.data;
  },
  async getRecuRecapitulatif(studentId: number | string): Promise<any> {
    const response = await api.get(`/api/caisse/eleve/${studentId}/recu-recapitulatif`);
    return response.data;
  },

  // ─── VILLES CRUD ──────────────────────────────────────────────────────────
  async getVilles(params?: { statut?: string }): Promise<any[]> {
    return cachedRequest("villes", params, 300_000, async () => {
      const response = await api.get("/api/villes/", { params });
      return response.data;
    });
  },
  async createVille(payload: { libelle: string; code?: string; region?: string; statut?: string }): Promise<any> {
    const response = await api.post("/api/villes/", payload);
    invalidateCache("villes");
    return response.data;
  },
  async updateVille(id: number | string, payload: Record<string, any>): Promise<any> {
    const response = await api.put(`/api/villes/${id}`, payload);
    invalidateCache("villes");
    return response.data;
  },
  async deleteVille(id: number | string): Promise<any> {
    const response = await api.delete(`/api/villes/${id}`);
    invalidateCache("villes");
    return response.data;
  },

  // ─── RENDEZ-VOUS (prise de rdv publique + file d'attente) ───────────────
  // ─── ANNÉES SCOLAIRES (référentiel) ─────────────────────────────────────
  async getAnneesScolaires(): Promise<AnneeScolaire[]> {
    return cachedRequest("annees_scolaires", null, 300_000, async () => {
      const response = await api.get("/api/annees-scolaires/");
      return response.data;
    });
  },
  async getAnneeScolaireActive(): Promise<AnneeScolaire | null> {
    return cachedRequest("annee_scolaire_active", null, 300_000, async () => {
      const response = await api.get("/api/annees-scolaires/active");
      return response.data;
    });
  },
  async createAnneeScolaire(payload: {
    libelle: string;
    date_debut: string;
    date_fin: string;
  }): Promise<AnneeScolaire> {
    const response = await api.post("/api/annees-scolaires/", payload);
    invalidateCache("annees_scolaires", "annee_scolaire_active");
    return response.data;
  },
  async activerAnneeScolaire(id: number | string): Promise<AnneeScolaire> {
    const response = await api.put(`/api/annees-scolaires/${id}/activer`);
    invalidateCache("annees_scolaires", "annee_scolaire_active");
    return response.data;
  },

  async getRendezVousList(params?: {
    statut?: string;
    ecole_id?: number;
    /** 'asc' = file d'attente FIFO (défaut), 'desc' = historique du plus récent au plus ancien. */
    ordre?: "asc" | "desc";
    limit?: number;
  }): Promise<any[]> {
    const response = await api.get("/api/rendezvous/", { params });
    return response.data;
  },
  async getRendezVous(id: number | string): Promise<any> {
    const response = await api.get(`/api/rendezvous/${id}`);
    return response.data;
  },
  async getRendezVousOptions(params?: { ecole_id?: number | null }): Promise<RendezVousOptions> {
    const response = await api.get("/api/rendezvous/options", { params });
    return response.data;
  },
  async getRendezVousDisponibilites(params: {
    date: string;
    ecole_id?: number | null;
  }): Promise<RendezVousDisponibilites> {
    const response = await api.get("/api/rendezvous/disponibilites", { params });
    return response.data;
  },
  async createRendezVous(payload: {
    nom: string;
    telephone: string;
    email?: string;
    nom_eleve: string;
    matricule_national?: string;
    classe_precedente?: string;
    type_demarche: TypeDemarche;
    niveau: string;
    ecole_id?: number | null;
    date_souhaitee: string;
    heure_souhaitee: string;
    motif?: string;
  }): Promise<any> {
    const response = await api.post("/api/rendezvous/", payload);
    return response.data;
  },
  async updateRendezVousStatut(id: number | string, payload: { statut: string; eleve_id?: number }): Promise<any> {
    const response = await api.put(`/api/rendezvous/${id}/statut`, payload);
    return response.data;
  },

  // ─── BIBLIOTHEQUE API ───────────────────────────────────────────────────
  async getLivres(params?: { code_ecole?: string }): Promise<any[]> {
    const response = await api.get("/api/bibliotheque/livres", { params });
    return response.data;
  },
  async createLivre(payload: {
    titre: string;
    auteur: string;
    isbn?: string;
    categorie: string;
    nombre_exemplaires: number;
    disponibles: number;
    emplacement?: string;
  }): Promise<any> {
    const response = await api.post("/api/bibliotheque/livres", payload);
    return response.data;
  },
  async updateLivre(id: number | string, payload: Record<string, any>): Promise<any> {
    const response = await api.put(`/api/bibliotheque/livres/${id}`, payload);
    return response.data;
  },
  async deleteLivre(id: number | string): Promise<any> {
    const response = await api.delete(`/api/bibliotheque/livres/${id}`);
    return response.data;
  },
  async getEmprunts(params?: { code_ecole?: string }): Promise<any[]> {
    const response = await api.get("/api/bibliotheque/emprunts", { params });
    return response.data;
  },
  async createEmprunt(payload: {
    livre_id: number;
    emprunteur_nom: string;
    date_retour_prevue: string;
    eleve_id?: number;
    personnel_id?: number;
  }): Promise<any> {
    const response = await api.post("/api/bibliotheque/emprunts", payload);
    return response.data;
  },
  async retourEmprunt(empruntId: number | string): Promise<any> {
    const response = await api.put(`/api/bibliotheque/emprunts/${empruntId}/retour`);
    return response.data;
  },
  // --- REDUCTIONS & ECHEANCIER AJUSTEMENTS ---
  async getReductions(params?: { eleve_id?: number; statut?: string }): Promise<any[]> {
    return cachedRequest("reductions", params, 60_000, async () => {
      const response = await api.get("/api/reductions/", { params });
      return response.data;
    });
  },
  async getStudentReductions(eleve_id: number): Promise<any[]> {
    return cachedRequest(`student_reductions:${eleve_id}`, null, 60_000, async () => {
      const response = await api.get(`/api/reductions/${eleve_id}`);
      return response.data;
    });
  },
  async getStudentEcheancierForReduction(eleve_id: number): Promise<any> {
    const response = await api.get(`/api/reductions/student/${eleve_id}/echeancier`);
    return response.data;
  },
  async previewReductionAdjustment(payload: {
    eleve_id: number;
    type_reduction: string;
    montant_reduction?: number;
    pourcentage_reduction?: number;
    service_type?: string;
    mode_dispersion?: string;
  }): Promise<any> {
    const response = await api.post("/api/reductions/preview-adjustment", payload);
    return response.data;
  },
  async createReduction(payload: {
    eleve_id: number;
    type_reduction: string;
    montant_reduction?: number;
    pourcentage_reduction?: number;
    motif?: string;
    date_debut?: string;
    date_fin?: string;
    service_type?: string;
    approuve_par?: string;
    appliquer_immediatement?: boolean;
    mode_dispersion?: string;
  }): Promise<any> {
    const response = await api.post("/api/reductions/", payload);
    invalidateCache("reductions", "student_reductions", "echeancier", "recouvrement", "finance_stats");
    return response.data;
  },
  async updateReduction(reductionId: number, payload: any): Promise<any> {
    const response = await api.put(`/api/reductions/${reductionId}`, payload);
    invalidateCache("reductions", "student_reductions", "echeancier", "recouvrement", "finance_stats");
    return response.data;
  },
  async deleteReduction(reductionId: number): Promise<any> {
    const response = await api.delete(`/api/reductions/${reductionId}`);
    invalidateCache("reductions", "student_reductions", "echeancier", "recouvrement", "finance_stats");
    return response.data;
  },
  async disperseReduction(reductionId: number, mode_dispersion?: string): Promise<any> {
    const response = await api.post(`/api/reductions/${reductionId}/disperse`, null, {
      params: mode_dispersion ? { mode_dispersion } : undefined
    });
    invalidateCache("reductions", "student_reductions", "echeancier", "recouvrement", "finance_stats");
    return response.data;
  },
  // --- PARAMÈTRES & RÈGLES D'ATTRIBUTION DES RÉDUCTIONS ---
  async getReductionParameters(params?: { ecole_id?: number; code_etablissement?: string; ville?: string }): Promise<any[]> {
    const response = await api.get("/api/reductions/parametres", { params });
    return response.data;
  },
  async createReductionParameter(payload: any): Promise<any> {
    const response = await api.post("/api/reductions/parametres", payload);
    return response.data;
  },
  async updateReductionParameter(id: number | string, payload: any): Promise<any> {
    const response = await api.put(`/api/reductions/parametres/${id}`, payload);
    return response.data;
  },
  async deleteReductionParameter(id: number | string): Promise<any> {
    const response = await api.delete(`/api/reductions/parametres/${id}`);
    return response.data;
  },
  async resetReductionParametersDefaults(params?: { ecole_id?: number; code_etablissement?: string; ville?: string }): Promise<any> {
    const response = await api.post("/api/reductions/parametres/reset-defaults", null, { params });
    return response.data;
  },
  // --- FRATRIE DALOA & GROUPE STRATÉGIQUE RÉDUCTIONS ---
  async checkFraterie(params: {
    parent_nom?: string;
    parent_whatsapp?: string;
    ecole_id?: number;
    ville?: string;
    current_student_id?: number;
  }): Promise<{
    eligible_daloa: boolean;
    is_daloa: boolean;
    fratrie_trouvee: boolean;
    count_existants: number;
    rang_calcule: number;
    pourcentage_reduction: number;
    motif_auto: string;
    enfants_existants: any[];
  }> {
    const response = await api.get("/api/students/check-fraterie", { params });
    return response.data;
  },
  async getGroupeStrategique(params?: { ecole_id?: number }): Promise<any[]> {
    const response = await api.get("/api/staff/groupe-strategique/list", { params });
    return response.data;
  },
  async toggleGroupeStrategique(
    staffId: number | string,
    payload?: { is_groupe_strategique?: boolean; nomme_par?: string }
  ): Promise<any> {
    const response = await api.post(`/api/staff/${staffId}/toggle-groupe-strategique`, payload || {});
    return response.data;
  },
  async getDossierEleve(eleveId: number | string): Promise<any> {
    const response = await api.get(`/api/dossiers/eleve/${eleveId}`);
    return response.data;
  },
  getBadgeQRUrl(eleveId: number | string): string {
    return `/api/badges/eleve/${eleveId}/qr`;
  },
  // --- PARC AUTOMOBILE & FLOTTE ---
  async getParcAutoVehicules(params?: { search?: string; statut?: string; type_vehicule?: string }): Promise<any[]> {
    const response = await api.get("/api/parcauto/vehicules", { params });
    return response.data;
  },
  async createParcAutoVehicule(payload: any): Promise<any> {
    const response = await api.post("/api/parcauto/vehicules", payload);
    return response.data;
  },
  async updateParcAutoVehicule(id: number, payload: any): Promise<any> {
    const response = await api.put(`/api/parcauto/vehicules/${id}`, payload);
    return response.data;
  },
  async deleteParcAutoVehicule(id: number): Promise<any> {
    const response = await api.delete(`/api/parcauto/vehicules/${id}`);
    return response.data;
  },
  async getParcAutoFichesAgents(): Promise<any[]> {
    const response = await api.get("/api/parcauto/fiches-agents");
    return response.data;
  },
  async createParcAutoFicheAgent(payload: any): Promise<any> {
    const response = await api.post("/api/parcauto/fiches-agents", payload);
    return response.data;
  },
  async updateParcAutoFicheAgent(id: number, payload: any): Promise<any> {
    const response = await api.put(`/api/parcauto/fiches-agents/${id}`, payload);
    return response.data;
  },
  async deleteParcAutoFicheAgent(id: number): Promise<any> {
    const response = await api.delete(`/api/parcauto/fiches-agents/${id}`);
    return response.data;
  },
  async getParcAutoEntretiens(params?: { immatriculation?: string }): Promise<any[]> {
    const response = await api.get("/api/parcauto/entretiens", { params });
    return response.data;
  },
  async createParcAutoEntretien(payload: any): Promise<any> {
    const response = await api.post("/api/parcauto/entretiens", payload);
    return response.data;
  },
  async deleteParcAutoEntretien(id: number): Promise<any> {
    const response = await api.delete(`/api/parcauto/entretiens/${id}`);
    return response.data;
  },
  async getParcAutoStats(): Promise<any> {
    const response = await api.get("/api/parcauto/stats");
    return response.data;
  },

  // ─── Journal d'Audit & Sécurité ──────────────────────────────────────────
  async getAuditLogs(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    module?: string;
    action?: string;
    statut?: string;
    date_debut?: string;
    date_fin?: string;
    user_id?: number;
    username?: string;
    role?: string;
    ecole_id?: number;
    code_etablissement?: string;
    ville?: string;
  }): Promise<{ items: any[]; total: number; page: number; page_size: number; pages: number }> {
    const response = await api.get("/api/audit/logs", { params });
    return response.data;
  },

  async getAuditStats(params?: {
    ecole_id?: number;
    code_etablissement?: string;
    ville?: string;
  }): Promise<{
    total_logs: number;
    logs_24h: number;
    failed_logins_24h: number;
    critical_actions: number;
    by_module: Record<string, number>;
    by_statut: Record<string, number>;
  }> {
    const response = await api.get("/api/audit/stats", { params });
    return response.data;
  },

  async logAuditEvent(payload: {
    action: string;
    module: string;
    detail?: string;
    target_id?: string;
    target_name?: string;
    statut?: string;
    username?: string;
    user_role?: string;
    ecole_id?: number;
    code_etablissement?: string;
    ville?: string;
  }): Promise<any> {
    const response = await api.post("/api/audit/log", payload);
    return response.data;
  },

  // ─ Attributions niveaux / cycles aux éducateurs ────────────────────────────
  async getAttributionsEducateurs(params?: { educateur_id?: number; ecole_id?: number }): Promise<any[]> {
    return cachedRequest("attributions_educateurs", params, 120_000, async () => {
      const response = await api.get("/api/classes/attributions-educateurs", { params });
      return response.data;
    });
  },
  async assignEducateurNiveaux(payload: {
    educateur_ids: number[];
    cycle_ids?: number[];
    niveau_ids?: number[];
    ecole_id?: number;
    code_etablissement?: string;
  }): Promise<any> {
    const response = await api.post("/api/classes/attributions-educateurs/assign", payload);
    invalidateCache("attributions_educateurs");
    return response.data;
  },
  async deleteEducateurAttributions(educateur_id: number): Promise<any> {
    const response = await api.delete(`/api/classes/attributions-educateurs/educateur/${educateur_id}`);
    invalidateCache("attributions_educateurs");
    return response.data;
  },
  async deleteAttributionEducateur(id: number): Promise<any> {
    const response = await api.delete(`/api/classes/attributions-educateurs/${id}`);
    invalidateCache("attributions_educateurs");
    return response.data;
  },
  async getMyEducateurAttributions(): Promise<{
    has_restrictions: boolean;
    educateur_id: number | null;
    cycles: any[];
    niveaux: any[];
    cycle_ids: number[];
    niveau_ids: number[];
  }> {
    return cachedRequest("my_educateur_attributions", null, 120_000, async () => {
      const response = await api.get("/api/classes/attributions-educateurs/my-attributions");
      return response.data;
    });
  },

  // ─ Contrôle et Gestion des transactions Mobile Money & Coris Bank ─────────
  async checkTransactionId(
    numeroTransaction: string,
    excludePaymentId?: number | string
  ): Promise<{ exists: boolean; paiement?: any }> {
    const params: any = { numero_transaction: numeroTransaction };
    if (excludePaymentId !== undefined && excludePaymentId !== null && excludePaymentId !== '') {
      params.exclude_payment_id = Number(excludePaymentId);
    }
    const response = await api.get("/api/caisse/check-transaction-id", { params });
    return response.data;
  },

  async updateTransactionId(
    paymentId: number | string,
    payload: {
      nouveau_numero_transaction: string;
      motif_modification: string;
      admin_nom?: string;
    }
  ): Promise<any> {
    const response = await api.put(`/api/caisse/transaction-id/${paymentId}`, payload);
    invalidateCache("payments", "finance_stats", "recouvrement", "caisse");
    return response.data;
  },

  async getMobileMoneyCorisTransactions(params?: {
    search?: string;
    mode?: string;
    ecole_id?: number;
    limit?: number;
  }): Promise<any[]> {
    return cachedRequest("mm_coris_txs", params, 20_000, async () => {
      const response = await api.get("/api/caisse/mobile-money-coris-transactions", { params });
      return response.data || [];
    });
  },

  // In-memory cache management
  clearCache(): void {
    clearCache();
  },
  invalidateCache(...patterns: string[]): void {
    invalidateCache(...patterns);
  },
};
export default apiClient;
