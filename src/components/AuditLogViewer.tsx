/**
 * Composant de Journal d'Audit Système & Sécurité
 * Traçabilité en temps réel des actions utilisateurs, encaissements, modifications et alertes.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Shield, ShieldAlert, ShieldCheck, Lock, AlertTriangle,
  Search, RefreshCw, Filter, Download, Printer, Eye,
  Calendar, User, Globe, CheckCircle2, XCircle, Clock,
  Layers, FileText, ChevronLeft, ChevronRight, Check, X,
  Activity, ArrowUpRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/apiClient';

interface AuditItem {
  id: number;
  timestamp: string;
  user_id?: number;
  username: string;
  user_role: string;
  ecole_id?: number;
  code_etablissement?: string;
  ville?: string;
  action: string;
  module: string;
  target_id?: string;
  target_name?: string;
  detail?: string;
  statut: string;
  ip_address?: string;
  user_agent?: string;
}

interface AuditStats {
  total_logs: number;
  logs_24h: number;
  failed_logins_24h: number;
  critical_actions: number;
  by_module: Record<string, number>;
  by_statut: Record<string, number>;
}

const MODULE_LABELS: Record<string, { label: string; color: string }> = {
  AUTHENTIFICATION: { label: 'Authentification & Sessions', color: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300' },
  CAISSE_PAIEMENTS: { label: 'Caisse & Paiements', color: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' },
  EXONERATIONS_REDUCTIONS: { label: 'Exonérations & Réductions', color: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300' },
  INSCRIPTION_ELEVES: { label: 'Élèves & Inscriptions', color: 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300' },
  PEDAGOGIE_NOTES: { label: 'Pédagogie & Bulletins', color: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300' },
  RESSOURCES_HUMAINES: { label: 'Personnel & RH', color: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300' },
  ADMINISTRATION_SECURITE: { label: 'Administration & Sécurité', color: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300' },
  CONFIGURATION: { label: 'Paramètres Système', color: 'bg-slate-50 text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-300' },
};

const ACTION_LABELS: Record<string, { label: string; badgeClass: string }> = {
  CONNEXION: { label: 'Connexion', badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  DECONNEXION: { label: 'Déconnexion', badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  TENTATIVE_ECHOUEE: { label: 'Échec de connexion', badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 animate-pulse' },
  ENCAISSEMENT_CAISSE: { label: 'Encaissement Caisse', badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  ATTRIBUTION_REDUCTION: { label: 'Attribution Réduction', badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300' },
  MODIFICATION_DOSSIER: { label: 'Modification Dossier', badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  CREATION: { label: 'Création', badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300' },
  MODIFICATION: { label: 'Modification', badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  SUPPRESSION: { label: 'Suppression', badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' },
  EXPORT_DONNEES: { label: 'Export Données', badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  IMPRESSION_DOCUMENT: { label: 'Impression Document', badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
};

export function AuditLogViewer() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination & Filtres
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('tous');
  const [selectedAction, setSelectedAction] = useState('tous');
  const [selectedStatut, setSelectedStatut] = useState('tous');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Inspection détaillée
  const [inspectLog, setInspectLog] = useState<AuditItem | null>(null);

  const fetchLogs = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const [logsRes, statsRes] = await Promise.all([
        apiClient.getAuditLogs({
          page,
          page_size: pageSize,
          search: search.trim() || undefined,
          module: selectedModule !== 'tous' ? selectedModule : undefined,
          action: selectedAction !== 'tous' ? selectedAction : undefined,
          statut: selectedStatut !== 'tous' ? selectedStatut : undefined,
          date_debut: dateDebut || undefined,
          date_fin: dateFin || undefined,
        }).catch(() => ({ items: [], total: 0, page: 1, page_size: pageSize, pages: 1 })),
        apiClient.getAuditStats().catch(() => null),
      ]);

      setLogs(logsRes.items || []);
      setTotal(logsRes.total || 0);
      setPages(logsRes.pages || 1);
      if (statsRes) setStats(statsRes);
    } catch (err) {
      console.error('Erreur chargement journal audit:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize, search, selectedModule, selectedAction, selectedStatut, dateDebut, dateFin]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh toutes les 25 secondes si activé
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 25000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (selectedModule !== 'tous') params.append('module', selectedModule);
    if (selectedAction !== 'tous') params.append('action', selectedAction);
    if (selectedStatut !== 'tous') params.append('statut', selectedStatut);
    if (dateDebut) params.append('date_debut', dateDebut);
    if (dateFin) params.append('date_fin', dateFin);

    const exportUrl = `/api/audit/export?${params.toString()}`;
    window.open(exportUrl, '_blank');
    toast({
      title: 'Export du Journal d\'Audit',
      description: 'Le téléchargement du fichier CSV d\'audit a démarré.',
    });
  };

  const handlePrintAuditReport = () => {
    window.print();
  };

  const formatLogDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Cartes Indicateurs Clés de Sécurité ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Événements Enregistrés
              </p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {stats ? stats.total_logs : total}
              </p>
              <p className="text-[10px] text-slate-400">
                {stats?.logs_24h || 0} action(s) dans les dernières 24h
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Alertes & Échecs (24h)
              </p>
              <p className={`text-2xl font-black ${(stats?.failed_logins_24h || 0) > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-slate-100'}`}>
                {stats?.failed_logins_24h || 0}
              </p>
              <p className="text-[10px] text-slate-400">
                {(stats?.failed_logins_24h || 0) > 0 ? 'Tentatives non autorisées détectées' : 'Aucun incident de sécurité'}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${(stats?.failed_logins_24h || 0) > 0 ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Opérations Sensibles
              </p>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {stats?.critical_actions || 0}
              </p>
              <p className="text-[10px] text-slate-400">
                Suppressions, purges & modifications
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Modules Surveillés
              </p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {stats ? Object.keys(stats.by_module).length : 6}
              </p>
              <p className="text-[10px] text-slate-400">
                Traçabilité active sur tout le SI
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Barre de Contrôle & Filtres de Sécurité ── */}
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                Journal d'Audit Système & Sécurité
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Registre immuable des accès, encaissements, modifications et actions administratives.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 font-medium">Flux direct :</span>
                <Switch
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                  className="scale-75"
                />
                {refreshing && <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />}
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchLogs()}
                disabled={loading}
                className="text-xs h-8 gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCSV}
                className="text-xs h-8 gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                Export CSV
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handlePrintAuditReport}
                className="text-xs h-8 gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                Imprimer
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {/* Filtres multi-critères */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Recherche textuelle */}
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Rechercher par utilisateur, IP, cible, détail..."
                className="pl-9 text-xs h-8 bg-white dark:bg-slate-900"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Module */}
            <div>
              <Select value={selectedModule} onValueChange={v => { setSelectedModule(v); setPage(1); }}>
                <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Tous les modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous" className="text-xs">Tous les modules</SelectItem>
                  {Object.entries(MODULE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action */}
            <div>
              <Select value={selectedAction} onValueChange={v => { setSelectedAction(v); setPage(1); }}>
                <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Toutes les actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous" className="text-xs">Toutes les actions</SelectItem>
                  {Object.entries(ACTION_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Statut */}
            <div>
              <Select value={selectedStatut} onValueChange={v => { setSelectedStatut(v); setPage(1); }}>
                <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous" className="text-xs">Tous les statuts</SelectItem>
                  <SelectItem value="SUCCES" className="text-xs">Succès (Normal)</SelectItem>
                  <SelectItem value="ALERTE_SECURITE" className="text-xs">Alerte Sécurité</SelectItem>
                  <SelectItem value="ECHEC" className="text-xs">Échec</SelectItem>
                  <SelectItem value="AVERTISSEMENT" className="text-xs">Avertissement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Période dates */}
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={dateDebut}
                onChange={e => { setDateDebut(e.target.value); setPage(1); }}
                className="h-8 text-xs p-1 bg-white dark:bg-slate-900"
                title="Date de début"
              />
              <span className="text-xs text-slate-400">à</span>
              <Input
                type="date"
                value={dateFin}
                onChange={e => { setDateFin(e.target.value); setPage(1); }}
                className="h-8 text-xs p-1 bg-white dark:bg-slate-900"
                title="Date de fin"
              />
            </div>
          </div>

          {/* ── Tableau du Journal d'Audit ── */}
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2 border border-slate-100 rounded-xl">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" /> Chargement du registre d'audit...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-slate-500 border border-dashed rounded-xl space-y-2">
              <Shield className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Aucun événement d'audit trouvé
              </p>
              <p className="text-xs text-slate-400">
                Modifiez vos critères de recherche ou réinitialisez les filtres.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs bg-white dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                    <tr>
                      <th className="text-left p-3">Date & Heure (GMT)</th>
                      <th className="text-left p-3">Utilisateur</th>
                      <th className="text-left p-3">Module</th>
                      <th className="text-left p-3">Action</th>
                      <th className="text-left p-3">Cible & Détail</th>
                      <th className="text-left p-3">Adresse IP</th>
                      <th className="text-center p-3">Statut</th>
                      <th className="text-right p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {logs.map((log) => {
                      const modCfg = MODULE_LABELS[log.module] || { label: log.module, color: 'bg-slate-100 text-slate-800' };
                      const actCfg = ACTION_LABELS[log.action] || { label: log.action, badgeClass: 'bg-slate-100 text-slate-700' };
                      const isAlert = log.statut === 'ALERTE_SECURITE' || log.statut === 'ECHEC';

                      return (
                        <tr
                          key={log.id}
                          className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                            isAlert ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                          }`}
                        >
                          <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {formatLogDate(log.timestamp)}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {log.username || 'Système'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {log.user_role || 'system'} {log.ville ? `• ${log.ville}` : ''}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${modCfg.color}`}>
                              {modCfg.label}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${actCfg.badgeClass}`}>
                              {actCfg.label}
                            </span>
                          </td>
                          <td className="p-3 max-w-[280px]">
                            {log.target_name && (
                              <p className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] truncate" title={log.target_name}>
                                {log.target_name}
                              </p>
                            )}
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate" title={log.detail || ''}>
                              {log.detail || '—'}
                            </p>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {log.ip_address || '127.0.0.1'}
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            {log.statut === 'SUCCES' ? (
                              <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40">
                                <Check className="w-3 h-3 mr-1 text-emerald-600" /> Succès
                              </Badge>
                            ) : log.statut === 'ALERTE_SECURITE' ? (
                              <Badge className="text-[10px] bg-rose-600 text-white animate-pulse">
                                <ShieldAlert className="w-3 h-3 mr-1" /> Alerte
                              </Badge>
                            ) : log.statut === 'ECHEC' ? (
                              <Badge variant="destructive" className="text-[10px]">
                                <XCircle className="w-3 h-3 mr-1" /> Échec
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800">
                                <AlertTriangle className="w-3 h-3 mr-1" /> Avertissement
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setInspectLog(log)}
                              className="h-7 px-2 text-[11px] text-slate-600 hover:text-indigo-600"
                              title="Inspecter le détail de sécurité"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> Inspecter
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Barre de pagination */}
              <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/50 text-xs">
                <span className="text-slate-500 text-[11px]">
                  Affichage de {logs.length} sur {total} événement(s) (Page {page}/{pages})
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="h-7 px-2 text-xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Précédent
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= pages}
                    onClick={() => setPage(p => p + 1)}
                    className="h-7 px-2 text-xs"
                  >
                    Suivant <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Modal d'Inspection de Sécurité Détaillée ── */}
      <Dialog open={!!inspectLog} onOpenChange={v => { if (!v) setInspectLog(null); }}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Shield className="w-4 h-4 text-indigo-600" />
              Fiche d'Inspection de Sécurité #{inspectLog?.id}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Détails techniques complets enregistrés lors de l'événement.
            </DialogDescription>
          </DialogHeader>

          {inspectLog && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Horodatage précis</p>
                  <p className="font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {formatLogDate(inspectLog.timestamp)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Statut de sécurité</p>
                  <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {inspectLog.statut}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Utilisateur & Rôle</p>
                  <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {inspectLog.username} ({inspectLog.user_role})
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Établissement / Ville</p>
                  <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {inspectLog.code_etablissement || '—'} {inspectLog.ville ? `(${inspectLog.ville})` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Module SI</p>
                  <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {inspectLog.module}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Type d'Action</p>
                  <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {inspectLog.action}
                  </p>
                </div>
              </div>

              {inspectLog.target_name && (
                <div className="space-y-1">
                  <p className="font-semibold text-slate-600">Entité Ciblée :</p>
                  <p className="p-2 bg-slate-50 dark:bg-slate-800 rounded border font-mono">
                    {inspectLog.target_name} {inspectLog.target_id ? `(ID: ${inspectLog.target_id})` : ''}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <p className="font-semibold text-slate-600">Description & Détails de l'opération :</p>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded border whitespace-pre-wrap font-mono text-[11px]">
                  {inspectLog.detail || 'Aucun détail supplémentaire.'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="font-semibold text-slate-600">Adresse IP Client :</p>
                  <p className="p-2 bg-slate-50 dark:bg-slate-800 rounded border font-mono">
                    {inspectLog.ip_address || '127.0.0.1'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-600">Agent Utilisateur (Terminal) :</p>
                  <p className="p-2 bg-slate-50 dark:bg-slate-800 rounded border font-mono text-[10px] truncate" title={inspectLog.user_agent || ''}>
                    {inspectLog.user_agent || 'Navigateur standard'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button size="sm" variant="outline" onClick={() => setInspectLog(null)} className="text-xs">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
