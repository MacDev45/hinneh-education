import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Moon, ArrowLeft, CheckCircle, User, BookOpen, Users, Home, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatStudentName, ROUTE_PATHS } from '@/lib/index';
import { useToast } from '@/hooks/use-toast';
import { IMAGES } from '@/assets/images';
import { ThemeToggle } from '@/components/ThemeToggle';
import apiClient from '@/lib/apiClient';

export default function PreInscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rdvId = searchParams.get('rdv_id');
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [rdvInfo, setRdvInfo] = useState<{ numero_ticket: string; nom: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'identification' | 'scolarite' | 'parents' | 'residence'>('identification');
  const [successData, setSuccessData] = useState<{ name: string; matricule: string } | null>(null);

  // Form Fields matching Fiche d'inscription / api_eleve structure
  const [formData, setFormData] = useState({
    // Header
    typeInscription: 'inscription', // 'inscription' | 'reinscription'
    matriculeEcole: '', // If reinscription

    // Identification
    nom: '',
    prenom: '',
    genre: 'M',
    dateNaissance: '',
    lieuNaissance: '',
    nationalite: 'Ivoirienne',
    extraitNo: '',
    extraitDate: '',
    extraitLieu: '',
    handicap: 'NON', // 'NON' | 'moteur' | 'visuel' | 'auditif' | 'autre'
    autresHandicap: '',

    // Scolarite anterieure
    ecoleOrigine: '',
    classePrecedente: '',
    noTable: '',
    session: '',
    matriculeNational: '',
    niveauArabe: '',

    // Scolarite actuelle
    ecoleId: '',
    cycleFilter: '', // 'prescolaire' | 'primaire' | 'college1' | 'college2'
    classeASuivre: '',

    // Statut & Divers
    redoublant: 'NON', // 'NON' | 'OUI'
    statutAffecte: 'Non Affecté', // 'Affecté' | 'Réaffecté' | 'Non Affecté' | 'Transfert' | 'Régularisation' | 'Réintégration'
    priseEnCharge: false,
    originePriseEnCharge: '',

    // Contacts / Parents
    pereNom: '',
    pereProfession: '',
    pereBoitePostale: '',
    perePhone: '',
    pereEmail: '',

    mereNom: '',
    mereProfession: '',
    mereBoitePostale: '',
    merePhone: '',
    mereEmail: '',

    tuteurNom: '',
    tuteurProfession: '',
    tuteurBoitePostale: '',
    tuteurPhone: '',
    tuteurEmail: '',

    scolariteNom: '',
    scolariteProfession: '',
    scolariteBoitePostale: '',
    scolaritePhone: '',
    scolariteEmail: '',

    // Residence
    lieuResidence: 'pere_mere', // 'pere_mere' | 'pere' | 'mere' | 'tuteur'
    commune: '',
    quartier: '',
    lot: '',
    adresseText: '',
    telephonePrincipal: '',
    emailPrincipal: '',
    notesSante: ''
  });

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const schoolsData = await apiClient.getAllSchools();
        setSchools(schoolsData);
        if (schoolsData && schoolsData.length > 0) {
          handleChange('ecoleId', String(schoolsData[0].id));
        }
        const classesData = await apiClient.getClasses();
        setClasses(classesData);
      } catch (err) {
        console.error("Failed to load initial data:", err);
      }
    };
    loadInitialData();
  }, []);

  // Pré-remplissage à partir d'un rendez-vous en file d'attente (ouvert par le personnel depuis le suivi des inscriptions)
  useEffect(() => {
    if (!rdvId) return;
    const loadRdv = async () => {
      try {
        const rdv = await apiClient.getRendezVous(rdvId);
        setRdvInfo({ numero_ticket: rdv.numero_ticket, nom: rdv.nom });
        setFormData(prev => ({
          ...prev,
          tuteurNom: rdv.nom || prev.tuteurNom,
          tuteurPhone: rdv.telephone || prev.tuteurPhone,
          tuteurEmail: rdv.email || prev.tuteurEmail,
          telephonePrincipal: rdv.telephone || prev.telephonePrincipal,
          emailPrincipal: rdv.email || prev.emailPrincipal,
          ecoleId: rdv.ecole_id ? String(rdv.ecole_id) : prev.ecoleId,
        }));
      } catch (err) {
        console.error("Impossible de charger le rendez-vous associé :", err);
        toast({
          variant: 'destructive',
          title: 'Rendez-vous introuvable',
          description: "Le rendez-vous lié à ce lien n'a pas pu être chargé. Vous pouvez continuer la préinscription manuellement.",
        });
      }
    };
    loadRdv();
  }, [rdvId]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Reset selected class when school or cycle changes
  useEffect(() => {
    handleChange('classeASuivre', '');
  }, [formData.ecoleId, formData.cycleFilter]);

  // Helper: determine if class level is Collège 1er or 2e cycle
  const college1Niveaux = ['6ème', '6eme', '5ème', '5eme'];
  const college2Niveaux = ['4ème', '4eme', '3ème', '3eme'];

  // Compute filtered classes based on selected cycle
  const filteredClasses = classes.filter((cls: any) => {
    if (!formData.cycleFilter || !formData.ecoleId) return false;
    if (String(cls.ecole_id) !== String(formData.ecoleId)) return false;
    const cyLibelle = (cls.CY_LIBELLECYCLE || '').toLowerCase();
    const niveauLibelle = (cls.CE_LIBELLENIVEAU || cls.CE_LIBELLE || '').toLowerCase();
    switch (formData.cycleFilter) {
      case 'prescolaire': return cyLibelle.includes('maternelle') || cyLibelle.includes('préscolaire') || cyLibelle.includes('prescolaire');
      case 'primaire':    return cyLibelle.includes('primaire');
      case 'college1':   return cyLibelle.includes('coll') && college1Niveaux.some(n => niveauLibelle.includes(n.toLowerCase()));
      case 'college2':   return cyLibelle.includes('coll') && college2Niveaux.some(n => niveauLibelle.includes(n.toLowerCase()));
      default: return true;
    }
  });

  // Orientation is restricted for prescolaire and primaire
  const isPrescolaireOrPrimaire = formData.cycleFilter === 'prescolaire' || formData.cycleFilter === 'primaire';

  // If selected cycle is preschool/primary, reset orientation status to "Non Affecté"
  useEffect(() => {
    if (isPrescolaireOrPrimaire && formData.statutAffecte !== 'Non Affecté') {
      handleChange('statutAffecte', 'Non Affecté');
    }
  }, [isPrescolaireOrPrimaire, formData.statutAffecte]);

  const handlePreInscriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!formData.prenom || !formData.nom || !formData.dateNaissance || !formData.genre) {
      toast({
        variant: "destructive",
        title: "Champs manquants",
        description: "Veuillez remplir les informations obligatoires de l'élève (Prénom, Nom, Date de naissance, Genre et Établissement scolaire).",
      });
      setActiveTab('identification');
      return;
    }

    // P3_3 : Vérification solde avant inscription / réinscription
    if (formData.typeInscription === 'reinscription' && formData.matriculeEcole) {
      try {
        const allStudents = await apiClient.getStudents();
        const existingStudent = allStudents.find(
          (s: any) => s.matricule === formData.matriculeEcole.trim()
        );
        if (existingStudent && existingStudent.solde < 0) {
          const { formatCurrency } = await import('@/lib/index');
          toast({
            variant: "destructive",
            title: "Arriéré de solde — Réinscription bloquée",
            description: `L'élève ${formatStudentName(existingStudent)} a un solde dû de ${formatCurrency(Math.abs(existingStudent.solde))}. Veuillez régler cette dette avant de procéder à la réinscription.`,
          });
          return;
        }
      } catch (err) {
        console.warn("Impossible de vérifier le solde de l'élève :", err);
      }
    }

    setLoading(true);
    try {
      const payload = {
        matricule: "AUTO",
        prenom: formData.prenom,
        nom: formData.nom,
        date_naissance: formData.dateNaissance,
        genre: formData.genre,
        ecole_id: Number(formData.ecoleId || schools[0]?.id || 1),
        classe_id: (() => {
          const typed = formData.classeASuivre.toLowerCase().replace(/[\s\-_]/g, "");
          if (!typed) return null;
          const pool = filteredClasses.length > 0 ? filteredClasses : classes;
          const matched = (pool as any[]).find(cls => {
            const name = (cls.CE_LIBELLE || cls.name || '').toLowerCase().replace(/[\s\-_]/g, "");
            return name.includes(typed) || typed.includes(name);
          });
          return matched ? Number(matched.id) : null;
        })(),
        statut: "preinscrit",
        notes_sante: formData.notesSante || "",

        // Mini/Ivorian fields mapping to api_eleve
        AU_LIEU_NAISSANCE: formData.lieuNaissance,
        AU_NATIONALITE: formData.nationalite,
        AU_NUMEROEXTRAITNAISSANCE: formData.extraitNo,
        AU_DATEETABLISSEMENTEXTRAIT: formData.extraitDate ? formData.extraitDate : null,
        AU_LIEUETABLISSEMENTEXTRAIT: formData.extraitLieu,
        AU_HANDICAP: formData.handicap !== 'NON',
        AU_AUTRESHANDICAP: formData.handicap !== 'NON' ? (formData.handicap === 'autre' ? formData.autresHandicap : formData.handicap) : '',
        
        AU_ETABLISSEMENTPRECEDENT: formData.ecoleOrigine,
        AU_CLASSEPRECEDENTE: formData.classePrecedente,
        AU_NUM_AFFECTATION: formData.noTable,
        AU_QUARTIER: formData.quartier,
        
        REDOUBLANT: formData.redoublant === 'OUI',
        AU_TOP_AFFECTE: formData.statutAffecte === 'Affecté' ? 1 : (formData.statutAffecte === 'Réaffecté' ? 2 : 0),
        AU_STATUTPENSION: formData.priseEnCharge ? 1 : 0,

        // Parents info mapping to api_eleve columns
        AU_PERENOMPRENOMS: formData.pereNom,
        AU_PERECONTACTS: formData.perePhone,
        AU_MERENOMPRENOMS: formData.mereNom,
        AU_MERECONTACTS: formData.merePhone,
        AU_TUTEURLEGAL: formData.tuteurNom,
        AU_TUTEURLEGALCONTACTS: formData.tuteurPhone,

        // Residence mapping
        AU_COMMUNE: formData.commune,
        AU_LOT: formData.lot,
        AU_ADRESSE_GEO: formData.adresseText,
        AU_CONTACTS: formData.telephonePrincipal || formData.perePhone || formData.merePhone,
        AU_E_MAIL: formData.emailPrincipal || formData.pereEmail || formData.mereEmail,
        
        parent_password: "parentpassword123", // default parent password
        // Photo prise sur place, à l'étape 6 de la procédure d'inscription.
        photo: null as string | null
      };

      const res = await apiClient.createStudent(payload);

      // Marquer le rendez-vous associé comme traité, en le liant à l'élève créé
      if (rdvId && res.id) {
        try {
          await apiClient.updateRendezVousStatut(rdvId, { statut: 'traite', eleve_id: Number(res.id) });
        } catch (rdvErr) {
          console.warn("Impossible de mettre à jour le statut du rendez-vous :", rdvErr);
        }
      }

      // Création automatique du compte parent si un email est fourni
      const parentEmail = formData.emailPrincipal || formData.pereEmail || formData.mereEmail || formData.tuteurEmail;
      if (parentEmail && res.id) {
        try {
          await apiClient.createParentAccount({
            eleve_id: Number(res.id),
            email: parentEmail,
            phone: formData.telephonePrincipal || formData.perePhone || formData.merePhone || formData.tuteurPhone || undefined,
            password: "parentpassword123",
          });
        } catch (parentErr) {
          console.warn("Compte parent non créé (email déjà existant ou API indisponible) :", parentErr);
        }
      }

      setSuccessData({
        name: `${formatStudentName(res)}`,
        matricule: res.matricule
      });
      toast({
        title: "Préinscription réussie !",
        description: `L'élève ${formatStudentName(res)} a été préinscrit avec succès.${parentEmail ? ' Compte parent créé.' : ''}`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Erreur de préinscription",
        description: err.response?.data?.detail || "Une erreur est survenue lors de la préinscription scolaire.",
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
            <p className="text-lg opacity-90 mb-6">Fiche d'Inscription & Réinscription Collège</p>
            <div className="w-20 h-0.5 bg-white/30 mx-auto mb-6" />
            <p className="text-md opacity-80 max-w-sm mx-auto">
              Année académique : 2025 - 2026
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
                  <h2 className="text-xl font-bold text-foreground">GROUPE SCOLAIRE CONFESSIONNEL HÎNNEH</h2>
                  <p className="text-xs text-muted-foreground">Ministère de l'Éducation Nationale et de l'Alphabétisation</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle variant="dropdown" />
                <Button
                  variant="ghost"
                  onClick={() => navigate(ROUTE_PATHS.LOGIN)}
                  className="gap-2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour
                </Button>
              </div>
            </div>

            {rdvInfo && !successData && (
              <div className="mb-6 p-3 rounded-xl border border-primary/30 bg-primary/5 flex items-center gap-2 text-sm">
                <span className="font-semibold text-primary">Ticket {rdvInfo.numero_ticket}</span>
                <span className="text-muted-foreground">— rendez-vous de {rdvInfo.nom}, en cours de traitement.</span>
              </div>
            )}

            {successData ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="my-auto p-8 rounded-2xl border border-primary/20 bg-primary/5 text-center space-y-6 max-w-md mx-auto"
              >
                <div className="flex justify-center">
                  <CheckCircle className="w-16 h-16 text-green-500" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">Préinscription Enregistrée !</h3>
                <p className="text-sm text-muted-foreground">
                  L'élève <strong className="text-foreground">{successData.name}</strong> a été préinscrit avec succès.
                </p>
                <div className="p-4 rounded-xl bg-background border font-mono text-center space-y-1">
                  <span className="block text-xs text-muted-foreground font-sans">N° MATRICULE SCOLAIRE</span>
                  <span className="text-2xl font-bold text-primary">{successData.matricule}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Veuillez noter ce matricule. Il sera nécessaire pour finaliser l'inscription physique et effectuer le paiement de la scolarité.
                </p>
                <Button
                  onClick={() => navigate(ROUTE_PATHS.LOGIN)}
                  className="w-full"
                >
                  Retourner à l'accueil
                </Button>
              </motion.div>
            ) : (
              <form onSubmit={handlePreInscriptionSubmit} className="space-y-6 flex-1 flex flex-col justify-between">
                
                {/* Type de Demande */}
                <div className="p-4 rounded-xl border bg-muted/40 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Type d'opération *</Label>
                    <Select
                      value={formData.typeInscription}
                      onValueChange={(val) => handleChange('typeInscription', val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inscription">Nouvelle Inscription</SelectItem>
                        <SelectItem value="reinscription">Réinscription (Ancien élève)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">
                      N° Matricule École {formData.typeInscription === 'reinscription' && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      placeholder={formData.typeInscription === 'reinscription' ? "Matricule de l'ancien élève" : "[Généré automatiquement à la validation]"}
                      disabled={formData.typeInscription !== 'reinscription'}
                      value={formData.matriculeEcole}
                      onChange={(e) => handleChange('matriculeEcole', e.target.value)}
                      className={formData.typeInscription !== 'reinscription' ? "bg-muted text-muted-foreground" : ""}
                    />
                    {formData.typeInscription === 'reinscription' && (
                      <p className="text-[11px] text-muted-foreground">Le matricule est requis pour vérifier le solde avant réinscription.</p>
                    )}
                  </div>
                </div>

                {/* Barre d'onglets (Tabs) */}
                <div className="flex border-b overflow-x-auto gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('identification')}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
                      activeTab === 'identification'
                        ? 'border-primary text-primary font-bold'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    1. Élève / ID
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('scolarite')}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
                      activeTab === 'scolarite'
                        ? 'border-primary text-primary font-bold'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    2. Scolarité & Statut
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('parents')}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
                      activeTab === 'parents'
                        ? 'border-primary text-primary font-bold'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    3. Parents / Responsables
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
                    4. Résidence & Contacts
                  </button>
                </div>

                {/* Contenu des onglets */}
                <div className="py-4 flex-1">
                  
                  {/* TAB 1: IDENTIFICATION */}
                  {activeTab === 'identification' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="nom">Nom de l'élève *</Label>
                          <Input
                            id="nom"
                            placeholder="Nom"
                            value={formData.nom}
                            onChange={(e) => handleChange('nom', e.target.value.toUpperCase())}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="prenom">Prénoms de l'élève *</Label>
                          <Input
                            id="prenom"
                            placeholder="Prénoms"
                            value={formData.prenom}
                            onChange={(e) => handleChange('prenom', e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="genre">Genre *</Label>
                          <Select value={formData.genre} onValueChange={(val) => handleChange('genre', val)}>
                            <SelectTrigger id="genre">
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="M">Masculin (M)</SelectItem>
                              <SelectItem value="F">Féminin (F)</SelectItem>
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
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="lieuNaissance">Lieu de naissance</Label>
                          <Input
                            id="lieuNaissance"
                            placeholder="Ex: Abidjan Cocody"
                            value={formData.lieuNaissance}
                            onChange={(e) => handleChange('lieuNaissance', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nationalite">Nationalité</Label>
                          <Input
                            id="nationalite"
                            placeholder="Ex: Ivoirienne"
                            value={formData.nationalite}
                            onChange={(e) => handleChange('nationalite', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Extrait de naissance</span>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label htmlFor="extraitNo">N° Extrait</Label>
                            <Input
                              id="extraitNo"
                              placeholder="N°"
                              value={formData.extraitNo}
                              onChange={(e) => handleChange('extraitNo', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="extraitDate">Établi le</Label>
                            <Input
                              id="extraitDate"
                              type="date"
                              value={formData.extraitDate}
                              onChange={(e) => handleChange('extraitDate', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="extraitLieu">À (Lieu)</Label>
                            <Input
                              id="extraitLieu"
                              placeholder="Lieu"
                              value={formData.extraitLieu}
                              onChange={(e) => handleChange('extraitLieu', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 items-end">
                        <div className="space-y-2">
                          <Label htmlFor="handicap">Handicap</Label>
                          <Select value={formData.handicap} onValueChange={(val) => handleChange('handicap', val)}>
                            <SelectTrigger id="handicap">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NON">Aucun handicap (NON)</SelectItem>
                              <SelectItem value="moteur">Moteur</SelectItem>
                              <SelectItem value="visuel">Visuel</SelectItem>
                              <SelectItem value="auditif">Auditif</SelectItem>
                              <SelectItem value="autre">Autre handicap (Préciser)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {formData.handicap === 'autre' && (
                          <div className="space-y-2">
                            <Label htmlFor="autresHandicap">Préciser le handicap</Label>
                            <Input
                              id="autresHandicap"
                              placeholder="Spécifier le handicap..."
                              value={formData.autresHandicap}
                              onChange={(e) => handleChange('autresHandicap', e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 2: SCOLARITE */}
                  {activeTab === 'scolarite' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Scolarité Antérieure</span>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label htmlFor="ecoleOrigine">École d'origine</Label>
                            <Input
                              id="ecoleOrigine"
                              placeholder="École de provenance"
                              value={formData.ecoleOrigine}
                              onChange={(e) => handleChange('ecoleOrigine', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="classePrecedente">Classe précédente</Label>
                            <Input
                              id="classePrecedente"
                              placeholder="Ex: 6ème"
                              value={formData.classePrecedente}
                              onChange={(e) => handleChange('classePrecedente', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label htmlFor="noTable">N° de table</Label>
                            <Input
                              id="noTable"
                              placeholder="N° table"
                              value={formData.noTable}
                              onChange={(e) => handleChange('noTable', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="session">Session (Année)</Label>
                            <Input
                              id="session"
                              placeholder="Session"
                              value={formData.session}
                              onChange={(e) => handleChange('session', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="matriculeNational">Matricule National</Label>
                            <Input
                              id="matriculeNational"
                              placeholder="Matricule"
                              value={formData.matriculeNational}
                              onChange={(e) => handleChange('matriculeNational', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label htmlFor="niveauArabe">Niveau Scolaire (Arabe)</Label>
                            <Input
                              id="niveauArabe"
                              placeholder="Niveau arabe"
                              value={formData.niveauArabe}
                              onChange={(e) => handleChange('niveauArabe', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl border bg-primary/5 space-y-3">
                        <span className="text-xs font-bold text-primary uppercase tracking-wider block">Scolarité Actuelle</span>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="cycleFilter">Cycle d'enseignement *</Label>
                            <Select
                              value={formData.cycleFilter}
                              onValueChange={(val) => handleChange('cycleFilter', val)}
                            >
                              <SelectTrigger id="cycleFilter">
                                <SelectValue placeholder="Sélectionner le cycle" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="prescolaire">Préscolaire (Maternelle)</SelectItem>
                                <SelectItem value="primaire">Primaire</SelectItem>
                                <SelectItem value="college1">Collège 1er cycle (6ème–5ème)</SelectItem>
                                <SelectItem value="college2">Collège 2e cycle (4ème–3ème)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="classeASuivre">Classe à suivre *</Label>
                            <Input
                              id="classeASuivre"
                              placeholder="Ex: 6ème A, CP1 B, Terminale D..."
                              value={formData.classeASuivre}
                              onChange={(e) => handleChange('classeASuivre', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="redoublant">Qualité Élève</Label>
                          <Select value={formData.redoublant} onValueChange={(val) => handleChange('redoublant', val)}>
                            <SelectTrigger id="redoublant">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NON">Non Redoublant(e)</SelectItem>
                              <SelectItem value="OUI">Redoublant(e)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="statutAffecte">Statut Orientation</Label>
                          <Select value={formData.statutAffecte} onValueChange={(val) => handleChange('statutAffecte', val)}>
                            <SelectTrigger id="statutAffecte">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {isPrescolaireOrPrimaire ? (
                                <SelectItem value="Non Affecté">Non Affecté (Privé)</SelectItem>
                              ) : (
                                <>
                                  <SelectItem value="Affecté">Affecté par l'État</SelectItem>
                                  <SelectItem value="Réaffecté">Réaffecté</SelectItem>
                                  <SelectItem value="Non Affecté">Non Affecté (Privé)</SelectItem>
                                  <SelectItem value="Transfert">Transfert d'établissement</SelectItem>
                                  <SelectItem value="Régularisation">Régularisation</SelectItem>
                                  <SelectItem value="Réintégration">Réintégration</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center h-full gap-2 pt-6">
                            <input
                              id="priseEnCharge"
                              type="checkbox"
                              checked={formData.priseEnCharge}
                              onChange={(e) => handleChange('priseEnCharge', e.target.checked)}
                              className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            />
                            <Label htmlFor="priseEnCharge" className="cursor-pointer font-semibold">Prise en charge</Label>
                          </div>
                        </div>
                      </div>
                      
                      {formData.priseEnCharge && (
                        <div className="space-y-2 animate-fade-in">
                          <Label htmlFor="originePriseEnCharge">Origine de la prise en charge</Label>
                          <Input
                            id="originePriseEnCharge"
                            placeholder="Entrez l'organisme ou la structure de prise en charge"
                            value={formData.originePriseEnCharge}
                            onChange={(e) => handleChange('originePriseEnCharge', e.target.value)}
                          />
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* TAB 3: PARENTS */}
                  {activeTab === 'parents' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      
                      {/* PERE */}
                      <div className="p-4 rounded-xl border bg-muted/10 space-y-3">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Informations sur le Père</span>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label htmlFor="pereNom">Nom & Prénoms du Père</Label>
                            <Input id="pereNom" placeholder="Nom complet" value={formData.pereNom} onChange={(e) => handleChange('pereNom', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="pereProfession">Profession du Père</Label>
                            <Input id="pereProfession" placeholder="Profession" value={formData.pereProfession} onChange={(e) => handleChange('pereProfession', e.target.value)} />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label htmlFor="perePhone">Téléphone / Cel.</Label>
                            <Input id="perePhone" placeholder="Tél" value={formData.perePhone} onChange={(e) => handleChange('perePhone', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="pereEmail">E-mail</Label>
                            <Input id="pereEmail" type="email" placeholder="Email" value={formData.pereEmail} onChange={(e) => handleChange('pereEmail', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="pereBoitePostale">Boîte Postale (B.P.)</Label>
                            <Input id="pereBoitePostale" placeholder="B.P." value={formData.pereBoitePostale} onChange={(e) => handleChange('pereBoitePostale', e.target.value)} />
                          </div>
                        </div>
                      </div>

                      {/* MERE */}
                      <div className="p-4 rounded-xl border bg-muted/10 space-y-3">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Informations sur la Mère</span>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label htmlFor="mereNom">Nom & Prénoms de la Mère</Label>
                            <Input id="mereNom" placeholder="Nom complet" value={formData.mereNom} onChange={(e) => handleChange('mereNom', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="mereProfession">Profession de la Mère</Label>
                            <Input id="mereProfession" placeholder="Profession" value={formData.mereProfession} onChange={(e) => handleChange('mereProfession', e.target.value)} />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label htmlFor="merePhone">Téléphone / Cel.</Label>
                            <Input id="merePhone" placeholder="Tél" value={formData.merePhone} onChange={(e) => handleChange('merePhone', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="mereEmail">E-mail</Label>
                            <Input id="mereEmail" type="email" placeholder="Email" value={formData.mereEmail} onChange={(e) => handleChange('mereEmail', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="mereBoitePostale">Boîte Postale (B.P.)</Label>
                            <Input id="mereBoitePostale" placeholder="B.P." value={formData.mereBoitePostale} onChange={(e) => handleChange('mereBoitePostale', e.target.value)} />
                          </div>
                        </div>
                      </div>

                      {/* TUTEUR */}
                      <div className="p-4 rounded-xl border bg-muted/10 space-y-3">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Tuteur (Personne qui héberge l'élève)</span>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label htmlFor="tuteurNom">Nom & Prénoms du Tuteur</Label>
                            <Input id="tuteurNom" placeholder="Nom complet" value={formData.tuteurNom} onChange={(e) => handleChange('tuteurNom', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="tuteurProfession">Profession du Tuteur</Label>
                            <Input id="tuteurProfession" placeholder="Profession" value={formData.tuteurProfession} onChange={(e) => handleChange('tuteurProfession', e.target.value)} />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label htmlFor="tuteurPhone">Téléphone / Cel.</Label>
                            <Input id="tuteurPhone" placeholder="Tél" value={formData.tuteurPhone} onChange={(e) => handleChange('tuteurPhone', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="tuteurEmail">E-mail</Label>
                            <Input id="tuteurEmail" type="email" placeholder="Email" value={formData.tuteurEmail} onChange={(e) => handleChange('tuteurEmail', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="tuteurBoitePostale">Boîte Postale (B.P.)</Label>
                            <Input id="tuteurBoitePostale" placeholder="B.P." value={formData.tuteurBoitePostale} onChange={(e) => handleChange('tuteurBoitePostale', e.target.value)} />
                          </div>
                        </div>
                      </div>

                      {/* RESPONSABLE SCOLARITE */}
                      <div className="p-4 rounded-xl border bg-muted/10 space-y-3">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Personne en charge de la scolarité financière</span>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label htmlFor="scolariteNom">Nom & Prénoms du Responsable</Label>
                            <Input id="scolariteNom" placeholder="Nom complet" value={formData.scolariteNom} onChange={(e) => handleChange('scolariteNom', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="scolariteProfession">Profession du Responsable</Label>
                            <Input id="scolariteProfession" placeholder="Profession" value={formData.scolariteProfession} onChange={(e) => handleChange('scolariteProfession', e.target.value)} />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label htmlFor="scolaritePhone">Téléphone / Cel.</Label>
                            <Input id="scolaritePhone" placeholder="Tél" value={formData.scolaritePhone} onChange={(e) => handleChange('scolaritePhone', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="scolariteEmail">E-mail</Label>
                            <Input id="scolariteEmail" type="email" placeholder="Email" value={formData.scolariteEmail} onChange={(e) => handleChange('scolariteEmail', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="scolariteBoitePostale">Boîte Postale (B.P.)</Label>
                            <Input id="scolariteBoitePostale" placeholder="B.P." value={formData.scolariteBoitePostale} onChange={(e) => handleChange('scolariteBoitePostale', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 4: RESIDENCE */}
                  {activeTab === 'residence' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="lieuResidence">Lieu de résidence principal *</Label>
                          <Select
                            value={formData.lieuResidence}
                            onValueChange={(val) => handleChange('lieuResidence', val)}
                          >
                            <SelectTrigger id="lieuResidence">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pere_mere">Chez Père et Mère</SelectItem>
                              <SelectItem value="pere">Chez le Père uniquement</SelectItem>
                              <SelectItem value="mere">Chez la Mère uniquement</SelectItem>
                              <SelectItem value="tuteur">Chez le Tuteur</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="commune">Commune de résidence *</Label>
                          <Input
                            id="commune"
                            placeholder="Commune"
                            value={formData.commune}
                            onChange={(e) => handleChange('commune', e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="quartier">Quartier</Label>
                          <Input
                            id="quartier"
                            placeholder="Quartier"
                            value={formData.quartier}
                            onChange={(e) => handleChange('quartier', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lot">Lot N°</Label>
                          <Input
                            id="lot"
                            placeholder="N° de lot"
                            value={formData.lot}
                            onChange={(e) => handleChange('lot', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="adresseText">Adresse Géographique Détaillée</Label>
                        <Input
                          id="adresseText"
                          placeholder="Indications géographiques"
                          value={formData.adresseText}
                          onChange={(e) => handleChange('adresseText', e.target.value)}
                        />
                      </div>

                      <div className="p-4 rounded-xl border bg-primary/5 space-y-3">
                        <span className="text-xs font-bold text-primary uppercase tracking-wider block">Coordonnées Principales de Contact</span>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label htmlFor="telephonePrincipal">Téléphone Principal *</Label>
                            <Input
                              id="telephonePrincipal"
                              placeholder="Cel. de contact"
                              value={formData.telephonePrincipal}
                              onChange={(e) => handleChange('telephonePrincipal', e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="emailPrincipal">Email de contact</Label>
                            <Input
                              id="emailPrincipal"
                              type="email"
                              placeholder="parent@email.com"
                              value={formData.emailPrincipal}
                              onChange={(e) => handleChange('emailPrincipal', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                </div>

                {/* Boutons de navigation bas / validation */}
                <div className="flex items-center justify-between border-t pt-6 gap-2 mt-6">
                  <div>
                    {activeTab !== 'identification' && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (activeTab === 'scolarite') setActiveTab('identification');
                          else if (activeTab === 'parents') setActiveTab('scolarite');
                          else if (activeTab === 'residence') setActiveTab('parents');
                        }}
                      >
                        Précédent
                      </Button>
                    )}
                  </div>
                  <div>
                    {activeTab !== 'residence' ? (
                      <Button
                        type="button"
                        onClick={() => {
                          if (activeTab === 'identification') setActiveTab('scolarite');
                          else if (activeTab === 'scolarite') setActiveTab('parents');
                          else if (activeTab === 'parents') setActiveTab('residence');
                        }}
                      >
                        Suivant
                      </Button>
                    ) : (
                      <Button type="submit" disabled={loading} className="px-8 font-semibold">
                        {loading ? 'Inscription en cours...' : 'Envoyer la Fiche de Préinscription'}
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
