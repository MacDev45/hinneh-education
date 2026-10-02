/**
 * Portail Famille — Espace parent
 * Suivi élève : notes, absences, paiements, bulletins
 */
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Heart, GraduationCap, ClipboardCheck, DollarSign, Bell, ChevronRight, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import apiClient from '@/lib/apiClient';
import type { Student, Evaluation, Attendance, Payment } from '@/lib/index';
import { formatStudentName } from '@/lib/index';

const getMention = (n: number) => n >= 16 ? 'Très bien' : n >= 14 ? 'Bien' : n >= 12 ? 'Assez bien' : n >= 10 ? 'Passable' : 'Insuffisant';
const noteColor = (n: number) => n >= 14 ? 'text-green-600' : n >= 10 ? 'text-amber-600' : 'text-red-600';

export default function PortailFamille() {
  const [students, setStudents] = useState<Student[]>([]);
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiClient.getStudents().catch((): Student[] => []),
      apiClient.getEvaluations().catch((): Evaluation[] => []),
      apiClient.getAttendance().catch((): Attendance[] => []),
      apiClient.getPayments().catch((): Payment[] => []),
    ]).then(([s, e, a, p]) => {
      setStudents(s); setEvals(e); setAttendance(a); setPayments(p);
      if (s.length > 0) setSelectedId(s[0].id);
    }).finally(() => setLoading(false));
  }, []);

  const student = useMemo(() => students.find(s => String(s.id) === String(selectedId)), [students, selectedId]);
  const studentEvals = useMemo(() => evals.filter(e => String(e.studentId) === String(selectedId)), [evals, selectedId]);
  const studentAtt = useMemo(() => attendance.filter(a => String(a.studentId) === String(selectedId)), [attendance, selectedId]);
  const studentPay = useMemo(() => payments.filter(p => String((p as any).studentId || (p as any).eleveId || (p as any).eleve_id) === String(selectedId)), [payments, selectedId]);

  const moyenneGen = useMemo(() => {
    if (!studentEvals.length) return null;
    return (studentEvals.reduce((s, e) => s + e.note, 0) / studentEvals.length).toFixed(2);
  }, [studentEvals]);

  const nbAbsences = studentAtt.filter(a => a.status === 'absent').length;
  const montantDu = studentPay.filter(p => p.status === 'en_attente').reduce((s, p) => s + p.amount, 0);
  const montantPaye = studentPay.filter(p => p.status === 'paye').reduce((s, p) => s + p.amount, 0);

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Heart className="h-7 w-7 text-rose-500" />Portail Famille</h1>
            <p className="text-muted-foreground mt-1">Suivi scolaire de votre enfant</p>
          </div>
          {students.length > 0 && (
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-52 h-9"><SelectValue placeholder="Choisir un élève" /></SelectTrigger>
              <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{formatStudentName(s)}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>

        {loading ? <p className="text-center py-16 text-muted-foreground">Chargement…</p> : !student ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground italic">Aucun élève disponible.</CardContent></Card>
        ) : (
          <>
            {/* Profil élève */}
            <Card className="bg-gradient-to-r from-primary/10 to-rose-50 border-primary/20">
              <CardContent className="pt-5 pb-4 px-5 flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold shrink-0">
                  {student.lastName[0]}{student.firstName[0]}
                </div>
                <div>
                  <p className="text-xl font-bold">{formatStudentName(student)}</p>
                  <p className="text-sm text-muted-foreground">{(student as any).className || (student as any).classId || '—'} • Année 2024-2025</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">{(student as any).cycle || 'Primaire'}</Badge>
                    <Badge variant={student.status === 'actif' ? 'default' : 'secondary'} className="text-xs">{student.status}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Moyenne générale', value: moyenneGen ? `${moyenneGen}/20` : '—', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Absences', value: nbAbsences, icon: AlertCircle, color: nbAbsences > 5 ? 'text-red-600' : 'text-amber-600', bg: nbAbsences > 5 ? 'bg-red-50' : 'bg-amber-50' },
                { label: 'Montant payé', value: `${montantPaye.toLocaleString('fr-FR')} F`, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
                { label: 'Restant dû', value: `${montantDu.toLocaleString('fr-FR')} F`, icon: DollarSign, color: montantDu > 0 ? 'text-red-600' : 'text-green-600', bg: montantDu > 0 ? 'bg-red-50' : 'bg-green-50' },
              ].map(k => (
                <div key={k.label} className={`${k.bg} rounded-xl p-4 flex items-center gap-3`}>
                  <k.icon className={`h-5 w-5 shrink-0 ${k.color}`} />
                  <div><p className="text-xs text-muted-foreground">{k.label}</p><p className={`font-bold ${k.color}`}>{k.value}</p></div>
                </div>
              ))}
            </div>

            <Tabs defaultValue="notes">
              <TabsList>
                <TabsTrigger value="notes" className="gap-1"><GraduationCap className="h-4 w-4" />Notes</TabsTrigger>
                <TabsTrigger value="presences" className="gap-1"><ClipboardCheck className="h-4 w-4" />Présences</TabsTrigger>
                <TabsTrigger value="paiements" className="gap-1"><DollarSign className="h-4 w-4" />Paiements</TabsTrigger>
              </TabsList>

              {/* Notes */}
              <TabsContent value="notes" className="mt-4">
                {studentEvals.length === 0 ? (
                  <Card><CardContent className="py-10 text-center text-muted-foreground italic">Aucune note disponible.</CardContent></Card>
                ) : (
                  <div className="overflow-x-auto rounded-xl border bg-card">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60 border-b">
                        <tr>
                          <th className="p-3 text-left">Matière</th>
                          <th className="p-3 text-left">Type</th>
                          <th className="p-3 text-center">Note</th>
                          <th className="p-3 text-center">/ 20</th>
                          <th className="p-3 text-left hidden sm:table-cell">Appréciation</th>
                          <th className="p-3 text-left hidden sm:table-cell">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentEvals.map(e => (
                          <tr key={e.id} className="border-b hover:bg-muted/20">
                            <td className="p-3 font-medium">{e.subject}</td>
                            <td className="p-3 text-xs text-muted-foreground capitalize">{e.type}</td>
                            <td className={`p-3 text-center font-bold text-base ${noteColor(e.note)}`}>{e.note}</td>
                            <td className="p-3 text-center text-muted-foreground text-xs">20</td>
                            <td className="p-3 text-xs text-muted-foreground hidden sm:table-cell">{e.appreciation || getMention(e.note)}</td>
                            <td className="p-3 text-xs text-muted-foreground hidden sm:table-cell">{new Date(e.date).toLocaleDateString('fr-FR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              {/* Présences */}
              <TabsContent value="presences" className="mt-4">
                {studentAtt.length === 0 ? (
                  <Card><CardContent className="py-10 text-center text-muted-foreground italic">Aucun enregistrement de présence.</CardContent></Card>
                ) : (
                  <div className="space-y-2">
                    {[...studentAtt].reverse().slice(0, 20).map(a => (
                      <div key={a.id} className="flex items-center justify-between bg-card border rounded-lg px-4 py-2.5">
                        <div>
                          <p className="font-medium text-sm">{new Date(a.date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
                          <p className="text-xs text-muted-foreground">{(a as any).subject || 'Cours'}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.status === 'present' ? 'bg-green-100 text-green-700' : a.status === 'absent' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Paiements */}
              <TabsContent value="paiements" className="mt-4">
                {studentPay.length === 0 ? (
                  <Card><CardContent className="py-10 text-center text-muted-foreground italic">Aucun paiement enregistré.</CardContent></Card>
                ) : (
                  <div className="overflow-x-auto rounded-xl border bg-card">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60 border-b">
                        <tr>
                          <th className="p-3 text-left">Date</th>
                          <th className="p-3 text-left">Date d'acquittement</th>
                          <th className="p-3 text-left">Libellé</th>
                          <th className="p-3 text-right">Montant</th>
                          <th className="p-3 text-center">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentPay.map(p => (
                          <tr key={p.id} className="border-b hover:bg-muted/20">
                            <td className="p-3 text-muted-foreground">{new Date(p.date).toLocaleDateString('fr-FR')}</td>
                            <td className="p-3 text-emerald-700 font-medium">{p.date_acquittement ? new Date(p.date_acquittement).toLocaleDateString('fr-FR') : (p.status === 'paye' ? new Date(p.date).toLocaleDateString('fr-FR') : '—')}</td>
                            <td className="p-3 font-medium">{(p as any).label || (p as any).description || 'Frais de scolarité'}</td>
                            <td className="p-3 text-right font-semibold">{p.amount.toLocaleString('fr-FR')} FCFA</td>
                            <td className="p-3 text-center">
                              <Badge variant={p.status === 'paye' ? 'default' : 'destructive'} className="text-[10px]">{p.status}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </motion.div>
    </Layout>
  );
}
