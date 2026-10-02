/**
 * Espace Parent d'Élèves — Portail complet de suivi scolaire & financier
 * Tableau de bord, notes, présences, scolarité, cantine, car, messagerie, Coran
 */
import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, BookOpen, Calendar, DollarSign, MessageSquare, Moon,
  Bell, TrendingUp, TrendingDown, Award, AlertTriangle,
  CheckCircle, Clock, Phone, Mail, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, Download,
  Printer, Eye, Send, FileText, Star, BarChart3, Shield,
  Home, GraduationCap, Heart, Wallet, Inbox,
  ArrowUpRight, ArrowDownRight, Check, X, Info,
  CreditCard, Smartphone, History, Plus, Building,
  Bus, Utensils, QrCode, Receipt, Copy, CheckCheck,
  RefreshCw, SlidersHorizontal, CheckCircle2, ChevronDown, Sparkles,
  LayoutGrid, Layers, Activity, Target, Zap, UserX, AlertCircle,
  UserPlus, Users, Trash2, Search
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell
} from 'recharts';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { formatStudentName, formatCurrency, formatDate } from '@/lib/index';
import type { Student, School, ClassRoom, Evaluation, Payment, Attendance as AttendanceType } from '@/lib/index';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import apiClient from '@/lib/apiClient';
import { printBulletins } from '@/lib/bulletinPrinter';
import { printSchedule } from '@/lib/printSchedule';
import { printReceipt } from '@/lib/receiptPrinter';
import { processCinetPayPayment, getOperatorDisplayName } from '@/lib/cinetpay';

