/**
 * Gestion des Salles & Emploi du Temps
 * Onglets : Salles | Planning hebdomadaire | Réservations
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  DoorOpen, Plus, Edit, Trash2, Calendar, Clock,
  AlertTriangle, CheckCircle2, Search, BookOpen, Users, Printer,
} from 'lucide-react';
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
import { printSchedule } from '@/lib/printSchedule';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Salle {
  id: string;
  nom: string;
  capacite: number;
  type: string;
  batiment: string;
  etage: string;
  equipements: string;
  statut: 'disponible' | 'occupee' | 'maintenance';
}

interface Creneau {
  id: string;
  salleId: string;
  classeId: string;
  matiere: string;
  enseignant: string;
  jour: number; // 0=Lundi … 4=Vendredi
  heureDebut: string;
  heureFin: string;
  couleur: string;
}

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const HEURES = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const COULEURS = ['bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-purple-100 text-purple-800', 'bg-amber-100 text-amber-800', 'bg-rose-100 text-rose-800', 'bg-cyan-100 text-cyan-800'];
const TYPES_SALLE = ['classe', 'labo', 'salle_info', 'bibliotheque', 'salle_reunion', 'gymnase', 'autre'];

type StatutSalle = 'disponible' | 'occupee' | 'maintenance';
type FormSalle = { nom: string; capacite: string; type: string; batiment: string; etage: string; equipements: string; statut: StatutSalle };
const FORM_SALLE_INIT: FormSalle = { nom: '', capacite: '30', type: 'classe', batiment: '', etage: 'RDC', equipements: '', statut: 'disponible' };
const FORM_CRENEAU_INIT = { salleId: '', classeId: '', matiere: '', enseignant: '', jour: '0', heureDebut: '07:00', heureFin: '08:00', couleur: COULEURS[0] };

// ─── Composant Principal ─────────────────────────────────────────────────────

export default function SallesSpace() {
  const { toast } = useToast();

  const [salles, setSalles] = useState<Salle[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [creneaux, setCreneaux] = useState<Creneau[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [filterSalle, setFilterSalle] = useState('all');
  const [filterClasse, setFilterClasse] = useState('all');

  const [openSalle, setOpenSalle] = useState(false);
  const [editSalle, setEditSalle] = useState<Salle | null>(null);
  const [formSalle, setFormSalle] = useState<FormSalle>({ ...FORM_SALLE_INIT });

  const [openCreneau, setOpenCreneau] = useState(false);
  const [editCreneau, setEditCreneau] = useState<Creneau | null>(null);
  const [formCreneau, setFormCreneau] = useState({ ...FORM_CRENEAU_INIT });

  // Ref pour l'impression du planning
  const planningRef = useRef<HTMLDivElement>(null);

  // ─── Chargement ────────────────────────────────────────────────────────────

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([apiClient.getSalles(), apiClient.getClasses()]);
      const mapped: Salle[] = (s || []).map((x: any) => ({
        id: String(x.id),
        nom: x.nom || x.libelle || x.name || '',
        capacite: Number(x.capacite) || 30,
        type: x.type || x.type_salle || 'classe',
        batiment: x.batiment || '',
        etage: x.etage || 'RDC',
        equipements: x.equipements || x.description || '',
        statut: x.statut || (x.disponible === true ? 'disponible' : (x.disponible === false ? 'occupee' : 'disponible')),
      }));
      setSalles(mapped);
      setClasses(c || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ─── Salles CRUD ───────────────────────────────────────────────────────────

  const saveSalle = async () => {
    if (!formSalle.nom) { toast({ variant: 'destructive', title: 'Nom de la salle requis' }); return; }
    const payload = { nom: formSalle.nom, capacite: Number(formSalle.capacite), type: formSalle.type, batiment: formSalle.batiment, etage: formSalle.etage, equipements: formSalle.equipements, statut: formSalle.statut };
    try {
      if (editSalle) {
        await apiClient.updateSalle(editSalle.id, payload);
        toast({ title: 'Salle mise à jour' });
      } else {
        await apiClient.createSalle(payload);
        toast({ title: 'Salle ajoutée' });
      }
      setOpenSalle(false);
      setEditSalle(null);
      setFormSalle({ ...FORM_SALLE_INIT });
      await loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.response?.data?.detail || String(err) });
    }
  };

  const deleteSalle = async (id: string) => {
    try {
      await apiClient.deleteSalle(id);
      toast({ title: 'Salle supprimée' });
      await loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur de suppression', description: err.response?.data?.detail || String(err) });
    }
  };

  // ─── Créneaux (local, pas d'API dédiée — stocké en state) ─────────────────

  const detectConflict = (c: Omit<Creneau, 'id'>, excludeId?: string) => {
    return creneaux.some(x => {
      if (x.id === excludeId) return false;
      if (x.salleId !== c.salleId || x.jour !== c.jour) return false;
      return c.heureDebut < x.heureFin && c.heureFin > x.heureDebut;
    });
  };

  const saveCreneau = () => {
    if (!formCreneau.salleId || !formCreneau.classeId || !formCreneau.matiere) {
      toast({ variant: 'destructive', title: 'Salle, classe et matière requis' }); return;
    }
    if (formCreneau.heureDebut >= formCreneau.heureFin) {
      toast({ variant: 'destructive', title: 'Heure de fin doit être après heure de début' }); return;
    }
    const data = { salleId: formCreneau.salleId, classeId: formCreneau.classeId, matiere: formCreneau.matiere, enseignant: formCreneau.enseignant, jour: Number(formCreneau.jour), heureDebut: formCreneau.heureDebut, heureFin: formCreneau.heureFin, couleur: formCreneau.couleur };
    if (detectConflict(data, editCreneau?.id)) {
      toast({ variant: 'destructive', title: 'Conflit détecté', description: 'Cette salle est déjà occupée sur ce créneau.' }); return;
    }
    if (editCreneau) {
      setCreneaux(p => p.map(x => x.id === editCreneau.id ? { ...data, id: editCreneau.id } : x));
      toast({ title: 'Créneau mis à jour' });
    } else {
      setCreneaux(p => [...p, { ...data, id: `cr-${Date.now()}` }]);
      toast({ title: 'Créneau ajouté' });
    }
    setOpenCreneau(false);
    setEditCreneau(null);
    setFormCreneau({ ...FORM_CRENEAU_INIT });
  };

  const deleteCreneau = (id: string) => {
    setCreneaux(p => p.filter(x => x.id !== id));
    toast({ title: 'Créneau supprimé' });
  };

  // ─── Dérivés ───────────────────────────────────────────────────────────────

  const filteredSalles = useMemo(() => {
    return salles.filter(s =>
      s.nom.toLowerCase().includes(search.toLowerCase()) ||
      s.batiment.toLowerCase().includes(search.toLowerCase()) ||
      s.type.toLowerCase().includes(search.toLowerCase())
    );
  }, [salles, search]);

  const creneauxFiltered = useMemo(() => {
    let list = creneaux;
    if (filterSalle !== 'all') list = list.filter(c => c.salleId === filterSalle);
    if (filterClasse !== 'all') list = list.filter(c => c.classeId === filterClasse);
    return list;
  }, [creneaux, filterSalle, filterClasse]);

  const conflicts = useMemo(() => {
    const seen: string[] = [];
    return creneaux.filter(c => {
      const others = creneaux.filter(x => x.id !== c.id && x.salleId === c.salleId && x.jour === c.jour && c.heureDebut < x.heureFin && c.heureFin > x.heureDebut);
      if (others.length > 0 && !seen.includes(c.id)) { seen.push(c.id); return true; }
      return false;
    });
  }, [creneaux]);

  const getSalle = (id: string) => salles.find(s => s.id === id);
  const getClasse = (id: string) => classes.find(c => String(c.id) === id);

  const statutColor = (s: string) => s === 'disponible' ? 'bg-green-100 text-green-700' : s === 'occupee' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';

  // ─── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><DoorOpen className="h-7 w-7 text-primary" />Salles & Emploi du Temps</h1>
            <p className="text-muted-foreground mt-1">Gestion des salles et planification hebdomadaire des cours</p>
          </div>
          <div className="flex gap-2 text-sm">
            <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full font-medium">{salles.filter(s => s.statut === 'disponible').length} dispo.</div>
            <div className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-medium">{creneaux.length} créneaux</div>
            {conflicts.length > 0 && <div className="bg-red-50 text-red-700 px-3 py-1 rounded-full font-medium flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />{conflicts.length} conflit(s)</div>}
          </div>
        </div>

        <Tabs defaultValue="salles">
          <TabsList>
            <TabsTrigger value="salles" className="gap-1"><DoorOpen className="h-4 w-4" />Salles</TabsTrigger>
            <TabsTrigger value="planning" className="gap-1"><Calendar className="h-4 w-4" />Planning hebdo</TabsTrigger>
            <TabsTrigger value="reservations" className="gap-1"><BookOpen className="h-4 w-4" />Réservations{conflicts.length > 0 && <Badge variant="destructive" className="ml-1 text-[10px] h-4 px-1">{conflicts.length}</Badge>}</TabsTrigger>
          </TabsList>

          {/* ─── ONGLET SALLES ─────────────────────────────────────────────── */}
          <TabsContent value="salles" className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 justify-between">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Rechercher une salle…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Button size="sm" className="gap-1 shrink-0" onClick={() => { setEditSalle(null); setFormSalle({ ...FORM_SALLE_INIT }); setOpenSalle(true); }}>
                <Plus className="h-4 w-4" />Ajouter une salle
              </Button>
            </div>

            {loading ? (
              <p className="text-center text-muted-foreground py-12">Chargement…</p>
            ) : filteredSalles.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground italic">Aucune salle trouvée.</CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSalles.map(s => (
                  <Card key={s.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4 pb-3 px-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-base">{s.nom}</p>
                          <p className="text-xs text-muted-foreground">{s.batiment}{s.etage ? ` — ${s.etage}` : ''}</p>
                        </div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${statutColor(s.statut)}`}>{s.statut}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{s.capacite} places</span>
                        <span className="capitalize">{s.type.replace('_', ' ')}</span>
                      </div>
                      {s.equipements && <p className="text-xs text-muted-foreground truncate">{s.equipements}</p>}
                      <div className="flex gap-1 pt-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditSalle(s); setFormSalle({ nom: s.nom, capacite: String(s.capacite), type: s.type, batiment: s.batiment, etage: s.etage, equipements: s.equipements, statut: (s.statut as StatutSalle) }); setOpenSalle(true); }}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => deleteSalle(s.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── ONGLET PLANNING ───────────────────────────────────────────── */}
          <TabsContent value="planning" className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                <Select value={filterSalle} onValueChange={setFilterSalle}>
                  <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Toutes les salles" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les salles</SelectItem>
                    {salles.map(s => <SelectItem key={s.id} value={s.id}>{s.nom}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterClasse} onValueChange={setFilterClasse}>
                  <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Toutes les classes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les classes</SelectItem>
                    {classes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1 border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 font-semibold" onClick={() => printSchedule(planningRef.current, 'Planning hebdomadaire des cours')}>
                  <Printer className="h-4 w-4 text-indigo-600" />
                  Imprimer le planning
                </Button>
                <Button size="sm" className="gap-1" onClick={() => { setEditCreneau(null); setFormCreneau({ ...FORM_CRENEAU_INIT }); setOpenCreneau(true); }}>
                  <Plus className="h-4 w-4" />Ajouter un créneau
                </Button>
              </div>
            </div>

            {/* Grille hebdomadaire */}
            <div ref={planningRef} className="overflow-x-auto rounded-xl border bg-card p-4">
              <table className="w-full min-w-[700px] text-xs">
                <thead className="bg-muted/60 border-b">
                  <tr>
                    <th className="p-3 text-left font-medium w-20 text-muted-foreground">Heure</th>
                    {JOURS.map(j => <th key={j} className="p-3 text-center font-medium">{j}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {HEURES.slice(0, -1).map((h, hi) => (
                    <tr key={h} className="border-b">
                      <td className="p-2 text-muted-foreground font-mono text-[11px] align-top">{h}</td>
                      {JOURS.map((_, ji) => {
                        const slot = creneauxFiltered.filter(c => c.jour === ji && c.heureDebut <= h && c.heureFin > h);
                        return (
                          <td key={ji} className="p-1 align-top min-w-[130px] h-14 border-l">
                            {slot.map(c => (
                              <div key={c.id} className={`rounded p-1.5 mb-0.5 cursor-pointer group relative ${c.couleur}`} onClick={() => { setEditCreneau(c); setFormCreneau({ salleId: c.salleId, classeId: c.classeId, matiere: c.matiere, enseignant: c.enseignant, jour: String(c.jour), heureDebut: c.heureDebut, heureFin: c.heureFin, couleur: c.couleur }); setOpenCreneau(true); }}>
                                <p className="font-semibold truncate">{c.matiere}</p>
                                <p className="text-[10px] truncate">{getSalle(c.salleId)?.nom || c.salleId}</p>
                                <p className="text-[10px] truncate">{getClasse(c.classeId)?.name || c.classeId}</p>
                                <button className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 text-destructive" onClick={e => { e.stopPropagation(); deleteCreneau(c.id); }}><Trash2 className="h-3 w-3" /></button>
                              </div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ─── ONGLET RÉSERVATIONS ───────────────────────────────────────── */}
          <TabsContent value="reservations" className="mt-4 space-y-4">
            {conflicts.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                <p className="font-semibold text-red-800 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{conflicts.length} conflit(s) de planning détecté(s)</p>
                {conflicts.map(c => (
                  <div key={c.id} className="text-sm text-red-700 bg-white border border-red-100 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                    <span>{getSalle(c.salleId)?.nom} — {JOURS[c.jour]} {c.heureDebut}→{c.heureFin} — {c.matiere} ({getClasse(c.classeId)?.name})</span>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0" onClick={() => deleteCreneau(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <p className="font-semibold text-sm">Tous les créneaux planifiés ({creneaux.length})</p>
              {creneaux.length === 0 ? (
                <Card><CardContent className="py-10 text-center text-muted-foreground italic">Aucun créneau planifié.</CardContent></Card>
              ) : (
                <div className="overflow-x-auto rounded-xl border bg-card">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60 border-b">
                      <tr>
                        <th className="p-3 text-left">Jour</th>
                        <th className="p-3 text-left">Heure</th>
                        <th className="p-3 text-left">Salle</th>
                        <th className="p-3 text-left">Classe</th>
                        <th className="p-3 text-left">Matière</th>
                        <th className="p-3 text-left">Enseignant</th>
                        <th className="p-3 text-center">Conflit</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...creneaux].sort((a, b) => a.jour - b.jour || a.heureDebut.localeCompare(b.heureDebut)).map(c => {
                        const hasConflict = conflicts.some(x => x.id === c.id);
                        return (
                          <tr key={c.id} className={`border-b hover:bg-muted/20 ${hasConflict ? 'bg-red-50' : ''}`}>
                            <td className="p-3 font-medium">{JOURS[c.jour]}</td>
                            <td className="p-3 font-mono">{c.heureDebut}–{c.heureFin}</td>
                            <td className="p-3">{getSalle(c.salleId)?.nom || c.salleId}</td>
                            <td className="p-3">{getClasse(c.classeId)?.name || c.classeId}</td>
                            <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${c.couleur}`}>{c.matiere}</span></td>
                            <td className="p-3 text-muted-foreground">{c.enseignant || '—'}</td>
                            <td className="p-3 text-center">{hasConflict ? <AlertTriangle className="h-4 w-4 text-red-500 mx-auto" /> : <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />}</td>
                            <td className="p-3 text-center">
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditCreneau(c); setFormCreneau({ salleId: c.salleId, classeId: c.classeId, matiere: c.matiere, enseignant: c.enseignant, jour: String(c.jour), heureDebut: c.heureDebut, heureFin: c.heureFin, couleur: c.couleur }); setOpenCreneau(true); }}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => deleteCreneau(c.id)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* ─── Dialog Salle ─────────────────────────────────────────────────── */}
        <Dialog open={openSalle} onOpenChange={setOpenSalle}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editSalle ? 'Modifier la salle' : 'Ajouter une salle'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Nom de la salle *</Label>
                  <Input placeholder="Salle 101" value={formSalle.nom} onChange={e => setFormSalle(p => ({ ...p, nom: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Capacité</Label>
                  <Input type="number" min={1} value={formSalle.capacite} onChange={e => setFormSalle(p => ({ ...p, capacite: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={formSalle.type} onValueChange={v => setFormSalle(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES_SALLE.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Statut</Label>
                  <Select value={formSalle.statut} onValueChange={v => setFormSalle(p => ({ ...p, statut: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disponible">Disponible</SelectItem>
                      <SelectItem value="occupee">Occupée</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Bâtiment</Label>
                  <Input placeholder="Bâtiment A" value={formSalle.batiment} onChange={e => setFormSalle(p => ({ ...p, batiment: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Étage</Label>
                  <Input placeholder="RDC" value={formSalle.etage} onChange={e => setFormSalle(p => ({ ...p, etage: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Équipements</Label>
                <Input placeholder="Tableau, projecteur, climatisation…" value={formSalle.equipements} onChange={e => setFormSalle(p => ({ ...p, equipements: e.target.value }))} />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setOpenSalle(false)}>Annuler</Button>
              <Button onClick={saveSalle}>{editSalle ? 'Enregistrer' : 'Ajouter'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Dialog Créneau ───────────────────────────────────────────────── */}
        <Dialog open={openCreneau} onOpenChange={setOpenCreneau}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editCreneau ? 'Modifier le créneau' : 'Ajouter un créneau'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Salle *</Label>
                  <Select value={formCreneau.salleId} onValueChange={v => setFormCreneau(p => ({ ...p, salleId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>{salles.map(s => <SelectItem key={s.id} value={s.id}>{s.nom}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Classe *</Label>
                  <Select value={formCreneau.classeId} onValueChange={v => setFormCreneau(p => ({ ...p, classeId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>{classes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Matière *</Label>
                  <Input placeholder="Mathématiques" value={formCreneau.matiere} onChange={e => setFormCreneau(p => ({ ...p, matiere: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Enseignant</Label>
                  <Input placeholder="Nom de l'enseignant" value={formCreneau.enseignant} onChange={e => setFormCreneau(p => ({ ...p, enseignant: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Jour</Label>
                <Select value={formCreneau.jour} onValueChange={v => setFormCreneau(p => ({ ...p, jour: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{JOURS.map((j, i) => <SelectItem key={i} value={String(i)}>{j}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Heure début</Label>
                  <Select value={formCreneau.heureDebut} onValueChange={v => setFormCreneau(p => ({ ...p, heureDebut: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{HEURES.slice(0, -1).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Heure fin</Label>
                  <Select value={formCreneau.heureFin} onValueChange={v => setFormCreneau(p => ({ ...p, heureFin: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{HEURES.slice(1).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Couleur</Label>
                <div className="flex gap-2 flex-wrap">
                  {COULEURS.map(c => (
                    <button key={c} onClick={() => setFormCreneau(p => ({ ...p, couleur: c }))} className={`px-3 py-1 rounded-full text-xs font-medium border-2 ${c} ${formCreneau.couleur === c ? 'border-gray-800' : 'border-transparent'}`}>Aa</button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setOpenCreneau(false)}>Annuler</Button>
              <Button onClick={saveCreneau}>{editCreneau ? 'Enregistrer' : 'Ajouter'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </Layout>
  );
}
