import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '@/components/Layout';
import { DataTable, type Column } from '@/components/DataTable';
import apiClient from '@/lib/apiClient';
import type { Student, Attendance as AttendanceType, ClassRoom } from '@/lib/index';
import { formatStudentName } from '@/lib/index';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar, Users, CheckCircle, Clock, XCircle, FileText,
  Search, RefreshCw, AlertTriangle, BookOpen, Shield,
  ChevronRight, TrendingDown, TrendingUp, Filter, Save,
  BarChart3, ListChecks, Eye
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const formatDate = (d: Date | string) => {
  if (!d) return '-';
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('fr-CI', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const todayISO = () => new Date().toISOString().split('T')[0];

const statusConfig = {
  present: { label: 'Présent', color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle },
  absent:  { label: 'Absent',  color: 'bg-red-500',     text: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     icon: XCircle     },
  retard:  { label: 'Retard',  color: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   icon: Clock       },
  excuse:  { label: 'Excusé',  color: 'bg-blue-500',    text: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    icon: Shield      },
};

const PIE_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

// ─── STAT CARD ────────────────────────────────────────────────────────────────

function StatPill({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl px-4 py-3 border ${colorClass} min-w-[90px]`}>
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-xs font-medium mt-0.5 opacity-80">{label}</span>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function Attendance() {
  const { toast } = useToast();

  // — Data
  const [classesList, setClassesList] = useState<ClassRoom[]>([]);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [attendanceList, setAttendanceList] = useState<AttendanceType[]>([]);
  const [loading, setLoading] = useState(false);

  // — Appel tab
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [appelDate, setAppelDate] = useState<string>(todayISO());
  const [appelHeure, setAppelHeure] = useState<string>('08:00');
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>({});
  const [justifications, setJustifications] = useState<Record<string, string>>({});
  const [savingAppel, setSavingAppel] = useState(false);

  // — Historique tab
  const [histClass, setHistClass] = useState<string>('');
  const [histDate, setHistDate] = useState<string>('');
  const [histStatus, setHistStatus] = useState<string>('all');
  const [histSearch, setHistSearch] = useState<string>('');

  // — Etats tab
  const [etatClass, setEtatClass] = useState<string>('');
  const [etatDate, setEtatDate] = useState<string>(todayISO());

  // ─── Load data ────────────────────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    try {
      const [classes, students, attendance] = await Promise.all([
        apiClient.getClasses(),
        apiClient.getStudents(),
        apiClient.getAttendance(),
      ]);
      setClassesList(classes || []);
      setStudentsList(students || []);
      setAttendanceList(attendance || []);
    } catch (err) {
      console.warn('Erreur chargement données:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ─── Derived data ─────────────────────────────────────────────────────────

  const activeStudents = useMemo(() =>
    studentsList.filter(s => s.status === 'actif'), [studentsList]);

  const classStudents = useMemo(() =>
    selectedClass ? activeStudents.filter(s => s.classId === selectedClass) : [],
    [selectedClass, activeStudents]);

  // ─── Appel Handlers ──────────────────────────────────────────────────────

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendanceData(prev => ({ ...prev, [studentId]: status }));
  };

  const handleJustificationChange = (studentId: string, text: string) => {
    setJustifications(prev => ({ ...prev, [studentId]: text }));
  };

  const initAppel = () => {
    const init: Record<string, string> = {};
    classStudents.forEach(s => { init[s.id] = 'present'; });
    setAttendanceData(init);
    setJustifications({});
  };

  useEffect(() => {
    if (classStudents.length > 0) initAppel();
  }, [selectedClass, classStudents.length]);

  const handleValidateAppel = async () => {
    if (!selectedClass) {
      toast({ title: 'Erreur', description: 'Sélectionnez une classe avant de valider.', variant: 'destructive' });
      return;
    }
    setSavingAppel(true);
    let successCount = 0;
    let errorCount = 0;

    const promises = classStudents.map(async (student) => {
      const status = attendanceData[student.id] || 'present';
      const payload = {
        date: appelDate,
        statut: status,
        heure: appelHeure,
        justification: justifications[student.id] || (status === 'absent' ? 'Saisie via appel' : undefined),
        classe_id: parseInt(selectedClass, 10),
        eleve_id: parseInt(student.id, 10),
      };
      try {
        await apiClient.createAttendance(payload);
        successCount++;
      } catch (err) {
        errorCount++;
        console.error('Erreur présence pour', student.id, err);
      }
    });

    await Promise.all(promises);
    setSavingAppel(false);

    toast({
      title: errorCount === 0 ? '✅ Appel validé !' : '⚠️ Appel partiellement enregistré',
      description: `${successCount} présence(s) enregistrée(s)${errorCount > 0 ? `, ${errorCount} erreur(s)` : ''}.`,
      variant: errorCount === 0 ? 'default' : 'destructive',
    });

    const updated = await apiClient.getAttendance();
    setAttendanceList(updated || []);
    initAppel();
  };

  const markAll = (status: string) => {
    const all: Record<string, string> = {};
    classStudents.forEach(s => { all[s.id] = status; });
    setAttendanceData(all);
  };

  // ─── Appel Statistics ─────────────────────────────────────────────────────

  const appelStats = useMemo(() => {
    const statuses = Object.values(attendanceData);
    return {
      present: statuses.filter(s => s === 'present').length,
      absent: statuses.filter(s => s === 'absent').length,
      retard: statuses.filter(s => s === 'retard').length,
      excuse: statuses.filter(s => s === 'excuse').length,
      total: classStudents.length,
    };
  }, [attendanceData, classStudents]);

  // ─── Historique Logic ─────────────────────────────────────────────────────

  const filteredHistory = useMemo(() => {
    return attendanceList.filter(a => {
      const student = studentsList.find(s => s.id === a.studentId);
      if (!student) return false;
      if (histClass && histClass !== 'all' && a.classId !== histClass) return false;
      if (histDate) {
        const aDate = a.date instanceof Date ? a.date.toISOString().split('T')[0] : String(a.date).split('T')[0];
        if (aDate !== histDate) return false;
      }
      if (histStatus !== 'all' && a.status !== histStatus) return false;
      if (histSearch) {
        const q = histSearch.toLowerCase();
        const name = `${formatStudentName(student)}`.toLowerCase();
        if (!name.includes(q) && !student.matricule.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [attendanceList, histClass, histDate, histStatus, histSearch, studentsList]);

  const historyColumns: Column[] = [
    {
      key: 'student', label: 'Élève',
      render: (_v, row: AttendanceType) => {
        const s = studentsList.find(st => st.id === row.studentId);
        return s ? (
          <div>
            <div className="font-semibold">{formatStudentName(s)}</div>
            <div className="text-xs text-muted-foreground">{s.matricule}</div>
          </div>
        ) : <span className="text-muted-foreground">—</span>;
      }
    },
    {
      key: 'class', label: 'Classe',
      render: (_v, row: AttendanceType) => {
        const cls = classesList.find(c => c.id === row.classId);
        return <Badge variant="outline">{cls?.name || '—'}</Badge>;
      }
    },
    {
      key: 'date', label: 'Date',
      render: (_v, row: AttendanceType) => formatDate(row.date),
    },
    {
      key: 'status', label: 'Statut',
      render: (_v, row: AttendanceType) => {
        const cfg = statusConfig[row.status as keyof typeof statusConfig];
        if (!cfg) return <Badge>{row.status}</Badge>;
        const Icon = cfg.icon;
        return (
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            <Icon className="h-3 w-3" />
            {cfg.label}
          </span>
        );
      }
    },
    {
      key: 'justification', label: 'Justification',
      render: (_v, row: AttendanceType) =>
        row.justification
          ? <span className="text-xs text-muted-foreground italic">{row.justification}</span>
          : <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      key: 'heure', label: 'Heure',
      render: (_v, row: AttendanceType) =>
        (row as any).heure ? <Badge variant="secondary">{(row as any).heure}</Badge> : '—',
    },
  ];

  // ─── États (dashboard) Logic ───────────────────────────────────────────────

  const etatStudents = useMemo(() =>
    etatClass && etatClass !== 'all' ? activeStudents.filter(s => s.classId === etatClass) : activeStudents,
    [etatClass, activeStudents]);

  const etatAttendances = useMemo(() => {
    return attendanceList.filter(a => {
      if (etatClass && etatClass !== 'all' && a.classId !== etatClass) return false;
      const aDate = a.date instanceof Date ? a.date.toISOString().split('T')[0] : String(a.date).split('T')[0];
      return aDate === etatDate;
    });
  }, [attendanceList, etatClass, etatDate]);

  const etatStats = useMemo(() => {
    const present = etatAttendances.filter(a => a.status === 'present').length;
    const absent = etatAttendances.filter(a => a.status === 'absent').length;
    const retard = etatAttendances.filter(a => a.status === 'retard').length;
    const excuse = etatAttendances.filter(a => a.status === 'excuse').length;
    const total = etatAttendances.length;
    return { present, absent, retard, excuse, total };
  }, [etatAttendances]);

  const pieData = [
    { name: 'Présents', value: etatStats.present },
    { name: 'Absents', value: etatStats.absent },
    { name: 'Retards', value: etatStats.retard },
    { name: 'Excusés', value: etatStats.excuse },
  ].filter(d => d.value > 0);

  // Weekly trend
  const weeklyTrend = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dStr = d.toISOString().split('T')[0];
      const dayA = attendanceList.filter(a => {
        const aStr = a.date instanceof Date ? a.date.toISOString().split('T')[0] : String(a.date).split('T')[0];
        return aStr === dStr;
      });
      const total = dayA.length;
      const present = dayA.filter(a => a.status === 'present').length;
      return {
        jour: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][d.getDay()],
        taux: total > 0 ? Math.round((present / total) * 100) : 0,
        absent: dayA.filter(a => a.status === 'absent').length,
      };
    });
  }, [attendanceList]);

  // Students with most absences
  const topAbsentees = useMemo(() => {
    return activeStudents
      .map(s => ({
        student: s,
        absences: attendanceList.filter(a => a.studentId === s.id && (a.status === 'absent' || a.status === 'retard')).length,
      }))
      .filter(x => x.absences >= 3)
      .sort((a, b) => b.absences - a.absences)
      .slice(0, 10);
  }, [activeStudents, attendanceList]);

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <Layout
      loading={loading}
      loadingMessage="Chargement de l'espace vie scolaire — présences..."
      loadingSubmessage="Synchronisation des registres d'appel et des effectifs"
    >
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Vie Scolaire — Présences
              </h1>
              <p className="text-muted-foreground mt-1">
                Appel, suivi des états, historique et analyse des présences
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={loadData} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Exporter
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Quick KPI Strip */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Élèves actifs", value: activeStudents.length, icon: Users, color: "text-primary" },
              { label: "Classes", value: classesList.length, icon: BookOpen, color: "text-violet-600" },
              { label: "Présences (total)", value: attendanceList.filter(a => a.status === 'present').length, icon: CheckCircle, color: "text-emerald-600" },
              { label: "Absences (total)", value: attendanceList.filter(a => a.status === 'absent').length, icon: XCircle, color: "text-red-500" },
            ].map((kpi, i) => (
              <motion.div key={kpi.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.05 }}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className={`p-2 rounded-lg bg-muted ${kpi.color}`}>
                      <kpi.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{kpi.value}</div>
                      <div className="text-xs text-muted-foreground">{kpi.label}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Tabs defaultValue="appel" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 h-12">
              <TabsTrigger value="appel" className="flex items-center gap-2 text-sm font-medium">
                <ListChecks className="h-4 w-4" />
                Faire l'appel
              </TabsTrigger>
              <TabsTrigger value="historique" className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                Historique
              </TabsTrigger>
              <TabsTrigger value="etats" className="flex items-center gap-2 text-sm font-medium">
                <BarChart3 className="h-4 w-4" />
                Tableau des états
              </TabsTrigger>
            </TabsList>

            {/* ══════════════ TAB: FAIRE L'APPEL ══════════════ */}
            <TabsContent value="appel" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-primary" />
                    Appel de la classe
                  </CardTitle>
                  <CardDescription>
                    Sélectionnez une classe, choisissez la date et marquez chaque élève
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Filters */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label>Classe</Label>
                      <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une classe" />
                        </SelectTrigger>
                        <SelectContent>
                          {classesList.map(cls => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.name} {cls.niveau ? `— ${cls.niveau}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={appelDate}
                        onChange={e => setAppelDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Heure</Label>
                      <Input
                        type="time"
                        value={appelHeure}
                        onChange={e => setAppelHeure(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Quick Mark buttons */}
                  {selectedClass && classStudents.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-sm text-muted-foreground font-medium mr-1">Tout marquer :</span>
                      {Object.entries(statusConfig).map(([key, cfg]) => (
                        <Button
                          key={key}
                          size="sm"
                          variant="outline"
                          className={`${cfg.bg} ${cfg.text} ${cfg.border} border hover:opacity-90`}
                          onClick={() => markAll(key)}
                        >
                          <cfg.icon className="h-3.5 w-3.5 mr-1.5" />
                          {cfg.label}
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Appel Stats Banner */}
                  {selectedClass && classStudents.length > 0 && (
                    <div className="flex flex-wrap gap-3 p-3 bg-muted/40 rounded-lg border">
                      <StatPill label="Présents" value={appelStats.present} colorClass="bg-emerald-50 text-emerald-700 border-emerald-200" />
                      <StatPill label="Absents" value={appelStats.absent} colorClass="bg-red-50 text-red-700 border-red-200" />
                      <StatPill label="Retards" value={appelStats.retard} colorClass="bg-amber-50 text-amber-700 border-amber-200" />
                      <StatPill label="Excusés" value={appelStats.excuse} colorClass="bg-blue-50 text-blue-700 border-blue-200" />
                      <div className="flex flex-col items-center justify-center rounded-xl px-4 py-3 border bg-muted min-w-[90px]">
                        <span className="text-2xl font-bold">{appelStats.total}</span>
                        <span className="text-xs font-medium mt-0.5 text-muted-foreground">Total</span>
                      </div>
                    </div>
                  )}

                  {/* Student List */}
                  {selectedClass && classStudents.length > 0 && (
                    <div className="rounded-xl border overflow-hidden">
                      <div className="max-h-[520px] overflow-y-auto">
                        <table className="w-full">
                          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-b">
                            <tr>
                              <th className="p-3 text-left text-sm font-semibold">#</th>
                              <th className="p-3 text-left text-sm font-semibold">Élève</th>
                              <th className="p-3 text-left text-sm font-semibold">Matricule</th>
                              <th className="p-3 text-center text-sm font-semibold">Statut</th>
                              <th className="p-3 text-left text-sm font-semibold">Justification</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {classStudents.map((student, idx) => {
                              const status = attendanceData[student.id] || 'present';
                              const cfg = statusConfig[status as keyof typeof statusConfig];
                              return (
                                <motion.tr
                                  key={student.id}
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.02 }}
                                  className={`transition-colors ${status !== 'present' ? cfg.bg : ''}`}
                                >
                                  <td className="p-3 text-sm text-muted-foreground font-mono">{idx + 1}</td>
                                  <td className="p-3">
                                    <div className="font-semibold text-sm">{formatStudentName(student)}</div>
                                  </td>
                                  <td className="p-3 text-xs text-muted-foreground font-mono">{student.matricule}</td>
                                  <td className="p-3">
                                    <RadioGroup
                                      value={status}
                                      onValueChange={v => handleStatusChange(student.id, v)}
                                      className="flex justify-center gap-3 flex-wrap"
                                    >
                                      {Object.entries(statusConfig).map(([key, c]) => (
                                        <div key={key} className="flex items-center gap-1.5">
                                          <RadioGroupItem value={key} id={`${student.id}-${key}`} />
                                          <Label
                                            htmlFor={`${student.id}-${key}`}
                                            className={`text-xs font-medium cursor-pointer px-2 py-0.5 rounded-full border transition-colors ${status === key ? `${c.bg} ${c.text} ${c.border}` : 'text-muted-foreground'}`}
                                          >
                                            {c.label}
                                          </Label>
                                        </div>
                                      ))}
                                    </RadioGroup>
                                  </td>
                                  <td className="p-3">
                                    {(status === 'absent' || status === 'excuse' || status === 'retard') && (
                                      <Input
                                        placeholder="Motif / justification..."
                                        className="h-7 text-xs"
                                        value={justifications[student.id] || ''}
                                        onChange={e => handleJustificationChange(student.id, e.target.value)}
                                      />
                                    )}
                                  </td>
                                </motion.tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {selectedClass && classStudents.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p>Aucun élève actif trouvé dans cette classe</p>
                    </div>
                  )}

                  {!selectedClass && (
                    <div className="text-center py-12 text-muted-foreground">
                      <ListChecks className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">Sélectionnez une classe pour commencer l'appel</p>
                    </div>
                  )}

                  {/* Submit Button */}
                  {selectedClass && classStudents.length > 0 && (
                    <div className="flex justify-end pt-2">
                      <Button
                        size="lg"
                        onClick={handleValidateAppel}
                        disabled={savingAppel}
                        className="gap-2 min-w-[180px]"
                      >
                        {savingAppel ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {savingAppel ? 'Enregistrement...' : 'Valider l\'appel'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ══════════════ TAB: HISTORIQUE ══════════════ */}
            <TabsContent value="historique" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Historique des présences
                  </CardTitle>
                  <CardDescription>
                    Filtrez par classe, date, statut ou recherchez un élève
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Filters */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label>Classe</Label>
                      <Select value={histClass} onValueChange={setHistClass}>
                        <SelectTrigger>
                          <SelectValue placeholder="Toutes les classes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les classes</SelectItem>
                          {classesList.map(cls => (
                            <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Date</Label>
                      <Input type="date" value={histDate} onChange={e => setHistDate(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Statut</Label>
                      <Select value={histStatus} onValueChange={setHistStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les statuts</SelectItem>
                          <SelectItem value="present">Présent</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                          <SelectItem value="retard">Retard</SelectItem>
                          <SelectItem value="excuse">Excusé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Recherche</Label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Nom ou matricule..."
                          value={histSearch}
                          onChange={e => setHistSearch(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Result count */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      <strong>{filteredHistory.length}</strong> enregistrement(s) trouvé(s)
                      {histDate && ` pour le ${formatDate(histDate)}`}
                    </span>
                    <div className="flex gap-2">
                      {Object.entries(statusConfig).map(([key, cfg]) => {
                        const count = filteredHistory.filter(a => a.status === key).length;
                        return count > 0 ? (
                          <span key={key} className={`text-xs px-2 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border} font-semibold`}>
                            {count} {cfg.label.toLowerCase()}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>

                  {/* Table */}
                  <DataTable
                    columns={historyColumns}
                    data={filteredHistory}
                    searchable={false}
                    exportable={true}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ══════════════ TAB: ÉTATS ══════════════ */}
            <TabsContent value="etats" className="space-y-4">
              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Tableau de bord des états
                  </CardTitle>
                  <CardDescription>Vue synthétique des présences par classe et par date</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 mb-6">
                    <div className="space-y-1 min-w-[220px]">
                      <Label>Classe</Label>
                      <Select value={etatClass} onValueChange={setEtatClass}>
                        <SelectTrigger>
                          <SelectValue placeholder="Toutes les classes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les classes</SelectItem>
                          {classesList.map(cls => (
                            <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Date</Label>
                      <Input type="date" value={etatDate} onChange={e => setEtatDate(e.target.value)} />
                    </div>
                  </div>

                  {/* Status Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    {Object.entries(statusConfig).map(([key, cfg]) => {
                      const count = etatStats[key as keyof typeof etatStats] as number;
                      const Icon = cfg.icon;
                      return (
                        <motion.div
                          key={key}
                          whileHover={{ scale: 1.03 }}
                          className={`rounded-xl border p-4 ${cfg.bg} ${cfg.border} flex flex-col gap-2`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={`h-5 w-5 ${cfg.text}`} />
                            <span className={`text-sm font-semibold ${cfg.text}`}>{cfg.label}</span>
                          </div>
                          <div className="text-4xl font-bold">{count}</div>
                          <div className="text-xs text-muted-foreground">
                            {etatStats.total > 0 ? `${Math.round((count / etatStats.total) * 100)}%` : '—'} du total
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Charts row */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Pie Chart */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3">Répartition du jour</h3>
                      {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              innerRadius={40}
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value}`}
                            >
                              {pieData.map((_, i) => (
                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                          Aucune donnée pour cette sélection
                        </div>
                      )}
                    </div>

                    {/* Weekly trend */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3">Tendance hebdomadaire (taux de présence)</h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={weeklyTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="jour" fontSize={12} stroke="var(--muted-foreground)" />
                          <YAxis domain={[0, 100]} unit="%" fontSize={12} stroke="var(--muted-foreground)" />
                          <Tooltip formatter={(v) => `${v}%`} />
                          <Line
                            type="monotone"
                            dataKey="taux"
                            stroke="var(--primary)"
                            strokeWidth={2.5}
                            dot={{ fill: 'var(--primary)', r: 4 }}
                            name="Taux de présence"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Classes Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-destructive" />
                    Élèves avec absences répétées
                  </CardTitle>
                  <CardDescription>Élèves cumulant 3 absences ou plus — nécessitant un suivi</CardDescription>
                </CardHeader>
                <CardContent>
                  {topAbsentees.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                      <p>Aucun élève avec absences répétées — Excellent !</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {topAbsentees.map(({ student, absences }) => {
                        const cls = classesList.find(c => c.id === student.classId);
                        const pct = Math.min(absences * 10, 100);
                        return (
                          <div key={student.id} className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm truncate">
                                {formatStudentName(student)}
                              </div>
                              <div className="text-xs text-muted-foreground">{student.matricule} — {cls?.name || '—'}</div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${absences >= 7 ? 'bg-red-500' : absences >= 5 ? 'bg-amber-500' : 'bg-yellow-400'}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                            <Badge variant={absences >= 7 ? 'destructive' : 'secondary'} className="shrink-0">
                              {absences} abs.
                            </Badge>
                            <Button size="sm" variant="outline" className="shrink-0">
                              <Eye className="h-3.5 w-3.5 mr-1.5" />
                              Voir
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </Layout>
  );
}
