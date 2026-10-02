import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  UserPlus,
  Shield,
  Database,
  FileText,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Plus,
  School,
  DoorOpen,
  Clock,
  Sparkles,
  Check,
  CheckCircle2,
  AlertCircle,
  Info,
  Save,
  Trash,
  Search,
  Star,
  Gift,
  Users,
  Printer,
  Lock,
  KeyRound,
  MapPin,
  Wand2,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  formatDateTime,
  getStatusBadgeColor,
  type UserRole,
  ROUTE_PATHS,
  formatStudentName,
} from "@/lib/index";
import { motion } from "framer-motion";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { printSchedule } from "@/lib/printSchedule";
import { ClassTimetableManager } from "@/components/ClassTimetableManager";
import { AuditLogViewer } from "@/components/AuditLogViewer";

interface User {
  id: string;
  nom: string;
  email: string;
  role: UserRole;
  etablissement?: string;
  dernierAcces: Date;
  statut: "actif" | "desactive";
}

interface Role {
  id: string;
  name: string;
  label: string;
  description: string;
  moduleCount: number;
}

interface ReferenceData {
  id: string;
  code: string;
  libelle: string;
  ordre?: number;
  actif: boolean;
}

interface AuditLog {
  id: string;
  timestamp: Date;
  utilisateur: string;
  action: string;
  module: string;
  detail: string;
  ipAddress: string;
}

const roles: Role[] = [
  {
    id: "role-0",
    name: "superuser",
    label: "Super Utilisateur",
    description:
      "Accès absolu et visibilité totale de tous les menus et modules",
    moduleCount: 15,
  },
  {
    id: "role-1",
    name: "direction_fondation",
    label: "Direction Fondation",
    description: "Accès complet à tous les modules et établissements",
    moduleCount: 12,
  },
  {
    id: "role-2",
    name: "directeur_ecole",
    label: "Directeur d'École",
    description: "Gestion complète d'un établissement",
    moduleCount: 10,
  },
  {
    id: "role-3",
    name: "enseignant",
    label: "Enseignant",
    description: "Gestion des notes, présences et vie scolaire",
    moduleCount: 5,
  },
  {
    id: "role-4",
    name: "educateur",
    label: "Éducateur",
    description:
      "Gestion des élèves, vie scolaire, ressources humaines et espaces administratifs",
    moduleCount: 6,
  },
  {
    id: "role-5",
    name: "parent",
    label: "Parent",
    description: "Consultation du dossier de l'élève",
    moduleCount: 3,
  },
  {
    id: "role-6",
    name: "comptable",
    label: "Comptable",
    description: "Gestion financière et paiements",
    moduleCount: 4,
  },
  {
    id: "role-7",
    name: "rh",
    label: "Ressources Humaines",
    description: "Gestion du personnel",
    moduleCount: 3,
  },
  {
    id: "role-8",
    name: "admin",
    label: "Administrateur Système",
    description: "Configuration et administration technique",
    moduleCount: 12,
  },
  {
    id: "role-9",
    name: "scolarite",
    label: "Scolarité",
    description: "Espace Scolarité",
    moduleCount: 4,
  },
  {
    id: "role-10",
    name: "accueil",
    label: "Acueil",
    description: "Espace Accueil",
    moduleCount: 2,
  },
];

const cycles: ReferenceData[] = [
  { id: "cycle-1", code: "MAT", libelle: "Maternelle", ordre: 1, actif: true },
  { id: "cycle-2", code: "PRI", libelle: "Primaire", ordre: 2, actif: true },
  { id: "cycle-3", code: "COL", libelle: "Collège", ordre: 3, actif: true },
  {
    id: "cycle-4",
    code: "LYC",
    libelle: "Collège 2nd cycle",
    ordre: 4,
    actif: true,
  },
];

const matieres: ReferenceData[] = [
  { id: "mat-1", code: "MATH", libelle: "Mathématiques", actif: true },
  { id: "mat-2", code: "FR", libelle: "Français", actif: true },
  { id: "mat-3", code: "ANG", libelle: "Anglais", actif: true },
  { id: "mat-4", code: "HG", libelle: "Histoire-Géographie", actif: true },
  { id: "mat-5", code: "PC", libelle: "Sciences Physiques", actif: true },
  { id: "mat-6", code: "SVT", libelle: "SVT", actif: true },
  { id: "mat-7", code: "AR", libelle: "Arabe", actif: true },
  { id: "mat-8", code: "EI", libelle: "Éducation Islamique", actif: true },
  { id: "mat-9", code: "COR", libelle: "Coran", actif: true },
  { id: "mat-10", code: "TAJ", libelle: "Tajwid", actif: true },
];

const typesFrais: ReferenceData[] = [
  { id: "frais-1", code: "SCOL", libelle: "Scolarité", actif: true },
  { id: "frais-2", code: "INSC", libelle: "Inscription", actif: true },
  { id: "frais-3", code: "CANT", libelle: "Cantine", actif: true },
  { id: "frais-4", code: "TRANS", libelle: "Transport", actif: true },
  { id: "frais-5", code: "FOUR", libelle: "Fournitures", actif: true },
];

const motifsAbsence: ReferenceData[] = [
  { id: "abs-1", code: "MAL", libelle: "Maladie", actif: true },
  { id: "abs-2", code: "FAM", libelle: "Événement familial", actif: true },
  { id: "abs-3", code: "MED", libelle: "Rendez-vous médical", actif: true },
  { id: "abs-4", code: "AUT", libelle: "Autre motif justifié", actif: true },
];

const sanctions: ReferenceData[] = [
  {
    id: "sanc-1",
    code: "AVER",
    libelle: "Avertissement",
    ordre: 1,
    actif: true,
  },
  {
    id: "sanc-2",
    code: "CONV",
    libelle: "Convocation parents",
    ordre: 2,
    actif: true,
  },
  {
    id: "sanc-3",
    code: "EXCL",
    libelle: "Exclusion temporaire",
    ordre: 3,
    actif: true,
  },
  {
    id: "sanc-4",
    code: "TIG",
    libelle: "Travail d'intérêt général",
    ordre: 2,
    actif: true,
  },
];

const fonctionsRH: ReferenceData[] = [
  { id: "fonc-1", code: "ENS", libelle: "Enseignant", actif: true },
  {
    id: "fonc-2",
    code: "ADM",
    libelle: "Personnel administratif",
    actif: true,
  },
  { id: "fonc-3", code: "COR", libelle: "Enseignant coranique", actif: true },
  { id: "fonc-4", code: "SURV", libelle: "Surveillant", actif: true },
  { id: "fonc-5", code: "SERV", libelle: "Personnel de service", actif: true },
  { id: "fonc-6", code: "DIR", libelle: "Direction", actif: true },
];

const sourates: ReferenceData[] = [
  { id: "sou-1", code: "001", libelle: "Al-Fatiha", ordre: 1, actif: true },
  { id: "sou-2", code: "002", libelle: "Al-Baqara", ordre: 2, actif: true },
  { id: "sou-3", code: "003", libelle: "Ali Imran", ordre: 3, actif: true },
  { id: "sou-18", code: "018", libelle: "Al-Kahf", ordre: 18, actif: true },
  { id: "sou-36", code: "036", libelle: "Ya-Sin", ordre: 36, actif: true },
  { id: "sou-67", code: "067", libelle: "Al-Mulk", ordre: 67, actif: true },
  { id: "sou-112", code: "112", libelle: "Al-Ikhlas", ordre: 112, actif: true },
  { id: "sou-113", code: "113", libelle: "Al-Falaq", ordre: 113, actif: true },
  { id: "sou-114", code: "114", libelle: "An-Nas", ordre: 114, actif: true },
];

const auditLogs: AuditLog[] = [
  {
    id: "log-1",
    timestamp: new Date(2025, 4, 7, 14, 23),
    utilisateur: "Admin Système",
    action: "Création utilisateur",
    module: "Administration",
    detail: "Nouvel enseignant créé: Kouadio Yao",
    ipAddress: "192.168.1.45",
  },
  {
    id: "log-2",
    timestamp: new Date(2025, 4, 7, 13, 15),
    utilisateur: "Direction Fondation",
    action: "Modification rôle",
    module: "Administration",
    detail: "Rôle modifié: Enseignant → Directeur",
    ipAddress: "192.168.1.10",
  },
  {
    id: "log-3",
    timestamp: new Date(2025, 4, 7, 11, 45),
    utilisateur: "Comptable Abidjan",
    action: "Validation paiement",
    module: "Finance",
    detail: "Paiement validé: 150 000 FCFA",
    ipAddress: "192.168.1.78",
  },
  {
    id: "log-4",
    timestamp: new Date(2025, 4, 7, 10, 30),
    utilisateur: "Enseignant Bouaké",
    action: "Saisie notes",
    module: "Pédagogie",
    detail: "Notes saisies: Mathématiques 6ème A",
    ipAddress: "192.168.2.34",
  },
  {
    id: "log-5",
    timestamp: new Date(2025, 4, 7, 9, 12),
    utilisateur: "Directeur Yamoussoukro",
    action: "Validation bulletin",
    module: "Pédagogie",
    detail: "Bulletins validés: Trimestre 2",
    ipAddress: "192.168.3.12",
  },
  {
    id: "log-6",
    timestamp: new Date(2025, 4, 6, 16, 50),
    utilisateur: "Admin Système",
    action: "Désactivation utilisateur",
    module: "Administration",
    detail: "Utilisateur désactivé: ancien_personnel@hinneh.ci",
    ipAddress: "192.168.1.10",
  },
  {
    id: "log-7",
    timestamp: new Date(2025, 4, 6, 15, 20),
    utilisateur: "RH Fondation",
    action: "Ajout personnel",
    module: "RH",
    detail: "Nouveau personnel: Surveillant",
    ipAddress: "192.168.1.55",
  },
  {
    id: "log-8",
    timestamp: new Date(2025, 4, 6, 14, 5),
    utilisateur: "Direction Fondation",
    action: "Export rapport",
    module: "Reporting",
    detail: "Rapport mensuel exporté: Avril 2025",
    ipAddress: "192.168.1.10",
  },
];

// ─── Module Inspection ────────────────────────────────────────────────────────

