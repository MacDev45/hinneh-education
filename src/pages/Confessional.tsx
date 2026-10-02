import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '@/components/Layout';
import { StatsCard, MetricCard } from '@/components/Stats';
import { ConfessionalProgressChart } from '@/components/Charts';
import { DataTable, type Column } from '@/components/DataTable';
import type { KPICard } from '@/lib/index';
import { springPresets, fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Star, Filter, Search, TrendingUp, Award, Calendar, Users, Plus, Pencil, Trash2, MapPin, CheckCircle } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

interface ReligiousActivity {
  id: string;
  title: string;
  date: string;
  type: string;
  participants: number;
  description: string;
  lieu?: string;
}

const INITIAL_ACTIVITIES: ReligiousActivity[] = [
  {
    id: 'act-1',
    title: 'Ramadan 1447 / 2026',
    date: '2026-03-10',
    type: 'Observance',
    participants: 450,
    lieu: 'Mosquée de l\'Établissement',
    description: 'Mois de jeûne, prières de Tarawih et conférences spirituelles.',
  },
  {
    id: 'act-2',
    title: 'Concours de Récitation du Coran (Tajwid)',
    date: '2026-04-15',
    type: 'Concours',
    participants: 120,
    lieu: 'Amphithéâtre Principal',
    description: 'Compétition inter-établissements de mémorisation et Tajwid.',
  },
  {
    id: 'act-3',
    title: 'Conférence: Les valeurs morales en Islam (Akhlaq)',
    date: '2026-05-05',
    type: 'Conférence',
    participants: 320,
    lieu: 'Salle de Conférence Fondation',
    description: 'Intervention du Sheikh Abdoulaye Touré et de l\'Aumônier.',
  },
  {
    id: 'act-4',
    title: 'Célébration Mawlid Nabawi',
    date: '2026-05-20',
    type: 'Célébration',
    participants: 500,
    lieu: 'Esplanade de l\'Établissement',
    description: 'Commémoration de la naissance du Prophète SWS.',
  },
];

