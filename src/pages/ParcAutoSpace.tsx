import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/Layout';
import { DataTable, type Column } from '@/components/DataTable';
import apiClient from '@/lib/apiClient';
import type { StaffMember } from '@/lib/index';
import { formatStudentName, formatCurrency, formatDate } from '@/lib/index';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import {
  Car, ShieldCheck, ShieldAlert, Wrench, Stethoscope, FileText, Plus, Search,
  AlertTriangle, CheckCircle2, User, Phone, BadgeAlert, RefreshCw, Calendar,
  Fuel, Gauge, Printer, Download, Trash2, Edit3, Sparkles, Filter, Check
} from 'lucide-react';

export interface VehiculeItem {
  id: number;
  immatriculation: string;
  marque: string;
  modele: string;
  type_vehicule?: string;
  capacite: number;
  chauffeurNom?: string;
  chauffeurTel?: string;
  chauffeur_id?: number;
  ligne_id?: number;
  ligne_nom?: string;
  statut: string;
  compagnie_assurance?: string;
  num_police_assurance?: string;
  date_expiration_assurance?: string;
  assurance_jours_restants?: number | null;
  assurance_statut?: string;
  date_derniere_visite_technique?: string;
  date_expiration_visite_technique?: string;
  visite_technique_jours_restants?: number | null;
  visite_technique_statut?: string;
  num_carte_stationnement?: string;
  date_expiration_stationnement?: string;
  kilometrage_actuel?: number;
  prochaine_vidange_km?: number;
  vidange_km_restant?: number | null;
  vidange_alerte?: boolean;
  carburant?: string;
  annee_mise_en_service?: string;
  notes?: string;
}

export interface EntretienItem {
  id: number;
  vehicule_id?: number;
  immatriculation: string;
  type_intervention: string;
  date_intervention?: string;
  kilometrage?: number;
  prochain_kilometrage?: number;
  prochaine_date?: string;
  garage_prestataire?: string;
  cout_total: number;
  facture_ref?: string;
  description?: string;
  statut: string;
  date_creation?: string;
}

export interface FicheAgentItem {
  id: number;
  personnel_id: number;
  agent_nom: string;
  agent_fonction: string;
  agent_telephone?: string;
  immatriculation: string;
  marque_modele: string;
  compagnie_assurance?: string;
  num_police_assurance?: string;
  date_expiration_assurance?: string;
  num_carte_stationnement?: string;
  date_expiration_stationnement?: string;
  visite_medicale_date?: string;
  statut_medical?: string;
  medical_jours_restants?: number | null;
  medical_alerte?: boolean;
  dossier_administratif_url?: string;
  notes?: string;
}

