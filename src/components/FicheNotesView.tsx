import React, { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Download, FileText, Search, Award, BarChart2, CheckCircle2, TrendingUp, Sparkles, ClipboardList, Layers, SlidersHorizontal } from 'lucide-react';
import { formatStudentName } from '@/lib/index';
import { printDocument } from '@/lib/printDocument';
import { resolveNiveauSerieFromClasse, getCoefficientMatiere } from '@/lib/matieresConfig';
import {
  exportFicheNotesOfficialPdf,
  exportFicheNotesOfficialExcel,
  exportFicheSuiviNotesDevoirsPdf,
  exportFicheSuiviNotesDevoirsExcel,
  exportFicheStatistiqueMatierePdf,
  exportFicheStatistiqueMatiereExcel,
  exportFicheProfilConseilClassePdf,
  exportFicheProfilConseilClasseExcel,
  buildFicheNotesOfficialHtml,
  buildFicheSuiviNotesDevoirsHtml,
  buildFicheStatistiqueMatiereHtml,
  buildFicheProfilConseilClasseHtml,
} from '@/lib/gradeDocuments';

interface FicheNotesViewProps {
  classes: any[];
  subjects: any[];
  students: any[];
  evaluations: any[];
  teacher: any;
  selectedClassId: string;
  onClassChange: (id: string) => void;
  selectedSubjectId?: string;
  onSubjectChange?: (id: string) => void;
}

