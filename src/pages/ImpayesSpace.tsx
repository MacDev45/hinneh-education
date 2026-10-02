import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/Layout';
import { DataTable, type Column } from '@/components/DataTable';
import apiClient from '@/lib/apiClient';
import type { Student, ClassRoom } from '@/lib/index';
import { formatStudentName } from '@/lib/index';
import { formatCurrency } from '@/lib/index';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  AlertTriangle, CheckCircle2, Clock, DollarSign, Search,
  Send, RefreshCw, Printer, FileSpreadsheet, ShieldAlert,
  Filter, Calendar, Bus, Utensils, GraduationCap, FileText,
  Plus, CheckCircle, Bell, ArrowRight, BookOpen
} from 'lucide-react';
import { printRelanceLetter, printRelanceLetters, type RelancePrintItem } from '@/lib/relancePrinter';

export interface ImpayeItem {
  id: string | number;
  studentId: string | number;
  matricule: string;
  nom: string;
  prenom: string;
  classe: string;
  classId: string | number;
  niveau: string;
  serviceType: 'scolarite' | 'transport' | 'cantine' | 'autre';
  trancheLibelle: string;
  statut: 'a_jour' | 'partiel' | 'non_paye' | 'retard_critique' | 'preventif_j7';
  montantAPayer: number;
  montantVerse: number;
  soldeRestant: number;
  anneeScolaire: string;
  parentPhone: string;
  parentNom: string;
  dateEcheance: string; // YYYY-MM-DD
  daysRemaining: number; // Difference in days between dateEcheance and today
  isPreventiveJ7: boolean; // True if 0 <= daysRemaining <= 7 (Rappel à J-7)
}

