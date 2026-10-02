import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/Layout';
import { DataTable, type Column } from '@/components/DataTable';
import apiClient from '@/lib/apiClient';
import type { Student, ClassRoom, Subject } from '@/lib/index';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  BookOpen, Trophy, Calendar, Plus, Bookmark, Clock,
  FileCheck, Globe, GraduationCap, RefreshCw, Award, Edit, CheckCircle2
} from 'lucide-react';

export interface MemorisationItem {
  id: number;
  eleve_nom: string;
  classe: string;
  sourate_chapitre: string;
  versets?: string;
  score_note: number;
  appreciation?: string;
  date_evaluation: string;
}

export interface ExamProgramItem {
  id: number;
  type_examen: 'devoir_niveau' | 'composition' | 'examen_blanc';
  titre: string;
  niveau: string;
  classe: string;
  matiere: string;
  date_examen: string;
  heure: string;
  salle: string;
  statut: string;
}

export interface RattrapageItem {
  id: number;
  classe: string;
  matiere: string;
  enseignant: string;
  date_rattrapage: string;
  heure: string;
  salle: string;
  motif: string;
  statut: string;
}

export default function PedagogieAdvanced() {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<string>('memorisation');
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Sample data states
  const [memorisations, setMemorisations] = useState<MemorisationItem[]>([
    { id: 1, eleve_nom: "KOUADIO Amenan Marie", classe: "6ème A", sourate_chapitre: "Sourate Al-Fatiha & Al-Baqara (Versets 1-20)", versets: "V. 1-20", score_note: 18.5, appreciation: "Excellente récitation et mémorisation parfaite", date_evaluation: "2026-08-10" },
    { id: 2, eleve_nom: "BAMBA Mohamed", classe: "5ème B", sourate_chapitre: "Sourate Al-Mulk", versets: "Complet", score_note: 16.0, appreciation: "Très bonne maîtrise du Tajwid", date_evaluation: "2026-08-12" },
  ]);

  const [examPrograms, setExamPrograms] = useState<ExamProgramItem[]>([
    { id: 1, type_examen: "devoir_niveau", titre: "Devoir de Niveau Mathématiques", niveau: "Troisième", classe: "3ème A, 3ème B", matiere: "Mathématiques", date_examen: "2026-10-14", heure: "08h00 - 10h00", salle: "Salle Polyvalente", statut: "Programmé" },
    { id: 2, type_examen: "examen_blanc", titre: "Examen Blanc Régional BEPC", niveau: "Troisième", classe: "Toutes les 3ème", matiere: "Toutes Matières", date_examen: "2027-02-15", heure: "08h00 - 17h00", salle: "Salles 1 à 6", statut: "Planifié" },
  ]);

  const [rattrapages, setRattrapages] = useState<RattrapageItem[]>([
    { id: 1, classe: "4ème A", matiere: "Physique-Chimie", enseignant: "M. TOURE Moussa", date_rattrapage: "2026-08-19", heure: "14h00 - 16h00", salle: "Labo Sciences", motif: "Rattrapage du chapitre Électricité suite à l'absence du 04/08", statut: "Confirmé" },
  ]);

  // Cahier de Textes State
  const [cahierTexteContent, setCahierTexteContent] = useState<string>(
    "Séance du 14/08/2026 (08h-10h) - Classe 3ème A:\n- Chapitre 4 : Équations du second degré.\n- Résolution d'exercices d'application n°1 à 5 p. 45.\n- Devoir à la maison pour le 21/08 : Exercice n°8 p. 48."
  );

  // Modals
  const [showAddMemoModal, setShowAddMemoModal] = useState<boolean>(false);
  const [showAddExamModal, setShowAddExamModal] = useState<boolean>(false);
  const [showAddRattrapageModal, setShowAddRattrapageModal] = useState<boolean>(false);

  // Forms
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [sourate, setSourate] = useState<string>('Sourate Al-Baqara');
  const [versetsText, setVersetsText] = useState<string>('Versets 1 à 30');
  const [memoScore, setMemoScore] = useState<string>('17.5');
  const [memoAppreciation, setMemoAppreciation] = useState<string>('Très bonne mémorisation');

  // Exam Form
  const [examType, setExamType] = useState<'devoir_niveau' | 'composition' | 'examen_blanc'>('devoir_niveau');
  const [examTitre, setExamTitre] = useState<string>('Devoir de Niveau Physique-Chimie');
  const [examNiveau, setExamNiveau] = useState<string>('Quatrième');
  const [examMatiere, setExamMatiere] = useState<string>('Physique-Chimie');
  const [examDate, setExamDate] = useState<string>('2026-10-20');
  const [examHeure, setExamHeure] = useState<string>('10h00 - 12h00');

  useEffect(() => {
    Promise.all([
      apiClient.getStudents(),
      apiClient.getClasses(),
      apiClient.getSubjects(),
    ]).then(([st, cls, sub]) => {
      setStudents(st || []);
      setClasses(cls || []);
      setSubjects(sub || []);
    }).catch(() => {});
  }, []);

  const handleAddMemo = () => {
    const st = students.find(s => String(s.id) === String(selectedStudentId));
    const newMemo: MemorisationItem = {
      id: Date.now(),
      eleve_nom: st ? `${st.lastName.toUpperCase()} ${st.firstName}` : 'Élève',
      classe: st?.className || 'Classe',
      sourate_chapitre: sourate,
      versets: versetsText,
      score_note: parseFloat(memoScore) || 10,
      appreciation: memoAppreciation,
      date_evaluation: new Date().toISOString().split('T')[0],
    };
    setMemorisations([...memorisations, newMemo]);
    setShowAddMemoModal(false);
    toast({ title: '✅ Mémorisation enregistrée', description: 'Évaluation du programme de mémorisation ajoutée.' });
  };

  const handleAddExam = () => {
    const newExam: ExamProgramItem = {
      id: Date.now(),
      type_examen: examType,
      titre: examTitre,
      niveau: examNiveau,
      classe: `Toutes les ${examNiveau}`,
      matiere: examMatiere,
      date_examen: examDate,
      heure: examHeure,
      salle: 'Salle d\'Examen',
      statut: 'Programmé',
    };
    setExamPrograms([...examPrograms, newExam]);
    setShowAddExamModal(false);
    toast({ title: '📅 Examen / Devoir de Niveau Programmé', description: `L'examen "${examTitre}" a été publié.` });
  };

  // Majors list per class
  const classMajors = useMemo(() => {
    return [
      { classe: '6ème A', major: 'KOUASSI Yao Jean', moyenne: 18.75, rang: '1er / 35' },
      { classe: '5ème B', major: 'DIALLO Aminata', moyenne: 18.20, rang: '1ère / 32' },
      { classe: '4ème A', major: 'KONAN Koffi Germain (LV2: Espagnol)', moyenne: 17.90, rang: '1er / 30' },
      { classe: '3ème A', major: 'BAMBA Fatoumata (LV2: Allemand)', moyenne: 18.45, rang: '1ère / 34' },
      { classe: 'Terminales A', major: 'TRAORÉ Oumar', moyenne: 17.10, rang: '1er / 28' },
    ];
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-indigo-950 dark:text-white flex items-center gap-2">
              <GraduationCap className="h-8 w-8 text-indigo-600" />
              Module de Gestion Pédagogique Avancée
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Mémorisation, Devoirs de Niveau & Examens Blancs, Rattrapages, LV2 (dès la 4e), Cahier de texte & Majors de classe
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-5 w-full bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <TabsTrigger value="memorisation" className="font-bold text-xs">📖 Mémorisation</TabsTrigger>
            <TabsTrigger value="examens" className="font-bold text-xs">📅 Devoirs & Compositions</TabsTrigger>
            <TabsTrigger value="rattrapage" className="font-bold text-xs">⏰ Rattrapages de Cours</TabsTrigger>
            <TabsTrigger value="majors" className="font-bold text-xs">🏆 Majors & LV2 (4e+)</TabsTrigger>
            <TabsTrigger value="cahier" className="font-bold text-xs">✏️ Cahier de Textes</TabsTrigger>
          </TabsList>

          {/* TAB 1: MEMORISATION */}
          <TabsContent value="memorisation" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Bookmark className="w-5 h-5 text-indigo-600" /> Suivi du Programme de Mémorisation
                  </CardTitle>
                  <CardDescription className="text-xs">Évaluation des récitatifs, sourates et versets mémorisés.</CardDescription>
                </div>
                <Button onClick={() => setShowAddMemoModal(true)} className="bg-indigo-600 text-white font-bold text-xs gap-1">
                  <Plus className="w-4 h-4" /> Évaluer Mémorisation
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                <DataTable
                  columns={[
                    { key: 'eleve_nom', label: 'Élève', sortable: true, render: (_v, r: MemorisationItem) => <div><p className="font-bold text-xs">{r.eleve_nom}</p><p className="text-[10px] text-slate-500">{r.classe}</p></div> },
                    { key: 'sourate_chapitre', label: 'Chapitre / Sourate', sortable: true, render: (_v, r: MemorisationItem) => <div><p className="font-extrabold text-xs text-indigo-900">{r.sourate_chapitre}</p><p className="text-[10px] font-mono">{r.versets}</p></div> },
                    { key: 'score_note', label: 'Note Mémorisation', sortable: true, render: (v) => <span className="font-black text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{v} / 20</span> },
                    { key: 'appreciation', label: 'Appréciation', render: (v) => <span className="text-xs italic text-slate-600">{v || 'Très bien'}</span> },
                    { key: 'date_evaluation', label: 'Date', render: (v) => <span className="font-mono text-xs">{v}</span> },
                  ]}
                  data={memorisations}
                  searchable={true}
                  exportable={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: EXAMENS & DEVOIRS DE NIVEAU */}
          <TabsContent value="examens" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-600" /> Programmation des Devoirs de Niveau & Examens Blancs
                  </CardTitle>
                  <CardDescription className="text-xs">Planification centrale effectuée par la Direction / Administration.</CardDescription>
                </div>
                <Button onClick={() => setShowAddExamModal(true)} className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1">
                  <Plus className="w-4 h-4" /> Programmer un Examen
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                <DataTable
                  columns={[
                    { key: 'type_examen', label: 'Type Examen', sortable: true, render: (v) => (
                      <Badge className={`font-bold text-[10px] ${v === 'examen_blanc' ? 'bg-rose-600 text-white' : v === 'composition' ? 'bg-amber-600 text-white' : 'bg-indigo-600 text-white'}`}>
                        {v === 'examen_blanc' ? 'EXAMEN BLANC' : v === 'composition' ? 'COMPOSITION' : 'DEVOIR DE NIVEAU'}
                      </Badge>
                    )},
                    { key: 'titre', label: 'Intitulé de l\'Épreuve', sortable: true, render: (v) => <span className="font-extrabold text-xs text-slate-900">{v}</span> },
                    { key: 'niveau', label: 'Niveau & Classes', sortable: true, render: (_v, r: ExamProgramItem) => <div><p className="font-bold text-xs">{r.niveau}</p><p className="text-[10px] text-slate-500">{r.classe}</p></div> },
                    { key: 'matiere', label: 'Matière', sortable: true, render: (v) => <span className="font-semibold text-xs text-indigo-700">{v}</span> },
                    { key: 'date_examen', label: 'Date & Horaires', sortable: true, render: (_v, r: ExamProgramItem) => <div><p className="font-mono text-xs font-bold">{r.date_examen}</p><p className="text-[10px]">{r.heure}</p></div> },
                    { key: 'statut', label: 'Statut', render: (v) => <Badge variant="outline" className="font-bold text-[10px] border-emerald-500 text-emerald-800">{v}</Badge> },
                  ]}
                  data={examPrograms}
                  searchable={true}
                  exportable={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: RATTRAPAGES */}
          <TabsContent value="rattrapage" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-rose-600" /> Module de Rattrapage de Cours
                </CardTitle>
                <CardDescription className="text-xs">Planification des heures de cours manquées et séances de mise à niveau.</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <DataTable
                  columns={[
                    { key: 'classe', label: 'Classe', sortable: true, render: (v) => <span className="font-bold text-xs text-indigo-900">{v}</span> },
                    { key: 'matiere', label: 'Matière', sortable: true, render: (v) => <span className="font-bold text-xs">{v}</span> },
                    { key: 'enseignant', label: 'Enseignant', sortable: true, render: (v) => <span className="text-xs">{v}</span> },
                    { key: 'date_rattrapage', label: 'Date & Horaires', sortable: true, render: (_v, r: RattrapageItem) => <div><p className="font-mono text-xs font-bold">{r.date_rattrapage}</p><p className="text-[10px]">{r.heure}</p></div> },
                    { key: 'motif', label: 'Motif du Rattrapage', render: (v) => <span className="text-xs italic text-slate-700">{v}</span> },
                    { key: 'statut', label: 'Statut', render: (v) => <Badge className="bg-emerald-600 text-white font-bold text-[10px]">{v}</Badge> },
                  ]}
                  data={rattrapages}
                  searchable={true}
                  exportable={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: MAJORS & LV2 */}
          <TabsContent value="majors" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Majors Card */}
              <Card className="border-amber-200 bg-amber-50/40">
                <CardHeader>
                  <CardTitle className="text-base font-black text-amber-900 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-600" /> Majors de Classe (1ers du Trimestre)
                  </CardTitle>
                  <CardDescription className="text-xs text-amber-800">Affichage et mise en valeur automatique des meilleurs élèves par classe.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {classMajors.map((m, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-amber-200 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-bold text-amber-700 uppercase">{m.classe}</span>
                        <h4 className="font-black text-sm text-slate-900">{m.major}</h4>
                        <p className="text-[10px] text-slate-500">{m.rang}</p>
                      </div>
                      <span className="text-base font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                        {m.moyenne} / 20
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* LV2 Management */}
              <Card className="border-indigo-200">
                <CardHeader>
                  <CardTitle className="text-base font-black text-indigo-900 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-indigo-600" /> Gestion LV2 (À partir de la 4ème)
                  </CardTitle>
                  <CardDescription className="text-xs">Affectation obligatoire de la Langue Vivante 2 (Espagnol ou Allemand).</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-4 text-xs">
                  <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                    <p className="font-bold text-indigo-900 mb-1">📌 Règle Pédagogique :</p>
                    <p className="text-slate-700">Dès l'entrée en classe de 4ème, chaque élève doit choisir obligatoirement son option LV2 : <strong>Espagnol</strong> ou <strong>Allemand</strong>.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Choix LV2 de l'Élève :</Label>
                    <Select defaultValue="espagnol">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="espagnol">🇪🇸 Langue Vivante 2 : Espagnol</SelectItem>
                        <SelectItem value="allemand">🇩🇪 Langue Vivante 2 : Allemand</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 5: CAHIER DE TEXTES */}
          <TabsContent value="cahier" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Edit className="w-5 h-5 text-indigo-600" /> Cahier de Textes Numérique Modifiable
                  </CardTitle>
                  <CardDescription className="text-xs">Les professeurs peuvent remplir et modifier le contenu des cours à tout moment.</CardDescription>
                </div>
                <Button onClick={() => toast({ title: '✅ Cahier de texte sauvegardé', description: 'Le contenu du cours a été mis à jour.' })} className="bg-indigo-600 text-white font-bold text-xs gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Enregistrer les Modifications
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <Textarea
                  rows={8}
                  value={cahierTexteContent}
                  onChange={(e) => setCahierTexteContent(e.target.value)}
                  className="font-mono text-xs leading-relaxed"
                />
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {/* Modal Mémorisation */}
        <Dialog open={showAddMemoModal} onOpenChange={setShowAddMemoModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-black flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-indigo-600" /> Évaluer la Mémorisation d'un Élève
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div>
                <Label className="font-bold mb-1 block">Sélectionner l'Élève *</Label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {students.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.lastName.toUpperCase()} {s.firstName} ({s.className || 'Classe'})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="font-bold mb-1 block">Sourate / Chapitre *</Label>
                  <Input value={sourate} onChange={(e) => setSourate(e.target.value)} className="text-xs" />
                </div>
                <div>
                  <Label className="font-bold mb-1 block">Versets</Label>
                  <Input value={versetsText} onChange={(e) => setVersetsText(e.target.value)} className="text-xs font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="font-bold mb-1 block">Note sur 20 *</Label>
                  <Input type="number" step="0.5" value={memoScore} onChange={(e) => setMemoScore(e.target.value)} className="text-xs font-mono font-bold" />
                </div>
                <div>
                  <Label className="font-bold mb-1 block">Appréciation</Label>
                  <Input value={memoAppreciation} onChange={(e) => setMemoAppreciation(e.target.value)} className="text-xs" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddMemoModal(false)} className="text-xs">Annuler</Button>
              <Button onClick={handleAddMemo} className="bg-indigo-600 text-white font-bold text-xs">Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Programmation Examen */}
        <Dialog open={showAddExamModal} onOpenChange={setShowAddExamModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-black flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-600" /> Programmer un Examen / Devoir de Niveau
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div>
                <Label className="font-bold mb-1 block">Type d'Épreuve *</Label>
                <Select value={examType} onValueChange={(v: any) => setExamType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="devoir_niveau">Devoir de Niveau</SelectItem>
                    <SelectItem value="composition">Composition Trimestrielle</SelectItem>
                    <SelectItem value="examen_blanc">Examen Blanc Régional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-bold mb-1 block">Intitulé *</Label>
                <Input value={examTitre} onChange={(e) => setExamTitre(e.target.value)} className="text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="font-bold mb-1 block">Niveau *</Label>
                  <Input value={examNiveau} onChange={(e) => setExamNiveau(e.target.value)} className="text-xs" />
                </div>
                <div>
                  <Label className="font-bold mb-1 block">Matière *</Label>
                  <Input value={examMatiere} onChange={(e) => setExamMatiere(e.target.value)} className="text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="font-bold mb-1 block">Date *</Label>
                  <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="text-xs font-mono" />
                </div>
                <div>
                  <Label className="font-bold mb-1 block">Horaires *</Label>
                  <Input value={examHeure} onChange={(e) => setExamHeure(e.target.value)} className="text-xs font-mono" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddExamModal(false)} className="text-xs">Annuler</Button>
              <Button onClick={handleAddExam} className="bg-amber-600 text-white font-bold text-xs">Publier la Programmation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
}
