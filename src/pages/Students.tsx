import { useState, useMemo, useEffect } from "react";
import apiClient from "@/lib/apiClient";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  UserPlus,
  Download,
  Users,
  TrendingUp,
  Award,
  ChevronRight,
  ArrowLeftRight,
  UserMinus,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { DataTable, type Column } from "@/components/DataTable";
import { MetricCard } from "@/components/Stats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatCurrency,
  formatStudentName,
  getStatusBadgeColor,
  ROUTE_PATHS,
  type Student,
  matchStudentSearch,
} from "@/lib/index";
import { fadeInUp, staggerContainer, staggerItem } from "@/lib/motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Students() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const userEcoleId = localStorage.getItem("user_ecole_id");
  const userRole = localStorage.getItem("user_role");
  const initialUserSchool =
    userEcoleId &&
    userEcoleId !== "null" &&
    userEcoleId !== "undefined" &&
    !["admin", "superuser", "direction_fondation"].includes(userRole || "")
      ? userEcoleId
      : "all";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSchool, setSelectedSchool] =
    useState<string>(initialUserSchool);
  const [selectedCycle, setSelectedCycle] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedGender, setSelectedGender] = useState<string>("all");
  const [studentsList, setStudentsList] = useState<Student[]>([]);

  const [schools, setSchools] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [createStudentOpen, setCreateStudentOpen] = useState(false);

  // Form states
  const [matricule, setMatricule] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [genre, setGenre] = useState("");
  const [ecoleId, setEcoleId] = useState(
    initialUserSchool !== "all" ? initialUserSchool : "",
  );
  const [classeId, setClasseId] = useState("");
  const [notesSante, setNotesSante] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [boursier, setBoursier] = useState(false);
  const [affecte, setAffecte] = useState(false);
  const [priseEnCharge, setPriseEnCharge] = useState(false);
  const [photo, setPhoto] = useState("");
  const [maLv2, setMaLv2] = useState("Aucun");

  // Edit/Delete state
  const [editStudentOpen, setEditStudentOpen] = useState(false);
  const [deleteStudentOpen, setDeleteStudentOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editMatricule, setEditMatricule] = useState("");
  const [editPrenom, setEditPrenom] = useState("");
  const [editNom, setEditNom] = useState("");
  const [editDateNaissance, setEditDateNaissance] = useState("");
  const [editGenre, setEditGenre] = useState("");
  const [editEcoleId, setEditEcoleId] = useState("");
  const [editClasseId, setEditClasseId] = useState("");
  const [editStatut, setEditStatut] = useState("");
  const [editNotesSante, setEditNotesSante] = useState("");
  const [editParentEmail, setEditParentEmail] = useState("");
  const [editParentPhone, setEditParentPhone] = useState("");
  const [editMaLv2, setEditMaLv2] = useState("Aucun");

  const loadData = async () => {
    try {
      const [studentsData, schoolsData, classesData] = await Promise.all([
        apiClient.getStudents().catch((err: any): any[] => {
          console.error("Failed to fetch students from API", err);
          toast({
            variant: "destructive",
            title: "Erreur de chargement",
            description:
              "Impossible de charger la liste des élèves. Le serveur backend doit être démarré.",
          });
          return [];
        }),
        apiClient.getSchools().catch((err: any): any[] => {
          console.error("Failed to fetch schools from API", err);
          toast({
            variant: "destructive",
            title: "Erreur de chargement",
            description: "Impossible de charger les établissements.",
          });
          return [];
        }),
        apiClient.getClasses().catch((err: any): any[] => {
          console.error("Failed to fetch classes from API", err);
          toast({
            variant: "destructive",
            title: "Erreur de chargement",
            description: "Impossible de charger les classes.",
          });
          return [];
        }),
      ]);
      setStudentsList(studentsData);
      setSchools(schoolsData);
      setClasses(classesData);
    } catch (err) {
      console.error("Failed to fetch students/schools/classes from API", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateStudent = async () => {
    if (!matricule || !prenom || !nom || !dateNaissance || !genre || !ecoleId) {
      toast({
        variant: "destructive",
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs obligatoires (*).",
      });
      return;
    }

    try {
      const payload = {
        matricule,
        prenom,
        nom,
        date_naissance: dateNaissance,
        genre,
        ecole_id: Number(ecoleId),
        classe_id: classeId ? Number(classeId) : null,
        statut: "actif",
        notes_sante: notesSante || "",
        AU_E_MAIL: parentEmail || "",
        AU_CONTACTS: parentPhone || "",
        parent_password: "parentpassword123",
        ETAT_BOURSE: boursier,
        AU_TOP_AFFECTE: affecte ? 1 : 0,
        AU_STATUTPENSION: priseEnCharge ? 1 : 0,
        photo: photo || null,
        MA_LV2: maLv2 === "Aucun" ? null : maLv2,
        AU_LANGUEVIVANTE2:
          maLv2 === "Aucun" ? null : maLv2 === "ESP" ? "Espagnol" : "Allemand",
      };

      const createdStudent = await apiClient.createStudent(payload);

      // Création automatique du compte parent si un email est fourni
      if (parentEmail && createdStudent.id) {
        try {
          await apiClient.createParentAccount({
            eleve_id: Number(createdStudent.id),
            email: parentEmail,
            phone: parentPhone || undefined,
            password: "parentpassword123",
          });
        } catch (parentErr) {
          console.warn(
            "Compte parent non créé (email déjà existant ou API indisponible) :",
            parentErr,
          );
        }
      }

      toast({
        title: "Élève préinscrit",
        description: `L'élève ${nom} ${prenom} a été préinscrit avec succès.${parentEmail ? " Compte parent créé." : ""}`,
      });

      // Clear fields
      setMatricule("");
      setPrenom("");
      setNom("");
      setDateNaissance("");
      setGenre("");
      setEcoleId("");
      setClasseId("");
      setNotesSante("");
      setParentEmail("");
      setParentPhone("");
      setBoursier(false);
      setAffecte(false);
      setPriseEnCharge(false);
      setPhoto("");
      setMaLv2("Aucun");
      setCreateStudentOpen(false);

      await loadData();
      if (newStudent?.id) {
        navigate(`/inscription-process?studentId=${newStudent.id}`);
      }
    } catch (err: any) {
      console.error(err);
      const detail =
        err.response?.data?.detail || "Impossible de préinscrire l'élève.";
      toast({
        variant: "destructive",
        title: "Erreur de création",
        description:
          typeof detail === "string" ? detail : JSON.stringify(detail),
      });
    }
  };

  const handleEditStudent = (row: unknown) => {
    const student = row as Student;
    setSelectedStudent(student);
    setEditMatricule(student.matricule || "");
    setEditPrenom(student.firstName || "");
    setEditNom(student.lastName || "");
    setEditDateNaissance(student.dateNaissance || "");
    setEditGenre(student.gender || "");
    setEditEcoleId(String(student.schoolId || ""));
    setEditClasseId(String(student.classId || ""));
    setEditStatut(student.status || "actif");
    setEditNotesSante(student.notesSante || "");
    setEditParentEmail(student.parentEmail || "");
    setEditParentPhone(student.parentPhone || "");
    setEditMaLv2(student.MA_LV2 || "Aucun");
    setEditStudentOpen(true);
  };

  const handleUpdateStudent = async () => {
    if (!selectedStudent) return;
    try {
      const payload = {
        matricule: editMatricule,
        prenom: editPrenom,
        nom: editNom,
        date_naissance: editDateNaissance,
        genre: editGenre,
        ecole_id: Number(editEcoleId),
        classe_id: editClasseId ? Number(editClasseId) : null,
        statut: editStatut,
        notes_sante: editNotesSante,
        AU_E_MAIL: editParentEmail,
        AU_CONTACTS: editParentPhone,
        MA_LV2: editMaLv2 === "Aucun" ? null : editMaLv2,
        AU_LANGUEVIVANTE2:
          editMaLv2 === "Aucun"
            ? null
            : editMaLv2 === "ESP"
              ? "Espagnol"
              : "Allemand",
      };
      await apiClient.updateStudent(selectedStudent.id, payload);
      toast({
        title: "Mise à jour réussie",
        description: `L'élève ${editNom} ${editPrenom} a été modifié.`,
      });
      setEditStudentOpen(false);
      setSelectedStudent(null);
      await loadData();
    } catch (err: any) {
      const detail =
        err.response?.data?.detail || "Impossible de modifier l'élève.";
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          typeof detail === "string" ? detail : JSON.stringify(detail),
      });
    }
  };

  const handleDeletePrompt = (row: unknown) => {
    setSelectedStudent(row as Student);
    setDeleteStudentOpen(true);
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    try {
      await apiClient.deleteStudent(selectedStudent.id);
      toast({
        title: "Élève supprimé",
        description: `L'élève a été supprimé avec succès.`,
      });
      setDeleteStudentOpen(false);
      setSelectedStudent(null);
      await loadData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          err.response?.data?.detail || "Impossible de supprimer l'élève.",
      });
    }
  };

  const activeStudents = studentsList.filter((s) => s.status === "actif");
  const newInscriptions = studentsList.filter(
    (s) =>
      s.createdAt.getFullYear() === 2026 && // updated to match current year
      s.createdAt.getMonth() >= 0 &&
      s.createdAt.getMonth() <= 11,
  );
  const scholarships = studentsList.filter(
    (s) => s.solde === 0 && s.moyenne >= 14,
  );

  const [selectedRegime, setSelectedRegime] = useState<string>("all");
  const [changeClassOpen, setChangeClassOpen] = useState(false);
  const [studentToChangeClass, setStudentToChangeClass] = useState<Student | null>(null);
  const [targetClassId, setTargetClassId] = useState<string>("");

  const handleChangeClassSubmit = async () => {
    if (!studentToChangeClass || !targetClassId) return;
    try {
      await apiClient.updateStudent(studentToChangeClass.id, {
        classe_id: Number(targetClassId)
      });
      toast({
        title: "Classe mise à jour",
        description: `L'élève ${formatStudentName(studentToChangeClass)} a été affecté à la nouvelle classe.`,
      });
      setChangeClassOpen(false);
      setStudentToChangeClass(null);
      await loadData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur de modification",
        description: err.response?.data?.detail || "Impossible de modifier la classe.",
      });
    }
  };

  const filteredStudents = useMemo(() => {
    return studentsList.filter((student) => {
      const school = schools.find(
        (s) => String(s.id) === String(student.schoolId),
      );
      const classe = classes.find(
        (c) => String(c.id) === String(student.classId),
      );

      const matchesSearch =
        !searchQuery.trim() || matchStudentSearch(student, searchQuery);
      let matchesSchool = selectedSchool === "all";
      if (!matchesSchool) {
        const schObj = schools.find(
          (s: any) =>
            String(s.IDETABLISSEMENT || s.id) === String(selectedSchool),
        );
        const schCode = schObj?.ET_CODEETABLISSEMENT || schObj?.code || "";
        const stCode = String(
          student?.ET_CODEETABLISSEMENT ||
            student?.code_etablissement ||
            student?.codeEtablissement ||
            "",
        );

        const matchById =
          String(student.schoolId || student.ecole_id) ===
          String(selectedSchool);
        const matchByCode = Boolean(
          schCode && stCode && schCode.toUpperCase() === stCode.toUpperCase(),
        );

        matchesSchool = matchById || matchByCode;
      }
      const matchesCycle =
        selectedCycle === "all" || classe?.cycle === selectedCycle;
      const matchesStatus =
        selectedStatus === "all" || student.status === selectedStatus;
      const matchesGender =
        selectedGender === "all" || student.gender === selectedGender;
      const matchesRegime =
        selectedRegime === "all" || (student.regime || "Non-boursier") === selectedRegime;

      return (
        matchesSearch &&
        matchesSchool &&
        matchesCycle &&
        matchesStatus &&
        matchesGender &&
        matchesRegime
      );
    });
  }, [
    studentsList,
    searchQuery,
    selectedSchool,
    selectedCycle,
    selectedStatus,
    selectedGender,
    selectedRegime,
  ]);

  const columns: Column[] = [
    {
      key: "photo",
      label: "Photo",
      render: (_v, student: Student) => (
        <Avatar className="h-10 w-10">
          <AvatarImage src={student.photo} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {student.lastName?.[0] || student.firstName?.[0] || "E"}
            {student.lastName && student.firstName ? student.firstName[0] : ""}
          </AvatarFallback>
        </Avatar>
      ),
    },
    {
      key: "matricule",
      label: "Matricule",
      render: (_v, student: Student) => (
        <span className="font-mono text-sm font-medium">
          {student.matricule}
        </span>
      ),
    },
    {
      key: "name",
      label: "Nom complet",
      render: (_v, student: Student) => (
        <div className="flex flex-col">
          <span className="font-medium">
            {formatStudentName(student)}
          </span>
          <span className="text-xs text-muted-foreground">
            {student.gender === "M" ? "Masculin" : "Féminin"}
          </span>
        </div>
      ),
    },
    {
      key: "school",
      label: "Établissement & Code",
      render: (_v, student: Student) => {
        const school = schools.find(
          (s) => String(s.id) === String(student.schoolId),
        );
        const codeEtab =
          student.codeEtablissement ||
          student.code_etablissement ||
          (student as any).ET_CODEETABLISSEMENT ||
          school?.code ||
          "";
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {school?.name || "Établissement"}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {codeEtab && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono bg-indigo-50 text-indigo-700 border-indigo-200 font-bold px-1.5 py-0"
                >
                  {codeEtab}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {school?.city}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "class",
      label: "Classe",
      render: (_v, student: Student) => {
        const classe = classes.find((c) => String(c.id) === String(student.classId));
        return (
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{classe?.name || student.className || "Non affecté"}</span>
              <span className="text-xs text-muted-foreground capitalize">
                {classe?.cycle}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1.5 text-[11px] text-primary hover:bg-primary/10"
              onClick={(e) => {
                e.stopPropagation();
                setStudentToChangeClass(student);
                setTargetClassId(student.classId || "");
                setChangeClassOpen(true);
              }}
            >
              Modifier
            </Button>
          </div>
        );
      },
    },
    {
      key: "lieu_habitation",
      label: "Lieu d'habitation",
      render: (_v, student: Student) => (
        <span className="text-xs font-medium text-slate-700 max-w-[150px] truncate block" title={student.lieu_habitation || "Non renseigné"}>
          📍 {student.lieu_habitation || "Non renseigné"}
        </span>
      ),
    },
    {
      key: "regime",
      label: "Régime",
      render: (_v, student: Student) => {
        const reg = student.regime || "Non-boursier";
        const isBoursier = reg === "Boursier";
        const isDemi = reg === "Demi-boursier";
        return (
          <Badge
            variant="outline"
            className={`text-xs font-semibold ${
              isBoursier
                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                : isDemi
                ? "bg-amber-50 text-amber-700 border-amber-300"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            {reg}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (_v, student: Student) => (
        <div
          className="flex items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-indigo-300 text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 font-semibold gap-1"
            title="Transmettre vers le processus d'inscription"
            onClick={() =>
              navigate(`/inscription-process?studentId=${student.id}`)
            }
          >
            <ChevronRight className="w-3.5 h-3.5 text-indigo-600" />
            Transmettre
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Retirer cet élève de l'établissement"
            onClick={() =>
              navigate(`${ROUTE_PATHS.STUDENT_WITHDRAWAL}?studentId=${student.id}`)
            }
          >
            <UserMinus className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const handleRowClick = (student: Student) => {
    navigate(ROUTE_PATHS.STUDENT_DETAIL.replace(":id", student.id));
  };

  const handleExport = () => {
    const csvContent = [
      [
        "Matricule",
        "Nom",
        "Prénom",
        "Établissement",
        "Classe",
        "Statut",
        "Solde",
      ],
      ...filteredStudents.map((student) => {
        const school = schools.find((s) => s.id === student.schoolId);
        const classe = classes.find((c) => c.id === student.classId);
        return [
          student.matricule,
          student.lastName,
          student.firstName,
          school?.name || "",
          classe?.name || "",
          student.status,
          student.solde.toString(),
        ];
      }),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `eleves_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast({
        title: "Importation en cours...",
        description:
          "Veuillez patienter pendant l'importation de la liste des élèves.",
      });

      const response = await apiClient.importStudentsCsv(file);
      const totalProcessed = (response.imported || 0) + (response.updated || 0);

      if (response.success || totalProcessed > 0) {
        toast({
          title: "Importation réussie",
          description: `${totalProcessed} élève(s) traité(s) (${response.imported || 0} nouveau(x), ${response.updated || 0} mis à jour).`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Importation terminée avec des erreurs",
          description:
            response.errors?.length > 0
              ? response.errors.slice(0, 3).join(", ")
              : "Aucune donnée n'a été importée.",
        });
      }

      await loadData();
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Erreur d'importation",
        description:
          err.response?.data?.detail || "Impossible d'importer le fichier.",
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <motion.div
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Élèves & Familles
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestion des élèves et dossiers familiaux
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate(ROUTE_PATHS.STUDENT_TRANSFER)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-2 shadow-sm"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Transférer des élèves
            </Button>
            <Button
              onClick={() => navigate(ROUTE_PATHS.STUDENT_WITHDRAWAL)}
              variant="outline"
              className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 font-semibold gap-2 shadow-sm"
            >
              <UserMinus className="h-4 w-4" />
              Retrait d'élèves
            </Button>
          </div>
          {/* <Dialog open={createStudentOpen} onOpenChange={setCreateStudentOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <UserPlus className="h-5 w-5" />
                Nouvelle préinscription
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Nouvelle Préinscription</DialogTitle>
                <DialogDescription>
                  Inscrivez un nouvel élève dans un établissement et configurez son dossier.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label htmlFor="matricule">Matricule *</Label>
                    <Input id="matricule" placeholder="HE2026..." value={matricule} onChange={(e) => setMatricule(e.target.value)} />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="genre">Genre *</Label>
                    <Select value={genre} onValueChange={setGenre}>
                      <SelectTrigger><SelectValue placeholder="Genre" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculin</SelectItem>
                        <SelectItem value="F">Féminin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label htmlFor="nom">Nom *</Label>
                    <Input id="nom" placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)} />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="prenom">Prénom *</Label>
                    <Input id="prenom" placeholder="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="dateNaissance">Date de naissance *</Label>
                  <Input id="dateNaissance" type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="ecoleId">Établissement *</Label>
                  <Select value={ecoleId} onValueChange={setEcoleId}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner l'établissement" /></SelectTrigger>
                    <SelectContent>
                      {schools.map((school: any) => (
                        <SelectItem key={school.id} value={String(school.id)}>{school.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="classeId">Classe (Optionnel)</Label>
                  <Select value={classeId} onValueChange={setClasseId}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner la classe" /></SelectTrigger>
                    <SelectContent>
                      {classes
                        .filter((cls: any) => !ecoleId || String(cls.schoolId) === String(ecoleId) || String(cls.ecole_id) === String(ecoleId))
                        .map((cls: any) => (
                          <SelectItem key={cls.id} value={String(cls.id)}>{cls.name || cls.libelle}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="maLv2">Langue Vivante 2 (LV2)</Label>
                  <Select value={maLv2} onValueChange={setMaLv2}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner la LV2" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aucun">Aucune</SelectItem>
                      <SelectItem value="ESP">Espagnol</SelectItem>
                      <SelectItem value="ALL">Allemand</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="parentPhone">Téléphone Parent</Label>
                  <Input id="parentPhone" placeholder="ex: +225 05060708" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="parentEmail">Email Parent</Label>
                  <Input id="parentEmail" type="email" placeholder="parent@email.ci" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notesSante">Notes de santé</Label>
                  <Input id="notesSante" placeholder="Allergies, contre-indications..." value={notesSante} onChange={(e) => setNotesSante(e.target.value)} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="photo">Photo de l'élève</Label>
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="cursor-pointer"
                  />
                  {photo && (
                    <div className="mt-2 flex items-center gap-4">
                      <img src={photo} alt="Aperçu" className="h-16 w-16 rounded-full object-cover border" />
                      <Button variant="ghost" size="sm" onClick={() => setPhoto('')} className="text-destructive text-xs">Supprimer</Button>
                    </div>
                  )}
                </div>

                <div className="border-t pt-3 mt-1">
                  <Label className="text-sm font-semibold">Statuts & Prise en charge</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={boursier}
                        onChange={e => setBoursier(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      Boursier
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={affecte}
                        onChange={e => setAffecte(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      Affecté par l'État
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={priseEnCharge}
                        onChange={e => setPriseEnCharge(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      Prise en charge
                    </label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateStudentOpen(false)}>Annuler</Button>
                <Button onClick={handleCreateStudent}>Enregistrer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog> */}
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid gap-4 md:grid-cols-3"
        >
          <motion.div variants={staggerItem}>
            <MetricCard
              label="Total élèves"
              value={studentsList.length}
              // value={activeStudents.length}
              icon={<Users className="h-5 w-5 text-primary" />}
              color="primary"
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <MetricCard
              label="Nouvelles inscriptions"
              value={newInscriptions.length}
              icon={<TrendingUp className="h-5 w-5 text-accent" />}
              color="accent"
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <MetricCard
              label="Bourses d'excellence"
              value={scholarships.length}
              icon={<Award className="h-5 w-5 text-secondary" />}
              color="secondary"
            />
          </motion.div>
        </motion.div>

        <motion.div variants={fadeInUp} initial="initial" animate="animate">
          <Card>
            <CardHeader>
              <CardTitle>Recherche et filtres</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                <div className="lg:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par nom ou matricule..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Select
                  value={selectedSchool}
                  onValueChange={setSelectedSchool}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Établissement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les établissements</SelectItem>
                    {schools.map((school: any) => (
                      <SelectItem key={school.id} value={String(school.id)}>
                        {school.name || school.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedCycle} onValueChange={setSelectedCycle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les cycles</SelectItem>
                    <SelectItem value="maternelle">Maternelle</SelectItem>
                    <SelectItem value="primaire">Primaire</SelectItem>
                    <SelectItem value="college">Collège</SelectItem>
                    <SelectItem value="lycee">Collège 2nd cycle</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="preinscrit">Préinscrit</SelectItem>
                    <SelectItem value="radie">Radié</SelectItem>
                    <SelectItem value="transfere">Transféré</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={selectedRegime}
                  onValueChange={setSelectedRegime}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Régime" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les régimes</SelectItem>
                    <SelectItem value="Non-boursier">Non-boursier</SelectItem>
                    <SelectItem value="Boursier">Boursier</SelectItem>
                    <SelectItem value="Demi-boursier">Demi-boursier</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Modal Changement de Classe */}
              <Dialog open={changeClassOpen} onOpenChange={setChangeClassOpen}>
                <DialogContent className="sm:max-w-[450px]">
                  <DialogHeader>
                    <DialogTitle>Changer la classe de l'élève</DialogTitle>
                    <DialogDescription>
                      {studentToChangeClass && (
                        <span>
                          Sélectionnez la nouvelle classe pour <strong>{formatStudentName(studentToChangeClass)}</strong> ({studentToChangeClass.matricule}).
                        </span>
                      )}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 grid gap-3">
                    <Label>Nouvelle Classe *</Label>
                    <Select value={targetClassId} onValueChange={setTargetClassId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner la classe" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls: any) => (
                          <SelectItem key={cls.id} value={String(cls.id)}>
                            {cls.name || cls.libelle} ({cls.cycle || "Général"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setChangeClassOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleChangeClassSubmit} className="bg-primary text-white">
                      Enregistrer la modification
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {filteredStudents.length} élève(s) trouvé(s)
                </p>
                <div className="flex gap-2">
                  <input
                    type="file"
                    id="csv-import-input"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleImportCSV}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      document.getElementById("csv-import-input")?.click()
                    }
                    className="gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    Importer Excel / CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Exporter CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp} initial="initial" animate="animate">
          <DataTable
            columns={columns}
            data={filteredStudents.map((student) => ({
              ...student,
              onClick: () => handleRowClick(student),
            }))}
            title="Liste des élèves"
            searchable={false}
            exportable={false}
            onEdit={handleEditStudent}
            onDelete={handleDeletePrompt}
          />

          {/* Edit Dialog */}
          <Dialog open={editStudentOpen} onOpenChange={setEditStudentOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Modifier l'élève</DialogTitle>
                <DialogDescription>
                  Modifiez les informations de l'élève sélectionné.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label htmlFor="edit-matricule">Matricule</Label>
                    <Input
                      id="edit-matricule"
                      value={editMatricule}
                      onChange={(e) => setEditMatricule(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="edit-genre">Genre</Label>
                    <Select value={editGenre} onValueChange={setEditGenre}>
                      <SelectTrigger>
                        <SelectValue placeholder="Genre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculin</SelectItem>
                        <SelectItem value="F">Féminin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label htmlFor="edit-nom">Nom</Label>
                    <Input
                      id="edit-nom"
                      value={editNom}
                      onChange={(e) => setEditNom(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="edit-prenom">Prénom</Label>
                    <Input
                      id="edit-prenom"
                      value={editPrenom}
                      onChange={(e) => setEditPrenom(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-date">Date de naissance</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editDateNaissance}
                    onChange={(e) => setEditDateNaissance(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Statut</Label>
                  <Select value={editStatut} onValueChange={setEditStatut}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="preinscrit">Préinscrit</SelectItem>
                      <SelectItem value="radie">Radié</SelectItem>
                      <SelectItem value="transfere">Transféré</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Établissement</Label>
                  <Select value={editEcoleId} onValueChange={setEditEcoleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Établissement" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map((school: any) => (
                        <SelectItem key={school.id} value={String(school.id)}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Classe</Label>
                  <Select value={editClasseId} onValueChange={setEditClasseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Classe" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes
                        .filter(
                          (cls: any) =>
                            !editEcoleId ||
                            String(cls.schoolId) === String(editEcoleId) ||
                            String(cls.ecole_id) === String(editEcoleId),
                        )
                        .map((cls: any) => (
                          <SelectItem key={cls.id} value={String(cls.id)}>
                            {cls.name || cls.libelle}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Langue Vivante 2 (LV2)</Label>
                  <Select value={editMaLv2} onValueChange={setEditMaLv2}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner la LV2" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aucun">Aucune</SelectItem>
                      <SelectItem value="ESP">Espagnol</SelectItem>
                      <SelectItem value="ALL">Allemand</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Téléphone Parent</Label>
                  <Input
                    value={editParentPhone}
                    onChange={(e) => setEditParentPhone(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Email Parent</Label>
                  <Input
                    type="email"
                    value={editParentEmail}
                    onChange={(e) => setEditParentEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Notes de santé</Label>
                  <Input
                    value={editNotesSante}
                    onChange={(e) => setEditNotesSante(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setEditStudentOpen(false)}
                >
                  Annuler
                </Button>
                <Button onClick={handleUpdateStudent}>
                  Enregistrer les modifications
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteStudentOpen} onOpenChange={setDeleteStudentOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmer la suppression</DialogTitle>
                <DialogDescription>
                  Êtes-vous sûr de vouloir supprimer l'élève{" "}
                  <strong>
                    {formatStudentName(selectedStudent)}
                  </strong>{" "}
                  ? Cette action est irréversible.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteStudentOpen(false)}
                >
                  Annuler
                </Button>
                <Button variant="destructive" onClick={handleDeleteStudent}>
                  Supprimer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>
      </div>
    </Layout>
  );
}
