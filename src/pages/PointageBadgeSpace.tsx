import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { AppLogoLoader } from '@/components/AppLogoLoader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/apiClient';
import {
  Scan, QrCode, CheckCircle2, XCircle, Clock, AlertTriangle,
  Camera, CameraOff, User, Users, BarChart2, ArrowLeft,
  Loader2, Keyboard, DoorOpen, DoorClosed, RefreshCw, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { IMAGES } from '@/assets/images';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScanResult {
  pointage_id: number;
  eleve_id: number;
  matricule: string;
  nom_complet: string;
  classe: string;
  ecole: string;
  photo_url?: string;
  statut: 'present' | 'retard' | 'sortie' | 'refuse' | 'doublon';
  heure_entree: string;
  motif_refus?: string;
  message: string;
  solde_impaye: boolean;
  montant_du: number;
}

interface JournalEntry {
  id: number;
  eleve_id: number;
  matricule: string;
  nom_complet: string;
  classe: string;
  statut: string;
  heure_entree: string;
  pointe_par: string;
  solde_impaye: boolean;
}

interface Stats {
  total_eleves: number;
  pointes: number;
  presents: number;
  retards: number;
  sorties: number;
  refuses: number;
  non_pointes: number;
  taux_presence: number;
}

// ─── Config statuts ──────────────────────────────────────────────────────────

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  present:  { label: 'Présent',       color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', Icon: CheckCircle2 },
  retard:   { label: 'Retard',        color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',     Icon: Clock },
  sortie:   { label: 'Sortie',        color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',       Icon: DoorOpen },
  refuse:   { label: 'Refusé',        color: 'text-red-700',     bg: 'bg-red-50 border-red-200',         Icon: XCircle },
  doublon:  { label: 'Déjà pointé',   color: 'text-gray-700',    bg: 'bg-gray-50 border-gray-200',       Icon: AlertTriangle },
};

// ─── Composant principal ─────────────────────────────────────────────────────

export default function PointageBadgeSpace() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab]           = useState('scanner');
  const [typeScan, setTypeScan]             = useState<'entree' | 'sortie'>('entree');
  const [scanResult, setScanResult]         = useState<ScanResult | null>(null);
  const [scanning, setScanning]             = useState(false);
  const [cameraActive, setCameraActive]     = useState(false);
  const [manualInput, setManualInput]       = useState('');
  const [journal, setJournal]               = useState<JournalEntry[]>([]);
  const [stats, setStats]                   = useState<Stats | null>(null);
  const [loadingJournal, setLoadingJournal] = useState(false);
  const [filterStatut, setFilterStatut]     = useState('');

  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const lastScanRef = useRef('');
  const lastScanTsRef = useRef(0);

  // ─── Chargement données ──────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/pointage-badge/stats');
      setStats(res.data);
    } catch { /* silencieux */ }
  }, []);

  const loadJournal = useCallback(async () => {
    setLoadingJournal(true);
    try {
      const params: Record<string, string> = {};
      if (filterStatut) params.statut = filterStatut;
      const res = await apiClient.get('/api/pointage-badge/journal', { params });
      setJournal(res.data.pointages || []);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger le journal.', variant: 'destructive' });
    } finally {
      setLoadingJournal(false);
    }
  }, [filterStatut, toast]);

  useEffect(() => {
    loadStats();
    loadJournal();
    const iv = setInterval(loadStats, 30_000);
    return () => clearInterval(iv);
  }, [loadStats, loadJournal]);

  useEffect(() => {
    if (activeTab === 'journal') loadJournal();
  }, [activeTab, filterStatut, loadJournal]);

  // ─── Scan ────────────────────────────────────────────────────────────────

  const performScan = useCallback(async (qrData: string) => {
    const now = Date.now();
    if (qrData === lastScanRef.current && now - lastScanTsRef.current < 3000) return;
    lastScanRef.current = qrData;
    lastScanTsRef.current = now;

    setScanning(true);
    setScanResult(null);
    try {
      const res = await apiClient.post('/api/pointage-badge/scan', {
        qr_data: qrData,
        type_scan: typeScan,
      });
      setScanResult(res.data);
      loadStats();
      loadJournal();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Erreur lors du scan.';
      toast({ title: 'Scan échoué', description: msg, variant: 'destructive' });
    } finally {
      setScanning(false);
      setManualInput('');
    }
  }, [typeScan, loadStats, loadJournal, toast]);

  // ─── Caméra ──────────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      toast({ title: 'Caméra inaccessible', description: 'Vérifiez les permissions du navigateur.', variant: 'destructive' });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  useEffect(() => {
    if (!cameraActive || !videoRef.current || !canvasRef.current) return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d')!;
    let detector: any = null;
    if ('BarcodeDetector' in window) {
      try { detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] }); } catch { /* */ }
    }
    let active = true;
    const loop = async () => {
      if (!active) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        try {
          if (detector) {
            const codes = await detector.detect(canvas);
            if (codes.length > 0) await performScan(codes[0].rawValue);
          }
        } catch { /* */ }
      }
      scanLoopRef.current = requestAnimationFrame(loop);
    };
    scanLoopRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    };
  }, [cameraActive, performScan]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ─── Saisie manuelle ──────────────────────────────────────────────────────

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    performScan(manualInput.trim());
  };

  // ─── Export CSV ───────────────────────────────────────────────────────────

  const exportCSV = () => {
    const header = 'Matricule,Nom,Classe,Heure,Statut,Pointe par';
    const rows   = journal.map(j =>
      `${j.matricule},"${j.nom_complet}",${j.classe},${j.heure_entree},${j.statut},"${j.pointe_par}"`
    );
    const csv  = [header, ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url, download: `pointage_${new Date().toISOString().slice(0, 10)}.csv`
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Carte résultat ───────────────────────────────────────────────────────

  const ResultCard = ({ result }: { result: ScanResult }) => {
    const cfg = STATUT_CONFIG[result.statut] || STATUT_CONFIG.present;
    const Icon = cfg.Icon;
    return (
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        className="rounded-2xl border-2 border-slate-200 overflow-hidden shadow-xl bg-white max-w-lg mx-auto"
      >
        {/* En-tête institutionnel avec logo officiel */}
        <div className="bg-[#0f2444] px-4 py-3 text-white flex items-center justify-between border-b-2 border-amber-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg p-1 shrink-0 flex items-center justify-center shadow-xs">
              <img
                src={IMAGES.HINNEH_LOGO_20260507_234919_1}
                alt="Logo Application"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="text-left">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-300 leading-none">
                RÉPUBLIQUE DE CÔTE D'IVOIRE
              </p>
              <h3 className="text-sm font-extrabold text-white leading-tight mt-0.5">
                {result.ecole || 'HINNEH ÉDUCATION'}
              </h3>
              <p className="text-[8px] font-bold text-amber-300 uppercase tracking-wide leading-none mt-0.5">
                CARTE D'IDENTITÉ SCOLAIRE · CONTRÔLE D'ACCÈS
              </p>
            </div>
          </div>
          <span className="text-[9px] font-bold bg-white/10 border border-white/20 text-white px-2 py-0.5 rounded">
            2026 - 2027
          </span>
        </div>

        {/* Corps de la carte avec statut du scan */}
        <div className={`p-6 ${cfg.bg} text-center`}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Icon className={`w-8 h-8 ${cfg.color}`} />
            <Badge className={`text-sm font-bold px-3 py-1 ${cfg.color} bg-white shadow-xs`}>{cfg.label}</Badge>
          </div>

          <div className="w-20 h-20 rounded-full bg-white border-2 border-slate-200 shadow-sm flex items-center justify-center mx-auto mb-3 overflow-hidden">
            {result.photo_url ? (
              <img src={result.photo_url} alt={result.nom_complet} className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-slate-400" />
            )}
          </div>

          <p className="text-2xl font-extrabold text-gray-900">{result.nom_complet}</p>
          <div className="flex items-center justify-center gap-2 mt-1 text-sm text-gray-600 font-medium">
            <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-xs">{result.matricule}</span>
            <span>·</span>
            <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded text-xs font-semibold">{result.classe}</span>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 bg-white/80 backdrop-blur-xs px-4 py-1.5 rounded-full border shadow-2xs">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-lg font-mono font-bold text-gray-800">Heure de scan : {result.heure_entree}</span>
          </div>

          <p className={`mt-3 text-sm font-medium ${cfg.color}`}>{result.message}</p>

          {result.solde_impaye && (
            <div className="mt-4 bg-orange-100 border border-orange-300 rounded-xl px-4 py-2.5 text-orange-900 text-xs font-medium text-left flex items-center gap-2">
              <span className="text-base shrink-0">⚠️</span>
              <div>
                <p className="font-bold">Avertissement comptabilité :</p>
                <p>Solde impayé de <span className="font-bold underline">{result.montant_du.toLocaleString('fr-FR')} FCFA</span></p>
              </div>
            </div>
          )}

          {result.motif_refus && (
            <p className="mt-2 text-xs text-red-600 font-semibold uppercase tracking-wide">
              Motif : {result.motif_refus.replace(/_/g, ' ')}
            </p>
          )}
        </div>
      </motion.div>
    );
  };

  // ─── Rendu ────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Header avec Logo de l'application */}
        <div className="flex items-center gap-4 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl shadow-xs border p-1 shrink-0 flex items-center justify-center">
              <img
                src={IMAGES.HINNEH_LOGO_20260507_234919_1}
                alt="Logo HINNEH ÉDUCATION"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                Pointage Badge QR
              </h1>
              <p className="text-sm text-gray-500">HINNEH ÉDUCATION — Contrôle d'accès & scan des cartes élèves</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant={typeScan === 'entree' ? 'default' : 'outline'}
              onClick={() => setTypeScan('entree')} className="gap-1">
              <DoorOpen className="w-4 h-4" /> Entrée
            </Button>
            <Button size="sm" variant={typeScan === 'sortie' ? 'default' : 'outline'}
              onClick={() => setTypeScan('sortie')} className="gap-1">
              <DoorClosed className="w-4 h-4" /> Sortie
            </Button>
          </div>
        </div>

        {/* Stats rapides */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Présents',     value: stats.presents,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Retards',      value: stats.retards,     color: 'text-amber-600',   bg: 'bg-amber-50' },
              { label: 'Non pointés',  value: stats.non_pointes, color: 'text-gray-600',    bg: 'bg-gray-50' },
              { label: 'Taux',         value: `${stats.taux_presence}%`, color: 'text-blue-700', bg: 'bg-blue-50' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center border`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scanner" className="gap-1"><Scan className="w-4 h-4" />Scanner</TabsTrigger>
            <TabsTrigger value="journal" className="gap-1"><Users className="w-4 h-4" />Journal</TabsTrigger>
            <TabsTrigger value="stats"   className="gap-1"><BarChart2 className="w-4 h-4" />Stats</TabsTrigger>
          </TabsList>

          {/* ─── ONGLET SCANNER ─── */}
          <TabsContent value="scanner" className="space-y-4 mt-4">

            {/* Caméra */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Camera className="w-5 h-5" /> Caméra QR
                </CardTitle>
                <CardDescription>Pointez la caméra vers le QR code de la carte élève</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: '4/3', maxHeight: 340 }}>
                  <video ref={videoRef} className="w-full h-full object-cover" muted playsInline
                    style={{ display: cameraActive ? 'block' : 'none' }} />
                  <canvas ref={canvasRef} className="hidden" />
                  {!cameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
                      <CameraOff className="w-12 h-12 opacity-40" />
                      <p className="text-sm opacity-60">Caméra inactive</p>
                    </div>
                  )}
                  {cameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-44 h-44 border-4 border-white/70 rounded-2xl" />
                    </div>
                  )}
                  {scanning && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-10 h-10 text-white animate-spin" />
                    </div>
                  )}
                </div>
                {!cameraActive ? (
                  <Button className="w-full gap-2" onClick={startCamera}>
                    <Camera className="w-4 h-4" /> Activer la caméra
                  </Button>
                ) : (
                  <Button className="w-full gap-2" variant="outline" onClick={stopCamera}>
                    <CameraOff className="w-4 h-4" /> Arrêter la caméra
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Saisie manuelle */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Keyboard className="w-5 h-5" /> Saisie manuelle
                </CardTitle>
                <CardDescription>Entrez le matricule si la caméra n'est pas disponible</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                  <Input
                    value={manualInput}
                    onChange={e => setManualInput(e.target.value)}
                    placeholder="Matricule élève..."
                    className="flex-1 font-mono"
                    autoComplete="off"
                  />
                  <Button type="submit" disabled={scanning || !manualInput.trim()} className="gap-1">
                    {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
                    Valider
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Résultat scan */}
            <AnimatePresence mode="wait">
              {scanResult && <ResultCard key={scanResult.pointage_id} result={scanResult} />}
            </AnimatePresence>
          </TabsContent>

          {/* ─── ONGLET JOURNAL ─── */}
          <TabsContent value="journal" className="mt-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {['', 'present', 'retard', 'sortie', 'refuse'].map(s => (
                <Button key={s} size="sm" variant={filterStatut === s ? 'default' : 'outline'}
                  onClick={() => setFilterStatut(s)}>
                  {s === '' ? 'Tous' : (STATUT_CONFIG[s]?.label || s)}
                </Button>
              ))}
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={loadJournal} disabled={loadingJournal}>
                  <RefreshCw className={`w-4 h-4 ${loadingJournal ? 'animate-spin' : ''}`} />
                </Button>
                <Button size="sm" variant="outline" onClick={exportCSV} disabled={journal.length === 0}>
                  <Download className="w-4 h-4 mr-1" /> CSV
                </Button>
              </div>
            </div>
            <Card>
              <CardContent className="p-0">
                {loadingJournal ? (
                  <div className="p-8 text-center"><AppLogoLoader size="sm" message="Chargement du journal..." /></div>
                ) : journal.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <QrCode className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>Aucun pointage aujourd'hui</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          {['Heure', 'Élève', 'Classe', 'Statut', 'Pointé par'].map(h => (
                            <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {journal.map(j => {
                          const cfg = STATUT_CONFIG[j.statut];
                          const Icon = cfg?.Icon;
                          return (
                            <tr key={j.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 font-mono text-gray-700">{j.heure_entree || '—'}</td>
                              <td className="px-4 py-3">
                                <p className="font-medium text-gray-900">{j.nom_complet}</p>
                                <p className="text-xs text-gray-400">{j.matricule}</p>
                                {j.solde_impaye && <span className="text-xs text-orange-500">⚠️ Impayé</span>}
                              </td>
                              <td className="px-4 py-3 text-gray-600">{j.classe}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 text-xs font-medium ${cfg?.color || ''}`}>
                                  {Icon && <Icon className="w-3 h-3" />} {cfg?.label || j.statut}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-xs">{j.pointe_par || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── ONGLET STATS ─── */}
          <TabsContent value="stats" className="mt-4">
            {!stats ? (
              <div className="p-8 text-center"><AppLogoLoader size="sm" message="Chargement des statistiques..." /></div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Total élèves actifs', value: stats.total_eleves,  color: 'text-gray-800',    bg: 'bg-white border' },
                    { label: 'Pointés aujourd\'hui', value: stats.pointes,       color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-100' },
                    { label: 'Présents à l\'heure',  value: stats.presents,      color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
                    { label: 'Retards',              value: stats.retards,       color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-100' },
                    { label: 'Non pointés',          value: stats.non_pointes,   color: 'text-red-600',     bg: 'bg-red-50 border-red-100' },
                    { label: 'Taux de présence',     value: `${stats.taux_presence}%`, color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-100' },
                  ].map(s => (
                    <Card key={s.label} className={`${s.bg} border`}>
                      <CardContent className="p-4 text-center">
                        <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Taux de présence du jour</p>
                    <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                      <motion.div
                        className="h-4 rounded-full bg-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.taux_presence}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                    </div>
                    <p className="text-right text-xs text-gray-500 mt-1">{stats.taux_presence}% ({stats.pointes}/{stats.total_eleves})</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
