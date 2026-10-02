import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/Layout';
import apiClient from '@/lib/apiClient';
import type { Student, Attendance, Evaluation, ClassRoom } from '@/lib/index';
import { formatStudentName } from '@/lib/index';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  ListChecks, CheckCircle, Clock, XCircle, Shield,
  Award, BarChart3, Save, RefreshCw, Calculator, UserCheck, BookOpen
} from 'lucide-react';

const todayISO = () => new Date().toISOString().split('T')[0];

const SUBJECTS_LIST = [
  'Mathématiques',
  'Français',
  'Anglais',
  'Histoire-Géographie',
  'Sciences Physiques',
  'SVT',
  'Éducation Islamique',
];

export default function VieScolaireTestPanel() {
  const { toast } = useToast();

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(false);

  // Appel state
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [appelDate, setAppelDate] = useState<string>(todayISO());
  const [attendanceForm, setAttendanceForm] = useState<Record<string, string>>({});
  const [savingAppel, setSavingAppel] = useState(false);

  // Grade state
  const [gradeClassId, setGradeClassId] = useState<string>('');
  const [gradeStudentId, setGradeStudentId] = useState<string>('');
  const [gradeSubject, setGradeSubject] = useState<string>('Mathématiques');
  const [gradeNote, setGradeNote] = useState<string>('15');
  const [gradeCoeff, setGradeCoeff] = useState<string>('2');
  const [gradeType, setGradeType] = useState<string>('devoir');
  const [gradeTrimester, setGradeTrimester] = useState<string>('1');
  const [savingGrade, setSavingGrade] = useState(false);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [cls, st, att, ev] = await Promise.all([
        apiClient.getClasses(),
        apiClient.getStudents(),
        apiClient.getAttendance(),
        apiClient.getEvaluations(),
      ]);
      setClasses(cls || []);
      setStudents(st || []);
      setAttendances(att || []);
      setEvaluations(ev || []);

      if (cls && cls.length > 0 && !selectedClassId) {
        setSelectedClassId(String(cls[0].id));
        setGradeClassId(String(cls[0].id));
      }
    } catch (err) {
      console.error('Erreur chargement données Vie Scolaire:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Filtered Students for selected class
  const selectedClassStudents = useMemo(() => {
    return students.filter(s => String(s.classId) === String(selectedClassId));
  }, [students, selectedClassId]);

  const gradeClassStudents = useMemo(() => {
    return students.filter(s => String(s.classId) === String(gradeClassId));
  }, [students, gradeClassId]);

  // Pre-fill attendance form with default 'present'
  useEffect(() => {
    if (selectedClassStudents.length > 0) {
      const initial: Record<string, string> = {};
      selectedClassStudents.forEach(s => {
        initial[s.id] = 'present';
      });
      setAttendanceForm(initial);
    }
  }, [selectedClassId, selectedClassStudents]);

  // Handle Appel submission
  const handleSaveAppel = async () => {
    if (!selectedClassId) {
      toast({ title: 'Erreur', description: 'Veuillez choisir une classe', variant: 'destructive' });
      return;
    }

    setSavingAppel(true);
    let count = 0;
    try {
      for (const student of selectedClassStudents) {
        const statut = attendanceForm[student.id] || 'present';
        await apiClient.createAttendance({
          date: appelDate,
          statut,
          classe_id: parseInt(selectedClassId, 10),
          eleve_id: parseInt(student.id, 10),
          justification: statut === 'absent' ? 'Appel de test' : undefined,
        });
        count++;
      }
      toast({ title: '✅ Appel Enregistré !', description: `${count} présence(s) validée(s) avec succès.` });
      const updatedAtt = await apiClient.getAttendance();
      setAttendances(updatedAtt || []);
    } catch (err) {
      toast({ title: 'Erreur', description: 'Échec de l\'enregistrement de l\'appel.', variant: 'destructive' });
    } finally {
      setSavingAppel(false);
    }
  };

  // Handle Grade submission
  const handleSaveGrade = async () => {
    if (!gradeStudentId) {
      toast({ title: 'Erreur', description: 'Veuillez choisir un élève', variant: 'destructive' });
      return;
    }
    const noteVal = parseFloat(gradeNote);
    if (isNaN(noteVal) || noteVal < 0 || noteVal > 20) {
      toast({ title: 'Erreur', description: 'La note doit être comprise entre 0 et 20.', variant: 'destructive' });
      return;
    }

    setSavingGrade(true);
    try {
      await apiClient.createEvaluation({
        matiere: gradeSubject,
        type: gradeType,
        trimestre: parseInt(gradeTrimester, 10),
        note: noteVal,
        coefficient: parseInt(gradeCoeff, 10) || 1,
        date: todayISO(),
        classe_id: parseInt(gradeClassId, 10),
        eleve_id: parseInt(gradeStudentId, 10),
        valide: false,
      });
      toast({ title: '✅ Note Enregistrée !', description: `Note de ${noteVal}/20 en ${gradeSubject} ajoutée.` });
      const updatedEv = await apiClient.getEvaluations();
      setEvaluations(updatedEv || []);
    } catch (err) {
      toast({ title: 'Erreur', description: 'Échec de l\'enregistrement de la note.', variant: 'destructive' });
    } finally {
      setSavingGrade(false);
    }
  };

  // Calculate Average by student
  const studentAverages = useMemo(() => {
    const map: Record<string, { student: Student; totalPoints: number; totalCoeff: number; evalsCount: number }> = {};

    gradeClassStudents.forEach(st => {
      map[st.id] = { student: st, totalPoints: 0, totalCoeff: 0, evalsCount: 0 };
    });

    evaluations.forEach(ev => {
      if (map[ev.studentId]) {
        const coeff = ev.coefficient || 1;
        map[ev.studentId].totalPoints += ev.note * coeff;
        map[ev.studentId].totalCoeff += coeff;
        map[ev.studentId].evalsCount += 1;
      }
    });

    return Object.values(map)
      .map(item => ({
        student: item.student,
        avg: item.totalCoeff > 0 ? (item.totalPoints / item.totalCoeff).toFixed(2) : null,
        evalsCount: item.evalsCount,
      }))
      .sort((a, b) => (b.avg ? parseFloat(b.avg) : 0) - (a.avg ? parseFloat(a.avg) : 0));
  }, [gradeClassStudents, evaluations]);

  // Overall attendance stats
  const attendanceStats = useMemo(() => {
    const present = attendances.filter(a => a.status === 'present').length;
    const absent = attendances.filter(a => a.status === 'absent').length;
    const retard = attendances.filter(a => a.status === 'retard').length;
    const excuse = attendances.filter(a => a.status === 'excuse').length;
    return { present, absent, retard, excuse, total: attendances.length };
  }, [attendances]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">
                🧪 Panneau de Test — Vie Scolaire
              </h1>
              <p className="text-muted-foreground mt-1">
                Faire des appels, vérifier les états, enregistrer des notes et calculer les moyennes en direct
              </p>
            </div>
            <Button variant="outline" onClick={loadAllData} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser Données
            </Button>
          </div>
        </motion.div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="p-3 border-emerald-200 bg-emerald-50 text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <div>
                <div className="text-2xl font-bold">{attendanceStats.present}</div>
                <div className="text-xs">Présents</div>
              </div>
            </div>
          </Card>
          <Card className="p-3 border-red-200 bg-red-50 text-red-800">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <div className="text-2xl font-bold">{attendanceStats.absent}</div>
                <div className="text-xs">Absents</div>
              </div>
            </div>
          </Card>
          <Card className="p-3 border-amber-200 bg-amber-50 text-amber-800">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <div>
                <div className="text-2xl font-bold">{attendanceStats.retard}</div>
                <div className="text-xs">Retards</div>
              </div>
            </div>
          </Card>
          <Card className="p-3 border-blue-200 bg-blue-50 text-blue-800">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{attendanceStats.excuse}</div>
                <div className="text-xs">Excusés</div>
              </div>
            </div>
          </Card>
          <Card className="p-3 border-purple-200 bg-purple-50 text-purple-800">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{evaluations.length}</div>
                <div className="text-xs">Notes Saisies</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="appel" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full h-12">
            <TabsTrigger value="appel" className="flex gap-2">
              <ListChecks className="h-4 w-4" /> 1. Appel & États
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex gap-2">
              <BookOpen className="h-4 w-4" /> 2. Saisie des Notes
            </TabsTrigger>
            <TabsTrigger value="moyennes" className="flex gap-2">
              <Calculator className="h-4 w-4" /> 3. Moyennes & Rang
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: APPEL & ETATS */}
          <TabsContent value="appel" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserCheck className="h-5 w-5 text-primary" />
                  Faire l'Appel par Classe
                </CardTitle>
                <CardDescription>Sélectionnez une classe et changez le statut des élèves</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1 block">Classe</Label>
                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                      <SelectTrigger><SelectValue placeholder="Choisir une classe" /></SelectTrigger>
                      <SelectContent>
                        {classes.map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1 block">Date de l'appel</Label>
                    <Input type="date" value={appelDate} onChange={e => setAppelDate(e.target.value)} />
                  </div>
                </div>

                {selectedClassStudents.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted text-xs font-semibold">
                        <tr>
                          <th className="p-3 text-left">Élève</th>
                          <th className="p-3 text-left">Matricule</th>
                          <th className="p-3 text-center">Statut (Présence)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-sm">
                        {selectedClassStudents.map(st => (
                          <tr key={st.id} className="hover:bg-muted/30">
                            <td className="p-3 font-medium">{formatStudentName(st)}</td>
                            <td className="p-3 text-muted-foreground text-xs font-mono">{st.matricule}</td>
                            <td className="p-3">
                              <RadioGroup
                                value={attendanceForm[st.id] || 'present'}
                                onValueChange={val => setAttendanceForm(prev => ({ ...prev, [st.id]: val }))}
                                className="flex justify-center gap-4"
                              >
                                <div className="flex items-center gap-1">
                                  <RadioGroupItem value="present" id={`st-${st.id}-p`} />
                                  <Label htmlFor={`st-${st.id}-p`} className="text-xs text-emerald-700 font-semibold cursor-pointer">Présent</Label>
                                </div>
                                <div className="flex items-center gap-1">
                                  <RadioGroupItem value="absent" id={`st-${st.id}-a`} />
                                  <Label htmlFor={`st-${st.id}-a`} className="text-xs text-red-700 font-semibold cursor-pointer">Absent</Label>
                                </div>
                                <div className="flex items-center gap-1">
                                  <RadioGroupItem value="retard" id={`st-${st.id}-r`} />
                                  <Label htmlFor={`st-${st.id}-r`} className="text-xs text-amber-700 font-semibold cursor-pointer">Retard</Label>
                                </div>
                                <div className="flex items-center gap-1">
                                  <RadioGroupItem value="excuse" id={`st-${st.id}-e`} />
                                  <Label htmlFor={`st-${st.id}-e`} className="text-xs text-blue-700 font-semibold cursor-pointer">Excusé</Label>
                                </div>
                              </RadioGroup>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center py-6 text-muted-foreground">Aucun élève trouvé pour cette classe.</p>
                )}

                <div className="flex justify-end">
                  <Button onClick={handleSaveAppel} disabled={savingAppel || selectedClassStudents.length === 0} className="gap-2">
                    <Save className="h-4 w-4" />
                    {savingAppel ? 'Enregistrement...' : 'Valider L\'Appel'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: SAISIE NOTES */}
          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Saisie Rapide d'une Note
                </CardTitle>
                <CardDescription>Ajoutez une note pour tester les calculs de moyennes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="mb-1 block">Classe</Label>
                    <Select value={gradeClassId} onValueChange={setGradeClassId}>
                      <SelectTrigger><SelectValue placeholder="Choisir classe" /></SelectTrigger>
                      <SelectContent>
                        {classes.map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1 block">Élève</Label>
                    <Select value={gradeStudentId} onValueChange={setGradeStudentId}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner un élève" /></SelectTrigger>
                      <SelectContent>
                        {gradeClassStudents.map(st => (
                          <SelectItem key={st.id} value={String(st.id)}>{formatStudentName(st)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1 block">Matière</Label>
                    <Select value={gradeSubject} onValueChange={setGradeSubject}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SUBJECTS_LIST.map(sub => (
                          <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="mb-1 block">Note (/20)</Label>
                    <Input type="number" min="0" max="20" step="0.5" value={gradeNote} onChange={e => setGradeNote(e.target.value)} />
                  </div>
                  <div>
                    <Label className="mb-1 block">Coefficient</Label>
                    <Input type="number" min="1" max="10" value={gradeCoeff} onChange={e => setGradeCoeff(e.target.value)} />
                  </div>
                  <div>
                    <Label className="mb-1 block">Type</Label>
                    <Select value={gradeType} onValueChange={setGradeType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="devoir">Devoir</SelectItem>
                        <SelectItem value="composition">Composition</SelectItem>
                        <SelectItem value="interrogation">Interrogation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1 block">Trimestre</Label>
                    <Select value={gradeTrimester} onValueChange={setGradeTrimester}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Trimestre 1</SelectItem>
                        <SelectItem value="2">Trimestre 2</SelectItem>
                        <SelectItem value="3">Trimestre 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveGrade} disabled={savingGrade || !gradeStudentId} className="gap-2">
                    <Save className="h-4 w-4" />
                    {savingGrade ? 'Enregistrement...' : 'Enregistrer la Note'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: MOYENNES & CLASSEMENT */}
          <TabsContent value="moyennes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calculator className="h-5 w-5 text-primary" />
                  Moyennes & Classement par Classe
                </CardTitle>
                <CardDescription>Résultats calculés en temps réel d'après les notes saisies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-w-xs">
                  <Label className="mb-1 block">Filtrer par Classe</Label>
                  <Select value={gradeClassId} onValueChange={setGradeClassId}>
                    <SelectTrigger><SelectValue placeholder="Choisir classe" /></SelectTrigger>
                    <SelectContent>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {studentAverages.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted text-xs font-semibold">
                        <tr>
                          <th className="p-3 text-center">Rang</th>
                          <th className="p-3 text-left">Élève</th>
                          <th className="p-3 text-left">Matricule</th>
                          <th className="p-3 text-center">Nombre d'évaluations</th>
                          <th className="p-3 text-center">Moyenne Générale</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-sm">
                        {studentAverages.map((item, index) => {
                          const avgNum = item.avg ? parseFloat(item.avg) : null;
                          let badgeClass = 'bg-amber-100 text-amber-800';

                          if (avgNum !== null) {
                            if (avgNum >= 12) {
                              badgeClass = 'bg-emerald-100 text-emerald-800 font-bold';
                            } else if (avgNum >= 10) {
                              badgeClass = 'bg-blue-100 text-blue-800 font-bold';
                            } else {
                              badgeClass = 'bg-red-100 text-red-800 font-bold';
                            }
                          }

                          return (
                            <tr key={item.student.id} className="hover:bg-muted/30">
                              <td className="p-3 text-center font-bold text-xs">
                                {index === 0 ? '🥇 1er' : index === 1 ? '🥈 2ème' : index === 2 ? '🥉 3ème' : `${index + 1}e`}
                              </td>
                              <td className="p-3 font-medium">{formatStudentName(item.student)}</td>
                              <td className="p-3 text-muted-foreground text-xs font-mono">{item.student.matricule}</td>
                              <td className="p-3 text-center text-xs">{item.evalsCount} note(s)</td>
                              <td className="p-3 text-center">
                                {item.avg ? (
                                  <span className={`px-2.5 py-1 rounded-full text-xs ${badgeClass}`}>
                                    {item.avg} / 20
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">Aucune note</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center py-6 text-muted-foreground">Aucun élève trouvé dans cette classe.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
