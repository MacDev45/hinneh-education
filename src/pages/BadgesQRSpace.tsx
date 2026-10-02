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
import { generateQRCodeDataURI } from "@/lib/qrHelper";
import { resolveStudentClassName, formatStudentName } from "@/lib/index";
import { IMAGES } from "@/assets/images";
import {
  printCarteScolaire,
  printPlancheCartesScolaires,
  printCarteProfessionnelle,
  printPlancheCartesProfessionnelles
} from "@/lib/certificatePrinter";
import {
  Download,
  Printer,
  QrCode,
  Search,
  School as SchoolIcon,
  Users,
  CreditCard,
  CheckCircle2,
  FileText,
  Scan,
  UserCheck,
  GraduationCap,
  Calendar,
  Grid,
  ShieldCheck,
  Building2,
  Award,
  IdCard,
} from "lucide-react";

interface EleveInfo {
  id: number;
  nom: string;
  prenom: string;
  matricule: string;
  classe: string;
  ecole_nom: string;
  ecole_code: string;
  telephone?: string;
  photo_url?: string;
  date_naissance?: string;
  raw: any;
}

interface PersonnelInfo {
  id: number;
  nom: string;
  prenom: string;
  matricule: string;
  fonction: string;
  service: string;
  ecole_nom: string;
  telephone?: string;
  email?: string;
  photo_url?: string;
  raw: any;
}

