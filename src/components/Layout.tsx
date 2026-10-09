import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  ChevronDown,
  Search,
  Bell,
  User,
  LayoutDashboard,
  School,
  Users,
  BookOpen,
  Moon,
  Calendar,
  DollarSign,
  Briefcase,
  Settings,
  MessageSquare,
  BarChart3,
  Shield,
  HeartHandshake,
  GraduationCap,
  UserCog,
  Home,
  FileText,
  ClipboardList,
  Tag,
  AlertTriangle,
  ClipboardCheck,
  Bus,
  Building2,
  Upload,
  Heart,
  HeartPulse,
  Landmark,
  Ticket,
  ShieldAlert,
  Boxes,
  Library,
  Car,
  Star,
  Award,
  ShieldCheck,
  QrCode,
  Percent,
  TrendingUp,
  ArrowLeftRight,
  Shuffle,
  UserMinus,
} from 'lucide-react';
import { ROUTE_PATHS, type UserRole } from '@/lib/index';
import { IMAGES } from '@/assets/images';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfileModal } from '@/components/ProfileModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { isUserFromAbidjan } from '@/lib/utils';
import { AppLogoLoader } from '@/components/AppLogoLoader';

interface LayoutProps {
  children: React.ReactNode;
  loading?: boolean;
  loadingMessage?: string;
  loadingSubmessage?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}

