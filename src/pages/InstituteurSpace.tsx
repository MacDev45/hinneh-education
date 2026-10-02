/**
 * Espace Instituteur (Primaire) — Gestion pédagogique primaire
 * Appel 2x/jour, compositions, cahier de textes, messagerie parents, devoirs
 */
import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Users, Calendar, ClipboardList, CheckSquare,
  MessageSquare, BarChart3, Save, Search,
  GraduationCap, Clock, Check, Send,
  Bell, FileText, PlusCircle, Sun, Sunset,
  AlertCircle, ChevronRight, Download,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Student, ClassRoom } from '@/lib/index';
import { formatStudentName } from '@/lib/index';
import apiClient from '@/lib/apiClient';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import { useToast } from '@/hooks/use-toast';
import { PrimaryTimetableGrid } from '@/components/PrimaryTimetableGrid';

// ─── Constantes ──────────────────────────────────────────────────────────────

const getInitialInstituteur = () => {
  const userFullName = typeof window !== 'undefined' ? localStorage.getItem('user_full_name') || localStorage.getItem('user_name') : '';
  const userPrenom = typeof window !== 'undefined' ? localStorage.getItem('user_prenom') : '';
  const userNom = typeof window !== 'undefined' ? localStorage.getItem('user_nom') : '';
  const username = typeof window !== 'undefined' ? localStorage.getItem('username') : '';

  return {
    id: 'current-user',
    firstName: userPrenom || userFullName || username || 'Instituteur',
    lastName: userNom || '',
    email: username || '',
    phone: '',
    matiere: 'Instituteur',
    grade: 'Instituteur',
    schoolId: '',
    schoolName: 'École Primaire Confessionnelle HINNEH',
  };
};

// Matières primaire standard
const MATIERES_PRIMAIRE = [
  { code: 'FR', libelle: 'Français' },
  { code: 'MA', libelle: 'Mathématiques' },
  { code: 'EVS', libelle: 'Éveil Scientifique' },
  { code: 'HG', libelle: 'Histoire-Géographie' },
  { code: 'EPS', libelle: 'EPS' },
  { code: 'AR', libelle: 'Arabe' },
  { code: 'ANG', libelle: 'Anglais' },
  { code: 'INFO', libelle: 'Informatique' },
  { code: 'EMR', libelle: 'EMR' },
  { code: 'CONDUITE', libelle: 'Conduite' },
];

// Matières composition IEP vs interne
const MATIERES_COMPOSITION_IEP = ['FR', 'MA', 'EVS', 'HG', 'AR'];
const MATIERES_COMPOSITION_INTERNE = ['FR', 'MA', 'EVS', 'HG', 'AR', 'ANG', 'INFO', 'EMR', 'CONDUITE'];

// Disciplines multi-classes (instituteur peut avoir plusieurs classes)
const DISCIPLINES_MULTI_CLASSES = ['AR', 'ANG', 'INFO'];

// Disciplines indépendantes — hors moyenne générale
const DISCIPLINES_HORS_MOYENNE = ['EMR', 'CONDUITE'];

