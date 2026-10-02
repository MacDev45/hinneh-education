import type { LucideIcon } from "lucide-react";

export const ROUTE_PATHS = {
  LOGIN: '/',
  DASHBOARD: '/dashboard',
  SCHOOLS: '/schools',
  SCHOOL_DETAIL: '/schools/:id',
  STUDENTS: '/students',
  STUDENT_DETAIL: '/students/:id',
  ATTENDANCE: '/attendance',
  GRADES: '/grades',
  CONFESSIONAL: '/confessional',
  FINANCE: '/finance',
  HR: '/hr',
  COMMUNICATION: '/communication',
  REPORTS: '/reports',
  ADMINISTRATION: '/administration',
  PARENT_PORTAL: '/parent-portal',
  CRM: '/crm',
  CRM_CONTACT_DETAIL: '/crm/contacts/:id',
  CRM_LEAD_DETAIL: '/crm/leads/:id',
  TEACHER_SPACE: '/teacher-space',
  PROFESSEUR_SPACE: '/professeur-space',
  INSTITUTEUR_SPACE: '/instituteur-space',
  EDUCATOR_SPACE: '/educator-space',
  ADMIN_STAFF_SPACE: '/admin-staff-space',
  CLASS_LISTS: '/class-lists',
  RAPPORT_RENTREE: '/rapport-rentree',
  RAPPORT_TRIMESTRIEL: '/rapport-trimestriel',
  PREINSCRIPTION: '/preinscription',
  PRISE_RDV: '/prise-rdv',
  STAFF_REGISTRATION: '/inscription-personnel',
  ACCUEIL_SPACE: '/accueil-space',
  AGENT_SPACE: '/agent-space',
  REDUCTIONS: '/reductions',
  INSCRIPTION_PROCESS: '/inscription-process',
  SCOLARITE_SPACE: '/scolarite',
  ECHEANCIER_SPACE: '/echeancier',
  CAISSE_SPACE: '/caisse',
  BANK_PAYMENTS: '/paiements-bank',
  COMPTABILITE_SPACE: '/comptabilite',
  COMPTABILITE_MODULES: '/comptabilite-modules',
  TRANSPORT_SPACE: '/transport',
  SCHOOL_PROFILE: '/school-profile',
  IMPORT_DATA: '/import',
  SALLES_SPACE: '/salles',
  RH_SPACE: '/rh',
  BULLETINS_SPACE: '/bulletins',
  NOTIFICATIONS_SPACE: '/notifications',
  PRESENCES_SPACE: '/presences-avancees',
  RAPPORTS_SPACE: '/rapports',
  MESSAGERIE_SPACE: '/messagerie',
  EXAMENS_SPACE: '/examens',
  PORTAIL_FAMILLE: '/portail-famille',
  PARAMETRES_SPACE: '/parametres',
  CONTROLE_MEDICAL: '/controle-medical',
  VIE_SCOLAIRE_TEST: '/vie-scolaire-test',
  IMPAYES_SPACE: '/impayes',
  BILLETS_ENTREE: '/billets-entree',
  STUDENT_PUBLIC: '/student-public/:id',
  ECONOMAT_SPACE: '/economat',
  BIBLIOTHEQUE_SPACE: '/bibliotheque',
  PARC_AUTO_SPACE: '/parc-auto',
  PEDAGOGIE_ADVANCED: '/pedagogie-avancee',
  DOSSIER_ELEVE: '/dossier-eleve',
  DOSSIER_ELEVE_DETAIL: '/dossier-eleve/:eleve_id',
  RH_DEMANDES: '/rh-demandes',
  BADGES_QR: '/badge-qr',
  BADGES_QR_DETAIL: '/badge-qr/:eleve_id',
  RECOUVREMENT: '/recouvrement',
  RECOUVREMENT_SPACE: '/recouvrement',
  POINTAGE_BADGE: '/pointage-badge',
  STUDENT_TRANSFER: '/transfert-classes',
  STUDENT_SERIE_TRANSFER: '/transfert-series',
  STUDENT_WITHDRAWAL: '/retrait-eleves',
} as const;

// ─── CRM TYPES ──────────────────────────────────────────────────────────────

