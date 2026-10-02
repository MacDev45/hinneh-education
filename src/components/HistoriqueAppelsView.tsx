import React, { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calendar, Clock, Users, UserX, UserCheck, AlertTriangle,
  Search, Eye, Edit3, Printer, Download, Filter, ChevronDown,
  ChevronRight, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';
import { formatStudentName } from '@/lib/index';
import { printDocument } from '@/lib/printDocument';

interface HistoriqueAppelsViewProps {
  classes: any[];
  students: any[];
  attendance: any[];
  teacher: any;
  selectedClassId: string;
  onClassChange: (id: string) => void;
  onEditSession?: (date: string, heure: string) => void;
}

export function HistoriqueAppelsView({
  classes,
  students,
  attendance,
  teacher,
  selectedClassId,
  onClassChange,
  onEditSession,
}: HistoriqueAppelsViewProps) {
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterHeure, setFilterHeure] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // 'all', 'with_absents', 'perfect'
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [expandedSessionKey, setExpandedSessionKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'sessions' | 'eleves'>('sessions');

  const printRegisterRef = useRef<HTMLDivElement>(null);

  const currentClass = classes.find(c => String(c.id) === String(selectedClassId));
  const classStudents = useMemo(() => {
    return students.filter(s => String(s.classId) === String(selectedClassId));
  }, [students, selectedClassId]);

  const studentMap = useMemo(() => {
    const map = new Map<string, any>();
    students.forEach(s => map.set(String(s.id), s));
    return map;
  }, [students]);

  // Group attendance records into distinct call sessions (Date + Heure + Classe)
  const callSessions = useMemo(() => {
    const sessionMap = new Map<string, {
      key: string;
      date: string;
      rawDate: Date;
      heure: string;
      classId: string;
      total: number;
      presents: number;
      absents: number;
      retards: number;
      excuses: number;
      records: Array<{ studentId: string; status: 'present' | 'absent' | 'retard' | 'excuse'; note?: string }>;
    }>();

    attendance.forEach(att => {
      if (String(att.classId) !== String(selectedClassId)) return;

      const dateStr = att.date ? new Date(att.date).toISOString().split('T')[0] : 'Inconnue';
      const heureStr = att.heure || '08:00 - 10:00';
      const sessionKey = `${dateStr}__${heureStr}`;

      if (!sessionMap.has(sessionKey)) {
        sessionMap.set(sessionKey, {
          key: sessionKey,
          date: dateStr,
          rawDate: att.date ? new Date(att.date) : new Date(),
          heure: heureStr,
          classId: String(att.classId),
          total: 0,
          presents: 0,
          absents: 0,
          retards: 0,
          excuses: 0,
          records: []
        });
      }

      const session = sessionMap.get(sessionKey)!;
      session.records.push({
        studentId: String(att.studentId),
        status: (att.status as any) || 'present',
        note: att.note
      });

      if (att.status === 'absent') session.absents += 1;
      else if (att.status === 'retard') session.retards += 1;
      else if (att.status === 'excuse') session.excuses += 1;
      else session.presents += 1;

      session.total += 1;
    });

    // Sort sessions from newest to oldest
    return Array.from(sessionMap.values()).sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return cmp;
      return b.heure.localeCompare(a.heure);
    });
  }, [attendance, selectedClassId]);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return callSessions.filter(s => {
      if (filterDateFrom && s.date < filterDateFrom) return false;
      if (filterDateTo && s.date > filterDateTo) return false;
      if (filterHeure !== 'all' && s.heure !== filterHeure) return false;
      if (filterStatus === 'with_absents' && s.absents === 0 && s.retards === 0) return false;
      if (filterStatus === 'perfect' && (s.absents > 0 || s.retards > 0)) return false;
      return true;
    });
  }, [callSessions, filterDateFrom, filterDateTo, filterHeure, filterStatus]);

  // Cumulative student statistics across all sessions for this class
  const studentAssiduite = useMemo(() => {
    const stats: Record<string, {
      student: any;
      totalSessions: number;
      presents: number;
      absents: number;
      retards: number;
      excuses: number;
      tauxPresence: number;
    }> = {};

    classStudents.forEach(s => {
      stats[String(s.id)] = {
        student: s,
        totalSessions: 0,
        presents: 0,
        absents: 0,
        retards: 0,
        excuses: 0,
        tauxPresence: 100
      };
    });

    filteredSessions.forEach(session => {
      session.records.forEach(rec => {
        if (stats[rec.studentId]) {
          stats[rec.studentId].totalSessions += 1;
          if (rec.status === 'absent') stats[rec.studentId].absents += 1;
          else if (rec.status === 'retard') stats[rec.studentId].retards += 1;
          else if (rec.status === 'excuse') stats[rec.studentId].excuses += 1;
          else stats[rec.studentId].presents += 1;
        }
      });
    });

    return Object.values(stats).map(s => {
      const taux = s.totalSessions > 0 ? ((s.presents + s.retards) / s.totalSessions) * 100 : 100;
      return { ...s, tauxPresence: taux };
    }).sort((a, b) => b.absents - a.absents || a.tauxPresence - b.tauxPresence);
  }, [classStudents, filteredSessions]);

  const filteredStudentAssiduite = useMemo(() => {
    if (!searchStudent.trim()) return studentAssiduite;
    const q = searchStudent.toLowerCase();
    return studentAssiduite.filter(s =>
      formatStudentName(s.student).toLowerCase().includes(q) ||
      (s.student.matricule && s.student.matricule.toLowerCase().includes(q))
    );
  }, [studentAssiduite, searchStudent]);

  // Global Class Attendance Stats
  const globalSummary = useMemo(() => {
    let totalPresents = 0;
    let totalAbsents = 0;
    let totalRetards = 0;
    let totalExcuses = 0;
    let totalCalls = 0;

    filteredSessions.forEach(s => {
      totalPresents += s.presents;
      totalAbsents += s.absents;
      totalRetards += s.retards;
      totalExcuses += s.excuses;
      totalCalls += s.total;
    });

    const tauxGlobal = totalCalls > 0 ? ((totalPresents + totalRetards) / totalCalls) * 100 : 100;
    return {
      sessionCount: filteredSessions.length,
      totalPresents,
      totalAbsents,
      totalRetards,
      totalExcuses,
      tauxGlobal
    };
  }, [filteredSessions]);

  const handlePrint = () => {
    printDocument(printRegisterRef.current, `Historique_Appels_${currentClass?.name || 'Classe'}`, 'portrait');
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Créneau", "Classe", "Effectif Noté", "Présents", "Absents", "Retards", "Excusés", "Taux Présence"];
    const rows = filteredSessions.map(s => {
      const taux = s.total > 0 ? (((s.presents + s.retards) / s.total) * 100).toFixed(1) : "100.0";
      return [
        s.date,
        `"${s.heure}"`,
        `"${currentClass?.name || 'Classe'}"`,
        s.total,
        s.presents,
        s.absents,
        s.retards,
        s.excuses,
        `"${taux}%"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Historique_Appels_${currentClass?.name || 'Classe'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const schoolDisplayName = useMemo(() => {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('user_ecole_name') || localStorage.getItem('user_school_name') || localStorage.getItem('school_name');
      if (stored && stored !== 'undefined' && stored !== 'null' && stored.trim()) return stored.trim();
      const code = localStorage.getItem('user_ecole_code');
      if (code && code !== 'undefined' && code !== 'null' && code.trim()) return `Établissement ${code.trim()}`;
    }
    return teacher?.schoolName || 'Établissement Scolaire';
  }, [teacher]);

  return (
    <div className="space-y-6">
      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-sm print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          {/* Classe */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Classe</span>
            <Select value={selectedClassId} onValueChange={onClassChange}>
              <SelectTrigger className="w-40 font-semibold"><SelectValue placeholder="Classe" /></SelectTrigger>
              <SelectContent>
                {classes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Date Début */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date début</span>
            <Input
              type="date"
              value={filterDateFrom}
              onChange={e => setFilterDateFrom(e.target.value)}
              className="h-9 text-xs w-36"
            />
          </div>

          {/* Date Fin */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date fin</span>
            <Input
              type="date"
              value={filterDateTo}
              onChange={e => setFilterDateTo(e.target.value)}
              className="h-9 text-xs w-36"
            />
          </div>

          {/* Horaire */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Créneau</span>
            <Select value={filterHeure} onValueChange={setFilterHeure}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Créneau" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous créneaux</SelectItem>
                <SelectItem value="07:30 - 08:00">07:30 - 08:00</SelectItem>
                <SelectItem value="08:00 - 10:00">08:00 - 10:00</SelectItem>
                <SelectItem value="10:30 - 12:30">10:30 - 12:30</SelectItem>
                <SelectItem value="12:30 - 13:30">12:30 - 13:30</SelectItem>
                <SelectItem value="14:00 - 16:00">14:00 - 16:00</SelectItem>
                <SelectItem value="16:00 - 18:00">16:00 - 18:00</SelectItem>
                <SelectItem value="18:00 - 18:30">18:00 - 18:30</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Statut filtre */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Filtre</span>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Filtre" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les appels</SelectItem>
                <SelectItem value="with_absents">Avec absences/retards</SelectItem>
                <SelectItem value="perfect">100% Présents</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs gap-1.5">
            <Download className="h-4 w-4 text-emerald-600" /> Exporter CSV
          </Button>
          <Button size="sm" onClick={handlePrint} className="text-xs gap-1.5 bg-primary text-primary-foreground font-semibold">
            <Printer className="h-4 w-4" /> Imprimer Registre
          </Button>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
        <Card className="bg-card shadow-xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Séances d'appel</p>
              <p className="text-xl font-bold font-mono text-foreground mt-0.5">{globalSummary.sessionCount}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Calendar className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Taux de présence</p>
              <p className={`text-xl font-bold font-mono mt-0.5 ${globalSummary.tauxGlobal >= 90 ? 'text-emerald-600' : globalSummary.tauxGlobal >= 75 ? 'text-amber-600' : 'text-destructive'}`}>
                {globalSummary.tauxGlobal.toFixed(1)}%
              </p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Cumul Absences</p>
              <p className="text-xl font-bold font-mono text-destructive mt-0.5">{globalSummary.totalAbsents}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-destructive">
              <UserX className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Cumul Retards</p>
              <p className="text-xl font-bold font-mono text-amber-600 mt-0.5">{globalSummary.totalRetards}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Sub-Navigation Tabs ── */}
      <div className="flex items-center justify-between border-b border-border pb-2 print:hidden">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={viewMode === 'sessions' ? 'default' : 'outline'}
            onClick={() => setViewMode('sessions')}
            className="text-xs gap-1.5"
          >
            <Calendar className="h-3.5 w-3.5" /> Historique par séance ({filteredSessions.length})
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'eleves' ? 'default' : 'outline'}
            onClick={() => setViewMode('eleves')}
            className="text-xs gap-1.5"
          >
            <Users className="h-3.5 w-3.5" /> Bilan d'assiduité par élève ({classStudents.length})
          </Button>
        </div>

        {viewMode === 'eleves' && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Rechercher élève..."
              value={searchStudent}
              onChange={e => setSearchStudent(e.target.value)}
              className="pl-8 h-8 text-xs w-48"
            />
          </div>
        )}
      </div>

      {/* ── View 1: List of Call Sessions (Interactive Expand & Direct Edit) ── */}
      {viewMode === 'sessions' && (
        <div className="space-y-3">
          {filteredSessions.length === 0 ? (
            <Card className="border-dashed border-border bg-card">
              <CardContent className="p-8 text-center text-muted-foreground space-y-2">
                <Calendar className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p className="font-semibold text-sm">Aucun historique d'appel trouvé</p>
                <p className="text-xs">Effectuez et enregistrez l'appel pour cette classe afin d'alimenter le registre historique.</p>
              </CardContent>
            </Card>
          ) : (
            filteredSessions.map(session => {
              const isExpanded = expandedSessionKey === session.key;
              const dateObj = new Date(session.date);
              const formattedDate = dateObj.toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
              const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
              const sessionTaux = session.total > 0 ? (((session.presents + session.retards) / session.total) * 100).toFixed(0) : 100;

              return (
                <Card key={session.key} className="border border-border shadow-xs hover:border-primary/40 transition-all bg-card overflow-hidden">
                  <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-muted/20">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground">{capitalizedDate}</h4>
                          <Badge variant="outline" className="text-[11px] font-mono bg-background font-semibold">
                            <Clock className="h-3 w-3 mr-1 text-muted-foreground" /> {session.heure}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] uppercase font-bold">
                            {currentClass?.name || 'Classe'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Effectif contrôlé : <strong className="text-foreground">{session.total} élèves</strong> · Taux de présence : <strong className={Number(sessionTaux) >= 90 ? 'text-emerald-600' : 'text-amber-600'}>{sessionTaux}%</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-border">
                      {/* Pill badges */}
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {session.presents} Présents
                        </span>
                        {session.absents > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200">
                            {session.absents} Absents
                          </span>
                        )}
                        {session.retards > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                            {session.retards} Retards
                          </span>
                        )}
                        {session.excuses > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                            {session.excuses} Excusés
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5">
                        {onEditSession && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEditSession(session.date, session.heure)}
                            className="h-8 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                            title="Recharger cette session pour modifier"
                          >
                            <Edit3 className="h-3.5 w-3.5" /> Modifier
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpandedSessionKey(isExpanded ? null : session.key)}
                          className="h-8 text-xs gap-1"
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          {isExpanded ? 'Masquer' : 'Détails'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Student List when expanded */}
                  {isExpanded && (
                    <div className="p-4 border-t border-border bg-background animate-in fade-in">
                      <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-2.5">
                        Liste nominative des présences pour cette séance
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {session.records.map(rec => {
                          const student = studentMap.get(rec.studentId);
                          const statusConfig = {
                            present: { label: 'Présent', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: '🟢' },
                            absent: { label: 'Absent', bg: 'bg-red-50 text-red-800 border-red-200 font-bold', icon: '🔴' },
                            retard: { label: 'Retard', bg: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold', icon: '🟡' },
                            excuse: { label: 'Excusé', bg: 'bg-blue-50 text-blue-800 border-blue-200', icon: '🔵' },
                          }[rec.status] || { label: 'Présent', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: '🟢' };

                          return (
                            <div
                              key={rec.studentId}
                              className={`p-2 rounded-lg border text-xs flex items-center justify-between ${statusConfig.bg}`}
                            >
                              <div className="truncate mr-2">
                                <p className="font-semibold truncate">
                                  {student ? formatStudentName(student) : `Élève #${rec.studentId}`}
                                </p>
                                <p className="text-[10px] opacity-75 font-mono">
                                  {student?.matricule || `HE${rec.studentId}`}
                                </p>
                              </div>
                              <span className="text-[11px] whitespace-nowrap shrink-0">
                                {statusConfig.icon} {statusConfig.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ── View 2: Cumulative Student Assiduity Table ── */}
      {viewMode === 'eleves' && (
        <Card className="border-border shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-muted/80 text-foreground border-b border-border font-bold">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">N°</th>
                    <th className="py-2.5 px-3 w-28 font-mono">Matricule</th>
                    <th className="py-2.5 px-4">Nom et Prénoms</th>
                    <th className="py-2.5 px-2 text-center w-12">Sexe</th>
                    <th className="py-2.5 px-3 text-center">Séances Notées</th>
                    <th className="py-2.5 px-3 text-center text-emerald-700">Présences</th>
                    <th className="py-2.5 px-3 text-center text-destructive">Absences</th>
                    <th className="py-2.5 px-3 text-center text-amber-700">Retards</th>
                    <th className="py-2.5 px-3 text-center text-blue-700">Excusés</th>
                    <th className="py-2.5 px-3 text-center font-bold">Assiduité</th>
                    <th className="py-2.5 px-3 text-center">Alerte</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudentAssiduite.map((item, idx) => {
                    const hasSevereAbsences = item.absents >= 5;
                    const hasModerateAbsences = item.absents >= 3;

                    return (
                      <tr key={item.student.id} className={`hover:bg-muted/30 ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                        <td className="py-2 px-3 text-center text-muted-foreground font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-medium">{item.student.matricule || `HE${item.student.id}`}</td>
                        <td className="py-2 px-4 font-semibold text-foreground">{formatStudentName(item.student)}</td>
                        <td className="py-2 px-2 text-center text-muted-foreground">{item.student.gender || 'M'}</td>
                        <td className="py-2 px-3 text-center font-mono font-medium">{item.totalSessions}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-emerald-600">{item.presents}</td>
                        <td className={`py-2 px-3 text-center font-mono font-bold ${item.absents > 0 ? 'text-destructive bg-red-50/50' : 'text-muted-foreground'}`}>
                          {item.absents}
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-amber-600">{item.retards}</td>
                        <td className="py-2 px-3 text-center font-mono text-blue-600">{item.excuses}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold">
                          <span className={item.tauxPresence >= 90 ? 'text-emerald-600' : item.tauxPresence >= 75 ? 'text-amber-600' : 'text-destructive'}>
                            {item.tauxPresence.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {hasSevereAbsences ? (
                            <Badge variant="destructive" className="text-[10px] gap-1">
                              <AlertTriangle className="h-3 w-3" /> Convocation
                            </Badge>
                          ) : hasModerateAbsences ? (
                            <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">
                              À surveiller
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-medium">Régulier</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStudentAssiduite.length === 0 && (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-muted-foreground italic">
                        Aucun élève trouvé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Printable Official Attendance Register Sheet ── */}
      <div ref={printRegisterRef} className="hidden print:block">
        <div className="p-4 space-y-6">
          <div className="border-b-2 border-primary/20 pb-4 flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">RÉPUBLIQUE DE CÔTE D'IVOIRE</p>
              <p className="text-[10px] text-muted-foreground uppercase">Union - Discipline - Travail</p>
              <p className="text-xs font-semibold mt-1 text-foreground">ÉTABLISSEMENT : {schoolDisplayName}</p>
              <p className="text-[11px] text-muted-foreground">Année Scolaire : 2026-2027</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase bg-primary/10 text-primary py-1 px-3 border border-primary/30 rounded inline-block">
                REGISTRE HISTORIQUE DES PRÉSENCES
              </p>
              <p className="text-xs font-semibold mt-1">Classe : <span className="text-primary">{currentClass?.name || 'Toutes'}</span></p>
              <p className="text-xs text-muted-foreground">Enseignant : {teacher?.lastName} {teacher?.firstName}</p>
              <p className="text-[10px] text-muted-foreground">Date d'édition : {new Date().toLocaleDateString('fr-FR')}</p>
            </div>
          </div>

          <table className="w-full text-xs text-left border-collapse border border-border">
            <thead>
              <tr className="bg-muted/90 text-foreground font-bold border-b border-border">
                <th className="py-2 px-2 text-center w-10">N°</th>
                <th className="py-2 px-3 font-mono w-28">Matricule</th>
                <th className="py-2 px-4">Nom et Prénoms</th>
                <th className="py-2 px-2 text-center w-12">Sexe</th>
                <th className="py-2 px-3 text-center">Séances</th>
                <th className="py-2 px-3 text-center text-emerald-700">Présences</th>
                <th className="py-2 px-3 text-center text-destructive">Absences</th>
                <th className="py-2 px-3 text-center text-amber-700">Retards</th>
                <th className="py-2 px-3 text-center text-blue-700">Excusés</th>
                <th className="py-2 px-3 text-center font-bold">Assiduité</th>
              </tr>
            </thead>
            <tbody>
              {studentAssiduite.map((item, idx) => (
                <tr key={item.student.id} className="border-b border-border">
                  <td className="py-1.5 px-2 text-center font-mono">{idx + 1}</td>
                  <td className="py-1.5 px-3 font-mono">{item.student.matricule || `HE${item.student.id}`}</td>
                  <td className="py-1.5 px-4 font-semibold">{formatStudentName(item.student)}</td>
                  <td className="py-1.5 px-2 text-center">{item.student.gender || 'M'}</td>
                  <td className="py-1.5 px-3 text-center font-mono">{item.totalSessions}</td>
                  <td className="py-1.5 px-3 text-center font-mono text-emerald-700">{item.presents}</td>
                  <td className="py-1.5 px-3 text-center font-mono text-destructive font-bold">{item.absents}</td>
                  <td className="py-1.5 px-3 text-center font-mono text-amber-700">{item.retards}</td>
                  <td className="py-1.5 px-3 text-center font-mono text-blue-700">{item.excuses}</td>
                  <td className="py-1.5 px-3 text-center font-mono font-bold">{item.tauxPresence.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pt-8 border-t border-border grid grid-cols-3 gap-6 text-center text-xs">
            <div className="space-y-12">
              <p className="font-semibold">L'Enseignant(e)</p>
              <p className="text-muted-foreground italic">{teacher?.lastName} {teacher?.firstName}</p>
            </div>
            <div className="space-y-12">
              <p className="font-semibold">L'Éducateur(rice) de Niveau</p>
              <p className="text-muted-foreground italic">Visa</p>
            </div>
            <div className="space-y-12">
              <p className="font-semibold">La Direction</p>
              <p className="text-muted-foreground italic">Cachet & Signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
