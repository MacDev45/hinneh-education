import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import apiClient from '@/lib/apiClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowRightLeft,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  History,
  Search,
  RotateCcw,
  Printer,
  FileSpreadsheet,
  GraduationCap,
  Sparkles,
  Info,
  Clock,
  UserCheck,
  School,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import type {
  TransfertNotesConfig,
  TransfertNotesSimulationResponse,
  TransfertNotesHistoryItem,
  CandidateGradeItem,
} from '@/lib/index';

export default function TransfertNotesSpace() {
  const { toast } = useToast();

  // État de chargement
  const [loadingConfig, setLoadingConfig] = useState<boolean>(true);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [executing, setExecuting] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Configuration
  const [config, setConfig] = useState<TransfertNotesConfig | null>(null);

  // Filtres du formulaire
  const [anneeScolaire, setAnneeScolaire] = useState<string>('2025-2026');
  const [typePeriode, setTypePeriode] = useState<'trimestre' | 'semestre'>('trimestre');
  const [periodeNumero, setPeriodeNumero] = useState<number>(1);
  const [villeSource, setVilleSource] = useState<string>('Bouaké & Daloa');
  const [ecoleDestinationId, setEcoleDestinationId] = useState<number | null>(null);
  const [selectedClasseId, setSelectedClasseId] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Résultats de simulation
  const [simulationResult, setSimulationResult] = useState<TransfertNotesSimulationResponse | null>(null);

  // Modale de confirmation
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
  const [transferMotif, setTransferMotif] = useState<string>(
    "Rattachement officiel des notes du collège vers le centre d'examen Yamoussoukro (absence de code établissement local)"
  );

  // Historique & Détails
  const [historyList, setHistoryList] = useState<TransfertNotesHistoryItem[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<TransfertNotesHistoryItem | null>(null);
  const [historyDetailNotes, setHistoryDetailNotes] = useState<CandidateGradeItem[]>([]);
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Modale de Rollback
  const [rollbackModalOpen, setRollbackModalOpen] = useState<boolean>(false);
  const [itemToRollback, setItemToRollback] = useState<TransfertNotesHistoryItem | null>(null);
  const [rollbackMotif, setRollbackMotif] = useState<string>('Annulation manuelle demandée');
  const [rollingBack, setRollingBack] = useState<boolean>(false);

  // ─── Chargement initial ──────────────────────────────────────────────────
  useEffect(() => {
    loadConfig();
    loadHistory();
  }, []);

  const loadConfig = async () => {
    try {
      setLoadingConfig(true);
      const data = await apiClient.getTransfertNotesConfig();
      setConfig(data);
      if (data.annee_active) {
        setAnneeScolaire(data.annee_active);
      }
      if (data.ecoles_destination && data.ecoles_destination.length > 0) {
        const def = data.ecoles_destination.find((e) => e.is_default) || data.ecoles_destination[0];
        setEcoleDestinationId(def.id);
      }
    } catch (err: any) {
      console.error('Erreur config transfert notes:', err);
      toast({
        title: 'Erreur de chargement',
        description: 'Impossible de charger les paramètres de transfert.',
        variant: 'destructive',
      });
    } finally {
      setLoadingConfig(false);
    }
  };

  const loadHistory = async (annee?: string) => {
    try {
      setLoadingHistory(true);
      const data = await apiClient.getTransfertNotesHistory(annee || undefined);
      setHistoryList(data);
    } catch (err: any) {
      console.error('Erreur historique transferts:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // ─── Simulation / Prévisualisation ────────────────────────────────────────
  const handleSimulate = async () => {
    if (!ecoleDestinationId) {
      toast({
        title: 'Sélection manquante',
        description: 'Veuillez sélectionner un établissement de destination à Yamoussoukro.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSimulating(true);
      const classeIds = selectedClasseId !== 'ALL' ? [Number(selectedClasseId)] : undefined;
      const res = await apiClient.simulateTransfertNotes({
        annee_scolaire: anneeScolaire,
        type_periode: typePeriode,
        periode_numero: Number(periodeNumero),
        ville_source: villeSource,
        ecole_destination_id: ecoleDestinationId,
        classe_ids: classeIds,
      });

      setSimulationResult(res);
      if (res.total_notes === 0) {
        toast({
          title: 'Aucune note trouvée',
          description: `Aucune évaluation de collège trouvée pour ${villeSource} sur ${anneeScolaire} (${typePeriode === 'trimestre' ? 'Trimestre' : 'Semestre'} ${periodeNumero}).`,
        });
      } else {
        toast({
          title: 'Simulation terminée',
          description: `${res.total_notes} note(s) identifiée(s) pour ${res.total_eleves} élève(s) sur ${res.total_classes} classe(s).`,
        });
      }
    } catch (err: any) {
      console.error('Erreur simulation:', err);
      toast({
        title: 'Erreur lors de la simulation',
        description: err.response?.data?.detail || err.message,
        variant: 'destructive',
      });
    } finally {
      setSimulating(false);
    }
  };

  // ─── Exécution du transfert ──────────────────────────────────────────────
  const handleExecuteTransfer = async () => {
    if (!simulationResult || simulationResult.total_notes === 0 || !ecoleDestinationId) {
      return;
    }

    try {
      setExecuting(true);
      const res = await apiClient.executeTransfertNotes({
        annee_scolaire: anneeScolaire,
        type_periode: typePeriode,
        periode_numero: Number(periodeNumero),
        ville_source: villeSource,
        ecole_destination_id: ecoleDestinationId,
        motif: transferMotif,
      });

      setConfirmModalOpen(false);
      toast({
        title: 'Transfert effectué avec succès !',
        description: res.message,
      });

      // Rafraîchir l'historique et réinitialiser la simulation
      setSimulationResult(null);
      await loadHistory();
    } catch (err: any) {
      console.error('Erreur exécution transfert:', err);
      toast({
        title: 'Échec du transfert',
        description: err.response?.data?.detail || err.message,
        variant: 'destructive',
      });
    } finally {
      setExecuting(false);
    }
  };

  // ─── Consultation des détails d'un transfert ─────────────────────────────
  const handleViewDetail = async (item: TransfertNotesHistoryItem) => {
    setSelectedHistoryItem(item);
    setDetailModalOpen(true);
    try {
      setLoadingDetail(true);
      const res = await apiClient.getTransfertNotesDetail(item.id);
      setHistoryDetailNotes(res.notes || []);
    } catch (err: any) {
      console.error('Erreur détail transfert:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ─── Annulation / Rollback ────────────────────────────────────────────────
  const handleRollback = async () => {
    if (!itemToRollback) return;
    try {
      setRollingBack(true);
      const res = await apiClient.rollbackTransfertNotes(itemToRollback.id, {
        motif: rollbackMotif,
      });

      setRollbackModalOpen(false);
      toast({
        title: 'Annulation réussie',
        description: res.message,
      });
      await loadHistory();
    } catch (err: any) {
      console.error('Erreur rollback:', err);
      toast({
        title: 'Échec de l’annulation',
        description: err.response?.data?.detail || err.message,
        variant: 'destructive',
      });
    } finally {
      setRollingBack(false);
      setItemToRollback(null);
    }
  };

  // ─── Impression du Bordereau officiel ────────────────────────────────────
  const handlePrintBordereau = (item: TransfertNotesHistoryItem, notes: CandidateGradeItem[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const notesRows = notes
      .slice(0, 300)
      .map(
        (n, idx) => `
        <tr>
          <td style="border: 1px solid #333; padding: 4px; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #333; padding: 4px; font-family: monospace;">${n.matricule || '-'}</td>
          <td style="border: 1px solid #333; padding: 4px; font-weight: bold;">${n.eleve_nom}</td>
          <td style="border: 1px solid #333; padding: 4px;">${n.classe_nom}</td>
          <td style="border: 1px solid #333; padding: 4px;">${n.matiere}</td>
          <td style="border: 1px solid #333; padding: 4px; text-align: center;">${n.type_devoir}</td>
          <td style="border: 1px solid #333; padding: 4px; text-align: center; font-weight: bold;">${Number(n.note).toFixed(2)} / 20</td>
          <td style="border: 1px solid #333; padding: 4px; text-align: center;">${n.coefficient}</td>
          <td style="border: 1px solid #333; padding: 4px; text-align: center;">${n.ville_source}</td>
        </tr>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Bordereau de Transfert des Notes - Collège #${item.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; color: #111; }
            @page { size: A4 portrait; margin: 12mm; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 15px; }
            .title { text-align: center; margin: 15px 0; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
            .meta-box { background: #f4f4f4; border: 1px solid #ccc; padding: 10px; margin-bottom: 15px; border-radius: 4px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
            th { background: #2c3e50; color: #fff; padding: 5px; border: 1px solid #333; text-align: left; }
            td { border: 1px solid #333; }
            .footer-sign { display: flex; justify-content: space-between; margin-top: 40px; page-break-inside: avoid; }
            .sign-box { width: 45%; border-top: 1px dashed #333; padding-top: 8px; text-align: center; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <strong>RÉPUBLIQUE DE CÔTE D'IVOIRE</strong><br/>
              Union - Discipline - Travail<br/>
              Ministère de l'Éducation Nationale<br/>
              Direction des Examens et Concours (DECO)
            </div>
            <div style="text-align: right;">
              <strong>BORDEREAU OFFICIEL DE TRANSMISSION</strong><br/>
              Réf : BTN-${item.id}-${item.annee_scolaire.replace('-', '')}<br/>
              Date : ${new Date(item.date_transfert).toLocaleDateString('fr-FR')}<br/>
              Année Scolaire : ${item.annee_scolaire}
            </div>
          </div>

          <div class="title">BORDEREAU DE RATTACHEMENT & TRANSFERT DES NOTES DU COLLÈGE</div>
          <div style="text-align: center; margin-bottom: 10px; font-style: italic;">
            Rattachement administratif au centre d'examen officiel de Yamoussoukro (Absence de code d'établissement local)
          </div>

          <div class="meta-box">
            <div><strong>Provenance :</strong> ${item.ville_source} (${item.nom_ecole_source || 'Collèges'})</div>
            <div><strong>Centre Récepteur :</strong> ${item.nom_ecole_destination} (Code : ${item.code_etablissement_destination})</div>
            <div><strong>Période :</strong> ${item.type_periode.toUpperCase()} ${item.periode_numero}</div>
            <div><strong>Nombre de notes transmises :</strong> ${item.nombre_notes}</div>
            <div><strong>Élèves concernés :</strong> ${item.nombre_eleves}</div>
            <div><strong>Classes concernées :</strong> ${item.nombre_classes}</div>
            <div><strong>Opérateur :</strong> ${item.effectue_par || 'Direction'}</div>
            <div><strong>Statut :</strong> ${item.statut.toUpperCase()}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 4%;">N°</th>
                <th style="width: 14%;">Matricule</th>
                <th style="width: 24%;">Nom & Prénoms</th>
                <th style="width: 14%;">Classe</th>
                <th style="width: 16%;">Matière</th>
                <th style="width: 10%;">Type</th>
                <th style="width: 8%;">Note</th>
                <th style="width: 5%;">Coeff</th>
                <th style="width: 5%;">Origine</th>
              </tr>
            </thead>
            <tbody>
              ${notesRows}
            </tbody>
          </table>

          <div class="footer-sign">
            <div class="sign-box">
              Pour les Établissements Sources (${item.ville_source})<br/>
              Le Directeur des Études / Éducateur<br/><br/><br/>
              (Signature & Cachet)
            </div>
            <div class="sign-box">
              Pour le Centre Récepteur de Yamoussoukro<br/>
              Le Chef d'Établissement / DECO<br/><br/><br/>
              (Signature & Cachet)
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 400);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filtrage des notes candidates affichées dans la table
  const filteredCandidates = useMemo(() => {
    if (!simulationResult || !simulationResult.notes) return [];
    if (!searchFilter.trim()) return simulationResult.notes;
    const term = searchFilter.toLowerCase();
    return simulationResult.notes.filter(
      (n) =>
        n.eleve_nom.toLowerCase().includes(term) ||
        (n.matricule && n.matricule.toLowerCase().includes(term)) ||
        n.classe_nom.toLowerCase().includes(term) ||
        n.matiere.toLowerCase().includes(term)
    );
  }, [simulationResult, searchFilter]);

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* ─── Bannière de Titre ────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 rounded-2xl p-6 md:p-8 text-white shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-white border-white/40 bg-white/10 uppercase tracking-wider text-xs">
                  Module Pédagogique & DECO
                </Badge>
                <Badge variant="outline" className="text-emerald-200 border-emerald-300/40 bg-emerald-500/20 text-xs">
                  Centre d'Examen Yamoussoukro
                </Badge>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Transfert des Notes du Collège vers Yamoussoukro
              </h1>
              <p className="text-blue-100 text-sm md:text-base mt-2 max-w-3xl leading-relaxed">
                Rattachement administratif obligatoire : Les collèges de <strong>Bouaké</strong> et <strong>Daloa</strong> ne disposant pas de code d'établissement officiel propre pour les examens et bulletins centralisés, leurs évaluations sont transférées vers le centre de rattachement de <strong>Yamoussoukro</strong>.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/20">
              <School className="w-8 h-8 text-blue-200" />
              <div className="text-xs">
                <div className="font-semibold text-white">Centre de Rattachement</div>
                <div className="text-blue-200">Lycée Islamique (LIY-03)</div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Onglets Principaux ───────────────────────────────────────────── */}
        <Tabs defaultValue="transfert" className="space-y-6">
          <TabsList className="grid w-full md:w-96 grid-cols-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <TabsTrigger value="transfert" className="flex items-center gap-2 rounded-lg font-medium">
              <ArrowRightLeft className="w-4 h-4" />
              Nouveau Transfert
            </TabsTrigger>
            <TabsTrigger value="historique" className="flex items-center gap-2 rounded-lg font-medium">
              <History className="w-4 h-4" />
              Historique ({historyList.length})
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════════════════════════════════
              ONGLET 1 : NOUVEAU TRANSFERT
          ═══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="transfert" className="space-y-6">
            {/* Formulaire de configuration */}
            <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-4 border-b bg-slate-50/50 dark:bg-slate-900/50">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Paramètres de Transfert des Notes
                </CardTitle>
                <CardDescription>
                  Définissez l'année scolaire, le découpage temporel et les villes sources des collèges à transférer.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {/* 1. Année Scolaire */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Année Scolaire *
                    </Label>
                    <Select value={anneeScolaire} onValueChange={setAnneeScolaire}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choisir l'année" />
                      </SelectTrigger>
                      <SelectContent>
                        {config?.annees_scolaires?.map((an) => (
                          <SelectItem key={an} value={an}>
                            {an} {an === config?.annee_active ? '(En cours)' : ''}
                          </SelectItem>
                        )) || (
                          <SelectItem value="2025-2026">2025-2026</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 2. Type de Période (Trimestre / Semestre) */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Type de Période *
                    </Label>
                    <Select
                      value={typePeriode}
                      onValueChange={(val: 'trimestre' | 'semestre') => {
                        setTypePeriode(val);
                        setPeriodeNumero(1);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Type de période" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trimestre">Régime Trimestriel (Trimestre)</SelectItem>
                        <SelectItem value="semestre">Régime Semestriel (Semestre)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 3. Numéro de la Période */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Période Spécifique *
                    </Label>
                    <Select
                      value={String(periodeNumero)}
                      onValueChange={(val) => setPeriodeNumero(Number(val))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Période" />
                      </SelectTrigger>
                      <SelectContent>
                        {typePeriode === 'trimestre' ? (
                          <>
                            <SelectItem value="1">1er Trimestre</SelectItem>
                            <SelectItem value="2">2ème Trimestre</SelectItem>
                            <SelectItem value="3">3ème Trimestre</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="1">1er Semestre</SelectItem>
                            <SelectItem value="2">2ème Semestre</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 4. Ville Source (Bouaké / Daloa) */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Origine des Notes (Villes) *
                    </Label>
                    <Select value={villeSource} onValueChange={setVilleSource}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Ville source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bouaké & Daloa">Bouaké & Daloa réunis</SelectItem>
                        <SelectItem value="Bouaké">Bouaké uniquement</SelectItem>
                        <SelectItem value="Daloa">Daloa uniquement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 5. Destination (Yamoussoukro) */}
                  <div className="space-y-2 lg:col-span-2">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Établissement Récepteur à Yamoussoukro *</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-normal text-[11px]">Centre officiel</span>
                    </Label>
                    <Select
                      value={ecoleDestinationId ? String(ecoleDestinationId) : ''}
                      onValueChange={(val) => setEcoleDestinationId(Number(val))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choisir l'établissement récepteur" />
                      </SelectTrigger>
                      <SelectContent>
                        {config?.ecoles_destination?.map((ec) => (
                          <SelectItem key={ec.id} value={String(ec.id)}>
                            {ec.nom} (Code : {ec.code})
                          </SelectItem>
                        )) || (
                          <SelectItem value="3">Lycée Islamique Yamoussoukro (LIY-03)</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 6. Filtre optionnel classe de collège */}
                  <div className="space-y-2 lg:col-span-2">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Classe de Collège Spécifique (Optionnel)
                    </Label>
                    <Select value={selectedClasseId} onValueChange={setSelectedClasseId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Toutes les classes de collège" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Toutes les classes du collège (6ème, 5ème, 4ème, 3ème)</SelectItem>
                        {config?.classes_college?.map((cl) => (
                          <SelectItem key={cl.id} value={String(cl.id)}>
                            {cl.nom} ({cl.ville} — {cl.nb_eleves} élèves)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Bouton de simulation */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Info className="w-4 h-4 text-blue-500" />
                    <span>La simulation analyse les notes sans modifier la base de données.</span>
                  </div>

                  <Button
                    onClick={handleSimulate}
                    disabled={simulating || loadingConfig}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 shadow-md transition-all flex items-center gap-2"
                  >
                    {simulating ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin" />
                        Analyse en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Prévisualiser / Simuler le Transfert
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* ─── Panneau de Résultats de Simulation ─────────────────────── */}
            {simulationResult && (
              <div className="space-y-6">
                {/* Cartes KPI */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="border-blue-200 bg-blue-50/40 dark:bg-blue-950/20">
                    <CardContent className="p-4 flex flex-col justify-between">
                      <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Notes Candidates</div>
                      <div className="text-2xl font-extrabold text-blue-900 dark:text-blue-100 mt-1">
                        {simulationResult.total_notes}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">Évaluations à transférer</div>
                    </CardContent>
                  </Card>

                  <Card className="border-indigo-200 bg-indigo-50/40 dark:bg-indigo-950/20">
                    <CardContent className="p-4 flex flex-col justify-between">
                      <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Élèves Concernés</div>
                      <div className="text-2xl font-extrabold text-indigo-900 dark:text-indigo-100 mt-1">
                        {simulationResult.total_eleves}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">Cycle collège</div>
                    </CardContent>
                  </Card>

                  <Card className="border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20">
                    <CardContent className="p-4 flex flex-col justify-between">
                      <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Classes Concernées</div>
                      <div className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-100 mt-1">
                        {simulationResult.total_classes}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">De Bouaké & Daloa</div>
                    </CardContent>
                  </Card>

                  <Card className="border-amber-200 bg-amber-50/40 dark:bg-amber-950/20">
                    <CardContent className="p-4 flex flex-col justify-between">
                      <div className="text-xs font-medium text-amber-600 dark:text-amber-400">Moyenne Globale</div>
                      <div className="text-2xl font-extrabold text-amber-900 dark:text-amber-100 mt-1">
                        {simulationResult.moyenne_generale !== undefined ? `${simulationResult.moyenne_generale} / 20` : 'N/A'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">Ensemble des matières</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Synthèse par Classes et Matières */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Répartition par Classe */}
                  <Card className="border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-3 border-b">
                      <CardTitle className="text-sm font-semibold flex items-center justify-between">
                        <span>Répartition par Classe de Collège</span>
                        <Badge variant="outline">{simulationResult.classes_concernees?.length || 0} classes</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="max-h-60 overflow-y-auto divide-y">
                        {simulationResult.classes_concernees && simulationResult.classes_concernees.length > 0 ? (
                          simulationResult.classes_concernees.map((cl) => (
                            <div key={cl.classe_id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-900">
                              <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{cl.classe_nom}</span>
                                <Badge className="ml-2 text-[10px]" variant="secondary">{cl.ville}</Badge>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-blue-600">{cl.nb_notes} notes</span>
                                <span className="text-slate-400 ml-2">Moy: {cl.moyenne}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-slate-500">Aucune classe impactée</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Répartition par Matière */}
                  <Card className="border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-3 border-b">
                      <CardTitle className="text-sm font-semibold flex items-center justify-between">
                        <span>Répartition par Matière</span>
                        <Badge variant="outline">{simulationResult.matieres_concernees?.length || 0} matières</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="max-h-60 overflow-y-auto divide-y">
                        {simulationResult.matieres_concernees && simulationResult.matieres_concernees.length > 0 ? (
                          simulationResult.matieres_concernees.map((m) => (
                            <div key={m.matiere} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-900">
                              <span className="font-medium text-slate-800 dark:text-slate-200">{m.matiere}</span>
                              <div className="text-right">
                                <span className="font-bold text-indigo-600">{m.nb_notes} notes</span>
                                <span className="text-slate-400 ml-2">Moy: {m.moyenne}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-slate-500">Aucune matière impactée</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Tableau Détaillé des Notes */}
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="pb-3 border-b flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base font-semibold">
                        Liste Détaillée des Notes Candidates ({filteredCandidates.length})
                      </CardTitle>
                      <CardDescription>
                        Évaluations qui seront rattachées au code de Yamoussoukro (<strong>{simulationResult.code_etablissement_destination}</strong>).
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                          placeholder="Filtrer élève, matière..."
                          value={searchFilter}
                          onChange={(e) => setSearchFilter(e.target.value)}
                          className="pl-9 h-9 text-xs"
                        />
                      </div>

                      {simulationResult.total_notes > 0 && (
                        <Button
                          onClick={() => setConfirmModalOpen(true)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md flex items-center gap-2 h-9 text-xs"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Confirmer & Transférer ({simulationResult.total_notes})
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                          <TableRow className="text-xs">
                            <TableHead className="w-12 text-center">N°</TableHead>
                            <TableHead>Matricule</TableHead>
                            <TableHead>Élève</TableHead>
                            <TableHead>Classe</TableHead>
                            <TableHead>Matière</TableHead>
                            <TableHead>Devoir</TableHead>
                            <TableHead className="text-center">Période</TableHead>
                            <TableHead className="text-center">Note (/20)</TableHead>
                            <TableHead className="text-center">Coeff</TableHead>
                            <TableHead className="text-center">Origine</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="text-xs">
                          {filteredCandidates.length > 0 ? (
                            filteredCandidates.map((n, idx) => (
                              <TableRow key={n.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/80">
                                <TableCell className="text-center text-slate-400">{idx + 1}</TableCell>
                                <TableCell className="font-mono text-[11px] font-semibold">{n.matricule || '-'}</TableCell>
                                <TableCell className="font-medium text-slate-900 dark:text-slate-100">{n.eleve_nom}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px]">{n.classe_nom}</Badge>
                                </TableCell>
                                <TableCell>{n.matiere}</TableCell>
                                <TableCell className="capitalize text-slate-500">{n.type_devoir}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="secondary" className="text-[10px]">
                                    {typePeriode === 'trimestre' ? `Trim ${n.trimestre}` : `Sem ${n.semestre || 1}`}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center font-bold text-slate-900 dark:text-white">
                                  <span className={n.note < 10 ? 'text-red-600' : 'text-emerald-600'}>
                                    {Number(n.note).toFixed(2)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">{n.coefficient}</TableCell>
                                <TableCell className="text-center">
                                  <Badge
                                    className={`text-[10px] ${
                                      n.ville_source === 'Bouaké'
                                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                                        : 'bg-amber-100 text-amber-800 border-amber-200'
                                    }`}
                                  >
                                    {n.ville_source}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={10} className="text-center py-8 text-slate-400">
                                Aucune note candidate correspondant au filtre.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════
              ONGLET 2 : HISTORIQUE DES TRANSFERTS & TRAÇABILITÉ
          ═══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="historique" className="space-y-6">
            <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-600" />
                    Historique des Transferts de Notes
                  </CardTitle>
                  <CardDescription>
                    Registre des opérations de transmission vers Yamoussoukro avec traçabilité complète et possibilité d'annulation.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadHistory()}
                    disabled={loadingHistory}
                    className="flex items-center gap-2 text-xs"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                    Actualiser
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900">
                      <TableRow className="text-xs">
                        <TableHead className="w-16">ID</TableHead>
                        <TableHead>Date / Heure</TableHead>
                        <TableHead>Année Scolaire</TableHead>
                        <TableHead>Période</TableHead>
                        <TableHead>Origine</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead className="text-center">Notes</TableHead>
                        <TableHead className="text-center">Élèves</TableHead>
                        <TableHead className="text-center">Moyenne</TableHead>
                        <TableHead className="text-center">Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs">
                      {historyList.length > 0 ? (
                        historyList.map((item) => (
                          <TableRow key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                            <TableCell className="font-mono font-semibold">#{item.id}</TableCell>
                            <TableCell>
                              {new Date(item.date_transfert).toLocaleDateString('fr-FR')}{' '}
                              <span className="text-slate-400 text-[10px]">
                                {new Date(item.date_transfert).toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.annee_scolaire}</Badge>
                            </TableCell>
                            <TableCell className="capitalize">
                              {item.type_periode} {item.periode_numero}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={
                                  item.ville_source.includes('Bouaké') && item.ville_source.includes('Daloa')
                                    ? 'bg-purple-100 text-purple-800'
                                    : item.ville_source === 'Bouaké'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }
                              >
                                {item.ville_source}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-slate-800 dark:text-slate-200">
                                {item.nom_ecole_destination || 'Yamoussoukro'}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Code : {item.code_etablissement_destination}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-bold text-blue-600">
                              {item.nombre_notes}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {item.nombre_eleves}
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {item.moyenne_generale_transfert !== undefined
                                ? `${Number(item.moyenne_generale_transfert).toFixed(2)}`
                                : '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {item.statut === 'effectue' ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                                  <Check className="w-3 h-3 mr-1" />
                                  Effectué
                                </Badge>
                              ) : (
                                <Badge variant="destructive">Annulé</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewDetail(item)}
                                  className="h-8 text-xs text-blue-600 hover:text-blue-700"
                                >
                                  Détails
                                </Button>

                                {item.statut === 'effectue' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setItemToRollback(item);
                                      setRollbackModalOpen(true);
                                    }}
                                    className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                  >
                                    Annuler
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-10 text-slate-400">
                            Aucun transfert de notes historisé pour l'instant.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ─── Modale de Confirmation d'Exécution ───────────────────────────── */}
        <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg text-slate-900 dark:text-white">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Confirmer le Transfert des Notes
              </DialogTitle>
              <DialogDescription>
                Cette opération va officiellement rattacher ces évaluations au code d'établissement de Yamoussoukro pour la validation DECO et l'édition des bulletins.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl space-y-2 border">
                <div className="flex justify-between">
                  <span className="text-slate-500">Année Scolaire :</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{anneeScolaire}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Période :</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                    {typePeriode} {periodeNumero}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Origine :</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{villeSource}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Destination :</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {simulationResult?.ecole_destination_nom} ({simulationResult?.code_etablissement_destination})
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-slate-500 font-bold">Total notes à transférer :</span>
                  <span className="font-extrabold text-blue-600 text-sm">{simulationResult?.total_notes}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Motif du Transfert (Audit officiel)</Label>
                <Input
                  value={transferMotif}
                  onChange={(e) => setTransferMotif(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setConfirmModalOpen(false)} disabled={executing}>
                Retour
              </Button>
              <Button
                onClick={handleExecuteTransfer}
                disabled={executing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2"
              >
                {executing ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Transfert en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Valider le Transfert
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Modale de Détail d'un Transfert + Impression Bordereau ──────── */}
        <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
            <DialogHeader className="border-b pb-3">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                    Détail du Transfert #{selectedHistoryItem?.id}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    {selectedHistoryItem?.annee_scolaire} — {selectedHistoryItem?.type_periode} {selectedHistoryItem?.periode_numero} ({selectedHistoryItem?.ville_source} → {selectedHistoryItem?.nom_ecole_destination})
                  </DialogDescription>
                </div>

                {selectedHistoryItem && (
                  <Button
                    onClick={() => handlePrintBordereau(selectedHistoryItem, historyDetailNotes)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 flex items-center gap-2 shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Imprimer le Bordereau Officiel
                  </Button>
                )}
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              {loadingDetail ? (
                <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4 animate-spin" />
                  Chargement des notes transférées...
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                    <TableRow className="text-xs">
                      <TableHead className="w-10">N°</TableHead>
                      <TableHead>Matricule</TableHead>
                      <TableHead>Élève</TableHead>
                      <TableHead>Classe</TableHead>
                      <TableHead>Matière</TableHead>
                      <TableHead>Devoir</TableHead>
                      <TableHead className="text-center">Note (/20)</TableHead>
                      <TableHead className="text-center">Coeff</TableHead>
                      <TableHead className="text-center">Origine</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {historyDetailNotes.map((n, idx) => (
                      <TableRow key={n.id}>
                        <TableCell className="text-slate-400">{idx + 1}</TableCell>
                        <TableCell className="font-mono text-[11px] font-semibold">{n.matricule || '-'}</TableCell>
                        <TableCell className="font-medium">{n.eleve_nom}</TableCell>
                        <TableCell>{n.classe_nom}</TableCell>
                        <TableCell>{n.matiere}</TableCell>
                        <TableCell className="capitalize text-slate-500">{n.type_devoir}</TableCell>
                        <TableCell className="text-center font-bold text-slate-900 dark:text-white">
                          <span className={n.note < 10 ? 'text-red-600' : 'text-emerald-600'}>
                            {Number(n.note).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">{n.coefficient}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{n.ville_origine || n.ville_source}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <DialogFooter className="border-t pt-3">
              <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Modale d'Annulation / Rollback ────────────────────────────────── */}
        <Dialog open={rollbackModalOpen} onOpenChange={setRollbackModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                Annuler le Transfert #{itemToRollback?.id}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Cette action va restaurer les <strong>{itemToRollback?.nombre_notes} notes</strong> à leur état et école d'origine (Bouaké / Daloa).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Motif d'annulation *</Label>
                <Input
                  value={rollbackMotif}
                  onChange={(e) => setRollbackMotif(e.target.value)}
                  placeholder="Ex : Erreur de saisie de période, double envoi..."
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setRollbackModalOpen(false)} disabled={rollingBack}>
                Conserver
              </Button>
              <Button
                variant="destructive"
                onClick={handleRollback}
                disabled={rollingBack || !rollbackMotif.trim()}
                className="flex items-center gap-2"
              >
                {rollingBack ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Annulation...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Confirmer l'Annulation
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
