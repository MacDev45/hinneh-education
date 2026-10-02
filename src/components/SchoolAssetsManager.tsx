import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Trash2,
  ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/apiClient';

// ─── Types ───────────────────────────────────────────────────────────────────
interface AssetItem {
  filename: string;
  url: string;
}

interface SchoolAssets {
  logos: AssetItem[];
  signatures: AssetItem[];
  cachets: AssetItem[];
}

type AssetType = 'logo' | 'signature' | 'cachet';

interface UploadZoneProps {
  type: AssetType;
  label: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
  items: AssetItem[];
  onUploaded: (item: AssetItem) => void;
  onDeleted: (filename: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function buildImageUrl(url: string): string {
  // The backend serves files at /api/uploads/school_assets/...
  // In dev, Vite proxies /api → http://localhost:8000
  return url;
}

// ─── UploadZone component ─────────────────────────────────────────────────────
function UploadZone({
  type,
  label,
  description,
  icon,
  accentColor,
  items,
  onUploaded,
  onDeleted,
}: UploadZoneProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Format invalide', description: 'Veuillez sélectionner une image (JPG, PNG, WebP).' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'Fichier trop volumineux', description: 'Taille maximale : 5 Mo.' });
      return;
    }
    setUploading(true);
    try {
      const result = await apiClient.uploadSchoolAsset(type, file);
      onUploaded(result);
      toast({ title: `${label} uploadé`, description: 'Image enregistrée avec succès.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur upload', description: err?.response?.data?.detail || 'Impossible d\'envoyer l\'image.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDelete = async (filename: string) => {
    try {
      await apiClient.deleteSchoolAsset(type, filename);
      onDeleted(filename);
      toast({ title: 'Image supprimée', description: 'L\'image a été retirée.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur suppression', description: err?.response?.data?.detail || 'Impossible de supprimer l\'image.' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 cursor-pointer
          ${dragging ? `border-${accentColor}-500 bg-${accentColor}-50 dark:bg-${accentColor}-950/20` : 'border-border hover:border-primary/50 hover:bg-muted/30'}
          ${uploading ? 'pointer-events-none opacity-60' : ''}
        `}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
        />
        <div className="flex flex-col items-center gap-3 text-center">
          {uploading ? (
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          ) : (
            <div className={`w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center`}>
              {icon}
            </div>
          )}
          <div>
            <p className="font-semibold text-sm">
              {uploading ? 'Upload en cours…' : `Déposer une image de ${label.toLowerCase()}`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
            <p className="text-xs text-muted-foreground">JPG, PNG, WebP — max 5 Mo</p>
          </div>
          {!uploading && (
            <Button variant="outline" size="sm" className="mt-1" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
              <Upload className="w-4 h-4 mr-2" />
              Choisir un fichier
            </Button>
          )}
        </div>
      </div>

      {/* Gallery */}
      <AnimatePresence>
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 gap-3"
          >
            {items.map((item) => (
              <motion.div
                key={item.filename}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group relative rounded-xl border bg-muted/30 overflow-hidden aspect-video flex items-center justify-center"
              >
                <img
                  src={buildImageUrl(item.url)}
                  alt={item.filename}
                  className="max-h-full max-w-full object-contain p-2"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                />
                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="w-8 h-8"
                    onClick={() => setPreview(buildImageUrl(item.url))}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="w-8 h-8"
                    onClick={() => handleDelete(item.filename)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {/* Filename badge */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                  <p className="text-white text-xs truncate">{item.filename}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setPreview(null)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative max-w-2xl w-full bg-card rounded-2xl p-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={() => setPreview(null)}
              >
                <X className="w-5 h-5" />
              </Button>
              <img src={preview} alt="Aperçu" className="w-full object-contain max-h-[70vh] rounded-lg" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function SchoolAssetsManager() {
  const { toast } = useToast();
  const [assets, setAssets] = useState<SchoolAssets>({ logos: [], signatures: [], cachets: [] });
  const [loading, setLoading] = useState(true);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getSchoolAssets();
      setAssets(data);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de charger les assets.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const handleUploaded = (type: keyof SchoolAssets, item: AssetItem) => {
    setAssets((prev) => ({ ...prev, [type]: [...prev[type], item] }));
  };

  const handleDeleted = (type: keyof SchoolAssets, filename: string) => {
    setAssets((prev) => ({
      ...prev,
      [type]: prev[type].filter((i) => i.filename !== filename),
    }));
  };

  const totalAssets = assets.logos.length + assets.signatures.length + assets.cachets.length;

  const zones: { type: AssetType; key: keyof SchoolAssets; label: string; description: string; icon: React.ReactNode; accentColor: string }[] = [
    {
      type: 'logo',
      key: 'logos',
      label: 'Logo',
      description: 'Logo officiel de l\'établissement — apparaît en en-tête des bulletins et reçus',
      icon: <ImageIcon className="w-6 h-6 text-primary" />,
      accentColor: 'blue',
    },
    {
      type: 'signature',
      key: 'signatures',
      label: 'Signature',
      description: 'Signature du directeur ou du comptable — apparaît en bas des documents',
      icon: <ImageIcon className="w-6 h-6 text-violet-500" />,
      accentColor: 'violet',
    },
    {
      type: 'cachet',
      key: 'cachets',
      label: 'Cachet',
      description: 'Cachet ou tampon officiel — apposé sur les bulletins et reçus de paiement',
      icon: <ImageIcon className="w-6 h-6 text-emerald-500" />,
      accentColor: 'emerald',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Logos', count: assets.logos.length, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20' },
          { label: 'Signatures', count: assets.signatures.length, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/20' },
          { label: 'Cachets', count: assets.cachets.length, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
        ].map((stat) => (
          <Card key={stat.label} className={`${stat.bg} border-0`}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
              </div>
              <Badge variant={stat.count > 0 ? 'default' : 'secondary'}>
                {stat.count > 0 ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                {stat.count > 0 ? 'Configuré' : 'Manquant'}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info banner */}
      {totalAssets === 0 && !loading && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-amber-800 dark:text-amber-400">Aucun asset configuré</p>
            <p className="text-amber-700 dark:text-amber-500 mt-1">
              Uploadez au moins un logo, une signature et un cachet pour que vos bulletins et reçus de paiement soient complets.
            </p>
          </div>
        </div>
      )}

      {/* Upload zones */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {zones.map((zone) => (
            <Card key={zone.type} className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  {zone.icon}
                  {zone.label}
                  {assets[zone.key].length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {assets[zone.key].length}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">{zone.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <UploadZone
                  type={zone.type}
                  label={zone.label}
                  description={zone.description}
                  icon={zone.icon}
                  accentColor={zone.accentColor}
                  items={assets[zone.key]}
                  onUploaded={(item) => handleUploaded(zone.key, item)}
                  onDeleted={(filename) => handleDeleted(zone.key, filename)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Usage guide */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-muted-foreground">Comment utiliser ces images ?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Bulletins de notes</p>
                <p>Le logo s'affiche en haut, le cachet et la signature en bas du bulletin.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Reçus de paiement</p>
                <p>Le logo apparaît en en-tête, la signature et le cachet authentifient le reçu.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Format recommandé</p>
                <p>Logo : fond transparent PNG. Signature/Cachet : fond blanc ou transparent, haute résolution.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
