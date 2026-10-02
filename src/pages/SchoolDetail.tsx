import { useState, useEffect, useMemo } from 'react';
import apiClient from '@/lib/apiClient';
import type { School, Student, Staff, Payment, ClassRoom } from '@/lib/index';
import { formatStudentName } from '@/lib/index';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  Users,
  GraduationCap,
  TrendingUp,
  DollarSign,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Edit,
  MoreVertical,
  ImageIcon,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { StatsCard, MetricCard } from '@/components/Stats';
import {
  EffectifsBarChart,
  PerformanceLineChart,
  FinanceAreaChart,
} from '@/components/Charts';
import {
  formatCurrency,
  formatDate,
  getStatusBadgeColor,
  type KPICard,
} from '@/lib/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SchoolAssetsManager } from '@/components/SchoolAssetsManager';


export default function SchoolDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const [school, setSchool] = useState<School | undefined>(undefined);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<School>>({});
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (id) {
      apiClient.getSchool(id)
        .then((data) => {
          if (data) setSchool(data);
        })
        .catch((err) => {
          console.error("Failed to fetch school details from API", err);
        });
    }
  }, [id]);

  const [schoolStudents, setSchoolStudents] = useState<Student[]>([]);
  const [schoolStaff, setSchoolStaff] = useState<Staff[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<ClassRoom[]>([]);
  const [schoolPayments, setSchoolPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (school) {
      const numericId = parseInt(school.id, 10);
      if (!isNaN(numericId)) {
        apiClient.getStudents({ ecole_id: numericId })
          .then(data => { if (data) setSchoolStudents(data); })
          .catch(err => console.error(err));

        apiClient.getStaff({ ecole_id: numericId })
          .then(data => { if (data) setSchoolStaff(data); })
          .catch(err => console.error(err));

        apiClient.getClasses({ ecole_id: numericId })
          .then(data => { if (data) setSchoolClasses(data); })
          .catch(err => console.error(err));

        apiClient.getPayments()
          .then(data => { if (data) setSchoolPayments(data); })
          .catch(err => console.error(err));
      }
    }
  }, [school]);

  if (!school) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Établissement non trouvé</h2>
            <p className="text-muted-foreground mb-6">
              L'établissement demandé n'existe pas ou a été supprimé.
            </p>
            <Button onClick={() => navigate('/schools')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux établissements
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const filteredSchoolPayments = useMemo(() => {
    const sId = String(school.id);
    const sCode = (school.code || (school as any).ET_CODEETABLISSEMENT || '').toUpperCase().trim();
    return schoolPayments.filter((p) => {
      const pEcoId = (p as any).ecole_id ? String((p as any).ecole_id) : '';
      const pSchId = (p as any).schoolId ? String((p as any).schoolId) : '';
      const pCode = ((p as any).ET_CODEETABLISSEMENT || (p as any).code_etablissement || '').toUpperCase().trim();
      if (pEcoId && pEcoId === sId) return true;
      if (pSchId && pSchId === sId) return true;
      if (sCode && pCode && pCode === sCode) return true;
      return schoolStudents.some((s) => String(s.id) === String(p.studentId));
    });
  }, [schoolPayments, schoolStudents, school]);

  const totalRevenue = filteredSchoolPayments
    .filter((p) => p.status === 'paye')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPending = filteredSchoolPayments
    .filter((p) => p.status === 'en_attente')
    .reduce((sum, p) => sum + p.amount, 0);

  const activeStudents = schoolStudents.filter((s) => s.status === 'actif').length;
  const activeStaff = schoolStaff.filter((s) => s.status === 'actif').length;

  const kpis: KPICard[] = [
    {
      id: 'kpi-effectif',
      title: 'Effectif total',
      value: activeStudents,
      period: 'élèves actifs',
      color: 'primary',
    },
    {
      id: 'kpi-classes',
      title: 'Classes',
      value: schoolClasses.length,
      period: 'tous cycles',
      color: 'secondary',
    },
    {
      id: 'kpi-enseignants',
      title: 'Personnel',
      value: activeStaff,
      period: 'actifs',
      color: 'accent',
    },
    {
      id: 'kpi-presence',
      title: 'Taux de présence',
      value: `${school.tauxPresence}%`,
      trend: school.tauxPresence > 90 ? 2.3 : -1.2,
      trendDirection: school.tauxPresence > 90 ? 'up' : 'down',
      period: 'cette semaine',
      color: 'muted',
    },
    {
      id: 'kpi-recouvrement',
      title: 'Taux de recouvrement',
      value: `${school.tauxRecouvrement}%`,
      trend: school.tauxRecouvrement > 85 ? 3.5 : -2.1,
      trendDirection: school.tauxRecouvrement > 85 ? 'up' : 'down',
      period: 'ce mois',
      color: 'primary',
    },
  ];

  const documents = [
    {
      id: 'doc-1',
      name: 'Agrément Ministère Éducation',
      type: 'PDF',
      date: new Date(2023, 8, 15),
      size: '2.4 MB',
    },
    {
      id: 'doc-2',
      name: 'Certificat Conformité Islamique',
      type: 'PDF',
      date: new Date(2024, 0, 10),
      size: '1.8 MB',
    },
    {
      id: 'doc-3',
      name: 'Rapport Inspection 2024',
      type: 'PDF',
      date: new Date(2024, 2, 20),
      size: '3.2 MB',
    },
    {
      id: 'doc-4',
      name: 'Plan Évacuation Incendie',
      type: 'PDF',
      date: new Date(2024, 8, 1),
      size: '1.5 MB',
    },
    {
      id: 'doc-5',
      name: 'Assurance Établissement',
      type: 'PDF',
      date: new Date(2025, 0, 5),
      size: '2.1 MB',
    },
  ];

  const complianceItems = [
    { id: 1, label: 'Agrément Ministère Éducation Nationale', status: true },
    { id: 2, label: 'Certification Confessionnelle COSIM', status: true },
    { id: 3, label: 'Inspection Pédagogique à jour', status: true },
    { id: 4, label: 'Normes de Sécurité Incendie', status: true },
    { id: 5, label: 'Assurance Responsabilité Civile', status: true },
    { id: 6, label: 'Registre Présences Personnel', status: true },
    { id: 7, label: 'Dossiers Élèves Complets', status: school.performanceScore > 85 },
    { id: 8, label: 'Plan Urgence Médicale', status: true },
    { id: 9, label: 'Conformité Locaux Sanitaires', status: school.performanceScore > 80 },
    { id: 10, label: 'Bibliothèque Islamique Agréée', status: true },
    { id: 11, label: 'Salle Prière Conforme', status: true },
    { id: 12, label: 'Rapport Financier Annuel', status: school.tauxRecouvrement > 80 },
  ];

  const complianceRate = Math.round(
    (complianceItems.filter((item) => item.status).length / complianceItems.length) * 100
  );

  const handleEditOpen = () => {
    setEditForm({
      name: school.name,
      code: school.code,
      region: school.region,
      city: school.city,
      address: school.address,
      contacts: school.contacts,
      email: school.email,
      cycles: [...school.cycles],
      status: school.status,
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!id) return;
    setEditLoading(true);
    try {
      const payload: Record<string, unknown> = {};
      if (editForm.name !== undefined) payload.name = editForm.name;
      if (editForm.code !== undefined) payload.code = editForm.code;
      if (editForm.region !== undefined) payload.region = editForm.region;
      if (editForm.city !== undefined) payload.city = editForm.city;
      if (editForm.address !== undefined) payload.address = editForm.address;
      if (editForm.contacts !== undefined) payload.contacts = editForm.contacts;
      if (editForm.email !== undefined) payload.email = editForm.email;
      if (editForm.cycles !== undefined) payload.cycles = editForm.cycles;
      if (editForm.status !== undefined) payload.status = editForm.status;

      const updated = await apiClient.updateSchool(id, payload);
      setSchool(updated);
      setEditOpen(false);
    } catch (err) {
      console.error('Failed to update school', err);
      alert("Erreur lors de la mise à jour de l'établissement.");
    } finally {
      setEditLoading(false);
    }
  };

  const toggleCycle = (cycle: string) => {
    setEditForm((prev) => {
      const cycles = prev.cycles || [];
      const updated = cycles.includes(cycle)
        ? cycles.filter((c) => c !== cycle)
        : [...cycles, cycle];
      return { ...prev, cycles: updated };
    });
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/schools')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{school.name}</h1>
                <Badge variant={getStatusBadgeColor(school.status)}>
                  {school.status === 'actif'
                    ? 'Actif'
                    : school.status === 'suspendu'
                    ? 'Suspendu'
                    : 'En création'}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {school.city}, {school.region}
                </span>
                <span>•</span>
                <span>
                  {school.cycles
                    .map((c) =>
                      c === 'maternelle'
                        ? 'Maternelle'
                        : c === 'primaire'
                        ? 'Primaire'
                        : c === 'college'
                        ? 'Collège'
                        : 'Collège 2nd cycle'
                    )
                    .join(', ')}
                </span>
                <span>•</span>
                <span>Score: {school.performanceScore}/100</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
            <Button onClick={handleEditOpen}>
              <Edit className="w-4 h-4 mr-2" />
              Modifier
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Voir historique</DropdownMenuItem>
                <DropdownMenuItem>Générer rapport</DropdownMenuItem>
                <DropdownMenuItem>Paramètres</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier l'établissement</DialogTitle>
              <DialogDescription>
                Mettez à jour les informations de {school.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="school-name">Nom de l'établissement</Label>
                <Input
                  id="school-name"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-code">Code établissement</Label>
                <Input
                  id="school-code"
                  value={editForm.code || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, code: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-region">Région</Label>
                <Input
                  id="school-region"
                  value={editForm.region || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, region: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-city">Ville</Label>
                <Input
                  id="school-city"
                  value={editForm.city || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="school-address">Adresse postale</Label>
                <Input
                  id="school-address"
                  value={editForm.address || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-contacts">Contacts</Label>
                <Input
                  id="school-contacts"
                  value={editForm.contacts || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, contacts: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-email">Email</Label>
                <Input
                  id="school-email"
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Cycles</Label>
                <div className="flex flex-wrap gap-3">
                  {(['maternelle', 'primaire', 'college', 'lycee'] as const).map((cycle) => (
                    <label key={cycle} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={(editForm.cycles || []).includes(cycle)}
                        onChange={() => toggleCycle(cycle)}
                        className="rounded border-gray-300"
                      />
                      <span>
                        {cycle === 'maternelle' ? 'Maternelle'
                          : cycle === 'primaire' ? 'Primaire'
                          : cycle === 'college' ? 'Collège'
                          : 'Collège 2nd cycle'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="school-status">Statut</Label>
                <select
                  id="school-status"
                  value={editForm.status || 'actif'}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="actif">Actif</option>
                  <option value="suspendu">Suspendu</option>
                  <option value="en_creation">En création</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editLoading}>
                Annuler
              </Button>
              <Button onClick={handleEditSave} disabled={editLoading}>
                {editLoading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Vue générale</TabsTrigger>
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="personnel">Personnel</TabsTrigger>
            <TabsTrigger value="finances">Finances</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="compliance">Conformité</TabsTrigger>
            <TabsTrigger value="identite" className="flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5" />
              Identité
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {kpis.map((kpi) => (
                <StatsCard key={kpi.id} kpi={kpi} />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Répartition des effectifs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EffectifsBarChart />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Performance académique
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PerformanceLineChart />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                label="Moyenne générale"
                value="13.5/20"
                icon={<GraduationCap className="w-5 h-5" />}
                color="primary"
              />
              <MetricCard
                label="Taux de réussite"
                value="89%"
                icon={<CheckCircle2 className="w-5 h-5" />}
                color="accent"
              />
              <MetricCard
                label="Incidents disciplinaires"
                value="12"
                icon={<AlertCircle className="w-5 h-5" />}
                color="destructive"
              />
            </div>
          </TabsContent>

          <TabsContent value="classes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Liste des classes</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Classe</TableHead>
                      <TableHead>Niveau</TableHead>
                      <TableHead>Cycle</TableHead>
                      <TableHead>Enseignant titulaire</TableHead>
                      <TableHead className="text-right">Effectif</TableHead>
                      <TableHead className="text-right">Capacité</TableHead>
                      <TableHead className="text-right">Taux remplissage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schoolClasses.map((classe) => {
                      const teacher = schoolStaff.find((s) => s.id === classe.teacherId);
                      const fillRate = Math.round(
                        (classe.studentCount / classe.capacity) * 100
                      );
                      return (
                        <TableRow key={classe.id}>
                          <TableCell className="font-medium">{classe.name}</TableCell>
                          <TableCell>{classe.niveau}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {classe.cycle === 'maternelle'
                                ? 'Maternelle'
                                : classe.cycle === 'primaire'
                                ? 'Primaire'
                                : classe.cycle === 'college'
                                ? 'Collège'
                                : 'Collège 2nd cycle'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {teacher
                              ? `${formatStudentName(teacher)}`
                              : 'Non assigné'}
                          </TableCell>
                          <TableCell className="text-right">
                            {classe.studentCount}
                          </TableCell>
                          <TableCell className="text-right">{classe.capacity}</TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                fillRate > 90
                                  ? 'destructive'
                                  : fillRate > 75
                                  ? 'secondary'
                                  : 'default'
                              }
                            >
                              {fillRate}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="personnel" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Personnel de l'établissement</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom complet</TableHead>
                      <TableHead>Fonction</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Charge horaire</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Évaluation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schoolStaff.map((staff) => (
                      <TableRow key={staff.id}>
                        <TableCell className="font-medium">
                          {formatStudentName(staff)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {staff.fonction === 'enseignant'
                              ? 'Enseignant'
                              : staff.fonction === 'admin'
                              ? 'Administratif'
                              : staff.fonction === 'coranique'
                              ? 'Coranique'
                              : staff.fonction === 'surveillance'
                              ? 'Surveillance'
                              : staff.fonction === 'service'
                              ? 'Service'
                              : 'Direction'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>{staff.phone}</div>
                          <div className="text-muted-foreground">{staff.email}</div>
                        </TableCell>
                        <TableCell>{staff.chargeHoraire}h/semaine</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeColor(staff.status)}>
                            {staff.status === 'actif'
                              ? 'Actif'
                              : staff.status === 'conge'
                              ? 'Congé'
                              : 'Absent'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {staff.evaluationScore ? (
                            <span className="font-medium">
                              {staff.evaluationScore}/100
                            </span>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finances" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                label="Recettes totales"
                value={formatCurrency(totalRevenue)}
                icon={<DollarSign className="w-5 h-5" />}
                color="primary"
              />
              <MetricCard
                label="En attente"
                value={formatCurrency(totalPending)}
                icon={<AlertCircle className="w-5 h-5" />}
                color="secondary"
              />
              <MetricCard
                label="Taux de recouvrement"
                value={`${school.tauxRecouvrement}%`}
                icon={<TrendingUp className="w-5 h-5" />}
                color="accent"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Évolution financière</CardTitle>
              </CardHeader>
              <CardContent>
                <FinanceAreaChart payments={filteredSchoolPayments} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Derniers paiements</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Élève</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchoolPayments.slice(0, 10).map((payment) => {
                      const student = schoolStudents.find((s) => s.id === payment.studentId);
                      return (
                        <TableRow key={payment.id}>
                          <TableCell>{formatDate(payment.date)}</TableCell>
                          <TableCell>
                            {student
                              ? `${formatStudentName(student)}`
                              : 'Inconnu'}
                          </TableCell>
                          <TableCell>
                            {payment.type === 'scolarite'
                              ? 'Scolarité'
                              : payment.type === 'inscription'
                              ? 'Inscription'
                              : payment.type === 'cantine'
                              ? 'Cantine'
                              : payment.type === 'transport'
                              ? 'Transport'
                              : 'Autre'}
                          </TableCell>
                          <TableCell>
                            {payment.mode === 'especes'
                              ? 'Espèces'
                              : payment.mode === 'mobile_money'
                              ? 'Mobile Money'
                              : payment.mode === 'virement'
                              ? 'Virement'
                              : 'Carte'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(payment.amount)}
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
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Documents administratifs
                  </span>
                  <Button size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger tout
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom du document</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Taille</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{doc.type}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(doc.date)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {doc.size}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                label="Taux de conformité"
                value={`${complianceRate}%`}
                icon={<CheckCircle2 className="w-5 h-5" />}
                color={complianceRate >= 90 ? 'primary' : 'secondary'}
              />
              <MetricCard
                label="Critères validés"
                value={`${complianceItems.filter((i) => i.status).length}/${complianceItems.length}`}
                icon={<CheckCircle2 className="w-5 h-5" />}
                color="accent"
              />
              <MetricCard
                label="Points à améliorer"
                value={complianceItems.filter((i) => !i.status).length}
                icon={<AlertCircle className="w-5 h-5" />}
                color="destructive"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Checklist de conformité</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {complianceItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {item.status ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive" />
                        )}
                        <span className="font-medium">{item.label}</span>
                      </div>
                      <Badge
                        variant={item.status ? 'default' : 'destructive'}
                      >
                        {item.status ? 'Conforme' : 'Non conforme'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Identité Visuelle ── */}
          <TabsContent value="identite" className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Identité Visuelle</h2>
                <p className="text-sm text-muted-foreground">Gérez les images utilisées dans les bulletins et reçus de paiement</p>
              </div>
            </div>
            <SchoolAssetsManager />
          </TabsContent>
        </Tabs>
      </motion.div>
    </Layout>
  );
}
