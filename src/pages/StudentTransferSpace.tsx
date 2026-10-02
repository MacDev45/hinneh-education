import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import apiClient from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeftRight,
  ArrowRight,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  GraduationCap,
  School as SchoolIcon,
  Filter,
  CheckSquare,
  Square,
  History,
  UserCheck,
  Sparkles,
  Shuffle,
} from 'lucide-react';
import { ROUTE_PATHS, type Student, type ClassRoom, type School } from '@/lib/index';

// Fonctions utilitaires pour unifier les formats API/frontend
const getStudentClassId = (st: any): string => {
  return String(st.classe_id ?? st.classId ?? '');
};

const getStudentSchoolId = (st: any): string => {
  return String(st.ecole_id ?? st.schoolId ?? '');
};

const getStudentNomComplet = (st: any): string => {
  const nom = st.nom || st.lastName || '';
  const prenom = st.prenom || st.firstName || '';
  return `${nom} ${prenom}`.trim() || 'Élève sans nom';
};

export default function StudentTransferSpace() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const urlSourceClassId = searchParams.get('sourceClassId');
  const urlStudentId = searchParams.get('studentId');

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Données de base
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [schools, setSchools] = useState<School[]>([]);

  // Filtres Source
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('all');
  const [sourceClassId, setSourceClassId] = useState<string>(urlSourceClassId || 'all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sélection des élèves
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>(
    urlStudentId ? [Number(urlStudentId)] : []
  );

  // Destination
  const [targetClassId, setTargetClassId] = useState<string>('');
  const [motif, setMotif] = useState<string>('Rééquilibrage d’effectifs');
  const [customMotif, setCustomMotif] = useState<string>('');
  const [realignEcheancier, setRealignEcheancier] = useState<boolean>(true);
  const [dispatchEvaluations, setDispatchEvaluations] = useState<boolean>(true);

  // Simulation state
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simulationData, setSimulationData] = useState<any>(null);
  const [simulationModalOpen, setSimulationModalOpen] = useState<boolean>(false);

  // Modal de confirmation
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);

  // Historique de session des transferts
  const [sessionTransfers, setSessionTransfers] = useState<Array<{
    id: string;
    date: string;
    count: number;
    targetClassNom: string;
    students: any[];
    motif: string;
  }>>([]);

  // Chargement initial
  useEffect(() => {
    loadData();
  }, []);

  // Synchronisation si l'URL contient un sourceClassId
  useEffect(() => {
    if (urlSourceClassId && urlSourceClassId !== sourceClassId) {
      setSourceClassId(urlSourceClassId);
    }
  }, [urlSourceClassId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [studRes, clsRes, schRes] = await Promise.all([
        apiClient.getStudents(),
        apiClient.getClasses(),
        apiClient.getSchools().catch(() => []),
      ]);
      setStudents(studRes || []);
      setClasses(clsRes || []);
      setSchools(schRes || []);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur de chargement',
        description: 'Impossible de charger la liste des élèves et des classes.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Classes filtrées selon l'école sélectionnée
  const filteredClasses = useMemo(() => {
    if (selectedSchoolId === 'all') return classes;
    return classes.filter((c: any) => {
      const cSchoolId = String(c.ecole_id ?? c.schoolId ?? '');
      const cEtab = String(c.ET_CODEETABLISSEMENT ?? '');
      return cSchoolId === String(selectedSchoolId) || cEtab === String(selectedSchoolId);
    });
  }, [classes, selectedSchoolId]);

  // Élèves filtrés pour le panneau source
  const sourceStudents = useMemo(() => {
    return students.filter((st: any) => {
      // 1. Filtre établissement
      if (selectedSchoolId !== 'all') {
        const studentSchoolId = getStudentSchoolId(st);
        const studentEtab = String(st.ET_CODEETABLISSEMENT || st.codeEtablissement || st.code_etablissement || '');
        if (studentSchoolId !== String(selectedSchoolId) && studentEtab !== String(selectedSchoolId)) {
          return false;
        }
      }

      // 2. Filtre classe source
      const studentClassId = getStudentClassId(st);
      if (sourceClassId === 'no_class') {
        if (studentClassId && studentClassId !== '0' && studentClassId !== 'null' && studentClassId !== 'undefined' && studentClassId !== '') {
          return false;
        }
      } else if (sourceClassId !== 'all') {
        if (studentClassId !== String(sourceClassId)) {
          return false;
        }
      }

      // 3. Filtre texte de recherche (nom, prénom, matricule)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = getStudentNomComplet(st).toLowerCase();
        const mat = (st.matricule || '').toLowerCase();
        if (!fullName.includes(q) && !mat.includes(q)) return false;
      }

      return true;
    });
  }, [students, selectedSchoolId, sourceClassId, searchQuery]);

  // Classe cible objet
  const targetClassObj = useMemo(() => {
    if (!targetClassId) return null;
    return classes.find((c: any) => String(c.id) === String(targetClassId)) || null;
  }, [classes, targetClassId]);

  // Effectif réel de la classe cible
  const targetClassStudentsCount = useMemo(() => {
    if (!targetClassId) return 0;
    return students.filter((s: any) => getStudentClassId(s) === String(targetClassId)).length;
  }, [students, targetClassId]);

  // Gestion de la sélection multiple
  const handleToggleSelectAll = () => {
    if (selectedStudentIds.length === sourceStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(sourceStudents.map((s) => Number(s.id)));
    }
  };

  const handleSelectAllCurrentClass = () => {
    setSelectedStudentIds(sourceStudents.map((s) => Number(s.id)));
  };

  const handleToggleStudent = (id: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Liste des élèves actuellement sélectionnés
  const selectedStudentsList = useMemo(() => {
    return students.filter((s) => selectedStudentIds.includes(Number(s.id)));
  }, [students, selectedStudentIds]);

  // Validation avant ouverture du dialogue de confirmation
  const handleInitiateTransfer = () => {
    if (selectedStudentIds.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Sélection requise',
        description: 'Veuillez cocher au moins un élève dans la colonne de gauche avant de transférer.',
      });
      return;
    }

    if (!targetClassId) {
      toast({
        variant: 'destructive',
        title: 'Classe cible requise',
        description: 'Veuillez sélectionner la classe de destination.',
      });
      return;
    }

    if (sourceClassId !== 'all' && sourceClassId === targetClassId) {
      toast({
        variant: 'destructive',
        title: 'Classes identiques',
        description: 'La classe de destination doit être différente de la classe d’origine.',
      });
      return;
    }

    setConfirmModalOpen(true);
  };

  // Simulation du transfert et rééquilibrage des moyennes
  const handleRunSimulation = async (studentId?: number) => {
    const targetId = Number(targetClassId);
    const sId = studentId || (selectedStudentIds.length > 0 ? selectedStudentIds[0] : null);
    if (!sId || !targetId) {
      toast({
        variant: 'destructive',
        title: 'Sélection requise',
        description: 'Veuillez sélectionner au moins un élève et une classe cible pour simuler le transfert.',
      });
      return;
    }
    setSimulating(true);
    try {
      const sim = await apiClient.simulateTransfer({
        student_id: sId,
        target_class_id: targetId,
      });
      setSimulationData(sim);
      setSimulationModalOpen(true);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur de simulation',
        description: err?.response?.data?.detail || 'Impossible de calculer la simulation pour cet élève.',
      });
    } finally {
      setSimulating(false);
    }
  };

  // Exécution du transfert via l'API
  const handleConfirmTransfer = async () => {
    if (!targetClassId || selectedStudentIds.length === 0) return;
    setSubmitting(true);

    const finalMotif = motif === 'Autre motif' ? (customMotif || 'Transfert de classe') : motif;

    try {
      const res = await apiClient.transferStudents({
        student_ids: selectedStudentIds,
        target_class_id: Number(targetClassId),
        source_class_id: sourceClassId !== 'all' && sourceClassId !== 'no_class' ? Number(sourceClassId) : undefined,
        motif: finalMotif,
        realign_echeancier: realignEcheancier,
        dispatch_evaluations: dispatchEvaluations,
      });

      toast({
        title: 'Transfert effectué avec succès !',
        description: res.message || `${selectedStudentIds.length} élève(s) transféré(s).`,
      });

      // Enregistrer dans l'historique de session
      setSessionTransfers((prev) => [
        {
          id: String(Date.now()),
          date: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          count: selectedStudentIds.length,
          targetClassNom: targetClassObj?.name || targetClassObj?.CE_LIBELLE || `Classe #${targetClassId}`,
          students: res.transferred_students || selectedStudentsList,
          motif: finalMotif,
        },
        ...prev,
      ]);

      // Mettre à jour l'état local des élèves immédiatement
      const transferredMap = new Map((res.transferred_students || []).map((ts: any) => [Number(ts.id), ts]));
      setStudents((prev) =>
        prev.map((s) => {
          if (selectedStudentIds.includes(Number(s.id))) {
            const trInfo = transferredMap.get(Number(s.id));
            return {
              ...s,
              classId: String(targetClassId),
              classe_id: Number(targetClassId),
              className: targetClassObj?.name || targetClassObj?.CE_LIBELLE || s.className,
              classe_nom: targetClassObj?.name || targetClassObj?.CE_LIBELLE || s.classe_nom,
              schoolId: targetClassObj?.ecole_id ? String(targetClassObj.ecole_id) : s.schoolId,
              ecole_id: targetClassObj?.ecole_id ? Number(targetClassObj.ecole_id) : s.ecole_id,
              moyenne: trInfo?.new_moyenne ?? s.moyenne,
            };
          }
          return s;
        })
      );

      // Réinitialiser la sélection et fermer les modales
      setSelectedStudentIds([]);
      setConfirmModalOpen(false);
      setSimulationModalOpen(false);

      // Recharger les données depuis l'API pour synchroniser parfaitement les effectifs
      await loadData();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Échec du transfert',
        description: err.response?.data?.detail || err.message || 'Une erreur est survenue lors du transfert.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 pb-12">
        {/* EN-TÊTE DE LA PAGE */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Transfert d’Élèves vers des Classes
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Déplacez facilement un ou plusieurs élèves vers leur nouvelle classe en 2 étapes.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-stretch md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="text-xs h-9 gap-1.5"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* BANNIÈRE ORIENTATION & CHANGEMENT DE SÉRIE DÉTACHÉ AUX COULEURS HÎNNEH */}
        <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/90 via-sky-50/70 to-emerald-50/60 p-4 dark:border-blue-900/50 dark:from-slate-900 dark:via-blue-950/30 dark:to-emerald-950/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <img
              src="/images/hinneh_logo_20260507_234919.png"
              alt="Logo Hînneh"
              className="w-11 h-11 rounded-full border-2 border-blue-600 p-0.5 object-contain bg-white shrink-0 mt-0.5 shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-blue-950 dark:text-blue-100">
                  Changement de Série & Réorientation Académique (Lycée)
                </h3>
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider">
                  Module Dédié
                </Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 max-w-2xl">
                Pour réorienter un élève vers une autre série (ex: <strong>Seconde C ➔ Seconde A</strong>, <strong>1ère D ➔ 1ère A</strong>) avec rééquilibrage automatisé des coefficients réels et recalcul immédiat de sa moyenne, utilisez le module académique dédié.
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate(ROUTE_PATHS.STUDENT_SERIE_TRANSFER)}
            className="gap-2 shrink-0 bg-blue-600 hover:bg-blue-700 text-white shadow-sm text-xs font-bold h-9 px-4"
          >
            Aller au Changement de Série
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* DOUBLE PANNEAU : SOURCE & DESTINATION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* PANNEAU GAUCHE : SÉLECTION DE LA SOURCE (7 colonnes) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
                      1. Classe d’origine & Sélection des Élèves
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Cochez les élèves à déplacer dans le tableau ci-dessous
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-xs font-bold px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {sourceStudents.length} élève{sourceStudents.length > 1 ? 's' : ''} listé{sourceStudents.length > 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3.5">
                {/* FILTRES ECOLE & CLASSE SOURCE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {schools.length > 1 && (
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <SchoolIcon className="w-3.5 h-3.5 text-slate-500" /> Établissement
                      </Label>
                      <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Tous les établissements" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les établissements</SelectItem>
                          {schools.map((sch: any) => (
                            <SelectItem key={sch.id || sch.IDETABLISSEMENT} value={String(sch.id || sch.IDETABLISSEMENT)}>
                              {sch.name || sch.ET_DENOMMINATION} ({sch.city || sch.ET_VILLE || 'CI'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className={`space-y-1 ${schools.length <= 1 ? 'sm:col-span-2' : ''}`}>
                    <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5 text-slate-500" /> Classe Source
                    </Label>
                    <Select value={sourceClassId} onValueChange={(val) => {
                      setSourceClassId(val);
                      setSelectedStudentIds([]);
                    }}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Sélectionner la classe source" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="all">Toutes les classes ({students.length} élèves)</SelectItem>
                        <SelectItem value="no_class">Élèves sans classe assignée</SelectItem>
                        {filteredClasses.map((cls: any) => {
                          const count = students.filter((s: any) => getStudentClassId(s) === String(cls.id)).length;
                          const name = cls.name || cls.CE_LIBELLE || `Classe #${cls.id}`;
                          return (
                            <SelectItem key={cls.id} value={String(cls.id)}>
                              {name} ({count} élève{count > 1 ? 's' : ''})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* RECHERCHE INSTANTANEE & ACTIONS DE SELECTION */}
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <div className="relative w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Rechercher par nom, prénom ou matricule..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleToggleSelectAll}
                    disabled={sourceStudents.length === 0}
                    className="h-9 text-xs whitespace-nowrap gap-1.5 w-full sm:w-auto font-medium"
                  >
                    {selectedStudentIds.length === sourceStudents.length && sourceStudents.length > 0 ? (
                      <>
                        <Square className="w-3.5 h-3.5 text-indigo-600" /> Tout désélectionner
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-3.5 h-3.5 text-indigo-600" /> Tout cocher ({sourceStudents.length})
                      </>
                    )}
                  </Button>
                </div>

                {/* BARRE D'ETAT DE SELECTION */}
                <div className="flex justify-between items-center px-3 py-2 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-lg border border-indigo-100 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-300 font-medium">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <strong>{selectedStudentIds.length}</strong> élève{selectedStudentIds.length > 1 ? 's' : ''} coché{selectedStudentIds.length > 1 ? 's' : ''} pour transfert
                  </span>
                  {selectedStudentIds.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setSelectedStudentIds([])}
                      className="text-[11px] underline hover:text-indigo-800 dark:hover:text-white"
                    >
                      Effacer la sélection
                    </button>
                  ) : (
                    <span className="text-[11px] text-indigo-600/80 dark:text-indigo-400 italic">
                      Cochez les élèves dans la liste ci-dessous 👇
                    </span>
                  )}
                </div>

                {/* TABLEAU DES ELEVES SOURCE */}
                <ScrollArea className="h-[420px] rounded-lg border border-slate-200 dark:border-slate-800">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-xs">
                      <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
                      Chargement des élèves...
                    </div>
                  ) : sourceStudents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
                      <Users className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
                      <p className="text-sm font-semibold">Aucun élève trouvé</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Modifiez les filtres de classe ou la recherche.
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-900/70 sticky top-0 z-10 shadow-xs">
                        <TableRow className="text-xs">
                          <TableHead className="w-10 text-center">
                            <Checkbox
                              checked={
                                sourceStudents.length > 0 &&
                                selectedStudentIds.length === sourceStudents.length
                              }
                              onCheckedChange={handleToggleSelectAll}
                              aria-label="Tout sélectionner"
                            />
                          </TableHead>
                          <TableHead>Élève</TableHead>
                          <TableHead>Matricule</TableHead>
                          <TableHead>Classe actuelle</TableHead>
                          <TableHead className="text-center">Genre</TableHead>
                          <TableHead className="text-center">Moyenne</TableHead>
                          <TableHead className="text-right">Série / Réorientation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sourceStudents.map((st: any) => {
                          const isSelected = selectedStudentIds.includes(Number(st.id));
                          const curClassId = getStudentClassId(st);
                          const curClass =
                            classes.find((c: any) => String(c.id) === curClassId)?.name ||
                            classes.find((c: any) => String(c.id) === curClassId)?.CE_LIBELLE ||
                            st.classe_nom ||
                            st.className ||
                            st.AU_CLASSEPRECEDENTE ||
                            'Non assigné';

                          const fullName = getStudentNomComplet(st);
                          const photoUrl = st.photoUrl || st.photo || st.photo_url;
                          const genreVal = st.genre || st.gender || 'M';
                          const moyenneVal = st.moyenne !== undefined && st.moyenne !== null ? Number(st.moyenne) : null;

                          return (
                            <TableRow
                              key={st.id}
                              onClick={() => handleToggleStudent(Number(st.id))}
                              className={`cursor-pointer text-xs transition-colors ${
                                isSelected
                                  ? 'bg-indigo-50/70 dark:bg-indigo-950/60 hover:bg-indigo-100/60 font-medium'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                              }`}
                            >
                              <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => handleToggleStudent(Number(st.id))}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-7 h-7 border border-slate-200 dark:border-slate-700">
                                    <AvatarImage src={photoUrl} />
                                    <AvatarFallback className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold">
                                      {fullName.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-slate-900 dark:text-white">
                                      {fullName}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                                {st.matricule || 'N/A'}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-medium bg-white dark:bg-slate-950"
                                >
                                  {curClass}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    genreVal === 'F'
                                      ? 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300'
                                      : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                  }`}
                                >
                                  {genreVal}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                {moyenneVal !== null && moyenneVal > 0 ? (
                                  <Badge
                                    variant="secondary"
                                    className={`text-[10px] font-bold ${
                                      moyenneVal >= 12
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                        : moyenneVal >= 10
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    }`}
                                  >
                                    {moyenneVal.toFixed(2)} / 20
                                  </Badge>
                                ) : (
                                  <span className="text-[11px] text-slate-400">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                <Button
                                   type="button"
                                   variant="ghost"
                                   size="sm"
                                   onClick={() => navigate(`${ROUTE_PATHS.STUDENT_SERIE_TRANSFER}?studentId=${st.id}&sourceClassId=${curClassId}`)}
                                   className="h-6 px-2 text-[10px] text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 gap-1 font-semibold"
                                   title="Changer de série dans le module dédié"
                                 >
                                   <Shuffle className="w-3 h-3 text-blue-600" /> Changer série
                                 </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* PANNEAU DROIT : CLASSE DESTINATION & PARAMETRES (5 colonnes) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                  2. Classe de Destination & Options
                </CardTitle>
                <CardDescription className="text-xs">
                  Choisissez la classe vers laquelle transférer les élèves
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* SELECTEUR DE LA CLASSE DESTINATION */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-emerald-600" />
                    Classe Cible (Nouvelle Affectation) *
                  </Label>
                  <Select value={targetClassId} onValueChange={setTargetClassId}>
                    <SelectTrigger className="h-10 text-xs font-semibold bg-white dark:bg-slate-950 border-emerald-300 dark:border-emerald-800 focus:ring-emerald-500">
                      <SelectValue placeholder="Sélectionner la classe de destination..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {classes.map((cls: any) => {
                        const count = students.filter((s: any) => getStudentClassId(s) === String(cls.id)).length;
                        const name = cls.name || cls.CE_LIBELLE || `Classe #${cls.id}`;
                        const isCurrentSource = sourceClassId !== 'all' && String(cls.id) === String(sourceClassId);

                        return (
                          <SelectItem
                            key={cls.id}
                            value={String(cls.id)}
                            disabled={isCurrentSource}
                          >
                            <span className="font-semibold">{name}</span>
                            <span className="text-slate-400 text-[11px] ml-2">
                              ({count} élève{count > 1 ? 's' : ''})
                            </span>
                            {isCurrentSource && (
                              <span className="text-amber-500 text-[10px] ml-1.5 font-bold">
                                (Classe source)
                              </span>
                            )}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* PREVIEW DE LA CLASSE SELECTIONNEE */}
                {targetClassObj && (
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl p-3 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Classe sélectionnée :</span>
                      <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
                        {targetClassObj.name || targetClassObj.CE_LIBELLE}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-100 dark:border-emerald-900/60">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Effectif actuel :</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {targetClassStudentsCount} élève{targetClassStudentsCount > 1 ? 's' : ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Nouvel effectif prévu :</p>
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                          {targetClassStudentsCount + selectedStudentIds.length} élève{targetClassStudentsCount + selectedStudentIds.length > 1 ? 's' : ''}
                          {selectedStudentIds.length > 0 && (
                            <span className="text-xs font-normal text-emerald-600 ml-1">
                              (+{selectedStudentIds.length})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* MOTIF DE TRANSFERT */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Motif ou Justification du Transfert
                  </Label>
                  <Select value={motif} onValueChange={setMotif}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rééquilibrage d’effectifs">Rééquilibrage d’effectifs</SelectItem>
                      <SelectItem value="Ajustement de niveau pédagogique">Ajustement de niveau pédagogique</SelectItem>
                      <SelectItem value="Changement de filière / Option">Changement de filière / Option</SelectItem>
                      <SelectItem value="Demande expresse des parents">Demande expresse des parents</SelectItem>
                      <SelectItem value="Régularisation administrative">Régularisation administrative</SelectItem>
                      <SelectItem value="Autre motif">Autre motif (préciser ci-dessous)</SelectItem>
                    </SelectContent>
                  </Select>

                  {motif === 'Autre motif' && (
                    <Input
                      placeholder="Précisez la raison du transfert..."
                      value={customMotif}
                      onChange={(e) => setCustomMotif(e.target.value)}
                      className="h-9 text-xs mt-1.5"
                    />
                  )}
                </div>

                {/* REALIGNEMENT FINANCIER */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
                  <Checkbox
                    id="realign"
                    checked={realignEcheancier}
                    onCheckedChange={(checked) => setRealignEcheancier(Boolean(checked))}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <label
                      htmlFor="realign"
                      className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                      Réaligner l’échéancier financier
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Recalcule automatiquement la grille tarifaire (scolarité, échéances) selon le tarif officiel de la nouvelle classe.
                    </p>
                  </div>
                </div>

                {/* DISPATCHING DES NOTES & RECALCUL DES MOYENNES */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/40">
                  <Checkbox
                    id="dispatch"
                    checked={dispatchEvaluations}
                    onCheckedChange={(checked) => setDispatchEvaluations(Boolean(checked))}
                    className="mt-0.5 data-[state=checked]:bg-indigo-600"
                  />
                  <div className="space-y-0.5">
                    <label
                      htmlFor="dispatch"
                      className="text-xs font-bold text-indigo-950 dark:text-indigo-200 cursor-pointer"
                    >
                      Transférer les notes & coefficients réels
                    </label>
                    <p className="text-[11px] text-indigo-700/80 dark:text-indigo-400">
                      Rattache les évaluations du trimestre et rééquilibre selon les coefficients de la filière cible (ex: Seconde C vers Seconde A applique Maths coef 3 et Français coef 5).
                    </p>
                  </div>
                </div>

                {/* ACCÈS AU MODULE DÉDIÉ CHANGEMENT DE SÉRIE */}
                <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 space-y-2">
                  <div className="flex items-center gap-2 text-blue-950 dark:text-blue-200 font-bold text-xs">
                    <Shuffle className="h-4 w-4 text-blue-600" />
                    Changement de Série & Rééquilibrage (Lycée)
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Pour réorienter un élève vers une autre filière (ex: Seconde C vers Seconde A) avec recalcul des coefficients réels et simulation comparative, accédez au module dédié.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const firstId = selectedStudentIds.length > 0 ? selectedStudentIds[0] : '';
                      navigate(`${ROUTE_PATHS.STUDENT_SERIE_TRANSFER}${firstId ? `?studentId=${firstId}` : ''}`);
                    }}
                    className="w-full border-blue-300 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 gap-1.5 text-xs font-semibold"
                  >
                    <Shuffle className="w-3.5 h-3.5 text-blue-600" />
                    Ouvrir le module Changement de Série
                  </Button>
                </div>

                {/* BANDEAU D'AIDE ET D'ÉTAT CLAIR */}
                {selectedStudentIds.length === 0 ? (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold text-xs">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Étape 1 requise : Aucun élève coché</span>
                    </div>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      Veuillez <strong>cocher au moins un élève</strong> dans la liste de gauche (ou cliquer sur <strong>"Tout cocher"</strong>) pour pouvoir lancer le transfert.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                    <span className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      {selectedStudentIds.length} élève{selectedStudentIds.length > 1 ? 's' : ''} sélectionné{selectedStudentIds.length > 1 ? 's' : ''} et prêt{selectedStudentIds.length > 1 ? 's' : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedStudentIds([])}
                      className="text-[11px] underline text-emerald-700 hover:text-emerald-900"
                    >
                      Annuler la sélection
                    </button>
                  </div>
                )}

                {/* BOUTON D'ACTION PRINCIPALE */}
                <Button
                  size="lg"
                  onClick={handleInitiateTransfer}
                  disabled={selectedStudentIds.length === 0 || !targetClassId || submitting}
                  className={`w-full h-11 font-bold text-xs gap-2 rounded-xl transition-all shadow-sm ${
                    selectedStudentIds.length === 0 || !targetClassId
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 hover:shadow-md'
                  }`}
                >
                  {selectedStudentIds.length === 0 ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      Cochez des élèves à gauche pour activer le transfert
                    </>
                  ) : !targetClassId ? (
                    <>
                      <GraduationCap className="w-4 h-4" />
                      Sélectionnez une classe cible ci-dessus
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      Transférer {selectedStudentIds.length} élève{selectedStudentIds.length > 1 ? 's' : ''} vers{' '}
                      {targetClassObj?.name || targetClassObj?.CE_LIBELLE || 'la classe cible'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* HISTORIQUE DE SESSION */}
            {sessionTransfers.length > 0 && (
              <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-2.5">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                    <History className="w-4 h-4 text-indigo-500" />
                    Historique des Transferts de cette session
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {sessionTransfers.map((st) => (
                    <div
                      key={st.id}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900 dark:text-white">
                          ➔ Vers {st.targetClassNom}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {st.date}
                        </Badge>
                      </div>
                      <p className="text-slate-500 text-[11px]">
                        <strong>{st.count} élève(s)</strong> — Motif : {st.motif}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* MODAL DE CONFIRMATION AVANT EXECUTION */}
        <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <DialogTitle className="text-center text-base font-bold">
                Confirmer le transfert de classe
              </DialogTitle>
              <DialogDescription className="text-center text-xs text-slate-500">
                Vous êtes sur le point de déplacer {selectedStudentIds.length} élève{selectedStudentIds.length > 1 ? 's' : ''} vers la classe{' '}
                <strong>{targetClassObj?.name || targetClassObj?.CE_LIBELLE}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Nombre d'élèves :</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedStudentIds.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Nouvelle classe :</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {targetClassObj?.name || targetClassObj?.CE_LIBELLE}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Motif enregistré :</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {motif === 'Autre motif' ? customMotif : motif}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Échéancier financier :</span>
                  <Badge variant={realignEcheancier ? 'default' : 'outline'} className="text-[10px]">
                    {realignEcheancier ? 'Réaligné au tarif cible' : 'Inchangé'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Dispatching des notes :</span>
                  <Badge variant={dispatchEvaluations ? 'default' : 'outline'} className={`text-[10px] ${dispatchEvaluations ? 'bg-indigo-600 text-white' : ''}`}>
                    {dispatchEvaluations ? 'Coefficients rééquilibrés' : 'Inchangé'}
                  </Badge>
                </div>
              </div>

              {/* Aperçu des premiers élèves */}
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-500">Élèves concernés :</Label>
                <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {selectedStudentsList.slice(0, 10).map((st: any) => (
                    <div key={st.id} className="p-1.5 flex justify-between items-center">
                      <span className="font-medium">{getStudentNomComplet(st)}</span>
                      <span className="font-mono text-[10px] text-slate-400">{st.matricule}</span>
                    </div>
                  ))}
                  {selectedStudentsList.length > 10 && (
                    <div className="p-1.5 text-center text-[10px] text-slate-400 italic">
                      + {selectedStudentsList.length - 10} autre(s) élève(s)...
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmModalOpen(false)}
                disabled={submitting}
              >
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmTransfer}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                {submitting ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" /> Transfert en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Confirmer et transférer
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL DE SIMULATION & COMPARAISON DES COEFFICIENTS */}
        <Dialog open={simulationModalOpen} onOpenChange={setSimulationModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6">
            <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
                <Sparkles className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Simulation & Dispatching Pédagogique</span>
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                Rééquilibrage des Notes & Coefficients
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Aperçu fidèle de la transition de série : les notes du trimestre sont importées et pondérées selon les coefficients réels de la classe de destination.
              </DialogDescription>
            </DialogHeader>

            {simulationData ? (
              <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1">
                {/* En-tête de transition élève */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold flex items-center justify-center text-sm">
                      {simulationData.student?.nom?.charAt(0) || 'E'}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {simulationData.student?.nom_complet}
                      </h4>
                      <p className="text-xs font-mono text-slate-400">
                        Matricule : {simulationData.student?.matricule}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="px-2.5 py-1 border-slate-300 font-semibold">
                      {simulationData.old_class?.nom || 'Origine'} {simulationData.old_class?.serie && simulationData.old_class?.serie !== 'COMMUN' ? `(Série ${simulationData.old_class?.serie})` : ''}
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-indigo-500" />
                    <Badge className="px-2.5 py-1 bg-indigo-600 text-white font-bold">
                      {simulationData.target_class?.nom} {simulationData.target_class?.serie && simulationData.target_class?.serie !== 'COMMUN' ? `(Série ${simulationData.target_class?.serie})` : ''}
                    </Badge>
                  </div>
                </div>

                {/* Synthèse des Moyennes & Points */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-center">
                    <span className="text-[11px] font-medium text-slate-500">Moyenne Classe Origine</span>
                    <div className="text-xl font-black text-slate-700 dark:text-slate-300 mt-1">
                      {Number(simulationData.old_moyenne || 0).toFixed(2)} <span className="text-xs font-normal">/ 20</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Total : {simulationData.total_old_points} pts ({simulationData.total_old_coefficients} coeffs)</span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/40 text-center">
                    <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">Nouvelle Moyenne Cible</span>
                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                      {Number(simulationData.new_moyenne || 0).toFixed(2)} <span className="text-xs font-normal">/ 20</span>
                    </div>
                    <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80">Total : {simulationData.total_new_points} pts ({simulationData.total_new_coefficients} coeffs)</span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-center flex flex-col justify-center">
                    <span className="text-[11px] font-medium text-slate-500">Impact de Réorientation</span>
                    <div className="mt-1">
                      {simulationData.difference > 0 ? (
                        <Badge className="bg-emerald-600 text-white font-bold text-sm px-2.5 py-0.5">
                          +{Number(simulationData.difference).toFixed(2)} pts
                        </Badge>
                      ) : simulationData.difference < 0 ? (
                        <Badge className="bg-amber-600 text-white font-bold text-sm px-2.5 py-0.5">
                          {Number(simulationData.difference).toFixed(2)} pts
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="font-bold text-sm px-2.5 py-0.5">
                          0.00 pt (Équivalent)
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1">Pondération ministérielle</span>
                  </div>
                </div>

                {/* Tableau comparatif par matière */}
                {simulationData.subjects && simulationData.subjects.length > 0 ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Détail du rééquilibrage matière par matière :
                    </Label>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
                      <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-900">
                          <TableRow>
                            <TableHead className="font-bold">Matière</TableHead>
                            <TableHead className="text-center font-bold">Moyenne Note</TableHead>
                            <TableHead className="text-center font-bold">Ancien Coeff</TableHead>
                            <TableHead className="text-center font-bold">Nouveau Coeff</TableHead>
                            <TableHead className="text-center font-bold">Anciens Pts</TableHead>
                            <TableHead className="text-center font-bold">Nouveaux Pts</TableHead>
                            <TableHead className="text-right font-bold">Variation</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {simulationData.subjects.map((sub: any, idx: number) => {
                            const isCoeffChanged = sub.old_coeff !== sub.new_coeff;
                            return (
                              <TableRow key={idx} className={isCoeffChanged ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''}>
                                <TableCell className="font-semibold text-slate-900 dark:text-white">
                                  {sub.matiere}
                                </TableCell>
                                <TableCell className="text-center font-mono font-medium">
                                  {Number(sub.note_moyenne || 0).toFixed(2)} / 20
                                </TableCell>
                                <TableCell className="text-center text-slate-500 font-mono">
                                  {sub.old_coeff}
                                </TableCell>
                                <TableCell className="text-center font-mono">
                                  <Badge variant={isCoeffChanged ? 'default' : 'outline'} className={`text-[10px] ${isCoeffChanged ? 'bg-indigo-600 text-white' : ''}`}>
                                    {sub.new_coeff}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center font-mono text-slate-500">
                                  {sub.old_points}
                                </TableCell>
                                <TableCell className="text-center font-mono font-bold text-indigo-700 dark:text-indigo-300">
                                  {sub.new_points}
                                </TableCell>
                                <TableCell className="text-right font-mono text-[11px]">
                                  {sub.difference_points > 0 ? (
                                    <span className="text-emerald-600 font-bold">+{sub.difference_points}</span>
                                  ) : sub.difference_points < 0 ? (
                                    <span className="text-amber-600 font-bold">{sub.difference_points}</span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                    Aucune note d’évaluation enregistrée pour cet élève au trimestre courant. Le transfert de série appliquera les coefficients dès la première note saisie.
                  </div>
                )}

                {/* Explication pédagogique */}
                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-300">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed text-[11px]">
                    <strong>Principe pédagogique de réorientation :</strong> En transférant par exemple de la Seconde C vers la Seconde A, les aptitudes littéraires sont valorisées (Français coef 5, Anglais coef 4) tandis que les matières scientifiques sont allégées (Maths coef 3, Physique-Chimie coef 2). Les travaux et notes de l’élève sont intégralement conservés et rééquilibrés selon ce barème.
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                Chargement de la simulation...
              </div>
            )}

            <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 gap-2 sm:gap-0">
              <Button variant="outline" size="sm" onClick={() => setSimulationModalOpen(false)}>
                Fermer l'aperçu
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setSimulationModalOpen(false);
                  setConfirmModalOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Passer à la confirmation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
