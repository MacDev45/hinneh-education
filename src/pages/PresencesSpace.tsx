import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardCheck, Search, CheckCircle2, XCircle, Clock, AlertTriangle,
  FileText, Plus, Filter, UserCheck, Sparkles, DollarSign, Calculator, UserX
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DataTable, type Column } from '@/components/DataTable';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/apiClient';
import type { Student, ClassRoom, Attendance, StaffMember } from '@/lib/index';
import { formatStudentName } from '@/lib/index';
import { formatCurrency } from '@/lib/index';

interface Justificatif {
  id: string;
  studentId: string;
  date: string;
  motif: string;
  document: string;
  statut: 'en_attente' | 'accepte' | 'refuse';
}

export default function PresencesSpace() {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<string>('primaire_4appels');
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);

  const [filterClasse, setFilterClasse] = useState('all');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedPeriodePrimaire, setSelectedPeriodePrimaire] = useState<'p1' | 'p2' | 'p3' | 'p4'>('p1');
  const [search, setSearch] = useState('');

  // Primary 4 call slots definition
  const CALL_PERIODS_PRIMAIRE = [
    { id: 'p1', label: '1er Appel (08h00 - 10h00)', hours: '08h00 à 10h00', isRec: false },
    { id: 'rec1', label: '☕ Récréation (10h00 - 10h15)', hours: '10h00 à 10h15', isRec: true },
    { id: 'p2', label: '2e Appel (10h15 - 12h00)', hours: '10h15 à 12h00', isRec: false },
    { id: 'p3', label: '3e Appel (14h00 - 16h00)', hours: '14h00 à 16h00', isRec: false },
    { id: 'rec2', label: '☕ Récréation (16h00 - 16h15)', hours: '16h00 à 16h15', isRec: true },
    { id: 'p4', label: '4e Appel (16h15 - 17h00)', hours: '16h15 à 17h00', isRec: false },
  ];

  // Pointages Primaire (key: `${studentId}_${periode}`)
  const [pointagesPrimaire, setPointagesPrimaire] = useState<Record<string, 'present' | 'absent' | 'retard'>>({});

  // Surface Technicians List
  const [techniciensSurface, setTechniciensSurface] = useState([
    { id: 1, nom: "KOUAME Adjoua Pauline", role: "Technicienne de Surface (Bâtiment A)", arrivee: "07h15", depart: "16h30", statut: "Présent ✅" },
    { id: 2, nom: "YAO Koffi Martial", role: "Technicien de Surface (Bâtiment B)", arrivee: "07h30", depart: "16h45", statut: "Présent ✅" },
    { id: 3, nom: "N'DRI Marie-Chantal", role: "Technicienne de Surface (Maternelle)", arrivee: "07h20", depart: "16h00", statut: "Présent ✅" },
  ]);

  // Hourly Volume per Professor for Comptabilité / Paie
  const [volumeHoraireEnseignants, setVolumeHoraireEnseignants] = useState([
    { id: 101, prof_nom: "M. COULIBALY Moussa", matiere: "Mathématiques", volume_statutaire: 20, heures_effectuees: 22, heures_rattrapage: 2, taux_horaire: 3500, montant_du: 77000 },
    { id: 102, prof_nom: "Mme KOFFI Akissi Honorine", matiere: "Français & Littérature", volume_statutaire: 18, heures_effectuees: 18, heures_rattrapage: 0, taux_horaire: 3500, montant_du: 63000 },
    { id: 103, prof_nom: "M. TOURÉ Moussa", matiere: "Physique-Chimie", volume_statutaire: 15, heures_effectuees: 17, heures_rattrapage: 2, taux_horaire: 4000, montant_du: 68000 },
  ]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiClient.getStudents().catch((): Student[] => []),
      apiClient.getClasses().catch((): ClassRoom[] => []),
      apiClient.getStaff().catch((): StaffMember[] => []),
    ]).then(([s, c, st]) => {
      setStudents(s);
      setClasses(c);
      setStaffList(st);
    }).finally(() => setLoading(false));
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const q = search.toLowerCase();
      const matchC = filterClasse === 'all' || String(s.classId) === String(filterClasse);
      const matchQ = `${formatStudentName(s)}`.toLowerCase().includes(q);
      return matchC && matchQ;
    });
  }, [students, filterClasse, search]);

  const setStatusCall = (studentId: string | number, status: 'present' | 'absent' | 'retard') => {
    const key = `${studentId}_${selectedPeriodePrimaire}`;
    setPointagesPrimaire(prev => ({ ...prev, [key]: status }));
  };

  const savePrimaryCalls = () => {
    toast({
      title: '✅ Appel enregistré pour le créneau',
      description: `L'appel pour la période (${CALL_PERIODS_PRIMAIRE.find(p => p.id === selectedPeriodePrimaire)?.label}) a été sauvegardé.`,
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-indigo-950 dark:text-white flex items-center gap-2">
              <ClipboardCheck className="h-8 w-8 text-indigo-600" />
              Gestion des Présences & Suivi des Heures
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              4 Périodes d'appel quotidiennes au Primaire, présence des Techniciens de Surface et calcul du volume horaire pour la Paie / Comptabilité
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <TabsTrigger value="primaire_4appels" className="font-bold text-xs">🎒 Appels Primaire (4 Périodes)</TabsTrigger>
            <TabsTrigger value="volume_horaire_paie" className="font-bold text-xs">💰 Volume Horaire & Paie Profs</TabsTrigger>
            <TabsTrigger value="techniciens" className="font-bold text-xs">🧹 Techniciens de Surface</TabsTrigger>
          </TabsList>

          {/* TAB 1: 4 APPELS PRIMAIRE */}
          <TabsContent value="primaire_4appels" className="space-y-4 mt-4">
            
            {/* Call Period selector */}
            <Card className="border-indigo-100 bg-indigo-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-extrabold text-indigo-950 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" /> Sélection du Créneau d'Appel Journalier (Primaire)
                </CardTitle>
                <CardDescription className="text-xs text-indigo-800">
                  Le règlement exige 4 périodes d'appel par jour avec 2 récréations.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  {CALL_PERIODS_PRIMAIRE.map((p) => (
                    <Button
                      key={p.id}
                      disabled={p.isRec}
                      variant={selectedPeriodePrimaire === p.id ? 'default' : 'outline'}
                      onClick={() => !p.isRec && setSelectedPeriodePrimaire(p.id as any)}
                      className={`text-xs font-bold h-12 flex flex-col items-center justify-center ${
                        p.isRec ? 'bg-slate-100 text-slate-400 border-dashed border-slate-300' : selectedPeriodePrimaire === p.id ? 'bg-indigo-600 text-white' : 'bg-white'
                      }`}
                    >
                      <span>{p.label.split(' ')[0]} {p.label.split(' ')[1]}</span>
                      <span className="text-[10px] opacity-80">{p.hours}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Attendance Table */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Appel des Élèves — {CALL_PERIODS_PRIMAIRE.find(p => p.id === selectedPeriodePrimaire)?.label}</CardTitle>
                  <CardDescription className="text-xs">Cochez Présent, Absent ou Retard pour chaque élève.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={filterClasse} onValueChange={setFilterClasse}>
                    <SelectTrigger className="w-44 text-xs font-bold"><SelectValue placeholder="Toutes les classes" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les classes</SelectItem>
                      {classes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={savePrimaryCalls} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
                    Enregistrer l'Appel
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <DataTable
                  columns={[
                    { key: 'matricule', label: 'Matricule', sortable: true, render: (v) => <code className="text-xs font-bold">{v}</code> },
                    { key: 'nom', label: 'Nom & Prénom', sortable: true, render: (_v, r: Student) => <span className="font-extrabold text-xs">{r.lastName.toUpperCase()} {r.firstName}</span> },
                    { key: 'className', label: 'Classe', render: (v) => <span className="font-bold text-xs text-slate-700">{v || 'Primaire'}</span> },
                    { key: 'actions', label: 'Statut Présence', render: (_v, r: Student) => {
                      const key = `${r.id}_${selectedPeriodePrimaire}`;
                      const cur = pointagesPrimaire[key] || 'present';
                      return (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant={cur === 'present' ? 'default' : 'outline'}
                            onClick={() => setStatusCall(r.id, 'present')}
                            className={`text-[10px] h-7 px-2 font-bold ${cur === 'present' ? 'bg-emerald-600 text-white' : ''}`}
                          >
                            Présent ✅
                          </Button>
                          <Button
                            size="sm"
                            variant={cur === 'absent' ? 'default' : 'outline'}
                            onClick={() => setStatusCall(r.id, 'absent')}
                            className={`text-[10px] h-7 px-2 font-bold ${cur === 'absent' ? 'bg-rose-600 text-white' : ''}`}
                          >
                            Absent ⛔
                          </Button>
                          <Button
                            size="sm"
                            variant={cur === 'retard' ? 'default' : 'outline'}
                            onClick={() => setStatusCall(r.id, 'retard')}
                            className={`text-[10px] h-7 px-2 font-bold ${cur === 'retard' ? 'bg-amber-600 text-white' : ''}`}
                          >
                            Retard ⏳
                          </Button>
                        </div>
                      );
                    }},
                  ]}
                  data={filteredStudents}
                  searchable={true}
                  exportable={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: VOLUME HORAIRE ENSEIGNANTS POUR LA COMPTABILITÉ */}
          <TabsContent value="volume_horaire_paie" className="space-y-4 mt-4">
            <Card className="border-emerald-200">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-emerald-950">
                    <Calculator className="w-5 h-5 text-emerald-600" /> Suivi du Volume Horaire Enseignants (Accès Comptabilité & Paie)
                  </CardTitle>
                  <CardDescription className="text-xs text-emerald-800">
                    Nombre d'heures de cours effectivement dispensées par chaque professeur pour la préparation directe des bulletins de paie.
                  </CardDescription>
                </div>
                <Button onClick={() => toast({ title: '📄 Rapport envoyé à la Comptabilité', description: 'Le récapitulatif des heures de paie a été transmis.' })} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1">
                  <FileText className="w-4 h-4" /> Transmettre à la Comptabilité
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                <DataTable
                  columns={[
                    { key: 'prof_nom', label: 'Enseignant / Professeur', sortable: true, render: (_v, r: any) => <div><p className="font-extrabold text-xs text-slate-900">{r.prof_nom}</p><p className="text-[10px] text-muted-foreground">{r.matiere}</p></div> },
                    { key: 'volume_statutaire', label: 'Volume Contrat', sortable: true, render: (v) => <span className="font-bold text-xs">{v}h / sem</span> },
                    { key: 'heures_effectuees', label: 'Heures Réalisées', sortable: true, render: (v) => <span className="font-black text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{v} heures</span> },
                    { key: 'heures_rattrapage', label: 'Heures Rattrapage', sortable: true, render: (v) => <span className="font-mono text-xs text-amber-700">+{v}h</span> },
                    { key: 'taux_horaire', label: 'Taux Horaire', sortable: true, render: (v) => <span className="font-mono text-xs">{formatCurrency(v)} / h</span> },
                    { key: 'montant_du', label: 'Montant Dû Paie', sortable: true, render: (v) => <span className="font-black text-xs text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md">{formatCurrency(v)}</span> },
                  ]}
                  data={volumeHoraireEnseignants}
                  searchable={true}
                  exportable={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: TECHNICIENS DE SURFACE */}
          <TabsContent value="techniciens" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" /> Suivi de la Présence des Techniciens de Surface
                </CardTitle>
                <CardDescription className="text-xs">Pointage quotidien des agents d'entretien et d'assainissement de l'établissement.</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <DataTable
                  columns={[
                    { key: 'nom', label: 'Nom & Prénom Agent', sortable: true, render: (_v, r: any) => <div><p className="font-extrabold text-xs text-slate-900">{r.nom}</p><p className="text-[10px] text-muted-foreground">{r.role}</p></div> },
                    { key: 'arrivee', label: 'Heure d\'Arrivée', sortable: true, render: (v) => <span className="font-mono text-xs font-bold text-emerald-700">{v}</span> },
                    { key: 'depart', label: 'Heure de Départ', sortable: true, render: (v) => <span className="font-mono text-xs font-bold text-slate-700">{v}</span> },
                    { key: 'statut', label: 'Statut Présence', render: (v) => <Badge className="bg-emerald-600 text-white font-bold text-[10px]">{v}</Badge> },
                  ]}
                  data={techniciensSurface}
                  searchable={true}
                  exportable={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

      </div>
    </Layout>
  );
}
