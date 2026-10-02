import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  MapPin,
  Building,
  Clock,
  ShieldAlert,
  CalendarClock,
  ArrowRight,
  KeyRound,
  ShieldCheck,
  Lock,
  Mail,
  Phone,
  User,
  Sparkles,
  GraduationCap,
  CheckCircle2,
  ChevronRight,
  UserPlus,
  LogIn,
  Layers,
  School,
  FileText,
  BadgeCheck,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ROUTE_PATHS, type UserRole } from '@/lib/index';
import { useToast } from '@/hooks/use-toast';
import { IMAGES } from '@/assets/images';
import { ThemeToggle } from '@/components/ThemeToggle';
import apiClient from '@/lib/apiClient';

// ─── MODE DÉVELOPPEMENT ──────────────────────────────────────────────────────
// Mettre à false pour activer l'authentification réelle en production
const DEV_MODE = false;

const DEV_PROFILES: { label: string; role: UserRole; email: string }[] = [
  { label: 'Super Utilisateur',   role: 'superuser',           email: 'superuser@hinneh.ci' },
  { label: 'Direction Fondation', role: 'direction_fondation', email: 'direction@hinneh.ci' },
  { label: "Directeur d'école",   role: 'directeur_ecole',     email: 'directeur@hinneh.ci' },
  { label: 'Enseignant',          role: 'enseignant',          email: 'enseignant@hinneh.ci' },
  { label: 'Éducateur',           role: 'educateur',           email: 'educateur@hinneh.ci' },
  { label: 'Parent',              role: 'parent',              email: 'parent@hinneh.ci' },
  { label: 'Comptable',           role: 'comptable',           email: 'comptable@hinneh.ci' },
  { label: 'Scolarité',           role: 'scolarite',           email: 'scolarite@hinneh.ci' },
  { label: 'Accueil',             role: 'accueil',             email: 'accueil@hinneh.ci' },
  { label: 'Agent',               role: 'agent',               email: 'agent@hinneh.ci' },
  { label: 'RH',                  role: 'rh',                  email: 'rh@hinneh.ci' },
  { label: 'Admin Système',       role: 'admin',               email: 'admin@hinneh.ci' },
  { label: 'Élève',               role: 'eleve',               email: 'eleve@hinneh.ci' },
];
// ─────────────────────────────────────────────────────────────────────────────

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    emailOrPhone: DEV_MODE ? 'direction@hinneh.ci' : '',
    password:     DEV_MODE ? 'dev2026' : '',
    otp:          '',
    role:         (DEV_MODE ? 'direction_fondation' : '') as UserRole | '',
  });

  // ── Mot de passe oublié ─────────────────────────────────────────────────────
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotData, setForgotData] = useState({ identifiant: '', telephone: '' });
  const [forgotResult, setForgotResult] = useState<{ username: string; nouveau_mot_de_passe: string; message: string } | null>(null);
  const [motDePasseCopie, setMotDePasseCopie] = useState(false);

  // ── Changement imposé après réinitialisation ────────────────────────────────
  const [changeData, setChangeData] = useState({ username: '', ancien: '', nouveau: '', confirmation: '' });
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeError, setChangeError] = useState('');

  const resetForgotModal = () => {
    setShowForgotModal(false);
    setForgotData({ identifiant: '', telephone: '' });
    setForgotResult(null);
    setForgotError('');
    setMotDePasseCopie(false);
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotData.identifiant.trim() || !forgotData.telephone.trim()) {
      setForgotError('Renseignez votre identifiant et votre numéro de téléphone.');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await apiClient.motDePasseOublie({
        identifiant: forgotData.identifiant.trim(),
        telephone: forgotData.telephone.trim(),
      });
      setForgotResult(res);
    } catch (apiError: any) {
      const detail = apiError?.response?.data?.detail;
      setForgotError(
        typeof detail === 'string'
          ? detail
          : "Impossible de traiter la demande. Veuillez réessayer.",
      );
    } finally {
      setForgotLoading(false);
    }
  };

  const handleChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (changeData.nouveau.length < 6) {
      setChangeError('Le nouveau mot de passe doit faire au moins 6 caractères.');
      return;
    }
    if (changeData.nouveau !== changeData.confirmation) {
      setChangeError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setChangeLoading(true);
    setChangeError('');
    try {
      await apiClient.changerMotDePasse({
        username: changeData.username,
        ancien_mot_de_passe: changeData.ancien,
        nouveau_mot_de_passe: changeData.nouveau,
      });
      setShowChangeModal(false);
      toast({
        title: 'Mot de passe mis à jour',
        description: 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.',
      });
      setFormData((prev) => ({ ...prev, password: '' }));
      setChangeData({ username: '', ancien: '', nouveau: '', confirmation: '' });
    } catch (apiError: any) {
      const detail = apiError?.response?.data?.detail;
      setChangeError(typeof detail === 'string' ? detail : "Échec du changement de mot de passe.");
    } finally {
      setChangeLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (DEV_MODE) return true;

    const newErrors: Record<string, string> = {};
    if (!formData.emailOrPhone) newErrors.emailOrPhone = "Email, téléphone ou nom d'utilisateur requis";
    if (!formData.password) newErrors.password = 'Mot de passe requis';
    else if (formData.password.length < 6) newErrors.password = 'Minimum 6 caractères';
    if (showOTP && !formData.otp) newErrors.otp = 'Code OTP requis';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /** Connexion rapide avec authentification backend */
  const handleDevLogin = async (profile: (typeof DEV_PROFILES)[number]) => {
    setLoading(true);
    setErrors({});
    try {
      let password = 'dev2026';
      let username = profile.email;
      if (profile.role === 'parent') {
        username = 'parent.test@hinneh.ci';
        password = 'Parent2026!';
      } else if (profile.role === 'eleve') {
        username = 'HE20260001';
        password = 'parentpassword123';
      }

      const res = await apiClient.login({
        username,
        password,
        role: profile.role
      });
      localStorage.setItem('auth_token', res.access_token);
      localStorage.setItem('user_role', res.role);
      localStorage.setItem('username', res.username);
      const fullName = res.full_name || `${res.nom || ''} ${res.prenom || ''}`.trim() || res.username;
      localStorage.setItem('user_full_name', fullName);
      localStorage.setItem('user_name', fullName);
      localStorage.setItem('user_prenom', res.prenom || '');
      localStorage.setItem('user_nom', res.nom || '');
      if (res.ecole_id) {
        localStorage.setItem('user_ecole_id', String(res.ecole_id));
      } else {
        localStorage.removeItem('user_ecole_id');
      }
      localStorage.setItem('user_ecole_code', res.ecole_code || '');
      localStorage.setItem('user_ville', res.ville || '');
      if (res.ecole_name) localStorage.setItem('user_ecole_name', res.ecole_name);
      if (res.ecole_logo) localStorage.setItem('user_ecole_logo', res.ecole_logo);
      if (res.ecole_address) localStorage.setItem('user_ecole_address', res.ecole_address);
      if (res.ecole_contacts) localStorage.setItem('user_ecole_contacts', res.ecole_contacts);
      if (res.ecole_email) localStorage.setItem('user_ecole_email', res.ecole_email);
      const targetPath = 
        res.role === 'parent' || res.role === 'eleve' ? '/parent-space' :
        res.role === 'enseignant' ? ROUTE_PATHS.TEACHER_SPACE :
        res.role === 'educateur' ? ROUTE_PATHS.EDUCATOR_SPACE :
        ROUTE_PATHS.DASHBOARD;
      navigate(targetPath);
    } catch (apiError: any) {
      console.error("Backend auth failed for dev profile:", apiError);
      const errorMsg = apiError?.response?.data?.detail || 'Connexion impossible. Le serveur backend doit être démarré.';
      setErrors({ submit: typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg) });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      const res = await apiClient.login({
        username: formData.emailOrPhone,
        password: formData.password
      });

      if (res.must_change_password) {
        setChangeData({
          username: res.username,
          ancien: formData.password,
          nouveau: '',
          confirmation: '',
        });
        setChangeError('');
        setShowChangeModal(true);
        return;
      }

      localStorage.setItem('auth_token', res.access_token);
      localStorage.setItem('user_role', res.role);
      localStorage.setItem('username', res.username);
      const fullName = res.full_name || `${res.nom || ''} ${res.prenom || ''}`.trim() || res.username;
      localStorage.setItem('user_full_name', fullName);
      localStorage.setItem('user_name', fullName);
      localStorage.setItem('user_prenom', res.prenom || '');
      localStorage.setItem('user_nom', res.nom || '');
      if (res.ecole_id) {
        localStorage.setItem('user_ecole_id', String(res.ecole_id));
      } else {
        localStorage.removeItem('user_ecole_id');
      }
      localStorage.setItem('user_ecole_code', res.ecole_code || '');
      localStorage.setItem('user_ville', res.ville || '');
      if (res.ecole_name) localStorage.setItem('user_ecole_name', res.ecole_name);
      if (res.ecole_logo) localStorage.setItem('user_ecole_logo', res.ecole_logo);
      if (res.ecole_address) localStorage.setItem('user_ecole_address', res.ecole_address);
      if (res.ecole_contacts) localStorage.setItem('user_ecole_contacts', res.ecole_contacts);
      if (res.ecole_email) localStorage.setItem('user_ecole_email', res.ecole_email);
      const targetPath = 
        res.role === 'parent' || res.role === 'eleve' ? '/parent-space' :
        res.role === 'enseignant' ? ROUTE_PATHS.TEACHER_SPACE :
        res.role === 'educateur' ? ROUTE_PATHS.EDUCATOR_SPACE :
        ROUTE_PATHS.DASHBOARD;
      navigate(targetPath);
    } catch (apiError: any) {
      console.error("Backend authentication failed:", apiError);
      const status = apiError?.response?.status;
      const detail = apiError?.response?.data?.detail;

      if (status === 403 && (detail === "DOSSIER_EN_ATTENTE_RH" || (typeof detail === 'string' && detail.toLowerCase().includes('attente')))) {
        setShowPendingModal(true);
        setErrors({ submit: "Votre dossier est en attente de validation par les Ressources Humaines." });
        return;
      }

      let errorStr: string;
      if (!apiError?.response) {
        errorStr = 'Impossible de joindre le serveur. Veuillez vérifier votre connexion ou vérifier que le serveur backend est en cours d\'exécution.';
      } else if (status === 401) {
        errorStr = typeof detail === 'string' && detail && detail !== "Non autorisé"
          ? detail
          : 'Les identifiants saisis sont incorrects. Veuillez vérifier votre email / téléphone et votre mot de passe.';
      } else if (status === 403 && detail === "DOSSIER_REJETE_RH") {
        errorStr = 'Votre dossier a été refusé par le service des Ressources Humaines. Veuillez contacter la direction.';
      } else if (status === 403 && detail === "COMPTE_DESACTIVE") {
        errorStr = 'Votre compte utilisateur est actuellement désactivé. Veuillez contacter l\'administration.';
      } else if (status === 422) {
        errorStr = typeof detail === 'string' && detail ? detail : 'Certaines informations saisies sont invalides. Veuillez vérifier vos champs.';
      } else {
        errorStr = typeof detail === 'string' && detail ? detail : 'Une erreur est survenue lors de la connexion. Veuillez réessayer.';
      }
      toast({
        variant: 'destructive',
        title: 'Accès incorrect',
        description: errorStr,
      });
      setErrors({ submit: errorStr });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  return (
    <div className="min-h-screen w-full flex flex-col relative bg-slate-950 text-foreground overflow-x-hidden font-sans">
      {/* ── Sélecteur de thème flottant ── */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle variant="dropdown" className="bg-background/80 backdrop-blur-md shadow-lg border border-border/60 hover:bg-background transition-all" />
      </div>

      {/* ── Bandeau mode développement ── */}
      {DEV_MODE && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-center gap-3 text-xs sm:text-sm font-bold z-50 flex-shrink-0 shadow-md"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-900 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-900" />
          </span>
          <span>MODE DÉVELOPPEMENT — Accès de test activé</span>
          <span className="hidden md:inline font-medium opacity-80">
            | À désactiver avant la mise en production officielle
          </span>
        </motion.div>
      )}

      {/* ── Structure principale Split Screen ── */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-screen">

        {/* ═══════════════════════════════════════════════════════════════════
            PANNEAU GAUCHE : IDENTITÉ INSTITUTIONNELLE & IMMERSION (Desktop)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="hidden lg:flex lg:w-[46%] xl:w-[48%] relative flex-col justify-between p-10 xl:p-14 overflow-hidden bg-slate-950 text-white select-none">
          {/* Image de fond : Bâtiment officiel Groupe Scolaire Hînneh */}
          <img
            src={IMAGES.HINNEH_CAMPUS_BUILDING}
            alt="Campus Hînneh Éducation"
            className="absolute inset-0 w-full h-full object-cover object-center scale-100 brightness-95 contrast-105"
          />

          {/* Dégradé doux et translucide laissant apparaître nettement le bâtiment */}
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[0.5px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-slate-950/50" />

          {/* Contenu supérieur : En-tête officiel */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5 bg-slate-950/60 hover:bg-slate-950/75 transition-colors backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 shadow-xl">
              <img
                src={IMAGES.HINNEH_LOGO_20260507_234919_1}
                alt="Logo Hînneh"
                className="h-10 w-auto object-contain drop-shadow"
              />
              <div className="border-l border-white/20 pl-3">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">
                  Fondation Hinneh · COSIM
                </p>
                <p className="text-xs font-bold text-white tracking-wide">
                  Groupe Scolaire Confessionnel
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/60 border border-emerald-400/30 text-emerald-300 text-xs font-medium backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Année 2025 - 2026</span>
            </div>
          </motion.div>

          {/* Contenu central : Titre d'impact et Cartes Vitrines Bento (Position d'origine) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="relative z-10 my-auto py-8 space-y-8"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/25 border border-sky-400/40 text-sky-200 text-xs font-semibold uppercase tracking-wider mb-4 shadow-lg backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                <span>Système de Gestion Scolaire Intégré</span>
              </div>
              <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-black tracking-tight leading-tight text-white drop-shadow-md">
                L'Excellence Académique <br />
                <span className="bg-gradient-to-r from-sky-300 via-teal-200 to-emerald-300 bg-clip-text text-transparent">
                  au Cœur de Nos Valeurs
                </span>
              </h1>
              <p className="mt-4 text-sm xl:text-base text-slate-200 leading-relaxed max-w-xl font-normal drop-shadow">
                Plateforme unifiée d'administration, de suivi pédagogique, de gestion financière et de communication pour l'ensemble des établissements du réseau Hînneh.
              </p>
            </div>

            {/* 3 Cartes Bento d'information */}
            <div className="grid grid-cols-1 gap-3.5 max-w-xl">
              {/* Carte 1 : Pédagogie */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 hover:bg-slate-950/75 transition-all border border-white/15 backdrop-blur-md flex items-start gap-3.5 group shadow-lg">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300 shrink-0 group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-sky-200 transition-colors">
                    Pôle Pédagogique & Vie Scolaire
                  </h4>
                  <p className="text-xs text-slate-300/90 leading-relaxed mt-0.5">
                    Notes, bulletins officiels, relevés d'évaluation, présences biométriques et emplois du temps instantanés.
                  </p>
                </div>
              </div>

              {/* Carte 2 : Finance & Recouvrement */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 hover:bg-slate-950/75 transition-all border border-white/15 backdrop-blur-md flex items-start gap-3.5 group shadow-lg">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-emerald-200 transition-colors">
                    Gestion Financière & Recouvrement
                  </h4>
                  <p className="text-xs text-slate-300/90 leading-relaxed mt-0.5">
                    Traçabilité complète des transactions Mobile Money et Coris Bank, gestion des échéanciers et relances intelligentes.
                  </p>
                </div>
              </div>

              {/* Carte 3 : Familles & Rôles */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 hover:bg-slate-950/75 transition-all border border-white/15 backdrop-blur-md flex items-start gap-3.5 group shadow-lg">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0 group-hover:scale-105 transition-transform">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-indigo-200 transition-colors">
                    Espaces Multi-Rôles Dédiés
                  </h4>
                  <p className="text-xs text-slate-300/90 leading-relaxed mt-0.5">
                    Accès sécurisés et personnalisés pour Directeurs, Enseignants, Éducateurs, Comptables, Parents et Élèves.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contenu inférieur : Réseau & Sécurité */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-slate-300"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Abidjan · Bouaké · Korhogo · Daloa · Yamoussoukro</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-200">
              <BadgeCheck className="w-4 h-4 text-sky-400" />
              <span>Chiffrement SSL 256-bit</span>
            </div>
          </motion.div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            PANNEAU DROIT : FORMULAIRE DE CONNEXION (Desktop + Mobile)
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col justify-between p-5 sm:p-8 lg:p-12 xl:p-16 bg-background relative overflow-y-auto min-h-screen">
          
          {/* Halos décoratifs subtils en arrière-plan */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/5 dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* En-tête mobile avec la photo du campus bien visible */}
          <div className="lg:hidden w-full max-w-md mx-auto mb-4 rounded-2xl overflow-hidden relative shadow-xl border border-border/80">
            <img
              src={IMAGES.HINNEH_CAMPUS_BUILDING}
              alt="Bâtiment Groupe Scolaire Hînneh"
              className="w-full h-44 object-cover object-center brightness-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-4 text-white">
              <div className="flex items-center gap-2.5">
                <img
                  src={IMAGES.HINNEH_LOGO_20260507_234919_1}
                  alt="HÎnneh Éducation"
                  className="h-9 w-auto object-contain drop-shadow"
                />
                <div>
                  <h3 className="font-bold text-sm text-white drop-shadow">HÎNNEH ÉDUCATION</h3>
                  <p className="text-[10px] text-emerald-300 font-medium">Fondation Hinneh · COSIM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Conteneur de carte centré */}
          <div className="w-full max-w-md mx-auto my-auto py-6 sm:py-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="bg-card/90 dark:bg-card/75 backdrop-blur-xl border border-border/70 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-900/5 dark:shadow-black/40 relative"
            >
              {/* En-tête de la carte */}
              <div className="text-center mb-7">
                <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-3 shadow-inner">
                  <LogIn className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  Espace de Connexion
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
                  Accédez à votre espace sécurisé Hînneh Éducation
                </p>
              </div>

              {/* FORMULAIRE : CONNEXION */}
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                {/* Champ Identifiant (Email, Téléphone ou Login) */}
                <div className="space-y-1.5">
                  <Label htmlFor="emailOrPhone" className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Identifiant de connexion</span>
                    <span className="text-[10px] text-muted-foreground font-normal">Email, téléphone ou login</span>
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                      <User className="w-4 h-4" />
                    </div>
                    <Input
                      id="emailOrPhone"
                      type="text"
                      placeholder="exemple@hinneh.ci ou +225..."
                      value={formData.emailOrPhone}
                      onChange={(e) => handleInputChange('emailOrPhone', e.target.value)}
                      className={`pl-10 h-11 sm:h-12 rounded-xl text-sm transition-all bg-background/60 focus:bg-background ${
                        errors.emailOrPhone ? 'border-destructive focus-visible:ring-destructive' : ''
                      }`}
                      disabled={loading}
                      autoComplete="username"
                    />
                  </div>
                  {errors.emailOrPhone && (
                    <p className="text-[11px] text-destructive font-medium flex items-center gap-1 mt-1">
                      <ShieldAlert className="w-3 h-3" />
                      {errors.emailOrPhone}
                    </p>
                  )}
                </div>

                {/* Champ Mot de passe */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold text-foreground">
                      Mot de passe
                    </Label>
                    <button
                      type="button"
                      onClick={() => { setShowForgotModal(true); setForgotError(''); }}
                      className="text-[11px] font-semibold text-primary hover:text-primary/80 hover:underline cursor-pointer transition-colors"
                      disabled={loading}
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                      <Lock className="w-4 h-4" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Entrez votre mot de passe"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={`pl-10 pr-10 h-11 sm:h-12 rounded-xl text-sm transition-all bg-background/60 focus:bg-background ${
                        errors.password ? 'border-destructive focus-visible:ring-destructive' : ''
                      }`}
                      disabled={loading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      disabled={loading}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[11px] text-destructive font-medium flex items-center gap-1 mt-1">
                      <ShieldAlert className="w-3 h-3" />
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Champ Code OTP si requis */}
                {showOTP && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5"
                  >
                    <Label htmlFor="otp" className="text-xs font-semibold text-foreground">
                      Code d'authentification OTP
                    </Label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      </div>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="Code à 6 chiffres"
                        value={formData.otp}
                        onChange={(e) => handleInputChange('otp', e.target.value)}
                        maxLength={6}
                        className={`pl-10 h-11 rounded-xl text-sm font-mono tracking-widest ${
                          errors.otp ? 'border-destructive' : ''
                        }`}
                        disabled={loading}
                        autoComplete="one-time-code"
                      />
                    </div>
                    {errors.otp && <p className="text-[11px] text-destructive">{errors.otp}</p>}
                  </motion.div>
                )}

                {/* Message d'erreur global */}
                {errors.submit && (
                  <div className="p-3.5 bg-destructive/10 border border-destructive/25 rounded-xl text-xs sm:text-sm text-destructive font-medium flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="leading-tight">{errors.submit}</span>
                  </div>
                )}

                {/* Bouton de connexion CTA principal */}
                <Button
                  type="submit"
                  className="w-full h-11 sm:h-12 rounded-xl text-sm font-bold bg-gradient-to-r from-sky-600 via-primary to-blue-700 hover:from-sky-700 hover:via-primary/90 hover:to-blue-800 text-white shadow-lg shadow-primary/25 cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                      <span>Vérification des accès…</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span>Se connecter à mon espace</span>
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>

                {/* Séparateur élégant */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/70" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-bold text-muted-foreground">
                    <span className="bg-card px-2">Services & Démarches</span>
                  </div>
                </div>

                {/* Cartes d'accès rapides : Identification personnel & Prise RDV */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => navigate(ROUTE_PATHS.STAFF_REGISTRATION)}
                    className="p-2.5 rounded-xl border border-border/70 hover:border-primary/50 bg-muted/40 hover:bg-muted/80 text-left transition-all flex items-center gap-2.5 group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 group-hover:bg-sky-500/20 transition-colors">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">Identification personnel</p>
                      <p className="text-[10px] text-muted-foreground truncate">Fiche nouvel arrivant</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(ROUTE_PATHS.PRISE_RDV)}
                    className="p-2.5 rounded-xl border border-border/70 hover:border-emerald-500/50 bg-muted/40 hover:bg-muted/80 text-left transition-all flex items-center gap-2.5 group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                      <CalendarClock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">Prendre rendez-vous</p>
                      <p className="text-[10px] text-muted-foreground truncate">Visites & inscriptions</p>
                    </div>
                  </button>
                </div>
              </form>

              {/* ── Accès rapide mode développement (si DEV_MODE est activé) ── */}
              {DEV_MODE && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 p-3.5 rounded-2xl border-2 border-dashed border-amber-500/40 bg-amber-500/5 text-xs"
                >
                  <p className="font-bold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                    <span>⚡</span>
                    Accès rapide de test (Mode DEV)
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {DEV_PROFILES.map((profile) => (
                      <button
                        key={profile.role}
                        type="button"
                        onClick={() => handleDevLogin(profile)}
                        className="text-[11px] text-left px-2.5 py-1.5 rounded-lg bg-background border border-border hover:border-primary hover:text-primary transition-all truncate font-medium cursor-pointer"
                      >
                        {profile.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Note de sécurité en bas de carte */}
              <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Accès sécurisé et chiffré aux serveurs de la Fondation</span>
              </div>
            </motion.div>
          </div>

          {/* Pied de page */}
          <div className="w-full max-w-md mx-auto pt-4 text-center text-xs text-muted-foreground space-y-2">
            <div className="flex items-center justify-center gap-4 text-[11px]">
              <button
                type="button"
                onClick={() => toast({ title: "Assistance technique", description: "Contactez l'administration de votre établissement ou le service informatique." })}
                className="hover:text-foreground transition-colors cursor-pointer"
              >
                Centre d'aide
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => toast({ title: "Sécurité & Confidentialité", description: "Toutes les données scolaires sont protégées conformément à la législation en vigueur." })}
                className="hover:text-foreground transition-colors cursor-pointer"
              >
                Politique de confidentialité
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground/80">
              © 2026 Fondation Hinneh · COSIM. Tous droits réservés. Développé par Macsys.
            </p>
          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MODALS DU SYSTÈME (Préservés scrupuleusement avec style raffiné)
         ═══════════════════════════════════════════════════════════════════ */}

      {/* ── Modal Alerte Dossier en attente de validation RH ── */}
      <Dialog open={showPendingModal} onOpenChange={setShowPendingModal}>
        <DialogContent className="max-w-md bg-card border-amber-300/60 dark:border-amber-900/50 p-6 shadow-2xl rounded-2xl">
          <DialogHeader className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-300 dark:border-amber-700 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>
            <DialogTitle className="text-xl font-bold text-amber-950 dark:text-amber-200">
              Dossier en attente de validation RH
            </DialogTitle>
            <div className="text-sm text-muted-foreground leading-relaxed text-left bg-amber-50/70 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200/70 dark:border-amber-900/40 space-y-2.5">
              <p className="text-slate-800 dark:text-slate-200 font-medium">
                Votre fiche d'identification a bien été enregistrée dans notre système.
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Conformément aux procédures administratives, votre dossier est actuellement <strong>bloqué au niveau des Ressources Humaines</strong> en attente de vérification et de validation de votre rôle et de vos affectations.
              </p>
              <div className="p-2.5 bg-amber-100/60 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-800 text-[11px] font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Vos accès seront automatiquement activés dès la validation par votre responsable RH.</span>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-4 sm:justify-center">
            <Button 
              className="w-full sm:w-auto px-8 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-md transition-all cursor-pointer"
              onClick={() => setShowPendingModal(false)}
            >
              J'ai compris
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal : Mot de passe oublié ── */}
      <Dialog open={showForgotModal} onOpenChange={(open) => { if (!open) resetForgotModal(); }}>
        <DialogContent className="max-w-md rounded-2xl shadow-2xl p-6 bg-card border-border/80">
          {forgotResult ? (
            <div className="space-y-4">
              <DialogHeader>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  <Check className="w-6 h-6" />
                </div>
                <DialogTitle className="text-center text-lg font-bold">
                  Nouveau mot de passe généré
                </DialogTitle>
                <DialogDescription className="text-center text-xs">
                  {forgotResult.message}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-1 bg-muted/50 p-3 rounded-xl border border-border/60">
                <p className="text-xs text-muted-foreground">Identifiant de connexion :</p>
                <p className="font-semibold text-sm">{forgotResult.username}</p>
              </div>

              <div className="py-3 px-4 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 text-center">
                <p className="text-xs text-muted-foreground mb-1">Mot de passe provisoire :</p>
                <p className="text-2xl font-black tracking-widest font-mono text-primary select-all">
                  {forgotResult.nouveau_mot_de_passe}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl cursor-pointer"
                onClick={() => {
                  navigator.clipboard?.writeText(forgotResult.nouveau_mot_de_passe)
                    .then(() => setMotDePasseCopie(true))
                    .catch(() => setMotDePasseCopie(false));
                }}
              >
                {motDePasseCopie ? (
                  <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                    <Check className="w-4 h-4" /> Mot de passe copié !
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Copy className="w-4 h-4" /> Copier le mot de passe
                  </span>
                )}
              </Button>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Ce mot de passe provisoire ne sert qu'une seule fois. Vous devrez définir votre mot de passe personnel dès votre connexion.
                </span>
              </div>

              <Button
                className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold cursor-pointer"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    emailOrPhone: forgotResult.username,
                    password: forgotResult.nouveau_mot_de_passe,
                  }));
                  resetForgotModal();
                }}
              >
                Se connecter avec ce mot de passe
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
                  <KeyRound className="w-6 h-6" />
                </div>
                <DialogTitle className="text-center text-lg font-bold">
                  Récupération du mot de passe
                </DialogTitle>
                <DialogDescription className="text-center text-xs">
                  Pour votre sécurité, le système vérifie votre identifiant et le numéro de téléphone enregistré sur votre dossier RH.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleForgotSubmit} className="space-y-3.5 pt-2">
                {forgotError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor="forgot-identifiant" className="text-xs">
                    Identifiant (Email, nom d'utilisateur ou login)
                  </Label>
                  <Input
                    id="forgot-identifiant"
                    value={forgotData.identifiant}
                    onChange={(e) => { setForgotData((p) => ({ ...p, identifiant: e.target.value })); setForgotError(''); }}
                    disabled={forgotLoading}
                    autoComplete="username"
                    className="rounded-xl h-10 text-sm"
                    placeholder="Ex: amadou.kone"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="forgot-telephone" className="text-xs">
                    Numéro de téléphone (enregistré en RH)
                  </Label>
                  <Input
                    id="forgot-telephone"
                    placeholder="+225 XX XX XX XX XX"
                    value={forgotData.telephone}
                    onChange={(e) => { setForgotData((p) => ({ ...p, telephone: e.target.value })); setForgotError(''); }}
                    disabled={forgotLoading}
                    className="rounded-xl h-10 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Le numéro doit être validé sur votre fiche du personnel.
                  </p>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="submit" className="w-full rounded-xl font-bold cursor-pointer" disabled={forgotLoading}>
                    {forgotLoading ? 'Vérification en cours…' : 'Générer un mot de passe temporaire'}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal : Changement imposé après réinitialisation ── */}
      <Dialog open={showChangeModal} onOpenChange={(open) => { if (!open) setShowChangeModal(false); }}>
        <DialogContent className="max-w-md rounded-2xl shadow-2xl p-6 bg-card border-border/80">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-2">
              <KeyRound className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">
              Définir un nouveau mot de passe
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              Votre mot de passe actuel est temporaire. Veuillez choisir un nouveau mot de passe sécurisé pour finaliser votre accès.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangeSubmit} className="space-y-3.5 pt-2">
            {changeError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{changeError}</span>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="change-nouveau" className="text-xs">Nouveau mot de passe</Label>
              <Input
                id="change-nouveau"
                type="password"
                placeholder="******"
                value={changeData.nouveau}
                onChange={(e) => { setChangeData((p) => ({ ...p, nouveau: e.target.value })); setChangeError(''); }}
                disabled={changeLoading}
                autoComplete="new-password"
                className="rounded-xl h-10 text-sm"
              />
              <p className="text-[10px] text-muted-foreground">Au moins 6 caractères.</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="change-confirmation" className="text-xs">Confirmez le nouveau mot de passe</Label>
              <Input
                id="change-confirmation"
                type="password"
                placeholder="******"
                value={changeData.confirmation}
                onChange={(e) => { setChangeData((p) => ({ ...p, confirmation: e.target.value })); setChangeError(''); }}
                disabled={changeLoading}
                autoComplete="new-password"
                className="rounded-xl h-10 text-sm"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="submit" className="w-full rounded-xl font-bold cursor-pointer" disabled={changeLoading}>
                {changeLoading ? 'Enregistrement…' : 'Valider et accéder à la plateforme'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
