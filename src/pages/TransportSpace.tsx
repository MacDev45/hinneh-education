/**
 * Espace Transport — Gestion des cars, trajets, affectation élèves et pointage
 * Couvre §1.7 (validation accès transport) et §4 (parc automobile)
 */
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Bus, MapPin, Users, CheckCircle2, Clock,
  Plus, Search, Trash2, Edit, Play, Square,
  AlertCircle, Route, Calendar, History,
  ChevronRight, UserCheck, QrCode, Smartphone, ArrowLeft,
  Download, FileText, CreditCard, Receipt, DollarSign, Info, Sparkles, ShieldCheck, Printer, Check, Utensils, ChevronsUpDown
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import apiClient from '@/lib/apiClient';
import { printReceipt } from '@/lib/receiptPrinter';
import { getRealSchoolName } from '@/lib/certificatePrinter';
import { getEcoleCourante } from '@/lib/ecoleIdentite';
import { formatStudentName } from '@/lib/index';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vehicule {
  id: string;
  immatriculation: string;
  marque: string;
  modele: string;
  capacite: number;
  chauffeurNom: string;
  chauffeurTel: string;
  statut: 'actif' | 'en_panne' | 'revision';
  trajets?: number;
}

interface Trajet {
  id: string;
  vehiculeId: string;
  date: string;
  type: 'matin' | 'soir';
  heureDepart: string;
  heureArrivee: string;
  itineraire: string;
  statut: 'planifie' | 'en_cours' | 'termine';
}

interface AffectationTransport {
  eleveId: string;
  vehiculeId: string;
  arret: string;
  matin: boolean;
  soir: boolean;
}

interface PointageBus {
  eleveId: string;
  trajetId: string;
  statut: 'monte' | 'descendu' | 'absent';
  heure: string;
}