export type CRMContactType =
  | 'parent'
  | 'prospect_parent'
  | 'donateur'
  | 'partenaire'
  | 'institution'
  | 'media'
  | 'alumni'
  | 'autre';

export type CRMLeadStatus =
  | 'nouveau'
  | 'contacte'
  | 'interesse'
  | 'visite_programmee'
  | 'dossier_soumis'
  | 'inscrit'
  | 'perdu'
  | 'abandonne';

export type CRMLeadSource =
  | 'bouche_a_oreille'
  | 'reseaux_sociaux'
  | 'site_web'
  | 'evenement'
  | 'prospection'
  | 'partenaire'
  | 'presse'
  | 'autre';

export type CRMInteractionType =
  | 'appel'
  | 'sms'
  | 'whatsapp'
  | 'email'
  | 'visite'
  | 'reunion'
  | 'evenement'
  | 'note';

export type CRMPriority = 'haute' | 'moyenne' | 'basse';

export interface CRMContact {
  id: string;
  type: CRMContactType;
  firstName: string;
  lastName: string;
  phone: string;
  phone2?: string;
  email?: string;
  address?: string;
  city: string;
  profession?: string;
  organisation?: string;
  tags: string[];
  schoolId?: string;
  studentIds?: string[];
  status: 'actif' | 'inactif' | 'bloque';
  notes?: string;
  photo?: string;
  leadId?: string;
  totalDons?: number;
  lastInteractionDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CRMLead {
  id: string;
  contactId: string;
  childFirstName: string;
  childLastName: string;
  childDateOfBirth: Date;
  childGender: 'M' | 'F';
  desiredCycle: 'maternelle' | 'primaire' | 'college' | 'lycee';
  desiredSchoolId?: string;
  currentSchool?: string;
  status: CRMLeadStatus;
  source: CRMLeadSource;
  priority: CRMPriority;
  assignedTo?: string;
  expectedEnrollmentDate?: Date;
  estimatedValue?: number;
  notes?: string;
  tags: string[];
  lostReason?: string;
  convertedStudentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CRMInteraction {
  id: string;
  contactId: string;
  leadId?: string;
  type: CRMInteractionType;
  direction: 'entrant' | 'sortant';
  subject: string;
  content: string;
  outcome?: string;
  duration?: number;
  staffId?: string;
  staffName?: string;
  scheduledAt?: Date;
  completedAt?: Date;
  nextActionDate?: Date;
  nextActionNote?: string;
  attachments?: string[];
  createdAt: Date;
}

export interface CRMTask {
  id: string;
  contactId?: string;
  leadId?: string;
  title: string;
  description?: string;
  type: 'rappel' | 'visite' | 'email' | 'appel' | 'relance' | 'autre';
  priority: CRMPriority;
  status: 'a_faire' | 'en_cours' | 'termine' | 'annule';
  assignedTo?: string;
  dueDate: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface CRMCampaign {
  id: string;
  title: string;
  description: string;
  type: 'sms' | 'whatsapp' | 'email' | 'appel' | 'evenement';
  status: 'brouillon' | 'planifiee' | 'en_cours' | 'terminee' | 'annulee';
  targetAudience: CRMContactType[];
  targetSchoolIds?: string[];
  scheduledAt?: Date;
  sentAt?: Date;
  totalContacts: number;
  sentCount: number;
  openCount: number;
  responseCount: number;
  content: string;
  createdAt: Date;
}

export interface CRMDonation {
  id: string;
  contactId: string;
  amount: number;
  currency: string;
  mode: 'especes' | 'mobile_money' | 'virement' | 'cheque';
  purpose: 'general' | 'bourses' | 'infrastructure' | 'materiel' | 'evenement' | 'autre';
  schoolId?: string;
  receiptNumber?: string;
  status: 'recu' | 'en_attente' | 'annule';
  date: Date;
  notes?: string;
  createdAt: Date;
}

export interface CRMStats {
  totalContacts: number;
  activeLeads: number;
  conversionRate: number;
  totalDonations: number;
  pendingTasks: number;
  scheduledCampaigns: number;
  newContactsThisMonth: number;
  leadsConvertedThisMonth: number;
}

export type UserRole =
  | 'direction_fondation'
  | 'directeur_ecole'
  | 'directeur_etudes'
  | 'directeur'
  | 'enseignant'
  | 'educateur'
  | 'parent'
  | 'eleve'
  | 'comptable'
  | 'rh'
  | 'admin'
  | 'superuser'
  | 'accueil'
  | 'agent'
  | 'scolarite'
  | 'caisse'
  | 'secretaire_direction'
  | 'economat'
  | 'intendant';

export interface School {
  id: string;
  name: string;
  code?: string;
  region: string;
  city: string;
  address: string;
  cycles: ('maternelle' | 'primaire' | 'college' | 'lycee')[];
  status: 'actif' | 'suspendu' | 'en_creation';
  effectif: number;
  classCount: number;
  staffCount: number;
  performanceScore: number;
  tauxPresence: number;
  tauxRecouvrement: number;
  logo?: string;
  email?: string;
  contacts?: string;
  createdAt: Date;
}

export interface Student {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'M' | 'F';
  schoolId: string;
  classId: string;
  status: 'actif' | 'radie' | 'transfere' | 'preinscrit';
  photo?: string;
  parentIds: string[];
  solde: number;
  moyenne: number;
  rank?: number;
  healthNotes?: string;
  createdAt: Date;
  dateNaissance?: string;
  notesSante?: string;
  parentEmail?: string;
  parentPhone?: string;
  MA_LV2?: string;
  AU_LANGUEVIVANTE2?: string;
  regime?: 'Boursier' | 'Demi-boursier' | 'Non-boursier' | string;
  AU_COMMUNE?: string;
  AU_QUARTIER?: string;
  AU_ADRESSE_GEO?: string;
  AU_ADRESSE_POSTALE?: string;
  lieu_habitation?: string;
  AU_MONTANTARRIERE?: number;
  AU_SCOLARITE?: number;
  AU_TOTALDEPOT?: number;
  AU_SOLDECOMPTE?: number;
  ET_CODEETABLISSEMENT?: string;
  code_etablissement?: string;
  codeEtablissement?: string;
  ecole_id?: number;
}

export interface Parent {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address: string;
  profession?: string;
  studentIds: string[];
  createdAt: Date;
}

export interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  fonction:
    | 'enseignant'
    | 'admin'
    | 'coranique'
    | 'surveillance'
    | 'service'
    | 'direction';
  schoolId: string;
  status: 'actif' | 'conge' | 'absent' | 'en_attente';
  chargeHoraire: number;
  photo?: string;
  evaluationScore?: number;
  disponibilites?: any;
  ecolesAutorisees?: (string | number)[];
  createdAt: Date;
}

export interface ClassRoom {
  id: string;
  name: string;
  niveau: string;
  cycle: 'maternelle' | 'primaire' | 'college' | 'lycee';
  schoolId: string;
  teacherId: string;
  studentCount: number;
  capacity: number;
  createdAt: Date;
}

export interface Evaluation {
  id: string;
  studentId: string;
  classId: string;
  subject: string;
  type: string;
  trimester: 1 | 2 | 3;
  note: number;
  coefficient: number;
  date: Date;
  appreciation?: string;
  createdAt: Date;
  devoir_numero?: string;
  date_recuperation?: Date;
  date_correction?: Date;
  date_remise?: Date;
  valide?: boolean;
  autorisation_modification?: boolean;
  justification_modification?: string;
}

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  montant?: number;
  type: 'scolarite' | 'inscription' | 'cantine' | 'transport' | 'autre';
  mode: 'especes' | 'mobile_money' | 'virement' | 'carte';
  status: 'paye' | 'en_attente' | 'annule';
  statut?: string;
  date: Date;
  date_acquittement?: Date | string;
  dueDate?: Date;
  receiptNumber?: string;
  transactionNumber?: string;
  observation?: string;
  createdAt: Date;
  ecole_id?: number;
  schoolId?: string;
  ET_CODEETABLISSEMENT?: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  classId: string;
  date: Date;
  status: 'present' | 'absent' | 'retard' | 'excuse';
  justification?: string;
  createdAt: Date;
  heure?: string;
  locked?: boolean;
}

export interface Seance {
  id: string;
  titre: string;
  contenu: string;
  date: Date;
  heure?: string;
  classe_id: number;
  enseignant_id: number;
  matiere_id: number;
}

export interface Pointage {
  id: string;
  date: Date;
  heure_arrivee?: string;
  heure_depart?: string;
  statut: 'present' | 'absent' | 'retard';
  personnel_id: number;
}

export interface ConfessionalRecord {
  id: string;
  studentId: string;
  surah: string;
  surahNumber: number;
  status: 'memorise' | 'en_cours' | 'non_debute';
  tajwidScore?: number;
  revisionDate?: Date;
  observations?: string;
  progressPercentage: number;
  createdAt: Date;
}

export interface Incident {
  id: string;
  studentId: string;
  type: string;
  severity: 'mineur' | 'moyen' | 'grave';
  description: string;
  date: Date;
  status: 'ouvert' | 'en_cours' | 'resolu';
  actionTaken?: string;
  createdAt: Date;
}

export interface KPICard {
  id: string;
  title: string;
  value: string | number;
  trend?: number;
  trendDirection?: 'up' | 'down';
  period?: string;
  icon?: LucideIcon;
  color?: string;
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  schoolId?: string;
  timestamp: Date;
  status: 'active' | 'resolved';
  actionRequired?: string;
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA';
};

/**
 * Formate le nom d'un élève (ou tout profil personne) selon la convention
 * officielle unique de la plateforme : NOM Prénom (nom de famille en majuscules).
 * Accepte indifféremment les champs mappés (firstName/lastName) ou bruts (prenom/nom).
 */
export const formatStudentName = (person: any, options?: { upperLastName?: boolean }): string => {
  if (!person) return '';
  const nom = String(
    person.lastName || 
    person.nom || 
    person.AU_NOM || 
    person.eleveNom || 
    person.childLastName || 
    person.nomComplet || 
    ''
  ).trim();
  const prenom = String(
    person.firstName || 
    person.prenom || 
    person.AU_PRENOM || 
    person.elevePrenom || 
    person.childFirstName || 
    ''
  ).trim();
  const upperLastName = options?.upperLastName !== false;
  const nomDisplay = upperLastName ? nom.toUpperCase() : nom;
  return `${nomDisplay} ${prenom}`.trim();
};

export const formatFullName = (nom?: string | null, prenom?: string | null, options?: { upperLastName?: boolean }): string => {
  const n = String(nom || '').trim();
  const p = String(prenom || '').trim();
  const upper = options?.upperLastName !== false;
  const nomDisplay = upper ? n.toUpperCase() : n;
  return `${nomDisplay} ${p}`.trim();
};

export const getPersonInitials = (person: any): string => {
  if (!person) return 'EL';
  const nom = String(person.lastName || person.nom || person.AU_NOM || person.eleveNom || person.childLastName || '').trim();
  const prenom = String(person.firstName || person.prenom || person.AU_PRENOM || person.elevePrenom || person.childFirstName || '').trim();
  const n0 = nom ? nom[0] : '';
  const p0 = prenom ? prenom[0] : '';
  return `${n0}${p0}`.toUpperCase() || 'EL';
};

export const TIMEZONE_GMT = 'Africa/Abidjan';

export const formatDate = (date: any): string => {
  if (!date) return '—';
  if (date instanceof Date) {
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: TIMEZONE_GMT,
    }).format(date);
  }
  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (!trimmed) return '—';
    // If format "DD/MM/YYYY" or "DD-MM-YYYY"
    if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(trimmed)) {
      return trimmed.replace(/-/g, '/');
    }
    // If format "YYYY-MM-DD"
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const parts = trimmed.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    // If only time "HH:MM:SS"
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: TIMEZONE_GMT,
      }).format(new Date());
    }
    // If datetime format "YYYY-MM-DD HH:MM:SS"
    if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}/.test(trimmed)) {
      const d = new Date(trimmed.replace(' ', 'T') + 'Z');
      if (!isNaN(d.getTime())) {
        return new Intl.DateTimeFormat('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          timeZone: TIMEZONE_GMT,
        }).format(d);
      }
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: TIMEZONE_GMT,
      }).format(d);
    }
  }
  return String(date);
};

