/**
 * Module Bulletins Scolaires
 * Onglets : Recherche élève | Aperçu bulletin | Export PDF
 */
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Search, FileText, Download, ChevronRight, BookOpen, TrendingUp, TrendingDown, Printer, Award } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/apiClient';
import type { Student, ClassRoom, Evaluation } from '@/lib/index';
import { formatStudentName } from '@/lib/index';
import { printTableauDHonneurKorhogo, isEligibleForTableauDHonneur } from '@/lib/tableauHonneurKorhogoPrinter';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LigneBulletin {
  matiere: string;
  note1?: number;
  note2?: number;
  note3?: number;
  moyenne: number;
  coeff: number;
  appreciation: string;
}

const MATIERES_DEFAULT = ['Mathématiques', 'Français', 'Sciences', 'Histoire-Géo', 'Anglais', 'Éducation islamique', 'Éducation physique', 'Arts plastiques'];
const PERIODES = ['1er Trimestre', '2ème Trimestre', '3ème Trimestre'];

const getAppreciation = (m: number) => {
  if (m >= 18) return 'Excellent';
  if (m >= 16) return 'Très bien';
  if (m >= 14) return 'Bien';
  if (m >= 12) return 'Assez bien';
  if (m >= 10) return 'Passable';
  if (m >= 8) return 'Insuffisant';
  return 'Très insuffisant';
};

const noteColor = (m: number) => {
  if (m >= 14) return 'text-green-600 font-bold';
  if (m >= 10) return 'text-amber-600 font-semibold';
  return 'text-red-600 font-bold';
};

// ─── Composant ───────────────────────────────────────────────────────────────