const DEFAULT_ZONES_FALLBACK = {
  regles: [
    "Les paiements se font avant consommation au plus tard le 05 du mois.",
    "Tout paiement entamé est entièrement dû et ne peut faire l'objet de remboursement quelle qu'en soit les raisons.",
    "La tarification par zone reste unique même en cas de congés, jour férié ou d'absence."
  ],
  zones: [
    {
      zone_id: 1,
      nom: "Zone 1 — Djibi / Biabou / Abobo-Baoulé",
      kilometrage_moyen: "3.8 - 4.2 km",
      quartiers: [
        { nom: "Biabou 2", tarif: 8000, km: "3.8 km" },
        { nom: "Djibi terminus", tarif: 10000, km: "4.2 km" },
        { nom: "Belleville (Elite)", tarif: 10000, km: "4.0 km" },
        { nom: "Djibi village", tarif: 12000, km: "3.8 km" },
        { nom: "Cité J-Invest", tarif: 12000, km: "4.0 km" },
        { nom: "Boulangerie", tarif: 12000, km: "4.0 km" },
        { nom: "Rue Power", tarif: 12000, km: "4.0 km" },
        { nom: "Abobo-Baoulé", tarif: 12000, km: "4.2 km" },
        { nom: "Carrefour Diamant", tarif: 12000, km: "4.2 km" },
        { nom: "4 croix", tarif: 20000, km: "4.2 km" }
      ]
    },
    {
      zone_id: 2,
      nom: "Zone 2 — Samake / Aboboté / Angré",
      kilometrage_moyen: "4.0 - 4.6 km",
      quartiers: [
        { nom: "Samake", tarif: 15000, km: "4.6 km" },
        { nom: "Victor Loba", tarif: 15000, km: "4.0 km" },
        { nom: "Carrefour Angré", tarif: 15000, km: "4.2 km" },
        { nom: "Collège les Orchidées", tarif: 15000, km: "4.2 km" },
        { nom: "Aboboté par Loba", tarif: 15000, km: "4.0 km" },
        { nom: "Pharmacie Aboboté", tarif: 15000, km: "4.0 km" },
        { nom: "Kennedy", tarif: 15000, km: "4.5 km" }
      ]
    },
    {
      zone_id: 3,
      nom: "Zone 3 — Dokui / Azur / SODECI",
      kilometrage_moyen: "4.5 km",
      quartiers: [
        { nom: "Carrefour Menuiserie", tarif: 20000, km: "4.5 km" },
        { nom: "Azur", tarif: 20000, km: "4.5 km" },
        { nom: "Pharmacie Dokui", tarif: 20000, km: "4.5 km" },
        { nom: "CIE", tarif: 20000, km: "4.5 km" },
        { nom: "1er arrêt SODECI", tarif: 20000, km: "4.5 km" },
        { nom: "1er arrêt Dokui", tarif: 22000, km: "5.0 km" }
      ]
    },
    {
      zone_id: 4,
      nom: "Zone 4 — HMA / Zoo / Mairie-Gare",
      kilometrage_moyen: "5.0 km",
      quartiers: [
        { nom: "Mairie-Gare", tarif: 20000, km: "4.8 km" },
        { nom: "Lycée Moderne", tarif: 22000, km: "5.0 km" },
        { nom: "Camp Commando", tarif: 22000, km: "5.0 km" },
        { nom: "HMA", tarif: 25000, km: "5.2 km" },
        { nom: "Vidange", tarif: 25000, km: "5.2 km" },
        { nom: "Paillet", tarif: 25000, km: "5.2 km" },
        { nom: "Bleu marine", tarif: 25000, km: "5.2 km" },
        { nom: "Zoo", tarif: 25000, km: "5.5 km" }
      ]
    },
    {
      zone_id: 5,
      nom: "Zone 5 & 6 — Agban / Williamsville",
      kilometrage_moyen: "6.0 km",
      quartiers: [
        { nom: "Agban", tarif: 25000, km: "6.0 km" },
        { nom: "Williamsville", tarif: 25000, km: "6.5 km" }
      ]
    },
    {
      zone_id: 7,
      nom: "Zone 7 — Nanti / Banco / Anador",
      kilometrage_moyen: "5.3 km",
      quartiers: [
        { nom: "Nanti", tarif: 22000, km: "5.3 km" },
        { nom: "Banco", tarif: 22000, km: "5.3 km" },
        { nom: "Anador", tarif: 22000, km: "5.3 km" },
        { nom: "Plaque-Anador", tarif: 22000, km: "5.3 km" }
      ]
    },
    {
      zone_id: 8,
      nom: "Zone 8 — Filtisac / Macaci",
      kilometrage_moyen: "6.5 km",
      quartiers: [
        { nom: "Derrière rail", tarif: 23000, km: "6.0 km" },
        { nom: "Filtisac", tarif: 25000, km: "6.5 km" },
        { nom: "Macaci", tarif: 25000, km: "6.5 km" }
      ]
    },
    {
      zone_id: 9,
      nom: "Zone 9 — PK 18 / N'dotré / Anyama",
      kilometrage_moyen: "8.0 - 9.7 km",
      quartiers: [
        { nom: "Ancienne Gendarmerie", tarif: 25000, km: "8.0 km" },
        { nom: "Anyama", tarif: 25000, km: "8.5 km" },
        { nom: "PK 18", tarif: 28000, km: "9.0 km" },
        { nom: "N'dotré", tarif: 30000, km: "9.7 km" },
        { nom: "Ebimpé", tarif: 30000, km: "10.0 km" }
      ]
    },
    {
      zone_id: 10,
      nom: "Zone 10 — BC / Avocatier / Sogefiha",
      kilometrage_moyen: "6.0 km",
      quartiers: [
        { nom: "Sogefiha", tarif: 23000, km: "5.8 km" },
        { nom: "Habitat", tarif: 23000, km: "5.8 km" },
        { nom: "BC", tarif: 25000, km: "6.0 km" },
        { nom: "Dépôt", tarif: 25000, km: "6.0 km" },
        { nom: "Akeikoi", tarif: 25000, km: "6.2 km" },
        { nom: "Avocatier", tarif: 25000, km: "6.2 km" }
      ]
    },
    {
      zone_id: 11,
      nom: "Zone 11 — Adjamé / Attécoubé",
      kilometrage_moyen: "11.0 - 12.0 km",
      quartiers: [
        { nom: "Adjamé st Michel", tarif: 30000, km: "11.0 km" },
        { nom: "Mairie Adjamé", tarif: 30000, km: "12.0 km" },
        { nom: "Marché Gouro", tarif: 30000, km: "11.5 km" },
        { nom: "220 Logements", tarif: 30000, km: "11.5 km" },
        { nom: "Gare-Nord", tarif: 30000, km: "12.0 km" },
        { nom: "Attécoubé", tarif: 30000, km: "12.0 km" },
        { nom: "Liberté", tarif: 30000, km: "11.5 km" }
      ]
    },
    {
      zone_id: 12,
      nom: "Zone 12 — Angré Soleil / Château / CHU",
      kilometrage_moyen: "4.0 - 5.0 km",
      quartiers: [
        { nom: "Les arcades", tarif: 20000, km: "4.0 km" },
        { nom: "Terminus 81-82", tarif: 20000, km: "4.0 km" },
        { nom: "Angré soleil", tarif: 20000, km: "4.5 km" },
        { nom: "Angré château", tarif: 20000, km: "5.0 km" },
        { nom: "Cocovico", tarif: 20000, km: "4.8 km" },
        { nom: "Djorogobité", tarif: 25000, km: "5.2 km" },
        { nom: "CHU d'Angré", tarif: 25000, km: "5.5 km" }
      ]
    },
    {
      zone_id: 13,
      nom: "Zone 13 — 7ème & 8ème Tranche / II Plateaux",
      kilometrage_moyen: "6.0 - 6.5 km",
      quartiers: [
        { nom: "7ème tranche", tarif: 25000, km: "6.0 km" },
        { nom: "8ème tranche", tarif: 25000, km: "6.5 km" },
        { nom: "Star 11-14", tarif: 25000, km: "6.4 km" },
        { nom: "CNPS II Plateaux", tarif: 25000, km: "6.5 km" },
        { nom: "Programme 6", tarif: 25000, km: "6.5 km" }
      ]
    },
    {
      zone_id: 14,
      nom: "Zone 14 — 22ème Arrondissement / Dokui Monique",
      kilometrage_moyen: "5.4 - 5.5 km",
      quartiers: [
        { nom: "22ième arrondissement", tarif: 22000, km: "5.5 km" },
        { nom: "Angré Mahou", tarif: 22000, km: "5.4 km" },
        { nom: "Plateau Dokui (Ste Monique)", tarif: 22000, km: "5.4 km" },
        { nom: "Angré star 4-9", tarif: 22000, km: "5.5 km" },
        { nom: "Djomi petit marché", tarif: 22000, km: "5.5 km" },
        { nom: "Larousse", tarif: 25000, km: "5.8 km" }
      ]
    },
    {
      zone_id: 15,
      nom: "Zone 15 — Oscars / Sococé / Vallons / Aghien",
      kilometrage_moyen: "7.0 km",
      quartiers: [
        { nom: "Oscars", tarif: 26000, km: "7.0 km" },
        { nom: "Sococé II Plateaux", tarif: 26000, km: "7.2 km" },
        { nom: "Aghien", tarif: 26000, km: "7.0 km" },
        { nom: "Vallons", tarif: 26000, km: "7.5 km" },
        { nom: "Angré Bluetooth", tarif: 26000, km: "7.0 km" }
      ]
    },
    {
      zone_id: 16,
      nom: "Zone 16 — Sainte Marie / RTI / Saint Jean",
      kilometrage_moyen: "12.0 km",
      quartiers: [
        { nom: "Sainte Marie", tarif: 32000, km: "12.0 km" },
        { nom: "Saint Jean", tarif: 32000, km: "12.0 km" },
        { nom: "RTI", tarif: 32000, km: "12.0 km" },
        { nom: "Cité des Arts", tarif: 32000, km: "12.0 km" },
        { nom: "Mermoz", tarif: 32000, km: "12.0 km" }
      ]
    },
    {
      zone_id: 17,
      nom: "Zone 17 — Abatta / Faya / Riviera Akouedo",
      kilometrage_moyen: "11.0 km",
      quartiers: [
        { nom: "Abatta", tarif: 32000, km: "11.0 km" },
        { nom: "Faya", tarif: 32000, km: "11.0 km" },
        { nom: "Cité Sir", tarif: 32000, km: "11.0 km" },
        { nom: "Akouedo", tarif: 32000, km: "11.5 km" },
        { nom: "Attoban", tarif: 32000, km: "11.0 km" },
        { nom: "Garage CFA", tarif: 32000, km: "11.0 km" }
      ]
    },
    {
      zone_id: 18,
      nom: "Zone 18 — Palmeraie / Riviera 2 / Bonoumin",
      kilometrage_moyen: "10.0 km",
      quartiers: [
        { nom: "Palmeraie", tarif: 30000, km: "10.0 km" },
        { nom: "Riviera 2", tarif: 30000, km: "10.5 km" },
        { nom: "Bonoumin", tarif: 30000, km: "10.0 km" },
        { nom: "9 kilos", tarif: 30000, km: "10.0 km" }
      ]
    },
    {
      zone_id: 19,
      nom: "Zone 19 — Bingerville (Fekesse)",
      kilometrage_moyen: "15.0 km",
      quartiers: [
        { nom: "Entrée Bingerville (Fekesse)", tarif: 35000, km: "15.0 km" }
      ]
    },
    {
      zone_id: 20,
      nom: "Zone 20 — Treichville",
      kilometrage_moyen: "16.0 km",
      quartiers: [
        { nom: "Treichville", tarif: 32000, km: "16.0 km" }
      ]
    }
  ]
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TransportSpace() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('vehicules');
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [trajets, setTrajets] = useState<Trajet[]>([]);
  const [affectations, setAffectations] = useState<AffectationTransport[]>([]);
  const [pointages, setPointages] = useState<PointageBus[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Module Tarification & Paiement par Ligne & Échéancier Mensuel
  const [payments, setPayments] = useState<any[]>([]);
  const [zonesData, setZonesData] = useState<{ zones: any[]; regles: string[] }>({ zones: [], regles: [] });
  const [searchZone, setSearchZone] = useState('');
  const [openPayLineModal, setOpenPayLineModal] = useState(false);
  const [selectedQuartierPay, setSelectedQuartierPay] = useState<{ zone_id: number; nom: string; tarif: number; km?: string } | null>(null);
  const [formPayLine, setFormPayLine] = useState({
    eleveId: '',
    mois: 'Octobre 2026',
    modePaiement: 'especes',
    numeroTransaction: '',
    observation: ''
  });
  const [receiptModal, setReceiptModal] = useState<any | null>(null);

  // Modal Modification des Tarifs Cantine & Car
  const [openTarifsModal, setOpenTarifsModal] = useState(false);
  const [savingTarifs, setSavingTarifs] = useState(false);
  const [formTarifs, setFormTarifs] = useState({
    cantine_mensuel: 0,
    cantine_trimestriel: 0,
    cantine_annuel: 0,
    cantine_journalier: 0,
    zones: [] as any[]
  });

  const handleOpenTarifsModal = async () => {
    try {
      const data = await apiClient.getTarifs();
      setFormTarifs({
        cantine_mensuel: data.cantine?.mensuel || 0,
        cantine_trimestriel: data.cantine?.trimestriel || 0,
        cantine_annuel: data.cantine?.annuel || 0,
        cantine_journalier: data.cantine?.journalier || 0,
        zones: (data.zones && data.zones.length > 0) ? data.zones : (zonesData.zones || [])
      });
      setOpenTarifsModal(true);
    } catch {
      toast({ variant: 'destructive', title: 'Erreur de chargement des tarifs' });
    }
  };

  const handleSaveTarifs = async () => {
    try {
      setSavingTarifs(true);
      await apiClient.updateTarifs(formTarifs);
      toast({ title: 'Tarifs mis à jour !', description: 'Les modifications des tarifs cantine et car ont été enregistrées.' });
      setOpenTarifsModal(false);
      await loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur de sauvegarde', description: err.response?.data?.detail || String(err) });
    } finally {
      setSavingTarifs(false);
    }
  };

  // Filtres Échéancier Mensuel Transport
  const [selectedClasseId, setSelectedClasseId] = useState<string>('all');
  const [selectedStatutFilter, setSelectedStatutFilter] = useState<string>('all');
  const [searchEleveEcheancier, setSearchEleveEcheancier] = useState<string>('');

  const MOIS_SCOLAIRES = [
    'Septembre 2026',
    'Octobre 2026',
    'Novembre 2026',
    'Décembre 2026',
    'Janvier 2027',
    'Février 2027',
    'Mars 2027',
    'Avril 2027',
    'Mai 2027',
    'Juin 2027'
  ];

  // Forms
  const [openVehicule, setOpenVehicule] = useState(false);
  const [editVehicule, setEditVehicule] = useState<Vehicule | null>(null);
  const [formVehicule, setFormVehicule] = useState({ immatriculation: '', marque: '', modele: '', capacite: '30', chauffeurNom: '', chauffeurTel: '', statut: 'actif' as Vehicule['statut'] });

  const [openTrajet, setOpenTrajet] = useState(false);
  const [formTrajet, setFormTrajet] = useState({ vehiculeId: '', type: 'matin' as 'matin' | 'soir', heureDepart: '07:00', heureArrivee: '07:45', itineraire: '' });

  const [openAffectation, setOpenAffectation] = useState(false);
  const [formAffect, setFormAffect] = useState({ eleveId: '', vehiculeId: '', arret: '', matin: true, soir: true });
  const [affectEleveSearchOpen, setAffectEleveSearchOpen] = useState(false);

  const [trajetActif, setTrajetActif] = useState<Trajet | null>(null);
  const [searchEleve, setSearchEleve] = useState('');
  const [agentCode, setAgentCode] = useState('');
  const [agentMobileOpen, setAgentMobileOpen] = useState(false);
  const [carPages, setCarPages] = useState<Record<string, number>>({});

  // ─── CHAUFFEURS & ATTRIBUTIONS ──────────────────────────────────────────────
  interface Chauffeur {
    id: number;
    nom: string;
    prenom?: string;
    telephone?: string;
    num_permis?: string;
    statut: 'actif' | 'en_conge' | 'inactif';
    car_id?: number | null;
    ligne_nom?: string;
  }

  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [openChauffeurModal, setOpenChauffeurModal] = useState(false);
  const [editChauffeur, setEditChauffeur] = useState<Chauffeur | null>(null);
  const [formChauffeur, setFormChauffeur] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    num_permis: '',
    statut: 'actif' as 'actif' | 'en_conge' | 'inactif',
    car_id: '',
    ligne_nom: ''
  });

  const [openAssignModal, setOpenAssignModal] = useState(false);
  const [assignCarItem, setAssignCarItem] = useState<any | null>(null);
  const [assignForm, setAssignForm] = useState({ chauffeur_id: '', ligne_nom: '' });

  const [openLigneModal, setOpenLigneModal] = useState(false);
  const [formLigne, setFormLigne] = useState({
    nom: '',
    zone: '',
    tarif: '20000',
    km: '4.0 km',
    quartiers: '',
    vehicule_id: ''
  });

  const handleSaveChauffeur = async () => {
    if (!formChauffeur.nom.trim()) {
      toast({ variant: 'destructive', title: 'Le nom du chauffeur est obligatoire' });
      return;
    }
    try {
      const payload = {
        nom: formChauffeur.nom.trim(),
        prenom: formChauffeur.prenom.trim() || undefined,
        telephone: formChauffeur.telephone.trim() || undefined,
        num_permis: formChauffeur.num_permis.trim() || undefined,
        statut: formChauffeur.statut,
        car_id: (formChauffeur.car_id && formChauffeur.car_id !== "none") ? parseInt(formChauffeur.car_id) : undefined,
        ligne_nom: formChauffeur.ligne_nom.trim() || undefined
      };
      if (editChauffeur?.id) {
        await apiClient.updateChauffeur(editChauffeur.id, payload);
        toast({ title: 'Chauffeur mis à jour avec succès !' });
      } else {
        await apiClient.createChauffeur(payload);
        toast({ title: 'Nouveau chauffeur créé avec succès !' });
      }
      setOpenChauffeurModal(false);
      await loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur enregistrement', description: String(err) });
    }
  };

  const handleDeleteChauffeur = async (id: number) => {
    if (!confirm('Voulez-vous vraiment supprimer ce chauffeur ?')) return;
    try {
      await apiClient.deleteChauffeur(id);
      toast({ title: 'Chauffeur supprimé avec succès' });
      await loadData();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erreur de suppression' });
    }
  };

  const handleSaveAssignCar = async () => {
    if (!assignCarItem) return;
    try {
      const payload: any = {};
      if (assignForm.chauffeur_id && assignForm.chauffeur_id !== "none") {
        payload.chauffeur_id = parseInt(assignForm.chauffeur_id);
      }
      if (assignForm.ligne_nom) {
        payload.ligne_nom = assignForm.ligne_nom;
      }
      await apiClient.assignCar(assignCarItem.id, payload);
      toast({ title: `Attribution enregistrée pour le car ${assignCarItem.immatriculation}` });
      setOpenAssignModal(false);
      await loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Erreur d'attribution", description: String(err) });
    }
  };

  const handleSaveLigne = async () => {
    if (!formLigne.nom.trim()) {
      toast({ variant: 'destructive', title: 'Le nom de la ligne est requis' });
      return;
    }
    try {
      const qList = formLigne.quartiers
        ? formLigne.quartiers.split(',').map(q => ({ nom: q.trim(), tarif: parseFloat(formLigne.tarif) || 20000, km: formLigne.km || '4.0 km' }))
        : [{ nom: 'Station Principale', tarif: parseFloat(formLigne.tarif) || 20000, km: formLigne.km || '4.0 km' }];

      await apiClient.createTransportLigne({
        nom: formLigne.nom.trim(),
        kilometrage_moyen: formLigne.km,
        vehicule_id: (formLigne.vehicule_id && formLigne.vehicule_id !== "none") ? parseInt(formLigne.vehicule_id) : undefined,
        quartiers: qList
      });

      toast({ title: `Ligne '${formLigne.nom}' créée avec succès !` });
      setOpenLigneModal(false);
      await loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur de création de ligne', description: String(err) });
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [s, c, vData, tData, aData, pData, zData, payData, chData] = await Promise.all([
        apiClient.getStudents(),
        apiClient.getClasses(),
        apiClient.getCars(),
        apiClient.getTrajets(),
        apiClient.getAffectations(),
        apiClient.getPointagesBus(),
        apiClient.getTransportZones(),
        apiClient.getPayments(),
        apiClient.getChauffeurs(),
      ]);
      setChauffeurs(chData || []);
      setStudents(s || []);
      setClasses(c || []);
      setZonesData((zData && zData.zones) ? zData : { zones: [], regles: [] });
      setPayments(payData || []);


      const mappedVehicles = (vData || []).map((v: any) => ({
        id: String(v.id),
        immatriculation: v.immatriculation,
        marque: v.marque,
        modele: v.modele || '',
        capacite: Number(v.capacite),
        chauffeurNom: v.chauffeurNom || '',
        chauffeurTel: v.chauffeurTel || '',
        statut: v.statut,
        trajets: 0
      }));
      setVehicules(mappedVehicles);

      const mappedTrajets = (tData || []).map((t: any) => ({
        id: String(t.id),
        vehiculeId: String(t.vehiculeId),
        date: String(t.date),
        type: t.type as 'matin' | 'soir',
        heureDepart: t.heureDepart,
        heureArrivee: t.heureArrivee || '',
        itineraire: t.itineraire,
        statut: t.statut as 'planifie' | 'en_cours' | 'termine'
      }));
      setTrajets(mappedTrajets);

      const activeT = mappedTrajets.find(t => t.statut === 'en_cours');
      setTrajetActif(activeT || null);

      const mappedAffectations = (aData || []).map((a: any) => ({
        eleveId: String(a.eleveId),
        vehiculeId: String(a.vehiculeId),
        arret: a.arret || '',
        matin: Boolean(a.matin),
        soir: Boolean(a.soir)
      }));
      setAffectations(mappedAffectations);

      const mappedPointages = (pData || []).map((p: any) => ({
        eleveId: String(p.eleveId),
        trajetId: String(p.trajetId),
        statut: p.statut as 'monte' | 'descendu' | 'absent',
        heure: p.heure
      }));
      setPointages(mappedPointages);

    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erreur de chargement des données' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const isStudentTransportEnrolled = (student: any) => {
    if (!student) return false;
    const sId = String(student.id);

    // 1. Propriété directe sur l'élève
    if (Boolean(student.serviceTransport || student.service_transport)) return true;

    // 2. Vérification des attributions enregistrées à l'Économat (student_service_attributions)
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('student_service_attributions');
        if (raw) {
          const map = JSON.parse(raw);
          const mat = (student.matricule || '').trim().toUpperCase();
          const fn = `${student.firstName || ''} ${student.lastName || ''}`.trim().toUpperCase();
          const fnRev = `${student.lastName || ''} ${student.firstName || ''}`.trim().toUpperCase();

          if (mat && map[mat]?.transport) return true;
          if (fn && map[fn]?.transport) return true;
          if (fnRev && map[fnRev]?.transport) return true;

          const match = Object.keys(map).find(k => {
            const attr = map[k];
            if (!attr?.transport) return false;
            if (mat && (k.includes(mat) || mat.includes(k))) return true;
            if (fn && (k.includes(fn) || fn.includes(k))) return true;
            if (fnRev && (k.includes(fnRev) || fnRev.includes(k))) return true;
            return false;
          });
          if (match) return true;
        }
      } catch (e) {
        console.error("Error reading attributions in TransportSpace:", e);
      }
    }

    // 3. Élève ayant déjà une affectation de car ou un règlement transport
    const hasAff = affectations.some(a => String(a.eleveId) === sId);
    if (hasAff) return true;

    const hasPay = payments.some(p => {
      const pStudId = String(p.studentId || p.eleve_id);
      const isPaye = p.status === 'paye' || p.statut === 'paye';
      const isTrans = p.type === 'transport' || String(p.observation || '').toLowerCase().includes('transport');
      return pStudId === sId && isPaye && isTrans;
    });
    return hasPay;
  };

  const isStudentCanteenEnrolled = (student: any) => {
    if (!student) return false;
    const sId = String(student.id);

    // 1. Propriété directe sur l'élève
    if (Boolean(student.serviceCantine || student.service_cantine)) return true;

    // 2. Vérification des attributions enregistrées à l'Économat (student_service_attributions)
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('student_service_attributions');
        if (raw) {
          const map = JSON.parse(raw);
          const mat = (student.matricule || '').trim().toUpperCase();
          const fn = `${student.firstName || ''} ${student.lastName || ''}`.trim().toUpperCase();
          const fnRev = `${student.lastName || ''} ${student.firstName || ''}`.trim().toUpperCase();

          if (mat && map[mat]?.cantine) return true;
          if (fn && map[fn]?.cantine) return true;
          if (fnRev && map[fnRev]?.cantine) return true;

          const match = Object.keys(map).find(k => {
            const attr = map[k];
            if (!attr?.cantine) return false;
            if (mat && (k.includes(mat) || mat.includes(k))) return true;
            if (fn && (k.includes(fn) || fn.includes(k))) return true;
            if (fnRev && (k.includes(fnRev) || fnRev.includes(k))) return true;
            return false;
          });
          if (match) return true;
        }
      } catch (e) {
        console.error("Error reading attributions in TransportSpace:", e);
      }
    }

    const hasPay = payments.some(p => {
      const pStudId = String(p.studentId || p.eleve_id);
      const isPaye = p.status === 'paye' || p.statut === 'paye';
      const isCantine = p.type === 'cantine' || String(p.observation || '').toLowerCase().includes('cantine');
      return pStudId === sId && isPaye && isCantine;
    });
    return hasPay;
  };

  const elevesTransport = students.filter(s => s.status === 'actif' && isStudentTransportEnrolled(s));
  const elevesAffectes = new Set(affectations.map(a => a.eleveId));

  const elevesFiltres = useMemo(() => {
    return elevesTransport.filter(s =>
      `${formatStudentName(s)}`.toLowerCase().includes(searchEleve.toLowerCase()) ||
      s.matricule?.toLowerCase().includes(searchEleve.toLowerCase())
    );
  }, [elevesTransport, searchEleve]);

  // ─── Véhicules ──────────────────────────────────────────────────────────────

  const saveVehicule = async () => {
    if (!formVehicule.immatriculation || !formVehicule.marque) {
      toast({ variant: 'destructive', title: 'Immatriculation et marque requis' });
      return;
    }
    const payload = {
      immatriculation: formVehicule.immatriculation,
      marque: formVehicule.marque,
      modele: formVehicule.modele,
      capacite: Number(formVehicule.capacite),
      chauffeurNom: formVehicule.chauffeurNom,
      chauffeurTel: formVehicule.chauffeurTel,
      statut: formVehicule.statut,
    };
    try {
      if (editVehicule) {
        await apiClient.updateCar(editVehicule.id, payload);
        toast({ title: 'Véhicule mis à jour' });
      } else {
        await apiClient.createCar(payload);
        toast({ title: 'Véhicule ajouté' });
      }
      setOpenVehicule(false);
      setEditVehicule(null);
      setFormVehicule({ immatriculation: '', marque: '', modele: '', capacite: '30', chauffeurNom: '', chauffeurTel: '', statut: 'actif' });
      await loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur d\'enregistrement', description: err.response?.data?.detail || String(err) });
    }
  };

  const handleDeleteVehicule = async (id: string) => {
    try {
      await apiClient.deleteCar(id);
      toast({ title: 'Véhicule supprimé' });
      await loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur de suppression', description: err.response?.data?.detail || String(err) });
    }
  };

  // ─── Trajets ────────────────────────────────────────────────────────────────

  const saveTrajet = async () => {
    if (!formTrajet.vehiculeId || !formTrajet.itineraire) {
      toast({ variant: 'destructive', title: 'Véhicule et itinéraire requis' });
      return;
    }
    const payload = {
      vehiculeId: Number(formTrajet.vehiculeId),
      date: new Date().toISOString().split('T')[0],
      type: formTrajet.type,
      heureDepart: formTrajet.heureDepart,
      heureArrivee: formTrajet.heureArrivee,
      itineraire: formTrajet.itineraire,
      statut: 'planifie',
    };
    try {
      await apiClient.createTrajet(payload);
      toast({ title: 'Trajet planifié' });
      setOpenTrajet(false);
      setFormTrajet({ vehiculeId: '', type: 'matin', heureDepart: '07:00', heureArrivee: '07:45', itineraire: '' });
      await loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur de planification', description: err.response?.data?.detail || String(err) });
    }
  };

  const demarrerTrajet = async (t: Trajet) => {
    try {
      await apiClient.updateTrajet(t.id, { statut: 'en_cours' });
      toast({ title: 'Trajet démarré', description: `${t.itineraire} — ${t.type}` });
      await loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur de démarrage', description: err.response?.data?.detail || String(err) });
    }
  };

  const terminerTrajet = async (t: Trajet) => {
    try {
      await apiClient.updateTrajet(t.id, { statut: 'termine', heureArrivee: new Date().toTimeString().slice(0, 5) });
      toast({ title: 'Trajet terminé' });
      await loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur de fin de trajet', description: err.response?.data?.detail || String(err) });
    }
  };

  const handleDeleteTrajet = async (id: string) => {
    try {
      await apiClient.deleteTrajet(id);
      toast({ title: 'Trajet supprimé' });
      await loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur de suppression', description: err.response?.data?.detail || String(err) });
    }
  };

  // ─── Affectations ───────────────────────────────────────────────────────────

  const saveAffectation = async () => {
    if (!formAffect.eleveId || !formAffect.vehiculeId) {
      toast({ variant: 'destructive', title: 'Élève et véhicule requis' });
      return;
    }
    const payload = {
      eleveId: Number(formAffect.eleveId),
      vehiculeId: Number(formAffect.vehiculeId),
      arret: formAffect.arret,
      matin: formAffect.matin,
      soir: formAffect.soir,
    };
    try {
      await apiClient.createAffectation(payload);
      toast({ title: 'Élève affecté au car' });
      setOpenAffectation(false);
      setFormAffect({ eleveId: '', vehiculeId: '', arret: '', matin: true, soir: true });
      await loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur d\'affectation', description: err.response?.data?.detail || String(err) });
    }
  };

  const openEditAffectation = (a: any) => {
    setFormAffect({
      eleveId: String(a.eleveId),
      vehiculeId: String(a.vehiculeId),
      arret: a.arret || '',
      matin: !!a.matin,
      soir: !!a.soir,
    });
    setOpenAffectation(true);
  };

  const handleDeleteAffectation = async (eleveId: string) => {
    try {
      await apiClient.deleteAffectation(eleveId);
      toast({ title: 'Affectation supprimée' });
      await loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur de suppression', description: err.response?.data?.detail || String(err) });
    }
  };

  // ─── Paiement par Ligne de Transport ────────────────────────────────────────
  const handleProcessPayLine = async () => {
    if (!formPayLine.eleveId || !selectedQuartierPay) {
      toast({ variant: 'destructive', title: 'Élève et Quartier/Ligne requis' });
      return;
    }
    try {
      const res = await apiClient.payTransportLine({
        eleve_id: Number(formPayLine.eleveId),
        zone_id: selectedQuartierPay.zone_id,
        quartier_nom: selectedQuartierPay.nom,
        tarif: selectedQuartierPay.tarif,
        mois: formPayLine.mois,
        mode_paiement: formPayLine.modePaiement,
        numero_transaction: formPayLine.numeroTransaction,
        observation: formPayLine.observation
      });
      toast({ title: 'Paiement Transport Enregistré !', description: res.message });
      setOpenPayLineModal(false);

      const payloadRec = {
        ...res,
        zone_id: selectedQuartierPay.zone_id,
        quartier: selectedQuartierPay.nom,
        quartier_nom: selectedQuartierPay.nom,
        montant: selectedQuartierPay.tarif,
        tarif: selectedQuartierPay.tarif,
        mois: formPayLine.mois
      };

      setReceiptModal(payloadRec);
      printTransportReceipt(payloadRec, students.find(s => String(s.id) === String(formPayLine.eleveId)), formPayLine.mois);
      await loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur lors du paiement', description: err.response?.data?.detail || String(err) });
    }
  };

  const printTransportReceipt = async (r: any, defaultStudent?: any, defaultMonth?: string) => {
    if (!r && !defaultStudent) return;

    const studId = String(r.studentId || r.eleve_id || defaultStudent?.id || '');
    const stud = defaultStudent || students.find(s => String(s.id) === studId);
    const eleveNom = r.eleve || (stud ? `${stud.lastName || ''} ${stud.firstName || ''}`.trim() : `Élève #${studId}`);
    const matriculeVal = r.matricule || stud?.matricule || '—';
    const clsObj = classes.find(c => String(c.id) === String(stud?.classId));
    const classNameVal = clsObj ? clsObj.name : (stud?.className || '—');
    const photoUrl = stud?.photo || stud?.photoUrl || stud?.photo_url || stud?.picture || '';

    const numRecuVal = r.numero_recu || r.receiptNumber || `RC-TR-${Date.now()}`;
    const monthLabel = r.mois || defaultMonth || r.observation || 'Transport Scolaire';
    const zoneTarif = getStudentZoneTarif(stud, r);
    const montantVal = Number(r.montant || r.amount || r.tarif || zoneTarif.tarif);
    const modeVal = (r.mode || r.mode_paiement || 'especes').toUpperCase();
    const dateVal = r.date ? new Date(r.date) : new Date();

    // Build Echeances list for Transport (10 Months)
    const echeances = MOIS_SCOLAIRES.map(m => {
      const paid = isMonthPaid(studId, m);
      const isCurrentPaid = (m === monthLabel);
      const isPaid = paid || isCurrentPaid;
      return {
        rubric: `Transport — ${m.split(' ')[0]}`,
        amount: zoneTarif.tarif,
        paid: isPaid ? zoneTarif.tarif : 0,
        rest: isPaid ? 0 : zoneTarif.tarif,
      };
    });

    const totalVersed = echeances.reduce((acc, e) => acc + e.paid, 0);
    const soldeRestant = echeances.reduce((acc, e) => acc + e.rest, 0);
    const realSchoolName = await getRealSchoolName(stud?.schoolId || stud?.ecole_id);

    printReceipt({
      receiptNumber: numRecuVal,
      paymentId: r.paiement_id || r.id,
      amount: montantVal,
      type: 'transport',
      mode: modeVal,
      date: dateVal,
      studentName: eleveNom,
      studentMatricule: matriculeVal,
      studentClass: classNameVal,
      schoolName: realSchoolName,
      arrieresAnterieurs: Number(stud?.AU_MONTANTARRIERE || 0),
      studentPhoto: photoUrl,
      transportMensuelTarif: zoneTarif.tarif,
      totalVersedToDate: totalVersed,
      soldeToDate: soldeRestant,
      echeances: echeances,
      versementDetails: [
        { rubric: `Règlement Transport (Zone ${zoneTarif.zoneId} - ${monthLabel}) — ${zoneTarif.quartierNom}`, amount: montantVal }
      ]
    });
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const res = await apiClient.importAffectations(file);
      if (res.success) {
        toast({ title: 'Importation réussie', description: `${res.imported} élève(s) affecté(s) avec succès.` });
      } else {
        toast({
          variant: 'destructive',
          title: `Importation avec des avertissements/erreurs (${res.errors.length})`,
          description: res.errors.slice(0, 3).join('\n') + (res.errors.length > 3 ? '\n...' : '')
        });
      }
      await loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur d\'importation', description: err.response?.data?.detail || String(err) });
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const exportCarPDF = (v: Vehicule) => {
    const assigned = students.filter(s => affectations.some(a => a.vehiculeId === v.id && a.eleveId === String(s.id)));

    if (assigned.length === 0) {
      toast({ variant: 'destructive', title: 'Aucun élève', description: `Aucun élève n'est affecté au car ${v.immatriculation}.` });
      return;
    }

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '210mm';
    container.style.padding = '15mm';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.fontSize = '11px';
    container.style.color = '#000';
    container.style.backgroundColor = '#fff';

    const dateStr = new Date().toLocaleDateString('fr-FR');

    const escapeHtml = (val: string | number) => {
      return String(val)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    const rowsHtml = assigned.map((s, idx) => {
      const aff = affectations.find(a => a.vehiculeId === v.id && a.eleveId === String(s.id));
      const detailsClass = classes.find(c => String(c.id) === String(s.classId));
      const className = detailsClass ? detailsClass.name : '—';
      return `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${idx + 1}</td>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>${escapeHtml(s.matricule)}</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(s.lastName)} ${escapeHtml(s.firstName)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${escapeHtml(className)}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(aff?.arret || '—')}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${aff?.matin ? 'Oui' : 'Non'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${aff?.soir ? 'Oui' : 'Non'}</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px;">
        <div>
          <h1 style="font-size: 18px; color: #2563eb; margin: 0; font-weight: bold;">HÎNNEH ÉDUCATION</h1>
          <p style="font-size: 10px; color: #666; margin: 2px 0 0 0;">Système Intégré de Gestion Scolaire</p>
        </div>
        <div style="text-align: right;">
          <p style="font-size: 10px; margin: 0;">Date d'édition : <strong>${dateStr}</strong></p>
        </div>
      </div>

      <div style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
        <h2 style="font-size: 14px; margin: 0 0 8px 0; color: #1f2937; border-bottom: 1px solid #d1d5db; padding-bottom: 4px;">Fiche de Transport — Car ${escapeHtml(v.immatriculation)}</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px;">
          <p style="margin: 2px 0;"><strong>Véhicule :</strong> ${escapeHtml(v.marque)} ${escapeHtml(v.modele || '')} (${v.capacite} places)</p>
          <p style="margin: 2px 0;"><strong>Chauffeur :</strong> ${escapeHtml(v.chauffeurNom || 'Non renseigné')}</p>
          <p style="margin: 2px 0;"><strong>Téléphone Chauffeur :</strong> ${escapeHtml(v.chauffeurTel || 'Non renseigné')}</p>
          <p style="margin: 2px 0;"><strong>Total Élèves :</strong> ${assigned.length} élèves affectés</p>
        </div>
      </div>

      <h3 style="font-size: 12px; margin: 0 0 10px 0; color: #374151;">Liste des passagers affectés</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px;">
        <thead>
          <tr style="background-color: #2563eb; color: #fff;">
            <th style="padding: 8px; border: 1px solid #2563eb; text-align: center; width: 30px;">N°</th>
            <th style="padding: 8px; border: 1px solid #2563eb; text-align: left; width: 80px;">Matricule</th>
            <th style="padding: 8px; border: 1px solid #2563eb; text-align: left;">Nom & Prénoms</th>
            <th style="padding: 8px; border: 1px solid #2563eb; text-align: center; width: 60px;">Classe</th>
            <th style="padding: 8px; border: 1px solid #2563eb; text-align: left;">Arrêt de descente/montée</th>
            <th style="padding: 8px; border: 1px solid #2563eb; text-align: center; width: 50px;">Matin</th>
            <th style="padding: 8px; border: 1px solid #2563eb; text-align: center; width: 50px;">Soir</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 10px; color: #666;">
        <p>Visa de l'Administration</p>
        <p>Signature du Chauffeur</p>
      </div>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '0';
    iframe.style.width = '794px';
    iframe.style.height = '1123px';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de préparer le document PDF.' });
      if (iframe.parentNode) document.body.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    iframeDoc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#111;background:#fff;margin:0;padding:20px;font-size:11px;}</style></head><body>${container.innerHTML}</body></html>`);
    iframeDoc.close();

    import('html2pdf.js').then((html2pdfModule) => {
      const html2pdf = html2pdfModule.default || html2pdfModule;
      html2pdf()
        .from(iframeDoc.body)
        .set({
          filename: `passagers_car_${v.immatriculation.replace(/\s+/g, '_')}.pdf`,
          margin: 10,
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 794 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        })
        .save()
        .then(() => {
          if (iframe.parentNode) document.body.removeChild(iframe);
          toast({ title: 'Fiche PDF générée et téléchargée' });
        });
    }).catch((err) => {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erreur de génération PDF', description: 'Le module html2pdf.js n\'a pas pu être chargé.' });
      if (iframe.parentNode) document.body.removeChild(iframe);
    });
  };

  const getVehicule = (id: string) => vehicules.find(v => v.id === id);
  const getEleve = (id: string) => students.find(s => String(s.id) === id);

  const exportPointagesCSV = (date = new Date().toISOString().split('T')[0]) => {
    const rows = pointages
      .filter(p => {
        const t = trajets.find(x => x.id === p.trajetId);
        return t && t.date === date;
      })
      .map(p => {
        const e = getEleve(p.eleveId);
        const t = trajets.find(x => x.id === p.trajetId);
        const v = t ? getVehicule(t.vehiculeId) : null;
        return {
          date: t?.date || '',
          trajet: t ? `${t.type === 'matin' ? 'Matin' : 'Soir'} - ${t.itineraire}` : '',
          vehicule: v?.immatriculation || '',
          eleve: e ? `${formatStudentName(e)}` : '—',
          matricule: e?.matricule || '—',
          statut: p.statut === 'monte' ? 'Monté' : p.statut === 'descendu' ? 'Descendu' : 'Absent',
          heure: p.heure,
        };
      });
    if (rows.length === 0) {
      toast({ variant: 'destructive', title: 'Aucun pointage', description: 'Aucun pointage à exporter pour cette date.' });
      return;
    }
    const headers = ['Date', 'Trajet', 'Véhicule', 'Élève', 'Matricule', 'Statut', 'Heure'];
    const csv = [headers.join(';'), ...rows.map(r => [r.date, r.trajet, r.vehicule, r.eleve, r.matricule, r.statut, r.heure].join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pointages-transport-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export CSV généré', description: `${rows.length} ligne(s) exportée(s).` });
  };

  const rapportJour = (date = new Date().toISOString().split('T')[0]) => {
    const trajetsJour = trajets.filter(t => t.date === date);
    const pointagesJour = pointages.filter(p => trajetsJour.some(t => t.id === p.trajetId));
    return {
      trajets: trajetsJour.length,
      montes: pointagesJour.filter(p => p.statut === 'monte').length,
      descendus: pointagesJour.filter(p => p.statut === 'descendu').length,
      absents: pointagesJour.filter(p => p.statut === 'absent').length,
    };
  };

  const pointageEleve = async (eleveId: string, statut: 'monte' | 'descendu' | 'absent') => {
    if (!trajetActif) {
      toast({ variant: 'destructive', title: 'Aucun trajet actif', description: 'Démarrez un trajet pour pointer un élève.' });
      return;
    }
    const payload = {
      eleveId: Number(eleveId),
      trajetId: Number(trajetActif.id),
      statut,
      heure: new Date().toTimeString().slice(0, 5),
    };
    try {
      await apiClient.createPointageBus(payload);
      toast({ title: `Élève ${statut === 'monte' ? 'monté' : statut === 'descendu' ? 'descendu' : 'absent'}`, description: `${getEleve(eleveId)?.lastName} ${getEleve(eleveId)?.firstName}` });

      const pData = await apiClient.getPointagesBus();
      const mappedPointages = (pData || []).map((p: any) => ({
        eleveId: String(p.eleveId),
        trajetId: String(p.trajetId),
        statut: p.statut as 'monte' | 'descendu' | 'absent',
        heure: p.heure
      }));
      setPointages(mappedPointages);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur de pointage', description: err.response?.data?.detail || String(err) });
    }
  };

  const getStatutPointage = (eleveId: string, trajetId?: string) => {
    const tId = trajetId || trajetActif?.id;
    if (!tId) return null;
    return pointages.find(p => p.eleveId === eleveId && p.trajetId === tId)?.statut || null;
  };



  const getStudentZoneTarif = (student: any, overrideRecord?: any) => {
    if (overrideRecord && (overrideRecord.zone_id || overrideRecord.quartier || overrideRecord.quartier_nom || overrideRecord.montant)) {
      return {
        zoneId: Number(overrideRecord.zone_id || 1),
        quartierNom: String(overrideRecord.quartier || overrideRecord.quartier_nom || 'Ligne Standard'),
        tarif: Number(overrideRecord.montant || overrideRecord.amount || overrideRecord.tarif || 18000),
      };
    }

    if (!student) {
      return { zoneId: 1, quartierNom: 'Djibi / Biabou', tarif: 18000 };
    }

    const sId = String(student.id);
    const aff = affectations.find(a => String(a.eleveId) === sId);
    const pay = payments.find(p => {
      const pStudId = String(p.studentId || p.eleve_id);
      const isTrans = p.type === 'transport' || String(p.observation || '').toLowerCase().includes('transport');
      return pStudId === sId && isTrans;
    });

    let targetArret = (aff?.arret || student.quartier_transport || student.zone_transport || student.arret || student.ligne_nom || student.AU_QUARTIER || '').trim();
    if (!targetArret && pay) {
      const obsStr = pay.observation || pay.transactionNumber || pay.receiptNumber || '';
      if (obsStr.includes('||')) {
        targetArret = obsStr.split('||')[1] || '';
      } else if (pay.quartier || pay.quartier_nom) {
        targetArret = pay.quartier || pay.quartier_nom;
      }
    }

    let zoneObj: any = null;
    let quartierObj: any = null;

    if (targetArret && zonesData.zones) {
      const cleanArret = targetArret.toLowerCase().trim();
      for (const z of zonesData.zones) {
        // Match quartier name
        const q = (z.quartiers || []).find((item: any) => {
          const qName = (typeof item === 'string' ? item : (item?.nom || '')).toLowerCase().trim();
          return qName && (qName.includes(cleanArret) || cleanArret.includes(qName));
        });
        if (q) {
          zoneObj = z;
          quartierObj = q;
          break;
        }
        // Match zone name or zone tag
        const zName = (z.nom || '').toLowerCase().trim();
        const zTag = `zone ${z.zone_id}`.toLowerCase();
        if (cleanArret.includes(zTag) || zName.includes(cleanArret) || cleanArret.includes(zName)) {
          zoneObj = z;
          quartierObj = z.quartiers?.[0] || null;
          break;
        }
      }
    }

    if (!quartierObj && zonesData.zones?.[0]?.quartiers?.[0]) {
      zoneObj = zonesData.zones[0];
      quartierObj = zonesData.zones[0].quartiers[0];
    }

    let rawTarif = 18000;
    if (typeof quartierObj === 'object' && quartierObj?.tarif != null) {
      rawTarif = Number(quartierObj.tarif);
    } else if (typeof quartierObj === 'number') {
      rawTarif = quartierObj;
    } else if (zoneObj?.tarif || zoneObj?.tarifMensuel || zoneObj?.montant_mensuel) {
      rawTarif = Number(zoneObj.tarif || zoneObj.tarifMensuel || zoneObj.montant_mensuel);
    } else if (zoneObj?.zone_id === 2 || zoneObj?.code === 'ZONE-2') {
      rawTarif = 22000;
    } else if (zoneObj?.zone_id === 3 || zoneObj?.code === 'ZONE-3') {
      rawTarif = 25000;
    } else if (zoneObj?.zone_id === 1 || zoneObj?.code === 'ZONE-1') {
      rawTarif = 18000;
    }

    return {
      zoneId: zoneObj?.zone_id || 1,
      quartierNom: (typeof quartierObj === 'object' ? quartierObj?.nom : null) || targetArret || 'Ligne Standard',
      tarif: rawTarif > 0 ? rawTarif : 18000,
    };
  };

  const isMonthPaid = (studentId: string, monthName: string) => {
    const monthClean = monthName.split(' ')[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return payments.some(p => {
      const pStudId = String(p.studentId || p.eleve_id);
      if (pStudId !== String(studentId)) return false;
      const isTransport = p.type === 'transport' || String(p.observation || '').toLowerCase().includes('transport');
      const isPaye = p.status === 'paye' || p.statut === 'paye';
      const obs = (p.observation || p.receiptNumber || p.transactionNumber || p.mois || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return isTransport && isPaye && obs.includes(monthClean);
    });
  };

  const getPaymentDetails = (studentId: string, monthName: string) => {
    const monthClean = monthName.split(' ')[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return payments.find(p => {
      const pStudId = String(p.studentId || p.eleve_id);
      if (pStudId !== String(studentId)) return false;
      const isTransport = p.type === 'transport' || String(p.observation || '').toLowerCase().includes('transport');
      const isPaye = p.status === 'paye' || p.statut === 'paye';
      const obs = (p.observation || p.receiptNumber || p.transactionNumber || p.mois || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return isTransport && isPaye && obs.includes(monthClean);
    });
  };

  const currentSchoolMonth = useMemo(() => {
    const monthsFr = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const now = new Date();
    const currentName = monthsFr[now.getMonth()];
    const found = MOIS_SCOLAIRES.find(m => m.toLowerCase().includes(currentName.toLowerCase()));
    return found || 'Octobre 2026';
  }, []);

  const currentMonthIdx = useMemo(() => {
    const idx = MOIS_SCOLAIRES.indexOf(currentSchoolMonth);
    return idx >= 0 ? idx : 1;
  }, [currentSchoolMonth]);

  const currentSchoolMonthShort = useMemo(() => {
    return currentSchoolMonth.split(' ')[0];
  }, [currentSchoolMonth]);

  const elevesEcheancierFiltered = useMemo(() => {
    return students.filter(s => {
      if (s.status !== 'actif') return false;

      // EXCLUSIVEMENT les élèves attribués / transférés au service Transport (géré à l'Économat)
      const isEnrolled = isStudentTransportEnrolled(s);
      if (!isEnrolled) return false;

      // Filtre par Classe
      if (selectedClasseId !== 'all' && String(s.classId) !== selectedClasseId) {
        return false;
      }

      // Recherche par Nom / Matricule
      const fullName = `${s.lastName || ''} ${s.firstName || ''} ${s.firstName || ''}`.toLowerCase();
      const mat = (s.matricule || '').toLowerCase();
      const q = searchEleveEcheancier.toLowerCase();
      if (q && !fullName.includes(q) && !mat.includes(q)) {
        return false;
      }

      const isCurrentPaid = isMonthPaid(String(s.id), currentSchoolMonth);
      if (selectedStatutFilter === 'a_jour' && !isCurrentPaid) {
        return false;
      }
      if (selectedStatutFilter === 'impaye' && isCurrentPaid) {
        return false;
      }

      return true;
    });
  }, [students, selectedClasseId, searchEleveEcheancier, selectedStatutFilter, affectations, payments, currentSchoolMonth]);

  const openPayModalForStudent = (student: any, monthName: string) => {
    const zoneTarif = getStudentZoneTarif(student);

    setFormPayLine({
      eleveId: String(student.id),
      mois: monthName,
      modePaiement: 'especes',
      numeroTransaction: '',
      observation: `Paiement Transport - ${monthName}`
    });

    setSelectedQuartierPay({
      zone_id: zoneTarif.zoneId,
      nom: zoneTarif.quartierNom,
      tarif: zoneTarif.tarif
    });

    setOpenPayLineModal(true);
  };

  // ─── ÉCHÉANCIER TRIMESTRIEL DE LA CANTINE ────────────────────────────────────
  // ─── ÉCHÉANCIER DE LA CANTINE (MENSUEL OU TRIMESTRIEL) ──────────────────────
  const TRIMESTRES_CANTINE = ['Trimestre 1 (Sep - Déc)', 'Trimestre 2 (Jan - Mar)', 'Trimestre 3 (Avr - Juin)'];
  const MOIS_CANTINE = ['Octobre', 'Novembre', 'Décembre', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin'];
  const CANTINE_TARIF_MENSUEL = 15000;
  const CANTINE_TARIF_TRIMESTRE = 45000;

  const [canteenViewMode, setCanteenViewMode] = useState<'trimestriel' | 'mensuel'>('trimestriel');
  const [selectedClasseCantineId, setSelectedClasseCantineId] = useState<string>('all');
  const [selectedStatutCantineFilter, setSelectedStatutCantineFilter] = useState<string>('all');
  const [searchEleveCantine, setSearchEleveCantine] = useState<string>('');

  const [openPayCanteenModal, setOpenPayCanteenModal] = useState(false);
  const [formPayCanteen, setFormPayCanteen] = useState({
    eleveId: '',
    periodeType: 'trimestriel' as 'trimestriel' | 'mensuel',
    trimestre: 'Trimestre 1 (Sep - Déc)',
    mois: 'Octobre',
    tarif: CANTINE_TARIF_TRIMESTRE,
    modePaiement: 'especes',
    numeroTransaction: '',
    observation: 'Paiement Cantine Trimestriel'
  });
  const [receiptCanteenModal, setReceiptCanteenModal] = useState<any>(null);

  const isCanteenMonthPaid = (studentId: string, monthName: string, skipTriCheck = false) => {
    const cleanMonth = monthName.toLowerCase();
    const monthPaidDirect = payments.some(p => {
      const pStudId = String(p.studentId || p.eleve_id);
      if (pStudId !== String(studentId)) return false;
      const isCantine = p.type === 'cantine' || String(p.observation || '').toLowerCase().includes('cantine');
      const isPaye = p.status === 'paye' || p.statut === 'paye';
      const obs = (p.observation || p.receiptNumber || p.transactionNumber || '').toLowerCase();
      return isCantine && isPaye && obs.includes(cleanMonth);
    });
    if (monthPaidDirect) return true;

    if (!skipTriCheck) {
      let triNum = '1';
      if (['octobre', 'novembre', 'décembre'].includes(cleanMonth)) triNum = '1';
      else if (['janvier', 'février', 'mars'].includes(cleanMonth)) triNum = '2';
      else if (['avril', 'mai', 'juin'].includes(cleanMonth)) triNum = '3';

      const parentTriPaid = payments.some(p => {
        const pStudId = String(p.studentId || p.eleve_id);
        if (pStudId !== String(studentId)) return false;
        const isCantine = p.type === 'cantine' || String(p.observation || '').toLowerCase().includes('cantine');
        const isPaye = p.status === 'paye' || p.statut === 'paye';
        const obs = (p.observation || p.receiptNumber || p.transactionNumber || '').toLowerCase();
        return isCantine && isPaye && (obs.includes(`trimestre-${triNum}`) || obs.includes(`trimestre ${triNum}`) || obs.includes(`t${triNum}`));
      });
      if (parentTriPaid) return true;
    }
    return false;
  };

  const isCanteenTrimesterPaid = (studentId: string, trimestreName: string) => {
    const triNum = trimestreName.split(' ')[1];
    const triPaidDirect = payments.some(p => {
      const pStudId = String(p.studentId || p.eleve_id);
      if (pStudId !== String(studentId)) return false;
      const isCantine = p.type === 'cantine' || String(p.observation || '').toLowerCase().includes('cantine');
      const isPaye = p.status === 'paye' || p.statut === 'paye';
      const obs = (p.observation || p.receiptNumber || p.transactionNumber || '').toLowerCase();
      return isCantine && isPaye && (obs.includes(`trimestre-${triNum}`) || obs.includes(`trimestre ${triNum}`) || obs.includes(`t${triNum}`));
    });
    if (triPaidDirect) return true;

    let monthsForTri: string[] = [];
    if (triNum === '1') monthsForTri = ['octobre', 'novembre', 'décembre'];
    else if (triNum === '2') monthsForTri = ['janvier', 'février', 'mars'];
    else if (triNum === '3') monthsForTri = ['avril', 'mai', 'juin'];

    if (monthsForTri.length > 0) {
      return monthsForTri.every(m => isCanteenMonthPaid(studentId, m, true));
    }
    return false;
  };

  const getCanteenPaymentDetails = (studentId: string, periodName: string, isMensuel = false) => {
    const target = periodName.toLowerCase();
    return payments.find(p => {
      const pStudId = String(p.studentId || p.eleve_id);
      if (pStudId !== String(studentId)) return false;
      const isCantine = p.type === 'cantine' || String(p.observation || '').toLowerCase().includes('cantine');
      const isPaye = p.status === 'paye' || p.statut === 'paye';
      const obs = (p.observation || p.receiptNumber || p.transactionNumber || '').toLowerCase();
      if (!isCantine || !isPaye) return false;
      if (isMensuel) {
        return obs.includes(target);
      } else {
        const triNum = periodName.split(' ')[1];
        return obs.includes(`trimestre-${triNum}`) || obs.includes(`trimestre ${triNum}`) || obs.includes(`t${triNum}`);
      }
    });
  };



  const elevesCantineFiltered = useMemo(() => {
    return students.filter(s => {
      if (s.status !== 'actif') return false;
      if (selectedClasseCantineId !== 'all' && String(s.classId) !== selectedClasseCantineId) return false;
      const fullName = `${s.lastName || ''} ${s.firstName || ''} ${s.firstName || ''}`.toLowerCase();
      const mat = (s.matricule || '').toLowerCase();
      const q = searchEleveCantine.toLowerCase();
      if (q && !fullName.includes(q) && !mat.includes(q)) return false;

      const isEnrolled = isStudentCanteenEnrolled(s);
      if (selectedStatutCantineFilter === 'inscrits' && !isEnrolled) return false;

      const isCurrentPaid = canteenViewMode === 'mensuel'
        ? isCanteenMonthPaid(String(s.id), 'Octobre')
        : isCanteenTrimesterPaid(String(s.id), 'Trimestre 1 (Sep - Déc)');
      if (selectedStatutCantineFilter === 'a_jour' && (!isEnrolled || !isCurrentPaid)) return false;
      if (selectedStatutCantineFilter === 'impaye' && isEnrolled && isCurrentPaid) return false;

      return true;
    });
  }, [students, selectedClasseCantineId, searchEleveCantine, selectedStatutCantineFilter, payments, canteenViewMode]);

  const openPayCanteenModalForStudent = (student: any, periodName: string, isMensuel = false) => {
    const pType = isMensuel ? 'mensuel' : 'trimestriel';
    const defaultTarif = isMensuel ? CANTINE_TARIF_MENSUEL : CANTINE_TARIF_TRIMESTRE;
    setFormPayCanteen({
      eleveId: String(student.id),
      periodeType: pType,
      trimestre: isMensuel ? 'Trimestre 1 (Sep - Déc)' : periodName,
      mois: isMensuel ? periodName : 'Octobre',
      tarif: defaultTarif,
      modePaiement: 'especes',
      numeroTransaction: '',
      observation: `Paiement Cantine (${isMensuel ? 'Mensuel' : 'Trimestriel'}) - ${periodName}`
    });
    setOpenPayCanteenModal(true);
  };

  const handleProcessPayCanteen = async () => {
    if (!formPayCanteen.eleveId) {
      toast({ variant: 'destructive', title: 'Élève requis' });
      return;
    }
    try {
      const isMensuel = formPayCanteen.periodeType === 'mensuel';
      const periodLabel = isMensuel ? formPayCanteen.mois : formPayCanteen.trimestre;
      const res = await apiClient.payCanteen({
        eleve_id: Number(formPayCanteen.eleveId),
        periode_type: formPayCanteen.periodeType,
        trimestre: isMensuel ? undefined : formPayCanteen.trimestre,
        mois: isMensuel ? formPayCanteen.mois : undefined,
        tarif: formPayCanteen.tarif,
        mode_paiement: formPayCanteen.modePaiement,
        numero_transaction: formPayCanteen.numeroTransaction,
        observation: formPayCanteen.observation || `Paiement Cantine (${isMensuel ? 'Mensuel' : 'Trimestriel'}) - ${periodLabel}`
      });
      toast({ title: 'Paiement Cantine Enregistré !', description: res.message });
      setOpenPayCanteenModal(false);
      printCanteenReceipt(res, students.find(s => String(s.id) === String(formPayCanteen.eleveId)), periodLabel, isMensuel);
      await loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur lors du paiement', description: err.response?.data?.detail || String(err) });
    }
  };

  const printCanteenReceipt = async (r: any, defaultStudent?: any, defaultPeriod?: string, isMensuelParam?: boolean) => {
    if (!r) return;

    const studId = String(r.studentId || r.eleve_id || defaultStudent?.id || '');
    const stud = defaultStudent || students.find(s => String(s.id) === studId);
    const eleveNom = r.eleve || (stud ? `${stud.lastName || ''} ${stud.firstName || ''}`.trim() : `Élève #${studId}`);
    const matriculeVal = r.matricule || stud?.matricule || '—';
    const clsObj = classes.find(c => String(c.id) === String(stud?.classId));
    const classNameVal = clsObj ? clsObj.name : (stud?.className || '—');
    const photoUrl = stud?.photo || stud?.photoUrl || stud?.photo_url || stud?.picture || '';

    const numRecuVal = r.numero_recu || r.receiptNumber || `RC-CT-${Date.now()}`;

    const obs = (r.observation || r.numero_transaction || r.transactionNumber || '').toLowerCase();
    const isMensuel = isMensuelParam ?? (r.periode_type === 'mensuel' || obs.includes('mensuel') || MOIS_CANTINE.some(m => obs.includes(m.toLowerCase())));
    let periLabel = r.periode_label || r.trimestre || r.mois || defaultPeriod || '';
    if (!periLabel) {
      periLabel = isMensuel ? 'Octobre' : 'Trimestre 1 (Sep - Déc)';
    }

    const defaultTarif = isMensuel ? CANTINE_TARIF_MENSUEL : CANTINE_TARIF_TRIMESTRE;
    const montantVal = Number(r.montant || r.amount || defaultTarif);
    const modeVal = (r.mode || r.mode_paiement || 'especes').toUpperCase();
    const dateVal = r.date ? new Date(r.date) : new Date();

    const periodList = isMensuel ? MOIS_CANTINE : TRIMESTRES_CANTINE;
    const echeances = periodList.map(p => {
      const paid = isMensuel ? isCanteenMonthPaid(studId, p) : isCanteenTrimesterPaid(studId, p);
      const isCurrentPaid = (p === periLabel);
      const isPaid = paid || isCurrentPaid;
      const periodTarif = isMensuel ? CANTINE_TARIF_MENSUEL : CANTINE_TARIF_TRIMESTRE;
      return {
        rubric: `Cantine — ${p}`,
        amount: periodTarif,
        paid: isPaid ? periodTarif : 0,
        rest: isPaid ? 0 : periodTarif,
      };
    });

    const totalVersed = echeances.reduce((acc, e) => acc + e.paid, 0);
    const soldeRestant = echeances.reduce((acc, e) => acc + e.rest, 0);
    const realSchoolNameCantine = await getRealSchoolName(stud?.schoolId || stud?.ecole_id);

    printReceipt({
      receiptNumber: numRecuVal,
      paymentId: r.paiement_id || r.id,
      amount: montantVal,
      type: 'cantine',
      mode: modeVal,
      date: dateVal,
      studentName: eleveNom,
      studentMatricule: matriculeVal,
      studentClass: classNameVal,
      schoolName: realSchoolNameCantine,
      arrieresAnterieurs: Number(stud?.AU_MONTANTARRIERE || 0),
      studentPhoto: photoUrl,
      totalVersedToDate: totalVersed,
      soldeToDate: soldeRestant,
      echeances: echeances,
      versementDetails: [
        { rubric: `Règlement Cantine Scolaire (${isMensuel ? 'Mensuel' : 'Trimestriel'} - ${periLabel})`, amount: montantVal }
      ]
    });
  };



  const printExecutiveReport = () => {
    const win = window.open('', '_blank');
    if (!win) return;

    const totalTransportEncaisse = payments.filter(p => p.type === 'transport' && (p.status === 'paye' || p.statut === 'paye')).reduce((sum, p) => sum + (Number(p.amount || p.montant) || 0), 0);
    const totalCantineEncaisse = payments.filter(p => p.type === 'cantine' && (p.status === 'paye' || p.statut === 'paye')).reduce((sum, p) => sum + (Number(p.amount || p.montant) || 0), 0);
    const totalGeneralEncaisse = totalTransportEncaisse + totalCantineEncaisse;

    const classesRows = classes.map(c => {
      const classStudents = students.filter(s => s.status === 'actif' && String(s.classId) === String(c.id));
      const transportSubscribed = classStudents.filter(s => isStudentTransportEnrolled(s)).length;
      const cantineSubscribed = classStudents.filter(s => isStudentCanteenEnrolled(s)).length;

      const transportPaid = classStudents.reduce((sum, s) => {
        const pCount = MOIS_SCOLAIRES.filter(m => isMonthPaid(String(s.id), m)).length;
        return sum + (pCount * getStudentZoneTarif(s).tarif);
      }, 0);

      const cantinePaid = classStudents.reduce((sum, s) => {
        const pCount = TRIMESTRES_CANTINE.filter(t => isCanteenTrimesterPaid(String(s.id), t)).length;
        return sum + (pCount * CANTINE_TARIF_TRIMESTRE);
      }, 0);

      return `
        <tr>
          <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${c.name}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${classStudents.length}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${transportSubscribed} / ${cantineSubscribed}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; color: #047857; font-weight: bold;">${transportPaid.toLocaleString()} F</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; color: #0284c7; font-weight: bold;">${cantinePaid.toLocaleString()} F</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: 800;">${(transportPaid + cantinePaid).toLocaleString()} F CFA</td>
        </tr>
      `;
    }).join('');

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rapport Financier & Synthétique Services Annexes</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #0f172a; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 22px; font-weight: 800; color: #0369a1; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; text-align: center; }
          .kpi-val { font-size: 18px; font-weight: 800; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 16px; }
          th { background: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; text-align: left; }
          .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">HÎNNEH ÉDUCATION — SERVICES ANNEXES</div>
          <div class="subtitle">RAPPORT EXÉCUTIF ET FINANCIER (TRANSPORT & CANTINE SCOLAIRE)</div>
          <div style="font-size:11px; color:#475569; margin-top:6px;">Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div style="font-size:11px; color:#64748b;">Total Recouvré Transport</div>
            <div class="kpi-val" style="color:#047857;">${totalTransportEncaisse.toLocaleString()} F</div>
          </div>
          <div class="kpi-card">
            <div style="font-size:11px; color:#64748b;">Total Recouvré Cantine</div>
            <div class="kpi-val" style="color:#0284c7;">${totalCantineEncaisse.toLocaleString()} F</div>
          </div>
          <div class="kpi-card">
            <div style="font-size:11px; color:#64748b;">Total Encaissements Annexes</div>
            <div class="kpi-val" style="color:#6d28d9;">${totalGeneralEncaisse.toLocaleString()} F CFA</div>
          </div>
        </div>

        <h3 style="font-size:14px; font-weight:800; color:#1e293b; margin-bottom:8px;">Synthèse par Classe</h3>
        <table>
          <thead>
            <tr>
              <th>Classe</th>
              <th style="text-align:center">Effectif</th>
              <th style="text-align:center">Transport / Cantine</th>
              <th style="text-align:right">Recouvrement Transport</th>
              <th style="text-align:right">Recouvrement Cantine</th>
              <th style="text-align:right">Total Encaissé</th>
            </tr>
          </thead>
          <tbody>
            ${classesRows}
          </tbody>
        </table>

        <div class="footer">
          <p>Direction Financière et Comptabilité${getEcoleCourante()?.name ? ` — ${getEcoleCourante()!.name.toUpperCase()}` : ''}</p>
          <p>Rapport certifié et conforme aux écritures comptables.</p>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const statVehicules = {
    actifs: vehicules.filter(v => v.statut === 'actif').length,
    enPanne: vehicules.filter(v => v.statut === 'en_panne').length,
    totalPlaces: vehicules.filter(v => v.statut === 'actif').reduce((s, v) => s + v.capacite, 0),
    affectes: affectations.length,
  };

  return (
    <Layout
      loading={loading}
      loadingMessage="Chargement de l'espace transport & cantine..."
      loadingSubmessage="Récupération de la flotte de véhicules, lignes et abonnements"
    >
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Bus className="h-7 w-7 text-primary" />
              Espace Transport & Cantine
            </h1>
            <p className="text-muted-foreground mt-1">Gestion des cars, des chauffeurs et des tarifs de lignes de transport</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 text-xs font-medium" onClick={() => { setEditChauffeur(null); setFormChauffeur({ nom: '', prenom: '', telephone: '', num_permis: '', statut: 'actif', car_id: '', ligne_nom: '' }); setOpenChauffeurModal(true); }}>
              <UserCheck className="h-4 w-4 text-indigo-600" /> Ajouter un chauffeur
            </Button>
            <Button variant="outline" className="gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 text-xs font-medium" onClick={() => { setFormLigne({ nom: '', zone: '', tarif: '20000', km: '4.0 km', quartiers: '', vehicule_id: '' }); setOpenLigneModal(true); }}>
              <Route className="h-4 w-4 text-purple-600" /> Nouvelle Ligne
            </Button>
            <Button variant="outline" className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 text-xs font-medium" onClick={handleOpenTarifsModal}>
              <DollarSign className="h-4 w-4 text-emerald-600" />
              Tarifs & Grille
            </Button>
            <Button className="gap-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { setEditVehicule(null); setOpenVehicule(true); }}>
              <Plus className="h-4 w-4" />Ajouter un car
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="vehicules" className="gap-1.5 text-xs"><Bus className="h-3.5 w-3.5" />Cars & Véhicules</TabsTrigger>
            <TabsTrigger value="chauffeurs_space" className="gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/50"><UserCheck className="h-3.5 w-3.5 text-indigo-600" />Chauffeurs & Attributions</TabsTrigger>
            <TabsTrigger value="lignes_cars" className="gap-1.5 text-xs"><Route className="h-3.5 w-3.5" />Lignes & Cars</TabsTrigger>
            <TabsTrigger value="affectation" className="gap-1.5 text-xs"><CheckCircle2 className="h-3.5 w-3.5" />Affectation Élèves</TabsTrigger>
            <TabsTrigger value="effectifs_cars" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" />Effectifs par Car</TabsTrigger>
            <TabsTrigger value="tarifs_lignes" className="gap-1.5 text-xs"><MapPin className="h-3.5 w-3.5" />Tarifs & Lignes</TabsTrigger>
            <TabsTrigger value="rapport" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" />Rapport Financier</TabsTrigger>
          </TabsList>

          {/* ─── CHAUFFEURS ET ATTRIBUTIONS CARS ──────────────────────────────────── */}
          <TabsContent value="chauffeurs_space" className="mt-4 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-indigo-600" />
                  Gestion des Chauffeurs & Attributions de Cars
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Enregistrez vos chauffeurs, affectez un car et une ligne de transport scolaire à chaque conducteur.
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs font-semibold rounded-xl" onClick={() => { setEditChauffeur(null); setFormChauffeur({ nom: '', prenom: '', telephone: '', num_permis: '', statut: 'actif', car_id: '', ligne_nom: '' }); setOpenChauffeurModal(true); }}>
                  <Plus className="h-3.5 w-3.5" /> Créer un Chauffeur
                </Button>
                <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-700 text-xs font-semibold rounded-xl" onClick={() => { setFormLigne({ nom: '', zone: '', tarif: '20000', km: '4.0 km', quartiers: '', vehicule_id: '' }); setOpenLigneModal(true); }}>
                  <Route className="h-3.5 w-3.5 text-indigo-600" /> Créer une Ligne
                </Button>
              </div>
            </div>

            {/* GRILLE DES CHAUFFEURS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-indigo-500" />
                  Conducteurs enregistrés ({chauffeurs.length})
                </h4>
              </div>

              {chauffeurs.length === 0 ? (
                <Card className="border-dashed"><CardContent className="py-8 text-center text-xs text-slate-500 italic">Aucun chauffeur enregistré pour le moment. Cliquez sur "Créer un Chauffeur".</CardContent></Card>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {chauffeurs.map((ch: any) => {
                    const assignedCar = vehicules.find((v: any) => String(v.id) === String(ch.car_id));
                    return (
                      <Card key={ch.id} className="hover:shadow-md transition-shadow border-slate-200 dark:border-slate-800">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                                {(ch.nom?.charAt(0) || 'C') + (ch.prenom?.charAt(0) || '')}
                              </div>
                              <div>
                                <h5 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                                  {formatStudentName(ch)}
                                </h5>
                                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Smartphone className="h-3 w-3 text-slate-400" />
                                  {ch.telephone || 'Aucun contact'}
                                </p>
                              </div>
                            </div>
                            <Badge className={`text-[10px] px-2 py-0.5 ${ch.statut === 'actif' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : ch.statut === 'en_conge' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                              {ch.statut === 'actif' ? 'Actif' : ch.statut === 'en_conge' ? 'En congé' : 'Inactif'}
                            </Badge>
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                              <span className="text-slate-500 font-medium flex items-center gap-1">
                                <Bus className="h-3 w-3 text-indigo-500" /> Car Attribué :
                              </span>
                              <span className="font-bold text-indigo-700 dark:text-indigo-300">
                                {assignedCar ? `${assignedCar.immatriculation} (${assignedCar.marque})` : (ch.car_id ? `Car #${ch.car_id}` : 'Non attribué')}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                              <span className="text-slate-500 font-medium flex items-center gap-1">
                                <Route className="h-3 w-3 text-purple-500" /> Ligne Desservie :
                              </span>
                              <span className="font-semibold truncate max-w-[150px]" title={ch.ligne_nom}>
                                {ch.ligne_nom || 'Toutes lignes'}
                              </span>
                            </div>
                            {ch.num_permis && (
                              <div className="flex items-center justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-200 dark:border-slate-800">
                                <span>Permis de conduire :</span>
                                <span className="font-mono text-slate-700 dark:text-slate-300">{ch.num_permis}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-end gap-1.5 pt-1">
                            <Button size="sm" variant="ghost" className="h-8 text-xs text-indigo-600 hover:bg-indigo-50 font-semibold" onClick={() => { setAssignCarItem(assignedCar || { id: ch.car_id || 1, immatriculation: 'Sélectionner' }); setAssignForm({ chauffeur_id: String(ch.id), ligne_nom: ch.ligne_nom || '' }); setOpenAssignModal(true); }}>
                              Attribuer Car
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-600" onClick={() => { setEditChauffeur(ch); setFormChauffeur({ nom: ch.nom, prenom: ch.prenom || '', telephone: ch.telephone || '', num_permis: ch.num_permis || '', statut: ch.statut, car_id: String(ch.car_id || ''), ligne_nom: ch.ligne_nom || '' }); setOpenChauffeurModal(true); }}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700" onClick={() => handleDeleteChauffeur(ch.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ATTRIBUTION DES CARS EN TABLEAU */}
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader className="py-3 px-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Bus className="h-4 w-4 text-indigo-600" /> Attribution du Parc Automobile aux Chauffeurs & Lignes</span>
                  <Badge variant="outline" className="bg-white">{vehicules.length} Car(s) actif(s)</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Immatriculation / Car</th>
                      <th className="p-3">Marque & Modèle</th>
                      <th className="p-3">Capacité</th>
                      <th className="p-3">Chauffeur Principal</th>
                      <th className="p-3">Ligne Desservie</th>
                      <th className="p-3">Statut</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {vehicules.map((v: any) => {
                      const chMatch = chauffeurs.find((c: any) => String(c.car_id) === String(v.id)) || (v.chauffeurNom ? { nom: v.chauffeurNom, telephone: v.chauffeurTel } : null);
                      return (
                        <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                          <td className="p-3 font-bold text-indigo-900 dark:text-indigo-200">{v.immatriculation}</td>
                          <td className="p-3 text-slate-700 dark:text-slate-300">{v.marque} {v.modele}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{v.capacite} places</td>
                          <td className="p-3 font-medium text-slate-900 dark:text-white">
                            {chMatch ? (
                              <div className="flex items-center gap-1.5">
                                <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
                                <span>{chMatch.prenom ? `${formatStudentName(chMatch)}` : chMatch.nom}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Non attribué</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-700 dark:text-slate-300 font-medium">
                            {v.ligne_nom || 'Toutes zones'}
                          </td>
                          <td className="p-3">
                            <Badge className={`text-[10px] ${v.statut === 'actif' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {v.statut}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold" onClick={() => { setAssignCarItem(v); setAssignForm({ chauffeur_id: chMatch?.id ? String(chMatch.id) : '', ligne_nom: v.ligne_nom || '' }); setOpenAssignModal(true); }}>
                              Attribuer Chauffeur
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── VÉHICULES ──────────────────────────────────────────────────────── */}
          <TabsContent value="vehicules" className="mt-4 space-y-4">
            {vehicules.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground italic">Aucun véhicule enregistré.</CardContent></Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicules.map(v => (
                  <Card key={v.id} className={`border-l-4 ${v.statut === 'actif' ? 'border-l-green-500' : v.statut === 'en_panne' ? 'border-l-destructive' : 'border-l-amber-500'}`}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-lg flex items-center gap-2"><Bus className="h-5 w-5 text-primary" />{v.immatriculation}</p>
                          <p className="text-sm text-muted-foreground">{v.marque} {v.modele}</p>
                        </div>
                        <Badge variant={v.statut === 'actif' ? 'default' : 'secondary'}>{v.statut === 'actif' ? 'Actif' : v.statut === 'en_panne' ? 'En panne' : 'Révision'}</Badge>
                      </div>
                      <div className="text-sm space-y-1 text-muted-foreground pt-1.5 border-t border-slate-100 dark:border-slate-800">
                        <p>👤 Chauffeur : <strong>{v.chauffeurNom || '—'}</strong> · {v.chauffeurTel || '—'}</p>
                        <p>🪑 Capacité : <strong>{v.capacite}</strong> places</p>
                        <p>🛣️ Trajets effectués : {v.trajets || 0}</p>
                        {(() => {
                          // Find all zones assigned to this car
                          const carZones = (zonesData.zones || []).filter(z => String(z.vehicule_id) === String(v.id));
                          // Find all students in those zones
                          const carStudents = students.filter(s => {
                            const hasExplicitCar = affectations.some(a => String(a.eleveId) === String(s.id) && String(a.vehiculeId) === String(v.id));
                            if (hasExplicitCar) return true;
                            const studentHab = `${s.AU_COMMUNE || ''} ${s.AU_QUARTIER || ''} ${s.AU_ADRESSE_GEO || ''}`.toLowerCase();
                            const inZone = carZones.some(z => z.quartiers?.some((q: any) => studentHab.includes((typeof q === 'string' ? q : (q?.nom || '')).toLowerCase())));
                            const isEnrolled = s.serviceTransport || affectations.some(a => a.eleveId === String(s.id));
                            return isEnrolled && inZone;
                          });

                          return (
                            <div className="pt-2 mt-2 border-t border-indigo-50 dark:border-slate-800">
                              <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] mb-2">
                                👦 {carStudents.length} élève(s) dans ce car
                              </Badge>
                              {carStudents.length > 0 ? (
                                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                                  {carStudents.map(s => (
                                    <div key={s.id} className="flex justify-between items-center p-1 rounded bg-slate-50 dark:bg-slate-800 text-[10px] border">
                                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                                        {formatStudentName(s)}
                                      </span>
                                      <span className="text-[9px] bg-slate-200 dark:bg-slate-700 px-1 rounded font-mono">
                                        {s.className || '—'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[10px] text-muted-foreground italic">Aucun élève affecté à ce véhicule.</p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* ─── LIGNES & CARS ─────────────────────────────────────────────────── */}
          <TabsContent value="lignes_cars" className="mt-4 space-y-4">
            <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50/50 via-white to-blue-50/30 dark:from-indigo-950/20 dark:to-slate-900">
              <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Route className="h-5 w-5 text-indigo-600" />
                    Affectation des Cars aux Lignes de Transport
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Associez chaque zone/ligne à un véhicule spécifique de la flotte pour suivre les élèves par trajet.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(zonesData.zones || []).map((z) => {
                // Find assigned car
                const assignedCar = vehicules.find(v => String(v.id) === String(z.vehicule_id));
                const zoneStudents = students.filter(s => {
                  const studentHab = `${s.AU_COMMUNE || ''} ${s.AU_QUARTIER || ''} ${s.AU_ADRESSE_GEO || ''}`.toLowerCase();
                  const inQuartier = z.quartiers?.some((q: any) => studentHab.includes((typeof q === 'string' ? q : (q?.nom || '')).toLowerCase()));
                  const isEnrolled = s.serviceTransport || affectations.some(a => a.eleveId === String(s.id));
                  return isEnrolled && inQuartier;
                });

                return (
                  <Card key={z.zone_id} className="hover:shadow-md transition-shadow border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                    <CardHeader className="p-4 pb-2 bg-slate-50/50 dark:bg-slate-900/50 border-b">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="font-bold text-indigo-700 bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300">
                          Zone {z.zone_id}
                        </Badge>
                        <Badge className="bg-emerald-600 text-white text-[10px]">
                          {zoneStudents.length} élève(s) actif(s)
                        </Badge>
                      </div>
                      <CardTitle className="text-sm font-bold mt-1.5 text-slate-900 dark:text-white truncate">
                        {z.nom}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3 text-xs flex-1">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-700">Car / Véhicule Assigné :</Label>
                        <Select
                          value={String(z.vehicule_id || '')}
                          onValueChange={async (newCarId) => {
                            try {
                              const updatedZones = (zonesData.zones || []).map(zoneItem => {
                                if (zoneItem.zone_id === z.zone_id) {
                                  return { ...zoneItem, vehicule_id: newCarId ? Number(newCarId) : null };
                                }
                                return zoneItem;
                              });
                              await apiClient.updateTarifs({
                                cantine_mensuel: formTarifs.cantine_mensuel,
                                cantine_trimestriel: formTarifs.cantine_trimestriel,
                                cantine_annuel: formTarifs.cantine_annuel,
                                cantine_journalier: formTarifs.cantine_journalier,
                                zones: updatedZones
                              });
                              toast({ title: "Car assigné avec succès !" });
                              await loadData();
                            } catch (err) {
                              toast({ variant: 'destructive', title: 'Erreur d\'assignation' });
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-950 mt-1">
                            <SelectValue placeholder="Aucun véhicule assigné" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Aucun véhicule assigné</SelectItem>
                            {vehicules.map(v => (
                              <SelectItem key={v.id} value={v.id} className="text-xs">
                                🚌 {v.immatriculation} ({v.marque} - {v.chauffeurNom || 'Sans Chauffeur'})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="pt-2 border-t">
                        <p className="font-bold text-slate-700 mb-2">Détail des élèves sur la ligne ({zoneStudents.length}) :</p>
                        {zoneStudents.length === 0 ? (
                          <p className="text-muted-foreground italic text-[11px]">Aucun élève inscrit sur cette zone.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                            {zoneStudents.map((s) => (
                              <div key={s.id} className="flex justify-between items-center p-1.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                                  👤 {formatStudentName(s)}
                                </span>
                                <Badge variant="outline" className="text-[9px] font-mono">
                                  {s.className || '—'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ─── EFFECTIFS PAR CAR ──────────────────────────────────────────────── */}
          <TabsContent value="effectifs_cars" className="mt-4 space-y-4">
            <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50/50 via-white to-blue-50/30 dark:from-indigo-950/20 dark:to-slate-900">
              <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-600" />
                    Répartition Générale des Élèves par Car
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Vue consolidée de l'effectif des élèves inscrits au service de transport, regroupés par véhicule.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicules.map((v) => {
                // Find all zones assigned to this car
                const carZones = (zonesData.zones || []).filter(z => String(z.vehicule_id) === String(v.id));
                
                // Find all students in those zones or explicitly assigned to this car in affectations
                const carStudents = students.filter(s => {
                  const hasExplicitCar = affectations.some(a => String(a.eleveId) === String(s.id) && String(a.vehiculeId) === String(v.id));
                  if (hasExplicitCar) return true;

                  const studentHab = `${s.AU_COMMUNE || ''} ${s.AU_QUARTIER || ''} ${s.AU_ADRESSE_GEO || ''}`.toLowerCase();
                  const inZone = carZones.some(z => z.quartiers?.some((q: any) => studentHab.includes((typeof q === 'string' ? q : (q?.nom || '')).toLowerCase())));
                  const isEnrolled = s.serviceTransport || affectations.some(a => a.eleveId === String(s.id));
                  const belongsToThisCar = isEnrolled && inZone && carZones.some(z => String(z.vehicule_id) === String(v.id));
                  return belongsToThisCar;
                });

                return (
                  <Card key={v.id} className="border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                    <CardHeader className="p-4 pb-2 bg-slate-50/50 dark:bg-slate-900/50 border-b flex flex-row items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                          🚌 {v.immatriculation}
                        </CardTitle>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{v.marque} {v.modele} · Chauffeur: {v.chauffeurNom || '—'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Badge className="bg-indigo-600 text-white font-bold text-[10px]">
                          {carStudents.length} / {v.capacite} places
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[10px] gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                          onClick={() => exportCarPDF(v)}
                        >
                          <FileText className="h-3 w-3" /> PDF
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3 flex-1 text-xs">
                      {carZones.length > 0 && (
                        <div>
                          <p className="font-bold text-slate-700 mb-1">Lignes / Zones desservies :</p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {carZones.map(z => (
                              <Badge key={z.zone_id} variant="outline" className="text-[10px] bg-slate-100 dark:bg-slate-800">
                                Zone {z.zone_id} : {z.nom}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="pt-2 border-t">
                        <p className="font-bold text-slate-700 mb-2">Liste des élèves ({carStudents.length}) :</p>
                        {carStudents.length === 0 ? (
                          <p className="text-muted-foreground italic text-[11px]">Aucun élève affecté à ce car.</p>
                        ) : (
                          (() => {
                            const itemsPerPage = 5;
                            const currentPage = carPages[v.id] || 1;
                            const totalPages = Math.ceil(carStudents.length / itemsPerPage);
                            const startIndex = (currentPage - 1) * itemsPerPage;
                            const paginatedStudents = carStudents.slice(startIndex, startIndex + itemsPerPage);

                            return (
                              <div className="space-y-2">
                                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                                  {paginatedStudents.map((s, idx) => (
                                    <div key={s.id} className="flex justify-between items-center p-2 rounded bg-slate-100 dark:bg-slate-800 text-[11px] border">
                                      <span className="font-medium text-slate-800 dark:text-slate-200">
                                        {startIndex + idx + 1}. {formatStudentName(s)}
                                      </span>
                                      <Badge variant="outline" className="text-[9px] font-mono shrink-0">
                                        {s.className || '—'}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                                
                                {totalPages > 1 && (
                                  <div className="flex items-center justify-between pt-2 border-t text-[11px] font-medium text-muted-foreground mt-1">
                                    <span>Page {currentPage} / {totalPages}</span>
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 px-2 text-[10px] text-slate-700"
                                        disabled={currentPage === 1}
                                        onClick={() => setCarPages(prev => ({ ...prev, [v.id]: currentPage - 1 }))}
                                      >
                                        Précédent
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 px-2 text-[10px] text-slate-700"
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCarPages(prev => ({ ...prev, [v.id]: currentPage + 1 }))}
                                      >
                                        Suivant
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ─── TRAJETS ────────────────────────────────────────────────────────── */}
          <TabsContent value="trajets" className="mt-4 space-y-4">
            {trajets.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground italic">Aucun trajet planifié.</CardContent></Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/80 border-b">
                      <tr>
                        <th className="text-left p-3">Date</th>
                        <th className="text-left p-3">Car</th>
                        <th className="text-left p-3">Type</th>
                        <th className="text-left p-3">Itinéraire</th>
                        <th className="text-left p-3">Horaires</th>
                        <th className="text-center p-3">Statut</th>
                        <th className="text-center p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trajets.slice().reverse().map(t => (
                        <tr key={t.id} className="border-b hover:bg-muted/20">
                          <td className="p-3 text-muted-foreground text-xs">{t.date}</td>
                          <td className="p-3 font-medium">{getVehicule(t.vehiculeId)?.immatriculation || '—'}</td>
                          <td className="p-3"><Badge variant="outline" className="text-[10px]">{t.type === 'matin' ? '☀️ Matin' : '🌙 Soir'}</Badge></td>
                          <td className="p-3 text-muted-foreground text-xs">{t.itineraire}</td>
                          <td className="p-3 text-xs">{t.heureDepart} → {t.heureArrivee || '...'}</td>
                          <td className="p-3 text-center">
                            <Badge variant={t.statut === 'termine' ? 'default' : t.statut === 'en_cours' ? 'secondary' : 'outline'}>
                              {t.statut === 'planifie' ? 'Planifié' : t.statut === 'en_cours' ? 'En cours' : 'Terminé'}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex gap-1 justify-center">
                              {t.statut === 'planifie' && (
                                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => demarrerTrajet(t)}><Play className="h-3 w-3" />Démarrer</Button>
                              )}
                              {t.statut === 'en_cours' && (
                                <Button size="sm" variant="default" className="h-7 gap-1 text-xs" onClick={() => terminerTrajet(t)}><Square className="h-3 w-3" />Terminer</Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDeleteTrajet(t.id)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ─── AFFECTATION ÉLÈVES ─────────────────────────────────────────────── */}
          <TabsContent value="affectation" className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{affectations.length} élève(s) affecté(s) aux cars</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1 relative">
                  <Download className="h-4 w-4" />
                  Importer CSV
                  <input
                    type="file"
                    accept=".csv"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleImportCSV}
                  />
                </Button>
                <Button size="sm" className="gap-1" onClick={() => setOpenAffectation(true)}><Plus className="h-4 w-4" />Affecter un élève</Button>
              </div>
            </div>
            {affectations.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground italic">Aucune affectation.</CardContent></Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {affectations.map(a => {
                  const e = getEleve(a.eleveId);
                  const v = getVehicule(a.vehiculeId);
                  return (
                    <Card key={`${a.eleveId}-${a.vehiculeId}`}>
                      <CardContent className="p-3 space-y-1.5">
                        <p className="font-semibold text-sm">{e ? `${formatStudentName(e)}` : '—'}</p>
                        <p className="text-xs text-muted-foreground">{e?.className || '—'} · Arrêt : {a.arret || '—'}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1">
                            {a.matin && <Badge variant="secondary" className="text-[10px]">Matin</Badge>}
                            {a.soir && <Badge variant="secondary" className="text-[10px]">Soir</Badge>}
                          </div>
                          <span className="text-xs font-medium text-primary">{v?.immatriculation || '—'}</span>
                        </div>
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openEditAffectation(a)}>
                            <Edit className="h-3 w-3 text-primary" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleDeleteAffectation(a.eleveId)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ─── POINTAGE BUS ───────────────────────────────────────────────────── */}
          <TabsContent value="pointage" className="mt-4 space-y-4">
            {trajetActif ? (
              <div className="space-y-4">
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-primary flex items-center gap-2"><Play className="h-4 w-4" />Trajet en cours</p>
                      <p className="text-sm text-muted-foreground">{getVehicule(trajetActif.vehiculeId)?.immatriculation} · {trajetActif.itineraire} · {trajetActif.type === 'matin' ? 'Matin' : 'Soir'}</p>
                    </div>
                    <Button size="sm" variant="default" className="gap-1" onClick={() => terminerTrajet(trajetActif)}><Square className="h-4 w-4" />Terminer</Button>
                  </CardContent>
                </Card>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Rechercher un élève affecté..." value={searchEleve} onChange={e => setSearchEleve(e.target.value)} />
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {elevesFiltres.map(s => {
                    const aff = affectations.find(a => a.eleveId === String(s.id));
                    const statut = getStatutPointage(String(s.id));
                    if (!aff) return null;
                    const correspond = (trajetActif.type === 'matin' && aff.matin) || (trajetActif.type === 'soir' && aff.soir);
                    if (!correspond) return null;
                    return (
                      <Card key={s.id} className={statut === 'monte' ? 'border-l-4 border-l-green-500' : statut === 'descendu' ? 'border-l-4 border-l-blue-500' : statut === 'absent' ? 'border-l-4 border-l-destructive' : ''}>
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-sm">{formatStudentName(s)}</p>
                              <p className="text-xs text-muted-foreground">{s.className || '—'} · Arrêt : {aff.arret || '—'}</p>
                            </div>
                            {statut && (
                              <Badge variant={statut === 'monte' ? 'default' : statut === 'descendu' ? 'secondary' : 'destructive'} className="text-[10px]">
                                {statut === 'monte' ? 'Monté' : statut === 'descendu' ? 'Descendu' : 'Absent'}
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" className="flex-1 gap-1 text-xs" variant={statut === 'monte' ? 'default' : 'outline'} onClick={() => pointageEleve(String(s.id), 'monte')}><CheckCircle2 className="h-3 w-3" />Monté</Button>
                            <Button size="sm" className="flex-1 gap-1 text-xs" variant={statut === 'descendu' ? 'secondary' : 'outline'} onClick={() => pointageEleve(String(s.id), 'descendu')}><MapPin className="h-3 w-3" />Descendu</Button>
                            <Button size="sm" className="flex-1 gap-1 text-xs" variant={statut === 'absent' ? 'destructive' : 'outline'} onClick={() => pointageEleve(String(s.id), 'absent')}><AlertCircle className="h-3 w-3" />Absent</Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground space-y-3">
                  <Bus className="h-12 w-12 mx-auto opacity-30" />
                  <p>Aucun trajet en cours.</p>
                  <Button size="sm" variant="outline" onClick={() => setActiveTab('trajets')}>Aller aux trajets</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>



          {/* ─── MODE AGENT MOBILE (§1.7) ────────────────────────────────────────── */}
          <TabsContent value="agent" className="mt-4 space-y-4">
            {!agentMobileOpen ? (
              <Card>
                <CardContent className="p-6 text-center space-y-4">
                  <Smartphone className="h-12 w-12 mx-auto text-primary" />
                  <div>
                    <p className="font-semibold">Mode Agent Mobile</p>
                    <p className="text-sm text-muted-foreground">Interface tactile simplifiée pour le pointage rapide des élèves dans le bus.</p>
                  </div>
                  {trajetActif ? (
                    <Button className="gap-2 w-full sm:w-auto" onClick={() => setAgentMobileOpen(true)}>
                      <QrCode className="h-4 w-4" />Ouvrir le pointage
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-destructive">Aucun trajet en cours. Démarrez un trajet d&apos;abord.</p>
                      <Button variant="outline" size="sm" onClick={() => setActiveTab('trajets')}>Aller aux trajets</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setAgentMobileOpen(false)}><ArrowLeft className="h-4 w-4" />Retour</Button>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{getVehicule(trajetActif?.vehiculeId || '')?.immatriculation} · {trajetActif?.itineraire}</p>
                    <p className="text-xs text-muted-foreground">{trajetActif?.type === 'matin' ? 'Matin' : 'Soir'}</p>
                  </div>
                </div>

                <Card>
                  <CardContent className="p-4 space-y-3">
                    <Label className="text-sm font-medium">Code élève / matricule / nom</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Saisir ou scanner..."
                        value={agentCode}
                        onChange={e => setAgentCode(e.target.value)}
                        className="text-lg"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const found = students.find(s =>
                              String(s.id) === agentCode ||
                              s.matricule?.toLowerCase() === agentCode.toLowerCase() ||
                              `${formatStudentName(s)}`.toLowerCase().includes(agentCode.toLowerCase())
                            );
                            if (found) {
                              pointageEleve(String(found.id), 'monte');
                              setAgentCode('');
                            } else {
                              toast({ variant: 'destructive', title: 'Élève non trouvé' });
                            }
                          }
                        }}
                      />
                      <Button className="gap-1" onClick={() => {
                        const found = students.find(s =>
                          String(s.id) === agentCode ||
                          s.matricule?.toLowerCase() === agentCode.toLowerCase() ||
                          `${formatStudentName(s)}`.toLowerCase().includes(agentCode.toLowerCase())
                        );
                        if (found) { pointageEleve(String(found.id), 'monte'); setAgentCode(''); }
                        else { toast({ variant: 'destructive', title: 'Élève non trouvé' }); }
                      }}>
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Saisissez le matricule, l&apos;ID ou le nom de l&apos;élève, puis appuyez sur Entrée.</p>
                  </CardContent>
                </Card>

                <div className="grid gap-3">
                  {elevesTransport.filter(s => {
                    const aff = affectations.find(a => a.eleveId === String(s.id));
                    return aff && ((trajetActif?.type === 'matin' && aff.matin) || (trajetActif?.type === 'soir' && aff.soir));
                  }).map(s => {
                    const statut = getStatutPointage(String(s.id));
                    const aff = affectations.find(a => a.eleveId === String(s.id));
                    return (
                      <Card key={s.id} className={`${statut === 'monte' ? 'bg-green-50 border-green-200' : statut === 'descendu' ? 'bg-blue-50 border-blue-200' : statut === 'absent' ? 'bg-red-50 border-red-200' : ''}`}>
                        <CardContent className="p-3 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{formatStudentName(s)}</p>
                            <p className="text-xs text-muted-foreground">{s.matricule || '—'} · Arrêt : {aff?.arret || '—'}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button size="sm" variant={statut === 'monte' ? 'default' : 'outline'} className="h-9 w-9 p-0 rounded-full" onClick={() => pointageEleve(String(s.id), 'monte')}><CheckCircle2 className="h-4 w-4" /></Button>
                            <Button size="sm" variant={statut === 'descendu' ? 'secondary' : 'outline'} className="h-9 w-9 p-0 rounded-full" onClick={() => pointageEleve(String(s.id), 'descendu')}><MapPin className="h-4 w-4" /></Button>
                            <Button size="sm" variant={statut === 'absent' ? 'destructive' : 'outline'} className="h-9 w-9 p-0 rounded-full" onClick={() => pointageEleve(String(s.id), 'absent')}><AlertCircle className="h-4 w-4" /></Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ─── TARIFICATION & PAIEMENT PAR LIGNE ──────────────────────────────────── */}
          <TabsContent value="tarifs_lignes" className="mt-4 space-y-4">
            {/* Header Card */}
            <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50/50 via-white to-blue-50/30 dark:from-indigo-950/20 dark:to-slate-900">
              <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-indigo-600 text-white font-semibold">Tarification Officielle 2024-2025</Badge>
                    <Badge variant="outline" className="border-indigo-300 text-indigo-700">20 Zones Registrées</Badge>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1.5 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-indigo-600" />
                    Paiement & Abonnements par Ligne de Transport
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Consultez la grille des 20 Zones, sélectionnez le quartier d'un élève pour souscrire et encaisser le transport mensuel.
                  </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <Input
                    placeholder="🔍 Rechercher quartier, zone (ex: Samake, Dokui, PK 18)..."
                    value={searchZone}
                    onChange={e => setSearchZone(e.target.value)}
                    className="w-full md:w-72 bg-white dark:bg-slate-950"
                  />
                  <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0" onClick={() => { setSelectedQuartierPay(null); setOpenPayLineModal(true); }}>
                    <CreditCard className="h-4 w-4" />
                    Nouveau Règlement
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Banner Règlements & Conditions (N.B.) */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-900 p-4 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300 text-sm">
                <Info className="h-4 w-4 text-amber-600 shrink-0" />
                Règlement Intérieur & Conditions Tarifaires du Transport Scolaire :
              </div>
              <ul className="text-xs text-amber-800 dark:text-amber-300/90 space-y-1 list-disc list-inside font-medium pl-1">
                {zonesData.regles && zonesData.regles.length > 0 ? (
                  zonesData.regles.map((r, i) => <li key={i}>{r}</li>)
                ) : (
                  <>
                    <li>Les paiements se font avant consommation au plus tard le 05 du mois.</li>
                    <li>Tout paiement entamé est entièrement dû et ne peut faire l'objet de remboursement quelle qu'en soit la raison.</li>
                    <li>La tarification par zone reste unique même en cas de congés, jour férié ou d'absence.</li>
                  </>
                )}
              </ul>
            </div>

            {/* Zones Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(zonesData.zones || [])
                .filter(z => {
                  if (!searchZone) return true;
                  const qMatch = z.quartiers.some((q: any) => (typeof q === 'string' ? q : (q?.nom || '')).toLowerCase().includes(searchZone.toLowerCase()));
                  const zMatch = z.nom.toLowerCase().includes(searchZone.toLowerCase());
                  return qMatch || zMatch;
                })
                .map(z => (
                  <Card key={z.zone_id} className="hover:shadow-md transition-shadow border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                    <CardHeader className="p-4 pb-2 bg-slate-50/50 dark:bg-slate-900/50 border-b">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="font-bold text-indigo-700 bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300">
                          Zone {z.zone_id}
                        </Badge>
                        <span className="text-xs font-semibold text-slate-500">📏 {z.kilometrage_moyen}</span>
                      </div>
                      <CardTitle className="text-base font-bold mt-1 text-slate-900 dark:text-white leading-tight">
                        {z.nom}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2 text-xs flex-1">
                      <p className="font-semibold text-slate-600 dark:text-slate-400 mb-1">Quartiers & Lignes desservis :</p>
                      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                        {z.quartiers
                          .filter((q: any) => !searchZone || (typeof q === 'string' ? q : (q?.nom || '')).toLowerCase().includes(searchZone.toLowerCase()) || z.nom.toLowerCase().includes(searchZone.toLowerCase()))
                          .map((q: any, idx: number) => {
                            const qNom = typeof q === 'string' ? q : (q?.nom || 'Station');
                            const qTarif = (typeof q === 'object' && q?.tarif != null) ? Number(q.tarif) : 20000;
                            const qKm = typeof q === 'object' ? q?.km : '';
                            return (
                              <div key={`${z.zone_id}-${qNom}-${idx}`} className="flex items-center justify-between p-2 rounded-lg bg-slate-100/70 dark:bg-slate-800/60 hover:bg-slate-200/60 transition-colors">
                                <div>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">{qNom}</span>
                                  {qKm && <span className="text-[10px] text-slate-400 ml-1">({qKm})</span>}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Badge className="bg-emerald-600 text-white text-[11px] font-bold">
                                    {(qTarif || 0).toLocaleString()} F CFA
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-[10px] px-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 font-semibold"
                                    onClick={() => {
                                      setSelectedQuartierPay({ zone_id: z.zone_id, nom: qNom, tarif: qTarif, km: qKm });
                                      setOpenPayLineModal(true);
                                    }}
                                  >
                                    Payer
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>

          {/* ─── RAPPORT FINANCIER & SYNTHÉTIQUE ─────────────────────────────────── */}
          <TabsContent value="rapport" className="mt-4 space-y-4">
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Rapport Synthétique et Financier des Services Annexes
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Statistiques globales du recouvrement, taux d'inscriptions et bilan financier par classe (Transport & Cantine)
                    </p>
                  </div>
                  <Button className="font-semibold gap-2" onClick={printExecutiveReport}>
                    <Printer className="h-4 w-4" /> Imprimer le Bilan Financier Officiel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* General Bilan KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-5 text-center">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Recouvrement Transport</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {payments.filter(p => p.type === 'transport' && (p.status === 'paye' || p.statut === 'paye')).reduce((sum, p) => sum + (Number(p.amount || p.montant) || 0), 0).toLocaleString()} F CFA
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 text-center">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Recouvrement Cantine</p>
                  <p className="text-2xl font-bold text-sky-600 dark:text-sky-400 mt-1">
                    {payments.filter(p => p.type === 'cantine' && (p.status === 'paye' || p.statut === 'paye')).reduce((sum, p) => sum + (Number(p.amount || p.montant) || 0), 0).toLocaleString()} F CFA
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 text-center">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Encaissé Annexes</p>
                  <p className="text-2xl font-bold text-primary mt-1">
                    {(
                      payments.filter(p => p.type === 'transport' && (p.status === 'paye' || p.statut === 'paye')).reduce((sum, p) => sum + (Number(p.amount || p.montant) || 0), 0) +
                      payments.filter(p => p.type === 'cantine' && (p.status === 'paye' || p.statut === 'paye')).reduce((sum, p) => sum + (Number(p.amount || p.montant) || 0), 0)
                    ).toLocaleString()} F CFA
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Bilan par Classe */}
            <Card className="shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/50 py-3 border-b">
                <CardTitle className="text-sm font-semibold">
                  Répartition Financière et Taux de Couverture par Classe
                </CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-900 border-b font-bold text-slate-700 dark:text-slate-200">
                    <tr>
                      <th className="p-3">Classe</th>
                      <th className="p-3 text-center">Effectif Total</th>
                      <th className="p-3 text-center">Inscrits (Transport / Cantine)</th>
                      <th className="p-3 text-right">Recouvrement Transport</th>
                      <th className="p-3 text-right">Recouvrement Cantine</th>
                      <th className="p-3 text-right font-extrabold">Total Général Encaissé</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {classes.map((cls) => {
                      const classStudents = students.filter(s => s.status === 'actif' && String(s.classId) === String(cls.id));
                      const transportSubscribed = classStudents.filter(s => isStudentTransportEnrolled(s)).length;
                      const cantineSubscribed = classStudents.filter(s => isStudentCanteenEnrolled(s)).length;

                      const transportPaid = classStudents.reduce((sum, s) => {
                        const pCount = MOIS_SCOLAIRES.filter(m => isMonthPaid(String(s.id), m)).length;
                        return sum + (pCount * getStudentZoneTarif(s).tarif);
                      }, 0);

                      const cantinePaid = classStudents.reduce((sum, s) => {
                        const pCount = TRIMESTRES_CANTINE.filter(t => isCanteenTrimesterPaid(String(s.id), t)).length;
                        return sum + (pCount * CANTINE_TARIF_TRIMESTRE);
                      }, 0);

                      return (
                        <tr key={cls.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{cls.name}</td>
                          <td className="p-3 text-center">{classStudents.length} élèves</td>
                          <td className="p-3 text-center">
                            <span className="text-emerald-700 font-semibold">{transportSubscribed} transport</span> / <span className="text-sky-700 font-semibold">{cantineSubscribed} cantine</span>
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-700">{transportPaid.toLocaleString()} F</td>
                          <td className="p-3 text-right font-bold text-sky-700">{cantinePaid.toLocaleString()} F</td>
                          <td className="p-3 text-right font-extrabold text-purple-900 dark:text-purple-200">{ (transportPaid + cantinePaid).toLocaleString() } F CFA</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

      </motion.div>

      {/* ─── Dialog Véhicule ─────────────────────────────────────────────────────── */}
      <Dialog open={openVehicule} onOpenChange={v => { setOpenVehicule(v); if (!v) setEditVehicule(null); }}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader><DialogTitle>{editVehicule ? 'Modifier le véhicule' : 'Ajouter un véhicule'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Immatriculation *</Label><Input value={formVehicule.immatriculation} onChange={e => setFormVehicule(p => ({ ...p, immatriculation: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Capacité</Label><Input type="number" value={formVehicule.capacite} onChange={e => setFormVehicule(p => ({ ...p, capacite: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Marque *</Label><Input value={formVehicule.marque} onChange={e => setFormVehicule(p => ({ ...p, marque: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Modèle</Label><Input value={formVehicule.modele} onChange={e => setFormVehicule(p => ({ ...p, modele: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Chauffeur</Label><Input placeholder="Nom complet" value={formVehicule.chauffeurNom} onChange={e => setFormVehicule(p => ({ ...p, chauffeurNom: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Téléphone</Label><Input value={formVehicule.chauffeurTel} onChange={e => setFormVehicule(p => ({ ...p, chauffeurTel: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>Statut</Label>
              <Select value={formVehicule.statut} onValueChange={v => setFormVehicule(p => ({ ...p, statut: v as Vehicule['statut'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="actif">Actif</SelectItem>
                  <SelectItem value="en_panne">En panne</SelectItem>
                  <SelectItem value="revision">Révision</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenVehicule(false)}>Fermer</Button>
            <Button onClick={saveVehicule}>{editVehicule ? 'Mettre à jour' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog Trajet ───────────────────────────────────────────────────────── */}
      <Dialog open={openTrajet} onOpenChange={setOpenTrajet}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader><DialogTitle>Planifier un trajet</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1"><Label>Véhicule *</Label>
              <Select value={formTrajet.vehiculeId} onValueChange={v => setFormTrajet(p => ({ ...p, vehiculeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un car" /></SelectTrigger>
                <SelectContent>
                  {vehicules.filter(v => v.statut === 'actif').map(v => <SelectItem key={v.id} value={v.id}>{v.immatriculation} — {v.chauffeurNom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Type</Label>
                <Select value={formTrajet.type} onValueChange={v => setFormTrajet(p => ({ ...p, type: v as 'matin' | 'soir' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="matin">☀️ Matin</SelectItem>
                    <SelectItem value="soir">🌙 Soir</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Itinéraire *</Label><Input placeholder="ex: Cocody → Bingerville" value={formTrajet.itineraire} onChange={e => setFormTrajet(p => ({ ...p, itineraire: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Heure départ</Label><Input type="time" value={formTrajet.heureDepart} onChange={e => setFormTrajet(p => ({ ...p, heureDepart: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Heure arrivée prévue</Label><Input type="time" value={formTrajet.heureArrivee} onChange={e => setFormTrajet(p => ({ ...p, heureArrivee: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenTrajet(false)}>Fermer</Button>
            <Button onClick={saveTrajet}>Planifier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog Affectation ──────────────────────────────────────────────────── */}
      <Dialog open={openAffectation} onOpenChange={(open) => { setOpenAffectation(open); if (!open) setFormAffect({ eleveId: '', vehiculeId: '', arret: '', matin: true, soir: true }); }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader><DialogTitle>{elevesAffectes.has(formAffect.eleveId) ? "Modifier l'affectation" : 'Affecter un élève à un car'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1"><Label>Élève *</Label>
              <Popover open={affectEleveSearchOpen} onOpenChange={setAffectEleveSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={affectEleveSearchOpen}
                    className="w-full justify-between font-normal"
                  >
                    {(() => {
                      const s = students.find(st => String(st.id) === formAffect.eleveId);
                      return s
                        ? <span className="truncate">{formatStudentName(s)}{s.className ? ` — ${s.className}` : ''}</span>
                        : <span className="text-muted-foreground">Sélectionner un élève</span>;
                    })()}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Rechercher par nom ou prénom..." />
                    <CommandList>
                      <CommandEmpty>Aucun élève trouvé.</CommandEmpty>
                      <CommandGroup>
                        {students.filter(s => s.status === 'actif').map(s => {
                          const label = `${s.lastName || ''} ${s.firstName || ''} ${s.className || ''}`;
                          return (
                            <CommandItem
                              key={s.id}
                              value={label}
                              onSelect={() => {
                                setFormAffect(p => ({ ...p, eleveId: String(s.id) }));
                                setAffectEleveSearchOpen(false);
                              }}
                            >
                              <Check className={cn('mr-2 h-4 w-4', formAffect.eleveId === String(s.id) ? 'opacity-100' : 'opacity-0')} />
                              {formatStudentName(s)} {s.className ? `— ${s.className}` : ''}{elevesAffectes.has(String(s.id)) ? ' (déjà affecté)' : ''}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1"><Label>Véhicule *</Label>
              <Select value={formAffect.vehiculeId} onValueChange={v => setFormAffect(p => ({ ...p, vehiculeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un car" /></SelectTrigger>
                <SelectContent>
                  {vehicules.filter(v => v.statut === 'actif').map(v => <SelectItem key={v.id} value={v.id}>{v.immatriculation} ({v.capacite} places)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Arrêt / Lieu de prise en charge</Label><Input placeholder="ex: Carrefour Angré" value={formAffect.arret} onChange={e => setFormAffect(p => ({ ...p, arret: e.target.value }))} /></div>
            <div className="flex gap-4 pt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={formAffect.matin} onChange={e => setFormAffect(p => ({ ...p, matin: e.target.checked }))} className="h-4 w-4 accent-primary" />
                Transport matin
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={formAffect.soir} onChange={e => setFormAffect(p => ({ ...p, soir: e.target.checked }))} className="h-4 w-4 accent-primary" />
                Transport soir
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAffectation(false)}>Fermer</Button>
            <Button onClick={saveAffectation}>Affecter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog Règlement Ligne de Transport ─────────────────────────────── */}
      <Dialog open={openPayLineModal} onOpenChange={setOpenPayLineModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-700 font-bold">
              <CreditCard className="h-5 w-5" />
              Paiement & Souscription Transport par Ligne
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 text-sm">
            {/* Élève */}
            <div className="space-y-1">
              <Label className="font-semibold">Élève souscripteur *</Label>
              <Select
                value={formPayLine.eleveId}
                onValueChange={v => {
                  setFormPayLine(p => ({ ...p, eleveId: v }));
                  const selStud = students.find(s => String(s.id) === String(v));
                  if (selStud) {
                    const zt = getStudentZoneTarif(selStud);
                    setSelectedQuartierPay({
                      zone_id: zt.zoneId,
                      nom: zt.quartierNom,
                      tarif: zt.tarif
                    });
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Sélectionner un élève..." /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {students.filter(s => s.status === 'actif').map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {formatStudentName(s)} {s.matricule ? `(${s.matricule})` : ''} {s.className ? `— ${s.className}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selection Quartier / Ligne */}
            {!selectedQuartierPay ? (
              <div className="space-y-1">
                <Label className="font-semibold">Sélectionner une Zone & Quartier *</Label>
                <Select
                  onValueChange={v => {
                    const [zId, qNom, tVal] = v.split('||');
                    setSelectedQuartierPay({ zone_id: Number(zId), nom: qNom, tarif: Number(tVal) });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Choisir la zone et le quartier..." /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {(zonesData.zones || []).flatMap(z =>
                      (z.quartiers || []).map((q: any, idx: number) => {
                        const qNom = typeof q === 'string' ? q : (q?.nom || 'Station');
                        const qTarif = (typeof q === 'object' && q?.tarif != null)
                          ? Number(q.tarif)
                          : (Number(z.tarif) || Number(z.tarifMensuel) || (z.zone_id === 1 ? 12000 : z.zone_id === 2 ? 15000 : 20000));
                        return (
                          <SelectItem key={`${z.zone_id}-${qNom}-${idx}`} value={`${z.zone_id}||${qNom}||${qTarif}`}>
                            Zone {z.zone_id} — {qNom} ({(qTarif || 0).toLocaleString()} F CFA)
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                <div>
                  <Badge className="bg-indigo-600 text-white mb-1">Zone {selectedQuartierPay.zone_id}</Badge>
                  <p className="font-bold text-indigo-950 dark:text-indigo-200">{selectedQuartierPay.nom}</p>
                  {selectedQuartierPay.km && <p className="text-xs text-muted-foreground">Distance: {selectedQuartierPay.km}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Tarif Mensuel</p>
                  <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{(selectedQuartierPay?.tarif || 0).toLocaleString()} F CFA</p>
                  <Button size="sm" variant="ghost" className="h-5 text-[10px] text-destructive hover:underline p-0" onClick={() => setSelectedQuartierPay(null)}>
                    Changer de ligne
                  </Button>
                </div>
              </div>
            )}

            {/* Mois & Mode */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-semibold">Mois à régler *</Label>
                <Select value={formPayLine.mois} onValueChange={v => setFormPayLine(p => ({ ...p, mois: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Septembre 2026', 'Octobre 2026', 'Novembre 2026', 'Décembre 2026', 'Janvier 2027', 'Février 2027', 'Mars 2027', 'Avril 2027', 'Mai 2027', 'Juin 2027'].map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="font-semibold">Mode de Paiement *</Label>
                <Select value={formPayLine.modePaiement} onValueChange={v => setFormPayLine(p => ({ ...p, modePaiement: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="especes">💵 Espèces (Guichet)</SelectItem>
                    <SelectItem value="mobile_money">📱 Mobile Money</SelectItem>
                    <SelectItem value="virement">🏦 Virement Bancaire</SelectItem>
                    <SelectItem value="cheque">📄 Chèque</SelectItem>
                    <SelectItem value="carte">💳 Carte Bancaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Reference */}
            {formPayLine.modePaiement !== 'especes' && (
              <div className="space-y-1">
                <Label>N° de Transaction / Chèque</Label>
                <Input placeholder="ex: TXN-9840294" value={formPayLine.numeroTransaction} onChange={e => setFormPayLine(p => ({ ...p, numeroTransaction: e.target.value }))} />
              </div>
            )}

            <div className="space-y-1">
              <Label>Observation / Note (optionnel)</Label>
              <Input placeholder="ex: Avance ou remise spéciale..." value={formPayLine.observation} onChange={e => setFormPayLine(p => ({ ...p, observation: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenPayLineModal(false)}>Annuler</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold" onClick={handleProcessPayLine}>
              <Check className="h-4 w-4" />
              Valider le Paiement ({selectedQuartierPay ? `${(selectedQuartierPay?.tarif || 0).toLocaleString()} F CFA` : ''})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog Reçu / Attestation Paiement Transport ────────────────────── */}
      {receiptModal && (
        <Dialog open={!!receiptModal} onOpenChange={v => { if (!v) setReceiptModal(null); }}>
          <DialogContent className="sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600 font-bold">
                <Receipt className="h-6 w-6" />
                Reçu de Transport Généré avec Succès
              </DialogTitle>
            </DialogHeader>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border space-y-2 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground font-medium">N° Reçu :</span>
                <Badge className="bg-indigo-600 text-white font-mono">{receiptModal.numero_recu}</Badge>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground font-medium">Élève :</span>
                <span className="font-bold">{receiptModal.eleve}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground font-medium">Ligne / Zone :</span>
                <span className="font-semibold text-indigo-600">Zone {receiptModal.zone_id} — {receiptModal.quartier}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground font-medium">Période :</span>
                <span>{receiptModal.mois}</span>
              </div>
              <div className="flex justify-between pt-1 text-base font-extrabold text-emerald-600">
                <span>Montant Réglé :</span>
                <span>{(receiptModal?.montant || 0).toLocaleString()} F CFA</span>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setReceiptModal(null)}>Fermer</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-bold" onClick={() => printTransportReceipt(receiptModal)}>
                <Printer className="h-4 w-4" />
                Imprimer le Reçu Officiel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── Dialog Règlement Cantine (Trimestriel ou Mensuel) ───────────── */}
      <Dialog open={openPayCanteenModal} onOpenChange={setOpenPayCanteenModal}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sky-700 font-bold">
              <Utensils className="h-5 w-5" />
              Règlement Cantine Scolaire ({formPayCanteen.periodeType === 'mensuel' ? 'Mensuel' : 'Trimestriel'})
            </DialogTitle>
            <DialogDescription className="sr-only">
              Formulaire de paiement des frais de cantine par mois ou par trimestre.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 text-sm">
            {/* Périodicité */}
            <div className="space-y-1">
              <Label className="font-semibold">Option de Périodicité *</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={formPayCanteen.periodeType === 'mensuel' ? 'default' : 'outline'}
                  className={`h-9 font-bold text-xs ${formPayCanteen.periodeType === 'mensuel' ? 'bg-sky-600 text-white' : ''}`}
                  onClick={() => setFormPayCanteen(p => ({
                    ...p,
                    periodeType: 'mensuel',
                    tarif: CANTINE_TARIF_MENSUEL,
                    observation: `Paiement Cantine Mensuel - ${p.mois}`
                  }))}
                >
                  Mensuel (15 000 FCFA)
                </Button>
                <Button
                  type="button"
                  variant={formPayCanteen.periodeType === 'trimestriel' ? 'default' : 'outline'}
                  className={`h-9 font-bold text-xs ${formPayCanteen.periodeType === 'trimestriel' ? 'bg-sky-600 text-white' : ''}`}
                  onClick={() => setFormPayCanteen(p => ({
                    ...p,
                    periodeType: 'trimestriel',
                    tarif: CANTINE_TARIF_TRIMESTRE,
                    observation: `Paiement Cantine Trimestriel - ${p.trimestre}`
                  }))}
                >
                  Trimestriel (45 000 FCFA)
                </Button>
              </div>
            </div>

            {/* Élève */}
            <div className="space-y-1">
              <Label className="font-semibold">Élève souscripteur *</Label>
              <Select value={formPayCanteen.eleveId} onValueChange={v => setFormPayCanteen(p => ({ ...p, eleveId: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un élève..." /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {students.filter(s => s.status === 'actif').map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {formatStudentName(s)} {s.matricule ? `(${s.matricule})` : ''} {s.className ? `— ${s.className}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Période à régler (Mois ou Trimestre) */}
            {formPayCanteen.periodeType === 'mensuel' ? (
              <div className="space-y-1">
                <Label className="font-semibold">Mois à régler *</Label>
                <Select value={formPayCanteen.mois} onValueChange={v => setFormPayCanteen(p => ({ ...p, mois: v, observation: `Paiement Cantine Mensuel - ${v}` }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MOIS_CANTINE.map((m, idx) => (
                      <SelectItem key={idx} value={m}>{m} (15 000 F CFA)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="font-semibold">Trimestre à régler *</Label>
                <Select value={formPayCanteen.trimestre} onValueChange={v => setFormPayCanteen(p => ({ ...p, trimestre: v, observation: `Paiement Cantine Trimestriel - ${v}` }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRIMESTRES_CANTINE.map((t, idx) => (
                      <SelectItem key={idx} value={t}>{t} (45 000 F CFA)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tarif */}
            <div className="space-y-1">
              <Label className="font-semibold">Tarif ({formPayCanteen.periodeType === 'mensuel' ? 'Mensuel' : 'Trimestriel'}) en F CFA</Label>
              <Input
                type="number"
                value={formPayCanteen.tarif}
                onChange={e => setFormPayCanteen(p => ({ ...p, tarif: Number(e.target.value) || 0 }))}
              />
            </div>

            {/* Mode de Paiement */}
            <div className="space-y-1">
              <Label className="font-semibold">Mode de Règlement</Label>
              <Select value={formPayCanteen.modePaiement} onValueChange={v => setFormPayCanteen(p => ({ ...p, modePaiement: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="especes">💵 Espèces (Caisse)</SelectItem>
                  <SelectItem value="mobile_money">📱 Mobile Money (Wave / Orange / MTN)</SelectItem>
                  <SelectItem value="virement">🏛 Virement Bancaire</SelectItem>
                  <SelectItem value="carte">💳 Carte Bancaire</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ref Tx */}
            <div className="space-y-1">
              <Label className="font-semibold">N° Référence / Transaction (Optionnel)</Label>
              <Input
                placeholder="ex: WV-2026-9921 / Ref Chèque"
                value={formPayCanteen.numeroTransaction}
                onChange={e => setFormPayCanteen(p => ({ ...p, numeroTransaction: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenPayCanteenModal(false)}>Annuler</Button>
            <Button className="bg-sky-600 hover:bg-sky-700 text-white gap-2 font-bold" onClick={handleProcessPayCanteen}>
              <Check className="h-4 w-4" />
              Valider le Paiement Cantine ({(formPayCanteen?.tarif || 0).toLocaleString()} F CFA)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog Reçu / Attestation Paiement Cantine ────────────────────────── */}
      {receiptCanteenModal && (
        <Dialog open={!!receiptCanteenModal} onOpenChange={v => { if (!v) setReceiptCanteenModal(null); }}>
          <DialogContent className="sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sky-600 font-bold">
                <Receipt className="h-6 w-6" />
                Reçu de Cantine Généré avec Succès
              </DialogTitle>
              <DialogDescription className="sr-only">
                Aperçu et impression du reçu officiel de cantine scolaire.
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border space-y-2 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground font-medium">N° Reçu :</span>
                <Badge className="bg-sky-600 text-white font-mono">{receiptCanteenModal.numero_recu}</Badge>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground font-medium">Élève :</span>
                <span className="font-bold">{receiptCanteenModal.eleve}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground font-medium">Période :</span>
                <span className="font-semibold text-sky-600">{receiptCanteenModal.trimestre}</span>
              </div>
              <div className="flex justify-between pt-1 text-base font-extrabold text-sky-600">
                <span>Montant Réglé :</span>
                <span>{(receiptCanteenModal?.montant || 0).toLocaleString()} F CFA</span>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setReceiptCanteenModal(null)}>Fermer</Button>
              <Button className="bg-sky-600 hover:bg-sky-700 text-white gap-2 font-bold" onClick={() => printCanteenReceipt(receiptCanteenModal)}>
                <Printer className="h-4 w-4" />
                Imprimer le Reçu Officiel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {/* ─── Dialog Modification des Tarifs Cantine & Car ────────────────────────── */}
      <Dialog open={openTarifsModal} onOpenChange={setOpenTarifsModal}>
        <DialogContent className="sm:max-w-[780px] max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-700 font-bold text-xl">
              <DollarSign className="h-6 w-6 text-indigo-600" />
              Gestion & Modification des Tarifs Cantine & Car
            </DialogTitle>
            <DialogDescription>
              Ajustez ici les montants de la cantine et la grille tarifaire par ligne et zone de transport.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="cantine" className="space-y-4">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="cantine" className="gap-2 font-bold"><Utensils className="h-4 w-4" /> Tarifs Cantine</TabsTrigger>
              <TabsTrigger value="transport" className="gap-2 font-bold"><Bus className="h-4 w-4" /> Tarifs Transport par Zone ({formTarifs.zones.length})</TabsTrigger>
            </TabsList>

            {/* TAB CANTINE */}
            <TabsContent value="cantine" className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 p-3 rounded-xl border bg-slate-50 dark:bg-slate-900">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tarif Mensuel Cantine (FCFA) *</Label>
                  <Input
                    type="number"
                    className="font-bold text-base text-indigo-900 dark:text-indigo-200"
                    value={formTarifs.cantine_mensuel}
                    onChange={e => setFormTarifs(prev => ({ ...prev, cantine_mensuel: parseFloat(e.target.value) || 0 }))}
                  />
                  <p className="text-[11px] text-muted-foreground">Appliqué pour le règlement mensuel de cantine</p>
                </div>
                <div className="space-y-1.5 p-3 rounded-xl border bg-slate-50 dark:bg-slate-900">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tarif Trimestriel Cantine (FCFA) *</Label>
                  <Input
                    type="number"
                    className="font-bold text-base text-sky-900 dark:text-sky-200"
                    value={formTarifs.cantine_trimestriel}
                    onChange={e => setFormTarifs(prev => ({ ...prev, cantine_trimestriel: parseFloat(e.target.value) || 0 }))}
                  />
                  <p className="text-[11px] text-muted-foreground">Appliqué pour le règlement par trimestre (ex: T1, T2, T3)</p>
                </div>
                <div className="space-y-1.5 p-3 rounded-xl border bg-slate-50 dark:bg-slate-900">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tarif Annuel Cantine (FCFA)</Label>
                  <Input
                    type="number"
                    className="font-bold text-base text-emerald-900 dark:text-emerald-200"
                    value={formTarifs.cantine_annuel}
                    onChange={e => setFormTarifs(prev => ({ ...prev, cantine_annuel: parseFloat(e.target.value) || 0 }))}
                  />
                  <p className="text-[11px] text-muted-foreground">Forfait global pour toute l'année scolaire</p>
                </div>
                <div className="space-y-1.5 p-3 rounded-xl border bg-slate-50 dark:bg-slate-900">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Ticket Repas Journalier (FCFA)</Label>
                  <Input
                    type="number"
                    className="font-bold text-base text-amber-900 dark:text-amber-200"
                    value={formTarifs.cantine_journalier}
                    onChange={e => setFormTarifs(prev => ({ ...prev, cantine_journalier: parseFloat(e.target.value) || 0 }))}
                  />
                  <p className="text-[11px] text-muted-foreground">Tarif unitaire d'un repas occasionnel</p>
                </div>
              </div>
            </TabsContent>

            {/* TAB TRANSPORT / CAR ZONES */}
            <TabsContent value="transport" className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Grille des Zones & Tarifs Transport ({formTarifs.zones.length} enregistrée(s) en BD)
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold"
                  onClick={() => {
                    setFormTarifs(prev => ({
                      ...prev,
                      zones: [
                        ...prev.zones,
                        {
                          id: undefined,
                          zone: `ZONE-${prev.zones.length + 1}`,
                          nom: `Zone ${prev.zones.length + 1} — Nouvelle Zone BD`,
                          quartiers: [{ nom: "Nouveau Quartier", tarif: 20000, km: "3.0 km" }],
                          km: "3.0 km",
                          tarif: 20000,
                        }
                      ]
                    }));
                  }}
                >
                  <Plus className="h-3.5 w-3.5" /> Ajouter une Zone en BD
                </Button>
              </div>

              <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
                {formTarifs.zones.map((zone, zIdx) => (
                  <div key={zone.id || zone.zone_id || zIdx} className="p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 space-y-2">
                    <div className="flex items-center justify-between font-bold text-sm text-indigo-900 dark:text-indigo-200">
                      <div className="flex items-center gap-2">
                        <Input
                          className="h-7 text-xs font-bold w-64 bg-white dark:bg-slate-950"
                          value={zone.nom}
                          onChange={e => {
                            const val = e.target.value;
                            setFormTarifs(prev => {
                              const updated = [...prev.zones];
                              updated[zIdx].nom = val;
                              return { ...prev, zones: updated };
                            });
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-white dark:bg-slate-800">{zone.quartiers?.length || 0} quartier(s)</Badge>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          title="Supprimer cette zone de la BD"
                          onClick={() => {
                            setFormTarifs(prev => ({
                              ...prev,
                              zones: prev.zones.filter((_, idx) => idx !== zIdx)
                            }));
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {zone.quartiers?.map((q: any, qIdx: number) => (
                        <div key={qIdx} className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-white dark:bg-slate-950 text-xs">
                          <span className="font-semibold truncate max-w-[160px]" title={q.nom}>{q.nom}</span>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              className="h-7 w-24 text-right font-bold text-xs"
                              value={q.tarif}
                              onChange={e => {
                                const newVal = parseFloat(e.target.value) || 0;
                                setFormTarifs(prev => {
                                  const updatedZones = [...prev.zones];
                                  if (updatedZones[zIdx].quartiers) {
                                    updatedZones[zIdx].quartiers[qIdx].tarif = newVal;
                                  }
                                  return { ...prev, zones: updatedZones };
                                });
                              }}
                            />
                            <span className="text-[10px] text-slate-500 font-bold">F</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpenTarifsModal(false)}>Annuler</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-bold" onClick={handleSaveTarifs} disabled={savingTarifs}>
              {savingTarifs ? <Clock className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Enregistrer les Nouveaux Tarifs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 1: CRÉER / MODIFIER UN CHAUFFEUR */}
      <Dialog open={openChauffeurModal} onOpenChange={setOpenChauffeurModal}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-2xl border-slate-200 dark:border-slate-800">
          <DialogHeader className="p-5 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-indigo-600" />
              {editChauffeur ? 'Modifier le Chauffeur' : 'Ajouter un Chauffeur'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Saisissez les coordonnées du conducteur pour lui affecter un car.
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-semibold text-slate-700">Nom *</Label>
                <Input
                  value={formChauffeur.nom}
                  onChange={e => setFormChauffeur(p => ({ ...p, nom: e.target.value }))}
                  placeholder="KOUASSI"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold text-slate-700">Prénom</Label>
                <Input
                  value={formChauffeur.prenom}
                  onChange={e => setFormChauffeur(p => ({ ...p, prenom: e.target.value }))}
                  placeholder="Jean-Marc"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-slate-700">Téléphone / Contact</Label>
              <Input
                value={formChauffeur.telephone}
                onChange={e => setFormChauffeur(p => ({ ...p, telephone: e.target.value }))}
                placeholder="07 08 09 10 11"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-slate-700">N° Permis de conduire</Label>
              <Input
                value={formChauffeur.num_permis}
                onChange={e => setFormChauffeur(p => ({ ...p, num_permis: e.target.value }))}
                placeholder="PERMIS CAT BCDE N° 98230/2021"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <Label className="font-semibold text-slate-700">Statut</Label>
                <Select value={formChauffeur.statut} onValueChange={(val: any) => setFormChauffeur(p => ({ ...p, statut: val }))}>
                  <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="en_conge">En congé</SelectItem>
                    <SelectItem value="inactif">Inactif</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="font-semibold text-slate-700">Car attribué</Label>
                <Select value={formChauffeur.car_id} onValueChange={(val: any) => setFormChauffeur(p => ({ ...p, car_id: val }))}>
                  <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue placeholder="Choisir un car" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun car (Libre)</SelectItem>
                    {vehicules.map((v: any) => (
                      <SelectItem key={v.id} value={String(v.id)}>{v.immatriculation} ({v.marque})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 gap-2">
            <Button variant="ghost" className="text-xs rounded-xl" onClick={() => setOpenChauffeurModal(false)}>Annuler</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl px-4" onClick={handleSaveChauffeur}>
              Enregistrer le Chauffeur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: ATTRIBUER UN CAR À UN CHAUFFEUR */}
      <Dialog open={openAssignModal} onOpenChange={setOpenAssignModal}>
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden rounded-2xl border-slate-200 dark:border-slate-800">
          <DialogHeader className="p-5 bg-slate-50 dark:bg-slate-900 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Bus className="h-5 w-5 text-indigo-600" />
              Attribution du Car : {assignCarItem?.immatriculation}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Liez ce véhicule à un chauffeur titulaire et à sa ligne de ramassage scolaire.
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="font-semibold text-slate-700">Chauffeur Conducteur</Label>
              <Select value={assignForm.chauffeur_id} onValueChange={(val: any) => setAssignForm(p => ({ ...p, chauffeur_id: val }))}>
                <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue placeholder="Sélectionner le chauffeur" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun chauffeur attribué</SelectItem>
                  {chauffeurs.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{formatStudentName(c)} ({c.telephone || 'Sans tel'})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-slate-700">Ligne de Transport Desservie</Label>
              <Input
                value={assignForm.ligne_nom}
                onChange={e => setAssignForm(p => ({ ...p, ligne_nom: e.target.value }))}
                placeholder="Ex: Ligne 1 - Abobo Biabou / Cocody"
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 gap-2">
            <Button variant="ghost" className="text-xs rounded-xl" onClick={() => setOpenAssignModal(false)}>Annuler</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl px-4" onClick={handleSaveAssignCar}>
              Valider l'Attribution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: CRÉER UNE NOUVELLE LIGNE / ZONE DE TRANSPORT */}
      <Dialog open={openLigneModal} onOpenChange={setOpenLigneModal}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-2xl border-slate-200 dark:border-slate-800">
          <DialogHeader className="p-5 bg-slate-50 dark:bg-slate-900 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Route className="h-5 w-5 text-purple-600" />
              Nouvelle Ligne & Zone de Transport
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Créez un nouveau trajet de ramassage scolaire avec sa tarification.
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="font-semibold text-slate-700">Intitulé de la Ligne *</Label>
              <Input
                value={formLigne.nom}
                onChange={e => setFormLigne(p => ({ ...p, nom: e.target.value }))}
                placeholder="Ex: Ligne 5 — Yopougon Niangon / Plateau"
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-semibold text-slate-700">Tarif Mensuel (FCFA) *</Label>
                <Input
                  type="number"
                  value={formLigne.tarif}
                  onChange={e => setFormLigne(p => ({ ...p, tarif: e.target.value }))}
                  placeholder="20000"
                  className="h-9 text-xs rounded-xl font-bold"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold text-slate-700">Kilométrage moyen</Label>
                <Input
                  value={formLigne.km}
                  onChange={e => setFormLigne(p => ({ ...p, km: e.target.value }))}
                  placeholder="5.0 km"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-slate-700">Quartiers / Arrêts (séparés par une virgule)</Label>
              <Input
                value={formLigne.quartiers}
                onChange={e => setFormLigne(p => ({ ...p, quartiers: e.target.value }))}
                placeholder="Biabou 2, Carrefour Diamant, CHU Angré"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-slate-700">Car à affecter à cette ligne</Label>
              <Select value={formLigne.vehicule_id} onValueChange={(val: any) => setFormLigne(p => ({ ...p, vehicule_id: val }))}>
                <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue placeholder="Sélectionner le car" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun car (Pour l'instant)</SelectItem>
                  {vehicules.map((v: any) => (
                    <SelectItem key={v.id} value={String(v.id)}>{v.immatriculation} ({v.marque})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 gap-2">
            <Button variant="ghost" className="text-xs rounded-xl" onClick={() => setOpenLigneModal(false)}>Annuler</Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl px-4" onClick={handleSaveLigne}>
              Enregistrer la Ligne
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

