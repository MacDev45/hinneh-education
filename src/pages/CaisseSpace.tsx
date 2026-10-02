import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import {
  DollarSign,
  Receipt,
  Search,
  UserCheck,
  ShieldCheck,
  Printer,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  CreditCard,
  Wallet,
  ArrowRight,
  RefreshCw,
  Send,
  Lock,
  Unlock,
  HelpCircle,
  QrCode,
  Sparkles,
  Building,
  User,
  Phone,
  Check,
  Award,
  Shirt,
  Package,
  ShoppingBag,
  CalendarRange,
  FileSpreadsheet,
  Filter,
  Calendar,
  RotateCcw,
  Maximize2,
  SlidersHorizontal,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, formatDateTime, formatTimeGMT, formatDisplayTimeAbidjan, TIMEZONE_GMT, matchStudentSearch, resolveStudentClassName } from "@/lib/index";
import apiClient from "@/lib/apiClient";
import { printReceipt, downloadReceiptPDF, resolveEcheancierEleve, getStudentServiceAttribution, generateReceiptNumber } from "@/lib/receiptPrinter";
import { loadGrillePresets, parseNiveau, type TrancheSource } from "@/lib/grilleTarifaire";
import { getRealSchoolName } from "@/lib/certificatePrinter";
import { loadEcoles, getEcoleCourante } from "@/lib/ecoleIdentite";
import { getFraisDiversList, FraisDiversItem, getOfficialFraisAnnexeTarifConfigured, getOfficialServiceTarif } from "@/lib/tarifsConfig";
import { DuplicateTransactionWarningModal } from "@/components/DuplicateTransactionWarningModal";
import { AdminTransactionManagerModal } from "@/components/AdminTransactionManagerModal";

