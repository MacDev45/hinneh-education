import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  UserCog, Plus, Edit, Trash2, Search, FileText, DollarSign, Users, 
  CheckCircle2, BadgeCheck, Eye, Printer, CreditCard, UserCheck, 
  ShieldAlert, Clock, Building2, Phone, Mail, FileCheck, Calendar, 
  MapPin, User, GraduationCap, Check, X, AlertCircle
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/apiClient';
import type { Staff } from '@/lib/index';
import { formatStudentName } from '@/lib/index';
import { printCarteProfessionnelle, printPlancheCartesProfessionnelles, resolveStaffService } from '@/lib/certificatePrinter';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FichePaie {
  id: string;
  staffId: string;
  mois: string;
  salaireBase: number;
  primes: number;
  retenues: number;
  net: number;
  statut: 'brouillon' | 'valide' | 'paye';
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const FONCTIONS = ['enseignant', 'educateur', 'admin', 'direction', 'comptable', 'rh', 'scolarite', 'accueil', 'surveillance', 'coranique', 'service'];
const MOIS_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(); d.setMonth(d.getMonth() - i);
  return d.toISOString().slice(0, 7);
});
const FORM_STAFF_INIT = { firstName: '', lastName: '', email: '', phone: '', fonction: 'enseignant', status: 'actif', chargeHoraire: '18' };
const FORM_PAIE_INIT = { staffId: '', mois: MOIS_OPTIONS[0], salaireBase: '', primes: '0', retenues: '0' };

const statutColor = (s: string) => {
  if (s === 'actif') return 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300';
  if (s === 'conge') return 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300';
  if (s === 'absent') return 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300';
  return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 font-semibold';
};