export default function Confessional() {
  const { toast } = useToast();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<string>('suivi');

  const [activities, setActivities] = useState<ReligiousActivity[]>(() => {
    const saved = localStorage.getItem('hinneh_religious_activities');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_ACTIVITIES;
  });

  useEffect(() => {
    localStorage.setItem('hinneh_religious_activities', JSON.stringify(activities));
  }, [activities]);

  const [showActivityModal, setShowActivityModal] = useState<boolean>(false);
  const [editingActivity, setEditingActivity] = useState<ReligiousActivity | null>(null);

  const [formTitle, setFormTitle] = useState<string>('');
  const [formType, setFormType] = useState<string>('Événement');
  const [formDate, setFormDate] = useState<string>('2026-06-01');
  const [formParticipants, setFormParticipants] = useState<string>('150');
  const [formLieu, setFormLieu] = useState<string>('Mosquée de l\'Établissement');
  const [formDescription, setFormDescription] = useState<string>('');

  const handleOpenAddModal = () => {
    setEditingActivity(null);
    setFormTitle('');
    setFormType('Événement');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormParticipants('100');
    setFormLieu('Mosquée de l\'Établissement');
    setFormDescription('');
    setShowActivityModal(true);
  };

  const handleOpenEditModal = (act: ReligiousActivity) => {
    setEditingActivity(act);
    setFormTitle(act.title);
    setFormType(act.type);
    setFormDate(act.date);
    setFormParticipants(String(act.participants));
    setFormLieu(act.lieu || 'Mosquée de l\'Établissement');
    setFormDescription(act.description);
    setShowActivityModal(true);
  };

  const handleSaveActivity = () => {
    if (!formTitle.trim()) {
      toast({ title: '⚠️ Titre requis', description: 'Veuillez saisir un titre pour l\'activité.', variant: 'destructive' });
      return;
    }

    if (editingActivity) {
      setActivities((prev) =>
        prev.map((a) =>
          a.id === editingActivity.id
            ? {
                ...a,
                title: formTitle,
                type: formType,
                date: formDate,
                participants: Number(formParticipants) || 0,
                lieu: formLieu,
                description: formDescription,
              }
            : a
        )
      );
      toast({ title: '✅ Activité modifiée', description: `L'activité "${formTitle}" a été mise à jour.` });
    } else {
      const newAct: ReligiousActivity = {
        id: `act_${Date.now()}`,
        title: formTitle,
        type: formType,
        date: formDate,
        participants: Number(formParticipants) || 0,
        lieu: formLieu,
        description: formDescription,
      };
      setActivities((prev) => [newAct, ...prev]);
      toast({ title: '✅ Activité ajoutée', description: `L'activité "${formTitle}" a été enregistrée.` });
    }
    setShowActivityModal(false);
  };

  const handleDeleteActivity = (id: string, title: string) => {
    if (window.confirm(`Voulez-vous vraiment supprimer l'activité religieuse "${title}" ?`)) {
      setActivities((prev) => prev.filter((a) => a.id !== id));
      toast({ title: '🗑️ Activité supprimée', description: `L'activité "${title}" a été retirée du calendrier.` });
    }
  };

  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedNiveau, setSelectedNiveau] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location.search]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [stData, clsData] = await Promise.all([
          apiClient.getStudents().catch(() => []),
          apiClient.getClasses().catch(() => []),
        ]);
        setStudents(stData || []);
        setClasses(clsData || []);
        if (stData && stData.length > 0) {
          setSelectedStudentId(String(stData[0].id));
        }
      } catch (err) {
        console.error('Erreur chargement élèves pour confessionnel:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredClasses = useMemo(() => {
    if (selectedNiveau === 'all') return classes;
    return classes.filter((c) => {
      const cycle = (c.cycle || c.niveau_libelle || c.name || c.CE_LIBELLE || '').toLowerCase();
      return cycle.includes(selectedNiveau.toLowerCase());
    });
  }, [classes, selectedNiveau]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (selectedNiveau !== 'all') {
        const studentNiveau = (s.niveau || s.cycle || s.className || s.classe_name || '').toLowerCase();
        if (!studentNiveau.includes(selectedNiveau.toLowerCase())) {
          const cls = classes.find((c) => String(c.id) === String(s.classId || s.classe_id));
          const clsCycle = (cls?.cycle || cls?.name || cls?.CE_LIBELLE || '').toLowerCase();
          if (!clsCycle.includes(selectedNiveau.toLowerCase())) return false;
        }
      }
      if (selectedClassId !== 'all') {
        const stClassId = String(s.classId || s.classe_id || s.class_id || '');
        if (stClassId !== selectedClassId) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const full = `${s.matricule || ''} ${s.lastName || s.nom || ''} ${s.firstName || s.prenom || ''} ${s.className || s.classe_name || ''}`.toLowerCase();
        if (!full.includes(q)) return false;
      }
      return true;
    });
  }, [students, classes, selectedNiveau, selectedClassId, searchQuery]);

  const selectedStudent = useMemo(() => {
    if (!students || students.length === 0) return null;
    return (
      students.find((s) => String(s.id) === String(selectedStudentId)) ||
      filteredStudents[0] ||
      students[0]
    );
  }, [students, filteredStudents, selectedStudentId]);

  const studentSurahRecords = useMemo(() => {
    if (!selectedStudent) return [];
    const isColl = (selectedStudent.className || selectedStudent.niveau || '').toLowerCase().includes('coll') ||
                   (selectedStudent.className || '').toLowerCase().includes('3') ||
                   (selectedStudent.className || '').toLowerCase().includes('4');

    return [
      { id: '1', surahNumber: 1, surah: 'Al-Fatiha (الفاتحة)', status: 'memorise', progressPercentage: 100, tajwidScore: 98, revisionDate: '2026-05-10' },
      { id: '114', surahNumber: 114, surah: 'An-Nas (الناس)', status: 'memorise', progressPercentage: 100, tajwidScore: 95, revisionDate: '2026-05-08' },
      { id: '113', surahNumber: 113, surah: 'Al-Falaq (الفلق)', status: 'memorise', progressPercentage: 100, tajwidScore: 92, revisionDate: '2026-05-08' },
      { id: '112', surahNumber: 112, surah: 'Al-Ikhlas (الإخلاص)', status: 'memorise', progressPercentage: 100, tajwidScore: 96, revisionDate: '2026-05-07' },
      { id: '107', surahNumber: 107, surah: "Al-Ma'un (الماعون)", status: 'en_cours', progressPercentage: 85, tajwidScore: 82, revisionDate: '2026-05-11' },
      { id: '105', surahNumber: 105, surah: 'Al-Fil (الفيل)', status: 'en_cours', progressPercentage: 75, tajwidScore: 80, revisionDate: '2026-05-12' },
      { id: '102', surahNumber: 102, surah: 'At-Takathur (التكاثر)', status: isColl ? 'memorise' : 'en_cours', progressPercentage: isColl ? 100 : 50, tajwidScore: 85, revisionDate: '2026-04-20' },
    ];
  }, [selectedStudent]);

  const confessionalKPIs: KPICard[] = [
    { id: 'conf-kpi-1', title: 'Progression Coran moyenne', value: '68%', trend: 5.3, trendDirection: 'up', period: 'ce trimestre', color: 'primary' },
    { id: 'conf-kpi-2', title: 'Taux participation prières', value: '94.2%', trend: 2.1, trendDirection: 'up', period: 'ce mois', color: 'accent' },
    { id: 'conf-kpi-3', title: 'Niveau Tajwid moyen', value: '82/100', trend: 3.8, trendDirection: 'up', period: 'ce trimestre', color: 'secondary' },
    { id: 'conf-kpi-4', title: 'Activités islamiques', value: '12', period: 'ce mois', color: 'muted' },
  ];

  const surahColumns: Column[] = [
    { key: 'surahNumber', label: 'N°', sortable: true, render: (value: number) => <span className="font-mono text-sm font-bold">{value}</span> },
    { key: 'surah', label: 'Sourate (القرآن الكريم)', sortable: true, render: (value: string) => <span className="font-bold text-sm text-indigo-950 dark:text-white">{value}</span> },
    { key: 'status', label: 'Statut Mémorisation', sortable: true, render: (value: string) => {
        const labels: Record<string, string> = { memorise: '✨ Mémorisé', en_cours: '📖 En cours', non_debute: '⏳ Non débuté' };
        const badgeColors: Record<string, string> = {
          memorise: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200',
          en_cours: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200',
          non_debute: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
        };
        return <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${badgeColors[value] || ''}`}>{labels[value] || value}</span>;
      }
    },
    {
      key: 'progressPercentage',
      label: 'Progression',
      sortable: true,
      render: (value: number) => (
        <div className="flex items-center gap-2 min-w-[130px]">
          <Progress value={value} className="h-2 flex-1" />
          <span className="text-xs font-bold font-mono">{value}%</span>
        </div>
      ),
    },
    {
      key: 'observations',
      label: 'Observations',
      render: (value: string | undefined) => (
        <span className="text-sm text-muted-foreground italic">{value || '-'}</span>
      ),
    },
  ];

  const islamicSubjects = [
    { name: 'Fiqh', score: 15.5, coefficient: 2, color: 'bg-chart-1' },
    { name: 'Aqida', score: 16.0, coefficient: 2, color: 'bg-chart-2' },
    { name: 'Hadith', score: 14.5, coefficient: 2, color: 'bg-chart-3' },
    { name: 'Sira', score: 17.0, coefficient: 1, color: 'bg-chart-4' },
    { name: 'Arabe', score: 13.0, coefficient: 3, color: 'bg-chart-5' },
  ];

  const religiousActivities = [
    {
      id: 'act-1',
      title: 'Ramadan 1446',
      date: new Date(2025, 2, 10),
      type: 'Observance',
      participants: 450,
      description: 'Mois de jeûne et de spiritualité',
    },
    {
      id: 'act-2',
      title: 'Concours de récitation coranique',
      date: new Date(2025, 3, 15),
      type: 'Concours',
      participants: 85,
      description: 'Compétition inter-établissements',
    },
    {
      id: 'act-3',
      title: 'Conférence: Les valeurs islamiques',
      date: new Date(2025, 4, 5),
      type: 'Conférence',
      participants: 320,
      description: 'Intervention de Sheikh Abdoulaye Touré',
    },
    {
      id: 'act-4',
      title: 'Célébration Mawlid',
      date: new Date(2025, 4, 20),
      type: 'Cérémonie',
      participants: 500,
      description: 'Commémoration de la naissance du Prophète',
    },
    {
      id: 'act-5',
      title: 'Journée portes ouvertes',
      date: new Date(2025, 5, 10),
      type: 'Événement',
      participants: 280,
      description: 'Présentation des programmes coraniques',
    },
  ];

  return (
    <Layout>
      <div className="space-y-8 p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springPresets.gentle}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Module Confessionnel Islamique</h1>
              <p className="text-muted-foreground mt-2">
                Suivi de la progression coranique et de l'éducation islamique
              </p>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {confessionalKPIs.map((kpi) => (
            <motion.div key={kpi.id} variants={staggerItem}>
              <StatsCard kpi={kpi} />
            </motion.div>
          ))}
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="suivi" className="font-bold text-xs">📖 Mémorisation Coran</TabsTrigger>
            <TabsTrigger value="education" className="font-bold text-xs">📚 Éducation Islamique</TabsTrigger>
            <TabsTrigger value="prieres" className="font-bold text-xs">🤲 Prières & Salat</TabsTrigger>
            <TabsTrigger value="activites" className="font-bold text-xs">🌙 Activités Religieuses</TabsTrigger>
            <TabsTrigger value="statistiques" className="font-bold text-xs">📊 Progression</TabsTrigger>
          </TabsList>

          <TabsContent value="suivi" className="space-y-6">
            <motion.div variants={fadeInUp} initial="hidden" animate="visible">
              <Card>
                <CardHeader>
                  <CardTitle>Suivi de la mémorisation du Coran</CardTitle>
                  <CardDescription>
                    Progression détaillée par sourate avec évaluation du Tajwid
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Cascaded Filters Bar */}
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black uppercase text-indigo-950 dark:text-white">
                      <Filter className="w-4 h-4 text-indigo-600" /> Filtrage et Recherche Facile de l'Élève
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      {/* 1. Niveau */}
                      <div>
                        <label className="text-[11px] font-bold mb-1 block">1. Niveau Scolaire</label>
                        <Select value={selectedNiveau} onValueChange={(val) => { setSelectedNiveau(val); setSelectedClassId('all'); }}>
                          <SelectTrigger className="text-xs bg-white dark:bg-slate-800">
                            <SelectValue placeholder="Tous les niveaux" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tous les niveaux</SelectItem>
                            <SelectItem value="primaire">🏫 Primaire (CP-CM2)</SelectItem>
                            <SelectItem value="college">📚 Collège (6ème-3ème)</SelectItem>
                            <SelectItem value="lycee">🎓 Lycée (2nde-Tle)</SelectItem>
                            <SelectItem value="maternelle">🧸 Maternelle</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 2. Classe */}
                      <div>
                        <label className="text-[11px] font-bold mb-1 block">2. Classe</label>
                        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                          <SelectTrigger className="text-xs bg-white dark:bg-slate-800">
                            <SelectValue placeholder="Toutes les classes" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            <SelectItem value="all">Toutes les classes</SelectItem>
                            {filteredClasses.map((cls) => (
                              <SelectItem key={cls.id} value={String(cls.id)}>
                                {cls.name || cls.CE_LIBELLE || `Classe #${cls.id}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 3. Recherche texte */}
                      <div>
                        <label className="text-[11px] font-bold mb-1 block">3. Recherche Rapide</label>
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                          <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Nom ou matricule..."
                            className="text-xs pl-8 bg-white dark:bg-slate-800"
                          />
                        </div>
                      </div>

                      {/* 4. Sélection Élève */}
                      <div>
                        <label className="text-[11px] font-bold mb-1 block text-indigo-900 dark:text-indigo-200">
                          4. Élève ({filteredStudents.length}) *
                        </label>
                        <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                          <SelectTrigger className="text-xs font-bold border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40">
                            <SelectValue placeholder="Choisir un élève..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {filteredStudents.length === 0 ? (
                              <div className="p-2 text-xs text-muted-foreground text-center">Aucun élève trouvé</div>
                            ) : (
                              filteredStudents.map((s) => {
                                const nomComplet = `${(s.lastName || s.nom || '').toUpperCase()} ${s.firstName || s.prenom || ''}`.trim();
                                const matricule = s.matricule || `ID-${s.id}`;
                                const classe = s.className || s.classe_name || 'Classe';
                                return (
                                  <SelectItem key={s.id} value={String(s.id)}>
                                    {matricule} — {nomComplet} ({classe})
                                  </SelectItem>
                                );
                              })
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {selectedStudent && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-xs">
                          {(selectedStudent.lastName || selectedStudent.nom || 'E')[0]}
                        </div>
                        <div>
                          <h3 className="font-black text-base text-indigo-950 dark:text-white">
                            {(selectedStudent.lastName || selectedStudent.nom || '').toUpperCase()} {selectedStudent.firstName || selectedStudent.prenom}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            <Badge variant="outline" className="font-mono text-[10px] bg-white dark:bg-slate-800">
                              Matricule: {selectedStudent.matricule || 'N/A'}
                            </Badge>
                            <span>•</span>
                            <span className="font-bold text-indigo-700 dark:text-indigo-300">
                              {selectedStudent.className || selectedStudent.classe_name || 'Classe non assignée'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-indigo-200 dark:border-indigo-900 pt-2 sm:pt-0 sm:pl-4">
                        <div>
                          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {Math.round(
                              studentSurahRecords.reduce((acc, r) => acc + r.progressPercentage, 0) /
                                studentSurahRecords.length || 0
                            )}
                            %
                          </p>
                          <p className="text-[11px] text-muted-foreground font-bold">Mémorisation Coran</p>
                        </div>
                        <div>
                          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                            {Math.round(
                              studentSurahRecords.reduce((acc, r) => acc + (r.tajwidScore || 0), 0) /
                                studentSurahRecords.length || 0
                            )}
                            /100
                          </p>
                          <p className="text-[11px] text-muted-foreground font-bold">Moyenne Tajwid</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <DataTable
                    columns={surahColumns}
                    data={studentSurahRecords}
                    title="Tableau de Suivi par Sourate (Coran)"
                    searchable
                    exportable
                  />
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="education" className="space-y-6">
            <motion.div variants={fadeInUp} initial="hidden" animate="visible">
              <Card>
                <CardHeader>
                  <CardTitle>Notes d'Éducation Islamique</CardTitle>
                  <CardDescription>
                    Évaluation des matières islamiques - Trimestre 2
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {islamicSubjects.map((subject) => (
                      <Card key={subject.name} className="border-2">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{subject.name}</CardTitle>
                            <div className={`w-3 h-3 rounded-full ${subject.color}`} />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold">{subject.score.toFixed(1)}</span>
                            <span className="text-muted-foreground">/20</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Coefficient</span>
                            <Badge variant="outline">{subject.coefficient}</Badge>
                          </div>
                          <Progress value={(subject.score / 20) * 100} className="h-2" />
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {subject.score >= 16 ? (
                              <>
                                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                <span>Excellent travail!</span>
                              </>
                            ) : subject.score >= 14 ? (
                              <>
                                <TrendingUp className="h-3 w-3 text-green-600" />
                                <span>Très bien</span>
                              </>
                            ) : subject.score >= 12 ? (
                              <span>Bien, continuez!</span>
                            ) : (
                              <span>À améliorer</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-3">
                      <Award className="h-6 w-6 text-primary" />
                      <div>
                        <p className="font-semibold">Moyenne Éducation Islamique</p>
                        <p className="text-2xl font-bold text-primary">
                          {(
                            islamicSubjects.reduce((acc, s) => acc + s.score * s.coefficient, 0) /
                            islamicSubjects.reduce((acc, s) => acc + s.coefficient, 0)
                          ).toFixed(2)}
                          /20
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="prieres" className="space-y-6">
            <motion.div variants={fadeInUp} initial="hidden" animate="visible">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-emerald-600" /> Suivi de l'Assiduité aux Prières (Salat à la Mosquée de l'Établissement)
                  </CardTitle>
                  <CardDescription>
                    Pointage de la présence des élèves aux 5 prières quotidiennes (Dhouhr, Asr à l'école) et comportement à la mosquée.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl">
                      <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-200 uppercase">Prières en Groupe (Dhouhr/Asr)</h4>
                      <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">94.2%</p>
                      <p className="text-xs text-emerald-800 dark:text-emerald-400 mt-1">Taux d'assiduité ce trimestre</p>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl">
                      <h4 className="font-bold text-xs text-blue-900 dark:text-blue-200 uppercase">Niveau de Discipline & Akhlaq</h4>
                      <p className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1">18.5/20</p>
                      <p className="text-xs text-blue-800 dark:text-blue-400 mt-1">Évaluation comportementale globale</p>
                    </div>

                    <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl">
                      <h4 className="font-bold text-xs text-amber-900 dark:text-amber-200 uppercase">Apprentissage des Invocations (Douas)</h4>
                      <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">14 Douas</p>
                      <p className="text-xs text-amber-800 dark:text-amber-400 mt-1">Validées par élève en moyenne</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900 border rounded-xl space-y-2">
                    <h4 className="font-bold text-sm text-indigo-950 dark:text-white">Horaires des Prières à l'Établissement (Yamassoukro / Abidjan)</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs pt-1">
                      <div className="p-2 bg-white dark:bg-slate-800 rounded border">
                        <span className="block font-bold text-muted-foreground">Fajr</span>
                        <span className="font-mono font-black text-sm">05:12</span>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-800 rounded border border-emerald-300 bg-emerald-50/50">
                        <span className="block font-bold text-emerald-800 dark:text-emerald-300">Dhouhr (École)</span>
                        <span className="font-mono font-black text-sm text-emerald-700">12:30</span>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-800 rounded border border-emerald-300 bg-emerald-50/50">
                        <span className="block font-bold text-emerald-800 dark:text-emerald-300">Asr (École)</span>
                        <span className="font-mono font-black text-sm text-emerald-700">15:45</span>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-800 rounded border">
                        <span className="block font-bold text-muted-foreground">Maghrib</span>
                        <span className="font-mono font-black text-sm">18:35</span>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-800 rounded border">
                        <span className="block font-bold text-muted-foreground">Isha</span>
                        <span className="font-mono font-black text-sm">19:48</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="activites" className="space-y-6">
            <motion.div variants={fadeInUp} initial="hidden" animate="visible">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-black flex items-center gap-2">
                      <Calendar className="w-6 h-6 text-indigo-600" /> Calendrier des Activités Religieuses
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Gestion, planification et historique des événements islamiques et activités spirituelles
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleOpenAddModal}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shadow-xs shrink-0"
                  >
                    <Plus className="w-4 h-4" /> Ajouter une Activité
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activities.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                        Aucune activité religieuse programmée. Cliquez sur "Ajouter une Activité".
                      </div>
                    ) : (
                      activities.map((activity) => (
                        <Card key={activity.id} className="border-l-4 border-l-indigo-600 border-slate-200 shadow-2xs hover:shadow-md transition-all">
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-black text-lg text-indigo-950 dark:text-white">{activity.title}</h3>
                                  <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-200 font-bold text-[11px]">
                                    {activity.type}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{activity.description}</p>

                                <div className="flex flex-wrap items-center gap-4 text-xs pt-1 text-muted-foreground">
                                  <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                                    <Calendar className="h-4 w-4 text-indigo-600" />
                                    <span>{new Date(activity.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                                    <Users className="h-4 w-4 text-emerald-600" />
                                    <span>{activity.participants} participants</span>
                                  </div>
                                  {activity.lieu && (
                                    <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                                      <MapPin className="h-4 w-4 text-rose-500" />
                                      <span>{activity.lieu}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Boutons Modifier & Supprimer */}
                              <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenEditModal(activity)}
                                  className="text-xs font-bold gap-1 border-indigo-300 text-indigo-800 hover:bg-indigo-50"
                                >
                                  <Pencil className="w-3.5 h-3.5" /> Modifier
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteActivity(activity.id, activity.title)}
                                  className="text-xs font-bold gap-1 border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Supprimer
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="statistiques" className="space-y-6">
            <motion.div variants={fadeInUp} initial="hidden" animate="visible">
              <Card>
                <CardHeader>
                  <CardTitle>Statistiques de Progression Coranique</CardTitle>
                  <CardDescription>
                    Vue d'ensemble de la mémorisation du Coran dans nos écoles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ConfessionalProgressChart />
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div variants={staggerItem}>
                <MetricCard
                  label="Élèves avec Juz complet"
                  value="42"
                  icon={<BookOpen className="h-5 w-5" />}
                  color="primary"
                />
              </motion.div>
              <motion.div variants={staggerItem}>
                <MetricCard
                  label="Moyenne Tajwid nos écoles"
                  value="82/100"
                  icon={<Star className="h-5 w-5" />}
                  color="accent"
                />
              </motion.div>
              <motion.div variants={staggerItem}>
                <MetricCard
                  label="Sourates mémorisées (total)"
                  value="1,247"
                  icon={<Award className="h-5 w-5" />}
                  color="secondary"
                />
              </motion.div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* MODAL AJOUT / MODIFICATION ACTIVITE RELIGIEUSE */}
      <Dialog open={showActivityModal} onOpenChange={setShowActivityModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              {editingActivity ? 'Modifier l\'Activité Religieuse' : 'Nouvelle Activité Religieuse'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-bold mb-1 block">Titre de l'événement *</label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="ex: Concours de Récitation du Coran"
                className="text-xs font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold mb-1 block">Type d'activité *</label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cérémonie">🎉 Cérémonie</SelectItem>
                    <SelectItem value="Concours">🏆 Concours</SelectItem>
                    <SelectItem value="Conférence">🎤 Conférence</SelectItem>
                    <SelectItem value="Observance">🌙 Observance</SelectItem>
                    <SelectItem value="Événement">📌 Événement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-bold mb-1 block">Date *</label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold mb-1 block">Nombre de participants *</label>
                <Input
                  type="number"
                  value={formParticipants}
                  onChange={(e) => setFormParticipants(e.target.value)}
                  placeholder="150"
                  className="text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold mb-1 block">Lieu / Mosquée</label>
                <Input
                  value={formLieu}
                  onChange={(e) => setFormLieu(e.target.value)}
                  placeholder="ex: Mosquée Yamoussoukro"
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold mb-1 block">Description détaillée</label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Objectif, déroulé et détails de l'activité..."
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivityModal(false)} className="text-xs font-bold">
              Annuler
            </Button>
            <Button onClick={handleSaveActivity} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5">
              <CheckCircle className="w-4 h-4" /> {editingActivity ? 'Mettre à jour' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
