/**
 * Modules Comptabilité (§4)
 * Trésorerie · Gestion Paie · Budget · Logistique · Parc Automobile
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Banknote, Users, TrendingUp, Package, Truck,
  Plus, Edit, Trash2, CheckCircle2, Clock,
  AlertCircle, Download, Printer, ArrowUpCircle, ArrowDownCircle,
  Calendar, Search, Filter, Car, Wrench, Landmark, FileSpreadsheet,
  FileText, Check, Upload, GraduationCap, BookMarked, School,
  Award, ExternalLink, ClipboardList,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, ROUTE_PATHS } from '@/lib/index';
import apiClient from '@/lib/apiClient';
import {
  generateSagePNM,
  generateSageCSV,
  downloadSageExportFile,
  DEFAULT_SYSCOHADA_SAGE_CONFIG,
  SageAccountingEntry,
  SageConfig,
} from '@/lib/sageExportBridge';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LigneCaisse {
  id: string;
  date: string;
  libelle: string;
  entree: number;
  sortie: number;
  solde: number;
  source: 'scolarite' | 'fondation' | 'autre';
}

interface FichePaie {
  id: string;
  mois: string;
  annee: number;
  agentId: string;
  agentNom: string;
  agentPoste: string;
  salaireBase: number;
  heuresSupp: number;
  tauxHeure: number;
  primes: number;
  retenues: number;
  netAPayer: number;
  statut: 'brouillon' | 'valide' | 'paye';
}

interface LigneBudget {
  id: string;
  categorie: string;
  libelle: string;
  montantPrevu: number;
  montantRealise: number;
  mois: number;
}

interface BienLogistique {
  id: string;
  designation: string;
  categorie: 'mobilier' | 'informatique' | 'vehicule' | 'materiel' | 'autre';
  quantite: number;
  etat: 'bon' | 'moyen' | 'mauvais' | 'hors_service';
  dateAcquisition: string;
  valeur: number;
  localisation: string;
}

interface Vehicule {
  id: string;
  immatriculation: string;
  marque: string;
  modele: string;
  annee: number;
  capacite: number;
  type: 'bus_scolaire' | 'minibus' | 'voiture' | 'autre';
  statut: 'actif' | 'en_panne' | 'revision' | 'retraite';
  chauffeurId: string;
  chauffeurNom: string;
  kmActuel: number;
  dernierEntretien: string;
}

const MOIS_LABELS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const CATEGORIES_BUDGET = ['Salaires','Fournitures','Entretien','Transport','Cantine','Communication','Équipement','Divers'];
const ANNEE = new Date().getFullYear();

function generateId() { return `id-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ComptabiliteModules() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tresorerie');

  // Classes & Cycles State
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassCycle, setSelectedClassCycle] = useState<string>('all');
  const [searchClassQuery, setSearchClassQuery] = useState<string>('');

  // Sage State
  const [payments, setPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [sageConfig, setSageConfig] = useState<SageConfig>(DEFAULT_SYSCOHADA_SAGE_CONFIG);
  const [sageDateStart, setSageDateStart] = useState<string>(`${new Date().getFullYear()}-01-01`);
  const [sageDateEnd, setSageDateEnd] = useState<string>(new Date().toISOString().split('T')[0]);

  // Load API Payments for Sage & Classes
  useEffect(() => {
    Promise.all([
      apiClient.getPayments().catch(() => []),
      apiClient.getStudents().catch(() => []),
      apiClient.getClasses().catch(() => []),
    ]).then(([p, s, c]) => {
      setPayments(Array.isArray(p) ? p : []);
      setStudents(Array.isArray(s) ? s : []);
      setClasses(Array.isArray(c) ? c : []);
    });
  }, []);

  const sageEntries = ((): SageAccountingEntry[] => {
    const list: SageAccountingEntry[] = [];
    payments.forEach(p => {
      let pDate = sageDateEnd;
      if (typeof p.date === 'string') {
        pDate = p.date.split('T')[0];
      } else if (p.date instanceof Date) {
        pDate = p.date.toISOString().split('T')[0];
      } else if (p.date) {
        try {
          const d = new Date(p.date);
          if (!isNaN(d.getTime())) pDate = d.toISOString().split('T')[0];
        } catch (e) {}
      }

      if (pDate < sageDateStart || pDate > sageDateEnd) return;

      const eleve = students.find(s => String(s.id) === String(p.studentId || p.eleve_id));
      const eleveName = eleve ? `${eleve.lastName || eleve.nom || ''} ${eleve.firstName || eleve.prenom || ''}`.trim() : (p.studentName || p.eleve_nom || "Élève");
      const matricule = eleve?.matricule || p.matricule || `MAT-${p.id}`;
      const piece = p.receiptNumber || p.numero_recu || `RC-${p.id}`;
      const amount = Number(p.amount || p.montant || 0);

      if (amount <= 0) return;

      const pType = (p.type || '').toLowerCase();
      let compteProduit = sageConfig.compteProduitScolarite;
      let typeLibelle = "Scolarité";
      if (pType.includes("cant")) { compteProduit = sageConfig.compteProduitCantine; typeLibelle = "Cantine"; }
      else if (pType.includes("trans") || pType.includes("car")) { compteProduit = sageConfig.compteProduitTransport; typeLibelle = "Transport Car"; }

      list.push({
        journalCode: sageConfig.journalVentes as any,
        date: pDate,
        compteGeneral: sageConfig.compteClientScolarite,
        compteTiers: matricule,
        numeroPiece: piece,
        libelle: `Facture ${typeLibelle} - ${eleveName}`,
        debit: amount,
        credit: 0,
      });

      list.push({
        journalCode: sageConfig.journalVentes as any,
        date: pDate,
        compteGeneral: compteProduit,
        compteTiers: "",
        numeroPiece: piece,
        libelle: `Vente ${typeLibelle} - ${eleveName}`,
        debit: 0,
        credit: amount,
      });

      const isBanque = (p.mode || '').toLowerCase().includes("bank") || (p.mode || '').toLowerCase().includes("vir") || (p.mode || '').toLowerCase().includes("cheq");
      const journalTresorerie = isBanque ? sageConfig.journalBanque : sageConfig.journalCaisse;
      const compteTresorerie = isBanque ? sageConfig.compteBanque : sageConfig.compteCaisse;

      list.push({
        journalCode: journalTresorerie as any,
        date: pDate,
        compteGeneral: compteTresorerie,
        compteTiers: "",
        numeroPiece: piece,
        libelle: `Règlement ${typeLibelle} - ${eleveName}`,
        debit: amount,
        credit: 0,
      });

      list.push({
        journalCode: journalTresorerie as any,
        date: pDate,
        compteGeneral: sageConfig.compteClientScolarite,
        compteTiers: matricule,
        numeroPiece: piece,
        libelle: `Règlement ${typeLibelle} - ${eleveName}`,
        debit: 0,
        credit: amount,
      });
    });

    return list;
  })();

  const totalSageDebit = sageEntries.reduce((s, e) => s + e.debit, 0);
  const totalSageCredit = sageEntries.reduce((s, e) => s + e.credit, 0);

  const [importedSageEntries, setImportedSageEntries] = useState<SageAccountingEntry[]>([]);
  const [importingSage, setImportingSage] = useState<boolean>(false);

  const handleFileUploadSage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseSageImportFile(text, file.name);
        setImportedSageEntries(parsed);
        toast({
          title: "Fichier Sage chargé avec succès",
          description: `${parsed.length} écritures comptables extraites du fichier ${file.name}`,
        });
      }
    };
    reader.readAsText(file);
  };

  const handleSaveImportedSage = async () => {
    if (!importedSageEntries.length) return;
    setImportingSage(true);
    let successCount = 0;

    try {
      for (const entry of importedSageEntries) {
        if (entry.credit > 0 || entry.debit > 0) {
          const eleve = students.find(
            (s) =>
              (s.matricule && entry.compteTiers && s.matricule.toLowerCase() === entry.compteTiers.toLowerCase()) ||
              `${s.lastName || s.nom || ''} ${s.firstName || s.prenom || ''}`.toLowerCase().includes((entry.libelle || '').toLowerCase())
          );

          const amount = entry.debit > 0 ? entry.debit : entry.credit;

          await apiClient.createPayment({
            student_id: eleve ? eleve.id : 1,
            eleve_id: eleve ? eleve.id : 1,
            type: (entry.libelle || '').toLowerCase().includes("cant") ? "cantine" : (entry.libelle || '').toLowerCase().includes("trans") ? "transport" : "scolarite",
            montant: amount,
            amount: amount,
            mode: entry.journalCode === "BQ" ? "banque" : "especes",
            status: "paye",
            date: entry.date,
            numero_recu: entry.numeroPiece,
            receiptNumber: entry.numeroPiece,
          }).catch(() => null);

          successCount++;
        }
      }

      toast({
        title: "Importation Sage enregistrée avec succès !",
        description: `${successCount} écritures synchronisées dans la base de données.`,
      });
      setImportedSageEntries([]);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erreur d'importation",
        description: "Impossible d'enregistrer les écritures Sage.",
      });
    } finally {
      setImportingSage(false);
    }
  };

  const handleDownloadSage = (format: "pnm" | "csv" | "txt") => {
    if (!sageEntries.length) {
      toast({ title: "Aucune écriture comptable trouvée sur la période." });
      return;
    }
    let content = "";
    let ext = "pnm";
    if (format === "csv") {
      content = generateSageCSV(sageEntries);
      ext = "csv";
    } else {
      content = generateSagePNM(sageEntries);
      ext = format === "pnm" ? "pnm" : "txt";
    }

    const filename = `ECRITURES_SAGE_SYSCOHADA_${sageDateStart}_AU_${sageDateEnd}.${ext}`;
    downloadSageExportFile(filename, content);
    toast({ title: "Exportation Sage & Saari réussie !", description: `Fichier téléchargé : ${filename}` });
  };

  // ── Trésorerie ──────────────────────────────────────────────────────────────
  const [lignesCaisse, setLignesCaisse] = useState<LigneCaisse[]>([
    { id: '1', date: `${ANNEE}-09-01`, libelle: 'Report solde début', entree: 5000000, sortie: 0, solde: 5000000, source: 'autre' },
  ]);
  const [openCaisse, setOpenCaisse] = useState(false);
  const [formCaisse, setFormCaisse] = useState({ date: new Date().toISOString().split('T')[0], libelle: '', entree: '', sortie: '', source: 'scolarite' as LigneCaisse['source'] });

  const soldeCourant = lignesCaisse.length ? lignesCaisse[lignesCaisse.length - 1].solde : 0;

  const addLigneCaisse = () => {
    if (!formCaisse.libelle) { toast({ variant: 'destructive', title: 'Libellé requis' }); return; }
    const entree = Number(formCaisse.entree) || 0;
    const sortie = Number(formCaisse.sortie) || 0;
    const prev = lignesCaisse.length ? lignesCaisse[lignesCaisse.length - 1].solde : 0;
    const ligne: LigneCaisse = { id: generateId(), date: formCaisse.date, libelle: formCaisse.libelle, entree, sortie, solde: prev + entree - sortie, source: formCaisse.source };
    setLignesCaisse(p => [...p, ligne]);
    toast({ title: 'Opération enregistrée.' });
    setFormCaisse({ date: new Date().toISOString().split('T')[0], libelle: '', entree: '', sortie: '', source: 'scolarite' });
    setOpenCaisse(false);
  };

  const printEtatCaisse = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>État de Caisse</title><style>
      body{font-family:Arial,sans-serif;padding:24px;font-size:11px}
      h1{font-size:16px}table{width:100%;border-collapse:collapse;margin-top:12px}
      th,td{border:1px solid #ccc;padding:5px 8px}th{background:#f0f0f0;font-weight:bold}
      .credit{color:green}.debit{color:red}.solde{font-weight:bold}
    </style></head><body>
    <h1>État de Caisse — ${new Date().toLocaleDateString('fr-FR')}</h1>
    <table><tr><th>Date</th><th>Libellé</th><th>Entrée</th><th>Sortie</th><th>Solde</th><th>Source</th></tr>
    ${lignesCaisse.map(l => `<tr>
      <td>${l.date}</td><td>${l.libelle}</td>
      <td class="credit">${l.entree > 0 ? formatCurrency(l.entree) : ''}</td>
      <td class="debit">${l.sortie > 0 ? formatCurrency(l.sortie) : ''}</td>
      <td class="solde">${formatCurrency(l.solde)}</td>
      <td>${l.source}</td>
    </tr>`).join('')}
    </table><p style="margin-top:12px"><strong>Solde actuel : ${formatCurrency(soldeCourant)}</strong></p>
    </body></html>`);
    w.document.close(); w.print();
  };

  // ── Gestion Paie ────────────────────────────────────────────────────────────
  const [fiches, setFiches] = useState<FichePaie[]>([]);
  const [openPaie, setOpenPaie] = useState(false);
  const [editPaie, setEditPaie] = useState<FichePaie | null>(null);
  const [formPaie, setFormPaie] = useState({ mois: MOIS_LABELS[new Date().getMonth()], agentNom: '', agentPoste: '', salaireBase: '', heuresSupp: '0', tauxHeure: '2000', primes: '0', retenues: '0' });

  const netPaie = Math.max(0,
    (Number(formPaie.salaireBase) || 0) +
    ((Number(formPaie.heuresSupp) || 0) * (Number(formPaie.tauxHeure) || 0)) +
    (Number(formPaie.primes) || 0) -
    (Number(formPaie.retenues) || 0)
  );

  const saveFiche = () => {
    if (!formPaie.agentNom || !formPaie.salaireBase) { toast({ variant: 'destructive', title: 'Nom et salaire requis' }); return; }
    const fiche: FichePaie = {
      id: editPaie?.id || generateId(),
      mois: formPaie.mois, annee: ANNEE,
      agentId: editPaie?.agentId || generateId(),
      agentNom: formPaie.agentNom, agentPoste: formPaie.agentPoste,
      salaireBase: Number(formPaie.salaireBase),
      heuresSupp: Number(formPaie.heuresSupp),
      tauxHeure: Number(formPaie.tauxHeure),
      primes: Number(formPaie.primes),
      retenues: Number(formPaie.retenues),
      netAPayer: netPaie,
      statut: editPaie?.statut || 'brouillon',
    };
    if (editPaie) {
      setFiches(p => p.map(f => f.id === editPaie.id ? fiche : f));
      toast({ title: 'Fiche mise à jour.' });
    } else {
      setFiches(p => [...p, fiche]);
      toast({ title: 'Fiche de paie créée.' });
    }
    setOpenPaie(false); setEditPaie(null);
    setFormPaie({ mois: MOIS_LABELS[new Date().getMonth()], agentNom: '', agentPoste: '', salaireBase: '', heuresSupp: '0', tauxHeure: '2000', primes: '0', retenues: '0' });
  };

  const validerFiche = (id: string) => {
    setFiches(p => p.map(f => f.id === id ? { ...f, statut: f.statut === 'brouillon' ? 'valide' : f.statut === 'valide' ? 'paye' : f.statut } : f));
    toast({ title: 'Statut mis à jour.' });
  };

  const printBulletin = (f: FichePaie) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Bulletin de paie</title><style>
      body{font-family:Arial,sans-serif;padding:24px;font-size:12px}
      h1{font-size:16px}.row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #eee}
      .total{font-weight:bold;font-size:14px;margin-top:8px}
    </style></head><body>
    <h1>Bulletin de Paie — ${f.mois} ${f.annee}</h1>
    <p><strong>${f.agentNom}</strong> — ${f.agentPoste}</p><hr/>
    <div class="row"><span>Salaire de base</span><span>${formatCurrency(f.salaireBase)}</span></div>
    <div class="row"><span>Heures supplémentaires (${f.heuresSupp}h × ${formatCurrency(f.tauxHeure)})</span><span>${formatCurrency(f.heuresSupp * f.tauxHeure)}</span></div>
    <div class="row"><span>Primes</span><span>${formatCurrency(f.primes)}</span></div>
    <div class="row"><span>Retenues</span><span>- ${formatCurrency(f.retenues)}</span></div>
    <div class="row total"><span>NET À PAYER</span><span>${formatCurrency(f.netAPayer)}</span></div>
    </body></html>`);
    w.document.close(); w.print();
  };

  // ── Budget ──────────────────────────────────────────────────────────────────
  const [lignesBudget, setLignesBudget] = useState<LigneBudget[]>([]);
  const [openBudget, setOpenBudget] = useState(false);
  const [formBudget, setFormBudget] = useState({ categorie: 'Salaires', libelle: '', montantPrevu: '', montantRealise: '0', mois: String(new Date().getMonth()) });

  const saveBudget = () => {
    if (!formBudget.libelle || !formBudget.montantPrevu) { toast({ variant: 'destructive', title: 'Libellé et montant requis' }); return; }
    const ligne: LigneBudget = {
      id: generateId(), categorie: formBudget.categorie, libelle: formBudget.libelle,
      montantPrevu: Number(formBudget.montantPrevu), montantRealise: Number(formBudget.montantRealise),
      mois: Number(formBudget.mois),
    };
    setLignesBudget(p => [...p, ligne]);
    toast({ title: 'Ligne budgétaire ajoutée.' });
    setOpenBudget(false);
    setFormBudget({ categorie: 'Salaires', libelle: '', montantPrevu: '', montantRealise: '0', mois: String(new Date().getMonth()) });
  };

  const totalPrevu = lignesBudget.reduce((s, l) => s + l.montantPrevu, 0);
  const totalRealise = lignesBudget.reduce((s, l) => s + l.montantRealise, 0);
  const tauxExec = totalPrevu > 0 ? Math.round((totalRealise / totalPrevu) * 100) : 0;

  // ── Logistique ──────────────────────────────────────────────────────────────
  const [biens, setBiens] = useState<BienLogistique[]>([]);
  const [openBien, setOpenBien] = useState(false);
  const [editBien, setEditBien] = useState<BienLogistique | null>(null);
  const [formBien, setFormBien] = useState({ designation: '', categorie: 'mobilier' as BienLogistique['categorie'], quantite: '1', etat: 'bon' as BienLogistique['etat'], dateAcquisition: new Date().toISOString().split('T')[0], valeur: '', localisation: '' });

  const saveBien = () => {
    if (!formBien.designation) { toast({ variant: 'destructive', title: 'Désignation requise' }); return; }
    const bien: BienLogistique = {
      id: editBien?.id || generateId(),
      designation: formBien.designation, categorie: formBien.categorie,
      quantite: Number(formBien.quantite), etat: formBien.etat,
      dateAcquisition: formBien.dateAcquisition, valeur: Number(formBien.valeur),
      localisation: formBien.localisation,
    };
    if (editBien) { setBiens(p => p.map(b => b.id === editBien.id ? bien : b)); toast({ title: 'Bien mis à jour.' }); }
    else { setBiens(p => [...p, bien]); toast({ title: 'Bien enregistré.' }); }
    setOpenBien(false); setEditBien(null);
    setFormBien({ designation: '', categorie: 'mobilier', quantite: '1', etat: 'bon', dateAcquisition: new Date().toISOString().split('T')[0], valeur: '', localisation: '' });
  };

  const etatConfig = { bon: { label: 'Bon état', cls: 'bg-green-100 text-green-800' }, moyen: { label: 'Moyen', cls: 'bg-amber-100 text-amber-800' }, mauvais: { label: 'Mauvais', cls: 'bg-orange-100 text-orange-800' }, hors_service: { label: 'Hors service', cls: 'bg-red-100 text-red-800' } };

  // ── Parc Auto ───────────────────────────────────────────────────────────────
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [openVehicule, setOpenVehicule] = useState(false);
  const [editVehicule, setEditVehicule] = useState<Vehicule | null>(null);
  const [formVehicule, setFormVehicule] = useState({ immatriculation: '', marque: '', modele: '', annee: String(ANNEE), capacite: '30', type: 'bus_scolaire' as Vehicule['type'], statut: 'actif' as Vehicule['statut'], chauffeurNom: '', kmActuel: '0', dernierEntretien: new Date().toISOString().split('T')[0] });

  const saveVehicule = () => {
    if (!formVehicule.immatriculation || !formVehicule.marque) { toast({ variant: 'destructive', title: 'Immatriculation et marque requises' }); return; }
    const v: Vehicule = {
      id: editVehicule?.id || generateId(),
      immatriculation: formVehicule.immatriculation, marque: formVehicule.marque, modele: formVehicule.modele,
      annee: Number(formVehicule.annee), capacite: Number(formVehicule.capacite),
      type: formVehicule.type, statut: formVehicule.statut,
      chauffeurId: editVehicule?.chauffeurId || generateId(),
      chauffeurNom: formVehicule.chauffeurNom,
      kmActuel: Number(formVehicule.kmActuel), dernierEntretien: formVehicule.dernierEntretien,
    };
    if (editVehicule) { setVehicules(p => p.map(x => x.id === editVehicule.id ? v : x)); toast({ title: 'Véhicule mis à jour.' }); }
    else { setVehicules(p => [...p, v]); toast({ title: 'Véhicule enregistré.' }); }
    setOpenVehicule(false); setEditVehicule(null);
    setFormVehicule({ immatriculation: '', marque: '', modele: '', annee: String(ANNEE), capacite: '30', type: 'bus_scolaire', statut: 'actif', chauffeurNom: '', kmActuel: '0', dernierEntretien: new Date().toISOString().split('T')[0] });
  };

  const vStatutConfig = { actif: { label: 'Actif', cls: 'bg-green-100 text-green-800' }, en_panne: { label: 'En panne', cls: 'bg-red-100 text-red-800' }, revision: { label: 'En révision', cls: 'bg-amber-100 text-amber-800' }, retraite: { label: 'Retraité', cls: 'bg-gray-100 text-gray-600' } };

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Banknote className="h-7 w-7 text-primary" />
            Modules Comptabilité
          </h1>
          <p className="text-muted-foreground mt-1">Trésorerie · Paie · Budget · Logistique · Parc automobile</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="tresorerie" className="gap-1 text-xs"><Banknote className="h-3.5 w-3.5" />Trésorerie</TabsTrigger>
            <TabsTrigger value="paie" className="gap-1 text-xs"><Users className="h-3.5 w-3.5" />Gestion Paie</TabsTrigger>
            <TabsTrigger value="budget" className="gap-1 text-xs"><TrendingUp className="h-3.5 w-3.5" />Budget</TabsTrigger>
            <TabsTrigger value="logistique" className="gap-1 text-xs"><Package className="h-3.5 w-3.5" />Logistique</TabsTrigger>
            <TabsTrigger value="parc_auto" className="gap-1 text-xs"><Truck className="h-3.5 w-3.5" />Parc Auto</TabsTrigger>
            <TabsTrigger value="classes" className="gap-1 text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold border border-blue-200"><ClipboardList className="h-3.5 w-3.5 text-blue-600" />Listes de classe</TabsTrigger>
            <TabsTrigger value="sage" className="gap-1 text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200"><Landmark className="h-3.5 w-3.5 text-indigo-600" />Passerelle Sage & Saari</TabsTrigger>
          </TabsList>

          {/* ─── TRÉSORERIE ─────────────────────────────────────────────────────── */}
          <TabsContent value="tresorerie" className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <ArrowUpCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(lignesCaisse.reduce((s, l) => s + l.entree, 0))}</p>
                    <p className="text-xs text-muted-foreground">Total entrées</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                    <ArrowDownCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-destructive">{formatCurrency(lignesCaisse.reduce((s, l) => s + l.sortie, 0))}</p>
                    <p className="text-xs text-muted-foreground">Total sorties</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${soldeCourant >= 0 ? 'bg-primary/10' : 'bg-red-100'}`}>
                    <Banknote className={`h-5 w-5 ${soldeCourant >= 0 ? 'text-primary' : 'text-destructive'}`} />
                  </div>
                  <div>
                    <p className={`text-lg font-bold ${soldeCourant >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCurrency(soldeCourant)}</p>
                    <p className="text-xs text-muted-foreground">Solde courant</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm">Journal de caisse</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1" onClick={printEtatCaisse}><Printer className="h-4 w-4" />Imprimer</Button>
                <Button size="sm" className="gap-1" onClick={() => setOpenCaisse(true)}><Plus className="h-4 w-4" />Nouvelle opération</Button>
              </div>
            </div>

            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/80 border-b">
                    <tr>
                      <th className="text-left p-3 font-semibold">Date</th>
                      <th className="text-left p-3 font-semibold">Libellé</th>
                      <th className="text-left p-3 font-semibold">Source</th>
                      <th className="text-right p-3 font-semibold text-green-700">Entrée</th>
                      <th className="text-right p-3 font-semibold text-destructive">Sortie</th>
                      <th className="text-right p-3 font-semibold">Solde</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignesCaisse.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-muted-foreground italic">Aucune opération.</td></tr>
                    ) : lignesCaisse.map(l => (
                      <tr key={l.id} className="border-b hover:bg-muted/20">
                        <td className="p-3 text-xs text-muted-foreground">{l.date}</td>
                        <td className="p-3 font-medium">{l.libelle}</td>
                        <td className="p-3"><Badge variant="outline" className="text-[10px] capitalize">{l.source}</Badge></td>
                        <td className="p-3 text-right font-mono text-green-700">{l.entree > 0 ? formatCurrency(l.entree) : '—'}</td>
                        <td className="p-3 text-right font-mono text-destructive">{l.sortie > 0 ? formatCurrency(l.sortie) : '—'}</td>
                        <td className={`p-3 text-right font-bold font-mono ${l.solde >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCurrency(l.solde)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ─── GESTION PAIE ────────────────────────────────────────────────────── */}
          <TabsContent value="paie" className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card><CardContent className="p-4"><p className="text-xl font-bold">{fiches.length}</p><p className="text-xs text-muted-foreground">Fiches créées</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xl font-bold text-amber-600">{fiches.filter(f => f.statut === 'valide').length}</p><p className="text-xs text-muted-foreground">Validées</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xl font-bold text-green-600">{formatCurrency(fiches.filter(f => f.statut !== 'brouillon').reduce((s, f) => s + f.netAPayer, 0))}</p><p className="text-xs text-muted-foreground">Masse salariale</p></CardContent></Card>
            </div>

            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm">Fiches de paie — {ANNEE}</h3>
              <Button size="sm" className="gap-1" onClick={() => { setEditPaie(null); setOpenPaie(true); }}><Plus className="h-4 w-4" />Nouvelle fiche</Button>
            </div>

            {fiches.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground italic">Aucune fiche de paie.</CardContent></Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/80 border-b">
                      <tr>
                        <th className="text-left p-3">Agent</th>
                        <th className="text-left p-3">Poste</th>
                        <th className="text-left p-3">Mois</th>
                        <th className="text-right p-3">Base</th>
                        <th className="text-right p-3">Net à payer</th>
                        <th className="text-center p-3">Statut</th>
                        <th className="text-center p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fiches.map(f => (
                        <tr key={f.id} className="border-b hover:bg-muted/20">
                          <td className="p-3 font-medium">{f.agentNom}</td>
                          <td className="p-3 text-muted-foreground text-xs">{f.agentPoste}</td>
                          <td className="p-3 text-xs">{f.mois} {f.annee}</td>
                          <td className="p-3 text-right font-mono">{formatCurrency(f.salaireBase)}</td>
                          <td className="p-3 text-right font-bold font-mono text-primary">{formatCurrency(f.netAPayer)}</td>
                          <td className="p-3 text-center">
                            <Badge variant={f.statut === 'paye' ? 'default' : f.statut === 'valide' ? 'secondary' : 'outline'}>
                              {f.statut === 'brouillon' ? 'Brouillon' : f.statut === 'valide' ? 'Validé' : 'Payé'}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex gap-1 justify-center">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => printBulletin(f)}><Printer className="h-3.5 w-3.5" /></Button>
                              {f.statut !== 'paye' && (
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => validerFiche(f.id)}>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                                setEditPaie(f);
                                setFormPaie({ mois: f.mois, agentNom: f.agentNom, agentPoste: f.agentPoste, salaireBase: String(f.salaireBase), heuresSupp: String(f.heuresSupp), tauxHeure: String(f.tauxHeure), primes: String(f.primes), retenues: String(f.retenues) });
                                setOpenPaie(true);
                              }}><Edit className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setFiches(p => p.filter(x => x.id !== f.id)); toast({ title: 'Fiche supprimée.' }); }}>
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

          {/* ─── BUDGET ──────────────────────────────────────────────────────────── */}
          <TabsContent value="budget" className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card><CardContent className="p-4"><p className="text-xl font-bold">{formatCurrency(totalPrevu)}</p><p className="text-xs text-muted-foreground">Budget prévu</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xl font-bold text-green-600">{formatCurrency(totalRealise)}</p><p className="text-xs text-muted-foreground">Réalisé</p></CardContent></Card>
              <Card>
                <CardContent className="p-4">
                  <p className={`text-xl font-bold ${tauxExec >= 80 ? 'text-green-600' : tauxExec >= 50 ? 'text-amber-600' : 'text-destructive'}`}>{tauxExec}%</p>
                  <p className="text-xs text-muted-foreground">Taux d'exécution</p>
                  <div className="h-1.5 bg-muted rounded-full mt-1">
                    <div className={`h-full rounded-full ${tauxExec >= 80 ? 'bg-green-500' : tauxExec >= 50 ? 'bg-amber-500' : 'bg-destructive'}`} style={{ width: `${Math.min(tauxExec, 100)}%` }} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm">Budget {ANNEE} — Septembre à Juillet</h3>
              <Button size="sm" className="gap-1" onClick={() => setOpenBudget(true)}><Plus className="h-4 w-4" />Ajouter ligne</Button>
            </div>

            {lignesBudget.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground italic">Aucune ligne budgétaire.</CardContent></Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/80 border-b">
                      <tr>
                        <th className="text-left p-3">Catégorie</th>
                        <th className="text-left p-3">Libellé</th>
                        <th className="text-left p-3">Mois</th>
                        <th className="text-right p-3">Prévu</th>
                        <th className="text-right p-3">Réalisé</th>
                        <th className="text-right p-3">Écart</th>
                        <th className="text-center p-3">Exécution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lignesBudget.map(l => {
                        const ecart = l.montantRealise - l.montantPrevu;
                        const pct = l.montantPrevu > 0 ? Math.min(100, Math.round((l.montantRealise / l.montantPrevu) * 100)) : 0;
                        return (
                          <tr key={l.id} className="border-b hover:bg-muted/20">
                            <td className="p-3"><Badge variant="outline" className="text-[10px]">{l.categorie}</Badge></td>
                            <td className="p-3 font-medium">{l.libelle}</td>
                            <td className="p-3 text-xs text-muted-foreground">{MOIS_LABELS[l.mois]}</td>
                            <td className="p-3 text-right font-mono">{formatCurrency(l.montantPrevu)}</td>
                            <td className="p-3 text-right font-mono">{formatCurrency(l.montantRealise)}</td>
                            <td className={`p-3 text-right font-mono font-bold ${ecart >= 0 ? 'text-green-600' : 'text-destructive'}`}>{ecart >= 0 ? '+' : ''}{formatCurrency(ecart)}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-1">
                                <div className="flex-1 h-1.5 bg-muted rounded-full">
                                  <div className={`h-full rounded-full ${pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-destructive'}`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-[10px] font-mono w-8 text-right">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ─── LOGISTIQUE ──────────────────────────────────────────────────────── */}
          <TabsContent value="logistique" className="mt-4 space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {(['bon','moyen','mauvais','hors_service'] as const).map(e => (
                <Card key={e}>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold">{biens.filter(b => b.etat === e).length}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${etatConfig[e].cls}`}>{etatConfig[e].label}</span>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm">{biens.length} bien(s) enregistré(s) — Valeur : {formatCurrency(biens.reduce((s, b) => s + (b.valeur * b.quantite), 0))}</h3>
              <Button size="sm" className="gap-1" onClick={() => { setEditBien(null); setOpenBien(true); }}><Plus className="h-4 w-4" />Enregistrer un bien</Button>
            </div>

            {biens.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground italic">Aucun bien enregistré.</CardContent></Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/80 border-b">
                      <tr>
                        <th className="text-left p-3">Désignation</th>
                        <th className="text-left p-3">Catégorie</th>
                        <th className="text-center p-3">Qté</th>
                        <th className="text-right p-3">Valeur unitaire</th>
                        <th className="text-left p-3">Localisation</th>
                        <th className="text-center p-3">État</th>
                        <th className="text-center p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {biens.map(b => (
                        <tr key={b.id} className="border-b hover:bg-muted/20">
                          <td className="p-3 font-medium">{b.designation}</td>
                          <td className="p-3 text-xs capitalize text-muted-foreground">{b.categorie}</td>
                          <td className="p-3 text-center font-bold">{b.quantite}</td>
                          <td className="p-3 text-right font-mono">{formatCurrency(b.valeur)}</td>
                          <td className="p-3 text-xs text-muted-foreground">{b.localisation || '—'}</td>
                          <td className="p-3 text-center">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${etatConfig[b.etat].cls}`}>{etatConfig[b.etat].label}</span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex gap-1 justify-center">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                                setEditBien(b);
                                setFormBien({ designation: b.designation, categorie: b.categorie, quantite: String(b.quantite), etat: b.etat, dateAcquisition: b.dateAcquisition, valeur: String(b.valeur), localisation: b.localisation });
                                setOpenBien(true);
                              }}><Edit className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setBiens(p => p.filter(x => x.id !== b.id)); toast({ title: 'Bien supprimé.' }); }}>
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

          {/* ─── PARC AUTO ───────────────────────────────────────────────────────── */}
          <TabsContent value="parc_auto" className="mt-4 space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {(['actif','revision','en_panne','retraite'] as const).map(s => (
                <Card key={s}>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold">{vehicules.filter(v => v.statut === s).length}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${vStatutConfig[s].cls}`}>{vStatutConfig[s].label}</span>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm">{vehicules.length} véhicule(s) — Capacité totale : {vehicules.filter(v => v.statut === 'actif').reduce((s, v) => s + v.capacite, 0)} places</h3>
              <Button size="sm" className="gap-1" onClick={() => { setEditVehicule(null); setOpenVehicule(true); }}><Plus className="h-4 w-4" />Ajouter un véhicule</Button>
            </div>

            {vehicules.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground italic">Aucun véhicule enregistré.</CardContent></Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {vehicules.map(v => (
                  <Card key={v.id} className={`border-l-4 ${v.statut === 'actif' ? 'border-l-green-500' : v.statut === 'en_panne' ? 'border-l-destructive' : v.statut === 'revision' ? 'border-l-amber-500' : 'border-l-border'}`}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold flex items-center gap-1"><Car className="h-4 w-4 text-primary" />{v.immatriculation}</p>
                          <p className="text-xs text-muted-foreground">{v.marque} {v.modele} ({v.annee})</p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${vStatutConfig[v.statut].cls}`}>{vStatutConfig[v.statut].label}</span>
                      </div>
                      <div className="text-xs space-y-0.5 text-muted-foreground">
                        <p>🚌 {v.type.replace('_', ' ')} — {v.capacite} places</p>
                        {v.chauffeurNom && <p>👤 Chauffeur : {v.chauffeurNom}</p>}
                        <p>📍 Kilométrage : {v.kmActuel.toLocaleString('fr-FR')} km</p>
                        <p>🔧 Dernier entretien : {v.dernierEntretien}</p>
                      </div>
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                          setEditVehicule(v);
                          setFormVehicule({ immatriculation: v.immatriculation, marque: v.marque, modele: v.modele, annee: String(v.annee), capacite: String(v.capacite), type: v.type, statut: v.statut, chauffeurNom: v.chauffeurNom, kmActuel: String(v.kmActuel), dernierEntretien: v.dernierEntretien });
                          setOpenVehicule(true);
                        }}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setVehicules(p => p.filter(x => x.id !== v.id)); toast({ title: 'Véhicule supprimé.' }); }}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* =================================================================== */}
          {/* PASSERELLE ET EXPORTATION COMPTABLE SAGE 100 & SAARI (SYSCOHADA) */}
          {/* =================================================================== */}
          <TabsContent value="sage" className="mt-4 space-y-6">
            {/* CARD 1: BANNER & SYSTEM SUMMARY */}
            <Card className="border-indigo-200 dark:border-indigo-900 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white shadow-xl">
              <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-indigo-500/30 text-indigo-200 border-indigo-400/40 text-xs px-2.5 py-0.5">
                      Norme SYSCOHADA (OHADA)
                    </Badge>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs px-2.5 py-0.5">
                      Intégration Sage 100 & Saari
                    </Badge>
                  </div>
                  <h3 className="text-xl font-black flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-indigo-400" /> Passerelle d'Exportation Comptable Sage
                  </h3>
                  <p className="text-xs text-slate-300 max-w-2xl">
                    Générez les fichiers d'écritures comptables au format natif Sage (.PNM / .CSV / .TXT). Importation directe dans Sage 100 via <strong>Fichier &gt; Importer &gt; Format Paramétrable</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-slate-800/80 p-3 rounded-xl border border-indigo-700/50">
                  <div className="text-right text-xs">
                    <p className="text-slate-400 font-semibold">Total Écritures Générées</p>
                    <p className="text-lg font-black text-indigo-300">{sageEntries.length} lignes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CARD 2: CONFIGURATION DES COMPTES SYSCOHADA */}
            <Card className="shadow-md">
              <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-900/50">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                  <FileSpreadsheet className="w-4 h-4" /> Configuration du Plan Comptable SYSCOHADA (Sage)
                </CardTitle>
                <CardDescription className="text-xs">
                  Associez les comptes généraux du plan comptable SYSCOHADA révisé pour vos écritures Sage.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                <div>
                  <Label className="text-[11px] font-semibold text-slate-600">Client Élève (411)</Label>
                  <Input
                    value={sageConfig.compteClientScolarite}
                    onChange={(e) => setSageConfig({ ...sageConfig, compteClientScolarite: e.target.value })}
                    className="h-8 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-600">Ventes Scolarité (706)</Label>
                  <Input
                    value={sageConfig.compteProduitScolarite}
                    onChange={(e) => setSageConfig({ ...sageConfig, compteProduitScolarite: e.target.value })}
                    className="h-8 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-600">Ventes Cantine (7071)</Label>
                  <Input
                    value={sageConfig.compteProduitCantine}
                    onChange={(e) => setSageConfig({ ...sageConfig, compteProduitCantine: e.target.value })}
                    className="h-8 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-600">Ventes Transport (7072)</Label>
                  <Input
                    value={sageConfig.compteProduitTransport}
                    onChange={(e) => setSageConfig({ ...sageConfig, compteProduitTransport: e.target.value })}
                    className="h-8 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-600">Caisse Espèces (571)</Label>
                  <Input
                    value={sageConfig.compteCaisse}
                    onChange={(e) => setSageConfig({ ...sageConfig, compteCaisse: e.target.value })}
                    className="h-8 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-600">Banque / Virement (512)</Label>
                  <Input
                    value={sageConfig.compteBanque}
                    onChange={(e) => setSageConfig({ ...sageConfig, compteBanque: e.target.value })}
                    className="h-8 text-xs font-mono font-bold"
                  />
                </div>
              </CardContent>
            </Card>

            {/* CARD 3: PERIODE ET EXPORTATIONS */}
            <Card className="shadow-md">
              <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                      <Calendar className="w-4 h-4 text-indigo-600" /> Sélection de la Période & Téléchargement
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Exportez les écritures de ventes et de trésorerie équilibrées au format Sage.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs">
                      <span className="text-slate-500 block text-[10px]">Équilibre Comptable</span>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold text-xs">
                        Débit = Crédit ({totalSageDebit.toLocaleString()} F)
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="flex flex-wrap items-end gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border">
                  <div>
                    <Label className="text-xs font-semibold">Date de début</Label>
                    <Input type="date" value={sageDateStart} onChange={(e) => setSageDateStart(e.target.value)} className="h-9 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Date de fin</Label>
                    <Input type="date" value={sageDateEnd} onChange={(e) => setSageDateEnd(e.target.value)} className="h-9 text-xs" />
                  </div>

                  <div className="flex items-center gap-2 ml-auto pt-2">
                    <Button
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold gap-2 text-xs"
                      onClick={() => handleDownloadSage('pnm')}
                    >
                      <Download className="w-4 h-4" /> Exporter Sage 100 (.PNM)
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 text-xs"
                      onClick={() => handleDownloadSage('csv')}
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Exporter Sage Saari (.CSV)
                    </Button>
                    <Button
                      variant="outline"
                      className="font-bold gap-2 text-xs"
                      onClick={() => handleDownloadSage('txt')}
                    >
                      <FileText className="w-4 h-4" /> Exporter (.TXT)
                    </Button>
                  </div>
                </div>

                {/* PREVIEW TABLE */}
                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b">
                      <tr>
                        <th className="p-2.5">Journal</th>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Compte Général</th>
                        <th className="p-2.5">Compte Tiers</th>
                        <th className="p-2.5">N° Pièce</th>
                        <th className="p-2.5">Libellé de l'Écriture</th>
                        <th className="p-2.5 text-right">Débit (F CFA)</th>
                        <th className="p-2.5 text-right">Crédit (F CFA)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-mono">
                      {sageEntries.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-500 font-sans italic">
                            Aucune écriture comptable générée sur cette période.
                          </td>
                        </tr>
                      ) : (
                        sageEntries.slice(0, 100).map((e, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                            <td className="p-2.5 font-bold text-indigo-600">{e.journalCode}</td>
                            <td className="p-2.5">{e.date}</td>
                            <td className="p-2.5 font-bold">{e.compteGeneral}</td>
                            <td className="p-2.5 text-slate-600">{e.compteTiers || "—"}</td>
                            <td className="p-2.5">{e.numeroPiece}</td>
                            <td className="p-2.5 font-sans font-medium text-slate-900 dark:text-white">{e.libelle}</td>
                            <td className="p-2.5 text-right font-bold text-emerald-600">
                              {e.debit > 0 ? e.debit.toLocaleString() : "0"}
                            </td>
                            <td className="p-2.5 text-right font-bold text-amber-600">
                              {e.credit > 0 ? e.credit.toLocaleString() : "0"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-slate-100 dark:bg-slate-900 font-extrabold border-t">
                      <tr>
                        <td colSpan={6} className="p-3 text-right uppercase">Totaux des Écritures Sage :</td>
                        <td className="p-3 text-right text-emerald-600 font-mono">{totalSageDebit.toLocaleString()} F</td>
                        <td className="p-3 text-right text-amber-600 font-mono">{totalSageCredit.toLocaleString()} F CFA</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* CARD 4: IMPORTATION DES FICHIERS SAGE / SAARI */}
            <Card className="shadow-md border-emerald-200 dark:border-emerald-900">
              <CardHeader className="pb-3 border-b bg-emerald-50/40 dark:bg-emerald-950/20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                      <Upload className="w-4 h-4 text-emerald-600" /> Importer des Écritures Sage / Saari vers l'Application
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Chargez un fichier d'écritures ou d'encaissements (.PNM, .CSV, .TXT) exporté depuis Sage ou Saari pour enregistrer automatiquement les règlements dans la base de données.
                    </CardDescription>
                  </div>

                  {importedSageEntries.length > 0 && (
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 text-xs shadow-md"
                      onClick={handleSaveImportedSage}
                      disabled={importingSage}
                    >
                      <Check className="w-4 h-4" /> Valider & Synchroniser ({importedSageEntries.length} écritures)
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 text-center space-y-3">
                  <div className="flex justify-center">
                    <FileSpreadsheet className="w-10 h-10 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      Sélectionnez votre fichier Sage 100 ou Saari (.PNM / .CSV / .TXT)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Les règlements seront automatiquement appariés avec les élèves via le Matricule ou le Nom.
                    </p>
                  </div>
                  <Input
                    type="file"
                    accept=".pnm,.csv,.txt"
                    onChange={handleFileUploadSage}
                    className="max-w-md mx-auto h-9 text-xs cursor-pointer bg-white dark:bg-slate-950"
                  />
                </div>

                {importedSageEntries.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <p className="font-bold text-emerald-800 dark:text-emerald-300">
                        Prévisualisation des Écritures Extraites ({importedSageEntries.length})
                      </p>
                      <Button variant="ghost" size="sm" className="text-xs text-slate-500" onClick={() => setImportedSageEntries([])}>
                        Annuler l'import
                      </Button>
                    </div>

                    <div className="overflow-x-auto border rounded-xl max-h-60 overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b sticky top-0">
                          <tr>
                            <th className="p-2">Journal</th>
                            <th className="p-2">Date</th>
                            <th className="p-2">N° Pièce</th>
                            <th className="p-2">Compte Tiers (Matricule)</th>
                            <th className="p-2">Élève Apparié</th>
                            <th className="p-2">Libellé</th>
                            <th className="p-2 text-right">Montant (F CFA)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y font-mono">
                          {importedSageEntries.map((e, idx) => {
                            const eleve = students.find(
                              (s) =>
                                (s.matricule && e.compteTiers && s.matricule.toLowerCase() === e.compteTiers.toLowerCase()) ||
                                `${s.lastName || s.nom || ''} ${s.firstName || s.prenom || ''}`.toLowerCase().includes((e.libelle || '').toLowerCase())
                            );
                            const amount = e.debit > 0 ? e.debit : e.credit;

                            return (
                              <tr key={idx} className="hover:bg-emerald-50/50 transition-colors">
                                <td className="p-2 font-bold text-indigo-600">{e.journalCode}</td>
                                <td className="p-2">{e.date}</td>
                                <td className="p-2">{e.numeroPiece}</td>
                                <td className="p-2 font-bold">{e.compteTiers || "—"}</td>
                                <td className="p-2 font-sans font-semibold">
                                  {eleve ? (
                                    <Badge className="bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                      {eleve.lastName || eleve.nom} {eleve.firstName || eleve.prenom}
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-slate-100 text-slate-600 font-normal text-[10px]">Non spécifié</Badge>
                                  )}
                                </td>
                                <td className="p-2 font-sans text-slate-900 dark:text-white">{e.libelle}</td>
                                <td className="p-2 text-right font-bold text-emerald-600">{amount.toLocaleString()} F</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── LISTES DE CLASSE & EFFECTIFS PAR NIVEAU ───────────────────────────── */}
          <TabsContent value="classes" className="mt-4 space-y-4">
            {/* Header / Action Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl shadow-md">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500/30 text-blue-100 border-blue-400/40 text-xs">
                    Maternelle · Primaire · Collège · Lycée
                  </Badge>
                  <Badge className="bg-emerald-500/30 text-emerald-100 border-emerald-400/40 text-xs">
                    Module Comptabilité
                  </Badge>
                </div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-blue-300" />
                  Listes de classe & Répartition des effectifs
                </h3>
                <p className="text-xs text-blue-200 max-w-2xl">
                  Accès direct aux listes officielles d'élèves pour tous les niveaux. Effectuez vos vérifications de scolarité, impressions A4 et exports Excel.
                </p>
              </div>
              <Button
                onClick={() => navigate(ROUTE_PATHS.CLASS_LISTS)}
                className="bg-white text-blue-900 hover:bg-blue-50 font-bold shadow-md gap-1.5 shrink-0"
              >
                <ExternalLink className="h-4 w-4" />
                Ouvrir le module complet
              </Button>
            </div>

            {/* Cycle KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Maternelle */}
              <Card
                className={`cursor-pointer transition-all hover:shadow-md border-2 ${selectedClassCycle === 'maternelle' ? "border-amber-500 bg-amber-50/30 dark:bg-amber-950/20" : ""}`}
                onClick={() => setSelectedClassCycle(selectedClassCycle === 'maternelle' ? 'all' : 'maternelle')}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center shrink-0">
                    <GraduationCap className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Maternelle (PS, MS, GS)</p>
                    <p className="text-lg font-bold text-amber-600">
                      {classes.filter((c: any) => String(c.cycle || c.CY_LIBELLECYCLE || '').toLowerCase().includes('mat') || c.cycle_id === 1).length} classes
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {classes.filter((c: any) => String(c.cycle || c.CY_LIBELLECYCLE || '').toLowerCase().includes('mat') || c.cycle_id === 1).reduce((s: number, c: any) => s + (c.studentCount || c.CE_EFFECTIF || 0), 0)} élèves inscrits
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Primaire */}
              <Card
                className={`cursor-pointer transition-all hover:shadow-md border-2 ${selectedClassCycle === 'primaire' ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20" : ""}`}
                onClick={() => setSelectedClassCycle(selectedClassCycle === 'primaire' ? 'all' : 'primaire')}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center shrink-0">
                    <BookMarked className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Primaire (CP1 à CM2)</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {classes.filter((c: any) => String(c.cycle || c.CY_LIBELLECYCLE || '').toLowerCase().includes('prim') || c.cycle_id === 2).length} classes
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {classes.filter((c: any) => String(c.cycle || c.CY_LIBELLECYCLE || '').toLowerCase().includes('prim') || c.cycle_id === 2).reduce((s: number, c: any) => s + (c.studentCount || c.CE_EFFECTIF || 0), 0)} élèves inscrits
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Collège */}
              <Card
                className={`cursor-pointer transition-all hover:shadow-md border-2 ${selectedClassCycle === 'college' ? "border-blue-500 bg-blue-50/30 dark:bg-blue-950/20" : ""}`}
                onClick={() => setSelectedClassCycle(selectedClassCycle === 'college' ? 'all' : 'college')}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center shrink-0">
                    <School className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Collège (6ème à 3ème)</p>
                    <p className="text-lg font-bold text-blue-600">
                      {classes.filter((c: any) => String(c.cycle || c.CY_LIBELLECYCLE || '').toLowerCase().includes('coll') || c.cycle_id === 3).length} classes
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {classes.filter((c: any) => String(c.cycle || c.CY_LIBELLECYCLE || '').toLowerCase().includes('coll') || c.cycle_id === 3).reduce((s: number, c: any) => s + (c.studentCount || c.CE_EFFECTIF || 0), 0)} élèves inscrits
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Lycée */}
              <Card
                className={`cursor-pointer transition-all hover:shadow-md border-2 ${selectedClassCycle === 'lycee' ? "border-purple-500 bg-purple-50/30 dark:bg-purple-950/20" : ""}`}
                onClick={() => setSelectedClassCycle(selectedClassCycle === 'lycee' ? 'all' : 'lycee')}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center shrink-0">
                    <Award className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Lycée (2nde à Tle)</p>
                    <p className="text-lg font-bold text-purple-600">
                      {classes.filter((c: any) => String(c.cycle || c.CY_LIBELLECYCLE || '').toLowerCase().includes('lyc') || c.cycle_id === 4).length} classes
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {classes.filter((c: any) => String(c.cycle || c.CY_LIBELLECYCLE || '').toLowerCase().includes('lyc') || c.cycle_id === 4).reduce((s: number, c: any) => s + (c.studentCount || c.CE_EFFECTIF || 0), 0)} élèves inscrits
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Class List Card */}
            <Card>
              <CardHeader className="pb-3 border-b flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold">Effectifs par classe et cycle</CardTitle>
                  <CardDescription className="text-xs">
                    Vue synthétique pour le contrôle comptable et la réconciliation des inscriptions
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-48 sm:w-64">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher une classe..."
                      value={searchClassQuery}
                      onChange={(e) => setSearchClassQuery(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <Button
                      size="sm"
                      variant={selectedClassCycle === 'all' ? 'default' : 'ghost'}
                      className="h-7 px-2.5 text-xs font-medium"
                      onClick={() => setSelectedClassCycle('all')}
                    >
                      Tous
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedClassCycle === 'maternelle' ? 'default' : 'ghost'}
                      className="h-7 px-2.5 text-xs font-medium"
                      onClick={() => setSelectedClassCycle('maternelle')}
                    >
                      Maternelle
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedClassCycle === 'primaire' ? 'default' : 'ghost'}
                      className="h-7 px-2.5 text-xs font-medium"
                      onClick={() => setSelectedClassCycle('primaire')}
                    >
                      Primaire
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedClassCycle === 'college' ? 'default' : 'ghost'}
                      className="h-7 px-2.5 text-xs font-medium"
                      onClick={() => setSelectedClassCycle('college')}
                    >
                      Collège
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedClassCycle === 'lycee' ? 'default' : 'ghost'}
                      className="h-7 px-2.5 text-xs font-medium"
                      onClick={() => setSelectedClassCycle('lycee')}
                    >
                      Lycée
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold uppercase border-b">
                      <tr>
                        <th className="p-3">Classe</th>
                        <th className="p-3">Cycle & Niveau</th>
                        <th className="p-3 text-center">Effectif</th>
                        <th className="p-3 text-center">Capacité</th>
                        <th className="p-3">Taux de remplissage</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {classes
                        .filter((c: any) => {
                          const name = String(c.nom || c.CE_LIBELLE || c.name || '').toLowerCase();
                          const cyc = String(c.cycle || c.CY_LIBELLECYCLE || '').toLowerCase();
                          const cycleId = Number(c.cycle_id || 0);
                          const matchesQuery = !searchClassQuery || name.includes(searchClassQuery.toLowerCase()) || cyc.includes(searchClassQuery.toLowerCase());
                          if (!matchesQuery) return false;

                          if (selectedClassCycle === 'maternelle') return cycleId === 1 || cyc.includes('mat');
                          if (selectedClassCycle === 'primaire') return cycleId === 2 || cyc.includes('prim');
                          if (selectedClassCycle === 'college') return cycleId === 3 || cyc.includes('coll');
                          if (selectedClassCycle === 'lycee') return cycleId === 4 || cyc.includes('lyc');
                          return true;
                        })
                        .map((cls: any) => {
                          const effectif = cls.studentCount || cls.CE_EFFECTIF || 0;
                          const cap = cls.capacite || cls.CE_MAXELEVES || 40;
                          const pct = Math.min(100, Math.round((effectif / (cap || 1)) * 100));
                          const cycText = String(cls.cycle || cls.CY_LIBELLECYCLE || '').toLowerCase();
                          const isMat = cls.cycle_id === 1 || cycText.includes('mat');
                          const isPrim = cls.cycle_id === 2 || cycText.includes('prim');
                          const isColl = cls.cycle_id === 3 || cycText.includes('coll');

                          return (
                            <tr key={cls.id || cls.IDCLASSE} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                              <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className={`h-2.5 w-2.5 rounded-full ${isMat ? 'bg-amber-500' : isPrim ? 'bg-emerald-500' : isColl ? 'bg-blue-500' : 'bg-purple-500'}`} />
                                {cls.nom || cls.CE_LIBELLE || cls.name}
                              </td>
                              <td className="p-3">
                                <Badge variant="outline" className={`text-[10px] font-semibold uppercase ${isMat ? 'border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-950/40' : isPrim ? 'border-emerald-400 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40' : isColl ? 'border-blue-400 text-blue-700 bg-blue-50 dark:bg-blue-950/40' : 'border-purple-400 text-purple-700 bg-purple-50 dark:bg-purple-950/40'}`}>
                                  {cls.cycle || cls.CY_LIBELLECYCLE || 'Général'} · {cls.niveau || cls.CE_LIBELLENIVEAU || cls.code || 'Standard'}
                                </Badge>
                              </td>
                              <td className="p-3 text-center font-bold font-mono text-sm">
                                {effectif}
                              </td>
                              <td className="p-3 text-center text-muted-foreground font-mono">
                                {cap}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2 max-w-xs">
                                  <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="text-[11px] font-mono text-muted-foreground w-9 text-right">{pct}%</span>
                                </div>
                              </td>
                              <td className="p-3 text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs font-semibold gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/60"
                                  onClick={() => navigate(`${ROUTE_PATHS.CLASS_LISTS}?classId=${cls.id || cls.IDCLASSE}`)}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Consulter la liste
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      {classes.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground italic">
                            Aucune classe enregistrée ou chargement en cours...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ── Dialog Opération caisse ─────────────────────────────────────────────── */}
      <Dialog open={openCaisse} onOpenChange={setOpenCaisse}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Nouvelle opération de caisse</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Date</Label><Input type="date" value={formCaisse.date} onChange={e => setFormCaisse(p => ({ ...p, date: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Source</Label>
                <Select value={formCaisse.source} onValueChange={v => setFormCaisse(p => ({ ...p, source: v as LigneCaisse['source'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scolarite">Scolarité</SelectItem>
                    <SelectItem value="fondation">Fondation Hinneh</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>Libellé *</Label><Input placeholder="Description de l'opération..." value={formCaisse.libelle} onChange={e => setFormCaisse(p => ({ ...p, libelle: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-green-700">Entrée (FCFA)</Label><Input type="number" min={0} value={formCaisse.entree} onChange={e => setFormCaisse(p => ({ ...p, entree: e.target.value }))} /></div>
              <div className="space-y-1"><Label className="text-destructive">Sortie (FCFA)</Label><Input type="number" min={0} value={formCaisse.sortie} onChange={e => setFormCaisse(p => ({ ...p, sortie: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCaisse(false)}>Annuler</Button>
            <Button onClick={addLigneCaisse}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Fiche paie ────────────────────────────────────────────────────── */}
      <Dialog open={openPaie} onOpenChange={v => { setOpenPaie(v); if (!v) setEditPaie(null); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{editPaie ? 'Modifier la fiche' : 'Nouvelle fiche de paie'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2 max-h-[60vh] overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Mois</Label>
                <Select value={formPaie.mois} onValueChange={v => setFormPaie(p => ({ ...p, mois: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MOIS_LABELS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Salaire de base *</Label><Input type="number" value={formPaie.salaireBase} onChange={e => setFormPaie(p => ({ ...p, salaireBase: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Nom de l'agent *</Label><Input value={formPaie.agentNom} onChange={e => setFormPaie(p => ({ ...p, agentNom: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Poste</Label><Input value={formPaie.agentPoste} onChange={e => setFormPaie(p => ({ ...p, agentPoste: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>H. supp.</Label><Input type="number" min={0} value={formPaie.heuresSupp} onChange={e => setFormPaie(p => ({ ...p, heuresSupp: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Taux/h</Label><Input type="number" min={0} value={formPaie.tauxHeure} onChange={e => setFormPaie(p => ({ ...p, tauxHeure: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Primes</Label><Input type="number" min={0} value={formPaie.primes} onChange={e => setFormPaie(p => ({ ...p, primes: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>Retenues</Label><Input type="number" min={0} value={formPaie.retenues} onChange={e => setFormPaie(p => ({ ...p, retenues: e.target.value }))} /></div>
            <div className="p-3 bg-primary/5 border border-primary/20 rounded flex justify-between items-center">
              <span className="font-semibold text-sm">NET À PAYER</span>
              <span className="text-xl font-bold text-primary font-mono">{formatCurrency(netPaie)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenPaie(false)}>Annuler</Button>
            <Button onClick={saveFiche}>{editPaie ? 'Mettre à jour' : 'Créer la fiche'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Budget ─────────────────────────────────────────────────────────── */}
      <Dialog open={openBudget} onOpenChange={setOpenBudget}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader><DialogTitle>Ajouter une ligne budgétaire</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Catégorie</Label>
                <Select value={formBudget.categorie} onValueChange={v => setFormBudget(p => ({ ...p, categorie: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES_BUDGET.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Mois</Label>
                <Select value={formBudget.mois} onValueChange={v => setFormBudget(p => ({ ...p, mois: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MOIS_LABELS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>Libellé *</Label><Input value={formBudget.libelle} onChange={e => setFormBudget(p => ({ ...p, libelle: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Montant prévu *</Label><Input type="number" value={formBudget.montantPrevu} onChange={e => setFormBudget(p => ({ ...p, montantPrevu: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Montant réalisé</Label><Input type="number" value={formBudget.montantRealise} onChange={e => setFormBudget(p => ({ ...p, montantRealise: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenBudget(false)}>Annuler</Button>
            <Button onClick={saveBudget}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Bien logistique ────────────────────────────────────────────────── */}
      <Dialog open={openBien} onOpenChange={v => { setOpenBien(v); if (!v) setEditBien(null); }}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader><DialogTitle>{editBien ? 'Modifier le bien' : 'Enregistrer un bien'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1"><Label>Désignation *</Label><Input value={formBien.designation} onChange={e => setFormBien(p => ({ ...p, designation: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Catégorie</Label>
                <Select value={formBien.categorie} onValueChange={v => setFormBien(p => ({ ...p, categorie: v as BienLogistique['categorie'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobilier">Mobilier</SelectItem>
                    <SelectItem value="informatique">Informatique</SelectItem>
                    <SelectItem value="vehicule">Véhicule</SelectItem>
                    <SelectItem value="materiel">Matériel</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>État</Label>
                <Select value={formBien.etat} onValueChange={v => setFormBien(p => ({ ...p, etat: v as BienLogistique['etat'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bon">Bon état</SelectItem>
                    <SelectItem value="moyen">Moyen</SelectItem>
                    <SelectItem value="mauvais">Mauvais</SelectItem>
                    <SelectItem value="hors_service">Hors service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>Quantité</Label><Input type="number" min={1} value={formBien.quantite} onChange={e => setFormBien(p => ({ ...p, quantite: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Valeur unitaire</Label><Input type="number" min={0} value={formBien.valeur} onChange={e => setFormBien(p => ({ ...p, valeur: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Date acquisition</Label><Input type="date" value={formBien.dateAcquisition} onChange={e => setFormBien(p => ({ ...p, dateAcquisition: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>Localisation</Label><Input placeholder="Salle, bureau, bâtiment..." value={formBien.localisation} onChange={e => setFormBien(p => ({ ...p, localisation: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenBien(false)}>Annuler</Button>
            <Button onClick={saveBien}>{editBien ? 'Mettre à jour' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Véhicule ───────────────────────────────────────────────────────── */}
      <Dialog open={openVehicule} onOpenChange={v => { setOpenVehicule(v); if (!v) setEditVehicule(null); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{editVehicule ? 'Modifier le véhicule' : 'Ajouter un véhicule'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2 max-h-[60vh] overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Immatriculation *</Label><Input placeholder="ex: CI-1234-AB" value={formVehicule.immatriculation} onChange={e => setFormVehicule(p => ({ ...p, immatriculation: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Type</Label>
                <Select value={formVehicule.type} onValueChange={v => setFormVehicule(p => ({ ...p, type: v as Vehicule['type'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bus_scolaire">Bus scolaire</SelectItem>
                    <SelectItem value="minibus">Minibus</SelectItem>
                    <SelectItem value="voiture">Voiture</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>Marque *</Label><Input value={formVehicule.marque} onChange={e => setFormVehicule(p => ({ ...p, marque: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Modèle</Label><Input value={formVehicule.modele} onChange={e => setFormVehicule(p => ({ ...p, modele: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Année</Label><Input type="number" value={formVehicule.annee} onChange={e => setFormVehicule(p => ({ ...p, annee: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Capacité (places)</Label><Input type="number" min={1} value={formVehicule.capacite} onChange={e => setFormVehicule(p => ({ ...p, capacite: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Statut</Label>
                <Select value={formVehicule.statut} onValueChange={v => setFormVehicule(p => ({ ...p, statut: v as Vehicule['statut'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="revision">En révision</SelectItem>
                    <SelectItem value="en_panne">En panne</SelectItem>
                    <SelectItem value="retraite">Retraité</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Chauffeur affecté</Label><Input placeholder="Nom du chauffeur" value={formVehicule.chauffeurNom} onChange={e => setFormVehicule(p => ({ ...p, chauffeurNom: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Kilométrage actuel</Label><Input type="number" min={0} value={formVehicule.kmActuel} onChange={e => setFormVehicule(p => ({ ...p, kmActuel: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>Date dernier entretien</Label><Input type="date" value={formVehicule.dernierEntretien} onChange={e => setFormVehicule(p => ({ ...p, dernierEntretien: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenVehicule(false)}>Annuler</Button>
            <Button onClick={saveVehicule}>{editVehicule ? 'Mettre à jour' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
