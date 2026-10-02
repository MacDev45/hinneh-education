/**
 * Espace Accueil — Pré-inscription & Enregistrement des formulaires
 * Profil : Accueil (§1.3 + §3.1)
 */
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { formatStudentName } from "@/lib/index";
import { motion } from "framer-motion";
import {
  ClipboardList,
  UserPlus,
  Search,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  ChevronRight,
  Phone,
  Mail,
  Calendar,
  Users,
  AlertCircle,
  Eye,
  User,
  BookOpen,
  Home,
  Camera,
  HeartPulse,
  GraduationCap,
  MapPin,
  Building,
  CheckCircle,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { AppLogoLoader } from "@/components/AppLogoLoader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";

interface PreInscriptionRecord {
  id: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "M" | "F";
  lieuNaissance?: string;
  nationalite?: string;
  extraitNo?: string;
  extraitDate?: string;
  extraitLieu?: string;
  handicap?: string;
  autresHandicap?: string;

  // Scolarité
  niveau: string;
  ecoleOrigine?: string;
  classePrecedente?: string;
  noTable?: string;
  session?: string;
  matriculeNational?: string;
  matriculeEcole?: string;
  niveauArabe?: string;
  typeInscription: "inscription" | "reinscription";
  qualiteEleve: "Non Redoublant(e)" | "Redoublant(e)";
  statutOrientation: string;
  regimeBoursier?: string;
  priseEnCharge: boolean;
  originePriseEnCharge: string;
  serviceTransport: boolean;
  serviceCantine: boolean;

  // Parents
  parentNom: string;
  parentTel: string;
  parentEmail: string;
  pereNom?: string;
  pereProfession?: string;
  perePhone?: string;
  pereEmail?: string;
  pereBoitePostale?: string;
  mereNom?: string;
  mereProfession?: string;
  merePhone?: string;
  mereEmail?: string;
  mereBoitePostale?: string;
  tuteurNom?: string;
  tuteurProfession?: string;
  tuteurPhone?: string;
  tuteurEmail?: string;
  tuteurBoitePostale?: string;
  scolariteNom?: string;
  scolariteProfession?: string;
  scolaritePhone?: string;
  scolariteEmail?: string;
  scolariteBoitePostale?: string;

  // Résidence & Santé
  lieuResidence?: string;
  commune?: string;
  quartier?: string;
  lot?: string;
  adresseText?: string;
  observations: string;
  notesSante?: string;

  statut: "en_attente" | "transmis_scolarite" | "annule";
}

const NIVEAUX = [
  "Petite Section",
  "Moyenne Section",
  "Grande Section",
  "CP1",
  "CP2",
  "CE1",
  "CE2",
  "CM1",
  "CM2",
  "6ème",
  "5ème",
  "4ème",
  "3ème",
  "2nde",
  "1ère",
  "Terminale",
];

const statutConfig = {
  en_attente: {
    label: "En attente",
    variant: "secondary" as const,
    color: "text-amber-700",
  },
  transmis_scolarite: {
    label: "Transmis Scolarité",
    variant: "default" as const,
    color: "text-green-700",
  },
  annule: {
    label: "Annulé",
    variant: "destructive" as const,
    color: "text-destructive",
  },
};

/**
 * Sépare « KOUASSI Awa Marie » en { nom: "KOUASSI", prenom: "Awa Marie" }.
 *
 * La prise de rendez-vous ne collecte qu'un champ « Nom et prénoms de l'élève »,
 * alors que la fiche de pré-inscription les sépare. On suit la convention
 * locale : le premier mot est le nom de famille, le reste les prénoms. Un seul
 * mot est donc traité comme un nom sans prénom — l'agent complète au guichet.
 */
const extraireNom = (nomComplet?: string | null): { nom: string; prenom: string } => {
  const mots = (nomComplet || "").trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return { nom: "", prenom: "" };
  return { nom: mots[0].toUpperCase(), prenom: mots.slice(1).join(" ") };
};

export default function AccueilSpace() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("liste");
  const [formSubTab, setFormSubTab] = useState<
    "identification" | "scolarite" | "parents" | "residence"
  >("identification");
  const [detailSubTab, setDetailSubTab] = useState<
    "identification" | "scolarite" | "parents" | "residence"
  >("identification");

  const [records, setRecords] = useState<PreInscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<string>("tous");
  const [openDetail, setOpenDetail] = useState<PreInscriptionRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const [schools, setSchools] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  const emptyForm = {
    // Opération
    typeInscription: "inscription" as "inscription" | "reinscription",
    matriculeEcole: "",

    // 1. Identification / État Civil
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "M" as "M" | "F",
    lieuNaissance: "",
    nationalite: "Ivoirienne",
    extraitNo: "",
    extraitDate: "",
    extraitLieu: "",
    handicap: "NON",
    autresHandicap: "",

    // 2. Scolarité & Statut
    niveau: "",
    ecoleId: "",
    cycleFilter: "college1",
    ecoleOrigine: "",
    classePrecedente: "",
    noTable: "",
    session: "2026",
    matriculeNational: "",
    niveauArabe: "",
    qualiteEleve: "Non Redoublant(e)" as "Non Redoublant(e)" | "Redoublant(e)",
    statutOrientation: "Affecté par l'État",
    regimeBoursier: "Non Boursier" as "Non Boursier" | "Boursier" | "1/2 Boursier",
    priseEnCharge: false,
    originePriseEnCharge: "",
    serviceTransport: false,
    serviceCantine: false,

    // 3. Parents & Tuteurs
    parentNom: "",
    parentTel: "",
    parentEmail: "",
    pereNom: "",
    pereProfession: "",
    perePhone: "",
    pereEmail: "",
    pereBoitePostale: "",
    mereNom: "",
    mereProfession: "",
    merePhone: "",
    mereEmail: "",
    mereBoitePostale: "",
    tuteurNom: "",
    tuteurProfession: "",
    tuteurPhone: "",
    tuteurEmail: "",
    tuteurBoitePostale: "",
    scolariteNom: "",
    scolariteProfession: "",
    scolaritePhone: "",
    scolariteEmail: "",
    scolariteBoitePostale: "",

    // 4. Résidence, Contact Principal & Santé
    lieuResidence: "pere_mere",
    commune: "",
    quartier: "",
    lot: "",
    adresseText: "",
    telephonePrincipal: "",
    emailPrincipal: "",
    observations: "",
    notesSante: "",
  };

  const [form, setForm] = useState(emptyForm);

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ── Prise en charge d'un rendez-vous ────────────────────────────────────────
  // Ouvert depuis la file d'attente du suivi des inscriptions
  // (/accueil-space?rdv_id=…) lorsque l'élève n'est pas encore connu du réseau.
  // Le formulaire est pré-rempli avec ce que la famille a déjà déclaré, puis,
  // à l'enregistrement, le rendez-vous est marqué traité et rattaché à l'élève
  // créé : c'est le transfert vers la procédure d'inscription.
  const [searchParams] = useSearchParams();
  const rdvId = searchParams.get("rdv_id");
  const [rdvInfo, setRdvInfo] = useState<any | null>(null);

  useEffect(() => {
    if (!rdvId) return;
    const chargerRdv = async () => {
      try {
        const rdv = await apiClient.getRendezVous(rdvId);
        setRdvInfo(rdv);
        setForm((prev) => ({
          ...prev,
          typeInscription:
            rdv.type_demarche === "reinscription" ? "reinscription" : "inscription",
          niveau: rdv.niveau || prev.niveau,
          matriculeNational: rdv.matricule_national || prev.matriculeNational,
          classePrecedente: rdv.classe_precedente || prev.classePrecedente,
          lastName: extraireNom(rdv.nom_eleve).nom || prev.lastName,
          firstName: extraireNom(rdv.nom_eleve).prenom || prev.firstName,
          parentNom: rdv.nom || prev.parentNom,
          parentTel: rdv.telephone || prev.parentTel,
          parentEmail: rdv.email || prev.parentEmail,
          telephonePrincipal: rdv.telephone || prev.telephonePrincipal,
          emailPrincipal: rdv.email || prev.emailPrincipal,
          tuteurNom: rdv.nom || prev.tuteurNom,
          tuteurPhone: rdv.telephone || prev.tuteurPhone,
          tuteurEmail: rdv.email || prev.tuteurEmail,
          ecoleId: rdv.ecole_id ? String(rdv.ecole_id) : prev.ecoleId,
        }));
        setFormSubTab("identification");
        setActiveTab("nouveau");
      } catch (err) {
        console.error("Impossible de charger le rendez-vous associé :", err);
        toast({
          variant: "destructive",
          title: "Rendez-vous introuvable",
          description:
            "Le rendez-vous lié à ce lien n'a pas pu être chargé. Vous pouvez saisir la pré-inscription manuellement.",
        });
      }
    };
    chargerRdv();
  }, [rdvId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [students, schoolsData, classesData] = await Promise.all([
        apiClient.getStudents(),
        apiClient.getAllSchools().catch(() => []),
        apiClient.getClasses().catch(() => []),
      ]);

      setSchools(schoolsData);
      setClasses(classesData);

      const mapped: PreInscriptionRecord[] = students
        .filter((s: any) => s.status === "preinscrit" || s.statut === "preinscrit")
        .map((s: any) => {
          const dobStr =
            s.dateOfBirth instanceof Date
              ? s.dateOfBirth.toISOString().split("T")[0]
              : typeof s.dateOfBirth === "string"
                ? s.dateOfBirth
                : s.dateNaissance || "";
          const createdStr =
            s.createdAt instanceof Date
              ? s.createdAt.toLocaleDateString("fr-FR")
              : typeof s.createdAt === "string"
                ? s.createdAt
                : new Date().toISOString();

          return {
            id: String(s.id),
            createdAt: createdStr,
            firstName: s.firstName || s.prenom || "",
            lastName: s.lastName || s.nom || "",
            dateOfBirth: dobStr,
            gender: s.gender || s.genre || "M",
            lieuNaissance: s.AU_LIEU_NAISSANCE || s.lieu_naissance || "",
            nationalite: s.AU_NATIONALITE || s.nationalite || "Ivoirienne",
            extraitNo: s.AU_NUMEROEXTRAITNAISSANCE || s.extraitNo || "",
            extraitDate: s.AU_DATEETABLISSEMENTEXTRAIT || s.extraitDate || "",
            extraitLieu: s.AU_LIEUETABLISSEMENTEXTRAIT || s.extraitLieu || "",
            handicap: s.AU_HANDICAP ? "OUI" : "NON",
            autresHandicap: s.AU_AUTRESHANDICAP || "",

            niveau: s.className || s.level || s.AU_CLASSEPRECEDENTE || s.niveau || "",
            ecoleOrigine: s.AU_ETABLISSEMENTPRECEDENT || "",
            classePrecedente: s.AU_CLASSEPRECEDENTE || "",
            noTable: s.AU_NUM_AFFECTATION || "",
            matriculeNational: s.AU_MATRICULENATIONAL || s.matricule_national || s.matricule || "",
            typeInscription: s.type_inscription || s.typeInscription || "inscription",
            qualiteEleve:
              s.qualite_eleve ||
              s.qualiteEleve ||
              (s.REDOUBLANT ? "Redoublant(e)" : "Non Redoublant(e)"),
            statutOrientation:
              s.statut_orientation ||
              s.statutOrientation ||
              s.statutAffecte ||
              "Affecté par l'État",
            regimeBoursier: s.regime || (s.ETAT_BOURSE ? "Boursier" : "Non Boursier"),
            priseEnCharge: Boolean(s.prise_en_charge || s.priseEnCharge || s.ETAT_BOURSE),
            originePriseEnCharge:
              s.origine_prise_en_charge || s.originePriseEnCharge || "",
            serviceTransport: Boolean(s.service_transport || s.serviceTransport),
            serviceCantine: Boolean(s.service_cantine || s.serviceCantine),

            parentNom: s.parentName || s.AU_TUTEURLEGAL || s.AU_PERENOMPRENOMS || "",
            parentTel: s.parentPhone || s.AU_CONTACTS || s.phone || s.AU_PERECONTACTS || "",
            parentEmail: s.parentEmail || s.email || s.AU_E_MAIL || "",
            pereNom: s.AU_PERENOMPRENOMS || "",
            perePhone: s.AU_PERECONTACTS || "",
            mereNom: s.AU_MERENOMPRENOMS || "",
            merePhone: s.AU_MERECONTACTS || "",
            tuteurNom: s.AU_TUTEURLEGAL || "",
            tuteurPhone: s.AU_TUTEURLEGALCONTACTS || "",

            commune: s.AU_COMMUNE || "",
            quartier: s.AU_QUARTIER || "",
            lot: s.AU_LOT || "",
            adresseText: s.AU_ADRESSE_GEO || "",
            observations: s.observations || s.notes_sante || "",
            notesSante: s.notes_sante || "",
            statut: "en_attente",
          };
        });
      setRecords(mapped);
    } catch (err) {
      console.error("Erreur chargement préinscriptions:", err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = records.filter((r) => {
    const matchSearch =
      `${formatStudentName(r)} ${r.parentNom} ${r.parentTel} ${r.matriculeNational || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchStatut = filterStatut === "tous" || r.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  const stats = {
    total: records.length,
    en_attente: records.filter((r) => r.statut === "en_attente").length,
    transmis: records.filter((r) => r.statut === "transmis_scolarite").length,
  };

  const handleSubmit = async () => {
    // Validations obligatoires
    if (!form.firstName || !form.lastName || !form.niveau) {
      toast({
        variant: "destructive",
        title: "Champs élève manquants",
        description: "Veuillez renseigner le prénom, le nom et le niveau souhaité de l'élève.",
      });
      setFormSubTab("identification");
      return;
    }

    const principalContact =
      form.telephonePrincipal ||
      form.parentTel ||
      form.perePhone ||
      form.merePhone ||
      form.tuteurPhone;

    if (!principalContact) {
      toast({
        variant: "destructive",
        title: "Contact parent requis",
        description: "Veuillez renseigner au moins un numéro de téléphone pour le parent / tuteur.",
      });
      setFormSubTab("parents");
      return;
    }

    setSaving(true);
    try {
      const userEcoleId = localStorage.getItem("user_ecole_id");
      const defaultSchoolId = form.ecoleId || userEcoleId || schools[0]?.id || 1;

      const payload = {
        matricule:
          form.typeInscription === "reinscription" && form.matriculeEcole
            ? form.matriculeEcole.trim()
            : "AUTO",
        prenom: form.firstName,
        nom: form.lastName,
        date_naissance: form.dateOfBirth || "2015-01-01",
        genre: form.gender,
        ecole_id: Number(defaultSchoolId),
        classe_id: null,
        statut: "preinscrit",
        notes_sante: form.notesSante || form.observations || "",

        // État civil & pièces
        AU_LIEU_NAISSANCE: form.lieuNaissance,
        AU_NATIONALITE: form.nationalite || "Ivoirienne",
        AU_NUMEROEXTRAITNAISSANCE: form.extraitNo,
        AU_DATEETABLISSEMENTEXTRAIT: form.extraitDate ? form.extraitDate : null,
        AU_LIEUETABLISSEMENTEXTRAIT: form.extraitLieu,
        AU_HANDICAP: form.handicap !== "NON",
        AU_AUTRESHANDICAP:
          form.handicap !== "NON"
            ? form.handicap === "autre"
              ? form.autresHandicap
              : form.handicap
            : "",

        // Scolarité
        AU_ETABLISSEMENTPRECEDENT: form.ecoleOrigine,
        AU_CLASSEPRECEDENTE: form.classePrecedente || form.niveau,
        AU_NUM_AFFECTATION: form.noTable,
        AU_MATRICULENATIONAL: form.matriculeNational,
        matricule_national: form.matriculeNational,
        type_inscription: form.typeInscription,
        qualite_eleve: form.qualiteEleve,
        statut_orientation: form.statutOrientation,
        regime: form.regimeBoursier || "Non Boursier",
        REDOUBLANT: form.qualiteEleve === "Redoublant(e)",
        ETAT_BOURSE: form.priseEnCharge,
        prise_en_charge: form.priseEnCharge,
        origine_prise_en_charge: form.priseEnCharge ? form.originePriseEnCharge : "",
        service_transport: form.serviceTransport,
        service_cantine: form.serviceCantine,

        // Parents & Tuteurs
        AU_PERENOMPRENOMS: form.pereNom || form.parentNom,
        AU_PERECONTACTS: form.perePhone || form.parentTel,
        AU_MERENOMPRENOMS: form.mereNom,
        AU_MERECONTACTS: form.merePhone,
        AU_TUTEURLEGAL: form.tuteurNom || form.parentNom,
        AU_TUTEURLEGALCONTACTS: form.tuteurPhone || form.parentTel,

        // Résidence & Contacts
        AU_COMMUNE: form.commune,
        AU_QUARTIER: form.quartier,
        AU_LOT: form.lot,
        AU_ADRESSE_GEO: form.adresseText,
        AU_CONTACTS: principalContact,
        AU_E_MAIL:
          form.emailPrincipal ||
          form.parentEmail ||
          form.pereEmail ||
          form.mereEmail ||
          form.tuteurEmail ||
          null,

        parent_password: "parentpassword123",
      };

      const res = await apiClient.createStudent(payload);

      // Transfert vers la procédure d'inscription : le rendez-vous est marqué
      // traité et rattaché à l'élève qui vient d'être créé. Le dossier bascule
      // alors en « Élève reconnu » dans le suivi des inscriptions.
      let rdvTransfere = false;
      if (rdvId && res?.id) {
        try {
          await apiClient.updateRendezVousStatut(rdvId, {
            statut: "traite",
            eleve_id: Number(res.id),
          });
          rdvTransfere = true;
        } catch (rdvErr) {
          console.warn("Rendez-vous non mis à jour :", rdvErr);
        }
      }

      toast({
        title: "Pré-inscription enregistrée !",
        description:
          `L'élève ${formatStudentName(res || form)} a été préinscrit avec succès (Matricule : ${res?.matricule || "Généré"}).` +
          (rdvTransfere ? " Le dossier est transféré à la procédure d'inscription." : ""),
      });

      setForm(emptyForm);
      setRdvInfo(null);
      setFormSubTab("identification");
      setActiveTab("liste");
      loadData();
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          err.response?.data?.detail ||
          "Impossible d'enregistrer le formulaire de pré-inscription.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTransmettre = (id: string) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, statut: "transmis_scolarite" } : r
      )
    );
    toast({ title: "Dossier transmis à la Scolarité avec succès." });
    setOpenDetail(null);
  };

  const handleAnnuler = (id: string) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, statut: "annule" } : r))
    );
    toast({ title: "Dossier annulé." });
    setOpenDetail(null);
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 space-y-6 max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardList className="h-7 w-7 text-primary" />
              Espace Accueil
            </h1>
            <p className="text-muted-foreground mt-1">
              Pré-inscription et enregistrement des formulaires papier
            </p>
          </div>
          <Button
            className="gap-2"
            onClick={() => {
              setForm(emptyForm);
              setFormSubTab("identification");
              setActiveTab("nouveau");
            }}
          >
            <UserPlus className="h-4 w-4" /> Nouvelle pré-inscription
          </Button>
        </div>

        {/* Rendez-vous en cours de prise en charge */}
        {rdvInfo && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
            <span className="font-mono font-semibold text-primary">
              {rdvInfo.numero_ticket}
            </span>
            <span className="text-muted-foreground">
              {rdvInfo.type_demarche === "reinscription" ? "Réinscription" : "Inscription"}
              {rdvInfo.niveau ? ` — ${rdvInfo.niveau}` : ""}
            </span>
            {rdvInfo.nom_eleve && (
              <span className="font-medium">{rdvInfo.nom_eleve}</span>
            )}
            <span className="text-xs text-muted-foreground italic ml-auto">
              Formulaire pré-rempli. La photo sera prise à l'étape 6 de la procédure.
            </span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">
                  Total pré-inscrits
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">
                  {stats.en_attente}
                </p>
                <p className="text-xs text-muted-foreground">En attente</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {stats.transmis}
                </p>
                <p className="text-xs text-muted-foreground">
                  Transmis Scolarité
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 max-w-md">
            <TabsTrigger value="liste" className="gap-1">
              <FileText className="h-4 w-4" />
              Liste des dossiers ({records.length})
            </TabsTrigger>
            <TabsTrigger value="nouveau" className="gap-1">
              <UserPlus className="h-4 w-4" />
              Nouveau Formulaire
            </TabsTrigger>
          </TabsList>

          {/* Liste */}
          <TabsContent value="liste" className="mt-4 space-y-3">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Rechercher élève, matricule, parent ou téléphone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={filterStatut} onValueChange={setFilterStatut}>
                <SelectTrigger className="w-44">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les statuts</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="transmis_scolarite">
                    Transmis Scolarité
                  </SelectItem>
                  <SelectItem value="annule">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center items-center">
                <AppLogoLoader
                  size="sm"
                  message="Chargement des préinscriptions…"
                />
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground italic">
                  Aucun dossier de pré-inscription trouvé.
                </CardContent>
              </Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/80 border-b">
                      <tr>
                        <th className="text-left p-3 font-semibold">Élève</th>
                        <th className="text-left p-3 font-semibold">Niveau</th>
                        <th className="text-left p-3 font-semibold">
                          Parent / Contact
                        </th>
                        <th className="text-center p-3 font-semibold">Type</th>
                        <th className="text-center p-3 font-semibold">
                          Services
                        </th>
                        <th className="text-center p-3 font-semibold">
                          Statut
                        </th>
                        <th className="text-center p-3 font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r) => (
                        <tr key={r.id} className="border-b hover:bg-muted/20">
                          <td className="p-3 font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                {r.firstName?.[0] || "E"}
                              </div>
                              <div>
                                <p className="font-semibold text-foreground">
                                  {formatStudentName(r)}
                                </p>
                                {r.matriculeNational && (
                                  <p className="text-[11px] text-muted-foreground font-mono">
                                    N° {r.matriculeNational}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {r.niveau || "—"}
                            </span>
                            {r.qualiteEleve === "Redoublant(e)" && (
                              <span className="block text-[10px] text-amber-600 font-semibold">
                                Redoublant
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <p className="font-medium">{r.parentNom || "—"}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3 text-primary" />
                              {r.parentTel || "—"}
                            </p>
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className="text-xs">
                              {r.typeInscription === "reinscription"
                                ? "Réinscription"
                                : "Inscription"}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex gap-1 justify-center flex-wrap">
                              {r.serviceTransport && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] bg-blue-100 text-blue-800"
                                >
                                  🚌 Transport
                                </Badge>
                              )}
                              {r.serviceCantine && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] bg-emerald-100 text-emerald-800"
                                >
                                  🍽 Cantine
                                </Badge>
                              )}
                              {!r.serviceTransport && !r.serviceCantine && (
                                <span className="text-muted-foreground text-xs">
                                  —
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant={statutConfig[r.statut].variant}>
                              {statutConfig[r.statut].label}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1 h-7 px-2"
                              onClick={() => {
                                setOpenDetail(r);
                                setDetailSubTab("identification");
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="text-xs">Détails</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Formulaire complet de préinscription */}
          <TabsContent value="nouveau" className="mt-4">
            <Card className="border-primary/20 shadow-sm">
              <CardHeader className="border-b pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      Fiche Complète de Pré-inscription
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Saisie intégrale des informations administratives, académiques et familiales.
                    </p>
                  </div>

                  {/* Type d'opération */}
                  <div className="flex items-center gap-3 bg-muted/40 p-2 rounded-xl border">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                        Type d'opération
                      </Label>
                      <Select
                        value={form.typeInscription}
                        onValueChange={(v: "inscription" | "reinscription") =>
                          handleChange("typeInscription", v)
                        }
                      >
                        <SelectTrigger className="h-8 text-xs w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inscription">
                            Nouvelle Inscription
                          </SelectItem>
                          <SelectItem value="reinscription">
                            Réinscription (Ancien)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {form.typeInscription === "reinscription" && (
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-destructive">
                          N° Matricule École *
                        </Label>
                        <Input
                          placeholder="Ex: HE202512345"
                          value={form.matriculeEcole}
                          onChange={(e) =>
                            handleChange("matriculeEcole", e.target.value)
                          }
                          className="h-8 text-xs w-40"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Barre de sous-onglets */}
                <div className="flex border-b overflow-x-auto gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setFormSubTab("identification")}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-xs transition-all whitespace-nowrap ${
                      formSubTab === "identification"
                        ? "border-primary text-primary font-bold bg-primary/5 rounded-t-lg"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    1. Élève / État Civil
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormSubTab("scolarite")}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-xs transition-all whitespace-nowrap ${
                      formSubTab === "scolarite"
                        ? "border-primary text-primary font-bold bg-primary/5 rounded-t-lg"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    2. Scolarité & Statut
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormSubTab("parents")}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-xs transition-all whitespace-nowrap ${
                      formSubTab === "parents"
                        ? "border-primary text-primary font-bold bg-primary/5 rounded-t-lg"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    3. Parents & Tuteurs
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormSubTab("residence")}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-xs transition-all whitespace-nowrap ${
                      formSubTab === "residence"
                        ? "border-primary text-primary font-bold bg-primary/5 rounded-t-lg"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Home className="w-3.5 h-3.5" />
                    4. Résidence & Santé
                  </button>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                {/* ── SOUS-ONGLET 1 : IDENTIFICATION / ÉTAT CIVIL ── */}
                {formSubTab === "identification" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-5"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Nom de famille de l'élève *</Label>
                        <Input
                          placeholder="Ex: KOUASSI"
                          value={form.lastName}
                          onChange={(e) =>
                            handleChange("lastName", e.target.value.toUpperCase())
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Prénoms de l'élève *</Label>
                        <Input
                          placeholder="Ex: Jean-Marc"
                          value={form.firstName}
                          onChange={(e) =>
                            handleChange("firstName", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label>Genre / Sexe *</Label>
                        <Select
                          value={form.gender}
                          onValueChange={(v: "M" | "F") =>
                            handleChange("gender", v)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="M">Masculin (M)</SelectItem>
                            <SelectItem value="F">Féminin (F)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Date de naissance *</Label>
                        <Input
                          type="date"
                          value={form.dateOfBirth}
                          onChange={(e) =>
                            handleChange("dateOfBirth", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Lieu de naissance</Label>
                        <Input
                          placeholder="Ex: Abidjan Cocody"
                          value={form.lieuNaissance}
                          onChange={(e) =>
                            handleChange("lieuNaissance", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Nationalité</Label>
                        <Input
                          placeholder="Ex: Ivoirienne"
                          value={form.nationalite}
                          onChange={(e) =>
                            handleChange("nationalite", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Situation de Handicap</Label>
                        <Select
                          value={form.handicap}
                          onValueChange={(v) => handleChange("handicap", v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NON">
                              Aucun handicap (NON)
                            </SelectItem>
                            <SelectItem value="moteur">Moteur</SelectItem>
                            <SelectItem value="visuel">Visuel</SelectItem>
                            <SelectItem value="auditif">Auditif</SelectItem>
                            <SelectItem value="autre">
                              Autre handicap (Préciser)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {form.handicap === "autre" && (
                      <div className="space-y-1.5">
                        <Label>Précision sur le handicap</Label>
                        <Input
                          placeholder="Précisez la nature du handicap..."
                          value={form.autresHandicap}
                          onChange={(e) =>
                            handleChange("autresHandicap", e.target.value)
                          }
                        />
                      </div>
                    )}

                    {/* Extrait d'acte de naissance */}
                    <div className="p-4 rounded-xl border bg-muted/10 space-y-3">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                        Extrait d'acte de naissance
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">N° Extrait</Label>
                          <Input
                            placeholder="Ex: 1248/2015"
                            value={form.extraitNo}
                            onChange={(e) =>
                              handleChange("extraitNo", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Établi le</Label>
                          <Input
                            type="date"
                            value={form.extraitDate}
                            onChange={(e) =>
                              handleChange("extraitDate", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">À (Lieu de délivrance)</Label>
                          <Input
                            placeholder="Ex: Mairie d'Abobo"
                            value={form.extraitLieu}
                            onChange={(e) =>
                              handleChange("extraitLieu", e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── SOUS-ONGLET 2 : SCOLARITÉ & STATUT ── */}
                {formSubTab === "scolarite" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-5"
                  >
                    {/* Scolarité Antérieure */}
                    <div className="p-4 rounded-xl border bg-muted/10 space-y-3">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                        Scolarité Antérieure
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">
                            Établissement précédent / Origine
                          </Label>
                          <Input
                            placeholder="Ex: EPP Biabou 1"
                            value={form.ecoleOrigine}
                            onChange={(e) =>
                              handleChange("ecoleOrigine", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Classe précédente</Label>
                          <Input
                            placeholder="Ex: CM2"
                            value={form.classePrecedente}
                            onChange={(e) =>
                              handleChange("classePrecedente", e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">N° de table</Label>
                          <Input
                            placeholder="Ex: 24-001258"
                            value={form.noTable}
                            onChange={(e) =>
                              handleChange("noTable", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Session</Label>
                          <Input
                            placeholder="Ex: 2026"
                            value={form.session}
                            onChange={(e) =>
                              handleChange("session", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">
                            Matricule National MENA
                          </Label>
                          <Input
                            placeholder="Ex: 21548796A"
                            value={form.matriculeNational}
                            onChange={(e) =>
                              handleChange("matriculeNational", e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Niveau Scolaire (Arabe / Coran)</Label>
                        <Input
                          placeholder="Ex: Débutant, Niveau 2..."
                          value={form.niveauArabe}
                          onChange={(e) =>
                            handleChange("niveauArabe", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    {/* Scolarité Actuelle */}
                    <div className="p-4 rounded-xl border bg-primary/5 space-y-3">
                      <span className="text-xs font-bold text-primary uppercase tracking-wider block">
                        Scolarité Souhaitée
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>Niveau / Classe souhaité *</Label>
                          <Select
                            value={form.niveau}
                            onValueChange={(v) => handleChange("niveau", v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner le niveau" />
                            </SelectTrigger>
                            <SelectContent>
                              {NIVEAUX.map((n) => (
                                <SelectItem key={n} value={n}>
                                  {n}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Cycle d'enseignement</Label>
                          <Select
                            value={form.cycleFilter}
                            onValueChange={(v) =>
                              handleChange("cycleFilter", v)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="prescolaire">
                                Préscolaire (Maternelle)
                              </SelectItem>
                              <SelectItem value="primaire">Primaire</SelectItem>
                              <SelectItem value="college1">
                                Collège 1er cycle (6ème–5ème)
                              </SelectItem>
                              <SelectItem value="college2">
                                Collège 2e cycle (4ème–3ème)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Profil Administratif & Statuts */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label>Qualité Élève *</Label>
                        <Select
                          value={form.qualiteEleve}
                          onValueChange={(v: any) =>
                            handleChange("qualiteEleve", v)
                          }
                        >
                          <SelectTrigger>
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
                      <div className="space-y-1.5">
                        <Label>Statut Orientation *</Label>
                        <Select
                          value={form.statutOrientation}
                          onValueChange={(v) =>
                            handleChange("statutOrientation", v)
                          }
                        >
                          <SelectTrigger>
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
                            <SelectItem value="Réintégration">
                              Réintégration
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Régime Boursier</Label>
                        <Select
                          value={form.regimeBoursier || "Non Boursier"}
                          onValueChange={(v: any) =>
                            handleChange("regimeBoursier", v)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Non Boursier">
                              Non Boursier
                            </SelectItem>
                            <SelectItem value="Boursier">
                              Boursier (100%)
                            </SelectItem>
                            <SelectItem value="1/2 Boursier">
                              1/2 Boursier (50%)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Prise en charge */}
                    <div className="p-3 rounded-xl border bg-muted/10 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={form.priseEnCharge}
                          onChange={(e) =>
                            handleChange("priseEnCharge", e.target.checked)
                          }
                        />
                        <span className="text-sm font-semibold">
                          L'élève bénéficie d'une prise en charge ?
                        </span>
                      </label>
                      {form.priseEnCharge && (
                        <div className="space-y-1 pl-6 pt-1">
                          <Label className="text-xs">
                            Origine / Structure de la prise en charge *
                          </Label>
                          <Input
                            placeholder="Ex: Fondation Hînneh, Mécène, Ministère..."
                            value={form.originePriseEnCharge}
                            onChange={(e) =>
                              handleChange(
                                "originePriseEnCharge",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      )}
                    </div>

                    {/* Services facultatifs */}
                    <div className="p-3 rounded-xl border bg-muted/10">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                        Services Optionnels
                      </span>
                      <div className="flex gap-6 flex-wrap">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={form.serviceTransport}
                            onChange={(e) =>
                              handleChange("serviceTransport", e.target.checked)
                            }
                          />
                          <span className="text-sm font-medium">
                            🚌 Transport scolaire
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={form.serviceCantine}
                            onChange={(e) =>
                              handleChange("serviceCantine", e.target.checked)
                            }
                          />
                          <span className="text-sm font-medium">
                            🍽 Cantine scolaire
                          </span>
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── SOUS-ONGLET 3 : PARENTS & TUTEURS ── */}
                {formSubTab === "parents" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-5"
                  >
                    {/* Père */}
                    <div className="p-4 rounded-xl border bg-muted/10 space-y-3">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                        Informations sur le Père
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Nom & Prénoms du Père</Label>
                          <Input
                            placeholder="Nom complet du père"
                            value={form.pereNom}
                            onChange={(e) =>
                              handleChange("pereNom", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Profession</Label>
                          <Input
                            placeholder="Profession du père"
                            value={form.pereProfession}
                            onChange={(e) =>
                              handleChange("pereProfession", e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Téléphone / Cel.</Label>
                          <Input
                            placeholder="+225 0X XX XX XX"
                            value={form.perePhone}
                            onChange={(e) =>
                              handleChange("perePhone", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">E-mail</Label>
                          <Input
                            type="email"
                            placeholder="pere@exemple.ci"
                            value={form.pereEmail}
                            onChange={(e) =>
                              handleChange("pereEmail", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Boîte Postale (B.P.)</Label>
                          <Input
                            placeholder="B.P."
                            value={form.pereBoitePostale}
                            onChange={(e) =>
                              handleChange("pereBoitePostale", e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Mère */}
                    <div className="p-4 rounded-xl border bg-muted/10 space-y-3">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                        Informations sur la Mère
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Nom & Prénoms de la Mère</Label>
                          <Input
                            placeholder="Nom complet de la mère"
                            value={form.mereNom}
                            onChange={(e) =>
                              handleChange("mereNom", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Profession</Label>
                          <Input
                            placeholder="Profession de la mère"
                            value={form.mereProfession}
                            onChange={(e) =>
                              handleChange("mereProfession", e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Téléphone / Cel.</Label>
                          <Input
                            placeholder="+225 0X XX XX XX"
                            value={form.merePhone}
                            onChange={(e) =>
                              handleChange("merePhone", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">E-mail</Label>
                          <Input
                            type="email"
                            placeholder="mere@exemple.ci"
                            value={form.mereEmail}
                            onChange={(e) =>
                              handleChange("mereEmail", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Boîte Postale (B.P.)</Label>
                          <Input
                            placeholder="B.P."
                            value={form.mereBoitePostale}
                            onChange={(e) =>
                              handleChange("mereBoitePostale", e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Tuteur Légal */}
                    <div className="p-4 rounded-xl border bg-muted/10 space-y-3">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                        Tuteur Légal (Personne qui héberge l'élève)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Nom & Prénoms du Tuteur</Label>
                          <Input
                            placeholder="Nom complet du tuteur"
                            value={form.tuteurNom}
                            onChange={(e) =>
                              handleChange("tuteurNom", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Profession</Label>
                          <Input
                            placeholder="Profession du tuteur"
                            value={form.tuteurProfession}
                            onChange={(e) =>
                              handleChange("tuteurProfession", e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Téléphone / Cel.</Label>
                          <Input
                            placeholder="+225 0X XX XX XX"
                            value={form.tuteurPhone}
                            onChange={(e) =>
                              handleChange("tuteurPhone", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">E-mail</Label>
                          <Input
                            type="email"
                            placeholder="tuteur@exemple.ci"
                            value={form.tuteurEmail}
                            onChange={(e) =>
                              handleChange("tuteurEmail", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Boîte Postale (B.P.)</Label>
                          <Input
                            placeholder="B.P."
                            value={form.tuteurBoitePostale}
                            onChange={(e) =>
                              handleChange("tuteurBoitePostale", e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Responsable Scolarité */}
                    <div className="p-4 rounded-xl border bg-muted/10 space-y-3">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                        Personne en charge du suivi financier de la scolarité
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Nom & Prénoms</Label>
                          <Input
                            placeholder="Nom du payeur / responsable"
                            value={form.scolariteNom}
                            onChange={(e) =>
                              handleChange("scolariteNom", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Profession</Label>
                          <Input
                            placeholder="Profession"
                            value={form.scolariteProfession}
                            onChange={(e) =>
                              handleChange("scolariteProfession", e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Téléphone / Cel.</Label>
                          <Input
                            placeholder="+225 0X XX XX XX"
                            value={form.scolaritePhone}
                            onChange={(e) =>
                              handleChange("scolaritePhone", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">E-mail</Label>
                          <Input
                            type="email"
                            placeholder="responsable@exemple.ci"
                            value={form.scolariteEmail}
                            onChange={(e) =>
                              handleChange("scolariteEmail", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Boîte Postale (B.P.)</Label>
                          <Input
                            placeholder="B.P."
                            value={form.scolariteBoitePostale}
                            onChange={(e) =>
                              handleChange("scolariteBoitePostale", e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── SOUS-ONGLET 4 : RÉSIDENCE & SANTÉ ── */}
                {formSubTab === "residence" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-5"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Lieu de résidence principal *</Label>
                        <Select
                          value={form.lieuResidence}
                          onValueChange={(v) => handleChange("lieuResidence", v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pere_mere">
                              Chez Père et Mère
                            </SelectItem>
                            <SelectItem value="pere">
                              Chez le Père uniquement
                            </SelectItem>
                            <SelectItem value="mere">
                              Chez la Mère uniquement
                            </SelectItem>
                            <SelectItem value="tuteur">Chez le Tuteur</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Commune de résidence *</Label>
                        <Input
                          placeholder="Ex: Abobo, Cocody, Yopougon..."
                          value={form.commune}
                          onChange={(e) =>
                            handleChange("commune", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Quartier</Label>
                        <Input
                          placeholder="Ex: Biabou 2, Dokui, Angré..."
                          value={form.quartier}
                          onChange={(e) =>
                            handleChange("quartier", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Lot N° / Îlot</Label>
                        <Input
                          placeholder="Ex: Lot 145 Ilot 12"
                          value={form.lot}
                          onChange={(e) => handleChange("lot", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Adresse Géographique Détaillée / Repères</Label>
                      <Input
                        placeholder="Ex: Non loin de la Pharmacie du Rail, face à la mosquée"
                        value={form.adresseText}
                        onChange={(e) =>
                          handleChange("adresseText", e.target.value)
                        }
                      />
                    </div>

                    {/* Contacts Principaux */}
                    <div className="p-4 rounded-xl border bg-primary/5 space-y-3">
                      <span className="text-xs font-bold text-primary uppercase tracking-wider block">
                        Coordonnées Principales de Contact
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs">
                            Téléphone Principal (WhatsApp) *
                          </Label>
                          <Input
                            placeholder="+225 0X XX XX XX"
                            value={form.telephonePrincipal}
                            onChange={(e) =>
                              handleChange("telephonePrincipal", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Email Principal</Label>
                          <Input
                            type="email"
                            placeholder="parent@email.com"
                            value={form.emailPrincipal}
                            onChange={(e) =>
                              handleChange("emailPrincipal", e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Santé & Observations */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1">
                          <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                          Antécédents Médicaux / Santé
                        </Label>
                        <Textarea
                          placeholder="Allergies, asthme, groupe sanguin, recommandations médicales..."
                          value={form.notesSante}
                          onChange={(e) =>
                            handleChange("notesSante", e.target.value)
                          }
                          rows={3}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Observations Administratives</Label>
                        <Textarea
                          placeholder="Remarques particulières de l'agent d'accueil..."
                          value={form.observations}
                          onChange={(e) =>
                            handleChange("observations", e.target.value)
                          }
                          rows={3}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Boutons de navigation et soumission */}
                <div className="flex items-center justify-between border-t pt-5 mt-6 gap-3 flex-wrap">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setForm(emptyForm)}
                    >
                      Réinitialiser
                    </Button>
                    {formSubTab !== "identification" && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          if (formSubTab === "scolarite")
                            setFormSubTab("identification");
                          else if (formSubTab === "parents")
                            setFormSubTab("scolarite");
                          else if (formSubTab === "residence")
                            setFormSubTab("parents");
                        }}
                      >
                        ← Précédent
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {formSubTab !== "residence" ? (
                      <Button
                        type="button"
                        onClick={() => {
                          if (formSubTab === "identification")
                            setFormSubTab("scolarite");
                          else if (formSubTab === "scolarite")
                            setFormSubTab("parents");
                          else if (formSubTab === "parents")
                            setFormSubTab("residence");
                        }}
                        className="gap-1"
                      >
                        Suivant →
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6"
                      >
                        {saving ? (
                          <Clock className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {saving
                          ? "Enregistrement en cours…"
                          : "Enregistrer la pré-inscription"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Dialog Détail Complet du Dossier */}
      {openDetail && (
        <Dialog open={!!openDetail} onOpenChange={() => setOpenDetail(null)}>
          <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
            <DialogHeader className="border-b pb-3">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="w-5 h-5 text-primary" />
                Dossier de Préinscription — {formatStudentName(openDetail)}
              </DialogTitle>
            </DialogHeader>

            {/* Sous-onglets de consultation */}
            <div className="flex border-b gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDetailSubTab("identification")}
                className={`px-3 py-1.5 border-b-2 font-medium transition-all ${
                  detailSubTab === "identification"
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                1. Identité
              </button>
              <button
                type="button"
                onClick={() => setDetailSubTab("scolarite")}
                className={`px-3 py-1.5 border-b-2 font-medium transition-all ${
                  detailSubTab === "scolarite"
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                2. Scolarité & Statuts
              </button>
              <button
                type="button"
                onClick={() => setDetailSubTab("parents")}
                className={`px-3 py-1.5 border-b-2 font-medium transition-all ${
                  detailSubTab === "parents"
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                3. Parents
              </button>
              <button
                type="button"
                onClick={() => setDetailSubTab("residence")}
                className={`px-3 py-1.5 border-b-2 font-medium transition-all ${
                  detailSubTab === "residence"
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                4. Résidence & Santé
              </button>
            </div>

            <div className="py-3 text-sm space-y-4">
              {/* TAB 1: IDENTITÉ */}
              {detailSubTab === "identification" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-4 p-3 bg-muted/20 rounded-xl">
                    <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                      {openDetail.firstName?.[0] || "E"}
                    </div>
                    <div>
                      <p className="text-base font-bold text-foreground">
                        {formatStudentName(openDetail)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Sexe : {openDetail.gender === "M" ? "Masculin (M)" : "Féminin (F)"} | Date de naissance : {openDetail.dateOfBirth || "—"}
                      </p>
                      {openDetail.lieuNaissance && (
                        <p className="text-xs text-muted-foreground">
                          Lieu de naissance : {openDetail.lieuNaissance} ({openDetail.nationalite || "Ivoirienne"})
                        </p>
                      )}
                    </div>
                  </div>

                  {(openDetail.extraitNo || openDetail.extraitDate || openDetail.extraitLieu) && (
                    <div className="p-3 rounded-lg border bg-muted/10 text-xs space-y-1">
                      <span className="font-semibold text-muted-foreground uppercase block">
                        Extrait d'acte de naissance
                      </span>
                      <p>
                        N° : <strong className="text-foreground">{openDetail.extraitNo || "—"}</strong>
                        {openDetail.extraitDate && ` | Établi le : ${openDetail.extraitDate}`}
                        {openDetail.extraitLieu && ` | À : ${openDetail.extraitLieu}`}
                      </p>
                    </div>
                  )}

                  {openDetail.handicap === "OUI" && (
                    <div className="p-2.5 rounded-lg border border-amber-300 bg-amber-50 text-xs text-amber-900">
                      <strong>Situation de handicap signalée :</strong> {openDetail.autresHandicap || "Oui"}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SCOLARITÉ */}
              {detailSubTab === "scolarite" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 rounded-xl text-xs">
                    <div>
                      <span className="text-muted-foreground">Niveau souhaité :</span>{" "}
                      <strong className="text-foreground text-sm block">
                        {openDetail.niveau || "—"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type d'opération :</span>{" "}
                      <strong className="text-foreground text-sm block">
                        {openDetail.typeInscription === "reinscription"
                          ? "Réinscription"
                          : "Nouvelle Inscription"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Qualité Élève :</span>{" "}
                      <strong className="text-foreground block">
                        {openDetail.qualiteEleve || "Non Redoublant(e)"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Statut Orientation :</span>{" "}
                      <strong className="text-foreground block">
                        {openDetail.statutOrientation || "Affecté"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Régime boursier :</span>{" "}
                      <strong className="text-foreground block">
                        {openDetail.regimeBoursier || "Non Boursier"}
                      </strong>
                    </div>
                    {openDetail.matriculeNational && (
                      <div>
                        <span className="text-muted-foreground">Matricule National :</span>{" "}
                        <strong className="text-foreground font-mono block">
                          {openDetail.matriculeNational}
                        </strong>
                      </div>
                    )}
                  </div>

                  {(openDetail.ecoleOrigine || openDetail.classePrecedente || openDetail.noTable) && (
                    <div className="p-3 rounded-lg border bg-muted/10 text-xs space-y-1">
                      <span className="font-semibold text-muted-foreground uppercase block">
                        Antécédents scolaires
                      </span>
                      <p>
                        École d'origine : {openDetail.ecoleOrigine || "—"} | Classe précédente : {openDetail.classePrecedente || "—"}
                      </p>
                      {openDetail.noTable && <p>N° Table examen : {openDetail.noTable}</p>}
                    </div>
                  )}

                  {openDetail.priseEnCharge && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-violet-50 border border-violet-200 text-xs text-violet-900">
                      <Badge className="bg-violet-600 text-white">
                        Prise en charge
                      </Badge>
                      <span>{openDetail.originePriseEnCharge || "Non précisé"}</span>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap pt-1">
                    {openDetail.serviceTransport && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        🚌 Transport scolaire
                      </Badge>
                    )}
                    {openDetail.serviceCantine && (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                        🍽 Cantine scolaire
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: PARENTS */}
              {detailSubTab === "parents" && (
                <div className="space-y-3 text-xs">
                  {openDetail.pereNom && (
                    <div className="p-3 rounded-lg border bg-muted/10 space-y-1">
                      <span className="font-semibold text-muted-foreground uppercase block">Père</span>
                      <p className="font-bold text-foreground text-sm">{openDetail.pereNom}</p>
                      <p>Tél : {openDetail.perePhone || "—"} | Email : {openDetail.pereEmail || "—"}</p>
                    </div>
                  )}
                  {openDetail.mereNom && (
                    <div className="p-3 rounded-lg border bg-muted/10 space-y-1">
                      <span className="font-semibold text-muted-foreground uppercase block">Mère</span>
                      <p className="font-bold text-foreground text-sm">{openDetail.mereNom}</p>
                      <p>Tél : {openDetail.merePhone || "—"} | Email : {openDetail.mereEmail || "—"}</p>
                    </div>
                  )}
                  {openDetail.tuteurNom && (
                    <div className="p-3 rounded-lg border bg-muted/10 space-y-1">
                      <span className="font-semibold text-muted-foreground uppercase block">Tuteur Légal</span>
                      <p className="font-bold text-foreground text-sm">{openDetail.tuteurNom}</p>
                      <p>Tél : {openDetail.tuteurPhone || "—"} | Email : {openDetail.tuteurEmail || "—"}</p>
                    </div>
                  )}
                  {!openDetail.pereNom && !openDetail.mereNom && !openDetail.tuteurNom && (
                    <div className="p-3 rounded-lg border bg-muted/10 space-y-1">
                      <span className="font-semibold text-muted-foreground uppercase block">Contact Principal</span>
                      <p className="font-bold text-foreground text-sm">{openDetail.parentNom || "—"}</p>
                      <p>Tél : {openDetail.parentTel || "—"} | Email : {openDetail.parentEmail || "—"}</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: RÉSIDENCE & SANTÉ */}
              {detailSubTab === "residence" && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-lg border bg-muted/10 space-y-1">
                    <span className="font-semibold text-muted-foreground uppercase block">
                      Adresse Géographique
                    </span>
                    <p>
                      Commune : <strong>{openDetail.commune || "—"}</strong> | Quartier : <strong>{openDetail.quartier || "—"}</strong>
                      {openDetail.lot && ` | Lot : ${openDetail.lot}`}
                    </p>
                    {openDetail.adresseText && <p>Indications : {openDetail.adresseText}</p>}
                  </div>

                  {openDetail.notesSante && (
                    <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-900 space-y-1">
                      <span className="font-semibold uppercase block flex items-center gap-1">
                        <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                        Notes Médicales / Santé
                      </span>
                      <p>{openDetail.notesSante}</p>
                    </div>
                  )}

                  {openDetail.observations && (
                    <div className="p-3 rounded-lg border bg-muted/10 space-y-1">
                      <span className="font-semibold text-muted-foreground uppercase block">
                        Observations de l'Accueil
                      </span>
                      <p className="italic">{openDetail.observations}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between border-t pt-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Statut du dossier :</span>
                  <Badge variant={statutConfig[openDetail.statut].variant}>
                    {statutConfig[openDetail.statut].label}
                  </Badge>
                </div>
                <span className="text-muted-foreground">
                  Créé le : {openDetail.createdAt}
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2 flex-wrap border-t pt-3">
              <Button variant="outline" onClick={() => setOpenDetail(null)}>
                Fermer
              </Button>
              {openDetail.statut === "en_attente" && (
                <>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleAnnuler(openDetail.id)}
                  >
                    Annuler le dossier
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleTransmettre(openDetail.id)}
                  >
                    <ChevronRight className="h-4 w-4" />
                    Transmettre à la Scolarité
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  );
}
