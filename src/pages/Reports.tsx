import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Filter,
  Calendar,
  Building2,
  Users,
  GraduationCap,
  UserCheck,
  BookOpen,
  DollarSign,
  UserCog,
  AlertCircle,
  Home,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { StatsCard, MetricCard, AlertCard, SchoolRankCard } from '@/components/Stats';
import { ComparisonRadarChart } from '@/components/Charts';
import { DataTable, type Column } from '@/components/DataTable';
import type { Alert, School, Student, Staff, Attendance, Payment, ConfessionalRecord } from '@/lib/index';
const mockSchools: School[] = [];
const mockStudents: Student[] = [];
const mockStaff: Staff[] = [];
const mockKPIs: any[] = [];
const mockAlerts: Alert[] = [];
const mockAttendance: Attendance[] = [];
const mockPayments: Payment[] = [];
const mockConfessionalRecords: ConfessionalRecord[] = [];
import { formatDate, getStatusBadgeColor, getSeverityColor } from '@/lib/index';
import { springPresets, fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ScheduledReport {
  id: string;
  name: string;
  frequency: string;
  lastGenerated: Date;
  status: 'actif' | 'en_attente' | 'erreur';
  category: string;
}

const scheduledReports: ScheduledReport[] = [
  {
    id: 'report-1',
    name: 'Rapport quotidien des présences',
    frequency: 'Quotidien',
    lastGenerated: new Date(2025, 4, 7, 8, 0),
    status: 'actif',
    category: 'Vie scolaire',
  },
  {
    id: 'report-2',
    name: 'Rapport hebdomadaire finances',
    frequency: 'Hebdomadaire',
    lastGenerated: new Date(2025, 4, 5, 18, 0),
    status: 'actif',
    category: 'Finance',
  },
  {
    id: 'report-3',
    name: 'Rapport mensuel pédagogique',
    frequency: 'Mensuel',
    lastGenerated: new Date(2025, 3, 30, 12, 0),
    status: 'actif',
    category: 'Pédagogie',
  },
  {
    id: 'report-4',
    name: 'Rapport trimestriel confessionnel',
    frequency: 'Trimestriel',
    lastGenerated: new Date(2025, 2, 31, 15, 0),
    status: 'actif',
    category: 'Confessionnel',
  },
  {
    id: 'report-5',
    name: 'Rapport mensuel RH',
    frequency: 'Mensuel',
    lastGenerated: new Date(2025, 3, 30, 14, 0),
    status: 'actif',
    category: 'Ressources Humaines',
  },
  {
    id: 'report-6',
    name: 'Rapport annuel consolidé',
    frequency: 'Annuel',
    lastGenerated: new Date(2024, 11, 31, 23, 59),
    status: 'en_attente',
    category: 'Direction',
  },
];

const kpiCategories = [
  {
    id: 'effectifs',
    title: 'Effectifs',
    icon: Users,
    metrics: [
      { label: 'Total élèves actifs', value: mockStudents.filter((s) => s.status === 'actif').length },
      { label: 'Nouveaux inscrits 2025', value: 127 },
      { label: 'Taux de rétention', value: '94.2%' },
      { label: 'Élèves boursiers', value: 89 },
    ],
  },
  {
    id: 'pedagogie',
    title: 'Pédagogie',
    icon: GraduationCap,
    metrics: [
      { label: 'Moyenne générale nos écoles', value: '13.2/20' },
      { label: 'Taux de réussite examens', value: '88.5%' },
      { label: 'Classes avec moyenne > 14', value: 42 },
      { label: 'Élèves en difficulté', value: 156 },
    ],
  },
  {
    id: 'presence',
    title: 'Présence',
    icon: UserCheck,
    metrics: [
      { label: 'Taux de présence moyen', value: '92.8%' },
      { label: 'Absences injustifiées', value: 234 },
      { label: 'Retards ce mois', value: 412 },
      { label: 'Taux de ponctualité', value: '89.3%' },
    ],
  },
  {
    id: 'confessionnel',
    title: 'Confessionnel',
    icon: BookOpen,
    metrics: [
      { label: 'Progression Coran moyenne', value: '68%' },
      { label: 'Sourates mémorisées (total)', value: 1847 },
      { label: 'Note Tajwid moyenne', value: '82/100' },
      { label: 'Participation prières', value: '91.5%' },
    ],
  },
  {
    id: 'finance',
    title: 'Finance',
    icon: DollarSign,
    metrics: [
      { label: 'Recettes totales', value: '487M FCFA' },
      { label: 'Taux de recouvrement', value: '87.3%' },
      { label: 'Arriérés', value: '12.4M FCFA' },
      { label: 'Dépenses ce mois', value: '38.2M FCFA' },
    ],
  },
  {
    id: 'rh',
    title: 'RH',
    icon: UserCog,
    metrics: [
      { label: 'Personnel actif', value: mockStaff.filter((s) => s.status === 'actif').length },
      { label: 'Enseignants', value: mockStaff.filter((s) => s.fonction === 'enseignant').length },
      { label: 'Taux de présence personnel', value: '96.1%' },
      { label: 'Postes vacants', value: 7 },
    ],
  },
  {
    id: 'discipline',
    title: 'Discipline',
    icon: AlertCircle,
    metrics: [
      { label: 'Incidents ce mois', value: 47 },
      { label: 'Incidents graves', value: 8 },
      { label: 'Sanctions appliquées', value: 23 },
      { label: 'Taux de résolution', value: '78.3%' },
    ],
  },
  {
    id: 'infrastructure',
    title: 'Infrastructure',
    icon: Home,
    metrics: [
      { label: 'Établissements actifs', value: mockSchools.filter((s) => s.status === 'actif').length },
      { label: 'Salles de classe', value: 142 },
      { label: 'Taux d\'occupation', value: '87%' },
      { label: 'Projets en cours', value: 3 },
    ],
  },
];

export default function Reports() {
  const userEcoleId = localStorage.getItem('user_ecole_id');
  const userRole = localStorage.getItem('user_role');
  const initialSchoolFilter = (userEcoleId && userEcoleId !== 'null' && userEcoleId !== 'undefined' && !['admin', 'superuser', 'direction_fondation'].includes(userRole || ''))
    ? userEcoleId
    : 'all';

  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSchool, setSelectedSchool] = useState<string>(initialSchoolFilter);

  const activeSchools = mockSchools.filter((s) => s.status === 'actif');
  const sortedSchools = [...activeSchools].sort((a, b) => b.performanceScore - a.performanceScore);
  const topSchools = sortedSchools.slice(0, 5);
  const bottomSchools = sortedSchools.slice(-5).reverse();

  const filteredAlerts = mockAlerts.filter((alert) => {
    if (selectedSeverity !== 'all' && alert.severity !== selectedSeverity) return false;
    if (selectedCategory !== 'all' && alert.category !== selectedCategory) return false;
    if (selectedSchool !== 'all' && alert.schoolId !== selectedSchool) return false;
    return true;
  });

  const schoolColumns: Column[] = [
    {
      key: 'rank',
      label: 'Rang',
      render: (_value: unknown, _row: unknown, index?: number) => (
        <div className="font-mono font-semibold text-primary">#{(index ?? 0) + 1}</div>
      ),
    },
    {
      key: 'name',
      label: 'École',
      render: (value) => <div className="font-medium">{value as string}</div>,
    },
    {
      key: 'region',
      label: 'Région',
      render: (value) => <Badge variant="outline">{value as string}</Badge>,
    },
    {
      key: 'performanceScore',
      label: 'Score',
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="font-mono font-semibold">{value as number}/100</div>
          <div
            className="h-2 w-16 rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={value as number}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${value}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'effectif',
      label: 'Effectif',
      render: (value) => <div className="font-mono">{value as string | number}</div>,
    },
    {
      key: 'tauxPresence',
      label: 'Présence',
      render: (value) => <div className="font-mono">{value as number}%</div>,
    },
  ];

  const alertColumns: Column[] = [
    {
      key: 'severity',
      label: 'Priorité',
      render: (value) => (
        <Badge variant={getStatusBadgeColor(value as string)}>
          {value === 'critical' ? 'Critique' : value === 'warning' ? 'Attention' : 'Info'}
        </Badge>
      ),
    },
    {
      key: 'category',
      label: 'Catégorie',
      render: (value) => <Badge variant="outline">{value as string}</Badge>,
    },
    {
      key: 'title',
      label: 'Alerte',
      render: (value) => <div className="font-medium">{value as string}</div>,
    },
    {
      key: 'schoolId',
      label: 'École',
      render: (value) => {
        if (!value) return <span className="text-muted-foreground">Réseau</span>;
        const school = mockSchools.find((s) => s.id === value);
        return school ? school.name : '-';
      },
    },
    {
      key: 'timestamp',
      label: 'Date',
      render: (value) => <div className="text-sm text-muted-foreground">{formatDate(value as Date)}</div>,
    },
    {
      key: 'actionRequired',
      label: 'Action',
      render: (value) => (
        <div className="text-sm">{(value as string) || <span className="text-muted-foreground">Aucune</span>}</div>
      ),
    },
  ];

  const reportColumns: Column[] = [
    {
      key: 'name',
      label: 'Rapport',
      render: (value) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{value as string}</span>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Catégorie',
      render: (value) => <Badge variant="outline">{value as string}</Badge>,
    },
    {
      key: 'frequency',
      label: 'Fréquence',
      render: (value) => <div className="text-sm">{value as string}</div>,
    },
    {
      key: 'lastGenerated',
      label: 'Dernière génération',
      render: (value) => (
        <div className="text-sm text-muted-foreground">{formatDate(value as Date)}</div>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      render: (value) => (
        <Badge variant={getStatusBadgeColor(value as string)}>
          {value === 'actif' ? 'Actif' : value === 'en_attente' ? 'En attente' : 'Erreur'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: () => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-1" />
            Excel
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springPresets.gentle}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Reporting & Business Intelligence</h1>
              <p className="text-muted-foreground mt-2">
                Tableaux de bord, rapports automatiques et indicateurs décisionnels
              </p>
            </div>
            <Button size="lg">
              <Download className="h-5 w-5 mr-2" />
              Exporter tout
            </Button>
          </div>
        </motion.div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Tableaux de bord</TabsTrigger>
            <TabsTrigger value="reports">Rapports automatiques</TabsTrigger>
            <TabsTrigger value="kpis">Indicateurs nos écoles</TabsTrigger>
            <TabsTrigger value="alerts">Alertes décisionnelles</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              <motion.div variants={staggerItem}>
                <Card>
                  <CardHeader>
                    <CardTitle>Comparaison des établissements</CardTitle>
                    <CardDescription>
                      Performance globale de nos écoles HÎNNEH ÉDUCATION
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ComparisonRadarChart />
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={staggerItem} className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Top 5 Établissements
                    </CardTitle>
                    <CardDescription>Meilleures performances de nos écoles</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DataTable
                      columns={schoolColumns}
                      data={topSchools}
                      searchable={false}
                      exportable={false}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-destructive" />
                      Établissements à accompagner
                    </CardTitle>
                    <CardDescription>Nécessitent un soutien prioritaire</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DataTable
                      columns={schoolColumns}
                      data={bottomSchools}
                      searchable={false}
                      exportable={false}
                    />
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={staggerItem}>
                <Card>
                  <CardHeader>
                    <CardTitle>Classement complet des établissements</CardTitle>
                    <CardDescription>
                      Performance détaillée de tous les établissements actifs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {sortedSchools.map((school, index) => (
                        <SchoolRankCard
                          key={school.id}
                          rank={index + 1}
                          schoolName={school.name}
                          performanceScore={school.performanceScore}
                          region={school.region}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springPresets.gentle}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Rapports programmés</CardTitle>
                  <CardDescription>
                    Génération automatique de rapports selon la fréquence définie
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={reportColumns}
                    data={scheduledReports}
                    title="Liste des rapports"
                    searchable
                    exportable
                  />
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="kpis" className="space-y-6">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              <motion.div variants={staggerItem} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {mockKPIs.slice(0, 4).map((kpi) => (
                  <StatsCard key={kpi.id} kpi={kpi} />
                ))}
              </motion.div>

              {kpiCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <motion.div key={category.id} variants={staggerItem}>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-primary" />
                          {category.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          {category.metrics.map((metric, index) => (
                            <MetricCard
                              key={index}
                              label={metric.label}
                              value={metric.value}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springPresets.gentle}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Filtres</CardTitle>
                  <CardDescription>Affiner la liste des alertes décisionnelles</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Priorité</label>
                      <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes</SelectItem>
                          <SelectItem value="critical">Critique</SelectItem>
                          <SelectItem value="warning">Attention</SelectItem>
                          <SelectItem value="info">Info</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Catégorie</label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes</SelectItem>
                          <SelectItem value="Vie scolaire">Vie scolaire</SelectItem>
                          <SelectItem value="Finance">Finance</SelectItem>
                          <SelectItem value="Pédagogie">Pédagogie</SelectItem>
                          <SelectItem value="Discipline">Discipline</SelectItem>
                          <SelectItem value="RH">RH</SelectItem>
                          <SelectItem value="Administration">Administration</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">École</label>
                      <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes</SelectItem>
                          {mockSchools
                            .filter((s) => s.status === 'actif')
                            .map((school) => (
                              <SelectItem key={school.id} value={school.id}>
                                {school.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredAlerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>

              {filteredAlerts.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">Aucune alerte trouvée</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Modifiez les filtres pour afficher plus de résultats
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Toutes les alertes</CardTitle>
                  <CardDescription>
                    Vue détaillée de toutes les alertes décisionnelles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={alertColumns}
                    data={filteredAlerts}
                    searchable
                    exportable
                  />
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
