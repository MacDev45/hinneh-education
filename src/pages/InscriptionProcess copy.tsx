import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Decimal from "decimal.js";
import {
  ClipboardCheck,
  Camera,
  DollarSign,
  GraduationCap,
  Ticket,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Search,
  Upload,
  AlertCircle,
  Package,
  Users,
  Plus,
  Printer,
  Clock,
  Check,
  User,
  FileText,
  Award,
  Layers,
  HeartPulse,
  ShieldCheck,
  ShoppingBag,
  FolderArchive,
  Phone,
  RefreshCw,
  Smartphone,
  Image,
  Boxes,
  CheckSquare,
  Save,
  Calendar,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, matchStudentSearch } from "@/lib/index";
import apiClient from "@/lib/apiClient";
import { printFicheSante } from "@/lib/ficheSantePrinter";

export type CycleScolaire =
  | "Maternelle"
  | "Primaire"
  | "Collège 1er Cycle"
  | "Collège 2nd Cycle";

export interface StepInfo {
  id: number;
  title: string;
  service: string;
  phase: string;
  description: string;
}

export const OFFICIAL_STEPS: StepInfo[] = [
  {
    id: 1,
    title: "Renseignements & Inscription en ligne (3.000 F CFA)",
    service: "Accueil & Orientation",
    phase: "phase1",
    description:
      "Vérification des pièces fournies et validation du droit d'inscription",
  },
  {
    id: 2,
    title: "Présentation et vérification des tenues scolaires & chaussures",
    service: "Vie Scolaire",
    phase: "phase1",
    description: "Vérification des tenues et chaussures conformes",
  },
  {
    id: 3,
    title: "Dépôt physique des kits (Rames, Hygiénique, Marqueurs)",
    service: "Matériel & Logistique",
    phase: "phase1",
    description: "Réception physique des fournitures",
  },
  {
    id: 4,
    title: "Remplissage des fiches individuelles et de santé",
    service: "Service Santé",
    phase: "phase1",
    description: "Saisie des informations médicales et antécédents",
  },
  {
    id: 5,
    title: "Saisie / Vérification dans le logiciel + N° WhatsApp Parent",
    service: "Secrétariat Scolaire",
    phase: "phase2",
    description: "Validation informatique et enregistrement contact parent",
  },
  {
    id: 6,
    title: "Prise / Actualisation de la photo d'identité numérique",
    service: "Service Photographie",
    phase: "phase2",
    description: "Webcam live ou téléversement fichier photo",
  },
  {
    id: 7,
    title: "Règlement des frais d'inscription & versement à la Caisse",
    service: "Service Caisse",
    phase: "phase3",
    description: "Encaissement des frais et versement scolarité",
  },
  {
    id: 8,
    title: "Impression de la Fiche d'Inscription élève",
    service: "Secrétariat / Caisse",
    phase: "phase4",
    description: "Impression physique du dossier d'inscription",
  },
  {
    id: 9,
    title:
      "Remise des fournitures & effets (EPS, Voiles, Cravate, Carnet, Polo)",
    service: "Service Intendance",
    phase: "phase4",
    description: "Distribution du paquet d'effets scolaires",
  },
  {
    id: 10,
    title: "Retrait du Billet d'Entrée officiel + enregistrement WhatsApp",
    service: "Direction des Études",
    phase: "phase4",
    description: "Remise du billet d'accès en classe officiel",
  },
  {
    id: 11,
    title: "Rangement et archivage du dossier élève",
    service: "Service Archivage",
    phase: "phase4",
    description: "Classement définitif au secrétariat principal",
  },
];

interface DossierInscription {
  eleveId: string;
  eleveNom: string;
  elevePrenom: string;
  dateNaissance: string;
  gender: string;
  niveau: string;
  cycle: CycleScolaire;
  typeInscription: "inscription" | "reinscription";
  serviceTransport: boolean;
  serviceCantine: boolean;
  parentNom: string;
  parentTel: string;

  // Qualité Élève, Statut Orientation & Prise en Charge
  qualiteEleve: "Non Redoublant(e)" | "Redoublant(e)";
  statutOrientation: string;
  priseEnCharge: boolean;
  originePriseEnCharge: string;

  // Step state & Kits (Checkboxes)
  currentTab: string;
  kitDepose: boolean;
  kitRamePapier: boolean;
  kitPapierHygienique: boolean;
  kitMarqueursTableau: boolean;

  tenueValidee: boolean;
  ficheSanteRemplie: boolean;
  photoUrl: string;
  classeId: string;
  classeNom: string;

  // Step-by-Step Validation (1 to 11)
  validatedSteps: number[];
  currentStep: number;
  stepValidationTimes: Record<number, string>;

  // Checkable Fee components
  payFraisInscription: boolean; // 3000 F
  payCarteEtCarnet: boolean; // 5000 F
  payApeVieScolaire: boolean; // 5000 F
  payAdhesionApe: boolean; // 6000 F
  payTenueEpsPolo: boolean; // 10000 F
  payAssuranceScolaire?: boolean; // 2000 F
  payFraisExamen?: boolean; // 5000 F (CM2, 3ème, Terminale)
  payTestDiagnostic?: boolean; // 2000 F (6ème)
  payCarnetVraiScolaire?: boolean; // 500 F
  payFraisVieScolaire?: boolean; // 500 F
  payTshirtPolo?: boolean; // 5000 F
  payBandeau?: boolean; // 500 F
  payPhotoIdentite?: boolean; // 1000 F
  payServiceCantine: boolean; // 15000 F
  payServiceTransport: boolean; // 20000 F
  payVersementScolarite: boolean; // Scolarité

  montantVersement: number;
  modeReglement: string;
  numeroTransaction: string;
  matricule: string;
  billetNumber: string;

  // Module Fiche de Santé complète
  groupeSanguin?: string;
  rhesus?: string;
  allergiesAlimentaires?: string;
  allergiesMedicamenteuses?: string;
  etatVaccinal?: string;
  hasAsthme?: boolean;
  asthmeTraitement?: string;
  hasDrepanocytose?: boolean;
  drepanocytoseTraitement?: string;
  hasEpilepsie?: boolean;
  epilepsieTraitement?: string;
  hasHandicap?: boolean;
  handicapPrecision?: string;
  autresPathologies?: string;
  autresTraitement?: string;
  dispenseSportive?: boolean;
  dispensePrecision?: string;
  medecin1Contact?: string;
  medecin2Contact?: string;
  nomAssurance?: string;
}

export const getCycleFromNiveau = (niveauOrClasse: string): CycleScolaire => {
  const str = (niveauOrClasse || "").toLowerCase();
  if (
    str.includes("mat") ||
    str.includes("ps") ||
    str.includes("ms") ||
    str.includes("gs") ||
    str.includes("petite") ||
    str.includes("moyenne") ||
    str.includes("grande")
  ) {
    return "Maternelle";
  }
  if (
    str.includes("cp") ||
    str.includes("ce") ||
    str.includes("cm") ||
    str.includes("prim")
  ) {
    return "Primaire";
  }
  if (
    str.includes("2nd") ||
    str.includes("2e") ||
    str.includes("1er") ||
    str.includes("1e") ||
    str.includes("tle") ||
    str.includes("term") ||
    str.includes("second cycle") ||
    str.includes("lyc")
  ) {
    return "Collège 2nd Cycle";
  }
  return "Collège 1er Cycle";
};

const getCycleBadgeColor = (cycle: CycleScolaire): string => {
  switch (cycle) {
    case "Maternelle":
      return "bg-pink-100 text-pink-800 border border-pink-300";
    case "Primaire":
      return "bg-amber-100 text-amber-800 border border-amber-300";
    case "Collège 1er Cycle":
      return "bg-sky-100 text-sky-800 border border-sky-300";
    case "Collège 2nd Cycle":
      return "bg-indigo-100 text-indigo-800 border border-indigo-300";
    default:
      return "bg-slate-100 text-slate-800";
  }
};

export const getPaiementCollegeTotal = (niveauOrClasse: string): number => {
  const str = (niveauOrClasse || "").toLowerCase().trim();
  if (str.includes("tle") || str.includes("term") || str.includes("terminale")) {
    return 25000;
  }
  if (
    str.includes("2nd") ||
    str.includes("2e") ||
    str.includes("seconde") ||
    str.includes("1ere") ||
    str.includes("1ère") ||
    str.includes("1er") ||
    str.includes("1e") ||
    str.includes("premiere") ||
    str.includes("première")
  ) {
    return 20000;
  }
  if (str.includes("3")) {
    return 25000;
  }
  if (
    str.includes("5eme b") || str.includes("5ème b") ||
    str.includes("5eme c") || str.includes("5ème c") ||
    str.includes("5eme d") || str.includes("5ème d") ||
    str.includes("4eme b") || str.includes("4ème b") ||
    str.includes("4eme c") || str.includes("4ème c") ||
    str.includes("4eme d") || str.includes("4ème d")
  ) {
    return 27000;
  }
  return 20000;
};

export const getPaiementPrimaireTotal = (
  niveauOrClasse: string,
  typeInscription: string = "inscription",
): number => {
  const str = (niveauOrClasse || "").toLowerCase();
  if (str.includes("cm2")) {
    return 32000;
  }
  if (typeInscription === "reinscription" || typeInscription === "ancien") {
    return 28500;
  }
  return 29500;
};

