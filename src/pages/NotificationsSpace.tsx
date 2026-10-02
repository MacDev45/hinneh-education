/**
 * Centre de Notifications & Alertes
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle2, AlertTriangle, Info, XCircle, Trash2, CheckCheck, Filter } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ─── Types ───────────────────────────────────────────────────────────────────

type Severity = 'critical' | 'warning' | 'info' | 'success';
type Category = 'finance' | 'presence' | 'transport' | 'rh' | 'scolarite' | 'systeme';

interface Notif {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  category: Category;
  timestamp: Date;
  read: boolean;
  actionLabel?: string;
  actionPath?: string;
}

// ─── Données mock ─────────────────────────────────────────────────────────────

const INITIAL_NOTIFS: Notif[] = [
  { id: 'n1', title: '12 paiements en retard', description: 'Des frais de scolarité sont en attente depuis plus de 30 jours.', severity: 'critical', category: 'finance', timestamp: new Date(Date.now() - 1000 * 60 * 5), read: false, actionLabel: 'Voir les paiements' },
  { id: 'n2', title: '8 absences non justifiées', description: 'Des élèves ont des absences non justifiées cette semaine.', severity: 'warning', category: 'presence', timestamp: new Date(Date.now() - 1000 * 60 * 30), read: false, actionLabel: 'Voir les présences' },
  { id: 'n3', title: 'Bus 03 en retard', description: 'Le véhicule BUS-03 a 15 minutes de retard sur son trajet.', severity: 'warning', category: 'transport', timestamp: new Date(Date.now() - 1000 * 60 * 45), read: false },
  { id: 'n4', title: 'Contrat expirant', description: 'Le contrat de M. Konaré expire dans 30 jours.', severity: 'warning', category: 'rh', timestamp: new Date(Date.now() - 1000 * 60 * 120), read: true },
  { id: 'n5', title: 'Inscription validée', description: 'L\'inscription d\'Amadou Diallo en 6ème A a été validée.', severity: 'success', category: 'scolarite', timestamp: new Date(Date.now() - 1000 * 60 * 180), read: true },
  { id: 'n6', title: 'Sauvegarde système effectuée', description: 'Sauvegarde automatique réussie à 03h00.', severity: 'info', category: 'systeme', timestamp: new Date(Date.now() - 1000 * 3600 * 8), read: true },
  { id: 'n7', title: 'Bulletin du 1er trimestre disponible', description: '245 bulletins ont été générés et sont prêts à l\'impression.', severity: 'info', category: 'scolarite', timestamp: new Date(Date.now() - 1000 * 3600 * 24), read: true },
  { id: 'n8', title: 'Masse salariale calculée', description: 'La masse salariale de juin 2025 a été calculée : 4 250 000 FCFA.', severity: 'success', category: 'rh', timestamp: new Date(Date.now() - 1000 * 3600 * 26), read: true },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const severityConfig: Record<Severity, { icon: React.FC<any>; bg: string; border: string; badge: string }> = {
  critical: { icon: XCircle, bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700' },
  info: { icon: Info, bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
  success: { icon: CheckCircle2, bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-700' },
};

const categoryLabel: Record<Category, string> = {
  finance: 'Finance', presence: 'Présences', transport: 'Transport', rh: 'RH', scolarite: 'Scolarité', systeme: 'Système',
};

const timeAgo = (d: Date) => {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'À l\'instant';
  if (s < 3600) return `Il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `Il y a ${Math.floor(s / 3600)}h`;
  return `Il y a ${Math.floor(s / 86400)}j`;
};

// ─── Composant ───────────────────────────────────────────────────────────────

export default function NotificationsSpace() {
  const [notifs, setNotifs] = useState<Notif[]>(INITIAL_NOTIFS);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const markRead = (id: string) => setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifs(p => p.map(n => ({ ...n, read: true })));
  const deleteNotif = (id: string) => setNotifs(p => p.filter(n => n.id !== id));
  const clearAll = () => setNotifs(p => p.filter(n => !n.read));

  const filtered = useMemo(() => notifs.filter(n => {
    if (filterSeverity !== 'all' && n.severity !== filterSeverity) return false;
    if (filterCategory !== 'all' && n.category !== filterCategory) return false;
    if (showUnreadOnly && n.read) return false;
    return true;
  }), [notifs, filterSeverity, filterCategory, showUnreadOnly]);

  const unreadCount = notifs.filter(n => !n.read).length;
  const criticalCount = notifs.filter(n => n.severity === 'critical' && !n.read).length;

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bell className="h-7 w-7 text-primary" />Notifications
              {unreadCount > 0 && <Badge variant="destructive" className="ml-1">{unreadCount}</Badge>}
            </h1>
            <p className="text-muted-foreground mt-1">{criticalCount > 0 ? `${criticalCount} alerte(s) critique(s) non lue(s)` : 'Toutes les alertes et notifications'}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={markAllRead}><CheckCheck className="h-4 w-4" />Tout lire</Button>
            <Button size="sm" variant="ghost" className="gap-1 text-destructive" onClick={clearAll}><Trash2 className="h-4 w-4" />Effacer les lues</Button>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Sévérité" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="critical">Critique</SelectItem>
              <SelectItem value="warning">Avertissement</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="success">Succès</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Catégorie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {(Object.keys(categoryLabel) as Category[]).map(c => <SelectItem key={c} value={c}>{categoryLabel[c]}</SelectItem>)}
            </SelectContent>
          </Select>
          <button onClick={() => setShowUnreadOnly(p => !p)}
            className={`h-8 px-3 rounded-md text-xs border transition-colors ${showUnreadOnly ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-muted'}`}>
            Non lues seulement
          </button>
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} notification(s)</span>
        </div>

        {/* Liste */}
        {filtered.length === 0 ? (
          <Card><CardContent className="py-14 text-center text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-400" />
            <p>Aucune notification à afficher.</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filtered.map(n => {
                const cfg = severityConfig[n.severity];
                const Icon = cfg.icon;
                return (
                  <motion.div key={n.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                    className={`rounded-xl border p-4 flex gap-3 transition-all cursor-pointer ${cfg.bg} ${cfg.border} ${!n.read ? 'ring-1 ring-offset-1' : 'opacity-80'}`}
                    onClick={() => markRead(n.id)}>
                    <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${!n.read ? 'opacity-100' : 'opacity-60'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-semibold text-sm ${!n.read ? '' : 'text-muted-foreground'}`}>{n.title}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={e => { e.stopPropagation(); deleteNotif(n.id); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>{n.severity}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{categoryLabel[n.category]}</span>
                        <span className="text-[10px] text-muted-foreground">{timeAgo(n.timestamp)}</span>
                        {n.actionLabel && <button className="text-[10px] text-primary underline ml-auto" onClick={e => e.stopPropagation()}>{n.actionLabel} →</button>}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </Layout>
  );
}