export function FicheNotesView({
  classes,
  subjects,
  students,
  evaluations,
  teacher,
  selectedClassId,
  onClassChange,
  selectedSubjectId,
  onSubjectChange,
}: FicheNotesViewProps) {
  const [viewMode, setViewMode] = useState<'pv' | 'fiche_note' | 'fiche_suivi' | 'statistique' | 'conseil_classe'>('fiche_note');
  const [selectedTrimestre, setSelectedTrimestre] = useState<string>('1');
  const [selectedDevoirNum, setSelectedDevoirNum] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const printCardRef = useRef<HTMLDivElement>(null);

  const schoolDisplayName = useMemo(() => {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('user_ecole_name') || localStorage.getItem('user_school_name') || localStorage.getItem('school_name');
      if (stored && stored !== 'undefined' && stored !== 'null' && stored.trim()) return stored.trim();
      const code = localStorage.getItem('user_ecole_code');
      if (code && code !== 'undefined' && code !== 'null' && code.trim()) return `Établissement ${code.trim()}`;
    }
    return teacher?.schoolName || 'Établissement Scolaire';
  }, [teacher]);

  const currentClass = classes.find(c => String(c.id) === String(selectedClassId));
  const classStudents = useMemo(() => {
    return students.filter(s => String(s.classId) === String(selectedClassId));
  }, [students, selectedClassId]);

  // Evaluations matching class and trimester
  const classEvals = useMemo(() => {
    return evaluations.filter(ev => {
      const matchClass = String(ev.classId) === String(selectedClassId);
      const matchTrim = selectedTrimestre === 'all' || String(ev.trimester) === String(selectedTrimestre);
      return matchClass && matchTrim;
    });
  }, [evaluations, selectedClassId, selectedTrimestre]);

  // List of distinct devoirs
  const distinctDevoirs = useMemo(() => {
    const map = new Map<string, { num: string; date: string; type: string; coeff: number; matiere: string }>();
    classEvals.forEach(ev => {
      if (ev.devoir_numero && !map.has(ev.devoir_numero)) {
        map.set(ev.devoir_numero, {
          num: ev.devoir_numero,
          date: ev.date ? new Date(ev.date).toLocaleDateString('fr-FR') : '',
          type: ev.type || 'Devoir',
          coeff: Number(ev.coefficient) || 1,
          matiere: ev.matiere || 'Matière'
        });
      }
    });
    return Array.from(map.values());
  }, [classEvals]);

  // Active devoir info
  const activeDevoirInfo = useMemo(() => {
    if (selectedDevoirNum === 'all' && distinctDevoirs.length > 0) {
      return distinctDevoirs[0];
    }
    return distinctDevoirs.find(d => d.num === selectedDevoirNum) || distinctDevoirs[0];
  }, [distinctDevoirs, selectedDevoirNum]);

  // Coefficient de la matière au niveau/série de la classe (Paramètres >
  // Matières & Coefficients) — distinct du coefficient du devoir affiché
  // dans le PV ("Pondérée Ã—N"), qui pondère un seul devoir au sein de la
  // matière. Sert d'en-tête "COEFFICIENT" pour la Fiche de Note officielle,
  // à l'image du bulletin de fin de trimestre.
  const activeSubjectName = activeDevoirInfo?.matiere || teacher?.matiere || '';
  const matiereCoefficient = useMemo(() => {
    if (!activeSubjectName || !currentClass) return undefined;
    const { niveauCode, serie } = resolveNiveauSerieFromClasse(currentClass);
    return niveauCode ? getCoefficientMatiere(activeSubjectName, niveauCode, serie) : undefined;
  }, [activeSubjectName, currentClass]);

  // Compute student grades for selected evaluation
  const studentRows = useMemo(() => {
    const targetDevoir = selectedDevoirNum === 'all' ? (activeDevoirInfo?.num || '') : selectedDevoirNum;
    const targetEvals = classEvals.filter(ev => ev.devoir_numero === targetDevoir);

    const rows = classStudents.map((s, idx) => {
      const ev = targetEvals.find(e => String(e.studentId) === String(s.id));
      const rawNote = ev ? Number(ev.note) : 0;
      const hasNote = ev !== undefined && ev.note !== null && ev.note !== undefined;
      const coeff = activeDevoirInfo?.coeff || 1;
      const notePonderee = rawNote * coeff;

      let appreciation = ev?.appreciation || '';
      if (!appreciation && hasNote) {
        if (rawNote >= 18) appreciation = "Excellent";
        else if (rawNote >= 16) appreciation = "Très bien";
        else if (rawNote >= 14) appreciation = "Bien";
        else if (rawNote >= 12) appreciation = "Assez bien";
        else if (rawNote >= 10) appreciation = "Passable";
        else if (rawNote >= 8) appreciation = "Insuffisant";
        else if (rawNote > 0) appreciation = "Très insuffisant";
      }

      return {
        id: s.id,
        num: idx + 1,
        matricule: s.matricule || `HE${s.id}`,
        name: formatStudentName(s),
        gender: s.gender || 'M',
        note: rawNote,
        hasNote,
        notePonderee,
        appreciation,
        statut: rawNote >= 10 ? 'Admis' : (rawNote > 0 ? 'Non admis' : 'Non évalué')
      };
    });

    // Compute ranks among graded students
    const sortedGraded = [...rows.filter(r => r.hasNote && r.note > 0)].sort((a, b) => b.note - a.note);
    return rows.map(r => {
      if (!r.hasNote || r.note === 0) return { ...r, rang: '—' };
      const rankIdx = sortedGraded.findIndex(g => g.id === r.id);
      const rang = rankIdx >= 0 ? `${rankIdx + 1}${rankIdx === 0 ? 'er' : 'e'}` : '—';
      return { ...r, rang };
    });
  }, [classStudents, classEvals, selectedDevoirNum, activeDevoirInfo]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return studentRows;
    const q = search.toLowerCase();
    return studentRows.filter(r => r.name.toLowerCase().includes(q) || r.matricule.toLowerCase().includes(q));
  }, [studentRows, search]);

  // Statistics
  const stats = useMemo(() => {
    const graded = studentRows.filter(r => r.hasNote && r.note > 0);
    const totalCount = studentRows.length;
    const gradedCount = graded.length;
    const notes = graded.map(r => r.note);

    const sum = notes.reduce((a, b) => a + b, 0);
    const avg = gradedCount > 0 ? sum / gradedCount : 0;
    const max = gradedCount > 0 ? Math.max(...notes) : 0;
    const min = gradedCount > 0 ? Math.min(...notes) : 0;
    const passCount = notes.filter(n => n >= 10).length;
    const successRate = gradedCount > 0 ? (passCount / gradedCount) * 100 : 0;

    return { totalCount, gradedCount, avg, max, min, passCount, successRate };
  }, [studentRows]);

  const handlePrint = () => {
    printDocument(printCardRef.current, `Fiche_Notes_${currentClass?.name || 'Classe'}_${activeDevoirInfo?.num || 'Devoir'}`, 'portrait');
  };

  const handleExportCSV = () => {
    const headers = ["N°", "Matricule", "Nom et Prénoms", "Sexe", "Note /20", "Note Pondérée", "Rang", "Appréciation", "Statut"];
    const rows = studentRows.map(r => [
      r.num,
      `"${r.matricule}"`,
      `"${r.name}"`,
      r.gender,
      r.note.toFixed(2),
      r.notePonderee.toFixed(2),
      r.rang,
      `"${r.appreciation}"`,
      r.statut
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Fiche_Notes_${currentClass?.name || 'Classe'}_${activeDevoirInfo?.num || 'Devoir'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handlers pour les différents formats d'exportation
  const handleExportPdfByMode = () => {
    if (!currentClass) return;
    const activeSubj = activeDevoirInfo?.matiere || teacher?.matiere || 'Discipline';

    if (viewMode === 'fiche_note') {
      exportFicheNotesOfficialPdf({
        classRoom: currentClass,
        subject: activeSubj,
        coefficient: matiereCoefficient || activeDevoirInfo?.coeff || 1,
        trimester: selectedTrimestre,
        schoolName: schoolDisplayName,
        teacherName: `${teacher?.lastName || ''} ${teacher?.firstName || ''}`.trim(),
        students: classStudents,
        evaluations: classEvals,
      });
    } else if (viewMode === 'fiche_suivi') {
      exportFicheSuiviNotesDevoirsPdf({
        classRoom: currentClass,
        subject: activeSubj,
        trimester: selectedTrimestre,
        schoolName: schoolDisplayName,
        teacherName: `${teacher?.lastName || ''} ${teacher?.firstName || ''}`.trim(),
        students: classStudents,
        evaluations: classEvals,
      });
    } else if (viewMode === 'statistique') {
      exportFicheStatistiqueMatierePdf({
        classRoom: currentClass,
        subject: activeSubj,
        trimester: selectedTrimestre,
        schoolName: schoolDisplayName,
        teacherName: `${teacher?.lastName || ''} ${teacher?.firstName || ''}`.trim(),
        students: classStudents,
        evaluations: classEvals,
      });
    } else if (viewMode === 'conseil_classe') {
      exportFicheProfilConseilClassePdf({
        classRoom: currentClass,
        trimester: selectedTrimestre,
        schoolName: schoolDisplayName,
        profPrincipal: `${teacher?.lastName || ''} ${teacher?.firstName || ''}`.trim(),
        students: classStudents,
        evaluations: classEvals,
      });
    } else {
      handlePrint();
    }
  };

  const handleExportExcelByMode = () => {
    if (!currentClass) return;
    const activeSubj = activeDevoirInfo?.matiere || teacher?.matiere || 'Discipline';

    if (viewMode === 'fiche_note') {
      exportFicheNotesOfficialExcel({
        classRoom: currentClass,
        subject: activeSubj,
        coefficient: matiereCoefficient || activeDevoirInfo?.coeff || 1,
        trimester: selectedTrimestre,
        schoolName: schoolDisplayName,
        teacherName: `${teacher?.lastName || ''} ${teacher?.firstName || ''}`.trim(),
        students: classStudents,
        evaluations: classEvals,
      });
    } else if (viewMode === 'fiche_suivi') {
      exportFicheSuiviNotesDevoirsExcel({
        classRoom: currentClass,
        subject: activeSubj,
        trimester: selectedTrimestre,
        schoolName: schoolDisplayName,
        teacherName: `${teacher?.lastName || ''} ${teacher?.firstName || ''}`.trim(),
        students: classStudents,
        evaluations: classEvals,
      });
    } else if (viewMode === 'statistique') {
      exportFicheStatistiqueMatiereExcel({
        classRoom: currentClass,
        subject: activeSubj,
        trimester: selectedTrimestre,
        schoolName: schoolDisplayName,
        teacherName: `${teacher?.lastName || ''} ${teacher?.firstName || ''}`.trim(),
        students: classStudents,
        evaluations: classEvals,
      });
    } else if (viewMode === 'conseil_classe') {
      exportFicheProfilConseilClasseExcel({
        classRoom: currentClass,
        trimester: selectedTrimestre,
        schoolName: schoolDisplayName,
        profPrincipal: `${teacher?.lastName || ''} ${teacher?.firstName || ''}`.trim(),
        students: classStudents,
        evaluations: classEvals,
      });
    } else {
      handleExportCSV();
    }
  };

  // Extraire les données pour la Fiche de Note Officielle (N1..N5)
  const officialGradeRows = useMemo(() => {
    const coeff = matiereCoefficient || activeDevoirInfo?.coeff || 1;
    const rows = classStudents.map((s, idx) => {
      const studentEvals = classEvals.filter(e => String(e.studentId) === String(s.id));
      const n1 = studentEvals[0]?.note !== undefined && studentEvals[0]?.note !== null ? Number(studentEvals[0].note) : null;
      const n2 = studentEvals[1]?.note !== undefined && studentEvals[1]?.note !== null ? Number(studentEvals[1].note) : null;
      const n3 = studentEvals[2]?.note !== undefined && studentEvals[2]?.note !== null ? Number(studentEvals[2].note) : null;
      const n4 = studentEvals[3]?.note !== undefined && studentEvals[3]?.note !== null ? Number(studentEvals[3].note) : null;
      const n5 = studentEvals[4]?.note !== undefined && studentEvals[4]?.note !== null ? Number(studentEvals[4].note) : null;

      const validNotes = [n1, n2, n3, n4, n5].filter((n): n is number => n !== null);
      const avg = validNotes.length > 0 ? validNotes.reduce((a, b) => a + b, 0) / validNotes.length : null;
      const avgCoef = avg !== null ? avg * coeff : null;

      return {
        index: idx + 1,
        id: s.id,
        name: formatStudentName(s),
        matricule: s.matricule || s.id || '',
        n1, n2, n3, n4, n5,
        avg: avg !== null ? avg : -1,
        avgCoef,
        rank: ''
      };
    });

    const sorted = [...rows].filter(r => r.avg >= 0).sort((a, b) => b.avg - a.avg);
    sorted.forEach((item, rIdx) => {
      const orig = rows.find(r => r.id === item.id);
      if (orig) orig.rank = rIdx === 0 ? '1er' : `${rIdx + 1}e`;
    });

    return rows.filter(r => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return r.name.toLowerCase().includes(q) || String(r.matricule).toLowerCase().includes(q);
    });
  }, [classStudents, classEvals, activeDevoirInfo, matiereCoefficient, search]);

  // Extraire les données pour la Fiche de Suivi (I1..I5 + DEV1..DEV4)
  const trackingRows = useMemo(() => {
    const rows = classStudents.map((s, idx) => {
      const evals = classEvals.filter(e => String(e.studentId) === String(s.id));
      const interros = evals.filter(e => (e.type || '').toLowerCase().includes('interro') || (e.type || '').toLowerCase().includes('i'));
      const devoirs = evals.filter(e => (e.type || '').toLowerCase().includes('devoir') || (e.type || '').toLowerCase().includes('dev') || !(e.type || '').toLowerCase().includes('interro'));

      const i1 = interros[0]?.note !== undefined && interros[0]?.note !== null ? Number(interros[0].note) : null;
      const i2 = interros[1]?.note !== undefined && interros[1]?.note !== null ? Number(interros[1].note) : null;
      const i3 = interros[2]?.note !== undefined && interros[2]?.note !== null ? Number(interros[2].note) : null;
      const i4 = interros[3]?.note !== undefined && interros[3]?.note !== null ? Number(interros[3].note) : null;
      const i5 = interros[4]?.note !== undefined && interros[4]?.note !== null ? Number(interros[4].note) : null;

      const d1 = devoirs[0]?.note !== undefined && devoirs[0]?.note !== null ? Number(devoirs[0].note) : null;
      const d2 = devoirs[1]?.note !== undefined && devoirs[1]?.note !== null ? Number(devoirs[1].note) : null;
      const d3 = devoirs[2]?.note !== undefined && devoirs[2]?.note !== null ? Number(devoirs[2].note) : null;
      const d4 = devoirs[3]?.note !== undefined && devoirs[3]?.note !== null ? Number(devoirs[3].note) : null;

      const allNotes = [...interros, ...devoirs].map(e => Number(e.note)).filter(n => !isNaN(n));
      const avg = allNotes.length > 0 ? allNotes.reduce((a, b) => a + b, 0) / allNotes.length : null;

      return {
        index: idx + 1,
        id: s.id,
        name: formatStudentName(s),
        i1, i2, i3, i4, i5,
        d1, d2, d3, d4,
        avg: avg !== null ? avg : -1,
        rank: ''
      };
    });

    const sorted = [...rows].filter(r => r.avg >= 0).sort((a, b) => b.avg - a.avg);
    sorted.forEach((item, rIdx) => {
      const orig = rows.find(r => r.id === item.id);
      if (orig) orig.rank = rIdx === 0 ? '1er' : `${rIdx + 1}e`;
    });

    return rows.filter(r => {
      if (!search.trim()) return true;
      return r.name.toLowerCase().includes(search.toLowerCase());
    });
  }, [classStudents, classEvals, search]);

  // Données statistiques par matière / classe
  const statMetrics = useMemo(() => {
    const studentAverages: { name: string; avg: number }[] = [];
    let nonClasses = 0;

    classStudents.forEach(s => {
      const evals = classEvals.filter(e => String(e.studentId) === String(s.id));
      const validNotes = evals.map(e => Number(e.note)).filter(n => !isNaN(n));
      if (validNotes.length > 0) {
        studentAverages.push({
          name: formatStudentName(s),
          avg: validNotes.reduce((a, b) => a + b, 0) / validNotes.length
        });
      } else {
        nonClasses++;
      }
    });

    const total = classStudents.length;
    const graded = studentAverages.length;
    const sup10 = studentAverages.filter(s => s.avg >= 10).length;
    const betw85_10 = studentAverages.filter(s => s.avg >= 8.5 && s.avg < 10).length;
    const inf85 = studentAverages.filter(s => s.avg < 8.5).length;

    const sorted = [...studentAverages].sort((a, b) => b.avg - a.avg);
    const max = sorted[0] || null;
    const min = sorted[sorted.length - 1] || null;
    const classAvg = graded > 0 ? (studentAverages.reduce((acc, s) => acc + s.avg, 0) / graded) : 0;

    return {
      total,
      graded,
      nonClasses,
      sup10,
      betw85_10,
      inf85,
      pctSup10: graded > 0 ? ((sup10 / graded) * 100).toFixed(2) : '0.00',
      pctBetw: graded > 0 ? ((betw85_10 / graded) * 100).toFixed(2) : '0.00',
      pctInf85: graded > 0 ? ((inf85 / graded) * 100).toFixed(2) : '0.00',
      max,
      min,
      classAvg: classAvg.toFixed(2)
    };
  }, [classStudents, classEvals]);

  return (
    <div className="space-y-6">
      {/* ── SÉLECTEUR DE FORMAT / MODÈLE DU DOSSIER MAJ ── */}
      <div className="bg-white via-sky-50/50 to-background p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/40 flex flex-wrap items-center justify-between gap-2 shadow-xs print:hidden">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant={viewMode === 'fiche_note' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('fiche_note')}
            className={`text-xs font-bold gap-1.5 h-8.5 ${viewMode === 'fiche_note' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
          >
            <FileText className="h-3.5 w-3.5" />
            Fiche de Note (N1-N5)
          </Button>

          <Button
            variant={viewMode === 'fiche_suivi' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('fiche_suivi')}
            className={`text-xs font-bold gap-1.5 h-8.5 ${viewMode === 'fiche_suivi' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Fiche de Suivi (I1-I5 + DEV1-4)
          </Button>

          <Button
            variant={viewMode === 'statistique' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('statistique')}
            className={`text-xs font-bold gap-1.5 h-8.5 ${viewMode === 'statistique' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            Fiche Statistique
          </Button>

          <Button
            variant={viewMode === 'conseil_classe' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('conseil_classe')}
            className={`text-xs font-bold gap-1.5 h-8.5 ${viewMode === 'conseil_classe' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
          >
            <Award className="h-3.5 w-3.5" />
            Profil Conseil de Classe
          </Button>

          <Button
            variant={viewMode === 'pv' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('pv')}
            className={`text-xs font-bold gap-1.5 h-8.5 ${viewMode === 'pv' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
          >
            <Layers className="h-3.5 w-3.5" />
            PV Standard (Par Devoir)
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcelByMode} className="text-xs font-semibold gap-1.5 h-8.5 border-blue-300 text-blue-800 dark:text-blue-300 hover:bg-blue-50">
            <Download className="h-3.5 w-3.5 text-blue-600" /> Export Excel
          </Button>
          <Button size="sm" onClick={handleExportPdfByMode} className="text-xs font-bold gap-1.5 h-8.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
            <Printer className="h-3.5 w-3.5" /> Imprimer / PDF
          </Button>
        </div>
      </div>

      {/* ── BARRE DE FILTRES ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 rounded-lg border border-border shadow-xs print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Classe</span>
            <Select value={selectedClassId} onValueChange={onClassChange}>
              <SelectTrigger className="w-40 font-semibold h-9"><SelectValue placeholder="Choisir classe" /></SelectTrigger>
              <SelectContent>
                {classes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Trimestre</span>
            <Select value={selectedTrimestre} onValueChange={setSelectedTrimestre}>
              <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Trimestre" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1er Trimestre</SelectItem>
                <SelectItem value="2">2ème Trimestre</SelectItem>
                <SelectItem value="3">3ème Trimestre</SelectItem>
                <SelectItem value="all">Tous trimestres</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {viewMode === 'pv' && (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Évaluation / Devoir</span>
              <Select value={selectedDevoirNum} onValueChange={setSelectedDevoirNum}>
                <SelectTrigger className="w-56 h-9"><SelectValue placeholder="Choisir devoir" /></SelectTrigger>
                <SelectContent>
                  {distinctDevoirs.map(d => (
                    <SelectItem key={d.num} value={d.num}>
                      {d.num} — {d.type} (Ã—{d.coeff})
                    </SelectItem>
                  ))}
                  {distinctDevoirs.length === 0 && <SelectItem value="all">Aucun devoir enregistré</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recherche</span>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Filtrer élève..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-9 text-xs w-44"
              />
            </div>
          </div>
        </div>

        {/* Badge récapitulatif du document actif */}
        <Badge variant="outline" className="text-xs font-bold py-1 px-2.5 border-blue-200 text-blue-900 bg-blue-50/60 dark:bg-slate-900">
          Modèle actif : {viewMode === 'fiche_note' ? 'Fiche de Note N1-N5' : viewMode === 'fiche_suivi' ? 'Fiche de Suivi Interros/Devoirs' : viewMode === 'statistique' ? 'Fiche Statistique Matière' : viewMode === 'conseil_classe' ? 'Fiche Profil Conseil' : 'PV Devoir'}
        </Badge>
      </div>

      {/* ── RENDU DYNAMIQUE DU DOCUMENT SÉLECTIONNÉ ── */}

      {/* 1. VUE : FICHE DE NOTE OFFICIELLE (N1..N5, Moy., Moy. Coef, Rang) */}
      {viewMode === 'fiche_note' && (
        <Card className="border-border shadow-sm bg-card">
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="text-center border-2 border-primary/40 bg-primary/5 p-3 rounded-lg">
              <h2 className="text-base font-extrabold uppercase tracking-wide text-primary">
                FICHE DE NOTE — {currentClass?.name?.toUpperCase() || 'CLASSE'}
              </h2>
            </div>

            <div className="flex flex-wrap items-center justify-between text-xs font-semibold bg-muted/60 p-3 rounded-lg gap-2 border">
              <div>
                <span>CLASSE : <strong className="text-primary">{currentClass?.name}</strong></span> &nbsp;|&nbsp;
                <span>TRIMESTRE : <strong>{selectedTrimestre}</strong></span> &nbsp;|&nbsp;
                <span>MATIÈRE : <strong>{activeDevoirInfo?.matiere || teacher?.matiere || 'Discipline'}</strong></span> &nbsp;|&nbsp;
                <span>COEFFICIENT : <strong>{matiereCoefficient || activeDevoirInfo?.coeff || 1}</strong></span>
              </div>
              <div>
                <span>PROFESSEUR : <strong>{teacher?.lastName} {teacher?.firstName}</strong></span> &nbsp;|&nbsp;
                <span>CONTACTS : <strong>{teacher?.phone || 'N/A'}</strong></span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-border">
                <thead>
                  <tr className="bg-slate-900 text-white text-center font-bold">
                    <th className="py-2 px-2 w-10">N°</th>
                    <th className="py-2 px-3 text-left">NOM ET PRÉNOMS</th>
                    <th className="py-2 px-2 w-28 font-mono">MAT.</th>
                    <th className="py-2 px-2 w-12 bg-slate-800">N1</th>
                    <th className="py-2 px-2 w-12 bg-slate-800">N2</th>
                    <th className="py-2 px-2 w-12 bg-slate-800">N3</th>
                    <th className="py-2 px-2 w-12 bg-slate-800">N4</th>
                    <th className="py-2 px-2 w-12 bg-slate-800">N5</th>
                    <th className="py-2 px-2 w-16 bg-slate-950 text-gray-300">MOY.</th>
                    <th className="py-2 px-2 w-20 bg-blue-950 text-blue-200">MOY. COEF</th>
                    <th className="py-2 px-2 w-16 bg-blue-800 text-white">RANG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {officialGradeRows.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="py-2 px-2 text-center font-bold text-muted-foreground">{r.index}</td>
                      <td className="py-2 px-3 font-semibold text-foreground">{r.name}</td>
                      <td className="py-2 px-2 text-center font-mono text-muted-foreground text-[11px]">{r.matricule}</td>
                      <td className="py-2 px-2 text-center font-mono">{r.n1 !== null ? r.n1.toFixed(2) : '—'}</td>
                      <td className="py-2 px-2 text-center font-mono">{r.n2 !== null ? r.n2.toFixed(2) : '—'}</td>
                      <td className="py-2 px-2 text-center font-mono">{r.n3 !== null ? r.n3.toFixed(2) : '—'}</td>
                      <td className="py-2 px-2 text-center font-mono">{r.n4 !== null ? r.n4.toFixed(2) : '—'}</td>
                      <td className="py-2 px-2 text-center font-mono">{r.n5 !== null ? r.n5.toFixed(2) : '—'}</td>
                      <td className="py-2 px-2 text-center font-mono font-bold bg-muted/30 text-primary">
                        {r.avg >= 0 ? r.avg.toFixed(2) : '—'}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-bold bg-blue-50/50 dark:bg-slate-900 text-blue-900 dark:text-blue-200">
                        {r.avgCoef !== null ? r.avgCoef.toFixed(2) : '—'}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-bold text-blue-700 dark:text-blue-400">
                        {r.rank || '—'}
                      </td>
                    </tr>
                  ))}
                  {officialGradeRows.length === 0 && (
                    <tr><td colSpan={11} className="text-center py-6 text-muted-foreground italic">Aucun élève trouvé.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t flex items-end justify-between text-xs">
              <p className="text-muted-foreground font-medium">Fait le {new Date().toLocaleDateString('fr-FR')}</p>
              <div className="text-center pr-8">
                <p className="font-bold text-foreground">Signature Professeur</p>
                <div className="h-10 border-b border-border w-36 mt-1 mx-auto"></div>
                <p className="text-[10px] text-muted-foreground mt-1">{teacher?.lastName} {teacher?.firstName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. VUE : FICHE DE SUIVI DES NOTES ET DEVOIRS (I1..I5 + DEV1..DEV4) */}
      {viewMode === 'fiche_suivi' && (
        <Card className="border-border shadow-sm bg-card">
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="text-center border-b pb-3">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">{schoolDisplayName}</p>
              <h2 className="text-base font-extrabold uppercase tracking-wide text-foreground mt-1">
                FICHE DE SUIVI DES NOTES ET DEVOIRS
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Classe : <strong>{currentClass?.name}</strong> &nbsp;|&nbsp; Matière : <strong>{activeDevoirInfo?.matiere || teacher?.matiere || 'Discipline'}</strong> &nbsp;|&nbsp; Trimestre : <strong>{selectedTrimestre}</strong>
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-border">
                <thead>
                  <tr className="bg-slate-900 text-white text-center font-bold">
                    <th className="py-2.5 px-2 w-10">N°</th>
                    <th className="py-2.5 px-3 text-left">NOM ET PRÉNOMS</th>
                    <th className="py-2.5 px-2 w-12 bg-slate-800">I1</th>
                    <th className="py-2.5 px-2 w-12 bg-slate-800">I2</th>
                    <th className="py-2.5 px-2 w-12 bg-slate-800">I3</th>
                    <th className="py-2.5 px-2 w-12 bg-slate-800">I4</th>
                    <th className="py-2.5 px-2 w-12 bg-slate-800">I5</th>
                    <th className="py-2.5 px-2 w-14 bg-blue-950 text-blue-200">DEV 1</th>
                    <th className="py-2.5 px-2 w-14 bg-blue-950 text-blue-200">DEV 2</th>
                    <th className="py-2.5 px-2 w-14 bg-blue-950 text-blue-200">DEV 3</th>
                    <th className="py-2.5 px-2 w-14 bg-blue-950 text-blue-200">DEV 4</th>
                    <th className="py-2.5 px-2 w-16 bg-slate-950 text-gray-300">MOYENNE</th>
                    <th className="py-2.5 px-2 w-16 bg-blue-800 text-white">RANG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {trackingRows.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="py-2 px-2 text-center font-bold text-muted-foreground">{r.index}</td>
                      <td className="py-2 px-3 font-semibold text-foreground">{r.name}</td>
                      <td className="py-2 px-2 text-center font-mono">{r.i1 !== null ? r.i1.toFixed(2) : '—'}</td>
                      <td className="py-2 px-2 text-center font-mono">{r.i2 !== null ? r.i2.toFixed(2) : '—'}</td>
                      <td className="py-2 px-2 text-center font-mono">{r.i3 !== null ? r.i3.toFixed(2) : '—'}</td>
                      <td className="py-2 px-2 text-center font-mono">{r.i4 !== null ? r.i4.toFixed(2) : '—'}</td>
                      <td className="py-2 px-2 text-center font-mono">{r.i5 !== null ? r.i5.toFixed(2) : '—'}</td>
                      <td className="py-2 px-2 text-center font-mono font-medium bg-muted/20">{r.d1 !== null ? r.d1.toFixed(2) : '—'}</td>
                      <td className="py-2 px-2 text-center font-mono font-medium bg-muted/20">{r.d2 !== null ? r.d2.toFixed(2) : '—'}</td>
                      <td className="py-2 px-2 text-center font-mono font-medium bg-muted/20">{r.d3 !== null ? r.d3.toFixed(2) : '—'}</td>
                      <td className="py-2 px-2 text-center font-mono font-medium bg-muted/20">{r.d4 !== null ? r.d4.toFixed(2) : '—'}</td>
                      <td className="py-2 px-2 text-center font-mono font-bold bg-muted/40 text-primary">
                        {r.avg >= 0 ? r.avg.toFixed(2) : '—'}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-bold text-blue-700 dark:text-blue-400">
                        {r.rank || '—'}
                      </td>
                    </tr>
                  ))}
                  {trackingRows.length === 0 && (
                    <tr><td colSpan={13} className="text-center py-6 text-muted-foreground italic">Aucun élève trouvé.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t flex items-end justify-between text-xs">
              <p className="text-muted-foreground font-medium">Date d'édition : {new Date().toLocaleDateString('fr-FR')}</p>
              <div className="text-center pr-8">
                <p className="font-bold text-foreground">Visa Direction des Études</p>
                <div className="h-10 border-b border-border w-36 mt-1 mx-auto"></div>
                <p className="text-[10px] text-muted-foreground mt-1">(Signature & Cachet)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. VUE : FICHE STATISTIQUE MATIÈRE */}
      {viewMode === 'statistique' && (
        <Card className="border-border shadow-sm bg-card max-w-4xl mx-auto">
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="text-center border-b pb-3">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">{schoolDisplayName}</p>
              <p className="text-xs font-semibold text-muted-foreground">TRIMESTRE {selectedTrimestre}</p>
              <h2 className="text-lg font-extrabold uppercase tracking-wide text-foreground mt-1">
                FICHE STATISTIQUE DE LA MATIÈRE
              </h2>
            </div>

            <div className="bg-muted/50 p-3.5 rounded-lg border text-xs space-y-1">
              <div><strong>PROFESSEUR :</strong> {teacher?.lastName} {teacher?.firstName} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>MATIÈRE :</strong> {activeDevoirInfo?.matiere || teacher?.matiere || 'Discipline'} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>CLASSE :</strong> {currentClass?.name}</div>
              <div><strong>EFFECTIF TOTAL :</strong> {statMetrics.total} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>CLASSÉ(S) :</strong> {statMetrics.graded} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>NON CLASSÉ(S) :</strong> {statMetrics.nonClasses}</div>
            </div>

            {/* Tableau des tranches de notes */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-center border-collapse border border-border">
                <thead>
                  <tr>
                    <th colSpan={2} className="py-2.5 px-3 bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold border border-border w-1/3">
                      MOY â‰¥ 10
                    </th>
                    <th colSpan={2} className="py-2.5 px-3 bg-gray-100 dark:bg-gray-950/60 text-gray-900 dark:text-gray-200 font-bold border border-border w-1/3">
                      10 &gt; MOY â‰¥ 08.50
                    </th>
                    <th colSpan={2} className="py-2.5 px-3 bg-gray-100 dark:bg-gray-950/60 text-gray-900 dark:text-gray-200 font-bold border border-border w-1/3">
                      MOY &lt; 08.50
                    </th>
                  </tr>
                  <tr className="bg-muted/80 font-bold border border-border">
                    <th className="py-1.5 border border-border">NOMBRE</th>
                    <th className="py-1.5 border border-border">%</th>
                    <th className="py-1.5 border border-border">NOMBRE</th>
                    <th className="py-1.5 border border-border">%</th>
                    <th className="py-1.5 border border-border">NOMBRE</th>
                    <th className="py-1.5 border border-border">%</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-sm font-bold">
                    <td className="py-3 border border-border font-mono text-blue-600">{statMetrics.sup10}</td>
                    <td className="py-3 border border-border font-mono">{statMetrics.pctSup10}%</td>
                    <td className="py-3 border border-border font-mono text-gray-600">{statMetrics.betw85_10}</td>
                    <td className="py-3 border border-border font-mono">{statMetrics.pctBetw}%</td>
                    <td className="py-3 border border-border font-mono text-destructive">{statMetrics.inf85}</td>
                    <td className="py-3 border border-border font-mono">{statMetrics.pctInf85}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Tableau Max / Min / Moyenne classe */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-center border-collapse border border-border">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold">
                    <th className="py-2.5 px-3 border border-border">MOYENNE LA PLUS FORTE</th>
                    <th className="py-2.5 px-3 border border-border">OBTENUE PAR</th>
                    <th className="py-2.5 px-3 border border-border">MOY LA PLUS FAIBLE</th>
                    <th className="py-2.5 px-3 border border-border">OBTENUE PAR</th>
                    <th className="py-2.5 px-3 border border-border bg-blue-700">MOY CLASSE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-3 border border-border font-mono font-bold text-blue-600 text-sm">
                      {statMetrics.max ? statMetrics.max.avg.toFixed(2) : '—'}
                    </td>
                    <td className="py-3 border border-border font-semibold">{statMetrics.max?.name || '—'}</td>
                    <td className="py-3 border border-border font-mono font-bold text-destructive text-sm">
                      {statMetrics.min ? statMetrics.min.avg.toFixed(2) : '—'}
                    </td>
                    <td className="py-3 border border-border font-semibold">{statMetrics.min?.name || '—'}</td>
                    <td className="py-3 border border-border font-mono font-bold text-primary text-base bg-blue-50/50 dark:bg-slate-900">
                      {statMetrics.classAvg} /20
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="border rounded-lg p-4 bg-muted/20 space-y-2">
              <p className="text-xs font-bold text-foreground uppercase">Appréciation et Suggestions :</p>
              <p className="text-xs text-muted-foreground italic">
                {statMetrics.classAvg >= 10 
                  ? "Bilan positif. Les objectifs pédagogiques sont globalement atteints. Encourager la participation active."
                  : "Résultats mitigés. Des séances de remédiation ciblées sont recommandées pour consolider les acquis."}
              </p>
            </div>

            <div className="pt-4 border-t flex items-end justify-between text-xs">
              <p className="text-muted-foreground font-medium">Édité le {new Date().toLocaleDateString('fr-FR')}</p>
              <div className="text-center pr-8">
                <p className="font-bold text-foreground">Signature du Professeur</p>
                <div className="h-10 border-b border-border w-36 mt-1 mx-auto"></div>
                <p className="text-[10px] text-muted-foreground mt-1">{teacher?.lastName} {teacher?.firstName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. VUE : PROFIL CONSEIL DE CLASSE */}
      {viewMode === 'conseil_classe' && (
        <Card className="border-border shadow-sm bg-card max-w-4xl mx-auto">
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="border-b pb-3">
              <div className="flex items-start justify-between text-[11px] leading-tight">
                <div>
                  <p className="font-bold uppercase text-foreground">MINISTÈRE DE L'ÉDUCATION NATIONALE ET DE L'ALPHABÉTISATION</p>
                  <p className="text-muted-foreground font-medium">DRENA KORHOGO / IEPP KORHOGO-EST</p>
                  <p className="font-bold text-primary mt-0.5">{schoolDisplayName}</p>
                  <p className="text-muted-foreground">ANNÉE SCOLAIRE 2025-2026</p>
                </div>
                <div className="text-right">
                  <p className="font-bold uppercase text-foreground">RÉPUBLIQUE DE CÔTE D'IVOIRE</p>
                  <p className="text-muted-foreground italic">Union - Discipline - Travail</p>
                </div>
              </div>

              <div className="text-center bg-muted/60 border mt-3 py-2 rounded-lg">
                <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground">
                  FICHE PROFIL POUR CONSEIL DE CLASSE — TRIMESTRE {selectedTrimestre}
                </h2>
              </div>
            </div>

            <div className="bg-muted/40 p-3 rounded-lg border text-xs space-y-1">
              <div><strong>PROFESSEUR PRINCIPAL :</strong> {teacher?.lastName} {teacher?.firstName} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>CLASSE :</strong> {currentClass?.name}</div>
              <div><strong>EFFECTIF TOTAL :</strong> {statMetrics.total} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>CLASSÉ(S) :</strong> {statMetrics.graded} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>NON CLASSÉ(S) :</strong> {statMetrics.nonClasses}</div>
            </div>

            {/* 1. Profil de la classe */}
            <div className="border rounded-lg p-3.5 space-y-2 bg-card">
              <p className="text-xs font-bold text-primary uppercase">1. Profil de la classe</p>
              <div className="text-xs space-y-1">
                <p><strong>Le travail :</strong> Bonne dynamique d'apprentissage et assiduité régulière observée.</p>
                <p><strong>La conduite :</strong> Climat serein, respect mutuel et bonne tenue en classe.</p>
              </div>
            </div>

            {/* 2. Statistiques */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-primary uppercase">2. Statistiques des Résultats Scolaires</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-center border-collapse border border-border">
                  <thead>
                    <tr>
                      <th colSpan={2} className="py-2 bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold border border-border w-1/3">MOY â‰¥ 10</th>
                      <th colSpan={2} className="py-2 bg-gray-100 dark:bg-gray-950/60 text-gray-900 dark:text-gray-200 font-bold border border-border w-1/3">10 &gt; MOY â‰¥ 08.50</th>
                      <th colSpan={2} className="py-2 bg-gray-100 dark:bg-gray-950/60 text-gray-900 dark:text-gray-200 font-bold border border-border w-1/3">MOY &lt; 08.50</th>
                    </tr>
                    <tr className="bg-muted/80 font-bold border border-border">
                      <th className="py-1 border border-border">NOMBRE</th><th className="py-1 border border-border">%</th>
                      <th className="py-1 border border-border">NOMBRE</th><th className="py-1 border border-border">%</th>
                      <th className="py-1 border border-border">NOMBRE</th><th className="py-1 border border-border">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-bold text-sm">
                      <td className="py-2.5 border border-border font-mono text-blue-600">{statMetrics.sup10}</td>
                      <td className="py-2.5 border border-border font-mono">{statMetrics.pctSup10}%</td>
                      <td className="py-2.5 border border-border font-mono text-gray-600">{statMetrics.betw85_10}</td>
                      <td className="py-2.5 border border-border font-mono">{statMetrics.pctBetw}%</td>
                      <td className="py-2.5 border border-border font-mono text-destructive">{statMetrics.inf85}</td>
                      <td className="py-2.5 border border-border font-mono">{statMetrics.pctInf85}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="overflow-x-auto mt-2">
                <table className="w-full text-xs text-center border-collapse border border-border">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="py-2 border border-border">MOYENNE LA PLUS FORTE</th>
                      <th className="py-2 border border-border">OBTENUE PAR</th>
                      <th className="py-2 border border-border">MOY LA PLUS FAIBLE</th>
                      <th className="py-2 border border-border">OBTENUE PAR</th>
                      <th className="py-2 border border-border bg-blue-700">MOY CLASSE</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2.5 border border-border font-mono font-bold text-blue-600">{statMetrics.max ? statMetrics.max.avg.toFixed(2) : '—'}</td>
                      <td className="py-2.5 border border-border font-semibold">{statMetrics.max?.name || '—'}</td>
                      <td className="py-2.5 border border-border font-mono font-bold text-destructive">{statMetrics.min ? statMetrics.min.avg.toFixed(2) : '—'}</td>
                      <td className="py-2.5 border border-border font-semibold">{statMetrics.min?.name || '—'}</td>
                      <td className="py-2.5 border border-border font-mono font-bold text-primary bg-blue-50/50 dark:bg-slate-900">{statMetrics.classAvg} /20</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Distinctions */}
            <div className="border rounded-lg p-3.5 space-y-2 bg-card">
              <p className="text-xs font-bold text-primary uppercase">3. Distinctions & Discipline</p>
              <div className="flex flex-wrap gap-6 text-xs">
                <div><strong>Tableaux d'honneur :</strong> <span className="font-bold text-blue-600">{statMetrics.sup10}</span></div>
                <div><strong>Avertissements travail :</strong> <span className="font-bold text-destructive">{statMetrics.inf85}</span></div>
                <div><strong>Blâmes :</strong> <span className="font-bold">0</span></div>
              </div>
            </div>

            {/* Signatures */}
            <div className="pt-6 border-t grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-10">
                <p className="font-semibold text-foreground">Le Professeur Principal</p>
                <p className="text-muted-foreground italic">{teacher?.lastName} {teacher?.firstName}</p>
              </div>
              <div className="space-y-10">
                <p className="font-semibold text-foreground">Les Membres du Conseil</p>
                <p className="text-muted-foreground italic">Visas & Observations</p>
              </div>
              <div className="space-y-10">
                <p className="font-semibold text-foreground">Le Chef d'Établissement</p>
                <p className="text-muted-foreground italic">Signature & Cachet</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. VUE : PROCÈS-VERBAL STANDARD (Par Devoir) */}
      {viewMode === 'pv' && (
        <div ref={printCardRef}>
          <Card className="border-border shadow-sm bg-card print:border-none print:shadow-none">
            <CardContent className="p-6 md:p-8 space-y-6">
            
            {/* Header Officiel */}
            <div className="border-b-2 border-primary/20 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-primary">RÉPUBLIQUE DE CÔTE D'IVOIRE</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Union - Discipline - Travail</p>
                  <p className="text-xs font-semibold mt-1 text-foreground">ÉTABLISSEMENT : {schoolDisplayName}</p>
                  <p className="text-[11px] text-muted-foreground">Année Scolaire : 2026-2027 · Trimestre {selectedTrimestre}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-xs font-bold bg-primary/10 text-primary border-primary/30 py-1 px-3">
                    FICHE OFFICIELLE DE NOTES (PV)
                  </Badge>
                  <p className="text-xs font-semibold mt-1.5 text-foreground">Classe : <span className="text-primary font-bold">{currentClass?.name || 'Toutes'}</span></p>
                  <p className="text-xs text-muted-foreground">
                    Matière : <span className="font-semibold text-foreground">{activeDevoirInfo?.matiere || teacher?.matiere || 'Discipline'}</span>
                    {matiereCoefficient !== undefined && <span className="ml-1.5 text-primary font-bold">(Coef. Matière Ã—{matiereCoefficient})</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">Professeur : <span className="font-semibold text-foreground">{teacher?.lastName} {teacher?.firstName}</span></p>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>Code Évaluation : <strong className="text-foreground">{activeDevoirInfo?.num || 'DEV-01'}</strong> ({activeDevoirInfo?.type || 'Devoir Surveillé'})</span>
                <span>Coefficient Devoir : <strong className="text-foreground">Ã—{activeDevoirInfo?.coeff || 1}</strong></span>
                <span>Date de passation : <strong className="text-foreground">{activeDevoirInfo?.date || new Date().toLocaleDateString('fr-FR')}</strong></span>
              </div>
            </div>

            {/* Table of Grades */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-muted/80 text-foreground border-y-2 border-border font-bold">
                    <th className="py-2.5 px-3 w-12 text-center">N°</th>
                    <th className="py-2.5 px-3 w-32 font-mono">Matricule</th>
                    <th className="py-2.5 px-3">Nom et Prénoms</th>
                    <th className="py-2.5 px-2 w-12 text-center">Sexe</th>
                    <th className="py-2.5 px-3 w-24 text-center">Note /20</th>
                    <th className="py-2.5 px-3 w-28 text-center text-blue-700">Pondérée (Ã—{activeDevoirInfo?.coeff || 1})</th>
                    <th className="py-2.5 px-3 w-20 text-center">Rang</th>
                    <th className="py-2.5 px-4">Appréciation Pédagogique</th>
                    <th className="py-2.5 px-3 w-24 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredRows.map((r, i) => {
                    const noteColor = r.note >= 16 ? 'text-blue-600' : r.note >= 12 ? 'text-primary' : r.note >= 10 ? 'text-gray-600' : r.note > 0 ? 'text-destructive' : 'text-muted-foreground';

                    return (
                      <tr key={r.id} className={`hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                        <td className="py-2 px-3 text-center text-muted-foreground font-mono">{r.num}</td>
                        <td className="py-2 px-3 font-mono font-medium">{r.matricule}</td>
                        <td className="py-2 px-3 font-semibold text-foreground">{r.name}</td>
                        <td className="py-2 px-2 text-center text-muted-foreground">{r.gender}</td>
                        <td className={`py-2 px-3 text-center font-mono font-bold text-sm ${noteColor}`}>
                          {r.hasNote && r.note > 0 ? r.note.toFixed(2) : '—'}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-blue-700">
                          {r.hasNote && r.note > 0 ? r.notePonderee.toFixed(2) : '—'}
                        </td>
                        <td className="py-2 px-3 text-center font-bold font-mono">
                          {r.rang}
                        </td>
                        <td className="py-2 px-4 italic font-medium text-foreground">
                          {r.appreciation || '—'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {r.note >= 10 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                              Admis
                            </span>
                          ) : r.note > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-800">
                              Non admis
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Non noté</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-muted-foreground italic">
                        Aucun élève trouvé.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/90 font-bold border-t-2 border-border text-foreground">
                    <td colSpan={4} className="py-2.5 px-3 text-right">RÉCAPITULATIF DE LA CLASSE :</td>
                    <td className="py-2.5 px-3 text-center font-mono text-primary text-sm">
                      {stats.avg > 0 ? stats.avg.toFixed(2) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-blue-700">
                      {(stats.avg * (activeDevoirInfo?.coeff || 1)).toFixed(2)}
                    </td>
                    <td colSpan={3} className="py-2.5 px-4 text-xs font-normal text-muted-foreground">
                      Taux d'admission : <strong className="text-foreground">{stats.successRate.toFixed(1)}%</strong> ({stats.passCount}/{stats.gradedCount}) · Max: <strong>{stats.max.toFixed(2)}</strong> · Min: <strong>{stats.min.toFixed(2)}</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Signatures officielles */}
            <div className="pt-6 border-t border-border grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-12">
                <p className="font-semibold text-foreground">L'Enseignant(e)</p>
                <p className="text-muted-foreground italic">{teacher?.lastName} {teacher?.firstName}</p>
              </div>
              <div className="space-y-12">
                <p className="font-semibold text-foreground">Le Professeur Principal</p>
                <p className="text-muted-foreground italic">Visa & Observations</p>
              </div>
              <div className="space-y-12">
                <p className="font-semibold text-foreground">La Direction des Études</p>
                <p className="text-muted-foreground italic">Cachet & Signature</p>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      )}
    </div>
  );
}



