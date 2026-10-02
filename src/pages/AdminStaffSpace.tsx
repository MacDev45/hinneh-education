/**
 * Espace Personnel Administratif — Tableau de bord opérationnel complet
 * Inscriptions, secrétariat, finances, RH, archives, stocks, communication
 */
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase, FileText, Users, DollarSign, ClipboardList,
  Search, Plus, Download, Edit, Trash2, Eye, Check,
  Bell, MessageSquare, Archive, Package, Send,
  Calendar, Clock, AlertCircle, TrendingUp, Settings,
  Filter, Printer, CheckSquare, Star, ChevronRight,
  UserPlus, CreditCard, Smartphone, Building2, FolderOpen,
  BarChart3, Save, Phone, Mail, MapPin, RefreshCw,
  MoreVertical, Shield, Inbox, Database, GraduationCap, DoorOpen,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
// mockData imported for future data binding
import { formatStudentName, formatCurrency, formatDate } from '@/lib/index';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';

// ─── Données locales ──────────────────────────────────────────────────────────

const ADMIN_STAFF = {};
const INSCRIPTIONS: any[] = [];
const PAIEMENTS: any[] = [];

const COURRIERS: any[] = [];

const STOCKS: any[] = [];
const TACHES: any[] = [];
const MESSAGES: any[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inscriptionStatusStyle: Record<string, string> = {
  complete: 'bg-success/20 text-green-700',
  attente_docs: 'bg-warning/20 text-yellow-700',
  attente_paiement: 'bg-blue-100 text-blue-700',
  annule: 'bg-destructive/10 text-destructive',
};

const inscriptionStatusLabel: Record<string, string> = {
  complete: '✓ Complète',
  attente_docs: '📋 Docs manquants',
  attente_paiement: '💰 Paiement dû',
  annule: '✗ Annulée',
};

const courStatutStyle: Record<string, string> = {
  traite: 'bg-success/20 text-green-700',
  en_cours: 'bg-warning/20 text-yellow-700',
  envoye: 'bg-blue-100 text-blue-700',
  en_attente: 'bg-muted text-muted-foreground',
};

const prioriteStyle: Record<string, string> = {
  haute: 'text-destructive',
  normale: 'text-muted-foreground',
  basse: 'text-muted-foreground',
};

const tacheStatutStyle: Record<string, string> = {
  a_faire: 'bg-warning/20 text-yellow-700',
  en_cours: 'bg-primary/20 text-primary',
  termine: 'bg-success/20 text-green-700',
  annule: 'bg-muted text-muted-foreground',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminStaffSpace() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [filterInscription, setFilterInscription] = useState('all');
  const [filterPaiement, setFilterPaiement] = useState('all');
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [showNewInscriptionModal, setShowNewInscriptionModal] = useState(false);
  const [showPaiementModal, setShowPaiementModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showNewCourrier, setShowNewCourrier] = useState(false);
  const [showNewTache, setShowNewTache] = useState(false);

  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>({
    firstName: 'Direction',
    lastName: 'Générale',
    role: 'Directeur',
    schoolName: 'Établissement Hinneh',
  });
  const [inscriptionsList, setInscriptionsList] = useState<any[]>([]);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);

  // Inscription form states
  const [insPrenom, setInsPrenom] = useState('');
  const [insNom, setInsNom] = useState('');
  const [insDob, setInsDob] = useState('');
  const [insGenre, setInsGenre] = useState('M');
  const [insClasseId, setInsClasseId] = useState('');
  const [insParentNom, setInsParentNom] = useState('');
  const [insParentPhone, setInsParentPhone] = useState('');
  const [insParentEmail, setInsParentEmail] = useState('');
  const [insBoursier, setInsBoursier] = useState(false);
  const [insAffecte, setInsAffecte] = useState(false);
  const [insPriseEnCharge, setInsPriseEnCharge] = useState(false);

  // Payment form states
  const [payStudentId, setPayStudentId] = useState('');
  const [payType, setPayType] = useState('scolarite');
  const [payMontant, setPayMontant] = useState('');
  const [payMode, setPayMode] = useState('especes');
  const [payTransaction, setPayTransaction] = useState('');

  // Courrier states
  const [courriersList, setCourriersList] = useState<any[]>([]);
  const [courType, setCourType] = useState('entrant');
  const [courPriorite, setCourPriorite] = useState('normale');
  const [courObjet, setCourObjet] = useState('');
  const [courExpDest, setCourExpDest] = useState('');
  const [courDesc, setCourDesc] = useState('');

  // Stocks states
  const [stocksList, setStocksList] = useState<any[]>([]);

  // Tache states
  const [tachesList, setTachesList] = useState<any[]>([]);
  const [tacheTitre, setTacheTitre] = useState('');
  const [tachePriorite, setTachePriorite] = useState('moyenne');
  const [tacheEcheance, setTacheEcheance] = useState('');
  const [tacheAssignee, setTacheAssignee] = useState('');

  // Message states
  const [messagesList, setMessagesList] = useState<any[]>([]);
  const [msgDest, setMsgDest] = useState('direction');
  const [msgSubject, setMsgSubject] = useState('');
  const [msgContent, setMsgContent] = useState('');

  // Archives states
  const [staff, setStaff] = useState<any[]>([]);
  const [archivesList, setArchivesList] = useState<any[]>([]);

  // Attributions & Subjects states
  const [attributionsList, setAttributionsList] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [showNewAttributionModal, setShowNewAttributionModal] = useState(false);
  const [attrClasseId, setAttrClasseId] = useState('');
  const [attrEnseignantId, setAttrEnseignantId] = useState('');
  const [attrMatiereId, setAttrMatiereId] = useState('');
  const [attrJour, setAttrJour] = useState('Lundi');
  const [attrHeure, setAttrHeure] = useState('');
  const [attrSalle, setAttrSalle] = useState('');
  const [attrGroupe, setAttrGroupe] = useState('Classe entière');
  const [customGroupe, setCustomGroupe] = useState('');

  // Salles states
  const [sallesList, setSallesList] = useState<any[]>([]);
  const [showSalleModal, setShowSalleModal] = useState(false);
  const [showDeleteSalleModal, setShowDeleteSalleModal] = useState(false);
  const [salleToEdit, setSalleToEdit] = useState<any | null>(null);
  const [salleCode, setSalleCode] = useState('');
  const [salleLibelle, setSalleLibelle] = useState('');
  const [salleType, setSalleType] = useState('classe');
  const [salleCapacite, setSalleCapacite] = useState<number>(30);
  const [salleEtage, setSalleEtage] = useState<number>(0);
  const [salleBatiment, setSalleBatiment] = useState('');
  const [salleDescription, setSalleDescription] = useState('');
  const [salleDisponible, setSalleDisponible] = useState(true);
  const [salleEcoleId, setSalleEcoleId] = useState('none');

  const archiveCounts = useMemo(() => ({
    'Dossiers Élèves': students.length,
    'Dossiers Personnel': staff.length,
    'Bulletins Scolaires': 0,
    'Procès Verbaux': archivesList.filter((a: any) => a.categorie === 'Procès Verbaux').length,
    'Correspondances': courriersList.length,
    'Documents Officiels': archivesList.filter((a: any) => a.categorie === 'Documents Officiels').length,
  }), [students, staff, courriersList, archivesList]);

  const loadData = async () => {
    try {
      const [
        studentsData,
        paymentsData,
        classesData,
        schoolsData,
        levelsData,
        staffData,
        courriersData,
        stocksData,
        tachesData,
        archivesData,
        subjectsData,
        attributionsData,
        sallesData,
      ] = await Promise.all([
        apiClient.getStudents(),
        apiClient.getPayments(),
        apiClient.getClasses(),
        apiClient.getSchools(),
        apiClient.getLevels(),
        apiClient.getStaff().catch(() => [] as any[]),
        apiClient.getCourriers().catch(() => [] as any[]),
        apiClient.getStocks().catch(() => [] as any[]),
        apiClient.getTaches().catch(() => [] as any[]),
        apiClient.getArchives().catch(() => [] as any[]),
        apiClient.getSubjects().catch(() => [] as any[]),
        apiClient.getAttributions().catch(() => [] as any[]),
        apiClient.getSalles().catch(() => [] as any[]),
      ]);

      setStudents(studentsData);
      setPaymentsList(paymentsData);
      setClasses(classesData);
      setSchools(schoolsData);
      setLevels(levelsData);
      setStaff(staffData);
      setCourriersList(courriersData);
      setStocksList(stocksData);
      setTachesList(tachesData.map((t: any) => ({ ...t, echeance: new Date(t.echeance) })));
      setArchivesList(archivesData);
      setSubjectsList(subjectsData);
      setAttributionsList(attributionsData);
      setSallesList(sallesData);

      // Determine logged in user
      const loggedInUsername = localStorage.getItem('username') || '';
      const loggedInRole = localStorage.getItem('user_role') || '';
      const foundStaff = staffData.find((s: any) => s.email === loggedInUsername || s.id === loggedInUsername);
      if (foundStaff) {
        const sch = schoolsData.find((sc: any) => String(sc.id) === String(foundStaff.schoolId));
        setCurrentUser({
          firstName: foundStaff.firstName,
          lastName: foundStaff.lastName,
          role: foundStaff.fonction === 'direction' ? 'Directeur d\'école' : foundStaff.fonction.toUpperCase(),
          schoolName: sch ? sch.name : 'Établissement Hinneh',
        });
      } else {
        setCurrentUser({
          firstName: loggedInUsername.split('@')[0],
          lastName: '',
          role: loggedInRole === 'direction_fondation' ? 'Direction Fondation' : loggedInRole.toUpperCase(),
          schoolName: schoolsData[0] ? schoolsData[0].name : 'Établissement Hinneh',
        });
      }

      const mappedInscriptions = studentsData.map((std: any) => {
        const cls = classesData.find((c: any) => String(c.id) === String(std.classId));
        const lvl = levelsData.find((l: any) => cls && (String(l.id) === String((cls as any).niveau_id || (cls as any).niveauId) || l.code === cls.niveau || l.libelle === cls.niveau));
        const totalFrais = lvl ? Number(lvl.scolarite) + Number(lvl.droit_inscription) : 60000;
        
        const paidAmount = paymentsData
          .filter((p: any) => String(p.studentId) === String(std.id) && p.status === 'paye')
          .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

        return {
          id: `INS-${String(std.id).padStart(3, '0')}`,
          studentId: std.id,
          student: `${formatStudentName(std)}`,
          matricule: std.matricule,
          classe: cls ? cls.name : 'Non assignée',
          cycle: cls ? cls.cycle : 'Primaire',
          status: std.status || 'complete',
          date: std.createdAt || new Date(),
          frais: totalFrais,
          paye: paidAmount,
          docs: ['acte', 'photos', 'carnet'],
          agent: 'K. Bamba',
        };
      });
      setInscriptionsList(mappedInscriptions);
    } catch (err) {
      console.error("Failed to load staff portal data", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveInscription = async () => {
    if (!insPrenom || !insNom || !insParentNom || !insParentPhone) {
      toast({
        variant: "destructive",
        title: "Champs manquants",
        description: "Veuillez remplir le prénom, le nom, et les informations du parent.",
      });
      return;
    }

    try {
      const cls = classes.find(c => String(c.id) === String(insClasseId));
      const ecole_id = cls ? Number(cls.schoolId) : (schools[0] ? Number(schools[0].id) : 1);

      const payload = {
        matricule: "AUTO",
        prenom: insPrenom,
        nom: insNom,
        date_naissance: insDob || "2015-01-01",
        genre: insGenre,
        ecole_id: ecole_id,
        classe_id: insClasseId ? Number(insClasseId) : null,
        statut: "attente_docs",
        notes_sante: "",
        AU_PERENOMPRENOMS: insParentNom,
        AU_PERECONTACTS: insParentPhone,
        AU_E_MAIL: insParentEmail || null,
        ETAT_BOURSE: insBoursier,
        AU_TOP_AFFECTE: insAffecte ? 1 : 0,
        AU_STATUTPENSION: insPriseEnCharge ? 1 : 0
      };

      await apiClient.createStudent(payload);

      toast({
        title: "Inscription enregistrée",
        description: `L'élève ${insNom} ${insPrenom} a été préinscrit avec succès.`,
      });

      setInsPrenom('');
      setInsNom('');
      setInsDob('');
      setInsGenre('M');
      setInsClasseId('');
      setInsParentNom('');
      setInsParentPhone('');
      setInsParentEmail('');
      setInsBoursier(false);
      setInsAffecte(false);
      setInsPriseEnCharge(false);
      setShowNewInscriptionModal(false);

      await loadData();
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Erreur d'inscription",
        description: err.response?.data?.detail || "Impossible de sauvegarder l'inscription.",
      });
    }
  };

  const handleSaveCourrier = async () => {
    if (!courObjet) {
      toast({
        variant: "destructive",
        title: "Champs requis",
        description: "Veuillez saisir l'objet du courrier.",
      });
      return;
    }
    try {
      const payload = {
        type: courType,
        objet: courObjet,
        expediteur: courExpDest || 'Inconnu',
        priorite: courPriorite,
        status: 'en_cours',
        ref: `${courType === 'entrant' ? 'LT' : 'LS'}-2026-${String(courriersList.length + 1).padStart(3, '0')}`,
        description: courDesc || '',
      };
      const saved = await apiClient.createCourrier(payload);
      setCourriersList([saved, ...courriersList]);
      setCourObjet('');
      setCourExpDest('');
      setCourDesc('');
      setCourType('entrant');
      setCourPriorite('normale');
      setShowNewCourrier(false);
      toast({
        title: "Courrier enregistré",
        description: "Le courrier a été enregistré avec succès.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'enregistrer le courrier.",
      });
    }
  };

  const handleAddStock = async () => {
    try {
      const payload = {
        article: `Nouvel Article ${stocksList.length + 1}`,
        categorie: 'Fournitures',
        quantite: 150,
        seuil: 50,
        unite: 'unité',
        fournisseur: 'Fournisseur Standard',
        prix: 1500,
      };
      const saved = await apiClient.createStock(payload);
      setStocksList([...stocksList, saved]);
      toast({
        title: "Article ajouté",
        description: `L'article ${saved.article} a été ajouté au stock.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'ajouter l'article au stock.",
      });
    }
  };

  const handleSaveTache = async () => {
    if (!tacheTitre) {
      toast({
        variant: "destructive",
        title: "Champs requis",
        description: "Veuillez saisir le titre de la tâche.",
      });
      return;
    }
    try {
      const payload = {
        titre: tacheTitre,
        priorite: tachePriorite,
        echeance: tacheEcheance ? new Date(tacheEcheance).toISOString() : new Date().toISOString(),
        status: 'a_faire',
        assignee: tacheAssignee || 'Non assigné',
      };
      const saved = await apiClient.createTache(payload);
      setTachesList([...tachesList, { ...saved, echeance: new Date(saved.echeance) }]);
      setTacheTitre('');
      setTachePriorite('moyenne');
      setTacheEcheance('');
      setTacheAssignee('');
      setShowNewTache(false);
      toast({
        title: "Tâche créée",
        description: "La tâche a été créée avec succès.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de créer la tâche.",
      });
    }
  };

  const handleCompleteTache = async (id: any) => {
    try {
      await apiClient.updateTacheStatus(id, 'termine');
      setTachesList(prev => prev.map(t => t.id === id ? { ...t, status: 'termine' } : t));
      toast({
        title: "Tâche terminée",
        description: "La tâche a été marquée comme terminée.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de terminer la tâche.",
      });
    }
  };

  const handleSaveMessage = () => {
    if (!msgSubject || !msgContent) {
      toast({
        variant: "destructive",
        title: "Champs requis",
        description: "Veuillez saisir l'objet et le contenu du message.",
      });
      return;
    }
    const newMsg = {
      id: `m${messagesList.length + 1}`,
      from: 'Moi',
      subject: msgSubject,
      date: new Date(),
      read: true,
      content: msgContent,
      dest: msgDest
    };
    setMessagesList([newMsg, ...messagesList]);
    setSelectedMessage(newMsg);
    setMsgSubject('');
    setMsgContent('');
    setMsgDest('direction');
    setShowMessageModal(false);
    toast({
      title: "Message envoyé",
      description: "Le message a été envoyé avec succès.",
    });
  };

  const isTimeOverlapping = (slot1: string, slot2: string): boolean => {
    if (!slot1 || !slot2) return false;
    try {
      const parseSlot = (s: string) => {
        const parts = s.split('-');
        if (parts.length !== 2) return null;
        const sp = parts[0].trim().split(':');
        const ep = parts[1].trim().split(':');
        return [parseInt(sp[0], 10) * 60 + parseInt(sp[1], 10), parseInt(ep[0], 10) * 60 + parseInt(ep[1], 10)];
      };
      const t1 = parseSlot(slot1);
      const t2 = parseSlot(slot2);
      if (!t1 || !t2) return slot1.trim().toLowerCase() === slot2.trim().toLowerCase();
      return t1[0] < t2[1] && t2[0] < t1[1];
    } catch {
      return slot1.trim().toLowerCase() === slot2.trim().toLowerCase();
    }
  };

  // --- ATTRIBUTIONS HANDLERS ---
  const handleCreateAttribution = async () => {
    if (!attrClasseId || !attrEnseignantId || !attrMatiereId || !attrJour || !attrHeure) {
      toast({
        variant: "destructive",
        title: "Champs manquants",
        description: "Veuillez renseigner la classe, l'enseignant, la matière, le jour et l'heure.",
      });
      return;
    }

    // Contrôle d'occupation / conflit pour l'enseignant
    const conflict = attributionsList.find(
      (a: any) =>
        String(a.enseignant_id) === String(attrEnseignantId) &&
        a.jour?.toLowerCase() === attrJour.toLowerCase() &&
        isTimeOverlapping(a.heure, attrHeure)
    );

    if (conflict) {
      const clsName = classesList.find((c: any) => String(c.id) === String(conflict.classe_id))?.name || 'une autre classe';
      toast({
        variant: "destructive",
        title: "Enseignant déjà occupé",
        description: `Cet enseignant est déjà occupé le ${attrJour} de ${conflict.heure} avec la classe ${clsName}. Impossible d'attribuer ce créneau.`,
      });
      return;
    }

    try {
      const payload = {
        classe_id: Number(attrClasseId),
        enseignant_id: Number(attrEnseignantId),
        matiere_id: Number(attrMatiereId),
        jour: attrJour,
        heure: attrHeure,
        salle: attrSalle || null,
        statut: "actif",
        groupe: attrGroupe === 'Autre' ? customGroupe : attrGroupe
      };

      await apiClient.createAttribution(payload);

      toast({
        title: "Attribution réussie",
        description: "La matière a été attribuée avec succès.",
      });

      setAttrClasseId('');
      setAttrEnseignantId('');
      setAttrMatiereId('');
      setAttrJour('Lundi');
      setAttrHeure('');
      setAttrSalle('');
      setAttrGroupe('Classe entière');
      setCustomGroupe('');
      setShowNewAttributionModal(false);

      await loadData();
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || "Impossible d'attribuer la matière.";
      toast({
        variant: "destructive",
        title: "Erreur d'attribution",
        description: typeof detail === "string" ? detail : JSON.stringify(detail),
      });
    }
  };

  const handleDeleteAttribution = async (id: number | string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette attribution de matière ?")) {
      return;
    }

    try {
      await apiClient.deleteAttribution(id);

      toast({
        title: "Attribution supprimée",
        description: "L'attribution a été supprimée avec succès.",
      });

      await loadData();
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || "Impossible de supprimer l'attribution.";
      toast({
        variant: "destructive",
        title: "Erreur de suppression",
        description: typeof detail === "string" ? detail : JSON.stringify(detail),
      });
    }
  };

  // --- SALLES HANDLERS ---
  const resetSalleForm = () => {
    setSalleCode('');
    setSalleLibelle('');
    setSalleType('classe');
    setSalleCapacite(30);
    setSalleEtage(0);
    setSalleBatiment('');
    setSalleDescription('');
    setSalleDisponible(true);
    setSalleEcoleId('none');
    setSalleToEdit(null);
  };

  const handleCreateSalle = async () => {
    if (!salleCode || !salleLibelle) {
      toast({ variant: 'destructive', title: 'Champs manquants', description: 'Le code et le libellé sont obligatoires.' });
      return;
    }
    try {
      await apiClient.createSalle({
        code: salleCode.toUpperCase(),
        libelle: salleLibelle,
        type_salle: salleType,
        capacite: Number(salleCapacite),
        etage: Number(salleEtage),
        batiment: salleBatiment || null,
        description: salleDescription || null,
        disponible: salleDisponible,
        ecole_id: (salleEcoleId && salleEcoleId !== 'none') ? Number(salleEcoleId) : null,
      });
      toast({ title: 'Salle créée', description: `La salle ${salleLibelle} a été créée avec succès.` });
      resetSalleForm();
      setShowSalleModal(false);
      await loadData();
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Impossible de créer la salle.";
      toast({ variant: 'destructive', title: 'Erreur', description: typeof detail === 'string' ? detail : JSON.stringify(detail) });
    }
  };

  const handleOpenEditSalle = (salle: any) => {
    setSalleToEdit(salle);
    setSalleCode(salle.code);
    setSalleLibelle(salle.libelle);
    setSalleType(salle.type_salle);
    setSalleCapacite(salle.capacite);
    setSalleEtage(salle.etage ?? 0);
    setSalleBatiment(salle.batiment ?? '');
    setSalleDescription(salle.description ?? '');
    setSalleDisponible(salle.disponible);
    setSalleEcoleId(salle.ecole_id ? String(salle.ecole_id) : 'none');
    setShowSalleModal(true);
  };

  const handleSaveSalle = async () => {
    if (!salleToEdit) return;
    try {
      await apiClient.updateSalle(salleToEdit.id, {
        code: salleCode.toUpperCase(),
        libelle: salleLibelle,
        type_salle: salleType,
        capacite: Number(salleCapacite),
        etage: Number(salleEtage),
        batiment: salleBatiment || null,
        description: salleDescription || null,
        disponible: salleDisponible,
        ecole_id: (salleEcoleId && salleEcoleId !== 'none') ? Number(salleEcoleId) : null,
      });
      toast({ title: 'Salle modifiée', description: `La salle ${salleLibelle} a été modifiée.` });
      setShowSalleModal(false);
      resetSalleForm();
      await loadData();
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Impossible de modifier la salle.";
      toast({ variant: 'destructive', title: 'Erreur', description: typeof detail === 'string' ? detail : JSON.stringify(detail) });
    }
  };

  const handleDeleteSalle = async (salleId: number | string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette salle ?")) {
      return;
    }
    try {
      await apiClient.deleteSalle(salleId);
      toast({ title: 'Salle supprimée', description: "La salle a été supprimée avec succès." });
      await loadData();
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Impossible de supprimer la salle.";
      toast({ variant: 'destructive', title: 'Erreur', description: typeof detail === 'string' ? detail : JSON.stringify(detail) });
    }
  };

  const handleAddArchive = async () => {
    try {
      const payload = {
        titre: "Document Administratif Rentrée",
        categorie: "Documents Officiels",
        description: "Document officiel de rentrée archivé par la direction.",
      };
      const saved = await apiClient.createArchive(payload);
      setArchivesList([saved, ...archivesList]);
      toast({
        title: "Document archivé",
        description: "Le document a été classé dans la catégorie 'Documents Officiels'.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'archiver le document.",
      });
    }
  };

  const handleSavePaiement = async () => {
    if (!payStudentId || !payMontant) {
      toast({
        variant: "destructive",
        title: "Champs manquants",
        description: "Veuillez sélectionner un élève et indiquer le montant du paiement.",
      });
      return;
    }

    try {
      const payload = {
        montant: Number(payMontant),
        type: payType,
        mode: payMode,
        statut: "paye",
        eleve_id: Number(payStudentId),
        numero_transaction: payTransaction || null,
        date_echeance: new Date().toISOString().split('T')[0]
      };

      await apiClient.createPayment(payload);

      toast({
        title: "Paiement enregistré",
        description: "Le paiement a été validé avec succès.",
      });

      setPayStudentId('');
      setPayType('scolarite');
      setPayMontant('');
      setPayMode('especes');
      setPayTransaction('');
      setShowPaiementModal(false);

      await loadData();
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Erreur de paiement",
        description: err.response?.data?.detail || "Impossible d'enregistrer le paiement.",
      });
    }
  };

  // KPIs
  const completedInscriptions = inscriptionsList.filter(i => i.status === 'complete' || i.status === 'actif').length;
  const pendingInscriptions = inscriptionsList.filter(i => i.status !== 'complete' && i.status !== 'actif' && i.status !== 'annule').length;
  const totalPaiements = paymentsList.filter(p => p.status === 'paye').reduce((a, p) => a + p.amount, 0);
  const pendingPaiements = paymentsList.filter(p => p.status === 'en_attente').reduce((a, p) => a + p.amount, 0);
  const stockAlerts = stocksList.filter(s => s.quantite <= s.seuil).length;
  const pendingCourriers = courriersList.filter(c => c.status === 'en_cours').length;
  const pendingTaches = tachesList.filter(t => t.status === 'a_faire' || t.status === 'en_cours').length;
  const unread = messagesList.filter(m => !m.read).length;

  // Filtered lists
  const filteredInscriptions = useMemo(() =>
    inscriptionsList.filter(i => {
      const matchSearch = search === '' || i.student.toLowerCase().includes(search.toLowerCase()) || i.id.toLowerCase().includes(search.toLowerCase()) || (i.matricule && i.matricule.toLowerCase().includes(search.toLowerCase()));
      const matchFilter = filterInscription === 'all' || i.status === filterInscription;
      return matchSearch && matchFilter;
    }),
  [search, filterInscription, inscriptionsList]);

  const filteredPaiements = useMemo(() =>
    paymentsList.map(p => {
      const std = students.find(s => String(s.id) === String(p.studentId));
      return {
        id: `PAY-${String(p.id).padStart(3, '0')}`,
        eleve: std ? `${formatStudentName(std)}` : 'Élève inconnu',
        matricule: std ? std.matricule : 'Non spécifié',
        type: p.type === 'scolarite' ? 'Scolarité' : p.type === 'inscription' ? 'Inscription' : p.type,
        montant: p.amount,
        mode: p.mode,
        status: p.status,
        date: p.date,
        recu: p.receiptNumber || null,
      };
    }).filter(p => {
      const matchSearch = search === '' || p.eleve.toLowerCase().includes(search.toLowerCase()) || p.matricule.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filterPaiement === 'all' || p.status === filterPaiement;
      return matchSearch && matchFilter;
    }),
  [search, filterPaiement, paymentsList, students]);


  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div variants={fadeInUp} initial="initial" animate="animate">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="text-xs font-medium px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full uppercase tracking-wide">Espace Personnel Administratif</span>
              <h1 className="text-3xl font-bold tracking-tight mt-1">{formatStudentName(currentUser)}</h1>
              <p className="text-muted-foreground">{currentUser.role} — {currentUser.schoolName}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1 relative" onClick={() => setActiveTab('messages')}>
                <Inbox className="h-4 w-4" />Messages
                {unread > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-white text-xs rounded-full flex items-center justify-center">{unread}</span>}
              </Button>
              <Button size="sm" className="gap-1" onClick={() => setShowNewInscriptionModal(true)}>
                <UserPlus className="h-4 w-4" />Nouvelle inscription
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowPaiementModal(true)}>
                <CreditCard className="h-4 w-4" />Enregistrer paiement
              </Button>
            </div>
          </div>
        </motion.div>

        {/* KPIs */}
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Inscriptions OK', value: completedInscriptions, icon: CheckSquare, color: 'text-green-600', bg: 'bg-success/10' },
            { label: 'En attente', value: pendingInscriptions, icon: ClipboardList, color: 'text-yellow-600', bg: 'bg-warning/10' },
            { label: 'Recettes mois', value: `${(totalPaiements / 1000).toFixed(0)}k`, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Impayés', value: `${(pendingPaiements / 1000).toFixed(0)}k`, icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
            { label: 'Alertes stocks', value: stockAlerts, icon: Package, color: stockAlerts > 0 ? 'text-destructive' : 'text-green-600', bg: stockAlerts > 0 ? 'bg-destructive/10' : 'bg-success/10' },
            { label: 'Courriers actifs', value: pendingCourriers, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-100' },
            { label: 'Tâches actives', value: pendingTaches, icon: CheckSquare, color: 'text-yellow-600', bg: 'bg-warning/10' },
          ].map(kpi => (
            <motion.div key={kpi.label} variants={staggerItem}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide leading-tight">{kpi.label}</p>
                      <p className={`text-2xl font-bold font-mono mt-1 ${kpi.color}`}>{kpi.value}</p>
                    </div>
                    <div className={`p-2 rounded-xl ${kpi.bg}`}>
                      <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 md:grid-cols-10 w-full">
            <TabsTrigger value="dashboard" className="text-xs"><BarChart3 className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Tableau</span></TabsTrigger>
            <TabsTrigger value="inscriptions" className="text-xs"><UserPlus className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Inscriptions</span></TabsTrigger>
            <TabsTrigger value="paiements" className="text-xs"><DollarSign className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Paiements</span></TabsTrigger>
            <TabsTrigger value="courriers" className="text-xs"><FileText className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Courriers</span></TabsTrigger>
            <TabsTrigger value="stocks" className="text-xs"><Package className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Stocks</span></TabsTrigger>
            <TabsTrigger value="taches" className="text-xs"><CheckSquare className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Tâches</span></TabsTrigger>
            <TabsTrigger value="attributions" className="text-xs"><GraduationCap className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Attributions</span></TabsTrigger>
            <TabsTrigger value="salles" className="text-xs"><DoorOpen className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Salles</span></TabsTrigger>
            <TabsTrigger value="archives" className="text-xs"><Archive className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Archives</span></TabsTrigger>
            <TabsTrigger value="messages" className="text-xs relative"><Inbox className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Messages</span>{unread > 0 && <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-destructive text-white text-xs rounded-full flex items-center justify-center leading-none">{unread}</span>}</TabsTrigger>
          </TabsList>

          {/* ── DASHBOARD ── */}
          <TabsContent value="dashboard" className="mt-5 space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              {/* Tâches urgentes */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />Tâches urgentes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {tachesList.filter(t => t.priorite === 'haute' && t.status !== 'termine').slice(0, 5).map(t => (
                    <div key={t.id} className="flex items-center gap-3 p-2.5 border border-border rounded-lg">
                      <div className="h-2 w-2 rounded-full bg-destructive flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.titre}</p>
                        <p className="text-xs text-muted-foreground">Échéance : {formatDate(t.echeance)} — {t.assignee}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${tacheStatutStyle[t.status]}`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                  {tachesList.filter(t => t.priorite === 'haute' && t.status !== 'termine').length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">✓ Aucune tâche urgente</p>
                  )}
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setActiveTab('taches')}>
                    Voir toutes les tâches →
                  </Button>
                </CardContent>
              </Card>

              {/* Alertes stocks */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4 text-yellow-600" />Alertes de stock
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {stocksList.filter(s => s.quantite <= s.seuil).map(s => (
                    <div key={s.id} className="flex items-center gap-3 p-2.5 border border-destructive/20 bg-destructive/5 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.article}</p>
                        <p className="text-xs text-muted-foreground">Stock : <span className="font-bold text-destructive">{s.quantite}</span> / seuil {s.seuil} {s.unite}(s)</p>
                      </div>
                      <Button size="sm" variant="outline" className="h-6 text-xs gap-1 flex-shrink-0">
                        <Plus className="h-3 w-3" />Commander
                      </Button>
                    </div>
                  ))}
                  {stocksList.filter(s => s.quantite <= s.seuil).length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">✓ Tous les stocks sont satisfaisants</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Inscriptions récentes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary" />Inscriptions récentes
                  <Button variant="ghost" size="sm" className="ml-auto text-xs" onClick={() => setActiveTab('inscriptions')}>Tout voir →</Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className="text-left p-3 font-semibold">Élève</th>
                        <th className="text-left p-3 font-semibold">Classe</th>
                        <th className="text-left p-3 font-semibold">Date</th>
                        <th className="text-left p-3 font-semibold">Frais</th>
                        <th className="text-left p-3 font-semibold">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inscriptionsList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-muted-foreground">Aucune inscription récente</td>
                        </tr>
                      ) : (
                        inscriptionsList.slice(0, 5).map(ins => (
                          <tr key={ins.id} className="border-b hover:bg-muted/20 transition-colors">
                            <td className="p-3 font-medium">{ins.student}</td>
                            <td className="p-3 text-muted-foreground">{ins.classe}</td>
                            <td className="p-3 text-xs">{formatDate(ins.date)}</td>
                            <td className="p-3 font-mono text-xs">{formatCurrency(ins.frais)}</td>
                            <td className="p-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inscriptionStatusStyle[ins.status]}`}>
                                {inscriptionStatusLabel[ins.status]}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Agenda */}
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { date: '08 Mai 2026', titre: 'Commander papier A4 (urgent)', type: 'urgent', icon: Package },
                { date: '10 Mai 2026', titre: 'Envoi rapport effectifs Direction', type: 'rapport', icon: Send },
                { date: '12 Mai 2026', titre: 'Réunion pédagogique — 14h00', type: 'reunion', icon: Users },
                { date: '15 Mai 2026', titre: 'Convocations parents T3', type: 'courrier', icon: FileText },
                { date: '20 Mai 2026', titre: 'Réunion parents-professeurs', type: 'reunion', icon: Users },
                { date: '25 Mai 2026', titre: 'Clôture bulletins T3', type: 'academique', icon: GraduationCap },
              ].map(ev => (
                <div key={ev.date} className={`flex items-center gap-3 p-3 rounded-lg border ${ev.type === 'urgent' ? 'border-destructive/30 bg-destructive/5' : ev.type === 'reunion' ? 'border-primary/20 bg-primary/5' : 'border-border bg-muted/20'}`}>
                  <div className={`p-1.5 rounded-lg ${ev.type === 'urgent' ? 'bg-destructive/20' : ev.type === 'reunion' ? 'bg-primary/10' : 'bg-muted'}`}>
                    <ev.icon className={`h-4 w-4 ${ev.type === 'urgent' ? 'text-destructive' : ev.type === 'reunion' ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{ev.titre}</p>
                    <p className="text-xs text-muted-foreground">{ev.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── INSCRIPTIONS ── */}
          <TabsContent value="inscriptions" className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Rechercher élève, dossier..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filterInscription} onValueChange={setFilterInscription}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="complete">Complète</SelectItem>
                  <SelectItem value="attente_docs">Docs manquants</SelectItem>
                  <SelectItem value="attente_paiement">Paiement dû</SelectItem>
                  <SelectItem value="annule">Annulée</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="gap-1"><Download className="h-4 w-4" />Export</Button>
              <Button size="sm" className="gap-1 ml-auto" onClick={() => setShowNewInscriptionModal(true)}>
                <UserPlus className="h-4 w-4" />Nouvelle inscription
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['complete', 'attente_docs', 'attente_paiement', 'annule'].map(status => (
                <div key={status} className={`p-3 rounded-lg text-center ${inscriptionStatusStyle[status]}`}>
                  <p className="text-2xl font-bold font-mono">{inscriptionsList.filter(i => i.status === status).length}</p>
                  <p className="text-xs mt-0.5">{inscriptionStatusLabel[status]}</p>
                </div>
              ))}
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className="text-left p-3 font-semibold">N° Dossier</th>
                        <th className="text-left p-3 font-semibold">Élève</th>
                        <th className="text-left p-3 font-semibold">Classe / Cycle</th>
                        <th className="text-left p-3 font-semibold">Date</th>
                        <th className="text-left p-3 font-semibold">Frais</th>
                        <th className="text-left p-3 font-semibold">Payé</th>
                        <th className="text-left p-3 font-semibold">Documents</th>
                        <th className="text-left p-3 font-semibold">Statut</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInscriptions.map(ins => (
                        <tr key={ins.id} className="border-b hover:bg-muted/20 transition-colors">
                          <td className="p-3 font-mono text-xs text-muted-foreground">{ins.id}</td>
                          <td className="p-3 font-medium">{ins.student}</td>
                          <td className="p-3">
                            <p className="font-medium">{ins.classe}</p>
                            <p className="text-xs text-muted-foreground">{ins.cycle}</p>
                          </td>
                          <td className="p-3 text-xs">{formatDate(ins.date)}</td>
                          <td className="p-3 font-mono text-xs">{formatCurrency(ins.frais)}</td>
                          <td className="p-3">
                            <p className={`font-mono text-xs font-bold ${ins.paye >= ins.frais ? 'text-green-600' : 'text-destructive'}`}>{formatCurrency(ins.paye)}</p>
                            {ins.paye < ins.frais && (
                              <Progress value={(ins.paye / ins.frais) * 100} className="h-1 mt-1 w-16" />
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {ins.docs.map((d: string) => <span key={d} className="text-xs bg-success/20 text-green-700 px-1 py-0.5 rounded">{d}</span>)}
                              {(ins as { docsManquants?: string[] }).docsManquants?.map((d: string) => <span key={d} className="text-xs bg-destructive/10 text-destructive px-1 py-0.5 rounded">{d}?</span>)}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inscriptionStatusStyle[ins.status]}`}>
                              {inscriptionStatusLabel[ins.status]}
                            </span>
                          </td>
                          <td className="p-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem><Eye className="mr-2 h-4 w-4" />Voir dossier</DropdownMenuItem>
                                <DropdownMenuItem><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                                <DropdownMenuItem><Printer className="mr-2 h-4 w-4" />Imprimer reçu</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Annuler</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PAIEMENTS ── */}
          <TabsContent value="paiements" className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Nom élève, matricule..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filterPaiement} onValueChange={setFilterPaiement}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="paye">Payé</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" className="gap-1 ml-auto" onClick={() => setShowPaiementModal(true)}>
                <Plus className="h-4 w-4" />Enregistrer paiement
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total encaissé', value: formatCurrency(totalPaiements), color: 'text-green-700', bg: 'bg-success/10' },
                { label: 'Impayés', value: formatCurrency(pendingPaiements), color: 'text-destructive', bg: 'bg-destructive/10' },
                { label: 'Transactions', value: paymentsList.filter(p => p.status === 'paye').length, color: 'text-primary', bg: 'bg-primary/10' },
                { label: 'En attente', value: paymentsList.filter(p => p.status === 'en_attente').length, color: 'text-yellow-700', bg: 'bg-warning/10' },
              ].map(s => (
                <div key={s.label} className={`p-3 rounded-xl text-center ${s.bg}`}>
                  <p className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className="text-left p-3 font-semibold">Réf.</th>
                        <th className="text-left p-3 font-semibold">Élève</th>
                        <th className="text-left p-3 font-semibold">Matricule</th>
                        <th className="text-left p-3 font-semibold">Type</th>
                        <th className="text-left p-3 font-semibold">Montant</th>
                        <th className="text-left p-3 font-semibold">Mode</th>
                        <th className="text-left p-3 font-semibold">Date</th>
                        <th className="text-left p-3 font-semibold">Date d'acquittement</th>
                        <th className="text-left p-3 font-semibold">Statut</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPaiements.map(p => (
                        <tr key={p.id} className="border-b hover:bg-muted/20 transition-colors">
                          <td className="p-3 font-mono text-xs text-muted-foreground">{p.recu || p.id}</td>
                          <td className="p-3 font-medium">{p.eleve}</td>
                          <td className="p-3 font-mono text-xs">{p.matricule}</td>
                          <td className="p-3 text-xs">{p.type}</td>
                          <td className="p-3 font-mono font-bold text-green-700">{formatCurrency(p.montant)}</td>
                          <td className="p-3 text-xs">
                            <span className="flex items-center gap-1">
                              {p.mode.includes('Money') || p.mode === 'Wave' ? <Smartphone className="h-3 w-3" /> : <DollarSign className="h-3 w-3" />}
                              {p.mode}
                            </span>
                          </td>
                          <td className="p-3 text-xs">{formatDate(p.date)}</td>
                          <td className="p-3 text-xs text-emerald-700 font-medium">{p.date_acquittement ? formatDate(p.date_acquittement) : (p.status === 'paye' ? formatDate(p.date) : '—')}</td>
                          <td className="p-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status === 'paye' ? 'bg-success/20 text-green-700' : 'bg-warning/20 text-yellow-700'}`}>
                              {p.status === 'paye' ? '✓ Payé' : '⏳ En attente'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              {p.recu && <Button variant="ghost" size="icon" className="h-6 w-6"><Printer className="h-3 w-3" /></Button>}
                              {p.status === 'en_attente' && <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600"><Check className="h-3 w-3" /></Button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── COURRIERS ── */}
          <TabsContent value="courriers" className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button variant={filterInscription === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilterInscription('all')}>Tous</Button>
                <Button variant="outline" size="sm">Entrants</Button>
                <Button variant="outline" size="sm">Sortants</Button>
              </div>
              <Button size="sm" className="gap-1" onClick={() => setShowNewCourrier(true)}>
                <Plus className="h-4 w-4" />Nouveau courrier
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {courriersList.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      Aucun courrier enregistré.
                    </div>
                  ) : (
                    courriersList.map(c => (
                      <div key={c.id} className="flex items-start gap-4 p-4 hover:bg-muted/20 transition-colors">
                        <div className={`p-2 rounded-xl flex-shrink-0 ${c.type === 'entrant' ? 'bg-blue-100' : 'bg-green-100'}`}>
                          {c.type === 'entrant' ?
                            <Download className="h-4 w-4 text-blue-600" /> :
                            <Send className="h-4 w-4 text-green-600" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <p className="font-medium text-sm">{c.objet}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {c.type === 'entrant' ? 'De' : 'À'} : {c.expediteur}
                                <span className="mx-2">·</span>
                                Réf : <span className="font-mono">{c.ref}</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-xs font-bold ${prioriteStyle[c.priorite]}`}>● {c.priorite}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${courStatutStyle[c.status]}`}>
                                {c.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground">{formatDate(c.date)}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── STOCKS ── */}
          <TabsContent value="stocks" className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Gestion des stocks — Fournitures & Matériel</h2>
              <Button size="sm" className="gap-1" onClick={handleAddStock}><Plus className="h-4 w-4" />Ajouter article</Button>
            </div>

            {/* Alerte stocks bas */}
            {stocksList.filter(s => s.quantite <= s.seuil).length > 0 && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                <p className="text-sm font-medium text-destructive">
                  {stocksList.filter(s => s.quantite <= s.seuil).length} article(s) en dessous du seuil minimal — Commander en urgence
                </p>
              </div>
            )}

            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="text-left p-3 font-semibold">Article</th>
                      <th className="text-left p-3 font-semibold">Catégorie</th>
                      <th className="text-center p-3 font-semibold">Quantité</th>
                      <th className="text-center p-3 font-semibold">Seuil min.</th>
                      <th className="text-left p-3 font-semibold">État</th>
                      <th className="text-left p-3 font-semibold">Fournisseur</th>
                      <th className="text-right p-3 font-semibold">Prix unitaire</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {stocksList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center p-8 text-muted-foreground text-sm">
                          Aucun article en stock.
                        </td>
                      </tr>
                    ) : (
                      stocksList.map((s, i) => {
                        const isLow = s.quantite <= s.seuil;
                        const pct = Math.min((s.quantite / (s.seuil * 2)) * 100, 100);
                        return (
                          <tr key={s.id} className={`border-b hover:bg-muted/20 transition-colors ${isLow ? 'bg-destructive/5' : i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                            <td className="p-3 font-medium">{s.article}</td>
                            <td className="p-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${s.categorie === 'Islamique' ? 'bg-green-100 text-green-700' : s.categorie === 'Pédagogie' ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'}`}>
                                {s.categorie}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`font-bold font-mono text-lg ${isLow ? 'text-destructive' : 'text-foreground'}`}>{s.quantite}</span>
                            </td>
                            <td className="p-3 text-center text-muted-foreground font-mono">{s.seuil}</td>
                            <td className="p-3 w-28">
                              <Progress value={pct} className={`h-2 ${isLow ? '[&>div]:bg-destructive' : ''}`} />
                              <p className="text-xs text-muted-foreground mt-0.5">{isLow ? '⚠ Stock bas' : '✓ OK'}</p>
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">{s.fournisseur}</td>
                            <td className="p-3 text-right font-mono text-xs">{formatCurrency(s.prix)}</td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="h-3.5 w-3.5" /></Button>
                                {isLow && <Button variant="ghost" size="icon" className="h-7 w-7 text-primary"><RefreshCw className="h-3.5 w-3.5" /></Button>}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ── TCHES ── */}
          <TabsContent value="taches" className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {['a_faire', 'en_cours', 'termine'].map(status => (
                  <div key={status} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${tacheStatutStyle[status]}`}>
                    {tachesList.filter(t => t.status === status).length} {status.replace('_', ' ')}
                  </div>
                ))}
              </div>
              <Button size="sm" className="gap-1" onClick={() => setShowNewTache(true)}>
                <Plus className="h-4 w-4" />Nouvelle tâche
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {tachesList.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      Aucune tâche enregistrée.
                    </div>
                  ) : (
                    tachesList.map(t => {
                      const isOverdue = t.status !== 'termine' && t.echeance < new Date();
                      return (
                        <div key={t.id} className={`flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors ${isOverdue ? 'bg-destructive/5' : ''}`}>
                          <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${t.priorite === 'haute' ? 'bg-destructive' : t.priorite === 'moyenne' ? 'bg-warning' : 'bg-muted-foreground'}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${t.status === 'termine' ? 'line-through text-muted-foreground' : ''}`}>{t.titre}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-xs text-muted-foreground">→ {t.assignee}</span>
                              <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                                <Clock className="h-3 w-3" />{isOverdue ? '⚠ ' : ''}{formatDate(t.echeance)}
                              </span>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${tacheStatutStyle[t.status]}`}>
                            {t.status.replace('_', ' ')}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleCompleteTache(t.id)}><Check className="mr-2 h-4 w-4 text-green-600" />Marquer terminé</DropdownMenuItem>
                              <DropdownMenuItem><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ATTRIBUTIONS ── */}
          <TabsContent value="attributions" className="mt-5 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      Attribution des matières
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Gérez l'affectation des matières, des classes et des horaires aux enseignants — {attributionsList.length} attribution(s) active(s)
                    </p>
                  </div>
                  <Dialog open={showNewAttributionModal} onOpenChange={setShowNewAttributionModal}>
                    <Button className="gap-2" onClick={() => {
                      setAttrClasseId('');
                      setAttrEnseignantId('');
                      setAttrMatiereId('');
                      setAttrJour('Lundi');
                      setAttrHeure('');
                      setAttrSalle('');
                      setAttrGroupe('Classe entière');
                      setCustomGroupe('');
                      setShowNewAttributionModal(true);
                    }}>
                      <Plus className="h-4 w-4" />
                      Nouvelle attribution
                    </Button>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Nouvelle attribution de cours</DialogTitle>
                        <p className="text-sm text-muted-foreground">Sélectionnez les détails pour affecter un cours.</p>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-1">
                          <Label>Enseignant *</Label>
                          <Select value={attrEnseignantId} onValueChange={setAttrEnseignantId}>
                            <SelectTrigger><SelectValue placeholder="Choisir un enseignant" /></SelectTrigger>
                            <SelectContent>
                              {staff.filter(s => s.fonction === 'enseignant' || s.fonction === 'coranique').map(t => (
                                <SelectItem key={t.id} value={String(t.id)}>{formatStudentName(t)} ({t.fonction})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label>Classe *</Label>
                            <Select value={attrClasseId} onValueChange={setAttrClasseId}>
                              <SelectTrigger><SelectValue placeholder="Choisir une classe" /></SelectTrigger>
                              <SelectContent>
                                {classes.map(c => (
                                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label>Matière *</Label>
                            <Select value={attrMatiereId} onValueChange={setAttrMatiereId}>
                              <SelectTrigger><SelectValue placeholder="Choisir une matière" /></SelectTrigger>
                              <SelectContent>
                                {subjectsList.map(m => {
                                  const parent = m.parent_id ? subjectsList.find(p => String(p.id) === String(m.parent_id)) : null;
                                  return (
                                    <SelectItem key={m.id} value={String(m.id)}>
                                      {parent ? `${parent.libelle} - ${m.libelle}` : m.libelle}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label>Jour *</Label>
                            <Select value={attrJour} onValueChange={setAttrJour}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map(day => (
                                  <SelectItem key={day} value={day}>{day}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label>Heure *</Label>
                            <Input placeholder="ex: 08:00 - 10:00" value={attrHeure} onChange={(e) => setAttrHeure(e.target.value)} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label>Saisie assistée (Début / Fin par pas de 30 min)</Label>
                          <div className="flex gap-2 items-center">
                            <Select onValueChange={(startVal) => {
                              const endVal = attrHeure.split('-')[1]?.trim() || '10:00';
                              setAttrHeure(`${startVal} - ${endVal}`);
                            }}>
                              <SelectTrigger className="w-full text-xs h-9">
                                <SelectValue placeholder="Début" />
                              </SelectTrigger>
                              <SelectContent>
                                {['07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'].map(t => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-muted-foreground text-xs">à</span>
                            <Select onValueChange={(endVal) => {
                              const startVal = attrHeure.split('-')[0]?.trim() || '08:00';
                              setAttrHeure(`${startVal} - ${endVal}`);
                            }}>
                              <SelectTrigger className="w-full text-xs h-9">
                                <SelectValue placeholder="Fin" />
                              </SelectTrigger>
                              <SelectContent>
                                {['07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'].map(t => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label>Salle</Label>
                          <Select value={attrSalle} onValueChange={setAttrSalle}>
                            <SelectTrigger><SelectValue placeholder="Choisir une salle (optionnel)" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Aucune salle</SelectItem>
                              {sallesList.map(salle => (
                                <SelectItem key={salle.id} value={salle.code}>{salle.libelle} ({salle.code})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label>Groupe ciblé</Label>
                            <Select value={attrGroupe} onValueChange={setAttrGroupe}>
                              <SelectTrigger><SelectValue placeholder="Choisir le groupe" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Classe entière">Classe entière</SelectItem>
                                <SelectItem value="Garçons">Garçons</SelectItem>
                                <SelectItem value="Filles">Filles</SelectItem>
                                <SelectItem value="Espagnol">Espagnol (LV2)</SelectItem>
                                <SelectItem value="Allemand">Allemand (LV2)</SelectItem>
                                <SelectItem value="Autre">Autre (Saisie libre)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {attrGroupe === 'Autre' && (
                            <div className="space-y-1">
                              <Label>Nom du groupe</Label>
                              <Input placeholder="Nom du groupe" value={customGroupe} onChange={(e) => setCustomGroupe(e.target.value)} />
                            </div>
                          )}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewAttributionModal(false)}>Annuler</Button>
                        <Button onClick={handleCreateAttribution}>Valider</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {attributionsList.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">Aucune attribution active</p>
                    <p className="text-sm mt-1">Cliquez sur «&nbsp;Nouvelle attribution&nbsp;» pour attribuer un cours.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border bg-muted/40">
                        <tr>
                          <th className="text-left p-3 font-semibold">Enseignant</th>
                          <th className="text-left p-3 font-semibold">Classe</th>
                          <th className="text-left p-3 font-semibold">Matière</th>
                          <th className="text-left p-3 font-semibold">Groupe</th>
                          <th className="text-left p-3 font-semibold">Jour / Créneau</th>
                          <th className="text-left p-3 font-semibold">Salle</th>
                          <th className="p-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {attributionsList.map(attr => {
                          const teacher = staff.find(s => String(s.id) === String(attr.enseignant_id));
                          const cls = classes.find(c => String(c.id) === String(attr.classe_id));
                          const subj = subjectsList.find(m => String(m.id) === String(attr.matiere_id));
                          
                          // Parent subject check
                          let subjectText = subj ? subj.libelle : `Matière #${attr.matiere_id}`;
                          if (subj && subj.parent_id) {
                            const p = subjectsList.find(s => String(s.id) === String(subj.parent_id));
                            if (p) subjectText = `${p.libelle} (${subj.libelle})`;
                          }

                          return (
                            <tr key={attr.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                              <td className="p-3 font-medium">
                                {teacher ? `${formatStudentName(teacher)}` : `Enseignant #${attr.enseignant_id}`}
                              </td>
                              <td className="p-3 font-medium">
                                {cls ? cls.name : `Classe #${attr.classe_id}`}
                              </td>
                              <td className="p-3">
                                <Badge variant="secondary">{subjectText}</Badge>
                              </td>
                              <td className="p-3">
                                <Badge variant={attr.groupe && attr.groupe !== 'Classe entière' ? 'secondary' : 'outline'} className="text-xs">
                                  {attr.groupe || 'Classe entière'}
                                </Badge>
                              </td>
                              <td className="p-3">
                                {attr.jour} · <span className="font-mono text-xs">{attr.heure}</span>
                              </td>
                              <td className="p-3 text-muted-foreground">{attr.salle && attr.salle !== 'none' ? attr.salle : '—'}</td>
                              <td className="p-3 text-right">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteAttribution(attr.id)}>
                                  <Trash2 className="h-4 w-4" />
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

          {/* ── SALLES ── */}
          <TabsContent value="salles" className="mt-5 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <DoorOpen className="h-5 w-5 text-primary" />
                      Gestion des salles
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Salles de classe, laboratoires, salles spécialisées — {sallesList.length} salle(s) enregistrée(s)
                    </p>
                  </div>
                  <Dialog open={showSalleModal} onOpenChange={setShowSalleModal}>
                    <Button className="gap-2" onClick={() => {
                      resetSalleForm();
                      setShowSalleModal(true);
                    }}>
                      <Plus className="h-4 w-4" />
                      Ajouter une salle
                    </Button>
                    <DialogContent className="sm:max-w-[560px]">
                      <DialogHeader>
                        <DialogTitle>{salleToEdit ? "Modifier la salle" : "Nouvelle salle"}</DialogTitle>
                        <p className="text-sm text-muted-foreground">Renseignez les informations de la salle physique.</p>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-4 py-4 max-h-[65vh] overflow-y-auto px-1">
                        <div className="space-y-1">
                          <Label htmlFor="salle-code">Code *</Label>
                          <Input id="salle-code" placeholder="ex: S101" value={salleCode} onChange={e => setSalleCode(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="salle-libelle">Libellé *</Label>
                          <Input id="salle-libelle" placeholder="ex: Salle 101" value={salleLibelle} onChange={e => setSalleLibelle(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label>Type de salle</Label>
                          <Select value={salleType} onValueChange={setSalleType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="classe">Salle de classe</SelectItem>
                              <SelectItem value="laboratoire">Laboratoire</SelectItem>
                              <SelectItem value="salle_priere">Salle de prière</SelectItem>
                              <SelectItem value="bureau">Bureau</SelectItem>
                              <SelectItem value="polyvalente">Salle polyvalente</SelectItem>
                              <SelectItem value="informatique">Salle informatique</SelectItem>
                              <SelectItem value="autre">Autre</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="salle-capacite">Capacité (élèves)</Label>
                          <Input id="salle-capacite" type="number" min={1} value={salleCapacite} onChange={e => setSalleCapacite(Number(e.target.value))} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="salle-etage">Étage (0 = RDC)</Label>
                          <Input id="salle-etage" type="number" min={0} value={salleEtage} onChange={e => setSalleEtage(Number(e.target.value))} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="salle-batiment">Bâtiment</Label>
                          <Input id="salle-batiment" placeholder="ex: Bâtiment A" value={salleBatiment} onChange={e => setSalleBatiment(e.target.value)} />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label>Établissement</Label>
                          <Select value={salleEcoleId} onValueChange={salleEcoleId => setSalleEcoleId(salleEcoleId)}>
                            <SelectTrigger><SelectValue placeholder="Tous les établissements" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Aucun établissement</SelectItem>
                              {schools.map(s => (
                                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label htmlFor="salle-desc">Description</Label>
                          <Input id="salle-desc" placeholder="Observations, équipements..." value={salleDescription} onChange={e => setSalleDescription(e.target.value)} />
                        </div>
                        <div className="col-span-2 flex items-center gap-3">
                          <Checkbox id="salle-dispo" checked={salleDisponible} onCheckedChange={(checked: boolean | "indeterminate") => setSalleDisponible(checked === true)} />
                          <Label htmlFor="salle-dispo" className="cursor-pointer">Salle disponible</Label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => { resetSalleForm(); setShowSalleModal(false); }}>Annuler</Button>
                        <Button onClick={salleToEdit ? handleSaveSalle : handleCreateSalle}>{salleToEdit ? "Enregistrer" : "Créer la salle"}</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {sallesList.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <DoorOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">Aucune salle enregistrée</p>
                    <p className="text-sm mt-1">Cliquez sur «&nbsp;Ajouter une salle&nbsp;» pour commencer.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border bg-muted/40">
                        <tr>
                          <th className="text-left p-3 font-semibold">Code</th>
                          <th className="text-left p-3 font-semibold">Libellé</th>
                          <th className="text-left p-3 font-semibold">Type</th>
                          <th className="text-center p-3 font-semibold">Capacité</th>
                          <th className="text-center p-3 font-semibold">Étage</th>
                          <th className="text-left p-3 font-semibold">Bâtiment</th>
                          <th className="text-left p-3 font-semibold">Établissement</th>
                          <th className="text-left p-3 font-semibold">Statut</th>
                          <th className="p-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sallesList.map(salle => {
                          const sch = schools.find(s => String(s.id) === String(salle.ecole_id));
                          const typeLabels: Record<string, string> = {
                            classe: 'Classe', laboratoire: 'Labo', salle_priere: 'Prière',
                            bureau: 'Bureau', polyvalente: 'Polyvalente', informatique: 'Informatique', autre: 'Autre',
                          };
                          return (
                            <tr key={salle.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                              <td className="p-3 font-mono font-semibold text-primary">{salle.code}</td>
                              <td className="p-3 font-medium">{salle.libelle}</td>
                              <td className="p-3">
                                <Badge variant="secondary">{typeLabels[salle.type_salle] || salle.type_salle}</Badge>
                              </td>
                              <td className="p-3 text-center">{salle.capacite}</td>
                              <td className="p-3 text-center">{salle.etage === 0 ? 'RDC' : `${salle.etage}e`}</td>
                              <td className="p-3 text-muted-foreground">{salle.batiment || '—'}</td>
                              <td className="p-3 text-sm text-muted-foreground">{sch ? sch.name.replace('École Confessionnelle HINNEH ', '') : '—'}</td>
                              <td className="p-3">
                                <Badge variant={salle.disponible ? 'default' : 'outline'}>
                                  {salle.disponible ? 'Disponible' : 'Indisponible'}
                                </Badge>
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex gap-1 justify-end">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditSalle(salle)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteSalle(salle.id)}>
                                    <Trash2 className="h-4 w-4" />
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

          {/* ── ARCHIVES ── */}
          <TabsContent value="archives" className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Centre d'Archives & Documentation</h2>
              <Button variant="outline" size="sm" className="gap-1" onClick={handleAddArchive}><Plus className="h-4 w-4" />Ajouter document</Button>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {[
                { cat: 'Dossiers Élèves', count: archiveCounts['Dossiers Élèves'], icon: Users, color: 'primary', desc: 'Dossiers actifs & archives' },
                { cat: 'Dossiers Personnel', count: archiveCounts['Dossiers Personnel'], icon: Briefcase, color: 'purple', desc: 'Contrats & évaluations' },
                { cat: 'Bulletins Scolaires', count: archiveCounts['Bulletins Scolaires'], icon: FileText, color: 'success', desc: 'T1, T2, T3 — toutes années' },
                { cat: 'Procès Verbaux', count: archiveCounts['Procès Verbaux'], icon: ClipboardList, color: 'warning', desc: 'Réunions & délibérations' },
                { cat: 'Correspondances', count: archiveCounts['Correspondances'], icon: Mail, color: 'primary', desc: 'Courriers entrants & sortants' },
                { cat: 'Documents Officiels', count: archiveCounts['Documents Officiels'], icon: Shield, color: 'destructive', desc: 'Autorisations, agréments' },
              ].map(a => {
                const colorMap: Record<string, string> = {
                  primary: 'text-primary bg-primary/10',
                  purple: 'text-purple-600 bg-purple-100',
                  success: 'text-green-600 bg-success/10',
                  warning: 'text-yellow-600 bg-warning/10',
                  destructive: 'text-destructive bg-destructive/10',
                };
                return (
                  <Card key={a.cat} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-xl ${colorMap[a.color]}`}>
                          <a.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold">{a.cat}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                          <p className="text-2xl font-bold font-mono mt-2">{a.count}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs"><Eye className="h-3 w-3" />Consulter</Button>
                        <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs"><Download className="h-3 w-3" />Exporter</Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Recherche documentaire */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />Recherche documentaire
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Nom élève, matricule, date, type de document..." />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous types</SelectItem>
                      <SelectItem value="eleve">Dossier élève</SelectItem>
                      <SelectItem value="bulletin">Bulletin</SelectItem>
                      <SelectItem value="courrier">Courrier</SelectItem>
                      <SelectItem value="pv">Procès verbal</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="gap-1"><Search className="h-4 w-4" />Rechercher</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── MESSAGES ── */}
          <TabsContent value="messages" className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Messagerie interne</h2>
              <Button size="sm" className="gap-1" onClick={() => setShowMessageModal(true)}>
                <Send className="h-4 w-4" />Nouveau message
              </Button>
            </div>

            <div className="grid md:grid-cols-5 gap-4">
              <div className="md:col-span-2 space-y-2">
                {messagesList.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm border rounded-xl">
                    Aucun message dans votre boîte de réception.
                  </div>
                ) : (
                  messagesList.map(m => (
                    <motion.div
                      key={m.id}
                      onClick={() => setSelectedMessage(m)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all hover:border-primary/40 ${selectedMessage?.id === m.id ? 'border-primary bg-primary/5' : 'border-border'} ${!m.read ? 'border-l-4 border-l-primary' : ''}`}
                      whileHover={{ x: 2 }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${!m.read ? 'font-bold' : 'font-medium'}`}>{m.from}</p>
                          <p className="text-xs text-muted-foreground truncate">{m.subject}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-xs text-muted-foreground">{formatDate(m.date)}</span>
                          {!m.read && <span className="h-2 w-2 bg-primary rounded-full" />}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
              <div className="md:col-span-3">
                {selectedMessage ? (
                  <Card>
                    <CardHeader className="border-b pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{selectedMessage.subject}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">De : <span className="font-medium">{selectedMessage.from}</span> — {formatDate(selectedMessage.date)}</p>
                        </div>
                        <Button variant="outline" size="sm" className="gap-1"><Send className="h-4 w-4" />Répondre</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <p className="text-sm leading-relaxed">{selectedMessage.content}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="h-48 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Inbox className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Sélectionnez un message</p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal Nouvelle Inscription */}
      <Dialog open={showNewInscriptionModal} onOpenChange={setShowNewInscriptionModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />Nouvelle inscription
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div><Label>Nom *</Label><Input className="mt-1" placeholder="Nom de famille" value={insNom} onChange={e => setInsNom(e.target.value)} /></div>
            <div><Label>Prénom *</Label><Input className="mt-1" placeholder="Prénom de l'élève" value={insPrenom} onChange={e => setInsPrenom(e.target.value)} /></div>
            <div><Label>Date de naissance</Label><Input type="date" className="mt-1" value={insDob} onChange={e => setInsDob(e.target.value)} /></div>
            <div>
              <Label>Genre</Label>
              <Select value={insGenre} onValueChange={setInsGenre}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculin</SelectItem>
                  <SelectItem value="F">Féminin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Classe</Label>
              <Select value={insClasseId} onValueChange={setInsClasseId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner la classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls: any) => (
                    <SelectItem key={cls.id} value={String(cls.id)}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Nom du parent *</Label><Input className="mt-1" placeholder="Nom parent/tuteur" value={insParentNom} onChange={e => setInsParentNom(e.target.value)} /></div>
            <div><Label>Téléphone parent *</Label><Input className="mt-1" placeholder="+225 07 XX XX XX" value={insParentPhone} onChange={e => setInsParentPhone(e.target.value)} /></div>
            <div><Label>Email parent</Label><Input className="mt-1" placeholder="parent@email.com" value={insParentEmail} onChange={e => setInsParentEmail(e.target.value)} /></div>
            <div className="col-span-2 border-t pt-3 mt-1">
              <Label className="text-sm font-semibold">Statuts & Prise en charge</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={insBoursier}
                    onChange={e => setInsBoursier(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  Boursier
                </label>
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={insAffecte}
                    onChange={e => setInsAffecte(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  Affecté par l'État
                </label>
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={insPriseEnCharge}
                    onChange={e => setInsPriseEnCharge(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  Prise en charge
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewInscriptionModal(false)}>Annuler</Button>
            <Button onClick={handleSaveInscription} className="gap-1"><Save className="h-4 w-4" />Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Paiement */}
      <Dialog open={showPaiementModal} onOpenChange={setShowPaiementModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />Enregistrer un paiement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Élève *</Label>
              <Select value={payStudentId} onValueChange={setPayStudentId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner l'élève" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((std: any) => (
                    <SelectItem key={std.id} value={String(std.id)}>
                      {formatStudentName(std)} ({std.matricule})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type de paiement</Label>
                <Select value={payType} onValueChange={setPayType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scolarite">Scolarité</SelectItem>
                    <SelectItem value="inscription">Inscription</SelectItem>
                    <SelectItem value="cantine">Cantine</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Montant (FCFA)</Label><Input type="number" className="mt-1" placeholder="75000" value={payMontant} onChange={e => setPayMontant(e.target.value)} /></div>
            </div>
            <div>
              <Label>Mode de paiement</Label>
              <Select value={payMode} onValueChange={setPayMode}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="especes">💵 Espèces</SelectItem>
                  <SelectItem value="orange_money">📱 Orange Money</SelectItem>
                  <SelectItem value="wave">🌊 Wave</SelectItem>
                  <SelectItem value="virement">🏦 Virement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Référence / N° transaction</Label><Input className="mt-1" placeholder="Ex: OM-2026-XXXX" value={payTransaction} onChange={e => setPayTransaction(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaiementModal(false)}>Annuler</Button>
            <Button onClick={handleSavePaiement} className="gap-1"><Check className="h-4 w-4" />Valider le paiement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Message */}
      <Dialog open={showMessageModal} onOpenChange={setShowMessageModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-primary" />Nouveau message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Destinataire</Label>
              <Select defaultValue="direction">
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="direction">Direction Fondation</SelectItem>
                  <SelectItem value="direction_ecole">Direction de l'école</SelectItem>
                  <SelectItem value="enseignant">Enseignant</SelectItem>
                  <SelectItem value="parent">Parent d'élève</SelectItem>
                  <SelectItem value="finance">Service Financier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Objet</Label><Input className="mt-1" placeholder="Objet du message..." /></div>
            <div><Label>Message</Label><Textarea className="mt-1" rows={5} placeholder="Votre message..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMessageModal(false)}>Annuler</Button>
            <Button onClick={() => setShowMessageModal(false)} className="gap-1"><Send className="h-4 w-4" />Envoyer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Nouveau Courrier */}
      <Dialog open={showNewCourrier} onOpenChange={setShowNewCourrier}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Nouveau courrier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={courType} onValueChange={setCourType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrant">📥 Entrant</SelectItem>
                    <SelectItem value="sortant">📤 Sortant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priorité</Label>
                <Select value={courPriorite} onValueChange={setCourPriorite}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="haute">🔴 Haute</SelectItem>
                    <SelectItem value="normale">🟡 Normale</SelectItem>
                    <SelectItem value="basse">🟢 Basse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Objet *</Label><Input className="mt-1" placeholder="Objet du courrier..." value={courObjet} onChange={e => setCourObjet(e.target.value)} /></div>
            <div><Label>Expéditeur / Destinataire</Label><Input className="mt-1" placeholder="Nom ou organisation..." value={courExpDest} onChange={e => setCourExpDest(e.target.value)} /></div>
            <div><Label>Description</Label><Textarea className="mt-1" rows={3} placeholder="Résumé du courrier..." value={courDesc} onChange={e => setCourDesc(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCourrier(false)}>Annuler</Button>
            <Button onClick={handleSaveCourrier} className="gap-1"><Save className="h-4 w-4" />Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Nouvelle Tâche */}
      <Dialog open={showNewTache} onOpenChange={setShowNewTache}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckSquare className="h-5 w-5 text-primary" />Nouvelle tâche</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Titre *</Label><Input className="mt-1" placeholder="Description de la tâche..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priorité</Label>
                <Select defaultValue="moyenne">
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="haute">🔴 Haute</SelectItem>
                    <SelectItem value="moyenne">🟡 Moyenne</SelectItem>
                    <SelectItem value="basse">🟢 Basse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Échéance</Label><Input type="date" className="mt-1" /></div>
            </div>
            <div><Label>Assignée à</Label><Input className="mt-1" placeholder="Prénom Nom..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTache(false)}>Annuler</Button>
            <Button onClick={() => setShowNewTache(false)} className="gap-1"><Save className="h-4 w-4" />Créer la tâche</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
