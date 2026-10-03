import { useState, useEffect, useMemo } from 'react';
import apiClient from '@/lib/apiClient';
import { Layout } from '@/components/Layout';
import { DataTable, type Column } from '@/components/DataTable';
import { StatsCard } from '@/components/Stats';
import type { Staff, KPICard, School } from '@/lib/index';
import { formatStudentName } from '@/lib/index';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Users, GraduationCap, Briefcase, UserX, Calendar, Star, Check, X, Eye, FileText, MapPin, Building, Printer, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { printCarteProfessionnelle, printPlancheCartesProfessionnelles, resolveStaffService } from '@/lib/certificatePrinter';
import { UserCheck, ShieldAlert, Clock, Building2, Phone, Mail, FileCheck } from 'lucide-react';

export const getRoleBadge = (fonction: any) => {
  const f = String(fonction || '').toLowerCase().trim();
  if (f.includes('enseignant')) return { label: 'Enseignant', color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200' };
  if (f.includes('educateur')) return { label: 'Éducateur', color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200' };
  if (f.includes('directeur') || f.includes('direction')) return { label: "Directeur d'école", color: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-200' };
  if (f.includes('comptab') || f.includes('finance')) return { label: 'Comptable / Finance', color: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200' };
  if (f.includes('rh')) return { label: 'Ressources Humaines', color: 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-950/60 dark:text-pink-200' };
  if (f.includes('scolarite')) return { label: 'Scolarité', color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200' };
  if (f.includes('surveill')) return { label: 'Surveillant', color: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-200' };
  if (f.includes('accueil') || f.includes('secretaire')) return { label: 'Accueil / Secrétariat', color: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-200' };
  if (f.includes('coranique')) return { label: 'Études Coraniques', color: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-200' };
  if (f.includes('chauffeur') || f.includes('transport')) return { label: 'Chauffeur / Transport', color: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200' };
  if (f.includes('service') || f.includes('agent')) return { label: 'Personnel de service', color: 'bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-200' };
  if (f.includes('admin') || f.includes('super')) return { label: 'Administration', color: 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950/60 dark:text-violet-200' };
  
  if (!fonction) return { label: 'Personnel', color: 'bg-slate-100 text-slate-700 border-slate-200' };
  return { 
    label: fonction.charAt(0).toUpperCase() + String(fonction).slice(1), 
    color: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200' 
  };
};

const getFonctionBadgeVariant = (fonction: any) => {
  const variantMap: Record<string, 'default' | 'secondary' | 'outline'> = {
    enseignant: 'default',
    educateur: 'default',
    admin: 'secondary',
    coranique: 'outline',
    surveillance: 'secondary',
    service: 'outline',
    direction: 'default',
    directeur_ecole: 'default',
    comptable: 'secondary',
    rh: 'secondary',
    scolarite: 'outline',
  };
  return variantMap[fonction] || 'default';
};

const getStatusBadgeVariant = (status: Staff['status']) => {
  const variantMap: Record<Staff['status'], 'default' | 'secondary' | 'destructive'> = {
    actif: 'default',
    conge: 'secondary',
    absent: 'destructive',
    en_attente: 'secondary',
  };
  return variantMap[status];
};

const getFonctionLabel = (fonction: any): string => {
  return getRoleBadge(fonction).label;
};

const getStatusLabel = (status: Staff['status']): string => {
  const labels: Record<Staff['status'], string> = {
    actif: 'Actif',
    conge: 'Congé',
    absent: 'Absent',
    en_attente: 'En attente de validation',
  };
  return labels[status] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Actif');
};

export default function HR() {
  const { toast } = useToast();
  const userEcoleId = localStorage.getItem('user_ecole_id');
  const userRole = localStorage.getItem('user_role');
  // Le backend filtre déjà le personnel selon les établissements autorisés (campus/ville).
  // Par défaut, afficher 'all' (Tous les établissements du campus) pour que le directeur et son équipe voient l'ensemble du personnel.
  const initialSchoolFilter = 'all';

  const [selectedSchool, setSelectedSchool] = useState<string>(initialSchoolFilter);
  const [selectedFonction, setSelectedFonction] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [schoolsList, setSchoolsList] = useState<School[]>([]);

  // View pending dossier state
  const [viewPendingStaff, setViewPendingStaff] = useState<Staff | null>(null);

  // Edit/Delete state
  const [editStaffOpen, setEditStaffOpen] = useState(false);
  const [deleteStaffOpen, setDeleteStaffOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editFonction, setEditFonction] = useState('');
  const [editStatusEdit, setEditStatusEdit] = useState('');

  // Create state
  const [createStaffOpen, setCreateStaffOpen] = useState(false);
  const [createFirstName, setCreateFirstName] = useState('');
  const [createLastName, setCreateLastName] = useState('');
  const [createUsername, setCreateUsername] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createFonction, setCreateFonction] = useState('enseignant');
  const [createCity, setCreateCity] = useState<string>('');
  const [createSchoolId, setCreateSchoolId] = useState('');
  const [createChargeHoraire, setCreateChargeHoraire] = useState(18);
  const [createStatus, setCreateStatus] = useState('actif');

  const normalizeCity = (c: string) =>
    (c || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const createCityOptions = useMemo(() => {
    const map = new Map<string, string>();
    schoolsList.forEach((s: any) => {
      if (s.city && s.city.trim()) {
        const key = normalizeCity(s.city);
        if (!map.has(key)) map.set(key, s.city.trim());
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [schoolsList]);

  const filteredCreateSchools = useMemo(() => {
    if (!createCity || createCity === 'all') return schoolsList;
    const target = normalizeCity(createCity);
    return schoolsList.filter(s => normalizeCity(s.city) === target);
  }, [schoolsList, createCity]);

  const handleValiderStaff = async (staffId: string) => {
    try {
      await apiClient.validerStaff(staffId);
      toast({
        title: "Dossier validé",
        description: "Le membre du personnel a été activé avec succès.",
      });
      setViewPendingStaff(null);
      await loadStaffData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: err.response?.data?.detail || "Impossible de valider le dossier.",
      });
    }
  };

  const handleRejeterStaff = async (staffId: string) => {
    try {
      await apiClient.rejeterStaff(staffId);
      toast({
        title: "Dossier rejeté",
        description: "Le dossier a été rejeté.",
      });
      setViewPendingStaff(null);
      await loadStaffData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: err.response?.data?.detail || "Impossible de rejeter le dossier.",
      });
    }
  };

  const loadStaffData = async () => {
    try {
      const [staffData, schoolsData] = await Promise.all([
        apiClient.getStaff().catch((err: any): any[] => {
          console.error("Failed to fetch staff from API", err);
          return [];
        }),
        apiClient.getAllSchools().catch((err: any): any[] => {
          console.error("Failed to fetch schools from API", err);
          return [];
        }),
      ]);
      setStaffList(staffData);
      setSchoolsList(schoolsData);
    } catch (err) {
      console.error("Failed to fetch data from API", err);
    }
  };

  useEffect(() => {
    loadStaffData();
  }, []);

  const handleEditStaff = (row: unknown) => {
    const staff = row as Staff;
    setSelectedStaff(staff);
    setEditFirstName(staff.firstName || '');
    setEditLastName(staff.lastName || '');
    setEditEmail(staff.email || '');
    setEditFonction(staff.fonction || '');
    setEditStatusEdit(staff.status || 'actif');
    setEditStaffOpen(true);
  };

  const handleUpdateStaff = async () => {
    if (!selectedStaff) return;
    try {
      await apiClient.updateStaff(selectedStaff.id, {
        first_name: editFirstName,
        last_name: editLastName,
        email: editEmail,
        fonction: editFonction,
        statut: editStatusEdit,
      });
      toast({ title: "Personnel mis à jour", description: `${editLastName} ${editFirstName} a été modifié.` });
      setEditStaffOpen(false);
      setSelectedStaff(null);
      await loadStaffData();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erreur", description: err.response?.data?.detail || "Impossible de modifier le membre." });
    }
  };

  const handleDeletePrompt = (row: unknown) => {
    setSelectedStaff(row as Staff);
    setDeleteStaffOpen(true);
  };

  const handleDeleteStaff = async () => {
    if (!selectedStaff) return;
    try {
      await apiClient.deleteStaff(selectedStaff.id);
      toast({ title: "Personnel supprimé", description: "Le membre du personnel a été supprimé." });
      setDeleteStaffOpen(false);
      setSelectedStaff(null);
      await loadStaffData();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erreur", description: err.response?.data?.detail || "Impossible de supprimer le membre." });
    }
  };

  const handleCreateStaffSubmit = async () => {
    if (!createFirstName || !createLastName || !createUsername || !createPassword || !createEmail) {
      toast({
        variant: "destructive",
        title: "Champs manquants",
        description: "Veuillez remplir les champs obligatoires (Prénom, Nom, Nom d'utilisateur, Mot de passe, Email)."
      });
      return;
    }
    try {
      await apiClient.createStaff({
        prenom: createFirstName,
        nom: createLastName,
        username: createUsername,
        password: createPassword,
        email: createEmail,
        telephone: createPhone,
        fonction: createFonction,
        statut: createStatus,
        charge_horaire: createChargeHoraire,
        ecole_id: createSchoolId ? parseInt(createSchoolId, 10) : null,
      });

      toast({
        title: "Personnel créé",
        description: `${createLastName} ${createFirstName} a été créé avec succès.`
      });

      // Clear fields
      setCreateFirstName('');
      setCreateLastName('');
      setCreateUsername('');
      setCreatePassword('');
      setCreateEmail('');
      setCreatePhone('');
      setCreateFonction('enseignant');
      setCreateSchoolId('');
      setCreateChargeHoraire(18);
      setCreateStatus('actif');
      setCreateStaffOpen(false);

      await loadStaffData();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur lors de la création",
        description: err.response?.data?.detail || "Impossible de créer le membre du personnel."
      });
    }
  };

  const filteredStaff = staffList.filter((staff) => {
    if (staff.status === 'en_attente') return false;
    if (selectedSchool !== 'all') {
      const matchId = String(staff.schoolId || '') === String(selectedSchool);
      const selSchoolObj = schoolsList.find(s => String(s.id) === String(selectedSchool));
      const selCode = (selSchoolObj?.code || '').toUpperCase().trim();
      const staffCode = (staff.code_etablissement || (staff as any).ET_CODEETABLISSEMENT || '').toUpperCase().trim();
      const matchCode = Boolean(selCode && staffCode && selCode === staffCode);
      if (!matchId && !matchCode) return false;
    }
    if (selectedFonction !== 'all' && staff.fonction !== selectedFonction) return false;
    if (selectedStatus !== 'all' && staff.status !== selectedStatus) return false;
    return true;
  });

  const pendingStaff = staffList.filter((staff) => staff.status === 'en_attente');

  const totalStaff = staffList.filter((s) => s.status !== 'en_attente').length;
  const activeStaff = staffList.filter((s) => s.status === 'actif').length;
  const teachers = staffList.filter((s) => s.fonction === 'enseignant' && s.status !== 'en_attente').length;
  const adminStaff = staffList.filter(
    (s) => (s.fonction === 'admin' || s.fonction === 'direction') && s.status !== 'en_attente'
  ).length;
  const vacantPositions = Math.floor(totalStaff * 0.08);

  const pendingStaffColumns: Column<Staff>[] = [
    {
      key: 'name',
      label: 'Nom complet & Contact',
      render: (_v, staff: Staff) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-amber-300">
            <AvatarFallback className="bg-amber-100 text-amber-800 font-bold">
              {staff.lastName[0]}{staff.firstName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100">
              {formatStudentName(staff)}
            </div>
            <div className="text-xs text-muted-foreground">{staff.email || staff.phone || 'Aucun contact'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'fonction',
      label: 'Rôle & Profil choisi',
      render: (_v, staff: any) => {
        const roleInfo = getRoleBadge(staff.fonction);
        return (
          <div className="flex flex-col gap-0.5">
            <Badge className={`text-xs px-2.5 py-0.5 font-bold border w-fit ${roleInfo.color}`}>
              {roleInfo.label}
            </Badge>
            {staff.disponibilites?.fonctionExercee && (
              <span className="text-[11px] text-muted-foreground italic">
                {staff.disponibilites.fonctionExercee}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'school',
      label: 'Établissement',
      render: (_v, staff: Staff) => {
        const school = schoolsList.find((s) => s.id === staff.schoolId);
        return (
          <div className="text-xs font-medium">
            {school ? school.name.replace('École Confessionnelle HINNEH ', '').replace('Ecole Confessionnelle HINNEH ', '') : 'Établissement principal'}
          </div>
        );
      },
    },
    {
      key: 'createdAt',
      label: 'Date de soumission',
      render: (_v, staff: Staff) => (
        <div className="text-xs text-muted-foreground font-mono">
          {new Date(staff.createdAt).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Contrôle & Validation',
      render: (_v, staff: Staff) => (
        <div className="flex gap-2 justify-end">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs font-medium"
            onClick={() => setViewPendingStaff(staff)}
          >
            <Eye className="h-3.5 w-3.5 text-indigo-600" />
            Consulter la fiche
          </Button>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white gap-1.5 text-xs font-bold shadow-xs"
            onClick={() => handleValiderStaff(staff.id)}
          >
            <Check className="h-3.5 w-3.5" />
            Valider le dossier
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="gap-1.5 text-xs"
            onClick={() => handleRejeterStaff(staff.id)}
          >
            <X className="h-3.5 w-3.5" />
            Rejeter
          </Button>
        </div>
      ),
    },
  ];

  const kpis: KPICard[] = [
    {
      id: 'kpi-hr-1',
      title: 'Total personnel',
      value: totalStaff,
      period: 'tous établissements',
      color: 'primary',
    },
    {
      id: 'kpi-hr-2',
      title: 'Enseignants',
      value: teachers,
      period: `${Math.round((teachers / (totalStaff || 1)) * 100)}% du personnel`,
      color: 'secondary',
    },
    {
      id: 'kpi-hr-3',
      title: 'Personnel admin',
      value: adminStaff,
      period: 'direction & administration',
      color: 'accent',
    },
    {
      id: 'kpi-hr-4',
      title: 'Postes vacants',
      value: vacantPositions,
      period: 'à pourvoir',
      color: 'destructive',
    },
  ];

  const staffColumns: Column<Staff>[] = [
    {
      key: 'photo',
      label: 'Photo',
      render: (_v, staff: Staff) => (
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {staff.lastName[0]}{staff.firstName[0]}
          </AvatarFallback>
        </Avatar>
      ),
    },
    {
      key: 'name',
      label: 'Personnel & Photo',
      render: (_v, staff: any) => {
        const photoUrl = staff.photo || staff.photo_url || '';
        const initials = `${(staff.lastName || staff.nom || 'S')[0] || ''}${(staff.firstName || staff.prenom || 'P')[0] || ''}`.toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full border-2 border-indigo-200 dark:border-indigo-800 bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-primary overflow-hidden shrink-0 shadow-xs">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">
                {formatStudentName(staff)}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span>{staff.email}</span>
                {staff.phone && <span className="font-mono text-slate-500">· {staff.phone}</span>}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'fonction',
      label: 'Fonction / Rôle',
      render: (_v, staff: any) => {
        const roleInfo = getRoleBadge(staff.fonction);
        return (
          <Badge className={`text-xs px-2.5 py-0.5 font-bold border ${roleInfo.color}`}>
            {roleInfo.label}
          </Badge>
        );
      },
    },
    {
      key: 'service',
      label: 'Service',
      render: (_v, staff: any) => {
        const sService = resolveStaffService(staff);
        return (
          <Badge variant="outline" className="text-xs font-semibold bg-amber-50/80 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
            🏢 {sService}
          </Badge>
        );
      },
    },
    {
      key: 'school',
      label: 'Établissement',
      render: (_v, staff: Staff) => {
        const school = schoolsList.find((s) => s.id === staff.schoolId);
        return (
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {school ? school.name.replace('École Confessionnelle HINNEH ', '').replace('Ecole Confessionnelle HINNEH ', '') : 'N/A'}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Statut',
      render: (_v, staff: Staff) => (
        <Badge variant={getStatusBadgeVariant(staff.status)}>
          {getStatusLabel(staff.status)}
        </Badge>
      ),
    },
    {
      key: 'cnps',
      label: 'CNPS',
      render: (_v, staff: any) => {
        const isDeclare = staff.is_cnps_declare !== false;
        return isDeclare ? (
          <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
            Déclaré ✅
          </Badge>
        ) : (
          <Badge className="bg-rose-600 text-white font-bold text-[10px]">
            Non Déclaré ⚠️
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      label: 'Carte Pro & Actions',
      render: (_v, staff: any) => {
        const school = schoolsList.find((s) => s.id === staff.schoolId);
        return (
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 text-xs font-medium"
              onClick={() => printCarteProfessionnelle(staff, school)}
              title="Imprimer la Carte Professionnelle avec photo et service"
            >
              <Printer className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              Carte Pro
            </Button>
          </div>
        );
      },
    },
  ];

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];
  const currentWeekStaff = filteredStaff.slice(0, 12);

  const evaluations = staffList
    .filter((s) => s.evaluationScore !== undefined)
    .slice(0, 15)
    .map((staff) => {
      const school = schoolsList.find((s) => s.id === staff.schoolId);
      return {
        id: staff.id,
        staffName: `${formatStudentName(staff)}`,
        fonction: getFonctionLabel(staff.fonction),
        school: school ? school.name.replace('École Confessionnelle HINNEH ', '').replace('Ecole Confessionnelle HINNEH ', '') : 'N/A',
        date: new Date(2025, 3, Math.floor(Math.random() * 28) + 1),
        score: staff.evaluationScore!,
        recommendations: staff.evaluationScore! >= 85
          ? 'Excellent travail, maintenir le niveau'
          : staff.evaluationScore! >= 75
          ? "Bon niveau, quelques axes d'amélioration"
          : 'Formation recommandée',
      };
    });

  const evaluationColumns: Column[] = [
    {
      key: 'staffName',
      label: 'Personnel',
      render: (_v, row: typeof evaluations[0]) => (
        <div>
          <div className="font-medium">{row.staffName}</div>
          <div className="text-sm text-muted-foreground">{row.fonction}</div>
        </div>
      ),
    },
    {
      key: 'school',
      label: 'Établissement',
      render: (_v, row: typeof evaluations[0]) => <div className="text-sm">{row.school}</div>,
    },
    {
      key: 'date',
      label: 'Date',
      render: (_v, row: typeof evaluations[0]) => (
        <div className="text-sm">
          {row.date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </div>
      ),
    },
    {
      key: 'score',
      label: 'Score',
      render: (_v, row: typeof evaluations[0]) => (
        <div className="flex items-center gap-2">
          <div className="font-mono font-semibold">{row.score}/100</div>
          {row.score >= 85 && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
        </div>
      ),
    },
    {
      key: 'recommendations',
      label: 'Recommandations',
      render: (_v, row: typeof evaluations[0]) => (
        <div className="text-sm text-muted-foreground max-w-xs">{row.recommendations}</div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="space-y-8 p-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Ressources Humaines</h1>
            <p className="text-muted-foreground mt-2">
              Gestion du personnel, cartes professionnelles et évaluations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="lg"
              variant="outline"
              className="gap-2 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 shadow-xs"
              onClick={() => {
                const school = selectedSchool !== 'all' ? schoolsList.find((s) => s.id === selectedSchool) : null;
                printPlancheCartesProfessionnelles(filteredStaff, school);
              }}
              title="Imprimer une planche A4 de cartes professionnelles avec photos et services"
            >
              <Printer className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Imprimer Cartes Pro ({filteredStaff.length})
            </Button>
            <Button size="lg" className="gap-2" onClick={() => setCreateStaffOpen(true)}>
              <Users className="h-5 w-5" />
              Nouveau personnel
            </Button>
          </div>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {kpis.map((kpi) => (
            <motion.div key={kpi.id} variants={staggerItem}>
              <StatsCard kpi={kpi} />
            </motion.div>
          ))}
        </motion.div>

        {/* Alerte dossiers en attente */}
        {pendingStaff.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/90 dark:bg-amber-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="font-bold text-amber-950 dark:text-amber-200 text-sm">
                  {pendingStaff.length} dossier{pendingStaff.length > 1 ? 's' : ''} de personnel en attente de validation RH
                </p>
                <p className="text-xs text-amber-900/80 dark:text-amber-300/80 mt-0.5">
                  Consultez l'onglet <strong>« Dossiers en attente »</strong> ci-dessous pour vérifier le rôle choisi et activer les accès.
                </p>
              </div>
            </div>
            <Badge className="bg-amber-600 text-white font-bold text-xs px-3 py-1 shrink-0 self-start sm:self-auto">
              Validation requise
            </Badge>
          </motion.div>
        )}

        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="w-full">
          <Tabs defaultValue={pendingStaff.length > 0 ? "attente" : "actif"} className="w-full space-y-6">
            <TabsList className="grid w-full sm:w-[500px] grid-cols-2 p-1 bg-muted/80 rounded-xl">
              <TabsTrigger value="actif" className="gap-2 font-semibold text-xs sm:text-sm">
                <Users className="w-4 h-4 text-primary" />
                Personnel Actif ({filteredStaff.length})
              </TabsTrigger>
              <TabsTrigger value="attente" className="relative flex items-center gap-2 font-semibold text-xs sm:text-sm">
                <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Dossiers en attente
                {pendingStaff.length > 0 ? (
                  <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-xs font-bold animate-pulse shadow-xs">
                    {pendingStaff.length}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">(0)</span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="actif" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Liste du personnel</CardTitle>
                      <CardDescription>
                        {filteredStaff.length} membre(s) du personnel actif ou absent
                      </CardDescription>
                    </div>
                    <div className="flex gap-3">
                      <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Établissement" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les établissements</SelectItem>
                          {schoolsList.map((school) => (
                            <SelectItem key={school.id} value={school.id}>
                              {school.name.replace('École Confessionnelle HINNEH ', '').replace('Ecole Confessionnelle HINNEH ', '')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={selectedFonction} onValueChange={setSelectedFonction}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Fonction" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les fonctions</SelectItem>
                          <SelectItem value="enseignant">Enseignant</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="coranique">Coranique</SelectItem>
                          <SelectItem value="surveillance">Surveillance</SelectItem>
                          <SelectItem value="service">Service</SelectItem>
                          <SelectItem value="direction">Direction</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les statuts</SelectItem>
                          <SelectItem value="actif">Actif</SelectItem>
                          <SelectItem value="conge">Congé</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={staffColumns}
                    data={filteredStaff}
                    searchable
                    exportable
                    onEdit={handleEditStaff}
                    onDelete={handleDeletePrompt}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attente" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Dossiers de demande d'inscription</CardTitle>
                  <CardDescription>
                    {pendingStaff.length} dossier(s) en attente de validation RH
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={pendingStaffColumns}
                    data={pendingStaff}
                    searchable
                    exportable={false}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Edit Staff Dialog */}
        <Dialog open={editStaffOpen} onOpenChange={setEditStaffOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier le membre du personnel</DialogTitle>
              <DialogDescription>Modifiez les informations du membre sélectionné.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label>Nom</Label>
                  <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
                </div>
                <div className="grid gap-1">
                  <Label>Prénom</Label>
                  <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Fonction</Label>
                <Select value={editFonction} onValueChange={setEditFonction}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enseignant">Enseignant</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="coranique">Coranique</SelectItem>
                    <SelectItem value="surveillance">Surveillance</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="direction">Direction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Statut</Label>
                <Select value={editStatusEdit} onValueChange={setEditStatusEdit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="conge">Congé</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditStaffOpen(false)}>Annuler</Button>
              <Button onClick={handleUpdateStaff}>Enregistrer les modifications</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Staff Dialog */}
        <Dialog open={createStaffOpen} onOpenChange={setCreateStaffOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nouveau membre du personnel</DialogTitle>
              <DialogDescription>Saisissez les informations pour ajouter un nouveau membre du personnel.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label>Nom *</Label>
                  <Input value={createLastName} onChange={(e) => setCreateLastName(e.target.value)} placeholder="Nom" />
                </div>
                <div className="grid gap-1">
                  <Label>Prénom *</Label>
                  <Input value={createFirstName} onChange={(e) => setCreateFirstName(e.target.value)} placeholder="Prénom" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label>Nom d'utilisateur *</Label>
                  <Input value={createUsername} onChange={(e) => setCreateUsername(e.target.value)} placeholder="ex: jdoe" />
                </div>
                <div className="grid gap-1">
                  <Label>Mot de passe *</Label>
                  <Input type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} placeholder="••••••••" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label>Email *</Label>
                  <Input type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} placeholder="email@exemple.com" />
                </div>
                <div className="grid gap-1">
                  <Label>Téléphone</Label>
                  <Input value={createPhone} onChange={(e) => setCreatePhone(e.target.value)} placeholder="+225..." />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Fonction</Label>
                <Select value={createFonction} onValueChange={setCreateFonction}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enseignant">Enseignant</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="coranique">Coranique</SelectItem>
                    <SelectItem value="surveillance">Surveillance</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="direction">Direction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label className="flex items-center gap-1 text-sky-800 dark:text-sky-300">
                    <MapPin className="w-3.5 h-3.5 text-sky-600" />
                    Ville
                  </Label>
                  <Select
                    value={createCity}
                    onValueChange={(val) => {
                      setCreateCity(val);
                      const citySchools = val && val !== 'all'
                        ? schoolsList.filter(s => (s.city || '').toLowerCase().trim() === val.toLowerCase().trim())
                        : schoolsList;
                      if (citySchools.length > 0) {
                        setCreateSchoolId(String(citySchools[0].id));
                      } else {
                        setCreateSchoolId('');
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes les villes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les villes</SelectItem>
                      {createCityOptions.map(city => {
                        const count = schoolsList.filter(s => (s.city || '').toLowerCase().trim() === city.toLowerCase().trim()).length;
                        return (
                          <SelectItem key={city} value={city}>
                            📍 {city} ({count} école{count > 1 ? 's' : ''})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1">
                  <Label className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-primary" />
                    Établissement {createCity && createCity !== 'all' && `(${filteredCreateSchools.length})`}
                  </Label>
                  <Select value={createSchoolId} onValueChange={setCreateSchoolId}>
                    <SelectTrigger>
                      <SelectValue placeholder={filteredCreateSchools.length === 0 ? "Aucune école" : "Choisir un établissement"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCreateSchools.map((school) => (
                        <SelectItem key={school.id} value={String(school.id)}>
                          {school.name.replace('École Confessionnelle HINNEH ', '').replace('Ecole Confessionnelle HINNEH ', '')} ({school.city || 'N/A'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label>Charge horaire (h/semaine)</Label>
                  <Input type="number" value={createChargeHoraire} onChange={(e) => setCreateChargeHoraire(parseInt(e.target.value) || 0)} />
                </div>
                <div className="grid gap-1">
                  <Label>Statut</Label>
                  <Select value={createStatus} onValueChange={createStatus => setCreateStatus(createStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="conge">Congé</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateStaffOpen(false)}>Annuler</Button>
              <Button onClick={handleCreateStaffSubmit}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={deleteStaffOpen} onOpenChange={setDeleteStaffOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la suppression</DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir supprimer <strong>{formatStudentName(selectedStaff)}</strong> ?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteStaffOpen(false)}>Annuler</Button>
              <Button variant="destructive" onClick={handleDeleteStaff}>Supprimer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <motion.div variants={fadeInUp} initial="hidden" animate="visible">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle>Présences personnel - Semaine en cours</CardTitle>
              </div>
              <CardDescription>
                Vue hebdomadaire des présences du personnel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Personnel</th>
                      {weekDays.map((day) => (
                        <th key={day} className="text-center py-3 px-4 font-semibold">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentWeekStaff.map((staff) => (
                      <tr key={staff.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {staff.lastName[0]}{staff.firstName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-sm">
                                {formatStudentName(staff)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {getFonctionLabel(staff.fonction)}
                              </div>
                            </div>
                          </div>
                        </td>
                        {weekDays.map((_, dayIndex) => {
                          const isPresent = Math.random() > 0.1;
                          return (
                            <td key={dayIndex} className="text-center py-3 px-4">
                              <div
                                className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
                                  isPresent
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}
                              >
                                {isPresent ? '✓' : '✗'}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp} initial="hidden" animate="visible">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                <CardTitle>Évaluations du personnel</CardTitle>
              </div>
              <CardDescription>
                Dernières évaluations et recommandations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={evaluationColumns} data={evaluations} searchable />
            </CardContent>
          </Card>
        </motion.div>

        {/* Pending Staff Detail Dialog */}
        <Dialog open={!!viewPendingStaff} onOpenChange={(open) => !open && setViewPendingStaff(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader className="border-b pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full border-2 border-amber-400 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-base shadow-xs shrink-0">
                    {viewPendingStaff ? `${(viewPendingStaff.firstName || 'P')[0] || ''}${(viewPendingStaff.lastName || 'S')[0] || ''}`.toUpperCase() : ''}
                  </div>
                  <div>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                      Dossier d'inscription : {viewPendingStaff ? formatStudentName(viewPendingStaff) : ''}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1 text-amber-600 font-medium">
                        <Clock className="w-3.5 h-3.5" /> En attente de validation RH
                      </span>
                      {viewPendingStaff?.email && <span>• {viewPendingStaff.email}</span>}
                    </DialogDescription>
                  </div>
                </div>
                {viewPendingStaff && (
                  <Badge className={`text-xs px-3 py-1 font-bold border ${getRoleBadge(viewPendingStaff.fonction).color}`}>
                    {getRoleBadge(viewPendingStaff.fonction).label}
                  </Badge>
                )}
              </div>
            </DialogHeader>

            {viewPendingStaff && (
              <div className="space-y-6 py-4">
                {/* Section 1: Etat Civil & Identification */}
                <div className="border rounded-lg p-4 bg-muted/20">
                  <h3 className="font-semibold text-primary mb-3 flex items-center gap-2 border-b pb-2">
                    <Users className="h-4 w-4" />
                    Identification & État Civil
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground block text-xs">Nom Complet</span>
                      <strong className="text-foreground">{formatStudentName(viewPendingStaff)}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Genre</span>
                      <strong className="text-foreground">{viewPendingStaff.disponibilites?.genre || 'M'}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Date & Lieu de Naissance</span>
                      <strong className="text-foreground">
                        {viewPendingStaff.disponibilites?.dateNaissance || 'N/A'} {viewPendingStaff.disponibilites?.lieuNaissance ? `à ${viewPendingStaff.disponibilites.lieuNaissance}` : ''}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Nationalité</span>
                      <strong className="text-foreground">{viewPendingStaff.disponibilites?.nationalite || 'Ivoirienne'}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Diplôme</span>
                      <strong className="text-foreground">
                        {viewPendingStaff.disponibilites?.diplome || 'N/A'} {viewPendingStaff.disponibilites?.anneeObtention ? `(${viewPendingStaff.disponibilites.anneeObtention})` : ''}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">N° Autorisation d'Enseigner</span>
                      <strong className="text-foreground">{viewPendingStaff.disponibilites?.autorisationEnseigner || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">N° Autorisation d'Exercer</span>
                      <strong className="text-foreground">{viewPendingStaff.disponibilites?.autorisationExercer || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Situation Matrimoniale</span>
                      <strong className="text-foreground capitalize">{viewPendingStaff.disponibilites?.situationMatrimoniale || 'Célibataire'}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Enfants à charge</span>
                      <strong className="text-foreground">{viewPendingStaff.disponibilites?.enfantsCharge || '0'}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Type & N° de Pièce</span>
                      <strong className="text-foreground">
                        {viewPendingStaff.disponibilites?.cniType || 'CNI'} : {viewPendingStaff.disponibilites?.cniNumero || 'N/A'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Délivré le / à</span>
                      <strong className="text-foreground">
                        {viewPendingStaff.disponibilites?.cniDelivreLe || 'N/A'} {viewPendingStaff.disponibilites?.cniDelivreA ? `à ${viewPendingStaff.disponibilites.cniDelivreA}` : ''}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Section 2: Professionnel & Contrat */}
                <div className="border rounded-lg p-4 bg-muted/20">
                  <h3 className="font-semibold text-primary mb-3 flex items-center gap-2 border-b pb-2">
                    <Briefcase className="h-4 w-4" />
                    Informations Service & Contrat
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground block text-xs">Établissement</span>
                      <strong className="text-foreground">
                        {schoolsList.find((s) => s.id === viewPendingStaff.schoolId)?.name || 'N/A'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Département & Service</span>
                      <strong className="text-foreground">
                        {viewPendingStaff.disponibilites?.departement || 'N/A'} / {viewPendingStaff.disponibilites?.service || 'N/A'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Fonction de base</span>
                      <strong className="text-foreground capitalize">{viewPendingStaff.fonction}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Fonction exercée précise</span>
                      <strong className="text-foreground">{viewPendingStaff.disponibilites?.fonctionExercee || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Nature du Contrat</span>
                      <strong className="text-foreground">{viewPendingStaff.disponibilites?.natureContrat || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Date d'entrée & Ancienneté</span>
                      <strong className="text-foreground">
                        {viewPendingStaff.disponibilites?.dateEntree || 'N/A'} {viewPendingStaff.disponibilites?.anciennete ? `(${viewPendingStaff.disponibilites.anciennete})` : ''}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Affiliation CNPS</span>
                      <strong className="text-foreground">
                        {viewPendingStaff.disponibilites?.cnpsStatut || 'NON'} {viewPendingStaff.disponibilites?.cnpsNumero ? `(N°: ${viewPendingStaff.disponibilites.cnpsNumero})` : ''}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Section 3: Contacts & Résidence */}
                <div className="border rounded-lg p-4 bg-muted/20">
                  <h3 className="font-semibold text-primary mb-3 flex items-center gap-2 border-b pb-2">
                    <Calendar className="h-4 w-4" />
                    Coordonnées & Résidence
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground block text-xs">Téléphone Portable</span>
                      <strong className="text-foreground">{viewPendingStaff.phone}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Téléphone Fixe</span>
                      <strong className="text-foreground">{viewPendingStaff.disponibilites?.telephoneFixe || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Email</span>
                      <strong className="text-foreground">{viewPendingStaff.email}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Adresse / Quartier</span>
                      <strong className="text-foreground">
                        {viewPendingStaff.disponibilites?.commune || 'N/A'}, {viewPendingStaff.disponibilites?.lieuResidence || 'N/A'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Sous-quartier & Lot</span>
                      <strong className="text-foreground">
                        {viewPendingStaff.disponibilites?.sousQuartier || 'N/A'} {viewPendingStaff.disponibilites?.lot ? `(Lot ${viewPendingStaff.disponibilites.lot})` : ''}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Boîte Postale</span>
                      <strong className="text-foreground">{viewPendingStaff.disponibilites?.boitePostale || 'N/A'}</strong>
                    </div>
                    <div className="col-span-2 sm:col-span-3">
                      <span className="text-muted-foreground block text-xs">En cas d'accident, prévenir</span>
                      <strong className="text-foreground">{viewPendingStaff.disponibilites?.personneAccident || 'N/A'}</strong>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 border-t pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setViewPendingStaff(null)}
                  >
                    Fermer
                  </Button>
                  <Button
                    variant="destructive"
                    className="gap-1.5"
                    onClick={() => handleRejeterStaff(viewPendingStaff.id)}
                  >
                    <X className="h-4 w-4" />
                    Rejeter
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                    onClick={() => handleValiderStaff(viewPendingStaff.id)}
                  >
                    <Check className="h-4 w-4" />
                    Valider le dossier
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
