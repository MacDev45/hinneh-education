/**
 * Profil École — Personnalisation par établissement (§1.2)
 * Permet à chaque école de définir son identité visuelle et ses informations.
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Upload, Save, Phone, Mail, MapPin,
  Palette, User, GraduationCap, Image as ImageIcon,
  CheckCircle2, Clock,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/apiClient';
import type { School } from '@/lib/index';

const CYCLES = [
  { value: 'maternelle', label: 'Maternelle' },
  { value: 'primaire', label: 'Primaire' },
  { value: 'college', label: 'Collège' },
  { value: 'lycee', label: 'Collège 2nd cycle' },
];

const COULEURS = [
  { name: 'Bleu Hinneh', primary: '#0f62fe', accent: '#e8f0fe' },
  { name: 'Vert émeraude', primary: '#10b981', accent: '#d1fae5' },
  { name: 'Rouge brique', primary: '#dc2626', accent: '#fee2e2' },
  { name: 'Violet', primary: '#7c3aed', accent: '#ede9fe' },
  { name: 'Orange', primary: '#f97316', accent: '#ffedd5' },
  { name: 'Noir & Or', primary: '#1a1a1a', accent: '#fef3c7' },
];

export default function SchoolProfile() {
  const { toast } = useToast();
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('identite');

  // Form state
  const [form, setForm] = useState({
    name: '',
    code: '',
    region: '',
    city: '',
    address: '',
    cycles: [] as string[],
    status: 'actif' as School['status'],
    logo: '',
    email: '',
    contacts: '',
    phone: '',
    directeurNom: '',
    directeurEmail: '',
    directeurPhone: '',
    couleurTheme: '#0f62fe',
    couleurAccent: '#e8f0fe',
    slogan: '',
    signatureRecu: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiClient.getSchools();
        setSchools(data || []);
        if (data && data.length > 0) {
          const userEcoleId = localStorage.getItem('user_ecole_id');
          const matchingSchool = userEcoleId ? data.find((s) => String(s.id) === String(userEcoleId)) : null;
          setSelectedSchoolId(String(matchingSchool ? matchingSchool.id : data[0].id));
        }
      } catch { setSchools([]); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedSchoolId) return;
    const loadSchool = async () => {
      setLoading(true);
      try {
        const s = await apiClient.getSchool(selectedSchoolId);
        if (s) {
          setForm({
            name: s.name || '',
            code: s.code || '',
            region: s.region || '',
            city: s.city || '',
            address: s.address || '',
            cycles: s.cycles || [],
            status: s.status || 'actif',
            logo: s.logo || '',
            email: s.email || '',
            contacts: s.contacts || '',
            phone: (s as any).phone || '',
            directeurNom: (s as any).directeurNom || '',
            directeurEmail: (s as any).directeurEmail || '',
            directeurPhone: (s as any).directeurPhone || '',
            couleurTheme: (s as any).couleurTheme || '#0f62fe',
            couleurAccent: (s as any).couleurAccent || '#e8f0fe',
            slogan: (s as any).slogan || '',
            signatureRecu: (s as any).signatureRecu || '',
          });
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    loadSchool();
  }, [selectedSchoolId]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Fichier invalide', description: 'Veuillez sélectionner une image.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm(p => ({ ...p, logo: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const toggleCycle = (cycle: string) => {
    setForm(p => ({
      ...p,
      cycles: p.cycles.includes(cycle) ? p.cycles.filter(c => c !== cycle) : [...p.cycles, cycle],
    }));
  };

  const handleSave = async () => {
    if (!selectedSchoolId) return;
    setSaving(true);
    try {
      await apiClient.updateSchool(selectedSchoolId, {
        nom: form.name,
        code: form.code,
        region: form.region,
        ville: form.city,
        adresse: form.address,
        cycles: form.cycles,
        statut: form.status,
        logo: form.logo,
        email: form.email,
        contacts: form.contacts,
        phone: form.phone,
        directeur_nom: form.directeurNom,
        directeur_email: form.directeurEmail,
        directeur_phone: form.directeurPhone,
        couleur_theme: form.couleurTheme,
        couleur_accent: form.couleurAccent,
        slogan: form.slogan,
        signature_recu: form.signatureRecu,
      });
      toast({ title: 'Profil école mis à jour' });
    } catch {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de sauvegarder.' });
    } finally { setSaving(false); }
  };

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-7 w-7 text-primary" />
              Profil de l&apos;établissement
            </h1>
            <p className="text-muted-foreground mt-1">Personnaliser l&apos;identité visuelle et les informations de chaque école</p>
          </div>
          <div className="flex items-center gap-2">
            {schools.length > 1 && (
              <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                <SelectTrigger className="w-56">
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Choisir une école" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button className="gap-2" onClick={handleSave} disabled={saving || !selectedSchoolId}>
              {saving ? <Clock className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Chargement…</div>
        ) : !selectedSchoolId ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground italic">Aucune école disponible.</CardContent></Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="identite" className="gap-1 text-xs"><Building2 className="h-3.5 w-3.5" />Identité</TabsTrigger>
              <TabsTrigger value="contact" className="gap-1 text-xs"><Phone className="h-3.5 w-3.5" />Contact</TabsTrigger>
              <TabsTrigger value="direction" className="gap-1 text-xs"><User className="h-3.5 w-3.5" />Direction</TabsTrigger>
              <TabsTrigger value="apparence" className="gap-1 text-xs"><Palette className="h-3.5 w-3.5" />Apparence</TabsTrigger>
            </TabsList>

            <TabsContent value="identite" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informations générales</CardTitle>
                  <CardDescription>Nom, code, cycles et adresse de l&apos;établissement.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Nom de l&apos;établissement *</Label>
                      <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Code école</Label>
                      <Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label>Région</Label>
                      <Input value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Ville</Label>
                      <Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Statut</Label>
                      <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as School['status'] }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="actif">Actif</SelectItem>
                          <SelectItem value="suspendu">Suspendu</SelectItem>
                          <SelectItem value="en_creation">En création</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Adresse complète</Label>
                    <Textarea value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="mb-2 block">Cycles enseignés</Label>
                    <div className="flex flex-wrap gap-2">
                      {CYCLES.map(c => (
                        <Badge
                          key={c.value}
                          variant={form.cycles.includes(c.value) ? 'default' : 'outline'}
                          className="cursor-pointer text-xs px-3 py-1"
                          onClick={() => toggleCycle(c.value)}
                        >
                          {form.cycles.includes(c.value) && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {c.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Coordonnées</CardTitle>
                  <CardDescription>Téléphone, email et contacts utiles de l&apos;établissement.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />Téléphone</Label>
                      <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />Email</Label>
                      <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Autres contacts (sécrétariat, comptabilité…)</Label>
                    <Textarea value={form.contacts} onChange={e => setForm(p => ({ ...p, contacts: e.target.value }))} placeholder="ex: Secrétariat : 07 12 34 56 78…" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="direction" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Direction</CardTitle>
                  <CardDescription>Informations du directeur / directrice.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1"><User className="h-3.5 w-3.5" />Nom du directeur / directrice</Label>
                    <Input value={form.directeurNom} onChange={e => setForm(p => ({ ...p, directeurNom: e.target.value }))} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Email du directeur</Label>
                      <Input value={form.directeurEmail} onChange={e => setForm(p => ({ ...p, directeurEmail: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Téléphone du directeur</Label>
                      <Input value={form.directeurPhone} onChange={e => setForm(p => ({ ...p, directeurPhone: e.target.value }))} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="apparence" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Identité visuelle</CardTitle>
                  <CardDescription>Logo, couleurs et signature des reçus.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" />Logo de l&apos;établissement</Label>
                    <div className="flex items-center gap-4">
                      {form.logo ? (
                        <img src={form.logo} alt="Logo" className="h-20 w-20 object-contain border rounded p-1 bg-white" />
                      ) : (
                        <div className="h-20 w-20 border rounded flex items-center justify-center bg-muted text-muted-foreground"><Building2 className="h-8 w-8" /></div>
                      )}
                      <div>
                        <Input type="file" accept="image/*" onChange={handleLogoChange} className="w-auto" />
                        <p className="text-xs text-muted-foreground mt-1">Format recommandé : PNG ou JPG, fond transparent idéal.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Palette className="h-3.5 w-3.5" />Thème couleur</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                      {COULEURS.map(c => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setForm(p => ({ ...p, couleurTheme: c.primary, couleurAccent: c.accent }))}
                          className={`p-3 rounded-lg border text-left transition-all ${form.couleurTheme === c.primary ? 'ring-2 ring-primary ring-offset-2' : 'hover:border-primary/50'}`}
                        >
                          <div className="flex gap-1 mb-2">
                            <div className="h-6 w-6 rounded-full" style={{ backgroundColor: c.primary }} />
                            <div className="h-6 w-6 rounded-full" style={{ backgroundColor: c.accent }} />
                          </div>
                          <p className="text-xs font-medium">{c.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Slogan de l&apos;établissement</Label>
                    <Input value={form.slogan} onChange={e => setForm(p => ({ ...p, slogan: e.target.value }))} placeholder="ex : Excellence et discipline" />
                  </div>

                  <div className="space-y-1">
                    <Label>Signature / bas de page des reçus</Label>
                    <Textarea value={form.signatureRecu} onChange={e => setForm(p => ({ ...p, signatureRecu: e.target.value }))} placeholder="Texte apparaissant sur les reçus et rapports" />
                  </div>

                  <div className="p-4 rounded-lg border" style={{ borderColor: form.couleurTheme, backgroundColor: form.couleurAccent }}>
                    <p className="font-bold" style={{ color: form.couleurTheme }}>{form.name || 'Nom de l\'établissement'}</p>
                    <p className="text-xs opacity-80">{form.slogan || 'Slogan de l\'établissement'}</p>
                    <p className="text-xs mt-2 opacity-70">{form.signatureRecu || 'Signature / bas de page'}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </motion.div>
    </Layout>
  );
}
