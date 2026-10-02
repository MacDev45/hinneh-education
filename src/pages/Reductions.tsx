/**
 * Module Exonerations & Reductions de Scolarite
 * Gestion administrative et comptable des remises accordees aux eleves :
 * - Fratrie & Familles nombreuses
 * - Enfants des membres du personnel & Direction
 * - Bourses d'excellence et subventions de merite
 * - Aides sociales et situations particulieres
 * - Decisions exceptionnelles de la Direction
 */
import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { formatStudentName, formatCurrency, formatDate } from '@/lib/index';
import { motion } from 'framer-motion';
import {
  Plus, Search, Edit3, Trash2, CheckCircle2,
  Users, AlertCircle, Filter, Percent, Clock,
  Eye, RefreshCw, Layers, Building2,
  Check, Printer, FileText, Download,
  RotateCcw, Sliders, Shield, Award, HeartHandshake,
  UserCheck, ChevronRight, X
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/apiClient';
import { printAttestationReduction } from '@/lib/schoolDocumentsPrinter';

interface ReductionItem {
  id: number | string;
  eleve_id: number;
  eleve_nom: string;
  eleve_prenom: string;
  matricule?: string;
  eleve_classe?: string;
  type_reduction: string;
  montant_reduction?: number;
  pourcentage_reduction?: number;
  motif?: string;
  date_debut?: string;
  date_fin?: string;
  statut?: string;
  appliquee_aux_echeances?: boolean;
  service_type?: string;
  date_creation?: string;
  total_prevu?: number;
  total_paye?: number;
  total_solde?: number;
  tranches_count?: number;
}

const CATEGORY_CONFIG: Record<string, { label: string; shortLabel: string; icon: any; colorClass: string }> = {
  fraterie_daloa: {
    label: 'Fratrie & Famille nombreuse',
    shortLabel: 'Fratrie',
    icon: Users,
    colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
  },
  personnel_standard: {
    label: 'Enfant du personnel',
    shortLabel: 'Personnel',
    icon: UserCheck,
    colorClass: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
  },
  personnel_strategique: {
    label: 'Direction & Comite strategique',
    shortLabel: 'Direction',
    icon: Shield,
    colorClass: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
  },
  personnel: {
    label: 'Personnel de l\'etablissement',
    shortLabel: 'Personnel',
    icon: UserCheck,
    colorClass: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
  },
  cas_social: {
    label: 'Aide sociale & Solidarite',
    shortLabel: 'Social',
    icon: HeartHandshake,
    colorClass: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
  },
  decision_direction: {
    label: 'Decision speciale de Direction',
    shortLabel: 'Decision Direction',
    icon: Building2,
    colorClass: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300'
  },
  famille_nombreuse: {
    label: 'Fratrie standard',
    shortLabel: 'Fratrie',
    icon: Users,
    colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
  },
  bourse: {
    label: 'Bourse d\'excellence',
    shortLabel: 'Bourse',
    icon: Award,
    colorClass: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300'
  },
  montant: {
    label: 'Montant forfaitaire deduit',
    shortLabel: 'Montant fixe',
    icon: Percent,
    colorClass: 'bg-slate-50 text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-300'
  },
  pourcentage: {
    label: 'Pourcentage global',
    shortLabel: 'Pourcentage',
    icon: Percent,
    colorClass: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300'
  },
};

export default function Reductions() {
  const { toast } = useToast();
  const [reductions, setReductions] = useState<ReductionItem[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('tous');
  const [filterStatut, setFilterStatut] = useState('tous');
  const [activeTab, setActiveTab] = useState('liste');

  // Recuperation automatique et authentique de l'etablissement actif
  const [activeSchool, setActiveSchool] = useState<{
    id?: number;
    code: string;
    city: string;
    name: string;
  }>(() => {
    if (typeof localStorage === 'undefined') {
      return { id: undefined, code: '', city: '', name: '' };
    }
    const userEcoleId = localStorage.getItem('user_ecole_id') || localStorage.getItem('selected_school_id') || '';
    const userEcoleCode = localStorage.getItem('user_ecole_code') || localStorage.getItem('selected_school_code') || '';
    const userEcoleVille = localStorage.getItem('user_ville') || localStorage.getItem('user_ecole_ville') || localStorage.getItem('user_city') || localStorage.getItem('selected_school_city') || '';
    const userEcoleNom = localStorage.getItem('user_ecole_name') || localStorage.getItem('user_ecole_nom') || localStorage.getItem('selected_school_name') || '';

    return {
      id: userEcoleId && userEcoleId !== 'null' && userEcoleId !== 'undefined' && !isNaN(Number(userEcoleId)) ? Number(userEcoleId) : undefined,
      code: userEcoleCode && userEcoleCode !== 'null' && userEcoleCode !== 'undefined' ? userEcoleCode.trim() : '',
      city: userEcoleVille && userEcoleVille !== 'null' && userEcoleVille !== 'undefined' ? userEcoleVille.trim() : '',
      name: userEcoleNom && userEcoleNom !== 'null' && userEcoleNom !== 'undefined' ? userEcoleNom.trim() : '',
    };
  });

  useEffect(() => {
    const resolveSchool = async () => {
      try {
        const schools = await apiClient.getSchools().catch(() => []);
        if (Array.isArray(schools) && schools.length > 0) {
          let matched: any = null;
          if (activeSchool.id) {
            matched = schools.find((s: any) => Number(s.id) === activeSchool.id || s.id === String(activeSchool.id));
          }
          if (!matched && activeSchool.code) {
            matched = schools.find((s: any) => (s.code || '').toUpperCase() === activeSchool.code.toUpperCase());
          }
          if (!matched && schools.length === 1) {
            matched = schools[0];
          }

          if (matched) {
            setActiveSchool(prev => ({
              id: matched.id ? Number(matched.id) : prev.id,
              code: matched.code || prev.code || '',
              city: matched.city || prev.city || '',
              name: matched.name || prev.name || '',
            }));
          }
        }
      } catch (err) {
        console.warn('Resolution etablissement:', err);
      }
    };
    resolveSchool();
  }, []);

  // Personnel & Direction
  const [staffList, setStaffList] = useState<any[]>([]);
  const [strategicGroup, setStrategicGroup] = useState<any[]>([]);
  const [strategicSearch, setStrategicSearch] = useState('');
  const [strategicLoading, setStrategicLoading] = useState(false);

  // Baremes tarifaires
  const [reductionParams, setReductionParams] = useState<any[]>([]);
  const [loadingParams, setLoadingParams] = useState(false);
  const [openParamModal, setOpenParamModal] = useState(false);
  const [editingParam, setEditingParam] = useState<any | null>(null);
  const [deleteParamTarget, setDeleteParamTarget] = useState<any | null>(null);
  const [paramSearch, setParamSearch] = useState('');
  const [paramCategoryFilter, setParamCategoryFilter] = useState('tous');
  const [savingParam, setSavingParam] = useState(false);

  const emptyParamForm = {
    id: undefined as number | undefined,
    libelle: '',
    categorie: 'fraterie_daloa',
    type_valeur: 'pourcentage' as 'pourcentage' | 'montant',
    taux_defaut: 10,
    montant_defaut: 0,
    description: '',
    criteres: '',
    ordre_affichage: 1,
    is_active: true,
    ecole_id: activeSchool.id,
    ET_CODEETABLISSEMENT: activeSchool.code || '',
    ville: activeSchool.city || '',
  };
  const [paramForm, setParamForm] = useState(emptyParamForm);

  // Modal saisie reduction
  const [openForm, setOpenForm] = useState(false);
  const [editTarget, setEditTarget] = useState<ReductionItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReductionItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Preview echeancier
  const [previewLoading, setPreviewLoading] = useState(false);
  const [studentSchedule, setStudentSchedule] = useState<any | null>(null);
  const [adjustmentPreview, setAdjustmentPreview] = useState<any | null>(null);

  // Modal consultation echeancier
  const [viewScheduleModal, setViewScheduleModal] = useState<any | null>(null);
  const [viewScheduleLoading, setViewScheduleLoading] = useState(false);

  // Personnel tab filter
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [personnelFilterType, setPersonnelFilterType] = useState<'all' | 'standard' | 'strategique'>('all');
  const [selectedStaffMember, setSelectedStaffMember] = useState<any | null>(null);
  const [modalStaffSearch, setModalStaffSearch] = useState('');

  const emptyForm = {
    eleveId: '',
    typeMode: 'pourcentage' as 'pourcentage' | 'montant',
    reductionCategory: 'cas_social' as string,
    taux: 10,
    montantFixe: 0,
    motif: '',
    serviceType: 'scolarite',
    modeDispersion: 'dernieres_tranches',
    appliquerImmediatement: true,
    dateDebut: new Date().toISOString().split('T')[0],
    dateFin: '',
    approuvePar: '',
  };
  const [form, setForm] = useState(emptyForm);

  const handleSelectStaffForReduction = (member: any) => {
    setSelectedStaffMember(member);
    const isStrat = !!member.is_groupe_strategique;
    const defaultTaux = isStrat ? 30 : 25;
    const nomComplet = `${member.nom || ''} ${member.prenom || ''}`.trim() || `Agent #${member.id}`;
    const role = member.fonction || member.role || 'Personnel';

    setForm({
      ...emptyForm,
      reductionCategory: isStrat ? 'personnel_strategique' : 'personnel_standard',
      typeMode: 'pourcentage',
      taux: defaultTaux,
      motif: `Ayant-droit membre du personnel : ${nomComplet} (${role}) — Remise accordee : ${defaultTaux}%`,
      approuvePar: `Direction — Ref. Parent : ${nomComplet}`,
      serviceType: 'scolarite',
      modeDispersion: 'dernieres_tranches',
      appliquerImmediatement: true,
    });
    setOpenForm(true);
  };

  const loadStrategicGroup = async () => {
    try {
      setStrategicLoading(true);
      const [staffData, stratData] = await Promise.all([
        apiClient.getStaff().catch(() => []),
        apiClient.getGroupeStrategique().catch(() => []),
      ]);
      setStaffList(staffData || []);
      setStrategicGroup(stratData || []);
    } catch (err) {
      console.warn('Erreur chargement personnel:', err);
    } finally {
      setStrategicLoading(false);
    }
  };

  const loadReductionParameters = async () => {
    try {
      setLoadingParams(true);
      const params = await apiClient.getReductionParameters({
        ecole_id: activeSchool.id,
        code_etablissement: activeSchool.code || undefined,
        ville: activeSchool.city || undefined,
      }).catch(() => []);
      setReductionParams(params || []);
    } catch (err) {
      console.warn('Erreur chargement baremes:', err);
    } finally {
      setLoadingParams(false);
    }
  };

  useEffect(() => {
    loadReductionParameters();
  }, [activeSchool.id, activeSchool.code, activeSchool.city]);

  const handleOpenCreateParamModal = () => {
    setEditingParam(null);
    setParamForm({
      id: undefined,
      libelle: '',
      categorie: 'fraterie_daloa',
      type_valeur: 'pourcentage',
      taux_defaut: 10,
      montant_defaut: 0,
      description: '',
      criteres: '',
      ordre_affichage: (reductionParams.length || 0) + 1,
      is_active: true,
      ecole_id: activeSchool.id,
      ET_CODEETABLISSEMENT: activeSchool.code || '',
      ville: activeSchool.city || '',
    });
    setOpenParamModal(true);
  };

  const handleOpenEditParamModal = (param: any) => {
    setEditingParam(param);
    setParamForm({
      id: param.id,
      libelle: param.libelle || '',
      categorie: param.categorie || 'fraterie_daloa',
      type_valeur: param.type_valeur || 'pourcentage',
      taux_defaut: Number(param.taux_defaut || 0),
      montant_defaut: Number(param.montant_defaut || 0),
      description: param.description || '',
      criteres: param.criteres || '',
      ordre_affichage: param.ordre_affichage || 1,
      is_active: param.is_active !== undefined ? param.is_active : true,
      ecole_id: param.ecole_id !== undefined ? param.ecole_id : activeSchool.id,
      ET_CODEETABLISSEMENT: param.ET_CODEETABLISSEMENT !== undefined && param.ET_CODEETABLISSEMENT !== null ? param.ET_CODEETABLISSEMENT : (activeSchool.code || ''),
      ville: param.ville !== undefined && param.ville !== null ? param.ville : (activeSchool.city || ''),
    });
    setOpenParamModal(true);
  };

  const handleSaveParam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paramForm.libelle.trim()) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Le libelle de la regle est obligatoire.' });
      return;
    }

    try {
      setSavingParam(true);
      if (editingParam?.id) {
        await apiClient.updateReductionParameter(editingParam.id, {
          libelle: paramForm.libelle,
          categorie: paramForm.categorie,
          type_valeur: paramForm.type_valeur,
          taux_defaut: paramForm.type_valeur === 'pourcentage' ? Number(paramForm.taux_defaut) : 0,
          montant_defaut: paramForm.type_valeur === 'montant' ? Number(paramForm.montant_defaut) : 0,
          description: paramForm.description,
          criteres: paramForm.criteres,
          ordre_affichage: Number(paramForm.ordre_affichage) || 1,
          is_active: paramForm.is_active,
          ecole_id: paramForm.ecole_id !== undefined ? paramForm.ecole_id : activeSchool.id,
          ET_CODEETABLISSEMENT: paramForm.ET_CODEETABLISSEMENT || activeSchool.code || undefined,
          ville: paramForm.ville || activeSchool.city || undefined,
        });
        toast({ title: 'Bareme mis a jour', description: `La regle tarifaire « ${paramForm.libelle} » a ete actualisee.` });
      } else {
        await apiClient.createReductionParameter({
          libelle: paramForm.libelle,
          categorie: paramForm.categorie,
          type_valeur: paramForm.type_valeur,
          taux_defaut: paramForm.type_valeur === 'pourcentage' ? Number(paramForm.taux_defaut) : 0,
          montant_defaut: paramForm.type_valeur === 'montant' ? Number(paramForm.montant_defaut) : 0,
          description: paramForm.description,
          criteres: paramForm.criteres,
          ordre_affichage: Number(paramForm.ordre_affichage) || 1,
          is_active: paramForm.is_active,
          ecole_id: paramForm.ecole_id !== undefined ? paramForm.ecole_id : activeSchool.id,
          ET_CODEETABLISSEMENT: paramForm.ET_CODEETABLISSEMENT || activeSchool.code || undefined,
          ville: paramForm.ville || activeSchool.city || undefined,
        });
        toast({ title: 'Bareme cree', description: `La regle tarifaire « ${paramForm.libelle} » a ete ajoutee.` });
      }
      setOpenParamModal(false);
      await loadReductionParameters();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.response?.data?.detail || err.message || 'Impossible d\'enregistrer le bareme' });
    } finally {
      setSavingParam(false);
    }
  };

  const handleDeleteParam = async () => {
    if (!deleteParamTarget) return;
    try {
      setSavingParam(true);
      await apiClient.deleteReductionParameter(deleteParamTarget.id);
      toast({ title: 'Bareme supprime', description: `La regle « ${deleteParamTarget.libelle} » a ete retiree.` });
      setDeleteParamTarget(null);
      await loadReductionParameters();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de supprimer le bareme' });
    } finally {
      setSavingParam(false);
    }
  };

  const handleResetDefaultParams = async () => {
    if (!confirm('Souhaitez-vous restaurer la configuration des baremes par defaut pour votre etablissement ?')) return;
    try {
      setLoadingParams(true);
      const res = await apiClient.resetReductionParametersDefaults({
        ecole_id: activeSchool.id,
        code_etablissement: activeSchool.code || undefined,
        ville: activeSchool.city || undefined,
      });
      toast({ title: 'Baremes reinitialises', description: res.message || 'Les baremes officiels de reference ont ete restaures.' });
      await loadReductionParameters();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de reinitialiser les baremes' });
    } finally {
      setLoadingParams(false);
    }
  };

  const handleApplyParamRule = (rule: any) => {
    const isPourcentage = rule.type_valeur === 'pourcentage';
    const taux = isPourcentage ? Number(rule.taux_defaut || 0) : 0;
    const montant = !isPourcentage ? Number(rule.montant_defaut || 0) : 0;
    
    setForm({
      ...emptyForm,
      reductionCategory: rule.categorie || 'autre',
      typeMode: isPourcentage ? 'pourcentage' : 'montant',
      taux,
      montantFixe: montant,
      motif: `${rule.libelle} (${isPourcentage ? `${taux}%` : `${formatCurrency(montant)}`})`,
      approuvePar: 'Direction des Etudes',
      serviceType: 'scolarite',
      modeDispersion: 'dernieres_tranches',
      appliquerImmediatement: true,
    });
    setOpenForm(true);
  };

  const handleToggleStrategicMember = async (member: any, shouldBeInGroup: boolean) => {
    try {
      setStrategicLoading(true);
      const res = await apiClient.toggleGroupeStrategique(member.id, {
        is_groupe_strategique: shouldBeInGroup,
        nomme_par: 'Direction des Etudes',
      });
      toast({
        title: shouldBeInGroup ? 'Membre ajoute au comite' : 'Membre retire du comite',
        description: res.message,
      });
      await loadStrategicGroup();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Action impossible';
      toast({
        variant: 'destructive',
        title: 'Action non effectuee',
        description: msg,
      });
    } finally {
      setStrategicLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [redList, studList] = await Promise.all([
        apiClient.getReductions().catch(() => [] as any[]),
        apiClient.getStudents().catch(() => [] as any[]),
      ]);
      setReductions(redList || []);
      setStudents(studList || []);
      await Promise.all([
        loadStrategicGroup(),
        loadReductionParameters(),
      ]);
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de charger les donnees.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update schedule & adjustment preview whenever form input changes
  useEffect(() => {
    if (!openForm || !form.eleveId) {
      setStudentSchedule(null);
      setAdjustmentPreview(null);
      return;
    }

    const fetchPreview = async () => {
      try {
        setPreviewLoading(true);
        const eleveIdNum = parseInt(form.eleveId);
        
        const sched = await apiClient.getStudentEcheancierForReduction(eleveIdNum).catch(() => null);
        setStudentSchedule(sched);

        const isPourcentage = form.typeMode === 'pourcentage';
        const preview = await apiClient.previewReductionAdjustment({
          eleve_id: eleveIdNum,
          type_reduction: isPourcentage ? 'pourcentage' : 'montant',
          pourcentage_reduction: isPourcentage ? Number(form.taux) : undefined,
          montant_reduction: !isPourcentage ? Number(form.montantFixe) : undefined,
          service_type: form.serviceType || undefined,
          mode_dispersion: form.modeDispersion || 'dernieres_tranches',
        });
        setAdjustmentPreview(preview);
      } catch (e) {
        console.error('Erreur calcul preview:', e);
      } finally {
        setPreviewLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchPreview();
    }, 200);

    return () => clearTimeout(timer);
  }, [openForm, form.eleveId, form.typeMode, form.taux, form.montantFixe, form.serviceType, form.modeDispersion]);

  const handleOpenScheduleModal = async (eleveId: number, studentName: string) => {
    try {
      setViewScheduleLoading(true);
      const sched = await apiClient.getStudentEcheancierForReduction(eleveId);
      setViewScheduleModal({
        ...sched,
        studentName: sched.eleve_nom || studentName,
      });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erreur', description: "Impossible de charger l'echeancier de cet eleve." });
    } finally {
      setViewScheduleLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return reductions.filter(r => {
      const matchSearch = `${r.eleve_nom} ${r.eleve_prenom} ${r.eleve_classe || ''} ${r.motif || ''} ${r.matricule || ''}`
        .toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === 'tous' || r.type_reduction === filterType;
      const matchStatut = filterStatut === 'tous' || r.statut === filterStatut || (filterStatut === 'active' && r.statut === 'actif');
      return matchSearch && matchType && matchStatut;
    });
  }, [reductions, search, filterType, filterStatut]);

  const handleExportHistorique = () => {
    if (!filtered.length) {
      toast({
        variant: 'destructive',
        title: 'Aucune donnee',
        description: "Il n'y a aucun dossier de reduction correspondant aux filtres actuels a exporter.",
      });
      return;
    }

    const excelRows = filtered.map((r, index) => {
      const isPourcent = r.pourcentage_reduction != null && r.pourcentage_reduction > 0;
      const cfg = CATEGORY_CONFIG[r.type_reduction];
      const montantEstime = isPourcent && r.total_prevu
        ? (Number(r.total_prevu) * Number(r.pourcentage_reduction)) / 100
        : Number(r.montant_reduction || 0);

      return {
        'N°': index + 1,
        'Eleve (Nom & Prenoms)': `${r.eleve_nom || ''} ${r.eleve_prenom || ''}`.trim() || 'Inconnu',
        'Matricule': r.matricule || 'N/A',
        'Classe': r.eleve_classe || '—',
        'Categorie': cfg?.label || r.type_reduction,
        'Type': isPourcent ? 'Pourcentage' : 'Montant fixe',
        'Taux (%)': isPourcent ? Number(r.pourcentage_reduction) : '',
        'Montant Remise (FCFA)': Math.round(montantEstime),
        'Motif': r.motif || '',
        'Service': r.service_type || 'scolarite',
        'Date Debut': r.date_debut ? formatDate(new Date(r.date_debut)) : '',
        'Date Fin': r.date_fin ? formatDate(new Date(r.date_fin)) : 'Illimitee',
        'Statut': (r.statut === 'actif' || r.statut === 'active') ? 'Active' : 'Suspendue',
        'Appliquee a l\'echeancier': r.appliquee_aux_echeances ? 'Oui' : 'Non',
        'Total Prevu (FCFA)': r.total_prevu != null ? Math.round(Number(r.total_prevu)) : '',
        'Total Paye (FCFA)': r.total_paye != null ? Math.round(Number(r.total_paye)) : '',
        'Solde Restant (FCFA)': r.total_solde != null ? Math.round(Number(r.total_solde)) : '',
        'Date de Creation': r.date_creation ? formatDate(new Date(r.date_creation)) : '',
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelRows);

    ws['!cols'] = [
      { wch: 5 }, { wch: 26 }, { wch: 14 }, { wch: 12 }, { wch: 22 },
      { wch: 14 }, { wch: 9 }, { wch: 18 }, { wch: 32 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 16 },
      { wch: 16 }, { wch: 16 }, { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Historique Reductions');

    const today = new Date().toISOString().split('T')[0];
    const schoolLabel = activeSchool.code || activeSchool.name || 'Etablissement';
    const filename = `Historique_Reductions_${schoolLabel}_${today}.xlsx`.replace(/\s+/g, '_');
    XLSX.writeFile(wb, filename);

    toast({
      title: 'Export reussi',
      description: `${filtered.length} dossier(s) de reduction exporte(s) vers ${filename}.`,
    });
  };

  // Real KPIs calculations
  const kpis = useMemo(() => {
    const totalCount = reductions.length;
    const activeCount = reductions.filter(r => r.statut === 'actif' || r.statut === 'active').length;
    
    let totalMontantRemises = 0;
    let totalTauxSum = 0;
    let countWithTaux = 0;

    reductions.forEach(r => {
      if (r.statut === 'actif' || r.statut === 'active') {
        if (r.montant_reduction && r.montant_reduction > 0) {
          totalMontantRemises += Number(r.montant_reduction);
        } else if (r.pourcentage_reduction && r.total_prevu) {
          totalMontantRemises += (Number(r.total_prevu) * Number(r.pourcentage_reduction)) / 100;
        }
        if (r.pourcentage_reduction && r.pourcentage_reduction > 0) {
          totalTauxSum += Number(r.pourcentage_reduction);
          countWithTaux++;
        }
      }
    });

    const averageTaux = countWithTaux > 0 ? Math.round(totalTauxSum / countWithTaux) : 0;

    return {
      totalCount,
      activeCount,
      totalMontantRemises,
      averageTaux,
    };
  }, [reductions]);

  const handlePrintAttestation = async (r: ReductionItem) => {
    try {
      const sched = await apiClient.getStudentEcheancierForReduction(r.eleve_id).catch(() => null);
      const studentObj = students.find(s => s.id === r.eleve_id);
      
      printAttestationReduction({
        studentName: `${r.eleve_nom} ${r.eleve_prenom}`.trim(),
        matricule: r.matricule || studentObj?.matricule || 'N/C',
        className: r.eleve_classe || studentObj?.className || studentObj?.classe_name || '',
        dateNaissance: studentObj?.date_naissance || studentObj?.dateNaissance || '',
        parentName: studentObj?.parent_nom_complet || studentObj?.AU_PERENOMPRENOMS || studentObj?.tuteurLegal || 'Parent d\'eleve',
        parentPhone: studentObj?.parent_whatsapp || studentObj?.AU_CONTACTS || studentObj?.telTuteur || 'N/C',
        typeReductionLabel: CATEGORY_CONFIG[r.type_reduction]?.label || r.type_reduction,
        tauxReduction: r.pourcentage_reduction,
        montantReduction: r.montant_reduction,
        motif: r.motif || 'Reduction accordee',
        dateEffet: r.date_debut || formatDate(r.date_creation || new Date().toISOString()),
        approuvePar: 'Direction des Etudes / Direction Generale',
        totalInitial: sched?.total_prevu || (r.total_prevu || 0),
        totalAjuste: (sched?.total_prevu || r.total_prevu || 0) - (r.montant_reduction || 0),
        tranches: sched?.tranches || []
      });
      toast({
        title: 'Attestation prete pour impression',
        description: `Impression de l'attestation de remise de scolarite pour ${r.eleve_nom} ${r.eleve_prenom}.`
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Erreur d\'impression',
        description: 'Impossible de generer l\'attestation de reduction.'
      });
    }
  };

  const handleOpenEdit = (r: ReductionItem) => {
    setEditTarget(r);
    const isPourcentage = r.pourcentage_reduction != null && r.pourcentage_reduction > 0;
    setForm({
      eleveId: String(r.eleve_id),
      typeMode: isPourcentage ? 'pourcentage' : 'montant',
      reductionCategory: r.type_reduction || 'autre',
      taux: r.pourcentage_reduction || 10,
      montantFixe: r.montant_reduction || 0,
      motif: r.motif || '',
      serviceType: r.service_type || 'scolarite',
      modeDispersion: 'dernieres_tranches',
      appliquerImmediatement: true,
      dateDebut: r.date_debut || new Date().toISOString().split('T')[0],
      dateFin: r.date_fin || '',
      approuvePar: 'Direction',
    });
    setOpenForm(true);
  };

  const handleSubmit = async () => {
    if (!form.eleveId) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez selectionner un eleve.' });
      return;
    }
    if (!form.motif.trim()) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez preciser le motif de la reduction.' });
      return;
    }

    try {
      setSaving(true);
      const isPourcentage = form.typeMode === 'pourcentage';
      const payload: any = {
        eleve_id: parseInt(form.eleveId),
        type_reduction: isPourcentage ? 'pourcentage' : 'montant',
        montant_reduction: !isPourcentage ? Number(form.montantFixe) : undefined,
        pourcentage_reduction: isPourcentage ? Number(form.taux) : undefined,
        motif: `[${CATEGORY_CONFIG[form.reductionCategory]?.shortLabel || form.reductionCategory}] ${form.motif}`.trim(),
        date_debut: form.dateDebut || undefined,
        date_fin: form.dateFin || undefined,
        service_type: form.serviceType || 'scolarite',
        approuve_par: form.approuvePar || 'Direction',
        appliquer_immediatement: form.appliquerImmediatement,
        mode_dispersion: form.modeDispersion || 'dernieres_tranches',
      };

      if (editTarget) {
        await apiClient.updateReduction(Number(editTarget.id), payload);
        toast({ title: 'Dossier mis a jour', description: 'La reduction a ete modifiee avec succes.' });
      } else {
        await apiClient.createReduction(payload);
        toast({
          title: 'Exoneration enregistree',
          description: form.appliquerImmediatement 
            ? 'L\'echeancier de l\'eleve a ete mis a jour avec les montants recalcules.' 
            : 'La reduction a ete ajoutee au registre.'
        });
      }

      setOpenForm(false);
      setEditTarget(null);
      setForm(emptyForm);
      await loadData();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: err.response?.data?.detail || 'Impossible d\'enregistrer la reduction.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDisperseNow = async (r: ReductionItem) => {
    try {
      await apiClient.disperseReduction(Number(r.id));
      toast({
        title: 'Reduction appliquee',
        description: "L'echeancier de l'eleve a ete recalcule avec le taux de reduction.",
      });
      await loadData();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Impossible d\'appliquer la reduction',
        description: err.response?.data?.detail || "Aucun echeancier n'est encore disponible pour cet eleve.",
      });
    }
  };

  const handleToggleStatut = async (r: ReductionItem) => {
    try {
      const nextStatut = (r.statut === 'actif' || r.statut === 'active') ? 'suspendue' : 'actif';
      await apiClient.updateReduction(Number(r.id), { statut: nextStatut });
      toast({ title: `Dossier ${nextStatut === 'actif' ? 'reactive' : 'suspendu'}.` });
      await loadData();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de modifier le statut.' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiClient.deleteReduction(Number(deleteTarget.id));
      toast({ title: 'Exoneration supprimee', description: 'Le dossier a ete retire du registre.' });
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de supprimer la reduction.' });
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* En-tete sobre et professionnel */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Exonerations & Reductions de Scolarite
              </h1>
              {activeSchool.name || activeSchool.code ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  {activeSchool.name || activeSchool.code} {activeSchool.city ? `• ${activeSchool.city}` : ''}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Registre des remises accordees, baremes d'attribution par etablissement et ajustement des echeanciers.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 shadow-xs"
              onClick={() => {
                setForm(emptyForm);
                setEditTarget(null);
                setOpenForm(true);
              }}
            >
              <Plus className="h-4 w-4" /> Accorder une reduction
            </Button>
          </div>
        </div>

        {/* Indicateurs Cles Administratifs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Dossiers Actifs
                </p>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
                  {kpis.activeCount} <span className="text-xs font-normal text-slate-400">/ {kpis.totalCount}</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total Exonere Estime
                </p>
                <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(kpis.totalMontantRemises)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Percent className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Taux Moyen Applique
                </p>
                <p className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
                  {kpis.averageTaux > 0 ? `${kpis.averageTaux}%` : '—'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Percent className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Regles & Baremes
                </p>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
                  {reductionParams.filter(p => p.is_active).length} <span className="text-xs font-normal text-slate-400">configures</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation par Onglets */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700">
            <TabsTrigger value="liste" className="gap-2 text-xs font-semibold">
              <FileText className="h-4 w-4" /> Dossiers d'Exoneration ({filtered.length})
            </TabsTrigger>
            <TabsTrigger value="parametres" className="gap-2 text-xs font-semibold">
              <Sliders className="h-4 w-4" /> Baremes de l'Etablissement ({reductionParams.length})
            </TabsTrigger>
            <TabsTrigger value="personnel_space" className="gap-2 text-xs font-semibold">
              <Users className="h-4 w-4" /> Ayants-droit du Personnel ({staffList.length})
            </TabsTrigger>
          </TabsList>

          {/* ============================================================ */}
          {/* ONGLET 1 : REGISTRE DES REDUCTIONS ACCORDEES                 */}
          {/* ============================================================ */}
          <TabsContent value="liste" className="space-y-4">
            {/* Barre d'outils & Filtres */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-9 text-xs h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  placeholder="Rechercher par eleve, matricule, classe, motif..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-48 text-xs h-9 bg-white dark:bg-slate-900">
                    <Filter className="h-3.5 w-3.5 mr-2 text-slate-400" />
                    <SelectValue placeholder="Toutes les categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous" className="text-xs">Toutes les categories</SelectItem>
                    {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterStatut} onValueChange={setFilterStatut}>
                  <SelectTrigger className="w-36 text-xs h-9 bg-white dark:bg-slate-900">
                    <SelectValue placeholder="Tous statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous" className="text-xs">Tous statuts</SelectItem>
                    <SelectItem value="active" className="text-xs">Active</SelectItem>
                    <SelectItem value="suspendue" className="text-xs">Suspendue</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  className="gap-1.5 text-xs h-9 font-semibold border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                  onClick={handleExportHistorique}
                  title="Telecharger l'historique des reductions affichees (Excel)"
                >
                  <Download className="h-3.5 w-3.5" /> Telecharger l'historique
                </Button>
              </div>
            </div>

            {/* Tableau Comptable des Reductions */}
            {loading ? (
              <Card className="border-slate-200 dark:border-slate-800">
                <CardContent className="py-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                  Chargement des dossiers d'exoneration...
                </CardContent>
              </Card>
            ) : filtered.length === 0 ? (
              <Card className="border-slate-200 dark:border-slate-800">
                <CardContent className="py-16 text-center text-slate-500 space-y-2">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Aucune reduction enregistree
                  </p>
                  <p className="text-xs text-slate-400">
                    {search ? 'Aucun resultat correspondant aux criteres de recherche.' : 'Cliquez sur « Accorder une reduction » pour creer le premier dossier.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden bg-white dark:bg-slate-900">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                      <tr>
                        <th className="text-left p-3.5">Eleve & Identifiant</th>
                        <th className="text-left p-3.5">Classe</th>
                        <th className="text-left p-3.5">Categorie</th>
                        <th className="text-right p-3.5">Remise Accordee</th>
                        <th className="text-left p-3.5">Motif & Justification</th>
                        <th className="text-center p-3.5">Echeancier</th>
                        <th className="text-center p-3.5">Statut</th>
                        <th className="text-right p-3.5">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filtered.map(r => {
                        const isPourcent = r.pourcentage_reduction != null && r.pourcentage_reduction > 0;
                        const labelValue = isPourcent ? `-${r.pourcentage_reduction}%` : `-${formatCurrency(r.montant_reduction || 0)}`;
                        const cfg = CATEGORY_CONFIG[r.type_reduction] || {
                          label: r.type_reduction,
                          shortLabel: r.type_reduction,
                          icon: FileText,
                          colorClass: 'bg-slate-100 text-slate-800 border-slate-200'
                        };
                        const IconComponent = cfg.icon;

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="p-3.5">
                              <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                {r.eleve_nom} {r.eleve_prenom}
                              </p>
                              {r.matricule && (
                                <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                                  Matricule : {r.matricule}
                                </p>
                              )}
                            </td>
                            <td className="p-3.5 text-slate-600 dark:text-slate-400 font-medium">
                              {r.eleve_classe || '—'}
                            </td>
                            <td className="p-3.5">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${cfg.colorClass}`}>
                                <IconComponent className="w-3 h-3" />
                                {cfg.shortLabel}
                              </span>
                            </td>
                            <td className="p-3.5 text-right font-mono font-bold text-indigo-700 dark:text-indigo-400 text-xs">
                              {labelValue}
                            </td>
                            <td className="p-3.5 text-slate-600 dark:text-slate-400 max-w-[220px] truncate" title={r.motif}>
                              {r.motif || '—'}
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2.5 text-[11px] font-medium gap-1 border-slate-200 text-slate-700 hover:bg-slate-100"
                                  onClick={() => handleOpenScheduleModal(r.eleve_id, `${r.eleve_nom} ${r.eleve_prenom}`)}
                                >
                                  <Eye className="h-3 w-3 text-slate-500" />
                                  {r.tranches_count ? `${r.tranches_count} tranches` : "Detail"}
                                </Button>
                                {!r.appliquee_aux_echeances && (
                                  <Badge
                                    variant="outline"
                                    className="h-7 px-2 text-[10px] font-semibold gap-1 bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                                    title="Cette reduction n'a pas encore ete repercutee sur l'echeancier (aucune tranche disponible au moment de sa creation). Cliquez sur 'Appliquer maintenant'."
                                  >
                                    <AlertCircle className="h-3 w-3" /> Non appliquee
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5 text-center">
                              <Badge
                                variant={(r.statut === 'actif' || r.statut === 'active') ? 'default' : 'secondary'}
                                className={`text-[10px] font-semibold ${(r.statut === 'actif' || r.statut === 'active') ? 'bg-emerald-600 text-white' : ''}`}
                              >
                                {(r.statut === 'actif' || r.statut === 'active') ? 'Active' : 'Suspendue'}
                              </Badge>
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {!r.appliquee_aux_echeances && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                    onClick={() => handleDisperseNow(r)}
                                    title="Appliquer maintenant la reduction sur l'echeancier"
                                  >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
                                  onClick={() => handlePrintAttestation(r)}
                                  title="Imprimer l'attestation de reduction"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                                  onClick={() => handleToggleStatut(r)}
                                  title={(r.statut === 'actif' || r.statut === 'active') ? 'Suspendre la reduction' : 'Reactiver la reduction'}
                                >
                                  {(r.statut === 'actif' || r.statut === 'active')
                                    ? <Clock className="h-3.5 w-3.5 text-amber-600" />
                                    : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-indigo-600"
                                  onClick={() => handleOpenEdit(r)}
                                  title="Modifier le dossier"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                  onClick={() => setDeleteTarget(r)}
                                  title="Supprimer la reduction"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ============================================================ */}
          {/* ONGLET 2 : BAREMES & REGLES TARIFAIRES                      */}
          {/* ============================================================ */}
          <TabsContent value="parametres" className="space-y-4">
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-indigo-600" />
                      Regles & Baremes Tarifaires de l'Etablissement
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Configurez les pourcentages standards et conditions d'attribution applicables lors des inscriptions.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleResetDefaultParams}
                      disabled={loadingParams}
                      className="text-xs h-8 gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      Baremes par defaut
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleOpenCreateParamModal}
                      className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter une regle
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Recherche dans les baremes */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={paramSearch}
                      onChange={e => setParamSearch(e.target.value)}
                      placeholder="Rechercher par libelle, categorie, ville..."
                      className="pl-9 text-xs h-8 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: 'tous', label: `Tous (${reductionParams.length})` },
                      { id: 'fraterie_daloa', label: 'Fratrie' },
                      { id: 'personnel', label: 'Personnel' },
                      { id: 'cas_social', label: 'Aide Sociale' },
                      { id: 'decision_direction', label: 'Direction' },
                      { id: 'bourse', label: 'Bourse' },
                    ].map(tab => (
                      <Button
                        key={tab.id}
                        size="sm"
                        variant={paramCategoryFilter === tab.id ? 'default' : 'outline'}
                        onClick={() => setParamCategoryFilter(tab.id)}
                        className={`text-xs h-8 ${paramCategoryFilter === tab.id ? 'bg-slate-800 text-white' : ''}`}
                      >
                        {tab.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Grille des regles tarifaires */}
                {loadingParams ? (
                  <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" /> Chargement des baremes...
                  </div>
                ) : reductionParams.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 border border-dashed rounded-xl">
                    <Sliders className="w-6 h-6 mx-auto text-slate-300" />
                    <p className="text-xs font-semibold mt-2">Aucune regle tarifaire configuree.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {reductionParams
                      .filter(p => {
                        if (paramCategoryFilter === 'tous') return true;
                        if (paramCategoryFilter === 'personnel') {
                          return p.categorie === 'personnel_standard' || p.categorie === 'personnel_strategique' || p.categorie === 'personnel';
                        }
                        return p.categorie === paramCategoryFilter;
                      })
                      .filter(p => {
                        const s = paramSearch.toLowerCase().trim();
                        if (!s) return true;
                        const matchStr = `${p.libelle || ''} ${p.description || ''} ${p.criteres || ''} ${p.categorie || ''} ${p.ville || ''} ${p.ET_CODEETABLISSEMENT || ''}`.toLowerCase();
                        return matchStr.includes(s);
                      })
                      .map(rule => {
                        const isPourcentage = rule.type_valeur === 'pourcentage';
                        const cfg = CATEGORY_CONFIG[rule.categorie] || {
                          label: rule.categorie,
                          shortLabel: rule.categorie,
                          icon: Sliders,
                          colorClass: 'bg-slate-50 text-slate-800 border-slate-200'
                        };
                        const IconComponent = cfg.icon;

                        return (
                          <div
                            key={rule.id}
                            className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 bg-white dark:bg-slate-900 ${
                              !rule.is_active
                                ? 'opacity-60 border-slate-200 dark:border-slate-800'
                                : 'border-slate-200 dark:border-slate-800 hover:border-indigo-200 shadow-2xs'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium border ${cfg.colorClass}`}>
                                  <IconComponent className="w-3 h-3" />
                                  {cfg.shortLabel}
                                </span>
                                <Badge
                                  variant={rule.is_active ? 'default' : 'secondary'}
                                  className={`text-[9px] ${rule.is_active ? 'bg-emerald-600 text-white' : ''}`}
                                >
                                  {rule.is_active ? 'Actif' : 'Inactif'}
                                </Badge>
                              </div>

                              <div>
                                <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                                  {rule.libelle}
                                </h4>
                                <div className="mt-1 flex items-center gap-2">
                                  <span className="text-[11px] text-slate-500 font-medium">Taux standard :</span>
                                  <span className="text-xs font-bold font-mono text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
                                    {isPourcentage ? `-${rule.taux_defaut}%` : `-${formatCurrency(rule.montant_defaut)}`}
                                  </span>
                                </div>
                              </div>

                              {rule.description && (
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                                  {rule.description}
                                </p>
                              )}

                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono pt-1">
                                <span>📍 {rule.ville || 'Toutes Villes'}</span>
                                <span>•</span>
                                <span>{rule.ET_CODEETABLISSEMENT || 'Tous Etablissements'}</span>
                              </div>
                            </div>

                            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenEditParamModal(rule)}
                                  className="h-6 px-2 text-[11px] text-slate-600 hover:text-indigo-600"
                                >
                                  Modifier
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDeleteParamTarget(rule)}
                                  className="h-6 px-2 text-[11px] text-rose-600 hover:text-rose-700"
                                >
                                  Supprimer
                                </Button>
                              </div>

                              <Button
                                size="sm"
                                onClick={() => handleApplyParamRule(rule)}
                                className="h-6 px-2.5 text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                              >
                                Appliquer
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================================================ */}
          {/* ONGLET 3 : AYANTS-DROIT DU PERSONNEL                        */}
          {/* ============================================================ */}
          <TabsContent value="personnel_space" className="space-y-4">
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      Membres du Personnel & Ayants-droit
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Selectionnez un membre du personnel pour lui accorder la remise tarifaire applicable a ses enfants scolarises.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5">
                    {staffList.length} Agent(s) repertorie(s)
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Filtres personnel */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={personnelSearch}
                      onChange={e => setPersonnelSearch(e.target.value)}
                      placeholder="Rechercher un membre du personnel par nom, prenom, fonction..."
                      className="pl-9 text-xs h-8 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant={personnelFilterType === 'all' ? 'default' : 'outline'}
                      className="text-xs h-8"
                      onClick={() => setPersonnelFilterType('all')}
                    >
                      Tous ({staffList.length})
                    </Button>
                    <Button
                      size="sm"
                      variant={personnelFilterType === 'standard' ? 'default' : 'outline'}
                      className="text-xs h-8"
                      onClick={() => setPersonnelFilterType('standard')}
                    >
                      Personnel standard (-25%)
                    </Button>
                    <Button
                      size="sm"
                      variant={personnelFilterType === 'strategique' ? 'default' : 'outline'}
                      className="text-xs h-8 text-amber-900 dark:text-amber-300 border-amber-300"
                      onClick={() => setPersonnelFilterType('strategique')}
                    >
                      Direction & Comite (-30%)
                    </Button>
                  </div>
                </div>

                {/* Liste des agents */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
                  {staffList
                    .filter((st: any) => {
                      if (personnelFilterType === 'standard') return !st.is_groupe_strategique;
                      if (personnelFilterType === 'strategique') return !!st.is_groupe_strategique;
                      return true;
                    })
                    .filter((st: any) => {
                      const s = personnelSearch.toLowerCase().trim();
                      if (!s) return true;
                      const nomComplet = `${st.nom || ''} ${st.prenom || ''} ${st.fonction || ''} ${st.telephone || ''} Agent #${st.id}`.toLowerCase();
                      return nomComplet.includes(s);
                    })
                    .map((member: any) => {
                      const isStrat = !!member.is_groupe_strategique;
                      const taux = isStrat ? 30 : 25;
                      const nomAfficher = `${member.nom || ''} ${member.prenom || ''}`.trim() || `Agent #${member.id}`;
                      const roleAfficher = member.fonction || member.role || 'Personnel';

                      return (
                        <div
                          key={member.id}
                          className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 bg-white dark:bg-slate-900 ${
                            isStrat
                              ? 'border-amber-200 bg-amber-50/30 dark:bg-amber-950/20'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                                  {nomAfficher}
                                </h4>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {roleAfficher}
                                </p>
                              </div>
                              <Badge className={isStrat ? 'bg-amber-500 text-white text-[9px]' : 'bg-blue-100 text-blue-800 text-[9px]'}>
                                {isStrat ? 'Direction (-30%)' : 'Standard (-25%)'}
                              </Badge>
                            </div>
                            {member.telephone && (
                              <p className="text-[10px] text-slate-400 font-mono mt-1">
                                Tel : {member.telephone}
                              </p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-slate-600">
                              Taux : <strong className={isStrat ? 'text-amber-700 font-mono' : 'text-blue-700 font-mono'}>-{taux}%</strong>
                            </span>
                            <Button
                              size="sm"
                              onClick={() => handleSelectStaffForReduction(member)}
                              className={`h-6 px-2.5 text-[11px] font-semibold text-white ${
                                isStrat
                                  ? 'bg-amber-600 hover:bg-amber-700'
                                  : 'bg-blue-600 hover:bg-blue-700'
                              }`}
                            >
                              Accorder remise
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ============================================================ */}
      {/* MODAL : SAISIE & ATTRIBUTION D'UNE REDUCTION                  */}
      {/* ============================================================ */}
      <Dialog open={openForm} onOpenChange={v => { setOpenForm(v); if (!v) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <FileText className="h-4 w-4 text-indigo-600" />
              {editTarget ? 'Modifier le dossier d\'exoneration' : 'Nouvelle exoneration & Ajustement de scolarite'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Selectionnez l'eleve et precisez les conditions tarifaires accordees. L'echeancier sera recalcule automatiquement.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Selection de l'eleve */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Élève bénéficiaire *</Label>
              <Select value={form.eleveId} onValueChange={v => setForm(p => ({ ...p, eleveId: v }))}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selectionner l'eleve dans la liste..." />
                </SelectTrigger>
                <SelectContent className="max-h-[260px]">
                  {students.map(s => (
                    <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                      {formatStudentName(s)} {s.className ? `— ${s.className}` : ''} {s.matricule ? `(${s.matricule})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type et montant / pourcentage */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-500 uppercase">Categorie</Label>
                <Select
                  value={form.reductionCategory}
                  onValueChange={v => {
                    if (v === 'fraterie_daloa') {
                      setForm(p => ({
                        ...p,
                        reductionCategory: v,
                        typeMode: 'pourcentage',
                        taux: 10,
                        motif: 'Reduction Fratrie (2e enfant : 10%)',
                        approuvePar: 'Direction des Etudes',
                      }));
                    } else if (v === 'personnel_standard' || v === 'personnel') {
                      setForm(p => ({
                        ...p,
                        reductionCategory: v,
                        typeMode: 'pourcentage',
                        taux: 25,
                        motif: 'Enfant membre du personnel (25%)',
                        approuvePar: 'Direction Generale',
                      }));
                    } else if (v === 'personnel_strategique') {
                      setForm(p => ({
                        ...p,
                        reductionCategory: v,
                        typeMode: 'pourcentage',
                        taux: 30,
                        motif: 'Ayant-droit Direction & Comite (30%)',
                        approuvePar: 'Direction des Etudes',
                      }));
                    } else {
                      setForm(p => ({ ...p, reductionCategory: v }));
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-500 uppercase">Mode de calcul</Label>
                <Select value={form.typeMode} onValueChange={v => setForm(p => ({ ...p, typeMode: v as 'pourcentage' | 'montant' }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pourcentage" className="text-xs">Pourcentage (%)</SelectItem>
                    <SelectItem value="montant" className="text-xs">Montant fixe (FCFA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-500 uppercase">
                  {form.typeMode === 'pourcentage' ? 'Taux accorde (%)' : 'Montant deduit (FCFA)'}
                </Label>
                {form.typeMode === 'pourcentage' ? (
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={form.taux === 0 ? '' : form.taux}
                      placeholder="Ex: 10, 20..."
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                        setForm(p => ({ ...p, taux: val }));
                      }}
                      className="h-8 text-xs font-bold font-mono text-indigo-700 dark:text-indigo-400 pr-7"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">%</span>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      step={5000}
                      value={form.montantFixe || ''}
                      placeholder="Ex: 25000"
                      onChange={e => setForm(p => ({ ...p, montantFixe: Number(e.target.value) }))}
                      className="h-8 text-xs font-bold font-mono text-indigo-700 dark:text-indigo-400 pr-12"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">FCFA</span>
                  </div>
                )}
              </div>
            </div>

            {/* Rangs Fratrie rapides si categorie fratrie */}
            {form.reductionCategory === 'fraterie_daloa' && (
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
                <Label className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  Rangs Fratrie suggeres (cliquez pour selectionner) :
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={form.taux === 10 ? 'default' : 'outline'}
                    className={form.taux === 10 ? 'h-7 text-xs bg-emerald-600 text-white font-bold' : 'h-7 text-xs border-emerald-300'}
                    onClick={() => setForm(p => ({ ...p, taux: 10, motif: 'Reduction Fratrie (2e enfant : 10%)' }))}
                  >
                    2e enfant (-10%)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={form.taux === 15 ? 'default' : 'outline'}
                    className={form.taux === 15 ? 'h-7 text-xs bg-emerald-600 text-white font-bold' : 'h-7 text-xs border-emerald-300'}
                    onClick={() => setForm(p => ({ ...p, taux: 15, motif: 'Reduction Fratrie (3e enfant : 15%)' }))}
                  >
                    3e enfant (-15%)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={form.taux === 20 ? 'default' : 'outline'}
                    className={form.taux === 20 ? 'h-7 text-xs bg-emerald-600 text-white font-bold' : 'h-7 text-xs border-emerald-300'}
                    onClick={() => setForm(p => ({ ...p, taux: 20, motif: 'Reduction Fratrie (4e enfant et + : 20%)' }))}
                  >
                    4e enfant et + (-20%)
                  </Button>
                </div>
              </div>
            )}

            {/* Dispersion et Service */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600">Mode d'imputation sur l'echeancier</Label>
                <Select value={form.modeDispersion} onValueChange={v => setForm(p => ({ ...p, modeDispersion: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dernieres_tranches" className="text-xs">Deduire sur les dernieres tranches</SelectItem>
                    <SelectItem value="proportionnel" className="text-xs">Repartir au prorata de chaque tranche</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600">Poste concerne</Label>
                <Select value={form.serviceType} onValueChange={v => setForm(p => ({ ...p, serviceType: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scolarite" className="text-xs">Frais de Scolarite generale</SelectItem>
                    <SelectItem value="transport" className="text-xs">Frais de Transport scolaire</SelectItem>
                    <SelectItem value="cantine" className="text-xs">Service Cantine</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Simulation de l'echeancier */}
            {form.eleveId && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                    <Layers className="h-3.5 w-3.5 text-indigo-600" />
                    Impact sur les tranches de paiement
                  </h4>
                  {previewLoading && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" /> Recalcul...
                    </span>
                  )}
                </div>

                {adjustmentPreview && adjustmentPreview.tranches && adjustmentPreview.tranches.length > 0 ? (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="text-left p-2">Tranche</th>
                          <th className="text-left p-2">Echeance</th>
                          <th className="text-right p-2">Montant Initial</th>
                          <th className="text-right p-2 text-emerald-700">Remise</th>
                          <th className="text-right p-2 text-indigo-700 font-bold">Nouveau Montant</th>
                          <th className="text-right p-2 text-rose-600 font-bold">Reste Du</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {adjustmentPreview.tranches.map((t: any) => (
                          <tr key={t.id} className="hover:bg-slate-50/50">
                            <td className="p-2 font-medium">{t.libelle}</td>
                            <td className="p-2 text-slate-400">{t.date_echeance}</td>
                            <td className="p-2 text-right font-mono text-slate-500">{formatCurrency(t.montant_initial)}</td>
                            <td className="p-2 text-right font-mono font-bold text-emerald-600">
                              {t.reduction_appliquee > 0 ? `-${formatCurrency(t.reduction_appliquee)}` : '—'}
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-indigo-700 dark:text-indigo-400">
                              {formatCurrency(t.nouveau_montant_prevu)}
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-rose-600">
                              {formatCurrency(t.nouveau_solde_restant)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold border-t border-slate-200">
                        <tr>
                          <td colSpan={2} className="p-2 text-slate-700 dark:text-slate-300">TOTAL</td>
                          <td className="p-2 text-right font-mono text-slate-500">{formatCurrency(adjustmentPreview.total_initial)}</td>
                          <td className="p-2 text-right font-mono text-emerald-600">-{formatCurrency(adjustmentPreview.montant_reduction_total)}</td>
                          <td className="p-2 text-right font-mono text-indigo-700 dark:text-indigo-400">{formatCurrency(adjustmentPreview.total_ajuste)}</td>
                          <td className="p-2 text-right font-mono text-rose-600">{formatCurrency(adjustmentPreview.total_solde_ajuste)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
                    Aucun echeancier prealable trouve pour cet eleve. La remise sera prise en compte des la planification des tranches.
                  </div>
                )}
              </div>
            )}

            {/* Motif et Approbateur */}
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Motif / Reference administrative *</Label>
                <Textarea
                  rows={2}
                  placeholder="Precisez la decision, le lien de parente ou le motif officiel..."
                  value={form.motif}
                  onChange={e => setForm(p => ({ ...p, motif: e.target.value }))}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Accorde par / Signataire</Label>
                <Input
                  placeholder="Ex: Direction des Etudes / Direction Generale"
                  value={form.approuvePar}
                  onChange={e => setForm(p => ({ ...p, approuvePar: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Application immediate */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Ajuster immediatement les tranches de paiement</p>
                <p className="text-[11px] text-slate-500">
                  Deduit le montant calcule directement sur les montants exigibles des tranches.
                </p>
              </div>
              <Switch
                checked={form.appliquerImmediatement}
                onCheckedChange={v => setForm(p => ({ ...p, appliquerImmediatement: v }))}
              />
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <Button variant="outline" size="sm" onClick={() => { setOpenForm(false); setEditTarget(null); }} className="text-xs">
              Annuler
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {editTarget ? 'Enregistrer les modifications' : 'Valider la reduction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* MODAL : VISUALISATION ECHEANCIER ELEVE                      */}
      {/* ============================================================ */}
      <Dialog open={!!viewScheduleModal} onOpenChange={v => { if (!v) setViewScheduleModal(null); }}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-600" />
              Echeancier & Tranches de Paiement
            </DialogTitle>
            <DialogDescription className="text-xs">
              {viewScheduleModal?.studentName} — Classe : {viewScheduleModal?.classe || '—'} {viewScheduleModal?.matricule ? `• Matricule : ${viewScheduleModal?.matricule}` : ''}
            </DialogDescription>
          </DialogHeader>

          {viewScheduleModal && viewScheduleModal.tranches && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border text-xs">
                  <p className="text-slate-500 font-semibold uppercase text-[10px]">Total Prevu</p>
                  <p className="text-base font-bold font-mono text-slate-800 dark:text-slate-100 mt-0.5">
                    {formatCurrency(viewScheduleModal.total_prevu || 0)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-xs">
                  <p className="text-emerald-800 font-semibold uppercase text-[10px]">Deja Verse</p>
                  <p className="text-base font-bold font-mono text-emerald-700 mt-0.5">
                    {formatCurrency(viewScheduleModal.total_paye || 0)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-xs">
                  <p className="text-rose-800 font-semibold uppercase text-[10px]">Reste a Payer</p>
                  <p className="text-base font-bold font-mono text-rose-600 mt-0.5">
                    {formatCurrency(viewScheduleModal.total_solde || 0)}
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b text-slate-600 font-semibold">
                    <tr>
                      <th className="text-left p-2.5">Tranche</th>
                      <th className="text-left p-2.5">Echeance</th>
                      <th className="text-right p-2.5">Montant Du</th>
                      <th className="text-right p-2.5">Verse</th>
                      <th className="text-right p-2.5">Solde</th>
                      <th className="text-center p-2.5">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {viewScheduleModal.tranches.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-medium">{t.libelle}</td>
                        <td className="p-2.5 text-slate-500">{t.date_echeance}</td>
                        <td className="p-2.5 text-right font-mono font-bold">{formatCurrency(t.montant_prevu)}</td>
                        <td className="p-2.5 text-right font-mono text-emerald-600">{formatCurrency(t.montant_paye)}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-rose-600">{formatCurrency(t.solde_restant)}</td>
                        <td className="p-2.5 text-center">
                          {t.statut === 'paye' ? (
                            <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Solde</Badge>
                          ) : t.statut === 'partiel' ? (
                            <Badge className="bg-amber-100 text-amber-800 text-[10px]">Partiel</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Non paye</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setViewScheduleModal(null)} className="text-xs">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* MODAL : CONFIRMATION DE SUPPRESSION REDUCTION ELEVE         */}
      {/* ============================================================ */}
      <Dialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-rose-600 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Supprimer le dossier d'exoneration
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cette action supprimera la reduction accordee a l'eleve.
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-slate-600 py-2">
            Confirmez-vous la suppression de la remise de <strong>{deleteTarget?.eleve_nom} {deleteTarget?.eleve_prenom}</strong> ?
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} className="text-xs">
              Annuler
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} className="text-xs">
              Confirmer la suppression
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* MODAL : CREATION / EDITION D'UN BAREME TARIFAIRE            */}
      {/* ============================================================ */}
      <Dialog open={openParamModal} onOpenChange={v => { if (!v) { setOpenParamModal(false); setEditingParam(null); } }}>
        <DialogContent className="sm:max-w-[580px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Sliders className="w-4 h-4 text-indigo-600" />
              {editingParam ? 'Modifier la regle tarifaire' : 'Ajouter une regle tarifaire'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configurez le bareme et la condition d'attribution pour cet etablissement.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveParam} className="space-y-3.5 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Libelle de la regle *</Label>
                <Input
                  required
                  placeholder="Ex: Fratrie — 2e enfant, Bourse..."
                  value={paramForm.libelle}
                  onChange={e => setParamForm(p => ({ ...p, libelle: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Categorie *</Label>
                <Select
                  value={paramForm.categorie}
                  onValueChange={v => setParamForm(p => ({ ...p, categorie: v }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Type de valeur *</Label>
                <Select
                  value={paramForm.type_valeur}
                  onValueChange={(v: any) => setParamForm(p => ({ ...p, type_valeur: v }))}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pourcentage" className="text-xs">Pourcentage (%)</SelectItem>
                    <SelectItem value="montant" className="text-xs">Montant fixe (FCFA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paramForm.type_valeur === 'pourcentage' ? (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Taux standard (%)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      required
                      value={paramForm.taux_defaut}
                      onChange={e => setParamForm(p => ({ ...p, taux_defaut: Number(e.target.value) }))}
                      className="h-8 text-xs pr-7 font-mono font-bold text-indigo-700"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">%</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Montant fixe (FCFA)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      required
                      value={paramForm.montant_defaut}
                      onChange={e => setParamForm(p => ({ ...p, montant_defaut: Number(e.target.value) }))}
                      className="h-8 text-xs pr-12 font-mono font-bold text-indigo-700"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">FCFA</span>
                  </div>
                </div>
              )}
            </div>

            {/* Etablissement et Ville */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-500">Code Etablissement</Label>
                <Input
                  value={paramForm.ET_CODEETABLISSEMENT || ''}
                  onChange={e => setParamForm(p => ({ ...p, ET_CODEETABLISSEMENT: e.target.value }))}
                  placeholder={activeSchool.code ? `Code : ${activeSchool.code}` : "Code (ex: FHA-01)"}
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-500">Ville</Label>
                <Input
                  value={paramForm.ville || ''}
                  onChange={e => setParamForm(p => ({ ...p, ville: e.target.value }))}
                  placeholder={activeSchool.city ? `Ville : ${activeSchool.city}` : "Ville (ex: Abidjan, Daloa...)"}
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Description / Justification administrative</Label>
              <Textarea
                rows={2}
                placeholder="Explication claire du motif et des conditions..."
                value={paramForm.description}
                onChange={e => setParamForm(p => ({ ...p, description: e.target.value }))}
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold">Regle active</Label>
                  <p className="text-[10px] text-slate-500">Activer ou suspendre ce bareme</p>
                </div>
                <Switch
                  checked={paramForm.is_active}
                  onCheckedChange={v => setParamForm(p => ({ ...p, is_active: v }))}
                />
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold text-slate-500">Ordre :</Label>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={paramForm.ordre_affichage}
                  onChange={e => setParamForm(p => ({ ...p, ordre_affichage: Number(e.target.value) }))}
                  className="h-8 w-16 text-xs text-center font-mono"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setOpenParamModal(false); setEditingParam(null); }}
                className="text-xs"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingParam}
                className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
              >
                {savingParam ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {editingParam ? 'Enregistrer les modifications' : 'Creer la regle'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* MODAL : CONFIRMATION SUPPRESSION D'UN BAREME                */}
      {/* ============================================================ */}
      <Dialog open={!!deleteParamTarget} onOpenChange={v => { if (!v) setDeleteParamTarget(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-rose-600 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Supprimer la regle tarifaire
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cette action supprimera definitivement le bareme selectionne.
            </DialogDescription>
          </DialogHeader>

          {deleteParamTarget && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl space-y-1 text-xs">
              <p className="font-bold text-rose-950 dark:text-rose-200">
                {deleteParamTarget.libelle}
              </p>
              <p className="text-rose-800 text-[11px]">
                Taux/Montant : {deleteParamTarget.type_valeur === 'pourcentage' ? `${deleteParamTarget.taux_defaut}%` : `${formatCurrency(deleteParamTarget.montant_defaut)}`}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteParamTarget(null)}
              className="text-xs"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteParam}
              disabled={savingParam}
              className="text-xs font-semibold gap-1.5"
            >
              {savingParam ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