function InspectionModule({
  staffList,
  classesList,
}: {
  staffList: any[];
  classesList: any[];
}) {
  const { toast } = useToast();
  const [visites, setVisites] = useState<
    Array<{
      id: string;
      date: string;
      inspecteur: string;
      classeId: string;
      enseignantId: string;
      matiere: string;
      observations: string;
      points_forts: string;
      points_faibles: string;
      note: number;
      statut: "planifiee" | "realisee";
    }>
  >([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    date: "",
    inspecteur: "",
    classeId: "",
    enseignantId: "",
    matiere: "",
    observations: "",
    points_forts: "",
    points_faibles: "",
    note: 14,
    statut: "planifiee" as "planifiee" | "realisee",
  });

  const enseignants = staffList.filter((s) =>
    ["enseignant", "instituteur", "professeur"].some((f) =>
      (s.fonction ?? "").toLowerCase().includes(f),
    ),
  );

  const handleAdd = () => {
    if (
      !form.date ||
      !form.inspecteur ||
      !form.classeId ||
      !form.enseignantId
    ) {
      toast({
        variant: "destructive",
        title: "Champs requis",
        description: "Remplissez date, inspecteur, classe et enseignant.",
      });
      return;
    }
    setVisites((prev) => [{ ...form, id: `visite-${Date.now()}` }, ...prev]);
    toast({ title: "Visite d'inspection enregistrée." });
    setOpen(false);
    setForm({
      date: "",
      inspecteur: "",
      classeId: "",
      enseignantId: "",
      matiere: "",
      observations: "",
      points_forts: "",
      points_faibles: "",
      note: 14,
      statut: "planifiee",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Module Inspection</h2>
          <p className="text-sm text-muted-foreground">
            Suivi des visites d'inspection pédagogique par classe et enseignant.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nouvelle visite
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Enregistrer une visite d'inspection</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2 max-h-[65vh] overflow-y-auto px-1">
            <div className="space-y-1">
              <Label>Date *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((p) => ({ ...p, date: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Inspecteur *</Label>
              <Input
                placeholder="Nom de l'inspecteur"
                value={form.inspecteur}
                onChange={(e) =>
                  setForm((p) => ({ ...p, inspecteur: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Classe *</Label>
              <Select
                value={form.classeId}
                onValueChange={(v) => setForm((p) => ({ ...p, classeId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Classe" />
                </SelectTrigger>
                <SelectContent>
                  {classesList.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name || c.CE_LIBELLE}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Enseignant *</Label>
              <Select
                value={form.enseignantId}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, enseignantId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Enseignant" />
                </SelectTrigger>
                <SelectContent>
                  {enseignants.map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {formatStudentName(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Matière</Label>
              <Input
                placeholder="ex: Mathématiques"
                value={form.matiere}
                onChange={(e) =>
                  setForm((p) => ({ ...p, matiere: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Note /20</Label>
              <Input
                type="number"
                min={0}
                max={20}
                step={0.5}
                value={form.note}
                onChange={(e) =>
                  setForm((p) => ({ ...p, note: Number(e.target.value) }))
                }
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Points forts</Label>
              <Textarea
                rows={2}
                placeholder="Points positifs observés..."
                value={form.points_forts}
                onChange={(e) =>
                  setForm((p) => ({ ...p, points_forts: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Points à améliorer</Label>
              <Textarea
                rows={2}
                placeholder="Axes d'amélioration..."
                value={form.points_faibles}
                onChange={(e) =>
                  setForm((p) => ({ ...p, points_faibles: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Observations générales</Label>
              <Textarea
                rows={2}
                placeholder="Observations..."
                value={form.observations}
                onChange={(e) =>
                  setForm((p) => ({ ...p, observations: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Statut</Label>
              <Select
                value={form.statut}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    statut: v as "planifiee" | "realisee",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planifiee">Planifiée</SelectItem>
                  <SelectItem value="realisee">Réalisée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAdd}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/80 border-b">
              <tr>
                <th className="text-left p-3 font-semibold">Date</th>
                <th className="text-left p-3 font-semibold">Inspecteur</th>
                <th className="text-left p-3 font-semibold">Classe</th>
                <th className="text-left p-3 font-semibold">Enseignant</th>
                <th className="text-left p-3 font-semibold">Matière</th>
                <th className="text-center p-3 font-semibold">Note</th>
                <th className="text-center p-3 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody>
              {visites.map((v) => {
                const cls = classesList.find(
                  (c: any) => String(c.id) === v.classeId,
                );
                const ens = staffList.find(
                  (s: any) => String(s.id) === v.enseignantId,
                );
                return (
                  <tr key={v.id} className="border-b hover:bg-muted/20">
                    <td className="p-3">{v.date}</td>
                    <td className="p-3 font-medium">{v.inspecteur}</td>
                    <td className="p-3">
                      {cls?.name || cls?.CE_LIBELLE || v.classeId}
                    </td>
                    <td className="p-3">
                      {ens
                        ? `${formatStudentName(ens)}`
                        : v.enseignantId}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {v.matiere || "—"}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`font-bold font-mono ${v.note >= 14 ? "text-green-600" : v.note >= 10 ? "text-amber-600" : "text-destructive"}`}
                      >
                        {v.note}/20
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <Badge
                        variant={
                          v.statut === "realisee" ? "default" : "secondary"
                        }
                      >
                        {v.statut === "realisee" ? "Réalisée" : "Planifiée"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {visites.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center p-8 text-muted-foreground italic"
                  >
                    Aucune visite enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── Module Conseil de classe ─────────────────────────────────────────────────

function ConseilClasseModule({
  classesList,
  staffList,
}: {
  classesList: any[];
  staffList: any[];
}) {
  const { toast } = useToast();
  const [conseils, setConseils] = useState<
    Array<{
      id: string;
      date: string;
      classeId: string;
      trimestre: "1" | "2" | "3";
      presidentId: string;
      ordre_du_jour: string;
      decisions: string;
      pv: string;
      statut: "planifie" | "tenu";
    }>
  >([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    date: "",
    classeId: "",
    trimestre: "1" as "1" | "2" | "3",
    presidentId: "",
    ordre_du_jour: "",
    decisions: "",
    pv: "",
    statut: "planifie" as "planifie" | "tenu",
  });

  const handleAdd = () => {
    if (!form.date || !form.classeId) {
      toast({
        variant: "destructive",
        title: "Champs requis",
        description: "Date et classe obligatoires.",
      });
      return;
    }
    setConseils((prev) => [{ ...form, id: `conseil-${Date.now()}` }, ...prev]);
    toast({ title: "Conseil de classe enregistré." });
    setOpen(false);
    setForm({
      date: "",
      classeId: "",
      trimestre: "1",
      presidentId: "",
      ordre_du_jour: "",
      decisions: "",
      pv: "",
      statut: "planifie",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Conseils de classe</h2>
          <p className="text-sm text-muted-foreground">
            Planification et procès-verbaux des conseils de classe trimestriels.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nouveau conseil
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Planifier un conseil de classe</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2 max-h-[65vh] overflow-y-auto px-1">
            <div className="space-y-1">
              <Label>Date *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((p) => ({ ...p, date: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Trimestre</Label>
              <Select
                value={form.trimestre}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, trimestre: v as "1" | "2" | "3" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1er Trimestre</SelectItem>
                  <SelectItem value="2">2ème Trimestre</SelectItem>
                  <SelectItem value="3">3ème Trimestre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Classe *</Label>
              <Select
                value={form.classeId}
                onValueChange={(v) => setForm((p) => ({ ...p, classeId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Classe" />
                </SelectTrigger>
                <SelectContent>
                  {classesList.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name || c.CE_LIBELLE}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Président du conseil</Label>
              <Select
                value={form.presidentId}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, presidentId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Président" />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {formatStudentName(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Ordre du jour</Label>
              <Textarea
                rows={2}
                placeholder="Points à l'ordre du jour..."
                value={form.ordre_du_jour}
                onChange={(e) =>
                  setForm((p) => ({ ...p, ordre_du_jour: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Décisions prises</Label>
              <Textarea
                rows={2}
                placeholder="Décisions issues du conseil..."
                value={form.decisions}
                onChange={(e) =>
                  setForm((p) => ({ ...p, decisions: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Procès-verbal (résumé)</Label>
              <Textarea
                rows={3}
                placeholder="PV du conseil de classe..."
                value={form.pv}
                onChange={(e) => setForm((p) => ({ ...p, pv: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Statut</Label>
              <Select
                value={form.statut}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, statut: v as "planifie" | "tenu" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planifie">Planifié</SelectItem>
                  <SelectItem value="tenu">Tenu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAdd}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {conseils.map((c) => {
          const cls = classesList.find(
            (cl: any) => String(cl.id) === c.classeId,
          );
          const pres = staffList.find(
            (s: any) => String(s.id) === c.presidentId,
          );
          return (
            <Card
              key={c.id}
              className={`border-l-4 ${c.statut === "tenu" ? "border-l-green-500" : "border-l-primary"}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {cls?.name || cls?.CE_LIBELLE || "Classe"}
                  </CardTitle>
                  <Badge
                    variant={c.statut === "tenu" ? "default" : "secondary"}
                  >
                    {c.statut === "tenu" ? "Tenu" : "Planifié"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {c.date} — Trimestre {c.trimestre}
                </p>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                {pres && (
                  <p>
                    <span className="font-semibold">Président :</span>{" "}
                    {formatStudentName(pres)}
                  </p>
                )}
                {c.ordre_du_jour && (
                  <p className="text-muted-foreground truncate">
                    <span className="font-semibold text-foreground">ODJ :</span>{" "}
                    {c.ordre_du_jour}
                  </p>
                )}
                {c.decisions && (
                  <p className="text-muted-foreground truncate">
                    <span className="font-semibold text-foreground">
                      Décisions :
                    </span>{" "}
                    {c.decisions}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
        {conseils.length === 0 && (
          <div className="col-span-3 text-center p-10 text-muted-foreground italic">
            Aucun conseil enregistré.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Module Chronogramme & Anniversaires ─────────────────────────────────────

function ChronogrammeModule({ staffList }: { staffList: any[] }) {
  const { toast } = useToast();
  const today = new Date();
  const todayMMDD = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const [evenements, setEvenements] = useState<
    Array<{
      id: string;
      titre: string;
      date: string;
      type: "scolaire" | "islamique" | "administratif" | "sportif" | "culturel";
      description: string;
      lieu: string;
    }>
  >([
    {
      id: "ev-1",
      titre: "Rentrée scolaire",
      date: "2025-10-01",
      type: "scolaire",
      description: "Reprise des cours — début du 1er trimestre",
      lieu: "Tous les établissements",
    },
    {
      id: "ev-2",
      titre: "Composition T1",
      date: "2025-12-15",
      type: "scolaire",
      description: "Compositions du 1er trimestre",
      lieu: "Tous les établissements",
    },
    {
      id: "ev-3",
      titre: "Fête du Travail",
      date: "2026-05-01",
      type: "administratif",
      description: "Journée fériée nationale",
      lieu: "—",
    },
    {
      id: "ev-4",
      titre: "Composition T3",
      date: "2026-06-10",
      type: "scolaire",
      description: "Compositions du 3ème trimestre — IEP",
      lieu: "Tous les établissements",
    },
  ]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    titre: "",
    date: "",
    type: "scolaire" as
      | "scolaire"
      | "islamique"
      | "administratif"
      | "sportif"
      | "culturel",
    description: "",
    lieu: "",
  });

  const handleAdd = () => {
    if (!form.titre || !form.date) {
      toast({
        variant: "destructive",
        title: "Champs requis",
        description: "Titre et date obligatoires.",
      });
      return;
    }
    setEvenements((prev) =>
      [...prev, { ...form, id: `ev-${Date.now()}` }].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    );
    toast({ title: "Événement ajouté au chronogramme." });
    setOpen(false);
    setForm({
      titre: "",
      date: "",
      type: "scolaire",
      description: "",
      lieu: "",
    });
  };

  const typeColors: Record<string, string> = {
    scolaire: "bg-blue-100 text-blue-800 border-blue-300",
    islamique: "bg-emerald-100 text-emerald-800 border-emerald-300",
    administratif: "bg-purple-100 text-purple-800 border-purple-300",
    sportif: "bg-orange-100 text-orange-800 border-orange-300",
    culturel: "bg-pink-100 text-pink-800 border-pink-300",
  };

  // Anniversaires du personnel ce mois-ci
  const anniversairesMois = staffList
    .filter((s) => {
      if (!s.dateOfBirth && !s.date_naissance) return false;
      const dob = new Date(s.dateOfBirth || s.date_naissance);
      return !isNaN(dob.getTime()) && dob.getMonth() === today.getMonth();
    })
    .sort((a, b) => {
      const da = new Date(a.dateOfBirth || a.date_naissance).getDate();
      const db = new Date(b.dateOfBirth || b.date_naissance).getDate();
      return da - db;
    });

  const anniversairesAujourdhui = anniversairesMois.filter((s) => {
    const dob = new Date(s.dateOfBirth || s.date_naissance);
    return (
      `${String(dob.getMonth() + 1).padStart(2, "0")}-${String(dob.getDate()).padStart(2, "0")}` ===
      todayMMDD
    );
  });

  return (
    <div className="space-y-6">
      {/* Anniversaires du jour */}
      {anniversairesAujourdhui.length > 0 && (
        <Card className="border-2 border-yellow-300 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-yellow-800">
              <Gift className="h-5 w-5" /> Anniversaires aujourd'hui 🎉
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {anniversairesAujourdhui.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-yellow-200 shadow-sm"
              >
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="font-medium text-sm">
                  {formatStudentName(s)}
                </span>
                <span className="text-xs text-muted-foreground capitalize">
                  {s.fonction}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Anniversaires du mois */}
      {anniversairesMois.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Gift className="h-4 w-4 text-pink-500" /> Anniversaires ce mois (
              {today.toLocaleString("fr-FR", { month: "long" })})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {anniversairesMois.map((s) => {
                const dob = new Date(s.dateOfBirth || s.date_naissance);
                const isToday =
                  `${String(dob.getMonth() + 1).padStart(2, "0")}-${String(dob.getDate()).padStart(2, "0")}` ===
                  todayMMDD;
                return (
                  <span
                    key={s.id}
                    className={`text-xs px-2 py-1 rounded-full border font-medium ${isToday ? "bg-yellow-100 border-yellow-300 text-yellow-800" : "bg-muted border-border text-muted-foreground"}`}
                  >
                    {dob.getDate()} — {formatStudentName(s)}
                    {isToday && " 🎂"}
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chronogramme */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Chronogramme scolaire</h2>
          <p className="text-sm text-muted-foreground">
            Calendrier des événements pédagogiques, islamiques et
            administratifs.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Ajouter événement
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un événement</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Titre *</Label>
                <Input
                  placeholder="Titre de l'événement"
                  value={form.titre}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, titre: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, date: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, type: v as typeof form.type }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scolaire">Scolaire</SelectItem>
                    <SelectItem value="islamique">Islamique</SelectItem>
                    <SelectItem value="administratif">Administratif</SelectItem>
                    <SelectItem value="sportif">Sportif</SelectItem>
                    <SelectItem value="culturel">Culturel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Lieu</Label>
                <Input
                  placeholder="Lieu"
                  value={form.lieu}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, lieu: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                rows={2}
                placeholder="Description..."
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAdd}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {evenements.map((ev) => {
          const evDate = new Date(ev.date);
          const isPast = evDate < today;
          const isUpcoming =
            !isPast &&
            evDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
          return (
            <Card
              key={ev.id}
              className={`flex items-start gap-4 p-4 ${isPast ? "opacity-60" : isUpcoming ? "border-primary/50 bg-primary/5" : ""}`}
            >
              <div className="text-center min-w-[48px]">
                <p className="text-xl font-bold font-mono leading-none">
                  {String(evDate.getDate()).padStart(2, "0")}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {evDate.toLocaleString("fr-FR", { month: "short" })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {evDate.getFullYear()}
                </p>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{ev.titre}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${typeColors[ev.type] ?? "bg-muted"}`}
                  >
                    {ev.type}
                  </span>
                  {isUpcoming && (
                    <Badge variant="default" className="text-[10px]">
                      Bientôt
                    </Badge>
                  )}
                  {isPast && (
                    <Badge variant="secondary" className="text-[10px]">
                      Passé
                    </Badge>
                  )}
                </div>
                {ev.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ev.description}
                  </p>
                )}
                {ev.lieu && ev.lieu !== "—" && (
                  <p className="text-xs text-muted-foreground">📍 {ev.lieu}</p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Composant Principal ──────────────────────────────────────────────────────

export default function Administration() {
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [allPointages, setAllPointages] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");

  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [schoolsList, setSchoolsList] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [levelsList, setLevelsList] = useState<any[]>([]);
  const [cyclesList, setCyclesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit User Role & Access States
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editRole, setEditRole] = useState<string>("enseignant");
  const [editStatus, setEditStatus] = useState<"actif" | "desactive">("actif");
  const [editEcoles, setEditEcoles] = useState<number[]>([]);
  const [editVilles, setEditVilles] = useState<string[]>([]);
  const [editPassword, setEditPassword] = useState<string>("");

  // Villes states
  const [villesList, setVillesList] = useState<any[]>([]);
  const [createVilleOpen, setCreateVilleOpen] = useState(false);
  const [newVilleLibelle, setNewVilleLibelle] = useState("");
  const [newVilleCode, setNewVilleCode] = useState("");
  const [newVilleRegion, setNewVilleRegion] = useState("");

  // Form states - User
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [password, setPassword] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [selectedEcoles, setSelectedEcoles] = useState<number[]>([]);
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>("all");

  const toggleAdminEcoleSelection = (id: number) => {
    setSelectedEcoles((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleOpenEditUser = (u: User) => {
    setEditingUser(u);
    setEditRole(u.role);
    setEditStatus(u.statut);
    setEditPassword("");
    const rawStaff = staffList.find((s) => String(s.id) === String(u.id) || s.email === u.email);
    if (rawStaff && Array.isArray(rawStaff.ecolesAutorisees)) {
      setEditEcoles(rawStaff.ecolesAutorisees);
    } else {
      setEditEcoles([]);
    }
    if (rawStaff && Array.isArray((rawStaff as any).villesAutorisees)) {
      setEditVilles((rawStaff as any).villesAutorisees);
    } else {
      setEditVilles([]);
    }
    setEditUserOpen(true);
  };

  const toggleEditUserEcoleSelection = (id: number) => {
    setEditEcoles((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSaveUserAccessAndRole = async () => {
    if (!editingUser) return;
    try {
      const payload: any = {
        fonction: editRole,
        statut: editStatus,
        ecoles_autorisees: editEcoles,
        villes_autorisees: editVilles,
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }
      await apiClient.updateStaff(editingUser.id, payload);

      setUsers((prev) =>
        prev.map((u) =>
          String(u.id) === String(editingUser.id)
            ? { ...u, role: editRole as any, statut: editStatus }
            : u
        )
      );

      setStaffList((prev) =>
        prev.map((s) =>
          String(s.id) === String(editingUser.id)
            ? { ...s, fonction: editRole, statut: editStatus, ecolesAutorisees: editEcoles, villesAutorisees: editVilles }
            : s
        )
      );

      toast({
        title: "🔑 Compte Utilisateur Mis à Jour !",
        description: `Les accès, rôle, mot de passe et verrou de villes de ${editingUser.nom} ont été enregistrés avec succès.`,
      });

      setEditUserOpen(false);
      setEditingUser(null);
      setEditPassword("");
    } catch (err: any) {
      console.error("Erreur mise à jour utilisateur:", err);
      toast({
        variant: "destructive",
        title: "Erreur de modification",
        description: err?.response?.data?.detail || "Impossible de modifier l'utilisateur.",
      });
    }
  };

  const handleToggleUserStatus = async (u: User) => {
    const newStatus: "actif" | "desactive" = u.statut === "actif" ? "desactive" : "actif";
    try {
      await apiClient.updateStaff(u.id, { statut: newStatus });
      setUsers((prev) =>
        prev.map((item) => (String(item.id) === String(u.id) ? { ...item, statut: newStatus } : item))
      );
      toast({
        title: newStatus === "actif" ? "✅ Accès Réactivé" : "⛔ Accès Suspendu / Annulé",
        description: `Le compte utilisateur de ${u.nom} est désormais ${newStatus === "actif" ? "actif" : "désactivé"}.`,
      });
    } catch (err: any) {
      console.error("Erreur statut utilisateur:", err);
      toast({
        variant: "destructive",
        title: "Erreur modification statut",
        description: "Impossible de modifier le statut d'accès de l'utilisateur.",
      });
    }
  };

  // Form states - Class
  const [createClassOpen, setCreateClassOpen] = useState(false);
  const [classLibelle, setClassLibelle] = useState("");
  const [classCapacite, setClassCapacite] = useState<number>(50);
  const [classSchoolId, setClassSchoolId] = useState("");
  const [classCycleId, setClassCycleId] = useState("");
  const [classNiveauId, setClassNiveauId] = useState("");
  const [classEnseignantId, setClassEnseignantId] = useState("");

  // Form states - Level
  const [createLevelOpen, setCreateLevelOpen] = useState(false);
  const [levelLibelle, setLevelLibelle] = useState("");
  const [levelCode, setLevelCode] = useState("");
  const [levelOrdre, setLevelOrdre] = useState<number>(1);
  const [levelCycleId, setLevelCycleId] = useState("");
  const [levelDroitExamen, setLevelDroitExamen] = useState<number>(0);
  const [levelDroitInscription, setLevelDroitInscription] = useState<number>(0);
  const [levelScolarite, setLevelScolarite] = useState<number>(0);
  const [levelActif, setLevelActif] = useState(true);

  // Edit Class states
  const [editClassOpen, setEditClassOpen] = useState(false);
  const [classToEdit, setClassToEdit] = useState<any>(null);

  // Edit Level states
  const [editLevelOpen, setEditLevelOpen] = useState(false);
  const [levelToEdit, setLevelToEdit] = useState<any>(null);

  // Reference tables states
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [attributionsList, setAttributionsList] = useState<any[]>([]);
  const [sallesList, setSallesList] = useState<any[]>([]);

  // Form states - Salle
  const [createSalleOpen, setCreateSalleOpen] = useState(false);
  const [editSalleOpen, setEditSalleOpen] = useState(false);
  const [deleteSalleOpen, setDeleteSalleOpen] = useState(false);
  const [salleToEdit, setSalleToEdit] = useState<any | null>(null);
  const [salleCode, setSalleCode] = useState("");
  const [salleLibelle, setSalleLibelle] = useState("");
  const [salleType, setSalleType] = useState("classe");
  const [salleCapacite, setSalleCapacite] = useState<number>(30);
  const [salleEtage, setSalleEtage] = useState<number>(0);
  const [salleBatiment, setSalleBatiment] = useState("");
  const [salleDescription, setSalleDescription] = useState("");
  const [salleDisponible, setSalleDisponible] = useState(true);
  const [salleEcoleId, setSalleEcoleId] = useState("none");

  // Form states - Subject
  const [createSubjectOpen, setCreateSubjectOpen] = useState(false);
  const [subjLibelle, setSubjLibelle] = useState("");
  const [subjCode, setSubjCode] = useState("");
  const [subjActif, setSubjActif] = useState(true);
  const [subjParentId, setSubjParentId] = useState("");

  // Form states - Attribution
  const [createAttrOpen, setCreateAttrOpen] = useState(false);
  const [attrClasseId, setAttrClasseId] = useState("");
  const [attrEnseignantId, setAttrEnseignantId] = useState("");
  const [attrMatiereId, setAttrMatiereId] = useState("");
  const [attrJour, setAttrJour] = useState("Lundi");
  const [attrHeure, setAttrHeure] = useState("");
  const [attrSalle, setAttrSalle] = useState("");
  const [attrGroupe, setAttrGroupe] = useState("Classe entière");
  const [customGroupe, setCustomGroupe] = useState("");

  // Form states - Attribution Niveaux Éducateurs
  const [attrEdOpen, setAttrEdOpen] = useState(false);
  const [attrEdLoading, setAttrEdLoading] = useState(false);
  const [attrEdList, setAttrEdList] = useState<any[]>([]);
  const [attrEdSelectedEds, setAttrEdSelectedEds] = useState<number[]>([]);
  const [attrEdSelectedCycles, setAttrEdSelectedCycles] = useState<number[]>([]);
  const [attrEdSelectedNiveaux, setAttrEdSelectedNiveaux] = useState<number[]>([]);
  const [attrEdEcoleId, setAttrEdEcoleId] = useState<string>("");


  const [selectedTeacherIdForAvail, setSelectedTeacherIdForAvail] =
    useState<string>("");
  const [teacherAvailMap, setTeacherAvailMap] = useState<
    Record<string, string[]>
  >({});
  const [savingAvail, setSavingAvail] = useState(false);

  // Suggestion Engine states
  const [suggClasseId, setSuggClasseId] = useState<string>("");
  const [suggMatiereId, setSuggMatiereId] = useState<string>("");
  const [suggJour, setSuggJour] = useState<string>("Lundi");
  const [suggHeure, setSuggHeure] = useState<string>("08:00 - 10:00");
  const [suggSalle, setSuggSalle] = useState<string>("");
  const [suggestions, setSuggestions] = useState<{
    teachers: any[];
    salles: any[];
    alternatives: any[];
  } | null>(null);
  const [suggGroupe, setSuggGroupe] = useState("Classe entière");
  const [suggCustomGroupe, setSuggCustomGroupe] = useState("");
  const [suggDuree, setSuggDuree] = useState<string>("2h");

  // Timetable Print States
  const printTimetableRef = useRef<HTMLDivElement>(null);
  const [printTimetableMode, setPrintTimetableMode] = useState<
    "classe" | "enseignant"
  >("classe");
  const [printSelectedClassId, setPrintSelectedClassId] = useState<string>("");
  const [printSelectedTeacherId, setPrintSelectedTeacherId] =
    useState<string>("");

  const getSlotsForDuration = (duration: string) => {
    switch (duration) {
      case "30m":
        return [
          "08:00 - 08:30",
          "08:30 - 09:00",
          "09:00 - 09:30",
          "09:30 - 10:00",
          "10:00 - 10:30",
          "10:30 - 11:00",
          "11:00 - 11:30",
          "11:30 - 12:00",
          "12:00 - 12:30",
          "13:30 - 14:00",
          "14:00 - 14:30",
          "14:30 - 15:00",
          "15:00 - 15:30",
          "15:30 - 16:00",
          "16:00 - 16:30",
          "16:30 - 17:00",
          "17:00 - 17:30",
          "17:30 - 18:00",
        ];
      case "1h":
        return [
          "08:00 - 09:00",
          "09:00 - 10:00",
          "10:30 - 11:30",
          "11:30 - 12:30",
          "13:30 - 14:30",
          "14:30 - 15:30",
          "15:30 - 16:30",
          "16:30 - 17:30",
        ];
      case "1.5h":
        return [
          "08:00 - 09:30",
          "09:30 - 11:00",
          "11:00 - 12:30",
          "13:30 - 15:00",
          "15:00 - 16:30",
          "16:30 - 18:00",
        ];
      case "2h":
      default:
        return [
          "08:00 - 10:00",
          "10:30 - 12:30",
          "13:30 - 15:30",
          "16:00 - 18:00",
        ];
    }
  };

  useEffect(() => {
    if (!suggClasseId) return;
    const cls = classesList.find((c) => String(c.id) === String(suggClasseId));
    if (cls && cls.niveauId) {
      const level = levelsList.find(
        (l) => String(l.id) === String(cls.niveauId),
      );
      if (level && level.cycle_id) {
        const cycle = cyclesList.find(
          (cy) => String(cy.id) === String(level.cycle_id),
        );
        if (cycle) {
          const code = String(cycle.code).toUpperCase();
          if (
            code.includes("PRIMAIRE") ||
            code.includes("MATERNELLE") ||
            code.includes("PRI") ||
            code.includes("MAT")
          ) {
            setSuggDuree("1h");
            return;
          }
        }
      }
    }
    setSuggDuree("2h");
  }, [suggClasseId, classesList, levelsList, cyclesList]);

  useEffect(() => {
    const slots = getSlotsForDuration(suggDuree);
    if (slots.length > 0 && !slots.includes(suggHeure)) {
      setSuggHeure(slots[0]);
    }
  }, [suggDuree]);

  const WEEK_DAYS = [
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
  ];
  const TIME_SLOTS = [
    "08:00 - 10:00",
    "10:30 - 12:30",
    "13:30 - 15:30",
    "16:00 - 18:00",
  ];

  // Load selected teacher availabilities
  useEffect(() => {
    if (selectedTeacherIdForAvail) {
      const teacher = staffList.find(
        (s) => String(s.id) === String(selectedTeacherIdForAvail),
      );
      if (teacher) {
        setTeacherAvailMap(teacher.disponibilites || {});
      } else {
        setTeacherAvailMap({});
      }
    }
  }, [selectedTeacherIdForAvail, staffList]);

  // Toggle single availability cell
  const handleToggleAvail = (day: string, slot: string) => {
    setTeacherAvailMap((prev) => {
      const currentSlots = prev[day] || [];
      const updatedSlots = currentSlots.includes(slot)
        ? currentSlots.filter((s) => s !== slot)
        : [...currentSlots, slot];
      return { ...prev, [day]: updatedSlots };
    });
  };

  // Set all slots available or clear all
  const handleBulkAvail = (action: "all" | "none") => {
    if (action === "none") {
      setTeacherAvailMap({});
    } else {
      const all: Record<string, string[]> = {};
      WEEK_DAYS.forEach((day) => {
        all[day] = [...TIME_SLOTS];
      });
      setTeacherAvailMap(all);
    }
  };

  // Save teacher availability
  const handleSaveTeacherAvail = async () => {
    if (!selectedTeacherIdForAvail) return;
    try {
      setSavingAvail(true);
      await apiClient.updateStaff(selectedTeacherIdForAvail, {
        disponibilites: teacherAvailMap,
      });
      toast({
        title: "Disponibilités sauvegardées",
        description: "Les plages horaires ont été mises à jour avec succès.",
      });
      await loadData(); // refresh staffList
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'enregistrer les disponibilités.",
      });
    } finally {
      setSavingAvail(false);
    }
  };

  // Time overlapping helper
  const parseTime = (timeStr: string) => {
    const normalized = timeStr.replace(/–/g, "-").replace(/\s+/g, "");
    const parts = normalized.split("-");
    if (parts.length !== 2) return null;
    const parseHM = (s: string) => {
      const [h, m] = s.split(":").map(Number);
      return isNaN(h) || isNaN(m) ? 0 : h * 60 + m;
    };
    return { start: parseHM(parts[0]), end: parseHM(parts[1]) };
  };

  const isTimeOverlapping = (t1: string, t2: string) => {
    const p1 = parseTime(t1);
    const p2 = parseTime(t2);
    if (!p1 || !p2) return t1.toLowerCase().trim() === t2.toLowerCase().trim();
    return p1.start < p2.end && p2.start < p1.end;
  };

  // Suggestion Engine runner
  const handleGenerateSuggestions = () => {
    if (!suggClasseId || !suggMatiereId) {
      toast({
        variant: "destructive",
        title: "Champs obligatoires",
        description: "Veuillez sélectionner au moins la classe et la matière.",
      });
      return;
    }

    // 1. SUGGEST TEACHERS
    const teachSugg = staffList
      .filter((s) => s.fonction === "enseignant" || s.fonction === "coranique")
      .map((teacher) => {
        const teacherAvail = teacher.disponibilites || {};
        const isPrefAvailable =
          Array.isArray(teacherAvail[suggJour]) &&
          teacherAvail[suggJour].some((availSlot: string) =>
            isTimeOverlapping(availSlot, suggHeure),
          );

        // Find conflicting attribution
        const conflict = attributionsList.find(
          (attr) =>
            String(attr.enseignant_id) === String(teacher.id) &&
            attr.jour === suggJour &&
            isTimeOverlapping(attr.heure, suggHeure),
        );

        let status: "ideal" | "no_pref" | "busy" = "ideal";
        let detail = "Enseignant libre et disponible";

        if (conflict) {
          status = "busy";
          const otherClass =
            classesList.find((c) => String(c.id) === String(conflict.classe_id))
              ?.name || "Inconnue";
          detail = `Déjà occupé avec la classe ${otherClass} (${conflict.heure})`;
        } else if (!isPrefAvailable) {
          status = "no_pref";
          detail = "Indisponible d'après ses préférences horaires";
        }

        return {
          teacher,
          status,
          detail,
        };
      })
      .sort((a, b) => {
        const order = { ideal: 0, no_pref: 1, busy: 2 };
        return order[a.status] - order[b.status];
      });

    // 2. SUGGEST ROOMS (SALLES)
    const roomSugg = sallesList.map((salle) => {
      const conflict = attributionsList.find(
        (attr) =>
          attr.salle === salle.code &&
          attr.jour === suggJour &&
          isTimeOverlapping(attr.heure, suggHeure),
      );

      return {
        salle,
        isFree: !conflict,
        detail: conflict
          ? `Occupée par la classe ${classesList.find((c) => String(c.id) === String(conflict.classe_id))?.name || "Inconnue"}`
          : "Libre",
      };
    });

    // 3. ALTERNATIVE SLOTS
    const alternatives: any[] = [];
    let count = 0;

    for (const day of WEEK_DAYS) {
      const candidateSlots = getSlotsForDuration(suggDuree);
      for (const slot of candidateSlots) {
        if (day === suggJour && slot === suggHeure) continue; // skip current
        if (count >= 3) break;

        // Check if class is free
        const classConflict = attributionsList.find(
          (attr) =>
            String(attr.classe_id) === String(suggClasseId) &&
            attr.jour === day &&
            isTimeOverlapping(attr.heure, slot) &&
            isGroupConflicting(
              attr.groupe || "Classe entière",
              suggGroupe === "Autre" ? suggCustomGroupe : suggGroupe,
            ),
        );

        if (!classConflict) {
          const anyIdealTeacher = staffList
            .filter(
              (s) => s.fonction === "enseignant" || s.fonction === "coranique",
            )
            .find((t) => {
              const av = t.disponibilites || {};
              const isPrefAv =
                Array.isArray(av[day]) &&
                av[day].some((availSlot: string) =>
                  isTimeOverlapping(availSlot, slot),
                );
              const conf = attributionsList.find(
                (a) =>
                  String(a.enseignant_id) === String(t.id) &&
                  a.jour === day &&
                  isTimeOverlapping(a.heure, slot),
              );
              return isPrefAv && !conf;
            });

          if (anyIdealTeacher) {
            alternatives.push({
              day,
              slot,
              teacher: anyIdealTeacher,
            });
            count++;
          }
        }
      }
    }

    setSuggestions({
      teachers: teachSugg,
      salles: roomSugg,
      alternatives,
    });
  };

  // Quick Attribution trigger
  const handleApplySuggestion = async (
    teacherId: string,
    customSalle?: string,
  ) => {
    try {
      const payload = {
        classe_id: Number(suggClasseId),
        enseignant_id: Number(teacherId),
        matiere_id: Number(suggMatiereId),
        jour: suggJour,
        heure: suggHeure,
        salle: customSalle || suggSalle || null,
        statut: "actif",
        groupe: suggGroupe === "Autre" ? suggCustomGroupe : suggGroupe,
      };

      await apiClient.createAttribution(payload);
      toast({
        title: "Attribution créée",
        description: "L'emploi du temps a été mis à jour avec succès.",
      });

      setSuggestions(null);
      await loadData();
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'appliquer la suggestion.",
      });
    }
  };

  const mapRoleToBackendFonction = (role: string): string => {
    const mapping: Record<string, string> = {
      direction_fondation: "direction",
      directeur_ecole: "direction",
      enseignant: "enseignant",
      professeur: "enseignant",
      instituteur: "enseignant",
      educateur: "educateur",
      comptable: "comptable",
      caisse: "caisse",
      scolarite: "scolarite",
      accueil: "accueil",
      agent: "agent",
      rh: "rh",
      admin: "admin",
      superuser: "superuser",
    };
    return mapping[role] || role || "scolarite";
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        staffData,
        schoolData,
        classesData,
        levelsData,
        cyclesData,
        subjectsData,
        attributionsData,
      ] = await Promise.all([
        apiClient.getStaff().catch((err: any): any[] => {
          console.error("Failed to fetch staff from API", err);
          return [];
        }),
        apiClient.getSchools().catch((err: any): any[] => {
          console.error("Failed to fetch schools from API", err);
          return [];
        }),
        apiClient.getClasses().catch((err: any): any[] => {
          console.error("Failed to fetch classes from API", err);
          return [];
        }),
        apiClient.getLevels().catch((err: any): any[] => {
          console.error("Failed to fetch levels from API", err);
          return [];
        }),
        apiClient.getCycles().catch((err: any): any[] => {
          console.error("Failed to fetch cycles from API", err);
          return [];
        }),
        apiClient.getSubjects().catch((err: any): any[] => {
          console.error("Failed to fetch Subjects from API", err);
          return [];
        }),
        apiClient.getAttributions().catch((err: any): any[] => {
          console.error("Failed to fetch Attributions from API", err);
          return [];
        }),
      ]);
      setSchoolsList(schoolData);
      setStaffList(staffData);
      setClassesList(classesData);
      setLevelsList(levelsData);
      setCyclesList(cyclesData);
      setSubjectsList(subjectsData);
      setAttributionsList(attributionsData);
      const sallesData = await apiClient.getSalles().catch(() => [] as any[]);
      setSallesList(sallesData);
      const attrEdData = await apiClient.getAttributionsEducateurs().catch(() => [] as any[]);
      setAttrEdList(attrEdData);

      const pointagesData = await apiClient
        .getPointages()
        .catch(() => [] as any[]);
      const villesData = await apiClient.getVilles().catch(() => [] as any[]);
      setVillesList(villesData);

      const mappedUsers = staffData.map((staff: any) => {
        const sch = schoolData.find(
          (s: any) => String(s.id) === String(staff.schoolId),
        );
        console.log(staff.fonction);
        return {
          id: staff.id,
          nom: `${formatStudentName(staff)}`,
          email: staff.email,
          role: staff.fonction as UserRole,
          etablissement: sch ? sch.name : "Inconnu",
          dernierAcces: staff.createdAt || new Date(),
          statut: (staff.status === "actif" ? "actif" : "desactive") as
            | "actif"
            | "desactive",
        };
      });
      setUsers(mappedUsers);
    } catch (error) {
      console.error("Failed to load staff/schools from API", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async () => {
    const finalEcoles =
      selectedEcoles.length > 0
        ? selectedEcoles
        : selectedSchoolId
          ? [Number(selectedSchoolId)]
          : [];

    if (
      !prenom ||
      !nom ||
      !username ||
      !email ||
      !telephone ||
      !password ||
      !selectedRole ||
      finalEcoles.length === 0
    ) {
      toast({
        variant: "destructive",
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs et cocher au moins un établissement.",
      });
      return;
    }

    try {
      const payload = {
        prenom,
        nom,
        email,
        telephone,
        fonction: mapRoleToBackendFonction(selectedRole),
        statut: "actif",
        charge_horaire: 0,
        ecole_id: selectedSchoolId ? Number(selectedSchoolId) : (finalEcoles[0] || null),
        ecoles_autorisees: finalEcoles,
        username,
        password,
      };

      await apiClient.createStaff(payload);

      toast({
        title: "Utilisateur créé",
        description: `L'utilisateur ${nom} ${prenom} a été créé avec succès.`,
      });

      // Reset form states
      setPrenom("");
      setNom("");
      setUsername("");
      setEmail("");
      setTelephone("");
      setPassword("");
      setSelectedRole("");
      setSelectedSchoolId("");
      setSelectedEcoles([]);
      setSelectedCityFilter("all");
      setCreateUserOpen(false);

      // Reload list
      await loadData();
    } catch (err: any) {
      console.error(err);
      const detail =
        err.response?.data?.detail || "Impossible de créer l'utilisateur.";
      toast({
        variant: "destructive",
        title: "Erreur de création",
        description:
          typeof detail === "string" ? detail : JSON.stringify(detail),
      });
    }
  };

  const handleCreateVille = async () => {
    if (!newVilleLibelle.trim()) {
      toast({
        variant: "destructive",
        title: "Champ requis",
        description: "Veuillez saisir le nom de la ville.",
      });
      return;
    }
    try {
      const created = await apiClient.createVille({
        libelle: newVilleLibelle.trim(),
        code: newVilleCode.trim() || undefined,
        region: newVilleRegion.trim() || undefined,
        statut: "actif",
      });
      setVillesList((prev) => [...prev, created]);
      toast({
        title: "Ville ajoutée",
        description: `La ville ${newVilleLibelle} a été enregistrée avec succès.`,
      });
      setNewVilleLibelle("");
      setNewVilleCode("");
      setNewVilleRegion("");
      setCreateVilleOpen(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur de création",
        description: err?.response?.data?.detail || "Impossible d'ajouter la ville.",
      });
    }
  };

  const handleCreateClass = async () => {
    if (!classLibelle || !classSchoolId || !classNiveauId || !classCycleId) {
      toast({
        variant: "destructive",
        title: "Champs manquants",
        description:
          "Veuillez remplir les informations obligatoires de la classe.",
      });
      return;
    }

    try {
      const userCode = typeof localStorage !== 'undefined' ? (localStorage.getItem("user_ecole_code") || localStorage.getItem("code_etablissement")) : "";
      const userEcoleId = typeof localStorage !== 'undefined' ? localStorage.getItem("user_ecole_id") : "";

      const selectedSchool = schoolsList.find(
        (s) => String(s.IDETABLISSEMENT || s.id) === String(classSchoolId),
      );
      const selectedNiveau = levelsList.find(
        (l) => String(l.id) === String(classNiveauId),
      );
      const selectedCycle = cyclesList.find(
        (c) => String(c.id) === String(classCycleId),
      );

      const schoolCode = selectedSchool?.ET_CODEETABLISSEMENT || selectedSchool?.code || selectedSchool?.code_etablissement || userCode || "";
      const schoolId = selectedSchool?.IDETABLISSEMENT || selectedSchool?.id || (classSchoolId ? Number(classSchoolId) : (userEcoleId ? Number(userEcoleId) : undefined));

      const payload = {
        CE_LIBELLE: classLibelle,
        capacite: Number(classCapacite) || 50,
        cycle_id: Number(classCycleId),
        ecole_id: schoolId,
        ET_CODEETABLISSEMENT: schoolCode,
        enseignant_id:
          classEnseignantId && classEnseignantId !== "none"
            ? Number(classEnseignantId)
            : null,
        niveau_id: Number(classNiveauId),
        CE_LIBELLENIVEAU: selectedNiveau ? selectedNiveau.libelle : "",
        CY_LIBELLECYCLE: selectedCycle
          ? selectedCycle.libelle.toLowerCase()
          : "",
        CE_ORDRE: 1,
      };

      await apiClient.createClass(payload);

      toast({
        title: "Classe créée",
        description: `La classe ${classLibelle} a été créée avec succès.`,
      });

      // Reset
      setClassLibelle("");
      setClassCapacite(50);
      setClassSchoolId("");
      setClassCycleId("");
      setClassNiveauId("");
      setClassEnseignantId("");
      setCreateClassOpen(false);

      await loadData();
    } catch (err: any) {
      console.error(err);
      const detail =
        err.response?.data?.detail || "Impossible de créer la classe.";
      toast({
        variant: "destructive",
        title: "Erreur de création",
        description:
          typeof detail === "string" ? detail : JSON.stringify(detail),
      });
    }
  };

  const handleCreateLevel = async () => {
    if (!levelLibelle || !levelCode || !levelCycleId) {
      toast({
        variant: "destructive",
        title: "Champs manquants",
        description:
          "Veuillez remplir les informations obligatoires du niveau scolaire.",
      });
      return;
    }

    try {
      const payload = {
        libelle: levelLibelle,
        code: levelCode.toUpperCase(),
        actif: levelActif,
        ordre: Number(levelOrdre) || 1,
        cycle_id: Number(levelCycleId),
        droit_examen: Number(levelDroitExamen) || 0,
        droit_inscription: Number(levelDroitInscription) || 0,
        scolarite: Number(levelScolarite) || 0,
      };

      await apiClient.createLevel(payload);

      toast({
        title: "Niveau scolaire créé",
        description: `Le niveau ${levelLibelle} a été créé avec succès.`,
      });

      // Reset
      setLevelLibelle("");
      setLevelCode("");
      setLevelOrdre(1);
      setLevelCycleId("");
      setLevelDroitExamen(0);
      setLevelDroitInscription(0);
      setLevelScolarite(0);
      setLevelActif(true);
      setCreateLevelOpen(false);

      await loadData();
    } catch (err: any) {
      console.error(err);
      const detail =
        err.response?.data?.detail || "Impossible de créer le niveau scolaire.";
      toast({
        variant: "destructive",
        title: "Erreur de création",
        description:
          typeof detail === "string" ? detail : JSON.stringify(detail),
      });
    }
  };

  const handleOpenEditClass = (cls: any) => {
    setClassToEdit(cls);
    setClassLibelle(cls.name || cls.CE_LIBELLE || "");
    setClassCapacite(cls.capacity || cls.capacite || 50);
    setClassSchoolId(
      cls.schoolId
        ? String(cls.schoolId)
        : cls.ecole_id
          ? String(cls.ecole_id)
          : "",
    );
    setClassCycleId(
      cls.cycleId
        ? String(cls.cycleId)
        : cls.cycle_id
          ? String(cls.cycle_id)
          : "",
    );
    setClassNiveauId(
      cls.niveauId
        ? String(cls.niveauId)
        : cls.niveau_id
          ? String(cls.niveau_id)
          : "",
    );
    setClassEnseignantId(
      cls.teacherId
        ? String(cls.teacherId)
        : cls.enseignant_id
          ? String(cls.enseignant_id)
          : "none",
    );
    setEditClassOpen(true);
  };

  const handleSaveClass = async () => {
    if (
      !classToEdit ||
      !classLibelle ||
      !classSchoolId ||
      !classNiveauId ||
      !classCycleId
    ) {
      toast({
        variant: "destructive",
        title: "Champs manquants",
        description:
          "Veuillez remplir les informations obligatoires de la classe.",
      });
      return;
    }

    try {
      const selectedNiveau = levelsList.find(
        (l) => String(l.id) === String(classNiveauId),
      );
      const selectedCycle = cyclesList.find(
        (c) => String(c.id) === String(classCycleId),
      );

      const selectedSchool = schoolsList.find(
        (s) => String(s.id) === String(classSchoolId),
      );
      const schoolCode = selectedSchool?.ET_CODEETABLISSEMENT || selectedSchool?.code || selectedSchool?.code_etablissement || "";

      const payload = {
        CE_LIBELLE: classLibelle,
        capacite: Number(classCapacite) || 50,
        cycle_id: Number(classCycleId),
        ecole_id: Number(classSchoolId),
        ET_CODEETABLISSEMENT: schoolCode,
        enseignant_id:
          classEnseignantId && classEnseignantId !== "none"
            ? Number(classEnseignantId)
            : null,
        niveau_id: Number(classNiveauId),
        CE_LIBELLENIVEAU: selectedNiveau ? selectedNiveau.libelle : "",
        CY_LIBELLECYCLE: selectedCycle
          ? selectedCycle.libelle.toLowerCase()
          : "",
      };

      await apiClient.updateClass(classToEdit.id, payload);

      toast({
        title: "Classe modifiée",
        description: `La classe ${classLibelle} a été mise à jour avec succès.`,
      });

      setEditClassOpen(false);
      setClassToEdit(null);
      await loadData();
    } catch (err: any) {
      const detail =
        err.response?.data?.detail || "Impossible de modifier la classe.";
      toast({
        variant: "destructive",
        title: "Erreur de modification",
        description:
          typeof detail === "string" ? detail : JSON.stringify(detail),
      });
    }
  };

  const handleDeleteClass = async (id: string | number, name: string) => {
    if (
      !window.confirm(
        `Êtes-vous sûr de vouloir supprimer la classe "${name}" ?`,
      )
    )
      return;
    try {
      await apiClient.deleteClass(id);
      toast({
        title: "Classe supprimée",
        description: `La classe ${name} a été supprimée.`,
      });
      await loadData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur de suppression",
        description: "Impossible de supprimer cette classe.",
      });
    }
  };

  const handleOpenEditLevel = (lvl: any) => {
    setLevelToEdit(lvl);
    setLevelLibelle(lvl.libelle || "");
    setLevelCode(lvl.code || "");
    setLevelOrdre(lvl.ordre || 1);
    setLevelCycleId(lvl.cycle_id ? String(lvl.cycle_id) : "");
    setLevelDroitExamen(lvl.droit_examen || 0);
    setLevelDroitInscription(lvl.droit_inscription || 0);
    setLevelScolarite(lvl.scolarite || 0);
    setLevelActif(lvl.actif !== false);
    setEditLevelOpen(true);
  };

  const handleSaveLevel = async () => {
    if (!levelToEdit || !levelLibelle || !levelCode || !levelCycleId) {
      toast({
        variant: "destructive",
        title: "Champs manquants",
        description:
          "Veuillez remplir les informations obligatoires du niveau scolaire.",
      });
      return;
    }

    try {
      const payload = {
        libelle: levelLibelle,
        code: levelCode.toUpperCase(),
        actif: levelActif,
        ordre: Number(levelOrdre) || 1,
        cycle_id: Number(levelCycleId),
        droit_examen: Number(levelDroitExamen) || 0,
        droit_inscription: Number(levelDroitInscription) || 0,
        scolarite: Number(levelScolarite) || 0,
      };

      await apiClient.updateLevel(levelToEdit.id, payload);

      toast({
        title: "Niveau scolaire modifié",
        description: `Le niveau ${levelLibelle} a été mis à jour avec succès.`,
      });

      setEditLevelOpen(false);
      setLevelToEdit(null);
      await loadData();
    } catch (err: any) {
      const detail =
        err.response?.data?.detail || "Impossible de modifier le niveau.";
      toast({
        variant: "destructive",
        title: "Erreur de modification",
        description:
          typeof detail === "string" ? detail : JSON.stringify(detail),
      });
    }
  };

  const handleDeleteLevel = async (id: string | number, libelle: string) => {
    if (
      !window.confirm(
        `Êtes-vous sûr de vouloir supprimer le niveau "${libelle}" ?`,
      )
    )
      return;
    try {
      await apiClient.deleteLevel(id);
      toast({
        title: "Niveau supprimé",
        description: `Le niveau ${libelle} a été supprimé.`,
      });
      await loadData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur de suppression",
        description: "Impossible de supprimer ce niveau.",
      });
    }
  };

  const handleCreateSubject = async () => {
    if (!subjLibelle || !subjCode) {
      toast({
        variant: "destructive",
        title: "Champs manquants",
        description: "Veuillez remplir le libellé et le code de la matière.",
      });
      return;
    }

    try {
      const payload = {
        libelle: subjLibelle,
        code: subjCode.toUpperCase(),
        actif: subjActif,
        parent_id:
          subjParentId && subjParentId !== "none" ? Number(subjParentId) : null,
      };

      await apiClient.createSubject(payload);

      toast({
        title: "Matière créée",
        description: `La matière ${subjLibelle} a été créée avec succès.`,
      });

      setSubjLibelle("");
      setSubjCode("");
      setSubjActif(true);
      setSubjParentId("");
      setCreateSubjectOpen(false);

      await loadData();
    } catch (err: any) {
      console.error(err);
      const detail =
        err.response?.data?.detail || "Impossible de créer la matière.";
      toast({
        variant: "destructive",
        title: "Erreur de création",
        description:
          typeof detail === "string" ? detail : JSON.stringify(detail),
      });
    }
  };

  const handleCreateAttribution = async () => {
    if (
      !attrClasseId ||
      !attrEnseignantId ||
      !attrMatiereId ||
      !attrJour ||
      !attrHeure
    ) {
      toast({
        variant: "destructive",
        title: "Champs manquants",
        description:
          "Veuillez renseigner la classe, l'enseignant, la matière, le jour et l'heure.",
      });
      return;
    }

    // Contrôle strict d'occupation / conflit pour l'enseignant (toutes classes confondues)
    const conflict = attributionsList.find(
      (a: any) =>
        String(a.enseignant_id) === String(attrEnseignantId) &&
        a.jour?.toLowerCase().trim() === attrJour.toLowerCase().trim() &&
        isTimeOverlapping(a.heure, attrHeure),
    );

    if (conflict) {
      const clsName =
        classesList.find(
          (c: any) => String(c.id) === String(conflict.classe_id),
        )?.name || `Classe #${conflict.classe_id}`;
      const subjName =
        subjectsList.find(
          (s: any) => String(s.id) === String(conflict.matiere_id),
        )?.libelle || "un cours";
      const teacherObj = staffList.find(
        (s: any) => String(s.id) === String(attrEnseignantId),
      );
      const teacherName = teacherObj ? formatStudentName(teacherObj) : "Cet enseignant";

      toast({
        variant: "destructive",
        title: "⛔ Conflit d'emploi du temps",
        description: `${teacherName} est déjà programmé en ${clsName} (${subjName}) le ${attrJour} de ${conflict.heure}. Impossible de lui attribuer un autre cours à la même heure.`,
      });
      return;
    }

    try {
      const payload = {
        classe_id: Number(attrClasseId),
        enseignant_id: Number(attrEnseignantId),
        matiere_id: Number(attrMatiereId),
        jour: attrJour,
        heure: attrHeure,
        salle: attrSalle || null,
        statut: "actif",
        groupe: attrGroupe === "Autre" ? customGroupe : attrGroupe,
      };

      await apiClient.createAttribution(payload);

      toast({
        title: "Attribution réussie",
        description: "La matière a été attribuée avec succès.",
      });

      setAttrClasseId("");
      setAttrEnseignantId("");
      setAttrMatiereId("");
      setAttrJour("Lundi");
      setAttrHeure("");
      setAttrSalle("");
      setAttrGroupe("Classe entière");
      setCustomGroupe("");
      setCreateAttrOpen(false);

      await loadData();
    } catch (err: any) {
      console.error(err);
      const detail =
        err.response?.data?.detail || "Impossible d'attribuer la matière.";
      toast({
        variant: "destructive",
        title: "Erreur d'attribution",
        description:
          typeof detail === "string" ? detail : JSON.stringify(detail),
      });
    }
  };

  const handleDeleteAttribution = async (id: number | string) => {
    if (
      !window.confirm(
        "Êtes-vous sûr de vouloir supprimer cette attribution de matière ?",
      )
    ) {
      return;
    }

    try {
      await apiClient.deleteAttribution(id);

      toast({
        title: "Attribution supprimée",
        description: "L'attribution a été supprimée avec succès.",
      });

      await loadData();
    } catch (err: any) {
      console.error(err);
      const detail =
        err.response?.data?.detail || "Impossible de supprimer l'attribution.";
      toast({
        variant: "destructive",
        title: "Erreur de suppression",
        description:
          typeof detail === "string" ? detail : JSON.stringify(detail),
      });
    }
  };

  const resetSalleForm = () => {
    setSalleCode("");
    setSalleLibelle("");
    setSalleType("classe");
    setSalleCapacite(30);
    setSalleEtage(0);
    setSalleBatiment("");
    setSalleDescription("");
    setSalleDisponible(true);
    setSalleEcoleId("none");
  };

  const handleCreateSalle = async () => {
    if (!salleCode || !salleLibelle) {
      toast({
        variant: "destructive",
        title: "Champs manquants",
        description: "Le code et le libellé sont obligatoires.",
      });
      return;
    }
    try {
      await apiClient.createSalle({
        code: salleCode.toUpperCase(),
        libelle: salleLibelle,
        type_salle: salleType,
        capacite: Number(salleCapacite),
        etage: Number(salleEtage),
        batiment: salleBatiment || null,
        description: salleDescription || null,
        disponible: salleDisponible,
        ecole_id:
          salleEcoleId && salleEcoleId !== "none" ? Number(salleEcoleId) : null,
      });
      toast({
        title: "Salle créée",
        description: `La salle ${salleLibelle} a été créée avec succès.`,
      });
      resetSalleForm();
      setCreateSalleOpen(false);
      const sallesData = await apiClient.getSalles().catch(() => [] as any[]);
      setSallesList(sallesData);
    } catch (err: any) {
      const detail =
        err.response?.data?.detail || "Impossible de créer la salle.";
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          typeof detail === "string" ? detail : JSON.stringify(detail),
      });
    }
  };

  const handleOpenEditSalle = (salle: any) => {
    setSalleToEdit(salle);
    setSalleCode(salle.code);
    setSalleLibelle(salle.libelle);
    setSalleType(salle.type_salle);
    setSalleCapacite(salle.capacite);
    setSalleEtage(salle.etage ?? 0);
    setSalleBatiment(salle.batiment ?? "");
    setSalleDescription(salle.description ?? "");
    setSalleDisponible(salle.disponible);
    setSalleEcoleId(salle.ecole_id ? String(salle.ecole_id) : "none");
    setEditSalleOpen(true);
  };

  const handleSaveSalle = async () => {
    if (!salleToEdit) return;
    try {
      await apiClient.updateSalle(salleToEdit.id, {
        code: salleCode.toUpperCase(),
        libelle: salleLibelle,
        type_salle: salleType,
        capacite: Number(salleCapacite),
        etage: Number(salleEtage),
        batiment: salleBatiment || null,
        description: salleDescription || null,
        disponible: salleDisponible,
        ecole_id:
          salleEcoleId && salleEcoleId !== "none" ? Number(salleEcoleId) : null,
      });
      toast({
        title: "Salle modifiée",
        description: `La salle ${salleLibelle} a été modifiée.`,
      });
      setEditSalleOpen(false);
      setSalleToEdit(null);
      resetSalleForm();
      const sallesData = await apiClient.getSalles().catch(() => [] as any[]);
      setSallesList(sallesData);
    } catch (err: any) {
      const detail =
        err.response?.data?.detail || "Impossible de modifier la salle.";
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          typeof detail === "string" ? detail : JSON.stringify(detail),
      });
    }
  };

  const handleDeleteSalle = async () => {
    if (!salleToEdit) return;
    try {
      await apiClient.deleteSalle(salleToEdit.id);
      toast({
        title: "Salle supprimée",
        description: `La salle ${salleToEdit.libelle} a été supprimée.`,
      });
      setDeleteSalleOpen(false);
      setSalleToEdit(null);
      const sallesData = await apiClient.getSalles().catch(() => [] as any[]);
      setSallesList(sallesData);
    } catch (err: any) {
      const detail =
        err.response?.data?.detail || "Impossible de supprimer la salle.";
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          typeof detail === "string" ? detail : JSON.stringify(detail),
      });
    }
  };

  const userColumns: Column[] = [
    { key: "nom", label: "Nom", sortable: true },
    { key: "email", label: "Email", sortable: true },
    {
      key: "role",
      label: "Rôle",
      sortable: true,
      render: (value: string) => {
        const roleLabels: Record<string, string> = {
          superuser: "Super Utilisateur",
          direction_fondation: "Direction Fondation",
          directeur_ecole: "Directeur",
          enseignant: "Enseignant",
          educateur: "Éducateur",
          parent: "Parent",
          comptable: "Comptable",
          rh: "RH",
          admin: "Admin",
          accueil: "Accueil",
          scolarite: "Scolarité",
        };
        return <Badge variant="secondary">{roleLabels[value] || value}</Badge>;
      },
    },
    { key: "etablissement", label: "Établissement", sortable: true },
    {
      key: "dernierAcces",
      label: "Dernier accès",
      sortable: true,
      render: (value: Date) => formatDateTime(value),
    },
    {
      key: "statut",
      label: "Statut",
      sortable: true,
      render: (value: string) => (
        <Badge variant={getStatusBadgeColor(value)}>
          {value === "actif" ? "Actif" : "Désactivé"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEditUser(row)}
            title="Modifier le rôle et les accès"
          >
            <Edit className="h-4 w-4 text-indigo-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleUserStatus(row)}
            title={row.statut === "actif" ? "Suspendre / Annuler l'accès" : "Réactiver l'accès"}
          >
            {row.statut === "actif" ? (
              <Trash2 className="h-4 w-4 text-rose-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  const isGroupConflicting = (g1: string, g2: string) => {
    const group1 = g1 || "Classe entière";
    const group2 = g2 || "Classe entière";
    if (group1 === "Classe entière" || group2 === "Classe entière") return true;
    return group1 === group2;
  };

  const isReligiousSubject = (code: string, libelle: string) => {
    const c = String(code || "").toUpperCase();
    const l = String(libelle || "").toLowerCase();
    return (
      c.includes("ISLAM") ||
      c.includes("CORAN") ||
      c.includes("TAJ") ||
      c.includes("ARABE") ||
      l.includes("coran") ||
      l.includes("islam") ||
      l.includes("religion") ||
      l.includes("tajwid")
    );
  };

  const subjectColumns: Column[] = [
    { key: "code", label: "Code", sortable: true },
    { key: "libelle", label: "Libellé", sortable: true },
    {
      key: "parent_id",
      label: "Discipline Parente",
      sortable: true,
      render: (val: any) => {
        if (!val)
          return (
            <span className="text-muted-foreground italic text-xs">
              Discipline Principale
            </span>
          );
        const p = subjectsList.find((s) => String(s.id) === String(val));
        return p ? (
          <Badge variant="secondary" className="text-xs">
            {p.libelle}
          </Badge>
        ) : (
          <span className="text-muted-foreground italic text-xs">Inconnue</span>
        );
      },
    },
    {
      key: "actif",
      label: "Statut",
      sortable: true,
      render: (value: boolean) => (
        <Badge variant={value ? "default" : "outline"}>
          {value ? "Actif" : "Inactif"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: () => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const referenceColumns: Column[] = [
    { key: "code", label: "Code", sortable: true },
    { key: "libelle", label: "Libellé", sortable: true },
    { key: "ordre", label: "Ordre", sortable: true },
    {
      key: "actif",
      label: "Statut",
      sortable: true,
      render: (value: boolean) => (
        <Badge variant={value ? "default" : "outline"}>
          {value ? "Actif" : "Inactif"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: () => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const levelColumns: Column[] = [
    { key: "code", label: "Code", sortable: true },
    { key: "libelle", label: "Libellé", sortable: true },
    { key: "ordre", label: "Ordre", sortable: true },
    {
      key: "cycle_id",
      label: "Cycle",
      sortable: true,
      render: (value: number) => {
        const cy = cyclesList.find((c) => c.id === value);
        return cy ? cy.libelle : value;
      },
    },
    {
      key: "scolarite",
      label: "Scolarité (FCFA)",
      sortable: true,
      render: (value: number) => `${value?.toLocaleString()} FCFA`,
    },
    {
      key: "droit_inscription",
      label: "Inscription (FCFA)",
      sortable: true,
      render: (value: number) => `${value?.toLocaleString()} FCFA`,
    },
    {
      key: "droit_examen",
      label: "Droit Examen (FCFA)",
      sortable: true,
      render: (value: number) => `${value?.toLocaleString()} FCFA`,
    },
    {
      key: "actif",
      label: "Statut",
      sortable: true,
      render: (value: boolean) => (
        <Badge variant={value ? "default" : "outline"}>
          {value ? "Actif" : "Inactif"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            title="Modifier le niveau"
            onClick={() => handleOpenEditLevel(row)}
          >
            <Edit className="h-4 w-4 text-indigo-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Supprimer le niveau"
            onClick={() => handleDeleteLevel(row.id, row.libelle)}
          >
            <Trash2 className="h-4 w-4 text-rose-600" />
          </Button>
        </div>
      ),
    },
  ];

  const classColumns: Column[] = [
    { key: "name", label: "Libellé / Nom", sortable: true },
    { key: "niveau", label: "Niveau", sortable: true },
    {
      key: "cycle",
      label: "Cycle",
      sortable: true,
      render: (value: string) => {
        const labels: Record<string, string> = {
          maternelle: "Maternelle",
          primaire: "Primaire",
          college: "Collège",
          lycee: "Collège 2nd cycle",
        };
        return <Badge variant="secondary">{labels[value] || value}</Badge>;
      },
    },
    {
      key: "schoolId",
      label: "Établissement",
      sortable: true,
      render: (value: string, row: any) => {
        const targetId = value || row.ecole_id || row.schoolId;
        const targetCode = row.ET_CODEETABLISSEMENT || row.schoolCode || "";
        const sch = schoolsList.find((s) => 
          (targetId && String(s.id) === String(targetId)) ||
          (targetCode && (s.ET_CODEETABLISSEMENT === targetCode || s.code === targetCode))
        );
        if (sch) {
          const cityName = sch.city || sch.ET_VILLE || "";
          return cityName ? `${sch.name} (${cityName})` : sch.name;
        }
        return targetCode || "Inconnu";
      },
    },
    {
      key: "teacherId",
      label: "Enseignant principal",
      sortable: true,
      render: (value: string) => {
        const t = staffList.find((s) => String(s.id) === String(value));
        return t ? `${formatStudentName(t)}` : "Non assigné";
      },
    },
    { key: "studentCount", label: "Effectif", sortable: true },
    { key: "capacity", label: "Capacité", sortable: true },
    {
      key: "actions",
      label: "Actions",
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            title="Modifier la classe"
            onClick={() => handleOpenEditClass(row)}
          >
            <Edit className="h-4 w-4 text-indigo-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Supprimer la classe"
            onClick={() =>
              handleDeleteClass(row.id, row.name || row.CE_LIBELLE)
            }
          >
            <Trash2 className="h-4 w-4 text-rose-600" />
          </Button>
        </div>
      ),
    },
  ];

  const auditColumns: Column[] = [
    {
      key: "timestamp",
      label: "Date & Heure",
      sortable: true,
      render: (value: Date) => formatDateTime(value),
    },
    { key: "utilisateur", label: "Utilisateur", sortable: true },
    { key: "action", label: "Action", sortable: true },
    { key: "module", label: "Module", sortable: true },
    { key: "detail", label: "Détail", sortable: false },
    { key: "ipAddress", label: "Adresse IP", sortable: false },
  ];

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Administration
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestion des utilisateurs, rôles, permissions et référentiels
              système
            </p>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="flex flex-wrap gap-1 h-auto lg:w-auto">
            <TabsTrigger value="users" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-2">
              <Shield className="h-4 w-4" />
              Rôles &amp; Permissions
            </TabsTrigger>
            <TabsTrigger value="references" className="gap-2">
              <Database className="h-4 w-4" />
              Référentiels
            </TabsTrigger>
            <TabsTrigger value="salles" className="gap-2">
              <DoorOpen className="h-4 w-4" />
              Salles
            </TabsTrigger>
            <TabsTrigger value="emplois" className="gap-2">
              <Calendar className="h-4 w-4" />
              Emplois du temps
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <FileText className="h-4 w-4" />
              Journal d'audit
            </TabsTrigger>
            <TabsTrigger value="pointages" className="gap-2">
              <Clock className="h-4 w-4" />
              Pointage Personnel
            </TabsTrigger>
            <TabsTrigger value="inspection" className="gap-2">
              <Search className="h-4 w-4" />
              Inspection
            </TabsTrigger>
            <TabsTrigger value="conseil" className="gap-2">
              <Users className="h-4 w-4" />
              Conseil de classe
            </TabsTrigger>
            <TabsTrigger value="chronogramme" className="gap-2">
              <Gift className="h-4 w-4" />
              Chronogramme
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Créer utilisateur
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
                    <DialogDescription>
                      Remplissez les informations pour créer un compte
                      utilisateur
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="grid gap-1">
                        <Label htmlFor="nom">Nom</Label>
                        <Input
                          id="nom"
                          placeholder="Nom"
                          value={nom}
                          onChange={(e) => setNom(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label htmlFor="prenom">Prénom</Label>
                        <Input
                          id="prenom"
                          placeholder="Prénom"
                          value={prenom}
                          onChange={(e) => setPrenom(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="username">
                        Nom d'utilisateur / Login
                      </Label>
                      <Input
                        id="username"
                        placeholder="ex: user.hinneh"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="utilisateur@hinneh-education.ci"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="telephone">Téléphone</Label>
                      <Input
                        id="telephone"
                        placeholder="ex: +225 0102030405"
                        value={telephone}
                        onChange={(e) => setTelephone(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">Mot de passe</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Mot de passe temporaire"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="role">Rôle</Label>
                      <Select
                        value={selectedRole}
                        onValueChange={setSelectedRole}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un rôle" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.name}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* ÉTABLISSEMENT PRINCIPAL ET ÉTABLISSEMENTS AUTORISÉS (CHECKBOXES PAR VILLE) */}
                    <div className="grid gap-2">
                      <Label htmlFor="etablissement">Établissement Principal</Label>
                      <Select
                        value={selectedSchoolId}
                        onValueChange={(val) => {
                          setSelectedSchoolId(val);
                          if (val && !selectedEcoles.includes(Number(val))) {
                            setSelectedEcoles((prev) => [...prev, Number(val)]);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un établissement principal" />
                        </SelectTrigger>
                        <SelectContent>
                          {schoolsList.map((school: any) => (
                            <SelectItem
                              key={school.id}
                              value={String(school.id)}
                            >
                              {school.name} ({school.city || school.ET_VILLE || "CI"})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="p-3 bg-sky-50/70 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1">
                          🏫 Établissements autorisés par VILLE (Case à cocher)
                        </Label>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-200 text-sky-900 dark:bg-sky-900 dark:text-sky-100">
                          {selectedEcoles.length} coché(s)
                        </span>
                      </div>

                      {/* Filtre par ville */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                        <span className="text-muted-foreground font-semibold shrink-0">Ville :</span>
                        <button
                          type="button"
                          onClick={() => setSelectedCityFilter("all")}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all shrink-0 ${
                            selectedCityFilter === "all"
                              ? "bg-sky-700 text-white"
                              : "bg-background text-muted-foreground border hover:bg-muted"
                          }`}
                        >
                          Toutes
                        </button>
                        {Array.from(
                          new Set(
                            schoolsList
                              .map((s: any) => s.city || s.ET_VILLE)
                              .filter(Boolean),
                          ),
                        ).map((city: any) => (
                          <button
                            type="button"
                            key={city}
                            onClick={() => setSelectedCityFilter(city)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all shrink-0 ${
                              selectedCityFilter === city
                                ? "bg-sky-700 text-white"
                                : "bg-background text-muted-foreground border hover:bg-muted"
                            }`}
                          >
                            📍 {city}
                          </button>
                        ))}
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        Cochez 1 ou plusieurs établissements ci-dessous pour accorder les accès.
                      </p>

                      {/* Checkboxes groupées par Ville */}
                      <div className="space-y-2.5 pt-1 max-h-48 overflow-y-auto pr-1">
                        {Array.from(
                          new Set(
                            schoolsList.map(
                              (s: any) => s.city || s.ET_VILLE || "Autre",
                            ),
                          ),
                        ).map((city: any) => {
                          const schoolsInCity = schoolsList.filter(
                            (s: any) =>
                              (s.city || s.ET_VILLE || "Autre") === city,
                          );
                          if (
                            selectedCityFilter !== "all" &&
                            selectedCityFilter !== city
                          )
                            return null;

                          return (
                            <div key={city} className="space-y-1">
                              <div className="text-[11px] font-bold text-sky-950 dark:text-sky-200">
                                📍 Ville : {city} ({schoolsInCity.length})
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {schoolsInCity.map((sch: any) => {
                                  const isChecked =
                                    selectedEcoles.includes(sch.id) ||
                                    String(selectedSchoolId) === String(sch.id);
                                  return (
                                    <label
                                      key={sch.id}
                                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                                        isChecked
                                          ? "bg-sky-100 dark:bg-sky-900/50 border-sky-400 text-sky-950 dark:text-sky-100 font-bold"
                                          : "bg-background border-border text-muted-foreground hover:border-sky-300"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() =>
                                          toggleAdminEcoleSelection(sch.id)
                                        }
                                        className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                                      />
                                      <div className="flex flex-col min-w-0">
                                        <span className="truncate">{sch.name}</span>
                                        <span className="text-[10px] text-muted-foreground">
                                          {sch.code || sch.ET_CODEETABLISSEMENT || "N/A"}
                                        </span>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setCreateUserOpen(false)}
                    >
                      Annuler
                    </Button>
                    <Button onClick={handleCreateUser}>Créer</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* DIALOG MODIFICATION DU RÔLE ET DES ACCÈS UTILISATEUR */}
              <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle className="text-indigo-900 dark:text-white flex items-center gap-2 text-base font-extrabold">
                      <Shield className="w-5 h-5 text-indigo-600" /> Modifier le Rôle & Accès de {editingUser?.nom}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Ajustez le rôle administratif, le statut d'accès (actif/suspendu) et les établissements autorisés.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4 max-h-[65vh] overflow-y-auto px-1 text-xs">
                    
                    {/* Statut d'Accès (Actif / Annulé-Suspendu) */}
                    <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-900 space-y-2">
                      <Label className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-white text-xs">
                        <Lock className="w-4 h-4 text-indigo-600" /> Statut Général du Compte Utilisateur
                      </Label>
                      <div className="flex gap-3">
                        <label className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border font-bold cursor-pointer transition-all ${
                          editStatus === 'actif' ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-500 text-emerald-900 dark:text-emerald-200' : 'bg-white dark:bg-slate-800 border-slate-200 text-slate-500'
                        }`}>
                          <input
                            type="radio"
                            name="editStatus"
                            checked={editStatus === 'actif'}
                            onChange={() => setEditStatus('actif')}
                            className="hidden"
                          />
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Compte Actif (Accès Autorisé)
                        </label>

                        <label className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border font-bold cursor-pointer transition-all ${
                          editStatus === 'desactive' ? 'bg-rose-100 dark:bg-rose-950 border-rose-500 text-rose-900 dark:text-rose-200' : 'bg-white dark:bg-slate-800 border-slate-200 text-slate-500'
                        }`}>
                          <input
                            type="radio"
                            name="editStatus"
                            checked={editStatus === 'desactive'}
                            onChange={() => setEditStatus('desactive')}
                            className="hidden"
                          />
                          <Lock className="w-4 h-4 text-rose-600" /> Accès Suspendu / Annulé
                        </label>
                      </div>
                    </div>

                    {/* Rôle Système */}
                    <div className="space-y-1.5">
                      <Label htmlFor="editRole" className="font-bold text-xs">Attribution du Rôle Utilisateur</Label>
                      <Select value={editRole} onValueChange={setEditRole}>
                        <SelectTrigger id="editRole">
                          <SelectValue placeholder="Sélectionnez un rôle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="superuser">Super Utilisateur (Accès Total)</SelectItem>
                          <SelectItem value="direction_fondation">Direction Fondation</SelectItem>
                          <SelectItem value="directeur_ecole">Directeur d'Établissement</SelectItem>
                          <SelectItem value="scolarite">Responsable Scolarité</SelectItem>
                          <SelectItem value="caisse">Agent Caissier / Guichet</SelectItem>
                          <SelectItem value="comptable">Comptabilité & Finances</SelectItem>
                          <SelectItem value="secretaire">Secrétaire (Voir tout sauf Admin/Config/Import/Paramètres)</SelectItem>
                          <SelectItem value="secretaire_direction">Secrétariat de Direction</SelectItem>
                          <SelectItem value="aumonier">Aumônier / Guide Spirituel</SelectItem>
                          <SelectItem value="informaticien">Informaticien / Service IT</SelectItem>
                          <SelectItem value="accueil">Accueil & Réception</SelectItem>
                          <SelectItem value="educateur">Éducateur / Vie Scolaire</SelectItem>
                          <SelectItem value="enseignant">Enseignant / Professeur</SelectItem>
                          <SelectItem value="rh">Ressources Humaines</SelectItem>
                          <SelectItem value="agent">Agent Administratif</SelectItem>
                          <SelectItem value="admin">Administrateur Technique</SelectItem>
                          <SelectItem value="parent">Espace Parent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Modification / Réinitialisation du Mot de Passe */}
                    <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900 space-y-1.5">
                      <Label htmlFor="editPassword" className="font-bold text-xs flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
                        <KeyRound className="w-4 h-4 text-amber-600" /> Réinitialiser le Mot de Passe (Optionnel)
                      </Label>
                      <Input
                        id="editPassword"
                        type="password"
                        placeholder="Saisir un nouveau mot de passe (laisser vide sinon)"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        className="bg-white dark:bg-slate-900 text-xs"
                      />
                    </div>

                    {/* Villes Autorisées - Verrou de Confidentialité */}
                    <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-emerald-600" /> Villes Autorisées (Verrou de Confidentialité) ({editVilles.length} sélectionnée(s))
                        </Label>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {(villesList.length > 0 ? villesList : [
                          { id: 1, libelle: "Abidjan" },
                          { id: 2, libelle: "Bouaké" },
                          { id: 3, libelle: "Yamoussoukro" },
                          { id: 4, libelle: "Korhogo" },
                          { id: 5, libelle: "San-Pédro" },
                          { id: 6, libelle: "Daloa" },
                          { id: 7, libelle: "Man" },
                          { id: 8, libelle: "Gagnoa" }
                        ]).map((v: any) => {
                          const isChecked = editVilles.includes(v.libelle);
                          return (
                            <label
                              key={v.id || v.libelle}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                                isChecked
                                  ? "bg-emerald-100 dark:bg-emerald-900/50 border-emerald-400 text-emerald-950 dark:text-emerald-100 font-bold"
                                  : "bg-white dark:bg-slate-900 border-slate-200 text-slate-600"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setEditVilles((prev) =>
                                    prev.includes(v.libelle)
                                      ? prev.filter((x) => x !== v.libelle)
                                      : [...prev, v.libelle]
                                  );
                                }}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <span className="truncate">{v.libelle}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Établissements Autorisés */}
                    <div className="p-3 bg-sky-50/70 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-sky-900 dark:text-sky-200">
                          🏫 Établissements autorisés ({editEcoles.length} sélectionné(s))
                        </Label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                        {schoolsList.map((sch: any) => {
                          const isChecked = editEcoles.includes(sch.id);
                          return (
                            <label
                              key={sch.id}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                                isChecked
                                  ? "bg-sky-100 dark:bg-sky-900/50 border-sky-400 text-sky-950 dark:text-sky-100 font-bold"
                                  : "bg-white dark:bg-slate-900 border-slate-200 text-slate-600"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleEditUserEcoleSelection(sch.id)}
                                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                              />
                              <span className="truncate">{sch.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  <DialogFooter className="flex gap-2">
                    <Button variant="outline" onClick={() => setEditUserOpen(false)}>Annuler</Button>
                    <Button onClick={handleSaveUserAccessAndRole} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                      Enregistrer les Modifications
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Liste des utilisateurs</CardTitle>
                <CardDescription>
                  Gérez les comptes utilisateurs et leurs accès
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={userColumns}
                  data={users}
                  searchable
                  exportable
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {roles.map((role) => (
                <motion.div
                  key={role.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">
                            {role.label}
                          </CardTitle>
                          <Badge variant="secondary">
                            {role.moduleCount} modules
                          </Badge>
                        </div>
                        <Shield className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <CardDescription className="mt-2">
                        {role.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className="w-full gap-2">
                        <Edit className="h-4 w-4" />
                        Modifier les permissions
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="references" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Référentiels système</CardTitle>
                <CardDescription>
                  Gérez les données de référence utilisées dans l'application
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="villes">
                    <AccordionTrigger className="text-lg font-semibold flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-600" /> Villes & Implantation Géographique
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-4 space-y-4">
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-slate-500">
                            Répertoire des villes hôtes d'établissements. Détermine le verrou de confidentialité par ville pour les utilisateurs.
                          </p>
                          <Dialog open={createVilleOpen} onOpenChange={setCreateVilleOpen}>
                            <DialogTrigger asChild>
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold">
                                <Plus className="h-4 w-4" /> Ajouter une Ville
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle className="text-emerald-900 font-black">Ajouter une Nouvelle Ville</DialogTitle>
                                <DialogDescription className="text-xs">
                                  Enregistrez une ville pour pouvoir y créer des établissements et assigner des utilisateurs.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-3 py-2 text-xs">
                                <div>
                                  <Label className="font-bold">Nom / Libellé de la Ville *</Label>
                                  <Input
                                    placeholder="ex: Korhogo, Abidjan, Bouaké..."
                                    value={newVilleLibelle}
                                    onChange={(e) => setNewVilleLibelle(e.target.value)}
                                    className="mt-1"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="font-bold">Code Ville (ex: KGO)</Label>
                                    <Input
                                      placeholder="ex: KGO"
                                      value={newVilleCode}
                                      onChange={(e) => setNewVilleCode(e.target.value)}
                                      className="mt-1"
                                    />
                                  </div>
                                  <div>
                                    <Label className="font-bold">Région (ex: Poro)</Label>
                                    <Input
                                      placeholder="ex: Poro"
                                      value={newVilleRegion}
                                      onChange={(e) => setNewVilleRegion(e.target.value)}
                                      className="mt-1"
                                    />
                                  </div>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setCreateVilleOpen(false)}>Annuler</Button>
                                <Button onClick={handleCreateVille} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">Enregistrer Ville</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>

                        <DataTable
                          columns={[
                            { key: "libelle", label: "Nom de la Ville", sortable: true },
                            { key: "code", label: "Code", sortable: true },
                            { key: "region", label: "Région", sortable: true },
                            {
                              key: "statut",
                              label: "Statut",
                              sortable: true,
                              render: (val: any) => (
                                <Badge className={val === "actif" ? "bg-emerald-600 text-white" : "bg-slate-300"}>
                                  {val === "actif" ? "Actif" : "Inactif"}
                                </Badge>
                              ),
                            },
                          ]}
                          data={villesList.length > 0 ? villesList : [
                            { id: 1, libelle: "Abidjan", code: "ABJ", region: "Lagunes", statut: "actif" },
                            { id: 2, libelle: "Bouaké", code: "BKE", region: "GBÊKÊ", statut: "actif" },
                            { id: 3, libelle: "Yamoussoukro", code: "YMK", region: "Bélier", statut: "actif" },
                            { id: 4, libelle: "Korhogo", code: "KGO", region: "Poro", statut: "actif" },
                            { id: 5, libelle: "San-Pédro", code: "SP", region: "Bas-Sassandra", statut: "actif" },
                            { id: 6, libelle: "Daloa", code: "DLA", region: "Haut-Sassandra", statut: "actif" },
                            { id: 7, libelle: "Man", code: "MAN", region: "Tonkpi", statut: "actif" },
                            { id: 8, libelle: "Gagnoa", code: "GGO", region: "Gôh", statut: "actif" }
                          ]}
                          searchable={true}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="etablissements">
                    <AccordionTrigger className="text-lg font-semibold">
                      Établissements
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-4 space-y-4">
                        <div className="flex justify-end">
                          <Link to={ROUTE_PATHS.SCHOOLS}>
                            <Button size="sm" className="gap-2">
                              <School className="h-4 w-4" />
                              Gérer les établissements
                            </Button>
                          </Link>
                        </div>
                        <DataTable
                          columns={[
                            { key: "code", label: "Code", sortable: true },
                            {
                              key: "name",
                              label: "Nom / Dénomination",
                              sortable: true,
                            },
                            { key: "city", label: "Ville", sortable: true },
                            { key: "region", label: "Région", sortable: true },
                            {
                              key: "status",
                              label: "Statut",
                              sortable: true,
                              render: (val: any) => (
                                <Badge
                                  variant={
                                    val === "actif" ? "default" : "outline"
                                  }
                                >
                                  {val === "actif"
                                    ? "Actif"
                                    : val === "suspendu"
                                      ? "Suspendu"
                                      : "En création"}
                                </Badge>
                              ),
                            },
                          ]}
                          data={schoolsList}
                          searchable={true}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="cycles">
                    <AccordionTrigger className="text-lg font-semibold">
                      Cycles scolaires
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-4">
                        <DataTable
                          columns={referenceColumns}
                          data={
                            cyclesList.length > 0
                              ? cyclesList.map((c) => ({
                                  id: String(c.id),
                                  code: c.code,
                                  libelle: c.libelle,
                                  ordre: c.ordre,
                                  actif: c.actif,
                                }))
                              : cycles
                          }
                          searchable={false}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="niveaux">
                    <AccordionTrigger className="text-lg font-semibold">
                      Niveaux scolaires
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-4 space-y-4">
                        <div className="flex justify-end">
                          <Dialog
                            open={createLevelOpen}
                            onOpenChange={setCreateLevelOpen}
                          >
                            <DialogTrigger asChild>
                              <Button size="sm" className="gap-2">
                                <UserPlus className="h-4 w-4" />
                                Créer un niveau
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                              <DialogHeader>
                                <DialogTitle>
                                  Créer un niveau scolaire
                                </DialogTitle>
                                <DialogDescription>
                                  Ajoutez un nouveau niveau d'enseignement dans
                                  le référentiel.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                                <div className="grid gap-1">
                                  <Label htmlFor="levelLibelle">Libellé</Label>
                                  <Input
                                    id="levelLibelle"
                                    placeholder="ex: 6ème, CP1"
                                    value={levelLibelle}
                                    onChange={(e) =>
                                      setLevelLibelle(e.target.value)
                                    }
                                  />
                                </div>
                                <div className="grid gap-1">
                                  <Label htmlFor="levelCode">Code unique</Label>
                                  <Input
                                    id="levelCode"
                                    placeholder="ex: 6EME, CP1"
                                    value={levelCode}
                                    onChange={(e) =>
                                      setLevelCode(e.target.value)
                                    }
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="grid gap-1">
                                    <Label htmlFor="levelOrdre">
                                      Ordre d'affichage
                                    </Label>
                                    <Input
                                      id="levelOrdre"
                                      type="number"
                                      value={levelOrdre}
                                      onChange={(e) =>
                                        setLevelOrdre(Number(e.target.value))
                                      }
                                    />
                                  </div>
                                  <div className="grid gap-1">
                                    <Label htmlFor="levelCycle">
                                      Cycle scolaire
                                    </Label>
                                    <Select
                                      value={levelCycleId}
                                      onValueChange={setLevelCycleId}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner le cycle" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {cyclesList.map((cy) => (
                                          <SelectItem
                                            key={cy.id}
                                            value={String(cy.id)}
                                          >
                                            {cy.libelle}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="grid gap-1">
                                    <Label htmlFor="levelScolarite">
                                      Scolarité (FCFA)
                                    </Label>
                                    <Input
                                      id="levelScolarite"
                                      type="number"
                                      value={levelScolarite}
                                      onChange={(e) =>
                                        setLevelScolarite(
                                          Number(e.target.value),
                                        )
                                      }
                                    />
                                  </div>
                                  <div className="grid gap-1">
                                    <Label htmlFor="levelInsc">
                                      Inscription (FCFA)
                                    </Label>
                                    <Input
                                      id="levelInsc"
                                      type="number"
                                      value={levelDroitInscription}
                                      onChange={(e) =>
                                        setLevelDroitInscription(
                                          Number(e.target.value),
                                        )
                                      }
                                    />
                                  </div>
                                  <div className="grid gap-1">
                                    <Label htmlFor="levelExamen">
                                      Droit Examen (FCFA)
                                    </Label>
                                    <Input
                                      id="levelExamen"
                                      type="number"
                                      value={levelDroitExamen}
                                      onChange={(e) =>
                                        setLevelDroitExamen(
                                          Number(e.target.value),
                                        )
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 pt-2">
                                  <input
                                    id="levelActif"
                                    type="checkbox"
                                    checked={levelActif}
                                    onChange={(e) =>
                                      setLevelActif(e.target.checked)
                                    }
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                  />
                                  <Label htmlFor="levelActif">Actif</Label>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setCreateLevelOpen(false)}
                                >
                                  Annuler
                                </Button>
                                <Button onClick={handleCreateLevel}>
                                  Créer
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <DataTable
                          columns={levelColumns}
                          data={levelsList}
                          searchable={true}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="classes">
                    <AccordionTrigger className="text-lg font-semibold">
                      Classes
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-4 space-y-4">
                        <div className="flex justify-end">
                          <Dialog
                            open={createClassOpen}
                            onOpenChange={setCreateClassOpen}
                          >
                            <DialogTrigger asChild>
                              <Button size="sm" className="gap-2">
                                <UserPlus className="h-4 w-4" />
                                Créer une classe
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                              <DialogHeader>
                                <DialogTitle>Créer une classe</DialogTitle>
                                <DialogDescription>
                                  Ajoutez une nouvelle classe dans le système.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                                <div className="grid gap-1">
                                  <Label htmlFor="classLibelle">
                                    Nom / Libellé de la classe
                                  </Label>
                                  <Input
                                    id="classLibelle"
                                    placeholder="ex: 6ème A, CP1 B"
                                    value={classLibelle}
                                    onChange={(e) =>
                                      setClassLibelle(e.target.value)
                                    }
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="grid gap-1">
                                    <Label htmlFor="classCapacite">
                                      Capacité d'élèves
                                    </Label>
                                    <Input
                                      id="classCapacite"
                                      type="number"
                                      value={classCapacite}
                                      onChange={(e) =>
                                        setClassCapacite(Number(e.target.value))
                                      }
                                    />
                                  </div>
                                  <div className="grid gap-1">
                                    <Label htmlFor="classSchool">
                                      Établissement
                                    </Label>
                                    <Select
                                      value={classSchoolId}
                                      onValueChange={setClassSchoolId}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner l'établissement" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {schoolsList.map((sch) => (
                                          <SelectItem
                                            key={sch.id}
                                            value={String(sch.id)}
                                          >
                                            {sch.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="grid gap-1">
                                    <Label htmlFor="classCycle">
                                      Cycle scolaire
                                    </Label>
                                    <Select
                                      value={classCycleId}
                                      onValueChange={setClassCycleId}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner le cycle" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {cyclesList.map((cy) => (
                                          <SelectItem
                                            key={cy.id}
                                            value={String(cy.id)}
                                          >
                                            {cy.libelle}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="grid gap-1">
                                    <Label htmlFor="classNiveau">
                                      Niveau scolaire
                                    </Label>
                                    <Select
                                      value={classNiveauId}
                                      onValueChange={setClassNiveauId}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner le niveau" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {levelsList
                                          .filter(
                                            (l) =>
                                              !classCycleId ||
                                              String(l.cycle_id) ===
                                                String(classCycleId),
                                          )
                                          .map((l) => (
                                            <SelectItem
                                              key={l.id}
                                              value={String(l.id)}
                                            >
                                              {l.libelle}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="grid gap-1">
                                  <Label htmlFor="classTeacher">
                                    Enseignant principal (Optionnel)
                                  </Label>
                                  <Select
                                    value={classEnseignantId}
                                    onValueChange={setClassEnseignantId}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Sélectionner un enseignant" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">
                                        Aucun
                                      </SelectItem>
                                      {staffList
                                        .filter(
                                          (s: any) =>
                                            s.fonction === "enseignant" ||
                                            s.fonction === "coranique",
                                        )
                                        .map((s: any) => (
                                          <SelectItem
                                            key={s.id}
                                            value={String(s.id)}
                                          >
                                            {formatStudentName(s)}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setCreateClassOpen(false)}
                                >
                                  Annuler
                                </Button>
                                <Button onClick={handleCreateClass}>
                                  Créer
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <DataTable
                          columns={classColumns}
                          data={classesList}
                          searchable={true}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* MODAL MODIFIER CLASSE */}
                  <Dialog open={editClassOpen} onOpenChange={setEditClassOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Modifier la classe</DialogTitle>
                        <DialogDescription>
                          Modifiez les informations de la classe sélectionnée.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                        <div className="grid gap-1">
                          <Label htmlFor="editClassLibelle">
                            Nom / Libellé de la classe
                          </Label>
                          <Input
                            id="editClassLibelle"
                            value={classLibelle}
                            onChange={(e) => setClassLibelle(e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="grid gap-1">
                            <Label htmlFor="editClassCapacite">
                              Capacité d'élèves
                            </Label>
                            <Input
                              id="editClassCapacite"
                              type="number"
                              value={classCapacite}
                              onChange={(e) =>
                                setClassCapacite(Number(e.target.value))
                              }
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label htmlFor="editClassSchool">
                              Établissement
                            </Label>
                            <Select
                              value={classSchoolId}
                              onValueChange={setClassSchoolId}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Établissement" />
                              </SelectTrigger>
                              <SelectContent>
                                {schoolsList.map((sch) => (
                                  <SelectItem
                                    key={sch.id}
                                    value={String(sch.id)}
                                  >
                                    {sch.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="grid gap-1">
                            <Label htmlFor="editClassCycle">
                              Cycle scolaire
                            </Label>
                            <Select
                              value={classCycleId}
                              onValueChange={setClassCycleId}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Cycle" />
                              </SelectTrigger>
                              <SelectContent>
                                {cyclesList.map((cy) => (
                                  <SelectItem key={cy.id} value={String(cy.id)}>
                                    {cy.libelle}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-1">
                            <Label htmlFor="editClassNiveau">
                              Niveau scolaire
                            </Label>
                            <Select
                              value={classNiveauId}
                              onValueChange={setClassNiveauId}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Niveau" />
                              </SelectTrigger>
                              <SelectContent>
                                {levelsList
                                  .filter(
                                    (l) =>
                                      !classCycleId ||
                                      String(l.cycle_id) ===
                                        String(classCycleId),
                                  )
                                  .map((l) => (
                                    <SelectItem key={l.id} value={String(l.id)}>
                                      {l.libelle}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor="editClassTeacher">
                            Enseignant principal
                          </Label>
                          <Select
                            value={classEnseignantId}
                            onValueChange={setClassEnseignantId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Enseignant" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Aucun</SelectItem>
                              {staffList
                                .filter(
                                  (s: any) =>
                                    s.fonction === "enseignant" ||
                                    s.fonction === "coranique",
                                )
                                .map((s: any) => (
                                  <SelectItem key={s.id} value={String(s.id)}>
                                    {formatStudentName(s)}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setEditClassOpen(false)}
                        >
                          Annuler
                        </Button>
                        <Button onClick={handleSaveClass}>
                          Enregistrer les modifications
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* MODAL MODIFIER NIVEAU */}
                  <Dialog open={editLevelOpen} onOpenChange={setEditLevelOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Modifier le niveau scolaire</DialogTitle>
                        <DialogDescription>
                          Modifiez les informations et tarifs du niveau
                          sélectionné.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="grid gap-1">
                            <Label htmlFor="editLevelLibelle">
                              Libellé du niveau
                            </Label>
                            <Input
                              id="editLevelLibelle"
                              value={levelLibelle}
                              onChange={(e) => setLevelLibelle(e.target.value)}
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label htmlFor="editLevelCode">Code unique</Label>
                            <Input
                              id="editLevelCode"
                              value={levelCode}
                              onChange={(e) => setLevelCode(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="grid gap-1">
                            <Label htmlFor="editLevelCycle">
                              Cycle rattaché
                            </Label>
                            <Select
                              value={levelCycleId}
                              onValueChange={setLevelCycleId}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Cycle" />
                              </SelectTrigger>
                              <SelectContent>
                                {cyclesList.map((cy) => (
                                  <SelectItem key={cy.id} value={String(cy.id)}>
                                    {cy.libelle}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-1">
                            <Label htmlFor="editLevelOrdre">Ordre de tri</Label>
                            <Input
                              id="editLevelOrdre"
                              type="number"
                              value={levelOrdre}
                              onChange={(e) =>
                                setLevelOrdre(Number(e.target.value))
                              }
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 border-t pt-3 mt-1">
                          <div className="grid gap-1">
                            <Label htmlFor="editLevelScolarite">
                              Scolarité (FCFA)
                            </Label>
                            <Input
                              id="editLevelScolarite"
                              type="number"
                              value={levelScolarite}
                              onChange={(e) =>
                                setLevelScolarite(Number(e.target.value))
                              }
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label htmlFor="editLevelInscription">
                              Inscription (FCFA)
                            </Label>
                            <Input
                              id="editLevelInscription"
                              type="number"
                              value={levelDroitInscription}
                              onChange={(e) =>
                                setLevelDroitInscription(Number(e.target.value))
                              }
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label htmlFor="editLevelExamen">
                              Examen (FCFA)
                            </Label>
                            <Input
                              id="editLevelExamen"
                              type="number"
                              value={levelDroitExamen}
                              onChange={(e) =>
                                setLevelDroitExamen(Number(e.target.value))
                              }
                            />
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                          <input
                            id="editLevelActif"
                            type="checkbox"
                            checked={levelActif}
                            onChange={(e) => setLevelActif(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <Label htmlFor="editLevelActif">Niveau Actif</Label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setEditLevelOpen(false)}
                        >
                          Annuler
                        </Button>
                        <Button onClick={handleSaveLevel}>
                          Enregistrer les modifications
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <AccordionItem value="matieres">
                    <AccordionTrigger className="text-lg font-semibold">
                      Matières
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-4 space-y-4">
                        <div className="flex justify-end">
                          <Dialog
                            open={createSubjectOpen}
                            onOpenChange={setCreateSubjectOpen}
                          >
                            <DialogTrigger asChild>
                              <Button size="sm" className="gap-2">
                                <Plus className="h-4 w-4" />
                                Créer une matière
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[450px]">
                              <DialogHeader>
                                <DialogTitle>Créer une matière</DialogTitle>
                                <DialogDescription>
                                  Ajoutez une nouvelle matière d'enseignement
                                  dans le référentiel.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid gap-1">
                                  <Label htmlFor="subjLibelle">
                                    Nom / Libellé de la matière
                                  </Label>
                                  <Input
                                    id="subjLibelle"
                                    placeholder="ex: Histoire-Géographie"
                                    value={subjLibelle}
                                    onChange={(e) =>
                                      setSubjLibelle(e.target.value)
                                    }
                                  />
                                </div>
                                <div className="grid gap-1">
                                  <Label htmlFor="subjCode">Code unique</Label>
                                  <Input
                                    id="subjCode"
                                    placeholder="ex: HG, MATH"
                                    value={subjCode}
                                    onChange={(e) =>
                                      setSubjCode(e.target.value)
                                    }
                                  />
                                </div>
                                <div className="grid gap-1">
                                  <Label htmlFor="subjParent">
                                    Discipline parente (Optionnel)
                                  </Label>
                                  <Select
                                    value={subjParentId}
                                    onValueChange={setSubjParentId}
                                  >
                                    <SelectTrigger id="subjParent">
                                      <SelectValue placeholder="Aucune (Discipline principale)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">
                                        Aucune (Discipline principale)
                                      </SelectItem>
                                      {(subjectsList.length > 0
                                        ? subjectsList
                                        : matieres
                                      )
                                        .filter((m) => !m.parent_id)
                                        .map((m) => (
                                          <SelectItem
                                            key={m.id}
                                            value={String(m.id)}
                                          >
                                            {m.libelle}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-center space-x-2 pt-2">
                                  <input
                                    id="subjActif"
                                    type="checkbox"
                                    checked={subjActif}
                                    onChange={(e) =>
                                      setSubjActif(e.target.checked)
                                    }
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                  />
                                  <Label htmlFor="subjActif">Actif</Label>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setCreateSubjectOpen(false)}
                                >
                                  Annuler
                                </Button>
                                <Button onClick={handleCreateSubject}>
                                  Créer
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <DataTable
                          columns={subjectColumns}
                          data={
                            subjectsList.length > 0
                              ? subjectsList.map((s) => ({
                                  id: String(s.id),
                                  code: s.code,
                                  libelle: s.libelle,
                                  actif: s.actif,
                                  parent_id: s.parent_id,
                                }))
                              : matieres
                          }
                          searchable={true}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="attributions">
                    <AccordionTrigger className="text-lg font-semibold">
                      Attribution des matières
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-4 space-y-4">
                        <div className="flex justify-end">
                          <Dialog
                            open={createAttrOpen}
                            onOpenChange={setCreateAttrOpen}
                          >
                            <DialogTrigger asChild>
                              <Button size="sm" className="gap-2">
                                <Plus className="h-4 w-4" />
                                Nouvelle attribution
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                              <DialogHeader>
                                <DialogTitle>Attribuer une matière</DialogTitle>
                                <DialogDescription>
                                  Attribuez une matière et une plage horaire à
                                  un enseignant pour une classe donnée.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="grid gap-1">
                                    <Label>Classe</Label>
                                    <Select
                                      value={attrClasseId}
                                      onValueChange={setAttrClasseId}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner la classe" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {classesList.map((cl) => (
                                          <SelectItem
                                            key={cl.id}
                                            value={String(cl.id)}
                                          >
                                            {cl.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="grid gap-1">
                                    <Label>Enseignant</Label>
                                    <Select
                                      value={attrEnseignantId}
                                      onValueChange={setAttrEnseignantId}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner l'enseignant" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {staffList
                                          .filter(
                                            (s) =>
                                              s.fonction === "enseignant" ||
                                              s.fonction === "coranique",
                                          )
                                          .map((t) => (
                                            <SelectItem
                                              key={t.id}
                                              value={String(t.id)}
                                            >
                                              {formatStudentName(t)}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="grid gap-1">
                                    <Label>Matière</Label>
                                    <Select
                                      value={attrMatiereId}
                                      onValueChange={setAttrMatiereId}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner la matière" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {(subjectsList.length > 0
                                          ? subjectsList
                                          : matieres
                                        ).map((m) => {
                                          const parent = m.parent_id
                                            ? (subjectsList.length > 0
                                                ? subjectsList
                                                : matieres
                                              ).find(
                                                (p) =>
                                                  String(p.id) ===
                                                  String(m.parent_id),
                                              )
                                            : null;
                                          const label = parent
                                            ? `${parent.libelle} - ${m.libelle}`
                                            : m.libelle;
                                          return (
                                            <SelectItem
                                              key={m.id}
                                              value={String(m.id)}
                                            >
                                              {label}
                                            </SelectItem>
                                          );
                                        })}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="grid gap-1">
                                    <Label>Jour</Label>
                                    <Select
                                      value={attrJour}
                                      onValueChange={setAttrJour}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner le jour" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {[
                                          "Lundi",
                                          "Mardi",
                                          "Mercredi",
                                          "Jeudi",
                                          "Vendredi",
                                          "Samedi",
                                        ].map((day) => (
                                          <SelectItem key={day} value={day}>
                                            {day}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="grid gap-1">
                                    <Label htmlFor="attrHeure">
                                      Plage horaire
                                    </Label>
                                    <Input
                                      id="attrHeure"
                                      placeholder="ex: 08:00 - 10:00"
                                      value={attrHeure}
                                      onChange={(e) =>
                                        setAttrHeure(e.target.value)
                                      }
                                    />
                                  </div>
                                  <div className="grid gap-1">
                                    <Label htmlFor="attrSalle">
                                      Salle (Optionnel)
                                    </Label>
                                    <Input
                                      id="attrSalle"
                                      placeholder="ex: Salle 102"
                                      value={attrSalle}
                                      onChange={(e) =>
                                        setAttrSalle(e.target.value)
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="grid gap-1">
                                  <Label>
                                    Saisie assistée (Début / Fin par pas de 30
                                    min)
                                  </Label>
                                  <div className="flex gap-2 items-center">
                                    <Select
                                      onValueChange={(startVal) => {
                                        const endVal =
                                          attrHeure.split("-")[1]?.trim() ||
                                          "10:00";
                                        setAttrHeure(`${startVal} - ${endVal}`);
                                      }}
                                    >
                                      <SelectTrigger className="w-full text-xs h-9">
                                        <SelectValue placeholder="Début" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {[
                                          "07:00",
                                          "07:30",
                                          "08:00",
                                          "08:30",
                                          "09:00",
                                          "09:30",
                                          "10:00",
                                          "10:30",
                                          "11:00",
                                          "11:30",
                                          "12:00",
                                          "12:30",
                                          "13:00",
                                          "13:30",
                                          "14:00",
                                          "14:30",
                                          "15:00",
                                          "15:30",
                                          "16:00",
                                          "16:30",
                                          "17:00",
                                          "17:30",
                                          "18:00",
                                        ].map((t) => (
                                          <SelectItem key={t} value={t}>
                                            {t}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <span className="text-muted-foreground text-xs">
                                      à
                                    </span>
                                    <Select
                                      onValueChange={(endVal) => {
                                        const startVal =
                                          attrHeure.split("-")[0]?.trim() ||
                                          "08:00";
                                        setAttrHeure(`${startVal} - ${endVal}`);
                                      }}
                                    >
                                      <SelectTrigger className="w-full text-xs h-9">
                                        <SelectValue placeholder="Fin" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {[
                                          "07:30",
                                          "08:00",
                                          "08:30",
                                          "09:00",
                                          "09:30",
                                          "10:00",
                                          "10:30",
                                          "11:00",
                                          "11:30",
                                          "12:00",
                                          "12:30",
                                          "13:00",
                                          "13:30",
                                          "14:00",
                                          "14:30",
                                          "15:00",
                                          "15:30",
                                          "16:00",
                                          "16:30",
                                          "17:00",
                                          "17:30",
                                          "18:00",
                                          "18:30",
                                        ].map((t) => (
                                          <SelectItem key={t} value={t}>
                                            {t}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="grid gap-1">
                                    <Label>Groupe ciblé</Label>
                                    <Select
                                      value={attrGroupe}
                                      onValueChange={setAttrGroupe}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Choisir le groupe" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Classe entière">
                                          Classe entière
                                        </SelectItem>
                                        <SelectItem value="Garçons">
                                          Garçons
                                        </SelectItem>
                                        <SelectItem value="Filles">
                                          Filles
                                        </SelectItem>
                                        <SelectItem value="Espagnol">
                                          Espagnol (LV2)
                                        </SelectItem>
                                        <SelectItem value="Allemand">
                                          Allemand (LV2)
                                        </SelectItem>
                                        <SelectItem value="Autre">
                                          Autre (Saisie libre)
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {attrGroupe === "Autre" && (
                                    <div className="grid gap-1">
                                      <Label htmlFor="customGroupe">
                                        Nom du groupe
                                      </Label>
                                      <Input
                                        id="customGroupe"
                                        placeholder="Nom du groupe"
                                        value={customGroupe}
                                        onChange={(e) =>
                                          setCustomGroupe(e.target.value)
                                        }
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setCreateAttrOpen(false)}
                                >
                                  Annuler
                                </Button>
                                <Button onClick={handleCreateAttribution}>
                                  Valider
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <DataTable
                          columns={[
                            {
                              key: "classe_id",
                              label: "Classe",
                              sortable: true,
                              render: (val: any) => {
                                const cl = classesList.find(
                                  (c) => String(c.id) === String(val),
                                );
                                return cl ? cl.name : "Inconnue";
                              },
                            },
                            {
                              key: "enseignant_id",
                              label: "Enseignant",
                              sortable: true,
                              render: (val: any) => {
                                const t = staffList.find(
                                  (s) => String(s.id) === String(val),
                                );
                                return t
                                  ? `${formatStudentName(t)}`
                                  : "Inconnu";
                              },
                            },
                            {
                              key: "matiere_id",
                              label: "Matière",
                              sortable: true,
                              render: (val: any) => {
                                const m = (
                                  subjectsList.length > 0
                                    ? subjectsList
                                    : matieres
                                ).find(
                                  (subj) => String(subj.id) === String(val),
                                );
                                if (!m) return "Inconnue";
                                const parent = m.parent_id
                                  ? (subjectsList.length > 0
                                      ? subjectsList
                                      : matieres
                                    ).find(
                                      (p) =>
                                        String(p.id) === String(m.parent_id),
                                    )
                                  : null;
                                const isRel = isReligiousSubject(
                                  m.code,
                                  m.libelle,
                                );
                                return (
                                  <span className="flex items-center gap-2">
                                    <Badge
                                      variant="secondary"
                                      className={
                                        isRel
                                          ? "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                          : ""
                                      }
                                    >
                                      {parent
                                        ? `${parent.libelle} (${m.libelle})`
                                        : m.libelle}
                                    </Badge>
                                    {isRel && (
                                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] font-bold">
                                        Religieux
                                      </Badge>
                                    )}
                                  </span>
                                );
                              },
                            },
                            {
                              key: "groupe",
                              label: "Groupe ciblé",
                              sortable: true,
                              render: (val: any) => (
                                <Badge
                                  variant={
                                    val && val !== "Classe entière"
                                      ? "secondary"
                                      : "outline"
                                  }
                                  className="text-xs"
                                >
                                  {val || "Classe entière"}
                                </Badge>
                              ),
                            },
                            { key: "jour", label: "Jour", sortable: true },
                            { key: "heure", label: "Heure", sortable: true },
                            { key: "salle", label: "Salle", sortable: true },
                            {
                              key: "actions",
                              label: "Actions",
                              render: (val: any, row: any) => (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteAttribution(row.id)
                                  }
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              ),
                            },
                          ]}
                          data={attributionsList}
                          searchable={true}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* ─── Attribution des Niveaux & Cycles aux Éducateurs ─── */}
                  <AccordionItem value="attributions-educateurs">
                    <AccordionTrigger className="text-lg font-semibold">
                      Attribution des niveaux aux éducateurs
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-4 space-y-4">
                        <div className="flex justify-end">
                          <Dialog open={attrEdOpen} onOpenChange={(v) => {
                            setAttrEdOpen(v);
                            if (!v) {
                              setAttrEdSelectedEds([]);
                              setAttrEdSelectedCycles([]);
                              setAttrEdSelectedNiveaux([]);
                              setAttrEdEcoleId("");
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button size="sm" className="gap-2">
                                <Plus className="h-4 w-4" />
                                Nouvelle attribution par niveaux
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[560px]">
                              <DialogHeader>
                                <DialogTitle>Attribuer des niveaux à un éducateur</DialogTitle>
                                <DialogDescription>
                                  Sélectionnez un ou plusieurs éducateurs puis les cycles/niveaux qu'ils peuvent consulter.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-1">
                                {/* Sélection éducateurs */}
                                <div className="grid gap-2">
                                  <Label className="font-semibold">Éducateurs</Label>
                                  <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                                    {staffList.filter(s => s.fonction === "educateur").length === 0 && (
                                      <p className="text-sm text-muted-foreground p-2">Aucun éducateur trouvé.</p>
                                    )}
                                    {staffList.filter(s => s.fonction === "educateur").map(ed => (
                                      <label key={ed.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50">
                                        <input
                                          type="checkbox"
                                          checked={attrEdSelectedEds.includes(Number(ed.id))}
                                          onChange={e => {
                                            const id = Number(ed.id);
                                            setAttrEdSelectedEds(prev =>
                                              e.target.checked ? [...prev, id] : prev.filter(x => x !== id)
                                            );
                                          }}
                                          className="h-4 w-4 rounded"
                                        />
                                        <span className="text-sm flex-1">{ed.nom} {ed.prenom}</span>
                                        <span className="text-xs text-muted-foreground">{ed.email}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>

                                {/* Sélection Cycles */}
                                <div className="grid gap-2">
                                  <Label className="font-semibold">Cycles</Label>
                                  <div className="flex flex-wrap gap-2">
                                    {cyclesList.map(cy => (
                                      <button
                                        key={cy.id}
                                        type="button"
                                        onClick={() => {
                                          const id = Number(cy.id);
                                          setAttrEdSelectedCycles(prev =>
                                            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                                          );
                                        }}
                                        className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                                          attrEdSelectedCycles.includes(Number(cy.id))
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-background border-border hover:bg-muted"
                                        }`}
                                      >
                                        {cy.libelle}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Sélection Niveaux (optionnel) */}
                                <div className="grid gap-2">
                                  <Label className="font-semibold">
                                    Niveaux spécifiques <span className="text-muted-foreground font-normal">(optionnel)</span>
                                  </Label>
                                  <div className="flex flex-wrap gap-2">
                                    {levelsList
                                      .filter(lv => attrEdSelectedCycles.length === 0 || attrEdSelectedCycles.includes(Number(lv.cycle_id)))
                                      .map(lv => (
                                        <button
                                          key={lv.id}
                                          type="button"
                                          onClick={() => {
                                            const id = Number(lv.id);
                                            setAttrEdSelectedNiveaux(prev =>
                                              prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                                            );
                                          }}
                                          className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                                            attrEdSelectedNiveaux.includes(Number(lv.id))
                                              ? "bg-secondary text-secondary-foreground border-secondary"
                                              : "bg-background border-border hover:bg-muted"
                                          }`}
                                        >
                                          {lv.libelle}
                                        </button>
                                      ))}
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-2">
                                <Button variant="outline" onClick={() => setAttrEdOpen(false)}>Annuler</Button>
                                <Button
                                  disabled={attrEdLoading || attrEdSelectedEds.length === 0 || (attrEdSelectedCycles.length === 0 && attrEdSelectedNiveaux.length === 0)}
                                  onClick={async () => {
                                    setAttrEdLoading(true);
                                    try {
                                      await apiClient.assignEducateurNiveaux({
                                        educateur_ids: attrEdSelectedEds,
                                        cycle_ids: attrEdSelectedCycles.length > 0 ? attrEdSelectedCycles : undefined,
                                        niveau_ids: attrEdSelectedNiveaux.length > 0 ? attrEdSelectedNiveaux : undefined,
                                      });
                                      toast({ title: "Attribution réussie", description: "Les niveaux ont été attribués aux éducateurs." });
                                      const updated = await apiClient.getAttributionsEducateurs();
                                      setAttrEdList(updated || []);
                                      setAttrEdOpen(false);
                                    } catch (err: any) {
                                      toast({ variant: "destructive", title: "Erreur", description: err?.response?.data?.detail || "Impossible d'enregistrer l'attribution." });
                                    } finally {
                                      setAttrEdLoading(false);
                                    }
                                  }}
                                >
                                  {attrEdLoading ? "Enregistrement…" : "Attribuer"}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>

                        {/* Tableau des attributions actuelles */}
                        {attrEdList.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Aucune attribution enregistrée. Les éducateurs voient toutes les classes par défaut.
                          </p>
                        ) : (
                          <div className="border rounded-md divide-y">
                            {/* Grouper par éducateur */}
                            {Object.entries(
                              attrEdList.reduce((acc: Record<string, any[]>, a: any) => {
                                const key = String(a.educateur_id);
                                if (!acc[key]) acc[key] = [];
                                acc[key].push(a);
                                return acc;
                              }, {})
                            ).map(([edId, rows]: [string, any[]]) => {
                              const first = rows[0];
                              const edName = (() => {
                                const st = staffList.find(s => String(s.id) === edId);
                                return st ? `${st.nom || ""} ${st.prenom || ""}`.trim() : `Éducateur #${edId}`;
                              })();
                              return (
                                <div key={edId} className="p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <span className="font-medium text-sm">{edName}</span>
                                      {first.code_etablissement && (
                                        <span className="ml-2 text-xs text-muted-foreground">{first.code_etablissement}</span>
                                      )}
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="h-7 text-xs gap-1"
                                      onClick={async () => {
                                        if (!confirm(`Révoquer toutes les attributions de ${edName} ?`)) return;
                                        try {
                                          await apiClient.deleteEducateurAttributions(Number(edId));
                                          toast({ title: "Attributions révoquées" });
                                          const updated = await apiClient.getAttributionsEducateurs();
                                          setAttrEdList(updated || []);
                                        } catch {
                                          toast({ variant: "destructive", title: "Erreur", description: "Impossible de révoquer." });
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" /> Tout révoquer
                                    </Button>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {rows.map((row: any) => (
                                      <Badge
                                        key={row.id}
                                        variant="secondary"
                                        className="gap-1 text-xs cursor-pointer hover:bg-destructive/20"
                                        onClick={async () => {
                                          if (!confirm(`Supprimer "${row.cycle_libelle || ""}${row.niveau_libelle ? " › " + row.niveau_libelle : ""}" ?`)) return;
                                          try {
                                            await apiClient.deleteAttributionEducateur(row.id);
                                            const updated = await apiClient.getAttributionsEducateurs();
                                            setAttrEdList(updated || []);
                                          } catch {
                                            toast({ variant: "destructive", title: "Erreur de suppression" });
                                          }
                                        }}
                                      >
                                        {row.cycle_libelle}
                                        {row.niveau_libelle ? ` › ${row.niveau_libelle}` : ""}
                                        <span className="text-muted-foreground ml-1">×</span>
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="frais">

                    <AccordionTrigger className="text-lg font-semibold">
                      Types de frais
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-4">
                        <DataTable
                          columns={referenceColumns}
                          data={typesFrais}
                          searchable={false}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="absences">
                    <AccordionTrigger className="text-lg font-semibold">
                      Motifs d'absence
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-4">
                        <DataTable
                          columns={referenceColumns}
                          data={motifsAbsence}
                          searchable={false}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="sanctions">
                    <AccordionTrigger className="text-lg font-semibold">
                      Sanctions disciplinaires
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-4">
                        <DataTable
                          columns={referenceColumns}
                          data={sanctions}
                          searchable={false}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="fonctions">
                    <AccordionTrigger className="text-lg font-semibold">
                      Fonctions RH
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-4">
                        <DataTable
                          columns={referenceColumns}
                          data={fonctionsRH}
                          searchable={false}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="sourates">
                    <AccordionTrigger className="text-lg font-semibold">
                      Sourates du Coran
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-4">
                        <DataTable
                          columns={referenceColumns}
                          data={sourates}
                          searchable={false}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SALLES ── */}
          <TabsContent value="salles" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <DoorOpen className="h-5 w-5 text-primary" />
                      Gestion des salles
                    </CardTitle>
                    <CardDescription>
                      Salles de classe, laboratoires, salles spécialisées —{" "}
                      {sallesList.length} salle(s) enregistrée(s)
                    </CardDescription>
                  </div>
                  <Dialog
                    open={createSalleOpen}
                    onOpenChange={setCreateSalleOpen}
                  >
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Ajouter une salle
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[560px]">
                      <DialogHeader>
                        <DialogTitle>Nouvelle salle</DialogTitle>
                        <DialogDescription>
                          Renseignez les informations de la salle à créer.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-4 py-4 max-h-[65vh] overflow-y-auto px-1">
                        <div className="space-y-1">
                          <Label htmlFor="salle-code">Code *</Label>
                          <Input
                            id="salle-code"
                            placeholder="ex: S101"
                            value={salleCode}
                            onChange={(e) => setSalleCode(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="salle-libelle">Libellé *</Label>
                          <Input
                            id="salle-libelle"
                            placeholder="ex: Salle 101"
                            value={salleLibelle}
                            onChange={(e) => setSalleLibelle(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Type de salle</Label>
                          <Select
                            value={salleType}
                            onValueChange={setSalleType}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="classe">
                                Salle de classe
                              </SelectItem>
                              <SelectItem value="laboratoire">
                                Laboratoire
                              </SelectItem>
                              <SelectItem value="salle_priere">
                                Salle de prière
                              </SelectItem>
                              <SelectItem value="bureau">Bureau</SelectItem>
                              <SelectItem value="polyvalente">
                                Salle polyvalente
                              </SelectItem>
                              <SelectItem value="informatique">
                                Salle informatique
                              </SelectItem>
                              <SelectItem value="autre">Autre</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="salle-capacite">
                            Capacité (élèves)
                          </Label>
                          <Input
                            id="salle-capacite"
                            type="number"
                            min={1}
                            value={salleCapacite}
                            onChange={(e) =>
                              setSalleCapacite(Number(e.target.value))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="salle-etage">Étage (0 = RDC)</Label>
                          <Input
                            id="salle-etage"
                            type="number"
                            min={0}
                            value={salleEtage}
                            onChange={(e) =>
                              setSalleEtage(Number(e.target.value))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="salle-batiment">Bâtiment</Label>
                          <Input
                            id="salle-batiment"
                            placeholder="ex: Bâtiment A"
                            value={salleBatiment}
                            onChange={(e) => setSalleBatiment(e.target.value)}
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label>Établissement</Label>
                          <Select
                            value={salleEcoleId}
                            onValueChange={setSalleEcoleId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Tous les établissements" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                Aucun établissement
                              </SelectItem>
                              {schoolsList.map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label htmlFor="salle-desc">Description</Label>
                          <Input
                            id="salle-desc"
                            placeholder="Observations, équipements..."
                            value={salleDescription}
                            onChange={(e) =>
                              setSalleDescription(e.target.value)
                            }
                          />
                        </div>
                        <div className="col-span-2 flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="salle-dispo"
                            checked={salleDisponible}
                            onChange={(e) =>
                              setSalleDisponible(e.target.checked)
                            }
                            className="h-4 w-4"
                          />
                          <Label htmlFor="salle-dispo">Salle disponible</Label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            resetSalleForm();
                            setCreateSalleOpen(false);
                          }}
                        >
                          Annuler
                        </Button>
                        <Button onClick={handleCreateSalle}>
                          Créer la salle
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {sallesList.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <DoorOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">
                      Aucune salle enregistrée
                    </p>
                    <p className="text-sm mt-1">
                      Cliquez sur «&nbsp;Ajouter une salle&nbsp;» pour
                      commencer.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border bg-muted/40">
                        <tr>
                          <th className="text-left p-3 font-semibold">Code</th>
                          <th className="text-left p-3 font-semibold">
                            Libellé
                          </th>
                          <th className="text-left p-3 font-semibold">Type</th>
                          <th className="text-left p-3 font-semibold">
                            Capacité
                          </th>
                          <th className="text-left p-3 font-semibold">Étage</th>
                          <th className="text-left p-3 font-semibold">
                            Bâtiment
                          </th>
                          <th className="text-left p-3 font-semibold">
                            Établissement
                          </th>
                          <th className="text-left p-3 font-semibold">
                            Statut
                          </th>
                          <th className="p-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sallesList.map((salle) => {
                          const sch = schoolsList.find(
                            (s) => String(s.id) === String(salle.ecole_id),
                          );
                          const typeLabels: Record<string, string> = {
                            classe: "Classe",
                            laboratoire: "Labo",
                            salle_priere: "Prière",
                            bureau: "Bureau",
                            polyvalente: "Polyvalente",
                            informatique: "Informatique",
                            autre: "Autre",
                          };
                          return (
                            <tr
                              key={salle.id}
                              className="border-b border-border hover:bg-muted/30 transition-colors"
                            >
                              <td className="p-3 font-mono font-semibold text-primary">
                                {salle.code}
                              </td>
                              <td className="p-3 font-medium">
                                {salle.libelle}
                              </td>
                              <td className="p-3">
                                <Badge variant="secondary">
                                  {typeLabels[salle.type_salle] ||
                                    salle.type_salle}
                                </Badge>
                              </td>
                              <td className="p-3 text-center">
                                {salle.capacite}
                              </td>
                              <td className="p-3 text-center">
                                {salle.etage === 0 ? "RDC" : `${salle.etage}er`}
                              </td>
                              <td className="p-3 text-muted-foreground">
                                {salle.batiment || "—"}
                              </td>
                              <td className="p-3 text-sm text-muted-foreground">
                                {sch
                                  ? sch.name.replace(
                                      "École Confessionnelle HINNEH ",
                                      "",
                                    )
                                  : "—"}
                              </td>
                              <td className="p-3">
                                <Badge
                                  variant={
                                    salle.disponible ? "default" : "outline"
                                  }
                                >
                                  {salle.disponible
                                    ? "Disponible"
                                    : "Indisponible"}
                                </Badge>
                              </td>
                              <td className="p-3">
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenEditSalle(salle)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSalleToEdit(salle);
                                      setDeleteSalleOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emplois" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Planificateur d'emploi du temps intelligent
                </CardTitle>
                <CardDescription>
                  Gégez les disponibilités des enseignants et générez des
                  suggestions d'horaires sans conflits.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="auto_generateur" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-4 max-w-[850px]">
                    <TabsTrigger value="auto_generateur" className="gap-2 font-bold text-indigo-700 dark:text-indigo-300">
                      <Wand2 className="h-4 w-4" />
                      Générateur & Attribution par Classe
                    </TabsTrigger>
                    <TabsTrigger value="suggestions" className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      Moteur de suggestions
                    </TabsTrigger>
                    <TabsTrigger value="vue_impression" className="gap-2">
                      <Printer className="h-4 w-4" />
                      Visualisation & Impression
                    </TabsTrigger>
                    <TabsTrigger value="dispos" className="gap-2">
                      <Clock className="h-4 w-4" />
                      Disponibilités des profs
                    </TabsTrigger>
                  </TabsList>

                  {/* ──────────────── TABS: GÉNÉRATEUR & ATTRIBUTION PAR CLASSE ──────────────── */}
                  <TabsContent value="auto_generateur" className="space-y-4 pt-2">
                    <ClassTimetableManager
                      classes={classesList}
                      staff={staffList}
                      subjects={subjectsList.length > 0 ? subjectsList : matieres}
                      attributions={attributionsList}
                      schools={schoolsList}
                      selectedSchoolId={selectedSchoolId}
                      selectedCityFilter={selectedCityFilter}
                      onAttributionsUpdated={async () => {
                        try {
                          const updated = await apiClient.getAttributions();
                          setAttributionsList(updated || []);
                        } catch (e) {
                          console.error("Failed to refresh attributions", e);
                        }
                      }}
                    />
                  </TabsContent>

                  {/* ──────────────── TABS: SUGGESTIONS ──────────────── */}
                  <TabsContent value="suggestions" className="space-y-4 pt-2">
                    <div className="grid md:grid-cols-6 gap-4 p-4 bg-muted/40 rounded-xl border">
                      <div className="space-y-1">
                        <Label>Classe</Label>
                        <Select
                          value={suggClasseId}
                          onValueChange={setSuggClasseId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner la classe" />
                          </SelectTrigger>
                          <SelectContent>
                            {classesList.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label>Durée du cours</Label>
                        <Select value={suggDuree} onValueChange={setSuggDuree}>
                          <SelectTrigger>
                            <SelectValue placeholder="Durée" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30m">30 minutes</SelectItem>
                            <SelectItem value="1h">1 heure</SelectItem>
                            <SelectItem value="1.5h">1 h 30 min</SelectItem>
                            <SelectItem value="2h">2 heures</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label>Matière</Label>
                        <Select
                          value={suggMatiereId}
                          onValueChange={setSuggMatiereId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner la matière" />
                          </SelectTrigger>
                          <SelectContent>
                            {(subjectsList.length > 0
                              ? subjectsList
                              : matieres
                            ).map((m) => {
                              const parent = m.parent_id
                                ? (subjectsList.length > 0
                                    ? subjectsList
                                    : matieres
                                  ).find(
                                    (p) => String(p.id) === String(m.parent_id),
                                  )
                                : null;
                              return (
                                <SelectItem key={m.id} value={String(m.id)}>
                                  {parent
                                    ? `${parent.libelle} - ${m.libelle}`
                                    : m.libelle}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label>Groupe ciblé</Label>
                        <Select
                          value={suggGroupe}
                          onValueChange={setSuggGroupe}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Groupe" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Classe entière">
                              Classe entière
                            </SelectItem>
                            <SelectItem value="Garçons">Garçons</SelectItem>
                            <SelectItem value="Filles">Filles</SelectItem>
                            <SelectItem value="Espagnol">
                              Espagnol (LV2)
                            </SelectItem>
                            <SelectItem value="Allemand">
                              Allemand (LV2)
                            </SelectItem>
                            <SelectItem value="Autre">
                              Autre (Saisie libre)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {suggGroupe === "Autre" && (
                          <Input
                            className="mt-1 h-8 text-xs"
                            placeholder="Nom du groupe"
                            value={suggCustomGroupe}
                            onChange={(e) =>
                              setSuggCustomGroupe(e.target.value)
                            }
                          />
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label>Jour</Label>
                        <Select value={suggJour} onValueChange={setSuggJour}>
                          <SelectTrigger>
                            <SelectValue placeholder="Jour" />
                          </SelectTrigger>
                          <SelectContent>
                            {WEEK_DAYS.map((day) => (
                              <SelectItem key={day} value={day}>
                                {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1 flex flex-col justify-between col-span-1">
                        <div>
                          <Label>Créneau horaire</Label>
                          <Select
                            value={suggHeure}
                            onValueChange={setSuggHeure}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Horaire" />
                            </SelectTrigger>
                            <SelectContent>
                              {getSlotsForDuration(suggDuree).map((slot) => (
                                <SelectItem key={slot} value={slot}>
                                  {slot}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          className="mt-2 w-full gap-2"
                          onClick={handleGenerateSuggestions}
                        >
                          <Sparkles className="h-4 w-4" />
                          Générer suggestions
                        </Button>
                      </div>
                    </div>

                    {suggestions && (
                      <div className="grid md:grid-cols-3 gap-6 pt-4">
                        {/* 1. TEACHERS SUGGESTIONS */}
                        <div className="md:col-span-2 space-y-4">
                          <h3 className="font-semibold text-lg flex items-center gap-2">
                            Enseignants recommandés
                          </h3>
                          <div className="space-y-3">
                            {suggestions.teachers.length === 0 ? (
                              <p className="text-muted-foreground text-sm">
                                Aucun enseignant trouvé.
                              </p>
                            ) : (
                              suggestions.teachers.map(
                                ({ teacher, status, detail }) => {
                                  return (
                                    <div
                                      key={teacher.id}
                                      className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                                        status === "ideal"
                                          ? "bg-green-50/50 border-green-200 hover:border-green-300"
                                          : status === "no_pref"
                                            ? "bg-amber-50/50 border-amber-200 hover:border-amber-300"
                                            : "bg-destructive/5 border-destructive/10 opacity-70"
                                      }`}
                                    >
                                      <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p className="font-semibold text-sm">
                                            {teacher.firstName}{" "}
                                            {teacher.lastName}
                                          </p>
                                          <Badge
                                            variant={
                                              status === "ideal"
                                                ? "default"
                                                : status === "no_pref"
                                                  ? "secondary"
                                                  : "destructive"
                                            }
                                            className={
                                              status === "ideal"
                                                ? "bg-green-600 hover:bg-green-700 text-white"
                                                : status === "no_pref"
                                                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                                                  : ""
                                            }
                                          >
                                            {status === "ideal"
                                              ? "Libre & Préféré"
                                              : status === "no_pref"
                                                ? "Non préféré"
                                                : "Conflit"}
                                          </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">
                                          {teacher.email}
                                        </p>
                                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                          <Info className="h-3.5 w-3.5" />
                                          {detail}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          size="sm"
                                          disabled={status === "busy"}
                                          variant={
                                            status === "ideal"
                                              ? "default"
                                              : "outline"
                                          }
                                          className={
                                            status === "ideal"
                                              ? "bg-green-600 hover:bg-green-700 text-white"
                                              : ""
                                          }
                                          onClick={() =>
                                            handleApplySuggestion(teacher.id)
                                          }
                                        >
                                          Attribuer
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                },
                              )
                            )}
                          </div>
                        </div>

                        {/* 2. SALLES SUGGESTIONS */}
                        <div className="space-y-6">
                          <div className="space-y-4">
                            <h3 className="font-semibold text-lg">
                              Occupation des Salles
                            </h3>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                              {suggestions.salles.map(
                                ({ salle, isFree, detail }) => (
                                  <div
                                    key={salle.id}
                                    className={`p-3 rounded-lg border text-sm flex items-center justify-between gap-3 ${
                                      isFree
                                        ? "border-green-200 bg-green-50/20"
                                        : "border-destructive/10 bg-destructive/5 opacity-75"
                                    }`}
                                  >
                                    <div>
                                      <p className="font-semibold">
                                        {salle.libelle} ({salle.code})
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {detail}
                                      </p>
                                    </div>
                                    <Badge
                                      variant={
                                        isFree ? "secondary" : "destructive"
                                      }
                                      className={
                                        isFree
                                          ? "bg-green-100 text-green-800"
                                          : ""
                                      }
                                    >
                                      {isFree ? "Libre" : "Occupée"}
                                    </Badge>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>

                          {/* 3. ALTERNATIVE SLOTS SUGGESTIONS */}
                          <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                              Créneaux alternatifs libres
                            </h3>
                            <div className="space-y-2">
                              {suggestions.alternatives.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  Aucun créneau alternatif idéal trouvé.
                                </p>
                              ) : (
                                suggestions.alternatives.map((alt, i) => (
                                  <div
                                    key={i}
                                    className="p-3 border rounded-xl bg-primary/5 border-primary/20 flex flex-col gap-1.5"
                                  >
                                    <div className="flex items-center justify-between">
                                      <p className="font-medium text-sm text-primary">
                                        {alt.day} {alt.slot}
                                      </p>
                                      <Badge
                                        variant="outline"
                                        className="border-primary/30 text-primary"
                                      >
                                        Dispo
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Prof libre : {alt.teacher.firstName}{" "}
                                      {alt.teacher.lastName}
                                    </p>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs justify-start px-0 text-primary hover:text-primary/80"
                                      onClick={() => {
                                        setSuggJour(alt.day);
                                        setSuggHeure(alt.slot);
                                        toast({
                                          title: "Horaire changé",
                                          description: `Horaire changé pour ${alt.day} ${alt.slot}. Cliquez sur "Générer suggestions" pour re-analyser.`,
                                        });
                                      }}
                                    >
                                      Utiliser cet horaire
                                    </Button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* ──────────────── TABS: VISUALISATION & IMPRESSION ──────────────── */}
                  <TabsContent
                    value="vue_impression"
                    className="space-y-4 pt-2"
                  >
                    <div className="flex flex-col md:flex-row gap-4 items-end bg-muted/40 p-4 rounded-xl border">
                      <div className="space-y-1 w-52">
                        <Label>Type d'Emploi du Temps</Label>
                        <Select
                          value={printTimetableMode}
                          onValueChange={(val: any) =>
                            setPrintTimetableMode(val)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="classe">Par Classe</SelectItem>
                            <SelectItem value="enseignant">
                              Par Enseignant
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {printTimetableMode === "classe" ? (
                        <div className="space-y-1 flex-1">
                          <Label>Sélectionner la Classe</Label>
                          <Select
                            value={printSelectedClassId}
                            onValueChange={setPrintSelectedClassId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir une classe..." />
                            </SelectTrigger>
                            <SelectContent>
                              {classesList.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                  {c.name || c.CE_LIBELLE}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="space-y-1 flex-1">
                          <Label>Sélectionner l'Enseignant</Label>
                          <Select
                            value={printSelectedTeacherId}
                            onValueChange={setPrintSelectedTeacherId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir un enseignant..." />
                            </SelectTrigger>
                            <SelectContent>
                              {staffList
                                .filter(
                                  (s) =>
                                    s.fonction === "enseignant" ||
                                    s.fonction === "coranique",
                                )
                                .map((t) => (
                                  <SelectItem key={t.id} value={String(t.id)}>
                                    {formatStudentName(t)} ({t.fonction})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <Button
                        className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                        disabled={
                          printTimetableMode === "classe"
                            ? !printSelectedClassId
                            : !printSelectedTeacherId
                        }
                        onClick={() => {
                          const selectedClassObj = classesList.find((c) => String(c.id) === printSelectedClassId);
                          const selectedTeacherObj = staffList.find((s) => String(s.id) === printSelectedTeacherId);
                          const targetSchool = (() => {
                            if (printTimetableMode === "classe" && selectedClassObj) {
                              const sch = schoolsList.find((s) => String(s.id || s.IDETABLISSEMENT) === String(selectedClassObj.schoolId || selectedClassObj.ecole_id) || String(s.code || s.ET_CODEETABLISSEMENT) === String(selectedClassObj.ET_CODEETABLISSEMENT || selectedClassObj.schoolCode));
                              if (sch) return sch;
                            }
                            if (printTimetableMode === "enseignant" && selectedTeacherObj) {
                              const sch = schoolsList.find((s) => String(s.id || s.IDETABLISSEMENT) === String(selectedTeacherObj.schoolId || selectedTeacherObj.ecole_id));
                              if (sch) return sch;
                            }
                            const realSchool = schoolsList.find((s) => !s.name?.toLowerCase().includes("fondation"));
                            return realSchool || schoolsList[0];
                          })();

                          const title =
                            printTimetableMode === "classe"
                              ? `Emploi du temps - ${selectedClassObj?.name || selectedClassObj?.CE_LIBELLE || "Classe"}`
                              : `Emploi du temps - ${selectedTeacherObj ? formatStudentName(selectedTeacherObj) : "Enseignant"}`;
                          
                          printSchedule(printTimetableRef.current, title, {
                            schoolName: targetSchool?.name || targetSchool?.ET_LIBELLEETABLISSEMENT || "Établissement Scolaire",
                            city: targetSchool?.city || targetSchool?.ET_VILLE || "Abidjan",
                            name: printTimetableMode === "classe" ? `Classe ${selectedClassObj?.name || selectedClassObj?.CE_LIBELLE}` : (selectedTeacherObj ? formatStudentName(selectedTeacherObj) : "Enseignant"),
                            matiere: printTimetableMode === "classe" ? "Toutes disciplines" : (selectedTeacherObj?.matiere || "Enseignement"),
                            classeName: printTimetableMode === "classe" ? (selectedClassObj?.name || selectedClassObj?.CE_LIBELLE) : undefined,
                            anneeScolaire: "2026-2027"
                          });
                        }}
                      >
                        <Printer className="h-4 w-4" />
                        Imprimer l'emploi du temps
                      </Button>
                    </div>

                    {/* APERÇU / GRILLE D'IMPRESSION */}
                    {(
                      printTimetableMode === "classe"
                        ? printSelectedClassId
                        : printSelectedTeacherId
                    ) ? (
                      (() => {
                        const selectedClassObj = classesList.find(
                          (c) => String(c.id) === printSelectedClassId,
                        );
                        const selectedTeacherObj = staffList.find(
                          (s) => String(s.id) === printSelectedTeacherId,
                        );

                        const targetSchool = (() => {
                          if (
                            printTimetableMode === "classe" &&
                            selectedClassObj
                          ) {
                            const sch = schoolsList.find(
                              (s) =>
                                String(s.id) ===
                                String(
                                  selectedClassObj.schoolId ||
                                    selectedClassObj.ecole_id,
                                ),
                            );
                            if (
                              sch &&
                              !sch.name?.toLowerCase().includes("fondation")
                            )
                              return sch;
                            if (sch) return sch;
                          }
                          if (
                            printTimetableMode === "enseignant" &&
                            selectedTeacherObj
                          ) {
                            const sch = schoolsList.find(
                              (s) =>
                                String(s.id) ===
                                String(
                                  selectedTeacherObj.schoolId ||
                                    selectedTeacherObj.ecole_id,
                                ),
                            );
                            if (
                              sch &&
                              !sch.name?.toLowerCase().includes("fondation")
                            )
                              return sch;
                            if (sch) return sch;
                          }
                          const user = apiClient.getCurrentUser?.();
                          const userSch = schoolsList.find(
                            (s) => String(s.id) === String(user?.ecole_id),
                          );
                          if (
                            userSch &&
                            !userSch.name?.toLowerCase().includes("fondation")
                          )
                            return userSch;
                          const realSchool = schoolsList.find(
                            (s) => !s.name?.toLowerCase().includes("fondation"),
                          );
                          return realSchool || schoolsList[0];
                        })();

                        return (
                          <Card className="border shadow-sm">
                            <CardContent className="p-6">
                              <div
                                ref={printTimetableRef}
                                className="space-y-6 bg-white p-6 rounded-xl border border-gray-200"
                              >
                                {/* EN-TÊTE IMPRESSION OFFICIEL */}
                                <div className="flex items-center justify-between border-b pb-4">
                                  <div className="flex items-center gap-3">
                                    {targetSchool?.logo ? (
                                      <img
                                        src={targetSchool.logo}
                                        alt="Logo"
                                        className="h-14 w-14 object-contain"
                                      />
                                    ) : (
                                      <div className="h-12 w-12 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xl">
                                        {targetSchool?.name?.charAt(0) || "E"}
                                      </div>
                                    )}
                                    <div>
                                      <h2 className="text-lg font-bold uppercase tracking-tight text-gray-900">
                                        {targetSchool?.name ||
                                          "ÉTABLISSEMENT SCOLAIRE"}
                                      </h2>
                                      <p className="text-xs text-gray-500 font-medium">
                                        {targetSchool?.city || "Abidjan"} —
                                        Contacts :{" "}
                                        {targetSchool?.contacts ||
                                          targetSchool?.phone ||
                                          "N/A"}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <Badge
                                      variant="outline"
                                      className="text-xs uppercase px-3 py-1 font-bold border-indigo-300 text-indigo-800 bg-indigo-50"
                                    >
                                      {printTimetableMode === "classe"
                                        ? `Emploi du Temps — ${selectedClassObj?.name || "Classe"}`
                                        : `Emploi du Temps Professeur — ${selectedTeacherObj?.lastName || ""} ${selectedTeacherObj?.firstName || ""}`}
                                    </Badge>
                                    <p className="text-xs text-gray-400 mt-1">
                                      Année Scolaire : 2025-2026
                                    </p>
                                  </div>
                                </div>

                                {/* GRILLE HEBDOMADAIRE */}
                                <div className="overflow-x-auto">
                                  <table className="w-full border-collapse text-xs border border-gray-300">
                                    <thead>
                                      <tr className="bg-gray-100 border-b border-gray-300 text-gray-700">
                                        <th className="p-2.5 border-r border-gray-300 font-bold w-24 text-center bg-gray-200">
                                          Horaires
                                        </th>
                                        {[
                                          "Lundi",
                                          "Mardi",
                                          "Mercredi",
                                          "Jeudi",
                                          "Vendredi",
                                          "Samedi",
                                        ].map((j) => (
                                          <th
                                            key={j}
                                            className="p-2.5 border-r border-gray-300 font-bold text-center uppercase tracking-wide"
                                          >
                                            {j}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {[
                                        "07:30 - 08:30",
                                        "08:30 - 09:30",
                                        "09:30 - 10:30",
                                        "10:30 - 11:30",
                                        "11:30 - 12:30",
                                        "14:30 - 15:30",
                                        "15:30 - 16:30",
                                        "16:30 - 17:30",
                                      ].map((slot) => (
                                        <tr
                                          key={slot}
                                          className="border-b border-gray-300 h-16"
                                        >
                                          <td className="p-2 border-r border-gray-300 font-mono font-semibold text-center text-gray-600 bg-gray-50 text-[11px]">
                                            {slot}
                                          </td>
                                          {[
                                            "Lundi",
                                            "Mardi",
                                            "Mercredi",
                                            "Jeudi",
                                            "Vendredi",
                                            "Samedi",
                                          ].map((day) => {
                                            let matchedAttributions: any[] = [];
                                            if (
                                              printTimetableMode === "classe"
                                            ) {
                                              matchedAttributions =
                                                attributionsList.filter(
                                                  (a) =>
                                                    String(a.classe_id) ===
                                                      printSelectedClassId &&
                                                    a.jour?.toLowerCase() ===
                                                      day.toLowerCase() &&
                                                    (a.heure === slot ||
                                                      a.heure?.includes(
                                                        slot.split(" - ")[0],
                                                      )),
                                                );
                                            } else {
                                              matchedAttributions =
                                                attributionsList.filter(
                                                  (a) =>
                                                    String(a.enseignant_id) ===
                                                      printSelectedTeacherId &&
                                                    a.jour?.toLowerCase() ===
                                                      day.toLowerCase() &&
                                                    (a.heure === slot ||
                                                      a.heure?.includes(
                                                        slot.split(" - ")[0],
                                                      )),
                                                );
                                            }

                                            return (
                                              <td
                                                key={day}
                                                className="p-1 border-r border-gray-300 align-top h-16 bg-white text-center"
                                              >
                                                {matchedAttributions.length >
                                                0 ? (
                                                  matchedAttributions.map(
                                                    (attr) => {
                                                      const subj =
                                                        subjectsList.find(
                                                          (s) =>
                                                            String(s.id) ===
                                                            String(
                                                              attr.matiere_id,
                                                            ),
                                                        );
                                                      const teacher =
                                                        staffList.find(
                                                          (s) =>
                                                            String(s.id) ===
                                                            String(
                                                              attr.enseignant_id,
                                                            ),
                                                        );
                                                      const cls =
                                                        classesList.find(
                                                          (c) =>
                                                            String(c.id) ===
                                                            String(
                                                              attr.classe_id,
                                                            ),
                                                        );
                                                      return (
                                                        <div
                                                          key={attr.id}
                                                          className="p-1.5 rounded border border-indigo-200 bg-indigo-50/70 text-indigo-950 font-medium text-[11px] leading-tight space-y-0.5 shadow-2xs"
                                                        >
                                                          <p className="font-bold text-indigo-900">
                                                            {subj?.libelle ||
                                                              "Matière"}
                                                          </p>
                                                          {printTimetableMode ===
                                                          "classe" ? (
                                                            <p className="text-[10px] text-indigo-700 italic">
                                                              {teacher
                                                                ? `${formatStudentName(teacher)}`
                                                                : ""}
                                                            </p>
                                                          ) : (
                                                            <p className="text-[10px] text-indigo-700 font-semibold">
                                                              {cls?.name ||
                                                                cls?.CE_LIBELLE}
                                                            </p>
                                                          )}
                                                          {attr.salle && (
                                                            <p className="text-[9px] text-gray-500 font-mono">
                                                              Salle:{" "}
                                                              {attr.salle}
                                                            </p>
                                                          )}
                                                        </div>
                                                      );
                                                    },
                                                  )
                                                ) : (
                                                  <span className="text-[10px] text-gray-300 italic">
                                                    -
                                                  </span>
                                                )}
                                              </td>
                                            );
                                          })}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {/* PIED DE PAGE & SIGNATURE OFFICIELLE */}
                                <div className="flex items-end justify-between border-t pt-4 text-xs text-gray-500">
                                  <div>
                                    <p className="font-semibold text-gray-700">
                                      Fait à {targetSchool?.city || "Abidjan"},
                                      le{" "}
                                      {new Date().toLocaleDateString("fr-FR")}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                      Édité via la plateforme de gestion
                                      académique
                                    </p>
                                  </div>
                                  <div className="text-center pr-8">
                                    <p className="font-bold text-gray-800 uppercase tracking-wide">
                                      Le Chef d'Établissement
                                    </p>
                                    <div className="h-12 border-b border-gray-300 w-40 mt-1 mx-auto"></div>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                      (Signature & Cachet)
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })()
                    ) : (
                      <div className="p-12 border border-dashed rounded-xl text-center text-muted-foreground bg-muted/20">
                        <Printer className="h-10 w-10 mx-auto mb-3 text-indigo-500 opacity-70" />
                        <p className="font-semibold text-base text-gray-800">
                          Aucun emploi du temps sélectionné
                        </p>
                        <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
                          Veuillez choisir un type d'emploi du temps (
                          {printTimetableMode === "classe"
                            ? "une classe"
                            : "un enseignant"}
                          ) ci-dessus pour générer l'aperçu et lancer
                          l'impression.
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {/* ──────────────── TABS: DISPONIBILITIES ──────────────── */}
                  <TabsContent value="dispos" className="space-y-4 pt-2">
                    <div className="flex flex-col md:flex-row gap-4 items-end bg-muted/40 p-4 rounded-xl border">
                      <div className="space-y-1 flex-1">
                        <Label>Enseignant</Label>
                        <Select
                          value={selectedTeacherIdForAvail}
                          onValueChange={setSelectedTeacherIdForAvail}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un enseignant" />
                          </SelectTrigger>
                          <SelectContent>
                            {staffList
                              .filter(
                                (s) =>
                                  s.fonction === "enseignant" ||
                                  s.fonction === "coranique",
                              )
                              .map((t) => (
                                <SelectItem key={t.id} value={String(t.id)}>
                                  {formatStudentName(t)} ({t.fonction})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleBulkAvail("all")}
                          disabled={!selectedTeacherIdForAvail}
                        >
                          Tout cocher
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleBulkAvail("none")}
                          disabled={!selectedTeacherIdForAvail}
                        >
                          Tout effacer
                        </Button>
                        <Button
                          className="gap-2"
                          onClick={handleSaveTeacherAvail}
                          disabled={!selectedTeacherIdForAvail || savingAvail}
                        >
                          <Save className="h-4 w-4" />
                          {savingAvail ? "Enregistrement..." : "Sauvegarder"}
                        </Button>
                      </div>
                    </div>

                    {selectedTeacherIdForAvail ? (
                      <Card className="border-border">
                        <CardHeader className="pb-3 border-b">
                          <CardTitle className="text-base font-semibold">
                            Grille de disponibilités hebdomadaires
                          </CardTitle>
                          <CardDescription>
                            Cochez les créneaux pendant lesquels l'enseignant
                            est disponible pour donner des cours.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted/50 border-b">
                                <th className="p-3 text-left font-semibold text-muted-foreground w-[150px]">
                                  Jour
                                </th>
                                {TIME_SLOTS.map((slot) => (
                                  <th
                                    key={slot}
                                    className="p-3 text-center font-semibold text-muted-foreground"
                                  >
                                    {slot}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {WEEK_DAYS.map((day) => {
                                const activeSlots = teacherAvailMap[day] || [];
                                return (
                                  <tr
                                    key={day}
                                    className="border-b hover:bg-muted/10 transition-colors"
                                  >
                                    <td className="p-3 font-semibold text-muted-foreground bg-muted/20">
                                      {day}
                                    </td>
                                    {TIME_SLOTS.map((slot) => {
                                      const isChecked =
                                        activeSlots.includes(slot);
                                      return (
                                        <td
                                          key={slot}
                                          className="p-3 text-center"
                                        >
                                          <div className="flex items-center justify-center">
                                            <button
                                              onClick={() =>
                                                handleToggleAvail(day, slot)
                                              }
                                              className={`h-9 w-24 rounded-lg border text-xs font-medium transition-all ${
                                                isChecked
                                                  ? "bg-green-600 border-green-700 text-white shadow-sm hover:bg-green-700"
                                                  : "bg-white border-border text-muted-foreground hover:bg-muted/30"
                                              }`}
                                            >
                                              {isChecked
                                                ? "Disponible"
                                                : "Indisponible"}
                                            </button>
                                          </div>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="p-8 border border-dashed rounded-xl text-center text-muted-foreground">
                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        Veuillez sélectionner un enseignant pour afficher et
                        modifier ses disponibilités.
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <AuditLogViewer />
          </TabsContent>

          {/* ── POINTAGE PERSONNEL ── */}
          <TabsContent value="pointages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  Registre de Pointage des Enseignants &amp; Personnel
                </CardTitle>
                <CardDescription>
                  Suivi des heures d'arrivée, de départ et retards cumulés du
                  personnel scolaire.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border bg-muted/40 font-medium">
                      <tr>
                        <th className="text-left p-3 font-semibold">
                          Personnel
                        </th>
                        <th className="text-left p-3 font-semibold">Rôle</th>
                        <th className="text-left p-3 font-semibold">Date</th>
                        <th className="text-center p-3 font-semibold">
                          Heure Arrivée
                        </th>
                        <th className="text-center p-3 font-semibold">
                          Heure Départ
                        </th>
                        <th className="text-center p-3 font-semibold">
                          Statut
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {allPointages.map((p, index) => {
                        const person = staffList.find(
                          (s) => String(s.id) === String(p.personnel_id),
                        );
                        const name = person
                          ? `${formatStudentName(person)}`
                          : `Personnel #${p.personnel_id}`;
                        const role = person ? person.fonction : "Inconnu";
                        return (
                          <tr
                            key={p.id || index}
                            className="border-b border-border hover:bg-muted/20"
                          >
                            <td className="p-3 text-left font-medium">
                              {name}
                            </td>
                            <td className="p-3 text-left text-xs capitalize text-muted-foreground">
                              {role}
                            </td>
                            <td className="p-3 text-left">
                              {new Date(p.date).toLocaleDateString("fr-FR")}
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-green-600">
                              {p.heure_arrivee || "—"}
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-blue-600">
                              {p.heure_depart || "—"}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.statut === "retard" ? "bg-destructive/15 text-destructive" : "bg-green-100 text-green-800"}`}
                              >
                                {p.statut === "retard" ? "Retard" : "Présent"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {allPointages.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="text-center p-8 text-muted-foreground italic"
                          >
                            Aucun pointage enregistré.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── INSPECTION ── */}
          <TabsContent value="inspection" className="space-y-4">
            <InspectionModule staffList={staffList} classesList={classesList} />
          </TabsContent>

          {/* ── CONSEIL DE CLASSE ── */}
          <TabsContent value="conseil" className="space-y-4">
            <ConseilClasseModule
              classesList={classesList}
              staffList={staffList}
            />
          </TabsContent>

          {/* ── CHRONOGRAMME & ANNIVERSAIRES ── */}
          <TabsContent value="chronogramme" className="space-y-4">
            <ChronogrammeModule staffList={staffList} />
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Edit Salle Dialog */}
      <Dialog open={editSalleOpen} onOpenChange={setEditSalleOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Modifier la salle</DialogTitle>
            <DialogDescription>
              Modifiez les informations de la salle.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4 max-h-[65vh] overflow-y-auto px-1">
            <div className="space-y-1">
              <Label>Code *</Label>
              <Input
                value={salleCode}
                onChange={(e) => setSalleCode(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Libellé *</Label>
              <Input
                value={salleLibelle}
                onChange={(e) => setSalleLibelle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Type de salle</Label>
              <Select value={salleType} onValueChange={setSalleType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classe">Salle de classe</SelectItem>
                  <SelectItem value="laboratoire">Laboratoire</SelectItem>
                  <SelectItem value="salle_priere">Salle de prière</SelectItem>
                  <SelectItem value="bureau">Bureau</SelectItem>
                  <SelectItem value="polyvalente">Salle polyvalente</SelectItem>
                  <SelectItem value="informatique">
                    Salle informatique
                  </SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Capacité (élèves)</Label>
              <Input
                type="number"
                min={1}
                value={salleCapacite}
                onChange={(e) => setSalleCapacite(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Étage (0 = RDC)</Label>
              <Input
                type="number"
                min={0}
                value={salleEtage}
                onChange={(e) => setSalleEtage(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Bâtiment</Label>
              <Input
                value={salleBatiment}
                onChange={(e) => setSalleBatiment(e.target.value)}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Établissement</Label>
              <Select value={salleEcoleId} onValueChange={setSalleEcoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les établissements" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun établissement</SelectItem>
                  {schoolsList.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Description</Label>
              <Input
                value={salleDescription}
                onChange={(e) => setSalleDescription(e.target.value)}
              />
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <input
                type="checkbox"
                id="salle-dispo-edit"
                checked={salleDisponible}
                onChange={(e) => setSalleDisponible(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="salle-dispo-edit">Salle disponible</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditSalleOpen(false);
                setSalleToEdit(null);
                resetSalleForm();
              }}
            >
              Annuler
            </Button>
            <Button onClick={handleSaveSalle}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Salle Dialog */}
      <Dialog open={deleteSalleOpen} onOpenChange={setDeleteSalleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la salle</DialogTitle>
            <DialogDescription>
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <p className="text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer la salle{" "}
            <strong>{salleToEdit?.libelle}</strong> ({salleToEdit?.code}) ?
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteSalleOpen(false);
                setSalleToEdit(null);
              }}
            >
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteSalle}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
