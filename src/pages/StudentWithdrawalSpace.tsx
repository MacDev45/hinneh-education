import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  UserMinus,
  UserX,
  Search,
  School as SchoolIcon,
  GraduationCap,
  AlertTriangle,
  Printer,
  Trash2,
  Users,
  CheckCircle2,
  History,
  ShieldAlert,
  RotateCcw,
  FileDown,
  FileText,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  XCircle,
  X,
  Layers,
} from 'lucide-react';
import {
  formatStudentName,
  getPersonInitials,
  ROUTE_PATHS,
  type Student,
  type ClassRoom,
  type School,
} from '@/lib/index';
import {
  printCertificatRadiation,
  downloadCertificatRadiationPDF,
} from '@/lib/schoolDocumentsPrinter';
import {
  downloadWithdrawnStudentsPDF,
  printWithdrawnStudentsRegister,
} from '@/lib/studentWithdrawalPrinter';
import { AppLogoLoader } from '@/components/AppLogoLoader';

interface RetraitHistoriqueItem {
  id: string | number;
  eleve_id?: number;
  matricule: string;
  nom: string;
  prenom: string;
  nom_complet?: string;
  classe?: string;
  nom_classe?: string;
  ecoleNom?: string;
  nom_ecole?: string;
  cycle?: string;
  niveau?: string;
  motif?: string;
  motif_retrait?: string;
  dateRadiation?: string;
  date_retrait?: string;
  etablissementAccueil?: string;
  etablissement_accueil?: string;
  observations?: string;
  statut?: string;
  tuteur_nom?: string;
  tuteur_contact?: string;
}