export default function ParcAutoSpace() {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<string>('vehicules');
  const [loading, setLoading] = useState<boolean>(true);

  // Données
  const [vehiculesList, setVehiculesList] = useState<VehiculeItem[]>([]);
  const [entretiensList, setEntretiensList] = useState<EntretienItem[]>([]);
  const [fichesAgentsList, setFichesAgentsList] = useState<FicheAgentItem[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [stats, setStats] = useState<any>({
    total_vehicules: 0,
    vehicules_actifs: 0,
    vehicules_en_panne: 0,
    assurances_valides: 0,
    assurances_alertes: 0,
    assurances_expirees: 0,
    visites_valides: 0,
    visites_alertes: 0,
    visites_expirees: 0,
    total_fiches_agents: 0,
    aptitudes_valides: 0,
    total_depenses_entretiens: 0,
    total_interventions: 0,
  });

  // Filtres & Recherche
  const [searchVehicule, setSearchVehicule] = useState<string>('');
  const [filterStatut, setFilterStatut] = useState<string>('tous');
  const [filterType, setFilterType] = useState<string>('tous');

  // Modales
  const [showVehicleModal, setShowVehicleModal] = useState<boolean>(false);
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [vehicleForm, setVehicleForm] = useState<any>({
    immatriculation: '',
    marque: 'Toyota',
    modele: 'Coaster 30 Places',
    type_vehicule: 'Bus Scolaire',
    capacite: 30,
    chauffeurNom: '',
    chauffeurTel: '',
    chauffeur_id: undefined,
    statut: 'actif',
    compagnie_assurance: 'NSIA Assurances',
    num_police_assurance: '',
    date_expiration_assurance: '',
    date_derniere_visite_technique: '',
    date_expiration_visite_technique: '',
    num_carte_stationnement: '',
    date_expiration_stationnement: '',
    kilometrage_actuel: 0,
    prochaine_vidange_km: 5000,
    carburant: 'Gazole',
    annee_mise_en_service: '2022',
    notes: '',
  });

  // Modal Entretien
  const [showEntretienModal, setShowEntretienModal] = useState<boolean>(false);
  const [entretienForm, setEntretienForm] = useState<any>({
    immatriculation: '',
    type_intervention: 'Vidange moteur',
    date_intervention: new Date().toISOString().split('T')[0],
    kilometrage: 0,
    prochain_kilometrage: 0,
    garage_prestataire: 'Garage Central & Partenaires',
    cout_total: 45000,
    facture_ref: '',
    description: '',
    statut: 'termine',
  });

  // Modal Fiche Agent
  const [showAgentModal, setShowAgentModal] = useState<boolean>(false);
  const [editingAgentFicheId, setEditingAgentFicheId] = useState<number | null>(null);
  const [agentForm, setAgentForm] = useState<any>({
    personnel_id: '',
    immatriculation: '',
    marque_modele: '',
    compagnie_assurance: 'NSIA Assurances',
    num_police_assurance: '',
    date_expiration_assurance: '',
    num_carte_stationnement: '',
    date_expiration_stationnement: '',
    visite_medicale_date: '',
    statut_medical: 'Aptitude confirmée ✅',
    notes: '',
  });

  // Chargement global
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [vList, eList, fList, stList, statsData] = await Promise.all([
        apiClient.getParcAutoVehicules().catch(() => []),
        apiClient.getParcAutoEntretiens().catch(() => []),
        apiClient.getParcAutoFichesAgents().catch(() => []),
        apiClient.getStaff().catch(() => []),
        apiClient.getParcAutoStats().catch(() => null),
      ]);

      setVehiculesList(vList || []);
      setEntretiensList(eList || []);
      setFichesAgentsList(fList || []);
      setStaffList(stList || []);
      if (statsData) setStats(statsData);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erreur de chargement',
        description: 'Impossible de récupérer les données du parc automobile.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Filtrage des véhicules
  const filteredVehicules = useMemo(() => {
    return vehiculesList.filter((v) => {
      if (filterStatut !== 'tous' && v.statut !== filterStatut) return false;
      if (filterType !== 'tous' && v.type_vehicule !== filterType) return false;
      if (!searchVehicule.trim()) return true;
      const q = searchVehicule.toLowerCase();
      return (
        (v.immatriculation || '').toLowerCase().includes(q) ||
        (v.marque || '').toLowerCase().includes(q) ||
        (v.modele || '').toLowerCase().includes(q) ||
        (v.chauffeurNom || '').toLowerCase().includes(q) ||
        (v.compagnie_assurance || '').toLowerCase().includes(q)
      );
    });
  }, [vehiculesList, filterStatut, filterType, searchVehicule]);

  // Ouverture modale véhicule (Ajout ou Édition)
  const handleOpenVehicleModal = (vehicule?: VehiculeItem) => {
    if (vehicule) {
      setEditingVehicleId(vehicule.id);
      setVehicleForm({
        immatriculation: vehicule.immatriculation,
        marque: vehicule.marque,
        modele: vehicule.modele,
        type_vehicule: vehicule.type_vehicule || 'Bus Scolaire',
        capacite: vehicule.capacite,
        chauffeurNom: vehicule.chauffeurNom || '',
        chauffeurTel: vehicule.chauffeurTel || '',
        chauffeur_id: vehicule.chauffeur_id,
        statut: vehicule.statut || 'actif',
        compagnie_assurance: vehicule.compagnie_assurance || '',
        num_police_assurance: vehicule.num_police_assurance || '',
        date_expiration_assurance: vehicule.date_expiration_assurance || '',
        date_derniere_visite_technique: vehicule.date_derniere_visite_technique || '',
        date_expiration_visite_technique: vehicule.date_expiration_visite_technique || '',
        num_carte_stationnement: vehicule.num_carte_stationnement || '',
        date_expiration_stationnement: vehicule.date_expiration_stationnement || '',
        kilometrage_actuel: vehicule.kilometrage_actuel || 0,
        prochaine_vidange_km: vehicule.prochaine_vidange_km || 0,
        carburant: vehicule.carburant || 'Gazole',
        annee_mise_en_service: vehicule.annee_mise_en_service || '',
        notes: vehicule.notes || '',
      });
    } else {
      setEditingVehicleId(null);
      setVehicleForm({
        immatriculation: '',
        marque: 'Toyota',
        modele: 'Coaster 30 Places',
        type_vehicule: 'Bus Scolaire',
        capacite: 30,
        chauffeurNom: '',
        chauffeurTel: '',
        chauffeur_id: undefined,
        statut: 'actif',
        compagnie_assurance: 'NSIA Assurances',
        num_police_assurance: '',
        date_expiration_assurance: '',
        date_derniere_visite_technique: '',
        date_expiration_visite_technique: '',
        num_carte_stationnement: '',
        date_expiration_stationnement: '',
        kilometrage_actuel: 0,
        prochaine_vidange_km: 5000,
        carburant: 'Gazole',
        annee_mise_en_service: '2022',
        notes: '',
      });
    }
    setShowVehicleModal(true);
  };

  // Enregistrement Véhicule
  const handleSaveVehicle = async () => {
    if (!vehicleForm.immatriculation.trim() || !vehicleForm.marque.trim()) {
      toast({
        variant: 'destructive',
        title: 'Champs obligatoires',
        description: 'Veuillez saisir au minimum l’immatriculation et la marque du véhicule.',
      });
      return;
    }

    const payload: any = { ...vehicleForm };
    if (!payload.date_expiration_assurance) payload.date_expiration_assurance = null;
    if (!payload.date_derniere_visite_technique) payload.date_derniere_visite_technique = null;
    if (!payload.date_expiration_visite_technique) payload.date_expiration_visite_technique = null;
    if (!payload.date_expiration_stationnement) payload.date_expiration_stationnement = null;
    if (!payload.annee_mise_en_service) payload.annee_mise_en_service = null;
    if (payload.kilometrage_actuel !== undefined && payload.kilometrage_actuel !== '') {
      payload.kilometrage_actuel = Number(payload.kilometrage_actuel) || 0;
    }
    if (payload.capacite !== undefined && payload.capacite !== '') {
      payload.capacite = Number(payload.capacite) || 0;
    }
    if (payload.prochaine_vidange_km !== undefined && payload.prochaine_vidange_km !== '') {
      payload.prochaine_vidange_km = Number(payload.prochaine_vidange_km) || 0;
    }
    if (payload.chauffeur_id) {
      payload.chauffeur_id = Number(payload.chauffeur_id) || null;
    } else {
      payload.chauffeur_id = null;
    }

    try {
      if (editingVehicleId) {
        await apiClient.updateParcAutoVehicule(editingVehicleId, payload);
        toast({ title: 'Véhicule mis à jour', description: `La fiche du véhicule ${vehicleForm.immatriculation} a été modifiée avec succès.` });
      } else {
        await apiClient.createParcAutoVehicule(payload);
        toast({ title: 'Véhicule ajouté', description: `Le véhicule ${vehicleForm.immatriculation} a été intégré au parc.` });
      }
      setShowVehicleModal(false);
      loadAllData();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: err.response?.data?.detail || 'Impossible d’enregistrer le véhicule.',
      });
    }
  };

  // Suppression Véhicule
  const handleDeleteVehicle = async (id: number, imm: string) => {
    if (!window.confirm(`Confirmez-vous la suppression du véhicule ${imm} du parc ?`)) return;
    try {
      await apiClient.deleteParcAutoVehicule(id);
      toast({ title: 'Véhicule supprimé', description: `Le véhicule ${imm} a été retiré du parc.` });
      loadAllData();
    } catch {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Suppression impossible.' });
    }
  };

  // Ouverture modale entretien rapide pour un véhicule
  const handleOpenEntretienModal = (imm?: string, km?: number) => {
    setEntretienForm({
      immatriculation: imm || (vehiculesList[0]?.immatriculation || ''),
      type_intervention: 'Vidange moteur',
      date_intervention: new Date().toISOString().split('T')[0],
      kilometrage: km || 0,
      prochain_kilometrage: (km || 0) + 5000,
      garage_prestataire: 'Garage Partenaire Agréé',
      cout_total: 45000,
      facture_ref: 'FAC-' + Math.floor(1000 + Math.random() * 9000),
      description: 'Changement huile moteur, filtre à huile et filtre à air.',
      statut: 'termine',
    });
    setShowEntretienModal(true);
  };

  // Enregistrement Entretien
  const handleSaveEntretien = async () => {
    if (!entretienForm.immatriculation.trim() || !entretienForm.type_intervention) {
      toast({ variant: 'destructive', title: 'Champs manquants', description: 'Veuillez renseigner le véhicule et le type d’intervention.' });
      return;
    }

    const payload: any = { ...entretienForm };
    if (!payload.date_intervention) payload.date_intervention = null;
    if (!payload.prochaine_date) payload.prochaine_date = null;
    payload.kilometrage = Number(payload.kilometrage) || 0;
    payload.prochain_kilometrage = Number(payload.prochain_kilometrage) || 0;
    payload.cout_total = Number(payload.cout_total) || 0;
    if (payload.vehicule_id) payload.vehicule_id = Number(payload.vehicule_id) || null;

    try {
      await apiClient.createParcAutoEntretien(payload);
      toast({ title: 'Intervention enregistrée', description: `L’entretien pour le véhicule ${entretienForm.immatriculation} a été enregistré.` });
      setShowEntretienModal(false);
      loadAllData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d’enregistrer l’entretien.' });
    }
  };

  // Suppression Entretien
  const handleDeleteEntretien = async (id: number) => {
    if (!window.confirm('Voulez-vous supprimer cette fiche d’intervention ?')) return;
    try {
      await apiClient.deleteParcAutoEntretien(id);
      toast({ title: 'Entretien supprimé' });
      loadAllData();
    } catch {
      toast({ variant: 'destructive', title: 'Erreur de suppression' });
    }
  };

  // Ouverture modale Fiche Conducteur
  const handleOpenAgentModal = (fiche?: FicheAgentItem) => {
    if (fiche) {
      setEditingAgentFicheId(fiche.id);
      setAgentForm({
        personnel_id: String(fiche.personnel_id || ''),
        immatriculation: fiche.immatriculation,
        marque_modele: fiche.marque_modele || '',
        compagnie_assurance: fiche.compagnie_assurance || '',
        num_police_assurance: fiche.num_police_assurance || '',
        date_expiration_assurance: fiche.date_expiration_assurance || '',
        num_carte_stationnement: fiche.num_carte_stationnement || '',
        date_expiration_stationnement: fiche.date_expiration_stationnement || '',
        visite_medicale_date: fiche.visite_medicale_date || '',
        statut_medical: fiche.statut_medical || 'Aptitude confirmée ✅',
        notes: fiche.notes || '',
      });
    } else {
      setEditingAgentFicheId(null);
      setAgentForm({
        personnel_id: staffList[0] ? String(staffList[0].id) : '',
        immatriculation: vehiculesList[0]?.immatriculation || '',
        marque_modele: vehiculesList[0] ? `${vehiculesList[0].marque} ${vehiculesList[0].modele}` : '',
        compagnie_assurance: 'NSIA Assurances',
        num_police_assurance: '',
        date_expiration_assurance: '',
        num_carte_stationnement: '',
        date_expiration_stationnement: '',
        visite_medicale_date: new Date().toISOString().split('T')[0],
        statut_medical: 'Aptitude confirmée ✅',
        notes: '',
      });
    }
    setShowAgentModal(true);
  };

  // Enregistrement Fiche Conducteur
  const handleSaveFicheAgent = async () => {
    if (!agentForm.personnel_id || !agentForm.immatriculation) {
      toast({ variant: 'destructive', title: 'Champs obligatoires', description: 'Veuillez choisir un agent et renseigner l’immatriculation.' });
      return;
    }

    const payload: any = { ...agentForm };
    payload.personnel_id = Number(payload.personnel_id) || null;
    if (!payload.date_expiration_assurance) payload.date_expiration_assurance = null;
    if (!payload.date_expiration_stationnement) payload.date_expiration_stationnement = null;
    if (!payload.visite_medicale_date) payload.visite_medicale_date = null;

    try {
      if (editingAgentFicheId) {
        await apiClient.updateParcAutoFicheAgent(editingAgentFicheId, payload);
        toast({ title: 'Fiche conducteur mise à jour' });
      } else {
        await apiClient.createParcAutoFicheAgent(payload);
        toast({ title: 'Fiche conducteur enregistrée' });
      }
      setShowAgentModal(false);
      loadAllData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d’enregistrer la fiche conducteur.' });
    }
  };

  // Suppression Fiche Conducteur
  const handleDeleteFicheAgent = async (id: number) => {
    if (!window.confirm('Supprimer cette fiche administrative ?')) return;
    try {
      await apiClient.deleteParcAutoFicheAgent(id);
      toast({ title: 'Fiche supprimée' });
      loadAllData();
    } catch {
      toast({ variant: 'destructive', title: 'Erreur de suppression' });
    }
  };

  // Export Excel
  const exportParcExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Feuille 1: Flotte & Conformité
      const rowsVehicules = vehiculesList.map((v, idx) => ({
        'N°': idx + 1,
        'Immatriculation': v.immatriculation,
        'Marque': v.marque,
        'Modèle': v.modele,
        'Type': v.type_vehicule || 'Bus Scolaire',
        'Capacité': v.capacite,
        'Chauffeur': v.chauffeurNom || 'Non affecté',
        'Téléphone Chauffeur': v.chauffeurTel || 'N/C',
        'Statut': v.statut,
        'Kilométrage Actuel': v.kilometrage_actuel || 0,
        'Compagnie Assurance': v.compagnie_assurance || 'N/C',
        'N° Police': v.num_police_assurance || 'N/C',
        'Expiration Assurance': v.date_expiration_assurance || 'N/C',
        'Expiration Visite Technique': v.date_expiration_visite_technique || 'N/C',
        'N° Carte Stationnement': v.num_carte_stationnement || 'N/C',
      }));
      const wsVehicules = XLSX.utils.json_to_sheet(rowsVehicules);
      XLSX.utils.book_append_sheet(wb, wsVehicules, 'Véhicules du Parc');

      // Feuille 2: Entretiens & Vidanges
      const rowsEntretiens = entretiensList.map((e, idx) => ({
        'N°': idx + 1,
        'Date Intervention': e.date_intervention || '',
        'Immatriculation': e.immatriculation,
        'Type Intervention': e.type_intervention,
        'Kilométrage au Compteur': e.kilometrage || 0,
        'Prochain KM Vidange': e.prochain_kilometrage || 0,
        'Garage / Prestataire': e.garage_prestataire || '',
        'Coût Total (FCFA)': e.cout_total || 0,
        'Réf Facture': e.facture_ref || '',
        'Description': e.description || '',
      }));
      const wsEntretiens = XLSX.utils.json_to_sheet(rowsEntretiens);
      XLSX.utils.book_append_sheet(wb, wsEntretiens, 'Carnet Entretiens');

      // Feuille 3: Conducteurs
      const rowsAgents = fichesAgentsList.map((a, idx) => ({
        'N°': idx + 1,
        'Nom & Prénoms': a.agent_nom,
        'Fonction': a.agent_fonction,
        'Téléphone': a.agent_telephone || '',
        'Véhicule Affecté': a.immatriculation,
        'Modèle': a.marque_modele,
        'Date Visite Médicale': a.visite_medicale_date || '',
        'Statut Médical': a.statut_medical || '',
        'N° Carte Stationnement': a.num_carte_stationnement || '',
      }));
      const wsAgents = XLSX.utils.json_to_sheet(rowsAgents);
      XLSX.utils.book_append_sheet(wb, wsAgents, 'Fiches Conducteurs');

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Parc_Automobile_Rapport_${dateStr}.xlsx`);
      toast({ title: 'Export Excel réussi !', description: 'Le fichier complet du parc automobile a été généré.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur d’export', description: String(err) });
    }
  };

  // Impression PDF Officiel de Conformité
  const printConformitePDF = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({ variant: 'destructive', title: 'Erreur Pop-up', description: 'Veuillez autoriser les fenêtres pop-up.' });
        return;
      }

      const rowsHtml = vehiculesList
        .map(
          (v, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 6px; text-align: center;">${idx + 1}</td>
          <td style="padding: 6px; font-weight: bold; font-family: monospace;">${v.immatriculation}</td>
          <td style="padding: 6px;">${v.marque} ${v.modele} <span style="color:#64748b; font-size: 10px;">(${v.type_vehicule || 'Bus'})</span></td>
          <td style="padding: 6px;">${v.chauffeurNom || 'Non affecté'}</td>
          <td style="padding: 6px; font-weight: bold; color: ${v.statut === 'actif' ? '#16a34a' : '#dc2626'}; text-transform: uppercase;">${v.statut}</td>
          <td style="padding: 6px;">${v.compagnie_assurance || 'N/C'}<br><small style="color: #64748b;">Exp: ${v.date_expiration_assurance || 'N/C'}</small></td>
          <td style="padding: 6px;">${v.date_expiration_visite_technique || 'N/C'}</td>
          <td style="padding: 6px; text-align: right; font-weight: bold;">${(v.kilometrage_actuel || 0).toLocaleString('fr-FR')} km</td>
        </tr>
      `
        )
        .join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>État Récapitulatif du Parc Automobile & Conformité</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 10px; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 15px; }
            .title { font-size: 18px; font-weight: 900; text-transform: uppercase; color: #1e1b4b; }
            .badge-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px; font-size: 11px; margin-bottom: 15px; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background-color: #1e1b4b; color: white; padding: 8px 6px; font-size: 11px; text-align: left; }
            .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
            .sign-box { width: 220px; border-top: 1px dashed #64748b; padding-top: 5px; font-size: 11px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">Rapport Officiel du Parc Automobile & Conformité</div>
              <div style="font-size: 11px; color: #64748b;">Groupe Scolaire Hînneh • Gestion de la Flotte & Sécurité</div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #475569;">
              Date du tirage : ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
            </div>
          </div>

          <div class="badge-box">
            <div><strong>Total Flotte :</strong> ${vehiculesList.length} Véhicules</div>
            <div><strong>En Service Actif :</strong> ${stats.vehicules_actifs}</div>
            <div><strong>Assurances Valides :</strong> ${stats.assurances_valides}</div>
            <div><strong>Visites Techniques Valides :</strong> ${stats.visites_valides}</div>
            <div><strong>Dépenses Maintenance :</strong> ${formatCurrency(stats.total_depenses_entretiens)}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">N°</th>
                <th>Immatriculation</th>
                <th>Marque & Modèle</th>
                <th>Chauffeur Assigné</th>
                <th>Statut</th>
                <th>Assurance & Expiration</th>
                <th>Visite Technique</th>
                <th style="text-align: right;">Kilométrage</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="signatures">
            <div class="sign-box">
              <strong>Le Responsable du Parc Auto</strong><br>
              <span style="font-size: 10px; color: #64748b;">(Visa & Signature)</span>
            </div>
            <div class="sign-box">
              <strong>Le Responsable des Moyens Généraux</strong><br>
              <span style="font-size: 10px; color: #64748b;">(Visa & Contrôle)</span>
            </div>
            <div class="sign-box">
              <strong>La Direction Générale</strong><br>
              <span style="font-size: 10px; color: #64748b;">(Approbation & Cachet)</span>
            </div>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur Impression', description: String(err) });
    }
  };

  return (
    <Layout>
      <div className="space-y-6 pb-12">
        
        {/* En-tête Principal */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-linear-to-r from-amber-500/10 via-indigo-500/5 to-slate-50 dark:from-slate-900 dark:to-slate-950 p-5 rounded-2xl border border-amber-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-amber-600 text-white font-black text-[10px] uppercase tracking-wider">
                Flotte & Logistique
              </Badge>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                • Gestion Complète du Parc Automobile & Conformité
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <Car className="h-7 w-7 text-amber-600" />
              Gestion du Parc Automobile & Flotte
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Suivi en temps réel des véhicules, contrôles techniques, assurances, vidanges, réparations et dossiers conducteurs.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={loadAllData}
              disabled={loading}
              className="text-xs font-bold gap-1 bg-white dark:bg-slate-900"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={printConformitePDF}
              className="text-xs font-bold gap-1 bg-white dark:bg-slate-900 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-600" />
              Imprimer Rapport
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportParcExcel}
              className="text-xs font-bold gap-1 bg-white dark:bg-slate-900 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Export Excel
            </Button>
            <Button
              size="sm"
              onClick={() => handleOpenVehicleModal()}
              className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs gap-1 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nouveau Véhicule
            </Button>
          </div>
        </div>

        {/* 4 Cartes KPI Synthétiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-amber-200/80 bg-amber-50/50 dark:bg-slate-900">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wide">
                  Véhicules en Flotte
                </p>
                <h3 className="text-2xl font-black text-amber-950 dark:text-white mt-1">
                  {vehiculesList.length} <span className="text-xs font-normal text-slate-500">engins</span>
                </h3>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 font-semibold">
                  ✅ {stats.vehicules_actifs} Actifs • ⚠️ {stats.vehicules_en_panne} En maintenance
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Car className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-200/80 bg-emerald-50/50 dark:bg-slate-900">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wide">
                  Assurances Conformes
                </p>
                <h3 className="text-2xl font-black text-emerald-950 dark:text-white mt-1">
                  {stats.assurances_valides} / {vehiculesList.length}
                </h3>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 font-semibold">
                  {stats.assurances_alertes > 0 ? `⚠️ ${stats.assurances_alertes} à renouveler sous 30j` : '100% polices à jour'}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200/80 bg-blue-50/50 dark:bg-slate-900">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wide">
                  Visites Techniques
                </p>
                <h3 className="text-2xl font-black text-blue-950 dark:text-white mt-1">
                  {stats.visites_valides} <span className="text-xs font-normal text-slate-500">validées</span>
                </h3>
                <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-1 font-semibold">
                  {stats.visites_expirees > 0 ? `🚨 ${stats.visites_expirees} expirée(s)` : 'Contrôles réglementaires OK'}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                <FileText className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-indigo-200/80 bg-indigo-50/50 dark:bg-slate-900">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wide">
                  Budget Entretiens
                </p>
                <h3 className="text-xl font-black text-indigo-950 dark:text-white mt-1">
                  {formatCurrency(stats.total_depenses_entretiens)}
                </h3>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-1 font-semibold">
                  🔧 {stats.total_interventions} vidanges & révisions
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                <Wrench className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 4 Onglets de Gestion */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-1 h-auto">
            <TabsTrigger
              value="vehicules"
              className="text-xs font-bold gap-1.5 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-amber-700 data-[state=active]:shadow-xs"
            >
              <Car className="w-4 h-4 text-amber-600" />
              Flotte ({vehiculesList.length})
            </TabsTrigger>
            <TabsTrigger
              value="conformite"
              className="text-xs font-bold gap-1.5 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Assurances & Contrôles
            </TabsTrigger>
            <TabsTrigger
              value="entretiens"
              className="text-xs font-bold gap-1.5 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-indigo-700 data-[state=active]:shadow-xs"
            >
              <Wrench className="w-4 h-4 text-indigo-600" />
              Vidanges & Entretiens ({entretiensList.length})
            </TabsTrigger>
            <TabsTrigger
              value="conducteurs"
              className="text-xs font-bold gap-1.5 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-700 data-[state=active]:shadow-xs"
            >
              <Stethoscope className="w-4 h-4 text-blue-600" />
              Conducteurs & Aptitudes ({fichesAgentsList.length})
            </TabsTrigger>
          </TabsList>

          {/* ========================================================================= */}
          {/* ONGLET 1 : FLOTTE DE VÉHICULES */}
          {/* ========================================================================= */}
          <TabsContent value="vehicules" className="space-y-4">
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                    Liste des Véhicules du Parc Automobile
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Consultez l’affectation des bus scolaires, véhicules de direction et utilitaires.
                  </CardDescription>
                </div>

                {/* Filtres & Recherche */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative w-56">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Immatriculation, marque..."
                      value={searchVehicule}
                      onChange={(e) => setSearchVehicule(e.target.value)}
                      className="pl-8 text-xs h-8 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <Select value={filterStatut} onValueChange={setFilterStatut}>
                    <SelectTrigger className="w-32 text-xs h-8 bg-white dark:bg-slate-900">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tous">Tous statuts</SelectItem>
                      <SelectItem value="actif">Actif / En service</SelectItem>
                      <SelectItem value="en_panne">En panne</SelectItem>
                      <SelectItem value="revision">En révision</SelectItem>
                      <SelectItem value="reforme">Réformé</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-36 text-xs h-8 bg-white dark:bg-slate-900">
                      <SelectValue placeholder="Type de véhicule" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tous">Tous types</SelectItem>
                      <SelectItem value="Bus Scolaire">Bus Scolaire</SelectItem>
                      <SelectItem value="Minibus">Minibus</SelectItem>
                      <SelectItem value="Berline de Direction">Berline de Direction</SelectItem>
                      <SelectItem value="4x4 / Pick-up">4x4 / Pick-up</SelectItem>
                      <SelectItem value="Utilitaire">Utilitaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/80 border-y border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                        <th className="py-3 px-4">Véhicule & Immatriculation</th>
                        <th className="py-3 px-3">Type & Capacité</th>
                        <th className="py-3 px-3">Conducteur Affecté</th>
                        <th className="py-3 px-3">Compteur KM</th>
                        <th className="py-3 px-3">Assurance</th>
                        <th className="py-3 px-3">Statut</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredVehicules.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">
                            Aucun véhicule ne correspond aux critères de recherche.
                          </td>
                        </tr>
                      ) : (
                        filteredVehicules.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-700 font-bold">
                                  <Car className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-mono font-black text-slate-900 dark:text-white text-xs">
                                    {v.immatriculation}
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    {v.marque} {v.modele}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <Badge variant="outline" className="text-[10px] font-bold">
                                {v.type_vehicule || 'Bus'}
                              </Badge>
                              <p className="text-[10px] text-slate-500 mt-0.5">{v.capacite} places assises</p>
                            </td>
                            <td className="py-3 px-3">
                              {v.chauffeurNom ? (
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-slate-200">{v.chauffeurNom}</p>
                                  <p className="text-[10px] text-slate-500">{v.chauffeurTel || 'N/C'}</p>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Non assigné</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {(v.kilometrage_actuel || 0).toLocaleString('fr-FR')} km
                              </span>
                              {v.vidange_alerte && (
                                <Badge className="bg-amber-500 text-white text-[9px] font-bold ml-1.5">
                                  Vidange requise
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {v.assurance_statut === 'valide' ? (
                                <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                                  Valide ({v.assurance_jours_restants}j)
                                </Badge>
                              ) : v.assurance_statut === 'alerte_proche' ? (
                                <Badge className="bg-amber-500 text-white text-[10px] font-bold">
                                  Expire sous {v.assurance_jours_restants}j
                                </Badge>
                              ) : v.assurance_statut === 'expire' ? (
                                <Badge className="bg-red-600 text-white text-[10px] font-bold">
                                  Expirée !
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px]">Non renseignée</Badge>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {v.statut === 'actif' ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[10px]">
                                  En service
                                </Badge>
                              ) : v.statut === 'revision' ? (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-[10px]">
                                  En révision
                                </Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800 border-red-300 font-bold text-[10px]">
                                  En panne
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEntretienModal(v.immatriculation, v.kilometrage_actuel)}
                                  title="Enregistrer une vidange"
                                  className="h-7 w-7 p-0 text-indigo-600 hover:bg-indigo-50"
                                >
                                  <Wrench className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenVehicleModal(v)}
                                  title="Modifier véhicule"
                                  className="h-7 w-7 p-0 text-slate-700 hover:bg-slate-100"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteVehicle(v.id, v.immatriculation)}
                                  title="Supprimer véhicule"
                                  className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ONGLET 2 : ASSURANCES & VISITES TECHNIQUES (CONFORMITÉ) */}
          {/* ========================================================================= */}
          <TabsContent value="conformite" className="space-y-4">
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                    Conformité Réglementaire & Sécurité Routière
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Suivi prédictif des échéances d’assurance, contrôles techniques et vignettes.
                  </CardDescription>
                </div>
                <Badge className="bg-indigo-600 text-white text-xs font-bold">
                  Contrôle Périodique
                </Badge>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/80 border-y border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400">
                        <th className="py-3 px-4">Véhicule</th>
                        <th className="py-3 px-3">Compagnie & N° Police</th>
                        <th className="py-3 px-3">Date Expiration Assurance</th>
                        <th className="py-3 px-3">Visite Technique</th>
                        <th className="py-3 px-3">Carte Stationnement</th>
                        <th className="py-3 px-4 text-right">Mise à Jour</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {vehiculesList.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">{v.immatriculation}</span>
                            <p className="text-[10px] text-slate-500">{v.marque} {v.modele}</p>
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-800 dark:text-slate-200">{v.compagnie_assurance || 'Non souscrite'}</p>
                            <p className="text-[10px] font-mono text-slate-500">{v.num_police_assurance || 'Sans n° police'}</p>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-mono">{v.date_expiration_assurance || 'Non renseignée'}</span>
                            </div>
                            {v.assurance_statut === 'valide' && (
                              <span className="text-[10px] text-emerald-600 font-bold">● Valide encore {v.assurance_jours_restants} jours</span>
                            )}
                            {v.assurance_statut === 'alerte_proche' && (
                              <span className="text-[10px] text-amber-600 font-bold">⚠️ Renouvellement urgent ({v.assurance_jours_restants}j)</span>
                            )}
                            {v.assurance_statut === 'expire' && (
                              <span className="text-[10px] text-red-600 font-black">🚨 EXPOSÉ - POLICE EXPIRÉE</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-mono">{v.date_expiration_visite_technique || 'Non renseignée'}</span>
                            </div>
                            {v.visite_technique_statut === 'valide' && (
                              <span className="text-[10px] text-emerald-600 font-bold">● Valide ({v.visite_technique_jours_restants}j)</span>
                            )}
                            {v.visite_technique_statut === 'expire' && (
                              <span className="text-[10px] text-red-600 font-black">🚨 Visite technique dépassée</span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono">
                            {v.num_carte_stationnement ? (
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{v.num_carte_stationnement}</span>
                                <p className="text-[10px] text-slate-500">Exp: {v.date_expiration_stationnement || 'N/C'}</p>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Non délivrée</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenVehicleModal(v)}
                              className="text-xs h-7 gap-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              Mettre à jour
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ONGLET 3 : CARNET D'ENTRETIEN, VIDANGES & RÉPARATIONS */}
          {/* ========================================================================= */}
          <TabsContent value="entretiens" className="space-y-4">
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                    Historique des Entretiens, Vidanges & Factures Mécaniques
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Traçabilité de chaque passage au garage, kilométrage et coût financier.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleOpenEntretienModal()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Nouvelle Intervention
                </Button>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/80 border-y border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-3">Véhicule</th>
                        <th className="py-3 px-3">Nature de l’intervention</th>
                        <th className="py-3 px-3">Kilométrage</th>
                        <th className="py-3 px-3">Garage & Réf Facture</th>
                        <th className="py-3 px-3 text-right">Montant (FCFA)</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {entretiensList.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">
                            Aucun historique d’entretien enregistré pour le moment.
                          </td>
                        </tr>
                      ) : (
                        entretiensList.map((e) => (
                          <tr key={e.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                              {e.date_intervention || '—'}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-amber-700">
                              {e.immatriculation}
                            </td>
                            <td className="py-3 px-3">
                              <p className="font-bold text-slate-900 dark:text-slate-100">{e.type_intervention}</p>
                              {e.description && <p className="text-[10px] text-slate-500">{e.description}</p>}
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-mono">{(e.kilometrage || 0).toLocaleString('fr-FR')} km</span>
                              {e.prochain_kilometrage && (
                                <p className="text-[10px] text-slate-500">Prochaine : {e.prochain_kilometrage.toLocaleString('fr-FR')} km</p>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <p className="font-bold text-slate-800 dark:text-slate-200">{e.garage_prestataire || 'Atelier Interne'}</p>
                              <p className="text-[10px] font-mono text-slate-500">{e.facture_ref || 'Sans facture'}</p>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-black text-indigo-700 dark:text-indigo-400">
                              {formatCurrency(e.cout_total)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteEntretien(e.id)}
                                className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ONGLET 4 : CONDUCTEURS, VISITES MÉDICALES & APTITUDES */}
          {/* ========================================================================= */}
          <TabsContent value="conducteurs" className="space-y-4">
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                    Fiches Administratives & Aptitudes Médicales des Conducteurs
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Suivi médical obligatoire, permis de conduire et autorisations de transport scolaire.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleOpenAgentModal()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Nouvelle Fiche Conducteur
                </Button>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/80 border-y border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400">
                        <th className="py-3 px-4">Conducteur / Agent</th>
                        <th className="py-3 px-3">Fonction & Contact</th>
                        <th className="py-3 px-3">Véhicule Affecté</th>
                        <th className="py-3 px-3">Date Visite Médicale</th>
                        <th className="py-3 px-3">Aptitude Médicale</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {fichesAgentsList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500">
                            Aucune fiche conducteur enregistrée.
                          </td>
                        </tr>
                      ) : (
                        fichesAgentsList.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-700 font-bold">
                                  <User className="w-3.5 h-3.5" />
                                </div>
                                <span className="font-bold text-slate-900 dark:text-white">{a.agent_nom}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <p className="text-slate-800 dark:text-slate-200">{a.agent_fonction}</p>
                              <p className="text-[10px] text-slate-500">{a.agent_telephone || 'N/C'}</p>
                            </td>
                            <td className="py-3 px-3 font-mono">
                              <span className="font-bold text-amber-700">{a.immatriculation}</span>
                              <p className="text-[10px] text-slate-500">{a.marque_modele}</p>
                            </td>
                            <td className="py-3 px-3 font-mono">
                              {a.visite_medicale_date || 'Non effectuée'}
                              {a.medical_alerte && (
                                <p className="text-[10px] text-amber-600 font-bold">⚠️ Renouvellement visite requis</p>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                                {a.statut_medical || 'Aptitude confirmée ✅'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenAgentModal(a)}
                                  className="h-7 w-7 p-0 text-slate-700 hover:bg-slate-100"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteFicheAgent(a.id)}
                                  className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ========================================================================= */}
        {/* MODAL : AJOUT / MODIFICATION DE VÉHICULE */}
        {/* ========================================================================= */}
        <Dialog open={showVehicleModal} onOpenChange={setShowVehicleModal}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-black flex items-center gap-2">
                <Car className="w-5 h-5 text-amber-600" />
                {editingVehicleId ? 'Modifier Véhicule' : 'Nouveau Véhicule du Parc'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Remplissez les informations techniques et pièces administratives.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-bold mb-1 block">Immatriculation *</Label>
                  <Input
                    value={vehicleForm.immatriculation}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, immatriculation: e.target.value })}
                    placeholder="ex: 4567 HW 01"
                    className="text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <Label className="font-bold mb-1 block">Type de Véhicule</Label>
                  <Select
                    value={vehicleForm.type_vehicule}
                    onValueChange={(v) => setVehicleForm({ ...vehicleForm, type_vehicule: v })}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bus Scolaire">Bus Scolaire</SelectItem>
                      <SelectItem value="Minibus">Minibus</SelectItem>
                      <SelectItem value="Berline de Direction">Berline de Direction</SelectItem>
                      <SelectItem value="4x4 / Pick-up">4x4 / Pick-up</SelectItem>
                      <SelectItem value="Utilitaire">Utilitaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-bold mb-1 block">Marque *</Label>
                  <Input
                    value={vehicleForm.marque}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, marque: e.target.value })}
                    placeholder="ex: Toyota"
                    className="text-xs"
                  />
                </div>
                <div>
                  <Label className="font-bold mb-1 block">Modèle *</Label>
                  <Input
                    value={vehicleForm.modele}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, modele: e.target.value })}
                    placeholder="ex: Coaster 30 Places"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="font-bold mb-1 block">Capacité (Places)</Label>
                  <Input
                    type="number"
                    value={vehicleForm.capacite}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, capacite: Number(e.target.value) || 0 })}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Label className="font-bold mb-1 block">Kilométrage Compteur</Label>
                  <Input
                    type="number"
                    value={vehicleForm.kilometrage_actuel}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, kilometrage_actuel: Number(e.target.value) || 0 })}
                    className="text-xs font-mono"
                  />
                </div>
                <div>
                  <Label className="font-bold mb-1 block">Statut</Label>
                  <Select
                    value={vehicleForm.statut}
                    onValueChange={(v) => setVehicleForm({ ...vehicleForm, statut: v })}
                  >
                    <SelectTrigger className="text-xs font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="actif">Actif / En service</SelectItem>
                      <SelectItem value="revision">En révision</SelectItem>
                      <SelectItem value="en_panne">En panne</SelectItem>
                      <SelectItem value="reforme">Réformé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-bold mb-1 block">Chauffeur / Conducteur</Label>
                  <Input
                    value={vehicleForm.chauffeurNom}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, chauffeurNom: e.target.value })}
                    placeholder="Nom du conducteur"
                    className="text-xs"
                  />
                </div>
                <div>
                  <Label className="font-bold mb-1 block">Téléphone Conducteur</Label>
                  <Input
                    value={vehicleForm.chauffeurTel}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, chauffeurTel: e.target.value })}
                    placeholder="+225 07..."
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <p className="font-bold text-xs text-indigo-900 dark:text-indigo-300 mb-2">
                  🛡️ Assurance & Contrôle Technique
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="font-semibold mb-1 block">Compagnie d’Assurance</Label>
                    <Input
                      value={vehicleForm.compagnie_assurance}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, compagnie_assurance: e.target.value })}
                      placeholder="NSIA, SANLAM, etc."
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <Label className="font-semibold mb-1 block">N° Police Assurance</Label>
                    <Input
                      value={vehicleForm.num_police_assurance}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, num_police_assurance: e.target.value })}
                      placeholder="POL-123456"
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <Label className="font-semibold mb-1 block">Expiration Assurance</Label>
                    <Input
                      type="date"
                      value={vehicleForm.date_expiration_assurance}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, date_expiration_assurance: e.target.value })}
                      className="text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="font-semibold mb-1 block">Expiration Visite Technique</Label>
                    <Input
                      type="date"
                      value={vehicleForm.date_expiration_visite_technique}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, date_expiration_visite_technique: e.target.value })}
                      className="text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowVehicleModal(false)} className="text-xs">
                Annuler
              </Button>
              <Button onClick={handleSaveVehicle} className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs">
                {editingVehicleId ? 'Mettre à Jour' : 'Enregistrer le Véhicule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* MODAL : ENREGISTREMENT D'UNE VIDANGE / ENTRETIEN */}
        {/* ========================================================================= */}
        <Dialog open={showEntretienModal} onOpenChange={setShowEntretienModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-black flex items-center gap-2">
                <Wrench className="w-5 h-5 text-indigo-600" />
                Enregistrer un Entretien / Vidange
              </DialogTitle>
              <DialogDescription className="text-xs">
                Mise à jour du carnet d’entretien et recalibrage de la prochaine vidange.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div>
                <Label className="font-bold mb-1 block">Véhicule concerné *</Label>
                <Select
                  value={entretienForm.immatriculation}
                  onValueChange={(v) => setEntretienForm({ ...entretienForm, immatriculation: v })}
                >
                  <SelectTrigger className="text-xs font-mono font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {vehiculesList.map((v) => (
                      <SelectItem key={v.id} value={v.immatriculation}>
                        {v.immatriculation} — {v.marque} {v.modele}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="font-bold mb-1 block">Type d’intervention *</Label>
                  <Select
                    value={entretienForm.type_intervention}
                    onValueChange={(v) => setEntretienForm({ ...entretienForm, type_intervention: v })}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vidange moteur">Vidange moteur</SelectItem>
                      <SelectItem value="Système de Freinage">Plaquettes / Freins</SelectItem>
                      <SelectItem value="Pneumatiques">Changement Pneus</SelectItem>
                      <SelectItem value="Visite technique">Visite technique SICTA</SelectItem>
                      <SelectItem value="Révision générale">Révision générale</SelectItem>
                      <SelectItem value="Climatisation">Climatisation</SelectItem>
                      <SelectItem value="Batterie / Électricité">Batterie / Électricité</SelectItem>
                      <SelectItem value="Autre réparation">Autre réparation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-bold mb-1 block">Date Intervention *</Label>
                  <Input
                    type="date"
                    value={entretienForm.date_intervention}
                    onChange={(e) => setEntretienForm({ ...entretienForm, date_intervention: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="font-bold mb-1 block">Kilométrage actuel (KM)</Label>
                  <Input
                    type="number"
                    value={entretienForm.kilometrage}
                    onChange={(e) => setEntretienForm({ ...entretienForm, kilometrage: Number(e.target.value) || 0 })}
                    className="text-xs font-mono"
                  />
                </div>
                <div>
                  <Label className="font-bold mb-1 block">Prochain KM Vidange</Label>
                  <Input
                    type="number"
                    value={entretienForm.prochain_kilometrage}
                    onChange={(e) => setEntretienForm({ ...entretienForm, prochain_kilometrage: Number(e.target.value) || 0 })}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="font-bold mb-1 block">Garage / Prestataire</Label>
                  <Input
                    value={entretienForm.garage_prestataire}
                    onChange={(e) => setEntretienForm({ ...entretienForm, garage_prestataire: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Label className="font-bold mb-1 block">Coût Total (FCFA)</Label>
                  <Input
                    type="number"
                    value={entretienForm.cout_total}
                    onChange={(e) => setEntretienForm({ ...entretienForm, cout_total: Number(e.target.value) || 0 })}
                    className="text-xs font-bold font-mono"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEntretienModal(false)} className="text-xs">
                Annuler
              </Button>
              <Button onClick={handleSaveEntretien} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
                Enregistrer l’Intervention
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* MODAL : FICHE CONDUCTEUR */}
        {/* ========================================================================= */}
        <Dialog open={showAgentModal} onOpenChange={setShowAgentModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-black flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-blue-600" />
                {editingAgentFicheId ? 'Modifier Fiche Conducteur' : 'Nouvelle Fiche Conducteur & Aptitude'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Dossier médical, permis de conduire et autorisations administratives.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div>
                <Label className="font-bold mb-1 block">Agent Conducteur *</Label>
                <Select
                  value={agentForm.personnel_id}
                  onValueChange={(v) => setAgentForm({ ...agentForm, personnel_id: v })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Sélectionner l'agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {staffList.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {formatStudentName(s)} ({s.role || 'Personnel'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="font-bold mb-1 block">Véhicule Affecté *</Label>
                <Select
                  value={agentForm.immatriculation}
                  onValueChange={(v) => {
                    const sel = vehiculesList.find((veh) => veh.immatriculation === v);
                    setAgentForm({
                      ...agentForm,
                      immatriculation: v,
                      marque_modele: sel ? `${sel.marque} ${sel.modele}` : '',
                    });
                  }}
                >
                  <SelectTrigger className="text-xs font-mono font-bold">
                    <SelectValue placeholder="Choisir le véhicule..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vehiculesList.map((v) => (
                      <SelectItem key={v.id} value={v.immatriculation}>
                        {v.immatriculation} — {v.marque} {v.modele}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="font-bold mb-1 block">Date Visite Médicale</Label>
                  <Input
                    type="date"
                    value={agentForm.visite_medicale_date}
                    onChange={(e) => setAgentForm({ ...agentForm, visite_medicale_date: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>
                <div>
                  <Label className="font-bold mb-1 block">Aptitude Médicale</Label>
                  <Select
                    value={agentForm.statut_medical}
                    onValueChange={(v) => setAgentForm({ ...agentForm, statut_medical: v })}
                  >
                    <SelectTrigger className="text-xs font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aptitude confirmée ✅">Aptitude confirmée ✅</SelectItem>
                      <SelectItem value="Visite à renouveler ⚠️">Visite à renouveler ⚠️</SelectItem>
                      <SelectItem value="Inapte temporaire ❌">Inapte temporaire ❌</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAgentModal(false)} className="text-xs">
                Annuler
              </Button>
              <Button onClick={handleSaveFicheAgent} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
                Enregistrer la Fiche
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
}

