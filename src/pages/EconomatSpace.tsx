import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Boxes,
  ShoppingBag,
  DollarSign,
  Receipt,
  Search,
  Package,
  FileCheck2,
  Printer,
  Plus,
  TrendingUp,
  AlertTriangle,
  Users,
  Building2,
  CheckCircle2,
  Layers,
  ArrowRightLeft,
  BookOpen,
  GraduationCap,
  Bus,
  Utensils,
  ClipboardList,
  ShieldCheck,
  Briefcase,
  UserCheck,
  Info,
  Calendar,
  Sparkles,
  RefreshCw,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
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
import { useToast } from "@/hooks/use-toast";
import { formatStudentName, formatCurrency, formatDate, matchStudentSearch } from "@/lib/index";
import apiClient from "@/lib/apiClient";
import {
  setGrillePresets,
  getGrillePresets,
  readFraisEcolageConfig,
  writeFraisEcolageConfig,
} from "@/lib/grilleTarifaire";
import { getRealSchoolName } from "@/lib/certificatePrinter";
import { printReceipt, downloadReceiptPDF, generateReceiptNumber, type ReceiptData } from "@/lib/receiptPrinter";

// Official Fixed Exam Fees
export const OFFICIAL_EXAM_FEES = {
  BEPC: { code: "BEPC", label: "Brevet d'Études du Premier Cycle (BEPC)", amount: 2000, targetLevel: "3ème" },
  BAC: { code: "BAC", label: "Baccalauréat (BAC)", amount: 5000, targetLevel: "Terminale" },
  CEPE_ARABE: { code: "CEPE_ARABE", label: "CEPE Arabe (Confessionnel)", amount: 7000, targetLevel: "CM2" },
  CEPE_OFFICIEL: { code: "CEPE_OFFICIEL", label: "CEPE Officiel (Ministériel)", amount: 500, targetLevel: "CM2" },
} as const;

// Initial mock stock data
const INITIAL_STOCK_ITEMS = [
  { id: "STK-001", name: "Craie Blanche (Boîte de 100)", category: "Fournitures", quantity: 45, minThreshold: 10, unitPrice: 1500, unit: "Boîtes" },
  { id: "STK-002", name: "Rame de papier A4 80g", category: "Paperasserie", quantity: 18, minThreshold: 20, unitPrice: 3500, unit: "Rames" },
  { id: "STK-003", name: "Ensemble Tenue Scolaire Collège H", category: "Uniforme", quantity: 60, minThreshold: 15, unitPrice: 10000, unit: "Kits" },
  { id: "STK-004", name: "Ensemble Tenue Scolaire Collège F", category: "Uniforme", quantity: 52, minThreshold: 15, unitPrice: 10000, unit: "Kits" },
  { id: "STK-005", name: "Carnet de correspondance", category: "Imprimés", quantity: 120, minThreshold: 30, unitPrice: 1500, unit: "Unités" },
  { id: "STK-006", name: "Savon liquide lavabo (Bidon 5L)", category: "Entretien", quantity: 8, minThreshold: 5, unitPrice: 4500, unit: "Bidons" },
  { id: "STK-007", name: "Marqueur pour tableau blanc (Noir)", category: "Fournitures", quantity: 35, minThreshold: 12, unitPrice: 500, unit: "Unités" },
];

// Initial mock distributions data
const INITIAL_DISTRIBUTIONS = [
  { id: "DIST-001", date: "2026-08-10", beneficiary: "M. Traoré (Prof. Math3A)", item: "Craie Blanche (Boîte de 100)", quantity: 2, unit: "Boîtes", motif: "Dotation mensuelle classe 3ème A" },
  { id: "DIST-002", date: "2026-08-11", beneficiary: "Secrétariat de Direction", item: "Rame de papier A4 80g", quantity: 5, unit: "Rames", motif: "Impression bulletins & circulaires" },
  { id: "DIST-003", date: "2026-08-12", beneficiary: "Service Propreté & Agent Technique", item: "Savon liquide lavabo (Bidon 5L)", quantity: 2, unit: "Bidons", motif: "Réapprovisionnement sanitaires" },
];

// Initial mock purchases data
const INITIAL_PURCHASES = [
  { id: "ACH-001", date: "2026-08-01", supplier: "Librairie Papeterie Abidjan", item: "Rame de papier A4 80g", quantity: 30, totalAmount: 105000, status: "LIVRE" },
  { id: "ACH-002", date: "2026-08-05", supplier: "Manufacture Textile Côte d'Ivoire", item: "Ensembles Tenues Scolaires", quantity: 100, totalAmount: 850000, status: "LIVRE" },
  { id: "ACH-003", date: "2026-08-08", supplier: "Grossiste Matériel Entretien Biabou", item: "Produits désinfectants & Savons", quantity: 15, totalAmount: 67500, status: "LIVRE" },
];

export interface CantinePlan {
  id: string;
  nom: string;
  montant: number;
  periode: 'mensuel' | 'trimestriel' | 'annuel' | 'repas';
  description?: string;
}

export interface TransportZone {
  id: string;
  nom: string;
  tarifMensuel: number;
  quartiers?: string[];
}

const DEFAULT_CANTINE_PLANS: CantinePlan[] = [
  { id: 'cant-1', nom: 'Abonnement Mensuel Cantine', montant: 15000, periode: 'mensuel', description: 'Restauration complète du lundi au vendredi' },
  { id: 'cant-2', nom: 'Formule Trimestrielle Cantine', montant: 45000, periode: 'trimestriel', description: 'Accès cantine 1er / 2ème / 3ème trimestre' },
  { id: 'cant-3', nom: 'Repas Occasionnel / Ticket Unité', montant: 1000, periode: 'repas', description: 'Ticket repas individuel pour un jour' },
];

export interface TrancheEcolage {
  id: string;
  libelle: string;
  montant: number;
  dateEcheance?: string;
}

export interface FraisEcolage {
  id: string;
  libelle: string;
  level: string;
  statutOrientation: "Tous" | "Affecté par l'État" | "Non-Affecté";
  montantTotal: number;
  fraisInscription: number;
  fraisAnnexes?: number;
  nombreEcheances: string;
  description?: string;
  actif: boolean;
  tranches: TrancheEcolage[];
}

/**
 * Répartit un montant total saisi à la main en versements. Sert uniquement d'aide
 * à la saisie dans le formulaire : c'est un calcul proportionnel sur le total
 * fourni par l'utilisateur, jamais un barème mémorisé. Les tarifs réels viennent
 * de la Grille Tarifaire Officielle.
 */
export function generateDefaultTranches(totalAmount: number, inscriptionAmount: number = 15000): TrancheEcolage[] {
  if (totalAmount <= inscriptionAmount || inscriptionAmount >= totalAmount) {
    return [
      { id: "tr-1", libelle: "1er Vers. — Inscription", montant: totalAmount, dateEcheance: "2026-09-05" }
    ];
  }

  const remainingTuition = Math.max(0, totalAmount - inscriptionAmount);
  const v1 = Math.round(remainingTuition * 0.4);
  const v2 = Math.round(remainingTuition * 0.35);
  const v3 = Math.max(0, remainingTuition - v1 - v2);
  return [
    { id: "tr-1", libelle: "1er Vers. — Inscription", montant: inscriptionAmount, dateEcheance: "2026-09-05" },
    { id: "tr-2", libelle: "2ème Vers. — Octobre", montant: v1, dateEcheance: "2026-10-05" },
    { id: "tr-3", libelle: "3ème Vers. — Novembre", montant: v2, dateEcheance: "2026-11-05" },
    { id: "tr-4", libelle: "4ème Vers. — Solde", montant: v3, dateEcheance: "2026-12-05" },
  ].filter(t => t.montant > 0);
}

/**
 * Convertit les modèles de la Grille Tarifaire Officielle (API
 * /api/echeanciers/hinneh-presets) en paliers de Frais d'Écolage. C'est la seule
 * façon d'alimenter la liste : aucun tarif n'est écrit en dur dans cet écran.
 */
export function mapPresetsToFraisEcolage(presets: any[], idPrefix = "eco-sync"): FraisEcolage[] {
  return (presets || []).map((p: any, index: number) => {
    const tranchesList: TrancheEcolage[] = (p.tranches || []).map((t: any, tIdx: number) => ({
      id: `tr-${index}-${tIdx}`,
      libelle: t.libelle || `Versement ${tIdx + 1}`,
      montant: Number(t.montant) || 0,
      dateEcheance: t.date || t.dateEcheance || "",
    }));

    const computedTotal = p.total
      ? Number(p.total)
      : tranchesList.reduce((sum, t) => sum + t.montant, 0);

    const firstTrancheAmount = tranchesList.length > 0 ? tranchesList[0].montant : 0;

    // "NON AFFECTÉS" contient "AFFECTÉ" : le test du non-affecté doit passer en premier.
    const statutDeclare = String(p.statut_affectation || p.statut_orientation || "").toUpperCase();
    const labelUpper = `${p.label || ""} ${p.cycle || ""}`.toUpperCase();
    let orientation: FraisEcolage["statutOrientation"] = "Tous";
    if (statutDeclare === "NAFF" || labelUpper.includes("NON AFFECT")) {
      orientation = "Non-Affecté";
    } else if (statutDeclare === "AFF" || labelUpper.includes("AFFECT")) {
      orientation = "Affecté par l'État";
    }

    const niveauxLabel = Array.isArray(p.niveaux) ? p.niveaux.join(", ") : p.niveaux || "";
    const cycleLabel = p.cycle || niveauxLabel || "Général";

    return {
      id: `${idPrefix}-${p.id || index}`,
      libelle: p.label || `Tarif ${cycleLabel}`,
      // On conserve les niveaux précis : c'est ce qui permet de rattacher un élève
      // à son palier (CM2, 5è C...) et non seulement à son cycle.
      level: niveauxLabel || cycleLabel,
      statutOrientation: orientation,
      montantTotal: computedTotal,
      fraisInscription: firstTrancheAmount,
      fraisAnnexes: Number(p.fraisAnnexes) || 0,
      nombreEcheances: `${tranchesList.length} versements`,
      description: `Importé depuis la Grille Tarifaire Officielle (${cycleLabel})`,
      actif: true,
      tranches: tranchesList,
    };
  });
}

