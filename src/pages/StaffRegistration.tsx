import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Moon, ArrowLeft, CheckCircle, Briefcase, FileText, Heart, Home, Key, MapPin, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatStudentName, ROUTE_PATHS } from '@/lib/index';
import { useToast } from '@/hooks/use-toast';
import { IMAGES } from '@/assets/images';
import apiClient from '@/lib/apiClient';

export default function StaffRegistration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<any[]>([]);
  const [villes, setVilles] = useState<any[]>([]);
  const [selectedVille, setSelectedVille] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'professionnel' | 'identification' | 'famille' | 'residence' | 'compte'>('professionnel');
  const [successData, setSuccessData] = useState<{ name: string; username: string; matricule: string } | null>(null);
  const [selectedEcoles, setSelectedEcoles] = useState<number[]>([]);
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('all');

  const toggleEcoleSelection = (id: number) => {
    setSelectedEcoles(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Form Fields matching Fiche d'identification de l'enseignant (Page 2)
  const [formData, setFormData] = useState({
    // Account details
    username: '',
    password: '',
    confirmPassword: '',

    // Professionnel & Service
    ville: '',
    ecoleId: '',
    departement: '',
    service: '',
    fonction: 'enseignant', // Rôle/Fonction de base (enseignant, administration, direction, comptable, rh)
    fonctionExercee: '', // Fonction exercée précise
    natureContrat: '',
    dateEntree: '',
    anciennete: '',
    cnpsStatut: 'NON', // 'NON' | 'OUI'
    cnpsNumero: '',

    // Identification
    nom: '',
    prenom: '',
    genre: 'M',
    dateNaissance: '',
    lieuNaissance: '',
    nationalite: 'Ivoirienne',
    diplome: '',
    anneeObtention: '',
    autorisationEnseigner: '', // Numéro d’autorisation d’enseigner
    autorisationExercer: '',   // Numéro d’autorisation d’exercer
    matriculeInterne: '', // N° Matricule
    cniType: 'CNI', // 'CNI' | 'Passeport' | 'Attestation'
    cniNumero: '',
    cniDelivreLe: '',
    cniDelivreA: '',
    situationMatrimoniale: 'celibataire',

    // Famille & Urgences
    enfantsCharge: '',
    pereNomProfession: '',
    mereNomProfession: '',
    personneAccident: '',

    // Residence & Contacts
    lieuResidence: '',
    telephoneFixe: '',
    telephoneCel: '',
    commune: '',
    sousQuartier: '',
    operationImmobiliere: '',
    lot: '',
    boitePostale: '',
    email: ''
  });

  const normalizeCity = (c: string) =>
    (c || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [schoolsData, villesData] = await Promise.all([
          apiClient.getAllSchools().catch(() => []),
          apiClient.getVilles().catch(() => []),
        ]);
        setSchools(schoolsData);
        setVilles(villesData);
      } catch (err) {
        console.error("Failed to load schools and villes:", err);
      }
    };
    fetchData();
  }, []);

  const cityOptions = useMemo(() => {
    // Afficher TOUTES les villes du réseau (depuis table villes et depuis écoles)
    const map = new Map<string, string>();

    // Priorité aux villes de la table villes (source de vérité)
    if (villes && villes.length > 0) {
      villes.forEach((v: any) => {
        if (v.libelle && v.libelle.trim()) {
          const key = normalizeCity(v.libelle);
          if (!map.has(key)) map.set(key, v.libelle.trim());
        }
      });
    }

    // Compléter avec les villes renseignées dans les écoles
    if (schools && schools.length > 0) {
      schools.forEach((s: any) => {
        if (s.city && s.city.trim()) {
          const key = normalizeCity(s.city);
          if (!map.has(key)) map.set(key, s.city.trim());
        }
      });
    }

    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [schools, villes]);

  const filteredSchools = useMemo(() => {
    if (!selectedVille || selectedVille === 'all') return schools;
    const target = normalizeCity(selectedVille);
    return schools.filter(s => normalizeCity(s.city) === target);
  }, [schools, selectedVille]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!formData.prenom || !formData.nom || !formData.email || !formData.telephoneCel || !formData.username || !formData.password) {
      toast({
        variant: "destructive",
        title: "Champs manquants",
        description: "Veuillez remplir les informations de compte obligatoires (Nom, Prénom, Téléphone Cél, Email, Nom d'utilisateur et Mot de passe).",
      });
      setActiveTab('compte');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Mot de passe incorrect",
        description: "Les mots de passe saisis ne correspondent pas.",
      });
      setActiveTab('compte');
      return;
    }

    setLoading(true);
    try {
      // Serialize all extra teacher card info inside disponibilites JSON column
      const extraAttributes = {
        departement: formData.departement,
        service: formData.service,
        fonctionExercee: formData.fonctionExercee,
        natureContrat: formData.natureContrat,
        dateEntree: formData.dateEntree,
        anciennete: formData.anciennete,
        cnpsStatut: formData.cnpsStatut,
        cnpsNumero: formData.cnpsNumero,
        lieuNaissance: formData.lieuNaissance,
        diplome: formData.diplome,
        anneeObtention: formData.anneeObtention,
        autorisationEnseigner: formData.autorisationEnseigner,
        autorisationExercer: formData.autorisationExercer,
        matriculeInterne: "HEP2026" + Math.floor(1000 + Math.random() * 9000),
        cniType: formData.cniType,
        cniNumero: formData.cniNumero,
        cniDelivreLe: formData.cniDelivreLe,
        cniDelivreA: formData.cniDelivreA,
        situationMatrimoniale: formData.situationMatrimoniale,
        enfantsCharge: formData.enfantsCharge,
        pereNomProfession: formData.pereNomProfession,
        mereNomProfession: formData.mereNomProfession,
        personneAccident: formData.personneAccident,
        lieuResidence: formData.lieuResidence,
        telephoneFixe: formData.telephoneFixe,
        commune: formData.commune,
        sousQuartier: formData.sousQuartier,
        operationImmobiliere: formData.operationImmobiliere,
        lot: formData.lot,
        boitePostale: formData.boitePostale
      };

      const finalEcoles = selectedEcoles.length > 0 
        ? selectedEcoles 
        : (formData.ecoleId ? [Number(formData.ecoleId)] : []);

      const payload = {
        username: formData.username,
        password: formData.password,
        prenom: formData.prenom,
        nom: formData.nom,
        email: formData.email,
        telephone: formData.telephoneCel,
        fonction: formData.fonction,
        ecole_id: formData.ecoleId ? Number(formData.ecoleId) : (finalEcoles[0] || null),
        ecoles_autorisees: finalEcoles,
        statut: 'en_attente',
        charge_horaire: 0,
        disponibilites: extraAttributes
      };

      await apiClient.createStaff(payload);
      setSuccessData({
        name: `${formatStudentName(formData)}`,
        username: formData.username,
        matricule: extraAttributes.matriculeInterne
      });
      toast({
        title: "Demande soumise avec succès !",
        description: "Votre dossier est en attente de validation par le responsable des Ressources Humaines.",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Échec de l'inscription",
        description: err.response?.data?.detail || "Une erreur est survenue lors de l'enregistrement de votre fiche d'identification.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1">

        {/* Panneau gauche – Branding */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="hidden lg:flex lg:w-1/3 relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80"
        >
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="islamic-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                  <path
                    d="M50 0 L60 20 L80 20 L65 32 L70 50 L50 40 L30 50 L35 32 L20 20 L40 20 Z"
                    fill="currentColor" opacity="0.3"
                  />
                  <circle cx="50" cy="50" r="8" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#islamic-pattern)" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col justify-center items-center w-full px-12 text-white text-center">
            <div className="flex justify-center mb-6">
              <Star className="w-20 h-20" strokeWidth={1.5} />
            </div>
            <h1 className="text-4xl font-bold mb-3">HÎNNEH ÉDUCATION</h1>
            <p className="text-lg opacity-90 mb-6">Fiche d'Identification de l'Enseignant & Personnel</p>
            <div className="w-20 h-0.5 bg-white/30 mx-auto mb-6" />
            <p className="text-md opacity-80 max-w-sm mx-auto">
              Portail d'identification des ressources humaines
            </p>
          </div>
        </motion.div>

        {/* Panneau droit – Formulaire */}
        <div className="w-full lg:w-2/3 flex flex-col p-8 md:p-12 overflow-y-auto max-h-screen">
          <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col">

            {/* Header Formulaire */}
            <div className="flex flex-col md:flex-row items-center justify-between border-b pb-6 mb-6 gap-4">
              <div className="flex items-center gap-4">
                <img src={IMAGES.HINNEH_LOGO_20260507_234919_1} alt="Logo" className="h-16 w-16 object-contain" />
                <div>
                  <h2 className="text-xl font-bold text-foreground">FICHE D'IDENTIFICATION DU TRAVAILLEUR</h2>
                  <p className="text-xs text-muted-foreground">Groupe Scolaire Confessionnel Hinneh · Côte d'Ivoire</p>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => navigate(ROUTE_PATHS.LOGIN)}
                className="gap-2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour
              </Button>
            </div>

            {successData ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="my-auto p-8 rounded-2xl border border-primary/20 bg-primary/5 text-center space-y-6 max-w-md mx-auto"
              >
                <div className="flex justify-center">
                  <CheckCircle className="w-16 h-16 text-green-500" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">Compte Personnel Enregistré !</h3>
                <p className="text-sm text-muted-foreground">
                  Le travailleur <strong className="text-foreground">{successData.name}</strong> a été enregistré avec succès.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-background border font-mono text-center space-y-1">
                    <span className="block text-xs text-muted-foreground font-sans">NOM D'UTILISATEUR</span>
                    <span className="text-lg font-bold text-primary">{successData.username}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-background border font-mono text-center space-y-1">
                    <span className="block text-xs text-muted-foreground font-sans">N° MATRICULE TRAVAILLEUR</span>
                    <span className="text-lg font-bold text-primary">{successData.matricule}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Vous pouvez désormais vous connecter immédiatement sur la plateforme Hînneh Éducation en utilisant ces identifiants de connexion.
                </p>
                <Button
                  onClick={() => navigate(ROUTE_PATHS.LOGIN)}
                  className="w-full"
                >
                  Aller à la page de connexion
                </Button>
              </motion.div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-6 flex-1 flex flex-col justify-between">

                {/* Onglets (Tabs) */}
                <div className="flex border-b overflow-x-auto gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('professionnel')}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
                      activeTab === 'professionnel'
                        ? 'border-primary text-primary font-bold'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Briefcase className="w-4 h-4" />
                    1. Poste & Service
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('identification')}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
                      activeTab === 'identification'
                        ? 'border-primary text-primary font-bold'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    2. Identification / Diplômes
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('famille')}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
                      activeTab === 'famille'
                        ? 'border-primary text-primary font-bold'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Heart className="w-4 h-4" />
                    3. Famille & Urgences
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('residence')}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
                      activeTab === 'residence'
                        ? 'border-primary text-primary font-bold'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Home className="w-4 h-4" />
                    4. Résidence & Coordonnées
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('compte')}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
                      activeTab === 'compte'
                        ? 'border-primary text-primary font-bold'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Key className="w-4 h-4" />
                    5. Identifiants de Connexion
                  </button>
                </div>

                {/* Contenu des onglets */}
                <div className="py-4 flex-1">

                  {/* TAB 1: PROFESSIONNEL & SERVICE */}
                  {activeTab === 'professionnel' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                      
                      {/* SECTION 1 : VILLE & ÉTABLISSEMENT(S) DE RATTACHEMENT (MULTI-SÉLECTION) */}
                      <div className="p-4 bg-sky-50/70 dark:bg-sky-950/30 rounded-2xl border border-sky-200 dark:border-sky-800 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                          
                          {/* 1. Sélection de la Ville */}
                          <div className="space-y-2">
                            <Label htmlFor="selectedVille" className="font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5 text-sm">
                              <MapPin className="w-4 h-4 text-sky-600" />
                              Ville de rattachement *
                            </Label>
                            <Select
                              value={selectedVille}
                              onValueChange={(val) => {
                                setSelectedVille(val);
                                setSelectedCityFilter(val);
                                if (val && val !== 'all') {
                                  handleChange('lieuResidence', val);
                                  handleChange('commune', val);
                                  const target = normalizeCity(val);
                                  const citySchools = schools.filter(s => normalizeCity(s.city) === target);
                                  if (citySchools.length > 0) {
                                    handleChange('ecoleId', String(citySchools[0].id));
                                    // Par défaut, cocher toutes les écoles de la ville
                                    setSelectedEcoles(citySchools.map(s => Number(s.id)));
                                  } else {
                                    handleChange('ecoleId', '');
                                    setSelectedEcoles([]);
                                  }
                                } else if (val === 'all') {
                                  setSelectedEcoles(schools.map(s => Number(s.id)));
                                  if (schools.length > 0) {
                                    handleChange('ecoleId', String(schools[0].id));
                                  }
                                }
                              }}
                            >
                              <SelectTrigger id="selectedVille" className="border-sky-300 dark:border-sky-700 bg-background font-medium">
                                <SelectValue placeholder="-- Choisir la ville --" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Toutes les villes ({schools.length} écoles)</SelectItem>
                                {cityOptions.map((city) => {
                                  const target = normalizeCity(city);
                                  const count = schools.filter(s => normalizeCity(s.city) === target).length;
                                  return (
                                    <SelectItem key={city} value={city}>
                                      📍 {city} ({count} école{count > 1 ? 's' : ''})
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            <p className="text-[11px] text-muted-foreground">
                              {selectedVille && selectedVille !== 'all' 
                                ? `${filteredSchools.length} école(s) liée(s) à ${selectedVille}.`
                                : "Sélectionnez une ville pour choisir ses écoles."}
                            </p>
                          </div>

                          {/* 2. Sélection d'une ou plusieurs Écoles pour cette Ville */}
                          <div className="md:col-span-2 space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="font-bold text-sky-950 dark:text-sky-100 flex items-center gap-1.5 text-sm">
                                <Building className="w-4 h-4 text-primary" />
                                Établissement(s) de la ville * ({selectedEcoles.length} sélectionné{selectedEcoles.length > 1 ? 's' : ''})
                              </Label>
                              {filteredSchools.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const citySchoolIds = filteredSchools.map(s => Number(s.id));
                                    const allChecked = citySchoolIds.every(id => selectedEcoles.includes(id));
                                    if (allChecked) {
                                      // Tout décocher
                                      setSelectedEcoles(prev => prev.filter(id => !citySchoolIds.includes(id)));
                                      handleChange('ecoleId', '');
                                    } else {
                                      // Tout cocher
                                      setSelectedEcoles(prev => Array.from(new Set([...prev, ...citySchoolIds])));
                                      if (!formData.ecoleId && citySchoolIds.length > 0) {
                                        handleChange('ecoleId', String(citySchoolIds[0]));
                                      }
                                    }
                                  }}
                                  className="text-[11px] font-bold text-sky-700 dark:text-sky-300 hover:underline cursor-pointer"
                                >
                                  {filteredSchools.every(s => selectedEcoles.includes(Number(s.id)))
                                    ? 'Tout désélectionner'
                                    : `Tout sélectionner (${filteredSchools.length} écoles)`}
                                </button>
                              )}
                            </div>

                            {filteredSchools.length === 0 ? (
                              <div className="p-4 border border-dashed rounded-xl text-center text-xs text-muted-foreground bg-background">
                                📍 Veuillez d'abord choisir une ville à gauche pour afficher ses écoles.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                                {filteredSchools.map((sch) => {
                                  const schNumId = Number(sch.id);
                                  const isChecked = selectedEcoles.includes(schNumId);
                                  const isPrincipal = String(formData.ecoleId) === String(sch.id);

                                  return (
                                    <div
                                      key={sch.id}
                                      onClick={() => {
                                        toggleEcoleSelection(schNumId);
                                        if (!isChecked && !formData.ecoleId) {
                                          handleChange('ecoleId', String(sch.id));
                                        } else if (isChecked && isPrincipal) {
                                          const remaining = selectedEcoles.filter(x => x !== schNumId);
                                          handleChange('ecoleId', remaining.length > 0 ? String(remaining[0]) : '');
                                        }
                                      }}
                                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                                        isChecked
                                          ? 'bg-sky-100/90 dark:bg-sky-900/50 border-sky-400 dark:border-sky-600 text-sky-950 dark:text-sky-100 font-medium shadow-sm'
                                          : 'bg-background border-border text-muted-foreground hover:border-sky-300 hover:bg-sky-50/30'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          toggleEcoleSelection(schNumId);
                                          if (!isChecked && !formData.ecoleId) {
                                            handleChange('ecoleId', String(sch.id));
                                          } else if (isChecked && isPrincipal) {
                                            const remaining = selectedEcoles.filter(x => x !== schNumId);
                                            handleChange('ecoleId', remaining.length > 0 ? String(remaining[0]) : '');
                                          }
                                        }}
                                        className="w-4 h-4 mt-0.5 rounded text-sky-600 focus:ring-sky-500 cursor-pointer shrink-0"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="font-bold truncate text-xs">{sch.name}</span>
                                          {isPrincipal && (
                                            <span className="text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-bold shrink-0">
                                              ★ Principale
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                                          <span>Code: {sch.code || 'N/A'} • {sch.city}</span>
                                          {isChecked && !isPrincipal && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleChange('ecoleId', String(sch.id));
                                              }}
                                              className="text-[10px] text-primary hover:underline font-semibold"
                                            >
                                              Définir principale
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* SECTION 2 : RÔLE SYSTÈME & FONCTION EXERCÉE */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="fonction" className="font-bold">Rôle système de base *</Label>
                          <Select
                            value={formData.fonction}
                            onValueChange={(val) => handleChange('fonction', val)}
                          >
                            <SelectTrigger id="fonction">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="enseignant">Enseignant</SelectItem>
                              <SelectItem value="educateur">Éducateur</SelectItem>
                              <SelectItem value="direction">Directeur d'école</SelectItem>
                              <SelectItem value="comptable">Comptable</SelectItem>
                              <SelectItem value="rh">Ressources Humaines (RH)</SelectItem>
                              <SelectItem value="aumonier">Aumônier / Guide Spirituel</SelectItem>
                              <SelectItem value="informaticien">Informaticien / Service IT</SelectItem>
                              <SelectItem value="scolarite">Service Scolarité</SelectItem>
                              <SelectItem value="caisse">Agent Caissier</SelectItem>
                              <SelectItem value="secretaire">Secrétaire</SelectItem>
                              <SelectItem value="accueil">Accueil & Réception</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="fonctionExercee">Fonction exercée précise</Label>
                          <Input
                            id="fonctionExercee"
                            placeholder="Ex: Professeur de Mathématiques"
                            value={formData.fonctionExercee}
                            onChange={(e) => handleChange('fonctionExercee', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* SECTION 3 : DÉPARTEMENT & SERVICE */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="departement">Département / Direction</Label>
                          <Input
                            id="departement"
                            placeholder="Ex: Département Arabe / Secondaire"
                            value={formData.departement}
                            onChange={(e) => handleChange('departement', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="service">Service</Label>
                          <Input
                            id="service"
                            placeholder="Ex: Pédagogie / Administration"
                            value={formData.service}
                            onChange={(e) => handleChange('service', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="natureContrat">Nature du contrat</Label>
                          <Input
                            id="natureContrat"
                            placeholder="Ex: CDD, CDI, Vacataire"
                            value={formData.natureContrat}
                            onChange={(e) => handleChange('natureContrat', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dateEntree">Date d'entrée dans l'entreprise</Label>
                          <Input
                            id="dateEntree"
                            type="date"
                            value={formData.dateEntree}
                            onChange={(e) => handleChange('dateEntree', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="anciennete">Ancienneté dans la fonction</Label>
                        <Input
                          id="anciennete"
                          placeholder="Ex: 3 ans"
                          value={formData.anciennete}
                          onChange={(e) => handleChange('anciennete', e.target.value)}
                        />
                      </div>

                      <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Sécurité Sociale (CNPS)</span>
                        <div className="grid grid-cols-2 gap-4 items-end">
                          <div className="space-y-1">
                            <Label htmlFor="cnpsStatut">Matricule CNPS</Label>
                            <Select value={formData.cnpsStatut} onValueChange={(val) => handleChange('cnpsStatut', val)}>
                              <SelectTrigger id="cnpsStatut">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NON">Non (NON)</SelectItem>
                                <SelectItem value="OUI">Oui (OUI)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {formData.cnpsStatut === 'OUI' && (
                            <div className="space-y-1">
                              <Label htmlFor="cnpsNumero">Numéro CNPS</Label>
                              <Input
                                id="cnpsNumero"
                                placeholder="N° CNPS"
                                value={formData.cnpsNumero}
                                onChange={(e) => handleChange('cnpsNumero', e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 2: IDENTIFICATION */}
                  {activeTab === 'identification' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="nom">Nom de famille *</Label>
                          <Input
                            id="nom"
                            placeholder="Nom"
                            value={formData.nom}
                            onChange={(e) => handleChange('nom', e.target.value.toUpperCase())}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="prenom">Prénoms *</Label>
                          <Input
                            id="prenom"
                            placeholder="Prénoms"
                            value={formData.prenom}
                            onChange={(e) => handleChange('prenom', e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="genre">Genre *</Label>
                          <Select value={formData.genre} onValueChange={(val) => handleChange('genre', val)}>
                            <SelectTrigger id="genre">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="M">Masculin</SelectItem>
                              <SelectItem value="F">Féminin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dateNaissance">Date de naissance *</Label>
                          <Input
                            id="dateNaissance"
                            type="date"
                            value={formData.dateNaissance}
                            onChange={(e) => handleChange('dateNaissance', e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lieuNaissance">Lieu de naissance</Label>
                          <Input
                            id="lieuNaissance"
                            placeholder="Lieu de naissance"
                            value={formData.lieuNaissance}
                            onChange={(e) => handleChange('lieuNaissance', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="nationalite">Nationalité</Label>
                          <Input
                            id="nationalite"
                            placeholder="Nationalité"
                            value={formData.nationalite}
                            onChange={(e) => handleChange('nationalite', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="situationMatrimoniale">Situation matrimoniale</Label>
                          <Select
                            value={formData.situationMatrimoniale}
                            onValueChange={(val) => handleChange('situationMatrimoniale', val)}
                          >
                            <SelectTrigger id="situationMatrimoniale">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="celibataire">Célibataire</SelectItem>
                              <SelectItem value="marie">Marié(e)</SelectItem>
                              <SelectItem value="divorce">Divorcé(e)</SelectItem>
                              <SelectItem value="veuf">Veuf(ve)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Pièce d'Identité</span>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="space-y-1">
                            <Label htmlFor="cniType">Type de pièce</Label>
                            <Select value={formData.cniType} onValueChange={(val) => handleChange('cniType', val)}>
                              <SelectTrigger id="cniType">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CNI">CNI</SelectItem>
                                <SelectItem value="Passeport">Passeport</SelectItem>
                                <SelectItem value="Attestation">Attestation</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1 col-span-2">
                            <Label htmlFor="cniNumero">N° de Pièce</Label>
                            <Input
                              id="cniNumero"
                              placeholder="Numéro"
                              value={formData.cniNumero}
                              onChange={(e) => handleChange('cniNumero', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="cniDelivreLe">Délivré le</Label>
                            <Input
                              id="cniDelivreLe"
                              type="date"
                              value={formData.cniDelivreLe}
                              onChange={(e) => handleChange('cniDelivreLe', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="cniDelivreA">Délivré à (Lieu)</Label>
                          <Input
                            id="cniDelivreA"
                            placeholder="Lieu de délivrance"
                            value={formData.cniDelivreA}
                            onChange={(e) => handleChange('cniDelivreA', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1 col-span-2">
                          <Label htmlFor="diplome">Dernier diplôme scolaire et universitaire obtenu</Label>
                          <Input
                            id="diplome"
                            placeholder="Ex: Master en Enseignement"
                            value={formData.diplome}
                            onChange={(e) => handleChange('diplome', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="anneeObtention">Année d'obtention</Label>
                          <Input
                            id="anneeObtention"
                            placeholder="Année"
                            value={formData.anneeObtention}
                            onChange={(e) => handleChange('anneeObtention', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="matriculeInterne">N° Matricule *</Label>
                          <Input
                            id="matriculeInterne"
                            placeholder="[Généré automatiquement à la validation]"
                            disabled
                            className="bg-muted text-muted-foreground font-semibold"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="autorisationEnseigner">Numéro d’autorisation d’enseigner</Label>
                          <Input
                            id="autorisationEnseigner"
                            placeholder="Ex: AE-2026-9874"
                            value={formData.autorisationEnseigner}
                            onChange={(e) => handleChange('autorisationEnseigner', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="autorisationExercer">Numéro d’autorisation d’exercer</Label>
                          <Input
                            id="autorisationExercer"
                            placeholder="Ex: AX-2026-5412"
                            value={formData.autorisationExercer}
                            onChange={(e) => handleChange('autorisationExercer', e.target.value)}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 3: FAMILLE & URGENCES */}
                  {activeTab === 'famille' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="enfantsCharge">Liste des enfants mineurs à charge</Label>
                        <Input
                          id="enfantsCharge"
                          placeholder="Ex: Jean (10 ans), Marie (6 ans)..."
                          value={formData.enfantsCharge}
                          onChange={(e) => handleChange('enfantsCharge', e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="pereNomProfession">Nom et profession du père</Label>
                          <Input
                            id="pereNomProfession"
                            placeholder="Père (Nom et Job)"
                            value={formData.pereNomProfession}
                            onChange={(e) => handleChange('pereNomProfession', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="mereNomProfession">Nom et profession de la mère</Label>
                          <Input
                            id="mereNomProfession"
                            placeholder="Mère (Nom et Job)"
                            value={formData.mereNomProfession}
                            onChange={(e) => handleChange('mereNomProfession', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 space-y-2">
                        <span className="text-xs font-bold text-destructive uppercase tracking-wider block">Personne à contacter en cas d'accident *</span>
                        <div className="space-y-1">
                          <Label htmlFor="personneAccident">Nom complet et adresse / téléphone de la personne d'urgence</Label>
                          <Input
                            id="personneAccident"
                            placeholder="Ex: M. Kouamé (Frère) - +225 XX XX XX XX"
                            value={formData.personneAccident}
                            onChange={(e) => handleChange('personneAccident', e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 4: RESIDENCE & COORDONNEES */}
                  {activeTab === 'residence' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="telephoneCel">Téléphone Mobile (Cél) *</Label>
                          <Input
                            id="telephoneCel"
                            placeholder="+225..."
                            value={formData.telephoneCel}
                            onChange={(e) => handleChange('telephoneCel', e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="telephoneFixe">Téléphone Fixe</Label>
                          <Input
                            id="telephoneFixe"
                            placeholder="Téléphone fixe"
                            value={formData.telephoneFixe}
                            onChange={(e) => handleChange('telephoneFixe', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Adresse E-mail *</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="votre@email.com"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lieuResidence">Lieu de résidence Du travailleur</Label>
                          <Input
                            id="lieuResidence"
                            placeholder="Ex: Abidjan"
                            value={formData.lieuResidence}
                            onChange={(e) => handleChange('lieuResidence', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="commune">Commune de résidence *</Label>
                          <Input
                            id="commune"
                            placeholder="Ex: Cocody"
                            value={formData.commune}
                            onChange={(e) => handleChange('commune', e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sousQuartier">Sous quartier</Label>
                          <Input
                            id="sousQuartier"
                            placeholder="Ex: Angré"
                            value={formData.sousQuartier}
                            onChange={(e) => handleChange('sousQuartier', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1 col-span-2">
                          <Label htmlFor="operationImmobiliere">Opération Immobilière</Label>
                          <Input
                            id="operationImmobiliere"
                            placeholder="Ex: Cité Sir"
                            value={formData.operationImmobiliere}
                            onChange={(e) => handleChange('operationImmobiliere', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="lot">Lot (appartement)</Label>
                          <Input
                            id="lot"
                            placeholder="Lot"
                            value={formData.lot}
                            onChange={(e) => handleChange('lot', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="boitePostale">Boite Postale (B.P.)</Label>
                        <Input
                          id="boitePostale"
                          placeholder="Boite Postale"
                          value={formData.boitePostale}
                          onChange={(e) => handleChange('boitePostale', e.target.value)}
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 5: CREATION DU COMPTE CREDENTIALS */}
                  {activeTab === 'compte' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <div className="p-4 rounded-xl border bg-primary/5 space-y-2 text-center max-w-md mx-auto mb-4">
                        <span className="text-sm font-bold text-primary block">Créez vos Identifiants</span>
                        <p className="text-xs text-muted-foreground">
                          Ces informations vous serviront à vous connecter à votre Espace Personnel sécurisé Hînneh Éducation.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="username">Nom d'utilisateur / Login *</Label>
                        <Input
                          id="username"
                          placeholder="Ex: jean.kouame"
                          value={formData.username}
                          onChange={(e) => handleChange('username', e.target.value.toLowerCase())}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="password">Mot de passe de connexion *</Label>
                          <Input
                            id="password"
                            type="password"
                            placeholder="Minimum 6 caractères"
                            value={formData.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="Confirmer"
                            value={formData.confirmPassword}
                            onChange={(e) => handleChange('confirmPassword', e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                </div>

                {/* Boutons de navigation bas / validation */}
                <div className="flex items-center justify-between border-t pt-6 gap-2 mt-6">
                  <div>
                    {activeTab !== 'professionnel' && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (activeTab === 'identification') setActiveTab('professionnel');
                          else if (activeTab === 'famille') setActiveTab('identification');
                          else if (activeTab === 'residence') setActiveTab('famille');
                          else if (activeTab === 'compte') setActiveTab('residence');
                        }}
                      >
                        Précédent
                      </Button>
                    )}
                  </div>
                  <div>
                    {activeTab !== 'compte' ? (
                      <Button
                        type="button"
                        onClick={() => {
                          if (activeTab === 'professionnel') setActiveTab('identification');
                          else if (activeTab === 'identification') setActiveTab('famille');
                          else if (activeTab === 'famille') setActiveTab('residence');
                          else if (activeTab === 'residence') setActiveTab('compte');
                        }}
                      >
                        Suivant
                      </Button>
                    ) : (
                      <Button type="submit" disabled={loading} className="px-8 font-semibold">
                        {loading ? 'Création du compte...' : 'Envoyer ma Fiche d\'Identification'}
                      </Button>
                    )}
                  </div>
                </div>

              </form>
            )}

            {/* Footer */}
            <div className="mt-8 pt-6 border-t text-center text-xs text-muted-foreground">
              <p>© 2026 Macsys. Tous droits réservés.</p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
