/**
 * Module Statistiques & Rapports
 * Onglets : Effectifs | Finances | Présences | Performance
 */
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Download, TrendingUp, Users, DollarSign, ClipboardCheck, School, FileText } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import apiClient from '@/lib/apiClient';
import type { Student, Staff, Payment, Attendance, School as SchoolType } from '@/lib/index';

// ─── Couleurs ─────────────────────────────────────────────────────────────────

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// ─── Composant ───────────────────────────────────────────────────────────────

export default function RapportsSpace() {
  const { toast } = useToast();

  const [schools, setSchools] = useState<SchoolType[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);
  const userEcoleId = localStorage.getItem('user_ecole_id');
  const userRole = localStorage.getItem('user_role');
  const initialSchoolFilter = (userEcoleId && userEcoleId !== 'null' && userEcoleId !== 'undefined' && !['admin', 'superuser', 'direction_fondation'].includes(userRole || ''))
    ? userEcoleId
    : 'all';

  const [filterEcole, setFilterEcole] = useState(initialSchoolFilter);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiClient.getSchools().catch((): SchoolType[] => []),
      apiClient.getStudents().catch((): Student[] => []),
      apiClient.getStaff().catch((): Staff[] => []),
      apiClient.getPayments().catch((): Payment[] => []),
      apiClient.getAttendance().catch((): Attendance[] => []),
    ]).then(([sc, st, sf, py, at]) => { setSchools(sc); setStudents(st); setStaff(sf); setPayments(py); setAttendances(at); })
      .finally(() => setLoading(false));
  }, []);

  // ─── Données dérivées ─────────────────────────────────────────────────────

  const studentsFiltered = useMemo(() =>
    filterEcole === 'all' ? students : students.filter(s => (s as any).schoolId === filterEcole),
    [students, filterEcole]);

  const staffFiltered = useMemo(() =>
    filterEcole === 'all' ? staff : staff.filter(s => s.schoolId === filterEcole),
    [staff, filterEcole]);

  const paymentsFiltered = useMemo(() =>
    filterEcole === 'all' ? payments : payments.filter(p => (p as any).schoolId === filterEcole),
    [payments, filterEcole]);

  // Effectifs par école
  const effectifsData = useMemo(() => schools.map(sc => ({
    name: sc.name.length > 14 ? sc.name.slice(0, 14) + '…' : sc.name,
    eleves: students.filter(s => (s as any).schoolId === sc.id).length,
    staff: staff.filter(s => s.schoolId === sc.id).length,
  })), [schools, students, staff]);

  // Finances par mois (6 derniers)
  const financeData = useMemo(() => {
    const months: Record<string, { mois: string; paye: number; attente: number }> = {};
    paymentsFiltered.forEach(p => {
      const m = new Date(p.date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      if (!months[m]) months[m] = { mois: m, paye: 0, attente: 0 };
      if (p.status === 'paye') months[m].paye += p.amount;
      else months[m].attente += p.amount;
    });
    return Object.values(months).slice(-6);
  }, [paymentsFiltered]);

  // Présences globales
  const presenceData = useMemo(() => {
    const total = attendances.length || 1;
    const present = attendances.filter(a => a.status === 'present').length;
    const absent = attendances.filter(a => a.status === 'absent').length;
    const retard = attendances.filter(a => a.status === 'retard').length;
    const excuse = total - present - absent - retard;
    return [
      { name: 'Présents', value: present, pct: Math.round(present / total * 100) },
      { name: 'Absents', value: absent, pct: Math.round(absent / total * 100) },
      { name: 'Retards', value: retard, pct: Math.round(retard / total * 100) },
      { name: 'Excusés', value: Math.max(0, excuse), pct: Math.max(0, Math.round(excuse / total * 100)) },
    ];
  }, [attendances]);

  // Performance par fonction (staff)
  const perfData = useMemo(() => {
    const byFunc: Record<string, { count: number; score: number }> = {};
    staffFiltered.forEach(s => {
      if (!byFunc[s.fonction]) byFunc[s.fonction] = { count: 0, score: 0 };
      byFunc[s.fonction].count++;
      byFunc[s.fonction].score += s.evaluationScore ?? 70;
    });
    return Object.entries(byFunc).map(([nom, v]) => ({ nom, effectif: v.count, score: Math.round(v.score / v.count) }));
  }, [staffFiltered]);

  // KPIs globaux
  const totalPaye = paymentsFiltered.filter(p => p.status === 'paye').reduce((s, p) => s + p.amount, 0);
  const totalAttente = paymentsFiltered.filter(p => p.status === 'en_attente').reduce((s, p) => s + p.amount, 0);
  const tauxPresence = attendances.length ? Math.round(attendances.filter(a => a.status === 'present').length / attendances.length * 100) : 0;

  // ─── Export CSV ────────────────────────────────────────────────────────────

  const exportCSV = (label: string, data: object[]) => {
    if (!data.length) { toast({ variant: 'destructive', title: 'Aucune donnée à exporter' }); return; }
    const headers = Object.keys(data[0]);
    const rows = data.map(r => headers.map(h => JSON.stringify((r as any)[h] ?? '')).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `rapport_${label}_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Rapport ${label} exporté en CSV` });
  };

  // ─── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><BarChart3 className="h-7 w-7 text-primary" />Statistiques & Rapports</h1>
            <p className="text-muted-foreground mt-1">Tableaux de bord analytiques et exports</p>
          </div>
          <Select value={filterEcole} onValueChange={setFilterEcole}>
            <SelectTrigger className="w-48 h-9 text-sm"><SelectValue placeholder="Toutes les écoles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les écoles</SelectItem>
              {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Élèves', value: studentsFiltered.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Personnel', value: staffFiltered.length, icon: School, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Recouvré (FCFA)', value: totalPaye.toLocaleString('fr-FR'), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Taux présence', value: `${tauxPresence}%`, icon: ClipboardCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(k => (
            <div key={k.label} className={`${k.bg} rounded-xl p-4 flex items-center gap-3`}>
              <k.icon className={`h-6 w-6 ${k.color} shrink-0`} />
              <div><p className="text-xs text-muted-foreground">{k.label}</p><p className={`font-bold text-lg ${k.color}`}>{k.value}</p></div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="effectifs">
          <TabsList>
            <TabsTrigger value="effectifs" className="gap-1"><Users className="h-4 w-4" />Effectifs</TabsTrigger>
            <TabsTrigger value="finances" className="gap-1"><DollarSign className="h-4 w-4" />Finances</TabsTrigger>
            <TabsTrigger value="presences" className="gap-1"><ClipboardCheck className="h-4 w-4" />Présences</TabsTrigger>
            <TabsTrigger value="performance" className="gap-1"><TrendingUp className="h-4 w-4" />Performance RH</TabsTrigger>
          </TabsList>

          {/* ─── Effectifs ─── */}
          <TabsContent value="effectifs" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Effectifs par établissement</CardTitle>
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => exportCSV('effectifs', effectifsData)}><Download className="h-3.5 w-3.5" />CSV</Button>
              </CardHeader>
              <CardContent>
                {loading ? <p className="text-center py-10 text-muted-foreground">Chargement…</p> : effectifsData.length === 0 ? <p className="text-center py-10 text-muted-foreground italic">Aucune donnée.</p> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={effectifsData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" angle={-25} textAnchor="end" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="eleves" name="Élèves" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="staff" name="Personnel" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Finances ─── */}
          <TabsContent value="finances" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base">Recouvrement mensuel (FCFA)</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">En attente : <span className="text-red-600 font-semibold">{totalAttente.toLocaleString('fr-FR')} FCFA</span></p>
                </div>
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => exportCSV('finances', financeData)}><Download className="h-3.5 w-3.5" />CSV</Button>
              </CardHeader>
              <CardContent>
                {financeData.length === 0 ? <p className="text-center py-10 text-muted-foreground italic">Aucune donnée.</p> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={financeData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => v.toLocaleString('fr-FR') + ' FCFA'} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="paye" name="Payé" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="attente" name="En attente" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Présences ─── */}
          <TabsContent value="presences" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Répartition des présences</CardTitle>
                  <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => exportCSV('presences', presenceData)}><Download className="h-3.5 w-3.5" />CSV</Button>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={presenceData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, pct }) => `${name} ${pct}%`} labelLine={false}>
                        {presenceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number, name: string) => [v, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Détail</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {presenceData.map((p, i) => (
                    <div key={p.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                        <span className="text-sm">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{p.value}</span>
                        <Badge variant="secondary" className="text-[10px]">{p.pct}%</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── Performance RH ─── */}
          <TabsContent value="performance" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Score moyen d'évaluation par fonction</CardTitle>
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => exportCSV('performance_rh', perfData)}><Download className="h-3.5 w-3.5" />CSV</Button>
              </CardHeader>
              <CardContent>
                {perfData.length === 0 ? <p className="text-center py-10 text-muted-foreground italic">Aucune donnée.</p> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={perfData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="nom" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="score" name="Score moyen (/100)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="effectif" name="Effectif" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </Layout>
  );
}
