import React, { useState, useMemo, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Download, Table, Search, Award, TrendingUp, BarChart3 } from 'lucide-react';
import { formatStudentName } from '@/lib/index';
import { printDocument } from '@/lib/printDocument';

interface MatriceNotesViewProps {
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

export function MatriceNotesView({
  classes,
  subjects,
  students,
  evaluations,
  teacher,
  selectedClassId,
  onClassChange,
  selectedSubjectId,
  onSubjectChange,
}: MatriceNotesViewProps) {
  const [selectedTrimestre, setSelectedTrimestre] = useState<string>('1');
  const [selectedMatiere, setSelectedMatiere] = useState<string>('all');
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

  // Distinct subjects present in evaluations for this class
  const availableMatieres = useMemo(() => {
    const set = new Set<string>();
    evaluations.forEach(ev => {
      if (String(ev.classId) === String(selectedClassId) && ev.matiere) {
        set.add(ev.matiere);
      }
    });
    return Array.from(set);
  }, [evaluations, selectedClassId]);

  // Filtered evaluations for this class, trimester, and optional subject
  const classEvals = useMemo(() => {
    return evaluations.filter(ev => {
      const matchClass = String(ev.classId) === String(selectedClassId);
      const matchTrim = selectedTrimestre === 'all' || String(ev.trimester) === String(selectedTrimestre);
      const matchMatiere = selectedMatiere === 'all' || ev.matiere === selectedMatiere;
      return matchClass && matchTrim && matchMatiere;
    });
  }, [evaluations, selectedClassId, selectedTrimestre, selectedMatiere]);

  // Distinct evaluation columns (grouped by devoir_numero or title)
  const evalColumns = useMemo(() => {
    const map = new Map<string, { num: string; label: string; type: string; coeff: number; date: string; matiere: string }>();
    
    classEvals.forEach(ev => {
      const key = ev.devoir_numero ? String(ev.devoir_numero).trim() : `${ev.type || 'Devoir'} (${ev.matiere || ''})`;
      if (!map.has(key)) {
        map.set(key, {
          num: key,
          label: ev.devoir_numero ? ev.devoir_numero : (ev.type || 'Évaluation'),
          type: ev.type || 'Devoir',
          coeff: Number(ev.coefficient) || 1,
          date: ev.date ? new Date(ev.date).toLocaleDateString('fr-FR') : '',
          matiere: ev.matiere || 'Matière'
        });
      }
    });

    return Array.from(map.values());
  }, [classEvals]);

  // Matrix rows calculation
  const matrixRows = useMemo(() => {
    const rows = classStudents.map((s, idx) => {
      const sEvals = classEvals.filter(e => String(e.studentId) === String(s.id));
      
      const gradesByCol: Record<string, number | null> = {};
      let sumWeighted = 0;
      let totalCoeff = 0;

      evalColumns.forEach(col => {
        const found = sEvals.find(e => {
          const key = e.devoir_numero ? String(e.devoir_numero).trim() : `${e.type || 'Devoir'} (${e.matiere || ''})`;
          return key === col.num;
        });

        if (found && found.note !== null && found.note !== undefined) {
          const n = Number(found.note);
          gradesByCol[col.num] = n;
          sumWeighted += n * col.coeff;
          totalCoeff += col.coeff;
        } else {
          gradesByCol[col.num] = null;
        }
      });

      const moyenne = totalCoeff > 0 ? (sumWeighted / totalCoeff) : 0;
      const hasGrades = totalCoeff > 0;

      let mention = "—";
      if (hasGrades) {
        if (moyenne >= 18) mention = "Excellent";
        else if (moyenne >= 16) mention = "Très bien";
        else if (moyenne >= 14) mention = "Bien";
        else if (moyenne >= 12) mention = "Assez bien";
        else if (moyenne >= 10) mention = "Passable";
        else if (moyenne >= 8) mention = "Insuffisant";
        else mention = "Très insuffisant";
      }

      return {
        id: s.id,
        num: idx + 1,
        matricule: s.matricule || `HE${s.id}`,
        name: formatStudentName(s),
        gender: s.gender || 'M',
        gradesByCol,
        moyenne,
        hasGrades,
        mention,
        statut: moyenne >= 10 ? 'Admis' : (hasGrades ? 'Non admis' : 'Non évalué')
      };
    });

    // Compute ranks based on calculated moyenne
    const sortedEvaluated = [...rows.filter(r => r.hasGrades && r.moyenne > 0)].sort((a, b) => b.moyenne - a.moyenne);
    return rows.map(r => {
      if (!r.hasGrades || r.moyenne === 0) return { ...r, rang: '—' };
      const rankIdx = sortedEvaluated.findIndex(g => g.id === r.id);
      const rang = rankIdx >= 0 ? `${rankIdx + 1}${rankIdx === 0 ? 'er' : 'e'}` : '—';
      return { ...r, rang };
    });
  }, [classStudents, classEvals, evalColumns]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return matrixRows;
    const q = search.toLowerCase();
    return matrixRows.filter(r => r.name.toLowerCase().includes(q) || r.matricule.toLowerCase().includes(q));
  }, [matrixRows, search]);

