import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  FileSpreadsheet,
  Printer,
  Download,
  Filter,
  Search,
  Eye,
  Utensils,
  Bus,
  Calendar,
  ChevronRight,
  BookOpen,
  PieChart,
  BarChart3,
  Layers,
  ArrowUpRight,
  Sparkles,
  CreditCard,
  RefreshCw,
  Lock,
  Unlock,
  KeyRound,
  ShieldAlert,
  CalendarDays,
} from "lucide-react";
import {
  BarChart as ReBarChart,
  Bar,
  LineChart as ReLineChart,
  Line,
  AreaChart as ReAreaChart,
  Area,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Layout } from "@/components/Layout";
import apiClient from "@/lib/apiClient";
import { isUserFromAbidjan } from "@/lib/utils";
import {
  printDailyInscriptionsReport,
  printDailyServicesReport,
  DailyInscriptionItem,
  DailyServicePaymentItem,
} from "@/lib/supervisorPrinter";
import {
  scolariteDue,
  totalVerse,
  ventilationParRubrique,
  recouvrementMensuel,
} from "@/lib/supervisorStats";
import { periodesApi, PeriodeScolaire, computePeriodeStatus } from "@/lib/periodesApi";

const LEVELS = ["Tous", "Maternelle", "Primaire", "Collège", "Lycée"];
const MONTHS = [
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
];

