/**
 * Gestion des Examens
 * Onglets : Examens | Calendrier | Résultats | Convocations PDF
 */
import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Plus, Edit, Trash2, Calendar, FileText, Download, Search, CheckCircle2, Clock } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/apiClient';
import type { ClassRoom } from '@/lib/index';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Examen {
  id: string;
  titre: string;
  matiere: string;
  classe: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  salle: string;
  type: 'composition' | 'bac_blanc' | 'brevet' | 'devoir' | 'oral';
  statut: 'planifie' | 'en_cours' | 'termine';
  coeff: number;
}

interface Resultat {
  id: string;
  examenId: string;
  eleve: string;
  note: number;
  mention: string;
}

const TYPES = ['composition', 'bac_blanc', 'brevet', 'devoir', 'oral'];
const MATIERES = ['Mathématiques', 'Français', 'Sciences', 'Histoire-Géo', 'Anglais', 'Éducation islamique', 'EPS'];

const getMention = (n: number) => n >= 18 ? 'Excellent' : n >= 16 ? 'Très bien' : n >= 14 ? 'Bien' : n >= 12 ? 'Assez bien' : n >= 10 ? 'Passable' : n >= 8 ? 'Insuffisant' : 'Très insuffisant';
const statutColor = (s: string) => s === 'termine' ? 'bg-green-100 text-green-700' : s === 'en_cours' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700';

type ExamenType = 'composition' | 'bac_blanc' | 'brevet' | 'devoir' | 'oral';
type FormExamen = { titre: string; matiere: string; classe: string; date: string; heureDebut: string; heureFin: string; salle: string; type: ExamenType; coeff: string };
const FORM_INIT: FormExamen = { titre: '', matiere: MATIERES[0], classe: '', date: '', heureDebut: '08:00', heureFin: '10:00', salle: '', type: 'composition', coeff: '2' };

// ─── Composant ───────────────────────────────────────────────────────────────