export const formatDisplayDateAbidjan = (rawDate: any): string => {
  return formatDate(rawDate);
};

export const formatDateTime = (date: any): string => {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE_GMT,
  }).format(d) + ' GMT';
};

export const formatTimeGMT = (date: any): string => {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: TIMEZONE_GMT,
  }).format(d) + ' GMT';
};

export const formatDisplayTimeAbidjan = (rawDate: any): string => {
  if (!rawDate) return '—';
  if (typeof rawDate === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(rawDate.trim())) {
    return rawDate.trim();
  }
  try {
    const d = rawDate instanceof Date ? rawDate : new Date(rawDate);
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: TIMEZONE_GMT,
      }).format(d);
    }
  } catch {}
  return String(rawDate);
};

export const calculateAge = (dateOfBirth: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
};

export const getStatusBadgeColor = (
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  const statusMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    actif: 'default',
    present: 'default',
    paye: 'default',
    memorise: 'default',
    resolu: 'default',
    suspendu: 'destructive',
    radie: 'destructive',
    absent: 'destructive',
    grave: 'destructive',
    critical: 'destructive',
    en_creation: 'secondary',
    en_cours: 'secondary',
    retard: 'secondary',
    excuse: 'secondary',
    warning: 'secondary',
    preinscrit: 'secondary',
    transfere: 'outline',
    conge: 'outline',
    annule: 'outline',
    non_debute: 'outline',
    info: 'outline',
  };
  return statusMap[status] || 'default';
};

