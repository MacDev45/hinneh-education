import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/Layout';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Ticket, Printer, Search, RefreshCw, CheckCircle2, Lock, ShieldAlert,
  DollarSign, Eye, UserCheck, GraduationCap, AlertCircle, Building2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileSpreadsheet, FileText
} from 'lucide-react';
import { printBilletEntree, resolveSchoolNameForStudent } from '@/lib/certificatePrinter';
import { generateQRCodeDataURI } from '@/lib/qrHelper';

export default function BilletsSpace() {
  const { toast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Filters
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterPrintStatus, setFilterPrintStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected student for preview modal
  const [previewStudent, setPreviewStudent] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stData, clsData, payData] = await Promise.all([
        apiClient.getStudents(),
        apiClient.getClasses(),
        apiClient.getPayments().catch(() => []),
      ]);
      setStudents(stData || []);
      setClasses(clsData || []);
      setPayments(payData || []);
    } catch (err) {
      console.error('Erreur chargement données billets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /**
   * Business restriction rule:
   * "Le billet d’entrée est imprimable uniquement après la comptabilisation du 1er versement à la caisse ou Coris Bank"
   */
  const checkBilletEligibility = (s: Student) => {
    // Sum real payments from database for this student
    const studentPayments = payments.filter((p: any) =>
      (String(p.studentId || p.eleve_id || p.student_id || "") === String(s.id) && String(s.id) !== "") ||
      (s.matricule && String(p.studentMatricule || p.matricule || "").trim().toLowerCase() === String(s.matricule).trim().toLowerCase())
    );

    const totalPaidFromTable = studentPayments.reduce((sum: number, p: any) => {
      const st = (p.status || p.statut || "").toLowerCase();
      const isValid = st === "valide" || st === "paye" || st === "payé" || st === "success" || (!st && Number(p.amount || p.montant || 0) > 0);
      return isValid ? sum + Number(p.amount || p.montant || 0) : sum;
    }, 0);

    const directTotalVersed = Number((s as any).totalVersement || (s as any).total_verser || 0);

    // Total actual money paid (from database payments or verified totalVersement)
    const totalVersed = Math.max(totalPaidFromTable, directTotalVersed);

    const isPriseEnCharge = Boolean(
      ((s as any).prise_en_charge || (s as any).priseEnCharge || (s as any).ETAT_BOURSE) &&
      ((s as any).originePriseEnCharge || (s as any).prise_en_charge || (s as any).ETAT_BOURSE)
    );
    const mode = (s as any).modePaiement || (s as any).mode || 'especes';
    const isCorisBank = mode.toLowerCase().includes('coris') || (s as any).corisBankPaid;

    // Minimum 1st payment requirement: Student MUST have at least 15,000 FCFA paid in real payments or be officially Prise en Charge
    const minFirstPayment = 15000;
    const isEligible = isPriseEnCharge || totalVersed >= minFirstPayment;

    return {
      isEligible,
      totalVersed,
      minFirstPayment,
      isPriseEnCharge,
      mode: isPriseEnCharge ? 'Prise en Charge (Exonéré)' : isCorisBank ? 'Coris Bank' : totalVersed >= minFirstPayment ? 'Espèces Caisse' : 'Aucun versement',
      reason: isEligible
        ? 'Règlement du 1er versement validé'
        : 'Impression bloquée : 1er versement de scolarité (min 15 000 FCFA) requis',
    };
  };

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (filterClass !== 'all' && String(s.classId) !== String(filterClass)) return false;

      const eligibility = checkBilletEligibility(s);
      if (filterPrintStatus === 'eligible' && !eligibility.isEligible) return false;
      if (filterPrintStatus === 'blocked' && eligibility.isEligible) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const fullname = `${formatStudentName(s)}`.toLowerCase();
        const mat = (s.matricule || '').toLowerCase();
        if (!fullname.includes(q) && !mat.includes(q)) return false;
      }

      return true;
    });
  }, [students, filterClass, filterPrintStatus, searchQuery]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(12);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterClass, filterPrintStatus, searchQuery, itemsPerPage]);

  const totalPages = useMemo(() => {
    if (itemsPerPage === -1) return 1;
    return Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
  }, [filteredStudents.length, itemsPerPage]);

  const paginatedStudents = useMemo(() => {
    if (itemsPerPage === -1) return filteredStudents;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage, itemsPerPage]);

  // Stats KPI
  const stats = useMemo(() => {
    let totalEligible = 0;
    let totalBlocked = 0;
    students.forEach((s) => {
      if (checkBilletEligibility(s).isEligible) totalEligible++;
      else totalBlocked++;
    });
    return { total: students.length, totalEligible, totalBlocked };
  }, [students]);

  const handlePrintBillet = (s: Student) => {
    const eligibility = checkBilletEligibility(s);
    if (!eligibility.isEligible) {
      toast({
        variant: 'destructive',
        title: '⛔ Délivrance du Billet d\'Entrée Bloquée',
        description: 'Le billet d\'entrée est imprimable uniquement après le versement en espèces à la comptabilité du 1er versement ou au moins une partie par Coris Bank.',
      });
      return;
    }

    const cls = classes.find(c => String(c.id) === String(s.classId));
    const parentTel = (s as any).AU_CONTACTS || (s as any).parentTel || '07 00 00 00 00';

    printBilletEntree(
      s,
      cls || null,
      null,
      `BIL-${new Date().getFullYear()}-${String(s.id).padStart(4, '0')}`,
      '2026 - 2027',
      parentTel
    );

    toast({
      title: '🎟️ Billet d\'Entrée Imprimé avec Succès !',
      description: `Impression A4 (Double Coupon + QR Code) générée pour ${formatStudentName(s)}.`,
    });
  };

  // Export Excel des Billets
  const handleExportExcel = () => {
    const tableHeader = `
      <tr>
        <th style="background-color: #166534; color: white;">#</th>
        <th style="background-color: #166534; color: white;">Matricule</th>
        <th style="background-color: #166534; color: white;">Nom & Prénoms</th>
        <th style="background-color: #166534; color: white;">Classe</th>
        <th style="background-color: #166534; color: white;">Établissement / Branche</th>
        <th style="background-color: #166534; color: white;">Statut Billet</th>
        <th style="background-color: #166534; color: white;">Montant Versé (FCFA)</th>
        <th style="background-color: #166534; color: white;">Mode de Paiement</th>
      </tr>
    `;

    const tableRows = filteredStudents.map((s, idx) => {
      const cls = classes.find((c) => String(c.id) === String(s.classId));
      const className = cls?.name || s.className || 'N/A';
      const el = checkBilletEligibility(s);
      const schoolInfo = resolveSchoolNameForStudent(s.codeEtablissement, className);

      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${s.matricule || 'N/A'}</td>
          <td>${s.lastName?.toUpperCase()} ${s.firstName}</td>
          <td>${className}</td>
          <td>${schoolInfo.fullName}</td>
          <td>${el.isEligible ? 'AUTORISÉ' : 'BLOQUÉ'}</td>
          <td>${el.totalVersed}</td>
          <td>${el.mode}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Billets d'Entrée</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>
        <h2>RÉPERTOIRE OFFICIEL DES BILLETS D'ENTRÉE - GROUPE SCOLAIRE HÎNNEH</h2>
        <table border="1">${tableHeader}${tableRows}</table>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `billets_entree_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: '📊 Export Excel Généré !',
      description: `${filteredStudents.length} billett(s) exporté(s) dans le fichier Excel.`,
    });
  };

  // Export PDF / Impression de la Liste des Billets
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHTML = filteredStudents.map((s, idx) => {
      const cls = classes.find((c) => String(c.id) === String(s.classId));
      const className = cls?.name || s.className || 'N/A';
      const el = checkBilletEligibility(s);
      const schoolInfo = resolveSchoolNameForStudent(s.codeEtablissement, className);

      return `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${s.matricule || 'N/A'}</strong></td>
          <td><strong>${s.lastName?.toUpperCase()} ${s.firstName}</strong></td>
          <td>${className}</td>
          <td>${schoolInfo.shortName}</td>
          <td><span class="badge ${el.isEligible ? 'badge-success' : 'badge-danger'}">${el.isEligible ? '✅ AUTORISÉ' : '⛔ BLOQUÉ'}</span></td>
          <td><strong>${el.totalVersed.toLocaleString('fr-FR')} FCFA</strong></td>
          <td>${el.mode}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>Répertoire des Billets d'Entrée - Groupe Scolaire Hînneh</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; color: #0f172a; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #0f172a; padding-bottom: 10px; }
          .logo { height: 50px; margin-bottom: 5px; }
          h2 { text-transform: uppercase; color: #1e3a8a; font-size: 16px; margin: 0; font-weight: 900; }
          p.sub { font-size: 11px; color: #64748b; margin: 4px 0 0 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
          th { background: #1e3a8a; color: white; padding: 7px; text-align: left; font-size: 10px; text-transform: uppercase; }
          td { border: 1px solid #cbd5e1; padding: 6px; }
          .badge { padding: 3px 6px; border-radius: 4px; font-weight: bold; font-size: 9px; display: inline-block; }
          .badge-success { background: #dcfce7; color: #15803d; }
          .badge-danger { background: #ffe4e6; color: #b91c1c; }
          .footer-date { margin-top: 25px; text-align: right; font-size: 10px; color: #64748b; font-style: italic; }
          @media print { body { padding: 0; } button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="https://hinneh-education.ci/images/hinneh_logo_20260507_234919.png" class="logo" alt="Logo" />
          <h2>GROUPE SCOLAIRE CONFESSIONNEL HÎNNEH</h2>
          <p class="sub">Répertoire Officiel des Billets d'Entrée (Impression PDF) — Extrait du ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Matricule</th>
              <th>Élève</th>
              <th>Classe</th>
              <th>Établissement</th>
              <th>Statut Billet</th>
              <th>Versé</th>
              <th>Mode Paiement</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
        <div class="footer-date">Document édité le ${new Date().toLocaleDateString('fr-FR')} — Hînneh Éducation App</div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-indigo-950 dark:text-white flex items-center gap-2">
                <Ticket className="h-8 w-8 text-emerald-600" />
                Module Impression & Gestion des Billets d'Accès
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Édition directe des billets d'accès en classe sans repasser par le processus d'inscription
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={handleExportExcel}
                className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Exporter Excel
              </Button>
              <Button
                variant="outline"
                onClick={handleExportPDF}
                className="gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-bold"
              >
                <FileText className="h-4 w-4 text-indigo-600" />
                Exporter PDF
              </Button>
              <Button variant="outline" onClick={loadData} disabled={loading} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Business Rule Warning Alert Banner */}
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900 p-4 rounded-2xl flex items-start gap-3 text-xs text-amber-950 dark:text-amber-200">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-bold text-sm block">Règle de Restriction sur la Délivrance des Billets :</strong>
            <p>
              Le billet d’accès est imprimable uniquement après la comptabilisation du <strong>1er versement en espèces à la caisse</strong> ou d'au moins <strong>une partie du 1er versement par CORIS BANK</strong> (ou exonération officielle / prise en charge).
            </p>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-indigo-100 bg-indigo-50/60 dark:bg-indigo-950/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-indigo-700 font-bold uppercase">Total Élèves Inscrits</p>
                <h3 className="text-2xl font-black text-indigo-950 dark:text-white">{stats.total}</h3>
              </div>
              <GraduationCap className="h-8 w-8 text-indigo-600 opacity-80" />
            </CardContent>
          </Card>

          <Card className="border-emerald-100 bg-emerald-50/60 dark:bg-emerald-950/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-700 font-bold uppercase font-mono">Billets Autorisés & Imprimables</p>
                <h3 className="text-2xl font-black text-emerald-700">{stats.totalEligible} Élèves</h3>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-600 opacity-80" />
            </CardContent>
          </Card>

          <Card className="border-rose-100 bg-rose-50/60 dark:bg-rose-950/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-rose-700 font-bold uppercase">Billets Bloqués (Attente 1er Vers.)</p>
                <h3 className="text-2xl font-black text-rose-700">{stats.totalBlocked} Élèves</h3>
              </div>
              <Lock className="h-8 w-8 text-rose-600 opacity-80" />
            </CardContent>
          </Card>
        </div>

        {/* Main List */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-lg font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-indigo-600" /> Répertoire des Billets d'Entrée Élèves
              </span>
              <Badge className="bg-indigo-600 text-white font-mono">{filteredStudents.length} Fiches</Badge>
            </CardTitle>
            <CardDescription className="text-xs">Recherchez un élève pour générer ou réimprimer son billet officiel A4 double coupon</CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Classe</Label>
                <Select value={filterClass} onValueChange={setFilterClass}>
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
                <Label className="text-xs mb-1 block">Statut d'Impression</Label>
                <Select value={filterPrintStatus} onValueChange={setFilterPrintStatus}>
                  <SelectTrigger><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="eligible">✅ Autorisé (1er Versement fait)</SelectItem>
                    <SelectItem value="blocked">⛔ Bloqué (Paiement manquant)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs mb-1 block">Rechercher Élève</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nom, prénom ou matricule..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Students Table / Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {paginatedStudents.map((s) => {
                const cls = classes.find((c) => String(c.id) === String(s.classId));
                const eligibility = checkBilletEligibility(s);

                return (
                  <div
                    key={s.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      eligibility.isEligible
                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 shadow-2xs'
                        : 'bg-rose-50/40 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-300 shrink-0 text-lg overflow-hidden">
                          {s.photo ? (
                            <img src={s.photo} alt="Photo" className="w-full h-full object-cover" />
                          ) : (
                            `${s.lastName?.[0] || s.nom?.[0] || 'L'}${s.firstName?.[0] || s.prenom?.[0] || 'E'}`
                          )}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 dark:text-white uppercase text-sm">
                            {formatStudentName(s)}
                          </h3>
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono font-semibold">
                            Matricule : {s.matricule || 'AUTO'}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">
                            Classe : {cls?.name || s.className || 'Non assigné'}
                          </p>
                        </div>
                      </div>

                      <Badge
                        className={
                          eligibility.isEligible
                            ? 'bg-emerald-600 text-white text-[10px]'
                            : 'bg-rose-600 text-white text-[10px]'
                        }
                      >
                        {eligibility.isEligible ? '✅ Autorisé' : '⛔ Bloqué'}
                      </Badge>
                    </div>

                    {/* Financial status detail */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[11px] text-slate-500 block">Total Versé :</span>
                        <strong className={eligibility.isEligible ? 'text-emerald-700 font-extrabold' : 'text-rose-700 font-extrabold'}>
                          {formatCurrency(eligibility.totalVersed)}
                        </strong>
                        <span className="text-[10px] text-slate-400 ml-1">({eligibility.mode})</span>
                      </div>

                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewStudent(s)}
                          className="text-xs gap-1 h-8"
                        >
                          <Eye className="w-3.5 h-3.5" /> Aperçu
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            toast({
                              title: `🎟️ Billet de Sortie / Incident pour ${s.lastName}`,
                              description: `Motif disponible : Saut de clôture | Usage du téléphone | Urgence Médicale.`,
                            });
                          }}
                          className="text-xs gap-1 h-8 border-amber-300 text-amber-800 hover:bg-amber-50 font-bold"
                        >
                          <Ticket className="w-3.5 h-3.5 text-amber-600" /> Billet Sortie
                        </Button>

                        <Button
                          size="sm"
                          disabled={!eligibility.isEligible}
                          onClick={() => handlePrintBillet(s)}
                          className={
                            eligibility.isEligible
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 font-bold h-8'
                              : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed text-xs gap-1 h-8'
                          }
                        >
                          <Printer className="w-3.5 h-3.5" /> Imprimer Billet
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {filteredStudents.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex flex-wrap items-center gap-3 text-slate-500 font-medium">
                  <span>
                    Affichage de{' '}
                    <strong className="font-bold text-slate-900 dark:text-white">
                      {itemsPerPage === -1 ? 1 : Math.min((currentPage - 1) * itemsPerPage + 1, filteredStudents.length)}
                    </strong>{' '}
                    à{' '}
                    <strong className="font-bold text-slate-900 dark:text-white">
                      {itemsPerPage === -1 ? filteredStudents.length : Math.min(currentPage * itemsPerPage, filteredStudents.length)}
                    </strong>{' '}
                    sur{' '}
                    <strong className="font-bold text-indigo-600">{filteredStudents.length} élèves</strong>
                  </span>

                  <div className="flex items-center gap-1.5 ml-2">
                    <span>Par page :</span>
                    <Select
                      value={String(itemsPerPage)}
                      onValueChange={(val) => setItemsPerPage(Number(val))}
                    >
                      <SelectTrigger className="h-7 w-20 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6</SelectItem>
                        <SelectItem value="12">12</SelectItem>
                        <SelectItem value="24">24</SelectItem>
                        <SelectItem value="48">48</SelectItem>
                        <SelectItem value="-1">Tous</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {itemsPerPage !== -1 && totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(1)}
                      className="h-8 w-8 p-0"
                      title="Première page"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="h-8 w-8 p-0"
                      title="Page précédente"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {/* Page numbers */}
                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                        .map((p, idx, arr) => {
                          const prev = arr[idx - 1];
                          const showEllipsis = prev && p - prev > 1;
                          return (
                            <div key={p} className="flex items-center">
                              {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                              <Button
                                size="sm"
                                variant={currentPage === p ? 'default' : 'outline'}
                                onClick={() => setCurrentPage(p)}
                                className={`h-8 w-8 p-0 font-bold ${
                                  currentPage === p ? 'bg-indigo-600 text-white' : ''
                                }`}
                              >
                                {p}
                              </Button>
                            </div>
                          );
                        })}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="h-8 w-8 p-0"
                      title="Page suivante"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                      className="h-8 w-8 p-0"
                      title="Dernière page"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {filteredStudents.length === 0 && (
              <div className="text-center py-10 space-y-2 border-2 border-dashed rounded-2xl">
                <Ticket className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="text-sm font-semibold text-slate-600">Aucun élève ne correspond aux critères filtrés.</p>
              </div>
            )}

          </CardContent>
        </Card>

        {/* Modal Preview Billet */}
        {previewStudent && (() => {
          const previewClassName = previewStudent.className || (classes.find(c => String(c.id) === String(previewStudent.classId))?.name) || '';
          // Aperçu identique au billet imprimé : identité issue de Profil École.
          const previewSchool = resolveSchoolNameForStudent(
            previewStudent.codeEtablissement,
            previewClassName,
            (previewStudent as any).schoolId || (previewStudent as any).ecole_id,
            previewStudent.codeEtablissement,
          );

          return (
            <Dialog open={Boolean(previewStudent)} onOpenChange={() => setPreviewStudent(null)}>
              <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-emerald-800 font-black text-lg">
                    <Ticket className="w-6 h-6 text-emerald-600" /> Billet d'Entrée Officiel — Groupe Scolaire Hînneh
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Imprimé officiel du Billet d'Entrée en classe (Double Coupon avec cachet et signature).
                  </DialogDescription>
                </DialogHeader>

                {/* Exact Ticket Preview Card */}
                <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 text-xs text-slate-900">
                  {/* Header */}
                  <div className="flex justify-between items-center pb-2">
                    <div className="flex items-center gap-3">
                      {previewSchool.logo && (
                        <img
                          src={previewSchool.logo}
                          alt="Logo de l'établissement"
                          className="w-12 h-12 object-contain"
                        />
                      )}
                      <div>
                        <h4 className="font-black text-sm text-slate-900 uppercase tracking-tight">
                          {previewSchool.fullName}
                        </h4>
                        {previewSchool.addressLine && (
                          <p className="text-[11px] text-slate-500">{previewSchool.addressLine}</p>
                        )}
                        {previewSchool.phoneLine && (
                          <p className="text-[11px] font-bold text-emerald-700">
                            📞 Tél : {previewSchool.phoneLine}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-center">
                      <img
                        src={generateQRCodeDataURI(`https://hinneh-education.ci/#/student-public/${previewStudent.id}`, 180)}
                        alt="QR Code"
                        className="w-18 h-18 object-contain bg-white mx-auto block"
                      />
                      <span className="text-[9px] font-bold text-slate-400 block mt-0.5">Scannez-moi</span>
                    </div>
                  </div>

                  {/* Banner Title Box */}
                  <div className="border-2 border-slate-900 rounded py-2.5 text-center font-black text-base tracking-widest text-slate-900 uppercase">
                    BILLET D'ENTRÉE
                  </div>

                  {/* Body Text */}
                  <div className="space-y-2 text-sm leading-relaxed text-slate-800">
                    <p>
                      L'élève : <strong className="font-black text-indigo-950 underline decoration-dotted text-base">{previewStudent.lastName?.toUpperCase()} {previewStudent.firstName?.toUpperCase()}</strong> <span className="text-slate-400 font-mono text-xs">(Matricule : {previewStudent.matricule || 'AUTO'})</span>
                    </p>
                    <p>
                      a rempli les conditions d'inscription et est autorisé (e) à débuter les cours en classe de : <strong className="font-black text-indigo-950 underline decoration-dotted">{previewClassName || 'CM2'}</strong> pour l'année scolaire <strong>2026 - 2027</strong>.
                    </p>
                  </div>

                  {/* Footer Signature & Stamp */}
                  <div className="flex justify-between items-end pt-3">
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold text-[11px] px-3 py-1 rounded-full">
                      N° Billet : BIL-{String(previewStudent.id).padStart(5, '0')}
                    </Badge>

                    <div className="text-right">
                      <p className="text-xs text-slate-600">Fait{previewSchool.city ? ` à ${previewSchool.city}` : ''}, le {new Date().toLocaleDateString('fr-FR')}</p>
                      <p className="text-xs font-black text-slate-900 mt-0.5">Le Directeur des Études</p>
                      <div className="flex items-center justify-end gap-3 mt-2">
                        <span className="font-serif italic font-black text-indigo-950 text-sm border-b-2 border-indigo-950 pb-0.5">
                          {previewSchool.directeurNom || 'La Direction'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dashed Cut Line */}
                  <div className="pt-3 border-t-2 border-dashed border-slate-300 text-center text-[10px] font-bold text-slate-400 tracking-wider">
                    ✂️ PARTIE À DÉCOUPER — EXEMPLAIRE SECRÉTARIAT / VIE SCOLAIRE ✂️
                  </div>
                </div>

                <DialogFooter className="flex gap-2">
                  <Button variant="outline" onClick={() => setPreviewStudent(null)}>Fermer</Button>
                  <Button
                    onClick={() => {
                      handlePrintBillet(previewStudent);
                      setPreviewStudent(null);
                    }}
                    disabled={!checkBilletEligibility(previewStudent).isEligible}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1"
                  >
                    <Printer className="w-4 h-4" /> Imprimer Billet A4 (Double Coupon)
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          );
        })()}

      </div>
    </Layout>
  );
}
