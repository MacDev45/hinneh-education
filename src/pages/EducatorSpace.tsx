import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { StatsCard } from '@/components/Stats';
import {
  Users,
  CalendarCheck,
  Briefcase,
  UserCog,
  GraduationCap,
  School as SchoolIcon,
  ArrowRight,
  Bell,
  AlertCircle,
  Download,
  DollarSign,
  Send,
  Clock,
  Search,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileWarning,
  ShieldAlert,
  CheckCircle2,
  Heart,
  UserCheck,
  Pencil,
  Ticket,
  Stethoscope,
  FileSpreadsheet,
  Printer,
  Activity,
  ClipboardList,
  Home,
  ClipboardCheck,
  UserPlus,
  QrCode,
  Scan,
  Lock,
  Unlock,
  Award,
  FileText,
  Check,
  Save,
  Table,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, staggerItem, springPresets } from '@/lib/motion';
import { formatStudentName, ROUTE_PATHS, type Student, type Staff, type Attendance, type School, type ClassRoom, type Payment, type Evaluation, type Incident, type Pointage, formatDate, formatCurrency } from '@/lib/index';
import apiClient from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import html2pdf from 'html2pdf.js';
import {
  printBilletEntreeRetard,
  printBilletReposMaladie,
  printFicheAppelClasse,
} from '@/lib/certificatePrinter';
import {
  printFicheNotesManuelle,
  exportFicheNotesManuellePdf,
  exportFicheNotesManuelleExcel,
  printMultipleFichesNotesManuelles,
  formatNomEleveModele,
  ARMOIRIES_CI_BASE64,
  LOGO_HINNEH_BASE64,
  resolveFicheMetadata,
} from '@/lib/ficheNotesManuellePrinter';
import { printBulletins } from '@/lib/bulletinPrinter';
import { printBordereauDEPS, exportExcelDEPS, computeStudentDepsList } from '@/lib/depsPrinter';
import { periodesApi, PeriodeScolaire, computePeriodeStatus } from '@/lib/periodesApi';
import { printMatrice, printPV } from '@/pages/Grades';

const userRole = typeof window !== 'undefined' ? localStorage.getItem('user_role') : 'educateur';
const username = typeof window !== 'undefined' ? localStorage.getItem('username') : 'Éducateur';