const navigationSections: NavSection[] = [
  {
    title: "Vue d'ensemble",
    items: [
      {
        label: 'Tableau de bord',
        path: ROUTE_PATHS.DASHBOARD,
        icon: LayoutDashboard,
        roles: ['direction_fondation', 'directeur_ecole', 'enseignant', 'educateur', 'comptable', 'rh', 'admin'],
      },
      {
        label: 'Espace Superviseur',
        path: '/superviseur',
        icon: ShieldCheck,
        roles: ['directeur_etudes', 'directeur_etude', 'de', 'directeur', 'directeur_ecole', 'superviseur', 'admin', 'superuser', 'direction_fondation'],
      },
    ],
  },
  {
    title: 'Gestion scolaire',
    items: [
      {
        label: 'Nos Écoles',
        path: ROUTE_PATHS.SCHOOLS,
        icon: School,
        roles: ['direction_fondation', 'directeur_ecole', 'admin'],
      },
      {
        label: 'Profil de l\'établissement',
        path: ROUTE_PATHS.SCHOOL_PROFILE,
        icon: Building2,
        roles: ['direction_fondation', 'directeur_ecole', 'admin'],
      },
      {
        label: 'Élèves & Familles',
        path: ROUTE_PATHS.STUDENTS,
        icon: Users,
        roles: ['direction_fondation', 'directeur_ecole', 'enseignant', 'educateur', 'comptable', 'caisse', 'admin'],
      },
      {
        label: 'Listes de classe',
        path: ROUTE_PATHS.CLASS_LISTS,
        icon: ClipboardList,
        roles: ['direction_fondation', 'directeur_ecole', 'enseignant', 'educateur', 'comptable', 'caisse', 'admin'],
      },
      {
        label: 'Transfert de classes',
        path: ROUTE_PATHS.STUDENT_TRANSFER,
        icon: ArrowLeftRight,
        roles: ['direction_fondation', 'directeur_ecole', 'directeur_etudes', 'de', 'educateur', 'admin', 'secretaire_direction'],
      },
      {
        label: 'Transfert de notes (Bouaké/Daloa)',
        path: ROUTE_PATHS.TRANSFERT_NOTES,
        icon: ArrowLeftRight,
        roles: ['direction_fondation', 'directeur_ecole', 'directeur_etudes', 'de', 'educateur', 'admin', 'secretaire_direction', 'enseignant'],
      },
      {
        label: 'Changement de série',
        path: ROUTE_PATHS.STUDENT_SERIE_TRANSFER,
        icon: Shuffle,
        roles: ['direction_fondation', 'directeur_ecole', 'directeur_etudes', 'de', 'educateur', 'admin', 'secretaire_direction'],
      },
      {
        label: "Retrait d'élèves",
        path: ROUTE_PATHS.STUDENT_WITHDRAWAL,
        icon: UserMinus,
        roles: ['direction_fondation', 'directeur_ecole', 'directeur_etudes', 'de', 'educateur', 'admin', 'secretaire_direction'],
      },
      {
        label: 'Processus d’inscription',
        path: ROUTE_PATHS.INSCRIPTION_PROCESS,
        icon: ClipboardCheck,
        roles: ['direction_fondation', 'directeur_ecole', 'comptable', 'scolarite', 'caisse', 'accueil', 'educateur', 'admin', 'secretaire_direction'],
      },
      {
        label: 'Billets d’accès',
        path: ROUTE_PATHS.BILLETS_ENTREE,
        icon: Ticket,
        roles: ['direction_fondation', 'directeur_ecole', 'comptable', 'scolarite', 'caisse', 'accueil', 'educateur', 'admin', 'secretaire_direction', 'agent', 'economat', 'intendant', 'rh'],
      },
      {
        label: 'Pédagogie & Notes',
        path: ROUTE_PATHS.GRADES,
        icon: BookOpen,
        roles: ['direction_fondation', 'directeur_ecole', 'enseignant', 'educateur', 'admin'],
      },
      {
        label: 'Pédagogie Avancée',
        path: ROUTE_PATHS.PEDAGOGIE_ADVANCED,
        icon: GraduationCap,
        roles: ['direction_fondation', 'directeur_ecole', 'enseignant', 'educateur', 'admin', 'secretaire_direction'],
      },
      {
        label: 'Bulletins scolaires',
        path: ROUTE_PATHS.BULLETINS_SPACE,
        icon: GraduationCap,
        roles: ['direction_fondation', 'directeur_ecole', 'enseignant', 'admin'],
      },
      {
        label: 'Examens & Compositions',
        path: ROUTE_PATHS.EXAMENS_SPACE,
        icon: BookOpen,
        roles: ['direction_fondation', 'directeur_ecole', 'enseignant', 'admin'],
      },
      {
        label: 'Salles & Emploi du temps',
        path: ROUTE_PATHS.SALLES_SPACE,
        icon: School,
        roles: ['direction_fondation', 'directeur_ecole', 'admin', 'enseignant'],
      },
      {
        label: 'Import de données',
        path: ROUTE_PATHS.IMPORT_DATA,
        icon: Upload,
        roles: ['direction_fondation', 'directeur_ecole', 'admin'],
      },
    ],
  },
  {
    title: 'Éducation islamique',
    items: [
      {
        label: 'Confessionnel (Vue Globale)',
        path: ROUTE_PATHS.CONFESSIONAL,
        icon: Moon,
        roles: ['direction_fondation', 'directeur_ecole', 'enseignant', 'admin', 'aumonier', 'educateur'],
      },
      {
        label: 'Mémorisation du Coran (Hifz)',
        path: `${ROUTE_PATHS.CONFESSIONAL}?tab=suivi`,
        icon: BookOpen,
        roles: ['direction_fondation', 'directeur_ecole', 'enseignant', 'admin', 'aumonier', 'educateur'],
      },
      {
        label: 'Matières & Éducation Islamique',
        path: `${ROUTE_PATHS.CONFESSIONAL}?tab=education`,
        icon: Star,
        roles: ['direction_fondation', 'directeur_ecole', 'enseignant', 'admin', 'aumonier', 'educateur'],
      },
      {
        label: 'Prières & Assiduité (Salat)',
        path: `${ROUTE_PATHS.CONFESSIONAL}?tab=prieres`,
        icon: Award,
        roles: ['direction_fondation', 'directeur_ecole', 'enseignant', 'admin', 'aumonier', 'educateur'],
      },
      {
        label: 'Activités & Célébrations Religieuses',
        path: `${ROUTE_PATHS.CONFESSIONAL}?tab=activites`,
        icon: Calendar,
        roles: ['direction_fondation', 'directeur_ecole', 'enseignant', 'admin', 'aumonier', 'educateur'],
      },
      {
        label: 'Statistiques & Progression Spirituelle',
        path: `${ROUTE_PATHS.CONFESSIONAL}?tab=statistiques`,
        icon: BarChart3,
        roles: ['direction_fondation', 'directeur_ecole', 'enseignant', 'admin', 'aumonier', 'educateur'],
      },
    ],
  },
  {
    title: 'Opérations',
    items: [
      {
        label: 'Vie scolaire',
        path: ROUTE_PATHS.ATTENDANCE,
        icon: Calendar,
        roles: ['direction_fondation', 'directeur_ecole', 'enseignant', 'educateur', 'comptable', 'scolarite', 'caisse', 'admin'],
      },
      {
        label: 'Présences avancées',
        path: ROUTE_PATHS.PRESENCES_SPACE,
        icon: ClipboardList,
        roles: ['direction_fondation', 'directeur_ecole', 'enseignant', 'admin'],
      },
      {
        label: 'Scolarité',
        path: ROUTE_PATHS.SCOLARITE_SPACE,
        icon: BookOpen,
        roles: ['scolarite', 'caisse', 'comptable', 'educateur', 'direction_fondation', 'directeur_ecole', 'admin'],
      },
      {
        label: 'Contrôle Médical',
        path: ROUTE_PATHS.CONTROLE_MEDICAL,
        icon: HeartPulse,
        roles: ['scolarite', 'caisse', 'comptable', 'direction_fondation', 'directeur_ecole', 'admin', 'accueil', 'educateur'],
      },
      {
        label: 'Guichet Caisse',
        path: ROUTE_PATHS.CAISSE_SPACE,
        icon: DollarSign,
        roles: ['scolarite', 'caisse', 'comptable', 'educateur', 'direction_fondation', 'directeur_ecole', 'admin', 'accueil'],
      },
      {
        label: 'Échéancier',
        path: ROUTE_PATHS.ECHEANCIER_SPACE,
        icon: Calendar,
        roles: ['caisse', 'comptable', 'educateur', 'direction_fondation', 'directeur_ecole', 'admin'],
      },
      {
        label: 'Gestion des Impayés',
        path: ROUTE_PATHS.IMPAYES_SPACE,
        icon: ShieldAlert,
        roles: ['direction_fondation', 'directeur_ecole', 'comptable', 'caisse', 'accueil', 'educateur', 'admin', 'secretaire_direction', 'agent', 'economat', 'intendant', 'rh'],
      },
      {
        label: 'Module Recouvrement',
        path: ROUTE_PATHS.RECOUVREMENT,
        icon: TrendingUp,
        roles: ['direction_fondation', 'directeur_ecole', 'comptable', 'caisse', 'scolarite', 'accueil', 'educateur', 'admin', 'secretaire_direction', 'agent'],
      },
      {
        label: 'Paiements Via Bank',
        path: ROUTE_PATHS.BANK_PAYMENTS,
        icon: Landmark,
        roles: ['caisse', 'comptable', 'educateur', 'direction_fondation', 'directeur_ecole', 'admin'],
      },
      {
        label: 'Comptabilité',
        path: ROUTE_PATHS.COMPTABILITE_SPACE,
        icon: DollarSign,
        roles: ['comptable', 'caisse', 'educateur', 'direction_fondation', 'directeur_ecole', 'admin'],
      },
      {
        label: 'Modules Comptabilité',
        path: ROUTE_PATHS.COMPTABILITE_MODULES,
        icon: BarChart3,
        roles: ['comptable', 'caisse', 'educateur', 'direction_fondation', 'directeur_ecole', 'admin'],
      },
      {
        label: 'Finances',
        path: ROUTE_PATHS.FINANCE,
        icon: DollarSign,
        roles: ['comptable', 'caisse', 'educateur', 'direction_fondation', 'directeur_ecole', 'admin'],
      },
      {
        label: 'Économat & Stocks',
        path: ROUTE_PATHS.ECONOMAT_SPACE,
        icon: Boxes,
        roles: ['direction_fondation', 'directeur_ecole', 'comptable', 'scolarite', 'caisse', 'accueil', 'educateur', 'admin', 'secretaire_direction', 'agent', 'economat', 'intendant', 'rh'],
      },
      {
        label: 'Bibliothèque',
        path: ROUTE_PATHS.BIBLIOTHEQUE_SPACE,
        icon: Library,
        roles: ['direction_fondation', 'directeur_ecole', 'enseignant', 'educateur', 'comptable', 'caisse', 'accueil', 'admin', 'secretaire_direction', 'agent'],
      },
      {
        label: 'Parc Auto Agents',
        path: ROUTE_PATHS.PARC_AUTO_SPACE,
        icon: Car,
        roles: ['direction_fondation', 'directeur_ecole', 'rh', 'educateur', 'admin', 'secretaire_direction', 'agent'],
      },
      {
        label: 'Ressources Humaines',
        path: ROUTE_PATHS.HR,
        icon: Briefcase,
        roles: ['direction_fondation', 'directeur_ecole', 'rh', 'educateur', 'admin', 'secretaire_direction'],
      },
      {
        label: 'RH & Paie',
        path: ROUTE_PATHS.RH_SPACE,
        icon: UserCog,
        roles: ['direction_fondation', 'directeur_ecole', 'admin'],
      },
    ],
  },
  {
    title: 'CRM & Relations',
    items: [
      {
        label: 'CRM — Relations',
        path: ROUTE_PATHS.CRM,
        icon: HeartHandshake,
        roles: ['direction_fondation', 'admin'],
      },
      {
        label: 'Communication',
        path: ROUTE_PATHS.COMMUNICATION,
        icon: MessageSquare,
        roles: ['direction_fondation', 'directeur_ecole', 'enseignant', 'parent', 'eleve', 'admin'],
      },
      {
        label: 'Messagerie',
        path: ROUTE_PATHS.MESSAGERIE_SPACE,
        icon: MessageSquare,
        roles: ['direction_fondation', 'directeur_ecole', 'enseignant', 'comptable', 'admin', 'accueil', 'educateur'],
      },
      {
        label: 'Notifications',
        path: ROUTE_PATHS.NOTIFICATIONS_SPACE,
        icon: Bell,
        roles: ['direction_fondation', 'directeur_ecole', 'enseignant', 'comptable', 'admin', 'accueil', 'educateur'],
      },
      {
        label: 'Reporting & BI',
        path: ROUTE_PATHS.REPORTS,
        icon: BarChart3,
        roles: ['direction_fondation', 'directeur_ecole', 'admin'],
      },
      {
        label: 'Statistiques & Rapports',
        path: ROUTE_PATHS.RAPPORTS_SPACE,
        icon: BarChart3,
        roles: ['direction_fondation', 'directeur_ecole', 'admin'],
      },
      {
        label: 'Rapport de rentrée',
        path: ROUTE_PATHS.RAPPORT_RENTREE,
        icon: FileText,
        roles: ['direction_fondation', 'directeur_ecole', 'admin'],
      },
      {
        label: 'Rapport trimestriel',
        path: ROUTE_PATHS.RAPPORT_TRIMESTRIEL,
        icon: FileText,
        roles: ['direction_fondation', 'directeur_ecole', 'admin'],
      },
    ],
  },
  {
    title: 'Espaces dédiés',
    items: [
      {
        label: 'Espace Parents',
        path: '/parent-space',
        icon: Home,
        roles: ['parent', 'eleve', 'direction_fondation', 'admin'],
      },
      {
        label: 'Portail Famille',
        path: ROUTE_PATHS.PORTAIL_FAMILLE,
        icon: Heart,
        roles: ['direction_fondation', 'directeur_ecole', 'comptable', 'admin', 'accueil', 'educateur'],
      },
      {
        label: 'Espace Enseignant',
        path: ROUTE_PATHS.TEACHER_SPACE,
        icon: GraduationCap,
        roles: ['enseignant', 'direction_fondation', 'admin'],
      },
      {
        label: 'Espace Professeur (Secondaire)',
        path: ROUTE_PATHS.PROFESSEUR_SPACE,
        icon: GraduationCap,
        roles: ['enseignant', 'direction_fondation', 'admin'],
      },
      {
        label: 'Espace Instituteur (Primaire)',
        path: ROUTE_PATHS.INSTITUTEUR_SPACE,
        icon: GraduationCap,
        roles: ['enseignant', 'direction_fondation', 'admin'],
      },
      {
        label: 'Espace Éducateur',
        path: ROUTE_PATHS.EDUCATOR_SPACE,
        icon: GraduationCap,
        roles: ['educateur', 'superviseur', 'directeur_ecole', 'directeur_etudes', 'directeur', 'de', 'direction_fondation', 'admin'],
      },
      {
        label: 'Espace Administratifs',
        path: ROUTE_PATHS.ADMIN_STAFF_SPACE,
        icon: UserCog,
        roles: ['directeur_ecole', 'rh', 'comptable', 'educateur', 'direction_fondation', 'admin'],
      },
      {
        label: 'Espace Accueil',
        path: ROUTE_PATHS.ACCUEIL_SPACE,
        icon: Home,
        roles: ['accueil', 'scolarite', 'comptable', 'direction_fondation', 'directeur_ecole', 'educateur', 'admin'],
      },
      {
        label: 'Espace Agent',
        path: ROUTE_PATHS.AGENT_SPACE,
        icon: AlertTriangle,
        roles: ['agent', 'direction_fondation', 'directeur_ecole', 'admin'],
      },
      {
        label: 'Transport & Cantine',
        path: ROUTE_PATHS.TRANSPORT_SPACE,
        icon: Bus,
        roles: ['educateur', 'comptable', 'caisse', 'scolarite', 'agent', 'direction_fondation', 'directeur_ecole', 'admin'],
      },
      {
        label: 'Dossier Élève',
        path: ROUTE_PATHS.DOSSIER_ELEVE,
        icon: FileText,
        roles: ['directeur_ecole', 'educateur', 'admin', 'comptable', 'scolarite'],
      },
      {
        label: 'Demandes RH',
        path: ROUTE_PATHS.RH_DEMANDES,
        icon: UserCog,
        roles: ['educateur', 'directeur_ecole', 'rh', 'admin'],
      },
      {
        label: 'Badges QR',
        path: ROUTE_PATHS.BADGES_QR,
        icon: QrCode,
        roles: ['directeur_ecole', 'educateur', 'admin', 'scolarite'],
      },
      {
        label: 'Gestion Réductions',
        path: ROUTE_PATHS.REDUCTIONS,
        icon: Percent,
        roles: ['directeur_ecole', 'comptable', 'admin', 'scolarite'],
      },
    ],
  },
  {
    title: 'Système',
    items: [
      {
        label: 'Administration',
        path: ROUTE_PATHS.ADMINISTRATION,
        icon: Shield,
        roles: ['admin', 'direction_fondation', 'directeur_ecole', 'directeur_etudes', 'directeur'],
      },
      {
        label: 'Réductions',
        path: ROUTE_PATHS.REDUCTIONS,
        icon: Tag,
        roles: ['direction_fondation', 'directeur_ecole', 'directeur_etudes', 'directeur', 'comptable', 'admin'],
      },
      {
        label: 'Paramètres',
        path: ROUTE_PATHS.PARAMETRES_SPACE,
        icon: Settings,
        roles: ['direction_fondation', 'directeur_ecole', 'directeur_etudes', 'directeur', 'admin'],
      },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  direction_fondation: 'Direction Fondation',
  directeur_ecole: "Directeur d'École",
  directeur_etudes: "Directeur des Études",
  directeur: "Directeur",
  enseignant: 'Enseignant',
  instituteur: 'Instituteur (Primaire)',
  educateur: 'Éducateur',
  parent: 'Parent',
  eleve: 'Élève',
  comptable: 'Comptable',
  caisse: 'Agent de Caisse / Caissier',
  rh: 'Ressources Humaines',
  admin: 'Administrateur Système',
  superuser: 'Super Utilisateur',
  accueil: 'Agent d’Accueil',
  agent: 'Agent de Sécurité',
  scolarite: 'Service Scolarité',
  secretaire: 'Secrétaire',
  secretaire_direction: 'Secrétariat de Direction',
  aumonier: 'Aumônier / Guide Spirituel',
  informaticien: 'Informaticien / Service IT',
};


export function Layout({
  children,
  loading = false,
  loadingMessage,
  loadingSubmessage,
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const location = useLocation();

  const userRole = localStorage.getItem('user_role') || 'direction_fondation';
  const username = localStorage.getItem('username') || 'Direction';
  const storedAvatar = localStorage.getItem('user_photo') || localStorage.getItem('user_avatar') || '';
  const [activeUsername, setActiveUsername] = useState(username);
  const [activeAvatar, setActiveAvatar] = useState(storedAvatar);
  const ecoleCode = localStorage.getItem('user_ecole_code') || '';
  const ville = localStorage.getItem('user_ville') || '';

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const newOpen: Record<string, boolean> = { ...openSections };
    navigationSections.forEach((section) => {
      const isCurrent = section.items.some((item) => item.path === location.pathname);
      if (isCurrent || newOpen[section.title] === undefined) {
        newOpen[section.title] = isCurrent || section.title === "Vue d'ensemble" || section.title === "Gestion scolaire";
      }
    });
    setOpenSections(newOpen);
  }, [location.pathname]);

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('username');
    localStorage.removeItem('user_ecole_id');
    localStorage.removeItem('user_ecole_code');
    localStorage.removeItem('user_ville');
    window.location.href = '/';
  };

  const isExcludedForSecretaire = (path: string) => {
    const p = path.toLowerCase();
    return (
      p.includes('/administration') ||
      p.includes('/school-profile') ||
      p.includes('/schools') ||
      p.includes('/import-data') ||
      p.includes('/parametres') ||
      p.includes('/settings')
    );
  };

  const isAllowedForEnseignant = (path: string) => {
    const p = path.toLowerCase();
    return (
      p.startsWith(ROUTE_PATHS.ATTENDANCE.toLowerCase()) ||
      p.startsWith(ROUTE_PATHS.TEACHER_SPACE.toLowerCase()) ||
      p.startsWith(ROUTE_PATHS.PROFESSEUR_SPACE.toLowerCase()) ||
      p.startsWith(ROUTE_PATHS.INSTITUTEUR_SPACE.toLowerCase())
    );
  };

  const isAllowedForEducateur = (path: string) => {
    const p = path.toLowerCase();
    return (
      p.startsWith(ROUTE_PATHS.CLASS_LISTS.toLowerCase()) ||
      p.startsWith(ROUTE_PATHS.BILLETS_ENTREE.toLowerCase()) ||
      p.startsWith(ROUTE_PATHS.EDUCATOR_SPACE.toLowerCase()) ||
      p.startsWith(ROUTE_PATHS.GRADES.toLowerCase()) ||
      p.startsWith(ROUTE_PATHS.PEDAGOGIE_ADVANCED.toLowerCase()) ||
      p.startsWith(ROUTE_PATHS.BULLETINS_SPACE.toLowerCase()) ||
      p.startsWith(ROUTE_PATHS.ACCUEIL_SPACE.toLowerCase()) ||
      p.startsWith(ROUTE_PATHS.INSCRIPTION_PROCESS.toLowerCase())
    );
  };

  const filteredSections = navigationSections
    .map((section) => {
      const filteredItems = section.items.filter((item) => {
        if (item.path === '/superviseur') {
          if (isUserFromAbidjan(userRole, ville)) {
            return true;
          }
          return (
            userRole === 'directeur_etudes' ||
            userRole === 'directeur_etude' ||
            userRole === 'de' ||
            userRole === 'directeur' ||
            userRole === 'directeur_ecole' ||
            userRole === 'superviseur' ||
            userRole === 'superuser' ||
            userRole === 'admin' ||
            userRole === 'direction_fondation'
          );
        }
        if (userRole === 'superuser' || userRole === 'admin') return true;
        if (userRole === 'enseignant' || userRole === 'instituteur') {
          return isAllowedForEnseignant(item.path);
        }
        if (userRole === 'educateur') {
          return isAllowedForEducateur(item.path);
        }
        if (userRole === 'secretaire' || userRole === 'secretaire_direction') {
          return !isExcludedForSecretaire(item.path);
        }
        if (!item.roles) return true;
        if (item.roles.includes(userRole as UserRole)) return true;
        // Correspondance souple pour les rôles de direction et directeurs des études
        if (
          (userRole === 'directeur_etudes' || userRole === 'directeur' || userRole === 'directeur_ecole' || userRole === 'de') &&
          item.roles.some(r => r === 'directeur_ecole' || r === 'directeur_etudes' || r === 'directeur' || r === 'direction_fondation')
        ) {
          return true;
        }
        return false;
      });
      return {
        ...section,
        items: filteredItems,
      };
    })
    .filter((section) => section.items.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={`fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        } hidden lg:block`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
            <div className="flex items-center gap-3">
              <img
                src={IMAGES.HINNEH_LOGO_20260507_234919_1}
                alt="HÎNNEH ÉDUCATION"
                className="h-10 w-10 object-contain"
              />
              {sidebarOpen && (
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-sidebar-foreground">
                    HÎNNEH ÉDUCATION
                  </span>
                  <span className="text-xs text-sidebar-foreground/60">
                    Fondation Hinneh / COSIM
                  </span>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <ChevronDown className="h-4 w-4 rotate-90" />
              </Button>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
            {filteredSections.map((section) => {
              const isOpen = openSections[section.title] ?? true;
              const hasActiveChild = section.items.some((item) => item.path === location.pathname);

              return (
                <div key={section.title} className="mb-2">
                  {sidebarOpen ? (
                    <button
                      type="button"
                      onClick={() => toggleSection(section.title)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all text-left ${
                        hasActiveChild
                          ? 'text-sidebar-primary bg-sidebar-primary/10'
                          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                      }`}
                    >
                      <span>{section.title}</span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform duration-200 shrink-0 ${
                          isOpen ? 'rotate-0' : '-rotate-90'
                        }`}
                      />
                    </button>
                  ) : null}

                  {(isOpen || !sidebarOpen) && (
                    <div className="space-y-1 mt-1">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                              isActive
                                ? 'bg-sidebar-primary text-sidebar-primary-foreground font-bold shadow-xs'
                                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                            }`}
                          >
                            <Icon className="h-5 w-5 flex-shrink-0" />
                            {sidebarOpen && <span>{item.label}</span>}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {!sidebarOpen && (
            <div className="border-t border-sidebar-border p-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-10 w-10 text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <ChevronDown className="h-4 w-4 -rotate-90" />
              </Button>
            </div>
          )}
        </div>
      </aside>

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={toggleMobileMenu}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 z-50 h-screen w-64 bg-sidebar border-r border-sidebar-border lg:hidden"
            >
              <div className="flex h-full flex-col">
                <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={IMAGES.HINNEH_LOGO_20260507_234919_1}
                      alt="HÎNNEH ÉDUCATION"
                      className="h-10 w-10 object-contain"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-sidebar-foreground">
                        HÎNNEH ÉDUCATION
                      </span>
                      <span className="text-xs text-sidebar-foreground/60">
                        Fondation Hinneh / COSIM
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMobileMenu}
                    className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
                  {filteredSections.map((section) => {
                    const isOpen = openSections[section.title] ?? true;
                    const hasActiveChild = section.items.some((item) => item.path === location.pathname);

                    return (
                      <div key={section.title} className="mb-2">
                        <button
                          type="button"
                          onClick={() => toggleSection(section.title)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all text-left ${
                            hasActiveChild
                              ? 'text-sidebar-primary bg-sidebar-primary/10'
                              : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                          }`}
                        >
                          <span>{section.title}</span>
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform duration-200 shrink-0 ${
                              isOpen ? 'rotate-0' : '-rotate-90'
                            }`}
                          />
                        </button>

                        {isOpen && (
                          <div className="space-y-1 mt-1">
                            {section.items.map((item) => {
                              const Icon = item.icon;
                              const isActive = location.pathname === item.path;
                              return (
                                <NavLink
                                  key={item.path}
                                  to={item.path}
                                  onClick={toggleMobileMenu}
                                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                                    isActive
                                      ? 'bg-sidebar-primary text-sidebar-primary-foreground font-bold shadow-xs'
                                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                                  }`}
                                >
                                  <Icon className="h-5 w-5 flex-shrink-0" />
                                  <span>{item.label}</span>
                                </NavLink>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </nav>

                {!sidebarOpen && (
                  <div className="border-t border-sidebar-border p-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleSidebar}
                      className="h-10 w-10 text-sidebar-foreground hover:bg-sidebar-accent"
                    >
                      <ChevronDown className="h-4 w-4 -rotate-90" />
                    </Button>
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div
        className={`transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
        }`}
      >
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMobileMenu}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="hidden md:flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Rechercher..."
                  className="w-64 pl-9"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {ecoleCode && (
              <Badge variant="outline" className="hidden md:flex gap-1 text-xs font-normal">
                <span className="font-semibold">{ecoleCode}</span>
                {ville && <span className="text-muted-foreground">— {ville}</span>}
              </Badge>
            )}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
              >
                3
              </Badge>
            </Button>

            <ThemeToggle variant="dropdown" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={activeAvatar || ""} alt="Utilisateur" />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden lg:flex flex-col items-start">
                    <span className="text-sm font-medium">{ROLE_LABELS[userRole] || userRole}</span>
                    <span className="text-xs text-muted-foreground">{activeUsername}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={() => setProfileModalOpen(true)}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profil</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => setProfileModalOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Paramètres</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive cursor-pointer" onClick={handleLogout}>
                  <span>Déconnexion</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="p-4 lg:p-6 flex flex-col justify-between min-h-[calc(100vh-4rem)]">
          <div className="flex-1">
            {loading ? (
              <AppLogoLoader
                message={loadingMessage || "Chargement de la page..."}
                submessage={loadingSubmessage}
              />
            ) : (
              children
            )}
          </div>
          <footer className="mt-8 pt-6 border-t text-center text-xs text-muted-foreground">
            <p>© 2026 Macsys. Tous droits réservés.</p>
          </footer>
        </main>

        <ProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          currentUsername={activeUsername}
          userRole={userRole}
          onUpdateSuccess={(newUsername) => {
            setActiveUsername(newUsername);
            setActiveAvatar(localStorage.getItem('user_photo') || localStorage.getItem('user_avatar') || '');
          }}
        />
      </div>
    </div>
  );
}