export const BadgesQRSpace: React.FC = () => {
  const { eleve_id } = useParams<{ eleve_id?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // States
  const [selectedStudentId, setSelectedStudentId] = useState<string>(eleve_id || "");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [students, setStudents] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Filters & Tabs
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("single_student");

  // Scanner Simulator State
  const [scannedCode, setScannedCode] = useState("");
  const [scannedResult, setScannedResult] = useState<any | null>(null);

  // Load Initial Lists
  useEffect(() => {
    const loadInitial = async () => {
      setLoadingList(true);
      try {
        const [studRes, stfRes, schRes, clsRes] = await Promise.all([
          apiClient.getStudents(),
          apiClient.getStaff().catch(() => []),
          apiClient.getSchools().catch(() => []),
          apiClient.getClasses().catch(() => []),
        ]);
        setStudents(studRes || []);
        setStaffList(stfRes || []);
        setSchools(schRes || []);
        setClasses(clsRes || []);

        if (!selectedStudentId && studRes && studRes.length > 0) {
          setSelectedStudentId(String(studRes[0].id));
        }
        if (stfRes && stfRes.length > 0) {
          setSelectedStaffId(String(stfRes[0].id));
        }
      } catch (err) {
        console.error("Erreur chargement:", err);
      } finally {
        setLoadingList(false);
      }
    };
    loadInitial();
  }, []);

  // Sync param
  useEffect(() => {
    if (eleve_id && eleve_id !== selectedStudentId && eleve_id !== ":eleve_id") {
      setSelectedStudentId(eleve_id);
    }
  }, [eleve_id]);

  // Selected Student Object
  const currentStudent = useMemo<EleveInfo | null>(() => {
    if (!selectedStudentId || selectedStudentId === ":eleve_id") return null;
    const s = students.find((item: any) => String(item.id) === String(selectedStudentId));
    if (!s) return null;

    const sch = schools.find((sc: any) => String(sc.IDETABLISSEMENT || sc.id) === String(s.ecole_id || s.schoolId));
    const cls = classes.find((c: any) => String(c.id) === String(s.classe_id || s.classId));

    return {
      id: s.id,
      nom: s.AU_NOM || s.lastName || s.nom || "—",
      prenom: s.AU_PRENOM || s.firstName || s.prenom || "—",
      matricule: s.AU_MATRICULE || s.matricule || `MAT-${s.id}`,
      classe: resolveStudentClassName(s, classes) || (cls ? cls.CE_LIBELLE || cls.name : "Classe standard"),
      ecole_nom: sch?.ET_DENOMMINATION || sch?.name || "Fondation Hinneh",
      ecole_code: sch?.ET_CODEETABLISSEMENT || sch?.code || "FHA-01",
      telephone: s.AU_TUTEURLEGALCONTACTS || s.AU_CONTACTURGENCES || s.AU_CONTACTS || s.parentPhone || s.AU_TELEPHONE || s.phone || s.contact_parent || "—",
      photo_url: s.photo_url || s.photo,
      date_naissance: s.AU_DATE_NAISSANCE || s.date_naissance || s.dateNaissance || (s.dateOfBirth ? String(s.dateOfBirth).split('T')[0] : null) || "—",
      raw: s,
    };
  }, [selectedStudentId, students, schools, classes]);

  // Selected Staff Object
  const currentStaff = useMemo<PersonnelInfo | null>(() => {
    if (!selectedStaffId) return null;
    const st = staffList.find((item: any) => String(item.id) === String(selectedStaffId));
    if (!st) return null;

    const sch = schools.find((sc: any) => String(sc.IDETABLISSEMENT || sc.id) === String(st.ecole_id || st.schoolId));

    return {
      id: st.id,
      nom: st.lastName || st.nom || "—",
      prenom: st.firstName || st.prenom || "—",
      matricule: st.matricule || (st.username && !st.username.includes('@') ? st.username : `PERS-${String(st.id || '01').padStart(3, '0')}`),
      fonction: (st.fonctionExercee || st.fonction || st.role || "Personnel").toUpperCase(),
      service: st.service || (st.fonction === "enseignant" ? "Corps Enseignant" : "Administration"),
      ecole_nom: sch?.ET_DENOMMINATION || sch?.name || "Fondation Hinneh",
      telephone: st.phone || st.telephone || "—",
      email: st.email || "—",
      photo_url: st.photo || st.photo_url,
      raw: st,
    };
  }, [selectedStaffId, staffList, schools]);

  // QR Code Data URIs
  const studentQrDataUri = useMemo(() => {
    if (!currentStudent) return "";
    const payload = `ELEVE|ID:${currentStudent.id}|MAT:${currentStudent.matricule}|NOM:${currentStudent.nom}|PRENOM:${currentStudent.prenom}|CONTACT:${currentStudent.telephone}|CLS:${currentStudent.classe}|ECOLE:${currentStudent.ecole_code}`;
    return generateQRCodeDataURI(payload, 220);
  }, [currentStudent]);

  const staffQrDataUri = useMemo(() => {
    if (!currentStaff) return "";
    const payload = `${typeof window !== 'undefined' ? window.location.origin : 'https://hinneh-education.ci'}/#/agent?matricule=${encodeURIComponent(currentStaff.matricule)}&nom=${encodeURIComponent(currentStaff.nom)}&prenom=${encodeURIComponent(currentStaff.prenom)}&contact=${encodeURIComponent(currentStaff.telephone)}&role=${encodeURIComponent(currentStaff.fonction)}`;
    return generateQRCodeDataURI(payload, 220);
  }, [currentStaff]);

  // Filtered Students List for Batch Mode
  const batchStudents = useMemo(() => {
    return students.filter((s: any) => {
      if (selectedSchool !== "all") {
        const sId = String(s.ecole_id || s.schoolId || s.IDETABLISSEMENT || "");
        if (sId !== selectedSchool) return false;
      }
      if (selectedClass !== "all") {
        const cId = String(s.classe_id || s.classId || "");
        if (cId !== selectedClass) return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const fullName = `${s.AU_NOM || s.lastName || ""} ${s.AU_PRENOM || s.firstName || ""}`.toLowerCase();
        const mat = String(s.AU_MATRICULE || s.matricule || "").toLowerCase();
        return fullName.includes(q) || mat.includes(q);
      }
      return true;
    });
  }, [students, selectedSchool, selectedClass, searchTerm]);

  // Filtered classes by school
  const filteredClasses = useMemo(() => {
    if (selectedSchool === "all") return classes;
    return classes.filter((c: any) => String(c.ecole_id || c.schoolId) === selectedSchool);
  }, [classes, selectedSchool]);

  // Download QR PNG/SVG
  const telechargerQR = (dataUri: string, filename: string) => {
    if (!dataUri) return;
    const link = document.createElement("a");
    link.href = dataUri;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Téléchargement lancé", description: "Le QR code haute définition a été téléchargé." });
  };

  // Handle Scan Verification
  const handleVerifyScan = (codeToVerify: string) => {
    if (!codeToVerify.trim()) return;
    const query = codeToVerify.trim().toLowerCase();

    if (codeToVerify.includes("|")) {
      const parts = codeToVerify.split("|");
      const matPart = parts.find((p) => p.startsWith("MAT:")) || parts[2] || "";
      const cleanMat = matPart.replace("MAT:", "").trim();

      const found = students.find((s: any) => {
        const m = String(s.AU_MATRICULE || s.matricule || "").toLowerCase();
        return m === cleanMat.toLowerCase();
      });

      if (found) {
        setScannedResult({ type: "eleve", data: found });
        toast({ title: "Badge Élève Authentifié !", description: `${found.AU_NOM} ${found.AU_PRENOM}` });
        return;
      }
    }

    // Direct search in students
    const foundStudent = students.find((s: any) => {
      const m = String(s.AU_MATRICULE || s.matricule || "").toLowerCase();
      return m === query || String(s.id) === query;
    });
    if (foundStudent) {
      setScannedResult({ type: "eleve", data: foundStudent });
      toast({ title: "Badge Élève Authentifié !", description: `${foundStudent.AU_NOM} ${foundStudent.AU_PRENOM}` });
      return;
    }

    // Direct search in staff
    const foundStaff = staffList.find((st: any) => {
      const m = String(st.matricule || st.username || "").toLowerCase();
      return m === query || String(st.id) === query;
    });
    if (foundStaff) {
      setScannedResult({ type: "staff", data: foundStaff });
      toast({ title: "Badge Personnel Authentifié !", description: `${foundStaff.lastName || foundStaff.nom} ${foundStaff.firstName || foundStaff.prenom}` });
      return;
    }

    setScannedResult(null);
    toast({ variant: "destructive", title: "Code non reconnu", description: "Aucun enregistrement ne correspond à cette référence." });
  };

  return (
    <Layout>
      <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
        {/* ── EN-TÊTE DE PAGE SOBRE ET INSTITUTIONNEL ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-[#0f2444] text-white flex items-center justify-center shadow-xs">
              <IdCard className="w-6 h-6 text-slate-100" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
                Cartes d'Identité & Badges Scolaires
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Édition, impression haute définition et contrôle d'authenticité des cartes élèves et personnel.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "single_student" && currentStudent && (
              <Button
                onClick={() => printCarteScolaire(currentStudent.raw)}
                className="gap-2 bg-[#0f2444] hover:bg-[#163564] text-white text-xs font-semibold h-9 shadow-xs"
              >
                <Printer className="w-4 h-4" /> Imprimer la carte
              </Button>
            )}

            {activeTab === "batch_student" && (
              <Button
                onClick={() => printPlancheCartesScolaires(batchStudents)}
                disabled={batchStudents.length === 0}
                className="gap-2 bg-[#0f2444] hover:bg-[#163564] text-white text-xs font-semibold h-9 shadow-xs"
              >
                <Printer className="w-4 h-4" /> Imprimer la planche ({batchStudents.length})
              </Button>
            )}

            {activeTab === "single_staff" && currentStaff && (
              <Button
                onClick={() => printCarteProfessionnelle(currentStaff.raw)}
                className="gap-2 bg-[#0f2444] hover:bg-[#163564] text-white text-xs font-semibold h-9 shadow-xs"
              >
                <Printer className="w-4 h-4" /> Imprimer la carte
              </Button>
            )}

            {activeTab === "batch_staff" && (
              <Button
                onClick={() => printPlancheCartesProfessionnelles(staffList)}
                disabled={staffList.length === 0}
                className="gap-2 bg-[#0f2444] hover:bg-[#163564] text-white text-xs font-semibold h-9 shadow-xs"
              >
                <Printer className="w-4 h-4" /> Imprimer la planche ({staffList.length})
              </Button>
            )}
          </div>
        </div>

        {/* ── ONGLETS DE NAVIGATION ERP ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-slate-100/90 p-1 rounded-lg border border-slate-200/80 w-full max-w-3xl grid grid-cols-2 md:grid-cols-5 mb-6 h-auto">
            <TabsTrigger value="single_student" className="gap-1.5 font-medium text-xs py-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs">
              <GraduationCap className="w-3.5 h-3.5" /> Carte Élève
            </TabsTrigger>
            <TabsTrigger value="batch_student" className="gap-1.5 font-medium text-xs py-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs">
              <Grid className="w-3.5 h-3.5" /> Planche Élèves
            </TabsTrigger>
            <TabsTrigger value="single_staff" className="gap-1.5 font-medium text-xs py-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs">
              <UserCheck className="w-3.5 h-3.5" /> Carte Personnel
            </TabsTrigger>
            <TabsTrigger value="batch_staff" className="gap-1.5 font-medium text-xs py-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs">
              <Building2 className="w-3.5 h-3.5" /> Planche Personnel
            </TabsTrigger>
            <TabsTrigger value="scan" className="gap-1.5 font-medium text-xs py-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs">
              <Scan className="w-3.5 h-3.5" /> Contrôle QR
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════════════════════════════════
              ONGLET 1 : CARTE ÉLÈVE INDIVIDUELLE
             ═══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="single_student" className="space-y-6">
            {/* Barre de sélection et filtrage */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Établissement
                  </label>
                  <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                    <SelectTrigger className="bg-white border-slate-200 h-9 text-xs">
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

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Classe
                  </label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="bg-white border-slate-200 h-9 text-xs">
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

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Élève
                  </label>
                  <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                    <SelectTrigger className="bg-white border-slate-200 h-9 text-xs">
                      <SelectValue placeholder="Sélectionner un élève" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {batchStudents.slice(0, 100).map((st: any) => (
                        <SelectItem key={st.id} value={String(st.id)}>
                        {(st.AU_NOM || st.lastName || st.nom || "—").toUpperCase()} {st.AU_PRENOM || st.firstName || st.prenom || ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Aperçu Réaliste de la Carte Scolaire */}
            {currentStudent ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center">
                  <div className="w-full flex items-center justify-between pb-4 mb-4 border-b border-slate-100 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Aperçu conforme pour impression</span>
                    <span>Format ISO CR-80 (85.6 × 54 mm)</span>
                  </div>

                  {/* CARTE SCOLAIRE AUTHENTIQUE ET INSTITUTIONNELLE */}
                  <div className="w-full max-w-[420px] rounded border border-slate-300 bg-white text-slate-900 shadow-md relative flex flex-col justify-between select-none overflow-hidden">
                    {/* Filigrane de sécurité discret */}
                    <div
                      className="absolute inset-0 pointer-events-none opacity-[0.03]"
                      style={{
                        backgroundImage: "repeating-linear-gradient(45deg, #0f2444 0, #0f2444 2px, transparent 2px, transparent 6px)"
                      }}
                    />

                    {/* EN-TÊTE INSTITUTIONNEL */}
                    <div className="bg-[#0f2444] px-3.5 py-2.5 text-white flex items-center justify-between border-b-2 border-[#b45309] relative z-10">
                      <div className="flex items-center gap-2.5">
                        <div className="relative shrink-0 w-9 h-9 bg-white rounded p-0.5 flex items-center justify-center shadow-xs overflow-hidden">
                          <img
                            src={IMAGES.HINNEH_LOGO_20260507_234919_1}
                            alt="Logo"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div>
                          <p className="text-[7px] font-bold uppercase tracking-wider text-slate-300 leading-none">
                            RÉPUBLIQUE DE CÔTE D'IVOIRE
                          </p>
                          <h3 className="text-[11px] font-extrabold text-white leading-tight mt-0.5 truncate max-w-[200px]">
                            {currentStudent.ecole_nom}
                          </h3>
                          <p className="text-[7px] font-bold text-amber-300 uppercase tracking-wide leading-none mt-0.5">
                            CARTE D'IDENTITÉ SCOLAIRE
                          </p>
                        </div>
                      </div>
                      <span className="text-[8px] font-bold bg-white/10 border border-white/20 text-white px-2 py-0.5 rounded">
                        2026 - 2027
                      </span>
                    </div>

                    {/* CORPS DE LA CARTE */}
                    <div className="p-3.5 flex items-center justify-between gap-3 bg-white relative z-10">
                      {/* PHOTO FORMAT PASSEPORT */}
                      <div className="w-[70px] h-[88px] rounded border border-slate-300 p-0.5 bg-white flex items-center justify-center shrink-0">
                        {currentStudent.photo_url ? (
                          <img src={currentStudent.photo_url} alt="Photo" className="w-full h-full object-cover rounded-[2px]" />
                        ) : (
                          <div className="w-full h-full bg-slate-100 rounded-[2px] flex flex-col items-center justify-center text-slate-700">
                            <span className="font-extrabold text-sm">{(currentStudent.nom[0] || 'E')}{(currentStudent.prenom[0] || 'L')}</span>
                            <span className="text-[6px] font-bold text-slate-400 mt-0.5">PHOTO</span>
                          </div>
                        )}
                      </div>

                      {/* INFORMATIONS DE L'ÉLÈVE */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div>
                          <p className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">Nom & Prénoms</p>
                          <h4 className="font-extrabold text-xs leading-tight text-slate-900 uppercase truncate">
                            {currentStudent.nom} {currentStudent.prenom}
                          </h4>
                        </div>

                        <div className="flex flex-wrap items-center gap-1">
                          <span className="font-mono text-[9px] font-bold text-slate-900 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                            MAT: {currentStudent.matricule}
                          </span>
                          <span className="font-bold text-[9px] text-[#0f2444] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                            {currentStudent.classe}
                          </span>
                        </div>

                        <div className="text-[8.5px] text-slate-600 space-y-0.5 pt-0.5">
                          <p><span className="font-semibold text-slate-500">Né(e) le :</span> {currentStudent.date_naissance}</p>
                          <p><span className="font-semibold text-slate-500">Urgence :</span> {currentStudent.telephone}</p>
                        </div>
                      </div>

                      {/* QR CODE SÉCURISÉ & SIGNATURE */}
                      <div className="flex flex-col items-center shrink-0 w-[96px]">
                        <div className="bg-white p-1 rounded border border-slate-200 shadow-sm">
                          {studentQrDataUri ? (
                            <img src={studentQrDataUri} alt="QR Code" className="w-[48px] h-[48px]" />
                          ) : (
                            <div className="w-[48px] h-[48px] bg-slate-100 animate-pulse rounded" />
                          )}
                        </div>
                        <span className="text-[5px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">Contrôle Scolaire</span>
                        {/* Signature numérique certifiée dans la zone sous le QR code - BIEN VISIBLE */}
                        <div className="mt-1 flex flex-col items-center w-full">
                          <img
                            src="/images/signature_direction_korhogo_transparent.png"
                            alt="Signature & Cachet Officiel"
                            className="h-13 w-auto max-w-[96px] object-contain mix-blend-multiply filter contrast-125 pointer-events-none drop-shadow-sm"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/images/signature_direction_korhogo.png';
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* PIED DE CARTE INSTITUTIONNEL */}
                    <div className="bg-slate-50 px-3 py-1.5 text-slate-600 flex items-center justify-between text-[7px] font-medium border-t border-slate-200 relative z-10">
                      <span>Direction des Études</span>
                      <span className="text-emerald-800 font-bold uppercase tracking-wider">Document Officiel Élève</span>
                      {((currentStudent.ecole_nom || '').toLowerCase().includes('korhogo') || (currentStudent.classe || '').toLowerCase().includes('korhogo') || (currentStudent.matricule || '').toLowerCase().includes('kho') || (currentStudent.ecole_code || '').toLowerCase().includes('csh-02') || (currentStudent.raw?.ville || '').toLowerCase().includes('korhogo') || (currentStudent.raw?.ET_VILLE || '').toLowerCase().includes('korhogo')) ? (
                        <div className="flex items-center gap-1">
                          <img
                            src="/images/signature_direction_korhogo_transparent.png"
                            alt="Visa Korhogo"
                            className="h-4.5 max-w-[55px] object-contain mix-blend-multiply filter contrast-125"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/images/signature_direction_korhogo.png';
                            }}
                          />
                          <span className="font-extrabold text-[#0f2444]">Visa Korhogo</span>
                        </div>
                      ) : (
                        <span>Visa Direction</span>
                      )}
                    </div>
                  </div>

                  <div className="w-full text-center mt-4 text-[11px] text-slate-400">
                    Résolution 300 DPI • Impression recto sur carte PVC ou papier couché 300g
                  </div>
                </div>

                {/* Panneau d'actions et détails */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Actions d'impression</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Génération du document physique et exportation des données</p>
                    </div>

                    <div className="space-y-2">
                      <Button
                        onClick={() => printCarteScolaire(currentStudent.raw)}
                        className="w-full gap-2 bg-[#0f2444] hover:bg-[#163564] text-white font-semibold text-xs h-9 shadow-xs"
                      >
                        <Printer className="w-4 h-4" /> Imprimer la carte scolaire
                      </Button>

                      <Button
                        onClick={() => telechargerQR(studentQrDataUri, `qr_eleve_${currentStudent.matricule}.svg`)}
                        variant="outline"
                        className="w-full gap-2 border-slate-200 text-slate-700 text-xs h-9"
                      >
                        <Download className="w-4 h-4 text-slate-500" /> Télécharger le QR Code (SVG)
                      </Button>

                      <Button
                        onClick={() => navigate(`/dossier-eleve/${currentStudent.id}`)}
                        variant="secondary"
                        className="w-full gap-2 text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs h-9"
                      >
                        <FileText className="w-4 h-4 text-slate-500" /> Consulter le dossier scolaire
                      </Button>
                    </div>
                  </div>

                  {/* Résumé de l'élève */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-xs">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-bold text-xs text-slate-900">Données sécurisées du badge</h4>
                    </div>

                    <div className="text-xs space-y-2 text-slate-600">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Identifiant Unique :</span>
                        <span className="font-mono font-semibold text-slate-900">#{currentStudent.id}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Matricule Officiel :</span>
                        <span className="font-mono font-bold text-slate-900">{currentStudent.matricule}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Classe assignée :</span>
                        <span className="font-medium text-slate-900">{currentStudent.classe}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Établissement :</span>
                        <span className="font-medium text-slate-900">{currentStudent.ecole_nom}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Code Établissement :</span>
                        <span className="font-mono font-semibold text-slate-900">{currentStudent.ecole_code}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
                <SchoolIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-semibold">Aucun élève sélectionné</p>
                <p className="text-xs text-slate-400 mt-1">Veuillez sélectionner un établissement et un élève pour afficher son badge.</p>
              </div>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════
              ONGLET 2 : PLANCHE DE CARTES SCOLAIRES (PAR CLASSE)
             ═══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="batch_student" className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Planche de badges élèves</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Impression groupée prête pour plastification / découpe (8 badges par page A4)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 h-9 text-xs w-48">
                      <SelectValue placeholder="Choisir une classe..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les classes</SelectItem>
                      {classes.map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.CE_LIBELLE || c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={() => printPlancheCartesScolaires(batchStudents)}
                    disabled={batchStudents.length === 0}
                    className="gap-2 bg-[#0f2444] hover:bg-[#163564] text-white text-xs font-semibold h-9 shadow-xs"
                  >
                    <Printer className="w-4 h-4" /> Imprimer ({batchStudents.length})
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {batchStudents.slice(0, 12).map((st: any) => {
                  const nomComplet = `${st.AU_NOM || st.lastName || ""} ${st.AU_PRENOM || st.firstName || ""}`.trim();
                  const matricule = st.AU_MATRICULE || st.matricule || `MAT-${st.id}`;
                  const classeNom = resolveStudentClassName(st, classes) || "Classe standard";
                  const qrUri = generateQRCodeDataURI(`ELEVE|ID:${st.id}|MAT:${matricule}|NOM:${st.AU_NOM}|PRENOM:${st.AU_PRENOM}|CLS:${classeNom}`, 140);

                  return (
                    <div
                      key={st.id}
                      className="rounded-lg border border-slate-200 bg-white p-3 space-y-2 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-[8px] font-bold text-[#0f2444] uppercase tracking-wide">Carte Scolaire</span>
                        <span className="text-[7.5px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          2026-2027
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 uppercase truncate">{nomComplet}</h4>
                          <p className="text-[9px] font-mono text-slate-600 font-semibold">{matricule}</p>
                          <span className="inline-block text-[8px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{classeNom}</span>
                        </div>
                        <div className="border border-slate-200 p-0.5 rounded bg-white shrink-0">
                          <img src={qrUri} alt="QR" className="w-11 h-11" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {batchStudents.length > 12 && (
                <p className="text-xs text-center text-slate-500 pt-2">
                  {batchStudents.length - 12} autres cartes seront générées sur les pages suivantes lors de l'impression.
                </p>
              )}
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════
              ONGLET 3 : CARTE PROFESSIONNELLE DU PERSONNEL
             ═══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="single_staff" className="space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Membre du personnel ou enseignant
                  </label>
                  <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                    <SelectTrigger className="bg-white border-slate-200 h-9 text-xs">
                      <SelectValue placeholder="Choisir un agent..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {staffList.map((st: any) => (
                        <SelectItem key={st.id} value={String(st.id)}>
                          {formatStudentName(st)} — {(st.fonctionExercee || st.fonction || st.role || "Personnel").toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {currentStaff ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center">
                  <div className="w-full flex items-center justify-between pb-4 mb-4 border-b border-slate-100 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Aperçu Carte Professionnelle</span>
                    <span>Format ISO CR-80 (85.6 × 54 mm)</span>
                  </div>
                  {/* CARTE PROFESSIONNELLE AUTHENTIQUE */}
                  <div className="w-full max-w-[420px] rounded border border-slate-300 bg-white text-slate-900 shadow-md relative flex flex-col justify-between select-none overflow-hidden">
                    {/* Filigrane discret */}
                    <div
                      className="absolute inset-0 pointer-events-none opacity-[0.03]"
                      style={{
                        backgroundImage: "repeating-linear-gradient(45deg, #0f2444 0, #0f2444 2px, transparent 2px, transparent 6px)"
                      }}
                    />

                    {/* EN-TÊTE INSTITUTIONNEL */}
                    <div className="bg-[#0f2444] px-3.5 py-2.5 text-white flex items-center justify-between border-b-2 border-[#b45309] relative z-10">
                      <div className="flex items-center gap-2.5">
                        <div className="relative shrink-0 w-9 h-9 bg-white rounded p-0.5 flex items-center justify-center shadow-xs overflow-hidden">
                          <img
                            src={IMAGES.HINNEH_LOGO_20260507_234919_1}
                            alt="Logo"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div>
                          <p className="text-[7px] font-bold uppercase tracking-wider text-slate-300 leading-none">
                            Fondation Hinneh • Côte d'Ivoire
                          </p>
                          <h3 className="text-[11px] font-extrabold text-white leading-tight mt-0.5 truncate max-w-[200px]">
                            {currentStaff.ecole_nom}
                          </h3>
                          <p className="text-[7px] font-bold text-amber-300 uppercase tracking-wide leading-none mt-0.5">
                            Carte Professionnelle d'Agent
                          </p>
                        </div>
                      </div>
                      <span className="text-[8px] font-bold bg-white/10 border border-white/20 text-white px-2 py-0.5 rounded">
                        2026 - 2027
                      </span>
                    </div>

                    {/* CORPS DE LA CARTE */}
                    <div className="p-3.5 flex items-center justify-between gap-3 bg-white relative z-10">
                      {/* PHOTO FORMAT PASSEPORT */}
                      <div className="w-[70px] h-[88px] rounded border border-slate-300 p-0.5 bg-white flex items-center justify-center shrink-0">
                        {currentStaff.photo_url ? (
                          <img src={currentStaff.photo_url} alt="Photo" className="w-full h-full object-cover rounded-[2px]" />
                        ) : (
                          <div className="w-full h-full bg-slate-100 rounded-[2px] flex flex-col items-center justify-center text-slate-700">
                            <span className="font-extrabold text-sm">{(currentStaff.nom[0] || 'P')}{(currentStaff.prenom[0] || 'S')}</span>
                            <span className="text-[6px] font-bold text-slate-400 mt-0.5">PHOTO</span>
                          </div>
                        )}
                      </div>

                      {/* DONNÉES DE L'AGENT */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div>
                          <p className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">Nom & Prénoms</p>
                          <h4 className="font-extrabold text-xs leading-tight text-slate-900 uppercase truncate">
                            {currentStaff.nom} {currentStaff.prenom}
                          </h4>
                        </div>

                        <div>
                          <span className="font-bold text-[8.5px] text-slate-900 bg-slate-100 border-l-2 border-[#0f2444] px-1.5 py-0.5 rounded-r inline-block uppercase truncate max-w-[170px]">
                            {currentStaff.fonction}
                          </span>
                        </div>

                        <div className="text-[8px] text-slate-600 space-y-0.5 pt-0.5">
                          <p><span className="font-semibold text-slate-500">Service :</span> {currentStaff.service}</p>
                          <p><span className="font-semibold text-slate-500">Matricule :</span> <span className="font-mono font-bold text-slate-900">{currentStaff.matricule}</span></p>
                          <p><span className="font-semibold text-slate-500">Contact :</span> {currentStaff.telephone}</p>
                        </div>
                      </div>

                      {/* QR CODE SÉCURISÉ & SIGNATURE */}
                      <div className="flex flex-col items-center shrink-0 w-[96px]">
                        <div className="bg-white p-1 rounded border border-slate-200 shadow-sm">
                          {staffQrDataUri ? (
                            <img src={staffQrDataUri} alt="QR Code" className="w-[48px] h-[48px]" />
                          ) : (
                            <div className="w-[48px] h-[48px] bg-slate-100 animate-pulse rounded" />
                          )}
                        </div>
                        <span className="text-[5px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">Authentifié RH</span>
                        {/* Signature numérique certifiée dans la zone sous le QR code - BIEN VISIBLE */}
                        <div className="mt-1 flex flex-col items-center w-full">
                          <img
                            src="/images/signature_direction_korhogo_transparent.png"
                            alt="Signature & Cachet Officiel"
                            className="h-13 w-auto max-w-[96px] object-contain mix-blend-multiply filter contrast-125 pointer-events-none drop-shadow-sm"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/images/signature_direction_korhogo.png';
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* PIED DE CARTE */}
                    <div className="bg-slate-50 px-3 py-1.5 text-slate-600 flex items-center justify-between text-[7px] font-medium border-t border-slate-200 relative z-10">
                      <span>{currentStaff.ecole_nom || "Fondation Hinneh"}</span>
                      <span className="text-emerald-800 font-bold uppercase tracking-wider">Personnel Enregistré</span>
                      {((currentStaff.ecole_nom || '').toLowerCase().includes('korhogo') || (currentStaff.matricule || '').toLowerCase().includes('kho') || (currentStaff.raw?.ville || '').toLowerCase().includes('korhogo') || (currentStaff.raw?.ET_VILLE || '').toLowerCase().includes('korhogo')) ? (
                        <div className="flex items-center gap-1">
                          <img
                            src="/images/signature_direction_korhogo_transparent.png"
                            alt="Visa Korhogo"
                            className="h-4.5 max-w-[55px] object-contain mix-blend-multiply filter contrast-125"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/images/signature_direction_korhogo.png';
                            }}
                          />
                          <span className="font-extrabold text-[#0f2444]">Visa Korhogo</span>
                        </div>
                      ) : (
                        <span>Visa Direction</span>
                      )}
                    </div>
                  </div>

                  <div className="w-full text-center mt-4 text-[11px] text-slate-400">
                    Résolution 300 DPI • Impression recto carte professionnelle
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Actions carte professionnelle</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Impression et exportation des données de l'agent</p>
                    </div>

                    <div className="space-y-2">
                      <Button
                        onClick={() => printCarteProfessionnelle(currentStaff.raw)}
                        className="w-full gap-2 bg-[#0f2444] hover:bg-[#163564] text-white font-semibold text-xs h-9 shadow-xs"
                      >
                        <Printer className="w-4 h-4" /> Imprimer la carte professionnelle
                      </Button>

                      <Button
                        onClick={() => telechargerQR(staffQrDataUri, `qr_personnel_${currentStaff.matricule}.svg`)}
                        variant="outline"
                        className="w-full gap-2 border-slate-200 text-slate-700 text-xs h-9"
                      >
                        <Download className="w-4 h-4 text-slate-500" /> Télécharger le QR Code
                      </Button>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                      <span className="font-semibold text-slate-700 block">Informations de l'agent</span>
                      <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 text-slate-600">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Matricule :</span>
                          <span className="font-mono font-bold text-slate-900">{currentStaff.matricule}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Fonction :</span>
                          <span className="font-medium text-slate-900">{currentStaff.fonction}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Contact :</span>
                          <span className="font-medium text-slate-900">{currentStaff.telephone}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════
              ONGLET 4 : PLANCHE PERSONNEL MULTI-CARTES
             ═══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="batch_staff" className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-600" /> Planche A4 — Personnel de l'établissement ({staffList.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Impression groupée des cartes professionnelles sur feuilles A4 prédécoupées.
                  </p>
                </div>
                <Button
                  onClick={() => printPlancheCartesProfessionnelles(staffList)}
                  disabled={staffList.length === 0}
                  className="gap-2 bg-[#0f2444] hover:bg-[#163564] text-white text-xs font-semibold h-9 shadow-xs"
                >
                  <Printer className="w-4 h-4" /> Imprimer toute la planche
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {staffList.slice(0, 12).map((st: any) => {
                  const nomComplet = formatStudentName(st);
                  const fonction = (st.fonctionExercee || st.fonction || st.role || "Personnel").toUpperCase();
                  const matricule = st.matricule || (st.username && !st.username.includes('@') ? st.username : `PERS-${String(st.id || '01').padStart(3, '0')}`);
                  const qrUri = generateQRCodeDataURI(`PERS|ID:${st.id}|MAT:${matricule}|NOM:${nomComplet}|CONTACT:${st.phone || st.telephone || '—'}|ROLE:${fonction}`, 140);

                  return (
                    <div
                      key={st.id}
                      className="rounded-lg border border-slate-200 bg-white p-3 space-y-2 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-[8px] font-bold text-[#0f2444] uppercase tracking-wide">Carte Professionnelle</span>
                        <span className="text-[7.5px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          2026-2027
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 uppercase truncate">{nomComplet}</h4>
                          <span className="inline-block text-[8px] font-bold text-slate-800 bg-slate-100 border-l-2 border-[#0f2444] px-1.5 py-0.5 rounded-r uppercase">{fonction}</span>
                          <div><span className="font-mono text-[8px] text-slate-500 font-semibold">{matricule}</span></div>
                        </div>
                        <div className="border border-slate-200 p-0.5 rounded bg-white shrink-0">
                          <img src={qrUri} alt="QR" className="w-11 h-11" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════
              ONGLET 5 : SCANNER / VÉRIFICATEUR DE BADGES
             ═══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="scan" className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl mx-auto space-y-4 shadow-xs">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Scan className="w-4 h-4 text-slate-700" /> Contrôle d'authenticité de carte QR
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Saisissez ou scannez le code d'un élève ou personnel pour vérifier sa validité.
                </p>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Scannez ou saisissez la référence (ex: ELEVE|ID:1|MAT:HE20260001...)"
                  value={scannedCode}
                  onChange={(e) => setScannedCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyScan(scannedCode)}
                  className="font-mono text-xs h-9 border-slate-200"
                />
                <Button onClick={() => handleVerifyScan(scannedCode)} className="gap-2 bg-[#0f2444] hover:bg-[#163564] text-white text-xs font-semibold h-9">
                  <Search className="w-4 h-4" /> Vérifier
                </Button>
              </div>

              {scannedResult && (
                <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Carte Authentique et Valide
                    </div>
                    <span className="text-[11px] font-mono font-bold text-emerald-900">
                      {scannedResult.type === "eleve" ? `ÉLÈVE #${scannedResult.data.id}` : `PERSONNEL #${scannedResult.data.id}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <div className="w-11 h-11 rounded bg-slate-800 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                      {((scannedResult.data.AU_NOM || scannedResult.data.lastName || "P")[0]).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 uppercase">
                        {scannedResult.data.AU_NOM || scannedResult.data.lastName} {scannedResult.data.AU_PRENOM || scannedResult.data.firstName}
                      </h4>
                      <p className="text-xs font-mono text-slate-600 font-semibold">
                        Matricule : {scannedResult.data.AU_MATRICULE || scannedResult.data.matricule || `ID-${scannedResult.data.id}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        {scannedResult.type === "eleve" ? `Classe : ${resolveStudentClassName(scannedResult.data, classes)}` : `Fonction : ${scannedResult.data.fonction || scannedResult.data.role}`}
                      </p>
                    </div>
                  </div>

                  {scannedResult.type === "eleve" && (
                    <div className="pt-2">
                      <Button
                        size="sm"
                        onClick={() => navigate(`/dossier-eleve/${scannedResult.data.id}`)}
                        className="gap-1.5 text-xs bg-[#0f2444] hover:bg-[#163564] text-white font-medium h-8"
                      >
                        <FileText className="w-3.5 h-3.5" /> Consulter le dossier élève
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default BadgesQRSpace;
