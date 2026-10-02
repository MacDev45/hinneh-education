import { useState, useEffect, useRef } from 'react';
import apiClient from '@/lib/apiClient';
import { useParams, useNavigate } from 'react-router-dom';
import type { School, Student, ClassRoom, Evaluation, Payment, Attendance } from '@/lib/index';
import { formatStudentName } from '@/lib/index';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  BookOpen,
  Heart,
  AlertCircle,
  DollarSign,
  FileText,
  ArrowLeft,
  Edit,
  Printer,
  Download,
  TrendingUp,
  TrendingDown,
  Camera,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { MetricCard } from '@/components/Stats';
import { ConfessionalProgressChart } from '@/components/Charts';
import {
  formatCurrency,
  formatDate,
  calculateAge,
  getStatusBadgeColor,
  getSeverityColor,
  ROUTE_PATHS,
} from '@/lib/index';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { printBulletins } from '@/lib/bulletinPrinter';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('identite');

  const [student, setStudent] = useState<Student | undefined>(undefined);
  const [showPrintTrimesterModal, setShowPrintTrimesterModal] = useState(false);
  const [selectedTrimester, setSelectedTrimester] = useState('1');
  const [recapModalOpen, setRecapModalOpen] = useState(false);
  const [recapData, setRecapData] = useState<any>(null);
  const [loadingRecap, setLoadingRecap] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Edit fields and classes state
  const [classes, setClasses] = useState<any[]>([]);
  const [changeClassOpen, setChangeClassOpen] = useState(false);
  const [targetClassId, setTargetClassId] = useState<string>('');
  
  const [editRegimeOpen, setEditRegimeOpen] = useState(false);
  const [targetRegime, setTargetRegime] = useState<string>('');

  const [editHabitationOpen, setEditHabitationOpen] = useState(false);
  const [commune, setCommune] = useState('');
  const [quartier, setQuartier] = useState('');
  const [adresseGeo, setAdresseGeo] = useState('');

  const handleUpdateStudentField = async (fields: Record<string, any>) => {
    if (!id) return;
    try {
      const updated = await apiClient.updateStudent(id, fields);
      setStudent(updated);
      toast({
        title: "Mise à jour réussie",
        description: "Les informations de l'élève ont été mises à jour.",
      });
      // reload details
      apiClient.getStudent(id).then(data => {
        if (data) setStudent(data);
      });
      if (fields.classe_id && student?.schoolId) {
        // reload class
        apiClient.getClass(fields.classe_id).then(data => {
          if (data) setClassRoom(data);
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: err.response?.data?.detail || "Impossible de mettre à jour l'élève.",
      });
    }
  };

  const handleOpenRecapModal = async () => {
    if (!id) return;
    setLoadingRecap(true);
    try {
      const res = await apiClient.get(`/api/caisse/eleve/${id}/recu-recapitulatif`);
      setRecapData(res.data);
      setRecapModalOpen(true);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur de chargement",
        description: err.response?.data?.detail || "Impossible de générer le reçu récapitulatif global.",
      });
    } finally {
      setLoadingRecap(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id || !student) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const updated = await apiClient.updateStudent(id, { photo: base64String });
        setStudent(updated);
        toast({
          title: "Photo importée",
          description: "La photo de l'élève a été mise à jour avec succès.",
        });
      } catch (err) {
        console.error(err);
        toast({
          variant: "destructive",
          title: "Erreur d'importation",
          description: "Impossible d'enregistrer la photo de l'élève.",
        });
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (id) {
      apiClient.getStudent(id)
        .then((data) => {
          if (data) setStudent(data);
        })
        .catch((err) => {
          console.error("Failed to fetch student details from API", err);
        });
    }
    // Fetch classes list
    apiClient.getClasses()
      .then((data) => {
        if (data) setClasses(data);
      })
      .catch((err) => {
        console.error("Failed to fetch classes list", err);
      });
  }, [id]);

  const [school, setSchool] = useState<School | null>(null);
  const [classRoom, setClassRoom] = useState<ClassRoom | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  useEffect(() => {
    if (student) {
      const numericId = parseInt(student.id, 10);
      if (!isNaN(numericId)) {
        apiClient.getSchool(student.schoolId)
          .then(data => { if (data) setSchool(data); })
          .catch(err => console.error(err));

        if (student.classId) {
          apiClient.getClass(student.classId)
            .then(data => { if (data) setClassRoom(data); })
            .catch(err => {
              console.error(err);
              setClassRoom({
                id: student.classId,
                name: 'Classe ' + student.classId,
                niveau: '',
                cycle: 'primaire',
                schoolId: student.schoolId,
                teacherId: '',
                studentCount: 0,
                capacity: 50,
                createdAt: new Date()
              });
            });
        }

        apiClient.getEvaluations({ eleve_id: numericId })
          .then(data => { if (data) setEvaluations(data); })
          .catch(err => console.error(err));

        apiClient.getPayments({ eleve_id: numericId })
          .then(data => { if (data) setPayments(data); })
          .catch(err => console.error(err));

        apiClient.getAttendance({ eleve_id: numericId })
          .then(data => { if (data) setAttendance(data); })
          .catch(err => console.error(err));
      }
    }
  }, [student]);

  const parents: any[] = [];
  const confessionalRecords: any[] = [];
  const incidents: any[] = [];

  if (!student) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">Élève introuvable</h2>
            <p className="text-muted-foreground mb-6">
              L'élève demandé n'existe pas ou a été supprimé.
            </p>
            <Button onClick={() => navigate(ROUTE_PATHS.STUDENTS)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à la liste
            </Button>
          </Card>
        </div>
      </Layout>
    );
  }

  const handlePrintBulletin = () => {
    if (!student) return;
    printBulletins([student], evaluations, classRoom, school, Number(selectedTrimester));
    setShowPrintTrimesterModal(false);
  };

  const age = calculateAge(student.dateOfBirth);
  const initials = `${student.firstName[0]}${student.lastName[0]}`;

  const presentCount = attendance.filter((a) => a.status === 'present').length;
  const absentCount = attendance.filter((a) => a.status === 'absent').length;
  const lateCount = attendance.filter((a) => a.status === 'retard').length;
  const attendanceRate =
    attendance.length > 0 ? ((presentCount / attendance.length) * 100).toFixed(1) : '0';

  const totalPaid = payments
    .filter((p) => p.status === 'paye')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments
    .filter((p) => p.status === 'en_attente')
    .reduce((sum, p) => sum + p.amount, 0);

  const subjectGrades: Record<string, { notes: number[]; coef: number }> = {};
  evaluations.forEach((e) => {
    if (!subjectGrades[e.subject]) {
      subjectGrades[e.subject] = { notes: [], coef: e.coefficient };
    }
    subjectGrades[e.subject].notes.push(e.note);
  });

  const subjectAverages = Object.entries(subjectGrades).map(([subject, data]) => {
    const avg = data.notes.reduce((sum, n) => sum + n, 0) / data.notes.length;
    return { subject, average: avg.toFixed(2), coef: data.coef };
  });

  const overallAverage = student.moyenne.toFixed(2);

  const memorizedSurahs = confessionalRecords.filter((c) => c.status === 'memorise').length;
  const inProgressSurahs = confessionalRecords.filter((c) => c.status === 'en_cours').length;
  const totalSurahs = confessionalRecords.length;
  const quranProgress =
    totalSurahs > 0 ? ((memorizedSurahs / totalSurahs) * 100).toFixed(1) : '0';

  const avgTajwid =
    confessionalRecords.filter((c) => c.tajwidScore).length > 0
      ? (
          confessionalRecords
            .filter((c) => c.tajwidScore)
            .reduce((sum, c) => sum + (c.tajwidScore || 0), 0) /
          confessionalRecords.filter((c) => c.tajwidScore).length
        ).toFixed(1)
      : 'N/A';

  const attendanceHeatmap = attendance.slice(-30).map((a) => ({
    date: formatDate(a.date),
    status: a.status,
  }));

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(ROUTE_PATHS.STUDENTS)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la liste
          </Button>
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold shadow-sm"
              onClick={handleOpenRecapModal}
              disabled={loadingRecap}
            >
              <FileText className="w-4 h-4" />
              {loadingRecap ? "Génération..." : "Reçu Récapitulatif Global"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowPrintTrimesterModal(true)}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimer Bulletin
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <Avatar className="w-24 h-24 border">
                  <AvatarImage src={student.photo} className="object-cover" />
                  <AvatarFallback className="text-2xl font-semibold bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Camera className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-medium uppercase tracking-wider">Modifier</span>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">
                      {formatStudentName(student)}
                    </h1>
                    <div className="flex items-center gap-4 text-muted-foreground mb-3">
                      <span className="font-mono text-sm">{student.matricule}</span>
                      <Separator orientation="vertical" className="h-4" />
                      <span>{classRoom?.name || student.className || 'Classe inconnue'}</span>
                      <Separator orientation="vertical" className="h-4" />
                      <span>{school?.name || 'Chargement...'}</span>
                      <Separator orientation="vertical" className="h-4" />
                      <span className="text-xs font-semibold text-slate-700">📍 {student.lieu_habitation || "Habitation non spécifiée"}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant={getStatusBadgeColor(student.status)}>
                        {student.status === 'actif'
                          ? 'Actif'
                          : student.status === 'radie'
                          ? 'Radié'
                          : student.status === 'preinscrit'
                          ? 'Préinscrit'
                          : 'Transféré'}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`font-semibold ${
                          (student.regime || "Non-boursier") === "Boursier"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                            : (student.regime || "Non-boursier") === "Demi-boursier"
                            ? "bg-amber-50 text-amber-700 border-amber-300"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {student.regime || "Non-boursier"}
                      </Badge>
                      {student.AU_MONTANTARRIERE && student.AU_MONTANTARRIERE > 0 ? (
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 font-semibold">
                          ⚠️ Arriérés: {formatCurrency(student.AU_MONTANTARRIERE)}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 mt-6">
                  <MetricCard
                    label="Moyenne générale"
                    value={`${overallAverage}/20`}
                    icon={<GraduationCap className="w-4 h-4" />}
                  />
                  <MetricCard
                    label="Taux de présence"
                    value={`${attendanceRate}%`}
                    icon={<Calendar className="w-4 h-4" />}
                  />
                  <MetricCard
                    label="Progression Coran"
                    value={`${quranProgress}%`}
                    icon={<BookOpen className="w-4 h-4" />}
                  />
                  <MetricCard
                    label="Solde dû"
                    value={formatCurrency(Math.abs(student.solde))}
                    icon={<DollarSign className="w-4 h-4" />}
                    color={student.solde < 0 ? 'destructive' : 'default'}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="identite">Identité</TabsTrigger>
            <TabsTrigger value="scolarite">Scolarité</TabsTrigger>
            <TabsTrigger value="confessionnel">Confessionnel</TabsTrigger>
            <TabsTrigger value="vie_scolaire">Vie scolaire</TabsTrigger>
            <TabsTrigger value="finances">Finances</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="identite" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>État civil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Nom complet
                    </label>
                    <p className="text-lg font-semibold">
                      {formatStudentName(student)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Matricule
                    </label>
                    <p className="text-lg font-mono">{student.matricule}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Date de naissance
                    </label>
                    <p className="text-lg">
                      {formatDate(student.dateOfBirth)} ({age} ans)
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Sexe</label>
                    <p className="text-lg">{student.gender === 'M' ? 'Masculin' : 'Féminin'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Établissement
                    </label>
                    <p className="text-lg">{school?.name || 'Chargement...'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                      Classe
                      <Button size="xs" variant="ghost" className="h-5 text-[10px] text-indigo-600 p-0 hover:bg-transparent" onClick={() => {
                        setTargetClassId(student.classId || '');
                        setChangeClassOpen(true);
                      }}>Modifier</Button>
                    </label>
                    <p className="text-lg font-semibold">{classRoom?.name || 'Non assigné'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                      Régime / Bourse
                      <Button size="xs" variant="ghost" className="h-5 text-[10px] text-indigo-600 p-0 hover:bg-transparent" onClick={() => {
                        setTargetRegime(student.regime || 'Non-boursier');
                        setEditRegimeOpen(true);
                      }}>Modifier</Button>
                    </label>
                    <p className="text-lg font-semibold capitalize">{student.regime || "Non-boursier"}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                      Lieu d'habitation (pour Transport)
                      <Button size="xs" variant="ghost" className="h-5 text-[10px] text-indigo-600 p-0 hover:bg-transparent" onClick={() => {
                        setCommune(student.AU_COMMUNE || '');
                        setQuartier(student.AU_QUARTIER || '');
                        setAdresseGeo(student.AU_ADRESSE_GEO || '');
                        setEditHabitationOpen(true);
                      }}>Modifier</Button>
                    </label>
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
                      📍 {[student.AU_COMMUNE, student.AU_QUARTIER, student.AU_ADRESSE_GEO].filter(Boolean).join(" - ") || student.AU_ADRESSE_POSTALE || "Non renseigné"}
                    </p>
                  </div>
                </div>
                {student.healthNotes && (
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <div className="flex items-start gap-2">
                      <Heart className="w-5 h-5 text-destructive mt-0.5" />
                      <div>
                        <p className="font-medium">Notes de santé</p>
                        <p className="text-sm text-muted-foreground">{student.healthNotes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contacts parents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {parents.map((parent) => (
                    <div
                      key={parent.id}
                      className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <p className="font-semibold">
                              {formatStudentName(parent)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-4 h-4" />
                            <span>{parent.phone}</span>
                          </div>
                          {parent.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="w-4 h-4" />
                              <span>{parent.email}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span>{parent.address}</span>
                          </div>
                          {parent.profession && (
                            <div className="text-sm">
                              <span className="font-medium">Profession:</span> {parent.profession}
                            </div>
                          )}
                        </div>
                        <Button variant="outline" size="sm">
                          Contacter
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scolarite" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Parcours scolaire</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Classe actuelle
                      </label>
                      <p className="text-lg font-semibold">{classRoom?.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Cycle</label>
                      <p className="text-lg capitalize">{classRoom?.cycle}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Année scolaire
                      </label>
                      <p className="text-lg">2025-2026</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notes et moyennes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 bg-primary/10 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Moyenne générale</p>
                      <p className="text-3xl font-bold">{overallAverage}/20</p>
                    </div>
                    {student.rank && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Rang</p>
                        <p className="text-3xl font-bold">{student.rank}e</p>
                      </div>
                    )}
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Matière</TableHead>
                      <TableHead className="text-center">Coefficient</TableHead>
                      <TableHead className="text-center">Moyenne</TableHead>
                      <TableHead className="text-center">Appréciation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjectAverages.map((item) => {
                      const avg = parseFloat(item.average);
                      return (
                        <TableRow key={item.subject}>
                          <TableCell className="font-medium">{item.subject}</TableCell>
                          <TableCell className="text-center">{item.coef}</TableCell>
                          <TableCell className="text-center">
                            <span
                              className={`font-semibold ${
                                avg >= 16
                                  ? 'text-green-600'
                                  : avg >= 14
                                  ? 'text-blue-600'
                                  : avg >= 10
                                  ? 'text-yellow-600'
                                  : 'text-destructive'
                              }`}
                            >
                              {item.average}/20
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {avg >= 16
                              ? 'Très bien'
                              : avg >= 14
                              ? 'Bien'
                              : avg >= 12
                              ? 'Assez bien'
                              : avg >= 10
                              ? 'Passable'
                              : 'Insuffisant'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dernières évaluations</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Matière</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Note</TableHead>
                      <TableHead>Appréciation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluations.slice(0, 10).map((evalItem) => (
                      <TableRow key={evalItem.id}>
                        <TableCell>{formatDate(evalItem.date)}</TableCell>
                        <TableCell className="font-medium">{evalItem.subject}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {evalItem.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`font-semibold ${
                              evalItem.note >= 16
                                ? 'text-green-600'
                                : evalItem.note >= 14
                                ? 'text-blue-600'
                                : evalItem.note >= 10
                                ? 'text-yellow-600'
                                : 'text-destructive'
                            }`}
                          >
                            {evalItem.note}/20
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {evalItem.appreciation || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="confessionnel" className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground mb-1">Sourates mémorisées</p>
                    <p className="text-3xl font-bold">{memorizedSurahs}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <GraduationCap className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground mb-1">Progression Coran</p>
                    <p className="text-3xl font-bold">{quranProgress}%</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Heart className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground mb-1">Niveau Tajwid</p>
                    <p className="text-3xl font-bold">{avgTajwid}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Progression Coran</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <ConfessionalProgressChart />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Détail des sourates</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sourate</TableHead>
                      <TableHead className="text-center">Statut</TableHead>
                      <TableHead className="text-center">Progression</TableHead>
                      <TableHead className="text-center">Tajwid</TableHead>
                      <TableHead>Dernière révision</TableHead>
                      <TableHead>Observations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {confessionalRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.surahNumber}. {record.surah}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={getStatusBadgeColor(record.status)}>
                            {record.status === 'memorise'
                              ? 'Mémorisé'
                              : record.status === 'en_cours'
                              ? 'En cours'
                              : 'Non débuté'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={record.progressPercentage} className="flex-1" />
                            <span className="text-sm font-medium w-12 text-right">
                              {record.progressPercentage}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {record.tajwidScore ? (
                            <span className="font-semibold">{record.tajwidScore}/100</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.revisionDate ? (
                            formatDate(record.revisionDate)
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {record.observations || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vie_scolaire" className="space-y-6">
            <div className="grid grid-cols-4 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-2xl">✓</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">Présences</p>
                    <p className="text-2xl font-bold">{presentCount}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-red-100 flex items-center justify-center">
                      <span className="text-2xl">✗</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">Absences</p>
                    <p className="text-2xl font-bold">{absentCount}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-yellow-100 flex items-center justify-center">
                      <span className="text-2xl">⏱</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">Retards</p>
                    <p className="text-2xl font-bold">{lateCount}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-2xl">%</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">Taux présence</p>
                    <p className="text-2xl font-bold">{attendanceRate}%</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Calendrier de présence (30 derniers jours)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-10 gap-2">
                  {attendanceHeatmap.map((item, index) => {
                    const bgColor =
                      item.status === 'present'
                        ? 'bg-green-500'
                        : item.status === 'absent'
                        ? 'bg-red-500'
                        : item.status === 'retard'
                        ? 'bg-yellow-500'
                        : 'bg-blue-500';
                    return (
                      <div
                        key={index}
                        className={`h-8 rounded ${bgColor} hover:opacity-80 transition-opacity cursor-pointer`}
                        title={`${item.date}: ${item.status}`}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500" />
                    <span>Présent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-500" />
                    <span>Absent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-yellow-500" />
                    <span>Retard</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-500" />
                    <span>Excusé</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Incidents disciplinaires</CardTitle>
              </CardHeader>
              <CardContent>
                {incidents.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Gravité</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Action prise</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incidents.map((incident) => (
                        <TableRow key={incident.id}>
                          <TableCell>{formatDate(incident.date)}</TableCell>
                          <TableCell className="font-medium">{incident.type}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeColor(incident.severity)}>
                              {incident.severity === 'mineur'
                                ? 'Mineur'
                                : incident.severity === 'moyen'
                                ? 'Moyen'
                                : 'Grave'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{incident.description}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeColor(incident.status)}>
                              {incident.status === 'ouvert'
                                ? 'Ouvert'
                                : incident.status === 'en_cours'
                                ? 'En cours'
                                : 'Résolu'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {incident.actionTaken || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Aucun incident disciplinaire enregistré</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finances" className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
                    <p className="text-sm text-muted-foreground mb-1">Total payé</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(totalPaid)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                    <p className="text-sm text-muted-foreground mb-1">En attente</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {formatCurrency(totalPending)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <TrendingDown className="w-8 h-8 mx-auto mb-2 text-destructive" />
                    <p className="text-sm text-muted-foreground mb-1">Solde dû</p>
                    <p className="text-2xl font-bold text-destructive">
                      {formatCurrency(Math.abs(student.solde))}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Historique des paiements</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Date d'acquittement</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Reçu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.date)}</TableCell>
                        <TableCell className="font-medium text-emerald-700">
                          {payment.date_acquittement ? formatDate(payment.date_acquittement) : (payment.status === 'paye' ? formatDate(payment.date) : '-')}
                        </TableCell>
                        <TableCell className="font-medium capitalize">
                          {payment.type.replace('_', ' ')}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="capitalize">
                          {payment.mode.replace('_', ' ')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeColor(payment.status)}>
                            {payment.status === 'paye'
                              ? 'Payé'
                              : payment.status === 'en_attente'
                              ? 'En attente'
                              : 'Annulé'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {payment.receiptNumber ? (
                            <Button variant="ghost" size="sm">
                              <FileText className="w-4 h-4 mr-2" />
                              {payment.receiptNumber}
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Documents administratifs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    Aucun document téléchargé pour le moment
                  </p>
                  <Button>
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger un document
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showPrintTrimesterModal} onOpenChange={setShowPrintTrimesterModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Imprimer le Bulletin Scolaire</DialogTitle>
              <DialogDescription>
                Sélectionnez le trimestre pour lequel vous souhaitez générer le bulletin scolaire officiel.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="trimester-select">Trimestre</Label>
                <Select value={selectedTrimester} onValueChange={setSelectedTrimester}>
                  <SelectTrigger id="trimester-select">
                    <SelectValue placeholder="Sélectionner le trimestre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1er Trimestre</SelectItem>
                    <SelectItem value="2">2ème Trimestre</SelectItem>
                    <SelectItem value="3">3ème Trimestre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPrintTrimesterModal(false)}>
                Annuler
              </Button>
              <Button onClick={handlePrintBulletin}>
                Imprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Reçu Récapitulatif Global */}
        <Dialog open={recapModalOpen} onOpenChange={setRecapModalOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-indigo-900">
                <FileText className="w-5 h-5 text-indigo-600" />
                Reçu Récapitulatif Global des Paiements
              </DialogTitle>
              <DialogDescription>
                Consolidé de tous les paiements effectués (Scolarité, Cantine, Transport, Autres frais).
              </DialogDescription>
            </DialogHeader>

            {recapData && (
              <div className="space-y-4 py-2 text-sm text-slate-800" id="recapitulatif-print-area">
                {/* En-tête Établissement & Reçu */}
                <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-lg flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-indigo-950 uppercase">{recapData.ecole.nom}</h3>
                    <p className="text-xs text-indigo-700">Code Établissement : <strong>{recapData.ecole.code}</strong> | Ville : {recapData.ecole.ville}</p>
                    <p className="text-xs text-indigo-700">Contacts : {recapData.ecole.contacts}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="bg-indigo-600 text-white font-mono text-xs">
                      {recapData.recu_numero}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">Émis le : {recapData.date_emission}</p>
                  </div>
                </div>

                {/* Profil Élève & Situation */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border rounded-lg text-xs">
                  <div>
                    <p><strong className="text-slate-500">Élève :</strong> <span className="font-semibold text-slate-900">{formatStudentName(recapData.eleve)}</span></p>
                    <p><strong className="text-slate-500">Matricule :</strong> <span className="font-mono">{recapData.eleve.matricule}</span></p>
                    <p><strong className="text-slate-500">Classe :</strong> <span>{recapData.eleve.classe}</span></p>
                  </div>
                  <div>
                    <p><strong className="text-slate-500">Régime :</strong> <Badge variant="outline" className="ml-1 text-[10px] bg-white">{recapData.eleve.regime}</Badge></p>
                    <p><strong className="text-slate-500">Lieu d'habitation :</strong> <span>📍 {recapData.eleve.lieu_habitation}</span></p>
                    <p><strong className="text-slate-500">Tuteur / Contact :</strong> <span>{recapData.eleve.tuteur_nom} ({recapData.eleve.tuteur_contact})</span></p>
                  </div>
                </div>

                {/* Tableaux récapitulatifs par catégorie */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs uppercase text-indigo-900 tracking-wider">Détail des règlements par catégorie</h4>
                  
                  {/* Scolarité */}
                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-slate-100 px-3 py-1.5 flex justify-between items-center text-xs font-semibold">
                      <span>SCOLARITÉ & INSCRIPTION</span>
                      <span className="text-emerald-700">{formatCurrency(recapData.ventilations.scolarite.subtotal)}</span>
                    </div>
                    {recapData.ventilations.scolarite.items.length > 0 ? (
                      <Table className="text-xs">
                        <TableHeader>
                          <TableRow className="h-7 bg-white">
                            <TableHead className="py-1">N° Reçu</TableHead>
                            <TableHead className="py-1">Date</TableHead>
                            <TableHead className="py-1">Mode</TableHead>
                            <TableHead className="py-1 text-right">Montant</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recapData.ventilations.scolarite.items.map((it: any) => (
                            <TableRow key={it.id} className="h-7">
                              <TableCell className="py-1 font-mono">{it.numero_recu}</TableCell>
                              <TableCell className="py-1">{it.date}</TableCell>
                              <TableCell className="py-1 capitalize">{it.mode}</TableCell>
                              <TableCell className="py-1 text-right font-medium text-emerald-700">{formatCurrency(it.montant)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-xs text-muted-foreground p-2 italic">Aucun versement scolarité enregistré.</p>
                    )}
                  </div>

                  {/* Cantine */}
                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-slate-100 px-3 py-1.5 flex justify-between items-center text-xs font-semibold">
                      <span>CANTINE SCOLAIRE</span>
                      <span className="text-emerald-700">{formatCurrency(recapData.ventilations.cantine.subtotal)}</span>
                    </div>
                    {recapData.ventilations.cantine.items.length > 0 ? (
                      <Table className="text-xs">
                        <TableHeader>
                          <TableRow className="h-7 bg-white">
                            <TableHead className="py-1">N° Reçu</TableHead>
                            <TableHead className="py-1">Date</TableHead>
                            <TableHead className="py-1">Mode</TableHead>
                            <TableHead className="py-1 text-right">Montant</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recapData.ventilations.cantine.items.map((it: any) => (
                            <TableRow key={it.id} className="h-7">
                              <TableCell className="py-1 font-mono">{it.numero_recu}</TableCell>
                              <TableCell className="py-1">{it.date}</TableCell>
                              <TableCell className="py-1 capitalize">{it.mode}</TableCell>
                              <TableCell className="py-1 text-right font-medium text-emerald-700">{formatCurrency(it.montant)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-xs text-muted-foreground p-2 italic">Aucun règlement cantine.</p>
                    )}
                  </div>

                  {/* Transport */}
                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-slate-100 px-3 py-1.5 flex justify-between items-center text-xs font-semibold">
                      <span>TRANSPORT SCOLAIRE</span>
                      <span className="text-emerald-700">{formatCurrency(recapData.ventilations.transport.subtotal)}</span>
                    </div>
                    {recapData.ventilations.transport.items.length > 0 ? (
                      <Table className="text-xs">
                        <TableHeader>
                          <TableRow className="h-7 bg-white">
                            <TableHead className="py-1">N° Reçu</TableHead>
                            <TableHead className="py-1">Date</TableHead>
                            <TableHead className="py-1">Mode</TableHead>
                            <TableHead className="py-1 text-right">Montant</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recapData.ventilations.transport.items.map((it: any) => (
                            <TableRow key={it.id} className="h-7">
                              <TableCell className="py-1 font-mono">{it.numero_recu}</TableCell>
                              <TableCell className="py-1">{it.date}</TableCell>
                              <TableCell className="py-1 capitalize">{it.mode}</TableCell>
                              <TableCell className="py-1 text-right font-medium text-emerald-700">{formatCurrency(it.montant)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-xs text-muted-foreground p-2 italic">Aucun règlement transport.</p>
                    )}
                  </div>

                  {/* Autres Frais */}
                  {recapData.ventilations.autres.items.length > 0 && (
                    <div className="border rounded-md overflow-hidden">
                      <div className="bg-slate-100 px-3 py-1.5 flex justify-between items-center text-xs font-semibold">
                        <span>AUTRES FRAIS ÉVENTUELS</span>
                        <span className="text-emerald-700">{formatCurrency(recapData.ventilations.autres.subtotal)}</span>
                      </div>
                      <Table className="text-xs">
                        <TableHeader>
                          <TableRow className="h-7 bg-white">
                            <TableHead className="py-1">N° Reçu</TableHead>
                            <TableHead className="py-1">Date</TableHead>
                            <TableHead className="py-1">Type</TableHead>
                            <TableHead className="py-1 text-right">Montant</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recapData.ventilations.autres.items.map((it: any) => (
                            <TableRow key={it.id} className="h-7">
                              <TableCell className="py-1 font-mono">{it.numero_recu}</TableCell>
                              <TableCell className="py-1">{it.date}</TableCell>
                              <TableCell className="py-1 capitalize">{it.type}</TableCell>
                              <TableCell className="py-1 text-right font-medium text-emerald-700">{formatCurrency(it.montant)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {/* Synthèse Financière Globale */}
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                  <div className="flex justify-between items-center text-sm font-bold text-emerald-950">
                    <span>TOTAL GÉNÉRAL ENCAISSÉ :</span>
                    <span className="text-lg text-emerald-700">{formatCurrency(recapData.total_general)}</span>
                  </div>
                  <Separator className="bg-emerald-200" />
                  <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-slate-500">Scolarité due:</span>
                      <p className="font-semibold">{formatCurrency(recapData.synthese_financiere.scolarite_due)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Arriérés antérieurs:</span>
                      <p className="font-semibold text-rose-600">{formatCurrency(recapData.synthese_financiere.arrieres_anterieurs)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Reste à recouvrer:</span>
                      <p className="font-semibold text-amber-700">{formatCurrency(recapData.synthese_financiere.total_reste_a_recouvrer)}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-between items-center text-xs text-muted-foreground">
                  <span>Cachet Établissement & Signature Caissier</span>
                  <span>Imprimé le {new Date().toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setRecapModalOpen(false)}>
                Fermer
              </Button>
              <Button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
                <Printer className="w-4 h-4" />
                Imprimer le Récapitulatif
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL MODIFICATION DE CLASSE */}
        <Dialog open={changeClassOpen} onOpenChange={setChangeClassOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">Affecter à une nouvelle classe</DialogTitle>
              <DialogDescription className="text-xs">
                Sélectionnez la nouvelle classe pour {formatStudentName(student)}.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <Label className="text-xs font-bold">Classe cible</Label>
              <Select value={targetClassId} onValueChange={setTargetClassId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Choisir la classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={String(cls.id)} className="text-xs">
                      {cls.name || cls.CE_LIBELLE}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setChangeClassOpen(false)}>Annuler</Button>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => {
                if (targetClassId) {
                  handleUpdateStudentField({ classe_id: Number(targetClassId) });
                  setChangeClassOpen(false);
                }
              }}>Confirmer le transfert</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL MODIFICATION DU RÉGIME */}
        <Dialog open={editRegimeOpen} onOpenChange={setEditRegimeOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">Modifier le régime de l'élève</DialogTitle>
              <DialogDescription className="text-xs">
                Définissez le nouveau statut financier ou régime pour {formatStudentName(student)}.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <Label className="text-xs font-bold">Statut / Régime de bourse</Label>
              <Select value={targetRegime} onValueChange={setTargetRegime}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Choisir le régime" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Non-boursier" className="text-xs">❌ Non-boursier</SelectItem>
                  <SelectItem value="Boursier" className="text-xs">🎓 Boursier</SelectItem>
                  <SelectItem value="Demi-boursier" className="text-xs">🌗 Demi-boursier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setEditRegimeOpen(false)}>Annuler</Button>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => {
                if (targetRegime) {
                  handleUpdateStudentField({ regime: targetRegime });
                  setEditRegimeOpen(false);
                }
              }}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL MODIFICATION LIEU D'HABITATION */}
        <Dialog open={editHabitationOpen} onOpenChange={setEditHabitationOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">Modifier le lieu d'habitation</DialogTitle>
              <DialogDescription className="text-xs">
                Mettre à jour les informations géographiques pour faciliter le transport.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4 text-xs">
              <div className="space-y-1">
                <Label className="font-bold">Commune</Label>
                <Input value={commune} onChange={e => setCommune(e.target.value)} placeholder="Ex: Abobo" className="text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">Quartier</Label>
                <Input value={quartier} onChange={e => setQuartier(e.target.value)} placeholder="Ex: Biabou 2" className="text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="font-bold">Adresse Géographique / Repère</Label>
                <Input value={adresseGeo} onChange={e => setAdresseGeo(e.target.value)} placeholder="Ex: Près du terminus 4 croix" className="text-xs" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setEditHabitationOpen(false)}>Annuler</Button>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => {
                handleUpdateStudentField({
                  AU_COMMUNE: commune,
                  AU_QUARTIER: quartier,
                  AU_ADRESSE_GEO: adresseGeo
                });
                setEditHabitationOpen(false);
              }}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </Layout>
  );
}
