/**
 * Espace Professeur (Secondaire) — Gestion pédagogique complète
 * Classes, notes, présences, emploi du temps, cahier de textes, messagerie
 */
import { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Users, Calendar, ClipboardList, CheckSquare,
  Moon, MessageSquare, BarChart3, PlusCircle, Save,
  Edit, Trash2, Download, Upload, Search, ChevronRight,
  TrendingUp, TrendingDown, Award, Bell, FileText,
  GraduationCap, Clock, AlertCircle, Check, Send,
  Star, Eye, Filter, Plus, Settings, Printer, Lock, Table,
  CheckCircle2, AlertTriangle, History, CalendarCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Layout } from '@/components/Layout';
import { FicheNotesView } from '@/components/FicheNotesView';
import { MatriceNotesView } from '@/components/MatriceNotesView';
import { HistoriqueAppelsView } from '@/components/HistoriqueAppelsView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Student, School, Evaluation, Attendance, ClassRoom } from '@/lib/index';
import { formatStudentName } from '@/lib/index';
import apiClient from '@/lib/apiClient';
import { formatCurrency, formatDate } from '@/lib/index';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import { printSchedule } from '@/lib/printSchedule';
import { printDocument } from '@/lib/printDocument';
import { periodesApi, PeriodeScolaire } from '@/lib/periodesApi';

// ─── Données locales de secours ──────────────────────────────────────────────────────────

const getInitialTeacher = () => {
  const userFullName = typeof window !== 'undefined' ? localStorage.getItem('user_full_name') || localStorage.getItem('user_name') : '';
  const userPrenom = typeof window !== 'undefined' ? localStorage.getItem('user_prenom') : '';
  const userNom = typeof window !== 'undefined' ? localStorage.getItem('user_nom') : '';
  const username = typeof window !== 'undefined' ? localStorage.getItem('username') : '';
  const userEcoleName = typeof window !== 'undefined' ? (localStorage.getItem('user_ecole_name') || localStorage.getItem('user_school_name') || localStorage.getItem('school_name')) : '';
  const userEcoleCode = typeof window !== 'undefined' ? localStorage.getItem('user_ecole_code') : '';

  return {
    id: 'current-user',
    firstName: userPrenom || userFullName || username || 'Enseignant',
    lastName: userNom || '',
    email: username || '',
    phone: '',
    matiere: 'Enseignant',
    grade: 'Professeur',
    schoolId: typeof window !== 'undefined' ? localStorage.getItem('user_ecole_id') || '' : '',
    schoolName: userEcoleName || (userEcoleCode ? `Établissement ${userEcoleCode}` : 'Établissement Scolaire'),
    gender: null,
  };
};

const SCHEDULE = [
  { day: 'Lundi', slots: [
    { time: '08:00–10:00', classe: '3e A', matiere: 'Maths', salle: 'Salle 12', type: 'cours' },
    { time: '10:30–12:30', classe: '4e B', matiere: 'Maths', salle: 'Salle 08', type: 'cours' },
    { time: '13:30–15:30', classe: '5e A', matiere: 'Sciences', salle: 'Labo', type: 'cours' },
  ]},
  { day: 'Mardi', slots: [
    { time: '08:00–10:00', classe: '5e A', matiere: 'Maths', salle: 'Salle 15', type: 'cours' },
    { time: '10:30–12:30', classe: '3e A', matiere: 'Sciences', salle: 'Labo', type: 'cours' },
    { time: '14:00–15:00', classe: '', matiere: 'Réunion pédagogique', salle: 'Salle des profs', type: 'reunion' },
  ]},
  { day: 'Mercredi', slots: [
    { time: '08:00–10:00', classe: '4e B', matiere: 'Sciences', salle: 'Labo', type: 'cours' },
    { time: '10:30–12:30', classe: '3e A', matiere: 'Maths (composition)', salle: 'Salle 12', type: 'exam' },
  ]},
  { day: 'Jeudi', slots: [
    { time: '08:00–10:00', classe: '5e A', matiere: 'Maths', salle: 'Salle 15', type: 'cours' },
    { time: '10:30–12:30', classe: '4e B', matiere: 'Maths', salle: 'Salle 08', type: 'cours' },
    { time: '13:30–15:30', classe: '3e A', matiere: 'Sciences', salle: 'Labo', type: 'cours' },
  ]},
  { day: 'Vendredi', slots: [
    { time: '08:00–09:30', classe: '5e A', matiere: 'Sciences', salle: 'Labo', type: 'cours' },
    { time: '11:30–12:30', classe: '', matiere: 'Prière Jumu\'ah', salle: 'Mosquée', type: 'islamique' },
    { time: '13:30–15:30', classe: '4e B', matiere: 'Sciences', salle: 'Labo', type: 'cours' },
  ]},
];

const MESSAGES = [
  { id: 'm1', from: 'Direction', subject: 'Réunion pédagogique — 15 Mai', date: new Date(2026, 4, 6), read: false, content: 'Réunion pédagogique obligatoire le 15 mai à 14h en salle des professeurs. Ordre du jour : préparation des compositions du 3e trimestre et résultats mi-parcours.' },
  { id: 'm2', from: 'Parent — Mme Konaté', subject: 'Inquiétude pour Ibrahim', date: new Date(2026, 4, 4), read: true, content: 'Bonjour M. Koné, je suis la maman d\'Ibrahim Konaté (3e A). J\'ai remarqué une baisse de ses notes. Pourriez-vous me recevoir pour en discuter ? Merci.' },
  { id: 'm3', from: 'Secrétariat', subject: 'Relevés de notes à remettre', date: new Date(2026, 4, 2), read: false, content: 'Merci de remettre les relevés de notes du 3e trimestre pour toutes vos classes avant le 25 mai au secrétariat.' },
  { id: 'm4', from: 'Collègue Mme Touré', subject: 'Échange de créneaux', date: new Date(2026, 3, 30), read: true, content: 'Bonjour collègue, est-il possible d\'échanger nos créneaux du mercredi matin ? Je dois assister à une formation le 20 mai.' },
];