export default function StudentWithdrawalSpace() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Données principales
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [schools, setSchools] = useState<School[]>([]);

  // Filtres
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sélection pour retrait par lot
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

  // Modal de retrait individuel
  const [withdrawModalOpen, setWithdrawModalOpen] = useState<boolean>(false);
  const [targetStudent, setTargetStudent] = useState<Student | null>(null);

  // Champs du formulaire de retrait
  const [motif, setMotif] = useState<string>('Transfert vers un autre établissement');
  const [etablissementAccueil, setEtablissementAccueil] = useState<string>('');
  const [dateRadiation, setDateRadiation] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [observations, setObservations] = useState<string>('');
  const [confirmSafetyCheck, setConfirmSafetyCheck] = useState<boolean>(false);

  // Modal de retrait par lot
  const [bulkModalOpen, setBulkModalOpen] = useState<boolean>(false);
  const [bulkMotif, setBulkMotif] = useState<string>('Transfert groupé ou fin de cycle');
  const [bulkDateRadiation, setBulkDateRadiation] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [bulkEtablissementAccueil, setBulkEtablissementAccueil] = useState<string>('');
  const [bulkObservations, setBulkObservations] = useState<string>('');
  const [bulkConfirmSafetyCheck, setBulkConfirmSafetyCheck] = useState<boolean>(false);

  // Pagination élèves actifs
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Pagination historique
  const [historyCurrentPage, setHistoryCurrentPage] = useState<number>(1);
  const [historyPageSize, setHistoryPageSize] = useState<number>(25);

  // Historique persistant en base de données (table api_historique_eleve)
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);
  const [loadingCertificateId, setLoadingCertificateId] = useState<string | number | null>(null);
  const [downloadingCertificateId, setDownloadingCertificateId] = useState<string | number | null>(null);

  // Chargement des données
  const loadData = async () => {
    try {
      setLoading(true);
      const [studentsData, classesData, schoolsData, historyData] = await Promise.all([
        apiClient.getStudents(),
        apiClient.getClasses(),
        apiClient.getSchools(),
        apiClient.getStudentWithdrawalHistory().catch(() => []),
      ]);
      setStudents(studentsData);
      setClasses(classesData);
      setSchools(schoolsData);
      setHistoryList(historyData || []);
    } catch (err: any) {
      console.error('Erreur chargement données retrait:', err);
      toast({
        variant: 'destructive',
        title: 'Erreur de chargement',
        description: 'Impossible de charger la liste des élèves.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Classes triées et filtrées
  const sortedClasses = useMemo(() => {
    return [...classes]
      .filter((c) => {
        if (selectedSchoolId === 'all') return true;
        return (
          String(c.schoolId || (c as any).ecole_id || '') === String(selectedSchoolId)
        );
      })
      .sort((a, b) =>
        (a.name || a.CE_LIBELLE || '').localeCompare(
          b.name || b.CE_LIBELLE || '',
          'fr',
          { numeric: true, sensitivity: 'base' }
        )
      );
  }, [classes, selectedSchoolId]);

  // Écoles triées
  const sortedSchools = useMemo(() => {
    return [...schools].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base' })
    );
  }, [schools]);

  // Élèves filtrés et triés par Nom puis Prénom
  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => {
        // Filtre école
        if (selectedSchoolId !== 'all') {
          const sSchoolId = String(s.schoolId || (s as any).ecole_id || '');
          if (sSchoolId !== selectedSchoolId) return false;
        }

        // Filtre classe
        if (selectedClassId !== 'all') {
          const sClassId = String(s.classId || (s as any).classe_id || '');
          if (sClassId !== selectedClassId) return false;
        }

        // Recherche textuelle
        if (searchQuery.trim()) {
          const query = searchQuery.trim().toLowerCase();
          const nom = (s.lastName || s.nom || '').toLowerCase();
          const prenom = (s.firstName || s.prenom || '').toLowerCase();
          const mat = (s.matricule || '').toLowerCase();
          const nomComplet1 = `${nom} ${prenom}`;
          const nomComplet2 = `${prenom} ${nom}`;
          return (
            nom.includes(query) ||
            prenom.includes(query) ||
            mat.includes(query) ||
            nomComplet1.includes(query) ||
            nomComplet2.includes(query)
          );
        }

        return true;
      })
      .sort((a, b) => {
        const nomA = a.lastName || a.nom || '';
        const nomB = b.lastName || b.nom || '';
        const prenomA = a.firstName || a.prenom || '';
        const prenomB = b.firstName || b.prenom || '';
        const cmp = nomA.localeCompare(nomB, 'fr', { sensitivity: 'base' });
        if (cmp !== 0) return cmp;
        return prenomA.localeCompare(prenomB, 'fr', { sensitivity: 'base' });
      });
  }, [students, selectedSchoolId, selectedClassId, searchQuery]);

  // Historique filtré et trié
  const filteredHistoryList = useMemo(() => {
    if (!historySearchQuery.trim()) return historyList;
    const q = historySearchQuery.trim().toLowerCase();
    return historyList.filter((item) => {
      const nom = (item.nom || '').toLowerCase();
      const prenom = (item.prenom || '').toLowerCase();
      const mat = (item.matricule || '').toLowerCase();
      const classe = (item.nom_classe || item.classe || '').toLowerCase();
      const motif = (item.motif_retrait || item.motif || '').toLowerCase();
      const ecole = (item.nom_ecole || item.ecoleNom || '').toLowerCase();
      const obs = (item.observations || '').toLowerCase();
      const nomComplet = `${nom} ${prenom}`;
      return (
        nom.includes(q) ||
        prenom.includes(q) ||
        mat.includes(q) ||
        classe.includes(q) ||
        motif.includes(q) ||
        ecole.includes(q) ||
        obs.includes(q) ||
        nomComplet.includes(q)
      );
    });
  }, [historyList, historySearchQuery]);

  // Réinitialiser la pagination lors des changements de filtres
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSchoolId, selectedClassId, searchQuery]);

  useEffect(() => {
    setHistoryCurrentPage(1);
  }, [historySearchQuery]);

  // Données de pagination pour les élèves actifs
  const totalStudents = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalStudents / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedStudents = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, safeCurrentPage, pageSize]);

  // Données de pagination pour l'historique
  const totalHistory = filteredHistoryList.length;
  const historyTotalPages = Math.max(1, Math.ceil(totalHistory / historyPageSize));
  const safeHistoryCurrentPage = Math.min(historyCurrentPage, historyTotalPages);
  const paginatedHistoryList = useMemo(() => {
    const start = (safeHistoryCurrentPage - 1) * historyPageSize;
    return filteredHistoryList.slice(start, start + historyPageSize);
  }, [filteredHistoryList, safeHistoryCurrentPage, historyPageSize]);

  // Données des élèves actuellement sélectionnés pour le modal de retrait groupé
  const selectedStudentsData = useMemo(() => {
    const idSet = new Set(selectedStudentIds);
    return students.filter((s) => idSet.has(Number(s.id)));
  }, [students, selectedStudentIds]);

  // Ouvrir modal de retrait groupé
  const handleOpenBulkModal = () => {
    if (selectedStudentIds.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Sélection requise',
        description: "Veuillez cocher au moins un élève dans le tableau ci-dessous avant d'ouvrir le retrait groupé.",
      });
      return;
    }
    setBulkMotif('Transfert groupé ou fin de cycle');
    setBulkEtablissementAccueil('');
    setBulkDateRadiation(new Date().toISOString().split('T')[0]);
    setBulkObservations('');
    setBulkConfirmSafetyCheck(false);
    setBulkModalOpen(true);
  };

  // Ouvrir modal de retrait individuel
  const handleOpenWithdrawModal = (student: Student) => {
    setTargetStudent(student);
    setMotif('Transfert vers un autre établissement');
    setEtablissementAccueil('');
    setDateRadiation(new Date().toISOString().split('T')[0]);
    setObservations('');
    setConfirmSafetyCheck(false);
    setWithdrawModalOpen(true);
  };

  // Confirmer le retrait individuel
  const handleConfirmWithdraw = async () => {
    if (!targetStudent) return;
    if (!confirmSafetyCheck) {
      toast({
        variant: 'destructive',
        title: 'Confirmation requise',
        description: 'Veuillez cocher la case confirmant la suppression définitive.',
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiClient.withdrawStudent(targetStudent.id, {
        motif,
        date_retrait: dateRadiation,
        commentaire: observations,
        etablissement_accueil: etablissementAccueil || undefined,
      });

      // Trouver l'école et la classe pour le document
      const schoolObj = schools.find(
        (sc) => String(sc.id) === String(targetStudent.schoolId || (targetStudent as any).ecole_id)
      );
      const classObj = classes.find(
        (cl) => String(cl.id) === String(targetStudent.classId || (targetStudent as any).classe_id)
      );

      const nomUpper = (targetStudent.lastName || targetStudent.nom || '').trim().toUpperCase();
      const prenomVal = (targetStudent.firstName || targetStudent.prenom || '').trim();

      // Ajout immédiat à la table historique locale
      const historyEntry = {
        id: (res as any).historique_id || targetStudent.id,
        eleve_id: targetStudent.id,
        matricule: targetStudent.matricule,
        nom: nomUpper,
        prenom: prenomVal,
        nom_complet: `${nomUpper} ${prenomVal}`,
        nom_classe: classObj?.name || targetStudent.className || 'Non assignée',
        nom_ecole: schoolObj?.name || 'Établissement',
        motif_retrait: motif,
        date_retrait: dateRadiation,
        etablissement_accueil: etablissementAccueil,
        observations,
        statut: 'retire',
      };
      setHistoryList((prev) => [historyEntry, ...prev]);

      toast({
        title: "Élève retiré et conservé dans l'historique",
        description: res.message || `L'élève ${nomUpper} ${prenomVal} a été retiré des effectifs actifs et archivé dans la table historique. Le certificat peut être imprimé à tout moment depuis l'onglet Historique.`,
      });

      setWithdrawModalOpen(false);
      setTargetStudent(null);
      await loadData();
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Erreur lors du retrait',
        description: err.response?.data?.detail || "Impossible d'effectuer le retrait de l'élève.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Gestion de la sélection par lot
  const isAllPageSelected =
    paginatedStudents.length > 0 &&
    paginatedStudents.every((s) => selectedStudentIds.includes(Number(s.id)));

  const handleToggleSelectPage = (checked: boolean) => {
    const pageIds = paginatedStudents.map((s) => Number(s.id));
    if (checked) {
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    } else {
      setSelectedStudentIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    }
  };

  const handleSelectAllFiltered = () => {
    setSelectedStudentIds(filteredStudents.map((s) => Number(s.id)));
  };

  const handleDeselectAll = () => {
    setSelectedStudentIds([]);
  };

  const handleToggleStudent = (studentId: number, checked: boolean) => {
    if (checked) {
      setSelectedStudentIds((prev) => [...prev, studentId]);
    } else {
      setSelectedStudentIds((prev) => prev.filter((id) => id !== studentId));
    }
  };

  // Confirmer le retrait par lot
  const handleConfirmBulkWithdraw = async () => {
    if (selectedStudentIds.length === 0) return;
    if (!bulkConfirmSafetyCheck) {
      toast({
        variant: 'destructive',
        title: 'Confirmation requise',
        description: 'Veuillez cocher la case de confirmation pour continuer.',
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiClient.withdrawStudentsBulk({
        student_ids: selectedStudentIds,
        motif: bulkMotif,
        date_retrait: bulkDateRadiation,
        etablissement_accueil: bulkEtablissementAccueil || undefined,
        commentaire: bulkObservations,
      });

      toast({
        title: "Retrait par lot effectué avec succès",
        description: res.message || `${res.removed_count} élève(s) retiré(s) des effectifs actifs et archivé(s) dans la table historique.`,
      });

      setSelectedStudentIds([]);
      setBulkModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Erreur de retrait par lot',
        description: err.response?.data?.detail || "Échec de l'opération groupée.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Restaurer un élève retiré
  const handleRestoreStudent = async (historyId: number | string, studentName: string) => {
    try {
      setSubmitting(true);
      const res = await apiClient.restoreWithdrawnStudent(historyId);
      toast({
        title: "Élève réintégré avec succès",
        description: res.message || `${studentName} a été restauré(e) dans les effectifs actifs.`,
      });
      await loadData();
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Erreur lors de la restauration',
        description: err.response?.data?.detail || "Impossible de restaurer l'élève.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Résout les données complètes du Livret Scolaire et Certificat de Radiation
  const resolveLivretData = async (item: any) => {
    let dossierData: any = null;
    const targetEleveId = item.eleve_id || item.id;
    if (targetEleveId) {
      try {
        dossierData = await apiClient.getDossierEleve(targetEleveId);
      } catch (e) {
        console.warn('Dossier endpoint warning:', e);
      }
    }

    let parsedExtra: any = {};
    if (item.donnees_eleve && typeof item.donnees_eleve === 'string') {
      try {
        parsedExtra = JSON.parse(item.donnees_eleve);
      } catch (e) {}
    }

    const nomUpper = (item.nom || dossierData?.nom || parsedExtra.nom || '').trim().toUpperCase();
    const prenomVal = (item.prenom || dossierData?.prenom || parsedExtra.prenom || '').trim();

    return {
      eleveId: targetEleveId,
      matricule: item.matricule || dossierData?.matricule || parsedExtra.matricule,
      nom: nomUpper,
      prenom: prenomVal,
      dateNaissance: item.date_naissance || item.dateNaissance || dossierData?.date_naissance || parsedExtra.date_naissance,
      lieuNaissance: item.lieu_naissance || dossierData?.lieu_naissance || parsedExtra.lieu_naissance || parsedExtra.AU_LIEU_NAISSANCE,
      genre: item.genre || dossierData?.genre || parsedExtra.genre || parsedExtra.AU_GENRE || 'M',
      classe: item.nom_classe || item.classe || dossierData?.classe || parsedExtra.classe_nom || 'Non assignée',
      cycle: item.cycle || dossierData?.cycle || parsedExtra.cycle,
      niveau: dossierData?.niveau || parsedExtra.niveau,
      ecoleNom: item.nom_ecole || item.ecoleNom || dossierData?.ecole_nom || parsedExtra.ecole_nom,
      ecoleCode: item.ET_CODEETABLISSEMENT || dossierData?.ecole_code || parsedExtra.ecole_code,
      ecoleId: item.ecole_id || dossierData?.ecole_id || parsedExtra.ecole_id,
      dateRadiation: item.date_retrait || item.dateRadiation || new Date().toISOString().split('T')[0],
      motifRadiation: item.motif_retrait || item.motif || 'Transfert / Radiation',
      etablissementAccueil: item.etablissement_accueil || item.etablissementAccueil || parsedExtra.etablissement_accueil || undefined,
      observations: item.observations || parsedExtra.observations || undefined,
      tuteurNom: item.tuteur_nom || item.tuteurNom || dossierData?.nom_tuteur || parsedExtra.AU_TUTEURLEGAL || parsedExtra.nom_parent,
      tuteurContact: item.tuteur_contact || item.tuteurContact || dossierData?.telephone_tuteur || parsedExtra.AU_CONTACTS || parsedExtra.contact_parent,
      tuteurAdresse: dossierData?.adresse || parsedExtra.AU_ADRESSE || parsedExtra.adresse,

      // Livret scolaire : moyennes, notes, sanctions et assiduité
      moyennes: dossierData?.moyennes || [],
      moyennesMatieres: dossierData?.moyennes_matieres || [],
      dernieresNotes: dossierData?.dernieres_notes || [],
      moyenneAnnuelle: dossierData?.moyenne_annuelle,
      rangAnnuel: dossierData?.rang_annuel,
      effectifClasse: dossierData?.effectif_classe,
      absencesTotal: dossierData?.absences_total_justifiees != null ? (dossierData.absences_total_justifiees + dossierData.absences_total_non_justifiees) : undefined,
      absencesJustifiees: dossierData?.absences_total_justifiees,
      absencesNonJustifiees: dossierData?.absences_total_non_justifiees,
      retardsTotal: dossierData?.retards_total,
      sanctionsDisciplinaires: dossierData?.sanctions_disciplinaires || [],
    };
  };

  // Imprimer le Livret Scolaire et Certificat Officiel de Radiation
  const handleReprintCertificate = async (item: any) => {
    try {
      setLoadingCertificateId(item.id);
      const livretData = await resolveLivretData(item);
      printCertificatRadiation(livretData);
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: "Erreur lors de l'impression",
        description: "Impossible de préparer le livret scolaire de radiation.",
      });
    } finally {
      setLoadingCertificateId(null);
    }
  };

  // Télécharger directement le Livret Scolaire en PDF
  const handleDownloadCertificatePDF = async (item: any) => {
    try {
      setDownloadingCertificateId(item.id);
      const livretData = await resolveLivretData(item);
      await downloadCertificatRadiationPDF(livretData);
      toast({
        title: "Livret Scolaire PDF téléchargé",
        description: `Le Livret de radiation de ${livretData.nom} ${livretData.prenom} a été enregistré.`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: "Erreur lors du téléchargement PDF",
        description: "Impossible de générer le fichier PDF du livret.",
      });
    } finally {
      setDownloadingCertificateId(null);
    }
  };

  // Exporter le Registre Officiel des élèves retirés en PDF
  const handleExportPDF = async () => {
    if (filteredHistoryList.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Aucun élève à exporter',
        description: 'La liste des élèves retirés est vide ou aucun élève ne correspond aux critères.',
      });
      return;
    }
    try {
      setExportingPdf(true);
      await downloadWithdrawnStudentsPDF(filteredHistoryList);
      toast({
        title: 'Document PDF généré avec succès',
        description: `Le Registre Officiel des Radiations (${filteredHistoryList.length} élève(s)) a été téléchargé.`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: "Erreur lors de la génération PDF",
        description: "Impossible d'exporter le registre en PDF.",
      });
    } finally {
      setExportingPdf(false);
    }
  };

  // Imprimer le Registre Officiel des élèves retirés
  const handlePrintRegister = () => {
    if (filteredHistoryList.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Aucun élève à imprimer',
        description: 'La liste des élèves retirés est vide.',
      });
      return;
    }
    printWithdrawnStudentsRegister(filteredHistoryList);
  };

  return (
    <Layout>
      <div className="space-y-6 pb-12">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-950/60 flex items-center justify-center text-red-600 dark:text-red-400">
                <UserMinus className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Module de Retrait d'Élèves
                </h1>
                <p className="text-xs text-muted-foreground">
                  Gestion des retraits scolaires, archivage dans la table historique et délivrance des certificats officiels
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {historyList.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30"
                onClick={handleExportPDF}
                disabled={exportingPdf}
                title="Télécharger le registre officiel des élèves retirés en PDF"
              >
                {exportingPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileDown className="h-3.5 w-3.5" />
                )}
                Registre PDF ({historyList.length})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => navigate(ROUTE_PATHS.STUDENTS)}
            >
              <Users className="h-4 w-4 text-primary" />
              Liste des élèves
            </Button>
            <Button
              variant={selectedStudentIds.length > 0 ? 'destructive' : 'outline'}
              size="sm"
              className={`gap-1.5 text-xs font-semibold shadow-xs ${
                selectedStudentIds.length === 0
                  ? 'text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30'
                  : ''
              }`}
              onClick={handleOpenBulkModal}
              title="Effectuer un retrait groupé des élèves sélectionnés"
            >
              <UserMinus className="h-4 w-4" />
              Retrait Groupé
              {selectedStudentIds.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-white text-red-700 rounded-full text-[11px] font-bold">
                  {selectedStudentIds.length}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Métriques / KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-primary shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Élèves enregistrés</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{students.length}</p>
              </div>
              <Users className="h-8 w-8 text-primary/40" />
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-indigo-500 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Élèves filtrés</p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {filteredStudents.length}
                </p>
              </div>
              <GraduationCap className="h-8 w-8 text-indigo-500/40" />
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Élèves dans l'historique</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {historyList.length}
                </p>
              </div>
              <UserX className="h-8 w-8 text-red-500/40" />
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Table Historique</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    Archivage actif (sans suppression)
                  </span>
                </div>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-500/40" />
            </CardContent>
          </Card>
        </div>

        {/* Barre de filtres */}
        <Card className="shadow-xs">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Filtre Établissement */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <SchoolIcon className="h-3.5 w-3.5 text-primary" />
                  Établissement
                </Label>
                <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Tous les établissements" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les établissements</SelectItem>
                    {sortedSchools.map((school) => (
                      <SelectItem key={school.id} value={String(school.id)}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtre Classe */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-primary" />
                  Classe (ordre alphabétique)
                </Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Toutes les classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les classes</SelectItem>
                    {sortedClasses.map((cls) => (
                      <SelectItem key={cls.id} value={String(cls.id)}>
                        {cls.name || cls.CE_LIBELLE}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Recherche textuelle */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5 text-primary" />
                  Recherche élève
                </Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Nom, Prénom, Matricule..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 pl-8 text-xs"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Onglets : Retrait direct & Historique */}
        <Tabs defaultValue="list" className="w-full space-y-4">
          <TabsList className="bg-slate-100 dark:bg-slate-800 p-1">
            <TabsTrigger value="list" className="text-xs gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Élèves actifs ({filteredStudents.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs gap-1.5">
              <History className="h-3.5 w-3.5" />
              Table Historique ({historyList.length})
            </TabsTrigger>
          </TabsList>

          {/* Onglet 1 : Tableau des élèves */}
          <TabsContent value="list" className="space-y-4">
            <Card className="shadow-xs">
              <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Élèves éligibles au retrait ({filteredStudents.length})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Les élèves sont triés par ordre alphabétique (Nom puis Prénom).
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={selectedStudentIds.length > 0 ? 'destructive' : 'outline'}
                    size="sm"
                    className={`h-8 text-xs font-semibold gap-1.5 ${
                      selectedStudentIds.length === 0
                        ? 'text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700'
                        : 'shadow-xs'
                    }`}
                    onClick={handleOpenBulkModal}
                    title="Effectuer un retrait groupé pour les élèves sélectionnés"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                    Retrait Groupé
                    {selectedStudentIds.length > 0 && (
                      <Badge variant="secondary" className="ml-1 bg-white text-red-700 text-[10px] font-bold px-1.5 py-0">
                        {selectedStudentIds.length}
                      </Badge>
                    )}
                  </Button>
                </div>
              </CardHeader>

              {/* Barre d'actions et de sélection rapide pour le retrait groupé */}
              {selectedStudentIds.length > 0 && (
                <div className="p-3 bg-red-50/80 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900/60 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CheckCircle2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="text-xs font-semibold text-red-900 dark:text-red-200">
                      {selectedStudentIds.length} élève{selectedStudentIds.length > 1 ? 's' : ''} sélectionné{selectedStudentIds.length > 1 ? 's' : ''} sur {filteredStudents.length}
                    </span>
                    {selectedStudentIds.length < filteredStudents.length && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-red-700 hover:text-red-800 hover:bg-red-100 dark:hover:bg-red-900/50 underline decoration-dotted"
                        onClick={handleSelectAllFiltered}
                      >
                        Sélectionner tous les {filteredStudents.length} élèves filtrés
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800"
                      onClick={handleDeselectAll}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Désélectionner tout
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 text-xs font-semibold shadow-xs gap-1.5"
                      onClick={handleOpenBulkModal}
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      Procéder au Retrait Groupé ({selectedStudentIds.length})
                    </Button>
                  </div>
                </div>
              )}

              <CardContent className="p-0">
                {loading ? (
                  <AppLogoLoader
                    size="md"
                    title="HÎNNEH ÉDUCATION"
                    message="Chargement de la liste des élèves..."
                    submessage="Synchronisation des effectifs et classes en cours"
                  />
                ) : filteredStudents.length === 0 ? (
                  <div className="p-12 text-center text-sm text-muted-foreground">
                    Aucun élève trouvé selon les filtres sélectionnés.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                        <TableRow>
                          <TableHead className="w-10">
                            <Checkbox
                              checked={isAllPageSelected}
                              onCheckedChange={handleToggleSelectPage}
                              title="Sélectionner / désélectionner tous les élèves de la page courante"
                            />
                          </TableHead>
                          <TableHead className="w-12 text-xs font-bold">N°</TableHead>
                          <TableHead className="text-xs font-bold">Matricule</TableHead>
                          <TableHead className="text-xs font-bold">Nom</TableHead>
                          <TableHead className="text-xs font-bold">Prénoms</TableHead>
                          <TableHead className="text-xs font-bold">Genre</TableHead>
                          <TableHead className="text-xs font-bold">Classe</TableHead>
                          <TableHead className="text-xs font-bold">Établissement</TableHead>
                          <TableHead className="text-xs font-bold text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedStudents.map((student, idx) => {
                          const schoolObj = schools.find(
                            (s) => String(s.id) === String(student.schoolId || (student as any).ecole_id)
                          );
                          const classObj = classes.find(
                            (c) => String(c.id) === String(student.classId || (student as any).classe_id)
                          );
                          const nomUpper = (student.lastName || student.nom || '').toUpperCase();
                          const prenomVal = student.firstName || student.prenom || '';
                          const isSelected = selectedStudentIds.includes(Number(student.id));
                          const rowNumber = (safeCurrentPage - 1) * pageSize + idx + 1;

                          return (
                            <TableRow
                              key={student.id}
                              className={`hover:bg-slate-50/70 dark:hover:bg-slate-900/40 text-xs transition-colors ${
                                isSelected ? 'bg-red-50/40 dark:bg-red-950/20' : ''
                              }`}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) =>
                                    handleToggleStudent(Number(student.id), Boolean(checked))
                                  }
                                />
                              </TableCell>
                              <TableCell className="font-medium text-muted-foreground">
                                {rowNumber}
                              </TableCell>
                              <TableCell className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                                {student.matricule || '—'}
                              </TableCell>
                              <TableCell className="font-bold text-slate-900 dark:text-white uppercase">
                                {nomUpper}
                              </TableCell>
                              <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                                {prenomVal}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {student.gender || student.genre || 'M'}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-semibold text-indigo-700 dark:text-indigo-400">
                                {classObj?.name || student.className || '—'}
                              </TableCell>
                              <TableCell className="text-muted-foreground truncate max-w-[140px]">
                                {schoolObj?.name || '—'}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-7 text-xs px-2.5 gap-1.5 font-medium shadow-2xs"
                                  onClick={() => handleOpenWithdrawModal(student)}
                                >
                                  <UserMinus className="h-3.5 w-3.5" />
                                  Retirer
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Contrôles de pagination pour les élèves actifs */}
                {filteredStudents.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 border-t bg-slate-50/50 dark:bg-slate-900/20 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Afficher :</span>
                        <Select
                          value={String(pageSize)}
                          onValueChange={(val) => {
                            setPageSize(Number(val));
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="h-8 w-20 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-muted-foreground">par page</span>
                      </div>
                      <span className="text-muted-foreground hidden sm:inline">|</span>
                      <span className="text-muted-foreground">
                        Affichage de <span className="font-semibold text-slate-800 dark:text-slate-200">{(safeCurrentPage - 1) * pageSize + 1}</span> à{' '}
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{Math.min(safeCurrentPage * pageSize, filteredStudents.length)}</span> sur{' '}
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredStudents.length}</span> élève(s)
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(1)}
                        disabled={safeCurrentPage <= 1}
                        title="Première page"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={safeCurrentPage <= 1}
                        title="Page précédente"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <div className="flex items-center gap-1 px-2">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          Page {safeCurrentPage} sur {totalPages}
                        </span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safeCurrentPage >= totalPages}
                        title="Page suivante"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={safeCurrentPage >= totalPages}
                        title="Dernière page"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet 2 : Table Historique des retraits (persistant en base de données) */}
          <TabsContent value="history" className="space-y-4">
            <Card className="shadow-xs">
              <CardHeader className="pb-3 border-b flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <History className="h-4 w-4 text-red-600" />
                    Table Historique des Élèves ({historyList.length})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Les élèves retirés sont conservés dans cette table historique sans suppression de leurs données académiques et financières.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-48">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Filtrer l'historique..."
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 text-xs gap-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold shadow-xs"
                    onClick={handleExportPDF}
                    disabled={exportingPdf || filteredHistoryList.length === 0}
                    title="Télécharger le document PDF officiel du registre des élèves retirés"
                  >
                    {exportingPdf ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileDown className="h-3.5 w-3.5" />
                    )}
                    Exporter PDF ({filteredHistoryList.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={handlePrintRegister}
                    disabled={filteredHistoryList.length === 0}
                    title="Imprimer ou prévisualiser le registre des élèves retirés"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Imprimer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={loadData}
                    disabled={loading}
                    title="Actualiser les données"
                  >
                    <RotateCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Actualiser
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <AppLogoLoader
                    size="md"
                    title="TABLE HISTORIQUE"
                    message="Chargement des archives scolaires..."
                    submessage="Récupération des dossiers d'élèves retirés"
                  />
                ) : filteredHistoryList.length === 0 ? (
                  <div className="p-12 text-center text-sm text-muted-foreground">
                    {historySearchQuery
                      ? "Aucun élève retiré ne correspond à votre recherche."
                      : "Aucun élève dans l'historique des retraits."}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                        <TableRow>
                          <TableHead className="w-12 text-xs font-bold">N°</TableHead>
                          <TableHead className="text-xs font-bold">Matricule</TableHead>
                          <TableHead className="text-xs font-bold">Nom</TableHead>
                          <TableHead className="text-xs font-bold">Prénoms</TableHead>
                          <TableHead className="text-xs font-bold">Classe d'origine</TableHead>
                          <TableHead className="text-xs font-bold">Établissement</TableHead>
                          <TableHead className="text-xs font-bold">Motif du retrait</TableHead>
                          <TableHead className="text-xs font-bold">Date effective</TableHead>
                          <TableHead className="text-xs font-bold">Statut</TableHead>
                          <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedHistoryList.map((item, idx) => {
                          const nomUpper = (item.nom || '').toUpperCase();
                          const prenomVal = item.prenom || '';
                          const isRestored = item.statut === 'restaure';
                          const historyRowNumber = (safeHistoryCurrentPage - 1) * historyPageSize + idx + 1;

                          return (
                            <TableRow key={item.id || idx} className="text-xs hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                              <TableCell className="font-medium text-muted-foreground">{historyRowNumber}</TableCell>
                              <TableCell className="font-mono font-semibold text-primary">{item.matricule}</TableCell>
                              <TableCell className="font-bold uppercase text-slate-900 dark:text-white">
                                {nomUpper}
                              </TableCell>
                              <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                                {prenomVal}
                              </TableCell>
                              <TableCell className="font-semibold text-indigo-700 dark:text-indigo-400">
                                {item.nom_classe || item.classe || '—'}
                              </TableCell>
                              <TableCell className="text-muted-foreground truncate max-w-[130px]">
                                {item.nom_ecole || item.ecoleNom || '—'}
                              </TableCell>
                              <TableCell className="text-red-600 dark:text-red-400 font-medium">
                                {item.motif_retrait || item.motif}
                              </TableCell>
                              <TableCell className="font-mono text-muted-foreground">
                                {item.date_retrait || item.dateRadiation || '—'}
                              </TableCell>
                              <TableCell>
                                {isRestored ? (
                                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                                    Restauré
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200">
                                    Retiré
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs px-2 gap-1 font-semibold text-primary hover:bg-primary/5 border-primary/30"
                                    onClick={() => handleReprintCertificate(item)}
                                    disabled={loadingCertificateId === item.id || downloadingCertificateId === item.id}
                                    title="Imprimer le livret scolaire officiel et certificat de radiation avec toutes les moyennes et sanctions"
                                  >
                                    {loadingCertificateId === item.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <FileText className="h-3 w-3" />
                                    )}
                                    Livret Scolaire
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-1.5 text-xs text-muted-foreground hover:text-red-600 gap-1"
                                    onClick={() => handleDownloadCertificatePDF(item)}
                                    disabled={downloadingCertificateId === item.id || loadingCertificateId === item.id}
                                    title="Télécharger le Livret Scolaire de Radiation en fichier PDF"
                                  >
                                    {downloadingCertificateId === item.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin text-red-600" />
                                    ) : (
                                      <Download className="h-3.5 w-3.5" />
                                    )}
                                    PDF
                                  </Button>
                                  {!isRestored && (
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      className="h-7 text-xs px-2 gap-1 text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40"
                                      onClick={() => handleRestoreStudent(item.id, `${nomUpper} ${prenomVal}`)}
                                      title="Réintégrer cet élève dans les effectifs scolaires actifs"
                                    >
                                      <RotateCcw className="h-3 w-3" />
                                      Restaurer
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Contrôles de pagination pour la table historique */}
                {filteredHistoryList.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 border-t bg-slate-50/50 dark:bg-slate-900/20 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Afficher :</span>
                        <Select
                          value={String(historyPageSize)}
                          onValueChange={(val) => {
                            setHistoryPageSize(Number(val));
                            setHistoryCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="h-8 w-20 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-muted-foreground">par page</span>
                      </div>
                      <span className="text-muted-foreground hidden sm:inline">|</span>
                      <span className="text-muted-foreground">
                        Affichage de <span className="font-semibold text-slate-800 dark:text-slate-200">{(safeHistoryCurrentPage - 1) * historyPageSize + 1}</span> à{' '}
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{Math.min(safeHistoryCurrentPage * historyPageSize, filteredHistoryList.length)}</span> sur{' '}
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredHistoryList.length}</span> élève(s) archivé(s)
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setHistoryCurrentPage(1)}
                        disabled={safeHistoryCurrentPage <= 1}
                        title="Première page"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setHistoryCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={safeHistoryCurrentPage <= 1}
                        title="Page précédente"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <div className="flex items-center gap-1 px-2">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          Page {safeHistoryCurrentPage} sur {historyTotalPages}
                        </span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setHistoryCurrentPage((p) => Math.min(historyTotalPages, p + 1))}
                        disabled={safeHistoryCurrentPage >= historyTotalPages}
                        title="Page suivante"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setHistoryCurrentPage(historyTotalPages)}
                        disabled={safeHistoryCurrentPage >= historyTotalPages}
                        title="Dernière page"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* MODAL DE CONFIRMATION DE RETRAIT INDIVIDUEL */}
        <Dialog open={withdrawModalOpen} onOpenChange={setWithdrawModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <UserMinus className="h-5 w-5" />
                <DialogTitle className="text-lg">Retrait d'Élève & Archivage</DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Cette action va retirer l'élève des effectifs scolaires actifs et conserver son dossier complet dans la table historique.
              </DialogDescription>
            </DialogHeader>

            {targetStudent && (
              <div className="space-y-4 text-xs py-2">
                {/* Carte récapitulative élève */}
                <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900/60 flex items-center gap-3">
                  <Avatar className="h-12 w-12 border">
                    <AvatarImage src={targetStudent.photo || (targetStudent as any).photoUrl} />
                    <AvatarFallback className="font-bold text-sm bg-primary/10 text-primary">
                      {getPersonInitials(targetStudent)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {formatStudentName(targetStudent)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Matricule : <span className="font-mono font-bold text-primary">{targetStudent.matricule}</span> • Classe :{' '}
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {targetStudent.className || '—'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Saisie motif de radiation */}
                <div className="space-y-1.5">
                  <Label htmlFor="motif" className="font-semibold text-xs">
                    Motif du retrait *
                  </Label>
                  <Select value={motif} onValueChange={setMotif}>
                    <SelectTrigger id="motif" className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Transfert vers un autre établissement">
                        Transfert vers un autre établissement
                      </SelectItem>
                      <SelectItem value="Déménagement de la famille">
                        Déménagement de la famille
                      </SelectItem>
                      <SelectItem value="Abandon de scolarité">
                        Abandon de scolarité
                      </SelectItem>
                      <SelectItem value="Exclusion disciplinaire définitive">
                        Exclusion disciplinaire définitive
                      </SelectItem>
                      <SelectItem value="Raisons de santé / médicales">
                        Raisons de santé / médicales
                      </SelectItem>
                      <SelectItem value="Demande expresse des parents / tuteur">
                        Demande expresse des parents / tuteur
                      </SelectItem>
                      <SelectItem value="Autre motif administratif">
                        Autre motif administratif
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Établissement d'accueil (optionnel) */}
                <div className="space-y-1.5">
                  <Label htmlFor="accueil" className="font-semibold text-xs">
                    Établissement d'accueil pressenti (optionnel)
                  </Label>
                  <Input
                    id="accueil"
                    placeholder="Ex: Lycée Moderne de Cocody, Collège Moderne..."
                    value={etablissementAccueil}
                    onChange={(e) => setEtablissementAccueil(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                {/* Date de radiation */}
                <div className="space-y-1.5">
                  <Label htmlFor="dateRad" className="font-semibold text-xs">
                    Date effective de radiation *
                  </Label>
                  <Input
                    id="dateRad"
                    type="date"
                    value={dateRadiation}
                    onChange={(e) => setDateRadiation(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                {/* Observations */}
                <div className="space-y-1.5">
                  <Label htmlFor="obs" className="font-semibold text-xs">
                    Observations / Référence de l'acte (optionnel)
                  </Label>
                  <Textarea
                    id="obs"
                    placeholder="Ex: Demande parentale écrite du 20/09, avis de radiation..."
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    rows={2}
                    className="text-xs resize-none"
                  />
                </div>


                {/* Confirmation de sécurité obligatoire */}
                <div className="p-2.5 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-start gap-2">
                  <Checkbox
                    id="confirmCheck"
                    checked={confirmSafetyCheck}
                    onCheckedChange={(c) => setConfirmSafetyCheck(Boolean(c))}
                    className="mt-0.5"
                  />
                  <Label htmlFor="confirmCheck" className="text-xs text-red-900 dark:text-red-300 font-semibold cursor-pointer">
                    Je confirme vouloir retirer cet élève des effectifs actifs et archiver son dossier dans la table historique.
                  </Label>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setWithdrawModalOpen(false)}
                disabled={submitting}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="text-xs font-semibold gap-1.5"
                onClick={handleConfirmWithdraw}
                disabled={submitting || !confirmSafetyCheck}
              >
                <UserMinus className="h-3.5 w-3.5" />
                {submitting ? 'Archivage en cours...' : "Confirmer et archiver dans l'historique"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL DE RETRAIT PAR LOT (BULK) */}
        <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <ShieldAlert className="h-5 w-5" />
                <DialogTitle className="text-base font-bold">
                  Retrait groupé de {selectedStudentIds.length} élève{selectedStudentIds.length > 1 ? 's' : ''}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Cette opération retirera les {selectedStudentIds.length} élèves sélectionnés des effectifs scolaires actifs et conservera intégralement leurs dossiers académiques et financiers dans la table historique.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Prévisualisation des élèves sélectionnés */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                    Élèves concernés ({selectedStudentsData.length})
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Cliquez sur la croix pour exclure un élève
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto border rounded-lg bg-slate-50 dark:bg-slate-900/40 p-2 divide-y divide-slate-200 dark:divide-slate-800">
                  {selectedStudentsData.map((s, idx) => (
                    <div
                      key={s.id}
                      className="py-1.5 flex items-center justify-between gap-2 text-xs first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-muted-foreground font-mono text-[11px] w-5">
                          {idx + 1}.
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {formatStudentName(s)}
                        </span>
                        <span className="font-mono text-[11px] text-primary">
                          ({s.matricule || 'Sans mat.'})
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1">
                          {s.className || 'Classe —'}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600 rounded-full"
                        onClick={() =>
                          setSelectedStudentIds((prev) => prev.filter((id) => id !== Number(s.id)))
                        }
                        title="Enlever du lot"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Saisie motif de radiation groupé */}
              <div className="space-y-1.5">
                <Label htmlFor="bulkMotif" className="font-semibold text-xs">
                  Motif global du retrait *
                </Label>
                <Select value={bulkMotif} onValueChange={setBulkMotif}>
                  <SelectTrigger id="bulkMotif" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Transfert groupé ou fin de cycle">
                      Transfert groupé ou fin de cycle
                    </SelectItem>
                    <SelectItem value="Radiation administrative collective">
                      Radiation administrative collective
                    </SelectItem>
                    <SelectItem value="Déménagement de la famille">
                      Déménagement de la famille
                    </SelectItem>
                    <SelectItem value="Abandon de scolarité">
                      Abandon de scolarité
                    </SelectItem>
                    <SelectItem value="Exclusion disciplinaire définitive">
                      Exclusion disciplinaire définitive
                    </SelectItem>
                    <SelectItem value="Demande expresse des parents / tuteurs">
                      Demande expresse des parents / tuteurs
                    </SelectItem>
                    <SelectItem value="Autre motif administratif">
                      Autre motif administratif
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Établissement d'accueil (optionnel) */}
              <div className="space-y-1.5">
                <Label htmlFor="bulkAccueil" className="font-semibold text-xs">
                  Établissement d'accueil pressenti (optionnel)
                </Label>
                <Input
                  id="bulkAccueil"
                  placeholder="Ex: Lycée Moderne de Cocody, Collège Moderne..."
                  value={bulkEtablissementAccueil}
                  onChange={(e) => setBulkEtablissementAccueil(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Date de radiation */}
              <div className="space-y-1.5">
                <Label htmlFor="bulkDateRad" className="font-semibold text-xs">
                  Date effective de radiation *
                </Label>
                <Input
                  id="bulkDateRad"
                  type="date"
                  value={bulkDateRadiation}
                  onChange={(e) => setBulkDateRadiation(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Commentaires / Références */}
              <div className="space-y-1.5">
                <Label htmlFor="bulkObs" className="font-semibold text-xs">
                  Observations / Références de l'acte (optionnel)
                </Label>
                <Textarea
                  id="bulkObs"
                  placeholder="Ex: Décision collective du conseil de rentrée, avis de transfert..."
                  value={bulkObservations}
                  onChange={(e) => setBulkObservations(e.target.value)}
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>

              {/* Confirmation de sécurité */}
              <div className="p-2.5 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-start gap-2">
                <Checkbox
                  id="bulkConfirmCheck"
                  checked={bulkConfirmSafetyCheck}
                  onCheckedChange={(c) => setBulkConfirmSafetyCheck(Boolean(c))}
                  className="mt-0.5"
                />
                <Label
                  htmlFor="bulkConfirmCheck"
                  className="text-xs text-red-900 dark:text-red-300 font-semibold cursor-pointer"
                >
                  Je confirme le retrait des {selectedStudentIds.length} élève{selectedStudentIds.length > 1 ? 's' : ''} sélectionné{selectedStudentIds.length > 1 ? 's' : ''} des effectifs actifs et leur archivage dans la table historique.
                </Label>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setBulkModalOpen(false)}
                disabled={submitting}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="text-xs font-semibold gap-1.5"
                onClick={handleConfirmBulkWithdraw}
                disabled={submitting || !bulkConfirmSafetyCheck || selectedStudentIds.length === 0}
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserMinus className="h-3.5 w-3.5" />
                )}
                {submitting
                  ? 'Archivage groupé en cours...'
                  : `Confirmer le retrait groupé (${selectedStudentIds.length})`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Écrans de chargement centrés avec le logo officiel lors des opérations asynchrones */}
        {submitting && (
          <AppLogoLoader
            fullScreen
            title="TRAITEMENT EN COURS"
            message="Archivage dans la table historique..."
            submessage="Mise à jour sécurisée des effectifs scolaires"
          />
        )}

        {exportingPdf && (
          <AppLogoLoader
            fullScreen
            title="REGISTRE DES RADIATIONS"
            message="Génération du registre PDF officiel..."
            submessage="Création du document A4 Paysage conforme à la réglementation"
          />
        )}

        {(loadingCertificateId !== null || downloadingCertificateId !== null) && (
          <AppLogoLoader
            fullScreen
            title="LIVRET SCOLAIRE & CERTIFICAT"
            message="Génération du livret scolaire officiel de radiation..."
            submessage="Calcul des moyennes, assiduité, sanctions disciplinaires et visas"
          />
        )}
      </div>
    </Layout>
  );
}