  // Matrix columns stats (averages per evaluation column)
  const colStats = useMemo(() => {
    const res: Record<string, { avg: number; count: number; max: number; min: number }> = {};
    evalColumns.forEach(col => {
      const notes = matrixRows.map(r => r.gradesByCol[col.num]).filter((n): n is number => n !== null && n > 0);
      if (notes.length > 0) {
        const sum = notes.reduce((a, b) => a + b, 0);
        res[col.num] = {
          avg: sum / notes.length,
          count: notes.length,
          max: Math.max(...notes),
          min: Math.min(...notes),
        };
      } else {
        res[col.num] = { avg: 0, count: 0, max: 0, min: 0 };
      }
    });
    return res;
  }, [matrixRows, evalColumns]);

  // Global class stats
  const globalStats = useMemo(() => {
    const evaluated = matrixRows.filter(r => r.hasGrades && r.moyenne > 0);
    const moys = evaluated.map(r => r.moyenne);
    const sum = moys.reduce((a, b) => a + b, 0);
    const avg = evaluated.length > 0 ? sum / evaluated.length : 0;
    const max = evaluated.length > 0 ? Math.max(...moys) : 0;
    const min = evaluated.length > 0 ? Math.min(...moys) : 0;
    const passCount = moys.filter(m => m >= 10).length;
    const passRate = evaluated.length > 0 ? (passCount / evaluated.length) * 100 : 0;

    const distribution = {
      excellent: moys.filter(m => m >= 18).length,
      tresBien: moys.filter(m => m >= 16 && m < 18).length,
      bien: moys.filter(m => m >= 14 && m < 16).length,
      assezBien: moys.filter(m => m >= 12 && m < 14).length,
      passable: moys.filter(m => m >= 10 && m < 12).length,
      insuffisant: moys.filter(m => m < 10).length,
    };

    return { total: matrixRows.length, evaluatedCount: evaluated.length, avg, max, min, passCount, passRate, distribution };
  }, [matrixRows]);

  const handlePrint = () => {
    printDocument(printCardRef.current, `Matrice_Notes_${currentClass?.name || 'Classe'}_Trimestre_${selectedTrimestre}`, 'landscape');
  };