export default function EconomatSpace() {
  const { toast } = useToast();

  // Cantine Plans Management State — source de vérité : backend (api_tarifservice, service_type='cantine')
  const [cantinePlans, setCantinePlans] = useState<CantinePlan[]>(DEFAULT_CANTINE_PLANS);

  const refreshCantinePlans = async () => {
    try {
      const data = await apiClient.getTarifs();
      const c = data?.cantine || {};
      setCantinePlans([
        { id: 'cant-mensuel', nom: 'Abonnement Mensuel Cantine', montant: Number(c.mensuel) || 15000, periode: 'mensuel', description: 'Restauration complète du lundi au vendredi' },
        { id: 'cant-trimestriel', nom: 'Formule Trimestrielle Cantine', montant: Number(c.trimestriel) || 45000, periode: 'trimestriel', description: 'Accès cantine 1er / 2ème / 3ème trimestre' },
        { id: 'cant-journalier', nom: 'Repas Occasionnel / Ticket Unité', montant: Number(c.journalier) || 1000, periode: 'repas', description: 'Ticket repas individuel pour un jour' },
      ]);
    } catch (e) {
      console.error('Erreur chargement tarifs cantine:', e);
    }
  };

  useEffect(() => { refreshCantinePlans(); }, []);

  const [openCantinePlanModal, setOpenCantinePlanModal] = useState(false);
  const [editCantinePlan, setEditCantinePlan] = useState<CantinePlan | null>(null);
  const [formCantinePlan, setFormCantinePlan] = useState({
    nom: '',
    montant: '',
    periode: 'mensuel' as CantinePlan['periode'],
    description: '',
  });
  const [savingCantinePlan, setSavingCantinePlan] = useState(false);

  const handleSaveCantinePlan = async () => {
    if (!editCantinePlan || !formCantinePlan.montant) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Le montant est requis.' });
      return;
    }
    const amt = Number(formCantinePlan.montant) || 0;
    const fieldByPeriode: Record<string, string> = {
      mensuel: 'cantine_mensuel',
      trimestriel: 'cantine_trimestriel',
      repas: 'cantine_journalier',
    };
    const field = fieldByPeriode[editCantinePlan.periode];
    setSavingCantinePlan(true);
    try {
      await apiClient.updateTarifs({ [field]: amt });
      toast({ title: 'Tarif Cantine mis à jour !' });
      await refreshCantinePlans();
      setOpenCantinePlanModal(false);
      setEditCantinePlan(null);
      setFormCantinePlan({ nom: '', montant: '', periode: 'mensuel', description: '' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.response?.data?.detail || 'Échec de l\'enregistrement.' });
    } finally {
      setSavingCantinePlan(false);
    }
  };

  // Transport Zones Management State — source de vérité : backend (api_tarifservice), plus de copie locale
  const [transportZones, setTransportZones] = useState<TransportZone[]>([]);

  const refreshTransportZones = async () => {
    try {
      const data = await apiClient.getTransportZones();
      const mapped: TransportZone[] = (data?.zones || []).map((z: any) => ({
        id: String(z.id),
        nom: z.nom,
        tarifMensuel: Number(z.tarif) || 0,
        quartiers: Array.isArray(z.quartiers) ? z.quartiers : [],
      }));
      setTransportZones(mapped);
    } catch (e) {
      console.error('Erreur chargement zones de transport:', e);
    }
  };

  useEffect(() => { refreshTransportZones(); }, []);

  const [openTransportZoneModal, setOpenTransportZoneModal] = useState(false);
  const [editTransportZone, setEditTransportZone] = useState<TransportZone | null>(null);
  const [formTransportZone, setFormTransportZone] = useState({
    nom: '',
    tarifMensuel: '',
    quartiers: '',
  });
  const [savingTransportZone, setSavingTransportZone] = useState(false);

  const handleSaveTransportZone = async () => {
    if (!formTransportZone.nom || !formTransportZone.tarifMensuel) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Le nom de la ligne/zone et le tarif mensuel sont requis.' });
      return;
    }
    const tMen = Number(formTransportZone.tarifMensuel) || 0;
    const qList = formTransportZone.quartiers.split(',').map(s => s.trim()).filter(Boolean);
    const payload = {
      service_type: 'transport',
      libelle: formTransportZone.nom,
      quartiers: qList.join(', '),
      montant_mensuel: tMen,
    };

    setSavingTransportZone(true);
    try {
      if (editTransportZone) {
        await apiClient.updateTarifDB(Number(editTransportZone.id), payload);
        toast({ title: 'Ligne / Zone de transport mise à jour !' });
      } else {
        await apiClient.createTarifDB(payload);
        toast({ title: 'Nouvelle ligne / zone de transport ajoutée !' });
      }
      await refreshTransportZones();
      setOpenTransportZoneModal(false);
      setEditTransportZone(null);
      setFormTransportZone({ nom: '', tarifMensuel: '', quartiers: '' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.response?.data?.detail || 'Échec de l\'enregistrement.' });
    } finally {
      setSavingTransportZone(false);
    }
  };

  const handleDeleteTransportZone = async (id: string) => {
    try {
      await apiClient.deleteTarifDB(Number(id));
      toast({ title: 'Ligne / Zone de transport supprimée' });
      await refreshTransportZones();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.response?.data?.detail || 'Échec de la suppression.' });
    }
  };

  // Frais d'Écolage State & CRUD Management
  // Pas de liste de démonstration : tant que rien n'est configuré ni synchronisé
  // depuis la Grille Tarifaire Officielle, la liste reste vide.
  const [fraisEcolageList, setFraisEcolageList] = useState<FraisEcolage[]>(
    () => readFraisEcolageConfig() as FraisEcolage[],
  );

  const [openFraisEcolageModal, setOpenFraisEcolageModal] = useState(false);
  const [editFraisEcolage, setEditFraisEcolage] = useState<FraisEcolage | null>(null);
  const [searchEcolage, setSearchEcolage] = useState("");
  const [filterEcolageLevel, setFilterEcolageLevel] = useState("Tous");
  const [expandedEcolageId, setExpandedEcolageId] = useState<string | null>(null);

  const [formFraisEcolage, setFormFraisEcolage] = useState({
    libelle: '',
    level: 'Collège (6è-3è)',
    statutOrientation: 'Tous' as FraisEcolage['statutOrientation'],
    montantTotal: '',
    fraisInscription: '15000',
    fraisAnnexes: '12000',
    nombreEcheances: '9 versements (Mensuel)',
    description: '',
    actif: true,
  });

  const [formTranchesList, setFormTranchesList] = useState<TrancheEcolage[]>([]);

  const saveFraisEcolageToStorage = (updated: FraisEcolage[]) => {
    setFraisEcolageList(updated);
    // Stockage par école : le code établissement étant partagé entre la maternelle,
    // le primaire et le collège, il ne peut pas servir seul de clé.
    writeFraisEcolageConfig(updated);
  };

  const handleOpenAddFraisEcolage = () => {
    setEditFraisEcolage(null);
    setFormFraisEcolage({
      libelle: '',
      level: 'Collège (6è-3è)',
      statutOrientation: 'Tous',
      montantTotal: '',
      fraisInscription: '15000',
      fraisAnnexes: '12000',
      nombreEcheances: '9 versements (Mensuel)',
      description: '',
      actif: true,
    });
    setFormTranchesList(generateDefaultTranches(45000, 15000));
    setOpenFraisEcolageModal(true);
  };

  const handleOpenEditFraisEcolage = (item: FraisEcolage) => {
    setEditFraisEcolage(item);
    setFormFraisEcolage({
      libelle: item.libelle,
      level: item.level,
      statutOrientation: item.statutOrientation,
      montantTotal: String(item.montantTotal),
      fraisInscription: String(item.fraisInscription),
      fraisAnnexes: String(item.fraisAnnexes !== undefined ? item.fraisAnnexes : 12000),
      nombreEcheances: item.nombreEcheances,
      description: item.description || '',
      actif: item.actif,
    });
    setFormTranchesList(
      item.tranches && item.tranches.length > 0
        ? item.tranches
        : generateDefaultTranches(item.montantTotal, item.fraisInscription)
    );
    setOpenFraisEcolageModal(true);
  };

  const handleRegenerateTranches = () => {
    const totalAmt = Number(formFraisEcolage.montantTotal) || 0;
    const inscripAmt = Number(formFraisEcolage.fraisInscription) || 0;
    setFormTranchesList(generateDefaultTranches(totalAmt, inscripAmt));
    toast({
      title: 'Échéancier régénéré !',
      description: `L'échéancier des versements a été récalculé pour un total de ${totalAmt} FCFA.`,
    });
  };

  const handleAddFormTranche = () => {
    const nextNum = formTranchesList.length + 1;
    const todayStr = new Date().toISOString().split("T")[0];
    const newTranche: TrancheEcolage = {
      id: `tr-${Date.now()}-${nextNum}`,
      libelle: `${nextNum}ème Versement`,
      montant: 0,
      dateEcheance: todayStr,
    };
    setFormTranchesList([...formTranchesList, newTranche]);
  };

  const handleDeleteFormTranche = (index: number) => {
    if (formTranchesList.length <= 1) {
      toast({
        variant: "destructive",
        title: "Action impossible",
        description: "L'échéancier doit comporter au moins un versement.",
      });
      return;
    }
    setFormTranchesList(formTranchesList.filter((_, idx) => idx !== index));
  };

  const handleSaveFraisEcolage = () => {
    if (!formFraisEcolage.libelle.trim() || !formFraisEcolage.montantTotal) {
      toast({
        variant: 'destructive',
        title: 'Formulaire incomplet',
        description: 'Le libellé du frais et le montant total sont obligatoires.',
      });
      return;
    }

    const totalAmt = Number(formFraisEcolage.montantTotal) || 0;
    const inscripAmt = Number(formFraisEcolage.fraisInscription) || 0;
    const annexesAmt = Number(formFraisEcolage.fraisAnnexes) || 0;
    const finalTranches = formTranchesList.length > 0 ? formTranchesList : generateDefaultTranches(totalAmt, inscripAmt);

    if (editFraisEcolage) {
      const updated = fraisEcolageList.map((item) =>
        item.id === editFraisEcolage.id
          ? {
              ...item,
              libelle: formFraisEcolage.libelle.trim(),
              level: formFraisEcolage.level,
              statutOrientation: formFraisEcolage.statutOrientation,
              montantTotal: totalAmt,
              fraisInscription: inscripAmt,
              fraisAnnexes: annexesAmt,
              nombreEcheances: formFraisEcolage.nombreEcheances,
              description: formFraisEcolage.description,
              actif: formFraisEcolage.actif,
              tranches: finalTranches,
            }
          : item
      );
      saveFraisEcolageToStorage(updated);
      toast({
        title: 'Frais d\'Écolage mis à jour !',
        description: `Le tarif "${formFraisEcolage.libelle}" a été modifié avec succès.`,
      });
    } else {
      const newItem: FraisEcolage = {
        id: `eco-${Date.now()}`,
        libelle: formFraisEcolage.libelle.trim(),
        level: formFraisEcolage.level,
        statutOrientation: formFraisEcolage.statutOrientation,
        montantTotal: totalAmt,
        fraisInscription: inscripAmt,
        fraisAnnexes: annexesAmt,
        nombreEcheances: formFraisEcolage.nombreEcheances,
        description: formFraisEcolage.description,
        actif: formFraisEcolage.actif,
        tranches: finalTranches,
      };
      const updated = [newItem, ...fraisEcolageList];
      saveFraisEcolageToStorage(updated);
      toast({
        title: 'Nouveau Frais d\'Écolage ajouté !',
        description: `Le tarif "${formFraisEcolage.libelle}" a été ajouté à la grille tarifaire.`,
      });
    }

    setOpenFraisEcolageModal(false);
    setEditFraisEcolage(null);
  };

  const handleDeleteFraisEcolage = (id: string, libelle: string) => {
    if (confirm(`Voulez-vous vraiment supprimer le frais d'écolage "${libelle}" ?`)) {
      const updated = fraisEcolageList.filter((item) => item.id !== id);
      saveFraisEcolageToStorage(updated);
      toast({
        title: 'Frais d\'Écolage supprimé',
        description: `Le tarif "${libelle}" a été retiré de la grille tarifaire.`,
      });
    }
  };

  const handleSyncFromEcheancierPresets = async () => {
    try {
      toast({
        title: "Synchronisation en cours...",
        description: "Récupération des modèles tarifaires depuis la grille d'échéancier.",
      });

      let presets: any[] = [];
      try {
        presets = await apiClient.getHinnehOfficialPresets();
      } catch (e) {
        console.warn("Could not fetch presets from API, trying localStorage fallback:", e);
      }

      if (!presets || presets.length === 0) {
        // Repli hors ligne : la grille déjà mise en cache pour CETTE école.
        presets = getGrillePresets();
      }

      if (!presets || presets.length === 0) {
        toast({
          variant: "destructive",
          title: "Aucun modèle trouvé",
          description: "Veuillez d'abord configurer des modèles tarifaires dans l'espace Échéancier.",
        });
        return;
      }

      setGrillePresets(presets);
      const syncedFees = mapPresetsToFraisEcolage(presets);
      saveFraisEcolageToStorage(syncedFees);

      toast({
        title: "Grille Tarifaire Officielle Synchronisée ! 🎉",
        description: `${syncedFees.length} modèle(s) tarifaire(s) officiel(s) réimporté(s) depuis la Grille d'Échéancier.`,
      });
    } catch (err) {
      console.error("Error syncing presets:", err);
      toast({
        variant: "destructive",
        title: "Erreur de synchronisation",
        description: "Impossible de récupérer les modèles tarifaires d'échéancier.",
      });
    }
  };

  const filteredFraisEcolageList = useMemo(() => {
    return fraisEcolageList.filter((item) => {
      const matchesSearch =
        item.libelle.toLowerCase().includes(searchEcolage.toLowerCase()) ||
        item.level.toLowerCase().includes(searchEcolage.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchEcolage.toLowerCase()));
      const matchesLevel =
        filterEcolageLevel === "Tous" || item.level.includes(filterEcolageLevel);
      return matchesSearch && matchesLevel;
    });
  }, [fraisEcolageList, searchEcolage, filterEcolageLevel]);

  // Pagination States & Calculations
  const [ecolagePage, setEcolagePage] = useState(1);
  const [cantinePage, setCantinePage] = useState(1);
  const [transportPage, setTransportPage] = useState(1);
  const [examPage, setExamPage] = useState(1);

  const ITEMS_PER_PAGE_ECOLAGE = 5;
  const ITEMS_PER_PAGE_CARDS = 3;
  const ITEMS_PER_PAGE_ATTRIB = 5;
  const ITEMS_PER_PAGE_EXAM = 6;

  const totalEcolagePages = Math.max(1, Math.ceil(filteredFraisEcolageList.length / ITEMS_PER_PAGE_ECOLAGE));
  const paginatedFraisEcolageList = useMemo(() => {
    const start = (ecolagePage - 1) * ITEMS_PER_PAGE_ECOLAGE;
    return filteredFraisEcolageList.slice(start, start + ITEMS_PER_PAGE_ECOLAGE);
  }, [filteredFraisEcolageList, ecolagePage]);

  useEffect(() => {
    setEcolagePage(1);
  }, [searchEcolage, filterEcolageLevel]);

  const totalCantinePages = Math.max(1, Math.ceil(cantinePlans.length / ITEMS_PER_PAGE_CARDS));
  const paginatedCantinePlans = useMemo(() => {
    const start = (cantinePage - 1) * ITEMS_PER_PAGE_CARDS;
    return cantinePlans.slice(start, start + ITEMS_PER_PAGE_CARDS);
  }, [cantinePlans, cantinePage]);

  const totalTransportPages = Math.max(1, Math.ceil(transportZones.length / ITEMS_PER_PAGE_CARDS));
  const paginatedTransportZones = useMemo(() => {
    const start = (transportPage - 1) * ITEMS_PER_PAGE_CARDS;
    return transportZones.slice(start, start + ITEMS_PER_PAGE_CARDS);
  }, [transportZones, transportPage]);
  const userRole = localStorage.getItem("user_role") || "";
  const connectedUser =
    localStorage.getItem("user_full_name") ||
    `${localStorage.getItem("user_nom") || ""} ${localStorage.getItem("user_prenom") || ""}`.trim() ||
    "Économe Officiel";

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<string>("encaissement");

  // Data States
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // Student Search & Selection State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Payment Form State
  const [paymentCategory, setPaymentCategory] = useState<"examen" | "cantine" | "transport">("examen");
  const [selectedExamType, setSelectedExamType] = useState<keyof typeof OFFICIAL_EXAM_FEES>("BEPC");
  const [cantinePeriod, setCantinePeriod] = useState<"mensuel" | "trimestriel">("mensuel");
  const [transportPeriod, setTransportPeriod] = useState<"mensuel" | "trimestriel">("mensuel");
  const [selectedTransportZoneId, setSelectedTransportZoneId] = useState<string>("");
  const [customAmount, setCustomAmount] = useState<string>("2000");
  const [paymentMode, setPaymentMode] = useState<string>("especes");
  const [transactionRef, setTransactionRef] = useState<string>("");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Recent Encaissements Log State
  const [economatPayments, setEconomatPayments] = useState<any[]>([]);

  // Stock Management State
  const [stockItems, setStockItems] = useState<any[]>(INITIAL_STOCK_ITEMS);
  const [openAddStockModal, setOpenAddStockModal] = useState(false);
  const [newStockItem, setNewStockItem] = useState({
    name: "",
    category: "Fournitures",
    quantity: "",
    minThreshold: "10",
    unitPrice: "",
    unit: "Unités",
  });

  // Material Distribution State
  const [distributions, setDistributions] = useState<any[]>(INITIAL_DISTRIBUTIONS);
  const [openDistributionModal, setOpenDistributionModal] = useState(false);
  const [newDistribution, setNewDistribution] = useState({
    beneficiary: "",
    itemId: "",
    quantity: "1",
    motif: "",
  });

  // Procurement Purchases State
  const [purchases, setPurchases] = useState<any[]>(INITIAL_PURCHASES);
  const [openAddPurchaseModal, setOpenAddPurchaseModal] = useState(false);
  const [newPurchase, setNewPurchase] = useState({
    supplier: "",
    item: "",
    quantity: "",
    totalAmount: "",
  });

  // Service Attributions State (Cantine & Transport) - Source de vérité exclusive : Base de Données (MySQL)
  const [attributionsMap, setAttributionsMap] = useState<Record<string, { cantine: boolean; transport: boolean; studentName?: string; studentClass?: string; studentMatricule?: string }>>({});

  const [attrStudentSearch, setAttrStudentSearch] = useState("");
  const [selectedAttrStudent, setSelectedAttrStudent] = useState<any>(null);
  const [attrCantine, setAttrCantine] = useState(false);
  const [attrTransport, setAttrTransport] = useState(false);
  const [attrTransportZoneId, setAttrTransportZoneId] = useState<string>("");
  const [attrFilter, setAttrFilter] = useState<"ALL" | "CANTINE" | "TRANSPORT" | "BOTH">("ALL");
  const [attrPage, setAttrPage] = useState(1);
  const [attrPageSize, setAttrPageSize] = useState(10);
  const [attrListSearch, setAttrListSearch] = useState("");

  const filteredAttributions = useMemo(() => {
    return Object.entries(attributionsMap).filter(([key, data]) => {
      if (attrFilter === "CANTINE" && !data.cantine) return false;
      if (attrFilter === "TRANSPORT" && !data.transport) return false;
      if (attrFilter === "BOTH" && (!data.cantine || !data.transport)) return false;

      if (attrListSearch.trim()) {
        const q = attrListSearch.trim().toLowerCase();
        const sName = (data.studentName || key || "").toLowerCase();
        const sMat = (data.studentMatricule || key || "").toLowerCase();
        const sClass = (data.studentClass || "").toLowerCase();
        return sName.includes(q) || sMat.includes(q) || sClass.includes(q);
      }
      return true;
    });
  }, [attributionsMap, attrFilter, attrListSearch]);

  const totalAttrPages = Math.max(
    1,
    Math.ceil(filteredAttributions.length / (attrPageSize === -1 ? (filteredAttributions.length || 1) : attrPageSize))
  );
  const currentAttrPage = Math.min(attrPage, totalAttrPages);

  const paginatedAttributions = useMemo(() => {
    if (attrPageSize === -1) return filteredAttributions;
    const startIdx = (currentAttrPage - 1) * attrPageSize;
    return filteredAttributions.slice(startIdx, startIdx + attrPageSize);
  }, [filteredAttributions, currentAttrPage, attrPageSize]);

  // Unsubscribed Service Payment Modal State
  const [openUnsubscribedModal, setOpenUnsubscribedModal] = useState(false);
  const [unsubscribedTargetService, setUnsubscribedTargetService] = useState<"cantine" | "transport" | null>(null);

  const checkStudentServiceAttributionState = (student: any, service: "cantine" | "transport") => {
    if (!student) return false;
    const matKey = (student.matricule || "").trim().toUpperCase();
    const nameKey = `${student.lastName || student.nom || ''} ${student.firstName || student.prenom || ''}`.trim().toUpperCase();
    
    // Primary check in attributionsMap
    const existing = (matKey && attributionsMap[matKey]) || (nameKey && attributionsMap[nameKey]);
    if (existing !== undefined) {
      if (service === "cantine") return Boolean(existing.cantine);
      if (service === "transport") return Boolean(existing.transport);
    }
    
    // Check direct student object properties
    if (service === "cantine") {
      return Boolean(student.service_cantine || student.is_cantine || student.cantine || student.serviceCantine);
    }
    if (service === "transport") {
      return Boolean(student.service_transport || student.is_transport || student.transport || student.serviceTransport);
    }
    return false;
  };

  const handleSelectCategory = (cat: "examen" | "cantine" | "transport") => {
    setPaymentCategory(cat);
    if (selectedStudent && (cat === "cantine" || cat === "transport")) {
      const isSubscribed = checkStudentServiceAttributionState(selectedStudent, cat);
      if (!isSubscribed) {
        setUnsubscribedTargetService(cat);
        setOpenUnsubscribedModal(true);
      }
    }
  };

  const handleConfirmAttributionAndProceed = async () => {
    if (!selectedStudent || !unsubscribedTargetService) return;

    const currentKey = (selectedStudent.matricule || `${selectedStudent.lastName || selectedStudent.nom || ''} ${selectedStudent.firstName || selectedStudent.prenom || ''}`).trim().toUpperCase();
    const existing = attributionsMap[currentKey] || { cantine: false, transport: false };

    const newCantine = unsubscribedTargetService === "cantine" ? true : existing.cantine;
    const newTransport = unsubscribedTargetService === "transport" ? true : existing.transport;

    await saveAttribution(selectedStudent, newCantine, newTransport, selectedTransportZoneId);

    const sLabel = unsubscribedTargetService === "cantine" ? "Cantine Scolaire 🍱" : "Transport Scolaire 🚌";
    toast({
      title: "✅ Service Attribué !",
      description: `L'élève ${selectedStudent.lastName || selectedStudent.nom} ${selectedStudent.firstName || selectedStudent.prenom} a été attribué(e) au service ${sLabel} avec succès.`,
    });

    setOpenUnsubscribedModal(false);
    setUnsubscribedTargetService(null);

    // Continue recording the payment directly
    executePaymentProcess();
  };

  const handleSelectAttrStudent = (st: any) => {
    setSelectedAttrStudent(st);
    if (st) {
      const key = (st.matricule || `${st.lastName || ''} ${st.firstName || ''}`).trim().toUpperCase();
      const existing = attributionsMap[key];
      if (existing) {
        setAttrCantine(Boolean(existing.cantine));
        setAttrTransport(Boolean(existing.transport));
        if (existing.transportZoneId) {
          setAttrTransportZoneId(existing.transportZoneId);
        } else if (existing.transportTarif) {
          const matchZ = transportZones.find(z => z.tarifMensuel === existing.transportTarif);
          setAttrTransportZoneId(matchZ?.id || transportZones[0]?.id || "");
        } else {
          setAttrTransportZoneId(transportZones[0]?.id || "");
        }
      } else {
        setAttrCantine(false);
        setAttrTransport(false);
        setAttrTransportZoneId(transportZones[0]?.id || "");
      }
    }
  };

  // Reçu récapitulatif affiché après un désabonnement de service (Cantine/Transport) :
  // retrace les derniers versements réellement effectués pour le(s) service(s) retiré(s),
  // sans jamais y mêler le solde de la scolarité.
  const [openDesabonnementRecuModal, setOpenDesabonnementRecuModal] = useState(false);
  const [desabonnementRecu, setDesabonnementRecu] = useState<any>(null);
  const [desabonnementLoading, setDesabonnementLoading] = useState(false);

  const buildDesabonnementReceiptData = (): ReceiptData | null => {
    if (!desabonnementRecu) return null;
    const eleve = desabonnementRecu.eleve || {};
    const ecole = desabonnementRecu.ecole || {};

    const formattedEcheances = Array.isArray(desabonnementRecu.echeances)
      ? desabonnementRecu.echeances.map((e: any) => ({
          rubric: e.rubric,
          amount: Number(e.amount || 0),
          paid: Number(e.paid || 0),
          rest: Number(e.rest || 0),
          mode: e.mode,
          service_type: e.service_type,
          statut: e.statut,
          is_desabonne: Boolean(e.is_desabonne),
        }))
      : [];

    const studentKey = (eleve.matricule || `${eleve.nom || ''} ${eleve.prenom || ''}`).trim().toUpperCase();
    const targetAttr: any = attributionsMap[studentKey] || getStudentServiceAttribution(studentKey, eleve.matricule);

    return {
      receiptNumber: desabonnementRecu.recu_numero || generateReceiptNumber(Date.now()),
      amount: Number(desabonnementRecu.total_general || 0),
      type: "Recu global recapitulatif",
      mode: "Multiples",
      status: "paye",
      date: new Date(),
      studentName: `${eleve.nom || ''} ${eleve.prenom || ''}`.trim() || "Élève",
      studentMatricule: eleve.matricule || "N/A",
      studentClass: eleve.classe || "N/A",
      schoolName: ecole.nom,
      schoolCode: ecole.code,
      schoolCity: ecole.ville,
      totalVersedToDate: Number(desabonnementRecu.total_general || 0),
      transportMensuelTarif: targetAttr?.transportTarif ? Number(targetAttr.transportTarif) : undefined,
      cantineMensuelTarif: targetAttr?.cantineTarif ? Number(targetAttr.cantineTarif) : undefined,
      caissierName:
        localStorage.getItem("user_full_name") ||
        localStorage.getItem("username") ||
        "Économat",
      imprimeParName:
        localStorage.getItem("user_full_name") ||
        localStorage.getItem("username") ||
        "Économat",
      echeances: formattedEcheances,
    };
  };

  const handlePrintDesabonnementRecu = () => {
    const data = buildDesabonnementReceiptData();
    if (data) printReceipt(data);
  };

  const handleDownloadDesabonnementRecu = async () => {
    const data = buildDesabonnementReceiptData();
    if (data) {
      await downloadReceiptPDF(data);
      toast({ title: "Téléchargement réussi", description: "Le reçu récapitulatif a été téléchargé en PDF." });
    }
  };

  const saveAttribution = async (student: any, cantine: boolean, transport: boolean, zoneIdParam?: string) => {
    if (!student) return;
    const targetZoneId = zoneIdParam || attrTransportZoneId || selectedTransportZoneId;
    const chosenZone = transportZones.find((z) => z.id === targetZoneId) || transportZones[0];
    const zoneTarif = transport ? (Number(chosenZone?.tarifMensuel) || 15000) : 0;
    const zoneName = chosenZone?.nom || "Ligne Principale";

    const key = (student.matricule || `${student.lastName || student.nom || ''} ${student.firstName || student.prenom || ''}`).trim().toUpperCase();
    const wasSubscribed = attributionsMap[key] || {
      cantine: Boolean(student.service_cantine || student.serviceCantine),
      transport: Boolean(student.service_transport || student.serviceTransport),
    };
    const updated = {
      ...attributionsMap,
      [key]: {
        cantine,
        transport,
        transportZoneId: targetZoneId,
        transportZoneName: zoneName,
        transportTarif: zoneTarif,
        studentName: `${student.lastName || student.nom || ''} ${student.firstName || student.prenom || ''}`.trim(),
        studentClass: getStudentClass(student),
        studentMatricule: student.matricule || '',
      }
    };
    if (!cantine && !transport) {
      delete updated[key];
    }
    setAttributionsMap(updated);
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem("student_service_attributions", JSON.stringify(updated));
      } catch (e) {
        console.error("Erreur sauvegarde locale attributions:", e);
      }
    }

    // Sauvegarde directe en Base de Données via l'API Backend FastAPI
    if (student.id) {
      try {
        await apiClient.patch(`/api/students/${student.id}/inscription-dossier`, {
          serviceCantine: cantine,
          serviceTransport: transport,
          montantTransport: zoneTarif,
          transportTarif: zoneTarif,
          zoneTransportId: targetZoneId,
        });
      } catch (err) {
        console.error("Erreur sauvegarde attribution service en BD:", err);
      }

      // Gestion des services en BD :
      // - L'échéancier 9 mois est créé au 1er PAIEMENT effectif (et non à l'attribution).
      // - Si retiré/désabonné : suppression propre des tranches impayées correspondantes.
      if (!cantine) {
        await apiClient
          .removeServiceTranches({
            eleve_id: Number(student.id),
            service_type: "cantine",
          })
          .catch((err) => console.warn("Suppression tranches cantine:", err));
      }

      if (transport) {
        // Enregistrement direct dans la table des affectations transport (api_affectationtransport)
        await apiClient
          .createAffectation({
            eleveId: Number(student.id),
            vehiculeId: 1,
            arret: chosenZone?.nom || student.AU_QUARTIER || student.quartier || student.AU_COMMUNE || "Arrêt Principal",
            tarif: zoneTarif,
            matin: true,
            soir: true,
          })
          .catch((err) => console.warn("Affectation transport table error:", err));
      } else {
        await apiClient
          .deleteAffectation(Number(student.id))
          .catch((err) => console.warn("Suppression affectation transport:", err));

        await apiClient
          .removeServiceTranches({
            eleve_id: Number(student.id),
            service_type: "transport",
          })
          .catch((err) => console.warn("Suppression tranches transport:", err));
      }
    }

    setStudents((prev) =>
      prev.map((s) =>
        s.id === student.id || (s.matricule && s.matricule === student.matricule)
          ? { ...s, serviceCantine: cantine, serviceTransport: transport, service_cantine: cantine, service_transport: transport }
          : s
      )
    );

    toast({
      title: "Attribution de service enregistrée !",
      description: `Mise à jour en Base de Données pour ${student.lastName || student.nom || ''} ${student.firstName || student.prenom || ''} (Cantine: ${cantine ? "Oui" : "Non"}, Transport: ${transport ? "Oui" : "Non"}).`,
    });

    // Désabonnement effectif d'au moins un service : les tranches futures viennent d'être
    // retirées de l'échéancier (ci-dessus) — on affiche maintenant le reçu récapitulatif des
    // DERNIERS paiements réellement effectués pour ce(s) service(s), sans jamais les faire
    // éponger par le solde de scolarité (le backend garde ces deux comptes strictement séparés).
    const justUnsubscribed = (wasSubscribed.cantine && !cantine) || (wasSubscribed.transport && !transport);
    if (justUnsubscribed && student.id) {
      setDesabonnementLoading(true);
      try {
        const recap = await apiClient.getRecuRecapitulatif(student.id);
        setDesabonnementRecu(recap);
        setOpenDesabonnementRecuModal(true);
      } catch (err) {
        console.warn("Erreur récupération du reçu récapitulatif après désabonnement:", err);
      } finally {
        setDesabonnementLoading(false);
      }
    }
  };

  // Exam payments tracker filter
  const [examFilter, setExamFilter] = useState<string>("ALL");

  // Classes State
  const [classes, setClasses] = useState<any[]>([]);

  const getStudentClass = (st: any) => {
    if (!st) return "N/A";
    const directName =
      st.className ||
      st.classe_nom ||
      st.classeNom ||
      st.classe_name ||
      (typeof st.classe === "string" ? st.classe : st.classe?.name || st.classe?.libelle) ||
      st.classLevel ||
      st.niveau_nom ||
      st.niveauNom ||
      st.niveau ||
      st.level ||
      st.AU_NIVEAU ||
      st.ET_NIVEAU;

    if (directName && directName !== "N/A") return directName;

    const cId = st.classId || st.classe_id || st.classeId || st.class_id;
    if (cId && classes && classes.length > 0) {
      const found = classes.find((c: any) => String(c.id) === String(cId));
      if (found) return found.name || found.libelle || found.code || found.nom || `Classe #${cId}`;
    }

    return "N/A";
  };

  // Load students, classes and official fee presets from API and sync DB attributions
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingStudents(true);
        const [res, cList, presets] = await Promise.all([
          apiClient.getStudents(),
          apiClient.getClasses(),
          apiClient.getHinnehOfficialPresets().catch(() => []),
        ]);
        setClasses(cList || []);

        let studentList: any[] = [];
        if (Array.isArray(res)) {
          studentList = res;
        } else if (res && Array.isArray(res.data)) {
          studentList = res.data;
        }
        setStudents(studentList);

        // Synchro automatique avec la Grille Tarifaire Officielle : c'est elle qui
        // fait foi pour les montants, l'écran ne fabrique aucun tarif de son côté.
        if (presets && Array.isArray(presets) && presets.length > 0) {
          setGrillePresets(presets);
          const syncedFees = mapPresetsToFraisEcolage(presets);
          setFraisEcolageList(syncedFees);
          writeFraisEcolageConfig(syncedFees);
        }

        // Chargement direct des attributions de services depuis les données de la base (MySQL)
        const dbMap: Record<string, any> = {};
        studentList.forEach((s: any) => {
          const hasCantine = Boolean(s.service_cantine ?? s.serviceCantine);
          const hasTransport = Boolean(s.service_transport ?? s.serviceTransport);
          if (hasCantine || hasTransport) {
            const key = (s.matricule || `${s.lastName || s.nom || ''} ${s.firstName || s.prenom || ''}`).trim().toUpperCase();
            if (key) {
              dbMap[key] = {
                cantine: hasCantine,
                transport: hasTransport,
                studentName: `${s.lastName || s.nom || ''} ${s.firstName || s.prenom || ''}`.trim(),
                studentClass: getStudentClass(s),
                studentMatricule: s.matricule || '',
              };
            }
          }
        });
        setAttributionsMap(dbMap);
      } catch (err) {
        console.error("Erreur chargement élèves Économat:", err);
      } finally {
        setLoadingStudents(false);
      }
    }
    loadData();
  }, []);

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return students.filter((s) => matchStudentSearch(s, searchQuery)).slice(0, 10);
  }, [students, searchQuery]);

  // Update amount automatically when exam or period changes
  useEffect(() => {
    if (paymentCategory === "examen") {
      setCustomAmount(String(OFFICIAL_EXAM_FEES[selectedExamType].amount));
    } else if (paymentCategory === "cantine") {
      const plan = cantinePlans.find(p => p.periode === (cantinePeriod === "mensuel" ? "mensuel" : "trimestriel"));
      setCustomAmount(String(plan?.montant || (cantinePeriod === "mensuel" ? 15000 : 45000)));
    } else if (paymentCategory === "transport") {
      // Le montant transport dépend de la zone réelle de l'élève : pas de valeur générique.
      // Il est calculé dans l'effet ci-dessous, une fois la zone sélectionnée.
      setSelectedTransportZoneId("");
      setCustomAmount("");
    }
  }, [paymentCategory, selectedExamType, cantinePeriod, cantinePlans]);

  // Recalcule le montant transport à partir du vrai tarif de la zone choisie (source : backend)
  useEffect(() => {
    if (paymentCategory !== "transport" || !selectedTransportZoneId) return;
    const zone = transportZones.find(z => z.id === selectedTransportZoneId);
    if (!zone) return;
    const amount = transportPeriod === "mensuel" ? zone.tarifMensuel : zone.tarifMensuel * 3;
    setCustomAmount(String(amount));
  }, [selectedTransportZoneId, transportPeriod, paymentCategory, transportZones]);

  // Auto-detect exam type based on student class if possible
  const handleSelectStudent = (student: any) => {
    setSelectedStudent(student);
    const cls = (student.className || student.classLevel || student.level || "").toUpperCase();
    if (cls.includes("3")) {
      setPaymentCategory("examen");
      setSelectedExamType("BEPC");
    } else if (cls.includes("TLE") || cls.includes("TERM")) {
      setPaymentCategory("examen");
      setSelectedExamType("BAC");
    } else if (cls.includes("CM2") || cls.includes("CM")) {
      setPaymentCategory("examen");
      setSelectedExamType("CEPE_OFFICIEL");
    }
  };

  // Submit payment handler
  const handleRecordPayment = async () => {
    if (!selectedStudent) {
      toast({
        variant: "destructive",
        title: "Élève non sélectionné",
        description: "Veuillez rechercher et sélectionner un élève avant d'enregistrer le paiement.",
      });
      return;
    }

    if (paymentCategory === "transport" && !selectedTransportZoneId) {
      toast({
        variant: "destructive",
        title: "Zone de transport requise",
        description: "Veuillez sélectionner la zone/ligne de transport réelle de l'élève avant d'encaisser — le montant en dépend.",
      });
      return;
    }

    // Check service attribution for Cantine and Transport
    if (paymentCategory === "cantine") {
      const isSubscribed = checkStudentServiceAttributionState(selectedStudent, "cantine");
      if (!isSubscribed) {
        setUnsubscribedTargetService("cantine");
        setOpenUnsubscribedModal(true);
        return;
      }
    } else if (paymentCategory === "transport") {
      const isSubscribed = checkStudentServiceAttributionState(selectedStudent, "transport");
      if (!isSubscribed) {
        setUnsubscribedTargetService("transport");
        setOpenUnsubscribedModal(true);
        return;
      }
    }

    await executePaymentProcess();
  };

  const executePaymentProcess = async () => {
    if (!selectedStudent) return;

    const amountNum = Number(customAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        variant: "destructive",
        title: "Montant invalide",
        description: "Veuillez saisir un montant valide.",
      });
      return;
    }

    setSubmittingPayment(true);

    try {
      let rubricTitle = "";
      if (paymentCategory === "examen") {
        rubricTitle = `Frais d'examen officiel - ${OFFICIAL_EXAM_FEES[selectedExamType].code}`;
      } else if (paymentCategory === "cantine") {
        rubricTitle = `Frais de Cantine (${cantinePeriod.toUpperCase()})`;
      } else {
        const selZone = transportZones.find(z => z.id === selectedTransportZoneId);
        rubricTitle = selZone ? `Frais Transport — ${selZone.nom}` : `Frais de Transport / Car`;
      }

      // S'assurer que les tranches du service existent (idempotent) et sont alignées sur le tarif réel choisi
      // (Les frais d'examen ne passent pas par l'échéancier : montant du tarif officiel,
      //  réglé une seule fois dans l'année — aucune tranche à préparer.)
      try {
        if (paymentCategory === "cantine") {
          const planMensuel = cantinePlans.find((p) => p.periode === "mensuel");
          const cTarif = Number(planMensuel?.montant || (cantinePeriod === "mensuel" ? amountNum : Math.round(amountNum / 3)) || 15000);
          await apiClient.generateServiceTranches({
            eleve_id: Number(selectedStudent.id),
            service_type: "cantine",
            montant_mensuel: cTarif,
          }).catch(() => {});

          const key = (selectedStudent.matricule || `${selectedStudent.lastName || selectedStudent.nom || ''} ${selectedStudent.firstName || selectedStudent.prenom || ''}`).trim().toUpperCase();
          const prev = attributionsMap[key] || {};
          const updated = {
            ...attributionsMap,
            [key]: {
              ...prev,
              cantine: true,
              cantineTarif: cTarif,
              studentName: `${selectedStudent.lastName || selectedStudent.nom || ''} ${selectedStudent.firstName || selectedStudent.prenom || ''}`.trim(),
              studentClass: getStudentClass(selectedStudent),
              studentMatricule: selectedStudent.matricule || '',
            }
          };
          setAttributionsMap(updated);
          if (typeof localStorage !== "undefined") {
            try { localStorage.setItem("student_service_attributions", JSON.stringify(updated)); } catch (e) {}
          }
        } else if (paymentCategory === "transport") {
          const zone = transportZones.find((z) => z.id === selectedTransportZoneId) || transportZones[0];
          const zTarif = Number(zone?.tarifMensuel || (transportPeriod === "mensuel" ? amountNum : Math.round(amountNum / 3)) || 18000);
          
          await apiClient.createAffectation({
            eleveId: Number(selectedStudent.id),
            vehiculeId: 1,
            arret: zone?.nom || selectedStudent.AU_QUARTIER || "Arrêt Principal",
            tarif: zTarif,
            matin: true,
            soir: true,
          }).catch(() => {});

          await apiClient.generateServiceTranches({
            eleve_id: Number(selectedStudent.id),
            service_type: "transport",
            montant_mensuel: zTarif,
          }).catch(() => {});

          const key = (selectedStudent.matricule || `${selectedStudent.lastName || selectedStudent.nom || ''} ${selectedStudent.firstName || selectedStudent.prenom || ''}`).trim().toUpperCase();
          const prev = attributionsMap[key] || {};
          const updated = {
            ...attributionsMap,
            [key]: {
              ...prev,
              transport: true,
              transportZoneId: selectedTransportZoneId || zone?.id,
              transportZoneName: zone?.nom || "Ligne Principale",
              transportTarif: zTarif,
              studentName: `${selectedStudent.lastName || selectedStudent.nom || ''} ${selectedStudent.firstName || selectedStudent.prenom || ''}`.trim(),
              studentClass: getStudentClass(selectedStudent),
              studentMatricule: selectedStudent.matricule || '',
            }
          };
          setAttributionsMap(updated);
          if (typeof localStorage !== "undefined") {
            try { localStorage.setItem("student_service_attributions", JSON.stringify(updated)); } catch (e) {}
          }
        }
      } catch (err) {
        console.warn("Préparation tranches service:", err);
      }

      // Encaissement via le même point d'entrée centralisé que le Guichet Caisse :
      // le paiement crédite la tranche d'échéancier correspondante et remonte donc
      // automatiquement dans le reçu global de l'élève côté Caisse.
      let paymentRecord: any = null;
      try {
        paymentRecord = await apiClient.processCaisseEncaissement({
          eleve_id: Number(selectedStudent.id),
          motif: paymentCategory,
          montant: amountNum,
          mode: paymentMode,
          numero_transaction: transactionRef || undefined,
          observation: `[ÉCONOMAT] ${rubricTitle} - ${paymentNotes}`.trim(),
          caissier_nom: connectedUser,
          annee_scolaire: "2026-2027",
        });
      } catch (err: any) {
        const detail =
          err?.response?.data?.detail ||
          "Impossible d'enregistrer ce règlement. Vérifiez qu'une tranche d'échéancier a bien été planifiée pour ce service.";
        toast({
          variant: "destructive",
          title: "Encaissement refusé",
          description: detail,
        });
        setSubmittingPayment(false);
        return;
      }

      const receiptNum = paymentRecord?.numero_recu || `RC-ECO-${Date.now().toString().slice(-6)}`;
      const realSchoolName = await getRealSchoolName(selectedStudent.schoolId || selectedStudent.ecole_id);
      const newPaymentLog = {
        id: paymentRecord?.id || Date.now(),
        receiptNumber: receiptNum,
        studentName: `${selectedStudent.lastName || selectedStudent.nom || ''} ${selectedStudent.firstName || selectedStudent.prenom || ''}`.trim(),
        studentMatricule: selectedStudent.matricule || "N/A",
        studentClass: selectedStudent.className || selectedStudent.classLevel || selectedStudent.level || "N/A",
        schoolName: realSchoolName,
        arrieresAnterieurs: Number(selectedStudent.AU_MONTANTARRIERE || 0),
        amount: amountNum,
        rubric: rubricTitle,
        category: paymentCategory,
        examType: paymentCategory === "examen" ? selectedExamType : null,
        mode: paymentMode,
        date: new Date(),
        caissierName: connectedUser,
      };

      setEconomatPayments((prev) => [newPaymentLog, ...prev]);

      // Aucun reçu n'est généré ici : l'édition des reçus est centralisée au Guichet Caisse,
      // où le paiement remonte automatiquement dans le reçu global de l'élève.
      toast({
        title: "Paiement enregistré avec succès !",
        description: `Règlement ${receiptNum} enregistré. Le reçu est à éditer depuis le Guichet Caisse.`,
      });

      // Reset form
      setTransactionRef("");
      setPaymentNotes("");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur enregistrement",
        description: err.message || "Une erreur s'est produite lors de l'enregistrement du règlement.",
      });
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Add item to stock handler
  const handleAddStockItem = () => {
    if (!newStockItem.name || !newStockItem.quantity || !newStockItem.unitPrice) {
      toast({
        variant: "destructive",
        title: "Champs manquants",
        description: "Veuillez remplir le nom, la quantité et le prix unitaire.",
      });
      return;
    }

    const newItem = {
      id: `STK-${String(stockItems.length + 1).padStart(3, "0")}`,
      name: newStockItem.name,
      category: newStockItem.category,
      quantity: Number(newStockItem.quantity),
      minThreshold: Number(newStockItem.minThreshold) || 10,
      unitPrice: Number(newStockItem.unitPrice),
      unit: newStockItem.unit,
    };

    setStockItems((prev) => [newItem, ...prev]);
    setOpenAddStockModal(false);
    setNewStockItem({
      name: "",
      category: "Fournitures",
      quantity: "",
      minThreshold: "10",
      unitPrice: "",
      unit: "Unités",
    });

    toast({
      title: "Article ajouté au stock !",
      description: `${newItem.name} a été enregistré dans le catalogue.`,
    });
  };

  // Distribution voucher handler
  const handleCreateDistribution = () => {
    if (!newDistribution.beneficiary || !newDistribution.itemId || !newDistribution.quantity) {
      toast({
        variant: "destructive",
        title: "Champs requis",
        description: "Veuillez sélectionner l'article, le bénéficiaire et la quantité.",
      });
      return;
    }

    const targetItem = stockItems.find((s) => s.id === newDistribution.itemId);
    if (!targetItem) return;

    const qty = Number(newDistribution.quantity);
    if (qty > targetItem.quantity) {
      toast({
        variant: "destructive",
        title: "Stock insuffisant",
        description: `Seulement ${targetItem.quantity} ${targetItem.unit} disponibles en stock.`,
      });
      return;
    }

    // Deduct from stock
    setStockItems((prev) =>
      prev.map((item) => (item.id === targetItem.id ? { ...item, quantity: item.quantity - qty } : item))
    );

    // Record distribution
    const distRecord = {
      id: `DIST-${String(distributions.length + 1).padStart(3, "0")}`,
      date: new Date().toISOString().split("T")[0],
      beneficiary: newDistribution.beneficiary,
      item: targetItem.name,
      quantity: qty,
      unit: targetItem.unit,
      motif: newDistribution.motif || "Distribution interne",
    };

    setDistributions((prev) => [distRecord, ...prev]);
    setOpenDistributionModal(false);
    setNewDistribution({ beneficiary: "", itemId: "", quantity: "1", motif: "" });

    toast({
      title: "Bon de distribution généré !",
      description: `${qty} ${targetItem.unit} distribué(s) à ${distRecord.beneficiary}.`,
    });
  };

  // Add purchase handler
  const handleAddPurchase = () => {
    if (!newPurchase.supplier || !newPurchase.item || !newPurchase.totalAmount) {
      toast({
        variant: "destructive",
        title: "Formulaire incomplet",
        description: "Veuillez renseigner le fournisseur, le matériel et le montant total.",
      });
      return;
    }

    const purchaseRecord = {
      id: `ACH-${String(purchases.length + 1).padStart(3, "0")}`,
      date: new Date().toISOString().split("T")[0],
      supplier: newPurchase.supplier,
      item: newPurchase.item,
      quantity: Number(newPurchase.quantity) || 1,
      totalAmount: Number(newPurchase.totalAmount),
      status: "LIVRE",
    };

    setPurchases((prev) => [purchaseRecord, ...prev]);
    setOpenAddPurchaseModal(false);
    setNewPurchase({ supplier: "", item: "", quantity: "", totalAmount: "" });

    toast({
      title: "Achat d'économat enregistré !",
      description: `Commande auprès de ${purchaseRecord.supplier} comptabilisée.`,
    });
  };

  // Filtered exam payments list
  const filteredExamPayments = useMemo(() => {
    if (examFilter === "ALL") return economatPayments.filter((p) => p.category === "examen");
    return economatPayments.filter((p) => p.category === "examen" && p.examType === examFilter);
  }, [economatPayments, examFilter]);

  // Total Metrics Calculations
  const totalEncaissementsEconomat = useMemo(
    () => economatPayments.reduce((sum, p) => sum + p.amount, 0),
    [economatPayments]
  );
  const totalExamensCollectes = useMemo(
    () => economatPayments.filter((p) => p.category === "examen").reduce((sum, p) => sum + p.amount, 0),
    [economatPayments]
  );
  const totalStockValue = useMemo(
    () => stockItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [stockItems]
  );
  const lowStockCount = useMemo(
    () => stockItems.filter((item) => item.quantity <= item.minThreshold).length,
    [stockItems]
  );

  return (
    <Layout>
      <div className="space-y-6 pb-12">
        {/* TOP HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-600/30 rounded-xl border border-indigo-400/30 backdrop-blur-md">
                <Boxes className="h-8 w-8 text-indigo-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Module Économat & Logistique Interne</h1>
                <p className="text-xs md:text-sm text-indigo-200/90">
                  Guichet d'encaissement (Examens officiels, Cantine, Transport), Achats, Gestion des stocks & Distribution interne.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="bg-indigo-500/20 text-indigo-200 border-indigo-400/30 py-1.5 px-3 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-400" /> Hînneh Éducation Biabou
            </Badge>
            <Badge variant="outline" className="bg-amber-500/20 text-amber-200 border-amber-400/30 py-1.5 px-3 text-xs">
              <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-300" /> Reçus Officiels Ministériels
            </Badge>
          </div>
        </div>



        {/* METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Recettes Économat Jour</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {formatCurrency(totalEncaissementsEconomat)}
                </p>
                <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Cantine, Transport & Examens</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
                <Receipt className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Frais Examens Collectés</p>
                <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                  {formatCurrency(totalExamensCollectes)}
                </p>
                <p className="text-[11px] text-indigo-500 font-medium mt-0.5">BEPC, BAC & CEPE</p>
              </div>
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-600">
                <GraduationCap className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Valeur Totale du Stock</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {formatCurrency(totalStockValue)}
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">{stockItems.length} références d'articles</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
                <Package className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Alertes Stock Bas</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                  {lowStockCount} Référence{lowStockCount > 1 ? "s" : ""}
                </p>
                <p className="text-[11px] text-amber-600 font-medium mt-0.5">Réapprovisionnement requis</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MAIN TABS NAVIGATION */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex flex-nowrap overflow-x-auto gap-1 w-full justify-between border border-slate-200 dark:border-slate-700">
            <TabsTrigger
              value="encaissement"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-semibold text-xs py-2 px-2.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <DollarSign className="h-3.5 w-3.5" /> Guichet Encaissement
            </TabsTrigger>

            <TabsTrigger
              value="frais_ecolage"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-semibold text-xs py-2 px-2.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <BookOpen className="h-3.5 w-3.5" /> Frais d'Écolage
            </TabsTrigger>

            <TabsTrigger
              value="examens"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-semibold text-xs py-2 px-2.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <GraduationCap className="h-3.5 w-3.5" /> Examens Officiels
            </TabsTrigger>

            <TabsTrigger
              value="cantine_transport"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-semibold text-xs py-2 px-2.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Utensils className="h-3.5 w-3.5" /> Cantine & Transport
            </TabsTrigger>

            <TabsTrigger
              value="attributions"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-semibold text-xs py-2 px-2.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <UserCheck className="h-3.5 w-3.5" /> Attribution Services
            </TabsTrigger>

            <TabsTrigger
              value="stocks"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-semibold text-xs py-2 px-2.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Package className="h-3.5 w-3.5" /> Stock & Inventaire
            </TabsTrigger>

            <TabsTrigger
              value="distribution"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-semibold text-xs py-2 px-2.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" /> Distributions
            </TabsTrigger>

            <TabsTrigger
              value="achats"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-semibold text-xs py-2 px-2.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="h-3.5 w-3.5" /> Achats Économat
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: GUICHET ENCAISSEMENT ECONOMAT */}
          <TabsContent value="encaissement" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN: STUDENT SEARCH & PAYMENT FORM */}
              <Card className="lg:col-span-7 border-slate-200 dark:border-slate-800 shadow-md">
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <Receipt className="h-5 w-5 text-indigo-600" /> Saisie des Règlements Économat
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Sélectionnez un élève pour encaisser les frais d'examen officiel, la cantine ou le transport.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* SEARCH STUDENT */}
                  <div className="space-y-2 relative">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Rechercher l’élève (Nom, Prénom, Matricule, Classe) *
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Tapez le nom, matricule ou classe de l'élève..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 text-sm rounded-xl border-slate-300 dark:border-slate-700"
                      />
                    </div>

                    {/* SEARCH RESULTS DROPDOWN */}
                    {searchQuery.trim().length > 0 && (
                      <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                        {loadingStudents ? (
                          <div className="p-3 text-xs text-slate-500 text-center">Chargement de la liste des élèves...</div>
                        ) : filteredStudents.length === 0 ? (
                          <div className="p-3 text-xs text-slate-500 text-center">Aucun élève trouvé pour "{searchQuery}"</div>
                        ) : (
                          filteredStudents.map((st) => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => {
                                handleSelectStudent(st);
                                setSearchQuery("");
                              }}
                              className="w-full p-3 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/50 flex items-center justify-between transition-colors"
                            >
                              <div>
                                <p className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                                  {st.lastName || st.nom} {st.firstName || st.prenom}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  Matricule: <span className="font-mono">{st.matricule || "N/A"}</span> | Classe:{" "}
                                  <span className="font-semibold text-indigo-600">{getStudentClass(st)}</span>
                                </p>
                              </div>
                              <Badge variant="outline" className="text-[10px]">
                                Sélectionner
                              </Badge>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* SELECTED STUDENT CARD PREVIEW */}
                  {selectedStudent ? (
                    <div className="p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                          {(selectedStudent.lastName?.[0] || selectedStudent.nom?.[0] || selectedStudent.firstName?.[0] || "E").toUpperCase()}
                          {(selectedStudent.lastName?.[0] || selectedStudent.nom?.[0] || "").toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {selectedStudent.lastName || selectedStudent.nom} {selectedStudent.firstName || selectedStudent.prenom}
                          </p>
                          <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                            Matricule: <span className="font-mono">{selectedStudent.matricule || "N/A"}</span> | Classe:{" "}
                            <span className="font-semibold">{getStudentClass(selectedStudent)}</span>
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(null)} className="text-xs text-slate-500 hover:text-red-600">
                        Changer
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500">
                      Veuillez rechercher et sélectionner un élève ci-dessus pour continuer.
                    </div>
                  )}

                  {/* PAYMENT CATEGORY SELECTION */}
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Catégorie de Règlement *</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => handleSelectCategory("examen")}
                        className={`p-3 rounded-xl border text-left flex flex-col items-center justify-center gap-1.5 transition-all ${
                          paymentCategory === "examen"
                            ? "border-indigo-600 bg-indigo-600 text-white shadow-md"
                            : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <GraduationCap className="h-5 w-5" />
                        <span className="text-xs font-semibold">Examens Officiels</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectCategory("cantine")}
                        className={`p-3 rounded-xl border text-left flex flex-col items-center justify-center gap-1.5 transition-all ${
                          paymentCategory === "cantine"
                            ? "border-indigo-600 bg-indigo-600 text-white shadow-md"
                            : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <Utensils className="h-5 w-5" />
                        <span className="text-xs font-semibold">Cantine Scolaire</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectCategory("transport")}
                        className={`p-3 rounded-xl border text-left flex flex-col items-center justify-center gap-1.5 transition-all ${
                          paymentCategory === "transport"
                            ? "border-indigo-600 bg-indigo-600 text-white shadow-md"
                            : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <Bus className="h-5 w-5" />
                        <span className="text-xs font-semibold">Transport Scolaire</span>
                      </button>
                    </div>
                  </div>

                  {/* SPECIFIC PAYMENT DETAILS FOR EXAM */}
                  {paymentCategory === "examen" && (
                    <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Choix de l'Examen Officiel *</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {Object.entries(OFFICIAL_EXAM_FEES).map(([key, fee]) => (
                          <div
                            key={key}
                            onClick={() => setSelectedExamType(key as any)}
                            className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                              selectedExamType === key
                                ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 ring-2 ring-indigo-500/20"
                                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-200"
                            }`}
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{fee.code}</p>
                              <p className="text-[11px] text-slate-500">{fee.label}</p>
                            </div>
                            <Badge className="bg-indigo-600 text-white font-mono text-xs">
                              {fee.amount.toLocaleString("fr-FR")} F
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SPECIFIC PAYMENT DETAILS FOR CANTINE */}
                  {paymentCategory === "cantine" && (
                    <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Période Cantine *</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          type="button"
                          variant={cantinePeriod === "mensuel" ? "default" : "outline"}
                          onClick={() => setCantinePeriod("mensuel")}
                          className="w-full text-xs"
                        >
                          Abonnement Mensuel (15 000 F)
                        </Button>
                        <Button
                          type="button"
                          variant={cantinePeriod === "trimestriel" ? "default" : "outline"}
                          onClick={() => setCantinePeriod("trimestriel")}
                          className="w-full text-xs"
                        >
                          Abonnement Trimestriel (45 000 F)
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* SPECIFIC PAYMENT DETAILS FOR TRANSPORT */}
                  {paymentCategory === "transport" && (
                    <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Zone / Ligne de Transport & Tarif *
                      </Label>
                      <Select
                        value={selectedTransportZoneId}
                        onValueChange={(val) => setSelectedTransportZoneId(val)}
                      >
                        <SelectTrigger className="rounded-xl bg-white dark:bg-slate-950 text-xs">
                          <SelectValue placeholder="Sélectionner la zone de transport..." />
                        </SelectTrigger>
                        <SelectContent>
                          {transportZones.map((z) => (
                            <SelectItem key={z.id} value={z.id} className="text-xs">
                              {z.nom} — ({z.tarifMensuel.toLocaleString("fr-FR")} F CFA / mois)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedTransportZoneId && (
                        <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                          <p className="font-bold flex items-center gap-1.5">
                            <Bus className="h-3.5 w-3.5 text-emerald-600" />
                            {transportZones.find((z) => z.id === selectedTransportZoneId)?.nom}
                          </p>
                          {transportZones.find((z) => z.id === selectedTransportZoneId)?.quartiers && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-400">
                              Quartiers desservis : {transportZones.find((z) => z.id === selectedTransportZoneId)?.quartiers?.join(", ")}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* AMOUNT & PAYMENT METHOD */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Montant Versé (FCFA) *</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          className="font-bold text-base text-indigo-700 dark:text-indigo-400 rounded-xl"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">FCFA</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Mode de Règlement *</Label>
                      <Select value={paymentMode} onValueChange={setPaymentMode}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="especes">ESPÈCES</SelectItem>
                          <SelectItem value="mobile_money">MOBILE MONEY (Orange, MTN, Moov, Wave)</SelectItem>
                          <SelectItem value="cheque">CHÈQUE BANCAIRE</SelectItem>
                          <SelectItem value="coris_bank">DÉPÔT / VIREMENT CORIS BANK</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* TRANSACTION REF & NOTES */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Référence / N° Transaction (Facultatif)</Label>
                      <Input
                        placeholder="Ex: MM-89382103"
                        value={transactionRef}
                        onChange={(e) => setTransactionRef(e.target.value)}
                        className="text-xs rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Observation / Remarque</Label>
                      <Input
                        placeholder="Remarque éventuelle..."
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        className="text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  {/* SUBMIT BUTTON */}
                  <Button
                    type="button"
                    onClick={handleRecordPayment}
                    disabled={submittingPayment || !selectedStudent}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 text-sm rounded-xl shadow-lg transition-all"
                  >
                    {submittingPayment ? (
                      "Enregistrement du règlement..."
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Valider le Règlement
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* RIGHT COLUMN: RECENT ECONOMAT ENCAISSEMENTS */}
              <Card className="lg:col-span-5 border-slate-200 dark:border-slate-800 shadow-md">
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <CardTitle className="text-lg font-bold flex items-center justify-between text-slate-900 dark:text-slate-100">
                    <span className="flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-indigo-600" /> Historique Guichet Économat
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {economatPayments.length} Reçus
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Derniers paiements enregistrés par l'Économat pendant cette session.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  {economatPayments.length === 0 ? (
                    <div className="p-8 text-center space-y-3 text-slate-400">
                      <Receipt className="h-10 w-10 mx-auto text-slate-300" />
                      <p className="text-xs">Aucun encaissement effectué pour le moment dans cette session.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {economatPayments.map((p) => (
                        <div
                          key={p.id}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm hover:border-indigo-200 transition-all"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-indigo-600">{p.receiptNumber}</span>
                              <Badge className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {p.rubric}
                              </Badge>
                            </div>
                            <p className="font-semibold text-xs text-slate-900 dark:text-slate-100">{p.studentName}</p>
                            <p className="text-[11px] text-slate-500">
                              Matricule: <span className="font-mono">{p.studentMatricule}</span> | Classe: {p.studentClass}
                            </p>
                          </div>

                          <div className="text-right space-y-1">
                            <p className="font-bold text-sm text-emerald-600">{p.amount.toLocaleString("fr-FR")} F</p>
                            <p className="text-[10px] text-slate-400 italic">Reçu au Guichet Caisse</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB: GESTION DES FRAIS D'ÉCOLAGE */}
          <TabsContent value="frais_ecolage" className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  Gestion des Frais d'Écolage & Grille Tarifaire
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configurez, ajoutez, modifiez et supprimez les tarifs de scolarité, inscriptions et tranches de paiement.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSyncFromEcheancierPresets}
                  variant="outline"
                  className="text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200 gap-1.5 font-semibold text-xs py-2 px-3 shadow-sm"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Importer de l'Échéancier
                </Button>
                <Button onClick={handleOpenAddFraisEcolage} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold text-xs py-2 px-4 shadow-sm">
                  <Plus className="h-4 w-4" /> Nouveau Frais d'Écolage
                </Button>
              </div>
            </div>

            {/* KPI Cards Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900 dark:to-slate-800 border-indigo-100 dark:border-slate-700">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-300">Total Tarifs Configurés</p>
                    <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{fraisEcolageList.length} Tarifs</p>
                  </div>
                  <div className="p-2.5 bg-indigo-600/10 rounded-xl text-indigo-600">
                    <Receipt className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-slate-900 dark:to-slate-800 border-emerald-100 dark:border-slate-700">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">Tarifs Actifs</p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      {fraisEcolageList.filter((f) => f.actif).length} Actifs
                    </p>
                  </div>
                  <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-slate-900 dark:to-slate-800 border-purple-100 dark:border-slate-700">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-purple-900 dark:text-purple-300">Cycles & Niveaux Couverts</p>
                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">Maternelle à Collège 2nd Cycle</p>
                  </div>
                  <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-600">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filter & Search Bar */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Rechercher par libellé ou niveau..."
                      value={searchEcolage}
                      onChange={(e) => setSearchEcolage(e.target.value)}
                      className="pl-9 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Label className="text-xs font-semibold whitespace-nowrap">Filtrer par niveau :</Label>
                    <Select value={filterEcolageLevel} onValueChange={setFilterEcolageLevel}>
                      <SelectTrigger className="w-44 text-xs">
                        <SelectValue placeholder="Tous les niveaux" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tous">Tous les niveaux</SelectItem>
                        <SelectItem value="Maternelle">Maternelle & Primaire</SelectItem>
                        <SelectItem value="Collège">Collège (1er Cycle)</SelectItem>
                        <SelectItem value="Collège 2nd Cycle">Collège 2nd Cycle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>Liste des Frais d'Écolage</span>
                  <Badge variant="outline">{filteredFraisEcolageList.length} Éléments</Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Modifiez ou supprimez les frais d'écolage ci-dessous. Les modifications s'appliquent immédiatement à la caisse et à la comptabilité.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold border-y border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-3 px-4">Libellé & Description</th>
                        <th className="py-3 px-4">Niveau / Cycle</th>
                        <th className="py-3 px-4">Statut Orientation</th>
                        <th className="py-3 px-4 text-right">Montant Total</th>
                        <th className="py-3 px-4 text-right">Frais Inscription</th>
                        <th className="py-3 px-4 text-right">Frais Annexes</th>
                        <th className="py-3 px-4">Échéancier</th>
                        <th className="py-3 px-4 text-center">Statut</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredFraisEcolageList.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-500">
                            Aucun frais d'écolage trouvé pour cette recherche.
                          </td>
                        </tr>
                      ) : (
                        paginatedFraisEcolageList.map((item) => {
                          const itemTranches = item.tranches && item.tranches.length > 0
                            ? item.tranches
                            : generateDefaultTranches(item.montantTotal, item.fraisInscription);
                          const isExpanded = expandedEcolageId === item.id;

                          return (
                            <React.Fragment key={item.id}>
                              <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="py-3 px-4">
                                  <p className="font-bold text-slate-900 dark:text-white">{item.libelle}</p>
                                  {item.description && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.description}</p>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    {item.level}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4">
                                  {item.statutOrientation === "Affecté par l'État" ? (
                                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-none">
                                      Affecté par l'État
                                    </Badge>
                                  ) : item.statutOrientation === "Non-Affecté" ? (
                                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border-none">
                                      Non-Affecté
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">Tous les élèves</Badge>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                                  {formatCurrency(item.montantTotal)}
                                </td>
                                <td className="py-3 px-4 text-right font-semibold text-slate-700 dark:text-slate-300">
                                  {formatCurrency(item.fraisInscription)}
                                </td>
                                <td className="py-3 px-4 text-right font-semibold text-amber-600 dark:text-amber-400">
                                  {formatCurrency(item.fraisAnnexes || 0)}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="space-y-1">
                                    <span className="font-semibold block text-slate-800 dark:text-slate-200">{item.nombreEcheances}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setExpandedEcolageId(isExpanded ? null : item.id)}
                                      className="h-6 text-[10px] px-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 font-bold gap-1"
                                    >
                                      {isExpanded ? "▲ Masquer l'Échéancier" : `▼ Détail des ${itemTranches.length} Versements`}
                                    </Button>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {item.actif ? (
                                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border-none">
                                      Actif
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive">Inactif</Badge>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenEditFraisEcolage(item)}
                                      className="h-8 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200"
                                      title="Modifier ce frais"
                                    >
                                      <Edit className="h-3.5 w-3.5 mr-1" /> Modifier
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDeleteFraisEcolage(item.id, item.libelle)}
                                      className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                                      title="Supprimer ce frais"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Supprimer
                                    </Button>
                                  </div>
                                </td>
                              </tr>

                              {/* EXPANDABLE MONTHLY TRANCHES BREAKDOWN ROW */}
                              {isExpanded && (
                                <tr className="bg-indigo-50/50 dark:bg-slate-800/80">
                                  <td colSpan={9} className="p-4">
                                    <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-700 rounded-xl p-4 shadow-sm space-y-3">
                                      <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                                          <Calendar className="h-4 w-4 text-indigo-600" />
                                          Échéancier Détaillé des Versements Mensuels — {item.libelle}
                                        </h4>
                                        <Badge className="bg-indigo-600 text-white font-bold text-[10px]">
                                          Total Échéancier : {formatCurrency(item.montantTotal)}
                                        </Badge>
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                        {itemTranches.map((t, idx) => (
                                          <div key={t.id || idx} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                                            <div>
                                              <p className="font-bold text-[11px] text-slate-800 dark:text-slate-200">{t.libelle}</p>
                                              {t.dateEcheance && (
                                                <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                                  📅 Échéance : {t.dateEcheance}
                                                </p>
                                              )}
                                            </div>
                                            <p className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                                              {formatCurrency(t.montant)}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION FOOTER */}
                {totalEcolagePages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-xl">
                    <div className="text-xs text-slate-500 font-medium">
                      Affichage de <strong>{Math.min((ecolagePage - 1) * ITEMS_PER_PAGE_ECOLAGE + 1, filteredFraisEcolageList.length)}</strong> à <strong>{Math.min(ecolagePage * ITEMS_PER_PAGE_ECOLAGE, filteredFraisEcolageList.length)}</strong> sur <strong>{filteredFraisEcolageList.length}</strong> tarifs
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEcolagePage((p) => Math.max(1, p - 1))}
                        disabled={ecolagePage <= 1}
                        className="h-8 text-xs gap-1 font-semibold"
                      >
                        <ChevronLeft className="h-4 w-4" /> Précédent
                      </Button>

                      <div className="flex items-center gap-1 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 shadow-xs">
                        Page {ecolagePage} / {totalEcolagePages}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEcolagePage((p) => Math.min(totalEcolagePages, p + 1))}
                        disabled={ecolagePage >= totalEcolagePages}
                        className="h-8 text-xs gap-1 font-semibold"
                      >
                        Suivant <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: FRAIS D'EXAMEN OFFICIEL */}
          <TabsContent value="examens" className="space-y-6">
            <Card className="border-slate-200 dark:border-slate-800 shadow-md">
              <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <GraduationCap className="h-5 w-5 text-indigo-600" /> Tarification & Suivi des Frais d'Examen Officiel
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    BEPC (2 000 F), BAC (5 000 F), CEPE Arabe (7 000 F), CEPE Officiel (500 F) gérés au niveau de l'Économat.
                  </CardDescription>
                </div>

                {/* EXAM FILTER BUTTONS */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    variant={examFilter === "ALL" ? "default" : "outline"}
                    onClick={() => setExamFilter("ALL")}
                    className="text-xs h-8"
                  >
                    Tous les examens
                  </Button>
                  <Button
                    size="sm"
                    variant={examFilter === "BEPC" ? "default" : "outline"}
                    onClick={() => setExamFilter("BEPC")}
                    className="text-xs h-8"
                  >
                    BEPC (2 000 F)
                  </Button>
                  <Button
                    size="sm"
                    variant={examFilter === "BAC" ? "default" : "outline"}
                    onClick={() => setExamFilter("BAC")}
                    className="text-xs h-8"
                  >
                    BAC (5 000 F)
                  </Button>
                  <Button
                    size="sm"
                    variant={examFilter === "CEPE_ARABE" ? "default" : "outline"}
                    onClick={() => setExamFilter("CEPE_ARABE")}
                    className="text-xs h-8"
                  >
                    CEPE Arabe (7 000 F)
                  </Button>
                  <Button
                    size="sm"
                    variant={examFilter === "CEPE_OFFICIEL" ? "default" : "outline"}
                    onClick={() => setExamFilter("CEPE_OFFICIEL")}
                    className="text-xs h-8"
                  >
                    CEPE Officiel (500 F)
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {Object.entries(OFFICIAL_EXAM_FEES).map(([key, fee]) => (
                    <div
                      key={key}
                      className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-b from-indigo-50/40 to-white dark:from-slate-900 dark:to-slate-900/50 shadow-sm space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-indigo-950 dark:text-indigo-300">{fee.code}</span>
                        <Badge className="bg-indigo-600 text-white font-mono text-xs">{fee.amount.toLocaleString("fr-FR")} FCFA</Badge>
                      </div>
                      <p className="text-xs text-slate-500">{fee.label}</p>
                      <div className="text-[11px] text-indigo-700 dark:text-indigo-400 font-semibold pt-1 border-t border-slate-100 dark:border-slate-800">
                        Niveau cible : {fee.targetLevel}
                      </div>
                    </div>
                  ))}
                </div>

                {/* PAYMENTS TABLE */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                        <th className="p-3">N° Reçu</th>
                        <th className="p-3">Élève</th>
                        <th className="p-3">Classe</th>
                        <th className="p-3">Examen Officiel</th>
                        <th className="p-3">Montant Fixe</th>
                        <th className="p-3">Mode</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Date d'acquittement</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredExamPayments.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-400">
                            Aucun paiement d'examen enregistré pour le moment avec ce filtre.
                          </td>
                        </tr>
                      ) : (
                        filteredExamPayments.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                            <td className="p-3 font-mono font-bold text-indigo-600">{p.receiptNumber}</td>
                            <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">{p.studentName}</td>
                            <td className="p-3">{p.studentClass}</td>
                            <td className="p-3">
                              <Badge className="bg-indigo-600 text-white text-[10px]">{p.examType}</Badge>
                            </td>
                            <td className="p-3 font-bold text-emerald-600">{p.amount.toLocaleString("fr-FR")} F</td>
                            <td className="p-3 uppercase text-[10px] font-semibold text-slate-600">{p.mode}</td>
                            <td className="p-3">{formatDate(p.date)}</td>
                            <td className="p-3 text-emerald-700 font-medium">{formatDate(p.date_acquittement || p.date)}</td>
                            <td className="p-3 text-right text-[10px] text-slate-400 italic">
                              Reçu au Guichet Caisse
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

          {/* TAB 3: CANTINE & TRANSPORT */}
          <TabsContent value="cantine_transport" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* CANTINE MANAGEMENT CARD */}
              <Card className="border-slate-200 dark:border-slate-800 shadow-md">
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                      <Utensils className="h-5 w-5 text-amber-600" /> Forfaits & Formules Cantine
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Tarifs officiels cantine (synchronisés avec la page Transport) — modification uniquement.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {cantinePlans.length === 0 ? (
                    <p className="text-xs text-slate-400 p-4 text-center">Aucune formule de cantine configurée.</p>
                  ) : (
                    paginatedCantinePlans.map((plan) => (
                      <div
                        key={plan.id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm hover:border-amber-300 transition-all"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{plan.nom}</span>
                            <Badge variant="outline" className="text-[10px] capitalize bg-amber-50 text-amber-800 border-amber-200">
                              {plan.periode}
                            </Badge>
                          </div>
                          {plan.description && <p className="text-[11px] text-slate-500">{plan.description}</p>}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-bold text-sm text-amber-700 dark:text-amber-400 font-mono">
                            {plan.montant.toLocaleString("fr-FR")} F
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setEditCantinePlan(plan);
                                setFormCantinePlan({
                                  nom: plan.nom,
                                  montant: String(plan.montant),
                                  periode: plan.periode,
                                  description: plan.description || '',
                                });
                                setOpenCantinePlanModal(true);
                              }}
                            >
                              <Edit className="h-3.5 w-3.5 text-slate-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {/* PAGINATION CANTINE */}
                  {totalCantinePages > 1 && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <span className="text-slate-500 text-[11px]">Page {cantinePage} sur {totalCantinePages}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={cantinePage === 1}
                          onClick={() => setCantinePage((p) => Math.max(1, p - 1))}
                          className="h-7 px-2 text-[11px]"
                        >
                          <ChevronLeft className="h-3 w-3 mr-1" /> Préc.
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={cantinePage >= totalCantinePages}
                          onClick={() => setCantinePage((p) => Math.min(totalCantinePages, p + 1))}
                          className="h-7 px-2 text-[11px]"
                        >
                          Suiv. <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => {
                      setActiveTab("encaissement");
                      setPaymentCategory("cantine");
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs py-2.5 rounded-xl mt-2"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Effectuer un Encaissement Cantine
                  </Button>
                </CardContent>
              </Card>

              {/* TRANSPORT MANAGEMENT CARD */}
              <Card className="border-slate-200 dark:border-slate-800 shadow-md">
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                      <Bus className="h-5 w-5 text-emerald-600" /> Lignes & Zones Transport / Car
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Gestion des zones et lignes de bus (Ajout, modification, suppression).
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditTransportZone(null);
                      setFormTransportZone({ nom: '', tarifMensuel: '', tarifTrimestriel: '', quartiers: '' });
                      setOpenTransportZoneModal(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Ajouter
                  </Button>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {transportZones.length === 0 ? (
                    <p className="text-xs text-slate-400 p-4 text-center">Aucune ligne de transport configurée.</p>
                  ) : (
                    paginatedTransportZones.map((zone) => (
                      <div
                        key={zone.id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm hover:border-emerald-300 transition-all"
                      >
                        <div className="space-y-1">
                          <p className="font-bold text-xs text-slate-900 dark:text-slate-100">{zone.nom}</p>
                          {zone.quartiers && zone.quartiers.length > 0 && (
                            <p className="text-[11px] text-slate-500">
                              Quartiers : {zone.quartiers.join(", ")}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-bold text-xs text-emerald-700 dark:text-emerald-400 font-mono">
                              {zone.tarifMensuel.toLocaleString("fr-FR")} F/mois
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setEditTransportZone(zone);
                                setFormTransportZone({
                                  nom: zone.nom,
                                  tarifMensuel: String(zone.tarifMensuel),
                                  quartiers: zone.quartiers ? zone.quartiers.join(", ") : '',
                                });
                                setOpenTransportZoneModal(true);
                              }}
                            >
                              <Edit className="h-3.5 w-3.5 text-slate-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                              onClick={() => handleDeleteTransportZone(zone.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {/* PAGINATION TRANSPORT */}
                  {totalTransportPages > 1 && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <span className="text-slate-500 text-[11px]">Page {transportPage} sur {totalTransportPages}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={transportPage === 1}
                          onClick={() => setTransportPage((p) => Math.max(1, p - 1))}
                          className="h-7 px-2 text-[11px]"
                        >
                          <ChevronLeft className="h-3 w-3 mr-1" /> Préc.
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={transportPage >= totalTransportPages}
                          onClick={() => setTransportPage((p) => Math.min(totalTransportPages, p + 1))}
                          className="h-7 px-2 text-[11px]"
                        >
                          Suiv. <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => {
                      setActiveTab("encaissement");
                      setPaymentCategory("transport");
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs py-2.5 rounded-xl mt-2"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Effectuer un Encaissement Transport
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB: ATTRIBUTION DE SERVICES (CANTINE & CAR) */}
          <TabsContent value="attributions" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT: FORMULAIRE D'ATTRIBUTION */}
              <Card className="lg:col-span-5 border-slate-200 dark:border-slate-800 shadow-md">
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <UserCheck className="h-5 w-5 text-indigo-600" /> Affectation d'un élève aux services
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Attribuez la Cantine, le Transport (Car) ou les 2 à un élève pour que son échéancier s'affiche sur son reçu.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-5">
                  {/* RECHERCHE ÉLÈVE */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Rechercher l'Élève *
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Nom, prénom, matricule ou classe..."
                        value={attrStudentSearch}
                        onChange={(e) => {
                          setAttrStudentSearch(e.target.value);
                          if (!e.target.value.trim()) setSelectedAttrStudent(null);
                        }}
                        className="pl-9 text-xs rounded-xl"
                      />
                    </div>

                    {attrStudentSearch.trim() && !selectedAttrStudent && (
                      <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 shadow-lg divide-y divide-slate-100 dark:divide-slate-800 z-10 relative">
                        {students
                          .filter((s) => matchStudentSearch(s, attrStudentSearch))
                          .slice(0, 8)
                          .map((st) => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => handleSelectAttrStudent(st)}
                              className="w-full text-left p-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors flex items-center justify-between"
                            >
                              <div>
                                <p className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                                  {formatStudentName(st)}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  Matricule: <span className="font-mono">{st.matricule || "N/A"}</span> | Classe: {getStudentClass(st)}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-[10px]">Sélectionner</Badge>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* FICHE ÉLÈVE SÉLECTIONNÉ */}
                  {selectedAttrStudent && (
                    <div className="p-3.5 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm text-indigo-950 dark:text-indigo-200">
                            {formatStudentName(selectedAttrStudent)}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Matricule : <span className="font-mono font-bold text-indigo-700">{selectedAttrStudent.matricule || "N/A"}</span> | Classe : {getStudentClass(selectedAttrStudent)}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedAttrStudent(null)} className="h-6 text-[10px] text-red-500 hover:text-red-700">Changer</Button>
                      </div>

                      <div className="space-y-2 pt-1 border-t border-indigo-200 dark:border-indigo-800/60">
                        <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Sélection des Services Souscrits :</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setAttrCantine(!attrCantine)}
                            className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                              attrCantine
                                ? "bg-amber-50 border-amber-400 text-amber-900 dark:bg-amber-950/40 dark:border-amber-600 dark:text-amber-200 font-bold"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <span className="flex items-center gap-1.5 text-xs"><Utensils className="h-4 w-4 text-amber-600" /> Cantine</span>
                            <Badge variant={attrCantine ? "default" : "outline"} className={attrCantine ? "bg-amber-600 text-white text-[10px]" : "text-[10px]"}>
                              {attrCantine ? "Oui" : "Non"}
                            </Badge>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const next = !attrTransport;
                              setAttrTransport(next);
                              if (next && !attrTransportZoneId) {
                                setAttrTransportZoneId(transportZones[0]?.id || "");
                              }
                            }}
                            className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                              attrTransport
                                ? "bg-emerald-50 border-emerald-400 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-600 dark:text-emerald-200 font-bold"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <span className="flex items-center gap-1.5 text-xs"><Bus className="h-4 w-4 text-emerald-600" /> Transport</span>
                            <Badge variant={attrTransport ? "default" : "outline"} className={attrTransport ? "bg-emerald-600 text-white text-[10px]" : "text-[10px]"}>
                              {attrTransport ? "Oui" : "Non"}
                            </Badge>
                          </button>
                        </div>

                        {attrTransport && (
                          <div className="space-y-1.5 p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                            <Label className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                              <Bus className="h-3.5 w-3.5 text-emerald-600" />
                              Ligne / Zone de Transport Tarifée *
                            </Label>
                            <Select
                              value={attrTransportZoneId || transportZones[0]?.id || ""}
                              onValueChange={(val) => setAttrTransportZoneId(val)}
                            >
                              <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-950 border-emerald-300">
                                <SelectValue placeholder="Sélectionner la ligne..." />
                              </SelectTrigger>
                              <SelectContent>
                                {transportZones.map((z) => (
                                  <SelectItem key={z.id} value={z.id} className="text-xs">
                                    {z.nom} — ({z.tarifMensuel.toLocaleString("fr-FR")} F CFA / mois)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="flex gap-2 pt-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setAttrCantine(true);
                              setAttrTransport(true);
                              if (!attrTransportZoneId) setAttrTransportZoneId(transportZones[0]?.id || "");
                            }}
                            className="text-[11px] h-7 text-indigo-600 border-indigo-300"
                          >
                            Attribuer les 2 (Cantine + Transport)
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => { setAttrCantine(false); setAttrTransport(false); }}
                            className="text-[11px] h-7 text-slate-500"
                          >
                            Aucun service
                          </Button>
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={() => saveAttribution(selectedAttrStudent, attrCantine, attrTransport, attrTransportZoneId)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 text-xs rounded-xl shadow-md"
                      >
                        Enregistrer l'attribution de service
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* RIGHT: TABLEAU ET RECAPITULATIF DE TOUTES LES ATTRIBUTIONS */}
              <Card className="lg:col-span-7 border-slate-200 dark:border-slate-800 shadow-md">
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                      <Users className="h-5 w-5 text-indigo-600" /> Élèves Inscrits aux Services Interne
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Liste des élèves bénéficiant de la cantine et/ou du transport scolaire.
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      size="sm"
                      variant={attrFilter === "ALL" ? "default" : "outline"}
                      onClick={() => {
                        setAttrFilter("ALL");
                        setAttrPage(1);
                      }}
                      className="text-xs h-7 px-2.5"
                    >
                      Tous ({Object.keys(attributionsMap).length})
                    </Button>
                    <Button
                      size="sm"
                      variant={attrFilter === "CANTINE" ? "default" : "outline"}
                      onClick={() => {
                        setAttrFilter("CANTINE");
                        setAttrPage(1);
                      }}
                      className="text-xs h-7 px-2.5"
                    >
                      Cantine ({Object.values(attributionsMap).filter((d) => d.cantine).length})
                    </Button>
                    <Button
                      size="sm"
                      variant={attrFilter === "TRANSPORT" ? "default" : "outline"}
                      onClick={() => {
                        setAttrFilter("TRANSPORT");
                        setAttrPage(1);
                      }}
                      className="text-xs h-7 px-2.5"
                    >
                      Transport ({Object.values(attributionsMap).filter((d) => d.transport).length})
                    </Button>
                    <Button
                      size="sm"
                      variant={attrFilter === "BOTH" ? "default" : "outline"}
                      onClick={() => {
                        setAttrFilter("BOTH");
                        setAttrPage(1);
                      }}
                      className="text-xs h-7 px-2.5"
                    >
                      Les 2 ({Object.values(attributionsMap).filter((d) => d.cantine && d.transport).length})
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {/* BARRE DE RECHERCHE & SÉLECTEUR DE LIGNES PAR PAGE */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pb-1">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        placeholder="Rechercher par nom, prénom, matricule ou classe..."
                        value={attrListSearch}
                        onChange={(e) => {
                          setAttrListSearch(e.target.value);
                          setAttrPage(1);
                        }}
                        className="pl-8 h-8 text-xs bg-slate-50/70 dark:bg-slate-900 rounded-lg"
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Label className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Par page :</Label>
                      <Select
                        value={String(attrPageSize)}
                        onValueChange={(val) => {
                          setAttrPageSize(Number(val));
                          setAttrPage(1);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs w-28 bg-white dark:bg-slate-950 font-semibold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 élèves</SelectItem>
                          <SelectItem value="10">10 élèves</SelectItem>
                          <SelectItem value="20">20 élèves</SelectItem>
                          <SelectItem value="50">50 élèves</SelectItem>
                          <SelectItem value="-1">Tous ({filteredAttributions.length})</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* LISTE DES ÉLÈVES */}
                  {filteredAttributions.length === 0 ? (
                    <div className="p-8 text-center space-y-3 text-slate-400">
                      <Utensils className="h-10 w-10 mx-auto text-slate-300" />
                      <p className="text-xs font-semibold">
                        {attrListSearch.trim()
                          ? `Aucun élève ne correspond à la recherche "${attrListSearch}".`
                          : "Aucune attribution de service enregistrée pour ce filtre."}
                      </p>
                      <p className="text-[11px] text-slate-400">Recherchez un élève ci-contre pour lui attribuer la cantine ou le transport.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {paginatedAttributions.map(([key, data]) => (
                        <div
                          key={key}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-xs hover:border-indigo-200 transition-all"
                        >
                          <div>
                            <p className="font-bold text-xs text-slate-900 dark:text-slate-100">{data.studentName || key}</p>
                            <p className="text-[11px] text-slate-500">
                              Matricule: <span className="font-mono font-medium">{data.studentMatricule || key}</span> | Classe: <span className="font-semibold">{data.studentClass || "N/A"}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {data.cantine ? (
                              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold">
                                <Utensils className="h-3 w-3 mr-1" /> Cantine
                              </Badge>
                            ) : null}
                            {data.transport ? (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                                <Bus className="h-3 w-3 mr-1" /> Transport
                              </Badge>
                            ) : null}
                            {!data.cantine && !data.transport ? (
                              <Badge variant="outline" className="text-[10px] text-slate-400">Désabonné</Badge>
                            ) : null}

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const targetSt = students.find((s) => (s.matricule && s.matricule === data.studentMatricule));
                                if (targetSt) handleSelectAttrStudent(targetSt);
                                else {
                                  handleSelectAttrStudent({
                                    firstName: data.studentName,
                                    matricule: data.studentMatricule,
                                  });
                                }
                              }}
                              className="h-7 text-[11px] px-2 text-indigo-600 hover:bg-indigo-50 font-semibold"
                            >
                              Modifier
                            </Button>

                            {(data.cantine || data.transport) && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const targetSt = students.find((s) => (s.matricule && s.matricule === data.studentMatricule));
                                  saveAttribution(targetSt || { firstName: data.studentName, matricule: data.studentMatricule }, false, false);
                                }}
                                className="h-7 text-[11px] px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold"
                                title="Désabonner l'élève de tous les services (Cantine & Transport)"
                              >
                                Désabonner
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* BARRE DE PAGINATION FOOTER */}
                  {filteredAttributions.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                      <p className="text-slate-500 text-[11px]">
                        Affichage de <span className="font-bold text-slate-800 dark:text-slate-200">
                          {(currentAttrPage - 1) * (attrPageSize === -1 ? filteredAttributions.length : attrPageSize) + 1}
                        </span> à <span className="font-bold text-slate-800 dark:text-slate-200">
                          {attrPageSize === -1 ? filteredAttributions.length : Math.min(currentAttrPage * attrPageSize, filteredAttributions.length)}
                        </span> sur <span className="font-bold text-indigo-600 dark:text-indigo-400">{filteredAttributions.length}</span> élève(s)
                      </p>

                      {totalAttrPages > 1 && attrPageSize !== -1 && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAttrPage((p) => Math.max(1, p - 1))}
                            disabled={currentAttrPage <= 1}
                            className="h-7 px-2 text-xs gap-1"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" /> Précédent
                          </Button>

                          <div className="flex items-center gap-1 px-1">
                            {Array.from({ length: totalAttrPages }, (_, i) => i + 1)
                              .filter((page) => {
                                if (totalAttrPages <= 7) return true;
                                if (page === 1 || page === totalAttrPages) return true;
                                return Math.abs(page - currentAttrPage) <= 1;
                              })
                              .map((page, idx, arr) => {
                                const prev = arr[idx - 1];
                                const showEllipsis = prev && page - prev > 1;
                                return (
                                  <React.Fragment key={page}>
                                    {showEllipsis && <span className="px-1 text-slate-400">…</span>}
                                    <Button
                                      size="sm"
                                      variant={page === currentAttrPage ? "default" : "outline"}
                                      onClick={() => setAttrPage(page)}
                                      className={`h-7 w-7 p-0 text-xs font-bold ${
                                        page === currentAttrPage
                                          ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                          : ""
                                      }`}
                                    >
                                      {page}
                                    </Button>
                                  </React.Fragment>
                                );
                              })}
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAttrPage((p) => Math.min(totalAttrPages, p + 1))}
                            disabled={currentAttrPage >= totalAttrPages}
                            className="h-7 px-2 text-xs gap-1"
                          >
                            Suivant <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 4: STOCKS & INVENTAIRE */}
          <TabsContent value="stocks" className="space-y-6">
            <Card className="border-slate-200 dark:border-slate-800 shadow-md">
              <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <Package className="h-5 w-5 text-indigo-600" /> Gestion des Stocks & Inventaire Matériel
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Catalogue des tenues, fournitures, manuels et outillages gérés par l'Économat.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setOpenAddStockModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Ajouter un Article au Stock
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                        <th className="p-3">Code Article</th>
                        <th className="p-3">Désignation</th>
                        <th className="p-3">Catégorie</th>
                        <th className="p-3">Quantité en Stock</th>
                        <th className="p-3">Seuil d'Alerte</th>
                        <th className="p-3">Prix Unitaire</th>
                        <th className="p-3">Valeur Totale</th>
                        <th className="p-3 text-right">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {stockItems.map((stk) => {
                        const isLow = stk.quantity <= stk.minThreshold;
                        return (
                          <tr key={stk.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                            <td className="p-3 font-mono font-bold text-slate-600">{stk.id}</td>
                            <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">{stk.name}</td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-[10px]">
                                {stk.category}
                              </Badge>
                            </td>
                            <td className="p-3 font-bold text-sm">
                              {stk.quantity} <span className="text-xs font-normal text-slate-500">{stk.unit}</span>
                            </td>
                            <td className="p-3 text-slate-500">{stk.minThreshold} {stk.unit}</td>
                            <td className="p-3 font-mono">{stk.unitPrice.toLocaleString("fr-FR")} F</td>
                            <td className="p-3 font-bold text-indigo-600">
                              {(stk.quantity * stk.unitPrice).toLocaleString("fr-FR")} F
                            </td>
                            <td className="p-3 text-right">
                              {isLow ? (
                                <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 text-[10px]">
                                  <AlertTriangle className="h-3 w-3 mr-1 text-amber-500" /> Stock Bas
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 text-[10px]">
                                  <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-500" /> En Stock
                                </Badge>
                              )}
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

          {/* TAB 5: DISTRIBUTION INTERNE DU MATERIEL */}
          <TabsContent value="distribution" className="space-y-6">
            <Card className="border-slate-200 dark:border-slate-800 shadow-md">
              <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <ArrowRightLeft className="h-5 w-5 text-indigo-600" /> Répartition & Distribution Interne du Matériel
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Attribution et bons de sortie du matériel vers les enseignants, classes et services internes.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setOpenDistributionModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Créer un Bon de Sortie / Distribution
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                        <th className="p-3">N° Bon</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Bénéficiaire / Destinataire</th>
                        <th className="p-3">Matériel Distribué</th>
                        <th className="p-3">Quantité Sortie</th>
                        <th className="p-3">Motif / Affectation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {distributions.map((dst) => (
                        <tr key={dst.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="p-3 font-mono font-bold text-indigo-600">{dst.id}</td>
                          <td className="p-3">{formatDate(dst.date)}</td>
                          <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">{dst.beneficiary}</td>
                          <td className="p-3">{dst.item}</td>
                          <td className="p-3 font-bold text-amber-600">
                            {dst.quantity} {dst.unit}
                          </td>
                          <td className="p-3 text-slate-500">{dst.motif}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 6: ACHATS ECONOMAT */}
          <TabsContent value="achats" className="space-y-6">
            <Card className="border-slate-200 dark:border-slate-800 shadow-md">
              <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <ShoppingBag className="h-5 w-5 text-indigo-600" /> Achats & Réapprovisionnements Économat
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Journal des achats d'approvisionnement exécutés par l'Économat pour l'établissement.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setOpenAddPurchaseModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Enregistrer un Achat Économat
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                        <th className="p-3">N° Achat</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Fournisseur / Magasin</th>
                        <th className="p-3">Désignation Matériel</th>
                        <th className="p-3">Quantité Achats</th>
                        <th className="p-3">Montant Total</th>
                        <th className="p-3 text-right">Statut Livraison</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {purchases.map((pch) => (
                        <tr key={pch.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-600">{pch.id}</td>
                          <td className="p-3">{formatDate(pch.date)}</td>
                          <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">{pch.supplier}</td>
                          <td className="p-3">{pch.item}</td>
                          <td className="p-3 font-bold">{pch.quantity}</td>
                          <td className="p-3 font-bold text-indigo-600">{pch.totalAmount.toLocaleString("fr-FR")} FCFA</td>
                          <td className="p-3 text-right">
                            <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 text-[10px]">
                              {pch.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* MODAL: ADD STOCK ITEM */}
      <Dialog open={openAddStockModal} onOpenChange={setOpenAddStockModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-600" /> Ajouter un Article au Stock
            </DialogTitle>
            <DialogDescription className="text-xs">Renseignez les détails du nouvel article pour l'inventaire.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Désignation de l'Article *</Label>
              <Input
                placeholder="Ex: Rame de papier A4 80g"
                value={newStockItem.name}
                onChange={(e) => setNewStockItem({ ...newStockItem, name: e.target.value })}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Catégorie</Label>
                <Select
                  value={newStockItem.category}
                  onValueChange={(val) => setNewStockItem({ ...newStockItem, category: val })}
                >
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fournitures">Fournitures</SelectItem>
                    <SelectItem value="Paperasserie">Paperasserie</SelectItem>
                    <SelectItem value="Uniforme">Uniforme Scolaire</SelectItem>
                    <SelectItem value="Imprimés">Imprimés & Carnets</SelectItem>
                    <SelectItem value="Entretien">Produits d'Entretien</SelectItem>
                    <SelectItem value="Informatique">Informatique & Tech</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Unité de Mesure</Label>
                <Input
                  placeholder="Unités, Boîtes, Rames..."
                  value={newStockItem.unit}
                  onChange={(e) => setNewStockItem({ ...newStockItem, unit: e.target.value })}
                  className="text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Quantité Initiale *</Label>
                <Input
                  type="number"
                  placeholder="50"
                  value={newStockItem.quantity}
                  onChange={(e) => setNewStockItem({ ...newStockItem, quantity: e.target.value })}
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Seuil d'Alerte</Label>
                <Input
                  type="number"
                  placeholder="10"
                  value={newStockItem.minThreshold}
                  onChange={(e) => setNewStockItem({ ...newStockItem, minThreshold: e.target.value })}
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Prix Unitaire (F) *</Label>
                <Input
                  type="number"
                  placeholder="3500"
                  value={newStockItem.unitPrice}
                  onChange={(e) => setNewStockItem({ ...newStockItem, unitPrice: e.target.value })}
                  className="text-xs rounded-xl"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenAddStockModal(false)}>
              Annuler
            </Button>
            <Button size="sm" onClick={handleAddStockItem} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Enregistrer l'Article
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: DISTRIBUTION VOUCHER */}
      <Dialog open={openDistributionModal} onOpenChange={setOpenDistributionModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-indigo-600" /> Bon de Distribution Interne
            </DialogTitle>
            <DialogDescription className="text-xs">Renseignez le bénéficiaire et l'article à distribuer.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Article à Distribuer *</Label>
              <Select
                value={newDistribution.itemId}
                onValueChange={(val) => setNewDistribution({ ...newDistribution, itemId: val })}
              >
                <SelectTrigger className="rounded-xl text-xs">
                  <SelectValue placeholder="Sélectionnez un article du stock..." />
                </SelectTrigger>
                <SelectContent>
                  {stockItems.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.quantity} {s.unit} dispo)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">Bénéficiaire / Service *</Label>
                <Input
                  placeholder="Ex: M. Kouassi (Prof. Phys3B), Secrétariat..."
                  value={newDistribution.beneficiary}
                  onChange={(e) => setNewDistribution({ ...newDistribution, beneficiary: e.target.value })}
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Quantité *</Label>
                <Input
                  type="number"
                  min="1"
                  value={newDistribution.quantity}
                  onChange={(e) => setNewDistribution({ ...newDistribution, quantity: e.target.value })}
                  className="text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Motif / Destination</Label>
              <Input
                placeholder="Ex: Dotation mensuelle classe..."
                value={newDistribution.motif}
                onChange={(e) => setNewDistribution({ ...newDistribution, motif: e.target.value })}
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenDistributionModal(false)}>
              Annuler
            </Button>
            <Button size="sm" onClick={handleCreateDistribution} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Valider la Distribution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: ADD PURCHASE */}
      <Dialog open={openAddPurchaseModal} onOpenChange={setOpenAddPurchaseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-indigo-600" /> Enregistrer un Achat Économat
            </DialogTitle>
            <DialogDescription className="text-xs">Saisissez l'achat d'approvisionnement effectué.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Fournisseur / Magasin *</Label>
              <Input
                placeholder="Ex: Librairie Papeterie Abidjan"
                value={newPurchase.supplier}
                onChange={(e) => setNewPurchase({ ...newPurchase, supplier: e.target.value })}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Désignation du Matériel Acheté *</Label>
              <Input
                placeholder="Ex: Rames de papier, Boîtes de craie..."
                value={newPurchase.item}
                onChange={(e) => setNewPurchase({ ...newPurchase, item: e.target.value })}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Quantité</Label>
                <Input
                  type="number"
                  placeholder="30"
                  value={newPurchase.quantity}
                  onChange={(e) => setNewPurchase({ ...newPurchase, quantity: e.target.value })}
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Montant Total (FCFA) *</Label>
                <Input
                  type="number"
                  placeholder="105000"
                  value={newPurchase.totalAmount}
                  onChange={(e) => setNewPurchase({ ...newPurchase, totalAmount: e.target.value })}
                  className="text-xs rounded-xl"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenAddPurchaseModal(false)}>
              Annuler
            </Button>
            <Button size="sm" onClick={handleAddPurchase} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Enregistrer l'Achat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: CANTINE PLAN (ADD/EDIT) */}
      <Dialog open={openCantinePlanModal} onOpenChange={setOpenCantinePlanModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Utensils className="h-5 w-5 text-amber-600" />
              {editCantinePlan ? "Modifier la formule cantine" : "Ajouter un forfait / formule cantine"}
            </DialogTitle>
            <DialogDescription className="text-xs">Saisissez les détails de la formule de restauration.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nom de la formule *</Label>
              <Input
                placeholder="Ex: Abonnement Mensuel Cantine"
                value={formCantinePlan.nom}
                onChange={(e) => setFormCantinePlan({ ...formCantinePlan, nom: e.target.value })}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Montant (F CFA) *</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="15000"
                  value={formCantinePlan.montant}
                  onChange={(e) => setFormCantinePlan({ ...formCantinePlan, montant: e.target.value })}
                  className="text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Périodicité</Label>
                <Select
                  value={formCantinePlan.periode}
                  onValueChange={(v) => setFormCantinePlan({ ...formCantinePlan, periode: v as any })}
                >
                  <SelectTrigger className="text-xs rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensuel">Mensuel</SelectItem>
                    <SelectItem value="trimestriel">Trimestriel</SelectItem>
                    <SelectItem value="annuel">Annuel</SelectItem>
                    <SelectItem value="repas">Repas à l'unité</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description / Remarques</Label>
              <Input
                placeholder="Ex: Repas complets midi du lundi au vendredi"
                value={formCantinePlan.description}
                onChange={(e) => setFormCantinePlan({ ...formCantinePlan, description: e.target.value })}
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenCantinePlanModal(false)}>
              Annuler
            </Button>
            <Button size="sm" onClick={handleSaveCantinePlan} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
              {editCantinePlan ? "Enregistrer" : "Ajouter la formule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: TRANSPORT ZONE (ADD/EDIT) */}
      <Dialog open={openTransportZoneModal} onOpenChange={setOpenTransportZoneModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Bus className="h-5 w-5 text-emerald-600" />
              {editTransportZone ? "Modifier la ligne / zone de transport" : "Ajouter une ligne / zone de transport"}
            </DialogTitle>
            <DialogDescription className="text-xs">Saisissez la tarification de ramassage bus par secteur.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nom de la Ligne / Zone *</Label>
              <Input
                placeholder="Ex: Zone 1 — Biabou / Djibi"
                value={formTransportZone.nom}
                onChange={(e) => setFormTransportZone({ ...formTransportZone, nom: e.target.value })}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tarif Mensuel (F CFA) *</Label>
              <Input
                type="number"
                min={0}
                placeholder="15000"
                value={formTransportZone.tarifMensuel}
                onChange={(e) => setFormTransportZone({ ...formTransportZone, tarifMensuel: e.target.value })}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Quartiers / Arrêts desservis (séparés par des virgules)</Label>
              <Input
                placeholder="Ex: Biabou 2, Djibi village, Rue Power"
                value={formTransportZone.quartiers}
                onChange={(e) => setFormTransportZone({ ...formTransportZone, quartiers: e.target.value })}
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenTransportZoneModal(false)}>
              Annuler
            </Button>
            <Button size="sm" onClick={handleSaveTransportZone} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              {editTransportZone ? "Enregistrer" : "Ajouter la ligne"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: MODIFICATION & AJOUT FRAIS D'ÉCOLAGE */}
      <Dialog open={openFraisEcolageModal} onOpenChange={setOpenFraisEcolageModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              {editFraisEcolage ? "Modifier le Frais d'Écolage & l'Échéancier" : "Ajouter un Frais d'Écolage & l'Échéancier"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configurez le tarif global et le découpage par versement mensuel de l'échéancier.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Row 1: Libellé et Niveau */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Libellé du Frais *</Label>
                <Input
                  placeholder="Ex: Scolarité 3ème Non-Affecté, Droit d'Inscription..."
                  value={formFraisEcolage.libelle}
                  onChange={(e) => setFormFraisEcolage((p) => ({ ...p, libelle: e.target.value }))}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Niveau / Cycle *</Label>
                <Select
                  value={formFraisEcolage.level}
                  onValueChange={(val) => setFormFraisEcolage((p) => ({ ...p, level: val }))}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Maternelle & Primaire">Maternelle & Primaire</SelectItem>
                    <SelectItem value="Collège (6è-3è)">Collège 1er Cycle (6ème à 3ème)</SelectItem>
                    <SelectItem value="Collège 2nd Cycle (2nde-Tle)">Collège 2nd Cycle (2nde à Terminale)</SelectItem>
                    <SelectItem value="Tous Niveaux">Tous Niveaux</SelectItem>
                    <SelectItem value="6ème">6ème</SelectItem>
                    <SelectItem value="5ème">5ème</SelectItem>
                    <SelectItem value="4ème">4ème</SelectItem>
                    <SelectItem value="3ème">3ème</SelectItem>
                    <SelectItem value="2nde">2nde</SelectItem>
                    <SelectItem value="1ère">1ère</SelectItem>
                    <SelectItem value="Terminale">Terminale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Statut Orientation et Montant Total */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Statut Orientation</Label>
                <Select
                  value={formFraisEcolage.statutOrientation}
                  onValueChange={(val: any) => setFormFraisEcolage((p) => ({ ...p, statutOrientation: val }))}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tous">Tous les Élèves</SelectItem>
                    <SelectItem value="Affecté par l'État">Affecté par l'État</SelectItem>
                    <SelectItem value="Non-Affecté">Non-Affecté</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Montant Total Annuel (FCFA) *</Label>
                <Input
                  type="number"
                  placeholder="Ex: 200000"
                  value={formFraisEcolage.montantTotal}
                  onChange={(e) => setFormFraisEcolage((p) => ({ ...p, montantTotal: e.target.value }))}
                  className="text-xs font-bold text-indigo-600"
                />
              </div>
            </div>

            {/* Row 3: Frais Inscription et Frais Annexes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Frais Inscription (FCFA)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 15000"
                  value={formFraisEcolage.fraisInscription}
                  onChange={(e) => setFormFraisEcolage((p) => ({ ...p, fraisInscription: e.target.value }))}
                  className="text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Frais Annexes (FCFA)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 12000"
                  value={formFraisEcolage.fraisAnnexes}
                  onChange={(e) => setFormFraisEcolage((p) => ({ ...p, fraisAnnexes: e.target.value }))}
                  className="text-xs font-semibold text-amber-600 dark:text-amber-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description / Remarques (Optionnel)</Label>
              <Input
                placeholder="Ex: Inclut la tenue de sport, le carnet de correspondance..."
                value={formFraisEcolage.description}
                onChange={(e) => setFormFraisEcolage((p) => ({ ...p, description: e.target.value }))}
                className="text-xs"
              />
            </div>

            {/* SECTION: ÉCHÉANCIER PAR VERSEMENT MENSUEL */}
            <div className="border border-indigo-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-indigo-600" />
                    Découpage de l'Échéancier (Versements Mensuels)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Ajoutez, modifiez ou supprimez des versements pour adapter la modalité de paiement.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddFormTranche}
                    className="h-8 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Ajouter un Versement
                  </Button>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2 px-3">Libellé / Mois</th>
                      <th className="py-2 px-3">Date Limite d'Échéance</th>
                      <th className="py-2 px-3 text-right">Montant (FCFA)</th>
                      <th className="py-2 px-2 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {formTranchesList.map((tranche, idx) => (
                      <tr key={tranche.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                        <td className="py-1.5 px-3">
                          <Input
                            value={tranche.libelle}
                            onChange={(e) =>
                              setFormTranchesList((prev) =>
                                prev.map((t, i) => (i === idx ? { ...t, libelle: e.target.value } : t))
                              )
                            }
                            className="h-7 text-xs font-medium"
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <Input
                            value={tranche.dateEcheance || ""}
                            placeholder="AAAA-MM-JJ"
                            onChange={(e) =>
                              setFormTranchesList((prev) =>
                                prev.map((t, i) => (i === idx ? { ...t, dateEcheance: e.target.value } : t))
                              )
                            }
                            className="h-7 text-xs"
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <Input
                            type="number"
                            value={tranche.montant}
                            onChange={(e) =>
                              setFormTranchesList((prev) =>
                                prev.map((t, i) => (i === idx ? { ...t, montant: Number(e.target.value) || 0 } : t))
                              )
                            }
                            className="h-7 text-xs font-bold text-right text-indigo-600"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteFormTranche(idx)}
                            className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                            title="Supprimer ce versement"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500 font-medium">
                  Nombre de versements : <strong className="text-slate-800 dark:text-slate-200">{formTranchesList.length}</strong>
                </span>
                <Badge variant="outline" className="font-bold text-indigo-600 border-indigo-200">
                  Total Échéancier : {formatCurrency(formTranchesList.reduce((sum, t) => sum + (Number(t.montant) || 0), 0))}
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenFraisEcolageModal(false)} className="text-xs">
              Annuler
            </Button>
            <Button size="sm" onClick={handleSaveFraisEcolage} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">
              {editFraisEcolage ? "Enregistrer les modifications" : "Ajouter le frais d'écolage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL PROPOSITION ATTRIBUTION SI NON SOUSCRIT */}
      <Dialog open={openUnsubscribedModal} onOpenChange={setOpenUnsubscribedModal}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-900 shadow-2xl">
          <DialogHeader className="text-center sm:text-left">
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-extrabold text-base">
              {unsubscribedTargetService === "cantine" ? "🍱 Élève Non Attribué à la Cantine !" : "🚌 Élève Non Attribué au Transport !"}
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Vérification préalable des souscriptions de services — Économat Hinneh.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center space-y-2">
              <div className="text-5xl animate-bounce">
                {unsubscribedTargetService === "cantine" ? "🍱⚠️" : "🚌⚠️"}
              </div>
              <p className="font-bold text-sm text-slate-900 dark:text-white">
                Souscription manquante pour cet élève
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                L'élève <strong className="text-indigo-600 dark:text-indigo-400 font-extrabold">{selectedStudent?.lastName || selectedStudent?.nom} {selectedStudent?.firstName || selectedStudent?.prenom}</strong> ({selectedStudent?.matricule || "N/A"}) n'est actuellement pas attribué(e) au service de{" "}
                <strong className="text-amber-700 dark:text-amber-300 font-bold">{unsubscribedTargetService === "cantine" ? "Cantine Scolaire" : "Transport Scolaire / Car"}</strong>.
              </p>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 text-center font-medium">
              Souhaitez-vous lui attribuer la <strong>{unsubscribedTargetService === "cantine" ? "Cantine Scolaire" : "Ligne de Transport"}</strong> dès maintenant et autoriser l'enregistrement de ce paiement ?
            </p>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setOpenUnsubscribedModal(false);
                setUnsubscribedTargetService(null);
              }}
              className="w-full sm:w-auto text-xs"
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirmAttributionAndProceed}
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 shadow-md"
            >
              ✨ Attribuer l'élève au service & Continuer le paiement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REÇU RÉCAPITULATIF APRÈS DÉSABONNEMENT D'UN SERVICE ------------------------------- */}
      <Dialog open={openDesabonnementRecuModal} onOpenChange={setOpenDesabonnementRecuModal}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-base">
              <CheckCircle2 className="h-5 w-5" /> Élève Désabonné — Reçu Récapitulatif
            </DialogTitle>
            <DialogDescription className="text-xs">
              Les mois futurs non réglés ont été retirés de l'échéancier. Voici le récapitulatif des derniers paiements de{" "}
              <strong>{desabonnementRecu?.eleve ? `${desabonnementRecu.eleve.nom || ''} ${desabonnementRecu.eleve.prenom || ''}`.trim() : "l'élève"}</strong>.
            </DialogDescription>
          </DialogHeader>

          {desabonnementLoading ? (
            <div className="py-10 text-center text-xs text-slate-400">Préparation du reçu…</div>
          ) : desabonnementRecu ? (
            <div className="py-2 space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <p><strong>Matricule :</strong> {desabonnementRecu.eleve?.matricule || "N/A"}</p>
                <p><strong>Classe :</strong> {desabonnementRecu.eleve?.classe || "N/A"}</p>
                <p><strong>N° Reçu :</strong> <span className="font-mono">{desabonnementRecu.recu_numero}</span></p>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold">
                    <tr>
                      <th className="text-left p-2.5">Rubrique</th>
                      <th className="text-right p-2.5">Versé</th>
                      <th className="text-right p-2.5">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(desabonnementRecu.echeances || [])
                      .filter((e: any) => (e.service_type === "cantine" || e.service_type === "transport") && (e.paid > 0 || e.is_desabonne))
                      .map((e: any, idx: number) => (
                        <tr key={idx}>
                          <td className="p-2.5">
                            {e.rubric}
                            {e.is_desabonne && <span className="ml-1.5 text-[10px] font-bold text-rose-500 italic">(Désabonné)</span>}
                          </td>
                          <td className="p-2.5 text-right font-mono">{formatCurrency(e.paid || 0)}</td>
                          <td className="p-2.5 text-right">
                            {e.is_desabonne ? (
                              <Badge variant="outline" className="text-[10px] text-slate-400">Retiré</Badge>
                            ) : (
                              <Badge className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Réglé</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Le reste dû du service désabonné est clôturé à zéro et n'est en aucun cas prélevé sur les versements de scolarité de l'élève.
              </p>
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-slate-400">Reçu indisponible.</div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setOpenDesabonnementRecuModal(false)}
              className="w-full sm:w-auto text-xs"
            >
              Fermer
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadDesabonnementRecu}
              disabled={!desabonnementRecu}
              className="w-full sm:w-auto text-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5" /> Télécharger PDF
            </Button>
            <Button
              onClick={handlePrintDesabonnementRecu}
              disabled={!desabonnementRecu}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" /> Imprimer le Reçu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
