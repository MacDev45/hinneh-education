import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CalendarClock,
  Ticket,
  Users,
  Clock,
  GraduationCap,
  UserRound,
  CheckCircle,
  FileText,
  CalendarX,
  AlertCircle,
  CalendarDays,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ROUTE_PATHS } from '@/lib/index';
import apiClient, {
  type RendezVousOptions,
  type RendezVousDisponibilites,
  type TypeDemarche,
} from '@/lib/apiClient';

/** Titre de section : petite capitale soulignée, comme sur la fiche papier. */
function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary border-b-2 border-primary pb-2 mb-5">
      <Icon className="w-4 h-4 shrink-0" />
      {children}
    </h2>
  );
}

export default function PriseRendezVous() {
  const navigate = useNavigate();

  const [options, setOptions] = useState<RendezVousOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [dispo, setDispo] = useState<RendezVousDisponibilites | null>(null);
  const [dispoLoading, setDispoLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showQuotaAtteintModal, setShowQuotaAtteintModal] = useState(false);
  const [quotaAtteintDateLibelle, setQuotaAtteintDateLibelle] = useState("");
  // Rendez-vous confirmé : porte le ticket et le parcours à suivre ensuite
  // ('procedure_inscription' si l'élève est déjà connu du réseau).
  const [confirmation, setConfirmation] = useState<{
    id: number;
    numero_ticket: string;
    parcours: string;
  } | null>(null);

  const [form, setForm] = useState({
    nom: '',
    telephone: '',
    email: '',
    nom_eleve: '',
    matricule_national: '',
    classe_precedente: '',
    type_demarche: 'inscription' as TypeDemarche,
    niveau: '',
    date_souhaitee: '',
    heure_souhaitee: '',
    motif: '',
  });

  const set = (champ: string, valeur: string) => {
    setForm((prev) => {
      const next = { ...prev, [champ]: valeur };
      // Changer de démarche invalide le niveau : les deux listes diffèrent.
      if (champ === 'type_demarche') next.niveau = '';
      // Changer de journée invalide le créneau.
      if (champ === 'date_souhaitee') next.heure_souhaitee = '';
      return next;
    });
    if (errors[champ]) setErrors((prev) => ({ ...prev, [champ]: '' }));
  };

  const handleChoisirAutreDate = () => {
    setShowQuotaAtteintModal(false);
    setForm((prev) => ({ ...prev, date_souhaitee: '', heure_souhaitee: '' }));
    setDispo(null);
  };

  const formatDateHumaine = (dateStr?: string) => {
    if (!dateStr) return '';
    const found = options?.journees.find((j) => j.date === dateStr);
    if (found?.libelle) return found.libelle;
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    } catch {
      return dateStr;
    }
  };

  // Options du formulaire (journées ouvertes, créneaux, niveaux)
  useEffect(() => {
    const charger = async () => {
      setOptionsLoading(true);
      try {
        const opts = await apiClient.getRendezVousOptions();
        setOptions(opts);
      } catch (err) {
        console.error('Impossible de charger les options de rendez-vous :', err);
        setErrors({ submit: "Le service de prise de rendez-vous est momentanément indisponible." });
      } finally {
        setOptionsLoading(false);
      }
    };
    charger();
  }, []);

  // Détail des créneaux de la journée choisie
  useEffect(() => {
    if (!form.date_souhaitee) {
      setDispo(null);
      return;
    }
    let annule = false;
    const charger = async () => {
      setDispoLoading(true);
      try {
        const data = await apiClient.getRendezVousDisponibilites({
          date: form.date_souhaitee,
        });
        if (!annule) {
          setDispo(data);
          // Vérification automatique du quota journalier
          if (data && (data.complet || data.places_restantes <= 0)) {
            const jourLib = formatDateHumaine(form.date_souhaitee);
            setQuotaAtteintDateLibelle(jourLib);
            setShowQuotaAtteintModal(true);
          }
        }
      } catch (err) {
        console.error('Impossible de charger les créneaux :', err);
        if (!annule) setDispo(null);
      } finally {
        if (!annule) setDispoLoading(false);
      }
    };
    charger();
    return () => { annule = true; };
  }, [form.date_souhaitee, options]);

  const niveauxDisponibles = useMemo(
    () => options?.niveaux?.[form.type_demarche] ?? [],
    [options, form.type_demarche],
  );

  const journeeChoisie = useMemo(
    () => options?.journees.find((j) => j.date === form.date_souhaitee) ?? null,
    [options, form.date_souhaitee],
  );

  const estReinscription = form.type_demarche === 'reinscription';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nouveaux: Record<string, string> = {};
    if (!form.nom.trim()) nouveaux.nom = 'Nom du parent requis';
    if (!form.telephone.trim()) nouveaux.telephone = 'Téléphone requis';
    if (!form.nom_eleve.trim()) nouveaux.nom_eleve = "Nom de l'élève requis";
    if (!form.niveau) nouveaux.niveau = 'Niveau requis';
    if (!form.date_souhaitee) nouveaux.date_souhaitee = 'Date requise';
    if (!form.heure_souhaitee) nouveaux.heure_souhaitee = 'Créneau requis';
    if (Object.keys(nouveaux).length > 0) {
      setErrors(nouveaux);
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const res = await apiClient.createRendezVous({
        nom: form.nom.trim(),
        telephone: form.telephone.trim(),
        email: form.email.trim() || undefined,
        nom_eleve: form.nom_eleve.trim(),
        matricule_national: form.matricule_national.trim() || undefined,
        classe_precedente: form.classe_precedente.trim() || undefined,
        type_demarche: form.type_demarche,
        niveau: form.niveau,
        date_souhaitee: form.date_souhaitee,
        heure_souhaitee: form.heure_souhaitee,
        motif: form.motif.trim() || undefined,
      });
      setConfirmation({ id: res.id, numero_ticket: res.numero_ticket, parcours: res.parcours });
    } catch (apiError: any) {
      console.error('Échec de la prise de rendez-vous :', apiError);
      const detail = apiError?.response?.data?.detail;
      setErrors({
        submit: typeof detail === 'string'
          ? detail
          : "Impossible d'enregistrer votre demande. Veuillez réessayer.",
      });
      // La place ou la journée a pu être complète
      if (
        apiError?.response?.status === 409 ||
        (typeof detail === 'string' && (detail.toLowerCase().includes('quota') || detail.toLowerCase().includes('complet')))
      ) {
        setQuotaAtteintDateLibelle(dispo?.libelle_date || journeeChoisie?.libelle || form.date_souhaitee);
        setShowQuotaAtteintModal(true);
        setForm((prev) => ({ ...prev, heure_souhaitee: '', date_souhaitee: '' }));
        apiClient.getRendezVousOptions().then(setOptions).catch(() => {});
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Confirmation ───────────────────────────────────────────────────────────
  if (confirmation) {
    // L'élève est déjà connu du réseau : rien à ressaisir, le dossier part
    // directement en procédure d'inscription. Sinon, la fiche de renseignements
    // reste à compléter avant ce transfert.
    const eleveReconnu = confirmation.parcours === 'procedure_inscription';
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-card border rounded-2xl shadow-sm p-8 text-center space-y-5"
        >
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/60 border-2 border-green-300 dark:border-green-700 flex items-center justify-center text-green-600 dark:text-green-400">
            <Ticket className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold">Rendez-vous enregistré</h1>
          <p className="text-sm text-muted-foreground">
            Présentez ce numéro de ticket le jour de votre venue. Votre dossier sera traité
            selon l'ordre de la file d'attente.
          </p>
          <div className="py-3 px-4 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5">
            <p className="text-xs text-muted-foreground mb-1">Votre numéro de ticket</p>
            <p className="text-2xl font-bold tracking-wider text-primary">{confirmation.numero_ticket}</p>
          </div>
          {journeeChoisie && (
            <p className="text-sm">
              <span className="text-muted-foreground">Convocation le </span>
              <strong>{journeeChoisie.libelle}</strong>
              <span className="text-muted-foreground"> à </span>
              <strong>{form.heure_souhaitee}</strong>
            </p>
          )}
          <div className="text-xs text-muted-foreground bg-muted/50 p-2.5 rounded-lg border text-left flex items-start gap-2">
            <span className="text-base leading-none">📍</span>
            <div>
              <span className="font-semibold text-foreground">Lieu du rendez-vous :</span>
              <p>Groupe Scolaire Hînneh — Site d'Abidjan Biabou</p>
            </div>
          </div>

          {/* Étape suivante, selon que l'élève soit déjà connu ou non */}
          {eleveReconnu ? (
            <div className="text-left text-xs bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 p-3 rounded-lg flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-green-600 dark:text-green-400" />
              <div className="space-y-1">
                <p className="font-semibold text-green-900 dark:text-green-300">
                  Élève déjà enregistré dans le réseau
                </p>
                <p className="text-green-800/80 dark:text-green-300/80">
                  Aucune fiche à remplir : votre dossier passe directement à la procédure
                  d'inscription. Présentez-vous simplement avec votre ticket.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-left text-xs bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 rounded-lg flex items-start gap-2">
              <FileText className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-900 dark:text-amber-300">
                  Fiche de renseignements à remplir sur place
                </p>
                <p className="text-amber-800/80 dark:text-amber-300/80">
                  Le jour de votre rendez-vous, l'agent d'accueil remplira la fiche avec vous,
                  puis votre dossier passera à la procédure d'inscription. Munissez-vous de
                  l'extrait de naissance et du bulletin de l'année précédente. La photo de
                  l'élève sera prise à l'établissement.
                </p>
              </div>
            </div>
          )}

          <Button className="w-full" onClick={() => navigate(ROUTE_PATHS.LOGIN)}>
            Retour à l'accueil
          </Button>
        </motion.div>
      </div>
    );
  }

  // ── Formulaire ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 text-muted-foreground"
            onClick={() => navigate(ROUTE_PATHS.LOGIN)}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Retour
          </Button>
          <ThemeToggle variant="dropdown" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="px-6 sm:px-8 py-6 border-b bg-muted/30">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h1 className="flex items-center gap-2.5 text-xl font-bold">
                <CalendarClock className="w-6 h-6 text-primary shrink-0" />
                Prendre rendez-vous
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 w-fit">
                📍 Site d'Abidjan Biabou
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1.5">
              Réservez un créneau pour l'inscription ou la réinscription de votre enfant au site d'<strong>Abidjan Biabou</strong>.
              Un numéro de ticket vous sera attribué.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 sm:px-8 py-7 space-y-9">
            {errors.submit && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{errors.submit}</p>
              </div>
            )}

            {/* ── Identité ─────────────────────────────────────────────────── */}
            <section>
              <SectionTitle icon={UserRound}>Identité du parent et de l'élève</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom et prénoms du parent</Label>
                  <Input
                    id="nom"
                    value={form.nom}
                    onChange={(e) => set('nom', e.target.value)}
                    className={errors.nom ? 'border-destructive' : ''}
                    disabled={loading}
                  />
                  {errors.nom && <p className="text-xs text-destructive">{errors.nom}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input
                    id="telephone"
                    placeholder="+225 XX XX XX XX XX"
                    value={form.telephone}
                    onChange={(e) => set('telephone', e.target.value)}
                    className={errors.telephone ? 'border-destructive' : ''}
                    disabled={loading}
                  />
                  {errors.telephone && <p className="text-xs text-destructive">{errors.telephone}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom_eleve">Nom et prénoms de l'élève</Label>
                  <Input
                    id="nom_eleve"
                    value={form.nom_eleve}
                    onChange={(e) => set('nom_eleve', e.target.value)}
                    className={errors.nom_eleve ? 'border-destructive' : ''}
                    disabled={loading}
                  />
                  {errors.nom_eleve && <p className="text-xs text-destructive">{errors.nom_eleve}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="matricule_national">
                    Matricule national
                    {!estReinscription && <span className="text-muted-foreground font-normal"> (si connu)</span>}
                  </Label>
                  <Input
                    id="matricule_national"
                    value={form.matricule_national}
                    onChange={(e) => set('matricule_national', e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="classe_precedente">
                    Classe précédente
                    <span className="text-muted-foreground font-normal"> (optionnel)</span>
                  </Label>
                  <Input
                    id="classe_precedente"
                    placeholder="Ex : 6ème A, CM2 B"
                    value={form.classe_precedente}
                    onChange={(e) => set('classe_precedente', e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-muted-foreground font-normal">(optionnel)</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </section>

            {/* ── Type d'inscription ─────────────────────────────────────── */}
            <section>
              <SectionTitle icon={Users}>Type d'inscription</SectionTitle>
              <div className="flex flex-col sm:flex-row gap-3">
                {([
                  { valeur: 'inscription' as TypeDemarche, titre: 'Inscription', detail: 'nouvel élève' },
                  { valeur: 'reinscription' as TypeDemarche, titre: 'Réinscription', detail: 'élève déjà scolarisé au sein du réseau' },
                ]).map((choix) => (
                  <label
                    key={choix.valeur}
                    className={`flex-1 flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      form.type_demarche === choix.valeur
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40'
                    } ${loading ? 'opacity-60 pointer-events-none' : ''}`}
                  >
                    <input
                      type="radio"
                      name="type_demarche"
                      className="mt-1 accent-primary"
                      checked={form.type_demarche === choix.valeur}
                      onChange={() => set('type_demarche', choix.valeur)}
                      disabled={loading}
                    />
                    <span>
                      <span className="block text-sm font-medium">{choix.titre}</span>
                      <span className="block text-xs text-muted-foreground">({choix.detail})</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            {/* ── Niveau ─────────────────────────────────────────────────── */}
            <section>
              <SectionTitle icon={GraduationCap}>Niveau</SectionTitle>
              <div className="space-y-2">
                <Label htmlFor="niveau">
                  {estReinscription ? 'Niveau à réinscrire' : 'Niveau à inscrire'}
                </Label>
                <Select
                  value={form.niveau}
                  onValueChange={(v) => set('niveau', v)}
                  disabled={loading || optionsLoading || niveauxDisponibles.length === 0}
                >
                  <SelectTrigger id="niveau" className={errors.niveau ? 'border-destructive' : ''}>
                    <SelectValue placeholder={optionsLoading ? 'Chargement…' : '— Choisissez un niveau —'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {/* Regroupés par cycle : la liste couvre de la maternelle
                        à la terminale, un menu à plat serait illisible. */}
                    {(options?.niveaux_par_cycle ?? []).map((groupe) => (
                      <SelectGroup key={groupe.cycle}>
                        <SelectLabel>{groupe.cycle}</SelectLabel>
                        {groupe.niveaux.map((niveau) => (
                          <SelectItem key={niveau} value={niveau}>{niveau}</SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
                {errors.niveau && <p className="text-xs text-destructive">{errors.niveau}</p>}
              </div>
            </section>

            {/* ── Date et horaire ──────────────────────────────────────────── */}
            <section>
              <SectionTitle icon={Clock}>Date et horaire</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <div className="space-y-2">
                  <Label htmlFor="date_souhaitee">Date du rendez-vous</Label>
                  <Select
                    value={form.date_souhaitee}
                    onValueChange={(v) => set('date_souhaitee', v)}
                    disabled={loading || optionsLoading}
                  >
                    <SelectTrigger id="date_souhaitee" className={errors.date_souhaitee ? 'border-destructive' : ''}>
                      <SelectValue placeholder={optionsLoading ? 'Chargement…' : '— Choisissez une date —'} />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {(options?.journees ?? []).map((journee) => (
                        <SelectItem key={journee.date} value={journee.date}>
                          <span className="flex items-center justify-between gap-4 w-full">
                            <span>{journee.libelle}</span>
                            <span className={`text-xs ${journee.complet ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                              {journee.complet ? 'Complet (0 pl.)' : `${journee.places_restantes} pl.`}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.date_souhaitee && <p className="text-xs text-destructive">{errors.date_souhaitee}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="heure_souhaitee">Créneau horaire</Label>
                  <Select
                    value={form.heure_souhaitee}
                    onValueChange={(v) => set('heure_souhaitee', v)}
                    disabled={loading || dispoLoading || !form.date_souhaitee || !!dispo?.complet}
                  >
                    <SelectTrigger id="heure_souhaitee" className={errors.heure_souhaitee ? 'border-destructive' : ''}>
                      <SelectValue
                        placeholder={
                          !form.date_souhaitee ? 'Choisissez une date d\'abord'
                            : dispoLoading ? 'Chargement des créneaux…'
                            : dispo?.complet ? 'Journée complète'
                            : '— Choisissez un créneau —'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {(dispo?.creneaux ?? []).map((creneau) => (
                        <SelectItem key={creneau.heure} value={creneau.heure} disabled={creneau.complet}>
                          <span className="flex items-center justify-between gap-4 w-full">
                            <span className="font-medium tabular-nums">{creneau.heure}</span>
                            <span className={`text-xs ${creneau.complet ? 'text-destructive' : 'text-muted-foreground'}`}>
                              {creneau.complet
                                ? 'Complet'
                                : `${creneau.restantes} place${creneau.restantes > 1 ? 's' : ''}`}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.heure_souhaitee && <p className="text-xs text-destructive">{errors.heure_souhaitee}</p>}
                  {journeeChoisie && (
                    <p className={`text-xs italic ${journeeChoisie.complet ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {journeeChoisie.complet
                        ? 'Aucune place restante ce jour-là.'
                        : `${journeeChoisie.places_restantes} place(s) restante(s) ce jour-là.`}
                    </p>
                  )}
                </div>
              </div>

              {/* Décompte de la journée sélectionnée */}
              {dispo && (
                <div className={`mt-5 p-3 rounded-lg border text-xs space-y-2 ${
                  dispo.complet ? 'bg-destructive/10 border-destructive/30' : 'bg-muted/50 border-border'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      Places restantes ce jour
                    </span>
                    <span className={`font-semibold tabular-nums ${dispo.complet ? 'text-destructive' : 'text-foreground'}`}>
                      {dispo.places_restantes} / {dispo.capacite_jour}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${dispo.complet ? 'bg-destructive' : 'bg-primary'}`}
                      style={{
                        width: `${dispo.capacite_jour > 0
                          ? Math.round((dispo.places_restantes / dispo.capacite_jour) * 100)
                          : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {dispo.complet
                      ? 'Cette journée est complète, veuillez choisir une autre date.'
                      : `Accueil de ${dispo.creneaux[0]?.heure ?? '08:45'} à ${dispo.creneaux[dispo.creneaux.length - 1]?.heure ?? '15:00'}, ${dispo.capacite_creneau} places par créneau de 15 minutes.`}
                  </p>
                </div>
              )}
            </section>

            {/* ── Motif ────────────────────────────────────────────────────── */}
            <section className="space-y-2">
              <Label htmlFor="motif">
                Motif ou précisions <span className="text-muted-foreground font-normal">(optionnel)</span>
              </Label>
              <Textarea
                id="motif"
                placeholder="Ex : visite de l'établissement, question sur les frais de scolarité…"
                value={form.motif}
                onChange={(e) => set('motif', e.target.value)}
                disabled={loading}
                rows={3}
              />
            </section>

            <div className="pt-2 border-t">
              <Button type="submit" size="lg" className="mt-5 w-full sm:w-auto" disabled={loading || optionsLoading}>
                {loading ? 'Enregistrement…' : 'Confirmer le rendez-vous'}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* ── Modal Pop-up : Journée complète (Sobre & Naturel) ── */}
      <Dialog open={showQuotaAtteintModal} onOpenChange={setShowQuotaAtteintModal}>
        <DialogContent className="max-w-md p-6 sm:p-7 rounded-2xl border bg-card shadow-xl">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 text-xl">
                📅
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-1.5">
                  <span>Journée complète</span>
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  {quotaAtteintDateLibelle || formatDateHumaine(form.date_souhaitee)}
                </p>
              </div>
            </div>
            <DialogDescription className="text-sm text-foreground/90 pt-2 leading-relaxed text-left">
              Il n'y a plus de place disponible pour cette date. Nous vous invitons à choisir une autre date de passage :
            </DialogDescription>
          </DialogHeader>

          {/* Prochaines journées avec places disponibles */}
          {options?.journees && options.journees.filter(j => !j.complet && j.places_restantes > 0 && j.date !== form.date_souhaitee).length > 0 && (
            <div className="space-y-2 my-2">
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {options.journees
                  .filter(j => !j.complet && j.places_restantes > 0 && j.date !== form.date_souhaitee)
                  .slice(0, 4)
                  .map(j => (
                    <button
                      key={j.date}
                      type="button"
                      onClick={() => {
                        setShowQuotaAtteintModal(false);
                        set('date_souhaitee', j.date);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20 hover:bg-primary/5 hover:border-primary text-xs transition-colors text-left"
                    >
                      <span className="font-medium text-foreground capitalize flex items-center gap-1.5">
                        <span>🗓️</span> {j.libelle}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {j.places_restantes} place{j.places_restantes > 1 ? 's' : ''}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 pt-3 border-t flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={handleChoisirAutreDate}
            >
              <span>🗓️</span>
              <span>Fermer et changer de date</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
