/**
 * Module Gestion de paiements Via Bank
 * Suivi des paiements de frais d'écolage effectués sur la plateforme financière externe.
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Landmark, RefreshCw, Settings, Link2, CheckCircle2, Trash2,
  Search, PlugZap, Plus, Wallet, AlertTriangle, ArrowDownUp, ShieldCheck,
  ListChecks,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatStudentName, formatCurrency } from '@/lib/index';
import apiClient from '@/lib/apiClient';

const STATUT_LABELS: Record<string, string> = {
  reussi: 'Réussi',
  en_attente: 'En attente',
  echoue: 'Échoué',
  annule: 'Annulé',
  rembourse: 'Remboursé',
};

const STATUT_STYLES: Record<string, string> = {
  reussi: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  en_attente: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  echoue: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
  annule: 'bg-slate-500/15 text-slate-600 border-slate-500/30',
  rembourse: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30',
};

const SUIVI_LABELS: Record<string, string> = {
  solde: 'Soldé',
  partiel: 'Partiel',
  impaye: 'Impayé',
  en_retard: 'En retard',
};

const SUIVI_STYLES: Record<string, string> = {
  solde: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  partiel: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  impaye: 'bg-slate-500/15 text-slate-600 border-slate-500/30',
  en_retard: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
};

export default function BankPayments() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('all');
  const [filterRapproche, setFilterRapproche] = useState('all');

  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [form, setForm] = useState({
    provider_nom: '',
    base_url: '',
    auth_type: 'api_key',
    api_key: '',
    api_secret: '',
    merchant_id: '',
    webhook_secret: '',
    endpoint_transactions: '/transactions',
    endpoint_paiement: '/payments',
    endpoint_statut: '/payments/{reference}',
    devise: 'XOF',
    timeout_secondes: 20,
    actif: false,
    mode_test: true,
    sync_auto: true,
    sync_intervalle_minutes: 10,
    sync_lookback_jours: 7,
    rapprochement_auto: true,
  });

  const [openLink, setOpenLink] = useState(false);
  const [linkTarget, setLinkTarget] = useState<any>(null);
  const [linkStudentId, setLinkStudentId] = useState('');

  const [suivi, setSuivi] = useState<any>({ resume: {}, eleves: [] });
  const [suiviStatut, setSuiviStatut] = useState<'all' | 'solde' | 'partiel' | 'impaye' | 'en_retard'>('all');
  const [suiviClasse, setSuiviClasse] = useState('all');
  const [suiviSearch, setSuiviSearch] = useState('');
  const [suiviLoading, setSuiviLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);

  const [openManual, setOpenManual] = useState(false);
  const [manual, setManual] = useState({
    reference_externe: '',
    montant: '',
    matricule_eleve: '',
    canal: 'virement',
    motif: 'scolarite',
    payeur_nom: '',
    date_transaction: '',
  });
  const [savingManual, setSavingManual] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cfg, statsData, txList, studList, clsList] = await Promise.all([
        apiClient.getBankConfig(),
        apiClient.getBankStats(),
        apiClient.getBankTransactions({ limit: 300 }),
        apiClient.getStudents(),
        apiClient.getClasses(),
      ]);
      setConfig(cfg);
      setStats(statsData);
      setTransactions(txList || []);
      setStudents(studList || []);
      setClasses(clsList || []);
      setForm({
        provider_nom: cfg.provider_nom || '',
        base_url: cfg.base_url || '',
        auth_type: cfg.auth_type || 'api_key',
        api_key: '',
        api_secret: '',
        merchant_id: cfg.merchant_id || '',
        webhook_secret: '',
        endpoint_transactions: cfg.endpoint_transactions || '/transactions',
        endpoint_paiement: cfg.endpoint_paiement || '/payments',
        endpoint_statut: cfg.endpoint_statut || '/payments/{reference}',
        devise: cfg.devise || 'XOF',
        timeout_secondes: cfg.timeout_secondes || 20,
        actif: !!cfg.actif,
        mode_test: !!cfg.mode_test,
        sync_auto: cfg.sync_auto !== false,
        sync_intervalle_minutes: cfg.sync_intervalle_minutes || 10,
        sync_lookback_jours: cfg.sync_lookback_jours ?? 7,
        rapprochement_auto: cfg.rapprochement_auto !== false,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur de chargement',
        description: err.response?.data?.detail || 'Impossible de charger le module bancaire.',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSuivi = async () => {
    setSuiviLoading(true);
    try {
      const data = await apiClient.getBankSuiviEcheancier({
        statut_paiement: suiviStatut,
        classe_id: suiviClasse !== 'all' ? Number(suiviClasse) : undefined,
        search: suiviSearch.trim() || undefined,
      });
      setSuivi(data || { resume: {}, eleves: [] });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: err.response?.data?.detail || "Impossible de charger le suivi de l'échéancier.",
      });
    } finally {
      setSuiviLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadSuivi();
  }, [suiviStatut, suiviClasse]);

  const filtered = transactions.filter(tx => {
    const term = search.trim().toLowerCase();
    const matchSearch = !term
      || String(tx.reference_externe || '').toLowerCase().includes(term)
      || String(tx.matricule_eleve || '').toLowerCase().includes(term)
      || String(tx.eleve_nom || '').toLowerCase().includes(term)
      || String(tx.payeur_nom || '').toLowerCase().includes(term);
    const matchStatut = filterStatut === 'all' || tx.statut === filterStatut;
    const matchRapproche = filterRapproche === 'all'
      || (filterRapproche === 'oui' ? tx.rapproche : !tx.rapproche);
    return matchSearch && matchStatut && matchRapproche;
  });

  const handleSaveConfig = async () => {
    if (form.actif && !form.base_url.trim()) {
      toast({ variant: 'destructive', title: 'URL manquante', description: "Renseignez l'URL de base avant d'activer la passerelle." });
      return;
    }
    setSavingConfig(true);
    try {
      const updated = await apiClient.updateBankConfig({
        ...form,
        timeout_secondes: Number(form.timeout_secondes) || 20,
        sync_intervalle_minutes: Number(form.sync_intervalle_minutes) || 10,
        sync_lookback_jours: Number(form.sync_lookback_jours) || 0,
      });
      setConfig(updated);
      setForm(prev => ({ ...prev, api_key: '', api_secret: '', webhook_secret: '' }));
      toast({ title: 'Configuration enregistrée', description: 'Les paramètres de la plateforme bancaire sont à jour.' });
      loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.response?.data?.detail || "Échec de l'enregistrement." });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await apiClient.testBankConnection();
      toast({
        variant: res.success ? 'default' : 'destructive',
        title: res.success ? 'Connexion réussie' : 'Connexion échouée',
        description: res.message,
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.response?.data?.detail || 'Test impossible.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await apiClient.syncBankTransactions();
      toast({ title: 'Synchronisation', description: res.message });
      loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Synchronisation impossible', description: err.response?.data?.detail || 'Erreur inconnue.' });
    } finally {
      setSyncing(false);
    }
  };

  const handleRefresh = async (tx: any) => {
    setBusyId(tx.id);
    try {
      await apiClient.refreshBankTransaction(tx.id);
      toast({ title: 'Statut actualisé', description: `Transaction ${tx.reference_externe} mise à jour.` });
      loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.response?.data?.detail || 'Actualisation impossible.' });
    } finally {
      setBusyId(null);
    }
  };

  const handleLink = async () => {
    if (!linkTarget || !linkStudentId) {
      toast({ variant: 'destructive', title: 'Élève requis', description: 'Sélectionnez un élève à associer.' });
      return;
    }
    setBusyId(linkTarget.id);
    try {
      await apiClient.linkBankTransactionToStudent(linkTarget.id, linkStudentId);
      toast({ title: 'Élève associé', description: 'La transaction est prête à être rapprochée.' });
      setOpenLink(false);
      setLinkTarget(null);
      setLinkStudentId('');
      loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.response?.data?.detail || 'Association impossible.' });
    } finally {
      setBusyId(null);
    }
  };

  const handleReconcile = async (tx: any) => {
    setBusyId(tx.id);
    try {
      const res = await apiClient.reconcileBankTransaction(tx.id);
      toast({ title: 'Rapprochement effectué', description: res.message });
      loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Rapprochement impossible', description: err.response?.data?.detail || 'Erreur inconnue.' });
    } finally {
      setBusyId(null);
    }
  };

  const handleReconcileAll = async () => {
    if (!confirm('Rapprocher automatiquement toutes les transactions réussies associées à un élève ?')) return;
    setSyncing(true);
    try {
      const res = await apiClient.reconcileAllBankTransactions();
      toast({ title: 'Rapprochement automatique', description: res.message });
      loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.response?.data?.detail || 'Opération impossible.' });
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (tx: any) => {
    if (!confirm(`Supprimer la transaction ${tx.reference_externe} ?`)) return;
    setBusyId(tx.id);
    try {
      await apiClient.deleteBankTransaction(tx.id);
      toast({ title: 'Transaction supprimée' });
      loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.response?.data?.detail || 'Suppression impossible.' });
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateManual = async () => {
    if (!manual.reference_externe.trim() || !Number(manual.montant)) {
      toast({ variant: 'destructive', title: 'Champs requis', description: 'Référence et montant sont obligatoires.' });
      return;
    }
    setSavingManual(true);
    try {
      await apiClient.createBankTransaction({
        reference_externe: manual.reference_externe.trim(),
        montant: Number(manual.montant),
        matricule_eleve: manual.matricule_eleve.trim() || undefined,
        canal: manual.canal,
        motif: manual.motif,
        payeur_nom: manual.payeur_nom.trim() || undefined,
        date_transaction: manual.date_transaction || undefined,
        statut: 'reussi',
      });
      toast({ title: 'Transaction enregistrée', description: 'Avis bancaire ajouté au suivi.' });
      setOpenManual(false);
      setManual({ reference_externe: '', montant: '', matricule_eleve: '', canal: 'virement', motif: 'scolarite', payeur_nom: '', date_transaction: '' });
      loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.response?.data?.detail || 'Enregistrement impossible.' });
    } finally {
      setSavingManual(false);
    }
  };

  const studentLabel = (s: any) =>
    `${s.matricule || ''} — ${s.lastName || s.nom || ''} ${s.firstName || s.prenom || ''}`.trim();

  return (
    <Layout title="Paiements Via Bank" description="Suivi des paiements d'écolage effectués sur la plateforme financière externe">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-card p-6 rounded-2xl border shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <Landmark className="w-7 h-7 text-primary" />
              Gestion de paiements Via Bank
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Réconciliation des frais d'écolage payés sur la plateforme bancaire avec les échéanciers élèves.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={loadData}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setOpenManual(true)}>
              <Plus className="w-4 h-4" /> Avis bancaire
            </Button>
            <Button className="gap-2" onClick={handleSync} disabled={syncing || !config?.actif}>
              <ArrowDownUp className="w-4 h-4" /> {syncing ? 'Synchronisation...' : 'Synchroniser'}
            </Button>
          </div>
        </div>

        {config && !config.configuration_complete && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Passerelle non configurée</p>
              <p>
                Renseignez l'URL de base et la clé API dans l'onglet <strong>Configuration</strong> dès réception des
                informations du service financier. En attendant, vous pouvez saisir les avis bancaires manuellement.
              </p>
            </div>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total encaissé</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.total_encaisse)}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.nb_reussies} transaction(s) réussie(s)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">À rapprocher</p>
                <p className="text-2xl font-bold mt-1 text-amber-600">{formatCurrency(stats.montant_non_rapproche)}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.nb_non_rapprochees} transaction(s) en attente</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Taux de rapprochement</p>
                <p className="text-2xl font-bold mt-1">{stats.taux_rapprochement}%</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.nb_sans_eleve} sans élève identifié</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Passerelle</p>
                <p className="text-2xl font-bold mt-1">{stats.passerelle_active ? 'Active' : 'Inactive'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.date_derniere_sync ? `Sync : ${new Date(stats.date_derniere_sync).toLocaleString('fr-FR')}` : 'Jamais synchronisée'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="transactions">
          <TabsList>
            <TabsTrigger value="transactions" className="gap-1.5"><Wallet className="w-4 h-4" />Transactions</TabsTrigger>
            <TabsTrigger value="suivi" className="gap-1.5"><ListChecks className="w-4 h-4" />Suivi échéancier</TabsTrigger>
            <TabsTrigger value="config" className="gap-1.5"><Settings className="w-4 h-4" />Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="mt-4 space-y-4">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Rechercher par référence, matricule, élève ou payeur..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Select value={filterStatut} onValueChange={setFilterStatut}>
                <SelectTrigger className="md:w-48"><SelectValue placeholder="Statut" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="reussi">Réussi</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="echoue">Échoué</SelectItem>
                  <SelectItem value="annule">Annulé</SelectItem>
                  <SelectItem value="rembourse">Remboursé</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterRapproche} onValueChange={setFilterRapproche}>
                <SelectTrigger className="md:w-52"><SelectValue placeholder="Rapprochement" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="non">Non rapprochées</SelectItem>
                  <SelectItem value="oui">Rapprochées</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="gap-2" onClick={handleReconcileAll} disabled={syncing}>
                <CheckCircle2 className="w-4 h-4" /> Rapprocher tout
              </Button>
            </div>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 border-b text-muted-foreground">
                    <tr>
                      <th className="p-3 font-semibold">Référence</th>
                      <th className="p-3 font-semibold">Élève</th>
                      <th className="p-3 font-semibold">Montant</th>
                      <th className="p-3 font-semibold">Canal</th>
                      <th className="p-3 font-semibold">Statut</th>
                      <th className="p-3 font-semibold">Date</th>
                      <th className="p-3 font-semibold">Date d'acquittement</th>
                      <th className="p-3 font-semibold">Rapproché</th>
                      <th className="p-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-10 text-center text-muted-foreground italic">
                          Aucune transaction bancaire enregistrée pour le moment.
                        </td>
                      </tr>
                    ) : filtered.map(tx => (
                      <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3">
                          <p className="font-mono text-xs font-semibold">{tx.reference_externe}</p>
                          {tx.payeur_nom && <p className="text-xs text-muted-foreground">{tx.payeur_nom}</p>}
                        </td>
                        <td className="p-3">
                          {tx.eleve_nom ? (
                            <div>
                              <p className="font-medium">{tx.eleve_nom}</p>
                              <p className="text-xs text-muted-foreground font-mono">{tx.matricule_eleve}</p>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">Non identifié</Badge>
                          )}
                        </td>
                        <td className="p-3 font-bold">{formatCurrency(tx.montant)}</td>
                        <td className="p-3 text-xs capitalize">{tx.canal || '—'}</td>
                        <td className="p-3">
                          <Badge className={STATUT_STYLES[tx.statut] || ''} variant="outline">
                            {STATUT_LABELS[tx.statut] || tx.statut}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs">
                          {tx.date_transaction ? new Date(tx.date_transaction).toLocaleString('fr-FR') : '—'}
                        </td>
                        <td className="p-3 text-xs text-emerald-700 font-medium">
                          {tx.date_rapprochement
                            ? new Date(tx.date_rapprochement).toLocaleString('fr-FR')
                            : (tx.statut === 'reussi' && tx.date_transaction ? new Date(tx.date_transaction).toLocaleString('fr-FR') : '—')}
                        </td>
                        <td className="p-3">
                          {tx.rapproche
                            ? <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30" variant="outline">Oui</Badge>
                            : <Badge variant="outline" className="text-slate-500">Non</Badge>}
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-1">
                            {!tx.eleve_id && !tx.rapproche && (
                              <Button size="sm" variant="outline" className="gap-1 text-xs" disabled={busyId === tx.id}
                                onClick={() => { setLinkTarget(tx); setLinkStudentId(''); setOpenLink(true); }}>
                                <Link2 className="w-3.5 h-3.5" /> Associer
                              </Button>
                            )}
                            {tx.eleve_id && !tx.rapproche && tx.statut === 'reussi' && (
                              <Button size="sm" className="gap-1 text-xs" disabled={busyId === tx.id}
                                onClick={() => handleReconcile(tx)}>
                                <CheckCircle2 className="w-3.5 h-3.5" /> Rapprocher
                              </Button>
                            )}
                            {config?.actif && (
                              <Button size="sm" variant="ghost" className="gap-1 text-xs" disabled={busyId === tx.id}
                                onClick={() => handleRefresh(tx)}>
                                <RefreshCw className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {!tx.rapproche && (
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                                disabled={busyId === tx.id} onClick={() => handleDelete(tx)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suivi" className="mt-4 space-y-4">
            {suivi?.resume && Object.keys(suivi.resume).length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="cursor-pointer hover:border-emerald-400" onClick={() => setSuiviStatut('solde')}>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Soldés</p>
                    <p className="text-2xl font-bold mt-1 text-emerald-600">{suivi.resume.nb_soldes}</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-amber-400" onClick={() => setSuiviStatut('partiel')}>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Paiement partiel</p>
                    <p className="text-2xl font-bold mt-1 text-amber-600">{suivi.resume.nb_partiels}</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-slate-400" onClick={() => setSuiviStatut('impaye')}>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Impayés</p>
                    <p className="text-2xl font-bold mt-1">{suivi.resume.nb_impayes}</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-rose-400" onClick={() => setSuiviStatut('en_retard')}>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">En retard</p>
                    <p className="text-2xl font-bold mt-1 text-rose-600">{suivi.resume.nb_en_retard}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {suivi?.resume && Object.keys(suivi.resume).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="p-3 rounded-lg border bg-card">
                  <p className="text-xs text-muted-foreground uppercase">Total attendu</p>
                  <p className="font-bold">{formatCurrency(suivi.resume.total_attendu)}</p>
                </div>
                <div className="p-3 rounded-lg border bg-card">
                  <p className="text-xs text-muted-foreground uppercase">Total recouvré</p>
                  <p className="font-bold text-emerald-600">{formatCurrency(suivi.resume.total_recouvre)}</p>
                </div>
                <div className="p-3 rounded-lg border bg-card">
                  <p className="text-xs text-muted-foreground uppercase">Reste impayé</p>
                  <p className="font-bold text-rose-600">{formatCurrency(suivi.resume.total_impaye)}</p>
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Rechercher un élève (nom ou matricule)..."
                  value={suiviSearch}
                  onChange={e => setSuiviSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') loadSuivi(); }}
                />
              </div>
              <Select value={suiviStatut} onValueChange={v => setSuiviStatut(v as any)}>
                <SelectTrigger className="md:w-52"><SelectValue placeholder="État du paiement" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les élèves</SelectItem>
                  <SelectItem value="solde">Paiements effectués (soldés)</SelectItem>
                  <SelectItem value="partiel">Paiements partiels</SelectItem>
                  <SelectItem value="impaye">Impayés</SelectItem>
                  <SelectItem value="en_retard">En retard</SelectItem>
                </SelectContent>
              </Select>
              <Select value={suiviClasse} onValueChange={setSuiviClasse}>
                <SelectTrigger className="md:w-48"><SelectValue placeholder="Classe" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les classes</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.CE_LIBELLE || c.libelle || c.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" className="gap-2" onClick={loadSuivi} disabled={suiviLoading}>
                <RefreshCw className={`w-4 h-4 ${suiviLoading ? 'animate-spin' : ''}`} /> Filtrer
              </Button>
            </div>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 border-b text-muted-foreground">
                    <tr>
                      <th className="p-3 font-semibold">Élève</th>
                      <th className="p-3 font-semibold">Attendu</th>
                      <th className="p-3 font-semibold">Payé</th>
                      <th className="p-3 font-semibold">Reste</th>
                      <th className="p-3 font-semibold">Tranches</th>
                      <th className="p-3 font-semibold">Prochaine échéance</th>
                      <th className="p-3 font-semibold">Via Bank</th>
                      <th className="p-3 font-semibold">État</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(suivi?.eleves || []).length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-10 text-center text-muted-foreground italic">
                          Aucun élève ne correspond à ce filtre.
                        </td>
                      </tr>
                    ) : suivi.eleves.map((row: any) => (
                      <tr key={row.eleve_id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3">
                          <p className="font-medium">{formatStudentName(row)}</p>
                          <p className="text-xs text-muted-foreground font-mono">{row.matricule}</p>
                        </td>
                        <td className="p-3">{formatCurrency(row.total_prevu)}</td>
                        <td className="p-3 text-emerald-600 font-semibold">{formatCurrency(row.total_paye)}</td>
                        <td className="p-3 text-rose-600 font-semibold">{formatCurrency(row.solde_restant)}</td>
                        <td className="p-3 text-xs">
                          {row.nb_tranches_payees}/{row.nb_tranches} payée(s)
                          {row.nb_tranches_en_retard > 0 && (
                            <span className="text-rose-600"> · {row.nb_tranches_en_retard} en retard</span>
                          )}
                        </td>
                        <td className="p-3 text-xs">
                          {row.prochaine_echeance ? new Date(row.prochaine_echeance).toLocaleDateString('fr-FR') : '—'}
                        </td>
                        <td className="p-3 text-xs">
                          {row.nb_transactions_bank > 0
                            ? `${formatCurrency(row.montant_regle_via_bank)} (${row.nb_transactions_bank})`
                            : '—'}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className={SUIVI_STYLES[row.statut_paiement] || ''}>
                            {SUIVI_LABELS[row.statut_paiement] || row.statut_paiement}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">{row.taux_paiement}%</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="w-5 h-5 text-primary" /> Connexion à la plateforme financière
                </CardTitle>
                <CardDescription>
                  Les secrets sont masqués après enregistrement. Laissez un champ vide pour conserver la valeur existante.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="provider_nom">Nom du fournisseur</Label>
                    <Input id="provider_nom" value={form.provider_nom}
                      onChange={e => setForm({ ...form, provider_nom: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="base_url">URL de base de l'API</Label>
                    <Input id="base_url" placeholder="https://api.banque.ci/v1" value={form.base_url}
                      onChange={e => setForm({ ...form, base_url: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="auth_type">Type d'authentification</Label>
                    <Select value={form.auth_type} onValueChange={v => setForm({ ...form, auth_type: v })}>
                      <SelectTrigger id="auth_type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="api_key">Clé API (en-tête)</SelectItem>
                        <SelectItem value="bearer">Bearer token</SelectItem>
                        <SelectItem value="basic">Basic auth</SelectItem>
                        <SelectItem value="oauth2">OAuth2 (token)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="merchant_id">Identifiant marchand</Label>
                    <Input id="merchant_id" value={form.merchant_id}
                      onChange={e => setForm({ ...form, merchant_id: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="api_key">Clé API {config?.api_key_definie && <span className="text-xs text-muted-foreground">({config.api_key_masque})</span>}</Label>
                    <Input id="api_key" type="password" placeholder="Inchangée" value={form.api_key}
                      onChange={e => setForm({ ...form, api_key: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="api_secret">Secret API {config?.api_secret_definie && <span className="text-xs text-muted-foreground">({config.api_secret_masque})</span>}</Label>
                    <Input id="api_secret" type="password" placeholder="Inchangé" value={form.api_secret}
                      onChange={e => setForm({ ...form, api_secret: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="webhook_secret">Secret webhook (HMAC) {config?.webhook_secret_definie && <span className="text-xs text-muted-foreground">({config.webhook_secret_masque})</span>}</Label>
                    <Input id="webhook_secret" type="password" placeholder="Inchangé" value={form.webhook_secret}
                      onChange={e => setForm({ ...form, webhook_secret: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="devise">Devise</Label>
                    <Input id="devise" value={form.devise}
                      onChange={e => setForm({ ...form, devise: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="endpoint_transactions">Endpoint transactions</Label>
                    <Input id="endpoint_transactions" value={form.endpoint_transactions}
                      onChange={e => setForm({ ...form, endpoint_transactions: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="endpoint_paiement">Endpoint initiation paiement</Label>
                    <Input id="endpoint_paiement" value={form.endpoint_paiement}
                      onChange={e => setForm({ ...form, endpoint_paiement: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="endpoint_statut">Endpoint statut ({'{reference}'})</Label>
                    <Input id="endpoint_statut" value={form.endpoint_statut}
                      onChange={e => setForm({ ...form, endpoint_statut: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="timeout">Délai d'attente (secondes)</Label>
                    <Input id="timeout" type="number" min="1" max="120" value={form.timeout_secondes}
                      onChange={e => setForm({ ...form, timeout_secondes: Number(e.target.value) })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                  <div className="space-y-1">
                    <Label htmlFor="sync_intervalle">Intervalle de synchronisation (minutes)</Label>
                    <Input id="sync_intervalle" type="number" min="1" max="1440" value={form.sync_intervalle_minutes}
                      onChange={e => setForm({ ...form, sync_intervalle_minutes: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="sync_lookback">Historique récupéré à chaque cycle (jours)</Label>
                    <Input id="sync_lookback" type="number" min="0" max="365" value={form.sync_lookback_jours}
                      onChange={e => setForm({ ...form, sync_lookback_jours: Number(e.target.value) })} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 pt-2">
                  <div className="flex items-center gap-2">
                    <Switch id="actif" checked={form.actif} onCheckedChange={v => setForm({ ...form, actif: v })} />
                    <Label htmlFor="actif">Passerelle active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="sync_auto" checked={form.sync_auto} onCheckedChange={v => setForm({ ...form, sync_auto: v })} />
                    <Label htmlFor="sync_auto">Récupération automatique des transactions</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="rapprochement_auto" checked={form.rapprochement_auto}
                      onCheckedChange={v => setForm({ ...form, rapprochement_auto: v })} />
                    <Label htmlFor="rapprochement_auto">Mise à jour automatique des montants dus</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="mode_test" checked={form.mode_test} onCheckedChange={v => setForm({ ...form, mode_test: v })} />
                    <Label htmlFor="mode_test">Mode test (sandbox)</Label>
                  </div>
                </div>

                {config?.resultat_derniere_sync && (
                  <div className="p-3 rounded-lg bg-muted/50 border text-xs">
                    <p className="font-semibold">Dernier cycle automatique</p>
                    <p>{config.resultat_derniere_sync}</p>
                  </div>
                )}



                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={handleSaveConfig} disabled={savingConfig}>
                    {savingConfig ? 'Enregistrement...' : 'Enregistrer la configuration'}
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={handleTest} disabled={testing || !config?.base_url}>
                    <PlugZap className="w-4 h-4" /> {testing ? 'Test en cours...' : 'Tester la connexion'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={openLink} onOpenChange={open => { setOpenLink(open); if (!open) setLinkTarget(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Link2 className="w-5 h-5 text-primary" /> Associer un élève</DialogTitle>
              <DialogDescription>
                Transaction {linkTarget?.reference_externe} — {formatCurrency(linkTarget?.montant || 0)}
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-1">
              <Label htmlFor="linkStudent">Élève</Label>
              <Select value={linkStudentId} onValueChange={setLinkStudentId}>
                <SelectTrigger id="linkStudent"><SelectValue placeholder="Sélectionner un élève" /></SelectTrigger>
                <SelectContent>
                  {students.slice(0, 400).map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{studentLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenLink(false)}>Annuler</Button>
              <Button onClick={handleLink}>Associer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={openManual} onOpenChange={setOpenManual}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> Enregistrer un avis bancaire</DialogTitle>
              <DialogDescription>Saisie manuelle d'un paiement reçu hors synchronisation API.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="m_ref">Référence bancaire *</Label>
                <Input id="m_ref" value={manual.reference_externe}
                  onChange={e => setManual({ ...manual, reference_externe: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="m_montant">Montant (FCFA) *</Label>
                <Input id="m_montant" type="number" min="1" value={manual.montant}
                  onChange={e => setManual({ ...manual, montant: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="m_matricule">Matricule élève</Label>
                <Input id="m_matricule" value={manual.matricule_eleve}
                  onChange={e => setManual({ ...manual, matricule_eleve: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="m_canal">Canal</Label>
                <Select value={manual.canal} onValueChange={v => setManual({ ...manual, canal: v })}>
                  <SelectTrigger id="m_canal"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="virement">Virement</SelectItem>
                    <SelectItem value="carte">Carte</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="guichet">Guichet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="m_motif">Motif</Label>
                <Select value={manual.motif} onValueChange={v => setManual({ ...manual, motif: v })}>
                  <SelectTrigger id="m_motif"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scolarite">Scolarité</SelectItem>
                    <SelectItem value="inscription">Inscription</SelectItem>
                    <SelectItem value="cantine">Cantine</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="m_payeur">Nom du payeur</Label>
                <Input id="m_payeur" value={manual.payeur_nom}
                  onChange={e => setManual({ ...manual, payeur_nom: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="m_date">Date de transaction</Label>
                <Input id="m_date" type="date" value={manual.date_transaction}
                  onChange={e => setManual({ ...manual, date_transaction: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenManual(false)}>Annuler</Button>
              <Button onClick={handleCreateManual} disabled={savingManual}>
                {savingManual ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </motion.div>
    </Layout>
  );
}