export default function ExamensSpace() {
  const { toast } = useToast();
  const [examens, setExamens] = useState<Examen[]>([]);
  const [classesList, setClassesList] = useState<ClassRoom[]>([]);
  const [resultats, setResultats] = useState<Resultat[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('all');
  const [openExamen, setOpenExamen] = useState(false);
  const [editExamen, setEditExamen] = useState<Examen | null>(null);
  const [form, setForm] = useState<FormExamen>({ ...FORM_INIT });
  const [selectedExamen, setSelectedExamen] = useState<Examen | null>(null);
  const [openResultats, setOpenResultats] = useState(false);

  useEffect(() => {
    apiClient.getClasses().then(cls => {
      setClassesList(cls);
      if (cls.length > 0) {
        setForm(f => ({ ...f, classe: cls[0].name }));
      }
    }).catch(err => console.error("Failed to load classes", err));
  }, []);

  const filtered = useMemo(() => examens.filter(e => {
    const q = search.toLowerCase();
    const matchQ = `${e.titre} ${e.matiere} ${e.classe}`.toLowerCase().includes(q);
    const matchS = filterStatut === 'all' || e.statut === filterStatut;
    return matchQ && matchS;
  }), [examens, search, filterStatut]);

  const saveExamen = () => {
    if (!form.titre || !form.date) { toast({ variant: 'destructive', title: 'Titre et date requis' }); return; }
    const data: Examen = { id: editExamen?.id || `ex-${Date.now()}`, titre: form.titre, matiere: form.matiere, classe: form.classe, date: form.date, heureDebut: form.heureDebut, heureFin: form.heureFin, salle: form.salle, type: form.type, coeff: Number(form.coeff), statut: editExamen?.statut || 'planifie' };
    if (editExamen) { setExamens(p => p.map(e => e.id === editExamen.id ? data : e)); toast({ title: 'Examen mis à jour' }); }
    else { setExamens(p => [...p, data]); toast({ title: 'Examen créé' }); }
    setOpenExamen(false); setEditExamen(null); setForm({ ...FORM_INIT });
  };

  const deleteExamen = (id: string) => { setExamens(p => p.filter(e => e.id !== id)); toast({ title: 'Examen supprimé' }); };

  const changeStatut = (id: string, statut: Examen['statut']) => { setExamens(p => p.map(e => e.id === id ? { ...e, statut } : e)); };

  const exportConvocation = (ex: Examen) => {
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;left:-9999px;width:210mm;padding:15mm;font-family:Arial,sans-serif;font-size:11px;color:#000;background:#fff';
    container.innerHTML = `
      <div style="border-bottom:2px solid #1d4ed8;padding-bottom:10px;margin-bottom:20px;text-align:center;">
        <h1 style="font-size:20px;color:#1d4ed8;margin:0;">HÎNNEH ÉDUCATION</h1>
        <h2 style="font-size:14px;margin:8px 0 0;">CONVOCATION À L'EXAMEN</h2>
      </div>
      <div style="background:#f3f4f6;padding:14px;border-radius:8px;margin-bottom:20px;">
        <table style="width:100%;font-size:11px;"><tbody>
          <tr><td style="padding:4px 8px;font-weight:bold;width:140px;">Intitulé :</td><td style="padding:4px 8px;">${ex.titre}</td></tr>
          <tr><td style="padding:4px 8px;font-weight:bold;">Matière :</td><td style="padding:4px 8px;">${ex.matiere}</td></tr>
          <tr><td style="padding:4px 8px;font-weight:bold;">Classe :</td><td style="padding:4px 8px;">${ex.classe}</td></tr>
          <tr><td style="padding:4px 8px;font-weight:bold;">Date :</td><td style="padding:4px 8px;">${new Date(ex.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
          <tr><td style="padding:4px 8px;font-weight:bold;">Horaire :</td><td style="padding:4px 8px;">${ex.heureDebut} — ${ex.heureFin}</td></tr>
          <tr><td style="padding:4px 8px;font-weight:bold;">Salle :</td><td style="padding:4px 8px;">${ex.salle || 'À confirmer'}</td></tr>
          <tr><td style="padding:4px 8px;font-weight:bold;">Type :</td><td style="padding:4px 8px;">${ex.type} (coefficient ${ex.coeff})</td></tr>
        </tbody></table>
      </div>
      <div style="margin-bottom:16px;font-size:11px;line-height:1.6;">
        <p style="font-weight:bold;margin-bottom:6px;">Consignes :</p>
        <ul style="margin:0;padding-left:20px;">
          <li>Se présenter 15 minutes avant le début de l'épreuve.</li>
          <li>Apporter une carte d'élève ou pièce d'identité.</li>
          <li>Matériels autorisés : stylo bleu ou noir, calculatrice (si autorisée).</li>
          <li>Tout retard non justifié entraîne l'exclusion de l'épreuve.</li>
        </ul>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:30px;font-size:10px;color:#666;">
        <p>Signature Direction :<br/><br/>_____________________</p>
        <p style="text-align:center;">Cachet établissement</p>
        <p>Date : ${new Date().toLocaleDateString('fr-FR')}</p>
      </div>`;
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
      if (iframe.parentNode) document.body.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    iframeDoc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:15mm;font-family:Arial,sans-serif;font-size:11px;color:#000;background:#fff;}</style></head><body>${container.innerHTML}</body></html>`);
    iframeDoc.close();

    import('html2pdf.js').then(m => {
      m.default().from(iframeDoc.body).set({ filename: `convocation_${ex.titre.replace(/ /g, '_')}.pdf`, margin: 10, html2canvas: { scale: 2, backgroundColor: '#ffffff', windowWidth: 794 }, jsPDF: { unit: 'mm', format: 'a4' } }).save()
        .then(() => { if (iframe.parentNode) document.body.removeChild(iframe); toast({ title: 'Convocation PDF téléchargée' }); });
    }).catch(() => { if (iframe.parentNode) document.body.removeChild(iframe); });
  };

  // Génère des résultats aléatoires pour la démo
  const voirResultats = (ex: Examen) => {
    const existing = resultats.filter(r => r.examenId === ex.id);
    if (existing.length === 0) {
      const eleves = ['Diallo Amadou', 'Koné Fatoumata', 'Traoré Ibrahim', 'Coulibaly Mariam', 'Bah Moussa'];
      const gen = eleves.map((e, i) => { const n = parseFloat((8 + Math.random() * 12).toFixed(1)); return { id: `r-${ex.id}-${i}`, examenId: ex.id, eleve: e, note: n, mention: getMention(n) }; });
      setResultats(p => [...p, ...gen]);
    }
    setSelectedExamen(ex);
    setOpenResultats(true);
  };

  const exResultats = resultats.filter(r => r.examenId === selectedExamen?.id);
  const moyResultats = exResultats.length ? (exResultats.reduce((s, r) => s + r.note, 0) / exResultats.length).toFixed(2) : '—';

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><BookOpen className="h-7 w-7 text-primary" />Gestion des Examens</h1>
            <p className="text-muted-foreground mt-1">Planification, convocations et résultats</p>
          </div>
          <div className="flex gap-2 text-sm">
            <div className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-medium">{examens.filter(e => e.statut === 'planifie').length} planifiés</div>
            <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full font-medium">{examens.filter(e => e.statut === 'termine').length} terminés</div>
          </div>
        </div>

        <Tabs defaultValue="examens">
          <TabsList>
            <TabsTrigger value="examens" className="gap-1"><BookOpen className="h-4 w-4" />Examens</TabsTrigger>
            <TabsTrigger value="calendrier" className="gap-1"><Calendar className="h-4 w-4" />Calendrier</TabsTrigger>
          </TabsList>

          {/* ─── Examens ─── */}
          <TabsContent value="examens" className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 justify-between">
              <div className="flex gap-2 flex-wrap">
                <div className="relative w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9 h-9" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={filterStatut} onValueChange={setFilterStatut}>
                  <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="Statut" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="planifie">Planifié</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="termine">Terminé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" className="gap-1 shrink-0" onClick={() => { setEditExamen(null); setForm({ ...FORM_INIT }); setOpenExamen(true); }}>
                <Plus className="h-4 w-4" />Créer un examen
              </Button>
            </div>

            {filtered.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground italic">Aucun examen trouvé.</CardContent></Card>
            ) : (
              <div className="overflow-x-auto rounded-xl border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 border-b">
                    <tr>
                      <th className="p-3 text-left">Examen</th>
                      <th className="p-3 text-left">Matière / Classe</th>
                      <th className="p-3 text-left">Date & Horaire</th>
                      <th className="p-3 text-left">Salle</th>
                      <th className="p-3 text-center">Statut</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(e => (
                      <tr key={e.id} className="border-b hover:bg-muted/20">
                        <td className="p-3">
                          <p className="font-medium">{e.titre}</p>
                          <p className="text-xs text-muted-foreground capitalize">{e.type} — coeff. {e.coeff}</p>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">{e.matiere}<br />{e.classe}</td>
                        <td className="p-3 text-xs">{new Date(e.date).toLocaleDateString('fr-FR')}<br />{e.heureDebut}–{e.heureFin}</td>
                        <td className="p-3 text-xs text-muted-foreground">{e.salle || '—'}</td>
                        <td className="p-3 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statutColor(e.statut)}`}>{e.statut}</span>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1 justify-center flex-wrap">
                            <Button size="sm" variant="outline" className="h-6 text-[10px] px-1.5" onClick={() => exportConvocation(e)}><Download className="h-3 w-3 mr-0.5" />Conv.</Button>
                            {e.statut === 'termine' && <Button size="sm" variant="outline" className="h-6 text-[10px] px-1.5" onClick={() => voirResultats(e)}><CheckCircle2 className="h-3 w-3 mr-0.5" />Résultats</Button>}
                            {e.statut === 'planifie' && <Button size="sm" variant="outline" className="h-6 text-[10px] px-1.5" onClick={() => changeStatut(e.id, 'en_cours')}><Clock className="h-3 w-3 mr-0.5" />Démarrer</Button>}
                            {e.statut === 'en_cours' && <Button size="sm" className="h-6 text-[10px] px-1.5" onClick={() => changeStatut(e.id, 'termine')}><CheckCircle2 className="h-3 w-3 mr-0.5" />Terminer</Button>}
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditExamen(e); setForm({ titre: e.titre, matiere: e.matiere, classe: e.classe, date: e.date, heureDebut: e.heureDebut, heureFin: e.heureFin, salle: e.salle, type: e.type as ExamenType, coeff: String(e.coeff) }); setOpenExamen(true); }}><Edit className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => deleteExamen(e.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ─── Calendrier ─── */}
          <TabsContent value="calendrier" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...examens].sort((a, b) => a.date.localeCompare(b.date)).map(e => (
                <Card key={e.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 pb-3 px-4 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm leading-tight">{e.titre}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${statutColor(e.statut)}`}>{e.statut}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{e.classe} — {e.matiere}</p>
                    <div className="flex items-center gap-2 text-xs text-primary font-medium">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(e.date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })} · {e.heureDebut}–{e.heureFin}
                    </div>
                    {e.salle && <p className="text-xs text-muted-foreground">{e.salle}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialog Examen */}
        <Dialog open={openExamen} onOpenChange={setOpenExamen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editExamen ? 'Modifier l\'examen' : 'Créer un examen'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Titre *</Label><Input value={form.titre} onChange={e => setForm(p => ({ ...p, titre: e.target.value }))} placeholder="Composition Maths T2" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Matière</Label>
                  <Select value={form.matiere} onValueChange={v => setForm(p => ({ ...p, matiere: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MATIERES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-1"><Label>Classe</Label>
                  <Select value={form.classe} onValueChange={v => setForm(p => ({ ...p, classe: v }))}><SelectTrigger><SelectValue placeholder="Choisir une classe" /></SelectTrigger><SelectContent>{classesList.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1"><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Début</Label><Input type="time" value={form.heureDebut} onChange={e => setForm(p => ({ ...p, heureDebut: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Fin</Label><Input type="time" value={form.heureFin} onChange={e => setForm(p => ({ ...p, heureFin: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-2"><Label>Salle</Label><Input placeholder="Salle 101" value={form.salle} onChange={e => setForm(p => ({ ...p, salle: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Coeff.</Label><Input type="number" min={1} value={form.coeff} onChange={e => setForm(p => ({ ...p, coeff: e.target.value }))} /></div>
              </div>
              <div className="space-y-1"><Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v as Examen['type'] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpenExamen(false)}>Annuler</Button><Button onClick={saveExamen}>{editExamen ? 'Enregistrer' : 'Créer'}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Résultats */}
        <Dialog open={openResultats} onOpenChange={setOpenResultats}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Résultats — {selectedExamen?.titre}</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Moyenne de classe : <strong className="text-foreground">{moyResultats} / 20</strong></p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {exResultats.sort((a, b) => b.note - a.note).map((r, i) => (
                <div key={r.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <span className="text-muted-foreground text-xs w-6">{i + 1}.</span>
                  <span className="flex-1 font-medium">{r.eleve}</span>
                  <span className={`font-bold w-10 text-center ${r.note >= 10 ? 'text-green-600' : 'text-red-600'}`}>{r.note}</span>
                  <Badge variant="outline" className="text-[10px] ml-2">{r.mention}</Badge>
                </div>
              ))}
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpenResultats(false)}>Fermer</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </Layout>
  );
}
