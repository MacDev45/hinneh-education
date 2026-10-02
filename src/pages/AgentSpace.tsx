/**
 * Espace Agent — Rapport journalier & Signalement des dysfonctionnements
 * Profil : Agent (§1.4)
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, FileText, AlertTriangle, CheckCircle2,
  Clock, Plus, MapPin, Eye, Send, Calendar,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface RapportJournalier {
  id: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  zone: string;
  observations: string;
  incidents: string;
  effectif_present: number;
  statut: 'brouillon' | 'soumis';
}

interface Signalement {
  id: string;
  date: string;
  type: 'infrastructure' | 'securite' | 'hygiene' | 'equipement' | 'autre';
  localisation: string;
  description: string;
  priorite: 'basse' | 'normale' | 'haute' | 'urgente';
  statut: 'en_attente' | 'pris_en_charge' | 'resolu';
  photoUrl?: string;
}

const typeSignalementLabels: Record<string, string> = {
  infrastructure: '🏗 Infrastructure',
  securite: '🔒 Sécurité',
  hygiene: '🧹 Hygiène',
  equipement: '🔧 Équipement',
  autre: '📋 Autre',
};

const prioriteConfig = {
  basse: { label: 'Basse', className: 'bg-gray-100 text-gray-700' },
  normale: { label: 'Normale', className: 'bg-blue-100 text-blue-700' },
  haute: { label: 'Haute', className: 'bg-amber-100 text-amber-700' },
  urgente: { label: 'URGENTE', className: 'bg-red-100 text-red-700 font-bold' },
};

const statutSignalConfig = {
  en_attente: { label: 'En attente', variant: 'secondary' as const },
  pris_en_charge: { label: 'Pris en charge', variant: 'default' as const },
  resolu: { label: 'Résolu', variant: 'default' as const },
};

export default function AgentSpace() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('rapport');
  const [rapports, setRapports] = useState<RapportJournalier[]>([]);
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [openSignal, setOpenSignal] = useState(false);
  const [openRapport, setOpenRapport] = useState(false);
  const [viewRapport, setViewRapport] = useState<RapportJournalier | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toTimeString().slice(0, 5);

  const emptyRapport = { date: today, heure_debut: now, heure_fin: '', zone: '', observations: '', incidents: '', effectif_present: 0 };
  const emptySignal = { date: today, type: 'infrastructure' as Signalement['type'], localisation: '', description: '', priorite: 'normale' as Signalement['priorite'] };

  const [formRapport, setFormRapport] = useState(emptyRapport);
  const [formSignal, setFormSignal] = useState(emptySignal);

  const handleSubmitRapport = (brouillon = false) => {
    if (!formRapport.zone || !formRapport.observations) {
      toast({ variant: 'destructive', title: 'Champs requis', description: 'Zone et observations obligatoires.' });
      return;
    }
    const r: RapportJournalier = {
      id: `rj-${Date.now()}`,
      ...formRapport,
      statut: brouillon ? 'brouillon' : 'soumis',
    };
    setRapports(prev => [r, ...prev]);
    toast({ title: brouillon ? 'Rapport sauvegardé en brouillon.' : 'Rapport journalier soumis.' });
    setFormRapport(emptyRapport);
    setOpenRapport(false);
  };

  const handleSubmitSignal = () => {
    if (!formSignal.localisation || !formSignal.description) {
      toast({ variant: 'destructive', title: 'Champs requis', description: 'Localisation et description obligatoires.' });
      return;
    }
    const s: Signalement = {
      id: `sig-${Date.now()}`,
      ...formSignal,
      statut: 'en_attente',
    };
    setSignalements(prev => [s, ...prev]);
    toast({ title: 'Signalement enregistré.', description: `Priorité ${prioriteConfig[formSignal.priorite].label} — en attente de traitement.` });
    setFormSignal(emptySignal);
    setOpenSignal(false);
  };

  const stats = {
    rapports: rapports.length,
    rapportsSoumis: rapports.filter(r => r.statut === 'soumis').length,
    signalements: signalements.length,
    signalementsUrgents: signalements.filter(s => s.priorite === 'urgente' && s.statut === 'en_attente').length,
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 space-y-6 max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" />
              Espace Agent
            </h1>
            <p className="text-muted-foreground mt-1">Rapports journaliers et signalements de dysfonctionnements</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => { setFormRapport(emptyRapport); setOpenRapport(true); }}>
              <FileText className="h-4 w-4" /> Nouveau rapport
            </Button>
            <Button className="gap-2" onClick={() => { setFormSignal(emptySignal); setOpenSignal(true); }}>
              <AlertTriangle className="h-4 w-4" /> Signalement
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Rapports rédigés', value: stats.rapports, icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Rapports soumis', value: stats.rapportsSoumis, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
            { label: 'Signalements', value: stats.signalements, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
            { label: 'Urgences en attente', value: stats.signalementsUrgents, icon: Shield, color: 'text-destructive', bg: 'bg-destructive/10' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="rapport" className="gap-1"><FileText className="h-4 w-4" />Rapports journaliers</TabsTrigger>
            <TabsTrigger value="signalements" className="gap-1">
              <AlertTriangle className="h-4 w-4" />
              Signalements
              {stats.signalementsUrgents > 0 && (
                <span className="ml-1 bg-destructive text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">{stats.signalementsUrgents}</span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Rapports */}
          <TabsContent value="rapport" className="mt-4">
            {rapports.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground italic">
                  Aucun rapport rédigé. Cliquez sur "Nouveau rapport" pour commencer.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {rapports.map(r => (
                  <Card key={r.id} className={`border-l-4 ${r.statut === 'soumis' ? 'border-l-green-500' : 'border-l-amber-400'}`}>
                    <CardContent className="p-4 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{r.date}</span>
                          <span className="text-xs text-muted-foreground">{r.heure_debut}{r.heure_fin ? ` → ${r.heure_fin}` : ''}</span>
                          <Badge variant={r.statut === 'soumis' ? 'default' : 'secondary'}>
                            {r.statut === 'soumis' ? 'Soumis' : 'Brouillon'}
                          </Badge>
                        </div>
                        <p className="text-sm flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{r.zone}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{r.observations}</p>
                        {r.incidents && <p className="text-xs text-destructive">⚠ Incidents : {r.incidents}</p>}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setViewRapport(r)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Signalements */}
          <TabsContent value="signalements" className="mt-4">
            {signalements.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground italic">
                  Aucun signalement enregistré.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {signalements.map(s => (
                  <Card key={s.id} className={`border-l-4 ${s.priorite === 'urgente' ? 'border-l-destructive' : s.priorite === 'haute' ? 'border-l-amber-500' : 'border-l-border'}`}>
                    <CardContent className="p-4 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{typeSignalementLabels[s.type]}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${prioriteConfig[s.priorite].className}`}>
                            {prioriteConfig[s.priorite].label}
                          </span>
                          <Badge variant={statutSignalConfig[s.statut].variant}>{statutSignalConfig[s.statut].label}</Badge>
                        </div>
                        <p className="text-xs flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" />{s.localisation}</p>
                        <p className="text-sm">{s.description}</p>
                        <p className="text-xs text-muted-foreground">{s.date}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Dialog Nouveau rapport */}
      <Dialog open={openRapport} onOpenChange={setOpenRapport}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader><DialogTitle>Rapport journalier de patrouille</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2 max-h-[65vh] overflow-y-auto px-1">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={formRapport.date} onChange={e => setFormRapport(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Heure début</Label>
                <Input type="time" value={formRapport.heure_debut} onChange={e => setFormRapport(p => ({ ...p, heure_debut: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Heure fin</Label>
                <Input type="time" value={formRapport.heure_fin} onChange={e => setFormRapport(p => ({ ...p, heure_fin: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Zone / Secteur *</Label>
                <Input placeholder="ex: Entrée principale, Cour, Cantine..." value={formRapport.zone} onChange={e => setFormRapport(p => ({ ...p, zone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Effectif présent</Label>
                <Input type="number" min={0} value={formRapport.effectif_present} onChange={e => setFormRapport(p => ({ ...p, effectif_present: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observations générales *</Label>
              <Textarea rows={3} placeholder="Déroulement de la patrouille, comportements, présences..." value={formRapport.observations} onChange={e => setFormRapport(p => ({ ...p, observations: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Incidents signalés</Label>
              <Textarea rows={2} placeholder="Incidents, anomalies constatées..." value={formRapport.incidents} onChange={e => setFormRapport(p => ({ ...p, incidents: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenRapport(false)}>Annuler</Button>
            <Button variant="secondary" onClick={() => handleSubmitRapport(true)}>Sauvegarder brouillon</Button>
            <Button className="gap-1" onClick={() => handleSubmitRapport(false)}>
              <Send className="h-4 w-4" />Soumettre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Signalement */}
      <Dialog open={openSignal} onOpenChange={setOpenSignal}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>Signaler un dysfonctionnement</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Type *</Label>
                <Select value={formSignal.type} onValueChange={v => setFormSignal(p => ({ ...p, type: v as Signalement['type'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="infrastructure">Infrastructure</SelectItem>
                    <SelectItem value="securite">Sécurité</SelectItem>
                    <SelectItem value="hygiene">Hygiène</SelectItem>
                    <SelectItem value="equipement">Équipement</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Priorité</Label>
                <Select value={formSignal.priorite} onValueChange={v => setFormSignal(p => ({ ...p, priorite: v as Signalement['priorite'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basse">Basse</SelectItem>
                    <SelectItem value="normale">Normale</SelectItem>
                    <SelectItem value="haute">Haute</SelectItem>
                    <SelectItem value="urgente">🚨 Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Localisation *</Label>
              <Input placeholder="ex: Toilettes bloc A, Portail nord, Cantine..." value={formSignal.localisation} onChange={e => setFormSignal(p => ({ ...p, localisation: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Description *</Label>
              <Textarea rows={3} placeholder="Décrivez précisément le dysfonctionnement observé..." value={formSignal.description} onChange={e => setFormSignal(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={formSignal.date} onChange={e => setFormSignal(p => ({ ...p, date: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSignal(false)}>Annuler</Button>
            <Button className="gap-1" onClick={handleSubmitSignal}>
              <AlertTriangle className="h-4 w-4" />Enregistrer le signalement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog détail rapport */}
      {viewRapport && (
        <Dialog open={!!viewRapport} onOpenChange={() => setViewRapport(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Rapport — {viewRapport.date}</DialogTitle></DialogHeader>
            <div className="space-y-2 text-sm">
              <p><span className="font-semibold">Horaires :</span> {viewRapport.heure_debut} → {viewRapport.heure_fin || 'N/A'}</p>
              <p><span className="font-semibold">Zone :</span> {viewRapport.zone}</p>
              <p><span className="font-semibold">Effectif présent :</span> {viewRapport.effectif_present}</p>
              <div>
                <p className="font-semibold">Observations :</p>
                <p className="text-muted-foreground whitespace-pre-wrap">{viewRapport.observations}</p>
              </div>
              {viewRapport.incidents && (
                <div>
                  <p className="font-semibold text-destructive">Incidents :</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">{viewRapport.incidents}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewRapport(null)}>Fermer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  );
}
