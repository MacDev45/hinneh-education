import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, User, Hash, FileText, Calendar, DollarSign, CreditCard, ShieldAlert } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/index';

interface DuplicateTransactionWarningModalProps {
  open: boolean;
  onClose: () => void;
  attemptedTxId: string;
  conflictingPaiement: any | null;
}

export function DuplicateTransactionWarningModal({
  open,
  onClose,
  attemptedTxId,
  conflictingPaiement,
}: DuplicateTransactionWarningModalProps) {
  if (!conflictingPaiement) return null;

  const modeLabels: Record<string, string> = {
    mtn_money: 'MTN Mobile Money',
    orange_money: 'Orange Money',
    moov_money: 'Moov Money',
    wave: 'Wave',
    mobile_money: 'Mobile Money',
    coris_bank: 'Coris Bank',
    virement: 'Virement Bancaire',
    cheque: 'Chèque',
    especes: 'Espèces',
  };

  const modeLabel = modeLabels[conflictingPaiement.mode] || conflictingPaiement.mode || 'Mobile Money / Coris';
  const paymentDate = conflictingPaiement.date ? formatDate(new Date(conflictingPaiement.date)) : 'Date non disponible';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg border-rose-200 dark:border-rose-900 shadow-2xl p-0 overflow-hidden">
        {/* Top Warning Banner */}
        <div className="bg-gradient-to-r from-rose-600 to-red-700 text-white p-5 flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-white/15 border border-white/30 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-7 w-7 text-white animate-bounce" />
          </div>
          <div className="space-y-1">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <span>Transaction Déjà Enregistrée</span>
              <Badge className="bg-rose-950 text-rose-200 border-rose-800 text-[10px]">
                Conflit Détecté
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-rose-100 leading-relaxed">
              L'identifiant de transaction <strong className="font-mono underline text-white font-bold">{attemptedTxId}</strong> est déjà rattaché à un versement actif dans le système.
            </DialogDescription>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Conflicting Payment Details Card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-rose-600" />
              Versement d'origine déjà rattaché :
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-muted-foreground text-[11px]">Élève bénéficiaire :</span>
                <p className="font-bold text-slate-900 dark:text-white truncate">
                  {conflictingPaiement.eleve_nom || 'Élève'}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-muted-foreground text-[11px]">Matricule :</span>
                <p className="font-mono font-semibold text-slate-900 dark:text-white">
                  {conflictingPaiement.matricule || 'N/A'}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-muted-foreground text-[11px]">Classe :</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {conflictingPaiement.classe || 'N/A'}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-muted-foreground text-[11px]">Numéro de reçu :</span>
                <p className="font-mono font-bold text-primary">
                  {conflictingPaiement.numero_recu || `P-${conflictingPaiement.id}`}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-muted-foreground text-[11px]">Montant réglé :</span>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatCurrency(conflictingPaiement.montant || 0)}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-muted-foreground text-[11px]">Date du versement :</span>
                <p className="text-slate-700 dark:text-slate-300">
                  {paymentDate}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Mode de règlement :</span>
              <Badge variant="outline" className="text-[11px] font-normal">
                {modeLabel}
              </Badge>
            </div>
          </div>

          {/* Legal / Procedural Explanatory Note */}
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 p-3 text-xs text-amber-900 dark:text-amber-300 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              Règle d'unicité et de non-duplication :
            </p>
            <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90">
              Chaque transaction Mobile Money (Wave, Orange, MTN, Moov) ou bordereau Coris Bank est unique. Une référence ne peut pas être enregistrée deux fois. Veuillez vérifier le reçu opérateur du parent.
            </p>
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900 border-t flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs h-9 gap-1.5"
            onClick={onClose}
          >
            Corriger l'identifiant de transaction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