export const getSeverityColor = (severity: string): string => {
  const severityMap: Record<string, string> = {
    critical: 'text-destructive',
    warning: 'text-yellow-600',
    info: 'text-blue-600',
    mineur: 'text-blue-600',
    moyen: 'text-yellow-600',
    grave: 'text-destructive',
  };
  return severityMap[severity] || 'text-muted-foreground';
};

export const normalizeString = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’\-]/g, " ")
    .trim();
};

export const matchStudentSearch = (student: any, query: string): boolean => {
  if (!query || !query.trim()) return false;
  if (!student) return false;

  const normQuery = normalizeString(query);
  const queryTokens = normQuery.split(/\s+/).filter(Boolean);
  if (queryTokens.length === 0) return false;

  const prenom = normalizeString(student.firstName || student.prenom || '');
  const nom = normalizeString(student.lastName || student.nom || '');
  const matricule = normalizeString(student.matricule || '');
  const level = normalizeString(student.className || student.classLevel || student.level || '');
  const parent = normalizeString(student.parentName || student.AU_TUTEURLEGAL || '');
  const phone = normalizeString(student.parentPhone || student.AU_CONTACTS || '');

  const fullText = `${prenom} ${nom} ${nom} ${prenom} ${matricule} ${level} ${parent} ${phone}`;

  return queryTokens.every(token => fullText.includes(token));
};

