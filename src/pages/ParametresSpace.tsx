/**
 * Paramètres & Configuration
 * Onglets : Année scolaire | Cycles & Niveaux | Utilisateurs | Apparence
 */
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Check,
  Sun,
  Moon,
  Palette,
  Users,
  BookOpen,
  Calendar,
  Shield,
  Receipt,
  DollarSign,
  GraduationCap,
  Sparkles,
  RotateCcw,
  Languages,
  Laptop,
  Shirt,
  Package,
  ShoppingBag,
  ShoppingBasket,
  Tag,
  Building2,
  MapPin,
  School,
  CalendarClock,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { useTheme } from '@/contexts/ThemeContext';
import { apiClient, type AnneeScolaire } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  OfficialCashTariffs,
  DEFAULT_OFFICIAL_CASH_TARIFFS,
  FraisDiversItem,
  DEFAULT_FRAIS_DIVERS,
  getOfficialCashTariffs,
  saveOfficialCashTariffs,
  getFraisDiversList,
  saveFraisDiversList,
  type ModeleSeptembre,
  getModeleSeptembre,
  saveModeleSeptembre,
} from '@/lib/tarifsConfig';
import {
  GROUPES_MATIERES,
  SERIES,
  type GroupeMatiere,
  type SerieCode,
  type MatiereCoefficient,
  niveauSupporteSerie,
  normaliserNiveauCode,
  getMatieresConfig,
  saveMatieresConfig,
  resetMatieresConfig,
  libelleGroupeMatiere,
} from '@/lib/matieresConfig';

// ─── Types ───────────────────────────────────────────────────────────────────

// Le type AnneeScolaire vient de l'API (@/lib/apiClient) : le référentiel est
// désormais persisté en base, plus construit localement.

interface Niveau {
  id: string;
  nom: string;
  cycle: string;
  ordre: number;
}

interface UtilisateurConfig {
  id: string;
  nom: string;
  email: string;
  role: string;
  actif: boolean;
}

// ─── Données initiales ───────────────────────────────────────────────────────

const INIT_NIVEAUX: Niveau[] = [
  { id: 'n1', nom: 'Petite section', cycle: 'Maternelle', ordre: 1 },
  { id: 'n2', nom: 'Moyenne section', cycle: 'Maternelle', ordre: 2 },
  { id: 'n3', nom: 'Grande section', cycle: 'Maternelle', ordre: 3 },
  { id: 'n4', nom: 'CP', cycle: 'Primaire', ordre: 4 },
  { id: 'n5', nom: 'CE1', cycle: 'Primaire', ordre: 5 },
  { id: 'n6', nom: 'CE2', cycle: 'Primaire', ordre: 6 },
  { id: 'n7', nom: 'CM1', cycle: 'Primaire', ordre: 7 },
  { id: 'n8', nom: 'CM2', cycle: 'Primaire', ordre: 8 },
  { id: 'n9', nom: '6ème', cycle: 'Collège', ordre: 9 },
  { id: 'n10', nom: '5ème', cycle: 'Collège', ordre: 10 },
  { id: 'n11', nom: '4ème', cycle: 'Collège', ordre: 11 },
  { id: 'n12', nom: '3ème', cycle: 'Collège', ordre: 12 },
  { id: 'n13', nom: '2nde', cycle: 'Collège 2nd cycle', ordre: 13 },
  { id: 'n14', nom: '1ère', cycle: 'Collège 2nd cycle', ordre: 14 },
  { id: 'n15', nom: 'Terminale', cycle: 'Collège 2nd cycle', ordre: 15 },
];

const INIT_USERS: UtilisateurConfig[] = [
  { id: 'u1', nom: 'Admin Système', email: 'admin@hinneh.edu', role: 'admin', actif: true },
  { id: 'u2', nom: 'Dir. Général', email: 'dg@hinneh.edu', role: 'direction_fondation', actif: true },
  { id: 'u3', nom: 'Dir. École A', email: 'dir-a@hinneh.edu', role: 'directeur_ecole', actif: true },
  { id: 'u4', nom: 'Comptable', email: 'compta@hinneh.edu', role: 'comptable', actif: true },
  { id: 'u5', nom: 'Enseignant Test', email: 'prof@hinneh.edu', role: 'enseignant', actif: false },
];

const ROLES = ['admin', 'direction_fondation', 'directeur_ecole', 'comptable', 'enseignant', 'educateur', 'accueil'];
const CYCLES = ['Maternelle', 'Primaire', 'Collège', 'Collège 2nd cycle', 'Coranique'];
const COULEURS_THEME = ['#1d4ed8', '#7c3aed', '#059669', '#dc2626', '#d97706', '#0891b2'];

// ─── Composant ───────────────────────────────────────────────────────────────

interface FeeSetting {
  id: string;
  category: 'scolarite' | 'inscription' | 'examen' | 'cantine' | 'transport' | 'autre';
  label: string;
  amount: number;
  description?: string;
  active: boolean;
  cycleOrLevel?: string;
  period?: string;
}

const DEFAULT_FEE_SETTINGS: FeeSetting[] = [
  { id: 'fee-1', category: 'scolarite', label: 'Frais de Scolarité Maternelle / Primaire', amount: 150000, description: 'Scolarité annuelle élèves non-affectés', active: true, cycleOrLevel: 'Primaire' },
  { id: 'fee-2', category: 'scolarite', label: 'Frais de Scolarité Collège (6ème - 3ème)', amount: 200000, description: 'Scolarité annuelle élèves non-affectés', active: true, cycleOrLevel: 'Collège' },
  { id: 'fee-3', category: 'scolarite', label: 'Frais de Scolarité Lycée (2nde - Tle)', amount: 250000, description: 'Scolarité annuelle élèves non-affectés', active: true, cycleOrLevel: 'Lycée' },
  { id: 'fee-4', category: 'inscription', label: 'Droit d\'inscription / Réinscription', amount: 15000, description: 'Frais fixes de dossier et réinscription', active: true },
  { id: 'fee-5', category: 'examen', label: 'Frais Examen BEPC', amount: 2000, description: 'Examen officiel classe de 3ème', active: true },
  { id: 'fee-6', category: 'examen', label: 'Frais Examen BAC', amount: 5000, description: 'Examen officiel classe de Terminale', active: true },
  { id: 'fee-7', category: 'examen', label: 'Frais Examen CEPE Officiel', amount: 500, description: 'Examen officiel CM2', active: true },
  { id: 'fee-8', category: 'examen', label: 'Frais Examen CEPE Arabe', amount: 7000, description: 'Examen confessionnel CM2', active: true },
  { id: 'fee-9', category: 'cantine', label: 'Abonnement Cantine Mensuel', amount: 15000, description: 'Restauration scolaire par mois', active: true, period: 'mensuel' },
  { id: 'fee-10', category: 'transport', label: 'Abonnement Transport / Car Mensuel', amount: 22000, description: 'Transport scolaire par mois (Abidjan)', active: true, period: 'mensuel' },
  { id: 'fee-11', category: 'autre', label: 'Kit Tenue Scolaire Obligatoire', amount: 10000, description: 'Tenue complète réglementaire Hînneh', active: true },
  { id: 'fee-12', category: 'autre', label: 'Carnet de correspondance & Macaron', amount: 2500, description: 'Fournitures administratives individuelles', active: true },
];