export const SupervisorSpace: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("Tous");
  const [selectedClass, setSelectedClass] = useState<string>("Tous");
  const [selectedInscStatus, setSelectedInscStatus] = useState<string>("Tous"); // Tous, valide, en_cours
  const [selectedPayStatus, setSelectedPayStatus] = useState<string>("Tous"); // Tous, solde, partiel, impaye
  const [selectedMonthImpaye, setSelectedMonthImpaye] = useState<string>("Octobre");
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Data States
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<any | null>(null);

  const userRole = (localStorage.getItem("user_role") || "").toLowerCase();
  const userCode = localStorage.getItem("user_ecole_code") || localStorage.getItem("code_etablissement");
  const userEcoleId = localStorage.getItem("user_ecole_id");
  const userVille = localStorage.getItem("user_ville") || "";
  const isGlobalSupervisor = userRole === "superuser" || userRole === "superviseur" || userRole === "direction_fondation";
  const isAdmin = userRole === "admin" || userRole === "superuser" || userRole === "direction_fondation" || userRole === "direction";

  // Period Management States
  const [periodes, setPeriodes] = useState<PeriodeScolaire[]>([]);
  const [loadingPeriodes, setLoadingPeriodes] = useState<boolean>(false);
  const [typePeriodeFilter, setTypePeriodeFilter] = useState<'trimestre' | 'semestre'>('trimestre');
  const [selectedAnneePeriode, setSelectedAnneePeriode] = useState<string>("2025-2026");
  const [selectedPeriodeToUnlock, setSelectedPeriodeToUnlock] = useState<PeriodeScolaire | null>(null);
  const [unlockMotif, setUnlockMotif] = useState<string>("Prolongation accordée pour finalisation des saisies de notes");
  const [savingDatesId, setSavingDatesId] = useState<number | null>(null);
  const [togglingPeriodeId, setTogglingPeriodeId] = useState<number | null>(null);

  const loadPeriodesData = async (annee?: string) => {
    setLoadingPeriodes(true);
    try {
      const yearToLoad = annee || selectedAnneePeriode;
      const data = await periodesApi.getPeriodes(yearToLoad);
      setPeriodes(data);
    } catch (err) {
      console.error("Erreur chargement périodes:", err);
    } finally {
      setLoadingPeriodes(false);
    }
  };

  useEffect(() => {
    loadPeriodesData(selectedAnneePeriode);
  }, [selectedAnneePeriode]);

  const handleUpdatePeriodeField = (id: number, field: keyof PeriodeScolaire, val: any) => {
    setPeriodes(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p));
  };

  const handleSavePeriodeDates = async (p: PeriodeScolaire) => {
    setSavingDatesId(p.id);
    try {
      await periodesApi.updatePeriode(p.id, {
        date_debut: p.date_debut,
        date_fin: p.date_fin,
        date_ouverture_saisie: p.date_ouverture_saisie,
        date_cloture_saisie: p.date_cloture_saisie,
        libelle: p.libelle,
      });
      toast({
        title: "Période mise à jour",
        description: `Les dates pour « ${p.libelle} » (${p.annee_scolaire}) ont été enregistrées avec succès.`,
      });
      loadPeriodesData(p.annee_scolaire);
    } catch (err: any) {
      toast({
        title: "Erreur d'enregistrement",
        description: err?.message || "Impossible de sauvegarder les dates de la période.",
        variant: "destructive",
      });
    } finally {
      setSavingDatesId(null);
    }
  };

  const handleActiverPeriode = async (p: PeriodeScolaire) => {
    setTogglingPeriodeId(p.id);
    const operateurNom = localStorage.getItem("username") || userRole || "Superviseur";
    try {
      await periodesApi.sauterVerrou(
        p.id,
        "Période activée par le superviseur / administration",
        operateurNom
      );
      toast({
        title: "Période Activée",
        description: `La saisie des notes pour « ${p.libelle} » (${p.annee_scolaire}) est désormais ouverte pour tous les enseignants et éducateurs.`,
      });
      await loadPeriodesData(p.annee_scolaire);
    } catch (err: any) {
      toast({
        title: "Erreur d'activation",
        description: err?.message || "Impossible d'activer la période.",
        variant: "destructive",
      });
    } finally {
      setTogglingPeriodeId(null);
    }
  };

  const handleVerrouillerPeriode = async (p: PeriodeScolaire) => {
    setTogglingPeriodeId(p.id);
    try {
      await periodesApi.retablirVerrou(p.id);
      toast({
        title: "Période Verrouillée",
        description: `La période « ${p.libelle} » (${p.annee_scolaire}) a été verrouillée. La saisie des notes est bloquée.`,
      });
      await loadPeriodesData(p.annee_scolaire);
    } catch (err: any) {
      toast({
        title: "Erreur de verrouillage",
        description: err?.message || "Impossible de verrouiller la période.",
        variant: "destructive",
      });
    } finally {
      setTogglingPeriodeId(null);
    }
  };

  const handleConfirmSauterVerrou = async () => {
    if (!selectedPeriodeToUnlock) return;
    const adminNom = localStorage.getItem("username") || userRole || "Superviseur";
    try {
      await periodesApi.sauterVerrou(selectedPeriodeToUnlock.id, unlockMotif, adminNom);
      toast({
        title: "Période activée avec succès !",
        description: `La saisie des notes pour « ${selectedPeriodeToUnlock.libelle} » (${selectedPeriodeToUnlock.annee_scolaire}) est déverrouillée.`,
      });
      const year = selectedPeriodeToUnlock.annee_scolaire;
      setSelectedPeriodeToUnlock(null);
      loadPeriodesData(year);
    } catch (err: any) {
      toast({
        title: "Échec du déverrouillage",
        description: err?.message || "Erreur lors de la levée du verrou.",
        variant: "destructive",
      });
    }
  };

  // Load Data from API
  const loadData = async () => {
    setLoading(true);
    try {
      const [studRes, clsRes, payRes, schRes] = await Promise.all([
        apiClient.getStudents().catch(() => []),
        apiClient.getClasses().catch(() => []),
        apiClient.getPayments().catch(() => []),
        apiClient.getSchools().catch(() => []),
      ]);

      let studList = Array.isArray(studRes) ? studRes : [];
      let payList = Array.isArray(payRes) ? payRes : [];
      let clsList = Array.isArray(clsRes) ? clsRes : [];
      const schoolList = Array.isArray(schRes) ? schRes : [];
      setSchools(schoolList);

      // Si Directeur ou utilisateur d'Abidjan (non Superviseur global) : filtrer par TOUTES les écoles de sa ville
      if (!isGlobalSupervisor) {
        // 1. Déterminer la ville de rattachement
        let targetVille = (userVille || "").trim().toUpperCase();
        if (!targetVille && schoolList.length > 0) {
          const userSchool = schoolList.find((s: any) => 
            (userEcoleId && String(s.IDETABLISSEMENT || s.id) === String(userEcoleId)) ||
            (userCode && (s.ET_CODEETABLISSEMENT || s.code || "").trim().toUpperCase() === userCode.trim().toUpperCase())
          );
          if (userSchool && (userSchool.ET_VILLE || userSchool.ville)) {
            targetVille = (userSchool.ET_VILLE || userSchool.ville).trim().toUpperCase();
          }
        }
        if (!targetVille && isUserFromAbidjan(userRole, userVille)) {
          targetVille = "ABIDJAN";
        }

        const isAbj = targetVille === "ABIDJAN" || isUserFromAbidjan(userRole, userVille);

        // 2. Trouver tous les établissements de cette ville
        const citySchools = targetVille 
          ? schoolList.filter((s: any) => {
              const sVille = (s.ET_VILLE || s.ville || "").trim().toUpperCase();
              const sCode = (s.ET_CODEETABLISSEMENT || s.code || "").trim().toUpperCase();
              if (sVille === targetVille || sVille.includes(targetVille)) return true;
              if (isAbj && (sCode.startsWith("FHA") || sCode === "ECOLE_TEST_A")) return true;
              return false;
            })
          : schoolList.filter((s: any) => 
              (userEcoleId && String(s.IDETABLISSEMENT || s.id) === String(userEcoleId)) ||
              (userCode && (s.ET_CODEETABLISSEMENT || s.code || "").trim().toUpperCase() === userCode.trim().toUpperCase())
            );

        const cityEcoleIds = new Set(citySchools.map((s: any) => String(s.IDETABLISSEMENT || s.id)));
        const cityEcoleCodes = new Set(citySchools.map((s: any) => (s.ET_CODEETABLISSEMENT || s.code || "").trim().toUpperCase()).filter(Boolean));
        if (userCode) cityEcoleCodes.add(userCode.trim().toUpperCase());
        if (userEcoleId) cityEcoleIds.add(String(userEcoleId));

        if (cityEcoleIds.size > 0 || cityEcoleCodes.size > 0 || targetVille) {
          clsList = clsList.filter((c: any) => 
            (c.ET_CODEETABLISSEMENT && cityEcoleCodes.has(c.ET_CODEETABLISSEMENT.trim().toUpperCase())) ||
            (c.ecole_id && cityEcoleIds.has(String(c.ecole_id))) ||
            (c.ville && targetVille && c.ville.trim().toUpperCase() === targetVille)
          );

          const cityClassIds = new Set(clsList.map((c: any) => String(c.id)));

          studList = studList.filter((s: any) => 
            (s.ET_CODEETABLISSEMENT && cityEcoleCodes.has(String(s.ET_CODEETABLISSEMENT).trim().toUpperCase())) ||
            (s.ecole_id && cityEcoleIds.has(String(s.ecole_id))) ||
            (s.classe_id && cityClassIds.has(String(s.classe_id))) ||
            (s.ville && targetVille && String(s.ville).trim().toUpperCase() === targetVille)
          );

          const cityStudentIds = new Set(studList.map((s: any) => String(s.id)));

          payList = payList.filter((p: any) => 
            (p.ET_CODEETABLISSEMENT && cityEcoleCodes.has(String(p.ET_CODEETABLISSEMENT).trim().toUpperCase())) ||
            (p.ecole_id && cityEcoleIds.has(String(p.ecole_id))) ||
            (p.eleve_id && cityStudentIds.has(String(p.eleve_id))) ||
            (p.ville && targetVille && String(p.ville).trim().toUpperCase() === targetVille)
          );
        }
      }

      setStudents(studList);
      setClasses(clsList);
      setPayments(payList);
    } catch (err) {
      console.error("Erreur chargement données Superviseur:", err);
      toast({
        variant: "destructive",
        title: "Erreur de chargement",
        description: "Impossible de synchroniser les données.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Helper level determination
  const getStudentLevel = (s: any): string => {
    const cls = (s.className || s.CE_LIBELLE || s.classe || "").toUpperCase();
    if (cls.includes("MAT") || cls.includes("PS") || cls.includes("MS") || cls.includes("GS")) return "Maternelle";
    if (cls.includes("CP") || cls.includes("CE") || cls.includes("CM")) return "Primaire";
    if (cls.includes("6") || cls.includes("5") || cls.includes("4") || cls.includes("3") || cls.includes("COL")) return "Collège";
    if (cls.includes("2ND") || cls.includes("1ER") || cls.includes("TLE") || cls.includes("LYC")) return "Lycée";
    return "Primaire";
  };

  // Class Options based on selectedLevel
  const classOptions = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      const lvl = getStudentLevel(s);
      if (selectedLevel === "Tous" || lvl === selectedLevel) {
        if (s.className) set.add(s.className);
      }
    });
    return Array.from(set).sort();
  }, [students, selectedLevel]);

  // Statistics Calculations
  const stats = useMemo(() => {
    const totalStudents = students.length;
    const validedInsc = students.filter((s) => {
      const st = String(s.status || s.statut || s.statutInscription || s.statut_inscription || "").toLowerCase();
      return st === "valide" || st === "validé" || st === "actif" || st === "complete" || st === "inscrit";
    }).length;
    const pendingInsc = totalStudents - validedInsc;

    // Payments for Services and Total Encaissé
    const validPayments = payments.filter((p) => (p.statut || "").toLowerCase() !== "annule");

    // Cumul Encaissements : total exact issu du journal des paiements ou des fiches élèves
    const paymentsSum = validPayments.reduce((sum, p) => sum + Number(p.montant || 0), 0);
    const studentsDepositsSum = students.reduce((sum, s) => sum + totalVerse(s, validPayments), 0);
    const totalVerseToDate = Math.max(paymentsSum, studentsDepositsSum);

    let totalAnnuelDu = 0;
    students.forEach((s) => {
      totalAnnuelDu += scolariteDue(s, classes);
    });

    const totalResteToDate = Math.max(0, totalAnnuelDu - totalVerseToDate);
    const tauxRecouvrement = totalAnnuelDu > 0 
      ? Math.min(100, Math.round((totalVerseToDate / totalAnnuelDu) * 100)) 
      : (totalVerseToDate > 0 ? 100 : 0);

    // Payments for Services
    const isCantineStudent = (s: any) =>
      Boolean(
        s.service_cantine === 1 ||
        s.service_cantine === true ||
        s.service_cantine === "1" ||
        s.service_cantine === "true" ||
        s.cantine === 1 ||
        s.cantine === true ||
        s.is_cantine ||
        s.cantine_active ||
        s.option_cantine
      );

    const isTransportStudent = (s: any) =>
      Boolean(
        s.service_transport === 1 ||
        s.service_transport === true ||
        s.service_transport === "1" ||
        s.service_transport === "true" ||
        s.transport === 1 ||
        s.transport === true ||
        s.is_transport ||
        s.transport_active ||
        s.option_transport
      );

    let cantineEncaisse = 0;
    let transportEncaisse = 0;
    let kitsDiversEncaisse = 0;

    validPayments.forEach((p: any) => {
      const t = String(p.type || p.motif || p.rubrique || "").toLowerCase();
      const amt = Number(p.montant || 0);
      if (amt <= 0) return;

      if (t.includes("cant")) {
        cantineEncaisse += amt;
      } else if (t.includes("trans") || t.includes("car")) {
        transportEncaisse += amt;
      } else if (
        t.includes("kit") ||
        t.includes("tenue") ||
        t.includes("uniforme") ||
        t.includes("polo") ||
        t.includes("fourniture") ||
        t.includes("anglais") ||
        t.includes("informatique") ||
        t.includes("divers")
      ) {
        kitsDiversEncaisse += amt;
      } else if (t.includes("pack") || t.includes("forfait") || t.includes("tout_compris")) {
        if (p.echeances_affectees) {
          try {
            const allocs = typeof p.echeances_affectees === "string" ? JSON.parse(p.echeances_affectees) : p.echeances_affectees;
            if (Array.isArray(allocs)) {
              allocs.forEach((a: any) => {
                const st = String(a.service_type || a.rubrique || "").toLowerCase();
                const aAmt = Number(a.montant || 0);
                if (st.includes("cant")) cantineEncaisse += aAmt;
                else if (st.includes("trans") || st.includes("car")) transportEncaisse += aAmt;
                else if (st.includes("kit") || st.includes("tenue") || st.includes("divers")) kitsDiversEncaisse += aAmt;
              });
            }
          } catch (e) {
            // ignore
          }
        }
      }
    });

    const cantineAbonnes = students.filter(isCantineStudent).length;
    const transportAbonnes = students.filter(isTransportStudent).length;

    // Montants des services (réels encaissés ou valorisation des abonnements)
    const cantineTotal = cantineEncaisse > 0 ? cantineEncaisse : (cantineAbonnes * 15000);
    const transportTotal = transportEncaisse > 0 ? transportEncaisse : (transportAbonnes * 18000);
    const servicesTotal = cantineTotal + transportTotal + kitsDiversEncaisse;

    return {
      totalStudents,
      validedInsc,
      pendingInsc,
      totalAnnuelDu,
      totalVerseToDate,
      totalResteToDate,
      tauxRecouvrement,
      cantineTotal,
      transportTotal,
      cantineAbonnes,
      transportAbonnes,
      kitsDiversEncaisse,
      servicesTotal,
    };
  }, [students, payments, classes]);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const name = `${s.firstName || s.prenom || ""} ${s.lastName || s.nom || ""}`.toLowerCase();
      const mat = (s.matricule || "").toLowerCase();
      const cls = (s.className || s.classe || "").toLowerCase();
      const lvl = getStudentLevel(s);

      const matchesSearch = !searchQuery || name.includes(searchQuery.toLowerCase()) || mat.includes(searchQuery.toLowerCase()) || cls.includes(searchQuery.toLowerCase());
      const matchesLevel = selectedLevel === "Tous" || lvl === selectedLevel;
      const matchesClass = selectedClass === "Tous" || s.className === selectedClass;

      const inscStat = (s.status || s.statut || "en_cours").toLowerCase();
      const matchesInscStatus = selectedInscStatus === "Tous" || (selectedInscStatus === "valide" && inscStat.includes("val")) || (selectedInscStatus === "en_cours" && !inscStat.includes("val"));

      const du = scolariteDue(s, classes);
      const verse = totalVerse(s, payments);
      const reste = Math.max(0, du - verse);

      let payStat = "partiel";
      if (reste <= 0) payStat = "solde";
      else if (verse === 0) payStat = "impaye";

      const matchesPayStatus = selectedPayStatus === "Tous" || selectedPayStatus === payStat;

      return matchesSearch && matchesLevel && matchesClass && matchesInscStatus && matchesPayStatus;
    });
  }, [students, payments, classes, searchQuery, selectedLevel, selectedClass, selectedInscStatus, selectedPayStatus]);

  // Level Progression Breakdown for Charts
  const levelBreakdown = useMemo(() => {
    const map: Record<string, { total: number; valide: number; verse: number; du: number }> = {
      Maternelle: { total: 0, valide: 0, verse: 0, du: 0 },
      Primaire: { total: 0, valide: 0, verse: 0, du: 0 },
      Collège: { total: 0, valide: 0, verse: 0, du: 0 },
      Lycée: { total: 0, valide: 0, verse: 0, du: 0 },
    };

    students.forEach((s) => {
      const lvl = getStudentLevel(s);
      if (map[lvl]) {
        map[lvl].total += 1;
        const stat = (s.status || s.statut || "").toLowerCase();
        if (stat.includes("val") || stat.includes("act") || stat.includes("comp") || stat.includes("insc")) map[lvl].valide += 1;
        map[lvl].du += scolariteDue(s, classes);
        map[lvl].verse += totalVerse(s, payments);
      }
    });

    return map;
  }, [students, payments, classes]);

  // Recharts Datasets
  const chartDataInscriptions = useMemo(() => {
    return Object.entries(levelBreakdown).map(([lvlName, lvlData]) => ({
      niveau: lvlName,
      "Élèves Inscrits": lvlData.total,
      "Dossiers Validés": lvlData.valide,
      "En Cours": Math.max(0, lvlData.total - lvlData.valide),
    }));
  }, [levelBreakdown]);

  const chartDataFinance = useMemo(() => {
    return Object.entries(levelBreakdown).map(([lvlName, lvlData]) => ({
      niveau: lvlName,
      "Total Versé": lvlData.verse,
      "Reste à Recouvrer": Math.max(0, lvlData.du - lvlData.verse),
      "Budget Prévisionnel": lvlData.du,
    }));
  }, [levelBreakdown]);

  // Ventilation réelle des encaissements, d'après le type de chaque paiement enregistré.
  const chartDataServices = useMemo(() => ventilationParRubrique(payments), [payments]);

  // Recouvrement cumulé mois par mois, d'après la date réelle de chaque paiement.
  // Les mois à venir restent vides : la courbe ne projette rien.
  const chartDataMonthly = useMemo(
    () => recouvrementMensuel(payments, stats.totalAnnuelDu),
    [payments, stats.totalAnnuelDu],
  );

  // Daily Inscriptions Report Trigger
  const handlePrintDailyInscriptions = () => {
    const list: DailyInscriptionItem[] = filteredStudents.map((s) => {
      const isValide = (s.status || s.statut || "").toLowerCase().includes("val");
      return {
        id: s.id,
        matricule: s.matricule || `MAT-${s.id}`,
        studentName: `${s.lastName || s.nom || ""} ${s.firstName || s.prenom || ""}`.trim(),
        studentClass: s.className || s.classe || "",
        level: getStudentLevel(s),
        dateInscription: s.dateInscription || filterDate,
        status: isValide ? "valide" : "en_cours",
        modePaiement: s.modePaiement || "Espèces",
        montantFraisAnnexe: 15000,
        montantFraisInscription: 20000,
      };
    });

    printDailyInscriptionsReport({
      date: filterDate,
      inscriptions: list,
      selectedClass: selectedClass !== "Tous" ? selectedClass : undefined,
      selectedLevel: selectedLevel !== "Tous" ? selectedLevel : undefined,
    });
  };

  // Daily Services Report Trigger
  const handlePrintDailyServices = () => {
    const list: DailyServicePaymentItem[] = payments.map((p, idx) => ({
      id: p.id || idx,
      date: p.date || filterDate,
      numeroRecu: p.numero_recu || `RC-SERV-${idx + 100}`,
      matricule: p.matricule || "MAT-ELEVE",
      studentName: p.eleve_nom || p.studentName || "Élève Inscrit",
      studentClass: p.classe || "CM1 B",
      serviceType: (p.type || "").toLowerCase().includes("cant") ? "cantine" : (p.type || "").toLowerCase().includes("trans") || (p.type || "").toLowerCase().includes("car") ? "transport" : "autre",
      periodOrMonth: p.mois || "Mensualité en cours",
      amount: Number(p.montant || 15000),
      modePaiement: p.mode || "espèces",
    }));

    printDailyServicesReport({
      date: filterDate,
      servicePayments: list,
      selectedLevel: selectedLevel !== "Tous" ? selectedLevel : undefined,
    });
  };

  const currentCityName = useMemo(() => {
    if (userVille) return userVille.trim().toUpperCase();
    if (schools.length > 0) {
      const userSchool = schools.find((s: any) => 
        (userEcoleId && String(s.IDETABLISSEMENT || s.id) === String(userEcoleId)) ||
        (userCode && (s.ET_CODEETABLISSEMENT || s.code || "").trim().toUpperCase() === userCode.trim().toUpperCase())
      );
      if (userSchool && (userSchool.ET_VILLE || userSchool.ville)) {
        return (userSchool.ET_VILLE || userSchool.ville).trim().toUpperCase();
      }
    }
    if (isUserFromAbidjan(userRole, userVille)) return "ABIDJAN";
    return userCode || "Ville";
  }, [userVille, schools, userEcoleId, userCode, userRole]);

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen pb-20">
      {/* ── EN-TÊTE SOBRE ET PROFESSIONNEL ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-lg bg-[#0f2444] text-white flex items-center justify-center shadow-xs">
            <BarChart3 className="w-6 h-6 text-slate-100" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              {isGlobalSupervisor ? "Supervision Générale & Statistiques" : `Statistiques Scolaires — ${currentCityName}`}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Suivi consolidé des inscriptions, du recouvrement financier et de la situation des effectifs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-200 text-slate-700 text-xs font-semibold h-9 gap-1.5"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Actualiser
          </Button>
          <Button
            size="sm"
            className="bg-[#0f2444] hover:bg-[#163564] text-white text-xs font-semibold h-9 gap-1.5 shadow-xs"
            onClick={handlePrintDailyInscriptions}
          >
            <Printer className="w-3.5 h-3.5" /> Bilan des Inscriptions (PDF)
          </Button>
        </div>
      </div>

      {/* ── KPI OVERVIEW CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Inscriptions */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Effectifs Inscrits</span>
            <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{stats.totalStudents.toLocaleString()}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              <span className="font-semibold text-emerald-700">{stats.validedInsc} validés</span> • <span className="font-medium text-amber-700">{stats.pendingInsc} en cours</span>
            </p>
          </div>
        </div>

        {/* KPI 2: Recouvrement */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cumul Encaissements</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{stats.totalVerseToDate.toLocaleString()} <span className="text-sm font-bold text-slate-500">FCFA</span></h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Taux de recouvrement : <span className="font-bold text-emerald-700">{stats.tauxRecouvrement}%</span>
            </p>
          </div>
        </div>

        {/* KPI 3: Impayés & Reste */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Reste à Recouvrer</span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{stats.totalResteToDate.toLocaleString()} <span className="text-sm font-bold text-slate-500">FCFA</span></h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Sur total prévu : <span className="font-semibold text-slate-700">{stats.totalAnnuelDu.toLocaleString()} FCFA</span>
            </p>
          </div>
        </div>

        {/* KPI 4: Services Annexes */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Services Annexes</span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Utensils className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {stats.servicesTotal.toLocaleString()} <span className="text-sm font-bold text-slate-500">FCFA</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cantine : <span className="font-semibold text-slate-700">{stats.cantineTotal.toLocaleString()} F</span> ({stats.cantineAbonnes} {stats.cantineAbonnes > 1 ? "abonnés" : "abonné"}) • Transport : <span className="font-semibold text-slate-700">{stats.transportTotal.toLocaleString()} F</span> ({stats.transportAbonnes} {stats.transportAbonnes > 1 ? "abonnés" : "abonné"})
              {stats.kitsDiversEncaisse > 0 && ` • Kits/Divers : ${stats.kitsDiversEncaisse.toLocaleString()} F`}
            </p>
          </div>
        </div>
      </div>

      {/* ── MAIN NAVIGATION TABS ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100/90 p-1 rounded-lg border border-slate-200/80 w-full max-w-4xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 h-auto">
          <TabsTrigger value="dashboard" className="gap-1.5 font-medium text-xs py-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs">
            <BarChart3 className="w-3.5 h-3.5" /> Indicateurs & Graphiques
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-1.5 font-medium text-xs py-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs">
            <Users className="w-3.5 h-3.5" /> Dossiers & Paiements
          </TabsTrigger>
          <TabsTrigger value="unpaid" className="gap-1.5 font-medium text-xs py-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs">
            <Clock className="w-3.5 h-3.5" /> Impayés Périodiques
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5 font-medium text-xs py-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs">
            <Printer className="w-3.5 h-3.5" /> Bilans & Rapports
          </TabsTrigger>
          <TabsTrigger value="periodes" className="gap-1.5 font-medium text-xs py-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs">
            <CalendarDays className="w-3.5 h-3.5" /> Périodes & Verrouillage
          </TabsTrigger>
        </TabsList>

        {/* =================================================================== */}
        {/* TAB 1: GRAPHIQUES ET PROGRESSION */}
        {/* =================================================================== */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* RECHARTS 1: INSCRIPTIONS ET VALIDATIONS PAR NIVEAU */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-slate-600" /> Répartition des Inscriptions par Cycle
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comparatif des dossiers inscrits et des dossiers validés
                </p>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart data={chartDataInscriptions} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="niveau" fontSize={11} stroke="#64748b" />
                    <YAxis fontSize={11} stroke="#64748b" />
                    <ReTooltip
                      contentStyle={{
                        backgroundColor: "#0f2444",
                        color: "#ffffff",
                        borderRadius: "6px",
                        fontSize: "12px",
                        border: "none",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                    <Bar dataKey="Élèves Inscrits" fill="#0f2444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Dossiers Validés" fill="#059669" radius={[4, 4, 0, 0]} />
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* RECHARTS 2: RECOUVREMENT FINANCIER PAR NIVEAU */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-600" /> Suivi du Recouvrement par Cycle
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Montant prévisionnel annuel vs total versé par cycle (FCFA)
                </p>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ReAreaChart data={chartDataFinance} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorVerse" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.7} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="colorReste" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d97706" stopOpacity={0.7} />
                        <stop offset="95%" stopColor="#d97706" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="niveau" fontSize={11} stroke="#64748b" />
                    <YAxis fontSize={10} stroke="#64748b" tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`} />
                    <ReTooltip
                      formatter={(val: number) => [`${val.toLocaleString()} F CFA`]}
                      contentStyle={{
                        backgroundColor: "#0f2444",
                        color: "#ffffff",
                        borderRadius: "6px",
                        fontSize: "12px",
                        border: "none",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                    <Area type="monotone" dataKey="Total Versé" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorVerse)" />
                    <Area type="monotone" dataKey="Reste à Recouvrer" stroke="#d97706" strokeWidth={2} fillOpacity={1} fill="url(#colorReste)" />
                  </ReAreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* RECHARTS 3: VENTILATION DES SERVICES */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* PIE CHART SERVICES */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs lg:col-span-1">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-slate-600" /> Ventilation des Encaissements
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Proportion des paiements par rubrique
                </p>
              </div>
              <div className="h-[230px] w-full flex flex-col items-center justify-center">
                {chartDataServices.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center text-xs text-slate-500 px-6">
                    Aucun encaissement enregistré pour le moment.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={chartDataServices}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {chartDataServices.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ReTooltip formatter={(val: number) => [`${val.toLocaleString()} F CFA`]} />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    </RePieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* MONTHLY RECOVERY TREND CHART */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs lg:col-span-2">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-600" /> Recouvrement Mensuel Cumulé
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Évolution des encaissements de Septembre au mois en cours
                </p>
              </div>
              <div className="h-[230px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ReLineChart data={chartDataMonthly} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mois" fontSize={11} stroke="#64748b" />
                    <YAxis fontSize={10} stroke="#64748b" tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`} />
                    <ReTooltip formatter={(val: number) => [`${val.toLocaleString()} F CFA`]} />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                    <Line type="monotone" dataKey="Recouvrement Cumulé" stroke="#059669" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Impayés Reste" stroke="#dc2626" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
                  </ReLineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 2: DOSSIERS ÉLÈVES ET STATUTS DE PAIEMENT */}
        {/* =================================================================== */}
        <TabsContent value="students" className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-600" /> Répertoire des Dossiers Élèves
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Consultez l'état d'inscription (Validé / En cours) et le statut financier précis de chaque élève.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrintDailyInscriptions} className="text-xs font-semibold gap-1.5 h-8 border-slate-200 text-slate-700">
                  <Printer className="w-3.5 h-3.5" /> Imprimer la sélection
                </Button>
              </div>
            </div>

            {/* FILTERS BAR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  placeholder="Nom, matricule, classe..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-white border-slate-200"
                />
              </div>

              {/* Level */}
              <div>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                    <SelectValue placeholder="Niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((lvl) => (
                      <SelectItem key={lvl} value={lvl}>
                        {lvl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Class */}
              <div>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                    <SelectValue placeholder="Classe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tous">Toutes les classes</SelectItem>
                    {classOptions.map((cls) => (
                      <SelectItem key={cls} value={cls}>
                        {cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Insc Status */}
              <div>
                <Select value={selectedInscStatus} onValueChange={setSelectedInscStatus}>
                  <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                    <SelectValue placeholder="Statut Inscription" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tous">Tous les statuts insc.</SelectItem>
                    <SelectItem value="valide">Validé uniquement</SelectItem>
                    <SelectItem value="en_cours">En cours uniquement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Pay Status */}
              <div>
                <Select value={selectedPayStatus} onValueChange={setSelectedPayStatus}>
                  <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                    <SelectValue placeholder="Statut Paiement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tous">Tous les statuts paiement</SelectItem>
                    <SelectItem value="solde">Soldé</SelectItem>
                    <SelectItem value="partiel">Partiel</SelectItem>
                    <SelectItem value="impaye">Impayé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* TABLE OF STUDENTS */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="p-3">Matricule</th>
                    <th className="p-3">Élève</th>
                    <th className="p-3">Classe & Cycle</th>
                    <th className="p-3 text-center">Inscription</th>
                    <th className="p-3 text-right">Total Dû</th>
                    <th className="p-3 text-right">Montant Versé</th>
                    <th className="p-3 text-right">Reste à Payer</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center p-8 text-slate-500">
                        Aucun élève trouvé pour les critères sélectionnés.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => {
                      const name = `${s.lastName || s.nom || ""} ${s.firstName || s.prenom || ""}`.trim();
                      const cls = s.className || s.classe || "—";
                      const lvl = getStudentLevel(s);
                      const isValide = (s.status || s.statut || "").toLowerCase().includes("val");

                      const du = scolariteDue(s);
                      const verse = totalVerse(s, payments);
                      const reste = Math.max(0, du - verse);

                      return (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-600">{s.matricule || `MAT-${s.id}`}</td>
                          <td className="p-3 font-bold text-slate-900">{name}</td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-800">{cls}</span>{" "}
                            <span className="text-[10px] text-slate-500">({lvl})</span>
                          </td>
                          <td className="p-3 text-center">
                            {isValide ? (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Validé
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                En cours
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right font-medium text-slate-700">{du.toLocaleString()} F</td>
                          <td className="p-3 text-right font-semibold text-emerald-700">{verse.toLocaleString()} F</td>
                          <td className="p-3 text-right font-bold text-amber-700">{reste.toLocaleString()} FCFA</td>
                          <td className="p-3 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-[#0f2444] hover:bg-slate-100 font-semibold"
                              onClick={() => setSelectedStudentDetail(s)}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> Dossier
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 3: IMPAYÉS PÉRIODIQUES */}
        {/* =================================================================== */}
        <TabsContent value="unpaid" className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-600" /> Suivi des Impayés par Échéance Mensuelle
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Identifiez tranche par tranche les retards de paiement et visualisez le reste à recouvrer.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Select value={selectedMonthImpaye} onValueChange={setSelectedMonthImpaye}>
                  <SelectTrigger className="w-[180px] h-8 text-xs font-semibold bg-white border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m} value={m}>
                        Échéance {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="p-3">Matricule</th>
                    <th className="p-3">Élève</th>
                    <th className="p-3">Classe</th>
                    <th className="p-3 text-center">Échéance ciblée</th>
                    <th className="p-3 text-right">Montant Tranche</th>
                    <th className="p-3 text-right">Reste sur la Tranche</th>
                    <th className="p-3 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.slice(0, 10).map((s) => {
                    const name = `${s.lastName || s.nom || ""} ${s.firstName || s.prenom || ""}`.trim();
                    const cls = s.className || s.classe || "CM1 B";

                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-600">{s.matricule || `MAT-${s.id}`}</td>
                        <td className="p-3 font-bold text-slate-900">{name}</td>
                        <td className="p-3 font-medium text-slate-700">{cls}</td>
                        <td className="p-3 text-center font-medium text-slate-700">{selectedMonthImpaye}</td>
                        <td className="p-3 text-right font-medium text-slate-700">30 000 F</td>
                        <td className="p-3 text-right font-bold text-amber-700">30 000 FCFA</td>
                        <td className="p-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            En attente
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 4: BILANS DU JOUR ET EXPORTS */}
        {/* =================================================================== */}
        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ITEM 1: BILAN DES INSCRIPTIONS */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Printer className="w-4 h-4 text-slate-600" /> Bilan Quotidien des Inscriptions
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rapport consolidé des inscriptions du jour par classe et par niveau.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Date du bilan</Label>
                  <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="h-8 text-xs border-slate-200" />
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5 text-slate-600">
                  <p className="font-semibold text-slate-800">Contenu du document officiel A4 :</p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
                    <li>Effectif nominatif des élèves inscrits et validés.</li>
                    <li>Ventilation des Frais Annexes et Frais d'Inscription.</li>
                    <li>Emplacements de visa pour la Direction et la Supervision.</li>
                  </ul>
                </div>

                <Button
                  className="w-full bg-[#0f2444] hover:bg-[#163564] text-white font-semibold text-xs h-9 gap-2 shadow-xs"
                  onClick={handlePrintDailyInscriptions}
                >
                  <Download className="w-4 h-4" /> Générer / Imprimer le Bilan des Inscriptions
                </Button>
              </div>
            </div>

            {/* ITEM 2: BILAN DES SERVICES ANNEXES */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-slate-600" /> Bilan des Services Annexes (Cantine & Transport)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Encaissements journaliers pour la cantine scolaire et le transport.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Date du bilan</Label>
                  <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="h-8 text-xs border-slate-200" />
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5 text-slate-600">
                  <p className="font-semibold text-slate-800">Synthèse de trésorerie :</p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
                    <li>Versements Cantine et Transport nominatifs.</li>
                    <li>Totaux cumulés par mode de règlement (Espèces, Chèque, Mobile Money).</li>
                    <li>Conformité d'audit et de contrôle comptable.</li>
                  </ul>
                </div>

                <Button
                  className="w-full bg-[#0f2444] hover:bg-[#163564] text-white font-semibold text-xs h-9 gap-2 shadow-xs"
                  onClick={handlePrintDailyServices}
                >
                  <Printer className="w-4 h-4" /> Générer / Imprimer le Bilan des Services
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 5: PÉRIODES & VERROUILLAGE DES NOTES */}
        {/* =================================================================== */}
        <TabsContent value="periodes" className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-indigo-700" />
                  Gestion des Périodes Scolaires & Verrouillage des Notes
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Définissez les dates de début, fin, ouverture et clôture de chaque période. Dès que la date de clôture est atteinte, la saisie est verrouillée.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Year Selector */}
                <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
                  <span className="text-[11px] text-slate-500 px-1.5 hidden sm:inline">Année :</span>
                  {['2025-2026', '2024-2025', '2026-2027'].map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setSelectedAnneePeriode(yr)}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        selectedAnneePeriode === yr
                          ? 'bg-indigo-600 text-white shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {yr === '2025-2026' ? '2025-2026 (En cours)' : yr}
                    </button>
                  ))}
                </div>

                {/* Period Type Filter */}
                <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setTypePeriodeFilter('trimestre')}
                    className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                      typePeriodeFilter === 'trimestre' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Trimestres
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypePeriodeFilter('semestre')}
                    className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                      typePeriodeFilter === 'semestre' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semestres
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadPeriodesData(selectedAnneePeriode)}
                  disabled={loadingPeriodes}
                  className="h-8 gap-1.5 text-xs border-slate-200"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingPeriodes ? 'animate-spin' : ''}`} />
                  Actualiser
                </Button>
              </div>
            </div>

            {/* Information Banner */}
            <div className="p-3.5 rounded-lg bg-indigo-50/70 border border-indigo-200/80 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-950 space-y-1">
                <p className="font-semibold text-indigo-900">Règle de Verrouillage & Sécurité Pédagogique (Année {selectedAnneePeriode})</p>
                <p className="text-indigo-800 leading-relaxed">
                  Vous pouvez à tout moment <strong>activer ou verrouiller</strong> une période d'un simple clic ci-dessous. Dès qu'une période est verrouillée, la saisie des notes est immédiatement bloquée pour tous les enseignants et éducateurs.
                </p>
              </div>
            </div>

            {/* List of Period Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
              {periodes
                .filter((p) => p.annee_scolaire === selectedAnneePeriode && p.type_periode === typePeriodeFilter)
                .map((p) => {
                  const { est_verrouille, statut_saisie } = computePeriodeStatus(p);
                  const isLocked = est_verrouille;
                  const isUnlockedByAdmin = !!p.deverrouille_par_admin;

                  return (
                    <div
                      key={p.id}
                      className={`rounded-xl border p-4.5 space-y-4 transition-all shadow-xs ${
                        isUnlockedByAdmin
                          ? 'border-purple-200 bg-purple-50/20 ring-1 ring-purple-200'
                          : isLocked
                          ? 'border-rose-200 bg-rose-50/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {/* Period Header */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">{p.libelle}</h4>
                          <span className="text-[11px] text-indigo-700 font-semibold">Année Scolaire {p.annee_scolaire}</span>
                        </div>

                        {/* Status Badge */}
                        {isUnlockedByAdmin ? (
                          <Badge className="bg-purple-100 text-purple-800 border border-purple-300 text-[10px] font-semibold gap-1 py-0.5">
                            <Unlock className="w-3 h-3 text-purple-700" /> Saisie Activée (Admin)
                          </Badge>
                        ) : isLocked ? (
                          <Badge className="bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-semibold gap-1 py-0.5">
                            <Lock className="w-3 h-3 text-rose-700" /> Saisie Verrouillée
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-semibold gap-1 py-0.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Saisie Ouverte
                          </Badge>
                        )}
                      </div>

                      {/* Admin Override Tracking if active */}
                      {isUnlockedByAdmin && (
                        <div className="p-2.5 bg-purple-100/70 border border-purple-200 rounded-lg text-[11px] text-purple-950 space-y-1">
                          <p className="font-bold flex items-center gap-1.5 text-purple-900">
                            <KeyRound className="w-3.5 h-3.5 text-purple-700" /> Dérogation active
                          </p>
                          <p className="text-purple-800">
                            Activé par : <strong>{p.deverrouille_par || 'Superviseur'}</strong>
                          </p>
                          {p.motif_deverrouillage && (
                            <p className="text-purple-900 italic text-[10.5px]">« {p.motif_deverrouillage} »</p>
                          )}
                        </div>
                      )}

                      {/* Dates Form Fields */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-600">Début Période</Label>
                          <Input
                            type="date"
                            value={p.date_debut || ''}
                            onChange={(e) => handleUpdatePeriodeField(p.id, 'date_debut', e.target.value)}
                            className="h-8 text-xs font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-600">Fin Période</Label>
                          <Input
                            type="date"
                            value={p.date_fin || ''}
                            onChange={(e) => handleUpdatePeriodeField(p.id, 'date_fin', e.target.value)}
                            className="h-8 text-xs font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-indigo-700">Ouverture Saisie</Label>
                          <Input
                            type="date"
                            value={p.date_ouverture_saisie || ''}
                            onChange={(e) => handleUpdatePeriodeField(p.id, 'date_ouverture_saisie', e.target.value)}
                            className="h-8 text-xs font-mono border-indigo-200 bg-indigo-50/20"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-rose-700">Clôture Saisie</Label>
                          <Input
                            type="date"
                            value={p.date_cloture_saisie || ''}
                            onChange={(e) => handleUpdatePeriodeField(p.id, 'date_cloture_saisie', e.target.value)}
                            className="h-8 text-xs font-mono border-rose-200 bg-rose-50/20 font-bold"
                          />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
                        {/* Bouton Principal: Activer ou Verrouiller */}
                        {isLocked ? (
                          <Button
                            size="sm"
                            onClick={() => handleActiverPeriode(p)}
                            disabled={togglingPeriodeId === p.id}
                            className="w-full text-xs font-bold h-9 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-xs transition-colors cursor-pointer"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            {togglingPeriodeId === p.id ? 'Activation...' : 'Activer la période (Ouvrir la saisie)'}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleVerrouillerPeriode(p)}
                            disabled={togglingPeriodeId === p.id}
                            className="w-full text-xs font-bold h-9 bg-rose-600 hover:bg-rose-700 text-white gap-2 shadow-xs transition-colors cursor-pointer"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            {togglingPeriodeId === p.id ? 'Verrouillage...' : 'Verrouiller la période'}
                          </Button>
                        )}

                        {/* Bouton Sauvegarder les dates */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSavePeriodeDates(p)}
                          disabled={savingDatesId === p.id}
                          className="w-full text-xs font-semibold h-8 border-slate-200 hover:bg-slate-50 gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
                          {savingDatesId === p.id ? 'Sauvegarde...' : 'Sauvegarder les dates'}
                        </Button>

                        {/* Option Dérogation avec motif */}
                        {isLocked && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPeriodeToUnlock(p);
                              setUnlockMotif(`Prolongation exceptionnelle accordée pour le ${p.libelle} (${p.annee_scolaire})`);
                            }}
                            className="text-[11px] text-purple-700 hover:text-purple-900 hover:underline text-center py-0.5 font-medium"
                          >
                            Activer avec motif de dérogation personnalisé...
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

              {periodes.filter((p) => p.annee_scolaire === selectedAnneePeriode && p.type_periode === typePeriodeFilter).length === 0 && (
                <div className="col-span-full p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-3">
                  <CalendarDays className="w-8 h-8 text-indigo-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">
                    Aucune période configurée pour l'année {selectedAnneePeriode} ({typePeriodeFilter === 'trimestre' ? 'Trimestres' : 'Semestres'}).
                  </p>
                  <Button
                    size="sm"
                    onClick={() => loadPeriodesData(selectedAnneePeriode)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                  >
                    Initialiser les périodes {selectedAnneePeriode}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL: SAUTER LE VERROU DE PÉRIODE */}
      {selectedPeriodeToUnlock && (
        <Dialog open={!!selectedPeriodeToUnlock} onOpenChange={(v) => !v && setSelectedPeriodeToUnlock(null)}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <Unlock className="w-5 h-5 text-purple-700" />
                Sauter le Verrou de la Période
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Dérogation accordée à {selectedPeriodeToUnlock.libelle} ({selectedPeriodeToUnlock.annee_scolaire})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Cette action lève immédiatement le verrou de clôture. Les enseignants et éducateurs pourront à nouveau saisir et modifier les notes de cette période.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Motif de la dérogation administrative *</Label>
                <Input
                  value={unlockMotif}
                  onChange={(e) => setUnlockMotif(e.target.value)}
                  placeholder="Ex: Prolongation exceptionnelle accordée pour finalisation des saisies..."
                  className="text-xs h-9"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPeriodeToUnlock(null)}
                className="text-xs font-semibold"
              >
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmSauterVerrou}
                className="bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs gap-1.5 shadow-xs"
              >
                <Unlock className="w-3.5 h-3.5" /> Confirmer le saut de verrou
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL: DETAIL DU DOSSIER ÉLÈVE SUPERVISEUR */}
      {selectedStudentDetail && (
        <Dialog open={!!selectedStudentDetail} onOpenChange={(v) => !v && setSelectedStudentDetail(null)}>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <Users className="w-4 h-4 text-slate-600" /> Dossier Individuel de l'Élève
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Fiche administrative et situation financière de l'élève.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* STUDENT IDENTITY */}
              <div className="flex items-center gap-3.5 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="w-12 h-12 rounded-lg bg-[#0f2444] text-white font-bold text-lg flex items-center justify-center">
                  {(selectedStudentDetail.lastName || selectedStudentDetail.nom || "E")[0]}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    {selectedStudentDetail.lastName || selectedStudentDetail.nom} {selectedStudentDetail.firstName || selectedStudentDetail.prenom}
                  </h4>
                  <p className="text-slate-500 font-mono text-[11px]">Matricule : {selectedStudentDetail.matricule || `MAT-${selectedStudentDetail.id}`}</p>
                  <p className="font-semibold text-slate-700">Classe : {selectedStudentDetail.className || selectedStudentDetail.classe || "CM1 B"}</p>
                </div>
              </div>

              {/* FINANCIAL SUMMARY */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Scolarité Due</p>
                  <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                    {scolariteDue(selectedStudentDetail).toLocaleString()} F
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-[10px] text-emerald-700 font-bold uppercase">Total Versé</p>
                  <p className="font-extrabold text-emerald-700 text-sm mt-0.5">
                    {totalVerse(selectedStudentDetail, payments).toLocaleString()} F
                  </p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-[10px] text-amber-700 font-bold uppercase">Solde Restant</p>
                  <p className="font-extrabold text-amber-700 text-sm mt-0.5">
                    {Math.max(0, scolariteDue(selectedStudentDetail) - totalVerse(selectedStudentDetail, payments)).toLocaleString()} FCFA
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setSelectedStudentDetail(null)} className="text-xs font-semibold">
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
    </Layout>
  );
};

export default SupervisorSpace;
