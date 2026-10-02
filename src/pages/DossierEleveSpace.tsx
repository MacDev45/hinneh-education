import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layout } from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";
import { ROUTE_PATHS, formatCurrency, formatDate, resolveStudentClassName } from "@/lib/index";
import { printDossierScolaireComplet } from "@/lib/schoolDocumentsPrinter";
import {
  User,
  BookOpen,
  DollarSign,
  Calendar,
  AlertCircle,
  TrendingUp,
  FileText,
  Search,
  School as SchoolIcon,
  Printer,
  QrCode,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  XCircle,
  CreditCard,
  GraduationCap,
  Sparkles,
  Layers,
} from "lucide-react";

interface Dossier {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  date_naissance?: string;
  lieu_naissance?: string;
  genre?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  nom_tuteur?: string;
  telephone_tuteur?: string;
  classe: string;
  niveau: string;
  ecole_nom: string;
  ecole_code: string;
  ecole_id?: number;
  photo_url?: string;
  scolarite_due: number;
  total_verse: number;
  solde_reste: number;
  taux_recouvrement_pct: number;
  derniers_paiements: Array<{
    date?: string;
    montant: number;
    type_paiement: string;
    mode: string;
    statut: string;
    recu_numero?: string;
  }>;
  dernieres_notes: Array<{
    matiere: string;
    note: number;
    coefficient: number;
    date?: string;
    type_eval?: string;
  }>;
  moyennes: Array<{
    periode: string;
    moyenne_generale: number;
    rang?: number;
  }>;
  absences_recent: Array<{
    date: string;
    justifiee: boolean;
    raison?: string;
    heure?: string;
  }>;
  absences_total_non_justifiees: number;
  absences_total_justifiees: number;
}

