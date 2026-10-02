import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, UserPlus, TrendingUp, Phone, Mail, MessageSquare,
  Search, Filter, MoreVertical, Eye, Edit, Trash2,
  Star, Tag, MapPin, Calendar, Building2, ChevronRight,
  Download, Plus, BarChart3, Gift, CheckSquare, Megaphone,
  Target, Activity, ArrowUpRight, ArrowDownRight, Clock,
  Inbox, Send, PhoneCall, Video, FileText
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import type {
  CRMContact, CRMLead, CRMTask, CRMCampaign, School
} from '@/lib/index';
import { formatStudentName } from '@/lib/index';

const mockCRMContacts: CRMContact[] = [];
const mockCRMLeads: CRMLead[] = [];
const mockCRMInteractions: any[] = [];
const mockCRMTasks: CRMTask[] = [];
const mockCRMCampaigns: CRMCampaign[] = [];
const mockCRMDonations: any[] = [];
const mockSchools: School[] = [];
import { ROUTE_PATHS, formatCurrency, formatDate } from '@/lib/index';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const contactTypeLabels: Record<CRMContact['type'], string> = {
  parent: 'Parent',
  prospect_parent: 'Prospect',
  donateur: 'Donateur',
  partenaire: 'Partenaire',
  institution: 'Institution',
  media: 'Média',
  alumni: 'Alumni',
  autre: 'Autre',
};

const contactTypeBadge: Record<CRMContact['type'], string> = {
  parent: 'bg-primary/10 text-primary',
  prospect_parent: 'bg-warning/20 text-yellow-700',
  donateur: 'bg-success/20 text-green-700',
  partenaire: 'bg-purple-100 text-purple-700',
  institution: 'bg-blue-100 text-blue-700',
  media: 'bg-pink-100 text-pink-700',
  alumni: 'bg-orange-100 text-orange-700',
  autre: 'bg-muted text-muted-foreground',
};

const leadStatusLabels: Record<CRMLead['status'], string> = {
  nouveau: 'Nouveau',
  contacte: 'Contacté',
  interesse: 'Intéressé',
  visite_programmee: 'Visite prévue',
  dossier_soumis: 'Dossier soumis',
  inscrit: 'Inscrit ✓',
  perdu: 'Perdu',
  abandonne: 'Abandonné',
};

const leadStatusColor: Record<CRMLead['status'], string> = {
  nouveau: 'bg-muted text-muted-foreground',
  contacte: 'bg-blue-100 text-blue-700',
  interesse: 'bg-yellow-100 text-yellow-700',
  visite_programmee: 'bg-orange-100 text-orange-700',
  dossier_soumis: 'bg-purple-100 text-purple-700',
  inscrit: 'bg-success/20 text-green-700',
  perdu: 'bg-destructive/10 text-destructive',
  abandonne: 'bg-destructive/10 text-destructive',
};

const leadStatusOrder: CRMLead['status'][] = [
  'nouveau', 'contacte', 'interesse', 'visite_programmee',
  'dossier_soumis', 'inscrit',
];

const interactionTypeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  appel: PhoneCall,
  sms: MessageSquare,
  whatsapp: MessageSquare,
  email: Mail,
  visite: MapPin,
  reunion: Video,
  evenement: Calendar,
  note: FileText,
};

const priorityColor: Record<string, string> = {
  haute: 'text-destructive',
  moyenne: 'text-warning',
  basse: 'text-muted-foreground',
};

const campaignStatusColor: Record<CRMCampaign['status'], string> = {
  brouillon: 'bg-muted text-muted-foreground',
  planifiee: 'bg-blue-100 text-blue-700',
  en_cours: 'bg-yellow-100 text-yellow-700',
  terminee: 'bg-success/20 text-green-700',
  annulee: 'bg-destructive/10 text-destructive',
};

const campaignStatusLabel: Record<CRMCampaign['status'], string> = {
  brouillon: 'Brouillon',
  planifiee: 'Planifiée',
  en_cours: 'En cours',
  terminee: 'Terminée',
  annulee: 'Annulée',
};

// ─── KPI Mini Card ────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, trend, color = 'primary' }: {
  label: string; value: string | number; sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number; color?: string;
}) {
  const colorMap: Record<string, string> = {
    primary: 'text-primary bg-primary/10',
    success: 'text-green-600 bg-green-100',
    warning: 'text-yellow-600 bg-yellow-100',
    purple: 'text-purple-600 bg-purple-100',
    destructive: 'text-destructive bg-destructive/10',
  };
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
            <p className="text-2xl font-bold font-mono tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            {trend !== undefined && (
              <p className={`text-xs font-medium mt-1 flex items-center gap-1 ${trend >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(trend)}% ce mois
              </p>
            )}
          </div>
          <div className={`p-2.5 rounded-xl ${colorMap[color] || colorMap.primary}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Contact Card (Kanban) ────────────────────────────────────────────────────

function ContactCard({ contact, onClick }: { contact: CRMContact; onClick: () => void }) {
  const initials = `${contact.firstName[0]}${contact.lastName[0]}`.toUpperCase();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: '0 8px 24px -4px rgba(0,0,0,0.12)' }}
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-4 cursor-pointer transition-all"
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{formatStudentName(contact)}</p>
          <p className="text-xs text-muted-foreground truncate">{contact.profession || contact.organisation || '—'}</p>
          <div className="flex items-center gap-1 mt-1.5">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${contactTypeBadge[contact.type]}`}>
              {contactTypeLabels[contact.type]}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${contact.status === 'actif' ? 'bg-success/20 text-green-700' : 'bg-muted text-muted-foreground'}`}>
              {contact.status}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{contact.phone.slice(-8)}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{contact.city}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Lead Kanban Column ───────────────────────────────────────────────────────

