import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/lib/apiClient';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Printer,
  Download,
  Search,
  Users,
  GraduationCap,
  School as SchoolIcon,
  User,
  Calendar,
  Filter,
  ClipboardList,
  FileText,
  FileSpreadsheet,
  Loader2,
  Camera,
  Edit,
  Save,
  X,
  BookOpen,
  Home,
  Upload,
  ArrowLeftRight,
  UserMinus,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  formatDate,
  calculateAge,
  getStatusBadgeColor,
  formatCurrency,
  ROUTE_PATHS,
  type Student,
  type ClassRoom,
  type School,
  type Staff,
  formatStudentName,
} from '@/lib/index';
import {
  downloadClassListPDF,
  downloadClassListExcel,
  printClassList,
  resolveSchoolDetailsForClass,
} from '@/lib/classListPrinter';
import { printFicheNotesManuelle } from '@/lib/ficheNotesManuellePrinter';

interface CycleOption {
  id: number;
  code: string;
  libelle: string;
}

interface LevelOption {
  id: number;
  code: string;
  libelle: string;
  cycle_id: number;
}

export default function ClassLists() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [cycles, setCycles] = useState<CycleOption[]>([]);
  const [levels, setLevels] = useState<LevelOption[]>([]);

  const userEcoleId = localStorage.getItem('user_ecole_id');
  const userRole = localStorage.getItem('user_role');
  const initialSchoolFilter = (userEcoleId && userEcoleId !== 'null' && userEcoleId !== 'undefined' && !['admin', 'superuser', 'direction_fondation', 'comptable', 'caisse'].includes(userRole || ''))
    ? userEcoleId
    : 'all';

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSchool, setSelectedSchool] = useState<string>(initialSchoolFilter);
  const [selectedCycle, setSelectedCycle] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Levels filtered by selected cycle for the niveau dropdown
  const filteredLevelOptions = useMemo(() => {
    if (selectedCycle === 'all') return levels;
    const cyObj = cycles.find(c => String(c.id) === selectedCycle || c.code.toLowerCase() === selectedCycle.toLowerCase() || c.libelle.toLowerCase() === selectedCycle.toLowerCase());
    const cyId = cyObj ? cyObj.id : Number(selectedCycle);
    return levels.filter((l) => l.cycle_id === cyId || String(l.cycle_id) === selectedCycle);
  }, [levels, cycles, selectedCycle]);

  // Reset niveau when cycle changes
  const handleCycleChange = (val: string) => {
    setSelectedCycle(val);
    setSelectedLevel('all');
  };

  const [educateurRestrictions, setEducateurRestrictions] = useState<{
    has_restrictions: boolean;
    cycle_ids: number[];
    niveau_ids: number[];
  } | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');


  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [classesData, schoolsData, staffData, cyclesData, levelsData] = await Promise.all([
          apiClient.getClasses().catch((err) => {
            console.error('Failed to fetch classes', err);
            return [] as ClassRoom[];
          }),
          apiClient.getSchools().catch((err) => {
            console.error('Failed to fetch schools', err);
            return [] as School[];
          }),
          apiClient.getStaff().catch((err) => {
            console.error('Failed to fetch staff', err);
            return [] as Staff[];
          }),
          apiClient.getCycles().catch((err) => {
            console.error('Failed to fetch cycles', err);
            return [] as CycleOption[];
          }),
          apiClient.getLevels().catch((err) => {
            console.error('Failed to fetch levels', err);
            return [] as LevelOption[];
          }),
        ]);

        const userRole = localStorage.getItem('user_role') || '';
        const username = localStorage.getItem('username') || '';
        const currentStaff = staffData.find(
          (s) => s.email === username || String(s.id) === String(username)
        );

        // Restrictions éducateurs : filtrer cycles, niveaux et classes
        let allowedCycleIds: number[] = [];
        let allowedNiveauIds: number[] = [];
        let authorizedClasses = classesData;

        if (userRole === 'educateur') {
          try {
            const attrData = await apiClient.getMyEducateurAttributions();
            if (attrData && attrData.has_restrictions) {
              setEducateurRestrictions(attrData);
              allowedCycleIds = attrData.cycle_ids;
              allowedNiveauIds = attrData.niveau_ids;
              // Filtrer les classes selon les attributions
              authorizedClasses = classesData.filter((c: any) => {
                if (allowedNiveauIds.length > 0) {
                  return c.niveau_id && allowedNiveauIds.includes(Number(c.niveau_id));
                }
                if (allowedCycleIds.length > 0) {
                  return c.cycle_id && allowedCycleIds.includes(Number(c.cycle_id));
                }
                return true;
              });
            }
          } catch {
            // pas de restriction si erreur
          }
        }

        setClasses(authorizedClasses);
        setSchools(schoolsData);
        setStaff(staffData);
        // Filtrer cycles et niveaux disponibles pour l'éducateur
        setCycles(allowedCycleIds.length > 0 ? cyclesData.filter(cy => allowedCycleIds.includes(cy.id)) : cyclesData);
        setLevels(allowedNiveauIds.length > 0 ? levelsData.filter(lv => allowedNiveauIds.includes(lv.id)) :
                  allowedCycleIds.length > 0 ? levelsData.filter(lv => allowedCycleIds.includes(lv.cycle_id)) : levelsData);

        // Pre-select the user's school for non-foundation/admin/accounting roles
        if (currentStaff && !['direction_fondation', 'admin', 'superuser', 'comptable', 'caisse'].includes(userRole || '')) {
          setSelectedSchool(String(currentStaff.schoolId) || 'all');
        }
      } catch (err) {
        console.error(err);
        toast({
          variant: 'destructive',
          title: 'Erreur de chargement',
          description: 'Impossible de charger les données des classes.',
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [toast]);


  // Filter classes based on current filters
  const filteredClasses = useMemo(() => {
    let result = [...classes];

    if (selectedSchool !== 'all') {
      const sch = schools.find((s: any) => String(s.id || s.IDETABLISSEMENT) === selectedSchool);
      result = result.filter((c: any) => 
        String(c.schoolId) === selectedSchool ||
        String(c.ecole_id) === selectedSchool ||
        (sch && (sch.ET_CODEETABLISSEMENT || sch.code) && (c.ET_CODEETABLISSEMENT === (sch.ET_CODEETABLISSEMENT || sch.code)))
      );
    }

    if (selectedCycle !== 'all') {
      const selectedCycleObj = cycles.find(cy => String(cy.id) === selectedCycle || cy.code.toLowerCase() === selectedCycle.toLowerCase() || cy.libelle.toLowerCase() === selectedCycle.toLowerCase());
      const cyId = selectedCycleObj ? String(selectedCycleObj.id) : selectedCycle;
      const cyCode = selectedCycleObj ? selectedCycleObj.code.toLowerCase() : selectedCycle.toLowerCase();
      const cyLib = selectedCycleObj ? selectedCycleObj.libelle.toLowerCase() : selectedCycle.toLowerCase();

      result = result.filter((c: any) => {
        if (c.cycle_id != null && String(c.cycle_id) === cyId) return true;
        const cCycle = String(c.cycle || c.CY_LIBELLECYCLE || c.ET_CYCLE || '').toLowerCase();
        if (cCycle && (cCycle === cyCode || cCycle === cyLib || cCycle.includes(cyCode) || cCycle.includes(cyLib))) return true;
        return false;
      });
    }

    if (selectedLevel !== 'all') {
      const selectedLevelObj = levels.find(lv => String(lv.id) === selectedLevel || lv.code.toLowerCase() === selectedLevel.toLowerCase() || lv.libelle.toLowerCase() === selectedLevel.toLowerCase());
      const lvId = selectedLevelObj ? String(selectedLevelObj.id) : selectedLevel;
      const lvCode = selectedLevelObj ? selectedLevelObj.code.toLowerCase() : selectedLevel.toLowerCase();
      const lvLib = selectedLevelObj ? selectedLevelObj.libelle.toLowerCase() : selectedLevel.toLowerCase();

      result = result.filter((c: any) => {
        if (c.niveau_id != null && String(c.niveau_id) === lvId) return true;
        const cNiv = String(c.niveau || c.CE_LIBELLENIVEAU || c.NI_CODENIVEAU || '').toLowerCase();
        if (cNiv && (cNiv === lvCode || cNiv === lvLib || cNiv.includes(lvCode) || cNiv.includes(lvLib))) return true;
        return false;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.niveau && c.niveau.toLowerCase().includes(q)) ||
          (c.cycle && c.cycle.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [classes, schools, cycles, levels, selectedSchool, selectedCycle, selectedLevel, searchQuery]);

  // Auto-select first class when filters change
  useEffect(() => {
    if (filteredClasses.length > 0) {
      if (!selectedClassId || !filteredClasses.find((c) => c.id === selectedClassId)) {
        setSelectedClassId(filteredClasses[0].id);
      }
    } else {
      setSelectedClassId('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredClasses]);

  // Load roster for selected class
  useEffect(() => {
    const loadRoster = async () => {
      if (!selectedClassId) {
        setStudents([]);
        return;
      }

      setRosterLoading(true);
      try {
        const data = await apiClient.getStudents({ classe_id: Number(selectedClassId) });
        setStudents(data);
      } catch (err) {
        console.error(err);
        toast({
          variant: 'destructive',
          title: 'Erreur de chargement',
          description: 'Impossible de charger la liste des élèves pour cette classe.',
        });
        setStudents([]);
      } finally {
        setRosterLoading(false);
      }
    };

    loadRoster();
  }, [selectedClassId, toast]);

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) || null,
    [classes, selectedClassId]
  );

  const selectedTeacher = useMemo(
    () => staff.find((s) => s.id === selectedClass?.teacherId) || null,
    [staff, selectedClass]
  );

  const selectedSchoolInfo = useMemo(
    () => schools.find((s) => s.id === selectedClass?.schoolId) || null,
    [schools, selectedClass]
  );

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.toLowerCase();
    return students.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.matricule.toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const boysCount = filteredStudents.filter((s) => s.gender === 'M').length;
  const girlsCount = filteredStudents.filter((s) => s.gender === 'F').length;

  const totalClassCount = filteredClasses.length;
  const totalStudentCount = filteredClasses.reduce((sum, c) => sum + (c.studentCount || 0), 0);
  const fullClassesCount = filteredClasses.filter(
    (c) => c.capacity > 0 && (c.studentCount / c.capacity) >= 0.9
  ).length;

  const [exportingExcel, setExportingExcel] = useState(false);

  // ──── Student Edit Popup State ────
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editActiveTab, setEditActiveTab] = useState<'identification' | 'scolarite' | 'parents' | 'residence'>('identification');
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [editForm, setEditForm] = useState({
    // Identification
    matricule: '',
    nom: '',
    prenom: '',
    genre: 'M',
    dateNaissance: '',
    lieuNaissance: '',
    nationalite: 'Ivoirienne',
    extraitNo: '',
    extraitDate: '',
    extraitLieu: '',
    handicap: 'NON',
    autresHandicap: '',
    photo: '' as string | undefined,

    // Scolarité
    ecoleOrigine: '',
    classePrecedente: '',
    noTable: '',
    session: '',
    matriculeNational: '',
    niveauArabe: '',
    classeASuivre: '',
    redoublant: 'NON',
    statutAffecte: 'Non Affecté',
    priseEnCharge: false,
    originePriseEnCharge: '',
    statut: 'actif' as string,

    // Parents
    pereNom: '',
    pereProfession: '',
    pereBoitePostale: '',
    perePhone: '',
    pereEmail: '',
    mereNom: '',
    mereProfession: '',
    mereBoitePostale: '',
    merePhone: '',
    mereEmail: '',
    tuteurNom: '',
    tuteurProfession: '',
    tuteurBoitePostale: '',
    tuteurPhone: '',
    tuteurEmail: '',
    scolariteNom: '',
    scolariteProfession: '',
    scolariteBoitePostale: '',
    scolaritePhone: '',
    scolariteEmail: '',

    // Résidence
    lieuResidence: 'pere_mere',
    commune: '',
    quartier: '',
    lot: '',
    adresseText: '',
    telephonePrincipal: '',
    emailPrincipal: '',
    notesSante: '',
  });

  const handleEditChange = (field: string, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleOpenEditDialog = async (student: Student) => {
    setEditingStudent(student);
    setEditActiveTab('identification');
    setEditDialogOpen(true);

    const formatDob = (d: any) => {
      if (!d) return '';
      if (typeof d === 'string') return d.split('T')[0];
      try { return new Date(d).toISOString().split('T')[0]; } catch { return ''; }
    };

    // Pre-populate immediately with available student data
    const studentAny = student as any;
    setEditForm({
      matricule: student.matricule || '',
      nom: student.lastName || studentAny.nom || '',
      prenom: student.firstName || studentAny.prenom || '',
      genre: student.gender || studentAny.genre || 'M',
      dateNaissance: formatDob(student.dateNaissance || student.dateOfBirth),
      lieuNaissance: studentAny.AU_LIEU_NAISSANCE || studentAny.lieu_naissance || '',
      nationalite: studentAny.AU_NATIONALITE || studentAny.nationalite || 'Ivoirienne',
      extraitNo: studentAny.AU_NUMEROEXTRAITNAISSANCE || studentAny.extrait_no || '',
      extraitDate: formatDob(studentAny.AU_DATEETABLISSEMENTEXTRAIT || studentAny.extrait_date),
      extraitLieu: studentAny.AU_LIEUETABLISSEMENTEXTRAIT || studentAny.extrait_lieu || '',
      handicap: studentAny.AU_HANDICAP || studentAny.has_handicap ? (studentAny.handicap_precision || studentAny.AU_AUTRESHANDICAP || 'moteur') : 'NON',
      autresHandicap: studentAny.AU_AUTRESHANDICAP || studentAny.handicap_precision || '',
      photo: student.photo || studentAny.photoUrl || undefined,

      ecoleOrigine: studentAny.AU_ETABLISSEMENTPRECEDENT || '',
      classePrecedente: studentAny.AU_CLASSEPRECEDENTE || studentAny.classePrecedente || '',
      noTable: studentAny.AU_NUM_AFFECTATION || '',
      session: studentAny.session || '',
      matriculeNational: studentAny.matriculeNational || studentAny.matricule_national || studentAny.AU_MATRICULENATIONAL || '',
      niveauArabe: studentAny.niveauArabe || studentAny.niveau_arabe || '',
      classeASuivre: studentAny.className || studentAny.level || '',
      redoublant: studentAny.redoublant === true || studentAny.redoublant === 'OUI' ? 'OUI' : 'NON',
      statutAffecte: studentAny.statutAffecte || studentAny.statut_orientation || studentAny.statutOrientation || 'Non Affecté',
      priseEnCharge: Boolean(studentAny.priseEnCharge || studentAny.prise_en_charge),
      originePriseEnCharge: studentAny.originePriseEnCharge || studentAny.origine_prise_en_charge || '',
      statut: student.status || studentAny.statut || 'actif',

      pereNom: studentAny.AU_PERENOMPRENOMS || studentAny.pere_nom || '',
      pereProfession: studentAny.AU_PEREPROFESSION || studentAny.pere_profession || '',
      pereBoitePostale: studentAny.pere_boite_postale || '',
      perePhone: studentAny.AU_PERECONTACTS || studentAny.pere_phone || '',
      pereEmail: studentAny.pere_email || '',
      mereNom: studentAny.AU_MERENOMPRENOMS || studentAny.mere_nom || '',
      mereProfession: studentAny.AU_MEREPROFESSION || studentAny.mere_profession || '',
      mereBoitePostale: studentAny.mere_boite_postale || '',
      merePhone: studentAny.AU_MERECONTACTS || studentAny.mere_phone || '',
      mereEmail: studentAny.mere_email || '',
      tuteurNom: studentAny.AU_TUTEURLEGAL || studentAny.parentName || '',
      tuteurProfession: studentAny.tuteur_profession || '',
      tuteurBoitePostale: studentAny.tuteur_boite_postale || '',
      tuteurPhone: studentAny.AU_TUTEURLEGALCONTACTS || studentAny.tuteur_phone || '',
      tuteurEmail: studentAny.tuteur_email || '',
      scolariteNom: studentAny.scolarite_nom || '',
      scolariteProfession: studentAny.scolarite_profession || '',
      scolariteBoitePostale: studentAny.scolarite_boite_postale || '',
      scolaritePhone: studentAny.scolarite_phone || '',
      scolariteEmail: studentAny.scolarite_email || '',

      lieuResidence: studentAny.lieu_residence || 'pere_mere',
      commune: studentAny.AU_COMMUNE || '',
      quartier: studentAny.AU_QUARTIER || '',
      lot: studentAny.AU_LOT || studentAny.lot || '',
      adresseText: studentAny.AU_ADRESSE_GEO || '',
      telephonePrincipal: student.parentPhone || studentAny.AU_CONTACTS || '',
      emailPrincipal: student.parentEmail || studentAny.AU_E_MAIL || '',
      notesSante: student.notesSante || studentAny.notes_sante || '',
    });

    // Then try to fetch full details in background if available
    try {
      const fullStudent: any = await apiClient.getStudent(student.id);
      if (fullStudent) {
        setEditForm(prev => ({
          ...prev,
          matricule: fullStudent.matricule || prev.matricule,
          nom: fullStudent.lastName || fullStudent.nom || prev.nom,
          prenom: fullStudent.firstName || fullStudent.prenom || prev.prenom,
          genre: fullStudent.gender || fullStudent.genre || prev.genre,
          dateNaissance: formatDob(fullStudent.dateNaissance || fullStudent.dateOfBirth) || prev.dateNaissance,
          lieuNaissance: fullStudent.AU_LIEU_NAISSANCE || fullStudent.lieu_naissance || prev.lieuNaissance,
          nationalite: fullStudent.AU_NATIONALITE || fullStudent.nationalite || prev.nationalite,
          extraitNo: fullStudent.AU_NUMEROEXTRAITNAISSANCE || fullStudent.extrait_no || prev.extraitNo,
          extraitDate: formatDob(fullStudent.AU_DATEETABLISSEMENTEXTRAIT || fullStudent.extrait_date) || prev.extraitDate,
          extraitLieu: fullStudent.AU_LIEUETABLISSEMENTEXTRAIT || fullStudent.extrait_lieu || prev.extraitLieu,
          handicap: fullStudent.AU_HANDICAP || fullStudent.has_handicap ? (fullStudent.handicap_precision || fullStudent.AU_AUTRESHANDICAP || 'moteur') : prev.handicap,
          autresHandicap: fullStudent.AU_AUTRESHANDICAP || fullStudent.handicap_precision || prev.autresHandicap,
          photo: fullStudent.photo || fullStudent.photoUrl || prev.photo,

          ecoleOrigine: fullStudent.AU_ETABLISSEMENTPRECEDENT || prev.ecoleOrigine,
          classePrecedente: fullStudent.AU_CLASSEPRECEDENTE || fullStudent.classePrecedente || prev.classePrecedente,
          noTable: fullStudent.AU_NUM_AFFECTATION || prev.noTable,
          session: fullStudent.session || prev.session,
          matriculeNational: fullStudent.matriculeNational || fullStudent.matricule_national || fullStudent.AU_MATRICULENATIONAL || prev.matriculeNational,
          niveauArabe: fullStudent.niveauArabe || fullStudent.niveau_arabe || prev.niveauArabe,
          classeASuivre: fullStudent.className || fullStudent.level || prev.classeASuivre,
          redoublant: fullStudent.redoublant === true || fullStudent.redoublant === 'OUI' ? 'OUI' : prev.redoublant,
          statutAffecte: fullStudent.statutAffecte || fullStudent.statut_orientation || fullStudent.statutOrientation || prev.statutAffecte,
          priseEnCharge: Boolean(fullStudent.priseEnCharge || fullStudent.prise_en_charge),
          originePriseEnCharge: fullStudent.originePriseEnCharge || fullStudent.origine_prise_en_charge || prev.originePriseEnCharge,
          statut: fullStudent.status || fullStudent.statut || prev.statut,

          pereNom: fullStudent.AU_PERENOMPRENOMS || fullStudent.pere_nom || prev.pereNom,
          pereProfession: fullStudent.AU_PEREPROFESSION || fullStudent.pere_profession || prev.pereProfession,
          pereBoitePostale: fullStudent.pere_boite_postale || prev.pereBoitePostale,
          perePhone: fullStudent.AU_PERECONTACTS || fullStudent.pere_phone || prev.perePhone,
          pereEmail: fullStudent.pere_email || prev.pereEmail,
          mereNom: fullStudent.AU_MERENOMPRENOMS || fullStudent.mere_nom || prev.mereNom,
          mereProfession: fullStudent.AU_MEREPROFESSION || fullStudent.mere_profession || prev.mereProfession,
          mereBoitePostale: fullStudent.mere_boite_postale || prev.mereBoitePostale,
          merePhone: fullStudent.AU_MERECONTACTS || fullStudent.mere_phone || prev.merePhone,
          mereEmail: fullStudent.mere_email || prev.mereEmail,
          tuteurNom: fullStudent.AU_TUTEURLEGAL || fullStudent.parentName || prev.tuteurNom,
          tuteurProfession: fullStudent.tuteur_profession || prev.tuteurProfession,
          tuteurBoitePostale: fullStudent.tuteur_boite_postale || prev.tuteurBoitePostale,
          tuteurPhone: fullStudent.AU_TUTEURLEGALCONTACTS || fullStudent.tuteur_phone || prev.tuteurPhone,
          tuteurEmail: fullStudent.tuteur_email || prev.tuteurEmail,
          scolariteNom: fullStudent.scolarite_nom || prev.scolariteNom,
          scolariteProfession: fullStudent.scolarite_profession || prev.scolariteProfession,
          scolariteBoitePostale: fullStudent.scolarite_boite_postale || prev.scolariteBoitePostale,
          scolaritePhone: fullStudent.scolarite_phone || prev.scolaritePhone,
          scolariteEmail: fullStudent.scolarite_email || prev.scolariteEmail,

          lieuResidence: fullStudent.lieu_residence || prev.lieuResidence,
          commune: fullStudent.AU_COMMUNE || prev.commune,
          quartier: fullStudent.AU_QUARTIER || prev.quartier,
          lot: fullStudent.AU_LOT || fullStudent.lot || prev.lot,
          adresseText: fullStudent.AU_ADRESSE_GEO || prev.adresseText,
          telephonePrincipal: fullStudent.parentPhone || fullStudent.AU_CONTACTS || prev.telephonePrincipal,
          emailPrincipal: fullStudent.parentEmail || fullStudent.AU_E_MAIL || prev.emailPrincipal,
          notesSante: fullStudent.notesSante || fullStudent.notes_sante || prev.notesSante,
        }));
      }
    } catch (err) {
      console.warn("Could not load extended student details, using list data:", err);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'Photo trop volumineuse', description: 'La photo ne doit pas dépasser 5 Mo.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      handleEditChange('photo', base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveStudent = async () => {
    if (!editingStudent) return;

    if (!editForm.prenom || !editForm.nom || !editForm.dateNaissance) {
      toast({
        variant: 'destructive',
        title: 'Champs manquants',
        description: 'Veuillez remplir au minimum le Prénom, le Nom et la Date de naissance.',
      });
      setEditActiveTab('identification');
      return;
    }

    setEditLoading(true);
    try {
      const payload: any = {
        matricule: editForm.matricule,
        prenom: editForm.prenom,
        nom: editForm.nom,
        date_naissance: editForm.dateNaissance ? editForm.dateNaissance.split('T')[0] : null,
        genre: editForm.genre,
        statut: editForm.statut,
        notes_sante: editForm.notesSante || '',
        photo: editForm.photo || null,

        // Identification Ivoirienne
        AU_LIEU_NAISSANCE: editForm.lieuNaissance,
        AU_NATIONALITE: editForm.nationalite,
        AU_NUMEROEXTRAITNAISSANCE: editForm.extraitNo,
        AU_DATEETABLISSEMENTEXTRAIT: editForm.extraitDate && editForm.extraitDate.trim() ? editForm.extraitDate.split('T')[0] : null,
        AU_LIEUETABLISSEMENTEXTRAIT: editForm.extraitLieu,
        AU_HANDICAP: editForm.handicap !== 'NON',
        AU_AUTRESHANDICAP: editForm.handicap !== 'NON' ? (editForm.handicap === 'autre' ? editForm.autresHandicap : editForm.handicap) : '',

        // Scolarité antérieure
        AU_ETABLISSEMENTPRECEDENT: editForm.ecoleOrigine,
        AU_CLASSEPRECEDENTE: editForm.classePrecedente,
        AU_NUM_AFFECTATION: editForm.noTable,

        REDOUBLANT: editForm.redoublant === 'OUI',
        AU_TOP_AFFECTE: editForm.statutAffecte === 'Affecté' ? 1 : (editForm.statutAffecte === 'Réaffecté' ? 2 : 0),
        statut_orientation: editForm.statutAffecte,
        AU_STATUTPENSION: editForm.priseEnCharge ? 1 : 0,

        // Parents
        AU_PERENOMPRENOMS: editForm.pereNom,
        AU_PERECONTACTS: editForm.perePhone,
        AU_MERENOMPRENOMS: editForm.mereNom,
        AU_MERECONTACTS: editForm.merePhone,
        AU_TUTEURLEGAL: editForm.tuteurNom,
        AU_TUTEURLEGALCONTACTS: editForm.tuteurPhone,

        // Résidence
        AU_COMMUNE: editForm.commune,
        AU_QUARTIER: editForm.quartier,
        AU_LOT: editForm.lot,
        AU_ADRESSE_GEO: editForm.adresseText,
        AU_CONTACTS: editForm.telephonePrincipal || editForm.perePhone || editForm.merePhone,
        AU_E_MAIL: editForm.emailPrincipal || editForm.pereEmail || editForm.mereEmail,
      };

      await apiClient.updateStudent(editingStudent.id, payload);

      toast({
        title: 'Élève mis à jour',
        description: `Les informations de ${editForm.nom} ${editForm.prenom} ont été enregistrées avec succès.`,
      });

      // Refresh roster
      if (selectedClassId) {
        const data = await apiClient.getStudents({ classe_id: Number(selectedClassId) });
        setStudents(data);
      }

      setEditDialogOpen(false);
      setEditingStudent(null);
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Erreur de mise à jour',
        description: err.response?.data?.detail || "Impossible de mettre à jour les informations de l'élève.",
      });
    } finally {
      setEditLoading(false);
    }
  };

  const getTeacherName = (teacherId?: string) => {
    if (!teacherId) return 'Non assigné';
    const teacher = staff.find((s) => s.id === teacherId);
    return teacher ? `${formatStudentName(teacher)}` : 'Non assigné';
  };

  const getFillRate = (studentCount: number, capacity: number) => {
    if (!capacity) return 0;
    return Math.min(100, Math.round((studentCount / capacity) * 100));
  };

  const resolvedSchool = useMemo(() => {
    if (!selectedClass) return null;
    return resolveSchoolDetailsForClass(
      selectedClass.name,
      selectedClass.niveau,
      selectedClass.cycle,
      selectedSchoolInfo
    );
  }, [selectedClass, selectedSchoolInfo]);

  const handleDownloadExcel = () => {
    if (!selectedClass || filteredStudents.length === 0) return;
    try {
      setExportingExcel(true);
      downloadClassListExcel({
        classe: selectedClass,
        students: filteredStudents,
        school: selectedSchoolInfo,
        teacher: selectedTeacher,
      });
      toast({
        title: "Téléchargement Excel réussi",
        description: `Le fichier Excel (.xlsx) de la classe ${selectedClass.name} a été téléchargé.`,
      });
    } catch (err) {
      console.error("Erreur export Excel :", err);
      toast({
        variant: "destructive",
        title: "Erreur d'export Excel",
        description: "Impossible de générer le classeur Excel.",
      });
    } finally {
      setExportingExcel(false);
    }
  };

  const handlePrintOfficial = () => {
    if (!selectedClass || filteredStudents.length === 0) return;
    printClassList({
      classe: selectedClass,
      students: filteredStudents,
      school: selectedSchoolInfo,
      teacher: selectedTeacher,
    });
  };

  const handlePrintFicheNotesManuelle = () => {
    if (!selectedClass || filteredStudents.length === 0) return;
    printFicheNotesManuelle({
      classRoom: selectedClass,
      students: filteredStudents,
      school: selectedSchoolInfo,
      teacherName: selectedTeacher ? formatStudentName(selectedTeacher) : undefined,
    });
  };

  if (loading) {
    return (
      <Layout
        loading={true}
        loadingMessage="Chargement des listes de classes..."
        loadingSubmessage="Récupération des effectifs, classes et attributions"
      >
        <div />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 print:space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Listes de classe</h1>
            <p className="text-muted-foreground mt-1">
              Consultez et exportez les listes officielles d'élèves par classe (PDF & Excel).
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintOfficial}
              disabled={!selectedClass || filteredStudents.length === 0}
              className="font-semibold shadow-xs"
              title="Imprimer directement la liste de classe officielle au format A4"
            >
              <Printer className="mr-2 h-4 w-4 text-slate-700" />
              Imprimer
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintFicheNotesManuelle}
              disabled={!selectedClass || filteredStudents.length === 0}
              className="border-amber-500 text-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/50 font-semibold shadow-xs"
              title="Imprimer la fiche de relevé de notes vierge pour saisie manuelle des enseignants (modèle officiel)"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4 text-amber-600" />
              Fiche de notes manuelle
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadExcel}
              disabled={!selectedClass || filteredStudents.length === 0 || exportingExcel}
              className="border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 font-semibold shadow-xs"
              title="Télécharger la liste sous format tableur Excel (.xlsx)"
            >
              {exportingExcel ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Export Excel...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                  Télécharger Excel (.xlsx)
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedClass?.id) {
                  navigate(`${ROUTE_PATHS.STUDENT_TRANSFER}?sourceClassId=${selectedClass.id}`);
                } else {
                  navigate(ROUTE_PATHS.STUDENT_TRANSFER);
                }
              }}
              className="border-indigo-500 text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/50 font-semibold shadow-xs"
              title="Transférer un ou plusieurs élèves vers une autre classe"
            >
              <ArrowLeftRight className="mr-2 h-4 w-4 text-indigo-600" />
              Transférer des élèves
            </Button>
          </div>
        </div>

        {/* Print-only header */}
        <div className="hidden print:block text-center mb-6">
          <h1 className="text-2xl font-bold">
            {selectedClass ? `Liste de classe - ${selectedClass.name}` : 'Liste de classe'}
          </h1>
          {resolvedSchool && (
            <p className="text-sm font-bold text-slate-800">{resolvedSchool.schoolName}</p>
          )}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Classes</p>
                <p className="text-2xl font-bold">{totalClassCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Élèves</p>
                <p className="text-2xl font-bold">{totalStudentCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <ClipboardList className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Classes pleines</p>
                <p className="text-2xl font-bold">{fullClassesCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-secondary">
                <User className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sélection</p>
                <p className="text-2xl font-bold">
                  {selectedClass ? selectedClass.name : 'Aucune'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="print:hidden">
          <CardContent className="p-4 space-y-3">
            {/* Quick Cycle Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b">
              <span className="text-xs font-bold text-muted-foreground mr-1 shrink-0">Niveaux / Cycles :</span>
              <Button
                variant={selectedCycle === 'all' ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  "h-7 text-xs rounded-full px-3 shrink-0 font-semibold",
                  selectedCycle === 'all' ? "bg-primary text-primary-foreground shadow-xs" : "hover:bg-muted"
                )}
                onClick={() => handleCycleChange('all')}
              >
                Tous ({classes.length})
              </Button>
              {cycles.map((cy) => {
                const count = classes.filter((c: any) => {
                  if (c.cycle_id != null && String(c.cycle_id) === String(cy.id)) return true;
                  const cCycle = String(c.cycle || c.CY_LIBELLECYCLE || '').toLowerCase();
                  return cCycle === cy.code.toLowerCase() || cCycle === cy.libelle.toLowerCase() || cCycle.includes(cy.code.toLowerCase());
                }).length;
                const isSelected = selectedCycle === String(cy.id) || selectedCycle.toLowerCase() === cy.code.toLowerCase() || selectedCycle.toLowerCase() === cy.libelle.toLowerCase();
                return (
                  <Button
                    key={cy.id}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      "h-7 text-xs rounded-full px-3 shrink-0 font-semibold",
                      isSelected ? "bg-primary text-primary-foreground shadow-xs" : "hover:bg-muted"
                    )}
                    onClick={() => handleCycleChange(String(cy.id))}
                  >
                    {cy.libelle} ({count})
                  </Button>
                );
              })}
            </div>

            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une classe..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                  <SelectTrigger className="w-full sm:w-56">
                    <SchoolIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Établissement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les établissements</SelectItem>
                    {schools.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedCycle} onValueChange={handleCycleChange}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les cycles</SelectItem>
                    {cycles.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les niveaux</SelectItem>
                    {filteredLevelOptions.map((l) => (
                      <SelectItem key={l.id} value={String(l.id)}>
                        {l.libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Classes list */}
          <Card className="lg:col-span-1 print:hidden">
            <CardHeader>
              <CardTitle className="text-lg">Classes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <div className="p-4 space-y-2">
                  {filteredClasses.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>Aucune classe trouvée.</p>
                    </div>
                  ) : (
                    filteredClasses.map((classe) => {
                      const fillRate = getFillRate(classe.studentCount || 0, classe.capacity || 0);
                      const isSelected = selectedClassId === classe.id;
                      return (
                        <button
                          key={classe.id}
                          onClick={() => setSelectedClassId(classe.id)}
                          className={cn(
                            'w-full text-left p-4 rounded-lg border transition-all hover:bg-muted/50',
                            isSelected
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-border bg-card'
                          )}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold">{classe.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {classe.niveau || 'Niveau non défini'} •{' '}
                                {classe.cycle
                                  ? classe.cycle.charAt(0).toUpperCase() + classe.cycle.slice(1)
                                  : 'Cycle non défini'}
                              </p>
                            </div>
                            <Badge variant={isSelected ? 'default' : 'secondary'}>
                              {classe.studentCount || 0}/{classe.capacity || 0}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Taux de remplissage</span>
                              <span>{fillRate}%</span>
                            </div>
                            <Progress value={fillRate} className="h-2" />
                            <p className="text-xs text-muted-foreground truncate">
                              Titulaire : {getTeacherName(classe.teacherId)}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Roster */}
          <Card className="lg:col-span-2" id="printable-roster">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
              <div>
                <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                  <span>{selectedClass ? `Liste de classe - ${selectedClass.name}` : 'Liste de classe'}</span>
                  {resolvedSchool && (
                    <Badge variant="outline" className="text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                      {resolvedSchool.schoolName}
                    </Badge>
                  )}
                </CardTitle>
                {selectedClass && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {resolvedSchool?.establishmentType || selectedSchoolInfo?.name} • Ville : <strong className="text-slate-700 dark:text-slate-300">{resolvedSchool?.city || selectedSchoolInfo?.city || 'Abidjan'}</strong> • Titulaire :{' '}
                    <strong className="text-slate-700 dark:text-slate-200">
                      {selectedTeacher
                        ? `${formatStudentName(selectedTeacher)}`
                        : 'Non assigné'}
                    </strong>
                  </p>
                )}
              </div>
              {selectedClass && (
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un élève..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}
            </CardHeader>
            <CardContent>
              {!selectedClass ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <ClipboardList className="h-16 w-16 mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Aucune classe sélectionnée</h3>
                  <p className="text-sm text-center max-w-md">
                    Sélectionnez une classe dans la liste pour afficher sa liste d'élèves.
                  </p>
                </div>
              ) : rosterLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Roster stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-2xl font-bold">{filteredStudents.length}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Garçons</p>
                        <p className="text-2xl font-bold text-blue-600">{boysCount}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Filles</p>
                        <p className="text-2xl font-bold text-pink-600">{girlsCount}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Capacité</p>
                        <p className="text-2xl font-bold">{selectedClass.capacity || 0}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>Aucun élève dans cette classe.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">N°</TableHead>
                            <TableHead>Matricule</TableHead>
                            <TableHead>Nom</TableHead>
                            <TableHead>Prénom</TableHead>
                            <TableHead>Genre</TableHead>
                            <TableHead>Date de naissance</TableHead>
                            <TableHead>Âge</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead>Scolarité</TableHead>
                            <TableHead>Contact parent</TableHead>
                            <TableHead className="w-20 print:hidden text-center">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredStudents.map((student, index) => (
                            <TableRow
                              key={student.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handleOpenEditDialog(student)}
                            >
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell>{student.matricule}</TableCell>
                              <TableCell className="font-semibold uppercase">{student.lastName}</TableCell>
                              <TableCell>{student.firstName}</TableCell>
                              <TableCell>
                                {student.gender === 'M' ? 'Masculin' : 'Féminin'}
                              </TableCell>
                              <TableCell>{formatDate(student.dateOfBirth)}</TableCell>
                              <TableCell>{calculateAge(student.dateOfBirth)} ans</TableCell>
                              <TableCell>
                                <Badge variant={getStatusBadgeColor(student.status)}>
                                  {student.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {student.balance != null && student.balance > 0 ? (
                                  <Badge variant="destructive" className="text-[10px] font-semibold whitespace-nowrap">
                                    Solde: {formatCurrency(student.balance)}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-300 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 whitespace-nowrap">
                                    À jour
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>{student.parentPhone || '-'}</TableCell>
                              <TableCell className="print:hidden">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                    title="Modifier les informations de l'élève"
                                    onClick={(e) => { e.stopPropagation(); handleOpenEditDialog(student); }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    title="Retirer cet élève de l'établissement"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`${ROUTE_PATHS.STUDENT_WITHDRAWAL}?studentId=${student.id}`);
                                    }}
                                  >
                                    <UserMinus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* POPUP DE MODIFICATION ÉLÈVE (même modèle que la fiche de pré-inscription) */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) { setEditDialogOpen(false); setEditingStudent(null); } }}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Edit className="h-5 w-5 text-primary" />
              Modifier les informations de l'élève
            </DialogTitle>
            <DialogDescription>
              {editingStudent && (
                <span>
                  Matricule : <strong className="text-foreground">{editForm.matricule}</strong> — <span className="font-semibold uppercase">{editForm.nom}</span> {editForm.prenom}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 space-y-4">
            {/* Photo + Matricule Header */}
            <div className="flex items-center gap-6 p-4 rounded-xl border bg-muted/30">
              <div className="relative group">
                {editForm.photo ? (
                  <img
                    src={editForm.photo}
                    alt="Photo élève"
                    className="h-20 w-20 rounded-full object-cover border-2 border-primary/30 shadow"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                    <Camera className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                )}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full shadow bg-background"
                  onClick={() => photoInputRef.current?.click()}
                  title="Changer la photo"
                >
                  <Upload className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Matricule</Label>
                  <Input
                    value={editForm.matricule}
                    onChange={(e) => handleEditChange('matricule', e.target.value)}
                    className="font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Statut</Label>
                  <Select value={editForm.statut} onValueChange={(val) => handleEditChange('statut', val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="preinscrit">Préinscrit</SelectItem>
                      <SelectItem value="radie">Radié</SelectItem>
                      <SelectItem value="transfere">Transféré</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Tab bar (same as PreInscription) */}
            <div className="flex border-b overflow-x-auto gap-1">
              <button type="button" onClick={() => setEditActiveTab('identification')}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${editActiveTab === 'identification' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                <User className="w-4 h-4" /> 1. Élève / ID
              </button>
              <button type="button" onClick={() => setEditActiveTab('scolarite')}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${editActiveTab === 'scolarite' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                <BookOpen className="w-4 h-4" /> 2. Scolarité
              </button>
              <button type="button" onClick={() => setEditActiveTab('parents')}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${editActiveTab === 'parents' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                <Users className="w-4 h-4" /> 3. Parents
              </button>
              <button type="button" onClick={() => setEditActiveTab('residence')}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${editActiveTab === 'residence' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                <Home className="w-4 h-4" /> 4. Résidence
              </button>
            </div>

            {/* ─── TAB 1: IDENTIFICATION ─── */}
            {editActiveTab === 'identification' && (
              <div className="space-y-4 animate-in fade-in-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-nom">Nom de l'élève *</Label>
                    <Input id="edit-nom" placeholder="Nom" value={editForm.nom}
                      onChange={(e) => handleEditChange('nom', e.target.value.toUpperCase())} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-prenom">Prénoms de l'élève *</Label>
                    <Input id="edit-prenom" placeholder="Prénoms" value={editForm.prenom}
                      onChange={(e) => handleEditChange('prenom', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-genre">Genre *</Label>
                    <Select value={editForm.genre} onValueChange={(val) => handleEditChange('genre', val)}>
                      <SelectTrigger id="edit-genre"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculin (M)</SelectItem>
                        <SelectItem value="F">Féminin (F)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-dateNaissance">Date de naissance *</Label>
                    <Input id="edit-dateNaissance" type="date" value={editForm.dateNaissance}
                      onChange={(e) => handleEditChange('dateNaissance', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-lieuNaissance">Lieu de naissance</Label>
                    <Input id="edit-lieuNaissance" placeholder="Ex: Abidjan Cocody" value={editForm.lieuNaissance}
                      onChange={(e) => handleEditChange('lieuNaissance', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-nationalite">Nationalité</Label>
                    <Input id="edit-nationalite" placeholder="Ex: Ivoirienne" value={editForm.nationalite}
                      onChange={(e) => handleEditChange('nationalite', e.target.value)} />
                  </div>
                </div>

                <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Extrait de naissance</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="edit-extraitNo">N° Extrait</Label>
                      <Input id="edit-extraitNo" placeholder="N°" value={editForm.extraitNo}
                        onChange={(e) => handleEditChange('extraitNo', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-extraitDate">Établi le</Label>
                      <Input id="edit-extraitDate" type="date" value={editForm.extraitDate}
                        onChange={(e) => handleEditChange('extraitDate', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-extraitLieu">À (Lieu)</Label>
                      <Input id="edit-extraitLieu" placeholder="Lieu" value={editForm.extraitLieu}
                        onChange={(e) => handleEditChange('extraitLieu', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 items-end">
                  <div className="space-y-2">
                    <Label htmlFor="edit-handicap">Handicap</Label>
                    <Select value={editForm.handicap} onValueChange={(val) => handleEditChange('handicap', val)}>
                      <SelectTrigger id="edit-handicap"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NON">Aucun handicap (NON)</SelectItem>
                        <SelectItem value="moteur">Moteur</SelectItem>
                        <SelectItem value="visuel">Visuel</SelectItem>
                        <SelectItem value="auditif">Auditif</SelectItem>
                        <SelectItem value="autre">Autre handicap (Préciser)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {editForm.handicap === 'autre' && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-autresHandicap">Préciser le handicap</Label>
                      <Input id="edit-autresHandicap" placeholder="Spécifier le handicap..." value={editForm.autresHandicap}
                        onChange={(e) => handleEditChange('autresHandicap', e.target.value)} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── TAB 2: SCOLARITÉ ─── */}
            {editActiveTab === 'scolarite' && (
              <div className="space-y-4 animate-in fade-in-0">
                <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Scolarité Antérieure</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="edit-ecoleOrigine">École d'origine</Label>
                      <Input id="edit-ecoleOrigine" placeholder="École de provenance" value={editForm.ecoleOrigine}
                        onChange={(e) => handleEditChange('ecoleOrigine', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-classePrecedente">Classe précédente</Label>
                      <Input id="edit-classePrecedente" placeholder="Ex: 6ème" value={editForm.classePrecedente}
                        onChange={(e) => handleEditChange('classePrecedente', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="edit-noTable">N° de table</Label>
                      <Input id="edit-noTable" placeholder="N° table" value={editForm.noTable}
                        onChange={(e) => handleEditChange('noTable', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-session">Session (Année)</Label>
                      <Input id="edit-session" placeholder="Session" value={editForm.session}
                        onChange={(e) => handleEditChange('session', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-matriculeNational">Matricule National</Label>
                      <Input id="edit-matriculeNational" placeholder="Matricule" value={editForm.matriculeNational}
                        onChange={(e) => handleEditChange('matriculeNational', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="edit-niveauArabe">Niveau Scolaire (Arabe)</Label>
                      <Input id="edit-niveauArabe" placeholder="Niveau arabe" value={editForm.niveauArabe}
                        onChange={(e) => handleEditChange('niveauArabe', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-redoublant">Qualité Élève</Label>
                    <Select value={editForm.redoublant} onValueChange={(val) => handleEditChange('redoublant', val)}>
                      <SelectTrigger id="edit-redoublant"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NON">Non Redoublant(e)</SelectItem>
                        <SelectItem value="OUI">Redoublant(e)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-statutAffecte">Statut Orientation</Label>
                    <Select value={editForm.statutAffecte} onValueChange={(val) => handleEditChange('statutAffecte', val)}>
                      <SelectTrigger id="edit-statutAffecte"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Affecté">Affecté par l'État</SelectItem>
                        <SelectItem value="Réaffecté">Réaffecté</SelectItem>
                        <SelectItem value="Non Affecté">Non Affecté (Privé)</SelectItem>
                        <SelectItem value="Transfert">Transfert d'établissement</SelectItem>
                        <SelectItem value="Régularisation">Régularisation</SelectItem>
                        <SelectItem value="Réintégration">Réintégration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center h-full gap-2 pt-6">
                      <input id="edit-priseEnCharge" type="checkbox" checked={editForm.priseEnCharge}
                        onChange={(e) => handleEditChange('priseEnCharge', e.target.checked)}
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer" />
                      <Label htmlFor="edit-priseEnCharge" className="cursor-pointer font-semibold">Prise en charge</Label>
                    </div>
                  </div>
                </div>

                {editForm.priseEnCharge && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-originePriseEnCharge">Origine de la prise en charge</Label>
                    <Input id="edit-originePriseEnCharge" placeholder="Entrez l'organisme ou la structure de prise en charge"
                      value={editForm.originePriseEnCharge}
                      onChange={(e) => handleEditChange('originePriseEnCharge', e.target.value)} />
                  </div>
                )}
              </div>
            )}

            {/* ─── TAB 3: PARENTS ─── */}
            {editActiveTab === 'parents' && (
              <div className="space-y-4 animate-in fade-in-0">
                {/* PÈRE */}
                <div className="p-4 rounded-xl border bg-muted/10 space-y-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Informations sur le Père</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="edit-pereNom">Nom & Prénoms du Père</Label>
                      <Input id="edit-pereNom" placeholder="Nom complet" value={editForm.pereNom} onChange={(e) => handleEditChange('pereNom', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-pereProfession">Profession du Père</Label>
                      <Input id="edit-pereProfession" placeholder="Profession" value={editForm.pereProfession} onChange={(e) => handleEditChange('pereProfession', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="edit-perePhone">Téléphone / Cel.</Label>
                      <Input id="edit-perePhone" placeholder="Tél" value={editForm.perePhone} onChange={(e) => handleEditChange('perePhone', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-pereEmail">E-mail</Label>
                      <Input id="edit-pereEmail" type="email" placeholder="Email" value={editForm.pereEmail} onChange={(e) => handleEditChange('pereEmail', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-pereBoitePostale">Boîte Postale (B.P.)</Label>
                      <Input id="edit-pereBoitePostale" placeholder="B.P." value={editForm.pereBoitePostale} onChange={(e) => handleEditChange('pereBoitePostale', e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* MÈRE */}
                <div className="p-4 rounded-xl border bg-muted/10 space-y-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Informations sur la Mère</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="edit-mereNom">Nom & Prénoms de la Mère</Label>
                      <Input id="edit-mereNom" placeholder="Nom complet" value={editForm.mereNom} onChange={(e) => handleEditChange('mereNom', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-mereProfession">Profession de la Mère</Label>
                      <Input id="edit-mereProfession" placeholder="Profession" value={editForm.mereProfession} onChange={(e) => handleEditChange('mereProfession', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="edit-merePhone">Téléphone / Cel.</Label>
                      <Input id="edit-merePhone" placeholder="Tél" value={editForm.merePhone} onChange={(e) => handleEditChange('merePhone', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-mereEmail">E-mail</Label>
                      <Input id="edit-mereEmail" type="email" placeholder="Email" value={editForm.mereEmail} onChange={(e) => handleEditChange('mereEmail', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-mereBoitePostale">Boîte Postale (B.P.)</Label>
                      <Input id="edit-mereBoitePostale" placeholder="B.P." value={editForm.mereBoitePostale} onChange={(e) => handleEditChange('mereBoitePostale', e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* TUTEUR */}
                <div className="p-4 rounded-xl border bg-muted/10 space-y-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Tuteur (Personne qui héberge l'élève)</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="edit-tuteurNom">Nom & Prénoms du Tuteur</Label>
                      <Input id="edit-tuteurNom" placeholder="Nom complet" value={editForm.tuteurNom} onChange={(e) => handleEditChange('tuteurNom', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-tuteurProfession">Profession du Tuteur</Label>
                      <Input id="edit-tuteurProfession" placeholder="Profession" value={editForm.tuteurProfession} onChange={(e) => handleEditChange('tuteurProfession', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="edit-tuteurPhone">Téléphone / Cel.</Label>
                      <Input id="edit-tuteurPhone" placeholder="Tél" value={editForm.tuteurPhone} onChange={(e) => handleEditChange('tuteurPhone', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-tuteurEmail">E-mail</Label>
                      <Input id="edit-tuteurEmail" type="email" placeholder="Email" value={editForm.tuteurEmail} onChange={(e) => handleEditChange('tuteurEmail', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-tuteurBoitePostale">Boîte Postale (B.P.)</Label>
                      <Input id="edit-tuteurBoitePostale" placeholder="B.P." value={editForm.tuteurBoitePostale} onChange={(e) => handleEditChange('tuteurBoitePostale', e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* RESPONSABLE SCOLARITÉ */}
                <div className="p-4 rounded-xl border bg-muted/10 space-y-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Personne en charge de la scolarité financière</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="edit-scolariteNom">Nom & Prénoms du Responsable</Label>
                      <Input id="edit-scolariteNom" placeholder="Nom complet" value={editForm.scolariteNom} onChange={(e) => handleEditChange('scolariteNom', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-scolariteProfession">Profession du Responsable</Label>
                      <Input id="edit-scolariteProfession" placeholder="Profession" value={editForm.scolariteProfession} onChange={(e) => handleEditChange('scolariteProfession', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="edit-scolaritePhone">Téléphone / Cel.</Label>
                      <Input id="edit-scolaritePhone" placeholder="Tél" value={editForm.scolaritePhone} onChange={(e) => handleEditChange('scolaritePhone', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-scolariteEmail">E-mail</Label>
                      <Input id="edit-scolariteEmail" type="email" placeholder="Email" value={editForm.scolariteEmail} onChange={(e) => handleEditChange('scolariteEmail', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-scolariteBoitePostale">Boîte Postale (B.P.)</Label>
                      <Input id="edit-scolariteBoitePostale" placeholder="B.P." value={editForm.scolariteBoitePostale} onChange={(e) => handleEditChange('scolariteBoitePostale', e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB 4: RÉSIDENCE ─── */}
            {editActiveTab === 'residence' && (
              <div className="space-y-4 animate-in fade-in-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-lieuResidence">Lieu de résidence principal *</Label>
                    <Select value={editForm.lieuResidence} onValueChange={(val) => handleEditChange('lieuResidence', val)}>
                      <SelectTrigger id="edit-lieuResidence"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pere_mere">Chez Père et Mère</SelectItem>
                        <SelectItem value="pere">Chez le Père uniquement</SelectItem>
                        <SelectItem value="mere">Chez la Mère uniquement</SelectItem>
                        <SelectItem value="tuteur">Chez le Tuteur</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-commune">Commune de résidence *</Label>
                    <Input id="edit-commune" placeholder="Commune" value={editForm.commune}
                      onChange={(e) => handleEditChange('commune', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-quartier">Quartier</Label>
                    <Input id="edit-quartier" placeholder="Quartier" value={editForm.quartier}
                      onChange={(e) => handleEditChange('quartier', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-lot">Lot N°</Label>
                    <Input id="edit-lot" placeholder="N° de lot" value={editForm.lot}
                      onChange={(e) => handleEditChange('lot', e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-adresseText">Adresse Géographique Détaillée</Label>
                  <Input id="edit-adresseText" placeholder="Indications géographiques" value={editForm.adresseText}
                    onChange={(e) => handleEditChange('adresseText', e.target.value)} />
                </div>

                <div className="p-4 rounded-xl border bg-primary/5 space-y-3">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider block">Coordonnées Principales de Contact</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="edit-telephonePrincipal">Téléphone Principal *</Label>
                      <Input id="edit-telephonePrincipal" placeholder="Cel. de contact" value={editForm.telephonePrincipal}
                        onChange={(e) => handleEditChange('telephonePrincipal', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-emailPrincipal">Email de contact</Label>
                      <Input id="edit-emailPrincipal" type="email" placeholder="parent@email.com" value={editForm.emailPrincipal}
                        onChange={(e) => handleEditChange('emailPrincipal', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-notesSante">Notes de santé</Label>
                  <Input id="edit-notesSante" placeholder="Informations médicales importantes..." value={editForm.notesSante}
                    onChange={(e) => handleEditChange('notesSante', e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* Footer with navigation and save */}
          <DialogFooter className="px-6 pb-6 pt-4 border-t flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {editActiveTab !== 'identification' && (
                <Button type="button" variant="outline" onClick={() => {
                  if (editActiveTab === 'scolarite') setEditActiveTab('identification');
                  else if (editActiveTab === 'parents') setEditActiveTab('scolarite');
                  else if (editActiveTab === 'residence') setEditActiveTab('parents');
                }}>
                  Précédent
                </Button>
              )}
              {editActiveTab !== 'residence' && (
                <Button type="button" variant="outline" onClick={() => {
                  if (editActiveTab === 'identification') setEditActiveTab('scolarite');
                  else if (editActiveTab === 'scolarite') setEditActiveTab('parents');
                  else if (editActiveTab === 'parents') setEditActiveTab('residence');
                }}>
                  Suivant
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => { setEditDialogOpen(false); setEditingStudent(null); }}>
                Annuler
              </Button>
              <Button onClick={handleSaveStudent} disabled={editLoading} className="px-6 font-semibold gap-2">
                {editLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...</>
                ) : (
                  <><Save className="h-4 w-4" /> Enregistrer</>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Layout>
  );
}
