import { useState, useEffect, useMemo } from 'react';
import apiClient from '@/lib/apiClient';
import { printReceipt, generateReceiptNumber, type ReceiptData } from '@/lib/receiptPrinter';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Layout } from '@/components/Layout';
import { AppLogoLoader } from '@/components/AppLogoLoader';
import { DataTable, type Column } from '@/components/DataTable';
import { StatsCard, MetricCard } from '@/components/Stats';
import { FinanceAreaChart } from '@/components/Charts';
import { formatStudentName, formatCurrency, formatDate, getStatusBadgeColor } from '@/lib/index';
import type { Payment, KPICard, Student, School, ClassRoom } from '@/lib/index';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Download, FileText, DollarSign, AlertCircle, TrendingUp, Calendar, Printer, XCircle, Search, User, CheckCircle2, RotateCcw, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { springPresets, fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';

export default function Finance() {
  const [caisseOpen, setCaisseOpen] = useState(false);
  const [paymentsList, setPaymentsList] = useState<Payment[]>([]);

  // Vérification du rôle administrateur
  const userRole = localStorage.getItem('user_role') || '';
  const isAdmin = ['admin', 'direction_fondation', 'superuser'].includes(userRole);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [schoolsList, setSchoolsList] = useState<School[]>([]);
  const [classesList, setClassesList] = useState<ClassRoom[]>([]);
  const [viewingReceiptPayment, setViewingReceiptPayment] = useState<Payment | null>(null);

  const [createPaymentOpen, setCreatePaymentOpen] = useState(false);
  const { toast } = useToast();

  // Form states
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState('scolarite');
  const [paymentMode, setPaymentMode] = useState('mobile_money');
  const [paymentStatus, setPaymentStatus] = useState('paye');
  const [transactionNumber, setTransactionNumber] = useState('');

  // Finalize pre-registration states
  const [finalizeStudent, setFinalizeStudent] = useState<Student | null>(null);
  const [finalizeAmount, setFinalizeAmount] = useState('20000');
  const [finalizeType, setFinalizeType] = useState('inscription');
  const [finalizeMode, setFinalizeMode] = useState('mobile_money');
  const [finalizeTxNumber, setFinalizeTxNumber] = useState('');
  const [finalizeClassId, setFinalizeClassId] = useState('');

  // Cancel payment states (§1.8)
  const [cancelPayment, setCancelPayment] = useState<Payment | null>(null);
  const [cancelMotif, setCancelMotif] = useState('');

  // Student specific on-demand payments states
  const [filterStudentId, setFilterStudentId] = useState<string>('all');
  const [studentSpecificPayments, setStudentSpecificPayments] = useState<Payment[] | null>(null);
  const [isLoadingStudentPayments, setIsLoadingStudentPayments] = useState(false);
  const [studentFilterSearch, setStudentFilterSearch] = useState('');

  const selectedStudentObj = useMemo(() => {
    if (!filterStudentId || filterStudentId === 'all') return null;
    return studentsList.find((s) => String(s.id) === String(filterStudentId)) || null;
  }, [filterStudentId, studentsList]);

  const filteredStudentsForLookup = useMemo(() => {
    if (!studentFilterSearch.trim()) return studentsList.slice(0, 50);
    const q = studentFilterSearch.toLowerCase();
    return studentsList.filter((s) =>
      (s.firstName && s.firstName.toLowerCase().includes(q)) ||
      (s.lastName && s.lastName.toLowerCase().includes(q)) ||
      (s.matricule && s.matricule.toLowerCase().includes(q))
    ).slice(0, 50);
  }, [studentsList, studentFilterSearch]);

  const refreshStudentPayments = async (studentId: string) => {
    if (!studentId || studentId === 'all') {
      setStudentSpecificPayments(null);
      return;
    }
    setIsLoadingStudentPayments(true);
    try {
      const data = await apiClient.getPayments({ eleve_id: studentId });
      setStudentSpecificPayments(data || []);
    } catch (e) {
      console.error("Erreur de chargement des paiements de l'élève:", e);
    } finally {
      setIsLoadingStudentPayments(false);
    }
  };

  const loadData = async () => {
    try {
      const [paymentsData, studentsData, schoolsData, classesData] = await Promise.all([
        apiClient.getPayments({ limit: 100 }),
        apiClient.getStudents(),
        apiClient.getSchools(),
        apiClient.getClasses()
      ]);
      if (paymentsData && paymentsData.length > 0) {
        setPaymentsList(paymentsData);
      }
      if (studentsData) {
        setStudentsList(studentsData);
      }
      if (schoolsData) {
        setSchoolsList(schoolsData);
      }
      if (classesData) {
        setClassesList(classesData);
      }
      if (filterStudentId && filterStudentId !== 'all') {
        refreshStudentPayments(filterStudentId);
      }
    } catch (err) {
      console.error("Failed to fetch finance data from API", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePrintReceipt = (payment: Payment, student: any, school: any, className: string) => {
    const receiptData: ReceiptData = {
      receiptNumber: payment.receiptNumber || generateReceiptNumber(payment.id),
      paymentId: payment.id,
      amount: payment.amount,
      type: payment.type,
      mode: payment.mode,
      status: payment.status,
      date: payment.date,
      transactionNumber: (payment as any).transactionNumber,
      studentName: student ? `${formatStudentName(student)}` : 'N/A',
      studentMatricule: student?.matricule ?? 'N/A',
      studentClass: className,
      studentPhoto: student?.photo,
      schoolName: school?.name ?? 'Hînneh Éducation',
      schoolCode: school?.code,
      schoolCity: school?.city,
      schoolRegion: school?.region,
      anneeScolaire: '2025 - 2026',
    };
    printReceipt(receiptData);
  };

  const handleOpenFinalizeDialog = (student: Student) => {
    setFinalizeStudent(student);
    setFinalizeClassId(student.classId || '');
    setFinalizeAmount('20000');
    setFinalizeType('inscription');
    setFinalizeMode('mobile_money');
    setFinalizeTxNumber('');
  };

  const handleFinalizeRegistration = async () => {
    if (!finalizeStudent) return;
    if (!finalizeAmount) {
      toast({
        variant: "destructive",
        title: "Montant manquant",
        description: "Veuillez spécifier le montant perçu.",
      });
      return;
    }

    try {
      const paymentPayload = {
        montant: Number(finalizeAmount),
        type: finalizeType,
        mode: finalizeMode,
        statut: 'paye',
        eleve_id: Number(finalizeStudent.id),
        frais_annexe_valide: true,
        numero_transaction: finalizeTxNumber || null,
        date_echeance: null as string | null
      };

      const createdPayment = await apiClient.createPayment(paymentPayload);

      const studentPayload = {
        statut: 'actif',
        classe_id: finalizeClassId ? Number(finalizeClassId) : null
      };
      await apiClient.updateStudent(finalizeStudent.id, studentPayload);

      toast({
        title: "Inscription finalisée !",
        description: `L'élève ${formatStudentName(finalizeStudent)} est désormais actif et son paiement a été validé.`,
      });

      setFinalizeStudent(null);
      await loadData();

      const schoolObj = schoolsList.find((s) => String(s.id) === String(finalizeStudent.schoolId));
      const classObj = classesList.find((c) => String(c.id) === String(finalizeClassId));
      handlePrintReceipt(createdPayment, finalizeStudent, schoolObj, classObj?.name ?? 'N/A');

    } catch (err: any) {
      console.error("Error finalizing registration:", err);
      const detail = err.response?.data?.detail || "Impossible de finaliser l'inscription.";
      toast({
        variant: "destructive",
        title: "Erreur",
        description: typeof detail === "string" ? detail : JSON.stringify(detail),
      });
    }
  };



  const handleCreatePayment = async () => {
    if (!selectedStudentId || !amount) {
      toast({
        variant: "destructive",
        title: "Champs manquants",
        description: "Veuillez sélectionner un élève et spécifier un montant.",
      });
      return;
    }

    try {
      const payload = {
        montant: Number(amount),
        type: paymentType,
        mode: paymentMode,
        statut: paymentStatus,
        eleve_id: Number(selectedStudentId),
        frais_annexe_valide: true,
        numero_transaction: transactionNumber || null,
        date_echeance: null as string | null
      };

      await apiClient.createPayment(payload);

      toast({
        title: "Paiement enregistré",
        description: "Le paiement a été enregistré et validé avec succès.",
      });

      // Clear fields
      setSelectedStudentId('');
      setAmount('');
      setPaymentType('scolarite');
      setPaymentMode('mobile_money');
      setPaymentStatus('paye');
      setTransactionNumber('');
      setCreatePaymentOpen(false);

      await loadData();
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || "Impossible d'enregistrer le paiement.";
      toast({
        variant: "destructive",
        title: "Erreur d'enregistrement",
        description: typeof detail === "string" ? detail : JSON.stringify(detail),
      });
    }
  };

  const handleCancelPayment = async () => {
    if (!cancelPayment) return;
    try {
      await apiClient.cancelPayment(cancelPayment.id, cancelMotif);
      toast({ title: 'Paiement annulé', description: 'L\u2019historique est conservé. Aucune suppression effectuée.' });
      setCancelPayment(null);
      setCancelMotif('');
      await loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: err?.response?.data?.detail || 'Impossible d\u2019annuler ce paiement.' });
    }
  };

  const totalRecettes = paymentsList
    .filter((p) => p.status === 'paye')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalImpayes = paymentsList
    .filter((p) => p.status === 'en_attente')
    .reduce((sum, p) => sum + p.amount, 0);

  const tauxRecouvrement = ((totalRecettes / (totalRecettes + totalImpayes)) * 100).toFixed(1);

  const totalDepenses = totalRecettes * 0.65;

  const financeKPIs: KPICard[] = [
    {
      id: 'finance-kpi-1',
      title: 'Recettes totales',
      value: formatCurrency(totalRecettes),
      trend: 12.5,
      trendDirection: 'up',
      period: 'ce mois',
      color: 'primary',
    },
    {
      id: 'finance-kpi-2',
      title: 'Arriérés',
      value: formatCurrency(totalImpayes),
      trend: -5.3,
      trendDirection: 'down',
      period: 'en baisse',
      color: 'destructive',
    },
    {
      id: 'finance-kpi-3',
      title: 'Taux de recouvrement',
      value: `${tauxRecouvrement}%`,
      trend: 3.8,
      trendDirection: 'up',
      period: 'vs mois dernier',
      color: 'accent',
    },
    {
      id: 'finance-kpi-4',
      title: 'Dépenses',
      value: formatCurrency(totalDepenses),
      period: 'ce mois',
      color: 'secondary',
    },
  ];

  const paymentColumns: Column[] = [
    {
      key: 'student',
      label: 'Élève',
      render: (_v, payment: Payment) => {
        const student = studentsList.find((s) => s.id === payment.studentId);
        return student ? `${formatStudentName(student)}` : 'N/A';
      },
    },
    {
      key: 'matricule',
      label: 'Matricule',
      render: (_v, payment: Payment) => {
        const student = studentsList.find((s) => s.id === payment.studentId);
        return student ? <span className="font-mono text-sm">{student.matricule}</span> : 'N/A';
      },
    },
    {
      key: 'amount',
      label: 'Montant',
      render: (_v, payment: Payment) => (
        <span className="font-semibold">{formatCurrency(payment.amount)}</span>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (_v, payment: Payment) => {
        const typeLabels: Record<string, string> = {
          scolarite: 'Scolarité',
          inscription: 'Inscription',
          cantine: 'Cantine',
          transport: 'Transport',
          autre: 'Autre',
        };
        return <Badge variant="outline">{typeLabels[payment.type]}</Badge>;
      },
    },
    {
      key: 'date',
      label: 'Date',
      render: (_v, payment: Payment) => formatDate(payment.date),
    },
    {
      key: 'date_acquittement',
      label: "Date d'acquittement",
      render: (_v, payment: Payment) =>
        payment.date_acquittement
          ? formatDate(payment.date_acquittement)
          : payment.status === 'paye'
          ? formatDate(payment.date)
          : '—',
    },
    {
      key: 'mode',
      label: 'Mode',
      render: (_v, payment: Payment) => {
        const modeLabels: Record<string, string> = {
          especes: 'Espèces',
          mobile_money: 'Mobile Money',
          virement: 'Virement',
          carte: 'Carte',
        };
        return modeLabels[payment.mode];
      },
    },
    {
      key: 'status',
      label: 'Statut',
      render: (_v, payment: Payment) => {
        const statusLabels: Record<string, string> = {
          paye: 'Payé',
          en_attente: 'En attente',
          annule: 'Annulé',
        };
        return (
          <Badge variant={getStatusBadgeColor(payment.status)}>
            {statusLabels[payment.status]}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_v, payment: Payment) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewingReceiptPayment(payment)}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Aperçu
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const student = studentsList.find((s) => s.id === payment.studentId);
              const school = schoolsList.find((s) => String(s.id) === String(student?.schoolId));
              const classObj = classesList.find((c) => String(c.id) === String(student?.classId));
              handlePrintReceipt(payment, student, school, classObj?.name ?? 'N/A');
            }}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Imprimer
          </Button>
          {payment.status !== 'annule' && isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={() => { setCancelPayment(payment); setCancelMotif(''); }}
            >
              <XCircle className="h-4 w-4" />
              Annuler
            </Button>
          )}
        </div>
      ),
    },
  ];

  const overduePayments = paymentsList.filter(
    (p) => p.status === 'en_attente' && p.dueDate && p.dueDate < new Date()
  );

  const overdueColumns: Column[] = [
    {
      key: 'student',
      label: 'Élève',
      render: (_v, payment: Payment) => {
        const student = studentsList.find((s) => s.id === payment.studentId);
        return student ? `${formatStudentName(student)}` : 'N/A';
      },
    },
    {
      key: 'amount',
      label: 'Montant dû',
      render: (_v, payment: Payment) => (
        <span className="font-semibold text-destructive">{formatCurrency(payment.amount)}</span>
      ),
    },
    {
      key: 'dueDate',
      label: 'Date limite',
      render: (_v, payment: Payment) => (payment.dueDate ? formatDate(payment.dueDate) : 'N/A'),
    },
    {
      key: 'daysOverdue',
      label: 'Jours de retard',
      render: (_v, payment: Payment) => {
        if (!payment.dueDate) return 'N/A';
        const days = Math.floor(
          (new Date().getTime() - payment.dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return (
          <Badge variant="destructive" className="font-mono">
            {days} jours
          </Badge>
        );
      },
    },
    {
      key: 'parent',
      label: 'Contact parent',
      render: (_v, payment: Payment) => {
        const student = studentsList.find((s) => s.id === payment.studentId);
        if (!student) return 'N/A';
        return (student as any).contactParent || (student as any).parentPhone || 'N/A';
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: () => (
        <Button variant="outline" size="sm" className="gap-2">
          <AlertCircle className="h-4 w-4" />
          Relancer
        </Button>
      ),
    },
  ];

  const pendingRegistrationStudents = studentsList.filter(
    (student) => student.status === 'preinscrit'
  );

  const pendingColumns: Column[] = [
    {
      key: 'photo',
      label: 'Photo',
      render: (_v, student: Student) => (
        <Avatar className="h-10 w-10">
          <AvatarImage src={student.photo} className="object-cover" />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {student.firstName[0]}
            {student.lastName[0]}
          </AvatarFallback>
        </Avatar>
      ),
    },
    {
      key: 'student',
      label: 'Nom complet',
      render: (_v, student: Student) => (
        <span className="font-semibold">{formatStudentName(student)}</span>
      ),
    },
    {
      key: 'matricule',
      label: 'Matricule',
      render: (_v, student: Student) => (
        <span className="font-mono text-sm">{student.matricule}</span>
      ),
    },
    {
      key: 'dateOfBirth',
      label: 'Né(e) le',
      render: (_v, student: Student) => formatDate(student.dateOfBirth),
    },
    {
      key: 'school',
      label: 'Établissement',
      render: (_v, student: Student) => {
        const school = schoolsList.find((s) => String(s.id) === String(student.schoolId));
        return school ? school.name : 'N/A';
      },
    },
    {
      key: 'class',
      label: 'Classe souhaitée',
      render: (_v, student: Student) => {
        const classObj = classesList.find((c) => String(c.id) === String(student.classId));
        return classObj ? classObj.name : 'N/A';
      },
    },
    {
      key: 'parent',
      label: 'Contacts parent',
      render: (_v, student: Student) => (
        <div className="flex flex-col text-xs">
          <span>{student.parentPhone || student.parentEmail || 'N/A'}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_v, student: Student) => (
        <Button
          size="sm"
          className="gap-2"
          onClick={() => handleOpenFinalizeDialog(student)}
        >
          <DollarSign className="h-4 w-4" />
          Inscrire & Encaisser
        </Button>
      ),
    },
  ];

  const todayCashFlow = paymentsList
    .filter(
      (p) =>
        p.status === 'paye' &&
        p.mode === 'especes' &&
        p.date.toDateString() === new Date().toDateString()
    )
    .reduce((sum, p) => sum + p.amount, 0);

  const handleToggleCaisse = () => {
    setCaisseOpen(!caisseOpen);
  };

  return (
    <Layout>
      <motion.div
        className="space-y-8 p-8"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={staggerItem}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Finances</h1>
              <p className="text-muted-foreground mt-2">
                Gestion financière et comptabilité de nos écoles
              </p>
            </div>
            <Dialog open={createPaymentOpen} onOpenChange={setCreatePaymentOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2">
                  <DollarSign className="h-5 w-5" />
                  Enregistrer un paiement
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Enregistrer un Paiement</DialogTitle>
                  <DialogDescription>
                    Saisissez les informations financières du paiement d'un élève.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="student">Élève *</Label>
                    <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner l'élève" /></SelectTrigger>
                      <SelectContent>
                        {studentsList.map((student: any) => (
                          <SelectItem key={student.id} value={String(student.id)}>
                            {formatStudentName(student)} ({student.matricule})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Montant * (FCFA)</Label>
                    <Input id="amount" type="number" placeholder="ex: 50000" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1">
                      <Label htmlFor="type">Type de frais *</Label>
                      <Select value={paymentType} onValueChange={setPaymentType}>
                        <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scolarite">Scolarité</SelectItem>
                          <SelectItem value="inscription">Inscription</SelectItem>
                          <SelectItem value="cantine">Cantine</SelectItem>
                          <SelectItem value="transport">Transport</SelectItem>
                          <SelectItem value="autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="mode">Mode de paiement *</Label>
                      <Select value={paymentMode} onValueChange={setPaymentMode}>
                        <SelectTrigger><SelectValue placeholder="Mode" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mobile_money">Mobile Money</SelectItem>
                          <SelectItem value="especes">Espèces</SelectItem>
                          <SelectItem value="virement">Virement</SelectItem>
                          <SelectItem value="carte">Carte</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1">
                      <Label htmlFor="status">Statut du paiement *</Label>
                      <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                        <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paye">Payé</SelectItem>
                          <SelectItem value="en_attente">En attente</SelectItem>
                          <SelectItem value="annule">Annulé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="transactionNumber">N° de transaction</Label>
                      <Input id="transactionNumber" placeholder="Optionnel" value={transactionNumber} onChange={(e) => setTransactionNumber(e.target.value)} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreatePaymentOpen(false)}>Annuler</Button>
                  <Button onClick={handleCreatePayment}>Enregistrer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="payments">Paiements</TabsTrigger>
            <TabsTrigger value="caisse">Caisse</TabsTrigger>
            <TabsTrigger value="en_attente">Attente Inscription</TabsTrigger>
            <TabsTrigger value="reports">Rapports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <motion.div
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {financeKPIs.map((kpi) => (
                <motion.div key={kpi.id} variants={staggerItem}>
                  <StatsCard kpi={kpi} />
                </motion.div>
              ))}
            </motion.div>

            <motion.div variants={fadeInUp} transition={springPresets.gentle}>
              <Card>
                <CardHeader>
                  <CardTitle>Évolution financière</CardTitle>
                  <CardDescription>
                    Recettes et dépenses sur les 6 derniers mois
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FinanceAreaChart payments={paymentsList} />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              className="grid gap-6 md:grid-cols-3"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={staggerItem}>
                <MetricCard
                  label="Paiements ce mois"
                  value={paymentsList.filter((p) => p.status === 'paye').length}
                  icon={<DollarSign className="h-5 w-5" />}
                  color="primary"
                />
              </motion.div>
              <motion.div variants={staggerItem}>
                <MetricCard
                  label="En attente"
                  value={paymentsList.filter((p) => p.status === 'en_attente').length}
                  icon={<AlertCircle className="h-5 w-5" />}
                  color="warning"
                />
              </motion.div>
              <motion.div variants={staggerItem}>
                <MetricCard
                  label="Taux de ponctualité"
                  value="78.5%"
                  icon={<TrendingUp className="h-5 w-5" />}
                  color="accent"
                />
              </motion.div>
            </motion.div>
          </TabsContent>

          <TabsContent value="payments">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springPresets.gentle}
              className="space-y-6"
            >
              {/* Carte de recherche / consultation des paiements par élève à la demande */}
              <Card className="border-primary/20 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 dark:from-slate-900/60 dark:to-slate-800/40 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Search className="h-5 w-5 text-primary" />
                        Consultation ciblée des paiements d'un élève
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Sélectionnez un élève pour charger instantanément ses paiements réels à la demande, sans aucun ralentissement de l'application.
                      </CardDescription>
                    </div>
                    {filterStudentId !== 'all' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFilterStudentId('all');
                          setStudentSpecificPayments(null);
                        }}
                        className="gap-1.5 h-8 text-xs shrink-0"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Voir les 100 derniers
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Filtrer les élèves par nom, prénom ou matricule..."
                          value={studentFilterSearch}
                          onChange={(e) => setStudentFilterSearch(e.target.value)}
                          className="pl-9 h-10 bg-background"
                        />
                      </div>
                    </div>
                    <div className="w-full md:w-96">
                      <Select
                        value={filterStudentId}
                        onValueChange={(val) => {
                          setFilterStudentId(val);
                          refreshStudentPayments(val);
                        }}
                      >
                        <SelectTrigger className="h-10 bg-background">
                          <SelectValue placeholder="Choisir un élève..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          <SelectItem value="all">-- Tous les 100 derniers paiements --</SelectItem>
                          {filteredStudentsForLookup.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {formatStudentName(s)} ({s.matricule || 'Sans matricule'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {isLoadingStudentPayments && (
                    <div className="flex items-center justify-center py-8">
                      <AppLogoLoader
                        size="sm"
                        message="Chargement instantané des paiements de l'élève..."
                      />
                    </div>
                  )}

                  {/* Résumé de l'élève sélectionné */}
                  {!isLoadingStudentPayments && selectedStudentObj && (
                    <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 border">
                            <AvatarImage src={selectedStudentObj.photo} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                              {selectedStudentObj.lastName?.[0]}{selectedStudentObj.firstName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-base">
                                {formatStudentName(selectedStudentObj)}
                              </h4>
                              <Badge variant="outline" className="font-mono text-xs">
                                {selectedStudentObj.matricule}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Classe: <span className="font-medium text-foreground">{classesList.find((c) => String(c.id) === String(selectedStudentObj.classId))?.name || 'N/A'}</span>
                              {' • '}
                              Établissement: <span className="font-medium text-foreground">{schoolsList.find((sc) => String(sc.id) === String(selectedStudentObj.schoolId))?.name || 'N/A'}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Total Payé</div>
                            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(
                                (studentSpecificPayments || [])
                                  .filter((p) => p.status === 'paye')
                                  .reduce((sum, p) => sum + p.amount, 0)
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">En attente / Reste</div>
                            <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                              {formatCurrency(
                                (studentSpecificPayments || [])
                                  .filter((p) => p.status === 'en_attente')
                                  .reduce((sum, p) => sum + p.amount, 0)
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Transactions</div>
                            <div className="text-lg font-bold">
                              {(studentSpecificPayments || []).length}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <DataTable
                columns={paymentColumns}
                data={studentSpecificPayments !== null ? studentSpecificPayments : paymentsList}
                title={
                  studentSpecificPayments !== null
                    ? `Paiements réels de ${selectedStudentObj ? formatStudentName(selectedStudentObj) : "l'élève"} (${studentSpecificPayments.length})`
                    : `100 Derniers paiements (${paymentsList.length})`
                }
                searchable
                exportable
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="overdue">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springPresets.gentle}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    Arriérés en retard
                  </CardTitle>
                  <CardDescription>
                    {overduePayments.length} factures en retard pour un montant total de{' '}
                    {formatCurrency(overduePayments.reduce((sum, p) => sum + p.amount, 0))}
                  </CardDescription>
                </CardHeader>
              </Card>

              <DataTable
                columns={overdueColumns}
                data={overduePayments}
                title="Factures en retard"
                searchable
                exportable
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="caisse">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springPresets.gentle}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Caisse du jour</CardTitle>
                      <CardDescription>
                        {new Date().toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </CardDescription>
                    </div>
                    <Button
                      onClick={handleToggleCaisse}
                      variant={caisseOpen ? 'destructive' : 'default'}
                      className="gap-2"
                    >
                      <Calendar className="h-4 w-4" />
                      {caisseOpen ? 'Fermer la caisse' : 'Ouvrir la caisse'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-3">
                    <MetricCard
                      label="Espèces du jour"
                      value={formatCurrency(todayCashFlow)}
                      icon={<DollarSign className="h-5 w-5" />}
                      color="primary"
                    />
                    <MetricCard
                      label="Transactions"
                      value={
                        paymentsList.filter(
                          (p) =>
                            p.status === 'paye' &&
                            p.mode === 'especes' &&
                            p.date.toDateString() === new Date().toDateString()
                        ).length
                      }
                      icon={<FileText className="h-5 w-5" />}
                      color="secondary"
                    />
                    <MetricCard
                      label="Statut caisse"
                      value={caisseOpen ? 'Ouverte' : 'Fermée'}
                      color={caisseOpen ? 'accent' : 'muted'}
                    />
                  </div>

                  <Card className="bg-muted/50">
                    <CardHeader>
                      <CardTitle className="text-lg">Résumé des flux</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Espèces</span>
                        <span className="font-semibold">{formatCurrency(todayCashFlow)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Mobile Money</span>
                        <span className="font-semibold">
                          {formatCurrency(
                            paymentsList
                              .filter(
                                (p) =>
                                  p.status === 'paye' &&
                                  p.mode === 'mobile_money' &&
                                  p.date.toDateString() === new Date().toDateString()
                              )
                              .reduce((sum, p) => sum + p.amount, 0)
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Virement</span>
                        <span className="font-semibold">
                          {formatCurrency(
                            paymentsList
                              .filter(
                                (p) =>
                                  p.status === 'paye' &&
                                  p.mode === 'virement' &&
                                  p.date.toDateString() === new Date().toDateString()
                              )
                              .reduce((sum, p) => sum + p.amount, 0)
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Carte</span>
                        <span className="font-semibold">
                          {formatCurrency(
                            paymentsList
                              .filter(
                                (p) =>
                                  p.status === 'paye' &&
                                  p.mode === 'carte' &&
                                  p.date.toDateString() === new Date().toDateString()
                              )
                              .reduce((sum, p) => sum + p.amount, 0)
                          )}
                        </span>
                      </div>
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Total du jour</span>
                          <span className="text-xl font-bold text-primary">
                            {formatCurrency(
                              paymentsList
                                .filter(
                                  (p) =>
                                    p.status === 'paye' &&
                                    p.date.toDateString() === new Date().toDateString()
                                )
                                .reduce((sum, p) => sum + p.amount, 0)
                            )}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="reports">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springPresets.gentle}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Rapports financiers</CardTitle>
                  <CardDescription>
                    Exportez les rapports financiers en PDF ou Excel
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="bg-muted/50">
                      <CardHeader>
                        <CardTitle className="text-lg">Rapport mensuel</CardTitle>
                        <CardDescription>Synthèse du mois en cours</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button variant="outline" className="w-full gap-2">
                          <Download className="h-4 w-4" />
                          Télécharger PDF
                        </Button>
                        <Button variant="outline" className="w-full gap-2">
                          <Download className="h-4 w-4" />
                          Télécharger Excel
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-muted/50">
                      <CardHeader>
                        <CardTitle className="text-lg">Rapport trimestriel</CardTitle>
                        <CardDescription>Synthèse du trimestre 2</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button variant="outline" className="w-full gap-2">
                          <Download className="h-4 w-4" />
                          Télécharger PDF
                        </Button>
                        <Button variant="outline" className="w-full gap-2">
                          <Download className="h-4 w-4" />
                          Télécharger Excel
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-muted/50">
                      <CardHeader>
                        <CardTitle className="text-lg">Rapport annuel</CardTitle>
                        <CardDescription>Synthèse de l'année 2025-2026</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button variant="outline" className="w-full gap-2">
                          <Download className="h-4 w-4" />
                          Télécharger PDF
                        </Button>
                        <Button variant="outline" className="w-full gap-2">
                          <Download className="h-4 w-4" />
                          Télécharger Excel
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-muted/50">
                      <CardHeader>
                        <CardTitle className="text-lg">Rapport personnalisé</CardTitle>
                        <CardDescription>Choisissez la période</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button variant="outline" className="w-full gap-2">
                          <Download className="h-4 w-4" />
                          Télécharger PDF
                        </Button>
                        <Button variant="outline" className="w-full gap-2">
                          <Download className="h-4 w-4" />
                          Télécharger Excel
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="en_attente">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springPresets.gentle}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-primary" />
                    Préinscriptions en attente de validation
                  </CardTitle>
                  <CardDescription>
                    {pendingRegistrationStudents.length} élèves préinscrits en attente de validation physique et du premier paiement.
                  </CardDescription>
                </CardHeader>
              </Card>

              <DataTable
                columns={pendingColumns}
                data={pendingRegistrationStudents}
                title="Dossiers en attente"
                searchable
                exportable
              />
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>

      <Dialog open={!!finalizeStudent} onOpenChange={(open) => !open && setFinalizeStudent(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Finaliser l'inscription</DialogTitle>
            <DialogDescription>
              Enregistrez le paiement initial pour valider l'inscription de l'élève {formatStudentName(finalizeStudent)}.
            </DialogDescription>
          </DialogHeader>

          {finalizeStudent && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nom Complet</Label>
                <Input disabled value={`${formatStudentName(finalizeStudent)}`} />
              </div>

              <div className="grid gap-2">
                <Label>Matricule</Label>
                <Input disabled className="font-mono" value={finalizeStudent.matricule} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="finalize-classe">Classe d'affectation *</Label>
                <Select value={finalizeClassId} onValueChange={setFinalizeClassId}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner la classe" /></SelectTrigger>
                  <SelectContent>
                    {classesList
                      .filter((cls: any) => String(cls.schoolId) === String(finalizeStudent.schoolId) || String(cls.ecole_id) === String(finalizeStudent.schoolId))
                      .map((cls: any) => (
                        <SelectItem key={cls.id} value={String(cls.id)}>{cls.name || cls.libelle}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="finalize-amount">Montant perçu * (FCFA)</Label>
                <Input
                  id="finalize-amount"
                  type="number"
                  placeholder="ex: 20000"
                  value={finalizeAmount}
                  onChange={(e) => setFinalizeAmount(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label htmlFor="finalize-type">Type de frais *</Label>
                  <Select value={finalizeType} onValueChange={setFinalizeType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inscription">Inscription</SelectItem>
                      <SelectItem value="scolarite">Scolarité</SelectItem>
                      <SelectItem value="cantine">Cantine</SelectItem>
                      <SelectItem value="transport">Transport</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="finalize-mode">Mode de règlement *</Label>
                  <Select value={finalizeMode} onValueChange={setFinalizeMode}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="especes">Espèces</SelectItem>
                      <SelectItem value="virement">Virement</SelectItem>
                      <SelectItem value="carte">Carte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="finalize-tx">N° de transaction / Réf. (Optionnel)</Label>
                <Input
                  id="finalize-tx"
                  placeholder="ex: TX123456"
                  value={finalizeTxNumber}
                  onChange={(e) => setFinalizeTxNumber(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizeStudent(null)}>Annuler</Button>
            <Button onClick={handleFinalizeRegistration}>Valider l'Inscription</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingReceiptPayment} onOpenChange={(open) => !open && setViewingReceiptPayment(null)}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Reçu de Paiement</DialogTitle>
            <DialogDescription>
              Aperçu avant impression du reçu de paiement officiel.
            </DialogDescription>
          </DialogHeader>

          {viewingReceiptPayment && (() => {
            const student = studentsList.find((s) => s.id === viewingReceiptPayment.studentId);
            const school = schoolsList.find((s) => String(s.id) === String(student?.schoolId));
            const classObj = classesList.find((c) => String(c.id) === String(student?.classId));
            const className = classObj ? classObj.name : 'N/A';

            const typeLabels: Record<string, string> = {
              scolarite: 'Scolarité',
              inscription: 'Inscription',
              cantine: 'Cantine',
              transport: 'Transport',
              autre: 'Autre',
            };

            const modeLabels: Record<string, string> = {
              especes: 'Espèces',
              mobile_money: 'Mobile Money',
              virement: 'Virement',
              carte: 'Carte',
            };

            return (
              <div className="space-y-6">
                <div className="border p-4 rounded-lg bg-muted/20 space-y-4">
                  {/* Header */}
                  <div className="flex justify-between items-start border-b pb-3">
                    <div>
                      <h4 className="font-bold text-primary">HÎNNEH ÉDUCATION</h4>
                      <p className="text-xs text-muted-foreground">{school ? school.name : 'Hînneh Éducation'}</p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="font-semibold">{school ? `${school.city}, ${school.region}` : ''}</p>
                      <p className="text-muted-foreground">{school ? school.email : ''}</p>
                    </div>
                  </div>

                  {/* Title & Number */}
                  <div className="text-center">
                    <h3 className="text-lg font-bold uppercase tracking-wider">Reçu de versement</h3>
                    <p className="text-sm font-mono text-muted-foreground">{viewingReceiptPayment.receiptNumber}</p>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <h5 className="font-semibold border-b pb-1 text-muted-foreground">Élève</h5>
                      <div className="flex gap-3 items-center pt-1">
                        <Avatar className="h-12 w-12 border">
                          <AvatarImage src={student?.photo} className="object-cover" />
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {student ? `${student.firstName[0] || ''}${student.lastName[0] || ''}` : 'N/A'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium leading-none mb-1">
                            {student ? `${formatStudentName(student)}` : 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <strong>Matricule :</strong> {student?.matricule || 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <strong>Classe :</strong> {className}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-semibold border-b pb-1 text-muted-foreground">Règlement</h5>
                      <p><strong>Date :</strong> {formatDate(viewingReceiptPayment.date)}</p>
                      <p><strong>Mode :</strong> {modeLabels[viewingReceiptPayment.mode] || viewingReceiptPayment.mode}</p>
                      <p>
                        <strong>Statut : </strong>
                        <span className="text-green-600 font-semibold uppercase">Payé</span>
                      </p>
                      {viewingReceiptPayment.transactionNumber && (
                        <p><strong>N° Trans. :</strong> {viewingReceiptPayment.transactionNumber}</p>
                      )}
                    </div>
                  </div>

                  {/* Table details */}
                  <div className="border-t pt-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 font-medium">Libellé</th>
                          <th className="text-right py-2 font-medium">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-2">Paiement frais de scolarité : {typeLabels[viewingReceiptPayment.type] || viewingReceiptPayment.type}</td>
                          <td className="text-right py-2 font-semibold">{formatCurrency(viewingReceiptPayment.amount)}</td>
                        </tr>
                        <tr className="border-t font-bold text-primary">
                          <td className="py-2">Total Général</td>
                          <td className="text-right py-2">{formatCurrency(viewingReceiptPayment.amount)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <DialogFooter className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setViewingReceiptPayment(null)}>
                    Fermer
                  </Button>
                  <Button onClick={() => handlePrintReceipt(viewingReceiptPayment, student, school, className)}>
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimer le reçu
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Dialog annulation paiement §1.8 */}
      <Dialog open={!!cancelPayment} onOpenChange={v => { if (!v) setCancelPayment(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />Annuler le paiement
            </DialogTitle>
            <DialogDescription>
              Le paiement sera marqué comme annulé. Il restera dans l&apos;historique et ne peut pas être supprimé.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {cancelPayment && (
              <div className="p-3 bg-muted/50 rounded text-sm space-y-1">
                <p><strong>Montant :</strong> {formatCurrency(cancelPayment.amount)}</p>
                <p><strong>Type :</strong> {cancelPayment.type}</p>
                <p><strong>Date :</strong> {formatDate(cancelPayment.date)}</p>
              </div>
            )}
            <div className="space-y-1">
              <Label>Motif d&apos;annulation</Label>
              <Input
                placeholder="Raison de l'annulation..."
                value={cancelMotif}
                onChange={e => setCancelMotif(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelPayment(null)}>Fermer</Button>
            <Button variant="destructive" className="gap-2" onClick={handleCancelPayment}>
              <XCircle className="h-4 w-4" />Confirmer l&apos;annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