export default function InscriptionProcess() {
  const { toast } = useToast();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraNativeInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCycle, setFilterCycle] = useState<string>("all");
  const [dossier, setDossier] = useState<DossierInscription | null>(null);
  const [activeTab, setActiveTab] = useState("phase1");
  const [saving, setSaving] = useState(false);
  const [inscritsRecents, setInscritsRecents] = useState<DossierInscription[]>(
    [],
  );

  // Inventory Stock for kits
  const [stockKits, setStockKits] = useState({
    ramesPapier: 142,
    papiersHygieniques: 310,
    marqueursTableau: 88,
  });

  // Dialog print official validation sheet modal & Billet d'entrée modal
  const [openFicheModal, setOpenFicheModal] = useState(false);
  const [openBilletModal, setOpenBilletModal] = useState(false);

  // Dialog quick create candidate modal
  const [openNewCandidateModal, setOpenNewCandidateModal] = useState(false);
  const [newPrenom, setNewPrenom] = useState("");
  const [newNom, setNewNom] = useState("");
  const [newDateNaissance, setNewDateNaissance] = useState("2014-06-15");
  const [newGenre, setNewGenre] = useState("M");
  const [newClasseId, setNewClasseId] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newQualiteEleve, setNewQualiteEleve] = useState<
    "Non Redoublant(e)" | "Redoublant(e)"
  >("Non Redoublant(e)");
  const [newStatutOrientation, setNewStatutOrientation] =
    useState<string>("Affecté par l'État");
  const [newPriseEnCharge, setNewPriseEnCharge] = useState<boolean>(false);
  const [newOriginePriseEnCharge, setNewOriginePriseEnCharge] =
    useState<string>("");
  const [creatingCandidate, setCreatingCandidate] = useState(false);

  // Impayés popup state
  const [impayesModal, setImpayesModal] = useState<{
    open: boolean;
    data: any | null;
    loading: boolean;
  }>({ open: false, data: null, loading: false });

  // Camera Live Modal state
  const [openCameraModal, setOpenCameraModal] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);

  const loadData = async () => {
    if (students.length == 0) {
      setLoading(true);
    } else setRefreshing(true);
    try {
      const [s, c] = await Promise.all([
        apiClient.getStudents(),
        apiClient.getClasses(),
      ]);
      setStudents(s || []);
      setClasses(c || []);
    } catch {
      setStudents([]);
      setClasses([]);
    } finally {
      setLoading(false);
      if (students.length != 0 || refreshing) setRefreshing(false);
    }
  };

  const [searchParams] = useSearchParams();
  const targetStudentId =
    searchParams.get("studentId") || searchParams.get("id");

  useEffect(() => {
    loadData();
    const handleFocus = () => {
      loadData();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  useEffect(() => {
    if (targetStudentId && students.length > 0) {
      const target = students.find(
        (s: any) => String(s.id) === String(targetStudentId),
      );
      if (target) {
        handleSelectEleve(target);
      }
    }
  }, [targetStudentId, students]);

  // Dynamic fee items based on cycle, statut orientation, prise en charge, qualité
  const getFeeItems = (
    d: DossierInscription,
  ): {
    key: string;
    label: string;
    amount: number;
    checked: boolean;
    feeKey: keyof DossierInscription;
  }[] => {
    const cycle = d.cycle;
    const isCollege = cycle.includes("Collège");
    const isPrimaireMaternelle = cycle === "Primaire" || cycle === "Maternelle";
    const isAffecte =
      d.statutOrientation === "Affecté par l'État" ||
      d.statutOrientation === "Réaffecté";
    const isNonAffecte = d.statutOrientation === "Non Affecté (Payant)";
    const isPrisEnCharge = d.priseEnCharge;
    const isRedoublant = d.qualiteEleve === "Redoublant(e)";

    const items: {
      key: string;
      label: string;
      amount: number;
      checked: boolean;
      feeKey: keyof DossierInscription;
    }[] = [];

    // FRAIS D'INSCRIPTION EN LIGNE — Commun à tous
    // items.push({
    //   key: "inscription",
    //   label: "Frais d'inscription en ligne",
    //   amount: 3000,
    //   checked: d.payFraisInscription,
    //   feeKey: "payFraisInscription",
    // });

    if (isCollege) {
      // COLLÈGE : paiements spécifiques
      items.push({
        key: "carte",
        label: "Carte d'accès",
        amount: 5000,
        checked: d.payCarteEtCarnet,
        feeKey: "payCarteEtCarnet",
      });
      // items.push({
      //   key: "ape",
      //   label: "Cotisation APE",
      //   amount: 3000,
      //   checked: d.payApeVieScolaire,
      //   feeKey: "payApeVieScolaire",
      // });
      // items.push({
      //   key: "adhesion_ape",
      //   label: "Droit d'adhésion APE",
      //   amount: 6000,
      //   checked: d.payAdhesionApe,
      //   feeKey: "payAdhesionApe",
      // });
      items.push({
        key: "tenue",
        label: "Tenue EPS Officielle",
        amount: 5000,
        checked: d.payTenueEpsPolo,
        feeKey: "payTenueEpsPolo",
      });

      // Versement scolarité adapté selon le niveau
      const montantScolarite = getPaiementCollegeTotal(d.niveau);
      if (isAffecte) {
        // Affecté par l'État : versement scolarité réduit (seulement frais annexes + acompte)
        items.push({
          key: "scolarite",
          label: `Acompte Scolarité (Affecté — ${d.niveau})`,
          amount: montantScolarite,
          checked: d.payVersementScolarite,
          feeKey: "payVersementScolarite",
        });
      } else if (isNonAffecte) {
        // Non Affecté : scolarité complète
        items.push({
          key: "scolarite",
          label: `1er Versement Scolarité (Non Affecté — ${d.niveau})`,
          amount: montantScolarite + 30000,
          checked: d.payVersementScolarite,
          feeKey: "payVersementScolarite",
        });
      } else {
        items.push({
          key: "scolarite",
          label: `Acompte Scolarité (${d.statutOrientation} — ${d.niveau})`,
          amount: montantScolarite,
          checked: d.payVersementScolarite,
          feeKey: "payVersementScolarite",
        });
      }
    } else if (isPrimaireMaternelle) {
      // PRIMAIRE / MATERNELLE : paiements spécifiques
      items.push({
        key: "carte",
        label: "Carte d'accès",
        amount: 5000,
        checked: d.payCarteEtCarnet,
        feeKey: "payCarteEtCarnet",
      });
      // items.push({
      //   key: "ape",
      //   label: "Cotisation APE",
      //   amount: 3000,
      //   checked: d.payApeVieScolaire,
      //   feeKey: "payApeVieScolaire",
      // });
      // items.push({
      //   key: "adhesion_ape",
      //   label: "Droit d'adhésion APE",
      //   amount: 6000,
      //   checked: d.payAdhesionApe,
      //   feeKey: "payAdhesionApe",
      // });
      items.push({
        key: "tenue",
        label: "Tenue EPS Officielle",
        amount: 5000,
        checked: d.payTenueEpsPolo,
        feeKey: "payTenueEpsPolo",
      });

      const montantPrimaire = getPaiementPrimaireTotal(
        d.niveau,
        isRedoublant ? "reinscription" : d.typeInscription,
      );
      if (isRedoublant) {
        items.push({
          key: "scolarite",
          label: `Scolarité Ancien Élève / Redoublant(e) — ${d.niveau}`,
          amount: montantPrimaire,
          checked: d.payVersementScolarite,
          feeKey: "payVersementScolarite",
        });
      } else {
        items.push({
          key: "scolarite",
          label: `Scolarité ${d.typeInscription === "reinscription" ? "Ancien" : "Nouveau"} — ${d.niveau}`,
          amount: montantPrimaire,
          checked: d.payVersementScolarite,
          feeKey: "payVersementScolarite",
        });
      }
    }

    // Éléments spécifiques complémentaires :
    items.push({
      key: "vie_scolaire",
      label: "Cotisation Vie Scolaire",
      amount: 500,
      checked: Boolean(d.payFraisVieScolaire ?? true),
      feeKey: "payFraisVieScolaire" as any,
    });
    items.push({
      key: "tshirt_polo",
      label: "T-shirt Polo Officiel",
      amount: 5000,
      checked: Boolean(d.payTshirtPolo ?? true),
      feeKey: "payTshirtPolo" as any,
    });
    items.push({
      key: "bandeau",
      label: "Bandeau Hînneh",
      amount: 500,
      checked: Boolean(d.payBandeau ?? true),
      feeKey: "payBandeau" as any,
    });
    items.push({
      key: "photo",
      label: "Photo Numérique d'Identité",
      amount: 1000,
      checked: Boolean(d.payPhotoIdentite ?? true),
      feeKey: "payPhotoIdentite" as any,
    });

    // Droit / Frais d'Examen Officiel — Uniquement pour les classes à examen (CM2, 3ème, Terminale)
    const nLow = (d.niveau || "").toLowerCase();
    const isExamenClass =
      nLow.includes("cm2") ||
      nLow.includes("3") ||
      nLow.includes("tle") ||
      nLow.includes("term");
    if (isExamenClass) {
      items.push({
        key: "examen",
        label: `Droit & Frais d'Examen Officiel (${d.niveau})`,
        amount: 5000,
        checked: Boolean(d.payFraisExamen ?? true),
        feeKey: "payFraisExamen" as any,
      });
    }

    // Test de Diagnostic 6ème — 2000 F
    if (nLow.includes("6")) {
      items.push({
        key: "test_diagnostic",
        label: "Test de diagnostic 6ème",
        amount: 2000,
        checked: Boolean(d.payTestDiagnostic ?? true),
        feeKey: "payTestDiagnostic" as any,
      });
    }

    // Services facultatifs — tous cycles
    items.push({
      key: "cantine",
      label: "Service Cantine Mensuelle",
      amount: 15000,
      checked: d.payServiceCantine,
      feeKey: "payServiceCantine",
    });
    items.push({
      key: "transport",
      label: "Service Transport Scolaire",
      amount: 20000,
      checked: d.payServiceTransport,
      feeKey: "payServiceTransport",
    });

    return items;
  };

  // Structured evaluation of payment schedule (Échéancier) based on AFF vs NAFF status
  const getEcheancierEvaluated = (d: DossierInscription) => {
    const isAffecte =
      d.statutOrientation === "Affecté par l'État" ||
      d.statutOrientation === "Réaffecté" ||
      d.statutOrientation === "AFF";
    console.log(isAffecte);
    const cycle = d.cycle;
    const isCollege = cycle.includes("Collège");
    const isLycee =
      cycle.includes("Collège 2nd cycle") || cycle.includes("2nd");

    if (isAffecte) {
      return {
        statut: "AFF",
        label: "Échéancier Officiel Écoles Confessionnelles (Affecté - AFF)",
        description:
          "Tarif subventionné par l'État — Échéances adaptées aux frais annexes & acompte scolarité.",
        presetId: isCollege
          ? "reinscription_6eme_hinneh"
          : "lycee_affectes_2nde",
        tranches: [
          {
            libelle: "1er vers. (Acompte Inscription 05 Sept.)",
            montant: 30000,
            date: "05/09/2026",
          },
          {
            libelle: "2ème vers. (05 Oct.)",
            montant: 15000,
            date: "05/10/2026",
          },
          {
            libelle: "3ème vers. - Solde (05 Nov.)",
            montant: 15000,
            date: "05/11/2026",
          },
        ],
      };
    } else {
      // NAFF (Non-Affecté / Payant)
      const baseTotal = isCollege ? 150000 : isLycee ? 220000 : 180000;
      return {
        statut: "NAFF",
        label: "Échéancier Officiel Privé (Non-Affecté - NAFF)",
        description:
          "Tarif scolarité complète privée — Échéances réparties sur l'année scolaire.",
        presetId: isCollege ? "reinscription_5eme_c_d" : "lycee_naf_2nde",
        tranches: [
          {
            libelle: "1er vers. (05 Sept.)",
            montant: Math.round(baseTotal * 0.4),
            date: "05/09/2026",
          },
          {
            libelle: "2ème vers. (05 Oct.)",
            montant: Math.round(baseTotal * 0.25),
            date: "05/10/2026",
          },
          {
            libelle: "3ème vers. (05 Nov.)",
            montant: Math.round(baseTotal * 0.2),
            date: "05/11/2026",
          },
          {
            libelle: "4ème vers. - Solde (05 Déc.)",
            montant: Math.round(baseTotal * 0.15),
            date: "05/12/2026",
          },
        ],
      };
    }
  };

  // Calculate total payment dynamically based on checked fee items
  const calculateTotalPayment = (d: DossierInscription): number => {
    const items = getFeeItems(d);
    let total = 0;
    for (const item of items) {
      if (item.checked) total += item.amount;
    }
    // Si prise en charge, réduction de 100% sur la scolarité (hors frais annexes)
    if (d.priseEnCharge) {
      const scolariteItem = items.find((i) => i.key === "scolarite");
      if (scolariteItem && scolariteItem.checked) {
        total -= scolariteItem.amount;
      }
    }
    return total;
  };

  const handleToggleFeeComponent = (key: keyof DossierInscription) => {
    if (!dossier) return;
    const updated = {
      ...dossier,
      [key]: !dossier[key],
    };
    const newTotal = calculateTotalPayment(updated);
    setDossier({
      ...updated,
      montantVersement: newTotal,
    });
  };

  // Fonction de sauvegarde en lot des données du dossier d'inscription
  const saveDossierData = async (
    dossierToSave: DossierInscription,
  ): Promise<boolean> => {
    try {
      setSaving(true);

      // Mapper les données du dossier vers l'API
      const payload = {
        type_inscription: dossierToSave.typeInscription,
        qualiteEleve: dossierToSave.qualiteEleve,
        statutOrientation: dossierToSave.statutOrientation,
        priseEnCharge: dossierToSave.priseEnCharge,
        originePriseEnCharge: dossierToSave.originePriseEnCharge,
        serviceTransport: dossierToSave.serviceTransport,
        serviceCantine: dossierToSave.serviceCantine,

        // Validation des étapes
        step_1_validated: dossierToSave.validatedSteps.includes(1),
        step_2_validated: dossierToSave.validatedSteps.includes(2),
        step_3_validated: dossierToSave.validatedSteps.includes(3),
        step_4_validated: dossierToSave.validatedSteps.includes(4),
        step_5_validated: dossierToSave.validatedSteps.includes(5),
        step_6_validated: dossierToSave.validatedSteps.includes(6),
        step_7_validated: dossierToSave.validatedSteps.includes(7),
        step_8_validated: dossierToSave.validatedSteps.includes(8),
        step_9_validated: dossierToSave.validatedSteps.includes(9),
        step_10_validated: dossierToSave.validatedSteps.includes(10),
        step_11_validated: dossierToSave.validatedSteps.includes(11),

        // Étape 2
        tenueValidee: dossierToSave.tenueValidee,

        // Étape 3
        kitDepose: dossierToSave.kitDepose,
        kitRamePapier: dossierToSave.kitRamePapier,
        kitPapierHygienique: dossierToSave.kitPapierHygienique,
        kitMarqueursTableau: dossierToSave.kitMarqueursTableau,

        // Étape 4 - Santé
        groupeSanguin: dossierToSave.groupeSanguin,
        rhesus: dossierToSave.rhesus,
        allergiesAlimentaires: dossierToSave.allergiesAlimentaires,
        allergiesMedicamenteuses: dossierToSave.allergiesMedicamenteuses,
        etatVaccinal: dossierToSave.etatVaccinal,
        hasAsthme: dossierToSave.hasAsthme,
        asthmeTraitement: dossierToSave.asthmeTraitement,
        hasDrepanocytose: dossierToSave.hasDrepanocytose,
        drepanocytoseTraitement: dossierToSave.drepanocytoseTraitement,
        hasEpilepsie: dossierToSave.hasEpilepsie,
        epilepsieTraitement: dossierToSave.epilepsieTraitement,
        handicapPrecision: dossierToSave.handicapPrecision,
        autresPathologies: dossierToSave.autresPathologies,
        autresTraitement: dossierToSave.autresTraitement,
        dispenseSportive: dossierToSave.dispenseSportive,
        dispensePrecision: dossierToSave.dispensePrecision,
        medecin1Contact: dossierToSave.medecin1Contact,
        medecin2Contact: dossierToSave.medecin2Contact,
        nomAssurance: dossierToSave.nomAssurance,

        // Étape 5
        dataSaisieLogiciel: true, // Données saisies quand on sauvegarde

        // Étape 7
        montantVersement: dossierToSave.montantVersement,
        modeReglement: dossierToSave.modeReglement,
        numeroTransaction: dossierToSave.numeroTransaction,

        // Étape 8
        ficheImprimee: dossierToSave.ficheImprimee,

        // Étape 9
        effetsRemis: dossierToSave.effetsRemis,

        // Étape 10
        billetRetire: dossierToSave.billetRetire,
        billetNumber: dossierToSave.billetNumber,

        // Étape 11
        dossierArchive: dossierToSave.dossierArchive,

        // Autres
        photoUrl: dossierToSave.photoUrl,
        classeId: dossierToSave.classeId,
        parentTel: dossierToSave.parentTel,
        parentNom: dossierToSave.parentNom,
      };

      await apiClient.patch(
        `/api/students/${dossierToSave.eleveId}/inscription-dossier`,
        payload,
      );

      setSaving(false);
      return true;
    } catch (err: any) {
      console.error("Erreur sauvegarde dossier:", err);
      toast({
        variant: "destructive",
        title: "Erreur de sauvegarde",
        description:
          err.response?.data?.detail || "Impossible de sauvegarder les données",
      });
      setSaving(false);
      return false;
    }
  };

  // Step-by-Step Save & Validate per Service Desk
  const handleValidateStep = async (stepNumber: number) => {
    if (!dossier) return;
    const stepInfo = OFFICIAL_STEPS.find((s) => s.id === stepNumber);
    if (!stepInfo) return;

    const isAlreadyValidated = dossier.validatedSteps.includes(stepNumber);
    let updatedValidated: number[];

    if (isAlreadyValidated) {
      updatedValidated = dossier.validatedSteps.filter(
        (id) => id !== stepNumber,
      );
    } else {
      updatedValidated = [...dossier.validatedSteps, stepNumber];
    }

    const nextStepId = Math.min(11, stepNumber + 1);
    const nextStepInfo = OFFICIAL_STEPS.find((s) => s.id === nextStepId);

    const currentTime = new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const updatedDossier: DossierInscription = {
      ...dossier,
      validatedSteps: updatedValidated,
      currentStep: isAlreadyValidated ? stepNumber : nextStepId,
      stepValidationTimes: {
        ...dossier.stepValidationTimes,
        [stepNumber]: currentTime,
      },
    };

    // Sauvegarder les données en BD AVANT de mettre à jour l'UI
    const saveSuccess = await saveDossierData(updatedDossier);
    if (!saveSuccess) {
      return; // Ne pas continuer si la sauvegarde a échoué
    }

    // Mettre à jour l'état local APRÈS sauvegarde réussie
    setDossier(updatedDossier);

    // Apply official payment schedule (Échéancier) for student by Classe / Niveau & AFF/NAFF on Step 7
    if (stepNumber === 7 && dossier.eleveId) {
      const ech = getEcheancierEvaluated(dossier);
      const numId = parseInt(dossier.eleveId);
      if (!isNaN(numId) && ech.presetId) {
        apiClient
          .applyHinnehPreset({
            preset_id: ech.presetId,
            eleve_id: numId,
            niveau: dossier.niveau,
          })
          .catch(() => {});
      }
    }

    if (!isAlreadyValidated) {
      toast({
        title: `✅ Étape ${stepNumber} Enregistrée ! (${stepInfo.service})`,
        description:
          nextStepInfo && stepNumber < 11
            ? `Élève dirigé vers le guichet ${nextStepInfo.service} (Étape ${nextStepId}).`
            : `Toutes les étapes d'inscription ont été validées avec succès !`,
      });

      if (nextStepInfo && stepNumber < 11) {
        setActiveTab(nextStepInfo.phase);
      }
    } else {
      toast({
        title: `ℹ️ Étape ${stepNumber} Réinitialisée`,
        description: `Le statut de validation de l'étape ${stepNumber} a été mis à jour.`,
      });
    }
  };

  // Toggle Kit Checkbox & Increment Stock
  const handleToggleKitSupply = (
    kitKey: "kitRamePapier" | "kitPapierHygienique" | "kitMarqueursTableau",
  ) => {
    if (!dossier) return;
    const isChecked = !dossier[kitKey];

    const nextRame =
      kitKey === "kitRamePapier" ? isChecked : dossier.kitRamePapier;
    const nextHyg =
      kitKey === "kitPapierHygienique"
        ? isChecked
        : dossier.kitPapierHygienique;
    const nextMarq =
      kitKey === "kitMarqueursTableau"
        ? isChecked
        : dossier.kitMarqueursTableau;

    setDossier({
      ...dossier,
      [kitKey]: isChecked,
      kitDepose: nextRame || nextHyg || nextMarq,
    });

    const stockMap = {
      kitRamePapier: {
        key: "ramesPapier" as const,
        label: "Rame de papier A4",
      },
      kitPapierHygienique: {
        key: "papiersHygieniques" as const,
        label: "Paquet Papier Hygiénique",
      },
      kitMarqueursTableau: {
        key: "marqueursTableau" as const,
        label: "Boîte de Marqueurs Tableau",
      },
    };

    const item = stockMap[kitKey];
    if (isChecked) {
      setStockKits((prev) => {
        const newVal = prev[item.key] + 1;
        toast({
          title: "📦 Stock Incrémenté !",
          description: `+1 ${item.label} ajouté à l'inventaire general. Nouveau Stock : ${newVal}.`,
        });
        return { ...prev, [item.key]: newVal };
      });
    } else {
      setStockKits((prev) => ({
        ...prev,
        [item.key]: Math.max(0, prev[item.key] - 1),
      }));
    }
  };

  // Isolated 1-Page Iframe Printing Engine
  const triggerDirectPrint = () => {
    const isBillet = openBilletModal;
    const targetId = isBillet ? "printable-billet" : "printable-fiche";
    const elementToPrint = document.getElementById(targetId);

    if (!elementToPrint) {
      window.print();
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${isBillet ? "Billet d'Entrée - Hînneh" : "Fiche de Validation - Hînneh"}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @page {
                size: A4 portrait;
                margin: 8mm;
              }
              body {
                margin: 0;
                padding: 10px;
                background: #ffffff;
                color: #0f172a;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print-wrapper {
                width: 100%;
                max-width: ${isBillet ? "540px" : "760px"};
                margin: 0 auto;
              }
            </style>
          </head>
          <body>
            <div class="print-wrapper">
              ${elementToPrint.outerHTML}
            </div>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1200);
      }, 400);
    }
  };

  // Handle camera stream
  useEffect(() => {
    if (openCameraModal) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [openCameraModal, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setCameraLoading(true);
    try {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false,
        });
      } catch (errConstraints) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      setMediaStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera getUserMedia error:", err);
      let errMsg = "Impossible d'accéder à la caméra.";

      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        errMsg =
          "Permission refusée. Vérifiez 'Paramètres Windows > Confidentialité > Caméra' et autorisez les applications de bureau à accéder à la caméra.";
      } else if (
        err.name === "NotReadableError" ||
        err.name === "TrackStartError"
      ) {
        errMsg =
          "La webcam est déjà utilisée par une autre application (Zoom, Teams, Skype ou WhatsApp). Veuillez la fermer puis réessayer.";
      } else if (
        err.name === "NotFoundError" ||
        err.name === "DevicesNotFoundError"
      ) {
        errMsg =
          "Aucune webcam détectée sur cet ordinateur. Veuillez brancher une caméra ou importer une photo par fichier.";
      } else {
        errMsg = `Erreur Caméra (${err.name || "Inconnue"}) : ${err.message || "Accès refusé"}`;
      }

      toast({
        variant: "destructive",
        title: `Caméra Indisponible (${err.name || "Erreur"})`,
        description: errMsg,
      });
      setOpenCameraModal(false);
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
  };

  const capturePhotoFromCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 640;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      if (dossier) {
        setDossier({ ...dossier, photoUrl: dataUrl });
        toast({
          title: "📸 Photo capturée !",
          description: "La photo d'identité a été enregistrée.",
        });
      }
    }
    setOpenCameraModal(false);
  };

  const preinscritsFiltres = students.filter((s: any) => {
    const hasSearchQuery = search.trim().length > 0;

    // Filter by cycle tab only if no search text is active
    if (!hasSearchQuery && filterCycle !== "all") {
      const niveau = s.className || s.classLevel || s.level || "";
      const studentCycle = getCycleFromNiveau(niveau);
      if (studentCycle !== filterCycle) return false;
    }

    if (!hasSearchQuery) return true;
    return matchStudentSearch(s, search);
  });

  const checkImpayesAndSelect = async (s: any) => {
    // Vérifier les impayés avant de procéder à l'inscription
    setImpayesModal({ open: true, data: null, loading: true });
    try {
      const summary = await apiClient.getStudentEcheancierSummary(s.id);
      // const soldeRestant = summary?.summary?.solde_restant ?? 0;
      const echeancesImpayees = (summary?.echeances || []).filter((e: any) => {
        const current_year_scolaire = "2026-2027";
        if (e?.annee_scolaire) {
          if (
            Number(current_year_scolaire.split("-").join("")) >
            Number(
              (e?.annee_scolaire ?? current_year_scolaire).split("-").join(""),
            )
          ) {
            return Number(e.montant_paye || 0) < Number(e.montant_prevu || 0);
          } else return false;
        } else return false;
      });

      const total_prevu = echeancesImpayees.reduce(
        (sum: any, e: any) => sum.plus(new Decimal(e.montant_prevu || 0)),
        new Decimal(0),
      );

      const total_paye = echeancesImpayees.reduce(
        (sum: any, e: any) => sum.plus(new Decimal(e.montant_paye || 0)),
        new Decimal(0),
      );

      const soldeRestant = total_prevu.minus(total_paye);

      const nb_en_retard = echeancesImpayees.filter(
        (e: any) => e.statut === "en_retard",
      ).length;

      if (soldeRestant > 0 || echeancesImpayees.length > 0) {
        setImpayesModal({
          open: true,
          data: {
            eleve: summary?.eleve || {
              nom: s.lastName || s.nom,
              prenom: s.firstName || s.prenom,
              matricule: s.matricule,
            },
            solde_restant: soldeRestant,
            // total_prevu: summary?.summary?.total_prevu || 0,
            // total_paye: summary?.summary?.total_paye || 0,
            total_prevu: total_prevu || 0,
            total_paye: total_paye || 0,
            echeances: echeancesImpayees,
          },
          loading: false,
        });
        return; // Bloquer la sélection tant que la popup est ouverte
      }
    } catch (err) {
      // Si la vérification échoue, on continue quand même
      console.warn("Vérification impayés échouée:", err);
    }
    setImpayesModal({ open: false, data: null, loading: false });
    handleSelectEleve(s);
  };

  const handleSelectEleve = (s: any) => {
    // 🔍 DEBUG: Afficher les données reçues
    // console.log("🔍 Données reçues pour élève:", s.id);
    // console.log(
    //   "   Keys contenant 'step':",
    //   Object.keys(s).filter((k) => k.includes("step")),
    // );
    // console.log("   Données d'étapes:", {
    //   step_1_validated: s.step_1_validated,
    //   step_2_validated: s.step_2_validated,
    //   step_3_validated: s.step_3_validated,
    //   step_4_validated: s.step_4_validated,
    //   step_5_validated: s.step_5_validated,
    // });

    // 1. Resolve Class & Level automatically from pre-inscription data
    const clsObj = classes.find(
      (c: any) =>
        String(c.id) === String(s.classe_id || s.classId) ||
        (c.CE_LIBELLE &&
          c.CE_LIBELLE.toUpperCase() ===
            (
              s.className ||
              s.classLevel ||
              s.level ||
              s.niveau ||
              s.AU_CLASSEPRECEDENTE ||
              ""
            ).toUpperCase()) ||
        (c.name &&
          c.name.toUpperCase() ===
            (
              s.className ||
              s.classLevel ||
              s.level ||
              s.niveau ||
              s.AU_CLASSEPRECEDENTE ||
              ""
            ).toUpperCase()),
    );

    const clsFromId = clsObj?.CE_LIBELLE || clsObj?.name || null;
    const niveau =
      s.className ||
      s.classLevel ||
      s.level ||
      s.niveau ||
      s.AU_CLASSEPRECEDENTE ||
      clsFromId ||
      "6ème";
    const cycle = getCycleFromNiveau(niveau);
    const resolvedClasseId = clsObj
      ? String(clsObj.id)
      : String(s.classe_id || s.classId || "");

    // 2. Resolve Qualité Élève automatically from pre-inscription data
    let qualite: "Redoublant(e)" | "Non Redoublant(e)" = "Non Redoublant(e)";
    if (
      s.qualite_eleve === "Redoublant(e)" ||
      s.qualiteEleve === "Redoublant(e)" ||
      s.redoublant === "OUI" ||
      s.REDOUBLANT === "OUI" ||
      s.REDOUBLANT === true
    ) {
      qualite = "Redoublant(e)";
    } else if (
      s.qualite_eleve === "Non Redoublant(e)" ||
      s.qualiteEleve === "Non Redoublant(e)"
    ) {
      qualite = "Non Redoublant(e)";
    }

    // 3. Resolve Statut Orientation automatically from pre-inscription data
    let statutOri =
      s.statut_orientation ||
      s.statutOrientation ||
      s.statutAffecte ||
      s.AU_STATUT ||
      "";
    if (!statutOri) {
      if (s.AU_TOP_AFFECTE === 1 || s.AU_TOP_AFFECTE === "1") {
        statutOri = "Affecté par l'État";
      } else if (s.AU_TOP_AFFECTE === 0 || s.AU_TOP_AFFECTE === "0") {
        statutOri = "Non Affecté (Payant)";
      } else {
        statutOri = cycle.includes("Collège")
          ? "Affecté par l'État"
          : "Non Affecté (Payant)";
      }
    }

    // 4. Resolve Prise en charge automatically from pre-inscription data
    const priseEnCharge = Boolean(
      s.prise_en_charge ?? s.priseEnCharge ?? s.ETAT_BOURSE ?? false,
    );
    const originePriseEnCharge =
      s.origine_prise_en_charge || s.originePriseEnCharge || "";

    // Parse health data from notes_sante JSON
    let parsedHealth: any = {};
    if (s.notes_sante || s.notesSante || s.healthNotes) {
      try {
        const raw = s.notes_sante || s.notesSante || s.healthNotes;
        parsedHealth = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch (e) {}
    }

    // ✅ CHARGER SANS INFÉRENCE - utiliser uniquement les vraies valeurs de la BD
    // Pas de présomptions basées sur matricule, photo, etc.
    const validatedSteps: number[] = [];

    // Charger les étapes validées depuis la BD (pas d'inférence)
    if (Boolean(s.step_1_validated)) validatedSteps.push(1);
    if (Boolean(s.step_2_validated)) validatedSteps.push(2);
    if (Boolean(s.step_3_validated)) validatedSteps.push(3);
    if (Boolean(s.step_4_validated)) validatedSteps.push(4);
    if (Boolean(s.step_5_validated)) validatedSteps.push(5);
    if (Boolean(s.step_6_validated)) validatedSteps.push(6);
    if (Boolean(s.step_7_validated)) validatedSteps.push(7);
    if (Boolean(s.step_8_validated)) validatedSteps.push(8);
    if (Boolean(s.step_9_validated)) validatedSteps.push(9);
    if (Boolean(s.step_10_validated)) validatedSteps.push(10);
    if (Boolean(s.step_11_validated)) validatedSteps.push(11);

    // 🔍 DEBUG: Logger les étapes chargées depuis la BD
    // console.log(`✅ Élève ${s.id} chargé - Étapes validées:`, validatedSteps);

    // Si AUCUNE étape n'est validée, on commence à l'étape 1 (par défaut)
    const finalValidatedSteps = validatedSteps.length > 0 ? validatedSteps : [];
    const nextStep =
      finalValidatedSteps.length > 0
        ? Math.min(11, Math.max(...finalValidatedSteps) + 1)
        : 1; // Commencer à l'étape 1 si aucune étape n'a été validée

    // Ne pas tracker les heures de validation ici (c'est en BD maintenant)
    const stepTimes: Record<number, string> = {};

    // ✅ CHARGER LES VRAIES VALEURS DEPUIS LA BD (PAS D'INFÉRENCE)
    const initialDossier: DossierInscription = {
      eleveId: String(s.id),
      eleveNom: s.lastName || s.nom || "",
      elevePrenom: s.firstName || s.prenom || "",
      dateNaissance:
        s.dateOfBirth instanceof Date
          ? s.dateOfBirth.toISOString().split("T")[0]
          : typeof s.dateOfBirth === "string"
            ? s.dateOfBirth
            : s.date_naissance || "",
      gender: s.gender || s.genre || "M",
      niveau,
      cycle,
      // ✅ Charger depuis BD, pas d'inférence
      typeInscription: s.type_inscription || s.typeInscription || "inscription",
      serviceTransport: Boolean(
        s.service_transport ?? s.serviceTransport ?? false,
      ),
      serviceCantine: Boolean(s.service_cantine ?? s.serviceCantine ?? false),
      parentNom: s.AU_PERENOMPRENOMS || s.parentName || "",
      parentTel: s.AU_CONTACTS || s.parentPhone || "",

      // ✅ Charger depuis BD les champs d'inscription
      qualiteEleve: s.qualite_eleve || qualite,
      statutOrientation: s.statut_orientation || statutOri,
      priseEnCharge: Boolean(s.prise_en_charge ?? priseEnCharge ?? false),
      originePriseEnCharge:
        s.origine_prise_en_charge || originePriseEnCharge || "",

      currentTab: "phase1",
      // ✅ Charger depuis BD (PAS de présomption)
      kitDepose: Boolean(s.kit_depose ?? false),
      kitRamePapier: Boolean(s.kit_rame_papier ?? false),
      kitPapierHygienique: Boolean(s.kit_papier_hygienique ?? false),
      kitMarqueursTableau: Boolean(s.kit_marqueurs_tableau ?? false),

      // ✅ Charger depuis BD
      tenueValidee: Boolean(s.tenue_validee ?? false),
      ficheSanteRemplie: Boolean(
        s.notes_sante || s.notesSante || s.healthNotes,
      ),
      photoUrl: s.photo || "",
      classeId: resolvedClasseId,
      classeNom: clsFromId || s.className || niveau || "",

      validatedSteps: finalValidatedSteps,
      currentStep: nextStep,
      stepValidationTimes: stepTimes,

      payFraisInscription: true,
      payCarteEtCarnet: true,
      payApeVieScolaire: true,
      payAdhesionApe: true,
      payTenueEpsPolo: true,
      payAssuranceScolaire: true,
      payFraisExamen: true,
      payTestDiagnostic: true,
      payCarnetVraiScolaire: true,
      payFraisVieScolaire: true,
      payTshirtPolo: true,
      payBandeau: true,
      payPhotoIdentite: true,
      payServiceCantine: false,
      payServiceTransport: false,
      payVersementScolarite: true,

      // ✅ Charger depuis BD
      montantVersement: parseFloat(s.montant_versement || "0"),
      modeReglement: s.mode_reglement || "especes",
      numeroTransaction: s.numero_transaction || "",
      ficheImprimee: Boolean(s.fiche_imprimee ?? false),
      effetsRemis: Boolean(s.effets_remis ?? false),
      billetRetire: Boolean(s.billet_retire ?? false),
      matricule: s.matricule || "",
      billetNumber:
        s.billet_number || `BIL-${Date.now().toString(36).toUpperCase()}`,

      // ✅ Charger depuis BD - Fiche de Santé
      groupeSanguin: s.groupe_sanguin || parsedHealth.groupeSanguin || "A+",
      rhesus: s.rhesus || parsedHealth.rhesus || "+",
      allergiesAlimentaires:
        s.allergies_alimentaires || parsedHealth.allergiesAlimentaires || "",
      allergiesMedicamenteuses:
        s.allergies_medicamenteuses ||
        parsedHealth.allergiesMedicamenteuses ||
        "",
      etatVaccinal: s.etat_vaccinal || parsedHealth.etatVaccinal || "À jour",
      hasAsthme: Boolean(s.has_asthme ?? parsedHealth.hasAsthme ?? false),
      asthmeTraitement:
        s.asthme_traitement || parsedHealth.asthmeTraitement || "",
      hasDrepanocytose: Boolean(
        s.has_drepanocytose ?? parsedHealth.hasDrepanocytose ?? false,
      ),
      drepanocytoseTraitement:
        s.drepanocytose_traitement ||
        parsedHealth.drepanocytoseTraitement ||
        "",
      hasEpilepsie: Boolean(
        s.has_epilepsie ?? parsedHealth.hasEpilepsie ?? false,
      ),
      epilepsieTraitement:
        s.epilepsie_traitement || parsedHealth.epilepsieTraitement || "",
      hasHandicap: Boolean(s.AU_HANDICAP ?? parsedHealth.hasHandicap ?? false),
      handicapPrecision:
        s.handicap_precision ||
        parsedHealth.handicapPrecision ||
        s.AU_AUTRESHANDICAP ||
        "",
      autresPathologies:
        s.autres_pathologies || parsedHealth.autresPathologies || "",
      autresTraitement:
        s.autres_traitement || parsedHealth.autresTraitement || "",
      dispenseSportive: Boolean(
        s.dispense_sportive ?? parsedHealth.dispenseSportive ?? false,
      ),
      dispensePrecision:
        s.dispense_precision || parsedHealth.dispensePrecision || "",
      medecin1Contact: s.medecin1_contact || parsedHealth.medecin1Contact || "",
      medecin2Contact: s.medecin2_contact || parsedHealth.medecin2Contact || "",
      nomAssurance: s.nom_assurance || parsedHealth.nomAssurance || "",
    };

    // Calculate initial montant based on all dossier fields (cycle, statut, prise en charge)
    initialDossier.montantVersement = calculateTotalPayment(initialDossier);

    setDossier(initialDossier);
    setActiveTab("phase1");

    // ✅ CONFIRMATION : Afficher un toast si des étapes ont été restaurées depuis la BD
    if (finalValidatedSteps.length > 0) {
      const stepNames = [
        "Renseignements",
        "Tenues",
        "Kits",
        "Santé",
        "Logiciel",
        "Photo",
        "Paiement",
        "Impression",
        "Effets",
        "Billet",
        "Archivage",
      ];

      const completedSteps = finalValidatedSteps
        .map((step) => `Étape ${step}: ${stepNames[step - 1]}`)
        .join(" ✓ ");

      toast({
        title: `📋 ${finalValidatedSteps.length} étape(s) restaurée(s)`,
        description: `${completedSteps}. Données synchronisées depuis la base de données.`,
      });
    }
  };

  const handleCreateCandidateSubmit = async () => {
    if (!newPrenom || !newNom) {
      toast({
        variant: "destructive",
        title: "Champs requis",
        description: "Veuillez saisir le prénom et le nom de l'élève.",
      });
      return;
    }

    setCreatingCandidate(true);
    try {
      const res = await apiClient.createStudent({
        matricule: "AUTO",
        prenom: newPrenom,
        nom: newNom,
        date_naissance: newDateNaissance,
        genre: newGenre,
        ecole_id: 1,
        classe_id: newClasseId ? parseInt(newClasseId) : undefined,
        statut: "preinscrit",
        AU_CONTACTS: newPhone || undefined,
        AU_TUTEURLEGALCONTACTS: newPhone || undefined,
        redoublant: newQualiteEleve === "Redoublant(e)" ? "OUI" : "NON",
        statutAffecte: newStatutOrientation,
        priseEnCharge: newPriseEnCharge,
        originePriseEnCharge: newOriginePriseEnCharge || undefined,
      });

      toast({
        title: "Élève créé !",
        description: `Dossier créé pour ${res.prenom} ${res.nom} (${res.matricule}).`,
      });
      setOpenNewCandidateModal(false);
      setNewPrenom("");
      setNewNom("");
      setNewPhone("");

      await loadData();
      handleSelectEleve(res);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: err.response?.data?.detail || "Création impossible.",
      });
    } finally {
      setCreatingCandidate(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setDossier((d) =>
        d ? { ...d, photoUrl: ev.target?.result as string } : d,
      );
    };
    reader.readAsDataURL(file);
  };

  const handleFinalizeRegistration = async () => {
    if (!dossier) return;
    if (!dossier.classeId) {
      toast({
        variant: "destructive",
        title: "Classe requise",
        description: "Veuillez affecter l'élève à sa classe.",
      });
      return;
    }
    setSaving(true);
    try {
      const healthData = {
        groupeSanguin: dossier.groupeSanguin || "A+",
        rhesus: dossier.rhesus || "+",
        allergiesAlimentaires: dossier.allergiesAlimentaires || "",
        allergiesMedicamenteuses: dossier.allergiesMedicamenteuses || "",
        etatVaccinal: dossier.etatVaccinal || "À jour",
        hasAsthme: Boolean(dossier.hasAsthme),
        asthmeTraitement: dossier.asthmeTraitement || "",
        hasDrepanocytose: Boolean(dossier.hasDrepanocytose),
        drepanocytoseTraitement: dossier.drepanocytoseTraitement || "",
        hasEpilepsie: Boolean(dossier.hasEpilepsie),
        epilepsieTraitement: dossier.epilepsieTraitement || "",
        hasHandicap: Boolean(dossier.hasHandicap),
        handicapPrecision: dossier.handicapPrecision || "",
        autresPathologies: dossier.autresPathologies || "",
        autresTraitement: dossier.autresTraitement || "",
        dispenseSportive: Boolean(dossier.dispenseSportive),
        dispensePrecision: dossier.dispensePrecision || "",
        medecin1Contact: dossier.medecin1Contact || "",
        medecin2Contact: dossier.medecin2Contact || "",
        nomAssurance: dossier.nomAssurance || "",
      };

      await apiClient.updateStudent(dossier.eleveId, {
        statut: "actif",
        classe_id: parseInt(dossier.classeId),
        photo: dossier.photoUrl || undefined,
        AU_CONTACTS: dossier.parentTel || undefined,
        redoublant: dossier.qualiteEleve === "Redoublant(e)" ? "OUI" : "NON",
        statutAffecte: dossier.statutOrientation,
        priseEnCharge: dossier.priseEnCharge,
        originePriseEnCharge: dossier.originePriseEnCharge || undefined,
        notes_sante: JSON.stringify(healthData),
      });

      if (dossier.montantVersement > 0) {
        await apiClient.processCaisseEncaissement({
          eleve_id: parseInt(dossier.eleveId),
          motif: "inscription",
          montant: dossier.montantVersement,
          mode: dossier.modeReglement,
          numero_transaction: dossier.numeroTransaction || undefined,
          caissier_nom: "Service Caisse",
          annee_scolaire: "2026-2027",
        });
      }

      const classeObj = classes.find(
        (c: any) => String(c.id) === String(dossier.classeId),
      );
      const classeNom =
        classeObj?.CE_LIBELLE || classeObj?.name || dossier.classeId;
      const completedDossier = {
        ...dossier,
        statut: "inscrit" as const,
        classeNom,
        effetsRemis: true,
        billetRetire: true,
        validatedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        currentStep: 11,
      };

      setDossier(completedDossier);
      setInscritsRecents((prev) => [completedDossier, ...prev.slice(0, 19)]);
      toast({
        title: "✅ Inscription Validée !",
        description: `L'élève ${dossier.elevePrenom} ${dossier.eleveNom} (${dossier.cycle}) est officiellement inscrit en ${classeNom}. Billet d'entrée généré.`,
      });
      setOpenBilletModal(true);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Échec de la validation de l'inscription.",
      });
    } finally {
      setSaving(false);
    }
  };

  const getCycleBadgeColor = (cycle: CycleScolaire) => {
    switch (cycle) {
      case "Maternelle":
        return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300";
      case "Primaire":
        return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300";
      case "Collège 1er Cycle":
        return "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300";
      case "Collège 2nd Cycle":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300";
    }
  };

  console.log(dossier?.cycle, dossier?.niveau);
  return (
    <Layout
      title="Parcours d'Inscription Hînneh (Multicycles)"
      description="Suivi et validation étape par étape (1 à 11) par guichet & service scolaire"
    >
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src="/images/hinneh_logo_20260507_234919.png"
              alt="Logo Hînneh"
              className="w-14 h-14 object-contain rounded-xl border border-slate-200 dark:border-slate-800 bg-white p-1 shadow-sm shrink-0"
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Processus d'Inscription / Réinscription
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Groupe Scolaire Confessionnel Hînneh (2026-2027) — Circuit
                d'Orientation Élève & Enregistrement Étape par Étape
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* LEFT COL: CANDIDATES LIST WITH CYCLE FILTER (COL 4) */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-3 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Dossiers Élèves
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {preinscritsFiltres.length} élève(s) filtré(s)
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Actualiser la liste"
                      onClick={() => loadData()}
                      className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${loading || refreshing ? "animate-spin" : ""}`}
                      />
                    </Button>
                    {/* <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setOpenNewCandidateModal(true)}
                      className="h-7 text-[11px] gap-1"
                    >
                      <Plus className="w-3 h-3" /> Nouveau
                    </Button> */}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 space-y-2.5">
                {/* SEARCH & CYCLE FILTER */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      className="pl-8 h-9 text-xs"
                      placeholder="Rechercher nom, prénom ou matricule..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  {/* CYCLE FILTER TABS */}
                  <div className="grid grid-cols-5 gap-1 text-[10px]">
                    <button
                      onClick={() => setFilterCycle("all")}
                      className={`py-1 rounded font-bold transition-all ${filterCycle === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      Tous
                    </button>
                    <button
                      onClick={() => setFilterCycle("Maternelle")}
                      className={`py-1 rounded font-bold transition-all ${filterCycle === "Maternelle" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100"}`}
                    >
                      Mat.
                    </button>
                    <button
                      onClick={() => setFilterCycle("Primaire")}
                      className={`py-1 rounded font-bold transition-all ${filterCycle === "Primaire" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"}`}
                    >
                      Prim.
                    </button>
                    <button
                      onClick={() => setFilterCycle("Collège 1er Cycle")}
                      className={`py-1 rounded font-bold transition-all ${filterCycle === "Collège 1er Cycle" ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"}`}
                    >
                      Coll. 1er
                    </button>
                    <button
                      onClick={() => setFilterCycle("Collège 2nd Cycle")}
                      className={`py-1 rounded font-bold transition-all ${filterCycle === "Collège 2nd Cycle" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                    >
                      Coll. 2nd
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                  {loading ? (
                    <p className="text-xs text-slate-500 text-center py-4">
                      Chargement…
                    </p>
                  ) : preinscritsFiltres.length === 0 ? (
                    <div className="p-6 text-center space-y-3">
                      <p className="text-xs text-slate-500 italic">
                        Aucun élève trouvé.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setOpenNewCandidateModal(true)}
                        className="bg-emerald-600 text-white text-xs gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Créer un Élève
                      </Button>
                    </div>
                  ) : (
                    preinscritsFiltres.map((s: any) => {
                      const studentCycle = getCycleFromNiveau(
                        s.className || s.level || "",
                      );
                      return (
                        <button
                          key={s.id}
                          onClick={() => checkImpayesAndSelect(s)}
                          className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between
                          ${dossier?.eleveId === String(s.id) ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs" : "border-slate-200 dark:border-slate-800 hover:border-indigo-300"}`}
                        >
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {s.lastName || s.nom} {s.firstName || s.prenom}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Matricule :{" "}
                              <span className="font-semibold text-indigo-600">
                                {s.matricule || "N/A"}
                              </span>
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge
                              variant="outline"
                              className={`text-[9px] font-bold px-1.5 py-0.5 ${getCycleBadgeColor(studentCycle)}`}
                            >
                              {studentCycle}
                            </Badge>
                            <span className="text-[10px] font-semibold text-slate-600">
                              {s.className || s.level || "3ème"}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COL: 4-PHASE TABBED WIZARD (COL 8) */}
          <div className="lg:col-span-8 space-y-4">
            {!dossier ? (
              <Card className="h-96 flex items-center justify-center border-dashed">
                <div className="text-center text-slate-400 space-y-3 p-6">
                  <img
                    src="/images/hinneh_logo_20260507_234919.png"
                    alt="Logo Hînneh"
                    className="w-16 h-16 object-contain mx-auto opacity-40"
                  />
                  <p className="text-sm font-medium">
                    Sélectionnez un élève dans la liste à gauche pour ouvrir son
                    parcours par étapes.
                  </p>
                  {/* <Button
                    size="sm"
                    onClick={() => setOpenNewCandidateModal(true)}
                    className="bg-emerald-600 text-white text-xs gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Créer un Élève en 1 Clic
                  </Button> */}
                </div>
              </Card>
            ) : (
              <>
                {/* CANDIDATE HEADER SUMMARY WITH CYCLE & ADMINISTRATIVE BADGES */}
                <Card className="border-indigo-200 dark:border-indigo-900 shadow-sm bg-gradient-to-r from-indigo-50/50 via-white to-indigo-50/50 dark:from-slate-900 dark:to-slate-900">
                  <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-full border-2 border-indigo-600 bg-indigo-100 flex items-center justify-center overflow-hidden shrink-0 font-bold text-indigo-700 text-lg">
                        {dossier.photoUrl ? (
                          <img
                            src={dossier.photoUrl}
                            alt="Photo"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          `${dossier.elevePrenom[0]}${dossier.eleveNom[0]}`
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            {dossier.elevePrenom} {dossier.eleveNom}
                          </h2>
                          <Badge
                            className={`text-[10px] font-extrabold ${getCycleBadgeColor(dossier.cycle)}`}
                          >
                            Cycle {dossier.cycle}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold border-indigo-300 text-indigo-800 bg-indigo-50"
                          >
                            {dossier.qualiteEleve}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold border-emerald-300 text-emerald-800 bg-emerald-50"
                          >
                            {dossier.statutOrientation}
                          </Badge>
                          {dossier.priseEnCharge && (
                            <Badge className="bg-amber-500 text-white font-bold text-[10px]">
                              Prise en charge (
                              {dossier.originePriseEnCharge || "Oui"})
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          Matricule :{" "}
                          <span className="font-bold text-indigo-600">
                            {dossier.matricule || "En cours"}
                          </span>{" "}
                          — Classe :{" "}
                          <span className="font-bold">
                            {dossier.classeNom || dossier.niveau}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500">
                          Tuteur WhatsApp :{" "}
                          <span className="font-semibold text-slate-800">
                            {dossier.parentTel || "Non renseigné"}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => setOpenFicheModal(true)}
                        variant="outline"
                        className="text-xs gap-1 border-indigo-300 text-indigo-700"
                      >
                        <FileText className="w-3.5 h-3.5" /> Fiche (11 Étapes)
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setOpenBilletModal(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
                      >
                        <Ticket className="w-3.5 h-3.5" /> Billet d'Entrée
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setOpenCameraModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1"
                      >
                        <Camera className="w-3.5 h-3.5" /> Webcam Live
                      </Button>
                      <input
                        ref={cameraNativeInputRef}
                        type="file"
                        accept="image/*"
                        capture="user"
                        className="hidden"
                        onChange={handlePhotoChange}
                      />
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoChange}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 11-STEP ORIENTATION ROUTE PROGRESS BAR (SERVICE STATIONS STEPPER) */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        Circuit d'Orientation Élève (Parcours par Guichet &
                        Service)
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Progression globale :{" "}
                        <strong className="text-indigo-600">
                          {dossier.validatedSteps.length} / 11 étapes
                          enregistrées
                        </strong>
                      </p>
                    </div>

                    {dossier.currentStep <= 11 && (
                      <Badge className="bg-indigo-600 text-white font-bold text-xs py-1 px-3 flex items-center gap-1.5 shadow-xs animate-pulse">
                        📍 Guichet Actuel :{" "}
                        {OFFICIAL_STEPS.find(
                          (s) => s.id === dossier.currentStep,
                        )?.service || "Terminé"}{" "}
                        (Étape {dossier.currentStep}/11)
                      </Badge>
                    )}
                  </div>

                  {/* PROGRESS BAR - Afficher le pourcentage de complétude */}
                  {dossier && (
                    <div className="space-y-2 py-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Progression d'inscription
                        </span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {dossier.validatedSteps.length}/11 étapes complétées
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full transition-all duration-500 rounded-full"
                          style={{
                            width: `${(dossier.validatedSteps.length / 11) * 100}%`,
                          }}
                        />
                      </div>
                      {dossier.validatedSteps.length > 0 && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                          ✓ Étapes restaurées depuis la base de données
                        </p>
                      )}
                    </div>
                  )}

                  {/* HORIZONTAL STEPPER BADGES (1 TO 11) */}
                  <div className="grid grid-cols-11 gap-1 pt-1">
                    {OFFICIAL_STEPS.map((st) => {
                      const isValidated = dossier.validatedSteps.includes(
                        st.id,
                      );
                      const isCurrent = dossier.currentStep === st.id;
                      return (
                        <button
                          key={st.id}
                          onClick={() => {
                            setActiveTab(st.phase);
                            setDossier({ ...dossier, currentStep: st.id });
                          }}
                          title={`Étape ${st.id} : ${st.title} (${st.service})`}
                          className={`h-9 rounded-lg font-bold text-[10px] flex flex-col items-center justify-center transition-all border
                            ${
                              isValidated
                                ? "bg-emerald-600 text-white border-emerald-700 shadow-2xs"
                                : isCurrent
                                  ? "bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-400 scale-105 shadow-xs font-black"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                            }`}
                        >
                          <span>{isValidated ? "✓" : st.id}</span>
                          <span className="text-[8px] opacity-80 uppercase hidden md:inline truncate max-w-[40px]">
                            {st.service.split(" ")[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* LOGICAL TABS WIZARD (PHASE 1 TO 4) */}
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="grid grid-cols-5 w-full bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <TabsTrigger
                      value="phase1"
                      className="text-xs py-2 gap-1.5 font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs"
                    >
                      <ClipboardCheck className="w-4 h-4" /> Phase 1 : Accueil
                    </TabsTrigger>
                    <TabsTrigger
                      value="phase_sante"
                      className="text-xs py-2 gap-1.5 font-bold data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-xs"
                    >
                      <HeartPulse className="w-4 h-4 text-rose-600" /> Fiche de
                      Santé
                    </TabsTrigger>
                    <TabsTrigger
                      value="phase2"
                      className="text-xs py-2 gap-1.5 font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs"
                    >
                      <Camera className="w-4 h-4" /> Phase 2 : Photo & Saisie
                    </TabsTrigger>
                    <TabsTrigger
                      value="phase3"
                      className="text-xs py-2 gap-1.5 font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs"
                    >
                      <DollarSign className="w-4 h-4" /> Phase 3 : Caisse
                    </TabsTrigger>
                    <TabsTrigger
                      value="phase4"
                      className="text-xs py-2 gap-1.5 font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs"
                    >
                      <Ticket className="w-4 h-4" /> Phase 4 : Billet & Effets
                    </TabsTrigger>
                  </TabsList>

                  {/* PHASE 1 : ACCUEIL, TENUES, KITS & SANTE (ÉTAPES 1 à 4) */}
                  <TabsContent value="phase1" className="mt-4 space-y-4">
                    <Card>
                      <CardHeader className="pb-3 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                        <CardTitle className="text-sm font-bold text-indigo-600 flex items-center gap-2">
                          <ClipboardCheck className="w-4 h-4" /> Phase 1 :
                          Accueil, Tenues, Dépôt de Kits & Santé (Étapes 1 à 4)
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Chaque service valide son étape pour orienter l'élève
                          vers le guichet suivant.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-5 space-y-4">
                        {/* Step 1 */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              Étape 1 : Renseignements & Inscription en ligne
                              (3.000 F CFA)
                            </span>
                            <Badge
                              className={`${dossier.validatedSteps.includes(1) ? "bg-emerald-600" : "bg-slate-400"} text-white text-[10px]`}
                            >
                              {dossier.validatedSteps.includes(1)
                                ? "✅ Enregistré (Accueil)"
                                : "En attente"}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Vérification des pièces fournies et validation du
                            droit d'inscription en ligne.
                          </p>

                          {/* QUALITÉ ÉLÈVE, STATUT ORIENTATION & PRISE EN CHARGE BLOCK */}
                          <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-3">
                            <span className="font-bold text-xs text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-indigo-600" />{" "}
                              Profil Administratif, Statut Orientation & Prise
                              en Charge
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {/* Qualité Élève */}
                              <div>
                                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                  Qualité Élève *
                                </Label>
                                <Select
                                  value={dossier.qualiteEleve}
                                  onValueChange={(val: any) => {
                                    const updated = {
                                      ...dossier,
                                      qualiteEleve: val,
                                    };
                                    updated.montantVersement =
                                      calculateTotalPayment(updated);
                                    setDossier(updated);
                                  }}
                                >
                                  <SelectTrigger className="mt-1 h-8 text-xs bg-white dark:bg-slate-900">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Non Redoublant(e)">
                                      Non Redoublant(e)
                                    </SelectItem>
                                    <SelectItem value="Redoublant(e)">
                                      Redoublant(e)
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Statut Orientation */}
                              <div>
                                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                  Statut Orientation *
                                </Label>
                                <Select
                                  value={dossier.statutOrientation}
                                  onValueChange={(val) => {
                                    const updated = {
                                      ...dossier,
                                      statutOrientation: val,
                                    };
                                    updated.montantVersement =
                                      calculateTotalPayment(updated);
                                    setDossier(updated);
                                  }}
                                >
                                  <SelectTrigger className="mt-1 h-8 text-xs bg-white dark:bg-slate-900">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Affecté par l'État">
                                      Affecté par l'État
                                    </SelectItem>
                                    <SelectItem value="Non Affecté (Payant)">
                                      Non Affecté (Payant)
                                    </SelectItem>
                                    <SelectItem value="Réaffecté">
                                      Réaffecté
                                    </SelectItem>
                                    <SelectItem value="Transfert d'établissement">
                                      Transfert d'établissement
                                    </SelectItem>
                                    <SelectItem value="Régularisation">
                                      Régularisation
                                    </SelectItem>
                                    <SelectItem value="Réintégration">
                                      Réintégration
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Prise en Charge Checkbox */}
                              <div className="flex items-center gap-2 pt-5">
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-indigo-900 dark:text-indigo-200 bg-white dark:bg-slate-900 p-2 rounded-lg border border-indigo-200 dark:border-indigo-800 w-full justify-between">
                                  <span>Prise en charge ?</span>
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 accent-indigo-600 rounded"
                                    checked={dossier.priseEnCharge}
                                    onChange={(e) => {
                                      const updated = {
                                        ...dossier,
                                        priseEnCharge: e.target.checked,
                                      };
                                      updated.montantVersement =
                                        calculateTotalPayment(updated);
                                      setDossier(updated);
                                    }}
                                  />
                                </label>
                              </div>
                            </div>

                            {/* Origine & Nature de la Prise en Charge */}
                            {dossier.priseEnCharge && (
                              <div className="space-y-1 pt-1 animate-fade-in">
                                <Label className="text-[11px] font-bold text-indigo-950 dark:text-indigo-200">
                                  Origine & Nature de la Prise en Charge *
                                </Label>
                                <Input
                                  value={dossier.originePriseEnCharge}
                                  onChange={(e) =>
                                    setDossier({
                                      ...dossier,
                                      originePriseEnCharge: e.target.value,
                                    })
                                  }
                                  placeholder="Précisez la structure, fondation ou l'organisme (ex: Fondation Hînneh, Ministère, Mécène...)"
                                  className="h-8 text-xs bg-white dark:bg-slate-900 border-indigo-300 font-semibold"
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                            <span className="text-[11px] text-slate-500 font-medium">
                              Guichet :{" "}
                              <strong className="text-slate-800 dark:text-slate-200">
                                Accueil & Orientation
                              </strong>
                            </span>
                            <Button
                              size="sm"
                              onClick={() => handleValidateStep(1)}
                              className={`text-xs gap-1.5 font-bold ${dossier.validatedSteps.includes(1) ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700"} text-white`}
                            >
                              <Save className="w-3.5 h-3.5" />{" "}
                              {dossier.validatedSteps.includes(1)
                                ? "Étape 1 Enregistrée"
                                : "Enregistrer Étape 1 (Accueil)"}
                            </Button>
                          </div>
                        </div>

                        {/* Step 2 */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              Étape 2 : Vérification Tenues Scolaires &
                              Chaussures
                            </span>
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-indigo-600">
                              <input
                                type="checkbox"
                                className="w-4 h-4 accent-indigo-600"
                                checked={dossier.tenueValidee}
                                onChange={(e) =>
                                  setDossier({
                                    ...dossier,
                                    tenueValidee: e.target.checked,
                                  })
                                }
                              />
                              Tenues & Chaussures Conformes
                            </label>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Présentation tenue & chaussures en bon état
                            (ancienne année) ou bon d'achat neuve.
                          </p>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                            <span className="text-[11px] text-slate-500 font-medium">
                              Guichet :{" "}
                              <strong className="text-slate-800 dark:text-slate-200">
                                Vie Scolaire
                              </strong>
                            </span>
                            <Button
                              size="sm"
                              onClick={() => handleValidateStep(2)}
                              className={`text-xs gap-1.5 font-bold ${dossier.validatedSteps.includes(2) ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700"} text-white`}
                            >
                              <Save className="w-3.5 h-3.5" />{" "}
                              {dossier.validatedSteps.includes(2)
                                ? "Étape 2 Enregistrée"
                                : "Enregistrer Étape 2 (Vie Scolaire)"}
                            </Button>
                          </div>
                        </div>

                        {/* Step 3 : KITS EN CHAMPS À COCHER */}
                        <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Boxes className="w-4 h-4 text-indigo-600" />
                              <span className="font-bold text-xs text-indigo-950 dark:text-indigo-200">
                                Étape 3 : Dépôt Physique des Kits (Papier
                                hygiénique, rames, marqueurs)
                              </span>
                            </div>
                            <Badge
                              className={`${dossier.validatedSteps.includes(3) ? "bg-emerald-600" : "bg-indigo-600"} text-white text-[10px]`}
                            >
                              {dossier.validatedSteps.includes(3)
                                ? "✅ Enregistré (Matériel)"
                                : "En attente"}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">
                            Cochez les fournitures apportées par le parent :
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                            <label
                              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${dossier.kitRamePapier ? "bg-white border-indigo-600 shadow-xs" : "bg-slate-50 border-slate-200 opacity-70"}`}
                            >
                              <span className="font-bold text-xs text-slate-900">
                                📄 Rame de papier A4
                              </span>
                              <input
                                type="checkbox"
                                className="w-4 h-4 accent-indigo-600 rounded"
                                checked={dossier.kitRamePapier}
                                onChange={() =>
                                  handleToggleKitSupply("kitRamePapier")
                                }
                              />
                            </label>

                            <label
                              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${dossier.kitPapierHygienique ? "bg-white border-emerald-600 shadow-xs" : "bg-slate-50 border-slate-200 opacity-70"}`}
                            >
                              <span className="font-bold text-xs text-slate-900">
                                🧻 Papier Hygiénique (4r)
                              </span>
                              <input
                                type="checkbox"
                                className="w-4 h-4 accent-emerald-600 rounded"
                                checked={dossier.kitPapierHygienique}
                                onChange={() =>
                                  handleToggleKitSupply("kitPapierHygienique")
                                }
                              />
                            </label>

                            <label
                              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${dossier.kitMarqueursTableau ? "bg-white border-amber-600 shadow-xs" : "bg-slate-50 border-slate-200 opacity-70"}`}
                            >
                              <span className="font-bold text-xs text-slate-900">
                                🖊️ Marqueurs Tableau
                              </span>
                              <input
                                type="checkbox"
                                className="w-4 h-4 accent-amber-600 rounded"
                                checked={dossier.kitMarqueursTableau}
                                onChange={() =>
                                  handleToggleKitSupply("kitMarqueursTableau")
                                }
                              />
                            </label>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-indigo-200 dark:border-indigo-800">
                            <span className="text-[11px] text-slate-600 font-medium">
                              Guichet :{" "}
                              <strong className="text-slate-900">
                                Matériel & Logistique
                              </strong>
                            </span>
                            <Button
                              size="sm"
                              onClick={() => handleValidateStep(3)}
                              className={`text-xs gap-1.5 font-bold ${dossier.validatedSteps.includes(3) ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700"} text-white`}
                            >
                              <Save className="w-3.5 h-3.5" />{" "}
                              {dossier.validatedSteps.includes(3)
                                ? "Étape 3 Enregistrée"
                                : "Enregistrer Étape 3 (Matériel)"}
                            </Button>
                          </div>
                        </div>

                        {/* Step 4 : FICHE DE SANTÉ COMPLÈTE CONFORME AU MODÈLE OFFICIEL */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
                            <div className="flex items-center gap-2">
                              <HeartPulse className="w-5 h-5 text-rose-600" />
                              <div>
                                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                  Étape 4 : Fiche de Santé Officielle
                                  (Infirmerie)
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                  Antécédents médicaux, pathologies, groupe
                                  sanguin, dispense EPS et contacts d'urgence.
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <Button
                                size="sm"
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  printFicheSante({
                                    nomPrenoms: `${dossier.eleveNom} ${dossier.elevePrenom}`,
                                    dateNaissance: dossier.dateNaissance,
                                    sexe: dossier.gender,
                                    classe: dossier.niveau,
                                    photoUrl: dossier.photoUrl,
                                    parentContacts: [
                                      {
                                        nomPrenom: dossier.parentNom,
                                        contact: dossier.parentTel,
                                      },
                                    ],
                                    groupeSanguin:
                                      dossier.groupeSanguin || "A+",
                                    rhesus: dossier.rhesus || "+",
                                    allergiesAlimentaires:
                                      dossier.allergiesAlimentaires || "Aucune",
                                    allergiesMedicamenteuses:
                                      dossier.allergiesMedicamenteuses ||
                                      "Aucune",
                                    etatVaccinal:
                                      dossier.etatVaccinal || "À jour",
                                    asthme: Boolean(dossier.hasAsthme),
                                    asthmeTraitement: dossier.asthmeTraitement,
                                    drepanocytose: Boolean(
                                      dossier.hasDrepanocytose,
                                    ),
                                    drepanocytoseTraitement:
                                      dossier.drepanocytoseTraitement,
                                    epilepsie: Boolean(dossier.hasEpilepsie),
                                    epilepsieTraitement:
                                      dossier.epilepsieTraitement,
                                    handicap: Boolean(dossier.hasHandicap),
                                    handicapPrecision:
                                      dossier.handicapPrecision,
                                    autresPathologies:
                                      dossier.autresPathologies || "",
                                    autresTraitement:
                                      dossier.autresTraitement || "",
                                    dispenseSportive: Boolean(
                                      dossier.dispenseSportive,
                                    ),
                                    dispensePrecision:
                                      dossier.dispensePrecision,
                                    medecin1Contact: dossier.medecin1Contact,
                                    medecin2Contact: dossier.medecin2Contact,
                                    nomAssurance: dossier.nomAssurance,
                                  });
                                }}
                                className="text-xs gap-1.5 font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                              >
                                <Printer className="w-3.5 h-3.5" /> Imprimer
                                Fiche de Santé Officielle
                              </Button>

                              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 accent-emerald-600"
                                  checked={dossier.ficheSanteRemplie}
                                  onChange={(e) =>
                                    setDossier({
                                      ...dossier,
                                      ficheSanteRemplie: e.target.checked,
                                    })
                                  }
                                />
                                Fiche Remplie & Validée
                              </label>
                            </div>
                          </div>

                          {/* FORMULAIRE 9 SECTIONS CONFORME À LA FICHE PHYSIQUE */}
                          <div className="space-y-4 text-xs">
                            {/* SECTION 6: ANTECEDENTS GENERALS */}
                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                              <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                                🩸 6. Antécédents Généraux (Groupe Sanguin,
                                Allergies, Vaccins)
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div>
                                  <Label className="text-[11px]">
                                    Groupe Sanguin *
                                  </Label>
                                  <Select
                                    value={dossier.groupeSanguin || "A+"}
                                    onValueChange={(v) =>
                                      setDossier({
                                        ...dossier,
                                        groupeSanguin: v,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="mt-1 h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="A+">A +</SelectItem>
                                      <SelectItem value="A-">A -</SelectItem>
                                      <SelectItem value="B+">B +</SelectItem>
                                      <SelectItem value="B-">B -</SelectItem>
                                      <SelectItem value="AB+">AB +</SelectItem>
                                      <SelectItem value="AB-">AB -</SelectItem>
                                      <SelectItem value="O+">O +</SelectItem>
                                      <SelectItem value="O-">O -</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label className="text-[11px]">
                                    Rhésus *
                                  </Label>
                                  <Select
                                    value={dossier.rhesus || "+"}
                                    onValueChange={(v) =>
                                      setDossier({ ...dossier, rhesus: v })
                                    }
                                  >
                                    <SelectTrigger className="mt-1 h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="+">
                                        Positif (+)
                                      </SelectItem>
                                      <SelectItem value="-">
                                        Négatif (-)
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label className="text-[11px]">
                                    État Vaccinal *
                                  </Label>
                                  <Select
                                    value={dossier.etatVaccinal || "À jour"}
                                    onValueChange={(v) =>
                                      setDossier({
                                        ...dossier,
                                        etatVaccinal: v,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="mt-1 h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="À jour">
                                        À jour
                                      </SelectItem>
                                      <SelectItem value="Incomplet">
                                        Incomplet
                                      </SelectItem>
                                      <SelectItem value="Non à jour">
                                        Non à jour
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label className="text-[11px]">
                                    Nom de l'Assurance
                                  </Label>
                                  <Input
                                    value={dossier.nomAssurance || ""}
                                    onChange={(e) =>
                                      setDossier({
                                        ...dossier,
                                        nomAssurance: e.target.value,
                                      })
                                    }
                                    placeholder="Ex: MUGEFCI, SAHAM..."
                                    className="mt-1 h-8"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div>
                                  <Label className="text-[11px]">
                                    Allergies Alimentaires
                                  </Label>
                                  <Input
                                    value={dossier.allergiesAlimentaires || ""}
                                    onChange={(e) =>
                                      setDossier({
                                        ...dossier,
                                        allergiesAlimentaires: e.target.value,
                                      })
                                    }
                                    placeholder="Ex: Arachide, Lait, Aucune..."
                                    className="mt-1 h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[11px]">
                                    Allergies Médicamenteuses
                                  </Label>
                                  <Input
                                    value={
                                      dossier.allergiesMedicamenteuses || ""
                                    }
                                    onChange={(e) =>
                                      setDossier({
                                        ...dossier,
                                        allergiesMedicamenteuses:
                                          e.target.value,
                                      })
                                    }
                                    placeholder="Ex: Pénicilline, Aspirine, Aucune..."
                                    className="mt-1 h-8"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* SECTION: TABLEAU DES PATHOLOGIES ET TRAITEMENTS D'URGENCE */}
                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                              <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                                🏥 Antécédents Médicaux & Pathologies
                                (Traitement d'Urgence / Ordonnance / Rapport)
                              </span>

                              <div className="space-y-2">
                                {/* 1. Asthme */}
                                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                  <label className="flex items-center gap-2 font-bold cursor-pointer w-48">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 accent-rose-600 rounded"
                                      checked={dossier.hasAsthme || false}
                                      onChange={(e) =>
                                        setDossier({
                                          ...dossier,
                                          hasAsthme: e.target.checked,
                                        })
                                      }
                                    />
                                    <span>1. Asthme</span>
                                  </label>
                                  {dossier.hasAsthme && (
                                    <Input
                                      value={dossier.asthmeTraitement || ""}
                                      onChange={(e) =>
                                        setDossier({
                                          ...dossier,
                                          asthmeTraitement: e.target.value,
                                        })
                                      }
                                      placeholder="Traitement d'urgence / Ordonnance (ex: Ventoline)"
                                      className="h-8 text-xs flex-1"
                                    />
                                  )}
                                </div>

                                {/* 2. Drépanocytose */}
                                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                  <label className="flex items-center gap-2 font-bold cursor-pointer w-48">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 accent-rose-600 rounded"
                                      checked={
                                        dossier.hasDrepanocytose || false
                                      }
                                      onChange={(e) =>
                                        setDossier({
                                          ...dossier,
                                          hasDrepanocytose: e.target.checked,
                                        })
                                      }
                                    />
                                    <span>2. Drépanocytose</span>
                                  </label>
                                  {dossier.hasDrepanocytose && (
                                    <Input
                                      value={
                                        dossier.drepanocytoseTraitement || ""
                                      }
                                      onChange={(e) =>
                                        setDossier({
                                          ...dossier,
                                          drepanocytoseTraitement:
                                            e.target.value,
                                        })
                                      }
                                      placeholder="Préciser le type (SS, AS, AC) & traitement d'urgence"
                                      className="h-8 text-xs flex-1"
                                    />
                                  )}
                                </div>

                                {/* 3. Épilepsie */}
                                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                  <label className="flex items-center gap-2 font-bold cursor-pointer w-48">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 accent-rose-600 rounded"
                                      checked={dossier.hasEpilepsie || false}
                                      onChange={(e) =>
                                        setDossier({
                                          ...dossier,
                                          hasEpilepsie: e.target.checked,
                                        })
                                      }
                                    />
                                    <span>3. Épilepsie</span>
                                  </label>
                                  {dossier.hasEpilepsie && (
                                    <Input
                                      value={dossier.epilepsieTraitement || ""}
                                      onChange={(e) =>
                                        setDossier({
                                          ...dossier,
                                          epilepsieTraitement: e.target.value,
                                        })
                                      }
                                      placeholder="Traitement d'urgence en cas de crise"
                                      className="h-8 text-xs flex-1"
                                    />
                                  )}
                                </div>

                                {/* 4. Handicap */}
                                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                  <label className="flex items-center gap-2 font-bold cursor-pointer w-48">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 accent-rose-600 rounded"
                                      checked={dossier.hasHandicap || false}
                                      onChange={(e) =>
                                        setDossier({
                                          ...dossier,
                                          hasHandicap: e.target.checked,
                                        })
                                      }
                                    />
                                    <span>
                                      4. Handicap (Auditif, visuel, etc.)
                                    </span>
                                  </label>
                                  {dossier.hasHandicap && (
                                    <Input
                                      value={dossier.handicapPrecision || ""}
                                      onChange={(e) =>
                                        setDossier({
                                          ...dossier,
                                          handicapPrecision: e.target.value,
                                        })
                                      }
                                      placeholder="Préciser le type (rapport médical obligatoire)"
                                      className="h-8 text-xs flex-1"
                                    />
                                  )}
                                </div>

                                {/* 5. Autres Pathologies */}
                                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                  <Input
                                    value={dossier.autresPathologies || ""}
                                    onChange={(e) =>
                                      setDossier({
                                        ...dossier,
                                        autresPathologies: e.target.value,
                                      })
                                    }
                                    placeholder="5. Autres pathologies à déclarer..."
                                    className="h-8 text-xs w-48 font-bold"
                                  />
                                  {dossier.autresPathologies && (
                                    <Input
                                      value={dossier.autresTraitement || ""}
                                      onChange={(e) =>
                                        setDossier({
                                          ...dossier,
                                          autresTraitement: e.target.value,
                                        })
                                      }
                                      placeholder="Traitement d'urgence..."
                                      className="h-8 text-xs flex-1"
                                    />
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* SECTION 7 & 8: DISPENSE EPS & MEDECINS */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* DISPENSE SPORTIVE */}
                              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                                <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                                  🏃 7. Dispense Sportive EPS
                                </span>
                                <div className="flex items-center gap-3">
                                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                                    <input
                                      type="radio"
                                      name="dispenseEps"
                                      checked={Boolean(
                                        dossier.dispenseSportive,
                                      )}
                                      onChange={() =>
                                        setDossier({
                                          ...dossier,
                                          dispenseSportive: true,
                                        })
                                      }
                                    />
                                    <span>Oui</span>
                                  </label>
                                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                                    <input
                                      type="radio"
                                      name="dispenseEps"
                                      checked={
                                        !Boolean(dossier.dispenseSportive)
                                      }
                                      onChange={() =>
                                        setDossier({
                                          ...dossier,
                                          dispenseSportive: false,
                                          dispensePrecision: "",
                                        })
                                      }
                                    />
                                    <span>Non</span>
                                  </label>
                                </div>
                                {dossier.dispenseSportive && (
                                  <Input
                                    value={dossier.dispensePrecision || ""}
                                    onChange={(e) =>
                                      setDossier({
                                        ...dossier,
                                        dispensePrecision: e.target.value,
                                      })
                                    }
                                    placeholder="Raison & durée (Certificat médical à joindre)"
                                    className="h-8 text-xs mt-1"
                                  />
                                )}
                              </div>

                              {/* CONTACTS MEDECINS TRAITANTS */}
                              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                                <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                                  🩺 8. Contacts des Médecins Traitants
                                </span>
                                <div className="space-y-1.5">
                                  <Input
                                    value={dossier.medecin1Contact || ""}
                                    onChange={(e) =>
                                      setDossier({
                                        ...dossier,
                                        medecin1Contact: e.target.value,
                                      })
                                    }
                                    placeholder="Contact Médecin 1 (Nom & Tél)"
                                    className="h-8 text-xs"
                                  />
                                  <Input
                                    value={dossier.medecin2Contact || ""}
                                    onChange={(e) =>
                                      setDossier({
                                        ...dossier,
                                        medecin2Contact: e.target.value,
                                      })
                                    }
                                    placeholder="Contact Médecin 2 (Nom & Tél)"
                                    className="h-8 text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                            <span className="text-[11px] text-slate-500 font-medium">
                              Guichet :{" "}
                              <strong className="text-slate-800 dark:text-slate-200">
                                Service Santé / Infirmerie
                              </strong>
                            </span>
                            <Button
                              size="sm"
                              onClick={() => handleValidateStep(4)}
                              className={`text-xs gap-1.5 font-bold ${dossier.validatedSteps.includes(4) ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700"} text-white`}
                            >
                              <Save className="w-3.5 h-3.5" />{" "}
                              {dossier.validatedSteps.includes(4)
                                ? "Étape 4 Enregistrée (Santé)"
                                : "Enregistrer Étape 4 (Service Santé)"}
                            </Button>
                          </div>
                        </div>

                        <div className="flex justify-between pt-2">
                          <Button
                            variant="outline"
                            onClick={() => setActiveTab("phase1")}
                          >
                            <ChevronLeft className="w-4 h-4" /> Accueil
                          </Button>
                          <Button
                            onClick={() => setActiveTab("phase_sante")}
                            className="bg-rose-600 hover:bg-rose-700 text-white gap-2 font-bold"
                          >
                            Fiche de Santé & Infirmerie{" "}
                            <HeartPulse className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* ONGLET DÉDIÉ : FICHE DE SANTÉ & INFIRMERIE */}
                  <TabsContent value="phase_sante" className="mt-4 space-y-4">
                    <Card className="border-rose-200 dark:border-rose-950">
                      <CardHeader className="pb-3 bg-rose-50/50 dark:bg-rose-950/30 border-b border-rose-100 dark:border-rose-900">
                        <CardTitle className="text-sm font-bold text-rose-700 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <HeartPulse className="w-5 h-5 text-rose-600" />{" "}
                            Onglet Fiche de Santé Officielle (Infirmerie &
                            Médical)
                          </span>
                          <Badge className="bg-rose-600 text-white text-[10px]">
                            Service Médical Hînneh
                          </Badge>
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Remplissez le dossier médical complet de l'élève et
                          imprimez la fiche de santé conforme au modèle
                          physique.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-5 space-y-4">
                        {/* REPETITION FORMULAIRE FICHE DE SANTE DEDIE */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="w-5 h-5 text-indigo-600" />
                              <div>
                                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                  Dossier Médical de l'Élève
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                  Élève :{" "}
                                  <strong>
                                    {dossier.eleveNom} {dossier.elevePrenom}
                                  </strong>{" "}
                                  — Classe : <strong>{dossier.niveau}</strong>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <Button
                                size="sm"
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  printFicheSante({
                                    nomPrenoms: `${dossier.eleveNom} ${dossier.elevePrenom}`,
                                    dateNaissance: dossier.dateNaissance,
                                    sexe: dossier.gender,
                                    classe: dossier.niveau,
                                    photoUrl: dossier.photoUrl,
                                    parentContacts: [
                                      {
                                        nomPrenom: dossier.parentNom,
                                        contact: dossier.parentTel,
                                      },
                                    ],
                                    groupeSanguin:
                                      dossier.groupeSanguin || "A+",
                                    rhesus: dossier.rhesus || "+",
                                    allergiesAlimentaires:
                                      dossier.allergiesAlimentaires || "Aucune",
                                    allergiesMedicamenteuses:
                                      dossier.allergiesMedicamenteuses ||
                                      "Aucune",
                                    etatVaccinal:
                                      dossier.etatVaccinal || "À jour",
                                    asthme: Boolean(dossier.hasAsthme),
                                    asthmeTraitement: dossier.asthmeTraitement,
                                    drepanocytose: Boolean(
                                      dossier.hasDrepanocytose,
                                    ),
                                    drepanocytoseTraitement:
                                      dossier.drepanocytoseTraitement,
                                    epilepsie: Boolean(dossier.hasEpilepsie),
                                    epilepsieTraitement:
                                      dossier.epilepsieTraitement,
                                    handicap: Boolean(dossier.hasHandicap),
                                    handicapPrecision:
                                      dossier.handicapPrecision,
                                    autresPathologies:
                                      dossier.autresPathologies || "",
                                    autresTraitement:
                                      dossier.autresTraitement || "",
                                    dispenseSportive: Boolean(
                                      dossier.dispenseSportive,
                                    ),
                                    dispensePrecision:
                                      dossier.dispensePrecision,
                                    medecin1Contact: dossier.medecin1Contact,
                                    medecin2Contact: dossier.medecin2Contact,
                                    nomAssurance: dossier.nomAssurance,
                                  });
                                }}
                                className="text-xs gap-1.5 font-bold border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100"
                              >
                                <Printer className="w-3.5 h-3.5" /> Imprimer
                                Fiche de Santé Officielle (PDF)
                              </Button>
                            </div>
                          </div>

                          {/* REPERTOIRE SECTIONS Sante */}
                          <div className="space-y-4 text-xs">
                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                              <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                                🩸 Groupe Sanguin, Allergies & Informations
                                Générales
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div>
                                  <Label className="text-[11px]">
                                    Groupe Sanguin *
                                  </Label>
                                  <Select
                                    value={dossier.groupeSanguin || "A+"}
                                    onValueChange={(v) =>
                                      setDossier({
                                        ...dossier,
                                        groupeSanguin: v,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="mt-1 h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="A+">A +</SelectItem>
                                      <SelectItem value="A-">A -</SelectItem>
                                      <SelectItem value="B+">B +</SelectItem>
                                      <SelectItem value="B-">B -</SelectItem>
                                      <SelectItem value="AB+">AB +</SelectItem>
                                      <SelectItem value="AB-">AB -</SelectItem>
                                      <SelectItem value="O+">O +</SelectItem>
                                      <SelectItem value="O-">O -</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-[11px]">
                                    Rhésus *
                                  </Label>
                                  <Select
                                    value={dossier.rhesus || "+"}
                                    onValueChange={(v) =>
                                      setDossier({ ...dossier, rhesus: v })
                                    }
                                  >
                                    <SelectTrigger className="mt-1 h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="+">
                                        Positif (+)
                                      </SelectItem>
                                      <SelectItem value="-">
                                        Négatif (-)
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-[11px]">
                                    État Vaccinal *
                                  </Label>
                                  <Select
                                    value={dossier.etatVaccinal || "À jour"}
                                    onValueChange={(v) =>
                                      setDossier({
                                        ...dossier,
                                        etatVaccinal: v,
                                      })
                                    }
                                  >
                                    <SelectTrigger className="mt-1 h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="À jour">
                                        À jour
                                      </SelectItem>
                                      <SelectItem value="Incomplet">
                                        Incomplet
                                      </SelectItem>
                                      <SelectItem value="Non à jour">
                                        Non à jour
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-[11px]">
                                    Compagnie d'Assurance
                                  </Label>
                                  <Input
                                    value={dossier.nomAssurance || ""}
                                    onChange={(e) =>
                                      setDossier({
                                        ...dossier,
                                        nomAssurance: e.target.value,
                                      })
                                    }
                                    placeholder="Ex: SAHAM, MUGEFCI..."
                                    className="mt-1 h-8"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div>
                                  <Label className="text-[11px]">
                                    Allergies Alimentaires
                                  </Label>
                                  <Input
                                    value={dossier.allergiesAlimentaires || ""}
                                    onChange={(e) =>
                                      setDossier({
                                        ...dossier,
                                        allergiesAlimentaires: e.target.value,
                                      })
                                    }
                                    placeholder="Ex: Arachides, Lait..."
                                    className="mt-1 h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[11px]">
                                    Allergies Médicamenteuses
                                  </Label>
                                  <Input
                                    value={
                                      dossier.allergiesMedicamenteuses || ""
                                    }
                                    onChange={(e) =>
                                      setDossier({
                                        ...dossier,
                                        allergiesMedicamenteuses:
                                          e.target.value,
                                      })
                                    }
                                    placeholder="Ex: Pénicilline, Aspirine..."
                                    className="mt-1 h-8"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                              <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                                🏥 Antécédents Médicaux & Prise en Charge
                                d'Urgence
                              </span>

                              <div className="space-y-2">
                                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                  <label className="flex items-center gap-2 font-bold cursor-pointer w-48">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 accent-rose-600 rounded"
                                      checked={dossier.hasAsthme || false}
                                      onChange={(e) =>
                                        setDossier({
                                          ...dossier,
                                          hasAsthme: e.target.checked,
                                        })
                                      }
                                    />
                                    <span>Asthme</span>
                                  </label>
                                  {dossier.hasAsthme && (
                                    <Input
                                      value={dossier.asthmeTraitement || ""}
                                      onChange={(e) =>
                                        setDossier({
                                          ...dossier,
                                          asthmeTraitement: e.target.value,
                                        })
                                      }
                                      placeholder="Traitement / Ordonnance d'urgence"
                                      className="h-8 text-xs flex-1"
                                    />
                                  )}
                                </div>

                                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                  <label className="flex items-center gap-2 font-bold cursor-pointer w-48">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 accent-rose-600 rounded"
                                      checked={
                                        dossier.hasDrepanocytose || false
                                      }
                                      onChange={(e) =>
                                        setDossier({
                                          ...dossier,
                                          hasDrepanocytose: e.target.checked,
                                        })
                                      }
                                    />
                                    <span>Drépanocytose</span>
                                  </label>
                                  {dossier.hasDrepanocytose && (
                                    <Input
                                      value={
                                        dossier.drepanocytoseTraitement || ""
                                      }
                                      onChange={(e) =>
                                        setDossier({
                                          ...dossier,
                                          drepanocytoseTraitement:
                                            e.target.value,
                                        })
                                      }
                                      placeholder="Type (SS/AS/AC) et consignes"
                                      className="h-8 text-xs flex-1"
                                    />
                                  )}
                                </div>

                                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                  <label className="flex items-center gap-2 font-bold cursor-pointer w-48">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 accent-rose-600 rounded"
                                      checked={dossier.hasEpilepsie || false}
                                      onChange={(e) =>
                                        setDossier({
                                          ...dossier,
                                          hasEpilepsie: e.target.checked,
                                        })
                                      }
                                    />
                                    <span>Épilepsie</span>
                                  </label>
                                  {dossier.hasEpilepsie && (
                                    <Input
                                      value={dossier.epilepsieTraitement || ""}
                                      onChange={(e) =>
                                        setDossier({
                                          ...dossier,
                                          epilepsieTraitement: e.target.value,
                                        })
                                      }
                                      placeholder="Consignes en cas de crise"
                                      className="h-8 text-xs flex-1"
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-between pt-2">
                            <Button
                              variant="outline"
                              onClick={() => setActiveTab("phase1")}
                            >
                              <ChevronLeft className="w-4 h-4" /> Précédent
                              (Accueil)
                            </Button>
                            <Button
                              onClick={() => setActiveTab("phase2")}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-bold"
                            >
                              Suivant : Phase 2 (Photo & Saisie){" "}
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* PHASE 2 : SAISIE LOGICIEL & PHOTO LIVE (ÉTAPES 5 et 6) */}
                  <TabsContent value="phase2" className="mt-4 space-y-4">
                    <Card>
                      <CardHeader className="pb-3 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                        <CardTitle className="text-sm font-bold text-indigo-600 flex items-center gap-2">
                          <Camera className="w-4 h-4" /> Phase 2 :
                          Identification, Photo & Contact Parent (Étapes 5 & 6)
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Saisie dans la base de données et prise de photo
                          numérique d'identité.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-5 space-y-4">
                        {/* Step 5 */}
                        <div className="space-y-3 p-4 border rounded-xl bg-slate-50/50">
                          <div className="flex justify-between items-center">
                            <p className="font-bold text-xs text-slate-900">
                              Étape 5 : Saisie dans le logiciel & WhatsApp
                              Parent
                            </p>
                            <Badge
                              className={`${dossier.validatedSteps.includes(5) ? "bg-emerald-600" : "bg-slate-400"} text-white text-[10px]`}
                            >
                              {dossier.validatedSteps.includes(5)
                                ? "✅ Enregistré (Secrétariat)"
                                : "En attente"}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">
                                Numéro WhatsApp Parent *
                              </Label>
                              <Input
                                value={dossier.parentTel}
                                onChange={(e) =>
                                  setDossier({
                                    ...dossier,
                                    parentTel: e.target.value,
                                  })
                                }
                                placeholder="Ex: 0708091011"
                                className="mt-1 text-xs font-bold"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">
                                Nom & Prénom Tuteur Legal
                              </Label>
                              <Input
                                value={dossier.parentNom}
                                onChange={(e) =>
                                  setDossier({
                                    ...dossier,
                                    parentNom: e.target.value,
                                  })
                                }
                                placeholder="Nom du tuteur"
                                className="mt-1 text-xs"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                            <span className="text-[11px] text-slate-500 font-medium">
                              Guichet :{" "}
                              <strong className="text-slate-800">
                                Secrétariat Scolaire
                              </strong>
                            </span>
                            <Button
                              size="sm"
                              onClick={() => handleValidateStep(5)}
                              className={`text-xs gap-1.5 font-bold ${dossier.validatedSteps.includes(5) ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700"} text-white`}
                            >
                              <Save className="w-3.5 h-3.5" />{" "}
                              {dossier.validatedSteps.includes(5)
                                ? "Étape 5 Enregistrée"
                                : "Enregistrer Étape 5 (Secrétariat)"}
                            </Button>
                          </div>
                        </div>

                        {/* Step 6 MULTI-OPTION PHOTO CAPTURE */}
                        <div className="space-y-3 p-4 border rounded-xl bg-slate-50/50 flex flex-col sm:flex-row items-center gap-4">
                          <div className="w-24 h-24 rounded-2xl border-2 border-indigo-600 bg-indigo-50 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                            {dossier.photoUrl ? (
                              <img
                                src={dossier.photoUrl}
                                alt="Photo"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-10 h-10 text-indigo-400" />
                            )}
                          </div>
                          <div className="space-y-2 text-center sm:text-left flex-1">
                            <div className="flex justify-between items-center">
                              <p className="font-bold text-xs text-slate-900">
                                Étape 6 : Prise de Photo d'Identité de l'Élève
                              </p>
                              <Badge
                                className={`${dossier.validatedSteps.includes(6) ? "bg-emerald-600" : "bg-slate-400"} text-white text-[10px]`}
                              >
                                {dossier.validatedSteps.includes(6)
                                  ? "✅ Enregistré (Photo)"
                                  : "En attente"}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Utilisez la webcam live ou choisissez directement
                              une photo existante.
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
                              <Button
                                size="sm"
                                onClick={() => setOpenCameraModal(true)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm"
                              >
                                <Camera className="w-4 h-4" /> 💻 Webcam Live
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => photoInputRef.current?.click()}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow-sm"
                              >
                                <Upload className="w-4 h-4" /> 📁 Choisir
                                Fichier Photo
                              </Button>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-200 mt-2">
                              <span className="text-[11px] text-slate-500 font-medium">
                                Guichet :{" "}
                                <strong className="text-slate-800">
                                  Service Photographie
                                </strong>
                              </span>
                              <Button
                                size="sm"
                                onClick={() => handleValidateStep(6)}
                                className={`text-xs gap-1.5 font-bold ${dossier.validatedSteps.includes(6) ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700"} text-white`}
                              >
                                <Save className="w-3.5 h-3.5" />{" "}
                                {dossier.validatedSteps.includes(6)
                                  ? "Étape 6 Enregistrée"
                                  : "Enregistrer Étape 6 (Photo)"}
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between pt-2">
                          <Button
                            variant="outline"
                            onClick={() => setActiveTab("phase1")}
                          >
                            <ChevronLeft className="w-4 h-4" /> Précédent
                          </Button>
                          <Button
                            onClick={() => setActiveTab("phase3")}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                          >
                            Passer à la Phase 3 : Caisse & Scolarité{" "}
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* PHASE 3 : CAISSE EN CHAMPS À COCHER & AFFECTATION CLASSE (ÉTAPE 7) */}
                  <TabsContent value="phase3" className="mt-4 space-y-4">
                    <Card>
                      <CardHeader className="pb-3 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                        <CardTitle className="text-sm font-bold text-indigo-600 flex items-center gap-2">
                          <DollarSign className="w-4 h-4" /> Phase 3 :
                          Encaissement & Option Frais en Champs à Cocher (Étape
                          7)
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Cochez les frais et services réglés à la caisse. Le
                          total est recalculé automatiquement.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-5 space-y-4">
                        {/* Class selection & Cycle */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="w-full sm:w-1/2">
                            <Label className="text-xs font-bold text-slate-700">
                              Affectation de Classe *
                            </Label>
                            <Select
                              value={dossier.classeId}
                              onValueChange={(val) => {
                                const classeObj = classes.find(
                                  (c: any) => String(c.id) === String(val),
                                );
                                const cNom =
                                  classeObj?.CE_LIBELLE ||
                                  classeObj?.name ||
                                  val;
                                const cCycle = getCycleFromNiveau(cNom);
                                setDossier({
                                  ...dossier,
                                  classeId: val,
                                  classeNom: cNom,
                                  cycle: cCycle,
                                });
                              }}
                            >
                              <SelectTrigger className="mt-1 font-bold text-indigo-600">
                                <SelectValue placeholder="Sélectionner la classe" />
                              </SelectTrigger>
                              <SelectContent>
                                {(() => {
                                  const dCycle = dossier.cycle || "";
                                  const filteredClassesForCycle =
                                    classes.filter((c: any) => {
                                      const cLib = (
                                        c.CE_LIBELLE ||
                                        c.name ||
                                        ""
                                      ).toUpperCase();
                                      if (
                                        dCycle.includes("Collège 1er Cycle") ||
                                        dCycle === "Collège 1er Cycle" ||
                                        (dCycle.includes("Collège") &&
                                          !dCycle.includes("2nd"))
                                      ) {
                                        return (
                                          cLib.includes("6") ||
                                          cLib.includes("5") ||
                                          cLib.includes("4") ||
                                          cLib.includes("3")
                                        );
                                      }
                                      if (
                                        dCycle.includes("Collège 2nd cycle") ||
                                        dCycle.includes("2nd")
                                      ) {
                                        return (
                                          cLib.includes("2ND") ||
                                          cLib.includes("2E") ||
                                          cLib.includes("1ERE") ||
                                          cLib.includes("1ER") ||
                                          cLib.includes("TLE") ||
                                          cLib.includes("TERM")
                                        );
                                      }
                                      if (dCycle === "Primaire") {
                                        return (
                                          cLib.includes("CP") ||
                                          cLib.includes("CE") ||
                                          cLib.includes("CM")
                                        );
                                      }
                                      if (dCycle === "Maternelle") {
                                        return (
                                          cLib.includes("MAT") ||
                                          cLib.includes("PS") ||
                                          cLib.includes("MS") ||
                                          cLib.includes("GS")
                                        );
                                      }
                                      return true;
                                    });

                                  const listToDisplay =
                                    filteredClassesForCycle.length > 0
                                      ? filteredClassesForCycle
                                      : classes;
                                  return listToDisplay.map((c: any) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                      {c.CE_LIBELLE ||
                                        c.name ||
                                        `Classe ${c.id}`}
                                    </SelectItem>
                                  ));
                                })()}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="w-full sm:w-1/2 text-left sm:text-right">
                            <p className="text-[11px] text-slate-500">
                              Cycle Détecté :
                            </p>
                            <Badge
                              className={`mt-1 text-xs font-bold ${getCycleBadgeColor(dossier.cycle)}`}
                            >
                              {dossier.cycle}
                            </Badge>
                          </div>
                        </div>

                        {/* OFFICIAL COLLEGE / LYCÉE CASH PAYMENTS GRID FILTERED BY CYCLE */}
                        {(dossier.cycle.includes("Collège 1er Cycle") ||
                          dossier.cycle === "Collège 1er Cycle") && (
                          <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-2 text-xs">
                            <div className="flex items-center justify-between font-bold text-indigo-950">
                              <span className="flex items-center gap-1.5">
                                <DollarSign className="w-4 h-4 text-indigo-600" />{" "}
                                Tarifs Officiels Espèces (Collège 1er Cycle
                                Hînneh)
                              </span>
                              <Badge className="bg-indigo-600 text-white text-[10px]">
                                1er Cycle Collège
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-1 font-medium text-[11px]">
                              <div
                                className={`p-2.5 rounded-lg border bg-white ${dossier.niveau.includes("6") || dossier.niveau.includes("5") || dossier.niveau.includes("4") ? "border-indigo-600 ring-2 ring-indigo-500 font-extrabold shadow-2xs" : "border-slate-200"}`}
                              >
                                <span className="block text-[10px] text-slate-500">
                                  6è, 5è & 4è
                                </span>
                                <strong className="text-indigo-950 font-bold text-xs">
                                  19 000 F CFA
                                </strong>
                              </div>
                              <div
                                className={`p-2.5 rounded-lg border bg-white ${dossier.niveau.includes("3") ? "border-indigo-600 ring-2 ring-indigo-500 font-extrabold shadow-2xs" : "border-slate-200"}`}
                              >
                                <span className="block text-[10px] text-slate-500">
                                  3ème
                                </span>
                                <strong className="text-indigo-950 font-bold text-xs">
                                  22 000 F CFA
                                </strong>
                              </div>
                            </div>
                          </div>
                        )}

                        {(dossier.cycle.includes("Collège 2nd cycle") ||
                          dossier.cycle.includes("2nd")) && (
                          <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-2 text-xs">
                            <div className="flex items-center justify-between font-bold text-indigo-950">
                              <span className="flex items-center gap-1.5">
                                <DollarSign className="w-4 h-4 text-indigo-600" />{" "}
                                Tarifs Officiels Espèces (Collège 2nd cycle
                                Hînneh)
                              </span>
                              <Badge className="bg-indigo-600 text-white text-[10px]">
                                Collège 2nd cycle
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-1 font-medium text-[11px]">
                              <div
                                className={`p-2.5 rounded-lg border bg-white ${dossier.niveau.includes("2") || dossier.niveau.includes("1") ? "border-indigo-600 ring-2 ring-indigo-500 font-extrabold shadow-2xs" : "border-slate-200"}`}
                              >
                                <span className="block text-[10px] text-slate-500">
                                  2nd & 1ère
                                </span>
                                <strong className="text-indigo-950 font-bold text-xs">
                                  19 500 F CFA
                                </strong>
                              </div>
                              <div
                                className={`p-2.5 rounded-lg border bg-white ${dossier.niveau.includes("Tle") || dossier.niveau.includes("term") ? "border-indigo-600 ring-2 ring-indigo-500 font-extrabold shadow-2xs" : "border-slate-200"}`}
                              >
                                <span className="block text-[10px] text-slate-500">
                                  Tle (Terminale)
                                </span>
                                <strong className="text-indigo-950 font-bold text-xs">
                                  25 500 F CFA
                                </strong>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* OFFICIAL PRIMAIRE & MATERNELLE CASH PAYMENTS GRID */}
                        {(dossier.cycle === "Primaire" ||
                          dossier.cycle === "Maternelle") && (
                          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 text-xs">
                            <div className="flex items-center justify-between font-bold text-amber-950">
                              <span className="flex items-center gap-1.5">
                                <DollarSign className="w-4 h-4 text-amber-600" />{" "}
                                Tarifs Officiels Paiement en Espèces (Primaire /
                                Maternelle Hînneh)
                              </span>
                              <Badge className="bg-amber-600 text-white text-[10px]">
                                Fiche Officielle Primaire
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-medium text-[11px]">
                              <div
                                className={`p-2 rounded-lg border bg-white ${dossier.typeInscription === "inscription" && !dossier.niveau.toLowerCase().includes("cm2") ? "border-amber-600 ring-2 ring-amber-500 font-extrabold shadow-2xs" : "border-slate-200"}`}
                              >
                                <span className="block text-[10px] text-slate-500">
                                  Nouveaux Élèves (CP1 au CM1)
                                </span>
                                <strong className="text-amber-950 font-bold text-xs">
                                  29 500 F CFA
                                </strong>
                              </div>
                              <div
                                className={`p-2 rounded-lg border bg-white ${dossier.typeInscription === "reinscription" && !dossier.niveau.toLowerCase().includes("cm2") ? "border-amber-600 ring-2 ring-amber-500 font-extrabold shadow-2xs" : "border-slate-200"}`}
                              >
                                <span className="block text-[10px] text-slate-500">
                                  Anciens Élèves (CP1 au CM1)
                                </span>
                                <strong className="text-amber-950 font-bold text-xs">
                                  28 500 F CFA
                                </strong>
                              </div>
                              <div
                                className={`p-2 rounded-lg border bg-white ${dossier.niveau.toLowerCase().includes("cm2") ? "border-amber-600 ring-2 ring-amber-500 font-extrabold shadow-2xs" : "border-slate-200"}`}
                              >
                                <span className="block text-[10px] text-slate-500">
                                  Classe de CM2
                                </span>
                                <strong className="text-amber-950 font-bold text-xs">
                                  32 000 F CFA
                                </strong>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* CHECKABLE FEE OPTIONS LIST — DYNAMIC */}
                        <div className="space-y-2.5 p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                          <div className="flex justify-between items-center pb-2 border-b border-emerald-200">
                            <span className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                              <CheckSquare className="w-4 h-4 text-emerald-600" />{" "}
                              Éléments de Règlement à la Caisse (Champs à
                              Cocher)
                            </span>
                            {/* <span className="text-xs font-extrabold text-emerald-800">
                              Total Sélectionné :{" "}
                              {formatCurrency(dossier.montantVersement)}
                            </span> */}
                          </div>

                          {/* Statut / Cycle Summary */}
                          <div className="flex flex-wrap gap-2 pb-2 text-[10px]">
                            <Badge className="bg-indigo-100 text-indigo-800 border border-indigo-300">
                              {dossier.qualiteEleve}
                            </Badge>
                            <Badge className="bg-blue-100 text-blue-800 border border-blue-300">
                              <pre>{dossier.statutOrientation}</pre>
                            </Badge>
                            <Badge
                              className={`${getCycleBadgeColor(dossier.cycle)}`}
                            >
                              {dossier.cycle}
                            </Badge>
                            {dossier.priseEnCharge && (
                              <Badge className="bg-violet-100 text-violet-800 border border-violet-300">
                                🎓 Prise en charge :{" "}
                                {dossier.originePriseEnCharge || "Oui"}
                              </Badge>
                            )}
                          </div>

                          {dossier.priseEnCharge && (
                            <div className="flex items-start gap-2 p-2.5 bg-violet-50 border border-violet-200 rounded-lg text-xs text-violet-900">
                              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-violet-600" />
                              <span>
                                <strong>Prise en charge active :</strong> Le
                                versement de scolarité est couvert par{" "}
                                <strong>
                                  {dossier.originePriseEnCharge ||
                                    "l'organisme de prise en charge"}
                                </strong>
                                . Seuls les frais annexes restent à la charge de
                                la famille.
                              </span>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                            {getFeeItems(dossier).map((item) => {
                              const isScolarite = item.key === "scolarite";
                              const isPrisEnChargeScol =
                                dossier.priseEnCharge && isScolarite;
                              return (
                                <label
                                  key={item.key}
                                  className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer hover:border-emerald-400 ${
                                    isScolarite
                                      ? "bg-emerald-100/60 border-emerald-300 sm:col-span-2"
                                      : "bg-white border-slate-200"
                                  } ${isPrisEnChargeScol ? "opacity-60" : ""}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={item.checked}
                                      onChange={() =>
                                        handleToggleFeeComponent(item.feeKey)
                                      }
                                      className="w-4 h-4 accent-emerald-600 rounded"
                                      disabled={isPrisEnChargeScol}
                                    />
                                    <span
                                      className={
                                        isScolarite
                                          ? "font-bold text-emerald-950"
                                          : ""
                                      }
                                    >
                                      {item.label}
                                      {isPrisEnChargeScol && (
                                        <span className="ml-1.5 text-violet-600 text-[10px]">
                                          (Couvert par prise en charge)
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  <span
                                    className={`font-bold ${isPrisEnChargeScol ? "line-through text-slate-400" : isScolarite ? "text-emerald-900" : "text-slate-700"}`}
                                  >
                                    {formatCurrency(item.amount)}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* Payment mode & Reference */}
                        <div className="grid grid-cols-1 gap-4 p-3 bg-slate-50 rounded-xl text-xs">
                          {/* <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl text-xs"> */}
                          <div>
                            <Label className="text-[11px]">
                              Mode de Règlement
                            </Label>
                            <Select
                              value={dossier.modeReglement}
                              onValueChange={(v) =>
                                setDossier({ ...dossier, modeReglement: v })
                              }
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {/* <SelectItem value="coris_bank">
                                  Coris Bank (Dépôt / Virement)
                                </SelectItem> */}
                                <SelectItem value="especes">Espèces</SelectItem>
                                {/* <SelectItem value="mobile_money">
                                  Mobile Money (Wave/Orange/MTN)
                                </SelectItem>
                                <SelectItem value="cheque">
                                  Chèque / Virement bancaire (Coris Bank)
                                </SelectItem> */}
                              </SelectContent>
                            </Select>
                          </div>
                          {/* <div>
                            <Label className="text-[11px]">
                              N° Transaction / Référence
                            </Label>
                            <Input
                              value={dossier.numeroTransaction}
                              onChange={(e) =>
                                setDossier({
                                  ...dossier,
                                  numeroTransaction: e.target.value,
                                })
                              }
                              placeholder="Optionnel"
                              className="mt-1"
                            />
                          </div> */}
                        </div>

                        {/* STEP 7 VALIDATION BUTTON */}
                        <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <span className="text-xs font-semibold text-emerald-950">
                            Guichet : <strong>Service Caisse (Étape 7)</strong>
                          </span>
                          <Button
                            size="sm"
                            onClick={() => handleValidateStep(7)}
                            className={`text-xs gap-1.5 font-bold ${dossier.validatedSteps.includes(7) ? "bg-emerald-600" : "bg-indigo-600"} text-white`}
                          >
                            <Save className="w-3.5 h-3.5" />{" "}
                            {dossier.validatedSteps.includes(7)
                              ? "Étape 7 Enregistrée (Caisse)"
                              : "Enregistrer Étape 7 (Service Caisse)"}
                          </Button>
                        </div>

                        <div className="flex justify-between pt-2">
                          <Button
                            variant="outline"
                            onClick={() => setActiveTab("phase2")}
                          >
                            <ChevronLeft className="w-4 h-4" /> Précédent
                          </Button>
                          <Button
                            onClick={() => setActiveTab("phase4")}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                          >
                            Passer à la Phase 4 : Impression & Billet{" "}
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* PHASE 4 : IMPRESSION, EFFETS, BILLET & ARCHIVAGE (ÉTAPES 8 à 11) */}
                  <TabsContent value="phase4" className="mt-4 space-y-4">
                    <Card>
                      <CardHeader className="pb-3 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                        <CardTitle className="text-sm font-bold text-indigo-600 flex items-center gap-2">
                          <Ticket className="w-4 h-4" /> Phase 4 : Impression,
                          Remise d'Effets & Billet (Étapes 8 à 11)
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Délivrance de la fiche d'inscription, remise du
                          matériel et du billet d'entrée.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-5 space-y-4">
                        {/* STEP CARDS FOR 8, 9, 10, 11 */}
                        <div className="space-y-3">
                          {/* Step 8 */}
                          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                            <div>
                              <p className="font-bold text-xs text-slate-900">
                                Étape 8 : Impression Fiche d'Inscription Éléve
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Service en charge : Secrétariat / Caisse
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleValidateStep(8)}
                              className={`text-xs gap-1.5 ${dossier.validatedSteps.includes(8) ? "bg-emerald-600" : "bg-indigo-600"} text-white`}
                            >
                              <Save className="w-3.5 h-3.5" />{" "}
                              {dossier.validatedSteps.includes(8)
                                ? "Enregistré"
                                : "Enregistrer Étape 8"}
                            </Button>
                          </div>

                          {/* Step 9 */}
                          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                            <div>
                              <p className="font-bold text-xs text-slate-900">
                                Étape 9 : Remise des Fournitures & Effets
                                Scolaires (Tenue EPS, Voiles, Cravate, Carnet,
                                Polo)
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Service en charge : Service Intendance / Magasin
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleValidateStep(9)}
                              className={`text-xs gap-1.5 ${dossier.validatedSteps.includes(9) ? "bg-emerald-600" : "bg-indigo-600"} text-white`}
                            >
                              <Save className="w-3.5 h-3.5" />{" "}
                              {dossier.validatedSteps.includes(9)
                                ? "Enregistré"
                                : "Enregistrer Étape 9"}
                            </Button>
                          </div>

                          {/* Step 10 */}
                          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                            <div>
                              <p className="font-bold text-xs text-slate-900">
                                Étape 10 : Retrait du Billet d'Entrée Officiel +
                                Enregistrement WhatsApp Parent
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Service en charge : Direction des Études
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleValidateStep(10)}
                              className={`text-xs gap-1.5 ${dossier.validatedSteps.includes(10) ? "bg-emerald-600" : "bg-indigo-600"} text-white`}
                            >
                              <Save className="w-3.5 h-3.5" />{" "}
                              {dossier.validatedSteps.includes(10)
                                ? "Enregistré"
                                : "Enregistrer Étape 10"}
                            </Button>
                          </div>

                          {/* Step 11 */}
                          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                            <div>
                              <p className="font-bold text-xs text-slate-900">
                                Étape 11 : Rangement et Archivage Définitif du
                                Dossier Élève
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Service en charge : Service Archivage
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleValidateStep(11)}
                              className={`text-xs gap-1.5 ${dossier.validatedSteps.includes(11) ? "bg-emerald-600" : "bg-indigo-600"} text-white`}
                            >
                              <Save className="w-3.5 h-3.5" />{" "}
                              {dossier.validatedSteps.includes(11)
                                ? "Enregistré"
                                : "Enregistrer Étape 11"}
                            </Button>
                          </div>
                        </div>

                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 rounded-xl space-y-2">
                          <p className="font-bold text-xs text-emerald-900 dark:text-emerald-300">
                            Validation Finale du Dossier & Billet
                          </p>
                          <p className="text-xs text-emerald-700 dark:text-emerald-400">
                            En cliquant sur le bouton ci-dessous, le système va
                            :
                            <br />- 1) Clôturer les 11 étapes d'inscription de{" "}
                            {dossier.elevePrenom} {dossier.eleveNom} (Cycle{" "}
                            {dossier.cycle}).
                            <br />- 2) Générer son versement de{" "}
                            {formatCurrency(dossier.montantVersement)} et son
                            reçu de caisse.
                            <br />- 3) Éditer son **Billet d'Entrée Officiel**
                            (Moussa SANGARE).
                          </p>
                        </div>

                        <div className="flex justify-between pt-2">
                          <Button
                            variant="outline"
                            onClick={() => setActiveTab("phase3")}
                          >
                            <ChevronLeft className="w-4 h-4" /> Précédent
                          </Button>
                          <Button
                            onClick={handleFinalizeRegistration}
                            disabled={
                              saving ||
                              !dossier.classeId ||
                              dossier.validatedSteps.length === 11
                            }
                            className={
                              dossier.validatedSteps.length === 11
                                ? "bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold px-6 py-5 text-sm gap-2 shadow-none cursor-not-allowed"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-5 text-sm gap-2 shadow-lg"
                            }
                          >
                            {dossier.validatedSteps.length === 11
                              ? "Dossier Déjà Finalisé (11 Étapes Validées)"
                              : saving
                                ? "Validation en cours..."
                                : "Finaliser & Générer Billet d'Entrée Officiel"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </div>

        {/* MODAL BILLET D'ENTRÉE OFFICIEL (EXACT SCREENSHOT LAYOUT MATCH) */}
        <Dialog open={openBilletModal} onOpenChange={setOpenBilletModal}>
          <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
            <DialogHeader className="dialog-header">
              <DialogTitle className="flex items-center gap-2 text-emerald-600 font-bold">
                <Ticket className="w-5 h-5" /> Billet d'Entrée Officiel — Groupe
                Scolaire Hînneh
              </DialogTitle>
              <DialogDescription>
                Billet d'accès en classe délivré à l'élève après validation de
                l'inscription (Année 2026-2027).
              </DialogDescription>
            </DialogHeader>

            {/* PRINTABLE BILLET TICKET CONTAINER */}
            <div
              id="printable-billet"
              className="p-6 sm:p-7 bg-white border-2 border-[#1e293b] rounded-3xl shadow-sm text-slate-900 font-sans space-y-4 relative overflow-hidden"
            >
              {/* Top Right Green Stamp */}
              <div className="absolute top-3 right-3 border-2 border-[#10b981] text-[#059669] font-extrabold text-[11px] uppercase px-3 py-1 rotate-[8deg] opacity-90 rounded-lg tracking-wider bg-white shadow-2xs">
                INSCRIPTION VALIDÉE
              </div>

              {/* Header with School Logo & Pill Badge */}
              <div className="text-center space-y-1.5 pt-1">
                <img
                  src="/images/hinneh_logo_20260507_234919.png"
                  alt="Logo Hînneh"
                  className="w-16 h-16 object-contain mx-auto mb-1.5"
                />
                <h3 className="text-base font-extrabold uppercase text-[#1e1b4b] tracking-tight">
                  GROUPE SCOLAIRE CONFESSIONNEL HÎNNEH
                </h3>
                <p className="text-[11px] text-[#64748b] font-semibold">
                  Abobo–Biabou — Abidjan, Côte d'Ivoire
                </p>
                <div className="mt-2 inline-block bg-[#0f172a] text-white text-[11px] font-extrabold px-5 py-1.5 rounded-full uppercase tracking-wider">
                  BILLET D'ENTRÉE EN CLASSE — 2026–2027
                </div>
              </div>

              <hr className="border-slate-200/80 my-3" />

              {/* Student Card Block */}
              <div className="flex items-center gap-4 bg-[#f8fafc] p-4 rounded-2xl border border-slate-200/80">
                <div className="w-20 h-20 rounded-2xl border-2 border-[#6366f1] bg-[#e0e7ff] text-[#4338ca] flex items-center justify-center overflow-hidden shrink-0 font-extrabold text-2xl shadow-xs">
                  {dossier?.photoUrl ? (
                    <img
                      src={dossier.photoUrl}
                      alt="Photo Élève"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    `${dossier?.elevePrenom?.[0] || ""}${dossier?.eleveNom?.[0] || ""}` ||
                    "AB"
                  )}
                </div>
                <div className="space-y-1 text-xs">
                  <h4 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">
                    {dossier?.elevePrenom || "ABOULAYE"}{" "}
                    {dossier?.eleveNom || "BERTHE"}
                  </h4>
                  <p className="font-semibold text-[#4f46e5]">
                    Matricule :{" "}
                    <span className="font-extrabold text-[#1e1b4b]">
                      {dossier?.matricule || "24166304U"}
                    </span>
                  </p>
                  <p className="font-bold text-slate-800">
                    Classe d'Affectation :{" "}
                    <span className="font-extrabold text-[#4338ca]">
                      {dossier?.classeNom || dossier?.niveau || "3ème B"} (
                      {dossier?.cycle})
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    N° WhatsApp Parent :{" "}
                    <span className="font-bold text-slate-700">
                      {dossier?.parentTel || "Non renseigné"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Authorization Statement Box */}
              <div className="p-4 bg-[#ecfdf5] border border-[#a7f3d0] rounded-2xl text-center space-y-1">
                <p className="text-xs font-bold text-[#065f46] flex items-center justify-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 bg-[#10b981] text-white text-[10px] rounded font-bold">
                    ✓
                  </span>
                  L'élève est dûment inscrit et AUTORISÉ à intégrer la classe de{" "}
                  <span className="font-extrabold">
                    {dossier?.classeNom || dossier?.niveau || "3ème B"}
                  </span>
                  .
                </p>
                <p className="text-[11px] text-[#047857] font-medium">
                  Billet à présenter impérativement à l'enseignant le jour de la
                  rentrée.
                </p>
              </div>

              {/* Billet Code & Signatures */}
              <div className="flex justify-between items-end pt-3 text-[11px] text-slate-600">
                <div>
                  <p className="font-mono text-xs font-bold text-slate-800">
                    {dossier?.billetNumber || "BIL-MS3NSMXJ"}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Délivré le {new Date().toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="text-center font-bold">
                  <p className="text-slate-700 text-[11px]">
                    Le Directeur des Études
                  </p>
                  <p className="text-[#1e1b4b] font-extrabold text-xs mt-4">
                    Moussa SANGARE
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="dialog-footer flex gap-2">
              <Button
                variant="outline"
                onClick={() => setOpenBilletModal(false)}
              >
                Fermer
              </Button>
              <Button
                onClick={triggerDirectPrint}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
              >
                <Printer className="w-4 h-4" /> Imprimer le Billet d'Entrée
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL LIVE CAMERA CAPTURE */}
        <Dialog open={openCameraModal} onOpenChange={setOpenCameraModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-indigo-600">
                <Camera className="w-5 h-5" /> Capture Photo Live (Caméra /
                Webcam)
              </DialogTitle>
              <DialogDescription>
                Ajustez le visage de l'élève au centre puis cliquez sur
                "Capturer la Photo".
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-center">
              <div className="relative w-full aspect-square max-w-[320px] mx-auto bg-black rounded-2xl overflow-hidden border-4 border-indigo-600 shadow-lg flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {cameraLoading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs gap-2">
                    <Clock className="w-4 h-4 animate-spin" /> Activation de la
                    caméra...
                  </div>
                )}
                <div className="absolute border-2 border-dashed border-white/70 rounded-full w-48 h-60 pointer-events-none" />
              </div>

              <div className="flex justify-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFacingMode((prev) =>
                      prev === "user" ? "environment" : "user",
                    )
                  }
                  className="text-xs gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Basculer Caméra (
                  {facingMode === "user" ? "Avant" : "Arrière"})
                </Button>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setOpenCameraModal(false);
                  photoInputRef.current?.click();
                }}
                className="text-xs"
              >
                📁 Importer Fichier Image
              </Button>
              <Button
                onClick={capturePhotoFromCamera}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
              >
                📸 Capturer la Photo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL CREATION RAPIDE ÉLÈVE */}
        <Dialog
          open={openNewCandidateModal}
          onOpenChange={setOpenNewCandidateModal}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600">
                <Plus className="w-5 h-5" /> Saisie Rapide d'un Nouvel Élève
              </DialogTitle>
              <DialogDescription>
                Créez le dossier d'un élève avec son profil administratif
                complet (Qualité, Orientation, Prise en charge).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="newPrenom">Prénom *</Label>
                  <Input
                    id="newPrenom"
                    placeholder="Ex: Jean"
                    value={newPrenom}
                    onChange={(e) => setNewPrenom(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="newNom">Nom *</Label>
                  <Input
                    id="newNom"
                    placeholder="Ex: KOUASSI"
                    value={newNom}
                    onChange={(e) => setNewNom(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="newGenre">Genre *</Label>
                  <Select value={newGenre} onValueChange={setNewGenre}>
                    <SelectTrigger id="newGenre" className="mt-1 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Garçon (M)</SelectItem>
                      <SelectItem value="F">Fille (F)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="newDateNaissance">Date de Naissance *</Label>
                  <Input
                    id="newDateNaissance"
                    type="date"
                    value={newDateNaissance}
                    onChange={(e) => setNewDateNaissance(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="newQualite">Qualité Élève *</Label>
                  <Select
                    value={newQualiteEleve}
                    onValueChange={(val: any) => setNewQualiteEleve(val)}
                  >
                    <SelectTrigger id="newQualite" className="mt-1 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Non Redoublant(e)">
                        Non Redoublant(e)
                      </SelectItem>
                      <SelectItem value="Redoublant(e)">
                        Redoublant(e)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="newStatutOrientation">
                    Statut Orientation *
                  </Label>
                  <Select
                    value={newStatutOrientation}
                    onValueChange={setNewStatutOrientation}
                  >
                    <SelectTrigger
                      id="newStatutOrientation"
                      className="mt-1 text-xs"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Affecté par l'État">
                        Affecté par l'État
                      </SelectItem>
                      <SelectItem value="Non Affecté (Payant)">
                        Non Affecté (Payant)
                      </SelectItem>
                      <SelectItem value="Réaffecté">Réaffecté</SelectItem>
                      <SelectItem value="Transfert d'établissement">
                        Transfert d'établissement
                      </SelectItem>
                      <SelectItem value="Régularisation">
                        Régularisation
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="newClasse">
                  Classe Souhaitée / Affectation *
                </Label>
                <Select value={newClasseId} onValueChange={setNewClasseId}>
                  <SelectTrigger id="newClasse" className="mt-1 text-xs">
                    <SelectValue placeholder="Choisir une classe" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.CE_LIBELLE || c.name || `Classe ${c.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="newPhone">
                  Numéro WhatsApp du Parent / Tuteur *
                </Label>
                <Input
                  id="newPhone"
                  placeholder="Ex: 0700000000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              {/* Prise en Charge */}
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
                <label className="flex items-center justify-between cursor-pointer font-bold text-indigo-900">
                  <span>Élève avec Prise en charge ?</span>
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-indigo-600 rounded"
                    checked={newPriseEnCharge}
                    onChange={(e) => setNewPriseEnCharge(e.target.checked)}
                  />
                </label>

                {newPriseEnCharge && (
                  <div>
                    <Label className="text-[11px] font-bold text-indigo-950">
                      Origine & Nature de la Prise en charge *
                    </Label>
                    <Input
                      placeholder="Organisme, Fondation, Ministère..."
                      value={newOriginePriseEnCharge}
                      onChange={(e) =>
                        setNewOriginePriseEnCharge(e.target.value)
                      }
                      className="mt-1 text-xs bg-white border-indigo-300"
                    />
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpenNewCandidateModal(false)}
              >
                Annuler
              </Button>
              <Button
                onClick={handleCreateCandidateSubmit}
                disabled={creatingCandidate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {creatingCandidate
                  ? "Création..."
                  : "Créer & Démarrer l'Inscription"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL FICHE DE VALIDATION INSCRIPTION OFFICIELLE (11 ÉTAPES) */}
        <Dialog open={openFicheModal} onOpenChange={setOpenFicheModal}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="dialog-header">
              <DialogTitle className="flex items-center gap-2 text-indigo-600">
                <FileText className="w-5 h-5" /> Fiche de Validation Officielle
                (11 Étapes) — Groupe Scolaire Hînneh
              </DialogTitle>
              <DialogDescription>
                Fiche officielle de validation en 11 étapes conforme aux
                imprimés Hînneh (Année 2026-2027).
              </DialogDescription>
            </DialogHeader>

            {/* PRINTABLE FICHE CONTAINER */}
            <div
              id="printable-fiche"
              className="p-8 bg-white border border-slate-300 text-slate-900 space-y-4 rounded-xl shadow-inner text-xs font-sans"
            >
              {/* HEADER WITH LOGO */}
              <div className="flex justify-between items-center border-b-2 border-slate-900 pb-3">
                <div className="flex items-center gap-3">
                  <img
                    src="/images/hinneh_logo_20260507_234919.png"
                    alt="Logo Hînneh"
                    className="w-14 h-14 object-contain shrink-0"
                  />
                  <div>
                    <h2 className="text-sm font-extrabold uppercase text-slate-900">
                      Groupe Scolaire Confessionnel Hînneh
                    </h2>
                    <p className="text-[10px] text-slate-600 font-semibold">
                      Abobo-Biabou — Abidjan, Côte d'Ivoire
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase">
                    Année scolaire : 2026-2027
                  </h3>
                  <div className="bg-indigo-950 text-white font-bold text-[11px] px-3 py-1 rounded mt-1 uppercase">
                    FICHE DE VALIDATION INSCRIPTION & REINSCRIPTION (
                    {dossier?.cycle})
                  </div>
                </div>
              </div>

              {/* ELEVE METADATA HEADER WITH QUALITÉ, ORIENTATION & PRISE EN CHARGE */}
              <div className="grid grid-cols-3 gap-3 bg-slate-100 p-3 rounded-lg border border-slate-300">
                <div>
                  <p className="font-semibold text-[11px]">
                    NOMS ET PRÉNOMS DE L'ÉLÈVE :{" "}
                    <span className="font-bold text-indigo-900 text-xs">
                      {dossier?.elevePrenom} {dossier?.eleveNom}
                    </span>
                  </p>
                  <p className="font-semibold text-[11px] mt-1">
                    N° WHATSAPP DU PARENT :{" "}
                    <span className="font-bold text-slate-900">
                      {dossier?.parentTel || "Non renseigné"}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-[11px]">
                    CLASSE & CYCLE :{" "}
                    <span className="font-bold text-indigo-900 text-xs">
                      {dossier?.classeNom || dossier?.niveau} ({dossier?.cycle})
                    </span>
                  </p>
                  <p className="font-semibold text-[11px] mt-1">
                    QUALITÉ ÉLÈVE :{" "}
                    <span className="font-bold text-slate-900">
                      {dossier?.qualiteEleve || "Non Redoublant(e)"}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-[11px]">
                    STATUT ORIENTATION :{" "}
                    <span className="font-bold text-slate-900">
                      {dossier?.statutOrientation || "Affecté par l'État"}
                    </span>
                  </p>
                  <p className="font-semibold text-[11px] mt-1">
                    PRISE EN CHARGE :{" "}
                    <span className="font-bold text-indigo-900">
                      {dossier?.priseEnCharge
                        ? `OUI (${dossier?.originePriseEnCharge || "Oui"})`
                        : "NON"}
                    </span>
                  </p>
                </div>
              </div>

              {/* TABLE OF 11 STEPS */}
              <table className="w-full text-left border-collapse border border-slate-400 text-[11px]">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-400">
                    <th className="p-2 w-8 text-center border-r border-slate-400">
                      N°
                    </th>
                    <th className="p-2 border-r border-slate-400">
                      LES ÉTAPES DE L'INSCRIPTION
                    </th>
                    <th className="p-2 border-r border-slate-400 w-56">
                      SERVICES EN CHARGE
                    </th>
                    <th className="p-2 text-center w-36">SIGNATURE & STATUT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  <tr className="border-b border-slate-300">
                    <td className="p-2 text-center font-bold border-r border-slate-300">
                      1
                    </td>
                    <td className="p-2 border-r border-slate-300 font-medium">
                      Renseignements / Inscription en ligne: (3000F) -
                      Vérifications des dossiers
                    </td>
                    <td className="p-2 border-r border-slate-300 font-semibold text-slate-800">
                      Accueil & Orientation
                    </td>
                    <td className="p-2 text-center font-semibold text-emerald-700">
                      {dossier?.validatedSteps.includes(1)
                        ? "✅ Enregistré"
                        : "⏳ En cours"}
                    </td>
                  </tr>

                  <tr className="border-b border-slate-300">
                    <td className="p-2 text-center font-bold border-r border-slate-300">
                      2
                    </td>
                    <td className="p-2 border-r border-slate-300 font-medium">
                      Achats / Présentation tenues scolaires & chaussures en bon
                      état
                    </td>
                    <td className="p-2 border-r border-slate-300 font-semibold text-slate-800">
                      Vie Scolaire
                    </td>
                    <td className="p-2 text-center font-semibold text-emerald-700">
                      {dossier?.validatedSteps.includes(2)
                        ? "✅ Enregistré"
                        : "⏳ En cours"}
                    </td>
                  </tr>

                  <tr className="border-b border-slate-300">
                    <td className="p-2 text-center font-bold border-r border-slate-300">
                      3
                    </td>
                    <td className="p-2 border-r border-slate-300 font-medium">
                      Dépôt de kits fourniture (Papier hygiénique, rames,
                      marqueurs)
                    </td>
                    <td className="p-2 border-r border-slate-300 font-semibold text-slate-800">
                      Matériel & Logistique
                    </td>
                    <td className="p-2 text-center font-semibold text-emerald-700">
                      {dossier?.validatedSteps.includes(3)
                        ? "✅ Enregistré"
                        : "⏳ En cours"}
                    </td>
                  </tr>

                  <tr className="border-b border-slate-300">
                    <td className="p-2 text-center font-bold border-r border-slate-300">
                      4
                    </td>
                    <td className="p-2 border-r border-slate-300 font-medium">
                      Remplissage des fiches (Fiches santé & renseignements)
                    </td>
                    <td className="p-2 border-r border-slate-300 font-semibold text-slate-800">
                      Service Santé
                    </td>
                    <td className="p-2 text-center font-semibold text-emerald-700">
                      {dossier?.validatedSteps.includes(4)
                        ? "✅ Enregistré"
                        : "⏳ En cours"}
                    </td>
                  </tr>

                  <tr className="border-b border-slate-300">
                    <td className="p-2 text-center font-bold border-r border-slate-300">
                      5
                    </td>
                    <td className="p-2 border-r border-slate-300 font-medium">
                      Saisie des informations de chaque élève dans le logiciel
                    </td>
                    <td className="p-2 border-r border-slate-300 font-semibold text-slate-800">
                      Secrétariat Scolaire
                    </td>
                    <td className="p-2 text-center font-semibold text-emerald-700">
                      {dossier?.validatedSteps.includes(5)
                        ? "✅ Enregistré"
                        : "⏳ En cours"}
                    </td>
                  </tr>

                  <tr className="border-b border-slate-300">
                    <td className="p-2 text-center font-bold border-r border-slate-300">
                      6
                    </td>
                    <td className="p-2 border-r border-slate-300 font-medium">
                      Prise de photo d'identité numérique
                    </td>
                    <td className="p-2 border-r border-slate-300 font-semibold text-slate-800">
                      Service Photographie
                    </td>
                    <td className="p-2 text-center font-semibold text-emerald-700">
                      {dossier?.validatedSteps.includes(6)
                        ? "✅ Enregistré"
                        : "⏳ En cours"}
                    </td>
                  </tr>

                  <tr className="border-b border-slate-300 bg-slate-50">
                    <td className="p-2 text-center font-bold border-r border-slate-300">
                      7
                    </td>
                    <td className="p-2 border-r border-slate-300 font-medium space-y-1">
                      <div>
                        <strong>Paiement de la scolarité & frais :</strong>{" "}
                        Total Encaissé :{" "}
                        <strong>
                          {formatCurrency(dossier?.montantVersement || 0)}
                        </strong>
                      </div>
                      {dossier?.cycle?.includes("Collège") && (
                        <div className="text-[10px] text-slate-700 pt-1 space-y-0.5 font-medium border-t border-slate-300 mt-1">
                          <p className="font-bold text-slate-900">
                            Grille Officielle Paiements (Collège) :
                          </p>
                          <p>
                            • Total à payer en espèces: <strong>19.000F</strong>{" "}
                            ( 6è, 5è & 4è )
                          </p>
                          <p>
                            • Total à payer en espèces: <strong>22.000F</strong>{" "}
                            ( 3ème )
                          </p>
                          <p>
                            • Total à payer en espèces: <strong>19.500F</strong>{" "}
                            ( 2nd & 1ère )
                          </p>
                          <p>
                            • Total à payer en espèces: <strong>25.500F</strong>{" "}
                            ( Tle )
                          </p>
                          <p>
                            • Total à payer par Mobile Money :
                            ....................................
                          </p>
                        </div>
                      )}
                      {(dossier?.cycle === "Primaire" ||
                        dossier?.cycle === "Maternelle") && (
                        <div className="text-[10px] text-slate-700 pt-1 space-y-0.5 font-medium border-t border-slate-300 mt-1">
                          <p className="font-bold text-slate-900">
                            PAIEMENTS: TOTAL À PAYER EN ESPÈCES (Primaire /
                            Maternelle) :
                          </p>
                          <p>
                            • Nouveaux Élèves (CP1 au CM1) :{" "}
                            <strong>29 500F</strong>
                          </p>
                          <p>
                            • Anciens élèves (CP1 au CM1) :{" "}
                            <strong>28 500F</strong>
                          </p>
                          <p>
                            • CM2 : <strong>32 000F</strong>
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="p-2 border-r border-slate-300 font-semibold text-slate-800">
                      Service Caisse
                    </td>
                    <td className="p-2 text-center font-semibold text-emerald-700">
                      {dossier?.validatedSteps.includes(7)
                        ? "✅ Encaissé"
                        : "⏳ En cours"}
                    </td>
                  </tr>

                  <tr className="border-b border-slate-300">
                    <td className="p-2 text-center font-bold border-r border-slate-300">
                      8
                    </td>
                    <td className="p-2 border-r border-slate-300 font-medium">
                      Impression fiche d'inscription élève
                    </td>
                    <td className="p-2 border-r border-slate-300 font-semibold text-slate-800">
                      Secrétariat / Caisse
                    </td>
                    <td className="p-2 text-center font-semibold text-emerald-700">
                      {dossier?.validatedSteps.includes(8)
                        ? "✅ Enregistré"
                        : "⏳ En cours"}
                    </td>
                  </tr>

                  <tr className="border-b border-slate-300">
                    <td className="p-2 text-center font-bold border-r border-slate-300">
                      9
                    </td>
                    <td className="p-2 border-r border-slate-300 font-medium">
                      Remise: 1 tenue de sport, 2 voiles, 1 cravate/noeud, 1
                      carnet de correspondance, polo
                    </td>
                    <td className="p-2 border-r border-slate-300 font-semibold text-slate-800">
                      Magasin / Intendance
                    </td>
                    <td className="p-2 text-center font-semibold text-emerald-700">
                      {dossier?.validatedSteps.includes(9)
                        ? "✅ Enregistré"
                        : "⏳ En cours"}
                    </td>
                  </tr>

                  <tr className="border-b border-slate-300">
                    <td className="p-2 text-center font-bold border-r border-slate-300">
                      10
                    </td>
                    <td className="p-2 border-r border-slate-300 font-medium">
                      Retrait du billet d'entrée + insertion numéro parent
                      whatsapp
                    </td>
                    <td className="p-2 border-r border-slate-300 font-semibold text-slate-800">
                      Direction des Études
                    </td>
                    <td className="p-2 text-center font-semibold text-emerald-700">
                      {dossier?.validatedSteps.includes(10)
                        ? "✅ Enregistré"
                        : "⏳ En cours"}
                    </td>
                  </tr>

                  <tr>
                    <td className="p-2 text-center font-bold border-r border-slate-300">
                      11
                    </td>
                    <td className="p-2 border-r border-slate-300 font-medium">
                      Rangement et archivage du dossier élève
                    </td>
                    <td className="p-2 border-r border-slate-300 font-semibold text-slate-800">
                      Service Archivage
                    </td>
                    <td className="p-2 text-center font-semibold text-emerald-700">
                      {dossier?.validatedSteps.includes(11)
                        ? "✅ Archivé"
                        : "⏳ En cours"}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* FOOTER & SIGNATURE */}
              <div className="pt-2 text-[10px] space-y-0.5 border-t border-slate-300 text-slate-700">
                <p>
                  <strong>N.B :</strong> * Les parents d'élèves sont invités au
                  strict respect de la procédure ci-dessus.
                </p>
                <p>
                  * La présence du parent et de l'enfant est obligatoire à
                  l'inscription.
                </p>
              </div>

              <div className="flex justify-between items-end pt-4">
                <div className="text-[10px] text-slate-500">
                  Fait à Abidjan, le {new Date().toLocaleDateString("fr-FR")}
                </div>
                <div className="text-center font-bold text-xs">
                  <p className="text-slate-800">Le Directeur des Études</p>
                  <p className="text-indigo-950 font-extrabold mt-6">
                    Moussa SANGARE
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="dialog-footer">
              <Button
                variant="outline"
                onClick={() => setOpenFicheModal(false)}
              >
                Fermer
              </Button>
              <Button
                onClick={triggerDirectPrint}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              >
                <Printer className="w-4 h-4" /> Imprimer Fiche Officielle
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL BILLET D'ENTRÉE OFFICIEL (DOUBLE COUPON HÎNNEH) */}
        <Dialog open={openBilletModal} onOpenChange={setOpenBilletModal}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="dialog-header">
              <DialogTitle className="flex items-center gap-2 text-emerald-700 font-bold">
                <Ticket className="w-5 h-5 text-emerald-600" /> Billet d'Entrée
                Officiel — Groupe Scolaire Hînneh
              </DialogTitle>
              <DialogDescription className="text-xs">
                Imprimé officiel du Billet d'Entrée en classe (Double Coupon
                avec cachet et signature).
              </DialogDescription>
            </DialogHeader>

            {/* PRINTABLE BILLET CONTAINER */}
            <div
              id="printable-billet"
              className="p-6 bg-white border border-slate-300 text-slate-900 space-y-6 rounded-xl shadow-xs font-sans text-xs"
            >
              {/* COUPON 1: EXEMPLAIRE ÉLÈVE / DIRECTION */}
              <div className="space-y-4 relative pb-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <img
                      src="/images/hinneh_logo_20260507_234919.png"
                      alt="Logo Hînneh"
                      className="w-12 h-12 object-contain shrink-0"
                    />
                    <div>
                      <h3 className="text-xs font-extrabold uppercase text-slate-900">
                        Groupe Scolaire Confessionnel Hînneh
                      </h3>
                      <p className="text-[9px] text-slate-600 font-semibold">
                        Abobo-Biabou — Abidjan, Côte d'Ivoire
                      </p>
                    </div>
                  </div>
                </div>

                {/* TITRE RECTANGULAIRE ENCADRÉ */}
                <div className="border-2 border-slate-900 text-center py-2 px-4 rounded-xs my-2">
                  <h2 className="text-base font-extrabold uppercase tracking-widest text-slate-900">
                    BILLET D'ENTREE
                  </h2>
                </div>

                {/* TEXTES OFFICIELS AVEC LIGNES POINTILLÉES */}
                <div className="space-y-3 text-xs pt-2">
                  <p className="leading-relaxed">
                    <span className="font-bold text-slate-900">L'élève :</span>{" "}
                    <span className="font-extrabold text-indigo-900 underline decoration-dotted underline-offset-4 text-sm uppercase">
                      {dossier?.elevePrenom} {dossier?.eleveNom}
                    </span>
                    <span className="text-slate-400 font-mono">
                      {" "}
                      (Matricule : {dossier?.matricule || "HE2026..."})
                    </span>
                  </p>

                  <p className="leading-relaxed">
                    <span className="font-bold text-slate-900">
                      Inscrit (e) en classe de :
                    </span>{" "}
                    <span className="font-extrabold text-indigo-900 underline decoration-dotted underline-offset-4 text-sm">
                      {dossier?.classeNom || dossier?.niveau || "CE1"}
                    </span>{" "}
                    est autorisé (e) à débuter les cours à compter du{" "}
                    <span className="font-bold underline decoration-dotted underline-offset-4">
                      {new Date().toLocaleDateString("fr-FR")}
                    </span>
                  </p>
                </div>

                {/* DATE & SIGNATURE DIRECTEUR DES ÉTUDES */}
                <div className="flex justify-between items-end pt-4">
                  <div className="text-[10px] text-slate-500">
                    <Badge
                      variant="outline"
                      className="text-[9px] border-emerald-300 text-emerald-800 bg-emerald-50"
                    >
                      N° Billet : {dossier?.billetNumber || "BIL-2026-001"}
                    </Badge>
                  </div>
                  <div className="text-center space-y-1 relative pr-4">
                    <p className="text-[11px] text-slate-700">
                      Fait à Abidjan, le{" "}
                      <span className="font-bold">
                        {new Date().toLocaleDateString("fr-FR")}
                      </span>
                    </p>
                    <p className="font-extrabold text-xs text-slate-900 pt-1">
                      Le Directeur des Études
                    </p>
                    <div className="pt-8 flex items-center justify-center gap-2">
                      <div className="w-16 h-16 border-2 border-indigo-700/60 rounded-full flex items-center justify-center text-[8px] font-bold text-indigo-900 text-center leading-tight rotate-[-12deg] p-1 border-dashed">
                        Collège Privé Hînneh
                        <br />
                        Le Directeur
                        <br />
                        des Études
                      </div>
                      <span className="font-serif italic font-bold text-indigo-950 text-xs border-b border-slate-900 pb-0.5">
                        M. SANGARE
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* LIGNE DE DÉCOUPE / POINTILLÉS */}
              <div className="relative py-2 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-dashed border-slate-400"></div>
                </div>
                <span className="relative px-3 bg-white text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  ✂ Partie à découper — Exemplaire Secrétariat / Vie Scolaire ✂
                </span>
              </div>

              {/* COUPON 2: EXEMPLAIRE VIE SCOLAIRE / PARENT */}
              <div className="space-y-4 relative pt-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <img
                      src="/images/hinneh_logo_20260507_234919.png"
                      alt="Logo Hînneh"
                      className="w-12 h-12 object-contain shrink-0"
                    />
                    <div>
                      <h3 className="text-xs font-extrabold uppercase text-slate-900">
                        Groupe Scolaire Confessionnel Hînneh
                      </h3>
                      <p className="text-[9px] text-slate-600 font-semibold">
                        Abobo-Biabou — Abidjan, Côte d'Ivoire
                      </p>
                    </div>
                  </div>
                </div>

                {/* TITRE RECTANGULAIRE ENCADRÉ */}
                <div className="border-2 border-slate-900 text-center py-2 px-4 rounded-xs my-2">
                  <h2 className="text-base font-extrabold uppercase tracking-widest text-slate-900">
                    BILLET D'ENTREE
                  </h2>
                </div>

                {/* TEXTES OFFICIELS AVEC LIGNES POINTILLÉES */}
                <div className="space-y-3 text-xs pt-2">
                  <p className="leading-relaxed">
                    <span className="font-bold text-slate-900">L'élève :</span>{" "}
                    <span className="font-extrabold text-indigo-900 underline decoration-dotted underline-offset-4 text-sm uppercase">
                      {dossier?.elevePrenom} {dossier?.eleveNom}
                    </span>
                    <span className="text-slate-400 font-mono">
                      {" "}
                      (Matricule : {dossier?.matricule || "HE2026..."})
                    </span>
                  </p>

                  <p className="leading-relaxed">
                    <span className="font-bold text-slate-900">
                      Inscrit (e) en classe de :
                    </span>{" "}
                    <span className="font-extrabold text-indigo-900 underline decoration-dotted underline-offset-4 text-sm">
                      {dossier?.classeNom || dossier?.niveau || "CE1"}
                    </span>{" "}
                    est autorisé (e) à débuter les cours à compter du{" "}
                    <span className="font-bold underline decoration-dotted underline-offset-4">
                      {new Date().toLocaleDateString("fr-FR")}
                    </span>
                  </p>
                </div>

                {/* DATE & SIGNATURE DIRECTEUR DES ÉTUDES */}
                <div className="flex justify-between items-end pt-4">
                  <div className="text-[10px] text-slate-500">
                    <Badge
                      variant="outline"
                      className="text-[9px] border-emerald-300 text-emerald-800 bg-emerald-50"
                    >
                      N° Billet : {dossier?.billetNumber || "BIL-2026-001"}
                    </Badge>
                  </div>
                  <div className="text-center space-y-1 relative pr-4">
                    <p className="text-[11px] text-slate-700">
                      Fait à Abidjan, le{" "}
                      <span className="font-bold">
                        {new Date().toLocaleDateString("fr-FR")}
                      </span>
                    </p>
                    <p className="font-extrabold text-xs text-slate-900 pt-1">
                      Le Directeur des Études
                    </p>
                    <div className="pt-8 flex items-center justify-center gap-2">
                      <div className="w-16 h-16 border-2 border-indigo-700/60 rounded-full flex items-center justify-center text-[8px] font-bold text-indigo-900 text-center leading-tight rotate-[-12deg] p-1 border-dashed">
                        Collège Privé Hînneh
                        <br />
                        Le Directeur
                        <br />
                        des Études
                      </div>
                      <span className="font-serif italic font-bold text-indigo-950 text-xs border-b border-slate-900 pb-0.5">
                        M. SANGARE
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="dialog-footer">
              <Button
                variant="outline"
                onClick={() => setOpenBilletModal(false)}
              >
                Fermer
              </Button>
              <Button
                onClick={triggerDirectPrint}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <Printer className="w-4 h-4" /> Imprimer Billet d'Entrée
                Officiel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL VÉRIFICATION DES IMPAYÉS AVANT INSCRIPTION */}
        <Dialog
          open={impayesModal.open}
          onOpenChange={(open) => {
            if (!open)
              setImpayesModal({ open: false, data: null, loading: false });
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" /> Impayés détectés
              </DialogTitle>
              <DialogDescription>
                Cet élève présente des soldes impayés. Le règlement est requis
                avant la nouvelle inscription.
              </DialogDescription>
            </DialogHeader>

            {impayesModal.loading ? (
              <div className="py-8 text-center">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mx-auto mb-3" />
                <p className="text-sm text-slate-500">
                  Vérification des impayés en cours...
                </p>
              </div>
            ) : impayesModal.data ? (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      {impayesModal.data.eleve?.prenom}{" "}
                      {impayesModal.data.eleve?.nom}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      Matricule : {impayesModal.data.eleve?.matricule || "N/A"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white rounded-lg p-2 border">
                      <p className="text-[10px] text-slate-500">Total dû</p>
                      <p className="font-bold text-slate-800 text-sm">
                        {formatCurrency(impayesModal.data.total_prevu)}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border">
                      <p className="text-[10px] text-slate-500">Total versé</p>
                      <p className="font-bold text-emerald-600 text-sm">
                        {formatCurrency(impayesModal.data.total_paye)}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-red-300">
                      <p className="text-[10px] text-red-500">Solde restant</p>
                      <p className="font-bold text-red-600 text-sm">
                        {formatCurrency(impayesModal.data.solde_restant)}
                      </p>
                    </div>
                  </div>
                </div>

                {impayesModal.data.echeances?.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="p-2 text-left font-semibold text-slate-600">
                            Libellé
                          </th>
                          <th className="p-2 text-right font-semibold text-slate-600">
                            Prévu
                          </th>
                          <th className="p-2 text-right font-semibold text-slate-600">
                            Payé
                          </th>
                          <th className="p-2 text-right font-semibold text-slate-600">
                            Restant
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {impayesModal.data.echeances.map(
                          (e: any, i: number) => (
                            <tr key={i} className="border-t border-slate-100">
                              <td className="p-2 text-slate-700">
                                {e.libelle ||
                                  `Tranche ${e.tranche_numero || i + 1}`}
                              </td>
                              <td className="p-2 text-right text-slate-600">
                                {formatCurrency(e.montant_prevu)}
                              </td>
                              <td className="p-2 text-right text-emerald-600">
                                {formatCurrency(e.montant_paye)}
                              </td>
                              <td className="p-2 text-right font-bold text-red-600">
                                {formatCurrency(
                                  Number(e.montant_prevu) -
                                    Number(e.montant_paye),
                                )}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Action requise
                  </p>
                  <p className="mt-1">
                    L'élève doit régler le solde de{" "}
                    <strong>
                      {formatCurrency(impayesModal.data.solde_restant)}
                    </strong>{" "}
                    à la caisse avant de pouvoir procéder à sa nouvelle
                    inscription.
                  </p>
                </div>
              </div>
            ) : null}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  setImpayesModal({ open: false, data: null, loading: false })
                }
              >
                Fermer
              </Button>
              {impayesModal.data && (
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white gap-2"
                  onClick={() => {
                    const studentId = impayesModal.data.eleve?.id;
                    setImpayesModal({
                      open: false,
                      data: null,
                      loading: false,
                    });
                    // Rediriger vers la caisse pour le règlement
                    window.location.href = `/#/caisse?eleve_id=${studentId || ""}&motif=impaye`;
                  }}
                >
                  <DollarSign className="w-4 h-4" /> Régler à la Caisse
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
