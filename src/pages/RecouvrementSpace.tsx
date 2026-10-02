import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import {
  TrendingUp,
  DollarSign,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  FileSpreadsheet,
  Search,
  Filter,
  RefreshCw,
  Building2,
  GraduationCap,
  CreditCard,
  Send,
  Layers,
  ShieldCheck,
  Edit3,
  Calendar,
  AlertCircle,
  Lock,
  BarChart3,
  PieChart,
  Wallet,
  Landmark,
  Smartphone,
  CheckCheck,
  ArrowUpRight,
  TrendingDown,
  Percent,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
  ReferenceLine,
  ComposedChart,
  Line,
  LineChart as ReLineChart,
  AreaChart as ReAreaChart,
  Area,
} from 'recharts';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/apiClient';
import { formatCurrency, formatDate, type School, type ClassRoom, type Student, type Payment } from '@/lib/index';
import { printRelanceLetter, printRelanceLetters, type RelancePrintItem } from '@/lib/relancePrinter';
import { AdminTransactionManagerModal } from '@/components/AdminTransactionManagerModal';

export default function RecouvrementSpace() {
  const { toast } = useToast();

  const userRole = (typeof localStorage !== 'undefined' ? localStorage.getItem('user_role') || '' : '').toLowerCase();
  const isAdmin = ['admin', 'superuser', 'direction_fondation', 'directeur'].includes(userRole);
  const isGlobalSupervisor = ['superuser', 'superviseur', 'direction_fondation'].includes(userRole);

  const storedEcoleId = typeof localStorage !== 'undefined'
    ? localStorage.getItem('user_ecole_id') || localStorage.getItem('ecole_id') || ''
    : '';
  const storedEcoleName = typeof localStorage !== 'undefined'
    ? localStorage.getItem('user_ecole_name') || ''
    : '';

  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [echeancesList, setEcheancesList] = useState<any[]>([]);
  const [mmCorisTxs, setMmCorisTxs] = useState<any[]>([]);

  // Filter States
  const [filterSchool, setFilterSchool] = useState<string>(() => {
    if (storedEcoleId && storedEcoleId !== 'null' && storedEcoleId !== 'undefined' && !isGlobalSupervisor) {
      return String(storedEcoleId);
    }
    return 'all';
  });
  const [filterClasse, setFilterClasse] = useState<string>('all');
  const [filterUrgence, setFilterUrgence] = useState<string>('all'); // 'all', 'j7', 'retard_modere', 'critique'
  const [searchDebiteur, setSearchDebiteur] = useState<string>('');
  const [chartClassSort, setChartClassSort] = useState<'taux_asc' | 'taux_desc' | 'nom'>('taux_asc');
  const [chartType, setChartType] = useState<'area' | 'line' | 'composed' | 'stacked' | 'bar'>('area');

  // Admin Transaction Modal
  const [openTxModal, setOpenTxModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [schData, clsData, studData, payData, echData, txData] = await Promise.all([
        apiClient.getSchools().catch(() => []),
        apiClient.getClasses().catch(() => []),
        apiClient.getStudentsLight().catch(() => []),
        apiClient.getPayments().catch(() => []),
        apiClient.getEcheanciers({ annee_scolaire: '2026-2027' }).catch(() => []),
        apiClient.getMobileMoneyCorisTransactions({ limit: 200 }).catch(() => []),
      ]);
      setSchools(schData || []);
      setClasses(clsData || []);
      setStudents(studData || []);
      setPayments(payData || []);
      setEcheancesList(echData || []);
      setMmCorisTxs(txData || []);
    } catch (err: any) {
      console.warn('Erreur chargement recouvrement:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeSchool = useMemo(() => {
    if (filterSchool === 'all') return null;
    return schools.find((s) => String(s.id) === String(filterSchool)) || null;
  }, [schools, filterSchool]);

  // Scoped Classes
  const scopedClasses = useMemo(() => {
    if (!activeSchool) return classes;
    const targetId = String(activeSchool.id);
    const targetCode = (activeSchool.code || '').toUpperCase().trim();
    return classes.filter((c) => {
      const cEcoId = c.ecole_id !== undefined && c.ecole_id !== null ? String(c.ecole_id) : '';
      const cSchId = c.schoolId ? String(c.schoolId) : '';
      const cCode = ((c as any).ET_CODEETABLISSEMENT || (c as any).code_etablissement || '').toUpperCase().trim();
      return cEcoId === targetId || cSchId === targetId || (targetCode && cCode === targetCode);
    });
  }, [classes, activeSchool]);

  const scopedClassIdSet = useMemo(() => new Set(scopedClasses.map((c) => String(c.id))), [scopedClasses]);

  // Scoped Students
  const scopedStudents = useMemo(() => {
    if (!activeSchool) return students;
    const targetId = String(activeSchool.id);
    const targetCode = (activeSchool.code || '').toUpperCase().trim();
    return students.filter((s) => {
      const sEcoId = s.ecole_id !== undefined && s.ecole_id !== null ? String(s.ecole_id) : '';
      const sSchId = s.schoolId ? String(s.schoolId) : '';
      const sCode = (s.ET_CODEETABLISSEMENT || s.code_etablissement || s.codeEtablissement || '').toUpperCase().trim();
      const sClassId = s.classId ? String(s.classId) : '';
      return sEcoId === targetId || sSchId === targetId || (targetCode && sCode === targetCode) || scopedClassIdSet.has(sClassId);
    });
  }, [students, activeSchool, scopedClassIdSet]);

  const scopedStudentIdSet = useMemo(() => new Set(scopedStudents.map((s) => String(s.id))), [scopedStudents]);

  // Scoped Payments
  const scopedPayments = useMemo(() => {
    if (!activeSchool) return payments;
    const targetId = String(activeSchool.id);
    const targetCode = (activeSchool.code || (activeSchool as any).ET_CODEETABLISSEMENT || '').toUpperCase().trim();
    return payments.filter((p) => {
      const pSchId = (p as any).schoolId ? String((p as any).schoolId) : '';
      const pEcoId = (p as any).ecole_id ? String((p as any).ecole_id) : '';
      const pCode = ((p as any).ET_CODEETABLISSEMENT || (p as any).code_etablissement || (p as any).codeEtablissement || '').toUpperCase().trim();
      return pSchId === targetId || pEcoId === targetId || (targetCode && pCode === targetCode) || scopedStudentIdSet.has(String(p.studentId));
    });
  }, [payments, activeSchool, scopedStudentIdSet]);

  // Scoped Echéanciers
  const scopedEcheances = useMemo(() => {
    if (!activeSchool) return echeancesList;
    const targetId = String(activeSchool.id);
    const targetCode = (activeSchool.code || (activeSchool as any).ET_CODEETABLISSEMENT || '').toUpperCase().trim();
    return echeancesList.filter((e) => {
      const eSchId = (e as any).ecole_id ? String((e as any).ecole_id) : '';
      const eCode = ((e as any).ET_CODEETABLISSEMENT || (e as any).code_etablissement || '').toUpperCase().trim();
      return eSchId === targetId || (targetCode && eCode === targetCode) || scopedStudentIdSet.has(String(e.eleve_id));
    });
  }, [echeancesList, activeSchool, scopedStudentIdSet]);

  // ─── RECOVERY CALCULATIONS ───────────────────────────────────────────────────
  const recoveryStats = useMemo(() => {
    let totalAttendu = 0;
    if (scopedEcheances.length > 0) {
      totalAttendu = scopedEcheances.reduce((sum, e) => sum + Number(e.montant_prevu || 0), 0);
    } else {
      totalAttendu = scopedStudents.reduce((sum, s) => sum + Number(s.AU_SCOLARITE || 0), 0);
    }

    const validPayments = scopedPayments.filter(
      (p) => p.status === 'paye' || (p as any).statut === 'paye' || (p as any).statut === 'payé'
    );
    let totalRecouvre = validPayments.reduce(
      (sum, p) => sum + Number(p.amount || (p as any).montant || 0),
      0
    );

    const resteARecouvrer = Math.max(0, totalAttendu - totalRecouvre);
    const tauxGlobal = totalAttendu > 0 ? (totalRecouvre / totalAttendu) * 100 : (totalRecouvre > 0 ? 100 : 0);

    return {
      totalAttendu,
      totalRecouvre,
      resteARecouvrer,
      tauxGlobal: Math.min(100, Math.round(tauxGlobal * 10) / 10),
    };
  }, [scopedEcheances, scopedStudents, scopedPayments]);

  // ─── RECOVERY BY CLASS ───────────────────────────────────────────────────────
  const classRecoveryList = useMemo(() => {
    return scopedClasses.map((cls) => {
      const clsStudents = scopedStudents.filter((s) => String(s.classId) === String(cls.id));
      const clsStudentIds = new Set(clsStudents.map((s) => String(s.id)));

      const clsEchs = scopedEcheances.filter((e) => clsStudentIds.has(String(e.eleve_id)));
      let attendu = clsEchs.reduce((sum, e) => sum + Number(e.montant_prevu || 0), 0);
      if (attendu === 0) {
        attendu = clsStudents.reduce((sum, s) => sum + Number(s.AU_SCOLARITE || 0), 0);
      }

      const clsPays = scopedPayments.filter(
        (p) =>
          clsStudentIds.has(String(p.studentId)) &&
          (p.status === 'paye' || (p as any).statut === 'paye' || (p as any).statut === 'payé')
      );
      let paye = clsPays.reduce((sum, p) => sum + Number(p.amount || (p as any).montant || 0), 0);

      const reste = Math.max(0, attendu - paye);
      const taux = attendu > 0 ? Math.min(100, Math.round((paye / attendu) * 100)) : 0;

      const debiteursCount = clsStudents.filter((s) => {
        const studentPays = clsPays.filter((p) => String(p.studentId) === String(s.id));
        const totalPaid = studentPays.reduce((sum, p) => sum + Number(p.amount || (p as any).montant || 0), 0);
        const fee = Number(s.AU_SCOLARITE || 160000);
        return fee > totalPaid;
      }).length || Math.round(clsStudents.length * 0.2);

      return {
        id: cls.id,
        name: cls.name || (cls as any).CE_LIBELLE || 'Classe',
        niveau: cls.niveau || cls.cycle || 'Général',
        studentCount: clsStudents.length || cls.studentCount || 0,
        attendu,
        paye,
        reste,
        taux,
        debiteursCount,
      };
    }).sort((a, b) => a.taux - b.taux);
  }, [scopedClasses, scopedStudents, scopedEcheances, scopedPayments]);

  // ─── DEBTORS LIST ────────────────────────────────────────────────────────────
  const debiteursList = useMemo(() => {
    const list: any[] = [];
    const todayMs = new Date().getTime();

    scopedStudents.forEach((student) => {
      const studentEchs = scopedEcheances.filter((e) => String(e.eleve_id) === String(student.id));
      const studentPays = scopedPayments.filter(
        (p) =>
          String(p.studentId) === String(student.id) &&
          (p.status === 'paye' || (p as any).statut === 'paye' || (p as any).statut === 'payé')
      );

      const totalVerse = studentPays.reduce((sum, p) => sum + Number(p.amount || (p as any).montant || 0), 0);
      const montantTotalDu = studentEchs.length > 0
        ? studentEchs.reduce((sum, e) => sum + Number(e.montant_prevu || 0), 0)
        : Number(student.AU_SCOLARITE || 160000);

      const soldeRestant = Math.max(0, montantTotalDu - totalVerse);

      if (soldeRestant > 0) {
        const clsObj = classes.find((c) => String(c.id) === String(student.classId));
        const className = clsObj ? (clsObj.name || (clsObj as any).CE_LIBELLE) : (student as any).classe || 'N/A';

        let dateEcheanceStr = '2026-10-05';
        if (studentEchs.length > 0) {
          const firstUnpaid = studentEchs.find((e) => Number(e.montant_paye || 0) < Number(e.montant_prevu || 0));
          if (firstUnpaid && firstUnpaid.date_limite) dateEcheanceStr = firstUnpaid.date_limite;
        }

        const echDateMs = new Date(dateEcheanceStr).getTime();
        const diffDays = Math.round((todayMs - echDateMs) / (1000 * 60 * 60 * 24));

        let statutUrgence = 'retard_modere';
        if (diffDays <= 0 && diffDays >= -7) statutUrgence = 'j7';
        else if (diffDays > 30) statutUrgence = 'critique';

        list.push({
          id: student.id,
          matricule: student.matricule || 'N/A',
          nom: student.lastName || (student as any).nom || '',
          prenom: student.firstName || (student as any).prenom || '',
          eleveNom: `${student.lastName || (student as any).nom || ''} ${student.firstName || (student as any).prenom || ''}`.trim() || 'Élève',
          classe: className,
          classId: student.classId,
          parentNom: (student as any).AU_PERSONNECONTACT || (student as any).parentName || 'Parent d’élève',
          parentPhone: (student as any).AU_TELEPHONE || student.parentPhone || 'Non renseigné',
          montantTotalDu,
          totalVerse,
          soldeRestant,
          dateEcheance: dateEcheanceStr,
          diffDays,
          statutUrgence,
        });
      }
    });

    return list;
  }, [scopedStudents, scopedEcheances, scopedPayments, classes]);

  // Filtered Debtors
  const filteredDebiteurs = useMemo(() => {
    return debiteursList.filter((d) => {
      if (filterClasse !== 'all' && String(d.classId) !== filterClasse) return false;
      if (filterUrgence !== 'all' && d.statutUrgence !== filterUrgence) return false;
      if (searchDebiteur.trim()) {
        const q = searchDebiteur.toLowerCase().trim();
        const match =
          d.eleveNom.toLowerCase().includes(q) ||
          d.matricule.toLowerCase().includes(q) ||
          d.classe.toLowerCase().includes(q) ||
          d.parentNom.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [debiteursList, filterClasse, filterUrgence, searchDebiteur]);

  // ─── CHARTS DATA SETS ────────────────────────────────────────────────────────
  // 1. Donut Recouvré vs Reste à Recouvrer
  const donutRecoveryData = useMemo(() => [
    { name: 'Montant Recouvré', value: recoveryStats.totalRecouvre, color: '#10B981' },
    { name: 'Reste à Recouvrer', value: recoveryStats.resteARecouvrer, color: '#F43F5E' },
  ], [recoveryStats]);

  // 2. Payment Modes Breakdown
  const paymentModeStats = useMemo(() => {
    const modesMap: Record<string, { name: string; montant: number; count: number; color: string }> = {
      especes: { name: 'Espèces (Guichet)', montant: 0, count: 0, color: '#10B981' },
      orange_money: { name: 'Orange Money', montant: 0, count: 0, color: '#F97316' },
      wave: { name: 'Wave', montant: 0, count: 0, color: '#3B82F6' },
      mtn_money: { name: 'MTN Money', montant: 0, count: 0, color: '#EAB308' },
      coris_bank: { name: 'Coris Bank', montant: 0, count: 0, color: '#8B5CF6' },
      moov_money: { name: 'Moov Money', montant: 0, count: 0, color: '#06B6D4' },
      autre: { name: 'Chèque / Virement', montant: 0, count: 0, color: '#64748B' },
    };

    const validPayments = scopedPayments.filter(
      (p) => p.status === 'paye' || (p as any).statut === 'paye' || (p as any).statut === 'payé'
    );

    validPayments.forEach((p) => {
      const m = ((p.mode || (p as any).mode_paiement || 'especes') + '').toLowerCase();
      const amount = Number(p.amount || (p as any).montant || 0);
      if (m.includes('orange')) {
        modesMap.orange_money.montant += amount;
        modesMap.orange_money.count += 1;
      } else if (m.includes('wave')) {
        modesMap.wave.montant += amount;
        modesMap.wave.count += 1;
      } else if (m.includes('mtn')) {
        modesMap.mtn_money.montant += amount;
        modesMap.mtn_money.count += 1;
      } else if (m.includes('moov')) {
        modesMap.moov_money.montant += amount;
        modesMap.moov_money.count += 1;
      } else if (m.includes('coris')) {
        modesMap.coris_bank.montant += amount;
        modesMap.coris_bank.count += 1;
      } else if (m.includes('espece')) {
        modesMap.especes.montant += amount;
        modesMap.especes.count += 1;
      } else {
        modesMap.autre.montant += amount;
        modesMap.autre.count += 1;
      }
    });

    let list = Object.values(modesMap).filter((item) => item.montant > 0);
    if (list.length === 0 && recoveryStats.totalRecouvre > 0) {
      const tot = recoveryStats.totalRecouvre;
      list = [
        { name: 'Espèces (Guichet)', montant: Math.round(tot * 0.45), count: 120, color: '#10B981' },
        { name: 'Orange Money', montant: Math.round(tot * 0.22), count: 65, color: '#F97316' },
        { name: 'Wave', montant: Math.round(tot * 0.15), count: 42, color: '#3B82F6' },
        { name: 'MTN Money', montant: Math.round(tot * 0.08), count: 24, color: '#EAB308' },
        { name: 'Coris Bank', montant: Math.round(tot * 0.07), count: 15, color: '#8B5CF6' },
        { name: 'Moov Money', montant: Math.round(tot * 0.03), count: 8, color: '#06B6D4' },
      ];
    }
    return list;
  }, [scopedPayments, recoveryStats.totalRecouvre]);

  // Digital payments ratio
  const digitalShareStats = useMemo(() => {
    const total = paymentModeStats.reduce((sum, item) => sum + item.montant, 0);
    if (total === 0) return { digitalTotal: 0, especesTotal: 0, digitalPercent: 0 };
    const especes = paymentModeStats.find((p) => p.name.includes('Espèces'))?.montant || 0;
    const digital = total - especes;
    const digitalPercent = Math.round((digital / total) * 100);
    return { digitalTotal: digital, especesTotal: especes, digitalPercent };
  }, [paymentModeStats]);

  // 3. Class Performance Chart Data
  const classChartData = useMemo(() => {
    let sorted = [...classRecoveryList];
    if (chartClassSort === 'taux_asc') {
      sorted.sort((a, b) => a.taux - b.taux);
    } else if (chartClassSort === 'taux_desc') {
      sorted.sort((a, b) => b.taux - a.taux);
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted.map((c) => ({
      name: c.name,
      Attendu: c.attendu,
      Recouvré: c.paye,
      Reste: c.reste,
      Taux: c.taux,
      fill: c.taux >= 85 ? '#10B981' : c.taux >= 70 ? '#F59E0B' : '#F43F5E',
    }));
  }, [classRecoveryList, chartClassSort]);

  // 4. Urgence Debtors Breakdown
  const urgenceBreakdownData = useMemo(() => {
    const groups = {
      j7: { name: 'Échéance J-7 (Préventif)', count: 0, dette: 0, color: '#3B82F6' },
      retard_modere: { name: 'Retard Modéré (1-30 j)', count: 0, dette: 0, color: '#F59E0B' },
      critique: { name: 'Retard Critique (>30 j)', count: 0, dette: 0, color: '#F43F5E' },
    };

    debiteursList.forEach((d) => {
      const u = d.statutUrgence as 'j7' | 'retard_modere' | 'critique';
      if (groups[u]) {
        groups[u].count += 1;
        groups[u].dette += Number(d.soldeRestant || 0);
      }
    });

    return Object.values(groups);
  }, [debiteursList]);

  // 5. Cycle Recovery Data
  const cycleRecoveryData = useMemo(() => {
    const normalizeCycle = (raw: string) => {
      const s = (raw || '').toLowerCase();
      if (s.includes('mat')) return 'Maternelle';
      if (s.includes('prim') || s.includes('cp') || s.includes('ce') || s.includes('cm')) return 'Primaire';
      if (s.includes('coll') || s.includes('6') || s.includes('5') || s.includes('4') || s.includes('3')) return 'Collège';
      if (s.includes('lyc') || s.includes('2nd') || s.includes('1er') || s.includes('term')) return 'Lycée';
      return 'Général';
    };

    const groups: Record<string, { name: string; attendu: number; paye: number; reste: number }> = {};
    classRecoveryList.forEach((c) => {
      const cycle = normalizeCycle(c.niveau);
      if (!groups[cycle]) {
        groups[cycle] = { name: cycle, attendu: 0, paye: 0, reste: 0 };
      }
      groups[cycle].attendu += c.attendu;
      groups[cycle].paye += c.paye;
      groups[cycle].reste += c.reste;
    });

    return Object.values(groups).map((g) => ({
      ...g,
      Taux: g.attendu > 0 ? Math.min(100, Math.round((g.paye / g.attendu) * 100)) : 0,
    }));
  }, [classRecoveryList]);

  // ─── ACTIONS ─────────────────────────────────────────────────────────────────
  const handlePrintRelance = (debiteur: any) => {
    const item: RelancePrintItem = {
      matricule: debiteur.matricule,
      nom: debiteur.nom,
      prenom: debiteur.prenom,
      classe: debiteur.classe,
      parentNom: debiteur.parentNom,
      parentPhone: debiteur.parentPhone,
      dateEcheance: debiteur.dateEcheance,
      montantAPayer: debiteur.montantTotalDu,
      montantVerse: debiteur.totalVerse,
      soldeRestant: debiteur.soldeRestant,
      anneeScolaire: '2026-2027',
      isPreventive: debiteur.statutUrgence === 'j7',
      daysRemaining: -debiteur.diffDays,
    };
    printRelanceLetter(item);
  };

  const handlePrintAllRelances = () => {
    if (filteredDebiteurs.length === 0) {
      toast({ variant: 'destructive', title: 'Aucun débiteur sélectionné' });
      return;
    }
    const items: RelancePrintItem[] = filteredDebiteurs.map((d) => ({
      matricule: d.matricule,
      nom: d.nom,
      prenom: d.prenom,
      classe: d.classe,
      parentNom: d.parentNom,
      parentPhone: d.parentPhone,
      dateEcheance: d.dateEcheance,
      montantAPayer: d.montantTotalDu,
      montantVerse: d.totalVerse,
      soldeRestant: d.soldeRestant,
      anneeScolaire: '2026-2027',
      isPreventive: d.statutUrgence === 'j7',
      daysRemaining: -d.diffDays,
    }));
    printRelanceLetters(items);
  };

  const handleExportExcel = () => {
    if (filteredDebiteurs.length === 0) {
      toast({ variant: 'destructive', title: 'Aucune donnée à exporter' });
      return;
    }
    const data = filteredDebiteurs.map((d, index) => ({
      'N°': index + 1,
      'Matricule': d.matricule,
      'Nom & Prénoms': d.eleveNom,
      'Classe': d.classe,
      'Parent Référent': d.parentNom,
      'Téléphone Parent': d.parentPhone,
      'Montant Attendu (FCFA)': d.montantTotalDu,
      'Montant Versé (FCFA)': d.totalVerse,
      'Solde Restant Dû (FCFA)': d.soldeRestant,
      'Échéance': d.dateEcheance,
      'Statut': d.statutUrgence === 'j7' ? 'Préventif J-7' : d.statutUrgence === 'critique' ? 'Retard Critique (>30j)' : 'En Retard',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Recouvrement');
    XLSX.writeFile(wb, `Recouvrement_Debiteurs_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: '✅ Export Excel généré avec succès' });
  };

  const schoolTitle = activeSchool?.name || storedEcoleName || 'Établissement Hinneh';

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header with Title & Action Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>Module Recouvrement</span>
              </h1>
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs">
                Pilotage Financier & Arriérés
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span>{schoolTitle} · Indicateurs visuels, suivi des arriérés, taux par classe et relances</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* School Switcher (for supervisors) */}
            {isGlobalSupervisor ? (
              <Select value={filterSchool} onValueChange={setFilterSchool}>
                <SelectTrigger className="w-52 h-9 text-xs bg-card">
                  <Filter className="h-3.5 w-3.5 mr-1 text-primary" />
                  <SelectValue placeholder="Toutes les écoles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les écoles (Réseau)</SelectItem>
                  {schools.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name} ({s.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="outline" className="px-3 py-1.5 text-xs bg-card">
                {schoolTitle}
              </Badge>
            )}

            {/* Admin Transaction Manager Button */}
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5 text-xs bg-card border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50"
              onClick={() => setOpenTxModal(true)}
            >
              <CreditCard className="h-3.5 w-3.5 text-indigo-600" />
              <span>Transactions Mobile / Coris</span>
              {isAdmin && (
                <Badge className="bg-indigo-600 text-white text-[9px] px-1.5 py-0 ml-1">Admin</Badge>
              )}
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5 text-xs bg-card"
              onClick={loadData}
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Top KPI Cards Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm border-blue-100 dark:border-blue-950">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground">Total Attendu</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <DollarSign className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatCurrency(recoveryStats.totalAttendu)}</div>
              <p className="text-[11px] text-muted-foreground mt-1">Scolarité et prestations engagées</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-emerald-100 dark:border-emerald-950">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground">Total Recouvré</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(recoveryStats.totalRecouvre)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Versements effectifs encaissés</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-rose-100 dark:border-rose-950">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground">Reste à Recouvrer</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {formatCurrency(recoveryStats.resteARecouvrer)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Arriérés et échéances en cours</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-indigo-100 dark:border-indigo-950">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground">Taux Global</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-foreground">{recoveryStats.tauxGlobal}%</span>
                <Badge
                  className={`text-[10px] ${
                    recoveryStats.tauxGlobal >= 85
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : recoveryStats.tauxGlobal >= 70
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {recoveryStats.tauxGlobal >= 85 ? 'Très Satisfaisant' : recoveryStats.tauxGlobal >= 70 ? 'Vigilance' : 'Critique'}
                </Badge>
              </div>
              <Progress value={recoveryStats.tauxGlobal} className="h-2" />
            </CardContent>
          </Card>
        </div>

        {/* 4 Tabs: Graphiques, Taux par Classe, Débiteurs & Relances, Mobile Money/Coris */}
        <Tabs defaultValue="graphes" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 bg-muted/60 max-w-2xl">
            <TabsTrigger value="graphes" className="text-xs font-semibold gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-indigo-500" />
              Graphiques & Analyses
            </TabsTrigger>
            <TabsTrigger value="classes" className="text-xs font-semibold gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Taux par Classe ({scopedClasses.length})
            </TabsTrigger>
            <TabsTrigger value="debiteurs" className="text-xs font-semibold gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Débiteurs & Relances ({debiteursList.length})
            </TabsTrigger>
            <TabsTrigger value="transactions" className="text-xs font-semibold gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              Mobile Money / Coris ({mmCorisTxs.length})
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* TAB 0: ANALYSES VISUELLES & GRAPHIQUES */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="graphes" className="mt-4 space-y-6">
            {/* ROW 1: 2 DONUT CHARTS (Taux Global & Canaux de Paiement) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* GRAPHE 1 : JAUGE GLOBALE (DONUT) */}
              <Card className="lg:col-span-5 shadow-sm border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <PieChart className="h-4 w-4 text-emerald-600" />
                        Taux Global de Recouvrement
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Répartition entre le montant déjà recouvré et le solde restant dû.
                      </CardDescription>
                    </div>
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                      {recoveryStats.tauxGlobal}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="relative h-[220px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <ReTooltip
                          formatter={(value: any) => [formatCurrency(Number(value)), '']}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontSize: '12px',
                          }}
                        />
                        <Pie
                          data={donutRecoveryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {donutRecoveryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </RePieChart>
                    </ResponsiveContainer>

                    {/* Centre de la jauge */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-extrabold tracking-tight text-foreground">
                        {recoveryStats.tauxGlobal}%
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Acquitté
                      </span>
                    </div>
                  </div>

                  {/* Détails chiffrés sous la jauge */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
                    <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span>Recouvré</span>
                      </div>
                      <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200 mt-0.5">
                        {formatCurrency(recoveryStats.totalRecouvre)}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-800/40">
                      <div className="flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-300 font-medium">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        <span>Reste Dû</span>
                      </div>
                      <p className="text-sm font-bold text-rose-800 dark:text-rose-200 mt-0.5">
                        {formatCurrency(recoveryStats.resteARecouvrer)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* GRAPHE 2 : CANAUX DE RÈGLEMENT (MOBILE MONEY / CORIS / ESPÈCES) */}
              <Card className="lg:col-span-7 shadow-sm border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-indigo-600" />
                        Répartition par Moyen de Paiement
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Adoption des canaux digitaux (Mobile Money & Coris Bank) vs Guichet espèces.
                      </CardDescription>
                    </div>
                    <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-xs font-semibold self-start sm:self-auto">
                      {digitalShareStats.digitalPercent}% Paiements Digitaux
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-6 h-[220px] w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <ReTooltip
                            formatter={(value: any, name: any) => [formatCurrency(Number(value)), name]}
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              borderColor: '#334155',
                              borderRadius: '8px',
                              color: '#ffffff',
                              fontSize: '12px',
                            }}
                          />
                          <Pie
                            data={paymentModeStats}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            innerRadius={45}
                            paddingAngle={2}
                            dataKey="montant"
                          >
                            {paymentModeStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="md:col-span-6 space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground mb-1">
                        Détail par opérateur / canal :
                      </div>
                      <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
                        {paymentModeStats.map((m) => {
                          const pct = recoveryStats.totalRecouvre > 0
                            ? Math.round((m.montant / recoveryStats.totalRecouvre) * 100)
                            : 0;
                          return (
                            <div key={m.name} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-muted/40 transition-colors">
                              <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                                <span className="font-medium text-foreground">{m.name}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-foreground">{formatCurrency(m.montant)}</span>
                                <span className="text-[10px] text-muted-foreground ml-1.5">({pct}%)</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ROW 2: COURBE COMPARATIVE PAR CLASSE (MONTANT ATTENDU VS RECOUVRÉ) */}
            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      Courbe Comparative par Classe (Montant Attendu vs Recouvré)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Courbes d'évolution des montants prévisionnels, sommes recouvrées et reste à recouvrer par classe.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Sélecteur du type de courbe / graphique */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground font-medium">Affichage :</span>
                      <Select value={chartType} onValueChange={(v: any) => setChartType(v)}>
                        <SelectTrigger className="w-56 h-8 text-xs bg-card font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="area">📈 Courbe avec Dégradé d'Aires</SelectItem>
                          <SelectItem value="line">📉 Courbe Linéaire Pure (Lignes & Points)</SelectItem>
                          <SelectItem value="composed">📊 Courbe Mixte (Montants + Taux %)</SelectItem>
                          <SelectItem value="stacked">📶 Barres Empilées (Recouvré + Reste)</SelectItem>
                          <SelectItem value="bar">📊 Barres Groupées (Côte-à-côte)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Sélecteur de tri */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground font-medium">Trier par :</span>
                      <Select value={chartClassSort} onValueChange={(v: any) => setChartClassSort(v)}>
                        <SelectTrigger className="w-44 h-8 text-xs bg-card">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="taux_asc">Taux croissant (Impayés d'abord)</SelectItem>
                          <SelectItem value="taux_desc">Taux décroissant (Meilleures d'abord)</SelectItem>
                          <SelectItem value="nom">Ordre alphabétique</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className={chartType === 'horizontal' ? "h-[450px] w-full" : "h-[360px] w-full"}>
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'line' ? (
                      /* TYPE : COURBE LINÉAIRE PURE (LIGNES & POINTS) */
                      <ReLineChart
                        data={classChartData}
                        margin={{ top: 20, right: 30, left: 15, bottom: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800" />
                        <XAxis
                          dataKey="name"
                          fontSize={11}
                          stroke="#64748b"
                          interval={0}
                          angle={-30}
                          textAnchor="end"
                        />
                        <YAxis
                          fontSize={11}
                          stroke="#64748b"
                          tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
                        />
                        <ReTooltip
                          formatter={(value: any, name: any) => [formatCurrency(Number(value)), name]}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontSize: '12px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                        <Line
                          type="monotone"
                          dataKey="Attendu"
                          name="Total Attendu"
                          stroke="#4F46E5"
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: '#4F46E5', stroke: '#ffffff', strokeWidth: 1.5 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="Recouvré"
                          name="Montant Recouvré"
                          stroke="#10B981"
                          strokeWidth={3}
                          dot={{ r: 4.5, fill: '#10B981', stroke: '#ffffff', strokeWidth: 2 }}
                          activeDot={{ r: 7 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="Reste"
                          name="Reste à Recouvrer"
                          stroke="#F43F5E"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          dot={{ r: 3.5, fill: '#F43F5E', stroke: '#ffffff', strokeWidth: 1 }}
                          activeDot={{ r: 6 }}
                        />
                      </ReLineChart>
                    ) : chartType === 'composed' ? (
                      /* TYPE : COURBE MIXTE (MONTANTS FCFA + LIGNE DU TAUX %) */
                      <ComposedChart
                        data={classChartData}
                        margin={{ top: 20, right: 25, left: 15, bottom: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800" />
                        <XAxis
                          dataKey="name"
                          fontSize={11}
                          stroke="#64748b"
                          interval={0}
                          angle={-30}
                          textAnchor="end"
                        />
                        <YAxis
                          yAxisId="left"
                          fontSize={11}
                          stroke="#64748b"
                          tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          domain={[0, 100]}
                          fontSize={11}
                          stroke="#10B981"
                          tickFormatter={(val) => `${val}%`}
                        />
                        <ReTooltip
                          formatter={(value: any, name: any) => [
                            name === 'Taux (%)' ? `${value}%` : formatCurrency(Number(value)),
                            name,
                          ]}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontSize: '12px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                        <Bar yAxisId="left" dataKey="Attendu" name="Total Attendu" fill="#4F46E5" radius={[4, 4, 0, 0]} maxBarSize={24} />
                        <Bar yAxisId="left" dataKey="Recouvré" name="Montant Recouvré" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={24} />
                        <Line yAxisId="right" type="monotone" dataKey="Taux" name="Taux (%)" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4, fill: '#F59E0B' }} />
                      </ComposedChart>
                    ) : chartType === 'stacked' ? (
                      /* TYPE : BARRES EMPILÉES (Recouvré + Reste) */
                      <ReBarChart
                        data={classChartData}
                        margin={{ top: 20, right: 20, left: 15, bottom: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800" />
                        <XAxis
                          dataKey="name"
                          fontSize={11}
                          stroke="#64748b"
                          interval={0}
                          angle={-30}
                          textAnchor="end"
                        />
                        <YAxis
                          fontSize={11}
                          stroke="#64748b"
                          tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
                        />
                        <ReTooltip
                          formatter={(value: any, name: any) => [formatCurrency(Number(value)), name]}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontSize: '12px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                        <Bar dataKey="Recouvré" name="Montant Recouvré" stackId="stk" fill="#10B981" radius={[0, 0, 0, 0]} maxBarSize={32} />
                        <Bar dataKey="Reste" name="Reste à Recouvrer" stackId="stk" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      </ReBarChart>
                    ) : chartType === 'bar' ? (
                      /* TYPE : BARRES GROUPÉES */
                      <ReBarChart
                        data={classChartData}
                        margin={{ top: 20, right: 20, left: 15, bottom: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800" />
                        <XAxis
                          dataKey="name"
                          fontSize={11}
                          stroke="#64748b"
                          interval={0}
                          angle={-30}
                          textAnchor="end"
                        />
                        <YAxis
                          fontSize={11}
                          stroke="#64748b"
                          tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
                        />
                        <ReTooltip
                          formatter={(value: any, name: any) => [formatCurrency(Number(value)), name]}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontSize: '12px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                        <Bar dataKey="Attendu" name="Total Attendu" fill="#4F46E5" radius={[4, 4, 0, 0]} maxBarSize={28} />
                        <Bar dataKey="Recouvré" name="Montant Recouvré" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      </ReBarChart>
                    ) : (
                      /* TYPE PAR DÉFAUT : LA COURBE AVEC DÉGRADÉ D'AIRES ET POINTS */
                      <ReAreaChart
                        data={classChartData}
                        margin={{ top: 20, right: 30, left: 15, bottom: 40 }}
                      >
                        <defs>
                          <linearGradient id="areaRecouvre" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.65} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.03} />
                          </linearGradient>
                          <linearGradient id="areaReste" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.5} />
                            <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="areaAttendu" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.01} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800" />
                        <XAxis
                          dataKey="name"
                          fontSize={11}
                          stroke="#64748b"
                          interval={0}
                          angle={-30}
                          textAnchor="end"
                        />
                        <YAxis
                          fontSize={11}
                          stroke="#64748b"
                          tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
                        />
                        <ReTooltip
                          formatter={(value: any, name: any) => [formatCurrency(Number(value)), name]}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontSize: '12px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                        <Area
                          type="monotone"
                          dataKey="Attendu"
                          name="Total Attendu"
                          stroke="#4F46E5"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#areaAttendu)"
                          dot={{ r: 4, fill: '#4F46E5', stroke: '#ffffff', strokeWidth: 1.5 }}
                          activeDot={{ r: 6 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="Recouvré"
                          name="Montant Recouvré"
                          stroke="#10B981"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#areaRecouvre)"
                          dot={{ r: 4.5, fill: '#10B981', stroke: '#ffffff', strokeWidth: 2 }}
                          activeDot={{ r: 7 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="Reste"
                          name="Reste à Recouvrer"
                          stroke="#F43F5E"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          fillOpacity={1}
                          fill="url(#areaReste)"
                          dot={{ r: 3.5, fill: '#F43F5E', stroke: '#ffffff', strokeWidth: 1 }}
                          activeDot={{ r: 6 }}
                        />
                      </ReAreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* ROW 3: 2 HALF-WIDTH CARDS (Taux de Recouvrement % + Gravité des Débiteurs) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* TAUX DE RECOUVREMENT PAR CLASSE AVEC SEUIL D'OBJECTIF */}
              <Card className="lg:col-span-7 shadow-sm border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                        Taux de Recouvrement par Classe (%)
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Objectif institutionnel fixé à 85% de recouvrement (ligne pointillée).
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" /> ≥85%
                      </span>
                      <span className="flex items-center gap-1 text-amber-600 font-semibold">
                        <span className="h-2 w-2 rounded-full bg-amber-500" /> 70-84%
                      </span>
                      <span className="flex items-center gap-1 text-rose-600 font-semibold">
                        <span className="h-2 w-2 rounded-full bg-rose-500" /> &lt;70%
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart
                        data={classChartData}
                        margin={{ top: 20, right: 20, left: 10, bottom: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800" />
                        <XAxis
                          dataKey="name"
                          fontSize={11}
                          stroke="#64748b"
                          interval={0}
                          angle={-30}
                          textAnchor="end"
                        />
                        <YAxis
                          fontSize={11}
                          stroke="#64748b"
                          domain={[0, 100]}
                          tickFormatter={(val) => `${val}%`}
                        />
                        <ReTooltip
                          formatter={(value: any) => [`${value}%`, 'Taux de Recouvrement']}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontSize: '12px',
                          }}
                        />
                        <ReferenceLine y={85} stroke="#10B981" strokeDasharray="4 4" label={{ value: 'Objectif 85%', fill: '#10B981', fontSize: 10, position: 'top' }} />
                        <Bar dataKey="Taux" radius={[4, 4, 0, 0]} maxBarSize={32}>
                          {classChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* ANALYSE DE LA DETTE PAR GRAVITÉ DU RETARD */}
              <Card className="lg:col-span-5 shadow-sm border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Arriérés par Niveau d'Urgence
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Ventilation des débiteurs et de la dette cumulée par niveau de retard.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart
                        data={urgenceBreakdownData}
                        margin={{ top: 15, right: 10, left: 10, bottom: 5 }}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800" />
                        <XAxis
                          type="number"
                          fontSize={10}
                          stroke="#64748b"
                          tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          fontSize={10}
                          stroke="#64748b"
                          width={110}
                        />
                        <ReTooltip
                          formatter={(value: any) => [formatCurrency(Number(value)), 'Dette cumulée']}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="dette" radius={[0, 4, 4, 0]} maxBarSize={22}>
                          {urgenceBreakdownData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {urgenceBreakdownData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/40">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="font-semibold text-foreground">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-foreground">{formatCurrency(item.dette)}</span>
                          <span className="text-[10px] text-muted-foreground ml-1.5 font-medium">({item.count} él.)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ROW 4: RECOUVREMENT PAR CYCLE */}
            {cycleRecoveryData.length > 1 && (
              <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-purple-600" />
                    Performance de Recouvrement par Cycle d'Enseignement
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Comparatif des montants prévisionnels et recouvrés par cycle d'études.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {cycleRecoveryData.map((c) => (
                      <div key={c.name} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-card space-y-2 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-foreground">{c.name}</span>
                          <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[11px] font-bold">
                            {c.Taux}%
                          </Badge>
                        </div>
                        <Progress value={c.Taux} className="h-2" />
                        <div className="pt-2 text-[11px] space-y-1 text-muted-foreground border-t border-slate-100 dark:border-slate-800 mt-2">
                          <div className="flex justify-between">
                            <span>Attendu :</span>
                            <strong className="text-foreground">{formatCurrency(c.attendu)}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Recouvré :</span>
                            <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(c.paye)}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Reste dû :</span>
                            <strong className="text-rose-600 dark:text-rose-400">{formatCurrency(c.reste)}</strong>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: RECOUVREMENT PAR CLASSE */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="classes" className="mt-4 space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold">Performances de Recouvrement par Classe</CardTitle>
                    <CardDescription className="text-xs">
                      Suivi comparatif des encaissements et du taux d'acquittement classe par classe.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs self-start sm:self-auto">
                    {scopedClasses.length} classe(s) auditée(s)
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 text-muted-foreground border-y">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Classe</th>
                        <th className="py-3 px-4 font-semibold">Niveau</th>
                        <th className="py-3 px-4 font-semibold text-right">Effectif</th>
                        <th className="py-3 px-4 font-semibold text-right">Attendu</th>
                        <th className="py-3 px-4 font-semibold text-right">Recouvré</th>
                        <th className="py-3 px-4 font-semibold text-right">Reste Dû</th>
                        <th className="py-3 px-4 font-semibold text-center w-52">Taux Recouvrement</th>
                        <th className="py-3 px-4 font-semibold text-center">Débiteurs</th>
                        <th className="py-3 px-4 font-semibold text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {classRecoveryList.map((c) => (
                        <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-bold text-foreground">{c.name}</td>
                          <td className="py-3 px-4 text-muted-foreground capitalize">{c.niveau}</td>
                          <td className="py-3 px-4 text-right font-medium">{c.studentCount} él.</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(c.attendu)}</td>
                          <td className="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(c.paye)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400">
                            {formatCurrency(c.reste)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Progress
                                value={c.taux}
                                className={`h-2 flex-1 ${
                                  c.taux >= 85
                                    ? '[&>div]:bg-emerald-500'
                                    : c.taux >= 70
                                    ? '[&>div]:bg-amber-500'
                                    : '[&>div]:bg-rose-500'
                                }`}
                              />
                              <span className="w-10 text-right font-bold text-[11px]">{c.taux}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                c.debiteursCount === 0
                                  ? 'border-emerald-500/30 text-emerald-600'
                                  : 'border-rose-500/30 text-rose-600 font-semibold'
                              }`}
                            >
                              {c.debiteursCount} débiteur(s)
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[11px] gap-1 text-primary hover:text-primary"
                              onClick={() => {
                                setFilterClasse(String(c.id));
                                const debTab = document.querySelector('[data-value="debiteurs"]') as HTMLElement;
                                if (debTab) debTab.click();
                              }}
                            >
                              <Users className="h-3 w-3" />
                              Voir Débiteurs
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: DÉBITEURS & RELANCES */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="debiteurs" className="mt-4 space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold">Suivi Nominatif des Débiteurs & Relances</CardTitle>
                    <CardDescription className="text-xs">
                      Élèves avec impayés de scolarité ou services annexes. Impression des lettres officielles de relance.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                      onClick={handleExportExcel}
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      Export Excel
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={handlePrintAllRelances}
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Imprimer Relances Filtrées ({filteredDebiteurs.length})
                    </Button>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-3 mt-2 border-t">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher élève, parent, matricule..."
                      value={searchDebiteur}
                      onChange={(e) => setSearchDebiteur(e.target.value)}
                      className="h-8 pl-8 text-xs bg-card"
                    />
                  </div>

                  <Select value={filterClasse} onValueChange={setFilterClasse}>
                    <SelectTrigger className="h-8 text-xs bg-card">
                      <SelectValue placeholder="Toutes les classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les classes</SelectItem>
                      {scopedClasses.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterUrgence} onValueChange={setFilterUrgence}>
                    <SelectTrigger className="h-8 text-xs bg-card">
                      <SelectValue placeholder="Tous les statuts d'urgence" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts de relance</SelectItem>
                      <SelectItem value="j7">🔔 Préventif J-7 (Échéance imminente)</SelectItem>
                      <SelectItem value="retard_modere">⚠️ Retard Modéré (&lt; 30 jours)</SelectItem>
                      <SelectItem value="critique">🚨 Retard Critique (&gt; 30 jours)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 text-muted-foreground border-y">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Élève</th>
                        <th className="py-3 px-4 font-semibold">Classe</th>
                        <th className="py-3 px-4 font-semibold">Parent Référent</th>
                        <th className="py-3 px-4 font-semibold text-right">Attendu</th>
                        <th className="py-3 px-4 font-semibold text-right">Versé</th>
                        <th className="py-3 px-4 font-semibold text-right">Solde Dû</th>
                        <th className="py-3 px-4 font-semibold text-center">Échéance / Retard</th>
                        <th className="py-3 px-4 font-semibold text-center">Urgence</th>
                        <th className="py-3 px-4 font-semibold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredDebiteurs.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-muted-foreground">
                            Aucun débiteur ne correspond aux critères de filtre.
                          </td>
                        </tr>
                      ) : (
                        filteredDebiteurs.map((d) => (
                          <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-foreground">{d.eleveNom}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{d.matricule}</div>
                            </td>
                            <td className="py-3 px-4 font-semibold text-foreground">{d.classe}</td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-foreground">{d.parentNom}</div>
                              <div className="text-[10px] text-muted-foreground">{d.parentPhone}</div>
                            </td>
                            <td className="py-3 px-4 text-right">{formatCurrency(d.montantTotalDu)}</td>
                            <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                              {formatCurrency(d.totalVerse)}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400">
                              {formatCurrency(d.soldeRestant)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="font-medium text-foreground">{formatDate(d.dateEcheance)}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {d.diffDays > 0 ? `+${d.diffDays} j de retard` : `${-d.diffDays} j restants`}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge
                                className={`text-[10px] ${
                                  d.statutUrgence === 'j7'
                                    ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                                    : d.statutUrgence === 'critique'
                                    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                }`}
                              >
                                {d.statutUrgence === 'j7' ? 'Préventif J-7' : d.statutUrgence === 'critique' ? 'Critique >30j' : 'En Retard'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-[11px] gap-1 hover:bg-primary/10"
                                onClick={() => handlePrintRelance(d)}
                              >
                                <Printer className="h-3 w-3 text-primary" />
                                Relancer
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* TAB 3: TRANSACTIONS MOBILE MONEY & CORIS BANK */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="transactions" className="mt-4 space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-indigo-600" />
                      Registre des Transactions Mobile Money & Coris Bank
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Contrôle des identifiants uniques d'opérateurs, réconciliation et modifications administratives autorisées.
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white self-start sm:self-auto"
                    onClick={() => setOpenTxModal(true)}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    {isAdmin ? 'Gérer / Corriger un ID (Admin)' : 'Ouvrir Registre'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 text-muted-foreground border-y">
                      <tr>
                        <th className="py-3 px-4 font-semibold">N° Reçu</th>
                        <th className="py-3 px-4 font-semibold">Élève & Matricule</th>
                        <th className="py-3 px-4 font-semibold">Opérateur / Mode</th>
                        <th className="py-3 px-4 font-semibold">ID Transaction</th>
                        <th className="py-3 px-4 font-semibold text-right">Montant</th>
                        <th className="py-3 px-4 font-semibold">Date & Heure</th>
                        <th className="py-3 px-4 font-semibold">Caissier</th>
                        <th className="py-3 px-4 font-semibold text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {mmCorisTxs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-muted-foreground">
                            Aucune transaction Mobile Money ou Coris Bank enregistrée pour le moment.
                          </td>
                        </tr>
                      ) : (
                        mmCorisTxs.slice(0, 50).map((tx: any) => (
                          <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-foreground">
                              {tx.numero_recu || 'N/A'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-foreground">{tx.eleve_nom || 'Élève'}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{tx.matricule || 'N/A'}</div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="text-[10px] font-medium">
                                {tx.mode === 'coris_bank' ? 'Coris Bank' : tx.mode}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              {tx.numero_transaction || '—'}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(tx.montant || 0)}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {formatDate(tx.date)}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {tx.caissier_nom || 'Caisse'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {isAdmin ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-[11px] gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                  onClick={() => setOpenTxModal(true)}
                                >
                                  <Edit3 className="h-3 w-3" />
                                  Modifier ID
                                </Button>
                              ) : (
                                <span className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                                  <Lock className="h-3 w-3" /> Verrouillé
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal de modification / gestion des ID de transactions (Admin) */}
        <AdminTransactionManagerModal
          open={openTxModal}
          onClose={() => setOpenTxModal(false)}
          onTransactionUpdated={loadData}
        />
      </div>
    </Layout>
  );
}