export default function BulletinsSpace() {
  const { toast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [filterClasse, setFilterClasse] = useState('all');
  const [filterPeriode, setFilterPeriode] = useState(PERIODES[0]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiClient.getStudents().catch((): Student[] => []),
      apiClient.getClasses().catch((): ClassRoom[] => []),
      apiClient.getEvaluations().catch((): Evaluation[] => []),
    ]).then(([s, c, e]) => { setStudents(s); setClasses(c); setEvaluations(e); })
      .finally(() => setLoading(false));
  }, []);

  const filteredStudents = useMemo(() => students.filter(s => {
    const q = search.toLowerCase();
    const matchQ = `${formatStudentName(s)}`.toLowerCase().includes(q);
    const matchC = filterClasse === 'all' || s.classId === filterClasse;
    return matchQ && matchC;
  }), [students, search, filterClasse]);

  // Construit les lignes du bulletin à partir des évaluations
  const lignesBulletin = useMemo((): LigneBulletin[] => {
    if (!selectedStudent) return [];
    const evals = evaluations.filter(e => String(e.studentId) === String(selectedStudent.id));
    if (evals.length === 0) {
      return [];
    }
    const byMatiere: Record<string, number[]> = {};
    evals.forEach(e => {
      if (!byMatiere[e.subject]) byMatiere[e.subject] = [];
      byMatiere[e.subject].push(e.note);
    });
    return Object.entries(byMatiere).map(([matiere, notes]) => {
      const moy = notes.reduce((a, b) => a + b, 0) / notes.length;
      return { matiere, note1: notes[0], note2: notes[1], note3: notes[2], moyenne: parseFloat(moy.toFixed(2)), coeff: 2, appreciation: getAppreciation(moy) };
    });
  }, [selectedStudent, evaluations]);

  const moyenneGenerale = useMemo(() => {
    if (!lignesBulletin.length) return 0;
    const total = lignesBulletin.reduce((s, l) => s + l.moyenne * l.coeff, 0);
    const coeffs = lignesBulletin.reduce((s, l) => s + l.coeff, 0);
    return parseFloat((total / coeffs).toFixed(2));
  }, [lignesBulletin]);

  const rang = useMemo(() => {
    if (!selectedStudent) return '—';
    const classeStudents = students.filter(s => String(s.classId) === String(selectedStudent.classId));
    if (classeStudents.length === 0) return '—';
    const averages = classeStudents.map(st => {
      const stEvals = evaluations.filter(e => String(e.studentId) === String(st.id));
      if (stEvals.length === 0) return { id: st.id, avg: -1 };
      const avg = stEvals.reduce((sum, e) => sum + e.note, 0) / stEvals.length;
      return { id: st.id, avg };
    }).filter(x => x.avg >= 0);

    if (averages.length === 0) return `— / ${classeStudents.length}`;
    averages.sort((a, b) => b.avg - a.avg);
    const myIndex = averages.findIndex(x => String(x.id) === String(selectedStudent.id));
    if (myIndex === -1) return `— / ${classeStudents.length}`;
    return `${myIndex + 1} / ${classeStudents.length}`;
  }, [selectedStudent, students, evaluations]);

  // Éligibilité Tableau d'Honneur : Moyenne générale >= 12 ET aucune note < 10
  const honorEligibility = useMemo(() => {
    if (!selectedStudent || lignesBulletin.length === 0) {
      return { eligible: false, reason: 'Aucune évaluation disponible pour cette période.' };
    }
    return isEligibleForTableauDHonneur(moyenneGenerale, lignesBulletin);
  }, [selectedStudent, lignesBulletin, moyenneGenerale]);

  const getClasse = (id: string) => classes.find(c => c.id === id);

  // ─── Helpers bulletin ──────────────────────────────────────────────────────

  const getBulletinHTML = () => {
    const classe = getClasse(selectedStudent!.classId);
    const lignesHtml = lignesBulletin.map(l => `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:7px 8px;font-weight:500;">${l.matiere}</td>
        <td style="padding:7px 8px;text-align:center;">${l.note1?.toFixed(1) ?? '—'}</td>
        <td style="padding:7px 8px;text-align:center;">${l.note2?.toFixed(1) ?? '—'}</td>
        <td style="padding:7px 8px;text-align:center;">${l.note3?.toFixed(1) ?? '—'}</td>
        <td style="padding:7px 8px;text-align:center;font-weight:bold;color:${l.moyenne >= 10 ? '#15803d' : '#dc2626'}">${l.moyenne.toFixed(2)}</td>
        <td style="padding:7px 8px;text-align:center;">${l.coeff}</td>
        <td style="padding:7px 8px;color:#6b7280;">${l.appreciation}</td>
      </tr>`).join('');
    return `
      <div style="border-bottom:3px solid #1d4ed8;padding-bottom:10px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;">
        <div><h1 style="font-size:18px;color:#1d4ed8;margin:0;font-weight:bold;">HÎNNEH ÉDUCATION</h1><p style="font-size:9px;color:#888;margin:2px 0 0;">Bulletin de Notes — Année 2024-2025</p></div>
        <div style="text-align:right;"><p style="font-weight:bold;font-size:13px;margin:0;">BULLETIN DE NOTES</p><p style="font-size:10px;color:#555;margin:2px 0 0;">${filterPeriode}</p></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px;">
        <div style="background:#f3f4f6;padding:10px;border-radius:6px;border:1px solid #e5e7eb;">
          <p style="font-weight:bold;margin:0 0 5px;border-bottom:1px solid #d1d5db;padding-bottom:3px;">ÉLÈVE</p>
          <p style="margin:2px 0;"><strong>Nom :</strong> ${selectedStudent!.lastName} ${selectedStudent!.firstName}</p>
          <p style="margin:2px 0;"><strong>Classe :</strong> ${classe?.name ?? '—'}</p>
          <p style="margin:2px 0;"><strong>Période :</strong> ${filterPeriode}</p>
        </div>
        <div style="background:#f3f4f6;padding:10px;border-radius:6px;border:1px solid #e5e7eb;">
          <p style="font-weight:bold;margin:0 0 5px;border-bottom:1px solid #d1d5db;padding-bottom:3px;">RÉSULTATS</p>
          <p style="margin:2px 0;"><strong>Moyenne générale :</strong> <span style="color:${moyenneGenerale >= 10 ? '#15803d' : '#dc2626'};font-weight:bold;">${moyenneGenerale} / 20</span></p>
          <p style="margin:2px 0;"><strong>Rang :</strong> ${rang}</p>
          <p style="margin:2px 0;"><strong>Appréciation :</strong> ${getAppreciation(moyenneGenerale)}</p>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:20px;">
        <thead><tr style="background:#1d4ed8;color:#fff;">
          <th style="padding:8px;text-align:left;">Matière</th>
          <th style="padding:8px;text-align:center;width:60px;">Note 1</th>
          <th style="padding:8px;text-align:center;width:60px;">Note 2</th>
          <th style="padding:8px;text-align:center;width:60px;">Note 3</th>
          <th style="padding:8px;text-align:center;width:70px;">Moyenne</th>
          <th style="padding:8px;text-align:center;width:50px;">Coeff</th>
          <th style="padding:8px;text-align:left;">Appréciation</th>
        </tr></thead>
        <tbody>${lignesHtml}</tbody>
        <tfoot><tr style="background:#f3f4f6;font-weight:bold;">
          <td colspan="4" style="padding:8px;border-top:2px solid #1d4ed8;">MOYENNE GÉNÉRALE</td>
          <td style="padding:8px;text-align:center;border-top:2px solid #1d4ed8;font-size:14px;color:${moyenneGenerale >= 10 ? '#15803d' : '#dc2626'}">${moyenneGenerale} / 20</td>
          <td colspan="2" style="padding:8px;border-top:2px solid #1d4ed8;">Rang : ${rang}</td>
        </tr></tfoot>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:24px;font-size:10px;color:#333;">
        <div>
          <p style="margin:0 0 4px;font-weight:bold;color:#1e3a8a;">Visa de la Direction :</p>
          ${((classe?.name || '').toLowerCase().includes('korhogo') || ((selectedStudent as any)?.codeEtablissement || '').toLowerCase().includes('kho') || ((selectedStudent as any)?.codeEtablissement || '').toLowerCase().includes('csh-02') || (selectedStudent?.className || '').toLowerCase().includes('korhogo')) ? `
            <div style="height:54px;display:flex;align-items:center;">
              <img src="/images/signature_direction_korhogo_transparent.png" alt="Cachet et Signature Korhogo" style="max-height:54px;max-width:180px;object-fit:contain;mix-blend-mode:multiply;" onerror="this.onerror=null; this.src='/images/signature_direction_korhogo.png';" />
            </div>
          ` : `
            <p style="margin:18px 0 0;color:#888;">_____________________</p>
          `}
        </div>
        <div>
          <p style="margin:0 0 4px;font-weight:bold;color:#1e3a8a;">Visa Parents / Tuteurs :</p>
          <p style="margin:18px 0 0;color:#888;">_____________________</p>
        </div>
      </div>`;
  };

  // ─── Export PDF ────────────────────────────────────────────────────────────

  const exportPDF = () => {
    if (!selectedStudent) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '0';
    iframe.style.width = '794px';
    iframe.style.height = '1123px';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      toast({ variant: 'destructive', title: 'Erreur PDF' });
      if (iframe.parentNode) document.body.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    iframeDoc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:14mm;font-family:Arial,sans-serif;font-size:11px;color:#000;background:#fff;}</style></head><body>${getBulletinHTML()}</body></html>`);
    iframeDoc.close();

    import('html2pdf.js').then(m => {
      m.default().from(iframeDoc.body).set({
        filename: `bulletin_${selectedStudent.lastName}_${filterPeriode.replace(/ /g, '_')}.pdf`,
        margin: 10, html2canvas: { scale: 2, backgroundColor: '#ffffff', windowWidth: 794 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).save().then(() => { if (iframe.parentNode) document.body.removeChild(iframe); toast({ title: 'Bulletin PDF téléchargé' }); });
    }).catch(() => { if (iframe.parentNode) document.body.removeChild(iframe); toast({ variant: 'destructive', title: 'Erreur PDF' }); });
  };

  // ─── Impression ────────────────────────────────────────────────────────────

  const printBulletin = () => {
    if (!selectedStudent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast({ variant: 'destructive', title: 'Veuillez autoriser les popups pour imprimer' }); return; }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8" />
          <title>Bulletin ${formatStudentName(selectedStudent)}</title>
          <style>
            @page { size: A4; margin: 14mm; }
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; }
          </style>
        </head>
        <body>
          <div style="width:210mm;padding:14mm;margin:0 auto;">
            ${getBulletinHTML()}
          </div>
          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 200); };
          </script>
        </body>
      </html>`
    );
    printWindow.document.close();
    toast({ title: 'Fenêtre d\'impression ouverte' });
  };

  // ─── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <Layout
      loading={loading}
      loadingMessage="Chargement des bulletins scolaires..."
      loadingSubmessage="Récupération des classes, élèves et évaluations"
    >
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><GraduationCap className="h-7 w-7 text-primary" />Bulletins Scolaires</h1>
            <p className="text-muted-foreground mt-1">Génération et export PDF des bulletins de notes</p>
          </div>
          <div className="flex gap-2">
            <Select value={filterPeriode} onValueChange={setFilterPeriode}>
              <SelectTrigger className="w-44 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{PERIODES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Liste élèves */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 h-9 text-sm" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filterClasse} onValueChange={setFilterClasse}>
                <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="Classe" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">{filteredStudents.length} élève(s)</p>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
              {loading ? <p className="text-center py-6 text-muted-foreground text-sm">Chargement…</p> :
                filteredStudents.map(s => (
                  <button key={s.id} onClick={() => setSelectedStudent(s)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border flex items-center justify-between gap-2 transition-colors text-sm ${selectedStudent?.id === s.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted/50 border-border'}`}>
                    <div>
                      <p className="font-medium">{formatStudentName(s)}</p>
                      <p className={`text-xs ${selectedStudent?.id === s.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{getClasse(s.classId)?.name ?? '—'}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  </button>
                ))
              }
            </div>
          </div>

          {/* Aperçu bulletin */}
          <div className="lg:col-span-2">
            {!selectedStudent ? (
              <Card className="h-full flex items-center justify-center min-h-[400px]">
                <CardContent className="text-center text-muted-foreground">
                  <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Sélectionnez un élève pour afficher son bulletin</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{formatStudentName(selectedStudent)}</CardTitle>
                      <p className="text-sm text-muted-foreground">{getClasse(selectedStudent.classId)?.name} — {filterPeriode}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className={`gap-1 font-semibold ${
                          honorEligibility.eligible
                            ? 'border-amber-400 text-amber-900 bg-amber-50 hover:bg-amber-100 shadow-xs'
                            : 'border-slate-200 text-slate-400 bg-slate-50 hover:bg-slate-100 cursor-not-allowed opacity-75'
                        }`}
                        onClick={() => {
                          if (!honorEligibility.eligible) {
                            toast({
                              variant: 'destructive',
                              title: 'Élève non éligible au Tableau d\'Honneur',
                              description: `Critères requis : Moyenne générale ≥ 12/20 et toutes les matières ≥ 10/20. (${honorEligibility.reason || 'Critères non atteints'})`,
                            });
                            return;
                          }

                          printTableauDHonneurKorhogo({
                            studentName: formatStudentName(selectedStudent),
                            studentClass: getClasse(selectedStudent.classId)?.name || 'Classe',
                            moyenne: moyenneGenerale,
                            trimester: filterPeriode,
                            year: '2024-2025',
                            directeurNom: 'KONATE Aboubacar Sidik',
                          });
                        }}
                      >
                        <Award className={`h-4 w-4 ${honorEligibility.eligible ? 'text-amber-600' : 'text-slate-400'}`} />
                        Tableau d'Honneur
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1" onClick={printBulletin}><Printer className="h-4 w-4" />Imprimer</Button>
                      <Button size="sm" className="gap-1" onClick={exportPDF}><Download className="h-4 w-4" />PDF</Button>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-2 flex-wrap items-center">
                    <div className={`text-2xl font-bold ${moyenneGenerale >= 10 ? 'text-green-600' : 'text-red-600'}`}>
                      {moyenneGenerale}<span className="text-base font-normal text-muted-foreground"> / 20</span>
                    </div>
                    <div className="flex flex-col justify-center text-sm text-muted-foreground">
                      <span>Rang : <strong>{rang}</strong></span>
                      <span>{getAppreciation(moyenneGenerale)}</span>
                    </div>
                    {honorEligibility.eligible && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 gap-1 ml-auto">
                        <Award className="h-3.5 w-3.5 text-amber-600" />
                        Éligible Tableau d'Honneur (Moy ≥ 12 & Min ≥ 10)
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60 border-b">
                        <tr>
                          <th className="p-2 text-left">Matière</th>
                          <th className="p-2 text-center w-16">N1</th>
                          <th className="p-2 text-center w-16">N2</th>
                          <th className="p-2 text-center w-16">N3</th>
                          <th className="p-2 text-center w-20">Moy.</th>
                          <th className="p-2 text-left hidden sm:table-cell">Appréciation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lignesBulletin.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-muted-foreground italic">
                              Aucune évaluation enregistrée pour cet élève dans cette période.
                            </td>
                          </tr>
                        ) : (
                          lignesBulletin.map(l => (
                            <tr key={l.matiere} className="border-b hover:bg-muted/20">
                              <td className="p-2 font-medium">{l.matiere}</td>
                              <td className="p-2 text-center text-muted-foreground">{l.note1?.toFixed(1) ?? '—'}</td>
                              <td className="p-2 text-center text-muted-foreground">{l.note2?.toFixed(1) ?? '—'}</td>
                              <td className="p-2 text-center text-muted-foreground">{l.note3?.toFixed(1) ?? '—'}</td>
                              <td className={`p-2 text-center ${noteColor(l.moyenne)}`}>{l.moyenne.toFixed(2)}</td>
                              <td className="p-2 text-muted-foreground text-xs hidden sm:table-cell">{l.appreciation}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {lignesBulletin.length > 0 && (
                        <tfoot>
                          <tr className="bg-muted/40 font-semibold">
                            <td colSpan={4} className="p-2">Moyenne générale</td>
                            <td className={`p-2 text-center text-base ${noteColor(moyenneGenerale)}`}>{moyenneGenerale}</td>
                            <td className="p-2 text-xs hidden sm:table-cell">Rang : {rang}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </motion.div>
    </Layout>
  );
}