export const getRoleBadge = (fonction: string) => {
  const f = (fonction || '').toLowerCase().trim();
  if (f.includes('enseignant')) return { label: 'Enseignant', color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200' };
  if (f.includes('educateur')) return { label: 'Éducateur', color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200' };
  if (f.includes('direction') || f.includes('directeur')) return { label: 'Directeur d\'école', color: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-200' };
  if (f.includes('comptable') || f.includes('finance')) return { label: 'Comptable / Finance', color: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200' };
  if (f.includes('rh')) return { label: 'Ressources Humaines', color: 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-950/60 dark:text-pink-200' };
  if (f.includes('scolarite')) return { label: 'Scolarité', color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200' };
  if (f.includes('surveillance')) return { label: 'Surveillant', color: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-200' };
  if (f.includes('accueil') || f.includes('secretaire')) return { label: 'Accueil / Secrétariat', color: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-200' };
  if (f.includes('coranique')) return { label: 'Études Coraniques', color: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-200' };
  return { label: (fonction || 'Personnel').toUpperCase(), color: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200' };
};

// ─── Composant ───────────────────────────────────────────────────────────────

export default function RHSpace() {
  const { toast } = useToast();

  const [staff, setStaff] = useState<Staff[]>([]);
  const [fiches, setFiches] = useState<FichePaie[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedEcoles, setSelectedEcoles] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterFonction, setFilterFonction] = useState('all');
  const [filterMois, setFilterMois] = useState(MOIS_OPTIONS[0]);

  const [openStaff, setOpenStaff] = useState(false);
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [formStaff, setFormStaff] = useState({ ...FORM_STAFF_INIT });
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('all');
  const [selectedPendingStaff, setSelectedPendingStaff] = useState<any | null>(null);
  const [validatingId, setValidatingId] = useState<string | number | null>(null);

  const [openPaie, setOpenPaie] = useState(false);
  const [editFiche, setEditFiche] = useState<FichePaie | null>(null);
  const [formPaie, setFormPaie] = useState({ ...FORM_PAIE_INIT });

  const [previewFiche, setPreviewFiche] = useState<FichePaie | null>(null);

  // ─── Chargement ────────────────────────────────────────────────────────────

  const loadStaff = async () => {
    setLoading(true);
    try {
      const [staffData, schoolData] = await Promise.all([
        apiClient.getStaff(),
        apiClient.getAllSchools()
      ]);
      setStaff(staffData || []);
      setSchools(schoolData || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadStaff(); }, []);

  const pendingStaff = useMemo(() => {
    return staff.filter(s => s.status === 'en_attente' || (s as any).statut === 'en_attente');
  }, [staff]);

  const handleValiderStaff = async (id: string | number, name: string) => {
    setValidatingId(id);
    try {
      await apiClient.validerStaff(id);
      toast({
        title: "Dossier validé avec succès !",
        description: `Le compte de ${name} a été activé. L'accès au portail lui est désormais ouvert.`,
      });
      await loadStaff();
      if (selectedPendingStaff?.id === id) {
        setSelectedPendingStaff(null);
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur lors de la validation",
        description: err.response?.data?.detail || String(err),
      });
    } finally {
      setValidatingId(null);
    }
  };

  const handleRejeterStaff = async (id: string | number, name: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir rejeter et supprimer la fiche d'inscription de ${name} ?`)) return;
    setValidatingId(id);
    try {
      await apiClient.rejeterStaff(id);
      toast({
        title: "Demande rejetée",
        description: `Le dossier de ${name} a été rejeté et supprimé.`,
      });
      await loadStaff();
      if (selectedPendingStaff?.id === id) {
        setSelectedPendingStaff(null);
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur lors du rejet",
        description: err.response?.data?.detail || String(err),
      });
    } finally {
      setValidatingId(null);
    }
  };

  const toggleEcoleSelection = (id: number) => {
    const numId = Number(id);
    setSelectedEcoles(prev => 
      prev.includes(numId) ? prev.filter(x => x !== numId) : [...prev, numId]
    );
  };

  // ─── Personnel CRUD ────────────────────────────────────────────────────────

  const openAddStaffDialog = () => {
    setEditStaff(null);
    setFormStaff({ ...FORM_STAFF_INIT });
    setSelectedEcoles(schools.map(s => Number(s.id)));
    setOpenStaff(true);
  };

  const openEditStaffDialog = (s: Staff) => {
    setEditStaff(s);
    setFormStaff({
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      phone: s.phone,
      fonction: s.fonction,
      status: s.status,
      chargeHoraire: String(s.chargeHoraire || 0)
    });
    setSelectedEcoles(s.ecolesAutorisees ? s.ecolesAutorisees.map(Number) : (s.schoolId ? [Number(s.schoolId)] : []));
    setOpenStaff(true);
  };

  const saveStaff = async () => {
    if (!formStaff.firstName || !formStaff.lastName) {
      toast({ variant: 'destructive', title: 'Nom et prénom requis' }); return;
    }
    const payload: any = {
      firstName: formStaff.firstName, lastName: formStaff.lastName,
      email: formStaff.email, phone: formStaff.phone,
      fonction: formStaff.fonction, status: formStaff.status,
      chargeHoraire: Number(formStaff.chargeHoraire),
      ecole_id: selectedEcoles.length > 0 ? selectedEcoles[0] : null,
      ecoles_autorisees: selectedEcoles
    };
    try {
      if (editStaff) {
        await apiClient.updateStaff(editStaff.id, payload);
        toast({ title: 'Fiche mise à jour' });
      } else {
        await apiClient.createStaff({
          username: formStaff.email || `${formStaff.firstName.toLowerCase()}.${formStaff.lastName.toLowerCase()}`,
          password: 'Code@123',
          prenom: formStaff.firstName,
          nom: formStaff.lastName,
          email: formStaff.email,
          telephone: formStaff.phone,
          fonction: formStaff.fonction,
          statut: formStaff.status,
          charge_horaire: Number(formStaff.chargeHoraire),
          ecole_id: selectedEcoles.length > 0 ? selectedEcoles[0] : null,
          ecoles_autorisees: selectedEcoles
        });
        toast({ title: 'Agent ajouté avec succès' });
      }
      setOpenStaff(false); setEditStaff(null); setFormStaff({ ...FORM_STAFF_INIT }); loadStaff();
      await loadStaff();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.response?.data?.detail || String(err) });
    }
  };

  const deleteStaff = async (id: string) => {
    try {
      await apiClient.deleteStaff(id);
      toast({ title: 'Agent supprimé' });
      await loadStaff();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err.response?.data?.detail || String(err) });
    }
  };

  // ─── Paie ──────────────────────────────────────────────────────────────────

  const saveFiche = () => {
    if (!formPaie.staffId || !formPaie.salaireBase) {
      toast({ variant: 'destructive', title: 'Agent et salaire de base requis' }); return;
    }
    const base = Number(formPaie.salaireBase);
    const primes = Number(formPaie.primes);
    const retenues = Number(formPaie.retenues);
    const net = base + primes - retenues;
    if (editFiche) {
      setFiches(p => p.map(f => f.id === editFiche.id ? { ...f, staffId: formPaie.staffId, mois: formPaie.mois, salaireBase: base, primes, retenues, net } : f));
      toast({ title: 'Fiche mise à jour' });
    } else {
      setFiches(p => [...p, { id: `fp-${Date.now()}`, staffId: formPaie.staffId, mois: formPaie.mois, salaireBase: base, primes, retenues, net, statut: 'brouillon' }]);
      toast({ title: 'Fiche créée' });
    }
    setOpenPaie(false); setEditFiche(null); setFormPaie({ ...FORM_PAIE_INIT });
  };

  const validerFiche = (id: string) => { setFiches(p => p.map(f => f.id === id ? { ...f, statut: 'valide' } : f)); toast({ title: 'Fiche validée' }); };
  const marquerPaye = (id: string) => { setFiches(p => p.map(f => f.id === id ? { ...f, statut: 'paye' } : f)); toast({ title: 'Salaire marqué comme payé' }); };
  const deleteFiche = (id: string) => { setFiches(p => p.filter(f => f.id !== id)); toast({ title: 'Fiche supprimée' }); };

  // ─── Export PDF ────────────────────────────────────────────────────────────

  const exportBulletinPDF = (fiche: FichePaie) => {
    const agent = staff.find(s => s.id === fiche.staffId);
    if (!agent) { toast({ variant: 'destructive', title: 'Agent introuvable' }); return; }
    const moisLabel = new Date(fiche.mois + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const irpp = fiche.net > 150000 ? Math.round(fiche.net * 0.05) : 0;
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;left:-9999px;width:210mm;padding:15mm;font-family:Arial,sans-serif;font-size:11px;color:#000;background:#fff';
    container.innerHTML = `
      <div style="border-bottom:2px solid #1d4ed8;padding-bottom:10px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
        <div><h1 style="font-size:18px;color:#1d4ed8;margin:0;font-weight:bold;">HÎNNEH ÉDUCATION</h1><p style="font-size:9px;color:#666;margin:2px 0 0;">Système Intégré de Gestion Scolaire</p></div>
        <div style="text-align:right;"><p style="font-size:13px;font-weight:bold;margin:0;">BULLETIN DE PAIE</p><p style="font-size:10px;color:#555;margin:2px 0 0;">${moisLabel.toUpperCase()}</p></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
        <div style="background:#f3f4f6;padding:12px;border-radius:6px;border:1px solid #e5e7eb;">
          <p style="font-weight:bold;margin:0 0 6px;border-bottom:1px solid #d1d5db;padding-bottom:4px;">EMPLOYÉ</p>
          <p style="margin:3px 0;"><strong>Nom :</strong> ${formatStudentName(agent)}</p>
          <p style="margin:3px 0;"><strong>Fonction :</strong> ${agent.fonction}</p>
          <p style="margin:3px 0;"><strong>Charge horaire :</strong> ${agent.chargeHoraire}h/sem</p>
          <p style="margin:3px 0;"><strong>Email :</strong> ${agent.email || '—'}</p>
        </div>
        <div style="background:#f3f4f6;padding:12px;border-radius:6px;border:1px solid #e5e7eb;">
          <p style="font-weight:bold;margin:0 0 6px;border-bottom:1px solid #d1d5db;padding-bottom:4px;">PÉRIODE</p>
          <p style="margin:3px 0;"><strong>Mois :</strong> ${moisLabel}</p>
          <p style="margin:3px 0;"><strong>Statut :</strong> ${fiche.statut}</p>
          <p style="margin:3px 0;"><strong>Date d'édition :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:10px;">
        <thead><tr style="background:#1d4ed8;color:#fff;">
          <th style="padding:8px;border:1px solid #1d4ed8;text-align:left;">Libellé</th>
          <th style="padding:8px;border:1px solid #1d4ed8;text-align:right;width:120px;">Gain (FCFA)</th>
          <th style="padding:8px;border:1px solid #1d4ed8;text-align:right;width:120px;">Retenue (FCFA)</th>
        </tr></thead>
        <tbody>
          <tr><td style="padding:8px;border:1px solid #ddd;">Salaire de base</td><td style="padding:8px;border:1px solid #ddd;text-align:right;">${fiche.salaireBase.toLocaleString('fr-FR')}</td><td style="padding:8px;border:1px solid #ddd;"></td></tr>
          ${fiche.primes > 0 ? `<tr><td style="padding:8px;border:1px solid #ddd;">Primes &amp; indemnités</td><td style="padding:8px;border:1px solid #ddd;text-align:right;">${fiche.primes.toLocaleString('fr-FR')}</td><td style="padding:8px;border:1px solid #ddd;"></td></tr>` : ''}
          ${fiche.retenues > 0 ? `<tr><td style="padding:8px;border:1px solid #ddd;">Retenues diverses</td><td style="padding:8px;border:1px solid #ddd;"></td><td style="padding:8px;border:1px solid #ddd;text-align:right;">${fiche.retenues.toLocaleString('fr-FR')}</td></tr>` : ''}
          ${irpp > 0 ? `<tr><td style="padding:8px;border:1px solid #ddd;">IRPP estimé (5%)</td><td style="padding:8px;border:1px solid #ddd;"></td><td style="padding:8px;border:1px solid #ddd;text-align:right;">${irpp.toLocaleString('fr-FR')}</td></tr>` : ''}
        </tbody>
        <tfoot><tr style="background:#f3f4f6;font-weight:bold;">
          <td style="padding:8px;border:1px solid #ddd;">TOTAL BRUT / TOTAL RETENUES</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${(fiche.salaireBase + fiche.primes).toLocaleString('fr-FR')}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${(fiche.retenues + irpp).toLocaleString('fr-FR')}</td>
        </tr></tfoot>
      </table>
      <div style="background:#1d4ed8;color:#fff;padding:12px 16px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <span style="font-size:14px;font-weight:bold;">NET À PAYER</span>
        <span style="font-size:22px;font-weight:bold;">${(fiche.net - irpp).toLocaleString('fr-FR')} FCFA</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:30px;font-size:10px;color:#666;">
        <p>Visa Direction :<br/><br/>_____________________</p>
        <p>Signature de l'employé :<br/><br/>_____________________</p>
      </div>`;
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
      if (iframe.parentNode) document.body.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    iframeDoc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:15mm;font-family:Arial,sans-serif;font-size:11px;color:#000;background:#fff;}</style></head><body>${container.innerHTML}</body></html>`);
    iframeDoc.close();

    import('html2pdf.js').then(m => {
      m.default().from(iframeDoc.body).set({
        filename: `bulletin_paie_${agent.lastName}_${fiche.mois}.pdf`,
        margin: 10, html2canvas: { scale: 2, backgroundColor: '#ffffff', windowWidth: 794 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).save().then(() => { if (iframe.parentNode) document.body.removeChild(iframe); toast({ title: 'Bulletin PDF téléchargé' }); });
    }).catch(() => { if (iframe.parentNode) document.body.removeChild(iframe); toast({ variant: 'destructive', title: 'Erreur PDF' }); });
  };

  // ─── Dérivés ───────────────────────────────────────────────────────────────

  const filteredStaff = useMemo(() => staff.filter(s => {
    const q = search.toLowerCase();
    const matchQ = `${formatStudentName(s)} ${s.email}`.toLowerCase().includes(q);
    const matchF = filterFonction === 'all' || s.fonction === filterFonction;
    return matchQ && matchF;
  }), [staff, search, filterFonction]);

  const fichesDuMois = useMemo(() => fiches.filter(f => f.mois === filterMois), [fiches, filterMois]);

  const totalMasse = fichesDuMois.reduce((sum, f) => sum + f.net, 0);
  const nbPaye = fichesDuMois.filter(f => f.statut === 'paye').length;
  const getAgent = (id: string) => staff.find(s => s.id === id);

  // ─── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6 max-w-7xl mx-auto">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><UserCog className="h-7 w-7 text-primary" />Ressources Humaines & Paie</h1>
            <p className="text-muted-foreground mt-1">Gestion du personnel, calcul des salaires et bulletins de paie</p>
          </div>
          <div className="flex gap-2 text-sm flex-wrap">
            {pendingStaff.length > 0 && (
              <div className="bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 px-3 py-1 rounded-full font-bold flex items-center gap-1.5 animate-pulse shadow-xs">
                <Clock className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300" />
                {pendingStaff.length} dossier{pendingStaff.length > 1 ? 's' : ''} en attente RH
              </div>
            )}
            <div className="bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/40 dark:text-green-300 px-3 py-1 rounded-full font-medium flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {staff.filter(s => s.status === 'actif').length} actifs
            </div>
            <div className="bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 px-3 py-1 rounded-full font-medium flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              {totalMasse.toLocaleString('fr-FR')} F masse
            </div>
          </div>
        </div>

        <Tabs defaultValue={pendingStaff.length > 0 ? "validations" : "personnel"}>
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto h-auto p-1 bg-muted/70 gap-1 rounded-xl">
            <TabsTrigger value="validations" className="gap-1.5 relative py-2 data-[state=active]:bg-background data-[state=active]:shadow-xs">
              <UserCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span>Dossiers en attente</span>
              {pendingStaff.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-bold shadow-xs">
                  {pendingStaff.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="personnel" className="gap-1.5 py-2 data-[state=active]:bg-background data-[state=active]:shadow-xs">
              <Users className="h-4 w-4 text-primary" />
              <span>Personnel ({staff.length})</span>
            </TabsTrigger>
            <TabsTrigger value="paie" className="gap-1.5 py-2 data-[state=active]:bg-background data-[state=active]:shadow-xs">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <span>Paie</span>
            </TabsTrigger>
            <TabsTrigger value="bulletins" className="gap-1.5 py-2 data-[state=active]:bg-background data-[state=active]:shadow-xs">
              <FileText className="h-4 w-4 text-indigo-600" />
              <span>Bulletins PDF</span>
            </TabsTrigger>
          </TabsList>

          {/* ─── ONGLET VALIDATION DES DOSSIERS RH ─── */}
          <TabsContent value="validations" className="mt-4 space-y-4">
            <div className="bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200/80 dark:border-amber-900/40 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-xl shrink-0">
                  <UserCheck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-amber-950 dark:text-amber-100">
                    Contrôle & Validation des Inscriptions du Personnel
                  </h2>
                  <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                    Chaque membre du personnel nouvellement inscrit reste bloqué jusqu'à ce que son rôle et son dossier soient validés par les Ressources Humaines.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end md:self-center">
                <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1 text-xs rounded-lg shadow-xs">
                  {pendingStaff.length} en attente
                </Badge>
              </div>
            </div>

            {loading ? (
              <p className="text-center py-12 text-muted-foreground">Chargement des dossiers…</p>
            ) : pendingStaff.length === 0 ? (
              <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800">
                <CardContent className="py-12 text-center space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-950/50 text-green-600 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">Aucun dossier en attente</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Tous les membres du personnel sont actuellement validés et actifs. Les nouvelles fiches d'identification apparaîtront ici automatiquement dès leur soumission.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingStaff.map((s: any) => {
                  const initials = `${(s.firstName || s.prenom || 'P')[0] || ''}${(s.lastName || s.nom || 'S')[0] || ''}`.toUpperCase();
                  const roleInfo = getRoleBadge(s.fonction);
                  const fullName = formatStudentName(s);
                  const extra = s.disponibilites || {};
                  const assignedSchools = schools.filter(sch => 
                    s.ecolesAutorisees ? s.ecolesAutorisees.includes(Number(sch.id)) : Number(s.schoolId) === Number(sch.id)
                  );

                  return (
                    <Card key={s.id} className="border-2 border-amber-300/90 dark:border-amber-900/60 hover:shadow-lg transition-all rounded-2xl bg-card overflow-hidden flex flex-col justify-between">
                      <div className="p-4 space-y-3.5">
                        {/* En-tête de la carte */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-full border-2 border-amber-400 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{fullName}</h3>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Dossier soumis — En attente RH
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* RÔLE / FONCTION CHOISIE PAR L'UTILISATEUR */}
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground font-medium flex items-center gap-1">
                              <GraduationCap className="w-3.5 h-3.5 text-primary" /> Rôle choisi :
                            </span>
                            <Badge className={`text-xs px-2.5 py-0.5 font-bold border ${roleInfo.color}`}>
                              {roleInfo.label}
                            </Badge>
                          </div>
                          {extra.fonctionExercee && (
                            <p className="text-[11px] text-slate-700 dark:text-slate-300 italic pt-0.5">
                              Précision : {extra.fonctionExercee}
                            </p>
                          )}
                        </div>

                        {/* Établissements assignés & Contacts */}
                        <div className="space-y-1.5 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5 truncate">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{s.email || 'Email non renseigné'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{s.phone || 'Tél non renseigné'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 truncate">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {assignedSchools.length > 0
                                ? assignedSchools.map(sch => sch.name).join(', ')
                                : 'Établissement par défaut'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Barre d'action inférieure */}
                      <div className="p-3 bg-muted/40 border-t border-border flex items-center justify-between gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1 hover:bg-muted"
                          onClick={() => setSelectedPendingStaff(s)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Consulter
                        </Button>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 px-2.5 text-xs gap-1"
                            onClick={() => handleRejeterStaff(s.id, fullName)}
                            disabled={validatingId === s.id}
                            title="Rejeter et supprimer le dossier"
                          >
                            <X className="w-3.5 h-3.5" />
                            Rejeter
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 px-3 text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold shadow-xs"
                            onClick={() => handleValiderStaff(s.id, fullName)}
                            disabled={validatingId === s.id}
                            title="Valider le dossier et débloquer l'accès"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Valider
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ─── ONGLET PERSONNEL ─── */}
          <TabsContent value="personnel" className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 justify-between">
              <div className="flex gap-2 flex-wrap">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Rechercher un agent…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={filterFonction} onValueChange={setFilterFonction}>
                  <SelectTrigger className="w-40 h-10 text-sm"><SelectValue placeholder="Fonction" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes fonctions</SelectItem>
                    {FONCTIONS.map(f => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 text-xs font-semibold shrink-0"
                  onClick={() => printPlancheCartesProfessionnelles(filteredStaff, null)}
                  title="Imprimer une planche A4 de cartes professionnelles avec photos et services"
                >
                  <Printer className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Imprimer Cartes Pro ({filteredStaff.length})
                </Button>
                <Button size="sm" className="gap-1 shrink-0" onClick={openAddStaffDialog}>
                  <Plus className="h-4 w-4" />Ajouter un agent
                </Button>
              </div>
            </div>

            {loading ? <p className="text-center py-12 text-muted-foreground">Chargement…</p> : filteredStaff.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground italic">Aucun agent trouvé.</CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStaff.map((s: any) => {
                  const photoUrl = s.photo || s.photo_url || '';
                  const initials = `${(s.firstName || s.prenom || 'P')[0] || ''}${(s.lastName || s.nom || 'S')[0] || ''}`.toUpperCase();
                  const serviceLib = resolveStaffService(s);

                  return (
                    <Card key={s.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4 pb-3 px-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="h-10 w-10 rounded-full border-2 border-indigo-200 dark:border-indigo-800 bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-primary overflow-hidden shrink-0 shadow-xs">
                              {photoUrl ? (
                                <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span>{initials}</span>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-sm leading-tight">{formatStudentName(s)}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <Badge className={`text-[10px] px-1.5 py-0 font-bold border ${getRoleBadge(s.fonction).color}`}>
                                  {getRoleBadge(s.fonction).label}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${statutColor(s.status)}`}>{s.status}</span>
                        </div>

                        {/* Badge de Service */}
                        <div className="pt-0.5">
                          <span className="text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 px-2 py-0.5 rounded-md inline-block truncate max-w-full">
                            🏢 {serviceLib}
                          </span>
                        </div>

                        <div className="text-xs text-muted-foreground space-y-0.5 pt-0.5">
                          {s.email && <p className="truncate">{s.email}</p>}
                          {s.phone && <p>{s.phone}</p>}
                          <p>{s.chargeHoraire}h/semaine</p>
                        </div>
                        <div className="flex gap-1.5 pt-1 justify-end border-t border-slate-100 dark:border-slate-800">
                          {s.status === 'en_attente' ? (
                            <Button
                              size="sm"
                              className="h-7 px-2.5 gap-1 text-xs bg-green-600 hover:bg-green-700 text-white font-bold"
                              onClick={() => handleValiderStaff(s.id, formatStudentName(s))}
                              disabled={validatingId === s.id}
                            >
                              <Check className="h-3 w-3" />
                              Valider
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 text-xs bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
                              onClick={() => printCarteProfessionnelle(s, null)}
                              title="Imprimer la Carte Professionnelle"
                            >
                              <CreditCard className="h-3 w-3" />
                              Carte Pro
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => {
                            setFormPaie({ ...FORM_PAIE_INIT, staffId: s.id });
                            setEditFiche(null); setOpenPaie(true);
                          }}><DollarSign className="h-3 w-3" />Paie</Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditStaffDialog(s)}><Edit className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => deleteStaff(s.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ─── ONGLET PAIE ─── */}
          <TabsContent value="paie" className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 justify-between">
              <div className="flex gap-2">
                <Select value={filterMois} onValueChange={setFilterMois}>
                  <SelectTrigger className="w-40 h-10 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{MOIS_OPTIONS.map(m => <SelectItem key={m} value={m}>{new Date(m + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button size="sm" className="gap-1 shrink-0" onClick={() => { setEditFiche(null); setFormPaie({ ...FORM_PAIE_INIT }); setOpenPaie(true); }}>
                <Plus className="h-4 w-4" />Créer une fiche de paie
              </Button>
            </div>

            {/* Résumé mois */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Fiches ce mois', value: fichesDuMois.length, icon: FileText, bg: 'bg-blue-50 text-blue-700' },
                { label: 'Masse salariale', value: `${totalMasse.toLocaleString('fr-FR')} F`, icon: DollarSign, bg: 'bg-purple-50 text-purple-700' },
                { label: 'Payés', value: nbPaye, icon: CheckCircle2, bg: 'bg-green-50 text-green-700' },
                { label: 'En attente', value: fichesDuMois.filter(f => f.statut !== 'paye').length, icon: BadgeCheck, bg: 'bg-amber-50 text-amber-700' },
              ].map(k => (
                <div key={k.label} className={`${k.bg} rounded-xl p-4 flex items-center gap-3`}>
                  <k.icon className="h-5 w-5 shrink-0" />
                  <div><p className="text-xs opacity-80">{k.label}</p><p className="font-bold">{k.value}</p></div>
                </div>
              ))}
            </div>

            {fichesDuMois.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground italic">Aucune fiche de paie pour ce mois.</CardContent></Card>
            ) : (
              <div className="overflow-x-auto rounded-xl border bg-card">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60 border-b">
                    <tr>
                      <th className="p-3 text-left">Agent</th>
                      <th className="p-3 text-right">Salaire base</th>
                      <th className="p-3 text-right">Primes</th>
                      <th className="p-3 text-right">Retenues</th>
                      <th className="p-3 text-right font-semibold">Net</th>
                      <th className="p-3 text-center">Statut</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fichesDuMois.map(f => {
                      const agent = getAgent(f.staffId);
                      return (
                        <tr key={f.id} className="border-b hover:bg-muted/20">
                          <td className="p-3 font-medium">{agent ? `${formatStudentName(agent)}` : f.staffId}</td>
                          <td className="p-3 text-right">{f.salaireBase.toLocaleString('fr-FR')}</td>
                          <td className="p-3 text-right text-green-700">+{f.primes.toLocaleString('fr-FR')}</td>
                          <td className="p-3 text-right text-red-700">-{f.retenues.toLocaleString('fr-FR')}</td>
                          <td className="p-3 text-right font-bold">{f.net.toLocaleString('fr-FR')}</td>
                          <td className="p-3 text-center"><Badge variant={f.statut === 'paye' ? 'default' : f.statut === 'valide' ? 'secondary' : 'outline'} className="text-[10px]">{f.statut}</Badge></td>
                          <td className="p-3">
                            <div className="flex gap-1 justify-center">
                              {f.statut === 'brouillon' && <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => validerFiche(f.id)}>Valider</Button>}
                              {f.statut === 'valide' && <Button size="sm" variant="default" className="h-6 text-[10px] px-2" onClick={() => marquerPaye(f.id)}>Payer</Button>}
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setPreviewFiche(f)}><Eye className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => deleteFiche(f.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ─── ONGLET BULLETINS PDF ─── */}
          <TabsContent value="bulletins" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">Téléchargez les bulletins de paie PDF pour chaque agent.</p>
            {fiches.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground italic">Aucune fiche de paie disponible. Créez-en dans l'onglet Paie.</CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {fiches.map(f => {
                  const agent = getAgent(f.staffId);
                  const moisLabel = new Date(f.mois + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                  return (
                    <Card key={f.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4 pb-3 px-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-sm">{agent ? `${formatStudentName(agent)}` : '—'}</p>
                            <p className="text-xs text-muted-foreground capitalize">{agent?.fonction}</p>
                          </div>
                          <Badge variant={f.statut === 'paye' ? 'default' : 'outline'} className="text-[10px]">{f.statut}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{moisLabel}</p>
                        <p className="font-bold text-primary">{f.net.toLocaleString('fr-FR')} FCFA</p>
                        <Button size="sm" variant="outline" className="w-full gap-1 text-xs" onClick={() => exportBulletinPDF(f)}>
                          <FileText className="h-3.5 w-3.5" />Télécharger PDF
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* ─── Dialog Agent ─── */}
        <Dialog open={openStaff} onOpenChange={setOpenStaff}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editStaff ? 'Modifier l\'agent' : 'Ajouter un agent'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Prénom *</Label><Input value={formStaff.firstName} onChange={e => setFormStaff(p => ({ ...p, firstName: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Nom *</Label><Input value={formStaff.lastName} onChange={e => setFormStaff(p => ({ ...p, lastName: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Email</Label><Input type="email" value={formStaff.email} onChange={e => setFormStaff(p => ({ ...p, email: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Téléphone</Label><Input value={formStaff.phone} onChange={e => setFormStaff(p => ({ ...p, phone: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Fonction</Label>
                  <Select value={formStaff.fonction} onValueChange={v => setFormStaff(p => ({ ...p, fonction: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FONCTIONS.map(f => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Statut</Label>
                  <Select value={formStaff.status} onValueChange={v => setFormStaff(p => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="conge">En congé</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="en_attente">En attente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1"><Label>Charge horaire (h/sem)</Label><Input type="number" min={0} value={formStaff.chargeHoraire} onChange={e => setFormStaff(p => ({ ...p, chargeHoraire: e.target.value }))} /></div>

              {/* Établissements autorisés avec filtre par ville */}
              <div className="p-3 bg-sky-50/50 dark:bg-sky-950/20 rounded-xl border border-sky-200 dark:border-sky-800/50 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-sky-900 dark:text-sky-200">
                    🏫 Établissements autorisés ({selectedEcoles.length})
                  </Label>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {schools.length} écoles réparties par ville
                  </span>
                </div>
                
                {/* Filtre par Ville */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedCityFilter('all')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all shrink-0 ${
                      selectedCityFilter === 'all'
                        ? 'bg-sky-700 text-white shadow-sm'
                        : 'bg-background text-muted-foreground border hover:bg-muted'
                    }`}
                  >
                    Toutes
                  </button>
                  {Array.from(new Set(schools.map(s => s.city).filter(Boolean))).map((city) => (
                    <button
                      type="button"
                      key={city}
                      onClick={() => setSelectedCityFilter(city)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all shrink-0 flex items-center gap-1 ${
                        selectedCityFilter === city
                          ? 'bg-sky-700 text-white shadow-sm'
                          : 'bg-background text-muted-foreground border hover:bg-muted'
                      }`}
                    >
                      📍 {city}
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Cochez 1 ou plusieurs établissements (groupés par ville) accessibles par cet utilisateur.
                </p>
                <div className="space-y-2 pt-1 max-h-48 overflow-y-auto">
                  {Array.from(new Set(schools.map(s => s.city || 'Autre'))).map((city) => {
                    const schoolsInCity = schools.filter(s => (s.city || 'Autre') === city);
                    if (selectedCityFilter !== 'all' && selectedCityFilter !== city) return null;

                    const allCityChecked = schoolsInCity.every(s => selectedEcoles.includes(Number(s.id)));
                    return (
                      <div key={city} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-sky-800 dark:text-sky-300">
                          <span>📍 {city} ({schoolsInCity.length} école{schoolsInCity.length > 1 ? 's' : ''})</span>
                          <button
                            type="button"
                            onClick={() => {
                              const cityIds = schoolsInCity.map(s => Number(s.id));
                              if (allCityChecked) {
                                setSelectedEcoles(prev => prev.filter(id => !cityIds.includes(id)));
                              } else {
                                setSelectedEcoles(prev => Array.from(new Set([...prev, ...cityIds])));
                              }
                            }}
                            className="text-[10px] text-sky-600 hover:underline font-normal cursor-pointer"
                          >
                            {allCityChecked ? 'Décocher la ville' : 'Cocher la ville'}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {schoolsInCity.map((sch) => {
                            const isChecked = selectedEcoles.includes(Number(sch.id));
                            return (
                              <label
                                key={sch.id}
                                className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                  isChecked
                                    ? 'bg-sky-100 dark:bg-sky-900/40 border-sky-400 text-sky-950 dark:text-sky-100 font-bold'
                                    : 'bg-background border-border text-muted-foreground hover:border-sky-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleEcoleSelection(Number(sch.id))}
                                  className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                                />
                                <div className="flex flex-col min-w-0">
                                  <span className="truncate">{sch.name}</span>
                                  <span className="text-[9px] text-muted-foreground">Code: {sch.code || 'N/A'}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setOpenStaff(false)}>Annuler</Button>
              <Button onClick={saveStaff}>{editStaff ? 'Enregistrer' : 'Ajouter'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Dialog Paie ─── */}
        <Dialog open={openPaie} onOpenChange={setOpenPaie}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editFiche ? 'Modifier la fiche' : 'Créer une fiche de paie'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Agent *</Label>
                <Select value={formPaie.staffId} onValueChange={v => setFormPaie(p => ({ ...p, staffId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Choisir un agent" /></SelectTrigger>
                  <SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.id}>{formatStudentName(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Mois</Label>
                <Select value={formPaie.mois} onValueChange={v => setFormPaie(p => ({ ...p, mois: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MOIS_OPTIONS.map(m => <SelectItem key={m} value={m}>{new Date(m + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1"><Label>Salaire base *</Label><Input type="number" min={0} placeholder="200000" value={formPaie.salaireBase} onChange={e => setFormPaie(p => ({ ...p, salaireBase: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Primes</Label><Input type="number" min={0} value={formPaie.primes} onChange={e => setFormPaie(p => ({ ...p, primes: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Retenues</Label><Input type="number" min={0} value={formPaie.retenues} onChange={e => setFormPaie(p => ({ ...p, retenues: e.target.value }))} /></div>
              </div>
              {formPaie.salaireBase && (
                <div className="bg-muted rounded-lg p-3 text-sm">
                  <span className="text-muted-foreground">Net estimé : </span>
                  <span className="font-bold text-primary">{(Number(formPaie.salaireBase) + Number(formPaie.primes) - Number(formPaie.retenues)).toLocaleString('fr-FR')} FCFA</span>
                </div>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setOpenPaie(false)}>Annuler</Button>
              <Button onClick={saveFiche}>{editFiche ? 'Enregistrer' : 'Créer'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Dialog Consultation Fiche Dossier en attente ─── */}
        {selectedPendingStaff && (
          <Dialog open={!!selectedPendingStaff} onOpenChange={() => setSelectedPendingStaff(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl">
              <DialogHeader className="border-b pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-full border-2 border-amber-400 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-lg shadow-xs shrink-0">
                      {`${(selectedPendingStaff.firstName || selectedPendingStaff.prenom || 'P')[0] || ''}${(selectedPendingStaff.lastName || selectedPendingStaff.nom || 'S')[0] || ''}`.toUpperCase()}
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {formatStudentName(selectedPendingStaff)}
                      </DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 text-amber-600 font-medium">
                          <Clock className="w-3.5 h-3.5" /> En attente de validation RH
                        </span>
                        {selectedPendingStaff.email && <span>• {selectedPendingStaff.email}</span>}
                      </DialogDescription>
                    </div>
                  </div>
                  <Badge className={`text-xs px-3 py-1 font-bold border ${getRoleBadge(selectedPendingStaff.fonction).color}`}>
                    {getRoleBadge(selectedPendingStaff.fonction).label}
                  </Badge>
                </div>
              </DialogHeader>

              {(() => {
                const extra = selectedPendingStaff.disponibilites || {};
                const assignedSchools = schools.filter(sch => 
                  selectedPendingStaff.ecolesAutorisees ? selectedPendingStaff.ecolesAutorisees.includes(Number(sch.id)) : Number(selectedPendingStaff.schoolId) === Number(sch.id)
                );

                return (
                  <div className="space-y-4 py-2 text-xs">
                    {/* Bloc Rôle & Service */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border space-y-2">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                        <GraduationCap className="w-4 h-4 text-primary" />
                        Rôle & Affectation Professionnelle
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-muted-foreground">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Rôle Choisi</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{getRoleBadge(selectedPendingStaff.fonction).label}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Fonction exercée</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{extra.fonctionExercee || selectedPendingStaff.fonction || 'Non précisée'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Service</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{extra.service || 'Général'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Nature du contrat</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{extra.natureContrat || 'CDD / Prestation'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">N° CNPS</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{extra.cnpsNumero || 'Non renseigné'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Matricule</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{extra.matriculeInterne || selectedPendingStaff.matricule || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="pt-1 border-t border-slate-200/60 dark:border-slate-800">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">Établissement(s) assigné(s)</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {assignedSchools.length > 0 ? (
                            assignedSchools.map(sch => (
                              <Badge key={sch.id} variant="outline" className="bg-background text-xs">
                                📍 {sch.name} ({sch.city || 'N/A'})
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground italic">Établissement principal</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bloc Identification & État Civil */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border space-y-2">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                        <User className="w-4 h-4 text-indigo-600" />
                        État Civil & Pièce d'Identité
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-muted-foreground">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Genre</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{extra.genre === 'F' ? 'Féminin' : 'Masculin'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Date & Lieu Naissance</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{extra.dateNaissance || '—'} à {extra.lieuNaissance || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Nationalité</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{extra.nationalite || 'Ivoirienne'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Situation matrimoniale</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200 capitalize">{extra.situationMatrimoniale || 'Célibataire'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Type & N° Pièce</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{extra.cniType || 'CNI'} : {extra.cniNumero || 'Non renseigné'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Délivrée le / à</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{extra.cniDelivreLe || '—'} à {extra.cniDelivreA || '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bloc Diplômes & Autorisations */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border space-y-2">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                        <FileCheck className="w-4 h-4 text-emerald-600" />
                        Diplômes & Titres Pédagogiques
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-muted-foreground">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Diplôme le plus élevé</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{extra.diplome || 'Non renseigné'} ({extra.anneeObtention || '—'})</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Autorisation d'Enseigner</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{extra.autorisationEnseigner || 'Néant'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Autorisation d'Exercer</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{extra.autorisationExercer || 'Néant'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bloc Coordonnées & Urgences */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border space-y-2">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                        <MapPin className="w-4 h-4 text-amber-600" />
                        Résidence & Contact d'Urgence
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-muted-foreground">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Commune & Quartier</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{extra.commune || '—'} / {extra.sousQuartier || extra.lieuResidence || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Téléphone Mobile</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{selectedPendingStaff.phone || extra.telephoneCel || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Contact en cas d'accident</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{extra.personneAccident || 'Non renseigné'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <DialogFooter className="mt-4 pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const st = selectedPendingStaff;
                    setSelectedPendingStaff(null);
                    openEditStaffDialog(st);
                  }}
                  className="gap-1.5 text-xs"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Modifier le rôle / affectation
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRejeterStaff(selectedPendingStaff.id, formatStudentName(selectedPendingStaff))}
                    disabled={validatingId === selectedPendingStaff.id}
                    className="gap-1.5 text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                    Rejeter le dossier
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleValiderStaff(selectedPendingStaff.id, formatStudentName(selectedPendingStaff))}
                    disabled={validatingId === selectedPendingStaff.id}
                    className="gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white font-bold shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Valider le dossier & Débloquer l'accès
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* ─── Dialog Aperçu fiche ─── */}
        {previewFiche && (
          <Dialog open={!!previewFiche} onOpenChange={() => setPreviewFiche(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Aperçu fiche de paie</DialogTitle></DialogHeader>
              <div className="space-y-3 text-sm">
                {(() => {
                  const agent = getAgent(previewFiche.staffId);
                  const moisLabel = new Date(previewFiche.mois + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                  return (
                    <>
                      <div className="flex justify-between"><span className="text-muted-foreground">Agent</span><span className="font-medium">{agent ? `${formatStudentName(agent)}` : '—'}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Mois</span><span>{moisLabel}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Salaire base</span><span>{previewFiche.salaireBase.toLocaleString('fr-FR')} F</span></div>
                      <div className="flex justify-between text-green-700"><span>Primes</span><span>+{previewFiche.primes.toLocaleString('fr-FR')} F</span></div>
                      <div className="flex justify-between text-red-700"><span>Retenues</span><span>-{previewFiche.retenues.toLocaleString('fr-FR')} F</span></div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Net à payer</span><span className="text-primary">{previewFiche.net.toLocaleString('fr-FR')} F</span></div>
                      <Badge variant={previewFiche.statut === 'paye' ? 'default' : 'outline'}>{previewFiche.statut}</Badge>
                    </>
                  );
                })()}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPreviewFiche(null)}>Fermer</Button>
                <Button onClick={() => { exportBulletinPDF(previewFiche); setPreviewFiche(null); }}><FileText className="h-4 w-4 mr-1" />PDF</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

      </motion.div>
    </Layout>
  );
}
