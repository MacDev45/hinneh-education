/**
 * Espace Scolarité — Remplace l'ancien "Caisse"
 * Responsabilités : dépôt de kit, inscriptions, encaissements, attribution classes (§3.1)
 * Accès : scolarite, directeur_ecole, direction_fondation, admin
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BookMarked, DollarSign, Users, CheckCircle2,
  Clock, Search, PlusCircle, Printer, AlertCircle,
  TrendingUp, Filter, Receipt, GraduationCap, ShieldAlert, XCircle,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatStudentName, formatCurrency, formatDate } from '@/lib/index';
import apiClient from '@/lib/apiClient';
import { printReceipt, generateReceiptNumber } from '@/lib/receiptPrinter';

export default function ScolariteSpace() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('encaissements');
  const [payments, setPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('tous');

  // §1.6 — Résiliation services (Direction uniquement)
  const [openResiliation, setOpenResiliation] = useState(false);
  const [resStudent, setResStudent] = useState<any>(null);
  const [resService, setResService] = useState<'transport' | 'cantine'>('transport');
  const [resMotif, setResMotif] = useState('');
  const [savingRes, setSavingRes] = useState(false);
  const userRole = localStorage.getItem('user_role') || '';
  const canResilier = ['directeur_ecole', 'direction_fondation', 'admin'].includes(userRole);

  // Dialog encaissement
  const [openPay, setOpenPay] = useState(false);
  const [payStudent, setPayStudent] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payType, setPayType] = useState('scolarite');
  const [payMode, setPayMode] = useState('especes');
  const [payTx, setPayTx] = useState('');
  const [saving, setSaving] = useState(false);

  // Dialog finaliser inscription
  const [openFinalize, setOpenFinalize] = useState(false);
  const [finalStudent, setFinalStudent] = useState<any>(null);
  const [finalAmount, setFinalAmount] = useState('');
  const [finalMode, setFinalMode] = useState('especes');
  const [finalTx, setFinalTx] = useState('');
  const [finalClassId, setFinalClassId] = useState('');

  // Modification & Annulation de paiements
  const [openEditModal, setOpenEditModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editMontant, setEditMontant] = useState('');
  const [editType, setEditType] = useState('scolarite');
  const [editMode, setEditMode] = useState('especes');
  const [editTx, setEditTx] = useState('');

  const [openCancelModal, setOpenCancelModal] = useState(false);
  const [cancelItem, setCancelItem] = useState<any>(null);
  const [cancelMotif, setCancelMotif] = useState('');

  const handleStartEdit = (p: any) => {
    setEditItem(p);
    setEditMontant(String(p.amount || p.montant || ''));
    setEditType(p.type || 'scolarite');
    setEditMode(p.mode || 'especes');
    setEditTx(p.numero_transaction || '');
    setOpenEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    if (!editMontant || Number(editMontant) <= 0) {
      toast({ variant: 'destructive', title: 'Montant invalide' });
      return;
    }
    try {
      await apiClient.updatePayment(editItem.id, {
        montant: Number(editMontant),
        type: editType,
        mode: editMode,
        numero_transaction: editTx
      });
      toast({ title: 'Paiement mis à jour avec succès' });
      setOpenEditModal(false);
      loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: String(err) });
    }
  };

  const handleStartCancel = (p: any) => {
    setCancelItem(p);
    setCancelMotif('');
    setOpenCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelItem) return;
    if (!cancelMotif.trim()) {
      toast({ variant: 'destructive', title: 'Motif requis', description: "Veuillez préciser le motif d'annulation." });
      return;
    }
    try {
      await apiClient.cancelPayment(cancelItem.id, cancelMotif);
      toast({ title: 'Paiement annulé avec succès' });
      setOpenCancelModal(false);
      loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: String(err) });
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, s, c] = await Promise.all([
        apiClient.getPayments(),
        apiClient.getStudents(),
        apiClient.getClasses(),
      ]);
      setPayments(p || []);
      setStudents(s || []);
      setClasses(c || []);
    } catch { setPayments([]); setStudents([]); setClasses([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadData();
    const handleFocus = () => {
      loadData();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const statsToday = {
    total: payments.filter(p => p.date && new Date(p.date).toISOString().split('T')[0] === today).length,
    montant: payments.filter(p => p.date && new Date(p.date).toISOString().split('T')[0] === today).reduce((s, p) => s + (p.amount || 0), 0),
    inscrits: payments.filter(p => p.date && new Date(p.date).toISOString().split('T')[0] === today && p.type === 'inscription').length,
  };

  const preinscritsList = students.filter(s => s.status === 'preinscrit');

  const filteredPayments = payments.filter(p => {
    const s = students.find(s => String(s.id) === String(p.studentId || p.eleve_id));
    const name = s ? `${formatStudentName(s)}` : '';
    const matchSearch = name.toLowerCase().includes(search.toLowerCase()) || String(p.receiptNumber || '').includes(search);
    const matchType = filterType === 'tous' || p.type === filterType;
    return matchSearch && matchType;
  }).slice(0, 100);

  const handleCreatePayment = async () => {
    if (!payStudent || !payAmount) {
      toast({ variant: 'destructive', title: 'Champs requis', description: 'Élève et montant obligatoires.' });
      return;
    }
    setSaving(true);
    try {
      const created = await apiClient.createPayment({
        eleve_id: Number(payStudent),
        montant: Number(payAmount),
        type: payType,
        mode: payMode,
        statut: 'paye',
        numero_transaction: payTx || null,
        date_echeance: null,
      });
      toast({ title: 'Paiement enregistré.' });
      setOpenPay(false);
      setPayStudent(''); setPayAmount(''); setPayTx('');
      await loadData();
    } catch {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'enregistrer le paiement.' });
    } finally { setSaving(false); }
  };

  const handleResiliation = async () => {
    if (!resStudent || !resMotif) {
      toast({ variant: 'destructive', title: 'Motif requis', description: 'La résiliation doit être motivée.' });
      return;
    }
    setSavingRes(true);
    try {
      await apiClient.updateStudent(resStudent.id, {
        [`service_${resService}`]: false,
        [`motif_resiliation_${resService}`]: resMotif,
      });
      toast({ title: 'Service résilié.', description: `Service ${resService} résilié pour ${formatStudentName(resStudent)}.` });
      setOpenResiliation(false);
      setResStudent(null);
      setResMotif('');
      await loadData();
    } catch {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de résilier le service.' });
    } finally { setSavingRes(false); }
  };

  const handleFinalize = async () => {
    if (!finalStudent || !finalAmount) {
      toast({ variant: 'destructive', title: 'Champs requis', description: 'Montant obligatoire.' });
      return;
    }
    setSaving(true);
    try {
      await apiClient.createPayment({
        eleve_id: Number(finalStudent.id),
        montant: Number(finalAmount),
        type: 'inscription',
        mode: finalMode,
        statut: 'paye',
        numero_transaction: finalTx || null,
        date_echeance: null,
      });
      await apiClient.updateStudent(finalStudent.id, {
        statut: 'actif',
        classe_id: finalClassId ? Number(finalClassId) : null,
      });
      toast({ title: `${formatStudentName(finalStudent)} inscrit(e) !` });
      setOpenFinalize(false);
      setFinalStudent(null);
      await loadData();
    } catch {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de finaliser.' });
    } finally { setSaving(false); }
  };

  const typeLabels: Record<string, string> = {
    scolarite: 'Scolarité', inscription: 'Inscription', transport: 'Transport',
    cantine: 'Cantine', materiel: 'Matériel', autre: 'Autre',
  };

  return (
    <Layout
      loading={loading}
      loadingMessage="Chargement de l'espace scolarité..."
      loadingSubmessage="Récupération des encaissements, classes et dossiers élèves"
    >
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <BookMarked className="h-7 w-7 text-primary" />
              Espace Scolarité
            </h1>
            <p className="text-muted-foreground mt-1">Encaissements, inscriptions, attribution des classes — Service Scolarité</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setOpenPay(true)}>
              <PlusCircle className="h-4 w-4" />Nouveau paiement
            </Button>
          </div>
        </div>

        {/* Stats du jour */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statsToday.total}</p>
                <p className="text-xs text-muted-foreground">Encaissements aujourd'hui</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(statsToday.montant)}</p>
                <p className="text-xs text-muted-foreground">Montant encaissé aujourd'hui</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{preinscritsList.length}</p>
                <p className="text-xs text-muted-foreground">Pré-inscrits en attente</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="encaissements" className="gap-1 text-xs"><Receipt className="h-3.5 w-3.5" />Encaissements</TabsTrigger>
            <TabsTrigger value="inscriptions" className="gap-1 text-xs">
              <Users className="h-3.5 w-3.5" />
              Pré-inscrits
              {preinscritsList.length > 0 && (
                <span className="ml-1 bg-amber-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">{preinscritsList.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-1 text-xs"><ShieldAlert className="h-3.5 w-3.5" />Services</TabsTrigger>
          </TabsList>

          {/* Encaissements */}
          <TabsContent value="encaissements" className="mt-4 space-y-3">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Rechercher élève ou N° reçu..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-44"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous types</SelectItem>
                  {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Chargement…</div>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/80 border-b">
                      <tr>
                        <th className="text-left p-3 font-semibold">N° Reçu</th>
                        <th className="text-left p-3 font-semibold">Élève</th>
                        <th className="text-left p-3 font-semibold">Type</th>
                        <th className="text-right p-3 font-semibold">Montant</th>
                        <th className="text-left p-3 font-semibold">Mode</th>
                        <th className="text-left p-3 font-semibold">Date</th>
                        <th className="text-left p-3 font-semibold">Date d'acquittement</th>
                        <th className="text-center p-3 font-semibold">Statut</th>
                        <th className="text-center p-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.length === 0 ? (
                        <tr><td colSpan={9} className="p-8 text-center text-muted-foreground italic">Aucun paiement trouvé.</td></tr>
                      ) : filteredPayments.map((p, i) => {
                        const eleve = students.find(s => String(s.id) === String(p.studentId || p.eleve_id));
                        const isAnnule = p.status === 'annule' || p.statut === 'annule';
                        const dateAcq = p.date_acquittement || (p.status === 'paye' || p.statut === 'paye' ? p.date : null);
                        return (
                          <tr key={p.id || i} className="border-b hover:bg-muted/20">
                            <td className="p-3 font-mono text-xs font-bold text-indigo-600">{p.receiptNumber || p.numero_recu || '—'}</td>
                            <td className="p-3 font-medium">{eleve ? `${eleve.lastName || eleve.nom} ${eleve.firstName || eleve.prenom}` : '—'}</td>
                            <td className="p-3"><Badge variant="outline" className="text-xs">{typeLabels[p.type] || p.type}</Badge></td>
                            <td className={`p-3 text-right font-bold font-mono ${isAnnule ? 'line-through text-red-500' : 'text-emerald-600'}`}>{formatCurrency(p.amount || p.montant || 0)}</td>
                            <td className="p-3 text-muted-foreground capitalize">{p.mode}</td>
                            <td className="p-3 text-muted-foreground text-xs">{formatDate(p.date)}</td>
                            <td className="p-3 text-emerald-700 font-medium text-xs">{dateAcq ? formatDate(dateAcq) : '—'}</td>
                            <td className="p-3 text-center">
                              <Badge variant={isAnnule ? 'destructive' : p.status === 'paye' ? 'default' : 'secondary'}>
                                {isAnnule ? 'Annulé' : p.status === 'paye' ? 'Payé' : p.status}
                              </Badge>
                            </td>
                            <td className="p-3 text-center flex items-center justify-center gap-1">

                              {!isAnnule && (
                                <>
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-sky-600 hover:bg-sky-50" onClick={() => handleStartEdit(p)}>
                                    Modifier
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-600 hover:bg-red-50" onClick={() => handleStartCancel(p)}>
                                    Annuler
                                  </Button>
                                </>
                              )}
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

          {/* Pré-inscrits à finaliser */}
          <TabsContent value="inscriptions" className="mt-4">
            {preinscritsList.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground italic">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500 opacity-50" />
                  Aucun dossier en attente de finalisation.
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {preinscritsList.map(s => (
                  <Card key={s.id} className="border-l-4 border-l-amber-400 hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{formatStudentName(s)}</p>
                          <p className="text-xs text-muted-foreground">{s.className || s.classLevel || '—'}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">En attente</Badge>
                      </div>
                      {s.parentPhone && (
                        <p className="text-xs text-muted-foreground">📞 {s.parentPhone}</p>
                      )}
                      <div className="flex gap-1 flex-wrap">
                        {s.serviceTransport && <Badge variant="outline" className="text-[10px]">🚌 Transport</Badge>}
                        {s.serviceCantine && <Badge variant="outline" className="text-[10px]">🍽 Cantine</Badge>}
                      </div>
                      <Button size="sm" className="w-full gap-1 mt-1" onClick={() => {
                        setFinalStudent(s);
                        setFinalAmount('50000');
                        setFinalMode('especes');
                        setFinalTx('');
                        setFinalClassId(s.classId || '');
                        setOpenFinalize(true);
                      }}>
                        <GraduationCap className="h-4 w-4" />Finaliser l'inscription
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Services — §1.6 */}
          <TabsContent value="services" className="mt-4 space-y-4">
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Résiliation des services facultatifs</p>
                <p className="text-xs mt-0.5">Une fois souscrits, Transport et Cantine deviennent obligatoires chaque mois. La résiliation est réservée à la Direction de l’établissement.</p>
              </div>
            </div>

            {!canResilier && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                <XCircle className="h-4 w-4 shrink-0" />
                Vous n’avez pas les droits pour résilier un service. Contactez la Direction.
              </div>
            )}

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {students.filter(s => s.status === 'actif' && (s.serviceTransport || s.serviceCantine)).map(s => (
                <Card key={s.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-2">
                    <div>
                      <p className="font-semibold">{formatStudentName(s)}</p>
                      <p className="text-xs text-muted-foreground">{s.className || '—'}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {s.serviceTransport && (
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-[10px]">🚌 Transport</Badge>
                          {canResilier && (
                            <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-destructive" onClick={() => {
                              setResStudent(s); setResService('transport'); setResMotif(''); setOpenResiliation(true);
                            }}><XCircle className="h-3 w-3" /></Button>
                          )}
                        </div>
                      )}
                      {s.serviceCantine && (
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-[10px]">🍽 Cantine</Badge>
                          {canResilier && (
                            <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-destructive" onClick={() => {
                              setResStudent(s); setResService('cantine'); setResMotif(''); setOpenResiliation(true);
                            }}><XCircle className="h-3 w-3" /></Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {students.filter(s => s.status === 'actif' && (s.serviceTransport || s.serviceCantine)).length === 0 && (
                <div className="col-span-3 text-center py-8 text-muted-foreground italic text-sm">Aucun élève avec services actifs.</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Dialog Résiliation §1.6 */}
      <Dialog open={openResiliation} onOpenChange={v => { setOpenResiliation(v); if (!v) setResStudent(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />Résiliation de service
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              <p className="font-semibold">{formatStudentName(resStudent)}</p>
              <p>Service : {resService === 'transport' ? '🚌 Transport' : '🍽 Cantine'}</p>
            </div>
            <div className="space-y-1">
              <Label>Motif de résiliation *</Label>
              <Input placeholder="Décision de la Direction..." value={resMotif} onChange={e => setResMotif(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenResiliation(false)}>Annuler</Button>
            <Button variant="destructive" className="gap-1" onClick={handleResiliation} disabled={savingRes}>
              {savingRes ? <Clock className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Confirmer la résiliation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Nouveau paiement */}
      <Dialog open={openPay} onOpenChange={setOpenPay}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Enregistrer un paiement</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Élève *</Label>
              <Select value={payStudent} onValueChange={setPayStudent}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un élève" /></SelectTrigger>
                <SelectContent>
                  {students.filter(s => s.status === 'actif').map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{formatStudentName(s)} {s.className ? `— ${s.className}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={payType} onValueChange={setPayType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Montant (FCFA) *</Label>
                <Input type="number" placeholder="0" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Mode</Label>
                <Select value={payMode} onValueChange={setPayMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="especes">Espèces</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="cheque">Chèque</SelectItem>
                    <SelectItem value="virement">Virement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {payMode !== 'especes' && (
                <div className="space-y-1">
                  <Label>N° Transaction</Label>
                  <Input placeholder="Référence..." value={payTx} onChange={e => setPayTx(e.target.value)} />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenPay(false)}>Annuler</Button>
            <Button className="gap-1" onClick={handleCreatePayment} disabled={saving}>
              {saving ? <Clock className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Finaliser inscription */}
      <Dialog open={openFinalize} onOpenChange={v => { setOpenFinalize(v); if (!v) setFinalStudent(null); }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Finaliser — {formatStudentName(finalStudent)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              Le paiement du premier versement rend l'inscription définitive. L'élève passera au statut actif.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Montant (FCFA) *</Label>
                <Input type="number" value={finalAmount} onChange={e => setFinalAmount(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Mode</Label>
                <Select value={finalMode} onValueChange={setFinalMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="especes">Espèces</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="cheque">Chèque</SelectItem>
                    <SelectItem value="virement">Virement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {finalMode !== 'especes' && (
              <div className="space-y-1">
                <Label>N° Transaction</Label>
                <Input placeholder="Référence..." value={finalTx} onChange={e => setFinalTx(e.target.value)} />
              </div>
            )}
            <div className="space-y-1">
              <Label>Attribution de classe</Label>
              <Select value={finalClassId} onValueChange={setFinalClassId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une classe" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenFinalize(false)}>Annuler</Button>
            <Button className="gap-1 bg-green-600 hover:bg-green-700" onClick={handleFinalize} disabled={saving}>
              {saving ? <Clock className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
              Confirmer & Inscrire
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Modifier Paiement */}
      <Dialog open={openEditModal} onOpenChange={setOpenEditModal}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-sky-600 flex items-center gap-2 text-base font-bold">
              ✏️ Modifier un paiement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Montant (FCFA) *</Label>
              <Input type="number" value={editMontant} onChange={e => setEditMontant(e.target.value)} className="text-xs" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Type / Motif</Label>
                <Select value={editType} onValueChange={setEditType}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scolarite">Scolarité</SelectItem>
                    <SelectItem value="inscription">Inscription</SelectItem>
                    <SelectItem value="cantine">Cantine</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="materiel">Tenue / Matériel</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Mode</Label>
                <Select value={editMode} onValueChange={setEditMode}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="especes">Espèces</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="cheque">Chèque</SelectItem>
                    <SelectItem value="virement">Virement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">N° Transaction / Référence</Label>
              <Input placeholder="Référence..." value={editTx} onChange={e => setEditTx(e.target.value)} className="text-xs" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpenEditModal(false)}>Annuler</Button>
            <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white" onClick={handleSaveEdit}>
              Enregistrer la modification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Annuler Paiement */}
      <Dialog open={openCancelModal} onOpenChange={setOpenCancelModal}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2 text-base font-bold">
              🚫 Annuler un paiement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 font-medium">
              ⚠️ L'annulation ajustera le solde de l'élève et marquera la transaction comme annulée.
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Motif de l'annulation *</Label>
              <Input
                placeholder="Raison de l'annulation (ex: Erreur de saisie, chèque rejeté...)"
                value={cancelMotif}
                onChange={e => setCancelMotif(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpenCancelModal(false)}>Fermer</Button>
            <Button size="sm" variant="destructive" onClick={handleConfirmCancel}>
              Confirmer l'annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