export const DossierEleveSpace: React.FC = () => {
  const { eleve_id } = useParams<{ eleve_id?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  // States
  const [selectedStudentId, setSelectedStudentId] = useState<string>(eleve_id || "");
  const [students, setStudents] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");

  // Load Initial Lists (Students, Schools, Classes)
  useEffect(() => {
    const initData = async () => {
      setLoadingList(true);
      try {
        const [studRes, schRes, clsRes] = await Promise.all([
          apiClient.getStudents(),
          apiClient.getSchools().catch(() => []),
          apiClient.getClasses().catch(() => []),
        ]);
        setStudents(studRes || []);
        setSchools(schRes || []);
        setClasses(clsRes || []);
      } catch (err) {
        console.error("Erreur lors du chargement des listes:", err);
      } finally {
        setLoadingList(false);
      }
    };
    initData();
  }, []);

  // Update selected student when param changes
  useEffect(() => {
    if (eleve_id && eleve_id !== selectedStudentId) {
      setSelectedStudentId(eleve_id);
    }
  }, [eleve_id]);

  // Load Complete Dossier when student is selected
  useEffect(() => {
    if (!selectedStudentId || selectedStudentId === ":eleve_id") {
      setDossier(null);
      return;
    }

    const chargerDossier = async () => {
      setLoading(true);
      try {
        // Fetch from dedicated backend endpoint
        const res = await apiClient.getDossierEleve(selectedStudentId);
        setDossier(res);
      } catch (err: any) {
        console.warn("Backend dossier endpoint failed, building from client state:", err);
        // Client-side fallback if backend route has scope restriction
        const st = students.find((s: any) => String(s.id) === String(selectedStudentId));
        if (st) {
          const scDue = Number(st.AU_SCOLARITE || st.scolarite || 0);
          const scPaye = Number(st.AU_TOTALDEPOT || st.total_paye || 0);
          const cls = classes.find((c: any) => String(c.id) === String(st.classe_id || st.classId));
          const sch = schools.find((s: any) => String(s.IDETABLISSEMENT || s.id) === String(st.ecole_id || st.schoolId));

          setDossier({
            id: st.id,
            matricule: st.AU_MATRICULE || st.matricule || `MAT-${st.id}`,
            nom: st.AU_NOM || st.lastName || "—",
            prenom: st.AU_PRENOM || st.firstName || "—",
            date_naissance: st.AU_DATE_NAISSANCE || st.date_naissance,
            lieu_naissance: st.AU_LIEU_NAISSANCE || st.lieu_naissance,
            genre: st.AU_GENRE || st.genre,
            email: st.AU_E_MAIL || st.email,
            telephone: st.AU_TELEPHONE || st.phone,
            adresse: st.AU_ADRESSE || st.adresse,
            nom_tuteur: st.nom_parent || st.parent_name || st.nom_tuteur,
            telephone_tuteur: st.contact_parent || st.parent_phone || st.telephone_tuteur,
            classe: resolveStudentClassName(st, classes) || (cls ? cls.CE_LIBELLE || cls.name : "—"),
            niveau: cls?.niveau_code || cls?.niveau || "—",
            ecole_nom: sch?.ET_DENOMMINATION || sch?.name || "École HINNEH",
            ecole_code: sch?.ET_CODEETABLISSEMENT || sch?.code || "FHA",
            ecole_id: st.ecole_id || st.schoolId,
            photo_url: st.photo_url || st.photo,
            scolarite_due: scDue,
            total_verse: scPaye,
            solde_reste: Math.max(0, scDue - scPaye),
            taux_recouvrement_pct: scDue > 0 ? (scPaye / scDue) * 100 : 0,
            derniers_paiements: [],
            dernieres_notes: [],
            moyennes: [],
            absences_recent: [],
            absences_total_non_justifiees: 0,
            absences_total_justifiees: 0,
          });
        } else {
          toast({
            variant: "destructive",
            title: "Dossier introuvable",
            description: "Impossible de récupérer les informations de l'élève.",
          });
        }
      } finally {
        setLoading(false);
      }
    };

    chargerDossier();
  }, [selectedStudentId, students, classes, schools, toast]);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return students.filter((s: any) => {
      // School filter
      if (selectedSchool !== "all") {
        const sId = String(s.ecole_id || s.schoolId || s.IDETABLISSEMENT || "");
        if (sId !== selectedSchool) return false;
      }
      // Class filter
      if (selectedClass !== "all") {
        const cId = String(s.classe_id || s.classId || "");
        if (cId !== selectedClass) return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const fullName = `${s.AU_NOM || s.lastName || ""} ${s.AU_PRENOM || s.firstName || ""}`.toLowerCase();
        const mat = String(s.AU_MATRICULE || s.matricule || "").toLowerCase();
        const phone = String(s.AU_TELEPHONE || s.phone || "").toLowerCase();
        return fullName.includes(query) || mat.includes(query) || phone.includes(query);
      }
      return true;
    });
  }, [students, selectedSchool, selectedClass, searchTerm]);

  // Available classes filtered by school
  const filteredClasses = useMemo(() => {
    if (selectedSchool === "all") return classes;
    return classes.filter((c: any) => String(c.ecole_id || c.schoolId) === selectedSchool);
  }, [classes, selectedSchool]);

  const handlePrint = () => {
    if (!dossier) {
      toast({
        variant: "destructive",
        title: "Aucun dossier sélectionné",
        description: "Veuillez sélectionner un élève pour pouvoir imprimer son dossier scolaire officiel.",
      });
      return;
    }
    printDossierScolaireComplet(dossier);
  };

  const couleurSolde = dossier && dossier.solde_reste > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400";

  return (
    <Layout>
      <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <FileText className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                Dossier Scolaire Élève
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Consultation intégrale de l'identité, de la scolarité, des évaluations et de l'assiduité.
            </p>
          </div>

          {dossier && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedStudentId("");
                  navigate(ROUTE_PATHS.DOSSIER_ELEVE);
                }}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Changer d'élève
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/badge-qr/${dossier.id}`)}
                className="gap-2"
              >
                <QrCode className="w-4 h-4" /> Badge QR
              </Button>
              <Button
                size="sm"
                onClick={handlePrint}
                className="gap-2 bg-primary text-primary-foreground"
              >
                <Printer className="w-4 h-4" /> Imprimer Dossier
              </Button>
            </div>
          )}
        </div>

        {/* ─── CAS 1 : Aucun élève sélectionné -> Sélecteur & Liste d'élèves ─── */}
        {!selectedStudentId && (
          <div className="space-y-6">
            {/* Filtres de sélection */}
            <Card className="shadow-sm border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Search className="w-4 h-4 text-primary" /> Rechercher et Sélectionner un Élève
                </CardTitle>
                <CardDescription>
                  Filtrez par établissement, classe ou saisissez un nom/matricule.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Recherche texte */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Recherche par nom ou matricule
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                      <Input
                        placeholder="Ex: Kouamé, MAT-2026..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {/* Filtre École */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Établissement
                    </label>
                    <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tous les établissements" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les établissements</SelectItem>
                        {schools.map((s: any) => (
                          <SelectItem key={s.IDETABLISSEMENT || s.id} value={String(s.IDETABLISSEMENT || s.id)}>
                            {s.ET_DENOMMINATION || s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtre Classe */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Classe
                    </label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger>
                        <SelectValue placeholder="Toutes les classes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les classes</SelectItem>
                        {filteredClasses.map((c: any) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.CE_LIBELLE || c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Liste des résultats */}
            <Card className="shadow-sm border-border">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Liste des Élèves ({filteredStudents.length})
                  </CardTitle>
                  <CardDescription>
                    Cliquez sur un élève pour ouvrir son dossier complet.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {loadingList ? (
                  <div className="py-12 text-center text-muted-foreground">
                    Chargement de la liste des élèves...
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    Aucun élève trouvé avec les critères sélectionnés.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredStudents.slice(0, 30).map((st: any) => {
                      const nomComplet = `${st.AU_NOM || st.lastName || ""} ${st.AU_PRENOM || st.firstName || ""}`.trim();
                      const matricule = st.AU_MATRICULE || st.matricule || `MAT-${st.id}`;
                      const classeNom = resolveStudentClassName(st, classes) || "Classe —";

                      return (
                        <div
                          key={st.id}
                          onClick={() => {
                            setSelectedStudentId(String(st.id));
                            navigate(`/dossier-eleve/${st.id}`);
                          }}
                          className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary hover:shadow-md transition cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-lg group-hover:scale-105 transition">
                              {nomComplet.charAt(0) || "E"}
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground text-sm group-hover:text-primary transition">
                                {nomComplet}
                              </h4>
                              <p className="text-xs text-muted-foreground font-mono">{matricule}</p>
                              <Badge variant="secondary" className="text-[10px] mt-1">
                                {classeNom}
                              </Badge>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition">
                            Voir
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── CAS 2 : Élève sélectionné -> Dossier Complet ─── */}
        {selectedStudentId && loading && (
          <div className="py-16 text-center text-muted-foreground">
            Chargement du dossier de l'élève en cours...
          </div>
        )}

        {selectedStudentId && !loading && dossier && (
          <div ref={printRef} className="space-y-6">
            {/* Header Profil */}
            <Card className="overflow-hidden border-border shadow-sm">
              <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-6 border-b border-border">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-3xl flex items-center justify-center shadow-lg">
                      {dossier.nom?.charAt(0)}{dossier.prenom?.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                          {dossier.nom} {dossier.prenom}
                        </h2>
                        <Badge variant="outline" className="bg-background text-xs font-mono">
                          {dossier.matricule}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                        <SchoolIcon className="w-4 h-4" /> {dossier.ecole_nom} ({dossier.ecole_code})
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="px-3 py-1 text-xs">
                      Classe : {dossier.classe}
                    </Badge>
                    <Badge variant="outline" className="px-3 py-1 text-xs">
                      Niveau : {dossier.niveau || "Standard"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Barre d'infos rapides */}
              <CardContent className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Date de naissance
                    </span>
                    <p className="font-medium text-foreground">{dossier.date_naissance ? formatDate(dossier.date_naissance) : "Non renseignée"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> Contact Éducateur / Parent
                    </span>
                    <p className="font-medium text-foreground">{dossier.telephone_tuteur || dossier.telephone || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" /> E-mail
                    </span>
                    <p className="font-medium text-foreground">{dossier.email || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> Adresse / Tuteur
                    </span>
                    <p className="font-medium text-foreground">{dossier.nom_tuteur || dossier.adresse || "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI Financiers & Assiduité */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Scolarité Due</p>
                    <p className="text-2xl font-bold mt-1 text-foreground">{formatCurrency(dossier.scolarite_due)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Versé</p>
                    <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{formatCurrency(dossier.total_verse)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Reste à Payer</p>
                    <p className={`text-2xl font-bold mt-1 ${couleurSolde}`}>{formatCurrency(dossier.solde_reste)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Taux Recouvrement</p>
                    <p className="text-2xl font-bold mt-1 text-primary">{dossier.taux_recouvrement_pct.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Onglets Détaillés : Notes, Paiements, Assiduité */}
            <Tabs defaultValue="pedagogie" className="w-full">
              <TabsList className="grid grid-cols-3 w-full max-w-lg mb-4">
                <TabsTrigger value="pedagogie" className="gap-2">
                  <GraduationCap className="w-4 h-4" /> Notes & Pédagogie
                </TabsTrigger>
                <TabsTrigger value="finances" className="gap-2">
                  <CreditCard className="w-4 h-4" /> Historique Paiements
                </TabsTrigger>
                <TabsTrigger value="presences" className="gap-2">
                  <Calendar className="w-4 h-4" /> Assiduité
                </TabsTrigger>
              </TabsList>

              {/* ─── ONGLET 1 : PÉDAGOGIE & NOTES ─── */}
              <TabsContent value="pedagogie" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Moyennes par Période */}
                  <Card className="border-border shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" /> Moyennes & Rangs Trimestriels
                      </CardTitle>
                      <CardDescription>Résultats consolidés des bulletins</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {dossier.moyennes && dossier.moyennes.length > 0 ? (
                        <div className="space-y-3">
                          {dossier.moyennes.map((m, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                              <span className="font-medium text-sm text-foreground">{m.periode}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-primary">{m.moyenne_generale.toFixed(2)}/20</span>
                                {m.rang && (
                                  <Badge variant="secondary" className="text-xs">
                                    {m.rang}e de classe
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          Aucun bulletin ou moyenne enregistrée pour cet élève.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Dernières Évaluations */}
                  <Card className="border-border shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" /> Dernières Notes Saisies
                      </CardTitle>
                      <CardDescription>Contrôles continus et devoirs récents</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {dossier.dernieres_notes && dossier.dernieres_notes.length > 0 ? (
                        <div className="space-y-2">
                          {dossier.dernieres_notes.slice(0, 6).map((n, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 text-sm">
                              <div>
                                <p className="font-medium text-foreground">{n.matiere}</p>
                                <p className="text-xs text-muted-foreground">Coef. {n.coefficient} {n.date ? `· ${formatDate(n.date)}` : ""}</p>
                              </div>
                              <span className={`font-bold text-base ${n.note >= 10 ? "text-emerald-600" : "text-red-600"}`}>
                                {n.note.toFixed(2)}/20
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          Aucune note enregistrée récemment.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* ─── ONGLET 2 : FINANCES & PAIEMENTS ─── */}
              <TabsContent value="finances" className="space-y-6">
                <Card className="border-border shadow-sm">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-primary" /> Historique des Règlements
                      </CardTitle>
                      <CardDescription>Tous les versements et encaissements enregistrés</CardDescription>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(ROUTE_PATHS.CAISSE_SPACE)}
                      className="gap-2"
                    >
                      <CreditCard className="w-4 h-4" /> Ouvrir la Caisse
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {dossier.derniers_paiements && dossier.derniers_paiements.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border text-xs text-muted-foreground">
                              <th className="text-left py-2 px-3">Date</th>
                              <th className="text-left py-2 px-3">Type</th>
                              <th className="text-left py-2 px-3">Mode</th>
                              <th className="text-right py-2 px-3">Montant</th>
                              <th className="text-center py-2 px-3">Statut</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dossier.derniers_paiements.map((p, idx) => (
                              <tr key={idx} className="border-b border-border/50 hover:bg-muted/30 transition">
                                <td className="py-2.5 px-3 font-mono text-xs">{p.date ? formatDate(p.date) : "—"}</td>
                                <td className="py-2.5 px-3 font-medium capitalize">{p.type_paiement}</td>
                                <td className="py-2.5 px-3 capitalize">{p.mode}</td>
                                <td className="py-2.5 px-3 text-right font-bold text-foreground">{formatCurrency(p.montant)}</td>
                                <td className="py-2.5 px-3 text-center">
                                  <Badge variant={p.statut === "paye" || p.statut === "valide" ? "default" : "secondary"}>
                                    {p.statut}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        Aucun paiement enregistré pour cet élève.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─── ONGLET 3 : ASSIDUITÉ & ABSENCES ─── */}
              <TabsContent value="presences" className="space-y-6">
                <Card className="border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" /> Bilan d'Assiduité
                    </CardTitle>
                    <CardDescription>Présences, absences et motifs de justification</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-center">
                        <p className="text-xs text-red-700 dark:text-red-300 font-medium">Non Justifiées</p>
                        <p className="text-2xl font-bold text-red-600 mt-1">{dossier.absences_total_non_justifiees}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-center">
                        <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">Justifiées</p>
                        <p className="text-2xl font-bold text-amber-600 mt-1">{dossier.absences_total_justifiees}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-border text-center">
                        <p className="text-xs text-muted-foreground font-medium">Total Absences</p>
                        <p className="text-2xl font-bold text-foreground mt-1">
                          {dossier.absences_total_justifiees + dossier.absences_total_non_justifiees}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold mb-3">Détail des dernières absences</h4>
                      {dossier.absences_recent && dossier.absences_recent.length > 0 ? (
                        <div className="space-y-2">
                          {dossier.absences_recent.map((a, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card text-sm">
                              <div className="flex items-center gap-3">
                                {a.justifiee ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                )}
                                <div>
                                  <p className="font-medium text-foreground">{formatDate(a.date)}</p>
                                  <p className="text-xs text-muted-foreground">{a.raison || "Aucun motif précisé"}</p>
                                </div>
                              </div>
                              <Badge variant={a.justifiee ? "secondary" : "destructive"}>
                                {a.justifiee ? "Justifiée" : "Non justifiée"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Aucune absence récente enregistrée.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </Layout>
  );
};