export default function ImpayesSpace() {
  const { toast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [echeancesList, setEcheancesList] = useState<any[]>([]);
  const [impayesDbList, setImpayesDbList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<string>('synthese');

  // Filter States
  const [filterService, setFilterService] = useState<string>('all');
  const [filterNiveau, setFilterNiveau] = useState<string>('all');
  const [filterClasse, setFilterClasse] = useState<string>('all');
  const [filterStatut, setFilterStatut] = useState<string>('impayes_only');

  // Search Fields
  const [searchMatricule, setSearchMatricule] = useState<string>('');
  const [searchNom, setSearchNom] = useState<string>('');
  const [searchPrenom, setSearchPrenom] = useState<string>('');

  // Modal State for New Echeance (Transport / Cantine / Scolarité)
  const [showAddEcheanceModal, setShowAddEcheanceModal] = useState<boolean>(false);
  const [newEcheanceStudentId, setNewEcheanceStudentId] = useState<string>('');
  const [newEcheanceService, setNewEcheanceService] = useState<string>('transport');
  const [newEcheanceLibelle, setNewEcheanceLibelle] = useState<string>('Transport Mensuel - Octobre');
  const [newEcheanceMontant, setNewEcheanceMontant] = useState<string>('25000');
  const [newEcheanceDate, setNewEcheanceDate] = useState<string>('2026-10-05');

  const loadData = async () => {
    setLoading(true);
    try {
      const [stData, clsData, echData, impayesData] = await Promise.all([
        // Liste allégée : cet écran n'exploite que matricule, nom, prénom, classe,
        // contact parent et AU_TOTALDEPOT. La liste complète pèse ~9,5 Mo (143 colonnes
        // par élève + photos base64) contre ~465 Ko ici.
        apiClient.getStudentsLight(),
        apiClient.getClasses(),
        apiClient.getEcheanciers({ annee_scolaire: '2026-2027' }),
        apiClient.getImpayesTable({ auto_sync: true }).catch(() => []),
      ]);
      setStudents(stData || []);
      setClasses(clsData || []);
      setEcheancesList(echData || []);
      setImpayesDbList(impayesData || []);
    } catch (err) {
      console.error('Erreur chargement données impayés/échéances:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncImpayes = async () => {
    setLoading(true);
    try {
      await apiClient.syncImpayesTable();
      await loadData();
      toast({
        title: '✅ Table des impayés synchronisée',
        description: 'Les données des arriérés et des relances à J-7 ont été actualisées.',
      });
    } catch (err) {
      console.error('Erreur sync impayes:', err);
      toast({
        title: '❌ Erreur de synchronisation',
        description: 'Impossible de synchroniser la table des impayés.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /**
   * Helper to compute days remaining from today to target date
   */
  const computeDaysRemaining = (dateStr: string): number => {
    if (!dateStr) return 0;
    const targetDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  /**
   * Calculate full list of Impayes and Echeances with J-7 Reminders and Service Types
   */
  const impayesFullList: ImpayeItem[] = useMemo(() => {
    const today = new Date();

    // 1. Process custom echeancier records (Scolarité, Transport, Cantine)
    const itemsFromEcheanciers: ImpayeItem[] = echeancesList.map((ech, index) => {
      const st = students.find((s) => String(s.id) === String(ech.eleve_id || ech.studentId) || (s.matricule && s.matricule === ech.matricule));
      const cls = classes.find((c) => String(c.id) === String(st?.classId || st?.classe_id));
      const montantAPayer = Number(ech.montant_prevu || ech.montant_du || ech.montant || 0);
      const rawMontantVerse = Number(ech.montant_paye || ech.paid || 0);
      const inscriptionPaid = Number((st as any)?.AU_TOTALDEPOT || (st as any)?.frais_inscription_paye || (st as any)?.montant_verse_inscription || 0);
      const montantVerse = Math.max(rawMontantVerse, inscriptionPaid);
      const soldeRestant = Math.max(0, montantAPayer - montantVerse);
      
      const dateEcheance = ech.date_echeance ? String(ech.date_echeance) : '2026-10-05';
      const daysRemaining = computeDaysRemaining(dateEcheance);

      // Preventive J-7 reminder: Due in 0 to 7 days (notably the 5th of the month)
      const isPreventiveJ7 = soldeRestant > 0 && daysRemaining >= 0 && daysRemaining <= 7;

      let statut: ImpayeItem['statut'] = 'a_jour';
      if (soldeRestant === 0) {
        statut = 'a_jour';
      } else if (isPreventiveJ7) {
        statut = 'preventif_j7';
      } else if (daysRemaining < 0 && montantVerse > 0 && soldeRestant > 50000) {
        statut = 'retard_critique';
      } else if (daysRemaining < 0 && montantVerse > 0) {
        statut = 'partiel';
      } else {
        statut = 'non_paye';
      }

      const serviceType = (ech.service_type || 'scolarite') as ImpayeItem['serviceType'];

      return {
        id: `ech_${ech.id}_${index}`,
        studentId: ech.eleve_id || st?.id || 0,
        matricule: st?.matricule || ech.matricule || 'AUTO',
        nom: (st?.lastName || ech.nom || 'ELEVE').toUpperCase(),
        prenom: st?.firstName || ech.prenom || '',
        classe: cls?.name || st?.className || 'Classe',
        classId: cls?.id || st?.classId || '',
        niveau: cls?.cycle || (st as any)?.niveau || 'Primaire',
        serviceType,
        trancheLibelle: ech.libelle || `Tranche #${ech.tranche_numero || 1}`,
        statut,
        montantAPayer,
        montantVerse,
        soldeRestant,
        anneeScolaire: ech.annee_scolaire || '2026-2027',
        parentPhone: (st as any)?.AU_CONTACTS || (st as any)?.parentTel || '07 00 00 00 00',
        parentNom: (st as any)?.parentNom || 'Parent d\'élève',
        dateEcheance,
        daysRemaining,
        isPreventiveJ7,
      };
    });

    // 2. Process api_impaye table records
    const itemsFromDbImpayes: ImpayeItem[] = (impayesDbList || []).map((imp, index) => {
      const st = students.find((s) => String(s.id) === String(imp.eleve_id) || s.matricule === imp.matricule);
      const cls = classes.find((c) => String(c.id) === String(imp.classe_id)) ||
                  (st ? classes.find((c) => String(c.id) === String(st.classId)) : undefined);
      const parts = (imp.nom_prenoms || (st ? `${formatStudentName(st)}` : '')).split(' ');
      const nom = parts[0] || (st?.lastName || '').toUpperCase();
      const prenom = parts.slice(1).join(' ') || (st?.firstName || '');
      const montantAPayer = Number(imp.montant_a_payer || 0);
      const rawMontantVerse = Number(imp.montant_verse || 0);
      const inscriptionPaid = Number((st as any)?.AU_TOTALDEPOT || (st as any)?.frais_inscription_paye || (st as any)?.montant_verse_inscription || 0);
      const montantVerse = Math.max(rawMontantVerse, inscriptionPaid);
      const rawSoldeRestant = Number(imp.solde_restant || 0);
      const soldeRestant = Math.max(0, Math.min(rawSoldeRestant, montantAPayer - montantVerse));

      const dateEcheance = imp.date_echeance ? String(imp.date_echeance) : '2026-10-05';
      const daysRemaining = computeDaysRemaining(dateEcheance);
      const isPreventiveJ7 = soldeRestant > 0 && daysRemaining >= 0 && daysRemaining <= 7;

      let statut: ImpayeItem['statut'] = 'a_jour';
      if (soldeRestant === 0) {
        statut = 'a_jour';
      } else if (isPreventiveJ7) {
        statut = 'preventif_j7';
      } else if (daysRemaining < 0 && montantVerse > 0 && soldeRestant > 50000) {
        statut = 'retard_critique';
      } else if (daysRemaining < 0 && montantVerse > 0) {
        statut = 'partiel';
      } else {
        statut = 'non_paye';
      }

      return {
        id: `db_imp_${imp.id}_${index}`,
        studentId: imp.eleve_id,
        matricule: imp.matricule || st?.matricule || 'AUTO',
        nom: nom.toUpperCase(),
        prenom,
        classe: cls?.name || st?.className || (imp.classe_id ? `Classe #${imp.classe_id}` : 'Classe'),
        classId: imp.classe_id || st?.classId || '',
        niveau: cls?.cycle || (st as any)?.niveau || 'Primaire',
        serviceType: (imp.service_type || 'scolarite') as ImpayeItem['serviceType'],
        trancheLibelle: imp.remarque || 'Échéance Générale (Scolarité)',
        statut,
        montantAPayer,
        montantVerse,
        soldeRestant,
        anneeScolaire: imp.annee_scolaire || '2026-2027',
        parentPhone: (st as any)?.AU_CONTACTS || (st as any)?.parentTel || '07 00 00 00 00',
        parentNom: (st as any)?.parentNom || 'Parent d\'élève',
        dateEcheance,
        daysRemaining,
        isPreventiveJ7,
      };
    });

    // If custom echeanciers exist, show them AND append base student impayes for students without custom echeances
    if (itemsFromEcheanciers.length > 0) {
      const echeancesStudentIds = new Set(itemsFromEcheanciers.map(e => String(e.studentId)));
      const baseImpayesForOtherStudents = itemsFromDbImpayes.filter(imp => !echeancesStudentIds.has(String(imp.studentId)));
      return [...itemsFromEcheanciers, ...baseImpayesForOtherStudents];
    }

    return itemsFromDbImpayes;
  }, [students, classes, echeancesList, impayesDbList]);

  // Filtered List for Overdue & General Impayes
  const filteredImpayes = useMemo(() => {
    return impayesFullList.filter((item) => {
      // By default ("impayes_only"), show items with soldeRestant > 0
      if (filterStatut === 'impayes_only' && item.soldeRestant <= 0) {
        return false;
      }
      if (filterStatut === 'preventif_j7' && !item.isPreventiveJ7) {
        return false;
      }
      if (filterStatut !== 'all' && filterStatut !== 'impayes_only' && filterStatut !== 'preventif_j7' && item.statut !== filterStatut) {
        return false;
      }
      // Service filter
      if (filterService !== 'all' && item.serviceType !== filterService) {
        return false;
      }
      // Filter par Niveau
      if (filterNiveau !== 'all' && !item.niveau.toLowerCase().includes(filterNiveau.toLowerCase())) {
        return false;
      }
      // Filter par Classe
      if (filterClasse !== 'all' && String(item.classId) !== String(filterClasse)) {
        return false;
      }
      // Search par Matricule
      if (searchMatricule && !item.matricule.toLowerCase().includes(searchMatricule.toLowerCase())) {
        return false;
      }
      // Search par Nom
      if (searchNom && !item.nom.toLowerCase().includes(searchNom.toLowerCase())) {
        return false;
      }
      // Search par Prénom
      if (searchPrenom && !item.prenom.toLowerCase().includes(searchPrenom.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [impayesFullList, filterService, filterNiveau, filterClasse, filterStatut, searchMatricule, searchNom, searchPrenom]);

  // List of Preventive J-7 Reminders (Due in 0 to 7 days, notably the 5th of the month)
  const preventiveJ7Reminders = useMemo(() => {
    return impayesFullList.filter((item) => item.soldeRestant > 0 && item.daysRemaining >= 0 && item.daysRemaining <= 7);
  }, [impayesFullList]);

  // KPI Calculations
  const kpiStats = useMemo(() => {
    const totalArrieresSolde = impayesFullList.reduce((acc, i) => acc + i.soldeRestant, 0);
    const totalImpayesEchus = impayesFullList.filter(i => i.soldeRestant > 0 && i.daysRemaining < 0).length;
    const totalRelancesJ7 = preventiveJ7Reminders.length;
    const totalEncaisse = impayesFullList.reduce((acc, i) => acc + i.montantVerse, 0);

    const soldeScolarite = impayesFullList.filter(i => i.serviceType === 'scolarite').reduce((acc, i) => acc + i.soldeRestant, 0);
    const soldeTransport = impayesFullList.filter(i => i.serviceType === 'transport').reduce((acc, i) => acc + i.soldeRestant, 0);
    const soldeCantine = impayesFullList.filter(i => i.serviceType === 'cantine').reduce((acc, i) => acc + i.soldeRestant, 0);

    return { totalArrieresSolde, totalImpayesEchus, totalRelancesJ7, totalEncaisse, soldeScolarite, soldeTransport, soldeCantine };
  }, [impayesFullList, preventiveJ7Reminders]);

  // Handlers for printing and messaging
  const handlePrintSingleRelance = (item: ImpayeItem) => {
    const printData: RelancePrintItem = {
      matricule: item.matricule,
      nom: item.nom,
      prenom: item.prenom,
      classe: item.classe,
      parentNom: item.parentNom,
      parentPhone: item.parentPhone,
      serviceType: item.serviceType,
      trancheLibelle: item.trancheLibelle,
      dateEcheance: item.dateEcheance,
      montantAPayer: item.montantAPayer,
      montantVerse: item.montantVerse,
      soldeRestant: item.soldeRestant,
      anneeScolaire: item.anneeScolaire,
      isPreventive: item.isPreventiveJ7,
      daysRemaining: item.daysRemaining,
    };
    printRelanceLetter(printData);
  };

  const handlePrintBatchRelances = (itemsToPrint: ImpayeItem[]) => {
    if (itemsToPrint.length === 0) {
      toast({
        title: '⚠️ Aucune relance à imprimer',
        description: 'La liste filtrée est vide.',
        variant: 'destructive',
      });
      return;
    }
    const batchData: RelancePrintItem[] = itemsToPrint.map((item) => ({
      matricule: item.matricule,
      nom: item.nom,
      prenom: item.prenom,
      classe: item.classe,
      parentNom: item.parentNom,
      parentPhone: item.parentPhone,
      serviceType: item.serviceType,
      trancheLibelle: item.trancheLibelle,
      dateEcheance: item.dateEcheance,
      montantAPayer: item.montantAPayer,
      montantVerse: item.montantVerse,
      soldeRestant: item.soldeRestant,
      anneeScolaire: item.anneeScolaire,
      isPreventive: item.isPreventiveJ7,
      daysRemaining: item.daysRemaining,
    }));

    printRelanceLetters(batchData);
    toast({
      title: '🖨️ Impression groupée lancée',
      description: `${batchData.length} lettre(s) de relance générée(s) pour l'impression.`,
    });
  };

  const handleSendReminderSMS = (item: ImpayeItem) => {
    const typeLabel = item.serviceType === 'transport' ? 'Transport' : item.serviceType === 'cantine' ? 'Cantine' : 'Scolarité';
    const message = item.isPreventiveJ7
      ? `RAPPEL HÎNNEH ÉDUCATION: Bonjour ${item.parentNom}, nous vous rappelons que l'échéance de ${typeLabel} pour ${formatStudentName(item)} (${item.classe}) arrive à terme le ${item.dateEcheance} (solde: ${formatCurrency(item.soldeRestant)}). Merci de régulariser à la caisse de l'école.`
      : `RELANCE D'IMPAYÉ HÎNNEH: Bonjour ${item.parentNom}, sauf erreur, l'échéance de ${typeLabel} pour l'élève ${formatStudentName(item)} (${item.classe}) de ${formatCurrency(item.soldeRestant)} est dépassée (date limite: ${item.dateEcheance}). Merci de vous présenter à la caisse. Tél: 0789353025`;

    window.open(`https://wa.me/225${item.parentPhone.replace(/\s+/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleCreateCustomEcheance = async () => {
    if (!newEcheanceStudentId || !newEcheanceMontant) {
      toast({
        title: '⚠️ Formulaire incomplet',
        description: 'Veuillez sélectionner un élève et un montant d\'échéance.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await apiClient.createEcheance({
        eleve_id: Number(newEcheanceStudentId),
        libelle: newEcheanceLibelle,
        service_type: newEcheanceService,
        montant_prevu: parseFloat(newEcheanceMontant),
        montant_paye: 0,
        date_echeance: newEcheanceDate,
        annee_scolaire: '2026-2027',
      });

      toast({
        title: '✅ Échéance créée avec succès',
        description: `Nouvelle échéance ${newEcheanceService.toUpperCase()} ajoutée pour l'élève.`,
      });

      setShowAddEcheanceModal(false);
      await loadData();
    } catch (err) {
      console.error('Erreur création échéance:', err);
      toast({
        title: '❌ Erreur de création',
        description: 'Impossible de créer la nouvelle échéance.',
        variant: 'destructive',
      });
    }
  };

  // Table Columns Definition
  const columns: Column[] = [
    {
      key: 'serviceType',
      label: 'Service',
      sortable: true,
      render: (v) => {
        if (v === 'transport') {
          return <Badge className="bg-amber-600 text-white font-bold text-[10px] gap-1"><Bus className="w-3 h-3" /> Transport</Badge>;
        }
        if (v === 'cantine') {
          return <Badge className="bg-orange-600 text-white font-bold text-[10px] gap-1"><Utensils className="w-3 h-3" /> Cantine</Badge>;
        }
        return <Badge className="bg-indigo-600 text-white font-bold text-[10px] gap-1"><GraduationCap className="w-3 h-3" /> Scolarité</Badge>;
      },
    },
    {
      key: 'matricule',
      label: 'Matricule',
      sortable: true,
      render: (v) => <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300">{v}</span>,
    },
    {
      key: 'nom',
      label: 'Nom & Prénom',
      sortable: true,
      render: (_v, row: ImpayeItem) => (
        <div>
          <p className="font-extrabold text-xs uppercase text-slate-900 dark:text-white">{formatStudentName(row)}</p>
          <p className="text-[10px] text-slate-500">{row.trancheLibelle}</p>
        </div>
      ),
    },
    {
      key: 'classe',
      label: 'Classe',
      sortable: true,
      render: (v) => <span className="font-bold text-xs text-slate-700 dark:text-slate-300">{v}</span>,
    },
    {
      key: 'dateEcheance',
      label: 'Échéance (5 du mois)',
      sortable: true,
      render: (v, row: ImpayeItem) => (
        <div>
          <span className="font-mono text-xs font-bold block">{v}</span>
          {row.isPreventiveJ7 ? (
            <span className="text-[10px] text-amber-700 font-extrabold bg-amber-100 px-1.5 py-0.5 rounded">Rappel J-7 ({row.daysRemaining}j restants)</span>
          ) : row.daysRemaining < 0 ? (
            <span className="text-[10px] text-rose-700 font-extrabold bg-rose-100 px-1.5 py-0.5 rounded">Échu (-{Math.abs(row.daysRemaining)}j)</span>
          ) : (
            <span className="text-[10px] text-slate-500">Normal</span>
          )}
        </div>
      ),
    },
    {
      key: 'statut',
      label: 'Statut',
      sortable: true,
      render: (_v, row: ImpayeItem) => {
        if (row.soldeRestant === 0) {
          return <Badge className="bg-emerald-600 text-white font-bold text-[10px]">À Jour ✅</Badge>;
        }
        if (row.isPreventiveJ7) {
          return <Badge className="bg-amber-500 text-white font-bold text-[10px] gap-1"><Bell className="w-3 h-3" /> Relance J-7 🔔</Badge>;
        }
        if (row.statut === 'retard_critique') {
          return <Badge className="bg-rose-600 text-white font-bold text-[10px]">Retard Critique 🚨</Badge>;
        }
        if (row.statut === 'partiel') {
          return <Badge className="bg-amber-600 text-white font-bold text-[10px]">Versement Partiel ⏳</Badge>;
        }
        return <Badge className="bg-red-600 text-white font-bold text-[10px]">Non Payé ⛔</Badge>;
      },
    },
    {
      key: 'montantAPayer',
      label: 'Montant Dû',
      sortable: true,
      render: (v) => <span className="font-bold text-xs text-slate-700 dark:text-slate-300">{formatCurrency(v)}</span>,
    },
    {
      key: 'montantVerse',
      label: 'Montant Versé',
      sortable: true,
      render: (v) => <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400">{formatCurrency(v)}</span>,
    },
    {
      key: 'soldeRestant',
      label: 'Solde Restant',
      sortable: true,
      render: (v) => (
        <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
          v > 0
            ? 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-200'
            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
        }`}>
          {formatCurrency(v)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Impression & Relance',
      render: (_v, row: ImpayeItem) => (
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePrintSingleRelance(row)}
            className="text-[11px] h-8 px-2 gap-1 border-indigo-300 text-indigo-800 hover:bg-indigo-50 font-bold"
          >
            <Printer className="w-3.5 h-3.5" /> Lettre
          </Button>
          {row.soldeRestant > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSendReminderSMS(row)}
              className="text-[11px] h-8 px-2 gap-1 border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-bold"
            >
              <Send className="w-3.5 h-3.5" /> WA
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-indigo-950 dark:text-white flex items-center gap-2">
                <ShieldAlert className="h-8 w-8 text-rose-600" />
                Module de Gestion des Impayés et Échéanciers
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Relances à J-7 (échéances du 5 du mois), impression des lettres officielles et suivi multi-services (Scolarité, Transport, Cantine)
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="default"
                onClick={() => handlePrintBatchRelances(filteredImpayes)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 text-xs"
              >
                <Printer className="w-4 h-4" /> Imprimer les Relances ({filteredImpayes.length})
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowAddEcheanceModal(true)}
                className="gap-2 text-xs border-indigo-300 text-indigo-900 font-bold hover:bg-indigo-50"
              >
                <Plus className="w-4 h-4" /> Créer Échéancier (Transport/Cantine)
              </Button>

              <Button variant="ghost" onClick={handleSyncImpayes} disabled={loading} className="gap-2 text-xs">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Top Service Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="border-rose-200 bg-rose-50/70 dark:bg-rose-950/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-rose-700 font-black uppercase tracking-wide">Cumul Total Impayés</p>
                <h3 className="text-xl font-black text-rose-900 dark:text-rose-200 mt-1">
                  {formatCurrency(kpiStats.totalArrieresSolde)}
                </h3>
                <p className="text-[10px] text-rose-600 font-bold mt-0.5">{kpiStats.totalImpayesEchus} impayés échus</p>
              </div>
              <DollarSign className="h-9 w-9 text-rose-600 opacity-80" />
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/70 dark:bg-amber-950/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-amber-800 font-black uppercase tracking-wide">Relances J-7 à Prévoir</p>
                <h3 className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-1">
                  {kpiStats.totalRelancesJ7} Rappels (5 du mois)
                </h3>
                <p className="text-[10px] text-amber-700 font-bold mt-0.5">À notifier 7 jours avant</p>
              </div>
              <Bell className="h-9 w-9 text-amber-600 opacity-90 animate-pulse" />
            </CardContent>
          </Card>

          <Card className="border-indigo-200 bg-indigo-50/70 dark:bg-indigo-950/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-indigo-800 font-black uppercase tracking-wide">Solde par Service</p>
                <div className="text-[11px] space-y-0.5 mt-1 font-bold">
                  <p className="text-indigo-900">🎓 Scolarité: <span className="font-black">{formatCurrency(kpiStats.soldeScolarite)}</span></p>
                  <p className="text-amber-900">🚌 Transport: <span className="font-black">{formatCurrency(kpiStats.soldeTransport)}</span></p>
                  <p className="text-orange-900">🍽️ Cantine: <span className="font-black">{formatCurrency(kpiStats.soldeCantine)}</span></p>
                </div>
              </div>
              <BookOpen className="h-8 w-8 text-indigo-600 opacity-80" />
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-emerald-800 font-black uppercase tracking-wide">Total Encaissé</p>
                <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-200 mt-1">
                  {formatCurrency(kpiStats.totalEncaisse)}
                </h3>
                <p className="text-[10px] text-emerald-700 font-bold mt-0.5">Recouvrement actif</p>
              </div>
              <CheckCircle2 className="h-9 w-9 text-emerald-600 opacity-80" />
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 w-full bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <TabsTrigger value="synthese" className="font-bold text-xs gap-1.5">
              📊 Synthèse & Table
            </TabsTrigger>
            <TabsTrigger value="preventif" className="font-bold text-xs gap-1.5 relative">
              🔔 Relances J-7 (5 du mois)
              {kpiStats.totalRelancesJ7 > 0 && (
                <Badge className="ml-1 px-1.5 py-0 bg-amber-500 text-white font-mono text-[9px]">{kpiStats.totalRelancesJ7}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="services" className="font-bold text-xs gap-1.5">
              🚌 Transport & Cantine
            </TabsTrigger>
            <TabsTrigger value="echeanciers" className="font-bold text-xs gap-1.5">
              📑 Gestion des Échéances
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: SYNTHÈSE & TABLE PRINCIPALE */}
          <TabsContent value="synthese" className="space-y-4 mt-4">
            
            {/* Filters Box */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                  <Filter className="w-4 h-4 text-indigo-600" /> Filtres Multi-Services & Champs de Recherche
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs font-bold mb-1 block">Service Concerné</Label>
                    <Select value={filterService} onValueChange={setFilterService}>
                      <SelectTrigger><SelectValue placeholder="Tous les services" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les services (Scolarité, Transport, Cantine)</SelectItem>
                        <SelectItem value="scolarite">🎓 Scolarité & Inscription</SelectItem>
                        <SelectItem value="transport">🚌 Transport Scolaire</SelectItem>
                        <SelectItem value="cantine">🍽️ Cantine / Restauration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-bold mb-1 block">Niveau d'Enseignement</Label>
                    <Select value={filterNiveau} onValueChange={setFilterNiveau}>
                      <SelectTrigger><SelectValue placeholder="Tous les niveaux" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les niveaux</SelectItem>
                        <SelectItem value="Maternelle">Maternelle</SelectItem>
                        <SelectItem value="Primaire">Primaire</SelectItem>
                        <SelectItem value="Collège">Collège (1er Cycle)</SelectItem>
                        <SelectItem value="Lycée">Lycée (2nd Cycle)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-bold mb-1 block">Classe</Label>
                    <Select value={filterClasse} onValueChange={setFilterClasse}>
                      <SelectTrigger><SelectValue placeholder="Toutes les classes" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les classes</SelectItem>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-bold mb-1 block">Statut Règlement</Label>
                    <Select value={filterStatut} onValueChange={setFilterStatut}>
                      <SelectTrigger><SelectValue placeholder="Uniquement les impayés" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="impayes_only">🚨 Uniquement les Impayés (Solde &gt; 0 FCFA)</SelectItem>
                        <SelectItem value="preventif_j7">🔔 Relance Préventive (J-7 avant le 5 du mois)</SelectItem>
                        <SelectItem value="partiel">⏳ Versement Partiel</SelectItem>
                        <SelectItem value="retard_critique">🚨 Retard Critique (&gt; 50.000 FCFA)</SelectItem>
                        <SelectItem value="non_paye">⛔ Non Payé (0 FCFA versé)</SelectItem>
                        <SelectItem value="a_jour">✅ Élèves À Jour (Soldés)</SelectItem>
                        <SelectItem value="all">📋 Tous les Enregistrements</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 2: Search Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <Label className="text-xs font-bold mb-1 block">Recherche par Matricule</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="ex: 24166304U..."
                        value={searchMatricule}
                        onChange={(e) => setSearchMatricule(e.target.value)}
                        className="pl-8 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold mb-1 block">Recherche par Nom</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="ex: KOUASSI..."
                        value={searchNom}
                        onChange={(e) => setSearchNom(e.target.value)}
                        className="pl-8 text-xs uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold mb-1 block">Recherche par Prénom</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="ex: Marie..."
                        value={searchPrenom}
                        onChange={(e) => setSearchPrenom(e.target.value)}
                        className="pl-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Table Card */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-600" /> Tableau Synthétique des Impayés et Échéanciers
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Impression directe des lettres de relance officielles & rappels automatiques à J-7
                  </CardDescription>
                </div>
                <Badge className="bg-indigo-600 text-white font-mono">{filteredImpayes.length} Élèves</Badge>
              </CardHeader>
              <CardContent className="p-4">
                <DataTable
                  columns={columns}
                  data={filteredImpayes}
                  searchable={false}
                  exportable={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: RELANCES À J-7 (RAPPELS PRÉVENTIFS AVANT LE 5 DU MOIS) */}
          <TabsContent value="preventif" className="space-y-4 mt-4">
            <Card className="border-amber-200 bg-amber-50/40 dark:bg-amber-950/10">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <Bell className="w-6 h-6 text-amber-600 animate-bounce" /> Relances Préventives à J-7 (Échéances du 5 du mois)
                  </CardTitle>
                  <CardDescription className="text-xs text-amber-800">
                    Ces élèves doivent recevoir un rappel <strong>une semaine avant la date limite du 5 du mois</strong> pour éviter de tomber en retard d'impayé.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => handlePrintBatchRelances(preventiveJ7Reminders)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-2"
                >
                  <Printer className="w-4 h-4" /> Imprimer Tout les Rappels J-7 ({preventiveJ7Reminders.length})
                </Button>
              </CardHeader>

              <CardContent className="p-4">
                {preventiveJ7Reminders.length === 0 ? (
                  <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-xl border border-amber-200">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                    <h4 className="font-black text-base text-slate-800 dark:text-slate-100">Aucun rappel à J-7 à effectuer actuellement</h4>
                    <p className="text-xs text-muted-foreground mt-1">Toutes les échéances à venir à 7 jours sont à jour ou hors de la fenêtre du 5 du mois.</p>
                  </div>
                ) : (
                  <DataTable
                    columns={columns}
                    data={preventiveJ7Reminders}
                    searchable={true}
                    exportable={true}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: SERVICES TRANSPORT & CANTINE */}
          <TabsContent value="services" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Transport Card */}
              <Card className="border-amber-200">
                <CardHeader>
                  <CardTitle className="text-base font-black flex items-center gap-2 text-amber-900">
                    <Bus className="w-5 h-5 text-amber-600" /> Échéances & Impayés Transport Scolaire
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Suivi spécifique des tranches mensuelles et trimestrielles de transport bus
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="bg-amber-50 p-3 rounded-lg flex justify-between items-center">
                    <span className="text-xs font-bold text-amber-900">Solde Impayé Transport Total:</span>
                    <span className="text-base font-black text-amber-950">{formatCurrency(kpiStats.soldeTransport)}</span>
                  </div>
                  <Button
                    onClick={() => {
                      setFilterService('transport');
                      setActiveTab('synthese');
                    }}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1"
                  >
                    Voir le Tableau Filtré Transport <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>

              {/* Cantine Card */}
              <Card className="border-orange-200">
                <CardHeader>
                  <CardTitle className="text-base font-black flex items-center gap-2 text-orange-900">
                    <Utensils className="w-5 h-5 text-orange-600" /> Échéances & Impayés Cantine / Restauration
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Suivi des tickets repas et forfaits cantine scolaire
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="bg-orange-50 p-3 rounded-lg flex justify-between items-center">
                    <span className="text-xs font-bold text-orange-900">Solde Impayé Cantine Total:</span>
                    <span className="text-base font-black text-orange-950">{formatCurrency(kpiStats.soldeCantine)}</span>
                  </div>
                  <Button
                    onClick={() => {
                      setFilterService('cantine');
                      setActiveTab('synthese');
                    }}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs gap-1"
                  >
                    Voir le Tableau Filtré Cantine <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 4: GESTION DES ÉCHÉANCIERS */}
          <TabsContent value="echeanciers" className="space-y-4 mt-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600" /> Saisie & Configuration des Échéances par Élève
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Ajoutez manuellement des échéances pour la Scolarité, le Transport ou la Cantine (dû le 5 du mois).
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setNewEcheanceService('transport');
                      setNewEcheanceLibelle('Transport Ligne Yamoussoukro (Échéance 5 du mois)');
                      setNewEcheanceMontant('15000');
                      setShowAddEcheanceModal(true);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1"
                  >
                    <Bus className="w-4 h-4" /> Presets Transport (15.000 FCFA)
                  </Button>
                  <Button
                    onClick={() => setShowAddEcheanceModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1"
                  >
                    <Plus className="w-4 h-4" /> Ajouter une Échéance
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Les échéances créées ici sont intégrées au calcul automatique des relances préventives à J-7 (7 jours avant la date limite, notamment le 5 de chaque mois).
                </p>

                {/* Sub-cards Summary for Transport & Cantine Schedules */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <Bus className="w-4 h-4 text-amber-600" /> Échéancier Transport Scolaire
                      </span>
                      <Badge className="bg-amber-600 text-white font-mono text-[10px]">15 000 FCFA / mois</Badge>
                    </div>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1">
                      Ligne unique Yamoussoukro & Bus Abidjan. Échéances fixes le 5 du mois.
                    </p>
                    <p className="text-xs font-black text-amber-950 dark:text-amber-100 mt-2">
                      Total Solde Transport: {formatCurrency(kpiStats.soldeTransport)}
                    </p>
                  </div>

                  <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 p-3 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-orange-900 dark:text-orange-200 flex items-center gap-1.5">
                        <Utensils className="w-4 h-4 text-orange-600" /> Échéancier Cantine & Repas
                      </span>
                      <Badge className="bg-orange-600 text-white font-mono text-[10px]">Mensuel / Trimestriel</Badge>
                    </div>
                    <p className="text-[11px] text-orange-800 dark:text-orange-300 mt-1">
                      Restauration scolaire et tickets repas. Échéances fixes le 5 du mois.
                    </p>
                    <p className="text-xs font-black text-orange-950 dark:text-orange-100 mt-2">
                      Total Solde Cantine: {formatCurrency(kpiStats.soldeCantine)}
                    </p>
                  </div>

                  <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900 p-3 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-indigo-600" /> Échéancier Scolarité
                      </span>
                      <Badge className="bg-indigo-600 text-white font-mono text-[10px]">Tranches 1 à 6</Badge>
                    </div>
                    <p className="text-[11px] text-indigo-800 dark:text-indigo-300 mt-1">
                      Frais de scolarité générale & réinscription. Échéances fixes le 5 du mois.
                    </p>
                    <p className="text-xs font-black text-indigo-950 dark:text-indigo-100 mt-2">
                      Total Solde Scolarité: {formatCurrency(kpiStats.soldeScolarite)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FULL COPY TABLE OF ECHEANCIERS (TRANSPORT, CANTINE, SCOLARITÉ) */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-black flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-600" /> Registre Officiel des Échéances (Copie Intégrale Transport & Cantine)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Consultez et gérez l'intégralité des tranches et mensualités paramétrées pour chaque service.
                  </CardDescription>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant={filterService === 'all' ? 'default' : 'outline'}
                    onClick={() => setFilterService('all')}
                    className="text-xs font-bold"
                  >
                    Tous
                  </Button>
                  <Button
                    size="sm"
                    variant={filterService === 'transport' ? 'default' : 'outline'}
                    onClick={() => setFilterService('transport')}
                    className="text-xs font-bold border-amber-300 text-amber-900 hover:bg-amber-50"
                  >
                    🚌 Transport
                  </Button>
                  <Button
                    size="sm"
                    variant={filterService === 'cantine' ? 'default' : 'outline'}
                    onClick={() => setFilterService('cantine')}
                    className="text-xs font-bold border-orange-300 text-orange-900 hover:bg-orange-50"
                  >
                    🍽️ Cantine
                  </Button>
                  <Button
                    size="sm"
                    variant={filterService === 'scolarite' ? 'default' : 'outline'}
                    onClick={() => setFilterService('scolarite')}
                    className="text-xs font-bold border-indigo-300 text-indigo-900 hover:bg-indigo-50"
                  >
                    🎓 Scolarité
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-4">
                <DataTable
                  columns={columns}
                  data={filteredImpayes}
                  searchable={true}
                  exportable={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {/* MODAL CREATION ECHEANCE (TRANSPORT / CANTINE / SCOLARITE) */}
        <Dialog open={showAddEcheanceModal} onOpenChange={setShowAddEcheanceModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-black flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" /> Nouvelle Échéance (Scolarité / Transport / Cantine)
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs font-bold mb-1 block">Sélectionner l'Élève *</Label>
                <Select value={newEcheanceStudentId} onValueChange={setNewEcheanceStudentId}>
                  <SelectTrigger><SelectValue placeholder="Choisir un élève..." /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {students.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.matricule} — {s.lastName.toUpperCase()} {s.firstName} ({s.className || 'Classe'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold mb-1 block">Service Concerné *</Label>
                <Select value={newEcheanceService} onValueChange={setNewEcheanceService}>
                  <SelectTrigger><SelectValue placeholder="Service" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scolarite">🎓 Scolarité</SelectItem>
                    <SelectItem value="transport">🚌 Transport Scolaire</SelectItem>
                    <SelectItem value="cantine">🍽️ Cantine / Restauration</SelectItem>
                    <SelectItem value="autre">📦 Autre Frais</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold mb-1 block">Libellé de la Tranche / Mois *</Label>
                <Input
                  value={newEcheanceLibelle}
                  onChange={(e) => setNewEcheanceLibelle(e.target.value)}
                  placeholder="ex: Transport Mensuel - Octobre (Échéance 5 Oct.)"
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-bold mb-1 block">Montant Dû (FCFA) *</Label>
                  <Input
                    type="number"
                    value={newEcheanceMontant}
                    onChange={(e) => setNewEcheanceMontant(e.target.value)}
                    placeholder="25000"
                    className="text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold mb-1 block">Date Échéance (Le 5) *</Label>
                  <Input
                    type="date"
                    value={newEcheanceDate}
                    onChange={(e) => setNewEcheanceDate(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddEcheanceModal(false)} className="text-xs font-bold">
                Annuler
              </Button>
              <Button onClick={handleCreateCustomEcheance} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1">
                <CheckCircle className="w-4 h-4" /> Enregistrer l'Échéance
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
}