export default function ParametresSpace() {
  const { toast } = useToast();

  const [annees, setAnnees] = useState<AnneeScolaire[]>([]);
  const [anneesLoading, setAnneesLoading] = useState(true);
  const [anneeSaving, setAnneeSaving] = useState(false);

  const chargerAnnees = async () => {
    setAnneesLoading(true);
    try {
      setAnnees(await apiClient.getAnneesScolaires());
    } catch (err) {
      console.error('Impossible de charger les années scolaires :', err);
      setAnnees([]);
    } finally {
      setAnneesLoading(false);
    }
  };

  useEffect(() => {
    chargerAnnees();
  }, []);
  const [niveaux, setNiveaux] = useState<Niveau[]>(INIT_NIVEAUX);
  const [users, setUsers] = useState<UtilisateurConfig[]>(INIT_USERS);
  const { theme, setTheme } = useTheme();
  const [couleurPrimaire, setCouleurPrimaire] = useState(COULEURS_THEME[0]);
  const [nomEtablissement, setNomEtablissement] = useState('HÎNNEH ÉDUCATION');
  const [devise, setDevise] = useState('FCFA');

  // ─── Historique des rendez-vous ─────────────────────────────────────────────
  const [rdvHistorique, setRdvHistorique] = useState<any[]>([]);
  const [rdvHistoriqueLoading, setRdvHistoriqueLoading] = useState(false);
  const [rdvFiltreStatut, setRdvFiltreStatut] = useState<string>('tous');
  const [rdvRecherche, setRdvRecherche] = useState('');

  const chargerHistoriqueRdv = async () => {
    setRdvHistoriqueLoading(true);
    try {
      // 'desc' : le plus récent en premier, contrairement à la file d'attente
      // du suivi des inscriptions qui est traitée en FIFO.
      const data = await apiClient.getRendezVousList({ ordre: 'desc', limit: 1000 });
      setRdvHistorique(data);
    } catch (err) {
      console.error("Impossible de charger l'historique des rendez-vous :", err);
      setRdvHistorique([]);
    } finally {
      setRdvHistoriqueLoading(false);
    }
  };

  useEffect(() => {
    chargerHistoriqueRdv();
  }, []);

  const rdvFiltres = useMemo(() => {
    const terme = rdvRecherche.trim().toLowerCase();
    return rdvHistorique.filter((r: any) => {
      if (rdvFiltreStatut !== 'tous' && r.statut !== rdvFiltreStatut) return false;
      if (!terme) return true;
      return [r.numero_ticket, r.nom, r.nom_eleve, r.telephone, r.matricule_national, r.niveau]
        .some((champ: any) => String(champ || '').toLowerCase().includes(terme));
    });
  }, [rdvHistorique, rdvFiltreStatut, rdvRecherche]);

  const rdvStats = useMemo(() => ({
    total: rdvHistorique.length,
    en_attente: rdvHistorique.filter((r: any) => r.statut === 'en_attente').length,
    traite: rdvHistorique.filter((r: any) => r.statut === 'traite').length,
    annule: rdvHistorique.filter((r: any) => r.statut === 'annule').length,
  }), [rdvHistorique]);

  // Pagination de l'historique
  const RDV_PAR_PAGE = 20;
  const [rdvPage, setRdvPage] = useState(1);

  // Revenir en première page dès qu'un filtre change : rester sur une page
  // désormais vide donnerait l'impression qu'il n'y a aucun résultat.
  useEffect(() => {
    setRdvPage(1);
  }, [rdvFiltreStatut, rdvRecherche, rdvHistorique]);

  const rdvTotalPages = Math.max(1, Math.ceil(rdvFiltres.length / RDV_PAR_PAGE));
  // Borne la page courante : supprimer des résultats peut la rendre hors limites.
  const rdvPageCourante = Math.min(rdvPage, rdvTotalPages);
  const rdvAffiches = useMemo(
    () => rdvFiltres.slice((rdvPageCourante - 1) * RDV_PAR_PAGE, rdvPageCourante * RDV_PAR_PAGE),
    [rdvFiltres, rdvPageCourante],
  );

  const formaterDateRdv = (valeur?: string) => {
    if (!valeur) return '—';
    try {
      return new Date(valeur).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });
    } catch {
      return valeur;
    }
  };

  const STATUTS_RDV: Record<string, { libelle: string; classe: string }> = {
    en_attente: { libelle: 'En attente', classe: 'bg-gray-100 text-gray-700 dark:bg-gray-950/60 dark:text-gray-400' },
    traite: { libelle: 'Traité', classe: 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400' },
    annule: { libelle: 'Annulé', classe: 'bg-muted text-muted-foreground' },
  };

  // ─── Gestion Établissement & Ville ──────────────────────────────────────────
  const [villes, setVilles] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [loadingSchools, setLoadingSchools] = useState(false);

  // Normalisation nom de ville
  const normalizeCity = (v?: string) =>
    (v || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  // Chargement initial des villes et écoles
  useEffect(() => {
    const fetchSchoolsAndVilles = async () => {
      setLoadingSchools(true);
      try {
        const [vList, sList] = await Promise.all([
          apiClient.getVilles().catch(() => []),
          apiClient.getAllSchools().catch(() => []),
        ]);
        setVilles(vList || []);
        setSchools(sList || []);

        // Pré-sélectionner l'école de l'utilisateur connecté si disponible
        const userEcole =
          localStorage.getItem('user_ecole_id') ||
          localStorage.getItem('selected_school_id') ||
          localStorage.getItem('code_etablissement') ||
          localStorage.getItem('user_ecole_code');
        const userCity = localStorage.getItem('user_ville');

        if (userCity && userCity !== 'all') {
          setSelectedCity(userCity);
        }
        if (userEcole && userEcole !== 'all') {
          setSelectedSchool(String(userEcole));
        } else if (sList && sList.length > 0) {
          const first = sList[0];
          const firstVal = first.ET_CODEETABLISSEMENT || first.code || String(first.id || first.IDETABLISSEMENT);
          setSelectedSchool(firstVal);
          if (first.city || first.ET_VILLE) {
            setSelectedCity(first.city || first.ET_VILLE);
          }
        }
      } catch (err) {
        console.error('Erreur de chargement des écoles et villes :', err);
      } finally {
        setLoadingSchools(false);
      }
    };
    fetchSchoolsAndVilles();
  }, []);

  // Établissement actif sélectionné
  const currentSchoolObj = useMemo(() => {
    if (selectedSchool === 'all') return null;
    return schools.find(
      (s: any) =>
        String(s.id || s.IDETABLISSEMENT) === String(selectedSchool) ||
        String(s.code || s.ET_CODEETABLISSEMENT || '').toUpperCase() === String(selectedSchool).toUpperCase()
    );
  }, [schools, selectedSchool]);

  const activeSchoolCode = currentSchoolObj?.ET_CODEETABLISSEMENT || currentSchoolObj?.code || (selectedSchool !== 'all' ? selectedSchool : undefined);
  const activeSchoolId = currentSchoolObj?.id || currentSchoolObj?.IDETABLISSEMENT;
  const activeCityName = currentSchoolObj?.city || currentSchoolObj?.ET_VILLE || (selectedCity !== 'all' ? selectedCity : undefined);

  // Liste des villes distinctes
  const availableCityOptions = useMemo(() => {
    const citySet = new Set<string>();
    villes.forEach((v: any) => {
      if (v.libelle) citySet.add(v.libelle.trim());
    });
    schools.forEach((s: any) => {
      const c = s.city || s.ET_VILLE;
      if (c) citySet.add(c.trim());
    });
    return Array.from(citySet).sort();
  }, [villes, schools]);

  // Écoles filtrées par la ville sélectionnée
  const filteredSchoolsList = useMemo(() => {
    if (selectedCity === 'all') return schools;
    return schools.filter((s: any) => normalizeCity(s.city || s.ET_VILLE) === normalizeCity(selectedCity));
  }, [schools, selectedCity]);

  // Tarifs Officiels Espèces
  const [cashTariffs, setCashTariffs] = useState<OfficialCashTariffs>(() => getOfficialCashTariffs());

  // Modèle d'encaissement de la rentrée (septembre) : inscription seule ou inscription
  // suivie d'une première tranche de scolarité. Pilote l'affichage du reçu de caisse.
  const [modeleSeptembre, setModeleSeptembre] = useState<ModeleSeptembre>(() => getModeleSeptembre());

  // Frais Divers (Anglais, Informatique, Soutien, etc.)
  const [fraisDiversList, setFraisDiversList] = useState<FraisDiversItem[]>(() => getFraisDiversList());
  const [openFraisDiversModal, setOpenFraisDiversModal] = useState(false);
  const [editFraisDivers, setEditFraisDivers] = useState<FraisDiversItem | null>(null);
  const [tenueCycleFilter, setTenueCycleFilter] = useState<string>('tous');
  const [tenueGenreFilter, setTenueGenreFilter] = useState<'tous' | 'M' | 'S'>('tous');
  const [formFraisDivers, setFormFraisDivers] = useState({
    libelle: '',
    code: 'tenue_college_m',
    categorie: 'tenue' as FraisDiversItem['categorie'],
    genre: 'M' as FraisDiversItem['genre'],
    cycle: 'Collège' as string,
    niveau: 'tous' as string,
    montant: '',
    description: '',
    periodicite: 'unique' as FraisDiversItem['periodicite'],
  });

  // Recharger automatiquement les tarifs lorsque l'école ou la ville sélectionnée change
  useEffect(() => {
    const loadedTariffs = getOfficialCashTariffs(activeSchoolCode || activeSchoolId, activeCityName);
    setCashTariffs(loadedTariffs);

    const loadedFraisDivers = getFraisDiversList(activeSchoolCode || activeSchoolId, activeCityName);
    setFraisDiversList(loadedFraisDivers);

    setModeleSeptembre(getModeleSeptembre(activeSchoolCode || activeSchoolId, activeCityName));
  }, [selectedSchool, selectedCity, activeSchoolCode, activeSchoolId, activeCityName]);

  // Modèle d'encaissement de septembre pour l'école / ville sélectionnée
  const handleChangeModeleSeptembre = (val: ModeleSeptembre) => {
    setModeleSeptembre(val);

    if (!activeSchoolCode && !activeSchoolId && !activeCityName) {
      toast({
        variant: 'destructive',
        title: 'Impossible de sauvegarder',
        description: "Sélectionnez d'abord une ville ou un établissement avant de modifier le modèle de rentrée.",
      });
      return;
    }

    saveModeleSeptembre(val, activeSchoolCode || activeSchoolId, activeCityName);
    const targetDesc = currentSchoolObj
      ? `${currentSchoolObj.name || currentSchoolObj.ET_DENOMMINATION} (${activeCityName || ''})`
      : activeCityName ? `Ville de ${activeCityName}` : 'Établissement (Code/ID: ' + (activeSchoolCode || activeSchoolId) + ')';
    toast({
      title: '✓ Modèle de rentrée mis à jour !',
      description:
        val === 'inscription_seule'
          ? `Seuls les frais d'inscription seront perçus et imprimés en septembre pour : ${targetDesc}.`
          : `Inscription et 1ère tranche de scolarité seront perçues en septembre pour : ${targetDesc}.`,
    });
  };

  // Gestion des Tarifs Espèces pour l'école / ville sélectionnée
  const handleSaveCashTariffs = () => {
    if (!activeSchoolCode && !activeSchoolId) {
      toast({
        variant: 'destructive',
        title: 'Impossible de sauvegarder',
        description: 'Veuillez sélectionner une école spécifique (pas la configuration globale) avant de modifier les tarifs.',
      });
      return;
    }
    const saved = saveOfficialCashTariffs(cashTariffs, activeSchoolCode || activeSchoolId, activeCityName);
    setCashTariffs(saved);
    const targetDesc = currentSchoolObj
      ? `${currentSchoolObj.name || currentSchoolObj.ET_DENOMMINATION} (${activeCityName || ''})`
      : activeCityName ? `Ville de ${activeCityName}` : 'Établissement (Code/ID: ' + (activeSchoolCode || activeSchoolId) + ')';
    toast({
      title: 'âœ“ Tarifs officiels espèces mis à jour !',
      description: `Montants enregistrés pour : ${targetDesc}.`,
    });
  };

  const handleResetCashTariffs = () => {
    const reset = { ...DEFAULT_OFFICIAL_CASH_TARIFFS };
    const saved = saveOfficialCashTariffs(reset, activeSchoolCode || activeSchoolId, activeCityName);
    setCashTariffs(saved);
    toast({
      title: 'Tarifs réinitialisés',
      description: 'Les tarifs officiels espèces par défaut ont été restaurés pour cet établissement.',
    });
  };

  // Gestion des Frais Divers & Achats & Tenues pour l'école / ville sélectionnée
  const handleSaveFraisDivers = () => {
    if (!formFraisDivers.libelle.trim() || !formFraisDivers.montant) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Le libellé et le montant sont obligatoires.' });
      return;
    }
    const amt = Number(formFraisDivers.montant) || 0;
    if (amt <= 0) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Le montant doit être supérieur à 0.' });
      return;
    }

    if (!activeSchoolCode && !activeSchoolId) {
      toast({
        variant: 'destructive',
        title: 'Impossible de sauvegarder',
        description: 'Veuillez sélectionner une école spécifique avant d\'ajouter/modifier les frais divers.',
      });
      return;
    }

    const schoolLabel = currentSchoolObj?.name || currentSchoolObj?.ET_DENOMMINATION || activeCityName || 'l\'établissement';

    let updated: FraisDiversItem[];
    if (editFraisDivers) {
      updated = fraisDiversList.map(item =>
        item.id === editFraisDivers.id
          ? {
              ...item,
              libelle: formFraisDivers.libelle.trim(),
              code: formFraisDivers.code,
              categorie: formFraisDivers.categorie || 'autre',
              genre: formFraisDivers.genre || 'tous',
              cycle: formFraisDivers.cycle || 'tous',
              niveau: formFraisDivers.niveau || 'tous',
              montant: amt,
              description: formFraisDivers.description.trim(),
              periodicite: formFraisDivers.periodicite,
            }
          : item
      );
      toast({ title: 'âœ“ Article / Tarif modifié !', description: `${formFraisDivers.libelle} mis à jour pour ${schoolLabel}.` });
    } else {
      const newItem: FraisDiversItem = {
        id: `fd-${Date.now()}`,
        code: formFraisDivers.code,
        categorie: formFraisDivers.categorie || 'autre',
        genre: formFraisDivers.genre || 'tous',
        cycle: formFraisDivers.cycle || 'tous',
        niveau: formFraisDivers.niveau || 'tous',
        libelle: formFraisDivers.libelle.trim(),
        montant: amt,
        description: formFraisDivers.description.trim(),
        periodicite: formFraisDivers.periodicite,
        actif: true,
      };
      updated = [...fraisDiversList, newItem];
      toast({ title: 'âœ“ Nouvel article / tarif ajouté !', description: `${formFraisDivers.libelle} enregistré pour ${schoolLabel}.` });
    }

    setFraisDiversList(updated);
    const saved = saveFraisDiversList(updated, activeSchoolCode || activeSchoolId, activeCityName);
    setFraisDiversList(saved);
    setOpenFraisDiversModal(false);
    setEditFraisDivers(null);
    setFormFraisDivers({ libelle: '', code: 'tenue_college_m', categorie: 'tenue', genre: 'M', cycle: 'Collège', niveau: 'tous', montant: '', description: '', periodicite: 'unique' });
  };

  const handleToggleFraisDivers = (id: string) => {
    const updated = fraisDiversList.map(item =>
      item.id === id ? { ...item, actif: !item.actif } : item
    );
    setFraisDiversList(updated);
    const saved = saveFraisDiversList(updated, activeSchoolCode || activeSchoolId, activeCityName);
    setFraisDiversList(saved);
    toast({ title: 'âœ“ Statut mis à jour' });
  };

  const handleDeleteFraisDivers = (id: string) => {
    const updated = fraisDiversList.filter(item => item.id !== id);
    setFraisDiversList(updated);
    const saved = saveFraisDiversList(updated, activeSchoolCode || activeSchoolId, activeCityName);
    setFraisDiversList(saved);
    toast({ title: 'âœ“ Frais divers supprimé pour cet établissement' });
  };

  // Fee settings state & localStorage persistence
  const [fees, setFees] = useState<FeeSetting[]>(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('school_fee_settings');
        if (raw) return JSON.parse(raw);
      } catch (e) {
        console.error('Error reading school fee settings:', e);
      }
    }
    return DEFAULT_FEE_SETTINGS;
  });

  const [openFeeModal, setOpenFeeModal] = useState(false);
  const [editFee, setEditFee] = useState<FeeSetting | null>(null);
  const [formFee, setFormFee] = useState({
    label: '',
    category: 'autre' as FeeSetting['category'],
    amount: '',
    description: '',
    cycleOrLevel: '',
    period: 'unique',
  });

  const saveFeeSettingsToStorage = (updatedFees: FeeSetting[]) => {
    setFees(updatedFees);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('school_fee_settings', JSON.stringify(updatedFees));
    }
  };

  const handleSaveFee = () => {
    if (!formFee.label || !formFee.amount) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Le libellé et le montant sont requis.' });
      return;
    }
    const amt = Number(formFee.amount) || 0;
    if (editFee) {
      const updated = fees.map(f => f.id === editFee.id ? { ...f, label: formFee.label, category: formFee.category, amount: amt, description: formFee.description, cycleOrLevel: formFee.cycleOrLevel, period: formFee.period } : f);
      saveFeeSettingsToStorage(updated);
      toast({ title: 'Frais mis à jour !', description: `${formFee.label} modifié.` });
    } else {
      const newFeeItem: FeeSetting = {
        id: `fee-${Date.now()}`,
        label: formFee.label,
        category: formFee.category,
        amount: amt,
        description: formFee.description,
        cycleOrLevel: formFee.cycleOrLevel,
        period: formFee.period,
        active: true,
      };
      const updated = [...fees, newFeeItem];
      saveFeeSettingsToStorage(updated);
      toast({ title: 'Nouveau type de frais ajouté !', description: `${formFee.label} enregistré.` });
    }
    setOpenFeeModal(false);
    setEditFee(null);
    setFormFee({ label: '', category: 'autre', amount: '', description: '', cycleOrLevel: '', period: 'unique' });
  };

  const toggleFeeStatus = (id: string) => {
    const updated = fees.map(f => f.id === id ? { ...f, active: !f.active } : f);
    saveFeeSettingsToStorage(updated);
    toast({ title: 'Statut du frais mis à jour' });
  };

  const deleteFee = (id: string) => {
    const updated = fees.filter(f => f.id !== id);
    saveFeeSettingsToStorage(updated);
    toast({ title: 'Frais supprimé' });
  };

  const [openAnnee, setOpenAnnee] = useState(false);
  const [formAnnee, setFormAnnee] = useState({ label: '', debut: '', fin: '' });
  const [openNiveau, setOpenNiveau] = useState(false);
  const [editNiveau, setEditNiveau] = useState<Niveau | null>(null);
  const [formNiveau, setFormNiveau] = useState({ nom: '', cycle: CYCLES[0], ordre: '' });
  const [openUser, setOpenUser] = useState(false);
  const [editUser, setEditUser] = useState<UtilisateurConfig | null>(null);
  const [formUser, setFormUser] = useState({ nom: '', email: '', role: ROLES[0] });

  // ─── Années scolaires (référentiel persisté) ────────────────────────────
  const activerAnnee = async (id: number) => {
    try {
      await apiClient.activerAnneeScolaire(id);
      await chargerAnnees();
      toast({ title: 'Année scolaire activée' });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: "Activation impossible",
        description: err?.response?.data?.detail || "Le serveur n'a pas pu activer cette année.",
      });
    }
  };

  const addAnnee = async () => {
    if (!formAnnee.label || !formAnnee.debut || !formAnnee.fin) { toast({ variant: 'destructive', title: 'Tous les champs requis' }); return; }
    setAnneeSaving(true);
    try {
      await apiClient.createAnneeScolaire({
        libelle: formAnnee.label.trim(),
        date_debut: formAnnee.debut,
        date_fin: formAnnee.fin,
      });
      await chargerAnnees();
      setOpenAnnee(false);
      setFormAnnee({ label: '', debut: '', fin: '' });
      toast({ title: 'Année ajoutée' });
    } catch (err: any) {
      // Le serveur porte les règles : format AAAA-AAAA, années consécutives,
      // doublon, cohérence des dates. On affiche son message tel quel.
      toast({
        variant: 'destructive',
        title: "Année non enregistrée",
        description: err?.response?.data?.detail || "Le serveur a refusé cette année scolaire.",
      });
    } finally {
      setAnneeSaving(false);
    }
  };

  // Niveaux
  const saveNiveau = () => {
    if (!formNiveau.nom) { toast({ variant: 'destructive', title: 'Nom requis' }); return; }
    const data: Niveau = { id: editNiveau?.id || `n-${Date.now()}`, nom: formNiveau.nom, cycle: formNiveau.cycle, ordre: Number(formNiveau.ordre) || niveaux.length + 1 };
    if (editNiveau) { setNiveaux(p => p.map(n => n.id === editNiveau.id ? data : n)); toast({ title: 'Niveau mis à jour' }); }
    else { setNiveaux(p => [...p, data]); toast({ title: 'Niveau ajouté' }); }
    setOpenNiveau(false); setEditNiveau(null); setFormNiveau({ nom: '', cycle: CYCLES[0], ordre: '' });
  };

  // ─── Matières & Coefficients (par niveau et par série) ─────────────────────
  const niveauxTries = useMemo(() => [...niveaux].sort((a, b) => a.ordre - b.ordre), [niveaux]);
  const [selectedNiveauMatiere, setSelectedNiveauMatiere] = useState<string>('Terminale');
  const [selectedSerieMatiere, setSelectedSerieMatiere] = useState<SerieCode>('COMMUN');
  const niveauCodeMatiere = useMemo(() => normaliserNiveauCode(selectedNiveauMatiere), [selectedNiveauMatiere]);
  const serieApplicable = useMemo(() => niveauSupporteSerie(niveauCodeMatiere), [niveauCodeMatiere]);
  const serieEffective: SerieCode = serieApplicable ? selectedSerieMatiere : 'COMMUN';
  const libelleSerieCourt = (s: SerieCode) => SERIES.find(x => x.id === s)?.libelle.replace(/^Série /, '').replace(/^Filière /, '') || s;

  const [matieresConfigList, setMatieresConfigList] = useState<MatiereCoefficient[]>([]);
  const [openMatiereDialog, setOpenMatiereDialog] = useState(false);
  const [editMatiereItem, setEditMatiereItem] = useState<MatiereCoefficient | null>(null);
  const [formMatiere, setFormMatiere] = useState({ matiere: '', groupe: 'litteraire' as GroupeMatiere, coefficient: '2' });

  useEffect(() => {
    setMatieresConfigList(getMatieresConfig(selectedNiveauMatiere, serieEffective, activeSchoolCode || activeSchoolId));
    // Revenir sur "Tronc commun" dès qu'un niveau sans filière est sélectionné.
    if (!serieApplicable && selectedSerieMatiere !== 'COMMUN') setSelectedSerieMatiere('COMMUN');
  }, [selectedNiveauMatiere, serieEffective, serieApplicable, activeSchoolCode, activeSchoolId]);

  const totalCoefficientsMatieres = useMemo(
    () => matieresConfigList.filter(m => m.actif).reduce((sum, m) => sum + (Number(m.coefficient) || 0), 0),
    [matieresConfigList],
  );

  const persistMatieres = (updated: MatiereCoefficient[]) => {
    setMatieresConfigList(updated);
    saveMatieresConfig(selectedNiveauMatiere, serieEffective, updated, activeSchoolCode || activeSchoolId);
  };

  const handleSaveMatiere = () => {
    const nom = formMatiere.matiere.trim();
    const coeff = Number(formMatiere.coefficient);
    if (!nom) { toast({ variant: 'destructive', title: 'Le nom de la matière est requis' }); return; }
    if (!coeff || coeff <= 0) { toast({ variant: 'destructive', title: 'Le coefficient doit être supérieur à 0' }); return; }

    let updated: MatiereCoefficient[];
    if (editMatiereItem) {
      updated = matieresConfigList.map(m => m.id === editMatiereItem.id
        ? { ...m, matiere: nom, groupe: formMatiere.groupe, coefficient: coeff }
        : m);
      toast({ title: 'Matière mise à jour', description: `${nom} — ${libelleGroupeMatiere(formMatiere.groupe)}` });
    } else {
      const nouvelle: MatiereCoefficient = {
        id: `mc-${Date.now()}`,
        matiere: nom,
        groupe: formMatiere.groupe,
        coefficient: coeff,
        ordre: matieresConfigList.length + 1,
        actif: true,
      };
      updated = [...matieresConfigList, nouvelle];
      toast({ title: 'Matière ajoutée', description: `${nom} (coef. ${coeff}) pour ${selectedNiveauMatiere}${serieApplicable ? ` — ${libelleSerieCourt(serieEffective)}` : ''}.` });
    }
    persistMatieres(updated);
    setOpenMatiereDialog(false);
    setEditMatiereItem(null);
    setFormMatiere({ matiere: '', groupe: 'litteraire', coefficient: '2' });
  };

  const handleToggleMatiereActif = (id: string) => {
    persistMatieres(matieresConfigList.map(m => m.id === id ? { ...m, actif: !m.actif } : m));
  };

  const handleDeleteMatiere = (id: string) => {
    persistMatieres(matieresConfigList.filter(m => m.id !== id));
    toast({ title: 'Matière retirée du niveau' });
  };

  const handleResetMatieres = () => {
    const defaults = resetMatieresConfig(selectedNiveauMatiere, serieEffective, activeSchoolCode || activeSchoolId);
    setMatieresConfigList(defaults);
    toast({ title: 'Barème réinitialisé', description: `Coefficients par défaut restaurés pour ${selectedNiveauMatiere}.` });
  };

  // Utilisateurs
  const saveUser = () => {
    if (!formUser.nom || !formUser.email) { toast({ variant: 'destructive', title: 'Nom et email requis' }); return; }
    if (editUser) {
      setUsers(p => p.map(u => u.id === editUser.id ? { ...u, ...formUser } : u));
      toast({ title: 'Utilisateur mis à jour' });
    } else {
      setUsers(p => [...p, { id: `u-${Date.now()}`, ...formUser, actif: true }]);
      toast({ title: 'Utilisateur ajouté' });
    }
    setOpenUser(false); setEditUser(null); setFormUser({ nom: '', email: '', role: ROLES[0] });
  };
  const toggleUser = (id: string) => setUsers(p => p.map(u => u.id === id ? { ...u, actif: !u.actif } : u));

  const cycleColor = (c: string) => {
    if (c === 'Maternelle') return 'bg-pink-100 text-pink-700';
    if (c === 'Primaire') return 'bg-blue-100 text-blue-700';
    if (c === 'Collège') return 'bg-green-100 text-green-700';
    if (c === 'Collège 2nd cycle') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Settings className="h-7 w-7 text-primary" />Paramètres & Configuration</h1>
          <p className="text-muted-foreground mt-1">Gestion des années scolaires, niveaux, utilisateurs et apparence</p>
        </div>

        <Tabs defaultValue="tarifs_especes">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="tarifs_especes" className="gap-1.5 font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <DollarSign className="h-4 w-4" /> Tarifs Espèces, Tenues & Achats Divers
            </TabsTrigger>
            <TabsTrigger value="scolarite_frais" className="gap-1">
              <Receipt className="h-4 w-4" /> Grille Scolarité & Autres Frais
            </TabsTrigger>
            <TabsTrigger value="annee" className="gap-1">
              <Calendar className="h-4 w-4" /> Années scolaires
            </TabsTrigger>
            <TabsTrigger value="niveaux" className="gap-1">
              <BookOpen className="h-4 w-4" /> Cycles & Niveaux
            </TabsTrigger>
            <TabsTrigger value="matieres" className="gap-1">
              <Layers className="h-4 w-4" /> Matières & Coefficients
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1">
              <Users className="h-4 w-4" /> Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="historique_rdv" className="gap-1">
              <CalendarClock className="h-4 w-4" /> Historique RDV
            </TabsTrigger>
            <TabsTrigger value="apparence" className="gap-1">
              <Palette className="h-4 w-4" /> Apparence
            </TabsTrigger>
          </TabsList>

          {/* ─── ONGLET 1 : TARIFS OFFICIELS ESPÈCES & FRAIS DIVERS ─── */}
          <TabsContent value="tarifs_especes" className="mt-4 space-y-6">
            {/* ── BARRE DE SÉLECTION D'ÉTABLISSEMENT & VILLE ── */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-blue-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    Ciblage Établissement & Ville (Tarification Isolée)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Les montants (frais annexes, tenues, fournitures, cours) diffèrent selon chaque ville (Korhogo, Daloa, Bouaké, Yamoussoukro, Abidjan). Sélectionnez ci-dessous l'école pour personnaliser ses montants exclusifs.
                  </p>
                </div>
                {currentSchoolObj && (
                  <Badge className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-3 py-1.5 text-xs font-bold gap-2">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    {activeCityName || 'Ville non définie'} • Code: {activeSchoolCode || 'N/A'} (ID: {activeSchoolId || 'N/A'})
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                {/* 1. Sélection Ville */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-500" /> Ville :
                  </Label>
                  <Select
                    value={selectedCity}
                    onValueChange={(val) => {
                      setSelectedCity(val);
                      if (val !== 'all') {
                        const schoolInCity = schools.find(
                          (s: any) => normalizeCity(s.city || s.ET_VILLE) === normalizeCity(val)
                        );
                        if (schoolInCity) {
                          setSelectedSchool(
                            schoolInCity.ET_CODEETABLISSEMENT ||
                              schoolInCity.code ||
                              String(schoolInCity.id || schoolInCity.IDETABLISSEMENT)
                          );
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-sm font-medium">
                      <SelectValue placeholder="Toutes les villes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">📍 Toutes les villes (Vue globale)</SelectItem>
                      {availableCityOptions.map((cityName) => (
                        <SelectItem key={cityName} value={cityName}>
                          🏙️ {cityName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Sélection Établissement */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5 text-blue-600" /> Établissement / École :
                  </Label>
                  <Select
                    value={selectedSchool}
                    onValueChange={(val) => {
                      setSelectedSchool(val);
                      const target = schools.find(
                        (s: any) =>
                          String(s.id || s.IDETABLISSEMENT) === String(val) ||
                          String(s.code || s.ET_CODEETABLISSEMENT || '').toUpperCase() === String(val).toUpperCase()
                      );
                      if (target && (target.city || target.ET_VILLE)) {
                        setSelectedCity(target.city || target.ET_VILLE);
                      }
                    }}
                  >
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-sm font-bold text-blue-950 dark:text-blue-200">
                      <SelectValue placeholder="Sélectionnez une école..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">🌐 Configuration Globale par Défaut</SelectItem>
                      {filteredSchoolsList.map((sch: any) => {
                        const code = sch.ET_CODEETABLISSEMENT || sch.code || 'N/A';
                        const name = sch.ET_DENOMMINATION || sch.name || `École #${sch.id || sch.IDETABLISSEMENT}`;
                        const city = sch.ET_VILLE || sch.city || '';
                        const idVal = sch.ET_CODEETABLISSEMENT || sch.code || String(sch.id || sch.IDETABLISSEMENT);
                        return (
                          <SelectItem key={idVal} value={idVal}>
                            🏫 {name} — ({city} • Code: {code})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Avertissement si mode global */}
            {(!activeSchoolCode && !activeSchoolId) && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg flex items-start gap-3">
                <div className="text-blue-600 dark:text-blue-400 font-bold text-lg">⚠️</div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Mode Configuration Globale</p>
                  <p className="text-xs text-blue-800 dark:text-blue-300">Vous êtes actuellement en mode de configuration par défaut pour toutes les écoles. Pour configurer les tarifs d'une école spécifique, sélectionnez-la dans le menu « Établissement / École » ci-dessus.</p>
                </div>
              </div>
            )}

            {/* Section 0 : Modèle d'encaissement de la rentrée (septembre) */}
            <Card className="border-amber-200 dark:border-amber-900 shadow-sm">
              <CardHeader className="bg-white dark:from-slate-900 dark:border-b border-amber-100 dark:border-amber-900 pb-4">
                <CardTitle className="text-base font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-amber-600" /> Modèle d'encaissement de la rentrée (Septembre)
                </CardTitle>
                <CardDescription className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Toutes les écoles ne perçoivent pas une première tranche de scolarité en septembre. Ce réglage
                  détermine ce qui est imprimé sur le reçu de caisse à la rentrée pour l'établissement sélectionné.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <div className="space-y-1.5 max-w-2xl">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Ce que l'élève règle en septembre :
                  </Label>
                  <Select value={modeleSeptembre} onValueChange={(val) => handleChangeModeleSeptembre(val as ModeleSeptembre)}>
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-sm font-bold text-amber-950 dark:text-amber-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inscription_plus_scolarite">
                        Frais d'inscription + 1ère tranche de scolarité (modèle historique)
                      </SelectItem>
                      <SelectItem value="inscription_seule">
                        Frais d'inscription uniquement (ex. : Korhogo)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {modeleSeptembre === 'inscription_seule'
                    ? "Le reçu n'affiche que la ligne « Frais d'Inscription » à la rentrée : aucune ligne « Frais de Scolarité. 05 sept. » n'est imprimée, et son montant ne pèse plus sur le reste dû. Une tranche de septembre déjà encaissée reste visible au reçu."
                    : "Le reçu affiche les frais d'inscription puis la 1ère tranche de scolarité de septembre, chacun avec son montant et son reste dû."}
                </p>
              </CardContent>
            </Card>

            {/* Section 1 : Tarifs Officiels Espèces par Cycle & Niveau */}
            <Card className="border-blue-200 dark:border-blue-900 shadow-sm">
              <CardHeader className="bg-white dark:from-slate-900 dark:border-b border-blue-100 dark:border-blue-900 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold text-blue-950 dark:text-blue-200 flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-blue-600" /> Tarifs Officiels Espèces (Frais Annexes Guichet par Cycle)
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Personnalisez les montants fixes des frais annexes perçus en espèces pour chaque niveau. Ces montants sont appliqués à l'étape 7 du processus d'inscription et sur les reçus de caisse.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleResetCashTariffs} className="text-xs gap-1.5">
                      <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
                    </Button>
                    <Button size="sm" onClick={handleSaveCashTariffs} className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 font-bold shadow-sm">
                      <Check className="h-3.5 w-3.5" /> Enregistrer les Tarifs
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-6">
                {/* 1. COLLÈGE 1ER CYCLE */}
                <div className="p-4 bg-blue-50/60 dark:bg-slate-900/60 rounded-lg border border-blue-200 dark:border-blue-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-blue-950 dark:text-blue-200 flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-blue-600" /> Collège 1er Cycle (6ème à 3ème)
                    </span>
                    <Badge className="bg-blue-600 text-white text-[10px]">1er Cycle Collège</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                      <Label className="text-xs text-slate-600 dark:text-slate-300 font-semibold block">
                        5ème B, C & D et 4ème B, C & D
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          step={500}
                          value={cashTariffs.college_1er_cycle_bcd}
                          onChange={(e) =>
                            setCashTariffs({
                              ...cashTariffs,
                              college_1er_cycle_bcd: Number(e.target.value) || 0,
                            })
                          }
                          className="font-bold text-blue-950 dark:text-blue-100 pr-14 text-sm"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold pointer-events-none">
                          F CFA
                        </span>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                      <Label className="text-xs text-slate-600 dark:text-slate-300 font-semibold block">
                        De 6ème à 4ème (Général)
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          step={500}
                          value={cashTariffs.college_1er_cycle_general}
                          onChange={(e) =>
                            setCashTariffs({
                              ...cashTariffs,
                              college_1er_cycle_general: Number(e.target.value) || 0,
                            })
                          }
                          className="font-bold text-blue-950 dark:text-blue-100 pr-14 text-sm"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold pointer-events-none">
                          F CFA
                        </span>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                      <Label className="text-xs text-slate-600 dark:text-slate-300 font-semibold block">
                        3ème (Classes d'examen)
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          step={500}
                          value={cashTariffs.college_1er_cycle_3eme}
                          onChange={(e) =>
                            setCashTariffs({
                              ...cashTariffs,
                              college_1er_cycle_3eme: Number(e.target.value) || 0,
                            })
                          }
                          className="font-bold text-blue-950 dark:text-blue-100 pr-14 text-sm"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold pointer-events-none">
                          F CFA
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. COLLÈGE 2ND CYCLE (LYCÉE) */}
                <div className="p-4 bg-blue-50/60 dark:bg-slate-900/60 rounded-lg border border-purple-200 dark:border-purple-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-blue-950 dark:text-blue-200 flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-blue-600" /> Collège 2nd Cycle (Lycée : 2nde à Terminale)
                    </span>
                    <Badge className="bg-blue-600 text-white text-[10px]">2nd Cycle Lycée</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                      <Label className="text-xs text-slate-600 dark:text-slate-300 font-semibold block">
                        2nd & 1ère (Toutes séries)
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          step={500}
                          value={cashTariffs.college_2nd_cycle_2nde_1ere}
                          onChange={(e) =>
                            setCashTariffs({
                              ...cashTariffs,
                              college_2nd_cycle_2nde_1ere: Number(e.target.value) || 0,
                            })
                          }
                          className="font-bold text-blue-950 dark:text-blue-100 pr-14 text-sm"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold pointer-events-none">
                          F CFA
                        </span>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                      <Label className="text-xs text-slate-600 dark:text-slate-300 font-semibold block">
                        Terminale (Tle A, C, D)
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          step={500}
                          value={cashTariffs.college_2nd_cycle_tle}
                          onChange={(e) =>
                            setCashTariffs({
                              ...cashTariffs,
                              college_2nd_cycle_tle: Number(e.target.value) || 0,
                            })
                          }
                          className="font-bold text-blue-950 dark:text-blue-100 pr-14 text-sm"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold pointer-events-none">
                          F CFA
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. PRIMAIRE & MATERNELLE */}
                <div className="p-4 bg-gray-50/60 dark:bg-slate-900/60 rounded-lg border border-gray-200 dark:border-gray-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-gray-950 dark:text-gray-200 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-gray-600" /> Primaire & Maternelle
                    </span>
                    <Badge className="bg-gray-600 text-white text-[10px]">Fiche Primaire / Maternelle</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                      <Label className="text-xs text-slate-600 dark:text-slate-300 font-semibold block">
                        Maternelle (MPS, MMS, MGS)
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          step={500}
                          value={cashTariffs.maternelle}
                          onChange={(e) =>
                            setCashTariffs({
                              ...cashTariffs,
                              maternelle: Number(e.target.value) || 0,
                            })
                          }
                          className="font-bold text-gray-950 dark:text-gray-100 pr-14 text-sm"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold pointer-events-none">
                          F CFA
                        </span>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                      <Label className="text-xs text-slate-600 dark:text-slate-300 font-semibold block">
                        Primaire (CP1, CP2, CE1, CE2, CM1, CM2)
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          step={500}
                          value={cashTariffs.primaire}
                          onChange={(e) =>
                            setCashTariffs({
                              ...cashTariffs,
                              primaire: Number(e.target.value) || 0,
                            })
                          }
                          className="font-bold text-gray-950 dark:text-gray-100 pr-14 text-sm"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold pointer-events-none">
                          F CFA
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2 : Achats de Tenues & Uniformes Scolaires (Liées aux Niveaux/Cycles & Genre) */}
            <Card className="border-blue-200 dark:border-blue-900 shadow-sm">
              <CardHeader className="bg-white dark:from-slate-900 dark:border-b border-blue-100 dark:border-blue-900 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold text-blue-950 dark:text-blue-200 flex items-center gap-2">
                      <Shirt className="h-5 w-5 text-blue-600" /> Achats de Tenues & Uniformes (Niveaux / Cycles & Genre M / S)
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Les tenues sont configurées par <strong>Cycle / Niveau (Collège, Lycée, Primaire, Maternelle)</strong> et par <strong>Genre (M = Garçon, S = Fille)</strong>. Les tarifs sont modifiables, supprimables et s'ajoutent au total du reçu.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                      onClick={() => {
                        setEditFraisDivers(null);
                        setFormFraisDivers({ libelle: 'Tenue Complète Collège (Polo + Pantalon) — Genre M', code: 'tenue_college_m', categorie: 'tenue', genre: 'M', cycle: 'Collège', niveau: 'tous', montant: '15000', description: 'Polo + Pantalon Collège pour garçon', periodicite: 'unique' });
                        setOpenFraisDiversModal(true);
                      }}
                    >
                      <Plus className="h-4 w-4" /> Tenue Genre M (Garçon)
                    </Button>
                    <Button
                      size="sm"
                      className="bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                      onClick={() => {
                        setEditFraisDivers(null);
                        setFormFraisDivers({ libelle: 'Tenue Complète Collège (Polo + Jupe) — Genre S', code: 'tenue_college_s', categorie: 'tenue', genre: 'S', cycle: 'Collège', niveau: 'tous', montant: '15000', description: 'Polo + Jupe Collège pour fille', periodicite: 'unique' });
                        setOpenFraisDiversModal(true);
                      }}
                    >
                      <Plus className="h-4 w-4" /> Tenue Genre S (Fille)
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {/* Double Filtre : Cycle / Niveau ET Genre M & S */}
                <div className="space-y-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-500 min-w-[100px]">Niveau / Cycle :</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {[
                        { id: 'tous', label: 'Tous les cycles' },
                        { id: 'Collège', label: '🏫 Collège (6e-3e)' },
                        { id: 'Collège 2nd cycle', label: '🏫 Lycée (2nde-Tle)' },
                        { id: 'Primaire', label: '🏫 Primaire (CP-CM2)' },
                        { id: 'Maternelle', label: '🏫 Maternelle' },
                      ].map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setTenueCycleFilter(c.id)}
                          className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all ${
                            tenueCycleFilter === c.id
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-500 min-w-[100px]">Genre élève :</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setTenueGenreFilter('tous')}
                        className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all ${
                          tenueGenreFilter === 'tous'
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Tous les genres
                      </button>
                      <button
                        type="button"
                        onClick={() => setTenueGenreFilter('M')}
                        className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all flex items-center gap-1 ${
                          tenueGenreFilter === 'M'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-slate-800 dark:text-blue-300'
                        }`}
                      >
                        👍¦ Genre M (Garçon)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTenueGenreFilter('S')}
                        className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all flex items-center gap-1 ${
                          tenueGenreFilter === 'S'
                            ? 'bg-pink-600 text-white shadow-xs'
                            : 'bg-pink-50 text-pink-700 hover:bg-pink-100 dark:bg-slate-800 dark:text-pink-300'
                        }`}
                      >
                        👍§ Genre S (Fille)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {fraisDiversList
                    .filter((item) => item.categorie === 'tenue' || item.code.includes('tenue') || item.code.includes('polo'))
                    .filter((item) => tenueGenreFilter === 'tous' || item.genre === tenueGenreFilter || (!item.genre && tenueGenreFilter === 'tous'))
                    .filter((item) => tenueCycleFilter === 'tous' || item.cycle === tenueCycleFilter || item.cycle === 'tous' || (!item.cycle && tenueCycleFilter === 'tous'))
                    .map((item) => (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-lg border transition-all ${
                          item.actif
                            ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Shirt className="h-4 w-4 text-blue-600" />
                              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{item.libelle}</span>
                              {item.cycle && item.cycle !== 'tous' && (
                                <Badge variant="outline" className="text-[10px] font-bold border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                                  {item.cycle === 'Collège 2nd cycle' ? 'Lycée' : item.cycle}
                                </Badge>
                              )}
                              {item.genre === 'M' ? (
                                <Badge className="bg-blue-600 text-white text-[10px]">👍¦ M (Garçon)</Badge>
                              ) : item.genre === 'S' ? (
                                <Badge className="bg-pink-600 text-white text-[10px]">👍§ S (Fille)</Badge>
                              ) : (
                                <Badge className="bg-blue-600 text-white text-[10px]">👥 Mixte</Badge>
                              )}
                              <Badge variant={item.actif ? 'default' : 'secondary'} className="text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                                {item.periodicite || 'unique'}
                              </Badge>
                            </div>
                            {item.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-sm text-blue-600 dark:text-blue-400 block">
                              {item.montant.toLocaleString('fr-FR')} F CFA
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
                          <button
                            type="button"
                            onClick={() => handleToggleFraisDivers(item.id)}
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                              item.actif ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {item.actif ? 'âœ“ Actif' : 'Inactif'}
                          </button>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setEditFraisDivers(item);
                                setFormFraisDivers({
                                  libelle: item.libelle,
                                  code: item.code,
                                  categorie: item.categorie || 'tenue',
                                  genre: item.genre || 'M',
                                  cycle: item.cycle || 'Collège',
                                  niveau: item.niveau || 'tous',
                                  montant: String(item.montant),
                                  description: item.description || '',
                                  periodicite: item.periodicite || 'unique',
                                });
                                setOpenFraisDiversModal(true);
                              }}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive"
                              onClick={() => handleDeleteFraisDivers(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Section 3 : Achats Divers & Fournitures Scolaires */}
            <Card className="border-gray-200 dark:border-gray-900 shadow-sm">
              <CardHeader className="bg-white to-orange-50 dark:from-slate-900 dark:to-amber-950 border-b border-gray-100 dark:border-gray-900 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold text-gray-950 dark:text-gray-200 flex items-center gap-2">
                      <Package className="h-5 w-5 text-gray-600" /> Achats Divers & Fournitures Scolaires
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Configurez les kits de fournitures, cahiers, macarons, carnets, manuels et annales. Ces montants s'ajoutent au total des encaissements sur le reçu.
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    className="bg-gray-600 hover:bg-gray-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                    onClick={() => {
                      setEditFraisDivers(null);
                      setFormFraisDivers({ libelle: '', code: 'achat_divers', categorie: 'achat_divers', montant: '', description: '', periodicite: 'unique' });
                      setOpenFraisDiversModal(true);
                    }}
                  >
                    <Plus className="h-4 w-4" /> Ajouter un Achat Divers
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {fraisDiversList
                    .filter((item) => item.categorie === 'achat_divers' || item.code.includes('achat') || item.code.includes('fourniture') || item.code.includes('kit') || item.code.includes('livre'))
                    .map((item) => (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-lg border transition-all ${
                          item.actif
                            ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-gray-300'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-gray-600" />
                              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{item.libelle}</span>
                              <Badge variant={item.actif ? 'default' : 'secondary'} className="text-[10px] bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                                {item.periodicite || 'unique'}
                              </Badge>
                            </div>
                            {item.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-sm text-gray-600 dark:text-gray-400 block">
                              {item.montant.toLocaleString('fr-FR')} F CFA
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
                          <button
                            type="button"
                            onClick={() => handleToggleFraisDivers(item.id)}
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                              item.actif ? 'bg-gray-100 text-gray-800' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {item.actif ? 'âœ“ Actif' : 'Inactif'}
                          </button>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setEditFraisDivers(item);
                                setFormFraisDivers({
                                  libelle: item.libelle,
                                  code: item.code,
                                  categorie: item.categorie || 'achat_divers',
                                  montant: String(item.montant),
                                  description: item.description || '',
                                  periodicite: item.periodicite || 'unique',
                                });
                                setOpenFraisDiversModal(true);
                              }}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive"
                              onClick={() => handleDeleteFraisDivers(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Section 4 : Cours & Activités Pédagogiques (Anglais, Informatique, etc.) */}
            <Card className="border-blue-200 dark:border-blue-900 shadow-sm">
              <CardHeader className="bg-white to-teal-50 dark:from-slate-900 dark:to-emerald-950 border-b border-blue-100 dark:border-blue-900 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold text-gray-950 dark:text-gray-200 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-gray-600" /> Cours & Activités Pédagogiques (Anglais, Informatique, Soutien...)
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Configurez les formations linguistiques, cours informatiques / TICE, cours de soutien scolaire et activités périscolaires.
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    className="bg-gray-600 hover:bg-gray-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                    onClick={() => {
                      setEditFraisDivers(null);
                      setFormFraisDivers({ libelle: '', code: 'cours_anglais', categorie: 'cours', montant: '', description: '', periodicite: 'mensuel' });
                      setOpenFraisDiversModal(true);
                    }}
                  >
                    <Plus className="h-4 w-4" /> Ajouter un Cours / Activité
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {fraisDiversList
                    .filter((item) => item.categorie !== 'tenue' && item.categorie !== 'achat_divers' && !item.code.includes('tenue') && !item.code.includes('achat') && !item.code.includes('fourniture') && !item.code.includes('polo'))
                    .map((item) => (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-lg border transition-all ${
                          item.actif
                            ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              {item.code === 'cours_anglais' ? (
                                <Languages className="h-4 w-4 text-blue-600" />
                              ) : item.code === 'cours_informatique' ? (
                                <Laptop className="h-4 w-4 text-gray-600" />
                              ) : (
                                <Sparkles className="h-4 w-4 text-gray-600" />
                              )}
                              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{item.libelle}</span>
                              <Badge variant={item.actif ? 'default' : 'secondary'} className="text-[10px]">
                                {item.periodicite || 'mensuel'}
                              </Badge>
                            </div>
                            {item.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-sm text-gray-600 dark:text-gray-400 block">
                              {item.montant.toLocaleString('fr-FR')} F CFA
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
                          <button
                            type="button"
                            onClick={() => handleToggleFraisDivers(item.id)}
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                              item.actif ? 'bg-gray-100 text-gray-800' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {item.actif ? 'âœ“ Actif' : 'Inactif'}
                          </button>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setEditFraisDivers(item);
                                setFormFraisDivers({
                                  libelle: item.libelle,
                                  code: item.code,
                                  categorie: item.categorie || 'cours',
                                  montant: String(item.montant),
                                  description: item.description || '',
                                  periodicite: item.periodicite || 'mensuel',
                                });
                                setOpenFraisDiversModal(true);
                              }}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive"
                              onClick={() => handleDeleteFraisDivers(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Années scolaires ─── */}
          <TabsContent value="annee" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button size="sm" className="gap-1" onClick={() => setOpenAnnee(true)}><Plus className="h-4 w-4" />Ajouter une année</Button>
            </div>
            <div className="space-y-3">
              {annees.length === 0 ? (
                <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
                  {anneesLoading
                    ? 'Chargement…'
                    : "Aucune année scolaire enregistrée. La première année créée deviendra automatiquement l'année active."}
                </div>
              ) : (
                annees.map(a => (
                  <div key={a.id} className={`flex items-center justify-between bg-card border rounded-lg p-4 ${a.active ? 'border-primary ring-1 ring-primary/30' : ''}`}>
                    <div className="flex items-center gap-3">
                      {a.active && <Check className="h-5 w-5 text-primary" />}
                      <div>
                        <p className="font-semibold">{a.libelle} {a.active && <Badge className="ml-2 text-[10px]">Active</Badge>}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(a.date_debut).toLocaleDateString('fr-FR')} â†’ {new Date(a.date_fin).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    {!a.active && <Button size="sm" variant="outline" onClick={() => activerAnnee(a.id)}>Activer</Button>}
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Une seule année est active à la fois. Son libellé sert de référence aux grilles
              tarifaires, échéanciers et bulletins.
            </p>
          </TabsContent>

          {/* ─── Niveaux ─── */}
          <TabsContent value="niveaux" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button size="sm" className="gap-1" onClick={() => { setEditNiveau(null); setFormNiveau({ nom: '', cycle: CYCLES[0], ordre: '' }); setOpenNiveau(true); }}><Plus className="h-4 w-4" />Ajouter un niveau</Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CYCLES.map(cycle => {
                const lvls = niveaux.filter(n => n.cycle === cycle).sort((a, b) => a.ordre - b.ordre);
                if (!lvls.length) return null;
                return (
                  <Card key={cycle}>
                    <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm flex items-center gap-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${cycleColor(cycle)}`}>{cycle}</span></CardTitle></CardHeader>
                    <CardContent className="px-4 pb-3 space-y-1">
                      {lvls.map(n => (
                        <div key={n.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                          <span>{n.nom}</span>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditNiveau(n); setFormNiveau({ nom: n.nom, cycle: n.cycle, ordre: String(n.ordre) }); setOpenNiveau(true); }}><Edit className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setNiveaux(p => p.filter(x => x.id !== n.id))}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ─── Matières & Coefficients (par niveau et par série) ─── */}
          <TabsContent value="matieres" className="mt-4 space-y-4">
            <Card className="border-blue-200 dark:border-blue-900 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Layers className="h-5 w-5 text-blue-600" /> Sélection du niveau et de la série
                </CardTitle>
                <CardDescription className="text-xs">
                  Chaque niveau — et pour la 1ère et la Terminale, chaque série (A, C, D, Arabe, Autre) — possède
                  sa propre liste de matières, son groupe (Littéraire, Scientifique, Arabe, Autre) et son coefficient.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Niveau :</Label>
                  <Select value={selectedNiveauMatiere} onValueChange={setSelectedNiveauMatiere}>
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {niveauxTries.map(n => (
                        <SelectItem key={n.id} value={n.nom}>{n.nom} <span className="text-muted-foreground">({n.cycle})</span></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Série :</Label>
                  {serieApplicable ? (
                    <Select value={selectedSerieMatiere} onValueChange={(v) => setSelectedSerieMatiere(v as SerieCode)}>
                      <SelectTrigger className="bg-slate-50 dark:bg-slate-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SERIES.filter(s => s.id !== 'COMMUN').map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.libelle}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="h-10 flex items-center px-3 rounded-md border bg-muted text-xs text-muted-foreground">
                      Tronc commun — ce niveau n'a pas de série
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      Matières — {selectedNiveauMatiere}{serieApplicable && <Badge className="ml-1">{libelleSerieCourt(serieEffective)}</Badge>}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Total des coefficients actifs : <strong>{totalCoefficientsMatieres}</strong>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleResetMatieres} className="gap-1.5 text-xs">
                      <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        setEditMatiereItem(null);
                        setFormMatiere({ matiere: '', groupe: 'litteraire', coefficient: '2' });
                        setOpenMatiereDialog(true);
                      }}
                    >
                      <Plus className="h-4 w-4" /> Ajouter une matière
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {matieresConfigList.length === 0 ? (
                  <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
                    Aucune matière paramétrée pour ce niveau. Ajoutez-en une ou réinitialisez le barème par défaut.
                  </div>
                ) : (
                  matieresConfigList
                    .slice()
                    .sort((a, b) => a.ordre - b.ordre)
                    .map((m) => {
                      const groupeInfo = GROUPES_MATIERES.find(g => g.id === m.groupe);
                      return (
                        <div key={m.id} className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${!m.actif ? 'opacity-50' : ''}`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <Badge className={`${groupeInfo?.classeBadge} shrink-0`}>{groupeInfo?.libelle}</Badge>
                            <span className="font-medium text-sm truncate">{m.matiere}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="font-mono">coef {m.coefficient}</Badge>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleToggleMatiereActif(m.id)}>
                              {m.actif ? 'Désactiver' : 'Activer'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setEditMatiereItem(m);
                                setFormMatiere({ matiere: m.matiere, groupe: m.groupe, coefficient: String(m.coefficient) });
                                setOpenMatiereDialog(true);
                              }}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDeleteMatiere(m.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                )}
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
              Ce paramétrage alimente le calcul des moyennes et les bulletins (Espace Notes). Une matière sans
              entrée ici retombe sur le coefficient par défaut historique de l'application.
            </p>

            <Dialog open={openMatiereDialog} onOpenChange={setOpenMatiereDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editMatiereItem ? 'Modifier la matière' : 'Ajouter une matière'}</DialogTitle>
                  <DialogDescription>
                    Pour {selectedNiveauMatiere}{serieApplicable ? ` — Série ${libelleSerieCourt(serieEffective)}` : ''}.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Nom de la matière</Label>
                    <Input
                      value={formMatiere.matiere}
                      onChange={(e) => setFormMatiere({ ...formMatiere, matiere: e.target.value })}
                      placeholder="Ex: Philosophie"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Groupe de matières</Label>
                      <Select value={formMatiere.groupe} onValueChange={(v) => setFormMatiere({ ...formMatiere, groupe: v as GroupeMatiere })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {GROUPES_MATIERES.map(g => (
                            <SelectItem key={g.id} value={g.id}>{g.libelle}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Coefficient</Label>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={formMatiere.coefficient}
                        onChange={(e) => setFormMatiere({ ...formMatiere, coefficient: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenMatiereDialog(false)}>Annuler</Button>
                  <Button onClick={handleSaveMatiere}>{editMatiereItem ? 'Enregistrer' : 'Ajouter'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ─── Utilisateurs ─── */}
          <TabsContent value="users" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button size="sm" className="gap-1" onClick={() => { setEditUser(null); setFormUser({ nom: '', email: '', role: ROLES[0] }); setOpenUser(true); }}><Plus className="h-4 w-4" />Ajouter un utilisateur</Button>
            </div>
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 border-b">
                  <tr>
                    <th className="p-3 text-left">Nom</th>
                    <th className="p-3 text-left">Email</th>
                    <th className="p-3 text-left">Rôle</th>
                    <th className="p-3 text-center">Statut</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b hover:bg-muted/20">
                      <td className="p-3 font-medium">{u.nom}</td>
                      <td className="p-3 text-muted-foreground text-xs">{u.email}</td>
                      <td className="p-3"><Badge variant="outline" className="text-[10px] capitalize">{u.role.replace('_', ' ')}</Badge></td>
                      <td className="p-3 text-center">
                        <button onClick={() => toggleUser(u.id)} className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${u.actif ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                          {u.actif ? 'Actif' : 'Inactif'}
                        </button>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditUser(u); setFormUser({ nom: u.nom, email: u.email, role: u.role }); setOpenUser(true); }}><Edit className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setUsers(p => p.filter(x => x.id !== u.id))}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ─── Historique des rendez-vous ─── */}
          <TabsContent value="historique_rdv" className="mt-4 space-y-4">
            {/* Compteurs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([
                { cle: 'total', libelle: 'Total', valeur: rdvStats.total, classe: 'text-foreground' },
                { cle: 'en_attente', libelle: 'En attente', valeur: rdvStats.en_attente, classe: 'text-gray-600' },
                { cle: 'traite', libelle: 'Traités', valeur: rdvStats.traite, classe: 'text-green-600' },
                { cle: 'annule', libelle: 'Annulés', valeur: rdvStats.annule, classe: 'text-muted-foreground' },
              ]).map((s) => (
                <div key={s.cle} className="rounded-lg border bg-card p-3">
                  <p className={`text-2xl font-bold tabular-nums ${s.classe}`}>{s.valeur}</p>
                  <p className="text-xs text-muted-foreground">{s.libelle}</p>
                </div>
              ))}
            </div>

            {/* Filtres */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Ticket, élève, parent, téléphone, matricule…"
                  value={rdvRecherche}
                  onChange={(e) => setRdvRecherche(e.target.value)}
                />
              </div>
              <Select value={rdvFiltreStatut} onValueChange={setRdvFiltreStatut}>
                <SelectTrigger className="sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les statuts</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="traite">Traités</SelectItem>
                  <SelectItem value="annule">Annulés</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={chargerHistoriqueRdv}
                disabled={rdvHistoriqueLoading}
              >
                <RefreshCw className={`h-4 w-4 ${rdvHistoriqueLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>

            {/* Tableau */}
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 border-b">
                  <tr>
                    <th className="p-3 text-left">Ticket</th>
                    <th className="p-3 text-left">Rendez-vous</th>
                    <th className="p-3 text-left">Élève</th>
                    <th className="p-3 text-left">Parent</th>
                    <th className="p-3 text-left">Démarche</th>
                    <th className="p-3 text-center">Statut</th>
                    <th className="p-3 text-left">Demandé le</th>
                  </tr>
                </thead>
                <tbody>
                  {rdvFiltres.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground text-sm">
                        {rdvHistoriqueLoading
                          ? 'Chargement…'
                          : rdvHistorique.length === 0
                            ? 'Aucun rendez-vous enregistré.'
                            : 'Aucun rendez-vous ne correspond à ces critères.'}
                      </td>
                    </tr>
                  ) : (
                    rdvAffiches.map((r: any) => (
                      <tr key={r.id} className="border-b hover:bg-muted/20 align-top">
                        <td className="p-3">
                          <span className="font-mono text-xs">{r.numero_ticket || '—'}</span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="font-medium">{formaterDateRdv(r.date_souhaitee)}</span>
                          {r.heure_souhaitee && (
                            <span className="text-muted-foreground text-xs tabular-nums"> · {r.heure_souhaitee}</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="font-medium">{r.nom_eleve || '—'}</span>
                          {r.matricule_national && (
                            <span className="block text-[10px] text-muted-foreground font-mono">
                              {r.matricule_national}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span>{r.nom}</span>
                          <span className="block text-[10px] text-muted-foreground">{r.telephone}</span>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px]">
                            {r.type_demarche === 'reinscription' ? 'Réinscription'
                              : r.type_demarche === 'inscription' ? 'Inscription' : '—'}
                          </Badge>
                          {r.niveau && (
                            <span className="block text-[10px] text-muted-foreground mt-0.5">{r.niveau}</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                            STATUTS_RDV[r.statut]?.classe || 'bg-muted text-muted-foreground'
                          }`}>
                            {STATUTS_RDV[r.statut]?.libelle || r.statut}
                          </span>
                          {r.eleve_id && (
                            <span className="block text-[9px] text-muted-foreground mt-1">Élève rattaché</span>
                          )}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formaterDateRdv(r.date_creation)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {rdvFiltres.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {(rdvPageCourante - 1) * RDV_PAR_PAGE + 1}–
                  {Math.min(rdvPageCourante * RDV_PAR_PAGE, rdvFiltres.length)} sur {rdvFiltres.length}
                  {rdvFiltres.length !== rdvHistorique.length && ` (${rdvHistorique.length} au total)`}
                  {' '}· du plus récent au plus ancien.
                </p>

                {rdvTotalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setRdvPage(rdvPageCourante - 1)}
                      disabled={rdvPageCourante <= 1}
                      aria-label="Page précédente"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {/* Fenêtre de 5 pages glissant autour de la page courante */}
                    {Array.from({ length: Math.min(5, rdvTotalPages) }, (_, i) => {
                      const debut = Math.max(1, Math.min(rdvPageCourante - 2, rdvTotalPages - 4));
                      return Math.max(1, debut) + i;
                    })
                      .filter((n) => n <= rdvTotalPages)
                      .map((n) => (
                        <Button
                          key={n}
                          variant={n === rdvPageCourante ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 min-w-8 px-2 tabular-nums"
                          onClick={() => setRdvPage(n)}
                        >
                          {n}
                        </Button>
                      ))}

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setRdvPage(rdvPageCourante + 1)}
                      disabled={rdvPageCourante >= rdvTotalPages}
                      aria-label="Page suivante"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ─── Apparence ─── */}
          <TabsContent value="apparence" className="mt-4 space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Informations générales</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><Label>Nom de l'établissement</Label><Input value={nomEtablissement} onChange={e => setNomEtablissement(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Devise</Label><Input value={devise} onChange={e => setDevise(e.target.value)} /></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Thème de l'interface</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => setTheme('light')} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all cursor-pointer ${theme === 'light' ? 'border-primary bg-primary/10 font-bold' : 'border-border hover:bg-muted/50'}`}>
                    <Sun className="h-4 w-4 text-gray-500" /><span className="text-sm">Clair</span>
                    {theme === 'light' && <Check className="h-3.5 w-3.5 text-primary ml-1" />}
                  </button>
                  <button type="button" onClick={() => setTheme('dark')} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all cursor-pointer ${theme === 'dark' ? 'border-primary bg-primary/10 font-bold' : 'border-border hover:bg-muted/50'}`}>
                    <Moon className="h-4 w-4 text-gray-400" /><span className="text-sm">Sombre</span>
                    {theme === 'dark' && <Check className="h-3.5 w-3.5 text-primary ml-1" />}
                  </button>
                  <button type="button" onClick={() => setTheme('system')} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all cursor-pointer ${theme === 'system' ? 'border-primary bg-primary/10 font-bold' : 'border-border hover:bg-muted/50'}`}>
                    <Laptop className="h-4 w-4 text-muted-foreground" /><span className="text-sm">Système</span>
                    {theme === 'system' && <Check className="h-3.5 w-3.5 text-primary ml-1" />}
                  </button>
                </div>
                <div>
                  <Label className="mb-2 block">Couleur primaire</Label>
                  <div className="flex gap-2 flex-wrap">
                    {COULEURS_THEME.map(c => (
                      <button key={c} onClick={() => setCouleurPrimaire(c)} className={`h-8 w-8 rounded-full border-2 transition-all ${couleurPrimaire === c ? 'border-foreground scale-110' : 'border-transparent'}`} style={{ background: c }} />
                    ))}
                  </div>
                </div>
                <Button onClick={() => toast({ title: 'Apparence sauvegardée' })}>Appliquer</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Paramètres de Scolarité & Frais ─── */}
          <TabsContent value="scolarite_frais" className="mt-4 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:from-slate-900 dark:p-5 rounded-lg border border-blue-100 dark:border-blue-900 shadow-sm">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" /> Grille Tarifaire & Paramétrage des Frais
                </h3>
                <p className="text-xs text-slate-500">
                  Saisissez et personnalisez librement les montants de la scolarité, inscription, cantine, transport, examens et autres types de paiement.
                </p>
              </div>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shadow-sm"
                onClick={() => {
                  setEditFee(null);
                  setFormFee({ label: '', category: 'autre', amount: '', description: '', cycleOrLevel: '', period: 'unique' });
                  setOpenFeeModal(true);
                }}
              >
                <Plus className="h-4 w-4" /> Ajouter un nouveau type de frais
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { cat: 'scolarite', label: 'Scolarités & Inscriptions', bg: 'border-blue-200 dark:border-blue-900' },
                { cat: 'examen', label: 'Frais d\'Examens Officiels', bg: 'border-purple-200 dark:border-purple-900' },
                { cat: 'cantine', label: 'Services Cantine', bg: 'border-gray-200 dark:border-gray-900' },
                { cat: 'transport', label: 'Services Transport / Car', bg: 'border-blue-200 dark:border-blue-900' },
                { cat: 'autre', label: 'Autres Frais (Tenues, Carnets, Badges...)', bg: 'border-slate-200 dark:border-slate-800' },
              ].map(group => {
                const groupFees = fees.filter(f => f.category === group.cat || (group.cat === 'scolarite' && f.category === 'inscription'));
                if (group.cat === 'autre') {
                  const remainingFees = fees.filter(f => f.category === 'autre');
                  return (
                    <Card key={group.cat} className={`md:col-span-2 ${group.bg}`}>
                      <CardHeader className="pb-3 pt-4 px-4 border-b">
                        <CardTitle className="text-sm font-bold flex items-center justify-between">
                          <span>{group.label}</span>
                          <Badge variant="outline">{remainingFees.length} frais configurés</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-2">
                        {remainingFees.length === 0 ? (
                          <p className="text-xs text-muted-foreground p-2">Aucun frais personnalisé défini.</p>
                        ) : (
                          remainingFees.map(f => (
                            <div key={f.id} className="flex items-center justify-between bg-card border rounded-lg p-3 hover:border-blue-200 transition-all">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm">{f.label}</span>
                                  {!f.active && <Badge variant="secondary" className="text-[10px]">Inactif</Badge>}
                                </div>
                                {f.description && <p className="text-xs text-muted-foreground">{f.description}</p>}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-blue-600 dark:text-blue-400">{f.amount.toLocaleString('fr-FR')} F CFA</span>
                                <div className="flex items-center gap-1">
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditFee(f); setFormFee({ label: f.label, category: f.category, amount: String(f.amount), description: f.description || '', cycleOrLevel: f.cycleOrLevel || '', period: f.period || 'unique' }); setOpenFeeModal(true); }}>
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteFee(f.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  );
                }

                return (
                  <Card key={group.cat} className={group.bg}>
                    <CardHeader className="pb-3 pt-4 px-4 border-b">
                      <CardTitle className="text-sm font-bold flex items-center justify-between">
                        <span>{group.label}</span>
                        <Badge variant="outline">{groupFees.length} tarifs</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2">
                      {groupFees.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-2">Aucun tarif défini.</p>
                      ) : (
                        groupFees.map(f => (
                          <div key={f.id} className="flex items-center justify-between bg-card border rounded-lg p-3 hover:border-blue-200 transition-all">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">{f.label}</span>
                                {!f.active && <Badge variant="secondary" className="text-[10px]">Inactif</Badge>}
                              </div>
                              {f.description && <p className="text-xs text-muted-foreground">{f.description}</p>}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-blue-600 dark:text-blue-400">{f.amount.toLocaleString('fr-FR')} F CFA</span>
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditFee(f); setFormFee({ label: f.label, category: f.category, amount: String(f.amount), description: f.description || '', cycleOrLevel: f.cycleOrLevel || '', period: f.period || 'unique' }); setOpenFeeModal(true); }}>
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteFee(f.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialog Année */}
        <Dialog open={openAnnee} onOpenChange={setOpenAnnee}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Ajouter une année scolaire</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Libellé (ex : 2026-2027)</Label>
                <Input
                  placeholder="2026-2027"
                  value={formAnnee.label}
                  onChange={e => setFormAnnee(p => ({ ...p, label: e.target.value }))}
                  disabled={anneeSaving}
                />
                <p className="text-[11px] text-muted-foreground">
                  Deux années consécutives séparées par un tiret.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Début</Label><Input type="date" value={formAnnee.debut} onChange={e => setFormAnnee(p => ({ ...p, debut: e.target.value }))} disabled={anneeSaving} /></div>
                <div className="space-y-1"><Label>Fin</Label><Input type="date" value={formAnnee.fin} onChange={e => setFormAnnee(p => ({ ...p, fin: e.target.value }))} disabled={anneeSaving} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenAnnee(false)} disabled={anneeSaving}>Annuler</Button>
              <Button onClick={addAnnee} disabled={anneeSaving}>{anneeSaving ? 'Enregistrement…' : 'Ajouter'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Niveau */}
        <Dialog open={openNiveau} onOpenChange={setOpenNiveau}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>{editNiveau ? 'Modifier le niveau' : 'Ajouter un niveau'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Nom *</Label><Input value={formNiveau.nom} onChange={e => setFormNiveau(p => ({ ...p, nom: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Cycle</Label>
                  <Select value={formNiveau.cycle} onValueChange={v => setFormNiveau(p => ({ ...p, cycle: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CYCLES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-1"><Label>Ordre</Label><Input type="number" min={1} value={formNiveau.ordre} onChange={e => setFormNiveau(p => ({ ...p, ordre: e.target.value }))} /></div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpenNiveau(false)}>Annuler</Button><Button onClick={saveNiveau}>{editNiveau ? 'Enregistrer' : 'Ajouter'}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Utilisateur */}
        <Dialog open={openUser} onOpenChange={setOpenUser}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>{editUser ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Nom complet *</Label><Input value={formUser.nom} onChange={e => setFormUser(p => ({ ...p, nom: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Email *</Label><Input type="email" value={formUser.email} onChange={e => setFormUser(p => ({ ...p, email: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Rôle</Label>
                <Select value={formUser.role} onValueChange={v => setFormUser(p => ({ ...p, role: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r.replace('_', ' ')}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpenUser(false)}>Annuler</Button><Button onClick={saveUser}>{editUser ? 'Enregistrer' : 'Ajouter'}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Frais Divers, Tenues & Achats */}
        <Dialog open={openFraisDiversModal} onOpenChange={setOpenFraisDiversModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editFraisDivers ? 'Modifier l\'article / frais' : 'Ajouter un nouvel article / frais'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Définissez les tarifs pour les tenues, achats divers ou cours optionnels. Ces montants sont appliqués et ajoutés au total sur le reçu de caisse.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Catégorie *</Label>
                <Select
                  value={formFraisDivers.categorie || 'tenue'}
                  onValueChange={(v) => {
                    const cat = v as FraisDiversItem['categorie'];
                    let defaultCode = 'autre';
                    let defaultPeriodicite: FraisDiversItem['periodicite'] = 'unique';
                    if (cat === 'tenue') {
                      defaultCode = 'tenue';
                      defaultPeriodicite = 'unique';
                    } else if (cat === 'achat_divers') {
                      defaultCode = 'achat_divers';
                      defaultPeriodicite = 'unique';
                    } else if (cat === 'cours') {
                      defaultCode = 'cours_anglais';
                      defaultPeriodicite = 'mensuel';
                    } else if (cat === 'activite') {
                      defaultCode = 'activite_periscolaire';
                      defaultPeriodicite = 'unique';
                    }
                    setFormFraisDivers((p) => ({
                      ...p,
                      categorie: cat,
                      code: defaultCode,
                      periodicite: defaultPeriodicite,
                    }));
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenue">👍• Tenue & Uniforme Scolaire</SelectItem>
                    <SelectItem value="achat_divers">📍¦ Achats Divers & Fournitures</SelectItem>
                    <SelectItem value="cours">📍š Cours d'Anglais / Informatique / Soutien</SelectItem>
                    <SelectItem value="activite">âš½ Activité Périscolaire & Sport</SelectItem>
                    <SelectItem value="autre">âœ¨ Autre Prestation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formFraisDivers.categorie === 'tenue' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Niveau / Cycle *</Label>
                    <Select
                      value={formFraisDivers.cycle || 'Collège'}
                      onValueChange={(v) => {
                        setFormFraisDivers((p) => ({
                          ...p,
                          cycle: v,
                        }));
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Collège">🏫 Collège (6e-3e)</SelectItem>
                        <SelectItem value="Collège 2nd cycle">🏫 Lycée (2nde-Tle)</SelectItem>
                        <SelectItem value="Primaire">🏫 Primaire (CP-CM2)</SelectItem>
                        <SelectItem value="Maternelle">🏫 Maternelle</SelectItem>
                        <SelectItem value="tous">🏫 Tous les cycles</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Genre de l'élève *</Label>
                    <Select
                      value={formFraisDivers.genre || 'M'}
                      onValueChange={(v) => {
                        const g = v as FraisDiversItem['genre'];
                        setFormFraisDivers((p) => ({
                          ...p,
                          genre: g,
                        }));
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">👍¦ Genre M (Garçon)</SelectItem>
                        <SelectItem value="S">👍§ Genre S (Fille)</SelectItem>
                        <SelectItem value="tous">👥 Mixte / Tous</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Libellé complet de l'article / prestation *</Label>
                <Input
                  placeholder="Ex: Tenue Scolaire Complète, Cahiers de devoirs, Cours d'Anglais..."
                  value={formFraisDivers.libelle}
                  onChange={(e) => setFormFraisDivers((p) => ({ ...p, libelle: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Montant (F CFA) *</Label>
                  <Input
                    type="number"
                    min={0}
                    step={500}
                    placeholder="Ex: 15000"
                    value={formFraisDivers.montant}
                    onChange={(e) => setFormFraisDivers((p) => ({ ...p, montant: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Périodicité</Label>
                  <Select
                    value={formFraisDivers.periodicite}
                    onValueChange={(v) => setFormFraisDivers((p) => ({ ...p, periodicite: v as any }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unique">Paiement unique (Achat)</SelectItem>
                      <SelectItem value="mensuel">Mensuel</SelectItem>
                      <SelectItem value="trimestriel">Trimestriel</SelectItem>
                      <SelectItem value="annuel">Annuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Description / Remarques (Facultatif)</Label>
                <Input
                  placeholder="Ex: Polo + bas, ou 2 heures par semaine..."
                  value={formFraisDivers.description}
                  onChange={(e) => setFormFraisDivers((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenFraisDiversModal(false)}>Annuler</Button>
              <Button onClick={handleSaveFraisDivers} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                {editFraisDivers ? 'Enregistrer les modifications' : 'Ajouter l\'article'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Paramètre de Frais */}
        <Dialog open={openFeeModal} onOpenChange={setOpenFeeModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editFee ? 'Modifier le tarif du frais' : 'Ajouter un nouveau type de frais'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Libellé du frais *</Label>
                <Input placeholder="Ex: Kit Scolaire, Frais examen..." value={formFee.label} onChange={e => setFormFee(p => ({ ...p, label: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Catégorie</Label>
                  <Select value={formFee.category} onValueChange={v => setFormFee(p => ({ ...p, category: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scolarite">Scolarité</SelectItem>
                      <SelectItem value="inscription">Inscription</SelectItem>
                      <SelectItem value="examen">Frais d'Examen</SelectItem>
                      <SelectItem value="cantine">Cantine</SelectItem>
                      <SelectItem value="transport">Transport / Car</SelectItem>
                      <SelectItem value="autre">Autre type de paiement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Montant (F CFA) *</Label>
                  <Input type="number" min={0} placeholder="Ex: 15000" value={formFee.amount} onChange={e => setFormFee(p => ({ ...p, amount: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Description / Précision (Facultatif)</Label>
                <Input placeholder="Remarques ou conditions..." value={formFee.description} onChange={e => setFormFee(p => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenFeeModal(false)}>Annuler</Button>
              <Button onClick={handleSaveFee} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                {editFee ? 'Enregistrer les modifications' : 'Ajouter le frais'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </Layout>
  );
}



