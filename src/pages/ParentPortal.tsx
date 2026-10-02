import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  ChevronDown,
  CreditCard,
  FileText,
  Calendar,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  BookOpen,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  formatCurrency,
  formatDate,
  getStatusBadgeColor,
  type Student,
  type Parent,
  type Evaluation,
  type Payment,
  type Attendance,
  formatStudentName,
} from '@/lib/index';
import type { School, ClassRoom } from '@/lib/index';
const mockStudents: Student[] = [];
const mockParents: Parent[] = [{
  id: 'demo-parent',
  firstName: 'Parent',
  lastName: 'Demo',
  phone: '00000000',
  email: 'parent@demo.com',
  address: '',
  studentIds: [],
  createdAt: new Date(),
}];
const mockEvaluations: Evaluation[] = [];
const mockPayments: Payment[] = [];
const mockAttendance: Attendance[] = [];
const mockSchools: School[] = [];
const mockClasses: ClassRoom[] = [];

const springPresets = {
  gentle: { type: 'spring' as const, stiffness: 300, damping: 35 },
  snappy: { type: 'spring' as const, stiffness: 400, damping: 30 },
};

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: springPresets.gentle,
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function ParentPortal() {
  const currentParent = mockParents[0];
  const parentStudents = mockStudents.filter((s) =>
    currentParent.studentIds.includes(s.id)
  );
  const [selectedStudentId, setSelectedStudentId] = useState(
    parentStudents[0]?.id || ''
  );

  const selectedStudent = mockStudents.find((s) => s.id === selectedStudentId);
  const studentSchool = mockSchools.find(
    (sch) => sch.id === selectedStudent?.schoolId
  );
  const studentClass = mockClasses.find(
    (c) => c.id === selectedStudent?.classId
  );

  const studentEvaluations = mockEvaluations
    .filter((e) => e.studentId === selectedStudentId)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  const studentPayments = mockPayments
    .filter((p) => p.studentId === selectedStudentId)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  const studentAttendance = mockAttendance
    .filter((a) => a.studentId === selectedStudentId)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10);

  const lastEvaluation = studentEvaluations[0];
  const unpaidPayments = studentPayments.filter((p) => p.status === 'en_attente');
  const totalUnpaid = unpaidPayments.reduce((sum, p) => sum + p.amount, 0);

  const thisMonthAttendance = studentAttendance.filter((a) => {
    const now = new Date();
    return (
      a.date.getMonth() === now.getMonth() &&
      a.date.getFullYear() === now.getFullYear()
    );
  });
  const presentCount = thisMonthAttendance.filter(
    (a) => a.status === 'present'
  ).length;
  const attendanceRate =
    thisMonthAttendance.length > 0
      ? Math.round((presentCount / thisMonthAttendance.length) * 100)
      : 0;

  const todayAttendance = studentAttendance.find((a) => {
    const today = new Date();
    return (
      a.date.getDate() === today.getDate() &&
      a.date.getMonth() === today.getMonth() &&
      a.date.getFullYear() === today.getFullYear()
    );
  });

  const isPresentToday = todayAttendance?.status === 'present';

  const messages = [
    {
      id: '1',
      from: 'Direction',
      subject: 'Réunion parents-professeurs',
      date: new Date(2025, 4, 5),
      preview: 'La réunion trimestrielle aura lieu le 15 mai...',
      unread: true,
    },
    {
      id: '2',
      from: 'Enseignant Mathématiques',
      subject: 'Progrès de votre enfant',
      date: new Date(2025, 4, 3),
      preview: 'Je tenais à vous informer des excellents progrès...',
      unread: false,
    },
    {
      id: '3',
      from: 'Service Comptabilité',
      subject: 'Rappel échéance paiement',
      date: new Date(2025, 4, 1),
      preview: 'Nous vous rappelons que l\'échéance du...',
      unread: false,
    },
  ];

  if (!selectedStudent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Aucun élève trouvé</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Aucun élève n'est associé à ce compte parent.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <motion.div
        initial="initial"
        animate="animate"
        variants={staggerContainer}
        className="w-full"
      >
        <div className="bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 py-6">
            <motion.div variants={staggerItem} className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-primary-foreground/20">
                  <AvatarFallback className="bg-primary-foreground/10 text-primary-foreground">
                    {currentParent.lastName[0]}{currentParent.firstName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-lg font-semibold">
                    {formatStudentName(currentParent)}
                  </h1>
                  <p className="text-sm text-primary-foreground/80">Espace Parent</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <User className="h-5 w-5" />
              </Button>
            </motion.div>

            {parentStudents.length > 1 && (
              <motion.div variants={staggerItem}>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger className="w-full bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {parentStudents.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {formatStudentName(student)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 space-y-6">
          <motion.div variants={staggerItem}>
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-20 w-20 border-2 border-border">
                    <AvatarImage src={selectedStudent.photo} />
                    <AvatarFallback className="text-2xl">
                      {selectedStudent.lastName[0]}{selectedStudent.firstName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-xl font-bold">
                          {formatStudentName(selectedStudent)}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {studentClass?.name} • {studentSchool?.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Matricule: {selectedStudent.matricule}
                        </p>
                      </div>
                      <Badge
                        variant={isPresentToday ? 'default' : 'secondary'}
                        className="flex items-center gap-1"
                      >
                        {isPresentToday ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <AlertCircle className="h-3 w-3" />
                        )}
                        {isPresentToday ? 'Présent aujourd\'hui' : 'Absent aujourd\'hui'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem} className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => {}}
            >
              <CreditCard className="h-6 w-6" />
              <span className="text-sm font-semibold">Payer maintenant</span>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => {}}
            >
              <FileText className="h-6 w-6" />
              <span className="text-sm font-semibold">Voir bulletin</span>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => {}}
            >
              <Calendar className="h-6 w-6" />
              <span className="text-sm font-semibold">Justifier absence</span>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => {}}
            >
              <MessageSquare className="h-6 w-6" />
              <span className="text-sm font-semibold">Envoyer message</span>
            </Button>
          </motion.div>

          <motion.div variants={staggerItem}>
            <h3 className="text-lg font-semibold mb-3">Résumé élève</h3>
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Moyenne générale</p>
                      <p className="text-xl font-bold">
                        {selectedStudent.moyenne.toFixed(1)}/20
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Présences ce mois</p>
                      <p className="text-xl font-bold">{attendanceRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Solde dû</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(Math.abs(selectedStudent.solde))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Dernière note</p>
                      <p className="text-xl font-bold">
                        {lastEvaluation ? `${lastEvaluation.note}/20` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes récentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {studentEvaluations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucune note disponible
                  </p>
                ) : (
                  studentEvaluations.map((evaluation) => (
                    <div
                      key={evaluation.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{evaluation.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {evaluation.type} • Trimestre {evaluation.trimester} •{' '}
                          {formatDate(evaluation.date)}
                        </p>
                        {evaluation.appreciation && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {evaluation.appreciation}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{evaluation.note}</p>
                        <p className="text-xs text-muted-foreground">/20</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Absences & retards</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {studentAttendance.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucune donnée de présence
                  </p>
                ) : (
                  studentAttendance.map((attendance) => (
                    <div
                      key={attendance.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            attendance.status === 'present'
                              ? 'bg-green-500'
                              : attendance.status === 'absent'
                              ? 'bg-red-500'
                              : attendance.status === 'retard'
                              ? 'bg-yellow-500'
                              : 'bg-blue-500'
                          }`}
                        />
                        <div>
                          <p className="text-sm font-medium">
                            {formatDate(attendance.date)}
                          </p>
                          {attendance.justification && (
                            <p className="text-xs text-muted-foreground">
                              {attendance.justification}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant={getStatusBadgeColor(attendance.status)}>
                        {attendance.status === 'present'
                          ? 'Présent'
                          : attendance.status === 'absent'
                          ? 'Absent'
                          : attendance.status === 'retard'
                          ? 'Retard'
                          : 'Excusé'}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Paiements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {studentPayments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun paiement enregistré
                  </p>
                ) : (
                  studentPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm capitalize">
                          {payment.type.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(payment.date)}
                          {payment.dueDate && (
                            <>
                              {' • Échéance: '}
                              {formatDate(payment.dueDate)}
                            </>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {payment.mode.replace('_', ' ')}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-lg font-bold">
                          {formatCurrency(payment.amount)}
                        </p>
                        <Badge variant={getStatusBadgeColor(payment.status)}>
                          {payment.status === 'paye'
                            ? 'Payé'
                            : payment.status === 'en_attente'
                            ? 'En attente'
                            : 'Annulé'}
                        </Badge>
                        {payment.status === 'en_attente' && (
                          <Button size="sm" className="w-full mt-2">
                            Payer
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Messages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  >
                    <div
                      className={`h-2 w-2 rounded-full mt-2 ${
                        message.unread ? 'bg-primary' : 'bg-transparent'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm font-medium truncate ${
                            message.unread ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {message.subject}
                        </p>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(message.date)}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">{message.from}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {message.preview}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