function LeadKanbanColumn({ status, leads, onLeadClick }: {
  status: CRMLead['status'];
  leads: CRMLead[];
  onLeadClick: (lead: CRMLead) => void;
}) {
  const color = leadStatusColor[status];
  const label = leadStatusLabels[status];
  return (
    <div className="flex-shrink-0 w-60 flex flex-col gap-2">
      <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${color}`}>
        <span className="text-xs font-semibold">{label}</span>
        <span className="text-xs font-bold">{leads.length}</span>
      </div>
      <div className="flex flex-col gap-2 min-h-[120px]">
        {leads.slice(0, 6).map((lead) => (
          <motion.div
            key={lead.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => onLeadClick(lead)}
            className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
          >
            <p className="text-xs font-semibold truncate">{lead.childLastName} {lead.childFirstName}</p>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">{lead.desiredCycle}</p>
            <div className="flex items-center justify-between mt-2">
              <span className={`text-xs font-medium ${priorityColor[lead.priority]}`}>● {lead.priority}</span>
              {lead.estimatedValue && (
                <span className="text-xs text-muted-foreground font-mono">{(lead.estimatedValue / 1000).toFixed(0)}k</span>
              )}
            </div>
            {lead.source && (
              <p className="text-xs text-muted-foreground mt-1 truncate">{lead.source.replace(/_/g, ' ')}</p>
            )}
          </motion.div>
        ))}
        {leads.length > 6 && (
          <p className="text-xs text-muted-foreground text-center py-2">+{leads.length - 6} autres</p>
        )}
      </div>
    </div>
  );
}

// ─── Modal Nouveau Contact ────────────────────────────────────────────────────

function NewContactModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ type: 'prospect_parent', firstName: '', lastName: '', phone: '', email: '', city: 'Abidjan', profession: '' });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Nouveau contact CRM
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="col-span-2">
            <Label>Type de contact</Label>
            <Select value={form.type} onValueChange={v => set('type', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(contactTypeLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Prénom *</Label>
            <Input className="mt-1" placeholder="Ibrahim" value={form.firstName} onChange={e => set('firstName', e.target.value)} />
          </div>
          <div>
            <Label>Nom *</Label>
            <Input className="mt-1" placeholder="Traoré" value={form.lastName} onChange={e => set('lastName', e.target.value)} />
          </div>
          <div>
            <Label>Téléphone *</Label>
            <Input className="mt-1" placeholder="+225 07 00 00 00 00" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input className="mt-1" type="email" placeholder="contact@gmail.com" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <Label>Ville</Label>
            <Select value={form.city} onValueChange={v => set('city', v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Abidjan', 'Bouaké', 'Yamoussoukro', 'Daloa', 'San-Pédro', 'Korhogo', 'Man', 'Gagnoa'].map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Profession</Label>
            <Input className="mt-1" placeholder="Commerçant(e)" value={form.profession} onChange={e => set('profession', e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={onClose} className="gap-2"><Plus className="h-4 w-4" />Créer le contact</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal Nouveau Lead ───────────────────────────────────────────────────────

function NewLeadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ childFirstName: '', childLastName: '', childGender: 'M', desiredCycle: 'primaire', source: 'bouche_a_oreille', priority: 'moyenne', contactId: '' });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Nouveau prospect (Lead)
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div>
            <Label>Nom enfant *</Label>
            <Input className="mt-1" placeholder="Nom de famille" value={form.childLastName} onChange={e => set('childLastName', e.target.value)} />
          </div>
          <div>
            <Label>Prénom enfant *</Label>
            <Input className="mt-1" placeholder="Prénom" value={form.childFirstName} onChange={e => set('childFirstName', e.target.value)} />
          </div>
          <div>
            <Label>Genre</Label>
            <Select value={form.childGender} onValueChange={v => set('childGender', v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Masculin</SelectItem>
                <SelectItem value="F">Féminin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cycle souhaité</Label>
            <Select value={form.desiredCycle} onValueChange={v => set('desiredCycle', v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="maternelle">Maternelle</SelectItem>
                <SelectItem value="primaire">Primaire</SelectItem>
                <SelectItem value="college">Collège</SelectItem>
                <SelectItem value="lycee">Collège 2nd cycle</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Source</Label>
            <Select value={form.source} onValueChange={v => set('source', v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bouche_a_oreille">Bouche à oreille</SelectItem>
                <SelectItem value="reseaux_sociaux">Réseaux sociaux</SelectItem>
                <SelectItem value="site_web">Site web</SelectItem>
                <SelectItem value="evenement">Événement</SelectItem>
                <SelectItem value="prospection">Prospection</SelectItem>
                <SelectItem value="partenaire">Partenaire</SelectItem>
                <SelectItem value="presse">Presse</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Priorité</Label>
            <Select value={form.priority} onValueChange={v => set('priority', v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="haute">🔴 Haute</SelectItem>
                <SelectItem value="moyenne">🟡 Moyenne</SelectItem>
                <SelectItem value="basse">🟢 Basse</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={onClose} className="gap-2"><Target className="h-4 w-4" />Créer le lead</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal Interaction ────────────────────────────────────────────────────────

function NewInteractionModal({ open, onClose, contactId }: { open: boolean; onClose: () => void; contactId?: string }) {
  const [form, setForm] = useState({ type: 'appel', direction: 'sortant', subject: '', content: '', outcome: '', nextActionNote: '' });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Enregistrer une interaction
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type d'interaction</Label>
              <Select value={form.type} onValueChange={v => set('type', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['appel', 'sms', 'whatsapp', 'email', 'visite', 'reunion', 'note'].map(t => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Direction</Label>
              <Select value={form.direction} onValueChange={v => set('direction', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sortant">📤 Sortant</SelectItem>
                  <SelectItem value="entrant">📥 Entrant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Objet *</Label>
            <Input className="mt-1" placeholder="Ex: Suivi dossier inscription" value={form.subject} onChange={e => set('subject', e.target.value)} />
          </div>
          <div>
            <Label>Contenu / Notes</Label>
            <Textarea className="mt-1" rows={3} placeholder="Résumé de l'échange..." value={form.content} onChange={e => set('content', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Résultat</Label>
              <Input className="mt-1" placeholder="Ex: Rendez-vous fixé" value={form.outcome} onChange={e => set('outcome', e.target.value)} />
            </div>
            <div>
              <Label>Prochaine action</Label>
              <Input className="mt-1" placeholder="Ex: Rappeler le 15/05" value={form.nextActionNote} onChange={e => set('nextActionNote', e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={onClose} className="gap-2"><Activity className="h-4 w-4" />Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Contact Detail Modal ─────────────────────────────────────────────────────

function ContactDetailModal({ contact, open, onClose }: { contact: CRMContact | null; open: boolean; onClose: () => void }) {
  const [showInteraction, setShowInteraction] = useState(false);
  if (!contact) return null;

  const interactions = mockCRMInteractions.filter(i => i.contactId === contact.id).slice(0, 5);
  const tasks = mockCRMTasks.filter(t => t.contactId === contact.id).slice(0, 3);
  const initials = `${contact.firstName[0]}${contact.lastName[0]}`.toUpperCase();

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fiche contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Header contact */}
            <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-xl">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-lg font-bold">{formatStudentName(contact)}</h2>
                <p className="text-muted-foreground">{contact.profession || contact.organisation || '—'}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${contactTypeBadge[contact.type]}`}>
                    {contactTypeLabels[contact.type]}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${contact.status === 'actif' ? 'bg-success/20 text-green-700' : 'bg-destructive/10 text-destructive'}`}>
                    {contact.status}
                  </span>
                  {contact.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-1 bg-accent rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
              <Button size="sm" className="gap-1" onClick={() => setShowInteraction(true)}>
                <Plus className="h-3 w-3" />Interaction
              </Button>
            </div>

            {/* Coordonnées */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Coordonnées</h3>
                <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" />{contact.phone}</div>
                {contact.phone2 && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" />{contact.phone2}</div>}
                {contact.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" />{contact.email}</div>}
                <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground" />{contact.city}</div>
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Infos</h3>
                {contact.totalDons !== undefined && (
                  <div className="flex items-center gap-2 text-sm"><Gift className="h-4 w-4 text-muted-foreground" />Dons: <span className="font-mono font-medium">{formatCurrency(contact.totalDons)}</span></div>
                )}
                {contact.lastInteractionDate && (
                  <div className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-muted-foreground" />Dernier contact: {formatDate(contact.lastInteractionDate)}</div>
                )}
                <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" />Créé le: {formatDate(contact.createdAt)}</div>
              </div>
            </div>

            {contact.notes && (
              <div className="p-3 bg-warning/10 rounded-lg text-sm">{contact.notes}</div>
            )}

            {/* Historique interactions */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />Historique des interactions
              </h3>
              {interactions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucune interaction enregistrée</p>
              ) : (
                <div className="space-y-2">
                  {interactions.map(inter => {
                    const IIcon = interactionTypeIcon[inter.type] || MessageSquare;
                    return (
                      <div key={inter.id} className="flex items-start gap-3 p-3 border border-border rounded-lg">
                        <div className="p-1.5 bg-primary/10 rounded-lg">
                          <IIcon className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">{inter.subject}</span>
                            <span className="text-xs text-muted-foreground">{inter.direction === 'entrant' ? '📥' : '📤'}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{inter.content}</p>
                          {inter.outcome && <p className="text-xs text-green-600 mt-0.5">→ {inter.outcome}</p>}
                        </div>
                        {inter.completedAt && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(inter.completedAt)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tâches */}
            {tasks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-primary" />Tâches associées
                </h3>
                <div className="space-y-2">
                  {tasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                      <div className={`h-2 w-2 rounded-full ${task.priority === 'haute' ? 'bg-destructive' : task.priority === 'moyenne' ? 'bg-warning' : 'bg-success'}`} />
                      <div className="flex-1">
                        <p className="text-xs font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground">Échéance: {formatDate(task.dueDate)}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${task.status === 'termine' ? 'bg-success/20 text-green-700' : task.status === 'a_faire' ? 'bg-warning/20 text-yellow-700' : 'bg-muted text-muted-foreground'}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Fermer</Button>
            <Button variant="outline" className="gap-1"><Edit className="h-4 w-4" />Modifier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <NewInteractionModal open={showInteraction} onClose={() => setShowInteraction(false)} contactId={contact.id} />
    </>
  );
}

// ─── Lead Detail Modal ────────────────────────────────────────────────────────

function LeadDetailModal({ lead, open, onClose }: { lead: CRMLead | null; open: boolean; onClose: () => void }) {
  if (!lead) return null;
  const contact = mockCRMContacts.find(c => c.id === lead.contactId);
  const school = mockSchools.find(s => s.id === lead.desiredSchoolId);
  const interactions = mockCRMInteractions.filter(i => i.leadId === lead.id).slice(0, 4);

  const statusSteps = leadStatusOrder;
  const currentIdx = statusSteps.indexOf(lead.status);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dossier prospect</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Pipeline */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Avancement du dossier</h3>
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {statusSteps.map((s, idx) => (
                <div key={s} className="flex items-center gap-1 flex-shrink-0">
                  <div className={`flex flex-col items-center`}>
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${idx <= currentIdx ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                      {idx + 1}
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 whitespace-nowrap">{leadStatusLabels[s]}</span>
                  </div>
                  {idx < statusSteps.length - 1 && (
                    <div className={`h-0.5 w-8 mb-5 ${idx < currentIdx ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Infos enfant + contact */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 p-4 bg-muted/30 rounded-xl">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Enfant</h3>
              <p className="font-semibold">{lead.childLastName} {lead.childFirstName}</p>
              <p className="text-sm text-muted-foreground capitalize">{lead.desiredCycle} · {lead.childGender === 'M' ? 'Garçon' : 'Fille'}</p>
              {lead.currentSchool && <p className="text-xs text-muted-foreground">École actuelle: {lead.currentSchool}</p>}
              {lead.expectedEnrollmentDate && (
                <p className="text-xs text-muted-foreground">Rentrée souhaitée: {formatDate(lead.expectedEnrollmentDate)}</p>
              )}
            </div>
            <div className="space-y-2 p-4 bg-muted/30 rounded-xl">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact parent</h3>
              {contact ? (
                <>
                  <p className="font-semibold">{formatStudentName(contact)}</p>
                  <p className="text-sm text-muted-foreground">{contact.phone}</p>
                  {contact.email && <p className="text-sm text-muted-foreground">{contact.email}</p>}
                  <p className="text-xs text-muted-foreground">{contact.city}</p>
                </>
              ) : <p className="text-sm text-muted-foreground">Contact non trouvé</p>}
            </div>
          </div>

          {/* Détails lead */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 border border-border rounded-lg">
              <p className="text-xs text-muted-foreground">Source</p>
              <p className="text-sm font-medium capitalize mt-1">{lead.source.replace(/_/g, ' ')}</p>
            </div>
            <div className="text-center p-3 border border-border rounded-lg">
              <p className="text-xs text-muted-foreground">Priorité</p>
              <p className={`text-sm font-semibold mt-1 ${priorityColor[lead.priority]}`}>
                {lead.priority.charAt(0).toUpperCase() + lead.priority.slice(1)}
              </p>
            </div>
            <div className="text-center p-3 border border-border rounded-lg">
              <p className="text-xs text-muted-foreground">Valeur estimée</p>
              <p className="text-sm font-mono font-bold mt-1">{lead.estimatedValue ? formatCurrency(lead.estimatedValue) : '—'}</p>
            </div>
          </div>

          {school && (
            <div className="flex items-center gap-3 p-3 border border-primary/20 bg-primary/5 rounded-lg">
              <Building2 className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">{school.name}</p>
            </div>
          )}

          {lead.assignedTo && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Assigné à:</span>
              <span className="font-medium">{lead.assignedTo}</span>
            </div>
          )}

          {lead.notes && (
            <div className="p-3 bg-warning/10 rounded-lg text-sm">{lead.notes}</div>
          )}

          {lead.lostReason && (
            <div className="p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
              ❌ Raison de perte: {lead.lostReason}
            </div>
          )}

          {/* Interactions */}
          {interactions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />Interactions ({interactions.length})
              </h3>
              <div className="space-y-2">
                {interactions.map(inter => {
                  const IIcon = interactionTypeIcon[inter.type] || MessageSquare;
                  return (
                    <div key={inter.id} className="flex items-center gap-3 p-2 border border-border rounded-lg">
                      <IIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{inter.subject}</p>
                        <p className="text-xs text-muted-foreground">{inter.staffName}</p>
                      </div>
                      {inter.completedAt && <span className="text-xs text-muted-foreground">{formatDate(inter.completedAt)}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button className="gap-1"><Edit className="h-4 w-4" />Mettre à jour statut</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main CRM Page ────────────────────────────────────────────────────────────

export default function CRM() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('contacts');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLeadStatus, setFilterLeadStatus] = useState('all');
  const [showNewContact, setShowNewContact] = useState(false);
  const [showNewLead, setShowNewLead] = useState(false);
  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null);
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [showContactDetail, setShowContactDetail] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [contacts, setContacts] = useState<CRMContact[]>(mockCRMContacts);

  // Edit/Delete contact state
  const [editContactOpen, setEditContactOpen] = useState(false);
  const [deleteContactOpen, setDeleteContactOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<CRMContact | null>(null);
  const [editContactForm, setEditContactForm] = useState({
    firstName: '', lastName: '', phone: '', email: '', city: '', type: 'parent' as CRMContact['type'],
  });

  const handleEditContact = (contact: CRMContact) => {
    setContactToEdit(contact);
    setEditContactForm({
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phone,
      email: contact.email || '',
      city: contact.city,
      type: contact.type,
    });
    setEditContactOpen(true);
  };

  const handleSaveContact = () => {
    if (!contactToEdit) return;
    setContacts(prev => prev.map(c =>
      c.id === contactToEdit.id
        ? { ...c, ...editContactForm }
        : c
    ));
    setEditContactOpen(false);
    setContactToEdit(null);
  };

  const handleDeleteContactPrompt = (contact: CRMContact) => {
    setContactToEdit(contact);
    setDeleteContactOpen(true);
  };

  const handleConfirmDeleteContact = () => {
    if (!contactToEdit) return;
    setContacts(prev => prev.filter(c => c.id !== contactToEdit.id));
    setDeleteContactOpen(false);
    setContactToEdit(null);
  };

  // KPIs
  const totalContacts = mockCRMContacts.length;
  const activeLeads = mockCRMLeads.filter(l => !['inscrit', 'perdu', 'abandonne'].includes(l.status)).length;
  const inscribed = mockCRMLeads.filter(l => l.status === 'inscrit').length;
  const conversionRate = mockCRMLeads.length > 0 ? Math.round((inscribed / mockCRMLeads.length) * 100) : 0;
  const totalDonations = mockCRMDonations.filter(d => d.status === 'recu').reduce((acc, d) => acc + d.amount, 0);
  const pendingTasks = mockCRMTasks.filter(t => t.status === 'a_faire' || t.status === 'en_cours').length;
  const activeCampaigns = mockCRMCampaigns.filter(c => c.status === 'en_cours' || c.status === 'planifiee').length;

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchSearch = searchQuery === '' ||
        `${formatStudentName(c)} ${c.phone} ${c.email || ''} ${c.city}`.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = filterType === 'all' || c.type === filterType;
      const matchStatus = filterStatus === 'all' || c.status === filterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [contacts, searchQuery, filterType, filterStatus]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return mockCRMLeads.filter(l => {
      const contact = mockCRMContacts.find(c => c.id === l.contactId);
      const matchSearch = searchQuery === '' ||
        `${l.childLastName} ${l.childFirstName} ${contact?.lastName || ''} ${contact?.firstName || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = filterLeadStatus === 'all' || l.status === filterLeadStatus;
      return matchSearch && matchStatus;
    });
  }, [searchQuery, filterLeadStatus]);

  // Leads by status for kanban
  const leadsByStatus = useMemo(() => {
    const map: Record<string, CRMLead[]> = {};
    leadStatusOrder.forEach(s => { map[s] = []; });
    filteredLeads.forEach(l => {
      if (map[l.status]) map[l.status].push(l);
    });
    return map;
  }, [filteredLeads]);

  // Stats lead source
  const leadSourceStats = useMemo(() => {
    const stats: Record<string, number> = {};
    mockCRMLeads.forEach(l => { stats[l.source] = (stats[l.source] || 0) + 1; });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, []);

  const handleContactClick = (contact: CRMContact) => {
    setSelectedContact(contact);
    setShowContactDetail(true);
  };

  const handleLeadClick = (lead: CRMLead) => {
    setSelectedLead(lead);
    setShowLeadDetail(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div variants={fadeInUp} initial="initial" animate="animate" className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">CRM — Gestion Relations</h1>
            <p className="text-muted-foreground mt-1">Contacts, prospects, campagnes et fidélisation</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1">
              <Download className="h-4 w-4" />Export
            </Button>
            <Button size="sm" className="gap-1" onClick={() => setShowNewContact(true)}>
              <UserPlus className="h-4 w-4" />Nouveau contact
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowNewLead(true)}>
              <Target className="h-4 w-4" />Nouveau lead
            </Button>
          </div>
        </motion.div>

        {/* KPIs */}
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {[
            { label: 'Contacts', value: totalContacts, icon: Users, color: 'primary', trend: 12 },
            { label: 'Leads actifs', value: activeLeads, icon: Target, color: 'warning', trend: 8 },
            { label: 'Taux conversion', value: `${conversionRate}%`, icon: TrendingUp, color: 'success', trend: 3 },
            { label: 'Inscrits via CRM', value: inscribed, icon: Star, color: 'success' },
            { label: 'Total dons', value: `${(totalDonations / 1000000).toFixed(1)}M`, icon: Gift, color: 'purple', trend: 15 },
            { label: 'Tâches actives', value: pendingTasks, icon: CheckSquare, color: pendingTasks > 10 ? 'destructive' : 'warning' },
            { label: 'Campagnes', value: activeCampaigns, icon: Megaphone, color: 'primary' },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} variants={staggerItem}>
              <KpiCard {...kpi} sub={undefined} />
            </motion.div>
          ))}
        </motion.div>

        {/* Tabs */}
        <motion.div variants={fadeInUp} initial="initial" animate="animate">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-6 w-full lg:w-auto lg:inline-grid">
              <TabsTrigger value="contacts" className="gap-1"><Users className="h-4 w-4" /><span className="hidden sm:inline">Contacts</span></TabsTrigger>
              <TabsTrigger value="leads" className="gap-1"><Target className="h-4 w-4" /><span className="hidden sm:inline">Leads</span></TabsTrigger>
              <TabsTrigger value="interactions" className="gap-1"><Activity className="h-4 w-4" /><span className="hidden sm:inline">Interactions</span></TabsTrigger>
              <TabsTrigger value="taches" className="gap-1"><CheckSquare className="h-4 w-4" /><span className="hidden sm:inline">Tâches</span></TabsTrigger>
              <TabsTrigger value="campagnes" className="gap-1"><Megaphone className="h-4 w-4" /><span className="hidden sm:inline">Campagnes</span></TabsTrigger>
              <TabsTrigger value="dons" className="gap-1"><Gift className="h-4 w-4" /><span className="hidden sm:inline">Dons</span></TabsTrigger>
            </TabsList>

            {/* ── CONTACTS ── */}
            <TabsContent value="contacts" className="space-y-4 mt-4">
              {/* Filtres */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-9" placeholder="Rechercher un contact..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les types</SelectItem>
                        {Object.entries(contactTypeLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Statut" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="actif">Actif</SelectItem>
                        <SelectItem value="inactif">Inactif</SelectItem>
                        <SelectItem value="bloque">Bloqué</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground self-center whitespace-nowrap">{filteredContacts.length} contact(s)</p>
                  </div>
                </CardContent>
              </Card>

              {/* Liste contacts */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredContacts.slice(0, 30).map(contact => (
                  <div key={contact.id} className="relative group">
                    <ContactCard contact={contact} onClick={() => handleContactClick(contact)} />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 bg-background/80 hover:bg-background shadow-sm"
                        onClick={(e) => { e.stopPropagation(); handleEditContact(contact); }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 bg-background/80 hover:bg-destructive hover:text-destructive-foreground shadow-sm"
                        onClick={(e) => { e.stopPropagation(); handleDeleteContactPrompt(contact); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {filteredContacts.length > 30 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  Affichage des 30 premiers résultats sur {filteredContacts.length} ({filteredContacts.length - 30} non affichés)
                </p>
              )}
            </TabsContent>

            {/* ── LEADS ── */}
            <TabsContent value="leads" className="space-y-4 mt-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex gap-3 flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Rechercher un lead..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                  <Select value={filterLeadStatus} onValueChange={setFilterLeadStatus}>
                    <SelectTrigger className="w-44"><SelectValue placeholder="Statut" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      {Object.entries(leadStatusLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')} className="gap-1">
                    <BarChart3 className="h-4 w-4" />Liste
                  </Button>
                  <Button variant={viewMode === 'kanban' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('kanban')} className="gap-1">
                    <Filter className="h-4 w-4" />Kanban
                  </Button>
                </div>
              </div>

              {/* Stats source */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {leadSourceStats.map(([source, count]) => (
                  <Card key={source} className="text-center p-3">
                    <p className="text-xs text-muted-foreground capitalize">{source.replace(/_/g, ' ')}</p>
                    <p className="text-2xl font-bold font-mono mt-1">{count}</p>
                    <Progress value={(count / mockCRMLeads.length) * 100} className="h-1 mt-2" />
                  </Card>
                ))}
              </div>

              {viewMode === 'kanban' ? (
                <div className="overflow-x-auto pb-4">
                  <div className="flex gap-4 min-w-max">
                    {leadStatusOrder.map(status => (
                      <LeadKanbanColumn
                        key={status}
                        status={status}
                        leads={leadsByStatus[status] || []}
                        onLeadClick={handleLeadClick}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border bg-muted/40">
                        <tr>
                          <th className="text-left p-3 font-semibold">Enfant</th>
                          <th className="text-left p-3 font-semibold">Parent</th>
                          <th className="text-left p-3 font-semibold">Cycle</th>
                          <th className="text-left p-3 font-semibold">Statut</th>
                          <th className="text-left p-3 font-semibold">Source</th>
                          <th className="text-left p-3 font-semibold">Priorité</th>
                          <th className="text-left p-3 font-semibold">Valeur</th>
                          <th className="p-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLeads.slice(0, 25).map(lead => {
                          const contact = mockCRMContacts.find(c => c.id === lead.contactId);
                          return (
                            <tr key={lead.id} onClick={() => handleLeadClick(lead)} className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors">
                              <td className="p-3">
                                <div>
                                  <p className="font-medium">{lead.childLastName} {lead.childFirstName}</p>
                                  <p className="text-xs text-muted-foreground">{lead.childGender === 'M' ? 'Garçon' : 'Fille'}</p>
                                </div>
                              </td>
                              <td className="p-3">
                                {contact ? (
                                  <div>
                                    <p className="font-medium">{formatStudentName(contact)}</p>
                                    <p className="text-xs text-muted-foreground">{contact.phone}</p>
                                  </div>
                                ) : '—'}
                              </td>
                              <td className="p-3 capitalize">{lead.desiredCycle}</td>
                              <td className="p-3">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${leadStatusColor[lead.status]}`}>
                                  {leadStatusLabels[lead.status]}
                                </span>
                              </td>
                              <td className="p-3 text-xs text-muted-foreground capitalize">{lead.source.replace(/_/g, ' ')}</td>
                              <td className="p-3">
                                <span className={`text-xs font-semibold ${priorityColor[lead.priority]}`}>● {lead.priority}</span>
                              </td>
                              <td className="p-3 font-mono text-xs">{lead.estimatedValue ? formatCurrency(lead.estimatedValue) : '—'}</td>
                              <td className="p-3">
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* ── INTERACTIONS ── */}
            <TabsContent value="interactions" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Rechercher une interaction..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <Button size="sm" className="gap-1" onClick={() => setShowNewContact(false)}>
                  <Plus className="h-4 w-4" />Nouvelle interaction
                </Button>
              </div>

              {/* Stats interactions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(['appel', 'whatsapp', 'email', 'visite'] as const).map(type => {
                  const count = mockCRMInteractions.filter(i => i.type === type).length;
                  const IIcon = interactionTypeIcon[type] || MessageSquare;
                  return (
                    <Card key={type} className="p-4 flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <IIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xl font-bold font-mono">{count}</p>
                        <p className="text-xs text-muted-foreground capitalize">{type}s</p>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Historique des interactions</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {mockCRMInteractions
                      .filter(i => searchQuery === '' || i.subject.toLowerCase().includes(searchQuery.toLowerCase()))
                      .slice(0, 30)
                      .map(inter => {
                        const contact = mockCRMContacts.find(c => c.id === inter.contactId);
                        const IIcon = interactionTypeIcon[inter.type] || MessageSquare;
                        return (
                          <div key={inter.id} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
                            <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                              <IIcon className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{inter.subject}</span>
                                <span className="text-xs text-muted-foreground">{inter.direction === 'entrant' ? '📥 Entrant' : '📤 Sortant'}</span>
                                <span className="text-xs px-1.5 py-0.5 bg-muted rounded capitalize">{inter.type}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{inter.content}</p>
                              <div className="flex items-center gap-3 mt-1">
                                {contact && <span className="text-xs font-medium">{formatStudentName(contact)}</span>}
                                {inter.staffName && <span className="text-xs text-muted-foreground">par {inter.staffName}</span>}
                                {inter.outcome && <span className="text-xs text-green-600">→ {inter.outcome}</span>}
                              </div>
                            </div>
                            {inter.completedAt && (
                              <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(inter.completedAt)}</span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── TCHES ── */}
            <TabsContent value="taches" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(['a_faire', 'en_cours', 'termine', 'annule'] as const).map(s => {
                    const count = mockCRMTasks.filter(t => t.status === s).length;
                    const colors: Record<string, string> = { a_faire: 'text-warning', en_cours: 'text-primary', termine: 'text-green-600', annule: 'text-muted-foreground' };
                    return (
                      <div key={s} className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg">
                        <span className={`text-lg font-bold font-mono ${colors[s]}`}>{count}</span>
                        <span className="text-xs text-muted-foreground capitalize">{s.replace('_', ' ')}</span>
                      </div>
                    );
                  })}
                </div>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />Nouvelle tâche
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {mockCRMTasks.slice(0, 30).map(task => {
                      const contact = mockCRMContacts.find(c => c.id === task.contactId);
                      const isOverdue = task.status !== 'termine' && task.status !== 'annule' && task.dueDate < new Date();
                      return (
                        <div key={task.id} className={`flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors ${isOverdue ? 'bg-destructive/5' : ''}`}>
                          <div className={`h-2 w-2 rounded-full mt-2 flex-shrink-0 ${task.priority === 'haute' ? 'bg-destructive' : task.priority === 'moyenne' ? 'bg-warning' : 'bg-success'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-medium ${task.status === 'termine' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${task.status === 'termine' ? 'bg-success/20 text-green-700' : task.status === 'a_faire' ? 'bg-warning/20 text-yellow-700' : task.status === 'en_cours' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                {task.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              {contact && <span className="text-xs text-muted-foreground">{formatStudentName(contact)}</span>}
                              {task.assignedTo && <span className="text-xs text-muted-foreground">→ {task.assignedTo}</span>}
                              <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                                <Clock className="h-3 w-3" />
                                {isOverdue ? '⚠ En retard — ' : ''}{formatDate(task.dueDate)}
                              </span>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem><Eye className="mr-2 h-4 w-4" />Voir</DropdownMenuItem>
                              <DropdownMenuItem><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── CAMPAGNES ── */}
            <TabsContent value="campagnes" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Campagnes de communication</h2>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />Nouvelle campagne
                </Button>
              </div>

              <div className="grid gap-4">
                {mockCRMCampaigns.map(campaign => {
                  const engagementRate = campaign.sentCount > 0 ? Math.round((campaign.responseCount / campaign.sentCount) * 100) : 0;
                  const openRate = campaign.sentCount > 0 ? Math.round((campaign.openCount / campaign.sentCount) * 100) : 0;
                  return (
                    <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="p-2.5 bg-primary/10 rounded-xl flex-shrink-0">
                              {campaign.type === 'whatsapp' ? <MessageSquare className="h-5 w-5 text-primary" /> :
                               campaign.type === 'sms' ? <Phone className="h-5 w-5 text-primary" /> :
                               campaign.type === 'email' ? <Mail className="h-5 w-5 text-primary" /> :
                               <Megaphone className="h-5 w-5 text-primary" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-sm">{campaign.title}</h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${campaignStatusColor[campaign.status]}`}>
                                  {campaignStatusLabel[campaign.status]}
                                </span>
                                <span className="text-xs px-2 py-0.5 bg-muted rounded uppercase">{campaign.type}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{campaign.description}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{campaign.totalContacts.toLocaleString()} contacts</span>
                                {campaign.scheduledAt && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(campaign.scheduledAt)}</span>}
                              </div>
                            </div>
                          </div>

                          {campaign.sentCount > 0 && (
                            <div className="grid grid-cols-3 gap-4 flex-shrink-0">
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Envoyés</p>
                                <p className="text-lg font-bold font-mono">{campaign.sentCount.toLocaleString()}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Ouverture</p>
                                <p className="text-lg font-bold font-mono text-primary">{openRate}%</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Engagement</p>
                                <p className="text-lg font-bold font-mono text-green-600">{engagementRate}%</p>
                              </div>
                            </div>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem><Eye className="mr-2 h-4 w-4" />Voir détails</DropdownMenuItem>
                              <DropdownMenuItem><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                              <DropdownMenuItem><Send className="mr-2 h-4 w-4" />Envoyer</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {campaign.sentCount > 0 && (
                          <div className="mt-4 space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Progression ({campaign.sentCount}/{campaign.totalContacts})</span>
                              <span>{Math.round((campaign.sentCount / Math.max(campaign.totalContacts, 1)) * 100)}%</span>
                            </div>
                            <Progress value={(campaign.sentCount / Math.max(campaign.totalContacts, 1)) * 100} className="h-1.5" />
                          </div>
                        )}

                        {campaign.content && (
                          <div className="mt-3 p-3 bg-muted/40 rounded-lg">
                            <p className="text-xs text-muted-foreground italic">"{campaign.content.slice(0, 120)}{campaign.content.length > 120 ? '...' : ''}"</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* ── DONS ── */}
            <TabsContent value="dons" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total reçus', value: formatCurrency(mockCRMDonations.filter(d => d.status === 'recu').reduce((a, d) => a + d.amount, 0)), color: 'success' },
                  { label: 'Nombre de dons', value: mockCRMDonations.filter(d => d.status === 'recu').length, color: 'primary' },
                  { label: 'En attente', value: formatCurrency(mockCRMDonations.filter(d => d.status === 'en_attente').reduce((a, d) => a + d.amount, 0)), color: 'warning' },
                  { label: 'Donateurs actifs', value: new Set(mockCRMDonations.filter(d => d.status === 'recu').map(d => d.contactId)).size, color: 'purple' },
                ].map(stat => (
                  <Card key={stat.label} className="p-4">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-bold font-mono mt-1">{stat.value}</p>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Journal des dons</CardTitle>
                    <Button size="sm" className="gap-1"><Plus className="h-4 w-4" />Enregistrer un don</Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border bg-muted/40">
                        <tr>
                          <th className="text-left p-3 font-semibold">Référence</th>
                          <th className="text-left p-3 font-semibold">Donateur</th>
                          <th className="text-left p-3 font-semibold">Montant</th>
                          <th className="text-left p-3 font-semibold">Objet</th>
                          <th className="text-left p-3 font-semibold">Mode</th>
                          <th className="text-left p-3 font-semibold">Date</th>
                          <th className="text-left p-3 font-semibold">Statut</th>
                          <th className="p-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockCRMDonations.slice(0, 25).map(don => {
                          const contact = mockCRMContacts.find(c => c.id === don.contactId);
                          return (
                            <tr key={don.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                              <td className="p-3 font-mono text-xs text-muted-foreground">{don.receiptNumber}</td>
                              <td className="p-3">
                                {contact ? (
                                  <div>
                                    <p className="font-medium">{formatStudentName(contact)}</p>
                                    <p className="text-xs text-muted-foreground">{contact.city}</p>
                                  </div>
                                ) : '—'}
                              </td>
                              <td className="p-3 font-mono font-bold text-green-700">{formatCurrency(don.amount)}</td>
                              <td className="p-3 capitalize text-xs">{don.purpose.replace(/_/g, ' ')}</td>
                              <td className="p-3 capitalize text-xs text-muted-foreground">{don.mode.replace(/_/g, ' ')}</td>
                              <td className="p-3 text-xs">{formatDate(don.date)}</td>
                              <td className="p-3">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${don.status === 'recu' ? 'bg-success/20 text-green-700' : don.status === 'en_attente' ? 'bg-warning/20 text-yellow-700' : 'bg-destructive/10 text-destructive'}`}>
                                  {don.status}
                                </span>
                              </td>
                              <td className="p-3">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem><Eye className="mr-2 h-4 w-4" />Reçu</DropdownMenuItem>
                                    <DropdownMenuItem><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Modals */}
      <NewContactModal open={showNewContact} onClose={() => setShowNewContact(false)} />
      <NewLeadModal open={showNewLead} onClose={() => setShowNewLead(false)} />
      <ContactDetailModal contact={selectedContact} open={showContactDetail} onClose={() => setShowContactDetail(false)} />
      <LeadDetailModal lead={selectedLead} open={showLeadDetail} onClose={() => setShowLeadDetail(false)} />

      {/* Edit Contact Dialog */}
      <Dialog open={editContactOpen} onOpenChange={setEditContactOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier le contact</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <Label>Prénom</Label>
              <Input className="mt-1" value={editContactForm.firstName} onChange={e => setEditContactForm(p => ({ ...p, firstName: e.target.value }))} />
            </div>
            <div>
              <Label>Nom</Label>
              <Input className="mt-1" value={editContactForm.lastName} onChange={e => setEditContactForm(p => ({ ...p, lastName: e.target.value }))} />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input className="mt-1" value={editContactForm.phone} onChange={e => setEditContactForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input className="mt-1" type="email" value={editContactForm.email} onChange={e => setEditContactForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <Label>Ville</Label>
              <Input className="mt-1" value={editContactForm.city} onChange={e => setEditContactForm(p => ({ ...p, city: e.target.value }))} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={editContactForm.type} onValueChange={v => setEditContactForm(p => ({ ...p, type: v as CRMContact['type'] }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(contactTypeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditContactOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveContact}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Contact Dialog */}
      <Dialog open={deleteContactOpen} onOpenChange={setDeleteContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le contact</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer <strong>{formatStudentName(contactToEdit)}</strong> ? Cette action est irréversible.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteContactOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleConfirmDeleteContact}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