export default function EducatorSpace() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [studentsCount, setStudentsCount] = useState(0);
  const [staffCount, setStaffCount] = useState(0);
  const [attendanceToday, setAttendanceToday] = useState(0);
  const [schoolsCount, setSchoolsCount] = useState(0);
  const [recentStudents, setRecentStudents] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [allAttendance, setAllAttendance] = useState<Attendance[]>([]);
  const [allPointages, setAllPointages] = useState<Pointage[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchAbsences, setSearchAbsences] = useState('');
  const [searchStaff, setSearchStaff] = useState('');
  const [retardsMap, setRetardsMap] = useState<Record<string, { heure: string; statut: 'excuse' | 'exclu'; note: string }>>({});
  const [retardDialog, setRetardDialog] = useState<{ student: Student; heure: string } | null>(null);
  const [retardNote, setRetardNote] = useState('');
  // ─ Note de conduite ────────────────────────────────────────
  const [allEvaluations, setAllEvaluations] = useState<Evaluation[]>([]);
  const [conduiteEducateur, setConduiteEducateur] = useState<Record<string, number>>({});
  const [conduiteClassId, setConduiteClassId] = useState<string>('all');
  const [searchConduite, setSearchConduite] = useState('');
  // Notifications parents
  type NotifParent = {
    id: string;
    studentId: string;
    studentName: string;
    canal: 'sms' | 'whatsapp' | 'email';
    message: string;
    date: string;
    statut: 'envoye' | 'en_attente';
    parentPhone?: string;
    parentEmail?: string;
  };
  const [notifs, setNotifs] = useState<NotifParent[]>([]);
  const [notifDialog, setNotifDialog] = useState<{ student: Student } | null>(null);
  const [notifCanal, setNotifCanal] = useState<'sms' | 'whatsapp' | 'email'>('sms');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifSentIds, setNotifSentIds] = useState<Set<string>>(new Set());
  // Module incidents
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incidentDialog, setIncidentDialog] = useState(false);
  const [incidentForm, setIncidentForm] = useState<{
    studentId: string;
    type: string;
    severity: 'mineur' | 'moyen' | 'grave';
    description: string;
    actionTaken: string;
  }>({ studentId: '', type: 'comportement', severity: 'mineur', description: '', actionTaken: '' });
  const [searchIncidents, setSearchIncidents] = useState('');
  // Assistance sociale
  type DossierSocial = {
    id: string;
    studentId: string;
    situation: string;
    priorite: 'faible' | 'moyenne' | 'urgente';
    suivi: string;
    dateOuverture: string;
    statut: 'actif' | 'clos';
    notes: { date: string; contenu: string }[];
  };
  const [dossiersSociaux, setDossiersSociaux] = useState<DossierSocial[]>([]);
  const [socialDialog, setSocialDialog] = useState(false);
  const [socialForm, setSocialForm] = useState<{
    studentId: string; situation: string; priorite: 'faible' | 'moyenne' | 'urgente'; suivi: string;
  }>({ studentId: '', situation: 'precarite', priorite: 'moyenne', suivi: '' });
  const [socialNoteDialog, setSocialNoteDialog] = useState<string | null>(null);
  const [socialNoteText, setSocialNoteText] = useState('');
  const [searchSocial, setSearchSocial] = useState('');
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderStep, setReminderStep] = useState<'list' | 'compose'>('list');
  const [selectedReminderStudent, setSelectedReminderStudent] = useState<Student | null>(null);
  const [selectedReminderPayment, setSelectedReminderPayment] = useState<Payment | null>(null);
  const [reminderMessage, setReminderMessage] = useState('');
  const [reminderChannel, setReminderChannel] = useState('email');
  const [today, setToday] = useState(formatDate(new Date()));

  // ─ Fiche d'Appel journalière M1..M5 et S1..S5 ─────────────────────────────
  const [ficheClasseId, setFicheClasseId] = useState<string>('');
  const [ficheDate, setFicheDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const CRENEAUX_JOURNEE = ['M1', 'M2', 'M3', 'M4', 'M5', 'S1', 'S2', 'S3', 'S4', 'S5'];

  // ─ Fiche de Notes Manuelle (Modèle Officiel pour enseignants) ───────────
  const [notesClasseId, setNotesClasseId] = useState<string>('');
  const [notesAnneeScolaire, setNotesAnneeScolaire] = useState<string>('2024-2025');
  const [notesNbInterros, setNotesNbInterros] = useState<number>(5);
  const [notesNbDevoirs, setNotesNbDevoirs] = useState<number>(4);
  const [notesExtraRows, setNotesExtraRows] = useState<number>(0);
  const [notesOrientation, setNotesOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [notesSubject, setNotesSubject] = useState<string>('');
  const [notesTeacher, setNotesTeacher] = useState<string>('');
  const [notesShowSubject, setNotesShowSubject] = useState<boolean>(false);

  // ─ Saisie des Notes Enseignants par l'Éducateur ───────────────────────────
  const [saisieClassId, setSaisieClassId] = useState<string>('');
  const [saisieTeacherId, setSaisieTeacherId] = useState<string>('');
  const [saisieMatiere, setSaisieMatiere] = useState<string>('Français');
  const [saisieTrimestre, setSaisieTrimestre] = useState<number>(1);
  const [saisieTypeDevoir, setSaisieTypeDevoir] = useState<string>('interrogation écrite');
  const [saisieDevoirNum, setSaisieDevoirNum] = useState<string>('INT-1');
  const [saisieCoeff, setSaisieCoeff] = useState<number>(1);
  const [saisieDate, setSaisieDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [saisieValide, setSaisieValide] = useState<boolean>(false);
  const [saisieNotesMap, setSaisieNotesMap] = useState<Record<string, { note: string; appreciation: string; evalId?: number }>>({});
  const [saisieSearchStudent, setSaisieSearchStudent] = useState<string>('');
  const [saisieLockStatus, setSaisieLockStatus] = useState<{ est_verrouille: boolean; message: string; periode?: PeriodeScolaire }>({
    est_verrouille: false,
    message: 'Saisie ouverte',
  });
  const [isSavingSaisieNotes, setIsSavingSaisieNotes] = useState<boolean>(false);

  // ─ Documents Académiques & DEPS ──────────────────────────────────────────
  const [docClassId, setDocClassId] = useState<string>('');
  const [docTrimestre, setDocTrimestre] = useState<number>(1);
  const [docSearchStudent, setDocSearchStudent] = useState<string>('');

  // ─ Billet Entrée Retard ───────────────────────────────────────────────────
  const [retardBilletDialog, setRetardBilletDialog] = useState<Student | null>(null);
  const [retardHeureArrivee, setRetardHeureArrivee] = useState<string>('');
  const [retardMotif, setRetardMotif] = useState<string>('Retard de transport / circulation');
  const [retardDecision, setRetardDecision] = useState<string>('Autorisé(e) à intégrer le cours');

  // ─ Billet Repos Maladie ───────────────────────────────────────────────────
  const [maladieDialog, setMaladieDialog] = useState<boolean>(false);
  const [selectedMaladieStudent, setSelectedMaladieStudent] = useState<Student | null>(null);
  const [maladieSearch, setMaladieSearch] = useState<string>('');
  const [maladiePeriode, setMaladiePeriode] = useState<string>('1 jour (repos à domicile)');
  const [maladieMotif, setMaladieMotif] = useState<string>('Malaise / Fièvre constatée à l\'infirmerie');
  const [maladieRecommandations, setMaladieRecommandations] = useState<string>('Repos complet, surveillance et réhydratation');
  const [maladieParentPrevenu, setMaladieParentPrevenu] = useState<string>('Oui (Parent contacté)');
  const [maladieParentTel, setMaladieParentTel] = useState<string>('');
  const [maladieHeureDepart, setMaladieHeureDepart] = useState<string>('');
  const [billetsMaladieHistory, setBilletsMaladieHistory] = useState<Array<{
    id: string;
    student: Student;
    classeName: string;
    date: string;
    periode: string;
    motif: string;
    parentPrevenu: string;
    heureDepart: string;
  }>>([]);

  // ─ Module Accueil & Procédure d'Inscription ──────────────────────────────
  const [searchInscription, setSearchInscription] = useState<string>('');
  const [filterInscriptionStatut, setFilterInscriptionStatut] = useState<string>('all');

  // ─ Attributions niveaux / cycles (filtrage par éducateur) ────────────────
  const [educateurAttributions, setEducateurAttributions] = useState<{
    has_restrictions: boolean;
    cycle_ids: number[];
    niveau_ids: number[];
  } | null>(null);

  useEffect(() => {
    setToday(formatDate(new Date()));

    apiClient.getStudents()
      .then((data: Student[]) => {
        if (data && data.length > 0) {
          setAllStudents(data);
          setStudentsCount(data.filter((s) => s.status === 'actif').length);
          setRecentStudents(data.slice(0, 5));
        }
      })
      .catch((err) => console.warn('Erreur élèves:', err));

    apiClient.getStaff()
      .then((data: Staff[]) => {
        if (data && data.length > 0) {
          setAllStaff(data);
          setStaffCount(data.filter((s) => s.status === 'actif').length);
        }
      })
      .catch((err) => console.warn('Erreur personnel:', err));

    apiClient.getPointages()
      .then((data: Pointage[]) => {
        if (data) {
          setAllPointages(data);
        }
      })
      .catch((err) => console.warn('Erreur pointages:', err));

    apiClient.getAttendance()
      .then((data: Attendance[]) => {
        if (data && data.length > 0) {
          setAllAttendance(data);
          const todayDate = new Date().toDateString();
          setAttendanceToday(data.filter((a) => new Date(a.date).toDateString() === todayDate).length);
        }
      })
      .catch((err) => console.warn('Erreur présences:', err));

    apiClient.getSchools()
      .then((data: School[]) => {
        if (data && data.length > 0) {
          setSchools(data);
          setSchoolsCount(data.filter((s) => s.status === 'actif').length);
        }
      })
      .catch((err) => console.warn('Erreur écoles:', err));

    // Charger les classes + restrictions d'attribution pour l'éducateur
    Promise.all([
      apiClient.getClasses().catch((err) => { console.warn('Erreur classes:', err); return [] as ClassRoom[]; }),
      apiClient.getMyEducateurAttributions().catch(() => null),
    ]).then(([classesData, attrData]) => {
      let authorizedClasses = classesData;
      if (attrData && attrData.has_restrictions) {
        setEducateurAttributions(attrData);
        authorizedClasses = classesData.filter((c: any) => {
          const cycleMatch = attrData.cycle_ids.length === 0 ||
            (c.cycle_id && attrData.cycle_ids.includes(Number(c.cycle_id)));
          const niveauMatch = attrData.niveau_ids.length === 0 ||
            (c.niveau_id && attrData.niveau_ids.includes(Number(c.niveau_id)));
          // Si des niveaux sont définis, utiliser niveauMatch, sinon cycleMatch
          if (attrData.niveau_ids.length > 0) return niveauMatch;
          return cycleMatch;
        });
      } else {
        setEducateurAttributions(attrData || { has_restrictions: false, cycle_ids: [], niveau_ids: [] });
      }
      setClasses(authorizedClasses);
      if (authorizedClasses && authorizedClasses.length > 0) {
        setFicheClasseId((prev) => prev || authorizedClasses[0].id);
      }
    });

    apiClient.getPayments()
      .then((data: Payment[]) => {
        setPayments(data);
      })
      .catch((err) => console.warn('Erreur paiements:', err));

    apiClient.getEvaluations()
      .then((data: Evaluation[]) => { setAllEvaluations(data); })
      .catch(() => {});
  }, []);

  const pendingPayments = payments.filter((p) => p.status === 'en_attente');

  const todayStr = new Date().toISOString().split('T')[0];

  const absentsAujourdhui = useMemo(() => {
    const ids = new Set(
      allAttendance
        .filter(a => new Date(a.date).toISOString().split('T')[0] === todayStr && a.status === 'absent')
        .map(a => String(a.studentId))
    );
    return allStudents.filter(s => ids.has(String(s.id)));
  }, [allAttendance, allStudents, todayStr]);

  const retardsAujourdhui = useMemo(() => {
    const ids = new Set(
      allAttendance
        .filter(a => new Date(a.date).toISOString().split('T')[0] === todayStr && a.status === 'retard')
        .map(a => String(a.studentId))
    );
    return allStudents.filter(s => ids.has(String(s.id)));
  }, [allAttendance, allStudents, todayStr]);

  // ─ Données Accueil & Inscriptions (Compte Éducateur) ───────────────────────
  const preInscriptionsList = useMemo(() => {
    return allStudents.filter(s =>
      s.status === 'preinscrit' ||
      (s as any).statut === 'preinscrit' ||
      (s as any).statut_inscription === 'preinscrit' ||
      s.status === 'en_attente'
    );
  }, [allStudents]);

  const preInscriptionsCount = preInscriptionsList.length;

  const inscriptionsFinaliseesCount = useMemo(() => {
    return allStudents.filter(s =>
      s.status === 'actif' ||
      (s as any).statut === 'inscrit' ||
      (s as any).statut_inscription === 'inscrit'
    ).length;
  }, [allStudents]);

  const filteredInscriptionsList = useMemo(() => {
    return allStudents
      .filter(s => {
        if (filterInscriptionStatut === 'preinscrit') {
          return s.status === 'preinscrit' || (s as any).statut === 'preinscrit' || (s as any).statut_inscription === 'preinscrit' || s.status === 'en_attente';
        }
        if (filterInscriptionStatut === 'inscrit') {
          return s.status === 'actif' || (s as any).statut === 'inscrit' || (s as any).statut_inscription === 'inscrit';
        }
        return true;
      })
      .filter(s => {
        const query = searchInscription.toLowerCase().trim();
        if (!query) return true;
        return (
          formatStudentName(s).toLowerCase().includes(query) ||
          (s.matricule || '').toLowerCase().includes(query) ||
          (s.parentPhone || (s as any).parentTel || '').includes(query) ||
          (s.className || '').toLowerCase().includes(query)
        );
      });
  }, [allStudents, filterInscriptionStatut, searchInscription]);

  // Élèves et présences de la fiche d'appel sélectionnée
  const ficheStudents = useMemo(() => {
    if (!ficheClasseId) return [];
    return allStudents.filter(s => String(s.classId) === String(ficheClasseId));
  }, [allStudents, ficheClasseId]);

  const ficheAttendanceRecords = useMemo(() => {
    return allAttendance.filter(a => {
      const matchDate = new Date(a.date).toISOString().split('T')[0] === ficheDate;
      const matchClass = String(a.classId || (a as any).classe_id) === String(ficheClasseId);
      return matchDate && matchClass;
    });
  }, [allAttendance, ficheDate, ficheClasseId]);

  const statsCreneaux = useMemo(() => {
    const creneauxPointes = CRENEAUX_JOURNEE.filter(cr =>
      ficheAttendanceRecords.some(a => (a.heure || (a as any).creneau || '').toUpperCase() === cr || (a.heure || '').startsWith(cr))
    );
    const totalAppelsEffectues = creneauxPointes.length;
    return {
      total: CRENEAUX_JOURNEE.length,
      pointes: totalAppelsEffectues,
      creneauxPointes
    };
  }, [ficheAttendanceRecords]);

  const selectedFicheClass = useMemo(() => {
    return classes.find(c => String(c.id) === String(ficheClasseId)) || null;
  }, [classes, ficheClasseId]);

  const currentSchool = useMemo(() => {
    const userEcoleId = typeof localStorage !== 'undefined' ? localStorage.getItem('user_ecole_id') : null;
    const userEcoleCode = typeof localStorage !== 'undefined' ? localStorage.getItem('user_ecole_code') : null;
    return (
      schools.find(s => String(s.id) === String(selectedFicheClass?.schoolId)) ||
      schools.find(s => userEcoleId && String(s.id) === String(userEcoleId)) ||
      schools.find(s => userEcoleCode && (s.code === userEcoleCode || (s as any).ET_CODEETABLISSEMENT === userEcoleCode)) ||
      schools[0] ||
      null
    );
  }, [schools, selectedFicheClass]);

  const handlePrintFicheAppel = () => {
    if (!selectedFicheClass) {
      toast({ variant: 'destructive', title: 'Sélection requise', description: 'Veuillez choisir une classe.' });
      return;
    }
    printFicheAppelClasse(
      selectedFicheClass,
      ficheDate,
      ficheStudents,
      ficheAttendanceRecords,
      currentSchool,
      CRENEAUX_JOURNEE
    );
  };

  const selectedNotesClass = useMemo(() => {
    return classes.find(c => String(c.id) === String(notesClasseId)) || classes[0] || null;
  }, [classes, notesClasseId]);

  const notesStudents = useMemo(() => {
    if (!selectedNotesClass) return [];
    return allStudents
      .filter(s => String(s.classId) === String(selectedNotesClass.id) && s.status !== 'inactif')
      .sort((a, b) => {
        const nameA = `${a.lastName || ''} ${a.firstName || ''}`.trim().toLowerCase();
        const nameB = `${b.lastName || ''} ${b.firstName || ''}`.trim().toLowerCase();
        return nameA.localeCompare(nameB, 'fr');
      });
  }, [allStudents, selectedNotesClass]);

  const handlePrintNotesManuelle = () => {
    if (!selectedNotesClass) {
      toast({ variant: 'destructive', title: 'Sélection requise', description: 'Veuillez choisir une classe.' });
      return;
    }
    printFicheNotesManuelle({
      classRoom: selectedNotesClass,
      students: notesStudents,
      school: currentSchool,
      anneeScolaire: notesAnneeScolaire,
      nbInterrogations: notesNbInterros,
      nbDevoirs: notesNbDevoirs,
      extraEmptyRows: notesExtraRows,
      orientation: notesOrientation,
      subject: notesSubject,
      teacherName: notesTeacher,
      showSubjectHeader: notesShowSubject,
    });
  };

  const handleExportNotesPdf = async () => {
    if (!selectedNotesClass) return;
    try {
      await exportFicheNotesManuellePdf({
        classRoom: selectedNotesClass,
        students: notesStudents,
        school: currentSchool,
        anneeScolaire: notesAnneeScolaire,
        nbInterrogations: notesNbInterros,
        nbDevoirs: notesNbDevoirs,
        extraEmptyRows: notesExtraRows,
        orientation: notesOrientation,
        subject: notesSubject,
        teacherName: notesTeacher,
        showSubjectHeader: notesShowSubject,
      });
      toast({ title: 'Export PDF réussi', description: 'La fiche de notes a été téléchargée.' });
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erreur PDF', description: 'Impossible de générer le fichier PDF.' });
    }
  };

  const handleExportNotesExcel = () => {
    if (!selectedNotesClass) return;
    try {
      exportFicheNotesManuelleExcel({
        classRoom: selectedNotesClass,
        students: notesStudents,
        school: currentSchool,
        anneeScolaire: notesAnneeScolaire,
        nbInterrogations: notesNbInterros,
        nbDevoirs: notesNbDevoirs,
        extraEmptyRows: notesExtraRows,
        subject: notesSubject,
        teacherName: notesTeacher,
      });
      toast({ title: 'Export Excel réussi', description: 'Le fichier Excel a été généré.' });
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erreur Excel', description: 'Impossible de générer le fichier Excel.' });
    }
  };

  const handlePrintAllClassesNotes = () => {
    const optionsList = classes.map(cls => {
      const clsStudents = allStudents.filter(s => String(s.classId) === String(cls.id) && s.status !== 'inactif');
      return {
        classRoom: cls,
        students: clsStudents,
        school: currentSchool,
        anneeScolaire: notesAnneeScolaire,
        nbInterrogations: notesNbInterros,
        nbDevoirs: notesNbDevoirs,
        extraEmptyRows: notesExtraRows,
        orientation: notesOrientation,
        subject: notesSubject,
        teacherName: notesTeacher,
        showSubjectHeader: notesShowSubject,
      };
    }).filter(opt => opt.students.length > 0);

    if (optionsList.length === 0) {
      toast({ variant: 'destructive', title: 'Aucune donnée', description: 'Aucune classe avec des élèves à imprimer.' });
      return;
    }
    printMultipleFichesNotesManuelles(optionsList);
  };

  // ─── Logique Saisie des Notes Enseignants ──────────────────────────────────
  const MATIERES_OFFICIELLES = [
    'Français',
    'Mathématiques',
    'Anglais',
    'Histoire-Géographie',
    'Sciences Physiques',
    'Physique-Chimie',
    'SVT',
    'EDHC',
    'EPS',
    'Philosophie',
    'Allemand',
    'Espagnol',
    'Arabe',
    'Éducation Islamique',
    'Arts Plastiques',
    'Musique',
    'Informatique / TICE',
    'Conduite'
  ];

  const teachersList = useMemo(() => {
    return allStaff.filter((st) => {
      const f = (st.role || st.fonction || '').toLowerCase();
      return f.includes('prof') || f.includes('enseign') || f.includes('maitr') || f.includes('instit');
    });
  }, [allStaff]);

  useEffect(() => {
    if (classes.length > 0) {
      if (!saisieClassId) setSaisieClassId(String(classes[0].id));
      if (!docClassId) setDocClassId(String(classes[0].id));
    }
  }, [classes]);

  useEffect(() => {
    periodesApi.checkTrimestreLock(saisieTrimestre).then((res) => {
      setSaisieLockStatus(res);
    });
  }, [saisieTrimestre]);

  useEffect(() => {
    if (!saisieClassId) return;
    const matching = allEvaluations.filter(
      (e) =>
        String(e.classId || (e as any).classe_id) === String(saisieClassId) &&
        e.trimester === saisieTrimestre &&
        (e.subject || '').toLowerCase() === saisieMatiere.toLowerCase() &&
        (!saisieDevoirNum || (e as any).devoir_numero === saisieDevoirNum || (e as any).type === saisieTypeDevoir)
    );

    const newMap: Record<string, { note: string; appreciation: string; evalId?: number }> = {};
    matching.forEach((ev) => {
      newMap[String(ev.studentId)] = {
        note: String(ev.note),
        appreciation: ev.appreciation || '',
        evalId: typeof ev.id === 'number' ? ev.id : undefined,
      };
    });
    setSaisieNotesMap(newMap);
  }, [saisieClassId, saisieTrimestre, saisieMatiere, saisieDevoirNum, saisieTypeDevoir, allEvaluations]);

  const saisieStudentsInClass = useMemo(() => {
    if (!saisieClassId) return [];
    return allStudents.filter(
      (s) =>
        String(s.classId) === String(saisieClassId) &&
        s.status !== 'inactif' &&
        (formatStudentName(s).toLowerCase().includes(saisieSearchStudent.toLowerCase()) ||
          (s.matricule || '').toLowerCase().includes(saisieSearchStudent.toLowerCase()))
    );
  }, [allStudents, saisieClassId, saisieSearchStudent]);

  const handleSaveEducatorGrades = async () => {
    if (saisieLockStatus.est_verrouille) {
      toast({
        title: "Saisie Verrouillée",
        description: saisieLockStatus.message,
        variant: "destructive",
      });
      return;
    }
    if (!saisieClassId) {
      toast({ title: "Sélectionnez une classe", variant: "destructive" });
      return;
    }

    setIsSavingSaisieNotes(true);
    try {
      const studentsInClass = allStudents.filter((s) => String(s.classId) === String(saisieClassId));
      const notesToSave: Array<{
        eleve_id: number;
        note: number;
        appreciation?: string;
        eval_id?: number;
      }> = [];

      studentsInClass.forEach((st) => {
        const entry = saisieNotesMap[String(st.id)];
        if (entry && entry.note !== '' && !isNaN(Number(entry.note))) {
          const numGrade = Math.min(20, Math.max(0, Number(entry.note)));
          notesToSave.push({
            eleve_id: Number(st.id),
            note: numGrade,
            appreciation: entry.appreciation || (numGrade >= 10 ? 'Travail satisfaisant' : 'À approfondir'),
            eval_id: entry.evalId,
          });
        }
      });

      if (notesToSave.length === 0) {
        toast({
          title: "Aucune note saisie",
          description: "Veuillez renseigner au moins une note.",
          variant: "destructive",
        });
        setIsSavingSaisieNotes(false);
        return;
      }

      const payload = {
        classe_id: Number(saisieClassId),
        matiere: saisieMatiere,
        trimestre: saisieTrimestre,
        type: saisieTypeDevoir,
        devoir_numero: saisieDevoirNum,
        coefficient: Number(saisieCoeff) || 1,
        date: saisieDate,
        valide: saisieValide,
        notes: notesToSave,
      };

      await apiClient.saveEvaluationsBulk(payload);
      toast({
        title: "Notes enregistrées !",
        description: `${notesToSave.length} notes ont été enregistrées avec succès.`,
      });

      const evals = await apiClient.getEvaluations().catch(() => []);
      setAllEvaluations(evals);
    } catch (err: any) {
      toast({
        title: "Erreur lors de l'enregistrement",
        description: err?.response?.data?.detail || err?.message || "Impossible d'enregistrer les notes.",
        variant: "destructive",
      });
    } finally {
      setIsSavingSaisieNotes(false);
    }
  };

  const handleFillDemoNotes = () => {
    const studentsInClass = allStudents.filter((s) => String(s.classId) === String(saisieClassId));
    const newMap: Record<string, { note: string; appreciation: string; evalId?: number }> = {};
    const sampleMarks = [12, 14.5, 9, 16, 11, 13.5, 10, 15, 8.5, 17, 12.5, 13];
    const appreciations = ['Bien', 'Très bon travail', 'Passable', 'Excellent', 'Satisfaisant', 'Efforts à soutenir'];
    studentsInClass.forEach((st, idx) => {
      const mark = sampleMarks[idx % sampleMarks.length];
      newMap[String(st.id)] = {
        note: String(mark),
        appreciation: appreciations[idx % appreciations.length],
      };
    });
    setSaisieNotesMap(newMap);
    toast({
      title: "Notes d'exemple appliquées",
      description: "Des notes ont été pré-remplies. Cliquez sur Enregistrer pour les sauvegarder.",
    });
  };

  const handleClearSaisieNotes = () => {
    setSaisieNotesMap({});
  };

  // ─── Logique Documents Académiques & DEPS ──────────────────────────────────
  const docSelectedClass = useMemo(() => {
    return classes.find((c) => String(c.id) === String(docClassId)) || null;
  }, [classes, docClassId]);

  const docStudentsInClass = useMemo(() => {
    if (!docClassId) return [];
    return allStudents.filter(
      (s) =>
        String(s.classId) === String(docClassId) &&
        s.status !== 'inactif' &&
        (formatStudentName(s).toLowerCase().includes(docSearchStudent.toLowerCase()) ||
          (s.matricule || '').toLowerCase().includes(docSearchStudent.toLowerCase()))
    );
  }, [allStudents, docClassId, docSearchStudent]);

  const handlePrintBulletinsAll = () => {
    if (docStudentsInClass.length === 0) {
      toast({ title: "Aucun élève dans cette classe", variant: "destructive" });
      return;
    }
    printBulletins(docStudentsInClass, allEvaluations, docSelectedClass, currentSchool, docTrimestre);
  };

  const handlePrintBulletinSingle = (st: Student) => {
    printBulletins([st], allEvaluations, docSelectedClass, currentSchool, docTrimestre);
  };

  const handlePrintPVNotes = () => {
    if (docStudentsInClass.length === 0) {
      toast({ title: "Aucun élève dans cette classe", variant: "destructive" });
      return;
    }
    const { list, stats } = computeStudentDepsList(docStudentsInClass, allEvaluations, docTrimestre);
    const distinctions = list.filter((s) => s.moyenne >= 12).map((s) => ({ name: `${s.nom} ${s.prenoms}`, average: s.moyenne }));
    const sanctions = list.filter((s) => s.moyenne < 8.5).map((s) => ({ name: `${s.nom} ${s.prenoms}`, average: s.moyenne }));
    const studentListFormatted = list.map((s) => {
      const orig = docStudentsInClass.find((x) => String(x.id) === String(s.id)) || docStudentsInClass[0];
      return {
        rank: s.rang,
        student: orig,
        generalAverage: s.moyenne,
      };
    });
    const decisionsMap: Record<string, string> = {};
    list.forEach((s) => {
      decisionsMap[String(s.id)] = s.decision;
    });

    printPV(
      docSelectedClass?.name || 'Classe',
      docTrimestre,
      currentSchool?.name || 'Groupe Scolaire Confessionnel Hinneh',
      { moyenneGenerale: Number(stats.moyGenerale) },
      distinctions,
      sanctions,
      studentListFormatted,
      decisionsMap
    );
  };

  const handlePrintMatriceNotes = () => {
    if (docStudentsInClass.length === 0) {
      toast({ title: "Aucun élève dans cette classe", variant: "destructive" });
      return;
    }
    const classEvals = allEvaluations.filter(
      (e) => String(e.classId || (e as any).classe_id) === String(docClassId) && e.trimester === docTrimestre
    );
    let subjects = Array.from(new Set(classEvals.map((e) => e.subject).filter(Boolean)));
    if (subjects.length === 0) {
      subjects = ['Français', 'Mathématiques', 'Anglais', 'Histoire-Géographie', 'Sciences Physiques', 'SVT', 'EDHC', 'EPS'];
    }

    const matriceData = docStudentsInClass.map((st) => {
      const stEvals = allEvaluations.filter(
        (e) => String(e.studentId) === String(st.id) && e.trimester === docTrimestre
      );
      const subjectAverages: Record<string, number> = {};
      subjects.forEach((sb) => {
        const matchingEv = stEvals.filter((e) => e.subject.toLowerCase() === sb.toLowerCase());
        if (matchingEv.length > 0) {
          const tot = matchingEv.reduce((acc, x) => acc + x.note, 0);
          subjectAverages[sb] = Number((tot / matchingEv.length).toFixed(2));
        }
      });
      const allNotes = Object.values(subjectAverages);
      const generalAverage = allNotes.length > 0 ? Number((allNotes.reduce((a, b) => a + b, 0) / allNotes.length).toFixed(2)) : 0;
      return {
        student: st,
        subjectAverages,
        generalAverage,
        rank: 1,
      };
    });

    matriceData.sort((a, b) => b.generalAverage - a.generalAverage);
    matriceData.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    printMatrice(
      docSelectedClass?.name || 'Classe',
      docTrimestre,
      subjects,
      matriceData,
      currentSchool?.name || 'Groupe Scolaire Confessionnel Hinneh'
    );
  };

  const handlePrintDEPS = () => {
    if (docStudentsInClass.length === 0) {
      toast({ title: "Aucun élève dans cette classe", variant: "destructive" });
      return;
    }
    printBordereauDEPS({
      school: currentSchool,
      classRoom: docSelectedClass,
      trimester: docTrimestre,
      students: docStudentsInClass,
      evaluations: allEvaluations,
      anneeScolaire: notesAnneeScolaire,
    });
  };

  const handleExportExcelDEPS = () => {
    if (docStudentsInClass.length === 0) {
      toast({ title: "Aucun élève dans cette classe", variant: "destructive" });
      return;
    }
    exportExcelDEPS({
      school: currentSchool,
      classRoom: docSelectedClass,
      trimester: docTrimestre,
      students: docStudentsInClass,
      evaluations: allEvaluations,
      anneeScolaire: notesAnneeScolaire,
    });
    toast({
      title: "Export Excel DEPS généré !",
      description: "Le fichier Excel conforme DEPS a été téléchargé.",
    });
  };

  const handleOpenRetardBillet = (student: Student) => {
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setRetardHeureArrivee(now);
    setRetardMotif('Retard de transport / embouteillage');
    setRetardDecision('Autorisé(e) à intégrer le cours');
    setRetardBilletDialog(student);
  };

  const handlePrintRetardBilletConfirm = () => {
    if (!retardBilletDialog) return;
    const classe = classes.find(c => String(c.id) === String(retardBilletDialog.classId)) || null;
    const school = schools.find(s => String(s.id) === String(retardBilletDialog.schoolId)) || null;

    printBilletEntreeRetard(retardBilletDialog, classe, school, {
      heureArrivee: retardHeureArrivee,
      motif: retardMotif,
      decision: retardDecision,
      educateurNom: username || 'L\'Éducateur',
      date: new Date().toLocaleDateString('fr-FR'),
      year: '2026 - 2027',
    });

    toast({
      title: 'Billet de retard édité',
      description: `Le billet d'entrée en classe a été imprimé pour ${formatStudentName(retardBilletDialog)}.`,
    });
    setRetardBilletDialog(null);
  };

  const handleOpenMaladieDialog = (student?: Student) => {
    if (student) {
      setSelectedMaladieStudent(student);
      setMaladieParentTel(student.parentPhone || (student as any).parentTel || '');
    } else {
      setSelectedMaladieStudent(allStudents[0] || null);
      if (allStudents[0]) {
        setMaladieParentTel(allStudents[0].parentPhone || (allStudents[0] as any).parentTel || '');
      }
    }
    setMaladiePeriode('1 jour (repos à domicile)');
    setMaladieMotif('Malaise / Fièvre constatée à l\'infirmerie');
    setMaladieRecommandations('Repos complet, surveillance et réhydratation');
    setMaladieParentPrevenu('Oui (Parent contacté)');
    setMaladieHeureDepart(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    setMaladieDialog(true);
  };

  const handleCreateAndPrintMaladie = () => {
    if (!selectedMaladieStudent) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez sélectionner un élève.' });
      return;
    }
    const classe = classes.find(c => String(c.id) === String(selectedMaladieStudent.classId)) || null;
    const school = schools.find(s => String(s.id) === String(selectedMaladieStudent.schoolId)) || null;

    printBilletReposMaladie(selectedMaladieStudent, classe, school, {
      dateConstat: new Date().toLocaleDateString('fr-FR'),
      periodeRepos: maladiePeriode,
      motifMedical: maladieMotif,
      recommandations: maladieRecommandations,
      parentPrevenu: maladieParentPrevenu,
      parentTel: maladieParentTel,
      heureDepart: maladieHeureDepart,
      soignantNom: 'Infirmerie Scolaire',
      educateurNom: username || 'L\'Éducateur',
      year: '2026 - 2027',
    });

    const newTicket = {
      id: `MED-${Date.now()}`,
      student: selectedMaladieStudent,
      classeName: classe?.name || 'Classe',
      date: new Date().toLocaleDateString('fr-FR'),
      periode: maladiePeriode,
      motif: maladieMotif,
      parentPrevenu: maladieParentPrevenu,
      heureDepart: maladieHeureDepart,
    };

    setBilletsMaladieHistory(prev => [newTicket, ...prev]);
    toast({
      title: 'Billet de repos maladie émis',
      description: `L'autorisation médicale a été éditée pour ${formatStudentName(selectedMaladieStudent)}.`,
    });
    setMaladieDialog(false);
  };

  const staffAvecPointage = useMemo(() => {
    const fonctionsEnseignants = ['enseignant', 'instituteur', 'prof', 'professeur', 'coranique'];
    const enseignants = allStaff.filter(s =>
      fonctionsEnseignants.some(f => (s.fonction ?? '').toLowerCase().includes(f))
    );
    return enseignants.map(s => {
      const rec = allPointages.find(
        a => String(a.personnel_id) === String(s.id) &&
             new Date(a.date).toISOString().split('T')[0] === todayStr
      );
      return { staff: s, statut: rec?.statut ?? 'non_pointe', heure: rec?.heure_arrivee ?? null };
    });
  }, [allStaff, allPointages, todayStr]);

  const handleToggleStaffPresence = async (staffId: string, val: 'present' | 'retard' | 'absent' | 'non_pointe') => {
    try {
      const nowTime = new Date().toTimeString().split(' ')[0].substring(0, 5);
      await apiClient.clockInOut({
        date: todayStr,
        heure_arrivee: val === 'absent' || val === 'non_pointe' ? null : nowTime,
        heure_depart: null,
        statut: val,
        personnel_id: parseInt(staffId, 10) || 1
      });
      const updatedPointages = await apiClient.getPointages().catch((): any[] => []);
      setAllPointages(updatedPointages);
      toast({
        title: "Présence mise à jour",
        description: "Le pointage de l'enseignant a été enregistré.",
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de modifier la présence de l'enseignant.",
      });
    }
  };

  const handleOuvrirRetard = (student: Student) => {
    const now = new Date().toTimeString().split(' ')[0].substring(0, 5);
    setRetardDialog({ student, heure: now });
    setRetardNote('');
  };

  const handleValiderRetard = () => {
    if (!retardDialog) return;
    const { student, heure } = retardDialog;
    const [h, m] = heure.split(':').map(Number);
    const minutesArrivee = h * 60 + m;
    const seuilMinutes = 8 * 60 + 15;
    const statut: 'excuse' | 'exclu' = minutesArrivee <= seuilMinutes ? 'excuse' : 'exclu';
    setRetardsMap(prev => ({ ...prev, [student.id]: { heure, statut, note: retardNote } }));
    toast({
      title: statut === 'excuse' ? 'Retard excusé' : 'Exclu du cours',
      description: `${formatStudentName(student)} — arrivé(e) à ${heure} — ${
        statut === 'excuse' ? '≤15 min, retard excusé' : '>15 min, exclu(e) du cours'
      }`,
      variant: statut === 'exclu' ? 'destructive' : 'default',
    });
    setRetardDialog(null);
  };

  const handleOuvrirNotif = (student: Student) => {
    const classe = classes.find(c => c.id === student.classId);
    const dateStr = new Date().toLocaleDateString('fr-FR');
    const msg = `Bonjour, nous vous informons que votre enfant ${formatStudentName(student)} (${classe?.name ?? 'classe inconnue'}) est absent(e) ce jour, le ${dateStr}. Merci de contacter l'établissement. — Éducateur`;
    setNotifMessage(msg);
    setNotifCanal(student.parentPhone ? 'sms' : 'email');
    setNotifDialog({ student });
  };

  const handleEnvoyerNotif = () => {
    if (!notifDialog) return;
    const { student } = notifDialog;
    const newNotif: NotifParent = {
      id: `notif-${Date.now()}`,
      studentId: student.id,
      studentName: `${formatStudentName(student)}`,
      canal: notifCanal,
      message: notifMessage,
      date: new Date().toLocaleString('fr-FR'),
      statut: 'envoye',
      parentPhone: student.parentPhone,
      parentEmail: student.parentEmail,
    };
    setNotifs(prev => [newNotif, ...prev]);
    setNotifSentIds(prev => new Set([...prev, student.id]));
    // Ouvrir le canal natif si disponible
    if (notifCanal === 'sms' && student.parentPhone) {
      window.open(`sms:${student.parentPhone}?body=${encodeURIComponent(notifMessage)}`);
    } else if (notifCanal === 'whatsapp' && student.parentPhone) {
      window.open(`https://wa.me/${student.parentPhone.replace(/\D/g, '')}?text=${encodeURIComponent(notifMessage)}`);
    } else if (notifCanal === 'email' && student.parentEmail) {
      window.open(`mailto:${student.parentEmail}?subject=Absence&body=${encodeURIComponent(notifMessage)}`);
    }
    toast({ title: 'Notification envoyee', description: `${formatStudentName(student)} - ${notifCanal.toUpperCase()}` });
    setNotifDialog(null);
  };

  const handleEnregistrerIncident = () => {
    if (!incidentForm.studentId || !incidentForm.description.trim()) {
      toast({ title: 'Champs requis', description: 'Veuillez selectionner un eleve et saisir une description.', variant: 'destructive' });
      return;
    }
    const student = allStudents.find(s => s.id === incidentForm.studentId);
    const newIncident: Incident = {
      id: `inc-${Date.now()}`,
      studentId: incidentForm.studentId,
      type: incidentForm.type,
      severity: incidentForm.severity,
      description: incidentForm.description,
      date: new Date(),
      status: 'ouvert',
      actionTaken: incidentForm.actionTaken || undefined,
      createdAt: new Date(),
    };
    setIncidents(prev => [newIncident, ...prev]);
    toast({
      title: `Incident enregistre (${incidentForm.severity})`,
      description: `${student ? `${formatStudentName(student)}` : ''} - ${incidentForm.type}`,
      variant: incidentForm.severity === 'grave' ? 'destructive' : 'default',
    });
    setIncidentDialog(false);
    setIncidentForm({ studentId: '', type: 'comportement', severity: 'mineur', description: '', actionTaken: '' });
  };

  const handleCloturerIncident = (id: string) => {
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, status: 'resolu' as const } : i));
    toast({ title: 'Incident cloture', description: 'Statut mis a jour : Resolu.' });
  };

  const handleOuvrirDossier = () => {
    if (!socialForm.studentId || !socialForm.situation) {
      toast({ title: 'Champs requis', description: 'Selectionnez un eleve et une situation.', variant: 'destructive' });
      return;
    }
    const already = dossiersSociaux.find(d => d.studentId === socialForm.studentId && d.statut === 'actif');
    if (already) {
      toast({ title: 'Dossier existant', description: 'Un dossier actif existe deja pour cet eleve.', variant: 'destructive' });
      return;
    }
    const newDossier: DossierSocial = {
      id: `soc-${Date.now()}`,
      studentId: socialForm.studentId,
      situation: socialForm.situation,
      priorite: socialForm.priorite,
      suivi: socialForm.suivi,
      dateOuverture: new Date().toLocaleDateString('fr-FR'),
      statut: 'actif',
      notes: [],
    };
    setDossiersSociaux(prev => [newDossier, ...prev]);
    const s = allStudents.find(st => st.id === socialForm.studentId);
    toast({ title: 'Dossier social ouvert', description: `${s ? `${formatStudentName(s)}` : ''} - ${socialForm.situation}` });
    setSocialDialog(false);
    setSocialForm({ studentId: '', situation: 'precarite', priorite: 'moyenne', suivi: '' });
  };

  const handleAjouterNote = (dossierId: string) => {
    if (!socialNoteText.trim()) return;
    setDossiersSociaux(prev => prev.map(d =>
      d.id === dossierId
        ? { ...d, notes: [{ date: new Date().toLocaleString('fr-FR'), contenu: socialNoteText }, ...d.notes] }
        : d
    ));
    setSocialNoteText('');
    setSocialNoteDialog(null);
    toast({ title: 'Note ajoutee au dossier.' });
  };

  const handleClosDossier = (id: string) => {
    setDossiersSociaux(prev => prev.map(d => d.id === id ? { ...d, statut: 'clos' as const } : d));
    toast({ title: 'Dossier clos.' });
  };

  // Calcul note de conduite par eleve
  // Regles : base 10, -1pt par absence (1 absence = 2h cours), min 5, max 18
  const conduiteData = useMemo(() => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return allStudents
      .filter(s => !conduiteClassId || conduiteClassId === 'all' || s.classId === conduiteClassId)
      .map(s => {
        const absencesTrim = allAttendance.filter(a =>
          String(a.studentId) === String(s.id) &&
          a.status === 'absent' &&
          new Date(a.date) >= threeMonthsAgo
        ).length;
        const retardsTrim = allAttendance.filter(a =>
          String(a.studentId) === String(s.id) &&
          a.status === 'retard' &&
          new Date(a.date) >= threeMonthsAgo
        ).length;
        const notesProfs = allEvaluations.filter(e =>
          String(e.studentId) === String(s.id) &&
          (e.subject ?? '').toLowerCase() === 'conduite'
        ).map(e => e.note);
        const moyenneProfs = notesProfs.length > 0
          ? notesProfs.reduce((a, b) => a + b, 0) / notesProfs.length
          : null;
        const noteBase = Math.max(5, 10 - absencesTrim - Math.floor(retardsTrim / 3));
        const noteEduc = conduiteEducateur[s.id] ?? null;
        let notefinale: number;
        if (moyenneProfs !== null && noteEduc !== null) {
          notefinale = (moyenneProfs + noteEduc + noteBase) / 3;
        } else if (moyenneProfs !== null) {
          notefinale = (moyenneProfs + noteBase) / 2;
        } else if (noteEduc !== null) {
          notefinale = (noteEduc + noteBase) / 2;
        } else {
          notefinale = noteBase;
        }
        notefinale = Math.min(18, Math.max(5, notefinale));
        return { student: s, absencesTrim, retardsTrim, noteBase, moyenneProfs, noteEduc, notefinale };
      })
      .filter(d =>
        `${formatStudentName(d.student)}`
          .toLowerCase()
          .includes(searchConduite.toLowerCase())
      );
  }, [allStudents, allAttendance, allEvaluations, conduiteEducateur, conduiteClassId, searchConduite]);

  const quickActions = [
    {
      title: 'Pointage Badge QR',
      description: 'Contrôle à l’entrée/sortie — Scan des cartes élèves',
      icon: QrCode,
      path: ROUTE_PATHS.POINTAGE_BADGE,
      color: 'bg-emerald-100 text-emerald-700',
    },
    {
      title: 'Fiches de Notes Vierges',
      description: 'Imprimer les relevés pour la saisie manuelle des enseignants (modèle officiel)',
      icon: FileSpreadsheet,
      actionTab: 'fiche_notes',
      color: 'bg-amber-100 text-amber-700',
    },
    {
      title: 'Saisie des Notes Enseignants',
      description: 'Enregistrer les notes par classe, enseignant et discipline',
      icon: Pencil,
      actionTab: 'saisie_notes_prof',
      color: 'bg-emerald-100 text-emerald-700',
    },
    {
      title: 'Bulletins, PV & DEPS',
      description: 'Éditer les bulletins, PV de délibération, matrices et remontée DEPS',
      icon: Award,
      actionTab: 'documents_academiques',
      color: 'bg-purple-100 text-purple-700',
    },
    {
      title: 'Espace Accueil',
      description: 'Accueil, pré-inscriptions et orientation des familles',
      icon: Home,
      path: ROUTE_PATHS.ACCUEIL_SPACE,
      color: 'bg-cyan-100 text-cyan-700',
    },
    {
      title: "Procédure d'inscription",
      description: 'Dossiers d’inscription et validation en 11 étapes',
      icon: ClipboardCheck,
      path: ROUTE_PATHS.INSCRIPTION_PROCESS,
      color: 'bg-emerald-100 text-emerald-700',
    },
    {
      title: 'Élèves & Familles',
      description: 'Consulter et gérer les dossiers élèves',
      icon: Users,
      path: ROUTE_PATHS.STUDENTS,
      color: 'bg-blue-100 text-blue-700',
    },
    {
      title: 'Vie scolaire',
      description: 'Présences, absences et incidents',
      icon: CalendarCheck,
      path: ROUTE_PATHS.ATTENDANCE,
      color: 'bg-green-100 text-green-700',
    },
    {
      title: 'Ressources Humaines',
      description: 'Personnel et fiches employés',
      icon: Briefcase,
      path: ROUTE_PATHS.HR,
      color: 'bg-amber-100 text-amber-700',
    },
    {
      title: 'Espace Administratifs',
      description: 'Secrétariat, inscriptions et courriers',
      icon: UserCog,
      path: ROUTE_PATHS.ADMIN_STAFF_SPACE,
      color: 'bg-purple-100 text-purple-700',
    },
  ];

  const mainKPIs = [
    {
      id: 'kpi-eleves',
      title: 'Élèves actifs',
      value: studentsCount,
      period: 'Total élèves',
      icon: GraduationCap,
      color: 'primary',
    },
    {
      id: 'kpi-personnel',
      title: 'Personnel actif',
      value: staffCount,
      period: 'Tous établissements',
      icon: Briefcase,
      color: 'secondary',
    },
    {
      id: 'kpi-presences',
      title: 'Présences aujourd\'hui',
      value: attendanceToday,
      period: today,
      icon: CalendarCheck,
      color: 'accent',
    },
    {
      id: 'kpi-ecoles',
      title: 'Établissements',
      value: schoolsCount,
      period: 'Actifs',
      icon: SchoolIcon,
      color: 'muted',
    },
  ];

  const getClassName = (classId: string) => {
    const classroom = classes.find((c) => c.id === classId);
    return classroom?.name || 'Non assignée';
  };

  const getSchoolName = (schoolId: string) => {
    const school = schools.find((s) => s.id === schoolId);
    return school?.name || 'Non assigné';
  };

  const escapeHtml = (value: string | number) => {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  const generatePDF = (title: string, headers: string[], rows: (string | number)[][], filename: string) => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '210mm';
    container.style.padding = '10mm';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.fontSize = '10px';
    container.style.color = '#000';
    container.style.backgroundColor = '#fff';

    const headerCells = headers.map((h) => `<th style="border: 1px solid #000; padding: 6px; background: #f0f0f0; text-align: left;">${escapeHtml(h)}</th>`).join('');
    const bodyRows = rows
      .map((row) => `<tr>${row.map((cell) => `<td style="border: 1px solid #000; padding: 6px;">${escapeHtml(cell)}</td>`).join('')}</tr>`)
      .join('');

    container.innerHTML = `
      <h2 style="font-size: 16px; margin-bottom: 10px;">${escapeHtml(title)}</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>${headerCells}</tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '0';
    iframe.style.width = '794px';
    iframe.style.height = '1123px';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      if (iframe.parentNode) document.body.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    iframeDoc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#111;background:#fff;margin:0;padding:20px;font-size:11px;}</style></head><body>${container.innerHTML}</body></html>`);
    iframeDoc.close();

    html2pdf()
      .from(iframeDoc.body)
      .set({
        filename,
        margin: 0,
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 794 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .save()
      .then(() => {
        if (iframe.parentNode) document.body.removeChild(iframe);
      })
      .catch(() => {
        if (iframe.parentNode) document.body.removeChild(iframe);
      });
  };

  const handleDownloadStudents = () => {
    if (allStudents.length === 0) return;
    const sorted = [...allStudents].sort((a, b) => {
      const classA = getClassName(a.classId);
      const classB = getClassName(b.classId);
      if (classA !== classB) return classA.localeCompare(classB);
      return a.lastName.localeCompare(b.lastName);
    });
    const rows = sorted.map((s) => [
      s.matricule,
      s.lastName,
      s.firstName,
      s.gender,
      s.dateOfBirth ? formatDate(s.dateOfBirth) : '',
      getClassName(s.classId),
      getSchoolName(s.schoolId),
      s.status,
      s.parentEmail || '',
      s.parentPhone || '',
    ]);
    generatePDF(
      'Liste des élèves par classe',
      ['Matricule', 'Nom', 'Prénom', 'Genre', 'Date de naissance', 'Classe', 'Établissement', 'Statut', 'Email parent', 'Téléphone parent'],
      rows,
      `eleves_par_classe_${new Date().toISOString().split('T')[0]}.pdf`
    );
  };

  const handleDownloadStaff = () => {
    if (allStaff.length === 0) return;
    const sorted = [...allStaff].sort((a, b) => a.lastName.localeCompare(b.lastName));
    const rows = sorted.map((s) => [
      s.lastName,
      s.firstName,
      s.fonction,
      s.email,
      s.phone,
      s.status,
      getSchoolName(s.schoolId),
    ]);
    generatePDF(
      'Liste du personnel',
      ['Nom', 'Prénom', 'Fonction', 'Email', 'Téléphone', 'Statut', 'Établissement'],
      rows,
      `personnel_${new Date().toISOString().split('T')[0]}.pdf`
    );
  };

  const openReminderList = () => {
    setReminderStep('list');
    setReminderDialogOpen(true);
  };

  const openReminderCompose = (payment: Payment) => {
    const student = allStudents.find((s) => s.id === payment.studentId);
    if (!student) return;
    const typeLabels: Record<string, string> = {
      scolarite: 'scolarité',
      inscription: 'inscription',
      cantine: 'cantine',
      transport: 'transport',
      autre: 'autre',
    };
    const defaultMessage = `Cher parent, nous vous rappelons que le paiement des frais de ${typeLabels[payment.type] || payment.type} de ${formatCurrency(payment.amount)} pour l'élève ${formatStudentName(student)} est attendu. Merci de régulariser votre situation.`;
    setSelectedReminderStudent(student);
    setSelectedReminderPayment(payment);
    setReminderMessage(defaultMessage);
    setReminderChannel(student.parentEmail ? 'email' : 'sms');
    setReminderStep('compose');
  };

  const handleSendReminder = async () => {
    if (!selectedReminderStudent || !selectedReminderPayment) return;
    const contact = reminderChannel === 'email' ? selectedReminderStudent.parentEmail : selectedReminderStudent.parentPhone;
    if (!contact) {
      toast({
        variant: 'destructive',
        title: 'Aucun contact',
        description: 'Le parent n\'a pas de coordonnées pour ce canal.',
      });
      return;
    }
    try {
      await apiClient.createCourrier({
        type: 'relance',
        objet: `Relance de scolarité - ${formatStudentName(selectedReminderStudent)}`,
        expediteur: username || 'Éducateur',
        description: `${reminderMessage}\n\nCanal : ${reminderChannel}\nContact : ${contact}`,
        ref: String(selectedReminderPayment.id),
        priorite: 'haute',
        status: 'en_cours',
      });
      toast({
        title: 'Relance envoyée',
        description: `La relance a été enregistrée pour ${formatStudentName(selectedReminderStudent)}.`,
      });
      setReminderDialogOpen(false);
      setReminderStep('list');
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible d\'enregistrer la relance.',
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={springPresets.gentle} className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full uppercase tracking-wide">Espace Éducateur</span>
            {absentsAujourdhui.length > 0 && <Badge className="bg-red-500 text-white text-xs">{absentsAujourdhui.length} absent(s)</Badge>}
            {retardsAujourdhui.length > 0 && <Badge className="bg-amber-500 text-white text-xs">{retardsAujourdhui.length} retard(s)</Badge>}
          </div>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold">{username || 'Éducateur'}</h1>
              <p className="text-muted-foreground">Surveillance, absences, retards, présences du personnel · {today}</p>
            </div>
            <Button
              onClick={() => navigate(ROUTE_PATHS.POINTAGE_BADGE)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md text-sm font-semibold px-4 py-2"
            >
              <QrCode className="h-5 w-5" />
              Pointage Entrée (Scan QR)
            </Button>
          </div>
        </motion.div>

        {/* KPIs */}
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {mainKPIs.map((kpi) => (
            <motion.div key={kpi.id} variants={staggerItem}><StatsCard kpi={kpi} /></motion.div>
          ))}
        </motion.div>

        {/* Onglets */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard" className="gap-1 text-xs"><SchoolIcon className="h-3.5 w-3.5" />Tableau de bord</TabsTrigger>
            <TabsTrigger value="accueil_inscriptions" className="gap-1 text-xs text-indigo-700 font-semibold bg-indigo-50/60 hover:bg-indigo-100/70 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <UserPlus className="h-3.5 w-3.5" />
              Accueil & Inscriptions
              {preInscriptionsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-indigo-700 text-white text-[10px] font-bold rounded-full">
                  {preInscriptionsCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="fiche_appel" className="gap-1 text-xs text-sky-700 font-semibold bg-sky-50/60 hover:bg-sky-100/70 data-[state=active]:bg-sky-600 data-[state=active]:text-white">
              <ClipboardList className="h-3.5 w-3.5" />
              Fiche d'Appel (M1..S5)
              {statsCreneaux.pointes > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-emerald-500 text-white text-[10px] font-bold rounded-full">
                  {statsCreneaux.pointes}/10
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="fiche_notes" className="gap-1 text-xs text-amber-700 font-semibold bg-amber-50/60 hover:bg-amber-100/70 data-[state=active]:bg-amber-600 data-[state=active]:text-white">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Fiches de notes (Saisie manuelle)
            </TabsTrigger>
            <TabsTrigger value="saisie_notes_prof" className="gap-1 text-xs text-emerald-700 font-semibold bg-emerald-50/60 hover:bg-emerald-100/70 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Pencil className="h-3.5 w-3.5" />
              Saisie des Notes (Enseignants)
            </TabsTrigger>
            <TabsTrigger value="documents_academiques" className="gap-1 text-xs text-purple-700 font-semibold bg-purple-50/60 hover:bg-purple-100/70 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Award className="h-3.5 w-3.5" />
              Bulletins, PV & DEPS
            </TabsTrigger>
            <TabsTrigger value="absences" className="gap-1 text-xs">
              <XCircle className="h-3.5 w-3.5" />Absences du jour
              {absentsAujourdhui.length > 0 && <span className="ml-1 h-4 w-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{absentsAujourdhui.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="retards" className="gap-1 text-xs">
              <Clock className="h-3.5 w-3.5" />Retards
              {retardsAujourdhui.length > 0 && <span className="ml-1 h-4 w-4 bg-amber-500 text-white text-[10px] rounded-full flex items-center justify-center">{retardsAujourdhui.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="repos_maladie" className="gap-1 text-xs text-teal-700 font-semibold bg-teal-50/60 hover:bg-teal-100/70 data-[state=active]:bg-teal-600 data-[state=active]:text-white">
              <Stethoscope className="h-3.5 w-3.5" />
              Repos Maladie
              {billetsMaladieHistory.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-teal-700 text-white text-[10px] font-bold rounded-full">
                  {billetsMaladieHistory.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="presences_staff" className="gap-1 text-xs"><Users className="h-3.5 w-3.5" />Présences profs</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1 text-xs">
              <Bell className="h-3.5 w-3.5" />Notifications
              {notifs.length > 0 && <span className="ml-1 h-4 w-4 bg-orange-500 text-white text-[10px] rounded-full flex items-center justify-center">{notifs.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="incidents" className="gap-1 text-xs">
              <ShieldAlert className="h-3.5 w-3.5" />Incidents
              {incidents.filter(i => i.status === 'ouvert').length > 0 && <span className="ml-1 h-4 w-4 bg-red-600 text-white text-[10px] rounded-full flex items-center justify-center">{incidents.filter(i => i.status === 'ouvert').length}</span>}
            </TabsTrigger>
            <TabsTrigger value="social" className="gap-1 text-xs">
              <Heart className="h-3.5 w-3.5" />Assist. sociale
              {dossiersSociaux.filter(d => d.statut === 'actif' && d.priorite === 'urgente').length > 0 && <span className="ml-1 h-4 w-4 bg-pink-600 text-white text-[10px] rounded-full flex items-center justify-center">{dossiersSociaux.filter(d => d.statut === 'actif' && d.priorite === 'urgente').length}</span>}
            </TabsTrigger>
            <TabsTrigger value="conduite" className="gap-1 text-xs"><GraduationCap className="h-3.5 w-3.5" />Note de conduite</TabsTrigger>
            <TabsTrigger value="actions" className="gap-1 text-xs"><ArrowRight className="h-3.5 w-3.5" />Actions rapides</TabsTrigger>
          </TabsList>

          {/* ── DASHBOARD ── */}
          <TabsContent value="dashboard" className="mt-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Card
                    key={action.title}
                    className="hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => (action as any).actionTab ? setActiveTab((action as any).actionTab) : (action.path ? navigate(action.path) : null)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className={`p-2 rounded-lg ${action.color}`}><Icon className="h-5 w-5" /></div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <CardTitle className="text-base mt-3">{action.title}</CardTitle>
                      <CardDescription className="text-xs">{action.description}</CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ── ACCUEIL & INSCRIPTIONS ── */}
          <TabsContent value="accueil_inscriptions" className="mt-5 space-y-4">
            {/* Bannière d'accès direct et modules complets */}
            <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-white to-sky-50/60 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">
                        Guichet & Vie Scolaire
                      </span>
                      {preInscriptionsCount > 0 && (
                        <Badge className="bg-amber-500 text-white text-[10px]">
                          {preInscriptionsCount} pré-inscription(s) en attente
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-indigo-600" />
                      Module Espace Accueil & Procédure d'Inscription
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-600 mt-1">
                      Gestion des flux d'arrivée des familles, pré-inscriptions en ligne/guichet et bascule immédiate vers la procédure d'inscription complète (11 étapes).
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                      onClick={() => navigate(ROUTE_PATHS.ACCUEIL_SPACE)}
                      className="bg-indigo-700 hover:bg-indigo-800 text-white text-xs gap-1.5 shadow-sm"
                    >
                      <Home className="h-4 w-4" />
                      Ouvrir l'Espace Accueil
                    </Button>
                    <Button
                      onClick={() => navigate(ROUTE_PATHS.INSCRIPTION_PROCESS)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm"
                    >
                      <ClipboardCheck className="h-4 w-4" />
                      Procédure d'Inscription (11 étapes)
                    </Button>
                  </div>
                </div>

                {/* KPIs rapides accueil & inscriptions */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                  <div className="p-3 rounded-xl bg-white border border-indigo-100 shadow-xs flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Pré-inscriptions à traiter</p>
                      <p className="text-xl font-bold text-amber-700">{preInscriptionsCount}</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-indigo-100 shadow-xs flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Inscriptions finalisées</p>
                      <p className="text-xl font-bold text-emerald-700">{inscriptionsFinaliseesCount}</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-indigo-100 shadow-xs flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Total Élèves Référencés</p>
                      <p className="text-xl font-bold text-blue-700">{allStudents.length}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Tableau interactif de suivi des pré-inscriptions et inscriptions */}
            <Card>
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-primary" />
                      Dossiers Élèves & Parcours d'Inscription
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Traitez les dossiers en attente ou vérifiez l'état d'avancement des démarches scolaires.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher élève, matricule, parent..."
                        value={searchInscription}
                        onChange={(e) => setSearchInscription(e.target.value)}
                        className="pl-8 h-8 text-xs"
                      />
                    </div>
                    <Select value={filterInscriptionStatut} onValueChange={setFilterInscriptionStatut}>
                      <SelectTrigger className="h-8 text-xs w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">Tous les dossiers</SelectItem>
                        <SelectItem value="preinscrit" className="text-xs">Pré-inscrits ({preInscriptionsCount})</SelectItem>
                        <SelectItem value="inscrit" className="text-xs">Inscrits validés</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {filteredInscriptionsList.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">Aucun dossier trouvé pour ces critères.</p>
                    <p className="text-xs mt-1">Modifiez vos filtres ou effectuez une nouvelle recherche.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/40 text-muted-foreground">
                          <th className="text-left py-2.5 px-3 font-semibold">Élève</th>
                          <th className="text-left py-2.5 px-3 font-semibold">Classe / Niveau</th>
                          <th className="text-left py-2.5 px-3 font-semibold">Genre / Naissance</th>
                          <th className="text-left py-2.5 px-3 font-semibold">Contact Parent</th>
                          <th className="text-center py-2.5 px-3 font-semibold">Statut Inscription</th>
                          <th className="text-right py-2.5 px-3 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredInscriptionsList.slice(0, 30).map((student) => {
                          const isPreinscrit =
                            student.status === 'preinscrit' ||
                            (student as any).statut === 'preinscrit' ||
                            (student as any).statut_inscription === 'preinscrit' ||
                            student.status === 'en_attente';
                          const classe = classes.find(c => String(c.id) === String(student.classId));
                          return (
                            <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900">
                                  {formatStudentName(student)}
                                </div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  Matricule : {student.matricule || 'En attente'}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-700">
                                {classe?.name || student.className || (student as any).niveau || 'Non assignée'}
                              </td>
                              <td className="py-2.5 px-3 text-muted-foreground">
                                <span>{student.gender === 'F' ? 'Féminin' : 'Masculin'}</span>
                                {student.dateOfBirth && (
                                  <span className="block text-[10px]">{formatDate(student.dateOfBirth)}</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="text-slate-800">
                                  {student.parentPhone || (student as any).parentTel || 'N/A'}
                                </div>
                                {student.parentEmail && (
                                  <div className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                                    {student.parentEmail}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {isPreinscrit ? (
                                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-medium text-[10px]">
                                    Pré-inscrit
                                  </Badge>
                                ) : (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-medium text-[10px]">
                                    Inscrit actif
                                  </Badge>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    onClick={() => navigate(`${ROUTE_PATHS.INSCRIPTION_PROCESS}?studentId=${student.id}`)}
                                    className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1 px-2.5"
                                  >
                                    <ClipboardCheck className="h-3 w-3" />
                                    Traiter
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => navigate(ROUTE_PATHS.ACCUEIL_SPACE)}
                                    className="h-7 text-[11px] gap-1 px-2"
                                  >
                                    <Home className="h-3 w-3 text-slate-500" />
                                    Accueil
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── FICHE D'APPEL PAR CRÉNEAUX (M1..M5 / S1..S5) ── */}
          <TabsContent value="fiche_appel" className="mt-5 space-y-4">
            <Card className="border-sky-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-sky-50/80 via-white to-sky-50/50 pb-3 border-b border-sky-100">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-sky-600" />
                      Fiche d'Appel Journalière & Registre de Présence
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-600 mt-0.5">
                      Suivi incrémental en direct des appels enseignants pour chaque créneau horaire (Matin M1-M5 & Après-midi S1-S5)
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={handlePrintFicheAppel}
                      className="bg-sky-700 hover:bg-sky-800 text-white text-xs gap-1.5 rounded-lg shadow-sm"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Imprimer Fiche (A4 Paysage)
                    </Button>
                  </div>
                </div>

                {/* Filtres Classe, Date & Indicateurs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Classe</Label>
                    <Select value={ficheClasseId} onValueChange={setFicheClasseId}>
                      <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                        <SelectValue placeholder="Choisir une classe" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map(c => (
                          <SelectItem key={c.id} value={c.id} className="text-xs font-medium">
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Date d'appel</Label>
                    <Input
                      type="date"
                      value={ficheDate}
                      onChange={e => setFicheDate(e.target.value)}
                      className="h-8 text-xs bg-white border-slate-200"
                    />
                  </div>

                  <div className="p-2 rounded-lg bg-sky-100/60 border border-sky-200/80 flex flex-col justify-center">
                    <span className="text-[10px] uppercase font-bold text-sky-800 tracking-wider">Effectif de la classe</span>
                    <span className="text-sm font-bold text-slate-900">{ficheStudents.length} élèves inscrits</span>
                  </div>

                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 flex flex-col justify-center">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Créneaux pointés</span>
                    <span className="text-sm font-bold text-emerald-900">
                      {statsCreneaux.pointes} / {statsCreneaux.total} créneaux réalisés
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0 overflow-x-auto">
                {ficheStudents.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 italic text-xs">
                    Veuillez sélectionner une classe pour afficher la fiche d'appel.
                  </div>
                ) : (
                  <div className="min-w-[760px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700">
                          <th rowSpan={2} className="py-2 px-3 font-bold w-10 text-center">N°</th>
                          <th rowSpan={2} className="py-2 px-3 font-bold">Élève & Matricule</th>
                          <th colSpan={5} className="py-1 px-2 font-bold text-center bg-sky-100/80 text-sky-900 border-x border-slate-200">
                            MATIN (07h30 - 12h45)
                          </th>
                          <th colSpan={5} className="py-1 px-2 font-bold text-center bg-amber-100/80 text-amber-900 border-r border-slate-200">
                            APRÈS-MIDI (14h00 - 18h15)
                          </th>
                          <th colSpan={3} className="py-1 px-2 font-bold text-center bg-slate-200 text-slate-800">
                            BILAN
                          </th>
                          <th rowSpan={2} className="py-2 px-3 font-bold text-center">Actions Vie Scolaire</th>
                        </tr>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-600 font-semibold">
                          {/* Matin */}
                          <th className="p-1 text-center w-9 bg-sky-50/50">M1</th>
                          <th className="p-1 text-center w-9 bg-sky-50/50">M2</th>
                          <th className="p-1 text-center w-9 bg-sky-50/50">M3</th>
                          <th className="p-1 text-center w-9 bg-sky-50/50">M4</th>
                          <th className="p-1 text-center w-9 bg-sky-50/50">M5</th>
                          {/* Soir */}
                          <th className="p-1 text-center w-9 bg-amber-50/50">S1</th>
                          <th className="p-1 text-center w-9 bg-amber-50/50">S2</th>
                          <th className="p-1 text-center w-9 bg-amber-50/50">S3</th>
                          <th className="p-1 text-center w-9 bg-amber-50/50">S4</th>
                          <th className="p-1 text-center w-9 bg-amber-50/50">S5</th>
                          {/* Totaux */}
                          <th className="p-1 text-center w-8 text-emerald-700 font-bold">P</th>
                          <th className="p-1 text-center w-8 text-red-700 font-bold">A</th>
                          <th className="p-1 text-center w-8 text-amber-700 font-bold">R</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ficheStudents.map((s, idx) => {
                          let countP = 0;
                          let countA = 0;
                          let countR = 0;

                          return (
                            <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-7 w-7 border border-slate-200">
                                    <AvatarFallback className="text-[10px] font-bold bg-slate-100 text-slate-700">
                                      {s.lastName[0]}{s.firstName[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-semibold text-slate-900">{formatStudentName(s)}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">{s.matricule || 'N/A'}</p>
                                  </div>
                                </div>
                              </td>

                              {/* Créneaux M1..M5 et S1..S5 */}
                              {CRENEAUX_JOURNEE.map(cr => {
                                const rec = ficheAttendanceRecords.find(
                                  a => String(a.studentId || (a as any).eleve_id) === String(s.id) &&
                                    (a.heure === cr || (a as any).creneau === cr || (a.heure || '').startsWith(cr))
                                );
                                const st = (rec?.status || (rec as any)?.statut || '').toLowerCase();

                                let badgeColor = 'text-slate-300 font-mono';
                                let text = '—';

                                if (st === 'present' || st === 'présent') {
                                  badgeColor = 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-200';
                                  text = 'P';
                                  countP++;
                                } else if (st === 'absent') {
                                  badgeColor = 'bg-rose-100 text-rose-800 font-black border border-rose-200';
                                  text = 'A';
                                  countA++;
                                } else if (st === 'retard') {
                                  badgeColor = 'bg-amber-100 text-amber-800 font-bold border border-amber-200';
                                  text = 'R';
                                  countR++;
                                } else if (st === 'excuse' || st === 'excusé') {
                                  badgeColor = 'bg-sky-100 text-sky-800 font-bold border border-sky-200';
                                  text = 'E';
                                  countP++;
                                }

                                return (
                                  <td key={cr} className="py-1 px-1 text-center">
                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] ${badgeColor}`}>
                                      {text}
                                    </span>
                                  </td>
                                );
                              })}

                              {/* Totaux */}
                              <td className="py-1 px-1 text-center font-bold text-emerald-700 bg-emerald-50/40">{countP}</td>
                              <td className="py-1 px-1 text-center font-black text-rose-700 bg-rose-50/40">{countA}</td>
                              <td className="py-1 px-1 text-center font-bold text-amber-700 bg-amber-50/40">{countR}</td>

                              {/* Actions rapides */}
                              <td className="py-2 px-3 text-center space-x-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenRetardBillet(s)}
                                  className="h-6 px-2 text-[10px] text-amber-700 hover:bg-amber-100 border border-amber-200 gap-1 rounded"
                                  title="Émettre un billet d'entrée retard"
                                >
                                  <Ticket className="h-3 w-3" />
                                  Billet Retard
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenMaladieDialog(s)}
                                  className="h-6 px-2 text-[10px] text-teal-700 hover:bg-teal-100 border border-teal-200 gap-1 rounded"
                                  title="Émettre un billet de repos maladie"
                                >
                                  <Stethoscope className="h-3 w-3" />
                                  Repos Maladie
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── FICHES DE NOTES VIERGES (SAISIE MANUELLE ENSEIGNANTS) ── */}
          <TabsContent value="fiche_notes" className="mt-5 space-y-4">
            <Card className="border-amber-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-amber-50/80 via-white to-amber-50/50 pb-3 border-b border-amber-100">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5 text-amber-600" />
                      Fiches de Notes Vierges (Saisie Manuelle Enseignants)
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-600 mt-0.5">
                      Générez et imprimez les fiches de relevé de notes au modèle officiel (Interrogations & Devoirs) pour les professeurs
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      onClick={handlePrintNotesManuelle}
                      disabled={!selectedNotesClass || notesStudents.length === 0}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5 rounded-lg shadow-sm"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Imprimer la fiche (A4)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleExportNotesPdf}
                      disabled={!selectedNotesClass || notesStudents.length === 0}
                      className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs gap-1.5 rounded-lg shadow-sm"
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleExportNotesExcel}
                      disabled={!selectedNotesClass || notesStudents.length === 0}
                      className="border-emerald-500 text-emerald-700 hover:bg-emerald-50 text-xs gap-1.5 rounded-lg shadow-sm"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                      Excel
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handlePrintAllClassesNotes}
                      disabled={classes.length === 0}
                      className="border-amber-400 text-amber-800 hover:bg-amber-50 text-xs gap-1.5 rounded-lg shadow-sm"
                      title="Imprimer les fiches de toutes les classes autorisées d'un coup"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Toutes mes classes
                    </Button>
                  </div>
                </div>

                {/* Paramètres d'édition de la fiche */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-3">
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-semibold text-slate-700">Classe</Label>
                    <Select
                      value={notesClasseId || (selectedNotesClass?.id ? String(selectedNotesClass.id) : '')}
                      onValueChange={setNotesClasseId}
                    >
                      <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                        <SelectValue placeholder="Choisir une classe" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map(c => {
                          const eff = allStudents.filter(s => String(s.classId) === String(c.id) && s.status !== 'inactif').length;
                          return (
                            <SelectItem key={c.id} value={c.id} className="text-xs font-medium">
                              {c.name} ({eff} élèves)
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Année Scolaire</Label>
                    <Select value={notesAnneeScolaire} onValueChange={setNotesAnneeScolaire}>
                      <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024-2025" className="text-xs">2024-2025 (Modèle)</SelectItem>
                        <SelectItem value="2025-2026" className="text-xs">2025-2026</SelectItem>
                        <SelectItem value="2026-2027" className="text-xs">2026-2027</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Format Papier</Label>
                    <Select value={notesOrientation} onValueChange={v => setNotesOrientation(v as any)}>
                      <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait" className="text-xs">A4 Portrait (Modèle)</SelectItem>
                        <SelectItem value="landscape" className="text-xs">A4 Paysage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Interrogations</Label>
                    <Select value={String(notesNbInterros)} onValueChange={v => setNotesNbInterros(Number(v))}>
                      <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[3, 4, 5, 6, 7, 8].map(n => (
                          <SelectItem key={n} value={String(n)} className="text-xs">
                            {n} colonnes {n === 5 ? '(Modèle)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Devoirs</Label>
                    <Select value={String(notesNbDevoirs)} onValueChange={v => setNotesNbDevoirs(Number(v))}>
                      <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2, 3, 4, 5, 6].map(n => (
                          <SelectItem key={n} value={String(n)} className="text-xs">
                            {n} colonnes {n === 4 ? '(Modèle)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Options complémentaires (lignes vierges d'appoint & sous-titre) */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs border-t border-slate-100 mt-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-[11px] text-slate-600 font-medium">Lignes vierges d'appoint :</Label>
                      <Select value={String(notesExtraRows)} onValueChange={v => setNotesExtraRows(Number(v))}>
                        <SelectTrigger className="h-7 w-28 text-xs bg-white border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0" className="text-xs">Aucune</SelectItem>
                          <SelectItem value="2" className="text-xs">+2 lignes</SelectItem>
                          <SelectItem value="5" className="text-xs">+5 lignes</SelectItem>
                          <SelectItem value="10" className="text-xs">+10 lignes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-700 font-medium">
                      <input
                        type="checkbox"
                        checked={notesShowSubject}
                        onChange={e => setNotesShowSubject(e.target.checked)}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span>Indiquer matière / enseignant sur la fiche</span>
                    </label>
                  </div>

                  <Badge variant="secondary" className="bg-amber-100/70 text-amber-900 border-amber-200">
                    Effectif : {notesStudents.length} élève(s) {notesExtraRows > 0 ? `(+${notesExtraRows} vierges)` : ''}
                  </Badge>
                </div>

                {notesShowSubject && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <Label className="text-[11px] text-slate-600">Nom de la matière</Label>
                      <Input
                        placeholder="Ex: Mathématiques, Français, SVT..."
                        value={notesSubject}
                        onChange={e => setNotesSubject(e.target.value)}
                        className="h-7 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-600">Nom de l'enseignant</Label>
                      <Input
                        placeholder="Ex: M. Coulibaly, Mme Touré..."
                        value={notesTeacher}
                        onChange={e => setNotesTeacher(e.target.value)}
                        className="h-7 text-xs bg-white"
                      />
                    </div>
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-4 bg-slate-100/60 overflow-x-auto">
                {/* APERÇU FICHE PAPIER CONFORME AU MODÈLE */}
                <div className="max-w-[850px] mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md border border-slate-200 text-slate-900">
                  {/* En-tête officiel à 3 colonnes */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b-0">
                    <div className="w-[18%] flex justify-center items-center">
                      <img
                        src={LOGO_HINNEH_BASE64}
                        alt="Logo Hinneh"
                        className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                      />
                    </div>

                    <div className="w-[64%] text-center font-serif leading-tight">
                      <p className="text-[11px] sm:text-[13px] italic">
                        Ministère de l'Education Nationale et de l'Alphabétisation
                      </p>
                      <p className="text-[11.5px] sm:text-[13.5px] font-bold italic mt-0.5">
                        {currentSchool?.city?.toUpperCase().includes('ABIDJAN') ? 'DRENA ABIDJAN 4 / IEPP ABIDJAN' : 'DRENA KORHOGO / IEPP KORHOGO-EST'}
                      </p>
                      <p className="text-[12px] sm:text-[14.5px] font-bold italic mt-0.5">
                        {currentSchool?.name || 'Groupe Scolaire Confessionnel Islamique Hinneh de Korhogo'}
                      </p>
                      <p className="text-[11.5px] sm:text-[13.5px] font-bold italic mt-0.5 mb-2">
                        ANNEE SCOLAIRE {notesAnneeScolaire}
                      </p>
                      <div className="mt-2">
                        <span className="font-sans text-sm sm:text-base font-bold uppercase underline tracking-wide">
                          LISTE DE CLASSE {selectedNotesClass?.name || '6ème'}
                        </span>
                      </div>
                    </div>

                    <div className="w-[18%] flex flex-col items-center justify-center">
                      <img
                        src={ARMOIRIES_CI_BASE64}
                        alt="Armoiries Côte d'Ivoire"
                        className="w-16 h-14 sm:w-18 sm:h-16 object-contain"
                      />
                      <span className="text-[7.5px] font-semibold text-slate-600 tracking-wider uppercase mt-1">
                        Union - Discipline - Travail
                      </span>
                    </div>
                  </div>

                  {notesShowSubject && (notesSubject || notesTeacher) && (
                    <div className="flex justify-around bg-slate-50 border border-slate-800 text-[11px] py-1 px-3 mb-2 font-sans">
                      {notesSubject && <span><strong>Matière :</strong> {notesSubject}</span>}
                      {notesTeacher && <span><strong>Enseignant :</strong> {notesTeacher}</span>}
                    </div>
                  )}

                  {/* Tableau quadrillé */}
                  {notesStudents.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 italic text-xs">
                      Aucun élève actif trouvé dans cette classe.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border-2 border-black font-sans text-xs">
                        <thead>
                          <tr className="bg-white text-black font-bold border-b-2 border-black">
                            <th className="border border-black py-2 px-1 text-center w-10">N°</th>
                            <th className="border border-black py-2 px-3 text-center sm:w-72">NOM ET PRENOMS</th>
                            <th colSpan={notesNbInterros} className="border border-black py-2 px-2 text-center uppercase tracking-wide">
                              INTERROGATIONS
                            </th>
                            <th colSpan={notesNbDevoirs} className="border border-black py-2 px-2 text-center uppercase tracking-wide">
                              DEVOIRS
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {notesStudents.map((s, idx) => (
                            <tr key={s.id} className="h-9 border-b border-black">
                              <td className="border border-black text-center font-bold">{idx + 1}</td>
                              <td className="border border-black text-center font-medium px-2 whitespace-nowrap">
                                {formatNomEleveModele(s)}
                              </td>
                              {Array.from({ length: notesNbInterros }).map((_, i) => (
                                <td key={`interro-${i}`} className="border border-black w-10 sm:w-12 text-center"></td>
                              ))}
                              {Array.from({ length: notesNbDevoirs }).map((_, d) => (
                                <td key={`devoir-${d}`} className="border border-black w-11 sm:w-13 text-center"></td>
                              ))}
                            </tr>
                          ))}
                          {Array.from({ length: notesExtraRows }).map((_, k) => (
                            <tr key={`extra-${k}`} className="h-9 border-b border-black bg-slate-50/30">
                              <td className="border border-black text-center font-bold text-slate-400">
                                {notesStudents.length + k + 1}
                              </td>
                              <td className="border border-black text-center font-medium px-2">&nbsp;</td>
                              {Array.from({ length: notesNbInterros }).map((_, i) => (
                                <td key={`extra-interro-${i}`} className="border border-black w-10 sm:w-12 text-center"></td>
                              ))}
                              {Array.from({ length: notesNbDevoirs }).map((_, d) => (
                                <td key={`extra-devoir-${d}`} className="border border-black w-11 sm:w-13 text-center"></td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SAISIE DES NOTES ENSEIGNANTS PAR L'ÉDUCATEUR ── */}
          <TabsContent value="saisie_notes_prof" className="mt-5 space-y-5">
            {/* Bannière d'état du verrou */}
            {saisieLockStatus.est_verrouille ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 flex items-start gap-3 shadow-xs">
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-sm text-rose-900 flex items-center gap-1.5">
                    <Lock className="h-4 w-4 text-rose-700" />
                    Période de Saisie Clôturée — Verrou Actif
                  </p>
                  <p className="text-rose-800 leading-relaxed">
                    {saisieLockStatus.message}
                  </p>
                  <p className="text-[11px] text-rose-700 font-semibold mt-1">
                    Contactez l'administration de l'établissement si vous avez besoin d'une réouverture exceptionnelle de saisie.
                  </p>
                </div>
              </div>
            ) : saisieLockStatus.periode?.deverrouille_par_admin ? (
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 flex items-start gap-3 shadow-xs">
                <Unlock className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-sm text-purple-900 flex items-center gap-1.5">
                    Dérogation Administrative Active
                  </p>
                  <p className="text-purple-800 leading-relaxed">
                    Le verrou a été levé par l'Administration ({saisieLockStatus.periode.deverrouille_par || 'Admin'} : « {saisieLockStatus.periode.motif_deverrouillage || 'Autorisé'} »). Vous pouvez saisir et enregistrer les notes.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between text-xs shadow-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Saisie ouverte pour le <strong>{saisieTrimestre}er Trimestre</strong> (Clôture prévue le {saisieLockStatus.periode?.date_cloture_saisie || 'fin de période'}).</span>
                </div>
                <Badge className="bg-emerald-600 text-white text-[10px]">Saisie Autorisée</Badge>
              </div>
            )}

            {/* Formulaire de Sélection & Paramètres */}
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Pencil className="h-4 w-4 text-emerald-600" />
                      Saisie des Notes — Enseignant & Matière
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Renseignez les notes des élèves relevées avec le professeur de la discipline.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearSaisieNotes}
                      className="text-xs h-8 text-slate-500"
                    >
                      Effacer
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEducatorGrades}
                      disabled={saisieLockStatus.est_verrouille || isSavingSaisieNotes}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs h-8 gap-1.5 shadow-xs"
                    >
                      {isSavingSaisieNotes ? (
                        <>
                          <Clock className="h-3.5 w-3.5 animate-spin" /> Enregistrement...
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5" /> Enregistrer les Notes
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {/* Classe */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Classe *</Label>
                    <Select value={saisieClassId} onValueChange={setSaisieClassId}>
                      <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                        <SelectValue placeholder="Sélectionner une classe" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Enseignant */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Enseignant / Professeur *</Label>
                    <Select value={saisieTeacherId} onValueChange={setSaisieTeacherId}>
                      <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                        <SelectValue placeholder="Sélectionner l'enseignant" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachersList.length > 0 ? (
                          teachersList.map((t) => (
                            <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                              {t.prenom || (t as any).firstName} {t.nom || (t as any).lastName}
                            </SelectItem>
                          ))
                        ) : (
                          allStaff.map((t) => (
                            <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                              {t.prenom || (t as any).firstName} {t.nom || (t as any).lastName}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Matière / Discipline */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Discipline / Matière *</Label>
                    <Select value={saisieMatiere} onValueChange={setSaisieMatiere}>
                      <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MATIERES_OFFICIELLES.map((m) => (
                          <SelectItem key={m} value={m} className="text-xs">
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Trimestre */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Période Scolaire *</Label>
                    <Select value={String(saisieTrimestre)} onValueChange={(v) => setSaisieTrimestre(Number(v))}>
                      <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1" className="text-xs">1er Trimestre</SelectItem>
                        <SelectItem value="2" className="text-xs">2ème Trimestre</SelectItem>
                        <SelectItem value="3" className="text-xs">3ème Trimestre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1 border-t border-slate-100">
                  {/* Type d'évaluation */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Type d'évaluation</Label>
                    <Select value={saisieTypeDevoir} onValueChange={setSaisieTypeDevoir}>
                      <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="interrogation écrite" className="text-xs">Interrogation écrite</SelectItem>
                        <SelectItem value="devoir de classe" className="text-xs">Devoir de classe</SelectItem>
                        <SelectItem value="devoir surveillé" className="text-xs">Devoir surveillé</SelectItem>
                        <SelectItem value="travaux pratiques" className="text-xs">Travaux pratiques</SelectItem>
                        <SelectItem value="composition" className="text-xs">Composition</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Réf / Devoir N° */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Réf. Devoir N°</Label>
                    <Select value={saisieDevoirNum} onValueChange={setSaisieDevoirNum}>
                      <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INT-1" className="text-xs">Interro 1 (INT-1)</SelectItem>
                        <SelectItem value="INT-2" className="text-xs">Interro 2 (INT-2)</SelectItem>
                        <SelectItem value="INT-3" className="text-xs">Interro 3 (INT-3)</SelectItem>
                        <SelectItem value="INT-4" className="text-xs">Interro 4 (INT-4)</SelectItem>
                        <SelectItem value="DEV-1" className="text-xs">Devoir 1 (DEV-1)</SelectItem>
                        <SelectItem value="DEV-2" className="text-xs">Devoir 2 (DEV-2)</SelectItem>
                        <SelectItem value="DEV-3" className="text-xs">Devoir 3 (DEV-3)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Coefficient */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Coefficient</Label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={saisieCoeff}
                      onChange={(e) => setSaisieCoeff(Number(e.target.value) || 1)}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Date */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Date d'évaluation</Label>
                    <Input
                      type="date"
                      value={saisieDate}
                      onChange={(e) => setSaisieDate(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tableau interactif de saisie des élèves */}
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Filtrer par nom ou matricule..."
                      value={saisieSearchStudent}
                      onChange={(e) => setSaisieSearchStudent(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {saisieStudentsInClass.length} élève(s) dans la classe
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {saisieStudentsInClass.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 italic">
                    Aucun élève trouvé dans cette classe.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                          <th className="py-2.5 px-3 text-center w-12">N°</th>
                          <th className="py-2.5 px-3 text-center w-28">Matricule</th>
                          <th className="py-2.5 px-3 text-left">Nom & Prénoms de l'Élève</th>
                          <th className="py-2.5 px-3 text-center w-16">Sexe</th>
                          <th className="py-2.5 px-3 text-center w-28 text-emerald-700 font-bold">Note / 20 *</th>
                          <th className="py-2.5 px-3 text-left">Appréciation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {saisieStudentsInClass.map((st, idx) => {
                          const currentVal = saisieNotesMap[String(st.id)] || { note: '', appreciation: '' };
                          const numVal = Number(currentVal.note);
                          const hasGrade = currentVal.note !== '' && !isNaN(numVal);
                          const isUnder10 = hasGrade && numVal < 10;

                          return (
                            <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-2 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                              <td className="py-2 px-3 text-center font-mono font-medium text-slate-600">
                                {st.matricule || `MAT-${st.id}`}
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-900">
                                {formatStudentName(st)}
                              </td>
                              <td className="py-2 px-3 text-center text-slate-600">
                                {(st.gender || (st as any).sexe || 'M').toUpperCase().startsWith('F') ? 'F' : 'M'}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <Input
                                  type="number"
                                  min={0}
                                  max={20}
                                  step={0.25}
                                  placeholder="-- / 20"
                                  value={currentVal.note}
                                  disabled={saisieLockStatus.est_verrouille}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSaisieNotesMap((prev) => ({
                                      ...prev,
                                      [String(st.id)]: {
                                        ...prev[String(st.id)],
                                        note: val,
                                      },
                                    }));
                                  }}
                                  className={`h-8 w-24 text-center font-bold text-xs mx-auto ${
                                    isUnder10 ? 'text-rose-600 border-rose-300 bg-rose-50/30' : hasGrade ? 'text-slate-900 border-emerald-300' : ''
                                  }`}
                                />
                              </td>
                              <td className="py-2 px-3">
                                <Input
                                  placeholder="Appréciation (ex: Très bien, Satisfaisant...)"
                                  value={currentVal.appreciation}
                                  disabled={saisieLockStatus.est_verrouille}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSaisieNotesMap((prev) => ({
                                      ...prev,
                                      [String(st.id)]: {
                                        ...prev[String(st.id)],
                                        appreciation: val,
                                      },
                                    }));
                                  }}
                                  className="h-8 text-xs"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── DOCUMENTS ACADÉMIQUES & DEPS ── */}
          <TabsContent value="documents_academiques" className="mt-5 space-y-5">
            {/* Header & Sélecteurs Généraux */}
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Award className="h-5 w-5 text-purple-700" />
                      Édition des Bulletins, PV de Notes, Matrices & DEPS
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Générez et imprimez les documents pédagogiques et administratifs officiels pour votre classe.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-48">
                      <Select value={docClassId} onValueChange={setDocClassId}>
                        <SelectTrigger className="h-8 text-xs bg-white border-slate-200 font-semibold">
                          <SelectValue placeholder="Choisir une classe" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)} className="text-xs font-semibold">
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-36">
                      <Select value={String(docTrimestre)} onValueChange={(v) => setDocTrimestre(Number(v))}>
                        <SelectTrigger className="h-8 text-xs bg-white border-slate-200 font-semibold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1" className="text-xs font-semibold">1er Trimestre</SelectItem>
                          <SelectItem value="2" className="text-xs font-semibold">2ème Trimestre</SelectItem>
                          <SelectItem value="3" className="text-xs font-semibold">3ème Trimestre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Grille des 4 Documents Clés */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Bulletins de Notes */}
              <Card className="border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                      <FileText className="h-5 w-5" />
                    </div>
                    <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px]">
                      Officiel Hinneh
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900 mt-2">
                    Bulletins de Notes Trimestriels
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 leading-relaxed">
                    Bulletins complets avec moyennes littéraires, scientifiques, rangs, moyenne générale et appréciations du conseil de classe.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                    <p className="font-semibold text-slate-800">Prêt pour impression :</p>
                    <p>Classe : <strong>{docSelectedClass?.name || 'Sélectionnée'}</strong> • Période : <strong>{docTrimestre}er Trimestre</strong></p>
                    <p>Effectif : <strong>{docStudentsInClass.length} élèves</strong></p>
                  </div>
                  <Button
                    onClick={handlePrintBulletinsAll}
                    className="w-full bg-[#0f2444] hover:bg-[#163564] text-white font-semibold text-xs h-9 gap-1.5 shadow-xs"
                  >
                    <Printer className="h-4 w-4" /> Imprimer les Bulletins (Lot Complet)
                  </Button>
                </CardContent>
              </Card>

              {/* 2. Procès-Verbal (PV) de Conseil de Classe */}
              <Card className="border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                      <ClipboardCheck className="h-5 w-5" />
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                      Délibération
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900 mt-2">
                    Procès-Verbal (PV) de Notes
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 leading-relaxed">
                    Bordereau officiel de conseil : statistiques de classe, tableaux d'honneur, avertissements et décisions du conseil de classe.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                    <p className="font-semibold text-slate-800">Contenu du Procès-Verbal :</p>
                    <p>• Rangs, moyennes et décisions nominatives</p>
                    <p>• Distinctions honorifiques et sanctions académiques</p>
                  </div>
                  <Button
                    onClick={handlePrintPVNotes}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs h-9 gap-1.5 shadow-xs"
                  >
                    <Printer className="h-4 w-4" /> Imprimer le Procès-Verbal (PV)
                  </Button>
                </CardContent>
              </Card>

              {/* 3. Matrice des Notes Récapitulative */}
              <Card className="border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                      <Table className="h-5 w-5" />
                    </div>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                      A4 Paysage
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900 mt-2">
                    Matrice Récapitulative des Notes
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 leading-relaxed">
                    Grille transversale grand format synthétisant l'ensemble des moyennes par matière, les moyennes générales et les classements.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                    <p className="font-semibold text-slate-800">Format d'impression :</p>
                    <p>• Toutes les disciplines alignées en colonnes</p>
                    <p>• Moyennes surlignées avec alerte notes &lt; 10/20</p>
                  </div>
                  <Button
                    onClick={handlePrintMatriceNotes}
                    className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs h-9 gap-1.5 shadow-xs"
                  >
                    <Printer className="h-4 w-4" /> Imprimer la Matrice des Notes
                  </Button>
                </CardContent>
              </Card>

              {/* 4. Remontée des Moyennes DEPS */}
              <Card className="border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between ring-1 ring-purple-100">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                      <Award className="h-5 w-5" />
                    </div>
                    <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] font-bold">
                      DEPS / DRENA Officiel
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900 mt-2">
                    Remontée des Moyennes DEPS
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 leading-relaxed">
                    Bordereau officiel et fichier d'importation normalisé exigé par la Direction de l'Enseignement Privé et Scolaire.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="p-2.5 bg-purple-50/70 rounded-lg border border-purple-200 text-xs text-purple-950 space-y-1">
                    <p className="font-semibold text-purple-900">Format normalisé Côte d'Ivoire :</p>
                    <p>• Matricules MENA, Statut Affecté de l'État, Régime</p>
                    <p>• Statistiques officielles (Admis, Garçons, Filles, Taux de réussite)</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handlePrintDEPS}
                      className="bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs h-9 gap-1 shadow-xs"
                    >
                      <Printer className="h-3.5 w-3.5" /> Bordereau (PDF)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleExportExcelDEPS}
                      className="text-purple-800 border-purple-300 hover:bg-purple-50 font-semibold text-xs h-9 gap-1 shadow-xs"
                    >
                      <Download className="h-3.5 w-3.5" /> Export Excel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── ABSENCES DU JOUR ── */}
          <TabsContent value="absences" className="mt-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Rechercher élève..." value={searchAbsences} onChange={e => setSearchAbsences(e.target.value)} />
              </div>
              <Badge variant="outline" className="text-red-700 border-red-300">{absentsAujourdhui.length} absent(s)</Badge>
            </div>
            {absentsAujourdhui.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground italic flex flex-col items-center gap-2">
                <CheckCircle className="h-8 w-8 text-green-500" />
                Aucune absence enregistrée aujourd'hui.
              </CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {absentsAujourdhui
                  .filter(s => `${formatStudentName(s)}`.toLowerCase().includes(searchAbsences.toLowerCase()))
                  .map(s => {
                    const classe = classes.find(c => c.id === s.classId);
                    return (
                      <Card key={s.id} className="border-red-200 bg-red-50/40 hover:shadow transition">
                        <CardContent className="p-4 flex items-center gap-3">
                          <Avatar className="h-12 w-12 ring-2 ring-red-200">
                            <AvatarFallback className="bg-red-100 text-red-700 font-bold text-sm">{s.lastName[0]}{s.firstName[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{formatStudentName(s)}</p>
                            <p className="text-xs text-muted-foreground">{classe?.name ?? 'Classe ?'}</p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {s.parentPhone && (
                                <a href={`tel:${s.parentPhone}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                  <Phone className="h-3 w-3" />{s.parentPhone}
                                </a>
                              )}
                              {s.parentEmail && (
                                <a href={`mailto:${s.parentEmail}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                  <Mail className="h-3 w-3" />Email parent
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 items-end shrink-0">
                            <Badge variant="outline" className="text-red-700 border-red-300 text-[10px]">Absent</Badge>
                            {notifSentIds.has(s.id) ? (
                              <Badge className="bg-green-600 text-[10px]">Notifie</Badge>
                            ) : (
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-orange-300 text-orange-700 hover:bg-orange-50" onClick={() => handleOuvrirNotif(s)}>
                                <Bell className="h-3 w-3" />Notifier
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </TabsContent>

          {/* ── RETARDS ── */}
          <TabsContent value="retards" className="mt-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <div>
                Règle : arrivé(e) <strong>≤08h15</strong> → retard excusé &nbsp;|&nbsp; après <strong>08h15</strong> → exclu(e) du cours
              </div>
              <Button
                size="sm"
                onClick={() => handleOpenRetardBillet(allStudents[0] || ({} as any))}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5 shrink-0"
              >
                <Ticket className="h-3.5 w-3.5" />
                Émettre un Billet de Retard
              </Button>
            </div>
            {retardsAujourdhui.length === 0 && Object.keys(retardsMap).length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground italic">Aucun retard enregistré aujourd'hui.</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {retardsAujourdhui.map(s => {
                  const traite = retardsMap[s.id];
                  const classe = classes.find(c => c.id === s.classId);
                  return (
                    <Card key={s.id} className={`border-l-4 ${traite ? (traite.statut === 'excuse' ? 'border-l-green-400' : 'border-l-red-400') : 'border-l-amber-400'}`}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-amber-100 text-amber-700 font-bold text-xs">{s.lastName[0]}{s.firstName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{formatStudentName(s)}</p>
                          <p className="text-xs text-muted-foreground">{classe?.name ?? ''} — Matricule : {s.matricule || 'N/A'}</p>
                          {traite && <p className="text-xs mt-0.5 text-muted-foreground">Arrivé(e) à {traite.heure}{traite.note ? ` — ${traite.note}` : ''}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenRetardBillet(s)}
                            className="h-8 text-xs border-amber-300 text-amber-800 hover:bg-amber-50 gap-1"
                          >
                            <Ticket className="h-3.5 w-3.5 text-amber-600" />
                            Billet d'Entrée
                          </Button>
                          {traite ? (
                            <Badge className={traite.statut === 'excuse' ? 'bg-green-600' : 'bg-red-600'}>
                              {traite.statut === 'excuse' ? '✓ Excusé' : '⚠ Exclu'}
                            </Badge>
                          ) : (
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => handleOuvrirRetard(s)}>
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />Traiter
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" />Signaler un retard et éditer un billet</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {allStudents.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleOpenRetardBillet(s)}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-amber-50 hover:border-amber-300 transition-colors flex items-center gap-1.5"
                    >
                      <Ticket className="h-3 w-3 text-amber-600" />
                      {formatStudentName(s)}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── REPOS MALADIE & INFIRMERIE ── */}
          <TabsContent value="repos_maladie" className="mt-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-teal-50 via-white to-emerald-50 border border-teal-200">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-teal-600" />
                  Autorisations de Repos Médical & Décharges Infirmerie
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Édition officielle et enregistrement des billets de dispense pour maladie ou visite médicale.
                </p>
              </div>
              <Button
                onClick={() => handleOpenMaladieDialog()}
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs gap-1.5 rounded-lg shadow-sm"
              >
                <Stethoscope className="h-3.5 w-3.5" />
                Émettre un Billet de Repos
              </Button>
            </div>

            {billetsMaladieHistory.length === 0 ? (
              <Card className="border-dashed border-slate-200">
                <CardContent className="py-12 text-center text-slate-500 italic text-xs flex flex-col items-center gap-2">
                  <Stethoscope className="h-8 w-8 text-teal-400" />
                  Aucun billet de repos maladie émis pour le moment.
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenMaladieDialog()}
                    className="mt-2 text-xs border-teal-200 text-teal-700 hover:bg-teal-50"
                  >
                    Créer le premier billet
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-700">
                  Historique des autorisations médicales émises ({billetsMaladieHistory.length})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {billetsMaladieHistory.map(b => (
                    <Card key={b.id} className="border-teal-200/80 bg-teal-50/20 shadow-xs">
                      <CardContent className="p-4 flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-teal-600 text-white text-[10px]">{b.id}</Badge>
                            <span className="text-xs text-slate-500">{b.date} à {b.heureDepart}</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900">{formatStudentName(b.student)}</h4>
                          <p className="text-xs text-slate-600">Classe : <strong>{b.classeName}</strong></p>
                          <p className="text-xs text-teal-800 font-medium">🛌 Durée : {b.periode}</p>
                          <p className="text-xs text-slate-500 italic">Motif : {b.motif}</p>
                          <p className="text-[11px] text-slate-600">Parent contacté : {b.parentPrevenu}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const classe = classes.find(c => String(c.id) === String(b.student.classId)) || null;
                            const school = schools.find(s => String(s.id) === String(b.student.schoolId)) || null;
                            printBilletReposMaladie(b.student, classe, school, {
                              dateConstat: b.date,
                              periodeRepos: b.periode,
                              motifMedical: b.motif,
                              heureDepart: b.heureDepart,
                              parentPrevenu: b.parentPrevenu,
                              educateurNom: username || 'L\'Éducateur',
                              year: '2026 - 2027',
                            });
                          }}
                          className="text-xs gap-1 border-teal-300 text-teal-800 hover:bg-teal-50 rounded-lg"
                        >
                          <Printer className="h-3 w-3" />
                          Imprimer
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── PRESENCES PROFS ── */}
          <TabsContent value="presences_staff" className="mt-5 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Rechercher..." value={searchStaff} onChange={e => setSearchStaff(e.target.value)} />
              </div>
              <Badge variant="outline" className="text-green-700 border-green-300">{staffAvecPointage.filter(s => s.statut === 'present').length} présent(s)</Badge>
              <Badge variant="outline" className="text-red-700 border-red-300">{staffAvecPointage.filter(s => s.statut === 'absent').length} absent(s)</Badge>
              <Badge variant="outline" className="text-muted-foreground">{staffAvecPointage.filter(s => s.statut === 'non_pointe').length} non pointé(s)</Badge>
            </div>
            {staffAvecPointage.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground italic">
                Aucun professeur/instituteur trouvé. Les présences se mettent à jour automatiquement lors de l'appel.
              </CardContent></Card>
            ) : (
              <div className="space-y-2">
                {staffAvecPointage
                  .filter(({ staff: s }) => `${formatStudentName(s)}`.toLowerCase().includes(searchStaff.toLowerCase()))
                  .map(({ staff: s, statut, heure }) => (
                    <Card key={s.id} className={`border-l-4 ${
                      statut === 'present'    ? 'border-l-green-400' :
                      statut === 'retard'     ? 'border-l-amber-400' :
                      statut === 'absent'     ? 'border-l-red-400'   : 'border-l-muted'
                    }`}>
                      <CardContent className="p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">{s.lastName?.[0]}{s.firstName?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-sm">{formatStudentName(s)}</p>
                            <p className="text-xs text-muted-foreground capitalize">{s.fonction}</p>
                            {heure && <p className="text-xs text-muted-foreground">Pointage à {heure}</p>}
                          </div>
                        </div>
                        <Select
                          value={statut}
                          onValueChange={(val: any) => handleToggleStaffPresence(s.id, val)}
                        >
                          <SelectTrigger className={`w-36 h-8 text-xs font-semibold text-white cursor-pointer rounded-lg border-none ${
                            statut === 'present'    ? 'bg-green-600 hover:bg-green-700' :
                            statut === 'retard'     ? 'bg-amber-500 hover:bg-amber-600' :
                            statut === 'absent'     ? 'bg-red-600 hover:bg-red-700'     : 'bg-slate-500 hover:bg-slate-600'
                          }`}>
                            <SelectValue placeholder="Non pointé" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="non_pointe">— Non pointé</SelectItem>
                            <SelectItem value="present">✓ Présent</SelectItem>
                            <SelectItem value="retard">⏰ Retard</SelectItem>
                            <SelectItem value="absent">✗ Absent</SelectItem>
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>

          {/* ── NOTIFICATIONS PARENTS ── */}
          <TabsContent value="notifications" className="mt-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-semibold">Historique des notifications</h3>
                <p className="text-xs text-muted-foreground">Notifications envoyées aux parents ce jour</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="text-orange-700 border-orange-300">{notifs.length} envoyee(s)</Badge>
                <Badge variant="outline" className="text-red-700 border-red-300">{absentsAujourdhui.filter(s => !notifSentIds.has(s.id)).length} parent(s) non notifie(s)</Badge>
              </div>
            </div>

            {absentsAujourdhui.filter(s => !notifSentIds.has(s.id)).length > 0 && (
              <Card className="border-orange-200 bg-orange-50/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-orange-800">
                    <AlertTriangle className="h-4 w-4" />
                    Parents non encore notifies ({absentsAujourdhui.filter(s => !notifSentIds.has(s.id)).length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {absentsAujourdhui.filter(s => !notifSentIds.has(s.id)).map(s => (
                      <Button key={s.id} size="sm" variant="outline" className="gap-1 text-xs border-orange-300 text-orange-700 hover:bg-orange-100" onClick={() => handleOuvrirNotif(s)}>
                        <Bell className="h-3 w-3" />{formatStudentName(s)}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {notifs.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground italic flex flex-col items-center gap-2">
                <Bell className="h-8 w-8 opacity-30" />
                Aucune notification envoyee aujourd'hui.
              </CardContent></Card>
            ) : (
              <div className="space-y-2">
                {notifs.map(n => (
                  <Card key={n.id} className="border-l-4 border-l-green-400">
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className={`mt-0.5 p-1.5 rounded-full shrink-0 ${
                        n.canal === 'sms' ? 'bg-blue-100' : n.canal === 'whatsapp' ? 'bg-green-100' : 'bg-purple-100'
                      }`}>
                        {n.canal === 'sms' ? <Phone className="h-3.5 w-3.5 text-blue-700" /> :
                         n.canal === 'whatsapp' ? <Phone className="h-3.5 w-3.5 text-green-700" /> :
                         <Mail className="h-3.5 w-3.5 text-purple-700" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{n.studentName}</p>
                          <Badge className={`text-[10px] ${n.canal === 'sms' ? 'bg-blue-600' : n.canal === 'whatsapp' ? 'bg-green-600' : 'bg-purple-600'}`}>
                            {n.canal.toUpperCase()}
                          </Badge>
                          <Badge className="bg-green-600 text-[10px]">Envoye</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.date}</p>
                        <p className="text-xs text-muted-foreground mt-1 italic truncate">{n.message}</p>
                        {(n.parentPhone || n.parentEmail) && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {n.parentPhone && <span className="mr-2">{n.parentPhone}</span>}
                            {n.parentEmail && <span>{n.parentEmail}</span>}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── INCIDENTS ── */}
          <TabsContent value="incidents" className="mt-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex gap-2 flex-wrap items-center">
                <div className="relative max-w-xs flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Rechercher..." value={searchIncidents} onChange={e => setSearchIncidents(e.target.value)} />
                </div>
                <Badge variant="outline" className="text-red-700 border-red-300">{incidents.filter(i => i.status === 'ouvert').length} ouvert(s)</Badge>
                <Badge variant="outline" className="text-green-700 border-green-300">{incidents.filter(i => i.status === 'resolu').length} resolu(s)</Badge>
              </div>
              <Button className="gap-2" onClick={() => setIncidentDialog(true)}>
                <FileWarning className="h-4 w-4" />Signaler un incident
              </Button>
            </div>

            {incidents.length === 0 ? (
              <Card><CardContent className="py-14 text-center text-muted-foreground italic flex flex-col items-center gap-2">
                <ShieldAlert className="h-10 w-10 opacity-20" />
                Aucun incident enregistre. Cliquez sur "Signaler un incident" pour en ajouter un.
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {incidents
                  .filter(i => {
                    const s = allStudents.find(st => st.id === i.studentId);
                    return !searchIncidents || `${s?.firstName ?? ''} ${s?.lastName ?? ''} ${i.type} ${i.description}`.toLowerCase().includes(searchIncidents.toLowerCase());
                  })
                  .map(incident => {
                    const student = allStudents.find(s => s.id === incident.studentId);
                    const classe = classes.find(c => c.id === student?.classId);
                    const severityStyle =
                      incident.severity === 'grave'  ? 'border-l-red-500 bg-red-50/30' :
                      incident.severity === 'moyen'  ? 'border-l-amber-400 bg-amber-50/30' :
                                                       'border-l-blue-300 bg-blue-50/20';
                    const severityBadge =
                      incident.severity === 'grave'  ? 'bg-red-600' :
                      incident.severity === 'moyen'  ? 'bg-amber-500' : 'bg-blue-500';
                    return (
                      <Card key={incident.id} className={`border-l-4 ${severityStyle}`}>
                        <CardContent className="p-4 flex items-start gap-3">
                          <div className={`mt-0.5 p-1.5 rounded-full shrink-0 ${
                            incident.severity === 'grave' ? 'bg-red-100' : incident.severity === 'moyen' ? 'bg-amber-100' : 'bg-blue-100'
                          }`}>
                            <ShieldAlert className={`h-4 w-4 ${
                              incident.severity === 'grave' ? 'text-red-700' : incident.severity === 'moyen' ? 'text-amber-700' : 'text-blue-700'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm">
                                {student ? `${formatStudentName(student)}` : 'Eleve inconnu'}
                              </p>
                              {classe && <span className="text-xs text-muted-foreground">{classe.name}</span>}
                              <Badge className={`text-[10px] ${severityBadge}`}>{incident.severity}</Badge>
                              <Badge variant="outline" className="text-[10px] capitalize">{incident.type}</Badge>
                              {incident.status === 'resolu'
                                ? <Badge className="bg-green-600 text-[10px]">Resolu</Badge>
                                : <Badge className="bg-red-600 text-[10px]">Ouvert</Badge>}
                            </div>
                            <p className="text-sm mt-1">{incident.description}</p>
                            {incident.actionTaken && (
                              <p className="text-xs text-muted-foreground mt-0.5 italic">Action : {incident.actionTaken}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">{new Date(incident.date).toLocaleDateString('fr-FR')}</p>
                          </div>
                          {incident.status === 'ouvert' && (
                            <Button size="sm" variant="outline" className="gap-1 text-xs shrink-0 border-green-300 text-green-700 hover:bg-green-50" onClick={() => handleCloturerIncident(incident.id)}>
                              <CheckCircle2 className="h-3.5 w-3.5" />Cloturer
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </TabsContent>

          {/* ── ASSISTANCE SOCIALE ── */}
          <TabsContent value="social" className="mt-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex gap-2 flex-wrap items-center">
                <div className="relative max-w-xs flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Rechercher..." value={searchSocial} onChange={e => setSearchSocial(e.target.value)} />
                </div>
                <Badge variant="outline" className="text-pink-700 border-pink-300">{dossiersSociaux.filter(d => d.statut === 'actif').length} actif(s)</Badge>
                <Badge variant="outline" className="text-red-700 border-red-300">{dossiersSociaux.filter(d => d.priorite === 'urgente' && d.statut === 'actif').length} urgent(s)</Badge>
              </div>
              <Button className="gap-2 bg-pink-600 hover:bg-pink-700" onClick={() => setSocialDialog(true)}>
                <Heart className="h-4 w-4" />Ouvrir un dossier
              </Button>
            </div>

            {dossiersSociaux.length === 0 ? (
              <Card><CardContent className="py-14 text-center text-muted-foreground italic flex flex-col items-center gap-2">
                <Heart className="h-10 w-10 opacity-20" />
                Aucun dossier social. Cliquez sur "Ouvrir un dossier" pour en creer un.
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {dossiersSociaux
                  .filter(d => {
                    const s = allStudents.find(st => st.id === d.studentId);
                    return !searchSocial || `${s?.firstName ?? ''} ${s?.lastName ?? ''} ${d.situation}`.toLowerCase().includes(searchSocial.toLowerCase());
                  })
                  .map(dossier => {
                    const student = allStudents.find(s => s.id === dossier.studentId);
                    const classe = classes.find(c => c.id === student?.classId);
                    const prioColor =
                      dossier.priorite === 'urgente' ? 'border-l-pink-500 bg-pink-50/30' :
                      dossier.priorite === 'moyenne' ? 'border-l-amber-400 bg-amber-50/20' :
                                                       'border-l-blue-300 bg-blue-50/10';
                    const prioBadge =
                      dossier.priorite === 'urgente' ? 'bg-pink-600' :
                      dossier.priorite === 'moyenne' ? 'bg-amber-500' : 'bg-blue-500';
                    return (
                      <Card key={dossier.id} className={`border-l-4 ${prioColor}`}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-9 w-9 shrink-0">
                              <AvatarFallback className="bg-pink-100 text-pink-700 text-xs font-bold">
                                {student?.lastName?.[0]}{student?.firstName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-sm">
                                  {student ? `${formatStudentName(student)}` : 'Eleve inconnu'}
                                </p>
                                {classe && <span className="text-xs text-muted-foreground">{classe.name}</span>}
                                <Badge className={`text-[10px] ${prioBadge}`}>{dossier.priorite}</Badge>
                                <Badge variant="outline" className="text-[10px] capitalize">{dossier.situation.replace('_', ' ')}</Badge>
                                {dossier.statut === 'clos'
                                  ? <Badge className="bg-muted-foreground text-[10px]">Clos</Badge>
                                  : <Badge className="bg-green-600 text-[10px]">Actif</Badge>}
                              </div>
                              {dossier.suivi && <p className="text-xs text-muted-foreground mt-0.5 italic">{dossier.suivi}</p>}
                              <p className="text-xs text-muted-foreground mt-0.5">Ouvert le {dossier.dateOuverture}</p>
                            </div>
                            {dossier.statut === 'actif' && (
                              <div className="flex gap-1 shrink-0">
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-pink-300 text-pink-700 hover:bg-pink-50" onClick={() => { setSocialNoteDialog(dossier.id); setSocialNoteText(''); }}>
                                  <Pencil className="h-3 w-3" />Note
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-muted text-muted-foreground hover:bg-muted/50" onClick={() => handleClosDossier(dossier.id)}>
                                  <UserCheck className="h-3 w-3" />Clore
                                </Button>
                              </div>
                            )}
                          </div>
                          {dossier.notes.length > 0 && (
                            <div className="ml-12 space-y-1">
                              {dossier.notes.slice(0, 3).map((n, i) => (
                                <div key={i} className="text-xs bg-muted/50 rounded px-2 py-1">
                                  <span className="text-muted-foreground">{n.date} — </span>{n.contenu}
                                </div>
                              ))}
                              {dossier.notes.length > 3 && <p className="text-[10px] text-muted-foreground">+{dossier.notes.length - 3} note(s) supplementaire(s)</p>}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </TabsContent>

          {/* ── NOTE DE CONDUITE ── */}
          <TabsContent value="conduite" className="mt-5 space-y-4">
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
              <strong>Calcul automatique :</strong> Base 10 &mdash; 1 pt retranché par absence (2h) &mdash; 1 pt par 3 retards &mdash; Min <strong>5</strong> / Max <strong>18</strong>.<br/>
              La note finale est la moyenne entre : note base absences + note(s) profs (subject=conduite) + note éducateur saisie ici.
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Rechercher élève..." value={searchConduite} onChange={e => setSearchConduite(e.target.value)} />
              </div>
              <Select value={conduiteClassId} onValueChange={setConduiteClassId}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Toutes les classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les classes</SelectItem>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/90 border-b">
                    <tr>
                      <th className="text-left p-3 font-semibold">Élève</th>
                      <th className="text-center p-3 font-semibold">Absences</th>
                      <th className="text-center p-3 font-semibold">Retards</th>
                      <th className="text-center p-3 font-semibold text-muted-foreground">Base abs.</th>
                      <th className="text-center p-3 font-semibold text-purple-700">Moy. profs</th>
                      <th className="text-center p-3 font-semibold text-orange-700">Note éduc.</th>
                      <th className="text-center p-3 font-semibold text-primary">Finale /18</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conduiteData.map(({ student: s, absencesTrim, retardsTrim, noteBase, moyenneProfs, noteEduc, notefinale }, i) => {
                      const classe = classes.find(c => c.id === s.classId);
                      return (
                        <tr key={s.id} className={`border-b hover:bg-muted/20 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">{s.lastName[0]}{s.firstName[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-xs">{formatStudentName(s)}</p>
                                <p className="text-[10px] text-muted-foreground">{classe?.name ?? ''}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className={absencesTrim > 4 ? 'border-red-300 text-red-700' : 'border-muted'}>{absencesTrim}</Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className={retardsTrim > 2 ? 'border-amber-300 text-amber-700' : 'border-muted'}>{retardsTrim}</Badge>
                          </td>
                          <td className="p-3 text-center font-mono text-sm text-muted-foreground">{noteBase.toFixed(1)}</td>
                          <td className="p-3 text-center font-mono text-sm text-purple-700">
                            {moyenneProfs !== null ? moyenneProfs.toFixed(1) : <span className="text-muted-foreground text-xs">—</span>}
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min={5}
                              max={18}
                              step={0.5}
                              value={noteEduc ?? ''}
                              onChange={e => setConduiteEducateur(prev => ({ ...prev, [s.id]: Number(e.target.value) }))}
                              placeholder="—"
                              className="w-16 h-8 text-center text-sm font-bold text-orange-700 border rounded border-orange-300 focus:outline-none focus:border-orange-500 bg-transparent"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <span className={`text-base font-bold font-mono ${notefinale >= 14 ? 'text-green-700' : notefinale >= 10 ? 'text-blue-700' : notefinale >= 7 ? 'text-amber-700' : 'text-red-700'}`}>
                              {notefinale.toFixed(1)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {conduiteData.length === 0 && (
                      <tr><td colSpan={7} className="text-center p-8 text-muted-foreground italic">Aucun élève trouvé.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ── ACTIONS RAPIDES ── */}
          <TabsContent value="actions" className="mt-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div><CardTitle className="text-base">Liste des élèves</CardTitle><CardDescription className="text-xs">Exporter par classe (PDF)</CardDescription></div>
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent><Button className="w-full gap-2" onClick={handleDownloadStudents}><Download className="h-4 w-4" />Télécharger PDF</Button></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div><CardTitle className="text-base">Liste du personnel</CardTitle><CardDescription className="text-xs">Exporter les employés (PDF)</CardDescription></div>
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent><Button className="w-full gap-2" onClick={handleDownloadStaff}><Download className="h-4 w-4" />Télécharger PDF</Button></CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div><CardTitle>Derniers élèves enregistrés</CardTitle><CardDescription>Aperçu rapide des derniers dossiers élèves</CardDescription></div>
                      <Button variant="outline" size="sm" onClick={() => navigate(ROUTE_PATHS.STUDENTS)}>Voir tout</Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {recentStudents.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Élève</th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Classe</th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Statut</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentStudents.map((student) => (
                              <tr key={student.id} className="border-b border-border hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`${ROUTE_PATHS.STUDENTS}/${student.id}`)}>
                                <td className="py-3 px-4 text-sm font-medium">{formatStudentName(student)}</td>
                                <td className="py-3 px-4 text-sm text-muted-foreground">{student.classId}</td>
                                <td className="py-3 px-4 text-sm"><Badge variant={student.status === 'actif' ? 'default' : 'secondary'}>{student.status}</Badge></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>Aucun élève disponible.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />Rappels éducateur</CardTitle>
                    <CardDescription>Actions recommandées pour la journée</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { icon: FileSpreadsheet, label: 'Fiches de notes vierges', desc: 'Imprimer les relevés pour la saisie manuelle des enseignants.', tab: 'fiche_notes' },
                      { icon: CalendarCheck, label: 'Absences du jour', desc: 'Vérifier et contacter les parents.', tab: 'absences' },
                      { icon: Clock, label: 'Retards', desc: 'Traiter les retards signalés.', tab: 'retards' },
                      { icon: Users, label: 'Présences profs', desc: 'Voir les profs non pointés.', tab: 'presences_staff' },
                    ].map(item => (
                      <div key={item.tab} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/80 transition" onClick={() => setActiveTab(item.tab)}>
                        <item.icon className="h-5 w-5 text-primary mt-0.5" />
                        <div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                      </div>
                    ))}
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/80 transition" onClick={openReminderList}>
                      <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between"><p className="text-sm font-medium">Relances scolarité</p><Badge variant="secondary">{pendingPayments.length}</Badge></div>
                        <p className="text-xs text-muted-foreground">{pendingPayments.length} paiement(s) en attente.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

        </Tabs>
      </div>

      {/* Dialog ouverture dossier social */}
      <Dialog open={socialDialog} onOpenChange={setSocialDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Heart className="h-5 w-5 text-pink-600" />Ouvrir un dossier social</DialogTitle>
            <DialogDescription>Enregistrer une situation necessitant un suivi social.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Eleve concerne</Label>
              <Select value={socialForm.studentId} onValueChange={v => setSocialForm(f => ({ ...f, studentId: v }))}>
                <SelectTrigger><SelectValue placeholder="Choisir un eleve" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {allStudents.map(s => (
                    <SelectItem key={s.id} value={s.id}>{formatStudentName(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Situation</Label>
                <Select value={socialForm.situation} onValueChange={v => setSocialForm(f => ({ ...f, situation: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['precarite', 'maladie', 'deuil', 'violence_domestique', 'handicap', 'difficulte_scolaire', 'abandon_parental', 'autre'].map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Priorite</Label>
                <Select value={socialForm.priorite} onValueChange={v => setSocialForm(f => ({ ...f, priorite: v as 'faible' | 'moyenne' | 'urgente' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="faible">Faible</SelectItem>
                    <SelectItem value="moyenne">Moyenne</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Plan de suivi (optionnel)</Label>
              <Textarea rows={2} placeholder="Actions prevues, contacts, orientations..." value={socialForm.suivi} onChange={e => setSocialForm(f => ({ ...f, suivi: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSocialDialog(false)}>Annuler</Button>
            <Button onClick={handleOuvrirDossier} className="gap-2 bg-pink-600 hover:bg-pink-700">
              <Heart className="h-4 w-4" />Ouvrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog ajout note de suivi */}
      <Dialog open={!!socialNoteDialog} onOpenChange={open => { if (!open) setSocialNoteDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5 text-pink-600" />Ajouter une note de suivi</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Textarea rows={4} placeholder="Note de suivi..." value={socialNoteText} onChange={e => setSocialNoteText(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSocialNoteDialog(null)}>Annuler</Button>
            <Button onClick={() => socialNoteDialog && handleAjouterNote(socialNoteDialog)} className="gap-2">
              <CheckCircle className="h-4 w-4" />Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog signalement incident */}
      <Dialog open={incidentDialog} onOpenChange={setIncidentDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-red-600" />Signaler un incident</DialogTitle>
            <DialogDescription>Categoriser et enregistrer un incident disciplinaire ou de securite.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Eleve concerne</Label>
                <Select value={incidentForm.studentId} onValueChange={v => setIncidentForm(f => ({ ...f, studentId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Choisir un eleve" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {allStudents.map(s => (
                      <SelectItem key={s.id} value={s.id}>{formatStudentName(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Type d'incident</Label>
                <Select value={incidentForm.type} onValueChange={v => setIncidentForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['comportement', 'violence', 'vol', 'fraude', 'insolence', 'absence_non_justifiee', 'autre'].map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Gravite</Label>
                <Select value={incidentForm.severity} onValueChange={v => setIncidentForm(f => ({ ...f, severity: v as 'mineur' | 'moyen' | 'grave' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mineur">Mineur</SelectItem>
                    <SelectItem value="moyen">Moyen</SelectItem>
                    <SelectItem value="grave">Grave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea rows={3} placeholder="Decrivez les faits observes..." value={incidentForm.description} onChange={e => setIncidentForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Mesure prise (optionnel)</Label>
              <Input placeholder="ex: convocation, avertissement, exclusion..." value={incidentForm.actionTaken} onChange={e => setIncidentForm(f => ({ ...f, actionTaken: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIncidentDialog(false)}>Annuler</Button>
            <Button onClick={handleEnregistrerIncident} className="gap-2">
              <FileWarning className="h-4 w-4" />Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog notification parent */}
      <Dialog open={!!notifDialog} onOpenChange={open => { if (!open) setNotifDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-orange-600" />Notifier le parent</DialogTitle>
            <DialogDescription>
              {notifDialog ? `${formatStudentName(notifDialog.student)}` : ''}
              {notifDialog?.student.parentPhone && <span className="ml-2 text-muted-foreground text-xs">{notifDialog.student.parentPhone}</span>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Canal</Label>
              <Select value={notifCanal} onValueChange={v => setNotifCanal(v as 'sms' | 'whatsapp' | 'email')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Message</Label>
              <Textarea rows={5} value={notifMessage} onChange={e => setNotifMessage(e.target.value)} />
            </div>
            {notifCanal !== 'email' && notifDialog?.student.parentPhone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />Sera envoye a : {notifDialog.student.parentPhone}
              </p>
            )}
            {notifCanal === 'email' && notifDialog?.student.parentEmail && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />Sera envoye a : {notifDialog.student.parentEmail}
              </p>
            )}
            {notifCanal === 'email' && !notifDialog?.student.parentEmail && (
              <p className="text-xs text-red-600">Aucun email parent enregistre.</p>
            )}
            {notifCanal !== 'email' && !notifDialog?.student.parentPhone && (
              <p className="text-xs text-red-600">Aucun telephone parent enregistre.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifDialog(null)}>Annuler</Button>
            <Button onClick={handleEnvoyerNotif} className="gap-2">
              <Send className="h-4 w-4" />Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog retard */}
      <Dialog open={!!retardDialog} onOpenChange={open => { if (!open) setRetardDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-amber-600" />Traiter le retard</DialogTitle>
            <DialogDescription>{retardDialog ? `${formatStudentName(retardDialog.student)}` : ''}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Heure d'arrivée</Label>
              <Input type="time" value={retardDialog?.heure ?? ''} onChange={e => setRetardDialog(prev => prev ? { ...prev, heure: e.target.value } : null)} />
            </div>
            <div className="p-3 rounded-lg text-sm bg-muted/50">
              {retardDialog && (() => {
                const [h, m] = retardDialog.heure.split(':').map(Number);
                const minutes = h * 60 + m;
                return minutes <= (8 * 60 + 15)
                  ? <span className="text-green-700 font-medium">✓ ≤08h15 — Retard excusé</span>
                  : <span className="text-red-700 font-medium">⚠ &gt;08h15 — Sera exclu(e) du cours</span>;
              })()}
            </div>
            <div className="space-y-1">
              <Label>Observation (optionnel)</Label>
              <Input placeholder="ex: transport, pluie..." value={retardNote} onChange={e => setRetardNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRetardDialog(null)}>Annuler</Button>
            <Button onClick={handleValiderRetard}>Valider</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reminderDialogOpen} onOpenChange={(open) => { setReminderDialogOpen(open); if (!open) setReminderStep('list'); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{reminderStep === 'list' ? 'Relances de scolarité' : 'Composer une relance'}</DialogTitle>
            <DialogDescription>
              {reminderStep === 'list'
                ? 'Liste des paiements en attente pour lesquels une relance peut être envoyée.'
                : selectedReminderStudent
                  ? `Relance pour ${formatStudentName(selectedReminderStudent)}`
                  : 'Composer une relance'}
            </DialogDescription>
          </DialogHeader>

          {reminderStep === 'list' ? (
            <div className="space-y-4">
              {pendingPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Aucun paiement en attente.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Élève</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Classe</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Montant</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Type</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Échéance</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingPayments.map((payment) => {
                        const student = allStudents.find((s) => s.id === payment.studentId);
                        if (!student) return null;
                        return (
                          <tr key={payment.id} className="border-b border-border hover:bg-muted/50">
                            <td className="py-2 px-3 text-sm font-medium">{formatStudentName(student)}</td>
                            <td className="py-2 px-3 text-sm text-muted-foreground">{getClassName(student.classId)}</td>
                            <td className="py-2 px-3 text-sm font-mono">{formatCurrency(payment.amount)}</td>
                            <td className="py-2 px-3 text-sm text-muted-foreground">{payment.type}</td>
                            <td className="py-2 px-3 text-sm text-muted-foreground">{payment.dueDate ? formatDate(payment.dueDate) : '-'}</td>
                            <td className="py-2 px-3 text-sm">
                              <Button size="sm" onClick={() => openReminderCompose(payment)}>Relancer</Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setReminderDialogOpen(false)}>Fermer</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>Canal de relance</Label>
                  <Select value={reminderChannel} onValueChange={setReminderChannel}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choisir un canal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Message</Label>
                  <Textarea
                    value={reminderMessage}
                    onChange={(e) => setReminderMessage(e.target.value)}
                    rows={6}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReminderStep('list')}>Retour</Button>
                <Button onClick={handleSendReminder} disabled={!reminderMessage.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog Édition Billet d'Entrée Retard ── */}
      <Dialog open={!!retardBilletDialog} onOpenChange={open => { if (!open) setRetardBilletDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Ticket className="h-5 w-5 text-amber-600" />
              Éditer un Billet d'Entrée (Retard)
            </DialogTitle>
            <DialogDescription className="text-xs">
              {retardBilletDialog && (
                <span>
                  Élève : <strong>{formatStudentName(retardBilletDialog)}</strong> · Matricule : {retardBilletDialog.matricule || 'N/A'}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Élève concerné(e)</Label>
              <Select
                value={retardBilletDialog ? String(retardBilletDialog.id) : ''}
                onValueChange={v => {
                  const s = allStudents.find(st => String(st.id) === v);
                  if (s) setRetardBilletDialog(s);
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Changer d'élève" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {allStudents.map(s => (
                    <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                      {formatStudentName(s)} ({getClassName(s.classId)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Heure d'arrivée constatée</Label>
                <Input
                  type="text"
                  value={retardHeureArrivee}
                  onChange={e => setRetardHeureArrivee(e.target.value)}
                  className="h-8 text-xs font-mono font-bold text-amber-900 bg-amber-50/50"
                  placeholder="ex: 08h15"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Décision Vie Scolaire</Label>
                <Select value={retardDecision} onValueChange={setRetardDecision}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Autorisé(e) à intégrer le cours" className="text-xs text-green-700 font-semibold">
                      ✓ Autorisé(e) en classe
                    </SelectItem>
                    <SelectItem value="Admis sous réserve d'un justificatif" className="text-xs text-amber-700 font-semibold">
                      ⚠ Justificatif requis
                    </SelectItem>
                    <SelectItem value="Exclu(e) pour la première heure" className="text-xs text-red-700 font-semibold">
                      ✕ Exclu(e) 1ère heure
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Motif du retard</Label>
              <Select value={retardMotif} onValueChange={setRetardMotif}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Retard de transport / embouteillage" className="text-xs">Retard de transport / embouteillage</SelectItem>
                  <SelectItem value="Panne de véhicule / accident" className="text-xs">Panne de véhicule / accident</SelectItem>
                  <SelectItem value="Problème de santé / malaise matinal" className="text-xs">Problème de santé / malaise matinal</SelectItem>
                  <SelectItem value="Imprévu familial majeur" className="text-xs">Imprévu familial majeur</SelectItem>
                  <SelectItem value="Convocation administrative / Vie scolaire" className="text-xs">Convocation administrative / Vie scolaire</SelectItem>
                  <SelectItem value="Intempéries / Pluie" className="text-xs">Intempéries / Pluie</SelectItem>
                  <SelectItem value="Autre motif signalé" className="text-xs">Autre motif signalé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setRetardBilletDialog(null)}>
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handlePrintRetardBilletConfirm}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimer Billet d'Entrée
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Édition Billet de Repos Maladie ── */}
      <Dialog open={maladieDialog} onOpenChange={setMaladieDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Stethoscope className="h-5 w-5 text-teal-600" />
              Éditer une Autorisation de Repos Médical
            </DialogTitle>
            <DialogDescription className="text-xs">
              Délivrance d'un billet officiel de dispense/repos pour raisons médicales constatées à l'infirmerie.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Élève concerné(e)</Label>
              <Select
                value={selectedMaladieStudent ? String(selectedMaladieStudent.id) : ''}
                onValueChange={v => {
                  const s = allStudents.find(st => String(st.id) === v);
                  if (s) {
                    setSelectedMaladieStudent(s);
                    setMaladieParentTel(s.parentPhone || (s as any).parentTel || '');
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Choisir un élève" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {allStudents.map(s => (
                    <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                      {formatStudentName(s)} — {getClassName(s.classId)} ({s.matricule || 'N/A'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Durée / Période autorisée</Label>
                <Select value={maladiePeriode} onValueChange={setMaladiePeriode}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Le reste de la journée (repos à domicile)" className="text-xs">Le reste de la journée</SelectItem>
                    <SelectItem value="1 jour (repos à domicile)" className="text-xs">1 jour ouvrable</SelectItem>
                    <SelectItem value="2 jours (repos à domicile)" className="text-xs">2 jours ouvrables</SelectItem>
                    <SelectItem value="3 jours (avec certificat médical requis)" className="text-xs">3 jours ouvrables</SelectItem>
                    <SelectItem value="Dispense d'Éducation Physique (EPS) 1 semaine" className="text-xs">Dispense EPS (1 semaine)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Heure de départ / Constat</Label>
                <Input
                  type="text"
                  value={maladieHeureDepart}
                  onChange={e => setMaladieHeureDepart(e.target.value)}
                  className="h-8 text-xs font-mono font-semibold"
                  placeholder="ex: 10h30"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Motif / Symptômes observés</Label>
              <Input
                value={maladieMotif}
                onChange={e => setMaladieMotif(e.target.value)}
                placeholder="ex: Forte fièvre, céphalées aiguës, nausées, malaise..."
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Recommandations médicales / Conduite à tenir</Label>
              <Input
                value={maladieRecommandations}
                onChange={e => setMaladieRecommandations(e.target.value)}
                placeholder="ex: Repos complet, réhydratation, consultation médicale..."
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Parent / Tuteur contacté</Label>
                <Select value={maladieParentPrevenu} onValueChange={setMaladieParentPrevenu}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Oui (Tuteur légal informé par téléphone)" className="text-xs">Oui (Informé)</SelectItem>
                    <SelectItem value="Oui (Parent venu récupérer l'élève)" className="text-xs">Oui (Présent sur place)</SelectItem>
                    <SelectItem value="En attente de confirmation parentale" className="text-xs">En attente de réponse</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Téléphone parent</Label>
                <Input
                  value={maladieParentTel}
                  onChange={e => setMaladieParentTel(e.target.value)}
                  placeholder="ex: +225 07 00 00 00"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setMaladieDialog(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleCreateAndPrintMaladie}
              className="bg-teal-700 hover:bg-teal-800 text-white gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              Émettre & Imprimer Billet de Repos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