const DEVOIRS_MOCK: any[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const presenceColors: Record<string, string> = {
  present: 'bg-success/20 text-green-700',
  absent: 'bg-destructive/10 text-destructive',
  retard: 'bg-warning/20 text-yellow-700',
  excuse: 'bg-blue-100 text-blue-700',
};

const slotTypeStyle: Record<string, string> = {
  cours: 'bg-primary/5 border-primary/20',
  exam: 'bg-destructive/5 border-destructive/20',
  reunion: 'bg-purple-50 border-purple-200',
  islamique: 'bg-green-50 border-green-200',
};

const devoirStatutStyle: Record<string, string> = {
  planifie: 'bg-muted text-muted-foreground',
  en_cours: 'bg-warning/20 text-yellow-700',
  rendu: 'bg-blue-100 text-blue-700',
  corrige: 'bg-success/20 text-green-700',
};

// ─── Note Input Cell ──────────────────────────────────────────────────────────

function NoteCell({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const color = value >= 16 ? 'text-green-600' : value >= 12 ? 'text-primary' : value >= 10 ? 'text-yellow-600' : 'text-destructive';
  return (
    <input
      type="number"
      min="0"
      max="20"
      step="0.25"
      value={value === 0 ? '' : value}
      onChange={e => onChange(Number(e.target.value))}
      disabled={disabled}
      className={`w-16 text-center text-sm font-bold font-mono ${color} bg-transparent border border-border rounded px-1 py-0.5 focus:outline-none focus:border-primary disabled:opacity-50`}
    />
  );
}

// ─── Saisie présences ─────────────────────────────────────────────────────────

interface PresenceSaisieProps {
  students: Student[];
  selectedClassId: string;
  classes: any[];
  attendance: Attendance[];
  onClassChange: (id: string) => void;
  onSave: (date: string, presences: Record<string, 'present' | 'absent' | 'retard' | 'excuse'>, heure?: string) => Promise<void>;
  subjects: any[];
  selectedSubjectCode: string;
  onSubjectChange: (code: string) => void;
  onAppelDone?: () => void;
  appelFait?: boolean;
  teacher?: any;
}

function PresenceSaisie({
  students,
  selectedClassId,
  classes,
  attendance,
  onClassChange,
  onSave,
  subjects,
  selectedSubjectCode,
  onSubjectChange,
  onAppelDone,
  appelFait,
  teacher,
}: PresenceSaisieProps) {
  const [subTab, setSubTab] = useState<'saisie' | 'historique'>('saisie');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedHeure, setSelectedHeure] = useState<string>('08:00 - 10:00');
  const [presences, setPresences] = useState<Record<string, 'present' | 'absent' | 'retard' | 'excuse'>>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const HORAIRES_APPEL = [
    { value: '07:30 - 08:00', label: '07:30 - 08:00 (Entrée / Rassemblement)' },
    { value: '08:00 - 10:00', label: '08:00 - 10:00 (1ère Séance Matin)' },
    { value: '10:30 - 12:30', label: '10:30 - 12:30 (2ème Séance Matin)' },
    { value: '12:30 - 13:30', label: '12:30 - 13:30 (Pause / Cantine)' },
    { value: '14:00 - 16:00', label: '14:00 - 16:00 (1ère Séance Après-midi)' },
    { value: '16:00 - 18:00', label: '16:00 - 18:00 (2ème Séance Après-midi)' },
    { value: '18:00 - 18:30', label: '18:00 - 18:30 (Sortie / Étude)' },
  ];

  useEffect(() => {
    const initial: Record<string, 'present' | 'absent' | 'retard' | 'excuse'> = {};
    students.forEach(s => {
      initial[s.id] = 'present';
    });

    // Populate with existing attendance
    attendance.forEach(att => {
      const attDateStr = new Date(att.date).toISOString().split('T')[0];
      if (
        attDateStr === selectedDate && 
        String(att.classId) === String(selectedClassId) &&
        (!att.heure || att.heure === selectedHeure)
      ) {
        initial[String(att.studentId)] = att.status as 'present' | 'absent' | 'retard' | 'excuse';
      }
    });

    setPresences(initial);
  }, [students, attendance, selectedDate, selectedClassId, selectedHeure]);

  const filtered = useMemo(() =>
    students.filter(s => `${formatStudentName(s)} ${s.matricule}`.toLowerCase().includes(search.toLowerCase())),
  [students, search]);

  const stats = useMemo(() => {
    const vals = Object.values(presences);
    return {
      presents: vals.filter(v => v === 'present').length,
      absents: vals.filter(v => v === 'absent').length,
      retards: vals.filter(v => v === 'retard').length,
      excuses: vals.filter(v => v === 'excuse').length,
    };
  }, [presences]);

  const setAll = (status: 'present' | 'absent' | 'retard' | 'excuse') => {
    const updated: Record<string, 'present' | 'absent' | 'retard' | 'excuse'> = {};
    students.forEach(s => { updated[s.id] = status; });
    setPresences(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selectedDate, presences, selectedHeure);
      setSaved(true);
      onAppelDone?.();
      toast.success("Présences enregistrées avec succès !", {
        description: `Appel du ${selectedDate} (${selectedHeure}) sauvegardé.`
      });
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      console.error("Failed to save attendance:", e);
      toast.error("Échec de l'enregistrement de l'appel", {
        description: e?.message || "Veuillez vérifier votre connexion."
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── SubTab Toggle : Faire l'appel VS Historique des appels ── */}
      <div className="flex items-center justify-between bg-card p-2 rounded-xl border border-border shadow-xs">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={subTab === 'saisie' ? 'default' : 'ghost'}
            onClick={() => setSubTab('saisie')}
            className="text-xs font-semibold gap-1.5"
          >
            <CheckSquare className="h-4 w-4" /> Faire l'appel (Saisie)
          </Button>
          <Button
            size="sm"
            variant={subTab === 'historique' ? 'default' : 'ghost'}
            onClick={() => setSubTab('historique')}
            className="text-xs font-semibold gap-1.5"
          >
            <Calendar className="h-4 w-4 text-primary" /> Registre & Historique des appels
          </Button>
        </div>

        {subTab === 'saisie' && (
          <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20 hidden sm:flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> Séance : {selectedHeure}
          </Badge>
        )}
      </div>

      {subTab === 'historique' ? (
        <HistoriqueAppelsView
          classes={classes}
          students={students}
          attendance={attendance}
          teacher={teacher}
          selectedClassId={selectedClassId}
          onClassChange={onClassChange}
          onEditSession={(d, h) => {
            setSelectedDate(d);
            setSelectedHeure(h);
            setSubTab('saisie');
          }}
        />
      ) : (
        <div className="space-y-4">
      {/* Alerte rappel appel */}
      {!appelFait && (
        <Alert className="border-amber-300 bg-amber-50">
          <Bell className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm font-medium">
            ⚠️ Rappel : Effectuez l'appel au début de cette séance. Votre présence sera enregistrée automatiquement dès la validation.
          </AlertDescription>
        </Alert>
      )}
      {appelFait && (
        <Alert className="border-green-300 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 text-sm font-medium">
            ✓ Appel effectué — Votre présence a été enregistrée automatiquement.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedClassId} onValueChange={onClassChange}>
          <SelectTrigger className="w-36 font-semibold"><SelectValue placeholder="Classe" /></SelectTrigger>
          <SelectContent>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedSubjectCode} onValueChange={onSubjectChange}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Matière" /></SelectTrigger>
          <SelectContent>
            {subjects.map(sub => <SelectItem key={sub.code} value={sub.code}>{sub.libelle}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5 bg-card border border-border rounded-md px-2 py-1">
          <Clock className="h-4 w-4 text-primary shrink-0" />
          <Select value={selectedHeure} onValueChange={setSelectedHeure}>
            <SelectTrigger className="border-0 shadow-none p-0 h-auto font-medium text-xs focus:ring-0 w-48">
              <SelectValue placeholder="Horaire d'appel" />
            </SelectTrigger>
            <SelectContent>
              {HORAIRES_APPEL.map(h => (
                <SelectItem key={h.value} value={h.value}>
                  ⏰ {h.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-40" />
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher élève..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="text-green-600 border-green-300 text-xs" onClick={() => setAll('present')}>Tous présents</Button>
          <Button size="sm" variant="outline" className="text-destructive border-destructive/30 text-xs" onClick={() => setAll('absent')}>Tous absents</Button>
        </div>
        <Button size="sm" className="gap-1 ml-auto" onClick={handleSave} disabled={saving}>
          {saving ? <Clock className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? 'Enregistrement...' : saved ? 'Enregistré !' : 'Enregistrer'}
        </Button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Présents', value: stats.presents, color: 'bg-success/20 text-green-700' },
          { label: 'Absents', value: stats.absents, color: 'bg-destructive/10 text-destructive' },
          { label: 'Retards', value: stats.retards, color: 'bg-warning/20 text-yellow-700' },
          { label: 'Excusés', value: stats.excuses, color: 'bg-blue-100 text-blue-700' },
        ].map(s => (
          <div key={s.label} className={`text-center p-2 rounded-lg ${s.color}`}>
            <p className="text-xl font-bold font-mono">{s.value}</p>
            <p className="text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      <Card>
        <div className="p-3 border-b border-border bg-muted/30 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" /> Horaires d'appel :
              </span>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-mono text-xs font-bold">
                Sélectionné : {selectedHeure}
              </Badge>
              <Badge variant="outline" className="bg-muted text-foreground text-xs font-medium">
                📅 {selectedDate}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground font-medium">{filtered.length} élève{filtered.length > 1 ? 's' : ''}</span>
          </div>

          {/* Liste d'horaires sélectionnables */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {HORAIRES_APPEL.map(h => {
              const isSelected = selectedHeure === h.value;
              return (
                <button
                  key={h.value}
                  type="button"
                  onClick={() => setSelectedHeure(h.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer border ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold ring-2 ring-primary/20'
                      : 'bg-background hover:bg-muted text-foreground border-border hover:border-primary/40'
                  }`}
                  title={h.label}
                >
                  <span>⏰</span>
                  <span>{h.value}</span>
                </button>
              );
            })}
          </div>
        </div>
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
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">{s.lastName[0]}{s.firstName[0]}</AvatarFallback>
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
      )}
    </div>
  );
}

// ─── Saisie Notes ─────────────────────────────────────────────────────────────

interface NotesSaisieProps {
  classes: any[];
  students: Student[];
  selectedClassId: string;
  onClassChange: (id: string) => void;
  subjects: any[];
  selectedSubjectCode: string;
  onSubjectChange: (code: string) => void;
  evaluations: Evaluation[];
  teacher: any;
  currentAttribution?: any;
  onSave: (payload: {
    classe_id: number;
    matiere: string;
    trimestre: number;
    type: string;
    devoir_numero: string;
    coefficient: number;
    date: string;
    date_recuperation?: string | null;
    date_correction?: string | null;
    date_remise?: string | null;
    valide?: boolean;
    notes: Array<{
      eleve_id: number;
      note: number;
      appreciation?: string;
      eval_id?: number | string;
      justification_modification?: string;
      autorisation_modification?: boolean;
    }>;
  }) => Promise<void>;
}

function NotesSaisie({
  classes,
  students,
  selectedClassId,
  onClassChange,
  subjects,
  selectedSubjectCode,
  onSubjectChange,
  evaluations,
  teacher,
  currentAttribution,
  onSave,
}: NotesSaisieProps) {
  // ─── Types d'évaluation avec coefficients par défaut ────────────────────────
  const EVAL_TYPES = [
    { value: 'interrogation orale',       label: 'Interrogation orale',         coefDefault: 1,  bonusAllowed: true,  quotaMax: 0  },
    { value: 'interrogation écrite',      label: 'Interrogation écrite',        coefDefault: 1,  bonusAllowed: true,  quotaMax: 0  },
    { value: 'devoir de maison',          label: 'Devoir de maison',            coefDefault: 1,  bonusAllowed: false, quotaMax: 0  },
    { value: 'devoir de niveau',          label: 'Devoir de niveau',            coefDefault: 2,  bonusAllowed: false, quotaMax: 2  },
    { value: 'composition trimestrielle', label: 'Composition trimestrielle',   coefDefault: 3,  bonusAllowed: false, quotaMax: 1  },
    { value: 'examen blanc',              label: 'Examen blanc',                coefDefault: 2,  bonusAllowed: false, quotaMax: 2  },
    { value: 'autre',                     label: 'Autre',                       coefDefault: 1,  bonusAllowed: false, quotaMax: 0  },
  ] as const;

  const [selectedDevoirNumero, setSelectedDevoirNumero] = useState<string>('new');
  const [devoirNumeroInput, setDevoirNumeroInput] = useState<string>('');
  const [searchDevoirInput, setSearchDevoirInput] = useState<string>('');
  const [devoirType, setDevoirType] = useState<string>('interrogation écrite');
  const [trimestre, setTrimestre] = useState<string>('1');
  const [coefficient, setCoefficient] = useState<number>(1);
  const [bonusPoints, setBonusPoints] = useState<number>(0);
  const [dateDevoir, setDateDevoir] = useState(() => new Date().toISOString().split('T')[0]);
  const [dateRecup, setDateRecup] = useState<string>('');
  const [dateCorr, setDateCorr] = useState<string>('');
  const [dateRemise, setDateRemise] = useState<string>('');
  const [valideDevoir, setValideDevoir] = useState<boolean>(false);

  const [studentNotes, setStudentNotes] = useState<Record<string, { note: number; appreciation: string; observation?: string; evalId?: string; valide: boolean; justification_modification?: string; autorisation_modification?: boolean }>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackModalConfig, setFeedbackModalConfig] = useState<{
    type: 'create' | 'update';
    emoji: string;
    title: string;
    description: string;
    devoirCode: string;
    matiere: string;
    count: number;
    trimestre: string;
  }>({
    type: 'create',
    emoji: '🎉',
    title: '',
    description: '',
    devoirCode: '',
    matiere: '',
    count: 0,
    trimestre: '1',
  });

  const [periodeLockStatus, setPeriodeLockStatus] = useState<{ est_verrouille: boolean; message: string; periode?: PeriodeScolaire }>({
    est_verrouille: false,
    message: 'Saisie ouverte',
  });

  useEffect(() => {
    const numTrim = parseInt(trimestre, 10) || 1;
    periodesApi.checkTrimestreLock(numTrim).then((res) => {
      setPeriodeLockStatus(res);
    });
  }, [trimestre]);

  // Justification dialog
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);
  const [justificationText, setJustificationText] = useState('');
  const [targetStudentId, setTargetStudentId] = useState<string>('');
  const [tempNoteValue, setTempNoteValue] = useState<number>(0);

  const getAutoAppreciation = (note: number) => {
    if (note >= 18) return "Excellent";
    if (note >= 16) return "Très bien";
    if (note >= 14) return "Bien";
    if (note >= 12) return "Assez bien";
    if (note >= 10) return "Passable";
    if (note >= 8) return "Insuffisant";
    if (note > 0) return "Très insuffisant";
    return "";
  };

  const existingDevoirs = useMemo(() => {
    const map = new Map<string, string>();
    evaluations.forEach(ev => {
      if (ev.devoir_numero && String(ev.classId) === String(selectedClassId)) {
        const dateStr = ev.date ? new Date(ev.date).toLocaleDateString('fr-FR') : '';
        map.set(ev.devoir_numero, dateStr);
      }
    });
    return Array.from(map.entries()).map(([num, dateStr]) => ({ num, dateStr }));
  }, [evaluations, selectedClassId]);

  const existingDevoirNumeros = useMemo(() => {
    return existingDevoirs.map(d => d.num);
  }, [existingDevoirs]);

  const getNextDevoirCode = (type: string) => {
    const prefix = type.includes('interrogation') ? 'INT' : type.includes('composition') ? 'COMP' : 'DEV';
    let nextNum = 1;
    while (existingDevoirNumeros.includes(`${prefix}-${String(nextNum).padStart(2, '0')}`)) {
      nextNum++;
    }
    return `${prefix}-${String(nextNum).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (selectedDevoirNumero === 'new') {
      setDevoirNumeroInput(getNextDevoirCode(devoirType));
    }
  }, [selectedClassId, selectedDevoirNumero, existingDevoirNumeros, devoirType]);

  const handleSearchDevoir = () => {
    if (!searchDevoirInput.trim()) {
      alert("Veuillez saisir un numéro de devoir à rechercher.");
      return;
    }
    const query = searchDevoirInput.trim().toUpperCase();
    const matching = existingDevoirNumeros.find(num => num.toUpperCase().includes(query));
    if (matching) {
      handleSelectDevoir(matching);
    } else {
      alert(`Aucun devoir trouvé avec le numéro "${searchDevoirInput}".`);
    }
  };

  const handleSelectDevoir = (val: string) => {
    setSelectedDevoirNumero(val);
    if (val === 'new') {
      setDevoirNumeroInput(getNextDevoirCode('interrogation écrite'));
      setDevoirType('interrogation écrite');
      setDateDevoir(new Date().toISOString().split('T')[0]);
      setDateRecup('');
      setDateCorr('');
      setDateRemise('');
      setValideDevoir(false);
      setCoefficient(1);
      
      const reset: Record<string, { note: number; appreciation: string; evalId?: string; valide: boolean }> = {};
      students.forEach(s => {
        reset[s.id] = { note: 0, appreciation: '', valide: false };
      });
      setStudentNotes(reset);
    } else {
      const filteredEvals = evaluations.filter(
        ev => ev.devoir_numero === val && String(ev.classId) === String(selectedClassId)
      );
      
      if (filteredEvals.length > 0) {
        const first = filteredEvals[0];
        setDevoirType(first.type || 'interrogation écrite');
        setDateDevoir(new Date(first.date).toISOString().split('T')[0]);
        setDateRecup(first.date_recuperation ? new Date(first.date_recuperation).toISOString().split('T')[0] : '');
        setDateCorr(first.date_correction ? new Date(first.date_correction).toISOString().split('T')[0] : '');
        setDateRemise(first.date_remise ? new Date(first.date_remise).toISOString().split('T')[0] : '');
        setValideDevoir(first.valide || false);
        setTrimestre(String(first.trimester || '1'));
        setCoefficient(Number(first.coefficient) || 1);
        
        const loaded: Record<string, { note: number; appreciation: string; evalId?: string; valide: boolean; justification_modification?: string; autorisation_modification?: boolean }> = {};
        students.forEach(s => {
          const matching = filteredEvals.find(ev => String(ev.studentId) === String(s.id));
          if (matching) {
            loaded[s.id] = {
              note: matching.note,
              appreciation: matching.appreciation || getAutoAppreciation(matching.note),
              evalId: matching.id,
              valide: matching.valide || false,
              justification_modification: matching.justification_modification,
              autorisation_modification: false
            };
          } else {
            loaded[s.id] = { note: 0, appreciation: '', valide: false };
          }
        });
        setStudentNotes(loaded);
      }
    }
  };

  useEffect(() => {
    handleSelectDevoir('new');
  }, [selectedClassId, selectedSubjectCode]);

  const filtered = useMemo(() =>
    students.filter(s => `${formatStudentName(s)} ${s.matricule}`.toLowerCase().includes(search.toLowerCase())),
  [students, search]);

  const currentEvalType = EVAL_TYPES.find(t => t.value === devoirType);
  const bonusAllowed = currentEvalType?.bonusAllowed ?? false;

  // Statistiques auto
  const stats = useMemo(() => {
    const vals = students.map(s => studentNotes[s.id]?.note || 0).filter(v => v > 0);
    if (vals.length === 0) return { moyenne: 0, mediane: 0, geq10: 0, lt10: 0 };
    const sorted = [...vals].sort((a, b) => a - b);
    const moyenne = vals.reduce((a, b) => a + b, 0) / vals.length;
    const mid = Math.floor(sorted.length / 2);
    const mediane = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    const geq10 = vals.filter(v => v >= 10).length;
    const lt10 = vals.filter(v => v < 10).length;
    return { moyenne, mediane, geq10, lt10 };
  }, [studentNotes, students]);

  const moyenne = stats.moyenne;

  const handleDeleteDevoir = () => {
    const finalNum = selectedDevoirNumero;
    if (!finalNum || finalNum === 'new') return;
    const evalsToDelete = evaluations.filter(
      ev => ev.devoir_numero === finalNum && String(ev.classId) === String(selectedClassId)
    );
    const isLocked = evalsToDelete.some(ev => ev.valide);
    if (isLocked) {
      alert('Ce devoir est verrouillé. La suppression est interdite.');
      return;
    }
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    const finalNum = selectedDevoirNumero;
    const evalsToDelete = evaluations.filter(
      ev => ev.devoir_numero === finalNum && String(ev.classId) === String(selectedClassId)
    );
    try {
      for (const ev of evalsToDelete) {
        await fetch(`/api/evaluations/${ev.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
        });
      }
      handleSelectDevoir('new');
    } catch (e) {
      alert('Erreur lors de la suppression.');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleSave = async () => {
    if (periodeLockStatus.est_verrouille) {
      toast.error("Période de saisie clôturée", {
        description: periodeLockStatus.message,
      });
      return;
    }

    const finalDevoirNum = selectedDevoirNumero === 'new' ? devoirNumeroInput.trim() : selectedDevoirNumero;
    if (!finalDevoirNum) {
      toast.error("Code devoir requis", { description: "Veuillez saisir un numéro unique de devoir." });
      return;
    }
    if (!coefficient || coefficient < 0.5) {
      toast.error("Coefficient invalide", { description: "Le coefficient est obligatoire et doit être ≥ 0.5." });
      return;
    }

    const currentSubject = subjects.find(s => s.code === selectedSubjectCode);
    const subjectLabel = currentSubject ? currentSubject.libelle : (selectedSubjectCode || 'Matière');

    setSaving(true);
    setSaveErrorMsg(null);
    try {
      const notesPayload = students.map(s => {
        const n = studentNotes[s.id] || { note: 0, appreciation: '', valide: false };
        return {
          eleve_id: parseInt(s.id, 10),
          note: Number(n.note) || 0,
          appreciation: n.appreciation || getAutoAppreciation(Number(n.note) || 0),
          eval_id: n.evalId,
          justification_modification: n.justification_modification,
          autorisation_modification: n.autorisation_modification
        };
      });

      await onSave({
        classe_id: parseInt(selectedClassId, 10) || 1,
        matiere: subjectLabel,
        trimestre: parseInt(trimestre, 10) || 1,
        type: devoirType,
        devoir_numero: finalDevoirNum,
        coefficient: Number(coefficient) || 1,
        date: dateDevoir,
        date_recuperation: dateRecup || null,
        date_correction: dateCorr || null,
        date_remise: dateRemise || null,
        valide: valideDevoir,
        notes: notesPayload,
      });

      setSaved(true);
      const isModification = selectedDevoirNumero !== 'new';
      const actionType: 'create' | 'update' = isModification ? 'update' : 'create';
      const modalEmoji = isModification ? '✍️' : '🎉';
      const modalTitle = isModification ? 'Notes Modifiées avec Succès !' : 'Notes Enregistrées avec Succès !';
      const modalDesc = isModification
        ? `Les notes du devoir "${finalDevoirNum}" (${subjectLabel}) ont été mises à jour avec succès pour ${notesPayload.length} élève(s).`
        : `Le devoir "${finalDevoirNum}" (${subjectLabel}) a été créé et les notes de ${notesPayload.length} élève(s) sont bien enregistrées.`;

      setFeedbackModalConfig({
        type: actionType,
        emoji: modalEmoji,
        title: modalTitle,
        description: modalDesc,
        devoirCode: finalDevoirNum,
        matiere: subjectLabel,
        count: notesPayload.length,
        trimestre: String(trimestre),
      });
      setShowFeedbackModal(true);

      const successMsg = `Notes du devoir "${finalDevoirNum}" enregistrées avec succès (${notesPayload.length} élèves).`;
      setSaveSuccessMsg(successMsg);
      toast.success(modalTitle, { description: successMsg });

      setTimeout(() => setSaved(false), 4000);
      setTimeout(() => setSaveSuccessMsg(null), 6000);
      setTimeout(() => handleSelectDevoir(finalDevoirNum), 500);
    } catch (e: any) {
      console.error("Failed to save evaluations:", e);
      const errMsg = e?.message || "Échec de l'enregistrement. S'il s'agit d'une modification verrouillée, assurez-vous d'avoir saisi le motif d'autorisation.";
      setSaveErrorMsg(errMsg);
      toast.error("Erreur", { description: errMsg });
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcelTemplate = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/evaluations/export-template/${selectedClassId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'export du template');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template_notes_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'export du template Excel');
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const token = localStorage.getItem('auth_token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/evaluations/import-excel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'import Excel');
      }

      const result = await response.json();
      alert(result.message);
      
      // Recharger les données
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'import Excel');
    }
    
    // Reset input
    e.target.value = '';
  };

  const handleConfirmCorrection = () => {
    if (!targetStudentId) return;
    setStudentNotes(prev => ({
      ...prev,
      [targetStudentId]: {
        ...prev[targetStudentId],
        note: tempNoteValue,
        appreciation: getAutoAppreciation(tempNoteValue),
        autorisation_modification: true,
        justification_modification: justificationText
      }
    }));
    setShowCorrectionDialog(false);
  };

  return (
    <div className="space-y-4">
      {/* Notifications de succès ou d'erreur */}
      {saveSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl flex items-center justify-between text-xs font-semibold shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-300">
            ✓ Enregistré
          </Badge>
        </div>
      )}

      {saveErrorMsg && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 rounded-xl flex items-center justify-between text-xs font-semibold shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <span>{saveErrorMsg}</span>
          </div>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSaveErrorMsg(null)}>Fermer</Button>
        </div>
      )}

      {/* Search & Meta inputs */}
      <div className="grid md:grid-cols-5 gap-4 p-4 bg-muted/40 rounded-xl border">
        {/* Search Input for Devoir */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Rechercher un Devoir</Label>
          <div className="flex gap-1.5">
            <Input 
              placeholder="ex: I-01" 
              value={searchDevoirInput} 
              onChange={e => setSearchDevoirInput(e.target.value)} 
              className="h-9 text-xs" 
            />
            <Button size="sm" onClick={handleSearchDevoir} className="h-9 px-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25">
              <Search className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Devoir Selector */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Devoir Unique</Label>
          <Select value={selectedDevoirNumero} onValueChange={handleSelectDevoir}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choisir ou Nouveau" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">+ Créer nouveau devoir</SelectItem>
              {existingDevoirs.map(({ num, dateStr }) => (
                <SelectItem key={num} value={num}>
                  Devoir {num} {dateStr ? `(du ${dateStr})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedDevoirNumero === 'new' && (
            <Input 
              placeholder="ex: DEV-01" 
              value={devoirNumeroInput} 
              onChange={e => setDevoirNumeroInput(e.target.value)} 
              className="w-full h-9 mt-1.5" 
            />
          )}
          {selectedDevoirNumero !== 'new' && (
            <Button
              size="sm"
              variant="destructive"
              className="mt-1.5 w-full gap-1 text-xs h-8"
              onClick={handleDeleteDevoir}
            >
              <Trash2 className="h-3 w-3" />Supprimer ce devoir
            </Button>
          )}
        </div>

        {/* Type de Devoir */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Type d'évaluation <span className="text-destructive">*</span></Label>
          {(() => {
            const evalType = EVAL_TYPES.find(t => t.value === devoirType);
            const quota = evalType?.quotaMax ?? 0;
            if (quota > 0 && selectedDevoirNumero === 'new') {
              const used = existingDevoirs.filter(d =>
                evaluations.some(ev => ev.devoir_numero === d.num && String(ev.classId) === String(selectedClassId) && ev.type === devoirType)
              ).length;
              if (used >= quota) return (
                <div className="text-[10px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-0.5 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />Quota {used}/{quota} atteint
                </div>
              );
              return <div className="text-[10px] text-muted-foreground">{used}/{quota} devoir(s) de ce type</div>;
            }
            return null;
          })()}
          <Select
            value={devoirType}
            onValueChange={v => {
              setDevoirType(v);
              const t = EVAL_TYPES.find(et => et.value === v);
              if (t) setCoefficient(t.coefDefault);
              setBonusPoints(0);
            }}
            disabled={selectedDevoirNumero !== 'new'}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVAL_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Coefficient */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Coefficient <span className="text-destructive">*</span></Label>
          <Input
            type="number"
            min="0.5"
            max="10"
            step="0.5"
            value={coefficient}
            onChange={e => setCoefficient(Number(e.target.value))}
            disabled={selectedDevoirNumero !== 'new'}
            className="h-9 w-full font-bold text-center"
          />
          {bonusAllowed && (
            <div className="flex items-center gap-1.5 mt-1">
              <Label className="text-[10px] text-yellow-700 font-semibold">Bonus (pts)</Label>
              <Input
                type="number"
                min="0"
                max="5"
                step="0.25"
                value={bonusPoints}
                onChange={e => setBonusPoints(Number(e.target.value))}
                disabled={selectedDevoirNumero !== 'new'}
                className="h-7 w-16 text-xs text-center font-bold text-yellow-700 border-yellow-300"
              />
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Date du devoir</Label>
          <Input type="date" value={dateDevoir} onChange={e => setDateDevoir(e.target.value)} disabled={selectedDevoirNumero !== 'new' && valideDevoir} className="h-9 w-full bg-transparent border rounded" />
        </div>

        {/* Autres Dates */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Dates de suivi</Label>
          <div className="grid grid-cols-3 gap-1">
            <div>
              <Label className="text-[9px] text-muted-foreground">Récupération</Label>
              <Input type="date" value={dateRecup} onChange={e => setDateRecup(e.target.value)} disabled={selectedDevoirNumero !== 'new' && valideDevoir} className="h-7 text-xs px-1 bg-transparent border rounded" />
            </div>
            <div>
              <Label className="text-[9px] text-muted-foreground">Correction</Label>
              <Input type="date" value={dateCorr} onChange={e => setDateCorr(e.target.value)} disabled={selectedDevoirNumero !== 'new' && valideDevoir} className="h-7 text-xs px-1 bg-transparent border rounded" />
            </div>
            <div>
              <Label className="text-[9px] text-muted-foreground">Remise</Label>
              <Input type="date" value={dateRemise} onChange={e => setDateRemise(e.target.value)} disabled={selectedDevoirNumero !== 'new' && valideDevoir} className="h-7 text-xs px-1 bg-transparent border rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Bannière Verrou de Période ─── */}
      {periodeLockStatus.est_verrouille ? (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-950 text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Lock className="h-4 w-4 text-rose-600 shrink-0" />
            <span>
              <strong>Période de saisie clôturée :</strong> {periodeLockStatus.message}
            </span>
          </div>
          <Badge className="bg-rose-600 text-white text-[10px] shrink-0">Verrou Actif</Badge>
        </div>
      ) : periodeLockStatus.periode?.deverrouille_par_admin ? (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-purple-950 text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-purple-600 shrink-0" />
            <span>
              <strong>Dérogation administrative active :</strong> Saisie de notes autorisée par l'Administration ({periodeLockStatus.periode.motif_deverrouillage || 'Autorisé'}).
            </span>
          </div>
          <Badge className="bg-purple-700 text-white text-[10px] shrink-0">Verrou Sauté (Admin)</Badge>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/20 p-3 rounded-lg border">
        <div className="flex items-center gap-3">
          <Select value={selectedClassId} onValueChange={onClassChange}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedSubjectCode} onValueChange={onSubjectChange}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {subjects.map(sub => <SelectItem key={sub.code} value={sub.code}>{sub.libelle}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 w-52" placeholder="Rechercher élève..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-3 text-xs font-semibold flex-wrap">
            <span>Moy : <span className="font-mono text-primary">{stats.moyenne.toFixed(2)}</span></span>
            <span>Méd : <span className="font-mono text-purple-600">{stats.mediane.toFixed(2)}</span></span>
            <span className="text-green-700">≥10 : <strong>{stats.geq10}</strong></span>
            <span className="text-destructive">&lt;10 : <strong>{stats.lt10}</strong></span>
            {bonusAllowed && bonusPoints > 0 && (
              <span className="text-yellow-700">⭐ Bonus : +{bonusPoints} pts</span>
            )}
            {(() => {
              const subj = subjects.find(s => s.code === selectedSubjectCode);
              const isEPS = subj
                ? subj.libelle.toLowerCase().includes('eps') || subj.libelle.toLowerCase().includes('sport') || subj.libelle.toLowerCase().includes('éducation physique') || selectedSubjectCode.toUpperCase() === 'EPS'
                : false;
              const grp = currentAttribution?.groupe || 'Classe entière';
              const tGender = teacher?.gender;
              if (isEPS && grp === 'Classe entière' && tGender) {
                return (
                  <span className={`font-semibold px-2 py-0.5 rounded border text-xs ${tGender === 'M' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-pink-50 border-pink-300 text-pink-700'}`}>
                    🏃 EPS — {tGender === 'M' ? 'Garçons uniquement' : 'Filles uniquement'}
                  </span>
                );
              }
              return null;
            })()}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-1.5 text-xs">
            <input 
              type="checkbox" 
              id="valide-devoir"
              checked={valideDevoir}
              onChange={(e) => setValideDevoir(e.target.checked)}
              disabled={selectedDevoirNumero !== 'new' && valideDevoir}
              className="h-4 w-4 cursor-pointer accent-primary" 
            />
            <Label htmlFor="valide-devoir" className="cursor-pointer font-medium">Valider & verrouiller ces notes</Label>
          </div>
          {valideDevoir && selectedDevoirNumero !== 'new' && (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1 px-3 py-1 font-bold">
              <Lock className="h-3 w-3" /> Verrouillé
            </Badge>
          )}
          <Button
            size="sm"
            className="gap-1"
            onClick={handleSave}
            disabled={saving || periodeLockStatus.est_verrouille}
          >
            {saving ? <Clock className="h-4 w-4 animate-spin" /> : periodeLockStatus.est_verrouille ? <Lock className="h-4 w-4 text-slate-400" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? 'Enregistrement...' : periodeLockStatus.est_verrouille ? 'Saisie verrouillée' : saved ? 'Enregistré !' : 'Enregistrer les notes'}
          </Button>
          <Button size="sm" variant="outline" className="gap-1" onClick={handleExportExcelTemplate}>
            <Download className="h-4 w-4" />
            Exporter Template
          </Button>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => document.getElementById('excel-import-input')?.click()}>
            <Upload className="h-4 w-4" />
            Importer Excel
          </Button>
          <input
            id="excel-import-input"
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportExcel}
          />
        </div>
      </div>

      {/* Statistiques auto post-saisie */}
      {students.length > 0 && stats.moyenne > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: 'Moyenne classe', value: `${stats.moyenne.toFixed(2)}/20`, color: stats.moyenne >= 10 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700', icon: '📊' },
            { label: 'Médiane', value: `${stats.mediane.toFixed(2)}/20`, color: 'bg-purple-50 border-purple-200 text-purple-700', icon: '📍' },
            { label: `Réussite (≥10)`, value: `${stats.geq10} élève(s) — ${students.filter(s => (studentNotes[s.id]?.note || 0) > 0).length > 0 ? Math.round(stats.geq10 / students.filter(s => (studentNotes[s.id]?.note || 0) > 0).length * 100) : 0}%`, color: 'bg-green-50 border-green-200 text-green-700', icon: '✅' },
            { label: `Insuffisant (<10)`, value: `${stats.lt10} élève(s)`, color: 'bg-red-50 border-red-200 text-red-700', icon: '⚠️' },
          ].map(s => (
            <div key={s.label} className={`p-3 rounded-lg border text-center ${s.color}`}>
              <p className="text-lg font-bold font-mono">{s.icon} {s.value}</p>
              <p className="text-xs mt-0.5 opacity-80">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <Card>
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/90 border-b border-border z-10">
              <tr>
                <th className="text-left p-3 font-semibold">Élève</th>
                <th className="text-center p-3 font-semibold w-32">Note /20</th>
                {bonusAllowed && <th className="text-center p-3 font-semibold w-28 text-yellow-700">⭐ Note+Bonus</th>}
                <th className="text-center p-3 font-semibold w-28 text-blue-700">Pondérée (×{coefficient})</th>
                <th className="text-left p-3 font-semibold">Appréciation</th>
                <th className="text-left p-3 font-semibold text-indigo-700 w-36">Obs. prof</th>
                <th className="text-center p-3 font-semibold w-32">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => {
                const n = studentNotes[s.id] || { note: 0, appreciation: '', valide: false };
                return (
                  <tr key={s.id} className={`border-b border-border hover:bg-muted/20 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">{s.lastName[0]}{s.firstName[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-xs">{formatStudentName(s)}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{s.matricule}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <NoteCell 
                        value={n.note} 
                        disabled={valideDevoir && !n.autorisation_modification}
                        onChange={v => {
                          if (valideDevoir) {
                            const isDir = localStorage.getItem('user_role') === 'direction' || localStorage.getItem('user_role') === 'directeur_ecole';
                            if (!isDir) {
                              alert("Modification verrouillée. Seul le Directeur de l'école est habilité à autoriser une correction.");
                              return;
                            }
                            setTargetStudentId(s.id);
                            setTempNoteValue(v);
                            setJustificationText('');
                            setShowCorrectionDialog(true);
                          } else {
                            setStudentNotes(prev => ({
                              ...prev,
                              [s.id]: {
                                ...n,
                                note: v,
                                appreciation: getAutoAppreciation(v)
                              }
                            }));
                          }
                        }} 
                      />
                    </td>
                    {bonusAllowed && (
                      <td className="p-3 text-center font-mono text-sm font-bold text-yellow-700">
                        {n.note > 0 ? Math.min(20, n.note + bonusPoints).toFixed(2) : '—'}
                      </td>
                    )}
                    <td className="p-3 text-center font-mono text-sm font-bold text-blue-700">
                      {n.note > 0 ? (n.note * coefficient).toFixed(2) : '—'}
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={n.appreciation}
                        disabled={valideDevoir && !n.autorisation_modification}
                        onChange={e => setStudentNotes(prev => ({
                          ...prev,
                          [s.id]: { ...n, appreciation: e.target.value }
                        }))}
                        className="text-xs border border-border rounded px-1.5 py-1 w-full max-w-xs focus:outline-none focus:border-primary bg-transparent disabled:opacity-50"
                        placeholder="Appréciation…"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={n.observation ?? ''}
                        disabled={valideDevoir && !n.autorisation_modification}
                        onChange={e => setStudentNotes(prev => ({
                          ...prev,
                          [s.id]: { ...n, observation: e.target.value }
                        }))}
                        className="text-xs border border-indigo-200 rounded px-1.5 py-1 w-full focus:outline-none focus:border-indigo-500 bg-transparent disabled:opacity-50 text-indigo-700"
                        placeholder="Observation…"
                      />
                    </td>
                    <td className="p-3 text-center">
                      {n.valide ? (
                        <span className="text-xs text-green-700 font-semibold bg-green-50 px-2 py-0.5 rounded border border-green-200">
                          {n.justification_modification ? '✏️ Modifiée' : '🔒 Validée'}
                        </span>
                      ) : (
                        <span className="text-xs text-yellow-700 font-semibold bg-yellow-50 px-2 py-0.5 rounded border border-yellow-200">
                          Modifiable
                        </span>
                      )}
                      {n.justification_modification && (
                        <p className="text-[10px] text-muted-foreground italic mt-0.5 truncate max-w-[150px]" title={n.justification_modification}>
                          Motif: {n.justification_modification}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={bonusAllowed ? 7 : 6} className="text-center p-8 text-muted-foreground italic">
                    Aucun élève trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dialog Suppression Devoir */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />Supprimer le devoir ?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm py-2">Cette action supprimera <strong>toutes les notes</strong> du devoir <strong>{selectedDevoirNumero}</strong> pour cette classe. Elle est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} className="gap-2">
              <Trash2 className="h-4 w-4" />Confirmer la suppression
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Justification Dialog */}
      <Dialog open={showCorrectionDialog} onOpenChange={setShowCorrectionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5 text-yellow-600" /> Autorisation & Justification du Directeur
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Cette évaluation a déjà été validée. Toute correction doit être justifiée.
            </p>
            <div className="space-y-1">
              <Label htmlFor="justification" className="text-xs font-semibold">Motif de la modification *</Label>
              <Textarea 
                id="justification" 
                placeholder="ex: Erreur de saisie signalée, nouvelle correction de copie..." 
                value={justificationText}
                onChange={e => setJustificationText(e.target.value)}
                className="h-20 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowCorrectionDialog(false)}>Annuler</Button>
            <Button size="sm" onClick={handleConfirmCorrection} disabled={!justificationText.trim()}>Autoriser et Modifier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Central Feedback Modal Dialog with Animated Emojis ── */}
      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent className="sm:max-w-md text-center p-6 space-y-4 border-2 border-primary/20 shadow-2xl rounded-2xl bg-card">
          <div className="flex flex-col items-center justify-center space-y-3 pt-2">
            <div className={`h-24 w-24 rounded-full flex items-center justify-center text-5xl shadow-inner animate-bounce select-none ${
              feedbackModalConfig.type === 'create'
                ? 'bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-300 text-emerald-600'
                : 'bg-indigo-100 dark:bg-indigo-950/60 border-2 border-indigo-300 text-indigo-600'
            }`}>
              {feedbackModalConfig.emoji}
            </div>

            <DialogHeader className="space-y-1.5 text-center">
              <DialogTitle className="text-xl font-extrabold text-foreground text-center">
                {feedbackModalConfig.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-center text-muted-foreground">
                {feedbackModalConfig.description}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Details recap */}
          <div className="bg-muted/60 dark:bg-muted/20 rounded-xl p-3.5 text-xs space-y-1.5 border border-border text-left">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Code devoir :</span>
              <Badge variant="outline" className="font-mono font-bold text-xs bg-background">
                {feedbackModalConfig.devoirCode}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Matière :</span>
              <span className="font-semibold text-foreground">{feedbackModalConfig.matiere}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Période :</span>
              <span className="font-semibold text-foreground">Trimestre {feedbackModalConfig.trimestre}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Effectif pris en compte :</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{feedbackModalConfig.count} élève(s)</span>
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={() => setShowFeedbackModal(false)}
              className="w-full h-11 text-sm font-bold shadow-md bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
            >
              D'accord / Continuer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Composant Principal ──────────────────────────────────────────────────────

export default function ProfesseurSpace() {
  const scheduleRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMessage, setSelectedMessage] = useState<typeof MESSAGES[0] | null>(null);
  const [showNewDevoirModal, setShowNewDevoirModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [newDevoir, setNewDevoir] = useState({ titre: '', classe: '', type: 'devoir', dateRemise: '', description: '' });

  // Cahier de texte and Pointages states
  const [seancesList, setSeancesList] = useState<any[]>([]);
  const [seanceTitre, setSeanceTitre] = useState('');
  const [seanceContenu, setSeanceContenu] = useState('');
  const [seanceHeure, setSeanceHeure] = useState('08:00 - 10:00');
  const [seanceDate, setSeanceDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [pointagesList, setPointagesList] = useState<any[]>([]);
  const [pointageToday, setPointageToday] = useState<any | null>(null);
  const [appelFaitAujourdhui, setAppelFaitAujourdhui] = useState(false);

  const loadSeances = async () => {
    try {
      const data = await apiClient.getSeances();
      setSeancesList(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadPointages = async (teacherId: string) => {
    try {
      const data = await apiClient.getPointages({ personnel_id: parseInt(teacherId, 10) || 1 });
      setPointagesList(data);
      const todayStr = new Date().toISOString().split('T')[0];
      const todayRec = data.find(p => new Date(p.date).toISOString().split('T')[0] === todayStr);
      setPointageToday(todayRec || null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClockIn = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toTimeString().split(' ')[0].substring(0, 5);
    const limitHour = 8;
    const limitMin = 0;
    const h = parseInt(nowTime.split(':')[0], 10);
    const m = parseInt(nowTime.split(':')[1], 10);
    const isLate = h > limitHour || (h === limitHour && m > limitMin);
    
    try {
      await apiClient.clockInOut({
        date: todayStr,
        heure_arrivee: nowTime,
        heure_depart: null,
        statut: isLate ? 'retard' : 'present',
        personnel_id: parseInt(teacher.id, 10) || 1
      });
      await loadPointages(teacher.id);
      alert(`Pointage d'arrivée enregistré à ${nowTime} (${isLate ? 'En retard' : 'À l\'heure'}) !`);
    } catch (err) {
      console.error(err);
      alert("Erreur lors du pointage.");
    }
  };

  const handleClockOut = async () => {
    if (!pointageToday) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toTimeString().split(' ')[0].substring(0, 5);
    
    try {
      await apiClient.clockInOut({
        date: todayStr,
        heure_arrivee: pointageToday.heure_arrivee,
        heure_depart: nowTime,
        statut: pointageToday.statut,
        personnel_id: parseInt(teacher.id, 10) || 1
      });
      await loadPointages(teacher.id);
      alert(`Pointage de départ enregistré à ${nowTime} !`);
    } catch (err) {
      console.error(err);
      alert("Erreur lors du pointage.");
    }
  };

  const handleSaveSeance = async () => {
    if (!seanceTitre.trim() || !seanceContenu.trim()) {
      alert("Veuillez saisir le titre et le contenu de la séance.");
      return;
    }
    const subject = subjects.find(s => s.code === selectedSubjectCode);
    const subjectId = subject ? subject.id : 1;
    
    try {
      await apiClient.createSeance({
        titre: seanceTitre,
        contenu: seanceContenu,
        date: seanceDate,
        heure: seanceHeure,
        classe_id: parseInt(selectedClassId, 10) || 1,
        enseignant_id: parseInt(teacher.id, 10) || 1,
        matiere_id: parseInt(subjectId, 10) || 1
      });
      setSeanceTitre('');
      setSeanceContenu('');
      await loadSeances();
      alert("Séance enregistrée dans le cahier de texte !");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement.");
    }
  };

  // API States
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<any>(getInitialTeacher);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>('MATH');
  const [devoirs, setDevoirs] = useState(DEVOIRS_MOCK);
  const [attributionsList, setAttributionsList] = useState<any[]>([]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [classesData, staffData, schoolsData, subjectsData, allEvaluations, allAttendance, studentsData, attributionsData] = await Promise.all([
          apiClient.getClasses().catch((err: any): any[] => {
            console.error("Failed to fetch classes from API", err);
            return [];
          }),
          apiClient.getStaff().catch((err: any): any[] => {
            console.error("Failed to fetch staff from API", err);
            return [];
          }),
          apiClient.getSchools().catch((err: any): any[] => {
            console.error("Failed to fetch schools from API", err);
            return [];
          }),
          apiClient.getSubjects().catch((_err: any): any[] => []),
          apiClient.getEvaluations().catch((err: any): any[] => {
            console.error("Failed to fetch evaluations from API", err);
            return [];
          }),
          apiClient.getAttendance().catch((err: any): any[] => {
            console.error("Failed to fetch attendance from API", err);
            return [];
          }),
          apiClient.getStudents().catch((err: any): any[] => {
            console.error("Failed to fetch students from API", err);
            return [];
          }),
          apiClient.getAttributions().catch((err: any): any[] => {
            console.error("Failed to fetch attributions from API", err);
            return [];
          })
        ]);

        // Find current teacher
        const username = (localStorage.getItem('username') || '').toLowerCase().trim();
        const foundStaff = staffData.find((s: any) => 
          (s.email && s.email.toLowerCase() === username) ||
          (s.email && s.email.toLowerCase() === `${username}@hinneh.ci`) ||
          (s.email && s.email.toLowerCase().startsWith(username)) ||
          String(s.id) === username ||
          String(s.userId || s.user_id) === username
        ) || staffData.find((s: any) => s.fonction === 'enseignant' || s.fonction === 'professeur') || staffData[0];
        
        let activeTeacher = getInitialTeacher();
        let activeClasses = classesData;
        
        if (foundStaff) {
          const staffSchoolId = String(foundStaff.schoolId || foundStaff.ecole_id || localStorage.getItem('user_ecole_id') || '');
          const staffSchoolCode = String(foundStaff.ET_CODEETABLISSEMENT || foundStaff.schoolCode || localStorage.getItem('user_ecole_code') || '');
          const userEcoleStoredName = localStorage.getItem('user_ecole_name') || localStorage.getItem('user_school_name') || '';

          const sch = schoolsData.find((s: any) => 
            (staffSchoolId && (String(s.id) === staffSchoolId || String(s.IDETABLISSEMENT) === staffSchoolId)) ||
            (staffSchoolCode && (s.code === staffSchoolCode || s.ET_CODEETABLISSEMENT === staffSchoolCode))
          );

          const resolvedSchoolName = userEcoleStoredName || sch?.name || sch?.ET_DENOMMINATION || (staffSchoolCode ? `Établissement ${staffSchoolCode}` : 'Établissement Scolaire');

          activeTeacher = {
            id: String(foundStaff.id),
            firstName: foundStaff.firstName || foundStaff.prenom,
            lastName: foundStaff.lastName || foundStaff.nom,
            email: foundStaff.email,
            phone: foundStaff.phone || foundStaff.telephone || '+225 07 00 00 00 00',
            matiere: foundStaff.fonction === 'enseignant' ? 'Enseignant' : (foundStaff.fonction || 'Enseignant'),
            grade: 'Professeur Certifié',
            schoolId: staffSchoolId,
            schoolName: resolvedSchoolName,
            gender: (foundStaff as any).gender ?? null,
          };
          
          // Filter classes taught by this teacher (either main class teacher or has attributions)
          const activeClassIds = new Set(attributionsData
            .filter((a: any) => String(a.enseignant_id) === String(foundStaff.id))
            .map((a: any) => String(a.classe_id))
          );
          const teacherClasses = classesData.filter(c => String(c.teacherId) === String(foundStaff.id) || activeClassIds.has(String(c.id)));
          if (teacherClasses.length > 0) {
            activeClasses = teacherClasses;
          }
        }
        
        setTeacher(activeTeacher);
        setClasses(activeClasses);
        setAllStudents(studentsData);
        setEvaluations(allEvaluations);
        setAttendance(allAttendance);
        setAttributionsList(attributionsData);

        await loadSeances();
        if (foundStaff) {
          await loadPointages(String(foundStaff.id));
        }

        const defaultClassId = activeClasses[0]?.id || '';
        setSelectedClassId(defaultClassId);

        // Subject list initialization
        const mappedSubjects = subjectsData.length > 0 ? subjectsData : [
          { code: 'MATH', libelle: 'Mathématiques' },
          { code: 'FRAN', libelle: 'Français' },
          { code: 'ANG', libelle: 'Anglais' },
          { code: 'PHYS', libelle: 'Physique-Chimie' },
          { code: 'ISLAM', libelle: 'Éducation Islamique' }
        ];
        setSubjects(mappedSubjects);
        setSelectedSubjectCode(mappedSubjects[0]?.code || 'MATH');

        // Initialize Devoir state class selection
        setNewDevoir(prev => ({ ...prev, classe: activeClasses[0]?.name || '' }));
      } catch (err) {
        console.error("Error loading teacher space data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 1. Find matching subject
  const selectedSubjectId = useMemo(() => {
    const subj = subjects.find(s => s.code === selectedSubjectCode);
    return subj ? String(subj.id) : '';
  }, [subjects, selectedSubjectCode]);

  // 2. Find matching attribution for the teacher, class, and subject
  const currentAttribution = useMemo(() => {
    return attributionsList.find(
      (a: any) => String(a.enseignant_id) === String(teacher.id) &&
                  String(a.classe_id) === String(selectedClassId) &&
                  String(a.matiere_id) === String(selectedSubjectId)
    );
  }, [attributionsList, teacher.id, selectedClassId, selectedSubjectId]);

  // 3. Filter students of selected class by target group
  const students = useMemo(() => {
    const classStudents = allStudents.filter(s => String(s.classId) === String(selectedClassId));
    const grp = currentAttribution?.groupe || 'Classe entière';

    if (grp === 'Garçons') return classStudents.filter(s => s.gender === 'M');
    if (grp === 'Filles')  return classStudents.filter(s => s.gender === 'F');
    if (grp === 'Espagnol') return classStudents.filter(s => s.MA_LV2 === 'ESP' || String(s.AU_LANGUEVIVANTE2).toLowerCase().includes('espagnol'));
    if (grp === 'Allemand') return classStudents.filter(s => s.MA_LV2 === 'ALL' || String(s.AU_LANGUEVIVANTE2).toLowerCase().includes('allemand'));

    // EPS auto-split : si la matière est EPS et qu'aucun groupe explicite n'est défini,
    // le prof homme enseigne aux garçons, le prof femme enseigne aux filles.
    const selectedSubjectLabel = subjects.find(s => s.code === selectedSubjectCode);
    const isEPS = selectedSubjectLabel
      ? selectedSubjectLabel.libelle.toLowerCase().includes('eps')
        || selectedSubjectLabel.libelle.toLowerCase().includes('sport')
        || selectedSubjectLabel.libelle.toLowerCase().includes('éducation physique')
        || selectedSubjectCode.toUpperCase() === 'EPS'
      : false;
    if (isEPS && grp === 'Classe entière') {
      const teacherGender: string | null = teacher?.gender ?? null;
      if (teacherGender === 'M') return classStudents.filter(s => s.gender === 'M');
      if (teacherGender === 'F') return classStudents.filter(s => s.gender === 'F');
    }

    return classStudents;
  }, [allStudents, selectedClassId, currentAttribution, selectedSubjectCode, subjects, teacher]);

  const teacherSchedule = useMemo(() => {
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
    return days.map(day => {
      const dayAttrs = attributionsList.filter(
        (a: any) => String(a.enseignant_id) === String(teacher.id) && a.jour === day
      );
      
      const slots = dayAttrs.map((a: any) => {
        const cls = classes.find(c => String(c.id) === String(a.classe_id));
        const subj = subjects.find(s => String(s.id) === String(a.matiere_id));
        
        let matiereLabel = subj ? subj.libelle : 'Matière';
        if (a.groupe && a.groupe !== 'Classe entière') {
          matiereLabel += ` (${a.groupe})`;
        }
        
        const c = String(subj ? subj.code : '').toUpperCase();
        const l = String(subj ? subj.libelle : '').toLowerCase();
        const isReligious = c.includes('ISLAM') || c.includes('CORAN') || c.includes('TAJ') || c.includes('ARABE') ||
                            l.includes('coran') || l.includes('islam') || l.includes('religion') || l.includes('tajwid');

        return {
          time: a.heure || 'Horaire',
          classe: cls ? cls.name : `Classe #${a.classe_id}`,
          matiere: matiereLabel,
          salle: a.salle || 'N/A',
          type: isReligious ? 'islamique' : ((a.heure && a.heure.includes('comp')) || (subj && subj.code.includes('EXAM')) ? 'exam' : 'cours')
        };
      });

      slots.sort((s1, s2) => s1.time.localeCompare(s2.time));
      return { day, slots };
    });
  }, [attributionsList, teacher.id, classes, subjects]);

  const hasDynamicSchedule = useMemo(() => {
    return attributionsList.some((a: any) => String(a.enseignant_id) === String(teacher.id));
  }, [attributionsList, teacher.id]);

  const weekSchedule = useMemo(() => {
    if (!hasDynamicSchedule) {
      return ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'].map(day => ({ day, slots: [] }));
    }
    return teacherSchedule;
  }, [hasDynamicSchedule, teacherSchedule]);

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
  };

  const handleSaveNotes = async (payload: {
    classe_id: number;
    matiere: string;
    trimestre: number;
    type: string;
    devoir_numero: string;
    coefficient: number;
    date: string;
    date_recuperation?: string | null;
    date_correction?: string | null;
    date_remise?: string | null;
    valide?: boolean;
    notes: Array<{
      eleve_id: number;
      note: number;
      appreciation?: string;
      eval_id?: number | string;
      justification_modification?: string;
      autorisation_modification?: boolean;
    }>;
  }) => {
    try {
      await apiClient.saveEvaluationsBulk(payload);
    } catch (err) {
      console.warn("Bulk save failed, falling back to individual calls:", err);
      const savePromises = payload.notes.map(n => {
        const itemPayload = {
          matiere: payload.matiere,
          type: payload.type,
          trimestre: payload.trimestre,
          note: Number(n.note),
          coefficient: payload.coefficient,
          date: payload.date,
          appreciation: n.appreciation || null,
          classe_id: payload.classe_id,
          eleve_id: n.eleve_id,
          devoir_numero: payload.devoir_numero,
          date_recuperation: payload.date_recuperation || null,
          date_correction: payload.date_correction || null,
          date_remise: payload.date_remise || null,
          valide: payload.valide || false,
          justification_modification: n.justification_modification || null,
          autorisation_modification: n.autorisation_modification || false,
        };

        if (n.eval_id) {
          return apiClient.updateEvaluation(n.eval_id, itemPayload);
        } else {
          return apiClient.createEvaluation(itemPayload);
        }
      });
      await Promise.all(savePromises);
    }

    const updatedEvals = await apiClient.getEvaluations({ classe_id: payload.classe_id });
    setEvaluations(updatedEvals);
  };

  const handleSaveAttendance = async (
    dateStr: string,
    presencesData: Record<string, 'present' | 'absent' | 'retard' | 'excuse'>,
    heureStr: string
  ) => {
    const savePromises = students.map(s => {
      const status = presencesData[s.id] || 'present';
      const existing = attendance.find(
        a => String(a.studentId) === String(s.id) &&
             String(a.classId) === String(selectedClassId) &&
             new Date(a.date).toISOString().split('T')[0] === dateStr &&
             a.heure === heureStr
      );
      
      const payload = {
        date: dateStr,
        statut: status,
        classe_id: parseInt(selectedClassId, 10) || 1,
        eleve_id: parseInt(s.id, 10) || 1,
        heure: heureStr,
        justification: status === 'excuse' ? 'Justifié par l\'enseignant' : undefined
      };
      
      if (existing) {
        return apiClient.updateAttendance(existing.id, payload).catch(err => {
          console.error("Attendance locked or failed to update:", err);
          throw err;
        });
      } else {
        return apiClient.createAttendance(payload);
      }
    });

    await Promise.all(savePromises);
    const updatedAttendance = await apiClient.getAttendance();
    setAttendance(updatedAttendance);
    // Enregistrement automatique présence du professeur dès qu'il effectue l'appel
    if (!pointageToday?.heure_arrivee) {
      const todayStr = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toTimeString().split(' ')[0].substring(0, 5);
      const isLate = parseInt(nowTime.split(':')[0], 10) > 8;
      try {
        await apiClient.clockInOut({
          date: todayStr,
          heure_arrivee: nowTime,
          heure_depart: null,
          statut: isLate ? 'retard' : 'present',
          personnel_id: parseInt(teacher.id, 10) || 1
        });
        await loadPointages(teacher.id);
      } catch (_e) {
        console.warn('Pointage auto non enregistré:', _e);
      }
    }
    setAppelFaitAujourdhui(true);
  };

  const handleCreateDevoir = () => {
    if (!newDevoir.titre) return;
    const created = {
      id: `d-${Date.now()}`,
      classe: newDevoir.classe,
      titre: newDevoir.titre,
      dateRemise: newDevoir.dateRemise ? new Date(newDevoir.dateRemise) : new Date(),
      type: newDevoir.type,
      statut: 'planifie',
      rendus: 0,
      total: classes.find(c => c.name === newDevoir.classe)?.studentCount || 35
    };
    setDevoirs(prev => [created, ...prev]);
    setShowNewDevoirModal(false);
    setNewDevoir({ titre: '', classe: classes[0]?.name || '', type: 'devoir', dateRemise: '', description: '' });
  };

  const unread = MESSAGES.filter(m => !m.read).length;
  const totalEleves = classes.reduce((a, c) => a + (c.studentCount || 0), 0);
  
  const hasEvals = useMemo(() => {
    const classIds = classes.map(c => String(c.id));
    return evaluations.some(ev => classIds.includes(String(ev.classId)));
  }, [classes, evaluations]);

  const avgMoyenne = useMemo(() => {
    const classIds = classes.map(c => String(c.id));
    const relevantEvals = evaluations.filter(ev => classIds.includes(String(ev.classId)));
    if (relevantEvals.length === 0) return 0;
    const sum = relevantEvals.reduce((a, b) => a + b.note, 0);
    return sum / relevantEvals.length;
  }, [classes, evaluations]);

  const hasAttendance = useMemo(() => {
    const classIds = classes.map(c => String(c.id));
    return attendance.some(att => classIds.includes(String(att.classId)));
  }, [classes, attendance]);

  const avgPresence = useMemo(() => {
    const classIds = classes.map(c => String(c.id));
    const relevantAtt = attendance.filter(att => classIds.includes(String(att.classId)));
    if (relevantAtt.length === 0) return 0;
    const presents = relevantAtt.filter(att => att.status === 'present').length;
    return (presents / relevantAtt.length) * 100;
  }, [classes, attendance]);

  const devoirsEnCours = devoirs.filter(d => d.statut === 'en_cours' || d.statut === 'planifie').length;

  if (loading) {
    return (
      <Layout
        loading={true}
        loadingMessage="Chargement de l'espace professeur (Secondaire)..."
        loadingSubmessage="Préparation de vos classes, attributions et évaluations"
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
              <span className="text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full uppercase tracking-wide">Espace Professeur — Secondaire</span>
              {appelFaitAujourdhui
                ? <span className="ml-2 text-xs font-medium px-2 py-0.5 bg-green-100 text-green-700 rounded-full">✓ Appel effectué — Présence confirmée</span>
                : <span className="ml-2 text-xs font-medium px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">⚠️ Appel non effectué</span>
              }
              <h1 className="text-3xl font-bold tracking-tight mt-1">{formatStudentName(teacher)}</h1>
              <p className="text-muted-foreground">{teacher.matiere} — {teacher.schoolName}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="gap-1" onClick={() => setShowNewDevoirModal(true)}>
                <PlusCircle className="h-4 w-4" />Nouveau devoir
              </Button>
            </div>
          </div>
        </motion.div>

        {/* KPIs */}
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Mes classes', value: classes.length, sub: `${totalEleves} élèves total`, icon: GraduationCap, color: 'primary' },
            { label: 'Moy. générale', value: hasEvals ? `${avgMoyenne.toFixed(1)}/20` : '—', sub: 'Toutes classes', icon: BarChart3, color: 'success' },
            { label: 'Taux présence', value: hasAttendance ? `${avgPresence.toFixed(0)}%` : '—', sub: 'Moy. mes classes', icon: CheckSquare, color: avgPresence >= 90 ? 'success' : 'warning' },
            { label: 'Devoirs actifs', value: devoirsEnCours, sub: 'À corriger / planifiés', icon: ClipboardList, color: 'warning' },
          ].map(kpi => (
            <motion.div key={kpi.label} variants={staggerItem}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                      <p className="text-2xl font-bold font-mono mt-1">{kpi.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
                    </div>
                    <div className={`p-2.5 rounded-xl ${kpi.color === 'primary' ? 'bg-primary/10 text-primary' : kpi.color === 'success' ? 'bg-success/10 text-green-600' : 'bg-warning/20 text-yellow-600'}`}>
                      <kpi.icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-11 w-full">
            <TabsTrigger value="dashboard" className="text-xs gap-1"><BarChart3 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Tableau de bord</span></TabsTrigger>
            <TabsTrigger value="presences" className="text-xs gap-1"><Calendar className="h-3.5 w-3.5" /><span className="hidden sm:inline">Présences</span></TabsTrigger>
            <TabsTrigger value="historique-appels" className="text-xs gap-1"><History className="h-3.5 w-3.5" /><span className="hidden sm:inline">Historique Appels</span></TabsTrigger>
            <TabsTrigger value="notes" className="text-xs gap-1"><BookOpen className="h-3.5 w-3.5" /><span className="hidden sm:inline">Saisie Notes</span></TabsTrigger>
            <TabsTrigger value="fiches" className="text-xs gap-1"><FileText className="h-3.5 w-3.5" /><span className="hidden sm:inline">Fiches de notes</span></TabsTrigger>
            <TabsTrigger value="matrices" className="text-xs gap-1"><Table className="h-3.5 w-3.5" /><span className="hidden sm:inline">Matrices</span></TabsTrigger>
            <TabsTrigger value="devoirs" className="text-xs gap-1"><ClipboardList className="h-3.5 w-3.5" /><span className="hidden sm:inline">Devoirs</span></TabsTrigger>
            <TabsTrigger value="classes" className="text-xs gap-1"><Users className="h-3.5 w-3.5" /><span className="hidden sm:inline">Mes classes</span></TabsTrigger>
            <TabsTrigger value="emploi" className="text-xs gap-1"><Clock className="h-3.5 w-3.5" /><span className="hidden sm:inline">Emploi du temps</span></TabsTrigger>
            <TabsTrigger value="suivi" className="text-xs gap-1"><BookOpen className="h-3.5 w-3.5" /><span className="hidden sm:inline">Cahier de texte</span></TabsTrigger>
            <TabsTrigger value="pointage" className="text-xs gap-1"><Clock className="h-3.5 w-3.5" /><span className="hidden sm:inline">Pointage</span></TabsTrigger>
          </TabsList>

          {/* ── DASHBOARD ── */}
          <TabsContent value="dashboard" className="mt-5 space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              {/* Mes classes */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />Aperçu de mes classes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {classes.map(c => {
                    const relevantEvals = evaluations.filter(ev => String(ev.classId) === String(c.id));
                    const avgNote = relevantEvals.length > 0 
                      ? relevantEvals.reduce((sum, ev) => sum + ev.note, 0) / relevantEvals.length 
                      : 0;

                    const relevantAtt = attendance.filter(att => String(att.classId) === String(c.id));
                    const presenceRate = relevantAtt.length > 0 
                      ? (relevantAtt.filter(att => att.status === 'present').length / relevantAtt.length) * 100 
                      : 0;

                    return (
                      <div key={c.id} className="p-3 border border-border rounded-xl hover:border-primary/30 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-bold">{c.name}</span>
                            <span className="text-sm text-muted-foreground ml-2">— {allStudents.filter(s => String(s.classId) === String(c.id)).length} élèves</span>
                          </div>
                          <div className="flex gap-3 text-xs">
                            <span className={`font-mono font-bold ${avgNote >= 14 ? 'text-green-600' : avgNote >= 10 ? 'text-primary' : 'text-destructive'}`}>
                              {avgNote.toFixed(1)}/20
                            </span>
                            <span className={`${presenceRate >= 90 ? 'text-green-600' : 'text-yellow-600'}`}>
                              {presenceRate.toFixed(0)}% présence
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground mb-1">Moyenne</p>
                            <Progress value={(avgNote / 20) * 100} className="h-1.5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground mb-1">Présence</p>
                            <Progress value={presenceRate} className="h-1.5" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {classes.length === 0 && (
                    <div className="p-6 text-center text-muted-foreground italic">
                      Aucune classe assignée.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Devoirs récents */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-primary" />Devoirs & Évaluations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {devoirs.slice(0, 5).map(d => (
                    <div key={d.id} className="flex items-center gap-3 p-2.5 border border-border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{d.titre}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{d.classe}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">Rendu : {formatDate(d.dateRemise)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-mono text-muted-foreground">{d.rendus}/{d.total}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${devoirStatutStyle[d.statut]}`}>
                          {d.statut.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                  {devoirs.length === 0 && (
                    <div className="p-6 text-center text-muted-foreground italic">
                      Aucun devoir planifié.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Agenda */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />Agenda de la semaine
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-5 gap-3">
                  {weekSchedule.map(day => (
                    <div key={day.day}>
                      <p className="text-xs font-bold text-muted-foreground uppercase mb-2">{day.day}</p>
                      <div className="space-y-1.5">
                        {day.slots.map((slot, i) => (
                          <div key={i} className={`p-2 rounded-lg border text-xs ${slotTypeStyle[slot.type]}`}>
                            <p className="font-mono text-muted-foreground">{slot.time}</p>
                            <p className="font-semibold">{slot.matiere}</p>
                            {slot.classe && <p className="text-muted-foreground">{slot.classe} — {slot.salle}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PRÉSENCES ── */}
          <TabsContent value="presences" className="mt-5">
             <PresenceSaisie
              students={students}
              selectedClassId={selectedClassId}
              classes={classes}
              attendance={attendance}
              onClassChange={handleClassChange}
              onSave={handleSaveAttendance}
              subjects={subjects}
              selectedSubjectCode={selectedSubjectCode}
              onSubjectChange={setSelectedSubjectCode}
              onAppelDone={() => setAppelFaitAujourdhui(true)}
              appelFait={appelFaitAujourdhui}
              teacher={teacher}
            />
          </TabsContent>

          {/* ── HISTORIQUE D'APPELS (DIRECT TAB) ── */}
          <TabsContent value="historique-appels" className="mt-5">
            <HistoriqueAppelsView
              classes={classes}
              students={students}
              attendance={attendance}
              teacher={teacher}
              selectedClassId={selectedClassId}
              onClassChange={handleClassChange}
              onEditSession={(d, h) => {
                setActiveTab('presences');
              }}
            />
          </TabsContent>

          {/* ── NOTES ── */}
          <TabsContent value="notes" className="mt-5">
            <NotesSaisie
              classes={classes}
              students={students}
              selectedClassId={selectedClassId}
              onClassChange={handleClassChange}
              subjects={subjects}
              selectedSubjectCode={selectedSubjectCode}
              onSubjectChange={setSelectedSubjectCode}
              evaluations={evaluations}
              teacher={teacher}
              currentAttribution={currentAttribution}
              onSave={handleSaveNotes}
            />
          </TabsContent>

          {/* ── FICHES DE NOTES ── */}
          <TabsContent value="fiches" className="mt-5">
             <FicheNotesView
              classes={classes}
              subjects={subjects}
              students={allStudents}
              evaluations={evaluations}
              teacher={teacher}
              selectedClassId={selectedClassId}
              onClassChange={handleClassChange}
              selectedSubjectId={selectedSubjectCode}
              onSubjectChange={setSelectedSubjectCode}
            />
          </TabsContent>

          {/* ── MATRICES DES NOTES ── */}
          <TabsContent value="matrices" className="mt-5">
            <MatriceNotesView
              classes={classes}
              subjects={subjects}
              students={allStudents}
              evaluations={evaluations}
              teacher={teacher}
              selectedClassId={selectedClassId}
              onClassChange={handleClassChange}
              selectedSubjectId={selectedSubjectCode}
              onSubjectChange={setSelectedSubjectCode}
            />
          </TabsContent>

          {/* ── DEVOIRS ── */}
          <TabsContent value="devoirs" className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Devoirs & Évaluations planifiés</h2>
              <Button size="sm" className="gap-1" onClick={() => setShowNewDevoirModal(true)}>
                <Plus className="h-4 w-4" />Nouveau devoir
              </Button>
            </div>
            <div className="grid gap-3">
              {devoirs.map(d => (
                <Card key={d.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-xl ${d.type === 'composition' ? 'bg-destructive/10' : d.type === 'tp' ? 'bg-blue-100' : 'bg-primary/10'}`}>
                        <FileText className={`h-5 w-5 ${d.type === 'composition' ? 'text-destructive' : d.type === 'tp' ? 'text-blue-600' : 'text-primary'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div>
                            <h3 className="font-semibold">{d.titre}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs bg-muted px-2 py-0.5 rounded capitalize">{d.type}</span>
                              <span className="text-xs text-muted-foreground">Classe : {d.classe}</span>
                              <span className="text-xs text-muted-foreground">Remise : {formatDate(d.dateRemise)}</span>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${devoirStatutStyle[d.statut]}`}>
                            {d.statut.replace('_', ' ')}
                          </span>
                        </div>
                        {d.rendus > 0 && (
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Rendus : {d.rendus}/{d.total}</span>
                              <span>{Math.round((d.rendus / d.total) * 100)}%</span>
                            </div>
                            <Progress value={(d.rendus / d.total) * 100} className="h-1.5" />
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {devoirs.length === 0 && (
                <div className="text-center p-8 text-muted-foreground italic bg-muted/10 rounded-xl border border-dashed">
                  Aucun devoir planifié pour le moment.
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── CLASSES ── */}
          <TabsContent value="classes" className="mt-5 space-y-4">
            {classes.map(cls => {
              const classStudents = allStudents.filter(s => String(s.classId) === String(cls.id));
              const displayStudents = classStudents.slice(0, 10);
              
              // Calculate avgNote and presence rate for this class specifically
              const relevantEvals = evaluations.filter(ev => String(ev.classId) === String(cls.id));
              const avgNote = relevantEvals.length > 0 
                ? relevantEvals.reduce((sum, ev) => sum + ev.note, 0) / relevantEvals.length 
                : 0;

              const relevantAtt = attendance.filter(att => String(att.classId) === String(cls.id));
              const presenceRate = relevantAtt.length > 0 
                ? (relevantAtt.filter(att => att.status === 'present').length / relevantAtt.length) * 100 
                : 0;

              return (
                <Card key={cls.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-primary" />
                        Classe {cls.name} — {classStudents.length} élèves
                      </span>
                      <div className="flex gap-4 text-sm font-normal">
                        <span>Moy: <strong className="text-primary font-mono">{avgNote.toFixed(1)}/20</strong></span>
                        <span>Présence: <strong className={presenceRate >= 90 ? 'text-green-600 font-mono' : 'text-yellow-600 font-mono'}>{presenceRate.toFixed(0)}%</strong></span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-border bg-muted/40 font-medium">
                          <tr>
                            <th className="text-left p-3 font-semibold">Élève</th>
                            <th className="text-center p-3 font-semibold">T1</th>
                            <th className="text-center p-3 font-semibold">T2</th>
                            <th className="text-center p-3 font-semibold">T3 ★</th>
                            <th className="text-center p-3 font-semibold">Présence</th>
                            <th className="text-left p-3 font-semibold">Appréciation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayStudents.map((s, i) => {
                            const studentEvals = evaluations.filter(ev => String(ev.studentId) === String(s.id) && ev.subject === selectedSubjectCode);
                            const t1 = studentEvals.find(ev => ev.trimester === 1)?.note ?? 0;
                            const t2 = studentEvals.find(ev => ev.trimester === 2)?.note ?? 0;
                            const t3 = studentEvals.find(ev => ev.trimester === 3)?.note ?? 0;
                            const appreciation = studentEvals.find(ev => ev.trimester === 3)?.appreciation || 
                                                 studentEvals.find(ev => ev.appreciation)?.appreciation || '—';

                            const studentAtt = attendance.filter(att => String(att.studentId) === String(s.id));
                            const studentPresenceRate = studentAtt.length > 0 
                              ? (studentAtt.filter(att => att.status === 'present').length / studentAtt.length) * 100 
                              : 95;

                            return (
                              <tr key={s.id} className={`border-b border-border hover:bg-muted/20 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-7 w-7">
                                      <AvatarFallback className="text-xs bg-primary/10 text-primary">{s.lastName[0]}{s.firstName[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium text-xs">{formatStudentName(s)}</p>
                                      <p className="text-xs text-muted-foreground font-mono">{s.matricule}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3 text-center font-mono text-xs">{t1 > 0 ? t1.toFixed(1) : '—'}</td>
                                <td className="p-3 text-center font-mono text-xs">{t2 > 0 ? t2.toFixed(1) : '—'}</td>
                                <td className="p-3 text-center">
                                  <span className={`font-mono font-bold text-sm ${t3 >= 16 ? 'text-green-600' : t3 >= 12 ? 'text-primary' : t3 >= 10 ? 'text-yellow-600' : t3 > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                    {t3 > 0 ? t3.toFixed(1) : '—'}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`text-xs font-mono ${studentPresenceRate >= 90 ? 'text-green-600' : 'text-yellow-600'}`}>{studentPresenceRate.toFixed(0)}%</span>
                                </td>
                                <td className="p-3 text-xs text-muted-foreground italic">{appreciation}</td>
                              </tr>
                            );
                          })}
                          {displayStudents.length === 0 && (
                            <tr>
                              <td colSpan={6} className="text-center p-8 text-muted-foreground italic">
                                Aucun élève dans cette classe.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {classStudents.length > 10 && (
                      <div className="p-3 text-center border-t border-border">
                        <Button variant="ghost" size="sm" className="text-xs">
                          Voir les {classStudents.length - 10} autres élèves <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {classes.length === 0 && (
              <div className="text-center p-8 text-muted-foreground italic bg-muted/10 rounded-xl border border-dashed">
                Aucune classe assignée pour le moment.
              </div>
            )}
          </TabsContent>

          {/* ── EMPLOI DU TEMPS ── */}
          <TabsContent value="emploi" className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Mon emploi du temps — Semaine en cours</h2>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 font-semibold text-primary border-primary/30 hover:bg-primary/10"
                onClick={() => printSchedule(
                  weekSchedule,
                  `Emploi du temps - ${formatStudentName(teacher)}`,
                  {
                    name: formatStudentName(teacher),
                    matiere: teacher.matiere,
                    schoolName: typeof localStorage !== 'undefined' ? (localStorage.getItem('user_ecole_name') || teacher?.schoolName) : teacher?.schoolName,
                    city: teacher?.city || teacher?.ville || (typeof localStorage !== 'undefined' ? (localStorage.getItem('user_ville') || localStorage.getItem('user_city')) : undefined),
                    anneeScolaire: '2026-2027'
                  }
                )}
              >
                <Printer className="h-4 w-4" />Imprimer Emploi du Temps
              </Button>
            </div>
            <div ref={scheduleRef} className="grid gap-4 md:grid-cols-5">
              {weekSchedule.map(day => (
                <Card key={day.day} className="overflow-hidden">
                  <div className="bg-primary/10 px-3 py-2 border-b border-primary/20">
                    <h3 className="font-semibold text-primary text-sm">{day.day}</h3>
                  </div>
                  <CardContent className="p-3 space-y-2">
                    {day.slots.map((slot, i) => (
                      <div key={i} className={`p-2.5 rounded-lg border ${slotTypeStyle[slot.type]}`}>
                        <p className="text-xs font-mono text-muted-foreground">{slot.time}</p>
                        <p className="text-sm font-semibold mt-0.5">{slot.matiere}</p>
                        {slot.classe && <p className="text-xs text-muted-foreground">{slot.classe}</p>}
                        <p className="text-xs text-muted-foreground">{slot.salle}</p>
                      </div>
                    ))}
                    {day.slots.length === 0 && (
                      <p className="text-xs text-muted-foreground italic text-center py-6">Aucun cours programmé</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Légende */}
            <div className="flex flex-wrap gap-3">
              {[
                { type: 'cours', label: 'Cours', style: 'bg-primary/5 border border-primary/20' },
                { type: 'exam', label: 'Examen / Composition', style: 'bg-destructive/5 border border-destructive/20' },
                { type: 'reunion', label: 'Réunion', style: 'bg-purple-50 border border-purple-200' },
                { type: 'islamique', label: 'Islamique', style: 'bg-green-50 border border-green-200' },
              ].map(l => (
                <div key={l.type} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${l.style}`}>
                  <span>{l.label}</span>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── MESSAGES ── */}
          <TabsContent value="messages" className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Messagerie interne</h2>
              <Button size="sm" className="gap-1" onClick={() => setShowMessageModal(true)}>
                <Send className="h-4 w-4" />Nouveau message
              </Button>
            </div>

            <div className="grid md:grid-cols-5 gap-4">
              <div className="md:col-span-2 space-y-2">
                {MESSAGES.map(m => (
                  <motion.div
                    key={m.id}
                    onClick={() => setSelectedMessage(m)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all hover:border-primary/40 ${selectedMessage?.id === m.id ? 'border-primary bg-primary/5' : 'border-border'} ${!m.read ? 'border-l-4 border-l-primary' : ''}`}
                    whileHover={{ x: 2 }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${!m.read ? 'font-bold' : 'font-medium'}`}>{m.from}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.subject}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-muted-foreground">{formatDate(m.date)}</span>
                        {!m.read && <span className="h-2 w-2 bg-primary rounded-full" />}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="md:col-span-3">
                {selectedMessage ? (
                  <Card>
                    <CardHeader className="border-b pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{selectedMessage.subject}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">De : <span className="font-medium">{selectedMessage.from}</span> — {formatDate(selectedMessage.date)}</p>
                        </div>
                        <Button variant="outline" size="sm" className="gap-1"><Send className="h-4 w-4" />Répondre</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <p className="text-sm leading-relaxed">{selectedMessage.content}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="h-48 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Sélectionnez un message</p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── SUIVI PEDAGOGIQUE (CAHIER DE TEXTE) ── */}
          <TabsContent value="suivi" className="mt-5 space-y-4">
            <div className="grid md:grid-cols-3 gap-5">
              {/* Formulaire Enregistrement Séance */}
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" /> Enregistrer une Séance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Classe</Label>
                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Matière</Label>
                    <Select value={selectedSubjectCode} onValueChange={setSelectedSubjectCode}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {subjects.map(s => <SelectItem key={s.code} value={s.code}>{s.libelle}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Date</Label>
                      <Input type="date" value={seanceDate} onChange={e => setSeanceDate(e.target.value)} className="h-9 w-full bg-transparent border rounded" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Heure</Label>
                      <Select value={seanceHeure} onValueChange={setSeanceHeure}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['08:00 - 10:00', '10:30 - 12:30', '13:30 - 15:30', '16:00 - 18:00'].map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Titre de la Séance *</Label>
                    <Input 
                      placeholder="ex: Chapitre 3 - Systèmes linéaires" 
                      value={seanceTitre} 
                      onChange={e => setSeanceTitre(e.target.value)} 
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Contenu de la Séance (Résumé pédagogique) *</Label>
                    <Textarea 
                      placeholder="ex: Étude des méthodes de substitution et de combinaison. Résolution de problèmes pratiques." 
                      value={seanceContenu} 
                      onChange={e => setSeanceContenu(e.target.value)} 
                      className="h-28 text-xs"
                    />
                  </div>
                  <Button className="w-full gap-2 mt-2" onClick={handleSaveSeance}>
                    <Save className="h-4 w-4" /> Enregistrer la séance
                  </Button>
                </CardContent>
              </Card>

              {/* Historique du Cahier de Texte */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-primary" /> Historique du Cahier de Texte
                    </span>
                    <Badge variant="secondary">{seancesList.length} séances</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[500px] overflow-y-auto">
                    <div className="p-4 space-y-4">
                      {seancesList.map((s, index) => {
                        const cl = classes.find(c => String(c.id) === String(s.classe_id))?.name || `Classe #${s.classe_id}`;
                        const subj = subjects.find(sub => String(sub.id) === String(s.matiere_id))?.libelle || `Matière #${s.matiere_id}`;
                        return (
                          <div key={s.id || index} className="p-4 border border-border rounded-xl bg-muted/20 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded capitalize">
                                {cl} · {subj}
                              </span>
                              <span className="text-xs text-muted-foreground font-mono">
                                📅 {new Date(s.date).toLocaleDateString('fr-FR')} {s.heure ? `(${s.heure})` : ''}
                              </span>
                            </div>
                            <h3 className="font-bold text-sm text-foreground">{s.titre}</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                              {s.contenu}
                            </p>
                          </div>
                        );
                      })}
                      {seancesList.length === 0 && (
                        <div className="p-8 text-center text-muted-foreground italic bg-muted/10 rounded-xl border border-dashed">
                          Aucune séance enregistrée pour le moment.
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── POINTAGE ENSEIGNANT ── */}
          <TabsContent value="pointage" className="mt-5 space-y-4">
            <div className="grid md:grid-cols-3 gap-5">
              {/* Actions de Pointage */}
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" /> Enregistrer mon Pointage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    Enregistrez votre présence journalière d'arrivée et de départ pour le suivi administratif.
                  </p>
                  
                  <div className="p-4 border border-dashed rounded-xl bg-muted/30">
                    <p className="text-2xl font-bold font-mono text-primary">
                      {new Date().toLocaleDateString('fr-FR')}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">Aujourd'hui</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 py-2">
                    <div className="p-2.5 border rounded-lg bg-muted/20">
                      <p className="text-xs font-semibold text-muted-foreground">Arrivée</p>
                      <p className="text-sm font-bold font-mono text-foreground mt-1">
                        {pointageToday?.heure_arrivee || '—:—'}
                      </p>
                    </div>
                    <div className="p-2.5 border rounded-lg bg-muted/20">
                      <p className="text-xs font-semibold text-muted-foreground">Départ</p>
                      <p className="text-sm font-bold font-mono text-foreground mt-1">
                        {pointageToday?.heure_depart || '—:—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      className="flex-1 gap-1.5" 
                      onClick={handleClockIn} 
                      disabled={!!pointageToday?.heure_arrivee}
                    >
                      🚪 Arrivée
                    </Button>
                    <Button 
                      className="flex-1 gap-1.5" 
                      onClick={handleClockOut} 
                      disabled={!pointageToday?.heure_arrivee || !!pointageToday?.heure_depart}
                      variant="outline"
                    >
                      🚪 Départ
                    </Button>
                  </div>
                  
                  {pointageToday && (
                    <Badge variant={pointageToday.statut === 'retard' ? 'destructive' : 'secondary'} className={`mt-2 text-xs font-semibold ${pointageToday.statut !== 'retard' ? 'bg-green-100 text-green-700' : ''}`}>
                      Statut: {pointageToday.statut === 'retard' ? 'En Retard' : 'Présent'}
                    </Badge>
                  )}
                </CardContent>
              </Card>

              {/* Historique Personnel de Pointage */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" /> Historique de mes pointages
                    </span>
                    <Badge variant="secondary">{pointagesList.length} jours</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[500px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border bg-muted/40 font-medium">
                        <tr>
                          <th className="text-left p-3 font-semibold">Date</th>
                          <th className="text-center p-3 font-semibold">Heure Arrivée</th>
                          <th className="text-center p-3 font-semibold">Heure Départ</th>
                          <th className="text-center p-3 font-semibold">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pointagesList.map((p, index) => (
                          <tr key={p.id || index} className="border-b border-border hover:bg-muted/20">
                            <td className="p-3 text-left font-medium">
                              {new Date(p.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-green-600">
                              {p.heure_arrivee || '—'}
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-blue-600">
                              {p.heure_depart || '—'}
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant={p.statut === 'retard' ? 'destructive' : 'secondary'} className={`text-[10px] font-bold ${p.statut !== 'retard' ? 'bg-green-100 text-green-700' : ''}`}>
                                {p.statut === 'retard' ? 'Retard' : 'Présent'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                        {pointagesList.length === 0 && (
                          <tr>
                            <td colSpan={4} className="text-center p-8 text-muted-foreground italic">
                              Aucun pointage enregistré.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal Nouveau Devoir */}
      <Dialog open={showNewDevoirModal} onOpenChange={setShowNewDevoirModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />Nouveau devoir / évaluation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Titre *</Label>
              <Input className="mt-1" placeholder="Ex: Exercices — Équations" value={newDevoir.titre} onChange={e => setNewDevoir(p => ({...p, titre: e.target.value}))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Classe</Label>
                <Select value={newDevoir.classe} onValueChange={v => setNewDevoir(p => ({...p, classe: v}))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {classes.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={newDevoir.type} onValueChange={v => setNewDevoir(p => ({...p, type: v}))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="devoir">Devoir</SelectItem>
                    <SelectItem value="interrogation">Interrogation</SelectItem>
                    <SelectItem value="composition">Composition</SelectItem>
                    <SelectItem value="tp">TP / Pratique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Date de remise</Label>
              <Input type="date" className="mt-1" value={newDevoir.dateRemise} onChange={e => setNewDevoir(p => ({...p, dateRemise: e.target.value}))} />
            </div>
            <div>
              <Label>Description / Consignes</Label>
              <Textarea className="mt-1" rows={3} placeholder="Instructions pour les élèves..." value={newDevoir.description} onChange={e => setNewDevoir(p => ({...p, description: e.target.value}))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDevoirModal(false)}>Annuler</Button>
            <Button onClick={handleCreateDevoir} className="gap-1"><Save className="h-4 w-4" />Créer le devoir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Nouveau Message */}
      <Dialog open={showMessageModal} onOpenChange={setShowMessageModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-primary" />Nouveau message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Destinataire</Label>
              <Select defaultValue="direction">
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="direction">Direction</SelectItem>
                  <SelectItem value="collègue">Collègue enseignant</SelectItem>
                  <SelectItem value="parent">Parent d'élève</SelectItem>
                  <SelectItem value="surveillance">Surveillance générale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Objet</Label>
              <Input className="mt-1" placeholder="Objet du message..." />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea className="mt-1" rows={5} placeholder="Votre message..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMessageModal(false)}>Annuler</Button>
            <Button onClick={() => setShowMessageModal(false)} className="gap-1"><Send className="h-4 w-4" />Envoyer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
