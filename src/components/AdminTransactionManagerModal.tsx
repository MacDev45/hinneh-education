import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Edit3,
  Lock,
  AlertTriangle,
  CreditCard,
  Building,
  User,
  Hash,
  Clock,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/apiClient';
import { formatCurrency, formatDate } from '@/lib/index';

interface AdminTransactionManagerModalProps {
  open: boolean;
  onClose: () => void;
  onTransactionUpdated?: () => void;
}

export function AdminTransactionManagerModal({
  open,
  onClose,
  onTransactionUpdated,
}: AdminTransactionManagerModalProps) {
  const { toast } = useToast();

  const userRole = (typeof localStorage !== 'undefined' ? localStorage.getItem('user_role') || '' : '').toLowerCase();
  const isAdmin = ['admin', 'superuser', 'direction_fondation', 'directeur'].includes(userRole);

  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState('all');

  // Edit State
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [newTxId, setNewTxId] = useState('');
  const [motifModification, setMotifModification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkingUniqueness, setCheckingUniqueness] = useState(false);
  const [conflictPaiement, setConflictPaiement] = useState<any | null>(null);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getMobileMoneyCorisTransactions({
        search: searchTerm || undefined,
        mode: modeFilter !== 'all' ? modeFilter : undefined,
        limit: 150,
      });
      setTransactions(data || []);
    } catch (err: any) {
      console.warn('Erreur chargement transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadTransactions();
    }
  }, [open, modeFilter]);

  const filteredTransactions = useMemo(() => {
    if (!searchTerm.trim()) return transactions;
    const q = searchTerm.toLowerCase().trim();
    return transactions.filter(
      (tx) =>
        (tx.numero_transaction && tx.numero_transaction.toLowerCase().includes(q)) ||
        (tx.numero_recu && tx.numero_recu.toLowerCase().includes(q)) ||
        (tx.eleve_nom && tx.eleve_nom.toLowerCase().includes(q)) ||
        (tx.matricule && tx.matricule.toLowerCase().includes(q))
    );
  }, [transactions, searchTerm]);

  const handleOpenEdit = (tx: any) => {
    if (!isAdmin) {
      toast({
        variant: 'destructive',
        title: '🔒 Accès restreint',
        description: "Seul l'administrateur est autorisé à modifier les identifiants de transaction.",
      });
      return;
    }
    setSelectedTx(tx);
    setNewTxId(tx.numero_transaction || '');
    setMotifModification('');
    setConflictPaiement(null);
    setOpenEditDialog(true);
  };

  const handleVerifyAndSave = async () => {
    if (!selectedTx) return;
    const cleanId = newTxId.trim();
    if (!cleanId) {
      toast({
        variant: 'destructive',
        title: 'Champ requis',
        description: "Veuillez renseigner le nouvel identifiant de transaction.",
      });
      return;
    }
    if (!motifModification.trim()) {
      toast({
        variant: 'destructive',
        title: 'Motif obligatoire',
        description: 'Le motif de modification est requis pour la traçabilité et le journal d’audit.',
      });
      return;
    }

    setSubmitting(true);
    setConflictPaiement(null);
    try {
      // 1. Vérification d'unicité
      const check = await apiClient.checkTransactionId(cleanId, selectedTx.id);
      if (check.exists && check.paiement) {
        setConflictPaiement(check.paiement);
        toast({
          variant: 'destructive',
          title: '⛔ Conflit d’identifiant',
          description: `Cet ID est déjà utilisé par l'élève ${check.paiement.eleve_nom} (Reçu: ${check.paiement.numero_recu}).`,
        });
        setSubmitting(false);
        return;
      }

      // 2. Envoi de la mise à jour
      const res = await apiClient.updateTransactionId(selectedTx.id, {
        nouveau_numero_transaction: cleanId,
        motif_modification: motifModification.trim(),
        admin_nom: localStorage.getItem('username') || 'Administrateur',
      });

      toast({
        title: '✅ Identifiant modifié avec succès',
        description: res.message || `L'identifiant est désormais : ${cleanId}`,
      });

      setOpenEditDialog(false);
      loadTransactions();
      if (onTransactionUpdated) onTransactionUpdated();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Erreur lors de la mise à jour.';
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: typeof msg === 'string' ? msg : JSON.stringify(msg),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const modeBadge = (mode: string) => {
    const m = (mode || '').toLowerCase();
    if (m.includes('wave')) return <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-400/30 text-[10px]">Wave</Badge>;
    if (m.includes('orange')) return <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-400/30 text-[10px]">Orange Money</Badge>;
    if (m.includes('mtn')) return <Badge className="bg-yellow-500/15 text-yellow-800 dark:text-yellow-300 border-yellow-400/30 text-[10px]">MTN Money</Badge>;
    if (m.includes('moov')) return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-400/30 text-[10px]">Moov Money</Badge>;
    if (m.includes('coris')) return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/30 text-[10px]">Coris Bank</Badge>;
    return <Badge variant="outline" className="text-[10px]">{mode || 'Mobile / Banque'}</Badge>;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-4xl max-h-[85vh] p-0 flex flex-col border-indigo-200 dark:border-indigo-900 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0f2444] via-[#173868] to-[#1e457c] text-white p-5 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0">
                <CreditCard className="h-6 w-6 text-blue-300" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Gestion des Identifiants de Transactions</span>
                  {isAdmin ? (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] gap-1 font-semibold">
                      <ShieldCheck className="h-3 w-3" /> Espace Administrateur
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-blue-200 border-blue-400/30 text-[10px] gap-1">
                      <Lock className="h-3 w-3" /> Consultation (Caisse / Comptabilité)
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-blue-100/80 mt-0.5">
                  Suivi des flux Mobile Money (Wave, Orange, MTN, Moov) et Coris Bank avec contrôle d'unicité strict.
                </DialogDescription>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-8 gap-1 text-xs shrink-0"
              onClick={loadTransactions}
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>

          {/* Search & Filters */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher élève, matricule, reçu, ID..."
                className="pl-8 h-9 text-xs bg-white dark:bg-slate-900"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={modeFilter} onValueChange={setModeFilter}>
                <SelectTrigger className="w-48 h-9 text-xs bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Opérateur / Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les opérateurs</SelectItem>
                  <SelectItem value="wave">Wave</SelectItem>
                  <SelectItem value="orange_money">Orange Money</SelectItem>
                  <SelectItem value="mtn_money">MTN Money</SelectItem>
                  <SelectItem value="moov_money">Moov Money</SelectItem>
                  <SelectItem value="coris_bank">Coris Bank</SelectItem>
                  <SelectItem value="virement">Virement bancaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Transactions List Table */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary opacity-60" />
                <p className="text-xs text-muted-foreground">Chargement des transactions Mobile Money & Coris Bank...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="py-16 text-center space-y-2 border border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
                <FileText className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Aucune transaction trouvée</p>
                <p className="text-xs text-muted-foreground">Aucun règlement Mobile Money ou Coris ne correspond aux critères.</p>
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground border-b">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">ID Transaction</th>
                      <th className="py-2.5 px-3 font-semibold">Élève & Matricule</th>
                      <th className="py-2.5 px-3 font-semibold">Reçu & Date</th>
                      <th className="py-2.5 px-3 font-semibold">Opérateur</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Montant</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3">
                          {tx.numero_transaction ? (
                            <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200/50 dark:border-indigo-800/40 text-[11px]">
                              {tx.numero_transaction}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">(Non renseigné)</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-foreground">{tx.eleve_nom || 'Élève inconnu'}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {tx.matricule ? `Mat: ${tx.matricule}` : ''} {tx.classe ? `· ${tx.classe}` : ''}
                          </p>
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-mono text-[11px] font-medium text-foreground">{tx.numero_recu || `P-${tx.id}`}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {tx.date ? formatDate(new Date(tx.date)) : ''}
                          </p>
                        </td>
                        <td className="py-2.5 px-3">
                          {modeBadge(tx.mode)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-foreground">
                          {formatCurrency(tx.montant || 0)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isAdmin ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] gap-1 bg-white dark:bg-slate-900 hover:border-primary"
                              onClick={() => handleOpenEdit(tx)}
                            >
                              <Edit3 className="h-3 w-3 text-primary" />
                              Modifier l'ID
                            </Button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Lock className="h-3 w-3" /> Verrouillé
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <DialogFooter className="p-3 bg-slate-50 dark:bg-slate-900 border-t flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {filteredTransactions.length} transaction(s) listée(s)
            </p>
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs h-8">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL EDITION SECURISEE (RESERVEE ADMIN) */}
      <Dialog open={openEditDialog} onOpenChange={(isOpen) => !isOpen && setOpenEditDialog(false)}>
        <DialogContent className="max-w-md border-indigo-200 dark:border-indigo-900 shadow-2xl p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0">
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white">
                Rectifier l'ID de Transaction
              </DialogTitle>
              <DialogDescription className="text-xs text-blue-100">
                Action administrative tracée et soumise au journal d'audit.
              </DialogDescription>
            </div>
          </div>

          <div className="p-5 space-y-4 text-xs">
            {selectedTx && (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Élève :</span>
                  <span className="font-bold text-foreground">{selectedTx.eleve_nom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reçu :</span>
                  <span className="font-mono text-primary font-bold">{selectedTx.numero_recu}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Montant :</span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(selectedTx.montant || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID Actuel :</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {selectedTx.numero_transaction || '(vide)'}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="newTxId" className="font-bold text-slate-700 dark:text-slate-300">
                Nouvel Identifiant de Transaction *
              </Label>
              <Input
                id="newTxId"
                placeholder="Ex: WAVE-REF-778899 / OM-123456"
                value={newTxId}
                onChange={(e) => setNewTxId(e.target.value)}
                className="font-mono font-bold text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                L'identifiant doit être unique et ne pas exister pour un autre versement.
              </p>
            </div>

            {conflictPaiement && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-[11px] space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                  Identifiant déjà pris !
                </p>
                <p>
                  Déjà rattaché à l'élève <strong>{conflictPaiement.eleve_nom}</strong> (Reçu : {conflictPaiement.numero_recu}).
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="motifModif" className="font-bold text-slate-700 dark:text-slate-300">
                Motif obligatoire de la rectification *
              </Label>
              <Textarea
                id="motifModif"
                placeholder="Ex: Correction suite à erreur de frappe sur le reçu opérateur de la caisse..."
                value={motifModification}
                onChange={(e) => setMotifModification(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="p-3 bg-slate-50 dark:bg-slate-900 border-t flex flex-row gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => setOpenEditDialog(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              size="sm"
              className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white font-medium"
              onClick={handleVerifyAndSave}
              disabled={submitting}
            >
              {submitting ? 'Validation...' : 'Valider la modification'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
