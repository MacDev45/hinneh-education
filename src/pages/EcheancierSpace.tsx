import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar, DollarSign, Users, AlertTriangle, CheckCircle2,
  Clock, Search, Plus, Filter, Printer, MessageSquare,
  ChevronRight, RefreshCw, Send, ArrowUpRight, ShieldAlert,
  Percent, FileText, Sparkles, BookOpen, Layers, Check, Trash2, Edit3, ChevronsUpDown
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/index';
import { cn } from '@/lib/utils';
import apiClient from '@/lib/apiClient';
import { setGrillePresets, scopeKeyForSchool, parseNiveau } from '@/lib/grilleTarifaire';
import { printReceipt } from '@/lib/receiptPrinter';
import { getRealSchoolName } from '@/lib/certificatePrinter';

export default function EcheancierSpace() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [echeances, setEcheances] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [hinnehPresets, setHinnehPresets] = useState<any[]>([]);
  
  const userEcoleId = typeof localStorage !== 'undefined' ? localStorage.getItem("user_ecole_id") : null;
  const userCode = typeof localStorage !== 'undefined' ? (localStorage.getItem("user_ecole_code") || localStorage.getItem("code_etablissement")) : null;
  const userVille = typeof localStorage !== 'undefined' ? localStorage.getItem("user_ville") : null;
  const userRole = (typeof localStorage !== 'undefined' ? localStorage.getItem("user_role") || "" : "").toLowerCase();
  const isGlobal = userRole === "superuser" || userRole === "superviseur" || userRole === "direction_fondation";

  const initialSchoolFilter = (!isGlobal && userEcoleId && userEcoleId !== 'null' && userEcoleId !== 'undefined') ? userEcoleId : 'all';

  const [search, setSearch] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<string>(initialSchoolFilter);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Dialog state for payment versement
  const [openPayModal, setOpenPayModal] = useState(false);
  const [selectedEcheance, setSelectedEcheance] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('especes');
  const [payTxNumber, setPayTxNumber] = useState('');
  const [submittingPay, setSubmittingPay] = useState(false);

  // Dialog state for schedule generation (Custom or Hînneh Preset)
  const [openGenModal, setOpenGenModal] = useState(false);
  const [genTarget, setGenTarget] = useState<'class' | 'niveau'>('class');
  const [genClassId, setGenClassId] = useState('');
  const [genNiveau, setGenNiveau] = useState('');
  const [genStudentId, setGenStudentId] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [genAmount, setGenAmount] = useState('150000');
  const [genTranches, setGenTranches] = useState('3');
  const [genStartDate, setGenStartDate] = useState('2026-09-05');
  const [genStatutAffectation, setGenStatutAffectation] = useState<'AFF' | 'NAFF'>('AFF');
  const [generating, setGenerating] = useState(false);

  // Dialog state for adding single custom installment
  const [openAddModal, setOpenAddModal] = useState(false);
  const [addStudentPopoverOpen, setAddStudentPopoverOpen] = useState(false);
  const [addStudentId, setAddStudentId] = useState('');
  const [addLibelle, setAddLibelle] = useState('');
  const [addTrancheNum, setAddTrancheNum] = useState('1');
  const [addMontant, setAddMontant] = useState('');
  const [addDueDate, setAddDueDate] = useState('');
  const [adding, setAdding] = useState(false);

  // Dialog state for edit écheance
  const [openEditModal, setOpenEditModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editLibelle, setEditLibelle] = useState('');
  const [editMontant, setEditMontant] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editTranche, setEditTranche] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [openPresetEditModal, setOpenPresetEditModal] = useState(false);
  const [presetToEdit, setPresetToEdit] = useState<any>(null);
  const [activePresetTab, setActivePresetTab] = useState<'scolarite' | 'transport' | 'cantine'>('scolarite');
  const [presetServiceType, setPresetServiceType] = useState<'scolarite' | 'transport' | 'cantine'>('scolarite');
  const [presetLabel, setPresetLabel] = useState('');
  const [presetCycle, setPresetCycle] = useState('');
  const [presetNiveaux, setPresetNiveaux] = useState('');
  const [presetZoneTrajet, setPresetZoneTrajet] = useState('');
  const [presetPeriodicite, setPresetPeriodicite] = useState('mensuel');
  const [presetTranches, setPresetTranches] = useState<Array<{ libelle: string; montant: string; date: string }>>([]);
  const [presetStatutAffectation, setPresetStatutAffectation] = useState<'AFF' | 'NAFF'>('AFF');
  const [savingPreset, setSavingPreset] = useState(false);
  const [deletingPresetId, setDeletingPresetId] = useState<string | null>(null);
  const [openPurgeModal, setOpenPurgeModal] = useState(false);
  const [purging, setPurging] = useState(false);
  const [realigning, setRealigning] = useState(false);
  const [niveauAGenerer, setNiveauAGenerer] = useState('');

  const handlePurgeUnpaid = async () => {
    setPurging(true);
    try {
      const effSchoolId = selectedSchool !== 'all' ? Number(selectedSchool) : (!isGlobal && userEcoleId ? Number(userEcoleId) : undefined);
      const res = await apiClient.purgeUnpaidEcheanciers({
        ecole_id: effSchoolId,
        annee_scolaire: '2026-2027',
      });
      toast({
        title: 'Échéanciers vidés avec succès',
        description: res.message || 'Les échéances vierges ont été supprimées.',
      });
      setOpenPurgeModal(false);
      loadData();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: err.response?.data?.detail || 'Échec de la suppression.',
      });
    } finally {
      setPurging(false);
    }
  };

  const loadData = async (targetSchool?: string) => {
    setLoading(true);
    const activeSchool = targetSchool !== undefined ? targetSchool : selectedSchool;
    try {
      const schList = await apiClient.getSchools().catch(() => [] as any[]);
      setSchools(schList || []);

      const effectiveSchoolId = activeSchool !== 'all' ? activeSchool : ((!isGlobal && userEcoleId) ? userEcoleId : 'all');
      const schObj = schList.find((s: any) => String(s.IDETABLISSEMENT || s.id) === String(effectiveSchoolId));
      const schCode = schObj?.ET_CODEETABLISSEMENT || schObj?.code || (!isGlobal ? userCode || undefined : undefined);
      const schId = effectiveSchoolId !== 'all' ? Number(effectiveSchoolId) : (!isGlobal && userEcoleId ? Number(userEcoleId) : undefined);
      const schVille = schObj?.ET_VILLE || schObj?.ville || (!isGlobal ? userVille || undefined : undefined);

      const schoolQueryParam = schId ? { ecole_id: schId } : (schCode ? { code_etablissement: schCode } : {});

      const [echList, studList, clsList, presets] = await Promise.all([
        apiClient.getEcheanciers({
          annee_scolaire: '2026-2027',
          ecole_id: schId,
          code_etablissement: schCode,
        }),
        apiClient.getStudents(schoolQueryParam),
        apiClient.getClasses(schoolQueryParam),
        apiClient.getHinnehOfficialPresets({
          annee_scolaire: '2026-2027',
          ecole_id: schId,
          code_etablissement: schCode,
          ville: schVille,
        }),
      ]);
      setEcheances(echList || []);
      setStudents(studList || []);
      setClasses(clsList || []);
      setHinnehPresets(presets || []);

      if (schId || schCode) {
        setGrillePresets(presets || [], scopeKeyForSchool(schId, schCode));
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de charger les échéanciers.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleFocus = () => {
      loadData();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Filtered echeances
  const filteredEcheances = echeances.filter(item => {
    const student = students.find(s => String(s.id) === String(item.eleve_id));
    const schoolId = student?.ecole_id || item.ecole_id;

    let matchSchool = selectedSchool === 'all';
    if (!matchSchool) {
      const schObj = schools.find((s: any) => String(s.IDETABLISSEMENT || s.id) === String(selectedSchool));
      const schCode = schObj?.ET_CODEETABLISSEMENT || schObj?.code || '';
      const stCode = String(student?.ET_CODEETABLISSEMENT || student?.code_etablissement || student?.codeEtablissement || '');

      const matchById = String(schoolId) === String(selectedSchool);
      const matchByCode = Boolean(schCode && stCode && schCode.toUpperCase() === stCode.toUpperCase());

      matchSchool = matchById || matchByCode;
    }
    const studentName = student ? `${student.lastName || student.nom || ''} ${student.firstName || student.prenom || ''}` : '';
    const matchSearch = studentName.toLowerCase().includes(search.toLowerCase()) || String(student?.matricule || '').toLowerCase().includes(search.toLowerCase());
    const matchClass = selectedClass === 'all' || String(student?.classe_id) === String(selectedClass);
    const matchStatus = selectedStatus === 'all' || item.statut === selectedStatus;
    return matchSchool && matchSearch && matchClass && matchStatus;
  });

  // Compute KPIs based on filtered echeances
  const totalAttendu = filteredEcheances.reduce((acc, item) => acc + (Number(item.montant_prevu) || 0), 0);
  const totalRecouvre = filteredEcheances.reduce((acc, item) => acc + (Number(item.montant_paye) || 0), 0);
  const soldeRestant = totalAttendu - totalRecouvre;
  const enRetardList = filteredEcheances.filter(e => e.statut === 'en_retard');
  const montantRetard = enRetardList.reduce((acc, item) => acc + (Number(item.montant_prevu) - Number(item.montant_paye)), 0);
  const tauxRecouvrement = totalAttendu > 0 ? Math.round((totalRecouvre / totalAttendu) * 100) : 0;

  // Grouped by Student for Student View
  const studentSchedulesMap: { [key: string]: { student: any; items: any[]; totalPrevu: number; totalPaye: number; solde: number } } = {};
  filteredEcheances.forEach(item => {
    const stId = String(item.eleve_id);
    if (!studentSchedulesMap[stId]) {
      const st = students.find(s => String(s.id) === stId);
      studentSchedulesMap[stId] = { student: st, items: [], totalPrevu: 0, totalPaye: 0, solde: 0 };
    }
    studentSchedulesMap[stId].items.push(item);
    studentSchedulesMap[stId].totalPrevu += Number(item.montant_prevu) || 0;
    studentSchedulesMap[stId].totalPaye += Number(item.montant_paye) || 0;
    studentSchedulesMap[stId].solde = studentSchedulesMap[stId].totalPrevu - studentSchedulesMap[stId].totalPaye;
  });

  const studentSchedulesList = Object.values(studentSchedulesMap).filter(group => Boolean(group.student));

  const handlePaySubmit = async () => {
    if (!selectedEcheance || !payAmount) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez saisir un montant.' });
      return;
    }
    setSubmittingPay(true);
    try {
      const res = await apiClient.payEcheance(selectedEcheance.id, {
        montant: parseFloat(payAmount),
        mode: payMode,
        numero_transaction: payTxNumber || undefined,
      });
      toast({ title: 'Succès', description: res.message || 'Versement enregistré avec succès.' });
      setOpenPayModal(false);
      setPayAmount('');
      setPayTxNumber('');
      loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.response?.data?.detail || 'Échec du versement.' });
    } finally {
      setSubmittingPay(false);
    }
  };

  const handleApplyOfficialPreset = async () => {
    if (!selectedPresetId) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez choisir un modèle tarifaire Hînneh.' });
      return;
    }
    if (genTarget === 'class' && !genClassId) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez sélectionner une classe.' });
      return;
    }
    if (genTarget === 'niveau' && !genNiveau) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez sélectionner un niveau.' });
      return;
    }
    if (genTarget === 'student' && !genStudentId) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez sélectionner un élève.' });
      return;
    }

    setGenerating(true);
    try {
      const res = await apiClient.applyHinnehPreset({
        preset_id: selectedPresetId,
        eleve_id: genTarget === 'student' ? parseInt(genStudentId) : undefined,
        classe_id: genTarget === 'class' ? parseInt(genClassId) : undefined,
        niveau: genTarget === 'niveau' ? genNiveau : undefined,
        annee_scolaire: '2026-2027',
      });
      toast({ title: 'Succès', description: res.message });
      setOpenGenModal(false);
      loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.response?.data?.detail || 'Échec de l\'application du modèle.' });
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateCustomTemplate = async () => {
    if (genTarget === 'class' && !genClassId) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez sélectionner une classe.' });
      return;
    }
    if (genTarget === 'niveau' && !genNiveau) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez sélectionner un niveau.' });
      return;
    }
    if (genTarget === 'student' && !genStudentId) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez sélectionner un élève.' });
      return;
    }
    if (!genAmount || parseFloat(genAmount) <= 0) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Le montant total est invalide.' });
      return;
    }

    setGenerating(true);
    try {
      const res = await apiClient.generateEcheancierTemplate({
        eleve_id: genTarget === 'student' ? parseInt(genStudentId) : undefined,
        classe_id: genTarget === 'class' ? parseInt(genClassId) : undefined,
        niveau: genTarget === 'niveau' ? genNiveau : undefined,
        montant_total: parseFloat(genAmount),
        nb_tranches: parseInt(genTranches),
        date_debut: genStartDate,
        annee_scolaire: '2026-2027',
      });
      toast({ title: 'Génération réussie', description: res.message });
      setOpenGenModal(false);
      loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.response?.data?.detail || 'Échec de la génération.' });
    } finally {
      setGenerating(false);
    }
  };

  const handleAddSingleEcheance = async () => {
    if (!addStudentId || !addLibelle || !addMontant || !addDueDate) {
      toast({ variant: 'destructive', title: 'Champs requis', description: 'Veuillez remplir tous les champs obligatoires.' });
      return;
    }
    setAdding(true);
    try {
      await apiClient.createEcheance({
        eleve_id: parseInt(addStudentId),
        libelle: addLibelle,
        tranche_numero: parseInt(addTrancheNum) || 1,
        montant_prevu: parseFloat(addMontant),
        montant_paye: 0,
        date_echeance: addDueDate,
        statut: 'non_paye',
        annee_scolaire: '2026-2027',
      });
      toast({ title: 'Succès', description: 'Échéance ajoutée avec succès.' });
      setOpenAddModal(false);
      setAddLibelle('');
      setAddMontant('');
      setAddDueDate('');
      loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.response?.data?.detail || 'Erreur lors de la création.' });
    } finally {
      setAdding(false);
    }
  };

  // EDIT handler
  const handleOpenEdit = (item: any) => {
    setEditItem(item);
    setEditLibelle(item.libelle || '');
    setEditMontant(String(item.montant_prevu || ''));
    setEditDueDate(item.date_echeance || '');
    setEditTranche(String(item.tranche_numero || '1'));
    setOpenEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!editItem) return;
    setSubmittingEdit(true);
    try {
      await apiClient.updateEcheance(editItem.id, {
        libelle: editLibelle,
        montant_prevu: parseFloat(editMontant),
        date_echeance: editDueDate,
        tranche_numero: parseInt(editTranche) || 1,
      });
      toast({ title: 'Succès', description: 'Échéance modifiée avec succès.' });
      setOpenEditModal(false);
      setEditItem(null);
      loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.response?.data?.detail || 'Erreur lors de la modification.' });
    } finally {
      setSubmittingEdit(false);
    }
  };

  // DELETE handler
  const handleDelete = async (item: any) => {
    if (!confirm(`Supprimer la tranche "${item.libelle}" (${formatCurrency(item.montant_prevu)}) ?\n\nCette action est irréversible.`)) return;
    setDeletingId(item.id);
    try {
      await apiClient.deleteEcheance(item.id);
      toast({ title: 'Supprimé', description: `La tranche "${item.libelle}" a été supprimée.` });
      loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.response?.data?.detail || 'Erreur lors de la suppression.' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenNewPreset = () => {
    setPresetToEdit(null);
    setPresetServiceType(activePresetTab);
    if (activePresetTab === 'transport') {
      setPresetLabel('Transport Mensuel — Zone 1');
      setPresetCycle('Général');
      setPresetNiveaux('Tous');
      setPresetZoneTrajet('Zone 1 (Centre)');
      setPresetPeriodicite('mensuel');
      setPresetTranches([
        { libelle: 'Abonnement Mensuel Car (Zone 1)', montant: '20000', date: '2026-09-05' }
      ]);
    } else if (activePresetTab === 'cantine') {
      setPresetLabel('Cantine Mensuelle — Repas Chaud');
      setPresetCycle('Général');
      setPresetNiveaux('Tous');
      setPresetZoneTrajet('');
      setPresetPeriodicite('mensuel');
      setPresetTranches([
        { libelle: 'Forfait Mensuel Restauration', montant: '15000', date: '2026-09-05' }
      ]);
    } else {
      setPresetLabel('');
      setPresetCycle('Collège');
      setPresetNiveaux('');
      setPresetZoneTrajet('');
      setPresetPeriodicite('mensuel');
      setPresetTranches([
        { libelle: '1er vers. 05 sept.', montant: '62000', date: '2026-09-05' },
        { libelle: '2ème vers. 05 oct.', montant: '35000', date: '2026-10-05' },
        { libelle: '3ème vers. 05 nov.', montant: '23000', date: '2026-11-05' },
        { libelle: '4ème vers. 05 déc.', montant: '15000', date: '2026-12-05' },
      ]);
    }
    setOpenPresetEditModal(true);
  };

  const handleOpenPresetEdit = (preset: any) => {
    setPresetToEdit(preset);
    setPresetServiceType((preset.type_service || 'scolarite') as any);
    setPresetLabel(preset.label || '');
    setPresetCycle(preset.cycle || 'Général');
    setPresetNiveaux(Array.isArray(preset.niveaux) ? preset.niveaux.join(', ') : (preset.niveaux || ''));
    setPresetZoneTrajet(preset.zone_trajet || '');
    setPresetPeriodicite(preset.periodicite || 'mensuel');
    setPresetStatutAffectation(preset.statut_affectation || 'TOUS');
    setPresetTranches((preset.tranches || []).map((tranche: any) => ({
      libelle: tranche.libelle || '',
      montant: String(tranche.montant || ''),
      date: tranche.date || '',
    })));
    setOpenPresetEditModal(true);
  };

  const currentSchoolObj = schools.find((s: any) => String(s.IDETABLISSEMENT || s.id) === String(selectedSchool));
  const currentSchoolName = currentSchoolObj
    ? (currentSchoolObj.ET_DENOMMINATION || currentSchoolObj.name || `Établissement ${selectedSchool}`)
    : (schools.length === 1 ? (schools[0].ET_DENOMMINATION || schools[0].name) : 'Tous les Établissements Scolaires');
  const currentSchoolVille = currentSchoolObj?.ET_VILLE || currentSchoolObj?.ville || '';
  const currentSchoolCode = currentSchoolObj?.ET_CODEETABLISSEMENT || currentSchoolObj?.code || '';

  const handleSavePreset = async () => {
    if (!presetLabel.trim()) {
      toast({ variant: 'destructive', title: 'Libellé requis', description: 'Veuillez saisir un libellé pour ce tarif.' });
      return;
    }
    if (presetServiceType === 'scolarite' && (!presetCycle.trim() || !presetNiveaux.trim())) {
      toast({ variant: 'destructive', title: 'Informations manquantes', description: 'Renseignez le cycle et les niveaux pour la scolarité.' });
      return;
    }
    if (!presetTranches.length || presetTranches.some(t => !t.libelle.trim() || !t.date || !Number(t.montant) || Number(t.montant) <= 0)) {
      toast({ variant: 'destructive', title: 'Tranches invalides', description: 'Chaque tranche doit contenir un libellé, un montant positif et une date valide.' });
      return;
    }

    const presetId = presetToEdit?.id || presetLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `preset_${Date.now()}`;
    const schObj = schools.find((s: any) => String(s.IDETABLISSEMENT || s.id) === String(selectedSchool));
    const schCode = schObj?.ET_CODEETABLISSEMENT || schObj?.code || undefined;
    const schId = selectedSchool !== 'all' ? Number(selectedSchool) : undefined;
    const schVille = schObj?.ET_VILLE || schObj?.ville || undefined;

    setSavingPreset(true);
    try {
      const res = await apiClient.updateHinnehOfficialPreset(presetId, {
        label: presetLabel.trim(),
        type_service: presetServiceType,
        cycle: presetCycle.trim() || 'Général',
        niveaux: presetNiveaux.split(',').map(niveau => niveau.trim()).filter(Boolean),
        statut_affectation: presetStatutAffectation,
        zone_trajet: presetZoneTrajet.trim() || undefined,
        periodicite: presetPeriodicite || 'mensuel',
        tranches: presetTranches.map(tranche => ({
          libelle: tranche.libelle.trim(),
          montant: Number(tranche.montant),
          date: tranche.date,
        })),
        annee_scolaire: '2026-2027',
        ecole_id: schId,
        code_etablissement: schCode,
        ville: schVille,
      });
      // Le backend répercute la grille sur les échéanciers sans versement : on en rend
      // compte ici, sinon l'utilisateur ne saurait pas que des élèves ont été mis à jour.
      const rl = res?.realignement;
      const baseMsg = presetToEdit ? 'Le modèle tarifaire a été mis à jour avec succès.' : 'Le nouveau modèle tarifaire a été enregistré.';
      toast({
        title: presetToEdit ? 'Tarif modifié' : 'Tarif créé',
        description: rl
          ? `${baseMsg} Échéanciers réalignés : ${rl.realignes}/${rl.eleves_concernes} élève(s)${rl.ignores > 0 ? ` — ${rl.ignores} conservé(s) car déjà mouvementé(s)` : ''}.`
          : baseMsg,
      });
      setOpenPresetEditModal(false);
      setPresetToEdit(null);
      await loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.response?.data?.detail || 'L\'enregistrement du tarif a échoué.' });
    } finally {
      setSavingPreset(false);
    }
  };

  const handleDeletePreset = async (preset: any) => {
    if (!confirm(`Supprimer le modèle tarifaire "${preset.label}" ?\n\nCette action est irréversible.`)) return;

    const schObj = schools.find((s: any) => String(s.IDETABLISSEMENT || s.id) === String(selectedSchool));
    const schCode = schObj?.ET_CODEETABLISSEMENT || schObj?.code || undefined;
    const schId = selectedSchool !== 'all' ? Number(selectedSchool) : undefined;
    const schVille = schObj?.ET_VILLE || schObj?.ville || undefined;

    setDeletingPresetId(preset.id);
    try {
      await apiClient.deleteHinnehOfficialPreset(preset.id, {
        ecole_id: schId,
        code_etablissement: schCode,
        ville: schVille,
        annee_scolaire: '2026-2027',
      });
      toast({ title: 'Tarif supprimé', description: `Le modèle "${preset.label}" a été supprimé de la base de données.` });
      await loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.response?.data?.detail || 'La suppression du tarif a échoué.' });
    } finally {
      setDeletingPresetId(null);
    }
  };

  // Niveaux réellement couverts par les grilles de scolarité de l'établissement. Rien
  // n'est codé en dur : on ne propose que des niveaux pour lesquels un tarif existe,
  // donc pour lesquels un échéancier peut effectivement être bâti.
  const niveauxAvecGrille = useMemo(() => {
    const niveaux = new Set<string>();
    hinnehPresets
      .filter((p: any) => !p.type_service || p.type_service === 'scolarite')
      .forEach((p: any) => {
        (p.niveaux || []).forEach((n: any) => {
          const v = String(n || '').trim();
          if (v) niveaux.add(v);
        });
      });
    return Array.from(niveaux).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [hinnehPresets]);

  // Réalignement à la demande : utile après l'arrivée de nouveaux élèves, ou pour
  // reprendre des échéanciers déjà mouvementés que la sauvegarde ne touche jamais.
  // `niveau` restreint l'opération aux élèves de ce niveau, toutes classes confondues.
  const handleRealignSchedules = async (force: boolean, niveau?: string) => {
    const schObj = schools.find((s: any) => String(s.IDETABLISSEMENT || s.id) === String(selectedSchool));
    const schCode = schObj?.ET_CODEETABLISSEMENT || schObj?.code || undefined;
    const schId = selectedSchool !== 'all' ? Number(selectedSchool) : (!isGlobal && userEcoleId ? Number(userEcoleId) : undefined);

    if (!schId && !schCode) {
      toast({
        variant: 'destructive',
        title: 'Établissement requis',
        description: "Sélectionnez un établissement précis avant de générer : l'opération ne s'applique jamais à tout le réseau d'un coup.",
      });
      return;
    }

    const portee = niveau ? `du niveau ${niveau} — ${currentSchoolName}` : `de ${currentSchoolName}`;
    const avertissement = force
      ? `GÉNÉRATION FORCÉE ${portee.toUpperCase()}.\n\nLes échéanciers seront reconstruits d'après la grille tarifaire, Y COMPRIS ceux qui portent déjà des versements. Les montants déjà encaissés resteront au crédit de l'élève, mais la répartition par tranche sera refaite.\n\nContinuer ?`
      : `Générer les échéanciers ${portee} d'après la grille tarifaire officielle ?\n\nSeuls les élèves sans aucun versement seront traités. Les échéanciers déjà mouvementés ne seront pas touchés.`;
    if (!confirm(avertissement)) return;

    setRealigning(true);
    try {
      const res = await apiClient.realignSchoolSchedules({
        ecole_id: schId,
        code_etablissement: schCode,
        niveaux: niveau ? [niveau] : undefined,
        annee_scolaire: '2026-2027',
        force_realign_all: force,
      });
      toast({
        title: niveau ? `Échéanciers générés — ${niveau}` : 'Échéanciers réalignés',
        description: `${res?.realigned_eleves ?? 0} élève(s) traité(s) sur ${res?.total_eleves ?? 0} — ${res?.tranches_creees_ou_mises_a_jour ?? 0} tranche(s) mise(s) à jour${res?.failed ? `, ${res.failed} sans grille` : ''}.`,
      });
      await loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.response?.data?.detail || 'La génération des échéanciers a échoué.' });
    } finally {
      setRealigning(false);
    }
  };

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'paye':
        return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Payé</Badge>;
      case 'partiel':
        return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">Partiel</Badge>;
      case 'en_retard':
        return <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30">En retard</Badge>;
      case 'desabonne':
        return <Badge className="bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 font-bold">Désabonné</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-600 border-slate-300">Non payé</Badge>;
    }
  };

  return (
    <Layout
      loading={loading}
      loadingMessage="Chargement des échéanciers scolaires..."
      loadingSubmessage="Calcul des grilles tarifaires et synchronisation des soldes"
      title="Échéancier de Paiement"
      description={`Grille tarifaire et suivi des règlements — ${currentSchoolName}`}
    >
      <div className="space-y-6">

        {/* TOP HEADER & ACTION BUTTONS */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <Calendar className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Tableau d'Échéancier de Scolarité (2026-2027)
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {currentSchoolName} — Maternelle, Primaire, Collège, Lycée Affectés & Non-Affectés.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleOpenNewPreset} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md">
              <Plus className="w-4 h-4" /> Nouveau Modèle / Échéancier
            </Button>
            <Button onClick={() => setOpenGenModal(true)} variant="outline" className="gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" /> Appliquer à une Classe / Niveau
            </Button>
            <Button onClick={() => setOpenAddModal(true)} variant="outline" className="gap-2">
              <Plus className="w-4 h-4 text-indigo-600" /> Échéance Personnalisée
            </Button>
            <Button variant="outline" onClick={() => setOpenPurgeModal(true)} className="gap-2 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 font-medium">
              <Trash2 className="w-4 h-4" /> Vider échéanciers vierges
            </Button>
            <Button variant="outline" onClick={loadData} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
            </Button>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-indigo-500 shadow-sm">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Scolarité Attendue</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(totalAttendu)}</h3>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <Progress value={tauxRecouvrement} className="h-1.5" />
                <p className="text-xs text-slate-500 mt-1">{tauxRecouvrement}% du montant total prévu</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500 shadow-sm">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Total Recouvré</p>
                  <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(totalRecouvre)}</h3>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-4 flex items-center gap-1 font-medium">
                <ArrowUpRight className="w-3.5 h-3.5" /> Encaissements effectifs enregistrés
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 shadow-sm">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Reste à Recouvrer</p>
                  <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{formatCurrency(soldeRestant)}</h3>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-4">Solde restant sur l'année</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-rose-500 shadow-sm">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Échéances en Retard</p>
                  <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{enRetardList.length} <span className="text-sm font-normal text-slate-500">tranches</span></h3>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-4 font-semibold">
                Montant échoué : {formatCurrency(montantRetard)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Rechercher élève ou matricule..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-slate-500">École :</Label>
                  <Select value={selectedSchool} onValueChange={(val) => { setSelectedSchool(val); loadData(val); }}>
                    <SelectTrigger className="w-44 h-9">
                      <SelectValue placeholder="Toutes les écoles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les écoles</SelectItem>
                      {schools.map(s => (
                        <SelectItem key={s.IDETABLISSEMENT || s.id} value={String(s.IDETABLISSEMENT || s.id)}>
                          {s.ET_DENOMMINATION || s.name || `École ${s.IDETABLISSEMENT || s.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs text-slate-500">Classe :</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="w-36 h-9">
                      <SelectValue placeholder="Toutes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les classes</SelectItem>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.CE_LIBELLE || c.name || `Classe ${c.id}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs text-slate-500">Statut :</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-36 h-9">
                      <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="non_paye">Non payé</SelectItem>
                      <SelectItem value="partiel">Partiel</SelectItem>
                      <SelectItem value="en_retard">En retard</SelectItem>
                      <SelectItem value="paye">Payé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TABS MAIN CONTENT */}
        <Tabs defaultValue="students" className="w-full">
          <TabsList className="grid w-full grid-cols-4 max-w-3xl bg-slate-100 dark:bg-slate-800">
            <TabsTrigger value="students" className="gap-1.5 font-bold">
              <Users className="w-4 h-4" /> Échéancier par Élève
            </TabsTrigger>
            <TabsTrigger value="tarifs" className="gap-1.5 font-bold">
              <Calendar className="w-4 h-4" /> Grille Tarifaire Officielle
            </TabsTrigger>
            <TabsTrigger value="details" className="gap-1.5 font-bold">
              <Layers className="w-4 h-4" /> Toutes les Tranches
            </TabsTrigger>
            <TabsTrigger value="retards" className="gap-1.5 font-bold text-rose-600">
              <AlertTriangle className="w-4 h-4" /> Retards ({enRetardList.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PAR ÉLÈVE */}
          <TabsContent value="students" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-4">
              {studentSchedulesList.length === 0 ? (
                <Card className="p-8 text-center text-slate-500">
                  Aucun échéancier trouvé pour les filtres sélectionnés. Cliquez sur "Application Échéancier Officiel" pour créer un échéancier.
                </Card>
              ) : (
                studentSchedulesList.map(({ student, items, totalPrevu, totalPaye, solde }) => {
                  const pct = totalPrevu > 0 ? Math.round((totalPaye / totalPrevu) * 100) : 0;
                  const hasRetard = items.some(i => i.statut === 'en_retard');
                  const isComplete = solde <= 0 && totalPrevu > 0;

                  return (
                    <Card key={student.id} className={`shadow-sm transition-all hover:border-indigo-300 border-l-4 ${hasRetard ? 'border-l-rose-500' : isComplete ? 'border-l-emerald-500' : 'border-l-indigo-500'}`}>
                      <CardContent className="p-5">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                {student.lastName || student.nom} {student.firstName || student.prenom}
                              </h3>
                              <Badge variant="outline" className="text-xs">
                                Matricule : {student.matricule || 'N/A'}
                              </Badge>
                              {hasRetard && <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30">Retard Détecté</Badge>}
                              {isComplete && <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Scolarité Soldée</Badge>}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Parents / Tuteur : {student.AU_TUTEURLEGAL || student.AU_PERENOMPRENOMS || 'Non renseigné'} — Tél : {student.AU_CONTACTS || student.AU_PERECONTACTS || 'Non renseigné'}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
                            <div className="text-right">
                              <p className="text-xs text-slate-400 uppercase font-semibold">Payé / Total</p>
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                <span className="text-emerald-600">{formatCurrency(totalPaye)}</span> / {formatCurrency(totalPrevu)}
                              </p>
                            </div>

                            <div className="w-28">
                              <div className="flex justify-between text-xs font-semibold mb-1">
                                <span>Progression</span>
                                <span>{pct}%</span>
                              </div>
                              <Progress value={pct} className="h-2" />
                            </div>

                            <Button
                              size="sm"
                              onClick={async () => {
                                const clsObj = classes.find((c: any) => String(c.id) === String(student.classe_id));
                                const studentClass = clsObj?.CE_LIBELLE || clsObj?.name || student.className || student.AU_CLASSEPRECEDENTE || '3EME G';
                                const parsedN = parseNiveau(studentClass);
                                const isMatOrPrim = parsedN.cycle === 'maternelle' || parsedN.cycle === 'primaire';
                                const statutOrientation = isMatOrPrim
                                  ? 'Scolarité Réelle'
                                  : (student.statut_orientation || student.statutAffecte || (studentClass.includes('6') || studentClass.includes('5') || studentClass.includes('4') || studentClass.includes('3') ? 'AFF' : 'NAFF'));

                                const receiptEcheances = items.map(i => ({
                                  rubric: i.libelle,
                                  amount: Number(i.montant_prevu || 0),
                                  paid: Number(i.montant_paye || 0),
                                  rest: Math.max(0, Number(i.montant_prevu || 0) - Number(i.montant_paye || 0)),
                                }));

                                const paidItems = items.filter(i => Number(i.montant_paye || 0) > 0);
                                const lastPaidItem = paidItems.length > 0 ? paidItems[paidItems.length - 1] : null;
                                const currentTxAmount = lastPaidItem ? Number(lastPaidItem.montant_paye || 0) : totalPaye;
                                const realSchoolName = await getRealSchoolName(student.schoolId || student.ecole_id);

                                printReceipt({
                                  receiptNumber: `RC-${Date.now().toString().slice(-5)}`,
                                  paymentId: lastPaidItem?.paiement_id || lastPaidItem?.id,
                                  amount: currentTxAmount,
                                  type: 'scolarite',
                                  mode: 'ESPÈCES',
                                  date: new Date(),
                                  studentName: `${student.lastName || student.nom} ${student.firstName || student.prenom}`,
                                  studentMatricule: student.matricule || 'N/A',
                                  studentClass: isMatOrPrim ? studentClass : `${studentClass} — ${statutOrientation}`,
                                  schoolName: realSchoolName,
                                  arrieresAnterieurs: Number(student.AU_MONTANTARRIERE || 0),
                                  studentPhoto: student.photo || '',
                                  totalVersedToDate: totalPaye,
                                  soldeToDate: solde,
                                  statutOrientation,
                                  echeances: receiptEcheances,
                                  versementDetails: paidItems.map(i => ({ rubric: i.libelle, amount: Number(i.montant_paye || 0) })),
                                });
                              }}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 font-bold shadow-xs"
                            >
                              <Printer className="w-3.5 h-3.5" /> Imprimer Reçu Échéancier (Modèle Officiel)
                            </Button>
                          </div>
                        </div>

                        {/* List of installments for this student */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                          {items.map(item => (
                            <div key={item.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between">
                              <div>
                                <div className="flex justify-between items-start">
                                  <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">{item.libelle}</span>
                                  {getStatusBadge(item.statut)}
                                </div>
                                <p className="text-base font-bold text-slate-900 dark:text-white mt-2">{formatCurrency(item.montant_prevu)}</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Échéance : <span className="font-medium text-slate-700 dark:text-slate-300">{formatDate(item.date_echeance)}</span>
                                </p>
                                {Number(item.montant_paye) > 0 && (
                                  <p className="text-xs text-emerald-600 font-medium mt-1">
                                    Déjà récapitulé : {formatCurrency(item.montant_paye)}
                                  </p>
                                )}
                              </div>

                              <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                <span className="text-[11px] text-slate-400">Tranche #{item.tranche_numero}</span>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleOpenEdit(item)}
                                    className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-600"
                                    title="Modifier"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDelete(item)}
                                    disabled={deletingId === item.id}
                                    className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                  {item.statut !== 'paye' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedEcheance(item);
                                        setPayAmount(String(Number(item.montant_prevu) - Number(item.montant_paye)));
                                        setOpenPayModal(true);
                                      }}
                                      className="h-7 text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-200"
                                    >
                                      Encaisser
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* TAB 2: GRILLE TARIFAIRE OFFICIELLE MULTI-SERVICES */}
          <TabsContent value="tarifs" className="space-y-6 mt-4">
            <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-950/40 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-indigo-950 dark:text-indigo-200">Grille Tarifaire Multi-Services (Année Scolaire 2026-2027)</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-indigo-700 dark:text-indigo-400 font-medium">{currentSchoolName}</p>
                    {currentSchoolCode && <Badge variant="outline" className="text-[10px] bg-white dark:bg-slate-900 border-indigo-200">Code: {currentSchoolCode}</Badge>}
                    {currentSchoolVille && <Badge variant="outline" className="text-[10px] bg-white dark:bg-slate-900 border-indigo-200">Ville: {currentSchoolVille}</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleOpenNewPreset} size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs">
                  <Plus className="w-4 h-4" /> Nouveau Tarif ({activePresetTab === 'scolarite' ? 'Scolarité' : activePresetTab === 'transport' ? 'Transport / Car' : 'Cantine'})
                </Button>
                <Button
                  onClick={() => handleRealignSchedules(false)}
                  disabled={realigning}
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-indigo-300 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                  title="Applique la grille tarifaire aux échéanciers des élèves déjà inscrits (ceux sans versement)"
                >
                  <RefreshCw className={`w-4 h-4 ${realigning ? 'animate-spin' : ''}`} /> Réaligner les échéanciers
                </Button>
                <Button
                  onClick={() => handleRealignSchedules(true)}
                  disabled={realigning}
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-xs text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  title="Reconstruit aussi les échéanciers portant déjà des versements"
                >
                  <ShieldAlert className="w-3.5 h-3.5" /> Forcer
                </Button>
                <Badge className="bg-indigo-600 text-white">Document Officiel Validé</Badge>
              </div>
            </div>

            {/* Génération ciblée : les élèves d'un seul niveau, sans toucher au reste de l'école */}
            <div className="flex flex-wrap items-end gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Générer les échéanciers d'un niveau
                </Label>
                <Select value={niveauAGenerer} onValueChange={setNiveauAGenerer}>
                  <SelectTrigger className="w-[260px] text-sm font-bold text-indigo-950 dark:text-indigo-200">
                    <SelectValue placeholder={niveauxAvecGrille.length ? 'Choisir un niveau…' : 'Aucun niveau couvert par une grille'} />
                  </SelectTrigger>
                  <SelectContent>
                    {niveauxAvecGrille.map(n => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => handleRealignSchedules(false, niveauAGenerer)}
                disabled={realigning || !niveauAGenerer}
                size="sm"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                title="Construit l'échéancier de chaque élève de ce niveau d'après la grille qui le couvre"
              >
                <Layers className={`w-4 h-4 ${realigning ? 'animate-pulse' : ''}`} /> Générer pour ce niveau
              </Button>
              <Button
                onClick={() => handleRealignSchedules(true, niveauAGenerer)}
                disabled={realigning || !niveauAGenerer}
                size="sm"
                variant="ghost"
                className="gap-1.5 text-xs text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                title="Reconstruit aussi les échéanciers de ce niveau portant déjà des versements"
              >
                <ShieldAlert className="w-3.5 h-3.5" /> Forcer
              </Button>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 basis-full sm:basis-auto sm:ml-auto sm:max-w-sm">
                Seuls les niveaux couverts par une grille de scolarité sont proposés. Les élèves
                ayant déjà versé ne sont pas touchés, sauf forçage.
              </p>
            </div>

            {/* SUB-TABS SELECTOR FOR SCOLARITE / TRANSPORT / CANTINE */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <Button
                variant={activePresetTab === 'scolarite' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActivePresetTab('scolarite')}
                className={`gap-2 font-bold ${activePresetTab === 'scolarite' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
              >
                🎓 Scolarité ({hinnehPresets.filter(p => !p.type_service || p.type_service === 'scolarite').length})
              </Button>
              <Button
                variant={activePresetTab === 'transport' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActivePresetTab('transport')}
                className={`gap-2 font-bold ${activePresetTab === 'transport' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
              >
                🚌 Transport & Cars ({hinnehPresets.filter(p => p.type_service === 'transport').length})
              </Button>
              <Button
                variant={activePresetTab === 'cantine' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActivePresetTab('cantine')}
                className={`gap-2 font-bold ${activePresetTab === 'cantine' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
              >
                🍽️ Cantine & Restauration ({hinnehPresets.filter(p => p.type_service === 'cantine').length})
              </Button>
            </div>

            {/* PRESETS LIST FOR ACTIVE SUB-TAB */}
            {hinnehPresets.filter(p => (p.type_service || 'scolarite') === activePresetTab).length === 0 ? (
              <Card className="p-8 text-center text-slate-500">
                <p className="font-semibold text-slate-700 dark:text-slate-300">Aucun tarif configuré pour {activePresetTab === 'scolarite' ? 'la scolarité' : activePresetTab === 'transport' ? 'le transport / car' : 'la cantine'}.</p>
                <p className="text-xs text-slate-400 mt-1">Cliquez sur le bouton ci-dessus pour ajouter votre premier modèle d'échéancier.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {hinnehPresets
                  .filter(preset => (preset.type_service || 'scolarite') === activePresetTab)
                  .map(preset => {
                    const isTransport = preset.type_service === 'transport';
                    const isCantine = preset.type_service === 'cantine';

                    return (
                      <Card key={preset.id} className="shadow-sm hover:shadow-md transition-shadow border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                        <CardHeader className="pb-3 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isTransport ? (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300">🚌 Transport</Badge>
                              ) : isCantine ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">🍽️ Cantine</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs bg-white dark:bg-slate-900">{preset.cycle || 'Général'}</Badge>
                              )}
                              {preset.statut_affectation && preset.statut_affectation !== 'TOUS' && (
                                <Badge variant="secondary" className="text-[10px]">{preset.statut_affectation}</Badge>
                              )}
                            </div>
                            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(preset.total)}</span>
                          </div>
                          <CardTitle className="text-base font-bold text-slate-900 dark:text-white mt-2">
                            {preset.label}
                          </CardTitle>
                          <CardDescription className="text-xs text-slate-500 space-y-0.5">
                            {isTransport && preset.zone_trajet && (
                              <p><span className="font-semibold text-slate-700 dark:text-slate-300">Zone / Ligne :</span> {preset.zone_trajet}</p>
                            )}
                            {preset.periodicite && (
                              <p><span className="font-semibold text-slate-700 dark:text-slate-300">Périodicité :</span> {preset.periodicite}</p>
                            )}
                            {preset.niveaux && preset.niveaux.length > 0 && (
                              <p><span className="font-semibold text-slate-700 dark:text-slate-300">Niveaux :</span> {Array.isArray(preset.niveaux) ? preset.niveaux.join(', ') : preset.niveaux}</p>
                            )}
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="p-4 flex-grow">
                          <p className="text-[11px] font-semibold uppercase text-slate-400 mb-2">Échéancier ({preset.tranches?.length || 0} tranches)</p>
                          <div className="space-y-2 text-xs">
                            {(preset.tranches || []).map((t: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                                <span className="font-medium text-slate-700 dark:text-slate-300 truncate mr-2">{t.libelle}</span>
                                <div className="text-right shrink-0">
                                  <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(t.montant)}</span>
                                  {t.date && <p className="text-[10px] text-slate-400">{formatDate(t.date)}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>

                        <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 mt-2 space-y-2">
                          <Button
                            onClick={() => {
                              setSelectedPresetId(preset.id);
                              setOpenGenModal(true);
                            }}
                            className="w-full gap-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                          >
                            <Sparkles className="w-3.5 h-3.5" /> Appliquer à une Classe / Élève
                          </Button>
                          <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleOpenPresetEdit(preset)}>
                              <Edit3 className="w-3.5 h-3.5" /> Modifier
                            </Button>
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs text-destructive hover:text-destructive" disabled={deletingPresetId === preset.id} onClick={() => handleDeletePreset(preset)}>
                              <Trash2 className="w-3.5 h-3.5" /> {deletingPresetId === preset.id ? 'Suppression...' : 'Supprimer'}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
              </div>
            )}
          </TabsContent>

          {/* TAB 3: TOUTES LES TRANCHES TABLE */}
          <TabsContent value="details" className="space-y-4 mt-4">
            <Card className="shadow-sm">
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3 font-semibold">Élève</th>
                      <th className="p-3 font-semibold">Tranche & Libellé</th>
                      <th className="p-3 font-semibold">Date Échéance</th>
                      <th className="p-3 font-semibold">Date d'acquittement</th>
                      <th className="p-3 font-semibold text-right">Montant Prévu</th>
                      <th className="p-3 font-semibold text-right">Montant Payé</th>
                      <th className="p-3 font-semibold text-right">Reste à Payer</th>
                      <th className="p-3 font-semibold text-center">Statut</th>
                      <th className="p-3 font-semibold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredEcheances.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-6 text-center text-slate-500">Aucune tranche trouvée.</td>
                      </tr>
                    ) : (
                      filteredEcheances.map(item => {
                        const st = students.find(s => String(s.id) === String(item.eleve_id));
                        const stName = st ? `${st.lastName || st.nom || ''} ${st.firstName || st.prenom || ''}` : `Élève #${item.eleve_id}`;
                        const reste = Number(item.montant_prevu) - Number(item.montant_paye);

                        const isDesabonne = item.statut === 'desabonne';
                        return (
                          <tr key={item.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${isDesabonne ? 'opacity-65 bg-slate-50/40' : ''}`}>
                            <td className="p-3">
                              <p className="font-semibold text-slate-900 dark:text-white">{stName}</p>
                              <p className="text-xs text-slate-400">Matricule: {st?.matricule || 'N/A'}</p>
                            </td>
                            <td className="p-3 font-medium text-slate-700 dark:text-slate-300">
                              {item.libelle} {isDesabonne && <span className="text-[11px] font-bold text-slate-500 italic">(Désabonné)</span>}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">{isDesabonne ? '—' : formatDate(item.date_echeance)}</td>
                            <td className="p-3 text-xs font-medium text-emerald-700">
                              {(item as any).date_acquittement ? formatDate((item as any).date_acquittement) : (item.statut === 'paye' || Number(item.montant_paye) > 0 ? 'Acquitté' : '—')}
                            </td>
                            <td className="p-3 text-right font-semibold text-slate-900 dark:text-white">
                              {isDesabonne ? '—' : formatCurrency(item.montant_prevu)}
                            </td>
                            <td className="p-3 text-right font-medium text-emerald-600">
                              {Number(item.montant_paye) > 0 ? formatCurrency(item.montant_paye) : '—'}
                            </td>
                            <td className="p-3 text-right font-bold text-slate-800 dark:text-slate-200">
                              {isDesabonne ? <span className="text-slate-500 font-semibold italic text-xs">Désabonné</span> : formatCurrency(reste)}
                            </td>
                            <td className="p-3 text-center">{getStatusBadge(item.statut)}</td>
                            <td className="p-3 text-center">
                              {item.statut !== 'paye' && !isDesabonne && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedEcheance(item);
                                    setPayAmount(String(reste));
                                    setOpenPayModal(true);
                                  }}
                                  className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                                >
                                  Encaisser
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: RETARDS & RELANCES */}
          <TabsContent value="retards" className="space-y-4 mt-4">
            <Card className="border-l-4 border-l-rose-500 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-rose-600">
                  <ShieldAlert className="w-5 h-5" /> Suivi des Échéances en Retard de Paiement
                </CardTitle>
                <CardDescription>
                  Ces tranches de scolarité ont dépassé leur date limite de règlement et nécessitent une relance auprès des tuteurs.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-rose-50/50 dark:bg-rose-950/20 text-slate-700 dark:text-slate-300 border-b border-rose-100">
                    <tr>
                      <th className="p-3 font-semibold">Élève</th>
                      <th className="p-3 font-semibold">Contact Tuteur</th>
                      <th className="p-3 font-semibold">Tranche Retardée</th>
                      <th className="p-3 font-semibold">Date Limite Dépassée</th>
                      <th className="p-3 font-semibold text-right">Reste Dû</th>
                      <th className="p-3 font-semibold text-center">Relance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {enRetardList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-emerald-600 font-medium">
                          Aucun retard détecté ! Tous les règlements d'échéances sont à jour.
                        </td>
                      </tr>
                    ) : (
                      enRetardList.map(item => {
                        const st = students.find(s => String(s.id) === String(item.eleve_id));
                        const stName = st ? `${st.lastName || st.nom || ''} ${st.firstName || st.prenom || ''}` : `Élève #${item.eleve_id}`;
                        const phone = st?.AU_CONTACTS || st?.AU_PERECONTACTS || st?.AU_MERECONTACTS || 'Inconnu';
                        const reste = Number(item.montant_prevu) - Number(item.montant_paye);

                        const msgSMS = `Bonjour, Hînneh Éducation vous informe que la tranche "${item.libelle}" pour l'élève ${stName} d'un montant de ${reste.toLocaleString()} FCFA était due le ${formatDate(item.date_echeance)}. Merci de procéder au versement.`;

                        return (
                          <tr key={item.id} className="hover:bg-rose-50/30 dark:hover:bg-rose-950/10">
                            <td className="p-3">
                              <p className="font-bold text-slate-900 dark:text-white">{stName}</p>
                              <p className="text-xs text-slate-400">Matricule: {st?.matricule || 'N/A'}</p>
                            </td>
                            <td className="p-3">
                              <p className="font-semibold text-slate-800 dark:text-slate-200">{st?.AU_TUTEURLEGAL || st?.AU_PERENOMPRENOMS || 'Tuteur'}</p>
                              <p className="text-xs text-indigo-600 font-medium">{phone}</p>
                            </td>
                            <td className="p-3 font-medium text-slate-700 dark:text-slate-300">{item.libelle}</td>
                            <td className="p-3 text-rose-600 font-semibold">{formatDate(item.date_echeance)}</td>
                            <td className="p-3 text-right font-bold text-rose-600">{formatCurrency(reste)}</td>
                            <td className="p-3 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (navigator.clipboard) {
                                    navigator.clipboard.writeText(msgSMS);
                                    toast({ title: 'Message copié', description: 'Le texte du SMS de relance a été copié dans le presse-papier.' });
                                  } else {
                                    alert(msgSMS);
                                  }
                                }}
                                className="h-8 gap-1 text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                              >
                                <MessageSquare className="w-3.5 h-3.5" /> Copier SMS
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* MODAL 1: ENREGISTRER VERSEMENT */}
        <Dialog open={openPayModal} onOpenChange={setOpenPayModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-indigo-600">
                <DollarSign className="w-5 h-5" /> Enregistrer un Versement sur Tranche
              </DialogTitle>
              <DialogDescription>
                {selectedEcheance && (
                  <span>
                    Échéance : <strong>{selectedEcheance.libelle}</strong> (Reste dû : {formatCurrency(Number(selectedEcheance.montant_prevu) - Number(selectedEcheance.montant_paye))})
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div>
                <Label htmlFor="payAmount">Montant du versement (FCFA) *</Label>
                <Input
                  id="payAmount"
                  type="number"
                  placeholder="Ex: 50000"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="text-lg font-bold text-slate-900 dark:text-white mt-1"
                />
              </div>

              <div>
                <Label htmlFor="payMode">Mode de paiement *</Label>
                <Select value={payMode} onValueChange={setPayMode}>
                  <SelectTrigger id="payMode" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="especes">Espèces</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money (Orange/MTN/Wave)</SelectItem>
                    <SelectItem value="virement">Virement bancaire / Chèque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="payTxNumber">Numéro de transaction / Référence (optionnel)</Label>
                <Input
                  id="payTxNumber"
                  placeholder="Ex: REF-OM-987654"
                  value={payTxNumber}
                  onChange={(e) => setPayTxNumber(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenPayModal(false)}>Annuler</Button>
              <Button onClick={handlePaySubmit} disabled={submittingPay} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {submittingPay ? 'Validation...' : 'Valider & Générer Reçu'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL 2: GÉNÉRER PLAN D'ÉCHEANCIER (SELECTION DU MODELE OFFICIEL HINNEH OU PERSONNALISE) */}
        <Dialog open={openGenModal} onOpenChange={setOpenGenModal}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-indigo-600">
                <Sparkles className="w-5 h-5" /> Formulaire d'Échéancier
              </DialogTitle>
              <DialogDescription>
                Choisissez d'appliquer le tarif officiel Hînneh (2026–2027) ou un plan personnalisé en 3 ou 4 tranches.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div>
                <Label>Attribuer l'échéancier par *</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Button
                    type="button"
                    variant={genTarget === 'class' ? 'default' : 'outline'}
                    className={genTarget === 'class' ? 'bg-indigo-600 text-white' : ''}
                    onClick={() => setGenTarget('class')}
                  >
                    Par Classe
                  </Button>
                  <Button
                    type="button"
                    variant={genTarget === 'niveau' ? 'default' : 'outline'}
                    className={genTarget === 'niveau' ? 'bg-indigo-600 text-white' : ''}
                    onClick={() => setGenTarget('niveau')}
                  >
                    Par Niveau
                  </Button>
                </div>
              </div>

              {/* Statut d'affectation (AFF / NAFF - Choix unique) */}
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Statut d'affectation (Type d'élève) *
                </Label>
                <div className="flex items-center gap-6 mt-1.5 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer" onClick={() => setGenStatutAffectation('AFF')}>
                    <Checkbox
                      checked={genStatutAffectation === 'AFF'}
                      onCheckedChange={() => setGenStatutAffectation('AFF')}
                    />
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300">
                      AFF
                    </Badge>
                    <span>Affecté(e)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer" onClick={() => setGenStatutAffectation('NAFF')}>
                    <Checkbox
                      checked={genStatutAffectation === 'NAFF'}
                      onCheckedChange={() => setGenStatutAffectation('NAFF')}
                    />
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300">
                      NAFF
                    </Badge>
                    <span>Non-Affecté(e)</span>
                  </label>
                </div>
              </div>

              {genTarget === 'class' && (
                <div>
                  <Label htmlFor="genClassId">Sélectionner la classe *</Label>
                  <Select value={genClassId} onValueChange={setGenClassId}>
                    <SelectTrigger id="genClassId" className="mt-1">
                      <SelectValue placeholder="Choisir une classe" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.CE_LIBELLE || c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {genTarget === 'niveau' && (
                <div>
                  <Label htmlFor="genNiveau">Sélectionner le niveau *</Label>
                  <Select value={genNiveau} onValueChange={setGenNiveau}>
                    <SelectTrigger id="genNiveau" className="mt-1">
                      <SelectValue placeholder="Choisir un niveau (ex: 6ème, 3ème, CP1...)" />
                    </SelectTrigger>
                    <SelectContent>
                      {['Petite Section', 'Moyenne Section', 'Grande Section', 'CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2', '6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale'].map(n => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}



              <div>
                <Label htmlFor="presetSel">Modèle Tarifaire Officiel Hînneh (Recommandé) *</Label>
                <Select value={selectedPresetId} onValueChange={setSelectedPresetId}>
                  <SelectTrigger id="presetSel" className="mt-1 font-semibold text-indigo-700 dark:text-indigo-300">
                    <SelectValue placeholder="Selectionner le tarif officiel Hînneh" />
                  </SelectTrigger>
                  <SelectContent>
                    {hinnehPresets.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPresetId ? (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 text-xs text-emerald-800 dark:text-emerald-300">
                  <p className="font-bold flex items-center gap-1">
                    <Check className="w-4 h-4 text-emerald-600" /> Tarif Officiel Hînneh sélectionné
                  </p>
                  <p className="mt-1">
                    Les tranches exactes (05 Septembre, 05 Octobre, 05 Novembre, 05 Décembre, 05 Janvier, 05 Février, 05 Mars) seront générées automatiquement selon la fiche tarifaire officielle.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Ou configurer un plan personnalisé :</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="genAmount">Montant Total Scolarité (FCFA)</Label>
                      <Input
                        id="genAmount"
                        type="number"
                        value={genAmount}
                        onChange={(e) => setGenAmount(e.target.value)}
                        className="mt-1 font-bold"
                      />
                    </div>

                    <div>
                      <Label htmlFor="genTranches">Plan d'échelonnement</Label>
                      <Select value={genTranches} onValueChange={setGenTranches}>
                        <SelectTrigger id="genTranches" className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 Tranches (40% / 30% / 30%)</SelectItem>
                          <SelectItem value="4">4 Tranches (25% / 25% / 25% / 25%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenGenModal(false)}>Annuler</Button>
              {selectedPresetId ? (
                <Button onClick={handleApplyOfficialPreset} disabled={generating} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {generating ? 'Application...' : 'Appliquer Tarif Officiel Hînneh'}
                </Button>
              ) : (
                <Button onClick={handleGenerateCustomTemplate} disabled={generating} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {generating ? 'Génération...' : 'Générer Plan Personnalisé'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL 3: NOUVELLE TRANCHE PERSONNALISÉE */}
        <Dialog open={openAddModal} onOpenChange={setOpenAddModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-indigo-600">
                <Plus className="w-5 h-5" /> Ajouter une Échéance Personnalisée
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div>
                <Label htmlFor="addStudentId">Sélectionner l'élève *</Label>
                <Popover open={addStudentPopoverOpen} onOpenChange={setAddStudentPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="addStudentId"
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={addStudentPopoverOpen}
                      className="mt-1 w-full justify-between font-normal"
                    >
                      {(() => {
                        const s = students.find(st => String(st.id) === addStudentId);
                        return s
                          ? `${s.lastName || s.nom} ${s.firstName || s.prenom} (${s.matricule || 'N/A'})`
                          : <span className="text-muted-foreground">Choisir un élève</span>;
                      })()}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Rechercher par nom, prénom ou matricule..." />
                      <CommandList>
                        <CommandEmpty>Aucun élève trouvé.</CommandEmpty>
                        <CommandGroup>
                          {students.map(s => {
                            const label = `${s.lastName || s.nom || ''} ${s.firstName || s.prenom || ''} ${s.matricule || ''}`;
                            return (
                              <CommandItem
                                key={s.id}
                                value={label}
                                onSelect={() => {
                                  setAddStudentId(String(s.id));
                                  setAddStudentPopoverOpen(false);
                                }}
                              >
                                <Check className={cn('mr-2 h-4 w-4', addStudentId === String(s.id) ? 'opacity-100' : 'opacity-0')} />
                                {s.lastName || s.nom} {s.firstName || s.prenom} ({s.matricule || 'N/A'})
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="addLibelle">Libellé de la tranche *</Label>
                <Input
                  id="addLibelle"
                  placeholder="Ex: 2ème Tranche - Rentrée Octobre"
                  value={addLibelle}
                  onChange={(e) => setAddLibelle(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="addMontant">Montant Prévu (FCFA) *</Label>
                  <Input
                    id="addMontant"
                    type="number"
                    placeholder="Ex: 35000"
                    value={addMontant}
                    onChange={(e) => setAddMontant(e.target.value)}
                    className="mt-1 font-bold"
                  />
                </div>

                <div>
                  <Label htmlFor="addDueDate">Date de limite d'échéance *</Label>
                  <Input
                    id="addDueDate"
                    type="date"
                    value={addDueDate}
                    onChange={(e) => setAddDueDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenAddModal(false)}>Annuler</Button>
              <Button onClick={handleAddSingleEcheance} disabled={adding} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {adding ? 'Création...' : 'Créer l\'échéance'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={openPresetEditModal} onOpenChange={open => { setOpenPresetEditModal(open); if (!open) setPresetToEdit(null); }}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-indigo-600">
                <Edit3 className="w-5 h-5" /> {presetToEdit ? "Modifier le modèle tarifaire" : "Nouveau modèle tarifaire / échéancier"}
              </DialogTitle>
              <DialogDescription>
                Configurez la grille tarifaire et les tranches d'échéances pour votre établissement.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Type de Service & Info Établissement */}
              <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-indigo-950 dark:text-indigo-200">Type de Service Scolaire *</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={presetServiceType === 'scolarite' ? 'default' : 'outline'}
                      onClick={() => setPresetServiceType('scolarite')}
                      className={`text-xs font-bold ${presetServiceType === 'scolarite' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
                    >
                      🎓 Scolarité
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={presetServiceType === 'transport' ? 'default' : 'outline'}
                      onClick={() => setPresetServiceType('transport')}
                      className={`text-xs font-bold ${presetServiceType === 'transport' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
                    >
                      🚌 Transport & Car
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={presetServiceType === 'cantine' ? 'default' : 'outline'}
                      onClick={() => setPresetServiceType('cantine')}
                      className={`text-xs font-bold ${presetServiceType === 'cantine' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                    >
                      🍽️ Cantine
                    </Button>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-medium text-slate-500">Portée Établissement & Ville</p>
                  <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{currentSchoolName} {currentSchoolVille ? `(${currentSchoolVille})` : ''}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="presetLabel">Libellé du Tarif *</Label>
                  <Input
                    id="presetLabel"
                    value={presetLabel}
                    onChange={event => setPresetLabel(event.target.value)}
                    placeholder={
                      presetServiceType === 'transport'
                        ? 'Ex: Transport Mensuel Zone 1 (20 000 FCFA)'
                        : presetServiceType === 'cantine'
                        ? 'Ex: Forfait Cantine Mensuel (15 000 FCFA)'
                        : 'Ex: Réinscription 5ème AFFECTÉS (150 000 FCFA)'
                    }
                  />
                </div>

                {presetServiceType === 'scolarite' ? (
                  <div className="space-y-1">
                    <Label htmlFor="presetCycle">Cycle Scolaire *</Label>
                    <Select value={presetCycle} onValueChange={value => {
                      setPresetCycle(value);
                      if (!presetNiveaux) {
                        if (value === 'Maternelle') setPresetNiveaux('Petite Section, Moyenne Section, Grande Section');
                        else if (value === 'Primaire') setPresetNiveaux('CP1, CP2, CE1, CE2, CM1, CM2');
                        else if (value === 'Collège') setPresetNiveaux('6ème, 5ème, 4ème, 3ème');
                        else if (value.includes('Collège 2nd cycle')) setPresetNiveaux('2nde, 1ère, Terminale');
                      }
                    }}>
                      <SelectTrigger id="presetCycle" className="w-full">
                        <SelectValue placeholder="Choisir un cycle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Maternelle">Maternelle</SelectItem>
                        <SelectItem value="Primaire">Primaire</SelectItem>
                        <SelectItem value="Collège">Collège</SelectItem>
                        <SelectItem value="Collège 2nd cycle (Affectés)">Collège 2nd cycle (Affectés)</SelectItem>
                        <SelectItem value="Collège 2nd cycle (Non-Affectés)">Collège 2nd cycle (Non-Affectés)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : presetServiceType === 'transport' ? (
                  <div className="space-y-1">
                    <Label htmlFor="presetZoneTrajet">Zone / Ligne / Trajet de bus *</Label>
                    <Input
                      id="presetZoneTrajet"
                      value={presetZoneTrajet}
                      onChange={event => setPresetZoneTrajet(event.target.value)}
                      placeholder="Ex: Zone 1 (Centre Ville) ou Ligne Dar-Es-Salam"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label htmlFor="presetPeriodicite">Périodicité / Formule de Restauration *</Label>
                    <Select value={presetPeriodicite} onValueChange={setPresetPeriodicite}>
                      <SelectTrigger id="presetPeriodicite" className="w-full">
                        <SelectValue placeholder="Choisir une formule" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mensuel">Mensuelle (Paiement chaque mois)</SelectItem>
                        <SelectItem value="trimestriel">Trimestrielle (Paiement par trimestre)</SelectItem>
                        <SelectItem value="annuel">Annuelle (Paiement échelonné)</SelectItem>
                        <SelectItem value="carnet">Carnet de tickets / Repas ponctuel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Conditional options for Scolarite: Statut AFF/NAFF and Niveaux */}
              {presetServiceType === 'scolarite' && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Statut d'affectation concerné *
                    </Label>
                    <div className="flex items-center gap-6 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer" onClick={() => setPresetStatutAffectation('AFF')}>
                        <Checkbox
                          checked={presetStatutAffectation === 'AFF'}
                          onCheckedChange={() => setPresetStatutAffectation('AFF')}
                        />
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                          AFF
                        </Badge>
                        <span>Affecté</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer" onClick={() => setPresetStatutAffectation('NAFF')}>
                        <Checkbox
                          checked={presetStatutAffectation === 'NAFF'}
                          onCheckedChange={() => setPresetStatutAffectation('NAFF')}
                        />
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">
                          NAFF
                        </Badge>
                        <span>Non-Affecté</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="presetNiveaux">Niveaux *</Label>
                    <Select value={presetNiveaux} onValueChange={setPresetNiveaux}>
                      <SelectTrigger id="presetNiveaux" className="w-full">
                        <SelectValue placeholder="Choisir un niveau" />
                      </SelectTrigger>
                      <SelectContent>
                        {presetCycle === 'Maternelle' && (
                          <>
                            <SelectItem value="Petite Section">Petite Section</SelectItem>
                            <SelectItem value="Moyenne Section">Moyenne Section</SelectItem>
                            <SelectItem value="Grande Section">Grande Section</SelectItem>
                            <SelectItem value="Petite Section, Moyenne Section, Grande Section">Toutes Maternelles (PS, MS, GS)</SelectItem>
                          </>
                        )}
                        {presetCycle === 'Primaire' && (
                          <>
                            <SelectItem value="CP1">CP1</SelectItem>
                            <SelectItem value="CP2">CP2</SelectItem>
                            <SelectItem value="CE1">CE1</SelectItem>
                            <SelectItem value="CE2">CE2</SelectItem>
                            <SelectItem value="CM1">CM1</SelectItem>
                            <SelectItem value="CM2">CM2</SelectItem>
                            <SelectItem value="CP1, CP2, CE1, CE2, CM1, CM2">Tout Primaire (CP1 à CM2)</SelectItem>
                          </>
                        )}
                        {presetCycle === 'Collège' && (
                          <>
                            <SelectItem value="6ème">6ème</SelectItem>
                            <SelectItem value="5ème">5ème</SelectItem>
                            <SelectItem value="4ème">4ème</SelectItem>
                            <SelectItem value="3ème">3ème</SelectItem>
                            <SelectItem value="6ème, 5ème">6ème & 5ème</SelectItem>
                            <SelectItem value="4ème, 3ème">4ème & 3ème</SelectItem>
                            <SelectItem value="6ème, 5ème, 4ème, 3ème">Tout Collège (6ème à 3ème)</SelectItem>
                          </>
                        )}
                        {presetCycle?.includes('Collège 2nd cycle') && (
                          <>
                            <SelectItem value="2nde">2nde</SelectItem>
                            <SelectItem value="1ère">1ère</SelectItem>
                            <SelectItem value="Terminale">Terminale</SelectItem>
                            <SelectItem value="2nde, 1ère, Terminale">Tout 2nd cycle (2nde, 1ère, Tle)</SelectItem>
                          </>
                        )}
                        {!['Maternelle', 'Primaire', 'Collège'].includes(presetCycle) && !presetCycle?.includes('Collège 2nd cycle') && (
                          <>
                            <SelectItem value="Petite Section">Petite Section</SelectItem>
                            <SelectItem value="Moyenne Section">Moyenne Section</SelectItem>
                            <SelectItem value="Grande Section">Grande Section</SelectItem>
                            <SelectItem value="CP1">CP1</SelectItem>
                            <SelectItem value="CP2">CP2</SelectItem>
                            <SelectItem value="CE1">CE1</SelectItem>
                            <SelectItem value="CE2">CE2</SelectItem>
                            <SelectItem value="CM1">CM1</SelectItem>
                            <SelectItem value="CM2">CM2</SelectItem>
                            <SelectItem value="6ème">6ème</SelectItem>
                            <SelectItem value="5ème">5ème</SelectItem>
                            <SelectItem value="4ème">4ème</SelectItem>
                            <SelectItem value="3ème">3ème</SelectItem>
                            <SelectItem value="2nde">2nde</SelectItem>
                            <SelectItem value="1ère">1ère</SelectItem>
                            <SelectItem value="Terminale">Terminale</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Conditional options for Transport: Périodicité */}
              {presetServiceType === 'transport' && (
                <div className="space-y-1">
                  <Label htmlFor="presetPeriodiciteTransport">Périodicité de facturation du Transport *</Label>
                  <Select value={presetPeriodicite} onValueChange={setPresetPeriodicite}>
                    <SelectTrigger id="presetPeriodiciteTransport" className="w-full">
                      <SelectValue placeholder="Choisir une formule de car" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensuel">Mensuelle (Abonnement par mois)</SelectItem>
                      <SelectItem value="trimestriel">Trimestrielle (Abonnement par trimestre)</SelectItem>
                      <SelectItem value="annuel">Annuelle (Année scolaire intégrale)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-bold">Tranches d'échéances et de versements *</Label>
                    <p className="text-[11px] text-slate-500">
                      Total calculé : <span className="font-bold text-indigo-600">{formatCurrency(presetTranches.reduce((acc, t) => acc + (Number(t.montant) || 0), 0))}</span>
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setPresetTranches([...presetTranches, { libelle: `Tranche ${presetTranches.length + 1}`, montant: '', date: '2026-09-05' }])}>
                    <Plus className="w-3.5 h-3.5" /> Ajouter une tranche
                  </Button>
                </div>
                {presetTranches.map((tranche, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_130px_150px_36px] gap-2 items-end rounded-lg border p-2 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="space-y-1">
                      <Label className="text-xs">Libellé</Label>
                      <Input value={tranche.libelle} onChange={event => setPresetTranches(presetTranches.map((current, currentIndex) => currentIndex === index ? { ...current, libelle: event.target.value } : current))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Montant (FCFA)</Label>
                      <Input type="number" min="1" value={tranche.montant} onChange={event => setPresetTranches(presetTranches.map((current, currentIndex) => currentIndex === index ? { ...current, montant: event.target.value } : current))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Date limite</Label>
                      <Input type="date" value={tranche.date} onChange={event => setPresetTranches(presetTranches.map((current, currentIndex) => currentIndex === index ? { ...current, date: event.target.value } : current))} />
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={presetTranches.length === 1} onClick={() => setPresetTranches(presetTranches.filter((_, currentIndex) => currentIndex !== index))}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenPresetEditModal(false)}>Annuler</Button>
              <Button onClick={handleSavePreset} disabled={savingPreset} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {savingPreset ? 'Enregistrement...' : 'Enregistrer le tarif'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL 4: MODIFIER UNE ÉCHÉANCE */}
        <Dialog open={openEditModal} onOpenChange={setOpenEditModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-indigo-600">
                <Edit3 className="w-5 h-5" /> Modifier l'Échéance
              </DialogTitle>
              <DialogDescription>
                Modifiez les informations de cette tranche d'échéancier.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div>
                <Label htmlFor="editLibelle">Libellé *</Label>
                <Input
                  id="editLibelle"
                  value={editLibelle}
                  onChange={e => setEditLibelle(e.target.value)}
                  placeholder="Ex: Tranche 1 - Scolarité"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editMontant">Montant Prévu (FCFA) *</Label>
                  <Input
                    id="editMontant"
                    type="number"
                    value={editMontant}
                    onChange={e => setEditMontant(e.target.value)}
                    className="mt-1 font-bold"
                  />
                </div>
                <div>
                  <Label htmlFor="editTranche">N° Tranche</Label>
                  <Input
                    id="editTranche"
                    type="number"
                    value={editTranche}
                    onChange={e => setEditTranche(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="editDueDate">Date d'Échéance *</Label>
                <Input
                  id="editDueDate"
                  type="date"
                  value={editDueDate}
                  onChange={e => setEditDueDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenEditModal(false)}>Annuler</Button>
              <Button onClick={handleEditSubmit} disabled={submittingEdit} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {submittingEdit ? 'Enregistrement…' : 'Enregistrer les modifications'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL DE CONFIRMATION PURGE DES ÉCHÉANCIERS VIERGES */}
        <Dialog open={openPurgeModal} onOpenChange={setOpenPurgeModal}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5" /> Vider les échéanciers vierges / mock
              </DialogTitle>
              <DialogDescription>
                Cette opération supprime toutes les tranches d'échéancier générées par défaut ou sans aucun paiement enregistré.
              </DialogDescription>
            </DialogHeader>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg text-sm text-rose-800 dark:text-rose-300">
              <p className="font-semibold">Attention :</p>
              <p className="mt-1">
                Toutes les tranches d'échéances sans aucun versement (montant payé = 0 FCFA) pour l'établissement sélectionné seront définitivement supprimées. Les échéances avec des paiements existants seront <strong>strictement préservées</strong>.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenPurgeModal(false)}>Annuler</Button>
              <Button onClick={handlePurgeUnpaid} disabled={purging} variant="destructive" className="gap-2">
                {purging ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {purging ? 'Nettoyage en cours…' : 'Confirmer et Vider'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
}