export default function CaisseSpace() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const printRef = useRef<HTMLDivElement>(null);

  // Vérification du rôle administrateur
  const userRole = localStorage.getItem('user_role') || '';
  const isAdmin = ['admin', 'direction_fondation', 'superuser'].includes(userRole);

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [journal, setJournal] = useState<any>({
    total_general: 0,
    total_especes: 0,
    total_mobile: 0,
    total_cheque_virement: 0,
    fond_de_caisse: 0,
    fond_de_caisse_ventilations: {
      scolarite: 0,
      cantine: 0,
      transport: 0,
    },
    encaissements: [],
    ventilations: {},
  });

  // Session state
  const [caisseOpen, setCaisseOpen] = useState(true);
  const [fondDeCaisse, setFondDeCaisse] = useState<number>(0);

  // Search & Student selection state
  const [searchStudent, setSearchStudent] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentEcheances, setStudentEcheances] = useState<any[]>([]);
  // Origine des tranches affichées : échéancier réel de l'élève, ou modèle tarifaire
  // (Grille Tarifaire Officielle / Frais d'Écolage) utilisé à défaut.
  const [echeancierOrigine, setEcheancierOrigine] = useState<{
    source: TrancheSource | "eleve";
    label: string;
  }>({ source: "eleve", label: "" });
  const [studentPayments, setStudentPayments] = useState<any[]>([]);
  const [quittusCheck, setQuittusCheck] = useState<any>(null);
  const [officialTarifs, setOfficialTarifs] = useState<{ cantineMensuel: number; transportZones: any[] }>({ cantineMensuel: 15000, transportZones: [] });

  // Encaissement Form State
  const [motif, setMotif] = useState<string>("scolarite"); // 'scolarite', 'inscription', 'quitte', 'cantine', 'transport', 'uniforme', 'autre'
  const [optionCantineCaisse, setOptionCantineCaisse] = useState<"mensuel" | "trimestriel" | "annuel">("mensuel");
  const [periodeCantineCaisse, setPeriodeCantineCaisse] = useState<string>("Octobre");
  const [optionTransportCaisse, setOptionTransportCaisse] = useState<"mensuel" | "trimestriel" | "annuel">("mensuel");
  const [periodeTransportCaisse, setPeriodeTransportCaisse] = useState<string>("Octobre");
  // Tarifs dynamiques par établissement / zone
  const [cantineMensuelTarif, setCantineMensuelTarif] = useState<number>(15000);
  const [transportMensuelTarif, setTransportMensuelTarif] = useState<number>(18000);
  // Pack Global (Scolarité + Cantine + Transport) State
  const [packIncludeScolarite, setPackIncludeScolarite] = useState<boolean>(true);
  const [packIncludeCantine, setPackIncludeCantine] = useState<boolean>(true);
  const [packIncludeTransport, setPackIncludeTransport] = useState<boolean>(true);
  const [packCantineMonths, setPackCantineMonths] = useState<number>(9);
  const [packTransportMonths, setPackTransportMonths] = useState<number>(9);
  const [packTransportZoneTarif, setPackTransportZoneTarif] = useState<number>(18000);
  const [selectedEcheanceIds, setSelectedEcheanceIds] = useState<number[]>([]);
  const [montantEncaissement, setMontantEncaissement] = useState<string>("");
  const [isCustomMontant, setIsCustomMontant] = useState<boolean>(false);
  // Miroir en ref du drapeau "montant saisi à la main" : refreshStudentDues est capturé par
  // l'intervalle de 45 s et par l'écouteur de focus, qui ne sont pas recréés quand
  // isCustomMontant change. Sans ce miroir, ils relisent un état périmé (false) et écrasent
  // le montant personnalisé du caissier par le reste dû des tranches sélectionnées.
  const isCustomMontantRef = useRef<boolean>(false);
  // Fenêtre d'impression ouverte dès le clic sur « Reçu Global », le temps que
  // l'appel réseau et le rendu React se terminent.
  const fenetreImpressionRef = useRef<Window | null>(null);
  const markCustomMontant = (custom: boolean) => {
    isCustomMontantRef.current = custom;
    setIsCustomMontant(custom);
  };
  const [modePaiement, setModePaiement] = useState<string>("especes"); // 'especes', 'mobile_money', 'cheque', 'virement'
  const [numTx, setNumTx] = useState<string>("");
  const [observation, setObservation] = useState<string>("");
  const [caisseTenueCycle, setCaisseTenueCycle] = useState<string>('tous');
  const [caisseTenueGenre, setCaisseTenueGenre] = useState<'tous' | 'M' | 'S'>('tous');
  const [submitting, setSubmitting] = useState(false);
  const [openDuplicateModal, setOpenDuplicateModal] = useState(false);
  const [conflictPaiement, setConflictPaiement] = useState<any | null>(null);
  const [openAdminTxModal, setOpenAdminTxModal] = useState(false);

  // Receipt Modal State
  const [openRecuModal, setOpenRecuModal] = useState(false);
  const [currentRecu, setCurrentRecu] = useState<any>(null);
  // Reçu global : l'impression/PDF doit attendre que currentRecu porte le récapitulatif.
  // buildReceiptData lit currentRecu par closure — imprimer juste après setCurrentRecu
  // sortirait l'ancien reçu. On mémorise l'action et on la joue au rendu suivant.
  const [pendingGlobalReceipt, setPendingGlobalReceipt] = useState<null | "print" | "pdf">(null);
  // Reçu du seul versement encaissé, conservé à part : imprimer le récapitulatif global
  // remplace currentRecu par ce récapitulatif. Sans cette copie, le bouton « reçu du
  // versement » n'aurait plus rien à imprimer dès que le global a été affiché une fois.
  const [recuVersement, setRecuVersement] = useState<any>(null);
  const [pendingVersementReceipt, setPendingVersementReceipt] = useState<null | "print" | "pdf">(null);

  // Modification & Annulation de Paiement State
  const [openEditPaymentModal, setOpenEditPaymentModal] = useState(false);
  const [selectedEditPayment, setSelectedEditPayment] = useState<any>(null);
  const [editMontant, setEditMontant] = useState("");
  const [editMode, setEditMode] = useState("especes");
  const [editType, setEditType] = useState("scolarite");
  const [editNumTx, setEditNumTx] = useState("");

  const [openCancelPaymentModal, setOpenCancelPaymentModal] = useState(false);
  const [selectedCancelPayment, setSelectedCancelPayment] = useState<any>(null);
  const [cancelMotif, setCancelMotif] = useState("");
  // Reçu consolidé (plusieurs versements distincts regroupés sous un même élève) : on liste
  // d'abord chaque versement individuellement pour que l'utilisateur choisisse PRÉCISÉMENT
  // lequel annuler, au lieu d'annuler à l'aveugle un seul des versements du groupe.
  const [openCancelListModal, setOpenCancelListModal] = useState(false);
  const [selectedCancelGroup, setSelectedCancelGroup] = useState<any>(null);

  const openEditModal = (item: any) => {
    if (!isAdmin) {
      toast({ variant: "destructive", title: "Accès refusé", description: "Seul un administrateur peut modifier un paiement." });
      return;
    }
    setSelectedEditPayment(item);
    setEditMontant(String(item.montant || ""));
    setEditMode(item.mode || "especes");
    setEditType(item.type || "scolarite");
    setEditNumTx(item.numero_transaction || "");
    setOpenEditPaymentModal(true);
  };

  const handleSaveEditPayment = async () => {
    if (!selectedEditPayment) return;
    if (!editMontant || Number(editMontant) <= 0) {
      toast({ variant: "destructive", title: "Montant invalide" });
      return;
    }
    try {
      await apiClient.updatePayment(selectedEditPayment.id, {
        montant: Number(editMontant),
        mode: editMode,
        type: editType,
        numero_transaction: editNumTx
      });
      toast({ title: "Paiement modifié avec succès !" });
      setOpenEditPaymentModal(false);

      // Optimistic update
      setJournal((prev: any) => ({
        ...prev,
        encaissements: (prev?.encaissements || []).map((it: any) =>
          it.id === selectedEditPayment.id
            ? { ...it, montant: Number(editMontant), mode: editMode, type: editType, numero_transaction: editNumTx }
            : it
        ),
      }));

      refreshJournal();
      if (selectedStudent) handleSelectStudent(selectedStudent);
      if (selectedHistoryDate) loadHistoryData(selectedHistoryDate);
      loadPeriodData();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erreur lors de la modification", description: String(err) });
    }
  };

  const openCancelModal = (item: any) => {
    if (!isAdmin) {
      toast({ variant: "destructive", title: "Accès refusé", description: "Seul un administrateur peut annuler un paiement." });
      return;
    }
    const subItems = Array.isArray(item?.sub_items) && item.sub_items.length > 0 ? item.sub_items : null;
    if (subItems && subItems.length > 1) {
      // Reçu consolidé : afficher d'abord la liste des versements individuels qui le composent.
      setSelectedCancelGroup(item);
      setOpenCancelListModal(true);
      return;
    }
    setSelectedCancelPayment(subItems ? subItems[0] : item);
    setCancelMotif("");
    setOpenCancelPaymentModal(true);
  };

  // Choix d'un versement précis au sein d'un reçu consolidé
  const openCancelModalForSubItem = (sub: any) => {
    setOpenCancelListModal(false);
    setSelectedCancelPayment(sub);
    setCancelMotif("");
    setOpenCancelPaymentModal(true);
  };

  const handleConfirmCancelPayment = async () => {
    if (!selectedCancelPayment) return;
    if (!cancelMotif.trim()) {
      toast({ variant: "destructive", title: "Motif obligatoire", description: "Veuillez saisir le motif d'annulation." });
      return;
    }
    try {
      await apiClient.cancelPayment(selectedCancelPayment.id, cancelMotif);
      toast({ title: "Paiement annulé avec succès !" });
      setOpenCancelPaymentModal(false);
      setSelectedCancelGroup(null);

      // Optimistic cancel
      setJournal((prev: any) => ({
        ...prev,
        encaissements: (prev?.encaissements || []).map((it: any) =>
          it.id === selectedCancelPayment.id ? { ...it, statut: "annule" } : it
        ),
      }));

      refreshJournal();
      if (selectedStudent) handleSelectStudent(selectedStudent);
      if (selectedHistoryDate) loadHistoryData(selectedHistoryDate);
      loadPeriodData();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erreur lors de l'annulation", description: String(err) });
    }
  };

  // Historiques Antérieurs State
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  });
  const [historyJournal, setHistoryJournal] = useState<any>({
    total_general: 0,
    total_especes: 0,
    total_mobile: 0,
    total_cheque_virement: 0,
    encaissements: [],
  });
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState("");
  const [searchToday, setSearchToday] = useState("");

  // Actualisation automatique depuis la plateforme bancaire
  const [bankState, setBankState] = useState<any>(null);
  const [bankTxStudent, setBankTxStudent] = useState<any[]>([]);
  const [lastAutoRefresh, setLastAutoRefresh] = useState<Date | null>(null);

  const refreshJournal = async () => {
    try {
      const [journalData, finStats] = await Promise.all([
        apiClient.getJournalCaisse(),
        apiClient.getFinanceStats().catch(() => null),
      ]);
      if (journalData) {
        setJournal(journalData);
        const totalCumulePaiements =
          journalData?.fond_de_caisse !== undefined
            ? Number(journalData.fond_de_caisse)
            : Number(finStats?.paye ?? finStats?.total_recouvrement ?? journalData?.total_general ?? 0);
        setFondDeCaisse(totalCumulePaiements);
      }
    } catch (e) {
      console.warn("Failed to fast-refresh journal:", e);
    }
  };

  const loadData = async (options?: { forceStudents?: boolean }) => {
    setLoading(true);
    try {
      const shouldLoadStudents = options?.forceStudents || students.length === 0;
      const shouldLoadClasses = classes.length === 0;
      const [studList, clsList, journalData, tarifsData, finStats] = await Promise.all([
        shouldLoadStudents ? apiClient.getStudents().catch(() => null) : Promise.resolve(null),
        shouldLoadClasses ? apiClient.getClasses().catch(() => null) : Promise.resolve(null),
        apiClient.getJournalCaisse(),
        apiClient.getTransportZones().catch(() => null),
        apiClient.getFinanceStats().catch(() => null),
      ]);
      if (studList) setStudents(studList);
      if (clsList) setClasses(clsList);
      if (journalData) setJournal(journalData);

      // Le Fond de Caisse est la somme cumulée de TOUS les paiements effectués (scolarité, cantine, car / transport, etc.)
      const totalCumulePaiements = 
        journalData?.fond_de_caisse !== undefined 
          ? Number(journalData.fond_de_caisse) 
          : Number(finStats?.paye ?? finStats?.total_recouvrement ?? journalData?.total_general ?? 0);
      setFondDeCaisse(totalCumulePaiements);

      if (tarifsData) {
        setOfficialTarifs({
          cantineMensuel: Number(tarifsData.cantine?.mensuel) || 15000,
          transportZones: tarifsData.zones || [],
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les données de la caisse.",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryData = async (dateStr: string) => {
    setLoadingHistory(true);
    try {
      const data = await apiClient.getJournalCaisse({ date_journal: dateStr });
      setHistoryJournal(
        data || { nb_encaissements: 0, total_general: 0, encaissements: [] },
      );
    } catch {
      setHistoryJournal({
        nb_encaissements: 0,
        total_general: 0,
        encaissements: [],
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  // ─── HISTORIQUES PÉRIODIQUES STATE & METHODS ──────────────────────────────
  const [periodDebut, setPeriodDebut] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [periodFin, setPeriodFin] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [periodMotif, setPeriodMotif] = useState<string>("all");
  const [periodMode, setPeriodMode] = useState<string>("all");
  const [periodPreset, setPeriodPreset] = useState<string>("month");
  const [periodData, setPeriodData] = useState<any>({
    total_general: 0,
    total_especes: 0,
    total_mobile: 0,
    total_cheque_virement: 0,
    nb_encaissements: 0,
    ventilations: {},
    encaissements: [],
  });
  const [loadingPeriod, setLoadingPeriod] = useState(false);
  const [searchPeriod, setSearchPeriod] = useState("");

  const applyPeriodPreset = (preset: string) => {
    setPeriodPreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (preset === "today") {
      setPeriodDebut(todayStr);
      setPeriodFin(todayStr);
      loadPeriodData(todayStr, todayStr, periodMotif, periodMode);
    } else if (preset === "week") {
      const w = new Date();
      w.setDate(w.getDate() - 7);
      const wStr = w.toISOString().split("T")[0];
      setPeriodDebut(wStr);
      setPeriodFin(todayStr);
      loadPeriodData(wStr, todayStr, periodMotif, periodMode);
    } else if (preset === "month") {
      const mStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      setPeriodDebut(mStr);
      setPeriodFin(todayStr);
      loadPeriodData(mStr, todayStr, periodMotif, periodMode);
    } else if (preset === "prev_month") {
      const pm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const pmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const pmStr = pm.toISOString().split("T")[0];
      const pmEndStr = pmEnd.toISOString().split("T")[0];
      setPeriodDebut(pmStr);
      setPeriodFin(pmEndStr);
      loadPeriodData(pmStr, pmEndStr, periodMotif, periodMode);
    } else if (preset === "t1") {
      const y = now.getMonth() < 7 ? now.getFullYear() - 1 : now.getFullYear();
      const t1Start = `${y}-09-01`;
      const t1End = `${y}-11-30`;
      setPeriodDebut(t1Start);
      setPeriodFin(t1End);
      loadPeriodData(t1Start, t1End, periodMotif, periodMode);
    } else if (preset === "t2") {
      const y = now.getMonth() < 7 ? now.getFullYear() - 1 : now.getFullYear();
      const t2Start = `${y}-12-01`;
      const t2End = `${y + 1}-02-28`;
      setPeriodDebut(t2Start);
      setPeriodFin(t2End);
      loadPeriodData(t2Start, t2End, periodMotif, periodMode);
    } else if (preset === "t3") {
      const y = now.getMonth() < 7 ? now.getFullYear() : now.getFullYear() + 1;
      const t3Start = `${y}-03-01`;
      const t3End = `${y}-06-30`;
      setPeriodDebut(t3Start);
      setPeriodFin(t3End);
      loadPeriodData(t3Start, t3End, periodMotif, periodMode);
    } else if (preset === "year") {
      const y = now.getMonth() < 7 ? now.getFullYear() - 1 : now.getFullYear();
      const yStart = `${y}-08-01`;
      const yEnd = `${y + 1}-07-31`;
      setPeriodDebut(yStart);
      setPeriodFin(yEnd);
      loadPeriodData(yStart, yEnd, periodMotif, periodMode);
    }
  };

  const loadPeriodData = async (
    start: string = periodDebut,
    end: string = periodFin,
    motif: string = periodMotif,
    mode: string = periodMode
  ) => {
    setLoadingPeriod(true);
    try {
      const data = await apiClient.getJournalCaisse({
        date_debut: start,
        date_fin: end,
        motif: motif === "all" ? undefined : motif,
        mode: mode === "all" ? undefined : mode,
      });
      setPeriodData(
        data || {
          total_general: 0,
          total_especes: 0,
          total_mobile: 0,
          total_cheque_virement: 0,
          nb_encaissements: 0,
          ventilations: {},
          encaissements: [],
        }
      );
    } catch {
      setPeriodData({
        total_general: 0,
        total_especes: 0,
        total_mobile: 0,
        total_cheque_virement: 0,
        nb_encaissements: 0,
        ventilations: {},
        encaissements: [],
      });
      toast({
        variant: "destructive",
        title: "Erreur de chargement",
        description: "Impossible de récupérer l'historique pour la période choisie.",
      });
    } finally {
      setLoadingPeriod(false);
    }
  };

  // Export Excel de la période sélectionnée
  const exportPeriodicExcel = () => {
    try {
      const items = consolidateJournalItems(periodData?.encaissements || []);
      const filtered = items.filter((item: any) => {
        if (!searchPeriod.trim()) return true;
        const q = searchPeriod.toLowerCase();
        return (
          (item.eleve_nom || "").toLowerCase().includes(q) ||
          (item.numero_recu || "").toLowerCase().includes(q) ||
          (item.matricule || "").toLowerCase().includes(q) ||
          (item.type || "").toLowerCase().includes(q) ||
          (item.mode || "").toLowerCase().includes(q)
        );
      });

      if (!filtered || filtered.length === 0) {
        toast({
          variant: "destructive",
          title: "Aucune donnée",
          description: "Aucun versement trouvé pour la période sélectionnée.",
        });
        return;
      }

      const totalPeriod = filtered.reduce((s: number, i: any) => s + (Number(i.montant) || 0), 0);

      const excelRows = filtered.map((item: any, index: number) => ({
        "N°": index + 1,
        "Date": item.date || "",
        "Heure": item.heure || "",
        "N° Reçu": item.numero_recu || "",
        "Matricule": item.matricule || "N/A",
        "Élève (Nom & Prénoms)": item.eleve_nom || "Inconnu",
        "Classe": item.classe || "",
        "Motif / Service": item.type || "Scolarité",
        "Mode de Paiement": item.mode || "Espèces",
        "Montant (FCFA)": Number(item.montant) || 0,
        "N° Transaction / Réf": item.numero_transaction || "N/A",
        "Statut": item.statut || "Validé",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelRows);

      ws["!cols"] = [
        { wch: 6 },
        { wch: 12 },
        { wch: 10 },
        { wch: 16 },
        { wch: 14 },
        { wch: 28 },
        { wch: 12 },
        { wch: 20 },
        { wch: 16 },
        { wch: 16 },
        { wch: 20 },
        { wch: 10 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Journal Périodique");
      const filename = `Journal_Caisse_${periodDebut}_au_${periodFin}.xlsx`;
      XLSX.writeFile(wb, filename);

      toast({
        title: "Export Excel Réussi !",
        description: `Le fichier "${filename}" (${filtered.length} opérations - ${formatCurrency(totalPeriod)}) a été téléchargé.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur Export Excel",
        description: String(err),
      });
    }
  };

  // Export & Impression PDF Officiel de la période
  const exportPeriodicPDF = () => {
    try {
      const items = consolidateJournalItems(periodData?.encaissements || []);
      const filtered = items.filter((item: any) => {
        if (!searchPeriod.trim()) return true;
        const q = searchPeriod.toLowerCase();
        return (
          (item.eleve_nom || "").toLowerCase().includes(q) ||
          (item.numero_recu || "").toLowerCase().includes(q) ||
          (item.matricule || "").toLowerCase().includes(q) ||
          (item.type || "").toLowerCase().includes(q) ||
          (item.mode || "").toLowerCase().includes(q)
        );
      });

      if (!filtered || filtered.length === 0) {
        toast({
          variant: "destructive",
          title: "Aucune donnée",
          description: "Aucun versement trouvé pour la période sélectionnée.",
        });
        return;
      }

      const ecoleName = getEcoleCourante()?.name || "Groupe Scolaire Hînneh";
      const logoUrl = getEcoleCourante()?.logo || "/images/hinneh_logo_20260507_234919.png";
      const totalPeriod = filtered.reduce((s: number, i: any) => s + (Number(i.montant) || 0), 0);
      const totalEspeces = periodData?.total_especes || 0;
      const totalMobile = periodData?.total_mobile || 0;
      const totalBanque = periodData?.total_cheque_virement || 0;
      const userName = localStorage.getItem("username") || "Agent de caisse";
      const dateTirage = new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: TIMEZONE_GMT,
      });

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast({
          variant: "destructive",
          title: "Erreur Pop-up",
          description: "Veuillez autoriser les fenêtres pop-up pour imprimer le PDF.",
        });
        return;
      }

      const rowsHtml = filtered
        .map(
          (it: any, idx: number) => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 6px 8px; text-align: center; color: #64748b;">${idx + 1}</td>
          <td style="padding: 6px 8px; white-space: nowrap;">${it.date} ${it.heure ? `<span style="color:#94a3b8; font-size: 10px;">(${it.heure})</span>` : ""}</td>
          <td style="padding: 6px 8px; font-weight: bold; color: #1e293b;">${it.numero_recu || "REC-" + it.id}</td>
          <td style="padding: 6px 8px;"><strong>${it.eleve_nom}</strong> <span style="color:#64748b; font-size: 10px;">(${it.matricule || "N/A"}${it.classe ? ` • ${it.classe}` : ""})</span></td>
          <td style="padding: 6px 8px; text-transform: capitalize;">${it.type || "Scolarité"}</td>
          <td style="padding: 6px 8px; text-transform: capitalize; color: #475569;">${it.mode || "Espèces"}</td>
          <td style="padding: 6px 8px; text-align: right; font-weight: bold; color: #0f172a;">${Number(it.montant).toLocaleString("fr-FR")} FCFA</td>
        </tr>
      `
        )
        .join("");

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Bordereau Périodique de Caisse - ${periodDebut} au ${periodFin}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 10px; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; }
            .logo { max-height: 55px; max-width: 130px; object-fit: contain; }
            .school-title { font-size: 15px; font-weight: 800; text-transform: uppercase; color: #1e3a8a; }
            .doc-title { font-size: 15px; font-weight: bold; text-align: center; text-transform: uppercase; margin: 10px 0 4px 0; letter-spacing: 0.5px; }
            .period-badge { text-align: center; font-size: 12px; color: #475569; margin-bottom: 12px; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
            .stat-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; text-align: center; }
            .stat-label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 600; }
            .stat-value { font-size: 13px; font-weight: bold; color: #0f172a; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; }
            th { background: #f1f5f9; border-top: 1px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; padding: 6px 8px; font-size: 10px; text-transform: uppercase; color: #334155; font-weight: 700; text-align: left; }
            .signatures { display: flex; justify-content: space-between; margin-top: 24px; page-break-inside: avoid; }
            .sign-box { width: 45%; border: 1px dashed #94a3b8; border-radius: 6px; padding: 8px; height: 80px; }
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 12px; display: flex; gap: 8px; justify-content: flex-end;">
            <button onclick="window.print()" style="background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;">🖨️ Imprimer / Sauvegarder en PDF</button>
            <button onclick="window.close()" style="background: #64748b; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;">Fermer</button>
          </div>

          <div class="header">
            <div>
              <div class="school-title">${ecoleName}</div>
              <div style="font-size: 11px; color: #64748b;">Service Comptabilité & Caisse • Année Scolaire 2026-2027</div>
              <div style="font-size: 10px; color: #94a3b8;">Tiré par : ${userName} le ${dateTirage}</div>
            </div>
            <img src="${logoUrl}" class="logo" alt="Logo" onerror="this.style.display='none'" />
          </div>

          <div class="doc-title">Bordereau Récapitulatif Périodique des Encaissements</div>
          <div class="period-badge">Période du <strong>${periodDebut}</strong> au <strong>${periodFin}</strong> • (${filtered.length} versement(s) au total)</div>

          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-label">Total Encaissé</div>
              <div class="stat-value" style="color: #166534;">${Number(totalPeriod).toLocaleString("fr-FR")} FCFA</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Espèces</div>
              <div class="stat-value">${Number(totalEspeces).toLocaleString("fr-FR")} FCFA</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Mobile Money</div>
              <div class="stat-value">${Number(totalMobile).toLocaleString("fr-FR")} FCFA</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Banque / Virement</div>
              <div class="stat-value">${Number(totalBanque).toLocaleString("fr-FR")} FCFA</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="text-align: center; width: 30px;">#</th>
                <th>Date & Heure</th>
                <th>N° Reçu</th>
                <th>Élève (Matricule & Classe)</th>
                <th>Motif / Service</th>
                <th>Mode</th>
                <th style="text-align: right;">Montant</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr style="background: #f8fafc; font-weight: bold; border-top: 2px solid #0f172a;">
                <td colspan="6" style="padding: 8px; text-align: right; text-transform: uppercase; font-size: 11px;">Total Général Encaissé sur la Période :</td>
                <td style="padding: 8px; text-align: right; font-size: 12px; color: #166534;">${Number(totalPeriod).toLocaleString("fr-FR")} FCFA</td>
              </tr>
            </tfoot>
          </table>

          <div class="signatures">
            <div class="sign-box">
              <div style="font-size: 11px; font-weight: bold; color: #334155;">Le Caissier / L'Agent Comptable</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">(Signature & Cachet)</div>
            </div>
            <div class="sign-box" style="text-align: right;">
              <div style="font-size: 11px; font-weight: bold; color: #334155;">Le Chef d'Établissement / Direction</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">(Visa & Cachet Officiel)</div>
            </div>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erreur Génération PDF", description: String(err) });
    }
  };

  // ─── RECHERCHE AVANCÉE MULTICRITÈRES STATE & METHODS ───────────────────────
  const [advClasseId, setAdvClasseId] = useState<string>("all");
  const [advStatut, setAdvStatut] = useState<string>("all");
  const [advMode, setAdvMode] = useState<string>("all");
  const [advMotif, setAdvMotif] = useState<string>("all");
  const [advDateDebut, setAdvDateDebut] = useState<string>(() => {
    const now = new Date();
    const y = now.getMonth() < 7 ? now.getFullYear() - 1 : now.getFullYear();
    return `${y}-08-01`;
  });
  const [advDateFin, setAdvDateFin] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [advPeriodPreset, setAdvPeriodPreset] = useState<string>("year");
  const [advAllDates, setAdvAllDates] = useState<boolean>(false);
  const [advSearchText, setAdvSearchText] = useState<string>("");
  const [advData, setAdvData] = useState<any>({
    total_general: 0,
    total_especes: 0,
    total_mobile: 0,
    total_cheque_virement: 0,
    nb_encaissements: 0,
    ventilations: {},
    encaissements: [],
  });
  const [loadingAdv, setLoadingAdv] = useState<boolean>(false);
  const [advTableModalOpen, setAdvTableModalOpen] = useState<boolean>(false);

  const applyAdvPeriodPreset = (preset: string) => {
    setAdvPeriodPreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (preset === "all") {
      setAdvAllDates(true);
      loadAdvancedData(advClasseId, advStatut, advMode, advMotif, "", "", true, advSearchText);
      return;
    }

    setAdvAllDates(false);
    let start = "";
    let end = todayStr;

    if (preset === "today") {
      start = todayStr;
      end = todayStr;
    } else if (preset === "week") {
      const w = new Date();
      w.setDate(w.getDate() - 7);
      start = w.toISOString().split("T")[0];
    } else if (preset === "month") {
      start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    } else if (preset === "prev_month") {
      const pm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const pmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      start = pm.toISOString().split("T")[0];
      end = pmEnd.toISOString().split("T")[0];
    } else if (preset === "year") {
      const y = now.getMonth() < 7 ? now.getFullYear() - 1 : now.getFullYear();
      start = `${y}-08-01`;
      end = `${y + 1}-07-31`;
    }

    setAdvDateDebut(start);
    setAdvDateFin(end);
    loadAdvancedData(advClasseId, advStatut, advMode, advMotif, start, end, false, advSearchText);
  };

  const loadAdvancedData = async (
    classeId: string = advClasseId,
    statut: string = advStatut,
    mode: string = advMode,
    motif: string = advMotif,
    start: string = advDateDebut,
    end: string = advDateFin,
    allDates: boolean = advAllDates,
    search: string = advSearchText
  ) => {
    setLoadingAdv(true);
    try {
      const params: any = {
        statut: statut === "all" ? undefined : statut,
        mode: mode === "all" ? undefined : mode,
        motif: motif === "all" ? undefined : motif,
        classe_id: classeId === "all" ? undefined : classeId,
        search: search.trim() ? search.trim() : undefined,
      };

      if (allDates) {
        params.all_dates = true;
      } else {
        params.date_debut = start;
        params.date_fin = end;
      }

      const data = await apiClient.getJournalCaisse(params);
      setAdvData(
        data || {
          total_general: 0,
          total_especes: 0,
          total_mobile: 0,
          total_cheque_virement: 0,
          nb_encaissements: 0,
          ventilations: {},
          encaissements: [],
        }
      );
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur de recherche",
        description: "Impossible de récupérer les encaissements pour ces critères.",
      });
      setAdvData({
        total_general: 0,
        total_especes: 0,
        total_mobile: 0,
        total_cheque_virement: 0,
        nb_encaissements: 0,
        ventilations: {},
        encaissements: [],
      });
    } finally {
      setLoadingAdv(false);
    }
  };

  const handleResetAdvFilters = () => {
    const now = new Date();
    const y = now.getMonth() < 7 ? now.getFullYear() - 1 : now.getFullYear();
    const startYear = `${y}-08-01`;
    const todayStr = now.toISOString().split("T")[0];

    setAdvClasseId("all");
    setAdvStatut("all");
    setAdvMode("all");
    setAdvMotif("all");
    setAdvDateDebut(startYear);
    setAdvDateFin(todayStr);
    setAdvPeriodPreset("year");
    setAdvAllDates(false);
    setAdvSearchText("");

    loadAdvancedData("all", "all", "all", "all", startYear, todayStr, false, "");
  };

  const filteredAdvItems = useMemo(() => {
    let items = advData?.encaissements || [];

    if (advSearchText.trim()) {
      const q = advSearchText.toLowerCase().trim();
      items = items.filter((item: any) => {
        return (
          (item.eleve_nom || "").toLowerCase().includes(q) ||
          (item.numero_recu || "").toLowerCase().includes(q) ||
          (item.matricule || "").toLowerCase().includes(q) ||
          (item.classe || "").toLowerCase().includes(q) ||
          (item.type || "").toLowerCase().includes(q) ||
          (item.mode || "").toLowerCase().includes(q) ||
          (item.numero_transaction || "").toLowerCase().includes(q)
        );
      });
    }

    if (advClasseId && advClasseId !== "all") {
      items = items.filter((item: any) => {
        if (item.classe_id && String(item.classe_id) === String(advClasseId)) return true;
        const selectedCls = classes.find((c: any) => String(c.id) === String(advClasseId));
        const clsName = selectedCls?.name || selectedCls?.CE_LIBELLE || selectedCls?.libelle || "";
        if (clsName && (item.classe || "").toLowerCase() === clsName.toLowerCase()) return true;
        return false;
      });
    }

    if (advStatut && advStatut !== "all") {
      items = items.filter((item: any) => {
        if (advStatut === "paye") return item.statut === "paye" || item.statut === "valide";
        if (advStatut === "annule") return item.statut === "annule";
        if (advStatut === "en_attente") return item.statut === "en_attente";
        return item.statut === advStatut;
      });
    }

    if (advMode && advMode !== "all") {
      items = items.filter((item: any) => {
        const m = (item.mode || "").toLowerCase();
        if (advMode === "especes") return m.includes("espece");
        if (advMode === "coris_bank") return m.includes("coris");
        if (advMode === "mobile_money") return (m.includes("mobile") || m.includes("wave") || m.includes("orange") || m.includes("mtn") || m.includes("moov")) && !m.includes("coris");
        if (advMode === "cheque") return m.includes("cheque") || (m.includes("banque") && !m.includes("coris"));
        if (advMode === "virement") return m.includes("virement") && !m.includes("coris");
        return m === advMode.toLowerCase();
      });
    }

    return items;
  }, [advData, advSearchText, advClasseId, advStatut, advMode, classes]);

  const exportAdvancedExcel = () => {
    try {
      if (!filteredAdvItems || filteredAdvItems.length === 0) {
        toast({
          variant: "destructive",
          title: "Aucune donnée",
          description: "Aucun versement ne correspond à votre recherche pour l'export.",
        });
        return;
      }

      const totalAdv = filteredAdvItems
        .filter((i: any) => i.statut !== "annule")
        .reduce((s: number, i: any) => s + (Number(i.montant) || 0), 0);

      const excelRows = filteredAdvItems.map((item: any, index: number) => ({
        "N°": index + 1,
        "Date": item.date || "",
        "Heure": item.heure || "",
        "N° Reçu": item.numero_recu || "",
        "Matricule": item.matricule || "N/A",
        "Élève (Nom & Prénoms)": item.eleve_nom || "Inconnu",
        "Classe": item.classe || "",
        "Motif / Service": item.type || "Scolarité",
        "Mode de Paiement": item.mode || "Espèces",
        "Montant (FCFA)": Number(item.montant) || 0,
        "N° Transaction / Réf": item.numero_transaction || "N/A",
        "Statut": item.statut === "annule" ? "Annulé" : "Payé / Validé",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelRows);

      ws["!cols"] = [
        { wch: 6 },
        { wch: 12 },
        { wch: 10 },
        { wch: 18 },
        { wch: 14 },
        { wch: 30 },
        { wch: 14 },
        { wch: 22 },
        { wch: 18 },
        { wch: 16 },
        { wch: 22 },
        { wch: 14 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Recherche Avancée Caisse");
      const filename = `Recherche_Avancee_Caisse_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, filename);

      toast({
        title: "Export Excel Téléchargé !",
        description: `${filteredAdvItems.length} ligne(s) exportée(s) (${formatCurrency(totalAdv)}).`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur Export Excel",
        description: String(err),
      });
    }
  };

  const exportAdvancedPDF = () => {
    try {
      if (!filteredAdvItems || filteredAdvItems.length === 0) {
        toast({
          variant: "destructive",
          title: "Aucune donnée",
          description: "Aucun versement ne correspond à votre recherche.",
        });
        return;
      }

      const ecoleName = getEcoleCourante()?.name || "Groupe Scolaire Hînneh";
      const logoUrl = getEcoleCourante()?.logo || "/images/hinneh_logo_20260507_234919.png";
      const totalAdv = filteredAdvItems
        .filter((i: any) => i.statut !== "annule")
        .reduce((s: number, i: any) => s + (Number(i.montant) || 0), 0);
      const totalAnnule = filteredAdvItems
        .filter((i: any) => i.statut === "annule")
        .reduce((s: number, i: any) => s + (Number(i.montant) || 0), 0);
      const userName = localStorage.getItem("username") || "Agent de caisse";
      const dateTirage = new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: TIMEZONE_GMT,
      });

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast({
          variant: "destructive",
          title: "Erreur Pop-up",
          description: "Veuillez autoriser les fenêtres pop-up pour imprimer le PDF.",
        });
        return;
      }

      const selectedClassName =
        advClasseId === "all"
          ? "Toutes les classes"
          : classes.find((c: any) => String(c.id) === String(advClasseId))?.name || "Classe sélectionnée";

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <title>Rapport de Recherche Avancée - Caisse</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #1e293b; margin: 0; padding: 15px; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 12px; }
            .header-left { display: flex; align-items: center; gap: 12px; }
            .logo { height: 45px; object-fit: contain; }
            .school-title { font-size: 15px; font-weight: bold; color: #1e3a8a; }
            .doc-title { font-size: 13px; font-weight: bold; color: #334155; margin-top: 3px; }
            .meta { text-align: right; font-size: 9px; color: #64748b; }
            .filter-badges { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
            .filter-badge { font-size: 9px; font-weight: bold; color: #475569; }
            .summary-cards { display: flex; gap: 12px; margin-bottom: 15px; }
            .summary-card { flex: 1; padding: 8px 12px; border-radius: 6px; border: 1px solid #cbd5e1; background: #f1f5f9; }
            .summary-card.primary { background: #eff6ff; border-color: #93c5fd; }
            .summary-label { font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: bold; }
            .summary-value { font-size: 14px; font-weight: bold; color: #0f172a; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th { background-color: #1e3a8a; color: #ffffff; text-align: left; padding: 6px 8px; font-size: 9px; text-transform: uppercase; font-weight: bold; border: 1px solid #1e3a8a; }
            td { padding: 5px 8px; border: 1px solid #cbd5e1; font-size: 9px; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .badge-cancelled { color: #dc2626; font-weight: bold; text-decoration: line-through; }
            .badge-paid { color: #16a34a; font-weight: bold; }
            .footer { margin-top: 15px; display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              <img src="${logoUrl}" alt="Logo" class="logo" onerror="this.style.display='none'"/>
              <div>
                <div class="school-title">${ecoleName}</div>
                <div class="doc-title">RAPPORT DE RECHERCHE AVANCÉE — CAISSE</div>
              </div>
            </div>
            <div class="meta">
              <div>Édité par : <strong>${userName}</strong></div>
              <div>Date : ${dateTirage}</div>
            </div>
          </div>

          <div class="filter-badges">
            <span class="filter-badge">Classe : <strong>${selectedClassName}</strong></span>
            <span class="filter-badge">Mode : <strong>${advMode === "all" ? "Tous les modes" : advMode === "coris_bank" ? "Coris Bank" : advMode === "especes" ? "Espèces" : advMode === "mobile_money" ? "Mobile Money" : advMode === "cheque" ? "Chèque / Banque" : advMode}</strong></span>
            <span class="filter-badge">Statut : <strong>${advStatut === "all" ? "Tous les statuts" : advStatut === "paye" ? "Payé / Validé" : advStatut === "annule" ? "Annulé" : advStatut}</strong></span>
            <span class="filter-badge">Motif : <strong>${advMotif === "all" ? "Tous les motifs" : advMotif}</strong></span>
            <span class="filter-badge">Période : <strong>${advAllDates ? "Tout l'historique" : `${advDateDebut} au ${advDateFin}`}</strong></span>
          </div>

          <div class="summary-cards">
            <div class="summary-card primary">
              <div class="summary-label">Total Encaissé (Validé)</div>
              <div class="summary-value" style="color: #15803d;">${formatCurrency(totalAdv)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Nombre de Reçus / Versements</div>
              <div class="summary-value">${filteredAdvItems.length}</div>
            </div>
            ${totalAnnule > 0 ? `
            <div class="summary-card" style="background:#fee2e2; border-color:#fca5a5;">
              <div class="summary-label" style="color:#b91c1c;">Montant Annulé</div>
              <div class="summary-value" style="color:#b91c1c;">${formatCurrency(totalAnnule)}</div>
            </div>
            ` : ""}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 25px;">N°</th>
                <th style="width: 75px;">Date & Heure</th>
                <th style="width: 100px;">N° Reçu</th>
                <th style="width: 75px;">Matricule</th>
                <th>Élève (Nom & Prénoms)</th>
                <th style="width: 70px;">Classe</th>
                <th style="width: 80px;">Motif</th>
                <th style="width: 80px;">Mode</th>
                <th style="width: 80px;" class="text-right">Montant</th>
                <th style="width: 60px;" class="text-center">Statut</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAdvItems.map((item: any, idx: number) => `
                <tr>
                  <td class="text-center">${idx + 1}</td>
                  <td>${getDisplayPaymentDate(item)} ${item.heure ? `à ${item.heure}` : ""}</td>
                  <td style="font-weight: bold; color: #1e3a8a;">${item.numero_recu || "N/A"}</td>
                  <td>${item.matricule || "N/A"}</td>
                  <td style="font-weight: 600;">${item.eleve_nom || "Inconnu"}</td>
                  <td>${item.classe || "N/A"}</td>
                  <td>${item.type || "Scolarité"}</td>
                  <td>${item.mode || "Espèces"}</td>
                  <td class="text-right ${item.statut === "annule" ? "badge-cancelled" : "badge-paid"}">
                    ${formatCurrency(item.montant)}
                  </td>
                  <td class="text-center">
                    <span class="${item.statut === "annule" ? "badge-cancelled" : "badge-paid"}">
                      ${item.statut === "annule" ? "Annulé" : "Payé"}
                    </span>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="footer">
            <span>HINNEH ÉDUCATION — Système de Gestion Intégrée</span>
            <span>Document comptable officiel généré électroniquement</span>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur Impression PDF",
        description: String(err),
      });
    }
  };

  const loadBankState = async () => {
    try {
      setBankState(await apiClient.getBankSchedulerState());
    } catch {
      setBankState(null);
    }
  };

  /**
   * Échéancier de repli quand l'élève n'a pas encore de tranches enregistrées en
   * base : les montants sont lus dans la Grille Tarifaire Officielle de l'école,
   * à défaut dans les Frais d'Écolage de l'Économat. Si aucune des deux sources
   * ne couvre la classe, on renvoie une liste vide — le guichet l'affiche
   * explicitement au lieu de proposer un montant arbitraire.
   */
  const echeancesDepuisGrille = (student: any, existingPayments?: any[]) => {
    const clsName = resolveStudentClassName(student, classes);
    const pmts = existingPayments || studentPayments || [];
    const scolPaymentsTotal = (Array.isArray(pmts) ? pmts : []).reduce((acc: number, p: any) => {
      const pId = p.eleve_id || p.eleveId || p.eleve?.id;
      const pMat = p.matricule || p.eleve?.matricule;
      const match = (student.id && String(pId) === String(student.id)) || (student.matricule && pMat && String(pMat).trim().toLowerCase() === String(student.matricule).trim().toLowerCase());
      if (!match) return acc;
      const pt = String(p.type || p.motif || "").toLowerCase();
      if (pt.includes("cant") || pt.includes("trans") || pt.includes("car") || pt.includes("kit") || pt.includes("tenue") || pt.includes("uniforme") || pt.includes("fourniture") || pt.includes("exam") || pt.includes("anglais") || pt.includes("informatique") || pt.includes("divers")) {
        return acc;
      }
      return acc + Number(p.montant || 0);
    }, 0);

    const totalDepot = scolPaymentsTotal > 0 ? scolPaymentsTotal : Number(student.AU_TOTALDEPOT || 0);

    const parsedNiv = parseNiveau(clsName);
    const isMatOrPrim = parsedNiv.cycle === "maternelle" || parsedNiv.cycle === "primaire";

    const resolu = resolveEcheancierEleve(
      clsName,
      isMatOrPrim ? "TOUS" : (student.statut_orientation || student.statutOrientation || "AFF"),
      student.typeInscription || student.type_inscription || "inscription",
      Boolean(student.prise_en_charge || student.priseEnCharge),
      totalDepot,
      student.ecole_id || student.schoolId,
      student.ET_CODEETABLISSEMENT || student.codeEtablissement,
      student.ET_VILLE || student.city || student.ville,
    );
    return {
      source: resolu.source,
      label: resolu.label,
      echeances: resolu.echeances.map((t, idx) => ({
        id: idx + 1,
        eleve_id: student.id,
        libelle: t.rubric,
        montant_prevu: t.amount,
        montant_paye: t.paid,
        statut: t.rest === 0 ? "paye" : t.paid > 0 ? "partiel" : "non_paye",
        service_type: "scolarite",
        date_echeance: "2026-10-05",
      })),
    };
  };

  /**
   * Recharge silencieusement l'échéancier de l'élève : les versements réglés à la
   * banque et rapprochés automatiquement réduisent le montant restant à payer.
   */
  const refreshStudentDues = async (
    studentId: number | string,
    silent = true,
  ) => {
    try {
      const [echSummary, qCheck, bankTxs, payments] = await Promise.all([
        apiClient.getStudentEcheancierSummary(studentId),
        apiClient.checkQuittusEligibility(studentId),
        apiClient
          .getBankTransactions({ eleve_id: Number(studentId), limit: 50 })
          .catch(() => []),
        apiClient.getPayments({ eleve_id: Number(studentId) }).catch(() => []),
      ]);
      setStudentPayments(payments || []);
      let echeances = echSummary.echeances || [];
      if (echeances.length > 0) {
        setEcheancierOrigine({ source: "eleve", label: "" });
      } else if (studentId) {
        const student = students.find((s) => String(s.id) === String(studentId));
        const fallback = student
          ? echeancesDepuisGrille(student, payments)
          : { source: "aucune" as TrancheSource, label: "", echeances: [] };
        echeances = fallback.echeances;
        setEcheancierOrigine({ source: fallback.source, label: fallback.label });
      }
      setStudentEcheances(echeances);
      setQuittusCheck(qCheck);
      setBankTxStudent(bankTxs || []);
      setLastAutoRefresh(new Date());

      // Réaligne le montant proposé sur le reste réellement dû
      setSelectedEcheanceIds((prevIds) => {
        const stillDue = prevIds.filter((id) => {
          const item = echeances.find((e: any) => e.id === id);
          return (
            item && Number(item.montant_prevu) - Number(item.montant_paye) > 0
          );
        });
        const ids =
          stillDue.length > 0
            ? stillDue
            : (() => {
                const firstUnpaid = echeances.find(
                  (e: any) => e.statut !== "paye",
                );
                return firstUnpaid ? [firstUnpaid.id] : [];
              })();

        if (motif === "scolarite" && !isCustomMontantRef.current) {
          const reste = echeances
            .filter((e: any) => ids.includes(e.id))
            .reduce(
              (sum: number, item: any) =>
                sum + (Number(item.montant_prevu) - Number(item.montant_paye)),
              0,
            );
          setMontantEncaissement(reste > 0 ? String(reste) : "");
        }
        return ids;
      });
    } catch {
      if (!silent) {
        setStudentEcheances([]);
        setQuittusCheck(null);
      }
    }
  };

  useEffect(() => {
    loadData();
    loadHistoryData(selectedHistoryDate);
    loadBankState();
    // La Grille Tarifaire Officielle sert de référence dès qu'un élève n'a pas
    // encore d'échéancier enregistré en base.
    loadGrillePresets();
    // Fiches établissement : en-tête des reçus (nom, adresse, téléphones, logo).
    loadEcoles();
  }, []);

  // Traiter les paramètres d'URL (eleve_id, motif)
  useEffect(() => {
    if (students.length === 0) return;

    const eleveId = searchParams.get("eleve_id");
    const motifParam = searchParams.get("motif");

    if (eleveId) {
      const student = students.find((s) => String(s.id) === String(eleveId));
      if (student) {
        handleSelectStudent(student);
      } else {
        toast({
          variant: "destructive",
          title: "Élève non trouvé",
          description: `Aucun élève avec l'ID ${eleveId}`,
        });
      }
    }

    if (motifParam) {
      const validMotifs = [
        "scolarite",
        "inscription",
        "quitte",
        "cantine",
        "transport",
        "uniforme",
        "autre",
      ];
      if (validMotifs.includes(motifParam)) {
        handleMotifChange(motifParam);
      }
    }
  }, [students, searchParams]);

  // Rafraîchissement périodique des montants dus (paiements effectués à la banque)
  useEffect(() => {
    if (!selectedStudent) return;
    const interval = setInterval(() => {
      refreshStudentDues(selectedStudent.id);
      loadBankState();
    }, 45000);
    return () => clearInterval(interval);
  }, [selectedStudent?.id, motif]);

  // When a student is selected, fetch their active Échéancier and Quittus check
  const handleSelectStudent = async (student: any) => {
    setSelectedStudent(student);
    setSearchStudent(
      `${student.lastName || student.nom || ""} ${student.firstName || student.prenom || ""} (${student.matricule || ""})`.trim(),
    );
    setSelectedEcheanceIds([]);
    setMontantEncaissement("");
    markCustomMontant(false);
    setBankTxStudent([]);

    // Auto-detect gender for tenues
    const sGender = String(student.gender || student.genre || "").toUpperCase();
    if (sGender === "M" || sGender === "GARCON" || sGender === "HOMME") {
      setCaisseTenueGenre("M");
    } else if (sGender === "S" || sGender === "F" || sGender === "FILLE" || sGender === "FEMME") {
      setCaisseTenueGenre("S");
    } else {
      setCaisseTenueGenre("tous");
    }

    // Auto-detect cycle / niveau for tenues
    const cls = resolveStudentClassName(student, classes).toUpperCase();
    if (cls.includes("MAT") || cls.includes("PS") || cls.includes("MS") || cls.includes("GS") || cls.includes("SECTION")) {
      setCaisseTenueCycle("Maternelle");
    } else if (cls.includes("CP") || cls.includes("CE") || cls.includes("CM") || cls.includes("PRIM")) {
      setCaisseTenueCycle("Primaire");
    } else if (cls.includes("2NDE") || cls.includes("1ERE") || cls.includes("TLE") || cls.includes("TERM") || cls.includes("LYCEE") || cls.includes("2ND CYCLE")) {
      setCaisseTenueCycle("Collège 2nd cycle");
    } else if (cls.includes("6") || cls.includes("5") || cls.includes("4") || cls.includes("3") || cls.includes("COLLEGE") || cls.includes("1ER CYCLE")) {
      setCaisseTenueCycle("Collège");
    } else {
      setCaisseTenueCycle("tous");
    }

    try {
      const [echSummary, qCheck, bankTxs, payments] = await Promise.all([
        apiClient.getStudentEcheancierSummary(student.id),
        apiClient.checkQuittusEligibility(student.id),
        apiClient
          .getBankTransactions({ eleve_id: Number(student.id), limit: 50 })
          .catch(() => []),
        apiClient.getPayments({ eleve_id: Number(student.id) }).catch(() => []),
      ]);
      setStudentPayments(payments || []);
      let activeEcheances = echSummary?.echeances || [];
      if (activeEcheances.length > 0) {
        setEcheancierOrigine({ source: "eleve", label: "" });
      } else {
        const fallback = echeancesDepuisGrille(student, payments);
        activeEcheances = fallback.echeances;
        setEcheancierOrigine({ source: fallback.source, label: fallback.label });
      }
      setStudentEcheances(activeEcheances);
      setQuittusCheck(qCheck);
      setBankTxStudent(bankTxs || []);
      setLastAutoRefresh(new Date());

      // Détection automatique du tarif cantine de l'établissement de l'élève
      const officialCantineTarif = getOfficialServiceTarif(
        "cantine",
        student.ET_CODEETABLISSEMENT || student.ecole_id,
        student.ville,
        student.ecole_nom
      );
      const savedAttr = getStudentServiceAttribution(
        student.nom ? `${student.nom || ''} ${student.prenom || ''}`.trim() : undefined,
        student.matricule
      );

      const existingCantinePaidEch = activeEcheances.find(
        (e: any) => (e.service_type || "").toLowerCase().includes("cant") && Number(e.montant_paye || 0) > 0
      );
      const existingCantineEch = activeEcheances.find(
        (e: any) => (e.service_type || "").toLowerCase().includes("cant") && Number(e.montant_prevu || 0) > 0
      );
      const studentCantineTarif = existingCantinePaidEch
        ? Number(existingCantinePaidEch.montant_paye)
        : (savedAttr.cantineTarif && Number(savedAttr.cantineTarif) > 0)
        ? Number(savedAttr.cantineTarif)
        : (existingCantineEch
            ? Number(existingCantineEch.montant_prevu)
            : (Number(student.tarif_cantine || student.montant_cantine || 0) > 0 ? Number(student.tarif_cantine || student.montant_cantine) : officialCantineTarif));
      setCantineMensuelTarif(studentCantineTarif);

      // Détection automatique du tarif transport de l'établissement de l'élève
      const officialTransportTarif = getOfficialServiceTarif(
        "transport",
        student.ET_CODEETABLISSEMENT || student.ecole_id,
        student.ville,
        student.ecole_nom
      );
      const existingTransportPaidEch = activeEcheances.find(
        (e: any) => ((e.service_type || "").toLowerCase().includes("trans") || (e.service_type || "").toLowerCase().includes("car")) && Number(e.montant_paye || 0) > 0
      );
      const existingTransportEch = activeEcheances.find(
        (e: any) => ((e.service_type || "").toLowerCase().includes("trans") || (e.service_type || "").toLowerCase().includes("car")) && Number(e.montant_prevu || 0) > 0
      );
      const studentTransportTarif = existingTransportPaidEch
        ? Number(existingTransportPaidEch.montant_paye)
        : (savedAttr.transportTarif && Number(savedAttr.transportTarif) > 0)
        ? Number(savedAttr.transportTarif)
        : (existingTransportEch
            ? Number(existingTransportEch.montant_prevu)
            : (Number(student.tarif_transport || student.montant_transport || student.transport_tarif || student.zone_tarif || 0) > 0
                ? Number(student.tarif_transport || student.montant_transport || student.transport_tarif || student.zone_tarif)
                : officialTransportTarif));
      setTransportMensuelTarif(studentTransportTarif);
      setPackTransportZoneTarif(studentTransportTarif);

      // Auto-select first unpaid tranche for scolarité
      const firstUnpaidScolarite = activeEcheances.find(
        (e: any) => (e.service_type || "scolarite") === "scolarite" && e.statut !== "paye",
      );
      if (firstUnpaidScolarite) {
        setSelectedEcheanceIds([firstUnpaidScolarite.id]);
        const reste =
          Number(firstUnpaidScolarite.montant_prevu) - Number(firstUnpaidScolarite.montant_paye);
        setMontantEncaissement(String(reste));
      } else {
        setSelectedEcheanceIds([]);
        setMontantEncaissement("");
      }
    } catch (err) {
      const fallback = echeancesDepuisGrille(student, studentPayments);
      setStudentEcheances(fallback.echeances);
      setEcheancierOrigine({ source: fallback.source, label: fallback.label });
      const firstUnpaid = fallback.echeances.find((e: any) => (e.service_type || "scolarite") === "scolarite" && e.statut !== "paye");
      if (firstUnpaid) {
        setSelectedEcheanceIds([firstUnpaid.id]);
        setMontantEncaissement(String(Number(firstUnpaid.montant_prevu) - Number(firstUnpaid.montant_paye)));
      } else {
        // Ni échéancier en base, ni tarif dans la grille : on ne propose aucun montant.
        setSelectedEcheanceIds([]);
        setMontantEncaissement("");
      }
      setQuittusCheck(null);
    }
  };

  // Toggle tranche selection for scolarité
  const toggleEcheanceSelection = (ech: any) => {
    let nextIds = [...selectedEcheanceIds];
    if (nextIds.includes(ech.id)) {
      nextIds = nextIds.filter((id) => id !== ech.id);
    } else {
      nextIds.push(ech.id);
    }
    setSelectedEcheanceIds(nextIds);
    markCustomMontant(false);

    // Sum up remaining due amounts strictly for selected scolarite tranches
    const totalSelectedReste = studentEcheances
      .filter((e) => nextIds.includes(e.id) && (e.service_type || "scolarite") === "scolarite")
      .reduce(
        (sum, item) =>
          sum + Math.max(0, Number(item.montant_prevu || 0) - Number(item.montant_paye || 0)),
        0,
      );

    if (totalSelectedReste > 0) {
      setMontantEncaissement(String(totalSelectedReste));
    }
  };

  const selectAllScolariteTranches = () => {
    const unpaidScol = studentEcheances.filter(
      (e: any) => (e.service_type || "scolarite") === "scolarite" && e.statut !== "paye" && e.statut !== "desabonne"
    );
    const allIds = unpaidScol.map((e: any) => e.id);
    setSelectedEcheanceIds(allIds);
    markCustomMontant(false);
    const totalDue = unpaidScol.reduce(
      (sum: number, e: any) => sum + Math.max(0, Number(e.montant_prevu || 0) - Number(e.montant_paye || 0)),
      0
    );
    setMontantEncaissement(String(totalDue > 0 ? totalDue : ""));
  };

  const deselectAllScolariteTranches = () => {
    setSelectedEcheanceIds([]);
    markCustomMontant(false);
    setMontantEncaissement("");
  };

  // Solde disponible planifié dans l'échéancier pour un service_type donné (cantine, transport,
  // uniforme, autre) — tout paiement de ce type est désormais obligatoirement adossé à une
  // tranche prévue à l'avance ; sans elle, l'encaissement est bloqué.
  const getSoldeDisponibleServiceType = (serviceType: string) => {
    const existing = studentEcheances
      .filter((e: any) => e.service_type === serviceType && e.statut !== "paye")
      .reduce((sum: number, item: any) => sum + Math.max(0, Number(item.montant_prevu || 0) - Number(item.montant_paye || 0)), 0);
    if (existing > 0) return existing;
    if (serviceType === "transport") {
      const u = transportMensuelTarif || packTransportZoneTarif || 18000;
      return 9 * u;
    }
    if (serviceType === "cantine") {
      const u = cantineMensuelTarif || 15000;
      return 9 * u;
    }
    return 0;
  };

  const soldeDisponibleMotifCourant = useMemo(() => {
    if (!["cantine", "transport"].includes(motif)) return null;
    return getSoldeDisponibleServiceType(motif);
  }, [motif, studentEcheances]);

  // Tranche "1er vers." de l'échéancier — support de la réforme Frais annexes / Frais d'inscription
  const premierVersementTranche = useMemo(() => {
    return studentEcheances.find((e: any) =>
      String(e.libelle || "").toLowerCase().trim().startsWith("1er vers"),
    );
  }, [studentEcheances]);

  // Calculs dynamiques pour le Pack Global (Tout Compris)
  const packScolariteDue = useMemo(() => {
    const tuitionEchs = studentEcheances.filter((e: any) => (e.service_type || "scolarite") === "scolarite");
    if (tuitionEchs.length > 0) {
      return tuitionEchs.reduce((sum: number, e: any) => sum + Math.max(0, Number(e.montant_prevu || 0) - Number(e.montant_paye || 0)), 0);
    }
    return Number(selectedStudent?.AU_SOLDECOMPTE || selectedStudent?.solde || 0);
  }, [studentEcheances, selectedStudent]);

  const packCantineDue = useMemo(() => {
    const cantineEchs = studentEcheances.filter((e: any) => e.service_type === "cantine");
    if (cantineEchs.length > 0) {
      const due = cantineEchs.reduce((sum: number, e: any) => sum + Math.max(0, Number(e.montant_prevu || 0) - Number(e.montant_paye || 0)), 0);
      if (due > 0) return due;
    }
    return packCantineMonths * (cantineMensuelTarif || officialTarifs.cantineMensuel || 15000);
  }, [studentEcheances, packCantineMonths, cantineMensuelTarif, officialTarifs.cantineMensuel]);

  const packTransportDue = useMemo(() => {
    const transEchs = studentEcheances.filter((e: any) => e.service_type === "transport");
    if (transEchs.length > 0) {
      const due = transEchs.reduce((sum: number, e: any) => sum + Math.max(0, Number(e.montant_prevu || 0) - Number(e.montant_paye || 0)), 0);
      if (due > 0) return due;
    }
    const unitTarif = transportMensuelTarif || packTransportZoneTarif || 18000;
    return packTransportMonths * unitTarif;
  }, [studentEcheances, packTransportMonths, transportMensuelTarif, packTransportZoneTarif]);

  const packTotalComputed = useMemo(() => {
    let tot = 0;
    if (packIncludeScolarite) tot += packScolariteDue;
    if (packIncludeCantine) tot += packCantineDue;
    if (packIncludeTransport) tot += packTransportDue;
    return tot;
  }, [packIncludeScolarite, packIncludeCantine, packIncludeTransport, packScolariteDue, packCantineDue, packTransportDue]);

  useEffect(() => {
    if (motif === "pack_global" && !isCustomMontantRef.current) {
      setMontantEncaissement(String(packTotalComputed > 0 ? packTotalComputed : 0));
    }
  }, [motif, packTotalComputed]);

  const currentStudentSchoolCode = useMemo(() => {
    const defaultSchool = getEcoleCourante();
    return (
      selectedStudent?.ET_CODEETABLISSEMENT ||
      selectedStudent?.code_etablissement ||
      selectedStudent?.ecole_id ||
      selectedStudent?.schoolId ||
      defaultSchool?.code ||
      defaultSchool?.id ||
      localStorage.getItem('user_school_code') ||
      undefined
    );
  }, [selectedStudent]);

  const currentStudentVille = useMemo(() => {
    return selectedStudent?.ville || selectedStudent?.city;
  }, [selectedStudent]);

  const fraisAnnexeTarif = useMemo(() => {
    if (!selectedStudent) return 0;
    const cls = (resolveStudentClassName(selectedStudent, classes) || "").toLowerCase();
    let cycle = "Collège 1er Cycle";
    if (cls.includes("mat") || cls.includes("ps") || cls.includes("ms") || cls.includes("gs") || cls.includes("section")) {
      cycle = "Maternelle";
    } else if (cls.includes("cp") || cls.includes("ce") || cls.includes("cm") || cls.includes("prim")) {
      cycle = "Primaire";
    } else if (cls.includes("2nd") || cls.includes("1ere") || cls.includes("1ère") || cls.includes("tle") || cls.includes("term") || cls.includes("lyc")) {
      cycle = "Collège 2nd Cycle";
    }
    return getOfficialFraisAnnexeTarifConfigured(cycle, cls, currentStudentSchoolCode, currentStudentVille);
  }, [selectedStudent, classes, currentStudentSchoolCode, currentStudentVille]);

  const fraisAnnexePaye = useMemo(() => {
    if (fraisAnnexeTarif <= 0) return true;
    return studentPayments.some(
      (p: any) => p.type === "frais_annexe" && p.status !== "annule",
    );
  }, [studentPayments, fraisAnnexeTarif]);

  const soldeFraisInscription = useMemo(() => {
    if (!premierVersementTranche) return 0;
    return Math.max(
      0,
      Number(premierVersementTranche.montant_prevu || 0) -
        Number(premierVersementTranche.montant_paye || 0),
    );
  }, [premierVersementTranche]);

  // Montant proposé automatiquement pour un motif donné (tarif officiel, solde des frais
  // d'inscription ou reste dû des tranches cochées). Renvoie null quand le motif n'a pas de
  // montant calculable ("autre") : dans ce cas on laisse le champ tel quel.
  const computeMontantAuto = (val: string = motif): string | null => {
    if (val === "inscription") return "50000";
    if (val === "quitte") return "10000";
    if (val === "cantine") {
      const u = cantineMensuelTarif || officialTarifs.cantineMensuel || 15000;
      if (optionCantineCaisse === "annuel") return String(9 * u);
      return optionCantineCaisse === "trimestriel" ? String(3 * u) : String(u);
    }
    if (val === "transport") {
      const u = transportMensuelTarif || packTransportZoneTarif || 18000;
      if (optionTransportCaisse === "annuel") return String(9 * u);
      return optionTransportCaisse === "trimestriel" ? String(3 * u) : String(u);
    }
    if (val === "uniforme" || val === "tenue") {
      const studentGenre = (selectedStudent?.gender || selectedStudent?.genre || "").toUpperCase();
      const isM = studentGenre === "M" || studentGenre === "GARCON" || studentGenre === "HOMME";
      const isS = studentGenre === "S" || studentGenre === "F" || studentGenre === "FILLE" || studentGenre === "FEMME";
      const targetGenre = isM ? "M" : isS ? "S" : undefined;

      const cls = (selectedStudent ? resolveStudentClassName(selectedStudent, classes) : "").toUpperCase();
      let targetCycle = "Collège";
      if (cls.includes("MAT") || cls.includes("PS") || cls.includes("MS") || cls.includes("GS") || cls.includes("SECTION")) {
        targetCycle = "Maternelle";
      } else if (cls.includes("CP") || cls.includes("CE") || cls.includes("CM") || cls.includes("PRIM")) {
        targetCycle = "Primaire";
      } else if (cls.includes("2NDE") || cls.includes("1ERE") || cls.includes("TLE") || cls.includes("TERM") || cls.includes("LYCEE") || cls.includes("2ND CYCLE")) {
        targetCycle = "Collège 2nd cycle";
      } else if (cls.includes("6") || cls.includes("5") || cls.includes("4") || cls.includes("3") || cls.includes("COLLEGE") || cls.includes("1ER CYCLE")) {
        targetCycle = "Collège";
      }

      const allTenues = getFraisDiversList(currentStudentSchoolCode, currentStudentVille).filter(x => (x.categorie === "tenue" || x.code.includes("tenue")) && x.actif);
      const match = allTenues.find(x => 
        (targetCycle ? (x.cycle === targetCycle || x.cycle === "tous") : true) &&
        (targetGenre ? (x.genre === targetGenre || x.genre === "tous") : true)
      ) || allTenues[0];

      return String(match ? match.montant : 15000);
    }
    if (val === "achat_divers" || val === "achats_divers") {
      const item = getFraisDiversList(currentStudentSchoolCode, currentStudentVille).find(x => (x.categorie === "achat_divers" || x.code === "achat_divers") && x.actif);
      return String(item ? item.montant : 5000);
    }
    if (val === "cours_anglais") {
      const item = getFraisDiversList(currentStudentSchoolCode, currentStudentVille).find(x => x.code === "cours_anglais" && x.actif);
      return String(item ? item.montant : 10000);
    }
    if (val === "cours_informatique") {
      const item = getFraisDiversList(currentStudentSchoolCode, currentStudentVille).find(x => x.code === "cours_informatique" && x.actif);
      return String(item ? item.montant : 15000);
    }
    if (val === "frais_divers") {
      const item = getFraisDiversList(currentStudentSchoolCode, currentStudentVille).find(x => x.categorie !== "tenue" && x.categorie !== "achat_divers" && x.code !== "cours_anglais" && x.code !== "cours_informatique" && x.actif);
      return String(item ? item.montant : 5000);
    }
    if (val === "pack_global" || val === "forfait_global") {
      return String(packTotalComputed > 0 ? packTotalComputed : "");
    }
    if (val === "frais_inscription")
      return soldeFraisInscription > 0 ? String(soldeFraisInscription) : "";
    if (val === "scolarite") {
      const totalSelectedReste = studentEcheances
        .filter((e) => selectedEcheanceIds.includes(e.id) && (e.service_type || "scolarite") === "scolarite")
        .reduce(
          (sum, item) =>
            sum + Math.max(0, Number(item.montant_prevu || 0) - Number(item.montant_paye || 0)),
          0,
        );
      return totalSelectedReste > 0 ? String(totalSelectedReste) : "";
    }
    return null;
  };

  // Handle motif change
  // Chaque motif est strictement isolé et ne mélange pas ses tranches avec un autre service.
  const handleMotifChange = (val: string) => {
    setMotif(val);

    if (val === "pack_global" || val === "forfait_global") {
      setSelectedEcheanceIds([]);
      if (!isCustomMontantRef.current) {
        setMontantEncaissement(String(packTotalComputed > 0 ? packTotalComputed : ""));
      }
    } else if (val === "scolarite") {
      const firstUnpaid = studentEcheances.find(
        (e: any) => (e.service_type || "scolarite") === "scolarite" && e.statut !== "paye",
      );
      if (firstUnpaid) {
        setSelectedEcheanceIds([firstUnpaid.id]);
        const reste = Math.max(0, Number(firstUnpaid.montant_prevu || 0) - Number(firstUnpaid.montant_paye || 0));
        if (!isCustomMontantRef.current) setMontantEncaissement(String(reste));
      } else {
        setSelectedEcheanceIds([]);
        if (!isCustomMontantRef.current) setMontantEncaissement("");
      }
    } else if (val === "cantine") {
      const cantineEchs = studentEcheances.filter((e: any) => e.service_type === "cantine" && e.statut !== "paye");
      const u = cantineMensuelTarif || officialTarifs.cantineMensuel || 15000;
      if (cantineEchs.length > 0) {
        setSelectedEcheanceIds([cantineEchs[0].id]);
        const due = Math.max(0, Number(cantineEchs[0].montant_prevu || 0) - Number(cantineEchs[0].montant_paye || 0));
        if (!isCustomMontantRef.current) {
          const base = due > 0 ? due : u;
          setMontantEncaissement(String(optionCantineCaisse === "annuel" ? 9 * u : (optionCantineCaisse === "trimestriel" ? 3 * u : base)));
        }
      } else {
        setSelectedEcheanceIds([]);
        if (!isCustomMontantRef.current) {
          setMontantEncaissement(String(optionCantineCaisse === "annuel" ? 9 * u : (optionCantineCaisse === "trimestriel" ? 3 * u : u)));
        }
      }
    } else if (val === "transport") {
      const transEchs = studentEcheances.filter((e: any) => e.service_type === "transport" && e.statut !== "paye");
      const unit = transportMensuelTarif || packTransportZoneTarif || 18000;
      if (transEchs.length > 0) {
        setSelectedEcheanceIds([transEchs[0].id]);
        const due = Math.max(0, Number(transEchs[0].montant_prevu || 0) - Number(transEchs[0].montant_paye || 0));
        if (!isCustomMontantRef.current) {
          const base = due > 0 ? due : unit;
          setMontantEncaissement(String(optionTransportCaisse === "annuel" ? 9 * unit : (optionTransportCaisse === "trimestriel" ? 3 * unit : base)));
        }
      } else {
        setSelectedEcheanceIds([]);
        if (!isCustomMontantRef.current) {
          setMontantEncaissement(String(optionTransportCaisse === "annuel" ? 9 * unit : (optionTransportCaisse === "trimestriel" ? 3 * unit : unit)));
        }
      }
    } else {
      setSelectedEcheanceIds([]);
    }

    if (val === "frais_inscription") {
      if (!fraisAnnexePaye) {
        toast({
          variant: "destructive",
          title: "⛔ Frais annexes non réglés",
          description:
            "Les frais annexes doivent être réglés en espèces (processus d'inscription) avant de pouvoir encaisser les frais d'inscription.",
        });
      }
      if (modePaiement === "especes") {
        setModePaiement("mobile_money");
      }
    }

    if (isCustomMontantRef.current) return;

    const auto = computeMontantAuto(val);
    if (auto !== null) setMontantEncaissement(auto);
  };

  const openReceiptModalForStudent = async (studentId?: number | string, item?: any) => {
    // 1. Resolve student info from all possible sources
    const targetId = studentId || item?.eleve_id || item?.eleve?.id;
    const targetMatricule = item?.matricule || item?.eleve?.matricule;
    const targetNom = item?.eleve_nom || item?.eleve?.nom;

    const matchedStudent = (students || []).find((s: any) =>
      (targetId && String(s.id) === String(targetId)) ||
      (targetMatricule && s.matricule && String(s.matricule).trim().toLowerCase() === String(targetMatricule).trim().toLowerCase()) ||
      (targetNom && `${s.firstName || s.prenom || ''} ${s.lastName || s.nom || ''}`.trim().toLowerCase() === String(targetNom).trim().toLowerCase())
    ) || (selectedStudent && (String(selectedStudent.id) === String(targetId) || selectedStudent.matricule === targetMatricule) ? selectedStudent : null);

    const effectiveStudentId = targetId || matchedStudent?.id || selectedStudent?.id;
    const effectiveMatricule = targetMatricule || matchedStudent?.matricule || selectedStudent?.matricule || "N/A";
    const effectiveNom = targetNom || `${matchedStudent?.nom || ''} ${matchedStudent?.prenom || ''}`.trim() || selectedStudent?.nom || "Élève Hînneh";

    const itemMontant =
      item?.montant !== undefined
        ? Number(item.montant)
        : item?.details_recu?.montant !== undefined
        ? Number(item.details_recu.montant)
        : undefined;

    const itemMotif =
      item?.type || item?.motif || item?.details_recu?.motif || undefined;

    // 2. Base receipt object from item so modal opens immediately without blocking
    const baseRecu = {
      eleve_id: effectiveStudentId,
      eleve_nom: effectiveNom,
      matricule: effectiveMatricule,
      id: item?.id || item?.paiement_id,
      paiement_id: item?.id || item?.paiement_id,
      eleve: {
        id: effectiveStudentId,
        prenom: matchedStudent?.prenom || matchedStudent?.firstName || effectiveNom,
        nom: matchedStudent?.nom || matchedStudent?.lastName || "",
        matricule: effectiveMatricule,
        classe: matchedStudent?.classe || matchedStudent?.niveau || item?.classe || "",
      },
      details_recu: {
        numero_recu: item?.numero_recu || item?.details_recu?.numero_recu || (effectiveStudentId ? `REC-${effectiveStudentId}` : `REC-${Date.now().toString().slice(-6)}`),
        montant: itemMontant !== undefined ? itemMontant : 0,
        motif: itemMotif || "Recu global recapitulatif",
        mode: item?.mode || item?.details_recu?.mode || "Espèces",
        numero_transaction: item?.numero_transaction || item?.details_recu?.numero_transaction || "N/A",
        caissier: item?.caissier_nom || item?.details_recu?.caissier || "Service Caisse Hînneh",
        annee_scolaire: item?.annee_scolaire || item?.details_recu?.annee_scolaire || "2026-2027",
        date_creation: item?.date_complete || item?.date || item?.details_recu?.date_creation || new Date().toISOString(),
        observation: item?.observation || item?.details_recu?.observation || "",
      },
      sub_items: item?.sub_items || [],
      is_combined: item?.isCombined || item?.is_combined || false,
    };

    setCurrentRecu(baseRecu);
    setOpenRecuModal(true);

    // 3. Enrich with complete recap data if student ID is available
    if (effectiveStudentId) {
      try {
        const recap = await apiClient.getRecuRecapitulatif(effectiveStudentId);
        if (recap) {
          setCurrentRecu((prev: any) => ({
            ...recap,
            ...prev,
            eleve_id: effectiveStudentId,
            eleve_nom: effectiveNom,
            matricule: effectiveMatricule,
            eleve: {
              ...(recap.eleve || {}),
              id: effectiveStudentId,
              prenom: matchedStudent?.prenom || recap.eleve?.prenom || effectiveNom,
              nom: matchedStudent?.nom || recap.eleve?.nom || "",
              matricule: effectiveMatricule,
            },
            details_recu: {
              ...(recap.details_recu || {}),
              numero_recu: item?.numero_recu || item?.details_recu?.numero_recu || recap.recu_numero || prev?.details_recu?.numero_recu,
              montant: itemMontant !== undefined ? itemMontant : (recap.total_general ?? prev?.details_recu?.montant),
              motif: itemMotif || prev?.details_recu?.motif || "Recu global recapitulatif",
              mode: item?.mode || item?.details_recu?.mode || recap.details_recu?.mode || prev?.details_recu?.mode || "Espèces",
              numero_transaction: item?.numero_transaction || item?.details_recu?.numero_transaction || recap.details_recu?.numero_transaction || "N/A",
              caissier: item?.caissier_nom || item?.details_recu?.caissier || recap.details_recu?.caissier || "Service Caisse Hînneh",
              annee_scolaire: item?.annee_scolaire || item?.details_recu?.annee_scolaire || recap.details_recu?.annee_scolaire || "2026-2027",
              date_creation: item?.date_complete || item?.date || item?.details_recu?.date_creation || prev?.details_recu?.date_creation || new Date().toISOString(),
              observation: item?.observation || item?.details_recu?.observation || prev?.details_recu?.observation || "",
            },
            ventilations: recap.ventilations || prev?.ventilations,
            echeances: recap.echeances || prev?.echeances,
            synthese_financiere: recap.synthese_financiere || prev?.synthese_financiere,
          }));
        }
      } catch (err) {
        console.warn("Recap fetch warning:", err);
      }
    }
  };

  // Submit Encaissement
  const handleEncaissementSubmit = async () => {
    if (!selectedStudent) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez sélectionner un élève.",
      });
      return;
    }
    if (!montantEncaissement || parseFloat(montantEncaissement) <= 0) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez saisir un montant d'encaissement valide.",
      });
      return;
    }
    if (!caisseOpen) {
      toast({
        variant: "destructive",
        title: "Caisse fermée",
        description:
          "La caisse est actuellement fermée. Veuillez l'ouvrir pour encaisser.",
      });
      return;
    }
    if (motif === "frais_inscription") {
      if (!fraisAnnexePaye) {
        toast({
          variant: "destructive",
          title: "⛔ Frais annexes non réglés",
          description:
            "Les frais annexes doivent être réglés en espèces avant d'encaisser les frais d'inscription.",
        });
        return;
      }
      if (modePaiement === "especes") {
        toast({
          variant: "destructive",
          title: "Mode de règlement invalide",
          description:
            "Les frais d'inscription doivent être réglés par dépôt (mobile money, banque, virement), pas en espèces.",
        });
        return;
      }
      if (parseFloat(montantEncaissement) > soldeFraisInscription) {
        toast({
          variant: "destructive",
          title: "Montant trop élevé",
          description: `Le solde restant dû des frais d'inscription est de ${formatCurrency(soldeFraisInscription)}.`,
        });
        return;
      }
    }
    if (["cantine", "transport"].includes(motif)) {
      const solde = getSoldeDisponibleServiceType(motif);
      if (solde > 0 && parseFloat(montantEncaissement) > solde) {
        toast({
          variant: "destructive",
          title: "Montant trop élevé",
          description: `Le solde planifié disponible pour "${motif}" est de ${formatCurrency(solde)}.`,
        });
        return;
      }
    }

    // Contrôle d'unicité et obligatoirité de l'ID de transaction pour Mobile Money & Coris Bank
    const isMobileOrCoris = [
      "mtn_money",
      "orange_money",
      "moov_money",
      "wave",
      "coris_bank",
      "mobile_money",
    ].includes(modePaiement);

    if (isMobileOrCoris) {
      const cleanTxId = (numTx || "").trim();
      if (!cleanTxId) {
        toast({
          variant: "destructive",
          title: "Numéro de transaction obligatoire",
          description: "La saisie de l'ID de transaction / référence est obligatoire pour tout règlement Mobile Money ou Coris Bank.",
        });
        return;
      }

      // Pré-vérification immédiate d'unicité dans le système
      try {
        const checkRes = await apiClient.checkTransactionId(cleanTxId);
        if (checkRes.exists && checkRes.paiement) {
          setConflictPaiement(checkRes.paiement);
          setOpenDuplicateModal(true);
          return;
        }
      } catch (chkErr) {
        console.warn("Pré-vérification de l'ID de transaction non bloquante:", chkErr);
      }
    }

    setSubmitting(true);
    try {
      // Préparation automatique et transparente des 9 mensualités (Septembre à Mai) dès le 1er paiement/abonnement
      if (motif === "cantine") {
        const u = cantineMensuelTarif || 15000;
        await apiClient.generateServiceTranches({
          eleve_id: Number(selectedStudent.id),
          service_type: "cantine",
          montant_mensuel: u,
        }).catch(() => {});
      } else if (motif === "transport") {
        const u = transportMensuelTarif || packTransportZoneTarif || 18000;
        await apiClient.generateServiceTranches({
          eleve_id: Number(selectedStudent.id),
          service_type: "transport",
          montant_mensuel: u,
        }).catch(() => {});
      }

      const targetEchIds = motif === "scolarite"
        ? (selectedEcheanceIds.length > 0 ? selectedEcheanceIds : undefined)
        : (motif === "pack_global" || motif === "forfait_global"
          ? studentEcheances
              .filter((e: any) => {
                const st = (e.service_type || "scolarite").toLowerCase();
                if (st === "scolarite" && !packIncludeScolarite) return false;
                if (st === "cantine" && !packIncludeCantine) return false;
                if (st === "transport" && !packIncludeTransport) return false;
                return e.statut !== "paye";
              })
              .map((e: any) => e.id)
          : undefined);

      const res = await apiClient.processCaisseEncaissement({
        eleve_id: selectedStudent.id,
        motif: motif,
        echeance_ids: (targetEchIds && targetEchIds.length > 0) ? targetEchIds : undefined,
        montant: parseFloat(montantEncaissement),
        mode: modePaiement,
        numero_transaction: numTx || undefined,
        observation: observation || undefined,
        caissier_nom:
          localStorage.getItem("user_full_name") ||
          `${localStorage.getItem("user_nom") || ""} ${localStorage.getItem("user_prenom") || ""}`.trim() ||
          localStorage.getItem("username") ||
          "Agent Caisse",
        annee_scolaire: "2026-2027",
      });

      toast({ title: "Encaissement Réussi !", description: res.message });

      const paidAmount = parseFloat(montantEncaissement);
      const studentNameDisplay =
        `${selectedStudent.nom || selectedStudent.lastName || ""} ${selectedStudent.prenom || selectedStudent.firstName || ""}`.trim() ||
        selectedStudent.name ||
        "Élève Hînneh";
      const studentClassDisplay = resolveStudentClassName(selectedStudent, classes);

      // 1. Mise à jour instantanée et optimiste du Journal (0 ms de latence)
      const optimisticTx = {
        id: res.paiement_id || res.id || Date.now(),
        numero_recu:
          res.numero_recu ||
          res.details_recu?.numero_recu ||
          `REC-${Date.now().toString().slice(-6)}`,
        eleve_id: selectedStudent.id,
        eleve_nom: studentNameDisplay,
        matricule: selectedStudent.matricule || "N/A",
        classe: studentClassDisplay,
        montant: paidAmount,
        mode: modePaiement,
        type: motif,
        statut: "paye",
        date: new Date().toISOString(),
        date_complete: new Date().toISOString(),
        numero_transaction: numTx || undefined,
        observation: observation || undefined,
        isCombined: false,
      };

      setJournal((prev: any) => ({
        ...prev,
        nb_encaissements: (Number(prev?.nb_encaissements) || 0) + 1,
        total_general: (Number(prev?.total_general) || 0) + paidAmount,
        fond_de_caisse: (Number(prev?.fond_de_caisse) || Number(fondDeCaisse) || 0) + paidAmount,
        encaissements: [optimisticTx, ...(prev?.encaissements || [])],
      }));
      setFondDeCaisse((prev) => prev + paidAmount);

      // Reset form
      setMontantEncaissement("");
      markCustomMontant(false);
      setNumTx("");
      setObservation("");
      setSelectedEcheanceIds([]);

      // 2. Ouvrir le reçu immédiatement avec les données du versement
      openReceiptModalForStudent(selectedStudent.id, res);

      // 3. Rafraîchissement direct et ciblé de l'élève et synchronisation en arrière-plan
      handleSelectStudent(selectedStudent);
      refreshJournal();
      loadPeriodData();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("caisse_payment_success", { detail: res }));
      }
    } catch (err: any) {
      if (err.response?.data?.detail?.code === "TRANSACTION_ID_DUPLICATE") {
        setConflictPaiement(err.response.data.detail.paiement || null);
        setOpenDuplicateModal(true);
        return;
      }
      const msg =
        typeof err.response?.data?.detail === "string"
          ? err.response.data.detail
          : Array.isArray(err.response?.data?.detail)
          ? err.response.data.detail.map((d: any) => d.msg || d.detail || String(d)).join(", ")
          : err.response?.data?.detail?.message || err.message || "Échec du traitement de l'encaissement.";
      toast({
        variant: "destructive",
        title: "Échec de l'encaissement",
        description: msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const consolidateJournalItems = (items: any[]) => {
    if (!items || items.length === 0) return [];
    const grouped = new Map<string, any>();

    items.forEach((item) => {
      // Regrouper par élève (eleve_id, matricule ou nom) pour avoir UN SEUL reçu consolidé par élève qui cumule au fur et à mesure
      const studentKey = String(
        item.eleve_id ||
        (item.matricule && item.matricule !== "N/A" ? item.matricule : "") ||
        item.eleve_nom ||
        item.numero_recu ||
        item.id ||
        "inconnu"
      ).trim().toLowerCase();

      const itemSubItems = Array.isArray(item.sub_items) && item.sub_items.length > 0
        ? item.sub_items
        : [{
            id: item.id,
            numero_recu: item.numero_recu,
            montant: Number(item.montant || 0),
            type: item.type || "scolarite",
            mode: item.mode || "especes",
            date: item.date || "",
            date_complete: item.date_complete || "",
          }];

      if (!grouped.has(studentKey)) {
        grouped.set(studentKey, {
          ...item,
          totalMontant: Number(item.montant || 0),
          typesSet: new Set([item.type || "scolarite"]),
          modesSet: new Set([item.mode || "especes"]),
          itemsList: [item],
          allSubItems: [...itemSubItems],
        });
      } else {
        const existing = grouped.get(studentKey);
        existing.totalMontant += Number(item.montant || 0);
        if (item.type) existing.typesSet.add(item.type);
        if (item.mode) existing.modesSet.add(item.mode);
        // Conserver le dernier ID paiement et numéro de reçu émis
        existing.id = item.id || existing.id;
        existing.numero_recu = item.numero_recu || existing.numero_recu;
        existing.date = item.date || existing.date;
        existing.date_complete = item.date_complete || existing.date_complete;
        existing.itemsList.push(item);
        existing.allSubItems.push(...itemSubItems);
      }
    });

    return Array.from(grouped.values()).map((g) => ({
      ...g,
      montant: g.totalMontant,
      type: Array.from(g.typesSet).map((t: string) => t.charAt(0).toUpperCase() + t.slice(1)).join(" & "),
      mode: Array.from(g.modesSet).join(" / "),
      isCombined: g.itemsList.length > 1 || (g.allSubItems && g.allSubItems.length > 1),
      sub_items: g.allSubItems,
    }));
  };

  const getDisplayPaymentDate = (item: any): string => {
    if (!item) return formatDate(new Date());
    // 1. If date_complete exists and is a valid date (not pure time)
    if (item.date_complete && !/^\d{2}:\d{2}(:\d{2})?$/.test(String(item.date_complete).trim())) {
      return formatDate(item.date_complete);
    }
    // 2. If item.date exists and is not pure time
    if (item.date && !/^\d{2}:\d{2}(:\d{2})?$/.test(String(item.date).trim())) {
      return formatDate(item.date);
    }
    // 3. If any sub_item has a date
    if (Array.isArray(item.sub_items) && item.sub_items.length > 0) {
      const subComp = item.sub_items.find((s: any) => s.date_complete && !/^\d{2}:\d{2}/.test(String(s.date_complete)));
      if (subComp) return formatDate(subComp.date_complete);
      const subD = item.sub_items.find((s: any) => s.date && !/^\d{2}:\d{2}/.test(String(s.date)));
      if (subD) return formatDate(subD.date);
    }
    // 4. Default to today's date in Côte d'Ivoire
    return formatDate(new Date());
  };

  const filteredTodayItems = useMemo(() => {
    const consolidated = consolidateJournalItems(journal.encaissements || []);
    if (!searchToday.trim()) return consolidated;
    const query = searchToday.toLowerCase().trim();
    return consolidated.filter((item: any) => {
      const nom = (item.eleve_nom || "").toLowerCase();
      const recu = (item.numero_recu || "").toLowerCase();
      const mat = (item.matricule || item.eleve_matricule || "").toLowerCase();
      const mode = (item.mode || "").toLowerCase();
      const motif = (item.type || item.motif || "").toLowerCase();
      const pid = String(item.id || item.paiement_id || "");
      const tx = (item.numero_transaction || "").toLowerCase();
      return (
        nom.includes(query) ||
        recu.includes(query) ||
        mat.includes(query) ||
        mode.includes(query) ||
        motif.includes(query) ||
        pid.includes(query) ||
        tx.includes(query)
      );
    });
  }, [journal.encaissements, searchToday]);

  // "versement" et "standard" produisent le même document : ce qui distingue le reçu de
  // l'opération du récapitulatif global n'est pas ce paramètre mais le contenu de
  // `currentRecu` (son motif), que requestVersementReceipt / requestGlobalReceipt
  // repositionnent avant d'imprimer. Le type reste accepté pour que les deux appelants
  // expriment leur intention sans qu'on ait à dupliquer la construction du reçu.
  const buildReceiptData = async (receiptType: "standard" | "versement" | "arriere" = "standard") => {
    if (!currentRecu) return null;

    // Identify target student from currentRecu FIRST to avoid using selectedStudent of another student!
    const targetStudentId = currentRecu.eleve_id || currentRecu.eleve?.id || currentRecu.details_recu?.eleve_id;
    const targetMatricule = currentRecu.matricule || currentRecu.eleve?.matricule || currentRecu.details_recu?.matricule;
    const targetNom = currentRecu.eleve_nom || currentRecu.eleve?.prenom || currentRecu.eleve?.nom || "";

    // Find full matching student from global students list
    const matchedStudentFromList = (students || []).find((s: any) =>
      (targetStudentId && String(s.id) === String(targetStudentId)) ||
      (targetMatricule && s.matricule && String(s.matricule).trim().toLowerCase() === String(targetMatricule).trim().toLowerCase()) ||
      (targetNom && `${s.firstName || s.prenom || ''} ${s.lastName || s.nom || ''}`.trim().toLowerCase() === String(targetNom).trim().toLowerCase())
    );

    const isSelectedStudentMatchingTarget = selectedStudent && (
      (targetStudentId && String(selectedStudent.id) === String(targetStudentId)) ||
      (targetMatricule && selectedStudent.matricule && String(selectedStudent.matricule).trim().toLowerCase() === String(targetMatricule).trim().toLowerCase())
    );

    const studentObj = matchedStudentFromList || (isSelectedStudentMatchingTarget ? selectedStudent : null) || currentRecu.eleve || selectedStudent || {};

    // `studentEcheances` n'est chargé que pour `selectedStudent` (formulaire d'encaissement en
    // cours) : rouvrir ce reçu pour un AUTRE élève — depuis l'historique du jour, la liste des
    // impayés, un reçu récapitulatif — laisserait le reçu imprimer les tranches d'un élève
    // différent, avec sa propre classe et son propre niveau, sous le nom du bon élève. Le
    // récapitulatif chargé dans `currentRecu.echeances` est, lui, toujours celui de l'élève
    // réellement ciblé (voir openReceiptModalForStudent / requestGlobalReceipt) : on ne retombe
    // sur `studentEcheances` que lorsque la cible EST le même élève que celui du formulaire.
    const normaliserEcheances = (source: any[]): any[] =>
      source.map((e: any) => ({
        id: e.id,
        libelle: e.libelle || e.rubric,
        montant_prevu: e.montant_prevu ?? e.amount,
        montant_paye: e.montant_paye ?? e.paid,
        montant_reste: e.montant_reste ?? e.rest,
        service_type: e.service_type,
        mode: e.mode,
        statut: e.statut,
        date_paye: e.date_paye,
        date_echeance: e.date_echeance,
      }));

    let echeancesDuTargetEleve: any[] = (Array.isArray(currentRecu.echeances) && currentRecu.echeances.length > 0)
      ? normaliserEcheances(currentRecu.echeances)
      : (isSelectedStudentMatchingTarget
          ? (Array.isArray(studentEcheances) ? studentEcheances : [])
          : []);

    // Le modal s'ouvre avant que le récapitulatif n'ait répondu : imprimer dans cet intervalle
    // laisserait un reçu sans aucune ligne de scolarité. `buildReceiptData` étant asynchrone,
    // on va chercher l'échéancier de l'élève ciblé plutôt que d'imprimer un document vide.
    if (!echeancesDuTargetEleve.length && targetStudentId) {
      try {
        const recapCible = await apiClient.getRecuRecapitulatif(targetStudentId);
        if (Array.isArray(recapCible?.echeances)) {
          echeancesDuTargetEleve = normaliserEcheances(recapCible.echeances);
        }
      } catch (err) {
        console.warn("Échéancier de l'élève ciblé indisponible pour le reçu :", err);
      }
    }

    const clsName = resolveStudentClassName(studentObj, classes);
    const parsedNivReceipt = parseNiveau(clsName);
    const isMatOrPrimReceipt = parsedNivReceipt.cycle === "maternelle" || parsedNivReceipt.cycle === "primaire";
    const sNom = studentObj.nom || studentObj.lastName || "";
    const sPrenom = studentObj.prenom || studentObj.firstName || currentRecu.eleve_nom || "";
    const sNameCombined = `${sNom} ${sPrenom}`.trim() || studentObj.name || currentRecu.eleve_nom || "Élève Hînneh";
    // L'en-tête du reçu reprend la fiche « Profil École » de l'établissement de l'élève.
    const studentEcoleId = studentObj.schoolId || studentObj.ecole_id;
    const studentEcoleCode = studentObj.codeEtablissement || studentObj.ET_CODEETABLISSEMENT;
    const studentCity = studentObj.city || studentObj.ET_VILLE || studentObj.ville || (studentObj as any)?.ecole_ville || (matchedStudentFromList as any)?.city || (matchedStudentFromList as any)?.ET_VILLE || "";
    const realSchoolName = await getRealSchoolName(studentEcoleId);

    const txRef =
      (currentRecu.details_recu?.numero_transaction && currentRecu.details_recu?.numero_transaction !== "N/A")
        ? currentRecu.details_recu.numero_transaction
        : (currentRecu.numero_transaction && currentRecu.numero_transaction !== "N/A")
          ? currentRecu.numero_transaction
          : (currentRecu.num_transaction && currentRecu.num_transaction !== "N/A")
            ? currentRecu.num_transaction
            : undefined;
    const currentMotif = currentRecu.details_recu?.motif || motif || "scolarite";
    const montantPaiement = Number(currentRecu.details_recu?.montant || 0);

    if (receiptType === "arriere") {
      const arriereAmount = Number(studentObj.AU_MONTANTARRIERE || currentRecu?.synthese_financiere?.arrieres_anterieurs || 0);
      return {
        receiptNumber: `REC-ARR-${Date.now().toString().slice(-6)}`,
        paymentId: currentRecu.paiement_id || currentRecu.id || currentRecu.details_recu?.paiement_id,
        amount: arriereAmount > 0 ? arriereAmount : montantPaiement,
        type: "Règlement Arriérés Années Antérieures",
        mode: currentRecu.details_recu?.mode || currentRecu.mode || modePaiement || "especes",
        status: "paye",
        date: currentRecu.details_recu?.date_creation || new Date(),
        transactionNumber: txRef,
        studentName: sNameCombined,
        studentMatricule: studentObj.matricule || "N/A",
        studentClass: clsName,
        schoolName: realSchoolName,
        schoolId: studentEcoleId,
        schoolCode: studentEcoleCode,
        codeEtablissement: studentEcoleCode,
        schoolCity: studentCity,
        city: studentCity,
        versementDetails: [{ rubric: "Règlement Arriérés Années Antérieures", amount: arriereAmount > 0 ? arriereAmount : montantPaiement }],
        totalVersedToDate: arriereAmount > 0 ? arriereAmount : montantPaiement,
        soldeToDate: 0,
      };
    }

    let versementDetails: Array<{ rubric: string; amount: number }> = [];

    if (currentMotif === "Recu global recapitulatif") {
      versementDetails = [];
      if (currentRecu.ventilations) {
        const cats = [
          "frais_annexe",
          "frais_inscription",
          "inscription",
          "scolarite",
          "cantine",
          "transport",
          "examen",
          "uniforme",
          "kits",
          "frais_divers",
          "autres",
        ];
        cats.forEach((cat) => {
          const catData = currentRecu.ventilations[cat];
          const catAmount = Number(catData?.subtotal || 0);
          if (catAmount > 0) {
            const label =
              cat === "frais_annexe"
                ? "Frais Annexes"
                : cat === "frais_inscription"
                ? "Frais d'Inscription"
                : cat === "inscription"
                ? "Frais d'Inscription"
                : cat === "scolarite"
                ? "Frais de Scolarité"
                : cat === "cantine"
                ? "Frais de Cantine Scolaire"
                : cat === "transport"
                ? "Frais de Transport Scolaire"
                : cat === "examen"
                ? "Frais d'Examen"
                : cat === "uniforme"
                ? "Achats de Tenues & Uniformes"
                : cat === "kits"
                ? "Achats de Kits & Fournitures"
                : cat === "frais_divers"
                ? "Frais Divers & Activités"
                : "Autres Frais Annexes";
            versementDetails.push({ rubric: label, amount: catAmount });
          }
        });
      }
      if (versementDetails.length === 0) {
        versementDetails = [{ rubric: "Versements Cumulés (Tout Inclus)", amount: montantPaiement }];
      }
    } else if (currentMotif === "pack_global" || currentMotif === "forfait_global" || currentMotif === "tout_compris") {
      versementDetails = [];
      if (currentRecu.ventilations) {
        Object.entries(currentRecu.ventilations).forEach(([k, val]: [string, any]) => {
          const sub = Number(val?.subtotal || val?.montant || val || 0);
          if (sub > 0) {
            const label = k === "scolarite" ? "Frais de Scolarité Annuelle" : (k === "cantine" ? "Cantine Scolaire Annuelle" : (k === "transport" ? "Transport / Car Annuel" : k));
            versementDetails.push({ rubric: label, amount: sub });
          }
        });
      }
      if (versementDetails.length === 0 && Array.isArray(currentRecu.echeances_affectees)) {
        currentRecu.echeances_affectees.forEach((a: any) => {
          if (Number(a.montant || 0) > 0) {
            versementDetails.push({ rubric: a.rubrique || a.libelle || `Service ${a.service_type || ""}`, amount: Number(a.montant || 0) });
          }
        });
      }
      if (versementDetails.length === 0) {
        if (packIncludeScolarite && packScolariteDue > 0) versementDetails.push({ rubric: "Frais de Scolarité Annuelle", amount: Math.min(montantPaiement, packScolariteDue) });
        if (packIncludeCantine && packCantineDue > 0) versementDetails.push({ rubric: "Cantine Scolaire Annuelle (9 Mois)", amount: packCantineDue });
        if (packIncludeTransport && packTransportDue > 0) versementDetails.push({ rubric: "Transport / Car Scolaire Annuel (9 Mois)", amount: packTransportDue });
      }
      if (versementDetails.length === 0) {
        versementDetails = [{ rubric: "Forfait Global (Scolarité + Cantine + Transport)", amount: montantPaiement }];
      }
    } else if (currentMotif === "cantine") {
      const periodeLabel = currentRecu.details_recu?.observation || periodeCantineCaisse || "Période";
      versementDetails = [
        { rubric: `Frais de Cantine Scolaire — ${periodeLabel}`, amount: montantPaiement }
      ];
    } else if (currentMotif === "transport") {
      const periodeLabel = currentRecu.details_recu?.observation || "Mois en cours";
      versementDetails = [
        { rubric: `Frais de Transport Scolaire — ${periodeLabel}`, amount: montantPaiement }
      ];
    } else if (currentMotif === "uniforme" || currentMotif === "tenue" || currentMotif === "tenue_eps" || currentMotif === "polo_supplementaire") {
      const obs = currentRecu.details_recu?.observation || observation || "";
      versementDetails = [
        { rubric: obs ? `Achat Tenue — ${obs}` : "Achat Tenues / Uniforme Scolaire", amount: montantPaiement }
      ];
    } else if (currentMotif === "achat_divers" || currentMotif === "achats_divers" || currentMotif === "fournitures") {
      const obs = currentRecu.details_recu?.observation || observation || "";
      versementDetails = [
        { rubric: obs ? `Achats Divers — ${obs}` : "Achats Divers & Fournitures", amount: montantPaiement }
      ];
    } else if (currentMotif === "frais_annexe") {
      versementDetails = [
        { rubric: "Frais Annexes", amount: montantPaiement }
      ];
    } else if (currentMotif === "inscription" || currentMotif === "frais_inscription") {
      versementDetails = [
        { rubric: "Frais d'Inscription", amount: montantPaiement }
      ];
    } else if (currentMotif === "cours_anglais" || currentMotif === "anglais") {
      const obs = currentRecu.details_recu?.observation || observation || "";
      versementDetails = [
        { rubric: obs ? `Cours d'Anglais — ${obs}` : "Frais Divers — Cours d'Anglais", amount: montantPaiement }
      ];
    } else if (currentMotif === "cours_informatique" || currentMotif === "informatique") {
      const obs = currentRecu.details_recu?.observation || observation || "";
      versementDetails = [
        { rubric: obs ? `Cours d'Informatique — ${obs}` : "Frais Divers — Cours d'Informatique", amount: montantPaiement }
      ];
    } else if (currentMotif === "frais_divers") {
      const obs = currentRecu.details_recu?.observation || observation || "Frais Divers & Activités";
      versementDetails = [
        { rubric: obs, amount: montantPaiement }
      ];
    } else if (currentMotif === "autre") {
      const obs = currentRecu.details_recu?.observation || observation || "Frais divers";
      versementDetails = [
        { rubric: obs, amount: montantPaiement }
      ];
    } else {
      const echeancesList = echeancesDuTargetEleve;
      const echeanceIdsList = isSelectedStudentMatchingTarget && Array.isArray(selectedEcheanceIds) ? selectedEcheanceIds : [];
      // Les identifiants de tranche circulent tantôt en nombre, tantôt en chaîne selon la
      // source : on compare sur une forme unique, sinon `includes` échoue silencieusement et
      // le détail du versement retombe sur une ligne générique « Frais de Scolarité ».
      const echeanceIdsNormalises = echeanceIdsList.map((id: any) => String(id));
      const selectedTranches = echeancesList.filter(
        (e: any) => e.id !== undefined && e.id !== null && echeanceIdsNormalises.includes(String(e.id))
      );
      if (selectedTranches.length > 0) {
        let remToAlloc = montantPaiement;
        versementDetails = selectedTranches.map((e: any) => {
          const due = Math.max(0, Number(e.montant_prevu || 0) - Number(e.montant_paye || 0));
          const allocated = Math.min(remToAlloc, due > 0 ? due : Number(e.montant_prevu || 0));
          remToAlloc = Math.max(0, remToAlloc - allocated);
          return {
            rubric: e.libelle || e.rubrique || "Frais de Scolarité",
            amount: allocated > 0 ? allocated : Number(e.montant_prevu || 0),
          };
        });
      } else {
        versementDetails = [{ rubric: "Frais de Scolarité", amount: montantPaiement }];
      }
    }

    let formattedEcheances: Array<{ rubric: string; amount: number; paid: number; rest: number; mode?: string; service_type?: string; statut?: string; is_desabonne?: boolean }> = [];

    // Échéancier réellement enregistré pour l'élève CIBLÉ par ce reçu (api_echeancier), toutes
    // rubriques confondues — voir echeancesDuTargetEleve ci-dessus pour la raison de ce choix.
    const echeancesReelles = echeancesDuTargetEleve;
    const echeancesReellesDuService = (service: string) =>
      echeancesReelles.filter((e: any) => String(e.service_type || "").toLowerCase() === service);

    // 1. Détermination du cumul payé pour chaque service
    const allStudentPayments = (Array.isArray(studentPayments) ? studentPayments : []).concat(
        Array.isArray(journal?.encaissements) ? journal.encaissements : []
      );
      const studentPmtList = allStudentPayments.filter((p: any) =>
        (studentObj.id && String(p.eleve_id || p.eleveId || p.eleve?.id) === String(studentObj.id)) ||
        (studentObj.matricule && p.matricule && String(p.matricule).trim().toLowerCase() === String(studentObj.matricule).trim().toLowerCase())
      );

      // Cumul réel de scolarité
      let cumulScolarite = studentPmtList.reduce((acc: number, p: any) => {
        const pt = String(p.type || p.motif || "").toLowerCase();
        if (pt.includes("cant") || pt.includes("trans") || pt.includes("car") || pt.includes("kit") || pt.includes("tenue") || pt.includes("uniforme") || pt.includes("fourniture") || pt.includes("exam") || pt.includes("anglais") || pt.includes("informatique") || pt.includes("divers")) {
          return acc;
        }
        return acc + Number(p.montant || 0);
      }, 0);

      // Si le paiement courant est une scolarité ou inscription et n'est pas encore dans studentPmtList
      const curPmtId = currentRecu.paiement_id || currentRecu.id || currentRecu.details_recu?.paiement_id;
      const curRecuNum = currentRecu.details_recu?.numero_recu || currentRecu.numero_recu;
      const isCurInList = studentPmtList.some((p: any) => (curPmtId && (p.id === curPmtId || p.paiement_id === curPmtId)) || (curRecuNum && p.numero_recu === curRecuNum));
      if (!isCurInList && montantPaiement > 0) {
        if (currentMotif === "scolarite" || currentMotif === "inscription" || currentMotif === "reinscription" || currentMotif === "scolarité") {
          cumulScolarite += montantPaiement;
        }
      }

      // Cumul réel de cantine
      let cumulCantine = studentPmtList.reduce((acc: number, p: any) => {
        const pt = String(p.type || p.motif || "").toLowerCase();
        return pt.includes("cant") ? acc + Number(p.montant || 0) : acc;
      }, 0);
      if (!isCurInList && montantPaiement > 0 && currentMotif === "cantine") {
        cumulCantine += montantPaiement;
      }

      // Cumul réel de transport
      let cumulTransport = studentPmtList.reduce((acc: number, p: any) => {
        const pt = String(p.type || p.motif || "").toLowerCase();
        return (pt.includes("trans") || pt.includes("car")) ? acc + Number(p.montant || 0) : acc;
      }, 0);
      if (!isCurInList && montantPaiement > 0 && (currentMotif === "transport" || currentMotif === "car")) {
        cumulTransport += montantPaiement;
      }

      const scolEchsFromDb = echeancesReelles.filter((e: any) => {
        const st = (e.service_type || "").toLowerCase();
        const lib = (e.libelle || e.rubrique || "").toLowerCase();
        return !st.includes("cant") && !st.includes("trans") && !st.includes("car") && !lib.includes("cant") && !lib.includes("trans") && !lib.includes("car");
      });

      if (scolEchsFromDb.length > 0) {
        formattedEcheances = scolEchsFromDb.map((e: any) => ({
          rubric: e.libelle || e.rubrique || "Frais de Scolarité",
          amount: Number(e.montant_prevu || e.montant || 0),
          paid: Number(e.montant_paye || e.paye || 0),
          rest: Number(
            e.montant_reste ??
              e.reste ??
              Math.max(0, Number(e.montant_prevu || 0) - Number(e.montant_paye || 0)),
          ),
          service_type: "scolarite",
          mode: e.mode,
          statut: e.statut,
        }));
      } else {
        // Résolution de l'échéancier officiel de la classe
        const resolvedGrille = resolveEcheancierEleve(
          clsName,
          isMatOrPrimReceipt ? "TOUS" : (studentObj.statut_orientation || "AFF"),
          studentObj.typeInscription || "inscription",
          Boolean(studentObj.prise_en_charge),
          cumulScolarite,
          studentEcoleId,
          studentEcoleCode,
          studentCity,
        );
        formattedEcheances = (resolvedGrille.echeances || []).map((e) => ({
          rubric: e.rubric,
          amount: e.amount,
          paid: e.paid,
          rest: e.rest,
          service_type: "scolarite",
          mode: currentRecu.details_recu?.mode || currentRecu.mode || modePaiement,
        }));
      }

      // 2. Traitement des services Cantine & Transport
      const officialCantineTarif = getOfficialServiceTarif(
        "cantine",
        studentEcoleCode || studentEcoleId || studentObj.ecole_id,
        studentCity,
        realSchoolName
      );
      const officialTransportTarif = getOfficialServiceTarif(
        "transport",
        studentEcoleCode || studentEcoleId || studentObj.ecole_id,
        studentCity,
        realSchoolName
      );

      const cantineEchsFromDb = echeancesReelles.filter((e: any) => {
        const st = (e.service_type || "").toLowerCase();
        const lib = (e.libelle || e.rubrique || "").toLowerCase();
        return st.includes("cant") || lib.includes("cant");
      });

      const transEchsFromDb = echeancesReelles.filter((e: any) => {
        const st = (e.service_type || "").toLowerCase();
        const lib = (e.libelle || e.rubrique || "").toLowerCase();
        return st.includes("trans") || st.includes("car") || lib.includes("trans") || lib.includes("car");
      });

      const maxPaidCantineFromDb = cantineEchsFromDb.reduce((max: number, e: any) => Math.max(max, Number(e.montant_paye || e.paye || 0)), 0);
      const maxPrevuCantineFromDb = cantineEchsFromDb.reduce((max: number, e: any) => Math.max(max, Number(e.montant_prevu || e.montant || 0)), 0);

      const effectiveCantineMonthly =
        maxPaidCantineFromDb > 0
          ? maxPaidCantineFromDb
          : Number(cantineMensuelTarif || 0) > 0
          ? Number(cantineMensuelTarif)
          : maxPrevuCantineFromDb > 0
          ? maxPrevuCantineFromDb
          : (Number(studentObj.tarif_cantine || studentObj.montant_cantine || 0) > 0)
          ? Number(studentObj.tarif_cantine || studentObj.montant_cantine)
          : officialCantineTarif;

      const maxPaidTransportFromDb = transEchsFromDb.reduce((max: number, e: any) => Math.max(max, Number(e.montant_paye || e.paye || 0)), 0);
      const maxPrevuTransportFromDb = transEchsFromDb.reduce((max: number, e: any) => Math.max(max, Number(e.montant_prevu || e.montant || 0)), 0);

      const effectiveTransportMonthly =
        maxPaidTransportFromDb > 0
          ? maxPaidTransportFromDb
          : Number(transportMensuelTarif || packTransportZoneTarif || 0) > 0
          ? Number(transportMensuelTarif || packTransportZoneTarif)
          : maxPrevuTransportFromDb > 0
          ? maxPrevuTransportFromDb
          : (Number(studentObj.tarif_transport || studentObj.montant_transport || studentObj.transport_tarif || studentObj.zone_tarif || 0) > 0)
          ? Number(studentObj.tarif_transport || studentObj.montant_transport || studentObj.transport_tarif || studentObj.zone_tarif)
          : officialTransportTarif;

      const isCantineSub = Boolean(
        studentObj.service_cantine ||
        studentObj.serviceCantine ||
        studentObj.is_cantine ||
        studentObj.cantine ||
        currentMotif === "cantine" ||
        cumulCantine > 0
      );
      const isTransportSub = Boolean(
        studentObj.service_transport ||
        studentObj.serviceTransport ||
        studentObj.is_transport ||
        studentObj.transport ||
        currentMotif === "transport" ||
        cumulTransport > 0
      );

      const SERVICE_MONTHS_NAMES = [
        { name: "Septembre", year: 2026, date: "05/09/2026" },
        { name: "Octobre", year: 2026, date: "05/10/2026" },
        { name: "Novembre", year: 2026, date: "05/11/2026" },
        { name: "Décembre", year: 2026, date: "05/12/2026" },
        { name: "Janvier", year: 2027, date: "05/01/2027" },
        { name: "Février", year: 2027, date: "05/02/2027" },
        { name: "Mars", year: 2027, date: "05/03/2027" },
        { name: "Avril", year: 2027, date: "05/04/2027" },
        { name: "Mai", year: 2027, date: "05/05/2027" },
      ];

      if (cantineEchsFromDb.length > 0) {
        cantineEchsFromDb.forEach((e: any) => {
          const pd = Number(e.montant_paye || e.paye || 0);
          const isDesab = e.statut === "desabonne" || (e as any).is_desabonne;
          const amt = isDesab ? 0 : (pd > 0 ? Math.max(pd, effectiveCantineMonthly) : effectiveCantineMonthly);
          formattedEcheances.push({
            rubric: e.libelle || e.rubrique || "Cantine Scolaire",
            amount: amt,
            paid: pd,
            rest: isDesab || pd >= amt ? 0 : Math.max(0, amt - pd),
            service_type: "cantine",
            mode: e.mode,
            statut: isDesab ? "desabonne" : (pd >= amt && amt > 0 ? "paye" : e.statut),
            is_desabonne: isDesab,
          });
        });
      } else if (isCantineSub) {
        const monthlyTarif = effectiveCantineMonthly;
        let remCantine = cumulCantine;
        SERVICE_MONTHS_NAMES.forEach((m) => {
          const p = Math.min(monthlyTarif, remCantine);
          remCantine = Math.max(0, remCantine - p);
          formattedEcheances.push({
            rubric: `Cantine — ${m.name} ${m.year}`,
            amount: monthlyTarif,
            paid: p,
            rest: Math.max(0, monthlyTarif - p),
            service_type: "cantine",
            mode: currentRecu.details_recu?.mode || currentRecu.mode || modePaiement,
            statut: p >= monthlyTarif ? "paye" : p > 0 ? "partiel" : "non_paye",
          });
        });
      } else if (cumulCantine > 0) {
        formattedEcheances.push({
          rubric: "Cantine Scolaire",
          amount: cumulCantine,
          paid: cumulCantine,
          rest: 0,
          service_type: "cantine",
          mode: currentRecu.details_recu?.mode || currentRecu.mode || modePaiement,
        });
      }

      if (transEchsFromDb.length > 0) {
        transEchsFromDb.forEach((e: any) => {
          const pd = Number(e.montant_paye || e.paye || 0);
          const isDesab = e.statut === "desabonne" || (e as any).is_desabonne;
          const amt = isDesab ? 0 : (pd > 0 ? Math.max(pd, effectiveTransportMonthly) : effectiveTransportMonthly);
          formattedEcheances.push({
            rubric: e.libelle || e.rubrique || "Transport Scolaire",
            amount: amt,
            paid: pd,
            rest: isDesab || pd >= amt ? 0 : Math.max(0, amt - pd),
            service_type: "transport",
            mode: e.mode,
            statut: isDesab ? "desabonne" : (pd >= amt && amt > 0 ? "paye" : e.statut),
            is_desabonne: isDesab,
          });
        });
      } else if (isTransportSub) {
        const monthlyTarif = effectiveTransportMonthly;
        let remTransport = cumulTransport;
        SERVICE_MONTHS_NAMES.forEach((m) => {
          const p = Math.min(monthlyTarif, remTransport);
          remTransport = Math.max(0, remTransport - p);
          formattedEcheances.push({
            rubric: `Transport (Car) — ${m.name} ${m.year}`,
            amount: monthlyTarif,
            paid: p,
            rest: Math.max(0, monthlyTarif - p),
            service_type: "transport",
            mode: currentRecu.details_recu?.mode || currentRecu.mode || modePaiement,
            statut: p >= monthlyTarif ? "paye" : p > 0 ? "partiel" : "non_paye",
          });
        });
      } else if (cumulTransport > 0) {
        formattedEcheances.push({
          rubric: "Transport / Car",
          amount: cumulTransport,
          paid: cumulTransport,
          rest: 0,
          service_type: "transport",
          mode: currentRecu.details_recu?.mode || currentRecu.mode || modePaiement,
        });
      }

      // 3. Achats ponctuels (Kits, Tenues, Frais d'examen, Divers)
      const isCurrentKit =
        currentMotif.includes("kit") ||
        currentMotif.includes("tenue") ||
        currentMotif.includes("uniforme") ||
        currentMotif.includes("fourniture") ||
        currentMotif.includes("achat");
      const isCurrentDivers =
        currentMotif.includes("anglais") ||
        currentMotif.includes("informatique") ||
        currentMotif.includes("divers") ||
        currentMotif === "autre";

      if ((isCurrentKit || isCurrentDivers) && montantPaiement > 0) {
        const kitLabel = versementDetails[0]?.rubric || (isCurrentKit ? "Achats de Kits & Tenues Scolaires" : "Frais Divers & Activités");
        formattedEcheances.push({
          rubric: kitLabel,
          amount: montantPaiement,
          paid: montantPaiement,
          rest: 0,
          service_type: isCurrentKit ? "kits_achats" : "frais_divers",
          mode: currentRecu.details_recu?.mode || currentRecu.mode || modePaiement,
        });
      }

    const totalPaye = formattedEcheances.reduce((acc, e) => acc + e.paid, 0);
    const totalReste = formattedEcheances.reduce((acc, e) => acc + e.rest, 0);

    const paidFormatted = formattedEcheances
      .filter((e) => Number(e.paid || 0) > 0)
      .map((e) => ({
        rubric: e.rubric,
        amount: e.paid,
      }));

    if (
      paidFormatted.length > 1 &&
      (versementDetails.length <= 1 ||
        currentMotif === "Recu global recapitulatif" ||
        currentMotif === "pack_global" ||
        currentMotif === "forfait_global" ||
        versementDetails.some(v => v.rubric === "Frais de Scolarité" && v.amount >= totalPaye))
    ) {
      versementDetails = paidFormatted;
    }

    return {
      receiptNumber:
        currentRecu.details_recu?.numero_recu ||
        generateReceiptNumber(currentRecu.id || Date.now()),
      paymentId: currentRecu.paiement_id || currentRecu.id || currentRecu.details_recu?.paiement_id,
      amount: montantPaiement,
      type: currentMotif,
      mode: currentRecu.details_recu?.mode || currentRecu.mode || modePaiement || "especes",
      status: "paye",
      date: currentRecu.details_recu?.date_creation || new Date(),
      transactionNumber: txRef,
      studentName: sNameCombined,
      studentMatricule: studentObj.matricule || "N/A",
      studentClass: clsName,
      schoolName: realSchoolName,
      schoolId: studentEcoleId,
      schoolCode: studentEcoleCode,
      codeEtablissement: studentEcoleCode,
      schoolCity: studentCity,
      city: studentCity,
      arrieresAnterieurs: Number(studentObj.AU_MONTANTARRIERE || 0),
      studentPhoto:
        studentObj.photo ||
        studentObj.photo_url ||
        studentObj.avatar ||
        studentObj.photoUrl ||
        studentObj.PHOTO_URL ||
        studentObj.image ||
        (currentRecu.eleve
          ? currentRecu.eleve.photo ||
            currentRecu.eleve.photo_url ||
            currentRecu.eleve.avatar
          : undefined),
      statutOrientation:
        isMatOrPrimReceipt
          ? "Scolarité Réelle"
          : (studentObj.statut_orientation ||
             studentObj.statutOrientation ||
             studentObj.statutAffecte ||
             "Affecté par l'État"),
      typeInscription: studentObj.typeInscription || "inscription",
      priseEnCharge: Boolean(
        studentObj.prise_en_charge ||
        studentObj.priseEnCharge ||
        studentObj.ETAT_BOURSE,
      ),
      serviceCantine: Boolean(
        studentObj.service_cantine ||
        studentObj.serviceCantine ||
        studentObj.is_cantine ||
        studentObj.cantine ||
        studentObj.cantine_active ||
        studentObj.option_cantine ||
        getStudentServiceAttribution(sNameCombined, studentObj.matricule).cantine ||
        echeancesReellesDuService("cantine").length > 0 ||
        currentMotif === "cantine" ||
        currentMotif === "pack_global" ||
        currentMotif === "forfait_global"
      ),
      serviceTransport: Boolean(
        studentObj.service_transport ||
        studentObj.serviceTransport ||
        studentObj.is_transport ||
        studentObj.transport ||
        studentObj.transport_active ||
        studentObj.option_transport ||
        getStudentServiceAttribution(sNameCombined, studentObj.matricule).transport ||
        echeancesReellesDuService("transport").length > 0 ||
        currentMotif === "transport" ||
        currentMotif === "pack_global" ||
        currentMotif === "forfait_global"
      ),
      // Le droit d'examen n'a pas de colonne dédiée sur la fiche élève : l'abonnement se
      // constate sur l'échéancier (tranche service_type = 'examen') ou sur le motif du jour.
      serviceExamen: Boolean(
        echeancesReellesDuService("examen").length > 0 ||
        currentMotif === "examen"
      ),
      cantineMensuelTarif: effectiveCantineMonthly,
      transportMensuelTarif: effectiveTransportMonthly,
      totalVersedToDate: totalPaye > 0 ? totalPaye : montantPaiement,
      soldeToDate: totalReste,
      caissierName:
        currentRecu?.caissier_nom ||
        currentRecu?.details_recu?.caissier ||
        "yahkouyate",
      imprimeParName:
        localStorage.getItem("user_full_name") ||
        localStorage.getItem("username") ||
        "Agent Caisse",
      echeances: formattedEcheances.length > 0 ? formattedEcheances : undefined,
      versementDetails: versementDetails,
      // Origine du barème renvoyée par l'API : permet de voir sur le reçu s'il vient de
      // l'échéancier de l'élève, de la grille de l'école, ou du barème de repli.
      sourceScolarite: currentRecu?.source_scolarite,
      grilleLabel: currentRecu?.grille_configuree || currentRecu?.grille_label,
    };
  };

  // Le navigateur n'autorise l'ouverture d'une fenêtre que pendant le clic lui-même.
  // On l'ouvre donc avant tout appel réseau : après un `await`, le bloqueur de pop-ups
  // la refuse en ligne, où l'API répond moins vite qu'en local.
  const ouvrirFenetreImpression = (): Window | null => {
    try {
      const win = window.open("", "_blank", "width=950,height=950");
      if (win) {
        win.document.write(
          "<html><head><title>Impression Reçu...</title></head><body style='font-family:sans-serif;padding:30px;text-align:center;'><h3>Préparation du reçu officiel en cours...</h3></body></html>",
        );
      }
      return win;
    } catch (e) {
      return null;
    }
  };

  // Une fenêtre déjà ouverte ne doit jamais rester figée sur « Préparation… » :
  // on y affiche la raison de l'échec plutôt que de la laisser en attente.
  const signalerEchecImpression = (win: Window | null, message: string) => {
    if (!win || win.closed) return;
    try {
      win.document.body.innerHTML = `<div style="font-family:sans-serif;padding:30px;text-align:center;"><h3>Impression impossible</h3><p>${message}</p><p style="color:#64748b;font-size:13px;">Vous pouvez fermer cette fenêtre et réessayer.</p></div>`;
    } catch (e) {
      win.close();
    }
  };

  const handlePrintReceipt = async (
    receiptType: "standard" | "versement" | "arriere" = "standard",
    fenetrePreOuverte?: Window | null,
  ) => {
    const printWin = fenetrePreOuverte ?? ouvrirFenetreImpression();

    try {
      const receiptData = await buildReceiptData(receiptType);
      if (receiptData) {
        printReceipt(receiptData, printWin);
        return;
      }
      signalerEchecImpression(printWin, "Les données du reçu sont introuvables.");
      toast({
        variant: "destructive",
        title: "Reçu indisponible",
        description: "Les données de ce reçu n'ont pas pu être réunies.",
      });
    } catch (err: any) {
      const message = err?.message || String(err);
      signalerEchecImpression(printWin, message);
      console.error("Erreur lors de l'impression du reçu:", err);
      toast({
        variant: "destructive",
        title: "Erreur lors de l'impression",
        description: message,
      });
    }
  };

  const handleDownloadReceiptPDF = async (receiptType: "standard" | "versement" | "arriere" = "standard") => {
    try {
      const receiptData = await buildReceiptData(receiptType);
      if (receiptData) {
        await downloadReceiptPDF(receiptData);
        toast({
          title: "Téléchargement Réussi",
          description: "Le reçu a été téléchargé sous format PDF.",
        });
      }
    } catch (err: any) {
      console.error("Erreur lors du téléchargement du PDF:", err);
      toast({
        variant: "destructive",
        title: "Erreur Téléchargement PDF",
        description: err?.message || String(err),
      });
    }
  };

  // Charge le reçu récapitulatif global de l'élève (toutes catégories : frais annexes,
  // inscription, scolarité, cantine, transport, examen, autres) puis déclenche l'impression
  // ou le téléchargement PDF. C'est le seul reçu officiel émis par le guichet.
  const requestGlobalReceipt = async (action: "print" | "pdf") => {
    const stId =
      currentRecu?.eleve?.id || currentRecu?.eleve_id || selectedStudent?.id;
    if (!stId) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Élève introuvable pour la génération du reçu global.",
      });
      return;
    }

    // Ouverture immédiate, tant que le clic autorise encore les pop-ups : le
    // récapitulatif demande un appel réseau, et attendre sa réponse ferait
    // refuser la fenêtre par le navigateur.
    const printWin = action === "print" ? ouvrirFenetreImpression() : null;

    // Récapitulatif déjà chargé dans le modal : agir sans refaire l'appel réseau.
    if (currentRecu?.details_recu?.motif === "Recu global recapitulatif") {
      if (action === "print") await handlePrintReceipt("standard", printWin);
      else await handleDownloadReceiptPDF("standard");
      return;
    }

    try {
      const recap = await apiClient.getRecuRecapitulatif(stId);
      setCurrentRecu({
        ...recap,
        eleve: {
          ...(recap.eleve || {}),
          id: stId,
          prenom: currentRecu?.eleve?.prenom || recap.eleve?.prenom,
          nom: currentRecu?.eleve?.nom || recap.eleve?.nom,
          matricule: currentRecu?.eleve?.matricule || recap.eleve?.matricule,
        },
        details_recu: {
          numero_recu: recap.recu_numero || currentRecu?.details_recu?.numero_recu,
          montant: recap.total_general ?? currentRecu?.details_recu?.montant,
          motif: "Recu global recapitulatif",
          mode: "Multiples",
          caissier: "Comptabilité Hînneh",
          annee_scolaire: "2026-2027",
          date_creation: new Date(),
        },
      });
      fenetreImpressionRef.current = printWin;
      setPendingGlobalReceipt(action);
    } catch {
      signalerEchecImpression(printWin, "Le reçu récapitulatif global n'a pas pu être chargé.");
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger le reçu récapitulatif global.",
      });
    }
  };

  // Joué après le rendu : handlePrintReceipt/handleDownloadReceiptPDF voient ici le
  // currentRecu à jour, donc le récapitulatif global et non le reçu précédent.
  // La fenêtre d'impression, elle, a été ouverte dès le clic (voir requestGlobalReceipt).
  useEffect(() => {
    if (!pendingGlobalReceipt) return;
    if (currentRecu?.details_recu?.motif !== "Recu global recapitulatif") return;
    const action = pendingGlobalReceipt;
    const printWin = fenetreImpressionRef.current;
    fenetreImpressionRef.current = null;
    setPendingGlobalReceipt(null);
    if (action === "print") handlePrintReceipt("standard", printWin);
    else handleDownloadReceiptPDF("standard");
  }, [pendingGlobalReceipt, currentRecu]);

  // Mémorise le reçu de l'opération de caisse dès qu'il est chargé, avant qu'une
  // impression du récapitulatif global ne vienne écraser currentRecu.
  useEffect(() => {
    if (!currentRecu) return;
    if (currentRecu?.details_recu?.motif === "Recu global recapitulatif") return;
    setRecuVersement(currentRecu);
  }, [currentRecu]);

  // Reçu de caisse du seul versement encaissé (le montant payé pour cette opération),
  // par opposition au récapitulatif qui reprend tous les versements de l'élève.
  const requestVersementReceipt = async (action: "print" | "pdf") => {
    const estRecapCourant = currentRecu?.details_recu?.motif === "Recu global recapitulatif";
    const source = estRecapCourant ? recuVersement : (currentRecu || recuVersement);

    if (!source) {
      toast({
        variant: "destructive",
        title: "Reçu indisponible",
        description: "Aucun versement de caisse à imprimer pour cette opération.",
      });
      return;
    }

    const printWin = action === "print" ? ouvrirFenetreImpression() : null;

    // Le reçu du versement est déjà celui affiché : imprimer sans repasser par un rendu.
    if (!estRecapCourant) {
      if (action === "print") await handlePrintReceipt("versement", printWin);
      else await handleDownloadReceiptPDF("versement");
      return;
    }

    // buildReceiptData lit currentRecu par closure : on le repositionne sur le versement
    // et l'impression est jouée au rendu suivant, comme pour le récapitulatif global.
    setCurrentRecu(source);
    fenetreImpressionRef.current = printWin;
    setPendingVersementReceipt(action);
  };

  useEffect(() => {
    if (!pendingVersementReceipt) return;
    if (currentRecu?.details_recu?.motif === "Recu global recapitulatif") return;
    const action = pendingVersementReceipt;
    const printWin = fenetreImpressionRef.current;
    fenetreImpressionRef.current = null;
    setPendingVersementReceipt(null);
    if (action === "print") handlePrintReceipt("versement", printWin);
    else handleDownloadReceiptPDF("versement");
  }, [pendingVersementReceipt, currentRecu]);

  // Filtered student search list
  const filteredStudents =
    searchStudent.trim() === ""
      ? []
      : students
          .filter((s) => matchStudentSearch(s, searchStudent))
          .slice(0, 8);

  const studentClassName = selectedStudent
    ? resolveStudentClassName(selectedStudent, classes)
    : "";

  return (
    <Layout
      loading={loading}
      loadingMessage="Chargement du guichet de caisse..."
      loadingSubmessage="Initialisation des journaux d'encaissement et des soldes"
      title="Guichet Caisse & Encaissements"
      description={
        getEcoleCourante()?.name
          ? `Module de Caisse — ${getEcoleCourante()!.name}`
          : "Module de Caisse"
      }
    >
      <div className="space-y-6">
        {/* EN-TÊTE DU GUICHET DE CAISSE - AVEC LOGO & FOND INSTITUTIONNEL */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-5 md:p-6 rounded-2xl shadow-lg border border-slate-800 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5">
          {/* Filigrane / Watermark du Logo de l'établissement en arrière-plan */}
          <div 
            className="absolute -right-6 -bottom-8 w-64 h-64 pointer-events-none opacity-10 select-none bg-contain bg-no-repeat bg-center"
            style={{ backgroundImage: `url(${getEcoleCourante()?.logo || '/images/hinneh_logo_20260507_234919.png'})` }}
            aria-hidden="true"
          />
          {/* Liseré supérieur aux couleurs officielles de l'école */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-indigo-500 to-emerald-500" />
          
          {/* BLOC GAUCHE : LOGO OFFICIEL, IDENTITÉ ÉCOLE & AGENT */}
          <div className="flex items-start sm:items-center gap-4 z-10">
            {/* Médaillon Logo officiel */}
            <div className="relative shrink-0 p-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-md">
              <img 
                src={getEcoleCourante()?.logo || '/images/hinneh_logo_20260507_234919.png'} 
                alt="Logo Établissement" 
                className="w-12 h-12 md:w-14 md:h-14 object-contain rounded-xl drop-shadow"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  caisseOpen 
                    ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40" 
                    : "bg-rose-950/80 text-rose-300 border-rose-500/40"
                }`}>
                  <span className={`h-2 w-2 rounded-full ${caisseOpen ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
                  {caisseOpen ? "Guichet en service" : "Guichet fermé"}
                </span>

                <span className="text-xs text-slate-400 capitalize">
                  {new Date().toLocaleDateString("fr-FR", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TIMEZONE_GMT })}
                </span>

                <span className="text-slate-600">•</span>
                
                <span className="text-xs font-medium text-amber-300 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" />
                  {getEcoleCourante()?.name || "Groupe Scolaire Hînneh"}
                </span>
              </div>

              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2 mt-0.5">
                Guichet de Caisse & Encaissements
              </h1>

              <p className="text-xs text-slate-300 flex flex-wrap items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Caissier en poste :</span>
                <strong className="font-semibold text-white">{localStorage.getItem("username") || "Agent de caisse"}</strong>
                <span className="text-slate-500 hidden sm:inline">•</span>
                <span>Règlement des scolarités, cantine, car & reçus officiels.</span>
              </p>
            </div>
          </div>

          {/* BLOC DROIT : TOTAUX & ACTIONS */}
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-between xl:justify-end z-10">
            {/* CARTOUCHE FOND DE CAISSE (TOTAL CUMULÉ) */}
            <div className="bg-slate-800/80 backdrop-blur-sm p-3.5 rounded-xl border border-slate-700/80 min-w-[240px] shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Fond de Caisse
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-semibold">
                  Cumul paiements
                </span>
              </div>
              <p className="text-xl font-black text-white tracking-tight">
                {formatCurrency(Number(fondDeCaisse) || 0)}
              </p>
              {journal?.fond_de_caisse_ventilations && (
                <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-700/70 mt-1.5">
                  <span>Scol : <strong className="text-slate-200 font-semibold">{formatCurrency(journal.fond_de_caisse_ventilations.scolarite || 0)}</strong></span>
                  <span className="text-slate-600">•</span>
                  <span>Cant : <strong className="text-slate-200 font-semibold">{formatCurrency(journal.fond_de_caisse_ventilations.cantine || 0)}</strong></span>
                  <span className="text-slate-600">•</span>
                  <span>Car : <strong className="text-slate-200 font-semibold">{formatCurrency(journal.fond_de_caisse_ventilations.transport || 0)}</strong></span>
                </div>
              )}
            </div>

            {/* CARTOUCHE ENCAISSEMENTS DU JOUR */}
            <div className="bg-emerald-950/40 backdrop-blur-sm p-3.5 rounded-xl border border-emerald-700/50 min-w-[180px] shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                  Recette du Jour
                </span>
              </div>
              <p className="text-xl font-black text-emerald-400 tracking-tight">
                {formatCurrency(journal.total_general || 0)}
              </p>
              <p className="text-[10px] text-emerald-300/80 pt-1 border-t border-emerald-800/60 mt-1.5">
                {journal?.nb_encaissements ? `${journal.nb_encaissements} versement(s) encaissé(s)` : "0 versement encaissé"}
              </p>
            </div>

            {/* BOUTON GESTION DES IDS MOBILE MONEY & CORIS */}
            <Button
              onClick={() => setOpenAdminTxModal(true)}
              variant="outline"
              size="sm"
              className="border-amber-500/40 bg-amber-500/10 hover:bg-amber-600 hover:text-white text-amber-200 font-semibold h-11 px-3.5 shadow-sm flex items-center gap-1.5"
              title={isAdmin ? "Gérer et corriger les ID de transactions Mobile Money / Coris Bank" : "Consulter les transactions Mobile Money / Coris Bank"}
            >
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Transactions</span> Mobile/Coris
              {isAdmin && (
                <Badge className="ml-1 bg-amber-500 text-slate-950 hover:bg-amber-400 text-[10px] font-bold px-1.5 py-0">
                  Admin
                </Badge>
              )}
            </Button>

            {/* BOUTON D'OUVERTURE / CLÔTURE DE SESSION */}
            <Button
              onClick={() => setCaisseOpen(!caisseOpen)}
              variant="outline"
              size="sm"
              className={
                caisseOpen 
                  ? "border-rose-500/40 bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-200 font-semibold h-11 px-4 shadow-sm" 
                  : "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-11 px-4 shadow-sm"
              }
            >
              {caisseOpen ? (
                <>
                  <Lock className="w-4 h-4 mr-1.5 text-rose-400" />
                  Clôturer la journée
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 mr-1.5" />
                  Ouvrir la journée
                </>
              )}
            </Button>
          </div>
        </div>

        {/* MAIN GUICHET GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT PANEL: GUICHET ENCAISSEMENT (COL 7) */}
          <div className="lg:col-span-7 space-y-6">
            {/* STEP 1: SEARCH & SELECT STUDENT */}
            <Card className="border-indigo-100 dark:border-indigo-950 shadow-md">
              <CardHeader className="pb-3 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-indigo-600">
                  <UserCheck className="w-5 h-5" /> 1. Identification de l'Élève
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="relative">
                  <Label
                    htmlFor="searchStudent"
                    className="text-xs font-semibold text-slate-600"
                  >
                    Rechercher un élève (Nom, Prénom ou Matricule) *
                  </Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="searchStudent"
                      placeholder="Tapez le nom, prénom ou matricule (ex: HE2026...)"
                      value={searchStudent}
                      onChange={(e) => {
                        setSearchStudent(e.target.value);
                        if (selectedStudent) setSelectedStudent(null);
                      }}
                      className="pl-9 text-sm h-11"
                    />
                  </div>

                  {/* AUTO-COMPLETE DROPDOWN */}
                  {filteredStudents.length > 0 && !selectedStudent && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                      {filteredStudents.map((st) => (
                        <div
                          key={st.id}
                          onClick={() => handleSelectStudent(st)}
                          className="p-3 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer flex justify-between items-center border-b border-slate-100 dark:border-slate-800 transition-colors"
                        >
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">
                              {st.lastName || st.nom}{" "}
                              {st.firstName || st.prenom}
                            </p>
                            <p className="text-xs text-slate-500">
                              Matricule :{" "}
                              <span className="font-semibold text-indigo-600">
                                {st.matricule || "N/A"}
                              </span>
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Chosir
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SELECTED STUDENT CARD SUMMARY */}
                {selectedStudent && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge className="bg-indigo-600 text-white text-xs mb-1">
                          Élève Sélectionné
                        </Badge>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {selectedStudent.lastName || selectedStudent.nom}{" "}
                          {selectedStudent.firstName || selectedStudent.prenom}
                          <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-600 border-sky-300">
                            {selectedStudent.regime || "Non-boursier"}
                          </Badge>
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          Matricule :{" "}
                          <span className="font-bold text-slate-900 dark:text-white">
                            {selectedStudent.matricule || "N/A"}
                          </span>{" "}
                          — Classe :{" "}
                          <span className="font-bold text-indigo-600">
                            {studentClassName}
                          </span>
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          📍 Habitation : <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {[selectedStudent.AU_COMMUNE, selectedStudent.AU_QUARTIER, selectedStudent.AU_ADRESSE_GEO].filter(Boolean).join(" - ") || selectedStudent.AU_ADRESSE_POSTALE || "Non renseigné"}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Tuteur :{" "}
                          {selectedStudent.AU_TUTEURLEGAL ||
                            selectedStudent.AU_PERENOMPRENOMS ||
                            "Non renseigné"}{" "}
                          (
                          {selectedStudent.AU_CONTACTS ||
                            selectedStudent.AU_PERECONTACTS ||
                            "N/A"}
                          )
                        </p>
                        
                        {/* Résumé financier — séparation stricte Scolarité / Cantine / Transport */}
                        <div className="mt-3 pt-3 border-t border-indigo-100 dark:border-indigo-900 grid grid-cols-2 gap-2.5">
                          <div className="bg-white/50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-center">
                            <p className="text-[9px] uppercase font-bold text-slate-500">Total Versé (Scolarité)</p>
                            <p className="text-xs font-black text-emerald-600">
                              {formatCurrency(
                                studentEcheances
                                  .filter((e: any) => (e.service_type || "scolarite") === "scolarite")
                                  .reduce((sum: number, e: any) => sum + Number(e.montant_paye || 0), 0),
                              )}
                            </p>
                          </div>
                          <div className="bg-white/50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-center">
                            <p className="text-[9px] uppercase font-bold text-slate-500">Reste à Payer (Scolarité)</p>
                            <p className="text-xs font-black text-amber-600">
                              {formatCurrency(
                                studentEcheances
                                  .filter((e: any) => (e.service_type || "scolarite") === "scolarite")
                                  .reduce(
                                    (sum: number, e: any) =>
                                      sum + Math.max(0, Number(e.montant_prevu || 0) - Number(e.montant_paye || 0)),
                                    0,
                                  ),
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Cantine Summary (si concerné) */}
                        {(studentEcheances.some((e: any) => e.service_type === "cantine") || selectedStudent?.service_cantine || selectedStudent?.is_cantine) && (
                          <div className="mt-2 grid grid-cols-2 gap-2.5">
                            <div className="bg-sky-50/50 dark:bg-sky-950/30 p-2 rounded-lg border border-sky-200/60 dark:border-sky-800 text-center">
                              <p className="text-[9px] uppercase font-bold text-sky-700">Versé (Cantine)</p>
                              <p className="text-xs font-black text-sky-700">
                                {formatCurrency(
                                  studentEcheances
                                    .filter((e: any) => e.service_type === "cantine")
                                    .reduce((sum: number, e: any) => sum + Number(e.montant_paye || 0), 0)
                                )}
                              </p>
                            </div>
                            <div className="bg-sky-50/50 dark:bg-sky-950/30 p-2 rounded-lg border border-sky-200/60 dark:border-sky-800 text-center">
                              <p className="text-[9px] uppercase font-bold text-sky-700">Reste (Cantine)</p>
                              <p className="text-xs font-black text-sky-800">
                                {formatCurrency(
                                  studentEcheances
                                    .filter((e: any) => e.service_type === "cantine")
                                    .reduce(
                                      (sum: number, e: any) =>
                                        sum + Math.max(0, Number(e.montant_prevu || 0) - Number(e.montant_paye || 0)),
                                      0,
                                    )
                                )}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Transport Summary (si concerné) */}
                        {(studentEcheances.some((e: any) => e.service_type === "transport") || selectedStudent?.service_transport || selectedStudent?.is_transport) && (
                          <div className="mt-2 grid grid-cols-2 gap-2.5">
                            <div className="bg-amber-50/50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200/60 dark:border-amber-800 text-center">
                              <p className="text-[9px] uppercase font-bold text-amber-700">Versé (Transport/Car)</p>
                              <p className="text-xs font-black text-amber-700">
                                {formatCurrency(
                                  studentEcheances
                                    .filter((e: any) => e.service_type === "transport")
                                    .reduce((sum: number, e: any) => sum + Number(e.montant_paye || 0), 0)
                                )}
                              </p>
                            </div>
                            <div className="bg-amber-50/50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200/60 dark:border-amber-800 text-center">
                              <p className="text-[9px] uppercase font-bold text-amber-700">Reste (Transport/Car)</p>
                              <p className="text-xs font-black text-amber-800">
                                {formatCurrency(
                                  studentEcheances
                                    .filter((e: any) => e.service_type === "transport")
                                    .reduce(
                                      (sum: number, e: any) =>
                                        sum + Math.max(0, Number(e.montant_prevu || 0) - Number(e.montant_paye || 0)),
                                      0,
                                    )
                                )}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Global Recap Receipt Trigger */}
                        <div className="mt-3 flex items-center gap-2">
                          <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1 px-3 py-1.5 h-auto rounded-lg"
                            onClick={async () => {
                              try {
                                const recap = await apiClient.getRecuRecapitulatif(selectedStudent.id);
                                setCurrentRecu({
                                  ...recap,
                                  details_recu: {
                                    numero_recu: recap.recu_numero,
                                    montant: recap.total_general,
                                    motif: "Recu global recapitulatif",
                                    mode: "Multiples",
                                    caissier: "Comptabilité Hînneh",
                                    annee_scolaire: "2026-2027",
                                    date_creation: new Date()
                                  }
                                });
                                setOpenRecuModal(true);
                              } catch (err: any) {
                                toast({ variant: "destructive", title: "Erreur", description: String(err) });
                              }
                            }}
                          >
                            <FileText className="w-3.5 h-3.5" /> Reçu Récapitulatif Global
                          </Button>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedStudent(null);
                          setSearchStudent("");
                        }}
                        className="text-xs text-rose-600 hover:bg-rose-50"
                      >
                        Changer
                      </Button>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* STEP 2: MOTIF & SELECTION SCOLARITÉ / QUITTUS */}
            <Card className="border-indigo-100 dark:border-indigo-950 shadow-md">
              <CardHeader className="pb-3 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-indigo-600">
                  <Receipt className="w-5 h-5" /> 2. Motif d'Encaissement &
                  Détails
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                <div>
                  <Label className="text-xs font-semibold text-slate-600">
                    Nature / Motif du Règlement *
                  </Label>
                  <Select value={motif} onValueChange={handleMotifChange}>
                    <SelectTrigger className="mt-1 font-semibold text-slate-900 dark:text-white">
                      <SelectValue placeholder="Choisir le motif d'encaissement" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pack_global" className="font-semibold text-indigo-700 dark:text-indigo-300">
                        Forfait Global (Scolarité + Cantine + Transport)
                      </SelectItem>
                      <SelectItem value="scolarite">
                        Frais de Scolarité (Échéancier Officiel)
                      </SelectItem>
                      <SelectItem value="inscription">
                        Frais d'Inscription / Réinscription
                      </SelectItem>
                      <SelectItem value="frais_inscription">
                        Frais d'Inscription — Solde du 1er Versement (Dépôt)
                      </SelectItem>
                      <SelectItem value="cantine">
                        Cantine Scolaire
                      </SelectItem>
                      <SelectItem value="transport">
                        Transport Scolaire / Car
                      </SelectItem>
                      <SelectItem value="uniforme">
                        Achats de Tenues & Uniformes Scolaires
                      </SelectItem>
                      <SelectItem value="achat_divers">
                        Achats Divers & Fournitures Scolaires
                      </SelectItem>
                      <SelectItem value="cours_anglais">
                        Cours d'Anglais Renforcé
                      </SelectItem>
                      <SelectItem value="cours_informatique">
                        Cours d'Informatique / TICE
                      </SelectItem>
                      <SelectItem value="frais_divers">
                        Autres Frais Divers (Soutien, Activités...)
                      </SelectItem>
                      <SelectItem value="autre">
                        Autre Règlement
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* MOTIF: FORFAIT GLOBAL / TOUT COMPRIS (SCOLARITÉ + CANTINE + TRANSPORT) */}
                {motif === "pack_global" && (
                  <div className="space-y-3 pt-2 border-t border-indigo-200 dark:border-indigo-800">
                    <div className="p-4 rounded-xl border-2 border-indigo-300 dark:border-indigo-700 bg-linear-to-br from-indigo-50/90 via-sky-50/50 to-amber-50/40 dark:from-indigo-950/40 dark:to-slate-900/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                          Configuration du Forfait Tout Compris
                        </span>
                        <Badge className="bg-indigo-600 text-white text-[10px] font-bold">
                          Formule Combinée
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Cochez les services à inclure dans ce règlement global :
                      </p>

                      {/* 1. Frais de Scolarité */}
                      <div className={`p-3 rounded-lg border transition-all ${packIncludeScolarite ? "bg-white dark:bg-slate-900 border-indigo-300 shadow-xs" : "bg-slate-100/70 dark:bg-slate-800/50 border-slate-200 opacity-60"}`}>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={packIncludeScolarite}
                              onChange={(e) => {
                                setPackIncludeScolarite(e.target.checked);
                                markCustomMontant(false);
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                                📚 Frais de Scolarité Annuelle
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Reste dû sur l'échéancier officiel de scolarité
                              </p>
                            </div>
                          </label>
                          <span className="font-extrabold text-xs text-indigo-700 dark:text-indigo-300">
                            {formatCurrency(packScolariteDue)}
                          </span>
                        </div>
                      </div>

                      {/* 2. Cantine Scolaire */}
                      <div className={`p-3 rounded-lg border transition-all ${packIncludeCantine ? "bg-white dark:bg-slate-900 border-sky-300 shadow-xs" : "bg-slate-100/70 dark:bg-slate-800/50 border-slate-200 opacity-60"}`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={packIncludeCantine}
                              onChange={(e) => {
                                setPackIncludeCantine(e.target.checked);
                                markCustomMontant(false);
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                                🍱 Cantine Scolaire
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Abonnement complet ({packCantineMonths} mois : 9 mensualités)
                              </p>
                            </div>
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                              <span className="text-[10px] text-slate-500">Tarif école :</span>
                              <input
                                type="number"
                                value={cantineMensuelTarif}
                                onChange={(e) => {
                                  setCantineMensuelTarif(Number(e.target.value) || 0);
                                  markCustomMontant(false);
                                }}
                                className="w-16 h-5 text-[11px] font-bold text-sky-700 text-right bg-transparent border-none p-0 focus:ring-0"
                              />
                              <span className="text-[10px] text-slate-600 font-semibold">F/m</span>
                            </div>
                            <span className="font-extrabold text-xs text-sky-700 dark:text-sky-300">
                              {formatCurrency(packCantineDue)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 3. Transport Scolaire */}
                      <div className={`p-3 rounded-lg border transition-all ${packIncludeTransport ? "bg-white dark:bg-slate-900 border-emerald-300 shadow-xs" : "bg-slate-100/70 dark:bg-slate-800/50 border-slate-200 opacity-60"}`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={packIncludeTransport}
                              onChange={(e) => {
                                setPackIncludeTransport(e.target.checked);
                                markCustomMontant(false);
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                                🚌 Transport Scolaire / Car
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Abonnement complet ({packTransportMonths} mois : 9 mensualités)
                              </p>
                            </div>
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                              <span className="text-[10px] text-slate-500">Tarif zone :</span>
                              <input
                                type="number"
                                value={transportMensuelTarif}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  setTransportMensuelTarif(val);
                                  setPackTransportZoneTarif(val);
                                  markCustomMontant(false);
                                }}
                                className="w-16 h-5 text-[11px] font-bold text-emerald-700 text-right bg-transparent border-none p-0 focus:ring-0"
                              />
                              <span className="text-[10px] text-slate-600 font-semibold">F/m</span>
                            </div>
                            <span className="font-extrabold text-xs text-emerald-700 dark:text-emerald-300">
                              {formatCurrency(packTransportDue)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Récapitulatif Total du Forfait */}
                      <div className="pt-2 border-t border-indigo-200/80 dark:border-indigo-800 flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                          Total Forfait Calculé :
                        </span>
                        <span className="text-sm font-black text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-950 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800">
                          {formatCurrency(packTotalComputed)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* MOTIF: ACHATS DE TENUES & UNIFORMES (NIVEAU/CYCLE & GENRE M/S) */}
                {motif === "uniforme" && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/80 dark:bg-blue-950/30 text-xs space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                          <Shirt className="w-4 h-4 text-blue-600" />
                          Achats de Tenues Scolaires (Niveaux / Cycles & Genre M / S)
                        </span>
                      </div>

                      {/* Double Barre de Filtres : Cycle & Genre */}
                      <div className="space-y-1.5 pt-1 border-t border-blue-200/60 dark:border-blue-900/60">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-semibold text-slate-500 min-w-[70px]">Cycle :</span>
                          <div className="flex items-center gap-1 flex-wrap">
                            {[
                              { id: 'tous', label: 'Tous' },
                              { id: 'Collège', label: '🏫 Collège' },
                              { id: 'Collège 2nd cycle', label: '🏫 Lycée' },
                              { id: 'Primaire', label: '🏫 Primaire' },
                              { id: 'Maternelle', label: '🏫 Maternelle' },
                            ].map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => setCaisseTenueCycle(c.id)}
                                className={`px-2 py-0.5 text-[10px] rounded-md font-bold transition-all ${
                                  caisseTenueCycle === c.id
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'bg-white/80 dark:bg-slate-800 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {c.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-semibold text-slate-500 min-w-[70px]">Genre :</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setCaisseTenueGenre('tous')}
                              className={`px-2 py-0.5 text-[10px] rounded-md font-bold transition-all ${
                                caisseTenueGenre === 'tous'
                                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                  : 'bg-white/80 dark:bg-slate-800 text-slate-600 border border-slate-200'
                              }`}
                            >
                              Tous
                            </button>
                            <button
                              type="button"
                              onClick={() => setCaisseTenueGenre('M')}
                              className={`px-2 py-0.5 text-[10px] rounded-md font-bold transition-all flex items-center gap-1 ${
                                caisseTenueGenre === 'M'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-slate-800 dark:text-blue-300'
                              }`}
                            >
                              👦 Genre M (Garçon)
                            </button>
                            <button
                              type="button"
                              onClick={() => setCaisseTenueGenre('S')}
                              className={`px-2 py-0.5 text-[10px] rounded-md font-bold transition-all flex items-center gap-1 ${
                                caisseTenueGenre === 'S'
                                  ? 'bg-pink-600 text-white shadow-xs'
                                  : 'bg-pink-100 text-pink-800 border border-pink-200 dark:bg-slate-800 dark:text-pink-300'
                              }`}
                            >
                              👧 Genre S (Fille)
                            </button>
                          </div>
                        </div>
                      </div>

                      <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                        Cliquez sur une tenue pour pré-remplir automatiquement le libellé et le montant configuré :
                      </p>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {getFraisDiversList(currentStudentSchoolCode, currentStudentVille)
                          .filter((fd) => (fd.categorie === "tenue" || fd.code.includes("tenue") || fd.code.includes("polo")) && fd.actif)
                          .filter((fd) => caisseTenueGenre === 'tous' || !fd.genre || fd.genre === 'tous' || fd.genre === caisseTenueGenre)
                          .filter((fd) => caisseTenueCycle === 'tous' || !fd.cycle || fd.cycle === 'tous' || fd.cycle === caisseTenueCycle)
                          .map((fd) => (
                            <button
                              key={fd.id}
                              type="button"
                              onClick={() => {
                                setMontantEncaissement(String(fd.montant));
                                setObservation(fd.libelle);
                                markCustomMontant(true);
                              }}
                              className={`px-2.5 py-1 text-[11px] rounded-lg border bg-white dark:bg-slate-800 hover:opacity-90 font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                                fd.genre === 'M'
                                  ? 'border-blue-300 text-blue-950 hover:bg-blue-50 dark:text-blue-200'
                                  : fd.genre === 'S'
                                  ? 'border-pink-300 text-pink-950 hover:bg-pink-50 dark:text-pink-200'
                                  : 'border-slate-300 text-slate-900 hover:bg-slate-50 dark:text-slate-200'
                              }`}
                            >
                              {fd.cycle && fd.cycle !== 'tous' && (
                                <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 text-[9px] px-1 py-0.2 rounded font-bold">
                                  {fd.cycle === 'Collège 2nd cycle' ? 'Lycée' : fd.cycle}
                                </span>
                              )}
                              {fd.genre === 'M' ? (
                                <span className="bg-blue-600 text-white text-[9px] px-1 py-0.2 rounded font-bold">M</span>
                              ) : fd.genre === 'S' ? (
                                <span className="bg-pink-600 text-white text-[9px] px-1 py-0.2 rounded font-bold">S</span>
                              ) : null}
                              <span>{fd.libelle}</span>
                              <strong className={`font-bold ${fd.genre === 'S' ? 'text-pink-700 dark:text-pink-300' : 'text-blue-700 dark:text-blue-300'}`}>
                                {fd.montant.toLocaleString("fr-FR")} F
                              </strong>
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* MOTIF: ACHATS DIVERS & FOURNITURES */}
                {motif === "achat_divers" && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/80 dark:bg-amber-950/30 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                          <Package className="w-4 h-4 text-amber-600" />
                          Achats Divers & Fournitures Scolaires
                        </span>
                        <Badge className="bg-amber-600 text-white text-[10px]">
                          Catalogue Achats
                        </Badge>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                        Sélectionnez un article ou saisissez votre montant et libellé personnalisé :
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {getFraisDiversList(currentStudentSchoolCode, currentStudentVille)
                          .filter((fd) => (fd.categorie === "achat_divers" || fd.code.includes("achat") || fd.code.includes("fourniture") || fd.code.includes("kit") || fd.code.includes("livre")) && fd.actif)
                          .map((fd) => (
                            <button
                              key={fd.id}
                              type="button"
                              onClick={() => {
                                setMontantEncaissement(String(fd.montant));
                                setObservation(fd.libelle);
                                markCustomMontant(true);
                              }}
                              className="px-2.5 py-1 text-[11px] rounded-lg border border-amber-300 bg-white dark:bg-slate-800 hover:bg-amber-100 font-semibold text-amber-950 dark:text-amber-200 flex items-center gap-1.5 transition-colors shadow-xs"
                            >
                              <span>{fd.libelle}</span>
                              <strong className="text-amber-700 dark:text-amber-300 font-bold">
                                {fd.montant.toLocaleString("fr-FR")} F
                              </strong>
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* MOTIF: FRAIS DIVERS (COURS D'ANGLAIS, INFORMATIQUE, ETC.) */}
                {["cours_anglais", "cours_informatique", "frais_divers"].includes(motif) && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/80 dark:bg-emerald-950/30 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-emerald-600" />
                          {motif === "cours_anglais"
                            ? "Cours d'Anglais Renforcé"
                            : motif === "cours_informatique"
                            ? "Cours d'Informatique & TICE"
                            : "Prestation / Frais Divers"}
                        </span>
                        <Badge className="bg-emerald-600 text-white text-[10px]">
                          Catalogue Frais Divers
                        </Badge>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                        Sélectionnez une option du catalogue ou ajustez le montant et l'observation ci-dessous :
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {getFraisDiversList(currentStudentSchoolCode, currentStudentVille)
                          .filter((fd) =>
                            motif === "cours_anglais"
                              ? fd.code === "cours_anglais"
                              : motif === "cours_informatique"
                              ? fd.code === "cours_informatique"
                              : fd.categorie !== "tenue" && fd.categorie !== "achat_divers" && fd.code !== "cours_anglais" && fd.code !== "cours_informatique"
                          )
                          .map((fd) => (
                            <button
                              key={fd.id}
                              type="button"
                              onClick={() => {
                                setMontantEncaissement(String(fd.montant));
                                setObservation(fd.libelle);
                                markCustomMontant(true);
                              }}
                              className="px-2.5 py-1 text-[11px] rounded-lg border border-emerald-300 bg-white dark:bg-slate-800 hover:bg-emerald-100 font-semibold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5 transition-colors shadow-xs"
                            >
                              <span>{fd.libelle}</span>
                              <strong className="text-emerald-700 dark:text-emerald-300 font-bold">
                                {fd.montant.toLocaleString("fr-FR")} F
                              </strong>
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* MOTIF: FRAIS D'INSCRIPTION (SOLDE DU 1ER VERSEMENT APRÈS FRAIS ANNEXES) */}
                {motif === "frais_inscription" && selectedStudent && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    {!premierVersementTranche ? (
                      <div className="p-4 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200">
                        Aucune tranche "1er versement" trouvée dans l'échéancier de cet élève. Rendez-vous dans l'onglet "Échéancier" pour lui en attribuer un.
                      </div>
                    ) : !fraisAnnexePaye ? (
                      <div className="p-4 bg-rose-50 text-rose-800 text-xs rounded-xl border border-rose-200 font-semibold">
                        ⛔ Les frais annexes (carte, tenue, kit…) doivent d'abord être réglés en espèces au niveau du processus d'inscription. L'encaissement des frais d'inscription est bloqué en attendant.
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/30 text-xs space-y-1">
                        <p className="font-bold text-indigo-900 dark:text-indigo-200">
                          1er versement : {formatCurrency(premierVersementTranche.montant_prevu)}
                        </p>
                        <p className="text-indigo-700 dark:text-indigo-300">
                          Frais annexes déjà réglés (espèces) — Frais d'inscription déjà versés : {formatCurrency(premierVersementTranche.montant_paye)}
                        </p>
                        <p className="font-bold text-indigo-900 dark:text-indigo-200">
                          Solde restant dû (frais d'inscription) : {formatCurrency(soldeFraisInscription)}
                        </p>
                        {soldeFraisInscription <= 0 && (
                          <p className="text-emerald-600 font-bold">✅ Frais d'inscription intégralement soldés.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* MOTIF: SCOLARITÉ (ÉCHEANCIER BREAKDOWN) */}
                {motif === "scolarite" && selectedStudent && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 text-[11px] text-emerald-800 dark:text-emerald-300">
                      <span className="font-semibold">
                        Montants actualisés automatiquement depuis la plateforme
                        bancaire
                        {bankState?.sync_auto === false &&
                          " (synchronisation auto désactivée)"}
                      </span>
                      <span className="flex items-center gap-2">
                        {bankTxStudent.filter((t) => t.statut === "reussi")
                          .length > 0 && (
                          <span>
                            Réglé via banque :{" "}
                            <strong>
                              {formatCurrency(
                                bankTxStudent
                                  .filter((t) => t.statut === "reussi")
                                  .reduce(
                                    (sum, t) => sum + Number(t.montant || 0),
                                    0,
                                  ),
                              )}
                            </strong>
                          </span>
                        )}
                        {lastAutoRefresh && (
                          <span>
                            · maj {lastAutoRefresh.toLocaleTimeString("fr-FR", { timeZone: TIMEZONE_GMT })}
                          </span>
                        )}
                        <button
                          type="button"
                          className="underline font-semibold"
                          onClick={() => {
                            refreshStudentDues(selectedStudent.id, false);
                            loadBankState();
                          }}
                        >
                          Actualiser
                        </button>
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Label className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                        <Clock className="w-4 h-4" /> Sélectionner la ou les tranches de scolarité à régler :
                      </Label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={selectAllScolariteTranches}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-indigo-700 bg-indigo-100/80 hover:bg-indigo-200 border border-indigo-300 transition-colors flex items-center gap-1"
                        >
                          ⚡ Régler toute la Scolarité ({formatCurrency(packScolariteDue)})
                        </button>
                        {selectedEcheanceIds.length > 0 && (
                          <button
                            type="button"
                            onClick={deselectAllScolariteTranches}
                            className="px-2 py-1 rounded-lg text-[11px] font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            Décocher tout
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Origine des montants : l'échéancier propre à l'élève, ou à défaut le
                        modèle tarifaire de l'école qui a servi à les construire. */}
                    {echeancierOrigine.source !== "eleve" &&
                      studentEcheances.length > 0 && (
                        <div className="p-2.5 rounded-xl border border-sky-200 bg-sky-50 dark:bg-sky-950/30 text-[11px] text-sky-900 dark:text-sky-200">
                          Aucun échéancier enregistré pour cet élève : montants issus de{" "}
                          <strong>
                            {echeancierOrigine.source === "grille"
                              ? "la Grille Tarifaire Officielle"
                              : "les Frais d'Écolage de l'Économat"}
                          </strong>
                          {echeancierOrigine.label ? ` — ${echeancierOrigine.label}` : ""}.
                        </div>
                      )}

                    {studentEcheances.filter((e: any) => (e.service_type || "scolarite") === "scolarite").length === 0 ? (
                      <div className="p-4 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200">
                        Aucun échéancier de scolarité pour cet élève, et aucun tarif de sa classe dans la
                        Grille Tarifaire Officielle ni dans les Frais d'Écolage. Attribuez-lui
                        un échéancier dans l'onglet "Échéancier", ou complétez la grille
                        tarifaire de l'école.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {studentEcheances
                          .filter((e: any) => (e.service_type || "scolarite") === "scolarite")
                          .map((ech) => {
                          const isPaid = ech.statut === "paye";
                          const isDesabonne = ech.statut === "desabonne";
                          const isSelected = selectedEcheanceIds.includes(
                            ech.id,
                          );
                          const reste = isDesabonne ? 0 : Number(ech.montant_prevu) - Number(ech.montant_paye);

                          return (
                            <div
                              key={ech.id}
                              onClick={() =>
                                !isPaid && !isDesabonne && toggleEcheanceSelection(ech)
                              }
                              className={`p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${isPaid || isDesabonne ? "bg-slate-100 opacity-60 cursor-not-allowed border-slate-200" : isSelected ? "bg-indigo-50 border-indigo-400 shadow-sm" : "bg-slate-50 hover:bg-slate-100 border-slate-200"}`}
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={isSelected || isPaid}
                                  disabled={isPaid || isDesabonne}
                                />
                                <div>
                                  <p className="font-bold text-xs text-slate-900 dark:text-white">
                                    {ech.libelle}
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    Date limite :{" "}
                                    <span className="font-semibold text-slate-700">
                                      {isDesabonne ? "—" : formatDate(ech.date_echeance)}
                                    </span>
                                  </p>
                                </div>
                              </div>

                              <div className="text-right">
                                <p className="text-xs font-bold text-slate-900 dark:text-white">
                                  {isDesabonne ? "—" : formatCurrency(ech.montant_prevu)}
                                </p>
                                {isPaid ? (
                                  <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-300 text-[10px]">
                                    Déjà Payé
                                  </Badge>
                                ) : isDesabonne ? (
                                  <Badge className="bg-slate-200 text-slate-700 border-slate-300 text-[10px] font-bold">
                                    Désabonné
                                  </Badge>
                                ) : (
                                  <span className="text-xs font-bold text-indigo-600">
                                    Reste : {formatCurrency(reste)}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* MOTIF: CANTINE (FORMULE MENSUEL / TRIMESTRIEL / ANNUEL) */}
                {motif === "cantine" && (
                  <div className="space-y-3 p-3.5 bg-sky-50 dark:bg-sky-950/30 rounded-xl border border-sky-200 dark:border-sky-800 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5 text-xs">
                        🍱 Formules de Cantine Scolaire
                      </span>
                    </div>

                    {/* Tarif mensuel cantine de l'établissement (modifiable librement) */}
                    <div className="flex items-center justify-between gap-2 p-2 bg-white/80 dark:bg-slate-900/60 rounded-lg border border-sky-200 dark:border-sky-800 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-[11px] font-bold text-sky-950 dark:text-sky-200">
                          Tarif mensuel de l'établissement :
                        </Label>
                        <span className="text-[10px] text-slate-500">(Varie selon l'école)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={cantineMensuelTarif}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setCantineMensuelTarif(val);
                            if (optionCantineCaisse === "annuel") setMontantEncaissement(String(9 * val));
                            else if (optionCantineCaisse === "trimestriel") setMontantEncaissement(String(3 * val));
                            else setMontantEncaissement(String(val));
                            markCustomMontant(false);
                          }}
                          className="w-24 h-7 text-xs font-bold text-sky-700 text-right bg-white dark:bg-slate-950"
                        />
                        <span className="text-[11px] font-bold text-slate-600">FCFA / mois</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Formule de paiement *
                        </Label>
                        <div className="grid grid-cols-3 gap-1.5 mt-1">
                          <button
                            type="button"
                            className={`py-1.5 px-1.5 rounded-lg border text-[11px] font-bold transition-colors text-center ${
                              optionCantineCaisse === "mensuel"
                                ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                            }`}
                            onClick={() => {
                              setOptionCantineCaisse("mensuel");
                              setMontantEncaissement(String(cantineMensuelTarif || 15000));
                              markCustomMontant(false);
                              setPeriodeCantineCaisse("Octobre");
                            }}
                          >
                            1 Mois ({formatCurrency(cantineMensuelTarif || 15000)})
                          </button>
                          <button
                            type="button"
                            className={`py-1.5 px-1.5 rounded-lg border text-[11px] font-bold transition-colors text-center ${
                              optionCantineCaisse === "trimestriel"
                                ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                            }`}
                            onClick={() => {
                              setOptionCantineCaisse("trimestriel");
                              setMontantEncaissement(String((cantineMensuelTarif || 15000) * 3));
                              markCustomMontant(false);
                              setPeriodeCantineCaisse("Trimestre 1");
                            }}
                          >
                            Trimestre ({formatCurrency((cantineMensuelTarif || 15000) * 3)})
                          </button>
                          <button
                            type="button"
                            className={`py-1.5 px-1.5 rounded-lg border text-[11px] font-extrabold transition-colors text-center ${
                              optionCantineCaisse === "annuel"
                                ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                                : "bg-white text-sky-700 border-sky-300 hover:bg-sky-100"
                            }`}
                            onClick={() => {
                              setOptionCantineCaisse("annuel");
                              setMontantEncaissement(String((cantineMensuelTarif || 15000) * 9));
                              markCustomMontant(false);
                              setPeriodeCantineCaisse("Année Scolaire Complète (9 Mois)");
                            }}
                          >
                            🌟 Totalité Année ({formatCurrency((cantineMensuelTarif || 15000) * 9)})
                          </button>
                        </div>
                      </div>

                      <div>
                        <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Période à régler *
                        </Label>
                        <Select
                          value={periodeCantineCaisse}
                          onValueChange={(v) => setPeriodeCantineCaisse(v)}
                        >
                          <SelectTrigger className="mt-1 bg-white dark:bg-slate-900">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {optionCantineCaisse === "annuel" ? (
                              <SelectItem value="Année Scolaire Complète (9 Mois)">
                                🌟 Année Scolaire Complète (9 Mois = {formatCurrency((cantineMensuelTarif || 15000) * 9)})
                              </SelectItem>
                            ) : optionCantineCaisse === "mensuel" ? (
                              [
                                "Octobre",
                                "Novembre",
                                "Décembre",
                                "Janvier",
                                "Février",
                                "Mars",
                                "Avril",
                                "Mai",
                                "Juin",
                              ].map((m) => (
                                <SelectItem key={m} value={m}>
                                  {m} ({formatCurrency(cantineMensuelTarif || 15000)})
                                </SelectItem>
                              ))
                            ) : (
                              [
                                "Trimestre 1 (Sep - Déc)",
                                "Trimestre 2 (Jan - Mar)",
                                "Trimestre 3 (Avr - Juin)",
                              ].map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t} ({formatCurrency((cantineMensuelTarif || 15000) * 3)})
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* MOTIF: TRANSPORT (FORMULE MENSUEL / TRIMESTRIEL / ANNUEL) */}
                {motif === "transport" && (
                  <div className="space-y-3 p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 text-xs">
                        🚌 Formules de Transport Scolaire / Car
                      </span>
                    </div>

                    {/* Zone & Tarif mensuel transport de l'établissement */}
                    <div className="space-y-2 p-2 bg-white/80 dark:bg-slate-900/60 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-[11px] font-bold text-emerald-950 dark:text-emerald-200">
                            Tarif mensuel car / zone :
                          </Label>
                          <span className="text-[10px] text-slate-500">(Varie selon l'école & la zone)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={transportMensuelTarif}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setTransportMensuelTarif(val);
                              setPackTransportZoneTarif(val);
                              if (optionTransportCaisse === "annuel") setMontantEncaissement(String(9 * val));
                              else if (optionTransportCaisse === "trimestriel") setMontantEncaissement(String(3 * val));
                              else setMontantEncaissement(String(val));
                              markCustomMontant(false);
                            }}
                            className="w-24 h-7 text-xs font-bold text-emerald-700 text-right bg-white dark:bg-slate-950"
                          />
                          <span className="text-[11px] font-bold text-slate-600">FCFA / mois</span>
                        </div>
                      </div>

                      {/* Sélecteur de zone si zones configurées */}
                      {Array.isArray(officialTarifs.transportZones) && officialTarifs.transportZones.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-emerald-100 dark:border-emerald-900">
                          <span className="text-[10px] font-bold text-slate-500">Zones de l'établissement :</span>
                          {officialTarifs.transportZones.map((z: any, zIdx: number) => {
                            const zTarif = Number(z.montant_mensuel || z.tarif || 18000);
                            const zNom = z.libelle || z.nom || `Zone ${zIdx + 1}`;
                            return (
                              <button
                                key={z.id || zIdx}
                                type="button"
                                onClick={() => {
                                  setTransportMensuelTarif(zTarif);
                                  setPackTransportZoneTarif(zTarif);
                                  if (optionTransportCaisse === "annuel") setMontantEncaissement(String(9 * zTarif));
                                  else if (optionTransportCaisse === "trimestriel") setMontantEncaissement(String(3 * zTarif));
                                  else setMontantEncaissement(String(zTarif));
                                  markCustomMontant(false);
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors border ${
                                  transportMensuelTarif === zTarif
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                    : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                                }`}
                              >
                                {zNom} ({formatCurrency(zTarif)})
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Formule de paiement *
                        </Label>
                        <div className="grid grid-cols-3 gap-1.5 mt-1">
                          <button
                            type="button"
                            className={`py-1.5 px-1.5 rounded-lg border text-[11px] font-bold transition-colors text-center ${
                              optionTransportCaisse === "mensuel"
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                            }`}
                            onClick={() => {
                              setOptionTransportCaisse("mensuel");
                              const u = transportMensuelTarif || packTransportZoneTarif || 18000;
                              setMontantEncaissement(String(u));
                              markCustomMontant(false);
                              setPeriodeTransportCaisse("Octobre");
                            }}
                          >
                            1 Mois ({formatCurrency(transportMensuelTarif || packTransportZoneTarif || 18000)})
                          </button>
                          <button
                            type="button"
                            className={`py-1.5 px-1.5 rounded-lg border text-[11px] font-bold transition-colors text-center ${
                              optionTransportCaisse === "trimestriel"
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                            }`}
                            onClick={() => {
                              setOptionTransportCaisse("trimestriel");
                              const u = (transportMensuelTarif || packTransportZoneTarif || 18000) * 3;
                              setMontantEncaissement(String(u));
                              markCustomMontant(false);
                              setPeriodeTransportCaisse("Trimestre 1");
                            }}
                          >
                            Trimestre ({formatCurrency((transportMensuelTarif || packTransportZoneTarif || 18000) * 3)})
                          </button>
                          <button
                            type="button"
                            className={`py-1.5 px-1.5 rounded-lg border text-[11px] font-extrabold transition-colors text-center ${
                              optionTransportCaisse === "annuel"
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                            }`}
                            onClick={() => {
                              setOptionTransportCaisse("annuel");
                              const u = (transportMensuelTarif || packTransportZoneTarif || 18000) * 9;
                              setMontantEncaissement(String(u));
                              markCustomMontant(false);
                              setPeriodeTransportCaisse("Année Scolaire Complète (9 Mois)");
                            }}
                          >
                            🌟 Totalité Année ({formatCurrency((transportMensuelTarif || packTransportZoneTarif || 18000) * 9)})
                          </button>
                        </div>
                      </div>

                      <div>
                        <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Période à régler *
                        </Label>
                        <Select
                          value={periodeTransportCaisse}
                          onValueChange={(v) => setPeriodeTransportCaisse(v)}
                        >
                          <SelectTrigger className="mt-1 bg-white dark:bg-slate-900">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {optionTransportCaisse === "annuel" ? (
                              <SelectItem value="Année Scolaire Complète (9 Mois)">
                                🌟 Année Scolaire Complète (9 Mois = {formatCurrency((transportMensuelTarif || packTransportZoneTarif || 18000) * 9)})
                              </SelectItem>
                            ) : optionTransportCaisse === "mensuel" ? (
                              [
                                "Octobre",
                                "Novembre",
                                "Décembre",
                                "Janvier",
                                "Février",
                                "Mars",
                                "Avril",
                                "Mai",
                                "Juin",
                              ].map((m) => (
                                <SelectItem key={m} value={m}>
                                  {m} ({formatCurrency(transportMensuelTarif || packTransportZoneTarif || 18000)})
                                </SelectItem>
                              ))
                            ) : (
                              [
                                "Trimestre 1 (Sep - Déc)",
                                "Trimestre 2 (Jan - Mar)",
                                "Trimestre 3 (Avr - Juin)",
                              ].map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t} ({formatCurrency((transportMensuelTarif || packTransportZoneTarif || 18000) * 3)})
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Solde disponible pour cantine et transport s'il existe des tranches */}
                {["cantine", "transport"].includes(motif) && selectedStudent && soldeDisponibleMotifCourant !== null && (
                  <div className="pt-2">
                    <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/30 text-xs">
                      <p className="font-bold text-indigo-900 dark:text-indigo-200">
                        Solde planifié disponible ({motif}) : {formatCurrency(soldeDisponibleMotifCourant || 0)}
                      </p>
                    </div>
                  </div>
                )}

                {/* STEP 3: MONTANT & MODE DE PAIEMENT */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <Label
                      htmlFor="montantEncaissement"
                      className="text-xs font-semibold text-slate-600"
                    >
                      Montant à Encaisser (FCFA) *
                    </Label>
                    <Input
                      id="montantEncaissement"
                      type="number"
                      placeholder="Ex: 50000"
                      value={montantEncaissement}
                      onChange={(e) => {
                        setMontantEncaissement(e.target.value);
                        markCustomMontant(true);
                      }}
                      className="text-lg font-bold text-indigo-600 mt-1"
                    />
                    {isCustomMontant && (
                      <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-semibold text-amber-600">
                          ✍️ Montant personnalisé (conservé)
                        </span>
                        <button
                          type="button"
                          className="underline font-semibold text-indigo-600 hover:text-indigo-800"
                          onClick={() => {
                            const auto = computeMontantAuto();
                            if (auto !== null) setMontantEncaissement(auto);
                            markCustomMontant(false);
                          }}
                        >
                          Rétablir le montant dû
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label
                      htmlFor="modePaiement"
                      className="text-xs font-semibold text-slate-600"
                    >
                      Mode de Règlement *
                    </Label>
                    <Select
                      value={modePaiement}
                      onValueChange={setModePaiement}
                    >
                      <SelectTrigger id="modePaiement" className="mt-1 font-semibold text-slate-900 dark:text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="especes">
                          Espèces (Guichet)
                        </SelectItem>
                        <SelectItem value="mtn_money">
                          Mobile Money — MTN Money
                        </SelectItem>
                        <SelectItem value="orange_money">
                          Mobile Money — Orange Money
                        </SelectItem>
                        <SelectItem value="moov_money">
                          Mobile Money — Moov Money
                        </SelectItem>
                        <SelectItem value="wave">
                          Mobile Money — Wave
                        </SelectItem>
                        <SelectItem value="coris_bank">
                          Coris Bank (Dépôt / Virement)
                        </SelectItem>
                        <SelectItem value="cheque">
                          Chèque bancaire
                        </SelectItem>
                        <SelectItem value="virement">
                          Virement bancaire
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {modePaiement !== "especes" && (
                  <div className="bg-indigo-50/60 dark:bg-indigo-950/30 p-3 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 space-y-1.5">
                    <Label
                      htmlFor="numTx"
                      className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center justify-between"
                    >
                      <span>Numéro de Transaction / Référence Opérateur *</span>
                      <span className="text-[10px] font-normal text-indigo-700 dark:text-indigo-400">
                        {modePaiement.includes("mtn") ? "Réf. MTN Money" : modePaiement.includes("orange") ? "Réf. Orange Money" : modePaiement.includes("moov") ? "Réf. Moov Money" : modePaiement.includes("wave") ? "Réf. Wave" : modePaiement.includes("coris") ? "N° Bordereau Coris Bank" : "Réf. Transaction / Chèque"}
                      </span>
                    </Label>
                    <Input
                      id="numTx"
                      placeholder={
                        modePaiement.includes("mtn")
                          ? "Ex: MTN-87654321 / CI.MTN.98765"
                          : modePaiement.includes("orange")
                          ? "Ex: OM-87654321 / CI260830..."
                          : modePaiement.includes("moov")
                          ? "Ex: MOOV-87654321 / MOOV.CI.4455"
                          : modePaiement.includes("wave")
                          ? "Ex: WAVE-REF-998877"
                          : modePaiement.includes("coris")
                          ? "Ex: CORIS-BORD-123456 / VIR-CB-789"
                          : "Ex: CHQ-0098765 / VIR-987654"
                      }
                      value={numTx}
                      onChange={(e) => setNumTx(e.target.value)}
                      className="mt-1 bg-white dark:bg-slate-900 font-mono font-bold text-xs"
                    />
                  </div>
                )}

                <div>
                  <Label
                    htmlFor="observation"
                    className="text-xs font-semibold text-slate-600"
                  >
                    Observation / Remarque sur le reçu (optionnel)
                  </Label>
                  <Textarea
                    id="observation"
                    placeholder="Ex: Versement effectué par la mère..."
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    className="mt-1 h-16 text-xs"
                  />
                </div>
              </CardContent>

              <div className="p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">
                    Montant net à percevoir :
                  </p>
                  <p className="text-xl font-extrabold text-indigo-600">
                    {formatCurrency(parseFloat(montantEncaissement) || 0)}
                  </p>
                </div>

                <Button
                  onClick={handleEncaissementSubmit}
                  disabled={
                    submitting ||
                    !selectedStudent ||
                    !montantEncaissement ||
                    (motif === "frais_inscription" &&
                      (!fraisAnnexePaye || soldeFraisInscription <= 0))
                  }
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-5 text-sm gap-2 shadow-lg"
                >
                  {submitting
                    ? "Traitement en cours..."
                    : "Valider & Imprimer le Reçu"}
                </Button>
              </div>
            </Card>
          </div>

          {/* RIGHT PANEL: JOURNAL DE CAISSE DU JOUR & REÇUS (COL 5) */}
          <div className="lg:col-span-5 space-y-6">
            {/* JOURNAL SUMMARY CARD & HISTORIQUES ANTERIEURS */}
            <Card className="shadow-md border-indigo-100 dark:border-indigo-950">
              <Tabs defaultValue="today" className="w-full">
                <CardHeader className="pb-3 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <TabsList className="grid grid-cols-2 sm:grid-cols-4 bg-slate-100 dark:bg-slate-800 w-full sm:w-auto h-auto p-1 gap-1 rounded-xl">
                      <TabsTrigger
                        value="today"
                        className="text-xs font-semibold gap-1.5 py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        Jour ({journal.nb_encaissements || 0})
                      </TabsTrigger>
                      <TabsTrigger
                        value="history"
                        className="text-xs font-semibold gap-1.5 py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs"
                      >
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        Par date
                      </TabsTrigger>
                      <TabsTrigger
                        value="periodic"
                        className="text-xs font-semibold gap-1.5 py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs"
                        onClick={() => {
                          if (!periodData?.encaissements?.length) {
                            loadPeriodData();
                          }
                        }}
                      >
                        <CalendarRange className="w-3.5 h-3.5 text-slate-500" />
                        Périodes
                      </TabsTrigger>
                      <TabsTrigger
                        value="advanced"
                        className="text-xs font-semibold gap-1.5 py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs"
                        onClick={() => {
                          if (!advData?.encaissements?.length) {
                            loadAdvancedData();
                          }
                        }}
                      >
                        <Search className="w-3.5 h-3.5 text-slate-500" />
                        Recherche avancée
                      </TabsTrigger>
                    </TabsList>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        loadData();
                        loadHistoryData(selectedHistoryDate);
                        loadAdvancedData();
                      }}
                      className="h-7 w-7 p-0 shrink-0"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${loading || loadingHistory || loadingAdv ? "animate-spin" : ""}`}
                      />
                    </Button>
                  </div>
                </CardHeader>

                {/* TAB 1: ENCAISSEMENTS DU JOUR */}
                <TabsContent value="today" className="m-0">
                  <CardContent className="p-4 space-y-3">
                    {/* Search bar for today's transactions */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        placeholder="Rechercher par élève, N° reçu, matricule, mode, motif..."
                        value={searchToday}
                        onChange={(e) => setSearchToday(e.target.value)}
                        className="pl-8 h-8 text-xs bg-white dark:bg-slate-950 rounded-xl"
                      />
                    </div>

                    <div className="mt-2">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Historique récent des encaissements :
                        </p>
                        {searchToday.trim() && (
                          <Badge variant="outline" className="text-[10px]">
                            {filteredTodayItems.length} résultat(s)
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {journal.encaissements &&
                        journal.encaissements.length === 0 ? (
                          <p className="text-xs text-slate-500 text-center py-6">
                            Aucun encaissement effectué aujourd'hui.
                          </p>
                        ) : filteredTodayItems.length === 0 ? (
                          <p className="text-xs text-slate-500 text-center py-6">
                            Aucun encaissement ne correspond à "{searchToday}".
                          </p>
                        ) : (
                          filteredTodayItems.map((item: any) => (
                            <div
                              key={item.id}
                              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center shadow-xs"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-indigo-600">
                                    {item.numero_recu}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px]"
                                  >
                                    {item.mode}
                                  </Badge>
                                  {item.isCombined && (
                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] py-0">
                                      Reçu Unique Consolidé ({item.sub_items?.length || item.itemsList?.length || 2} versements)
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs font-semibold text-slate-900 dark:text-white mt-1">
                                  {item.eleve_nom}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  {getDisplayPaymentDate(item)} — Motif :{" "}
                                  <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                                    {item.type}
                                  </span>
                                </p>
                              </div>

                              <div className="text-right flex flex-col items-end gap-0.5">
                                 <p className={`text-xs font-extrabold ${item.statut === 'annule' ? 'line-through text-red-500' : 'text-emerald-600'}`}>
                                   {formatCurrency(item.montant)}
                                 </p>
                                 {item.statut === 'annule' && (
                                   <Badge variant="destructive" className="text-[9px] py-0 px-1">Annulé</Badge>
                                 )}
                                 <div className="flex gap-1 items-center pt-0.5">
                                   <Button
                                     size="sm"
                                     variant="ghost"
                                     onClick={() => openReceiptModalForStudent(item.eleve_id, item)}
                                     className="h-6 text-[10px] text-indigo-600 hover:bg-indigo-50 px-1.5 font-bold"
                                   >
                                     Reçu
                                   </Button>
                                   {item.statut !== 'annule' && isAdmin && (
                                     <>
                                       <Button
                                         size="sm"
                                         variant="ghost"
                                         onClick={() => openEditModal(item)}
                                         className="h-6 text-[10px] text-sky-600 hover:bg-sky-50 px-1.5"
                                       >
                                         Modifier
                                       </Button>
                                       <Button
                                         size="sm"
                                         variant="ghost"
                                         onClick={() => openCancelModal(item)}
                                         className="h-6 text-[10px] text-red-600 hover:bg-red-50 px-1.5"
                                       >
                                         Annuler
                                       </Button>
                                     </>
                                   )}
                                 </div>
                               </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </CardContent>
                </TabsContent>

                {/* TAB 2: MES HISTORIQUES ANTÉRIEURS */}
                <TabsContent value="history" className="m-0">
                  <CardContent className="p-4 space-y-3">
                    {/* Filter bar for history */}
                    <div className="space-y-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between gap-2">
                        <Label
                          htmlFor="histDate"
                          className="text-xs font-bold text-slate-700 dark:text-slate-300"
                        >
                          Consulter la date :
                        </Label>
                        <Input
                          id="histDate"
                          type="date"
                          value={selectedHistoryDate}
                          onChange={(e) => {
                            setSelectedHistoryDate(e.target.value);
                            loadHistoryData(e.target.value);
                          }}
                          className="h-8 w-40 text-xs font-semibold bg-white dark:bg-slate-950"
                        />
                      </div>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          placeholder="Filtrer par élève, reçu, matricule..."
                          value={searchHistory}
                          onChange={(e) => setSearchHistory(e.target.value)}
                          className="pl-8 h-8 text-xs bg-white dark:bg-slate-950"
                        />
                      </div>
                    </div>

                    {/* List of past transactions for selected date */}
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Encaissements du {formatDate(selectedHistoryDate)} :
                        </p>
                        <Badge variant="outline" className="text-[10px]">
                          Total:{" "}
                          {formatCurrency(historyJournal.total_general || 0)}
                        </Badge>
                      </div>

                      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {loadingHistory ? (
                          <p className="text-xs text-slate-500 text-center py-6">
                            Chargement des historiques...
                          </p>
                        ) : (
                          (() => {
                            const consolidated = consolidateJournalItems(
                              historyJournal.encaissements || []
                            );
                            const items = consolidated.filter((item: any) => {
                              if (!searchHistory.trim()) return true;
                              const query = searchHistory.toLowerCase();
                              return (
                                (item.eleve_nom || "")
                                  .toLowerCase()
                                  .includes(query) ||
                                (item.numero_recu || "")
                                  .toLowerCase()
                                  .includes(query) ||
                                (item.matricule || "")
                                  .toLowerCase()
                                  .includes(query)
                              );
                            });

                            if (items.length === 0) {
                              return (
                                <p className="text-xs text-slate-500 text-center py-6">
                                  Aucun encaissement trouvé pour cette date.
                                </p>
                              );
                            }

                            return items.map((item: any) => (
                              <div
                                key={item.id}
                                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center shadow-xs"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-indigo-600">
                                      {item.numero_recu}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px]"
                                    >
                                      {item.mode}
                                    </Badge>
                                    {item.isCombined && (
                                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] py-0">
                                        Reçu Unique Consolidé ({item.sub_items?.length || item.itemsList?.length || 2} versements)
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs font-semibold text-slate-900 dark:text-white mt-1">
                                    {item.eleve_nom}
                                  </p>
                                  <p className="text-[10px] text-slate-500">
                                    {getDisplayPaymentDate(item)} — Motif :{" "}
                                    <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                                      {item.type}
                                    </span>
                                  </p>
                                </div>
                                <div className="text-right flex flex-col items-end gap-0.5">
                                   <p className={`text-xs font-extrabold ${item.statut === 'annule' ? 'line-through text-red-500' : 'text-emerald-600'}`}>
                                     {formatCurrency(item.montant)}
                                   </p>
                                   {item.statut === 'annule' && (
                                     <Badge variant="destructive" className="text-[9px] py-0 px-1">Annulé</Badge>
                                   )}
                                   <div className="flex gap-1 items-center pt-0.5">
                                     <Button
                                       size="sm"
                                       variant="ghost"
                                       onClick={() => openReceiptModalForStudent(item.eleve_id, item)}
                                       className="h-6 text-[10px] text-indigo-600 hover:bg-indigo-50 px-1.5 font-bold"
                                     >
                                       Reçu
                                     </Button>
                                     {item.statut !== 'annule' && isAdmin && (
                                       <>
                                         <Button
                                           size="sm"
                                           variant="ghost"
                                           onClick={() => openEditModal(item)}
                                           className="h-6 text-[10px] text-sky-600 hover:bg-sky-50 px-1.5"
                                         >
                                           Modifier
                                         </Button>
                                         <Button
                                           size="sm"
                                           variant="ghost"
                                           onClick={() => openCancelModal(item)}
                                           className="h-6 text-[10px] text-red-600 hover:bg-red-50 px-1.5"
                                         >
                                           Annuler
                                         </Button>
                                       </>
                                     )}
                                   </div>
                                 </div>
                              </div>
                            ));
                          })()
                        )}
                      </div>
                    </div>
                  </CardContent>
                </TabsContent>

                {/* TAB 3: HISTORIQUE PÉRIODIQUE & TÉLÉCHARGEMENTS */}
                <TabsContent value="periodic" className="m-0">
                  <CardContent className="p-4 space-y-3">
                    {/* Filtres & Raccourcis de période */}
                    <div className="space-y-2.5 bg-slate-50 dark:bg-slate-900/70 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between gap-1">
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Raccourcis de Période :
                        </Label>
                        <Badge variant="outline" className="text-[10px] text-slate-500 font-mono">
                          {periodDebut} au {periodFin}
                        </Badge>
                      </div>

                      {/* Boutons Presets */}
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {[
                          { id: "today", label: "Aujourd'hui" },
                          { id: "week", label: "7 jours" },
                          { id: "month", label: "Ce mois" },
                          { id: "prev_month", label: "Mois dernier" },
                          { id: "t1", label: "Trimestre 1" },
                          { id: "t2", label: "Trimestre 2" },
                          { id: "t3", label: "Trimestre 3" },
                          { id: "year", label: "Année complète" },
                        ].map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => applyPeriodPreset(p.id)}
                            className={`text-[10px] px-2 py-1 rounded-md font-semibold transition-all border ${
                              periodPreset === p.id
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>

                      {/* Dates manuelles */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-500">Du (Date Début) :</Label>
                          <Input
                            type="date"
                            value={periodDebut}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPeriodDebut(val);
                              setPeriodPreset("custom");
                            }}
                            className="h-8 text-xs font-semibold bg-white dark:bg-slate-950"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-500">Au (Date Fin) :</Label>
                          <Input
                            type="date"
                            value={periodFin}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPeriodFin(val);
                              setPeriodPreset("custom");
                            }}
                            className="h-8 text-xs font-semibold bg-white dark:bg-slate-950"
                          />
                        </div>
                      </div>

                      {/* Filtre Motif & Mode */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-500">Motif / Service :</Label>
                          <Select
                            value={periodMotif}
                            onValueChange={(val) => {
                              setPeriodMotif(val);
                              loadPeriodData(periodDebut, periodFin, val, periodMode);
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-950">
                              <SelectValue placeholder="Tous les motifs" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Tous les motifs</SelectItem>
                              <SelectItem value="scolarite">Scolarité</SelectItem>
                              <SelectItem value="cantine">Cantine</SelectItem>
                              <SelectItem value="transport">Car / Transport</SelectItem>
                              <SelectItem value="inscription">Inscriptions</SelectItem>
                              <SelectItem value="frais_annexe">Frais annexes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-slate-500">Mode de Règlement :</Label>
                          <Select
                            value={periodMode}
                            onValueChange={(val) => {
                              setPeriodMode(val);
                              loadPeriodData(periodDebut, periodFin, periodMotif, val);
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-950">
                              <SelectValue placeholder="Tous les modes" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Tous les modes</SelectItem>
                              <SelectItem value="especes">Espèces</SelectItem>
                              <SelectItem value="coris_bank">Coris Bank (Dépôt / Virement)</SelectItem>
                              <SelectItem value="mobile_money">Mobile Money (Wave...)</SelectItem>
                              <SelectItem value="cheque">Chèque / Banque</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => loadPeriodData(periodDebut, periodFin, periodMotif, periodMode)}
                        disabled={loadingPeriod}
                        className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 h-8 mt-1 shadow-xs"
                      >
                        <Filter className={`w-3.5 h-3.5 ${loadingPeriod ? "animate-spin" : ""}`} />
                        {loadingPeriod ? "Chargement des données..." : "Actualiser la Période"}
                      </Button>
                    </div>

                    {/* Synthèse Financière de la Période */}
                    <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] font-bold uppercase text-emerald-800 dark:text-emerald-300">
                          Total Encaissé sur la Période :
                        </span>
                        <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                          {periodData?.nb_encaissements || periodData?.encaissements?.length || 0} versement(s)
                        </Badge>
                      </div>
                      <p className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(periodData?.total_general || 0)}
                      </p>
                      
                      {periodData?.ventilations && (
                        <div className="text-[10px] text-emerald-800/80 dark:text-emerald-300/80 flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-emerald-200/70 dark:border-emerald-800/70 mt-1.5">
                          <span>Scol : <strong>{formatCurrency(periodData.ventilations.scolarite || 0)}</strong></span>
                          <span>•</span>
                          <span>Cantine : <strong>{formatCurrency(periodData.ventilations.cantine || 0)}</strong></span>
                          <span>•</span>
                          <span>Car : <strong>{formatCurrency(periodData.ventilations.transport || 0)}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Boutons d'Export & Téléchargement */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        onClick={exportPeriodicExcel}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold gap-1.5 h-9 rounded-xl shadow-xs"
                      >
                        <FileSpreadsheet className="w-4 h-4" /> Télécharger Excel (.xlsx)
                      </Button>
                      <Button
                        size="sm"
                        onClick={exportPeriodicPDF}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 h-9 rounded-xl shadow-xs"
                      >
                        <Printer className="w-4 h-4" /> Imprimer / PDF Officiel
                      </Button>
                    </div>

                    {/* Barre de recherche dans la période */}
                    <div className="relative pt-1">
                      <Search className="absolute left-2.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        placeholder="Filtrer élève, N° reçu, matricule, mode..."
                        value={searchPeriod}
                        onChange={(e) => setSearchPeriod(e.target.value)}
                        className="pl-8 h-8 text-xs bg-white dark:bg-slate-950 rounded-xl"
                      />
                    </div>

                    {/* Liste des versements de la période */}
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {loadingPeriod ? (
                        <p className="text-xs text-slate-500 text-center py-6">
                          Chargement des données de la période...
                        </p>
                      ) : (
                        (() => {
                          const consolidated = consolidateJournalItems(
                            periodData?.encaissements || []
                          );
                          const items = consolidated.filter((item: any) => {
                            if (!searchPeriod.trim()) return true;
                            const query = searchPeriod.toLowerCase();
                            return (
                              (item.eleve_nom || "").toLowerCase().includes(query) ||
                              (item.numero_recu || "").toLowerCase().includes(query) ||
                              (item.matricule || "").toLowerCase().includes(query) ||
                              (item.type || "").toLowerCase().includes(query) ||
                              (item.mode || "").toLowerCase().includes(query)
                            );
                          });

                          if (items.length === 0) {
                            return (
                              <p className="text-xs text-slate-500 text-center py-6">
                                Aucun encaissement trouvé pour cette période.
                              </p>
                            );
                          }

                          return items.map((item: any) => (
                            <div
                              key={item.id}
                              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center shadow-xs"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                    {item.numero_recu}
                                  </span>
                                  <Badge variant="outline" className="text-[10px]">
                                    {item.mode}
                                  </Badge>
                                  {item.isCombined && (
                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] py-0">
                                      Reçu Consolidé ({item.sub_items?.length || 2})
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs font-semibold text-slate-900 dark:text-white mt-1">
                                  {item.eleve_nom}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  {getDisplayPaymentDate(item)} — Motif :{" "}
                                  <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                                    {item.type}
                                  </span>
                                </p>
                              </div>
                              <div className="text-right flex flex-col items-end gap-0.5">
                                <p
                                  className={`text-xs font-extrabold ${
                                    item.statut === "annule"
                                      ? "line-through text-red-500"
                                      : "text-emerald-600"
                                  }`}
                                >
                                  {formatCurrency(item.montant)}
                                </p>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openReceiptModalForStudent(item.eleve_id, item)}
                                  className="h-6 text-[10px] text-indigo-600 hover:bg-indigo-50 px-1.5 font-bold"
                                >
                                  Reçu
                                </Button>
                              </div>
                            </div>
                          ));
                        })()
                      )}
                    </div>
                  </CardContent>
                </TabsContent>

                {/* TAB 4: RECHERCHE AVANCÉE MULTICRITÈRES */}
                <TabsContent value="advanced" className="m-0">
                  <CardContent className="p-4 space-y-3.5">
                    {/* Bloc des Filtres Avancés */}
                    <div className="space-y-3 bg-slate-50/80 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            Filtres de recherche
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {filteredAdvItems.length} résultat{filteredAdvItems.length > 1 ? "s" : ""}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleResetAdvFilters}
                            title="Réinitialiser tous les filtres"
                            className="h-6 px-1.5 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white gap-1 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Réinitialiser
                          </Button>
                        </div>
                      </div>

                      {/* LIGNE 1: CLASSE & STATUT */}
                      <div className="grid grid-cols-2 gap-2.5">
                        {/* 1. CLASSE */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Classe
                          </Label>
                          <Select
                            value={advClasseId}
                            onValueChange={(val) => {
                              setAdvClasseId(val);
                              loadAdvancedData(val, advStatut, advMode, advMotif, advDateDebut, advDateFin, advAllDates, advSearchText);
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                              <SelectValue placeholder="Toutes les classes" />
                            </SelectTrigger>
                            <SelectContent className="max-h-56">
                              <SelectItem value="all">Toutes les classes</SelectItem>
                              {classes.map((cls: any) => {
                                const clsLabel = cls.name || cls.CE_LIBELLE || cls.libelle || cls.nom || `Classe ${cls.id}`;
                                return (
                                  <SelectItem key={cls.id} value={String(cls.id)}>
                                    {clsLabel}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 2. STATUT */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Statut
                          </Label>
                          <Select
                            value={advStatut}
                            onValueChange={(val) => {
                              setAdvStatut(val);
                              loadAdvancedData(advClasseId, val, advMode, advMotif, advDateDebut, advDateFin, advAllDates, advSearchText);
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                              <SelectValue placeholder="Tous les statuts" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Tous les statuts</SelectItem>
                              <SelectItem value="paye">Payé / Validé</SelectItem>
                              <SelectItem value="annule">Annulé</SelectItem>
                              <SelectItem value="en_attente">En attente</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* LIGNE 2: MODE DE PAIEMENT & MOTIF */}
                      <div className="grid grid-cols-2 gap-2.5">
                        {/* 3. MODE DE PAIEMENT */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Mode de règlement
                          </Label>
                          <Select
                            value={advMode}
                            onValueChange={(val) => {
                              setAdvMode(val);
                              loadAdvancedData(advClasseId, advStatut, val, advMotif, advDateDebut, advDateFin, advAllDates, advSearchText);
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                              <SelectValue placeholder="Tous les modes" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Tous les modes</SelectItem>
                              <SelectItem value="especes">Espèces</SelectItem>
                              <SelectItem value="coris_bank">Coris Bank (Dépôt / Virement)</SelectItem>
                              <SelectItem value="mobile_money">Mobile Money (Wave, Orange, MTN, Moov)</SelectItem>
                              <SelectItem value="cheque">Chèque bancaire</SelectItem>
                              <SelectItem value="virement">Virement bancaire</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* MOTIF / TYPE */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Motif / Service
                          </Label>
                          <Select
                            value={advMotif}
                            onValueChange={(val) => {
                              setAdvMotif(val);
                              loadAdvancedData(advClasseId, advStatut, advMode, val, advDateDebut, advDateFin, advAllDates, advSearchText);
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                              <SelectValue placeholder="Tous les motifs" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Tous les motifs</SelectItem>
                              <SelectItem value="scolarite">Frais de scolarité</SelectItem>
                              <SelectItem value="cantine">Cantine scolaire</SelectItem>
                              <SelectItem value="transport">Transport scolaire</SelectItem>
                              <SelectItem value="inscription">Inscriptions & réinscriptions</SelectItem>
                              <SelectItem value="frais_annexe">Frais annexes</SelectItem>
                              <SelectItem value="uniforme">Tenues & uniformes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* LIGNE 3: RACCOURCIS DE PÉRIODE */}
                      <div className="pt-0.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Période
                          </Label>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {[
                            { id: "all", label: "Tout l'historique" },
                            { id: "year", label: "Année en cours" },
                            { id: "month", label: "Ce mois" },
                            { id: "prev_month", label: "Mois dernier" },
                            { id: "week", label: "7 jours" },
                            { id: "today", label: "Aujourd'hui" },
                          ].map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => applyAdvPeriodPreset(p.id)}
                              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors border ${
                                (advPeriodPreset === p.id && (!advAllDates || p.id === "all"))
                                  ? "bg-slate-900 text-white border-slate-900 shadow-xs dark:bg-white dark:text-slate-900 dark:border-white"
                                  : "bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900"
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* DATES DÉBUT / FIN MANUELLES (SI PAS TOUT) */}
                      {!advAllDates && (
                        <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Du</Label>
                            <Input
                              type="date"
                              value={advDateDebut}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAdvDateDebut(val);
                                setAdvPeriodPreset("custom");
                              }}
                              className="h-8 text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Au</Label>
                            <Input
                              type="date"
                              value={advDateFin}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAdvDateFin(val);
                                setAdvPeriodPreset("custom");
                              }}
                              className="h-8 text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                            />
                          </div>
                        </div>
                      )}

                      {/* RECHERCHE LIBRE PAR ÉLÈVE, MATRICULE, REÇU */}
                      <div className="relative pt-0.5">
                        <Search className="absolute left-2.5 top-3 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          placeholder="Rechercher par élève, matricule, N° reçu, transaction..."
                          value={advSearchText}
                          onChange={(e) => setAdvSearchText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              loadAdvancedData();
                            }
                          }}
                          className="pl-8 h-8 text-xs bg-white dark:bg-slate-950 rounded-lg border-slate-200 dark:border-slate-800"
                        />
                      </div>

                      {/* BOUTON RECHERCHER / ACTUALISER */}
                      <Button
                        size="sm"
                        onClick={() => loadAdvancedData()}
                        disabled={loadingAdv}
                        className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold gap-2 h-9 mt-1 shadow-xs transition-colors"
                      >
                        <Filter className={`w-3.5 h-3.5 ${loadingAdv ? "animate-spin" : ""}`} />
                        {loadingAdv ? "Recherche en cours..." : "Filtrer les encaissements"}
                      </Button>
                    </div>

                    {/* SYNTHÈSE DES RÉSULTATS DE RECHERCHE */}
                    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Total encaissé (validé)
                        </span>
                        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          {filteredAdvItems.filter((i: any) => i.statut !== "annule").length} versement(s)
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between flex-wrap gap-2">
                        <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                          {formatCurrency(
                            filteredAdvItems
                              .filter((i: any) => i.statut !== "annule")
                              .reduce((s: number, i: any) => s + (Number(i.montant) || 0), 0)
                          )}
                        </p>
                        {filteredAdvItems.some((i: any) => i.statut === "annule") && (
                          <span className="text-xs text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/50">
                            Annulés : {formatCurrency(
                              filteredAdvItems
                                .filter((i: any) => i.statut === "annule")
                                .reduce((s: number, i: any) => s + (Number(i.montant) || 0), 0)
                            )}
                          </span>
                        )}
                      </div>

                      {/* BADGES DES FILTRES ACTIFS */}
                      {(advClasseId !== "all" || advStatut !== "all" || advMode !== "all" || advMotif !== "all") && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                          {advClasseId !== "all" && (
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                              Classe : <strong className="text-slate-800 dark:text-slate-200">{classes.find((c: any) => String(c.id) === String(advClasseId))?.name || advClasseId}</strong>
                            </span>
                          )}
                          {advStatut !== "all" && (
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                              Statut : <strong className="text-slate-800 dark:text-slate-200 capitalize">{advStatut === "paye" ? "Payé" : advStatut === "annule" ? "Annulé" : advStatut}</strong>
                            </span>
                          )}
                          {advMode !== "all" && (
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                              Mode : <strong className="text-slate-800 dark:text-slate-200">{advMode === "coris_bank" ? "Coris Bank" : advMode === "especes" ? "Espèces" : advMode === "mobile_money" ? "Mobile Money" : advMode === "cheque" ? "Chèque" : advMode === "virement" ? "Virement" : advMode}</strong>
                            </span>
                          )}
                          {advMotif !== "all" && (
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                              Motif : <strong className="text-slate-800 dark:text-slate-200 capitalize">{advMotif}</strong>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ACTIONS D'EXPORT ET VUE PLEIN ÉCRAN */}
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={exportAdvancedExcel}
                        className="text-xs font-medium h-8 gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Excel
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={exportAdvancedPDF}
                        className="text-xs font-medium h-8 gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" /> Imprimer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAdvTableModalOpen(true)}
                        className="text-xs font-medium h-8 gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" /> Grand tableau
                      </Button>
                    </div>

                    {/* LISTE DES RÉSULTATS */}
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {loadingAdv ? (
                        <p className="text-xs text-slate-500 text-center py-6">
                          Recherche en cours...
                        </p>
                      ) : filteredAdvItems.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                          <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-700 dark:text-slate-300">Aucun encaissement trouvé.</p>
                          <p className="text-[11px] text-slate-400 mt-1">Essayez d'élargir la période ou de réinitialiser certains filtres.</p>
                        </div>
                      ) : (
                        filteredAdvItems.map((item: any) => {
                          const isAnnule = item.statut === "annule";
                          return (
                            <div
                              key={item.id}
                              className={`p-3 rounded-xl border transition-all ${
                                isAnnule
                                  ? "border-red-200 bg-red-50/40 dark:bg-red-950/20 dark:border-red-900/40"
                                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 shadow-xs"
                              } flex justify-between items-center`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-xs text-slate-900 dark:text-white">
                                    {item.numero_recu || `REC-${item.id}`}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                  >
                                    {item.mode?.toLowerCase().includes("coris")
                                      ? "Coris Bank"
                                      : item.mode?.toLowerCase().includes("wave")
                                      ? "Wave"
                                      : item.mode?.toLowerCase().includes("orange")
                                      ? "Orange Money"
                                      : item.mode?.toLowerCase().includes("mtn")
                                      ? "MTN Money"
                                      : item.mode?.toLowerCase().includes("moov")
                                      ? "Moov Money"
                                      : item.mode || "Espèces"}
                                  </Badge>
                                  {item.classe && (
                                    <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-[10px] py-0">
                                      {item.classe}
                                    </Badge>
                                  )}
                                  {item.isCombined && (
                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] py-0">
                                      Consolidé ({item.sub_items?.length || 2})
                                    </Badge>
                                  )}
                                </div>

                                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                                  {item.eleve_nom} {item.matricule && item.matricule !== "N/A" ? `(${item.matricule})` : ""}
                                </p>

                                <p className="text-[10px] text-slate-500">
                                  {getDisplayPaymentDate(item)} {item.heure ? `à ${item.heure}` : ""} — Motif :{" "}
                                  <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                                    {item.type || "Scolarité"}
                                  </span>
                                </p>
                              </div>

                              <div className="text-right flex flex-col items-end gap-1">
                                <p
                                  className={`text-xs font-extrabold ${
                                    isAnnule ? "line-through text-red-500" : "text-emerald-600 dark:text-emerald-400"
                                  }`}
                                >
                                  {formatCurrency(item.montant)}
                                </p>
                                {isAnnule ? (
                                  <Badge variant="destructive" className="text-[9px] py-0 px-1">
                                    Annulé
                                  </Badge>
                                ) : (
                                  <Badge className="bg-emerald-600 text-white text-[9px] py-0 px-1">
                                    Payé
                                  </Badge>
                                )}

                                <div className="flex gap-1 items-center pt-0.5">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openReceiptModalForStudent(item.eleve_id, item)}
                                    className="h-6 text-[10px] text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 px-1.5 font-bold"
                                  >
                                    Reçu
                                  </Button>
                                  {!isAnnule && isAdmin && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => openEditModal(item)}
                                        className="h-6 text-[10px] text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 px-1.5"
                                      >
                                        Modifier
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => openCancelModal(item)}
                                        className="h-6 text-[10px] text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 px-1.5"
                                      >
                                        Annuler
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>

        {/* MODAL GRAND TABLEAU DE RECHERCHE AVANCÉE */}
        <Dialog open={advTableModalOpen} onOpenChange={setAdvTableModalOpen}>
          <DialogContent className="max-w-6xl w-[96vw] max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800">
            <DialogHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pr-6">
                <div>
                  <DialogTitle className="flex items-center gap-2 text-violet-700 dark:text-violet-400 text-base sm:text-lg font-bold">
                    <Search className="w-5 h-5 text-violet-600" /> Tableau Détaillé — Recherche Avancée Caisse
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    {filteredAdvItems.length} encaissement(s) trouvé(s) selon vos critères de recherche.
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportAdvancedExcel}
                    className="text-xs font-bold gap-1 border-emerald-400 text-emerald-700 hover:bg-emerald-50"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Télécharger Excel
                  </Button>
                  <Button
                    size="sm"
                    onClick={exportAdvancedPDF}
                    className="text-xs font-semibold gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900"
                  >
                    <Printer className="w-4 h-4" /> Imprimer Rapport PDF
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="mt-4 overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="p-2.5 text-center">#</th>
                    <th className="p-2.5">Date & Heure</th>
                    <th className="p-2.5">N° Reçu</th>
                    <th className="p-2.5">Matricule</th>
                    <th className="p-2.5">Élève</th>
                    <th className="p-2.5">Classe</th>
                    <th className="p-2.5">Motif</th>
                    <th className="p-2.5">Mode</th>
                    <th className="p-2.5">Réf. Transaction</th>
                    <th className="p-2.5 text-right">Montant</th>
                    <th className="p-2.5 text-center">Statut</th>
                    <th className="p-2.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAdvItems.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-slate-400">
                        Aucun encaissement ne correspond aux critères sélectionnés.
                      </td>
                    </tr>
                  ) : (
                    filteredAdvItems.map((item: any, idx: number) => {
                      const isAnnule = item.statut === "annule";
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                            isAnnule ? "bg-red-50/30 dark:bg-red-950/10" : ""
                          }`}
                        >
                          <td className="p-2.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-2.5 whitespace-nowrap">
                            {getDisplayPaymentDate(item)} {item.heure ? <span className="text-[10px] text-slate-400">({item.heure})</span> : ""}
                          </td>
                          <td className="p-2.5 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                            {item.numero_recu || `REC-${item.id}`}
                          </td>
                          <td className="p-2.5 font-mono">{item.matricule || "N/A"}</td>
                          <td className="p-2.5 font-semibold text-slate-900 dark:text-white">
                            {item.eleve_nom}
                          </td>
                          <td className="p-2.5">
                            {item.classe ? (
                              <Badge variant="outline" className="text-[10px]">
                                {item.classe}
                              </Badge>
                            ) : (
                              "N/A"
                            )}
                          </td>
                          <td className="p-2.5 capitalize">{item.type || "Scolarité"}</td>
                          <td className="p-2.5 capitalize text-slate-600 dark:text-slate-400">
                            {item.mode?.toLowerCase().includes("coris") ? (
                              <Badge variant="outline" className="bg-slate-100 text-slate-800 border-slate-300 font-medium text-[10px]">
                                Coris Bank
                              </Badge>
                            ) : (
                              item.mode || "Espèces"
                            )}
                          </td>
                          <td className="p-2.5 font-mono text-[10px] text-slate-500">
                            {item.numero_transaction || "—"}
                          </td>
                          <td className={`p-2.5 text-right font-bold ${isAnnule ? "line-through text-red-500" : "text-emerald-600"}`}>
                            {formatCurrency(item.montant)}
                          </td>
                          <td className="p-2.5 text-center">
                            {isAnnule ? (
                              <Badge variant="destructive" className="text-[9px] py-0 px-1">
                                Annulé
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-600 text-white text-[9px] py-0 px-1">
                                Payé
                              </Badge>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setAdvTableModalOpen(false);
                                openReceiptModalForStudent(item.eleve_id, item);
                              }}
                              className="h-6 text-[10px] text-indigo-600 hover:bg-indigo-50 px-2 font-bold"
                            >
                              Reçu
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <DialogFooter className="mt-4 flex flex-col sm:flex-row justify-between items-center">
              <div className="text-xs text-slate-500">
                Montant total : <strong className="text-emerald-600">{formatCurrency(
                  filteredAdvItems
                    .filter((i: any) => i.statut !== "annule")
                    .reduce((s: number, i: any) => s + (Number(i.montant) || 0), 0)
                )}</strong>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAdvTableModalOpen(false)}
                className="text-xs font-semibold"
              >
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL IMPRESSION REÇU DE CAISSE OFFICIEL HINNEH */}
        <Dialog open={openRecuModal} onOpenChange={setOpenRecuModal}>
          <DialogContent className="max-w-3xl lg:max-w-4xl w-[95vw] max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-base sm:text-lg font-bold">
                <Receipt className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Reçu de Caisse Officiel — Hînneh Éducation
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Aperçu du reçu d'encaissement destiné au tuteur de l'élève.
              </DialogDescription>
            </DialogHeader>

            {/* RECEIPT MODEL PREVIEW CONTAINER */}
            <div
              ref={printRef}
              className="p-5 sm:p-6 bg-white border border-slate-200 text-slate-800 space-y-4 sm:space-y-5 rounded-xl shadow-sm font-sans text-xs"
            >
              {/* TOP HEADER */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 pb-1">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-wide">
                    HÎNNEH ÉDUCATION
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    COSIM / FONDATION HINNEH — Nos Écoles Confessionnelles
                  </p>
                </div>

                <div className="text-left sm:text-right text-xs text-slate-500 leading-snug shrink-0">
                  <p className="font-bold text-slate-700">Hînneh Éducation</p>
                  <p className="text-[11px]">Côte d'Ivoire</p>
                  <p className="text-[11px]">
                    Année scolaire :{" "}
                    <span className="font-semibold text-slate-700">
                      {currentRecu?.details_recu?.annee_scolaire || "2026-2027"}
                    </span>
                  </p>
                </div>
              </div>

              {/* TITLE ROW WITH BADGES */}
              <div className="flex flex-wrap justify-between items-center pb-2.5 border-b-2 border-sky-500 gap-2">
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-base sm:text-lg font-black text-[#0f2b5c]">
                    REÇU DE PAIEMENT
                  </span>
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-700 border-emerald-500 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full"
                  >
                    PAYÉ
                  </Badge>
                </div>

                <Badge
                  variant="outline"
                  className="bg-sky-50 text-sky-700 border-sky-400 font-mono font-bold text-xs sm:text-sm px-3 py-1 rounded-lg"
                >
                  {currentRecu?.details_recu?.numero_recu || "REC-20260709-1"}
                </Badge>
              </div>

              {/* CARDS GRID: INFORMATIONS ÉLÈVE & DÉTAILS DU RÈGLEMENT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* CARD 1: INFORMATIONS ÉLÈVE */}
                {(() => {
                  const modalTargetId = currentRecu?.eleve_id || currentRecu?.eleve?.id || currentRecu?.details_recu?.eleve_id;
                  const modalTargetMatricule = currentRecu?.matricule || currentRecu?.eleve?.matricule || currentRecu?.details_recu?.matricule;
                  const modalTargetNom = currentRecu?.eleve_nom || currentRecu?.eleve?.prenom || currentRecu?.eleve?.nom || "";

                  const modalMatchedStudent = (students || []).find((s: any) =>
                    (modalTargetId && String(s.id) === String(modalTargetId)) ||
                    (modalTargetMatricule && s.matricule && String(s.matricule).trim().toLowerCase() === String(modalTargetMatricule).trim().toLowerCase()) ||
                    (modalTargetNom && `${s.firstName || s.prenom || ''} ${s.lastName || s.nom || ''}`.trim().toLowerCase() === String(modalTargetNom).trim().toLowerCase())
                  );

                  const modalStudentObj = modalMatchedStudent || currentRecu?.eleve || (selectedStudent && (String(selectedStudent.id) === String(modalTargetId) || selectedStudent.matricule === modalTargetMatricule) ? selectedStudent : null) || selectedStudent || {};
                  const modalClassName = resolveStudentClassName(modalStudentObj, classes);
                  const modalStudentName = `${modalStudentObj.nom || modalStudentObj.lastName || currentRecu?.eleve?.nom || ''} ${modalStudentObj.prenom || modalStudentObj.firstName || currentRecu?.eleve?.prenom || currentRecu?.eleve_nom || ''}`.trim() || modalStudentObj.name || currentRecu?.eleve_nom || "Élève Hînneh";
                  const modalStudentMatricule = modalStudentObj.matricule || currentRecu?.eleve?.matricule || currentRecu?.matricule || "N/A";

                  return (
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                      <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-200">
                        INFORMATIONS ÉLÈVE
                      </h4>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#0f2b5c] flex items-center justify-center shrink-0 shadow-xs">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-slate-500 shrink-0">Nom & Prénom</span>
                            <span className="font-bold text-slate-900 text-right truncate">
                              {modalStudentName}
                            </span>
                          </div>
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-slate-500 shrink-0">Matricule</span>
                            <span className="font-bold font-mono text-slate-900 text-right">
                              {modalStudentMatricule}
                            </span>
                          </div>
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-slate-500 shrink-0">Classe</span>
                            <span className="font-bold text-slate-900 text-right">
                              {modalClassName}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* CARD 2: DÉTAILS DU RÈGLEMENT */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-200">
                    DÉTAILS DU RÈGLEMENT
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-slate-500 shrink-0">Date de paiement</span>
                      <span className="font-bold text-slate-900 text-right">
                        {new Date().toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          timeZone: TIMEZONE_GMT,
                        })}{" "}
                        à{" "}
                        {new Date().toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: TIMEZONE_GMT,
                        })} GMT
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-slate-500 shrink-0">Mode de règlement</span>
                      <span className="font-bold text-slate-900 text-right">
                        {(() => {
                          const m = String(currentRecu?.details_recu?.mode || currentRecu?.mode || "Espèces").toLowerCase();
                          if (m.includes("coris")) return "Coris Bank (Dépôt / Virement)";
                          if (m.includes("mtn")) return "Mobile Money (MTN Money)";
                          if (m.includes("orange")) return "Mobile Money (Orange Money)";
                          if (m.includes("moov")) return "Mobile Money (Moov Money)";
                          if (m.includes("wave")) return "Mobile Money (Wave)";
                          if (m.includes("mobile")) return "Mobile Money";
                          if (m.includes("cheque") || m.includes("chèque")) return "Chèque Bancaire";
                          if (m.includes("virement")) return "Virement Bancaire";
                          return "Espèces (Guichet)";
                        })()}
                      </span>
                    </div>

                    {(() => {
                      const refTx = currentRecu?.details_recu?.numero_transaction || currentRecu?.numero_transaction || currentRecu?.details_recu?.reference || currentRecu?.reference;
                      if (!refTx || refTx === "N/A" || String(refTx).trim() === "") return null;
                      return (
                        <div className="flex justify-between items-center gap-2 bg-indigo-50/80 dark:bg-indigo-950/40 p-2 rounded-lg border border-indigo-200 dark:border-indigo-800">
                          <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200 shrink-0">Réf. Transaction / Opérateur</span>
                          <span className="font-mono font-black text-indigo-700 dark:text-indigo-400 text-xs text-right break-all bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-700">
                            {refTx}
                          </span>
                        </div>
                      );
                    })()}

                    {Number(currentRecu?.details_recu?.montant || 0) > 0 && (
                      <div className="flex justify-between items-center gap-2 pt-1 border-t border-slate-200">
                        <span className="text-slate-700 font-bold shrink-0">Montant versé</span>
                        <span className="font-extrabold text-emerald-600 text-sm text-right">
                          {Number(currentRecu?.details_recu?.montant || 0).toLocaleString("fr-FR")} FCFA
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center gap-2 text-[11px] text-slate-400">
                      <span className="shrink-0">Imprimé le</span>
                      <span className="font-medium text-right">
                        {new Date().toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          timeZone: TIMEZONE_GMT,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* TABLEAU RÉCAPITULATIF DES SERVICES DANS LE MODAL DE REÇU */}
              {(() => {
                const targetStudentId = currentRecu?.eleve_id || currentRecu?.eleve?.id;
                const modalStudent = (students || []).find((s: any) => String(s.id) === String(targetStudentId)) || currentRecu?.eleve || selectedStudent || {};
                const isCantine = Boolean(modalStudent.service_cantine || modalStudent.is_cantine || modalStudent.cantine || modalStudent.serviceCantine || currentRecu?.details_recu?.motif === "cantine");
                const isTransport = Boolean(modalStudent.service_transport || modalStudent.is_transport || modalStudent.transport || modalStudent.serviceTransport || currentRecu?.details_recu?.motif === "transport");

                // Source 1: Ventilations & Synthèse financière du reçu
                const ventCantine = Number(currentRecu?.ventilations?.cantine?.subtotal ?? currentRecu?.ventilations?.cantine ?? currentRecu?.synthese_financiere?.cantine_paye ?? 0);
                const ventTransport = Number(currentRecu?.ventilations?.transport?.subtotal ?? currentRecu?.ventilations?.transport ?? currentRecu?.synthese_financiere?.transport_paye ?? 0);

                // Source 2: Historique complet des paiements de l'élève
                const allKnownPayments = (Array.isArray(studentPayments) ? studentPayments : []).concat(
                  Array.isArray(journal?.encaissements) ? journal.encaissements : []
                );
                const studentPaymentsList = allKnownPayments.filter((p: any) =>
                  (targetStudentId && String(p.eleve_id || p.eleveId || p.eleve?.id) === String(targetStudentId)) ||
                  (modalStudent?.matricule && p.matricule && String(p.matricule).trim().toLowerCase() === String(modalStudent.matricule).trim().toLowerCase())
                );

                const paymentsCantineSum = studentPaymentsList.reduce((acc: number, p: any) => {
                  const t = String(p.type || p.motif || "").toLowerCase();
                  if (t.includes("cant")) return acc + Number(p.montant || 0);
                  if (Array.isArray(p.echeances_affectees)) {
                    const sub = p.echeances_affectees
                      .filter((a: any) => String(a.service_type || a.rubrique || "").toLowerCase().includes("cant"))
                      .reduce((sa: number, a: any) => sa + Number(a.montant || 0), 0);
                    return acc + sub;
                  }
                  return acc;
                }, 0);

                const paymentsTransportSum = studentPaymentsList.reduce((acc: number, p: any) => {
                  const t = String(p.type || p.motif || "").toLowerCase();
                  if (t.includes("trans") || t.includes("car")) return acc + Number(p.montant || 0);
                  if (Array.isArray(p.echeances_affectees)) {
                    const sub = p.echeances_affectees
                      .filter((a: any) => {
                        const str = String(a.service_type || a.rubrique || "").toLowerCase();
                        return str.includes("trans") || str.includes("car");
                      })
                      .reduce((sa: number, a: any) => sa + Number(a.montant || 0), 0);
                    return acc + sub;
                  }
                  return acc;
                }, 0);

                // Source 3: Échéancier de l'élève. `studentEcheances` n'est fiable que pour le
                // même élève que le formulaire d'encaissement en cours — sinon (reçu rouvert
                // depuis l'historique pour un autre élève) le récapitulatif chargé dans
                // currentRecu.echeances est la seule source correctement scopée à cet élève.
                const targetIsSelected = Boolean(selectedStudent && targetStudentId && String(selectedStudent.id) === String(targetStudentId));
                const echeancesList = targetIsSelected && Array.isArray(studentEcheances)
                  ? studentEcheances
                  : (Array.isArray(currentRecu?.echeances) ? currentRecu.echeances : []);
                const cantineEchs = echeancesList.filter((e: any) => String(e.service_type || e.rubric || "").toLowerCase().includes("cant"));
                const transEchs = echeancesList.filter((e: any) => {
                  const s = String(e.service_type || e.rubric || "").toLowerCase();
                  return s.includes("trans") || s.includes("car");
                });

                const echCantineSum = cantineEchs.reduce((acc: number, e: any) => acc + Number(e.montant_paye || e.paid || 0), 0);
                const echTransportSum = transEchs.reduce((acc: number, e: any) => acc + Number(e.montant_paye || e.paid || 0), 0);

                const curCantine = currentRecu?.details_recu?.motif === "cantine" ? Number(currentRecu?.details_recu?.montant || 0) : 0;
                const curTransport = currentRecu?.details_recu?.motif === "transport" ? Number(currentRecu?.details_recu?.montant || 0) : 0;

                const cantinePaid = Math.max(ventCantine, paymentsCantineSum, echCantineSum, curCantine);
                const transportPaid = Math.max(ventTransport, paymentsTransportSum, echTransportSum, curTransport);

                if (!isCantine && !isTransport && cantinePaid === 0 && transportPaid === 0) return null;

                return (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                      <span>Services Annexes Souscrits</span>
                      <span className="text-emerald-700">Paiements Encaissés</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(isCantine || cantinePaid > 0) && (
                        <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-teal-200 shadow-xs">
                          <span className="font-bold text-teal-900 flex items-center gap-1.5">🍽️ Cantine Scolaire</span>
                          <span className="font-extrabold text-teal-700">{cantinePaid.toLocaleString("fr-FR")} FCFA</span>
                        </div>
                      )}
                      {(isTransport || transportPaid > 0) && (
                        <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-sky-200 shadow-xs">
                          <span className="font-bold text-sky-900 flex items-center gap-1.5">🚌 Transport / Car</span>
                          <span className="font-extrabold text-sky-700">{transportPaid.toLocaleString("fr-FR")} FCFA</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* FOOTER DISCLAIMER */}
              <div className="pt-3 border-t border-slate-100 text-center text-[10px] text-slate-500">
                <strong>Ce reçu est généré électroniquement</strong> et
                constitue une preuve officielle de versement. Toute réclamation
                doit être faite dans les 30 jours suivant la date d'émission.
                &nbsp;|&nbsp; Hînneh Éducation © {new Date().getFullYear()}
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3 w-full pt-2">
              <Button variant="outline" onClick={() => setOpenRecuModal(false)} className="w-full sm:w-auto text-xs">
                Fermer
              </Button>
              <div className="flex flex-wrap items-center gap-2 justify-end w-full sm:w-auto">
                <Button
                  onClick={() => requestVersementReceipt("print")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-bold text-xs shadow-sm"
                  title="Imprimer le reçu selon les paiements effectués à la caisse"
                >
                  <Printer className="w-4 h-4" /> Imprimer
                  {Number(currentRecu?.details_recu?.montant || 0) > 0
                    ? ` (${formatCurrency(Number(currentRecu.details_recu.montant))})`
                    : ""}
                </Button>
                <Button
                  onClick={() => requestGlobalReceipt("print")}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 font-bold text-xs shadow-sm"
                  title="Imprime le récapitulatif complet de tous les versements de l'élève (scolarité, cantine, transport, etc.)."
                >
                  <Printer className="w-4 h-4" /> Reçu Global (Tout Inclus)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => requestGlobalReceipt("pdf")}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100 gap-1.5 text-xs font-bold"
                >
                  <Download className="w-4 h-4 text-sky-600" /> Télécharger PDF
                </Button>
                {Number(currentRecu?.eleve?.AU_MONTANTARRIERE || currentRecu?.synthese_financiere?.arrieres_anterieurs || (selectedStudent && String(selectedStudent.id) === String(currentRecu?.eleve?.id || currentRecu?.eleve_id) ? selectedStudent?.AU_MONTANTARRIERE : 0) || 0) > 0 && (
                  <Button
                    onClick={() => handlePrintReceipt("arriere")}
                    className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5 text-xs font-bold"
                  >
                    <Printer className="w-4 h-4" /> Imprimer Reçu Arriérés
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL MODIFIER PAIEMENT */}
        <Dialog open={openEditPaymentModal} onOpenChange={setOpenEditPaymentModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sky-600 font-bold text-base">
                ✏️ Modifier un Paiement
              </DialogTitle>
              <DialogDescription className="text-xs">
                Reçu {selectedEditPayment?.numero_recu || '—'} pour {selectedEditPayment?.eleve_nom || 'Élève'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Montant (FCFA) *</Label>
                <Input
                  type="number"
                  value={editMontant}
                  onChange={(e) => setEditMontant(e.target.value)}
                  placeholder="Ex: 50000"
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Motif / Type</Label>
                  <Select value={editType} onValueChange={setEditType}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scolarite">Scolarité</SelectItem>
                      <SelectItem value="inscription">Inscription / Réinscription</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Mode de règlement</Label>
                  <Select value={editMode} onValueChange={setEditMode}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="especes">Espèces</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="cheque">Chèque</SelectItem>
                      <SelectItem value="virement">Virement bancaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Numéro de transaction / Référence</Label>
                <Input
                  value={editNumTx}
                  onChange={(e) => setEditNumTx(e.target.value)}
                  placeholder="Ex: TX-908234 / Chèque N° 001923"
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setOpenEditPaymentModal(false)}>
                Annuler
              </Button>
              <Button size="sm" onClick={handleSaveEditPayment} className="bg-sky-600 hover:bg-sky-700 text-white">
                Enregistrer la modification
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL LISTE DES VERSEMENTS D'UN REÇU CONSOLIDÉ (choix du versement à annuler) */}
        <Dialog open={openCancelListModal} onOpenChange={setOpenCancelListModal}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600 font-bold text-base">
                🚫 Choisir le versement à annuler
              </DialogTitle>
              <DialogDescription className="text-xs">
                Ce reçu regroupe plusieurs versements distincts de{" "}
                <span className="font-semibold">{selectedCancelGroup?.eleve_nom}</span>.
                Sélectionnez précisément celui à annuler — les autres resteront intacts.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2 max-h-80 overflow-y-auto pr-1">
              {(selectedCancelGroup?.sub_items || []).map((sub: any, idx: number) => (
                <div
                  key={sub.id || idx}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-indigo-600">{sub.numero_recu}</span>
                      <Badge variant="outline" className="text-[10px]">{sub.mode}</Badge>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 capitalize">
                      Motif : <span className="font-medium text-slate-700 dark:text-slate-300">{sub.type}</span>
                      {sub.date ? ` — ${sub.date}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-extrabold text-emerald-600">{formatCurrency(sub.montant)}</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-[10px] px-2"
                      onClick={() => openCancelModalForSubItem(sub)}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setOpenCancelListModal(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL ANNULER PAIEMENT */}
        <Dialog open={openCancelPaymentModal} onOpenChange={setOpenCancelPaymentModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600 font-bold text-base">
                🚫 Annuler un Paiement
              </DialogTitle>
              <DialogDescription className="text-xs">
                Vous êtes sur le point d'annuler le reçu {selectedCancelPayment?.numero_recu} ({formatCurrency(selectedCancelPayment?.montant || 0)}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 font-medium">
                ⚠️ L'annulation réajustera automatiquement la dette de l'élève et marquera la transaction comme annulée.
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Motif de l'annulation *</Label>
                <Textarea
                  value={cancelMotif}
                  onChange={(e) => setCancelMotif(e.target.value)}
                  placeholder="Saisissez la raison de l'annulation (ex: Erreur de saisie de montant, Chèque sans provision...)"
                  className="text-xs"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setOpenCancelPaymentModal(false)}>
                Fermer
              </Button>
              <Button size="sm" onClick={handleConfirmCancelPayment} variant="destructive">
                Confirmer l'annulation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL DOUBLON TRANSACTION MOBILE MONEY / CORIS */}
        <DuplicateTransactionWarningModal
          open={openDuplicateModal}
          onClose={() => setOpenDuplicateModal(false)}
          attemptedTxId={numTx}
          conflictingPaiement={conflictPaiement}
        />

        {/* MODAL GESTION / CORRECTION DES ID DE TRANSACTION MOBILE & CORIS */}
        <AdminTransactionManagerModal
          open={openAdminTxModal}
          onClose={() => setOpenAdminTxModal(false)}
          onTransactionUpdated={() => {
            refreshJournal();
            loadPeriodData();
          }}
        />
      </div>
    </Layout>
  );
}