export const resolveStudentClassName = (student: any, classesList: any[] = []): string => {
  if (!student) return "";

  const directName =
    student.className ||
    student.class_name ||
    student.classe_name ||
    student.classe_nom ||
    student.classeNom ||
    (typeof student.classe === "string"
      ? student.classe
      : (student.classe?.name || student.classe?.CE_LIBELLE || student.classe?.libelle || student.classe?.nom)) ||
    student.CE_LIBELLE ||
    student.level ||
    student.niveau ||
    student.niveau_nom ||
    student.niveauNom ||
    student.AU_NIVEAU ||
    student.ET_NIVEAU ||
    student.AU_CLASSEPRECEDENTE;

  if (directName && typeof directName === "string" && directName.trim() !== "" && directName.trim() !== "Non affecté") {
    return directName.trim();
  }

  const cId = student.classId || student.classe_id || student.CE_IDCLASSE || student.classeId;
  if (cId && Array.isArray(classesList) && classesList.length > 0) {
    const found = classesList.find((c: any) =>
      String(c.id) === String(cId) ||
      String(c.CE_IDCLASSE) === String(cId) ||
      String(c.code) === String(cId)
    );
    if (found) {
      const clsName = found.CE_LIBELLE || found.name || found.libelle || found.nom || found.code;
      if (clsName && typeof clsName === "string" && clsName.trim() !== "") {
        return clsName.trim();
      }
    }
  }

  if (directName && typeof directName === "string" && directName.trim() !== "") {
    return directName.trim();
  }

  return "Non renseigné";
};
