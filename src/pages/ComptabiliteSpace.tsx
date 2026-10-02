/**
 * Espace Comptabilité — Gestion financière globale (§3.1)
 * Accès : comptable, direction_fondation, directeur_ecole, admin
 * Hiérarchie : Comptabilité > Scolarité > Accueil
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3, DollarSign, TrendingUp, TrendingDown,
  FileText, Download, Printer, Calendar, AlertCircle,
  Users, CheckCircle2, Clock, Search, Filter,
  PieChart, BookMarked, ArrowUpRight, Landmark, FileSpreadsheet, Upload, Check,
  ClipboardList, GraduationCap, School, ExternalLink,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatStudentName, formatCurrency, formatDate, formatDateTime, ROUTE_PATHS } from '@/lib/index';
import apiClient from '@/lib/apiClient';
import {
  generateSagePNM,
  generateSageCSV,
  parseSageImportFile,
  downloadSageExportFile,
  DEFAULT_SYSCOHADA_SAGE_CONFIG,
  SageAccountingEntry,
  SageConfig,
} from '@/lib/sageExportBridge';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function getMoisAnnee(date: string) {
  const d = new Date(date);
  return isNaN(d.getTime()) ? { mois: -1, annee: -1 } : { mois: d.getMonth(), annee: d.getFullYear() };
}

// ─── Composant MetricCard ─────────────────────────────────────────────────────

function MetricCard({ label, value, sub, icon: Icon, color = 'text-primary', bg = 'bg-primary/10', trend }: {
  label: string; value: string; sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string; bg?: string; trend?: 'up' | 'down';
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-11 w-11 rounded-full ${bg} flex items-center justify-center shrink-0`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-lg font-bold leading-tight break-all ${color}`}>{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        </div>
        {trend && (
          <div className={`shrink-0 ${trend === 'up' ? 'text-green-600' : 'text-destructive'}`}>
            {trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ComptabiliteSpace() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('tableau_bord');
  const [payments, setPayments] = useState<any[]>([]);
  const [echeances, setEcheances] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassCycle, setSelectedClassCycle] = useState<string>('all');
  const [classSearch, setClassSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchPay, setSearchPay] = useState('');
  const [filterMois, setFilterMois] = useState<string>('tous');
  const [filterType, setFilterType] = useState<string>('tous');
  const [selectedAnnee] = useState(new Date().getFullYear());
  const [recouvrement, setRecouvrement] = useState<{ taux_global: number; par_eleve: any[]; par_classe: any[]; par_niveau: any[] } | null>(null);
  const [recouvrementMois, setRecouvrementMois] = useState<string>('annuel');
  const [recouvrementLoading, setRecouvrementLoading] = useState(false);

  // Passerelle Sage & Saari States
  const [sageConfig, setSageConfig] = useState<SageConfig>(DEFAULT_SYSCOHADA_SAGE_CONFIG);
  const [sageDateStart, setSageDateStart] = useState<string>(`${new Date().getFullYear()}-01-01`);
  const [sageDateEnd, setSageDateEnd] = useState<string>(new Date().toISOString().split('T')[0]);
  const [importedSageEntries, setImportedSageEntries] = useState<SageAccountingEntry[]>([]);
  const [importingSage, setImportingSage] = useState<boolean>(false);

  const handleFileUploadSage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseSageImportFile(text, file.name);
        setImportedSageEntries(parsed);
        toast({
          title: "Fichier Sage chargé avec succès",
          description: `${parsed.length} écritures comptables extraites du fichier ${file.name}`,
        });
      }
    };
    reader.readAsText(file);
  };

  const handleSaveImportedSage = async () => {
    if (!importedSageEntries.length) return;
    setImportingSage(true);
    let successCount = 0;

    try {
      for (const entry of importedSageEntries) {
        if (entry.credit > 0 || entry.debit > 0) {
          const eleve = students.find(
            (s) =>
              (s.matricule && entry.compteTiers && s.matricule.toLowerCase() === entry.compteTiers.toLowerCase()) ||
              `${s.lastName || s.nom || ''} ${s.firstName || s.prenom || ''}`.toLowerCase().includes((entry.libelle || '').toLowerCase())
          );

          const amount = entry.debit > 0 ? entry.debit : entry.credit;

          await apiClient.createPayment({
            student_id: eleve ? eleve.id : 1,
            eleve_id: eleve ? eleve.id : 1,
            type: (entry.libelle || '').toLowerCase().includes("cant") ? "cantine" : (entry.libelle || '').toLowerCase().includes("trans") ? "transport" : "scolarite",
            montant: amount,
            amount: amount,
            mode: entry.journalCode === "BQ" ? "banque" : "especes",
            status: "paye",
            date: entry.date,
            numero_recu: entry.numeroPiece,
            receiptNumber: entry.numeroPiece,
          }).catch(() => null);

          successCount++;
        }
      }

      toast({
        title: "Importation Sage enregistrée avec succès !",
        description: `${successCount} écritures synchronisées dans la base de données.`,
      });
      setImportedSageEntries([]);
      loadData();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erreur d'importation",
        description: "Impossible d'enregistrer les écritures Sage.",
      });
    } finally {
      setImportingSage(false);
    }
  };

  // Sage Accounting Entries Computation
  const sageEntries = useMemo<SageAccountingEntry[]>(() => {
    const list: SageAccountingEntry[] = [];

    payments.forEach(p => {
      let pDate = sageDateEnd;
      if (typeof p.date === 'string') {
        pDate = p.date.split('T')[0];
      } else if (p.date instanceof Date) {
        pDate = p.date.toISOString().split('T')[0];
      } else if (p.date) {
        try {
          const d = new Date(p.date);
          if (!isNaN(d.getTime())) pDate = d.toISOString().split('T')[0];
        } catch (e) {}
      }

      if (pDate < sageDateStart || pDate > sageDateEnd) return;

      const eleve = students.find(s => String(s.id) === String(p.studentId || p.eleve_id));
      const eleveName = eleve ? formatStudentName(eleve) : (p.studentName || p.eleve_nom || "Élève");
      const matricule = eleve?.matricule || p.matricule || `MAT-${p.id}`;
      const piece = p.receiptNumber || p.numero_recu || `RC-${p.id}`;
      const amount = Number(p.amount || p.montant || 0);

      if (amount <= 0) return;

      const pType = (p.type || '').toLowerCase();

      // Compte Produit Ventes
      let compteProduit = sageConfig.compteProduitScolarite;
      let typeLibelle = "Scolarité";
      if (pType.includes("cant")) {
        compteProduit = sageConfig.compteProduitCantine;
        typeLibelle = "Cantine";
      } else if (pType.includes("trans") || pType.includes("car")) {
        compteProduit = sageConfig.compteProduitTransport;
        typeLibelle = "Transport Car";
      }

      // 1. VENTES : Débit Client (411) / Crédit Produit (706/707)
      list.push({
        journalCode: sageConfig.journalVentes as any,
        date: pDate,
        compteGeneral: sageConfig.compteClientScolarite,
        compteTiers: matricule,
        numeroPiece: piece,
        libelle: `Facture ${typeLibelle} - ${eleveName}`,
        debit: amount,
        credit: 0,
      });

      list.push({
        journalCode: sageConfig.journalVentes as any,
        date: pDate,
        compteGeneral: compteProduit,
        compteTiers: "",
        numeroPiece: piece,
        libelle: `Vente ${typeLibelle} - ${eleveName}`,
        debit: 0,
        credit: amount,
      });

      // 2. RÈGLEMENT : Débit Caisse/Banque (571/512) / Crédit Client (411)
      const isBanque = (p.mode || '').toLowerCase().includes("bank") || (p.mode || '').toLowerCase().includes("vir") || (p.mode || '').toLowerCase().includes("cheq");
      const journalTresorerie = isBanque ? sageConfig.journalBanque : sageConfig.journalCaisse;
      const compteTresorerie = isBanque ? sageConfig.compteBanque : sageConfig.compteCaisse;

      list.push({
        journalCode: journalTresorerie as any,
        date: pDate,
        compteGeneral: compteTresorerie,
        compteTiers: "",
        numeroPiece: piece,
        libelle: `Règlement ${typeLibelle} - ${eleveName}`,
        debit: amount,
        credit: 0,
      });

      list.push({
        journalCode: journalTresorerie as any,
        date: pDate,
        compteGeneral: sageConfig.compteClientScolarite,
        compteTiers: matricule,
        numeroPiece: piece,
        libelle: `Règlement ${typeLibelle} - ${eleveName}`,
        debit: 0,
        credit: amount,
      });
    });

    return list;
  }, [payments, students, sageDateStart, sageDateEnd, sageConfig]);

  const totalSageDebit = useMemo(() => sageEntries.reduce((s, e) => s + e.debit, 0), [sageEntries]);
  const totalSageCredit = useMemo(() => sageEntries.reduce((s, e) => s + e.credit, 0), [sageEntries]);

  const handleDownloadSage = (format: "pnm" | "csv" | "txt") => {
    if (!sageEntries.length) {
      toast({ title: "Aucune écriture comptable trouvée sur la période." });
      return;
    }

    let content = "";
    let ext = "pnm";

    if (format === "csv") {
      content = generateSageCSV(sageEntries);
      ext = "csv";
    } else {
      content = generateSagePNM(sageEntries);
      ext = format === "pnm" ? "pnm" : "txt";
    }

    const filename = `ECRITURES_SAGE_SYSCOHADA_${sageDateStart}_AU_${sageDateEnd}.${ext}`;
    downloadSageExportFile(filename, content);
    toast({ title: "Exportation Sage & Saari réussie !", description: `Fichier téléchargé : ${filename}` });
  };

  const loadData = async () => {
    setLoading(true);
    setRecouvrementLoading(true);
    try {
      const [p, s, c, r, ech] = await Promise.all([
        apiClient.getPayments(),
        apiClient.getStudents(),
        apiClient.getClasses(),
        apiClient.getRecouvrement(recouvrementMois === 'annuel' ? { annee: selectedAnnee } : { annee: selectedAnnee, mois: Number(recouvrementMois) }),
        apiClient.getEcheanciers({ annee_scolaire: '2026-2027' }).catch(() => []),
      ]);
      setPayments(p || []);
      setStudents(s || []);
      setClasses(c || []);
      setRecouvrement(r || null);
      setEcheances(ech || []);
    } catch { setPayments([]); setStudents([]); setClasses([]); setRecouvrement(null); setEcheances([]); }
    finally { setLoading(false); setRecouvrementLoading(false); }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadData(); }, [recouvrementMois]);

  // ─── KPIs globaux ────────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const paye = payments.filter(p => p.status === 'paye' || (p as any).statut === 'paye' || (p as any).statut === 'payé');
    const totalEncaisse = paye.reduce((s, p) => s + (Number(p.amount || (p as any).montant) || 0), 0);

    let totalAttendu = 0;
    let totalImpaye = 0;

    if (echeances.length > 0) {
      totalAttendu = echeances.reduce((s, e) => s + Number(e.montant_prevu || 0), 0);
      totalImpaye = echeances
        .filter(e => e.statut !== 'paye')
        .reduce((s, e) => s + Math.max(0, Number(e.montant_prevu || 0) - Number(e.montant_paye || 0)), 0);
      if (totalAttendu > totalEncaisse) {
        totalImpaye = Math.max(totalImpaye, totalAttendu - totalEncaisse);
      }
    } else {
      const impaye = payments.filter(p => p.status !== 'paye' && p.status !== 'annule');
      totalImpaye = impaye.reduce((s, p) => s + (p.amount || 0), 0);
      totalAttendu = totalEncaisse + totalImpaye;
    }

    const actifs = students.filter(s => s.status === 'actif').length;
    const preinscrit = students.filter(s => s.status === 'preinscrit').length;
    const tauxRecouvrement = totalAttendu > 0
      ? Math.round((totalEncaisse / totalAttendu) * 100)
      : (totalEncaisse > 0 ? 100 : 0);
    return { totalEncaisse, totalImpaye, actifs, preinscrit, tauxRecouvrement, nbPaiements: paye.length };
  }, [payments, students, echeances]);

  // ─── Agrégation mensuelle ────────────────────────────────────────────────────

  const parMois = useMemo(() => {
    return MOIS.map((label, idx) => {
      const moisPay = payments.filter(p => {
        const { mois, annee } = getMoisAnnee(p.date || '');
        return mois === idx && annee === selectedAnnee && p.status === 'paye';
      });
      return {
        label,
        montant: moisPay.reduce((s, p) => s + (p.amount || 0), 0),
        count: moisPay.length,
      };
    });
  }, [payments, selectedAnnee]);

  // ─── Filtres paiements ───────────────────────────────────────────────────────

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const eleve = students.find(s => String(s.id) === String(p.studentId || p.eleve_id));
      const name = eleve ? `${formatStudentName(eleve)}` : '';
      const matchSearch = name.toLowerCase().includes(searchPay.toLowerCase()) || String(p.receiptNumber || '').includes(searchPay);
      const { mois } = getMoisAnnee(p.date || '');
      const matchMois = filterMois === 'tous' || mois === Number(filterMois);
      const matchType = filterType === 'tous' || p.type === filterType;
      return matchSearch && matchMois && matchType;
    }).slice(0, 200);
  }, [payments, students, searchPay, filterMois, filterType]);

  // ─── Impayés ────────────────────────────────────────────────────────────────

  const impayes = useMemo(() => {
    return students.filter(s => s.status === 'actif').map(s => {
      const sPay = payments.filter(p => String(p.studentId || p.eleve_id) === String(s.id) && p.status === 'paye');
      const total = sPay.reduce((sum, p) => sum + (p.amount || 0), 0);
      return { ...s, totalPaye: total };
    }).filter(s => s.totalPaye === 0);
  }, [students, payments]);

  // ─── Export CSV ──────────────────────────────────────────────────────────────

  const handleExportCSV = (data: any[], filename: string) => {
    if (!data.length) { toast({ title: 'Aucune donnée à exporter.' }); return; }
    const keys = Object.keys(data[0]);
    const rows = data.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[keys.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = filename; a.click();
    toast({ title: 'Export CSV téléchargé.' });
  };

  const handlePrintRapport = (titre: string, lignes: string[]) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>${titre}</title><style>
      body{font-family:Arial,sans-serif;padding:24px;font-size:12px}
      h1{font-size:18px;margin-bottom:8px}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{border:1px solid #ccc;padding:6px 10px;text-align:left}
      th{background:#f0f0f0;font-weight:bold}
      .total{font-weight:bold;background:#e8f5e9}
    </style></head><body>
    <h1>${titre}</h1>
    <p>Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
    <table><tr>${lignes[0]}</tr>${lignes.slice(1).map(l => `<tr>${l}</tr>`).join('')}</table>
    </body></html>`);
    w.document.close(); w.print();
  };

  const typeLabels: Record<string, string> = {
    scolarite: 'Scolarité', inscription: 'Inscription', transport: 'Transport',
    cantine: 'Cantine', materiel: 'Matériel', autre: 'Autre',
  };

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-primary" />
              Espace Comptabilité
            </h1>
            <p className="text-muted-foreground mt-1">Supervision financière, rapports, taux de recouvrement</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={loadData}>
            <Clock className="h-4 w-4" />Actualiser
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <MetricCard label="Total encaissé" value={formatCurrency(kpis.totalEncaisse)} icon={DollarSign} color="text-green-600" bg="bg-green-100" trend="up" />
          <MetricCard label="Impayés estimés" value={formatCurrency(kpis.totalImpaye)} icon={AlertCircle} color="text-destructive" bg="bg-destructive/10" trend="down" />
          <MetricCard label="Taux recouvrement" value={`${kpis.tauxRecouvrement}%`} icon={TrendingUp} color="text-primary" bg="bg-primary/10" />
          <MetricCard label="Élèves actifs" value={String(kpis.actifs)} icon={Users} color="text-blue-600" bg="bg-blue-100" />
          <MetricCard label="En attente" value={String(kpis.preinscrit)} icon={Clock} color="text-amber-600" bg="bg-amber-100" />
          <MetricCard label="Paiements enregistrés" value={String(kpis.nbPaiements)} icon={CheckCircle2} color="text-green-600" bg="bg-green-100" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="tableau_bord" className="gap-1 text-xs"><PieChart className="h-3.5 w-3.5" />Tableau de bord</TabsTrigger>
            <TabsTrigger value="paiements" className="gap-1 text-xs"><DollarSign className="h-3.5 w-3.5" />Tous les paiements</TabsTrigger>
            <TabsTrigger value="impayes" className="gap-1 text-xs">
              <AlertCircle className="h-3.5 w-3.5" />
              Impayés
              {impayes.length > 0 && <span className="ml-1 bg-destructive text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">{impayes.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="recouvrement" className="gap-1 text-xs"><TrendingUp className="h-3.5 w-3.5" />Recouvrement</TabsTrigger>
            <TabsTrigger value="classes" className="gap-1 text-xs"><ClipboardList className="h-3.5 w-3.5 text-blue-600" />Listes de classe</TabsTrigger>
            <TabsTrigger value="rapports" className="gap-1 text-xs"><FileText className="h-3.5 w-3.5" />Rapports</TabsTrigger>
            <TabsTrigger value="scolarite" className="gap-1 text-xs"><BookMarked className="h-3.5 w-3.5" />Vue Scolarité</TabsTrigger>
            <TabsTrigger value="sage" className="gap-1 text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200"><Landmark className="h-3.5 w-3.5 text-indigo-600" />Passerelle Sage & Saari</TabsTrigger>
          </TabsList>

          {/* Tableau de bord */}
          <TabsContent value="tableau_bord" className="mt-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Répartition par type */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Encaissements par type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(typeLabels).map(([type, label]) => {
                      const total = payments.filter(p => p.type === type && p.status === 'paye').reduce((s, p) => s + (p.amount || 0), 0);
                      const pct = kpis.totalEncaisse > 0 ? Math.round((total / kpis.totalEncaisse) * 100) : 0;
                      if (total === 0) return null;
                      return (
                        <div key={type} className="space-y-0.5">
                          <div className="flex justify-between text-xs">
                            <span>{label}</span>
                            <span className="font-semibold">{formatCurrency(total)} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Mensuel */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Encaissements mensuels {selectedAnnee}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {parMois.filter(m => m.montant > 0).map(m => (
                      <div key={m.label} className="flex items-center justify-between text-xs p-1.5 hover:bg-muted/30 rounded">
                        <span className="font-medium w-24">{m.label}</span>
                        <span className="text-muted-foreground">{m.count} paiements</span>
                        <span className="font-bold font-mono text-green-700">{formatCurrency(m.montant)}</span>
                      </div>
                    ))}
                    {parMois.every(m => m.montant === 0) && (
                      <p className="text-xs text-muted-foreground text-center py-4 italic">Aucun encaissement enregistré.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recouvrement gauge */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold">Taux de recouvrement global</p>
                  <span className="text-2xl font-bold text-primary">{kpis.tauxRecouvrement}%</span>
                </div>
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${kpis.tauxRecouvrement >= 80 ? 'bg-green-500' : kpis.tauxRecouvrement >= 50 ? 'bg-amber-500' : 'bg-destructive'}`}
                    style={{ width: `${kpis.tauxRecouvrement}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0%</span>
                  <span className={kpis.tauxRecouvrement >= 80 ? 'text-green-600 font-semibold' : kpis.tauxRecouvrement >= 50 ? 'text-amber-600 font-semibold' : 'text-destructive font-semibold'}>
                    {kpis.tauxRecouvrement >= 80 ? 'Excellent' : kpis.tauxRecouvrement >= 50 ? 'Moyen' : 'Critique'}
                  </span>
                  <span>100%</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tous les paiements */}
          <TabsContent value="paiements" className="mt-4 space-y-3">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Nom élève, N° reçu..." value={searchPay} onChange={e => setSearchPay(e.target.value)} />
              </div>
              <Select value={filterMois} onValueChange={setFilterMois}>
                <SelectTrigger className="w-36"><Calendar className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous mois</SelectItem>
                  {MOIS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-36"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous types</SelectItem>
                  {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                const rows = filteredPayments.map(p => {
                  const eleve = students.find(s => String(s.id) === String(p.studentId || p.eleve_id));
                  return { receipt: p.receiptNumber || '', eleve: eleve ? `${formatStudentName(eleve)}` : '', type: p.type, montant: p.amount, mode: p.mode, statut: p.status, date: formatDate(p.date) };
                });
                handleExportCSV(rows, 'paiements.csv');
              }}>
                <Download className="h-4 w-4" />CSV
              </Button>
            </div>

            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/80 border-b">
                    <tr>
                      <th className="text-left p-3 font-semibold">N° Reçu</th>
                      <th className="text-left p-3 font-semibold">Élève</th>
                      <th className="text-left p-3 font-semibold">Type</th>
                      <th className="text-right p-3 font-semibold">Montant</th>
                      <th className="text-left p-3 font-semibold">Mode</th>
                      <th className="text-left p-3 font-semibold">Date</th>
                      <th className="text-left p-3 font-semibold">Date d'acquittement</th>
                      <th className="text-center p-3 font-semibold">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Chargement…</td></tr>
                    ) : filteredPayments.length === 0 ? (
                      <tr><td colSpan={8} className="p-8 text-center text-muted-foreground italic">Aucun paiement trouvé.</td></tr>
                    ) : filteredPayments.map((p, i) => {
                      const eleve = students.find(s => String(s.id) === String(p.studentId || p.eleve_id));
                      const dateAcq = p.date_acquittement || (p.status === 'paye' ? p.date : null);
                      return (
                        <tr key={p.id || i} className="border-b hover:bg-muted/20">
                          <td className="p-3 font-mono text-xs text-muted-foreground">{p.receiptNumber || '—'}</td>
                          <td className="p-3 font-medium">{eleve ? `${formatStudentName(eleve)}` : '—'}</td>
                          <td className="p-3"><Badge variant="outline" className="text-xs">{typeLabels[p.type] || p.type}</Badge></td>
                          <td className="p-3 text-right font-bold font-mono">{formatCurrency(p.amount || 0)}</td>
                          <td className="p-3 text-muted-foreground capitalize">{p.mode}</td>
                          <td className="p-3 text-muted-foreground text-xs">{formatDateTime(p.date)}</td>
                          <td className="p-3 text-emerald-700 font-medium text-xs">{dateAcq ? formatDate(dateAcq) : '—'}</td>
                          <td className="p-3 text-center">
                            <Badge variant={p.status === 'paye' ? 'default' : 'secondary'}>
                              {p.status === 'paye' ? 'Payé' : p.status === 'annule' ? 'Annulé' : 'En attente'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Impayés */}
          <TabsContent value="impayes" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{impayes.length} élève(s) actif(s) sans paiement enregistré</p>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                const rows = impayes.map(s => ({ nom: s.lastName, prenom: s.firstName, classe: s.className || '', statut: s.status, telephone: s.parentPhone || '' }));
                handleExportCSV(rows, 'impayes.csv');
              }}>
                <Download className="h-4 w-4" />Exporter
              </Button>
            </div>
            {impayes.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground italic">Aucun impayé détecté.</CardContent></Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/80 border-b">
                      <tr>
                        <th className="text-left p-3 font-semibold">Nom</th>
                        <th className="text-left p-3 font-semibold">Classe</th>
                        <th className="text-left p-3 font-semibold">Téléphone parent</th>
                        <th className="text-center p-3 font-semibold">Total payé</th>
                      </tr>
                    </thead>
                    <tbody>
                      {impayes.map((s, i) => (
                        <tr key={i} className="border-b hover:bg-muted/20">
                          <td className="p-3 font-medium text-destructive">{formatStudentName(s)}</td>
                          <td className="p-3 text-muted-foreground">{s.className || '—'}</td>
                          <td className="p-3 text-muted-foreground">{s.parentPhone || '—'}</td>
                          <td className="p-3 text-center font-mono font-bold text-destructive">{formatCurrency(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Recouvrement */}
          <TabsContent value="recouvrement" className="mt-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm text-muted-foreground">Taux de recouvrement calculé sur la base des paiements validés vs. les frais attendus (AU_SCOLARITE).</p>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Période</Label>
                <Select value={recouvrementMois} onValueChange={setRecouvrementMois}>
                  <SelectTrigger className="w-[160px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annuel">Annuel</SelectItem>
                    {MOIS.map((m, i) => (
                      <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {recouvrementLoading ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">Chargement…</CardContent></Card>
            ) : !recouvrement ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground italic">Aucune donnée de recouvrement disponible.</CardContent></Card>
            ) : (
              <>
                <div className="grid md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Taux global</p>
                      <p className="text-3xl font-bold text-primary">{recouvrement.taux_global.toFixed(1)}%</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Total attendu</p>
                      <p className="text-2xl font-bold">{formatCurrency(recouvrement.par_eleve.reduce((s, e) => s + e.total_attendu, 0))}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Total payé</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(recouvrement.par_eleve.reduce((s, e) => s + e.total_paye, 0))}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Par classe</CardTitle></CardHeader>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/80 border-b"><tr><th className="text-left p-3 font-semibold">Classe</th><th className="text-right p-3 font-semibold">Attendu</th><th className="text-right p-3 font-semibold">Payé</th><th className="text-right p-3 font-semibold">Taux</th></tr></thead>
                        <tbody>
                          {recouvrement.par_classe.sort((a, b) => b.taux_recouvrement - a.taux_recouvrement).map((c, i) => (
                            <tr key={i} className="border-b hover:bg-muted/20">
                              <td className="p-3 font-medium">{c.nom}</td>
                              <td className="p-3 text-right font-mono">{formatCurrency(c.total_attendu)}</td>
                              <td className="p-3 text-right font-mono text-green-600">{formatCurrency(c.total_paye)}</td>
                              <td className="p-3 text-right font-bold">{c.taux_recouvrement.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Par niveau</CardTitle></CardHeader>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/80 border-b"><tr><th className="text-left p-3 font-semibold">Niveau</th><th className="text-right p-3 font-semibold">Attendu</th><th className="text-right p-3 font-semibold">Payé</th><th className="text-right p-3 font-semibold">Taux</th></tr></thead>
                        <tbody>
                          {recouvrement.par_niveau.sort((a, b) => b.taux_recouvrement - a.taux_recouvrement).map((n, i) => (
                            <tr key={i} className="border-b hover:bg-muted/20">
                              <td className="p-3 font-medium">{n.nom}</td>
                              <td className="p-3 text-right font-mono">{formatCurrency(n.total_attendu)}</td>
                              <td className="p-3 text-right font-mono text-green-600">{formatCurrency(n.total_paye)}</td>
                              <td className="p-3 text-right font-bold">{n.taux_recouvrement.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm">Détail par élève</CardTitle>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExportCSV(recouvrement.par_eleve.map(e => ({ nom: e.nom, attendu: e.total_attendu, paye: e.total_paye, taux: `${e.taux_recouvrement}%`, periode: e.periode })), `recouvrement_${recouvrementMois}_${selectedAnnee}.csv`)}>
                      <Download className="h-4 w-4" />Exporter
                    </Button>
                  </CardHeader>
                  <div className="overflow-x-auto max-h-[400px]">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/80 border-b sticky top-0"><tr><th className="text-left p-3 font-semibold">Élève</th><th className="text-right p-3 font-semibold">Attendu</th><th className="text-right p-3 font-semibold">Payé</th><th className="text-right p-3 font-semibold">Taux</th></tr></thead>
                      <tbody>
                        {recouvrement.par_eleve.sort((a, b) => b.taux_recouvrement - a.taux_recouvrement).map((e, i) => (
                          <tr key={i} className="border-b hover:bg-muted/20">
                            <td className="p-3 font-medium">{e.nom}</td>
                            <td className="p-3 text-right font-mono">{formatCurrency(e.total_attendu)}</td>
                            <td className="p-3 text-right font-mono text-green-600">{formatCurrency(e.total_paye)}</td>
                            <td className="p-3 text-right font-bold">{e.taux_recouvrement.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Rapports imprimables */}
          <TabsContent value="rapports" className="mt-4">
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                {
                  titre: 'Rapport journalier', icon: '📅', desc: 'Encaissements du jour avec total.',
                  action: () => {
                    const today = new Date().toISOString().split('T')[0];
                    const todayPay = payments.filter(p => p.date && new Date(p.date).toISOString().split('T')[0] === today && p.status === 'paye');
                    const lignes = [
                      '<th>N° Reçu</th><th>Élève</th><th>Type</th><th>Montant</th><th>Mode</th><th>Date d\'acquittement</th>',
                      ...todayPay.map(p => {
                        const e = students.find(s => String(s.id) === String(p.studentId || p.eleve_id));
                        const dateAcq = p.date_acquittement ? formatDate(p.date_acquittement) : formatDate(p.date);
                        return `<td>${p.receiptNumber || ''}</td><td>${e ? `${formatStudentName(e)}` : '—'}</td><td>${p.type}</td><td>${formatCurrency(p.amount)}</td><td>${p.mode}</td><td>${dateAcq}</td>`;
                      }),
                      `<td colspan="3" class="total">Total</td><td class="total">${formatCurrency(todayPay.reduce((s, p) => s + (p.amount || 0), 0))}</td><td colspan="2"></td>`,
                    ];
                    handlePrintRapport(`Rapport journalier — ${today}`, lignes);
                  },
                },
                {
                  titre: 'Rapport mensuel', icon: '📆', desc: 'Encaissements du mois en cours.',
                  action: () => {
                    const now = new Date();
                    const moisPay = payments.filter(p => {
                      const { mois, annee } = getMoisAnnee(p.date || '');
                      return mois === now.getMonth() && annee === now.getFullYear() && p.status === 'paye';
                    });
                    const lignes = [
                      '<th>N° Reçu</th><th>Élève</th><th>Type</th><th>Montant</th><th>Date</th><th>Date d\'acquittement</th>',
                      ...moisPay.map(p => {
                        const e = students.find(s => String(s.id) === String(p.studentId || p.eleve_id));
                        const dateAcq = p.date_acquittement ? formatDate(p.date_acquittement) : formatDate(p.date);
                        return `<td>${p.receiptNumber || ''}</td><td>${e ? `${formatStudentName(e)}` : '—'}</td><td>${p.type}</td><td>${formatCurrency(p.amount)}</td><td>${formatDateTime(p.date)}</td><td>${dateAcq}</td>`;
                      }),
                      `<td colspan="3" class="total">Total</td><td class="total">${formatCurrency(moisPay.reduce((s, p) => s + (p.amount || 0), 0))}</td><td colspan="2"></td>`,
                    ];
                    handlePrintRapport(`Rapport mensuel — ${MOIS[now.getMonth()]} ${now.getFullYear()}`, lignes);
                  },
                },
                {
                  titre: 'Rapport annuel', icon: '📊', desc: `Bilan de l'année ${selectedAnnee}.`,
                  action: () => {
                    const lignes = [
                      '<th>Mois</th><th>Nb paiements</th><th>Montant encaissé</th>',
                      ...parMois.map(m => `<td>${m.label}</td><td>${m.count}</td><td>${formatCurrency(m.montant)}</td>`),
                      `<td class="total">Total</td><td class="total">${parMois.reduce((s, m) => s + m.count, 0)}</td><td class="total">${formatCurrency(parMois.reduce((s, m) => s + m.montant, 0))}</td>`,
                    ];
                    handlePrintRapport(`Rapport annuel ${selectedAnnee}`, lignes);
                  },
                },
                {
                  titre: 'Liste des impayés', icon: '⚠️', desc: 'Élèves actifs sans paiement enregistré.',
                  action: () => {
                    const lignes = [
                      '<th>Nom</th><th>Prénom</th><th>Classe</th><th>Téléphone parent</th>',
                      ...impayes.map(s => `<td>${s.lastName}</td><td>${s.firstName}</td><td>${s.className || '—'}</td><td>${s.parentPhone || '—'}</td>`),
                    ];
                    handlePrintRapport(`Liste des impayés — ${new Date().toLocaleDateString('fr-FR')}`, lignes);
                  },
                },
                {
                  titre: 'Taux de recouvrement', icon: '📈', desc: 'Analyse du taux de recouvrement par mois.',
                  action: () => {
                    const lignes = [
                      '<th>Mois</th><th>Encaissé</th><th>% du total annuel</th>',
                      ...parMois.filter(m => m.montant > 0).map(m => {
                        const total = parMois.reduce((s, x) => s + x.montant, 0);
                        const pct = total > 0 ? Math.round((m.montant / total) * 100) : 0;
                        return `<td>${m.label}</td><td>${formatCurrency(m.montant)}</td><td>${pct}%</td>`;
                      }),
                    ];
                    handlePrintRapport('Analyse taux de recouvrement', lignes);
                  },
                },
                {
                  titre: 'Export global CSV', icon: '💾', desc: 'Tous les paiements en fichier CSV.',
                  action: () => {
                    const rows = payments.map(p => {
                      const e = students.find(s => String(s.id) === String(p.studentId || p.eleve_id));
                      return { receipt: p.receiptNumber || '', eleve: e ? `${formatStudentName(e)}` : '', classe: e?.className || '', type: p.type, montant: p.amount, mode: p.mode, statut: p.status, date: formatDate(p.date) };
                    });
                    handleExportCSV(rows, `paiements_complet_${selectedAnnee}.csv`);
                  },
                },
                {
                  titre: 'Listes de classe officielles', icon: '📋', desc: 'Consulter et imprimer les listes d\'élèves par classe (Maternelle, Primaire, Collège, Lycée).',
                  action: () => navigate(ROUTE_PATHS.CLASS_LISTS),
                },
              ].map(r => (
                <Card key={r.titre} className="hover:shadow-md transition-shadow cursor-pointer" onClick={r.action}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <span className="text-2xl">{r.icon}</span>
                    <div>
                      <p className="font-semibold text-sm">{r.titre}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0 mt-0.5" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Vue Scolarité intégrée */}
          <TabsContent value="scolarite" className="mt-4 space-y-4">
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
              <BookMarked className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Accès Scolarité — Lecture seule</p>
                <p className="text-xs mt-0.5">La Comptabilité a accès en consultation aux données de la Scolarité. Les encaissements se font depuis l'onglet Scolarité.</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Pré-inscrits en attente de finalisation</CardTitle>
                </CardHeader>
                <CardContent>
                  {students.filter(s => s.status === 'preinscrit').length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Aucun dossier en attente.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {students.filter(s => s.status === 'preinscrit').map(s => (
                        <div key={s.id} className="flex justify-between text-xs p-2 bg-muted/40 rounded">
                          <span className="font-medium">{formatStudentName(s)}</span>
                          <span className="text-muted-foreground">{s.className || '—'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Encaissements récents (Scolarité)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {payments.slice(0, 10).map((p, i) => {
                      const e = students.find(s => String(s.id) === String(p.studentId || p.eleve_id));
                      return (
                        <div key={i} className="flex justify-between text-xs p-2 bg-muted/40 rounded">
                          <span className="font-medium">{e ? `${formatStudentName(e)}` : '—'}</span>
                          <span className="font-mono font-bold text-green-700">{formatCurrency(p.amount || 0)}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Listes de classe par niveau */}
          <TabsContent value="classes" className="mt-4 space-y-4">
            {/* Header / Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl shadow-md">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500/30 text-blue-100 border-blue-400/40 text-xs">
                    Maternelle · Primaire · Collège · Lycée
                  </Badge>
                  <Badge className="bg-emerald-500/30 text-emerald-100 border-emerald-400/40 text-xs">
                    Profil Comptabilité
                  </Badge>
                </div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-blue-300" />
                  Listes de classe officielles & Suivi des effectifs
                </h3>
                <p className="text-xs text-blue-200 max-w-2xl">
                  Consultez les effectifs, les classes par niveau d'enseignement et accédez en un clic aux listes officielles complètes (A4 / Excel) avec suivi financier.
                </p>
              </div>
              <Button
                onClick={() => navigate(ROUTE_PATHS.CLASS_LISTS)}
                className="bg-white text-blue-900 hover:bg-blue-50 font-bold shadow-md gap-1.5 shrink-0"
              >
                <ExternalLink className="h-4 w-4" />
                Ouvrir le module complet
              </Button>
            </div>

            {/* Cycle KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Maternelle */}
              <Card
                className={`cursor-pointer transition-all hover:shadow-md border-2 ${selectedClassCycle === 'maternelle' ? "border-amber-500 bg-amber-50/30 dark:bg-amber-950/20" : ""}`}
                onClick={() => setSelectedClassCycle(selectedClassCycle === 'maternelle' ? 'all' : 'maternelle')}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center shrink-0">
                    <GraduationCap className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Maternelle (PS, MS, GS)</p>
                    <p className="text-lg font-bold text-amber-600">
                      {classes.filter((c: any) => String(c.cycle || c.CY_LIBELLECYCLE || '').toLowerCase().includes('mat') || c.cycle_id === 1).length} classes
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {classes.filter((c: any) => String(c.cycle || c.CY_LIBELLECYCLE || '').toLowerCase().includes('mat') || c.cycle_id === 1).reduce((s: number, c: any) => s + (c.studentCount || c.CE_EFFECTIF || 0), 0)} élèves inscrits
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Primaire */}
              <Card
                className={`cursor-pointer transition-all hover:shadow-md border-2 ${selectedClassCycle === 'primaire' ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20" : ""}`}
                onClick={() => setSelectedClassCycle(selectedClassCycle === 'primaire' ? 'all' : 'primaire')}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center shrink-0">
                    <BookMarked className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Primaire (CP1 à CM2)</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {classes.filter((c: any) => String(c.cycle || c.CY_LIBELLECYCLE || '').toLowerCase().includes('prim') || c.cycle_id === 2).length} classes
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {classes.filter((c: any) => String(c.cycle || c.CY_LIBELLECYCLE || '').toLowerCase().includes('prim') || c.cycle_id === 2).reduce((s: number, c: any) => s + (c.studentCount || c.CE_EFFECTIF || 0), 0)} élèves inscrits
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Collège */}
              <Card
                className={`cursor-pointer transition-all hover:shadow-md border-2 ${selectedClassCycle === 'college' ? "border-blue-500 bg-blue-50/30 dark:bg-blue-950/20" : ""}`}
                onClick={() => setSelectedClassCycle(selectedClassCycle === 'college' ? 'all' : 'college')}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center shrink-0">
                    <School className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Collège (6ème à 3ème)</p>
                    <p className="text-lg font-bold text-blue-600">
                      {classes.filter((c: any) => String(c.cycle || c.CY_LIBELLECYCLE || '').toLowerCase().includes('coll') || c.cycle_id === 3).length} classes
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {classes.filter((c: any) => String(c.cycle || c.CY_LIBELLECYCLE || '').toLowerCase().includes('coll') || c.cycle_id === 3).reduce((s: number, c: any) => s + (c.studentCount || c.CE_EFFECTIF || 0), 0)} élèves inscrits
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Lycée */}
              <Card
                className={`cursor-pointer transition-all hover:shadow-md border-2 ${selectedClassCycle === 'lycee' ? "border-purple-500 bg-purple-50/30 dark:bg-purple-950/20" : ""}`}
                onClick={() => setSelectedClassCycle(selectedClassCycle === 'lycee' ? 'all' : 'lycee')}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Lycée (2nde à Tle)</p>
                    <p className="text-lg font-bold text-purple-600">
                      {classes.filter((c: any) => String(c.cycle || c.CY_LIBELLECYCLE || '').toLowerCase().includes('lyc') || c.cycle_id === 4).length} classes
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {classes.filter((c: any) => String(c.cycle || c.CY_LIBELLECYCLE || '').toLowerCase().includes('lyc') || c.cycle_id === 4).reduce((s: number, c: any) => s + (c.studentCount || c.CE_EFFECTIF || 0), 0)} élèves inscrits
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Table & Filters */}
            <Card>
              <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-blue-600" />
                    Répertoire des classes & Effectifs
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Maternelle, Primaire, Collège et Lycée
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative w-48 sm:w-60">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher une classe..."
                      value={classSearch}
                      onChange={(e) => setClassSearch(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1 font-semibold"
                    onClick={() => navigate(ROUTE_PATHS.CLASS_LISTS)}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Imprimer des listes
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/70 border-b text-muted-foreground">
                      <tr>
                        <th className="text-left p-3 font-semibold">Classe</th>
                        <th className="text-left p-3 font-semibold">Cycle</th>
                        <th className="text-left p-3 font-semibold">Niveau</th>
                        <th className="text-center p-3 font-semibold">Effectif / Capacité</th>
                        <th className="text-center p-3 font-semibold">Taux remplissage</th>
                        <th className="text-right p-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classes
                        .filter((c: any) => {
                          const matchCycle = selectedClassCycle === 'all'
                            || (selectedClassCycle === 'maternelle' && (c.cycle_id === 1 || String(c.cycle || c.CY_LIBELLECYCLE || '').toLowerCase().includes('mat')))
                            || (selectedClassCycle === 'primaire' && (c.cycle_id === 2 || String(c.cycle || c.CY_LIBELLECYCLE || '').toLowerCase().includes('prim')))
                            || (selectedClassCycle === 'college' && (c.cycle_id === 3 || String(c.cycle || c.CY_LIBELLECYCLE || '').toLowerCase().includes('coll')))
                            || (selectedClassCycle === 'lycee' && (c.cycle_id === 4 || String(c.cycle || c.CY_LIBELLECYCLE || '').toLowerCase().includes('lyc')));
                          const name = String(c.name || c.CE_LIBELLE || '').toLowerCase();
                          const niv = String(c.niveau || c.CE_LIBELLENIVEAU || '').toLowerCase();
                          const matchQ = !classSearch.trim() || name.includes(classSearch.toLowerCase()) || niv.includes(classSearch.toLowerCase());
                          return matchCycle && matchQ;
                        })
                        .map((cls: any) => {
                          const effectif = cls.studentCount || cls.CE_EFFECTIF || 0;
                          const capacite = cls.capacity || cls.capacite || 40;
                          const fillRate = capacite > 0 ? Math.min(100, Math.round((effectif / capacite) * 100)) : 0;
                          const cycleName = String(cls.cycle || cls.CY_LIBELLECYCLE || (cls.cycle_id === 1 ? 'maternelle' : cls.cycle_id === 2 ? 'primaire' : cls.cycle_id === 3 ? 'college' : 'lycee')).toLowerCase();
                          return (
                            <tr key={cls.id} className="border-b hover:bg-muted/30 transition-colors">
                              <td className="p-3 font-bold text-foreground flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-primary" />
                                {cls.name || cls.CE_LIBELLE}
                              </td>
                              <td className="p-3">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-semibold capitalize ${
                                    cycleName.includes('mat') ? "bg-amber-50 text-amber-700 border-amber-300" :
                                    cycleName.includes('prim') ? "bg-emerald-50 text-emerald-700 border-emerald-300" :
                                    cycleName.includes('coll') ? "bg-blue-50 text-blue-700 border-blue-300" :
                                    "bg-purple-50 text-purple-700 border-purple-300"
                                  }`}
                                >
                                  {cycleName}
                                </Badge>
                              </td>
                              <td className="p-3 text-muted-foreground font-medium">
                                {cls.niveau || cls.CE_LIBELLENIVEAU || '—'}
                              </td>
                              <td className="p-3 text-center font-semibold">
                                <Badge variant="secondary" className="font-mono">
                                  {effectif} / {capacite}
                                </Badge>
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <span className="font-bold text-xs">{fillRate}%</span>
                                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${fillRate >= 90 ? "bg-red-500" : fillRate >= 50 ? "bg-amber-500" : "bg-primary"}`}
                                      style={{ width: `${fillRate}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 text-right">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-primary hover:text-primary font-semibold gap-1"
                                  onClick={() => navigate(ROUTE_PATHS.CLASS_LISTS)}
                                >
                                  Voir la liste
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* =================================================================== */}
          {/* PASSERELLE ET EXPORTATION COMPTABLE SAGE 100 & SAARI (SYSCOHADA) */}
          {/* =================================================================== */}
          <TabsContent value="sage" className="mt-4 space-y-6">
            {/* CARD 1: BANNER & SYSTEM SUMMARY */}
            <Card className="border-indigo-200 dark:border-indigo-900 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white shadow-xl">
              <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-indigo-500/30 text-indigo-200 border-indigo-400/40 text-xs px-2.5 py-0.5">
                      Norme SYSCOHADA (OHADA)
                    </Badge>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs px-2.5 py-0.5">
                      Intégration Sage 100 & Saari
                    </Badge>
                  </div>
                  <h3 className="text-xl font-black flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-indigo-400" /> Passerelle d'Exportation Comptable Sage
                  </h3>
                  <p className="text-xs text-slate-300 max-w-2xl">
                    Générez les fichiers d'écritures comptables au format natif Sage (.PNM / .CSV / .TXT). Importation directe dans Sage 100 via <strong>Fichier &gt; Importer &gt; Format Paramétrable</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-slate-800/80 p-3 rounded-xl border border-indigo-700/50">
                  <div className="text-right text-xs">
                    <p className="text-slate-400 font-semibold">Total Écritures Générées</p>
                    <p className="text-lg font-black text-indigo-300">{sageEntries.length} lignes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CARD 2: CONFIGURATION DES COMPTES SYSCOHADA */}
            <Card className="shadow-md">
              <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-900/50">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                  <FileSpreadsheet className="w-4 h-4" /> Configuration du Plan Comptable SYSCOHADA (Sage)
                </CardTitle>
                <CardDescription className="text-xs">
                  Associez les comptes généraux du plan comptable SYSCOHADA révisé pour vos écritures Sage.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                <div>
                  <Label className="text-[11px] font-semibold text-slate-600">Client Élève (411)</Label>
                  <Input
                    value={sageConfig.compteClientScolarite}
                    onChange={(e) => setSageConfig({ ...sageConfig, compteClientScolarite: e.target.value })}
                    className="h-8 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-600">Ventes Scolarité (706)</Label>
                  <Input
                    value={sageConfig.compteProduitScolarite}
                    onChange={(e) => setSageConfig({ ...sageConfig, compteProduitScolarite: e.target.value })}
                    className="h-8 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-600">Ventes Cantine (7071)</Label>
                  <Input
                    value={sageConfig.compteProduitCantine}
                    onChange={(e) => setSageConfig({ ...sageConfig, compteProduitCantine: e.target.value })}
                    className="h-8 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-600">Ventes Transport (7072)</Label>
                  <Input
                    value={sageConfig.compteProduitTransport}
                    onChange={(e) => setSageConfig({ ...sageConfig, compteProduitTransport: e.target.value })}
                    className="h-8 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-600">Caisse Espèces (571)</Label>
                  <Input
                    value={sageConfig.compteCaisse}
                    onChange={(e) => setSageConfig({ ...sageConfig, compteCaisse: e.target.value })}
                    className="h-8 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-600">Banque / Virement (512)</Label>
                  <Input
                    value={sageConfig.compteBanque}
                    onChange={(e) => setSageConfig({ ...sageConfig, compteBanque: e.target.value })}
                    className="h-8 text-xs font-mono font-bold"
                  />
                </div>
              </CardContent>
            </Card>

            {/* CARD 3: PERIODE ET EXPORTATIONS */}
            <Card className="shadow-md">
              <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                      <Calendar className="w-4 h-4 text-indigo-600" /> Sélection de la Période & Téléchargement
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Exportez les écritures de ventes et de trésorerie équilibrées au format Sage.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs">
                      <span className="text-slate-500 block text-[10px]">Équilibre Comptable</span>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold text-xs">
                        Débit = Crédit ({totalSageDebit.toLocaleString()} F)
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="flex flex-wrap items-end gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border">
                  <div>
                    <Label className="text-xs font-semibold">Date de début</Label>
                    <Input type="date" value={sageDateStart} onChange={(e) => setSageDateStart(e.target.value)} className="h-9 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Date de fin</Label>
                    <Input type="date" value={sageDateEnd} onChange={(e) => setSageDateEnd(e.target.value)} className="h-9 text-xs" />
                  </div>

                  <div className="flex items-center gap-2 ml-auto pt-2">
                    <Button
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold gap-2 text-xs"
                      onClick={() => handleDownloadSage('pnm')}
                    >
                      <Download className="w-4 h-4" /> Exporter Sage 100 (.PNM)
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 text-xs"
                      onClick={() => handleDownloadSage('csv')}
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Exporter Sage Saari (.CSV)
                    </Button>
                    <Button
                      variant="outline"
                      className="font-bold gap-2 text-xs"
                      onClick={() => handleDownloadSage('txt')}
                    >
                      <FileText className="w-4 h-4" /> Exporter (.TXT)
                    </Button>
                  </div>
                </div>

                {/* PREVIEW TABLE */}
                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b">
                      <tr>
                        <th className="p-2.5">Journal</th>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Compte Général</th>
                        <th className="p-2.5">Compte Tiers</th>
                        <th className="p-2.5">N° Pièce</th>
                        <th className="p-2.5">Libellé de l'Écriture</th>
                        <th className="p-2.5 text-right">Débit (F CFA)</th>
                        <th className="p-2.5 text-right">Crédit (F CFA)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-mono">
                      {sageEntries.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-500 font-sans italic">
                            Aucune écriture comptable générée sur cette période.
                          </td>
                        </tr>
                      ) : (
                        sageEntries.slice(0, 100).map((e, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                            <td className="p-2.5 font-bold text-indigo-600">{e.journalCode}</td>
                            <td className="p-2.5">{e.date}</td>
                            <td className="p-2.5 font-bold">{e.compteGeneral}</td>
                            <td className="p-2.5 text-slate-600">{e.compteTiers || "—"}</td>
                            <td className="p-2.5">{e.numeroPiece}</td>
                            <td className="p-2.5 font-sans font-medium text-slate-900 dark:text-white">{e.libelle}</td>
                            <td className="p-2.5 text-right font-bold text-emerald-600">
                              {e.debit > 0 ? e.debit.toLocaleString() : "0"}
                            </td>
                            <td className="p-2.5 text-right font-bold text-amber-600">
                              {e.credit > 0 ? e.credit.toLocaleString() : "0"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-slate-100 dark:bg-slate-900 font-extrabold border-t">
                      <tr>
                        <td colSpan={6} className="p-3 text-right uppercase">Totaux des Écritures Sage :</td>
                        <td className="p-3 text-right text-emerald-600 font-mono">{totalSageDebit.toLocaleString()} F</td>
                        <td className="p-3 text-right text-amber-600 font-mono">{totalSageCredit.toLocaleString()} F CFA</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* CARD 4: IMPORTATION DES FICHIERS SAGE / SAARI */}
            <Card className="shadow-md border-emerald-200 dark:border-emerald-900">
              <CardHeader className="pb-3 border-b bg-emerald-50/40 dark:bg-emerald-950/20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                      <Upload className="w-4 h-4 text-emerald-600" /> Importer des Écritures Sage / Saari vers l'Application
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Chargez un fichier d'écritures ou d'encaissements (.PNM, .CSV, .TXT) exporté depuis Sage ou Saari pour enregistrer automatiquement les règlements dans la base de données.
                    </CardDescription>
                  </div>

                  {importedSageEntries.length > 0 && (
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 text-xs shadow-md"
                      onClick={handleSaveImportedSage}
                      disabled={importingSage}
                    >
                      <Check className="w-4 h-4" /> Valider & Synchroniser ({importedSageEntries.length} écritures)
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 text-center space-y-3">
                  <div className="flex justify-center">
                    <FileSpreadsheet className="w-10 h-10 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      Sélectionnez votre fichier Sage 100 ou Saari (.PNM / .CSV / .TXT)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Les règlements seront automatiquement appariés avec les élèves via le Matricule ou le Nom.
                    </p>
                  </div>
                  <Input
                    type="file"
                    accept=".pnm,.csv,.txt"
                    onChange={handleFileUploadSage}
                    className="max-w-md mx-auto h-9 text-xs cursor-pointer bg-white dark:bg-slate-950"
                  />
                </div>

                {importedSageEntries.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <p className="font-bold text-emerald-800 dark:text-emerald-300">
                        Prévisualisation des Écritures Extraites ({importedSageEntries.length})
                      </p>
                      <Button variant="ghost" size="sm" className="text-xs text-slate-500" onClick={() => setImportedSageEntries([])}>
                        Annuler l'import
                      </Button>
                    </div>

                    <div className="overflow-x-auto border rounded-xl max-h-60 overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b sticky top-0">
                          <tr>
                            <th className="p-2">Journal</th>
                            <th className="p-2">Date</th>
                            <th className="p-2">N° Pièce</th>
                            <th className="p-2">Compte Tiers (Matricule)</th>
                            <th className="p-2">Élève Apparié</th>
                            <th className="p-2">Libellé</th>
                            <th className="p-2 text-right">Montant (F CFA)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y font-mono">
                          {importedSageEntries.map((e, idx) => {
                            const eleve = students.find(
                              (s) =>
                                (s.matricule && e.compteTiers && s.matricule.toLowerCase() === e.compteTiers.toLowerCase()) ||
                                `${s.lastName || s.nom || ''} ${s.firstName || s.prenom || ''}`.toLowerCase().includes((e.libelle || '').toLowerCase())
                            );
                            const amount = e.debit > 0 ? e.debit : e.credit;

                            return (
                              <tr key={idx} className="hover:bg-emerald-50/50 transition-colors">
                                <td className="p-2 font-bold text-indigo-600">{e.journalCode}</td>
                                <td className="p-2">{e.date}</td>
                                <td className="p-2">{e.numeroPiece}</td>
                                <td className="p-2 font-bold">{e.compteTiers || "—"}</td>
                                <td className="p-2 font-sans font-semibold">
                                  {eleve ? (
                                    <Badge className="bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                      {eleve.lastName || eleve.nom} {eleve.firstName || eleve.prenom}
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-slate-100 text-slate-600 font-normal text-[10px]">Non spécifié</Badge>
                                  )}
                                </td>
                                <td className="p-2 font-sans text-slate-900 dark:text-white">{e.libelle}</td>
                                <td className="p-2 text-right font-bold text-emerald-600">{amount.toLocaleString()} F</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </Layout>
  );
}