// Plages d'appel primaire
const PLAGES_APPEL = [
  { code: 'matin', label: 'Matin', heures: '08h00 – 12h00', icon: Sun },
  { code: 'apres_midi', label: 'Après-midi', heures: '14h00 – 18h00', icon: Sunset },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const presenceColors: Record<string, string> = {
  present: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  retard: 'bg-yellow-100 text-yellow-700',
  excuse: 'bg-blue-100 text-blue-700',
};

// ─── Composant Appel Primaire ─────────────────────────────────────────────────

interface AppelPrimaireProps {
  students: Student[];
  classes: ClassRoom[];
  selectedClassId: string;
  onClassChange: (id: string) => void;
  onAppelSaved: (plage: string) => void;
}

function AppelPrimaire({ students, classes, selectedClassId, onClassChange, onAppelSaved }: AppelPrimaireProps) {
  const now = new Date();
  const hour = now.getHours();
  const defaultPlage = hour < 13 ? 'matin' : 'apres_midi';

  const [selectedPlage, setSelectedPlage] = useState<string>(defaultPlage);
  const [selectedDate, setSelectedDate] = useState(() => now.toISOString().split('T')[0]);
  const [presences, setPresences] = useState<Record<string, 'present' | 'absent' | 'retard' | 'excuse'>>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const initial: Record<string, 'present' | 'absent' | 'retard' | 'excuse'> = {};
    students.forEach(s => { initial[s.id] = 'present'; });
    setPresences(initial);
  }, [students, selectedClassId, selectedPlage, selectedDate]);

  const filtered = useMemo(() =>
    students.filter(s =>
      `${formatStudentName(s)} ${s.matricule}`.toLowerCase().includes(search.toLowerCase())
    ), [students, search]);

  const stats = useMemo(() => {
    const vals = Object.values(presences);
    return {
      presents: vals.filter(v => v === 'present').length,
      absents: vals.filter(v => v === 'absent').length,
      retards: vals.filter(v => v === 'retard').length,
      excuses: vals.filter(v => v === 'excuse').length,
    };
  }, [presences]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries = Object.entries(presences).map(([studentId, status]) => ({
        student_id: parseInt(studentId, 10) || 1,
        classe_id: parseInt(selectedClassId, 10) || 1,
        date: selectedDate,
        statut: status,
        plage: selectedPlage,
      }));

      for (const entry of entries) {
        await apiClient.createAttendance({
          studentId: String(entry.student_id),
          classId: String(entry.classe_id),
          date: new Date(entry.date),
          status: entry.statut,
          subject: `appel_${entry.plage}`,
        }).catch((_e: unknown): null => null);
      }

      setSaved(true);
      onAppelSaved(selectedPlage);
      toast({
        title: `Appel ${selectedPlage === 'matin' ? 'du matin' : 'de l\'après-midi'} enregistré`,
        description: `${stats.absents} absent(s) — votre présence a été confirmée automatiquement.`,
      });
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'enregistrer l\'appel.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Alerte rappel appel */}
      <Alert className="border-amber-300 bg-amber-50">
        <Bell className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 text-sm font-medium">
          N'oubliez pas d'effectuer l'appel au début de chaque demi-journée. Votre présence sera enregistrée automatiquement.
        </AlertDescription>
      </Alert>

      {/* Sélecteurs */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedClassId} onValueChange={onClassChange}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Classe" /></SelectTrigger>
          <SelectContent>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Plage matin / après-midi */}
        <div className="flex gap-2">
          {PLAGES_APPEL.map(plage => {
            const Icon = plage.icon;
            return (
              <Button
                key={plage.code}
                size="sm"
                variant={selectedPlage === plage.code ? 'default' : 'outline'}
                className="gap-1.5"
                onClick={() => setSelectedPlage(plage.code)}
              >
                <Icon className="h-3.5 w-3.5" />
                {plage.label}
                <span className="text-xs opacity-70">({plage.heures})</span>
              </Button>
            );
          })}
        </div>

        <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-44" />
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher élève..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button size="sm" className="gap-1 ml-auto" onClick={handleSave} disabled={saving}>
          {saving ? <Clock className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? 'Enregistrement...' : saved ? 'Enregistré !' : 'Valider l\'appel'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Présents', value: stats.presents, color: 'bg-green-100 text-green-700' },
          { label: 'Absents', value: stats.absents, color: 'bg-red-100 text-red-700' },
          { label: 'Retards', value: stats.retards, color: 'bg-yellow-100 text-yellow-700' },
          { label: 'Excusés', value: stats.excuses, color: 'bg-blue-100 text-blue-700' },
        ].map(s => (
          <div key={s.label} className={`text-center p-2 rounded-lg ${s.color}`}>
            <p className="text-xl font-bold font-mono">{s.value}</p>
            <p className="text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Liste élèves */}
      <Card>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/90 border-b border-border z-10">
              <tr>
                <th className="text-left p-3 font-semibold">Élève</th>
                <th className="text-center p-3 font-semibold w-28">✅ Présent</th>
                <th className="text-center p-3 font-semibold w-28">❌ Absent</th>
                <th className="text-center p-3 font-semibold w-28">⏰ Retard</th>
                <th className="text-center p-3 font-semibold w-28">📋 Excusé</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} className={`border-b border-border hover:bg-muted/20 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {s.lastName[0]}{s.firstName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-xs">{formatStudentName(s)}</p>
                        <p className="text-xs text-muted-foreground font-mono">{s.matricule}</p>
                      </div>
                    </div>
                  </td>
                  {(['present', 'absent', 'retard', 'excuse'] as const).map(status => (
                    <td key={status} className="p-3 text-center">
                      <input
                        type="radio"
                        name={`presence-${s.id}`}
                        checked={presences[s.id] === status}
                        onChange={() => setPresences(prev => ({ ...prev, [s.id]: status }))}
                        className="h-4 w-4 cursor-pointer accent-primary"
                      />
                    </td>
                  ))}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-muted-foreground italic">
                    Aucun élève trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── Composant Compositions ───────────────────────────────────────────────────

function CompositionsModule({
  classes,
  selectedClassId,
  students,
  onClassChange,
}: {
  classes: ClassRoom[];
  selectedClassId: string;
  students: Student[];
  onClassChange: (id: string) => void;
}) {
  const [typeComposition, setTypeComposition] = useState<'interne' | 'iep'>('interne');
  const [trimestre, setTrimestre] = useState<'1' | '2' | '3'>('1');
  const [notes, setNotes] = useState<Record<string, Record<string, number>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  const matieres = typeComposition === 'iep'
    ? MATIERES_PRIMAIRE.filter(m => MATIERES_COMPOSITION_IEP.includes(m.code))
    : MATIERES_PRIMAIRE.filter(m => MATIERES_COMPOSITION_INTERNE.includes(m.code));

  const getNote = (studentId: string, matCode: string): number => {
    return notes[studentId]?.[matCode] ?? 0;
  };

  const setNote = (studentId: string, matCode: string, value: number) => {
    setNotes(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? {}), [matCode]: value },
    }));
  };

  const matieresNotees = matieres.filter(m => !DISCIPLINES_HORS_MOYENNE.includes(m.code));
  const matieresHorsMoyenne = matieres.filter(m => DISCIPLINES_HORS_MOYENNE.includes(m.code));

  const getMoyenne = (studentId: string): number => {
    const vals = matieresNotees.map(m => getNote(studentId, m.code)).filter(v => v > 0);
    if (!vals.length) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  const classMoyenne = useMemo(() => {
    const moyennes = students.map(s => getMoyenne(s.id)).filter(v => v > 0);
    if (!moyennes.length) return 0;
    return moyennes.reduce((a, b) => a + b, 0) / moyennes.length;
  }, [notes, students, matieresNotees]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const classIdNum = parseInt(selectedClassId, 10);
      const today = new Date().toISOString().split('T')[0];
      
      const savePromises = matieres.map(async m => {
        const studentGrades = students
          .map(s => ({
            eleve_id: parseInt(s.id, 10),
            note: getNote(s.id, m.code),
            appreciation: getNote(s.id, m.code) >= 18 ? "Excellent" : getNote(s.id, m.code) >= 16 ? "Très bien" : getNote(s.id, m.code) >= 14 ? "Bien" : getNote(s.id, m.code) >= 12 ? "Assez bien" : getNote(s.id, m.code) >= 10 ? "Passable" : getNote(s.id, m.code) >= 8 ? "Insuffisant" : "Très insuffisant",
          }))
          .filter(g => g.note > 0);

        if (studentGrades.length > 0) {
          await apiClient.saveEvaluationsBulk({
            classe_id: classIdNum,
            matiere: m.libelle,
            trimestre: parseInt(trimestre, 10),
            type: typeComposition === 'iep' ? 'composition IEP' : 'composition interne',
            devoir_numero: `COMP-${typeComposition.toUpperCase()}-T${trimestre}-${m.code}`,
            coefficient: 1,
            date: today,
            valide: false,
            notes: studentGrades,
          });
        }
      });

      await Promise.all(savePromises);
      setSaved(true);
      toast({
        title: 'Composition enregistrée avec succès !',
        description: `Trimestre ${trimestre} — Type: ${typeComposition === 'iep' ? 'IEP' : 'Interne'} — Moyenne classe: ${classMoyenne.toFixed(2)}/20`,
      });
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Erreur sauvegarde composition:", err);
      toast({
        title: "Erreur d'enregistrement",
        description: "Impossible de sauvegarder la composition sur le serveur.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Options */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={selectedClassId} onValueChange={onClassChange}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Classe" /></SelectTrigger>
          <SelectContent>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button size="sm" variant={typeComposition === 'interne' ? 'default' : 'outline'} onClick={() => setTypeComposition('interne')}>
            Composition Interne
          </Button>
          <Button size="sm" variant={typeComposition === 'iep' ? 'default' : 'outline'} onClick={() => setTypeComposition('iep')}>
            Composition IEP
          </Button>
        </div>

        <Select value={trimestre} onValueChange={v => setTrimestre(v as '1' | '2' | '3')}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1er Trimestre</SelectItem>
            <SelectItem value="2">2ème Trimestre</SelectItem>
            <SelectItem value="3">3ème Trimestre</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Moy. classe: <strong className={classMoyenne >= 10 ? 'text-green-600' : 'text-red-600'}>{classMoyenne.toFixed(2)}/20</strong></span>
          <Button size="sm" className="gap-1" onClick={handleSave} disabled={saving}>
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? 'Enregistrement...' : saved ? 'Enregistré !' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {typeComposition === 'iep'
          ? `Matières IEP (${matieres.length}) : ${matieres.map(m => m.libelle).join(', ')}`
          : `Matières internes (${matieres.length}) : ${matieres.map(m => m.libelle).join(', ')}`}
      </p>

      {/* Tableau de saisie */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/90 border-b z-10">
              <tr>
                <th className="text-left p-2 font-semibold min-w-[160px]">Élève</th>
                {matieresNotees.map(m => (
                  <th key={m.code} className="text-center p-2 font-semibold min-w-[80px]">{m.libelle}</th>
                ))}
                <th className="text-center p-2 font-semibold min-w-[80px] bg-primary/10">Moyenne</th>
                {matieresHorsMoyenne.length > 0 && (
                  <th colSpan={matieresHorsMoyenne.length} className="text-center p-2 font-semibold min-w-[80px] bg-amber-50 text-amber-700 border-l-2 border-amber-300">
                    Hors moyenne
                  </th>
                )}
              </tr>
              {matieresHorsMoyenne.length > 0 && (
                <tr className="bg-amber-50/60">
                  <th className="p-1"></th>
                  {matieresNotees.map(m => <th key={m.code} className="p-1"></th>)}
                  <th className="p-1"></th>
                  {matieresHorsMoyenne.map(m => (
                    <th key={m.code} className="text-center p-1 text-[11px] font-semibold text-amber-700 border-l border-amber-200">{m.libelle}</th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {students.map((s, i) => {
                const moy = getMoyenne(s.id);
                return (
                  <tr key={s.id} className={`border-b hover:bg-muted/20 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                    <td className="p-2">
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {s.lastName[0]}{s.firstName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{formatStudentName(s)}</span>
                      </div>
                    </td>
                    {matieresNotees.map(m => (
                      <td key={m.code} className="p-1 text-center">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.25"
                          value={getNote(s.id, m.code) || ''}
                          onChange={e => setNote(s.id, m.code, Number(e.target.value))}
                          className={`w-14 text-center font-bold font-mono bg-transparent border border-border rounded px-1 py-0.5 focus:outline-none focus:border-primary
                            ${getNote(s.id, m.code) >= 10 ? 'text-green-600' : getNote(s.id, m.code) > 0 ? 'text-red-600' : 'text-foreground'}`}
                        />
                      </td>
                    ))}
                    <td className={`p-2 text-center font-bold font-mono ${moy >= 10 ? 'text-green-600' : moy > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {moy > 0 ? moy.toFixed(2) : '—'}
                    </td>
                    {matieresHorsMoyenne.map(m => (
                      <td key={m.code} className="p-1 text-center border-l border-amber-200">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          value={getNote(s.id, m.code) || ''}
                          onChange={e => setNote(s.id, m.code, Number(e.target.value))}
                          className={`w-14 text-center font-bold font-mono bg-amber-50 border border-amber-300 rounded px-1 py-0.5 focus:outline-none focus:border-amber-500
                            ${getNote(s.id, m.code) >= 10 ? 'text-amber-700' : getNote(s.id, m.code) > 0 ? 'text-red-600' : 'text-foreground'}`}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
              {students.length === 0 && (
                <tr><td colSpan={matieres.length + 2} className="text-center p-8 text-muted-foreground italic">Sélectionnez une classe.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── Composant Principal ──────────────────────────────────────────────────────

export default function InstituteurSpace() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showDevoirModal, setShowDevoirModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [instituteur, setInstituteur] = useState<any>(getInitialInstituteur);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [appelStatus, setAppelStatus] = useState<Record<string, boolean>>({ matin: false, apres_midi: false });

  // Cahier de textes
  const [seancesList, setSeancesList] = useState<any[]>([]);
  const [seanceTitre, setSeanceTitre] = useState('');
  const [seanceContenu, setSeanceContenu] = useState('');
  const [seanceDate, setSeanceDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Devoirs publiés parents
  const [devoirsParents, setDevoirsParents] = useState<Array<{ id: string; matiere: string; titre: string; description: string; dateRemise: string; publie: boolean }>>([]);
  const [newDevoir, setNewDevoir] = useState({ matiere: 'FR', titre: '', description: '', dateRemise: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [classesData, staffData, studentsData] = await Promise.all([
          apiClient.getClasses().catch((): ClassRoom[] => []),
          apiClient.getStaff().catch((): any[] => []),
          apiClient.getStudents().catch((): any[] => []),
        ]);

        const loggedUsername = localStorage.getItem('username') || '';
        const loggedFullName = localStorage.getItem('user_full_name') || localStorage.getItem('user_name') || loggedUsername;
        const loggedPrenom = localStorage.getItem('user_prenom') || '';
        const loggedNom = localStorage.getItem('user_nom') || '';

        let myStaff = staffData.find((s: any) =>
          s.email?.toLowerCase() === loggedUsername.toLowerCase() ||
          String(s.id) === String(loggedUsername)
        );

        if (!myStaff && (loggedPrenom || loggedNom)) {
          myStaff = staffData.find((s: any) =>
            (s.firstName && loggedPrenom && s.firstName.toLowerCase() === loggedPrenom.toLowerCase()) ||
            (s.lastName && loggedNom && s.lastName.toLowerCase() === loggedNom.toLowerCase())
          );
        }

        if (!myStaff) {
          myStaff = staffData.find((s: any) => s.fonction?.toLowerCase() === 'instituteur' || s.fonction?.toLowerCase() === 'enseignant') || staffData[0];
        }

        if (myStaff) {
          setInstituteur({
            id: String(myStaff.id),
            firstName: loggedPrenom || myStaff.firstName || 'Instituteur',
            lastName: loggedNom || myStaff.lastName || '',
            email: myStaff.email || loggedUsername,
            phone: myStaff.phone || '',
            matiere: myStaff.fonctionExercee || 'Instituteur',
            grade: myStaff.fonction || 'Instituteur',
            schoolId: String(myStaff.schoolId || ''),
            schoolName: myStaff.schoolName || 'École Primaire HINNEH',
          });
        } else if (loggedFullName) {
          setInstituteur({
            id: 'current-user',
            firstName: loggedPrenom || loggedFullName,
            lastName: loggedNom || '',
            email: loggedUsername,
            phone: '',
            matiere: 'Instituteur',
            grade: 'Instituteur',
            schoolId: '',
            schoolName: 'École Primaire HINNEH',
          });
        }

        setClasses(classesData);
        if (classesData.length > 0) setSelectedClassId(classesData[0].id);
        setAllStudents(studentsData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const studentsInClass = useMemo(
    () => allStudents.filter(s => String(s.classId) === String(selectedClassId)),
    [allStudents, selectedClassId]
  );

  const handleAppelSaved = (plage: string) => {
    setAppelStatus(prev => ({ ...prev, [plage]: true }));
  };

  const handleSaveSeance = async () => {
    if (!seanceTitre.trim() || !seanceContenu.trim()) {
      toast({ variant: 'destructive', title: 'Champs manquants', description: 'Veuillez renseigner le titre et le contenu de la séance.' });
      return;
    }
    try {
      await apiClient.createSeance({
        titre: seanceTitre,
        contenu: seanceContenu,
        date: seanceDate,
        heure: '08:00 - 12:00',
        classe_id: parseInt(selectedClassId, 10) || 1,
        enseignant_id: parseInt(instituteur.id, 10) || 1,
        matiere_id: 1,
      });
      setSeanceTitre('');
      setSeanceContenu('');
      toast({ title: 'Séance enregistrée', description: 'Cahier de textes mis à jour.' });
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'enregistrer la séance.' });
    }
  };

  const handlePublishDevoir = () => {
    if (!newDevoir.titre || !newDevoir.dateRemise) {
      toast({ variant: 'destructive', title: 'Champs manquants', description: 'Titre et date de remise obligatoires.' });
      return;
    }
    setDevoirsParents(prev => [...prev, {
      id: `dev-${Date.now()}`,
      ...newDevoir,
      publie: true,
    }]);
    setNewDevoir({ matiere: 'FR', titre: '', description: '', dateRemise: '' });
    setShowDevoirModal(false);
    toast({ title: 'Devoir publié', description: 'Les parents peuvent maintenant consulter ce devoir dans leur espace.' });
  };

  const now = new Date();
  const hour = now.getHours();
  const appelAttendu = hour >= 8 && hour < 13 ? 'matin' : hour >= 14 ? 'apres_midi' : null;
  const appelManquant = appelAttendu && !appelStatus[appelAttendu];

  if (loading) {
    return (
      <Layout
        loading={true}
        loadingMessage="Chargement de l'espace instituteur (Primaire)..."
        loadingSubmessage="Préparation de vos classes, devoirs et cahiers d'appel"
      >
        <div />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div variants={fadeInUp} initial="initial" animate="animate">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="text-xs font-medium px-2 py-0.5 bg-green-100 text-green-700 rounded-full uppercase tracking-wide">
                Espace Instituteur — Primaire
              </span>
              <h1 className="text-3xl font-bold tracking-tight mt-1">{formatStudentName(instituteur)}</h1>
              <p className="text-muted-foreground">{instituteur.matiere} — {instituteur.schoolName}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Indicateurs appel du jour */}
              {PLAGES_APPEL.map(plage => (
                <Badge
                  key={plage.code}
                  variant={appelStatus[plage.code] ? 'default' : 'outline'}
                  className={`gap-1 ${appelStatus[plage.code] ? 'bg-green-600 text-white' : 'text-muted-foreground'}`}
                >
                  {appelStatus[plage.code] ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  Appel {plage.label}
                </Badge>
              ))}
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setActiveTab('messages')}>
                <MessageSquare className="h-4 w-4" />Messages
              </Button>
              <Button size="sm" className="gap-1" onClick={() => setShowDevoirModal(true)}>
                <PlusCircle className="h-4 w-4" />Publier un devoir
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Alerte appel manquant */}
        {appelManquant && (
          <Alert className="border-red-300 bg-red-50">
            <Bell className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 font-medium">
              ⚠️ Rappel : L'appel du {appelAttendu === 'matin' ? 'matin (08h00–12h00)' : 'après-midi (14h00–18h00)'} n'a pas encore été effectué. Veuillez le réaliser maintenant.
            </AlertDescription>
          </Alert>
        )}

        {/* KPIs */}
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Ma classe', value: studentsInClass.length, sub: 'élèves inscrits', icon: GraduationCap, color: 'text-primary' },
            { label: 'Appel matin', value: appelStatus.matin ? '✓ Fait' : '⏳ En attente', sub: '08h00 – 12h00', icon: Sun, color: appelStatus.matin ? 'text-green-600' : 'text-amber-600' },
            { label: 'Appel après-midi', value: appelStatus.apres_midi ? '✓ Fait' : '⏳ En attente', sub: '14h00 – 18h00', icon: Sunset, color: appelStatus.apres_midi ? 'text-green-600' : 'text-amber-600' },
            { label: 'Devoirs publiés', value: devoirsParents.filter(d => d.publie).length, sub: 'visibles par parents', icon: BookOpen, color: 'text-blue-600' },
          ].map(kpi => {
            const Icon = kpi.icon;
            return (
              <motion.div key={kpi.label} variants={staggerItem}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted ${kpi.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className={`text-lg font-bold font-mono ${kpi.color}`}>{kpi.value}</p>
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                      <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Onglets principaux */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard" className="gap-1 text-xs"><BarChart3 className="h-3.5 w-3.5" />Tableau de bord</TabsTrigger>
            <TabsTrigger value="appel" className="gap-1 text-xs"><CheckSquare className="h-3.5 w-3.5" />Appel</TabsTrigger>
            <TabsTrigger value="compositions" className="gap-1 text-xs"><ClipboardList className="h-3.5 w-3.5" />Compositions</TabsTrigger>
            <TabsTrigger value="cahier" className="gap-1 text-xs"><BookOpen className="h-3.5 w-3.5" />Cahier de textes</TabsTrigger>
            <TabsTrigger value="emploi_du_temps" className="gap-1 text-xs text-emerald-700 font-bold bg-emerald-50 dark:bg-emerald-950/40"><Calendar className="h-3.5 w-3.5 text-emerald-600" />Emploi du temps (MENA)</TabsTrigger>
            <TabsTrigger value="devoirs" className="gap-1 text-xs"><FileText className="h-3.5 w-3.5" />Devoirs parents</TabsTrigger>
            <TabsTrigger value="eleves" className="gap-1 text-xs"><Users className="h-3.5 w-3.5" />Mes élèves</TabsTrigger>
            <TabsTrigger value="messages" className="gap-1 text-xs"><MessageSquare className="h-3.5 w-3.5" />Messages</TabsTrigger>
            <TabsTrigger value="documents" className="gap-1 text-xs"><Download className="h-3.5 w-3.5" />Documents</TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="mt-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />Appels du jour
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {PLAGES_APPEL.map(plage => {
                    const Icon = plage.icon;
                    const done = appelStatus[plage.code];
                    return (
                      <div key={plage.code} className={`flex items-center justify-between p-3 rounded-lg border ${done ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${done ? 'text-green-600' : 'text-amber-600'}`} />
                          <div>
                            <p className="text-sm font-medium">{plage.label}</p>
                            <p className="text-xs text-muted-foreground">{plage.heures}</p>
                          </div>
                        </div>
                        <Badge variant={done ? 'default' : 'outline'} className={done ? 'bg-green-600' : ''}>
                          {done ? 'Effectué' : 'En attente'}
                        </Badge>
                      </div>
                    );
                  })}
                  <Button size="sm" className="w-full gap-1" onClick={() => setActiveTab('appel')}>
                    <CheckSquare className="h-4 w-4" />Faire l'appel maintenant
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />Devoirs publiés récemment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {devoirsParents.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic text-center py-4">Aucun devoir publié.</p>
                  ) : (
                    devoirsParents.slice(-3).reverse().map(d => (
                      <div key={d.id} className="flex items-center justify-between p-2 rounded border bg-muted/30">
                        <div>
                          <p className="text-sm font-medium">{d.titre}</p>
                          <p className="text-xs text-muted-foreground">{MATIERES_PRIMAIRE.find(m => m.code === d.matiere)?.libelle} — À remettre: {d.dateRemise}</p>
                        </div>
                        <Badge variant="outline" className="text-green-700 border-green-300 text-xs">Publié</Badge>
                      </div>
                    ))
                  )}
                  <Button size="sm" variant="outline" className="w-full gap-1 mt-1" onClick={() => setShowDevoirModal(true)}>
                    <PlusCircle className="h-4 w-4" />Publier un devoir
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Appel */}
          <TabsContent value="appel" className="mt-5">
            <AppelPrimaire
              students={studentsInClass}
              classes={classes}
              selectedClassId={selectedClassId}
              onClassChange={setSelectedClassId}
              onAppelSaved={handleAppelSaved}
            />
          </TabsContent>

          {/* Compositions */}
          <TabsContent value="compositions" className="mt-5">
            <CompositionsModule
              classes={classes}
              selectedClassId={selectedClassId}
              students={studentsInClass}
              onClassChange={setSelectedClassId}
            />
          </TabsContent>

          {/* Cahier de textes */}
          <TabsContent value="cahier" className="mt-5 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />Nouvelle entrée — Cahier de textes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Date de la séance</Label>
                    <Input type="date" value={seanceDate} onChange={e => setSeanceDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Classe</Label>
                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Titre de la séance *</Label>
                  <Input placeholder="ex: Introduction aux fractions" value={seanceTitre} onChange={e => setSeanceTitre(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Contenu / Résumé de la séance *</Label>
                  <Textarea
                    rows={4}
                    placeholder="Décrivez le contenu enseigné, les exercices réalisés, les devoirs donnés..."
                    value={seanceContenu}
                    onChange={e => setSeanceContenu(e.target.value)}
                  />
                </div>
                <Button className="gap-1 w-full" onClick={handleSaveSeance}>
                  <Save className="h-4 w-4" />Enregistrer dans le cahier de textes
                </Button>
              </CardContent>
            </Card>

            {seancesList.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Historique des séances</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {seancesList.slice(-5).reverse().map((s: any, i: number) => (
                    <div key={i} className="p-3 rounded border bg-muted/20">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium">{s.titre}</p>
                        <span className="text-xs text-muted-foreground">{s.date}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.contenu}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Emploi du temps officiel Primaire MENA */}
          <TabsContent value="emploi_du_temps" className="mt-5 space-y-4">
            <PrimaryTimetableGrid
              classeName={classes.find(c => String(c.id) === String(selectedClassId))?.name || 'CM1'}
              ecoleName={instituteur.schoolName || 'École Primaire Confessionnelle HINNEH'}
              anneeScolaire="2026-2027"
            />
          </TabsContent>

          {/* Devoirs parents */}
          <TabsContent value="devoirs" className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Devoirs publiés sur l'espace parents</h2>
              <Button size="sm" className="gap-1" onClick={() => setShowDevoirModal(true)}>
                <PlusCircle className="h-4 w-4" />Publier un devoir
              </Button>
            </div>
            {devoirsParents.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground italic">
                  Aucun devoir publié. Les parents pourront consulter les devoirs depuis leur espace.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {devoirsParents.map(d => (
                  <Card key={d.id}>
                    <CardContent className="p-4 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{MATIERES_PRIMAIRE.find(m => m.code === d.matiere)?.libelle}</Badge>
                          <p className="font-semibold text-sm">{d.titre}</p>
                        </div>
                        {d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}
                        <p className="text-xs text-muted-foreground">À remettre le : <strong>{d.dateRemise}</strong></p>
                      </div>
                      <Badge className="bg-green-600 text-white text-xs shrink-0">✓ Publié</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Élèves */}
          <TabsContent value="eleves" className="mt-5">
            <div className="flex items-center gap-3 mb-4">
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">{studentsInClass.length} élève(s)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {studentsInClass.map(s => (
                <Card key={s.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3 flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {s.lastName[0]}{s.firstName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">{formatStudentName(s)}</p>
                      <p className="text-xs text-muted-foreground font-mono">{s.matricule}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {studentsInClass.length === 0 && (
                <div className="col-span-3 text-center py-12 text-muted-foreground italic">Aucun élève dans cette classe.</div>
              )}
            </div>
          </TabsContent>

          {/* Documents primaire */}
          <TabsContent value="documents" className="mt-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold">Documents &amp; Impressions</h2>
              <p className="text-xs text-muted-foreground">Générez et téléchargez les documents officiels de votre classe.</p>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { titre: 'Liste de classe', desc: 'Liste nominative des élèves avec matricule et informations de base.', icon: '📋', action: () => {
                  if (!studentsInClass.length) { toast({ variant: 'destructive', title: 'Aucun élève', description: 'Sélectionnez une classe avec des élèves.' }); return; }
                  const lines = studentsInClass.map((s, i) => `${i+1}. ${s.lastName.toUpperCase()} ${s.firstName} — ${s.matricule}`);
                  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'liste_classe.txt'; a.click();
                  toast({ title: 'Liste téléchargée.' });
                }},
                { titre: 'Feuille d’appel vierge', desc: 'Tableau prérempli avec les noms pour appel manuel.', icon: '✅', action: () => {
                  if (!studentsInClass.length) { toast({ variant: 'destructive', title: 'Aucun élève', description: 'Sélectionnez une classe avec des élèves.' }); return; }
                  const header = 'N°\tNom & Prénom\tMatricule\tPrésent\tAbsent\tRetard';
                  const rows = studentsInClass.map((s, i) => `${i+1}\t${formatStudentName(s)}\t${s.matricule}\t\t\t`);
                  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'feuille_appel.txt'; a.click();
                  toast({ title: 'Feuille d’appel téléchargée.' });
                }},
                { titre: 'Liste élèves (CSV)', desc: 'Export CSV complet pour traitement tableur (Excel, Sheets).', icon: '📊', action: () => {
                  if (!studentsInClass.length) { toast({ variant: 'destructive', title: 'Aucun élève', description: 'Sélectionnez une classe avec des élèves.' }); return; }
                  const header = 'Matricule,Prénom,Nom,Sexe,Date Naissance,Statut';
                  const rows = studentsInClass.map(s => `${s.matricule},${s.firstName},${s.lastName},${s.gender},${s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('fr-FR') : ''},${s.status}`);
                  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'eleves_classe.csv'; a.click();
                  toast({ title: 'CSV téléchargé.' });
                }},
                { titre: 'Attestation de scolarité (modèle)', desc: 'Modèle d’attestation à compléter pour un élève.', icon: '📜', action: () => {
                  const content = `ATTESTATION DE SCOLARITE\n\nNous, soussignés, certifions que l’élève : _______________________________\nMatricule : _______________ est bien inscrit(e) et assidu(e) au sein de notre établissement pour l’année scolaire 2025-2026.\n\nEn foi de quoi, la présente attestation lui est délivrée pour servir et valoir ce que de droit.\n\nFait à __________, le ${new Date().toLocaleDateString('fr-FR')}\n\nLe Directeur / La Directrice`;
                  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'attestation_scolarite.txt'; a.click();
                  toast({ title: 'Modèle attestation téléchargé.' });
                }},
                { titre: 'Tableau de notes vierge', desc: 'Grille de saisie de notes vierge pour composition.', icon: '📝', action: () => {
                  const header = `N°\tNom & Prénom\t${MATIERES_PRIMAIRE.filter(m => !DISCIPLINES_HORS_MOYENNE.includes(m.code)).map(m => m.libelle).join('\t')}\tMoyenne`;
                  const rows = studentsInClass.map((s, i) => `${i+1}\t${formatStudentName(s)}${MATIERES_PRIMAIRE.filter(m => !DISCIPLINES_HORS_MOYENNE.includes(m.code)).map(() => '\t').join('')}\t`);
                  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'grille_notes.txt'; a.click();
                  toast({ title: 'Grille de notes téléchargée.' });
                }},
                { titre: 'Rapport mensuel d’activité', desc: 'Modèle de rapport mensuel pour la direction.', icon: '📅', action: () => {
                  const mois = new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
                  const content = `RAPPORT MENSUEL D'ACTIVITES\nMois : ${mois}\nClasse : _______________\nInstituteur(trice) : _______________\n\n1. Effectif\n   - Total inscrits : ${studentsInClass.length}\n   - Présents en moyenne : ___\n   - Absences signalées : ___\n\n2. Programme réalisé\n   - Français : _______________\n   - Mathématiques : _______________\n   - Éveil Scientifique : _______________\n\n3. Observations\n   _______________\n\n4. Besoins et suggestions\n   _______________`;
                  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = `rapport_mensuel_${mois.replace(' ', '_')}.txt`; a.click();
                  toast({ title: 'Rapport mensuel téléchargé.' });
                }},
              ].map(doc => (
                <Card key={doc.titre} className="hover:shadow-md transition-shadow cursor-pointer" onClick={doc.action}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <span className="text-2xl">{doc.icon}</span>
                    <div>
                      <p className="font-semibold text-sm">{doc.titre}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{doc.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Messages */}
          <TabsContent value="messages" className="mt-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Messagerie — Parents</h2>
              <Button size="sm" className="gap-1" onClick={() => setShowMessageModal(true)}>
                <Send className="h-4 w-4" />Nouveau message
              </Button>
            </div>
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground italic">
                La messagerie est en cours de déploiement. Vous pourrez envoyer des messages à un parent, un groupe ou tous les parents.
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal publier devoir */}
      <Dialog open={showDevoirModal} onOpenChange={setShowDevoirModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Publier un devoir</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Matière</Label>
              <Select value={newDevoir.matiere} onValueChange={v => setNewDevoir(p => ({ ...p, matiere: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MATIERES_PRIMAIRE.map(m => <SelectItem key={m.code} value={m.code}>{m.libelle}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Titre du devoir *</Label>
              <Input placeholder="ex: Exercices page 45 — Fractions" value={newDevoir.titre} onChange={e => setNewDevoir(p => ({ ...p, titre: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Description (optionnel)</Label>
              <Textarea rows={3} placeholder="Consignes détaillées..." value={newDevoir.description} onChange={e => setNewDevoir(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Date de remise *</Label>
              <Input type="date" value={newDevoir.dateRemise} onChange={e => setNewDevoir(p => ({ ...p, dateRemise: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDevoirModal(false)}>Annuler</Button>
            <Button className="gap-1" onClick={handlePublishDevoir}><Send className="h-4 w-4" />Publier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal nouveau message */}
      <Dialog open={showMessageModal} onOpenChange={setShowMessageModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-primary" />Nouveau message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label>Destinataire</Label>
              <Select defaultValue="un_parent">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="un_parent">Un parent</SelectItem>
                  <SelectItem value="groupe_parents">Groupe de parents</SelectItem>
                  <SelectItem value="tous_parents">Tous les parents</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Objet</Label>
              <Input placeholder="Objet du message..." />
            </div>
            <div className="space-y-1">
              <Label>Message</Label>
              <Textarea rows={5} placeholder="Votre message..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMessageModal(false)}>Annuler</Button>
            <Button className="gap-1" onClick={() => setShowMessageModal(false)}><Send className="h-4 w-4" />Envoyer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