const MONTHS_ORDER = ['Septembre', 'Octobre', 'Novembre', 'Décembre', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai'];

const PAYMENT_METHODS = [
  {
    id: 'wave',
    name: 'WAVE CI',
    subtitle: 'Débit API CinetPay (0% frais)',
    badgeText: 'API CinetPay • Wave',
    icon: Smartphone,
    color: 'bg-sky-50 text-sky-800 border-sky-200 hover:border-sky-400',
    selectedRing: 'ring-2 ring-sky-500 bg-sky-50/80',
    accentColor: 'text-sky-600',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
    description: 'Débit automatique sécurisé par l\'API CinetPay via Wave CI. Entrez votre numéro et confirmez l\'autorisation sur votre app Wave.',
  },
  {
    id: 'orange_money',
    name: 'ORANGE MONEY',
    subtitle: 'Débit API CinetPay (*144#)',
    badgeText: 'API CinetPay • Orange',
    icon: Smartphone,
    color: 'bg-orange-50 text-orange-950 border-orange-200 hover:border-orange-400',
    selectedRing: 'ring-2 ring-orange-500 bg-orange-50/80',
    accentColor: 'text-orange-600',
    badgeClass: 'bg-orange-100 text-orange-900 border-orange-300',
    description: 'L\'API CinetPay initie la transaction de débit direct Orange Money et vous invite à valider le prélèvement via votre code secret.',
  },
  {
    id: 'mtn_money',
    name: 'MTN MoMo',
    subtitle: 'Débit API CinetPay (*133#)',
    badgeText: 'API CinetPay • MTN',
    icon: Smartphone,
    color: 'bg-amber-50 text-amber-900 border-amber-200 hover:border-amber-400',
    selectedRing: 'ring-2 ring-amber-500 bg-amber-50/80',
    accentColor: 'text-amber-600',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    description: 'L\'API CinetPay émet un prompt USSD direct sur votre mobile MTN MoMo pour débiter le montant spécifié avec votre code secret PIN.',
  },
  {
    id: 'moov_money',
    name: 'MOOV MONEY',
    subtitle: 'Débit API CinetPay (*155#)',
    badgeText: 'API CinetPay • Moov',
    icon: Smartphone,
    color: 'bg-blue-50 text-blue-900 border-blue-200 hover:border-blue-400',
    selectedRing: 'ring-2 ring-blue-500 bg-blue-50/80',
    accentColor: 'text-blue-600',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
    description: 'L\'API CinetPay déclenche le débit du montant indiqué sur votre compte Moov Money après saisie de votre code PIN.',
  },
  {
    id: 'cinetpay',
    name: 'CINETPAY GUICHET',
    subtitle: 'Guichet Multi-Opérateurs & Cartes',
    badgeText: 'Passerelle CinetPay',
    icon: Shield,
    color: 'bg-emerald-50 text-emerald-950 border-emerald-300 hover:border-emerald-500',
    selectedRing: 'ring-2 ring-emerald-600 bg-emerald-50/90',
    accentColor: 'text-emerald-600',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-400 font-bold',
    description: 'Guichet sécurisé CinetPay (Agréé BCEAO). Paiement multi-canaux par Carte Bancaire (Visa/Mastercard) ou tout réseau Mobile Money.',
  },
  {
    id: 'coris_bank',
    name: 'CORIS BANK',
    subtitle: 'Virement / Bordereau Bancaire',
    badgeText: 'Bordereau Bancaire',
    icon: Building,
    color: 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:border-indigo-400',
    selectedRing: 'ring-2 ring-indigo-600 bg-indigo-50/80',
    accentColor: 'text-indigo-600',
    badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    description: 'Dépôt d\'espèces au guichet Coris Bank ou virement. Saisissez le numéro de bordereau bancaire pour validation.',
  },
  {
    id: 'especes',
    name: 'ESPÈCES',
    subtitle: 'Secrétariat & Caisse Centrale',
    badgeText: 'Paiement au Guichet',
    icon: DollarSign,
    color: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:border-emerald-400',
    selectedRing: 'ring-2 ring-emerald-600 bg-emerald-50/80',
    accentColor: 'text-emerald-600',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Règlement physique à la caisse de l\'école (Lundi au Vendredi, 7h30-16h30). Reçu et quittance immédiats.',
  },
];

const mockEvaluations: Evaluation[] = [];
const mockPayments: Payment[] = [];
const mockAttendance: AttendanceType[] = [];

const NOTES_DATA = [
  { subject: 'Mathématiques', coeff: 3, t1: 14.5, t2: 15.0, t3: 16.0, moyenne: 15.17, teacher: 'M. Koné', appreciation: 'Bon travail, continue ainsi' },
  { subject: 'Français', coeff: 3, t1: 12.0, t2: 13.5, t3: 14.0, moyenne: 13.17, teacher: 'Mme Touré', appreciation: 'Des progrès notables' },
  { subject: 'Anglais', coeff: 2, t1: 11.5, t2: 12.0, t3: 13.5, moyenne: 12.33, teacher: 'M. Bamba', appreciation: 'Bonne participation' },
  { subject: 'Histoire-Géo', coeff: 2, t1: 15.0, t2: 14.5, t3: 15.5, moyenne: 15.0, teacher: 'Mme Coulibaly', appreciation: 'Excellent' },
  { subject: 'Sciences', coeff: 2, t1: 13.0, t2: 14.0, t3: 14.5, moyenne: 13.83, teacher: 'M. Diallo', appreciation: 'Satisfaisant' },
  { subject: 'Arabe', coeff: 2, t1: 16.0, t2: 17.0, t3: 17.5, moyenne: 16.83, teacher: 'Cheikh Sangaré', appreciation: 'Très bon niveau' },
  { subject: 'Éducation Islamique', coeff: 2, t1: 18.0, t2: 18.5, t3: 19.0, moyenne: 18.5, teacher: 'Imam Traoré', appreciation: 'Excellent, mashaaAllah' },
  { subject: 'Coran / Tajwid', coeff: 3, t1: 17.0, t2: 18.0, t3: 18.5, moyenne: 17.83, teacher: 'Cheikh Diabaté', appreciation: 'Mémorisation remarquable' },
  { subject: 'EPS', coeff: 1, t1: 14.0, t2: 14.0, t3: 15.0, moyenne: 14.33, teacher: 'M. Soro', appreciation: 'Actif et dynamique' },
];

const ATTENDANCE_DATA = [
  { date: new Date(2026, 4, 5), status: 'present', note: '' },
  { date: new Date(2026, 4, 4), status: 'present', note: '' },
  { date: new Date(2026, 4, 3), status: 'absent', note: 'Maladie — certificat fourni' },
  { date: new Date(2026, 4, 2), status: 'present', note: '' },
  { date: new Date(2026, 4, 1), status: 'retard', note: 'Arrivée à 8h30 (retard 30min)' },
  { date: new Date(2026, 3, 30), status: 'present', note: '' },
  { date: new Date(2026, 3, 29), status: 'present', note: '' },
  { date: new Date(2026, 3, 28), status: 'excuse', note: 'Convocation médicale' },
  { date: new Date(2026, 3, 25), status: 'present', note: '' },
  { date: new Date(2026, 3, 24), status: 'present', note: '' },
  { date: new Date(2026, 3, 23), status: 'present', note: '' },
  { date: new Date(2026, 3, 22), status: 'present', note: '' },
  { date: new Date(2026, 3, 21), status: 'absent', note: 'Non justifié' },
  { date: new Date(2026, 3, 18), status: 'present', note: '' },
  { date: new Date(2026, 3, 17), status: 'present', note: '' },
];

const PAYMENTS_DATA = [
  { id: 'P001', type: 'Scolarité T2', amount: 75000, status: 'paye', date: new Date(2026, 1, 3), receipt: 'RC-2026-001' },
  { id: 'P002', type: 'Cantine — Mars', amount: 15000, status: 'paye', date: new Date(2026, 2, 5), receipt: 'RC-2026-002' },
  { id: 'P003', type: 'Scolarité T3', amount: 75000, status: 'en_attente', date: new Date(2026, 3, 15), receipt: null },
  { id: 'P004', type: 'Transport — Avril', amount: 12000, status: 'en_attente', date: new Date(2026, 3, 1), receipt: null },
  { id: 'P005', type: 'Cotisation APE', amount: 5000, status: 'paye', date: new Date(2026, 0, 15), receipt: 'RC-2026-005' },
  { id: 'P006', type: 'Livres scolaires', amount: 25000, status: 'paye', date: new Date(2026, 0, 10), receipt: 'RC-2026-006' },
];

const MESSAGES_DATA = [
  { id: 'M001', from: 'Direction HINNEH Abidjan', subject: 'Réunion parents — 20 Mai 2026', date: new Date(2026, 4, 6), read: false, content: 'Nous avons le plaisir de vous inviter à la réunion parents-professeurs du 3e trimestre qui se tiendra le mercredi 20 mai 2026 à 15h00 dans la salle polyvalente. Votre présence est vivement souhaitée.' },
  { id: 'M002', from: 'M. Koné (Maths)', subject: 'Progrès de votre enfant', date: new Date(2026, 4, 4), read: true, content: 'Bonjour, je tenais à vous informer que votre enfant montre d\'excellents progrès en mathématiques ce trimestre. Sa note a progressé de 14.5 à 16.0. Continuez à l\'encourager.' },
  { id: 'M003', from: 'Service Financier', subject: 'Rappel — Scolarité T3 en attente', date: new Date(2026, 3, 28), read: true, content: 'Nous vous rappelons que la scolarité du 3e trimestre (75 000 FCFA) est en attente de règlement. Merci de vous rapprocher du secrétariat ou de régler via Orange Money au +225 07 XX XX XX.' },
  { id: 'M004', from: 'Imam Traoré (Coran)', subject: 'Félicitations — Mémorisation Al-Baqara', date: new Date(2026, 3, 20), read: true, content: 'Alhamdulillah, votre enfant a terminé la mémorisation de Sourate Al-Baqara avec un excellent score de tajwid (18/20). C\'est une grande réussite. Baraka Allah u fikum.' },
  { id: 'M005', from: 'Surveillant Général', subject: 'Absence du 03/05/2026', date: new Date(2026, 4, 3), read: false, content: 'Votre enfant était absent le 03/05/2026. Merci de nous faire parvenir un justificatif (certificat médical, convocation) dans les 48h si l\'absence est justifiée.' },
];

const QURAN_PROGRESS = [
  { surah: 'Al-Fatiha (1)', ayahs: 7, status: 'memorise', score: 20, date: new Date(2024, 8, 1) },
  { surah: 'Al-Ikhlas (112)', ayahs: 4, status: 'memorise', score: 20, date: new Date(2024, 9, 15) },
  { surah: 'Al-Falaq (113)', ayahs: 5, status: 'memorise', score: 19, date: new Date(2024, 10, 1) },
  { surah: 'An-Nas (114)', ayahs: 6, status: 'memorise', score: 20, date: new Date(2024, 11, 1) },
  { surah: 'Al-Mulk (67)', ayahs: 30, status: 'memorise', score: 17, date: new Date(2025, 2, 15) },
  { surah: 'Ya-Sin (36)', ayahs: 83, status: 'memorise', score: 18, date: new Date(2025, 7, 20) },
  { surah: 'Al-Kahf (18)', ayahs: 110, status: 'en_cours', score: null, date: null },
  { surah: 'Al-Baqara (2)', ayahs: 286, status: 'en_cours', score: null, date: null },
  { surah: 'Ali Imran (3)', ayahs: 200, status: 'non_debute', score: null, date: null },
];

const SCHEDULE_DATA = [
  { day: 'Lundi', slots: [
    { time: '08:00–10:00', subject: 'Mathématiques', teacher: 'M. Koné', room: 'Salle 12' },
    { time: '10:30–12:30', subject: 'Coran / Tajwid', teacher: 'Cheikh Diabaté', room: 'Salle Coran' },
    { time: '13:30–15:30', subject: 'Français', teacher: 'Mme Touré', room: 'Salle 12' },
    { time: '16:00–17:30', subject: 'Arabe', teacher: 'Cheikh Sangaré', room: 'Salle Arabe' },
  ]},
  { day: 'Mardi', slots: [
    { time: '08:00–10:00', subject: 'Anglais', teacher: 'M. Bamba', room: 'Salle 12' },
    { time: '10:30–12:30', subject: 'Sciences Physiques', teacher: 'M. Diallo', room: 'Labo' },
    { time: '13:30–15:30', subject: 'Histoire-Géo', teacher: 'Mme Coulibaly', room: 'Salle 12' },
    { time: '16:00–17:30', subject: 'Éducation Islamique', teacher: 'Imam Traoré', room: 'Salle 8' },
  ]},
  { day: 'Mercredi', slots: [
    { time: '08:00–10:00', subject: 'Mathématiques', teacher: 'M. Koné', room: 'Salle 12' },
    { time: '10:30–12:30', subject: 'Français', teacher: 'Mme Touré', room: 'Salle 12' },
    { time: '13:30–14:30', subject: 'EPS', teacher: 'M. Soro', room: 'Terrain' },
  ]},
  { day: 'Jeudi', slots: [
    { time: '08:00–10:00', subject: 'SVT', teacher: 'Mme Keita', room: 'Labo' },
    { time: '10:30–12:30', subject: 'Coran / Tajwid', teacher: 'Cheikh Diabaté', room: 'Salle Coran' },
    { time: '13:30–15:30', subject: 'Mathématiques', teacher: 'M. Koné', room: 'Salle 12' },
    { time: '16:00–17:30', subject: 'Arabe', teacher: 'Cheikh Sangaré', room: 'Salle Arabe' },
  ]},
  { day: 'Vendredi', slots: [
    { time: '08:00–10:00', subject: 'Français', teacher: 'Mme Touré', room: 'Salle 12' },
    { time: '10:30–12:00', subject: 'Fiqh / Hadith', teacher: 'Imam Traoré', room: 'Salle 8' },
    { time: '12:00–12:45', subject: 'Prière Jumu\'ah', teacher: 'Imam collectif', room: 'Mosquée' },
  ]},
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusConfig = {
  present: { label: 'Présent', color: 'bg-success/20 text-green-700', icon: Check },
  absent: { label: 'Absent', color: 'bg-destructive/10 text-destructive', icon: X },
  retard: { label: 'Retard', color: 'bg-warning/20 text-yellow-700', icon: Clock },
  excuse: { label: 'Excusé', color: 'bg-blue-100 text-blue-700', icon: Info },
};

const quranStatusConfig = {
  memorise: { label: 'Mémorisé ✓', color: 'bg-success/20 text-green-700' },
  en_cours: { label: 'En cours…', color: 'bg-warning/20 text-yellow-700' },
  non_debute: { label: 'Non débuté', color: 'bg-muted text-muted-foreground' },
};

function MoyenneBar({ note, max = 20 }: { note: number; max?: number }) {
  const pct = (note / max) * 100;
  const color = note >= 16 ? 'bg-success' : note >= 12 ? 'bg-primary' : note >= 10 ? 'bg-warning' : 'bg-destructive';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-sm font-bold font-mono w-10 text-right ${note >= 16 ? 'text-green-600' : note >= 12 ? 'text-primary' : note >= 10 ? 'text-yellow-600' : 'text-destructive'}`}>
        {note.toFixed(1)}
      </span>
    </div>
  );
}

function SubjectSparkline({ t1, t2, t3 }: { t1: number; t2: number; t3: number }) {
  const isUp = t3 >= t1;
  const strokeColor = isUp ? '#10b981' : '#ef4444';
  
  // Height is 28, width is 75
  const y1 = Math.max(4, Math.min(24, 26 - ((t1 || 0) / 20) * 22));
  const y2 = Math.max(4, Math.min(24, 26 - ((t2 || 0) / 20) * 22));
  const y3 = Math.max(4, Math.min(24, 26 - ((t3 || 0) / 20) * 22));

  const pathD = `M 8 ${y1} L 38 ${y2} L 68 ${y3}`;
  const areaD = `${pathD} L 68 27 L 8 27 Z`;

  return (
    <div className="flex items-center gap-2">
      <svg className="w-20 h-7 overflow-visible">
        <path d={areaD} fill={isUp ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'} />
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="8" cy={y1} r="2.5" fill="#fff" stroke={strokeColor} strokeWidth="1.5" />
        <circle cx="38" cy={y2} r="2.5" fill="#fff" stroke={strokeColor} strokeWidth="1.5" />
        <circle cx="68" cy={y3} r="3" fill={strokeColor} stroke="#fff" strokeWidth="1.5" />
      </svg>
      <span className={`text-[11px] font-bold font-mono ${isUp ? 'text-emerald-600' : 'text-destructive'}`}>
        {t3 >= t1 ? `+${(t3 - t1).toFixed(1)}` : (t3 - t1).toFixed(1)}
      </span>
    </div>
  );
}

// ─── Composant de Pagination Réutilisable ─────────────────────────────────────

function TablePagination({
  currentPage,
  totalItems,
  perPage,
  onPageChange,
  onPerPageChange,
  itemName = 'lignes',
  pageSizeOptions = [5, 10, 20]
}: {
  currentPage: number;
  totalItems: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  itemName?: string;
  pageSizeOptions?: number[];
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  if (totalItems === 0) return null;

  const startIdx = (currentPage - 1) * perPage + 1;
  const endIdx = Math.min(currentPage * perPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 border-t bg-muted/20 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <span>Affichage de {startIdx} à {endIdx} sur {totalItems} {itemName}</span>
        {onPerPageChange && (
          <>
            <span className="text-muted-foreground/40">•</span>
            <div className="flex items-center gap-1.5">
              <span>Par page :</span>
              <Select value={String(perPage)} onValueChange={(v) => { onPerPageChange(Number(v)); onPageChange(1); }}>
                <SelectTrigger className="h-7 w-16 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map(size => (
                    <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
          title="Première page"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          title="Page précédente"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        <div className="flex items-center gap-1 px-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .map((page, idx, arr) => {
              const prev = arr[idx - 1];
              return (
                <div key={page} className="flex items-center">
                  {prev && page - prev > 1 && <span className="px-1 text-muted-foreground/60">…</span>}
                  <Button
                    variant={currentPage === page ? "default" : "outline"}
                    size="icon"
                    className={`h-7 w-7 text-xs font-bold ${currentPage === page ? 'bg-primary text-white shadow-sm' : ''}`}
                    onClick={() => onPageChange(page)}
                  >
                    {page}
                  </Button>
                </div>
              );
            })}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          title="Page suivante"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Dernière page"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Composant Principal ──────────────────────────────────────────────────────

export default function ParentPortalV2() {
  const scheduleRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [financeSubTab, setFinanceSubTab] = useState<'global' | 'scolarite' | 'services' | 'historique'>('global');
  const [servicesSubTab, setServicesSubTab] = useState<'all' | 'cantine' | 'transport'>('all');
  const [servicesFilter, setServicesFilter] = useState<'all' | 'paye' | 'en_cours' | 'a_echoir'>('all');
  const [notesViewMode, setNotesViewMode] = useState<'table' | 'charts' | 'cards'>('table');
  const [selectedChild, setSelectedChild] = useState('');
  const [selectedTrimester, setSelectedTrimester] = useState<'t1' | 't2' | 't3'>('t3');
  const [selectedMessage, setSelectedMessage] = useState<typeof MESSAGES_DATA[0] | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [newMessage, setNewMessage] = useState({ to: '', subject: '', content: '' });

  // Multi-Student & Child Attachment State
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [searchMatricule, setSearchMatricule] = useState('');
  const [foundStudentCandidate, setFoundStudentCandidate] = useState<Student | null>(null);
  const [isSearchingStudent, setIsSearchingStudent] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [allSchoolStudents, setAllSchoolStudents] = useState<Student[]>([]);
  const [viewModeFratrie, setViewModeFratrie] = useState<boolean>(false);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentService, setPaymentService] = useState<'scolarite' | 'cantine' | 'transport'>('scolarite');
  const [paymentMode, setPaymentMode] = useState<string>('wave');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentPayerName, setPaymentPayerName] = useState<string>('');
  const [paymentPhone, setPaymentPhone] = useState<string>('');
  const [paymentTransactionRef, setPaymentTransactionRef] = useState<string>('');
  const [paymentBankSlip, setPaymentBankSlip] = useState<string>('');
  const [paymentBankDate, setPaymentBankDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTrancheId, setSelectedTrancheId] = useState<number | null>(null);
  const [selectedCantineMonths, setSelectedCantineMonths] = useState<string[]>([]);
  const [selectedTransportMonths, setSelectedTransportMonths] = useState<string[]>([]);
  const [paymentSubmitting, setPaymentSubmitting] = useState<boolean>(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<any>(null);
  const [debitStep, setDebitStep] = useState<'idle' | 'initiating' | 'push_sent' | 'confirming' | 'debited'>('idle');
  const [debitMessage, setDebitMessage] = useState<string>('');

  // Entities & Data State
  const [childrenList, setChildrenList] = useState<Student[]>([]);
  const [school, setSchool] = useState<School | null>(null);
  const [classRoom, setClassRoom] = useState<ClassRoom | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceType[]>([]);
  const [echeancesList, setEcheancesList] = useState<any[]>([]);
  const [echeancierSummary, setEcheancierSummary] = useState<any>(null);
  const [tarifsData, setTarifsData] = useState<any>(null);
  const [isLoadingFinances, setIsLoadingFinances] = useState<boolean>(false);

  // Pagination states for all tables
  const [scolaritePage, setScolaritePage] = useState<number>(1);
  const [scolaritePerPage, setScolaritePerPage] = useState<number>(10);

  const [servicesPage, setServicesPage] = useState<number>(1);
  const [servicesPerPage, setServicesPerPage] = useState<number>(10);

  const [cantinePage, setCantinePage] = useState<number>(1);
  const [cantinePerPage, setCantinePerPage] = useState<number>(10);

  const [transportPage, setTransportPage] = useState<number>(1);
  const [transportPerPage, setTransportPerPage] = useState<number>(10);

  const [paymentsPage, setPaymentsPage] = useState<number>(1);
  const [paymentsPerPage, setPaymentsPerPage] = useState<number>(10);
  const [attendancePage, setAttendancePage] = useState<number>(1);
  const [attendancePerPage, setAttendancePerPage] = useState<number>(10);

  // Fetch Parent's children
  useEffect(() => {
    setScolaritePage(1);
    setServicesPage(1);
    setCantinePage(1);
    setTransportPage(1);
    setPaymentsPage(1);
    setAttendancePage(1);
  }, [selectedChild]);

  useEffect(() => {
    const parentUsername = localStorage.getItem("username") || 'parent@hinneh.ci';
    const storageKey = `parent_custom_children_${parentUsername.toLowerCase().trim()}`;
    const storedAttachedIds: string[] = JSON.parse(localStorage.getItem(storageKey) || '[]');

    apiClient.getStudents()
      .then((data) => {
        if (data && data.length > 0) {
          setAllSchoolStudents(data);
          const parentUserLower = (parentUsername || '').toLowerCase().trim();
          const parentChildren = data.filter(
            (student: any) =>
              storedAttachedIds.includes(String(student.id)) ||
              (student.matricule && storedAttachedIds.includes(student.matricule)) ||
              student.parentIds?.some((p: string) => p.toLowerCase().includes(parentUserLower)) ||
              student.matricule?.toLowerCase() === parentUserLower ||
              student.parentEmail?.toLowerCase() === parentUserLower ||
              student.AU_E_MAIL_PARENT?.toLowerCase() === parentUserLower ||
              student.AU_E_MAIL?.toLowerCase() === parentUserLower ||
              student.AU_EMAILCONTACTURGENCE?.toLowerCase() === parentUserLower ||
              student.parentPhone === parentUsername ||
              student.AU_TEL_RESPONSABLE_LEGAL === parentUsername ||
              student.AU_PERECONTACTS === parentUsername
          );
          const finalChildren = parentChildren.length > 0 ? parentChildren : data.slice(0, 3);
          setChildrenList(finalChildren);
          if (finalChildren.length > 0) {
            setSelectedChild(finalChildren[0].id);
          }
        } else {
          setChildrenList([]);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch students in parent portal.", err);
        setChildrenList([]);
      });

    // Fetch official tariffs for cantine & transport
    apiClient.getTarifs()
      .then(data => { if (data) setTarifsData(data); })
      .catch(err => console.warn("Failed to fetch tariffs", err));
  }, []);

  // Multi-Student Handlers
  const handleSearchChildCandidate = () => {
    setSearchError(null);
    setFoundStudentCandidate(null);
    const query = searchMatricule.trim().toLowerCase();
    if (!query) {
      setSearchError('Veuillez saisir un matricule ou un nom d\'élève.');
      return;
    }

    setIsSearchingStudent(true);
    setTimeout(() => {
      const candidate = allSchoolStudents.find((s: any) => 
        (s.matricule && s.matricule.toLowerCase() === query) ||
        (s.id && String(s.id).toLowerCase() === query) ||
        (`${s.firstName || ''} ${s.lastName || ''}`.toLowerCase().includes(query)) ||
        (`${s.nom || ''} ${s.prenom || ''}`.toLowerCase().includes(query))
      );

      if (!candidate) {
        setSearchError(`Aucun élève trouvé avec l'identifiant "${searchMatricule}". Veuillez vérifier le matricule délivré par l'établissement.`);
      } else if (childrenList.some(c => c.id === candidate.id || (c.matricule && c.matricule === candidate.matricule))) {
        setSearchError(`L'élève ${formatStudentName(candidate)} (${candidate.matricule}) est déjà rattaché(e) à votre compte.`);
      } else {
        setFoundStudentCandidate(candidate);
      }
      setIsSearchingStudent(false);
    }, 200);
  };

  const handleConfirmAttachChild = (candidateToAttach?: Student) => {
    const targetCandidate = candidateToAttach || foundStudentCandidate;
    if (!targetCandidate) return;
    const parentUsername = localStorage.getItem("username") || 'parent@hinneh.ci';
    const storageKey = `parent_custom_children_${parentUsername.toLowerCase().trim()}`;
    const currentStored: string[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    const newStored = Array.from(new Set([...currentStored, String(targetCandidate.id), targetCandidate.matricule || ''])).filter(Boolean);
    localStorage.setItem(storageKey, JSON.stringify(newStored));

    setChildrenList(prev => {
      if (prev.some(c => c.id === targetCandidate.id)) return prev;
      return [...prev, targetCandidate];
    });
    setSelectedChild(targetCandidate.id);
    setViewModeFratrie(false);
    setShowAddChildModal(false);
    setSearchMatricule('');
    setFoundStudentCandidate(null);
    setSearchError(null);
  };

  const handleDetachChild = (childIdToDetach: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (childrenList.length <= 1) {
      alert('Vous devez conserver au moins un élève associé à votre compte.');
      return;
    }
    if (!confirm('Êtes-vous sûr de vouloir retirer cet élève de votre suivi familial ?')) return;

    const parentUsername = localStorage.getItem("username") || 'parent@hinneh.ci';
    const storageKey = `parent_custom_children_${parentUsername.toLowerCase().trim()}`;
    const currentStored: string[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    const childToDetach = childrenList.find(c => c.id === childIdToDetach);
    const newStored = currentStored.filter(id => id !== childIdToDetach && id !== childToDetach?.matricule);
    localStorage.setItem(storageKey, JSON.stringify(newStored));

    const updated = childrenList.filter(c => c.id !== childIdToDetach);
    setChildrenList(updated);
    if (selectedChild === childIdToDetach) {
      setSelectedChild(updated[0]?.id || '');
    }
  };

  const child = childrenList.find(s => s.id === selectedChild) || childrenList[0] || null;

  // Load selected child's details, evaluations, payments, and echeancier
  const loadChildData = async () => {
    if (!child) return;
    setIsLoadingFinances(true);
    const isNumeric = /^\d+$/.test(child.id);

    if (isNumeric) {
      try {
        const [schData, clsData, evData, payData, attData, echData] = await Promise.all([
          child.schoolId ? apiClient.getSchool(child.schoolId).catch(() => null) : Promise.resolve(null),
          child.classId ? apiClient.getClass(child.classId).catch(() => null) : Promise.resolve(null),
          apiClient.getEvaluations({ eleve_id: parseInt(child.id, 10) }).catch(() => []),
          apiClient.getPayments({ eleve_id: parseInt(child.id, 10) }).catch(() => []),
          apiClient.getAttendance({ eleve_id: parseInt(child.id, 10) }).catch(() => []),
          apiClient.getStudentEcheancierSummary(child.id).catch(() => null)
        ]);

        if (schData) setSchool(schData);
        if (clsData) setClassRoom(clsData);
        setEvaluations(evData || []);
        setPayments(payData || []);
        setAttendance(attData || []);
        
        if (echData) {
          setEcheancierSummary(echData.summary || null);
          setEcheancesList(echData.echeances || []);
        } else {
          const rawEch = await apiClient.getEcheanciers({ eleve_id: parseInt(child.id, 10) }).catch(() => []);
          setEcheancesList(rawEch || []);
        }
      } catch (err) {
        console.warn("Error loading student finance data", err);
      } finally {
        setIsLoadingFinances(false);
      }
    } else {
      setSchool(null);
      setClassRoom(null);
      setEvaluations([]);
      setPayments([]);
      setAttendance([]);
      setEcheancesList([]);
      setEcheancierSummary(null);
      setIsLoadingFinances(false);
    }
  };

  useEffect(() => {
    loadChildData();
  }, [child]);

  // Aucun échéancier de démonstration : un parent ne doit jamais voir des montants
  // fabriqués qu'il ne peut pas distinguer de sa vraie situation financière. Quand
  // l'API ne renvoie rien, les listes restent vides et l'écran l'indique explicitement.
  const scolariteEcheances = useMemo(
    () => echeancesList.filter(e => !e.service_type || e.service_type === 'scolarite' || e.service_type === 'inscription' || e.service_type === 'frais_annexe'),
    [echeancesList],
  );

  const cantineEcheances = useMemo(
    () => echeancesList.filter(e => e.service_type === 'cantine'),
    [echeancesList],
  );

  const transportEcheances = useMemo(
    () => echeancesList.filter(e => e.service_type === 'transport' || e.service_type === 'car'),
    [echeancesList],
  );

  const allEcheancesCombined = useMemo(() => {
    return [
      ...scolariteEcheances.map(e => ({ ...e, serviceGroup: 'scolarite', groupLabel: 'Scolarité', badgeClass: 'bg-primary/10 text-primary border-primary/20' })),
      ...cantineEcheances.map(e => ({ ...e, serviceGroup: 'cantine', groupLabel: 'Cantine', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300' })),
      ...transportEcheances.map(e => ({ ...e, serviceGroup: 'transport', groupLabel: 'Transport / Car', badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300' })),
    ];
  }, [scolariteEcheances, cantineEcheances, transportEcheances]);

  // Tarifs
  const tarifCantineMensuel = tarifsData?.cantine?.mensuel || 15000;
  const tarifTransportMensuel = tarifsData?.zones?.[0]?.tarif || 18000;

  // Due Amounts per Service
  const scolariteTotalPrevu = scolariteEcheances.reduce((s, e) => s + parseFloat(e.montant_prevu || 0), 0);
  const scolariteTotalPaye = scolariteEcheances.reduce((s, e) => s + parseFloat(e.montant_paye || 0), 0);
  const scolariteSoldeDu = Math.max(0, scolariteTotalPrevu - scolariteTotalPaye);

  const cantineTotalPrevu = cantineEcheances.reduce((s, e) => s + parseFloat(e.montant_prevu || 0), 0);
  const cantineTotalPaye = cantineEcheances.reduce((s, e) => s + parseFloat(e.montant_paye || 0), 0);
  const cantineSoldeDu = Math.max(0, cantineTotalPrevu - cantineTotalPaye);

  const transportTotalPrevu = transportEcheances.reduce((s, e) => s + parseFloat(e.montant_prevu || 0), 0);
  const transportTotalPaye = transportEcheances.reduce((s, e) => s + parseFloat(e.montant_paye || 0), 0);
  const transportSoldeDu = Math.max(0, transportTotalPrevu - transportTotalPaye);

  const totalGlobalDu = scolariteSoldeDu + cantineSoldeDu + transportSoldeDu;
  const totalGlobalPaye = scolariteTotalPaye + cantineTotalPaye + transportTotalPaye;

  // Services Totals
  const servicesTotalPrevu = cantineTotalPrevu + transportTotalPrevu;
  const servicesTotalPaye = cantineTotalPaye + transportTotalPaye;
  const servicesSoldeDu = cantineSoldeDu + transportSoldeDu;

  const servicesEcheancesCombined = useMemo(() => {
    return [
      ...cantineEcheances.map(e => ({ ...e, serviceGroup: 'cantine', groupLabel: 'Cantine', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300' })),
      ...transportEcheances.map(e => ({ ...e, serviceGroup: 'transport', groupLabel: 'Transport / Car', badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300' })),
    ];
  }, [cantineEcheances, transportEcheances]);

  // Paginated Scolarité
  const paginatedScolarite = useMemo(() => {
    const start = (scolaritePage - 1) * scolaritePerPage;
    return scolariteEcheances.slice(start, start + scolaritePerPage);
  }, [scolariteEcheances, scolaritePage, scolaritePerPage]);

  // Paginated Cantine
  const paginatedCantine = useMemo(() => {
    const start = (cantinePage - 1) * cantinePerPage;
    return cantineEcheances.slice(start, start + cantinePerPage);
  }, [cantineEcheances, cantinePage, cantinePerPage]);

  // Paginated Transport
  const paginatedTransport = useMemo(() => {
    const start = (transportPage - 1) * transportPerPage;
    return transportEcheances.slice(start, start + transportPerPage);
  }, [transportEcheances, transportPage, transportPerPage]);

  // Paginated Services Combined
  const filteredServicesEcheances = useMemo(() => {
    let list = servicesEcheancesCombined;
    if (servicesSubTab === 'cantine') {
      list = list.filter(e => e.serviceGroup === 'cantine');
    } else if (servicesSubTab === 'transport') {
      list = list.filter(e => e.serviceGroup === 'transport');
    }

    if (servicesFilter === 'paye') {
      return list.filter(e => e.statut === 'paye' || parseFloat(e.montant_paye) >= parseFloat(e.montant_prevu));
    }
    if (servicesFilter === 'en_cours') {
      return list.filter(e => e.statut === 'en_cours' || e.statut === 'partiel' || (parseFloat(e.montant_paye) > 0 && parseFloat(e.montant_paye) < parseFloat(e.montant_prevu)));
    }
    if (servicesFilter === 'a_echoir') {
      return list.filter(e => e.statut === 'a_echoir' || (parseFloat(e.montant_paye) === 0 && e.statut !== 'paye'));
    }
    return list;
  }, [servicesEcheancesCombined, servicesSubTab, servicesFilter]);

  const paginatedServicesCombined = useMemo(() => {
    const start = (servicesPage - 1) * servicesPerPage;
    return filteredServicesEcheances.slice(start, start + servicesPerPage);
  }, [filteredServicesEcheances, servicesPage, servicesPerPage]);

  const moyenneGen = useMemo(() => {
    if (evaluations.length > 0) {
      return evaluations.reduce((sum, e) => sum + e.note, 0) / evaluations.length;
    }
    return child?.moyenne || 14.5;
  }, [evaluations, child]);

  const mappedAttendance = useMemo(() => {
    if (attendance && attendance.length > 0) {
      return attendance.map(a => ({
        date: new Date(a.date),
        status: a.status,
        note: a.justification || ''
      }));
    }
    return ATTENDANCE_DATA;
  }, [attendance]);

  const presenceStats = useMemo(() => {
    const total = mappedAttendance.length || 1;
    const presents = mappedAttendance.filter(a => a.status === 'present').length;
    const absents = mappedAttendance.filter(a => a.status === 'absent').length;
    const retards = mappedAttendance.filter(a => a.status === 'retard').length;
    const excuses = mappedAttendance.filter(a => a.status === 'excuse').length;
    const tauxAbsence = Math.round((absents / total) * 100);
    const tauxPresence = Math.round((presents / total) * 100);
    return { total, presents, absents, retards, excuses, tauxAbsence, tauxPresence };
  }, [mappedAttendance]);

  const unreadMessages = MESSAGES_DATA.filter(m => !m.read).length;
  const currentSchoolName = school?.name || 'Groupe Scolaire HINNEH';
  const initials = child && child.firstName && child.lastName ? `${child.firstName[0]}${child.lastName[0]}` : 'EL';

  const notesData = useMemo(() => {
    if (evaluations.length > 0) {
      const subjectGrades: Record<string, { t1: number[]; t2: number[]; t3: number[]; coef: number }> = {};
      evaluations.forEach((e) => {
        if (!subjectGrades[e.subject]) {
          subjectGrades[e.subject] = { t1: [], t2: [], t3: [], coef: e.coefficient };
        }
        if (e.trimester === 1) subjectGrades[e.subject].t1.push(e.note);
        else if (e.trimester === 2) subjectGrades[e.subject].t2.push(e.note);
        else if (e.trimester === 3) subjectGrades[e.subject].t3.push(e.note);
      });

      return Object.entries(subjectGrades).map(([subject, data]) => {
        const avgT1 = data.t1.length > 0 ? data.t1.reduce((sum, n) => sum + n, 0) / data.t1.length : 0;
        const avgT2 = data.t2.length > 0 ? data.t2.reduce((sum, n) => sum + n, 0) / data.t2.length : 0;
        const avgT3 = data.t3.length > 0 ? data.t3.reduce((sum, n) => sum + n, 0) / data.t3.length : 0;
        const annualAvg = (avgT1 + avgT2 + avgT3) / 3;
        
        return {
          subject,
          coeff: data.coef,
          t1: avgT1,
          t2: avgT2,
          t3: avgT3,
          moyenne: annualAvg,
          teacher: 'Enseignant',
          appreciation: annualAvg >= 16 ? 'Excellent' : annualAvg >= 12 ? 'Assez bien' : 'Peut mieux faire'
        };
      });
    }
    return NOTES_DATA;
  }, [evaluations]);

  // Performance & Chart Memos
  const generalAveragesProgression = useMemo(() => {
    const totalCoef = notesData.reduce((sum, n) => sum + (n.coeff || 1), 0) || 1;
    const avgT1 = Number((notesData.reduce((sum, n) => sum + (n.t1 || 0) * (n.coeff || 1), 0) / totalCoef).toFixed(2)) || 13.8;
    const avgT2 = Number((notesData.reduce((sum, n) => sum + (n.t2 || 0) * (n.coeff || 1), 0) / totalCoef).toFixed(2)) || 14.6;
    const avgT3 = Number((notesData.reduce((sum, n) => sum + (n.t3 || 0) * (n.coeff || 1), 0) / totalCoef).toFixed(2)) || 15.5;

    return [
      {
        trimestre: '1er Trimestre',
        code: 'T1',
        moyenneEleve: avgT1,
        moyenneClasse: 12.4,
        seuilAdmis: 10.0,
        objectifExcellence: 16.0,
      },
      {
        trimestre: '2e Trimestre',
        code: 'T2',
        moyenneEleve: avgT2,
        moyenneClasse: 12.9,
        seuilAdmis: 10.0,
        objectifExcellence: 16.0,
      },
      {
        trimestre: '3e Trimestre',
        code: 'T3',
        moyenneEleve: avgT3,
        moyenneClasse: 13.3,
        seuilAdmis: 10.0,
        objectifExcellence: 16.0,
      },
    ];
  }, [notesData]);

  const subjectsComparisonData = useMemo(() => {
    return notesData.map(n => ({
      subject: n.subject.length > 12 ? n.subject.slice(0, 11) + '…' : n.subject,
      fullName: n.subject,
      T1: Number(n.t1.toFixed(1)),
      T2: Number(n.t2.toFixed(1)),
      T3: Number(n.t3.toFixed(1)),
      Moyenne: Number(n.moyenne.toFixed(1)),
      progression: Number((n.t3 - n.t1).toFixed(1)),
      coeff: n.coeff,
      teacher: n.teacher,
      appreciation: n.appreciation,
    }));
  }, [notesData]);

  const subjectCategoriesRadarData = useMemo(() => {
    const sciences = notesData.filter(n => ['Mathématiques', 'Sciences', 'SVT', 'Sciences Physiques', 'Physique'].includes(n.subject));
    const lettres = notesData.filter(n => ['Français', 'Histoire-Géo', 'Philosophie'].includes(n.subject));
    const religionLangues = notesData.filter(n => ['Arabe', 'Éducation Islamique', 'Coran / Tajwid', 'Anglais'].includes(n.subject));
    const autres = notesData.filter(n => ['EPS', 'Arts Plastiques', 'Musique', 'Conduite'].includes(n.subject));

    const avgCat = (arr: typeof notesData) => arr.length > 0 ? Number((arr.reduce((s, n) => s + n.moyenne, 0) / arr.length).toFixed(1)) : 14;

    return [
      { category: 'Sciences & Maths', note: avgCat(sciences), moyenneClasse: 12.5, fullMark: 20 },
      { category: 'Lettres & Humaines', note: avgCat(lettres), moyenneClasse: 13.0, fullMark: 20 },
      { category: 'Langues & Éduc. Islamique', note: avgCat(religionLangues), moyenneClasse: 14.5, fullMark: 20 },
      { category: 'Sport & Activités', note: avgCat(autres), moyenneClasse: 14.0, fullMark: 20 },
    ];
  }, [notesData]);

  const mappedPayments = useMemo(() => {
    if (payments.length > 0) {
      return payments.map(p => ({
        id: p.id,
        receipt: p.receiptNumber || (p as any).numero_recu || 'REC-' + p.id,
        type: p.type === 'scolarite' ? 'Scolarité' : p.type === 'cantine' ? 'Cantine' : p.type === 'transport' ? 'Transport / Car' : p.type === 'inscription' ? 'Inscription' : 'Autre',
        rawType: p.type,
        mode: p.mode,
        amount: p.amount,
        date: new Date(p.date),
        date_acquittement: (p as any).date_acquittement ? new Date((p as any).date_acquittement) : null,
        transaction: (p as any).numero_transaction || null,
        status: p.status
      }));
    }
    return [];
  }, [payments]);

  // Paginated calculations
  const totalPaymentsPages = useMemo(() => {
    return Math.max(1, Math.ceil(mappedPayments.length / paymentsPerPage));
  }, [mappedPayments, paymentsPerPage]);

  const paginatedPayments = useMemo(() => {
    const startIndex = (paymentsPage - 1) * paymentsPerPage;
    return mappedPayments.slice(startIndex, startIndex + paymentsPerPage);
  }, [mappedPayments, paymentsPage, paymentsPerPage]);

  const totalAttendancePages = useMemo(() => {
    return Math.max(1, Math.ceil(mappedAttendance.length / attendancePerPage));
  }, [mappedAttendance, attendancePerPage]);

  const paginatedAttendance = useMemo(() => {
    const startIndex = (attendancePage - 1) * attendancePerPage;
    return mappedAttendance.slice(startIndex, startIndex + attendancePerPage);
  }, [mappedAttendance, attendancePage, attendancePerPage]);

  // Open Payment Modal Helpers
  const handleOpenPayment = (service: 'scolarite' | 'cantine' | 'transport', specificTranche?: any, customAmount?: number) => {
    setPaymentService(service);
    setPaymentSuccessData(null);
    setPaymentPayerName(child?.parentName || 'Parent d\'élève');
    setPaymentPhone(child?.parentPhone || '');
    setPaymentTransactionRef('');
    setPaymentBankSlip('');

    if (service === 'scolarite') {
      if (specificTranche) {
        setSelectedTrancheId(specificTranche.id);
        const due = parseFloat(specificTranche.montant_prevu) - parseFloat(specificTranche.montant_paye);
        setPaymentAmount(Math.max(0, due));
      } else {
        setSelectedTrancheId(null);
        const firstUnpaid = scolariteEcheances.find(e => e.statut !== 'paye');
        if (firstUnpaid) {
          setSelectedTrancheId(firstUnpaid.id);
          const due = parseFloat(firstUnpaid.montant_prevu) - parseFloat(firstUnpaid.montant_paye);
          setPaymentAmount(Math.max(0, due));
        } else {
          setPaymentAmount(scolariteSoldeDu > 0 ? scolariteSoldeDu : 25000);
        }
      }
    } else if (service === 'cantine') {
      const selected = selectedCantineMonths.length > 0 ? selectedCantineMonths : ['Octobre'];
      setSelectedCantineMonths(selected);
      setPaymentAmount(customAmount || (selected.length * tarifCantineMensuel));
    } else if (service === 'transport') {
      const selected = selectedTransportMonths.length > 0 ? selectedTransportMonths : ['Octobre'];
      setSelectedTransportMonths(selected);
      setPaymentAmount(customAmount || (selected.length * tarifTransportMensuel));
    }

    setShowPaymentModal(true);
  };

  // Submit Payment Action & CinetPay API Direct Debit
  const handleConfirmPayment = async () => {
    if (!child) return;
    if (paymentAmount <= 0) {
      alert('Veuillez spécifier un montant valide supérieur à 0 FCFA.');
      return;
    }

    const isCinetPay = ['wave', 'mtn_money', 'orange_money', 'moov_money', 'cinetpay'].includes(paymentMode);
    if (isCinetPay && paymentMode !== 'cinetpay' && !paymentPhone.trim()) {
      alert("Veuillez saisir votre numéro de téléphone Mobile Money pour permettre à l'API CinetPay de vous débiter.");
      return;
    }

    setPaymentSubmitting(true);
    const isNumeric = /^\d+$/.test(child.id);

    try {
      const operatorName = getOperatorDisplayName(paymentMode);
      let transactionId = '';

      if (isCinetPay) {
        const cinetPayRes = await processCinetPayPayment(
          {
            transactionId: `CP-HE2026-${Date.now().toString().slice(-8)}`,
            amount: paymentAmount,
            currency: 'XOF',
            description: `Paiement ${paymentService.toUpperCase()} - Élève ${formatStudentName(child)} (${child.matricule || ''})`,
            customer: {
              id: `PAR-${child.id || '001'}`,
              name: paymentPayerName.split(' ')[1] || (child.AU_TUTEURLEGAL ? child.AU_TUTEURLEGAL.split(' ')[1] || 'KOUASSI' : 'KOUASSI'),
              surname: paymentPayerName.split(' ')[0] || (child.AU_TUTEURLEGAL ? child.AU_TUTEURLEGAL.split(' ')[0] || 'Parent' : 'Parent'),
              phone: paymentPhone || '+2250700000000',
              email: 'parent.test@hinneh.ci',
              city: 'Abidjan',
              country: 'CI'
            },
            channel: paymentMode === 'cinetpay' ? 'ALL' : 'MOBILE_MONEY',
            operator: paymentMode as any,
          },
          (step, msg) => {
            setDebitStep(step);
            setDebitMessage(msg);
          }
        );

        if (!cinetPayRes.success) {
          throw new Error(cinetPayRes.message || 'La transaction CinetPay a été annulée ou refusée.');
        }

        transactionId = cinetPayRes.operatorTransactionId || `CINETPAY-${cinetPayRes.transactionId}`;
      } else if (paymentMode === 'coris_bank') {
        transactionId = paymentBankSlip || `BDR-CORIS-${Date.now().toString().slice(-6)}`;
      } else {
        transactionId = `CASH-${Date.now().toString().slice(-6)}`;
      }

      const payload: any = {
        eleve_id: parseInt(child.id, 10),
        motif: paymentService,
        montant: paymentAmount,
        mode: isCinetPay ? `cinetpay_${paymentMode}` : paymentMode,
        numero_transaction: transactionId,
        telephone_parent: paymentPhone,
        observation: `Paiement en ligne par le parent via Passerelle CinetPay (${operatorName}) - Débit automatique de ${formatCurrency(paymentAmount)} - ${paymentService.toUpperCase()}`,
        caissier_nom: `Passerelle CinetPay API (${operatorName})`,
        annee_scolaire: '2026-2027'
      };

      if (paymentService === 'scolarite' && selectedTrancheId) {
        payload.echeance_ids = [selectedTrancheId];
      }

      let res: any = null;
      if (isNumeric) {
        res = await apiClient.processCaisseEncaissement(payload);
      } else {
        res = {
          success: true,
          numero_recu: `REC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Date.now().toString().slice(-4)}`,
          paiement_id: Date.now(),
          date_encaissement: new Date().toISOString(),
          details_recu: {
            numero_recu: `REC-${Date.now().toString().slice(-6)}`,
            montant: paymentAmount,
            motif: paymentService,
            mode: isCinetPay ? `CinetPay (${operatorName})` : paymentMode,
            numero_transaction: transactionId,
            telephone_parent: paymentPhone
          }
        };
      }

      setPaymentSuccessData(res);
      await loadChildData();
    } catch (err: any) {
      console.error("Payment confirmation error", err);
      const errMsg = err?.response?.data?.detail || err?.message || 'Erreur lors du traitement du débit CinetPay.';
      alert(`Erreur de paiement CinetPay : ${errMsg}`);
    } finally {
      setPaymentSubmitting(false);
      setDebitStep('idle');
    }
  };

  // Print Receipt Handler
  const handlePrintOfficialReceipt = (paymentItem?: any) => {
    if (!child) return;
    const targetRecu = paymentItem || paymentSuccessData;
    const amountVal = targetRecu?.amount || targetRecu?.details_recu?.montant || paymentAmount;
    const typeVal = targetRecu?.type || targetRecu?.details_recu?.motif || paymentService;
    const modeVal = targetRecu?.mode || targetRecu?.details_recu?.mode || paymentMode;
    const recuNum = targetRecu?.receipt || targetRecu?.numero_recu || targetRecu?.details_recu?.numero_recu || `REC-${Date.now().toString().slice(-6)}`;
    const transNum = targetRecu?.transaction || targetRecu?.details_recu?.numero_transaction || paymentTransactionRef || 'N/A';

    const allFormattedEcheances = [
      ...scolariteEcheances.map(e => ({
        rubric: e.libelle,
        amount: parseFloat(e.montant_prevu || 0),
        paid: parseFloat(e.montant_paye || 0),
        rest: Math.max(0, parseFloat(e.montant_prevu || 0) - parseFloat(e.montant_paye || 0)),
        service_type: 'scolarite',
        mode: e.mode || (parseFloat(e.montant_paye || 0) > 0 ? modeVal : undefined),
        date_paye: e.date_paye || (parseFloat(e.montant_paye || 0) > 0 ? (e.date_echeance || '2026-08-19') : undefined)
      })),
      ...cantineEcheances.map(e => ({
        rubric: e.libelle,
        amount: parseFloat(e.montant_prevu || 0),
        paid: parseFloat(e.montant_paye || 0),
        rest: Math.max(0, parseFloat(e.montant_prevu || 0) - parseFloat(e.montant_paye || 0)),
        service_type: 'cantine',
        mode: e.mode || (parseFloat(e.montant_paye || 0) > 0 ? modeVal : undefined),
        date_paye: e.date_paye || (parseFloat(e.montant_paye || 0) > 0 ? (e.date_echeance || '2026-08-19') : undefined)
      })),
      ...transportEcheances.map(e => ({
        rubric: e.libelle,
        amount: parseFloat(e.montant_prevu || 0),
        paid: parseFloat(e.montant_paye || 0),
        rest: Math.max(0, parseFloat(e.montant_prevu || 0) - parseFloat(e.montant_paye || 0)),
        service_type: 'transport',
        mode: e.mode || (parseFloat(e.montant_paye || 0) > 0 ? modeVal : undefined),
        date_paye: e.date_paye || (parseFloat(e.montant_paye || 0) > 0 ? (e.date_echeance || '2026-08-19') : undefined)
      }))
    ];

    printReceipt({
      receiptNumber: recuNum,
      amount: amountVal,
      type: typeVal,
      mode: modeVal,
      status: 'paye',
      date: new Date(),
      date_acquittement: new Date(),
      transactionNumber: transNum,
      studentName: formatStudentName(child),
      studentMatricule: child.matricule,
      studentClass: child.className || classRoom?.name || 'Classe',
      schoolName: school?.name || 'GROUPE SCOLAIRE HINNEH',
      caissierName: `Espace Parent / Caisse Hinneh`,
      totalVersedToDate: totalGlobalPaye,
      soldeToDate: totalGlobalDu,
      serviceCantine: true,
      serviceTransport: true,
      echeances: allFormattedEcheances
    });
  };

  if (!child) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh] p-4">
          <Card className="max-w-md w-full border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
            <CardHeader className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center mb-3">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <CardTitle>Aucun élève associé</CardTitle>
              <CardDescription>
                Aucun élève n'est rattaché à votre compte parent pour le moment.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Votre identifiant : <span className="font-semibold text-foreground">{localStorage.getItem("username") || 'Parent'}</span>.
                Veuillez contacter le secrétariat de l'école Hînneh pour faire associer vos enfants.
              </p>
              <Button onClick={() => window.location.reload()} className="w-full">
                Actualiser
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto pb-10">
        {/* Header */}
        <motion.div variants={fadeInUp} initial="initial" animate="animate">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-semibold px-2.5 py-0.5 bg-primary/10 text-primary rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Espace Parent Sécurisé
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Année Scolaire 2026-2027
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-full flex items-center gap-1">
                  <Users className="h-3 w-3" /> {childrenList.length} enfant{childrenList.length > 1 ? 's' : ''} suivi{childrenList.length > 1 ? 's' : ''}
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Portail Famille Hînneh</h1>
              <p className="text-muted-foreground mt-1">{currentSchoolName} — Suivi académique & Règlements en ligne</p>
            </div>
            
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Bouton Vue Fratrie */}
              <Button
                variant={viewModeFratrie ? "default" : "outline"}
                size="sm"
                className={`gap-1.5 h-10 font-bold ${viewModeFratrie ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow' : 'border-indigo-200 text-indigo-900 bg-indigo-50/50 hover:bg-indigo-100'}`}
                onClick={() => setViewModeFratrie(!viewModeFratrie)}
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Vue Fratrie ({childrenList.length})</span>
                <span className="sm:hidden">Fratrie</span>
              </Button>

              {/* Bouton Rattacher un Enfant */}
              <Button
                size="sm"
                className="gap-1.5 h-10 font-bold bg-primary hover:bg-primary/90 text-white shadow-sm"
                onClick={() => {
                  setSearchMatricule('');
                  setFoundStudentCandidate(null);
                  setSearchError(null);
                  setShowAddChildModal(true);
                }}
              >
                <UserPlus className="h-4 w-4" />
                <span>Ajouter un élève</span>
              </Button>

              {/* Sélecteur d'enfant */}
              <div className="flex items-center gap-2 bg-card p-1 rounded-xl border shadow-sm h-10">
                <User className="h-4 w-4 text-primary ml-1" />
                <Select value={selectedChild} onValueChange={(val) => { setSelectedChild(val); setViewModeFratrie(false); }}>
                  <SelectTrigger className="w-48 font-semibold border-0 focus:ring-0 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {childrenList.map((s: Student) => (
                      <SelectItem key={s.id} value={s.id} className="font-medium">
                        {formatStudentName(s)} ({s.matricule})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" size="sm" className="gap-1 relative h-10 px-3" onClick={() => setActiveTab('messages')}>
                <Bell className="h-4 w-4 text-muted-foreground" />
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadMessages}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* ── BARRE DE SÉLECTION RAPIDE MULTI-ÉLÈVES (MULTI-CHILD STRIP) ── */}
        <motion.div variants={fadeInUp} initial="initial" animate="animate">
          <div className="bg-card border rounded-2xl p-2.5 shadow-sm space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" /> Mes Enfants Inscrits ({childrenList.length}) :
              </span>
              <span className="text-[11px] text-muted-foreground">
                Cliquez sur un enfant pour basculer son suivi complet
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {childrenList.map((s: Student) => {
                const isSelected = selectedChild === s.id && !viewModeFratrie;
                const childInitials = `${s.firstName?.[0] || s.nom?.[0] || ''}${s.lastName?.[0] || s.prenom?.[0] || ''}`.toUpperCase() || 'EL';
                
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedChild(s.id);
                      setViewModeFratrie(false);
                    }}
                    className={`relative p-3 rounded-xl border transition-all cursor-pointer select-none group flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary shadow-md ring-2 ring-primary/40'
                        : 'bg-card hover:border-primary/40 hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="h-10 w-10 border-2 border-white shadow-sm shrink-0">
                        <AvatarFallback className={`font-bold text-xs ${isSelected ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}>
                          {childInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate leading-tight">
                          {formatStudentName(s)}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] font-mono text-primary font-semibold">{s.matricule}</span>
                          <span className="text-muted-foreground text-[10px]">•</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-background">
                            {s.className || 'Classe'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isSelected ? (
                        <Badge className="bg-primary text-white text-[10px] px-1.5 py-0.5 font-bold shadow-xs">
                          Actif
                        </Badge>
                      ) : (
                        childrenList.length > 1 && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-opacity" 
                            title="Retirer cet enfant du suivi"
                            onClick={(e) => handleDetachChild(s.id, e)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Bouton Ajouter Direct */}
              <div
                onClick={() => {
                  setSearchMatricule('');
                  setFoundStudentCandidate(null);
                  setSearchError(null);
                  setShowAddChildModal(true);
                }}
                className="p-3 rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-center gap-2 text-muted-foreground hover:text-primary font-bold text-xs select-none min-h-[58px]"
              >
                <Plus className="h-4 w-4" />
                <span>Rattacher un enfant</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── VUE D'ENSEMBLE FRATRIE OU FICHE ENFANT INDIVIDUELLE ── */}
        {viewModeFratrie ? (
          <motion.div variants={fadeInUp} initial="initial" animate="animate" className="space-y-6">
            <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50/50 via-background to-background shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2 text-indigo-950">
                      <Users className="h-5 w-5 text-indigo-600" />
                      Tableau de Bord Familial — Suivi de la Fratrie ({childrenList.length} Enfants)
                    </CardTitle>
                    <CardDescription>
                      Vue comparative synthétique et état financier consolidé pour tous vos enfants
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-white font-bold gap-1.5 shadow-sm text-xs"
                    onClick={() => {
                      setSearchMatricule('');
                      setFoundStudentCandidate(null);
                      setSearchError(null);
                      setShowAddChildModal(true);
                    }}
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Rattacher un autre enfant
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Cartes consolidées */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-card border shadow-xs">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Fratrie Inscrite</p>
                    <p className="text-2xl font-extrabold text-foreground mt-0.5">{childrenList.length} Élèves</p>
                    <p className="text-[11px] text-muted-foreground">Année 2026-2027</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-card border shadow-xs">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Frais Scolarité (Élève actif)</p>
                    <p className={`text-2xl font-extrabold font-mono mt-0.5 ${scolariteSoldeDu > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                      {scolariteSoldeDu > 0 ? formatCurrency(scolariteSoldeDu) : '✓ Réglé'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Scolarité restante</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-card border shadow-xs">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Cantine & Transport</p>
                    <p className="text-2xl font-extrabold font-mono text-amber-900 mt-0.5">
                      {formatCurrency(servicesSoldeDu)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Abonnements mensuels</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-card border shadow-xs bg-gradient-to-br from-primary/10 to-transparent">
                    <p className="text-xs font-semibold text-primary uppercase">Solde Total Dû</p>
                    <p className="text-2xl font-extrabold font-mono text-primary mt-0.5">
                      {formatCurrency(totalGlobalDu)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">Toutes prestations confondues</p>
                  </div>
                </div>

                {/* Grille des fiches enfants */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" /> Fiches individuelles des enfants :
                  </h3>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {childrenList.map((c: Student) => {
                      const cInitials = `${c.firstName?.[0] || c.nom?.[0] || ''}${c.lastName?.[0] || c.prenom?.[0] || ''}`.toUpperCase() || 'EL';
                      const isCurr = selectedChild === c.id;

                      return (
                        <Card key={c.id} className={`border transition-all hover:shadow-md ${isCurr ? 'border-primary shadow-sm bg-primary/5' : ''}`}>
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-xs">
                                  <AvatarFallback className="font-bold bg-primary/10 text-primary">
                                    {cInitials}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <CardTitle className="text-sm font-bold leading-tight">
                                    {formatStudentName(c)}
                                  </CardTitle>
                                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span className="text-xs font-mono text-primary font-semibold">{c.matricule}</span>
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-background">
                                      {c.className || 'Classe'}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              {childrenList.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  title="Retirer cet enfant du suivi"
                                  onClick={(e) => handleDetachChild(c.id, e)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3 pt-0 pb-3 text-xs">
                            <div className="p-2.5 rounded-lg bg-muted/40 space-y-1.5 font-mono">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Statut Scolaire :</span>
                                <span className="font-semibold text-emerald-700">Inscrit & Actif ✓</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Établissement :</span>
                                <span className="font-semibold">{currentSchoolName}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Régime :</span>
                                <span className="font-semibold">{c.statutOrientation === 'AFF' ? 'Affecté État' : 'Non affecté'}</span>
                              </div>
                            </div>
                          </CardContent>
                          <CardFooter className="pt-0 flex items-center justify-between gap-2 border-t p-3 bg-muted/20">
                            <Button
                              size="sm"
                              variant={isCurr ? "default" : "outline"}
                              className={`h-8 text-xs font-bold w-full gap-1.5 ${isCurr ? 'bg-primary text-white' : ''}`}
                              onClick={() => {
                                setSelectedChild(c.id);
                                setViewModeFratrie(false);
                              }}
                            >
                              <User className="h-3.5 w-3.5" />
                              <span>{isCurr ? 'Dossier Actif (Ouvrir)' : 'Consulter ce dossier'}</span>
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <>
            {/* Fiche de l'élève sélectionné avec KPIs synthétiques */}
            <motion.div variants={fadeInUp} initial="initial" animate="animate">
              <Card className="border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-card shadow-sm overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-5">
                    <Avatar className="h-20 w-20 border-4 border-white shadow-md">
                      <AvatarFallback className="text-2xl font-bold bg-primary text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full text-center md:text-left">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Élève inscrit</p>
                        <p className="font-bold text-lg text-foreground">{formatStudentName(child)}</p>
                        <p className="text-xs text-primary font-mono font-semibold">{child.matricule}</p>
                        <Badge variant="outline" className="mt-1 text-[11px] bg-background/80 font-normal">
                          {child.className || classRoom?.name || 'Classe non assignée'}
                        </Badge>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Frais d'Écolage</p>
                        <p className={`font-bold text-xl font-mono mt-0.5 ${scolariteSoldeDu > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                          {scolariteSoldeDu > 0 ? formatCurrency(scolariteSoldeDu) : '✓ Réglé'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {scolariteSoldeDu > 0 ? 'Reste à solder' : 'Scolarité à jour'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cantine & Car</p>
                        <div className="flex items-center justify-center md:justify-start gap-1.5 mt-1 flex-wrap">
                          <Badge variant="secondary" className="text-[11px] gap-1 bg-amber-50 text-amber-900 border-amber-200">
                            <Utensils className="h-3 w-3 text-amber-600" />
                            {cantineSoldeDu > 0 ? `${formatCurrency(cantineSoldeDu)} dû` : 'Cantine à jour'}
                          </Badge>
                          <Badge variant="secondary" className="text-[11px] gap-1 bg-indigo-50 text-indigo-900 border-indigo-200">
                            <Bus className="h-3 w-3 text-indigo-600" />
                            {transportSoldeDu > 0 ? `${formatCurrency(transportSoldeDu)} dû` : 'Car à jour'}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-col items-center md:items-end justify-center">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions de Paiement</p>
                        <Button 
                          onClick={() => {
                            setActiveTab('finances');
                            handleOpenPayment('scolarite');
                          }}
                          className="mt-1.5 h-9 bg-primary hover:bg-primary/90 text-white font-bold gap-1.5 shadow-sm w-full md:w-auto"
                        >
                          <CreditCard className="h-4 w-4" /> Effectuer un Paiement
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}

        {/* Tabs de Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 md:grid-cols-7 w-full h-12 p-1 bg-muted/60 rounded-xl">
            <TabsTrigger value="dashboard" className="gap-1.5 text-xs font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Home className="h-4 w-4" /><span>Accueil</span>
            </TabsTrigger>
            <TabsTrigger value="finances" className="gap-1.5 text-xs font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm text-primary">
              <Wallet className="h-4 w-4" /><span>Finances & Paiements</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5 text-xs font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <BookOpen className="h-4 w-4" /><span>Notes</span>
            </TabsTrigger>
            <TabsTrigger value="presences" className="gap-1.5 text-xs font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Calendar className="h-4 w-4" /><span>Présences</span>
            </TabsTrigger>
            <TabsTrigger value="emploi" className="gap-1.5 text-xs font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Clock className="h-4 w-4" /><span>Emploi du temps</span>
            </TabsTrigger>
            <TabsTrigger value="coran" className="gap-1.5 text-xs font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Moon className="h-4 w-4" /><span>Coran</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-1.5 text-xs font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm relative">
              <MessageSquare className="h-4 w-4" /><span>Messages</span>
              {unreadMessages > 0 && (
                <span className="ml-1 h-4 px-1.5 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadMessages}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1 : DASHBOARD (ACCUEIL) ── */}
          <TabsContent value="dashboard" className="mt-5 space-y-5">
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { 
                  label: 'Frais d\'Écolage Dû', 
                  value: scolariteSoldeDu > 0 ? formatCurrency(scolariteSoldeDu) : 'À jour ✓', 
                  icon: GraduationCap, 
                  color: scolariteSoldeDu > 0 ? 'text-destructive' : 'text-emerald-600', 
                  bg: scolariteSoldeDu > 0 ? 'bg-destructive/10' : 'bg-emerald-50', 
                  trend: scolariteSoldeDu > 0 ? 'Règlement en attente' : 'Entièrement soldé' 
                },
                { 
                  label: 'Services Cantine & Car', 
                  value: (cantineSoldeDu + transportSoldeDu) > 0 ? formatCurrency(cantineSoldeDu + transportSoldeDu) : 'À jour ✓', 
                  icon: Bus, 
                  color: (cantineSoldeDu + transportSoldeDu) > 0 ? 'text-amber-700' : 'text-emerald-600', 
                  bg: 'bg-amber-50', 
                  trend: 'Abonnements mensuels' 
                },
                { 
                  label: 'Moyenne Générale', 
                  value: `${moyenneGen.toFixed(1)}/20`, 
                  icon: BarChart3, 
                  color: 'text-primary', 
                  bg: 'bg-primary/10', 
                  trend: 'Trimestre en cours' 
                },
                { 
                  label: 'Taux d\'Absence', 
                  value: `${presenceStats.tauxAbsence}%`, 
                  icon: UserX, 
                  color: presenceStats.tauxAbsence === 0 ? 'text-emerald-600' : 'text-destructive', 
                  bg: presenceStats.tauxAbsence === 0 ? 'bg-emerald-50' : 'bg-destructive/10', 
                  trend: presenceStats.absents === 0 ? 'Aucune absence enregistrée ✓' : `${presenceStats.absents} j. d'absence (${presenceStats.retards} retard${presenceStats.retards > 1 ? 's' : ''})` 
                },
              ].map(card => (
                <motion.div key={card.label} variants={staggerItem}>
                  <Card className="hover:shadow-md transition-shadow border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">{card.label}</p>
                          <p className={`text-2xl font-bold font-mono mt-1 ${card.color}`}>{card.value}</p>
                          {card.trend && <p className="text-xs text-muted-foreground mt-0.5">{card.trend}</p>}
                        </div>
                        <div className={`p-2.5 rounded-xl ${card.bg}`}>
                          <card.icon className={`h-5 w-5 ${card.color}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* Alertes & Actions Rapides */}
            <div className="grid md:grid-cols-3 gap-5">
              {/* Carte Écolage */}
              <Card className="border-primary/20 shadow-sm flex flex-col justify-between">
                <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-transparent">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" /> Frais d'Écolage & Tranches
                  </CardTitle>
                  <CardDescription>Scolarité, Inscription & Frais annexes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Total attendu :</span>
                    <span className="font-bold font-mono">{formatCurrency(scolariteTotalPrevu)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Total réglé :</span>
                    <span className="font-bold font-mono text-emerald-600">{formatCurrency(scolariteTotalPaye)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t pt-2">
                    <span className="font-semibold">Solde restant dû :</span>
                    <span className={`font-extrabold font-mono text-base ${scolariteSoldeDu > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                      {formatCurrency(scolariteSoldeDu)}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button 
                    className="w-full gap-2 font-bold bg-primary hover:bg-primary/90"
                    onClick={() => {
                      setActiveTab('finances');
                      setFinanceSubTab('scolarite');
                      handleOpenPayment('scolarite');
                    }}
                  >
                    <CreditCard className="h-4 w-4" /> Payer la Scolarité
                  </Button>
                </CardFooter>
              </Card>

              {/* Carte Cantine */}
              <Card className="border-amber-200 shadow-sm flex flex-col justify-between">
                <CardHeader className="pb-3 bg-gradient-to-r from-amber-100/50 to-transparent">
                  <CardTitle className="text-base flex items-center gap-2 text-amber-900">
                    <Utensils className="h-5 w-5 text-amber-600" /> Service de Cantine Scolaire
                  </CardTitle>
                  <CardDescription>Repas équilibrés chauds & Halal</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Tarif mensuel :</span>
                    <span className="font-bold font-mono text-amber-800">{formatCurrency(tarifCantineMensuel)} / mois</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Mensualités réglées :</span>
                    <span className="font-bold font-mono text-emerald-600">
                      {cantineEcheances.filter(e => e.statut === 'paye').length} / {cantineEcheances.length || 8} mois
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t pt-2">
                    <span className="font-semibold">Solde cantine dû :</span>
                    <span className={`font-extrabold font-mono text-base ${cantineSoldeDu > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
                      {formatCurrency(cantineSoldeDu)}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button 
                    variant="outline"
                    className="w-full gap-2 font-bold border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900"
                    onClick={() => {
                      setActiveTab('finances');
                      setFinanceSubTab('cantine');
                      handleOpenPayment('cantine');
                    }}
                  >
                    <Utensils className="h-4 w-4 text-amber-600" /> Payer la Cantine
                  </Button>
                </CardFooter>
              </Card>

              {/* Carte Car / Transport */}
              <Card className="border-indigo-200 shadow-sm flex flex-col justify-between">
                <CardHeader className="pb-3 bg-gradient-to-r from-indigo-100/50 to-transparent">
                  <CardTitle className="text-base flex items-center gap-2 text-indigo-900">
                    <Bus className="h-5 w-5 text-indigo-600" /> Service de Car / Transport
                  </CardTitle>
                  <CardDescription>Ramassage scolaire sécurisé</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Tarif mensuel zone :</span>
                    <span className="font-bold font-mono text-indigo-800">{formatCurrency(tarifTransportMensuel)} / mois</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Mensualités réglées :</span>
                    <span className="font-bold font-mono text-emerald-600">
                      {transportEcheances.filter(e => e.statut === 'paye').length} / {transportEcheances.length || 8} mois
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t pt-2">
                    <span className="font-semibold">Solde transport dû :</span>
                    <span className={`font-extrabold font-mono text-base ${transportSoldeDu > 0 ? 'text-indigo-700' : 'text-emerald-600'}`}>
                      {formatCurrency(transportSoldeDu)}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button 
                    variant="outline"
                    className="w-full gap-2 font-bold border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-900"
                    onClick={() => {
                      setActiveTab('finances');
                      setFinanceSubTab('transport');
                      handleOpenPayment('transport');
                    }}
                  >
                    <Bus className="h-4 w-4 text-indigo-600" /> Payer le Transport
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Aperçu Performance Scolaire & Moyenne */}
            <Card className="border shadow-sm bg-gradient-to-r from-background via-primary/[0.02] to-background">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      Performance Académique & Moyenne Générale
                    </CardTitle>
                    <CardDescription>
                      Progression trimestrielle de {formatStudentName(child)} ({child.matricule})
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs font-bold"
                    onClick={() => setActiveTab('notes')}
                  >
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    Voir toutes les notes & graphiques
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-8 h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={generalAveragesProgression} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorDashboardAvg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                        <XAxis dataKey="code" stroke="#888888" fontSize={11} tickLine={false} />
                        <YAxis domain={[0, 20]} stroke="#888888" fontSize={11} tickLine={false} ticks={[0, 10, 20]} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', fontSize: '11px', border: '1px solid #e2e8f0' }}
                          formatter={(v: any) => [`${Number(v).toFixed(2)}/20`, 'Moyenne']}
                        />
                        <Area
                          type="monotone"
                          dataKey="moyenneEleve"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2.5}
                          fill="url(#colorDashboardAvg)"
                          dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="md:col-span-4 space-y-2 border-l pl-4">
                    <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/15">
                      <span className="text-[11px] text-muted-foreground block">Moyenne Trimestre Actuel :</span>
                      <span className="text-2xl font-extrabold font-mono text-primary">{moyenneGen.toFixed(2)}/20</span>
                    </div>
                    <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-muted/40">
                      <span className="text-muted-foreground">Progression T1→T3 :</span>
                      <span className="font-bold text-emerald-600 font-mono flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> +1.70 pts
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-muted/40">
                      <span className="text-muted-foreground">Rang de l'élève :</span>
                      <span className="font-bold text-foreground font-mono">2e / 35 élèves</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bannière des 4 Modes de Paiement Disponibles */}
            <Card className="border bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md">
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-amber-400" /> Modes de Paiement Hînneh Autorisés
                    </h3>
                    <p className="text-sm text-slate-300 mt-1">
                      Réglez vos frais d'écolage, cantine et transport par <strong className="text-white">Espèces</strong>, <strong className="text-sky-300">WAVE</strong>, <strong className="text-amber-300">MTN MONEY</strong> ou <strong className="text-indigo-300">CORIS BANK</strong> avec délivrance immédiate de reçu officiel.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PAYMENT_METHODS.map(m => (
                      <span key={m.id} className="px-3 py-1 bg-white/10 rounded-lg text-xs font-bold tracking-wide flex items-center gap-1.5 border border-white/15">
                        <m.icon className="h-3.5 w-3.5" /> {m.name}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 2 : FINANCES & PAIEMENTS ── */}
          <TabsContent value="finances" className="mt-5 space-y-6">
            {/* Cartes KPI Finances Globales */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className={`p-4 border-2 ${totalGlobalDu > 0 ? 'border-destructive/30 bg-destructive/5' : 'border-emerald-300 bg-emerald-50/50'}`}>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wide">Solde Global Dû</p>
                <p className={`text-3xl font-extrabold font-mono mt-1 ${totalGlobalDu > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                  {formatCurrency(totalGlobalDu)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Scolarité + Services (Cantine & Car)</p>
              </Card>

              <Card className="p-4 border">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wide">Total Payé (2026-2027)</p>
                <p className="text-3xl font-extrabold font-mono text-primary mt-1">{formatCurrency(totalGlobalPaye)}</p>
                <p className="text-xs text-muted-foreground mt-1">Tous versements cumulés</p>
              </Card>

              <Card className="p-4 border bg-primary/5 border-primary/20">
                <p className="text-xs text-primary uppercase font-bold tracking-wide">Frais de Scolarité</p>
                <p className="text-2xl font-bold font-mono text-primary mt-1">{formatCurrency(scolariteTotalPrevu)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {scolariteSoldeDu > 0 ? `${formatCurrency(scolariteSoldeDu)} restant dû` : '✓ Totalement soldée'}
                </p>
              </Card>

              <Card className="p-4 border bg-amber-50/40 border-amber-200">
                <p className="text-xs text-amber-900 uppercase font-bold tracking-wide">Services (Cantine & Car)</p>
                <p className="text-2xl font-bold font-mono text-amber-800 mt-1">{formatCurrency(servicesTotalPrevu)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {servicesSoldeDu > 0 ? `${formatCurrency(servicesSoldeDu)} restant dû` : '✓ Services à jour'}
                </p>
              </Card>
            </div>

            {/* Barre de navigation financière */}
            <div className="flex items-center justify-between border-b pb-3 flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Button 
                  variant={financeSubTab === 'global' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFinanceSubTab('global')}
                  className={`gap-1.5 font-bold ${financeSubTab === 'global' ? 'bg-primary text-white shadow-sm' : ''}`}
                >
                  <LayoutGrid className="h-4 w-4" /> 📋 1. Échéances Globales (Tout afficher)
                </Button>
                <Button 
                  variant={financeSubTab === 'scolarite' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFinanceSubTab('scolarite')}
                  className={`gap-1.5 font-bold ${financeSubTab === 'scolarite' ? 'bg-primary text-white shadow-sm' : ''}`}
                >
                  <GraduationCap className="h-4 w-4" /> 2. Scolarité & Frais d'Écolage ({scolariteEcheances.length})
                </Button>
                <Button 
                  variant={financeSubTab === 'services' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFinanceSubTab('services')}
                  className={`gap-1.5 font-bold ${financeSubTab === 'services' ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm' : 'text-amber-800 border-amber-300 hover:bg-amber-50'}`}
                >
                  <Utensils className="h-4 w-4" /> 3. Services Annexes (Cantine & Car)
                </Button>
                <Button 
                  variant={financeSubTab === 'historique' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFinanceSubTab('historique')}
                  className="gap-1.5 font-bold"
                >
                  <History className="h-4 w-4" /> 4. Historique des Règlements ({mappedPayments.length})
                </Button>
              </div>

              <Button 
                onClick={() => handleOpenPayment(financeSubTab === 'historique' ? 'scolarite' : (financeSubTab === 'services' ? 'cantine' : 'scolarite'))}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-sm"
              >
                <CreditCard className="h-4 w-4" /> Payer maintenant
              </Button>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                ── SECTION 0 : ÉCHÉANCIER GLOBAL UNIFIÉ (TOUT AFFICHER) ──
            ══════════════════════════════════════════════════════════════ */}
            {financeSubTab === 'global' && (
              <div className="space-y-5">
                {/* Carte de Progression Globale */}
                <Card className="border shadow-sm bg-gradient-to-r from-primary/[0.04] via-background to-background">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2 text-primary">
                          <FileText className="h-5 w-5 text-primary" />
                          Échéancier Global Officiel — {formatStudentName(child)} ({child?.matricule || 'N/A'})
                        </CardTitle>
                        <CardDescription>
                          Calendrier complet et récapitulatif de tous les engagements financiers pour l'année scolaire 2026-2027
                        </CardDescription>
                      </div>
                      <Button 
                        size="sm" 
                        className="gap-1.5 text-xs font-bold bg-primary hover:bg-primary/90 text-white shadow-sm" 
                        onClick={() => handleOpenPayment('scolarite')}
                        disabled={totalGlobalDu <= 0}
                      >
                        <CreditCard className="h-3.5 w-3.5" /> Payer le solde restant ({formatCurrency(totalGlobalDu)})
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-1">
                    {(() => {
                      const total = (scolariteTotalPrevu + cantineTotalPrevu + transportTotalPrevu) || 1;
                      const paid = (scolariteTotalPaye + cantineTotalPaye + transportTotalPaye);
                      const paidPct = Math.min(100, Math.round((paid / total) * 100));
                      const duePct = Math.max(0, 100 - paidPct);

                      return (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-emerald-700 flex items-center gap-1.5">
                              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                              Cumul Réglé : {formatCurrency(paid)} ({paidPct}%)
                            </span>
                            <span className="text-destructive flex items-center gap-1.5">
                              <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
                              Total Reste à Payer : {formatCurrency(totalGlobalDu)} ({duePct}%)
                            </span>
                          </div>
                          <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden flex">
                            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${paidPct}%` }} />
                            <div className="bg-destructive/40 h-full transition-all duration-500" style={{ width: `${duePct}%` }} />
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Grand Tableau Unifié « Échéances » 1-à-1 avec le Reçu */}
                <Card className="border shadow-md overflow-hidden">
                  <CardHeader className="bg-muted/40 border-b py-3.5 px-4 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
                        Échéances
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Ventilation complète par rubriques & services
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs px-2.5 py-1 bg-background font-bold">
                      2026-2027
                    </Badge>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="border-b bg-muted/80 text-foreground font-bold text-xs uppercase tracking-wide">
                        <tr>
                          <th className="text-left p-3.5 border-r border-border">Rubrique</th>
                          <th className="text-center p-3.5 border-r border-border w-28">Date</th>
                          <th className="text-right p-3.5 border-r border-border w-32">Montant</th>
                          <th className="text-right p-3.5 border-r border-border w-32">Payé</th>
                          <th className="text-right p-3.5 border-r border-border w-32">Reste</th>
                          <th className="text-center p-3.5 border-r border-border w-28">Statut</th>
                          <th className="text-center p-3.5 w-28">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* ── 1. FRAIS ÉCOLAGE & INSCRIPTION ── */}
                        <tr className="bg-slate-200/90 dark:bg-slate-800/90 border-y border-slate-300 dark:border-slate-700 font-bold">
                          <td colSpan={7} className="p-2.5 font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100">
                            FRAIS ÉCOLAGE & INSCRIPTION
                          </td>
                        </tr>
                        {scolariteEcheances.map((ech: any) => {
                          const prevu = parseFloat(ech.montant_prevu || 0);
                          const paye = parseFloat(ech.montant_paye || 0);
                          const reste = Math.max(0, prevu - paye);
                          const isPaid = ech.statut === 'paye' || reste === 0;
                          const isPartial = ech.statut === 'en_cours' || (paye > 0 && reste > 0);
                          const isLate = ech.statut === 'en_retard';

                          const dateDisplay = (paye > 0 && (ech.date_paye || ech.date_acquittement))
                            ? formatDate(ech.date_paye || ech.date_acquittement)
                            : (ech.date_echeance ? formatDate(ech.date_echeance) : '-');

                          return (
                            <tr key={`scol-all-${ech.id}`} className="border-b hover:bg-muted/30 transition-colors">
                              <td className="p-3 font-semibold text-foreground border-r border-border">
                                {ech.libelle}
                              </td>
                              <td className="p-3 text-center text-xs font-mono text-muted-foreground border-r border-border">
                                {dateDisplay}
                              </td>
                              <td className="p-3 text-right font-mono font-bold border-r border-border">
                                {prevu.toLocaleString('fr-FR')}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-emerald-600 border-r border-border">
                                {paye.toLocaleString('fr-FR')}
                              </td>
                              <td className={`p-3 text-right font-mono font-bold border-r border-border ${reste > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                {reste.toLocaleString('fr-FR')}
                              </td>
                              <td className="p-3 text-center border-r border-border">
                                {isPaid ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 text-[11px] font-bold">
                                    <CheckCircle2 className="h-3 w-3" /> Payé
                                  </Badge>
                                ) : isPartial ? (
                                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 gap-1 text-[11px] font-bold animate-pulse">
                                    <Clock className="h-3 w-3" /> En cours
                                  </Badge>
                                ) : isLate ? (
                                  <Badge className="bg-rose-100 text-rose-800 border-rose-300 gap-1 text-[11px] font-bold">
                                    <AlertCircle className="h-3 w-3" /> En retard
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-slate-600 border-slate-300 gap-1 text-[11px]">
                                    <Calendar className="h-3 w-3" /> À échoir
                                  </Badge>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {reste > 0 ? (
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs font-bold gap-1 bg-primary text-white hover:bg-primary/90"
                                    onClick={() => handleOpenPayment('scolarite', ech, reste)}
                                  >
                                    <CreditCard className="h-3 w-3" /> Régler
                                  </Button>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200">
                                    Acquitté ✓
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {/* ── 2. CANTINE SCOLAIRE ── */}
                        <tr className="bg-amber-100/90 dark:bg-amber-950/70 border-y border-amber-200 dark:border-amber-900 font-bold">
                          <td colSpan={7} className="p-2.5 font-black text-xs uppercase tracking-wider text-amber-950 dark:text-amber-200">
                            CANTINE SCOLAIRE
                          </td>
                        </tr>
                        {cantineEcheances.map((ech: any) => {
                          const prevu = parseFloat(ech.montant_prevu || 0);
                          const paye = parseFloat(ech.montant_paye || 0);
                          const reste = Math.max(0, prevu - paye);
                          const isPaid = ech.statut === 'paye' || reste === 0;
                          const isPartial = ech.statut === 'en_cours' || (paye > 0 && reste > 0);

                          const dateDisplay = (paye > 0 && (ech.date_paye || ech.date_acquittement))
                            ? formatDate(ech.date_paye || ech.date_acquittement)
                            : (ech.date_echeance ? formatDate(ech.date_echeance) : '-');

                          return (
                            <tr key={`cant-all-${ech.id}`} className="border-b hover:bg-muted/30 transition-colors">
                              <td className="p-3 font-semibold text-foreground border-r border-border">
                                {ech.libelle}
                              </td>
                              <td className="p-3 text-center text-xs font-mono text-muted-foreground border-r border-border">
                                {dateDisplay}
                              </td>
                              <td className="p-3 text-right font-mono font-bold border-r border-border">
                                {prevu.toLocaleString('fr-FR')}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-emerald-600 border-r border-border">
                                {paye.toLocaleString('fr-FR')}
                              </td>
                              <td className={`p-3 text-right font-mono font-bold border-r border-border ${reste > 0 ? 'text-amber-800' : 'text-muted-foreground'}`}>
                                {reste.toLocaleString('fr-FR')}
                              </td>
                              <td className="p-3 text-center border-r border-border">
                                {isPaid ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 text-[11px] font-bold">
                                    <CheckCircle2 className="h-3 w-3" /> Payé
                                  </Badge>
                                ) : isPartial ? (
                                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 gap-1 text-[11px] font-bold animate-pulse">
                                    <Clock className="h-3 w-3" /> En cours
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-slate-600 border-slate-300 gap-1 text-[11px]">
                                    <Calendar className="h-3 w-3" /> À échoir
                                  </Badge>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {reste > 0 ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs font-bold gap-1 border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900"
                                    onClick={() => handleOpenPayment('cantine', ech, reste)}
                                  >
                                    <Utensils className="h-3 w-3" /> Régler
                                  </Button>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200">
                                    Acquitté ✓
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {/* ── 3. TRANSPORT SCOLAIRE ── */}
                        <tr className="bg-indigo-100/90 dark:bg-indigo-950/70 border-y border-indigo-200 dark:border-indigo-900 font-bold">
                          <td colSpan={7} className="p-2.5 font-black text-xs uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                            TRANSPORT SCOLAIRE
                          </td>
                        </tr>
                        {transportEcheances.map((ech: any) => {
                          const prevu = parseFloat(ech.montant_prevu || 0);
                          const paye = parseFloat(ech.montant_paye || 0);
                          const reste = Math.max(0, prevu - paye);
                          const isPaid = ech.statut === 'paye' || reste === 0;
                          const isPartial = ech.statut === 'en_cours' || (paye > 0 && reste > 0);

                          const dateDisplay = (paye > 0 && (ech.date_paye || ech.date_acquittement))
                            ? formatDate(ech.date_paye || ech.date_acquittement)
                            : (ech.date_echeance ? formatDate(ech.date_echeance) : '-');

                          return (
                            <tr key={`trans-all-${ech.id}`} className="border-b hover:bg-muted/30 transition-colors">
                              <td className="p-3 font-semibold text-foreground border-r border-border">
                                {ech.libelle}
                              </td>
                              <td className="p-3 text-center text-xs font-mono text-muted-foreground border-r border-border">
                                {dateDisplay}
                              </td>
                              <td className="p-3 text-right font-mono font-bold border-r border-border">
                                {prevu.toLocaleString('fr-FR')}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-emerald-600 border-r border-border">
                                {paye.toLocaleString('fr-FR')}
                              </td>
                              <td className={`p-3 text-right font-mono font-bold border-r border-border ${reste > 0 ? 'text-indigo-800' : 'text-muted-foreground'}`}>
                                {reste.toLocaleString('fr-FR')}
                              </td>
                              <td className="p-3 text-center border-r border-border">
                                {isPaid ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 text-[11px] font-bold">
                                    <CheckCircle2 className="h-3 w-3" /> Payé
                                  </Badge>
                                ) : isPartial ? (
                                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 gap-1 text-[11px] font-bold animate-pulse">
                                    <Clock className="h-3 w-3" /> En cours
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-slate-600 border-slate-300 gap-1 text-[11px]">
                                    <Calendar className="h-3 w-3" /> À échoir
                                  </Badge>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {reste > 0 ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs font-bold gap-1 border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-900"
                                    onClick={() => handleOpenPayment('transport', ech, reste)}
                                  >
                                    <Bus className="h-3 w-3" /> Régler
                                  </Button>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200">
                                    Acquitté ✓
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="border-t-2 border-primary/40 bg-muted/60 font-black text-sm">
                        <tr>
                          <td className="p-3.5 font-black uppercase text-foreground border-r border-border" colSpan={2}>
                            TOTAL GÉNÉRAL
                          </td>
                          <td className="p-3.5 text-right font-mono text-base border-r border-border">
                            {formatCurrency(scolariteTotalPrevu + cantineTotalPrevu + transportTotalPrevu)}
                          </td>
                          <td className="p-3.5 text-right font-mono text-base text-emerald-600 border-r border-border">
                            {formatCurrency(scolariteTotalPaye + cantineTotalPaye + transportTotalPaye)}
                          </td>
                          <td className="p-3.5 text-right font-mono text-base text-destructive border-r border-border">
                            {formatCurrency(totalGlobalDu)}
                          </td>
                          <td colSpan={2} className="p-3.5 text-center">
                            <Badge className={totalGlobalDu === 0 ? "bg-emerald-600 text-white font-bold" : "bg-destructive text-white font-bold"}>
                              {totalGlobalDu === 0 ? "Entièrement Soldé ✓" : `${formatCurrency(totalGlobalDu)} Dû`}
                            </Badge>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                ── SECTION 2 : FRAIS DE SCOLARITÉ & DROITS D'ÉCOLAGE ──
            ══════════════════════════════════════════════════════════════ */}
            {financeSubTab === 'scolarite' && (
              <div className="space-y-5">
                {/* Carte de Progression Dédiée Scolarité */}
                <Card className="border shadow-sm bg-gradient-to-r from-primary/[0.03] via-background to-background">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2 text-primary">
                          <GraduationCap className="h-5 w-5 text-primary" />
                          Échéancier Officiel des Frais d'Écolage — {formatStudentName(child)} ({child.matricule})
                        </CardTitle>
                        <CardDescription>
                          Calendrier et suivi des versements de scolarité et droits d'inscription (2026-2027)
                        </CardDescription>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="gap-1 text-xs font-bold border-primary/30 text-primary hover:bg-primary/10" 
                        onClick={() => handleOpenPayment('scolarite')}
                        disabled={scolariteSoldeDu <= 0}
                      >
                        <CreditCard className="h-3.5 w-3.5" /> Payer le solde scolarité ({formatCurrency(scolariteSoldeDu)})
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-1">
                    {/* Barre de Progression Scolarité */}
                    {(() => {
                      const total = scolariteTotalPrevu || 1;
                      const paid = scolariteTotalPaye;
                      const paidPct = Math.min(100, Math.round((paid / total) * 100));
                      const duePct = Math.max(0, 100 - paidPct);

                      return (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-emerald-700 flex items-center gap-1.5">
                              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                              Scolarité Payée : {formatCurrency(paid)} ({paidPct}%)
                            </span>
                            <span className="text-primary flex items-center gap-1.5">
                              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                              Solde Scolarité Dû : {formatCurrency(scolariteSoldeDu)} ({duePct}%)
                            </span>
                          </div>
                          <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden flex">
                            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${paidPct}%` }} />
                            <div className="bg-primary/40 h-full transition-all duration-500" style={{ width: `${duePct}%` }} />
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Tableau Pagé de Scolarité */}
                <Card className="border shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-muted/40 text-muted-foreground font-semibold text-xs">
                        <tr>
                          <th className="text-left p-3.5">Libellé de la Tranche</th>
                          <th className="text-left p-3.5">Date d'Échéance</th>
                          <th className="text-right p-3.5">Montant Prévu</th>
                          <th className="text-right p-3.5">Montant Réglé</th>
                          <th className="text-right p-3.5">Solde Dû</th>
                          <th className="text-center p-3.5">Statut</th>
                          <th className="text-right p-3.5">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {paginatedScolarite.map((ech: any) => {
                          const prevu = parseFloat(ech.montant_prevu || 0);
                          const paye = parseFloat(ech.montant_paye || 0);
                          const solde = Math.max(0, prevu - paye);
                          const isPaid = ech.statut === 'paye' || solde === 0;
                          const isPartial = ech.statut === 'en_cours' || ech.statut === 'partiel' || (paye > 0 && solde > 0);
                          const isLate = ech.statut === 'en_retard';

                          return (
                            <tr key={ech.id} className="hover:bg-muted/20 transition-colors">
                              <td className="p-3.5 font-bold text-foreground">
                                {ech.libelle}
                              </td>
                              <td className="p-3.5 text-muted-foreground text-xs font-mono">
                                {ech.date_echeance ? formatDate(ech.date_echeance) : '05 Septembre 2026'}
                              </td>
                              <td className="p-3.5 text-right font-mono font-semibold">
                                {formatCurrency(prevu)}
                              </td>
                              <td className="p-3.5 text-right font-mono font-bold text-emerald-600">
                                {formatCurrency(paye)}
                              </td>
                              <td className={`p-3.5 text-right font-mono font-bold ${solde > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                {formatCurrency(solde)}
                              </td>
                              <td className="p-3.5 text-center">
                                {isPaid ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100 gap-1 font-bold text-xs">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                    Payé
                                  </Badge>
                                ) : isPartial ? (
                                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-100 gap-1 font-bold text-xs animate-pulse">
                                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                                    En cours
                                  </Badge>
                                ) : isLate ? (
                                  <Badge className="bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-100 gap-1 font-bold text-xs">
                                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                                    En retard
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-slate-600 border-slate-300 gap-1 font-medium text-xs bg-slate-50">
                                    <Calendar className="h-3 w-3 text-slate-500" />
                                    À échoir
                                  </Badge>
                                )}
                              </td>
                              <td className="p-3.5 text-right">
                                {!isPaid ? (
                                  <Button 
                                    size="sm" 
                                    className="h-8 text-xs font-bold gap-1 bg-primary hover:bg-primary/90"
                                    onClick={() => handleOpenPayment('scolarite', ech, solde)}
                                  >
                                    <CreditCard className="h-3 w-3" /> Régler
                                  </Button>
                                ) : (
                                  <span className="text-xs text-emerald-600 font-bold font-mono">✓ Soldé</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {(() => {
                        const pagePrevu = paginatedScolarite.reduce((s: number, e: any) => s + parseFloat(e.montant_prevu || 0), 0);
                        const pagePaye = paginatedScolarite.reduce((s: number, e: any) => s + parseFloat(e.montant_paye || 0), 0);
                        const pageSolde = paginatedScolarite.reduce((s: number, e: any) => s + Math.max(0, parseFloat(e.montant_prevu || 0) - parseFloat(e.montant_paye || 0)), 0);
                        const isMultiplePages = scolariteEcheances.length > scolaritePerPage;

                        return (
                          <tfoot className="border-t-2 border-primary/30 bg-primary/5 font-bold">
                            {isMultiplePages && (
                              <tr className="border-b border-border/60 text-xs bg-muted/40 font-semibold">
                                <td className="p-2.5 font-bold text-muted-foreground" colSpan={2}>
                                  Sous-total Page ({paginatedScolarite.length} tranches affichées)
                                </td>
                                <td className="p-2.5 text-right font-mono font-semibold">
                                  {formatCurrency(pagePrevu)}
                                </td>
                                <td className="p-2.5 text-right font-mono font-semibold text-emerald-600">
                                  {formatCurrency(pagePaye)}
                                </td>
                                <td className={`p-2.5 text-right font-mono font-bold ${pageSolde > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                  {formatCurrency(pageSolde)}
                                </td>
                                <td colSpan={2} className="p-2.5 text-center text-[11px] text-muted-foreground font-medium">
                                  Page {scolaritePage} / {Math.ceil(scolariteEcheances.length / scolaritePerPage)}
                                </td>
                              </tr>
                            )}
                            <tr>
                              <td className="p-3.5 font-bold text-foreground" colSpan={2}>
                                TOTAL SCOLARITÉ ({scolariteEcheances.length} tranches)
                              </td>
                              <td className="p-3.5 text-right font-mono text-foreground font-extrabold">
                                {formatCurrency(scolariteTotalPrevu)}
                              </td>
                              <td className="p-3.5 text-right font-mono text-emerald-600 font-extrabold">
                                {formatCurrency(scolariteTotalPaye)}
                              </td>
                              <td className={`p-3.5 text-right font-mono font-extrabold ${scolariteSoldeDu > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                {formatCurrency(scolariteSoldeDu)}
                              </td>
                              <td colSpan={2} className="p-3.5 text-center text-xs text-muted-foreground">
                                {scolariteSoldeDu === 0 ? '✓ Scolarité soldée' : `${formatCurrency(scolariteSoldeDu)} restant dû`}
                              </td>
                            </tr>
                          </tfoot>
                        );
                      })()}
                    </table>
                  </div>

                  {/* Pagination Scolarité */}
                  <TablePagination
                    currentPage={scolaritePage}
                    totalItems={scolariteEcheances.length}
                    perPage={scolaritePerPage}
                    onPageChange={setScolaritePage}
                    onPerPageChange={setScolaritePerPage}
                    itemName="tranches de scolarité"
                  />
                </Card>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                ── SECTION 2 : SERVICES ANNEXES (CANTINE & CAR) ──
            ══════════════════════════════════════════════════════════════ */}
            {financeSubTab === 'services' && (
              <div className="space-y-5">
                {/* Carte de Progression Dédiée Services */}
                <Card className="border-amber-200 shadow-sm bg-gradient-to-r from-amber-50/40 via-background to-background">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2 text-amber-900">
                          <Utensils className="h-5 w-5 text-amber-600" />
                          Services Annexes (Cantine & Car / Transport) — {formatStudentName(child)}
                        </CardTitle>
                        <CardDescription>
                          Gestion indépendante des abonnements mensuels de restauration et de ramassage scolaire
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-xs px-2.5 py-1 font-bold">
                          Cantine : {formatCurrency(tarifCantineMensuel)}/m
                        </Badge>
                        <Badge className="bg-indigo-100 text-indigo-900 border-indigo-300 text-xs px-2.5 py-1 font-bold">
                          Car : {formatCurrency(tarifTransportMensuel)}/m
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-1">
                    {/* Barre de Progression Services */}
                    {(() => {
                      const total = servicesTotalPrevu || 1;
                      const paid = servicesTotalPaye;
                      const paidPct = Math.min(100, Math.round((paid / total) * 100));
                      const duePct = Math.max(0, 100 - paidPct);

                      return (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-emerald-700 flex items-center gap-1.5">
                              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                              Services Réglés : {formatCurrency(paid)} ({paidPct}%)
                            </span>
                            <span className="text-amber-900 flex items-center gap-1.5">
                              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                              Solde Services Dû : {formatCurrency(servicesSoldeDu)} ({duePct}%)
                            </span>
                          </div>
                          <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden flex">
                            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${paidPct}%` }} />
                            <div className="bg-amber-400 h-full transition-all duration-500" style={{ width: `${duePct}%` }} />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Sous-Onglets Internes aux Services */}
                    <div className="flex items-center justify-between border-t pt-3 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={servicesSubTab === 'all' ? 'default' : 'outline'}
                          onClick={() => { setServicesSubTab('all'); setServicesPage(1); }}
                          className={`h-8 text-xs font-bold ${servicesSubTab === 'all' ? 'bg-amber-700 text-white' : ''}`}
                        >
                          <Calendar className="h-3.5 w-3.5 mr-1" /> Échéancier Tous Services ({servicesEcheancesCombined.length})
                        </Button>
                        <Button
                          size="sm"
                          variant={servicesSubTab === 'cantine' ? 'default' : 'outline'}
                          onClick={() => { setServicesSubTab('cantine'); setCantinePage(1); }}
                          className={`h-8 text-xs font-bold ${servicesSubTab === 'cantine' ? 'bg-amber-600 text-white' : 'text-amber-800 border-amber-200'}`}
                        >
                          <Utensils className="h-3.5 w-3.5 mr-1" /> Cantine Scolaire ({cantineEcheances.length} mois)
                        </Button>
                        <Button
                          size="sm"
                          variant={servicesSubTab === 'transport' ? 'default' : 'outline'}
                          onClick={() => { setServicesSubTab('transport'); setTransportPage(1); }}
                          className={`h-8 text-xs font-bold ${servicesSubTab === 'transport' ? 'bg-indigo-600 text-white' : 'text-indigo-800 border-indigo-200'}`}
                        >
                          <Bus className="h-3.5 w-3.5 mr-1" /> Car / Transport ({transportEcheances.length} mois)
                        </Button>
                      </div>

                      {servicesSubTab === 'all' && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[
                            { key: 'all', label: 'Tous' },
                            { key: 'paye', label: '✓ Payé' },
                            { key: 'en_cours', label: '⏳ En cours' },
                            { key: 'a_echoir', label: '📅 À échoir' },
                          ].map(f => (
                            <Button
                              key={f.key}
                              size="sm"
                              variant={servicesFilter === f.key ? 'default' : 'ghost'}
                              onClick={() => { setServicesFilter(f.key as any); setServicesPage(1); }}
                              className={`h-7 px-2 text-xs font-bold ${servicesFilter === f.key ? 'bg-amber-600 text-white' : 'text-muted-foreground'}`}
                            >
                              {f.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* SOUS-VUE SERVICES 1 : ÉCHÉANCIER RÉCAPITULATIF TOUS SERVICES */}
                {servicesSubTab === 'all' && (
                  <Card className="border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b bg-muted/40 text-muted-foreground font-semibold text-xs">
                          <tr>
                            <th className="text-left p-3.5">Service</th>
                            <th className="text-left p-3.5">Mois / Libellé</th>
                            <th className="text-left p-3.5">Date d'Échéance</th>
                            <th className="text-right p-3.5">Montant Prévu</th>
                            <th className="text-right p-3.5">Montant Réglé</th>
                            <th className="text-right p-3.5">Reste Dû</th>
                            <th className="text-center p-3.5">Statut</th>
                            <th className="text-right p-3.5">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {paginatedServicesCombined.map((ech: any, i: number) => {
                            const prevu = parseFloat(ech.montant_prevu || 0);
                            const paye = parseFloat(ech.montant_paye || 0);
                            const isDesabonne = ech.statut === 'desabonne' || ech.is_desabonne;
                            const solde = isDesabonne ? 0 : Math.max(0, prevu - paye);
                            const isPaid = !isDesabonne && (ech.statut === 'paye' || solde === 0);
                            const isPartial = !isDesabonne && (ech.statut === 'en_cours' || ech.statut === 'partiel' || (paye > 0 && solde > 0));

                            return (
                              <tr key={`${ech.serviceGroup}-${ech.id || i}`} className={`hover:bg-muted/10 transition-colors ${isDesabonne ? 'opacity-65 bg-muted/5' : ''}`}>
                                <td className="p-3.5">
                                  <Badge className={`${ech.badgeClass} border font-bold text-[11px]`}>
                                    {ech.groupLabel}
                                  </Badge>
                                </td>
                                <td className="p-3.5 font-bold text-foreground">
                                  {ech.libelle} {isDesabonne && <span className="text-[11px] font-semibold text-muted-foreground italic">(Désabonné)</span>}
                                </td>
                                <td className="p-3.5 text-muted-foreground text-xs font-mono">
                                  {isDesabonne ? '—' : ech.date_echeance ? formatDate(ech.date_echeance) : '05 du mois'}
                                </td>
                                <td className="p-3.5 text-right font-mono font-semibold">{isDesabonne ? '—' : formatCurrency(prevu)}</td>
                                <td className="p-3.5 text-right font-mono font-bold text-emerald-600">{paye > 0 ? formatCurrency(paye) : '—'}</td>
                                <td className={`p-3.5 text-right font-mono font-bold ${isDesabonne ? 'text-muted-foreground' : solde > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                  {isDesabonne ? <span className="italic text-xs font-semibold">Désabonné</span> : formatCurrency(solde)}
                                </td>
                                <td className="p-3.5 text-center">
                                  {isDesabonne ? (
                                    <Badge variant="outline" className="text-slate-600 border-slate-300 gap-1 font-bold text-xs bg-slate-100 dark:bg-slate-800">
                                      Désabonné
                                    </Badge>
                                  ) : isPaid ? (
                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 font-bold text-xs">
                                      <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Payé
                                    </Badge>
                                  ) : isPartial ? (
                                    <Badge className="bg-amber-100 text-amber-900 border-amber-300 gap-1 font-bold text-xs animate-pulse">
                                      <Clock className="h-3 w-3 text-amber-600" /> En cours
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-slate-600 border-slate-300 text-xs bg-slate-50">
                                      À échoir
                                    </Badge>
                                  )}
                                </td>
                                <td className="p-3.5 text-right">
                                  {!isPaid && !isDesabonne && (
                                    <Button 
                                      size="sm" 
                                      className="h-8 text-xs font-bold gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                                      onClick={() => handleOpenPayment(ech.serviceGroup, ech, solde)}
                                    >
                                      <CreditCard className="h-3 w-3" /> Régler
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {(() => {
                          const pagePrevu = paginatedServicesCombined.reduce((s: number, e: any) => s + parseFloat(e.montant_prevu || 0), 0);
                          const pagePaye = paginatedServicesCombined.reduce((s: number, e: any) => s + parseFloat(e.montant_paye || 0), 0);
                          const pageSolde = paginatedServicesCombined.reduce((s: number, e: any) => s + Math.max(0, parseFloat(e.montant_prevu || 0) - parseFloat(e.montant_paye || 0)), 0);
                          const isMultiplePages = filteredServicesEcheances.length > servicesPerPage;

                          return (
                            <tfoot className="border-t-2 border-amber-300 bg-amber-50/60 font-bold">
                              {isMultiplePages && (
                                <tr className="border-b border-amber-200 text-xs bg-muted/40 font-semibold">
                                  <td className="p-2.5 font-bold text-muted-foreground" colSpan={3}>
                                    Sous-total Page ({paginatedServicesCombined.length} mensualités affichées)
                                  </td>
                                  <td className="p-2.5 text-right font-mono font-semibold">
                                    {formatCurrency(pagePrevu)}
                                  </td>
                                  <td className="p-2.5 text-right font-mono font-semibold text-emerald-600">
                                    {formatCurrency(pagePaye)}
                                  </td>
                                  <td className={`p-2.5 text-right font-mono font-bold ${pageSolde > 0 ? 'text-amber-900' : 'text-muted-foreground'}`}>
                                    {formatCurrency(pageSolde)}
                                  </td>
                                  <td colSpan={2} className="p-2.5 text-center text-[11px] text-muted-foreground font-medium">
                                    Page {servicesPage} / {Math.ceil(filteredServicesEcheances.length / servicesPerPage)}
                                  </td>
                                </tr>
                              )}
                              <tr>
                                <td className="p-3.5 font-bold text-foreground" colSpan={3}>
                                  TOTAL SERVICES ANNEXES ({filteredServicesEcheances.length} mensualités)
                                </td>
                                <td className="p-3.5 text-right font-mono text-foreground font-extrabold">
                                  {formatCurrency(servicesTotalPrevu)}
                                </td>
                                <td className="p-3.5 text-right font-mono text-emerald-600 font-extrabold">
                                  {formatCurrency(servicesTotalPaye)}
                                </td>
                                <td className={`p-3.5 text-right font-mono font-extrabold ${servicesSoldeDu > 0 ? 'text-amber-900' : 'text-muted-foreground'}`}>
                                  {formatCurrency(servicesSoldeDu)}
                                </td>
                                <td colSpan={2} className="p-3.5 text-center text-xs text-muted-foreground">
                                  {servicesSoldeDu === 0 ? '✓ Services soldés' : `${formatCurrency(servicesSoldeDu)} restant dû`}
                                </td>
                              </tr>
                            </tfoot>
                          );
                        })()}
                      </table>
                    </div>

                    {/* Pagination Services Combinés */}
                    <TablePagination
                      currentPage={servicesPage}
                      totalItems={filteredServicesEcheances.length}
                      perPage={servicesPerPage}
                      onPageChange={setServicesPage}
                      onPerPageChange={setServicesPerPage}
                      itemName="échéances de services"
                    />
                  </Card>
                )}

                {/* SOUS-VUE SERVICES 2 : CANTINE SCOLAIRE */}
                {servicesSubTab === 'cantine' && (
                  <div className="space-y-4">
                    <Card className="border-amber-200">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <CardTitle className="text-base flex items-center gap-2 text-amber-900">
                            <Utensils className="h-5 w-5 text-amber-600" />
                            Abonnement Cantine Scolaire — Sélection des Mois
                          </CardTitle>
                          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-xs px-3 py-1 font-bold">
                            Tarif : {formatCurrency(tarifCantineMensuel)} / mois
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-9 gap-2.5">
                          {MONTHS_ORDER.map((mois) => {
                            const existingEch = cantineEcheances.find(e => e.libelle?.toLowerCase().includes(mois.toLowerCase()));
                            const isAlreadyPaid = existingEch?.statut === 'paye' || (existingEch && parseFloat(existingEch.montant_paye) >= parseFloat(existingEch.montant_prevu));
                            const isSelected = selectedCantineMonths.includes(mois);

                            return (
                              <div
                                key={mois}
                                onClick={() => {
                                  if (isAlreadyPaid) return;
                                  if (isSelected) {
                                    setSelectedCantineMonths(prev => prev.filter(m => m !== mois));
                                  } else {
                                    setSelectedCantineMonths(prev => [...prev, mois]);
                                  }
                                }}
                                className={`p-3 rounded-xl border text-center transition-all cursor-pointer select-none flex flex-col items-center justify-between gap-1.5 ${
                                  isAlreadyPaid
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 opacity-90 cursor-default'
                                    : existingEch?.statut === 'en_cours'
                                    ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm'
                                    : isSelected
                                    ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-400'
                                    : 'bg-card hover:border-amber-400 hover:bg-amber-50/50'
                                }`}
                              >
                                <span className="text-xs font-bold">{mois}</span>
                                <span className="text-[11px] font-mono opacity-90">{formatCurrency(tarifCantineMensuel)}</span>
                                {isAlreadyPaid ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] py-0 font-bold">
                                    ✓ Payé
                                  </Badge>
                                ) : existingEch?.statut === 'en_cours' ? (
                                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] py-0 font-bold animate-pulse">
                                    ⏳ En cours
                                  </Badge>
                                ) : (
                                  <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${isSelected ? 'bg-white text-amber-600' : 'border-muted-foreground/40'}`}>
                                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-amber-900">
                              {selectedCantineMonths.length} mois sélectionné(s) : <span className="font-mono">{selectedCantineMonths.join(', ') || 'Aucun'}</span>
                            </p>
                            <p className="text-2xl font-extrabold font-mono text-amber-900 mt-0.5">
                              Total à régler : {formatCurrency(selectedCantineMonths.length * tarifCantineMensuel)}
                            </p>
                          </div>
                          <Button
                            disabled={selectedCantineMonths.length === 0}
                            onClick={() => handleOpenPayment('cantine', null, selectedCantineMonths.length * tarifCantineMensuel)}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 px-6 h-11 shadow"
                          >
                            <Utensils className="h-4 w-4" />
                            Payer la Cantine ({formatCurrency(selectedCantineMonths.length * tarifCantineMensuel)})
                          </Button>
                        </div>

                        {/* Tableau Détaillé Cantine avec Pagination */}
                        <div className="pt-2 border-t">
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                            Détail des Mensualités de Cantine (Échéancier) :
                          </h4>
                          <div className="overflow-x-auto rounded-xl border">
                            <table className="w-full text-sm">
                              <thead className="border-b bg-muted/40 text-muted-foreground font-semibold text-xs">
                                <tr>
                                  <th className="text-left p-3">Mois d'Abonnement</th>
                                  <th className="text-right p-3">Montant Prévu</th>
                                  <th className="text-right p-3">Montant Réglé</th>
                                  <th className="text-right p-3">Reste Dû</th>
                                  <th className="text-center p-3">Statut</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {paginatedCantine.map((ech: any) => {
                                  const prevu = parseFloat(ech.montant_prevu || 0);
                                  const paye = parseFloat(ech.montant_paye || 0);
                                  const solde = Math.max(0, prevu - paye);
                                  const isPaid = ech.statut === 'paye' || solde === 0;
                                  const isPartial = ech.statut === 'en_cours' || ech.statut === 'partiel' || (paye > 0 && solde > 0);

                                  return (
                                    <tr key={ech.id} className="hover:bg-muted/10">
                                      <td className="p-3 font-semibold text-foreground">{ech.libelle}</td>
                                      <td className="p-3 text-right font-mono">{formatCurrency(prevu)}</td>
                                      <td className="p-3 text-right font-mono font-bold text-emerald-600">{formatCurrency(paye)}</td>
                                      <td className={`p-3 text-right font-mono font-bold ${solde > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{formatCurrency(solde)}</td>
                                      <td className="p-3 text-center">
                                        {isPaid ? (
                                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 font-bold text-xs">
                                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Payé
                                          </Badge>
                                        ) : isPartial ? (
                                          <Badge className="bg-amber-100 text-amber-900 border-amber-300 gap-1 font-bold text-xs animate-pulse">
                                            <Clock className="h-3 w-3 text-amber-600" /> En cours
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-slate-600 border-slate-300 text-xs bg-slate-50">
                                            À échoir
                                          </Badge>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              {(() => {
                                const pagePrevu = paginatedCantine.reduce((s: number, e: any) => s + parseFloat(e.montant_prevu || 0), 0);
                                const pagePaye = paginatedCantine.reduce((s: number, e: any) => s + parseFloat(e.montant_paye || 0), 0);
                                const pageSolde = paginatedCantine.reduce((s: number, e: any) => s + Math.max(0, parseFloat(e.montant_prevu || 0) - parseFloat(e.montant_paye || 0)), 0);
                                const isMultiplePages = cantineEcheances.length > cantinePerPage;

                                return (
                                  <tfoot className="border-t-2 border-amber-300 bg-amber-50/50 font-bold">
                                    {isMultiplePages && (
                                      <tr className="border-b border-amber-200 text-xs bg-muted/40 font-semibold">
                                        <td className="p-2.5 font-bold text-muted-foreground">
                                          Sous-total Page ({paginatedCantine.length} mois affichés)
                                        </td>
                                        <td className="p-2.5 text-right font-mono font-semibold">
                                          {formatCurrency(pagePrevu)}
                                        </td>
                                        <td className="p-2.5 text-right font-mono font-semibold text-emerald-600">
                                          {formatCurrency(pagePaye)}
                                        </td>
                                        <td className={`p-2.5 text-right font-mono font-bold ${pageSolde > 0 ? 'text-amber-900' : 'text-muted-foreground'}`}>
                                          {formatCurrency(pageSolde)}
                                        </td>
                                        <td className="p-2.5 text-center text-[11px] text-muted-foreground font-medium">
                                          Page {cantinePage} / {Math.ceil(cantineEcheances.length / cantinePerPage)}
                                        </td>
                                      </tr>
                                    )}
                                    <tr>
                                      <td className="p-3 font-bold text-foreground">
                                        TOTAL CANTINE ({cantineEcheances.length} mois)
                                      </td>
                                      <td className="p-3 text-right font-mono text-foreground font-extrabold">
                                        {formatCurrency(cantineTotalPrevu)}
                                      </td>
                                      <td className="p-3 text-right font-mono text-emerald-600 font-extrabold">
                                        {formatCurrency(cantineTotalPaye)}
                                      </td>
                                      <td className={`p-3 text-right font-mono font-extrabold ${cantineSoldeDu > 0 ? 'text-amber-900' : 'text-muted-foreground'}`}>
                                        {formatCurrency(cantineSoldeDu)}
                                      </td>
                                      <td className="p-3 text-center text-xs text-muted-foreground">
                                        {cantineSoldeDu === 0 ? '✓ Cantine soldée' : `${formatCurrency(cantineSoldeDu)} dû`}
                                      </td>
                                    </tr>
                                  </tfoot>
                                );
                              })()}
                            </table>
                          </div>

                          {/* Pagination Cantine */}
                          <TablePagination
                            currentPage={cantinePage}
                            totalItems={cantineEcheances.length}
                            perPage={cantinePerPage}
                            onPageChange={setCantinePage}
                            onPerPageChange={setCantinePerPage}
                            itemName="mensualités de cantine"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* SOUS-VUE SERVICES 3 : CAR / TRANSPORT */}
                {servicesSubTab === 'transport' && (
                  <div className="space-y-4">
                    <Card className="border-indigo-200">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <CardTitle className="text-base flex items-center gap-2 text-indigo-900">
                            <Bus className="h-5 w-5 text-indigo-600" />
                            Abonnement Car & Transport — Sélection des Mois
                          </CardTitle>
                          <Badge className="bg-indigo-100 text-indigo-900 border-indigo-300 text-xs px-3 py-1 font-bold">
                            Tarif : {formatCurrency(tarifTransportMensuel)} / mois
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-9 gap-2.5">
                          {MONTHS_ORDER.map((mois) => {
                            const existingEch = transportEcheances.find(e => e.libelle?.toLowerCase().includes(mois.toLowerCase()));
                            const isAlreadyPaid = existingEch?.statut === 'paye' || (existingEch && parseFloat(existingEch.montant_paye) >= parseFloat(existingEch.montant_prevu));
                            const isSelected = selectedTransportMonths.includes(mois);

                            return (
                              <div
                                key={mois}
                                onClick={() => {
                                  if (isAlreadyPaid) return;
                                  if (isSelected) {
                                    setSelectedTransportMonths(prev => prev.filter(m => m !== mois));
                                  } else {
                                    setSelectedTransportMonths(prev => [...prev, mois]);
                                  }
                                }}
                                className={`p-3 rounded-xl border text-center transition-all cursor-pointer select-none flex flex-col items-center justify-between gap-1.5 ${
                                  isAlreadyPaid
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 opacity-90 cursor-default'
                                    : existingEch?.statut === 'en_cours'
                                    ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm'
                                    : isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-400'
                                    : 'bg-card hover:border-indigo-400 hover:bg-indigo-50/50'
                                }`}
                              >
                                <span className="text-xs font-bold">{mois}</span>
                                <span className="text-[11px] font-mono opacity-90">{formatCurrency(tarifTransportMensuel)}</span>
                                {isAlreadyPaid ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] py-0 font-bold">
                                    ✓ Payé
                                  </Badge>
                                ) : existingEch?.statut === 'en_cours' ? (
                                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] py-0 font-bold animate-pulse">
                                    ⏳ Partiel
                                  </Badge>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground font-semibold">À payer</span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-indigo-900">
                              {selectedTransportMonths.length} mois sélectionné(s) : <span className="font-mono">{selectedTransportMonths.join(', ') || 'Aucun'}</span>
                            </p>
                            <p className="text-2xl font-extrabold font-mono text-indigo-900 mt-0.5">
                              Total à régler : {formatCurrency(selectedTransportMonths.length * tarifTransportMensuel)}
                            </p>
                          </div>
                          <Button
                            disabled={selectedTransportMonths.length === 0}
                            onClick={() => handleOpenPayment('transport', null, selectedTransportMonths.length * tarifTransportMensuel)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 px-6 h-11 shadow"
                          >
                            <Bus className="h-4 w-4" />
                            Payer le Transport ({formatCurrency(selectedTransportMonths.length * tarifTransportMensuel)})
                          </Button>
                        </div>

                        {/* Tableau Détaillé Transport avec Pagination */}
                        <div className="pt-2 border-t">
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                            Détail des Mensualités de Transport (Échéancier) :
                          </h4>
                          <div className="overflow-x-auto rounded-xl border">
                            <table className="w-full text-sm">
                              <thead className="border-b bg-muted/40 text-muted-foreground font-semibold text-xs">
                                <tr>
                                  <th className="text-left p-3">Mois d'Abonnement</th>
                                  <th className="text-right p-3">Montant Prévu</th>
                                  <th className="text-right p-3">Montant Réglé</th>
                                  <th className="text-right p-3">Reste Dû</th>
                                  <th className="text-center p-3">Statut</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {paginatedTransport.map((ech: any) => {
                                  const prevu = parseFloat(ech.montant_prevu || 0);
                                  const paye = parseFloat(ech.montant_paye || 0);
                                  const solde = Math.max(0, prevu - paye);
                                  const isPaid = ech.statut === 'paye' || solde === 0;
                                  const isPartial = ech.statut === 'en_cours' || ech.statut === 'partiel' || (paye > 0 && solde > 0);

                                  return (
                                    <tr key={ech.id} className="hover:bg-muted/10">
                                      <td className="p-3 font-semibold text-foreground">{ech.libelle}</td>
                                      <td className="p-3 text-right font-mono">{formatCurrency(prevu)}</td>
                                      <td className="p-3 text-right font-mono font-bold text-emerald-600">{formatCurrency(paye)}</td>
                                      <td className={`p-3 text-right font-mono font-bold ${solde > 0 ? 'text-indigo-800' : 'text-muted-foreground'}`}>{formatCurrency(solde)}</td>
                                      <td className="p-3 text-center">
                                        {isPaid ? (
                                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 font-bold text-xs">
                                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Payé
                                          </Badge>
                                        ) : isPartial ? (
                                          <Badge className="bg-amber-100 text-amber-900 border-amber-300 gap-1 font-bold text-xs animate-pulse">
                                            <Clock className="h-3 w-3 text-amber-600" /> En cours
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-slate-600 border-slate-300 text-xs bg-slate-50">
                                            À échoir
                                          </Badge>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              {(() => {
                                const pagePrevu = paginatedTransport.reduce((s: number, e: any) => s + parseFloat(e.montant_prevu || 0), 0);
                                const pagePaye = paginatedTransport.reduce((s: number, e: any) => s + parseFloat(e.montant_paye || 0), 0);
                                const pageSolde = paginatedTransport.reduce((s: number, e: any) => s + Math.max(0, parseFloat(e.montant_prevu || 0) - parseFloat(e.montant_paye || 0)), 0);
                                const isMultiplePages = transportEcheances.length > transportPerPage;

                                return (
                                  <tfoot className="border-t-2 border-indigo-300 bg-indigo-50/50 font-bold">
                                    {isMultiplePages && (
                                      <tr className="border-b border-indigo-200 text-xs bg-muted/40 font-semibold">
                                        <td className="p-2.5 font-bold text-muted-foreground">
                                          Sous-total Page ({paginatedTransport.length} mois affichés)
                                        </td>
                                        <td className="p-2.5 text-right font-mono font-semibold">
                                          {formatCurrency(pagePrevu)}
                                        </td>
                                        <td className="p-2.5 text-right font-mono font-semibold text-emerald-600">
                                          {formatCurrency(pagePaye)}
                                        </td>
                                        <td className={`p-2.5 text-right font-mono font-bold ${pageSolde > 0 ? 'text-indigo-900' : 'text-muted-foreground'}`}>
                                          {formatCurrency(pageSolde)}
                                        </td>
                                        <td className="p-2.5 text-center text-[11px] text-muted-foreground font-medium">
                                          Page {transportPage} / {Math.ceil(transportEcheances.length / transportPerPage)}
                                        </td>
                                      </tr>
                                    )}
                                    <tr>
                                      <td className="p-3 font-bold text-foreground">
                                        TOTAL TRANSPORT ({transportEcheances.length} mois)
                                      </td>
                                      <td className="p-3 text-right font-mono text-foreground font-extrabold">
                                        {formatCurrency(transportTotalPrevu)}
                                      </td>
                                      <td className="p-3 text-right font-mono text-emerald-600 font-extrabold">
                                        {formatCurrency(transportTotalPaye)}
                                      </td>
                                      <td className={`p-3 text-right font-mono font-extrabold ${transportSoldeDu > 0 ? 'text-indigo-900' : 'text-muted-foreground'}`}>
                                        {formatCurrency(transportSoldeDu)}
                                      </td>
                                      <td className="p-3 text-center text-xs text-muted-foreground">
                                        {transportSoldeDu === 0 ? '✓ Transport soldé' : `${formatCurrency(transportSoldeDu)} dû`}
                                      </td>
                                    </tr>
                                  </tfoot>
                                );
                              })()}
                            </table>
                          </div>

                          {/* Pagination Transport */}
                          <TablePagination
                            currentPage={transportPage}
                            totalItems={transportEcheances.length}
                            perPage={transportPerPage}
                            onPageChange={setTransportPage}
                            onPerPageChange={setTransportPerPage}
                            itemName="mensualités de transport"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                ── SECTION 3 : HISTORIQUE DES PAIEMENTS & REÇUS ──
            ══════════════════════════════════════════════════════════════ */}
            {financeSubTab === 'historique' && (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <History className="h-5 w-5 text-primary" />
                        Historique de vos Paiements & Reçus
                      </CardTitle>
                      <CardDescription>
                        Reçus de paiement certifiés et archivés pour {formatStudentName(child)}
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={loadChildData} className="gap-1 text-xs">
                      <RefreshCw className="h-3.5 w-3.5" /> Actualiser
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b bg-muted/40 text-muted-foreground font-semibold">
                          <tr>
                            <th className="text-left p-3.5">Référence Reçu</th>
                            <th className="text-left p-3.5">Service / Motif</th>
                            <th className="text-left p-3.5">Mode de Règlement</th>
                            <th className="text-right p-3.5">Montant</th>
                            <th className="text-left p-3.5">Date</th>
                            <th className="text-center p-3.5">Statut</th>
                            <th className="text-right p-3.5">Reçu PDF</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {paginatedPayments.length > 0 ? (
                            paginatedPayments.map((p) => {
                              const modeMeta = PAYMENT_METHODS.find(m => m.id === p.mode) || {
                                name: p.mode?.toUpperCase() || 'Espèces',
                                icon: DollarSign,
                                badgeClass: 'bg-slate-100 text-slate-800'
                              };

                              return (
                                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                                  <td className="p-3.5 font-mono text-xs font-bold text-primary">
                                    {p.receipt}
                                  </td>
                                  <td className="p-3.5 font-medium">
                                    {p.type}
                                  </td>
                                  <td className="p-3.5">
                                    <Badge variant="outline" className={`gap-1 font-semibold ${modeMeta.badgeClass}`}>
                                      <modeMeta.icon className="h-3 w-3" />
                                      {modeMeta.name}
                                    </Badge>
                                  </td>
                                  <td className="p-3.5 text-right font-mono font-bold text-base text-foreground">
                                    {formatCurrency(p.amount)}
                                  </td>
                                  <td className="p-3.5 text-xs text-muted-foreground font-mono">
                                    {formatDate(p.date)}
                                  </td>
                                  <td className="p-3.5 text-center">
                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                                      ✓ Validé
                                    </Badge>
                                  </td>
                                  <td className="p-3.5 text-right">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handlePrintOfficialReceipt(p)}
                                      className="gap-1 h-8 text-xs text-primary hover:text-primary hover:bg-primary/10"
                                    >
                                      <Printer className="h-3.5 w-3.5" /> Reçu
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-muted-foreground italic">
                                Aucun historique de paiement enregistré pour cet élève.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Toolbar Paiements */}
                    <TablePagination
                      currentPage={paymentsPage}
                      totalItems={mappedPayments.length}
                      perPage={paymentsPerPage}
                      onPageChange={setPaymentsPage}
                      onPerPageChange={setPaymentsPerPage}
                      itemName="paiements"
                      pageSizeOptions={[5, 10, 20, 50]}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ── TAB 3 : NOTES & BULLETINS & GRAPHES DE PERFORMANCE ── */}
          <TabsContent value="notes" className="mt-5 space-y-6">
            {/* Header & Sélecteur de Mode */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 rounded-2xl bg-card border shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <Select value={selectedTrimester} onValueChange={v => setSelectedTrimester(v as 't1'|'t2'|'t3')}>
                  <SelectTrigger className="w-40 bg-background font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="t1">1er Trimestre</SelectItem>
                    <SelectItem value="t2">2e Trimestre</SelectItem>
                    <SelectItem value="t3">3e Trimestre</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xl">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Moyenne générale :</span>
                  <span className="text-base font-extrabold font-mono text-primary">{moyenneGen.toFixed(2)}/20</span>
                </div>

                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 font-bold text-xs py-1">
                  <Award className="h-3.5 w-3.5" />
                  {moyenneGen >= 16 ? 'Tableau d\'Honneur & Félicitations' : moyenneGen >= 14 ? 'Tableau d\'Honneur' : moyenneGen >= 12 ? 'Encouragements' : 'Admis'}
                </Badge>
              </div>

              {/* Boutons de bascule de vue + Téléchargement */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="bg-muted/60 p-1 rounded-xl flex items-center border">
                  <Button
                    size="sm"
                    variant={notesViewMode === 'table' ? 'default' : 'ghost'}
                    onClick={() => setNotesViewMode('table')}
                    className={`h-8 px-2.5 text-xs font-bold gap-1.5 ${notesViewMode === 'table' ? 'bg-primary shadow-sm text-white' : 'text-muted-foreground'}`}
                  >
                    <FileText className="h-3.5 w-3.5" /> Tableau
                  </Button>
                  <Button
                    size="sm"
                    variant={notesViewMode === 'charts' ? 'default' : 'ghost'}
                    onClick={() => setNotesViewMode('charts')}
                    className={`h-8 px-2.5 text-xs font-bold gap-1.5 ${notesViewMode === 'charts' ? 'bg-primary shadow-sm text-white' : 'text-muted-foreground'}`}
                  >
                    <Activity className="h-3.5 w-3.5" /> Graphiques
                  </Button>
                  <Button
                    size="sm"
                    variant={notesViewMode === 'cards' ? 'default' : 'ghost'}
                    onClick={() => setNotesViewMode('cards')}
                    className={`h-8 px-2.5 text-xs font-bold gap-1.5 ${notesViewMode === 'cards' ? 'bg-primary shadow-sm text-white' : 'text-muted-foreground'}`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" /> Cartes Matières
                  </Button>
                </div>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1.5 text-xs font-bold h-10 border shadow-sm"
                  onClick={() => {
                    const trimNum = selectedTrimester === 't1' ? 1 : selectedTrimester === 't2' ? 2 : 3;
                    printBulletins([child], evaluations, classRoom, school, trimNum);
                  }}
                >
                  <Download className="h-3.5 w-3.5 text-primary" />
                  Bulletin PDF
                </Button>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                ── CARTES GRAPHES GLOBAUX DE PERFORMANCE ──
            ══════════════════════════════════════════════════════════════ */}
            <div className="grid lg:grid-cols-12 gap-5">
              {/* Graphe 1 : Évolution de la Moyenne Générale Trimestrielle */}
              <Card className="lg:col-span-7 border shadow-sm flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                        Évolution de la Moyenne Générale de l'Élève
                      </CardTitle>
                      <CardDescription>
                        Comparaison trimestrielle : Élève vs Classe vs Seuil d'Excellence (16/20)
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1">
                        <span className="h-3 w-3 rounded-full bg-primary" /> Élève
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <span className="h-3 w-3 rounded-full bg-slate-400" /> Moyenne Classe
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={generalAveragesProgression} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                        <defs>
                          <linearGradient id="colorEleveAvg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                        <XAxis dataKey="trimestre" stroke="#888888" fontSize={12} tickLine={false} />
                        <YAxis domain={[0, 20]} stroke="#888888" fontSize={12} tickLine={false} ticks={[0, 5, 10, 15, 20]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.96)',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                            fontSize: '12px'
                          }}
                          formatter={(value: any, name: any) => [
                            `${Number(value).toFixed(2)}/20`,
                            name === 'moyenneEleve' ? `${formatStudentName(child)}` : name === 'moyenneClasse' ? 'Moyenne de la classe' : name
                          ]}
                        />
                        <ReferenceLine y={10} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Seuil Admis (10/20)', position: 'insideBottomLeft', fill: '#f59e0b', fontSize: 10 }} />
                        <ReferenceLine y={16} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Excellence (16/20)', position: 'insideTopLeft', fill: '#10b981', fontSize: 10 }} />
                        <Area
                          type="monotone"
                          dataKey="moyenneEleve"
                          stroke="hsl(var(--primary))"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorEleveAvg)"
                          dot={{ r: 5, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 7, strokeWidth: 2 }}
                          name="moyenneEleve"
                        />
                        <Line
                          type="monotone"
                          dataKey="moyenneClasse"
                          stroke="#94a3b8"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          dot={{ r: 3, fill: '#94a3b8' }}
                          name="moyenneClasse"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t text-center">
                    <div className="p-2 rounded-xl bg-muted/40">
                      <p className="text-[11px] text-muted-foreground">T1 (1er Trimestre)</p>
                      <p className="text-sm font-bold font-mono text-foreground mt-0.5">{generalAveragesProgression[0].moyenneEleve}/20</p>
                    </div>
                    <div className="p-2 rounded-xl bg-muted/40">
                      <p className="text-[11px] text-muted-foreground">T2 (2e Trimestre)</p>
                      <p className="text-sm font-bold font-mono text-foreground mt-0.5">{generalAveragesProgression[1].moyenneEleve}/20</p>
                    </div>
                    <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                      <p className="text-[11px] font-bold text-primary">T3 (3e Trimestre)</p>
                      <p className="text-sm font-extrabold font-mono text-primary mt-0.5">{generalAveragesProgression[2].moyenneEleve}/20</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Graphe 2 : Performance par Pôle de Compétences */}
              <Card className="lg:col-span-5 border shadow-sm flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Profil de Compétences par Pôle
                  </CardTitle>
                  <CardDescription>
                    Niveau moyen par domaine d'apprentissage sur 20
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2 space-y-4">
                  {subjectCategoriesRadarData.map(cat => {
                    const pct = (cat.note / 20) * 100;
                    const isGreat = cat.note >= 16;
                    const isGood = cat.note >= 13;
                    const colorBar = isGreat ? 'bg-emerald-500' : isGood ? 'bg-primary' : 'bg-amber-500';

                    return (
                      <div key={cat.category} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${colorBar}`} />
                            {cat.category}
                          </span>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-muted-foreground text-[11px]">(Classe: {cat.moyenneClasse})</span>
                            <span className={`font-bold text-sm ${isGreat ? 'text-emerald-600' : isGood ? 'text-primary' : 'text-amber-600'}`}>
                              {cat.note.toFixed(1)}/20
                            </span>
                          </div>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${colorBar}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}

                  <div className="p-3 bg-muted/40 rounded-xl border flex items-center justify-between text-xs mt-4">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-amber-500" /> Progression globale annuelle :
                    </span>
                    <span className="font-bold text-emerald-600 font-mono text-sm flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" /> +1.70 pts
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                ── VUE 1 : TABLEAU AVEC MINI-GRAPHES INTÉGRÉS DANS CHAQUE NOTE ──
            ══════════════════════════════════════════════════════════════ */}
            {notesViewMode === 'table' && (
              <Card className="border shadow-sm overflow-hidden">
                <CardHeader className="pb-3 bg-muted/20 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Relevé Analytique Détaillé des Matières
                      </CardTitle>
                      <CardDescription>
                        Notes trimestrielles, mini-graphes d'évolution de chaque matière et appréciations des enseignants
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40 text-muted-foreground font-semibold text-xs">
                      <tr>
                        <th className="text-left p-3.5">Matière</th>
                        <th className="text-center p-3.5">Coeff</th>
                        <th className="text-center p-3.5">T1</th>
                        <th className="text-center p-3.5">T2</th>
                        <th className="text-center p-3.5 font-bold text-primary">T3 ★</th>
                        <th className="text-left p-3.5">Graphe Évolution (T1→T3)</th>
                        <th className="text-center p-3.5 bg-primary/5">Moyenne Annuelle</th>
                        <th className="text-left p-3.5">Enseignant</th>
                        <th className="text-left p-3.5">Appréciation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {notesData.map((n, i) => {
                        const progression = n.t3 - n.t1;
                        return (
                          <tr key={n.subject} className={`hover:bg-muted/20 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/5'}`}>
                            <td className="p-3.5 font-bold text-foreground">
                              {n.subject}
                            </td>
                            <td className="p-3.5 text-center text-muted-foreground font-mono">
                              {n.coeff}
                            </td>
                            <td className="p-3.5 text-center font-mono text-sm">
                              {n.t1 > 0 ? n.t1.toFixed(1) : '-'}
                            </td>
                            <td className="p-3.5 text-center font-mono text-sm">
                              {n.t2 > 0 ? n.t2.toFixed(1) : '-'}
                            </td>
                            <td className="p-3.5 text-center">
                              <span className={`font-mono font-bold text-base px-2 py-0.5 rounded-md ${
                                n.t3 >= 16 ? 'text-green-700 bg-green-50' : 
                                n.t3 >= 12 ? 'text-primary bg-primary/10' : 
                                n.t3 >= 10 ? 'text-amber-700 bg-amber-50' : 
                                'text-destructive bg-destructive/10'
                              }`}>
                                {n.t3 > 0 ? n.t3.toFixed(1) : '-'}
                              </span>
                            </td>
                            {/* MINI-GRAPHE DANS CHAQUE NOTE */}
                            <td className="p-3.5">
                              <SubjectSparkline t1={n.t1} t2={n.t2} t3={n.t3} />
                            </td>
                            <td className="p-3.5 text-center bg-primary/5">
                              <span className={`font-mono font-bold text-base ${
                                n.moyenne >= 16 ? 'text-green-600' : 
                                n.moyenne >= 12 ? 'text-primary' : 
                                n.moyenne >= 10 ? 'text-yellow-600' : 
                                'text-destructive'
                              }`}>
                                {n.moyenne > 0 ? n.moyenne.toFixed(1) : '-'}
                              </span>
                            </td>
                            <td className="p-3.5 text-xs text-muted-foreground whitespace-nowrap">
                              {n.teacher}
                            </td>
                            <td className="p-3.5 text-xs text-muted-foreground italic max-w-xs">
                              {n.appreciation}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-primary/30 bg-primary/5 font-bold">
                      <tr>
                        <td className="p-3.5 font-bold text-foreground" colSpan={4}>Moyenne Générale Pondérée</td>
                        <td className="p-3.5 text-center">
                          <span className="font-extrabold text-lg font-mono text-primary">{moyenneGen.toFixed(2)}/20</span>
                        </td>
                        <td colSpan={4}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            )}

            {/* ══════════════════════════════════════════════════════════════
                ── VUE 2 : GRAPHIQUES COMPARATIFS PAR MATIÈRE ──
            ══════════════════════════════════════════════════════════════ */}
            {notesViewMode === 'charts' && (
              <div className="space-y-6">
                <Card className="border shadow-sm">
                  <CardHeader className="pb-2 border-b bg-muted/20">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-primary" />
                          Histogramme Comparatif des Notes par Matière (T1, T2, T3 & Moyenne)
                        </CardTitle>
                        <CardDescription>
                          Visualisez la performance et l'évolution pour chacune des matières enseignées
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-3 text-xs flex-wrap">
                        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-sky-500" /> T1</span>
                        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-indigo-500" /> T2</span>
                        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-500" /> T3</span>
                        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-500" /> Moyenne</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={subjectsComparisonData} margin={{ top: 20, right: 20, left: -10, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                          <XAxis 
                            dataKey="subject" 
                            stroke="#888888" 
                            fontSize={11} 
                            interval={0}
                            angle={-25}
                            textAnchor="end"
                            tickLine={false}
                          />
                          <YAxis domain={[0, 20]} stroke="#888888" fontSize={12} tickLine={false} ticks={[0, 5, 10, 15, 20]} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.96)',
                              borderRadius: '12px',
                              border: '1px solid #e2e8f0',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                              fontSize: '12px'
                            }}
                            formatter={(value: any, name: any) => [`${Number(value).toFixed(1)}/20`, name]}
                            labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                          />
                          <ReferenceLine y={10} stroke="#f59e0b" strokeDasharray="3 3" />
                          <Bar dataKey="T1" fill="#38bdf8" radius={[4, 4, 0, 0]} name="1er Trimestre" />
                          <Bar dataKey="T2" fill="#6366f1" radius={[4, 4, 0, 0]} name="2e Trimestre" />
                          <Bar dataKey="T3" fill="#10b981" radius={[4, 4, 0, 0]} name="3e Trimestre" />
                          <Bar dataKey="Moyenne" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Moyenne Annuelle" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* 3 Cartes de Synthèse Analytique */}
                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="p-4 border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-transparent">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-2">
                      <Award className="h-4 w-4 text-emerald-600" />
                      Matière d'Excellence
                    </div>
                    {(() => {
                      const best = [...notesData].sort((a, b) => b.moyenne - a.moyenne)[0];
                      return best ? (
                        <div>
                          <p className="text-xl font-black text-emerald-950">{best.subject}</p>
                          <p className="text-2xl font-extrabold font-mono text-emerald-600 mt-1">{best.moyenne.toFixed(1)}/20</p>
                          <p className="text-xs text-muted-foreground mt-1 italic">"{best.appreciation}"</p>
                        </div>
                      ) : null;
                    })()}
                  </Card>

                  <Card className="p-4 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Plus Forte Progression
                    </div>
                    {(() => {
                      const mostProgress = [...notesData].sort((a, b) => (b.t3 - b.t1) - (a.t3 - a.t1))[0];
                      return mostProgress ? (
                        <div>
                          <p className="text-xl font-black text-foreground">{mostProgress.subject}</p>
                          <p className="text-2xl font-extrabold font-mono text-primary mt-1">+{(mostProgress.t3 - mostProgress.t1).toFixed(1)} pts</p>
                          <p className="text-xs text-muted-foreground mt-1">Passé de {mostProgress.t1.toFixed(1)} à {mostProgress.t3.toFixed(1)}/20</p>
                        </div>
                      ) : null;
                    })()}
                  </Card>

                  <Card className="p-4 border-amber-200 bg-gradient-to-br from-amber-50/60 to-transparent">
                    <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider mb-2">
                      <Target className="h-4 w-4 text-amber-600" />
                      Matière à Renforcer
                    </div>
                    {(() => {
                      const lowest = [...notesData].sort((a, b) => a.moyenne - b.moyenne)[0];
                      return lowest ? (
                        <div>
                          <p className="text-xl font-black text-amber-950">{lowest.subject}</p>
                          <p className="text-2xl font-extrabold font-mono text-amber-700 mt-1">{lowest.moyenne.toFixed(1)}/20</p>
                          <p className="text-xs text-muted-foreground mt-1">Objectif prochain trimestre : 14.0/20</p>
                        </div>
                      ) : null;
                    })()}
                  </Card>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                ── VUE 3 : CARTES DE PERFORMANCE PAR MATIÈRE ──
            ══════════════════════════════════════════════════════════════ */}
            {notesViewMode === 'cards' && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {notesData.map((n) => {
                  const progression = n.t3 - n.t1;
                  const isGreat = n.moyenne >= 16;
                  const isGood = n.moyenne >= 12;

                  const chartData = [
                    { trim: 'T1', note: n.t1 },
                    { trim: 'T2', note: n.t2 },
                    { trim: 'T3', note: n.t3 },
                  ];

                  return (
                    <Card key={n.subject} className="border shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-base font-bold">{n.subject}</CardTitle>
                            <CardDescription className="text-xs">
                              Coeff {n.coeff} • {n.teacher}
                            </CardDescription>
                          </div>
                          <Badge className={`${isGreat ? 'bg-emerald-100 text-emerald-800' : isGood ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-800'} border-0 text-xs font-mono font-bold`}>
                            {n.moyenne.toFixed(1)}/20
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3 pt-0">
                        {/* Mini Graphe de la matière */}
                        <div className="h-28 w-full bg-muted/20 rounded-xl p-2 border">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="2 2" stroke="rgba(0,0,0,0.05)" />
                              <XAxis dataKey="trim" stroke="#888888" fontSize={10} tickLine={false} />
                              <YAxis domain={[0, 20]} stroke="#888888" fontSize={10} tickLine={false} ticks={[0, 10, 20]} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#fff',
                                  borderRadius: '8px',
                                  border: '1px solid #e2e8f0',
                                  fontSize: '11px',
                                  padding: '4px 8px'
                                }}
                                formatter={(val: any) => [`${Number(val).toFixed(1)}/20`, 'Note']}
                              />
                              <Line
                                type="monotone"
                                dataKey="note"
                                stroke={progression >= 0 ? '#10b981' : '#ef4444'}
                                strokeWidth={2.5}
                                dot={{ r: 4, fill: progression >= 0 ? '#10b981' : '#ef4444' }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="flex items-center justify-between text-xs border-t pt-2">
                          <span className="text-muted-foreground">Progression :</span>
                          <span className={`font-bold font-mono flex items-center gap-1 ${progression >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                            {progression >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                            {progression >= 0 ? '+' : ''}{progression.toFixed(1)} pts
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded-lg">
                          "{n.appreciation}"
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── TAB 4 : PRÉSENCES & ASSIDUITÉ ── */}
          <TabsContent value="presences" className="mt-5 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { 
                  label: "Taux d'Absence", 
                  value: `${presenceStats.tauxAbsence}%`, 
                  color: presenceStats.tauxAbsence === 0 ? 'text-emerald-600' : 'text-destructive', 
                  bg: presenceStats.tauxAbsence === 0 ? 'bg-emerald-50' : 'bg-destructive/10',
                  pct: presenceStats.tauxAbsence,
                  subtext: presenceStats.tauxAbsence === 0 ? 'Excellente assiduité ✓' : 'Absences cumulées'
                },
                { 
                  label: "Jours d'Absence", 
                  value: `${presenceStats.absents} j.`, 
                  color: presenceStats.absents === 0 ? 'text-emerald-600' : 'text-destructive', 
                  bg: 'bg-destructive/10',
                  pct: Math.round((presenceStats.absents / presenceStats.total) * 100),
                  subtext: `${presenceStats.excuses} justifiée(s)`
                },
                { 
                  label: 'Retards Signalés', 
                  value: `${presenceStats.retards}`, 
                  color: presenceStats.retards === 0 ? 'text-emerald-600' : 'text-amber-600', 
                  bg: 'bg-amber-50',
                  pct: Math.round((presenceStats.retards / presenceStats.total) * 100),
                  subtext: 'Retards à l\'arrivée'
                },
                { 
                  label: 'Jours de Présence', 
                  value: `${presenceStats.presents} / ${presenceStats.total} j.`, 
                  color: 'text-emerald-600', 
                  bg: 'bg-emerald-50',
                  pct: presenceStats.tauxPresence,
                  subtext: `${presenceStats.tauxPresence}% du temps scolaire`
                },
              ].map(stat => (
                <Card key={stat.label} className="p-4 border shadow-sm">
                  <div className={`text-3xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs font-bold text-foreground mt-1">{stat.label}</div>
                  {stat.subtext && <div className="text-[11px] text-muted-foreground">{stat.subtext}</div>}
                  <Progress value={stat.pct} className="h-1.5 mt-2" />
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />Historique des présences
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {paginatedAttendance.map((a, i) => {
                    const cfg = statusConfig[a.status as keyof typeof statusConfig] || statusConfig.present;
                    const Icon = cfg.icon;
                    return (
                      <div key={i} className="flex items-center gap-4 p-3 hover:bg-muted/20 transition-colors">
                        <div className="w-28 text-sm font-medium">{formatDate(a.date)}</div>
                        <div className="w-36">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${cfg.color} flex items-center gap-1 w-fit`}>
                            <Icon className="h-3 w-3" />{cfg.label}
                          </span>
                        </div>
                        {a.note && <p className="text-xs text-muted-foreground italic">{a.note}</p>}
                      </div>
                    );
                  })}
                  {paginatedAttendance.length === 0 && (
                    <div className="p-6 text-center text-sm text-muted-foreground italic">
                      Aucun enregistrement de présence disponible.
                    </div>
                  )}
                </div>

                {/* Pagination Toolbar Présences */}
                {mappedAttendance.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 border-t bg-muted/20 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>Affichage de {((attendancePage - 1) * attendancePerPage) + 1} à {Math.min(attendancePage * attendancePerPage, mappedAttendance.length)} sur {mappedAttendance.length} jours</span>
                      <span className="text-muted-foreground/40">•</span>
                      <div className="flex items-center gap-1.5">
                        <span>Lignes par page :</span>
                        <Select value={String(attendancePerPage)} onValueChange={(v) => { setAttendancePerPage(Number(v)); setAttendancePage(1); }}>
                          <SelectTrigger className="h-7 w-16 text-xs bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="6">6</SelectItem>
                            <SelectItem value="12">12</SelectItem>
                            <SelectItem value="24">24</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        disabled={attendancePage <= 1}
                        onClick={() => setAttendancePage(1)}
                        title="Première page"
                      >
                        <ChevronsLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        disabled={attendancePage <= 1}
                        onClick={() => setAttendancePage(prev => Math.max(1, prev - 1))}
                        title="Page précédente"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>

                      <div className="flex items-center gap-1 px-1 font-mono font-medium">
                        {Array.from({ length: totalAttendancePages }, (_, i) => i + 1)
                          .filter(p => p === 1 || p === totalAttendancePages || Math.abs(p - attendancePage) <= 1)
                          .map((p, idx, arr) => {
                            const showEllipsisBefore = idx > 0 && p - arr[idx - 1] > 1;
                            return (
                              <div key={p} className="flex items-center gap-1">
                                {showEllipsisBefore && <span className="px-1 text-muted-foreground">…</span>}
                                <Button
                                  variant={attendancePage === p ? 'default' : 'outline'}
                                  size="sm"
                                  className={`h-7 w-7 p-0 text-xs font-bold ${attendancePage === p ? 'bg-primary text-white' : ''}`}
                                  onClick={() => setAttendancePage(p)}
                                >
                                  {p}
                                </Button>
                              </div>
                            );
                          })}
                      </div>

                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        disabled={attendancePage >= totalAttendancePages}
                        onClick={() => setAttendancePage(prev => Math.min(totalAttendancePages, prev + 1))}
                        title="Page suivante"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        disabled={attendancePage >= totalAttendancePages}
                        onClick={() => setAttendancePage(totalAttendancePages)}
                        title="Dernière page"
                      >
                        <ChevronsRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 5 : EMPLOI DU TEMPS ── */}
          <TabsContent value="emploi" className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Emploi du temps — {formatStudentName(child)}</h2>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => printSchedule(scheduleRef.current, `Emploi du temps - ${formatStudentName(child)}`)}>
                <Printer className="h-4 w-4" />Imprimer
              </Button>
            </div>
            <div ref={scheduleRef} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {SCHEDULE_DATA.map(day => (
                <Card key={day.day} className="overflow-hidden">
                  <div className="bg-primary/10 px-4 py-2 border-b border-primary/20">
                    <h3 className="font-semibold text-primary">{day.day}</h3>
                  </div>
                  <CardContent className="p-3 space-y-2">
                    {day.slots.map(slot => (
                      <div key={slot.time} className={`p-2.5 rounded-lg border ${slot.subject.includes('Coran') || slot.subject.includes('Prière') || slot.subject.includes('Fiqh') || slot.subject.includes('Éducation Islamique') ? 'bg-green-50 border-green-200' : 'bg-muted/30 border-border'}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-mono">{slot.time}</span>
                          <span className="text-xs text-muted-foreground">{slot.room}</span>
                        </div>
                        <p className="text-sm font-medium mt-0.5">{slot.subject}</p>
                        <p className="text-xs text-muted-foreground">{slot.teacher}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── TAB 6 : CORAN & ÉDUCATION ISLAMIQUE ── */}
          <TabsContent value="coran" className="mt-5 space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="p-4 text-center bg-gradient-to-b from-green-50 to-transparent border-green-200">
                <Moon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-3xl font-bold font-mono text-green-700">
                  {QURAN_PROGRESS.filter(q => q.status === 'memorise').length}
                </p>
                <p className="text-sm text-muted-foreground">Sourates mémorisées</p>
              </Card>
              <Card className="p-4 text-center">
                <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-3xl font-bold font-mono text-yellow-600">
                  {Math.round(QURAN_PROGRESS.filter(q => q.status === 'memorise' && q.score).reduce((a, q) => a + (q.score || 0), 0) / Math.max(QURAN_PROGRESS.filter(q => q.score).length, 1))}/20
                </p>
                <p className="text-sm text-muted-foreground">Score moyen Tajwid</p>
              </Card>
              <Card className="p-4 text-center">
                <Progress value={(QURAN_PROGRESS.filter(q => q.status === 'memorise').length / QURAN_PROGRESS.length) * 100} className="h-2 mb-2" />
                <p className="text-2xl font-bold font-mono text-primary">
                  {Math.round((QURAN_PROGRESS.filter(q => q.status === 'memorise').length / QURAN_PROGRESS.length) * 100)}%
                </p>
                <p className="text-sm text-muted-foreground">Progression programme</p>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Moon className="h-4 w-4 text-green-600" />Programme de mémorisation du Coran
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {QURAN_PROGRESS.map(q => {
                    const cfg = quranStatusConfig[q.status as keyof typeof quranStatusConfig];
                    return (
                      <div key={q.surah} className={`flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors ${q.status === 'en_cours' ? 'bg-warning/5' : ''}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{q.surah}</p>
                            {q.status === 'en_cours' && <span className="text-xs text-yellow-600 animate-pulse">● En cours</span>}
                          </div>
                          <p className="text-xs text-muted-foreground">{q.ayahs} versets</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                        {q.score !== null && (
                          <div className="text-center w-16">
                            <p className="text-sm font-bold font-mono text-primary">{q.score}/20</p>
                            <p className="text-xs text-muted-foreground">Tajwid</p>
                          </div>
                        )}
                        {q.date && (
                          <p className="text-xs text-muted-foreground w-24 text-right">{formatDate(q.date)}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 7 : MESSAGES ── */}
          <TabsContent value="messages" className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Messagerie école ↔ famille</h2>
              <Button size="sm" className="gap-1" onClick={() => setShowMessageModal(true)}>
                <Send className="h-4 w-4" />Nouveau message
              </Button>
            </div>

            <div className="grid md:grid-cols-5 gap-4">
              <div className="md:col-span-2 space-y-2">
                {MESSAGES_DATA.map(m => (
                  <motion.div
                    key={m.id}
                    onClick={() => setSelectedMessage(m)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all hover:border-primary/40 ${selectedMessage?.id === m.id ? 'border-primary bg-primary/5' : 'border-border'} ${!m.read ? 'border-l-4 border-l-primary' : ''}`}
                    whileHover={{ x: 2 }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${!m.read ? 'font-bold' : 'font-medium'}`}>{m.from}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.subject}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">{formatDate(m.date)}</span>
                        {!m.read && <span className="h-2 w-2 bg-primary rounded-full" />}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="md:col-span-3">
                {selectedMessage ? (
                  <Card className="h-full">
                    <CardHeader className="border-b border-border pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{selectedMessage.subject}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">De : <span className="font-medium">{selectedMessage.from}</span></p>
                          <p className="text-xs text-muted-foreground">{formatDate(selectedMessage.date)}</p>
                        </div>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Send className="h-4 w-4" />Répondre
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <p className="text-sm leading-relaxed">{selectedMessage.content}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center p-8">
                      <Inbox className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Sélectionnez un message pour le lire</p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          ── MODAL DE PAIEMENT MULTI-SERVICES & MULTI-MODES ──
          (Écolage / Cantine / Car) + (Espèces / WAVE / MTN Money / Coris Bank)
      ══════════════════════════════════════════════════════════════ */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {!paymentSuccessData ? (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                  <div className="flex items-center gap-2 text-primary">
                    <CreditCard className="h-5 w-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Espace Règlement Sécurisé</span>
                  </div>
                  <Badge className="bg-emerald-600/10 text-emerald-800 border-emerald-300 gap-1.5 text-[11px] font-bold py-1 px-2.5">
                    <Shield className="h-3.5 w-3.5 text-emerald-600" />
                    Passerelle Agréée CinetPay (BCEAO • PCI-DSS)
                  </Badge>
                </div>
                <DialogTitle className="text-xl font-extrabold">
                  Paiement des Frais — {formatStudentName(child)}
                </DialogTitle>
                <DialogDescription>
                  Réglez par Mobile Money (Wave, Orange, MTN, MoMo) ou Carte Bancaire via l'API sécurisée CinetPay.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2">
                {/* 1. Choix du Service */}
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 block">
                    1. Choisissez la prestation / service :
                  </Label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'scolarite', name: 'Frais d\'Écolage', subtitle: 'Scolarité & Inscription', icon: GraduationCap, color: 'border-primary/40 bg-primary/5' },
                      { id: 'cantine', name: 'Service Cantine', subtitle: 'Repas du midi', icon: Utensils, color: 'border-amber-400 bg-amber-50/60' },
                      { id: 'transport', name: 'Service Car', subtitle: 'Transport scolaire', icon: Bus, color: 'border-indigo-400 bg-indigo-50/60' },
                    ].map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleOpenPayment(s.id as any)}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                          paymentService === s.id
                            ? `${s.color} ring-2 ring-primary font-bold shadow-sm`
                            : 'border-border hover:bg-muted/40'
                        }`}
                      >
                        <s.icon className={`h-5 w-5 ${paymentService === s.id ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="text-sm font-bold text-foreground">{s.name}</span>
                        <span className="text-[11px] text-muted-foreground">{s.subtitle}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Détails selon le service & Choix/Ajustement du Montant */}
                <div className="p-4 rounded-2xl bg-muted/40 border space-y-4">
                  {paymentService === 'scolarite' && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Tranche de scolarité ciblée :</Label>
                      <Select 
                        value={selectedTrancheId ? String(selectedTrancheId) : 'custom'}
                        onValueChange={(val) => {
                          if (val === 'custom') {
                            setSelectedTrancheId(null);
                            setPaymentAmount(scolariteSoldeDu > 0 ? scolariteSoldeDu : 25000);
                          } else {
                            const found = scolariteEcheances.find(e => String(e.id) === val);
                            if (found) {
                              setSelectedTrancheId(found.id);
                              const due = parseFloat(found.montant_prevu) - parseFloat(found.montant_paye);
                              setPaymentAmount(Math.max(0, due));
                            }
                          }
                        }}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Sélectionnez la tranche" />
                        </SelectTrigger>
                        <SelectContent>
                          {scolariteEcheances.map(e => {
                            const due = parseFloat(e.montant_prevu) - parseFloat(e.montant_paye);
                            return (
                              <SelectItem key={e.id} value={String(e.id)}>
                                {e.libelle} — Reste dû : {formatCurrency(Math.max(0, due))} ({e.statut})
                              </SelectItem>
                            );
                          })}
                          <SelectItem value="custom">Autre montant / Solde total ({formatCurrency(scolariteSoldeDu)})</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {paymentService === 'cantine' && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-amber-900">Mois de cantine sélectionnés :</span>
                        <span className="text-muted-foreground font-mono">{tarifCantineMensuel.toLocaleString()} F / mois</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {MONTHS_ORDER.map(m => {
                          const isSel = selectedCantineMonths.includes(m);
                          return (
                            <Badge
                              key={m}
                              onClick={() => {
                                const next = isSel ? selectedCantineMonths.filter(x => x !== m) : [...selectedCantineMonths, m];
                                setSelectedCantineMonths(next);
                                setPaymentAmount(next.length * tarifCantineMensuel);
                              }}
                              className={`cursor-pointer text-xs ${isSel ? 'bg-amber-600 text-white' : 'bg-background text-foreground border hover:bg-amber-50'}`}
                            >
                              {isSel ? `✓ ${m}` : `+ ${m}`}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {paymentService === 'transport' && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-indigo-900">Mois de transport sélectionnés :</span>
                        <span className="text-muted-foreground font-mono">{tarifTransportMensuel.toLocaleString()} F / mois</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {MONTHS_ORDER.map(m => {
                          const isSel = selectedTransportMonths.includes(m);
                          return (
                            <Badge
                              key={m}
                              onClick={() => {
                                const next = isSel ? selectedTransportMonths.filter(x => x !== m) : [...selectedTransportMonths, m];
                                setSelectedTransportMonths(next);
                                setPaymentAmount(next.length * tarifTransportMensuel);
                              }}
                              className={`cursor-pointer text-xs ${isSel ? 'bg-indigo-600 text-white' : 'bg-background text-foreground border hover:bg-indigo-50'}`}
                            >
                              {isSel ? `✓ ${m}` : `+ ${m}`}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── MONTANT PRÉCISÉ PAR LE PARENT ── */}
                  <div className="pt-3 border-t space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Label className="font-bold text-xs uppercase tracking-wide text-foreground flex items-center gap-1.5">
                        <Wallet className="h-4 w-4 text-primary" /> Montant exact à débiter / régler (FCFA) :
                      </Label>
                      <span className="text-[11px] text-muted-foreground">Modifiable au franc près</span>
                    </div>

                    <div className="relative">
                      <Input
                        type="number"
                        min={100}
                        step={500}
                        value={paymentAmount || ''}
                        onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                        placeholder="Précisez le montant..."
                        className="text-right font-mono font-black text-2xl text-primary bg-background h-14 pr-16 shadow-inner border-primary/30 focus-visible:ring-primary"
                      />
                      <span className="absolute right-3.5 top-4 text-sm font-bold text-muted-foreground pointer-events-none">
                        FCFA
                      </span>
                    </div>

                    {/* Raccourcis de montants rapides */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[11px] font-semibold text-muted-foreground mr-1">Raccourcis :</span>
                      {scolariteSoldeDu > 0 && paymentService === 'scolarite' && (
                        <button
                          type="button"
                          onClick={() => setPaymentAmount(scolariteSoldeDu)}
                          className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
                        >
                          Solde Scolarité ({formatCurrency(scolariteSoldeDu)})
                        </button>
                      )}
                      {[50000, 25000, 15000, 10000].map((quickAmt) => (
                        <button
                          key={quickAmt}
                          type="button"
                          onClick={() => setPaymentAmount(quickAmt)}
                          className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-background text-foreground border hover:bg-muted/50 transition-colors"
                        >
                          {quickAmt.toLocaleString()} F
                        </button>
                      ))}
                    </div>

                    <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary shrink-0" />
                      <span>
                        L'API de paiement effectuera un débit direct de <strong className="text-primary font-mono">{formatCurrency(paymentAmount)}</strong> sur votre compte.
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Choix du Mode de Paiement */}
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2.5 block">
                    2. Choisissez le compte à débiter / mode de règlement :
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {PAYMENT_METHODS.map((method) => {
                      const isSelected = paymentMode === method.id;
                      return (
                        <div
                          key={method.id}
                          onClick={() => setPaymentMode(method.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                            isSelected ? method.selectedRing : 'hover:border-primary/40 bg-card'
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${method.color} mt-0.5 shrink-0`}>
                            <method.icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-xs text-foreground truncate">{method.name}</span>
                              <Badge variant="outline" className={`text-[9px] px-1 py-0 font-semibold ${method.badgeClass}`}>
                                {method.badgeText.includes('(') ? method.badgeText.split('(')[0] : method.badgeText}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{method.subtitle}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Formulaire spécifique au Mode choisi */}
                <div className="p-4 rounded-2xl border bg-background space-y-3">
                  {/* WAVE CI */}
                  {paymentMode === 'wave' && (
                    <div className="space-y-3">
                      <div className="p-3 bg-sky-50 rounded-xl text-xs text-sky-900 border border-sky-200 flex items-start gap-2.5">
                        <Smartphone className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-sky-950">Débit Direct Wave Côte d'Ivoire (0% frais)</p>
                          <p className="mt-0.5 text-sky-800 leading-relaxed">
                            L'API Wave envoie une demande d'autorisation de prélèvement direct de <strong>{formatCurrency(paymentAmount)}</strong> sur votre compte Wave.
                          </p>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-semibold">Numéro de téléphone Wave (+225) :</Label>
                          <Input 
                            value={paymentPhone} 
                            onChange={e => setPaymentPhone(e.target.value)} 
                            placeholder="ex: 01 02 03 04 05" 
                            className="mt-1 text-xs font-mono font-semibold"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Titulaire du compte Wave (optionnel) :</Label>
                          <Input 
                            value={paymentPayerName} 
                            onChange={e => setPaymentPayerName(e.target.value)} 
                            placeholder="ex: M. Kouassi" 
                            className="mt-1 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MTN MONEY */}
                  {paymentMode === 'mtn_money' && (
                    <div className="space-y-3">
                      <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-900 border border-amber-200 flex items-start gap-2.5">
                        <Smartphone className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-amber-950">Débit Push Direct MTN MoMo CI (*133#)</p>
                          <p className="mt-0.5 text-amber-800 leading-relaxed">
                            L'API MTN MoMo émet un prompt USSD sur votre téléphone pour débiter <strong>{formatCurrency(paymentAmount)}</strong> avec votre code secret PIN.
                          </p>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-semibold">Numéro de téléphone MTN MoMo (+225) :</Label>
                          <Input 
                            value={paymentPhone} 
                            onChange={e => setPaymentPhone(e.target.value)} 
                            placeholder="ex: 05 XX XX XX XX" 
                            className="mt-1 text-xs font-mono font-semibold"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Nom du titulaire MoMo :</Label>
                          <Input 
                            value={paymentPayerName} 
                            onChange={e => setPaymentPayerName(e.target.value)} 
                            placeholder="Nom & Prénoms" 
                            className="mt-1 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ORANGE MONEY */}
                  {paymentMode === 'orange_money' && (
                    <div className="space-y-3">
                      <div className="p-3 bg-orange-50 rounded-xl text-xs text-orange-950 border border-orange-200 flex items-start gap-2.5">
                        <Smartphone className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-orange-950">Débit Direct Orange Money CI (*144#)</p>
                          <p className="mt-0.5 text-orange-800 leading-relaxed">
                            L'API Orange Money initie la requête de débit instantané de <strong>{formatCurrency(paymentAmount)}</strong>. Vous validerez par code OTP / PIN.
                          </p>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-semibold">Numéro Orange Money (+225) :</Label>
                          <Input 
                            value={paymentPhone} 
                            onChange={e => setPaymentPhone(e.target.value)} 
                            placeholder="ex: 07 XX XX XX XX" 
                            className="mt-1 text-xs font-mono font-semibold"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Nom du titulaire Orange :</Label>
                          <Input 
                            value={paymentPayerName} 
                            onChange={e => setPaymentPayerName(e.target.value)} 
                            placeholder="Nom & Prénoms" 
                            className="mt-1 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MOOV MONEY */}
                  {paymentMode === 'moov_money' && (
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-950 border border-blue-200 flex items-start gap-2.5">
                        <Smartphone className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-blue-950">Débit Direct Moov Money CI (*155#)</p>
                          <p className="mt-0.5 text-blue-800 leading-relaxed">
                            L'API Moov Money déclenche le prélèvement de <strong>{formatCurrency(paymentAmount)}</strong> après validation de votre invite de confirmation.
                          </p>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-semibold">Numéro Moov Money (+225) :</Label>
                          <Input 
                            value={paymentPhone} 
                            onChange={e => setPaymentPhone(e.target.value)} 
                            placeholder="ex: 01 XX XX XX XX" 
                            className="mt-1 text-xs font-mono font-semibold"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Nom du titulaire Moov :</Label>
                          <Input 
                            value={paymentPayerName} 
                            onChange={e => setPaymentPayerName(e.target.value)} 
                            placeholder="Nom & Prénoms" 
                            className="mt-1 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CORIS BANK */}
                  {paymentMode === 'coris_bank' && (
                    <div className="space-y-3">
                      <div className="p-3.5 bg-indigo-50 rounded-xl text-xs text-indigo-950 border border-indigo-200 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-indigo-900">
                          <Building className="h-4 w-4 text-indigo-600" />
                          <span>Coordonnées Bancaires Officielles Hînneh</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                          <div className="bg-white/80 p-2 rounded border">
                            <span className="text-muted-foreground block text-[9px]">BANQUE</span>
                            <span className="font-bold">CORIS BANK CI</span>
                          </div>
                          <div className="bg-white/80 p-2 rounded border">
                            <span className="text-muted-foreground block text-[9px]">CODE BANQUE</span>
                            <span className="font-bold">CI084</span>
                          </div>
                          <div className="bg-white/80 p-2 rounded border">
                            <span className="text-muted-foreground block text-[9px]">N° COMPTE</span>
                            <span className="font-bold">01234567890</span>
                          </div>
                          <div className="bg-white/80 p-2 rounded border">
                            <span className="text-muted-foreground block text-[9px]">CLÉ RIB</span>
                            <span className="font-bold">45</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground italic">
                          Titulaire : GROUPE SCOLAIRE HINNEH — IBAN : CI93 CI08 4010 0101 2345 6789 0045
                        </p>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Numéro du Bordereau de Versement / Réf. Virement :</Label>
                          <Input 
                            value={paymentBankSlip} 
                            onChange={e => setPaymentBankSlip(e.target.value)} 
                            placeholder="ex: BDR-2026-9042" 
                            className="mt-1 text-xs font-mono font-semibold"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Date du versement en banque :</Label>
                          <Input 
                            type="date"
                            value={paymentBankDate} 
                            onChange={e => setPaymentBankDate(e.target.value)} 
                            className="mt-1 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ESPÈCES */}
                  {paymentMode === 'especes' && (
                    <div className="space-y-3">
                      <div className="p-3 bg-emerald-50 rounded-lg text-xs text-emerald-900 border border-emerald-200 flex items-start gap-2">
                        <DollarSign className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Règlement en Espèces à la Caisse Centrale</p>
                          <p className="mt-0.5 opacity-90">
                            Présentez-vous au secrétariat de l'école (Lundi à Vendredi, 7h30-16h30). La validation génère un bon d'encaissement et met à jour instantanément la fiche élève.
                          </p>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Nom du parent / payeur déposant :</Label>
                          <Input 
                            value={paymentPayerName} 
                            onChange={e => setPaymentPayerName(e.target.value)} 
                            placeholder="Nom & Prénoms" 
                            className="mt-1 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Contact téléphonique :</Label>
                          <Input 
                            value={paymentPhone} 
                            onChange={e => setPaymentPhone(e.target.value)} 
                            placeholder="+225 07 XX XX XX" 
                            className="mt-1 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── ÉCRAN DE SUIVI DE DÉBIT API CINETPAY EN TEMPS RÉEL ── */}
                {paymentSubmitting && ['wave', 'mtn_money', 'orange_money', 'moov_money', 'cinetpay'].includes(paymentMode) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-primary/5 to-background border-2 border-emerald-500 shadow-lg space-y-4 text-center"
                  >
                    <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 animate-pulse">
                      <Zap className="h-7 w-7 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-base text-foreground flex items-center justify-center gap-1.5">
                        <Shield className="h-4 w-4 text-emerald-600" />
                        Débit API CinetPay en cours ({getOperatorDisplayName(paymentMode)})...
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">{debitMessage}</p>
                    </div>

                    <div className="space-y-2 max-w-sm mx-auto text-left text-xs font-mono">
                      <div className={`flex items-center gap-2 ${debitStep !== 'idle' ? 'text-emerald-700 font-bold' : 'text-muted-foreground'}`}>
                        {debitStep !== 'idle' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                        <span>1. Initialisation Passerelle API CinetPay (v2)</span>
                      </div>
                      <div className={`flex items-center gap-2 ${['push_sent', 'confirming', 'debited'].includes(debitStep) ? 'text-emerald-700 font-bold' : 'text-muted-foreground'}`}>
                        {['push_sent', 'confirming', 'debited'].includes(debitStep) ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                        <span>2. Demande de débit direct de {formatCurrency(paymentAmount)}</span>
                      </div>
                      <div className={`flex items-center gap-2 ${['confirming', 'debited'].includes(debitStep) ? 'text-emerald-700 font-bold' : 'text-muted-foreground'}`}>
                        {['confirming', 'debited'].includes(debitStep) ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                        <span>3. Validation sur mobile {paymentPhone || ''}</span>
                      </div>
                      <div className={`flex items-center gap-2 ${debitStep === 'debited' ? 'text-emerald-700 font-bold' : 'text-muted-foreground'}`}>
                        {debitStep === 'debited' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Clock className="h-3.5 w-3.5" />}
                        <span>4. Enregistrement comptable & Reçu officiel</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <DialogFooter className="flex items-center justify-between sm:justify-between border-t pt-4">
                <Button variant="outline" onClick={() => setShowPaymentModal(false)} disabled={paymentSubmitting}>
                  Annuler
                </Button>
                <Button 
                  onClick={handleConfirmPayment} 
                  disabled={paymentSubmitting || paymentAmount <= 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 min-w-[240px] h-11 shadow-md"
                >
                  {paymentSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" /> Traitement CinetPay...
                    </>
                  ) : ['wave', 'mtn_money', 'orange_money', 'moov_money', 'cinetpay'].includes(paymentMode) ? (
                    <>
                      <Zap className="h-4 w-4 fill-amber-300 stroke-amber-300" /> Payer {formatCurrency(paymentAmount)} via CinetPay ({getOperatorDisplayName(paymentMode)})
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 stroke-[3]" /> Valider {formatCurrency(paymentAmount)}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            /* ÉCRAN DE SUCCÈS & REÇU OFFICIEL */
            <div className="py-6 text-center space-y-5">
              <div className="mx-auto h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-sm animate-bounce">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-foreground">Paiement Validé avec Succès !</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Votre règlement pour <strong className="text-foreground">{formatStudentName(child)}</strong> a été enregistré et comptabilisé.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/50 border text-left space-y-2 max-w-md mx-auto text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">N° Reçu Officiel :</span>
                  <span className="font-bold text-primary">{paymentSuccessData.numero_recu || paymentSuccessData.details_recu?.numero_recu || 'REC-OFFICIEL'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prestation réglée :</span>
                  <span className="font-bold uppercase">{paymentService}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mode de règlement :</span>
                  <span className="font-bold">{PAYMENT_METHODS.find(m => m.id === paymentMode)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Montant versé :</span>
                  <span className="font-bold text-emerald-600 text-sm">{formatCurrency(paymentAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date & Heure :</span>
                  <span>{new Date().toLocaleString('fr-FR')}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button 
                  onClick={() => handlePrintOfficialReceipt()}
                  className="bg-primary hover:bg-primary/90 text-white font-bold gap-2 shadow"
                >
                  <Printer className="h-4 w-4" /> Imprimer le Reçu Officiel (PDF)
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentSuccessData(null);
                  }}
                >
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Nouveau Message */}
      <Dialog open={showMessageModal} onOpenChange={setShowMessageModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" /> Nouveau message
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Destinataire</Label>
              <Select defaultValue="direction" onValueChange={v => setNewMessage(p => ({...p, to: v}))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="direction">Direction de l'école</SelectItem>
                  <SelectItem value="finance">Service financier</SelectItem>
                  <SelectItem value="enseignant_maths">M. Koné (Mathématiques)</SelectItem>
                  <SelectItem value="enseignant_francais">Mme Touré (Français)</SelectItem>
                  <SelectItem value="imam">Imam Traoré (Éducation Islamique)</SelectItem>
                  <SelectItem value="surveillant">Surveillant Général</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Objet</Label>
              <Input className="mt-1" placeholder="Objet du message..." value={newMessage.subject} onChange={e => setNewMessage(p => ({...p, subject: e.target.value}))} />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea className="mt-1" rows={5} placeholder="Rédigez votre message..." value={newMessage.content} onChange={e => setNewMessage(p => ({...p, content: e.target.value}))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMessageModal(false)}>Annuler</Button>
            <Button onClick={() => {
              alert('Votre message a été transmis avec succès à l\'établissement.');
              setShowMessageModal(false);
            }} className="gap-1">
              <Send className="h-4 w-4" /> Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal Rattacher un Élève au Compte Parent */}
      <Dialog open={showAddChildModal} onOpenChange={setShowAddChildModal}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-primary">
              <UserPlus className="h-5 w-5 text-primary" /> Rattacher un Élève à votre Compte
            </DialogTitle>
            <DialogDescription>
              Associez un ou plusieurs enfants inscrits au Groupe Scolaire Hînneh pour suivre leur scolarité et effectuer vos règlements.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Formulaire de recherche par matricule */}
            <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Recherche par Matricule ou Nom de l'élève :
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchMatricule}
                    onChange={e => setSearchMatricule(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSearchChildCandidate(); }}
                    placeholder="ex: ELV001, HE20260001, Yao, Kouassi..."
                    className="pl-9 font-medium"
                  />
                </div>
                <Button
                  onClick={handleSearchChildCandidate}
                  disabled={isSearchingStudent || !searchMatricule.trim()}
                  className="bg-primary hover:bg-primary/90 text-white font-bold gap-1.5 px-4"
                >
                  {isSearchingStudent ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="h-4 w-4" /> Rechercher
                    </>
                  )}
                </Button>
              </div>

              {searchError && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-start gap-2 animate-shake">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{searchError}</span>
                </div>
              )}
            </div>

            {/* Résultat de la recherche si élève trouvé */}
            {foundStudentCandidate && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl border-2 border-emerald-500/40 bg-emerald-50/50 space-y-3"
              >
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                  <CheckCircle className="h-4 w-4 text-emerald-600" /> Élève trouvé dans le registre scolaire :
                </div>

                <div className="flex items-center gap-3.5 bg-background p-3 rounded-xl border">
                  <Avatar className="h-14 w-14 border-2 border-emerald-500 shadow-xs shrink-0">
                    <AvatarFallback className="font-bold bg-emerald-100 text-emerald-800 text-lg">
                      {`${foundStudentCandidate.firstName?.[0] || foundStudentCandidate.nom?.[0] || ''}${foundStudentCandidate.lastName?.[0] || foundStudentCandidate.prenom?.[0] || ''}`.toUpperCase() || 'EL'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-base text-foreground truncate">
                      {formatStudentName(foundStudentCandidate)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                      <span className="font-mono font-bold text-primary">{foundStudentCandidate.matricule}</span>
                      <span>•</span>
                      <Badge variant="outline" className="bg-muted text-xs">
                        {foundStudentCandidate.className || 'Classe'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => handleConfirmAttachChild(foundStudentCandidate)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-sm h-11"
                >
                  <Check className="h-4 w-4 stroke-[3]" /> Confirmer le rattachement de cet élève
                </Button>
              </motion.div>
            )}

            {/* Liste rapide des élèves disponibles dans l'établissement */}
            {allSchoolStudents.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" /> Suggestions d'élèves de l'établissement :
                  </Label>
                  <span className="text-[11px] text-muted-foreground">Rattachement direct en 1 clic</span>
                </div>

                <div className="max-h-52 overflow-y-auto space-y-1.5 rounded-xl border p-2 bg-muted/20 divide-y">
                  {allSchoolStudents.slice(0, 8).map((s: Student) => {
                    const isAlready = childrenList.some(c => c.id === s.id || (c.matricule && c.matricule === s.matricule));
                    const sInitials = `${s.firstName?.[0] || s.nom?.[0] || ''}${s.lastName?.[0] || s.prenom?.[0] || ''}`.toUpperCase() || 'EL';

                    return (
                      <div key={s.id} className="flex items-center justify-between p-2 pt-2.5 rounded-lg hover:bg-background transition-colors gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="h-8 w-8 border shrink-0">
                            <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                              {sInitials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">
                              {formatStudentName(s)}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {s.matricule} • {s.className || 'Classe'}
                            </p>
                          </div>
                        </div>

                        {isAlready ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold py-0.5">
                            ✓ Rattaché
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs font-bold gap-1 text-primary border-primary/30 hover:bg-primary hover:text-white"
                            onClick={() => handleConfirmAttachChild(s)}
                          >
                            <Plus className="h-3 w-3" /> Rattacher
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" onClick={() => setShowAddChildModal(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