  const handleExportCSV = () => {
    const colHeaders = evalColumns.map(c => `${c.label} (×${c.coeff})`);
    const headers = ["N°", "Matricule", "Nom et Prénoms", "Sexe", ...colHeaders, "Moyenne Trim.", "Rang", "Mention", "Statut"];

    const rows = matrixRows.map(r => {
      const colVals = evalColumns.map(c => {
        const val = r.gradesByCol[c.num];
        return val !== null ? val.toFixed(2) : "—";
      });

      return [
        r.num,
        `"${r.matricule}"`,
        `"${r.name}"`,
        r.gender,
        ...colVals,
        r.hasGrades ? r.moyenne.toFixed(2) : "—",
        r.rang,
        `"${r.mention}"`,
        r.statut
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Matrice_Notes_${currentClass?.name || 'Classe'}_Trimestre_${selectedTrimestre}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* ── Filter & Action Bar (Screen only) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-sm print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Classe</span>
            <Select value={selectedClassId} onValueChange={onClassChange}>
              <SelectTrigger className="w-40 font-semibold"><SelectValue placeholder="Classe" /></SelectTrigger>
              <SelectContent>
                {classes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Discipline</span>
            <Select value={selectedMatiere} onValueChange={setSelectedMatiere}>
              <SelectTrigger className="w-44 font-semibold"><SelectValue placeholder="Matière" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes disciplines</SelectItem>
                {availableMatieres.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Période</span>
            <Select value={selectedTrimestre} onValueChange={setSelectedTrimestre}>
              <SelectTrigger className="w-36 font-semibold"><SelectValue placeholder="Trimestre" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1er Trimestre</SelectItem>
                <SelectItem value="2">2ème Trimestre</SelectItem>
                <SelectItem value="3">3ème Trimestre</SelectItem>
                <SelectItem value="all">Vue Annuelle</SelectItem>
              </SelectContent>
            </Select>
          </div>

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

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs gap-1.5">
            <Download className="h-4 w-4 text-emerald-600" /> Exporter Excel
          </Button>
          <Button size="sm" onClick={handlePrint} className="text-xs gap-1.5 bg-primary text-primary-foreground font-semibold">
            <Printer className="h-4 w-4" /> Imprimer Matrice (Paysage)
          </Button>
        </div>
      </div>

      {/* ── Summary & Distribution Cards (Screen only) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
        {/* KPI Metrics */}
        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Moyenne Générale</span>
              <Badge variant="outline" className="text-xs font-mono font-bold bg-primary/10 text-primary border-primary/30">
                {globalStats.avg > 0 ? globalStats.avg.toFixed(2) : '—'}/20
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-border">
              <div>
                <p className="text-[10px] text-muted-foreground">Effectif</p>
                <p className="text-sm font-bold font-mono">{globalStats.total}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Note Max</p>
                <p className="text-sm font-bold font-mono text-emerald-600">{globalStats.max > 0 ? globalStats.max.toFixed(2) : '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Note Min</p>
                <p className="text-sm font-bold font-mono text-destructive">{globalStats.min > 0 ? globalStats.min.toFixed(2) : '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Taux de Réussite Classe</span>
              <span className={`text-base font-bold font-mono ${globalStats.passRate >= 70 ? 'text-emerald-600' : globalStats.passRate >= 50 ? 'text-amber-600' : 'text-destructive'}`}>
                {globalStats.passRate.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-2.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, globalStats.passRate)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              <strong>{globalStats.passCount}</strong> admis sur <strong>{globalStats.evaluatedCount}</strong> évalués
            </p>
          </CardContent>
        </Card>

        {/* Grade Distribution */}
        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 space-y-2">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Répartition des mentions</span>
            <div className="flex items-center justify-between text-[11px] gap-1 pt-1">
              <div className="text-center">
                <span className="block font-bold text-emerald-600 font-mono">{globalStats.distribution.excellent + globalStats.distribution.tresBien}</span>
                <span className="text-[10px] text-muted-foreground">≥16</span>
              </div>
              <div className="text-center">
                <span className="block font-bold text-teal-600 font-mono">{globalStats.distribution.bien}</span>
                <span className="text-[10px] text-muted-foreground">14-16</span>
              </div>
              <div className="text-center">
                <span className="block font-bold text-primary font-mono">{globalStats.distribution.assezBien}</span>
                <span className="text-[10px] text-muted-foreground">12-14</span>
              </div>
              <div className="text-center">
                <span className="block font-bold text-amber-600 font-mono">{globalStats.distribution.passable}</span>
                <span className="text-[10px] text-muted-foreground">10-12</span>
              </div>
              <div className="text-center">
                <span className="block font-bold text-destructive font-mono">{globalStats.distribution.insuffisant}</span>
                <span className="text-[10px] text-muted-foreground">&lt;10</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Official Printable Grade Matrix Table ── */}
      <div ref={printCardRef}>
        <Card className="border-border shadow-md bg-card print:border-none print:shadow-none overflow-hidden">
          <CardContent className="p-6 md:p-8 space-y-6">
            
            {/* Header Officiel */}
            <div className="border-b-2 border-primary/20 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-primary">RÉPUBLIQUE DE CÔTE D'IVOIRE</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Ministère de l'Éducation Nationale et de l'Alphabétisation</p>
                  <p className="text-xs font-semibold mt-1 text-foreground">ÉTABLISSEMENT : {schoolDisplayName}</p>
                  <p className="text-[11px] text-muted-foreground">Année Scolaire : 2026-2027 · {selectedTrimestre === 'all' ? 'Vue Annuelle' : `Trimestre ${selectedTrimestre}`}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-xs font-bold bg-primary/10 text-primary border-primary/30 py-1 px-3">
                    MATRICE RÉCAPITULATIVE DES NOTES
                  </Badge>
                  <p className="text-xs font-semibold mt-1.5 text-foreground">Classe : <span className="text-primary font-bold">{currentClass?.name || 'Toutes'}</span></p>
                  <p className="text-xs text-muted-foreground">Discipline : <span className="font-semibold text-foreground">{selectedMatiere === 'all' ? (teacher?.matiere || 'Toutes') : selectedMatiere}</span></p>
                  <p className="text-xs text-muted-foreground">Enseignant : <span className="font-semibold text-foreground">{teacher?.lastName} {teacher?.firstName}</span></p>
                </div>
              </div>
            </div>

            {/* Matrix Cross-Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-border">
                <thead>
                  <tr className="bg-muted/90 text-foreground border-b-2 border-border font-bold">
                    <th className="py-2 px-2.5 w-10 text-center border-r border-border">N°</th>
                    <th className="py-2 px-3 w-28 font-mono border-r border-border">Matricule</th>
                    <th className="py-2 px-3 min-w-[160px] border-r border-border">Nom et Prénoms</th>
                    <th className="py-2 px-1.5 w-10 text-center border-r border-border">Sexe</th>
                    
                    {/* Evaluation Columns */}
                    {evalColumns.map(col => (
                      <th key={col.num} className="py-2 px-2.5 text-center border-r border-border min-w-[70px]">
                        <span className="block font-bold truncate">{col.label}</span>
                        <span className="text-[9px] text-indigo-600 font-normal">×{col.coeff}</span>
                      </th>
                    ))}

                    {evalColumns.length === 0 && (
                      <th className="py-2 px-3 text-center border-r border-border text-muted-foreground italic font-normal">
                        Aucun devoir enregistré
                      </th>
                    )}

                    {/* Summary Columns */}
                    <th className="py-2 px-3 w-24 text-center bg-primary/10 text-primary border-r border-border font-bold">Moyenne</th>
                    <th className="py-2 px-2.5 w-16 text-center border-r border-border">Rang</th>
                    <th className="py-2 px-3 w-28 border-r border-border">Mention</th>
                    <th className="py-2 px-2.5 w-24 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredRows.map((r, i) => {
                    const moyColor = r.moyenne >= 16 ? 'text-emerald-600' : r.moyenne >= 12 ? 'text-primary' : r.moyenne >= 10 ? 'text-amber-600' : r.moyenne > 0 ? 'text-destructive' : 'text-muted-foreground';

                    return (
                      <tr key={r.id} className={`hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                        <td className="py-2 px-2.5 text-center text-muted-foreground font-mono border-r border-border">{r.num}</td>
                        <td className="py-2 px-3 font-mono font-medium border-r border-border">{r.matricule}</td>
                        <td className="py-2 px-3 font-semibold text-foreground border-r border-border">{r.name}</td>
                        <td className="py-2 px-1.5 text-center text-muted-foreground border-r border-border">{r.gender}</td>
                        
                        {/* Dynamic evaluation cells */}
                        {evalColumns.map(col => {
                          const note = r.gradesByCol[col.num];
                          const cellColor = note !== null ? (note >= 14 ? 'text-emerald-600' : note >= 10 ? 'text-primary' : 'text-destructive') : 'text-muted-foreground';

                          return (
                            <td key={col.num} className={`py-2 px-2.5 text-center font-mono font-bold border-r border-border ${cellColor}`}>
                              {note !== null ? note.toFixed(2) : '—'}
                            </td>
                          );
                        })}

                        {evalColumns.length === 0 && (
                          <td className="py-2 px-3 text-center border-r border-border text-muted-foreground italic">
                            —
                          </td>
                        )}

                        {/* Calculated Period Average */}
                        <td className={`py-2 px-3 text-center font-mono font-bold text-sm bg-primary/5 border-r border-border ${moyColor}`}>
                          {r.hasGrades && r.moyenne > 0 ? r.moyenne.toFixed(2) : '—'}
                        </td>

                        {/* Rank */}
                        <td className="py-2 px-2.5 text-center font-bold font-mono border-r border-border">
                          {r.rang}
                        </td>

                        {/* Mention */}
                        <td className="py-2 px-3 font-medium italic border-r border-border text-foreground">
                          {r.mention}
                        </td>

                        {/* Status */}
                        <td className="py-2 px-2.5 text-center">
                          {r.moyenne >= 10 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              Admis
                            </span>
                          ) : r.hasGrades && r.moyenne > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800">
                              Non admis
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">Non évalué</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={evalColumns.length + 8} className="text-center py-8 text-muted-foreground italic">
                        Aucun élève trouvé.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  {/* Column averages row */}
                  <tr className="bg-muted/90 font-bold border-t-2 border-border text-foreground">
                    <td colSpan={4} className="py-2.5 px-3 text-right border-r border-border">MOYENNE DU DEVOIR :</td>
                    {evalColumns.map(col => {
                      const st = colStats[col.num];
                      return (
                        <td key={col.num} className="py-2.5 px-2 text-center font-mono text-primary text-xs border-r border-border">
                          {st && st.avg > 0 ? st.avg.toFixed(2) : '—'}
                        </td>
                      );
                    })}
                    {evalColumns.length === 0 && <td className="border-r border-border"></td>}
                    <td className="py-2.5 px-3 text-center font-mono text-primary text-sm font-bold bg-primary/10 border-r border-border">
                      {globalStats.avg > 0 ? globalStats.avg.toFixed(2) : '—'}
                    </td>
                    <td colSpan={3} className="py-2.5 px-4 text-xs font-normal text-muted-foreground">
                      Taux d'admission : <strong className="text-foreground">{globalStats.passRate.toFixed(1)}%</strong> ({globalStats.passCount}/{globalStats.evaluatedCount})
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Footer Visa */}
            <div className="pt-6 border-t border-border grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-12">
                <p className="font-semibold text-foreground">L'Enseignant(e) de la Matière</p>
                <p className="text-muted-foreground italic">{teacher?.lastName} {teacher?.firstName}</p>
              </div>
              <div className="space-y-12">
                <p className="font-semibold text-foreground">Le Professeur Principal</p>
                <p className="text-muted-foreground italic">Visa & Signature</p>
              </div>
              <div className="space-y-12">
                <p className="font-semibold text-foreground">La Direction des Études</p>
                <p className="text-muted-foreground italic">Visa & Cachet</p>
              </div>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
